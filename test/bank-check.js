"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.bank && typeof loadLevel === "function" && window.LEVELS); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const out = {};
const EDGE = 16, Wd = 26, Hd = 12;
function makeMap(withV) {
  const rows = [];
  for (let y = 0; y < Hd; y++) { let r = ""; for (let x = 0; x < Wd; x++) r += (y === 0 || y === Hd - 1 || x === 0 || x === Wd - 1) ? "#" : x >= EDGE ? "~" : "."; rows.push(r.split("")); }
  rows[5][2] = "P"; rows[5][22] = "d";
  rows[2][3] = "c"; rows[2][5] = "c"; rows[9][3] = "c"; rows[9][5] = "c";
  if (withV) rows[3][EDGE - 1] = "V";
  return rows.map(r => r.join(""));
}
const BASE = { title: "BANK FIXTURE", tid: "bankfix", act: 1, par: 999, need: 99, decoys: 0, hunters: [], copy: { goal: "f", lesson: "f", dev: "f" } };
let feed = null;
inputFeed = () => feed || { x: 0, y: 0, a: 0, s: 0 };
const go = (x, y) => { feed = { x, y, a: 0, s: 0 }; };
const stop = () => { feed = null; };
function begin(extra, withV) {
  const lv = Object.assign({}, BASE, { map: makeMap(withV !== false), features: ["bank"], bank: true, amounts: true,
    piles: { A: [1, 1, 8, 3], B: [1, 8, 8, 10] } }, extra || {});
  LEVELS.push(lv);
  const idx = LEVELS.length - 1;
  startLevel(idx); if (game.levelIdx !== idx) loadLevel(idx, false);
  autopilot = null; game.screen = "play"; game.phase = "play"; stop();
  return lv;
}
function run(sec, until) { for (let i = 0, n = Math.round(sec * 60); i < n; i++) { step(STEP); if (until && until()) return true; } return false; }
function put(tx, ty) { player.x = (tx + 0.5) * T; player.y = (ty + 0.5) * T; player.vx = player.vy = 0; step(STEP); }
function pressE() { const e = new KeyboardEvent("keydown", { code: "KeyE", key: "e", bubbles: true, cancelable: true }); dispatchEvent(e); return e.defaultPrevented; }
function drawn() {
  const got = [], P = CanvasRenderingContext2D.prototype, f0 = P.fillText;
  P.fillText = function (t) { got.push(String(t)); return f0.apply(this, arguments); };
  try { render(); } finally { P.fillText = f0; }
  return got;
}
function enter() { go(1, 0); const ok = run(3, () => player.inShield); stop(); return ok; }
function leave() { go(-1, 0); const ok = run(3, () => !player.inShield); stop(); run(0.1); return ok; }
const realStamps = BH.stamps, lockCalls = [];
const stampsLive = !!(realStamps && typeof realStamps.count === "function" && typeof realStamps.ready === "function");
const bubbles = [], bubble0 = BH.talk.bubble;
BH.talk.bubble = function (ent, text) { bubbles.push(String(text)); return bubble0.apply(this, arguments); };
if (realStamps && realStamps.lock) { const l0 = realStamps.lock; realStamps.lock = function (n, need) { lockCalls.push([n, need]); return l0.apply(this, arguments); }; }
else BH.stamps = Object.assign(realStamps || {}, { lock: (n, need) => lockCalls.push([n, need]) });
out.stampsLive = stampsLive;
out.hookType = typeof window.bankHold;

function crossTimed(dir, sec) {
  const r = T * 0.3, old = new Set(floaters), fl = [];
  let tTouch = null, tCross = null, t = 0, prompt = [];
  go(dir, 0);
  for (let i = 0, n = Math.round(sec * 60); i < n; i++) {
    step(STEP); t += STEP;
    floaters.forEach(f => { if (!old.has(f)) { old.add(f); fl.push(f.text); } });
    const touch = dir > 0 ? player.x + r >= EDGE * T : player.x - r < EDGE * T;
    if (touch && tTouch == null) tTouch = t;
    if (tTouch != null && tCross == null) prompt = prompt.concat(drawn().filter(s => /SHIELD \d|DESHIELD|PRESS E|TAP:/.test(s)));
    if (tCross == null && (dir > 0 ? player.inShield : !player.inShield)) tCross = t;
    if (tCross != null && t - tCross > 0.2) break;
  }
  stop();
  return { touchToCross: tTouch != null && tCross != null ? Math.round((tCross - tTouch) * 1000) / 1000 : null, crossed: tCross != null, prompt,
    floats: fl };
}
begin();
put(EDGE - 3, 5); player.carry = 5;
const strings0 = strings.length;
out.hold = crossTimed(1, 3);
out.hold.eConsumed = pressE();
const inInfo = BH.bank.info();
out.inPlank = { planks: inInfo.planks, locks: lockCalls.slice(), stringsDelta: strings.length - strings0, ready: BH.stamps.ready() };
const s1 = strings.length;
out.out5 = { left: leave() };
const o5 = BH.bank.info();
out.out5.planks = o5.planks.map(p => p.text); out.out5.stringsDelta = strings.length - s1; out.out5.why = strings.slice(s1).map(s => s.why);
out.out5.drawnPlankText = drawn().filter(t => /^(IN|OUT) · /.test(t));

