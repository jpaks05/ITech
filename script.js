"use strict";

/* ==========================================================
   Helpers
   ========================================================== */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const BASE_TITLE = document.title;
const COMPANY = BASE_TITLE.split(" |")[0];
/* Contact email is read from the page, so it is only written once (in index.html). */
const EMAIL = document.querySelector('a[data-contact="email"]').textContent.trim();

/* ---------- Image fallbacks (missing files never show a broken icon) ---------- */
function imageFallback(img) {
  const mode = img.dataset.fb;
  if (!mode || img.dataset.failed) return;
  img.dataset.failed = "1";
  console.warn("Image not found: " + img.getAttribute("src"));
  if (mode === "initials") {
    img.replaceWith(document.createTextNode(img.dataset.i || ""));
  } else if (mode === "noimg") {
    img.outerHTML = '<div class="noimg">Image coming soon</div>';
  } else if (mode === "hide-media") {
    const wrap = img.closest(".about-media-wrapper");
    if (wrap) wrap.remove();
    const grid = document.querySelector(".about-grid");
    if (grid) grid.classList.add("no-media");
  }
}
document.addEventListener("error", (e) => {
  if (e.target instanceof HTMLImageElement) imageFallback(e.target);
}, true);

$("year").textContent = new Date().getFullYear();

/* ==========================================================
   Modal (focus stays inside while open)
   ========================================================== */
const modal = $("modal"), modalBox = modal.querySelector(".modal-box");
let lastFocus = null;

let closeTimer = 0;
function openModal(html) {
  clearTimeout(closeTimer);
  modal.classList.remove("closing");
  if (modal.hidden) lastFocus = document.activeElement;
  $("modalBody").innerHTML = html;
  modal.hidden = false;
  modalBox.scrollTop = 0;
  document.body.style.overflow = "hidden";
  $("modalClose").focus();
}
function closeModal() {
  if (modal.hidden || modal.classList.contains("closing")) return;
  const finish = () => {
    modal.hidden = true;
    modal.classList.remove("closing");
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  };
  if (reduceMotion) return finish();
  modal.classList.add("closing");
  closeTimer = setTimeout(finish, 200);
}
$("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

/* ---------- Full-screen photo viewer ---------- */
const lightbox = $("lightbox"), lbImg = $("lightboxImg");
let lbFocus = null;

function openLightbox(src, alt) {
  lbFocus = document.activeElement;
  lbImg.src = src;
  lbImg.alt = alt;
  $("lightboxCap").textContent = alt;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  $("lightboxClose").focus();
}
function closeLightbox() {
  if (lightbox.hidden) return;
  lightbox.hidden = true;
  lbImg.removeAttribute("src");
  if (modal.hidden) document.body.style.overflow = "";
  if (lbFocus && typeof lbFocus.focus === "function") lbFocus.focus();
}
$("lightboxClose").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target !== lbImg) closeLightbox(); });

/* ==========================================================
   Navigation, scroll progress and active link
   ========================================================== */
const nav = $("nav"), menuBtn = $("menuBtn");
const setMenu = (open) => {
  nav.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.textContent = open ? "Close" : "Menu";
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
};
menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("click", (e) => {
  if (nav.classList.contains("open") && !e.target.closest("#nav, #menuBtn")) setMenu(false);
});

/* One keyboard handler: Escape closes the modal or menu, Tab is trapped in the modal */
document.addEventListener("keydown", (e) => {
  if (!lightbox.hidden) {
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "Tab") { e.preventDefault(); $("lightboxClose").focus(); }
    return;
  }
  if (!modal.hidden) {
    if (e.key === "Escape") return closeModal();
    if (e.key !== "Tab") return;
    const f = [...modalBox.querySelectorAll("a[href], button")];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return;
  }
  if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); }
});

const links = [...nav.querySelectorAll("a")];
const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
const toTop = $("toTop"), progress = $("progress"), header = $("siteHeader");
let lastTitle = "";

function setTitle(label) {
  const t = label ? `${COMPANY} | ${label}` : BASE_TITLE;
  if (t !== lastTitle) { document.title = t; lastTitle = t; }
}

function updateScrollUI() {
  const line = 140;
  let current = -1;
  sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= line) current = i; });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections.length - 1;
  links.forEach((a, i) => {
    a.classList.toggle("active", i === current);
    if (i === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
  });
  setTitle(current >= 0 ? links[current].textContent.trim() : "");

  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
  header.classList.toggle("scrolled", window.scrollY > 8);
  toTop.classList.toggle("show", window.scrollY >= 500);
}
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { updateScrollUI(); ticking = false; });
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);

