const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

document.body.classList.add("js-ready");

document.querySelectorAll(".nav-links > a.nav-link").forEach(link => {
  if (link.textContent.trim() !== "Courses Offered") return;
  const prefix = link.getAttribute("href")?.startsWith("../") ? "../" : "";
  const dropdown = document.createElement("div");
  dropdown.className = "nav-dropdown";
  dropdown.innerHTML = `
    <a class="nav-link ${link.classList.contains("active") ? "active" : ""}" href="${prefix}academy.html">Courses Offered</a>
    <div class="course-menu">
      <a href="${prefix}academy/website-development.html">AC Technician Practical</a>
      <a href="${prefix}academy/ui-ux-design.html">Fridge Repair Practical</a>
      <a href="${prefix}academy/digital-marketing.html">RO Filter Service</a>
      <a href="${prefix}academy/video-animation-vfx.html">Washing Machine Service</a>
    </div>
  `;
  link.replaceWith(dropdown);
});

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach(item => revealObserver.observe(item));

document.querySelectorAll(".marquee-track").forEach(track => {
  if (track.dataset.cloned) return;
  track.dataset.cloned = "true";
  [...track.children].forEach(item => track.appendChild(item.cloneNode(true)));
});

document.querySelectorAll(".brand-track").forEach(track => {
  if (track.dataset.cloned) return;
  track.dataset.cloned = "true";
  [...track.children].forEach(item => track.appendChild(item.cloneNode(true)));
});

if (!document.querySelector(".floating-actions")) {
  const scriptSrc = document.currentScript?.getAttribute("src") || "";
  const assetPrefix = scriptSrc.startsWith("../") ? "../" : "";
  const floatingActions = document.createElement("div");
  floatingActions.className = "floating-actions";
  floatingActions.innerHTML = `
    <a class="float-btn community" href="${assetPrefix}contact.html" aria-label="Support"><img src="${assetPrefix}images/support-headset.webp" alt=""></a>
    <a class="float-btn whatsapp" href="https://wa.me/919876543210" target="_blank" rel="noreferrer" aria-label="WhatsApp"><img src="${assetPrefix}images/whatsapp-logo.svg" alt=""></a>
  `;
  document.querySelector(".page-shell")?.appendChild(floatingActions);
}

const posterModal = document.querySelector("[data-poster-modal]");
const posterClose = document.querySelector("[data-poster-close]");
if (posterModal && !localStorage.getItem("gm_home_poster_seen")) {
  posterModal.classList.add("is-visible");
  posterModal.setAttribute("aria-hidden", "false");
}
function closePoster() {
  if (!posterModal) return;
  posterModal.classList.remove("is-visible");
  posterModal.setAttribute("aria-hidden", "true");
  localStorage.setItem("gm_home_poster_seen", "1");
}
posterClose?.addEventListener("click", closePoster);
posterModal?.addEventListener("click", event => {
  if (event.target === posterModal) closePoster();
});


document.querySelectorAll("[data-quiz-toggle]").forEach(button => {
  button.addEventListener("click", () => {
    const quizList = button.closest(".quiz-panel")?.querySelector("[data-quiz-list]");
    if (!quizList) return;
    const isHidden = quizList.hasAttribute("hidden");
    quizList.toggleAttribute("hidden", !isHidden);
    button.textContent = isHidden ? "Hide Quiz" : "Start Quiz";
  });
});

function initialsFromName(name) {
  return String(name || "GK").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "GK";
}




// FormSubmit contact handler
document.querySelector("[data-contact-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const message = form.querySelector("[data-contact-message]");
  const originalText = button?.textContent || "Submit Enquiry";
  const formData = new FormData(form);

  if (button) {
    button.disabled = true;
    button.textContent = "Sending...";
  }
  if (message) message.textContent = "";

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("Unable to submit");
    form.reset();
    if (message) message.textContent = "Enquiry submitted successfully. We will contact you soon.";
  } catch (error) {
    const subject = encodeURIComponent("New Contact Enquiry - G.K Home Appliances Institute");
    const lines = [];
    formData.forEach((value, key) => {
      if (!key.startsWith("_")) lines.push(key + ": " + value);
    });
    window.location.href = "mailto:kishorebabu182005@gmail.com?subject=" + subject + "&body=" + encodeURIComponent(lines.join("\n"));
    if (message) message.textContent = "Opening email app. Please send the prepared enquiry mail.";
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
});
