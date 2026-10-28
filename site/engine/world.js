"use strict";

var HOSTILE_RED = "#e0634e";
var HOSTILE_KINDS = { hunter: 1, dog: 1, tracker: 1, matcher: 1, ranger: 1, drone: 1, camera: 1 };
function isHostileKind(kind) { return !!(kind && (HOSTILE_KINDS[kind] || (window.BH && BH.bosses && BH.bosses.get && BH.bosses.get(kind)))); }
function nameColor(kind, fallback) { return isHostileKind(kind) ? HOSTILE_RED : (fallback || C.ink); }

function bakeLevel() {
  bake = document.createElement("canvas"); bake.width = cols * T; bake.height = rows * T;
  var b = bake.getContext("2d");
  waterPath = new Path2D(); waterEdges = [];
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
    var c = grid[y][x], px = x * T, py = y * T;
    b.fillStyle = C.ground; b.fillRect(px, py, T, T);
    for (var k = 0; k < 5; k++) { var hx = hash(x * 7 + k, y * 13 - k), hy = hash(y * 5 + k, x * 3 + k); b.fillStyle = hx > 0.5 ? C.ground2 : C.ground3; b.fillRect(px + Math.floor(hx * 14) * 2, py + Math.floor(hy * 14) * 2, 2, 2); }
    if (isWater(c)) {
      b.fillStyle = C.water; b.fillRect(px, py, T, T); waterPath.rect(px, py, T, T);
      if (!isWater(tile(x, y - 1))) waterEdges.push([px, py, px + T, py]);
      if (!isWater(tile(x, y + 1))) waterEdges.push([px, py + T, px + T, py + T]);
      if (!isWater(tile(x - 1, y))) waterEdges.push([px, py, px, py + T]);
      if (!isWater(tile(x + 1, y))) waterEdges.push([px + T, py, px + T, py + T]);
    }
    if (c === "b") { b.fillStyle = "#0f2a10"; b.fillRect(px, py, T, T); }
  }
  for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) { var td = TILE_DEFS[grid[y][x]]; if (td && td.draw) td.draw(b, x * T, y * T, x, y); }
  for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) { if (grid[y][x] === "#") drawPine(b, x * T, y * T, hash(x, y)); if (grid[y][x] === "T") drawTower(b, x * T, y * T); }
  if (dens) drawDen(b, dens.tx * T, dens.ty * T);
}
function drawPine(b, px, py, r) {
  b.fillStyle = C.trunk; b.fillRect(px + 14, py + 24, 4, 6);
  [[4, 18, 24, 6], [7, 12, 18, 6], [10, 6, 12, 6], [13, 2, 6, 4]].forEach(function (l) {
    b.fillStyle = C.tree; b.fillRect(px + l[0], py + l[1], l[2], l[3]);
    b.fillStyle = r > 0.5 ? C.tree2 : C.tree3; b.fillRect(px + l[0] + 2, py + l[1], Math.floor(l[2] / 2) - 2, 2);
  });
}
function drawTower(b, px, py) {
  b.fillStyle = "#2c2c29"; b.fillRect(px + 6, py + 8, 20, 22);
  b.fillStyle = "#3a3a36"; b.fillRect(px + 4, py + 4, 24, 6); b.fillRect(px + 8, py + 14, 4, 16); b.fillRect(px + 20, py + 14, 4, 16);
  b.fillStyle = "#1b1b1b"; b.fillRect(px + 13, py + 20, 6, 10);
}
function drawDen(b, px, py) {
  b.fillStyle = "#2c2c29"; b.fillRect(px - 2, py + 6, T + 4, T - 6);
  b.fillStyle = "#3a3a36"; b.fillRect(px + 2, py + 2, T - 4, 8); b.fillRect(px - 2, py + 10, 6, 18); b.fillRect(px + T - 4, py + 10, 6, 18);
  b.fillStyle = "#050505"; b.fillRect(px + 8, py + 12, T - 16, T - 12); b.fillRect(px + 11, py + 9, T - 22, 3);
}

function snapshotWorld(x0, y0, x1, y1, pad, scale) {
  x0 -= pad * T; y0 -= pad * T; x1 += pad * T; y1 += pad * T;
  var w = x1 - x0, h = y1 - y0, cxw = (x0 + x1) / 2, cyw = (y0 + y1) / 2;
  if (scale) { w = 720 / scale; h = 360 / scale; }
  else { if (w < h * 2) w = h * 2; else h = w / 2; w = Math.max(w, 10 * T); h = w / 2; }
  x0 = cxw - w / 2; y0 = cyw - h / 2;
  var mw = cols * T, mh = rows * T;
  x0 = w <= mw ? Math.max(0, Math.min(mw - w, x0)) : (mw - w) / 2;
  y0 = h <= mh ? Math.max(0, Math.min(mh - h, y0)) : (mh - h) / 2;
  var cv = document.createElement("canvas"); cv.width = 720; cv.height = 360;
  var saved = ctx, s = 720 / w;
  try {
    ctx = cv.getContext("2d");
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 720, 360);
    ctx.setTransform(s, 0, 0, s, Math.round(-x0 * s), Math.round(-y0 * s));
    ctx.imageSmoothingEnabled = false;
    drawWorld(cxw, cyw, w, h);
    var url = cv.toDataURL("image/png");
    snapFrame = { x0: x0, y0: y0, w: w, h: h, url: url };
    return url;
  } catch (e) { return null; } finally { ctx = saved; }
}
var snapFrame = null;

