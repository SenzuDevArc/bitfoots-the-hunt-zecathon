"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const CHROME = process.env.CHROME_PATH || ({ win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => require("path").join(d, "Google", "Chrome", "Application", "chrome.exe")), darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"], linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"] }[process.platform] || []).find((p) => require("fs").existsSync(p)) || "google-chrome";
const PORT = +process.env.CDP_PORT || 9733, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const SHOTS = process.env.SHOTS || path.join(__dirname, "..", "shots");
const LOCK = process.env.TRAIL_DRIVE_LOCK || path.join(os.tmpdir(), "trail-drive.lock");
const PROFILE = path.join(os.tmpdir(), "scene-check-" + PORT);
const W = 1819, H = 851;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const AUTOPILOT = fs.readFileSync(path.join(__dirname, "autopilot.js"), "utf8");
const PROBE =`window.__TD = { errors: [] };
addEventListener("error", (e) => __TD.errors.push("error: " + (e.message || e.type) + " " + (e.filename || "") + ":" + (e.lineno || "")), true);
addEventListener("unhandledrejection", (e) => __TD.errors.push("rejection: " + (e.reason && e.reason.stack || e.reason)));
(() => { const ce = console.error; console.error = function () { __TD.errors.push("console.error: " + [].map.call(arguments, String).join(" ")); return ce.apply(console, arguments); }; })();`;

const PLAY = String.raw`(async () => {
  for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && BH.trailScene && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 300));
  const TS = () => BH.trailFeature.api.state, key = (k, c) => dispatchEvent(new KeyboardEvent("keydown", { key: k, code: c || "", bubbles: true }));
  const tileOf = () => [Math.floor(player.x / T), Math.floor(player.y / T)];
  loadLevel(2, true); game.screen = "play";
  const s = TS(); if (s.cinePending && s.cineP0) { player.x = s.cineP0.x; player.y = s.cineP0.y; s.elders.forEach((e, k) => { e.x = player.x - (k + 1) * T; e.y = player.y; }); }
  s.tourPending = false; s.cinePending = false; s.tour = null; s.cine = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play";
  ghost = true;
  const chunk = (sec) => { for (let k = 0; k < Math.round(sec / STEP) && game.phase === "play"; k++) { step(STEP); if (BH.talk.isOpen() && k % 30 === 0) key("z"); } };
  const leg = (tx, ty) => {
    const [sx, sy] = tileOf(), r = bfsCore(sx, sy, tx, ty, (x, y) => solidP(tile(x, y)));
    autopilot = { targets: [], path: r.path.slice(), sprint: false };
    for (let t = 0; t < 40 && autopilot && game.phase === "play"; t += 0.1) { if (!autopilot.path.length) autopilot.path.push([(tx + 0.5) * T, (ty + 0.5) * T]); chunk(0.1); const [cx, cy] = tileOf(); if (cx === tx && cy === ty && Math.hypot(player.x - (tx + 0.5) * T, player.y - (ty + 0.5) * T) < 5) break; }
    autopilot = null;
  };
  const wait = (f, max) => { for (let t = 0; t < max && game.phase === "play"; t += 0.1) { if (f()) return true; chunk(0.1); } return !!f(); };
  leg(3, 4); leg(8, 4);
  wait(() => TS().payAsk || TS().pay, 8);
  wait(() => { if (!TS().pay && TS().payAsk && !BH.talk.isOpen()) key("e", "KeyE"); return !!TS().pay; }, 30);
  const paid = !!TS().pay;
  leg(3, 9); wait(() => { for (const r of grid) if (r.indexOf("H") >= 0) return false; return true; }, 35);
  leg(9, 5); leg(10, 5); for (const [x, y] of [[14, 7], [14, 2], [25, 2], [24, 7]]) leg(x, y);
  leg(30, 9); wait(() => game.phase !== "play", 10);
  ghost = false;
  return { paid, phase: game.phase, prec: (TS().prec || []).length, posts: Object.keys(TS().posts || {}) };
})()`;

const checks = [];
const add = (n, ok, v) => checks.push([n, !!ok, v]);

