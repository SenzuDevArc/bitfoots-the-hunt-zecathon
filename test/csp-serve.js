"use strict";
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto"), zlib = require("zlib");
const PORT = +(process.argv[2] || 5191);
const BUILT = process.argv[3] ? path.resolve(process.argv[3]) : null;
const SITE = path.resolve(__dirname, "..", "site");
const ROOT = BUILT || SITE;
const caddy = fs.readFileSync(path.resolve(__dirname, "..", "Caddyfile"), "utf8");
const CSP = (caddy.match(/Content-Security-Policy "([^"]+)"/) || [])[1];
if (!CSP) { console.error("no Content-Security-Policy found in Caddyfile"); process.exit(1); }
const pathsOf = (re) => ((caddy.match(re) || [])[1] || "").trim().split(/\s+/).filter(Boolean);
const SCREENS = pathsOf(/@screens \{\s*path (.+)$/m);
if (!SCREENS.length) { console.error("no @screens paths found in Caddyfile"); process.exit(1); }
const matches = (list, p) => list.some((m) => (m.endsWith("*") ? p.startsWith(m.slice(0, -1)) : p === m));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
  ".ogg": "audio/ogg", ".m4a": "audio/mp4" };
const INDEX = "/index.html";

function unbuiltLogin(p) {
  const name = p.replace(/^\/login\/?/, "") || "index.html";
  return /\.woff2$/.test(name) ? "/assets/fonts/" + name : "/login/" + name;
}

http.createServer((req, res) => {
  const [rawPath, query] = req.url.split("?");
  const base = { "Content-Security-Policy": CSP, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY" };
  const send = (code, body, extra) => { res.writeHead(code, Object.assign({ "Cache-Control": BUILT ? "no-cache" : "no-store" }, base, extra)); res.end(body); };
  let p;
  try { p = decodeURIComponent(rawPath); } catch { send(400, "Bad Request"); return; }
  if (/\.\.|\\/.test(p)) { send(400, "Bad Request"); return; }
  if (p === "/health") { send(200, "ok"); return; }
  if (p === "/api" || p.startsWith("/api/")) { send(404, "Not Found"); return; }
  if (p === "/" || (matches(SCREENS, p) && !p.endsWith("/index.html"))) p = INDEX;
  else if (p === "/login" || p.startsWith("/login/")) p = BUILT ? (p.replace(/\/$/, "") === "/login" ? "/login/index.html" : p) : unbuiltLogin(p);
  else if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT + path.sep)) { send(403, ""); return; }
  let file = f, enc = null;
  if (BUILT) {
    const ae = String(req.headers["accept-encoding"] || "");
    for (const [token, ext] of [["br", ".br"], ["gzip", ".gz"]]) if (ae.includes(token) && fs.existsSync(f + ext)) { file = f + ext; enc = token; break; }
  }
  fs.readFile(file, (e, b) => {
    if (e) { send(404, "Not Found"); return; }
    if (BUILT && !enc && /\.(js|css|html|svg|json|txt)$/.test(f) && /gzip/.test(String(req.headers["accept-encoding"] || ""))) { b = zlib.gzipSync(b, { level: 5 }); enc = "gzip"; }
    const h = Object.assign({ "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }, base);
    if (!BUILT) h["Cache-Control"] = "no-store";
    else {
      h["Cache-Control"] = /(^|&)v=/.test(query || "") ? "max-age=31536000, immutable" : "no-cache";
      h.ETag = '"' + crypto.createHash("sha1").update(b).digest("hex").slice(0, 16) + (enc || "") + '"';
      h.Vary = "Accept-Encoding";
      if (enc) h["Content-Encoding"] = enc;
      if (req.headers["if-none-match"] === h.ETag) { res.writeHead(304, h); res.end(); return; }
    }
    res.writeHead(200, h);
    res.end(b);
  });
}).listen(PORT, "127.0.0.1", () => console.log("Bitfoot: The Hunt is running at http://127.0.0.1:" + PORT + "/" + (BUILT ? "  (built copy: " + ROOT + ")" : "")));
