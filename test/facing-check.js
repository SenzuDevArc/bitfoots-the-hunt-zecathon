"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && typeof loadLevel === "function" && window.LEVELS); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const TS = () => BH.trailFeature.api.state;
function noTour() { const s = TS(); if (s.cinePending && s.cineP0) { player.x = s.cineP0.x; player.y = s.cineP0.y; } s.tourPending = false; s.cinePending = false; if (s.tour) s.tour = null; s.cine = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play"; }
loadLevel(trailIndexOf("steps"), true); game.screen = "play"; noTour(); autopilot = null;
hunters.length = 0;
let IN = [0, 0], drawn = null;
window.inputVec = () => IN;
const d0 = window.drawBitfoot;
window.drawBitfoot = function (x, y, dir) { if (x === player.x && y === player.y + 10) drawn = dir; return d0.apply(this, arguments); };
function walk(v, sec) { IN = v; for (let k = 0; k < Math.round(sec / STEP); k++) { if (game.phase !== "play") game.phase = "play"; step(STEP); } IN = [0, 0]; drawn = null; render(); return { dir: player.dir, drawn }; }
const out = {};
out.right = walk([1, 0], 0.3);
out.left = walk([-1, 0], 0.3);
out.leftThenUpLeft = walk([-0.707, -0.707], 0.3);
out.leftThenUp = walk([0, -1], 0.3);
out.leftThenDown = walk([0, 1], 0.3);
walk([1, 0], 0.3);
out.rightThenUp = walk([0, -1], 0.3);
out.upRight = walk([0.707, -0.707], 0.3);
out.downLeft = walk([-0.707, 0.707], 0.3);
out.upLeftFromRight = (walk([1, 0], 0.3), walk([-0.6, -0.8], 0.3));
return out;
`;

const r = spawnSync(process.execPath, [path.join(__dirname, "drive.js"), "/index.html?unlock", "-"], { input: PAGE, encoding: "utf8", timeout: 120000, maxBuffer: 16 * 1024 * 1024, env: process.env });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log("FAIL no result from the page", String(r.error || ""), String(r.stdout).slice(0, 400), String(r.stderr).slice(0, 400)); process.exit(1); }
const o = data.result || {}, J = JSON.stringify;
const checks = [
  ["0  control: walking right draws right, walking left draws left", o.right && o.right.drawn === "right" && o.left && o.left.drawn === "left", J([o.right, o.left])],
  ["1  left + up together faces left", o.leftThenUpLeft && o.leftThenUpLeft.drawn === "left", J(o.leftThenUpLeft)],
  ["1  up after walking left still faces left", o.leftThenUp && o.leftThenUp.dir === "up" && o.leftThenUp.drawn === "left", J(o.leftThenUp)],
  ["1  down after walking left still faces left", o.leftThenDown && o.leftThenDown.dir === "down" && o.leftThenDown.drawn === "left", J(o.leftThenDown)],
  ["2  up after walking right faces right", o.rightThenUp && o.rightThenUp.drawn === "right", J(o.rightThenUp)],
  ["2  right + up together faces right", o.upRight && o.upRight.drawn === "right", J(o.upRight)],
  ["2  left + down together faces left", o.downLeft && o.downLeft.drawn === "left", J(o.downLeft)],
  ["2  mostly up, a little left (after facing right) turns left", o.upLeftFromRight && o.upLeftFromRight.drawn === "left", J(o.upLeftFromRight)],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors && data.errors.length) { bad++; console.log(data.errors.join("\n")); }
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
