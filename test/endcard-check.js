"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const CHROME = process.env.CHROME_PATH || ({ win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => require("path").join(d, "Google", "Chrome", "Application", "chrome.exe")), darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"], linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"] }[process.platform] || []).find((p) => require("fs").existsSync(p)) || "google-chrome";
const PORT = +process.env.CDP_PORT || 9718, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const SHOTS = process.env.SHOTS || path.join(__dirname, "..", "shots");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "ec-check-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROBE = `window.__TD = { errors: [] };
addEventListener("error", (e) => __TD.errors.push("error: " + (e.message || e.type)), true);
addEventListener("unhandledrejection", (e) => __TD.errors.push("rejection: " + (e.reason && e.reason.stack || e.reason)));`;
const SIZES = [[1875, 929, "wide"], [1280, 720, "laptop"], [1024, 640, "small"], [390, 844, "phone"], [360, 640, "phone-s"]];

const checks = [];
const add = (n, ok, v) => checks.push([n, !!ok, v]);

const OPEN = (i, slow) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)), TS = () => BH.trailFeature.api.state;
  loadLevel(${i}, false); game.screen = "play";
  ${slow ? "if (typeof levelStart === 'number') levelStart -= 9999;" : ""}
  const s = TS(); s.tourPending = false; s.cinePending = false; s.tour = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play";
  if (BH.talk && BH.talk.isOpen && BH.talk.isOpen() && BH.talk.close) BH.talk.close();
  BH.trailFeature.api.win();
  for (let k = 0; k < 200 && !document.querySelector(".ec-onmap.show"); k++) await wait(50);
  await wait(2600);
  return !!document.querySelector(".ec-onmap.show");
})()`;
const MEASURE = `(() => {
  const h = document.querySelector(".ec-onmap"); if (!h) return null;
  const r = h.getBoundingClientRect(), cs = getComputedStyle(h), ov = document.getElementById("overlay");
  const fr = innerWidth >= 700 && h.closest(".ec-map") ? h.closest(".ec-map").getBoundingClientRect() : null;
  const inFrame = !fr || (r.top >= fr.top - 1 && r.bottom <= fr.bottom + 1 && r.left >= fr.left - 1 && r.right <= fr.right + 1);
  const frame = fr ? [Math.round(fr.top), Math.round(fr.bottom)].join("..") : "screen";
  const kids = [...h.children].filter((e) => e.offsetParent && !e.classList.contains("ec-sharepop"));
  const out = kids.filter((e) => { const q = e.getBoundingClientRect(); return q.top < -1 || q.bottom > innerHeight + 1 || q.left < -1 || q.right > innerWidth + 1; }).map((e) => e.className || e.tagName);
  return { fit: h.style.getPropertyValue("--ecfit"), tf: cs.transform, scrollers: [...document.querySelectorAll("#overlay, #overlay *")].filter((e) => e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map((e) => e.id || e.className).slice(0, 4), top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, vw: innerWidth,
    boardScroll: h.scrollHeight - h.clientHeight, overflowY: cs.overflowY,
    pageScroll: Math.max(document.documentElement.scrollHeight - innerHeight, ov ? ov.scrollHeight - ov.clientHeight : 0),
    out, inFrame, frame, terms: h.querySelectorAll(".ec-term").length, termLine: (h.querySelector(".ec-terms") || {}).textContent || "", lineText: (h.querySelector(".ec-line") || {}).textContent || "",
    miss: h.querySelectorAll(".ec-miss").length, zecRow: !!h.querySelector(".ec-zecrow") && getComputedStyle(h.querySelector(".ec-zecrow")).flexDirection === "column" && h.querySelector(".ec-zecrow").offsetHeight < 100,
    linkOff: (() => { const bs = [...h.querySelectorAll(".ec-links button")]; if (!bs.length) return 99; const a = bs[0].getBoundingClientRect(), z = bs[bs.length - 1].getBoundingClientRect(); return Math.round(Math.abs((a.left + z.right) / 2 - (r.left + r.right) / 2)); })(),
    shopText: (h.querySelector("#btnShop") || {}).textContent || "",
    next: !!h.querySelector("#btnNext"), q: !!h.querySelector(".ec-q"), links: h.querySelectorAll(".ec-links button").length };
})()`;

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
    const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + expr.slice(0, 80)); return r.result.value; };
    const shot = async (name) => { const img = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(SHOTS, name), Buffer.from(img.data, "base64")); };
    await send("Page.enable"); await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
    const ONLY = process.env.LEVELS ? process.env.LEVELS.split(",").map(Number) : null;
    for (const [w, h, tag] of SIZES) {
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: tag.startsWith("phone") });
      await send("Page.navigate", { url: BASE + "index.html?unlock" });
      for (let i = 0; i < 100; i++) { if (await ev("!!(window.BH && BH.trailFeature && BH.trailFeature.api && typeof loadLevel === 'function')")) break; await sleep(100); }
      await sleep(400);
      const levels = await ev("(window.LEVELS || []).map((l) => l.tid || l.title)");
      for (let i = 0; i < levels.length; i++) {
        if (ONLY && !ONLY.includes(i)) continue;
        const n = `${tag} L${i} ${levels[i]}`;
        const shown = await ev(OPEN(i));
        if (!shown) {
          const fin = await ev(`!!document.querySelector(".overlay.finale")`);
          add(`${n}: ${fin ? "ends on the finale screen, not this board" : "board shows"}`, fin, fin ? "finale" : "never shown");
          continue;
        }
        const m = await ev(MEASURE);
        add(`${n}: no scroll bar on the board`, m.boardScroll <= 0 && m.overflowY !== "auto" && m.overflowY !== "scroll", `${m.boardScroll}px over, overflow ${m.overflowY}`);
        add(`${n}: page itself does not scroll`, m.pageScroll <= 1, `${m.pageScroll} ${m.scrollers.join(",")}`);
        add(`${n}: whole board inside the screen`, m.out.length === 0 && m.top >= 0 && m.bottom <= m.vh, `${m.top}..${m.bottom} of ${m.vh} fit ${m.fit}${m.out.length ? " out: " + m.out.join(",") : ""}`);
        add(`${n}: board sits inside the map frame`, m.inFrame, `board ${m.top}..${m.bottom}, frame ${m.frame}, fit ${m.fit}`);
        add(`${n}: RETRY | WORLD MAP | SELECT CHARACTER centred, no ZEC on it`, m.linkOff <= 2 && /^select character$/i.test(m.shopText), `off ${m.linkOff}px, "${m.shopText}"`);
        add(`${n}: NEXT, question and links all present`, m.next && m.links === 3, JSON.stringify({ next: m.next, q: m.q, links: m.links }));
        add(`${n}: no ZCASH terms line, no MISSED box, ZEC row`, m.terms === 0 && !m.termLine && !/ZCASH:/.test(m.lineText) && m.miss === 0 && m.zecRow, JSON.stringify({ terms: m.terms, line: m.termLine, miss: m.miss, zecRow: m.zecRow }));
        if (tag === "wide" || tag === "phone" || i === 5) await shot(`endcard-${tag}-L${i}.png`);
      }
      if (tag === "wide" || tag === "phone") {
        const i = ONLY ? ONLY[0] : 5;
        await ev(OPEN(i, true));
        const t = await ev(`(async () => { const ms = [...document.querySelectorAll(".ec-onmap .medal")], m = ms[1]; if (!m) return null;
          const before = getComputedStyle(m, "::after").opacity; m.click(); await new Promise((r) => setTimeout(r, 400));
          return { par: game.result && game.result.medals && game.result.medals.par, tip: m.getAttribute("data-tip"), cls: m.className, before, after: getComputedStyle(m, "::after").opacity, miss: document.querySelectorAll(".ec-onmap .ec-miss").length }; })()`);
        add(`${tag} slow L${i}: missed UNDER medal explains itself on tap, no MISSED box`, t && !t.par && /medal asks/i.test(t.tip || "") && !/MISSED/.test(t.tip) && t.before === "0" && t.after === "1" && t.miss === 0, JSON.stringify(t));
        await shot(`endcard-${tag}-slow-tip.png`);
      }
      const errs = await ev("__TD.errors");
      add(`${tag}: 0 page errors`, errs.length === 0, errs.slice(0, 3).join(" | ") || 0);
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
