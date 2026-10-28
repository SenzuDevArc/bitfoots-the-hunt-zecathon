"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const SHOT = process.argv[2] || "";

const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.glasskey && BH.river && typeof loadLevel === "function" && typeof bake !== "undefined"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const out = {};
const MAP = [
  "####################################",
  "#P.......#......~~~~~~~~~~.........#",
  "#........#......~~~~~~~~~~.........#",
  "#..c............~~~~~~~~~~....##...#",
  "#........##....V~~~~~~~~~~....##...#",
  "#........##.....~~~~~~~~~~.........#",
  "#...............~~~~~~~~~~.........#",
  "#....##.........~~~~~~U~~~....##...#",
  "#....##........#YYYYYYYYYY#...##...#",
  "#..c...........#~~~~~~~~~~#........#",
  "#.........#....#~~~~d~~~~~#........#",
  "####################################"];
function fixture(extra) {
  const lv = Object.assign({ title: "GLASS KEY FIXTURE", tid: "glasskeyfix", act: 2, par: 999, need: 3, map: MAP, features: ["trail", "glasskey"],
    gateBy: "key",
    npcs: [{ id: "pine", at: [18, 2], water: true }, { id: "merchant", at: [22, 6], water: true }, { id: "auditor", at: [20, 7], water: true }],
    hunters: [{ type: "hunter", patrol: [[12, 1], [12, 10]] }, { type: "hunter", patrol: [[28, 1], [34, 1], [34, 10], [28, 10]] }],
    copy: { goal: "t", lesson: "t", dev: "t" } }, extra || {});
  LEVELS.push(lv);
  startLevel(LEVELS.length - 1);
  if (game.levelIdx !== LEVELS.length - 1) loadLevel(LEVELS.length - 1, false);
  ghost = true; autopilot = null;
  return lv;
}
function run(sec) { for (let i = 0, n = Math.round(sec / STEP); i < n; i++) step(STEP); }
function count(code) { let n = 0; for (const r of grid) for (const c of r) if (c === code) n++; return n; }
function texts(fn) {
  const got = [], P = CanvasRenderingContext2D.prototype, f0 = P.fillText;
  P.fillText = function (t) { got.push(String(t)); return f0.apply(this, arguments); };
  try { fn(); } finally { P.fillText = f0; }
  return got;
}
function frame() { return texts(() => render()); }
function marksIn(t) { return [...new Set(t.filter(s => /^(IN|OUT) \d+$/.test(s)))]; }
const PROMPT = s => /^(TAP: )?SHOW MY GLASS KEY$/.test(s);
function at(tx, ty) { player.x = (tx + 0.5) * T; player.y = (ty + 0.5) * T; player.tx = tx; player.ty = ty; }
function pressE() { dispatchEvent(new KeyboardEvent("keydown", { key: "e", code: "KeyE", bubbles: true })); dispatchEvent(new KeyboardEvent("keyup", { key: "e", code: "KeyE", bubbles: true })); }
function inLight(h, x, y) {
  const d = Math.hypot(x - h.x, y - h.y);
  if (h.type === "dog") return d <= D_SENSE * T;
  if (d <= SENSE * T) return true;
  return d <= visionOf(h) * T && Math.abs(angDiff(Math.atan2(y - h.y, x - h.x), h.dir)) <= CONE && losClear(h.x, h.y, x, y);
}
const floats = []; const ft0 = window.floatText;
window.floatText = function (x, y, t) { floats.push(String(t)); return ft0.apply(this, arguments); };
let opens = 0; const og0 = BH.river.openGates;
BH.river.openGates = function () { opens++; return og0.apply(this, arguments); };

const TS = () => activeFeatures.find(f => f.id === "trail").api.state;
async function skipTour() {
  for (let i = 0; i < 20 && (TS().tour || TS().tourPending || game.phase !== "play"); i++) {
    await new Promise(r => setTimeout(r, 700));
    if (BH.talk.isOpen()) BH.talk.reset();
    dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    run(0.1);
  }
  if (BH.talk.isOpen()) BH.talk.reset();
}
fixture();
run(1.5);
await skipTour();
out.loaded = game.phase === "play" && L.title === "GLASS KEY FIXTURE";
out.attached = activeFeatures.some(f => f.id === "glasskey");
const pine = { x: 18.5 * T, y: 2.5 * T }, merch = { x: 22.5 * T, y: 6.5 * T };
BH.river.pay(pine, 2, "PINE");
BH.river.spent(merch.x, merch.y, 1);
out.rows = BH.river.log.map(r => r.dir + " " + r.n);

