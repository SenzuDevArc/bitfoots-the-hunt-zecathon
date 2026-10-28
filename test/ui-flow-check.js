"use strict";
// Plays the game only through real input (CDP key, mouse and touch events). The page is only read, never driven.
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || ({
  win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => path.join(d, "Google", "Chrome", "Application", "chrome.exe")),
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
}[process.platform] || []).find((p) => fs.existsSync(p)) || "google-chrome";
const PORT = +process.env.CDP_PORT || 9631, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const LOCK = process.env.TRAIL_DRIVE_LOCK || path.join(os.tmpdir(), "trail-drive.lock"), OWNER = path.join(LOCK, "owner.json");
const PROFILE = path.join(os.tmpdir(), "trail-uiflow-profile-" + PORT);
const ONLY = process.argv[2] || "desktop,phone";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const PROBE = `window.__TD = { errors: [] };
addEventListener("error", (e) => __TD.errors.push("error: " + (e.message || e.type) + " " + (e.filename || (e.target && e.target.src) || "") + ":" + (e.lineno || "")), true);
addEventListener("unhandledrejection", (e) => __TD.errors.push("rejection: " + (e.reason && e.reason.stack || e.reason)));
(() => { const ce = console.error; console.error = function () { __TD.errors.push("console.error: " + [].map.call(arguments, String).join(" ")); return ce.apply(console, arguments); }; })();`;

const STATE = `(() => { const g = typeof game !== "undefined" ? game : null, p = typeof player !== "undefined" ? player : null;
  const ov = document.getElementById("overlay"), t = window.BH && BH.talk && BH.talk._state ? BH.talk._state() : null;
  return { screen: g && g.screen, phase: g && g.phase, level: g && g.levelIdx, x: p && p.x, y: p && p.y, carry: p && p.carry, stash: p && p.stash,
    T: typeof T !== "undefined" ? T : null, touch: typeof TOUCH !== "undefined" ? TOUCH : null, joy: typeof joy !== "undefined" ? joy.active : null,
    overlay: ov ? ov.className : null, talk: t ? { text: t.text, choices: t.choices || null, done: !!t.done } : null,
    pauseShown: !!document.querySelector("#overlay #pResume"), nextBtn: !!document.getElementById("btnNext"), wmPlay: !!document.getElementById("wmPlay"),
    need: typeof L !== "undefined" && L ? L.need : null, tid: typeof L !== "undefined" && L ? L.tid : null,
    busy: (() => { try { const s = BH.trailFeature.api.state; return !!(s && (s.cine || s.tour || s.cinePending || s.tourPending)); } catch (e) { return false; } })(),
    word: (li => li ? li.textContent.replace(/^\\d+\\.\\s*/, "").trim() : null)([...document.querySelectorAll("#trailNote li")][2]) };
})()`;

