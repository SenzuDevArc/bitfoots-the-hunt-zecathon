"use strict";
const { spawnSync } = require("child_process"), path = require("path");
const PAGE = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const out = [];
for (let li = 0; li < LEVELS.length; li++) {
  loadLevel(li, true); game.screen = "play";
  for (let k = 0; k < 30; k++) step(1 / 60);
  for (let k = 0; k < 2400 && (BH.trailFeature.api.state.cine || BH.trailFeature.api.state.cinePending || player.x < 0 || player.y < 0); k++) {
    if (BH.talk.isOpen() && k % 20 === 0) dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true }));
    step(1 / 60); try { render(); } catch (e) {}
  }
  const S = BH.trailFeature.api.state, px = Math.floor(player.x / T), py = Math.floor(player.y / T), c0 = tile(px, py);
  const wet = typeof isWater === "function" && isWater(c0), ok = (c) => wet ? isWater(c) : (c === "." || c === "b");
  if (!ok(c0)) { out.push({ li, tid: LEVELS[li].tid, skipped: "player starts off the map (" + c0 + ")" }); continue; }
  const steps = new Map([[px + "," + py, 0]]), q = [[px, py]];
  while (q.length) { const [x, y] = q.shift(), d = steps.get(x + "," + y); if (d >= 4) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + "," + (y + dy); if (!steps.has(k) && ok(tile(x + dx, y + dy))) { steps.set(k, d + 1); q.push([x + dx, y + dy]); } } }
  const friends = (S.elders || []).map(e => { const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T), d = Math.hypot(e.x - player.x, e.y - player.y) / T; return { id: e.id, at: [tx, ty], reach: steps.has(tx + "," + ty), near: d <= 3.2 }; });
  out.push({ li, tid: LEVELS[li].tid, player: [px, py], friends });
}
return out;`;
const r = spawnSync(process.execPath, [path.join(__dirname, "drive.js"), "index.html", "-"], { input: PAGE, encoding: "utf8", timeout: 600000 });
let j; try { j = JSON.parse(r.stdout); } catch (e) { console.error("no result", r.stdout, r.stderr); process.exit(2); }
let bad = 0;
for (const l of j.result) {
  if (l.skipped) { console.log(String(l.li).padStart(2), l.tid.padEnd(10), "skip:", l.skipped); continue; }
  const off = l.friends.filter(f => !f.reach || !f.near);
  bad += off.length;
  console.log(String(l.li).padStart(2), l.tid.padEnd(10), off.length ? "FAIL " + JSON.stringify(off) : "PASS " + l.friends.map(f => f.id + "@" + f.at).join(" "));
}
if (j.errors.length) { console.log("page errors:", j.errors.slice(0, 5)); bad++; }
console.log(bad ? bad + " FRIEND(S) OFF THE START" : "ALL FRIENDS START NEXT TO YOU");
process.exit(bad ? 1 : 0);
