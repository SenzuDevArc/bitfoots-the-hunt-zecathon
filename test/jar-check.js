"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.river && BH.jar && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const out = {};
const MAP6 = [
  "####################################",
  "#.........#....ZZZZZZZZZZZZ.j......#",
  "#..c......#....................##..#",
  "#P............V~~~~~~~~~~~~~~~~~~~~#",
  "#..c......##...~~~~~~~~~~~~~~~~~~~~#",
  "#.........##...~~~~~~~~~U~~~~~~~~~~#",
  "#..c...........~~~~~~~~~~~~~~~~~~~~#",
  "#.....##.......~~~~~~~~~~~~~~~~~~~~#",
  "#.....##......#YYYYYYYYYYYYYYYYYYYY#",
  "#.............#~~~~~~~~~~~~~~d~~~~~#",
  "#.............#~~~~~~~~~~~~~~~~~~~~#",
  "####################################"];
const PLAIN = [
  "##########",
  "#P.......#",
  "#~~~~~~~~#",
  "##########"];
let pushed = 0;
function fixture(map, extra) {
  const lv = Object.assign({ title: "JAR FIXTURE", tid: "jarfix", act: 1, par: 999, need: 99, map: map, features: [],
    hunters: [], copy: { goal: "t", lesson: "t", dev: "t" } }, extra || {});
  LEVELS.push(lv); pushed++;
  startLevel(LEVELS.length - 1);
  if (game.levelIdx !== LEVELS.length - 1) loadLevel(LEVELS.length - 1, false);
  autopilot = null;
  return lv;
}
function run(sec, each) { for (let i = 0, n = Math.round(sec / STEP); i < n; i++) { step(STEP); if (each) each(i); } }
function jarDraw() {
  const got = [], P = CanvasRenderingContext2D.prototype, keep = { fillText: P.fillText, strokeText: P.strokeText, lineTo: P.lineTo, stroke: P.stroke };
  let lines = 0;
  P.fillText = function (t) { got.push(String(t)); return keep.fillText.apply(this, arguments); };
  P.strokeText = function (t) { got.push(String(t)); return keep.strokeText.apply(this, arguments); };
  P.lineTo = function () { lines++; return keep.lineTo.apply(this, arguments); };
  P.stroke = function () { lines++; return keep.stroke.apply(this, arguments); };
  ctx.save();
  try { BH.features.get("jar").onDrawWorld(ctx); } finally { Object.assign(P, keep); ctx.restore(); }
  return { text: got, lines: lines };
}
const POST = { x: 24.5 * T, y: 5.5 * T };

fixture(MAP6, { shelfTracker: [[18, 2], [24, 2]], hunters: [{ type: "hunter", patrol: [[4, 6], [13, 6]] }] });
let I = BH.jar.info();
out.load = { phase: game.phase, attached: activeFeatures.some(f => f.id === "jar"), shelf: I.shelf, boxes: I.boxes, tokens: I.tokens,
  tracker: !!I.tracker, hunters: hunters.length, trackerInHunters: hunters.some(h => h.type === "tracker" || h.type === "shelfTracker"),
  solid: { Z: solidP("Z"), j: solidP("j") }, tiles: { Z: !!BH.tiles.get("Z"), j: !!BH.tiles.get("j") } };

ghost = true;
let a0 = BH.jar.info(), s0 = strings.length;
BH.river.spent(POST.x, POST.y, 2);
run(0.4); render();
const mid = jarDraw();
run(1.0);
let a1 = BH.jar.info();
out.spend = { tokens: a1.tokens - a0.tokens, made: a1.made - a0.made, boxes: a1.boxes - a0.boxes, ambient: a1.ambient - a0.ambient,
  strings: strings.length - s0, lines: mid.lines, text: mid.text, flyingMid: null };
