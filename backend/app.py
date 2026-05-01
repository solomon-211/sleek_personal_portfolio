"""
Portfolio Contact API — Solomon Thiong Garang Leek
===================================================
Strong backend with:
  - Input validation (Pydantic v2)
  - Rate limiting (per IP, in-memory)
  - Honeypot spam field
  - HTML + plain-text email
  - Message logging to JSON file (no database needed)
  - CORS locked to allowed origins
  - Health + stats endpoints
  - Graceful fallback when SMTP is not configured
"""

import json
import logging
import os
import smtplib
import time
from datetime import datetime, timezone
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, field_validator

load_dotenv()

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("portfolio")

# ── Message log file ───────────────────────────────────────────────────────────
LOG_FILE = Path(__file__).parent / "messages.json"


def _append_message(data: dict) -> None:
    """Append a contact message to the local JSON log."""
    messages: List[dict] = []
    if LOG_FILE.exists():
        try:
            messages = json.loads(LOG_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            messages = []
    messages.append(data)
    LOG_FILE.write_text(json.dumps(messages, indent=2, ensure_ascii=False), encoding="utf-8")


# ── Rate limiter (in-memory, per IP) ──────────────────────────────────────────
RATE_LIMIT_MAX     = int(os.getenv("RATE_LIMIT_MAX", "5"))      # max requests
RATE_LIMIT_WINDOW  = int(os.getenv("RATE_LIMIT_WINDOW", "3600")) # per window (seconds)

_rate_store: Dict[str, List[float]] = defaultdict(list)


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    # Keep only timestamps within the current window
    _rate_store[ip] = [t for t in _rate_store[ip] if t > window_start]
    if len(_rate_store[ip]) >= RATE_LIMIT_MAX:
        log.warning("Rate limit hit for IP %s", ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests. Please wait before sending another message.",
        )
    _rate_store[ip].append(now)


# ── Pydantic models ────────────────────────────────────────────────────────────
class ContactPayload(BaseModel):
    name:    str      = Field(min_length=2,  max_length=80)
    email:   EmailStr
    subject: str      = Field(min_length=3,  max_length=120)
    message: str      = Field(min_length=10, max_length=2000)
    website: Optional[str] = Field(default="")  # honeypot — must be empty

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


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Portfolio Contact API",
    version="2.0.0",
    docs_url=None,   # disable Swagger UI in production
    redoc_url=None,
)

origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
origins: List[str] = [o.strip() for o in origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


# ── Email builder ──────────────────────────────────────────────────────────────
def _build_email(payload: ContactPayload, to_email: str, from_email: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Portfolio] {payload.subject}"
    msg["From"]    = f"Portfolio Contact <{from_email}>"
    msg["To"]      = to_email
    msg["Reply-To"] = payload.email

    # Plain text
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

    # HTML
    safe_message = payload.message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060d1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f1e35;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#ea580c,#f97316);padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-weight:800;font-size:13px;color:#fff;vertical-align:middle;text-align:center;line-height:36px;">SK</div>
                <span style="font-family:'Sora',Arial,sans-serif;font-weight:800;font-size:18px;color:#fff;vertical-align:middle;margin-left:10px;">Sleek Portfolio</span>
              </td>
              <td align="right" style="font-size:12px;color:rgba(255,255,255,0.7);">New Message</td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="font-family:'Sora',Arial,sans-serif;font-size:20px;font-weight:800;color:#fff;margin:0 0 8px;">You have a new message</h2>
          <p style="font-size:14px;color:rgba(255,255,255,0.5);margin:0 0 28px;">Someone reached out through your portfolio contact form.</p>

          <!-- Sender info -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:12px;">
                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.4);">From</span><br>
                    <span style="font-size:15px;font-weight:700;color:#fff;">{payload.name}</span>
                    <span style="font-size:13px;color:#f97316;margin-left:8px;">&lt;{payload.email}&gt;</span>
                  </td>
                </tr>
                <tr><td style="border-top:1px solid rgba(255,255,255,0.07);padding-top:12px;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.4);">Subject</span><br>
                  <span style="font-size:15px;color:rgba(255,255,255,0.9);">{payload.subject}</span>
                </td></tr>
              </table>
            </td></tr>
          </table>

          <!-- Message -->
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-left:4px solid #ea580c;border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:28px;">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.4);margin:0 0 12px;">Message</p>
            <p style="font-size:15px;color:rgba(255,255,255,0.8);line-height:1.7;margin:0;">{safe_message}</p>
          </div>

          <!-- Reply button -->
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="mailto:{payload.email}?subject=Re: {payload.subject}" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Reply to {payload.name}</a>
          </td></tr></table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.07);">
          <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:0;">Sent via <a href="https://solomonleek.tech" style="color:#f97316;text-decoration:none;">solomonleek.tech</a> contact form</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html,  "html",  "utf-8"))
    return msg


# ── SMTP sender ────────────────────────────────────────────────────────────────
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
        log.info("Email sent to %s from %s (%s)", to_email, payload.name, payload.email)


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": "2.0.0",
        "smtp_configured": bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER")),
    }


@app.get("/api/messages/count")
def message_count() -> dict:
    """Return total number of logged messages (no content exposed)."""
    if not LOG_FILE.exists():
        return {"count": 0}
    try:
        messages = json.loads(LOG_FILE.read_text(encoding="utf-8"))
        return {"count": len(messages)}
    except Exception:
        return {"count": 0}


@app.post("/api/contact", status_code=status.HTTP_200_OK)
async def contact(request: Request, payload: ContactPayload) -> dict:
    # 1. Honeypot check
    if payload.website and payload.website.strip():
        log.warning("Honeypot triggered — bot submission blocked")
        # Return 200 so bots don't know they were blocked
        return {"ok": True, "message": "Message received"}

    # 2. Rate limit
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    client_ip = client_ip.split(",")[0].strip()
    _check_rate_limit(client_ip)

    # 3. Log message locally (always, even if email fails)
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
        log.info("Contact from %s <%s> — subject: %s", payload.name, payload.email, payload.subject)
    except RuntimeError as cfg_err:
        log.error("SMTP config error: %s", cfg_err)
        _append_message(record)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service not configured. Message was saved — I will follow up shortly.",
        ) from cfg_err
    except smtplib.SMTPAuthenticationError:
        log.error("SMTP authentication failed")
        _append_message(record)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery failed. Message was saved — I will follow up shortly.",
        )
    except Exception as err:
        log.error("Email send failed: %s", err)
        _append_message(record)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery failed. Message was saved — I will follow up shortly.",
        ) from err

    _append_message(record)
    return {"ok": True, "message": "Message sent! I'll get back to you soon."}


# ── Validation error handler ───────────────────────────────────────────────────
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = first.get("loc", ["field"])[-1]
    msg   = first.get("msg", "Invalid input")
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
