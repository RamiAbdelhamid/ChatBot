# Chatbot — FastAPI + Groq + React (Vite)

> **Version:** 1.0 · **Date:** 2025-08-09

A lightweight chatbot stack:
- **Backend:** FastAPI + LangChain (ChatGroq)  
- **Frontend:** React (Vite)  
- **Hosting:** Render (Web Service for API, Static Site for UI)

---

## Live Links
- **API:** https://chatbot-80qm.onrender.com  
  - Health: `GET /health`  
  - Chat: `POST /chat`
- **Frontend:** https://chatbot-1-ao6t.onrender.com

---

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [API](#api)
- [Frontend (React)](#frontend-react)
- [Deployment (Render)](#deployment-render)
- [Keep the API Awake](#keep-the-api-awake)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features
- Minimal REST API for chat (`POST /chat`).
- Session-based context (in-memory demo).
- CORS configured for local + deployed UI.
- Health endpoint for warm-up and uptime monitoring.
- Ready to deploy on Render (backend + frontend).

---

## Architecture
```
[ React (Vite) ]  --(HTTPS /chat)-->  [ FastAPI @ Render ]
                                     |             |
                                     |      (GET/HEAD /health)
                                     |             |
                                     +--> LangChain --> Groq API
```

---

## Tech Stack
- **Backend:** Python 3.11, FastAPI, LangChain, ChatGroq
- **Frontend:** React + Vite
- **Infra:** Render (Web Service + Static Site)

---

## Environment Variables
### Backend (FastAPI)
- `GROQ_API_KEY` **(required)** — your Groq key (`gsk_...`)
- `GROQ_MODEL` *(optional)* — default: `llama3-70b-8192`
- `ALLOWED_ORIGINS` *(optional)* — comma-separated origins for CORS

### Frontend (Vite)
- `VITE_API_URL` **(required in prod)** — base URL of the API, e.g. `https://chatbot-80qm.onrender.com`

> Vite exposes only vars starting with `VITE_` to the browser.

---

## Local Development
### Backend
```bash
# Windows PowerShell
py -3.11 -m venv venv
./venv/Scripts/Activate.ps1
python -m pip install -U pip
pip install -r requirements.txt
$env:GROQ_API_KEY="gsk_..."
uvicorn server:app --reload
# Open http://127.0.0.1:8000/health
```

### Frontend
```bash
cd front
npm ci   # or: npm install
# Optional: create front/.env.local with:
# VITE_API_URL="http://127.0.0.1:8000"
npm run dev
# Open http://localhost:5173
```

---

## API
Base URL (prod): `https://chatbot-80qm.onrender.com`

### Endpoints
- `GET /` → `{ ok: true, model: "<GROQ_MODEL>" }`
- `GET /health` → `{ status: "healthy" }`
- `HEAD /health` → `200 OK`
- `POST /chat` → request body and response below
- `POST /reset/{session_id}` → clears the session context

### `POST /chat` — Request Body
```json
{
  "session_id": "s-abc123",
  "message": "What is the capital of Jordan?"
}
```

**Response**
```json
{ "reply": "Amman." }
```

**cURL**
```bash
curl -s -X POST "https://chatbot-80qm.onrender.com/chat"   -H "Content-Type": "application/json"   -d '{"session_id":"s-123","message":"What is the capital of Jordan?"}'
```

**PowerShell**
```powershell
Invoke-RestMethod -Uri "https://chatbot-80qm.onrender.com/chat" -Method POST `
  -ContentType "application/json" `
  -Body (@{ session_id="s-123"; message="What is the capital of Jordan?" } | ConvertTo-Json)
```

**CORS**
In `server.py`, allow **UI origins only** (not the API itself):
```py
ALLOWED_ORIGINS = [
  "https://chatbot-1-ao6t.onrender.com",
  "http://localhost:5173"
]
```

---

## Frontend (React)
Read the API base from environment:
```jsx
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const res = await fetch(`${API_URL}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ session_id: getSid(), message })
});
const data = await res.json(); // { reply: "..." }
```

Warm-up on mount (optional):
```jsx
useEffect(() => {
  (async () => { try { await fetch(`${API_URL}/health`, { cache: "no-store" }); } catch {} })();
}, []);
```

---

## Deployment (Render)
### API — Web Service
- **Root Directory:** `.`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Environment:**
  - `GROQ_API_KEY` (required)
  - `GROQ_MODEL` (optional)

### Frontend — Static Site
- **Root Directory:** `front`
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`
- **Environment:**
  - `VITE_API_URL = https://chatbot-80qm.onrender.com`

> After changing environment variables on Render, **Clear build cache & Deploy** (for the static site) or **Redeploy** (for the API).

---

## Keep the API Awake
On free plans, services can sleep after inactivity. Options:
- **UptimeRobot**: create an HTTP/HTTPS monitor on `https://chatbot-80qm.onrender.com/health` every 5 minutes.
- UI warm-up: call `/health` on page load and show a small “Warming up…” indicator.

---

## Troubleshooting
| Symptom                | Likely Cause                     | Fix |
|------------------------|----------------------------------|-----|
| 405 on `/`             | Browser sends `HEAD`             | Add `@app.head("/")` or ignore |
| 400 on `OPTIONS /chat` | Misconfigured CORS               | Ensure `allow_origins` has your UI domain |
| 401/403 from Groq      | Missing/invalid `GROQ_API_KEY`   | Set it in Render → Environment |
| Slow first reply       | Render cold start                | UptimeRobot ping + UI warm-up |
| 404 `/favicon.ico`     | No favicon                       | Add a route/file or ignore |

---

## Security Notes
- Never commit secrets; use environment variables.
- Restrict CORS to known origins (no `*`).
- Consider rate limiting or an API token for `/chat` in production.

---

## Roadmap
- Redis for session context + truncation.
- Streaming responses (SSE/WebSocket).
- API auth token for UI requests.
- Structured logs + error monitoring.

---

## License
MIT (or your preferred license).

**Author:** Your Name  
**Date:** 2025-08-09
