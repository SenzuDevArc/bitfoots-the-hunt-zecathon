"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");
const SHOTS = process.env.SHOTS || path.join(__dirname, "..", "shots");

const BODY = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && BH.funGags && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const li = LEVELS.findIndex(l => l.tid === "wise");
loadLevel(li, false); game.screen = "play";
const S = BH.trailFeature.api.state; S.tourPending = false; S.cinePending = false; S.introDone = true; S.tour = null;
document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play";
ghost = true; autopilot = null;
const h = hunters.find(x => x.fg && x.fg.mode === "sleep");
if (!h) return { err: "no sleeper" };
const P = CanvasRenderingContext2D.prototype, ft0 = P.fillText;
let labels = 0;
P.fillText = function (t) { if (t === "WAKE") labels++; return ft0.apply(this, arguments); };
player.x = 22.5 * T; player.y = 2.5 * T; player.vx = player.vy = 0;
await wait(600);
const d = () => Math.hypot(player.x - h.x, player.y - h.y) / T;
const targets = [4.0, 3.0, 2.2], out = { samples: [], trace: [], shots: [] };
keys["s"] = true;
const t0 = performance.now();
let ti = 0;
while (ti < targets.length && performance.now() - t0 < 8000) {
  await new Promise(r => requestAnimationFrame(r));
  out.trace.push([+d().toFixed(2), +h.fg.wake.toFixed(3)]);
  if (d() <= targets[ti]) {
    labels = 0;
    render();
    const m = BH.funGags.meterInfo ? BH.funGags.meterInfo() : null;
    const sx = m ? m.sx + 20 : canvas.width / 2, sy = m ? m.sy + 90 : canvas.height / 2;
    const cut = document.createElement("canvas"); cut.width = 360; cut.height = 260;
    cut.getContext("2d").drawImage(canvas, sx - 180, sy - 170, 360, 260, 0, 0, 360, 260);
    out.samples.push({ dist: +d().toFixed(2), wake: +h.fg.wake.toFixed(3), labels, meter: m, mode: h.fg.mode });
    out.shots.push(cut.toDataURL("image/png"));
    ti++;
  }
}
keys["s"] = false;
const fr = () => new Promise(r => requestAnimationFrame(r));
out.back = [];
keys["w"] = true;
for (let t1 = performance.now(); d() < 4.2 && performance.now() - t1 < 4000;) { await fr(); out.back.push([+d().toFixed(2), +h.fg.wake.toFixed(3), +(h.fg.shown || 0).toFixed(3)]); }
keys["w"] = false;
out.close = [];
for (let t2 = performance.now(); h.fg && h.fg.mode === "sleep" && performance.now() - t2 < 8000;) {
  const dx = h.x - player.x, dy = h.y - player.y;
  keys["d"] = dx > 4; keys["a"] = dx < -4; keys["s"] = dy > 4; keys["w"] = dy < -4;
  await fr();
  out.close.push([+d().toFixed(2), +h.fg.wake.toFixed(3), h.fg.mode]);
}
keys["d"] = keys["a"] = keys["s"] = keys["w"] = false;
P.fillText = ft0;
out.mode = h.fg ? h.fg.mode : "none";
out.zoom = zoom;
return out;
`;

const r = spawnSync(process.execPath, [path.join(__dirname, "drive.js"), "/index.html?unlock", "-", "1920,1080"], { input: BODY, encoding: "utf8", timeout: 240000, env: process.env });
let d; try { d = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = d.result || {};
if (o.err || o.__ex) { console.log(JSON.stringify(o)); process.exit(1); }
fs.mkdirSync(SHOTS, { recursive: true });
(o.shots || []).forEach((u, i) => { const f = path.join(SHOTS, `wake-${i + 1}-${o.samples[i].dist}t.png`); fs.writeFileSync(f, Buffer.from(u.split(",")[1], "base64")); o.samples[i].shot = f; });
const checks = [];
const add = (n, ok, v) => checks.push([n, !!ok, v]);
const s = o.samples || [];
add("0 console errors", d.errors.length === 0, d.errors.slice(0, 3).join(" | ") || 0);
add("3 samples taken while still asleep", s.length === 3 && s.every(x => x.mode === "sleep"), JSON.stringify(s.map(x => [x.dist, x.mode])));
add("WAKE label drawn at every sample", s.every(x => x.labels > 0), s.map(x => x.labels).join(","));
add("wake value rises with each step closer", s.length === 3 && s[0].wake < s[1].wake && s[1].wake < s[2].wake, s.map(x => x.wake).join(" < "));
add("filled bar on screen grows at every sample (screen px)", s.length === 3 && s.every(x => x.meter) && s[0].meter.fillPx < s[1].meter.fillPx && s[1].meter.fillPx < s[2].meter.fillPx && s[0].meter.fillPx >= 2, s.map(x => x.meter && x.meter.fillPx).join(" < "));
const tr = o.trace || [], rises = tr.filter((p, i) => i && p[1] < tr[i - 1][1] - 1e-6 && p[0] < 4.5).length;
add("walking toward him inside the wake ring the value never drops", rises === 0, `${rises} drops over ${tr.length} frames`);
const b0 = (o.back || [[0]])[0][0], bk = (o.back || []).filter(p => p[0] < 4.5 && p[0] > b0 + 0.05), bkUp = bk.filter((p, i) => i && p[1] > bk[i - 1][1] + 1e-6).length;
add("backing away the value never rises", bk.length > 5 && bkUp === 0, `${bkUp} rises over ${bk.length} frames`);
add("backing away the bar falls clearly", bk.length > 5 && bk[bk.length - 1][2] < bk[0][2] - 0.15, bk.length && `${bk[0][2]} -> ${bk[bk.length - 1][2]} shown, ${bk[0][0]}t -> ${bk[bk.length - 1][0]}t`);
const cl = o.close || [], woke = cl.find(p => p[2] !== "sleep"), lastSleep = [...cl].reverse().find(p => p[2] === "sleep");
add("walking right up to him wakes him", !!woke, woke ? `woke at ${woke[0]}t, last asleep frame ${JSON.stringify(lastSleep)}` : `still asleep, last ${JSON.stringify(cl[cl.length - 1])}`);
const LOG = path.join(SHOTS, "wake-frames.json");
fs.writeFileSync(LOG, JSON.stringify({ approach: tr, back: o.back, close: o.close }));
console.log("frame log: " + LOG);
for (const [n, ok, v] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${n}  (${v})`);
console.log(JSON.stringify({ zoom: o.zoom, samples: s }, null, 1));
process.exit(checks.every(c => c[1]) ? 0 : 1);
