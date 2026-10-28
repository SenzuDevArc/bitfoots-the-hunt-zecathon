"use strict";
(function () {
  if (!window.BH || !BH.features || !BH.features.register) return;
  var asked = -1, last = null, trees = 0, tall = [];
  function geo(t, y0) { return { x: -T * 2.3, y: y0 - T * 2.4, dir: -1.2 - t * 0.55, half: 0.2, vis: T * 12.5 }; }
  function beam(t, y0) { asked = simTime; return geo(t, y0); }
  function legacy(t, y0) { return { x: -T * 9, y: y0, dir: Math.sin(t * 0.8) * 0.3, half: 0.2, vis: T * 12.5 }; }
  function live() { return asked >= 0; }

  function tallTree(r, s) {
    var c = document.createElement("canvas"), w = Math.round(54 * s), h = Math.round(104 * s); c.width = w; c.height = h;
    var b = c.getContext("2d");
    b.fillStyle = "rgba(0,0,0,0.3)"; b.beginPath(); b.ellipse(w / 2, h - 4, 14, 4, 0, 0, 6.283); b.fill();
    b.fillStyle = C.trunk; b.fillRect(Math.round(w / 2) - 4, h - 26, 8, 22);
    [[0, 6, 6], [6, 12, 8], [13, 20, 9], [21, 28, 10], [30, 36, 11], [40, 44, 12], [51, 52, 14], [63, 54, 15]].forEach(function (l0) {
      var l = [Math.round(l0[0] * s), Math.round(l0[1] * s / 2) * 2, Math.max(4, Math.round(l0[2] * s))], x = Math.round((w - l[1]) / 2);
      b.fillStyle = C.tree; b.fillRect(x, l[0], l[1], l[2]);
      b.fillStyle = r ? C.tree2 : C.tree3; b.fillRect(x + 2, l[0], Math.floor(l[1] / 2) - 2, 2);
      b.fillStyle = "rgba(0,0,0,0.22)"; b.fillRect(x, l[0] + l[2] - 2, l[1], 2);
    });
    return c;
  }

  function forest(g, y0, tw) {
    var x0 = view.x0 - T, y0v = (cam.y || y0) - H / zoom / 2 - T * 4, y1 = (cam.y || y0) + H / zoom / 2 + T * 4;
    if (x0 >= 0) return 0;
    var r0 = Math.floor(y0 / T), n = 0, tx0 = Math.floor(x0 / T), ty0 = Math.floor(y0v / T), ty1 = Math.ceil(y1 / T);
    g.fillStyle = C.ground; g.fillRect(x0, ty0 * T, -x0, (ty1 - ty0) * T);
    for (var ty = ty0; ty < ty1; ty++) for (var tx = tx0; tx < 0; tx++) {
      var h = hash(tx * 7 + 3, ty * 11 + 5);
      g.fillStyle = h < 0.3 ? C.ground2 : h > 0.8 ? C.ground3 : C.ground; g.fillRect(tx * T, ty * T, T, T);
      if (ty === r0 || ty === r0 + 1) { g.fillStyle = "#2a2116"; g.fillRect(tx * T, ty * T + (ty === r0 ? 18 : 0), T, ty === r0 ? 14 : 10); }
    }
    if (!tall.length) tall = [tallTree(0, 1), tallTree(1, 1), tallTree(0, 0.82), tallTree(1, 0.9)];
    for (ty = ty0; ty < ty1; ty++) {
      if (ty >= r0 - 1 && ty <= r0 + 3) continue;
      for (tx = tx0; tx < 0; tx++) {
        if (Math.abs((tx + 0.5) * T - tw.x) < T * 2.2 && Math.abs((ty + 1) * T - tw.base) < T * 2.5) continue;
        var r = hash(tx * 5 + 1, ty * 3 + 9), c = tall[Math.floor(r * 4) % 4];
        g.drawImage(c, Math.round((tx + 0.5) * T - c.width / 2 + (hash(ty, tx) - 0.5) * 8), Math.round((ty + 1) * T - c.height));
        n++;
      }
    }
    return n;
  }

  function tower(g, lx, ly, base, dir) {
    var wd = "#5a3d24", leg = "#3d2918", hw = 13;
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(lx, base, 24, 6, 0, 0, 6.283); g.fill();
    g.fillStyle = leg; g.fillRect(lx - hw - 3, ly + 10, 4, base - ly - 10); g.fillRect(lx + hw - 1, ly + 10, 4, base - ly - 10);
    g.strokeStyle = leg; g.lineWidth = 2; g.beginPath();
    for (var y = ly + 16; y < base - 8; y += 14) { g.moveTo(lx - hw, y); g.lineTo(lx + hw, y + 12); g.moveTo(lx + hw, y); g.lineTo(lx - hw, y + 12); }
    g.stroke();
    g.fillStyle = wd; g.fillRect(lx - hw - 6, ly + 6, hw * 2 + 12, 8);
    g.fillStyle = "#2c1d10"; g.fillRect(lx - hw - 6, ly + 13, hw * 2 + 12, 2);
    g.fillStyle = "#1f130a"; g.fillRect(lx - hw - 3, ly - 8, 3, 14); g.fillRect(lx + hw, ly - 8, 3, 14);
    g.fillStyle = "rgba(234,186,73,0.25)"; g.fillRect(lx - hw, ly - 8, hw * 2, 14);
    g.fillStyle = "#0a0a0c"; g.fillRect(lx - hw - 8, ly - 16, hw * 2 + 16, 8); g.fillRect(lx - hw - 2, ly - 20, hw * 2 + 4, 4);
    var sx = Math.round(Math.cos(dir) * 5);
    g.fillStyle = "#3a3a36"; g.fillRect(lx - 4, ly - 4, 8, 8);
    g.fillStyle = "#fff3b0"; g.fillRect(lx - 2 + sx, ly - 3, 4, 6);
    g.fillStyle = "rgba(255,227,154,0.35)"; g.beginPath(); g.arc(lx + sx, ly, 9, 0, 6.283); g.fill();
  }

  function dim(g) {
    var x0 = view.x0 - T, y0 = view.y0 - T, h = H / zoom + T * 2;
    g.fillStyle = "rgba(3,6,5,0.6)"; g.fillRect(x0, y0, -T - x0, h);
    var gr = g.createLinearGradient(-T, 0, 0, 0); gr.addColorStop(0, "rgba(3,6,5,0.6)"); gr.addColorStop(1, "rgba(3,6,5,0)");
    g.fillStyle = gr; g.fillRect(-T, y0, T, h);
  }
  function zzz(g, lx, ly) {
    var t = performance.now() / 1000;
    g.save(); g.textAlign = "center"; g.textBaseline = "middle";
    for (var i = 0; i < 3; i++) {
      var f = (t / 2.4 + i / 3) % 1, a = f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85;
      g.globalAlpha = Math.max(0, a) * 0.9; g.fillStyle = "#e8e2c8";
      g.font = "700 " + Math.round(9 + f * 9) + "px 'Plex Cond', sans-serif";
      g.fillText("Z", Math.round(lx + 12 + f * 16 + Math.sin(f * 6.283) * 3), Math.round(ly - 22 - f * 34));
    }
    g.restore();
  }

  function runners(y0, p0x) {
    var pl = typeof player !== "undefined" && player ? player : null; if (!pl) return [];
    var sx = -T * 2.6, k = p0x > sx ? Math.max(0, Math.min(1, (pl.x - sx) / (p0x - sx))) : 1;
    return [{ x: pl.x, y: pl.y }, { x: -T * 1.2 + (p0x + T * 1.4 + T * 1.2) * k, y: y0 + T * 0.2 }, { x: -T * 4.2 + (p0x - T * 1.4 + T * 4.2) * k, y: y0 + T * 0.2 }];
  }
  function lit(b, p) {
    var d = Math.hypot(p.x - b.x, p.y - b.y), a = Math.atan2(p.y - b.y, p.x - b.x), da = Math.atan2(Math.sin(a - b.dir), Math.cos(a - b.dir));
    if (d > b.vis || Math.abs(da) > b.half) return false;
    for (var s = 0; s < d; s += 4) {
      var px = b.x + Math.cos(a) * s, py = b.y + Math.sin(a) * s;
      if (px >= 0 && solidP(tileAt(px, py)) && !(px < T && Math.abs(Math.floor(py / T) - Math.floor(run.p0.y / T)) <= 1)) return false;
    }
    return true;
  }

  var run = null;
  BH.features.register("lighthouse", {
    onLevelStart: function () {
      var p = null;
      (L.map || []).forEach(function (r, y) { var x = r.indexOf("P"); if (x >= 0 && !p) p = { x: (x + 0.5) * T, y: (y + 0.5) * T }; });
      run = p ? { p0: p, t0: -1 } : null; last = null; asked = -1;
    },
    onDrawWorld: function (g) {
      if (!run) return;
      var cine = document.body.classList.contains("trail-cine");
      if (cine && run.t0 < 0) run.t0 = simTime;
      var t = run.t0 < 0 ? 0 : simTime - run.t0, y0 = run.p0.y, isNew = live() || t < 1, b = isNew ? geo(t, y0) : legacy(t, y0);
      var base = isNew ? y0 - T * 0.6 : y0 + T * 3.2, tw = { x: b.x, base: base }, shown = view.x0 <= 0;
      trees = shown ? forest(g, y0, tw) : 0;
      if (shown) { tower(g, Math.round(b.x), Math.round(b.y), Math.round(base), cine ? b.dir : Math.PI / 2); dim(g); zzz(g, Math.round(b.x), Math.round(b.y)); }
      var rs = runners(y0, run.p0.x);
      last = { cine: cine, t: +t.toFixed(2), viewX0: Math.round(view.x0), drawn: shown, mode: live() ? "new" : isNew ? "unlit" : "legacy",
        onScreen: shown && b.x - 20 >= view.x0 && b.x + 20 <= view.x1, forest: trees, dir: +b.dir.toFixed(3),
        hit: cine && t > 0 ? rs.map(function (p, i) { return lit(b, p) ? i : -1; }).filter(function (i) { return i >= 0; }) : [] };
    }
  });
  BH.trailLighthouse = { beam: beam, state: function () { return last; } };
})();
