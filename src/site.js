(function () {
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[d]; }); }
  var ITEMS = window.ITEMS || [];

  /* hero ring */
  function layoutRing() {
    var ring = document.getElementById("ring"); if (!ring) return;
    var W = ring.clientWidth, H = ring.clientHeight, phone = W < 700;
    var frames = Array.prototype.slice.call(ring.querySelectorAll(".fr"));
    frames.forEach(function (f) { f.hidden = phone && f.hasAttribute("data-desk"); });
    var vis = frames.filter(function (f) { return !f.hidden; }), N = vis.length;
    var rx = phone ? W * 0.66 : Math.min(W * 0.39, 600), ry = phone ? W * 0.66 : Math.min(H * 0.36, 330);
    if (!phone && ry > H * 0.4) ry = H * 0.4;
    vis.forEach(function (f, i) {
      var th = (i / N) * Math.PI * 2 - Math.PI / 2 + (phone ? Math.PI / N : 0);
      var x = W / 2 + rx * Math.cos(th), y = H / 2 + ry * Math.sin(th);
      var grow = (Math.sin(th) + 1) / 2, w = phone ? 64 + 24 * grow : 96 + 52 * grow;
      var h = i % 3 === 1 ? (w * 4) / 3 : (w * 3) / 4;
      var ang = (Math.atan2(ry * Math.cos(th), -rx * Math.sin(th)) * 180) / Math.PI;
      if (ang > 90) ang -= 180; if (ang < -90) ang += 180; ang = Math.max(-30, Math.min(30, ang));
      f.style.cssText = "width:" + w.toFixed(0) + "px;height:" + h.toFixed(0) + "px;left:" + (x - w / 2).toFixed(0) + "px;top:" + (y - h / 2).toFixed(0) + "px;transform:rotate(" + ang.toFixed(1) + "deg)";
    });
    ring.classList.add("placed");
  }
  var sub = document.getElementById("sub"), subDefault = sub ? sub.textContent : "";
  function tip(el) {
    var ring = document.getElementById("ring"); if (!ring || !sub) return;
    ring.querySelectorAll(".fr.on").forEach(function (f) { f.classList.remove("on"); });
    if (el) { ring.classList.add("focus"); el.classList.add("on"); sub.textContent = el.getAttribute("data-tip"); }
    else { ring.classList.remove("focus"); sub.textContent = subDefault; }
  }
  document.addEventListener("mouseover", function (e) {
    var f = e.target.closest && e.target.closest(".fr[data-tip]");
    if (f) tip(f); else if (e.target.closest && !e.target.closest(".ring")) tip(null);
    var v = e.target.closest && e.target.closest(".it video");
    if (v && !RM) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  });
  document.addEventListener("mouseout", function (e) { var v = e.target.closest && e.target.closest(".it video"); if (v) v.pause(); });
  document.addEventListener("focusin", function (e) { var f = e.target.closest && e.target.closest(".fr[data-tip]"); tip(f || null); });

  /* entrances */
  if ("IntersectionObserver" in window && !RM) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); e.target.classList.remove("pre"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px" });
    var vh = window.innerHeight;
    document.querySelectorAll(".rv, .sec-head, .fcols > div").forEach(function (el, i) {
      if (el.getBoundingClientRect().top > vh) { el.classList.add("pre"); el.style.transitionDelay = (i % 3) * 75 + "ms"; io.observe(el); }
    });
  }

  /* footer */
  function fitName() {
    var el = document.getElementById("bigname"); if (!el) return;
    var box = el.parentElement; box.style.fontSize = "100px";
    var w = el.getBoundingClientRect().width || 1;
    box.style.fontSize = Math.max(32, Math.min((box.clientWidth / w) * 97, window.innerHeight * 0.42)) + "px";
  }
  function drawQR() {
    var box = document.getElementById("qr"), u = window.PAGE_URL || (/^https?:/.test(location.href) ? location.href.split("#")[0] : "");
    if (!box || !u || typeof window.qrcode !== "function") return;
    try { var q = window.qrcode(0, "M"); q.addData(u); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); box.parentElement.hidden = false; } catch (e) {}
  }

  /* lightbox */
  var at = -1, tx = null;
  function drawLB() {
    var old = document.getElementById("lb"); if (old) old.remove();
    if (at < 0 || !ITEMS[at]) { document.body.style.overflow = ""; return; }
    var it = ITEMS[at], n = ITEMS.length, d = document.createElement("div");
    d.className = "lb"; d.id = "lb"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true");
    var m;
    if (it.v) { m = document.createElement("video"); m.src = it.s; m.controls = true; m.autoplay = true; m.playsInline = true; m.className = "lbv"; }
    else { m = document.createElement("img"); m.src = it.s; m.alt = it.c || ""; }
    d.appendChild(m);
    d.insertAdjacentHTML("beforeend", '<button class="ic x" data-lbx aria-label="بستن">×</button>' + (n > 1 ? '<button class="ic p" data-lbs="-1" aria-label="قبلی">›</button><button class="ic n" data-lbs="1" aria-label="بعدی">‹</button>' : ""));
    var cap = document.createElement("div"); cap.className = "cap"; cap.textContent = (it.c ? it.c + "  ·  " : "") + fa(at + 1) + " از " + fa(n); d.appendChild(cap);
    document.body.appendChild(d); document.body.style.overflow = "hidden"; d.querySelector(".ic.x").focus();
  }
  function step(s) { at = (at + s + ITEMS.length) % ITEMS.length; drawLB(); }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-k]");
    if (t) { at = +t.getAttribute("data-k"); drawLB(); return; }
    if (e.target.closest && e.target.closest("[data-lbx]")) { at = -1; drawLB(); return; }
    var s = e.target.closest && e.target.closest("[data-lbs]");
    if (s) { step(+s.getAttribute("data-lbs")); return; }
    if (e.target.id === "lb") { at = -1; drawLB(); }
  });
  document.addEventListener("keydown", function (e) {
    if (at < 0) return;
    if (e.key === "Escape") { at = -1; drawLB(); } else if (e.key === "ArrowLeft") step(1); else if (e.key === "ArrowRight") step(-1);
  });
  document.addEventListener("touchstart", function (e) { if (at >= 0) tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (at >= 0 && tx != null) { var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) step(dx > 0 ? 1 : -1); }
    tx = null;
  }, { passive: true });

  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { layoutRing(); fitName(); }, 120); });
  layoutRing(); fitName(); drawQR();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);
})();
