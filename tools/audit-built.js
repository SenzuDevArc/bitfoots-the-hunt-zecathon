"use strict";
const fs = require("fs"), path = require("path");

let acorn = null;
try { acorn = require("internal/deps/acorn/acorn/dist/acorn"); } catch (e) { acorn = null; }

const CHECKS = [
  { id: "html-comment", kinds: /\.(html|svg)$/, re: /<!--|-->/g },
  { id: "css-comment", kinds: /\.css$/, re: /\/\*|\*\//g },
  { id: "note-word", kinds: /./, re: /\b(TODO|FIXME|XXX|HACK|NOTE:)/g },
  { id: "debug", kinds: /./, re: /debug/gi },
  { id: "session-tag", kinds: /./, re: /\bS\d{3}\b/g },
  { id: "internal-address", kinds: /./, re: /localhost|127\.0\.0\.1|0\.0\.0\.0|[\w-]*\.railway\.internal|[\w-]*\.up\.railway\.app/g },
  { id: "file-path", kinds: /./, re: /\b[A-Za-z]:\\\w|\/(?:Users|home|srv|app|tmp)\/|(?:^|[\s"'(=])(?:tools|test|server|site|docs)\/[\w.-]+|[\\/][\w.-]+\.(?:js|mjs|md|py|sh|map)\b/g },
  { id: "env-name", kinds: /./, re: /\b(DATABASE_URL|SESSION_SECRET|DISCORD_CLIENT_(?:ID|SECRET)|DISCORD_WEBHOOK_URL|OWNER_DISCORD_ID|TRAIL_API_\w+|TRAIL_ALL_CHARS_DISCORD_IDS|TRAIL_SITE_DIR|API_UPSTREAM|PUBLIC_URL|API_ENABLED|SITE_ROOT|PG_POOL_MAX)\b/g },
  { id: "source-map", kinds: /\.(js|css)$/, re: /sourceMappingURL/g },
  { id: "dev-marker", kinds: /./, re: /@dev-only|@end-dev-only|__hunt|__demo|__fbDemo|__a8Demo|fademo|fbdemo|fcdemo|fddemo|a8demo|a9stage/g },
  { id: "home-path", kinds: /./, re: /~\/[\w.-]+|%USERPROFILE%|\$HOME\//g },
  { id: "email", kinds: /./, re: /\b[\w.+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g },
  { id: "discord-id", kinds: /./, re: /(?<![\w.+-])\d{17,20}(?![\w.])/g },
  { id: "session-code", kinds: /./, re: /\bS\d{4}\b/g },
  { id: "issue-ref", kinds: /./, re: /\((?:PR )?#\d+\)|\b(?:issue|PR|pull request)\s*#\d+/gi },
  { id: "meta-author", kinds: /\.(html|svg)$/, re: /<meta\b[^>]*\bname\s*=\s*["']?(?:author|generator)\b/gi },
];
const NAME_HASHES = new Set(["5d09cfd47e684ed9", "b827145833dfe906", "46b7c75fe29a9a18", "74604cdb98318650", "a21e28dee6025730",
  "1d6cc4e768b2606b", "80fb71876f2ae342", "ced8fb1c6bc0a5ca", "a3da73976501812c", "822f9500f4118440", "da14fab779e85206",
  "b193ce3c0dc5e1a8", "45d7c42cb65265ae", "f27585c0348b460b", "f2bec3a0f8b2235a", "de7ee76e7373c19b", "17f074cb309692fd"]);
const NAME_OK = [{ hash: "1d6cc4e768b2606b", file: /^app-\d+\.js$/ }, { hash: "74604cdb98318650", file: /^demo\/index\.html$/ }];
const wordHash = (w) => require("crypto").createHash("sha256").update(w.toLowerCase()).digest("hex").slice(0, 16);
const NOTE_KEY = /^(?:_?notes?|_?comments?|\/\/|_?todo|_?doc|_?readme|_?why)$/i;
const ALLOWED = [
  { id: "debug", file: /^app-\d+\.js$/, match: /^debug$/, near: /_debug\s*:/, why: "BH.audio._debug(): a read-only snapshot of the sound engine (which sounds exist, has audio started); code, no notes" },
  { id: "file-path", file: /^index\.html$/, match: /^\/app-\d+\.js$/, why: "the page's own script addresses (the bundles)" },
];

function audit(dir) {
  const findings = [], allowed = [], files = [];
  const rel = (p) => path.relative(dir, p).split(path.sep).join("/");
  const push = (hit, s) => {
    const ok = ALLOWED.find((a) => a.id === hit.id && a.file.test(hit.file) && a.match.test(hit.match) &&
      (!a.near || a.near.test(a.wide ? s.slice(Math.max(0, hit.at - 80), hit.at + 80) : s.slice(Math.max(0, hit.at - 2), hit.at + hit.match.length + 4))));
    (ok ? allowed : findings).push(ok ? Object.assign(hit, { why: ok.why }) : hit);
  };
  (function each(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) each(p); else files.push(rel(p));
    }
  })(dir);
  const has = new Set(files);
  for (const f of files) {
    const base = f.split("/").pop();
    if (/\.(md|map|py|sh|ts|log|bak|orig|swp)$/i.test(base) || /^(readme|license|changelog|notes?)\b/i.test(base) || /^(package(-lock)?\.json|tsconfig\.json|jsconfig\.json|Dockerfile[\w.]*|Caddyfile)$/.test(base) ||
        f.split("/").some((seg) => seg.startsWith(".")) ||/^(debug\.js|[\w-]+-preview\.(js|css|html))$/.test(base))
      push({ id: "dev-file", file: f, match: base, at: 0, ctx: "" }, "");
    const m = /^(.*)\.(br|gz|zst)$/.exec(f);
    if (m && !has.has(m[1])) findings.push({ id: "compressed-without-plain", file: f, match: m[2], at: 0, ctx: "" });
  }
  for (const f of files) {
    if (!/\.(js|html|css|json|txt|svg|xml|webmanifest)$/.test(f)) continue;
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    const sm = s.replace(/(data:[\w/+.-]+;base64,)([A-Za-z0-9+/=]+)/g, (m, h, b) => h + "A".repeat(b.length));
    for (const c of CHECKS) {
      if (!c.kinds.test(f)) continue;
      for (const m of sm.matchAll(c.re)) {
        const hit = { id: c.id, file: f, match: m[0].replace(/^[\s"'(=]/, ""), at: m.index, ctx: s.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60).replace(/\s+/g, " ") };
        const ok = ALLOWED.find((a) => a.id === hit.id && a.file.test(f) && a.match.test(hit.match) && (!a.near || a.near.test(s.slice(Math.max(0, m.index - 2), m.index + m[0].length + 4))));
        (ok ? allowed : findings).push(ok ? Object.assign(hit, { why: ok.why }) : hit);
      }
    }
    const near = (at, n) => s.slice(Math.max(0, at - 40), at + (n || 0) + 40).replace(/\s+/g, " ");
    for (const m of sm.matchAll(/[A-Za-z0-9]+/g)) {
      if (m[0].length < 4 || m[0].length > 16 || !NAME_HASHES.has(wordHash(m[0]))) continue;
      if (NAME_OK.some((a) => a.hash === wordHash(m[0]) && a.file.test(f))) continue;
      findings.push({ id: "person-name", file: f, match: "#" + wordHash(m[0]).slice(0, 6), at: m.index, ctx: "(a name; see the file at offset " + m.index + ")" });
    }
    if (/\.json$/.test(f)) {
      try {
        (function keys(v, at) {
          if (Array.isArray(v)) v.forEach((x, i) => keys(x, at + "[" + i + "]"));
          else if (v && typeof v === "object") for (const k of Object.keys(v)) { if (NOTE_KEY.test(k)) findings.push({ id: "json-note", file: f, match: at + "." + k, at: 0, ctx: "" }); keys(v[k], at + "." + k); }
        })(JSON.parse(s), "$");
      } catch (e) { findings.push({ id: "json-does-not-parse", file: f, match: String(e.message).slice(0, 80), at: 0, ctx: "" }); }
    }
    if (/\.js$/.test(f)) {
      if (!acorn) { findings.push({ id: "audit-could-not-run", file: f, match: "no acorn (run node with --expose-internals)", at: 0, ctx: "" }); continue; }
      try {
        const ast = acorn.parse(s, { ecmaVersion: "latest", sourceType: "script", allowHashBang: true, allowReturnOutsideFunction: true,
          onComment: (block, text, start) => findings.push({ id: "js-comment", file: f, match: (block ? "/*" : "//") + text.slice(0, 60), at: start, ctx: s.slice(Math.max(0, start - 40), start + 80).replace(/\s+/g, " ") }) });
        (function walk(n) {
          if (!n || typeof n.type !== "string") return;
          if (n.type === "Identifier" && n.name === "console") push({ id: "console", file: f, match: s.slice(n.start, n.end + 12), at: n.start, ctx: near(n.start, 20) }, s);
          if (n.type === "Literal" && n.value === "console") push({ id: "console", file: f, match: "\"console\"", at: n.start, ctx: near(n.start, 9) }, s);
          for (const k of Object.keys(n)) {
            const v = n[k];
            if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v);
          }
        })(ast);
      } catch (e) { findings.push({ id: "js-does-not-parse", file: f, match: String(e.message).slice(0, 80), at: 0, ctx: "" }); }
    }
  }
  return { files: files.length, findings, allowed };
}

module.exports = { audit, CHECKS, ALLOWED };

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(path.join(dir, "index.html"))) { console.error("usage: node --expose-internals tools/audit-built.js <built dir with index.html>"); process.exit(2); }
  const r = audit(dir);
  const groups = new Map();
  for (const a of r.allowed) { const k = a.id + " " + a.match + " (" + a.file + ")"; groups.set(k, (groups.get(k) || { n: 0, why: a.why })); groups.get(k).n++; }
  console.log("audit-built: " + r.files + " files; " + r.findings.length + " unexpected; " + r.allowed.length + " allowed hits:");
  for (const [k, v] of groups) console.log("  allowed " + v.n + "x " + k + " - " + v.why);
  const byId = {};
  for (const f of r.findings) byId[f.id] = (byId[f.id] || 0) + 1;
  if (r.findings.length) console.log("  by kind: " + Object.entries(byId).map(([k, n]) => k + " " + n).join(", "));
  for (const f of r.findings.slice(0, 40)) console.log("  UNEXPECTED " + f.id + " in " + f.file + ": " + JSON.stringify(f.match) + (f.ctx ? "  | " + f.ctx : ""));
  process.exit(r.findings.length ? 1 : 0);
}
