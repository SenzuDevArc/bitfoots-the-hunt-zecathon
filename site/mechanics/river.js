(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  if (!BH.tiles || !BH.features) return;

  var FLY = 0.6, LOOK = 1, VALID_T = 0.9, RIPPLE_T = 1.6;
  var log = [];
  var S = null, key = null;

  function R(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(x, y, w, h); }
  function now() { return simTime; }
  function fresh() {
    log.length = 0;
    S = { ripples: [], boxes: [], looks: [], flash: null, opened: 0, made: 0 };
  }
  function sync() {
    if (grid !== key) { key = grid; fresh(); }
    if (typeof activeFeatures !== "undefined" && !activeFeatures.some(function (f) { return f.id === "river"; })) {
      var api = Object.create(featureApi); api.id = "river"; api.state = {};
      activeFeatures.push({ id: "river", def: BH.features.get("river"), api: api });
    }
    return S;
  }
  function gateTiles() {
    var out = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) if (grid[y][x] === "Y") out.push([x, y]);
    return out;
  }

  function openGates() {
    sync();
    var g = gateTiles();
    g.forEach(function (p) {
      featureApi.setTile(p[0], p[1], "~");
      puff((p[0] + 0.5) * T, (p[1] + 0.5) * T, 10, "rgba(191,233,255,0.85)", 34);
    });
    if (g.length) { sfx("gate"); addTrauma(0.15); }
    S.opened += g.length;
    return g.length;
  }
  function isGate(tx, ty) { return tile(tx, ty) === "Y"; }
  function valid() {
    sync();
    if (S.flash) return;
    var g = gateTiles();
    if (!g.length) return;
    S.flash = { t0: now(), tiles: g };
    sfx("buy");
  }
  function ripple(x, y) {
    sync();
    S.made++;
    S.ripples.push({ x: x, y: y, t0: now() });
    hunters.forEach(function (h) {
      if (h.type === "dog" || Math.hypot(h.x - x, h.y - y) > visionOf(h) * T) return;
      if (!losClear(h.x, h.y, x, y)) return;
      S.looks = S.looks.filter(function (l) { return l.h !== h; });
      S.looks.push({ h: h, a0: h.dir, x: x, y: y, t0: now() });
    });
  }
  function pay(from, n, label) {
    sync();
    n = Math.max(0, n | 0);
    if (!n) return 0;
    var fx = from && from.x != null ? from.x : player.x, fy = from && from.y != null ? from.y : player.y;
    player.carry += n;
    for (var i = 0; i < n; i++) S.boxes.push({ x: fx, y: fy - 8, t0: now() + i * 0.12, s: (i % 2 ? 1 : -1) * (6 + i * 3) });
    log.push({ t: featureApi.time, x: fx, y: fy, n: n, dir: "in", by: label || (from && from.id) || null });
    ripple(fx, fy);
    sfx("coin");
    return n;
  }
  function spent(x, y, n) {
    sync();
    log.push({ t: featureApi.time, x: x, y: y, n: n | 0, dir: "out", by: null });
    ripple(x, y);
  }

  BH.river = {
    openGates: openGates, isGate: isGate, valid: valid, pay: pay, spent: spent, ripple: ripple, log: log,
    info: function () { sync(); return { ripples: S.made, live: S.ripples.length, boxes: S.boxes.length, looks: S.looks.length, flashing: !!S.flash, opened: S.opened }; }
  };

  function step() {
    var t = now();
    S.boxes = S.boxes.filter(function (b) { return t - b.t0 < FLY; });
    S.ripples = S.ripples.filter(function (r) { return t - r.t0 < RIPPLE_T; });
    S.looks = S.looks.filter(function (l) {
      var k = (t - l.t0) / 0.15;
      if (t - l.t0 >= LOOK || hunters.indexOf(l.h) < 0) return false;
      l.h.dir = l.a0 + angDiff(Math.atan2(l.y - l.h.y, l.x - l.h.x), l.a0) * Math.min(1, k);
      return true;
    });
    if (S.flash && t - S.flash.t0 >= VALID_T) { S.flash = null; openGates(); }
  }

  function drawRipples(g) {
    var t = now();
    S.ripples.forEach(function (r) {
      for (var i = 0; i < 3; i++) {
        var k = (t - r.t0 - i * 0.25) / (RIPPLE_T - 0.5);
        if (k <= 0 || k >= 1) continue;
        g.globalAlpha = 0.8 * (1 - k);
        g.strokeStyle = C.ice; g.lineWidth = 2;
        g.beginPath(); g.ellipse(r.x, r.y + 4, 4 + k * T * 1.4, 2 + k * T * 0.7, 0, 0, 6.283); g.stroke();
      }
    });
    g.globalAlpha = 1;
  }
  function drawBox(g, x, y) {
    R(g, x - 5, y - 3, 10, 7, "#7a4a24"); R(g, x - 5, y - 3, 10, 2, "#9a6232");
    R(g, x - 6, y - 5, 12, 3, "#5a3418"); R(g, x - 1, y - 5, 2, 9, C.gold);
  }
  function drawBoxes(g) {
    var t = now();
    S.boxes.forEach(function (b) {
      var k = (t - b.t0) / FLY;
      if (k < 0) { drawBox(g, b.x, b.y); return; }
      var e = 1 - Math.pow(1 - k, 2), x = b.x + (player.x - b.x) * e + Math.sin(k * Math.PI) * b.s, y = b.y + (player.y - 6 - b.y) * e - Math.sin(k * Math.PI) * 22;
      drawBox(g, Math.round(x), Math.round(y));
    });
  }
  function drawFlash(g) {
    var f = S.flash; if (!f) return;
    var k = (now() - f.t0) / VALID_T, on = Math.floor(k * 8) % 2 === 0, x0 = 1e9, x1 = -1e9, y0 = 1e9;
    f.tiles.forEach(function (p) {
      x0 = Math.min(x0, p[0] * T); x1 = Math.max(x1, (p[0] + 1) * T); y0 = Math.min(y0, p[1] * T);
      g.globalAlpha = on ? 0.55 : 0.25; R(g, p[0] * T + 2, p[1] * T + 2, T - 4, T - 4, C.ice);
    });
    g.globalAlpha = 1;
    var cx = (x0 + x1) / 2, cy = y0 - 12;
    drawBox(g, cx, cy + 4 - Math.sin(Math.min(1, k * 2) * Math.PI) * 4);
    g.font = "600 12px 'Plex Cond', sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom";
    g.lineWidth = 3; g.strokeStyle = "rgba(20,20,20,0.9)"; g.strokeText("VALID", cx, cy - 4);
    g.fillStyle = C.ice; g.fillText("VALID", cx, cy - 4);
  }

  BH.features.register("river", {
    onLevelStart: function () { key = grid; fresh(); sync(); },
    onStep: function () { sync(); step(); },
    onDrawWorld: function (g) { sync(); drawRipples(g); drawFlash(g); drawBoxes(g); }
  });
  (window.LEVELS || []).forEach(function (l) { if ((l.features || []).indexOf("river") < 0) l.features = (l.features || []).concat(["river"]); });

  function water(b, x, y) { R(b, x, y, T, T, C.water); }
  BH.tiles.register("U", { solid: true, water: true, claim: "river", draw: function (b, x, y) {
    water(b, x, y);
    R(b, x + 6, y + T - 7, T - 12, 3, "rgba(191,233,255,0.35)");
    R(b, x + 14, y + 12, 4, T - 16, "#4e3520"); R(b, x + 15, y + 12, 2, T - 16, C.wood);
    R(b, x + 4, y + 3, T - 8, 11, "#2c3a4a"); R(b, x + 6, y + 5, T - 12, 7, "#13202c");
    R(b, x + 8, y + 7, 3, 3, "#7fd8ff"); R(b, x + 14, y + 7, 3, 3, "#7fd8ff"); R(b, x + 20, y + 7, 3, 3, "#7fd8ff");
    R(b, x + 4, y + 13, T - 8, 2, C.gold);
  } });
  BH.tiles.register("Y", { solid: true, water: true, claim: "river", draw: function (b, x, y) {
    water(b, x, y);
    R(b, x, y + 5, T, 3, "#3a3a36"); R(b, x, y + T - 9, T, 3, "#3a3a36");
    for (var i = 0; i < 4; i++) { R(b, x + 2 + i * 8, y + 2, 4, T - 6, "#5a6470"); R(b, x + 2 + i * 8, y + 2, 2, T - 6, "#7d8890"); }
    R(b, x + 2, y + T - 5, T - 4, 2, "rgba(191,233,255,0.35)");
    R(b, x + T / 2 - 3, y + T / 2 - 4, 6, 6, C.ice); R(b, x + T / 2 - 1, y + T / 2 - 2, 2, 2, "#13202c");
  } });
})();
