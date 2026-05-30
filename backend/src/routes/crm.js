const express = require("express");
const { nanoid } = require("nanoid");
const { z } = require("zod");
const { db } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

function scopeWhere(req, tableAlias = "") {
  if (req.user.role === "admin") return { clause: "", params: [] };
  const prefix = tableAlias ? `${tableAlias}.` : "";
  return { clause: `WHERE ${prefix}client_id = ?`, params: [req.user.client_id] };
}

function allScoped(req, table) {
  const scope = scopeWhere(req);
  return db.prepare(`SELECT * FROM ${table} ${scope.clause} ORDER BY created_at DESC`).all(...scope.params);
}

router.get("/summary", (req, res) => {
  const clientFilter = req.user.role === "admin" ? "" : " WHERE client_id = ?";
  const params = req.user.role === "admin" ? [] : [req.user.client_id];
  const one = (sql) => db.prepare(sql).get(...params).count;
  res.json({
    clients: req.user.role === "admin" ? db.prepare("SELECT COUNT(*) count FROM clients").get().count : 1,
    projects: one(`SELECT COUNT(*) count FROM projects${clientFilter}`),
    leads: req.user.role === "admin" ? db.prepare("SELECT COUNT(*) count FROM leads").get().count : 0,
    reports: one(`SELECT COUNT(*) count FROM reports${clientFilter}`),
    invoices: one(`SELECT COUNT(*) count FROM invoices${clientFilter}`),
    tickets: one(`SELECT COUNT(*) count FROM tickets${clientFilter}`),
    documents: one(`SELECT COUNT(*) count FROM documents${clientFilter}`)
  });
});

router.get("/clients", requireRole("admin"), (req, res) => {
  res.json({ clients: db.prepare("SELECT * FROM clients ORDER BY created_at DESC").all() });
});

router.post("/clients", requireRole("admin"), (req, res) => {
  const schema = z.object({ name: z.string().min(2), status: z.string().default("active") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid client details." });
  const id = `client_${nanoid(10)}`;
  db.prepare("INSERT INTO clients (id, name, status) VALUES (?, ?, ?)").run(id, parsed.data.name, parsed.data.status);
  res.status(201).json({ client: db.prepare("SELECT * FROM clients WHERE id = ?").get(id) });
});

router.get("/projects", (req, res) => {
  res.json({ projects: allScoped(req, "projects") });
});

router.post("/projects", requireRole("admin"), (req, res) => {
  const schema = z.object({
    clientId: z.string().min(2),
    name: z.string().min(2),
    status: z.string().default("Planning"),
    progress: z.number().int().min(0).max(100).default(0)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid project details." });
  const id = `prj_${nanoid(10)}`;
  db.prepare("INSERT INTO projects (id, client_id, name, status, progress) VALUES (?, ?, ?, ?, ?)")
    .run(id, parsed.data.clientId, parsed.data.name, parsed.data.status, parsed.data.progress);
  res.status(201).json({ project: db.prepare("SELECT * FROM projects WHERE id = ?").get(id) });
});

router.get("/leads", requireRole("admin"), (req, res) => {
  res.json({ leads: db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all() });
});

router.post("/leads", requireRole("admin"), (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    source: z.string().optional(),
    status: z.string().default("new"),
    value: z.number().default(0),
    clientId: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid lead details." });
  const id = `lead_${nanoid(10)}`;
  db.prepare(`
    INSERT INTO leads (id, client_id, name, email, phone, source, status, value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, parsed.data.clientId || null, parsed.data.name, parsed.data.email || null, parsed.data.phone || null, parsed.data.source || null, parsed.data.status, parsed.data.value);
  res.status(201).json({ lead: db.prepare("SELECT * FROM leads WHERE id = ?").get(id) });
});

router.get("/tasks", (req, res) => {
  res.json({ tasks: allScoped(req, "tasks") });
});

router.post("/tasks", requireRole("admin"), (req, res) => {
  const schema = z.object({
    title: z.string().min(2),
    projectId: z.string().optional(),
    clientId: z.string().optional(),
    assignedTo: z.string().optional(),
    dueAt: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid task details." });
  const id = `task_${nanoid(10)}`;
  db.prepare("INSERT INTO tasks (id, project_id, client_id, assigned_to, title, due_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, parsed.data.projectId || null, parsed.data.clientId || null, parsed.data.assignedTo || null, parsed.data.title, parsed.data.dueAt || null);
  res.status(201).json({ task: db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) });
});

router.get("/reports", (req, res) => res.json({ reports: allScoped(req, "reports") }));
router.get("/invoices", (req, res) => res.json({ invoices: allScoped(req, "invoices") }));
router.get("/tickets", (req, res) => res.json({ tickets: allScoped(req, "tickets") }));
router.get("/documents", (req, res) => res.json({ documents: allScoped(req, "documents") }));

router.post("/tickets", (req, res) => {
  const schema = z.object({ subject: z.string().min(2), description: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid ticket details." });
  const id = `tic_${nanoid(10)}`;
  const clientId = req.user.role === "admin" ? req.body.clientId : req.user.client_id;
  db.prepare("INSERT INTO tickets (id, client_id, created_by, subject, description) VALUES (?, ?, ?, ?, ?)")
    .run(id, clientId, req.user.id, parsed.data.subject, parsed.data.description || null);
  res.status(201).json({ ticket: db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) });
});

router.post("/meetings", (req, res) => {
  const schema = z.object({ title: z.string().min(2), meetingAt: z.string().min(5), clientId: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid meeting details." });
  const clientId = req.user.role === "admin" ? parsed.data.clientId : req.user.client_id;
  if (!clientId) return res.status(400).json({ error: "Client is required." });
  const id = `meet_${nanoid(10)}`;
  db.prepare("INSERT INTO meetings (id, client_id, title, meeting_at, created_by) VALUES (?, ?, ?, ?, ?)")
    .run(id, clientId, parsed.data.title, parsed.data.meetingAt, req.user.id);
  res.status(201).json({ meeting: db.prepare("SELECT * FROM meetings WHERE id = ?").get(id) });
});

router.get("/notifications", (req, res) => {
  if (req.user.role === "admin") {
    return res.json({ notifications: db.prepare("SELECT * FROM notifications WHERE role = 'admin' ORDER BY created_at DESC").all() });
  }
  res.json({
    notifications: db.prepare("SELECT * FROM notifications WHERE role = 'client' AND client_id = ? ORDER BY created_at DESC").all(req.user.client_id)
  });
});

module.exports = router;
