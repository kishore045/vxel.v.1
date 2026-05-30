const isLocalApp = ["", "localhost", "127.0.0.1"].includes(location.hostname);
const API_BASES = [
  window.VIXELRY_API_BASE,
  location.protocol.startsWith("http") ? `${location.origin}/api` : "",
  isLocalApp ? "http://localhost:4000/api" : "",
  isLocalApp ? "http://127.0.0.1:4000/api" : ""
].filter(Boolean);
const TOKEN_KEY = "vixelry_api_token";
const USER_KEY = "vixelry_api_user";
const MIN_AUTH_LOADER_MS = 5000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setAuthLoading(isLoading, text = "Opening dashboard...") {
  let overlay = document.querySelector("[data-auth-loader]");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "app-loader";
    overlay.dataset.authLoader = "true";
    overlay.innerHTML = `<div class="loader-dots" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div><strong data-loader-text>Loading...</strong>`;
    document.body.appendChild(overlay);
  }
  overlay.querySelector("[data-loader-text]").textContent = text;
  overlay.classList.toggle("is-visible", isLoading);
  document.querySelectorAll(".auth-button").forEach((button) => {
    button.disabled = isLoading;
  });
}

function setMessage(text, type = "error") {
  const message = document.querySelector("[data-auth-message]");
  if (!message) return;
  message.textContent = text;
  message.classList.add("is-visible");
  message.classList.toggle("success", type === "success");
}

async function apiPost(path, body) {
  let lastError;
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Request failed.");
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Request failed.");
}

function redirectByRole(user) {
  location.href = user.role === "admin" ? "admin-dashboard.html" : "client-dashboard.html";
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const startedAt = Date.now();
  setAuthLoading(true, "Checking login...");
  try {
    const payload = await apiPost("/auth/login", {
      email: form.email.value,
      password: form.password.value
    });
    localStorage.setItem(TOKEN_KEY, payload.token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    setAuthLoading(true, "Opening dashboard...");
    await wait(Math.max(0, MIN_AUTH_LOADER_MS - (Date.now() - startedAt)));
    redirectByRole(payload.user);
  } catch (error) {
    setAuthLoading(false);
    setMessage(error.message === "Failed to fetch"
      ? "Backend is not running. Start the Node.js API first."
      : error.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const startedAt = Date.now();
  setAuthLoading(true, "Creating account...");
  try {
    const registerPayload = {
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      role: form.role.value,
      inviteCode: form.inviteCode?.value || ""
    };
    const payload = await apiPost("/auth/register", registerPayload);
    const session = payload.token
      ? payload
      : await apiPost("/auth/login", {
        email: registerPayload.email,
        password: registerPayload.password
      });
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setMessage("Account created. Opening your dashboard...", "success");
    setAuthLoading(true, "Opening dashboard...");
    await wait(Math.max(0, MIN_AUTH_LOADER_MS - (Date.now() - startedAt)));
    redirectByRole(session.user);
  } catch (error) {
    setAuthLoading(false);
    setMessage(error.message === "Failed to fetch"
      ? "Backend is not running. Start the Node.js API first."
      : error.message);
  }
}

async function handleForgot(event) {
  event.preventDefault();
  try {
    const payload = await apiPost("/auth/forgot-password", {
      email: event.currentTarget.email.value
    });
    const resetText = payload.resetToken
      ? `Reset token generated. Paste this token on reset page: ${payload.resetToken}`
      : payload.message;
    setMessage(resetText, "success");
  } catch (error) {
    setMessage(error.message === "Failed to fetch"
      ? "Backend is not running. Start the Node.js API first."
      : error.message);
  }
}

async function handleReset(event) {
  event.preventDefault();
  const token = new URLSearchParams(location.search).get("token") || event.currentTarget.token.value;
  try {
    await apiPost("/auth/reset-password", {
      token,
      password: event.currentTarget.password.value
    });
    setMessage("Password updated. Login with the new password.", "success");
    event.currentTarget.reset();
  } catch (error) {
    setMessage(error.message === "Failed to fetch"
      ? "Backend is not running. Start the Node.js API first."
      : error.message);
  }
}

function bindAuthPage() {
  document.querySelector("[data-login-form]")?.addEventListener("submit", handleLogin);
  document.querySelector("[data-register-form]")?.addEventListener("submit", handleRegister);
  document.querySelector("[data-forgot-form]")?.addEventListener("submit", handleForgot);
  document.querySelector("[data-reset-form]")?.addEventListener("submit", handleReset);

  const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  const token = localStorage.getItem(TOKEN_KEY);
  if (document.body.dataset.authPage === "login" && user && token) redirectByRole(user);
}

bindAuthPage();
