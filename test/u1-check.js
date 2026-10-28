"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");

const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && BH.doors && typeof loadLevel === "function" && window.LEVELS); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const TXT = new Set();
const P = CanvasRenderingContext2D.prototype, f0 = P.fillText;
P.fillText = function (t) { TXT.add(String(t)); return f0.apply(this, arguments); };
const TS = () => BH.trailFeature.api.state;
function noTour() { const s = TS(); if (s.cinePending && s.cineP0) { player.x = s.cineP0.x; player.y = s.cineP0.y; } s.tourPending = false; s.cinePending = false; if (s.tour) s.tour = null; s.cine = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play"; }
function run(sec) { for (let k = 0; k < Math.round(sec / STEP) && game.phase === "play"; k++) step(STEP); }
function at(tx, ty) { player.x = (tx + 0.5) * T; player.y = (ty + 0.5) * T; }
function open(tid) { loadLevel(trailIndexOf(tid), true); game.screen = "play"; noTour(); autopilot = null; run(0.2); }
const out = {};

open("doors");
hunters.forEach(h => { h.x = 1.5 * T; h.y = 1.5 * T; h.sp = 0; });
TXT.clear(); render();
const m = BH.u1.at();
out.start = { tid: L.tid, feats: L.features, info: BH.u1.info(), label: TXT.has("U1 ADDRESS"), denSign: TXT.has("RIVER SLOT"), wet: !!m && grid[Math.floor(m.y / T)][Math.floor(m.x / T)] === "~" };

player.carry = 3; player.stash = 0;
at(dens.tx, dens.ty); run(0.3);
out.refused = { phase: game.phase, carry: player.carry, stash: player.stash };

at(Math.floor(m.x / T), Math.floor(m.y / T)); run(0.2);
out.sent = { carry: player.carry, info: BH.u1.info() };
run(2.5);
out.landed = { stash: player.stash, info: BH.u1.info() };

const npc = (id) => L.npcs.filter(n => n.id === id)[0].at;
at(npc("pine")[0] - 1, npc("pine")[1]); run(2.2);
at(npc("merchant")[0], npc("merchant")[1]); run(2.2);
out.doors = { doors: BH.doors.info(), stash: player.stash, noDoors: !L.doors && L.copy.goal.indexOf("door") < 0 };

player.carry = L.need - player.stash;
at(Math.floor(m.x / T), Math.floor(m.y / T)); run(2.8);
for (let k = 0; k < 25 && game.phase === "play"; k++) { at(dens.tx, dens.ty); run(1); }
out.end = { phase: game.phase, stash: player.stash };
TXT.clear(); render();
out.shot1 = ctx.canvas.toDataURL("image/png");

open("doors");
const h0 = hunters[0], wet = (x, y) => grid[Math.floor(y / T)][Math.floor(x / T)] === "~";
let inWater = 0;
at(1, 6); h0.x = 15.5 * T; h0.y = 4.5 * T; h0.state = "chase"; h0.target = { x: dens.x, y: dens.y }; h0.path = []; h0.pathKey = "";
for (let k = 0; k < Math.round(6 / STEP) && game.phase === "play"; k++) { step(STEP); if (h0.state === "chase") h0.target = { x: dens.x, y: dens.y }; if (wet(h0.x, h0.y)) inWater++; }
out.dry = { inWater, at: [Math.floor(h0.x / T), Math.floor(h0.y / T)], denWet: wet(dens.x, dens.y) };

open("bank");
TXT.clear(); render(); run(0.5); TXT.clear(); render();
out.bank = { tid: L.tid, feats: L.features, info: BH.u1 ? BH.u1.info() : "absent", texts: [...TXT].filter(t => /U1/.test(t)) };
return out;
`;

const drive = path.join(__dirname, "drive.js");
const r = spawnSync(process.execPath, [drive, "/index.html?unlock", "-"], { input: PAGE, encoding: "utf8", timeout: 280000, maxBuffer: 64 * 1024 * 1024, env: process.env });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log("FAIL no result from the page", String(r.error || ""), String(r.stdout).slice(0, 400), String(r.stderr).slice(0, 400)); process.exit(1); }
const o = data.result || {}, J = JSON.stringify;
const shotDir = process.argv[2];
if (shotDir && o.shot1) { fs.mkdirSync(shotDir, { recursive: true }); fs.writeFileSync(path.join(shotDir, "u1-doors.png"), Buffer.from(o.shot1.split(",")[1], "base64")); }
const s = o.start || {}, rf = o.refused || {}, sn = o.sent || {}, ld = o.landed || {}, d = o.doors || {}, e = o.end || {}, b = o.bank || {};
const checks = [
  ["1  u1 attached to doors, machine stands in the water, labelled U1 ADDRESS", s.tid === "doors" && (s.feats || []).indexOf("u1") >= 0 && s.wet && s.label, J(s)],
  ["1  the old den sign is gone", s.denSign === false, s.denSign],
  ["2  the den refuses carried coins (still carrying 3, nothing banked, still playing)", rf.phase === "play" && rf.carry === 3 && rf.stash === 0, J(rf)],
  ["3  the machine takes them: carry 0, 3 sent", sn.carry === 0 && sn.info && sn.info.sent === 3, J(sn)],
  ["3  they land in the den", ld.stash === 3 && ld.info && ld.info.landed === 3, J(ld)],
  ["4  both payers pay straight into the den, no doors", d.doors && d.doors.paid.length === 2 && d.doors.landed === 2 && d.stash === 5 && d.noDoors, J(d)],
  ["5  the rest through the machine, then the den lets you finish", e.phase === "escaped", J(e)],
  ["7  the den sits in the water, and a hunter sent at it never steps on water", o.dry && o.dry.denWet && o.dry.inWater === 0, J(o.dry)],
  ["6  control: GOING PRIVATE has no u1", b.tid === "bank" && (b.feats || []).indexOf("u1") < 0 && (b.info === null || b.info === "absent") && (b.texts || []).length === 0, J(b)],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors && data.errors.length) { bad++; console.log(data.errors.join("\n")); }
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
