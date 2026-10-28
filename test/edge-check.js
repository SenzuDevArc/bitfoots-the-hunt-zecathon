"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");
const SHOT = process.argv[2] || "";

const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.edge && BH.river && typeof loadLevel === "function" && typeof bake !== "undefined"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const out = {};
const MAP = [
  "######################",
  "#P.................~~#",
  "#..................~~#",
  "#..................~~#",
  "#..................~~#",
  "######################"];
let fx = 0;
save.trail = save.trail || {}; save.trail.wallets = 1;
const TS = () => activeFeatures.find(f => f.id === "trail").api.state;
const npcOf = (id) => TS().npcs.find(n => n.id === id);
function run(sec, each) { for (let i = 0, n = Math.round(sec / STEP); i < n; i++) { step(STEP); if (each) each(i); } }
function runR(sec) { run(sec, () => render()); }
async function fixture(npcs) {
  const lv = { title: "EDGE FIXTURE " + fx, tid: "edgefix", act: 0, par: 999, need: 99, map: MAP, features: ["stamps", "river", "edge", "trail"],
    hunters: [], elders: [], npcs: npcs, copy: { goal: "t", lesson: "t", dev: "t" } };
  fx++;
  Object.keys(keys).forEach(k => { keys[k] = false; });
  LEVELS.push(lv);
  loadLevel(LEVELS.length - 1, false);
  ghost = true; autopilot = null;
  TS().tourPending = false; TS().cinePending = false;
  BH.talk.reset();
  runR(1);
  cur = { grid, title: L.title };
  return lv;
}
let cur = null, answered = null;
const same = () => grid === cur.grid && L.title === cur.title;
function at(x, y) { player.x = (x + 0.5) * T; player.y = (y + 0.5) * T; }
function drawn(fn) {
  const got = [], P = CanvasRenderingContext2D.prototype, f0 = P.fillText, s0 = P.strokeText;
  P.fillText = function (t) { got.push(String(t)); return f0.apply(this, arguments); };
  P.strokeText = function (t) { got.push(String(t)); return s0.apply(this, arguments); };
  try { fn(); } finally { P.fillText = f0; P.strokeText = s0; }
  return got;
}
function glows(fn) {
  let n = 0; const P = CanvasRenderingContext2D.prototype, g0 = P.createRadialGradient;
  P.createRadialGradient = function () { n++; return g0.apply(this, arguments); };
  try { fn(); } finally { P.createRadialGradient = g0; }
  return n;
}
function edgeDraw() { ctx.save(); BH.features.get("edge").onDrawWorld(ctx); BH.edge.drawBoard(ctx); ctx.restore(); }
function layerOrder() {
  const P = CanvasRenderingContext2D.prototype, f0 = P.fillText, d0 = P.drawImage;
  let before = 0, after = 0, behindAfter = 0, seen = false, playerOver = null;
  const sp = BH.edge.spot(), fy = sp.fy, dp = window.drawPlayer;
  window.drawPlayer = function () { playerOver = seen; return dp.apply(this, arguments); };
  P.fillText = function (t) { if (/\?\?\? +PAID$/.test(String(t))) seen = true; return f0.apply(this, arguments); };
  P.drawImage = function (img, x, y) { if (img && img.height >= 80 && img.width <= 80) { if (seen) { after++; const cx = x + img.width / 2; if (y + img.height <= fy && cx > sp.x0 - 27 && cx < sp.x1 + 27) behindAfter++; } else before++; } return d0.apply(this, arguments); };
  try { render(); } finally { P.fillText = f0; P.drawImage = d0; window.drawPlayer = dp; }
  return { seen, before, after, behindAfter, fy, playerOver };
}
async function answer(key) {
  const tap = (k) => { dispatchEvent(new KeyboardEvent("keydown", { key: k })); dispatchEvent(new KeyboardEvent("keyup", { key: k })); };
  for (let i = 0; i < 40 && BH.talk.isOpen() && !(BH.talk._state() && BH.talk._state().choices); i++) { tap(" "); await sleep(100); }
  const st = BH.talk._state();
  if (!(st && st.choices)) return false;
  answered = st.choices.slice();
  await sleep(450);
  tap(key);
  await sleep(50);
  return true;
}
const dist = (h) => Math.hypot(player.x - h.x, player.y - h.y) / T;
const onW = (e) => isWater(tileAt(e.x, e.y));

