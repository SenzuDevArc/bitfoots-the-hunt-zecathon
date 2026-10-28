"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), zlib = require("zlib");

let acorn = null;
try { acorn = require("internal/deps/acorn/acorn/dist/acorn"); } catch (e) { acorn = null; }
if (!acorn) { console.error("build-site.js: acorn is not available (run node with --expose-internals) — not bundling"); process.exit(3); }

const dir = path.resolve(process.argv[2] || "");
if (!process.argv[2] || !fs.existsSync(path.join(dir, "index.html")) || !fs.existsSync(path.join(dir, "style.css"))) {
  console.error("build-site.js: usage: build-site.js <dir with index.html and style.css>"); process.exit(1);
}
const die = (msg) => { console.error("build-site.js: " + msg); process.exit(1); };
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n");
const hash = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
const fileHash = (f) => hash(fs.readFileSync(path.join(dir, f)));
const exists = (f) => { try { return fs.statSync(path.join(dir, f)).isFile(); } catch (e) { return false; } };
const K = require("./clean-lib.js")(acorn, die);
const { PARSE, walk, applyEdits, minify, stripDevBlocks, stripConsole } = K;
const MIME = { ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".gif": "image/gif" };
const INLINE_MAX = 8192;
const dataUri = (f) => "data:" + MIME[path.extname(f)] + ";base64," + fs.readFileSync(path.join(dir, f)).toString("base64");
const assetUrl = (f) => (fs.statSync(path.join(dir, f)).size <= INLINE_MAX ? dataUri(f) : "/" + f + "?v=" + fileHash(f));

let html = read("index.html");
const TAG = /^[ \t]*<script src="([^"?:]+)"><\/script>[ \t]*\n/gm;
const listed = [...html.matchAll(TAG)].map((m) => m[1]);
if (!listed.length) die("no <script src> tags found in index.html");
const allTags = (html.match(/<script\b/g) || []).length;
if (allTags !== listed.length) die(`index.html has ${allTags} <script> tags but only ${listed.length} plain local ones — a tag this build does not understand`);
for (const f of listed) if (!exists(f)) die(`index.html loads ${f}, which is missing`);

if (listed.includes("debug.js")) die("index.html loads debug.js, a dev-only script");
const scripts = listed;
(function each(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name), f = path.relative(dir, p).split(path.sep).join("/");
    if (e.isDirectory()) each(p);
    else if (/\.css$/.test(e.name)) stripCssComments(f);
    else if (/\.svg$/.test(e.name)) stripHtmlComments(f);
  }
})(dir);

const isStr = (n) => n && n.type === "Literal" && typeof n.value === "string";

