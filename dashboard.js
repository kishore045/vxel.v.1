const API_BASES = [
  window.VIXELRY_API_BASE,
  location.protocol.startsWith("http") ? `${location.origin}/api` : "",
  "http://localhost:4000/api",
  "http://127.0.0.1:4000/api"
].filter(Boolean);
const TOKEN_KEY = "vixelry_api_token";
const USER_KEY = "vixelry_api_user";

const token = localStorage.getItem(TOKEN_KEY);
const storedUser = JSON.parse(localStorage.getItem(USER_KEY) || "null");
const requiredRole = document.body.dataset.role;
let currentClientRows = [];
let selectedClientIds = new Set();
let clientFilters = { status: "all", owner: "all", sort: "newest" };
let activeDrawerClientId = null;
let currentProjectRows = [];
let projectFilters = { client: "all", status: "all", service: "all", manager: "all" };
let activeProjectId = null;
let currentFinanceData = null;
let currentSocialData = null;
let currentReportRows = [];
let activeReportId = null;
let actionFeedbackTimer = null;

function setPageLoading(isLoading, text = "Loading data...") {
  let overlay = document.querySelector("[data-page-loader]");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "app-loader";
    overlay.dataset.pageLoader = "true";
    overlay.innerHTML = `<div class="loader-dots" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div><strong data-loader-text>Loading...</strong>`;
    document.body.appendChild(overlay);
  }
  overlay.querySelector("[data-loader-text]").textContent = text;
  overlay.classList.toggle("is-visible", isLoading);
}

function actionMessage(method, path) {
  if (path.includes("/invoices")) return method === "DELETE" ? "Invoice deleted successfully." : "Invoice saved successfully.";
  if (path.includes("/projects")) return "Project updated successfully.";
  if (path.includes("/clients")) return method === "DELETE" ? "Client deleted successfully." : "Client saved successfully.";
  if (path.includes("/expenses")) return method === "DELETE" ? "Expense deleted successfully." : "Expense saved successfully.";
  if (path.includes("/social/posts")) return method === "DELETE" ? "Content deleted successfully." : "Content workflow updated.";
  if (path.includes("/social/accounts")) return "Social account connected successfully.";
  if (path.includes("/social/campaigns")) return "Campaign saved successfully.";
  if (path.includes("/employees") || path.includes("/payroll")) return "Salary record updated successfully.";
  if (path.includes("/tasks")) return "Task saved successfully.";
  if (path.includes("/tickets")) return "Ticket created successfully.";
  return "Action completed successfully.";
}

async function showActionFeedback(message = "Action completed successfully.") {
  let overlay = document.querySelector("[data-action-feedback]");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "action-feedback";
    overlay.dataset.actionFeedback = "true";
    overlay.innerHTML = `<div class="loader-dots" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div><div class="action-toast" data-action-toast></div>`;
    document.body.appendChild(overlay);
  }
  clearTimeout(actionFeedbackTimer);
  overlay.querySelector("[data-action-toast]").textContent = message;
  overlay.classList.remove("show-toast");
  overlay.classList.add("is-visible");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  overlay.classList.remove("is-visible");
  overlay.classList.add("show-toast");
  actionFeedbackTimer = setTimeout(() => overlay.classList.remove("show-toast"), 5000);
}

if (!token || !storedUser) {
  location.href = "login.html";
}

if (storedUser && requiredRole && storedUser.role !== requiredRole) {
  location.href = storedUser.role === "admin" ? "admin-dashboard.html" : "client-dashboard.html";
}

async function apiGet(path) {
  let lastError;
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        location.href = "login.html";
        throw new Error("Unauthorized");
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Request failed.");
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Request failed.");
}

async function apiPost(path, body, options = {}) {
  let lastError;
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Request failed.");
      if (options.feedback !== false) await showActionFeedback(actionMessage("POST", path));
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Request failed.");
}

async function apiPut(path, body, options = {}) {
  let lastError;
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Request failed.");
      if (options.feedback !== false) await showActionFeedback(actionMessage("PUT", path));
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Request failed.");
}

async function apiDelete(path, options = {}) {
  let lastError;
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Request failed.");
      if (options.feedback !== false) await showActionFeedback(actionMessage("DELETE", path));
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Request failed.");
}

function renderUser() {
  document.querySelectorAll("[data-user-name]").forEach((item) => {
    if (item.tagName === "INPUT") item.value = storedUser?.name || "";
    else item.textContent = storedUser?.name || "Vixelry User";
  });
  document.querySelectorAll("[data-user-initials]").forEach((item) => {
    item.textContent = getInitials(storedUser?.name || "Vixelry User");
  });
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "VU";
}

function renderStats(summary) {
  const stats = document.querySelector("[data-stats]");
  if (!stats) return;
  const roleStats = storedUser.role === "admin"
    ? [
      ["Clients", summary.clients, `${summary.activeClients ?? 0} active`],
      ["Projects", summary.projects, `${summary.activeProjects ?? 0} active`],
      ["Leads", summary.leads, "from leads table"],
      ["Revenue", formatCurrency(summary.collectedRevenue || 0), "paid invoices"]
    ]
    : [
      ["Projects", summary.projects, "assigned projects"],
      ["Reports", summary.reports, "ready to download"],
      ["Invoices", summary.invoices, "billing records"],
      ["Tickets", summary.tickets, "support requests"]
    ];

  stats.innerHTML = roleStats.map(([label, value, note]) => `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value ?? 0}</strong>
      <span>${note}</span>
    </article>
  `).join("");

  const health = document.querySelector("[data-dashboard-health]");
  if (health) {
    const healthCards = [
      ["Projects", summary.projects || 0],
      ["Invoices", summary.invoices || 0],
      ["Reports", summary.reports || 0],
      ["Tickets", summary.tickets || 0]
    ];
    health.innerHTML = healthCards.map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }
}