await fixture([{ id: "edge", at: [10, 1] }]);
out.attached = activeFeatures.map(f => f.id);
out.f1 = { phase: game.phase, tour: !!TS().tour, screen: game.screen, edge: !!npcOf("edge") };
at(6, 3);
run(5);
const f0 = BH.edge.info().flicks, sNow = BH.stamps && typeof BH.stamps.count === "function" ? BH.stamps.count() : null;
BH.river.pay({ id: "pine", x: 18.5 * T, y: 2.5 * T }, 7, "PINE");
run(0.1); render();
const boardText = drawn(edgeDraw), glowOn = glows(edgeDraw);
out.board = { rows: BH.edge.board(), drawn: boardText, flicks: BH.edge.info().flicks - f0, stampNow: sNow, glowOn };
run(1.5);
out.board.glowAfter = glows(edgeDraw);
BH.river.spent(18.5 * T, 3.5 * T, 2);
run(0.1);
out.board.afterSpent = { rows: BH.edge.board().length, flicks: BH.edge.info().flicks - f0 };
run(7.5);
const sNow2 = BH.stamps && typeof BH.stamps.count === "function" ? BH.stamps.count() : null;
BH.river.pay({ id: "pine", x: 18.5 * T, y: 2.5 * T }, 1, "PINE");
run(0.1); render();
out.board.second = BH.edge.board(); out.board.stampNow2 = sNow2;
out.board.drawn2 = drawn(edgeDraw);
out.board.same = same();
out.board.layer = layerOrder();
{ const s = BH.edge.spot(), keep = [player.x, player.y];
  player.x = s.x0 + 18; player.y = s.fy + 12; out.board.front = layerOrder();
  player.y = s.fy - 24; out.board.behind = layerOrder();
  player.x = keep[0]; player.y = keep[1]; }

await fixture([]);
BH.river.pay({ id: "pine", x: 18.5 * T, y: 2.5 * T }, 1, "PINE");
run(0.2);
out.noWatcher = { rows: BH.edge.board().length, flicks: BH.edge.info().flicks, drawn: drawn(edgeDraw).length };

await fixture([{ id: "helper", at: [12, 4] }]);
let h = npcOf("helper");
h.x = 2.5 * T; h.y = 2.5 * T;
at(16, 3);
const ds = [dist(h)];
let water = 0, samples = 0;
for (let s = 0; s < 9; s++) { run(1, () => { samples++; if (onW(h)) water++; }); ds.push(dist(h)); if (BH.talk.isOpen()) break; }
let falls = 0; for (let i = 1; i < ds.length; i++) if (ds[i] < ds[i - 1] - 0.5) falls++;
out.walk = { ds: ds.map(d => +d.toFixed(2)), falls, steps: ds.length - 1, water, samples, talk: BH.talk._state(), state: BH.edge.info().helper };
const px0 = player.x, phases = new Set();
keys["arrowleft"] = true; run(0.5, () => phases.add(game.phase)); keys["arrowleft"] = false;
out.walk.free = { moved: +((px0 - player.x) / T).toFixed(2), phases: [...phases], talkStill: BH.talk.isOpen() };

await fixture([{ id: "helper", at: [12, 4] }]);
at(19, 2);
h = npcOf("helper");
water = 0; samples = 0; let maxX = 0;
run(12, () => { samples++; if (onW(h)) water++; maxX = Math.max(maxX, h.x / T); });
out.water = { water, samples, endDist: +dist(h).toFixed(2), maxX: +maxX.toFixed(2), playerInWater: onW(player), detector: isWater(tileAt(19.5 * T, 2.5 * T)), talk: BH.talk.isOpen() };

