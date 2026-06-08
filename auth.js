const TOKEN_KEY = "gm_institute_token";
const USER_KEY = "gm_institute_user";

function firebaseReady() {
  return window.firebase && window.GK_FIREBASE_CONFIG && !String(window.GK_FIREBASE_CONFIG.apiKey || "").includes("PASTE_");
}

function setMessage(text) {
  const message = document.querySelector("[data-auth-message]");
  if (!message) return;
  message.textContent = text;
  message.classList.add("is-visible");
}

function initFirebase() {
  if (!firebaseReady()) {
    setMessage("Firebase is not configured. Add your Firebase project values in config.js.");
    return null;
  }
  if (!firebase.apps.length) firebase.initializeApp(window.GK_FIREBASE_CONFIG);
  return firebase.auth();
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  if (!email || !password) {
    setMessage("Enter admin email and password.");
    return;
  }
  const auth = initFirebase();
  if (!auth) return;
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    localStorage.setItem(TOKEN_KEY, await result.user.getIdToken());
    localStorage.setItem(USER_KEY, JSON.stringify({ name: "Institute Admin", email, uid: result.user.uid, role: "admin" }));
    setMessage("Opening student admin...");
    location.href = "admin-dashboard.html";
  } catch (error) {
    setMessage("Login failed. Check admin email/password.");
  }
}

document.querySelector("[data-login-form]")?.addEventListener("submit", handleLogin);
