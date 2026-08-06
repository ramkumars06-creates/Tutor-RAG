// ═══════════════════════════════════════════════════════
//  PR's Tutor RAG — Secure Backend Server
//  Proxies Gemini API calls with Google Auth + Rate Limiting
// ═══════════════════════════════════════════════════════

'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const { verifyGoogleToken } = require('./middleware/verifyToken');
const { rateLimiter }       = require('./middleware/rateLimiter');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Validate required env vars ──────────────────────────
const requiredEnv = ['GEMINI_API_KEY', 'GOOGLE_CLIENT_ID'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌  Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ── Security Headers ─────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ─────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'null', // for file:// during local dev
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) in dev
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// ── Health Check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: "PR's Tutor RAG Backend",
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── GET /api/status — Auth check ─────────────────────────
app.get('/api/status', verifyGoogleToken, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
    },
  });
});

// ── POST /api/generate — Main AI Proxy Endpoint ───────────
app.post('/api/generate', verifyGoogleToken, rateLimiter, async (req, res) => {
  const { prompt, type } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }
  if (!type || !['quiz', 'questions', 'notes', 'shortcuts'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be: quiz, questions, notes, shortcuts' });
  }
  if (prompt.length > 15000) {
    return res.status(400).json({ error: 'Prompt too long. Max 15,000 characters.' });
  }

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const geminiBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Gemini API error ${geminiRes.status}`;
      console.error(`[${req.user.email}] Gemini error:`, errMsg);
      return res.status(502).json({ error: `AI service error: ${errMsg}` });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: 'Empty response from AI service' });
    }

    console.log(`[${new Date().toISOString()}] ✅ ${req.user.email} | type=${type} | chars=${prompt.length}`);

    return res.json({ result: text, type });

  } catch (err) {
    console.error(`[${req.user.email}] Proxy error:`, err.message);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});

// ── GET /api/rate-status — Check remaining quota ─────────
app.get('/api/rate-status', verifyGoogleToken, (req, res) => {
  const { getRateLimitStatus } = require('./middleware/rateLimiter');
  const status = getRateLimitStatus(req.user.sub);
  res.json({
    userId: req.user.sub,
    email: req.user.email,
    ...status,
  });
});

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║     PR's Tutor RAG Backend v1.0      ║
  ║   Secure Gemini API Proxy Server     ║
  ╠══════════════════════════════════════╣
  ║  Port     : ${String(PORT).padEnd(25)}║
  ║  Status   : Running ✅                ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
