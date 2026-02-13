/* =========================================================
   PrefabHomesCanada — site.js (ULTRA PREMIUM)
   - No deps, fast, accessible
   - Mobile menu + outside click + ESC
   - Active nav link (scrollspy)
   - Smooth anchor scroll with header offset
   - Header shrink on scroll (subtle)
   - Optional: GA4 click tracking if gtag() exists
   ========================================================= */

(() => {
  "use strict";

  /* ---------- tiny helpers ---------- */
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const prefersReduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const safeCall = (fn, ...args) => { try { return fn(...args); } catch { return null; } };

  /* ---------- config ---------- */
  const CFG = {
    headerSel: ".site-header",
    navSel: ".nav",
    menuBtnId: "menuBtn",
    activeClass: "is-active",
    navOpenClass: "open",
    headerCompactClass: "is-compact",
    headerCompactAt: 12, // px
    scrollOffsetExtra: 12
  };

  /* ---------- elements ---------- */
  const header = qs(CFG.headerSel);
  const nav = qs(CFG.navSel);
  const menuBtn = qs(`#${CFG.menuBtnId}`);
  const navLinks = nav ? qsa("a[href^='#'], a[href^='/#']", nav) : [];

  /* ---------- GA4 helpers (optional) ---------- */
  function track(eventName, params = {}) {
    // Works only if gtag exists
    if (typeof window.gtag !== "function") return;
    safeCall(window.gtag, "event", eventName, {
      transport_type: "beacon",
      ...params
    });
  }

  /* ---------- header height / offset ---------- */
  function headerOffset() {
    const h = header ? header.getBoundingClientRect().height : 0;
    return Math.round(h + CFG.scrollOffsetExtra);
  }

  /* ---------- mobile menu ---------- */
  function setMenu(opened) {
    if (!nav || !menuBtn) return;

    nav.classList.toggle(CFG.navOpenClass, opened);
    menuBtn.setAttribute("aria-expanded", opened ? "true" : "false");
    menuBtn.setAttribute("aria-label", opened ? "Fermer le menu" : "Ouvrir le menu");

    // Lock body scroll when open (mobile)
    document.documentElement.style.overflow = opened ? "hidden" : "";
  }

  function toggleMenu() {
    if (!nav) return;
    const opened = nav.classList.contains(CFG.navOpenClass);
    setMenu(!opened);
  }

  on(menuBtn, "click", (e) => {
    e.preventDefault();
    toggleMenu();
    track("nav_menu_toggle", { event_category: "navigation" });
  });

  // Close on outside click
  on(document, "click", (e) => {
    if (!nav || !menuBtn) return;
    const opened = nav.classList.contains(CFG.navOpenClass);
    if (!opened) return;

    const target = e.target;
    const clickedInside = nav.contains(target) || menuBtn.contains(target);
    if (!clickedInside) setMenu(false);
  });

  // Close on ESC
  on(document, "keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!nav) return;
    if (nav.classList.contains(CFG.navOpenClass)) setMenu(false);
  });

  // Close menu after clicking a nav link (mobile)
  navLinks.forEach((a) => {
    on(a, "click", () => {
      if (!nav) return;
      if (nav.classList.contains(CFG.navOpenClass)) setMenu(false);

      const label = (a.textContent || a.getAttribute("href") || "").trim().slice(0, 80);
      track("nav_click", { event_category: "navigation", event_label: label });
    });
  });

  /* ---------- smooth anchor scroll with offset ---------- */
  function normalizeHashHref(href) {
    // supports "/#section" or "#section"
    if (!href) return "";
    const idx = href.indexOf("#");
    if (idx === -1) return "";
    return href.slice(idx);
  }

  function scrollToHash(hash) {
    if (!hash || hash === "#") return;
    const el = qs(hash);
    if (!el) return;

    const y = window.scrollY + el.getBoundingClientRect().top - headerOffset();
    if (prefersReduced()) {
      window.scrollTo(0, y);
    } else {
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  // Intercept same-page anchor clicks
  navLinks.forEach((a) => {
    on(a, "click", (e) => {
      const hash = normalizeHashHref(a.getAttribute("href"));
      if (!hash) return;

      // only intercept if element exists on this page
      if (!qs(hash)) return;

      e.preventDefault();
      history.pushState(null, "", hash);
      scrollToHash(hash);
    });
  });

  // If page loads with a hash, apply offset scroll
  on(window, "load", () => {
    const hash = window.location.hash;
    if (hash && qs(hash)) {
      // tiny delay to allow layout settle
      setTimeout(() => scrollToHash(hash), 40);
    }
  });

  /* ---------- active link (scrollspy) ---------- */
  const sections = [];
  navLinks.forEach((a) => {
    const hash = normalizeHashHref(a.getAttribute("href"));
    if (!hash) return;
    const el = qs(hash);
    if (!el) return;
    sections.push({ a, el, hash });
  });

  function setActive(hash) {
    sections.forEach(({ a, hash: h }) => {
      a.classList.toggle(CFG.activeClass, h === hash);
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      ticking = false;

      // Header compact
      if (header) {
        header.classList.toggle(CFG.headerCompactClass, window.scrollY > CFG.headerCompactAt);
      }

      if (!sections.length) return;

      const offset = headerOffset();
      const y = window.scrollY + offset + 1;

      // Find current section
      let current = sections[0].hash;
      for (const s of sections) {
        const top = window.scrollY + s.el.getBoundingClientRect().top;
        if (top <= y) current = s.hash;
      }
      setActive(current);
    });
  }

  on(window, "scroll", onScroll, { passive: true });
  on(window, "resize", onScroll);
  onScroll();

  /* ---------- optional: reveal on scroll (simple, safe) ---------- */
  // Add class "reveal" in HTML on blocks you want to fade in.
  const revealEls = qsa(".reveal");
  if (revealEls.length && "IntersectionObserver" in window && !prefersReduced()) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- optional: basic form UX (if you have a contact form) ---------- */
  // Adds loading state to buttons with data-loading="true"
  const forms = qsa("form");
  forms.forEach((form) => {
    on(form, "submit", () => {
      const btn = qs("button[type='submit'], input[type='submit']", form);
      if (!btn) return;

      btn.dataset.prevText = btn.textContent || "";
      btn.disabled = true;
      btn.textContent = btn.getAttribute("data-loading-text") || "Envoi…";

      track("form_submit", { event_category: "lead", event_label: form.getAttribute("id") || "form" });
    });
  });

})();