begin(); put(EDGE - 3, 5); player.carry = 5; enter(); put(EDGE + 2, 5); run(0.2);
out.exitHold = crossTimed(-1, 3);
out.exitHold.planksAfter = BH.bank.info().planks.map(p => p.text);
begin(); put(EDGE - 3, 5); player.carry = 2; enter(); player.carry = 0; put(EDGE + 2, 5); run(0.2);
out.exitEmpty = crossTimed(-1, 3); run(0.1);
out.exitEmpty.planks = BH.bank.info().planks.map(p => p.text);

begin(); put(EDGE - 3, 5); player.carry = 5; enter(); run(0.3);
player.carry = 4; const s2 = strings.length; leave();
out.out4 = { planks: BH.bank.info().planks.map(p => p.text), stringsDelta: strings.length - s2 };

begin();
put(3, 2); put(5, 2); put(3, 9); put(5, 9);
out.twoPiles = { carry: player.carry, bag: BH.bank.info().bag };
put(EDGE - 2, 5);
const s3 = strings.length; enter(); run(0.1);
out.twoPiles.strings = strings.slice(s3).map(s => ({ why: s.why, ax: s.ax / T, ay: s.ay / T, bx: s.bx / T, by: s.by / T }));
out.twoPiles.bagAfter = BH.bank.info().bag;

function onePileTrip(gapSec) {
  begin();
  put(3, 2); put(5, 2);
  put(EDGE - 2, 5); enter();
  put(22, 5); run(0.2);
  const atDen = { carry: player.carry, stash: player.stash };
  put(EDGE, 5); leave();
  const outEmpty = BH.bank.info().outs;
  if (gapSec) run(gapSec);
  put(3, 9); put(5, 9);
  const b0 = bubbles.length, s4 = strings.length;
  put(EDGE - 2, 5); enter(); run(0.1);
  const inf = BH.bank.info();
  return { atDen, outEmpty, ins: inf.ins, outs: inf.outs, planks: inf.planks.map(p => p.text), strings: strings.length - s4, linksTotal: links,
    remarks: bubbles.slice(b0), remarkCount: inf.remarks, phase: game.phase };
}
out.oneFast = onePileTrip(0);
const beat = (BH.stamps && BH.stamps.beat) || 2.5;
out.oneSlow = onePileTrip(beat * 4 + 0.2);
out.beat = beat;

begin({ features: [] }, false);
out.noV = { vMarkers: (featureApi.markers.V || []).length };
put(EDGE - 3, 5); player.carry = 3;
Object.assign(out.noV, crossTimed(1, 2)); out.noV.entered = player.inShield;
out.noV.planks = BH.bank.info().planks.map(p => p.text);

begin({ bank: false });
put(EDGE - 3, 5); player.carry = 3;
out.notBank = { entered: enter(), planks: BH.bank.info().planks.length, eConsumed: pressE() };
begin();
put(EDGE - 3, 5); player.carry = 0;
out.empty = { entered: enter(), planks: BH.bank.info().planks.length };

begin({ redLines: 3 });
BH.bank.link(2 * T, 2 * T, 4 * T, 9 * T, "SAME OWNER"); BH.bank.link(2 * T, 3 * T, 4 * T, 8 * T, "SAME OWNER"); run(0.2);
out.red = { at2: { phase: game.phase, n: BH.bank.redLines(), hud: drawn().filter(t => t.indexOf("RED LINES") === 0) } };
BH.bank.link(2 * T, 4 * T, 4 * T, 7 * T, "SAME OWNER"); run(0.2);
out.red.at3 = { phase: game.phase, n: BH.bank.redLines(), reason: game.loseReason };
begin();
out.red.noHud = drawn().filter(t => t.indexOf("RED LINES") === 0).length;

