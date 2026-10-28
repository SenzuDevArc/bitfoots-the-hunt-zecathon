"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const PAGE = `
for (let i = 0; i < 100 && !(typeof loadLevel === "function" && window.LEVELS); i++) await new Promise((r) => setTimeout(r, 100));
await new Promise((r) => setTimeout(r, 400));
const W = 24, H = 11, EDGE = 16, rows = [];
for (let y = 0; y < H; y++) { let r = ""; for (let x = 0; x < W; x++) r += (y === 0 || y === H - 1 || x === 0 || x === W - 1) ? "#" : x >= EDGE ? "~" : "."; rows.push(r); }
rows[3] = rows[3].slice(0, 12) + "P" + rows[3].slice(13);
rows[1] = "#D" + rows[1].slice(2);
rows[7] = rows[7].slice(0, 8) + "c" + rows[7].slice(9);
const fix = { title: "ACTORS FIXTURE", tid: "actorsfix", features: [], act: 1, par: 999, need: 99, decoys: 0, hunters: [], map: rows, copy: { goal: "f", lesson: "f", dev: "f" } };
LEVELS.push(fix);
const idx = LEVELS.length - 1;
let feed = null;
inputFeed = () => feed || { x: 0, y: 0, a: 0, s: 0 };
const go = (x, y) => { feed = { x, y, a: 0, s: 0 }; };
const stop = () => { feed = null; };
function begin(flags) {
  Object.keys(fix).forEach((k) => { if (!["title","tid","features","act","par","need","decoys","hunters","map","copy"].includes(k)) delete fix[k]; });
  Object.assign(fix, flags || {});
  startLevel(idx); loadLevel(idx, false); autopilot = null; game.screen = "play"; game.phase = "play"; stop();
}
function run(sec, until) { for (let i = 0, n = Math.round(sec * 60); i < n; i++) { step(STEP); if (until && until()) return true; } return false; }
const out = { phase0: null };

let calls = 0;
window.bankHold = () => { calls++; return true; };
begin(); out.phase0 = game.phase;
go(1, 0); let maxX = 0;
for (let i = 0; i < 180; i++) { step(STEP); maxX = Math.max(maxX, player.x); }
out.hold = { maxX: Math.round(maxX * 1000) / 1000, edgePx: EDGE * T, inShield: player.inShield, calls };

calls = 0; window.bankHold = () => { calls++; return false; };
begin(); go(1, 0); run(3, () => player.inShield);
out.free = { inShield: player.inShield, x: Math.round(player.x), calls };
delete window.bankHold;

function leaveChanged(flags) {
  begin(flags); player.carry = 2; go(1, 0); run(3, () => player.inShield); run(0.5);
  player.carry = 1; go(-1, 0); run(3, () => !player.inShield); stop();
  return { left: !player.inShield, entryCarry: player.entry && player.entry.carry, pending: game.unmatchedPending };
}
out.noUnmatched = leaveChanged({ amounts: true, noUnmatched: true });
out.unmatchedControl = leaveChanged({ amounts: true });

function emptyWalk(flags) {
  begin(flags);
  player.x = (EDGE + 2.5) * T; player.y = 7.5 * T; player.vx = player.vy = 0;
  run(0.2); const inW = player.inShield;
  go(-1, 0); run(4, () => !player.inShield);
  const atExit = prints.length, x0 = player.x, carryExit = player.carry;
  run(6, () => player.x <= x0 - 6 * T);
  const after6 = prints.length, carry6 = player.carry, walked = Math.round((x0 - player.x) / T * 10) / 10;
  run(6, () => player.carry > 0);
  const atCoin = prints.length, xc = player.x;
  run(4, () => player.x <= xc - 3 * T); stop();
  return { inWaterFirst: inW, carryExit, atExit, after6, walked, carry6, coinCarry: player.carry, atCoin, after3: prints.length };
}
out.empty = emptyWalk({ emptyNoPrints: true });
out.emptyControl = emptyWalk({});

calls = 0; window.bankHold = () => { calls++; return true; };
begin();
const ty = 5, r = T * 0.3, saved = grid[ty - 1][EDGE - 1];
grid[ty - 1][EDGE - 1] = "#";
player.x = EDGE * T - 1; player.y = (ty + 0.5) * T - 0.5 * T + r + 0.5; player.vx = player.vy = 0;
const px0 = player.x, hw0 = hitsWall, seen = [];
hitsWall = function () { seen.push(arguments[4] === true); return hw0.apply(this, arguments); };
slideOffCorner(0, -1, false, true, r);
hitsWall = hw0;
out.probe = { calls, moved: player.x !== px0, from: tileAt(player.x, player.y), slideTried: seen };
calls = 0; out.probe.control = { blocked: hitsWall(EDGE * T + 1, player.y, r, tileAt(player.x, player.y)), calls };
grid[ty - 1][EDGE - 1] = saved;
delete window.bankHold;
inputFeed = null;
return out;
`;

const r = spawnSync(process.execPath, [path.join(__dirname, "drive.js"), "/index.html", "-"], { input: PAGE, encoding: "utf8", timeout: 280000 });
let res;
try { res = JSON.parse(r.stdout); } catch (e) { console.log("FAIL could not run the page (INVALID, not a pass)\n" + r.stdout + r.stderr); process.exit(1); }
const o = res.result || {};
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) pass++; else fail++; console.log((cond ? "PASS " : "FAIL ") + name + (info !== undefined ? "  " + JSON.stringify(info) : "")); }

ok("fixture started in play", o.phase0 === "play", o.phase0);
ok("bankHold true: max x < water edge over 3 s of pushing, hook called", o.hold && o.hold.maxX < o.hold.edgePx && !o.hold.inShield && o.hold.calls > 0, o.hold);
ok("bankHold false (control): player enters, inShield true", o.free && o.free.inShield === true && o.free.calls > 0, o.free);
ok("noUnmatched: changed number out -> unmatchedPending null", o.noUnmatched && o.noUnmatched.left && o.noUnmatched.entryCarry === 2 && o.noUnmatched.pending === null, o.noUnmatched);
ok("control without noUnmatched: unmatchedPending set", o.unmatchedControl && o.unmatchedControl.left && o.unmatchedControl.pending !== null, o.unmatchedControl);
ok("old emptyNoPrints flag is dead: out empty + 6 tiles -> prints grow", o.empty && o.empty.inWaterFirst && o.empty.carryExit === 0 && o.empty.walked >= 6 && o.empty.carry6 === 0 && o.empty.after6 > o.empty.atExit, o.empty);
ok("after the coin, 3 tiles -> prints grow", o.empty && o.empty.coinCarry === 1 && o.empty.after3 > o.empty.atCoin, o.empty && { atCoin: o.empty.atCoin, after3: o.empty.after3 });
ok("control without the flag: the same empty walk leaves prints", o.emptyControl && o.emptyControl.carryExit === 0 && o.emptyControl.walked >= 6 && o.emptyControl.after6 > o.emptyControl.atExit, o.emptyControl);
ok("corner slide toward the water: the bank is never asked, no move", o.probe && JSON.stringify(o.probe.slideTried) === "[true]" && o.probe.calls === 0 && !o.probe.moved && o.probe.from === ".", o.probe);
ok("control: a real move across the same edge asks the bank", o.probe && o.probe.control.calls === 1 && o.probe.control.blocked === true, o.probe && o.probe.control);
ok("0 console errors", Array.isArray(res.errors) && res.errors.length === 0, res.errors);
console.log(`\nTRAIL ACTORS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
