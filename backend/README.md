# PR's Tutor RAG — Backend

Secure Node.js API proxy server for PR's Tutor RAG.
Handles Google authentication, per-user rate limiting, and proxies Gemini AI requests.

## Quick Start (Local)

```bash
cd backend
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

Server runs at `http://localhost:3001`

## API Endpoints

| Method | Route | Auth Required | Description |
|--------|-------|--------------|-------------|
| GET | `/health` | No | Server health check |
| GET | `/api/status` | Yes | Verify auth + get user info |
| POST | `/api/generate` | Yes | Generate AI content |
| GET | `/api/rate-status` | Yes | Check remaining quota |

### POST /api/generate

**Headers:**
```
Authorization: Bearer <google_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "type": "quiz",
  "prompt": "Your study notes text here..."
}
```

`type` must be one of: `quiz`, `questions`, `notes`, `shortcuts`

**Response:**
```json
{
  "result": "{ ... AI generated JSON string ... }",
  "type": "quiz"
}
```

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 2026-01-02T00:00:00.000Z
```

---

## Deploy to Render.com (Free)

### Step 1 — Push backend to GitHub

Create a new GitHub repository and push ONLY the `backend/` folder contents:

```bash
# From inside the backend/ folder:
git init
git add .
git commit -m "Initial backend"
git remote add origin https://github.com/YOUR_USERNAME/prs-tutor-rag-backend.git
git push -u origin main
```

> ⚠️ Make sure `.env` is in `.gitignore` — never commit real secrets!

### Step 2 — Create Web Service on Render

1. Go to [render.com](https://render.com) → Sign up free
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Render auto-detects Node.js. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click **"Advanced"** → **"Add Environment Variable"** and add:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | Your Gemini API key from AI Studio |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `FRONTEND_URL` | Your Netlify app URL (add after deploying frontend) |
| `RATE_LIMIT_PER_DAY` | `10` |

6. Click **"Create Web Service"**
7. Wait for deployment (~2 mins) → Copy your backend URL (e.g., `https://prs-tutor-rag-backend.onrender.com`)

---

## Setting Up Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable the **"Google Identity"** API
4. Go to **"APIs & Services"** → **"Credentials"**
5. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
6. Application type: **Web application**
7. Add **Authorized JavaScript origins:**
   ```
   http://localhost:5500
   http://localhost:3000
   https://YOUR-APP.netlify.app
   ```
8. Add **Authorized redirect URIs:** (same as origins for SPA)
9. Copy the **Client ID** → use in `GOOGLE_CLIENT_ID` env var and `auth.js`

---

## Environment Variables Reference

```env
GEMINI_API_KEY=AIza...         # Required: Your Gemini API key
GOOGLE_CLIENT_ID=...           # Required: Google OAuth Client ID
FRONTEND_URL=https://...       # Required in production: your Netlify URL
RATE_LIMIT_PER_DAY=10          # Optional: requests per user per day (default: 10)
PORT=3001                      # Optional: server port (Render sets this auto)
```
