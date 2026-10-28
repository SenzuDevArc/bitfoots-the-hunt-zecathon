(function () {
  "use strict";
  var BH = (window.BH = window.BH || {});
  var seen = {};
  var entries = [];
  var blocked = [];

  function add(e) {
    var k = e.entryType + "|" + e.name + "|" + e.startTime;
    if (seen[k]) return;
    seen[k] = true;
    entries.push({ url: e.name });
  }
  function seed() {
    try { performance.getEntriesByType("navigation").forEach(add); } catch (err) {  }
    try { performance.getEntriesByType("resource").forEach(add); } catch (err) {  }
  }
  seed();
  try {
    var po = new PerformanceObserver(function (list) { list.getEntries().forEach(add); });
    po.observe({ type: "resource", buffered: true });
  } catch (err) {  }
  try { performance.addEventListener("resourcetimingbufferfull", function () { seed(); performance.clearResourceTimings(); }); } catch (err) {}

  document.addEventListener("securitypolicyviolation", function (ev) {
    var o = originOf(ev.blockedURI);
    blocked.push({ origin: o || String(ev.blockedURI || "inline"), url: String(ev.blockedURI || ""),
      directive: ev.effectiveDirective || ev.violatedDirective || "" });
  });

  function originOf(url) {
    try {
      var u = new URL(url, location.href);
      if (u.protocol === "data:" || u.protocol === "blob:" || u.protocol === "about:") return null;
      return u.origin;
    } catch (err) { return null; }
  }

  function list() {
    seed();
    var self = location.origin, by = {}, local = 0, refused = {};
    blocked.forEach(function (b) { if (b.url) refused[b.url] = true; });
    entries.forEach(function (e) {
      if (refused[e.url]) return;
      var o = originOf(e.url);
      if (!o) { local++; return; }
      var s = by[o] || (by[o] = { origin: o, self: o === self, files: 0, paths: [] });
      s.files++;
      try { var p = new URL(e.url).pathname; if (s.paths.indexOf(p) < 0 && s.paths.length < 40) s.paths.push(p); } catch (err) {}
    });
    var servers = Object.keys(by).map(function (k) { return by[k]; })
      .sort(function (a, b) { return (b.self - a.self) || (b.files - a.files); });
    var total = servers.reduce(function (n, s) { return n + s.files; }, 0);
    return { self: self, servers: servers, local: local, blocked: blocked.slice(), total: total };
  }

  function hostLabel(origin) { try { return new URL(origin).host; } catch (err) { return origin; } }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  function summary(r) {
    r = r || list();
    var others = r.servers.filter(function (s) { return !s.self; });
    if (!others.length) return "This game talked to 1 server: ours. Nothing else.";
    return "This game talked to " + plural(others.length + 1, "server", "servers") + ": ours, and " +
      others.map(function (s) { return hostLabel(s.origin); }).join(", ") + ".";
  }

  function el(tag, text, css) {
    var n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (css) for (var k in css) n.style[k] = css[k];
    return n;
  }

  function render(host) {
    var r = list(), others = r.servers.filter(function (s) { return !s.self; });
    while (host.firstChild) host.removeChild(host.firstChild);
    host.classList.add("bh-receipt");
    var box = el("div", null, { font: "500 15px/1.35 'Plex Cond', 'IBM Plex Sans Condensed', system-ui, sans-serif",
      color: "#fffaf0", background: "#1c1c1c", border: "1px solid " + (others.length ? "#e5484d" : "#eaba49"),
      borderRadius: "8px", padding: "12px 14px", maxWidth: "420px" });
    box.appendChild(el("div", summary(r), { fontWeight: "600", fontSize: "17px", color: others.length ? "#ff8a8d" : "#eaba49" }));
    var ours = r.servers.filter(function (s) { return s.self; })[0];
    var line2 = others.length
      ? plural(r.total, "file", "files") + " loaded. Only " + plural(ours ? ours.files : 0, "was", "were") + " from our server."
      : plural(r.total, "file", "files") + " loaded, all from our server. No trackers, no cookies, no wallet addresses.";
    box.appendChild(el("div", line2, { opacity: "0.85", marginTop: "4px" }));
    box.appendChild(el("div", "Your browser is also told to refuse any other address (Content-Security-Policy).", { opacity: "0.6", marginTop: "4px", fontSize: "13px" }));
    if (r.blocked.length) {
      var bl = {}; r.blocked.forEach(function (b) { bl[b.origin] = (bl[b.origin] || 0) + 1; });
      box.appendChild(el("div", "Blocked " + plural(r.blocked.length, "attempt", "attempts") + " to reach: " +
        Object.keys(bl).map(hostLabel).join(", "), { color: "#eaba49", marginTop: "6px" }));
    }
    var det = el("details", null, { marginTop: "8px", fontSize: "13px" });
    det.appendChild(el("summary", "Show every request", { cursor: "pointer", opacity: "0.8" }));
    r.servers.forEach(function (s) {
      var row = el("div", null, { marginTop: "6px" });
      row.appendChild(el("div", (s.self ? "ours - " : "OTHER - ") + hostLabel(s.origin) + " - " + plural(s.files, "request", "requests"),
        { fontWeight: "600", color: s.self ? "#fffaf0" : "#ff8a8d" }));
      row.appendChild(el("div", s.paths.join("  "), { font: "500 12px/1.4 'Plex Mono', ui-monospace, monospace", opacity: "0.7", wordBreak: "break-all" }));
      det.appendChild(row);
    });
    if (r.local) det.appendChild(el("div", plural(r.local, "picture", "pictures") + " made inside your browser (no network).", { marginTop: "6px", opacity: "0.7" }));
    box.appendChild(det);
    host.appendChild(box);
    return r;
  }

  BH.receipt = { list: list, render: render, summary: summary };
})();
