"use strict";
(function () {
  var DEFAULT_WORLD = 3, DEFAULT_COLOUR = 8;
  var COLOURS = {
    5: { name: "Winter snow", sky: [[18, 26, 44], [96, 116, 146]], moon: [240, 246, 255], fog: [184, 198, 218], far: [92, 108, 128], dark: [14, 20, 28],
         ground: [[176, 188, 206], [96, 106, 124]], path: [[214, 222, 234], [150, 160, 178]], grass: [[120, 132, 150], [60, 68, 82]], bark: [24, 22, 24], moss: [200, 210, 225],
         water: [[40, 56, 80], [14, 20, 32]], air: "snow", mote: [245, 248, 255], warm: [255, 170, 90] },
    6: { name: "Shielded gold", sky: [[10, 8, 4], [74, 54, 16]], moon: [244, 183, 40], fog: [96, 74, 30], far: [64, 50, 20], dark: [10, 8, 3],
         ground: [[40, 30, 12], [10, 8, 3]], path: [[110, 88, 40], [46, 36, 16]], grass: [[80, 62, 20], [20, 16, 6]], bark: [20, 15, 8], moss: [110, 86, 26],
         water: [[40, 32, 12], [10, 8, 3]], air: "fireflies", mote: [244, 183, 40], warm: [255, 190, 60] },
    8: { name: "Campfire", sky: [[3, 4, 6], [16, 18, 22]], moon: null, fog: [44, 42, 46], far: [30, 30, 34], dark: [6, 6, 8],
         ground: [[26, 24, 22], [8, 7, 6]], path: [[70, 60, 50], [30, 26, 22]], grass: [[40, 44, 30], [12, 12, 8]], bark: [20, 15, 11], moss: [44, 56, 30],
         water: [[18, 20, 26], [5, 6, 8]], air: "embers", mote: [255, 150, 60], warm: [255, 140, 50] }
  };
  var WORLDS = [
    { name: "The Clearing", hook: "a fire, and nobody at it" },
    { name: "The Shield Lake", hook: "something under the water" },
    { name: "The Watchtower", hook: "the light is looking for someone" },
    { name: "The Den", hook: "eyes in the dark" },
    { name: "The Crossroads", hook: "which way did they go?" }
  ];
  var SHAPE = [{ w: [2, 4], gap: [1, 4], pine: true }, { w: [3, 6], gap: [2, 6], pine: true }, { w: [5, 9], gap: [4, 10] }, { w: [8, 14], gap: [8, 18] }];
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var T = COLOURS[DEFAULT_COLOUR];

  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function between(r, a) { return a[0] + Math.floor(r() * (a[1] - a[0] + 1)); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c, a) { return a == null ? "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")" : "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")"; }
  function layer(W, H) { var c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d"); x.imageSmoothingEnabled = false; return { c: c, x: x }; }
  function rect(x, c, a, px, py, w, h) { x.fillStyle = rgb(c, a); x.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h)); }
  function blob(x, cx, cy, rad) { for (var yy = -rad; yy <= rad; yy++) { var s = Math.round(Math.sqrt(rad * rad - yy * yy)); x.fillRect(Math.round(cx - s), Math.round(cy + yy), s * 2 + 1, 1); } }
  function ellipse(x, cx, cy, rx, ry) { for (var yy = -ry; yy <= ry; yy++) { var s = Math.round(rx * Math.sqrt(1 - (yy * yy) / (ry * ry))); x.fillRect(Math.round(cx - s), Math.round(cy + yy), s * 2 + 1, 1); } }
  function light() { return T.moon || T.warm; }
  function rowColour(k) { return mix(T.far, T.dark, [0, 0.25, 0.5, 0.72][k]); }
  function glow(x, cx, cy, rad, c, strength) {
    for (var yy = -rad; yy <= rad; yy++) for (var xx = -rad; xx <= rad; xx++) {
      var d = Math.sqrt(xx * xx + yy * yy * 2.2) / rad; if (d >= 1) continue;
      var a = (1 - d) * (1 - d) * strength, th = BAYER[((cy + yy) & 3) * 4 + ((cx + xx) & 3)] / 16;
      if (a > th * 0.9) { x.fillStyle = rgb(c, Math.min(0.55, a)); x.fillRect(cx + xx, cy + yy, 1, 1); }
    }
  }
  function foot(x, px, py, c, flip) {
    rect(x, c, 0.8, px, py, 1, 1); rect(x, c, 0.8, px + 2, py, 1, 1); rect(x, c, 0.8, px, py + 1, 3, 2); rect(x, c, 0.8, px + (flip ? 0 : 1), py + 3, 2, 1);
  }

  function sky(x, g, lx, ly, lc, strength) {
    var img = x.createImageData(g.W, g.H), d = img.data;
    for (var y = 0; y < g.H; y++) for (var xx = 0; xx < g.W; xx++) {
      var c = mix(T.sky[0], T.sky[1], Math.min(1, y / g.hz));
      if (lc) { var dx = (xx - lx) / g.W, dy = (y - ly) / g.H, gl = Math.max(0, 1 - Math.sqrt(dx * dx * 3 + dy * dy * 5) * 2.2); c = mix(c, lc, gl * gl * strength); }
      var th = (BAYER[(y & 3) * 4 + (xx & 3)] / 16 - 0.5) * 6, i = (y * g.W + xx) * 4;
      d[i] = c[0] + th; d[i + 1] = c[1] + th; d[i + 2] = c[2] + th; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }
  function moon(x, g, mx, my) {
    if (!T.moon) return;
    var r = Math.max(3, Math.round(g.H * 0.04));
    for (var yy = -r; yy <= r; yy++) for (var xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) rect(x, T.moon, xx * xx + yy * yy > (r - 1) * (r - 1) ? 0.6 : 0.95, mx + xx, my + yy, 1, 1);
  }
  function base(g, k) { return g.hz + Math.round((g.H - g.hz) * [0.01, 0.05, 0.14, 0.3][k]); }
  function pine(x, cx, top, bot, w, col) {
    x.fillStyle = rgb(col); x.fillRect(cx - Math.max(1, w >> 2), top, Math.max(1, w >> 1), bot - top);
    for (var y = top, i = 0; y < bot - 2; y += 2, i++) { var span = Math.round(((y - top) / (bot - top)) * w * 1.6) + 1 + (i % 3 === 0 ? 1 : 0); x.fillRect(cx - span, y, span * 2 + 1, 2); }
  }
  function trunk(x, r, g, cx, w, bot, col) {
    x.fillStyle = rgb(col); x.fillRect(cx, -2, w, bot + 2);
    var fl = Math.max(2, w >> 1); for (var i = 1; i <= fl; i++) x.fillRect(cx - i, bot - Math.round(fl * 1.4) + i * 1.4, w + i * 2, 1);
    x.fillStyle = rgb(mix(col, [0, 0, 0], 0.45)); for (var s = 2; s < w - 1; s += 3 + Math.floor(r() * 3)) x.fillRect(cx + s, Math.floor(r() * bot * 0.3), 1, bot);
    x.fillStyle = rgb(mix(col, light(), 0.16)); x.fillRect(cx + (cx + w / 2 < g.W / 2 ? w - 1 : 0), 0, 1, bot);
  }
  function row(x, g, k, seed, keep) {
    var r = rng(seed), R = SHAPE[k], col = mix(rowColour(k), T.fog, 0.08), bot = base(g, k);
    for (var cx = -between(r, R.w); cx < g.W + 20;) {
      var w = between(r, R.w);
      if (!keep || !keep(cx, cx + w, k)) {
        if (R.pine) pine(x, cx, g.hz - Math.round(g.H * (0.16 + r() * 0.18)) - k * 5, bot, w, col); else trunk(x, r, g, cx, w, bot, col);
      }
      cx += w + between(r, R.gap);
    }
    if (k >= 2) canopy(x, r, g, k, mix(col, [0, 0, 0], 0.15));
  }
  function canopy(x, r, g, k, col) {
    var depth = g.H * [0, 0, 0.14, 0.2][k], hole = g.W * [0, 0, 0.16, 0.22][k];
    x.fillStyle = rgb(col); x.fillRect(0, 0, g.W, 2);
    for (var n = 0; n < g.W * 0.45; n++) {
      var cx = Math.floor(r() * (g.W + 20)) - 10, near = Math.abs(cx - g.W / 2) / hole;
      if (near < 1 && r() > near * near * 0.5) continue;
      var rad = 2 + Math.floor(r() * (3 + k * 2)), cy = Math.floor(r() * depth * (near < 1 ? 0.5 : 1));
      x.fillStyle = rgb(col); blob(x, cx, cy, rad);
    }
  }
  function ground(x, g) { for (var y = g.hz; y < g.H; y++) rect(x, mix(T.ground[0], T.ground[1], (y - g.hz) / (g.H - g.hz)), null, 0, y, g.W, 1); }
  function tufts(x, g, seed, n) {
    var r = rng(seed);
    for (var i = 0; i < n; i++) {
      var yy = g.hz + 2 + Math.floor(Math.pow(r(), 0.8) * (g.H - g.hz - 2)), t = (yy - g.hz) / (g.H - g.hz), xx = Math.floor(r() * g.W), tall = 1 + Math.round(t * 4 * r());
      rect(x, mix(T.grass[0], T.grass[1], t * 0.7), null, xx, yy - tall, 1, tall); if (tall > 2) rect(x, mix(T.grass[0], T.grass[1], t * 0.7), null, xx - 1, yy - tall + 1, 3, 1);
    }
  }
  function giant(x, r, g, cx, w, lit) {
    var col = T.bark, fh = Math.round(w * 1.1), fw = w * 0.7, y, e;
    for (y = 0; y < g.H; y++) { e = y < g.H - fh ? 0 : Math.round(Math.pow((y - (g.H - fh)) / fh, 2.2) * fw); rect(x, col, null, cx - e, y, w + e * 2, 1); }
    for (var s = 1; s < w - 1;) { var pw = 2 + Math.floor(r() * 3); rect(x, mix(col, [255, 240, 220], 0.04 + r() * 0.04), null, cx + s, 0, pw - 1, g.H - fh * 0.4); rect(x, mix(col, [0, 0, 0], 0.55), null, cx + s + pw - 1, 0, 1, g.H); s += pw; }
    for (var c = 0; c < g.H / 3; c++) rect(x, mix(col, [0, 0, 0], 0.55), null, cx + 1 + Math.floor(r() * (w - 3)), Math.floor(r() * g.H), 2 + Math.floor(r() * 3), 1);
    for (var m = 0; m < w * 3; m++) rect(x, r() < 0.5 ? mix(T.moss, [0, 0, 0], 0.4) : T.moss, null, cx + Math.floor(r() * w), g.H - Math.floor(r() * g.H * 0.35), 1 + Math.floor(r() * 2), 1);
    rect(x, mix(col, light(), 0.22), null, lit > 0 ? cx + w - 1 : cx, 0, 1, g.H);
  }
  function frameTrees(x, g, seed) {
    var r = rng(seed), wide = g.W >= g.H;
    giant(x, r, g, Math.round(g.W * (wide ? -0.02 : -0.08)), Math.round(g.W * (wide ? 0.07 : 0.14)), 1);
    giant(x, r, g, Math.round(g.W * (wide ? 0.95 : 0.94)), Math.round(g.W * (wide ? 0.09 : 0.16)), -1);
  }
  function warmPool(x, g, cx, cy, rad) { glow(x, cx, cy, rad, T.warm, 0.9); }

  var SCENES = [
    { hz: 0.34, paint: function (b, f, g) {
        var cx = Math.round(g.W / 2), fy = Math.round(g.H * 0.4);
        sky(b.x, g, cx, fy, T.warm, 0.35); moon(b.x, g, Math.round(g.W * 0.7), Math.round(g.H * 0.12));
        row(b.x, g, 0, 11); row(b.x, g, 1, 23); ground(b.x, g);
        warmPool(b.x, g, cx, fy, Math.round(g.H * 0.2));
        tufts(b.x, g, 5, g.W * 0.5);
        var logC = mix(T.bark, [80, 56, 36], 0.5);
        [[-0.13, 0.02, 12, 3], [0.1, 0.03, 10, 3], [-0.05, 0.09, 14, 3]].forEach(function (L) { rect(b.x, logC, null, cx + g.W * L[0], fy + g.H * L[1], L[2], L[3]); rect(b.x, mix(logC, [0, 0, 0], 0.4), null, cx + g.W * L[0], fy + g.H * L[1] + L[3] - 1, L[2], 1); });
        var sx = cx + Math.round(g.W * 0.14), sy = fy - 4;
        rect(b.x, logC, null, sx, sy, 11, 8); rect(b.x, mix(logC, [255, 220, 160], 0.3), null, sx, sy, 11, 2); rect(b.x, mix(logC, [0, 0, 0], 0.4), null, sx + 3, sy + 2, 1, 6);
        rect(b.x, [16, 13, 12], null, sx + 2, sy - 5, 7, 4); rect(b.x, [16, 13, 12], null, sx - 1, sy - 1, 13, 1); rect(b.x, [120, 40, 30], null, sx + 2, sy - 2, 7, 1);
        rect(b.x, [120, 110, 90], null, sx - 6, sy - 2, 1, 10); rect(b.x, [150, 150, 160], null, sx - 8, sy - 3, 4, 3);
        var fc = mix(T.ground[1], [0, 0, 0], 0.35);
        for (var i = 0; i < 9; i++) { var a = i * 0.7; foot(b.x, cx + Math.cos(a) * g.W * 0.07, fy + 6 + Math.sin(a) * g.H * 0.05, fc, i % 2); }
        for (i = 0; i < 7; i++) foot(b.x, cx + g.W * 0.12 + i * 7, fy + 10 + i * 2 + (i % 2) * 2, fc, i % 2);
        row(f.x, g, 2, 37, function (a, z) { return z > g.W * 0.28 && a < g.W * 0.72; }); row(f.x, g, 3, 41, function (a, z) { return z > g.W * 0.22 && a < g.W * 0.78; });
        frameTrees(f.x, g, 67);
      },
      live: function (x, g, t) { flames(x, Math.round(g.W / 2), Math.round(g.H * 0.4), t, 2); } },

    { hz: 0.32, paint: function (b, f, g) {
        var cx = Math.round(g.W / 2), ly = Math.round(g.H * 0.4), mx = Math.round(g.W * 0.5), my = Math.round(g.H * 0.13);
        sky(b.x, g, mx, my, light(), 0.5); moon(b.x, g, mx, my);
        row(b.x, g, 0, 12); row(b.x, g, 1, 24); ground(b.x, g); tufts(b.x, g, 6, g.W * 0.4);
        var rx = Math.round(g.W * 0.36), ry = Math.round(g.H * 0.08);
        b.x.fillStyle = rgb(mix(T.water[0], T.fog, 0.2)); ellipse(b.x, cx, ly, rx + 2, ry + 1);
        b.x.fillStyle = rgb(T.water[0]); ellipse(b.x, cx, ly, rx, ry);
        b.x.fillStyle = rgb(T.water[1]); ellipse(b.x, cx, ly + 1, Math.round(rx * 0.8), Math.round(ry * 0.6));
        for (var i = 0; i < ry * 2; i += 2) rect(b.x, light(), 0.12 + 0.2 * (1 - i / (ry * 2)), mx - 2 + (i % 4 ? 1 : -1), ly - ry + i, 4, 1);
        var dk = mix(T.bark, [90, 66, 44], 0.4);
        rect(b.x, dk, null, cx - rx - 4, ly - 2, Math.round(rx * 0.35), 3); for (i = 0; i < 4; i++) rect(b.x, mix(dk, [0, 0, 0], 0.4), null, cx - rx - 2 + i * Math.round(rx * 0.1), ly + 1, 1, 4);
        var bx = cx - Math.round(rx * 0.35), by = ly + 2;
        rect(b.x, dk, null, bx, by, 22, 4); rect(b.x, dk, null, bx + 3, by + 4, 16, 2); rect(b.x, mix(dk, [0, 0, 0], 0.5), null, bx + 3, by + 1, 16, 2); rect(b.x, [100, 90, 70], null, bx + 18, by - 5, 1, 8); rect(b.x, [100, 90, 70], null, bx + 14, by - 5, 5, 1);
        row(f.x, g, 2, 38, function (a, z) { return z > g.W * 0.2 && a < g.W * 0.8; }); row(f.x, g, 3, 42, function (a, z) { return z > g.W * 0.16 && a < g.W * 0.84; });
        frameTrees(f.x, g, 68);
      },
      live: function (x, g, t) {
        var cx = Math.round(g.W / 2 + g.W * 0.08), ly = Math.round(g.H * 0.4);
        for (var k = 0; k < 3; k++) { var p = ((t * 0.35 + k / 3) % 1), rx = Math.round(3 + p * 26), ry = Math.max(1, Math.round(rx * 0.3)); x.strokeStyle = rgb(light(), (0.5 * (1 - p)).toFixed(2)); x.lineWidth = 1; x.beginPath(); x.ellipse(cx + 0.5, ly + 0.5, rx, ry, 0, 0, 6.283); x.stroke(); }
        for (k = 0; k < 4; k++) { var q = (t * 0.8 + k * 0.27) % 1; rect(x, light(), (0.8 * (1 - q)).toFixed(2), cx + Math.round(Math.sin(k * 2 + t) * 2), ly - Math.round(q * 6), 1, 1); }
      } },

    { hz: 0.4, paint: function (b, f, g) {
        var tx = Math.round(g.W * 0.7), top = Math.round(g.H * 0.08);
        sky(b.x, g, tx, top, light(), 0.35); moon(b.x, g, Math.round(g.W * 0.32), Math.round(g.H * 0.14));
        row(b.x, g, 0, 13); row(b.x, g, 1, 25); ground(b.x, g); tufts(b.x, g, 7, g.W * 0.5);
        var wd = mix(T.bark, [70, 52, 36], 0.4), leg = mix(wd, [0, 0, 0], 0.3), bot = base(g, 1) + 2, w = Math.max(10, Math.round(g.W * 0.05));
        rect(b.x, leg, null, tx - w, top + 8, 2, bot - top - 8); rect(b.x, leg, null, tx + w - 2, top + 8, 2, bot - top - 8);
        for (var y = top + 12; y < bot - 4; y += 8) { b.x.strokeStyle = rgb(leg); b.x.lineWidth = 1; b.x.beginPath(); b.x.moveTo(tx - w + 1, y); b.x.lineTo(tx + w - 1, y + 7); b.x.moveTo(tx + w - 1, y); b.x.lineTo(tx - w + 1, y + 7); b.x.stroke(); }
        rect(b.x, wd, null, tx - w - 3, top, w * 2 + 6, 9); rect(b.x, mix(wd, [0, 0, 0], 0.4), null, tx - w - 3, top + 8, w * 2 + 6, 1);
        rect(b.x, [10, 10, 12], null, tx - w - 5, top - 5, w * 2 + 10, 5);
        rect(b.x, T.warm, 0.9, tx - 2, top + 3, 4, 3);
        var fc = mix(T.ground[1], [0, 0, 0], 0.35), fy = Math.round(g.H * 0.6);
        for (var i = 0; i < 9; i++) rect(b.x, leg, null, Math.round(g.W * 0.08) + i * Math.round(g.W * 0.03), fy - 6, 1, 6);
        rect(b.x, leg, null, Math.round(g.W * 0.08), fy - 5, Math.round(g.W * 0.24), 1);
        for (i = 0; i < 8; i++) foot(b.x, Math.round(g.W * 0.2) + i * 8, fy + 6 - i + (i % 2) * 2, fc, i % 2);
        b.x.fillStyle = rgb(mix(T.grass[1], T.dark, 0.3)); blob(b.x, Math.round(g.W * 0.2) + 72, fy - 3, 6);
        row(f.x, g, 2, 39, function (a, z) { return z > g.W * 0.12 && a < g.W * 0.88; }); frameTrees(f.x, g, 69);
      },
      live: function (x, g, t) {
        var tx = Math.round(g.W * 0.7), ty = Math.round(g.H * 0.08) + 4, sw = Math.sin(t * 0.45), gx = g.W * (0.45 + sw * 0.4), gy = g.H * 0.5, spread = g.W * 0.08;
        x.fillStyle = rgb(T.warm, 0.13); x.beginPath(); x.moveTo(tx, ty); x.lineTo(gx - spread, gy); x.lineTo(gx + spread, gy); x.closePath(); x.fill();
        x.fillStyle = rgb(T.warm, 0.18); ellipse(x, Math.round(gx), Math.round(gy), Math.round(spread), Math.max(2, Math.round(spread * 0.3)));
      } },

    { hz: 0.44, paint: function (b, f, g) {
        var cx = Math.round(g.W / 2), tw = Math.round(g.W * 0.26), hy = Math.round(g.H * 0.44);
        sky(b.x, g, cx, Math.round(g.H * 0.12), light(), 0.4); moon(b.x, g, Math.round(g.W * 0.24), Math.round(g.H * 0.1));
        row(b.x, g, 0, 14); row(b.x, g, 1, 26); ground(b.x, g); tufts(b.x, g, 8, g.W * 0.5);
        var col = mix(T.bark, [60, 44, 30], 0.35), r = rng(71);
        for (var y = 0; y < hy + 14; y++) {
          var e = y < hy - 10 ? 0 : Math.round(Math.pow((y - (hy - 10)) / 24, 2) * tw * 0.5);
          rect(b.x, col, null, cx - tw / 2 - e, y, tw + e * 2, 1);
        }
        for (var s = 0; s < tw; s += 3 + Math.floor(r() * 3)) rect(b.x, mix(col, [0, 0, 0], 0.45), null, cx - tw / 2 + s, 0, 1, hy - 14);
        rect(b.x, mix(col, light(), 0.2), null, cx + tw / 2 - 1, 0, 1, hy);
        var hw = Math.round(tw * 0.5), hh = Math.round(g.H * 0.22);
        b.x.fillStyle = "#020203"; ellipse(b.x, cx, hy - Math.round(hh * 0.45), Math.round(hw / 2), Math.round(hh / 2)); rect(b.x, [2, 2, 3], null, cx - hw / 2, hy - Math.round(hh * 0.45), hw + 1, Math.round(hh * 0.45) + 2);
        var mc = mix(T.warm, [255, 255, 255], 0.3);
        [[-0.2, 1], [-0.16, -1], [0.18, 2], [0.22, 0]].forEach(function (m) { var mx = cx + Math.round(g.W * m[0]), my = hy + 6 + m[1]; rect(b.x, [200, 190, 170], null, mx, my, 1, 2); rect(b.x, mc, null, mx - 1, my - 1, 3, 1); glow(b.x, mx, my, 5, mc, 0.5); });
        var fc = mix(T.ground[1], [0, 0, 0], 0.35); for (var i = 0; i < 7; i++) foot(b.x, cx - 2 + (i % 2) * 4, g.H - 6 - i * 5, fc, i % 2);
        row(f.x, g, 2, 40, function (a, z) { return z > g.W * 0.22 && a < g.W * 0.78; }); frameTrees(f.x, g, 70);
      },
      live: function (x, g, t) {
        var cx = Math.round(g.W / 2), ey = Math.round(g.H * 0.44 - g.H * 0.13);
        [[-12, 0, 0.9], [8, 7, 1.3]].forEach(function (e, i) {
          var open = ((t * e[2] + i * 0.37) % 3.2) > 0.18;
          if (!open) return;
          rect(x, [250, 246, 230], null, cx + e[0] - 6, ey + e[1], 4, 4); rect(x, [250, 246, 230], null, cx + e[0] + 2, ey + e[1], 4, 4);
          rect(x, [10, 10, 12], null, cx + e[0] - 3, ey + e[1] + 1, 1, 2); rect(x, [10, 10, 12], null, cx + e[0] + 5, ey + e[1] + 1, 1, 2);
        });
      } },

    { hz: 0.38, paint: function (b, f, g) {
        var cx = Math.round(g.W / 2), py = Math.round(g.H * 0.2);
        sky(b.x, g, cx, Math.round(g.H * 0.2), light(), 0.35); moon(b.x, g, Math.round(g.W * 0.64), Math.round(g.H * 0.1));
        row(b.x, g, 0, 15); row(b.x, g, 1, 27); ground(b.x, g);
        for (var y = g.hz; y < g.H; y++) {
          var t = (y - g.hz) / (g.H - g.hz), pc = mix(T.path[0], T.path[1], t), half = 2 + t * g.W * 0.06, off = (1 - t) * g.W * 0.3;
          rect(b.x, pc, null, cx - off - half, y, half * 2, 1); rect(b.x, pc, null, cx + off - half, y, half * 2, 1);
          if (t > 0.55) rect(b.x, pc, null, cx - off - half, y, off * 2 + half * 2, 1);
        }
        tufts(b.x, g, 9, g.W * 0.4);
        var wd = mix(T.bark, [90, 66, 44], 0.5);
        rect(b.x, mix(wd, [0, 0, 0], 0.3), null, cx - 1, py - 4, 2, Math.round(g.H * 0.22));
        rect(b.x, wd, null, cx - 24, py, 23, 6); rect(b.x, wd, null, cx - 27, py + 1, 3, 4);
        rect(b.x, wd, null, cx + 1, py + 9, 23, 6); rect(b.x, wd, null, cx + 24, py + 10, 3, 4);
        rect(b.x, wd, null, cx - 10, py + 18, 20, 6);
        [[cx - 20, py + 2, 14], [cx + 5, py + 11, 14]].forEach(function (s) { rect(b.x, [30, 22, 16], null, s[0], s[1], s[2], 1); rect(b.x, [30, 22, 16], null, s[0], s[1] + 2, s[2] - 4, 1); });
        rect(b.x, [150, 30, 24], null, cx - 5, py + 20, 10, 1); rect(b.x, [150, 30, 24], null, cx - 1, py + 19, 2, 3);
        var fx = cx + Math.round(g.W * 0.22), fy = g.hz + 3;
        rect(b.x, T.dark, null, fx, fy - 7, 3, 7); rect(b.x, T.dark, null, fx - 1, fy - 9, 5, 2); rect(b.x, T.dark, null, fx, fy - 11, 3, 2);
        glow(b.x, fx + 4, fy - 4, 6, T.warm, 0.8); rect(b.x, T.warm, null, fx + 4, fy - 5, 1, 2);
        row(f.x, g, 2, 41, function (a, z) { return z > g.W * 0.14 && a < g.W * 0.86; }); frameTrees(f.x, g, 71);
      },
      live: function (x, g, t) {
        var cx = Math.round(g.W / 2), py = Math.round(g.H * 0.2), a = Math.sin(t * 1.6) * 0.35, len = 6;
        var hx = cx - 23, lx = Math.round(hx + Math.sin(a) * len), ly = Math.round(py + 6 + Math.cos(a) * len);
        x.strokeStyle = rgb([30, 26, 22]); x.lineWidth = 1; x.beginPath(); x.moveTo(hx + 0.5, py + 6); x.lineTo(lx + 0.5, ly); x.stroke();
        glow(x, lx, ly + 3, 10, T.warm, 0.7); rect(x, [30, 26, 22], null, lx - 2, ly, 5, 1); rect(x, T.warm, null, lx - 2, ly + 1, 5, 4); rect(x, [30, 26, 22], null, lx - 2, ly + 5, 5, 1);
      } }
  ];

  function flames(x, fx, fy, t, s) {
    var cols = [[255, 226, 130], [255, 150, 50], [220, 70, 30]];
    rect(x, [40, 30, 22], null, fx - 5, fy + 1, 11, 2);
    for (var i = -4; i <= 4; i++) {
      var h = Math.max(1, Math.round((7 - Math.abs(i) * 1.5 + Math.sin(t * 9 + i * 1.7) * 1.6) * s));
      for (var j = 0; j < h; j++) rect(x, cols[Math.min(2, Math.floor(j / (2 * s) + Math.abs(i) / 2))], null, fx + i, fy - j, 1, 1);
    }
    for (var k = 0; k < 3; k++) { var q = (t * 0.9 + k * 0.33) % 1; rect(x, [255, 180, 80], (1 - q).toFixed(2), fx + Math.round(Math.sin(k * 3 + t * 2) * 3), fy - 8 * s - Math.round(q * 14), 1, 1); }
  }
  function fog(x, g, t) {
    var bands = [[g.hz - 2, 0.1, 0.18, 4], [base(g, 2), 0.12, 0.12, 7]];
    for (var b = 0; b < bands.length; b++) {
      var B = bands[b], h = Math.round(g.H * B[1]), off = (t * B[3]) % (g.W * 2);
      for (var s = 0; s < 6; s++) {
        var sx = ((s * g.W / 3 + off) % (g.W * 2)) - g.W / 2, sw = g.W * 0.45;
        for (var j = 0; j < 4; j++) rect(x, T.fog, Math.min(0.4, B[2] * (j + 1) / 4), sx + j * sw / 8, B[0] - h / 2 + j * h / 8, sw - j * sw / 4, h - j * h / 4);
      }
    }
  }
  function air(x, S, t) {
    var g = S.g, c = T.mote;
    for (var m = 0; m < S.motes.length; m++) {
      var M = S.motes[m], mx, my;
      if (T.air === "snow") { my = Math.round((M.y + t * (6 + M.s * 10)) % g.H); mx = Math.round(M.x + Math.sin(t * 0.8 * M.s + M.p) * 3); rect(x, c, 0.8, mx, my, M.d, M.d); }
      else if (T.air === "embers") { my = Math.round(((M.y - t * (8 + M.s * 6)) % g.H + g.H) % g.H); mx = Math.round(M.x + Math.sin(t * 0.9 * M.s + M.p) * 5); rect(x, c, (0.5 + 0.5 * Math.sin(t * 3 * M.s + M.p)).toFixed(2), mx, my, M.d, M.d); }
      else {
        var a = 0.5 + 0.5 * Math.sin(t * 1.7 * M.s + M.p); if (a < 0.15) continue;
        mx = Math.round(M.x + Math.sin(t * 0.3 * M.s + M.p) * 6); my = Math.round(M.y + Math.cos(t * 0.2 * M.s + M.p) * 4);
        rect(x, c, (a * 0.25).toFixed(2), mx - 1, my - 1, M.d + 2, M.d + 2); rect(x, c, a.toFixed(2), mx, my, M.d, M.d);
      }
    }
  }

  function bake(W, H, world) {
    var sc = SCENES[world - 1], g = { W: W, H: H, hz: Math.round(H * sc.hz) }, back = layer(W, H), front = layer(W, H);
    sc.paint(back, front, g);
    var r = rng(99), motes = [], n = T.air === "snow" ? 60 : 34;
    for (var i = 0; i < n; i++) motes.push({ x: r() * W, y: T.air === "fireflies" ? g.hz - H * 0.2 + r() * H * 0.5 : r() * H, p: r() * 6.28, s: 0.3 + r() * 0.6, d: r() < 0.5 ? 1 : 2 });
    return { g: g, sc: sc, back: back, front: front, motes: motes };
  }
  function frame(x, S, t) {
    x.drawImage(S.back.c, 0, 0);
    fog(x, S.g, t);
    S.sc.live(x, S.g, t);
    x.drawImage(S.front.c, 0, 0);
    air(x, S, t);
  }
  function norm(world, colour) {
    return { world: world >= 1 && world <= SCENES.length ? +world : DEFAULT_WORLD, colour: COLOURS[colour] ? +colour : DEFAULT_COLOUR };
  }
  function pick() { return norm(DEFAULT_WORLD, DEFAULT_COLOUR); }
  function paint(canvas, world, colour) {
    if (!canvas || !canvas.getContext) return;
    var n = norm(world, colour); T = COLOURS[n.colour];
    var x = canvas.getContext("2d"); x.imageSmoothingEnabled = false;
    frame(x, bake(canvas.width, canvas.height, n.world), 2);
  }
  var active = null;
  function start(canvas) {
    if (!canvas || !canvas.getContext || typeof document === "undefined" || !document.createElement) return;
    var ctx = canvas.getContext("2d"); if (!ctx) return;
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var look = pick(), S = null, last = 0, t0 = performance.now(), rt = 0;
    function size(force) {
      var vw = window.innerWidth || 1280, vh = window.innerHeight || 720, ps = Math.max(2, Math.round(vh / 230));
      var W = Math.ceil(vw / ps), H = Math.ceil(vh / ps);
      if (!force && S && S.g.W === W && S.g.H === H) return;
      T = COLOURS[look.colour]; canvas.width = W; canvas.height = H; ctx.imageSmoothingEnabled = false; S = bake(W, H, look.world);
    }
    function draw(now) { T = COLOURS[look.colour]; frame(ctx, S, still ? 2 : (now - t0) / 1000); }
    function loop(now) {
      if (!canvas.isConnected) { window.removeEventListener("resize", onResize); return; }
      if (!document.hidden && now - last >= 33) { last = now; draw(now); }
      if (window.BH && BH.nextFrame) BH.nextFrame(loop, true); else requestAnimationFrame(loop);
    }
    function onResize() { if (!canvas.isConnected) { window.removeEventListener("resize", onResize); return; } clearTimeout(rt); rt = setTimeout(function () { size(); draw(performance.now()); }, 150); }
    size(); draw(t0);
    active = { canvas: canvas, set: function (w, c) { look = norm(w || look.world, c || look.colour); size(true); draw(performance.now()); }, look: function () { return look; } };
    window.addEventListener("resize", onResize);
    if (!still) requestAnimationFrame(loop);
  }
  function set(world, colour) { if (active && active.canvas.isConnected) active.set(world, colour); }

  window.BH = window.BH || {};
  BH.forest = { start: start, paint: paint, pick: pick, set: set, WORLDS: WORLDS, COLOURS: COLOURS };
})();
