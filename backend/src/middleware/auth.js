const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
const { db } = require("../db");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Authentication required." });

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = db.prepare("SELECT id, name, email, role, client_id, status FROM users WHERE id = ?").get(payload.sub);
    if (!user || user.status !== "active") return res.status(401).json({ error: "Invalid session." });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session." });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: "Forbidden." });
    next();
  };
}

module.exports = { authenticate, requireRole };
