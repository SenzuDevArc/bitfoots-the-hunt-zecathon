(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.hallMoves) return;
  var add = BH.hallMoves.add;

  function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h)); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function seg(T, a, b) { return cl((T - a) / (b - a)); }
  function ei(q) { return q * q; }
  function eo(q) { return 1 - (1 - q) * (1 - q); }
  function eio(q) { return q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function pick(l) { return l[Math.floor(Math.random() * l.length)]; }
  function sideOf(a) { var d = a.x - a.lad; return Math.abs(d) > 2 ? (d > 0 ? 1 : -1) : a.dir === "left" ? -1 : 1; }
  function shadow(g, x, F, k) { var w = Math.round(24 * k); if (w < 4) return; P(g, Math.round(x) - w / 2, F + 1, w, 3, "rgba(0,0,0,0.35)"); }
  function ceilClip(g, a) { g.beginPath(); g.rect(a.cam - 2, 12, a.VW + 4, a.R); g.clip(); }
  function oval(g, cx, top, w, h, c) {
    for (var r = 0; r < h; r++) { var t = (r + 0.5) / h * 2 - 1, hw = Math.round(w / 2 * Math.sqrt(Math.max(0, 1 - t * t))); if (hw > 0) P(g, Math.round(cx) - hw, Math.round(top) + r, hw * 2, 1, typeof c === "function" ? c(r, h) : c); }
  }
  function dust(a, x, y, n, c) { for (var i = 0; i < n; i++) { var an = (i / n) * Math.PI, v = rnd(40, 90); a.fx({ x: x + Math.cos(an) * 6, y: y, vx: Math.cos(an) * v, vy: -Math.sin(an) * v * 0.4, g: 60, drag: 3, life: 0.5, c: c || "#c8a670", sz: 2, sz2: 4, a: 0.7 }); } }
  function hopStart(s, a) { s.sd = sideOf(a); s.x0 = a.x; s.x = Math.round(a.lad + s.sd * 32); }
  function hopX(s, T) { return s.x0 + (s.x - s.x0) * eio(seg(T, 0, 0.18)); }
  function hopY(a, T) { return a.F + 1 - Math.round(Math.sin(seg(T, 0, 0.18) * Math.PI) * 8); }

  var CS = 6;
  function scan(sp) {
    if (sp.c._mvs) return sp.c._mvs;
    var W = sp.c.width, H = sp.c.height, d = null, i = { x0: sp.ax - 24, x1: sp.ax + 24, y0: sp.ay - 62, y1: sp.ay, eye: null, cells: [] };
    try { d = sp.c.getContext("2d").getImageData(0, 0, W, H).data; } catch (e) { d = null; }
    var al = function (x, y) { return d[(y * W + x) * 4 + 3] > 16; }, x, y, cx, cy;
    if (d) {
      var x0 = W, x1 = -1, y0 = H, y1 = -1;
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (al(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 >= 0) { i.x0 = x0; i.x1 = x1 + 1; i.y0 = y0; i.y1 = y1 + 1; }
      var gx = 0, gy = 0, gn = 0, lim = i.y0 + (i.y1 - i.y0) * 0.45;
      for (y = i.y0; y < lim; y++) for (x = i.x0; x < i.x1; x++) { var o = (y * W + x) * 4, r = d[o], gg = d[o + 1], b = d[o + 2]; if (d[o + 3] > 16 && r > 170 && gg > 120 && b < 110 && r > b + 60) { gx += x; gy += y; gn++; } }
      if (gn >= 3) i.eye = { x: gx / gn, y: gy / gn };
    }
    for (cy = i.y0; cy < i.y1; cy += CS) for (cx = i.x0; cx < i.x1; cx += CS) {
      var hit = !d;
      if (d) for (y = cy; y < Math.min(H, cy + CS) && !hit; y++) for (x = cx; x < Math.min(W, cx + CS) && !hit; x++) if (al(x, y)) hit = true;
      if (hit) i.cells.push({ x: cx, y: cy });
    }
    try { sp.c._mvs = i; } catch (e) {}
    return i;
  }

  var ICE = ["#bdeaff", "#e8faff", "#8fd0ee", "#ffffff"];
  function iceBlock(g, cx, top, k) {
    var w = Math.round(14 * k), h = Math.max(1, Math.round(5 * k)); if (w < 2) return;
    var x = Math.round(cx) - (w >> 1), y = Math.round(top);
    P(g, x, y, w, h, "#3a6a88"); if (w > 2) { P(g, x + 1, y, w - 2, Math.max(1, h - 1), "#bdeaff"); P(g, x + 1, y, w - 2, 1, "#ffffff"); }
  }
  function iceCol(g, x, top, bot, al) {
    var h = bot - top; if (h < 1) return;
    g.save(); g.globalAlpha = al;
    P(g, x - 13, top, 26, h, "#8fd0ee"); P(g, x - 12, top, 24, h, "#bdeaff");
    g.globalAlpha = al * 0.55; P(g, x - 10, top, 20, h, "#e8faff");
    g.globalAlpha = al; P(g, x - 13, top, 1, h, "#3a6a88"); P(g, x + 12, top, 1, h, "#3a6a88"); P(g, x - 8, top, 2, h, "#ffffff"); P(g, x + 6, top, 1, h, "#ffffff");
    for (var y = top + 9; y < bot - 3; y += 23) { P(g, x - 3, y, 3, 1, "#5fa8cc"); P(g, x, y + 1, 2, 1, "#5fa8cc"); P(g, x + 2, y + 2, 1, 2, "#5fa8cc"); }
    g.restore();
  }
  function frost(a, x, y, n, up) { for (var i = 0; i < n; i++) a.fx({ x: x + rnd(-6, 6), y: y, vx: rnd(-60, 60), vy: up ? rnd(-110, -30) : rnd(-40, 20), g: 180, drag: 2, life: rnd(0.3, 0.6), c: pick(ICE), sz: 2, sz2: 1, add: true }); }
  function tinkle(a) { a.sfx("voice", { f: rnd(1800, 2600), slide: 0.6, wave: "sine", vol: 0.05 }); }
  function shatter(a, x, y0, y1, n) { for (var i = 0; i < n; i++) a.fx({ x: x + rnd(-12, 12), y: rnd(y0, y1), vx: rnd(-90, 90), vy: rnd(-120, 0), g: 500, life: rnd(0.4, 0.8), c: pick(ICE), sz: pick([2, 3]), sz2: 1 }); }
  var SH = 20;
  add("char-046", {
    up: {
      out: 1.0, in: 0.7,
      update: function (s, a, dt) {
        if (Math.random() < 0.6) a.fx({ x: a.lad + rnd(-10, 10), y: (s.y || a.F) - rnd(5, 55), vx: rnd(-8, 8), vy: rnd(-20, -5), life: 0.4, c: pick(ICE), sz: 1, add: true, a: 0.7 });
        var n = s.n || 0;
        if (a.out) { var r = (a.F + 6) * seg(a.T, 0.12, 1.0); if (Math.floor(r / SH) > n) { s.n = Math.floor(r / SH); frost(a, a.lad, a.F + 1 - s.n * SH, 4); tinkle(a); } }
        else { if (once(s, "in0")) s.n = 0; var r2 = 66 * seg(a.T, 0, 0.42); if (Math.floor(r2 / 22) > n) { s.n = Math.floor(r2 / 22); tinkle(a); }
          if (a.T > 0.48 && once(s, "brk")) { shatter(a, a.lad, a.F - 2, a.F + 60, 26); tinkle(a); a.sfx("coinIn"); } }
      },
      draw: function (g, s, a) {
        var T = a.T, F = a.F, x = Math.round(a.lad), y, sx = 1, sy = 1, k, ok;
        g.save(); a.clip(g);
        if (a.out) {
          var rise = 0, ste = (F + 6) / SH;
          if (T < 0.12) { var q = T / 0.12; sy = 1 - 0.18 * q; sx = 1 + 0.12 * q; }
          else { var u = seg(T, 0.12, 1.0) * ste, n = Math.floor(u), f = u - n; rise = SH * (n + eio(f)); sy = 1 + 0.1 * Math.sin(f * Math.PI); sx = 1 / sy; }
          y = Math.round(F + 1 - rise);
          for (k = 1; k <= Math.floor(rise / SH) + 1; k++) iceBlock(g, x + (k % 2 ? -5 : 5), F + 1 - k * SH, cl(rise / SH - (k - 1) + 0.25));
          ok = a.body(g, x, y, { dir: "up", state: "walk", t: T * 1.7, sx: sx, sy: sy });
        } else {
          var u2 = seg(T, 0, 0.42) * 3, n2 = Math.floor(u2), f2 = u2 - n2, r2 = n2 >= 3 ? 66 : 22 * (n2 + eio(f2));
          y = Math.round(F + 1 + 66 - r2);
          if (T < 0.48) for (k = 1; k <= Math.min(3, n2 + 1); k++) iceBlock(g, x + (k % 2 ? -5 : 5), F + 67 - k * 22, cl(r2 / 22 - (k - 1) + 0.25));
          var l = seg(T, 0.42, 0.7); if (l > 0) { sy = 1 - 0.22 * Math.sin(l * Math.PI); sx = 1 + 0.18 * Math.sin(l * Math.PI); }
          if (T > 0.4) shadow(g, x, F, 1);
          ok = a.body(g, x, y, { dir: T < 0.45 ? "up" : a.dir, state: T < 0.42 ? "walk" : "idle", t: T * 1.7, sx: sx, sy: sy });
        }
        s.y = y; g.restore(); return ok;
      }
    },
    down: {
      out: 0.75, in: 0.75,
      update: function (s, a, dt) {
        var T = a.T, F = a.F;
        if (a.out) {
          if (T < 0.3) { frost(a, a.lad, F + 2 + (a.R - F) * eo(T / 0.3), 1); if (once(s, "c0")) tinkle(a); if (T > 0.15 && once(s, "c1")) tinkle(a); }
          if (T > 0.4) { if (once(s, "wh")) a.sfx("whoosh"); frost(a, a.lad, F, 3, true); }
        } else {
          if (T < 0.4) frost(a, a.lad, Math.max(12, s.y || 12) - 4, 2, true);
          if (T >= 0.4 && once(s, "land")) { a.shake(3); a.sfx("sprint", { vol: 1.6 }); tinkle(a); a.sfx("coinIn"); shatter(a, a.lad, 12, F, 40); dust(a, a.lad, F, 10, "#e8faff"); }
        }
      },
      draw: function (g, s, a) {
        var T = a.T, F = a.F, R = a.R, x = Math.round(a.lad), y, ok;
        g.save(); a.clip(g);
        if (a.out) {
          var grow = eo(seg(T, 0, 0.3));
          iceCol(g, x, F - 4, F - 4 + Math.round((R - F + 4) * grow), 0.85);
          if (T < 0.3) { var c = seg(T, 0.05, 0.3); ok = a.body(g, x, F + 1, { sx: 1 + 0.1 * c, sy: 1 - 0.14 * c }); shadow(g, x, F, 1); }
          else if (T < 0.4) { var h = seg(T, 0.3, 0.4); y = Math.round(F + 1 - Math.sin(h * Math.PI) * 6); ok = a.climb(g, x, y, 4); }
          else { y = Math.round(F + 1 + (R + 70 - F) * ei(seg(T, 0.4, 0.75))); ok = a.climb(g, x, y, 4); }
        } else {
          var fade = 1 - seg(T, 0.38, 0.45);
          if (fade > 0) iceCol(g, x, 0, F, 0.85 * fade);
          if (T < 0.4) { y = Math.round(-6 + (F + 7) * ei(T / 0.4)); ok = a.climb(g, x, y, 4); }
          else { var l = seg(T, 0.4, 0.75), sq = Math.sin(l * Math.PI) * (1 - l * 0.5); y = F + 1; shadow(g, x, F, 1.2); ok = a.body(g, x, y, { sx: 1 + 0.3 * sq, sy: 1 - 0.3 * sq }); }
        }
        s.y = y; g.restore(); return ok;
      }
    }
  });

  function shield(g, cx, top, w, h) {
    if (w < 2) { P(g, Math.round(cx) - 1, top, 2, h, "#6e4a1a"); return; }
    oval(g, cx, top - 1, w + 2, h + 2, "#4a2e10");
    oval(g, cx, top, w, h, function (r, n) { return r === 0 ? "#f0c14e" : r < n / 2 ? "#d9a441" : "#b8862e"; });
    if (w > 8) P(g, Math.round(cx) - 2, top + (h >> 1) - 1, 4, 2, "#8a5a20");
  }
  function sparks(a, x, y, n) { for (var i = 0; i < n; i++) { var sd = Math.random() < 0.5 ? -1 : 1; a.fx({ x: x + sd * 13, y: y + rnd(0, 4), vx: sd * rnd(20, 90), vy: rnd(-90, -20), g: 400, life: rnd(0.2, 0.4), c: pick(["#fff0c0", "#ffd27a", "#ff9a3a"]), sz: 2, sz2: 1, add: true }); } }
  function clang(a) { a.sfx("voice", { f: 620, slide: 0.7, wave: "square", vol: 0.06 }); a.sfx("walletLand"); }
  add("char-031", {
    down: {
      out: 0.85, in: 0.9,
      start: function (s, a) { s.sd = a.dir === "left" ? -1 : 1; },
      update: function (s, a, dt) {
        var T = a.T, F = a.F;
        if (a.out) {
          if (T >= 0.25 && once(s, "drop")) { clang(a); sparks(a, a.lad, F - 3, 8); a.shake(2); }
          if (T >= 0.45) { if (once(s, "wh")) a.sfx("whoosh"); var yS = F - 2 + (a.R + 70 - F) * ei(seg(T, 0.45, 0.85)); if (yS < a.R) sparks(a, a.lad, yS, 3); a.sfx("voice", { f: rnd(260, 340), slide: 0.8, wave: "sawtooth", vol: 0.03 }); }
        } else {
          if (T < 0.38) { if (once(s, "wh")) a.sfx("whoosh"); var y2 = -10 + (F + 4) * ei(T / 0.38); if (y2 > 0) sparks(a, a.lad, y2, 3); }
          if (T >= 0.38 && once(s, "hit")) { clang(a); a.shake(3); sparks(a, a.lad, F - 6, 14); dust(a, a.lad, F, 12); }
          if (T >= 0.62 && once(s, "ft")) { a.sfx("sprint", { vol: 1.2 }); dust(a, a.lad, F, 6); }
          if (T >= 0.8 && once(s, "catch")) { a.sfx("coinIn"); for (var i = 0; i < 6; i++) a.fx({ x: a.lad + s.sd * 8, y: F - 28, vx: rnd(-40, 40), vy: rnd(-40, 40), drag: 4, life: 0.3, c: "#fff0c0", sz: 2, sz2: 1, add: true }); }
        }
      },
      draw: function (g, s, a) {
        var T = a.T, F = a.F, R = a.R, x = Math.round(a.lad), sd = s.sd || (s.sd = a.dir === "left" ? -1 : 1), ok, y, yS;
        g.save(); a.clip(g);
        if (a.out) {
          if (T < 0.25) { var q = T / 0.25; yS = Math.round(F - 70 + 68 * ei(q)); shield(g, x, yS, Math.round(30 * Math.abs(Math.cos(T * 20))), 7); ok = a.body(g, x, F + 1, {}); shadow(g, x, F, 1); }
          else if (T < 0.45) { var h = seg(T, 0.25, 0.45); shield(g, x, F - 2, 30, 7); y = Math.round(F + 1 - 3 * h - Math.sin(h * Math.PI) * 14); ok = a.body(g, x, y, { sy: 1 + 0.12 * Math.sin(h * Math.PI), sx: 1 - 0.08 * Math.sin(h * Math.PI) }); }
          else { yS = Math.round(F - 2 + (R + 70 - F) * ei(seg(T, 0.45, 0.85))); shield(g, x, yS, 30, 7); ok = a.body(g, x, yS, { rot: -0.12 * sd, sx: 1.05, sy: 0.95 }); }
        } else {
          if (T < 0.38) { yS = Math.round(-10 + (F + 4) * ei(T / 0.38)); shield(g, x, yS, 30, 7); ok = a.body(g, x, yS, { rot: -0.12 * sd, sx: 1.05, sy: 0.95 }); }
          else {
            var k = seg(T, 0.4, 0.8), j = seg(T, 0.38, 0.62), l = seg(T, 0.62, 0.78), sq = Math.sin(l * Math.PI);
            if (k < 1) { var w = Math.round(30 * Math.abs(Math.cos(k * 7))) * (1 - 0.6 * ei(k)); shield(g, x + Math.round(sd * 8 * k), Math.round(F - 6 - Math.sin(k * Math.PI) * 30 - 16 * ei(k)), Math.round(w), 7); }
            y = j < 1 ? Math.round(F - 6 + 7 * j - Math.sin(j * Math.PI) * 12) : F + 1;
            if (j > 0.6) shadow(g, x, F, 1);
            ok = a.body(g, x, y, j < 1 ? { sy: 1 + 0.1 * Math.sin(j * Math.PI) } : { sx: 1 + 0.25 * sq, sy: 1 - 0.25 * sq });
          }
        }
        g.restore(); return ok;
      }
    }
  });

  function drill(g, cx, top, len, ph) {
    if (len < 1) return; cx = Math.round(cx); top = Math.round(top);
    P(g, cx - 6, top - 2, 12, 3, "#3a3f44"); P(g, cx - 6, top - 2, 12, 1, "#7a838c");
    for (var r = 0; r < len; r++) { var hw = Math.max(1, Math.round(5 * (1 - r / len))); P(g, cx - hw, top + 1 + r, hw * 2, 1, "#9aa4ad"); if ((r + ph) % 4 < 2) P(g, cx - hw, top + 1 + r, hw, 1, "#5a646d"); if (hw > 1) P(g, cx - 1, top + 1 + r, 1, 1, "#d8e0e6"); }
  }
  var CHIPS = ["#7a5230", "#5a3a1c", "#c8a670", "#3f2815"];
  function chips(a, x, y, n, down) { for (var i = 0; i < n; i++) a.fx({ x: x + rnd(-8, 8), y: y, vx: rnd(-90, 90), vy: down ? rnd(0, 80) : rnd(-150, -60), g: 500, life: rnd(0.35, 0.6), c: pick(CHIPS), sz: 2, fade: false }); }
  function buzz(a) { a.sfx("voice", { f: rnd(80, 120), slide: 1.1, wave: "sawtooth", vol: 0.05 }); }
  function hole(g, x, top, al) { if (al <= 0) return; g.save(); g.globalAlpha = al; P(g, x - 11, top, 22, 4, "#3f2815"); P(g, x - 10, top, 20, 4, "#0c0805"); P(g, x - 12, top + 1, 1, 2, "#3f2815"); P(g, x + 11, top, 1, 2, "#3f2815"); g.restore(); }
  add("char-114", {
    down: {
      out: 1.0, in: 0.85, stay: true,
      start: function (s, a) { hopStart(s, a); },
      update: function (s, a, dt) {
        var T = a.T, F = a.F;
        if (a.out) {
          if (T > 0.18) buzz(a);
          if (T > 0.35) { a.shake(1.5); chips(a, s.x, F, 2); }
        } else {
          if (once(s, "brk")) { a.shake(3); chips(a, s.x, 12, 16, true); a.sfx("sprint", { vol: 1.4 }); }
          if (T < 0.3) { buzz(a); if (Math.random() < 0.5) chips(a, s.x, 12, 1, true); }
          if (T >= 0.5 && once(s, "land")) { a.shake(4); a.sfx("walletLand"); dust(a, a.lad, F, 12); }
        }
      },
      draw: function (g, s, a) {
        var T = a.T, F = a.F, ok, x, y, len = 12, ph = Math.floor(a.T * 40);
        if (a.out) {
          if (T < 0.18) { ok = a.body(g, hopX(s, T), hopY(a, T), {}); shadow(g, hopX(s, T), F, 1 - 0.5 * Math.sin(seg(T, 0, 0.18) * Math.PI)); return ok; }
          x = s.x + (T > 0.18 ? Math.round(rnd(-1, 1)) : 0);
          if (T > 0.35) hole(g, s.x, F - 1, 1);
          y = T < 0.35 ? F + 1 - Math.round(12 * eo(seg(T, 0.18, 0.35))) : Math.round(F - 11 + 84 * Math.pow(seg(T, 0.35, 1.0), 1.3));
          g.save(); a.clipFloor(g);
          drill(g, s.x, y, len * eo(seg(T, 0.18, 0.3)), ph);
          ok = a.body(g, x, y, { sx: 1.04, sy: 0.96 });
          g.restore(); return ok;
        }
        P(g, s.x - 10, 0, 20, 12, "rgba(12,8,5," + (1 - seg(T, 0.6, 0.85)).toFixed(3) + ")");
        var f = seg(T, 0.15, 0.5), l = seg(T, 0.5, 0.7), sq = Math.sin(l * Math.PI);
        x = Math.round(s.x + (a.lad - s.x) * eio(f));
        y = T < 0.15 ? Math.round(-2 + 6 * (T / 0.15)) : Math.round(4 + (F - 3) * ei(f));
        g.save(); ceilClip(g, a);
        drill(g, x + (T < 0.3 ? Math.round(rnd(-1, 1)) : 0), y, len * (1 - seg(T, 0.3, 0.5)), ph);
        if (T > 0.4) shadow(g, x, F, seg(T, 0.4, 0.5));
        ok = a.body(g, x, y, T < 0.5 ? { sy: 1.08, sx: 0.94 } : { sx: 1 + 0.3 * sq, sy: 1 - 0.3 * sq });
        g.restore(); return ok;
      }
    }
  });

  function boneStart(s, a, X, Y) {
    var sp = a.sprite(a.dir); s.sp = sp; s.bones = []; s.bx = X; if (!sp) return;
    var i = scan(sp), mid = (i.x0 + i.x1) / 2, H = Math.max(1, i.y1 - i.y0);
    i.cells.forEach(function (c) {
      var hx = Math.round(X - sp.ax + c.x), hy = Math.round(Y - sp.ay + c.y), up = (i.y1 - c.y) / H;
      s.bones.push({ cx: c.x, cy: c.y, hx: hx, hy: hy, x: hx, y: hy, vx: (c.x + CS / 2 - mid) * rnd(3, 6) + rnd(-30, 30), vy: -rnd(40, 160) * (0.4 + up), r: 0, vr: rnd(-14, 14), pile: rnd(0, 7), d: 0.4 * (1 - (c.y - i.y0) / H), arc: rnd(6, 20), rest: false });
    });
    a.shake(3); a.sfx("sprint", { vol: 1.5 }); dust(a, X, a.F, 12);
  }
  function boneUpdate(s, a, dt, T, gs, ge) {
    if (!s.bones) return;
    var F = a.F, X = s.bx, land = 0;
    s.bones.forEach(function (b) {
      if (b.rest) return;
      b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      var ry = F + 1 - CS - b.pile * Math.max(0, 1 - Math.abs(b.x + CS / 2 - X) / 36);
      if (b.y >= ry) { b.y = ry; if (b.vy > 120) { b.vy = -b.vy * 0.35; b.vx *= 0.6; b.vr *= 0.5; land++; } else { b.rest = true; b.vx = b.vy = b.vr = 0; b.r = Math.round(b.r / 1.5708) * 1.5708; b.x = Math.round(b.x); b.y = Math.round(b.y); } }
    });
    if (land && Math.random() < 0.5) a.sfx("voice", { f: rnd(900, 1600), slide: 0.7, wave: "square", vol: 0.03 });
    if (T > gs - 0.17 && T < gs && Math.random() < 0.5) a.sfx("voice", { f: rnd(1400, 2400), slide: 0.6, wave: "square", vol: 0.03 });
    if (T >= gs && T < ge) a.sfx("voice", { f: rnd(700, 1300) + 900 * seg(T, gs, ge), slide: 1.2, wave: "triangle", vol: 0.035 });
    if (T >= ge && once(s, "snap")) { a.sfx("coinIn"); a.shake(1); }
  }
  function boneDraw(g, s, a, T, gs, ge, end) {
    var sp = s.sp, X = s.bx, F = a.F;
    if (T >= ge || !sp || !s.bones || !s.bones.length) {
      var q = seg(T, ge, end), sy = 1 + 0.16 * Math.sin(q * Math.PI); shadow(g, X, F, 1);
      return a.body(g, X, F + 1, { sy: sy, sx: 1 / sy });
    }
    var gq = seg(T, gs, ge), rat = T > gs - 0.17 && T < gs;
    s.bones.forEach(function (b) {
      var x = b.x, y = b.y, r = b.r;
      if (gq > 0) { var k = eio(cl((gq - b.d) / 0.6)); x = b.x + (b.hx - b.x) * k; y = b.y + (b.hy - b.y) * k - Math.sin(k * Math.PI) * b.arc; r = b.r * (1 - k); }
      else if (rat && b.rest) { x += Math.round(rnd(-1, 1)); y -= Math.round(rnd(0, 1)); }
      if (Math.abs(r) < 0.01) g.drawImage(sp.c, b.cx, b.cy, CS, CS, Math.round(x), Math.round(y), CS, CS);
      else { g.save(); g.translate(Math.round(x) + CS / 2, Math.round(y) + CS / 2); g.rotate(r); g.drawImage(sp.c, b.cx, b.cy, CS, CS, -CS / 2, -CS / 2, CS, CS); g.restore(); }
    });
    return true;
  }
  var SKI = 0.28;
  add("char-012", {
    down: {
      out: 0.55, in: 1.4,
      update: function (s, a, dt) {
        var T = a.T;
        if (a.out) { if (once(s, "j")) a.sfx("voice", { f: 1800, slide: 0.6, wave: "square", vol: 0.04 }); if (T > 0.15 && once(s, "wh")) a.sfx("whoosh"); return; }
        if (T >= SKI && once(s, "brk")) boneStart(s, a, Math.round(a.lad), a.F + 1);
        boneUpdate(s, a, dt, T, 0.92, 1.28);
      },
      draw: function (g, s, a) {
        var T = a.T, F = a.F, x = Math.round(a.lad), ok, y;
        if (a.out) {
          var h = seg(T, 0, 0.15);
          y = T < 0.15 ? Math.round(F + 1 - Math.sin(h * Math.PI) * 10) : Math.round(F + 1 + 90 * ei(seg(T, 0.15, 0.55)));
          g.save(); a.clip(g); if (T < 0.15) shadow(g, x, F, 1);
          ok = a.body(g, x, y, { rot: T > 0.15 ? Math.sin(T * 30) * 0.15 : 0, sy: 1 + 0.1 * Math.sin(h * Math.PI) });
          g.restore(); return ok;
        }
        if (!s.brk) {
          y = Math.round(-4 + (F + 5) * ei(seg(T, 0, SKI)));
          g.save(); a.clip(g); ok = a.body(g, x, y, { rot: Math.sin(T * 30) * 0.12, sy: 1.08, sx: 0.94 }); g.restore(); return ok;
        }
        return boneDraw(g, s, a, T, 0.92, 1.28, 1.4);
      }
    },
    land: {
      dur: 1.15,
      start: function (s, a) { boneStart(s, a, Math.round(a.x), a.F + 1); },
      update: function (s, a, dt) { boneUpdate(s, a, dt, a.T, 0.62, 1.0); },
      draw: function (g, s, a) { return boneDraw(g, s, a, a.T, 0.62, 1.0, 1.15); }
    }
  });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.hallMoves) return;

  function D(a) { return a.dir === "left" ? -1 : 1; }
  function seg(p, a0, a1) { return Math.max(0, Math.min(1, (p - a0) / (a1 - a0))); }
  function lerp(a, b, q) { return a + (b - a) * q; }
  function ei(q) { return q * q; }
  function eo(q) { return 1 - (1 - q) * (1 - q); }
  function eio(q) { return q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q); }
  function R(n) { return Math.round(n); }
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(R(x), R(y), w, h); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(c) { return c[Math.floor(Math.random() * c.length)]; }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function every(s, k, dt, rate, fn) { s[k] = (s[k] || 0) + dt * rate; while (s[k] >= 1) { s[k]--; fn(); } }
  function burst(a, x, y, n, cols, v0, v1, o) {
    o = o || {};
    for (var i = 0; i < n; i++) {
      var an = o.a0 != null ? rnd(o.a0, o.a1) : Math.random() * 6.283, v = rnd(v0, v1);
      a.fx({ x: x + rnd(-(o.sx || 0), o.sx || 0), y: y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, g: o.g || 0, drag: o.drag || 2, life: rnd(o.l0 || 0.3, o.l1 || 0.6), c: pick(cols), sz: o.sz || 2, sz2: o.sz2, add: o.add, a: o.al });
    }
  }
  function dust(a, x, F, n) { burst(a, x, F, n, ["#6e4724", "#9a6a3a", "#5a3b1e"], 20, 70, { a0: 3.4, a1: 6.0, g: 120, drag: 3, l0: 0.25, l1: 0.5, sx: 8 }); }
  function shadow(g, x, F, k) { if (k <= 0.05) return; var w = R(12 * Math.min(1, k)); px(g, x - w, F + 1, w * 2, 3, "rgba(0,0,0," + (0.35 * Math.min(1, k)).toFixed(3) + ")"); }
  function squash(q) { return q <= 0 ? 1 : q < 0.4 ? 1 - 0.2 * (q / 0.4) : 0.8 + 0.2 * ((q - 0.4) / 0.6); }
  function line(g, x0, y0, x1, y1, w, c) {
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))), o = Math.floor(w / 2);
    g.fillStyle = c; for (var i = 0; i <= n; i++) g.fillRect(R(x0 + (x1 - x0) * i / n) - o, R(y0 + (y1 - y0) * i / n) - o, w, w);
  }
  function ring(g, x, y, r, col, al) { if (al <= 0.01 || r < 1) return; g.globalAlpha = Math.min(1, al); g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, r, Math.max(1, r * 0.2), 0, 0, 6.283); g.stroke(); g.globalAlpha = 1; }
  function glow(g, x, y, r, rgb, al) {
    if (al <= 0.01 || r < 1) return;
    g.save(); g.globalCompositeOperation = "lighter";
    var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(" + rgb + "," + Math.min(1, al).toFixed(3) + ")"); gr.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  function star(g, x, y, c) { px(g, x - 1, y, 3, 1, c); px(g, x, y - 1, 1, 3, c); }
  function clipped(g, a, fn) { g.save(); a.clip(g); fn(); g.restore(); }

  var SPELL = ["#b98cff", "#e9d9ff", "#eaba49", "#fff3c4", "#bdeaff"];
  function sparkles(a, s, dt, x, y, rate, vy) { every(s, "sp", dt, rate, function () { a.fx({ x: x + rnd(-9, 9), y: y + rnd(-2, 2), vx: rnd(-12, 12), vy: vy + rnd(-15, 15), drag: 1.5, life: rnd(0.35, 0.6), c: pick(SPELL), sz: 2, sz2: 0, add: true }); }); }
  function orbTap(g, a, x, y, k) {
    if (k <= 0) return;
    var ox = x + 5 * D(a), oy = y - 15;
    glow(g, ox, oy, 4 + 10 * k, "190,150,255", 0.8 * k);
    px(g, ox - 1, oy - 1, 3, 3, "#e9d9ff"); px(g, ox, oy, 1, 1, "#ffffff");
    if (k > 0.5) { var r = R(3 + 5 * k); star(g, ox - r, oy - 2, "#fff3c4"); star(g, ox + r, oy + 1, "#bdeaff"); }
  }
  function sigil(g, a, x, F, k, t) {
    if (k <= 0.02) return;
    g.save(); g.globalCompositeOperation = "lighter";
    ring(g, x, F + 1, 10 + 6 * k, "#b98cff", 0.8 * k); ring(g, x, F + 1, 16 + 6 * k, "#e9d9ff", 0.4 * k);
    g.globalAlpha = Math.min(1, k);
    for (var i = 0; i < 6; i++) { var an = t * 2.5 + i * 1.047; px(g, x + Math.cos(an) * (14 + 5 * k), F + 1 + Math.sin(an) * 3, 1, 1, "#fff3c4"); }
    g.restore();
  }
  function wiz(g, a, x, y, t, sy) { return a.body(g, x, y, { rot: Math.sin(t * 6) * 0.05, sx: 1 + Math.sin(t * 28) * 0.03, sy: sy || 1 }); }
  BH.hallMoves.add("char-026", {
    up: {
      out: 1, in: 1,
      update: function (s, a, dt) {
        var F = a.F, p = a.p;
        if (a.out) {
          if (a.T > 0.04 && once(s, "tap")) a.sfx("voice", { f: 880, slide: 1.8, wave: "sine", vol: 0.05 });
          if (p >= 0.3 && once(s, "lift")) { a.sfx("whoosh"); burst(a, a.x, F, 16, SPELL, 30, 80, { a0: 3.3, a1: 6.1, drag: 2, add: true, sz: 2, sz2: 0 }); }
          var y = F + 1 - (F + 75) * ei(seg(p, 0.3, 1));
          if (p > 0.3 && p < 0.7 && y > 14) sparkles(a, s, dt, a.x, y, 50, 40);
        } else {
          if (once(s, "in")) { s.sp = 0; a.sfx("coinIn"); }
          var q2 = seg(p, 0.45, 1), yi = p < 0.45 ? lerp(a.R + 62, F - 26, eo(seg(p, 0, 0.45))) : lerp(F - 26, F + 1, eio(q2));
          if (yi < F + 1) sparkles(a, s, dt, a.x, yi, p < 0.45 ? 40 : 22, p < 0.45 ? 50 : 15);
          if (q2 >= 1 && once(s, "land")) { burst(a, a.x, F, 14, SPELL, 25, 60, { a0: 3.3, a1: 6.1, add: true, sz: 2, sz2: 0 }); a.sfx("voice", { f: 1320, slide: 0.7, wave: "sine", vol: 0.04 }); }
        }
      },
      draw: function (g, s, a) {
        var F = a.F, p = a.p, x = R(a.x), t = a.T, y;
        if (a.out) {
          var tap = seg(p, 0.05, 0.3), q = seg(p, 0.3, 1);
          y = F + 1 - (F + 75) * ei(q);
          sigil(g, a, x, F, p < 0.3 ? tap : 1 - seg(p, 0.3, 0.7), t);
          shadow(g, x, F, 1 - q * 2);
          clipped(g, a, function () { if (q <= 0) a.body(g, x, y, { sy: 1 - 0.06 * Math.sin(tap * Math.PI) }); else wiz(g, a, x, y, t); });
          orbTap(g, a, x, y, p < 0.3 ? tap : 1 - seg(p, 0.3, 0.5));
          if (q > 0) glow(g, x, y, 14, "185,140,255", 0.5 * (1 - q));
          return true;
        }
        var q2 = seg(p, 0.45, 1);
        y = p < 0.45 ? lerp(a.R + 62, F - 26, eo(seg(p, 0, 0.45))) : lerp(F - 26, F + 1, eio(q2));
        sigil(g, a, x, F, p < 0.45 ? 0 : q2 < 1 ? q2 : 1 - seg(p, 0.97, 1), t);
        shadow(g, x, F, q2);
        clipped(g, a, function () { if (q2 >= 1) a.body(g, x, y); else wiz(g, a, x, y, t); });
        glow(g, x, y, 14, "185,140,255", 0.45 * (1 - q2 * 0.8));
        return true;
      }
    },
    down: {
      out: 0.8, in: 1.3,
      update: function (s, a, dt) {
        var F = a.F, p = a.p;
        if (a.out) {
          if (a.T > 0.04 && once(s, "tap")) a.sfx("voice", { f: 880, slide: 1.8, wave: "sine", vol: 0.05 });
          if (p >= 0.25 && once(s, "sink")) a.sfx("whoosh");
          if (p > 0.25 && p < 0.75) every(s, "sp", dt, 45, function () { a.fx({ x: a.x + rnd(-14, 14), y: F - rnd(0, 4), vx: rnd(-8, 8), vy: rnd(-50, -20), drag: 1.5, life: rnd(0.25, 0.4), c: pick(SPELL), sz: 2, sz2: 0, add: true }); });
        } else {
          if (once(s, "in")) { s.sp = 0; a.sfx("coinIn"); }
          var q = seg(p, 0, 0.88), y = lerp(-4, F + 1, eo(q));
          if (q < 1 && y > 10) every(s, "sp", dt, 28, function () { a.fx({ x: a.x + rnd(-10, 10), y: y - rnd(30, 56), vx: rnd(-10, 10), vy: rnd(-30, -10), drag: 1, life: rnd(0.4, 0.7), c: pick(SPELL), sz: 2, sz2: 0, add: true }); });
          if (q >= 1 && once(s, "land")) { burst(a, a.x, F, 14, SPELL, 25, 60, { a0: 3.3, a1: 6.1, add: true, sz: 2, sz2: 0 }); a.sfx("voice", { f: 1320, slide: 0.7, wave: "sine", vol: 0.04 }); }
        }
      },
      draw: function (g, s, a) {
        var F = a.F, p = a.p, x = R(a.x), t = a.T, y;
        if (a.out) {
          var tap = seg(p, 0.05, 0.25), q = seg(p, 0.25, 1);
          y = lerp(F + 1, a.R + 64, ei(q));
          sigil(g, a, x, F, p < 0.25 ? tap : 1 - seg(p, 0.6, 1), t);
          clipped(g, a, function () { if (q <= 0) a.body(g, x, y, { sy: 1 - 0.06 * Math.sin(tap * Math.PI) }); else wiz(g, a, x, y, t); });
          orbTap(g, a, x, y, p < 0.25 ? tap : 1 - seg(p, 0.25, 0.45));
          return true;
        }
        var q2 = seg(p, 0, 0.88);
        y = lerp(-4, F + 1, eo(q2));
        sigil(g, a, x, F, q2 < 0.4 ? 0 : q2 < 1 ? (q2 - 0.4) / 0.6 : 1 - seg(p, 0.88, 1), t);
        shadow(g, x, F, q2 * q2);
        clipped(g, a, function () { if (q2 >= 1) a.body(g, x, y, { sy: squash(seg(p, 0.88, 1) * 0.5) }); else wiz(g, a, x, y, t); });
        glow(g, x, y - 30, 22, "185,140,255", 0.35 * (1 - q2));
        return true;
      }
    }
  });

  function cape(g, x, y, w, t) {
    if (w < 2) return;
    for (var dx = -w; dx <= w; dx++) {
      var ad = Math.abs(dx), top = y - 30 + R(ad * 0.3), m = ad % 8, hem = y - 10 - R(ad * 0.15) - (m < 4 ? m : 8 - m) + R(Math.sin(t * 22 + dx * 0.5));
      if (hem <= top) continue;
      px(g, x + dx, top, 1, hem - top, ad > w - 2 ? "#07152b" : "#0d2140"); px(g, x + dx, top, 1, 1, "#142b4f");
    }
  }
  function hook(g, x, y) { px(g, x - 2, y, 5, 2, "#c4bbb3"); px(g, x - 3, y - 2, 1, 2, "#c4bbb3"); px(g, x + 3, y - 2, 1, 2, "#c4bbb3"); px(g, x, y + 2, 1, 2, "#807980"); }
  BH.hallMoves.add("char-094", {
    up: {
      out: 0.9, in: 0.75,
      update: function (s, a, dt) {
        var F = a.F, p = a.p;
        if (a.out) {
          if (p >= 0.12 && once(s, "fire")) { a.sfx("click"); a.sfx("voice", { f: 260, slide: 3, wave: "square", vol: 0.04 }); }
          if (p >= 0.32 && once(s, "hit")) { a.shake(2); a.sfx("click"); burst(a, a.lad, 9, 10, ["#c4bbb3", "#eaba49", "#807980"], 30, 90, { a0: 0.3, a1: 2.8, g: 300, l0: 0.25, l1: 0.45, sz: 1 }); }
          if (p >= 0.42 && once(s, "zip")) { a.sfx("whoosh"); dust(a, a.x, F, 8); }
          var y = lerp(F + 1, -10, ei(seg(p, 0.42, 1)));
          if (p > 0.45 && p < 0.88 && y > 20) every(s, "ln", dt, 70, function () { a.fx({ x: a.x + rnd(-10, 10), y: y + rnd(-50, 4), vx: 0, vy: 80, life: 0.15, c: "rgba(196,187,179,0.8)", sz: 1 }); });
        } else {
          var q = seg(p, 0.85, 1);
          if (once(s, "in")) { a.sfx("whoosh"); burst(a, a.lad, F, 8, ["#6e4724", "#9a6a3a"], 30, 80, { a0: 3.6, a1: 5.8, g: 200, l0: 0.25, l1: 0.45 }); }
          if (q > 0 && once(s, "land")) { a.sfx("step"); a.shake(1); dust(a, a.x, F, 10); }
        }
      },
      draw: function (g, s, a) {
        var F = a.F, p = a.p, x = R(a.x), d = D(a), t = a.T;
        if (a.out) {
          var zq = seg(p, 0.42, 1), y = lerp(F + 1, -10, ei(zq)), hx = x + 6 * d, hy = R(y - (p < 0.12 ? 22 : 40));
          var tq = seg(p, 0.12, 0.32), kx = lerp(hx, a.lad, tq), ky = lerp(hy, 6, eo(tq));
          shadow(g, x, F, 1 - zq * 2);
          clipped(g, a, function () {
            if (p >= 0.12) { if (hy < ky) ky = hy; line(g, hx, hy, kx, ky + (tq < 1 ? 0 : 2), 1, "#807980"); hook(g, R(kx), R(ky)); }
            var sy = p < 0.12 ? 1 - 0.08 * Math.sin(seg(p, 0, 0.12) * Math.PI) : p < 0.42 ? 1 + 0.05 * seg(p, 0.32, 0.42) : 1.12 - 0.04 * zq;
            a.body(g, x, y, { sy: sy, sx: p < 0.42 ? 1 : 0.9 });
          });
          if (tq > 0 && tq < 1) glow(g, kx, ky, 6, "255,230,170", 0.5);
          return true;
        }
        var y2 = p < 0.45 ? lerp(a.R + 62, F - 34, eo(seg(p, 0, 0.45))) : lerp(F - 34, F + 1, ei(seg(p, 0.45, 0.85))), lq = seg(p, 0.85, 1);
        var cw = p < 0.4 ? 0 : p < 0.85 ? R(22 * eo(seg(p, 0.4, 0.6))) : R(22 * (1 - seg(p, 0.85, 0.95)));
        shadow(g, x, F, seg(p, 0.4, 0.85));
        clipped(g, a, function () { cape(g, x, y2, cw, t); a.body(g, x, y2, { sy: lq > 0 ? squash(lq) : p < 0.45 ? 1.1 : 1, sx: lq > 0 ? 2 - squash(lq) : 1 }); });
        return true;
      }
    },
    down: {
      out: 0.6, in: 1.1,
      update: function (s, a, dt) {
        var F = a.F, p = a.p;
        if (a.out) { if (p >= 0.3 && once(s, "drop")) a.sfx("whoosh"); }
        else {
          if (p >= 0.08 && once(s, "spread")) a.sfx("voice", { f: 180, slide: 0.6, wave: "triangle", vol: 0.05 });
          if (p >= 0.82 && once(s, "land")) { a.sfx("step"); a.shake(1); dust(a, a.x, F, 12); }
        }
      },
      draw: function (g, s, a) {
        var F = a.F, p = a.p, x = R(a.x), t = a.T, y;
        if (a.out) {
          y = p < 0.3 ? F + 1 - 10 * Math.sin(seg(p, 0, 0.3) * Math.PI * 0.5) : lerp(F - 9, a.R + 64, ei(seg(p, 0.3, 1)));
          clipped(g, a, function () { a.body(g, x, y, { sy: p < 0.3 ? 1.05 : 1.08, sx: p < 0.3 ? 0.97 : 0.95 }); });
          return true;
        }
        var q = seg(p, 0, 0.82), lq = seg(p, 0.82, 1);
        y = lerp(-4, F + 1, 0.55 * eo(q) + 0.45 * q);
        var cw = q < 1 ? R(24 * eo(seg(q, 0.05, 0.3))) : R(24 * (1 - eo(seg(lq, 0, 0.6))));
        shadow(g, x, F, q * q);
        clipped(g, a, function () { cape(g, x, y, cw, t); a.body(g, x, y, { sy: lq > 0 ? squash(lq) : 1, sx: lq > 0 ? 2 - squash(lq) : 1, rot: q < 1 ? Math.sin(t * 5) * 0.04 : 0 }); });
        return true;
      }
    }
  });

  function tongue(g, mx, my, tx, ty, wob) {
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(tx - mx), Math.abs(ty - my)))), i, q, x, y;
    for (i = 0; i <= n; i++) { q = i / n; x = R(mx + (tx - mx) * q + Math.sin(q * Math.PI) * wob); y = R(my + (ty - my) * q); px(g, x - 1, y - 1, 3, 3, "#b84a68"); }
    for (i = 0; i <= n; i++) { q = i / n; x = R(mx + (tx - mx) * q + Math.sin(q * Math.PI) * wob); y = R(my + (ty - my) * q); px(g, x, y, 1, 1, "#f08aa0"); }
    px(g, tx - 2, ty - 1, 5, 4, "#b84a68"); px(g, tx - 1, ty, 3, 2, "#f08aa0"); px(g, tx - 1, ty, 1, 1, "#ffd0da");
  }
  BH.hallMoves.add("char-016", {
    up: {
      out: 1, in: 0.7,
      update: function (s, a, dt) {
        var F = a.F, p = a.p;
        if (a.out) {
          if (p >= 0.15 && once(s, "shoot")) a.sfx("voice", { f: 520, slide: 2.4, wave: "sine", vol: 0.05 });
          if (p >= 0.35 && once(s, "stick")) { a.sfx("voice", { f: 160, slide: 0.5, wave: "triangle", vol: 0.06 }); a.shake(1); burst(a, a.lad, 9, 8, ["#f08aa0", "#b84a68", "#ffd0da"], 20, 60, { a0: 0.4, a1: 2.7, g: 260, l0: 0.3, l1: 0.5 }); }
          if (p >= 0.5 && once(s, "yank")) { a.sfx("whoosh"); dust(a, a.x, F, 6); }
        } else {
          if (p >= 0.25 && once(s, "slurp")) a.sfx("voice", { f: 300, slide: 2, wave: "sine", vol: 0.05 });
          if (p >= 0.8 && once(s, "land")) { a.sfx("step"); a.shake(1); dust(a, a.x, F, 10); }
        }
      },
      draw: function (g, s, a) {
        var F = a.F, p = a.p, x = R(a.x), d = D(a), y;
        if (a.out) {
          var yq = seg(p, 0.5, 1), sq = seg(p, 0.15, 0.35);
          y = lerp(F + 1, -12, Math.pow(yq, 2.4));
          var mx = x + 3 * d, my = R(y - 31), tx = R(lerp(mx, a.lad, eo(sq))), ty = R(lerp(my, 4, eo(sq)));
          if (my < ty) ty = my;
          var wob = p >= 0.35 && p < 0.5 ? Math.sin(a.T * 50) * 3 * (1 - seg(p, 0.35, 0.5)) : 0;
          var sy = p < 0.15 ? 1 - 0.07 * Math.sin(seg(p, 0, 0.15) * Math.PI) : p < 0.5 ? 1 + 0.08 * seg(p, 0.35, 0.5) : 1.15 - 0.05 * yq;
          shadow(g, x, F, 1 - yq * 2);
          clipped(g, a, function () { a.body(g, x, y, { sy: sy, sx: p < 0.5 ? 1 : 0.88 }); if (sq > 0) tongue(g, mx, my, tx, ty, wob); });
          return true;
        }
        var lq = seg(p, 0.8, 1);
        y = p < 0.45 ? lerp(a.R + 62, F - 30, eo(seg(p, 0, 0.45))) : lerp(F - 30, F + 1, ei(seg(p, 0.45, 0.8)));
        var mx2 = x + 3 * d, my2 = R(y - 31), len = R(36 * (1 - eo(seg(p, 0, 0.3))));
        shadow(g, x, F, seg(p, 0.45, 0.8));
        clipped(g, a, function () { a.body(g, x, y, { sy: lq > 0 ? squash(lq) : p < 0.45 ? 1.12 : 1, sx: lq > 0 ? 2 - squash(lq) : p < 0.45 ? 0.9 : 1 }); if (len > 1) tongue(g, mx2, my2, mx2, my2 - len, 0); });
        return true;
      }
    }
  });

  function tube(g, d, m) {
    var c = ["#2a2f36", "#4a525c", "#eaba49", "#14171b"];
    if (m === 0) { px(g, d > 0 ? 2 : -18, -20, 16, 5, c[0]); px(g, d > 0 ? 2 : -18, -20, 16, 1, c[1]); px(g, d > 0 ? 8 : -10, -20, 2, 5, c[2]); px(g, d > 0 ? 17 : -19, -21, 2, 7, c[3]); return; }
    if (m === 1) { for (var i = 0; i < 12; i++) px(g, d > 0 ? 4 + i : -8 - i, -24 + i, 4, 4, i === 5 ? c[2] : i % 3 ? c[0] : c[1]); px(g, d > 0 ? 15 : -18, -13, 4, 2, c[3]); return; }
    px(g, d > 0 ? 6 : -10, -26, 5, 22, c[0]); px(g, d > 0 ? 6 : -10, -26, 1, 22, c[1]); px(g, d > 0 ? 6 : -10, -16, 5, 2, c[2]); px(g, d > 0 ? 5 : -11, -5, 7, 2, c[3]);
  }
  function rocketBody(g, a, x, y, o, m) {
    a.body(g, x, y, o);
    g.save(); g.translate(R(x), R(y)); if (o.rot) g.rotate(o.rot); g.scale(o.sx || 1, o.sy || 1); tube(g, D(a), m); g.restore();
  }
  var BOOM = ["#fff3c4", "#eaba49", "#ff9a3a", "#e8552a"], SMOKE = ["rgba(120,110,100,0.7)", "rgba(80,72,64,0.7)", "rgba(160,150,140,0.6)"];
  BH.hallMoves.add("char-018", {
    up: {
      out: 1, in: 0.75,
      update: function (s, a, dt) {
        var F = a.F, p = a.p, mz = a.x + 8 * D(a);
        if (a.out) {
          if (p >= 0.12 && once(s, "aim")) a.sfx("click");
          if (p >= 0.38 && once(s, "boom")) {
            a.sfx("walletLand"); a.sfx("voice", { f: 110, slide: 0.4, wave: "sawtooth", vol: 0.06 }); a.shake(5); a.flash(0.35, "#ffd28a");
            burst(a, mz, F, 28, BOOM, 60, 200, { a0: 3.3, a1: 6.1, g: 160, drag: 2.5, l0: 0.25, l1: 0.55, add: true, sz: 3, sz2: 1 });
            burst(a, mz, F - 4, 12, SMOKE, 15, 50, { a0: 3.5, a1: 5.9, g: -20, drag: 1.5, l0: 0.4, l1: 0.6, sz: 4, sz2: 8 });
          }
          var y = lerp(F + 1, -14, 0.5 * eo(seg(p, 0.38, 1)) + 0.5 * seg(p, 0.38, 1));
          if (p > 0.4 && p < 0.85 && y > 24) every(s, "tr", dt, 60, function () { a.fx({ x: mz + rnd(-2, 2), y: y - 2, vx: rnd(-15, 15), vy: rnd(20, 60), drag: 2, life: rnd(0.25, 0.45), c: pick(Math.random() < 0.5 ? BOOM : SMOKE), sz: 2, sz2: 5, add: false }); });
        } else {
          if (once(s, "in")) { a.sfx("whoosh"); burst(a, a.lad, F, 14, SMOKE, 20, 70, { a0: 3.6, a1: 5.8, g: -10, drag: 2, l0: 0.4, l1: 0.7, sz: 4, sz2: 8 }); burst(a, a.lad, F, 10, BOOM, 40, 120, { a0: 3.8, a1: 5.6, g: 200, add: true, l0: 0.2, l1: 0.4 }); }
          if (p >= 0.8 && once(s, "land")) { a.sfx("step"); a.shake(2); dust(a, a.x, F, 12); }
        }
      },
      draw: function (g, s, a) {
        var F = a.F, p = a.p, x = R(a.x), d = D(a), y;
        if (a.out) {
          var rq = seg(p, 0.38, 1), ch = seg(p, 0.2, 0.38), m = p < 0.12 ? 0 : p < 0.2 ? 1 : 2, mz = x + 8 * d;
          y = lerp(F + 1, -14, 0.5 * eo(rq) + 0.5 * rq);
          if (p >= 0.2 && p < 0.38) glow(g, mz, F, 3 + 10 * ch, "255,170,80", 0.6 * ch);
          if (p >= 0.38) {
            var bq = seg(p, 0.38, 0.75);
            g.save(); g.globalCompositeOperation = "lighter"; ring(g, mz, F + 1, 6 + 60 * eo(bq), "#ffb060", 1 - bq); ring(g, mz, F + 1, 4 + 34 * eo(bq), "#fff3c4", 0.8 * (1 - bq)); g.restore();
            glow(g, mz, F - 6, 30 * (1 - bq) + 4, "255,190,90", 0.9 * (1 - bq));
            px(g, mz - 9, F + 1, 18, 2, "rgba(20,12,6," + (0.6 * (1 - seg(p, 0.6, 1))).toFixed(3) + ")");
          }
          shadow(g, x, F, 1 - rq * 2);
          var sy = p < 0.38 ? 1 - 0.15 * ch : 1.22 - 0.12 * rq, jx = p >= 0.2 && p < 0.38 ? R(Math.sin(a.T * 70) * ch) : 0;
          clipped(g, a, function () { rocketBody(g, a, x + jx, y, { sy: sy, sx: p < 0.38 ? 1 + 0.08 * ch : 0.88, rot: p >= 0.38 ? -0.08 * d * (1 - rq) : 0 }, m); });
          if (p >= 0.38 && y > 14) glow(g, mz, y - 2, 8, "255,170,80", 0.7 * (1 - rq));
          return true;
        }
        var fq = seg(p, 0, 0.5), lq = seg(p, 0.8, 1), cy, th;
        y = p < 0.45 ? lerp(a.R + 62, F - 40, eo(seg(p, 0, 0.45))) : lerp(F - 40, F + 1, ei(seg(p, 0.45, 0.8)));
        th = d * 6.283 * eio(fq); cy = y - 30;
        shadow(g, x, F, seg(p, 0.45, 0.8));
        clipped(g, a, function () {
          if (fq < 1) rocketBody(g, a, x - 30 * Math.sin(th), cy + 30 * Math.cos(th), { rot: th }, 2);
          else rocketBody(g, a, x, y, { sy: lq > 0 ? squash(lq) : 1, sx: lq > 0 ? 2 - squash(lq) : 1 }, 2);
        });
        return true;
      }
    }
  });

  var FIRE = ["#e8354a", "#ffffff", "#5ab0ff", "#eaba49"];
  function firework(g, x, b, h, lit, t) {
    if (h < 1) return;
    px(g, x + 3, b - 4, 1, 12, "#8a5a30");
    for (var r = 0; r < h; r++) px(g, x - 3, b - 1 - r, 7, 1, r >= h - 4 ? "#195ba6" : (r >> 1) & 1 ? "#f8f6ec" : "#c8303c");
    if (h > 4) px(g, x, b - h + 1, 1, 1, "#ffffff");
    if (lit) { var fl = 3 + R(Math.abs(Math.sin(t * 40)) * 5); px(g, x - 2, b, 5, fl, "#ff9a3a"); px(g, x - 1, b, 3, fl - 1, "#eaba49"); px(g, x, b, 1, R(fl / 2), "#fff3c4"); }
  }
  BH.hallMoves.add("char-062", {
    up: {
      out: 1, in: 1,
      update: function (s, a, dt) {
        var F = a.F, p = a.p;
        if (a.out) {
          if (p >= 0.05 && once(s, "pop")) { a.sfx("click"); burst(a, a.x, F - 2, 8, ["rgba(200,190,180,0.8)", "rgba(150,140,130,0.7)"], 15, 40, { a0: 3.4, a1: 6, drag: 2, l0: 0.3, l1: 0.5, sz: 3, sz2: 6 }); }
          if (p >= 0.22 && p < 0.45) { if (once(s, "fuse")) a.sfx("voice", { f: 1400, slide: 0.8, wave: "sawtooth", vol: 0.03 }); every(s, "fz", dt, 40, function () { a.fx({ x: a.x - 4, y: F - 2, vx: rnd(-40, 10), vy: rnd(-60, -10), g: 200, life: rnd(0.15, 0.3), c: pick(["#eaba49", "#fff3c4", "#ff9a3a"]), sz: 1, add: true }); }); }
          if (p >= 0.45 && once(s, "go")) { a.sfx("whoosh"); a.shake(3); burst(a, a.x, F, 14, ["rgba(200,190,180,0.8)", "rgba(150,140,130,0.7)"], 20, 80, { a0: 3.3, a1: 6.1, g: -10, drag: 2, l0: 0.4, l1: 0.7, sz: 4, sz2: 9 }); burst(a, a.x, F, 10, FIRE, 40, 120, { a0: 3.5, a1: 5.9, g: 200, add: true, l0: 0.2, l1: 0.4 }); }
          var b = lerp(F + 1, -2, ei(seg(p, 0.45, 1)));
          if (p > 0.47 && p < 0.85 && b > 16) every(s, "tr", dt, 70, function () { a.fx({ x: a.x + rnd(-2, 2), y: b + 4, vx: rnd(-20, 20), vy: rnd(30, 80), g: 120, life: rnd(0.25, 0.45), c: pick(FIRE), sz: 1, add: true }); });
        } else {
          var q = seg(p, 0.4, 0.55), ex = a.lad, ey = a.F - 130;
          if (p >= 0.4 && once(s, "split")) a.sfx("whoosh");
          if (q >= 1 && once(s, "boom")) {
            a.sfx("coinIn"); a.sfx("voice", { f: 140, slide: 0.5, wave: "sawtooth", vol: 0.06 }); a.shake(2); a.flash(0.15, "#fff3c4");
            for (var i = 0; i < 36; i++) { var an = i / 36 * 6.283, v = 70 + (i % 3) * 30; a.fx({ x: ex, y: ey, vx: Math.cos(an) * v, vy: Math.sin(an) * v, g: 50, drag: 1.6, life: rnd(0.7, 1), c: FIRE[i % 4], sz: 2, sz2: 1, add: true }); }
          }
          if (p > 0.4 && p < 0.55) every(s, "tr", dt, 60, function () { a.fx({ x: a.lad + rnd(-1, 1), y: lerp(F - 50, ey, eo(seg(p, 0.4, 0.55))) + 6, vx: rnd(-10, 10), vy: rnd(20, 50), life: 0.3, c: pick(FIRE), sz: 1, add: true }); });
          if (p >= 0.85 && once(s, "land")) { a.sfx("step"); a.shake(1); dust(a, a.x, F, 10); }
        }
      },
      draw: function (g, s, a) {
        var F = a.F, p = a.p, x = R(a.x), t = a.T, y, b;
        if (a.out) {
          var hq = seg(p, 0, 0.22), th = R(16 * eo(seg(p, 0.05, 0.15))), rq = seg(p, 0.45, 1);
          b = lerp(F + 1, -2, ei(rq));
          y = p < 0.22 ? lerp(F + 1, F - 15, hq) - 20 * Math.sin(hq * Math.PI) : b - 16;
          var jx = p >= 0.22 && p < 0.45 ? R(Math.sin(t * 60)) : 0, sy = p >= 0.3 && p < 0.45 ? 1 - 0.08 * seg(p, 0.3, 0.45) : rq > 0 ? 1.1 : 1;
          shadow(g, x, F, 1 - rq * 2);
          clipped(g, a, function () { firework(g, x + jx, R(p < 0.45 ? F + 1 : b), th, p >= 0.45, t); a.body(g, x + jx, y, { sy: sy, sx: rq > 0 ? 0.94 : 1 }); });
          if (p >= 0.45 && b > 10) glow(g, x, b + 4, 12, "255,170,80", 0.7);
          return true;
        }
        var cq = seg(p, 0, 0.4), sq = seg(p, 0.4, 0.55), fq = seg(p, 0.4, 0.85), lq = seg(p, 0.85, 1), ey = F - 130;
        b = p < 0.4 ? lerp(a.R + 30, F - 50, eo(cq)) : lerp(F - 50, ey, eo(sq));
        y = p < 0.4 ? b - 16 : lerp(F - 66, F + 1, fq * fq) - 40 * fq * (1 - fq);
        shadow(g, x, F, fq);
        clipped(g, a, function () { if (sq < 1) firework(g, x, R(b), 16, true, t); a.body(g, x, y, { sy: lq > 0 ? squash(lq) : 1, sx: lq > 0 ? 2 - squash(lq) : 1 }); });
        if (sq < 1) glow(g, x, b + 4, 12, "255,170,80", 0.7);
        if (sq >= 1) {
          var bq = seg(p, 0.55, 1), r = 6 + 34 * eo(bq);
          glow(g, x, ey, 40 * (1 - bq) + 6, "255,230,170", 0.8 * (1 - bq));
          g.globalAlpha = Math.max(0, 1 - bq);
          for (var i = 0; i < 5; i++) { var an = i * 1.2566 - 1.5708; star(g, R(x + Math.cos(an) * r), R(ey + Math.sin(an) * r + bq * 10), FIRE[i % 4]); }
          g.globalAlpha = 1;
        }
        return true;
      }
    }
  });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.hallMoves) return;
  var B = BH.hallMoves, FIRE = ["#fff3c4", "#ffd36a", "#ff9a3c", "#ff6a1a", "#d8401a"];
  function fd(a) { return a.dir === "left" ? -1 : 1; }
  function rn(a, b) { return a + Math.random() * (b - a); }
  function sq(q) { return 1 - 0.3 * Math.cos(q * 7.5) * Math.exp(-q * 4); }
  function shadow(g, x, F, k) { if (k <= 0.05) return; g.fillStyle = "rgba(0,0,0," + (0.35 * Math.min(1, k)).toFixed(3) + ")"; g.fillRect(Math.round(x) - 12, F + 1, 24, 3); g.fillRect(Math.round(x) - 9, F + 4, 18, 1); }
  function ring(g, x, y, r, f, c, al) { if (al <= 0 || r <= 0) return; g.globalAlpha = Math.min(1, al); g.strokeStyle = c; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, r, r * f, 0, 0, 6.283); g.stroke(); g.globalAlpha = 1; }
  function dust(a, x, y, n, c, sp) { for (var i = 0; i < n; i++) { var s = i % 2 ? 1 : -1; a.fx({ x: x + s * rn(2, 10), y: y, vx: s * rn(sp * 0.3, sp), vy: -rn(4, 24), g: 40, drag: 3, life: rn(0.35, 0.6), c: c, sz: 2, sz2: 4, a: 0.8 }); } }
  function star(g, x, y, k) { if (k <= 0) return; g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = Math.min(1, k); g.fillStyle = "#ffffff"; var r = Math.round(1 + k * 3); g.fillRect(Math.round(x), Math.round(y) - r, 1, r * 2 + 1); g.fillRect(Math.round(x) - r, Math.round(y), r * 2 + 1, 1); g.restore(); }

  function flame(g, x, y0, y1, k) {
    var len = Math.min(y1 - y0, 110); if (len <= 2 || k <= 0) return;
    g.save(); g.globalCompositeOperation = "lighter";
    for (var d = 0; d < len; d += 3) {
      var q = d / len, w = Math.max(1, Math.round((9 - 6 * q) * k + Math.random() * 3));
      g.globalAlpha = (1 - q) * 0.9; g.fillStyle = q < 0.2 ? "#fff3c4" : q < 0.55 ? "#ffb347" : "#ff6a1a";
      g.fillRect(Math.round(x) - w, Math.round(y0 + d), w * 2, 3);
    }
    g.restore();
  }
  function dinoY(a) {
    var F = a.F, p = a.p;
    if (a.out) return p < 0.52 ? F + 1 : F + 1 - (F + 80) * a.ei((p - 0.52) / 0.48);
    return p < 0.6 ? a.lerp(a.R + 70, F - 34, a.eo(p / 0.6)) : p < 0.78 ? a.lerp(F - 34, F + 1, a.ei((p - 0.6) / 0.18)) : F + 1;
  }
  B.add("char-039", { up: {
    out: 1.0, in: 0.8,
    update: function (s, a, dt) {
      var F = a.F, x = a.x, f = fd(a), y = dinoY(a), i;
      if (a.out) {
        if (a.p < 0.45) { if (Math.random() < dt * 40) { var an = rn(0, 6.283); a.fx({ x: x + f * 12 + Math.cos(an) * 20, y: F - 36 + Math.sin(an) * 20, vx: -Math.cos(an) * 50, vy: -Math.sin(an) * 50, life: 0.35, c: "#ffb347", sz: 1, add: true }); } return; }
        if (!s.boom) {
          s.boom = 1; a.sfx("voice", { f: 900, slide: 0.3, wave: "sawtooth", vol: 0.06 }); a.sfx("whoosh"); a.shake(4); a.flash(0.25, "#ff9a3c");
          for (i = 0; i < 18; i++) a.fx({ x: x + f * 12, y: F - 34, vx: f * rn(20, 90), vy: rn(120, 260), drag: 3, life: rn(0.2, 0.35), c: FIRE[i % 4], sz: 3, sz2: 1, add: true });
          for (i = 0; i < 30; i++) a.fx({ x: x, y: F, vx: rn(-140, 140), vy: -rn(0, 50), drag: 4, life: rn(0.3, 0.55), c: FIRE[i % 5], sz: 3, sz2: 1, add: true });
        }
        if (a.p > 0.92) return;
        for (i = 0; i < Math.ceil(dt * 70); i++) a.fx({ x: x + rn(-3, 3), y: y + 2, vx: rn(-25, 25), vy: rn(60, 160), drag: 2, life: rn(0.15, 0.3), c: FIRE[1 + (i % 4)], sz: 3, sz2: 1, add: true });
        if (Math.random() < dt * 25) a.fx({ x: x + rn(-12, 12), y: F - 2, vx: rn(-30, 30), vy: -rn(5, 20), drag: 1.5, life: 0.6, c: "#3a3030", sz: 3, sz2: 7, a: 0.5 });
      } else if (a.p < 0.6) {
        for (i = 0; i < Math.ceil(dt * 50); i++) a.fx({ x: x + rn(-3, 3), y: Math.min(y + 2, a.R), vx: rn(-25, 25), vy: rn(40, 120), drag: 2, life: rn(0.12, 0.25), c: FIRE[1 + (i % 4)], sz: 3, sz2: 1, add: true });
      } else if (a.p >= 0.78 && !s.land) {
        s.land = 1; a.sfx("walletLand"); a.shake(3); dust(a, x, F, 10, "#c8a670", 60);
        for (i = 0; i < 8; i++) a.fx({ x: a.lad + rn(-10, 10), y: F + 2, vx: rn(-20, 20), vy: -rn(20, 50), drag: 1.5, life: 0.7, c: "#3a3030", sz: 3, sz2: 8, a: 0.45 });
      }
    },
    draw: function (g, s, a) {
      var F = a.F, x = Math.round(a.x), f = fd(a), p = a.p, y = dinoY(a), sx = 1, sy = 1, rot = 0, jet = 0, q;
      if (a.out) {
        if (p < 0.45) { q = p / 0.45; sy = 1 + 0.08 * q; sx = 1 - 0.05 * q; rot = -0.14 * q * f; if (q > 0.8) x += Math.round(rn(-1, 1)); }
        else if (p < 0.52) { sy = 0.8; sx = 1.15; rot = 0.12 * f; jet = 1; }
        else { q = (p - 0.52) / 0.48; sy = 1 + 0.25 * q; sx = 1 - 0.12 * q; jet = 1; }
        shadow(g, x, F, 1 - (F + 1 - y) / 80);
      } else if (p < 0.6) jet = 1 - p / 0.6;
      else if (p >= 0.78) { sy = sq((p - 0.78) / 0.22); sx = 2 - sy; shadow(g, x, F, 1); }
      g.save(); a.clip(g);
      if (jet) flame(g, x, y - 2, a.out ? F + 1 : a.R + 2, jet);
      a.body(g, x, Math.round(y), { sx: sx, sy: sy, rot: rot });
      g.restore();
      return true;
    }
  } });

  function airball(g, cx, cy, r, t) {
    if (r <= 0.5) return;
    g.save(); g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.18; g.fillStyle = "#bdeaff"; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fill();
    g.globalAlpha = 0.7; g.strokeStyle = "#bdeaff"; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
    g.globalAlpha = 0.9; g.strokeStyle = "#ffffff";
    for (var i = 0; i < 3; i++) { var an = t * 12 + i * 2.094; g.beginPath(); g.arc(cx, cy, Math.max(1, r - 3), an, an + 0.9); g.stroke(); }
    g.fillStyle = "#ffffff"; g.fillRect(Math.round(cx - r * 0.45), Math.round(cy - r * 0.55), 2, 2);
    g.restore();
  }
  function breeze(g, x, y, t, k) {
    if (k <= 0) return;
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = "#dff6ff";
    for (var i = 0; i < 5; i++) {
      var ph = (t * 1.6 + i * 0.37) % 1, side = i % 2 ? 1 : -1, wy = Math.round(y - 8 - i * 11 + ph * 30), wx = Math.round(x + side * (14 + Math.sin(t * 6 + i) * 4)), w = 4 + ((i * 3) % 5);
      g.globalAlpha = k * Math.sin(ph * Math.PI) * 0.7; g.fillRect(wx - (side < 0 ? w : 0), wy, w, 1);
    }
    g.restore();
  }
  function ballUp(a) {
    var F = a.F, p = a.p, r, cy;
    if (a.out) { if (p < 0.42) { r = 3 + 11 * a.eo(p / 0.42); return { r: r, cy: F + 1 - r, feet: F + 1 - 2 * r }; } cy = F - 13 - (F + 80) * a.ei((p - 0.42) / 0.58); return { r: 14, cy: cy, feet: cy - 14 }; }
    if (p < 0.5) { cy = a.lerp(a.R + 40, F - 40, a.eo(p / 0.5)); return { r: 14, cy: cy, feet: cy - 14 }; }
    return { r: 0, cy: F - 40, feet: p < 0.78 ? a.lerp(F - 54, F + 1, a.ei((p - 0.5) / 0.28)) : F + 1 };
  }
  B.add("char-013", {
    up: {
      out: 1.2, in: 0.8,
      update: function (s, a, dt) {
        var b = ballUp(a), x = a.x, i;
        if (a.out) {
          if (!s.spin) { s.spin = 1; a.sfx("voice", { f: 300, slide: 2.5, wave: "sine", vol: 0.04 }); }
          if (a.p >= 0.42 && !s.go) { s.go = 1; a.sfx("whoosh"); dust(a, x, a.F, 10, "#c8a670", 80); }
          if (a.p < 0.92) for (i = 0; i < Math.ceil(dt * 30); i++) { var an = rn(0, 6.283); a.fx({ x: x + Math.cos(an) * b.r, y: b.cy + Math.sin(an) * b.r, vx: -Math.sin(an) * 60, vy: Math.cos(an) * 60 + (a.p > 0.42 ? 90 : 0), drag: 3, life: 0.35, c: "#dff6ff", sz: 1, a: 0.8 }); }
        } else if (a.p >= 0.5 && !s.pop) {
          s.pop = 1; a.sfx("voice", { f: 1200, slide: 0.4, wave: "square", vol: 0.04 });
          for (i = 0; i < 16; i++) { var pa = i / 16 * 6.283; a.fx({ x: x + Math.cos(pa) * 12, y: a.F - 40 + Math.sin(pa) * 12, vx: Math.cos(pa) * 90, vy: Math.sin(pa) * 90, drag: 4, life: 0.4, c: i % 2 ? "#ffffff" : "#bdeaff", sz: 2, sz2: 1, add: true }); }
        } else if (a.p >= 0.78 && !s.land) { s.land = 1; a.sfx("step"); dust(a, x, a.F, 8, "#c8a670", 50); }
      },
      draw: function (g, s, a) {
        var F = a.F, x = Math.round(a.x), b = ballUp(a), p = a.p, sy = 1;
        g.save(); a.clip(g);
        if (a.out) shadow(g, x, F, 1 - (F + 1 - b.cy - b.r) / 60);
        else if (p >= 0.78) { sy = sq((p - 0.78) / 0.22); shadow(g, x, F, 1); }
        airball(g, x, b.cy, b.r, a.T);
        a.body(g, x, Math.round(b.feet), { sy: sy, sx: 2 - sy, rot: b.r ? Math.sin(a.T * 9) * 0.05 : 0 });
        g.restore();
        return true;
      }
    },
    down: {
      out: 0.9, in: 1.3,
      update: function (s, a, dt) {
        var F = a.F, x = a.lad;
        if (a.out) {
          if (!s.w) { s.w = 1; a.sfx("whoosh"); }
          if (Math.random() < dt * 30) a.fx({ x: x + rn(-12, 12), y: F + rn(4, 20), vx: rn(-10, 10), vy: -rn(40, 80), drag: 1, life: 0.5, c: "#dff6ff", sz: 1, a: 0.7 });
        } else {
          if (a.p < 0.85 && Math.random() < dt * 20) a.fx({ x: a.x + rn(-16, 16), y: a.F + 1 - 30 + rn(-20, 20), vx: rn(-15, 15), vy: -rn(30, 60), drag: 1, life: 0.5, c: "#dff6ff", sz: 1, a: 0.6 });
          if (a.p >= 0.85 && !s.land) { s.land = 1; a.sfx("step"); dust(a, a.x, F, 6, "#c8a670", 35); }
        }
      },
      draw: function (g, s, a) {
        var F = a.F, x = Math.round(a.x), p = a.p, y, xo = 0, rot = 0, sy = 1, q;
        g.save(); a.clip(g);
        if (a.out) {
          if (p < 0.3) y = F + 1 - 5 * a.eo(p / 0.3); else y = a.lerp(F - 4, a.R + 65, a.ei((p - 0.3) / 0.7));
          rot = Math.sin(a.T * 8) * 0.08;
          if (p < 0.3) shadow(g, x, F, 1);
          breeze(g, x, F + 1, a.T, 1 - p);
        } else {
          q = Math.min(1, p / 0.85); y = a.lerp(-4, F + 1, q * (2 - q) * 0.5 + q * 0.5);
          var amp = a.clamp((y - 20) / 6, 0, 10) * (1 - Math.max(0, (p - 0.75) / 0.1));
          xo = Math.round(Math.sin(a.T * 5) * amp); rot = Math.cos(a.T * 5) * 0.12 * amp / 10;
          if (p >= 0.85) { sy = 0.88 + 0.12 * a.eo((p - 0.85) / 0.15); rot = 0; xo = 0; }
          shadow(g, x + xo, F, 1 - (F + 1 - y) / 80);
          breeze(g, x + xo, y, a.T, p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15);
        }
        a.body(g, x + xo, Math.round(y), { rot: rot, sy: sy, sx: 2 - sy });
        g.restore();
        return true;
      }
    }
  });

  function piston(g, cx, top, bot) {
    var L = bot - top; if (L < 1) return;
    var n = 4, sl = L / n;
    for (var i = 0; i < n; i++) {
      var w = 6 - i, x = Math.round(cx - w / 2), y = Math.round(top + i * sl), hh = Math.max(1, Math.round(top + (i + 1) * sl) - y);
      g.fillStyle = "#8a8f98"; g.fillRect(x, y, w, hh);
      g.fillStyle = "#c3c8cf"; g.fillRect(x, y, 1, hh);
      g.fillStyle = "#4a4e55"; g.fillRect(x + w - 1, y, 1, hh);
      g.fillStyle = "#2c2f35"; g.fillRect(x - 1, y, w + 2, Math.min(2, hh));
    }
    g.fillStyle = "#5a5e66"; g.fillRect(Math.round(cx) - 4, Math.round(bot) - 2, 8, 2);
    g.fillStyle = "#2c2f35"; g.fillRect(Math.round(cx) - 4, Math.round(bot), 8, 1);
  }
  function legs(g, x, top, bot) { piston(g, x - 5, top, bot); piston(g, x + 5, top, bot); }
  function botY(a) {
    var F = a.F, p = a.p, t = a.T, q;
    if (a.out) {
      if (t < 0.15) return { y: F + 1, bot: F + 1 };
      if (t < 1.0) { q = a.eio((t - 0.15) / 0.85); return { y: F + 1 - (F + 71) * q, bot: F + 1 }; }
      return { y: -70, bot: a.lerp(F + 1, -12, a.eio(Math.min(1, (t - 1.0) / 0.3))) };
    }
    if (p < 0.4) return { y: a.lerp(a.R + 30, F - 14, a.eo(p / 0.4)), bot: a.R + 40 };
    if (p < 0.75) { q = a.eio((p - 0.4) / 0.35); var y = a.lerp(F - 14, F + 1, q); return { y: y, bot: a.lerp(a.R + 40, y, q) }; }
    return { y: F + 1, bot: F + 1 };
  }
  B.add("char-074", { up: {
    out: 1.3, in: 0.9,
    update: function (s, a, dt) {
      var F = a.F, x = a.x, b = botY(a), i;
      if (a.out) {
        if (!s.c) { s.c = 1; a.sfx("click"); for (i = 0; i < 4; i++) a.fx({ x: x + rn(-8, 8), y: F - 2, vx: rn(-20, 20), vy: -rn(10, 30), drag: 2, life: 0.5, c: "#c8c8c8", sz: 2, sz2: 5, a: 0.5 }); }
        s.wh = (s.wh || 0) - dt;
        if (a.T > 0.15 && a.T < 1.0 && s.wh <= 0) { s.wh = 0.07; a.sfx("voice", { f: 200 + 600 * ((a.T - 0.15) / 0.85), slide: 1.1, wave: "square", vol: 0.03 }); }
        if (a.T > 0.15 && a.T < 0.9 && b.y > 14 && Math.random() < dt * 14) a.fx({ x: x + (Math.random() < 0.5 ? -5 : 5), y: a.lerp(b.y, F, Math.random()), vx: rn(-40, 40), vy: -rn(10, 50), g: 200, life: 0.3, c: "#ffcf6a", sz: 1, add: true });
        if (a.T >= 1.0 && !s.z) { s.z = 1; a.sfx("whoosh"); }
      } else if (a.p >= 0.75 && !s.k) {
        s.k = 1; a.sfx("click"); a.shake(1.5);
        for (i = 0; i < 6; i++) a.fx({ x: x + (i % 2 ? 8 : -8), y: F - 2, vx: (i % 2 ? 1 : -1) * rn(20, 50), vy: -rn(5, 20), drag: 2, life: 0.6, c: "#c8c8c8", sz: 2, sz2: 6, a: 0.5 });
      } else if (a.p < 0.75 && a.p > 0.4) { s.wh = (s.wh || 0) - dt; if (s.wh <= 0) { s.wh = 0.07; a.sfx("voice", { f: 700 - 500 * ((a.p - 0.4) / 0.35), slide: 0.9, wave: "square", vol: 0.03 }); } }
    },
    draw: function (g, s, a) {
      var F = a.F, x = Math.round(a.x), b = botY(a), p = a.p, sy = 1, jit = 0;
      g.save(); a.clip(g);
      if (a.out) {
        if (a.T < 0.15) sy = 1 - 0.08 * Math.sin(a.T / 0.15 * Math.PI);
        else if (a.T < 1.0) jit = Math.floor(a.T * 30) % 2;
        shadow(g, x, F, b.bot >= F ? 1 : 0);
      } else if (p >= 0.75) { sy = sq((p - 0.75) / 0.25) * 0.5 + 0.5; shadow(g, x, F, 1); }
      legs(g, x, b.y - 3, b.bot);
      if (b.y > -70) a.body(g, x, Math.round(b.y) - jit, { sy: sy, sx: 2 - sy });
      g.restore();
      return true;
    }
  } });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.hallMoves) return;

  var PI = Math.PI;
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function oval(g, cx, cy, rx, ry, c) {
    rx = Math.round(rx); ry = Math.max(1, Math.round(ry)); cx = Math.round(cx); cy = Math.round(cy); if (rx < 1) return; g.fillStyle = c;
    for (var dy = -ry; dy <= ry; dy++) { var hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry)))); if (hw > 0) g.fillRect(cx - hw, cy + dy, hw * 2, 1); }
  }
  function ph(a, lo, hi) { return Math.max(0, Math.min(1, (a.p - lo) / (hi - lo))); }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function pick(l) { return l[Math.floor(Math.random() * l.length)]; }
  function sgn(a) { return a.dir === "left" ? -1 : 1; }
  function shadow(g, x, F, w, al) { if (w < 2 || al <= 0) return; g.save(); g.globalAlpha = al; px(g, x - w / 2, F + 1, w, 3, "#000000"); px(g, x - w * 0.37, F + 4, w * 0.75, 1, "#000000"); g.restore(); }
  function emit(s, k, rate, dt, fn) { s[k] = (s[k] || 0) + rate * dt; while (s[k] >= 1) { s[k]--; fn(); } }
  function lf(a, life, out) { return a.out ? Math.min(life, Math.max(0.02, (1 - a.p) * out)) : life; }
  function clipped(g, a, kind, fn) { g.save(); if (kind === 1) a.clip(g); else if (kind === 2) a.clipFloor(g); fn(); g.restore(); }

  var FIRE = ["#ff6a1a", "#ffd34a", "#ff3b1a", "#ffb02a"];
  function flames(g, x, F, r, t, h, front) {
    if (r < 2 || h <= 0) return;
    for (var i = 0; i < 18; i++) {
      var an = i / 18 * 2 * PI, sn = Math.sin(an); if ((sn > 0) !== front) continue;
      var cx = Math.round(x + Math.cos(an) * r), cy = Math.round(F + 1 + sn * r * 0.25);
      var fh = Math.round(h * (5 + 3 * Math.sin(t * 23 + i * 1.7) + 2 * Math.sin(t * 37 + i)));
      if (fh < 2) continue;
      px(g, cx - 1, cy - fh, 3, fh, "#b3261a"); px(g, cx - 1, cy - fh * 0.6, 3, fh * 0.6, "#ff6a1a");
      px(g, cx, cy - fh * 0.35, 1, fh * 0.35, "#ffd34a"); px(g, cx, cy - fh - 2, 1, 2, "#ff6a1a");
    }
  }
  function pit(g, x, F, r, t) {
    if (r < 3) return;
    oval(g, x, F + 1, r * 0.9, r * 0.24, "#1a0602");
    g.save(); g.globalAlpha = 0.55 + 0.25 * Math.sin(t * 19); oval(g, x, F + 1, r * 0.6, r * 0.14, "#8a2208"); g.restore();
  }
  function devil(up) {
    function ring(a) { return a.out ? 18 * a.eo(ph(a, 0, 0.25)) * (1 - ph(a, 0.88, 1)) : 20 * a.eo(ph(a, 0, 0.15)) * (1 - ph(a, 0.72, 1)); }
    function heat(a) { return a.out ? 0.6 + 0.9 * ph(a, 0.25, 0.6) : 1.6 - 0.9 * ph(a, 0.4, 1); }
    function pose(a) {
      var y = a.F + 1, sx = 1, sy = 1, jx = 0;
      if (a.out) {
        var c = ph(a, 0.08, 0.3), q = ph(a, 0.3, 0.9);
        if (q <= 0) { sy = 1 - 0.13 * c; sx = 1 + 0.08 * c; } else { sy = 1.06; sx = 0.96; y += a.ei(q) * 66; jx = Math.round(Math.sin(a.T * 70)); }
      } else {
        var r = ph(a, 0.1, 0.6), l = ph(a, 0.6, 0.85);
        y += (1 - a.eo(r)) * 66;
        if (r < 1) { sy = 1.14; sx = 0.92; } else { var b = Math.sin(l * PI); sy = 1 - 0.13 * b; sx = 1 + 0.08 * b; }
      }
      return { x: Math.round(a.x) + jx, y: Math.round(y), sx: sx, sy: sy };
    }
    return {
      out: 0.85, "in": 0.8,
      start: function (s, a) { a.sfx("voice", { f: 110, slide: 0.5, wave: "sawtooth", vol: 0.05 }); },
      swap: function (s, a) {
        a.sfx("voice", { f: 70, slide: 2.5, wave: "sawtooth", vol: 0.06 }); a.shake(4); a.flash(0.3, "#ff7a2a");
        for (var i = 0; i < 30; i++) a.fx({ x: a.x + a.rnd(-8, 8), y: a.F, vx: a.rnd(-25, 25), vy: a.rnd(-220, -90), g: 60, drag: 1.5, life: a.rnd(0.35, 0.7), c: pick(FIRE), sz: 3, sz2: 1, add: true });
      },
      update: function (s, a, dt) {
        var r = ring(a);
        if (r > 4) emit(s, "e", 70 * heat(a), dt, function () { a.fx({ x: a.x + a.rnd(-r, r), y: a.F + a.rnd(-1, 2), vx: a.rnd(-12, 12), vy: a.rnd(-110, -40), g: -20, life: a.rnd(0.25, 0.6), c: pick(FIRE), sz: 2, sz2: 1, add: true }); });
        if (a.out && a.p >= 0.3 && once(s, "sink")) {
          a.sfx("whoosh"); a.shake(3);
          for (var i = 0; i < 24; i++) a.fx({ x: a.x + a.rnd(-14, 14), y: a.F, vx: a.rnd(-30, 30), vy: a.rnd(-180, -60), g: 40, life: a.rnd(0.3, 0.6), c: pick(FIRE), sz: 3, sz2: 1, add: true });
        }
        if (a.out && a.p > 0.3 && a.p < 0.9) a.shake(1.5);
        if (a.out && a.p >= 0.9 && once(s, "fl")) a.flash(0.25, "#ff5a1a");
      },
      draw: function (g, s, a) {
        var r = ring(a), P = pose(a);
        flames(g, a.x, a.F, r, a.now, heat(a), false); pit(g, a.x, a.F, r, a.now);
        if (P.y <= a.F + 3) shadow(g, P.x, a.F, 24, 0.3);
        clipped(g, a, 2, function () { a.body(g, P.x, P.y, { sx: P.sx, sy: P.sy }); });
        return true;
      },
      over: function (g, s, a) { flames(g, a.x, a.F, ring(a), a.now, heat(a), true); }
    };
  }
  BH.hallMoves.add("char-005", { up: devil(true), down: devil(false) });

  var BAT = [
    ["w.....b.b.....w", "ww...bbbbb...ww", ".www.bebeb.www.", "..wwwbbbbbwww..", "....wwbbbww....", "......b.b......"],
    ["......b.b......", ".....bbbbb.....", "...wwbebebww...", ".wwwwwbbbwwwww.", "www..w...w..www", "w.............w"]
  ];
  var BATC = { b: "#24142c", w: "#4a2a5a", e: "#ff3030" };
  function bat(g, x, y, k) {
    var f = BAT[k], x0 = Math.round(x) - 7, y0 = Math.round(y) - 3;
    for (var r = 0; r < f.length; r++) for (var c = 0; c < f[r].length; c++) { var ch = f[r].charAt(c); if (ch !== ".") px(g, x0 + c, y0 + r, 1, 1, BATC[ch]); }
  }
  var CAPE = ["#5a0f1a", "#8a1a2a", "#1a0a14", "#3a0c24"];
  function swirl(g, x, y, amt, t, front) {
    if (amt <= 0.02) return;
    for (var i = 0; i < 12; i++) {
      var an = t * 15 + i * 0.524, sn = Math.sin(an); if ((sn > 0) !== front) continue;
      var ox = Math.round(x + Math.cos(an) * (10 + 8 * amt)), oy = Math.round(y - 6 - (i % 6) * 9 + sn * 2);
      px(g, ox - 1, oy, 3 + Math.round(amt * 2), 2, CAPE[i % 4]);
    }
  }
  function vampire(up) {
    var top = -12, mid = function (a) { return a.F - 32; };
    function batAt(a) {
      if (a.out) {
        var q = ph(a, 0.4, 1); if (a.p < 0.4) return null;
        var to = a.tree ? a.R + 14 : top;
        return { x: a.x + Math.round(Math.sin(q * 13) * 3), y: Math.round(a.lerp(mid(a), to, a.ei(q))) };
      }
      var q2 = ph(a, 0, 0.5); if (a.p >= 0.5) return null;
      var from = a.tree ? a.R + 14 : top;
      return { x: a.x + Math.round(Math.sin(q2 * 13) * 3), y: Math.round(a.lerp(from, mid(a), a.eo(q2))) };
    }
    function spinAmt(a) { return a.out ? a.ei(ph(a, 0, 0.4)) : 1 - a.eo(ph(a, 0.5, 1)); }
    function poof(a) {
      for (var i = 0; i < 18; i++) { var an = Math.random() * 2 * PI, v = a.rnd(30, 90); a.fx({ x: a.x + Math.cos(an) * 4, y: a.F - 30 + Math.sin(an) * 8, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 20, drag: 5, life: lf(a, a.rnd(0.35, 0.6), 0.8), c: pick(["#2a1830", "#4a1a2a", "#6a1020", "#1a0a14"]), sz: 5, sz2: 2, a: 0.9 }); }
      for (var j = 0; j < 8; j++) a.fx({ x: a.x + a.rnd(-6, 6), y: a.F - 30 + a.rnd(-10, 10), vx: a.rnd(-60, 60), vy: a.rnd(-60, 30), life: lf(a, a.rnd(0.2, 0.4), 0.8), c: "#ff3030", sz: 1, add: true });
      a.shake(2);
    }
    return {
      out: 0.8, "in": 0.8,
      start: function (s, a) { a.sfx("whoosh"); },
      update: function (s, a, dt) {
        if (a.out && a.p >= 0.4 && once(s, "pa")) { poof(a); a.sfx("voice", { f: 900, slide: 1.6, wave: "square", vol: 0.04 }); }
        if (!a.out && a.p >= 0.5 && once(s, "pb")) { poof(a); a.sfx("voice", { f: 700, slide: 0.6, wave: "square", vol: 0.04 }); }
        var B = batAt(a);
        if (B) {
          var k = Math.floor(a.T * 14) % 2; if (k !== s.k) { s.k = k; if (k) a.sfx("voice", { f: 1300, slide: 0.7, wave: "triangle", vol: 0.02 }); }
          emit(s, "tr", 40, dt, function () { a.fx({ x: B.x + a.rnd(-2, 2), y: B.y, vx: a.rnd(-8, 8), vy: a.rnd(-8, 8), life: lf(a, 0.3, 0.8), c: pick(["#ff3030", "#4a2a5a"]), sz: 1, a: 0.7 }); });
        }
      },
      draw: function (g, s, a) {
        var B = batAt(a), x = Math.round(a.x), y = a.F + 1;
        if (B) { clipped(g, a, 1, function () { bat(g, B.x, B.y, Math.floor(a.T * 14) % 2); }); return true; }
        var amt = spinAmt(a), an = amt * 3 * PI, sx = Math.cos(an);
        if (Math.abs(sx) < 0.08) sx = sx < 0 ? -0.08 : 0.08;
        shadow(g, x, a.F, 24, 0.3);
        swirl(g, x, y, amt, a.now, false);
        a.body(g, x, y, { sx: sx, sy: 1 + 0.06 * Math.sin(amt * PI) });
        swirl(g, x, y, amt, a.now, true);
        return true;
      }
    };
  }
  BH.hallMoves.add("char-019", { up: vampire(true), down: vampire(false) });

  var SMOKE = ["#d8d4cc", "#a8a49c", "#e8e6e0", "#8e8a84", "#f4f2ee"];
  function cloud(g, x, y, r, al, t) {
    if (r < 2 || al <= 0) return;
    g.save(); g.globalAlpha = al;
    var B = [[0, 0, 1], [-0.8, 0.3, 0.75], [0.8, 0.3, 0.75], [-0.45, -0.55, 0.7], [0.5, -0.5, 0.65], [0, 0.7, 0.7], [-1.1, 0.8, 0.5], [1.1, 0.8, 0.5]];
    B.forEach(function (b, i) { var w = Math.sin(t * 6 + i) * 1.5; oval(g, x + b[0] * r + w, y + b[1] * r + 2, b[2] * r, b[2] * r, "#8e8a84"); });
    B.forEach(function (b, i) { var w = Math.sin(t * 6 + i) * 1.5; oval(g, x + b[0] * r + w, y + b[1] * r, b[2] * r * 0.92, b[2] * r * 0.92, "#cfccc4"); });
    B.forEach(function (b, i) { var w = Math.sin(t * 6 + i) * 1.5; oval(g, x + b[0] * r + w - b[2] * r * 0.2, y + b[1] * r - b[2] * r * 0.3, b[2] * r * 0.45, b[2] * r * 0.4, "#f0eee8"); });
    g.restore();
  }
  function smoke(a, n, y) {
    for (var i = 0; i < n; i++) { var an = Math.random() * 2 * PI, v = a.rnd(30, 90); a.fx({ x: a.x + Math.cos(an) * 6, y: y + Math.sin(an) * 10, vx: Math.cos(an) * v, vy: Math.sin(an) * v * 0.6 - 25, g: -15, drag: 4, life: a.rnd(0.45, 0.9), c: pick(SMOKE), sz: 4, sz2: 9, a: 0.85 }); }
  }
  function ninja(up) {
    function bomb(a) {
      var q = ph(a, 0.05, 0.3), d = sgn(a);
      return { x: Math.round(a.x + d * a.lerp(9, 4, q)), y: Math.round(a.lerp(a.F - 26, a.F - 2, a.ei(q)) - Math.sin(q * PI) * 4) };
    }
    return {
      out: 0.7, "in": 0.8,
      start: function (s, a) { a.sfx("voice", { f: 600, slide: 1.4, wave: "triangle", vol: 0.03 }); },
      swap: function (s, a) { smoke(a, 20, a.F - 22); a.sfx("voice", { f: 260, slide: 0.5, wave: "triangle", vol: 0.04 }); },
      update: function (s, a, dt) {
        if (a.out && a.p >= 0.3 && once(s, "poof")) {
          smoke(a, 26, a.F - 18); a.sfx("whoosh"); a.sfx("voice", { f: 180, slide: 0.3, wave: "triangle", vol: 0.05 }); a.shake(2);
          for (var i = 0; i < 8; i++) a.fx({ x: a.x, y: a.F - 4, vx: a.rnd(-160, 160), vy: a.rnd(-40, 0), drag: 6, life: 0.25, c: "#ffffff", sz: 1 });
        }
        if (!a.out && a.p >= 0.4 && once(s, "pop")) a.sfx("step");
      },
      draw: function (g, s, a) {
        var x = Math.round(a.x), d = sgn(a);
        if (a.out) {
          if (a.p >= 0.34) return true;
          var c = ph(a, 0, 0.3);
          shadow(g, x, a.F, 24, 0.3);
          a.body(g, x, Math.round(a.F + 1 - Math.sin(c * PI) * 3), { rot: d * 0.07 * Math.sin(c * PI) });
          if (a.p < 0.3) { var B = bomb(a); px(g, B.x - 2, B.y - 2, 4, 4, "#2a2a30"); px(g, B.x - 1, B.y - 2, 1, 1, "#6a6a74"); px(g, B.x + 1, B.y - 4, 1, 2, "#5a4630"); px(g, B.x + 1, B.y - 5, 1, 1, Math.floor(a.T * 30) % 2 ? "#ffd34a" : "#ffffff"); }
          return true;
        }
        var cr = 1 - ph(a, 0.35, 0.45), pop = ph(a, 0.45, 0.65), sy = 0.82 + 0.18 * (1 - cr), sx = 1.12 - 0.12 * (1 - cr);
        if (cr <= 0) { sy = 1 + 0.08 * Math.sin(pop * PI); sx = 1 - 0.05 * Math.sin(pop * PI); }
        shadow(g, x, a.F, 26, 0.3);
        a.body(g, x, a.F + 1, { sx: sx, sy: sy });
        return true;
      },
      over: function (g, s, a) {
        if (a.out) { if (a.p >= 0.3) cloud(g, a.x, a.F - 24, 8 + 14 * a.eo(ph(a, 0.3, 0.55)), 1, a.now); return; }
        var q = ph(a, 0, 0.6);
        cloud(g, a.x, a.F - 24 - q * 8, 22 * (1 - a.eo(q)), 1 - q * 0.4, a.now);
        if (q < 1) { g.save(); g.globalAlpha = 0.6 * (1 - q); oval(g, a.x, a.F, 18 + q * 14, 3, "#a8a49c"); g.restore(); }
      }
    };
  }
  BH.hallMoves.add("char-040", { up: ninja(true), down: ninja(false) });

  function jet(g, x, y, len) {
    if (len < 1) return;
    var rows = Math.round(len);
    for (var r = 0; r < rows; r++) {
      var q = r / rows, w = Math.max(1, Math.round(4 * (1 - q) + 1));
      var c = q < 0.2 ? "#ffffff" : q < 0.45 ? "#ffe066" : q < 0.75 ? "#ff8a1a" : "#d0341a";
      px(g, x - 5 - Math.floor(w / 2), y + r, w, 1, c); px(g, x + 5 - Math.floor(w / 2), y + r, w, 1, c);
    }
  }
  var THRUST = ["#ffe066", "#ff8a1a", "#ffffff", "#ff5a1a"], FUME = ["#8e8a84", "#a8a49c", "#6e6a64"];
  function astro(up) {
    var OUT = up ? 0.9 : 1.0;
    function pose(a) {
      var F = a.F, y = F + 1, sx = 1, sy = 1, rot = 0, len = 0;
      if (a.out && up) {
        var c = ph(a, 0, 0.3), q = ph(a, 0.3, 1);
        if (q <= 0) { sy = 1 - 0.14 * c; sx = 1 + 0.08 * c; len = 2 + 6 * c; } else { y = F + 1 - a.ei(q) * (F + 75); sy = 1.12; sx = 0.92; len = 14; }
      } else if (!a.out && up) {
        var r = ph(a, 0, 0.35), f = ph(a, 0.35, 0.9), l = ph(a, 0.9, 1);
        if (a.p < 0.35) { y = a.lerp(a.R + 64, F - 30, a.eo(r)); sy = 1.1; sx = 0.94; len = 14 * (1 - r * 0.6); }
        else { y = F - 30 + 31 * a.eio(f) + Math.sin(f * PI * 2) * 2 * (1 - f); rot = Math.sin(a.T * 6) * 0.05 * (1 - f); len = f < 1 && Math.floor(a.T * 9) % 4 === 0 ? 3 : 0; if (l > 0) { var b = Math.sin(l * PI); sy = 1 - 0.14 * b; sx = 1 + 0.08 * b; rot = 0; } }
      } else if (a.out) {
        var hp = ph(a, 0, 0.18), d = ph(a, 0.18, 1);
        if (a.p < 0.18) { y = F + 1 - 10 * a.eo(hp); len = 8 * (1 - hp); } else { y = a.lerp(F - 9, F + 62, d); rot = Math.sin(a.T * 6) * 0.06; len = Math.floor(a.T * 9) % 4 === 0 ? 3 : 0; }
      } else {
        var dd = ph(a, 0, 0.3), dq = ph(a, 0.3, 0.88), dl = ph(a, 0.88, 1);
        if (a.p < 0.3) { y = a.lerp(-6, F - 45, a.eo(dd)); }
        else if (a.p < 0.88) { y = a.lerp(F - 45, F + 1, dq); rot = Math.sin(a.T * 6) * 0.06 * (1 - dq); len = dq < 0.25 ? 6 + Math.random() * 3 : Math.floor(a.T * 9) % 4 === 0 ? 3 : 0; }
        else { var db = Math.sin(dl * PI); sy = 1 - 0.14 * db; sx = 1 + 0.08 * db; }
      }
      return { x: Math.round(a.x), y: Math.round(y), sx: sx, sy: sy, rot: rot, len: len };
    }
    return {
      out: OUT, "in": up ? 1.0 : 1.1,
      start: function (s, a) { a.sfx("voice", { f: 60, slide: 2, wave: "sawtooth", vol: 0.05 }); },
      update: function (s, a, dt) {
        var P = pose(a), lit = P.len >= 8;
        if (up && a.out && a.p >= 0.3 && once(s, "lift")) { a.sfx("whoosh"); a.shake(3); for (var i = 0; i < 16; i++) a.fx({ x: a.x + a.rnd(-4, 4), y: a.F, vx: (i % 2 ? 1 : -1) * a.rnd(40, 110), vy: a.rnd(-20, 0), drag: 3, life: lf(a, a.rnd(0.4, 0.8), OUT), c: pick(FUME), sz: 3, sz2: 7, a: 0.8 }); }
        if (up && a.out && a.p < 0.3) { a.shake(1.5); emit(s, "fl", 30, dt, function () { a.fx({ x: a.x + a.rnd(-6, 6), y: a.F, vx: a.rnd(-70, 70), vy: a.rnd(-10, 0), drag: 3, life: lf(a, 0.5, OUT), c: pick(FUME), sz: 2, sz2: 5, a: 0.7 }); }); }
        if (!up && !a.out && a.p >= 0.3 && once(s, "brake")) a.sfx("voice", { f: 90, slide: 0.6, wave: "sawtooth", vol: 0.04 });
        if (!up && a.out && a.p < 0.05 && once(s, "hop")) a.sfx("whoosh");
        if (up && !a.out && a.p >= 0.35 && once(s, "cut")) a.sfx("voice", { f: 400, slide: 0.5, wave: "sine", vol: 0.03 });
        if (lit && P.y < a.R + 4 && P.y > -4) emit(s, "tr", 90, dt, function () {
          a.fx({ x: P.x + (Math.random() < 0.5 ? -5 : 5) + a.rnd(-1, 1), y: P.y + P.len, vx: a.rnd(-10, 10), vy: a.rnd(80, 160), life: lf(a, a.rnd(0.12, 0.28), OUT), c: pick(THRUST), sz: 2, sz2: 1, add: true });
          if (Math.random() < 0.4) a.fx({ x: P.x + a.rnd(-4, 4), y: P.y + P.len + 2, vx: a.rnd(-15, 15), vy: a.rnd(20, 50), drag: 2, life: lf(a, a.rnd(0.4, 0.7), OUT), c: pick(FUME), sz: 3, sz2: 7, a: 0.6 });
        });
        var land = up ? !a.out && a.p >= 0.9 : !a.out && a.p >= 0.88;
        if (land && once(s, "land")) { a.sfx("step"); for (var j = 0; j < 10; j++) a.fx({ x: a.x + a.rnd(-8, 8), y: a.F, vx: (j % 2 ? 1 : -1) * a.rnd(20, 60), vy: a.rnd(-25, -5), drag: 3, life: a.rnd(0.4, 0.7), c: pick(FUME), sz: 2, sz2: 5, a: 0.6 }); }
      },
      draw: function (g, s, a) {
        var P = pose(a), near = a.F + 1 - P.y;
        if (near >= 0 && near < 60) shadow(g, P.x, a.F, Math.round(24 * (1 - near / 80)), 0.3 * (1 - near / 60));
        clipped(g, a, 1, function () {
          jet(g, P.x, P.y, P.len > 0 ? P.len * (0.8 + Math.random() * 0.35) : 0);
          a.body(g, P.x, P.y, { sx: P.sx, sy: P.sy, rot: P.rot });
        });
        return true;
      }
    };
  }
  BH.hallMoves.add("char-042", { up: astro(true), down: astro(false) });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.hallMoves) return;
  var add = BH.hallMoves.add;
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function line(g, x0, y0, x1, y1, c) {
    var n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); g.fillStyle = c;
    for (var i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
  }
  function dust(a, x, y, n, c) { for (var i = 0; i < n; i++) { var an = Math.PI * (i + 0.5) / n, v = a.rnd(25, 60); a.fx({ x: x + Math.cos(an) * 6, y: y, vx: Math.cos(an) * v, vy: -Math.sin(an) * v * 0.4, g: 30, drag: 3, life: a.rnd(0.35, 0.55), c: c || "#c8a670", sz: 2, sz2: 3, a: 0.7 }); } }

  var TF = 27, TW = 19;
  function totem(g, a, top, n) {
    var sp = a.sprite(a.dir); if (!sp) return;
    var sx = a.dir === "left" ? sp.ax - 6 : sp.ax - 13, dx = Math.round(a.x + sx - sp.ax);
    for (var i = 0; i < n; i++) {
      var ty = Math.round(top + i * TF);
      if (ty > a.R + 2) break;
      if (ty + TF < -2) continue;
      g.drawImage(sp.c, sx, sp.ay - 55, TW, TF, dx, ty, TW, TF);
      px(g, dx + 2, ty + TF - 1, TW - 4, 1, "rgba(20,10,4,0.45)");
    }
  }
  function tikiN(a) { return Math.max(2, Math.ceil((a.F + 4) / TF)); }
  function tikiAt(k, N) { return 0.05 + 0.82 * Math.pow(k / (N - 1), 0.75); }
  add("char-049", { up: {
    out: 1.4, in: 1.1,
    update: function (s, a) {
      if (a.out) {
        var N = tikiN(a); s.k = s.k || 0;
        while (s.k < N && a.p >= tikiAt(s.k, N)) { a.sfx("voice", { f: 120 + s.k * 26, wave: "square", vol: 0.05, slide: 0.7 }); a.shake(1); dust(a, a.x, a.F, 4); s.k++; }
      } else if (!s.down && a.p >= 0.85) { s.down = 1; a.sfx("step"); dust(a, a.x, a.F, 8); }
    },
    swap: function (s, a) { a.sfx("whoosh"); },
    draw: function (g, s, a) {
      var top, n, sy = 1, y;
      g.save(); a.clip(g);
      if (a.out) {
        var N = tikiN(a), H = 0, q = a.p; n = 0;
        for (var k = 0; k < N; k++) { var kp = tikiAt(k, N); if (q < kp) break; var e = cl((q - kp) / 0.07); H += TF * a.eo(e); n++; sy = 1 + 0.08 * Math.sin(e * Math.PI); }
        if (!n) sy = 1 - 0.1 * Math.sin(cl(q / 0.05) * Math.PI);
        top = a.F + 1 - H; y = top;
        g.save(); a.clipFloor(g); totem(g, a, top, n); g.restore();
      } else {
        var p = a.p, hi = a.F - 39;
        y = p < 0.45 ? a.lerp(a.F + 51, hi, a.eo(p / 0.45)) : p < 0.6 ? hi + Math.round(Math.sin((p - 0.45) / 0.15 * Math.PI)) : p < 0.85 ? a.lerp(hi, a.F + 1, a.eio((p - 0.6) / 0.25)) : a.F + 1;
        top = p < 0.85 ? y : a.F + 1 + a.ei((p - 0.85) / 0.15) * 70;
        if (p >= 0.85) sy = 1 - 0.1 * Math.sin(cl((p - 0.85) / 0.12) * Math.PI);
        totem(g, a, top, Math.ceil((a.R + 4 - top) / TF));
      }
      a.body(g, a.x, y, { dir: a.dir, sy: sy, sx: 2 - sy });
      g.restore();
      return true;
    }
  } });

  var GLOW = null;
  function glow() {
    if (GLOW) return GLOW;
    var c = document.createElement("canvas"); c.width = c.height = 33;
    var x = c.getContext("2d");
    for (var j = 0; j < 33; j++) for (var i = 0; i < 33; i++) {
      var d = Math.sqrt((i - 16) * (i - 16) + (j - 16) * (j - 16)), b = d < 2.5 ? 0.9 : d < 5.5 ? 0.45 : d < 9.5 ? 0.22 : d < 16 ? 0.09 : 0;
      if (b) { x.globalAlpha = b; x.fillStyle = d < 2.5 ? "#f2fff8" : "#86f0dc"; x.fillRect(i, j, 1, 1); }
    }
    return (GLOW = c);
  }
  function lure(a) { return { x: Math.round(a.x) + (a.dir === "left" ? -12 : 11), y: Math.round(a.y) - 41 + Math.round(Math.sin(a.now * 2.6) * 0.6) }; }
  function onLadder(a) { return a.busy; }
  add("char-023", { walk: {
    update: function (s, a, dt) { var k = a.moving ? 1 : 0.6; s.lv = s.lv == null ? k : s.lv + (k - s.lv) * Math.min(1, dt * 4); },
    under: function (g, s, a) {
      if (onLadder(a)) return;
      var t = lure(a), P = a.pics(), k0 = (s.lv || 0.6) * (0.85 + 0.15 * Math.sin(a.now * 3.2));
      g.globalCompositeOperation = "lighter";
      for (var i = 0; i < P.length; i++) {
        var b = P[i], d = Math.max(0, Math.abs(b.cx - t.x) - b.w / 2);
        if (d > 60) continue;
        var k = 1 - d / 60; k = k * k * k0;
        var nx = t.x < b.cx ? b.x : b.x + b.w - 1, hx = t.x < b.cx ? b.x : b.x + b.w / 2;
        g.globalAlpha = 0.2 * k; px(g, b.x, b.y, b.w, b.h, "#7fe6d4");
        g.globalAlpha = 0.14 * k; px(g, hx, b.y, b.w / 2, b.h, "#c4fbee");
        g.globalAlpha = 0.45 * k; px(g, nx, b.y, 1, b.h, "#e6fff6");
      }
    },
    over: function (g, s, a) {
      if (onLadder(a)) return;
      var t = lure(a);
      g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.8 * (s.lv || 0.6) * (0.85 + 0.15 * Math.sin(a.now * 3.2));
      g.drawImage(glow(), t.x - 16, t.y - 16);
    }
  } });

  var RB = ["#ff3b4e", "#ff9a2e", "#ffe23b", "#4cff5a", "#3bd8ff", "#4a6bff", "#c04bff"];
  add("char-050", { walk: {
    update: function (s, a, dt) {
      var P = s.p = s.p || [];
      if (s.tr !== a.tree) { P.length = 0; s.tr = a.tree; }
      for (var i = P.length - 1; i >= 0; i--) {
        var q = P[i]; q.t += dt;
        if (q.t >= q.l) { P.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (Math.random() < 0.05) q.j = Math.random() < 0.5 ? -2 : 2; else if (q.j && Math.random() < 0.3) q.j = 0;
      }
      if (!a.moving) { s.acc = 0; return; }
      var b = a.dir === "left" ? 1 : -1, top = a.y - 53;
      s.acc = Math.min(3, (s.acc || 0) + dt * 120);
      while (s.acc >= 1 && P.length < 120) {
        s.acc -= 1;
        var y = a.y - a.rnd(2, 52), bar = Math.random() < 0.08;
        P.push({ x: a.x + b * a.rnd(4, 11), y: y, vx: b * a.rnd(4, 16), vy: a.rnd(-3, 3), t: 0, l: a.rnd(0.5, 0.9), j: 0,
          c: bar ? "#ffffff" : RB[Math.max(0, Math.min(6, Math.floor((y - top) / 7.5)))], w: bar ? Math.round(a.rnd(4, 7)) : Math.random() < 0.2 ? 3 : 2, h: bar ? 1 : 0 });
      }
    },
    under: function (g, s, a) {
      var P = s.p; if (!P || !P.length) return;
      for (var i = 0; i < P.length; i++) {
        var q = P[i]; g.globalAlpha = Math.ceil((1 - q.t / q.l) * 4) / 4;
        px(g, q.x + q.j, q.y, q.w, q.h || q.w, q.c);
      }
    }
  } });
  var lv = { p: [], x: null, y: null, t: null, acc: 0 };
  if (typeof window.drawPlayer === "function") {
    var drawPlayer0 = window.drawPlayer;
    window.drawPlayer = function () {
      try { if (BH.characters && BH.characters.worn(window.save) === "char-050") trail(); else lv.p.length = 0; } catch (e) {}
      return drawPlayer0.apply(this, arguments);
    };
  }
  function trail() {
    var g = window.ctx, pl = window.player, now = window.simTime, P = lv.p;
    if (!g || !pl || typeof now !== "number") return;
    var fx = pl.x, fy = pl.y + 10, dt = lv.t == null ? 0 : Math.max(0, Math.min(0.1, now - lv.t));
    var dx = lv.x == null ? 0 : fx - lv.x, dy = lv.y == null ? 0 : fy - lv.y;
    if (Math.abs(dx) > 60 || Math.abs(dy) > 60) { P.length = 0; dx = dy = 0; }
    lv.x = fx; lv.y = fy; lv.t = now;
    var hh = Math.max(20, Math.min(90, fy - (pl.topY || fy - 46))), k = hh / 55;
    for (var i = P.length - 1; i >= 0; i--) {
      var q = P[i]; q.t += dt;
      if (q.t >= q.l) { P.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (Math.random() < 0.05) q.j = Math.random() < 0.5 ? -2 : 2; else if (q.j && Math.random() < 0.3) q.j = 0;
    }
    var mv = Math.sqrt(dx * dx + dy * dy);
    if (mv > 0.05 && dt > 0) {
      var bx = -dx / mv, by = -dy / mv;
      lv.acc = Math.min(3, lv.acc + dt * 120);
      while (lv.acc >= 1 && P.length < 120) {
        lv.acc -= 1;
        var u = Math.random(), y = fy - 2 * k - u * 50 * k, bar = Math.random() < 0.08, off = 4 + Math.random() * 7;
        P.push({ x: fx + bx * off * k, y: y + by * off * k * 0.5, vx: bx * (4 + Math.random() * 12) * k, vy: by * (4 + Math.random() * 12) * k, t: 0,
          l: 0.5 + Math.random() * 0.4, j: 0, c: bar ? "#ffffff" : RB[Math.max(0, 6 - Math.floor(u * 7))], w: (bar ? 4 + Math.random() * 3 : Math.random() < 0.2 ? 3 : 2) * k, h: bar ? k : 0 });
      }
    } else lv.acc = 0;
    if (!P.length) return;
    g.save();
    for (var n = 0; n < P.length; n++) {
      var p = P[n]; g.globalAlpha = Math.ceil((1 - p.t / p.l) * 4) / 4; g.fillStyle = p.c;
      g.fillRect(Math.round(p.x + p.j * k), Math.round(p.y), Math.max(1, Math.round(p.w)), Math.max(1, Math.round(p.h || p.w)));
    }
    g.restore();
  }
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.hallMoves) return;
  var add = BH.hallMoves.add, TAU = Math.PI * 2;
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function seg(T, a, b) { return cl((T - a) / (b - a)); }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function fd(a) { return a.dir === "left" ? -1 : 1; }
  function shadow(g, x, F, k) { var w = Math.round(24 * k); if (w < 4) return; px(g, Math.round(x) - (w >> 1), F + 1, w, 3, "rgba(0,0,0,0.35)"); }
  function dust(a, x, y, n, c) { for (var i = 0; i < n; i++) { var an = Math.PI * (i + 0.5) / n, v = rnd(30, 70); a.fx({ x: x + Math.cos(an) * 6, y: y, vx: Math.cos(an) * v, vy: -Math.sin(an) * v * 0.4, g: 40, drag: 3, life: rnd(0.35, 0.55), c: c || "#c8a670", sz: 2, sz2: 4, a: 0.7 }); } }
  function disc(g, cx, cy, r, c) { r = Math.round(r); cx = Math.round(cx); cy = Math.round(cy); for (var dy = -r; dy <= r; dy++) { var hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); px(g, cx - hw, cy + dy, hw * 2 + 1, 1, c); } }

  var MC = null;
  function monkey(g, a, x, y, k, sw, kick) {
    if (!MC) { MC = document.createElement("canvas"); MC.width = 58; MC.height = 61; }
    var m = MC.getContext("2d"); if (!m) return a.climb(g, x, y, k);
    m.clearRect(0, 0, 58, 61);
    if (!a.climb(m, 29, 61, k)) return false;
    g.save(); g.translate(Math.round(x), Math.round(y) - 56); g.rotate(sw);
    g.save(); g.translate(0, 25); g.rotate(kick); g.drawImage(MC, 0, 30, 58, 31, -29, 0, 58, 31); g.restore();
    g.drawImage(MC, 0, 0, 58, 34, -29, -5, 58, 34);
    g.restore(); return true;
  }
  function ook(a, n) { a.sfx("voice", { f: 620 + n * 70, slide: 1.7, wave: "sine", vol: 0.05 }); }
  add("char-001", { up: {
    out: 1.2, in: 0.9,
    update: function (s, a) {
      var T = a.T, n;
      if (a.out) { if (T >= 0.15 && once(s, "j")) { a.sfx("whoosh"); dust(a, a.lad, a.F, 6); } n = Math.floor(seg(T, 0.15, 1.2) * 2.999); if (T >= 0.15 && (s.n == null || n > s.n)) { s.n = n; ook(a, n); } }
      else { n = Math.floor(seg(T, 0, 0.5) * 1.999); if (s.m == null || n > s.m) { s.m = n; ook(a, n + 3); }
        if (T >= 0.72 && once(s, "ld")) { a.sfx("step"); dust(a, a.lad, a.F, 8); } }
    },
    draw: function (g, s, a) {
      var T = a.T, F = a.F, x = Math.round(a.lad), ok, u, n, f, L, q;
      g.save(); a.clip(g);
      if (a.out) {
        if (T < 0.15) { q = T / 0.15; shadow(g, x, F, 1); ok = a.body(g, x, F + 1, { sy: 1 - 0.15 * q, sx: 1 + 0.1 * q }); }
        else {
          u = seg(T, 0.15, 1.2) * 3; n = Math.min(2, Math.floor(u)); f = u - n; L = (F + 80) / 3;
          var y = F + 1 - L * (n + a.eo(cl(f / 0.55))), sd = n % 2 ? 1 : -1;
          ok = monkey(g, a, x + Math.round(sd * 3 * Math.sin(f * Math.PI)), Math.round(y), n % 4, sd * 0.32 * Math.sin(f * Math.PI), 0.45 * Math.sin(f * TAU * 2));
        }
      } else {
        if (T < 0.5) {
          u = seg(T, 0, 0.5) * 2; n = Math.min(1, Math.floor(u)); f = u - n; var y0 = a.R + 64, y1 = F - 8; L = (y0 - y1) / 2;
          var yy = y0 - L * (n + a.eo(cl(f / 0.6))), sd2 = n % 2 ? -1 : 1;
          ok = monkey(g, a, x, Math.round(yy), (n + 3) % 4, sd2 * 0.32 * Math.sin(f * Math.PI), 0.45 * Math.sin(f * TAU * 2));
        } else if (T < 0.72) {
          q = seg(T, 0.5, 0.72); ok = a.body(g, x, Math.round(a.lerp(F - 8, F + 1, a.ei(q)) - Math.sin(q * Math.PI) * 12), { dir: a.dir, sy: 1.08, sx: 0.94 });
        } else { q = seg(T, 0.72, 0.9); shadow(g, x, F, 1); var k = Math.sin(q * Math.PI) * (1 - q * 0.5); ok = a.body(g, x, F + 1, { sx: 1 + 0.22 * k, sy: 1 - 0.22 * k }); }
      }
      g.restore(); return ok;
    }
  } });

  function cage(g, x, y, gate, al, lit, front) {
    if (al <= 0) return; x = Math.round(x); y = Math.round(y);
    g.save(); g.globalAlpha = al;
    if (!front) {
      px(g, x - 16, y - 67, 32, 67, "rgba(30,18,6,0.55)");
      px(g, x - 18, y, 36, 3, "#8a5a20"); px(g, x - 18, y, 36, 1, "#f0c14e");
    } else {
      px(g, x - 1, y - 260, 2, 189, "#3a3f44");
      px(g, x - 3, y - 76, 6, 4, "#6e4a1a"); px(g, x - 2, y - 75, 4, 2, lit ? "#ffe27a" : "#4a2e10");
      px(g, x - 19, y - 72, 38, 5, "#8a5a20"); px(g, x - 18, y - 72, 36, 2, "#d9a441"); px(g, x - 18, y - 72, 36, 1, "#fff0c0");
      px(g, x - 18, y - 67, 2, 67, "#8a5a20"); px(g, x - 18, y - 67, 1, 67, "#d9a441");
      px(g, x + 16, y - 67, 2, 67, "#8a5a20"); px(g, x + 17, y - 67, 1, 67, "#d9a441");
      var w = Math.round(3 + 29 * gate);
      if (w > 0) {
        px(g, x - 16, y - 64, w, 1, "#d9a441"); px(g, x - 16, y - 34, w, 1, "#d9a441"); px(g, x - 16, y - 3, w, 1, "#d9a441");
        var st = Math.max(2, w / 7);
        for (var i = 0; i <= w; i += st) { px(g, x - 16 + i, y - 64, 1, 62, "#b8862e"); px(g, x - 16 + i, y - 64, 1, 1, "#fff0c0"); }
        if (gate > 0.8) for (var j = 0; j < 4; j++) { px(g, x - 14 + j * 8, y - 50 + (j % 2) * 2, 4, 1, "#d9a441"); px(g, x - 14 + j * 8, y - 19 + (j % 2) * 2, 4, 1, "#d9a441"); }
      }
    }
    g.restore();
  }
  function ding(a) { a.sfx("voice", { f: 1320, slide: 1, wave: "sine", vol: 0.05 }); }
  function liftUpd(s, a) {
    var T = a.T;
    if (a.out) { if (T >= 0.38 && once(s, "g")) a.sfx("gate"); if (T >= 0.56 && once(s, "d")) ding(a); if (T >= 0.62 && once(s, "w")) a.sfx("whoosh"); if (T < 0.32 && T > 0.26 && once(s, "th")) a.shake(1); }
    else { if (T >= 0.48 && once(s, "th")) { a.shake(1); a.sfx("walletLand"); } if (T >= 0.54 && once(s, "d")) ding(a); if (T >= 0.6 && once(s, "g")) a.sfx("gate"); }
  }
  function lift(up) {
    return {
      out: 1.3, in: 1.0,
      update: liftUpd,
      draw: function (g, s, a) {
        var T = a.T, F = a.F, R = a.R, x = Math.round(a.lad), cy, by, gate, al = 1, lit, ok;
        g.save(); a.clip(g);
        if (a.out) {
          var arr = up ? a.lerp(-4, F + 1, a.ei(seg(T, 0, 0.3))) : a.lerp(R + 76, F + 1, a.eo(seg(T, 0, 0.3)));
          cy = T < 0.3 ? arr : F + 1 - Math.round(Math.sin(seg(T, 0.3, 0.38) * Math.PI) * 2);
          var go = a.ei(seg(T, 0.62, 1.3));
          if (T >= 0.62) cy = up ? F + 1 - (F + 90) * go : F + 1 + (R + 80 - F) * go;
          by = T < 0.62 ? F + 1 : cy; gate = seg(T, 0.38, 0.52); lit = T >= 0.56;
          if (T < 0.62) shadow(g, x, F, 1);
        } else {
          var q = seg(T, 0, 0.48);
          cy = up ? a.lerp(R + 76, F + 1, a.eo(q)) : a.lerp(-6, F + 1, a.eo(q));
          if (T >= 0.48) cy = F + 1 - Math.round(Math.sin(seg(T, 0.48, 0.56) * Math.PI) * (up ? 2 : -2));
          by = cy; gate = 1 - seg(T, 0.6, 0.74); lit = T >= 0.54; al = 1 - seg(T, 0.76, 1.0);
          if (T >= 0.48) shadow(g, x, F, 1);
        }
        cage(g, x, cy, gate, al, lit, false);
        ok = a.body(g, x, Math.round(by), { dir: a.dir });
        cage(g, x, cy, gate, al, lit, true);
        g.restore(); return ok;
      }
    };
  }
  add("char-002", { up: lift(true), down: lift(false) });

  function snapPic(a) {
    var P = a.pics(), b = null, bd = 1e9;
    for (var i = 0; i < P.length; i++) { if (P[i].f === a.f) return P[i]; var dd = Math.abs(P[i].cx - a.x); if (dd < bd) { bd = dd; b = P[i]; } }
    return b;
  }
  add("char-006", { frame: {
    dur: 2.2,
    update: function (s, a) {
      var T = a.T;
      if (T >= 0.05 && once(s, "up")) a.sfx("hover");
      if (T >= 0.85 && once(s, "snap")) {
        a.sfx("voice", { f: 2400, slide: 0.35, wave: "square", vol: 0.04 }); a.sfx("click"); a.flash(0.2, "#ffffff");
        var d = fd(a), bx = Math.round(a.x) + d * 10, by = Math.round(a.y) - 47;
        for (var i = 0; i < 10; i++) { var an = TAU * i / 10, v = rnd(40, 90); a.fx({ x: bx, y: by, vx: Math.cos(an) * v, vy: Math.sin(an) * v, drag: 5, life: 0.3, c: "#fffbe0", sz: 2, sz2: 1, add: true }); }
      }
      if (T >= 1.05 && once(s, "ph")) a.sfx("voice", { f: 300, slide: 1.3, wave: "sawtooth", vol: 0.025 });
    },
    draw: function () { return false; },
    over: function (g, s, a) {
      var T = a.T, d = fd(a), x = Math.round(a.x), y = Math.round(a.y);
      var lift = Math.round(16 * (1 - a.eo(seg(T, 0, 0.35))) + 16 * a.ei(seg(T, 1.85, 2.2))), al = 1 - seg(T, 2.0, 2.2);
      var wob = T > 0.35 && T < 0.85 ? Math.round(Math.sin(T * 22) * 0.6) : 0;
      var cx = x + d * 5 - (d < 0 ? 11 : 0), cy = y - 44 + lift + wob;
      var b = snapPic(a), fk = T >= 0.85 ? 1 - seg(T, 0.85, 1.25) : 0;
      if (b && fk > 0) { g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.8 * fk; px(g, b.x, b.y, b.w, b.h, "#ffffff"); g.restore(); }
      g.save(); g.globalAlpha = al;
      if (T >= 1.0) {
        var ph = a.eo(seg(T, 1.0, 1.4)), sh = T > 1.4 && T < 1.85 ? Math.round(Math.sin(T * 40)) : 0, ox = cx + 2 + sh, oy = cy + 7;
        var hgt = Math.round(9 * ph); if (hgt > 0) {
          px(g, ox, oy, 7, hgt, "#f4efe2");
          if (hgt > 2) { px(g, ox + 1, oy + 1, 5, Math.min(5, hgt - 2), "#2a2a2a"); g.globalAlpha = al * seg(T, 1.3, 1.8); px(g, ox + 1, oy + 1, 5, Math.min(5, hgt - 2), "#8fb0d0"); if (hgt > 4) px(g, ox + 2, oy + 3, 3, 2, "#d9a441"); g.globalAlpha = al; }
        }
      }
      px(g, cx, cy, 11, 7, "#1d1d22"); px(g, cx, cy, 11, 1, "#6a6f78"); px(g, cx + 1, cy + 1, 9, 1, "#3a3f44");
      px(g, cx + (d > 0 ? 7 : 1), cy - 2, 3, 2, "#c8ccd2"); px(g, cx + (d > 0 ? 8 : 2), cy - 2, 1, 1, "#ffffff");
      px(g, cx + 3, cy + 2, 5, 4, "#5a646d"); px(g, cx + 4, cy + 3, 3, 2, "#0c1018"); px(g, cx + 4, cy + 3, 1, 1, "#9ad0ff");
      px(g, cx + (d > 0 ? 1 : 8), cy - 1, 2, 1, "#c03030");
      g.restore();
      if (fk > 0) {
        var bx = cx + (d > 0 ? 8 : 2), by = cy - 2, L = Math.round(4 + 10 * fk);
        g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = fk;
        px(g, bx - L, by, L * 2 + 1, 1, "#fffbe0"); px(g, bx, by - L, 1, L * 2 + 1, "#fffbe0");
        for (var i = 1; i < L * 0.7; i++) { px(g, bx + i, by + i, 1, 1, "#fffbe0"); px(g, bx - i, by + i, 1, 1, "#fffbe0"); px(g, bx + i, by - i, 1, 1, "#fffbe0"); px(g, bx - i, by - i, 1, 1, "#fffbe0"); }
        disc(g, bx, by, Math.round(2 + 3 * fk), "#ffffff");
        g.restore();
      }
    }
  } });

  add("char-007", { walk: {
    update: function (s, a, dt) {
      if (s.tr !== a.tree) { s.tr = a.tree; s.lv = 0; }
      var on = a.moving && !a.busy;
      s.lv = (s.lv || 0) + ((on ? 1 : 0) - (s.lv || 0)) * Math.min(1, dt * 5);
      if (!on) { s.ph = 0; return; }
      var p0 = s.ph || 0; s.ph = p0 + dt * 2.6; s.wt = (s.wt || 0) + dt * 0.75;
      if (Math.floor(s.ph) > Math.floor(p0)) { var d = fd(a), side = Math.floor(s.ph) % 2 ? 1 : -1; s.side = side;
        for (var i = 0; i < 3; i++) a.fx({ x: a.x + d * (6 + side * 2) + rnd(-2, 2), y: a.F, vx: rnd(-8, 8), vy: -rnd(8, 18), g: 20, drag: 3, life: 0.35, c: "#e9e2c4", sz: 1, a: 0.6 }); }
    },
    under: function (g, s, a) {
      var k = s.lv || 0; if (k < 0.02 || a.busy) return;
      var x = Math.round(a.x), cy = Math.round(a.y) - 30, x0 = Math.round(a.cam) - 2, x1 = Math.round(a.cam + a.VW) + 2, rx = 44, ry = 46;
      g.globalAlpha = 0.32 * k; g.fillStyle = "#05030a";
      for (var y = 0; y < a.R; y += 2) {
        var dy = (y - cy) / ry, hw = dy * dy < 1 ? Math.round(rx * Math.sqrt(1 - dy * dy)) : 0;
        if (!hw) g.fillRect(x0, y, x1 - x0, 2); else { g.fillRect(x0, y, Math.max(0, x - hw - x0), 2); g.fillRect(x + hw, y, Math.max(0, x1 - x - hw), 2); }
      }
      var b = Math.abs(Math.sin((s.ph || 0) * Math.PI)), w = Math.round(14 + 12 * (1 - b));
      g.globalAlpha = 0.4 * k; px(g, x - (w >> 1), a.F + 1, w, 2, "#000000");
      g.globalAlpha = 1;
    },
    body: function (s, a) {
      var k = s.lv || 0; if (k < 0.02 || a.busy) return null;
      var q = (s.ph || 0) % 1, b = Math.sin(q * Math.PI), c = Math.cos(q * TAU), d = fd(a);
      var sy = 1 + k * (0.07 * b - 0.06 * Math.max(0, c));
      return { dy: -Math.round(k * b * 5), sy: sy, sx: 2 - sy, rot: d * 0.09 * k, t: a.moving ? s.wt || 0 : null };
    },
    over: function (g, s, a) {
      var k = s.lv || 0; if (k < 0.3 || a.busy || !s.ph) return;
      var d = fd(a), q = s.ph % 1, b = Math.sin(q * Math.PI), x = Math.round(a.x) + d * (5 + (s.side || 1) * 2), y = a.F - 2 - Math.round(b * 5);
      g.globalAlpha = k * b * 0.9;
      px(g, x - d * 3, y - 2, 1, 2, "#e9e2c4"); px(g, x - d * 1, y - 4, 1, 2, "#e9e2c4"); px(g, x + d * 1, y - 5, 1, 2, "#e9e2c4");
      g.globalAlpha = 1;
    }
  } });

  function board(g, x, y, ph, d) {
    x = Math.round(x); y = Math.round(y);
    px(g, x - 13, y, 26, 3, "#d8392b"); px(g, x - 13, y, 26, 1, "#26262b"); px(g, x - 15, y - 1, 3, 2, "#d8392b"); px(g, x + 12, y - 1, 3, 2, "#d8392b"); px(g, x - 11, y + 2, 22, 1, "#f2c94c");
    px(g, x - 9, y + 2, 2, 1, "#8a8f96"); px(g, x + 7, y + 2, 2, 1, "#8a8f96");
    var c = ph % 2 < 1 ? "#f0c14e" : "#c8962e"; px(g, x - 10, y + 3, 3, 2, c); px(g, x + 7, y + 3, 3, 2, c); px(g, x - 9, y + 3, 1, 1, "#fff0c0"); px(g, x + 8, y + 3, 1, 1, "#fff0c0");
  }
  function boardFlip(g, x, y, q) {
    var c = Math.cos(q * TAU), hh = Math.max(1, Math.round(Math.abs(c) * 4)), up = c > 0;
    x = Math.round(x); y = Math.round(y);
    px(g, x - 12, y - (hh >> 1), 24, hh, up ? "#222226" : "#c03030");
    px(g, x - 12, y - (hh >> 1), 24, 1, up ? "#4a4a50" : "#ff6a5a");
    if (!up && hh > 2) { px(g, x - 9, y - (hh >> 1) - 1, 3, 1, "#f0c14e"); px(g, x + 6, y - (hh >> 1) - 1, 3, 1, "#f0c14e"); }
  }
  add("char-008", { walk: {
    update: function (s, a, dt) {
      if (s.tr !== a.tree || a.busy) { s.tr = a.tree; s.kf = -1; s.was = 0; s.tuck = 1; return; }
      if (a.moving) { s.was = 1; s.kf = -1; s.tuck = 0; s.ph = (s.ph || 0) + dt * 14;
        if (Math.random() < dt * 6) a.fx({ x: a.x - fd(a) * 12, y: a.F + 3, vx: -fd(a) * rnd(20, 40), vy: -rnd(4, 10), g: 20, drag: 3, life: 0.3, c: "#c8a670", sz: 1, sz2: 2, a: 0.5 });
        return; }
      if (s.was) { s.was = 0; s.kf = 0; }
      if (s.kf >= 0) { s.kf += dt;
        if (s.kf >= 0.42) { s.kf = -1; s.tuck = 1; dust(a, a.x + fd(a) * 12, a.F, 6); for (var i = 0; i < 4; i++) a.fx({ x: a.x + fd(a) * 12 + rnd(-6, 6), y: a.F - rnd(4, 14), vx: rnd(-20, 20), vy: -rnd(10, 30), drag: 3, life: 0.35, c: "#fff3c4", sz: 2, sz2: 1, add: true }); }
      }
    },
    body: function (s, a) { return a.moving && !a.busy ? { dy: -5, t: 0, rot: fd(a) * 0.05 } : null; },
    under: function (g, s, a) {
      if (a.busy) return;
      var x = Math.round(a.x), d = fd(a);
      if (a.moving) { board(g, x, a.F - 4, s.ph || 0, d); g.globalAlpha = 0.5; px(g, x - d * 16, a.F - 3, 5, 1, "#e9e2c4"); px(g, x - d * 18, a.F, 4, 1, "#e9e2c4"); g.globalAlpha = 1; return; }
      if (s.tuck && !(s.kf >= 0)) {
        var bx = x + d * 13;
        px(g, bx - 1, a.F - 25, 3, 26, "#3a2414"); px(g, bx, a.F - 24, 1, 24, "#222226"); px(g, bx - 1, a.F - 26, 2, 1, "#3a2414");
        px(g, bx + 2, a.F - 21, 2, 3, "#f0c14e"); px(g, bx + 2, a.F - 5, 2, 3, "#f0c14e");
      }
    },
    over: function (g, s, a) {
      if (a.busy || a.moving || !(s.kf >= 0)) return;
      var q = cl(s.kf / 0.42), x = Math.round(a.x) + fd(a) * 12, y = a.F - 1 - Math.round(Math.sin(q * Math.PI) * 16);
      boardFlip(g, x, y, q);
    }
  } });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.hallMoves) return;
  var add = BH.hallMoves.add;
  function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function seg(T, a, b) { return cl((T - a) / (b - a)); }
  function ei(q) { return q * q; }
  function eo(q) { return 1 - (1 - q) * (1 - q); }
  function eio(q) { return q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function sdOf(a) { return a.dir === "left" ? -1 : 1; }
  function shadow(g, x, F, k) { var w = Math.round(24 * k); if (w < 4) return; P(g, Math.round(x) - w / 2, F + 1, w, 3, "rgba(0,0,0,0.35)"); }
  function dust(a, x, y, n, c) { for (var i = 0; i < n; i++) { var an = Math.PI * (i + 0.5) / n, v = rnd(30, 80); a.fx({ x: x + Math.cos(an) * 6, y: y, vx: Math.cos(an) * v, vy: -Math.sin(an) * v * 0.4, g: 40, drag: 3, life: rnd(0.35, 0.55), c: c || "#c8a670", sz: 2, sz2: 4, a: 0.7 }); } }
  function line(g, x0, y0, x1, y1, w, c) {
    var n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); g.fillStyle = c;
    for (var i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n) - (w >> 1), Math.round(y0 + (y1 - y0) * i / n) - (w >> 1), w, w);
  }
  function rbody(g, a, x, y, r, o) { g.save(); g.translate(Math.round(x), Math.round(y) - 30); g.rotate(r); var ok = a.body(g, 0, 30, o || {}); g.restore(); return ok; }
  function box(a) { var L = a.pics(), b = null, bd = 1e9; for (var i = 0; i < L.length; i++) { if (a.f && L[i].f === a.f) return L[i]; var d = Math.abs(L[i].cx - a.x); if (d < bd) { bd = d; b = L[i]; } } return b; }

  var VG = "#39ff7a", VL = "#c8ffd8";
  function vrSpan(T, h) {
    if (T < 0.2) return null;
    if (T < 1.45) return [0, Math.round(h * eio(seg(T, 0.2, 0.9)))];
    return [Math.round(h * eio(seg(T, 1.45, 2.05))), h];
  }
  add("char-029", { frame: {
    dur: 2.2,
    update: function (s, a) {
      var T = a.T, b = box(a); if (!b) return;
      if (T > 0.18 && once(s, "on")) a.sfx("voice", { f: 600, slide: 2, wave: "square", vol: 0.04 });
      var n = Math.floor(seg(T, 0.2, 0.9) * b.h / 8) + Math.floor(seg(T, 1.45, 2.05) * b.h / 8);
      if (n > (s.n || 0)) { s.n = n; if (n % 2 === 0) a.sfx("voice", { f: 1100 + n * 40, slide: 1, wave: "square", vol: 0.025 }); }
      if (T > 0.95 && once(s, "lock")) a.sfx("hover");
      if (T > 2.05 && once(s, "off")) a.sfx("voice", { f: 1500, slide: 0.4, wave: "square", vol: 0.04 });
    },
    draw: function (g, s, a) {
      var b = box(a); if (!b) return false;
      var T = a.T, x0 = Math.round(b.x), y0 = Math.round(b.y), w = Math.round(b.w), h = Math.round(b.h), sp = vrSpan(T, h), i;
      if (!sp || sp[1] <= sp[0]) return false;
      var top = y0 + sp[0], bot = y0 + sp[1];
      g.save(); g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.1; P(g, x0, top, w, bot - top, VG);
      g.globalAlpha = 0.45 + 0.12 * Math.sin(a.now * 31);
      for (i = 0; i <= w; i += 8) P(g, x0 + Math.min(i, w - 1), top, 1, bot - top, VG);
      for (i = 0; i <= h; i += 8) { var gy = y0 + Math.min(i, h - 1); if (gy >= top && gy < bot) P(g, x0, gy, w, 1, VG); }
      g.globalAlpha = 0.9;
      [[x0 - 2, y0 - 2, 1, 1], [x0 + w + 1, y0 - 2, -1, 1], [x0 - 2, y0 + h + 1, 1, -1], [x0 + w + 1, y0 + h + 1, -1, -1]].forEach(function (c) {
        if (c[1] < top - 3 || c[1] > bot + 2) return;
        P(g, c[2] > 0 ? c[0] : c[0] - 4, c[1], 5, 1, VL); P(g, c[0], c[3] > 0 ? c[1] : c[1] - 4, 1, 5, VL);
      });
      for (i = 0; i < 5; i++) { g.globalAlpha = rnd(0.4, 0.9); P(g, x0 + Math.floor(rnd(0, w)), top + Math.floor(rnd(0, bot - top)), 1, 1, VL); }
      if (T < 0.9 || T > 1.45) { var sy = T < 0.9 ? bot - 1 : top; g.globalAlpha = 0.35; P(g, x0 - 3, sy - 1, w + 6, 3, VG); g.globalAlpha = 0.95; P(g, x0 - 3, sy, w + 6, 1, VL); }
      g.restore();
      return false;
    },
    over: function (g, s, a) {
      var b = box(a), T = a.T; if (!b || T < 0.2 || T > 2.05) return;
      var ex = Math.round(a.x) + sdOf(a) * 7, ey = a.F - 43, k = (T < 0.9 || T > 1.45) ? 1 : 0.5;
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.5 + 0.3 * Math.sin(a.now * 20); P(g, ex - 1, ey, 3, 1, VL);
      g.globalAlpha = 0.18 * k; line(g, ex, ey, Math.round(b.x), Math.round(b.y + b.h), 1, VG); line(g, ex, ey, Math.round(b.x + b.w), Math.round(b.y + b.h), 1, VG);
    }
  } });

  var TAU = 6.2832;
  add("char-032", { walk: {
    update: function (s, a, dt) {
      if (a.busy) { s.r = 0; s.on = 0; return; }
      var b = sdOf(a), r = s.r || 0, on = a.moving ? 1 : 0;
      s.on = (s.on || 0) + (on - (s.on || 0)) * Math.min(1, dt * (on ? 6 : 10));
      if (on) { r += b * dt * 13; if (r > TAU) r -= TAU; if (r < -TAU) r += TAU; }
      else if (r) { var tg = r > 3.1416 ? TAU : r < -3.1416 ? -TAU : 0, nr = r + (tg - r) * Math.min(1, dt * 9) + (tg > r ? 1 : -1) * dt * 2; r = Math.abs(tg - nr) < 0.06 || (tg - r) * (tg - nr) < 0 ? 0 : nr; }
      s.r = r;
    },
    body: function (s, a) {
      var r = s.r || 0; if (a.busy || !r) return null;
      return { dx: Math.round(-30 * Math.sin(r)), dy: Math.round(-30 + 30 * Math.cos(r)) - Math.round(3 * (s.on || 0)), rot: r };
    },
    under: function (g, s, a) {
      var r = s.r || 0; if (a.busy || !(s.on > 0.05) || !r) return;
      var b = sdOf(a), x = Math.round(a.x), y = Math.round(a.y) - Math.round(3 * s.on), cy = y - 30, i;
      g.globalAlpha = 0.3 * s.on;
      for (i = 0; i < 14; i++) { var an = r - b * 1.5708 - b * (0.5 + i * 0.16); P(g, x + Math.round(Math.sin(an) * 30), cy - Math.round(Math.cos(an) * 30), 2, 2, i % 3 ? "#ff8a1e" : "#ffd27a"); }
      g.globalAlpha = 1;
      rbody(g, a, x - b * 12, y, r - b * 1.2, { alpha: s.on * 0.18, state: "idle" });
    }
  } });

  function wjPts(a, sd) { var x = Math.round(a.lad), F = a.F; return [[x, F + 1], [x + sd * 26, Math.round(F * 0.64)], [x - sd * 2, Math.round(F * 0.38)], [x + sd * 22, Math.round(F * 0.16) + 4], [x, -8]]; }
  var WJ = [0.24, 0.48, 0.72, 0.96, 1.2];
  add("char-034", { up: {
    out: 1.2, in: 0.85,
    start: function (s, a) { s.sd = sdOf(a); },
    update: function (s, a) {
      var T = a.T, sd = s.sd || 1;
      if (a.out) {
        var Q = wjPts(a, sd);
        for (var i = 0; i < 4; i++) if (T >= WJ[i] && once(s, "k" + i)) {
          var px = Q[i][0], py = Q[i][1], w = i % 2 ? sd : i ? -sd : 0;
          if (i) { for (var j = 0; j < 6; j++) a.fx({ x: px + w * 10, y: py - rnd(10, 30), vx: w * rnd(30, 70), vy: rnd(-20, 20), drag: 4, life: 0.35, c: "#e8e0d0", sz: 2, sz2: 1, a: 0.8 }); a.shake(1); }
          else dust(a, px, a.F, 8);
          a.sfx("step"); a.sfx("voice", { f: 420 + i * 120, slide: 1.4, wave: "square", vol: 0.035 });
        }
        if (T >= WJ[3] && once(s, "wh")) a.sfx("whoosh");
      } else {
        if (once(s, "pop")) a.sfx("voice", { f: 900, slide: 1.3, wave: "square", vol: 0.035 });
        if (T >= 0.55 && once(s, "land")) { a.sfx("sprint", { vol: 1.2 }); dust(a, a.lad, a.F, 10); }
      }
    },
    draw: function (g, s, a) {
      var T = a.T, F = a.F, sd = s.sd || 1, x, y, ok;
      g.save(); a.clip(g);
      if (a.out) {
        var Q = wjPts(a, sd);
        if (T < WJ[0]) {
          var c = Math.sin(seg(T, 0.12, WJ[0]) * Math.PI) * 0.14; shadow(g, a.lad, F, 1);
          ok = a.body(g, Q[0][0], F + 1, { sx: 1 + c, sy: 1 - c, dir: sd > 0 ? "right" : "left" });
        } else {
          var i = Math.min(3, Math.floor((T - WJ[0]) / 0.24)), q = seg(T, WJ[i], WJ[i + 1]), A = Q[i], B = Q[i + 1];
          x = Math.round(A[0] + (B[0] - A[0]) * (i === 3 ? eo(q) : eio(q)));
          y = Math.round(A[1] + (B[1] - A[1]) * eo(q));
          var dir = B[0] > A[0] ? "right" : B[0] < A[0] ? "left" : a.dir, st = q < 0.18 ? 0.1 * Math.sin(q / 0.18 * Math.PI) : 0;
          shadow(g, x, F, cl(1 - (F + 1 - y) / 40));
          ok = a.body(g, x, y, { dir: dir, state: "walk", t: T * 2, rot: (B[0] - A[0]) * 0.006, sx: 1 - st, sy: 1 + st });
        }
      } else {
        x = Math.round(a.lad); var u = seg(T, 0, 0.55), top = F - 34;
        y = u < 0.5 ? Math.round(F + 70 + (top - F - 70) * eo(u * 2)) : Math.round(top + (F + 1 - top) * ei((u - 0.5) * 2));
        if (T < 0.55) { shadow(g, x, F, cl(1 - (F + 1 - y) / 40)); ok = rbody(g, a, x, y, sd * 6.2832 * eio(seg(T, 0.12, 0.5)), { dir: sd > 0 ? "right" : "left" }); }
        else { var sq = 0.25 * Math.sin(seg(T, 0.55, 0.85) * Math.PI); shadow(g, x, F, 1); ok = a.body(g, x, F + 1, { sx: 1 + sq, sy: 1 - sq, dir: sd > 0 ? "right" : "left" }); }
      }
      g.restore(); return ok;
    }
  } });

  add("char-035", { down: {
    out: 0.9, in: 1.25,
    start: function (s, a) { s.sd = sdOf(a); },
    update: function (s, a) {
      var T = a.T;
      if (a.out) {
        if (T > 0.25 && once(s, "hop")) { a.sfx("voice", { f: 520, slide: 1.5, wave: "square", vol: 0.04 }); dust(a, a.lad, a.F, 6); }
        if (T > 0.45 && once(s, "wh")) a.sfx("whoosh");
      } else {
        if (T > 0.05 && once(s, "wh")) a.sfx("whoosh");
        if (T >= 0.45 && once(s, "land")) { a.sfx("sprint", { vol: 1.4 }); a.shake(2); dust(a, Math.round(a.lad) - (s.sd || 1) * 24, a.F, 10); }
        if (T > 0.5 && T < 0.95 && Math.random() < 0.45) a.fx({ x: a.lad - (s.sd || 1) * 24 * (1 - seg(T, 0.5, 0.95)), y: a.F, vx: -(s.sd || 1) * rnd(20, 50), vy: rnd(-20, -5), drag: 3, life: 0.4, c: "#c8a670", sz: 2, sz2: 3, a: 0.6 });
        if (T >= 0.97 && once(s, "pose")) { a.sfx("click"); a.sfx("voice", { f: 880, slide: 1.2, wave: "square", vol: 0.04 }); }
      }
    },
    draw: function (g, s, a) {
      var T = a.T, F = a.F, R = a.R, sd = s.sd || 1, dir = sd > 0 ? "right" : "left", x = Math.round(a.lad), y, ok;
      g.save(); a.clip(g);
      if (a.out) {
        if (T < 0.25) { var c = 0.14 * Math.sin(seg(T, 0.1, 0.25) * Math.PI); shadow(g, x, F, 1); ok = a.body(g, x, F + 1, { sx: 1 + c, sy: 1 - c, dir: dir }); }
        else if (T < 0.45) { var h = seg(T, 0.25, 0.45); y = Math.round(F + 1 - 14 * eo(h)); shadow(g, x, F, 0.7); ok = rbody(g, a, x, y, sd * 3.1416 * ei(h) * 0.5, { dir: dir }); }
        else { var d = seg(T, 0.45, 0.9); y = Math.round(F - 13 + (R + 80 - F) * ei(d)); ok = rbody(g, a, x, y, sd * (1.5708 + 1.5708 * eo(d)), { dir: dir }); }
      } else {
        var lx = x - sd * 24;
        if (T < 0.45) {
          var f = T / 0.45; y = Math.round(-6 + (F + 7) * ei(f)); var fx = Math.round(x + (lx - x) * eio(seg(T, 0.12, 0.45)));
          if (T > 0.3) shadow(g, fx, F, seg(T, 0.3, 0.45));
          ok = rbody(g, a, fx, y, sd * 6.2832 * eo(f), { dir: dir, sx: 0.92, sy: 0.92 });
        } else if (T < 0.95) {
          var r = seg(T, 0.5, 0.95), sq = T < 0.5 ? seg(T, 0.45, 0.5) : 1 - seg(T, 0.85, 0.95), rx = Math.round(lx + (x - lx) * eio(r));
          shadow(g, rx, F, 1);
          var hc = Math.round(20 * sq + 10 * (1 - sq));
          g.save(); g.translate(rx, F + 1 - hc); g.rotate(sd * 6.2832 * eio(r)); ok = a.body(g, 0, hc, { dir: dir, sx: 1 - 0.15 * sq, sy: 1 - 0.35 * sq }); g.restore();
        } else { var p = seg(T, 0.95, 1.25), st = 0.1 * Math.sin(p * Math.PI); shadow(g, x, F, 1); ok = a.body(g, x, F + 1, { dir: dir, sx: 1 - st, sy: 1 + st }); }
      }
      g.restore(); return ok;
    }
  } });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.hallMoves) return;
  var add = BH.hallMoves.add;
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function shade(g, a) { px(g, a.x - 12, a.F + 1, 24, 3, "rgba(0,0,0,0.35)"); px(g, a.x - 9, a.F + 4, 18, 1, "rgba(0,0,0,0.35)"); }
  function pic(a) {
    var P = a.pics(), b = null, bd = 1e9;
    for (var i = 0; i < P.length; i++) { if (P[i].f === a.f) return P[i]; var d = Math.abs(P[i].cx - a.x); if (d < bd) { bd = d; b = P[i]; } }
    return b;
  }

  var CP = null, WL = null;
  function grab(g, x, y, w, h, c) {
    var m = g.getTransform ? g.getTransform() : null; if (!m || !m.a || !g.canvas || !g.canvas.width) return null;
    var cw = Math.max(1, Math.round(w * m.a)), ch = Math.max(1, Math.round(h * m.d));
    if (!c) { c = document.createElement("canvas"); if (!c || !c.getContext) return null; }
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    var x2 = c.getContext("2d"); if (!x2) return null; x2.imageSmoothingEnabled = false; x2.clearRect(0, 0, cw, ch);
    try { x2.drawImage(g.canvas, Math.round(x * m.a + m.e), Math.round(y * m.d + m.f), cw, ch, 0, 0, cw, ch); } catch (e) { return null; }
    return c;
  }
  add("char-041", { frame: {
    dur: 2.4,
    start: function (s, a) { s.b = pic(a); a.sfx("stash"); },
    update: function (s, a) {
      if (!s.c1 && a.T > 1.6) { s.c1 = 1; a.sfx("whoosh"); }
      if (!s.c2 && a.T > 2.15) { s.c2 = 1; a.sfx("click"); a.shake(1); }
    },
    draw: function (g, s, a) {
      var b = s.b || pic(a); if (!b) return false;
      var f = a.f || {}, lift = a.tree ? 0 : Math.round(3 * (f.glow || 0) + 2 * (f.pop || 0));
      var rx = Math.round(b.x) - 2, ry = Math.round(b.y) - lift - 2, rw = Math.round(b.w) + 6, rh = Math.round(b.h) + 7;
      var T = a.T, hy = Math.round(a.F - 57 - rh), hx = Math.round(a.x - rw / 2), q, ox, oy;
      if (T < 0.3) { q = a.eo(T / 0.3); ox = rx; oy = ry - Math.round(4 * q); }
      else if (T < 0.75) { q = a.eio((T - 0.3) / 0.45); ox = Math.round(a.lerp(rx, hx, q)); oy = Math.round(a.lerp(ry - 4, hy, q)); }
      else if (T < 1.6) { ox = hx + Math.round(Math.sin((T - 0.75) * 11) * 1); oy = hy + (Math.floor(T * 6) % 2); }
      else if (T < 2.05) { q = a.eio((T - 1.6) / 0.45); ox = Math.round(a.lerp(hx, rx, q)); oy = Math.round(a.lerp(hy, ry - 4, q)); }
      else { q = a.ei(cl((T - 2.05) / 0.15)); ox = rx; oy = ry - Math.round(4 * (1 - q)); }
      var home = ox === rx && oy === ry;
      if (!home) {
        CP = grab(g, rx, ry, rw, rh, CP);
        WL = CP ? grab(g, rx - 5, ry - 14, 3, rh + 14, WL) : null;
        if (WL) g.drawImage(WL, rx - 1, ry - 13, rw + 2, rh + 13);
        else px(g, rx, ry - 13, rw, rh + 13, "#2a1c12");
        px(g, rx + 2, ry + 2, rw - 6, rh - 7, "rgba(10,6,3,0.42)");
        px(g, rx + 2, ry + 2, rw - 6, 1, "rgba(0,0,0,0.3)");
        if (CP) g.drawImage(CP, ox, oy, rw, rh);
        else { g.strokeStyle = "#eaba49"; g.lineWidth = 1; g.strokeRect(ox + 2.5, oy + 2.5, rw - 6, rh - 7); px(g, ox + 4, oy + 4, rw - 10, rh - 11, "rgba(10,6,3,0.5)"); }
      }
      var d = a.dir, o = d === "left" ? "right" : "left";
      if (T > 0.8 && T < 1.55) d = T < 1.05 ? o : T < 1.3 ? a.dir : o;
      shade(g, a); a.body(g, a.x, a.F + 1, { dir: d, state: "idle" });
      return true;
    }
  } });

  var NC = ["#ff7ac8", "#7ad8ff", "#ffe36a", "#9cff8a"];
  function note(g, x, y, c, two) {
    px(g, x, y + 5, 3, 2, c); px(g, x + 2, y, 1, 6, c); px(g, x + 3, y, 2, 1, c); px(g, x + 4, y + 1, 1, 1, c);
    if (two) { px(g, x + 5, y + 6, 3, 2, c); px(g, x + 7, y + 1, 1, 6, c); px(g, x + 3, y, 5, 1, c); }
  }
  add("char-045", { walk: {
    update: function (s, a, dt) {
      var N = s.n = s.n || [];
      if (s.tr !== a.tree) { N.length = 0; s.tr = a.tree; }
      for (var i = N.length - 1; i >= 0; i--) { var q = N[i]; q.t += dt; if (q.t >= q.l) N.splice(i, 1); }
      if (!a.moving || a.busy) { s.c = 0.25; return; }
      s.c = (s.c == null ? 0.25 : s.c) + dt;
      if (s.c >= 0.32 && N.length < 16) {
        s.c = 0; s.i = (s.i || 0) + 1;
        N.push({ x: a.x + (s.i % 2 ? -7 : 5), y: a.y - 58, w: s.i % 2 ? -1 : 1, t: 0, l: 1.3, c: NC[s.i % NC.length], two: s.i % 3 === 0 });
      }
    },
    over: function (g, s, a) {
      var N = s.n; if (!N || !N.length) return;
      for (var i = 0; i < N.length; i++) {
        var q = N[i], u = q.t / q.l;
        g.globalAlpha = Math.ceil((1 - u) * 4) / 4;
        note(g, q.x + q.w * u * 9 + Math.sin(q.t * 7) * 2, q.y - u * 30 - Math.abs(Math.sin(q.t * 9)) * 2, q.c, q.two);
      }
    }
  } });
})();