a0 = BH.jar.info();
BH.river.pay({ id: "merchant", x: POST.x, y: POST.y }, 1, "MERCHANT");
run(1.2);
a1 = BH.jar.info();
out.payIn = { tokens: a1.tokens - a0.tokens, made: a1.made - a0.made };
{ const P = CanvasRenderingContext2D.prototype, k = P.stroke; let n = 0; P.stroke = function () { n++; return k.apply(this, arguments); };
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, 4); ctx.stroke(); P.stroke = k; out.lineSpyControl = n; }

let closes = [], lastDone = BH.jar.info().done;
run(14, () => {
  const i = BH.jar.info();
  if (i.done !== lastDone) { lastDone = i.done; closes.push({ c: i.cycles[i.cycles.length - 1], boxes: i.boxes }); }
});
out.hop = closes.map(x => ({ visited: new Set(x.c).size, inOrder: x.c.every((v, k) => v === k), boxes: x.boxes }));

a0 = BH.jar.info();
const dd = BH.jar.demoDouble();
run(0.5); render(); const ddDraw = jarDraw();
run(3);
a1 = BH.jar.info();
out.demo = { ran: dd, tokens: a1.tokens - a0.tokens, bounced: a1.bounced - a0.bounced, text: ddDraw.text, lines: ddDraw.lines };
a0 = BH.jar.info();
const jx = 28.5 * T, jy = 1.5 * T;
BH.jar.drop("ctl-a", jx - 2 * T, jy); BH.jar.drop("ctl-b", jx - 2 * T, jy);
run(1.5);
a1 = BH.jar.info();
out.demoControl = { tokens: a1.tokens - a0.tokens, bounced: a1.bounced - a0.bounced };

a0 = BH.jar.info(); const r0 = BH.river.info().ripples;
run(22);
a1 = BH.jar.info();
out.ambient = { ambient: a1.ambient - a0.ambient, boxes: a1.boxes - a0.boxes, ripples: BH.river.info().ripples - r0, tokens: a1.tokens - a0.tokens };

fixture(MAP6, { shelfTracker: [[18, 2], [24, 2]] });
ghost = false;
let maxD = 0, ph = [];
run(5, () => { const k = BH.jar.info().tracker; player.x = k.x; player.y = k.y; player.vx = 0; player.vy = 0;
  const k2 = BH.jar.info().tracker; maxD = Math.max(maxD, Math.hypot(player.x - k2.x, player.y - k2.y)); if (game.phase !== "play") ph.push(game.phase); });
const tr = BH.jar.info().tracker;
out.standOn = { phase: game.phase, notPlay: ph.length, maxDistPx: Math.round(maxD), hunters: hunters.length, trackerMoved: Math.abs(tr.x - 18.5 * T) > 4 || Math.abs(tr.x - 24.5 * T) > 4 };
fixture(MAP6, { shelfTracker: [[18, 2], [24, 2]], hunters: [{ type: "hunter", patrol: [[20, 2], [21, 2]] }] });
ghost = false;
run(5, () => { if (game.phase !== "play") return; const k = BH.jar.info().tracker; player.x = hunters[0].x; player.y = hunters[0].y; });
out.catchControl = { phase: game.phase, loseReason: game.loseReason };

fixture(PLAIN);
out.plain = { info: BH.jar.info(), attached: activeFeatures.some(f => f.id === "jar") };

