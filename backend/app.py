import os
import smtplib
from email.message import EmailMessage
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field


load_dotenv()


class ContactPayload(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=120)
    message: str = Field(min_length=10, max_length=2000)


app = FastAPI(title="Portfolio Contact API", version="1.0.0")

origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
origins: List[str] = [o.strip() for o in origins_raw.split(",") if o.strip()]

# CORS is configurable via ALLOWED_ORIGINS="https://site1,https://site2".
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


def _send_email(payload: ContactPayload) -> None:
    # SMTP settings come from environment variables so secrets never live in source code.
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_starttls = os.getenv("SMTP_STARTTLS", "true").lower() == "true"

    to_email = os.getenv("CONTACT_TO_EMAIL", "")
    from_email = os.getenv("CONTACT_FROM_EMAIL", smtp_user or "")

    if not (smtp_host and smtp_user and smtp_password and to_email and from_email):
        raise RuntimeError("SMTP or recipient config missing")

    # Plain-text mail keeps delivery reliable across providers and clients.
    msg = EmailMessage()
    msg["Subject"] = f"Portfolio Contact: {payload.subject}"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(
        "\n".join(
            [
                "New portfolio contact message:",
                f"Name: {payload.name}",
                f"Email: {payload.email}",
                f"Subject: {payload.subject}",
                "",
                payload.message,
            ]
        )
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        if smtp_starttls:
            server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/contact")
def contact(payload: ContactPayload) -> dict:
    try:
        _send_email(payload)
    except RuntimeError as cfg_error:
        # Surface configuration problems directly so deployment issues are obvious.
        raise HTTPException(status_code=500, detail=str(cfg_error)) from cfg_error
    except Exception as send_error:
        # Hide internal SMTP/provider details from clients.
        raise HTTPException(status_code=500, detail="Failed to send message") from send_error

    return {"ok": True, "message": "Message sent successfully"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
