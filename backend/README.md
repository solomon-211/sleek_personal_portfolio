# Portfolio Backend (FastAPI)

This backend provides a real contact API for the portfolio form.

## Why FastAPI
- Fast, modern Python framework
- Strong validation with Pydantic
- Easy production deployment
- Built-in docs and predictable JSON APIs

## Setup
1. Create a virtual environment and activate it.
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Copy env template:
   - `copy .env.example .env` (Windows)
4. Fill your SMTP and email values in `.env`.
5. Run server:
   - `uvicorn app:app --reload --port 8000`

## Endpoints
- `GET /api/health`
- `POST /api/contact`

## Frontend Integration
The frontend posts to:
- `http://127.0.0.1:8000/api/contact`

You can override with:
- `window.CONTACT_API_URL = "https://your-domain/api/contact"`
before loading `main.js`.