var END_MAP_AR = 2.5;
function renderFullMap(cv, cssW) {
  var mw = cols * T, mh = rows * T, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var vw = Math.max(mw, mh * END_MAP_AR), vh = vw / END_MAP_AR, ox = (vw - mw) / 2, oy = (vh - mh) / 2;
  var pw = Math.max(1, Math.round(cssW * dpr)), ph = Math.max(1, Math.round(pw / END_MAP_AR));
  cv.width = pw; cv.height = ph;
  var s = pw / vw, u = dpr / s;
  var info = { prints: 0, total: prints.length, segments: 0, scale: +(s / dpr).toFixed(3), tracked: false, moment: false };
  var saved = ctx;
  try {
    ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, pw, ph);
    ctx.setTransform(s, 0, 0, s, ox * s, oy * s);
    ctx.imageSmoothingEnabled = s < 1; ctx.imageSmoothingQuality = "high";
    for (var fy = -Math.ceil(oy / T) * T; fy < mh + oy; fy += T) for (var fx = -Math.ceil(ox / T) * T; fx < mw + ox; fx += T) {
      if (fx < 0 || fy < 0 || fx >= mw || fy >= mh) ctx.drawImage(bake, 0, 0, T, T, fx, fy, T, T);
    }
    drawWorld(mw / 2, mh / 2, mw, mh);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "rgba(8,14,10,0.28)"; ctx.fillRect(0, 0, mw, mh);
    var runs = [], run = [], i, p, q;
    for (i = 0; i < prints.length; i++) {
      p = prints[i]; q = prints[i - 1];
      if (q && (p.seg !== q.seg || Math.hypot(p.x - q.x, p.y - q.y) > 1.6 * T)) { runs.push(run); run = []; }
      run.push(p);
    }
    runs.push(run);
    var line = function (pts, w, col) {
      ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
      pts.forEach(function (pt, k) { var n = pts[k + 1] || pt, x = (pt.x + n.x) / 2, y = (pt.y + n.y) / 2; if (k) ctx.lineTo(x, y); else ctx.moveTo(pt.x, pt.y); });
      var last = pts[pts.length - 1]; ctx.lineTo(last.x, last.y); ctx.stroke();
    };
    runs.forEach(function (r) { if (r.length > 1) { info.segments++; line(r, 6 * u, "rgba(10,14,8,0.85)"); } });
    runs.forEach(function (r) { if (r.length > 1) line(r, 2.5 * u, "rgba(234,186,73,0.9)"); });
    runs.forEach(function (r) {
      var red = [];
      r.forEach(function (pt) { if (pt.red) red.push(pt); else { if (red.length > 1) line(red, 2.5 * u, C.red); red = []; } });
      if (red.length > 1) line(red, 2.5 * u, C.red);
    });
    var big = s / dpr >= 0.75;
    for (i = 0; i < prints.length; i++) {
      p = prints[i];
      ctx.fillStyle = p.red ? C.red : p.burn ? "#ff7a2a" : "#ffe39a";
      if (p.burn && !p.red && big) drawBurn(p.x, p.y, 1.3);
      else if (big) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + 1.5708); ctx.scale(1.3, 1.3);
        ctx.fillRect(-1.5, -1, 3, 4); ctx.fillRect(-2.5, -3.5, 1.5, 1.5); ctx.fillRect(-0.75, -4.25, 1.5, 1.5); ctx.fillRect(1, -3.5, 1.5, 1.5);
        ctx.restore();
      } else { ctx.beginPath(); ctx.arc(p.x, p.y, 1.1 * u, 0, 6.283); ctx.fill(); }
      info.prints++;
    }
    drawSigns();
    hunters.forEach(function (h) { if (h.type === "dog") drawDog(h); else drawHunter(h); });
    drawPlayer();
    var st = null;
    (L.map || []).forEach(function (row, y) { var x = row.indexOf("P"); if (x >= 0 && !st) st = { x: (x + 0.5) * T, y: (y + 0.5) * T }; });
    if (!st && prints.length) st = prints[0];
    var ringAt = function (x, y, r, col) {
      ctx.lineWidth = 5 * u; ctx.strokeStyle = "rgba(10,14,8,0.9)"; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 2.5 * u; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
    };
    if (st) { ringAt(st.x, st.y, 7 * u, "#fffaf0"); ctx.fillStyle = "#fffaf0"; ctx.fillRect(st.x - 1.5 * u, st.y - 1.5 * u, 3 * u, 3 * u); }
    if (dens) {
      var d = Math.max(T * 0.7, 9 * u);
      ctx.lineWidth = 5 * u; ctx.strokeStyle = "rgba(10,14,8,0.9)"; ctx.strokeRect(dens.x - d, dens.y - d, 2 * d, 2 * d);
      ctx.lineWidth = 2.5 * u; ctx.strokeStyle = C.gold; ctx.strokeRect(dens.x - d, dens.y - d, 2 * d, 2 * d);
    }
    var tp = game.tracked && prints[game.tracked.from];
    if (tp) {
      info.tracked = true; var k = 6 * u;
      [[5 * u, "rgba(10,14,8,0.9)"], [2.5 * u, C.red]].forEach(function (w) {
        ctx.lineWidth = w[0]; ctx.strokeStyle = w[1]; ctx.lineCap = "square"; ctx.beginPath();
        ctx.moveTo(tp.x - k, tp.y - k); ctx.lineTo(tp.x + k, tp.y + k); ctx.moveTo(tp.x + k, tp.y - k); ctx.lineTo(tp.x - k, tp.y + k); ctx.stroke();
      });
    }
    return info;
  } catch (e) { return null; } finally { ctx = saved; }
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!bake || !player) return;
  if (bakeDirty) { bakeDirty = false; bakeLevel(); }
  var s = zoom * DPR, vw = W / zoom, vh = H / zoom;
  var cx = clampCam(cam.x, vw, cols * T), cy = clampCam(cam.y, vh, rows * T);
  view.x0 = cx - vw / 2; view.x1 = cx + vw / 2; view.y0 = cy - vh / 2;
  var tr2 = trauma * trauma, t = performance.now() / 1000;
  var sx = SHAKE_MAX * tr2 * smoothNoise(t * 18, 1), sy = SHAKE_MAX * tr2 * smoothNoise(t * 18, 2), rot = 0.025 * tr2 * smoothNoise(t * 15, 3);
  ctx.setTransform(s, 0, 0, s, Math.round((W / 2 - cx * zoom + sx) * DPR), Math.round((H / 2 - cy * zoom + sy) * DPR));
  if (rot) { ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy); }
  ctx.imageSmoothingEnabled = false;
  liveFrame = true; drawWorld(cx, cy, vw, vh); liveFrame = false;
  drawCacheCard(); drawFloaters();
  if (game.phase === "caught") drawWhoGotYou();
  drawHint();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawVignette(); drawHud(); drawPressure(); featureCall("onDrawOver", ctx); drawPops(); drawCaughtBar(); drawJoy();
}
var SHAKE_MAX = 10;
var liveFrame = false;
function drawFloaters() {
  if (!floaters.length) return;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  floaters.forEach(function (f) {
    var a = simTime - f.t0, k = a / f.life;
    if (f.fly) {
      var p = Math.min(1, k), fx = f.fly.x + (f.x - f.fly.x) * p, fy = f.fly.y + (f.y - f.fly.y) * p - Math.sin(p * Math.PI) * 14;
      ctx.globalAlpha = p < 1 ? 1 : 0; ctx.fillStyle = C.goldDim; ctx.fillRect(fx - 4, fy - 4, 8, 8); ctx.fillStyle = C.gold; ctx.fillRect(fx - 3, fy - 3, 6, 6);
      return;
    }
    var y = f.y - 26 * (1 - Math.pow(1 - Math.min(1, k * 1.4), 2)), sc = a < 0.1 ? 1.4 - a * 4 : 1;
    if (a < 0) return;
    ctx.globalAlpha = k > 0.6 ? Math.max(0, (1 - k) / 0.4) : 1;
    ctx.save(); ctx.translate(f.x, y); ctx.scale(sc, sc);
    ctx.font = "600 13px 'Plex Cond', sans-serif"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(20,20,20,0.9)";
    ctx.strokeText(f.text, 0, 0); ctx.fillStyle = f.col; ctx.fillText(f.text, 0, 0);
    if (f.sub) { ctx.font = "600 9px 'Plex Cond', sans-serif"; ctx.strokeText(f.sub, 0, 12); ctx.fillStyle = C.ink; ctx.fillText(f.sub, 0, 12); }
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}
function smoothNoise(t, ch) { return (Math.sin(t * 1.0 + ch * 1.7) * 0.5 + Math.sin(t * 2.31 + ch * 4.1) * 0.3 + Math.sin(t * 4.73 + ch * 2.9) * 0.2); }
function drawWorld(cx, cy, vw, vh) {
  ctx.drawImage(bake, 0, 0);
  drawShield(); drawCaches(); drawWaveMarker();
  drawPrints(cx, cy, vw, vh); drawTrailTint(); drawStrings(); drawCoins(); drawSigns();
  if (liveFrame && BH.characters && BH.characters.drawFound && !(BH.cave && BH.cave.inside())) { try { BH.characters.drawFound(ctx, save, game.levelIdx + 1, simTime, T); } catch (e) {} }
  featureCall("onDrawWorld", ctx);
  if (dens) drawDenGlow();
  drawTowerBeams(); drawCones();
  drawTufts();
  hunters.forEach(function (h) { if (h.type === "dog") drawDog(h); else drawHunter(h); });
  drawTowerLamps();
  drawCrowdGroup();
  npcs.forEach(drawNpc);
  drawPlayer();
  drawBushTops(cx, cy, vw, vh);
  drawDrone();
  particles.forEach(function (p) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.col; ctx.fillRect(p.x - 1, p.y - 1, 2, 2); });
  ctx.globalAlpha = 1;
  rings.forEach(function (r) { var f = r.t / r.dur; ctx.strokeStyle = r.col; ctx.globalAlpha = 1 - f; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, 4 + f * r.max, 0, 6.283); ctx.stroke(); });
  ctx.globalAlpha = 1;
  drawNoises();
  drawCelebration();
}
function drawCelebration() {
  if (!liveFrame || game.screen !== "play" || game.phase !== "escaped" || game.escapedAt == null || game.celeDone) return;
  if (!BH.cosmetics || !BH.cosmetics.celebrate || !save.cos || !save.cos.cele) return;
  var at = dens || player, going = false;
  try { going = BH.cosmetics.celebrate(ctx, at.x, at.y, simTime - game.escapedAt, save.cos.cele, { stars: game.result ? game.result.stars : 0 }); } catch (e) { going = false; }
  game.celeFrames = (game.celeFrames || 0) + 1;
  if (!going) game.celeDone = true;
}
function drawNoises() {
  noises.forEach(function (n) {
    var age = simTime - n.t, splash = n.kind === "splash", col = splash ? "190,235,255" : "255,236,190";
    for (var k = 0; k < 2; k++) {
      var a = age - k * 0.1; if (a < 0 || a > 0.4) continue;
      var f = a / 0.4;
      ctx.strokeStyle = "rgba(" + col + "," + (0.55 * (1 - f)).toFixed(3) + ")"; ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.arc(n.x, n.y, 5 + f * T * 0.75, 0, 6.283); ctx.stroke();
    }
    var tick = age < 0.15 ? age / 0.15 : Math.max(0, 1 - (age - 0.15) / 0.75), r = n.r;
    if (tick <= 0) return;
    ctx.strokeStyle = "rgba(" + col + "," + (0.4 * tick).toFixed(3) + ")"; ctx.lineWidth = 1.5; ctx.beginPath();
    for (var q = 0; q < 4; q++) { var ang = q * Math.PI / 2 + Math.PI / 4; ctx.arc(n.x, n.y, r, ang - 0.09, ang + 0.09); ctx.moveTo(n.x + Math.cos(ang + Math.PI / 2 - 0.09) * r, n.y + Math.sin(ang + Math.PI / 2 - 0.09) * r); }
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}
var TINT_AHEAD = 8;
function drawTrailTint() {
  ctx.globalCompositeOperation = "lighter";
  hunters.forEach(function (h) {
    var reading = h.state === "follow" || (h.state === "rush" && !h.decoy && h.followIdx != null && h.followIdx > 0);
    if (!reading) return;
    var col = h.state === "rush" ? "220,70,50" : h.type === "dog" ? "235,140,60" : "255,214,110";
    for (var k = 0; k < TINT_AHEAD; k++) {
      var p = prints[h.followIdx + k]; if (!p) break;
      if (h.state === "follow" && p.seg !== prints[h.followIdx].seg) break;
      var pulseA = 0.5 + 0.5 * Math.sin(simTime * 7 - k * 0.8), a = (1 - k / TINT_AHEAD) * (0.35 + 0.35 * pulseA);
      ctx.fillStyle = "rgba(" + col + "," + a.toFixed(3) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 6.283); ctx.fill();
    }
  });
  ctx.globalCompositeOperation = "source-over";
}
function drawWhoGotYou() {
  var r = game.replay; if (!r || r.hx == null) return;
  var t = simTime - r.t0, a = Math.min(1, t / 0.3);
  ctx.globalAlpha = a;
  ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(r.hx, r.hy); ctx.lineTo(r.px, r.py); ctx.stroke(); ctx.setLineDash([]);
  var pr = 18 + Math.sin(t * 8) * 3;
  ctx.beginPath(); ctx.arc(r.hx, r.hy, pr, 0, 6.283); ctx.stroke();
  ctx.globalAlpha = 1;
}
function clampCam(c, view, world) { if (world <= view) return world / 2; return Math.max(view / 2, Math.min(world - view / 2, c)); }
function drawShield() {
  ctx.save(); ctx.clip(waterPath);
  var t = simTime, x;
  ctx.globalCompositeOperation = "lighter";
  for (var i = 0; i < 4; i++) {
    var yOff = ((t * (6 + i * 3) + i * 90) % (rows * T + 200)) - 100, g = ctx.createLinearGradient(0, yOff - 70, 0, yOff + 70);
    var col = ["rgba(40,140,120,", "rgba(70,80,170,", "rgba(40,120,150,", "rgba(234,186,73,"][i], a = [0.40, 0.32, 0.28, 0.09][i];
    g.addColorStop(0, col + "0)"); g.addColorStop(0.5, col + a + ")"); g.addColorStop(1, col + "0)");
    ctx.fillStyle = g; ctx.beginPath();
    for (x = 0; x <= cols * T; x += 16) { var yy = yOff + Math.sin(x / 90 + t * 0.6 + i) * 26 - 70; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    for (x = cols * T; x >= 0; x -= 16) ctx.lineTo(x, yOff + Math.sin(x / 90 + t * 0.6 + i) * 26 + 70);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(190,235,255,0.07)";
  for (var ln = 0; ln < rows * 2; ln++) { var ly = ln * T / 2 + Math.sin(t * 0.8 + ln) * 3, lx = ((t * 14 * (1 + (ln % 3) * 0.4) + ln * 97) % (cols * T + 160)) - 80; ctx.fillRect(lx, ly, 40 + (ln % 4) * 14, 2); }
  for (var y = 0; y < rows; y++) for (x = 0; x < cols; x++) {
    if (!isWater(grid[y][x])) continue;
    var h = hash(x + 3, y + 11), tw = Math.sin(t * (1 + h * 2) + h * 40);
    if (tw > 0.75) { ctx.fillStyle = "rgba(255,250,240," + ((tw - 0.75) * 2.4).toFixed(2) + ")"; ctx.fillRect(x * T + Math.floor(h * 14) * 2, y * T + Math.floor(hash(y, x) * 14) * 2, 2, 2); }
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(190,235,255," + (0.28 + Math.sin(t * 1.5) * 0.08).toFixed(3) + ")"; ctx.lineWidth = 2;
  ctx.beginPath(); waterEdges.forEach(function (e) { ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); }); ctx.stroke();
}
function drawWaveMarker() {
  if (!wave || !wave.shore || wave.st === "idle") return;
  var s = wave.shore, x = (s.lx + 0.5) * T, y = (s.ly + 0.5) * T, p = (simTime * 1.4) % 1;
  ctx.strokeStyle = "rgba(190,235,255," + (0.7 * (1 - p)).toFixed(2) + ")"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 6 + p * 18, 0, 6.283); ctx.stroke();
}
function drawCaches() {
  stashes.forEach(function (c) {
    var p = 0.5 + Math.sin(simTime * 2.5) * 0.2;
    ctx.strokeStyle = "rgba(190,235,255," + p.toFixed(2) + ")"; ctx.lineWidth = 2; ctx.strokeRect(c.x - 10, c.y - 10, 20, 20);
    ctx.fillStyle = "rgba(190,235,255,0.15)"; ctx.fillRect(c.x - 8, c.y - 8, 16, 16);
    if (c.stored) { ctx.fillStyle = C.ice; ctx.font = "500 10px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(c.stored), c.x, c.y + 1); }
  });
}
function drawCacheCard() {
  if (!player || !player.inShield || game.phase !== "play") return;
  var c = null, ptx = Math.floor(player.x / T), pty = Math.floor(player.y / T);
  stashes.forEach(function (s) { if (s.tx === ptx && s.ty === pty) c = s; });
  if (!c) return;
  var G = F.gp || {}, lines = [[G.stashTitle || "SHIELD CACHE", C.ice],
    [(G.stashIn || "IN THE SHIELD") + "  " + player.stash, C.ice],
    [player.carry > 0 ? (G.stashCarry || "STILL CARRYING") + "  " + player.carry : (G.stashAll || "ALL SHIELDED"), player.carry > 0 ? C.gold : C.ice]];
  ctx.font = "600 10px 'Plex Cond', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  var w = 0; lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l[0]).width); }); w += 14;
  var h = lines.length * 12 + 6, x0 = Math.round(c.x - w / 2), y0 = Math.round(c.y + 14);
  ctx.fillStyle = "rgba(12,20,40,0.9)"; ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = "rgba(190,235,255,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
  lines.forEach(function (l, i) { ctx.fillStyle = l[1]; ctx.fillText(l[0], c.x, y0 + 9 + i * 12); });
}
function drawBurn(x, y, k) {
  var w = Math.round(6 * k), h = Math.round(4 * k), ax = Math.round(x), ay = Math.round(y);
  ctx.fillStyle = "#1e1008"; ctx.fillRect(ax - (w >> 1), ay - (h >> 1), w, h);
  ctx.fillStyle = "#2a160a"; ctx.fillRect(ax - (h >> 1), ay - (w >> 1), h, w);
}
function drawPrints(cx, cy, vw, vh) {
  var x0 = cx - vw / 2 - 20, x1 = cx + vw / 2 + 20, y0 = cy - vh / 2 - 20, y1 = cy + vh / 2 + 20, i, p;
  ctx.globalCompositeOperation = "lighter";
  for (i = 0; i < prints.length; i++) {
    p = prints[i]; if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    ctx.fillStyle = p.red ? "rgba(220,70,50,0.16)" : p.big ? "rgba(234,186,73,0.16)" : "rgba(234,186,73,0.07)";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.big ? 8 : 5, 0, 6.283); ctx.fill();
  }
  var PS = 40, head = pulse ? pulse.from + (simTime - pulse.t0) * PS : -1;
  if (pulse && head > prints.length + PS * 1.2) pulse = null;
  function heat(i) { if (!pulse || i < pulse.from || i > head) return 0; return Math.max(0, 1 - (head - i) / (PS * 0.9)); }
  if (pulse) {
    ctx.globalCompositeOperation = "lighter";
    for (i = pulse.from; i < prints.length; i++) {
      var q = heat(i); if (!q) continue; p = prints[i];
      ctx.fillStyle = "rgba(220,70,50," + (0.45 * q).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, 7 + 5 * q, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
  var cosPrint = BH.cosmetics && BH.cosmetics.drawPrint && save.cos && save.cos.print ? save.cos.print : null;
  for (i = 0; i < prints.length; i++) {
    p = prints[i]; if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    var age = simTime - p.t, hq = heat(i), sc = (age < 0.15 ? 1.6 - age * 4 : 1) * (p.big ? 1.5 : 1) * (1 + 0.5 * hq);
    if (p.burn && !p.red && hq <= 0.35) { drawBurn(p.x, p.y, p.big ? 1.5 : 1); continue; }
    if (cosPrint) { BH.cosmetics.drawPrint(ctx, p.x, p.y, p.a, cosPrint, age, { red: p.red, big: p.big, heat: hq }); continue; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + 1.5708); ctx.scale(sc, sc); ctx.fillStyle = p.red || hq > 0.35 ? C.red : C.gold;
    ctx.fillRect(-1.5, -1, 3, 4); ctx.fillRect(-2.5, -3.5, 1.5, 1.5); ctx.fillRect(-0.75, -4.25, 1.5, 1.5); ctx.fillRect(1, -3.5, 1.5, 1.5);
    ctx.restore();
  }
}
function drawStrings() {
  strings.forEach(function (s) {
    var f = Math.min(1, (simTime - s.t0) / 0.45), mx = (s.ax + s.bx) / 2, my = (s.ay + s.by) / 2 + Math.hypot(s.bx - s.ax, s.by - s.ay) * 0.12;
    ctx.strokeStyle = C.string; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.ax, s.ay);
    for (var i = 1; i <= 24 * f; i++) { var t = i / 24, u = 1 - t; ctx.lineTo(u * u * s.ax + 2 * u * t * mx + t * t * s.bx, u * u * s.ay + 2 * u * t * my + t * t * s.by); }
    ctx.stroke();
    [[s.ax, s.ay], [s.bx, s.by]].forEach(function (pt, j) {
      if (j === 1 && f < 1) return;
      ctx.fillStyle = C.string; ctx.beginPath(); ctx.arc(pt[0], pt[1], 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = C.ink; ctx.fillRect(pt[0] - 1, pt[1] - 2, 2, 2);
      if (s.amount != null && f >= 1 && !linkSignUp(s)) {
        ctx.font = "600 10px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillStyle = "rgba(27,27,27,0.85)"; ctx.fillRect(pt[0] - 16, pt[1] - 22, 32, 13);
        ctx.fillStyle = C.string; ctx.fillText(s.amount + " ZEC", pt[0], pt[1] - 9);
      }
    });
    if (f >= 1 && linkSignUp(s) && !s.late) drawLinkSign(s);
  });
}
var LINK_SIGN_HOLD = 6;
function linkSignUp(s) {
  if (!liveFrame) return false;
  if (simTime - s.t0 < LINK_SIGN_HOLD) return true;
  return game.phase === "caught" && s === strings[strings.length - 1];
}
function linkSignText(s) {
  var w = s.why || (s.amount != null ? "amount" : "alone");
  if (w === "SAME ADDRESS") return { a: "PAID YOU", b: "SAME ADDRESS", c: "" };
  if (w === "amount") return { a: "IN: " + s.amount + " ZEC", b: "OUT: " + s.amount + " ZEC, SAME" };
  if (w === "alone") return { a: "WENT IN HERE", b: "CAME OUT ALONE" };
  if (w === "matchTiming") return { a: "WENT IN HERE", b: "OUT TOO SOON" };
  return { a: "WENT IN HERE", b: "CAME OUT HERE" };
}
function linkPlank(text, x, y, big) {
  ctx.font = (big ? "700 12px" : "600 10px") + " 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  var w = (ctx.measureText(text).width || text.length * 7) + 12, h = big ? 18 : 14;
  ctx.fillStyle = "rgba(20,14,10,0.92)"; ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), h);
  ctx.fillStyle = C.string; ctx.fillRect(Math.round(x - w / 2), Math.round(y + h / 2 - 2), Math.round(w), 2);
  ctx.fillStyle = big ? "#ffe2da" : C.ink; ctx.fillText(text, x, y + 1);
}
function plankWidth(text, big) { ctx.font = (big ? "700 12px" : "600 10px") + " 'Plex Mono', monospace"; return (ctx.measureText(text).width || text.length * 7) + 12; }
function playerBox() {
  var top = typeof player.labelY === "number" && player.labelY < player.y ? player.labelY - 8 : player.y - 50;
  return { l: player.x - 16, r: player.x + 16, t: top, b: player.y + 22 };
}
function whoBox(e) { return { l: e.x - 16, r: e.x + 16, t: typeof e.top === "number" ? e.top : typeof e.topY === "number" ? e.topY - 30 : e.y - 60, b: e.y + 14 }; }
function signTop(s, key, x, y, w, h, up, also) {
  var boxes = [playerBox()].concat(also || []);
  var hit = function (top) { return boxes.some(function (pb) { return x - w / 2 < pb.r && pb.l < x + w / 2 && y + top < pb.b && pb.t < y + top + h; }); };
  var above = up, below = -up - h;
  boxes.forEach(function (pb) { if (x - w / 2 < pb.r && pb.l < x + w / 2) { above = Math.min(above, pb.t - 4 - h - y); below = Math.max(below, pb.b + 4 - y); } });
  var cur = s[key];
  if (cur == null) cur = hit(up) ? below : up;
  else if (hit(cur)) { var alt = cur < 0 ? below : above; if (!hit(alt)) cur = alt; }
  s[key] = cur; return cur;
}
function drawLinkSign(s) {
  var t = linkSignText(s), a = Math.min(1, (simTime - s.t0) / 0.3);
  ctx.save(); ctx.globalAlpha = game.phase === "caught" ? 1 : a;
  var sub = t.c == null ? "HE MATCHED IN TO OUT" : t.c, hb = sub ? 33 : 18;
  var wb = Math.max(plankWidth(t.b, true), sub ? plankWidth(sub, false) : 0);
  var aw = s.aWho ? [whoBox(s.aWho)] : [], bw = s.bWho ? [whoBox(s.bWho)] : [], who = aw.concat(bw, (s.near || []).map(whoBox));
  var tb = signTop(s, "topB", s.bx, s.by, wb, hb, bw.length ? bw[0].t - 4 - hb - s.by : sub ? -43 : -28, who);
  if (bw.length && tb > 0) tb = s.topB = bw[0].b + 12 - s.by;
  var wa = plankWidth(t.a, false);
  var ta = signTop(s, "topA", s.ax, s.ay, wa, 14, aw.length ? aw[0].t - 18 - s.ay : -27, who.concat([{ l: s.bx - wb / 2, r: s.bx + wb / 2, t: s.by + tb, b: s.by + tb + hb }]));
  linkPlank(t.a, s.ax, s.ay + ta + 7, false);
  linkPlank(t.b, s.bx, s.by + tb + 9, true);
  if (sub) linkPlank(sub, s.bx, s.by + tb + 26, false);
  ctx.restore();
}
function drawCoins() {
  coins.forEach(function (c) {
    if (c.got) return;
    var y = c.y + Math.sin(simTime * 3 + c.ph) * 2.5, w = Math.abs(Math.cos(simTime * 2 + c.ph)) * 5 + 3, k = w / 8;
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(234,186,73,0.14)"; ctx.beginPath(); ctx.arc(c.x, y, 12, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = C.goldDim; ctx.fillRect(c.x - 4 * k, y - 7, 8 * k, 14); ctx.fillRect(c.x - 6 * k, y - 5, 12 * k, 10); ctx.fillRect(c.x - 7 * k, y - 3, 14 * k, 6);
    ctx.fillStyle = C.gold; ctx.fillRect(c.x - 3 * k, y - 6, 6 * k, 12); ctx.fillRect(c.x - 5 * k, y - 4, 10 * k, 8); ctx.fillRect(c.x - 6 * k, y - 2, 12 * k, 4);
    if (w > 5.5 && TRAIL_ZEC) zecMark(ctx, c.x, y);
    else if (w > 5.5) { ctx.fillStyle = "#1b1b1b"; ctx.fillRect(c.x - 3, y - 4, 6, 1.5); ctx.fillRect(c.x - 0.75, y - 2.5, 1.5, 5); ctx.fillRect(c.x - 3, y + 2.5, 6, 1.5); }
  });
}
var TRAIL_ZEC = !!(document.body && document.body.classList.contains("trail"));
function zecMark(g, x, y) {
  g.fillStyle = "#1b1b1b";
  g.fillRect(x - 0.75, y - 5.5, 1.5, 1.5); g.fillRect(x - 3, y - 4, 6, 1.5);
  g.fillRect(x + 1.5, y - 2.5, 1.5, 1.5); g.fillRect(x + 0.25, y - 1.25, 1.5, 1.5); g.fillRect(x - 1, y, 1.5, 1.5); g.fillRect(x - 2.25, y + 1.25, 1.5, 1.5);
  g.fillRect(x - 3, y + 2.5, 6, 1.5); g.fillRect(x - 0.75, y + 4, 1.5, 1.5);
}
function drawDenGlow() {
  var open = banked() >= L.need, a = (open ? 0.22 : 0.08) + Math.sin(simTime * 2) * 0.05;
  ctx.globalCompositeOperation = "lighter";
  var g = ctx.createRadialGradient(dens.x, dens.y + 6, 2, dens.x, dens.y + 6, T * (open ? 2 : 1.3));
  g.addColorStop(0, "rgba(234,186,73," + a.toFixed(3) + ")"); g.addColorStop(1, "rgba(234,186,73,0)");
  ctx.fillStyle = g; ctx.fillRect(dens.x - T * 2, dens.y - T * 2, T * 4, T * 4);
  ctx.globalCompositeOperation = "source-over";
  ctx.font = "600 11px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  var msg = open || !liveFrame ? null : denNeedText(banked(), L.need, Math.hypot(player.x - dens.x, player.y - dens.y) < T * 2.5 || denFlash > simTime);
  if (msg) {
    ctx.font = "600 11px 'Plex Mono', monospace"; ctx.textBaseline = "middle";
    var mw = ctx.measureText(msg).width + 12, my = dens.y - T * 0.55 - 8;
    ctx.fillStyle = "rgba(27,27,27,0.9)"; ctx.fillRect(dens.x - mw / 2, my - 9, mw, 18);
    ctx.fillStyle = HOSTILE_RED; ctx.fillRect(dens.x - mw / 2, my + 8, mw, 2);
    ctx.fillStyle = C.ink; ctx.fillText(msg, dens.x, my);
    return;
  }
  ctx.fillStyle = open ? C.gold : "rgba(255,250,240,0.6)";
  ctx.fillText(open ? ((F.gp && F.gp.den) || "DEN") : dens.water ? "IN THE DEN " + player.stash + " / " + L.need : banked() + "/" + L.need, dens.x, dens.y - T * 0.55);
}
function denNeedText(have, need, near) { return near && have < need ? "NEED " + need + " ZEC · you have " + have : null; }
function conePoly(x, y, a0, half, range, n) {
  ctx.beginPath(); ctx.moveTo(x, y);
  var sx = Math.floor(x / T), sy = Math.floor(y / T);
  for (var i = 0; i <= n; i++) {
    var a = a0 - half + 2 * half * i / n, d = 0;
    while (d < range) { var px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; if (!(Math.floor(px / T) === sx && Math.floor(py / T) === sy) && solidP(tileAt(px, py))) break; d += 5; }
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}
function drawCones() {
  ctx.globalCompositeOperation = "lighter";
  hunters.forEach(function (h) {
    var alert = h.state === "chase" || h.state === "rush", col = alert ? "220,80,60" : "234,186,73";
    if (h.type === "dog") { ctx.fillStyle = "rgba(" + col + ",0.08)"; ctx.beginPath(); ctx.arc(h.x, h.y, D_SENSE * T, 0, 6.283); ctx.fill(); return; }
    if (!alert && h.sus > 0.01) col = "240," + Math.round(186 - 110 * h.sus) + "," + Math.round(73 - 20 * h.sus);
    var vis = visionOf(h) * T, g = ctx.createRadialGradient(h.x, h.y, 4, h.x, h.y, vis);
    g.addColorStop(0, "rgba(" + col + "," + (0.30 + (alert ? 0 : 0.2 * (h.sus || 0))).toFixed(3) + ")"); g.addColorStop(1, "rgba(" + col + ",0)");
    ctx.fillStyle = g; conePoly(h.x, h.y, h.dir, CONE, vis, 22); ctx.fill();
    ctx.fillStyle = "rgba(" + col + ",0.10)"; ctx.beginPath(); ctx.arc(h.x, h.y, SENSE * T, 0, 6.283); ctx.fill();
  });
  ctx.globalCompositeOperation = "source-over";
}
function drawTowerBeams() {
  ctx.globalCompositeOperation = "lighter";
  towers.forEach(function (t) {
    var col = t.hot > 0 ? "220,80,60" : "220,235,255", g = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, TOWER_RANGE * T);
    g.addColorStop(0, "rgba(" + col + ",0.34)"); g.addColorStop(1, "rgba(" + col + ",0.02)");
    ctx.fillStyle = g; conePoly(t.x, t.y, t.a, TOWER_HALF, TOWER_RANGE * T, 16); ctx.fill();
  });
  ctx.globalCompositeOperation = "source-over";
}
function drawTowerLamps() {
  towers.forEach(function (t) {
    ctx.fillStyle = t.hot > 0 ? C.red : C.ink; ctx.fillRect(t.x - 3, t.y - 14, 6, 5);
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,250,240,0.25)"; ctx.beginPath(); ctx.arc(t.x, t.y - 12, 8, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
  });
}
function drawTufts() {
  tufts.forEach(function (t) {
    var age = simTime - t.t, f = Math.min(1, age / 0.35), x = t.sx + (t.x - t.sx) * f, y = t.sy + (t.y - t.sy) * f - Math.sin(f * Math.PI) * 18;
    if (f >= 1 && age < 3) { var p = (age * 1.5) % 1; ctx.strokeStyle = "rgba(234,186,73," + (0.6 * (1 - p)).toFixed(2) + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4 + p * 22, 0, 6.283); ctx.stroke(); }
    ctx.fillStyle = "#7a4f45"; ctx.fillRect(x - 4, y - 3, 8, 6); ctx.fillStyle = "#9a6a5c"; ctx.fillRect(x - 2, y - 5, 5, 3); ctx.fillRect(x - 5, y - 1, 2, 2); ctx.fillRect(x + 3, y + 1, 2, 2);
  });
}
function drawBushTops(cx, cy, vw, vh) {
  var x0 = Math.max(0, Math.floor((cx - vw / 2) / T) - 1), x1 = Math.min(cols - 1, Math.ceil((cx + vw / 2) / T) + 1);
  var y0 = Math.max(0, Math.floor((cy - vh / 2) / T) - 1), y1 = Math.min(rows - 1, Math.ceil((cy + vh / 2) / T) + 1);
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
    if (grid[y][x] !== "b") continue;
    var px = x * T, py = y * T, h = hash(x, y), sway = Math.sin(simTime * 1.5 + h * 6) * 1;
    ctx.globalAlpha = player.inBush && Math.abs(player.x - (px + 16)) < T * 1.2 && Math.abs(player.y - (py + 16)) < T * 1.2 ? 0.55 : 1;
    ctx.fillStyle = C.bush; ctx.fillRect(px + 2 + sway, py + 8, 28, 20); ctx.fillRect(px + 6 + sway, py + 3, 20, 8);
    ctx.fillStyle = C.bush2; ctx.fillRect(px + 6 + sway, py + 6, 8, 4); ctx.fillRect(px + 18 + sway, py + 12, 8, 4); ctx.fillRect(px + 4 + sway, py + 18, 6, 3);
    ctx.globalAlpha = 1;
  }
}
function drawVignette() { var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, "rgba(12,20,40,0)"); g.addColorStop(1, "rgba(12,20,40,0.55)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

function drawPressure() {
  if (game.screen !== "play" || !player) return;
  if (game.alarm > 0) {
    var x = W - 18, y = 44;
    ctx.font = "500 12px 'Plex Cond', sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillStyle = C.red;
    ctx.fillText("ALARM", x - ALARM_MAX * 12 - 6, y);
    for (var i = 0; i < ALARM_MAX; i++) { ctx.fillStyle = i < game.alarm ? C.red : "rgba(255,250,240,0.2)"; ctx.fillRect(x - (ALARM_MAX - i) * 12, y - 4, 8, 8); }
  }
}
function drawCaughtBar() {
  if (game.phase !== "caught" || !game.replay || game.screen !== "play" || game.caughtCard || game.loseReason === "trail:robbed") return;
  var r = game.replay, t = simTime - r.t0, a = Math.min(1, t / 0.25);
  drawCaughtSign(r, t, a);
}
function drawCaughtSign(r, t, a) {
  var who = r.htype ? (r.htype === "dog" ? "DOG" : String(r.htype).toUpperCase()) : "";
  var title = who ? "CAUGHT BY THE " + who : "CAUGHT";
  var sub = TOUCH ? "" : "PRESS R TO TRY AGAIN NOW";
  for (var pi = pops.length - 1; pi >= 0; pi--) if (pops[pi].text === "CAUGHT") pops.splice(pi, 1);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.letterSpacing = "1.5px";
  ctx.font = "600 22px 'Plex Cond', sans-serif"; var tw = ctx.measureText(title).width;
  ctx.font = "600 14px 'Plex Cond', sans-serif"; var sw = sub ? ctx.measureText(sub).width : 0;
  var w = Math.min(W - 32, Math.max(tw, sw) + 56), h = sub ? 70 : 48, cx = W / 2, x0 = cx - w / 2, y0 = H - h - (W < 600 ? 140 : 84);
  ctx.fillStyle = "#3b2a1a"; ctx.fillRect(x0 + 24, y0 + h, 8, 40); ctx.fillRect(x0 + w - 32, y0 + h, 8, 40);
  ctx.fillStyle = "#1f130a"; ctx.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);
  ctx.fillStyle = C.wood; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = "#86592f"; ctx.fillRect(x0, y0, w, 3);
  ctx.fillStyle = "#4e3520"; ctx.fillRect(x0, y0 + h - 8, w, 8);
  var left = Math.max(0, CAUGHT_REPLAY - t);
  ctx.fillStyle = C.gold; ctx.fillRect(x0 + 6, y0 + h - 5, (w - 12) * (left / CAUGHT_REPLAY), 2);
  ctx.fillStyle = "#c9a36a"; [[x0 + 8, y0 + 10], [x0 + w - 12, y0 + 10]].forEach(function (n) { ctx.fillRect(n[0], n[1], 4, 4); });
  ctx.font = "600 22px 'Plex Cond', sans-serif"; ctx.fillStyle = "#1f130a"; ctx.fillText(title, cx, y0 + 23); ctx.fillStyle = C.ink; ctx.fillText(title, cx, y0 + 21);
  if (sub) { ctx.font = "600 14px 'Plex Cond', sans-serif"; ctx.fillStyle = "#f3d27a"; ctx.fillText(sub, cx, y0 + 48); }
  ctx.restore();
}

