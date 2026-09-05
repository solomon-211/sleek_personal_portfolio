"""
Portfolio Contact API — Solomon Thiong Garang Leek
===================================================
Features:
  - Input validation (Pydantic v2)
  - File-backed rate limiting (persists across restarts)
  - Rate limiting on analytics endpoint (prevents flooding)
  - Honeypot spam field
  - HTML + plain-text email
  - Message logging to JSON file (no database needed)
  - Analytics tracking (page views, section views)
  - CORS locked to allowed origins (defaults to solomonleek.tech)
  - Health + stats endpoints
  - Graceful fallback when SMTP is not configured
"""

import json
import logging
import os
import secrets
import smtplib
import time
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, EmailStr, Field, field_validator

load_dotenv()

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("portfolio")

def _sanitize_log(value: str) -> str:
    """Strip newlines and carriage returns to prevent log injection."""
    return str(value).replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')


# ── File paths ─────────────────────────────────────────────────────────────────
BASE_DIR       = Path(__file__).parent
LOG_FILE       = BASE_DIR / "messages.json"
ANALYTICS_FILE = BASE_DIR / "analytics.json"
RATE_FILE      = BASE_DIR / "rate_limits.json"   # file-backed rate store
NEWSLETTER_FILE = BASE_DIR / "newsletter.json"    # subscriber list
NOTIFY_FILE     = BASE_DIR / "notify_requests.json"  # article notify requests


# ── JSON helpers ───────────────────────────────────────────────────────────────
def _read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return default


def _write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _append_json(path: Path, record: dict) -> None:
    records: List[dict] = _read_json(path, [])
    records.append(record)
    _write_json(path, records)


# ── File-backed rate limiter ───────────────────────────────────────────────────
# Persists across server restarts so limits survive deploys/crashes.
CONTACT_RATE_MAX    = int(os.getenv("RATE_LIMIT_MAX", "5"))
CONTACT_RATE_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "3600"))   # seconds

# Analytics gets a much tighter limit to prevent flooding
ANALYTICS_RATE_MAX    = int(os.getenv("ANALYTICS_RATE_MAX", "120"))  # 120 events
ANALYTICS_RATE_WINDOW = int(os.getenv("ANALYTICS_RATE_WINDOW", "60")) # per minute

# ── Admin auth ──────────────────────────────────────────────────────────────────
# Shared-secret gate for endpoints that expose visitor PII (names/emails/messages).
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")


def _require_admin_key(request: Request) -> None:
    """Guard admin-only endpoints. Fails closed if no key is configured."""
    if not ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin endpoint disabled: ADMIN_API_KEY is not configured on the server.",
        )
    supplied = request.headers.get("X-Admin-Key", "")
    if not secrets.compare_digest(supplied, ADMIN_API_KEY):
        log.warning("Rejected admin request — invalid or missing X-Admin-Key")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing admin key")


def _check_rate_limit(ip: str, max_requests: int, window_seconds: int, bucket: str = "contact") -> None:
    """
    File-backed sliding-window rate limiter.
    Reads/writes RATE_FILE so limits survive restarts.
    bucket: logical namespace so contact and analytics don't share counters.
    """
    now = time.time()
    window_start = now - window_seconds

    store: Dict[str, Dict[str, List[float]]] = _read_json(RATE_FILE, {})
    bucket_store = store.setdefault(bucket, {})

    # Prune old timestamps for this IP
    bucket_store[ip] = [t for t in bucket_store.get(ip, []) if t > window_start]

    if len(bucket_store[ip]) >= max_requests:
        _write_json(RATE_FILE, store)
        log.warning("Rate limit hit — bucket=%s ip=%s", bucket, ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait before trying again.",
        )

    bucket_store[ip].append(now)

    # Periodically clean up stale IPs to keep the file small
    if len(bucket_store) > 500:
        bucket_store = {k: v for k, v in bucket_store.items() if v}
        store[bucket] = bucket_store

    _write_json(RATE_FILE, store)


