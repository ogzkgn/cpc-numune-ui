// Lightweight in-memory rate limiter (per IP + route key).
// For production, consider a distributed store (Redis) to avoid per-instance limits.
const rateLimit = ({ windowMs, max, message }) => {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip || "unknown"}::${req.path}`;
    const bucket = hits.get(key) || [];
    const fresh = bucket.filter((timestamp) => now - timestamp < windowMs);
    fresh.push(now);
    hits.set(key, fresh);

    if (fresh.length > max) {
      return res.status(429).json({ error: message || "Too many requests, please try again later." });
    }

    next();
  };
};

module.exports = { rateLimit };