BH.tiles.register("m", { water: true, claim: "memo", draw: function (b, px, py) {
  b.fillStyle = "#56606e"; b.fillRect(px + 10, py + 11, 12, 10); b.fillStyle = "#8a96a6"; b.fillRect(px + 12, py + 11, 8, 3);
  b.fillStyle = C.gold; b.fillRect(px + 14, py + 16, 4, 1); b.fillRect(px + 13, py + 18, 6, 1);
} });
BH.tiles.register("≈", { water: true, claim: "sealedPool", canEnter: function (from) { return isWater(from); }, draw: function (b, px, py) {
  b.fillStyle = "rgba(120,150,190,0.22)"; b.fillRect(px, py, T, T); b.fillStyle = "rgba(200,225,255,0.18)"; b.fillRect(px + 4, py + 8, 10, 1); b.fillRect(px + 16, py + 20, 12, 1);
} });
BH.tiles.register("R", { solid: true, claim: "ranger", draw: function (b, px, py) {
  b.fillStyle = C.wood; b.fillRect(px + 2, py + 4, 4, 26); b.fillRect(px + T - 6, py + 4, 4, 26);
  b.fillStyle = "#8a6440"; for (var i = 0; i < 3; i++) b.fillRect(px + 2, py + 8 + i * 8, T - 4, 3);
} });
BH.tiles.register("G", { solidHunter: true, claim: "turnstile", draw: function (b, px, py) {
  b.fillStyle = "#3a3a36"; b.fillRect(px + 4, py + 4, 4, 24); b.fillRect(px + T - 8, py + 4, 4, 24);
  b.fillStyle = C.gold; b.fillRect(px + 8, py + 14, T - 16, 2);
} });
["E", "L", "B"].forEach(function (c) { BH.tiles.register(c, { marker: true, base: ".", claim: { E: "elders", L: "heist", B: "escort" }[c] }); });