# ── Pydantic models ────────────────────────────────────────────────────────────
class ContactPayload(BaseModel):
    name:    str      = Field(min_length=2,  max_length=80)
    email:   EmailStr
    subject: str      = Field(min_length=3,  max_length=120)
    message: str      = Field(min_length=10, max_length=2000)
    website: Optional[str] = Field(default="")   # honeypot — must stay empty

    @field_validator("name")
    @classmethod
    def name_no_html(cls, v: str) -> str:
        if "<" in v or ">" in v:
            raise ValueError("Invalid characters in name")
        return v.strip()

    @field_validator("subject")
    @classmethod
    def subject_no_html(cls, v: str) -> str:
        if "<" in v or ">" in v:
            raise ValueError("Invalid characters in subject")
        return v.strip()

    @field_validator("message")
    @classmethod
    def message_no_scripts(cls, v: str) -> str:
        lower = v.lower()
        if "<script" in lower or "javascript:" in lower:
            raise ValueError("Invalid content in message")
        return v.strip()

    @field_validator("website")
    @classmethod
    def honeypot_must_be_empty(cls, v: str) -> str:
        if v and v.strip():
            raise ValueError("Bot detected")
        return v


class AnalyticsPayload(BaseModel):
    page:     str = Field(max_length=200)
    referrer: Optional[str] = Field(default="", max_length=500)
    section:  Optional[str] = Field(default="", max_length=100)
    event:    Optional[str] = Field(default="pageview", max_length=50)


class NewsletterPayload(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def email_not_disposable(cls, v: str) -> str:
        # Basic block of obvious throwaway domains
        blocked = ["mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com"]
        domain = v.split("@")[-1].lower()
        if domain in blocked:
            raise ValueError("Please use a real email address")
        return v.lower().strip()


class NotifyPayload(BaseModel):
    email:   EmailStr
    article: str = Field(min_length=3, max_length=200)

    @field_validator("article")
    @classmethod
    def article_no_html(cls, v: str) -> str:
        if "<" in v or ">" in v:
            raise ValueError("Invalid characters in article title")
        return v.strip()


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Portfolio API",
    version="3.0.0",
    docs_url=None,
    redoc_url=None,
)

# CORS: default to the production domain — never open wildcard in production.
_default_origins = "https://solomonleek.tech,http://localhost:5500,http://127.0.0.1:5500"
origins_raw = os.getenv("ALLOWED_ORIGINS", _default_origins)
origins: List[str] = [o.strip() for o in origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


# ── Email builder ──────────────────────────────────────────────────────────────
def _build_email(payload: ContactPayload, to_email: str, from_email: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"]  = f"[Portfolio] {payload.subject}"
    msg["From"]     = f"Portfolio Contact <{from_email}>"
    msg["To"]       = to_email
    msg["Reply-To"] = payload.email

    plain = (
        f"New message from your portfolio contact form\n"
        f"{'─' * 48}\n"
        f"Name:    {payload.name}\n"
        f"Email:   {payload.email}\n"
        f"Subject: {payload.subject}\n"
        f"{'─' * 48}\n\n"
        f"{payload.message}\n\n"
        f"{'─' * 48}\n"
        f"Sent via solomonleek.tech"
    )

    safe_msg = (
        payload.message
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br>")
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060d1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#0f1e35;border-radius:16px;border:1px solid rgba(255,255,255,0.1);
                    overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#ea580c,#f97316);padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;
                          display:inline-block;text-align:center;line-height:36px;
                          font-family:'Sora',sans-serif;font-weight:800;font-size:13px;color:#fff;
                          vertical-align:middle;">SK</div>
              <span style="font-family:'Sora',Arial,sans-serif;font-weight:800;font-size:18px;
                           color:#fff;vertical-align:middle;margin-left:10px;">Sleek Portfolio</span>
            </td>
            <td align="right" style="font-size:12px;color:rgba(255,255,255,0.7);">New Message</td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="font-family:'Sora',Arial,sans-serif;font-size:20px;font-weight:800;
                     color:#fff;margin:0 0 8px;">You have a new message</h2>
          <p style="font-size:14px;color:rgba(255,255,255,0.5);margin:0 0 28px;">
            Someone reached out through your portfolio contact form.</p>
          <!-- Sender -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
                        border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <span style="font-size:11px;font-weight:700;text-transform:uppercase;
                           color:rgba(255,255,255,0.4);">From</span><br>
              <span style="font-size:15px;font-weight:700;color:#fff;">{payload.name}</span>
              <span style="font-size:13px;color:#f97316;margin-left:8px;">&lt;{payload.email}&gt;</span>
              <br><br>
              <span style="font-size:11px;font-weight:700;text-transform:uppercase;
                           color:rgba(255,255,255,0.4);">Subject</span><br>
              <span style="font-size:15px;color:rgba(255,255,255,0.9);">{payload.subject}</span>
            </td></tr>
          </table>
          <!-- Message -->
          <div style="background:rgba(255,255,255,0.03);border-left:4px solid #ea580c;
                      border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:28px;">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;
                      color:rgba(255,255,255,0.4);margin:0 0 12px;">Message</p>
            <p style="font-size:15px;color:rgba(255,255,255,0.8);line-height:1.7;margin:0;">
              {safe_msg}</p>
          </div>
          <a href="mailto:{payload.email}?subject=Re: {payload.subject}"
             style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);
                    color:#fff;font-size:14px;font-weight:700;padding:12px 24px;
                    border-radius:8px;text-decoration:none;">Reply to {payload.name}</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.07);">
          <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:0;">
            Sent via <a href="https://solomonleek.tech"
                        style="color:#f97316;text-decoration:none;">solomonleek.tech</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html,  "html",  "utf-8"))
    return msg


