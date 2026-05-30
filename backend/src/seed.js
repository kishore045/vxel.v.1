const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const { db, migrate } = require("./db");

function insertUser({ id, name, email, password, role, clientId = null }) {
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return exists.id;
  const passwordHash = bcrypt.hashSync(password, 12);
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, client_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, email, passwordHash, role, clientId);
  return id;
}

function seed() {
  migrate();

  db.prepare("INSERT OR IGNORE INTO clients (id, name, status) VALUES (?, ?, ?)").run("client_uro", "URO Mobiles", "active");
  db.prepare("INSERT OR IGNORE INTO clients (id, name, status) VALUES (?, ?, ?)").run("client_tvs", "TVS Sivagangai", "active");

  const adminId = insertUser({
    id: "usr_admin",
    name: "Vixelry Admin",
    email: "admin@vixelry.com",
    password: "Admin@123",
    role: "admin"
  });

  const clientUserId = insertUser({
    id: "usr_client",
    name: "Client User",
    email: "client@vixelry.com",
    password: "Client@123",
    role: "client",
    clientId: "client_uro"
  });

  db.prepare("UPDATE clients SET owner_user_id = ? WHERE id = ?").run(clientUserId, "client_uro");

  const projectRows = [
    ["prj_uro_dm", "client_uro", "URO Mobiles Digital Marketing", "In Progress", 68],
    ["prj_tvs_campaign", "client_tvs", "TVS Sivagangai Campaign", "Review", 82]
  ];
  projectRows.forEach((row) => {
    db.prepare("INSERT OR IGNORE INTO projects (id, client_id, name, status, progress) VALUES (?, ?, ?, ?, ?)").run(...row);
  });

  db.prepare("INSERT OR IGNORE INTO reports (id, client_id, project_id, title, type) VALUES (?, ?, ?, ?, ?)").run("rep_uro_may", "client_uro", "prj_uro_dm", "May Campaign Performance", "PDF");
  db.prepare("INSERT OR IGNORE INTO reports (id, client_id, project_id, title, type) VALUES (?, ?, ?, ?, ?)").run("rep_tvs_seo", "client_tvs", "prj_tvs_campaign", "SEO Visibility Report", "PDF");
  db.prepare("INSERT OR IGNORE INTO invoices (id, client_id, invoice_number, amount, status) VALUES (?, ?, ?, ?, ?)").run("inv_uro_001", "client_uro", "VIX-001", 25000, "paid");
  db.prepare("INSERT OR IGNORE INTO invoices (id, client_id, invoice_number, amount, status) VALUES (?, ?, ?, ?, ?)").run("inv_tvs_001", "client_tvs", "VIX-002", 18000, "pending");
  db.prepare("INSERT OR IGNORE INTO tickets (id, client_id, created_by, subject, status) VALUES (?, ?, ?, ?, ?)").run("tic_uro_001", "client_uro", clientUserId, "Landing page image update", "open");
  db.prepare("INSERT OR IGNORE INTO notifications (id, role, message) VALUES (?, ?, ?)").run("not_admin_001", "admin", "New lead assigned to Ads Manager.");
  db.prepare("INSERT OR IGNORE INTO notifications (id, role, client_id, message) VALUES (?, ?, ?, ?)").run("not_client_001", "client", "client_uro", "Your weekly analytics report is ready.");
  db.prepare("INSERT OR IGNORE INTO documents (id, client_id, uploaded_by, title, file_url) VALUES (?, ?, ?, ?, ?)").run("doc_uro_brand", "client_uro", adminId, "Brand Assets", "#");

  console.log("Vixelry CRM database seeded.");
}

seed();