async function lock() {
  for (let i = 0; i < 600; i++) { try { fs.mkdirSync(LOCK); fs.writeFileSync(path.join(LOCK, "owner.json"), JSON.stringify({ pid: process.pid, port: PORT, at: new Date().toISOString() })); return; } catch { await sleep(500); } }
  throw new Error("lock busy");
}
function unlock() { try { fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} }

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  await lock();
  fs.rmSync(PROFILE, { recursive: true, force: true });
  const chrome = spawn(CHROME, ["--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    "--no-first-run", "--no-default-browser-check", `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
  let ws;
  try {
    let ver = null;
    for (let i = 0; i < 100 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(150); } }
    if (!ver) throw new Error("chrome did not start");
    const tab = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page");
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 1; const pending = new Map();
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, timeout: 200000 }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    const shot = async (name) => { const img = await send("Page.captureScreenshot", { format: "png" }); const f = path.join(SHOTS, name); fs.writeFileSync(f, Buffer.from(img.data, "base64")); return f; };
    const until = async (expr, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await sleep(80); } return false; };
    await send("Page.enable"); await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
    await send("Page.navigate", { url: BASE + "index.html?unlock" });
    await until("document.readyState === 'complete'", 15000);
    await ev(AUTOPILOT);
    const run = await ev(PLAY);
    add("level 3 played: paid at the post and escaped", run.paid && run.phase === "escaped", JSON.stringify(run));
    await until("game.screen === 'complete'", 8000);
    await sleep(2500);
    await ev(`nextFromComplete()`);
    const open = await until("BH.trailScene.isOpen()", 3000);
    add("NEXT LEVEL opens the record scene in the forest, no framed card", open && !(await ev("!!document.querySelector('.tm-scene')")) && (await ev("game.screen")) === "play", "");
    const lines = await ev(`BH.trailMachine.beats[1].map(b => b.say).concat([BH.trailMachine.lines[1]])`);
    const INFO = `(() => { const i = BH.trailScene.info(), t = BH.talk._state(), b = document.querySelector(".talkbox.on"), r = b && b.getBoundingClientRect();
      return { i, text: t && t.text, done: t && t.done, box: r ? [r.left, r.top, r.right, r.bottom] : null, px: player.x, py: player.y }; })()`;
    const over = (a, b) => a && b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const inView = (a) => a && a[0] >= 0 && a[1] >= 0 && a[2] <= W && a[3] <= H;
    const NEED = [["prints", "post", "player"], ["post", "board", "stamp"], ["board", "hunter", "fake"], ["board", "x", "hunter"], ["board", "x", "post"]];
    for (let k = 0; k < lines.length; k++) {
      await until(`(BH.talk._state() || {}).done === true`, 15000);
      await sleep(k === 0 ? 3600 : 2600);
      const u = await ev(INFO);
      add(`step ${k + 1}: Shilo says the line word for word`, u.text === lines[k], `"${u.text}"`);
      const hid = NEED[k].filter((n) => !u.i.rects[n] || over(u.i.rects[n], u.box) || !inView(u.i.rects[n]));
      add(`step ${k + 1}: ${NEED[k].join(", ")} on screen and clear of the talk box`, !hid.length, hid.length ? "hidden: " + hid.join(",") + " " + JSON.stringify(u.i.rects) + " box " + JSON.stringify(u.box) : "ok");
      if (k >= 3) add(`step ${k + 1}: the fake stamp's red X sits clear of the board`, u.i.rects.x && !over(u.i.rects.x, u.i.rects.board), JSON.stringify([u.i.rects.x, u.i.rects.board]));
      await shot(`scene1-${k + 1}.png`);
      if (k === 0) {
        const p0 = await ev(`[player.x, player.y, game.phase]`);
        await ev(`key = (k) => dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); ["ArrowRight", "d", "ArrowUp", "w"].forEach(k => { key(k); keys[k.toLowerCase()] = true; }); 0`);
        await sleep(700);
        const p1 = await ev(`(() => { ["arrowright", "d", "arrowup", "w"].forEach(k => keys[k] = false); return [player.x, player.y, game.phase, BH.trailScene.isOpen()]; })()`);
        add("walking keys do nothing during the scene", p0[0] === p1[0] && p0[1] === p1[1] && p1[3], JSON.stringify([p0, p1]));
      }
      if (k === 1) {
        await sleep(5500);
        const s2 = await ev(INFO);
        add("a line waits for Space: no move on after 8 s untouched", s2.text === lines[1], `"${s2.text}"`);
      }
      if (k === 2) {
        await ev(`dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }))`);
        await sleep(300);
        const b = await ev(INFO);
        add("Back goes to the previous line", b.text === lines[1], `"${b.text}"`);
        await ev(`dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }))`);
        await sleep(300);
        const f = await ev(INFO);
        add("Space comes forward again", f.text === lines[2], `"${f.text}"`);
        await until(`(BH.talk._state() || {}).done === true`, 15000); await sleep(2200);
      }
      if (k === 3) {
        for (const what of ["board", "post", "gate", "hunter"]) {
          const u2 = await ev(INFO), r = u2.i.rects[what], cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2;
          await ev(`(() => { const c = document.getElementById("game") || document.querySelector("canvas"); const o = { clientX: ${cx}, clientY: ${cy}, bubbles: true, pointerId: 1 };
            canvas.dispatchEvent(new PointerEvent("pointerdown", o)); canvas.dispatchEvent(new PointerEvent("pointerup", o)); })()`);
          await sleep(500);
          const u3 = await ev(INFO);
          add(`click the ${what}: one short line, the talk box stays on its line`, u3.i.heard === what && u3.text === lines[3], `heard ${u3.i.heard} / talk "${u3.text}"`);
          if (what === "hunter") await shot("scene1-4-click-hunter.png");
        }
      }
      await ev(`dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }))`);
      await sleep(350);
    }
    const ended = await until("!BH.trailScene.isOpen()", 4000);
    await sleep(800);
    const after = await ev(`({ idx: game.levelIdx, screen: game.screen, phase: game.phase, played: BH.trailMachine.played(1) })`);
    add("the last Space ends the scene and starts the next level", ended && after.idx === 3 && after.screen === "play" && after.played, JSON.stringify(after));
    const errs = await ev("__TD.errors");
    add("0 console errors", errs.length === 0, errs.slice(0, 4).join(" | ") || 0);
    try { await send("Browser.close"); } catch {}
  } finally {
    try { ws && ws.close(); } catch {}
    await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once("exit", r); setTimeout(r, 5000); });
    try { chrome.kill(); } catch {}
    await sleep(300);
    try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 }); } catch (e) { console.error("profile not removed: " + e.code); }
    unlock();
  }
}

main().then(() => {
  for (const [n, ok, v] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${n}  (${v})`);
  const bad = checks.filter((c) => !c[1]).length;
  console.log(`${checks.length - bad}/${checks.length} passed`);
  process.exit(bad || !checks.length ? 1 : 0);
}).catch((e) => { console.error(e.stack || e); unlock(); process.exit(2); });
