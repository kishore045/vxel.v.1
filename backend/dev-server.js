const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4000);
const DB_FILE = process.env.CRM_DB_FILE || path.join(__dirname, "..", "database", "crm-data.json");
const APP_ROOT = path.join(__dirname, "..");

const users = [
  {
    id: "usr_admin",
    name: "Vixelry Admin",
    email: "admin@vixelry.com",
    password: "Admin@123",
    role: "admin",
    clientId: null
  },
  {
    id: "usr_client",
    name: "Client User",
    email: "client@vixelry.com",
    password: "Client@123",
    role: "client",
    clientId: "client_uro"
  }
];

const clients = [
  {
    id: "client_uro",
    name: "URO Mobiles",
    owner_user_id: "usr_client",
    status: "active",
    phone: "+91 98765 43210",
    email: "hello@uromobiles.com",
    plan: "Premium",
    join_date: "2026-05-01",
    created_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-05-30T09:00:00.000Z"
  },
  {
    id: "client_tvs",
    name: "TVS Sivagangai",
    owner_user_id: "usr_admin",
    status: "onboarding",
    phone: "+91 91234 56780",
    email: "marketing@tvssivagangai.com",
    plan: "Growth",
    join_date: "2026-05-12",
    created_at: "2026-05-12T09:30:00.000Z",
    updated_at: "2026-05-29T10:30:00.000Z"
  }
];

const projects = [
  { id: "prj_uro_dm", client_id: "client_uro", name: "URO Mobiles Digital Marketing", service_type: "Digital Marketing", manager: "Aarav", priority: "High", budget: 150000, start_date: "2026-05-01", end_date: "2026-06-15", status: "active", team: { seo: "Meera", ads: "Kavin", content: "Nila", designer: "Riya", developer: "Dev" }, files: ["Campaign brief.pdf"], notes: ["Weekly optimization is active."], milestones: ["Kickoff", "Creative approval", "Campaign optimization"], created_at: "2026-05-01T08:30:00.000Z", updated_at: "2026-05-30T09:00:00.000Z" },
  { id: "prj_uro_ads", client_id: "client_uro", name: "URO Meta Ads Sprint", service_type: "Meta Ads", manager: "Aarav", priority: "Medium", budget: 85000, start_date: "2026-05-10", end_date: "2026-05-30", status: "completed", team: { seo: "", ads: "Kavin", content: "Nila", designer: "Riya", developer: "" }, files: ["Ad creatives.zip"], notes: ["Sprint completed."], milestones: ["Setup", "Launch", "Final report"], created_at: "2026-05-10T08:30:00.000Z", updated_at: "2026-05-30T11:00:00.000Z" },
  { id: "prj_tvs_campaign", client_id: "client_tvs", name: "TVS Sivagangai Campaign", service_type: "Google Ads", manager: "Ishaan", priority: "High", budget: 120000, start_date: "2026-05-12", end_date: "2026-06-20", status: "review", team: { seo: "", ads: "Ishaan", content: "Nila", designer: "Riya", developer: "" }, files: ["Keyword plan.xlsx"], notes: ["Awaiting review on search terms."], milestones: ["Keyword plan", "Campaign draft", "Review"], created_at: "2026-05-12T10:00:00.000Z", updated_at: "2026-05-29T10:30:00.000Z" },
  { id: "prj_tvs_seo", client_id: "client_tvs", name: "TVS SEO Setup", service_type: "SEO", manager: "Meera", priority: "Low", budget: 60000, start_date: "2026-05-18", end_date: "2026-06-30", status: "onboarding", team: { seo: "Meera", ads: "", content: "Nila", designer: "", developer: "Dev" }, files: [], notes: ["Technical audit started."], milestones: ["Audit", "Fixes", "Content plan"], created_at: "2026-05-18T09:00:00.000Z", updated_at: "2026-05-28T13:00:00.000Z" }
];

const tasks = [
  { id: "task_uro_1", project_id: "prj_uro_dm", name: "Audience research", assignee: "Kavin", due_at: "2026-05-08", status: "completed", updated_at: "2026-05-08T10:00:00.000Z" },
  { id: "task_uro_2", project_id: "prj_uro_dm", name: "Landing page content", assignee: "Nila", due_at: "2026-05-18", status: "completed", updated_at: "2026-05-18T10:00:00.000Z" },
  { id: "task_uro_3", project_id: "prj_uro_dm", name: "Campaign optimization", assignee: "Kavin", due_at: "2026-06-05", status: "in progress", updated_at: "2026-05-30T09:00:00.000Z" },
  { id: "task_uro_ads_1", project_id: "prj_uro_ads", name: "Final performance report", assignee: "Aarav", due_at: "2026-05-30", status: "completed", updated_at: "2026-05-30T11:00:00.000Z" },
  { id: "task_tvs_1", project_id: "prj_tvs_campaign", name: "Campaign structure review", assignee: "Ishaan", due_at: "2026-06-01", status: "review", updated_at: "2026-05-29T10:30:00.000Z" },
  { id: "task_tvs_2", project_id: "prj_tvs_seo", name: "Technical SEO audit", assignee: "Meera", due_at: "2026-06-04", status: "in progress", updated_at: "2026-05-28T13:00:00.000Z" }
];

const reports = [
  { id: "rep_uro_may", client_id: "client_uro", project_id: "prj_uro_dm", title: "May Campaign Performance", type: "PDF", created_at: "2026-05-30" },
  { id: "rep_tvs_seo", client_id: "client_tvs", project_id: "prj_tvs_campaign", title: "SEO Visibility Report", type: "PDF", created_at: "2026-05-30" }
];

const invoices = [
  { id: "inv_uro_001", client_id: "client_uro", project_id: "prj_uro_dm", invoice_number: "VIX-001", amount: 75000, paid_amount: 75000, payment_status: "paid", status: "paid", issued_at: "2026-05-05", due_at: "2026-05-15" },
  { id: "inv_uro_002", client_id: "client_uro", project_id: "prj_uro_ads", invoice_number: "VIX-002", amount: 85000, paid_amount: 85000, payment_status: "paid", status: "paid", issued_at: "2026-05-18", due_at: "2026-05-28" },
  { id: "inv_tvs_001", client_id: "client_tvs", project_id: "prj_tvs_campaign", invoice_number: "VIX-003", amount: 60000, paid_amount: 0, payment_status: "pending", status: "pending", issued_at: "2026-05-16", due_at: "2026-06-02" },
  { id: "inv_tvs_002", client_id: "client_tvs", project_id: "prj_tvs_seo", invoice_number: "VIX-004", amount: 30000, paid_amount: 10000, payment_status: "partial", status: "partial", issued_at: "2026-05-22", due_at: "2026-06-05" }
];

const leads = [
  { id: "lead_uro_001", client_id: "client_uro", name: "Walk-in campaign lead", status: "qualified", created_at: "2026-05-24T12:00:00.000Z" },
  { id: "lead_uro_002", client_id: "client_uro", name: "Instagram inquiry", status: "new", created_at: "2026-05-28T15:00:00.000Z" },
  { id: "lead_tvs_001", client_id: "client_tvs", name: "Service booking lead", status: "qualified", created_at: "2026-05-25T13:00:00.000Z" }
];