def _send_email(payload: ContactPayload) -> None:
    smtp_host     = os.getenv("SMTP_HOST", "")
    smtp_port     = int(os.getenv("SMTP_PORT", "587"))
    smtp_user     = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_starttls = os.getenv("SMTP_STARTTLS", "true").lower() == "true"
    to_email      = os.getenv("CONTACT_TO_EMAIL", "")
    from_email    = os.getenv("CONTACT_FROM_EMAIL", smtp_user or "")

    if not (smtp_host and smtp_user and smtp_password and to_email and from_email):
        raise RuntimeError(
            "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, "
            "CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL in your .env file."
        )

    msg = _build_email(payload, to_email, from_email)
    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.ehlo()
        if smtp_starttls:
            server.starttls()
            server.ehlo()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        log.info("Email sent to %s from %s (%s)", _sanitize_log(to_email), _sanitize_log(payload.name), _sanitize_log(payload.email))


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": "3.0.0",
        "smtp_configured": bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER")),
    }


@app.get("/api/messages/count", dependencies=[Depends(_require_admin_key)])
def message_count() -> dict:
    records = _read_json(LOG_FILE, [])
    return {"count": len(records) if isinstance(records, list) else 0}


@app.get("/api/messages", dependencies=[Depends(_require_admin_key)])
def messages(limit: int = 50) -> dict:
    records = _read_json(LOG_FILE, [])
    if not isinstance(records, list):
        return {"count": 0, "messages": []}

    safe_limit = max(1, min(int(limit), 200))
    recent_messages = list(reversed(records))[:safe_limit]
    return {"count": len(records), "messages": recent_messages}


@app.get("/api/analytics/views")
def analytics_total_views() -> dict:
    """Public, non-sensitive total view count — powers the footer visitor badge."""
    records = _read_json(ANALYTICS_FILE, [])
    return {"total_views": len(records) if isinstance(records, list) else 0}


@app.get("/api/analytics/summary", dependencies=[Depends(_require_admin_key)])
def analytics_summary() -> dict:
    """Return aggregated analytics — page views, top sections, top referrers."""
    records = _read_json(ANALYTICS_FILE, [])
    if not isinstance(records, list):
        return {"total_views": 0, "sections": {}, "referrers": {}, "pages": {}}

    pages: Dict[str, int]     = defaultdict(int)
    sections: Dict[str, int]  = defaultdict(int)
    referrers: Dict[str, int] = defaultdict(int)

    for r in records:
        pages[r.get("page", "/")] += 1
        if r.get("section"):
            sections[r["section"]] += 1
        ref = r.get("referrer", "")
        if ref:
            referrers[ref] += 1

    return {
        "total_views": len(records),
        "pages":     dict(sorted(pages.items(),     key=lambda x: x[1], reverse=True)[:10]),
        "sections":  dict(sorted(sections.items(),  key=lambda x: x[1], reverse=True)[:10]),
        "referrers": dict(sorted(referrers.items(), key=lambda x: x[1], reverse=True)[:10]),
    }