function renderTable(target, rows, columns) {
  document.querySelectorAll(target).forEach((node) => {
    if (!rows.length) {
      node.innerHTML = `<div class="empty-state">No records found.</div>`;
      return;
    }
    node.innerHTML = `
      <table>
        <thead><tr>${columns.map((column) => `<th>${column.label}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr data-searchable>
              ${columns.map((column) => {
                const value = column.format ? column.format(row) : row[column.key] ?? "";
                return `<td>${column.badge ? `<span class="badge">${value}</span>` : value}</td>`;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderClientStats(rows) {
  const stats = document.querySelector("[data-client-stats]");
  if (!stats) return;
  const active = rows.filter((client) => client.status === "active").length;
  const onboarding = rows.filter((client) => client.status === "onboarding").length;
  const revenue = rows.reduce((sum, client) => sum + Number(client.paid_amount || 0), 0);
  const activeProjects = rows.reduce((sum, client) => sum + Number(client.projects_count || 0), 0);
  const leads = rows.reduce((sum, client) => sum + Number(client.leads_generated || 0), 0);
  const invoices = rows.reduce((sum, client) => sum + Number(client.pending_invoices || 0), 0);
  stats.innerHTML = [
    ["Total Clients", rows.length],
    ["Active", active],
    ["Onboarding", onboarding],
    ["Revenue", formatCurrency(revenue)],
    ["Projects", activeProjects],
    ["Leads", leads],
    ["Pending Invoices", invoices]
  ].map(([label, value]) => `
    <div class="mini-stat" data-searchable>
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function setClientMessage(text, type = "error") {
  const message = document.querySelector("[data-client-message]");
  if (!message) return;
  if (!text) {
    message.textContent = "";
    message.classList.remove("success");
    return;
  }
  message.textContent = text;
  message.classList.toggle("success", type === "success");
}

function renderOwnerFilter(rows) {
  const ownerFilter = document.querySelector("[data-owner-filter]");
  if (!ownerFilter) return;
  const current = ownerFilter.value || clientFilters.owner;
  const owners = [...new Set(rows.map((client) => client.owner_user_id).filter(Boolean))].sort();
  ownerFilter.innerHTML = `<option value="all">All Owners</option>${owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`).join("")}`;
  ownerFilter.value = owners.includes(current) ? current : "all";
  clientFilters.owner = ownerFilter.value;
}

function renderBulkBar() {
  const bulkBar = document.querySelector("[data-bulk-bar]");
  const count = document.querySelector("[data-selected-count]");
  if (!bulkBar || !count) return;
  count.textContent = selectedClientIds.size;
  bulkBar.hidden = selectedClientIds.size === 0;
}

function toTitle(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function openClientDrawer(clientId) {
  const client = currentClientRows.find((item) => item.id === clientId);
  const drawer = document.querySelector("[data-client-drawer]");
  const form = document.querySelector("[data-client-drawer-form]");
  if (!client || !drawer || !form) return;
  activeDrawerClientId = client.id;
  document.querySelector("[data-drawer-title]").textContent = client.name || "Client";
  form.name.value = client.name || "";
  form.id.value = client.id || "";
  form.owner.value = client.owner_user_id || "";
  form.phone.value = client.phone || "";
  form.email.value = client.email || "";
  form.plan.value = client.plan || "Starter";
  form.status.value = client.status || "active";
  document.querySelector("[data-drawer-projects]").textContent = Number(client.projects_count || 0);
  document.querySelector("[data-drawer-paid]").textContent = formatCurrency(client.paid_amount || 0);
  document.querySelector("[data-drawer-pending]").textContent = formatCurrency(client.pending_amount || 0);
  document.querySelector("[data-drawer-activities]").innerHTML = (client.activities || ["No recent activity."]).map((activity) => `<div>${escapeHtml(activity)}</div>`).join("");
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeClientDrawer() {
  const drawer = document.querySelector("[data-client-drawer]");
  if (!drawer) return;
  activeDrawerClientId = null;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
}

function openProjectDrawer(projectId) {
  const project = currentProjectRows.find((item) => item.id === projectId);
  const drawer = document.querySelector("[data-project-drawer]");
  if (!project || !drawer) return;
  activeProjectId = project.id;
  document.querySelector("[data-project-drawer-title]").textContent = project.name;
  document.querySelector("[data-project-budget]").textContent = formatCurrency(project.budget);
  document.querySelector("[data-project-invoiced]").textContent = formatCurrency(project.amount_invoiced);
  document.querySelector("[data-project-received]").textContent = formatCurrency(project.revenue_generated);
  document.querySelector("[data-project-pending]").textContent = formatCurrency(project.pending_amount);
  document.querySelector("[data-project-overview]").innerHTML = `
    <div class="activity-list">
      <div>Project ID: <strong>${escapeHtml(project.id)}</strong></div>
      <div>Client: <strong>${escapeHtml(project.client_name)}</strong></div>
      <div>Client ID: <strong>${escapeHtml(project.client_id)}</strong></div>
      <div>Service Type: <strong>${escapeHtml(project.service_type || "-")}</strong></div>
      <div>Project Manager: <strong>${escapeHtml(project.manager || "Not assigned")}</strong></div>
      <div>Priority: <strong>${escapeHtml(project.priority || "Medium")}</strong></div>
      <div>Status: <strong>${escapeHtml(toTitle(project.status || "-"))}</strong></div>
      <div>Start Date: <strong>${formatDate(project.start_date)}</strong></div>
      <div>Deadline: <strong>${formatDate(project.end_date)}</strong></div>
      <div>Created: <strong>${formatDateTime(project.created_at)}</strong></div>
      <div>Last Updated: <strong>${formatDateTime(project.updated_at)}</strong></div>
      <div>Tasks: <strong>${Number(project.completed_tasks || 0)} / ${Number(project.task_count || 0)} completed</strong></div>
      <div>${project.overdue ? `<span class="warning-text">Overdue by ${Math.abs(project.days_remaining)} days</span>` : `${project.days_remaining ?? 0} days remaining`}</div>
    </div>`;
  document.querySelector("[data-project-team]").innerHTML = `<div class="activity-list">${Object.entries({ Manager: project.manager, SEO: project.team?.seo, Ads: project.team?.ads, Content: project.team?.content, Designer: project.team?.designer, Developer: project.team?.developer }).map(([role, name]) => `<div>${role}: <strong>${escapeHtml(name || "Not assigned")}</strong></div>`).join("")}</div>`;
  document.querySelector("[data-project-tasks]").innerHTML = `<div class="activity-list">${(project.tasks || []).map((task) => `<div>${escapeHtml(task.name)} - ${escapeHtml(task.assignee || "Unassigned")} - <strong>${escapeHtml(toTitle(task.status))}</strong></div>`).join("") || "<div>No tasks yet.</div>"}</div>`;
  document.querySelector("[data-project-timeline]").innerHTML = `<div class="activity-list">${(project.timeline || []).map((item) => `<div>${escapeHtml(item.label)} ${item.date ? `- ${formatDate(item.date)}` : ""}</div>`).join("")}</div>`;
  document.querySelector("[data-project-invoices]").innerHTML = `<div class="activity-list">${(project.linked_invoices || []).map((invoice) => `<div>${escapeHtml(invoice.invoice_number)} - Amount ${formatCurrency(invoice.amount)} - Paid ${formatCurrency(invoice.paid_amount || 0)} - Pending ${formatCurrency(Math.max(0, Number(invoice.amount || 0) - Number(invoice.paid_amount || 0)))} - <strong>${escapeHtml(toTitle(invoice.payment_status))}</strong></div>`).join("") || "<div>No invoices linked.</div>"}</div>`;
  document.querySelector("[data-project-activity]").innerHTML = (project.activities || []).map((activity) => `<div>${escapeHtml(activity)}</div>`).join("");
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeProjectDrawer() {
  const drawer = document.querySelector("[data-project-drawer]");
  if (!drawer) return;
  activeProjectId = null;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
}

async function updateClient(clientId, body, options = {}) {
  return apiPut(`/crm/clients/${encodeURIComponent(clientId)}`, body, options);
}

function selectedClients() {
  return currentClientRows.filter((client) => selectedClientIds.has(client.id));
}

function downloadCsv(rows) {
  const headers = ["Client", "Client ID", "Owner", "Phone", "Email", "Plan", "Status", "Projects", "Active Projects", "Completed Projects", "Paid Amount", "Pending Amount", "Created", "Last Invoice", "Last Activity"];
  const lines = rows.map((client) => [
    client.name,
    client.id,
    client.owner_user_id || "",
    client.phone || "",
    client.email || "",
    client.plan || "",
    client.status || "",
    client.projects_count || 0,
    client.active_projects || 0,
    client.completed_projects || 0,
    client.paid_amount || 0,
    client.pending_amount || 0,
    formatDate(client.created_at),
    formatDate(client.last_invoice_date),
    client.last_activity || ""
  ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "vixelry-clients.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadNamedCsv(filename, headers, rows) {
  const lines = rows.map((row) => headers.map(([label, read]) => {
    const value = typeof read === "function" ? read(row) : row[read];
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }).join(","));
  const blob = new Blob([[headers.map(([label]) => label).join(","), ...lines].join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadFinanceCsv(data) {
  const rows = [
    ...(data?.invoices || []).map((row) => ({ type: "Invoice", ...row })),
    ...(data?.expenses || []).map((row) => ({ type: "Expense", invoice_number: row.title, client_name: row.category, amount: row.amount, payment_status: "expense", due_at: row.spent_at }))
  ];
  downloadNamedCsv("vixelry-finance.csv", [
    ["Type", "type"],
    ["Reference", "invoice_number"],
    ["Client / Category", "client_name"],
    ["Project", "project_name"],
    ["Amount", "amount"],
    ["Paid", "paid_amount"],
    ["Pending", "pending_amount"],
    ["Status", "payment_status"],
    ["Date / Due Date", "due_at"]
  ], rows);
}

function invoiceTotal(invoice) {
  return Number(invoice.total_amount ?? (Number(invoice.amount || 0) + Number(invoice.gst_amount || 0)));
}

function openInvoicePdf(invoiceId) {
  const invoice = (currentFinanceData?.invoices || []).find((item) => item.id === invoiceId);
  if (!invoice) return;
  const itemName = invoice.item_name || invoice.project_name || "Digital marketing service";
  const description = invoice.description || invoice.notes || invoice.project_name || "";
  const quantity = Number(invoice.quantity || 1);
  const price = Number(invoice.price || invoice.amount || 0);
  const gstPercent = Number(invoice.gst_percentage || 0);
  const gstAmount = Number(invoice.gst_amount || 0);
  const total = invoiceTotal(invoice);
  const html = `<!doctype html>
<html>
<head>
  <title>${escapeHtml(invoice.invoice_number)} - Vixelry Invoice</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: Arial, sans-serif; background: #f3f6fb; }
    .top-band { height: 34px; background: #0f8a94; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 28mm 18mm 18mm; background: #fff; }
    .head { display: flex; justify-content: space-between; gap: 32px; align-items: flex-start; }
    .brand img { width: 150px; height: auto; display: block; margin-bottom: 28px; }
    h1 { margin: 0; font-size: 62px; font-weight: 400; }
    .agency { text-align: right; line-height: 1.6; font-size: 15px; }
    .agency strong { display: block; font-size: 22px; margin-bottom: 8px; }
    hr { border: 0; border-top: 1px solid #9ca3af; margin: 28px 0; }
    .meta { display: grid; grid-template-columns: 1fr 220px; gap: 24px; }
    .bill h3, .invoice-meta h3 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; }
    .bill strong { display: block; margin-bottom: 8px; font-size: 22px; }
    .bill p, .invoice-meta p { margin: 0 0 6px; line-height: 1.45; }
    .invoice-meta { text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    th { padding: 14px 6px; text-align: left; border-bottom: 1px solid #9ca3af; font-size: 13px; text-transform: uppercase; }
    td { padding: 18px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    th:nth-child(n+3), td:nth-child(n+3) { text-align: right; }
    .notes-total { display: grid; grid-template-columns: 1fr 240px; gap: 32px; margin-top: 90px; padding-top: 24px; border-top: 1px solid #9ca3af; }
    .notes h3, .total h3 { margin: 0 0 18px; font-size: 14px; text-transform: uppercase; }
    .total { text-align: right; }
    .total strong { display: block; font-size: 44px; }
    .footer { margin: 50px -18mm -18mm; padding: 24px; background: #eaf1ff; text-align: center; color: #475467; font-size: 13px; }
    .print-actions { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; }
    .print-actions button { padding: 10px 14px; border: 1px solid #d0d5dd; border-radius: 8px; background: #fff; font-weight: 800; cursor: pointer; }
    @media print {
      body { background: #fff; }
      .page { margin: 0; width: auto; min-height: auto; box-shadow: none; }
      .print-actions { display: none; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="top-band"></div>
  <div class="print-actions"><button onclick="window.print()">Save PDF</button><button onclick="window.close()">Close</button></div>
  <main class="page">
    <section class="head">
      <div class="brand">
        <img src="images/vixelry-logo.png" alt="Vixelry">
        <h1>Invoice</h1>
      </div>
      <div class="agency">
        <strong>Vixelry Digital Marketing Agency</strong>
        <div>Sivagangai, Tamil Nadu</div>
        <div>India</div>
        <div>hello@vixelry.com</div>
      </div>
    </section>
    <hr>
    <section class="meta">
      <div class="bill">
        <h3>Bill To:</h3>
        <strong>${escapeHtml(invoice.client_name || "Client")}</strong>
        <p>${escapeHtml(invoice.project_name || "")}</p>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="invoice-meta">
        <h3>Invoice #</h3><p>${escapeHtml(invoice.invoice_number)}</p>
        <h3>Date</h3><p>${formatDate(invoice.issued_at)}</p>
        <h3>Invoice Due Date</h3><p>${formatDate(invoice.due_at)}</p>
      </div>
    </section>
    <table>
      <thead><tr><th>Items</th><th>Description</th><th>Quantity</th><th>Price</th><th>Tax</th><th>Amount</th></tr></thead>
      <tbody>
        <tr>
          <td>${escapeHtml(itemName)}</td>
          <td>${escapeHtml(description || invoice.project_name || "-")}</td>
          <td>${quantity}</td>
          <td>${formatCurrency(price)}</td>
          <td>${gstPercent}%</td>
          <td>${formatCurrency(Number(invoice.amount || 0))}</td>
        </tr>
      </tbody>
    </table>
    <section class="notes-total">
      <div class="notes">
        <h3>Notes:</h3>
        <p>${escapeHtml(invoice.notes || "Thank you for choosing Vixelry.")}</p>
      </div>
      <div class="total">
        <h3>Total</h3>
        <strong>${formatCurrency(total)}</strong>
        <p>GST: ${formatCurrency(gstAmount)}</p>
      </div>
    </section>
    <div class="footer">Generated by Vixelry CRM</div>
  </main>
</body>
</html>`;
  const popup = window.open("", "_blank");
  if (!popup) {
    alert("Popup blocked. Allow popups to generate invoice PDF.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

async function loadClients() {
  if (storedUser.role !== "admin") return;
  const clients = await apiGet("/crm/clients");
  const rows = clients.clients || [];
  currentClientRows = rows;
  renderClientStats(rows);
  renderOwnerFilter(rows);
  renderClientDirectory(getVisibleClients());
  renderBulkBar();
}

function renderClientDirectory(rows) {
  const target = document.querySelector("[data-client-table]");
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = `<div class="empty-state">No clients found.</div>`;
    return;
  }
  target.innerHTML = `
    <table class="editable-table">
      <thead>
        <tr>
          <th><input type="checkbox" data-select-all-clients aria-label="Select all clients"></th>
          <th>Client</th>
          <th>Owner</th>
          <th>Projects</th>
          <th>Plan</th>
          <th>Status</th>
          <th>Contact</th>
          <th>Email</th>
          <th>Created</th>
          <th>Last Invoice</th>
          <th>Last Activity</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((client) => `
          <tr data-searchable data-client-row="${client.id}">
            ${renderClientViewCells(client)}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  const selectAll = target.querySelector("[data-select-all-clients]");
  if (selectAll) {
    selectAll.checked = rows.length > 0 && rows.every((client) => selectedClientIds.has(client.id));
  }
}

function getVisibleClients() {
  const query = document.querySelector("[data-search]")?.value || "";
  return sortClients(filterClients(currentClientRows, query), query);
}

function filterClients(rows, query) {
  const cleanQuery = query.trim().toLowerCase();
  return rows.filter((client) => {
    const statusMatch = clientFilters.status === "all" || client.status === clientFilters.status;
    const ownerMatch = clientFilters.owner === "all" || (client.owner_user_id || "") === clientFilters.owner;
    const values = [
      client.name,
      client.id,
      client.owner_user_id,
      client.status,
      client.phone,
      client.email,
      client.plan,
      client.last_activity
    ].map((value) => String(value || "").toLowerCase());
    const searchMatch = !cleanQuery || values.some((value) => value.includes(cleanQuery));
    return statusMatch && ownerMatch && searchMatch;
  });
}

function sortClients(rows, query) {
  const cleanQuery = query.trim().toLowerCase();
  return [...rows].sort((a, b) => {
    if (cleanQuery) {
      const rank = clientRank(a, cleanQuery) - clientRank(b, cleanQuery);
      if (rank !== 0) return rank;
    }
    if (clientFilters.sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (clientFilters.sort === "name") return String(a.name || "").localeCompare(String(b.name || ""));
    if (clientFilters.sort === "activity") return Number(b.last_activity_at || 0) - Number(a.last_activity_at || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function clientRank(client, query) {
  const values = [
    client.name || "",
    client.id || "",
    client.owner_user_id || "",
    client.status || "",
    client.phone || "",
    client.email || "",
    client.plan || ""
  ].map((value) => String(value).toLowerCase());
  if (values.some((value) => value === query)) return 0;
  if (values.some((value) => value.startsWith(query))) return 1;
  if (values.some((value) => value.includes(query))) return 2;
  return 3;
}

function applySearch(query) {
  const activeSection = document.querySelector(".section-panel.active")?.dataset.section;
  if (activeSection === "clients" && currentClientRows.length) {
    renderClientDirectory(getVisibleClients());
    return;
  }
  document.querySelectorAll("[data-searchable]").forEach((item) => {
    item.hidden = query && !item.textContent.toLowerCase().includes(query);
  });
}

function renderClientViewCells(client) {
  return `
    <td><input type="checkbox" data-select-client="${escapeHtml(client.id)}" ${selectedClientIds.has(client.id) ? "checked" : ""} aria-label="Select ${escapeHtml(client.name)}"></td>
    <td>
      <div class="client-identity">
        <span class="client-logo">${escapeHtml(getInitials(client.name || "Client"))}</span>
        <div>
          <strong>${escapeHtml(client.name)}</strong>
          <span>${escapeHtml(client.id)}</span>
        </div>
      </div>
    </td>
    <td>${escapeHtml(client.owner_user_id || "Not assigned")}</td>
    <td>${Number(client.projects_count || 0)} / ${Number(client.active_projects || 0)} active</td>
    <td>${escapeHtml(client.plan || "Starter")}</td>
    <td><span class="status-badge status-${escapeHtml(client.status || "active")}" title="${escapeHtml(client.status_history || "No status changes yet.")}">${escapeHtml(toTitle(client.status || "active"))}</span></td>
    <td>${escapeHtml(client.phone || "-")}</td>
    <td>${escapeHtml(client.email || "-")}</td>
    <td>${escapeHtml(formatDate(client.created_at))}</td>
    <td>${escapeHtml(formatDate(client.last_invoice_date))}</td>
    <td>${escapeHtml(client.last_activity || "No activity")}</td>
    <td><button class="small-action" data-open-client="${escapeHtml(client.id)}" type="button">View</button></td>
  `;
}

function renderNotifications(rows) {
  const list = document.querySelector("[data-notifications]");
  const count = document.querySelector("[data-notification-count]");
  const label = document.querySelector("[data-notification-label]");
  const total = rows.length;
  if (count) {
    count.textContent = total > 99 ? "99+" : String(total);
    count.hidden = total === 0;
  }
  if (label) label.textContent = `${total} notification${total === 1 ? "" : "s"}`;
  if (!list) return;
  list.innerHTML = rows.length
    ? rows.map((item) => `<div class="notice-item">${escapeHtml(item.message)}</div>`).join("")
    : `<div class="notice-empty">No notifications yet.</div>`;
}

async function loadDashboard() {
  setPageLoading(true, "Loading dashboard...");
  try {
    const [summaryResult, projectsResult, projectSummaryResult, reportsResult, notificationsResult, financeResult, socialResult] = await Promise.allSettled([
      apiGet("/crm/summary"),
      apiGet("/crm/projects"),
      apiGet("/crm/projects/summary"),
      apiGet("/crm/reports"),
      apiGet("/crm/notifications"),
      apiGet("/crm/finance"),
      apiGet("/crm/social")
    ]);
    if (summaryResult.status === "fulfilled") renderStats(summaryResult.value);
    if (projectsResult.status === "fulfilled") {
      currentProjectRows = (projectsResult.value.projects || []).map(normalizeProjectForTable);
    }
    const projectSummary = projectSummaryFromRows(currentProjectRows);
    renderProjectStats(projectSummary);
    renderProjectControls(currentProjectRows);
    renderProjectAnalytics(currentProjectRows);
    renderDashboardProjectSummary(currentProjectRows);
    renderProjectTable(getVisibleProjects());
    if (activeProjectId && document.querySelector("[data-project-drawer]")?.classList.contains("is-open")) {
      openProjectDrawer(activeProjectId);
    }
    currentReportRows = reportsResult.status === "fulfilled" ? reportsResult.value.reports || [] : [];
    renderReports(currentReportRows);
    renderNotifications(notificationsResult.status === "fulfilled" ? notificationsResult.value.notifications || [] : []);
    if (financeResult.status === "fulfilled") renderFinance(financeResult.value);
    if (socialResult.status === "fulfilled") renderSocial(socialResult.value);

    if (storedUser.role === "admin") {
      await loadClients();
      renderProjectControls(currentProjectRows);
      renderProjectAnalytics(currentProjectRows);
      renderDashboardProjectSummary(currentProjectRows);
      renderProjectTable(getVisibleProjects());
      renderFinanceOptions();
      renderSocialOptions();
      if (activeProjectId && document.querySelector("[data-project-drawer]")?.classList.contains("is-open")) {
        openProjectDrawer(activeProjectId);
      }
    }
  } catch (error) {
    const stats = document.querySelector("[data-stats]");
    if (stats) {
      stats.innerHTML = `<article class="stat-card"><span>Backend</span><strong>Offline</strong><span>Start Node.js API on port 4000.</span></article>`;
    }
  } finally {
    setPageLoading(false);
  }
}

function renderProjectStats(summary) {
  const stats = document.querySelector("[data-project-stats]");
  if (!stats) return;
  const cards = [
    ["Total Projects", summary.totalProjects || 0],
    ["Active", summary.activeProjects || 0],
    ["Completed", summary.completedProjects || 0],
    ["In Review", summary.reviewProjects || 0],
    ["Onboarding", summary.onboardingProjects || 0],
    ["Project Value", formatCurrency(summary.totalProjectValue || 0)],
    ["Revenue", formatCurrency(summary.revenueGenerated || 0)],
    ["Total Pending", formatCurrency(summary.pendingRevenue || 0)]
  ];
  stats.innerHTML = cards.map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function projectSummaryFromRows(rows) {
  return {
    totalProjects: rows.length,
    activeProjects: rows.filter((project) => project.status === "active").length,
    completedProjects: rows.filter((project) => project.status === "completed").length,
    reviewProjects: rows.filter((project) => project.status === "review").length,
    onboardingProjects: rows.filter((project) => project.status === "onboarding").length,
    totalProjectValue: rows.reduce((sum, project) => sum + Number(project.budget || 0), 0),
    revenueGenerated: rows.reduce((sum, project) => sum + Number(project.revenue_generated || 0), 0),
    pendingRevenue: rows.reduce((sum, project) => sum + projectPendingValue(project), 0)
  };
}

function projectPendingValue(project) {
  const received = Number(project.revenue_generated || 0);
  const invoiced = Number(project.amount_invoiced || 0);
  const invoicePending = Math.max(0, invoiced - received);
  const budgetPending = Math.max(0, Number(project.budget || 0) - received);
  return String(project.status || "").toLowerCase() === "completed"
    ? budgetPending
    : Number(project.pending_amount ?? invoicePending);
}

function normalizeProjectForTable(project) {
  const client = currentClientRows.find((item) => item.id === project.client_id);
  const tasks = project.tasks || [];
  const completedTasks = Number(project.completed_tasks ?? tasks.filter((task) => task.status === "completed").length);
  const taskCount = Number(project.task_count ?? tasks.length);
  const progress = Number(project.progress ?? (taskCount ? Math.round((completedTasks / taskCount) * 100) : 0));
  const invoices = project.linked_invoices || [];
  const amountInvoiced = Number(project.amount_invoiced ?? invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0));
  const revenueGenerated = Number(project.revenue_generated ?? invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0));
  const invoicePendingAmount = Math.max(0, amountInvoiced - revenueGenerated);
  const budgetPendingAmount = Math.max(0, Number(project.budget || 0) - revenueGenerated);
  const pendingAmount = projectPendingValue({
    ...project,
    amount_invoiced: amountInvoiced,
    revenue_generated: revenueGenerated
  });
  return {
    ...project,
    client_name: project.client_name || client?.name || project.client_id || "-",
    service_type: project.service_type || project.serviceType || "-",
    manager: project.manager || "",
    priority: project.priority || "Medium",
    team: project.team || {},
    tasks,
    task_count: taskCount,
    completed_tasks: completedTasks,
    progress,
    amount_invoiced: amountInvoiced,
    revenue_generated: revenueGenerated,
    pending_amount: pendingAmount,
    invoice_pending_amount: Number(project.invoice_pending_amount ?? invoicePendingAmount),
    budget_pending_amount: Number(project.budget_pending_amount ?? budgetPendingAmount),
    linked_invoices: invoices,
    days_remaining: project.days_remaining ?? daysRemaining(project.end_date),
    overdue: project.overdue ?? (daysRemaining(project.end_date) < 0 && project.status !== "completed"),
    timeline: project.timeline || [
      { label: "Start", date: project.start_date },
      { label: "Deadline", date: project.end_date }
    ],
    activities: project.activities || [`Project ${project.name || "New Project"} created.`]
  };
}

function daysRemaining(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.ceil((date - new Date()) / (24 * 60 * 60 * 1000));
}

function renderProjectControls(rows) {
  const clientOptions = document.querySelector("[data-project-client-options]");
  const clientFilter = document.querySelector("[data-project-client-filter]");
  const serviceFilter = document.querySelector("[data-project-service-filter]");
  const managerFilter = document.querySelector("[data-project-manager-filter]");
  const clientOptionsHtml = currentClientRows.map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name)}</option>`).join("");
  if (clientOptions) clientOptions.innerHTML = `<option value="">Select Client</option>${clientOptionsHtml || `<option value="">Add client first</option>`}`;
  if (clientFilter) clientFilter.innerHTML = `<option value="all">All Clients</option>${clientOptionsHtml}`;
  if (serviceFilter) serviceFilter.innerHTML = `<option value="all">All Services</option>${[...new Set(rows.map((row) => row.service_type).filter(Boolean))].map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
  if (managerFilter) managerFilter.innerHTML = `<option value="all">All Managers</option>${[...new Set(rows.map((row) => row.manager).filter(Boolean))].map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
  if (clientFilter) clientFilter.value = projectFilters.client;
  if (serviceFilter) serviceFilter.value = projectFilters.service;
  if (managerFilter) managerFilter.value = projectFilters.manager;
  const statusFilter = document.querySelector("[data-project-status-filter]");
  if (statusFilter) statusFilter.value = projectFilters.status;
}

function renderProjectAnalytics(rows) {
  const target = document.querySelector("[data-project-analytics]");
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = `<div class="empty-state">No project data available.</div>`;
    return;
  }
  const statuses = ["onboarding", "active", "review", "completed", "hold"];
  target.innerHTML = statuses.map((status) => {
    const count = rows.filter((project) => project.status === status).length;
    const pct = rows.length ? Math.round((count / rows.length) * 100) : 0;
    return `<div class="analytics-row"><span>${toTitle(status)}</span><div class="progress-track"><i style="width:${pct}%"></i></div><strong>${count}</strong></div>`;
  }).join("");
}

function getVisibleProjects() {
  const query = (document.querySelector("[data-search]")?.value || "").trim().toLowerCase();
  return currentProjectRows.filter((project) => {
    const search = !query || [project.name, project.client_name, project.service_type, project.manager, project.status].some((value) => String(value || "").toLowerCase().includes(query));
    return search
      && (projectFilters.client === "all" || project.client_id === projectFilters.client)
      && (projectFilters.status === "all" || project.status === projectFilters.status)
      && (projectFilters.service === "all" || project.service_type === projectFilters.service)
      && (projectFilters.manager === "all" || project.manager === projectFilters.manager);
  });
}

function renderProjectTable(rows) {
  const targets = [...document.querySelectorAll("[data-project-table]")].filter((target) => target.closest("[data-section='projects']"));
  targets.forEach((target) => {
    if (!rows.length) {
      target.innerHTML = `
        <div class="empty-state project-empty-state">
          <strong>No projects found for this filter.</strong>
          <span>Choose All Clients or add a project for the selected client.</span>
          <button class="small-action" data-clear-project-filters type="button">Show All Projects</button>
        </div>
      `;
    return;
  }
  target.innerHTML = `
    <table class="editable-table project-table">
        <thead><tr><th>Project</th><th>Client</th><th>Service</th><th>Timeline</th><th>Status</th><th>Finance</th><th>Actions</th></tr></thead>
        <tbody>${rows.map((project) => `
          <tr data-searchable>
            <td><strong>${escapeHtml(project.name)}</strong><span class="mono-value">${escapeHtml(project.id)}</span></td>
            <td>${escapeHtml(project.client_name)}</td>
            <td>${escapeHtml(project.service_type)}</td>
            <td><div class="stacked-cell"><strong>${formatDate(project.start_date)}</strong><span>${project.overdue ? `<span class="warning-text">${formatDate(project.end_date)}</span>` : formatDate(project.end_date)}</span></div></td>
            <td>
              <select class="status-select status-${escapeHtml(project.status)}" data-project-status-update="${escapeHtml(project.id)}" aria-label="Project status">
                ${["onboarding", "active", "review", "completed", "hold"].map((status) => `<option value="${status}"${project.status === status ? " selected" : ""}>${toTitle(status)}</option>`).join("")}
              </select>
            </td>
            <td><div class="stacked-cell"><strong>${formatCurrency(project.budget)}</strong><span>Paid ${formatCurrency(project.revenue_generated)} / Pending ${formatCurrency(project.pending_amount)}</span></div></td>
            <td><div class="row-actions compact-actions"><button class="small-action" data-open-project="${escapeHtml(project.id)}" type="button">View</button><button class="small-action" data-add-task="${escapeHtml(project.id)}" type="button">Task</button><button class="small-action" data-create-invoice="${escapeHtml(project.id)}" type="button">Invoice</button><button class="small-action danger-action" data-delete-project="${escapeHtml(project.id)}" type="button">Remove</button></div></td>
          </tr>`).join("")}</tbody>
      </table>`;
  });
}

function renderDashboardProjectSummary(rows) {
  const dashboardTarget = document.querySelector("[data-section='dashboard'] [data-project-table]");
  if (!dashboardTarget) return;
  const visibleRows = rows.slice(0, 6);
  if (!visibleRows.length) {
    dashboardTarget.innerHTML = `<div class="empty-state">No active projects yet.</div>`;
    return;
  }
  dashboardTarget.innerHTML = `
    <table class="editable-table dashboard-project-table">
      <thead><tr><th>Company</th><th>Project</th><th>Service</th><th>Status</th></tr></thead>
      <tbody>${visibleRows.map((project) => `
        <tr data-searchable>
          <td>${escapeHtml(project.client_name)}</td>
          <td><strong>${escapeHtml(project.name)}</strong></td>
          <td>${escapeHtml(project.service_type || "-")}</td>
          <td><span class="status-badge status-${escapeHtml(project.status)}">${toTitle(project.status)}</span></td>
        </tr>`).join("")}</tbody>
    </table>`;
}

function renderProgress(value) {
  const pct = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="progress-cell"><span>${pct}% Complete</span><div class="progress-track"><i style="width:${pct}%"></i></div></div>`;
}

function renderFinance(data) {
  currentFinanceData = data;
  const summary = data.summary || {};
  const stats = document.querySelector("[data-finance-stats]");
  if (stats) {
    const cards = [
      ["Total Revenue", summary.totalRevenue],
      ["Pending Payments", summary.pendingPayments],
      ["Paid This Month", summary.monthlyRevenue],
      ["Expenses", summary.totalExpenses],
      ["Net Profit", summary.netProfit],
      ["Overdue Invoices", summary.overdueInvoices]
    ];
    stats.innerHTML = cards.map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${typeof value === "number" && label !== "Overdue Invoices" ? formatCurrency(value) : value || 0}</strong></div>`).join("");
  }

  const monthly = data.monthly || [];
  const analytics = document.querySelector("[data-finance-analytics]");
  if (analytics) {
    const max = Math.max(1, ...monthly.map((row) => Math.max(row.revenue, row.expenses, Math.abs(row.profit))));
    analytics.innerHTML = monthly.map((row) => `
      <div class="analytics-row finance-row">
        <span>${escapeHtml(row.month)}</span>
        <div>
          <div class="progress-track"><i style="width:${Math.round((row.revenue / max) * 100)}%"></i></div>
          <small>Revenue ${formatCurrency(row.revenue)} | Expenses ${formatCurrency(row.expenses)} | Profit ${formatCurrency(row.profit)}</small>
        </div>
        <strong>${formatCurrency(row.revenue)}</strong>
      </div>`).join("") || `<div class="empty-state">No monthly finance data.</div>`;
  }

  renderFinanceTable("[data-invoice-table]", data.invoices || [], [
    ["Invoice", (row) => row.invoice_number],
    ["Client", (row) => row.client_name],
    ["Project", (row) => row.project_name],
    ["Amount", (row) => formatCurrency(row.amount)],
    ["GST", (row) => `${row.gst_percentage || 0}% / ${formatCurrency(row.gst_amount || 0)}`],
    ["Status", (row) => `<select class="status-select status-${escapeHtml(row.payment_status)}" data-invoice-status-update="${escapeHtml(row.id)}" aria-label="Invoice status"><option value="pending"${row.payment_status === "pending" ? " selected" : ""}>Pending</option><option value="paid"${row.payment_status === "paid" ? " selected" : ""}>Paid</option></select>`],
    ["Actions", (row) => `<div class="row-actions"><button class="small-action" data-print-invoice="${escapeHtml(row.id)}">PDF</button><button class="small-action danger-action" data-delete-invoice="${escapeHtml(row.id)}">Delete</button></div>`]
  ]);

  renderFinanceTable("[data-pending-payment-table]", data.pendingPayments || [], [
    ["Client", (row) => row.client_name],
    ["Project", (row) => row.project_name],
    ["Invoice", (row) => row.invoice_number],
    ["Amount", (row) => formatCurrency(row.pending_amount)],
    ["Due Date", (row) => formatDate(row.due_at)],
    ["Status", (row) => financeStatus(row.payment_status)]
  ]);

  renderFinanceTable("[data-expense-table]", data.expenses || [], [
    ["Category", (row) => row.category],
    ["Expense", (row) => row.title],
    ["Client", (row) => row.client_name || "Agency"],
    ["Project", (row) => row.project_name || "-"],
    ["Amount", (row) => formatCurrency(row.amount)],
    ["Date", (row) => formatDate(row.spent_at)],
    ["Actions", (row) => `<div class="row-actions"><button class="small-action" data-edit-expense="${escapeHtml(row.id)}">Edit</button><button class="small-action danger-action" data-delete-expense="${escapeHtml(row.id)}">Delete</button></div>`]
  ]);

  const clientRevenue = document.querySelector("[data-client-revenue]");
  if (clientRevenue) {
    const max = Math.max(1, ...(data.clientRevenue || []).map((row) => row.amount));
    clientRevenue.innerHTML = (data.clientRevenue || []).map((row) => `
      <div class="analytics-row client-revenue-row">
        <span title="${escapeHtml(row.client)}">${escapeHtml(row.client)}</span>
        <div class="progress-track revenue-track"><i style="width:${Math.round((row.amount / max) * 100)}%"></i></div>
        <strong>${formatCurrency(row.amount)}</strong>
      </div>`).join("") || `<div class="empty-state">No client revenue yet.</div>`;
  }

  const gst = document.querySelector("[data-gst-summary]");
  if (gst) {
    const row = data.gst || {};
    gst.innerHTML = `
      <span>Taxable <strong>${formatCurrency(row.taxable || 0)}</strong></span>
      <span>CGST <strong>${formatCurrency(row.cgst || 0)}</strong></span>
      <span>SGST <strong>${formatCurrency(row.sgst || 0)}</strong></span>
      <span>Total GST <strong>${formatCurrency(row.totalGst || 0)}</strong></span>`;
  }

  renderEmployeeSalary(data);
  renderFinanceOptions();
}

function renderEmployeeSalary(data) {
  const summary = data.summary || {};
  const stats = document.querySelector("[data-employee-salary-stats]");
  if (stats) {
    const cards = [
      ["Total Employees", summary.totalEmployees || 0],
      ["Salary Paid", summary.salaryPaid || 0],
      ["Pending Salary", summary.pendingSalary || 0]
    ];
    stats.innerHTML = cards.map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${label === "Total Employees" ? value : formatCurrency(value)}</strong></div>`).join("");
  }

  renderFinanceTable("[data-employee-salary-table]", data.employees || [], [
    ["Employee", (row) => row.name],
    ["Role", (row) => row.role || "Team"],
    ["Salary", (row) => formatCurrency(row.salary)],
    ["Status", (row) => financeStatus(row.paid ? "paid" : "pending")],
    ["Actions", (row) => `<div class="row-actions"><button class="small-action" data-pay-employee="${escapeHtml(row.id)}"${row.paid ? " disabled" : ""}>Mark Paid</button><button class="small-action" data-edit-employee="${escapeHtml(row.id)}">Edit</button><button class="small-action danger-action" data-delete-employee="${escapeHtml(row.id)}">Delete</button></div>`]
  ]);
}

function renderFinanceProjectOptions(clientId = "") {
  const projectSelect = document.querySelector("[data-finance-project-options]");
  if (!projectSelect) return;
  const projects = clientId ? currentProjectRows.filter((project) => project.client_id === clientId) : currentProjectRows;
  projectSelect.innerHTML = `<option value="">Select Project</option>${projects.map((project) => `<option value="${escapeHtml(project.id)}" data-client-id="${escapeHtml(project.client_id)}">${escapeHtml(project.name)}</option>`).join("")}`;
}

function renderExpenseProjectOptions(clientId = "") {
  const projectSelect = document.querySelector("[data-expense-project-options]");
  if (!projectSelect) return;
  const projects = clientId ? currentProjectRows.filter((project) => project.client_id === clientId) : currentProjectRows;
  projectSelect.innerHTML = `<option value="">No project / agency expense</option>${projects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join("")}`;
}

function renderFinanceOptions() {
  const clientSelect = document.querySelector("[data-finance-client-options]");
  const expenseClientSelect = document.querySelector("[data-expense-client-options]");
  const selectedClient = clientSelect?.value || "";
  if (clientSelect) {
    const selected = clientSelect.value;
    clientSelect.innerHTML = `<option value="">Select Client</option>${currentClientRows.map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name)}</option>`).join("")}`;
    clientSelect.value = selected;
  }
  renderFinanceProjectOptions(selectedClient);
  if (expenseClientSelect) {
    const selected = expenseClientSelect.value;
    expenseClientSelect.innerHTML = `<option value="">Agency expense / no client</option>${currentClientRows.map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name)}</option>`).join("")}`;
    expenseClientSelect.value = selected;
  }
  renderExpenseProjectOptions(expenseClientSelect?.value || "");
}

function renderFinanceTable(target, rows, columns) {
  document.querySelectorAll(target).forEach((node) => {
    if (!rows.length) {
      node.innerHTML = `<div class="empty-state">No records found.</div>`;
      return;
    }
    node.innerHTML = `<table><thead><tr>${columns.map(([label]) => `<th>${label}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map(([, render]) => `<td>${render(row)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  });
}

function renderSocial(data) {
  currentSocialData = data;
  const summary = data.summary || {};
  const stats = document.querySelector("[data-social-stats]");
  if (stats) {
    const cards = [
      ["Social Clients", summary.socialClients || 0],
      ["Accounts", summary.connectedAccounts || 0],
      ["Scheduled", summary.scheduledPosts || 0],
      ["Published", summary.publishedPosts || 0],
      ["Engagement", `${summary.engagementRate || 0}%`],
      ["Reach", summary.reach || 0],
      ["Growth", summary.followersGrowth || 0],
      ["Approvals", summary.pendingApprovals || 0]
    ];
    stats.innerHTML = cards.map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  renderFinanceTable("[data-social-post-table]", data.posts || [], [
    ["Title", (row) => row.title],
    ["Client", (row) => row.client_name],
    ["Platform", (row) => row.platform],
    ["Type", (row) => row.post_type],
    ["Owner", (row) => [row.writer, row.designer].filter(Boolean).join(" / ") || "-"],
    ["Due", (row) => formatDate(row.due_at)],
    ["Status", (row) => socialStatusSelect(row)],
    ["Actions", (row) => `<div class="row-actions"><button class="small-action" data-social-approve="${escapeHtml(row.id)}">Approve</button><button class="small-action" data-social-reject="${escapeHtml(row.id)}">Reject</button><button class="small-action danger-action" data-social-delete="${escapeHtml(row.id)}">Delete</button></div>`]
  ]);

  renderFinanceTable("[data-social-approval-table]", (data.posts || []).filter((post) => post.status === "client approval"), [
    ["Content", (row) => row.title],
    ["Client", (row) => row.client_name],
    ["Due", (row) => formatDate(row.due_at)],
    ["Actions", (row) => `<div class="row-actions"><button class="small-action" data-social-approve="${escapeHtml(row.id)}">Approve</button><button class="small-action" data-social-reject="${escapeHtml(row.id)}">Request Changes</button></div>`]
  ]);

  renderFinanceTable("[data-social-schedule-table]", (data.posts || []).filter((post) => ["scheduled", "published"].includes(post.status)), [
    ["Content", (row) => row.title],
    ["Platform", (row) => row.platform],
    ["Schedule", (row) => formatDateTime(row.scheduled_at)],
    ["Status", (row) => financeStatus(row.status)]
  ]);

  renderFinanceTable("[data-social-account-table]", data.accounts || [], [
    ["Client", (row) => clientsName(row.client_id)],
    ["Platform", (row) => row.platform],
    ["Handle", (row) => row.handle],
    ["Status", (row) => financeStatus(row.status)]
  ]);

  renderFinanceTable("[data-social-campaign-table]", data.campaigns || [], [
    ["Campaign", (row) => row.name],
    ["Client", (row) => row.client_name],
    ["Objective", (row) => row.objective],
    ["Budget", (row) => formatCurrency(row.budget)],
    ["Dates", (row) => `${formatDate(row.start_at)} - ${formatDate(row.end_at)}`],
    ["CPL", (row) => Number(row.leads || 0) ? formatCurrency(Number(row.budget || 0) / Number(row.leads || 1)) : "-"]
  ]);

  const calendar = document.querySelector("[data-social-calendar]");
  if (calendar) {
    const posts = data.posts || [];
    calendar.innerHTML = Array.from({ length: 31 }, (_, index) => {
      const day = index + 1;
      const dayPosts = posts.filter((post) => Number(String(post.scheduled_at || post.due_at || "").slice(8, 10)) === day);
      return `<div class="calendar-day"><strong>${day}</strong>${dayPosts.slice(0, 2).map((post) => `<span>${escapeHtml(post.platform)}: ${escapeHtml(post.title)}</span>`).join("")}</div>`;
    }).join("");
  }
  renderSocialOptions();
}

function clientsName(clientId) {
  return currentClientRows.find((client) => client.id === clientId)?.name || clientId || "-";
}

function socialStatusSelect(row) {
  const statuses = ["idea", "draft", "designing", "review", "client approval", "scheduled", "published"];
  return `<select class="status-select status-${escapeHtml(row.status)}" data-social-status-update="${escapeHtml(row.id)}">${statuses.map((status) => `<option value="${status}"${row.status === status ? " selected" : ""}>${toTitle(status)}</option>`).join("")}</select>`;
}

function renderSocialOptions() {
  const clientOptions = currentClientRows.map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name)}</option>`).join("");
  document.querySelectorAll("[data-social-client-options], [data-social-account-client-options], [data-social-campaign-client-options]").forEach((select) => {
    const selected = select.value;
    select.innerHTML = `<option value="">Select Client</option>${clientOptions}`;
    select.value = selected;
  });
  const selectedClient = document.querySelector("[data-social-client-options]")?.value || "";
  const projects = selectedClient ? currentProjectRows.filter((project) => project.client_id === selectedClient) : currentProjectRows;
  document.querySelectorAll("[data-social-project-options]").forEach((select) => {
    const selected = select.value;
    select.innerHTML = `<option value="">No project / general content</option>${projects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join("")}`;
    select.value = selected;
  });
}

function renderReports(rows) {
  renderFinanceTable("[data-report-table]", rows, [
    ["Report Name", (row) => row.report_name || row.title],
    ["Client", (row) => row.client_name || clientsName(row.client_id)],
    ["Type", (row) => row.type],
    ["Created Date", (row) => formatDate(row.created_at)],
    ["Status", (row) => financeStatus(row.status || "pending")],
    ["Actions", (row) => `<div class="row-actions"><button class="small-action" data-view-report="${escapeHtml(row.id)}">View</button><button class="small-action" data-download-report="${escapeHtml(row.id)}">Download</button></div>`]
  ]);
}

function openReportDrawer(reportId) {
  const report = currentReportRows.find((item) => item.id === reportId);
  const drawer = document.querySelector("[data-report-drawer]");
  if (!report || !drawer) return;
  activeReportId = report.id;
  const details = report.details || {};
  document.querySelector("[data-report-title]").textContent = report.title;
  document.querySelector("[data-report-detail]").innerHTML = `
    <div><strong>Client</strong>: ${escapeHtml(report.client_name || clientsName(report.client_id))}</div>
    <div><strong>Report Type</strong>: ${escapeHtml(report.type || "-")}</div>
    <div><strong>Created Date</strong>: ${formatDate(report.created_at)}</div>
    <div><strong>Status</strong>: ${escapeHtml(toTitle(report.status || "pending"))}</div>
    <div><strong>Revenue Summary</strong></div>
    <div>Total Revenue: <strong>${formatCurrency(details.totalRevenue || report.amount || 0)}</strong></div>
    <div>Ad Spend: <strong>${formatCurrency(details.adSpend || 0)}</strong></div>
    <div>Profit: <strong>${formatCurrency(details.profit || 0)}</strong></div>
    <div><strong>Monthly Breakdown</strong></div>
    ${(details.monthly || []).map((item) => `<div>${escapeHtml(item.month)}: <strong>${formatCurrency(item.amount || 0)}</strong></div>`).join("") || "<div>No monthly data.</div>"}
  `;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeReportDrawer() {
  const drawer = document.querySelector("[data-report-drawer]");
  if (!drawer) return;
  activeReportId = null;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
}

function reportToCsv(report) {
  const details = report.details || {};
  const rows = [
    ["Report", report.title],
    ["Client", report.client_name || clientsName(report.client_id)],
    ["Type", report.type],
    ["Created Date", formatDate(report.created_at)],
    ["Status", toTitle(report.status || "pending")],
    ["Total Revenue", details.totalRevenue || report.amount || 0],
    ["Ad Spend", details.adSpend || 0],
    ["Profit", details.profit || 0],
    ...((details.monthly || []).map((item) => [item.month, item.amount || 0]))
  ];
  downloadNamedCsv(`${(report.report_name || "report").replaceAll(" ", "-").toLowerCase()}.csv`, [["Field", 0], ["Value", 1]], rows);
}

function financeStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return `<span class="status-badge status-${escapeHtml(normalized)}">${toTitle(normalized)}</span>`;
}

function bindNavigation() {
  const buttons = document.querySelectorAll("[data-section-target]");
  const sections = document.querySelectorAll("[data-section]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.sectionTarget;
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      sections.forEach((section) => section.classList.toggle("active", section.dataset.section === target));
      document.querySelector(".sidebar")?.classList.remove("is-open");
      applySearch(document.querySelector("[data-search]")?.value.toLowerCase() || "");
    });
  });
}

function bindNotifications() {
  const toggle = document.querySelector("[data-notification-toggle]");
  const panel = document.querySelector("[data-notification-panel]");
  if (!toggle || !panel) return;

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = panel.classList.toggle("is-open");
    panel.setAttribute("aria-hidden", String(!isOpen));
  });

  panel.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", () => {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  });
}

function bindShellActions() {
  document.querySelector("[data-sidebar-toggle]")?.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.toggle("is-open");
  });
  document.querySelector("[data-logout]")?.addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    location.href = "login.html";
  });
  document.querySelector("[data-search]")?.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();
    applySearch(query);
  });
}

function bindForms() {
  document.querySelector("[data-client-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    button.disabled = true;
    setClientMessage("Adding client...", "success");
    try {
      await apiPost("/crm/clients", {
        name: form.name.value.trim(),
        id: form.id.value.trim(),
        owner: form.owner.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        plan: form.plan.value,
        status: form.status.value
      });
      form.reset();
      setClientMessage("");
      await loadDashboard();
    } catch (error) {
      setClientMessage(error.message === "Failed to fetch"
        ? "Backend is not running. Start the API first."
        : error.message);
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector("[data-refresh-clients]")?.addEventListener("click", async () => {
    setClientMessage("Client list refreshed.", "success");
    await loadClients();
  });

  document.querySelector("[data-client-status-filters]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status-filter]");
    if (!button) return;
    clientFilters.status = button.dataset.statusFilter;
    document.querySelectorAll("[data-status-filter]").forEach((item) => item.classList.toggle("active", item === button));
    selectedClientIds.clear();
    renderClientDirectory(getVisibleClients());
    renderBulkBar();
  });

  document.querySelector("[data-owner-filter]")?.addEventListener("change", (event) => {
    clientFilters.owner = event.target.value;
    selectedClientIds.clear();
    renderClientDirectory(getVisibleClients());
    renderBulkBar();
  });

  document.querySelector("[data-client-sort]")?.addEventListener("change", (event) => {
    clientFilters.sort = event.target.value;
    renderClientDirectory(getVisibleClients());
  });

  document.querySelector("[data-client-table]")?.addEventListener("click", async (event) => {
    const openButton = event.target.closest("[data-open-client]");
    if (!openButton) return;
    openClientDrawer(openButton.dataset.openClient);
  });

  document.querySelector("[data-client-table]")?.addEventListener("change", (event) => {
    const selectAll = event.target.closest("[data-select-all-clients]");
    if (selectAll) {
      getVisibleClients().forEach((client) => {
        if (selectAll.checked) selectedClientIds.add(client.id);
        else selectedClientIds.delete(client.id);
      });
      renderClientDirectory(getVisibleClients());
      renderBulkBar();
      return;
    }

    const checkbox = event.target.closest("[data-select-client]");
    if (!checkbox) return;
    if (checkbox.checked) selectedClientIds.add(checkbox.dataset.selectClient);
    else selectedClientIds.delete(checkbox.dataset.selectClient);
    renderBulkBar();
  });

  document.querySelectorAll("[data-close-client-drawer]").forEach((button) => {
    button.addEventListener("click", closeClientDrawer);
  });

  document.querySelector("[data-client-drawer-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeDrawerClientId) return;
    const form = event.currentTarget;
    try {
      await updateClient(activeDrawerClientId, {
        name: form.name.value.trim(),
        id: form.id.value.trim(),
        owner: form.owner.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        plan: form.plan.value,
        status: form.status.value
      });
      closeClientDrawer();
      setClientMessage("");
      await loadDashboard();
    } catch (error) {
      setClientMessage(error.message === "Failed to fetch" ? "Backend is not running. Start the API first." : error.message);
    }
  });

  document.querySelector("[data-bulk-assign]")?.addEventListener("click", async () => {
    const owner = prompt("Assign selected clients to owner:");
    if (!owner) return;
    for (const client of selectedClients()) {
      await updateClient(client.id, { ...client, owner }, { feedback: false });
    }
    selectedClientIds.clear();
    setClientMessage("");
    await showActionFeedback("Owner assigned successfully.");
    await loadDashboard();
  });

  document.querySelector("[data-bulk-pause]")?.addEventListener("click", async () => {
    for (const client of selectedClients()) {
      await updateClient(client.id, { ...client, owner: client.owner_user_id || "", status: "inactive" }, { feedback: false });
    }
    selectedClientIds.clear();
    setClientMessage("");
    await showActionFeedback("Selected clients marked inactive.");
    await loadDashboard();
  });

  document.querySelector("[data-bulk-export]")?.addEventListener("click", () => {
    downloadCsv(selectedClients());
    setClientMessage("CSV export downloaded.", "success");
  });

  document.querySelector("[data-bulk-delete]")?.addEventListener("click", async () => {
    if (!confirm(`Delete ${selectedClientIds.size} selected clients?`)) return;
    for (const client of selectedClients()) {
      await apiDelete(`/crm/clients/${encodeURIComponent(client.id)}`, { feedback: false });
    }
    selectedClientIds.clear();
    setClientMessage("");
    await showActionFeedback("Selected clients deleted successfully.");
    await loadDashboard();
  });

  document.querySelector("[data-project-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const payload = await apiPost("/crm/projects", {
        name: form.name.value.trim(),
        clientId: form.clientId.value,
        serviceType: form.serviceType.value.trim(),
        manager: form.manager.value.trim(),
        startDate: form.startDate.value,
        endDate: form.endDate.value,
        budget: form.budget.value,
        seo: form.seo.value.trim(),
        ads: form.ads.value.trim(),
        content: form.content.value.trim(),
        designer: form.designer.value.trim(),
        developer: form.developer.value.trim(),
        priority: form.priority.value,
        status: form.status.value
      });
      if (payload.project) {
        const addedProject = normalizeProjectForTable(payload.project);
        currentProjectRows = [addedProject, ...currentProjectRows.filter((project) => project.id !== addedProject.id)];
        projectFilters = { client: "all", status: "all", service: "all", manager: "all" };
        renderProjectStats(projectSummaryFromRows(currentProjectRows));
        renderProjectControls(currentProjectRows);
        renderProjectAnalytics(currentProjectRows);
        renderProjectTable(getVisibleProjects());
      }
      form.reset();
      projectFilters.client = "all";
      document.querySelector("[data-project-message]").textContent = "Project added successfully.";
      await loadDashboard();
    } catch (error) {
      document.querySelector("[data-project-message]").textContent = error.message;
    }
  });

  ["client", "status", "service", "manager"].forEach((key) => {
    document.querySelector(`[data-project-${key}-filter]`)?.addEventListener("change", (event) => {
      projectFilters[key] = event.target.value;
      renderProjectTable(getVisibleProjects());
    });
  });

  document.querySelector("[data-refresh-projects]")?.addEventListener("click", loadDashboard);
  document.querySelector("[data-refresh-social]")?.addEventListener("click", loadDashboard);

  document.querySelector("[data-section='projects'] [data-project-table]")?.addEventListener("click", async (event) => {
    if (event.target.closest("[data-clear-project-filters]")) {
      projectFilters = { client: "all", status: "all", service: "all", manager: "all" };
      renderProjectControls(currentProjectRows);
      renderProjectTable(getVisibleProjects());
      return;
    }

    const open = event.target.closest("[data-open-project]");
    if (open) {
      openProjectDrawer(open.dataset.openProject);
      return;
    }
    const addTask = event.target.closest("[data-add-task]");
    if (addTask) {
      activeProjectId = addTask.dataset.addTask;
      openProjectDrawer(activeProjectId);
      setTimeout(() => document.querySelector("[data-project-task-form] input[name='name']")?.focus(), 50);
      return;
    }
    const invoice = event.target.closest("[data-create-invoice]");
    if (invoice) {
      const project = currentProjectRows.find((item) => item.id === invoice.dataset.createInvoice);
      if (!project) return;
      const remainingAmount = Math.max(0, Number(project.budget || 0) - Number(project.amount_invoiced || 0));
      if (remainingAmount <= 0) {
        alert("This project budget is already fully invoiced.");
        return;
      }
      await apiPost("/crm/invoices", {
        clientId: project.client_id,
        projectId: project.id,
        amount: remainingAmount,
        paymentStatus: "pending"
      });
      await loadDashboard();
      openProjectDrawer(project.id);
      return;
    }
    const deleteProject = event.target.closest("[data-delete-project]");
    if (deleteProject) {
      const project = currentProjectRows.find((item) => item.id === deleteProject.dataset.deleteProject);
      if (!project) return;
      if (!confirm(`Remove project "${project.name}"? Connected tasks and invoices will also be removed.`)) return;
      await apiDelete(`/crm/projects/${encodeURIComponent(project.id)}`);
      if (activeProjectId === project.id) closeProjectDrawer();
      await loadDashboard();
    }
  });

  document.querySelector("[data-section='projects'] [data-project-table]")?.addEventListener("change", async (event) => {
    const statusSelect = event.target.closest("[data-project-status-update]");
    if (!statusSelect) return;
    const project = currentProjectRows.find((item) => item.id === statusSelect.dataset.projectStatusUpdate);
    if (!project) return;
    statusSelect.disabled = true;
    try {
      await apiPut(`/crm/projects/${encodeURIComponent(project.id)}`, {
        ...project,
        status: statusSelect.value
      });
      await loadDashboard();
    } catch (error) {
      statusSelect.value = project.status;
      alert(error.message === "Failed to fetch" ? "Backend is not running. Start the API first." : error.message);
    } finally {
      statusSelect.disabled = false;
    }
  });

  document.querySelectorAll("[data-close-project-drawer]").forEach((button) => {
    button.addEventListener("click", closeProjectDrawer);
  });

  document.querySelector("[data-project-task-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeProjectId) return;
    const form = event.currentTarget;
    await apiPost("/crm/tasks", {
      projectId: activeProjectId,
      name: form.name.value.trim(),
      assignee: form.assignee.value.trim(),
      dueAt: form.dueAt.value,
      status: form.status.value
    });
    form.reset();
    await loadDashboard();
    openProjectDrawer(activeProjectId);
  });

  document.querySelector("[data-invoice-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiPost("/crm/invoices", {
        clientId: form.clientId.value,
        projectId: form.projectId.value,
        itemName: form.itemName.value,
        description: form.description.value,
        quantity: form.quantity.value,
        price: form.price.value,
        amount: form.amount.value,
        gstPercent: form.gstPercent.value,
        dueAt: form.dueAt.value,
        notes: form.notes.value,
        paymentStatus: "sent"
      });
      form.reset();
      document.querySelector("[data-finance-message]").textContent = "Invoice created successfully.";
      await loadDashboard();
    } catch (error) {
      document.querySelector("[data-finance-message]").textContent = error.message;
    }
  });

  document.querySelector("[data-expense-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await apiPost("/crm/expenses", {
      title: form.title.value,
      clientId: form.clientId.value,
      projectId: form.projectId.value,
      category: form.category.value,
      amount: form.amount.value,
      vendor: form.vendor.value,
      date: form.date.value,
      notes: form.notes.value
    });
    form.reset();
    await loadDashboard();
  });

  document.querySelector("[data-social-client-options]")?.addEventListener("change", renderSocialOptions);

  document.querySelector("[data-social-post-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await apiPost("/crm/social/posts", {
      clientId: form.clientId.value,
      projectId: form.projectId.value,
      title: form.title.value,
      caption: form.caption.value,
      platform: form.platform.value,
      postType: form.postType.value,
      designer: form.designer.value,
      writer: form.writer.value,
      dueAt: form.dueAt.value,
      scheduledAt: form.scheduledAt.value,
      hashtags: form.hashtags.value,
      status: form.status.value
    });
    form.reset();
    await loadDashboard();
  });

  document.querySelector("[data-social-account-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await apiPost("/crm/social/accounts", {
      clientId: form.clientId.value,
      platform: form.platform.value,
      handle: form.handle.value
    });
    form.reset();
    await loadDashboard();
  });

  document.querySelector("[data-social-campaign-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await apiPost("/crm/social/campaigns", {
      clientId: form.clientId.value,
      name: form.name.value,
      objective: form.objective.value,
      budget: form.budget.value,
      startAt: form.startAt.value,
      endAt: form.endAt.value
    });
    form.reset();
    await loadDashboard();
  });

  document.querySelector("[data-section='social']")?.addEventListener("click", async (event) => {
    const approve = event.target.closest("[data-social-approve]");
    if (approve) {
      await apiPut(`/crm/social/posts/${encodeURIComponent(approve.dataset.socialApprove)}`, { status: "scheduled" });
      await loadDashboard();
      return;
    }
    const reject = event.target.closest("[data-social-reject]");
    if (reject) {
      const comment = prompt("Client comment / change request:") || "";
      await apiPut(`/crm/social/posts/${encodeURIComponent(reject.dataset.socialReject)}`, { status: "review", comment });
      await loadDashboard();
      return;
    }
    const remove = event.target.closest("[data-social-delete]");
    if (remove && confirm("Delete this content item?")) {
      await apiDelete(`/crm/social/posts/${encodeURIComponent(remove.dataset.socialDelete)}`);
      await loadDashboard();
    }
  });

  document.querySelector("[data-section='social']")?.addEventListener("change", async (event) => {
    const status = event.target.closest("[data-social-status-update]");
    if (!status) return;
    await apiPut(`/crm/social/posts/${encodeURIComponent(status.dataset.socialStatusUpdate)}`, { status: status.value });
    await loadDashboard();
  });

  document.querySelector("[data-section='reports']")?.addEventListener("click", (event) => {
    const view = event.target.closest("[data-view-report]");
    if (view) {
      openReportDrawer(view.dataset.viewReport);
      return;
    }
    const download = event.target.closest("[data-download-report], [data-report-download-pdf], [data-report-export-excel]");
    if (download) {
      const reportId = download.dataset.downloadReport || activeReportId;
      const report = currentReportRows.find((item) => item.id === reportId);
      if (report) reportToCsv(report);
      return;
    }
    if (event.target.closest("[data-report-email-client]")) {
      alert("Report email queued for client.");
    }
  });

  document.querySelectorAll("[data-close-report-drawer]").forEach((button) => {
    button.addEventListener("click", closeReportDrawer);
  });

  document.querySelector("[data-employee-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await apiPost("/crm/employees", {
      name: form.name.value,
      role: form.role.value,
      salary: form.salary.value,
      paid: form.paid.value === "true"
    });
    form.reset();
    await loadDashboard();
  });

  document.querySelector("[data-finance-client-options]")?.addEventListener("change", (event) => {
    renderFinanceProjectOptions(event.target.value);
  });

  document.querySelector("[data-expense-client-options]")?.addEventListener("change", (event) => {
    renderExpenseProjectOptions(event.target.value);
  });

  document.querySelector("[data-invoice-form]")?.addEventListener("input", (event) => {
    const form = event.currentTarget;
    const quantity = Number(form.quantity?.value || 1);
    const price = Number(form.price?.value || 0);
    if (form.amount) form.amount.value = Math.max(0, quantity * price);
  });

  document.querySelectorAll("[data-section='finance'], [data-section='employee-salary']").forEach((section) => section.addEventListener("click", async (event) => {
    const printInvoice = event.target.closest("[data-print-invoice]");
    if (printInvoice) {
      openInvoicePdf(printInvoice.dataset.printInvoice);
      return;
    }
    const deleteInvoice = event.target.closest("[data-delete-invoice]");
    if (deleteInvoice && confirm("Delete this invoice?")) {
      await apiDelete(`/crm/invoices/${encodeURIComponent(deleteInvoice.dataset.deleteInvoice)}`);
      await loadDashboard();
      return;
    }
    const deleteExpense = event.target.closest("[data-delete-expense]");
    if (deleteExpense && confirm("Delete this expense?")) {
      await apiDelete(`/crm/expenses/${encodeURIComponent(deleteExpense.dataset.deleteExpense)}`);
      await loadDashboard();
      return;
    }
    const editExpense = event.target.closest("[data-edit-expense]");
    if (editExpense) {
      const expense = (currentFinanceData?.expenses || []).find((item) => item.id === editExpense.dataset.editExpense);
      if (!expense) return;
      const title = prompt("Expense title:", expense.title || "");
      if (title === null) return;
      const amount = prompt("Amount:", expense.amount || 0);
      if (amount === null) return;
      await apiPut(`/crm/expenses/${encodeURIComponent(expense.id)}`, {
        ...expense,
        title,
        amount
      });
      await loadDashboard();
      return;
    }
    const employee = event.target.closest("[data-pay-employee]");
    if (employee) {
      await apiPut(`/crm/payroll/${encodeURIComponent(employee.dataset.payEmployee)}`, {});
      await loadDashboard();
      return;
    }
    const editEmployee = event.target.closest("[data-edit-employee]");
    if (editEmployee) {
      const employeeRow = (currentFinanceData?.employees || []).find((item) => item.id === editEmployee.dataset.editEmployee);
      if (!employeeRow) return;
      const name = prompt("Employee name:", employeeRow.name || "");
      if (name === null) return;
      const role = prompt("Role:", employeeRow.role || "");
      if (role === null) return;
      const salary = prompt("Monthly salary:", employeeRow.salary || 0);
      if (salary === null) return;
      await apiPut(`/crm/employees/${encodeURIComponent(employeeRow.id)}`, {
        name,
        role,
        salary,
        paid: employeeRow.paid
      });
      await loadDashboard();
      return;
    }
    const deleteEmployee = event.target.closest("[data-delete-employee]");
    if (deleteEmployee && confirm("Delete this employee salary record?")) {
      try {
        await apiDelete(`/crm/employees/${encodeURIComponent(deleteEmployee.dataset.deleteEmployee)}`);
        await loadDashboard();
      } catch (error) {
        alert(error.message === "Failed to fetch" ? "Backend is not running. Start the API first." : error.message);
      }
      return;
    }
    if (event.target.closest("[data-process-payroll]")) {
      const pendingEmployees = (currentFinanceData?.employees || []).filter((item) => !item.paid);
      for (const pendingEmployee of pendingEmployees) {
        await apiPut(`/crm/payroll/${encodeURIComponent(pendingEmployee.id)}`, {});
      }
      await loadDashboard();
      return;
    }
    if (event.target.closest("[data-export-finance-csv]")) {
      downloadFinanceCsv(currentFinanceData);
    }
  }));

  document.querySelector("[data-section='finance']")?.addEventListener("change", async (event) => {
    const statusSelect = event.target.closest("[data-invoice-status-update]");
    if (!statusSelect) return;
    const invoice = (currentFinanceData?.invoices || []).find((item) => item.id === statusSelect.dataset.invoiceStatusUpdate);
    if (!invoice) return;
    statusSelect.disabled = true;
    try {
      await apiPut(`/crm/invoices/${encodeURIComponent(invoice.id)}`, {
        paymentStatus: statusSelect.value,
        paidAmount: statusSelect.value === "paid" ? invoice.amount : 0
      });
      await loadDashboard();
    } catch (error) {
      statusSelect.value = invoice.payment_status;
      alert(error.message === "Failed to fetch" ? "Backend is not running. Start the API first." : error.message);
    } finally {
      statusSelect.disabled = false;
    }
  });

  document.querySelector("[data-ticket-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await apiPost("/crm/tickets", {
      subject: form.subject.value,
      description: form.details.value
    });
    form.reset();
    await loadDashboard();
    alert("Support ticket created.");
  });
}

renderUser();
bindNavigation();
bindNotifications();
bindShellActions();
bindForms();
loadDashboard();