await fixture([{ id: "helper", at: [12, 4] }]);
player.carry = 3;
h = npcOf("helper");
at(Math.floor(h.x / T) + 1, Math.floor(h.y / T));
player.stash = 2;
const w0 = save.wallet || 0;
run(0.6);
out.tell = { asked: BH.talk._state(), phaseAsked: game.phase, carryBefore: player.carry, stashBefore: player.stash };
out.tell.picked = await answer("1"); out.tell.choices = answered;
out.tell.carryNow = player.carry; out.tell.stashNow = player.stash; out.tell.flying = BH.edge.info().flying; out.tell.phaseNow = game.phase;
run(1.5);
out.tell.phase = game.phase; out.tell.reason = game.loseReason; out.tell.carry = player.carry; out.tell.robbed = BH.edge.info().robbed;
out.tell.walletDelta = (save.wallet || 0) - w0; out.tell.saved = game.replay ? game.replay.saved : null; out.tell.same = same();

await fixture([{ id: "helper", at: [12, 4] }]);
player.carry = 3;
h = npcOf("helper");
at(Math.floor(h.x / T) + 1, Math.floor(h.y / T));
run(0.6);
out.refuse = { asked: BH.edge.info().helper === "ask" && BH.talk.isOpen(), carryBefore: player.carry };
out.refuse.picked = await answer("2"); out.refuse.choices = answered;
out.refuse.carryNow = player.carry; out.refuse.kept = BH.edge.info().kept; out.refuse.oak = BH.talk._state();
BH.talk.reset();
at(14, 3);
run(8);
out.refuse.carry = player.carry; out.refuse.phase = game.phase; out.refuse.state = BH.edge.info().helper; out.refuse.npcLeft = !!npcOf("helper"); out.refuse.talk = BH.talk.isOpen(); out.refuse.same = same();

