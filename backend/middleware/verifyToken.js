// ═══════════════════════════════════════════════════════
//  Middleware: Google ID Token Verification
// ═══════════════════════════════════════════════════════

'use strict';

const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cache verified tokens for 5 minutes to reduce API calls
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Express middleware — verifies Google ID Token from Authorization header.
 * Attaches decoded user info to req.user on success.
 */
async function verifyGoogleToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header',
      hint: 'Include "Authorization: Bearer <google_id_token>" in your request',
    });
  }

  const idToken = authHeader.slice(7).trim();

  // Check cache first
  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.payload;
    return next();
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Validate token is not expired (google-auth-library does this, but double-check)
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    // Optionally restrict to specific email domain
    // Uncomment and set ALLOWED_DOMAIN in .env to restrict access:
    // if (process.env.ALLOWED_DOMAIN && !payload.email?.endsWith(`@${process.env.ALLOWED_DOMAIN}`)) {
    //   return res.status(403).json({ error: 'Access restricted to specific domain' });
    // }

    const user = {
      sub: payload.sub,           // Unique Google user ID
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified,
    };

    // Cache the verified token
    tokenCache.set(idToken, {
      payload: user,
      expiresAt: Date.now() + TOKEN_CACHE_TTL,
    });

    // Clean up old cache entries periodically
    if (tokenCache.size > 500) {
      const now = Date.now();
      for (const [key, val] of tokenCache.entries()) {
        if (val.expiresAt < now) tokenCache.delete(key);
      }
    }

    req.user = user;
    next();

  } catch (err) {
    console.error('Token verification failed:', err.message);

    if (err.message?.includes('Token used too late')) {
      return res.status(401).json({ error: 'Token expired. Please sign in again.' });
    }
    if (err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    return res.status(401).json({ error: 'Authentication failed. Please sign in again.' });
  }
}

module.exports = { verifyGoogleToken };
