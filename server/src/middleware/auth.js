const jwt = require("jsonwebtoken");
const { pool } = require("../db/client");

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "access_token";
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

const getTokenFromRequest = (req) => {
  const bearer = req.headers.authorization;
  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.replace("Bearer ", "").trim();
  }
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  return null;
};

const authenticateJWT = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { ...payload };
    // Enrich lab users with labId
    if (req.user.role === "lab") {
      try {
        const labResult = await pool.query("SELECT id FROM labs WHERE email = $1", [req.user.email]);
        if (labResult.rowCount === 0) {
          return res.status(403).json({ error: "Lab not found for user" });
        }
        req.user.labId = labResult.rows[0].id;
      } catch (error) {
        console.error("Failed to resolve lab for user", error);
        return res.status(500).json({ error: "Authorization failed" });
      }
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user?.role) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

module.exports = {
  authenticateJWT,
  requireRole,
  COOKIE_NAME
};
