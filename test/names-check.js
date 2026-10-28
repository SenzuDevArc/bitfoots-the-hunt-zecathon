"use strict";
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");

let acorn = null;
try { acorn = require("internal/deps/acorn/acorn/dist/acorn"); } catch (e) { acorn = null; }
if (!acorn) {
  if (process.execArgv.includes("--expose-internals")) { console.error("names-check: acorn is not available"); process.exit(1); }
  const r = spawnSync(process.execPath, ["--expose-internals", __filename, ...process.argv.slice(2)], { stdio: "inherit" });
  process.exit(r.status === null ? 1 : r.status);
}

const ROOT = path.join(__dirname, "..");
const SITE = path.join(ROOT, "site");
const PARSE = { ecmaVersion: "latest", sourceType: "script", allowHashBang: true, locations: true };

const LANGUAGE_GLOBALS = [
  "AggregateError", "Array", "ArrayBuffer", "Atomics", "BigInt", "BigInt64Array", "BigUint64Array", "Boolean",
  "DataView", "Date", "Error", "EvalError", "FinalizationRegistry", "Float32Array", "Float64Array", "Function",
  "Infinity", "Int16Array", "Int32Array", "Int8Array", "Intl", "Iterator", "JSON", "Map", "Math", "NaN", "Number",
  "Object", "Promise", "Proxy", "RangeError", "ReferenceError", "Reflect", "RegExp", "Set", "SharedArrayBuffer",
  "String", "Symbol", "SyntaxError", "TypeError", "URIError", "Uint16Array", "Uint32Array", "Uint8Array",
  "Uint8ClampedArray", "WeakMap", "WeakRef", "WeakSet", "decodeURI", "decodeURIComponent", "encodeURI",
  "encodeURIComponent", "eval", "globalThis", "isFinite", "isNaN", "parseFloat", "parseInt", "structuredClone",
  "undefined",
];

const BROWSER_GLOBALS = [
  "AbortController", "AbortSignal", "Audio", "AudioContext", "Blob", "BroadcastChannel", "CSS", "CSSMediaRule",
  "CanvasRenderingContext2D", "ClipboardItem", "CompressionStream", "CustomEvent", "DOMException", "DOMParser", "DOMRect",
  "DecompressionStream", "Document", "DocumentFragment", "Element", "Event", "EventSource", "EventTarget", "File",
  "FileReader", "FontFace", "FormData", "GainNode", "HTMLAnchorElement", "HTMLAudioElement", "HTMLButtonElement",
  "HTMLCanvasElement", "HTMLElement", "HTMLImageElement", "HTMLInputElement", "HTMLVideoElement", "Headers", "Image",
  "ImageBitmap", "ImageData", "IntersectionObserver", "KeyboardEvent", "MediaRecorder", "MediaStream", "MessageChannel",
  "MouseEvent", "MutationObserver", "Node", "OfflineAudioContext", "OffscreenCanvas", "Option", "Path2D",
  "PerformanceObserver", "PointerEvent", "Request", "ResizeObserver", "Response", "TextDecoder", "TextEncoder", "TouchEvent", "URL", "URLSearchParams",
  "WebSocket", "Worker", "XMLHttpRequest", "addEventListener", "alert", "atob", "btoa", "cancelAnimationFrame",
  "cancelIdleCallback", "clearInterval", "clearTimeout", "confirm", "console", "createImageBitmap", "crypto",
  "devicePixelRatio", "dispatchEvent", "document", "fetch", "getComputedStyle", "history", "indexedDB",
  "innerHeight", "innerWidth", "localStorage", "location", "matchMedia", "navigator", "open", "outerHeight",
  "outerWidth", "parent", "performance", "postMessage", "prompt", "queueMicrotask", "removeEventListener",
  "requestAnimationFrame", "requestIdleCallback", "screen", "scrollTo", "scrollX", "scrollY", "self",
  "sessionStorage", "setInterval", "setTimeout", "speechSynthesis", "top", "visualViewport", "webkitAudioContext",
  "window",
];

const GLOBAL_OBJECTS = new Set(["window", "globalThis", "self"]);

function makeScope(parent, isFunction) { return { parent, isFunction, names: new Set() }; }

function patternNames(p, out) {
  if (!p) return out;
  if (p.type === "Identifier") out.push(p.name);
  else if (p.type === "ObjectPattern") p.properties.forEach((q) => patternNames(q.type === "RestElement" ? q.argument : q.value, out));
  else if (p.type === "ArrayPattern") p.elements.forEach((e) => patternNames(e, out));
  else if (p.type === "RestElement") patternNames(p.argument, out);
  else if (p.type === "AssignmentPattern") patternNames(p.left, out);
  return out;
}

