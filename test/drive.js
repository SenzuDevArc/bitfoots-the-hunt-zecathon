"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || ({
  win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => path.join(d, "Google", "Chrome", "Application", "chrome.exe")),
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
}[process.platform] || []).find((p) => fs.existsSync(p)) || "google-chrome";
const PORT = +process.env.CDP_PORT || 9631, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const LOCK = process.env.TRAIL_DRIVE_LOCK || path.join(os.tmpdir(), "trail-drive.lock");
const OWNER = path.join(LOCK, "owner.json"), PROFILE = path.join(os.tmpdir(), "trail-drive-profile-" + PORT);
let owned = false, beat = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [page_, scriptArg, size] = process.argv.slice(2);
if (!page_ || !scriptArg) { console.error("usage: node test/drive.js <path?query> <file.js|-> [w,h]"); process.exit(2); }
const [W, H] = (size || "1280,800").split(",").map(Number);
const body = scriptArg === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(scriptArg, "utf8");
const AUTOPILOT = fs.readFileSync(path.join(__dirname, "autopilot.js"), "utf8");

const PROBE = `window.__TD = { errors: [] };
addEventListener("error", (e) => __TD.errors.push("error: " + (e.message || e.type) + " " + (e.filename || (e.target && e.target.src) || "") + ":" + (e.lineno || "")), true);
addEventListener("unhandledrejection", (e) => __TD.errors.push("rejection: " + (e.reason && e.reason.stack || e.reason)));
(() => { const ce = console.error; console.error = function () { __TD.errors.push("console.error: " + [].map.call(arguments, String).join(" ")); return ce.apply(console, arguments); }; })();`;

async function chromeOn(port) {
  try { const c = new AbortController(), t = setTimeout(() => c.abort(), 1500); const r = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: c.signal }); clearTimeout(t); return r.ok; } catch { return false; }
}
async function stale() {
  let st; try { st = fs.statSync(LOCK); } catch { return false; }
  if (st.isFile()) return true;
  let last = st.mtimeMs, port = PORT;
  try { const o = JSON.parse(fs.readFileSync(OWNER, "utf8")); port = +o.port || PORT; last = Math.max(last, fs.statSync(OWNER).mtimeMs); } catch {}
  return Date.now() - last > 300000 && !(await chromeOn(port));
}
function touch() { const t = new Date(); try { fs.utimesSync(LOCK, t, t); fs.utimesSync(OWNER, t, t); } catch {} }
async function lock() {
  for (let i = 0; i < 1200; i++) {
    try {
      fs.mkdirSync(LOCK); owned = true;
      fs.writeFileSync(OWNER, JSON.stringify({ pid: process.pid, port: PORT, root: ROOT, at: new Date().toISOString() }));
      beat = setInterval(touch, 60000); beat.unref();
      return;
    } catch (e) {
      if (owned) throw e;
      if (await stale()) {
        const tomb = LOCK + ".stale-" + process.pid + "-" + Date.now();
        try { fs.renameSync(LOCK, tomb); console.error("removed stale lock " + LOCK); fs.rmSync(tomb, { recursive: true, force: true }); } catch {}
        continue;
      }
      await sleep(500);
    }
  }
  throw new Error("lock busy for 10 minutes");
}
function unlock() { if (beat) clearInterval(beat); if (owned) { owned = false; try { fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} } }

async function main() {
  await lock();
  let chrome, ws, code = 0;
  try {
    fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    chrome = spawn(CHROME, ["--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
      "--no-first-run", "--no-default-browser-check", `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
    let ver = null;
    for (let i = 0; i < 100 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(150); } }
    if (!ver) throw new Error("chrome did not start");
    const tab = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page");
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 1; const pending = new Map();
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    await send("Page.enable"); await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
    await send("Page.navigate", { url: BASE + page_.replace(/^\//, "") });
    for (let i = 0; i < 100; i++) { await sleep(100); const r = await send("Runtime.evaluate", { expression: "document.readyState", returnByValue: true }); if (r.result.value === "complete") break; }
    await send("Runtime.evaluate", { expression: AUTOPILOT });
    const r = await send("Runtime.evaluate", { expression: `(async () => {\n${body}\n})()`, awaitPromise: true, returnByValue: true, timeout: 240000 });
    const ex = r.exceptionDetails ? (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text : null;
    const errs = (await send("Runtime.evaluate", { expression: "window.__TD ? __TD.errors : []", returnByValue: true })).result.value || [];
    if (ex) errs.push("script: " + ex);
    console.log(JSON.stringify({ errors: errs, result: r.result.value }, null, 1));
    if (errs.length) code = 1;
    try { await send("Browser.close"); } catch {}
  } finally {
    try { ws && ws.close(); } catch {}
    if (chrome) { await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once("exit", r); setTimeout(r, 5000); }); try { chrome.kill(); } catch {} }
    await sleep(300);
    try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 }); } catch (e) { console.error("profile not removed yet: " + e.code); }
    unlock();
  }
  process.exit(code);
}
main().catch((e) => { console.error(e.stack || e); unlock(); process.exit(2); });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { unlock(); process.exit(130); });