const CUT_DIR = "assets/cut/";
const cutIds = fs.existsSync(path.join(dir, CUT_DIR)) ? fs.readdirSync(path.join(dir, CUT_DIR)).filter((f) => /^[\w-]+\.png$/.test(f)).map((f) => f.slice(0, -4)).sort() : [];
let cutsRewritten = 0, cutsLeft = 0, picsInlined = 0, picsStamped = 0;
const ASSET_IN_STRING = /assets\/[\w./-]+\.(?:png|svg|webp|jpg|gif)(?![\w?#])/g;
function transformAssets(file, src) {
  let ast;
  try { ast = acorn.parse(src, PARSE); } catch (e) { die(`${file} does not parse: ${e.message}`); }
  const edits = [], inChain = new Set();
  walk(ast, (n) => {
    if (n.type === "BinaryExpression" && n.operator === "+" && !inChain.has(n)) {
      const ops = [];
      (function flat(e) { if (e.type === "BinaryExpression" && e.operator === "+") { inChain.add(e); flat(e.left); ops.push(e.right); } else ops.push(e); })(n);
      for (let i = 0; i + 2 < ops.length; i++) {
        const a = ops[i], x = ops[i + 1], b = ops[i + 2];
        if (isStr(a) && a.value.endsWith(CUT_DIR) && isStr(b) && b.value.startsWith(".png") &&
            src.slice(a.end - 1 - CUT_DIR.length, a.end - 1) === CUT_DIR && src.slice(b.start + 1, b.start + 5) === ".png") {
          edits.push({ at: a.end - 1 - CUT_DIR.length, del: CUT_DIR.length, ins: "" });
          edits.push({ at: x.start, del: 0, ins: "__bhCut(" }, { at: x.end, del: 0, ins: ")" });
          edits.push({ at: b.start + 1, del: 4, ins: "" });
          cutsRewritten++; i += 2;
        }
      }
    }
    if (isStr(n) || n.type === "TemplateElement") {
      const raw = src.slice(n.start, n.end);
      for (const m of raw.matchAll(ASSET_IN_STRING)) {
        if (!exists(m[0])) continue;
        const url = assetUrl(m[0]);
        url.startsWith("data:") ? picsInlined++ : picsStamped++;
        edits.push({ at: n.start + m.index, del: m[0].length, ins: url });
      }
    }
  });
  src = applyEdits(src, edits);
  walk(acorn.parse(src, PARSE), (n) => { if ((isStr(n) && n.value.includes(CUT_DIR)) || (n.type === "TemplateElement" && n.value.raw.includes(CUT_DIR))) cutsLeft++; });
  return src;
}

const files = scripts.map((f) => {
  const src = transformAssets(f, stripConsole(f, stripDevBlocks(f, read(f))));
  const ast = acorn.parse(src, PARSE);
  const strict = !!(ast.body[0] && ast.body[0].type === "ExpressionStatement" && ast.body[0].directive === "use strict");
  const funcs = [], vars = [];
  for (const s of ast.body) {
    if (s.type === "FunctionDeclaration") funcs.push(s.id.name);
    if (s.type === "VariableDeclaration") s.declarations.forEach((d) => d.id.type === "Identifier" && vars.push(d.id.name));
  }
  return { f, src, strict, funcs, vars };
});
const groups = [];
for (const x of files) { const g = groups[groups.length - 1]; if (g && g[0].strict === x.strict) g.push(x); else groups.push([x]); }
for (const g of groups) {
  const fnAt = new Map();
  g.forEach((x, i) => x.funcs.forEach((n) => { if (fnAt.has(n)) die(`${x.f} and ${g[fnAt.get(n)].f} both declare function ${n} — they cannot share a bundle`); fnAt.set(n, i); }));
  g.forEach((x, i) => x.vars.forEach((n) => { if (fnAt.has(n) && fnAt.get(n) !== i) die(`${x.f} declares var ${n} and ${g[fnAt.get(n)].f} declares function ${n} — a bundle would change which one wins`); }));
}
const CUT_MAP = "var __bhCut=(function(m){return function(id){return m[id]||\"/assets/cut/\"+id+\".png\"}})({" +
  cutIds.map((id) => JSON.stringify(id) + ":" + JSON.stringify(dataUri(CUT_DIR + id + ".png"))).join(",") + "});\n";
const bundles = groups.map((g, gi) => {
  let body = g.map((x) => minify(x.f, x.src)).join(";\n");
  if (gi === 0) {
    if (g[0].strict) { const m = body.match(/^("use strict"|'use strict');?\n?/); body = m[0] + CUT_MAP + body.slice(m[0].length); }
    else body = CUT_MAP + body;
  }
  let ast;
  try { ast = acorn.parse(body, PARSE); } catch (e) { die(`bundle ${gi + 1} does not parse: ${e.message}`); }
  const rel = [];
  walk(ast, (n) => {
    const v = isStr(n) ? n.value : n.type === "TemplateElement" ? n.value.raw : null;
    if (v != null && /(?:^|["'(=\s])(?:assets|data)\/[\w-]/.test(v)) rel.push(v.slice(0, 80));
  });
  if (rel.length) die(`bundle ${gi + 1} still names a relative local URL (make it absolute, "/assets/…"): ` + rel.join(" | "));
  const name = "app-" + (gi + 1) + ".js";
  fs.writeFileSync(path.join(dir, name), body);
  return { name, files: g.map((x) => x.f), strict: g[0].strict, bytes: body.length };
});
const order = bundles.flatMap((b) => b.files);
if (order.join("|") !== scripts.join("|")) die("load order check failed: " + order.join(",") + " != " + scripts.join(","));

let css = read("style.css");
const cssRefs = [...new Set([...css.matchAll(/url\((assets\/[^)?#:]+)\)/g)].map((m) => m[1]))];
for (const f of cssRefs) { if (!exists(f)) die(`style.css refers to ${f}, which is missing`); css = css.split("url(" + f + ")").join("url(" + f + "?v=" + fileHash(f) + ")"); }
fs.writeFileSync(path.join(dir, "style.css"), css);
let first = true;
html = html.replace(TAG, (line) => {
  if (!first) return "";
  first = false;
  const indent = line.match(/^[ \t]*/)[0];
  return bundles.map((b) => `${indent}<script src="/${b.name}?v=${fileHash(b.name)}"></script>\n`).join("");
});
const fonts = cssRefs.filter((f) => /\.woff2$/.test(f));
const preload = fonts.map((f) => `<link rel="preload" href="/${f}?v=${fileHash(f)}" as="font" type="font/woff2" crossorigin>\n`).join("");
if (!html.includes('<link rel="stylesheet" href="style.css">')) die('index.html has no <link rel="stylesheet" href="style.css">');
html = html.replace('<link rel="stylesheet" href="style.css">', preload + `<link rel="stylesheet" href="/style.css?v=${fileHash("style.css")}">`);
html = html.replace(/(<link rel="icon" href=")(assets\/[^"?]+)"/, (m, a, f) => (exists(f) ? `${a}/${f}?v=${fileHash(f)}"` : m));
for (const m of [...html.matchAll(/<link rel="stylesheet" href="([^"?:/][^"?:]*\.css)">/g)]) {
  const f = m[1];
  if (!exists(f)) die(`index.html links ${f}, which is missing`);
  if (/url\((?!["']?data:)/.test(read(f))) die(`${f} has a url() that is not a data: URI (only style.css gets its assets stamped)`);
  html = html.split(m[0]).join(`<link rel="stylesheet" href="/${f}?v=${fileHash(f)}">`);
}
if (/<link rel="stylesheet" href="[^"?]+"/.test(html)) die("an unstamped stylesheet is left in index.html");
html = html.replace(/\b(href|src)="(?![a-z][a-z0-9+.-]*:|\/|#)([^"]+)"/gi, (m, a, u) => `${a}="/${u}"`);
const left = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
if (left.length !== bundles.length || left.some((s, i) => !s.startsWith("/" + bundles[i].name + "?v="))) die("index.html does not load exactly the bundles: " + left.join(","));
if (!/href="\/style\.css\?v=/.test(html)) die("style.css was not stamped");
const relLeft = [...html.matchAll(/\b(?:href|src)="(?![a-z][a-z0-9+.-]*:|\/|#)[^"]*"/gi)].map((m) => m[0]);
if (relLeft.length) die("index.html still names a relative URL (it breaks at /level/N/…): " + relLeft.join(", "));
fs.writeFileSync(path.join(dir, "index.html"), html);

function stripHtmlComments(f) { const s = read(f), out = K.cleanHtml(f, s); if (out !== s) fs.writeFileSync(path.join(dir, f), out); }
function stripCssComments(f) { fs.writeFileSync(path.join(dir, f), K.cleanCss(f, read(f))); }
const linkedCss = new Set([...html.matchAll(/<link rel="stylesheet" href="\/([^"?]+)\?v=/g)].map((m) => m[1]));
const keepTop = new Set(["index.html", "style.css", "robots.txt", ...bundles.map((b) => b.name), ...[...linkedCss].filter((c) => !c.includes("/"))]);
const KEEP_DIRS = new Set(["assets", "data", "login", "demo"]);
let deleted = 0;
const rm = (p) => { fs.rmSync(p, { recursive: true, force: true }); deleted++; };
for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) {
    if (KEEP_DIRS.has(e.name)) continue;
    const keep = [...linkedCss].filter((c) => c.startsWith(e.name + "/"));
    if (!keep.length) { rm(p); continue; }
    for (const f of fs.readdirSync(p)) if (!keep.includes(e.name + "/" + f)) rm(path.join(p, f));
  } else if (!keepTop.has(e.name)) rm(p);
}
(function each(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) each(p);
    else if (/\.(md|map|py)$/i.test(e.name)) rm(p);
  }
})(dir);
const rel = (p) => path.relative(dir, p).split(path.sep).join("/");
(function each(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name), f = rel(p);
    if (e.isDirectory()) { each(p); continue; }
    if (/\.html$/.test(e.name)) stripHtmlComments(f);
    else if (/\.js$/.test(e.name) && !bundles.some((b) => b.name === f)) fs.writeFileSync(p, K.cleanJs(f, read(f)));
  }
})(dir);
if (exists("debug.js")) die("a dev-only script is still in the output");
const missing = [...read("index.html").matchAll(/\b(?:href|src)="\/(?!api\/)([^"?#]+)/g)].map((m) => m[1]).filter((f) => !exists(f));
if (missing.length) die("the clean-up deleted a file index.html loads: " + missing.join(", "));
(function each(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { each(p); continue; }
    if (!/\.json$/.test(e.name)) continue;
    const f = rel(p), s = read(f), out = K.cleanJson(f, s);
    if (out !== s) fs.writeFileSync(p, out);
  }
})(dir);

let pre = 0;
(function each(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { each(p); continue; }
    if (!/\.(js|css|html|svg|json|txt|xml)$/.test(e.name)) continue;
    const buf = fs.readFileSync(p);
    if (buf.length < 512) continue;
    const out = {
      ".br": zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }),
      ".gz": zlib.gzipSync(buf, { level: 9 }),
    };
    if (zlib.zstdCompressSync) out[".zst"] = zlib.zstdCompressSync(buf, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 19 } });
    for (const [ext, b] of Object.entries(out)) if (b.length < buf.length) { fs.writeFileSync(p + ext, b); pre++; }
  }
})(dir);

const kb = (n) => (n / 1024).toFixed(0) + " KB";
console.log(`build-site.js: ${scripts.length} scripts -> ${bundles.map((b) => b.name + " (" + b.files.length + " files, " + (b.strict ? "strict" : "sloppy") + ", " + kb(b.bytes) + ")").join(" + ")}; ` +
  `${cutsRewritten} cut-out lookups + ${picsInlined} pictures inlined, ${picsStamped} stamped${cutsLeft ? `, ${cutsLeft} 'assets/cut/' left as is (UNKNOWN PATTERN, still loads from the network)` : ""}; ` +
  `style.css + ${cssRefs.length} fonts stamped, ${fonts.length} preloaded; ${pre} precompressed copies; ` +
  `clean: ${K.stats.devBlocks} @dev-only blocks cut, ${K.stats.consoleCalls} console calls dropped, ${K.stats.jsonNotes || 0} JSON note keys cut, ${deleted} dev files deleted`);
