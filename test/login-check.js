"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), SITE = path.join(ROOT, "site");
let pass = 0, fail = 0;
const check = (what, ok, info) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + what + (ok || info === undefined ? "" : " " + JSON.stringify(info))); };
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch (e) { return ""; } };

const HEADERS = [
  'X-Robots-Tag "noindex, nofollow"',
  'X-Content-Type-Options "nosniff"',
  'Referrer-Policy "no-referrer"',
  'Strict-Transport-Security "max-age=31536000; includeSubDomains"',
  `Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; connect-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"`,
  'Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), midi=(), accelerometer=(), gyroscope=(), magnetometer=(), display-capture=(), screen-wake-lock=(), idle-detection=()"',
  'Cross-Origin-Opener-Policy "same-origin"',
  'Cross-Origin-Resource-Policy "same-origin"',
  'X-Frame-Options "DENY"',
];
const ERROR_PAGE_FILES = ["/login/unavailable.html", "/login/login.css", "/login/ibm-plex-sans-condensed-500.woff2", "/login/ibm-plex-sans-condensed-600.woff2"];

const caddy = read(path.join(ROOT, "Caddyfile"));
const lines = caddy.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

function blockAfter(startIdx) {
  const out = []; let depth = 0;
  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i];
    if (i > startIdx || !l.endsWith("{")) out.push(l);
    if (l.endsWith("{")) depth++;
    if (l === "}") { depth--; if (depth === 0) { out.pop(); return out; } }
  }
  return out;
}
const tokens = (l) => (l.match(/"[^"]*"|\S+/g) || []).map((t) => t.replace(/^"|"$/g, ""));

const matchers = {};
lines.forEach((l, i) => {
  const m = /^(@\w+)\s*(.*)$/.exec(l); if (!m) return;
  const rules = [];
  const add = (s) => { const t = tokens(s); const neg = t[0] === "not"; if (neg) t.shift(); rules.push({ neg, kind: t[0], args: t.slice(1) }); };
  if (m[2] === "{") blockAfter(i).forEach(add); else add(m[2]);
  matchers[m[1]] = rules;
});
const glob = (pat, p) => {
  pat = pat.toLowerCase(); p = p.toLowerCase();
  if (pat.endsWith("*") && pat.startsWith("*")) return p.includes(pat.slice(1, -1));
  if (pat.endsWith("*")) return p.startsWith(pat.slice(0, -1));
  if (pat.startsWith("*")) return p.endsWith(pat.slice(1));
  return p === pat;
};
function matches(name, p) {
  const rules = matchers[name]; if (!rules) return false;
  return rules.every((r) => {
    let hit;
    if (r.kind === "path") hit = r.args.some((a) => glob(a, p));
    else if (r.kind === "path_regexp") { const src = r.args[r.args.length - 1], ci = src.startsWith("(?i)"); hit = new RegExp(ci ? src.slice(4) : src, ci ? "i" : "").test(p); }
    else return true;
    return r.neg ? !hit : hit;
  });
}
const pathArg = (t) => t && t.startsWith("/") ? t : null;
const hits = (t, p) => t && t.startsWith("@") ? matches(t, p) : pathArg(t) ? glob(t, p) : true;

const routeAt = lines.indexOf("route {");
const route = routeAt >= 0 ? blockAfter(routeAt) : [];
function serve(p) {
  for (let i = 0; i < route.length; i++) {
    const l = route[i], t = tokens(l);
    if (t[0] === "respond") {
      const m = t[1]; const hasM = m && (m.startsWith("@") || m.startsWith("/"));
      if (!hasM || hits(m, p)) return { action: "respond", status: +t[t.length - 1] || 200, body: hasM ? t[2] : t[1] };
    } else if (t[0] === "redir" && hits(t[1], p)) return { action: "redir", to: t[2], status: +t[3] || 302 };
    else if (t[0] === "reverse_proxy" && hits(t[1], p)) return { action: "proxy", to: t[2] };
    else if (t[0] === "handle" && hits(t[1], p)) {
      const inner = route.slice(i + 1).join("\n");
      return { action: /file_server/.test(inner.split("\n}")[0]) ? "file" : "handle" };
    } else if (t[0] === "file_server") return { action: "file" };
    if (l.endsWith("{")) { let d = 0; for (let j = i; j < route.length; j++) { if (route[j].endsWith("{")) d++; if (route[j] === "}" && --d === 0) { i = j; break; } } }
  }
  return { action: "none" };
}

const headerAt = lines.indexOf("header {");
check("security headers and CSP are exactly the pinned list", JSON.stringify(headerAt >= 0 ? blockAfter(headerAt) : []) === JSON.stringify(HEADERS), headerAt >= 0 ? blockAfter(headerAt) : null);
check("no forward_auth (no sign-in gate)", !/forward_auth/.test(caddy));
check("no reverse_proxy (nothing is passed to the account server)", !/reverse_proxy/.test(caddy));
check("no account server address or proxy key left in the Caddyfile", !/TRAIL_API_UPSTREAM|TRAIL_PROXY_KEY|X-Bf-/.test(caddy));

const h = serve("/health");
check("CONTROL: /health still answers 200 ok", h.action === "respond" && h.status === 200 && h.body === "ok", h);
check("CONTROL: / is served by the file server", serve("/").action === "file", serve("/"));
check("CONTROL: the game's own files are served", serve("/engine/core.js").action === "file" && serve("/data/chain.json").action === "file");

const API = ["/api", "/api/", "/api/auth/discord", "/api/auth/discord/callback", "/api/me", "/api/save", "/api/events", "/api/forget", "/api/logout",
  "/api/access/request", "/api/access/status", "/api/owner", "/api/owner/players", "/api/internal/access-decision", "/api/gate", "/API/ME"];
API.forEach((p) => { const r = serve(p); check("404 for " + p, r.action === "respond" && r.status === 404, r); });

const REDIR = ["/login", "/login/", "/login/index.html", "/login/login.js", "/login/privacy.html", "/login/anything", "/login/sub/x.html", "/LOGIN/index.html"];
REDIR.forEach((p) => { const r = serve(p); check("redirect to / for " + p, r.action === "redir" && r.to === "/", r); });
ERROR_PAGE_FILES.forEach((p) => { const r = serve(p); check("error-page file still served: " + p, r.action === "file", r); });
const errAt = lines.indexOf("handle_errors 502 503 504 {");
check("502/503/504 still show /login/unavailable.html", errAt >= 0 && blockAfter(errAt).includes("rewrite * /login/unavailable.html"));

const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|html|css|json|txt)$/.test(e.name)) files.push(p); } })(SITE);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const BANNED = [/\/api\//, /\/api\/auth/, /\/api\/me\b/, /\/api\/save\b/, /\/login\/index\.html/, /\blogin\.js\b/, /\/login\/privacy\.html/, /\/login\/?["'?]/];
const found = [];
files.forEach((f) => { const s = read(f); BANNED.forEach((re) => { if (re.test(s)) found.push(rel(f) + " " + re); }); });
check("CONTROL: the site scan read the game files", files.length > 20 && files.some((f) => /core\.js$/.test(f)), files.length);
check("nothing in site/ calls /api/* or links the old sign-in page", found.length === 0, found);
["index.html", "login.js", "privacy.html"].forEach((f) => check("site/login/" + f + " is gone", !fs.existsSync(path.join(SITE, "login", f))));
ERROR_PAGE_FILES.filter((p) => !/woff2$/.test(p)).forEach((p) => check("site" + p + " is kept for the error page", fs.existsSync(path.join(SITE, p))));
const sync = read(path.join(SITE, "engine", "account-sync.js"));
check("CONTROL: account-sync.js still holds the local save migration", /function remapSave/.test(sync) && /migrateOldTrail/.test(sync));
check("account-sync.js sends nothing anywhere (no fetch, beacon, XHR, socket)", !/\bfetch\s*\(|sendBeacon|XMLHttpRequest|WebSocket|EventSource/.test(sync));
check("no site script sends player data (only the static chain file and sounds are fetched)", files.filter((f) => /\.js$/.test(f)).every((f) => {
  const s = read(f); return !/sendBeacon|XMLHttpRequest|WebSocket|EventSource|credentials:\s*["']same-origin|credentials:\s*["']include/.test(s);
}));

console.log(`LOGIN: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
