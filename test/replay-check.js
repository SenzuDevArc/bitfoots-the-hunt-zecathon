"use strict";
const fs = require("fs"), path = require("path");
const { spawn } = require("child_process");
const AUTOPILOT = fs.readFileSync(path.join(__dirname, "autopilot.js"), "utf8");
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || ({ win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => require("path").join(d, "Google", "Chrome", "Application", "chrome.exe")), darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"], linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"] }[process.platform] || []).find((p) => require("fs").existsSync(p)) || "google-chrome";
const PORT = +process.env.CDP_PORT || 9631, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const LOCK = process.env.TRAIL_DRIVE_LOCK || path.join(require("os").tmpdir(), "trail-drive.lock"), OWNER = path.join(LOCK, "owner.json");
const TIDS = (() => { const w = { BH: {} }; w.window = w; require("vm").runInNewContext(fs.readFileSync(path.join(ROOT, "site", "levels", "levels.js"), "utf8"), w); return w.LEVELS.map((l) => l.tid); })();
const ONLY = (process.argv[2] || "").split(",").filter(Boolean).map(Number);
const SHOTS = process.argv[3] || path.join(ROOT, "shots");
const PROFILE = path.join(require("os").tmpdir(), "trail-replay-profile-" + PORT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROBE = `window.__TD = { errors: [] };
addEventListener("error", (e) => __TD.errors.push("error: " + (e.message || e.type) + " " + (e.filename || (e.target && e.target.src) || "") + ":" + (e.lineno || "")), true);
addEventListener("unhandledrejection", (e) => __TD.errors.push("rejection: " + (e.reason && e.reason.stack || e.reason)));
(() => { const ce = console.error; console.error = function () { __TD.errors.push("console.error: " + [].map.call(arguments, String).join(" ")); return ce.apply(console, arguments); }; })();`;

const LIB = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && BH.river && BH.bank && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const TS = () => BH.trailFeature.api.state;
const TXT = window.__TXT = window.__TXT || new Set();
if (!window.__hooked) {
  window.__hooked = true;
  const P = CanvasRenderingContext2D.prototype, f0 = P.fillText, s0 = P.strokeText;
  P.fillText = function (t) { if (TXT.size < 20000) TXT.add(String(t)); return f0.apply(this, arguments); };
  P.strokeText = function (t) { if (TXT.size < 20000) TXT.add(String(t)); return s0.apply(this, arguments); };
  window.__RP = [];
  const dp0 = window.drawPlayer;
  window.drawPlayer = function () { try { const cv = document.getElementById("ecMap"); if (cv && ctx && ctx.canvas === cv) { __RP.push([player.x, player.y, player.inShield ? 1 : 0, Math.round(performance.now())]); if (player.inShield && !window.__RPSHOT && __RP.length > 100) window.__RPSHOT = { x: player.x, y: player.y, tile: tile(Math.floor(player.x / T), Math.floor(player.y / T)) }; } } catch (e) {} return dp0.apply(this, arguments); };
}
function key(k, code) { dispatchEvent(new KeyboardEvent("keydown", { key: k, code: code || "", bubbles: true })); }
function pressE() { key("e", "KeyE"); }
function tileOf() { return [Math.floor(player.x / T), Math.floor(player.y / T)]; }
function count(code) { let n = 0; for (const r of grid) for (const c of r) if (c === code) n++; return n; }
function noTour() { const s = TS(); if (s.cinePending && s.cineP0) { player.x = s.cineP0.x; player.y = s.cineP0.y; cam.x = player.x; cam.y = player.y; s.elders.forEach((e, k) => { e.x = player.x - (k + 1) * T; e.y = player.y; }); } s.tourPending = false; s.cinePending = false; if (s.tour) s.tour = null; s.cine = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play"; }
const R = window.__R = { talk: { samples: 0, frozen: 0, movedWhileOpen: 0, opened: 0 }, choices: [], legs: [], notes: [], holds: 0, ghost: false };
window.__PATH = window.__PATH || [];
let policy = [], talkSince = null, sinceRender = 0, hook = null;
const WALLET = ["Make a wallet", "Write it down", (c) => { const li = [...document.querySelectorAll("#trailNote li")][2]; return !!li && li.textContent.replace(/^\d+\.\s*/, "").trim() === c; }];
function start(i, ghostOn) {
  loadLevel(i, true); game.screen = "play"; noTour(); window.__PATH = [];
  ghost = !!ghostOn; autopilot = null; talkSince = null;
  R.ghost = R.ghost || !!ghostOn;
}
function sampleText() {
  const st = BH.talk._state(); if (st) { TXT.add(st.text); (st.choices || []).forEach(c => TXT.add(c)); }
  const n = document.querySelector("#trailNote"); if (n && n.textContent) TXT.add(n.textContent);
}
async function talkTick() {
  const st = BH.talk._state(); if (!st) { talkSince = null; return; }
  if (talkSince == null) { talkSince = simTime; R.talk.opened++; return; }
  if (simTime - talkSince < 0.6) return;
  sampleText();
  if (!st.done) key("z");
  const s2 = BH.talk._state(); if (!s2) { talkSince = null; return; }
  if (s2.choices) {
    let idx = -1;
    for (const want of policy) { idx = s2.choices.findIndex(c => typeof want === "function" ? want(c) : c.indexOf(want) >= 0); if (idx >= 0) break; }
    if (idx < 0) idx = 0;
    R.choices.push(s2.choices[idx]);
    await sleep(400); key(String(idx + 1), "Digit" + (idx + 1));
  } else key("z");
  talkSince = null;
}
async function chunk(sec, cross) {
  const n = Math.round(sec / STEP);
  for (let k = 0; k < n && game.phase === "play"; k++) {
    const p0 = { x: player.x, y: player.y }, in0 = player.inShield;
    step(STEP);
    const PA = window.__PATH;
    if (game.phase === "play" && (!PA.length || simTime - PA[PA.length - 1][3] >= 0.05)) PA.push([player.x, player.y, player.inShield ? 1 : 0, simTime]);
    if (cross && player.inShield !== in0) { R.holds++; R.lastHold = { tile: tileOf(), ask: player.carry, in: player.inShield }; }
    if (hook) hook();
    R.talk.steps = (R.talk.steps || 0) + 1; if (game.phase === "talk") R.talk.phaseTalk = (R.talk.phaseTalk || 0) + 1;
    if (BH.talk.isOpen()) { R.talk.samples++; if (game.phase !== "play" && game.phase !== "escaped" && game.phase !== "caught") R.talk.frozen++; if (autopilot) R.talk.movedWhileOpen += Math.hypot(player.x - p0.x, player.y - p0.y); }
    sinceRender += STEP;
    if (sinceRender >= 0.25) { sinceRender = 0; try { render(); } catch (e) {} sampleText(); }
  }
  await talkTick();
  if (BH.memo && BH.memo.on()) { key("3", "Digit3"); key("Enter", "Enter"); R.memo = true; }
}
async function leg(tx, ty, o) {
  o = o || {};
  const blocked = (x, y) => { const c = tile(x, y); if (solidP(c)) return true; if (o.water === "avoid" && isWater(c)) return true; if (o.water === "only" && !isWater(c) && !(x === tx && y === ty)) return true; return false; };
  const [sx, sy] = tileOf(), r = bfsCore(sx, sy, tx, ty, blocked);
  if (!r.reached && !(sx === tx && sy === ty)) { R.legs.push(["noPath", tx, ty]); return false; }
  autopilot = { targets: [], path: r.path.slice(), sprint: false };
  if (!autopilot.path.length) autopilot.path.push([(tx + 0.5) * T, (ty + 0.5) * T]);
  let t = 0, still = 0, last = { x: player.x, y: player.y };
  while (autopilot && game.phase === "play" && t < (o.max || 60)) {
    if (!autopilot.path.length) autopilot.path.push([(tx + 0.5) * T, (ty + 0.5) * T]);
    await chunk(0.1, o.cross);
    t += 0.1;
    const d = Math.hypot(player.x - last.x, player.y - last.y); last = { x: player.x, y: player.y };
    still = d < 0.5 && !BH.talk.isOpen() ? still + 0.1 : 0;
    if (still > 4) { R.legs.push(["stuck", tx, ty, tileOf()]); autopilot = null; return false; }
    const [cx, cy] = tileOf(); if (cx === tx && cy === ty && Math.hypot(player.x - (tx + 0.5) * T, player.y - (ty + 0.5) * T) < 5) break;
  }
  autopilot = null;
  const [cx, cy] = tileOf();
  if (cx !== tx || cy !== ty) { R.legs.push(["short", tx, ty, [cx, cy], game.phase]); return false; }
  return true;
}
async function wait(cond, max, cross) { let t = 0; while (t < (max || 30) && game.phase === "play") { if (cond()) return true; await chunk(0.1, cross); t += 0.1; } return !!cond(); }
async function coinsAt(list, o) { for (const [x, y] of list) await leg(x, y, Object.assign({ water: "avoid" }, o)); }
async function wallet(stand) { const c0 = player.carry; await leg(stand[0], stand[1], { water: "avoid" }); return await wait(() => { if (BH.bank && BH.bank.machines().some(m => m.ask)) key("q", "KeyQ"); return player.carry >= c0 + 3; }, 6); }
async function payPost(stand, max) {
  await leg(stand[0], stand[1], { water: "allow" });
  let ok = await wait(() => TS().payAsk || TS().pay, 8);
  if (!ok) {
    R.notes.push("post did not ask at " + stand + " (carry " + player.carry + ", zone/calm), stepped away and back");
    const [sx, sy] = tileOf(); await leg(sx - 3, sy, { water: "allow", max: 5 }); await leg(stand[0], stand[1], { water: "allow" });
    ok = await wait(() => TS().payAsk || TS().pay, 8);
    if (!ok) { R.notes.push("post still did not ask"); return false; }
  }
  if (TS().payAsk && !TS().pay) { await chunk(0.2); await snap("link"); }
  return await wait(() => { if (!TS().pay && TS().payAsk && !BH.talk.isOpen()) pressE(); return !!TS().pay; }, max || 40);
}
async function snap(tag) {
  const taken = window.__snapTaken = window.__snapTaken || {};
  if (taken[tag]) return;
  const ap = autopilot; autopilot = null;
  try { render(); } catch (e) {}
  taken[tag] = true; window.__SNAPDONE = false; window.__SNAP = tag;
  for (let i = 0; i < 100 && !window.__SNAPDONE; i++) await sleep(100);
  window.__SNAP = null;
  autopilot = ap;
}
async function finish() {
  await wait(() => game.phase !== "play", 3);
  const phase = game.phase;
  if (phase === "escaped") {
    const path = (window.__PATH || []).slice(), end = [player.x, player.y, player.inShield ? 1 : 0];
    if (!path.length || Math.hypot(end[0] - path[path.length - 1][0], end[1] - path[path.length - 1][1]) > 1) path.push(end);
    const tick = document.createElement("div"); tick.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;z-index:99999;pointer-events:none"; document.body.appendChild(tick);
    const tk = setInterval(() => { tick.style.background = tick.style.background ? "" : "rgba(0,0,0,0.01)"; }, 16);
    const settle = async () => { let last = -1, still = 0; for (let k = 0; k < 80 && still < 6; k++) { await sleep(100); still = __RP.length === last ? still + 1 : 0; last = __RP.length; } };
    await settle();
    await sleep(600);
    const ov = document.body.innerText || ""; TXT.add(ov);
    R.replay = document.getElementById("ecMap") ? replayCover(path, __RP.slice()) : { noMap: true, pathN: path.length };
    if ((i === 3 || i === 4) && !R.replay.noMap) {
      const u0 = window.unlockedUpTo; window.unlockedUpTo = () => 99;
      try { window.__RP = []; BH.router.open({ name: "escaped", n: game.levelIdx + 1 }); await settle(); R.stored = replayCover(path, __RP.slice()); const n = game.levelIdx + 1, tr = JSON.parse(localStorage.getItem((window.BH_SAVE_KEY || "") + "-trails") || "{}")[n]; R.stored.saved = { last: !!(save.last && save.last[n] && save.last[n].escaped), pr: tr && tr.pr ? tr.pr.length : null, can: BH.router.canEnter({ name: "escaped", n }), screen: game.screen, phase: game.phase }; } catch (e) { R.stored = { ex: String(e) }; }
      window.unlockedUpTo = u0;
    }
    clearInterval(tk); tick.remove();
  }
  return phase;
}
function replayCover(path, rp) {
  const tol = T * 0.5, near = (p) => rp.reduce((m, q) => Math.min(m, Math.hypot(q[0] - p[0], q[1] - p[1])), Infinity);
  let cov = 0, wet = 0, wetCov = 0;
  path.forEach(p => { const ok = near(p) <= tol; if (ok) cov++; if (p[2]) { wet++; if (ok) wetCov++; } });
  const r2 = (v) => Math.round(v * 100) / 100;
  return { pathN: path.length, frames: rp.length, share: path.length ? r2(cov / path.length) : 0, wet, wetShare: wet ? r2(wetCov / wet) : null, framesInWater: rp.filter(q => q[2]).length, ms: rp.length ? rp[rp.length - 1][3] - rp[0][3] : 0, gaps: rp.slice(1).map((q, k) => q[3] - rp[k][3]).filter(g => g > 200),
    startTiles: path.length && rp.length ? r2(Math.hypot(rp[0][0] - path[0][0], rp[0][1] - path[0][1]) / T) : null, endTiles: path.length ? r2(near(path[path.length - 1]) / T) : null };
}
async function attempt(i, plan) {
  start(i, !!window.__forceGhost); let a = await plan();
  if (game.phase === "caught" || (a && a.retryGhost)) { R.notes.push("caught with ghost off (" + (game.loseReason || "") + ") at " + tileOf() + ", replayed with ghost on"); R.legs = []; start(i, true); a = await plan(); }
  if (a) a.end = { carry: player.carry, stash: player.stash, ready: BH.stamps.ready(), tile: tileOf(), denWait: TS().denWait, need: L.need, inShield: player.inShield, links };
  return a;
}
function stringsWhy() { return (typeof strings !== "undefined" ? strings : []).map(s => s.why || s.reason || "?"); }
function planks() { return BH.bank.info().planks.map(p => p.text); }
`;

const LV = {
steps: { won: String.raw`
  policy = WALLET;
  return await attempt(i, async () => {
    await leg(4, 2, { water: "avoid" });
    await wait(() => !TS().locked, 20);
    const unlocked = !TS().locked;
    const c0 = coins.findIndex(c => Math.floor(c.x / T) === 4 && Math.floor(c.y / T) === 2);
    const zeroAtUnlock = player.carry <= 1, u0 = simTime, talkAtUnlock = BH.talk.isOpen();
    const said = [], b0 = BH.talk.bubble, o0 = BH.talk.open;
    BH.talk.bubble = function (e, t) { said.push([e && e.id, t]); return b0.apply(this, arguments); };
    BH.talk.open = function (seq) { (seq || []).forEach(l => { if (Array.isArray(l)) said.push([l[0], l[1]]); }); return o0.apply(this, arguments); };
    const zeroAtLand = talkAtUnlock;
    await wait(() => player.carry === 1, 8);
    const gotAtUnlock = zeroAtUnlock && zeroAtLand && !!coins[c0].got && !coins[c0].locked && player.carry === 1, gotAfter = +(simTime - u0).toFixed(1), heldOnZero = gotAfter;
    let pickT = null, readyGap = null, notReady = 0;
    hook = () => {
      if (pickT == null && coins[c0].got && !coins[c0].locked) { pickT = simTime; readyGap = BH.stamps.ready() >= 1 ? 0 : null; }
      if (BH.stamps.ready() !== player.carry) notReady++;
    };
    if (!coins[c0].got) { await leg(5, 2); await leg(4, 2); }
    await leg(17, 5, { water: "avoid" });
    await chunk(2);
    await snap("firstcoin");
    await leg(18, 2); await leg(25, 10); await leg(28, 11);
    await wait(() => game.phase !== "play", 20);
    hook = null; BH.talk.bubble = b0; BH.talk.open = o0;
    const first = said.filter(s => s[1] === "You made your first wallet and picked up your first coin.");
    return { unlocked, gotAtUnlock, zeroAtUnlock, zeroAtLand, heldOnZero, gotAfter, readyGap, notReady, firstLine: first.length, firstBy: first[0] && first[0][0], blockLines: said.filter(s => /block|unlock/i.test(s[1])).length, phase: await finish() };
  });`,
  ctrl: String.raw`
  policy = WALLET; start(i, false); await leg(4, 2); await wait(() => !TS().locked, 20); await leg(5, 2); await leg(17, 5);
  await leg(20, 8); await leg(20, 12); await leg(27, 12); await leg(28, 11); await chunk(1.5);
  const atDen = { ready: BH.stamps.ready(), carry: player.carry, phase: game.phase };
  return { atDen, ok: atDen.phase === "play" && atDen.carry < 3 };`,
  assert: (w) => w.unlocked && w.gotAtUnlock && w.heldOnZero <= 0.9 && w.readyGap === 0 && w.notReady === 0 && w.firstLine === 1 && w.firstBy === "sly" && w.blockLines === 0,
  ctrlOk: (c) => c.ok, ctrlName: "den with only 2 of 3 coins stays play" },

machine: { won: String.raw`
  return await attempt(i, async () => {
    const h0 = count("H");
    await coinsAt([[4, 8]]);
    await payPost([10, 6]);
    const signT = simTime; let openT = null, textAtOpen = null;
    await wait(() => { if (count("H") < h0) { openT = simTime; textAtOpen = BH.stamps.confirm(TS().pay.key).text; } return openT != null; }, 5);
    const openSec = openT != null ? +(openT - signT).toFixed(2) : null;
    await snap("gate");
    await coinsAt([[5, 3], [8, 10]]);
    await coinsAt([[18, 2], [25, 5], [23, 9]]);
    await leg(28, 9);
    await wait(() => game.phase !== "play", 25);
    const conf = TS().pay ? BH.stamps.confirm(TS().pay.key).text : null;
    const G = (TS().grec || []).flatMap(r => r.tiles), seen = [];
    const iv = setInterval(() => { if (document.getElementById("ecMap")) { const s = G.map(q => grid[q[1]][q[0]]).join(""); if (seen[seen.length - 1] !== s) seen.push(s); } }, 15);
    const PQ = Object.values(TS().posts || {})[0], arcs = [], A = CanvasRenderingContext2D.prototype, arc0 = A.arc;
    A.arc = function (x, y, r) { if (this.canvas && this.canvas.id === "ecMap" && r === 5 && this.fillStyle === "#ffd24a") arcs.push([x, y, seen[seen.length - 1]]); return arc0.apply(this, arguments); };
    const phase = await finish(); clearInterval(iv); A.arc = arc0;
    const onLine = PQ ? arcs.filter(a => Math.min(PQ.from.x, PQ.x) - 2 <= a[0] && a[0] <= Math.max(PQ.from.x, PQ.x) + 2 && !coins.some(c => Math.hypot(c.x - a[0], c.y - a[1]) < 2)) : [];
    const replayGate = { tiles: G.length, states: seen, endHasH: count("H"), coinFrames: onLine.length, coinWhileShut: onLine.filter(a => /H/.test(a[2] || "")).length };
    return { h0, hAfter: count("H"), openSec, textAtOpen, confEnd: conf, replayGate, phase };
  });`,
  ctrl: String.raw`
  start(i, false); const h0 = count("H");
  await leg(10, 6); await chunk(4);
  for (let k = 0; k < 5; k++) { pressE(); await chunk(0.1); }
  const noCoin = { payAsk: !!TS().payAsk, signed: !!TS().pay, h: count("H"), carry: player.carry };
  return { h0, noCoin, ok: noCoin.h === h0 && !noCoin.payAsk && !noCoin.signed };`,
  assert: (w) => w.openSec != null && w.openSec >= 0.7 && w.openSec <= 1.0 && /^PAID$/.test(w.textAtOpen || "") && w.hAfter === 0 &&
    w.replayGate.tiles > 0 && /^H+$/.test(w.replayGate.states[0] || "") && /^J+$/.test(w.replayGate.states[w.replayGate.states.length - 1] || "") && w.replayGate.endHasH === 0 && w.replayGate.coinWhileShut >= 15,
  ctrlOk: (c) => c.ok, ctrlName: "no coin: the post does not sign, gate stays shut" },

wise: { won: String.raw`
  return await attempt(i, async () => {
    await coinsAt([[3, 4]]);
    const printsBefore = prints.length;
    await leg(8, 4, { water: "allow" });
    const near = hunters[0], keep = { x: near.x, y: near.y, dir: near.dir, state: near.state, wp: near.wp };
    near.x = 11.5 * T; near.y = 2.5 * T; near.dir = Math.PI / 2; near.state = "watch"; near.target = { x: near.x, y: near.y }; near.watchDir = Math.PI / 2;
    await payPost([8, 4]);
    const lt = TS().lit, lit = lt ? lt.text : null, lk = (TS().looks || []).map(l => l.h), looks = lk.length, first = prints[0];
    const canSee = (h) => { const d = Math.hypot(h.x - lt.x, h.y - lt.y) || 1; return h.type !== "dog" && d <= visionOf(h) * T && losClear(h.x, h.y, lt.x + (h.x - lt.x) / d * T * 0.6, lt.y + (h.y - lt.y) / d * T * 0.6); };
    const seers = lt ? hunters.filter(canSee).length : -1, blind = lt ? hunters.filter(h => !canSee(h)) : [];
    const lookedNear = lk.indexOf(near) >= 0, blindLooked = blind.filter(h => lk.indexOf(h) >= 0).length;
    await chunk(0.3);
    const faced = lt ? Math.abs(Math.atan2(Math.sin(near.dir - Math.atan2(lt.y - near.y, lt.x - near.x)), Math.cos(near.dir - Math.atan2(lt.y - near.y, lt.x - near.x)))) < 0.2 : false;
    Object.assign(near, keep); near.path = []; near.pathKey = "";
    await chunk(0.2);
    await snap("lit");
    await coinsAt([[3, 9]]); const shutAtCoins = count("H") > 0;
    await wait(() => count("H") === 0, 35); await leg(9, 5); await leg(10, 5);
    await coinsAt([[14, 7], [14, 2], [25, 2], [24, 7]]);
    await leg(30, 9);
    await wait(() => game.phase !== "play", 10);
    return { lit, looks, seers, blind: blind.length, lookedNear, blindLooked, faced, hunters: hunters.length, printsAtSign: printsBefore, oldestKept: prints[0] === first && !!first, printsEnd: prints.length, shutAtCoins, phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, false); await coinsAt([[3, 4]]); await payPost([8, 4]);
  await wait(() => count("H") === 0, 35); await leg(10, 5); const h = hunters[0];
  for (let k = 0; k < 80 && game.phase === "play"; k++) await leg(Math.floor(h.x / T), Math.floor(h.y / T), { max: 1 });
  return { phase: game.phase, reason: game.loseReason, ok: game.phase === "caught" };`,
  assert: (w) => w.lit === "YOU → POST · 1 ZEC" && w.looks === w.seers && w.seers >= 1 && w.lookedNear && w.faced && w.blind >= 1 && w.blindLooked === 0 && w.oldestKept && w.printsEnd >= w.printsAtSign && w.shutAtCoins === false,
  ctrlOk: (c) => c.ok, ctrlName: "walk into the hunter = caught" },

bank: { won: String.raw`
  const intro = {}, IS = () => BH.bank.intro.state(), realWait = async (f, s) => { for (let k = 0; k < s * 10 && !f(); k++) await sleep(100); return !!f(); };
  start(i, false);
  const hk = hunters.find(q => q.type !== "dog"), h0 = { x: hk.x, y: hk.y, state: hk.state };
  intro.started = BH.bank.intro.start() && !!IS(); intro.phase0 = game.phase;
  intro.lostSeen = await realWait(() => (IS() || {}).beat === "lost", 10); intro.lost = IS();
  await snap("intro");
  intro.talkSeen = await realWait(() => BH.talk.isOpen(), 5); intro.talk = BH.talk._state() ? BH.talk._state().text : null;
  await realWait(() => { if (BH.talk.isOpen()) key("Enter", "Enter"); return !BH.talk.isOpen(); }, 4);
  intro.homeSeen = await realWait(() => (IS() || {}).beat === "home", 3); intro.home = IS();
  await sleep(300); key("x", "KeyX");
  intro.after = { state: IS(), phase: game.phase, cine: document.body.classList.contains("trail-cine"), hunterBack: hk.x === h0.x && hk.y === h0.y && hk.state === h0.state };
  R.intro = intro;
  return await attempt(i, async () => {
    await coinsAt([[3, 3], [6, 5], [3, 9], [12, 7], [15, 9]]);
    await leg(19, 6, { water: "avoid" });
    const before = prints.length;
    await leg(21, 6, { water: "allow", cross: true });
    const pl = planks(), hold = R.lastHold, lastPrintX = prints.length ? Math.floor(prints[prints.length - 1].x / T) : null;
    const inT = simTime, said = [], b0 = BH.talk.bubble;
    BH.talk.bubble = function (e, t) { said.push(t); return b0.apply(this, arguments); };
    let onPrints = 0, samples = 0;
    hook = () => { if ((TS().edge || {}).lost) return; const h = hunters.find(q => q.type !== "dog" && q.state === "follow"); if (!h) return; samples++; if (prints.some(p => Math.hypot(p.x - h.x, p.y - h.y) < T * 0.8)) onPrints++; };
    await leg(23, 7, { water: "only" });
    const lost = await wait(() => TS().edge && TS().edge.lost, 25);
    const e = TS().edge || {}, h = e.h, lostAfter = e.lost ? +(e.lost - inT).toFixed(1) : null, at0 = h ? { x: h.x, y: h.y } : null;
    await wait(() => said.some(t => /footprints stop/.test(t)), 10); await chunk(1.2); await snap("edge");
    const back = await wait(() => h && (h.state === "return" || h.state === "patrol"), 8), backAfter = e.lost ? +(simTime - e.lost).toFixed(1) : null;
    await chunk(2);
    const left = h && at0 ? +(Math.hypot(h.x - at0.x, h.y - at0.y) / T).toFixed(2) : null;
    hook = null; BH.talk.bubble = b0;
    await leg(25, 9, { water: "only" });
    await leg(27, 9, { water: "allow", cross: true });
    await wait(() => game.phase !== "play", 10);
    const w = { carryIn: hold && hold.ask, plank: pl, planksEnd: planks(), strings: stringsWhy(), lastPrintX, holds: R.holds, dogs: hunters.filter(q => q.type === "dog").length,
      edge: { lost: !!lost, lostAfter, state: h && h.state, back: !!back, backAfter, left, onPrints, samples, lines: said.filter(t => /footprints stop/.test(t)) } };
    const PK = [], rpA = window.__RP, P2 = CanvasRenderingContext2D.prototype, f2 = P2.fillText;
    const raf0 = window.requestAnimationFrame, shotAt = {}; let pauseMs = 0, holdT = null;
    window.requestAnimationFrame = (cb) => raf0.call(window, function loop(ts) {
      if (holdT != null && !window.__SNAPDONE) return raf0.call(window, loop);
      if (holdT != null) { pauseMs += performance.now() - holdT; holdT = null; window.__SNAP = null; }
      return cb(ts - pauseMs);
    });
    P2.fillText = function (t) {
      if (this.canvas && this.canvas.id === "ecMap" && window.__RP === rpA && /^\d+ ZEC$/.test(String(t))) {
        const c = String(this.fillStyle).toLowerCase(), tag = c === "#5fd07a" ? "replay-in" : "replay-out";
        PK.push([c, rpA.length]);
        if (!shotAt[tag] && holdT == null) { shotAt[tag] = rpA.length; holdT = performance.now(); window.__SNAPDONE = false; window.__SNAP = tag; }
      }
      return f2.apply(this, arguments);
    };
    w.phase = await finish();
    P2.fillText = f2; window.requestAnimationFrame = raf0;
    const cross = []; for (let k = 1; k < rpA.length; k++) if (rpA[k][2] !== rpA[k - 1][2]) cross.push([rpA[k][2] ? "in" : "out", k]);
    const first = (c) => { const q = PK.find(p => p[0] === c); return q ? q[1] : null; }, cIn = (cross.find(c => c[0] === "in") || [])[1], cOut = (cross.find(c => c[0] === "out") || [])[1];
    const kIn = first("#5fd07a"), kOut = first("#f0a040");
    w.intro = R.intro;
    w.sync = { frames: rpA.length, crossIn: cIn, crossOut: cOut, plankIn: kIn, plankOut: kOut, offIn: kIn != null && cIn != null ? kIn - cIn : null, offOut: kOut != null && cOut != null ? kOut - cOut : null };
    return w;
  });`,
  ctrl: String.raw`
  start(i, false); await coinsAt([[3, 3], [6, 5]]); await leg(19, 6, { water: "avoid" });
  autopilot = { targets: [], path: [[24.5 * T, 6.5 * T]] }; let tt = 0, touch = null, inAt = null;
  for (let k = 0; k < 180 && inAt == null && game.phase === "play"; k++) { step(STEP); tt += STEP; if (touch == null && player.x + T * 0.3 >= 20 * T) touch = tt; if (player.inShield) inAt = tt; }
  autopilot = null;
  const dt = touch != null && inAt != null ? Math.round((inAt - touch) * 1000) / 1000 : null;
  return { carry: player.carry, touchToIn: dt, planks: planks(), ok: dt != null && dt < 0.3 && JSON.stringify(planks()) === JSON.stringify(["IN · 2 ZEC"]) };`,
  assert: (w) => w.plank.length === 1 && w.plank[0] === "IN · 5 ZEC" && JSON.stringify(w.planksEnd) === JSON.stringify(["IN · 5 ZEC", "OUT · 5 ZEC"]) && w.strings.length === 0 && w.lastPrintX < 20 && w.dogs === 0 &&
    w.edge.lost && w.edge.back && w.edge.left > 0.5 && w.edge.samples > 10 && w.edge.onPrints / w.edge.samples >= 0.8 && w.edge.lines.length === 1 &&
    w.sync.crossIn > 0 && w.sync.crossOut > w.sync.crossIn && w.sync.offIn === 0 && w.sync.offOut === 0 &&
    w.intro.started && w.intro.phase0 === "talk" && w.intro.lostSeen && w.intro.lost.b.wet && w.intro.lost.h.state === "search" && w.intro.lost.steps > 5 &&
    w.intro.talkSeen && /river/.test(w.intro.talk || "") && w.intro.homeSeen && w.intro.after.state === null && w.intro.after.phase === "play" && !w.intro.after.cine && w.intro.after.hunterBack,
  ctrlOk: (c) => c.ok, ctrlName: "walk in with 2: in < 0.3 s, no stop, plank says IN · 2 ZEC" },

inriver: { won: String.raw`
  return await attempt(i, async () => {
    const goal = () => (document.getElementById("goal") || {}).textContent || "", goals = [], total0 = trailCoinTotal(), pine0 = TS().npcs.find(n => n.id === "pine");
    const p0 = { x: pine0.x, y: pine0.y }, rip00 = BH.river.info().ripples;
    hook = () => { const g = goal(); if (goals[goals.length - 1] !== g) goals.push(g); };
    const y00 = count("Y"), fenced = !bfsCore(tileOf()[0], tileOf()[1], 30, 6, (x, y) => solidP(tile(x, y))).reached;
    await wait(() => false, 2);
    const waited = +(Math.hypot(pine0.x - p0.x, pine0.y - p0.y) / T).toFixed(2);
    let talked = false;
    const rc = coins.findIndex(c => Math.floor(c.x / T) === 9 && Math.floor(c.y / T) === 5);
    hook = () => { const g = goal(); if (goals[goals.length - 1] !== g) goals.push(g); if (BH.talk.isOpen() && TS().done.pine) talked = true; };
    await leg(9, 6, { water: "only" });
    const gotPine = await wait(() => TS().done.pine, 15);
    const swam = waited;
    await wait(() => !BH.talk.isOpen(), 15); await chunk(0.4); await snap("pinecoin");
    const flying = (TS().gets || []).length;
    await wait(() => player.carry >= 2 && BH.notes.info().flights.length === 0, 4);
    const afterPine = { carry: player.carry, ready: BH.stamps.ready(), ripples: BH.river.info().ripples - rip00, riverCoin: rc >= 0 && !!coins[rc].got, notes: BH.notes.info().notes };
    await leg(9, 5, { water: "only" });
    const before = { phase: game.phase, stash: player.stash, carry: player.carry };
    const rip0 = BH.river.info().ripples, s0 = strings.length;
    await leg(18, 7, { water: "only" }); await chunk(0.3); await snap("slip");
    const jar0 = BH.jar.info();
    await payPost([21, 7]);
    const to = TS().pay && TS().pay.to, m = TS().npcs.find(n => n.id === "merchant");
    const changeBack = await wait(() => BH.notes.info().flights.some(f => f.kind === "out" && f.back && f.change), 3);
    const changeN = BH.notes.info().change;
    await chunk(0.25); await snap("change");
    await wait(() => BH.notes.info().flights.length === 0, 3);
    const afterPay = { carry: player.carry, notes: BH.notes.info().notes, change: changeN };
    await chunk(2); await snap("ripple");
    const pile = { before: jar0, after: BH.jar.info() }; await wait(() => count("Y") === 0, 10);
    const pay = { toMerchant: !!to && !!m && Math.hypot(to.x - m.x, to.y + 10 - m.y) < 1, ripples: BH.river.info().ripples - rip0, strings: strings.length - s0, planks: planks(), y: count("Y") + count("⇒") + count("◍"), changeBack, afterPay };
    await leg(28, 6, { water: "only" });
    await wait(() => player.carry === 0, 6);
    const hole = { stash: player.stash, carry: player.carry }, s1 = strings.length;
    await leg(30, 6, { water: "allow", cross: true });
    await wait(() => game.phase !== "play", 10);
    hole.linked = strings.length - s1;
    hook = null;
    return { gotPine, swam, talked, y00, fenced, flying, afterPine, before, pay, pile, hole, goals, total: [total0, trailCoinsGross()], phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, false); await leg(9, 6, { water: "only" }); await wait(() => TS().done.pine, 10); await wait(() => player.carry >= 2, 6);
  await leg(6, 3, { water: "only" }); await leg(6, 2, { water: "allow", cross: true });
  const pl = planks(), str = stringsWhy();
  await wait(() => false, 6);
  return { planks: pl, strings: str, phase: game.phase, reason: game.loseReason, ok: pl.some(t => /^OUT · [23] ZEC$/.test(t)) };`,
  assert: (w) => w.pile.before === null && w.pile.after === null && w.gotPine && w.swam < 0.05 && w.talked && w.y00 > 0 && w.fenced && w.flying >= 1 && w.afterPine.riverCoin && w.afterPine.carry === 3 && w.afterPine.ready === 3 && JSON.stringify(w.afterPine.notes) === "[1,2]" && w.afterPine.ripples >= 1 &&
    w.pay.changeBack && w.pay.afterPay.carry === 2 && JSON.stringify(w.pay.afterPay.notes) === "[1,1]" &&
    w.before.phase === "play" && w.before.stash === 0 && w.hole.stash >= 2 && w.hole.carry === 0 && w.hole.linked === 0 && w.pay.toMerchant && w.pay.ripples >= 1 && w.pay.strings === 0 && w.pay.planks.length === 0 && w.pay.y === 0 &&
    w.goals.some(g => /BUY THE GATE FROM THE MERCHANT$/.test(g)) && /GO TO THE DEN$/.test(w.goals[w.goals.length - 1]) && w.total[0] === 4 && w.total[1] === 4 && w.phase === "escaped",
  ctrlOk: (c) => c.ok, ctrlName: "climb onto a bank with Pine's 2" },

stayin: { won: String.raw`
  return await attempt(i, async () => {
    const goal = () => (document.getElementById("goal") || {}).textContent || "", total0 = window.trailCoinTotal();
    const said = [], b0 = BH.talk.bubble;
    BH.talk.bubble = function (e, t) { said.push([e && e.id, t]); return b0.apply(this, arguments); };
    await coinsAt([[3, 1], [3, 2], [3, 3], [3, 4], [3, 5]]);
    await leg(15, 4, { water: "avoid" }); await leg(17, 4, { water: "allow", cross: true });
    const goal0 = goal();
    await leg(19, 5, { water: "only" }); await chunk(1.5);
    const riverFirst = { ask: !!TS().payAsk, pay: !!TS().pay, carry: player.carry };
    await leg(25, 3, { water: "only" });
    const s0 = strings.length;
    await leg(26, 3, { water: "allow", cross: true }); await chunk(2);
    const out = { planks: planks(), strings: stringsWhy().slice(s0), rush: hunters.filter(h => h.state === "rush" && !h.decoy).length };
    await snap("climbout");
    await payPost([26, 3]);
    await leg(24, 3, { water: "allow", cross: true });
    await wait(() => TS().payStep === 1, 5);
    const goal1 = goal(), y0 = count("Y");
    await payPost([19, 5]);
    await wait(() => count("Y") < y0, 8);
    const goal2 = goal(), spent = window.trailSpent(), total1 = window.trailCoinTotal();
    await leg(21, 10, { water: "only" });
    await wait(() => player.carry === 0, 8);
    const hole = { stash: player.stash, carry: player.carry }, s1 = strings.length;
    await leg(26, 10, { water: "allow", cross: true });
    await wait(() => game.phase !== "play", 10);
    hole.linked = strings.length - s1;
    BH.talk.bubble = b0;
    return { goal0, goal1, goal2, riverFirst, out, hole, said: said.map(s => s[1]), planks: planks(), y0, y1: count("Y"), spent, total0, total1, phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, false); await coinsAt([[3, 1], [3, 2], [3, 3], [3, 4], [3, 5]]);
  await leg(15, 4, { water: "avoid" }); await leg(17, 4, { water: "allow", cross: true });
  const y0 = count("Y");
  await leg(19, 5, { water: "only" }); await chunk(2);
  for (let k = 0; k < 5; k++) { pressE(); await chunk(0.2); }
  const st = { ask: !!TS().payAsk, pay: !!TS().pay, carry: player.carry, y: count("Y"), y0, planks: planks() };
  return Object.assign(st, { ok: !st.ask && !st.pay && st.carry === 5 && st.y === y0 && st.planks.length === 1 });`,
  assert: (w) => !w.riverFirst.ask && !w.riverFirst.pay && w.riverFirst.carry === 5 && w.out.planks.indexOf("OUT · 5 ZEC") >= 0 && w.out.strings.some(s => /LINKED|amount/.test(s)) && w.out.rush >= 1
    && /stall/i.test(w.goal0) && /in the waters/i.test(w.goal1) && /den/i.test(w.goal2) && w.said.indexOf("First pay the merchant at his stall, on land.") >= 0
    && w.said.indexOf("Everyone on land saw that one. Pay me the next one in here and nobody will.") >= 0 && w.y0 > 0 && w.y1 === 0 && w.spent === 2 && w.total0 === 5 && w.total1 === 3 && w.end.links === 0 && w.hole.stash === 3 && w.hole.carry === 0 && w.hole.linked === 0,
  ctrlOk: (c) => c.ok, ctrlName: "the river merchant first: he does not sign, gate stays shut" },

anybox: { won: String.raw`
  return await attempt(i, async () => {
    const goal = () => (document.getElementById("goal") || {}).textContent || "";
    const said = [], b0 = BH.talk.bubble;
    BH.talk.bubble = function (e, t) { said.push(t); return b0.apply(this, arguments); };
    await coinsAt([[3, 2], [3, 4], [3, 6]]);
    await leg(14, 4, { water: "avoid" }); await leg(16, 4, { water: "allow", cross: true });
    const j0 = BH.jar.info(), s0 = strings.length, y0 = count("Y"), goal0 = goal();
    await payPost([23, 5]);
    await wait(() => BH.jar.info().pile.got && count("Y") < y0, 10);
    const j1 = BH.jar.info();
    const picked = await wait(() => BH.jar.info().tracker.mode === "pick", 15);
    await wait(() => BH.jar.info().shrug, 10); await chunk(0.8);
    await snap("shrug");
    const j2 = BH.jar.info(), goal1 = goal();
    await chunk(3);
    await leg(29, 9, { water: "only" });
    await wait(() => player.carry === 0, 8);
    const hole = { stash: player.stash, carry: player.carry }, s1 = strings.length;
    await leg(34, 9, { water: "allow", cross: true }); await leg(34, 10);
    await wait(() => game.phase !== "play", 10);
    hole.linked = strings.length - s1;
    BH.talk.bubble = b0;
    return { hole, coins: [j0.pile.coins, j1.pile.coins], picked, shrug: j2.shrug, near: Math.hypot(j2.tracker.x - (27.5 * T), j2.tracker.y - (3.5 * T)) / T, said,
      shelf: count("Z") + count("j"), strings: strings.length - s0, y0, y1: count("Y"), goal0, goal1, phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, false); await coinsAt([[3, 2], [3, 4], [3, 6]]);
  await leg(14, 4, { water: "avoid" }); await leg(16, 4, { water: "allow", cross: true }); await chunk(8);
  const j = BH.jar.info();
  return { mode: j.tracker.mode, shrug: j.shrug, coins: j.pile.coins, ok: j.tracker.mode === "walk" && !j.shrug && j.pile.coins === 8 };`,
  assert: (w) => w.coins[0] === 8 && w.coins[1] === 9 && w.picked && w.shrug && w.near < 1.5 && w.said.indexOf("Which one was yours? Could be any.") >= 0
    && w.shelf === 0 && w.strings === 0 && w.y0 > 0 && w.y1 === 0 && /den/i.test(w.goal1) && w.hole.stash >= 2 && w.hole.carry === 0 && w.hole.linked === 0,
  ctrlOk: (c) => c.ok, ctrlName: "no payment: the tracker never goes to the pile" },

piles: { won: String.raw`
  return await attempt(i, async () => {
    const fromA = await wallet([6, 3]);
    await leg(16, 4, { water: "avoid" }); await leg(18, 4, { water: "allow", cross: true });
    await leg(28, 5, { water: "only" }); await wait(() => player.carry === 0, 6);
    const den1 = { phase: game.phase, stash: player.stash, carry: player.carry };
    await leg(17, 8, { water: "only" }); await leg(16, 8, { water: "allow", cross: true });
    const p0 = prints.length;
    await leg(5, 9, { water: "avoid" });
    const emptyPrints = prints.length - p0;
    const fromB = await wallet([5, 9]);
    await leg(16, 8, { water: "avoid" }); await leg(18, 8, { water: "allow", cross: true });
    await chunk(0.5); await snap("twoIn");
    const pl = planks();
    await leg(28, 5, { water: "only" });
    await wait(() => player.carry === 0, 6);
    const hole = { stash: player.stash, carry: player.carry }, s1 = strings.length;
    await leg(32, 5, { water: "allow", cross: true });
    await wait(() => game.phase !== "play", 10);
    hole.linked = strings.length - s1;
    return { den1, hole, emptyPrints, fromA, fromB, wallets: BH.bank.machines(), planks: pl, strings: stringsWhy(), remarks: BH.bank.info().remarks, phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, true); await wallet([6, 3]); await wallet([6, 8]);
  await leg(16, 8, { water: "avoid" }); await leg(18, 8, { water: "allow", cross: true }); await chunk(1);
  return { planks: planks(), strings: stringsWhy(), ok: stringsWhy().filter(w => /SAME OWNER/.test(w)).length === 1 };`,
  assert: (w) => w.fromA && w.fromB && w.wallets.every(m => m.left === 0) && w.den1.phase === "play" && w.den1.stash === 3 && w.emptyPrints === 0 && w.planks.filter(t => /^IN/.test(t)).length === 2 && !w.planks.some(t => /^OUT/.test(t)) && w.strings.length === 0 && w.hole.stash >= 6 && w.hole.linked === 0,
  ctrlOk: (c) => c.ok, ctrlName: "both piles in one trip = SAME OWNER" },

glasskey: { won: String.raw`
  policy = ["Paste"];
  const lookAt = () => { const g0 = ghost; ghost = false; try { return canSee({ type: "hunter", x: player.x - 2 * T, y: player.y, dir: 0 }); } finally { ghost = g0; } };
  return await attempt(i, async () => {
    await coinsAt([[3, 3], [3, 9]]);
    await leg(7, 5, { water: "avoid" });
    const leaked = await wait(() => BH.scamkey.state().leaked, 12);
    await chunk(1.5); await snap("glasskey");
    await leg(15, 4, { water: "avoid" }); await leg(17, 4, { water: "allow", cross: true });
    await leg(18, 3, { water: "only" }); await wait(() => TS().done.pine, 10); await chunk(1);
    const seenInWater = player.inShield && lookAt();
    await payPost([21, 6]);
    await chunk(2);
    await leg(20, 10, { water: "only" });
    await wait(() => player.carry === 0, 8);
    const hole = { stash: player.stash, carry: player.carry }, s1 = strings.length;
    await leg(26, 10, { water: "allow", cross: true });
    await wait(() => game.phase !== "play", 10);
    hole.linked = strings.length - s1;
    return { leaked, seenInWater, hole, auditor: !!(L.npcs || []).find(n => n.id === "auditor"), gate: count("Y"), phase: await finish() };
  });`,
  ctrl: String.raw`
  policy = ["Walk away"]; start(i, true); await coinsAt([[3, 3], [3, 9]]);
  await leg(7, 5, { water: "avoid" }); await chunk(4);
  await leg(15, 4, { water: "avoid" }); await leg(17, 4, { water: "allow", cross: true }); await leg(18, 3, { water: "only" });
  const hidden = player.inShield && !canSee({ type: "hunter", x: player.x - 2 * T, y: player.y, dir: 0 });
  return { leaked: BH.scamkey.state().leaked, hidden, ok: !BH.scamkey.state().leaked && hidden };`,
  assert: (w) => w.leaked && w.seenInWater && !w.auditor && w.gate === 0 && w.hole.stash >= 3 && w.hole.carry === 0 && w.hole.linked === 0,
  ctrlOk: (c) => c.ok, ctrlName: "walk away from the stall: the key stays yours, the water still hides you" },

campfire: { won: String.raw`
  policy = ["Never"];
  return await attempt(i, async () => {
    await leg(8, 6, { water: "avoid" });
    await wait(() => BH.edge.info().kept, 15);
    const kept = BH.edge.info().kept;
    await leg(22, 6, { water: "avoid" }); await leg(24, 6, { water: "allow", cross: true });
    await leg(25, 4, { water: "only" }); await wait(() => TS().done.pine, 10);
    const payAt = [player.x, player.y];
    await chunk(1);
    await snap("board");
    const board = BH.edge.board(), flicks = BH.edge.info().flicks;
    await leg(26, 9, { water: "only" });
    await wait(() => player.carry === 0, 8);
    const hole = { stash: player.stash, carry: player.carry }, s1 = strings.length;
    await leg(28, 9, { water: "allow", cross: true });
    const TW = [], A = CanvasRenderingContext2D.prototype, ft = A.fillText, rg = A.createRadialGradient, onMap = (c) => c && c.canvas && c.canvas.id === "ecMap";
    A.fillText = function (t) { if (onMap(this) && /\?\?\? +PAID$/.test(String(t))) TW.push(["row", player.x, player.y, performance.now()]); return ft.apply(this, arguments); };
    A.createRadialGradient = function (x, y) { if (onMap(this)) TW.push(["glow", x, y, performance.now()]); return rg.apply(this, arguments); };
    await wait(() => game.phase !== "play", 10);
    hole.linked = strings.length - s1;
    let phase;
    try { phase = await finish(); } finally { A.fillText = ft; A.createRadialGradient = rg; }
    const r0 = TW.find((e) => e[0] === "row"), dist = (e) => e ? +(Math.hypot(e[1] - payAt[0], e[2] - payAt[1]) / T).toFixed(2) : null;
    const g0 = r0 && TW.filter((e) => e[0] === "glow" && Math.abs(e[3] - r0[3]) < 300).sort((a, b) => dist(a) - dist(b))[0];
    const tw = { rowDist: dist(r0), glowDist: dist(g0), framesBefore: r0 ? __RP.filter((f) => f[3] < r0[3] - 1).length : null, rows: TW.filter((e) => e[0] === "row").length };
    return { hole, kept, board, flicks, planks: planks(), tw, phase };
  });`,
  ctrl: String.raw`
  policy = ["Read him"]; start(i, false);
  await leg(8, 6, { water: "avoid" }); await wait(() => game.phase !== "play", 20);
  return { phase: game.phase, reason: game.loseReason, carry: player.carry, ok: game.loseReason === "trail:robbed" && player.carry === 0 };`,
  assert: (w) => w.kept && w.board.length === 1 && w.board[0] === "???   ???   ???   PAID" && w.flicks >= 1 && w.tw && w.tw.framesBefore >= 5 && w.tw.rowDist < 2 && w.tw.glowDist < 2 && w.hole.stash >= 4 && w.hole.carry === 0 && w.hole.linked === 0,
  ctrlOk: (c) => c.ok, ctrlName: "tell the words = ROBBED" },

together: { won: String.raw`
  policy = ["Never"];
  return await attempt(i, async () => {
    const fromA = await wallet([6, 3]);
    await leg(18, 3, { water: "avoid" }); await leg(20, 3, { water: "allow", cross: true });
    const y0 = count("Y");
    await payPost([28, 4]);
    await wait(() => count("Y") < y0, 8);
    await leg(31, 9, { water: "only" }); await wait(() => player.carry === 0, 6);
    const den1 = { phase: game.phase, stash: player.stash };
    await leg(19, 6, { water: "only" }); await leg(18, 6, { water: "allow", cross: true });
    const p0 = prints.length;
    await leg(5, 8, { water: "avoid" });
    const emptyPrints = prints.length - p0;
    const fromB = await wallet([5, 8]);
    await leg(18, 6, { water: "avoid" }); await leg(20, 6, { water: "allow", cross: true });
    await chunk(0.5); await snap("together");
    const red = [...TXT].filter(t => /^RED LINES/.test(t));
    await leg(31, 9, { water: "only" });
    await wait(() => player.carry === 0, 6);
    const hole = { stash: player.stash, carry: player.carry }, s1 = strings.length;
    await leg(34, 9, { water: "allow", cross: true });
    await wait(() => game.phase !== "play", 10);
    hole.linked = strings.length - s1;
    return { hole, y0, den1, emptyPrints, fromA, fromB, wallets: BH.bank.machines(), planks: planks(), strings: stringsWhy(), red, kept: BH.edge.info() && BH.edge.info().kept, phase: await finish(), ending: (document.body.innerText.match(/You paid privately[^\n]*|You made it\.[^\n]*/) || [null])[0] };
  });`,
  ctrl: String.raw`
  policy = ["Never"]; start(i, true); await wallet([6, 3]); await wallet([5, 8]);
  await leg(18, 6, { water: "avoid" }); await leg(20, 6, { water: "allow", cross: true });
  const a = stringsWhy().length;
  await leg(19, 6, { water: "only" }); await leg(18, 6, { water: "allow", cross: true }); await chunk(0.5);
  const b = stringsWhy().length;
  await leg(20, 6, { water: "allow", cross: true }); await leg(18, 6, { water: "allow", cross: true }); await chunk(1);
  return { afterTwoPiles: a, afterOut: b, strings: stringsWhy(), planks: planks(), phase: game.phase, reason: game.loseReason, ok: game.loseReason === "trail:found" };`,
  assert: (w) => w.fromA && w.fromB && w.wallets.every(m => m.left === 0) && w.den1.phase === "play" && w.den1.stash === 2 && w.emptyPrints === 0 && w.strings.length === 0 && w.red.indexOf("RED LINES 0/3") >= 0 && w.planks.filter(t => /^IN/.test(t)).length === 2 && w.hole.stash >= 3 && w.hole.carry === 0 && w.hole.linked === 0,
  ctrlOk: (c) => c.ok, ctrlName: "two piles + out + out = 3 red lines = FOUND" },

doors: { won: String.raw`
  const asked = () => BH.bank.machines().some(m => m.ask);
  const pile = async (stand, one) => {
    const c0 = player.carry; await leg(stand[0], stand[1], { water: "avoid" });
    if (!(await wait(asked, 3))) return false;
    if (one) { await chunk(0.2); await snap("take"); await chunk(1.2); if (player.carry !== c0) return false; pressE(); if (!(await wait(() => player.carry === c0 + 1, 3))) return false; await wait(asked, 2); }
    key("q", "KeyQ"); return await wait(() => player.carry >= c0 + 2, 6);
  };
  return await attempt(i, async () => {
    const fromA = await pile([6, 3], true);
    await leg(16, 4, { water: "avoid" }); await leg(18, 4, { water: "allow", cross: true });
    await leg(27, 4, { water: "only" }); await wait(() => player.carry === 0 && player.stash >= 2, 6);
    const den1 = { phase: game.phase, stash: player.stash, carry: player.carry };
    await leg(17, 8, { water: "only" }); await leg(16, 8, { water: "allow", cross: true });
    const p0 = prints.length;
    await leg(6, 8, { water: "avoid" });
    const emptyPrints = prints.length - p0;
    const fromB = await pile([6, 8]);
    await leg(16, 8, { water: "avoid" }); await leg(18, 8, { water: "allow", cross: true });
    await chunk(0.5);
    const pl = planks();
    await leg(25, 9, { water: "only" });
    await leg(25, 2, { water: "only" }); await chunk(0.3); await snap("doors");
    await wait(() => BH.doors.info().landed === 2, 5);
    const d = BH.doors.info();
    await leg(24, 4, { water: "only" }); await leg(27, 6, { water: "only" });
    await wait(() => game.phase !== "play", 10);
    return { den1, emptyPrints, fromA, fromB, d, wallets: BH.bank.machines(), planks: pl, strings: stringsWhy(), phase: await finish() };
  });`,
  ctrl: String.raw`
  const pile = async (stand) => { const c0 = player.carry; await leg(stand[0], stand[1], { water: "avoid" }); await wait(() => BH.bank.machines().some(m => m.ask), 3); key("q", "KeyQ"); return await wait(() => player.carry >= c0 + 2, 6); };
  start(i, true); await pile([6, 3]); await pile([6, 8]);
  await leg(16, 8, { water: "avoid" }); await leg(18, 8, { water: "allow", cross: true }); await chunk(1);
  const owner = stringsWhy().filter(w => /SAME OWNER/.test(w)).length;
  await leg(25, 9, { water: "only" }); await leg(25, 2, { water: "only" }); await chunk(1);
  const d = BH.doors.info();
  return { owner, d, strings: stringsWhy(), ok: owner === 1 && d.paid.length === 2 && stringsWhy().indexOf("SAME DOOR") < 0 };`,
  assert: (w) => w.fromA && w.fromB && w.wallets.every(m => m.left === 0) && w.den1.phase === "play" && w.den1.stash === 2 && w.emptyPrints === 0 && w.planks.filter(t => /^IN/.test(t)).length === 2 && !w.planks.some(t => /^OUT/.test(t)) &&
    w.d.landed === 2 && w.d.paid.length === 2 && w.strings.length === 0 && w.end.stash >= 6,
  ctrlOk: (c) => c.ok, ctrlName: "both piles in one trip = SAME OWNER, then both payers pay, no link in the river" },

mail: { won: String.raw`
  return await attempt(i, async () => {
    await leg(10, 2, { water: "avoid" });
    const handed = await wait(() => BH.mail.state().handed, 3);
    await chunk(1);
    for (const [x, y] of [[12, 2], [15, 1], [18, 3], [16, 4], [13, 5], [19, 6], [18, 10], [15, 10], [12, 10]]) {
      await leg(x, y, { water: "allow" });
      const e = BH.mail.state().envelopes.find(q => q.tx === x && q.ty === y);
      await wait(() => { const q = BH.mail.state().envelopes[e.id]; return q.checked && (!q.mine || q.got); }, 3);
      if (x === 18 && y === 3) { await chunk(0.3); await snap("mail"); }
    }
    const st = BH.mail.state();
    const memos = st.envelopes.filter(q => q.opened).map(q => q.memo), drawn = memos.filter(m => m && TXT.has(m)).length;
    await leg(22, 10, { water: "allow" });
    await wait(() => game.phase !== "play", 10);
    return { handed, st: { total: st.total, checked: st.checked, mine: st.mine, got: st.got, read: st.read }, memos, drawn, memoLabel: TXT.has("MEMO"), phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, false); await leg(9, 9, { water: "avoid" }); await leg(18, 3, { water: "allow" }); await chunk(1.5);
  const st = BH.mail.state();
  return { handed: st.handed, checked: st.checked, carry: player.carry, ok: !st.handed && st.checked === 0 && player.carry === 0 };`,
  assert: (w) => w.handed && w.st.total === 9 && w.st.checked === 9 && w.st.mine === 3 && w.st.got === 3 && w.st.read === 3 && w.drawn === 3 && w.memoLabel && w.end.carry + w.end.stash >= 3,
  ctrlOk: (c) => c.ok, ctrlName: "skip the post office: no envelopes, no coins" },

dam: { won: String.raw`
  return await attempt(i, async () => {
    const carry0 = player.carry;
    await leg(10, 7, { water: "allow" }); await leg(12, 7, { water: "only" });
    const crossed = BH.dam.info().crossed;
    await chunk(0.3); await snap("dam");
    await leg(25, 7, { water: "only" }); await wait(() => player.carry === 0, 4);
    const den1 = { phase: game.phase, stash: player.stash };
    await leg(15, 2, { water: "only" }); await leg(14, 2, { water: "allow", cross: true });
    await leg(12, 2, { water: "avoid" });
    await leg(14, 2, { water: "avoid" }); await leg(15, 2, { water: "allow", cross: true });
    await leg(25, 7, { water: "only" }); await wait(() => player.carry === 0, 4);
    await chunk(0.3); await snap("den"); await leg(27, 7, { water: "allow", cross: true });
    await wait(() => game.phase !== "play", 10);
    return { carry0, crossed, den1, dam: BH.dam.info(), strings: stringsWhy(), phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, false); await leg(10, 7, { water: "allow" }); await leg(12, 7, { water: "only" });
  autopilot = { targets: [], path: [[8.5 * T, 7.5 * T]] }; await chunk(2); autopilot = null;
  const d = BH.dam.info(), t = tileOf();
  return { d, tile: t, ok: d.bumps >= 1 && t[0] >= 11 };`,
  assert: (w) => w.carry0 === 3 && w.crossed === 3 && w.den1.phase === "play" && w.den1.stash === 3 && w.end.carry + w.end.stash >= 4 && w.strings.length === 0,
  ctrlOk: (c) => c.ok, ctrlName: "swim back into the old river = SEALED" },

bonus1: { won: String.raw`
  return await attempt(i, async () => {
    await coinsAt([[2, 1], [6, 3], [9, 6], [2, 7]]);
    await leg(14, 4, { water: "avoid" }); await leg(16, 4, { water: "allow", cross: true });
    await wait(() => BH.bonus.info().dust === 5, 4);
    const dust = BH.bonus.info().dust;
    await leg(17, 2, { water: "only" });
    await wait(() => { if (BH.bonus.info().asking === "SET DUST ASIDE" && !BH.talk.isOpen()) pressE(); return BH.bonus.info().aside === 5; }, 5);
    await chunk(0.2); await snap("aside");
    await leg(18, 3, { water: "only" });
    await wait(() => { if (BH.bonus.info().asking === "PAY 1 ZEC" && !BH.talk.isOpen()) pressE(); return BH.bonus.info().paid; }, 5);
    const b = BH.bonus.info(), y0 = count("Y");
    await wait(() => count("Y") === 0, 6);
    await leg(21, 9, { water: "only" }); await leg(22, 9, { water: "only" });
    await wait(() => game.phase !== "play", 10);
    return { dust, b: { aside: b.aside, dust: b.dust, paid: b.paid, dirty: b.dirty }, y0, y1: count("Y"), phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, true); await coinsAt([[2, 1], [6, 3], [9, 6], [2, 7]]);
  await leg(14, 4, { water: "avoid" }); await leg(16, 4, { water: "allow", cross: true });
  await wait(() => BH.bonus.info().dust === 5, 4);
  await leg(18, 3, { water: "only" });
  await wait(() => { if (BH.bonus.info().asking === "PAY 1 ZEC" && !BH.talk.isOpen()) pressE(); return BH.bonus.info().paid; }, 5);
  await wait(() => game.phase !== "play", 3);
  const b = BH.bonus.info();
  return { dirty: b.dirty, phase: game.phase, reason: game.loseReason, ok: b.dirty && game.phase === "caught" && /dust/.test(String(game.loseReason)) };`,
  assert: (w) => w.dust === 5 && w.b.aside === 5 && w.b.dust === 0 && w.b.paid && !w.b.dirty && w.y1 === 0 && w.end.carry + w.end.stash >= 3,
  ctrlOk: (c) => c.ok, ctrlName: "pay with the dust still held = DUST SPENT TOO, caught" },

bonus2: { won: String.raw`
  return await attempt(i, async () => {
    const B = L.bonus, gateY = () => grid.filter(r => r[B.gateCol] === "Y").length, denY = () => count("Y") - gateY();
    const carry0 = player.carry, gate0 = gateY(), den0 = denY();
    await leg(13, 6, { water: "only" }); await leg(15, 6, { water: "allow", cross: true });
    await leg(B.spot[0], B.spot[1], { water: "avoid" });
    await wait(() => { if (BH.bonus.info().asking === "PAY THE EXCHANGE 1 ZEC" && !BH.talk.isOpen()) pressE(); return BH.bonus.info().paid; }, 5);
    await chunk(0.3); await snap("exchange");
    const b = BH.bonus.info(), gate1 = gateY(), denAfterDesk = denY(), carryAfterDesk = player.carry;
    await leg(30, 11, { water: "allow", cross: true });
    const paid = await payPost([B.post[0], B.post[1] - 1]);
    const signT = simTime; let openSec = null;
    await wait(() => { if (openSec == null && denY() === 0) openSec = +(simTime - signT).toFixed(2); return openSec != null; }, 4);
    await leg(31, 1, { water: "allow", cross: true });
    await chunk(0.3); await snap("den"); await leg(dens.tx, dens.ty, { water: "allow", cross: true });
    await wait(() => game.phase !== "play", 10);
    return { carry0, gate0, den0, b: { paid: b.paid, bounces: b.bounces, out: b.out }, gate1, denAfterDesk, carryAfterDesk, paid, openSec, phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, true); const B = L.bonus, den0 = count("Y");
  await leg(13, 6, { water: "only" }); await leg(15, 6, { water: "allow", cross: true });
  await leg(B.post[0], B.post[1] - 1, { water: "allow" }); await chunk(2);
  const b = BH.bonus.info();
  return { paid: b.paid, payAsk: !!TS().payAsk, pay: !!TS().pay, y0: den0, y: count("Y"), carry: player.carry, at: tileOf(),
    ok: !b.paid && !TS().payAsk && !TS().pay && count("Y") === den0 && player.carry === 3 && tileOf()[0] === B.post[0] };`,
  assert: (w) => w.carry0 === 3 && w.gate0 > 0 && w.den0 > 0 && w.b.paid && w.b.bounces === 0 && w.b.out && w.gate1 === 0 && w.denAfterDesk === w.den0 && w.carryAfterDesk === 2
    && w.paid && w.openSec != null && w.openSec <= 2.5 && w.end.carry + w.end.stash >= 3,
  ctrlOk: (c) => c.ok, ctrlName: "reach the merchant before paying the exchange = no payment, den gates stay shut" },

bonus3: { won: String.raw`
  return await attempt(i, async () => {
    await leg(7, 7, { water: "avoid" });
    await wait(() => BH.mail.state().handed, 3); await chunk(0.8);
    const shown = BH.mail.state().total;
    const get = async (x, y) => { await leg(x, y, { water: "avoid" }); const e = BH.mail.state().envelopes.find(q => q.tx === x && q.ty === y); await wait(() => BH.mail.state().envelopes[e.id].got, 3); };
    await get(24, 6); await get(21, 10);
    await leg(44, 5, { water: "avoid" });
    await wait(() => { if (BH.bonus.info().asking === "CHECK AT MY ZEBRA NODE" && !BH.talk.isOpen()) pressE(); return BH.bonus.info().checked; }, 5);
    await chunk(0.6); await snap("tower");
    const after = BH.mail.state().total;
    await get(47, 13);
    const st = BH.mail.state();
    await leg(3, 13, { water: "avoid" }); await chunk(0.3); await snap("den"); await leg(2, 13, { water: "avoid" });
    await wait(() => game.phase !== "play", 10);
    return { shown, after, st: { got: st.got, missing: st.missing, mine: st.mine }, phase: await finish() };
  });`,
  ctrl: String.raw`
  start(i, true); await leg(7, 7, { water: "avoid" }); await wait(() => BH.mail.state().handed, 3); await chunk(0.8);
  for (const [x, y] of [[23, 3], [24, 6], [21, 10]]) { await leg(x, y, { water: "avoid" }); await chunk(1); }
  await leg(2, 13, { water: "avoid" }); await chunk(1.5);
  const st = BH.mail.state();
  return { phase: game.phase, banked: player.carry + player.stash, missing: st.missing, ok: game.phase === "play" && player.carry + player.stash === 2 && st.missing === 2 };`,
  assert: (w) => w.shown === 6 && w.after === 6 && w.st.got >= 3 && w.st.missing === 0 && w.end.carry + w.end.stash >= 3,
  ctrlOk: (c) => c.ok, ctrlName: "trust the post office: a fake and 2 real coins, the den stays shut" }
};

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
  for (let i = 0; i < 3600; i++) {
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
  throw new Error("lock busy for 30 minutes");
}
function unlock() { if (beat) clearInterval(beat); if (owned) { owned = false; try { fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} } }

async function main() {
  await lock();
  fs.mkdirSync(SHOTS, { recursive: true });
  let chrome, ws, rows = [];
  try {
    fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    chrome = spawn(CHROME, ["--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check", "--window-size=1280,800", "about:blank"], { stdio: "ignore" });
    let ver = null;
    for (let i = 0; i < 100 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(150); } }
    if (!ver) throw new Error("chrome did not start");
    const tab = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page");
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 1; const pending = new Map();
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, timeout: 280000 }); if (r.exceptionDetails) return { __ex: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text }; return r.result.value; };
    await send("Page.enable"); await send("Runtime.enable");
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
    const nav = async () => {
      await send("Page.navigate", { url: BASE + "index.html?unlock" });
      for (let k = 0; k < 100; k++) { await sleep(100); const r = await ev("document.readyState"); if (r === "complete") break; }
      await ev(AUTOPILOT);
    };
    const levels = ONLY.length ? ONLY : TIDS.map((t, i) => i);
    for (const i of levels) {
      const L = LV[TIDS[i]], row = { i, tid: TIDS[i] };
      if (!L) { console.log(JSON.stringify({ level: i, tid: TIDS[i], skipped: "no replay entry yet (stub level)" })); continue; }
      const runWon = async (force) => {
        await nav(); let shot = null, replayShot = null;
        const p = ev(`(async () => { const i = ${i}; window.__forceGhost = ${force};\n${LIB}\ntry { const w = await (async () => {${L.won}})(); return { w, R: window.__R }; } catch (e) { return { ex: String(e && e.stack || e), R: window.__R }; } })()`);
        let done = false, out = null; p.then((v) => { done = true; out = v; });
        while (!done) {
          await sleep(150);
          const s = await ev("window.__SNAP && !window.__SNAPDONE ? window.__SNAP : null");
          if (s) {
            const img = await send("Page.captureScreenshot", { format: "png" });
            const f = path.join(SHOTS, `level-${String(i).padStart(2, "0")}-${s}.png`);
            fs.writeFileSync(f, Buffer.from(img.data, "base64"));
            shot = shot ? [].concat(shot, f) : f;
            await ev("window.__SNAPDONE = true");
          }
          const rs = await ev("window.__RPSHOT && !window.__RPSHOTDONE ? window.__RPSHOT : null");
          if (rs) {
            const img = await send("Page.captureScreenshot", { format: "png" });
            const f = path.join(SHOTS, `level-${String(i).padStart(2, "0")}-replay-water.png`);
            fs.writeFileSync(f, Buffer.from(img.data, "base64"));
            await ev("window.__RPSHOTDONE = true");
            replayShot = { file: f, at: rs };
          }
        }
        return { out, shot, replayShot, tx: await ev("[...(window.__TXT || [])]"), errors: (await ev("window.__TD.errors")) || [] };
      };
      let rw = await runWon(false);
      row.won = rw.out; row.shot = rw.shot; row.replayShot = rw.replayShot; let tx1 = rw.tx; row.errorsWon = rw.errors;
      if (row.won && row.won.R && row.won.R.ghost) { const g = await runWon(true); row.shot = g.shot; row.replayShot = g.replayShot || row.replayShot; tx1 = (tx1 || []).concat(g.tx || []); row.errorsWon = row.errorsWon.concat(g.errors); row.ghostRerun = g.out && g.out.w && g.out.w.phase; }
      await nav();
      row.ctrl = await ev(`(async () => { const i = ${i};\n${LIB}\ntry { const c = await (async () => {${L.ctrl}})(); return { c, R: window.__R }; } catch (e) { return { ex: String(e && e.stack || e), R: window.__R }; } })()`);
      row.errorsCtrl = (await ev("window.__TD.errors")) || [];
      const tx2 = await ev("[...(window.__TXT || [])]");
      const allTx = [...new Set([].concat(tx1 || [], tx2 || []))];
      row.timeText = allTx.filter((t) => /\d\s*(secs?|seconds?|mins?|minutes?)\b/i.test(t));
      row.stampText = allTx.filter((t) => /stamp/i.test(t));
      row.lockText = allTx.filter((t) => t !== "UNLOCKED" && /unlock|\bblocks?\b|WAITING|DESHIELD|\bSHIELD \d+ ZEC/i.test(t));
      row.edgeBlock = allTx.filter((t) => /\?\?\? +PAID$/.test(t)).length;
      rows.push(row);
      const w = (row.won && row.won.w) || {}, c = (row.ctrl && row.ctrl.c) || {};
      row.result = { won: w.phase === "escaped", ghost: !!(row.won && row.won.R && row.won.R.ghost), errors: row.errorsWon.length + row.errorsCtrl.length,
        assertion: (() => { try { return !!L.assert(w); } catch (e) { return false; } })(), control: (() => { try { return !!L.ctrlOk(c); } catch (e) { return false; } })() };
      console.log(JSON.stringify({ level: i, result: row.result, won: row.won, ctrl: row.ctrl, errors: [].concat(row.errorsWon, row.errorsCtrl).slice(0, 6), timeText: row.timeText, stampText: row.stampText, lockText: row.lockText, edgeBlock: row.edgeBlock, shot: row.shot, replayShot: row.replayShot }));
    }
    try { await send("Browser.close"); } catch {}
  } finally {
    try { ws && ws.close(); } catch {}
    if (chrome) { await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once("exit", r); setTimeout(r, 5000); }); try { chrome.kill(); } catch {} }
    await sleep(300);
    try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 }); } catch {}
    unlock();
  }
  console.log("\nlevel | won          | errors | assertion | control | frozen/talk samples | sec/min text | stamp text");
  let bad = 0;
  for (const r of rows) {
    const x = r.result, t = (r.won && r.won.R && r.won.R.talk) || {}, tc = (r.ctrl && r.ctrl.R && r.ctrl.R.talk) || {};
    const rp = (r.won && r.won.R && r.won.R.replay) || {}, st = r.won && r.won.R && r.won.R.stored,
      rpOk = !!(rp.noMap || rp.frames > 0);
    const ok = rpOk && x.won && !x.ghost && x.errors === 0 && x.assertion && x.control && !r.timeText.length && !r.stampText.length && !r.lockText.length && !(t.frozen || tc.frozen || t.phaseTalk || tc.phaseTalk);
    if (!ok) bad++;
    console.log(`${String(r.i).padStart(5)} | ${(x.won ? "yes" : "NO") + (x.ghost ? " (ghost=FAIL)" : "")}`.padEnd(27) + ` | ${String(x.errors).padStart(6)} | ${x.assertion ? "PASS     " : "FAIL     "} | ${x.control ? "PASS   " : "FAIL   "} | ${(t.frozen || 0) + (tc.frozen || 0) + (t.phaseTalk || 0) + (tc.phaseTalk || 0)}/${(t.samples || 0) + (tc.samples || 0)} box, ${(t.steps || 0) + (tc.steps || 0)} steps`.padEnd(20) + ` | ${r.timeText.length} | stamp ${r.stampText.length} | unlock/block ${r.lockText.length}${r.lockText.length ? " " + JSON.stringify(r.lockText.slice(0, 3)) : ""} | replay ${rpOk ? "PASS" : "FAIL"} path ${rp.share} (water ${rp.wetShare}, ${rp.wet} of ${rp.pathN}) start ${rp.startTiles} end ${rp.endTiles} tiles${rp.noMap ? " (no end map on this level)" : ""}${st ? ` | stored card path ${st.share} end ${st.endTiles}` : ""}`);
  }
  console.log(bad ? `${bad} LEVEL(S) NOT GREEN of ${rows.length}` : `ALL ${rows.length} LEVELS GREEN`);
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e.stack || e); unlock(); process.exit(2); });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { unlock(); process.exit(130); });
