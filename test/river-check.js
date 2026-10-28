"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.river && typeof loadLevel === "function" && typeof bake !== "undefined"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const out = {};
const MAP = [
  "####################",
  "#P.................#",
  "#..................#",
  "#~~~~~~~~~~~~~~~~~~#",
  "#~~~~~U~~~~~YYY~~~~#",
  "#~~~~~~~~~~~~~~~~~~#",
  "####################"];
function fixture(map, extra) {
  const lv = Object.assign({ title: "RIVER FIXTURE", tid: "riverfix", act: 0, par: 999, need: 99, map: map, features: [],
    hunters: [{ type: "hunter", patrol: [[2, 2], [17, 2]] }], copy: { goal: "t", lesson: "t", dev: "t" } }, extra || {});
  LEVELS.push(lv);
  startLevel(LEVELS.length - 1);
  if (game.levelIdx !== LEVELS.length - 1) loadLevel(LEVELS.length - 1, false);
  ghost = true; autopilot = null;
  return lv;
}
function run(sec, each) { for (let i = 0, n = Math.round(sec / STEP); i < n; i++) { step(STEP); if (each) each(i); } }
function count(code) { let n = 0; for (const r of grid) for (const c of r) if (c === code) n++; return n; }
function drawn(fn) {
  const got = [], P = CanvasRenderingContext2D.prototype, f0 = P.fillText, s0 = P.strokeText;
  P.fillText = function (t) { got.push(String(t)); return f0.apply(this, arguments); };
  P.strokeText = function (t) { got.push(String(t)); return s0.apply(this, arguments); };
  try { fn(); } finally { P.fillText = f0; P.strokeText = s0; }
  return got;
}
function riverDraw() { ctx.save(); BH.features.get("river").onDrawWorld(ctx); ctx.restore(); }

fixture(MAP);
out.levelLoaded = game.phase === "play" && L.title === "RIVER FIXTURE";
out.solid = { U: solidP("U"), Y: solidP("Y"), Uhunter: solidH("U"), Yhunter: solidH("Y") };
out.riverAttached = activeFeatures.some(f => f.id === "river");

const pine = { id: "pine", x: 4.5 * T, y: 4.5 * T };
const lockCalls = [];
const hadStamps = BH.stamps;
BH.stamps = { lock: (n, need) => lockCalls.push([n, need]) };
const c0 = player.carry, l0 = BH.river.log.length, s0 = strings.length, r0 = BH.river.info().ripples;
BH.river.pay(pine, 2, "PINE");
out.pay = { carryDelta: player.carry - c0, logDelta: BH.river.log.length - l0, row: Object.assign({}, BH.river.log[BH.river.log.length - 1]),
  stringsDelta: strings.length - s0, ripplesDelta: BH.river.info().ripples - r0, lockCalls: lockCalls.slice(), boxesFlying: BH.river.info().boxes };
BH.stamps = hadStamps;
run(0.2); render();
const payText = drawn(riverDraw);
out.pay.riverText = payText;
run(1);
out.pay.boxesAfterFlight = BH.river.info().boxes;
const c1 = player.carry, l1 = BH.river.log.length, s1 = strings.length, r1 = BH.river.info().ripples;
BH.river.spent(6.5 * T, 4.5 * T, 1);
out.spent = { carryDelta: player.carry - c1, logDelta: BH.river.log.length - l1, row: Object.assign({}, BH.river.log[BH.river.log.length - 1]),
  stringsDelta: strings.length - s1, ripplesDelta: BH.river.info().ripples - r1 };
featureApi.link("CONTROL", player.x, player.y, player.x + T, player.y, { rush: false });
out.stringsControl = strings.length - s1;

const rowsBeforeTour = BH.river.log.length;
levelStart += 4.2; run(0.2); BH.river.info(); levelStart += 1.3; run(0.2);
out.tour = { before: rowsBeforeTour, after: BH.river.log.length };

const y0 = count("Y"), w0 = count("~");
out.gate = { yBefore: y0, isGateBefore: BH.river.isGate(12, 4) };
BH.river.valid();
run(0.3); render();
const flashText = drawn(riverDraw);
out.gate.validDrawn = flashText.filter(t => t === "VALID").length;
out.gate.yWhileFlashing = count("Y");
out.gate.riverText = flashText;
run(1);
out.gate.yAfter = count("Y"); out.gate.waterGained = count("~") - w0; out.gate.isGateAfter = BH.river.isGate(12, 4);
out.gate.openGatesAgain = BH.river.openGates();
out.gate.flashing = BH.river.info().flashing;