@app.post("/api/analytics", status_code=status.HTTP_200_OK)
async def track(request: Request, payload: AnalyticsPayload) -> dict:
    """Receive a page view or section view event."""
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    client_ip = client_ip.split(",")[0].strip()
    ua = request.headers.get("User-Agent", "")

    # Skip known bots
    bot_keywords = ["bot", "crawler", "spider", "headless", "python-requests", "curl"]
    if any(k in ua.lower() for k in bot_keywords):
        return {"ok": True}

    # Rate-limit analytics to prevent flooding (120 events/min per IP)
    _check_rate_limit(client_ip, ANALYTICS_RATE_MAX, ANALYTICS_RATE_WINDOW, bucket="analytics")

    record = {
        "ts":       datetime.now(timezone.utc).isoformat(),
        "page":     payload.page[:200],
        "referrer": payload.referrer[:500] if payload.referrer else "",
        "section":  payload.section[:100] if payload.section else "",
        "event":    payload.event or "pageview",
        "country":  "",   # can be filled by a geo-IP service later
    }
    _append_json(ANALYTICS_FILE, record)
    return {"ok": True}


@app.post("/api/contact", status_code=status.HTTP_200_OK)
async def contact(request: Request, payload: ContactPayload) -> dict:
    # 1. Honeypot check
    if payload.website and payload.website.strip():
        log.warning("Honeypot triggered — bot submission blocked")
        return {"ok": True, "message": "Message received"}

    # 2. Rate limit (file-backed — survives restarts)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    client_ip = client_ip.split(",")[0].strip()
    _check_rate_limit(client_ip, CONTACT_RATE_MAX, CONTACT_RATE_WINDOW, bucket="contact")

    # 3. Build log record (always saved, even if email fails)
    record = {
        "id":        int(time.time() * 1000),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip":        client_ip,
        "name":      payload.name,
        "email":     payload.email,
        "subject":   payload.subject,
        "message":   payload.message,
        "delivered": False,
    }

    # 4. Send email
    try:
        _send_email(payload)
        record["delivered"] = True
        log.info("Contact from %s <%s> — subject: %s", _sanitize_log(payload.name), _sanitize_log(payload.email), _sanitize_log(payload.subject))
    except RuntimeError as cfg_err:
        log.error("SMTP config error: %s", cfg_err)
        _append_json(LOG_FILE, record)
        return {"ok": True, "message": "Message received! Your inquiry has been saved."}
    except smtplib.SMTPAuthenticationError:
        log.error("SMTP authentication failed")
        _append_json(LOG_FILE, record)
        return {"ok": True, "message": "Message received! Your inquiry has been saved."}
    except Exception as err:
        log.error("Email send failed: %s", err)
        _append_json(LOG_FILE, record)
        return {"ok": True, "message": "Message received! Your inquiry has been saved."}

    _append_json(LOG_FILE, record)
    return {"ok": True, "message": "Message sent! I'll get back to you soon."}


# ── Newsletter subscription ────────────────────────────────────────────────────
@app.post("/api/newsletter", status_code=status.HTTP_200_OK)
async def newsletter_subscribe(request: Request, payload: NewsletterPayload) -> dict:
    """Store a newsletter subscriber. Sends a confirmation email if SMTP is configured."""
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    client_ip = client_ip.split(",")[0].strip()

    # Rate limit: 3 subscribe attempts per hour per IP
    _check_rate_limit(client_ip, 3, 3600, bucket="newsletter")

    subscribers: List[dict] = _read_json(NEWSLETTER_FILE, [])

    # Deduplicate — silently succeed if already subscribed
    existing_emails = [s.get("email", "").lower() for s in subscribers]
    if payload.email.lower() in existing_emails:
        return {"ok": True, "message": "You're already subscribed. Thanks!"}

    record = {
        "email":     payload.email.lower(),
        "subscribed_at": datetime.now(timezone.utc).isoformat(),
        "ip":        client_ip,
        "active":    True,
    }
    subscribers.append(record)
    _write_json(NEWSLETTER_FILE, subscribers)
    log.info("Newsletter subscriber: %s", _sanitize_log(payload.email))

    # Send confirmation email (best-effort — don't fail if SMTP not configured)
    try:
        _send_newsletter_confirmation(payload.email)
    except Exception as e:
        log.warning("Newsletter confirmation email failed: %s", e)

    return {"ok": True, "message": "Subscribed! You'll get new articles in your inbox."}