function hoistVars(body, scope) {
  const visit = (n) => {
    if (!n || typeof n.type !== "string") return;
    switch (n.type) {
      case "VariableDeclaration":
        if (n.kind === "var") n.declarations.forEach((d) => patternNames(d.id, []).forEach((x) => scope.names.add(x)));
        return;
      case "FunctionDeclaration": scope.names.add(n.id.name); return;
      case "FunctionExpression": case "ArrowFunctionExpression": case "ClassDeclaration": case "ClassExpression": return;
    }
    if (/Statement$|Block|Clause|SwitchCase/.test(n.type) || n.type === "Program") {
      for (const k of ["body", "consequent", "alternate", "block", "handler", "finalizer", "cases", "init", "left"]) {
        const v = n[k];
        if (Array.isArray(v)) v.forEach(visit); else visit(v);
      }
    }
  };
  (Array.isArray(body) ? body : [body]).forEach(visit);
}

function declareLexical(stmts, scope) {
  for (const s of stmts) {
    if (s.type === "VariableDeclaration" && s.kind !== "var") s.declarations.forEach((d) => patternNames(d.id, []).forEach((x) => scope.names.add(x)));
    else if (s.type === "ClassDeclaration" || s.type === "FunctionDeclaration") scope.names.add(s.id.name);
  }
}

