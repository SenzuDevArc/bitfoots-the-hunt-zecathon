"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const CHROME = process.env.CHROME_PATH || ({
  win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => path.join(d, "Google", "Chrome", "Application", "chrome.exe")),
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium"],
}[process.platform] || []).find((p) => fs.existsSync(p)) || "google-chrome";
const PORT = +process.env.CDP_PORT || 9631, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const LOCK = process.env.TRAIL_DRIVE_LOCK || path.join(os.tmpdir(), "trail-drive.lock");
const OWNER = path.join(LOCK, "owner.json"), PROFILE = path.join(os.tmpdir(), "trail-resize-profile-" + PORT);
const REPORT = process.argv.includes("--report");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEYS = ["cw", "ch", "base", "tz", "zoom", "cam", "board", "boardH", "crew", "menu", "forest", "fonts"];
const GATE = ["cw", "ch", "base", "tz"];
let owned = false, beat = null;

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
async function lock() {
  for (let i = 0; i < 1200; i++) {
    try {
      fs.mkdirSync(LOCK); owned = true;
      fs.writeFileSync(OWNER, JSON.stringify({ pid: process.pid, port: PORT, root: path.resolve(__dirname, ".."), at: new Date().toISOString() }));
      beat = setInterval(() => { const t = new Date(); try { fs.utimesSync(LOCK, t, t); fs.utimesSync(OWNER, t, t); } catch {} }, 60000); beat.unref();
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

const probe = (frame) => `(() => {
  ${frame ? `Object.defineProperty(window, "outerWidth", { get: () => window.innerWidth + ${frame.w}, configurable: true });
  Object.defineProperty(window, "outerHeight", { get: () => window.innerHeight + ${frame.h}, configurable: true });` : ""}
  const S = window.__RS = { t0: performance.now(), load: 0, resizes: 0, samples: [], errors: [] };
  addEventListener("error", (e) => S.errors.push(String(e.message || e.type)), true);
  addEventListener("resize", () => S.resizes++);
  addEventListener("load", () => { S.load = performance.now(); });
  const tick = () => {
    const c = document.getElementById("game"), b = document.querySelector(".ld-board"), de = document.documentElement;
    S.samples.push({
      t: Math.round(performance.now() - S.t0),
      cw: c ? c.width : null, ch: c ? c.height : null,
      zoom: typeof zoom === "number" ? +zoom.toFixed(4) : null,
      base: typeof baseZoom === "function" && typeof W === "number" && W ? +baseZoom().toFixed(4) : null,
      cam: (() => { const q = window.BH && BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state; if (!q) return null; return (q.glimpse ? "glimpse " : "") + (q.tourZoomed ? "tourZoomed " : "") + (q.tourPending ? "tourPending " : "") + (q.tour ? "tour" : "") || "-"; })(),
      tz: de ? de.style.getPropertyValue("--tz") : "",
      board: b ? (b.style.zoom || "") : null,
      boardH: b ? Math.round(b.getBoundingClientRect().height) : null,
      screen: window.game ? game.screen : null,
      crew: Array.prototype.map.call(document.querySelectorAll("#ldCrew img"), (i) => i.width).join(",") || null,
      menu: (() => { const m = document.getElementById("ldMenu"); if (!m) return null; const r = m.getBoundingClientRect(); return Math.round(r.width) + "x" + Math.round(r.height) + "@" + Math.round(r.top); })(),
      forest: (() => { const f = document.getElementById("ldForest"); return f ? f.width + "x" + f.height : null; })(),
      fonts: document.fonts ? document.fonts.status : null,
    });
    if (!S.load || performance.now() - S.load < 3000) requestAnimationFrame(tick); else S.done = true;
  };
  requestAnimationFrame(tick);
})();`;

function stats(samples, key) {
  const has = samples.filter((s) => s[key] !== null && s[key] !== undefined && s[key] !== ""), v = has.map((s) => s[key]);
  let changes = 0; const at = []; for (let i = 1; i < v.length; i++) if (v[i] !== v[i - 1]) { changes++; if (at.length < 12) at.push(has[i].t); }
  const nums = v.map(Number).filter((x) => !isNaN(x));
  return { first: v[0], last: v[v.length - 1], min: nums.length ? Math.min(...nums) : null, max: nums.length ? Math.max(...nums) : null, changes,
    seq: v.filter((x, i) => i === 0 || x !== v[i - 1]).slice(0, 12), from: has.length ? has[0].t : null, at };
}

async function run(send, page, w, h, frame, dpr, control) {
  await send("Page.navigate", { url: "about:blank" }); await sleep(300);
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dpr, mobile: false });
  const { identifier } = await send("Page.addScriptToEvaluateOnNewDocument", { source: probe(frame) });
  await send("Page.navigate", { url: BASE + page });
  let r = null, shifted = !control;
  for (let i = 0; i < 150; i++) {
    await sleep(100);
    if (!shifted) {
      const ld = (await send("Runtime.evaluate", { expression: "window.__RS ? __RS.load : 0", returnByValue: true })).result.value;
      if (ld) { await sleep(300); await send("Emulation.setDeviceMetricsOverride", { width: w - 200, height: h, deviceScaleFactor: dpr, mobile: false }); shifted = true; }
    }
    try { r = (await send("Runtime.evaluate", { expression: "window.__RS && __RS.done ? __RS : null", returnByValue: true })).result.value; } catch { r = null; }
    if (r) break;
  }
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  if (!r) throw new Error("no samples at " + w + "x" + h);
  const s = r.samples.filter((x) => x.zoom !== null);
  const out = { page: page + (control ? " [control: window narrowed 300 ms after load]" : ""), size: w + "x" + h + "@" + dpr, window: frame.w ? "normal" : "fullscreen", frames: s.length, resizes: r.resizes, errors: r.errors };
  for (const k of KEYS) out[k] = stats(s, k);
  return out;
}

async function main() {
  await lock();
  let chrome, ws, fail = 0;
  try {
    fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    chrome = spawn(CHROME, ["--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
      "--no-first-run", "--no-default-browser-check", "--window-size=1920,1080", "about:blank"], { stdio: "ignore" });
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
    const FRAME = { w: 64, h: 130 };
    const show = (o) => {
      const line = (k) => k + " " + o[k].changes + " " + JSON.stringify(o[k].seq) + (o[k].at.length ? " at ms " + o[k].at.join(",") : "");
      console.log(o.page + " " + o.size + " " + o.window + " frames " + o.frames + " resize events " + o.resizes);
      for (const k of GATE) console.log("   gate " + line(k));
      for (const k of ["zoom", "cam", "crew", "menu"]) if (o[k].changes) console.log("   info " + line(k));
      return GATE.filter((k) => o[k].changes > 0);
    };
    for (const page of ["index.html", "index.html#/level/0"])
    for (const [w, h, dpr] of [[1366, 768, 1], [1920, 1009, 1], [1366, 768, 1.25], [1536, 730, 1.25]]) {
      for (const frame of [FRAME, { w: 0, h: 0 }]) {
        const o = await run(send, page, w, h, frame, dpr);
        const moved = show(o);
        if (moved.length || o.errors.length) { fail++; console.log("  FAIL moved after the first frame: " + (moved.join(", ") || "-") + (o.errors.length ? " errors: " + o.errors.join(" | ") : "")); }
        else console.log("  stable: one canvas size, one fit zoom");
      }
    }
    const c = await run(send, "index.html", 1366, 768, FRAME, 1, true), cm = show(c);
    if (!cm.includes("cw") || !cm.includes("base")) { fail++; console.log("  FAIL control: the gate did not see the window narrow"); }
    else console.log("  control seen: " + cm.join(", "));
    await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    const grid = (await send("Runtime.evaluate", { returnByValue: true, expression: `(() => { const o = [];
      for (const d of [1, 1.25, 1.5, 2]) for (let r = 1; r <= 1.401; r += 0.01) { const z = zoomFromFrame(r, d, 0, 0.12) || 1; if (z !== 1) o.push("dpr " + d + " ratio " + r.toFixed(2) + " reads " + z); }
      return o; })()` })).result.value;
    console.log("100% read as another zoom (" + grid.length + "): " + (grid.length ? grid.slice(0, 40).join("; ") : "none"));
    try { await send("Browser.close"); } catch {}
  } finally {
    try { ws && ws.close(); } catch {}
    if (chrome) { await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once("exit", r); setTimeout(r, 5000); }); try { chrome.kill(); } catch {} }
    await sleep(300);
    try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 }); } catch {}
    unlock();
  }
  console.log(fail ? fail + " run(s) moved after load" : "PASS: every run held one size and one zoom");
  process.exit(fail && !REPORT ? 1 : 0);
}
main().catch((e) => { console.error(e.stack || e); unlock(); process.exit(2); });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { unlock(); process.exit(130); });