await fixture([{ id: "helper", at: [12, 4] }, { id: "edge", at: [10, 1] }]);
at(8, 3); player.carry = 3;
run(1.2);
BH.river.pay({ id: "pine", x: 18.5 * T, y: 2.5 * T }, 1, "PINE");
runR(0.15);
out.shot = canvas.toDataURL("image/png");
out.scan = drawn(edgeDraw);
out.done = true;
for (let i = 0; i < fx; i++) LEVELS.pop();
return out;
`;

const drive = path.join(__dirname, "drive.js");
const r = spawnSync(process.execPath, [drive, "/index.html?unlock", "-"], { input: PAGE, encoding: "utf8", timeout: 560000, env: process.env, maxBuffer: 64 << 20 });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = data.result || {};
if (SHOT && o.shot) fs.writeFileSync(SHOT, Buffer.from(o.shot.split(",")[1], "base64"));
delete o.shot;
if (process.env.EDGE_DUMP) console.log(JSON.stringify({ attached: o.attached, f1: o.f1 }));
if (!o.done) { console.log("FAIL page script did not finish\n" + data.errors.join("\n")); process.exit(1); }
const RX = /^\?\?\?   \?\?\?   \?\?\?   PAID$/, FIXED = ["FROM  TO    ZEC", "CONTROL TOWER"];
const rowsOf = (a) => a.filter(s => FIXED.indexOf(s) < 0);
const b = o.board, w = o.walk, wa = o.water, t = o.tell, rf = o.refuse;
const allText = [].concat(b.drawn, b.drawn2, o.scan);
const checks = [
  ["0  0 console errors", data.errors.length === 0, data.errors.length],
  ["1  pay() once -> screen rows 1 within 0.1 s, ???  ???  ???  PAID, under the tower's name and the column heads", b.rows.length === 1 && RX.test(b.rows[0]) && rowsOf(b.drawn).length === 1 && RX.test(rowsOf(b.drawn)[0]) && FIXED.every(f => b.drawn.indexOf(f) >= 0), JSON.stringify(b.drawn)],
  ["1  no block talk: no text says BLOCK or carries a number", !allText.some(s => /BLOCK|\d/.test(s)) && b.same, JSON.stringify(b.second)],
  ["1  screen never shows amount, sender or a clock: every row hides all three (no 7, PINE, ':')", rowsOf(allText).every(s => RX.test(s)) && !allText.some(s => /PINE|:|\b7\b/.test(s)), JSON.stringify(allText)],
  ["1  the lantern flickers on the payment, then stops", b.flicks === 1 && b.glowOn > 0 && b.glowAfter === 0, `flicks ${b.flicks}, glow ${b.glowOn} -> ${b.glowAfter}`],
  ["1  a send flickers too (R3-33) but writes no PAID row", b.afterSpent.rows === 1 && b.afterSpent.flicks === 2, JSON.stringify(b.afterSpent)],
  ["1  second payment -> 2 rows, both drawn", b.second.length === 2 && b.second.every(s => RX.test(s)) && rowsOf(b.drawn2).length === 2, JSON.stringify(b.second)],
  ["1  the board stands in the ground: every tree behind it is painted before it, only trees in front after", b.layer.seen && b.layer.before > 0 && b.layer.behindAfter === 0, JSON.stringify(b.layer)],
  ["1  you in front of the tower are drawn over it; behind it, under it", b.front.playerOver === true && b.behind.playerOver === false && b.front.behindAfter === 0 && b.behind.behindAfter === 0, JSON.stringify({ front: b.front, behind: b.behind })],
  ["C  control: no watcher on the level -> 0 rows, 0 flickers, 0 text", o.noWatcher.rows === 0 && o.noWatcher.flicks === 0 && o.noWatcher.drawn === 0, JSON.stringify(o.noWatcher)],
  ["2  helper distance to you falls every second on land", w.steps >= 3 && w.falls === w.steps, `${JSON.stringify(w.ds)} falls ${w.falls}/${w.steps}`],
  ["2  he reaches you and asks for the 24 words, 2 choices", w.talk && w.talk.who === "helper" && /24 words/.test(w.talk.text) && w.state === "ask" && t.choices && t.choices.length === 2 && rf.choices && rf.choices.join() === t.choices.join(), JSON.stringify({ talk: w.talk, choices: t.choices })],
  ["2  the question never freezes you: phase play, you still walk", w.free.phases.join() === "play" && w.free.moved > 1 && w.free.talkStill, JSON.stringify(w.free)],
  ["3  you in the water: he is never on water over 12 s, stops at the edge", wa.water === 0 && wa.samples >= 700 && wa.playerInWater && wa.maxX < 19 && wa.endDist < 1.6 && !wa.talk, JSON.stringify(wa)],
  ["2  he is never on water while walking to you on land", w.water === 0 && w.samples >= 180, `${w.water} in ${w.samples}`],
  ["C  control: the water detector fires on a water tile", wa.detector === true, wa.detector],
  ["4  tell -> carry 0, every coin (3 + 2 in the den) flies to him, then trail:robbed", t.picked && t.asked && t.asked.who === "helper" && t.phaseAsked === "play" && t.carryBefore === 3 && t.carryNow === 0 && t.stashNow === 0 && t.flying === 5 && t.phaseNow === "play" && t.phase === "caught" && t.reason === "trail:robbed" && t.carry === 0 && t.robbed && t.same, JSON.stringify(t)],
  ["4  robbed banks nothing: wallet +0, replay saved 0", t.walletDelta === 0 && t.saved === 0, `wallet +${t.walletDelta}, saved ${t.saved}`],
  ["5  refuse -> WORDS KEPT, carry unchanged, he walks off", rf.picked && rf.asked && rf.carryBefore === 3 && rf.carryNow === 3 && rf.kept && rf.carry === 3 && rf.phase === "play" && rf.state === "gone" && !rf.npcLeft && rf.same, JSON.stringify(rf)],
  ["5  refuse -> Oak: real support never asks", rf.oak && /never asks for your words/.test(rf.oak.text), JSON.stringify(rf.oak)],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors.length) console.log(data.errors.join("\n"));
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
