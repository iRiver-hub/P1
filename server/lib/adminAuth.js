const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { JWT_SECRET } = require("./authMiddleware");

const ADMIN_KEY = process.env.ADMIN_KEY;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_KEY || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("FATAL: ADMIN_KEY, ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required.");
  process.exit(1);
}

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (key && key === ADMIN_KEY) {
    req.admin = { username: "admin-key", role: "admin" };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      if (decoded.role === "admin") {
        req.admin = decoded;
        return next();
      }
    } catch {
      /* fall through */
    }
  }

  return res.status(403).json({ error: "Admin authentication required" });
}

function adminLogin(username, password) {
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return { success: false, error: "Invalid admin credentials" };
  }
  const token = jwt.sign({ username, role: "admin" }, JWT_SECRET, { expiresIn: "8h" });
  return { success: true, token, user: { username, role: "admin" } };
}

module.exports = { requireAdmin, adminLogin, ADMIN_KEY };