fixture(MAP);
BH.river.info();
out.tour.afterReload = BH.river.log.length;
const h = hunters[0];
let waterTiles = 0, lookedAt = 0, samples = 0, maxLookDiff = 9;
run(20, (i) => {
  if (i % 120 === 0) {
    const rx = (Math.floor(h.x / T) + 1.5) * T, ry = 3.5 * T;
    BH.river.ripple(rx, ry);
    h.__rip = { x: rx, y: ry, t: i };
  }
  if (h.__rip && i - h.__rip.t === 20) { const a = Math.atan2(h.__rip.y - h.y, h.__rip.x - h.x); const d = Math.abs(angDiff(a, h.dir)); maxLookDiff = Math.min(maxLookDiff, d); if (d < 0.2) lookedAt++; }
  samples++;
  if (isWater(tileAt(h.x, h.y))) waterTiles++;
  (h.path || []).forEach(p => { if (isWater(tileAt(p[0], p[1]))) waterTiles++; });
});
out.hunter = { samples, waterTiles, ripples: 10, lookedAt, phase: game.phase };
out.hunter.detectorControl = isWater(tileAt(5.5 * T, 3.5 * T));
const hd0 = h.dir; BH.river.ripple(18.5 * T, 5.5 * T); run(0.3);
out.hunter.farLooks = BH.river.info().looks;

out.tiles = { U: !!BH.tiles.get("U"), Y: !!BH.tiles.get("Y") };
LEVELS.splice(LEVELS.length - 1, 1); LEVELS.splice(LEVELS.length - 1, 1);
return out;
`;

const drive = path.join(__dirname, "drive.js");
const r = spawnSync(process.execPath, [drive, "/index.html?unlock", "-"], { input: PAGE, encoding: "utf8", timeout: 280000, env: process.env });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = data.result || {};
const checks = [
  ["0  0 console errors", data.errors.length === 0, data.errors.length],
  ["0  fixture loaded, U and Y solid for player and hunters", o.levelLoaded && o.solid && o.solid.U && o.solid.Y && o.solid.Uhunter && o.solid.Yhunter, JSON.stringify(o.solid)],
  ["1  valid() draws VALID, gate stays shut while it flashes", o.gate.validDrawn > 0 && o.gate.yWhileFlashing === o.gate.yBefore, `VALID x${o.gate.validDrawn}, Y while flashing ${o.gate.yWhileFlashing}/${o.gate.yBefore}`],
  ["1  the river draws only VALID at the gate: no amount, no name", o.gate.riverText.length > 0 && o.gate.riverText.every(t => t === "VALID"), JSON.stringify(o.gate.riverText)],
  ["3  pay draws no text at all (no number, no name)", o.pay.riverText.length === 0, JSON.stringify(o.pay.riverText)],
  ["1  openGates changes N Y tiles to ~", o.gate.yBefore > 0 && o.gate.yAfter === 0 && o.gate.waterGained === o.gate.yBefore && o.gate.isGateBefore && !o.gate.isGateAfter, `N=${o.gate.yBefore}, ~ +${o.gate.waterGained}, Y left ${o.gate.yAfter}`],
  ["1  control: openGates again changes 0", o.gate.openGatesAgain === 0, o.gate.openGatesAgain],
  ["2  hunter on land never has a water tile in his path over 20 s", o.hunter.waterTiles === 0 && o.hunter.samples >= 1199 && o.hunter.phase === "play", `${o.hunter.waterTiles} water hits in ${o.hunter.samples} steps`],
  ["2  hunter turns his lantern to the ripple", o.hunter.lookedAt >= 5, `${o.hunter.lookedAt}/${o.hunter.ripples} ripples looked at`],
  ["2  control: water detector fires on water; far ripple turns nobody", o.hunter.detectorControl && o.hunter.farLooks === 0, `detector ${o.hunter.detectorControl}, far looks ${o.hunter.farLooks}`],
  ["3  pay(npc,2): carry +2 exactly, 1 IN row", o.pay.carryDelta === 2 && o.pay.logDelta === 1 && o.pay.row.dir === "in" && o.pay.row.n === 2, `carry +${o.pay.carryDelta}, rows +${o.pay.logDelta} (${o.pay.row.dir})`],
  ["3  pay: no padlock call (coins spendable at once), boxes fly then land", JSON.stringify(o.pay.lockCalls) === "[]" && o.pay.boxesFlying === 2 && o.pay.boxesAfterFlight === 0, `lock ${JSON.stringify(o.pay.lockCalls)}, boxes ${o.pay.boxesFlying} -> ${o.pay.boxesAfterFlight}`],
  ["4  spent(): 1 OUT row, 1 ripple", o.spent.logDelta === 1 && o.spent.row.dir === "out" && o.spent.ripplesDelta === 1, `rows +${o.spent.logDelta} (${o.spent.row.dir}), ripples +${o.spent.ripplesDelta}`],
  ["4  pay also makes 1 ripple", o.pay.ripplesDelta === 1, `ripples +${o.pay.ripplesDelta}`],
  ["4  0 link strings drawn for pay or spent", o.pay.stringsDelta === 0 && o.spent.stringsDelta === 0, `pay +${o.pay.stringsDelta}, spent +${o.spent.stringsDelta}`],
  ["5  log rows written before the tour ends survive it", o.tour.before === 2 && o.tour.after === 2, `${o.tour.before} -> ${o.tour.after}`],
  ["5  control: a real level load empties the log", o.tour.afterReload === 0, `${o.tour.afterReload} rows after reload`],
  ["4  control: a real link does add a string", o.stringsControl === 1, `+${o.stringsControl}`],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors.length) console.log(data.errors.join("\n"));
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