const expenses = [
  { id: "exp_001", client_id: "client_uro", project_id: "prj_uro_ads", category: "Facebook Ads", title: "Meta Ads Campaign", amount: 35000, spent_at: "2026-05-08" },
  { id: "exp_002", client_id: "client_tvs", project_id: "prj_tvs_campaign", category: "Google Ads", title: "Search Ads Spend", amount: 28000, spent_at: "2026-05-12" },
  { id: "exp_003", category: "Salary", title: "Creative Team Salary", amount: 120000, spent_at: "2026-05-28" },
  { id: "exp_004", category: "Office Rent", title: "Studio Rent", amount: 30000, spent_at: "2026-05-01" },
  { id: "exp_005", category: "Software Tools", title: "Design and automation tools", amount: 18000, spent_at: "2026-05-03" },
  { id: "exp_006", category: "Internet", title: "Office Internet", amount: 3500, spent_at: "2026-05-06" }
];

const employees = [
  { id: "emp_001", name: "Aarav", role: "Project Manager", salary: 45000, paid: true },
  { id: "emp_002", name: "Meera", role: "SEO Specialist", salary: 35000, paid: true },
  { id: "emp_003", name: "Kavin", role: "Ads Specialist", salary: 40000, paid: true },
  { id: "emp_004", name: "Nila", role: "Content Writer", salary: 30000, paid: false },
  { id: "emp_005", name: "Riya", role: "Designer", salary: 32000, paid: false },
  { id: "emp_006", name: "Dev", role: "Developer", salary: 50000, paid: true }
];

const tickets = [
  { id: "tic_uro_001", client_id: "client_uro", created_by: "usr_client", subject: "Landing page image update", status: "open", created_at: "2026-05-30" }
];

const documents = [
  { id: "doc_uro_brand", client_id: "client_uro", uploaded_by: "usr_admin", title: "Brand Assets", file_url: "#", created_at: "2026-05-30" }
];

const notifications = [
  { id: "not_admin_001", role: "admin", message: "New lead assigned to Ads Manager.", created_at: "2026-05-30" },
  { id: "not_client_001", role: "client", client_id: "client_uro", message: "Your weekly analytics report is ready.", created_at: "2026-05-30" }
];

const socialWorkspaces = [];
const socialAccounts = [];
const contentPosts = [];
const socialCampaigns = [];
const socialAssets = [];
const socialReports = [];

const dbTables = { users, clients, projects, tasks, reports, invoices, leads, expenses, employees, tickets, documents, notifications, socialWorkspaces, socialAccounts, contentPosts, socialCampaigns, socialAssets, socialReports };
const sampleIds = {
  clients: new Set(["client_uro", "client_tvs"]),
  projects: new Set(["prj_uro_dm", "prj_uro_ads", "prj_tvs_campaign", "prj_tvs_seo"]),
  tasks: new Set(["task_uro_1", "task_uro_2", "task_uro_3", "task_uro_ads_1", "task_tvs_1", "task_tvs_2"]),
  reports: new Set(["rep_uro_may", "rep_tvs_seo"]),
  invoices: new Set(["inv_uro_001", "inv_uro_002", "inv_tvs_001", "inv_tvs_002"]),
  leads: new Set(["lead_uro_001", "lead_uro_002", "lead_tvs_001"]),
  expenses: new Set(["exp_001", "exp_002", "exp_003", "exp_004", "exp_005", "exp_006"]),
  employees: new Set(["emp_001", "emp_002", "emp_003", "emp_004", "emp_005", "emp_006"]),
  tickets: new Set(["tic_uro_001"]),
  documents: new Set(["doc_uro_brand"]),
  notifications: new Set(["not_admin_001", "not_client_001"])
};

function replaceRows(target, rows) {
  target.splice(0, target.length, ...(Array.isArray(rows) ? rows : []));
}

function saveDb() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(dbTables, null, 2));
}

function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    Object.entries(dbTables).forEach(([key, rows]) => {
      if (key !== "users") replaceRows(rows, []);
    });
    saveDb();
    return;
  }
  const saved = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  Object.entries(dbTables).forEach(([key, rows]) => {
    if (Array.isArray(saved[key])) replaceRows(rows, saved[key]);
  });
  if (process.env.KEEP_SAMPLE_DATA !== "true") {
    let changed = false;
    Object.entries(sampleIds).forEach(([key, ids]) => {
      const rows = dbTables[key];
      const filtered = rows.filter((row) => !ids.has(row.id));
      if (filtered.length !== rows.length) {
        replaceRows(rows, filtered);
        changed = true;
      }
    });
    if (changed) saveDb();
  }
}

function nextInvoiceNumber() {
  const next = invoices.reduce((max, invoice) => {
    const match = String(invoice.invoice_number || "").match(/VIX-(\d+)/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  return `VIX-${String(next).padStart(3, "0")}`;
}

loadDb();

function ensureSocialWorkspace(client) {
  if (!client || socialWorkspaces.some((workspace) => workspace.client_id === client.id)) return;
  socialWorkspaces.unshift({
    id: `soc_${client.id}`,
    client_id: client.id,
    brand_name: client.name,
    brand_colors: "#6abf40, #ff6b00",
    guidelines: "",
    social_links: {},
    competitors: [],
    created_at: new Date().toISOString()
  });
}

function socialWorkspaceData() {
  clients.forEach(ensureSocialWorkspace);
  const posts = contentPosts.map((post) => ({
    ...post,
    client_name: clients.find((client) => client.id === post.client_id)?.name || post.client_id,
    project_name: projects.find((project) => project.id === post.project_id)?.name || post.project_id || "-"
  }));
  const campaigns = socialCampaigns.map((campaign) => ({
    ...campaign,
    client_name: clients.find((client) => client.id === campaign.client_id)?.name || campaign.client_id
  }));
  const publishedPosts = posts.filter((post) => normalizeStatus(post.status) === "published");
  const engagementTotal = publishedPosts.reduce((sum, post) => sum + Number(post.engagement || 0), 0);
  const reach = publishedPosts.reduce((sum, post) => sum + Number(post.reach || 0), 0);
  const followersGrowth = publishedPosts.reduce((sum, post) => sum + Number(post.followers_growth || 0), 0);
  return {
    summary: {
      socialClients: socialWorkspaces.length,
      connectedAccounts: socialAccounts.length,
      scheduledPosts: posts.filter((post) => normalizeStatus(post.status) === "scheduled").length,
      publishedPosts: publishedPosts.length,
      engagementRate: publishedPosts.length ? Math.round(engagementTotal / publishedPosts.length) : 0,
      reach,
      followersGrowth,
      pendingApprovals: posts.filter((post) => normalizeStatus(post.status) === "client approval").length
    },
    workspaces: socialWorkspaces.map((workspace) => ({
      ...workspace,
      client_name: clients.find((client) => client.id === workspace.client_id)?.name || workspace.client_id,
      accounts: socialAccounts.filter((account) => account.client_id === workspace.client_id),
      posts_count: posts.filter((post) => post.client_id === workspace.client_id).length
    })),
    accounts: socialAccounts,
    posts,
    campaigns,
    assets: socialAssets,
    reports: socialReports,
    notifications: notifications.filter((item) => item.message.toLowerCase().includes("content") || item.message.toLowerCase().includes("social"))
  };
}

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
  });
  res.end(JSON.stringify(data));
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
    ".mp4": "video/mp4"
  }[ext] || "application/octet-stream";
}