/* ==========================================================
   Team (cards and profiles are written in index.html)
   ========================================================== */
$("teamGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-member]");
  if (b) openModal($("member-" + b.dataset.member).innerHTML);
});

/* ==========================================================
   Projects (cards and details are written in index.html;
   filters are built from each card's data-category)
   ========================================================== */
const projectCards = [...document.querySelectorAll("#projectGrid .project")];
const categories = ["All", ...new Set(projectCards.map((c) => c.dataset.category))];
const countOf = (c) => (c === "All" ? projectCards.length : projectCards.filter((p) => p.dataset.category === c).length);
let activeCat = "All";

$("filters").innerHTML = categories.map((c) =>
  `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === activeCat}">${esc(c)}<small>${countOf(c)}</small></button>`).join("");

function renderProjects(animate) {
  const shown = [];
  projectCards.forEach((card) => {
    const on = activeCat === "All" || card.dataset.category === activeCat;
    card.hidden = !on;
    card.classList.remove("pop");
    if (!on) return;
    if (animate) {
      void card.offsetWidth; /* restart the pop animation */
      card.style.setProperty("--d", shown.length * 70 + "ms");
      card.classList.add("pop");
    }
    shown.push(card.querySelector("h3").textContent);
  });
  $("filterStatus").textContent = activeCat === "All"
    ? `Showing all ${shown.length} projects`
    : `Showing ${shown.length} ${activeCat} project${shown.length === 1 ? "" : "s"}: ${shown.join(", ")}`;
}

$("filters").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b || b.dataset.cat === activeCat) return;
  activeCat = b.dataset.cat;
  $("filters").querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
  renderProjects(true);
});

$("projectGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-project]");
  if (b) openModal($("project-" + b.dataset.project).innerHTML);
});
/* Click the photo (or the expand button) to open it full screen */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-zoom], .thumb img, .modal-img img");
  if (!t) return;
  const box = t.closest(".thumb, .modal-img");
  const img = box && box.querySelector("img");
  if (img && img.getAttribute("src")) openLightbox(img.currentSrc || img.src, img.alt);
});
renderProjects(false);

/* ==========================================================
   Contact form
   ========================================================== */
const form = $("contactForm");
let autoMsg = "";

function check(inputId, errId, ok, msg) {
  $(errId).textContent = ok ? "" : msg;
  $(inputId).closest("label").classList.toggle("invalid", !ok);
  $(inputId).setAttribute("aria-invalid", String(!ok));
  return ok;
}

/* "Ask about this": title and price are read from the offer card in index.html */
$("offerGrid").addEventListener("click", (e) => {
  const a = e.target.closest("[data-offer]");
  if (!a) return;
  const card = a.closest(".offer"), msgBox = $("cMsg");
  const title = card.querySelector("h3").textContent.trim();
  const price = card.querySelector(".price").textContent.trim();
  $("cService").value = title;
  if (!msgBox.value.trim() || msgBox.value === autoMsg) {
    autoMsg = `Hello, I am interested in ${title} (${price}). Please send me more details and the next steps.`;
    msgBox.value = autoMsg;
  }
  check("cMsg", "eMsg", true, "");
});

const fieldErrors = { cName: "eName", cEmail: "eEmail", cMsg: "eMsg" };
Object.keys(fieldErrors).forEach((id) => {
  $(id).addEventListener("input", () => {
    $(id).closest("label").classList.remove("invalid");
    $(id).removeAttribute("aria-invalid");
    $(fieldErrors[id]).textContent = "";
    $("formStatus").textContent = "";
    $("formStatus").className = "status";
  });
});

/* Messages are sent to our Gmail inbox through EmailJS.
   If the service fails, the form falls back to the visitor's email app. */

/* ---- EmailJS credentials (set once here) ---- */
const EMAILJS_PUBLIC_KEY = "BxvA2ZxunXo0siLCm";
const EMAILJS_SERVICE_ID = "service_ho4iagd";
const EMAILJS_TEMPLATE_ID = "template_5wic99f";

/* Initialise EmailJS as soon as the SDK is available */
(function initEmailJS() {
  if (typeof emailjs !== "undefined") {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  } else {
    window.addEventListener("load", () => emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }));
  }
})();