begin();
const ls0 = levelStart;
put(EDGE - 3, 5); player.carry = 5; BH.bank.plank(4 * T, 4 * T, "IN · 2 ZEC");
out.retry = { before: BH.bank.info().planks.length };
simTime = ls0; loadLevel(game.levelIdx, true);
const ri = BH.bank.info();
out.retry.sameStart = levelStart === ls0;
out.retry.after = { planks: ri.planks.length, ins: ri.ins };
BH.bank.plank(5 * T, 5 * T, "IN · 3 ZEC"); run(0.1); out.retry.keep = BH.bank.info().planks.length;

begin(); put(5, 5); run(0.5);
const pk = { x: 5.5 * T, y: 5.5 * T };
function grabRect(x0, y0, x1, y1) {
  render();
  const vw = W / zoom, vh = H / zoom, cxv = clampCam(cam.x, vw, cols * T), cyv = clampCam(cam.y, vh, rows * T);
  const sx = (q) => Math.round((W / 2 + (q - cxv) * zoom) * DPR), sy = (q) => Math.round((H / 2 + (q - cyv) * zoom) * DPR);
  const g = canvas.getContext("2d"), a = sx(x0), b = sy(y0);
  return Array.from(g.getImageData(a, b, Math.max(1, sx(x1) - a), Math.max(1, sy(y1) - b)).data);
}
const boardR = [pk.x - 20, pk.y - 28, pk.x + 20, pk.y - 17], postR = [pk.x - 2, pk.y - 12, pk.x + 2, pk.y + 4];
const diff = (A, B) => { let n = 0; for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) n++; return n; };
player.x = pk.x; player.y = pk.y; player.vx = player.vy = 0;
const spriteOn = grabRect(...boardR); player.x = 2.5 * T; const spriteOff = grabRect(...boardR);
const spriteReach = diff(spriteOn, spriteOff);
BH.bank.plank(pk.x, pk.y, "IN · 5 ZEC");
player.x = pk.x; player.y = pk.y; player.vx = player.vy = 0;
const onBoard = grabRect(...boardR), onPost = grabRect(...postR);
player.x = 2.5 * T; player.y = 5.5 * T;
const offBoard = grabRect(...boardR), offPost = grabRect(...postR);
out.cover = { boardDiff: diff(onBoard, offBoard), postDiff: diff(onPost, offPost), spriteReach, px: onBoard.length };

