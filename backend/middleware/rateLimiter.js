// ═══════════════════════════════════════════════════════
//  Middleware: Per-User Daily Rate Limiter
// ═══════════════════════════════════════════════════════

'use strict';

// In-memory store: Map<userId, { count, resetAt }>
// Resets per user at midnight UTC each day.
// For production at scale → replace with Redis.
const userLimits = new Map();

const LIMIT_PER_DAY = parseInt(process.env.RATE_LIMIT_PER_DAY || '10', 10);

/**
 * Get midnight UTC timestamp for today (used as reset time).
 */
function getTodayMidnightUTC() {
  const now = new Date();
  now.setUTCHours(24, 0, 0, 0); // next midnight UTC
  return now.getTime();
}

/**
 * Get or initialize a user's rate limit entry.
 */
function getUserEntry(userId) {
  const now = Date.now();
  let entry = userLimits.get(userId);

  // Create new or reset if day has passed
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: getTodayMidnightUTC() };
    userLimits.set(userId, entry);
  }

  return entry;
}

/**
 * Get the rate limit status for a user (used by /api/rate-status).
 */
function getRateLimitStatus(userId) {
  const entry = getUserEntry(userId);
  return {
    limit: LIMIT_PER_DAY,
    used: entry.count,
    remaining: Math.max(0, LIMIT_PER_DAY - entry.count),
    resetsAt: new Date(entry.resetAt).toISOString(),
  };
}

/**
 * Express middleware — checks and increments per-user daily rate limit.
 * Requires verifyGoogleToken to run first (needs req.user.sub).
 */
function rateLimiter(req, res, next) {
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({ error: 'User ID not found. Auth middleware must run first.' });
  }

  const entry = getUserEntry(userId);

  if (entry.count >= LIMIT_PER_DAY) {
    const resetsAt = new Date(entry.resetAt);
    const hoursLeft = Math.ceil((entry.resetAt - Date.now()) / 3600000);

    console.log(`[RATE LIMIT] User ${req.user.email} hit daily limit (${LIMIT_PER_DAY}/day)`);

    return res.status(429).json({
      error: 'Daily limit reached',
      message: `You've used all ${LIMIT_PER_DAY} AI generations for today. Your quota resets in ~${hoursLeft} hour(s).`,
      limit: LIMIT_PER_DAY,
      used: entry.count,
      remaining: 0,
      resetsAt: resetsAt.toISOString(),
    });
  }

  // Increment counter
  entry.count++;
  userLimits.set(userId, entry);

  // Attach rate limit info to response headers (good practice)
  res.setHeader('X-RateLimit-Limit', LIMIT_PER_DAY);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, LIMIT_PER_DAY - entry.count));
  res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());

  next();
}

// Periodically clean up old entries (every hour) to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [userId, entry] of userLimits.entries()) {
    if (now >= entry.resetAt) {
      userLimits.delete(userId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[Rate Limiter] Cleaned ${cleaned} expired entries`);
  }
}, 60 * 60 * 1000);

module.exports = { rateLimiter, getRateLimitStatus };