const sendBtn = form.querySelector(".btn-submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("cName").value.trim();
  const email = $("cEmail").value.trim();
  const msg = $("cMsg").value.trim();
  const okName = check("cName", "eName", name.length >= 2, "Enter your name.");
  const okEmail = check("cEmail", "eEmail", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email), "Enter a valid email address.");
  const okMsg = check("cMsg", "eMsg", msg.length >= 10, "Write at least 10 characters.");
  const status = $("formStatus");
  status.className = "status";
  if (!(okName && okEmail && okMsg)) {
    status.textContent = "Fix the highlighted fields and send again.";
    form.querySelector(".invalid input, .invalid textarea").focus();
    return;
  }
  const service = $("cService").value;
  sendBtn.disabled = true;
  status.textContent = "Sending your message...";
  try {
    /* Variable names must exactly match the placeholders in your EmailJS template */
    const now = new Date();
    const time = now.toLocaleString("en-PH", {
      month: "long", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true
    });
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      name: name,     /* {{name}}       — sender full name     */
      from_email: email,    /* {{from_email}} — sender email address */
      service: service,  /* {{service}}    — service selected     */
      time: time,     /* {{time}}       — submission time      */
      message: msg,      /* {{message}}    — project details only */
      reply_to: email
    });
    status.className = "status ok";
    status.textContent = "Thank you! Your message was sent. We will reply to your email during business hours.";
    form.reset();
    autoMsg = "";
  } catch (err) {
    console.warn("Contact form (EmailJS):", err);
    const subject = encodeURIComponent(`${service} - from ${name}`);
    const body = encodeURIComponent(`${msg}\n\nName: ${name}\nEmail: ${email}`);
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
    status.className = "status ok";
    status.innerHTML = `We could not send it from the website, so your email app is opening instead. If nothing opens, email us at <a href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a>.`;
  } finally {
    sendBtn.disabled = false;
  }
});

/* ==========================================================
   FAQ accordion (questions and answers are written in index.html)
   ========================================================== */
const faqBox = $("faqAccordion");

faqBox.addEventListener("click", (e) => {
  const btn = e.target.closest(".faq-q");
  if (!btn) return;
  const willOpen = btn.getAttribute("aria-expanded") !== "true";
  faqBox.querySelectorAll(".faq-item").forEach((item) => {
    const b = item.querySelector(".faq-q");
    const open = b === btn && willOpen;
    item.classList.toggle("open", open);
    b.setAttribute("aria-expanded", String(open));
  });
});

/* ==========================================================
   Loading screen
   ========================================================== */
const startedAt = performance.now();
let shown = false;
function showSite() {
  if (shown) return;
  shown = true;
  document.documentElement.classList.add("loaded");
  setTimeout(() => { const l = $("loader"); if (l) l.remove(); }, 900);
}
function whenReady() {
  const wait = reduceMotion ? 0 : Math.max(0, 800 - (performance.now() - startedAt));
  setTimeout(showSite, wait);
}
if (document.readyState === "complete") whenReady();
else window.addEventListener("load", whenReady);
setTimeout(showSite, 3000); /* safety: never block the page */

/* ==========================================================
   Scroll entrance animations
   ========================================================== */
(function () {
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  const targets = [
    ".section h2", ".section .sub", ".about-lead", ".about-subtext", ".about-cta-row", ".about-media-wrapper",
    ".filters", ".plan-note", ".contact-intro", ".contact-cards", ".contact-form", ".faq-item", ".team-pillars"
  ];
  const els = [...document.querySelectorAll(targets.join(","))];
  els.forEach((el) => el.style.setProperty("--d", (el.matches("h2") ? 0 : 90) + "ms"));
  document.querySelectorAll(".grid").forEach((g) => {
    [...g.children].forEach((el, i) => { el.style.setProperty("--d", (i % 4) * 90 + "ms"); els.push(el); });
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      io.unobserve(el);
      el.classList.add("in");
      const d = parseInt(el.style.getPropertyValue("--d"), 10) || 0;
      /* hand control back to the element's own hover styles once finished */
      setTimeout(() => el.classList.remove("reveal", "in"), 900 + d);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el) => { el.classList.add("reveal"); io.observe(el); });
})();

/* ---------- Button ripple ---------- */
document.addEventListener("click", (e) => {
  if (reduceMotion) return;
  const b = e.target.closest(".btn, .btn-team");
  if (!b) return;
  const r = b.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const x = e.clientX ? e.clientX - r.left : r.width / 2;
  const y = e.clientY ? e.clientY - r.top : r.height / 2;
  const dot = document.createElement("span");
  dot.className = "ripple";
  dot.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px`;
  b.appendChild(dot);
  dot.addEventListener("animationend", () => dot.remove());
});

/* ---------- Start ---------- */
document.querySelectorAll("img[data-fb]").forEach((img) => {
  if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) imageFallback(img);
});
updateScrollUI();
