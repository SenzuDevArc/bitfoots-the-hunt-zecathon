"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const CHROME = process.env.CHROME_PATH || ({ win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => require("path").join(d, "Google", "Chrome", "Application", "chrome.exe")), darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"], linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"] }[process.platform] || []).find((p) => require("fs").existsSync(p)) || "google-chrome";
const PORT = 9704, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const SHOTS = process.env.SHOTS || path.join(__dirname, "..", "shots");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "tm-check-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROBE = `window.__TD = { errors: [] };
addEventListener("error", (e) => __TD.errors.push("error: " + (e.message || e.type)), true);
addEventListener("unhandledrejection", (e) => __TD.errors.push("rejection: " + (e.reason && e.reason.stack || e.reason)));
(() => { const ce = console.error; console.error = function () { __TD.errors.push("console.error: " + [].map.call(arguments, String).join(" ")); return ce.apply(console, arguments); }; })();`;
const BANNED = /—|\d|BLOCK|CONFIRM|UNLOCK/;

const checks = [];
const add = (n, ok, v) => checks.push([n, !!ok, v]);

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const chrome = spawn(CHROME, ["--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    "--no-first-run", "--no-default-browser-check", "--window-size=1280,800", "about:blank"], { stdio: "ignore" });
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
    const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + expr); return r.result.value; };
    const shot = async (name) => { const img = await send("Page.captureScreenshot", { format: "png" }); const f = path.join(SHOTS, name); fs.writeFileSync(f, Buffer.from(img.data, "base64")); return f; };
    const until = async (expr, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await sleep(80); } return false; };
    await send("Page.enable"); await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
    const S = "BH.trailMachine.stats()";
    const UI = `(() => { const r = document.querySelector(".tm-scene"), l = r && r.querySelector(".tm-line"), b = r && r.querySelector(".tm-btn");
      if (!r) return null; const box = (e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; };
      return { line: l.textContent, lineOn: l.classList.contains("on"), btn: b.textContent, btnOn: b.classList.contains("on"),
        boxes: [box(r.querySelector(".tm-cv")), box(l), box(b)], vw: innerWidth, vh: innerHeight, over: r.scrollHeight > r.clientHeight + 1 || r.scrollWidth > r.clientWidth + 1 }; })()`;
    const inView = (u) => u.boxes.every((b) => b[0] >= -1 && b[1] >= -1 && b[2] <= u.vw + 1 && b[3] <= u.vh + 1);

    for (const [w, h, tag] of [[1280, 800, "desk"], [390, 844, "phone"]]) {
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: tag === "phone" });
      for (const act of [1, 2]) {
        const pre = `${tag} act ${act}`;
        await send("Page.navigate", { url: BASE + `index.html?unlock&machine=${act}` });
        if (!(await until("!!(window.BH && BH.trailMachine && BH.trailMachine.isOpen())", 15000))) { add(`${pre}: scene opened`, false, "never opened"); continue; }
        const beats = await ev(`BH.trailMachine.beats[${act}]`), last = await ev(`BH.trailMachine.lines[${act}]`);
        await ev(`(() => { if (typeof sfx !== "function") return; const o = sfx; window.sfx = function (k) { if (k === "voice") __TD.voice = (__TD.voice || 0) + 1; return o.apply(this, arguments); }; })()`);
        for (let i = 0; i < beats.length; i++) {
          const n = `${pre} beat ${i + 1}`;
          if (i === 0 && beats[0].parts) {
            await until(`${S}.T >= 1.15`, 8000);
            const said = await ev(`document.querySelector(".tm-line span").textContent`);
            add(`${n}: says YOUR WALLET as the wallet lands, nothing past it yet`, said === beats[0].parts[0], `"${said}"`);
          }
          if (i === 1) {
            await sleep(400);
            const mid = await ev(`(() => { const s = BH.trailMachine.stats(), b = document.querySelector(".tm-btn"), p = document.querySelector(".tm-prev"); return { playing: !s.hold, on: b.classList.contains("on") && p.classList.contains("on") && getComputedStyle(b).visibility === "visible" && getComputedStyle(p).visibility === "visible" }; })()`);
            add(`${n}: PREV and NEXT stay on screen while a line plays`, mid.playing && mid.on, JSON.stringify(mid));
            const s0 = await ev(S);
            for (const sel of [".tm-scene", ".tm-cv", ".tm-line"]) {
              await ev(`(() => { const e = document.querySelector("${sel}"); for (const t of ["pointerdown", "pointerup", "click"]) e.dispatchEvent(new PointerEvent(t, { bubbles: true })); })()`);
            }
            await sleep(150);
            const s1 = await ev(S);
            add(`${n}: a tap on the scene does nothing`, s1.beat === 1 && !s1.hold && s1.T < beats[1].t1 && s1.T >= s0.T, JSON.stringify(s1));
            await ev(`document.querySelector(".tm-btn").click()`);
            await sleep(150);
            const s = await ev(S);
            add(`${n}: NEXT mid-beat finishes this beat only`, s.beat === 1 && Math.abs(s.T - beats[1].t1) < 0.01, JSON.stringify(s));
          }
          const held = await until(`${S}.hold === true && ${S}.beat === ${i}`, 20000);
          const a = await ev(S), u1 = await ev(UI);
          await sleep(3000);
          const b = await ev(S), u2 = await ev(UI);
          add(`${n}: holds on its line`, held && u1.line === beats[i].say && u1.lineOn, `"${u1.line}"`);
          add(`${n}: the line is fully talked out before it waits`, a.typed === beats[i].say.length, `${a.typed}/${beats[i].say.length}`);
          if (beats[i].parts) add(`${n}: parts add up to the line`, beats[i].parts.join("") === beats[i].say, beats[i].parts.join("|"));
          if (act === 2) {
            const on = await ev(`[...document.querySelectorAll(".tm-tag.on")].map((t) => t.textContent)`);
            const want = [[], ["SEALED NOTE"], ["SEALED NOTE", "PROOF GATE"], ["SEALED NOTE", "PROOF GATE", "TAG JAR"], ["SEALED NOTE", "PROOF GATE", "TAG JAR", "GLASS KEY"]][i];
            add(`${n}: river tools named as they work`, JSON.stringify(on) === JSON.stringify(want), on.join(","));
          }
          if (i === 0) { const v = await ev("__TD.voice || 0"); add(`${n}: talking sound plays with the words`, v >= 10, v); }
          add(`${n}: nothing moves on for 3 s without input`, b.hold && b.beat === i && b.T === a.T && u2.line === u1.line, `T ${a.T} -> ${b.T}`);
          add(`${n}: NEXT button shown, all in view, no overflow`, u2.btn === "NEXT" && u2.btnOn && inView(u2) && !u2.over, JSON.stringify(u2.boxes));
          const pv = await ev(`(() => { const p = document.querySelector(".tm-prev"); return { on: p.classList.contains("on"), off: p.disabled }; })()`);
          add(`${n}: PREV stands beside NEXT, grey and dead only on the first line`, pv.on && pv.off === (i === 0), JSON.stringify(pv));
          add(`${n}: line is caps, no numbers, no em dash, no block talk`, beats[i].say === beats[i].say.toUpperCase() && !BANNED.test(beats[i].say), beats[i].say);
          if (tag === "desk" || i === beats.length - 1) await shot(`machine-${tag}-act${act}-beat${i + 1}.png`);
          if (i % 2) await ev(`(document.activeElement || document.body).dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }))`);
          else await ev(`document.querySelector(".tm-btn").click()`);
          await sleep(300);
        }
        const ended = await until(`${S}.ended === true`, 15000), u = await ev(UI);
        add(`${pre}: ends on the old line with CONTINUE`, ended && u.line === last && u.btn === "CONTINUE" && u.btnOn && inView(u) && !u.over, `"${u.line}" / ${u.btn}`);
        await sleep(900);
        await ev(`document.querySelector(".tm-prev").click()`); await sleep(300);
        const p1 = await ev(S), up1 = await ev(UI);
        await ev(`document.querySelector(".tm-prev").click()`); await sleep(300);
        const p2 = await ev(S), up2 = await ev(UI);
        add(`${pre}: PREV steps back a line at a time`, !p1.ended && p1.hold && p1.beat === beats.length - 1 && up1.line === beats[beats.length - 1].say && up1.btn === "NEXT" &&
          p2.beat === beats.length - 2 && up2.line === beats[beats.length - 2].say && p2.T === beats[beats.length - 2].t1, `${p1.beat} "${up1.line}" / ${p2.beat}`);
        await shot(`machine-${tag}-act${act}-prev.png`);
        for (let k = 0; k < 2; k++) { await ev(`document.querySelector(".tm-btn").click()`); await sleep(300); await until(`${S}.hold === true || ${S}.ended === true`, 15000); }
        await until(`${S}.ended === true`, 15000); await sleep(900);
        await shot(`machine-${tag}-act${act}-end.png`);
        await ev(`document.querySelector(".tm-btn").click()`);
        await sleep(300);
        add(`${pre}: CONTINUE closes the scene`, !(await ev("BH.trailMachine.isOpen()")), "");
        await send("Page.navigate", { url: BASE + `index.html?unlock&machine=${act}` });
        await until("!!(window.BH && BH.trailMachine && BH.trailMachine.isOpen())", 15000);
        await sleep(500);
        await ev(`dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
        const esc = await until(`${S}.ended === true`, 3000), ue = await ev(UI);
        add(`${pre}: Esc skips to the old line`, esc && ue.line === last && ue.btn === "CONTINUE", ue.line);
        const errs = await ev("__TD.errors");
        add(`${pre}: 0 console errors`, errs.length === 0, errs.slice(0, 3).join(" | ") || 0);
      }
    }
    try { await send("Browser.close"); } catch {}
  } finally {
    try { ws && ws.close(); } catch {}
    await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once("exit", r); setTimeout(r, 5000); });
    try { chrome.kill(); } catch {}
    await sleep(300);
    try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 }); } catch (e) { console.error("profile not removed: " + e.code); }
  }
}

main().then(() => {
  for (const [n, ok, v] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${n}  (${v})`);
  const bad = checks.filter((c) => !c[1]).length;
  console.log(`${checks.length - bad}/${checks.length} passed`);
  process.exit(bad || !checks.length ? 1 : 0);
}).catch((e) => { console.error(e.stack || e); process.exit(2); });
