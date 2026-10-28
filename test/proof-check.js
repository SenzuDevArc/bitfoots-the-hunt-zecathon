"use strict";
const { spawnSync } = require("child_process");
const path = require("path"), fs = require("fs");

const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && BH.dam && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const out = {};
const TS = () => BH.trailFeature.api.state;
function noTour() { const s = TS(); if (s.cinePending && s.cineP0) { player.x = s.cineP0.x; player.y = s.cineP0.y; cam.x = player.x; cam.y = player.y; } s.tourPending = false; s.cinePending = false; if (s.tour) s.tour = null; s.cine = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play"; }
function run(sec, each) { for (let i = 0, n = Math.round(sec / STEP); i < n; i++) { step(STEP); if (each) each(i); } }
function at(tx, ty) { player.x = (tx + 0.5) * T; player.y = (ty + 0.5) * T; }
const info = () => (BH.proof && BH.proof.info) ? BH.proof.info() : null;
function spy(fn) {
  const got = [], P = CanvasRenderingContext2D.prototype, keep = { fillText: P.fillText, strokeText: P.strokeText, lineTo: P.lineTo, stroke: P.stroke };
  let lines = 0;
  P.fillText = function (t) { got.push(String(t)); return keep.fillText.apply(this, arguments); };
  P.strokeText = function (t) { got.push(String(t)); return keep.strokeText.apply(this, arguments); };
  P.lineTo = function () { lines++; return keep.lineTo.apply(this, arguments); };
  P.stroke = function () { lines++; return keep.stroke.apply(this, arguments); };
  ctx.save();
  try { fn(); } finally { Object.assign(P, keep); ctx.restore(); }
  return { text: got, lines: lines };
}
const def = BH.features.get("proof");
const drawProof = () => spy(() => { if (def && def.onDrawWorld) def.onDrawWorld(ctx); });

const i = trailIndexOf("dam");
out.attached = { idx: i, inLevel: (LEVELS[i].features || []).indexOf("proof") >= 0, registered: !!def };
loadLevel(i, true); game.screen = "play"; noTour(); autopilot = null; ghost = true;
if (game.phase !== "play") game.phase = "play";
out.active = activeFeatures.some(f => f.id === "proof");
out.lineSpyControl = spy(() => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, 1); }).lines;

at(5, 6); run(1);
out.before = info();
player.carry = 3; at(10, 6); run(0.2); at(11, 6); run(0.1);
out.cross = { crossed: BH.dam.info().crossed, carry: player.carry };
const text = new Set(); let lines = 0, validSeen = false;
run(3, (k) => { if (k % 6) return; const d = drawProof(); d.text.forEach(t => text.add(t)); lines += d.lines; if (d.text.indexOf("PAYMENT VALID") >= 0) validSeen = true; });
out.beat = Object.assign({ text: [...text], lines, validSeen, carry: player.carry }, info());
out.control = { fresh: BH.proof ? BH.proof.offer(999) : null, again: BH.proof ? BH.proof.offer(999) : null, after: info() };
at(19, 3); run(0.2); at(20, 3); run(0.2); at(19, 3); run(0.2);
out.bank = info();
out.dam = BH.dam.info();
return out;
`;

const shotAt = process.argv.indexOf("--shot");
const SHOT = shotAt > 0 ? process.argv[shotAt + 1] : null;
const page = SHOT ? PAGE.replace("const text = new Set();", "run(0.25); render(); out.png = document.querySelector('canvas').toDataURL('image/png'); const text = new Set();") : PAGE;
const r = spawnSync(process.execPath, [path.join(__dirname, "drive.js"), "/index.html?unlock", "-"], { input: page, encoding: "utf8", timeout: 280000, env: process.env, maxBuffer: 64 * 1024 * 1024 });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = data.result || {}, b = o.beat || {}, c = o.control || {};
if (SHOT && o.png) { fs.writeFileSync(SHOT, Buffer.from(o.png.split(",")[1], "base64")); console.log("shot " + SHOT); }
const BANNED = /stamp|unlock|block|WAITING|DESHIELD|TOKEN|NULLIFIER|ZEC|ZATOSHI|—|\d/i;
const checks = [
  ["0  0 console errors", data.errors.length === 0, data.errors.length],
  ["0  proof is registered and on the dam level", o.attached && o.attached.registered && o.attached.inLevel && o.active, JSON.stringify(o.attached) + " active " + o.active],
  ["0  nothing fires before the gate", !!o.before && o.before.checks === 0 && o.before.tags === 0, JSON.stringify(o.before)],
  ["1  control: the dam counts 3 coins through the gate", o.cross && o.cross.crossed === 3, JSON.stringify(o.cross)],
  ["1  one crossing = one proof check", b.checks === 1, b.checks],
  ["1  PAYMENT VALID is drawn during the beat", b.validSeen === true, JSON.stringify(b.text)],
  ["2  3 coins = 3 used tags in the jar", b.tags === 3 && b.flying === 0, `tags ${b.tags}, flying ${b.flying}`],
  ["3  the trickster's copy is refused; jar and pouch unchanged", b.refused === 1 && b.trick && b.trick.done && b.trick.ok === false && b.tags === 3 && b.carry === (o.cross && o.cross.carry), JSON.stringify({ refused: b.refused, trick: b.trick, carry: b.carry })],
  ["3  REFUSED: ALREADY SPENT is drawn", (b.text || []).indexOf("REFUSED: ALREADY SPENT") >= 0, ""],
  ["4  no digit, amount, address or banned word on screen", (b.text || []).length > 0 && b.text.every(t => !BANNED.test(t)), JSON.stringify(b.text)],
  ["4  0 lines drawn from a tag to anything", b.lines === 0, b.lines],
  ["4  control: the line spy counts a drawn line", o.lineSpyControl >= 1, o.lineSpyControl],
  ["5  control: a different tag still goes in, the same one again does not", c.fresh === true && c.again === false && c.after && c.after.tags === 4 && c.after.refused === 2, JSON.stringify(c)],
  ["6  a bank crossing fires no proof check", o.bank && o.bank.checks === 1, JSON.stringify(o.bank)],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors.length) console.log(data.errors.join("\n"));
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
