"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const PAGE = String.raw`
for (let i = 0; i < 100 && !(typeof loadLevel === "function" && typeof bake !== "undefined" && window.LEVELS); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const out = {};
function fixture(map, extra) {
  const lv = Object.assign({ title: "CORE FIXTURE", tid: "corefix", act: 0, par: 999, need: 2, map: map, features: [], hunters: [],
    copy: { goal: "t", lesson: "t", dev: "t" } }, extra || {});
  LEVELS.push(lv);
  startLevel(LEVELS.length - 1);
  if (game.levelIdx !== LEVELS.length - 1) loadLevel(LEVELS.length - 1, false);
  ghost = true; autopilot = null;
  return lv;
}
function drawn(fn) {
  const got = [], P = CanvasRenderingContext2D.prototype, f0 = P.fillText;
  P.fillText = function (t) { got.push(String(t)); return f0.apply(this, arguments); };
  try { fn(); } finally { P.fillText = f0; }
  return got;
}
let splashes = 0;
const ring0 = window.ring;
window.ring = function (x, y, col) { if (String(col).indexOf("170,230,255,0.8") >= 0) splashes++; return ring0.apply(this, arguments); };
function go(targets, sec, until) { autopilot = { targets: targets, path: [] }; for (let t = 0; t < sec; t += STEP) { step(STEP); if (until && until()) return t; } return -1; }

const WATER = [
  "##############",
  "#............#",
  "#~~~~~~~~~~~~#",
  "#~P~~~~~~~d~~#",
  "#~~~~~~~~~~~~#",
  "#............#",
  "##############"];

fixture(WATER, { need: 2, startCarry: 2 });
out.start = { tile: tile(Math.floor(player.x / T), Math.floor(player.y / T)), inShield: player.inShield, entry: player.entry, carry: player.carry,
  denTile: tile(dens.tx, dens.ty), denWater: !!dens.water };
splashes = 0;
go([[dens.tx, dens.ty]], 1);
out.start.splash1s = splashes; out.start.inShield1s = player.inShield;
go([[dens.tx, dens.ty]], 15, () => game.phase !== "play");
out.start.phase = game.phase;

const LANDSTART = WATER.map((r, i) => i === 3 ? "#~~~~~~~~~~d~#" : i === 1 ? "#P...........#" : r);
fixture(LANDSTART, { need: 2, startCarry: 2 });
out.ctl = { inShield0: player.inShield };
splashes = 0;
go([[3, 3]], 4, () => player.inShield);
go([], 0.5);
out.ctl.splash = splashes; out.ctl.inShield = player.inShield;

const DEP = WATER.map((r, i) => i === 3 ? "#~P~~~~~~~d~~#" : i === 4 ? "#~~~c~~~~~~~~#" : r);
fixture(DEP, { need: 4, startCarry: 3 });
out.dep = { coinTile: tile(4, 4) };
go([[dens.tx, dens.ty]], 10, () => player.stash > 0);
go([], 2.0);
out.dep.first = { carry: player.carry, stash: player.stash, phase: game.phase };
const px = player.x; player.x = dens.x - 5 * T; denFlash = 0;
out.dep.trailText = drawn(() => render()).filter(s => /IN THE DEN|IN THE SHIELD|STILL CARRYING|\/ 4|^3\/4$/.test(s));
player.x = px;
go([[4, 4]], 10, () => player.carry === 1);
out.dep.picked = player.carry;
go([[dens.tx, dens.ty]], 10, () => game.phase !== "play");
out.dep.second = { carry: player.carry, stash: player.stash, phase: game.phase };

const LANDDEN = WATER.map((r, i) => i === 1 ? "#P.........D.#" : i === 3 ? "#~~~~~~~~~~~~#" : r);
fixture(LANDDEN, { need: 4, startCarry: 3 });
out.land = { inShield: player.inShield };
player.x = dens.x - 5 * T;
out.land.text = drawn(() => render()).filter(s => /^3\/4$|IN THE DEN/.test(s));
window.ring = ring0;
return out;
`;

const drive = path.join(__dirname, "drive.js");
const r = spawnSync(process.execPath, [drive, "/index.html?unlock", "-"], { input: PAGE, encoding: "utf8", timeout: 280000, env: process.env });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = data.result || {};
const s = o.start || {}, c = o.ctl || {}, d = o.dep || {}, l = o.land || {};
const checks = [
  ["0  0 console errors", data.errors.length === 0, data.errors.length],
  ["1  tile under start = ~, den tile = ~", s.tile === "~" && s.denTile === "~" && s.denWater, `start ${s.tile}, den ${s.denTile}`],
  ["1  player.inShield true at load, entry null", s.inShield === true && s.entry === null, `inShield ${s.inShield}, entry ${s.entry}`],
  ["1  0 splash rings in the first second (moving)", s.splash1s === 0 && s.inShield1s === true, `${s.splash1s} rings`],
  ["1  autopilot to d with need met: escaped", s.phase === "escaped", s.phase],
  ["1  control: land start walking into water makes a splash", c.inShield0 === false && c.splash >= 1 && c.inShield, `${c.splash} rings, inShield ${c.inShield0} -> ${c.inShield}`],
  ["2  touch d with 3 of 4: carry 0, stash 3, phase play", d.first && d.first.carry === 0 && d.first.stash === 3 && d.first.phase === "play", JSON.stringify(d.first)],
  ["2  coin between water stays water", d.coinTile === "~", d.coinTile],
  ["2  come back with 1: escaped", d.picked === 1 && d.second && d.second.phase === "escaped" && d.second.stash === 4, JSON.stringify(d.second)],
  ["3  Den labels: IN THE DEN 3 / 4 and 3 ZEC IN THE DEN, no SHIELD/CARRYING", (d.trailText || []).includes("IN THE DEN 3 / 4") && (d.trailText || []).includes("3 ZEC IN THE DEN") && d.trailText.length === 2, JSON.stringify(d.trailText)],
  ["3  control: land den D keeps n/m label, start on land not shielded", (l.text || []).includes("3/4") && l.inShield === false, JSON.stringify(l)],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors.length) console.log(data.errors.join("\n"));
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