async function session(name, W, H, mobile, smoke) {
  let chrome, ws;
  const steps = [];
  const check = (what, ok, info) => { steps.push({ what, ok: !!ok, info }); console.log(`${name.padEnd(7)} ${ok ? "PASS" : "FAIL"} ${what}${info !== undefined ? "  " + JSON.stringify(info) : ""}`); return !!ok; };
  try {
    fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    chrome = spawn(CHROME, ["--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check", `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
    let ver = null;
    for (let i = 0; i < 100 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(150); } }
    if (!ver) throw new Error("chrome did not start");
    const tab = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page");
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 1; const pending = new Map();
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
    const st = () => ev(STATE);
    const KEYS = { Enter: [13, "Enter"], Escape: [27, "Escape"], ArrowLeft: [37, "ArrowLeft"], ArrowUp: [38, "ArrowUp"], ArrowRight: [39, "ArrowRight"], ArrowDown: [40, "ArrowDown"], z: [90, "KeyZ"] };
    const kinfo = (k) => KEYS[k] || (/^\d$/.test(k) ? [48 + +k, "Digit" + k] : [k.toUpperCase().charCodeAt(0), "Key" + k.toUpperCase()]);
    const keyDown = (k) => { const [c, code] = kinfo(k); return send("Input.dispatchKeyEvent", { type: k.length === 1 ? "keyDown" : "rawKeyDown", key: k, code, windowsVirtualKeyCode: c, text: k.length === 1 ? k : undefined }); };
    const keyUp = (k) => { const [c, code] = kinfo(k); return send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: c }); };
    const press = async (k) => { await keyDown(k); await sleep(40); await keyUp(k); };
    const rectOf = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, vh: innerHeight } : null; })()`);
    const scrolled = [];
    const center = async (sel) => {
      let c = await rectOf(sel);
      for (let k = 0; c && (c.y < 0 || c.y > c.vh) && k < 8; k++) {
        if (!k) scrolled.push(sel);
        await send("Input.synthesizeScrollGesture", { x: Math.round(W / 2), y: Math.round(H / 2), yDistance: Math.round(Math.max(-H * 0.6, Math.min(H * 0.6, c.vh / 2 - c.y))), gestureSourceType: mobile ? "touch" : "mouse" });
        c = await rectOf(sel);
      }
      return c;
    };
    const click = async (x, y) => {
      if (mobile) {
        await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }); await sleep(60);
        await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await sleep(40);
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
      }
    };
    const tapSel = async (sel) => {
      const c = await center(sel); if (!c) return false;
      const top = await ev(`(e => e ? (e.id || "") + "." + e.className + " " + (e.textContent || "").trim().slice(0, 40) : null)(document.elementFromPoint(${c.x}, ${c.y}))`);
      await click(c.x, c.y); return top;
    };
    const until = async (cond, ms) => { const t0 = Date.now(); let s; while (Date.now() - t0 < ms) { s = await st(); if (cond(s)) return s; await sleep(100); } return null; };

    await send("Page.enable"); await send("Runtime.enable");
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: mobile ? 2 : 1, mobile });
    if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
    await send("Page.navigate", { url: BASE });
    for (let k = 0; k < 100; k++) { await sleep(100); if ((await ev("document.readyState")) === "complete") break; }
    await sleep(800);

    const s0 = await until((s) => s.screen === "title", 8000);
    check("landing screen shows", s0, s0 && { screen: s0.screen });
    check("touch mode " + (mobile ? "on" : "off"), s0 && s0.touch === mobile, s0 && s0.touch);

    if (mobile) await tapSel("#ldPlay"); else await press("Enter");
    const s1 = await until((s) => s.screen === "select" && s.wmPlay, 6000);
    check((mobile ? "tap" : "Enter on") + " landing PLAY opens the world map", s1, s1 && s1.screen);

    const before = await st();
    await tapSel("#wmPlay");
    const s2 = await until((s) => s.screen === "play", 8000);
    check("map PLAY starts a level", s2 && before.screen !== "play", s2 && { level: s2.level, tid: s2.tid });

    const talkThrough = async (ms) => {
      const t0 = Date.now(); let s;
      while (Date.now() - t0 < ms) {
        s = await st();
        if (s.screen !== "play") return s;
        if (s.phase === "play" && !s.talk && !s.busy) return s;
        if (s.talk && s.talk.choices && s.talk.done) {
          const want = ["Make a wallet", "Write it down"], ch = s.talk.choices;
          let k = ch.findIndex((c) => want.some((w) => c.indexOf(w) >= 0) || (s.word && c === s.word));
          await press(String((k < 0 ? 0 : k) + 1));
        } else if (!s.talk) { await sleep(200); continue; } else if (mobile) { const c = await center("#game"); await click(c.x, c.y); } else await press("z");
        await sleep(350);
      }
      return st();
    };
    const s3 = await talkThrough(25000);
    check("intro talk passes with input, phase play", s3 && s3.phase === "play" && !s3.talk, s3 && { phase: s3.phase, talk: s3.talk && s3.talk.text });
    rest: {
    if (smoke) { const src = await ev(`[...document.scripts].map(s => s.getAttribute("src")).filter(Boolean)`); check("page runs the built bundles", src.length && src.every((s) => /^\/app-\d+\.js\?v=/.test(s)), src); break rest; }

    const moveRight = async (ms) => {
      const a = await st();
      if (mobile) {
        const x0 = Math.round(W * 0.35), y0 = Math.round(H * 0.6);
        await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0, id: 1 }] });
        const mid = await (async () => { for (let k = 1; k <= 6; k++) { await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + k * 12, y: y0, id: 1 }] }); await sleep(30); } return st(); })();
        await sleep(ms);
        await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        return { a, b: await st(), joy: mid.joy };
      }
      await keyDown("ArrowRight"); await sleep(ms); await keyUp("ArrowRight");
      return { a, b: await st() };
    };
    await sleep(300);
    const idle0 = await st(); await sleep(600); const idle1 = await st();
    const mv = await moveRight(700);
    const dIdle = Math.hypot(idle1.x - idle0.x, idle1.y - idle0.y), dMove = mv.b.x - mv.a.x;
    check((mobile ? "joystick drag" : "ArrowRight") + " moves the player right (control: no input = no move)", dIdle < 1 && dMove > (mv.a.T || 32) * 0.5 && (!mobile || mv.joy),
      { idlePx: +dIdle.toFixed(1), movedPx: +dMove.toFixed(1), joy: mv.joy });

    if (mobile) await tapSel("#pause"); else await press("Escape");
    const p1 = await until((s) => s.screen === "pause" && s.pauseShown, 4000);
    check((mobile ? "tap pause" : "Esc") + " shows the pause menu", p1, p1 && p1.screen);
    const t0 = await ev("simTime"), px0 = await st(); await sleep(600); const t1 = await ev("simTime"), px1 = await st();
    check("game clock is frozen while paused", t0 === t1 && px0.x === px1.x && px0.y === px1.y, { simTime: [t0, t1] });
    if (mobile) await tapSel("#overlay #pResume"); else await press("Escape");
    const p2 = await until((s) => s.screen === "play" && !s.pauseShown, 4000);
    check((mobile ? "tap RESUME" : "Esc again") + " resumes play", p2, p2 && p2.screen);
    if (!mobile) {
      await press("Escape"); await until((s) => s.screen === "pause", 3000);
      await tapSel("#overlay #pResume");
      const p3 = await until((s) => s.screen === "play" && !s.pauseShown, 4000);
      check("click RESUME resumes play", p3);
    }

    // Winning by pure input: walk with keys or the joystick along a path computed here from the map the page shows.
    const map = await ev("grid.map(r => r.join ? r.join('') : r)");
    const coinsLeft = () => ev(`coins.filter(c => !c.got || c.locked).map(c => [Math.floor(c.x / T), Math.floor(c.y / T)])`);
    const info = await ev(`({ den: [dens.tx, dens.ty], T })`);
    const solid = (x, y) => { const c = (map[y] || "")[x]; return !c || c === "#" || c === "T"; };
    const bfs = (sx, sy, tx, ty) => {
      const prev = new Map(), q = [[sx, sy]], k = (x, y) => x + "," + y; prev.set(k(sx, sy), null);
      while (q.length) { const [x, y] = q.shift(); if (x === tx && y === ty) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (solid(nx, ny) || prev.has(k(nx, ny))) continue; prev.set(k(nx, ny), [x, y]); q.push([nx, ny]); } }
      const out = []; let c = [tx, ty]; if (!prev.has(k(tx, ty))) return null; while (c) { out.unshift(c); c = prev.get(k(c[0], c[1])); } return out;
    };
    let held = null, joyAt = null;
    const steer = async (dir) => {
      if (mobile) {
        const x0 = Math.round(W * 0.5), y0 = Math.round(H * 0.6);
        if (!dir) { if (joyAt) { await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); joyAt = null; } return; }
        const [dx, dy] = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[dir];
        if (!joyAt) { await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0, id: 1 }] }); joyAt = true; }
        await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + dx * 60, y: y0 + dy * 60, id: 1 }] });
        return;
      }
      if (held === dir) return;
      if (held) await keyUp(held);
      held = dir; if (dir) await keyDown(dir);
    };
    const walk = async (tx, ty) => {
      const T = info.T;
      for (let guard = 0; guard < 600; guard++) {
        const s = await st();
        if (s.screen !== "play") { await steer(null); return s; }
        if (s.talk || s.busy || s.phase !== "play") { await steer(null); await talkThrough(15000); continue; }
        const cx = Math.floor(s.x / T), cy = Math.floor(s.y / T), path = bfs(cx, cy, tx, ty);
        if (!path) { await steer(null); return s; }
        const nx = path.length > 1 ? path[1] : path[0], gx = (nx[0] + 0.5) * T, gy = (nx[1] + 0.5) * T, dx = gx - s.x, dy = gy - s.y;
        if (path.length === 1 && Math.hypot(dx, dy) < T * 0.3) { await steer(null); return s; }
        await steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "ArrowRight" : "ArrowLeft") : (dy > 0 ? "ArrowDown" : "ArrowUp"));
        await sleep(40);
      }
      await steer(null); return st();
    };
    let s4 = await st(), visited = 0;
    for (let n = 0; n < 12; n++) {
      if (s4.screen !== "play" || s4.carry + s4.stash >= s4.need) break;
      const here = [Math.floor(s4.x / info.T), Math.floor(s4.y / info.T)], left = await coinsLeft();
      if (!left.length) break;
      const c = left.sort((a, b) => Math.hypot(a[0] - here[0], a[1] - here[1]) - Math.hypot(b[0] - here[0], b[1] - here[1]))[0];
      s4 = await walk(c[0], c[1]); visited++;
      await sleep(400); s4 = await talkThrough(20000);
    }
    const order = { length: visited };
    const atDen0 = await st();
    s4 = await walk(info.den[0], info.den[1]);
    const won = await until((s) => s.nextBtn, 10000);
    check("level won by walking with " + (mobile ? "the joystick" : "arrow keys") + " (no position writes)", won,
      { carryBeforeDen: atDen0.carry, need: atDen0.need, phase: (won || s4).phase, screen: (won || s4).screen, coins: order.length });
    if (won) {
      const lv0 = won.level;
      const shown = await until(() => true, 1) && await (async () => { for (let k = 0; k < 200; k++) { if (await ev(`(b => { if (!b) return false; const r = b.getBoundingClientRect(); if (!r.width) return false; const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && b.contains(e) && getComputedStyle(b).visibility !== "hidden"; })(document.getElementById("btnNext"))`)) return k; await sleep(100); } return null; })();
      check("NEXT LEVEL button appears on top of the end card", shown != null, shown != null ? { afterMs: shown * 100 } : undefined);
      await sleep(400);
      const hit = await tapSel("#btnNext");
      const s5 = await until((s) => s.level === lv0 + 1 && s.screen === "play", 10000), s6 = s5 || await st();
      check("NEXT LEVEL button moves on to the next level", s5, { hit, from: lv0, to: s6.level, screen: s6.screen, phase: s6.phase, overlay: s6.overlay });
    } else check("NEXT LEVEL button moves on to the next level", false, "not reached: level not won");
    }

    const errs = await ev("window.__TD ? __TD.errors : null");
    check("error probe installed and no page errors", Array.isArray(errs) && errs.length === 0, errs ? errs.slice(0, 5) : "probe missing");
    if (scrolled.length) console.log(`${name.padEnd(7)} NOTE scrolled with real input to reach ${scrolled.join(", ")}`);
    try { await send("Browser.close"); } catch {}
  } catch (e) {
    check("session ran", false, String(e && e.stack || e));
  } finally {
    try { ws && ws.close(); } catch {}
    if (chrome) { await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once("exit", r); setTimeout(r, 5000); }); try { chrome.kill(); } catch {} }
    await sleep(300);
    try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 }); } catch {}
  }
  return steps;
}

async function main() {
  await lock();
  let all = [];
  try {
    if (ONLY === "smoke") all = all.concat(await session("built", 1280, 800, false, true));
    if (ONLY.includes("desktop")) all = all.concat(await session("desktop", 1280, 800, false));
    if (ONLY.includes("phone")) all = all.concat(await session("phone", 390, 844, true));
  } finally { unlock(); }
  const bad = all.filter((s) => !s.ok).length;
  console.log(bad ? `UI FLOW FAIL (${bad} of ${all.length} steps)` : `UI FLOW PASS (${all.length} steps)`);
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e.stack || e); unlock(); process.exit(2); });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { unlock(); process.exit(130); });
