# Portfolio Backend API

FastAPI backend for Solomon Thiong Garang Leek's portfolio.
Handles contact form submissions, newsletter subscriptions, article notify requests, and analytics.

---

## Forms & What They Do

| Form | Endpoint | What happens |
|---|---|---|
| Contact form (main page) | `POST /api/contact` | Email sent to `CONTACT_TO_EMAIL`, message saved to `messages.json` |
| Newsletter (footer + blog sidebar) | `POST /api/newsletter` | Email saved to `newsletter.json`, confirmation email sent to subscriber |
| Notify me (coming-soon articles) | `POST /api/notify` | Request saved to `notify_requests.json` |
| Page analytics | `POST /api/analytics` | Event saved to `analytics.json` |

---

## Setup for Deployment

### Step 1 — Copy the example env file

```bash
cd backend
cp .env.example .env
```

### Step 2 — Fill in your real values

Open `.env` and set:

```env
# Your Gmail address (used as the SMTP sender)
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-16-char-app-password

# Where contact form messages are delivered
CONTACT_TO_EMAIL=s.leek@alustudent.com
CONTACT_FROM_EMAIL=your-gmail@gmail.com

# Your live domain (CORS)
ALLOWED_ORIGINS=https://solomonleek.com
```

### Step 3 — Get a Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification (must be ON)
3. Security → App Passwords
4. Create one for "Mail" → copy the 16-character password
5. Paste it as `SMTP_PASSWORD` in your `.env`

### Step 4 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 5 — Run locally

```bash
python app.py
```

Server starts at `http://localhost:8000`

### Step 6 — Deploy

**Recommended: [Render.com](https://render.com) (free tier)**

1. Push repo to GitHub
2. Create a new Web Service on Render
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Add all `.env` values as Environment Variables in Render dashboard
6. Deploy — Render gives you a URL like `https://your-app.onrender.com`
7. Set `window.CONTACT_API_URL` in your HTML to that URL

---

## Setting the API URL on your frontend

In your HTML, before `<script src="js/main.js">`, add:

```html
<script>
  window.CONTACT_API_URL = 'https://your-app.onrender.com/api/contact';
  window.ANALYTICS_API_URL = 'https://your-app.onrender.com/api/analytics';
</script>
```

Or set it once in a config script that all pages load.

---

## Checking it works after deployment

```bash
# Health check
curl https://your-app.onrender.com/api/health

# Test contact form
curl -X POST https://your-app.onrender.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Hello from curl"}'
```

---

## Data files (auto-created)

| File | Contents |
|---|---|
| `messages.json` | All contact form submissions |
| `newsletter.json` | Newsletter subscribers |
| `notify_requests.json` | Article notify-me requests |
| `analytics.json` | Page view events |
| `rate_limits.json` | Rate limit state (persists across restarts) |

These contain visitor PII (names, emails, IPs) — never commit them. See the root `.gitignore`.

---

## Admin-only endpoints

`GET /api/messages`, `GET /api/messages/count`, and `GET /api/analytics/summary` expose visitor
data and require an `ADMIN_API_KEY` set in `.env`. Without it, they return `503` instead of
leaking data. Call them with the key as a header:

```bash
curl -H "X-Admin-Key: <your-key>" https://solomonleek.com/api/messages
```

`GET /api/analytics/views` is intentionally public (total view count only, no PII) — it powers
the visitor-count badge in the site footer.
