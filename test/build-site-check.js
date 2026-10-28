"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), SITE = path.join(ROOT, "site"), SCRIPT = path.join(ROOT, "tools", "build-site.sh");
let pass = 0, fail = 0;
const ok = (what, c, info) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + what + (info !== undefined ? " " + JSON.stringify(info) : "")); };
const build = (dir) => spawnSync("bash", [SCRIPT, dir], { encoding: "utf8" });
const tmp = (tag) => fs.mkdtempSync(path.join(os.tmpdir(), "bh-build-" + tag + "-"));
const cleanup = [];
try {
  const dir = tmp("site"); cleanup.push(dir);
  fs.cpSync(SITE, dir, { recursive: true });
  for (const p of ["assets/fonts/ibm-plex-sans-condensed-500.woff2", "assets/fonts/ibm-plex-sans-condensed-600.woff2"])
    fs.copyFileSync(path.join(dir, p), path.join(dir, "login", path.basename(p)));
  const r = build(dir);
  ok("build-site.sh exits 0 on site/", r.status === 0, (r.stderr || "").trim().slice(0, 300));
  ok("it bundled (no fallback warning)", !/WARNING/.test(r.stderr) && /app-1\.js/.test(r.stdout), r.stdout.trim().slice(0, 200));
  const srcHtml = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const order = [...srcHtml.matchAll(/<script src="([^"?]+)"/g)].map((m) => m[1]);
  const loaded = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  ok("index.html loads only stamped bundles, by absolute URL", loaded.length >= 1 && loaded.every((s) => /^\/app-\d+\.js\?v=[0-9a-f]{12}$/.test(s)), loaded);
  ok("index.html names no relative local URL (src / href)", ![...html.matchAll(/\b(?:href|src)="(?![a-z][a-z0-9+.-]*:|\/|#)[^"]*"/gi)].length,
    [...html.matchAll(/\b(?:href|src)="[^"]*"/gi)].map((m) => m[0]));
  ok("stylesheet and every font stamped + fonts preloaded", /href="\/style\.css\?v=/.test(html) && !/url\(assets\/[^)?]+\)/.test(fs.readFileSync(path.join(dir, "style.css"), "utf8")) &&
    (html.match(/rel="preload"[^>]+as="font"[^>]+crossorigin/g) || []).length === (fs.readFileSync(path.join(SITE, "style.css"), "utf8").match(/url\(assets\/fonts\//g) || []).length);
  const srcSheets = [...srcHtml.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  ok("every stylesheet link stamped (style.css + the end-card looks)", sheets.length === srcSheets.length && srcSheets.length >= 3 &&
    sheets.every((s, i) => s.startsWith("/" + srcSheets[i] + "?v=") && /\?v=[0-9a-f]{12}$/.test(s)), sheets);
  const stub = () => { const ctx = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : ctx), set: () => true, apply: () => ctx }); const el = () => ({ style: { setProperty() {}, removeProperty() {} }, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, addEventListener() {}, appendChild() {}, setAttribute() {}, getContext() { return ctx; }, querySelector() { return null; }, querySelectorAll() { return []; } });
    const w = { document: { readyState: "loading", getElementById: el, createElement: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, body: el(), documentElement: el(), fonts: null },
      addEventListener() {}, removeEventListener() {}, requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {}, setInterval() {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
      localStorage: { getItem() { return null; }, setItem() {} }, location: { search: "", href: "http://x/", hash: "" }, navigator: { userAgent: "node", maxTouchPoints: 0 }, innerWidth: 1440, innerHeight: 900,
      Image: function () { this.complete = true; }, performance: { now: () => 0 }, URLSearchParams, console: { log() {}, warn() {}, error() {}, info() {} }, Math, JSON, Date, Promise };
    w.window = w; w.self = w; return vm.createContext(w); };
  const globalsOf = (files, base) => { const c = stub(); const errs = []; for (const f of files) { try { vm.runInContext(fs.readFileSync(path.join(base, f), "utf8"), c, { filename: f }); } catch (e) { errs.push(f + ": " + e.message); } }
    return { keys: Object.keys(c).filter((k) => k !== "__bhCut").sort().join(","), errs }; };
  const a = globalsOf(order, SITE), b = globalsOf(loaded.map((s) => s.split("?")[0]), dir);
  ok("bundles define the same globals as the separate files (plus __bhCut, the cut-out lookup)", a.keys === b.keys, a.keys === b.keys ? undefined : { onlySrc: a.keys.split(",").filter((k) => !b.keys.split(",").includes(k)), onlyBuilt: b.keys.split(",").filter((k) => !a.keys.split(",").includes(k)) });
  ok("…and fail (or not) the same way under the stub", a.errs.length === 0 ? b.errs.length === 0 : b.errs.length > 0, { src: a.errs.slice(0, 2), built: b.errs.slice(0, 2) });
  const all = loaded.map((s) => fs.readFileSync(path.join(dir, s.split("?")[0]), "utf8")).join("\n");
  const cuts = [...all.matchAll(/"(\d{3})":"data:image\/png;base64,([^"]+)"/g)];
  ok("every cut-out inlined byte-identical", cuts.length === fs.readdirSync(path.join(SITE, "assets/cut")).filter((f) => /^\d{3}\.png$/.test(f)).length &&
    cuts.every((m) => Buffer.from(m[2], "base64").equals(fs.readFileSync(path.join(SITE, "assets/cut", m[1] + ".png")))), cuts.length);
  ok("no string in the bundles still points at assets/cut/ outside the fallback", (all.match(/assets\/cut\//g) || []).length === 1);
  ok("the music ships: music.js's tracks are in a bundle, audio.js names /assets/music/uncatchable.ogg + .m4a, both files kept byte-identical",
    /Greenroot/.test(all) && /After the Storm/.test(all) && all.includes("/assets/music/uncatchable.ogg") && all.includes("/assets/music/uncatchable.m4a") &&
    ["uncatchable.ogg", "uncatchable.m4a"].every((f) => fs.existsSync(path.join(dir, "assets/music", f)) && fs.readFileSync(path.join(dir, "assets/music", f)).equals(fs.readFileSync(path.join(SITE, "assets/music", f)))));
  ok("precompressed .br/.gz written for the bundles", loaded.every((s) => { const f = path.join(dir, s.split("?")[0]); return fs.existsSync(f + ".br") && fs.existsSync(f + ".gz"); }));
  ok("the original script files are NOT shipped (their comments would be readable); the bundles hold them", order.every((f) => !fs.existsSync(path.join(dir, f))), order.filter((f) => fs.existsSync(path.join(dir, f))));
  ok("no debug.js and none of its test helpers in the bundles", !/function runUntil|function autopilotVec|function setupDebug|__hunt|__demo/.test(all));
  ok("no dev-only marker or test hook is left in the bundles", !/@dev-only|@end-dev-only|__hunt|__demo|fbdemo/.test(all), (all.match(/@dev-only|@end-dev-only|__hunt|__demo|fbdemo/g) || []).slice(0, 5));
  const audit = require(path.join(ROOT, "tools", "audit-built.js"));
  const au = spawnSync(process.execPath, ["--expose-internals", path.join(ROOT, "tools", "audit-built.js"), dir], { encoding: "utf8" });
  ok("audit-built: the built site has NO comment, note, dev file, internal address, file path or env var name left (only the listed, explained hits)", au.status === 0 && /0 unexpected/.test(au.stdout), au.stdout.split("\n").filter((l) => /UNEXPECTED/.test(l)).slice(0, 5).join(" | ") || au.stdout.slice(0, 200));
  const dirty = tmp("dirty"); cleanup.push(dirty);
  fs.cpSync(dir, dirty, { recursive: true });
  fs.appendFileSync(path.join(dirty, "style.css"), "/* TODO: dev note */\n");
  fs.writeFileSync(path.join(dirty, "index.html"), fs.readFileSync(path.join(dirty, "index.html"), "utf8").replace("</body>", "<!-- a dev note -->\n</body>"));
  fs.appendFileSync(path.join(dirty, loaded[0].split("?")[0].slice(1)), "// S123 dev note\n");
  fs.writeFileSync(path.join(dirty, "debug.js"), "var x = 1;\n");
  fs.writeFileSync(path.join(dirty, "data", "notes.json"), JSON.stringify({ url: "http://api.railway.internal:8080", key: "DATABASE_URL" }));
  const dau = spawnSync(process.execPath, ["--expose-internals", path.join(ROOT, "tools", "audit-built.js"), dirty], { encoding: "utf8" });
  const ids = new Set([...dau.stdout.matchAll(/UNEXPECTED ([\w-]+) in/g)].map((m) => m[1]));
  ok("CONTROL: the audit FAILS (exit 1) on a planted CSS comment, HTML comment, JS comment (+ session tag), a dev file, an internal address and an env var name",
    dau.status === 1 && ["css-comment", "html-comment", "js-comment", "session-tag", "dev-file", "internal-address", "env-name"].every((k) => ids.has(k)) && !ids.has("audit-could-not-run"), [dau.status, ...ids]);
  ok("  the audit's own list of checks and explained hits is loadable (one place to read what remains and why)", Array.isArray(audit.ALLOWED) && audit.ALLOWED.every((x) => x.why && x.why.length > 20));

  const mini = (tag, files, htmlBody) => { const d = tmp(tag); cleanup.push(d);
    fs.writeFileSync(path.join(d, "style.css"), "body{}\n");
    fs.writeFileSync(path.join(d, "index.html"), '<!doctype html>\n<link rel="stylesheet" href="style.css">\n' + htmlBody);
    for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(d, f), s);
    return build(d); };
  const dup = mini("dup", { "a.js": "function go() { return 1; }\nvar x = go();\n", "b.js": "function go() { return 2; }\n" }, '<script src="a.js"></script>\n<script src="b.js"></script>\n');
  ok("CONTROL: two files declaring the same top-level function -> build FAILS", dup.status !== 0 && /both declare function go/.test(dup.stderr), dup.stderr.trim().slice(0, 160));
  const miss = mini("miss", { "a.js": "var a = 1;\n" }, '<script src="a.js"></script>\n<script src="gone.js"></script>\n');
  ok("CONTROL: index.html naming a missing script -> build FAILS", miss.status !== 0 && /gone\.js/.test(miss.stderr), miss.stderr.trim().slice(0, 160));
  const rel = mini("rel", { "a.js": "var u = \"data/chain.json\";\n" }, '<script src="a.js"></script>\n');
  ok("CONTROL: a script naming data/… or assets/… relatively -> build FAILS (it would break at /level/N/…)", rel.status !== 0 && /relative local URL/.test(rel.stderr), rel.stderr.trim().slice(0, 160));
  const good = mini("good", { "a.js": "var a = 1; // c\n", "b.js": "\"use strict\";\n/* c */ var b = a + 1;\n" }, '<script src="a.js"></script>\n<script src="b.js"></script>\n');
  ok("CONTROL: a sloppy + a strict file -> two bundles, strict one still starts with its directive", good.status === 0 && /2 scripts -> app-1\.js .*\+ app-2\.js/.test(good.stdout), good.stdout.trim().slice(0, 160));
  const devCut = mini("devcut", { "a.js": "var keep = 1;\n/* @dev-only: test */\nvar hookOnly = location.search.indexOf('x') >= 0;\nif (hookOnly) keep = 2;\n/* @end-dev-only */\n" }, '<script src="a.js"></script>\n');
  const devCutDir = cleanup[cleanup.length - 1];
  const cutJs = devCut.status === 0 ? fs.readFileSync(path.join(devCutDir, "app-1.js"), "utf8") : "";
  ok("CONTROL: a /* @dev-only */ block is cut from the bundle (the code around it stays)", devCut.status === 0 && /var keep=1/.test(cutJs) && !/hookOnly/.test(cutJs), devCut.stderr.trim().slice(0, 160) || cutJs.slice(0, 80));
  const devBad = mini("devbad", { "a.js": "/* @dev-only: test */\nvar hookOnly = 1;\n/* @end-dev-only */\nvar y = hookOnly + 1;\n" }, '<script src="a.js"></script>\n');
  ok("CONTROL: a @dev-only block whose variable is still used outside it -> build FAILS", devBad.status !== 0 && /still uses what the block declared: hookOnly/.test(devBad.stderr), devBad.stderr.trim().slice(0, 160));
  const devOdd = mini("devodd", { "a.js": "/* @dev-only: test */\nvar a = 1;\n" }, '<script src="a.js"></script>\n');
  ok("CONTROL: an unpaired @dev-only marker -> build FAILS", devOdd.status !== 0 && /do not pair up/.test(devOdd.stderr), devOdd.stderr.trim().slice(0, 160));
  const cssDir = tmp("css"); cleanup.push(cssDir);
  fs.writeFileSync(path.join(cssDir, "style.css"), "/* header note */\nbody { color: red; } /* trailing */\n.a::after { content: \"/* not a comment */\"; }\n");
  fs.writeFileSync(path.join(cssDir, "index.html"), '<!doctype html>\n<!-- page note -->\n<link rel="stylesheet" href="style.css">\n<script src="a.js"></script>\n');
  fs.writeFileSync(path.join(cssDir, "a.js"), "var a = 1; console.log('dev'); if (a) console.trace(); else console.info('x');\nconsole.error('gone'); console.warn('gone');\nvar w = console.warn;\n");
  const cssB = build(cssDir);
  const cssOut = cssB.status === 0 ? fs.readFileSync(path.join(cssDir, "style.css"), "utf8") : "", jsOut = cssB.status === 0 ? fs.readFileSync(path.join(cssDir, "app-1.js"), "utf8") : "";
  ok("CONTROL: CSS comments are dropped, a \"/*\" inside a CSS string is kept, the HTML comment is dropped", cssB.status === 0 && !/header note|trailing/.test(cssOut) && /content: "\/\* not a comment \*\/"/.test(cssOut) && !/page note/.test(fs.readFileSync(path.join(cssDir, "index.html"), "utf8")), cssB.stderr.trim().slice(0, 160) || cssOut);
  ok("CONTROL: every console call used as a statement (log / trace / info / error / warn) becomes void 0 (still valid where a statement is needed); a console use whose value is used stays, for the audit to catch", /if\(a\)void 0;else void 0/.test(jsOut) && !/console\.\w+\(/.test(jsOut) && !/gone/.test(jsOut) && /var w=console\.warn;/.test(jsOut), jsOut.trim());
} finally {
  for (const d of cleanup) fs.rmSync(d, { recursive: true, force: true });
}
console.log(`BUILD-SITE: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
