/* =========================================================
   PrefabHomesCanada — site.js (ULTRA PREMIUM) — UPDATED
   - No deps, fast, accessible
   - Mobile menu + outside click + ESC
   - Active nav link (scrollspy)
   - Smooth anchor scroll with header offset
   - Header shrink on scroll (subtle)
   - Optional: GA4 click tracking if gtag() exists
   - Forms: UX + Formspree AJAX (redirect guaranteed)
   - NEW: /thank-you/ conversion event (lead_success)
   ========================================================= */

(() => {
  "use strict";

  /* ---------- tiny helpers ---------- */
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const prefersReduced = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const safeCall = (fn, ...args) => { try { return fn(...args); } catch { return null; } };

  const normPath = (p) => {
    const path = (p || "/").trim();
    // ensure trailing slash
    return path.replace(/\/+$/, "") + "/";
  };

  /* ---------- config ---------- */
  const CFG = {
    headerSel: ".site-header",
    navSel: ".nav",
    menuBtnId: "menuBtn",
    activeClass: "is-active",
    navOpenClass: "open",
    headerCompactClass: "is-compact",
    headerCompactAt: 12, // px
    scrollOffsetExtra: 12,
    thankYouPath: "/thank-you/"
  };

  /* ---------- elements ---------- */
  const header = qs(CFG.headerSel);
  const nav = qs(CFG.navSel);
  const menuBtn = qs(`#${CFG.menuBtnId}`);
  const navLinks = nav ? qsa("a[href]", nav) : [];

  /* ---------- GA4 helpers (optional) ---------- */
  function track(eventName, params = {}) {
    if (typeof window.gtag !== "function") return;
    safeCall(window.gtag, "event", eventName, {
      transport_type: "beacon",
      ...params
    });
  }
  // optional alias (some pages call window.track)
  window.track = window.track || track;

  /* ---------- /thank-you/ conversion ping ---------- */
  (function fireThankYouConversion() {
    const p = normPath(window.location.pathname || "/");
    if (p !== CFG.thankYouPath) return;

    // avoid double-fire (e.g., bfcache restore)
    const key = "phc_lead_success_fired";
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");

    track("lead_success", { event_category: "lead", event_label: "thank-you" });
  })();

  /* ---------- header height / offset ---------- */
  function headerOffset() {
    const h = header ? header.getBoundingClientRect().height : 0;
    return Math.round(h + CFG.scrollOffsetExtra);
  }

  /* ---------- mobile menu ---------- */
  let scrollLocked = false;

  function lockScroll(locked) {
    if (locked && !scrollLocked) {
      scrollLocked = true;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      return;
    }
    if (!locked && scrollLocked) {
      scrollLocked = false;
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  }

  function setMenu(opened) {
    if (!nav || !menuBtn) return;

    nav.classList.toggle(CFG.navOpenClass, opened);
    menuBtn.setAttribute("aria-expanded", opened ? "true" : "false");
    menuBtn.setAttribute("aria-label", opened ? "Close menu" : "Open menu");

    lockScroll(opened);
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
    if (!nav.classList.contains(CFG.navOpenClass)) return;

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

  /* ---------- smooth anchor scroll with offset ---------- */
  function normalizeHashHref(href) {
    // supports "/#section" or "#section"
    if (!href) return "";
    const idx = href.indexOf("#");
    if (idx === -1) return "";
    return href.slice(idx);
  }

  function isSamePage(href) {
    if (!href) return false;
    if (href.startsWith("#")) return true;
    if (href.startsWith("/#")) return true;

    // Absolute or relative URL that points to current page + hash
    try {
      const u = new URL(href, window.location.origin);
      const here = new URL(window.location.href);
      return normPath(u.pathname) === normPath(here.pathname) && !!u.hash;
    } catch {
      return false;
    }
  }

  function scrollToHash(hash) {
    if (!hash || hash === "#") return;
    const el = qs(hash);
    if (!el) return;

    const y = window.scrollY + el.getBoundingClientRect().top - headerOffset();
    if (prefersReduced()) window.scrollTo(0, y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  }

  // Close menu + track on nav clicks (all links)
  navLinks.forEach((a) => {
    on(a, "click", () => {
      if (nav && nav.classList.contains(CFG.navOpenClass)) setMenu(false);

      const label = (a.textContent || a.getAttribute("href") || "").trim().slice(0, 80);
      track("nav_click", { event_category: "navigation", event_label: label });
    });
  });

  // Intercept same-page anchor clicks only
  navLinks.forEach((a) => {
    on(a, "click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!isSamePage(href)) return;

      const hash = normalizeHashHref(href);
      if (!hash) return;
      if (!qs(hash)) return; // only if element exists on this page

      e.preventDefault();
      history.pushState(null, "", hash);
      scrollToHash(hash);
    });
  });

  // If page loads with a hash, apply offset scroll
  on(window, "load", () => {
    const hash = window.location.hash;
    if (hash && qs(hash)) setTimeout(() => scrollToHash(hash), 40);
  });

  /* ---------- active link (scrollspy) ---------- */
  const sections = [];
  navLinks.forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!isSamePage(href)) return;

    const hash = normalizeHashHref(href);
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
      if (header) header.classList.toggle(CFG.headerCompactClass, window.scrollY > CFG.headerCompactAt);
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

  /* =========================================================
     FORMS: UX + Formspree AJAX (redirect guaranteed)
     - Works when form has: data-formspree="true" OR action is formspree.io/f/...
     - Redirect target priority:
       1) form.dataset.next
       2) input[name="_next"]
       3) "/thank-you/"
     ========================================================= */

  const forms = qsa("form");

  function ensureStatusBox(form) {
    let box = qs("#formStatus", form) || qs(".formStatus", form);
    if (!box) {
      box = document.createElement("div");
      box.className = "formStatus";
      box.id = "formStatus";
      box.setAttribute("aria-live", "polite");
      box.hidden = true;
      form.appendChild(box);
    }
    return box;
  }

  function setStatus(form, type, title, message) {
    const box = ensureStatusBox(form);
    box.className = `formStatus ${type ? `is-${type}` : ""}`.trim();
    box.hidden = false;
    box.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
  }

  function clearStatus(form) {
    const box = qs("#formStatus", form) || qs(".formStatus", form);
    if (!box) return;
    box.hidden = true;
    box.textContent = "";
    box.className = "formStatus";
  }

  function setFormError(form, msg) {
    setStatus(form, "error", "Couldn’t send", msg);

    let line = qs(".formError", form);
    if (!line) {
      line = document.createElement("p");
      line.className = "small formError";
      line.style.marginTop = "10px";
      form.appendChild(line);
    }
    line.textContent = msg;
  }

  function getSubmitButton(form) {
    return qs("button[type='submit'], input[type='submit']", form);
  }

  function setBtnLoading(btn, loadingText) {
    if (!btn) return () => {};
    const isInput = btn.tagName === "INPUT";
    const prev = isInput ? (btn.value || "") : (btn.textContent || "");
    btn.dataset.prevText = prev;
    btn.disabled = true;
    if (isInput) btn.value = loadingText || "Sending…";
    else btn.textContent = loadingText || "Sending…";

    return () => {
      btn.disabled = false;
      const t = btn.dataset.prevText || (isInput ? "Send" : "Send");
      if (isInput) btn.value = t;
      else btn.textContent = t;
    };
  }

  forms.forEach((form) => {
    const action = (form.getAttribute("action") || "").trim();

    const isFormspree =
      form.dataset.formspree === "true" ||
      /https?:\/\/(www\.)?formspree\.io\/f\//i.test(action);

    on(form, "submit", async (e) => {
      const btn = getSubmitButton(form);
      const restoreBtn = setBtnLoading(btn, btn?.getAttribute("data-loading-text") || "Sending…");

      clearStatus(form);

      track("form_submit", {
        event_category: "lead",
        event_label: form.getAttribute("id") || form.getAttribute("name") || "form"
      });

      // Not Formspree? allow normal submit
      if (!isFormspree) {
        restoreBtn();
        return;
      }

      // If action is missing/invalid, fail gracefully (don’t trap user)
      if (!action || !/formspree\.io\/f\//i.test(action)) {
        e.preventDefault();
        restoreBtn();
        setFormError(form, "Form endpoint is missing. Please refresh the page or try again later.");
        return;
      }

      // Formspree: prevent default and send via fetch
      e.preventDefault();

      const next =
        (form.dataset.next || "").trim() ||
        (qs("input[name='_next']", form)?.value || "").trim() ||
        CFG.thankYouPath;

      try {
        const fd = new FormData(form);

        // Reply-to support (Formspree convenience)
        const email = (fd.get("email") || "").toString().trim();
        if (email && !fd.get("_replyto")) fd.append("_replyto", email);

        const res = await fetch(action, {
          method: "POST",
          body: fd,
          headers: { "Accept": "application/json" }
        });

        if (res.ok) {
          setStatus(form, "success", "Sent!", "Redirecting…");
          // optional: client-side conversion ping before redirect
          track("lead_submit_success", { event_category: "lead", event_label: "formspree" });
          window.location.assign(next);
          return;
        }

        let msg = "Something went wrong. Please try again in a moment.";
        const data = await res.json().catch(() => null);
        if (data?.errors?.length) msg = data.errors.map((er) => er.message).join(" ");
        setFormError(form, msg);

      } catch {
        setFormError(form, "Network error. Please check your connection and try again.");
      } finally {
        restoreBtn();
      }
    });
  });

  /* ---------- footer year ---------- */
  const y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());

})();