fixture(MAP6, { shelfTracker: [[18, 2], [24, 2]] });
ghost = true;
player.x = 22.5 * T; player.y = 2.5 * T; cam.x = player.x; cam.y = player.y;
run(3);
BH.river.spent(POST.x, POST.y, 2); BH.jar.demoDouble();
run(0.45); render();
out.shotReady = true;
return out;
`;

const drive = path.join(__dirname, "drive.js");
const shot = process.argv.includes("--shot");
const page = shot ? PAGE.replace("return out;", "window.__JAR = out; await new Promise(r => setTimeout(r, 50)); const c = document.querySelector('canvas'); out.png = c ? c.toDataURL('image/png') : null; return out;") : PAGE;
const r = spawnSync(process.execPath, [drive, "/index.html?unlock", "-"], { input: page, encoding: "utf8", timeout: 280000, env: process.env, maxBuffer: 64 * 1024 * 1024 });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = data.result || {};
if (shot && o.png) { const f = path.join(__dirname, "..", "jar-shot.png"); require("fs").writeFileSync(f, Buffer.from(o.png.split(",")[1], "base64")); console.log("shot " + f); }
const hop = o.hop || [];
const full = hop.filter(h => h.visited === h.boxes && h.inOrder);
const checks = [
  ["0  0 console errors", data.errors.length === 0, data.errors.length],
  ["0  level-6 map loads with the jar on, 12 shelf boxes, 0 tokens", o.load.phase === "play" && o.load.attached && o.load.shelf === 12 && o.load.boxes === 12 && o.load.tokens === 0, JSON.stringify(o.load)],
  ["0  Z and j registered and solid", o.load.tiles.Z && o.load.tiles.j && o.load.solid.Z && o.load.solid.j, JSON.stringify(o.load.solid)],
  ["1  one spend: jar tokens +1", o.spend.tokens === 1, `+${o.spend.tokens}`],
  ["1  one spend: shelf boxes +1 (besides ambient)", o.spend.made === 1 && o.spend.boxes - o.spend.ambient === 1, `made +${o.spend.made}, boxes +${o.spend.boxes}, ambient +${o.spend.ambient}`],
  ["1  0 strings from jar or shelf", o.spend.strings === 0, `+${o.spend.strings}`],
  ["1  jar/shelf draw 0 lines while the token flies", o.spend.lines === 0, `${o.spend.lines} line calls`],
  ["1  control: the line spy counts a drawn line", o.lineSpyControl === 1, o.lineSpyControl],
  ["1  jar/shelf text is only \"?\" (no amount, no label)", o.spend.text.every(t => t === "?") && o.spend.text.length > 0, JSON.stringify(o.spend.text)],
  ["1  control: a payment IN adds a box, no token", o.payIn.made === 1 && o.payIn.tokens === 0, `box +${o.payIn.made}, tokens +${o.payIn.tokens}`],
  ["2  \"?\" visits every box index in one cycle (count = shelf size)", hop.length >= 2 && full.length === hop.length, JSON.stringify(hop)],
  ["3  demoDouble: jar +1, not +2; the second bounces", o.demo.ran && o.demo.tokens === 1 && o.demo.bounced === 1, `tokens +${o.demo.tokens}, bounced ${o.demo.bounced}`],
  ["3  demoDouble draws no text but \"?\" and no line", o.demo.text.every(t => t === "?") && o.demo.lines === 0, JSON.stringify(o.demo.text) + " lines " + o.demo.lines],
  ["3  control: two different tokens both go in", o.demoControl.tokens === 2 && o.demoControl.bounced === 0, `tokens +${o.demoControl.tokens}, bounced ${o.demoControl.bounced}`],
  ["4  ambient ripples elsewhere add boxes (no tokens)", o.ambient.ambient >= 2 && o.ambient.boxes === o.ambient.ambient && o.ambient.ripples === o.ambient.ambient && o.ambient.tokens === 0, JSON.stringify(o.ambient)],
  ["5  on the shelf tracker 5 s: never caught, he keeps walking", o.standOn.phase === "play" && o.standOn.notPlay === 0 && o.standOn.maxDistPx === 0 && o.standOn.trackerMoved, JSON.stringify(o.standOn)],
  ["5  hunters holds no tracker entry", o.load.hunters === 1 && !o.load.trackerInHunters && o.standOn.hunters === 0, `level-6 hunters ${o.load.hunters}, tracker in hunters ${o.load.trackerInHunters}`],
  ["5  control: a real hunter on the same spot catches", o.catchControl.phase !== "play", JSON.stringify(o.catchControl)],
  ["6  a level with no shelf or jar gets no jar", o.plain.info === null && !o.plain.attached, JSON.stringify(o.plain)],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors.length) console.log(data.errors.join("\n"));
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
