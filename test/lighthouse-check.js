"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const CHROME = process.env.CHROME_PATH || ({
  win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => path.join(d, "Google", "Chrome", "Application", "chrome.exe")),
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
}[process.platform] || []).find((p) => fs.existsSync(p)) || "google-chrome";
const PORT = 9654, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const LOCK = process.env.TRAIL_DRIVE_LOCK || path.join(os.tmpdir(), "trail-drive.lock");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "trail-lh-"));
const SIZES = [[1280, 800], [1920, 1080]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
function check(name, ok, detail) { if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (detail !== undefined ? "  " + JSON.stringify(detail) : "")); }

const START = `(async () => {
  for (let i = 0; i < 100 && !(typeof loadLevel === "function" && window.BH && BH.trailFeature && BH.talk); i++) await new Promise(r => setTimeout(r, 100));
  loadLevel(0, false); game.screen = "play";
  window.__LH = { frames: [] };
  const lh = BH.trailLighthouse;
  (function tick() {
    if (lh && lh.state) { const s = lh.state(); if (s) __LH.frames.push(s); }
    if (__LH.frames.length < 2000) requestAnimationFrame(tick);
  })();
  for (let i = 0; i < 60 && !document.body.classList.contains("trail-cine"); i++) await new Promise(r => setTimeout(r, 50));
  return { cine: document.body.classList.contains("trail-cine"), lighthouse: !!lh };
})()`;

async function main() {
  let got = false;
  for (let i = 0; i < 240 && !got; i++) { try { fs.mkdirSync(LOCK); got = true; } catch { await sleep(5000); } }
  if (!got) { console.error("browser lock busy for 20 minutes"); process.exit(2); }
  let chrome, ws, code = 0;
  try {
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
    const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, timeout: 60000 }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    await send("Page.enable"); await send("Runtime.enable");
    for (const [w, h] of SIZES) {
      const tag = w + "x" + h;
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url: BASE + "index.html?unlock&fresh=1" });
      await sleep(800);
      for (let i = 0; i < 300; i++) { await sleep(100); if (await ev(`document.readyState === "complete" && typeof loadLevel === "function"`)) break; }
      const st = await ev(START);
      check(`${tag}: the opening run starts`, st.cine, st);
      check(`${tag}: the lighthouse module is loaded`, st.lighthouse);
      let prev = 0;
      for (const ms of [250, 700, 1400, 2400, 4000, 8000, 12000]) {
        await sleep(ms - prev); prev = ms;
        if (process.env.SHOTS_DIR) { const s = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(process.env.SHOTS_DIR, `lighthouse-${tag}-${ms}ms.png`), Buffer.from(s.data, "base64")); }
      }
      const fr = await ev(`window.__LH.frames`);
      const run = fr.filter((f) => f.cine), lit = run.filter((f) => f.mode === "new");
      const edge = run.filter((f) => f.viewX0 < 0);
      const mode = [...new Set(run.map((f) => f.mode))].join(",");
      check(`${tag}: lit frames of the run were measured`, lit.length > 20, { frames: fr.length, run: run.length, lit: lit.length, mode });
      check(`${tag}: the light came from the lighthouse (hunt-mode.js read its spot)`, run.every((f) => f.mode !== "legacy") && lit.length > 0, { mode });
      check(`${tag}: any strip past the left edge is drawn as forest`, edge.every((f) => f.forest > 0), { edgeFrames: edge.length, minTrees: edge.length ? Math.min(...edge.map((f) => f.forest || 0)) : null });
      const dirs = lit.map((f) => f.dir), turned = dirs.length ? Math.max(...dirs) - Math.min(...dirs) : 0;
      check(`${tag}: the beam keeps turning`, dirs.length > 2 && turned >= 0.25, { from: dirs.length ? Math.min(...dirs).toFixed(2) : null, to: dirs.length ? Math.max(...dirs).toFixed(2) : null });
      check(`${tag}: watched a full turn of the light`, turned >= 6.2, { turned: +turned.toFixed(2) });
      check(`${tag}: the lighthouse is on screen as the run starts`, !!(run[0] && run[0].onScreen), run[0]);
      const hit = lit.filter((f) => f.hit && f.hit.length);
      check(`${tag}: the beam never lands on a runner during the run`, hit.length === 0, { framesHit: hit.length, of: lit.length, first: hit[0] });
    }
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    for (const left of [0, 1]) {
      await send("Page.navigate", { url: BASE + "index.html?unlock&fresh=1" });
      await sleep(800);
      for (let i = 0; i < 300; i++) { await sleep(100); if (await ev(`document.readyState === "complete" && typeof loadLevel === "function"`)) break; }
      const r = await ev(`(async () => {
        for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
        await new Promise(r => setTimeout(r, 400));
        loadLevel(1, true); game.screen = "play";
        const s = BH.trailFeature.api.state; s.tourPending = false; s.cinePending = false; s.tour = null; s.cine = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play";
        s.posts = s.posts || {}; s.posts.fixture = { n: 1 };
        player.carry = 0; player.stash = coins.length - 1 - ${left}; ghost = true; escaped();
        for (let i = 0; i < 160 && !document.querySelector(".ec-badge"); i++) await new Promise(r => setTimeout(r, 50));
        return { level: L.title, coins: coins.length, banked: banked(), spent: trailSpent(), badges: [...document.querySelectorAll(".ec-badge")].map(e => e.textContent), saved: !!(save.badges && save.badges.sweep && save.badges.sweep[2]) };
      })()`);
      if (!left) check(`Clean Sweep: L1 with every coin (${r.banked} to the den + ${r.spent} paid) earns CLEAN SWEEP`, r.badges.includes("CLEAN SWEEP") && r.saved, r);
      else check(`Clean Sweep control: L1 with one coin left behind does not earn it`, !r.badges.includes("CLEAN SWEEP") && !r.saved && r.badges.includes((r.coins - 1) + " OF " + r.coins + " COINS"), r);
    }
    console.log(fails ? `${fails} FAILED` : "ALL PASS");
    code = fails ? 1 : 0;
    try { await send("Browser.close"); } catch {}
  } finally {
    try { ws && ws.close(); } catch {}
    if (chrome) { await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once("exit", r); setTimeout(r, 5000); }); try { chrome.kill(); } catch {} }
    await sleep(300);
    try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 }); } catch (e) { console.error("profile not removed: " + e.code); }
    try { fs.rmdirSync(LOCK); } catch {}
  }
  process.exit(code);
}
main().catch((e) => { console.error(e.stack || e); try { fs.rmdirSync(LOCK); } catch {} process.exit(2); });