at(5, 5); run(0.1);
pressE(); run(0.2);
out.farControl = { shows: BH.glasskey.info().shows, asking: BH.glasskey.info().asking };

at(19, 7); run(0.1);
const t0 = frame();
out.before = { asking: BH.glasskey.info().asking, drawn: BH.glasskey.info().drawn, labels: marksIn(t0), prompt: t0.filter(PROMPT), y: count("Y") };
run(4);
out.before.yAfterWait = count("Y");
out.before.opens = opens;

const carry0 = player.carry, stash0 = player.stash;
pressE();
out.afterE = { phase: game.phase, talkOpen: BH.talk.isOpen(), shown: BH.glasskey.info().shown };
const x0 = player.x;
dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", code: "ArrowLeft", bubbles: true }));
run(0.4);
dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft", code: "ArrowLeft", bubbles: true }));
out.afterE.moved = Math.round(x0 - player.x);
at(19, 7);
run(1.0);
const t1 = frame();
const inf = BH.glasskey.info();
out.after = { drawn: inf.drawn, hidden: inf.hidden, labels: marksIn(t1).sort(), marks: inf.marks,
  onRows: inf.marks.every(m => BH.river.log.some(r => r.x === m.x && r.y === m.y)) };
out.after.inHunterLight = inf.marks.filter(m => hunters.some(h => inLight(h, m.x, m.y))).length;
out.after.hunters = hunters.map(h => [Math.round(h.x / T * 10) / 10, Math.round(h.y / T * 10) / 10]);
{
  const P = CanvasRenderingContext2D.prototype, f0 = P.fillText, d0 = P.drawImage, b0 = window.drawBitfoot;
  const ys = []; let seen = false, before = 0, after = 0;
  P.fillText = function (t, x, y) { if (/^(IN|OUT) \d+$/.test(String(t))) { seen = true; ys.push({ t: String(t), x, y }); } return f0.apply(this, arguments); };
  P.drawImage = function (img) { if (img && img.height >= 80 && img.width <= 80) { if (seen) after++; else before++; } return d0.apply(this, arguments); };
  window.drawBitfoot = function () { if (seen) after++; else before++; return b0.apply(this, arguments); };
  try { render(); } finally { P.fillText = f0; P.drawImage = d0; window.drawBitfoot = b0; }
  const lift = ys.map(m => { const r = BH.river.log.find(q => Math.round(q.x) === m.x); return r ? Math.round(r.y - m.y) : null; });
  out.after.layer = { before, after, lift };
}
run(1.5);
out.paw = { carryBefore: carry0, carryAfter: player.carry, stashBefore: stash0, stashAfter: player.stash, cant: floats.filter(s => s === "CAN'T SPEND").length, paw: BH.glasskey.info().paw };
out.gate = { y: count("Y"), opens: opens, gated: BH.glasskey.info().gated };
out.keyStays = { shown: BH.glasskey.info().shown, asking: BH.glasskey.info().asking, prompt: frame().filter(PROMPT).length };

const snap = { shows: BH.glasskey.info().shows, y: count("Y"), opens: opens, carry: player.carry, floats: floats.length, drawn: BH.glasskey.info().drawn };
pressE(); run(2.5); frame();
out.again = { shows: BH.glasskey.info().shows, y: count("Y"), opens: opens, carry: player.carry, floats: floats.length, drawn: BH.glasskey.info().drawn, snap };

const h = hunters[0], hs = { x: h.x, y: h.y, dir: h.dir };
h.x = 15.5 * T; h.y = 2.5 * T; h.dir = 0;
frame();
const ctl = BH.glasskey.info();
out.huntControl = { inLightOfPine: inLight(h, pine.x, pine.y), drawn: ctl.drawn, hidden: ctl.hidden, inHunterLight: ctl.marks.filter(m => hunters.some(q => inLight(q, m.x, m.y))).length, labels: marksIn(frame()) };
Object.assign(h, hs);

out.shot = "";
if (${JSON.stringify(!!SHOT)}) {
  at(19, 7); h.x = 15.5 * T; h.y = 2.5 * T; h.dir = 0; frame();
  out.shot = document.querySelector("canvas").toDataURL("image/png");
  Object.assign(h, hs);
}

