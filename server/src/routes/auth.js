const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/client");
const { COOKIE_NAME } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const isProduction = process.env.NODE_ENV === "production";

const signToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const setAuthCookie = (res, token) => {
  const maxAgeMs = 1000 * 60 * 60; // 1 hour default; JWT_EXPIRES_IN still controls token expiry
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: maxAgeMs
  });
};

router.post(
  "/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Çok fazla giriş denemesi. Lütfen bekleyin." }),
  async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: "invalid email" });
  }

  try {
    const result = await pool.query(
      "SELECT email, password, role FROM users WHERE email = $1",
      [normalizedEmail]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ email: user.email, role: user.role });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Login failed" });
  }
}
);

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax"
  });
  res.json({ success: true });
});

router.get("/me", async (req, res) => {
  const token =
    req.cookies?.[COOKIE_NAME] ||
    (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ email: payload.email, role: payload.role });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;
