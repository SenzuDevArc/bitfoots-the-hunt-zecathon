"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || ({ win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => require("path").join(d, "Google", "Chrome", "Application", "chrome.exe")), darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"], linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"] }[process.platform] || []).find((p) => require("fs").existsSync(p)) || "google-chrome";
const PORT = 9643, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const SHOTS = process.argv[2] || path.join(ROOT, "shots");
const PROFILE = path.join(os.tmpdir(), "trail-caught-profile");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROBE = `window.__TD = { errors: [] };
addEventListener("error", (e) => __TD.errors.push("error: " + (e.message || e.type) + " " + (e.filename || "") + ":" + (e.lineno || "")), true);
addEventListener("unhandledrejection", (e) => __TD.errors.push("rejection: " + (e.reason && e.reason.stack || e.reason)));
(() => { const ce = console.error; console.error = function () { __TD.errors.push("console.error: " + [].map.call(arguments, String).join(" ")); return ce.apply(console, arguments); }; })();`;

const LIB = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const TS = () => BH.trailFeature.api.state;
function noTour() { const s = TS(); if (s.cinePending && s.cineP0) { player.x = s.cineP0.x; player.y = s.cineP0.y; } s.tourPending = false; s.cinePending = false; if (s.tour) s.tour = null; s.cine = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play"; if (BH.talk && BH.talk.isOpen && BH.talk.isOpen() && BH.talk.close) BH.talk.close(); }
const PAY = LV.findIndex(l => (l.signs || []).some(s => s[2] === "PAY POST"));
function start() { loadLevel(PAY, true); game.screen = "play"; noTour(); }
`;

const STEPS = {
  post: LIB + String.raw`
start(); await new Promise(r => setTimeout(r, 300));
const sg = L.signs.find(s => s[2] === "PAY POST"); player.x = (sg[0] + 2.5) * T; player.y = (sg[1] + 2.5) * T; ghost = true;
await new Promise(r => setTimeout(r, 1200));
return { level: PAY + 1, title: L.title };`,
  catch: LIB + String.raw`
let lv = -1;
for (let i = 0; i < LV.length && lv < 0; i++) { loadLevel(i, true); if (hunters.some(x => x.type === "dog")) lv = i; }
loadLevel(lv, true); game.screen = "play"; noTour(); await new Promise(r => setTimeout(r, 300));
const h = hunters.find(x => x.type === "dog"); h.caughtHow = "spotted"; const t0 = performance.now(); caught(h, "caught");
window.__t0 = t0; return { level: lv + 1, title: L.title, htype: h.type };`,
  strip: String.raw`return { caughtCard: game.caughtCard, phase: game.phase, screen: game.screen, caughtPops: pops.filter(p => p.text === "CAUGHT").length };`,
  waitCard: String.raw`for (let i = 0; i < 200 && !game.caughtCard; i++) await new Promise(r => setTimeout(r, 25));
const ms = Math.round(performance.now() - window.__t0); await new Promise(r => setTimeout(r, 600));
const card = document.querySelector(".caughtcard"), b = card.getBoundingClientRect(), cs = getComputedStyle(card), word = card.querySelector(".cc-word");
const wb = word ? word.getBoundingClientRect() : null;
return { cardAfterMs: ms, text: card.innerText, emDash: card.innerText.includes("\u2014"), word: word && word.textContent, wordColor: word && getComputedStyle(word).color,
  wordOnCard: !!wb && wb.top >= b.top && wb.bottom <= b.bottom, inView: b.top - 40 >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth,
  rect: [b.left, b.top, b.width, b.height].map(Math.round), bg: cs.backgroundColor + " " + cs.backgroundImage.slice(0, 60), canvasCaughtPops: pops.filter(p => p.text === "CAUGHT").length,
  trackRights: [...card.querySelectorAll(".cc-track")].map(e => Math.round(e.getBoundingClientRect().right)),
  linesFont: [...card.querySelectorAll(".cc-line")].map(e => getComputedStyle(e).fontSize) };`,
  escape: LIB + String.raw`
start(); await new Promise(r => setTimeout(r, 300));
const S = TS(); S.posts = S.posts || {}; S.posts.fixture = { n: 1 };
player.carry = 0; player.stash = coins.length - 1; ghost = true; escaped();
for (let i = 0; i < 160 && !document.querySelector(".ec-onmap.show"); i++) await new Promise(r => setTimeout(r, 50));
await new Promise(r => setTimeout(r, 3500));
const badges = [...document.querySelectorAll(".ec-badge")].map(e => e.textContent);
return { coins: coins.length, banked: banked(), spent: trailSpent(), badges, headShown: !!document.querySelector(".ec-onmap.show") };`,
  escapePart: LIB + String.raw`
start(); await new Promise(r => setTimeout(r, 300));
const S = TS(); S.posts = S.posts || {}; S.posts.fixture = { n: 1 };
player.carry = 0; player.stash = coins.length - 3; ghost = true; escaped();
for (let i = 0; i < 160 && !document.querySelector(".ec-badge"); i++) await new Promise(r => setTimeout(r, 50));
return { coins: coins.length, banked: banked(), spent: trailSpent(), badges: [...document.querySelectorAll(".ec-badge")].map(e => e.textContent) };`,
};

async function run(W, H, out) {
  let chrome, ws;
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
    const nav = async () => {
      await send("Page.navigate", { url: BASE + "index.html?unlock" });
      for (let i = 0; i < 100; i++) { await sleep(100); const r = await send("Runtime.evaluate", { expression: "document.readyState", returnByValue: true }); if (r.result.value === "complete") break; }
    };
    const ev = async (src) => {
      const r = await send("Runtime.evaluate", { expression: `(async () => {\n${src}\n})()`, awaitPromise: true, returnByValue: true, timeout: 60000 });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
      return r.result.value;
    };
    const shot = async (name) => { const img = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(SHOTS, `${name}-${W}x${H}.png`), Buffer.from(img.data, "base64")); };
    const errors = async () => (await send("Runtime.evaluate", { expression: "window.__TD ? __TD.errors : []", returnByValue: true })).result.value || [];
    const R = { size: `${W}x${H}` };
    await nav(); R.post = await ev(STEPS.post); await shot("trail-paypost");
    await nav(); R.catch = await ev(STEPS.catch); await sleep(900); R.strip = await ev(STEPS.strip); await shot("trail-caught-sign");
    R.card = await ev(STEPS.waitCard); await shot("trail-caught-card");
    await nav(); R.escape = await ev(STEPS.escape); await shot("trail-escaped-card");
    await nav(); R.escapePart = await ev(STEPS.escapePart);
    R.errors = await errors();
    out.push(R);
  } finally {
    try { ws && ws.close(); } catch {}
    if (chrome) { try { chrome.kill(); } catch {} await sleep(600); }
    try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 }); } catch (e) { console.error("profile not removed yet: " + e.code); }
  }
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const out = [];
  for (const [w, h] of [[1280, 800], [1920, 1080]]) await run(w, h, out);
  let fail = 0;
  const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fail++; };
  out.forEach((R) => {
    const n = R.escape.coins;
    ok(R.strip.phase === "caught" && !R.strip.caughtCard, `${R.size} the sign shows during the replay, before the card (phase ${R.strip.phase}, card ${R.strip.caughtCard})`);
    ok(R.strip.caughtPops === 0, `${R.size} the sign is the only CAUGHT text during the replay (${R.strip.caughtPops} loose words)`);
    const mid = R.card.rect[1] + R.card.rect[3] / 2, vh = +R.size.split("x")[1];
    ok(Math.abs(mid - vh / 2) <= 40, `${R.size} card centred: middle at y=${Math.round(mid)} of ${vh}`);
    ok(R.card.trackRights.length === 2 && R.card.trackRights[0] === R.card.trackRights[1], `${R.size} ZEC and DEN bars end at the same x ${JSON.stringify(R.card.trackRights)}`);
    ok(R.card.cardAfterMs >= 1800 && R.card.cardAfterMs <= 2600, `${R.size} the card follows the catch after ${R.card.cardAfterMs} ms`);
    ok(R.card.word === "CAUGHT" && R.card.wordOnCard, `${R.size} the CAUGHT title sits inside the card, like the pause title`);
    ok(R.card.canvasCaughtPops === 0, `${R.size} no second CAUGHT word on the canvas (${R.card.canvasCaughtPops})`);
    ok(!R.card.emDash, `${R.size} no em dash on the card`);
    ok(R.card.inView, `${R.size} card fully on screen ${JSON.stringify(R.card.rect)}`);
    ok(R.card.bg.startsWith("rgb(58, 37, 20) none"), `${R.size} pause-card background (${R.card.bg})`);
    ok(R.escape.badges.some((b) => /CLEAN SWEEP/.test(b)) || R.escape.badges.includes(n + " OF " + n + " COINS"),`${R.size} every coin picked up (${R.escape.banked} banked + ${R.escape.spent} paid) reads ${JSON.stringify(R.escape.badges)}`);
    ok(R.escapePart.badges.includes((n - 2) + " OF " + n + " COINS"), `${R.size} control: two coins left behind reads ${JSON.stringify(R.escapePart.badges)}`);
    ok(R.errors.length === 0, `${R.size} 0 console errors ${JSON.stringify(R.errors)}`);
  });
  console.log(JSON.stringify(out.map((R) => ({ size: R.size, post: R.post, catch: R.catch, card: { ms: R.card.cardAfterMs, rect: R.card.rect, text: R.card.text, fonts: R.card.linesFont } })), null, 1));
  console.log(fail ? `RESULT: ${fail} FAILED` : "RESULT: ALL PASS");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e.stack || e); process.exit(2); });