def _send_newsletter_confirmation(to_email: str) -> None:
    smtp_host     = os.getenv("SMTP_HOST", "")
    smtp_port     = int(os.getenv("SMTP_PORT", "587"))
    smtp_user     = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_starttls = os.getenv("SMTP_STARTTLS", "true").lower() == "true"
    from_email    = os.getenv("CONTACT_FROM_EMAIL", smtp_user or "")

    if not (smtp_host and smtp_user and smtp_password and from_email):
        raise RuntimeError("SMTP not configured")

    msg = MIMEMultipart("alternative")
    msg["Subject"]  = "You're subscribed to Solomon Leek's blog"
    msg["From"]     = f"Solomon Leek <{from_email}>"
    msg["To"]       = to_email

    plain = (
        "Hi,\n\n"
        "You're now subscribed to Solomon Thiong Garang Leek's blog.\n"
        "You'll receive an email when new articles are published.\n\n"
        "Topics: Software Engineering · Design · Leadership · Africa & Tech\n\n"
        "To unsubscribe, reply to this email with 'unsubscribe' in the subject.\n\n"
        "— Solomon\nhttps://solomonleek.tech"
    )

    html = """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060d1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#0f1e35;border-radius:16px;border:1px solid rgba(255,255,255,0.1);
                    overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#ea580c,#f97316);padding:24px 32px;">
          <span style="font-family:'Sora',Arial,sans-serif;font-weight:800;font-size:18px;color:#fff;">
            Solomon Leek · Blog
          </span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:'Sora',Arial,sans-serif;font-size:20px;font-weight:800;color:#fff;margin:0 0 12px;">
            You're subscribed!
          </h2>
          <p style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.7;margin:0 0 20px;">
            Thanks for subscribing. You'll get an email when new articles are published on topics like
            software engineering, design, leadership, and building technology for Africa.
          </p>
          <a href="https://solomonleek.com/blog/"
             style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);
                    color:#fff;font-size:14px;font-weight:700;padding:12px 24px;
                    border-radius:8px;text-decoration:none;">
            Read the Blog
          </a>
          <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:24px 0 0;">
            To unsubscribe, reply with "unsubscribe" in the subject line.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html,  "html",  "utf-8"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.ehlo()
        if smtp_starttls:
            server.starttls()
            server.ehlo()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        log.info("Newsletter confirmation sent to %s", _sanitize_log(to_email))


# ── Article notify-me ──────────────────────────────────────────────────────────
@app.post("/api/notify", status_code=status.HTTP_200_OK)
async def notify_subscribe(request: Request, payload: NotifyPayload) -> dict:
    """Store a 'notify me when published' request for a coming-soon article."""
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    client_ip = client_ip.split(",")[0].strip()

    # Rate limit: 10 notify requests per hour per IP
    _check_rate_limit(client_ip, 10, 3600, bucket="notify")

    requests_list: List[dict] = _read_json(NOTIFY_FILE, [])

    # Deduplicate per email+article combo
    for r in requests_list:
        if r.get("email", "").lower() == payload.email.lower() and r.get("article") == payload.article:
            return {"ok": True, "message": "You're already on the list for this article."}

    record = {
        "email":      payload.email.lower(),
        "article":    payload.article,
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "ip":         client_ip,
        "notified":   False,
    }
    requests_list.append(record)
    _write_json(NOTIFY_FILE, requests_list)
    log.info("Notify request: %s for '%s'", _sanitize_log(payload.email), _sanitize_log(payload.article))

    return {"ok": True, "message": "Got it! We'll email you when this article is published."}


@app.get("/api/newsletter/count")
def newsletter_count() -> dict:
    """Return subscriber count (no emails exposed)."""
    subscribers = _read_json(NEWSLETTER_FILE, [])
    active = [s for s in subscribers if isinstance(s, dict) and s.get("active", True)]
    return {"count": len(active)}


# ── Validation error handler ───────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first  = errors[0] if errors else {}
    field  = first.get("loc", ["field"])[-1]
    msg    = first.get("msg", "Invalid input")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": f"{field}: {msg}"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
        log_level="info",
    )