BH.talk.bubble = bubble0;
inputFeed = null;
for (let i = LEVELS.length - 1; i >= 0; i--) if (LEVELS[i].tid === "bankfix") LEVELS.splice(i, 1);
return out;
`;

const drive = path.join(__dirname, "drive.js");
const r = spawnSync(process.execPath, [drive, "/index.html?unlock", "-"], { input: PAGE, encoding: "utf8", timeout: 280000, env: process.env });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = data.result || {};
const J = JSON.stringify;
const checks = [
  ["0  0 console errors", data.errors.length === 0, data.errors.length],
  ["0  the game sets no bank hold (window.bankHold undefined)", o.hookType === "undefined", o.hookType],
  ["1  walking in with 5 is instant: edge touched -> in the water < 0.3 s, no E", o.hold.crossed && o.hold.touchToCross != null && o.hold.touchToCross < 0.3, `${o.hold.touchToCross} s`],
  ["1  no prompt on the way in, E not taken", o.hold.prompt.length === 0 && !o.hold.eConsumed, J(o.hold.prompt)],
  ["1  the amount floats up as you cross: EVERYONE SEES 5 ZEC", o.hold.floats.indexOf("EVERYONE SEES 5 ZEC") >= 0, J(o.hold.floats)],
  ["1  1 plank IN · 5 ZEC at the entry tile", o.inPlank.planks.length === 1 && o.inPlank.planks[0].text === "IN · 5 ZEC" && o.inPlank.planks[0].tx === 15 && o.inPlank.planks[0].ty === 5, J(o.inPlank.planks)],
  ["1  no padlock: 0 lock calls, all 5 spendable at once", J(o.inPlank.locks) === "[]" && o.inPlank.ready === 5, `${J(o.inPlank.locks)} ready ${o.inPlank.ready}`],
  ["2  out with 5: OUT · 5 ZEC plank + 1 LINKED string", o.out5.left && J(o.out5.planks) === J(["IN · 5 ZEC", "OUT · 5 ZEC"]) && o.out5.stringsDelta === 1 && o.out5.why[0] === "amount", `${J(o.out5.planks)} strings +${o.out5.stringsDelta} ${J(o.out5.why)}`],
  ["2  both planks drawn as signs", o.out5.drawnPlankText.length === 2, J(o.out5.drawnPlankText)],
  ["2b climbing out with 5 is instant: edge touched -> on land < 0.3 s, no prompt", o.exitHold.crossed && o.exitHold.touchToCross < 0.3 && o.exitHold.prompt.length === 0, `${o.exitHold.touchToCross} s ${J(o.exitHold.prompt)}`],
  ["2b OUT · 5 ZEC plank, EVERYONE SEES 5 ZEC floats up", J(o.exitHold.planksAfter) === J(["IN · 5 ZEC", "OUT · 5 ZEC"]) && o.exitHold.floats.indexOf("EVERYONE SEES 5 ZEC") >= 0, `${J(o.exitHold.planksAfter)} ${J(o.exitHold.floats)}`],
  ["2b control: climbing out empty: out, no plank, no float", o.exitEmpty.crossed && J(o.exitEmpty.planks) === J(["IN · 2 ZEC"]) && !o.exitEmpty.floats.some(f => /EVERYONE SEES/.test(f)), J(o.exitEmpty)],
  ["2  control: out with 4 of 5: OUT plank, 0 strings", J(o.out4.planks) === J(["IN · 5 ZEC", "OUT · 4 ZEC"]) && o.out4.stringsDelta === 0, `${J(o.out4.planks)} strings +${o.out4.stringsDelta}`],
  ["3  two piles in one trip: 1 SAME OWNER string, pile centre to pile centre", o.twoPiles.carry === 4 && o.twoPiles.strings.length === 1 && o.twoPiles.strings[0].why === "SAME OWNER" && o.twoPiles.strings[0].ay === 2.5 && o.twoPiles.strings[0].by === 9.5, J(o.twoPiles.strings)],
  ["3  pile tags clear once shielded", J(o.twoPiles.bag) === "[\"A\",\"A\",\"B\",\"B\"]" && o.twoPiles.bagAfter.length === 0, `${J(o.twoPiles.bag)} -> ${J(o.twoPiles.bagAfter)}`],
  ["4  one pile per trip: 2 IN planks, 0 OUT planks, 0 strings", o.oneFast.atDen.carry === 0 && o.oneFast.atDen.stash === 2 && o.oneFast.ins === 2 && o.oneFast.outs === 0 && o.oneFast.outEmpty === 0 && o.oneFast.strings === 0 && o.oneFast.linksTotal === 0, `${J(o.oneFast.planks)} links ${o.oneFast.linksTotal}`],
  ["4  second IN within 3 stamps: 1 remark, no digits", o.oneFast.remarkCount === 1 && o.oneFast.remarks.length === 1 && !/\d/.test(o.oneFast.remarks[0]), J(o.oneFast.remarks)],
  ["4  control: second IN after 4+ stamps: 0 remarks", o.oneSlow.remarkCount === 0 && o.oneSlow.remarks.length === 0 && o.oneSlow.ins === 2, `remarks ${o.oneSlow.remarkCount} (gap ${(o.beat * 4 + 0.2).toFixed(1)} s)`],
  ["5  no V, no bank in features: instant in, plank still happens", o.noV.vMarkers === 0 && o.noV.touchToCross < 0.3 && o.noV.entered && J(o.noV.planks) === J(["IN · 3 ZEC"]), J(o.noV)],
  ["6  control: not a bank level: walks in, no plank, E not taken", o.notBank.entered && o.notBank.planks === 0 && !o.notBank.eConsumed, J(o.notBank)],
  ["6  walking in empty: no hold, no plank", o.empty.entered && o.empty.planks === 0, J(o.empty)],
  ["7  2 red lines: still playing, no RED LINES counter on screen", o.red.at2.phase === "play" && o.red.at2.n === 2 && o.red.at2.hud.length === 0, J(o.red.at2)],
  ["7  3 red lines: still playing, only a hunter ends the run", o.red.at3.phase === "play" && o.red.at3.n === 3 && !o.red.at3.reason, J(o.red.at3)],
  ["7  control: no RED LINES HUD without L.redLines", o.red.noHud === 0, o.red.noHud],
  ["8  retry at the same instant: 0 planks, 0 ins", o.retry.sameStart && o.retry.before === 1 && o.retry.after.planks === 0 && o.retry.after.ins === 0, J(o.retry)],
  ["8  control: no retry, a new plank stays", o.retry.keep === 1, o.retry.keep],
  ["9  player standing on a plank: its board pixels unchanged (words fully visible)", o.cover && o.cover.px > 0 && o.cover.boardDiff === 0, J(o.cover)],
  ["9  control: the player really overlaps the plank (post pixels change; with no plank the sprite reaches the board rows)", o.cover && o.cover.postDiff > 0 && o.cover.spriteReach > 0, J(o.cover)],
];
console.log("SKIP 10 retired: no level stages Oak's same-amount climb-out line any more (line removed, stayin cut, river level starts in the water)");
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors.length) console.log(data.errors.join("\n"));
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
