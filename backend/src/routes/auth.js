const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const { z } = require("zod");
const { db } = require("../db");
const { jwtSecret, jwtExpiresIn } = require("../config");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "client"]).default("client"),
  inviteCode: z.string().optional()
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clientId: user.client_id || null
  };
}

function signUser(user) {
  return jwt.sign({ sub: user.id, role: user.role, clientId: user.client_id || null }, jwtSecret, { expiresIn: jwtExpiresIn });
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid registration details." });

  const input = parsed.data;
  if (input.role === "admin" && input.inviteCode !== "VIXELRY-ADMIN") {
    return res.status(403).json({ error: "Admin invite code required." });
  }

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(input.email.toLowerCase());
  if (exists) return res.status(409).json({ error: "Email already registered." });

  const clientId = input.role === "client" ? `client_${nanoid(10)}` : null;
  if (clientId) {
    db.prepare("INSERT INTO clients (id, name, status) VALUES (?, ?, ?)").run(clientId, input.name, "active");
  }

  const id = `usr_${nanoid(12)}`;
  const passwordHash = await bcrypt.hash(input.password, 12);
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, client_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, input.name, input.email.toLowerCase(), passwordHash, input.role, clientId);

  if (clientId) db.prepare("UPDATE clients SET owner_user_id = ? WHERE id = ?").run(id, clientId);

  const user = db.prepare("SELECT id, name, email, role, client_id FROM users WHERE id = ?").get(id);
  res.status(201).json({ user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid login details." });

  const user = db.prepare("SELECT * FROM users WHERE email = ? AND status = 'active'").get(parsed.data.email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid email or password." });

  const isValid = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!isValid) return res.status(401).json({ error: "Invalid email or password." });

  res.json({ token: signUser(user), user: publicUser(user) });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post("/forgot-password", (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email." });

  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(parsed.data.email.toLowerCase());
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    db.prepare("UPDATE users SET reset_token_hash = ?, reset_token_expires_at = ? WHERE id = ?").run(tokenHash, expiresAt, user.id);
    return res.json({ message: "Reset token generated.", resetToken: token });
  }

  res.json({ message: "If the email exists, reset instructions will be sent." });
});

router.post("/reset-password", async (req, res) => {
  const schema = z.object({ token: z.string().min(20), password: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid reset details." });

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const user = db.prepare("SELECT id, reset_token_expires_at FROM users WHERE reset_token_hash = ?").get(tokenHash);
  if (!user || new Date(user.reset_token_expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: "Reset token is invalid or expired." });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  db.prepare("UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id = ?").run(passwordHash, user.id);
  res.json({ message: "Password updated." });
});

module.exports = router;