function serveStatic(res, pathname) {
  const cleanPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const target = path.normalize(path.join(APP_ROOT, cleanPath));
  if (!target.startsWith(APP_ROOT)) return send(res, 403, { error: "Forbidden." });
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return send(res, 404, { error: "File not found." });
  res.writeHead(200, { "Content-Type": contentType(target) });
  fs.createReadStream(target).pipe(res);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clientId: user.clientId
  };
}

function userFromRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const id = token.startsWith("dev-token-") ? token.replace("dev-token-", "") : "";
  return users.find((user) => user.id === id);
}

function scoped(user, rows) {
  if (user.role === "admin") return rows;
  return rows.filter((row) => row.client_id === user.clientId);
}

function readJson(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function invoicePendingAmount(invoice) {
  return Math.max(0, Number(invoice.amount || 0) - Number(invoice.paid_amount || 0));
}

function effectiveInvoiceStatus(invoice) {
  const base = normalizeStatus(invoice.payment_status || invoice.status);
  if (base === "paid" || invoicePendingAmount(invoice) <= 0) return "paid";

  const dueDate = invoice.due_at ? new Date(`${invoice.due_at}T23:59:59`) : null;
  if (dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < new Date()) return "overdue";

  if (["partial", "overdue"].includes(base)) return base;
  return "pending";
}

function clientProjects(clientId) {
  return projects.filter((project) => project.client_id === clientId);
}

function clientInvoices(clientId) {
  return invoices.filter((invoice) => invoice.client_id === clientId);
}

function clientLeads(clientId) {
  return leads.filter((lead) => lead.client_id === clientId);
}

function projectTasks(projectId) {
  return tasks.filter((task) => task.project_id === projectId);
}

function projectInvoices(projectId) {
  return invoices.filter((invoice) => invoice.project_id === projectId);
}

function latestDate(...values) {
  const times = values
    .flat()
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));
  return times.length ? Math.max(...times) : 0;
}

function relativeActivity(timestamp) {
  if (!timestamp) return "No activity";
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function computeClient(client) {
  const scopedProjects = clientProjects(client.id);
  const scopedInvoices = clientInvoices(client.id);
  const scopedLeads = clientLeads(client.id);
  const activeProjects = scopedProjects.filter((project) => ["active", "review", "onboarding"].includes(normalizeStatus(project.status))).length;
  const completedProjects = scopedProjects.filter((project) => normalizeStatus(project.status) === "completed").length;
  const paidAmount = scopedInvoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
  const pendingAmount = scopedInvoices.reduce((sum, invoice) => sum + invoicePendingAmount(invoice), 0);
  const totalRevenue = scopedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const lastInvoiceAt = latestDate(scopedInvoices.map((invoice) => invoice.issued_at || invoice.due_at));
  const lastActivityAt = latestDate(
    client.updated_at,
    scopedProjects.map((project) => project.updated_at || project.created_at),
    scopedInvoices.map((invoice) => invoice.issued_at || invoice.due_at),
    scopedLeads.map((lead) => lead.created_at)
  );

  return {
    ...client,
    total_projects: scopedProjects.length,
    projects_count: scopedProjects.length,
    active_projects: activeProjects,
    completed_projects: completedProjects,
    total_revenue: totalRevenue,
    revenue: paidAmount,
    paid_amount: paidAmount,
    pending_amount: pendingAmount,
    pending_invoices: scopedInvoices.filter((invoice) => normalizeStatus(invoice.payment_status) === "pending").length,
    leads_generated: scopedLeads.length,
    last_invoice_date: lastInvoiceAt ? new Date(lastInvoiceAt).toISOString() : null,
    last_activity_date: lastActivityAt ? new Date(lastActivityAt).toISOString() : null,
    last_activity: relativeActivity(lastActivityAt),
    last_activity_at: lastActivityAt,
    status_history: `${client.name} is currently ${client.status}.`,
    activities: [
      scopedProjects[0] ? `${scopedProjects[0].name} is ${scopedProjects[0].status}.` : null,
      scopedInvoices[0] ? `${scopedInvoices[0].invoice_number} is ${scopedInvoices[0].payment_status}.` : null,
      scopedLeads[0] ? `${scopedLeads.length} leads connected to this client.` : null
    ].filter(Boolean)
  };
}

function computeProject(project) {
  const client = clients.find((item) => item.id === project.client_id);
  const scopedTasks = projectTasks(project.id);
  const scopedInvoices = projectInvoices(project.id);
  const completedTasks = scopedTasks.filter((task) => normalizeStatus(task.status) === "completed").length;
  const progress = scopedTasks.length ? Math.round((completedTasks / scopedTasks.length) * 100) : 0;
  const amountInvoiced = scopedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const amountReceived = scopedInvoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
  const invoicePending = scopedInvoices.reduce((sum, invoice) => sum + invoicePendingAmount(invoice), 0);
  const budgetPending = Math.max(0, Number(project.budget || 0) - amountReceived);
  const pendingAmount = normalizeStatus(project.status) === "completed" ? budgetPending : invoicePending;
  const deadline = new Date(project.end_date);
  const today = new Date();
  const daysRemaining = Number.isNaN(deadline.getTime()) ? null : Math.ceil((deadline - today) / (24 * 60 * 60 * 1000));
  const taskActivities = scopedTasks
    .slice()
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    .slice(0, 3)
    .map((task) => `Task ${task.name} is ${task.status}.`);
  const invoiceActivities = scopedInvoices.slice(0, 2).map((invoice) => `Invoice ${invoice.invoice_number} is ${invoice.payment_status}.`);

  return {
    ...project,
    client_name: client?.name || project.client_id,
    tasks: scopedTasks,
    task_count: scopedTasks.length,
    completed_tasks: completedTasks,
    progress,
    amount_invoiced: amountInvoiced,
    revenue_generated: amountReceived,
    pending_amount: pendingAmount,
    invoice_pending_amount: invoicePending,
    budget_pending_amount: budgetPending,
    linked_invoices: scopedInvoices,
    days_remaining: daysRemaining,
    overdue: daysRemaining !== null && daysRemaining < 0 && normalizeStatus(project.status) !== "completed",
    timeline: [
      { label: "Start", date: project.start_date },
      ...(project.milestones || []).map((label) => ({ label, date: null })),
      { label: "Deadline", date: project.end_date }
    ],
    activities: [`Project ${project.name} is ${project.status}.`, ...taskActivities, ...invoiceActivities]
  };
}

function computedProjects(rows = projects) {
  return rows.map(computeProject);
}

function projectSummary(rows = computedProjects(projects)) {
  return {
    totalProjects: rows.length,
    activeProjects: rows.filter((project) => normalizeStatus(project.status) === "active").length,
    completedProjects: rows.filter((project) => normalizeStatus(project.status) === "completed").length,
    reviewProjects: rows.filter((project) => normalizeStatus(project.status) === "review").length,
    onboardingProjects: rows.filter((project) => normalizeStatus(project.status) === "onboarding").length,
    totalProjectValue: rows.reduce((sum, project) => sum + Number(project.budget || 0), 0),
    revenueGenerated: rows.reduce((sum, project) => sum + Number(project.revenue_generated || 0), 0),
    pendingRevenue: rows.reduce((sum, project) => sum + Number(project.pending_amount || 0), 0)
  };
}

function computedClients() {
  return clients.map(computeClient);
}

function financeSummary() {
  const collectedRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
  const totalRevenue = collectedRevenue;
  const pendingRevenue = invoices
    .filter((invoice) => ["pending", "partial", "overdue"].includes(effectiveInvoiceStatus(invoice)))
    .reduce((sum, invoice) => sum + invoicePendingAmount(invoice), 0);
  const overdueRevenue = invoices
    .filter((invoice) => effectiveInvoiceStatus(invoice) === "overdue")
    .reduce((sum, invoice) => sum + invoicePendingAmount(invoice), 0);
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = invoices
    .filter((invoice) => String(invoice.issued_at || "").startsWith(monthKey))
    .reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const salaryPaid = employees.filter((employee) => employee.paid).reduce((sum, employee) => sum + Number(employee.salary || 0), 0);
  const pendingSalary = employees.filter((employee) => !employee.paid).reduce((sum, employee) => sum + Number(employee.salary || 0), 0);
  const overdueInvoices = invoices.filter((invoice) => effectiveInvoiceStatus(invoice) === "overdue").length;
  const pendingPayments = invoices
    .filter((invoice) => ["pending", "partial", "overdue"].includes(effectiveInvoiceStatus(invoice)))
    .reduce((sum, invoice) => sum + invoicePendingAmount(invoice), 0);
  return {
    totalRevenue,
    collectedRevenue,
    pendingRevenue,
    overdueRevenue,
    monthlyRevenue,
    totalExpenses,
    netProfit: collectedRevenue - totalExpenses,
    overdueInvoices,
    pendingPayments,
    salaryPaid,
    pendingSalary,
    totalEmployees: employees.length
  };
}

function financeWorkspace() {
  const summary = financeSummary();
  const enrichedInvoices = invoices.map((invoice) => ({
    ...invoice,
    payment_status: effectiveInvoiceStatus(invoice),
    client_name: clients.find((client) => client.id === invoice.client_id)?.name || invoice.client_id,
    project_name: projects.find((project) => project.id === invoice.project_id)?.name || invoice.project_id,
    pending_amount: invoicePendingAmount(invoice)
  }));
  const enrichedExpenses = expenses.map((expense) => ({
    ...expense,
    client_name: expense.client_id ? clients.find((client) => client.id === expense.client_id)?.name || expense.client_id : "Agency",
    project_name: expense.project_id ? projects.find((project) => project.id === expense.project_id)?.name || expense.project_id : "-"
  }));
  const clientRevenue = computedClients()
    .map((client) => ({ client: client.name, amount: client.paid_amount }))
    .sort((a, b) => b.amount - a.amount);
  const expenseByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});
  const monthMap = {};
  invoices.forEach((invoice) => {
    const key = String(invoice.issued_at || "").slice(0, 7) || "Unknown";
    if (!monthMap[key]) monthMap[key] = { month: key, revenue: 0, expenses: 0, profit: 0 };
    monthMap[key].revenue += Number(invoice.paid_amount || 0);
  });
  expenses.forEach((expense) => {
    const key = String(expense.spent_at || "").slice(0, 7) || "Unknown";
    if (!monthMap[key]) monthMap[key] = { month: key, revenue: 0, expenses: 0, profit: 0 };
    monthMap[key].expenses += Number(expense.amount || 0);
  });
  Object.values(monthMap).forEach((row) => {
    row.profit = row.revenue - row.expenses;
  });
  return {
    summary,
    invoices: enrichedInvoices,
    pendingPayments: enrichedInvoices.filter((invoice) => ["pending", "partial", "overdue"].includes(effectiveInvoiceStatus(invoice))),
    expenses: enrichedExpenses,
    expenseByCategory,
    employees,
    clientRevenue,
    monthly: Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)),
    gst: gstSummary(enrichedInvoices),
    notifications: notifications.filter((notification) => notification.role === "admin" && notification.message.toLowerCase().includes("invoice"))
  };
}