fixture({ gateBy: undefined, tid: "glasskeyfix2", title: "GLASS KEY FIXTURE 2" });
run(1.5);
await skipTour();
if (L.title !== "GLASS KEY FIXTURE 2") { loadLevel(LEVELS.length - 1, false); ghost = true; autopilot = null; run(0.5); }
at(19, 7); run(0.1);
const y2 = count("Y"), opens0 = opens;
pressE(); run(3); frame();
out.noKeyLevel = { shown: BH.glasskey.info().shown, yBefore: y2, yAfter: count("Y"), gateBy: L.gateBy, title: L.title, opensBefore: opens0, opens: opens, gated: BH.glasskey.info().gated };
LEVELS.splice(LEVELS.length - 2, 2);
window.floatText = ft0; BH.river.openGates = og0;
return out;
`;

const drive = path.join(__dirname, "drive.js");
const r = spawnSync(process.execPath, [drive, "/index.html?unlock", "-"], { input: PAGE, encoding: "utf8", timeout: 280000, maxBuffer: 64 * 1024 * 1024, env: process.env });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = data.result || {};
if (SHOT && o.shot) { fs.writeFileSync(SHOT, Buffer.from(o.shot.split(",")[1], "base64")); console.log("shot: " + SHOT); }
const j = (v) => JSON.stringify(v);
const checks = [
  ["0  0 console errors", data.errors.length === 0, data.errors.length],
  ["0  fixture loaded, glass key feature attached, 2 log rows", o.loaded && o.attached && j(o.rows) === j(["in 2", "out 1"]), j(o.rows)],
  ["1  before E: prompt E: SHOW MY GLASS KEY next to her, 0 gold marks", o.before.asking && o.before.prompt.length === 1 && o.before.drawn === 0 && o.before.labels.length === 0, `prompt ${j(o.before.prompt)}, marks ${o.before.drawn}`],
  ["1  control: E far from her does nothing", o.farControl.shows === 0 && !o.farControl.asking, j(o.farControl)],
  ["1  gate stays shut before the key (4 s wait, 0 openGates)", o.before.y === 10 && o.before.yAfterWait === 10 && o.before.opens === 0, `Y ${o.before.y} -> ${o.before.yAfterWait}, opens ${o.before.opens}`],
  ["2  E is non-freezing: phase play, no talk box, the player walks on", o.afterE.shown && o.afterE.phase === "play" && !o.afterE.talkOpen && o.afterE.moved > 5, j(o.afterE)],
  ["3  after E: 2 gold marks, labelled IN 2 / OUT 1, at the log rows", o.after.drawn === 2 && j(o.after.labels) === j(["IN 2", "OUT 1"]) && o.after.onRows, `${o.after.drawn} marks ${j(o.after.labels)}`],
  ["3  the labels ride a tile above the payer, painted after every Bitfoot and tree", o.after.layer.before > 0 && o.after.layer.after === 0 && o.after.layer.lift.length === o.after.drawn && o.after.layer.lift.every(d => d != null && d >= 32 + 10), j(o.after.layer)],
  ["4  hunters' light contains 0 marks", o.after.inHunterLight === 0 && o.after.hidden === 0, `in light ${o.after.inHunterLight}, hunters ${j(o.after.hunters)}`],
  ["4  control: a hunter lantern turned on Pine's row: that mark goes blank, the drawn one stays out of his light", o.huntControl.inLightOfPine && o.huntControl.drawn === 1 && o.huntControl.hidden === 1 && o.huntControl.inHunterLight === 0 && j(o.huntControl.labels) === j(["OUT 1"]), j(o.huntControl)],
  ["5  paw passes through: CAN'T SPEND, carry and den unchanged", o.paw.paw && o.paw.cant === 1 && o.paw.carryBefore === o.paw.carryAfter && o.paw.stashBefore === o.paw.stashAfter, j(o.paw)],
  ["6  gates open after the key (Y 10 -> 0, one openGates call)", o.gate.y === 0 && o.gate.opens === 1 && o.gate.gated, j(o.gate)],
  ["7  key stays: shown, no prompt, no take-back", o.keyStays.shown && !o.keyStays.asking && o.keyStays.prompt === 0, j(o.keyStays)],
  ["7  E again changes nothing", j({ shows: o.again.shows, y: o.again.y, opens: o.again.opens, carry: o.again.carry, floats: o.again.floats, drawn: o.again.drawn }) === j(o.again.snap), j(o.again)],
  ["6  control: without gateBy key the key opens no gate", o.noKeyLevel.shown && o.noKeyLevel.title === "GLASS KEY FIXTURE 2" && o.noKeyLevel.yBefore === 10 && o.noKeyLevel.yAfter === 10, j(o.noKeyLevel)],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors.length) console.log(data.errors.join("\n"));
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