function analyze(src, file) {
  const ast = acorn.parse(src, PARSE);
  const top = makeScope(null, true);
  hoistVars(ast.body, top);
  declareLexical(ast.body, top);
  const unresolved = [];
  const globalProps = new Set();

  const resolve = (id, scope, kind) => {
    for (let s = scope; s; s = s.parent) if (s.names.has(id.name)) return;
    unresolved.push({ name: id.name, line: id.loc.start.line, file, kind });
  };

  const fn = (n, scope) => {
    const outer = n.type === "FunctionExpression" && n.id ? makeScope(scope, false) : scope;
    if (outer !== scope) outer.names.add(n.id.name);
    const fs_ = makeScope(outer, true);
    if (n.type !== "ArrowFunctionExpression") fs_.names.add("arguments");
    n.params.forEach((p) => patternNames(p, []).forEach((x) => fs_.names.add(x)));
    n.params.forEach((p) => pattern(p, fs_));
    if (n.body.type === "BlockStatement") {
      hoistVars(n.body.body, fs_);
      declareLexical(n.body.body, fs_);
      n.body.body.forEach((s) => walk(s, fs_));
    } else walk(n.body, fs_);
  };

  const pattern = (p, scope) => {
    if (!p) return;
    switch (p.type) {
      case "Identifier": return;
      case "ObjectPattern": p.properties.forEach((q) => { if (q.type === "RestElement") pattern(q.argument, scope); else { if (q.computed) walk(q.key, scope); pattern(q.value, scope); } }); return;
      case "ArrayPattern": p.elements.forEach((e) => pattern(e, scope)); return;
      case "RestElement": pattern(p.argument, scope); return;
      case "AssignmentPattern": pattern(p.left, scope); walk(p.right, scope); return;
      default: walk(p, scope);
    }
  };

  const target = (p, scope, read) => {
    if (!p) return;
    switch (p.type) {
      case "Identifier": resolve(p, scope, read ? "read" : "write"); return;
      case "ObjectPattern": p.properties.forEach((q) => { if (q.type === "RestElement") target(q.argument, scope); else { if (q.computed) walk(q.key, scope); target(q.value, scope); } }); return;
      case "ArrayPattern": p.elements.forEach((e) => target(e, scope)); return;
      case "RestElement": target(p.argument, scope); return;
      case "AssignmentPattern": target(p.left, scope); walk(p.right, scope); return;
      default: walk(p, scope);
    }
  };

  const block = (stmts, scope) => {
    const b = makeScope(scope, false);
    declareLexical(stmts, b);
    stmts.forEach((s) => walk(s, b));
  };

  const cls = (n, scope) => {
    if (n.superClass) walk(n.superClass, scope);
    const cs = makeScope(scope, false);
    if (n.id) cs.names.add(n.id.name);
    for (const m of n.body.body) {
      if (m.type === "StaticBlock") { block(m.body, makeScope(cs, true)); continue; }
      if (m.computed) walk(m.key, cs);
      if (m.value) walk(m.value, m.type === "PropertyDefinition" ? makeScope(cs, true) : cs);
    }
  };

  const walk = (n, scope) => {
    if (!n || typeof n.type !== "string") return;
    switch (n.type) {
      case "Identifier": resolve(n, scope, "read"); return;
      case "Literal": case "ThisExpression": case "Super": case "MetaProperty": case "TemplateElement": case "EmptyStatement": case "DebuggerStatement": return;
      case "BreakStatement": case "ContinueStatement": return;
      case "LabeledStatement": walk(n.body, scope); return;
      case "UnaryExpression":
        if (n.operator === "typeof" && n.argument.type === "Identifier") return;
        walk(n.argument, scope); return;
      case "MemberExpression":
        walk(n.object, scope);
        if (n.computed) walk(n.property, scope);
        return;
      case "Property":
        if (n.computed) walk(n.key, scope);
        walk(n.value, scope); return;
      case "FunctionDeclaration": case "FunctionExpression": case "ArrowFunctionExpression": fn(n, scope); return;
      case "ClassDeclaration": case "ClassExpression": cls(n, scope); return;
      case "VariableDeclaration": n.declarations.forEach((d) => { pattern(d.id, scope); walk(d.init, scope); }); return;
      case "AssignmentExpression": {
        const l = n.left;
        if (l.type === "MemberExpression" && l.object.type === "Identifier" && GLOBAL_OBJECTS.has(l.object.name)) {
          if (!l.computed && l.property.type === "Identifier") globalProps.add(l.property.name);
          else if (l.computed && l.property.type === "Literal" && typeof l.property.value === "string") globalProps.add(l.property.value);
        }
        target(l, scope, n.operator !== "=");
        walk(n.right, scope); return;
      }
      case "UpdateExpression": target(n.argument, scope, true); return;
      case "BlockStatement": block(n.body, scope); return;
      case "StaticBlock": block(n.body, makeScope(scope, true)); return;
      case "SwitchStatement": {
        walk(n.discriminant, scope);
        const b = makeScope(scope, false);
        n.cases.forEach((c) => declareLexical(c.consequent, b));
        n.cases.forEach((c) => { walk(c.test, b); c.consequent.forEach((s) => walk(s, b)); });
        return;
      }
      case "ForStatement": {
        const b = makeScope(scope, false);
        if (n.init && n.init.type === "VariableDeclaration") declareLexical([n.init], b);
        walk(n.init, b); walk(n.test, b); walk(n.update, b); walk(n.body, b); return;
      }
      case "ForInStatement": case "ForOfStatement": {
        const b = makeScope(scope, false);
        if (n.left.type === "VariableDeclaration") { declareLexical([n.left], b); n.left.declarations.forEach((d) => pattern(d.id, b)); }
        else target(n.left, b);
        walk(n.right, b); walk(n.body, b); return;
      }
      case "CatchClause": {
        const c = makeScope(scope, false);
        patternNames(n.param, []).forEach((x) => c.names.add(x));
        pattern(n.param, c);
        block(n.body.body, c); return;
      }
    }
    for (const k of Object.keys(n)) {
      if (k === "loc" || k === "start" || k === "end" || k === "type") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => walk(c, scope));
      else if (v && typeof v.type === "string") walk(v, scope);
    }
  };

  ast.body.forEach((s) => walk(s, top));
  return { topNames: top.names, globalProps, unresolved };
}

function checkPage(scripts) {
  const results = scripts.map((s) => analyze(s.src, s.file));
  const known = new Set([...LANGUAGE_GLOBALS, ...BROWSER_GLOBALS]);
  results.forEach((r) => { r.topNames.forEach((x) => known.add(x)); r.globalProps.forEach((x) => known.add(x)); });
  const out = [];
  for (const r of results) for (const u of r.unresolved) if (!known.has(u.name)) out.push(u);
  return out;
}