function gstSummary(rows) {
  const taxable = rows.reduce((sum, invoice) => sum + Number(invoice.taxable_amount ?? invoice.amount ?? 0), 0);
  const gst = rows.reduce((sum, invoice) => sum + Number(invoice.gst_amount || 0), 0);
  return {
    taxable,
    cgst: gst / 2,
    sgst: gst / 2,
    totalGst: gst,
    invoiceTotal: taxable + gst
  };
}

function pushNotification(message, options = {}) {
  notifications.unshift({
    id: `not_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role: options.role || "admin",
    client_id: options.clientId || null,
    message,
    created_at: new Date().toISOString()
  });
}

function pushFinanceNotification(message) {
  pushNotification(message);
}

function clientNameById(clientId) {
  return clients.find((client) => client.id === clientId)?.name || clientId || "Client";
}

function projectNameById(projectId) {
  return projects.find((project) => project.id === projectId)?.name || projectId || "Project";
}

function generatedReports() {
  const monthLabels = ["Jan", "Feb", "Mar"];
  const byClient = computedClients().map((client) => ({
    id: `rep_revenue_${client.id}`,
    client_id: client.id,
    client_name: client.name,
    title: `Revenue Analysis - ${client.name}`,
    report_name: "Revenue Analysis",
    type: "Revenue",
    created_at: client.last_invoice_date || client.created_at,
    status: client.paid_amount > 0 ? "completed" : "pending",
    amount: client.paid_amount,
    details: {
      totalRevenue: client.paid_amount,
      adSpend: client.total_revenue ? Math.round(client.total_revenue * 0.18) : 0,
      profit: client.paid_amount - (client.total_revenue ? Math.round(client.total_revenue * 0.18) : 0),
      monthly: monthLabels.map((month, index) => ({ month, amount: Math.round((client.paid_amount || 0) * ([0.25, 0.34, 0.41][index])) }))
    }
  }));
  const pending = invoices
    .filter((invoice) => ["pending", "overdue", "partial"].includes(normalizeStatus(invoice.payment_status)))
    .map((invoice) => ({
      id: `rep_pending_${invoice.id}`,
      client_id: invoice.client_id,
      project_id: invoice.project_id,
      client_name: clients.find((client) => client.id === invoice.client_id)?.name || invoice.client_id,
      title: `Pending Invoice - ${invoice.invoice_number}`,
      report_name: "Pending Invoice",
      type: "Finance",
      created_at: invoice.issued_at,
      status: "pending",
      amount: invoicePendingAmount(invoice),
      details: {
        totalRevenue: Number(invoice.amount || 0),
        adSpend: 0,
        profit: Number(invoice.paid_amount || 0),
        monthly: [{ month: "Pending", amount: invoicePendingAmount(invoice) }]
      }
    }));
  const projectStatus = projects.map((project) => ({
    id: `rep_project_${project.id}`,
    client_id: project.client_id,
    project_id: project.id,
    client_name: clients.find((client) => client.id === project.client_id)?.name || project.client_id,
    title: `Project Review - ${project.name}`,
    report_name: "Project Review",
    type: "Review",
    created_at: project.updated_at || project.created_at,
    status: normalizeStatus(project.status) === "completed" ? "completed" : "pending",
    amount: computeProject(project).revenue_generated,
    details: {
      totalRevenue: computeProject(project).revenue_generated,
      adSpend: 0,
      profit: computeProject(project).revenue_generated,
      monthly: [{ month: toReportStatus(project.status), amount: computeProject(project).pending_amount }]
    }
  }));
  return [...byClient, ...pending, ...projectStatus];
}

function toReportStatus(status) {
  return String(status || "Status").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method === "GET" && url.pathname === "/api/health") {
    return send(res, 200, { ok: true, service: "Vixelry Dev API" });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(req);
    const user = users.find((item) => item.email === String(body.email || "").toLowerCase() && item.password === body.password);
    if (!user) return send(res, 401, { error: "Invalid email or password." });
    return send(res, 200, { token: `dev-token-${user.id}`, user: publicUser(user) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    const body = await readJson(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = body.role === "admin" ? "admin" : "client";
    if (name.length < 2) return send(res, 400, { error: "Name is required." });
    if (!email.includes("@")) return send(res, 400, { error: "Valid email is required." });
    if (password.length < 8) return send(res, 400, { error: "Password must be at least 8 characters." });
    if (role === "admin" && body.inviteCode !== "VIXELRY-ADMIN-2026") {
      return send(res, 403, { error: "Admin invite code required." });
    }
    if (users.some((item) => item.email === email)) return send(res, 409, { error: "Email already registered." });

    const id = `usr_${Date.now()}`;
    const clientId = role === "client" ? `client_${Date.now()}` : null;
    const newUser = { id, name, email, password, role, clientId };
    users.push(newUser);
    if (clientId) {
      clients.unshift({
        id: clientId,
        name,
        owner_user_id: id,
        status: "onboarding",
        phone: "",
        email,
        plan: "Starter",
        join_date: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    }
    saveDb();
    return send(res, 201, { token: `dev-token-${id}`, user: publicUser(newUser) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/forgot-password") {
    return send(res, 200, { message: "Reset token generated.", resetToken: "demo-reset-token-1234567890" });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
    return send(res, 200, { message: "Password updated." });
  }

  const user = userFromRequest(req);
  if (url.pathname.startsWith("/api/crm") && !user) {
    return send(res, 401, { error: "Authentication required." });
  }

  if (req.method === "GET" && url.pathname === "/api/crm/summary") {
    const userProjects = scoped(user, projects);
    const userInvoices = scoped(user, invoices);
    const userTickets = scoped(user, tickets);
    const userDocuments = scoped(user, documents);
    const finance = financeSummary();
    return send(res, 200, {
      clients: user.role === "admin" ? clients.length : 1,
      activeClients: user.role === "admin" ? clients.filter((client) => normalizeStatus(client.status) === "active").length : 1,
      onboardingClients: user.role === "admin" ? clients.filter((client) => normalizeStatus(client.status) === "onboarding").length : 0,
      projects: userProjects.length,
      activeProjects: userProjects.filter((project) => ["active", "review", "onboarding"].includes(normalizeStatus(project.status))).length,
      completedProjects: userProjects.filter((project) => normalizeStatus(project.status) === "completed").length,
      leads: user.role === "admin" ? leads.length : clientLeads(user.clientId).length,
      reports: generatedReports().filter((report) => user.role === "admin" || report.client_id === user.clientId).length,
      invoices: userInvoices.length,
      totalRevenue: user.role === "admin" ? finance.totalRevenue : clientInvoices(user.clientId).reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0),
      collectedRevenue: user.role === "admin" ? finance.collectedRevenue : clientInvoices(user.clientId).reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0),
      pendingRevenue: user.role === "admin" ? finance.pendingRevenue : clientInvoices(user.clientId).reduce((sum, invoice) => sum + invoicePendingAmount(invoice), 0),
      overdueRevenue: finance.overdueRevenue,
      monthlyRevenue: finance.monthlyRevenue,
      pendingInvoices: userInvoices.filter((invoice) => ["pending", "partial", "overdue"].includes(effectiveInvoiceStatus(invoice))).length,
      tickets: userTickets.length,
      documents: userDocuments.length
    });
  }

  if (req.method === "GET" && url.pathname === "/api/crm/clients") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    return send(res, 200, { clients: computedClients() });
  }

  if (req.method === "POST" && url.pathname === "/api/crm/clients") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const body = await readJson(req);
    const name = String(body.name || "").trim();
    const id = String(body.id || "").trim();
    if (name.length < 2) return send(res, 400, { error: "Client name is required." });
    if (id.length < 2) return send(res, 400, { error: "Client ID is required." });
    if (clients.some((client) => client.id === id)) return send(res, 409, { error: "Client ID already exists." });
    const client = {
      id,
      name,
      owner_user_id: String(body.owner || "").trim() || null,
      phone: String(body.phone || "").trim(),
      email: String(body.email || "").trim(),
      plan: body.plan || "Starter",
      status: body.status || "active",
      join_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    clients.unshift(client);
    ensureSocialWorkspace(client);
    pushNotification(`New client added: ${client.name}.`);
    saveDb();
    return send(res, 201, { client: computeClient(client) });
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/crm/clients/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const originalId = decodeURIComponent(url.pathname.split("/").pop());
    const client = clients.find((item) => item.id === originalId);
    if (!client) return send(res, 404, { error: "Client not found." });
    const body = await readJson(req);
    const nextId = String(body.id || "").trim();
    const nextName = String(body.name || "").trim();
    if (nextName.length < 2) return send(res, 400, { error: "Client name is required." });
    if (nextId.length < 2) return send(res, 400, { error: "Client ID is required." });
    if (nextId !== originalId && clients.some((item) => item.id === nextId)) {
      return send(res, 409, { error: "Client ID already exists." });
    }

    client.id = nextId;
    client.name = nextName;
    client.owner_user_id = String(body.owner || "").trim() || null;
    client.phone = String(body.phone || client.phone || "").trim();
    client.email = String(body.email || client.email || "").trim();
    client.plan = body.plan || client.plan || "Starter";
    client.status = body.status || "active";
    client.join_date = body.join_date || client.join_date || new Date().toISOString().slice(0, 10);
    client.updated_at = new Date().toISOString();

    projects.forEach((project) => {
      if (project.client_id === originalId) project.client_id = nextId;
    });
    reports.forEach((report) => {
      if (report.client_id === originalId) report.client_id = nextId;
    });
    invoices.forEach((invoice) => {
      if (invoice.client_id === originalId) invoice.client_id = nextId;
    });
    tickets.forEach((ticket) => {
      if (ticket.client_id === originalId) ticket.client_id = nextId;
    });
    documents.forEach((document) => {
      if (document.client_id === originalId) document.client_id = nextId;
    });
    notifications.forEach((notification) => {
      if (notification.client_id === originalId) notification.client_id = nextId;
    });

    pushNotification(`Client updated: ${client.name}.`);
    saveDb();
    return send(res, 200, { client: computeClient(client) });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/crm/clients/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const index = clients.findIndex((item) => item.id === id);
    if (index === -1) return send(res, 404, { error: "Client not found." });
    const [removedClient] = clients.splice(index, 1);
    for (let i = projects.length - 1; i >= 0; i -= 1) if (projects[i].client_id === id) projects.splice(i, 1);
    for (let i = invoices.length - 1; i >= 0; i -= 1) if (invoices[i].client_id === id) invoices.splice(i, 1);
    for (let i = leads.length - 1; i >= 0; i -= 1) if (leads[i].client_id === id) leads.splice(i, 1);
    for (let i = socialWorkspaces.length - 1; i >= 0; i -= 1) if (socialWorkspaces[i].client_id === id) socialWorkspaces.splice(i, 1);
    for (let i = socialAccounts.length - 1; i >= 0; i -= 1) if (socialAccounts[i].client_id === id) socialAccounts.splice(i, 1);
    for (let i = contentPosts.length - 1; i >= 0; i -= 1) if (contentPosts[i].client_id === id) contentPosts.splice(i, 1);
    for (let i = socialCampaigns.length - 1; i >= 0; i -= 1) if (socialCampaigns[i].client_id === id) socialCampaigns.splice(i, 1);
    pushNotification(`Client deleted: ${removedClient.name}.`);
    saveDb();
    return send(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/crm/projects") {
    return send(res, 200, { projects: computedProjects(scoped(user, projects)) });
  }

  if (req.method === "GET" && url.pathname === "/api/crm/social") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const payload = socialWorkspaceData();
    saveDb();
    return send(res, 200, payload);
  }

  if (req.method === "POST" && url.pathname === "/api/crm/social/accounts") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const body = await readJson(req);
    const clientId = String(body.clientId || body.client_id || "").trim();
    if (!clients.some((client) => client.id === clientId)) return send(res, 400, { error: "Valid client is required." });
    const account = {
      id: `acct_${Date.now()}`,
      client_id: clientId,
      platform: String(body.platform || "Instagram").trim(),
      handle: String(body.handle || "").trim(),
      status: normalizeStatus(body.status || "connected"),
      created_at: new Date().toISOString()
    };
    socialAccounts.unshift(account);
    pushNotification(`${account.platform} account connected for ${clientNameById(clientId)}.`);
    saveDb();
    return send(res, 201, { account });
  }

  if (req.method === "POST" && url.pathname === "/api/crm/social/posts") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const body = await readJson(req);
    const clientId = String(body.clientId || body.client_id || "").trim();
    if (!clients.some((client) => client.id === clientId)) return send(res, 400, { error: "Valid client is required." });
    const status = normalizeStatus(body.status || "idea");
    const post = {
      id: `post_${Date.now()}`,
      client_id: clientId,
      project_id: String(body.projectId || body.project_id || "").trim() || null,
      title: String(body.title || "Content item").trim(),
      caption: String(body.caption || "").trim(),
      platform: String(body.platform || "Instagram").trim(),
      post_type: String(body.postType || body.post_type || "Static Post").trim(),
      designer: String(body.designer || "").trim(),
      writer: String(body.writer || "").trim(),
      due_at: body.dueAt || body.due_at || null,
      scheduled_at: body.scheduledAt || body.scheduled_at || null,
      hashtags: String(body.hashtags || "").trim(),
      status,
      approval_comment: "",
      reach: Number(body.reach || 0),
      engagement: Number(body.engagement || 0),
      followers_growth: Number(body.followersGrowth || body.followers_growth || 0),
      history: [`Created as ${status}.`],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    contentPosts.unshift(post);
    pushNotification(`Social content created: ${post.title}.`);
    if (status === "client approval") pushNotification(`Approval pending for ${post.title}.`);
    saveDb();
    return send(res, 201, { post });
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/crm/social/posts/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const post = contentPosts.find((item) => item.id === id);
    if (!post) return send(res, 404, { error: "Post not found." });
    const body = await readJson(req);
    const nextStatus = normalizeStatus(body.status || post.status);
    post.title = String(body.title ?? post.title).trim();
    post.caption = String(body.caption ?? post.caption).trim();
    post.platform = String(body.platform ?? post.platform).trim();
    post.post_type = String(body.postType ?? body.post_type ?? post.post_type).trim();
    post.designer = String(body.designer ?? post.designer ?? "").trim();
    post.writer = String(body.writer ?? post.writer ?? "").trim();
    post.due_at = body.dueAt || body.due_at || post.due_at;
    post.scheduled_at = body.scheduledAt || body.scheduled_at || post.scheduled_at;
    post.hashtags = String(body.hashtags ?? post.hashtags ?? "").trim();
    post.approval_comment = String(body.comment || body.approval_comment || post.approval_comment || "").trim();
    if (nextStatus !== post.status) {
      post.history = [...(post.history || []), `Status changed from ${post.status} to ${nextStatus}.`];
      pushNotification(`Social content status changed to ${nextStatus}: ${post.title}.`);
      if (nextStatus === "scheduled") pushNotification(`Content approved and scheduled: ${post.title}.`);
      if (nextStatus === "published") pushNotification(`Post published: ${post.title}.`);
    }
    post.status = nextStatus;
    post.updated_at = new Date().toISOString();
    saveDb();
    return send(res, 200, { post });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/crm/social/posts/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const index = contentPosts.findIndex((post) => post.id === id);
    if (index === -1) return send(res, 404, { error: "Post not found." });
    const [removedPost] = contentPosts.splice(index, 1);
    pushNotification(`Social content deleted: ${removedPost.title}.`);
    saveDb();
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/crm/social/campaigns") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const body = await readJson(req);
    const campaign = {
      id: `camp_${Date.now()}`,
      client_id: String(body.clientId || body.client_id || "").trim(),
      name: String(body.name || "Social campaign").trim(),
      objective: String(body.objective || "").trim(),
      budget: Number(body.budget || 0),
      start_at: body.startAt || body.start_at || null,
      end_at: body.endAt || body.end_at || null,
      reach: Number(body.reach || 0),
      leads: Number(body.leads || 0),
      conversions: Number(body.conversions || 0)
    };
    if (!clients.some((client) => client.id === campaign.client_id)) return send(res, 400, { error: "Valid client is required." });
    socialCampaigns.unshift(campaign);
    pushNotification(`Social campaign created: ${campaign.name}.`);
    saveDb();
    return send(res, 201, { campaign });
  }

  if (req.method === "GET" && url.pathname === "/api/crm/projects/summary") {
    return send(res, 200, projectSummary(computedProjects(scoped(user, projects))));
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/crm/projects/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const project = computedProjects(scoped(user, projects)).find((item) => item.id === id);
    if (!project) return send(res, 404, { error: "Project not found." });
    return send(res, 200, { project });
  }

  if (req.method === "POST" && url.pathname === "/api/crm/projects") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const body = await readJson(req);
    const clientId = String(body.clientId || body.client_id || "").trim();
    if (!clients.some((client) => client.id === clientId)) return send(res, 400, { error: "Valid client is required." });
    const project = {
      id: String(body.id || `prj_${Date.now()}`).trim(),
      client_id: clientId,
      name: String(body.name || "New Project").trim(),
      service_type: String(body.serviceType || body.service_type || "General").trim(),
      manager: String(body.manager || "").trim(),
      priority: body.priority || "Medium",
      budget: Number(body.budget || 0),
      start_date: body.startDate || body.start_date || new Date().toISOString().slice(0, 10),
      end_date: body.endDate || body.end_date || null,
      status: normalizeStatus(body.status || "onboarding"),
      team: {
        seo: String(body.seo || "").trim(),
        ads: String(body.ads || "").trim(),
        content: String(body.content || "").trim(),
        designer: String(body.designer || "").trim(),
        developer: String(body.developer || "").trim()
      },
      files: [],
      notes: [],
      milestones: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    projects.unshift(project);
    const client = clients.find((item) => item.id === clientId);
    if (client) client.updated_at = new Date().toISOString();
    pushNotification(`Project created: ${project.name} for ${clientNameById(clientId)}.`);
    saveDb();
    return send(res, 201, { project });
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/crm/projects/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const project = projects.find((item) => item.id === id);
    if (!project) return send(res, 404, { error: "Project not found." });
    const body = await readJson(req);
    project.name = String(body.name || project.name).trim();
    project.service_type = String(body.serviceType || body.service_type || project.service_type).trim();
    project.manager = String(body.manager || project.manager || "").trim();
    project.priority = body.priority || project.priority || "Medium";
    project.budget = Number(body.budget ?? project.budget);
    project.start_date = body.startDate || body.start_date || project.start_date;
    project.end_date = body.endDate || body.end_date || project.end_date;
    const oldStatus = project.status;
    project.status = normalizeStatus(body.status || project.status);
    project.team = {
      seo: body.seo ?? project.team?.seo ?? "",
      ads: body.ads ?? project.team?.ads ?? "",
      content: body.content ?? project.team?.content ?? "",
      designer: body.designer ?? project.team?.designer ?? "",
      developer: body.developer ?? project.team?.developer ?? ""
    };
    project.updated_at = new Date().toISOString();
    const client = clients.find((item) => item.id === project.client_id);
    if (client) client.updated_at = project.updated_at;
    pushNotification(oldStatus !== project.status
      ? `Project status changed: ${project.name} is now ${project.status}.`
      : `Project updated: ${project.name}.`);
    saveDb();
    return send(res, 200, { project });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/crm/projects/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) return send(res, 404, { error: "Project not found." });
    const [removed] = projects.splice(index, 1);
    for (let i = tasks.length - 1; i >= 0; i -= 1) if (tasks[i].project_id === id) tasks.splice(i, 1);
    for (let i = invoices.length - 1; i >= 0; i -= 1) if (invoices[i].project_id === id) invoices.splice(i, 1);
    for (let i = reports.length - 1; i >= 0; i -= 1) if (reports[i].project_id === id) reports.splice(i, 1);
    for (let i = contentPosts.length - 1; i >= 0; i -= 1) if (contentPosts[i].project_id === id) contentPosts.splice(i, 1);
    for (let i = socialCampaigns.length - 1; i >= 0; i -= 1) if (socialCampaigns[i].project_id === id) socialCampaigns.splice(i, 1);
    const client = clients.find((item) => item.id === removed.client_id);
    if (client) client.updated_at = new Date().toISOString();
    pushNotification(`Project removed: ${removed.name}.`);
    saveDb();
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/crm/tasks") {
    const body = await readJson(req);
    const projectId = String(body.projectId || body.project_id || "").trim();
    const project = projects.find((item) => item.id === projectId);
    if (!project) return send(res, 400, { error: "Valid project is required." });
    const task = {
      id: String(body.id || `task_${Date.now()}`).trim(),
      project_id: projectId,
      name: String(body.name || body.title || "New Task").trim(),
      assignee: String(body.assignee || "").trim(),
      due_at: body.dueAt || body.due_at || null,
      status: normalizeStatus(body.status || "pending"),
      updated_at: new Date().toISOString()
    };
    tasks.unshift(task);
    project.updated_at = new Date().toISOString();
    pushNotification(`Task added: ${task.name} in ${project.name}.`);
    saveDb();
    return send(res, 201, { task, project: computeProject(project) });
  }

  if (req.method === "GET" && url.pathname === "/api/crm/reports") {
    const rows = generatedReports().filter((report) => user.role === "admin" || report.client_id === user.clientId);
    return send(res, 200, { reports: rows });
  }
  if (req.method === "GET" && url.pathname === "/api/crm/invoices") return send(res, 200, { invoices: scoped(user, invoices) });
  if (req.method === "GET" && url.pathname === "/api/crm/finance") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    return send(res, 200, financeWorkspace());
  }
  if (req.method === "POST" && url.pathname === "/api/crm/invoices") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const body = await readJson(req);
    const clientId = String(body.clientId || body.client_id || "").trim();
    const projectId = String(body.projectId || body.project_id || "").trim();
    if (!clients.some((client) => client.id === clientId)) return send(res, 400, { error: "Valid client is required." });
    if (!projects.some((project) => project.id === projectId && project.client_id === clientId)) return send(res, 400, { error: "Valid project is required." });
    const amount = Number(body.amount || 0);
    const quantity = Number(body.quantity || 1);
    const price = Number(body.price || amount);
    const gstPercent = Number(body.gstPercent || body.gst_percentage || 18);
    const gstAmount = Math.round((amount * gstPercent) / 100);
    const paidAmount = Number(body.paidAmount || body.paid_amount || 0);
    const invoice = {
      id: String(body.id || `inv_${Date.now()}`).trim(),
      client_id: clientId,
      project_id: projectId,
      invoice_number: nextInvoiceNumber(),
      amount,
      item_name: String(body.itemName || body.item_name || "Digital marketing service").trim(),
      description: String(body.description || body.notes || "").trim(),
      quantity,
      price,
      taxable_amount: amount,
      gst_percentage: gstPercent,
      gst_amount: gstAmount,
      total_amount: amount + gstAmount,
      paid_amount: paidAmount,
      payment_status: normalizeStatus(body.paymentStatus || body.payment_status || "pending"),
      status: normalizeStatus(body.paymentStatus || body.payment_status || "pending"),
      issued_at: body.issuedAt || body.issued_at || new Date().toISOString().slice(0, 10),
      due_at: body.dueAt || body.due_at || null,
      notes: body.notes || ""
    };
    invoices.unshift(invoice);
    const client = clients.find((item) => item.id === clientId);
    if (client) client.updated_at = new Date().toISOString();
    pushFinanceNotification(`New invoice ${invoice.invoice_number} created.`);
    saveDb();
    return send(res, 201, { invoice });
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/crm/invoices/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) return send(res, 404, { error: "Invoice not found." });
    const body = await readJson(req);
    invoice.amount = Number(body.amount ?? invoice.amount);
    invoice.item_name = String(body.itemName ?? body.item_name ?? invoice.item_name ?? "Digital marketing service").trim();
    invoice.description = String(body.description ?? invoice.description ?? invoice.notes ?? "").trim();
    invoice.quantity = Number(body.quantity ?? invoice.quantity ?? 1);
    invoice.price = Number(body.price ?? invoice.price ?? invoice.amount);
    invoice.taxable_amount = Number(body.taxableAmount ?? body.taxable_amount ?? invoice.taxable_amount ?? invoice.amount);
    invoice.gst_percentage = Number(body.gstPercent ?? body.gst_percentage ?? invoice.gst_percentage ?? 18);
    invoice.gst_amount = Math.round((invoice.taxable_amount * invoice.gst_percentage) / 100);
    invoice.total_amount = invoice.taxable_amount + invoice.gst_amount;
    invoice.paid_amount = Number(body.paidAmount ?? body.paid_amount ?? invoice.paid_amount);
    invoice.payment_status = normalizeStatus(body.paymentStatus || body.payment_status || invoice.payment_status);
    if (invoice.payment_status === "paid") invoice.paid_amount = invoice.amount;
    invoice.status = invoice.payment_status;
    invoice.due_at = body.dueAt || body.due_at || invoice.due_at;
    invoice.notes = body.notes ?? invoice.notes ?? "";
    const client = clients.find((item) => item.id === invoice.client_id);
    if (client) client.updated_at = new Date().toISOString();
    if (invoice.payment_status === "paid") pushFinanceNotification(`Payment received for ${invoice.invoice_number}.`);
    else pushFinanceNotification(`Invoice ${invoice.invoice_number} updated to ${invoice.payment_status}.`);
    saveDb();
    return send(res, 200, { invoice });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/crm/invoices/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const index = invoices.findIndex((invoice) => invoice.id === id);
    if (index === -1) return send(res, 404, { error: "Invoice not found." });
    const [removed] = invoices.splice(index, 1);
    pushFinanceNotification(`Invoice ${removed.invoice_number} deleted.`);
    saveDb();
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/crm/expenses") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const body = await readJson(req);
    const clientId = String(body.clientId || body.client_id || "").trim();
    const projectId = String(body.projectId || body.project_id || "").trim();
    const expense = {
      id: `exp_${Date.now()}`,
      client_id: clientId || null,
      project_id: projectId || null,
      category: body.category || "Miscellaneous",
      title: String(body.title || "Expense").trim(),
      amount: Number(body.amount || 0),
      vendor: body.vendor || "",
      spent_at: body.date || body.spent_at || new Date().toISOString().slice(0, 10),
      notes: body.notes || ""
    };
    expenses.unshift(expense);
    pushFinanceNotification(`Expense added: ${expense.title}.`);
    saveDb();
    return send(res, 201, { expense });
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/crm/expenses/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const expense = expenses.find((item) => item.id === id);
    if (!expense) return send(res, 404, { error: "Expense not found." });
    const body = await readJson(req);
    expense.client_id = body.clientId ?? body.client_id ?? expense.client_id ?? null;
    expense.project_id = body.projectId ?? body.project_id ?? expense.project_id ?? null;
    expense.category = body.category ?? expense.category;
    expense.title = String(body.title ?? expense.title).trim();
    expense.amount = Number(body.amount ?? expense.amount);
    expense.vendor = body.vendor ?? expense.vendor ?? "";
    expense.spent_at = body.date || body.spent_at || expense.spent_at;
    expense.notes = body.notes ?? expense.notes ?? "";
    pushFinanceNotification(`Expense updated: ${expense.title}.`);
    saveDb();
    return send(res, 200, { expense });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/crm/expenses/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const index = expenses.findIndex((expense) => expense.id === id);
    if (index === -1) return send(res, 404, { error: "Expense not found." });
    const [removedExpense] = expenses.splice(index, 1);
    pushFinanceNotification(`Expense deleted: ${removedExpense.title}.`);
    saveDb();
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/crm/employees") {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const body = await readJson(req);
    const employee = {
      id: `emp_${Date.now()}`,
      name: String(body.name || "Employee").trim(),
      role: String(body.role || "Team Member").trim(),
      salary: Number(body.salary || 0),
      paid: String(body.paid || "false") === "true"
    };
    employees.unshift(employee);
    pushFinanceNotification(`Employee salary added for ${employee.name}.`);
    saveDb();
    return send(res, 201, { employee });
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/crm/employees/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const employee = employees.find((item) => item.id === id);
    if (!employee) return send(res, 404, { error: "Employee not found." });
    const body = await readJson(req);
    employee.name = String(body.name ?? employee.name).trim();
    employee.role = String(body.role ?? employee.role).trim();
    employee.salary = Number(body.salary ?? employee.salary);
    if (body.paid !== undefined) employee.paid = String(body.paid) === "true";
    pushFinanceNotification(`Employee salary updated for ${employee.name}.`);
    saveDb();
    return send(res, 200, { employee });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/crm/employees/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const index = employees.findIndex((employee) => employee.id === id);
    if (index === -1) return send(res, 404, { error: "Employee not found." });
    const [removedEmployee] = employees.splice(index, 1);
    for (let i = expenses.length - 1; i >= 0; i -= 1) {
      if (expenses[i].employee_id === removedEmployee.id) expenses.splice(i, 1);
    }
    pushFinanceNotification(`Employee salary deleted for ${removedEmployee.name}.`);
    saveDb();
    return send(res, 200, { ok: true });
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/crm/payroll/")) {
    if (user.role !== "admin") return send(res, 403, { error: "Forbidden." });
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const employee = employees.find((item) => item.id === id);
    if (!employee) return send(res, 404, { error: "Employee not found." });
    employee.paid = true;
    expenses.unshift({
      id: `exp_payroll_${Date.now()}`,
      employee_id: employee.id,
      category: "Salary",
      title: `${employee.name} salary`,
      amount: Number(employee.salary || 0),
      vendor: employee.name,
      spent_at: new Date().toISOString().slice(0, 10),
      notes: "Payroll processed"
    });
    pushFinanceNotification(`Salary paid for ${employee.name}.`);
    saveDb();
    return send(res, 200, { employee });
  }
  if (req.method === "GET" && url.pathname === "/api/crm/tickets") return send(res, 200, { tickets: scoped(user, tickets) });
  if (req.method === "GET" && url.pathname === "/api/crm/documents") return send(res, 200, { documents: scoped(user, documents) });

  if (req.method === "GET" && url.pathname === "/api/crm/notifications") {
    const rows = user.role === "admin"
      ? notifications.filter((item) => item.role === "admin")
      : notifications.filter((item) => item.role === "client" && item.client_id === user.clientId);
    return send(res, 200, { notifications: rows });
  }

  if (req.method === "POST" && url.pathname === "/api/crm/tickets") {
    const body = await readJson(req);
    const ticket = {
      id: `tic_${Date.now()}`,
      client_id: user.role === "admin" ? body.clientId || "client_uro" : user.clientId,
      created_by: user.id,
      subject: body.subject || "Support request",
      description: body.description || "",
      status: "open",
      created_at: new Date().toISOString()
    };
    tickets.unshift(ticket);
    pushNotification(`Support ticket created: ${ticket.subject}.`, { role: "admin", clientId: ticket.client_id });
    saveDb();
    return send(res, 201, { ticket });
  }

  if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
    return serveStatic(res, url.pathname);
  }

  send(res, 404, { error: "Route not found." });
});

server.listen(PORT, () => {
  console.log(`Vixelry test API running on http://localhost:${PORT}`);
  console.log("Open login.html and use admin@vixelry.com / Admin@123");
});
