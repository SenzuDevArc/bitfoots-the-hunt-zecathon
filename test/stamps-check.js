"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");
const SHOT = process.argv[2] || "";

const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.stamps && BH.river && typeof loadLevel === "function" && typeof bake !== "undefined"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const out = {};
const MAP = [
  "####################",
  "#P.c....c....c.....#",
  "#..................#",
  "#..................#",
  "#..............D...#",
  "####################"];
let fx = 0;
function fixture(extra) {
  const lv = Object.assign({ title: "COIN FIXTURE", tid: "stampfix" + (fx++), act: 0, par: 999, need: 99, map: MAP, features: ["stamps"],
    hunters: [], copy: { goal: "t", lesson: "t", dev: "t" } }, extra || {});
  LEVELS.push(lv);
  loadLevel(LEVELS.length - 1, false);
  ghost = true; autopilot = null;
  return lv;
}
const T0 = performance.now();
function run(sec, each) { for (let i = 0, n = Math.round(sec / STEP); i < n; i++) { if (performance.now() - T0 > 120000) throw new Error("over 120 s: " + JSON.stringify(Object.keys(out)) + " " + L.title + " " + game.phase + " " + game.screen); step(STEP); if (each) each(i); } }
function runR(sec) { run(sec, () => render()); }
function runTo(k, each) { let g = 0; while (BH.stamps.count() < k && g++ < 6000) { step(STEP); if (each) each(); } }
function grab(i) { player.x = coins[i].x; player.y = coins[i].y; step(STEP); return coins[i].got; }
function home() { player.x = 1.5 * T; player.y = 3.5 * T; }
function drawn(fn) {
  const got = [], P = CanvasRenderingContext2D.prototype, f0 = P.fillText, s0 = P.strokeText;
  P.fillText = function (t) { got.push(String(t)); return f0.apply(this, arguments); };
  P.strokeText = function (t) { got.push(String(t)); return s0.apply(this, arguments); };
  try { fn(); } finally { P.fillText = f0; P.strokeText = s0; }
  return got;
}

fixture();
out.attached = activeFeatures.some(f => f.id === "stamps");
out.beat = BH.stamps.beat;
run(9.9); out.at99 = BH.stamps.count();
run(0.1); out.at10 = BH.stamps.count();

let c0 = BH.stamps.count(); game.phase = "talk"; run(5); out.heldTalkPhase = BH.stamps.count() - c0; game.phase = "play";
c0 = BH.stamps.count(); const x0 = player.x;
BH.talk.open([["oak", "BLOCKS LAND ON A STEADY BEAT."]]);
out.talkOpen = BH.talk.isOpen();
let phases = new Set(); run(5, () => phases.add(game.phase));
out.talkBox = { delta: BH.stamps.count() - c0, phases: [...phases] };
BH.talk.reset();

save.trail = save.trail || {}; save.trail.wallets = 1;
const tourIdx = LEVELS.findIndex((l, i) => i > 0 && !(l.hunters || []).length && BH.trailTour && BH.trailTour.plan(i).length);
out.tourLevel = tourIdx >= 0 ? { idx: tourIdx, tid: LEVELS[tourIdx].tid, plan: BH.trailTour.plan(tourIdx) } : null;
if (tourIdx < 0) return Object.assign(out, { early: "no real level with a tour plan" });
loadLevel(tourIdx, false); ghost = true; autopilot = null;
runR(1);
const TS = () => activeFeatures.find(f => f.id === "trail").api.state;
async function skipTour() {
  for (let i = 0; i < 20 && TS().tour; i++) {
    await new Promise(r => setTimeout(r, 700));
    if (BH.talk.isOpen()) BH.talk.reset();
    dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    runR(0.1);
  }
}
out.tour = { started: !!TS().tour, phase: game.phase };
c0 = BH.stamps.count(); runR(6); out.tour.delta = BH.stamps.count() - c0; out.tour.phaseDuring = game.phase; out.tour.feats = activeFeatures.map(f => f.id); out.tour.title = L.title; out.tour.screen = game.screen;
if (!activeFeatures.some(f => f.id === "trail")) return { early: out };
await skipTour();
out.tour.after = { tour: !!TS().tour, phase: game.phase };
c0 = BH.stamps.count(); runR(2.5); out.tour.playDelta = BH.stamps.count() - c0;

let notReady = 0;
const watch = () => { if (BH.stamps.ready() !== player.carry) notReady++; };
fixture({ padlock: true });
run(3.0); home();
out.pad = { picked: grab(0), readyAtPick: BH.stamps.ready() }; home();
run(1.0, watch);
out.pad.picked2 = grab(1); out.pad.readyAtPick2 = BH.stamps.ready(); home();
run(8, watch);
out.pad.notReady = notReady;

fixture();
run(3.0); home();
out.ground = { picked: grab(0), ready: BH.stamps.ready() }; home();
const c3 = player.carry;
BH.river.pay({ id: "pine", x: 6 * T, y: 3 * T }, 1, "PINE");
BH.stamps.lock(1, 10);
notReady = 0; run(8, watch);
out.pay = { before: c3, carry: player.carry, ready: BH.stamps.ready(), notReady, locks: BH.stamps.locks().length };

