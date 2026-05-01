# Portfolio Contact API

FastAPI backend for the portfolio contact form.

## Features

- ✅ Input validation with Pydantic v2
- ✅ Rate limiting — 5 requests per IP per hour (configurable)
- ✅ Honeypot spam field
- ✅ HTML + plain-text email with branded template
- ✅ Message logging to `messages.json` (every message saved, even if email fails)
- ✅ CORS locked to allowed origins
- ✅ Health check endpoint

---

## Setup

### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your values. The minimum required fields are:

```env
CONTACT_TO_EMAIL=your-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_STARTTLS=true
```

**Gmail setup (recommended):**
1. Enable 2-Factor Authentication on your Google account
2. Go to: myaccount.google.com → Security → App Passwords
3. Create an App Password for "Mail"
4. Use the 16-character password as `SMTP_PASSWORD`

### 3. Run the server

```bash
uvicorn app:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + SMTP status |
| POST | `/api/contact` | Submit contact form |
| GET | `/api/messages/count` | Total messages received |

---

## Message log

Every submission is saved to `messages.json` in this folder — even if email delivery fails. This means you never lose a message.

To read your messages:
```bash
cat messages.json
```

---

## Frontend configuration

The frontend sends to `http://localhost:8000/api/contact` by default.

To point to a different URL (e.g. after deploying), set this before your script tag:

```html
<script>window.CONTACT_API_URL = 'https://your-api.example.com/api/contact';</script>
```

---

## Deployment

For production, deploy with:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 2
```

Or use a process manager like `systemd`, `supervisor`, or deploy to Railway/Render/Fly.io.

Remember to:
- Set `ALLOWED_ORIGINS` to your live domain
- Use environment variables (not `.env` file) in production
- Keep `messages.json` backed up