function pageScripts(htmlFile, webRoot) {
  const html = fs.readFileSync(htmlFile, "utf8");
  const list = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, inline = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    if (/type\s*=\s*["']?(module|application\/(ld\+)?json|importmap)/i.test(attrs)) continue;
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (src) {
      if (/^(https?:)?\/\//i.test(src[1])) continue;
      const rel = src[1].split(/[?#]/)[0];
      const abs = rel.startsWith("/") ? path.join(webRoot, rel) : path.join(path.dirname(htmlFile), rel);
      list.push({ file: path.relative(ROOT, abs).replace(/\\/g, "/"), src: fs.readFileSync(abs, "utf8") });
    } else if (m[2].trim()) {
      list.push({ file: path.relative(ROOT, htmlFile).replace(/\\/g, "/") + "#inline" + ++inline, src: m[2] });
    }
  }
  return list;
}

function htmlPages(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...htmlPages(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out.sort();
}

let failed = 0;
const fmt = (u) => `${u.file}:${u.line}:${u.name}${u.kind === "read" ? "" : " (" + u.kind + ")"}`;

const SERVER = path.join(ROOT, "server");
const pages = [
  ...htmlPages(SITE).map((h) => ({ html: h, scripts: pageScripts(h, SITE) })),
  ...htmlPages(path.join(SERVER, "api")).map((h) => ({ html: h, scripts: pageScripts(h, SERVER) })),
];
const index = pages.find((p) => p.html === path.join(SITE, "index.html"));

const controls = [];
{
  const FS = "site/mechanics/fun-secrets.js";
  const i = index.scripts.findIndex((s) => s.file === FS);
  const orig = i < 0 ? "" : index.scripts[i].src;
  const cut = orig.replace(/^[ \t]*var rs = null;[ \t]*\r?\n/m, "");
  const scripts = index.scripts.slice();
  if (i >= 0) scripts[i] = { file: FS + " (without var rs)", src: cut };
  const key = (u) => `${u.file.replace(" (without var rs)", "")}:${u.line}:${u.name}`;
  const before = i >= 0 ? checkPage(index.scripts) : [];
  const after = i >= 0 && cut !== orig ? checkPage(scripts) : [];
  const seen = new Set(before.map(key));
  const added = after.filter((u) => !seen.has(key(u)) && !seen.has(`${u.file.replace(" (without var rs)", "")}:${u.line + 1}:${u.name}`));
  const ok = cut !== orig && !before.some((u) => u.name === "rs") && added.length > 0 && added.every((u) => u.name === "rs");
  controls.push(["fun-secrets.js without `var rs = null` reports rs", ok, added]);
}
{
  const got = checkPage([{ file: "control-b", src: "function outer(){ var a = 1; return function inner(){ return a + missingName; }; }" }]);
  controls.push(["undeclared name inside a nested function is reported", got.length > 0 && got.every((u) => u.name === "missingName"), got]);
}
for (const [label, list] of [["LANGUAGE_GLOBALS", LANGUAGE_GLOBALS], ["BROWSER_GLOBALS", BROWSER_GLOBALS]]) {
  controls.push([label + " is sorted with no duplicates", list.join() === [...new Set(list)].sort().join(), []]);
}
{
  const got = checkPage([{ file: "control-c", src: "function f(){ if (typeof notThere !== 'undefined') return 1; return typeof window.alsoNot; }" }]);
  controls.push(["typeof on an undeclared name is not reported", got.length === 0, got]);
}
{
  const got = checkPage([
    { file: "control-d1", src: "window.shared = 1; let later = 2; function g(x){ try { lbl: for (const k of [x]) { break lbl; } } catch (err) { return err; } return ({ key: 1 }).key + shared + later + (function h(){ return h; })(); }" },
    { file: "control-d2", src: "g(later);" },
  ]);
  controls.push(["params, catch, labels, keys, named fn expr, window props and cross-script globals are not reported", got.length === 0, got]);
}

for (const [name, ok, got] of controls) {
  if (!ok) failed++;
  console.log((ok ? "PASS " : "FAIL ") + "CONTROL: " + name + (got.length ? "  [" + got.slice(0, 3).map(fmt).join(", ") + (got.length > 3 ? `, +${got.length - 3} more` : "") + "]" : ""));
}

for (const p of pages) {
  const findings = checkPage(p.scripts);
  const rel = path.relative(ROOT, p.html).replace(/\\/g, "/");
  if (findings.length) { failed++; console.log(`FAIL ${rel}: ${findings.length} undeclared name(s)`); findings.forEach((u) => console.log("  " + fmt(u))); }
  else console.log(`PASS ${rel}: ${p.scripts.length} script(s), every name is declared`);
}

if (!index || index.scripts.length === 0) { failed++; console.log("FAIL site/index.html loads no scripts (the check did not run)"); }
console.log(failed ? `${failed} FAILED` : "ALL PASS");
process.exit(failed ? 1 : 0);