fixture();
run(3.6);
const ks = BH.stamps.count(), seq = [], texts = new Set();
const r0 = BH.stamps.confirm("post-a"); seq.push([BH.stamps.count(), r0.n, r0.waiting, r0.safe, r0.text]); texts.add(r0.text);
runTo(ks + 4, () => { const r = BH.stamps.confirm("post-a"); texts.add(r.text); if (seq[seq.length - 1][0] !== BH.stamps.count()) seq.push([BH.stamps.count(), r.n, r.waiting, r.safe, r.text]); });
out.confirm = { ks, seq, texts: [...texts] };

fixture({ features: ["trail", "stamps"], elders: ["oak", "sly"], padlock: true, tid: "steps-like" });
game.screen = "play";
runR(1); await skipTour(); runR(0.2);
const said = [], b0 = BH.talk.bubble;
BH.talk.bubble = function (e, t) { said.push([e && e.id, t]); return b0.apply(this, arguments); };
const realIdx = game.levelIdx; game.levelIdx = 0;
let labels = [];
const look = (i) => { if (i % 6 === 0) labels = labels.concat(drawn(() => render())); };
run(4.0, look); home(); grab(0); home(); run(2.6, look); grab(1); home();
BH.river.pay({ id: "pine", x: 6 * T, y: 3 * T }, 2, "PINE");
run(9, look);
game.levelIdx = realIdx; BH.talk.bubble = b0;
out.draw = { tour: !!TS().tour, cine: !!TS().cine, n: labels.length, hits: [...new Set(labels.filter(t => /UNLOCK|BLOCK|STAMP|WAITING/i.test(t)))] };
out.draw.scan = labels.concat(out.confirm.texts).filter(t => /\b\d+ ?(SEC|MIN)\b|2\.5/i.test(t));
out.sly = { lines: said.filter(s => /block|unlock/i.test(s[1])), n: said.length };
out.shot = canvas.toDataURL("image/png");

fixture();
run(1.0); home(); grab(2); home();
const realReady = BH.stamps.ready; BH.stamps.ready = () => Math.max(0, player.carry - 1);
notReady = 0; run(1, watch); BH.stamps.ready = realReady;
out.control = { detectorFires: notReady };

for (let i = 0; i < fx; i++) LEVELS.pop();
return out;
`;

const drive = path.join(__dirname, "drive.js");
const r = spawnSync(process.execPath, [drive, "/index.html?unlock", "-"], { input: PAGE, encoding: "utf8", timeout: 280000, env: process.env, maxBuffer: 64 << 20 });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = data.result || {};
if (SHOT && o.shot) fs.writeFileSync(SHOT, Buffer.from(o.shot.split(",")[1], "base64"));
delete o.shot;
if (process.env.STAMPS_DUMP) console.log(JSON.stringify(o, null, 1));
if (!data.result || !data.result.draw) { console.log("FAIL page script did not finish\n" + data.errors.join("\n")); process.exit(1); }
const p = o.pad || {}, pay = o.pay || {}, cf = o.confirm || { seq: [] }, d = o.draw || {}, t = o.tour || {};
const checks = [
  ["0  0 console errors", data.errors.length === 0, data.errors.length],
  ["1  stamps after 10 s of play = 4 (9.9 s = 3)", o.at10 === 4 && o.at99 === 3 && o.beat === 2.5, `10 s -> ${o.at10}, 9.9 s -> ${o.at99}`],
  ["1  phase talk (tour/cine) holds the count over 5 s", o.heldTalkPhase === 0, `+${o.heldTalkPhase}`],
  ["1  a talk box never freezes: phase stays play, count +2 over 5 s", o.talkOpen && o.talkBox.delta === 2 && o.talkBox.phases.join() === "play", JSON.stringify(o.talkBox)],
  ["1  real intro tour holds the count; play counts again after it", t.started && t.delta === 0 && !t.after.tour && t.after.phase === "play" && t.playDelta === 1, JSON.stringify(t)],
  ["2  a coin is spendable the step it is picked up, the 2nd one too, never held back (old padlock flag ignored)", p.picked && p.readyAtPick === 1 && p.picked2 && p.readyAtPick2 === 2 && p.notReady === 0, JSON.stringify(p)],
  ["3  ground coin is ready at once", o.ground && o.ground.picked && o.ground.ready === 1, JSON.stringify(o.ground)],
  ["3  river.pay() coins ready at once; an old lock(1, 10) call changes nothing", pay.notReady === 0 && pay.ready === pay.carry && pay.carry >= pay.before + 1 && pay.locks === 0, JSON.stringify(pay)],
  ["4  confirm: PAID from the first moment, never WAITING or SAFE", cf.seq.length >= 4 && cf.seq.every(s => s[1] >= 1 && s[2] === false && s[4] === "PAID") && cf.texts.join() === "PAID", JSON.stringify(cf.seq)],
  ["5  every text drawn while picking coins + getting paid: no UNLOCK / BLOCK / STAMP / WAITING", d.n > 50 && d.hits.length === 0 && !d.tour && !d.cine, `${d.n} texts drawn, hits ${JSON.stringify(d.hits)}`],
  ["5  no bubble line about blocks or unlocking (bubbles captured: " + (o.sly || {}).n + ")", o.sly && o.sly.lines.length === 0, JSON.stringify(o.sly)],
  ["5  text scan: no seconds/minutes or 2.5", d.scan.length === 0, `hits ${JSON.stringify(d.scan)}`],
  ["C  control: the not-spendable detector fires when a coin is held back", o.control && o.control.detectorFires > 0, JSON.stringify(o.control)],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors.length) console.log(data.errors.join("\n"));
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
