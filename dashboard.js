const TOKEN_KEY = "gm_institute_token";
const USER_KEY = "gm_institute_user";

let auth = null;
let db = null;
let studentsCache = [];

function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function firebaseReady() {
  return window.firebase && window.GK_FIREBASE_CONFIG && !String(window.GK_FIREBASE_CONFIG.apiKey || "").includes("PASTE_");
}

function showFatal(message) {
  document.querySelector(".dash-main").innerHTML = '<article class="dash-panel"><h1>Setup Required</h1><p>' + message + '</p><p>Configure Firebase in config.js and create admin user in Firebase Authentication.</p></article>';
}

function initFirebase() {
  if (!firebaseReady()) {
    showFatal("Firebase is not configured.");
    return false;
  }
  if (!firebase.apps.length) firebase.initializeApp(window.GK_FIREBASE_CONFIG);
  auth = firebase.auth();
  db = firebase.firestore();
  return true;
}

function initials(name) {
  return String(name || "GK").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "GK";
}

function normalizeMoney(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function syncFeesStatus(student) {
  const total = normalizeMoney(student.totalFees);
  const paid = normalizeMoney(student.paidAmount);
  if (total && paid >= total) return "Paid";
  if (paid > 0) return "Part Paid";
  return student.fees || "Pending";
}

function calcPayments(students) {
  return students.reduce((acc, student) => {
    const total = normalizeMoney(student.totalFees);
    const paid = Math.min(normalizeMoney(student.paidAmount), total || normalizeMoney(student.paidAmount));
    acc.total += total;
    acc.paid += paid;
    acc.pending += Math.max(total - paid, 0);
    return acc;
  }, { total: 0, paid: 0, pending: 0 });
}

function readPhotoFile(file) {
  return new Promise((resolve) => {
    if (!file) return resolve("");
    const fileName = String(file.name || "").toLowerCase();
    const canPreview = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(fileName);
    if (!canPreview || /\.(arw|raw|cr2|nef|dng)$/i.test(fileName)) return resolve("");
    const reader = new FileReader();
    reader.onerror = () => resolve("");
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(String(reader.result || ""));
      image.onload = () => {
        const maxSide = 720;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function nextStudentId() {
  const year = new Date().getFullYear();
  return "GK" + year + String(Date.now()).slice(-5);
}

async function fetchStudents() {
  let snap;
  try {
    snap = await db.collection("students").orderBy("createdAt", "desc").get();
  } catch (error) {
    snap = await db.collection("students").get();
  }
  studentsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderStudents();
}

async function saveStudent(student) {
  await db.collection("students").doc(student.id).set(student, { merge: true });
  await fetchStudents();
}

async function deleteStudent(id) {
  await db.collection("students").doc(id).delete();
  await fetchStudents();
}

function setActiveSection(sectionName) {
  document.querySelectorAll(".sidebar-button").forEach(button => button.classList.toggle("active", button.dataset.sectionTarget === sectionName));
  document.querySelectorAll(".section-panel").forEach(section => section.classList.toggle("active", section.dataset.section === sectionName));
  document.querySelector(".sidebar")?.classList.remove("is-open");
}

function studentPhoto(student) {
  return student.photo ? '<img src="' + student.photo + '" alt="' + student.name + '">' : '<span>' + initials(student.name) + '</span>';
}

function renderStats(students) {
  const payment = calcPayments(students);
  const completed = students.filter(student => student.status === "Completd" || student.status === "Placed").length;
  document.querySelector("[data-stats]").innerHTML = [
    ["Students", students.length, "Total records"],
    ["Completed", completed, "Completed or placed"],
    ["Revenue", money(payment.paid), "Received amount"],
    ["Pending", money(payment.pending), "Balance amount"]
  ].map(([label, value, note]) => '<article class="stat-card"><span>' + label + '</span><strong>' + value + '</strong><span>' + note + '</span></article>').join("");
  document.querySelector("[data-payment-stats]").innerHTML = [
    ["Total Fees", money(payment.total), "Expected revenue"],
    ["Received", money(payment.paid), "Collected"],
    ["Pending", money(payment.pending), "To collect"],
    ["Students", students.length, "Records"]
  ].map(([label, value, note]) => '<article class="stat-card"><span>' + label + '</span><strong>' + value + '</strong><span>' + note + '</span></article>').join("");
  document.querySelector("[data-payment-summary]").innerHTML = '<p>Total Fees <strong>' + money(payment.total) + '</strong></p><p>Received <strong>' + money(payment.paid) + '</strong></p><p>Pending <strong>' + money(payment.pending) + '</strong></p>';
}

function renderBars(students) {
  const counts = students.reduce((acc, student) => {
    acc[student.course] = (acc[student.course] || 0) + 1;
    return acc;
  }, {});
  const max = Math.max(1, ...Object.values(counts));
  document.querySelector("[data-course-bars]").innerHTML = Object.entries(counts).map(([course, count]) => '<i title="' + course + ': ' + count + '" style="--h:' + Math.max(24, Math.round((count / max) * 100)) + '%"></i>').join("") || "<p>No student data yet.</p>";
}

function renderPayments(students) {
  const holder = document.querySelector("[data-payment-list]");
  if (!holder) return;
  holder.innerHTML = students.map(student => {
    const total = normalizeMoney(student.totalFees);
    const paid = normalizeMoney(student.paidAmount);
    const pending = Math.max(total - paid, 0);
    return '<article class="payment-card"><div><h3>' + student.name + '</h3><p>' + student.id + ' · ' + student.course + '</p></div><div><span>Total</span><strong>' + money(total) + '</strong></div><div><span>Received</span><strong>' + money(paid) + '</strong></div><div><span>Pending</span><strong>' + money(pending) + '</strong></div><div><span>Mode</span><strong>' + (student.paymentMode || "-") + '</strong></div><button class="small-action" data-edit-student="' + student.id + '" type="button">Edit Payment</button></article>';
  }).join("") || "<article class='dash-panel'><h2>No payment records</h2><p>Add students to track payment details.</p></article>";
}

function renderStudents() {
  const search = document.querySelector("[data-search]")?.value.trim().toLowerCase() || "";
  const students = studentsCache.map(student => ({ ...student, fees: syncFeesStatus(student) }));
  const filtered = students.filter(student => [student.id, student.name, student.phone, student.course, student.status].join(" ").toLowerCase().includes(search));
  const grid = document.querySelector("[data-student-grid]");
  if (grid) {
    grid.innerHTML = filtered.map(student => {
      const pending = Math.max(normalizeMoney(student.totalFees) - normalizeMoney(student.paidAmount), 0);
      return '<article class="student-card"><div class="student-card-head"><strong>' + student.name + '</strong><span>' + student.id + '</span></div><div class="student-card-photo">' + studentPhoto(student) + '</div><div class="student-card-body"><p>Course <strong>' + student.course + '</strong></p><p>Year Passed Out <strong>' + (student.yearPassedOut || "-") + '</strong></p><p>Phone <strong>' + (student.phone || "-") + '</strong></p><p>Status <strong class="fee-pill">' + (student.status || "Studying") + '</strong></p><p>Fees <strong class="fee-pill">' + student.fees + '</strong></p><p>Paid <strong>' + money(student.paidAmount) + '</strong></p><p>Pending <strong>' + money(pending) + '</strong></p></div><div class="student-actions"><button class="small-action" data-edit-student="' + student.id + '" type="button">Edit</button><button class="small-action danger-action" data-remove-student="' + student.id + '" type="button">Remove</button></div></article>';
    }).join("") || "<article class='dash-panel'><h2>No students found</h2><p>Add a new student. Records will be stored in Firestore.</p></article>";
  }
  renderPayments(students);
  renderStats(students);
  renderBars(students);
}

function fillForm(student) {
  const form = document.querySelector("[data-student-form]");
  form.editingId.value = student.id;
  form.name.value = student.name || "";
  form.registerNo.value = student.id || "";
  form.phone.value = student.phone || "";
  form.course.value = student.course || "AC Technician Course";
  if (form.yearPassedOut) form.yearPassedOut.value = student.yearPassedOut || "";
  form.status.value = student.status || "Studying";
  form.fees.value = student.fees || "Pending";
  form.totalFees.value = student.totalFees || "";
  form.paidAmount.value = student.paidAmount || "";
  form.paymentMode.value = student.paymentMode || "Cash";
  form.address.value = student.address || "";
  form.paymentNote.value = student.paymentNote || "";
  document.querySelector("[data-form-title]").textContent = "Edit Student";
  setActiveSection("students");
}

async function handleStudentSubmit(event) {
  event.preventDefault();
  const message = document.querySelector("[data-form-message]");
  if (message) message.textContent = "Saving student record...";
  const form = event.currentTarget;
  const editingId = form.editingId.value;
  const existing = studentsCache.find(student => student.id === editingId);
  const photoFile = form.photo?.files?.[0];
  const newPhoto = await readPhotoFile(photoFile);
  const id = form.registerNo.value.trim() || editingId || nextStudentId();
  const student = {
    id,
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    course: form.course.value,
    yearPassedOut: (form.yearPassedOut?.value || form.batch?.value || "").trim().slice(0, 4),
    fees: form.fees.value,
    status: form.status.value,
    totalFees: normalizeMoney(form.totalFees.value),
    paidAmount: normalizeMoney(form.paidAmount.value),
    paymentMode: form.paymentMode.value,
    paymentNote: form.paymentNote.value.trim(),
    photo: newPhoto || existing?.photo || "",
    photoFileName: photoFile?.name || existing?.photoFileName || "",
    address: form.address.value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: existing?.createdAt || firebase.firestore.FieldValue.serverTimestamp()
  };
  student.fees = syncFeesStatus(student);
  try {
    await saveStudent(student);
  } catch (error) {
    if (message) message.textContent = "Student not saved. Check Firestore rules, admin login, and internet connection.";
    console.error("Student save failed", error);
    return;
  }
  form.reset();
  form.editingId.value = "";
  document.querySelector("[data-form-title]").textContent = "Add Student";
  document.querySelector("[data-form-message]").textContent = "Saved student record " + student.id + ".";
  setActiveSection("profiles");
}

document.querySelectorAll("[data-section-target]").forEach(button => button.addEventListener("click", () => setActiveSection(button.dataset.sectionTarget)));
document.querySelector("[data-open-add]")?.addEventListener("click", () => setActiveSection("students"));
document.querySelector("[data-student-form]")?.addEventListener("submit", handleStudentSubmit);
document.querySelector("[data-search]")?.addEventListener("input", renderStudents);
document.querySelector("[data-sidebar-toggle]")?.addEventListener("click", () => document.querySelector(".sidebar")?.classList.toggle("is-open"));
document.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit-student]");
  if (editButton) {
    const student = studentsCache.find(item => item.id === editButton.dataset.editStudent);
    if (student) fillForm(student);
  }
  const removeButton = event.target.closest("[data-remove-student]");
  if (removeButton) await deleteStudent(removeButton.dataset.removeStudent);
});
document.querySelector("[data-logout]")?.addEventListener("click", async () => {
  await auth?.signOut();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  location.href = "login.html";
});

if (initFirebase()) {
  auth.onAuthStateChanged(user => {
    if (!user) {
      location.href = "login.html";
      return;
    }
    fetchStudents().catch(() => showFatal("Could not load student database. Check Firestore rules and internet connection."));
  });
}


// Certificate admin extension
function renderCertificateAdmin() {
  const select = document.querySelector("[data-certificate-student]");
  const list = document.querySelector("[data-certificate-admin-list]");
  if (!select || !list) return;
  const selected = select.value;
  select.innerHTML = '<option value="">Select student</option>' + studentsCache.map(student => '<option value="' + student.id + '">' + (student.name || '-') + ' - ' + student.id + '</option>').join('');
  select.value = selected;
  list.innerHTML = studentsCache.map(student => {
    const cert = student.certificate || {};
    const status = cert.status || "Not Issued";
    return '<article class="certificate-admin-card"><div><h3>' + (student.name || '-') + '</h3><p>' + student.id + ' · ' + (student.course || '-') + '</p></div><div><span>Certificate No</span><strong>' + (cert.number || '-') + '</strong></div><div><span>Status</span><strong>' + status + '</strong></div><div><span>Issued</span><strong>' + (cert.issueDate || '-') + '</strong></div><button class="small-action" data-edit-certificate="' + student.id + '" type="button">Edit Certificate</button></article>';
  }).join("") || "<article class='dash-panel'><h2>No students found</h2><p>Add students before updating certificates.</p></article>";
}

const originalRenderStudentsForCertificates = renderStudents;
renderStudents = function() {
  originalRenderStudentsForCertificates();
  renderCertificateAdmin();
};

function fillCertificateForm(student) {
  const form = document.querySelector("[data-certificate-form]");
  if (!form || !student) return;
  const cert = student.certificate || {};
  form.studentId.value = student.id;
  form.certificateNo.value = cert.number || "";
  form.certificateTitle.value = cert.title || student.course || "";
  form.certificateIssueDate.value = cert.issueDate || "";
  form.certificateStatus.value = cert.status || "Not Issued";
  form.certificateNote.value = cert.note || "";
  if (form.certificateFile) form.certificateFile.value = "";
  setActiveSection("certificates");
}

document.querySelector("[data-certificate-form]")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("[data-certificate-message]");
  const student = studentsCache.find(item => item.id === form.studentId.value);
  if (!student) {
    if (message) message.textContent = "Select a student first.";
    return;
  }
  const certificateFile = form.certificateFile?.files?.[0];
  const newCertificateImage = certificateFile ? await readPhotoFile(certificateFile) : "";
  const certificate = {
    number: form.certificateNo.value.trim(),
    title: form.certificateTitle.value.trim() || student.course || "",
    issueDate: form.certificateIssueDate.value,
    status: form.certificateStatus.value,
    note: form.certificateNote.value.trim(),
    image: newCertificateImage || student.certificate?.image || "",
    imageFileName: certificateFile?.name || student.certificate?.imageFileName || "",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    if (message) message.textContent = "Saving certificate...";
    await db.collection("students").doc(student.id).set({ certificate, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    if (message) message.textContent = "Certificate updated for " + student.name + ".";
    await fetchStudents();
  } catch (error) {
    console.error("Certificate update failed", error);
    if (message) message.textContent = "Certificate not saved. Check admin login, internet, and Firestore rules.";
  }
});

document.querySelector("[data-certificate-student]")?.addEventListener("change", event => {
  const student = studentsCache.find(item => item.id === event.target.value);
  if (student) fillCertificateForm(student);
});

document.querySelector("[data-clear-certificate]")?.addEventListener("click", () => {
  document.querySelector("[data-certificate-form]")?.reset();
  const message = document.querySelector("[data-certificate-message]");
  if (message) message.textContent = "";
});

document.addEventListener("click", event => {
  const button = event.target.closest("[data-edit-certificate]");
  if (!button) return;
  const student = studentsCache.find(item => item.id === button.dataset.editCertificate);
  if (student) fillCertificateForm(student);
});


// Certificate detail upload extension
document.addEventListener("change", event => {
  if (!event.target.matches("input[name='certificateFile']")) return;
  const message = document.querySelector("[data-certificate-message]");
  if (message && event.target.files?.[0]) {
    message.textContent = "Certificate file selected: " + event.target.files[0].name;
  }
});
