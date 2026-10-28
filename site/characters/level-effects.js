(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  var FX = {}, st = { win: null, spawn: null, lvl: null, egg: {}, id: null, p: [], last: null };

  function worn() { try { return BH.characters && BH.characters.worn(window.save); } catch (e) { return null; } }
  function cur() { var id = worn(); if (id !== st.id) { st.id = id; st.egg = {}; st.spawn = null; st.p.length = 0; } return id && FX[id] || null; }
  function playing() { var g = window.game; return !!(g && g.screen === "play"); }

  function api(slot) {
    var pl = window.player || {}, x = pl.x || 0, y = (pl.y || 0) + 10, top = typeof pl.topY === "number" ? pl.topY : y - 46, T = window.T || 32;
    return {
      x: x, y: y, top: top, h: y - top, T: T, dir: pl.dir || "down", anim: pl.anim || "idle", moving: pl.anim === "walk",
      now: window.simTime || 0, t: slot ? slot.t : 0, p: slot && slot.m.dur ? Math.min(1, slot.t / slot.m.dur) : 0,
      phase: window.game && window.game.phase, player: pl, hunters: window.hunters || [], id: st.id,
      tile: function (tx, ty) { var g = window.grid; return g && g[ty] ? g[ty][tx] : null; },
      tileAt: function (wx, wy) { var g = window.grid; var tx = Math.floor(wx / T), ty = Math.floor(wy / T); return g && g[ty] ? g[ty][tx] : null; },
      rect: function (g, rx, ry, w, hh, c) { g.fillStyle = c; g.fillRect(Math.round(rx), Math.round(ry), Math.max(1, Math.round(w)), Math.max(1, Math.round(hh))); },
      body: function (g, bx, by, o) {
        o = o || {}; var look = { char: st.id, fur: "fur-classic", hat: "hat-none" };
        g.save(); g.translate(Math.round(bx), Math.round(by)); if (o.rot) g.rotate(o.rot); g.scale(o.sx || 1, o.sy || 1);
        var c0 = window.ctx; window.ctx = g;
        try { if (typeof window.drawBitfoot === "function") window.drawBitfoot(0, 0, o.dir || pl.dir || "down", o.anim || "idle", o.t != null ? o.t : 0, o.alpha != null ? o.alpha : 1, look); } catch (e) {}
        window.ctx = c0; g.restore();
      },
      fx: function (q) { if (st.p.length < 300) { q.t = 0; st.p.push(q); } },
      sfx: function (n, o) { try { if (typeof window.sfx === "function") window.sfx(n, o); } catch (e) {} },
      lerp: function (a, b, q) { return a + (b - a) * q; }, clamp: function (q, a, b) { return Math.max(a, Math.min(b, q)); },
      eo: function (q) { return 1 - (1 - q) * (1 - q); }, ei: function (q) { return q * q; }, eio: function (q) { return q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q); },
      rnd: function (a, b) { return a + Math.random() * (b - a); }
    };
  }
  function step(slot, M, dt, key) {
    if (!slot) return null;
    if (slot.m !== M[key]) return null;
    slot.t += dt;
    if (slot.m.update) try { slot.m.update(slot.s, api(slot), dt); } catch (e) {}
    return slot.t >= slot.m.dur ? null : slot;
  }

  if (typeof window.drawPlayer === "function") {
    var drawPlayer0 = window.drawPlayer;
    window.drawPlayer = function () {
      var M = playing() ? cur() : null;
      if (!M) { st.spawn = null; return drawPlayer0.apply(this, arguments); }
      var now = window.simTime || 0, dt = st.last == null ? 0 : Math.max(0, Math.min(0.1, now - st.last)); st.last = now;
      var g = window.ctx, ph = window.game.phase;
      if (window.levelStart !== st.lvl && now - window.levelStart < 0.25) { st.lvl = window.levelStart; st.spawn = null; st.pend = !!M.spawn; }
      if (st.pend && ph === "play") { st.pend = false; st.spawn = { m: M.spawn, t: 0, s: {} }; if (M.spawn.start) try { M.spawn.start(st.spawn.s, api(st.spawn)); } catch (e) {} }
      st.spawn = step(st.spawn, M, dt, "spawn");
      if (M.egg && M.egg.update) try { M.egg.update(st.egg, api(null), dt); } catch (e) {}
      st.p = st.p.filter(function (q) { q.t += dt; q.vy = (q.vy || 0) + (q.g || 0) * dt; q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt; return q.t < q.life; });
      var win = ph === "escaped" && st.win && st.win.m === M.win ? st.win : null;
      var layers = [[M.egg, st.egg, null], [st.spawn && st.spawn.m, st.spawn && st.spawn.s, st.spawn], [win && win.m, win && win.s, win]];
      var b = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, alpha: st.pend ? 0 : 1 };
      layers.forEach(function (L) {
        if (!L[0]) return; var A = api(L[2]);
        if (L[0].under) { g.save(); try { L[0].under(g, L[1], A); } catch (e) {} g.restore(); }
        if (L[0].body) { var o = null; try { o = L[0].body(L[1], A); } catch (e) {} if (o) { b.dx += o.dx || 0; b.dy += o.dy || 0; b.sx *= o.sx != null ? o.sx : 1; b.sy *= o.sy != null ? o.sy : 1; b.rot += o.rot || 0; if (o.alpha != null) b.alpha = Math.min(b.alpha, o.alpha); } }
      });
      var pl = window.player || {}, fx0 = pl.x || 0, fy0 = (pl.y || 0) + 10, r;
      g.save(); g.globalAlpha *= b.alpha;
      g.translate(fx0 + b.dx, fy0 + b.dy); if (b.rot) g.rotate(b.rot); g.scale(b.sx, b.sy); g.translate(-fx0, -fy0);
      var db0 = window.drawBitfoot;
      if (b.alpha < 1 && typeof db0 === "function") window.drawBitfoot = function (x, y, d, an, t, al, lk) { return db0.call(this, x, y, d, an, t, (al == null ? 1 : al) * b.alpha, lk); };
      try { r = drawPlayer0.apply(this, arguments); } finally { window.drawBitfoot = db0; g.restore(); }
      if (st.p.length) { g.save(); st.p.forEach(function (q) { var k = q.t / q.life; g.globalAlpha = (q.a != null ? q.a : 1) * (q.fade === false ? 1 : 1 - k); if (q.add) g.globalCompositeOperation = "lighter"; g.fillStyle = q.c; var sz = q.sz2 != null ? q.sz + (q.sz2 - q.sz) * k : q.sz || 2; g.fillRect(Math.round(q.x - sz / 2), Math.round(q.y - sz / 2), Math.ceil(sz), Math.ceil(sz)); g.globalCompositeOperation = "source-over"; }); g.restore(); }
      layers.forEach(function (L) { if (L[0] && L[0].over) { g.save(); try { L[0].over(g, L[1], api(L[2])); } catch (e) {} g.restore(); } });
      return r;
    };
  }

  if (typeof window.drawCelebration === "function") {
    var drawCelebration0 = window.drawCelebration;
    window.drawCelebration = function () {
      var G = window.game, M = playing() ? cur() : null;
      if (!M || !M.win || !G || G.phase !== "escaped" || G.escapedAt == null) { if (G && G.phase !== "escaped") st.win = null; return drawCelebration0.apply(this, arguments); }
      if (G.celeDone) return;
      if (!st.win || st.win.at !== G.escapedAt) { st.win = { m: M.win, t: 0, s: {}, at: G.escapedAt }; if (M.win.start) try { M.win.start(st.win.s, api(st.win)); } catch (e) {} }
      st.win.t = Math.max(0, (window.simTime || 0) - G.escapedAt);
      if (M.win.update) try { M.win.update(st.win.s, api(st.win), 0); } catch (e) {}
      G.celeFrames = (G.celeFrames || 0) + 1;
      if (st.win.t >= M.win.dur) G.celeDone = true;
    };
  }

  function holdCards() { ["showComplete", "showFinale"].forEach(function (k) {
    if (typeof window[k] !== "function" || window[k].fxHold) return;
    var f0 = window[k];
    window[k] = function () {
      var G = window.game, M = playing() ? cur() : null, self = this, args = arguments;
      var left = M && M.win && G && G.phase === "escaped" && G.escapedAt != null ? M.win.dur - ((window.simTime || 0) - G.escapedAt) : 0;
      if (left > 0.05) { setTimeout(function () { if (window.game && window.game.screen === "play" && window.game.phase === "escaped") window[k].apply(self, args); }, Math.ceil(left * 1000)); return; }
      return f0.apply(this, arguments);
    };
    window[k].fxHold = true;
  }); }
  holdCards(); window.addEventListener("load", holdCards);

  BH.levelFx = { add: function (id, fx) { FX[id] = fx; }, get: function (id) { return FX[id] || null; }, list: function () { return Object.keys(FX); } };
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.levelFx) return;
  var add = BH.levelFx.add;

  function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function seg(t, a, b) { return cl((t - a) / (b - a)); }
  function eo(q) { return 1 - (1 - q) * (1 - q); }
  function eio(q) { return q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(l) { return l[Math.floor(Math.random() * l.length)]; }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function bump(t, at, w) { return Math.max(0, 1 - Math.abs(t - at) / w); }
  function fc(a) { return a.dir === "left" ? -1 : 1; }
  var TOP = { "char-005": 6, "char-006": 9, "char-007": 10, "char-008": 10 };
  function K(a) { return a.h / (61 - (TOP[a.id] || 12)); }
  function sp(a, sx, sy) { var k = K(a); return { x: Math.round(a.x + fc(a) * (sx - 26) * k), y: Math.round(a.y - (61 - sy) * k) }; }
  function oval(g, cx, top, w, h, c) {
    for (var r = 0; r < h; r++) { var t = (r + 0.5) / h * 2 - 1, hw = Math.round(w / 2 * Math.sqrt(Math.max(0, 1 - t * t))); if (hw > 0) P(g, Math.round(cx) - hw, Math.round(top) + r, hw * 2, 1, c); }
  }
  function star(g, x, y, n, c) { x = Math.round(x); y = Math.round(y); n = Math.round(n); if (n < 1) return; P(g, x - n, y, n * 2 + 1, 1, c); P(g, x, y - n, 1, n * 2 + 1, c); if (n > 3) { P(g, x - 1, y - 1, 3, 3, c); } }
  function findTile(a, code, r) {
    var T = a.T, tx0 = Math.floor(a.x / T), ty0 = Math.floor((a.y - 10) / T), best = null, bd = r * T;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
      if (a.tile(tx0 + dx, ty0 + dy) !== code) continue;
      var cx = (tx0 + dx + 0.5) * T, cy = (ty0 + dy + 0.5) * T, d = Math.hypot(cx - a.x, cy - (a.y - 10));
      if (d < bd) { bd = d; best = { x: Math.round(cx), y: Math.round(cy) }; }
    }
    return best;
  }

  add("char-004", {
    egg: {
      update: function (s, a, dt) {
        if (s.on != null) {
          s.on += dt; var o = s.on;
          [0.1, 0.3, 0.5].forEach(function (p, i) { if (o >= p && once(s, "p" + i)) { var c = sp(a, 20, 38); a.sfx("step"); for (var n = 0; n < 5; n++) a.fx({ x: c.x + fc(a) * 4, y: c.y, vx: fc(a) * rnd(20, 60), vy: rnd(-40, 40), life: 0.25, c: "#ffe0b0", sz: 2, sz2: 1 }); } });
          if (o >= 0.65 && once(s, "fl")) { a.sfx("whoosh"); for (var n = 0; n < 18; n++) a.fx({ x: s.fx + rnd(-8, 8), y: s.fy, vx: rnd(-40, 40), vy: rnd(-160, -70), g: -20, life: rnd(0.5, 1.0), c: pick(["#ffe08a", "#ffb347", "#ff6a2a"]), sz: 2, sz2: 1, add: true }); }
          if (o > 0.65 && o < 1.8 && Math.random() < 0.5) a.fx({ x: s.fx + rnd(-6, 6), y: s.fy - 6, vx: rnd(-15, 15), vy: rnd(-90, -40), life: rnd(0.4, 0.8), c: pick(["#ffb347", "#ff6a2a"]), sz: 2, sz2: 1, add: true });
          if (o > 2.1) { s.on = null; s.cd = 6; s.p0 = s.p1 = s.p2 = s.fl = 0; }
          return;
        }
        s.cd = Math.max(0, (s.cd || 0) - dt);
        var fire = findTile(a, "C", 1.8);
        s.still = fire && !a.moving ? (s.still || 0) + dt : 0;
        if (fire && s.still > 0.5 && s.cd <= 0) { s.on = 0; s.fx = fire.x; s.fy = fire.y; }
      },
      body: function (s) { if (s.on == null) return null; var b = bump(s.on, 0.1, 0.07) + bump(s.on, 0.3, 0.07) + bump(s.on, 0.5, 0.07); return { sy: 1 + 0.05 * b, sx: 1 + 0.04 * b, dy: -Math.round(b) }; },
      under: function (g, s, a) {
        if (s.on == null || s.on < 0.6) return;
        var q = eo(seg(s.on, 0.6, 0.8)), fd = 1 - seg(s.on, 1.5, 2.1); if (fd <= 0) return;
        g.globalAlpha = 0.18 * fd; g.globalCompositeOperation = "lighter"; oval(g, s.fx, s.fy - 30, 44, 40, "#ff9a3a");
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
        for (var i = 0; i < 9; i++) {
          var hg = Math.round((10 + 20 * q + Math.sin(a.now * 9 + i * 1.3) * 5) * fd * (1 - Math.abs(i - 4) / 6)); if (hg < 1) continue;
          P(g, s.fx - 9 + i * 2, s.fy + 2 - hg, 2, hg, i % 3 === 1 ? "#ffb347" : "#ff6a2a");
          if (hg > 6) P(g, s.fx - 9 + i * 2, s.fy + 2 - Math.round(hg * 0.5), 2, Math.round(hg * 0.5), "#ffe08a");
        }
      }
    },
    demo: { map: ["#########", "#.......#", "#.P..C..#", "#......D#", "#########"], at: [2, 2], path: [[2, 0, 0.8], [0, 0, 3.4]] }
  });

  add("char-005", {
    egg: {
      update: function (s, a, dt) {
        var L = window.prints; s.sc = s.sc || [];
        if (!L) return;
        if (s.n == null || L.length < s.n) { s.n = L.length; s.sc.length = 0; }
        var ts = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state;
        for (var i = s.n; i < L.length; i++) {
          var p = L[i]; if (!p || (ts && ts.demo)) continue;
          p.burn = 1;
          s.sc.push({ x: Math.round(p.x), y: Math.round(p.y), t: 0 }); a.fx({ x: p.x, y: p.y, vx: 0, vy: -30, life: 0.3, c: "#ff7a2a", sz: 3, sz2: 1, add: true });
        }
        s.n = L.length;
        s.sc = s.sc.filter(function (q) { q.t += dt; if (q.t < 1.0 && Math.random() < 0.25) a.fx({ x: q.x + rnd(-2, 2), y: q.y - 2, vx: rnd(-6, 6), vy: rnd(-28, -14), life: rnd(0.6, 1.0), c: pick(["#6d6d6d", "#8a8a8a", "#545454"]), sz: 2, sz2: 4, a: 0.6 }); return q.t < 2.2; });
      },
      under: function (g, s) {
        (s.sc || []).forEach(function (q) {
          if (q.t < 0.8) { if (Math.random() < 0.7) P(g, q.x - 1, q.y - 1, 1, 1, "#ffd06a"); if (Math.random() < 0.7) P(g, q.x + 1, q.y, 1, 1, "#ff7a2a"); }
        });
      }
    },
    demo: { map: ["###########", "#.........#", "#.P.......#", "#........D#", "###########"], at: [2, 2], path: [[0, 0, 1.3], [5, 0, 2.6], [0, 0, 1.3]] }
  });

  var THUMB = ["..##.....", ".#ww#....", ".#ww#....", ".#ww####.", "##wwwwww#", "#wwwwwww#", "#wwwwww#.", "#wwwwwww#", ".#wwwww#.", "..#####.."];
  add("char-006", { win: { dur: 2.6,
    update: function (s, a) {
      if (a.t >= 0.45 && once(s, "a")) a.sfx("click");
      if (a.t >= 0.75 && once(s, "b")) a.sfx("click");
      if (a.t >= 1.7 && once(s, "c")) { a.sfx("coin"); for (var i = 0; i < 8; i++) a.fx({ x: a.x, y: a.top - 22, vx: rnd(-60, 60), vy: rnd(-60, 30), life: 0.4, c: "#fff0c0", sz: 2, sz2: 1, add: true }); }
    },
    body: function (s, a) {
      var t = a.t, f = fc(a), look = eio(seg(t, 0.15, 0.4)) * (1 - seg(t, 1.0, 1.15)), nod = bump(t, 1.25, 0.1) + bump(t, 1.5, 0.1);
      return { rot: f * (0.07 * look + 0.05 * nod), dy: Math.round(2 * nod) };
    },
    over: function (g, s, a) {
      var t = a.t, f = fc(a);
      if (t > 0.15 && t < 1.7) { var w = sp(a, 28, 46), pp = t < 0.25 ? 1 : 0; P(g, w.x - 2 - pp, w.y, 5 + pp * 2, 2, "#2a2a2a"); P(g, w.x - 1 - pp, w.y - 1 - pp, 3 + pp * 2, 3 + pp * 2, "#f0c14e"); P(g, w.x, w.y, 1, 1, Math.floor(t * 4) % 2 ? "#ffffff" : "#1b1b1b"); }
      if (t < 1.7) return;
      var q = seg(t, 1.7, 1.85), sc = q < 1 ? 1 + Math.round(Math.sin(q * Math.PI)) : 2, x0 = a.x - Math.round(4.5 * sc), y0 = a.top - 8 - 10 * sc - Math.round(Math.sin(t * 5) * 1);
      THUMB.forEach(function (row, r) { for (var c = 0; c < row.length; c++) { var ch = row.charAt(f > 0 ? c : row.length - 1 - c); if (ch !== ".") P(g, x0 + c * sc, y0 + r * sc, sc, sc, ch === "#" ? "#1b1b1b" : "#ffffff"); } });
      if (Math.floor(t * 6) % 2) star(g, x0 + (f > 0 ? 10 * sc : -2), y0 + 2, 2, "#f0c14e");
    } } });

  add("char-011", { win: { dur: 3.0,
    update: function (s, a) {
      if (once(s, "m")) for (var i = 0; i < 10; i++) a.fx({ x: a.x + rnd(-30, 30), y: a.y - rnd(0, 50), vx: rnd(-4, 4), vy: rnd(-8, -2), life: rnd(2.0, 2.8), c: "#fff0c0", sz: 1, a: 0.7 });
      if (a.t >= 1.6 && once(s, "g")) a.sfx("voice", { f: 2200, slide: 1.3, wave: "sine", vol: 0.05 });
    },
    body: function (s, a) { var f = fc(a), l = eio(seg(a.t, 0.2, 1.4)); return { rot: -f * 0.05 * l, sy: 1 + 0.02 * Math.sin(a.t * 2), dy: Math.round(bump(a.t, 1.6, 0.25)) }; },
    over: function (g, s, a) {
      var t = a.t, q = seg(t, 0.6, 1.5);
      if (q > 0 && q < 1) for (var r = 0; r < 5; r++) { var sx = Math.round(17 + 15 * q) - r; if (sx < 19 || sx > 29) continue; var p = sp(a, sx, 18 + r); P(g, p.x, p.y, 2, 1, "#ffffff"); }
      var gq = seg(t, 1.6, 2.6); if (gq <= 0 || gq >= 1) return;
      var c = sp(a, 30, 18), n = 2 + Math.sin(gq * Math.PI) * 8;
      star(g, c.x, c.y, n, "#ffffff"); if (n > 5) { P(g, c.x - 2, c.y - 2, 1, 1, "#fff0c0"); P(g, c.x + 2, c.y + 2, 1, 1, "#fff0c0"); P(g, c.x + 2, c.y - 2, 1, 1, "#fff0c0"); P(g, c.x - 2, c.y + 2, 1, 1, "#fff0c0"); }
    } } });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.levelFx) return;
  var add = BH.levelFx.add;

  function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function seg(T, a, b) { return cl((T - a) / (b - a)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(l) { return l[Math.floor(Math.random() * l.length)]; }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function sdOf(a) { return a.dir === "left" ? -1 : 1; }
  function step(s, a) { var d = Math.max(0, Math.min(0.1, a.t - (s.lt || 0))); s.lt = a.t; return d; }
  function off(a, col, row) { var S = a.T * 1.45 / 45; return { x: Math.round(a.x + sdOf(a) * (col - 25.5) * S), y: Math.round(a.y + (row + 0.5 - 61) * S) }; }
  function star(g, x, y, r, c) { x = Math.round(x); y = Math.round(y); if (r < 1) return; P(g, x - r, y, r * 2 + 1, 1, c); P(g, x, y - r, 1, r * 2 + 1, c); if (r > 2) { P(g, x - 1, y - 1, 3, 3, c); } }
  function playing(a) { return a.phase === "play"; }

  var GRASS = ["#5f9e3a", "#7cc04a", "#3f7a2a"], LEAF = ["#2f6a26", "#4f8f34", "#7cc04a"];
  add("char-013", {
    egg: {
      update: function (s, a, dt) {
        var U = s.u = s.u || [], W = s.w = s.w || [], i;
        for (i = U.length - 1; i >= 0; i--) { U[i].t += dt; if (U[i].t > 1.3) U.splice(i, 1); }
        for (i = W.length - 1; i >= 0; i--) { var w = W[i]; w.t += dt; w.x += w.vx * dt; if (w.t > w.l) W.splice(i, 1); }
        var mx = a.x - (s.lx == null ? a.x : s.lx), my = a.y - (s.ly == null ? a.y : s.ly); s.lx = a.x; s.ly = a.y;
        if (Math.abs(mx) > 0.05) s.wd = mx > 0 ? 1 : -1; else if (s.wd == null) s.wd = sdOf(a);
        var go = playing(a) && a.moving && !a.player.inShield;
        s.k = cl((s.k || 0) + (go ? dt * 3 : -dt * 1.5));
        if (!go) return;
        s.d = (s.d || 0) + Math.sqrt(mx * mx + my * my) + (Math.abs(mx) + Math.abs(my) < 0.01 ? dt * 60 : 0);
        while (s.d > 8 && U.length < 26) { s.d -= 8; var n = 3 + Math.floor(Math.random() * 3), bl = []; for (var j = 0; j < n; j++) bl.push({ dx: Math.round(rnd(-4, 4)), h: 3 + Math.floor(Math.random() * 3), c: pick(GRASS), ph: rnd(0, 6) }); U.push({ x: Math.round(a.x + rnd(-11, 11)), y: Math.round(a.y + rnd(-3, 4)), t: 0, b: bl }); }
        if (W.length < 10 && Math.random() < dt * 7) W.push({ x: a.x - s.wd * rnd(10, 30), y: a.y - rnd(4, 44), vx: s.wd * rnd(70, 110), t: 0, l: rnd(0.35, 0.6), n: Math.round(rnd(6, 12)) });
        var tx = Math.floor(a.x / a.T), ty = Math.floor((a.y - 10) / a.T);
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
          if (a.tile(tx + ox, ty + oy) !== "b" || Math.random() > dt * 9) continue;
          a.fx({ x: (tx + ox) * a.T + rnd(4, 28), y: (ty + oy) * a.T + rnd(3, 12), vx: s.wd * rnd(30, 70), vy: rnd(-35, -10), g: 25, life: rnd(0.6, 1), c: pick(LEAF), sz: 2 });
        }
      },
      under: function (g, s, a) {
        var U = s.u; if (!U) return;
        for (var i = 0; i < U.length; i++) {
          var u = U[i], al = Math.min(1, u.t / 0.12, (1.3 - u.t) / 0.4); if (al <= 0) continue;
          g.globalAlpha = al;
          for (var j = 0; j < u.b.length; j++) {
            var b = u.b[j], lean = (s.wd || 1) * (1.6 + Math.sin(u.t * 9 + b.ph) * 1.2) * (1 - u.t / 1.6);
            for (var r = 0; r < b.h; r++) { var q = r / b.h; P(g, u.x + b.dx + Math.round(lean * q * q * 1.6), u.y - r, 1, 1, r === b.h - 1 ? "#a6dc6a" : b.c); }
          }
        }
        g.globalAlpha = 1;
      },
      over: function (g, s, a) {
        var W = s.w; if (!W || !W.length) return;
        for (var i = 0; i < W.length; i++) {
          var w = W[i], q = w.t / w.l; g.globalAlpha = 0.45 * Math.sin(q * Math.PI) * (s.k || 0);
          for (var k = 0; k < w.n; k++) P(g, w.x - (s.wd || 1) * k, w.y + Math.round(Math.sin((w.x - k) * 0.15) * 1.5), 1, 1, "#eef8ff");
        }
        g.globalAlpha = 1;
      }
    },
    demo: { map: ["############", "#..........#", "#P...bb....#", "#..........#", "############"], at: [1, 2], path: [[4, 0, 2], [2, 0, 1.2], [3, 0, 1.5], [0, 0, 0.8]] }
  });

  function coin(g, x, y, w) {
    x = Math.round(x); y = Math.round(y);
    if (w <= 1) { P(g, x, y - 2, 1, 5, "#b8862e"); return; }
    P(g, x - (w >> 1), y - 2, w, 5, "#8a5a10"); if (w > 2) { P(g, x - (w >> 1) + 1, y - 1, w - 2, 3, "#eaba49"); P(g, x - (w >> 1) + 1, y - 2, w - 2, 1, "#fff3c4"); }
  }
  var GLINT = [0.3, 1.15, 2.0];
  add("char-014", {
    win: {
      dur: 2.6,
      update: function (s, a) {
        var dt = step(s, a), C = s.c = s.c || [], T = a.t, i;
        while ((s.n || 0) < 24 && T > 0.1 + (s.n || 0) * 0.07) { s.n = (s.n || 0) + 1; C.push({ x: Math.round(a.x + rnd(-38, 34)), y: a.top - rnd(30, 90), vy: rnd(0, 40), fy: Math.round(a.y + rnd(-5, 6)), ph: rnd(0, 6), sp: rnd(9, 14), rest: false, b: 0 }); }
        for (i = 0; i < C.length; i++) {
          var c = C[i]; if (c.rest) continue;
          c.vy += 420 * dt; c.y += c.vy * dt;
          if (c.y >= c.fy) { c.y = c.fy; if (c.b === 0 && c.vy > 80) { c.vy = -c.vy * 0.3; c.b = 1; if (Math.random() < 0.35) a.sfx("coin"); } else c.rest = true; }
        }
        for (i = 0; i < GLINT.length; i++) if (T >= GLINT[i] && once(s, "g" + i)) {
          var o = off(a, 21, 40); a.sfx("voice", { f: 2000 + i * 300, slide: 0.7, wave: "sine", vol: 0.04 });
          for (var j = 0; j < 8; j++) { var an = j / 8 * 6.283; a.fx({ x: o.x, y: o.y, vx: Math.cos(an) * 45, vy: Math.sin(an) * 45, life: 0.35, c: j % 2 ? "#fff3c4" : "#ffd65a", sz: 2, sz2: 1, add: true }); }
        }
      },
      body: function (s, a) { var h = seg(a.t, 0, 0.35); return { dy: -Math.round(Math.sin(h * Math.PI) * 6), sy: 1 + 0.06 * Math.sin(h * Math.PI) }; },
      under: function (g, s, a) {
        var C = s.c; if (!C) return; var fade = 1 - seg(a.t, 2.2, 2.6);
        g.globalAlpha = fade;
        for (var i = 0; i < C.length; i++) if (C[i].rest || C[i].b) coin(g, C[i].x, C[i].y, C[i].rest ? 5 : Math.round(Math.abs(Math.cos(a.now * C[i].sp + C[i].ph)) * 5));
        g.globalAlpha = 1;
      },
      over: function (g, s, a) {
        var C = s.c, i; if (!C) return;
        for (i = 0; i < C.length; i++) if (!C[i].rest && !C[i].b) coin(g, C[i].x, C[i].y, Math.round(Math.abs(Math.cos(a.now * C[i].sp + C[i].ph)) * 5));
        var o = off(a, 21, 40);
        g.globalCompositeOperation = "lighter";
        for (i = 0; i < GLINT.length; i++) { var q = seg(a.t, GLINT[i], GLINT[i] + 0.45); if (q > 0 && q < 1) { var r = Math.round(Math.sin(q * Math.PI) * 6); star(g, o.x, o.y, r, "#fff3c4"); g.globalAlpha = 0.5; star(g, o.x, o.y, Math.max(1, r - 3), "#ffffff"); g.globalAlpha = 1; } }
      }
    }
  });

  add("char-016", {
    win: {
      dur: 1.8,
      start: function (s, a) {
        a.sfx("voice", { f: 260, slide: 0.6, wave: "sine", vol: 0.03 });
        if (typeof rings !== "undefined") rings = rings.filter(function (r) { return r.col !== "rgba(234,186,73,0.8)"; });
      },
      update: function (s, a, dt) {
        var T = a.t, o = off(a, 23.5, 33), sd = sdOf(a);
        if (T > 0.22 && T < 1.45) {
          s.bz = (s.bz || 0) + dt; if (s.bz > 0.07) { s.bz = 0; a.sfx("voice", { f: rnd(70, 115), slide: rnd(0.8, 1.2), wave: "sawtooth", vol: 0.05 }); }
          if (Math.random() < dt * 22) a.fx({ x: o.x + Math.round(Math.sin(a.now * 40) * 2), y: o.y + 3, vx: sd * rnd(40, 110), vy: rnd(-50, 10), g: 300, life: rnd(0.3, 0.5), c: pick(["#dff6ff", "#ffffff", "#f8c0cc"]), sz: 1 });
        }
        if (T >= 1.45 && once(s, "pop")) a.sfx("voice", { f: 600, slide: 0.4, wave: "square", vol: 0.04 });
      },
      body: function (s, a) {
        var T = a.t, w = seg(T, 0, 0.22), b = T > 0.22 && T < 1.45;
        if (!b) return T < 0.22 ? { sy: 1 + 0.05 * w, sx: 1 - 0.03 * w } : { sy: 1 - 0.04 * Math.sin(seg(T, 1.45, 1.8) * Math.PI) };
        return { dx: Math.floor(a.now * 30) % 2 ? 1 : 0, sy: 0.97, sx: 1.02 };
      },
      over: function (g, s, a) {
        var T = a.t; if (T < 0.15 || T > 1.6) return;
        var o = off(a, 23.5, 30), k = seg(T, 0.15, 0.3) * (1 - seg(T, 1.45, 1.6)), L = Math.round(3 + 5 * k), wig = T > 0.22 && T < 1.45 ? Math.sin(a.now * 38) * 2.5 : 0;
        for (var r = 0; r < L; r++) { var q = r / L, x = o.x + Math.round(wig * q * q); P(g, x - 1, o.y + r, 3, 1, "#b84a68"); P(g, x, o.y + r, 1, 1, "#f08aa0"); }
        var tx = o.x + Math.round(wig); P(g, tx - 2, o.y + L - 1, 5, 3, "#b84a68"); P(g, tx - 1, o.y + L - 1, 3, 2, "#f08aa0"); P(g, tx - 1, o.y + L - 1, 1, 1, "#ffd0da");
      }
    }
  });

  var GLOW = null;
  function glow() {
    if (GLOW) return GLOW;
    var c = document.createElement("canvas"); c.width = c.height = 41; var x = c.getContext("2d"); if (!x) return null;
    for (var j = 0; j < 41; j++) for (var i = 0; i < 41; i++) {
      var d = Math.sqrt((i - 20) * (i - 20) + (j - 20) * (j - 20)), b = d < 2.5 ? 0.95 : d < 6 ? 0.5 : d < 11 ? 0.24 : d < 20 ? 0.09 : 0;
      if (b) { x.globalAlpha = b; x.fillStyle = d < 2.5 ? "#f2fff8" : "#86f0dc"; x.fillRect(i, j, 1, 1); }
    }
    return (GLOW = c);
  }
  function fish(g, f) { var d = f.vx >= 0 ? 1 : -1, x = Math.round(f.x), y = Math.round(f.y); P(g, x - 1, y, 3, 1, "#cfefff"); P(g, x + d, y, 1, 1, "#ffffff"); P(g, x - 2 * d, y + (Math.floor(f.t * 10) % 2 ? -1 : 1), 1, 1, "#6fd0e8"); }
  add("char-023", {
    egg: {
      update: function (s, a, dt) {
        var on = playing(a) && !!a.player.inShield, L = off(a, 37, 20), F = s.f = s.f || [];
        s.k = cl((s.k || 0) + (on ? dt * 2.5 : -dt * 2));
        if (on && !F.length) for (var n = 0; n < 5; n++) F.push({ x: a.x + rnd(-30, 30), y: a.y + rnd(-6, 6), vx: rnd(-20, 20), vy: 0, ph: rnd(0, 6), t: 0, r: rnd(5, 12) });
        if (s.k <= 0) { F.length = 0; return; }
        for (var i = 0; i < F.length; i++) {
          var f = F[i]; f.t += dt;
          var tx = L.x + Math.cos(f.t * 1.8 + f.ph) * f.r, ty = a.y + 2 + Math.sin(f.t * 2.4 + f.ph) * 4;
          f.vx += ((tx - f.x) * 6 - f.vx * 2.5) * dt; f.vy += ((ty - f.y) * 6 - f.vy * 2.5) * dt;
          var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy); if (sp > 80) { f.vx *= 80 / sp; f.vy *= 80 / sp; }
          f.x += f.vx * dt; f.y += f.vy * dt;
          if (on && Math.random() < dt * 0.4) a.fx({ x: f.x, y: f.y - 1, vx: 0, vy: -8, life: 0.4, c: "#dff6ff", sz: 1, a: 0.7 });
        }
      },
      under: function (g, s, a) {
        var k = s.k || 0, F = s.f; if (k <= 0 || !F) return;
        var L = off(a, 37, 20); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.25 * k; P(g, L.x - 6, a.y - 1, 12, 3, "#86f0dc"); P(g, L.x - 3, a.y + 2, 6, 1, "#c4fbee");
        g.globalCompositeOperation = "source-over"; g.globalAlpha = k;
        for (var i = 0; i < F.length; i++) if (F[i].y < a.y) fish(g, F[i]);
        g.globalAlpha = 1;
      },
      over: function (g, s, a) {
        var k = s.k || 0; if (k <= 0) return;
        var L = off(a, 37, 20), pul = 0.85 + 0.15 * Math.sin(a.now * 4), G = glow(), F = s.f || [], i;
        g.globalAlpha = k; for (i = 0; i < F.length; i++) if (F[i].y >= a.y) fish(g, F[i]);
        g.globalCompositeOperation = "lighter";
        if (G) { g.globalAlpha = 0.9 * k * pul; g.drawImage(G, L.x - 20, L.y - 20); }
        g.globalAlpha = k; star(g, L.x, L.y, Math.round(2 + pul * 2 * k), "#f2fff8");
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      }
    },
    demo: { map: ["##########", "#....~~..#", "#P...~~..#", "#....~~..#", "##########"], at: [1, 2], path: [[4, 0, 1.5], [0, 1, 1], [0, -2, 1.6], [0, 0, 1]] }
  });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.levelFx) return;
  var add = BH.levelFx.add, TAU = Math.PI * 2;

  function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h)); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function seg(t, a, b) { return cl((t - a) / (b - a)); }
  function eio(q) { return q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(l) { return l[Math.floor(Math.random() * l.length)]; }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function pring(g, cx, cy, rx, ry, c) {
    if (rx < 1) return; var n = Math.max(8, Math.round((rx + ry) * 1.7));
    g.fillStyle = c; for (var i = 0; i < n; i++) { var an = i / n * TAU; g.fillRect(Math.round(cx + Math.cos(an) * rx), Math.round(cy + Math.sin(an) * ry), 1, 1); }
  }
  function mid(r, h) { return { rot: r, dx: Math.round(-h / 2 * Math.sin(r)), dy: Math.round(h / 2 * Math.cos(r) - h / 2) }; }

  add("char-027", {
    egg: {
      update: function (s, a, dt) {
        var on = a.player && a.player.inShield ? 1 : 0;
        s.on = (s.on || 0) + (on - (s.on || 0)) * Math.min(1, dt * (on ? 3 : 6)); s.ph = (s.ph || 0) + dt;
        if (s.on > 0.5 && Math.random() < dt * 7) { var an = rnd(0, TAU); a.fx({ x: a.x + Math.cos(an) * rnd(8, 20), y: a.y + Math.sin(an) * rnd(3, 6), vx: 0, vy: rnd(-22, -8), life: rnd(0.3, 0.6), c: pick(["#39ff7a", "#c8ffd8", "#7dffa8"]), sz: 2, sz2: 0, add: true }); }
      },
      under: function (g, s, a) {
        if (!(s.on > 0.02)) return;
        var x = Math.round(a.x), y = Math.round(a.y), i;
        g.globalCompositeOperation = "lighter";
        for (i = 0; i < 4; i++) { var r = 3 - i * 0.6; g.globalAlpha = 0.05 * s.on; P(g, x - Math.round(14 * r / 3), y - Math.round(4 * r / 3), Math.round(28 * r / 3), Math.round(8 * r / 3), "#39ff7a"); }
        for (i = 0; i < 3; i++) {
          var f = (s.ph * 0.7 + i / 3) % 1;
          g.globalAlpha = s.on * (1 - f) * 0.9; pring(g, x, y, Math.round(9 + f * 26), Math.round(3 + f * 9), i ? "#39ff7a" : "#c8ffd8");
        }
      }
    },
    demo: { map: ["#########", "#....~~.#", "#P...~~D#", "#....~~.#", "#########"], at: [1, 2], path: [[0, 0, 0.5], [4, 0, 1.3], [0, 0, 2.6], [-2, 0, 0.9]] }
  });

  var VG = "#39ff7a", VL = "#c8ffd8", B0 = 0.45, B1 = 1.25;
  function glitchOn(t) { return t > 1.25 && t < 1.5; }
  function vrSpan(t, h) { if (t < 0.12) return null; if (t < 1.3) return [0, Math.round(h * eio(seg(t, 0.12, 0.4)))]; return [Math.round(h * eio(seg(t, 1.3, 1.6))), h]; }
  function build(g, a) {
    var t = a.t; if (t < B0 || t >= B1) return;
    var top = Math.floor(a.top) - 3, ey = Math.round(top + (a.y + 2 - top) * seg(t, B0, B1)), x0 = Math.round(a.x - a.T);
    g.save(); g.beginPath(); g.rect(x0, top, a.T * 2, ey - top); g.clip(); a.body(g, a.x, a.y); g.restore();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.4; P(g, x0 + 6, ey - 2, a.T * 2 - 12, 3, VG);
    g.globalAlpha = 1; P(g, x0 + 4, ey, a.T * 2 - 8, 1, VL);
    for (var i = 0; i < 4; i++) { g.globalAlpha = rnd(0.5, 1); P(g, x0 + 4 + Math.floor(rnd(0, a.T * 2 - 8)), ey - Math.floor(rnd(1, 6)), 1, 1, VL); }
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  var VR = {
      dur: 2.0,
      update: function (s, a) {
        var t = a.t, n = Math.floor(seg(t, 0.12, 0.4) * 6) + Math.floor(seg(t, 1.3, 1.6) * 6);
        if (t > 0.1 && once(s, "on")) a.sfx("voice", { f: 600, slide: 2, wave: "square", vol: 0.04 });
        if (n > (s.n || 0)) { s.n = n; if (n % 2 === 0) a.sfx("voice", { f: 1100 + n * 60, slide: 1, wave: "square", vol: 0.02 }); }
        if (t > 1.6 && once(s, "off")) a.sfx("voice", { f: 1500, slide: 0.4, wave: "square", vol: 0.04 });
      },
      body: function (s, a) { return a.t < B1 ? { alpha: 0 } : glitchOn(a.t) ? { dx: Math.round(rnd(-2, 2)) } : null; },
      under: function (g, s, a) {
        if (!glitchOn(a.t)) return;
        a.body(g, Math.round(a.x) - 3, Math.round(a.y), { alpha: 0.35 }); a.body(g, Math.round(a.x) + 3, Math.round(a.y), { alpha: 0.35 });
      },
      over: function (g, s, a) {
        var t = a.t, W = 6 * a.T, H = 3 * a.T, x0 = Math.round(a.x - W / 2), y0 = Math.round(a.y - 2.2 * a.T), sp = vrSpan(t, H), i;
        build(g, a);
        if (glitchOn(t) && g.getTransform && g.canvas) {
          var m = g.getTransform();
          if (m && m.a) {
            var sx0 = Math.round(m.a * x0 + m.e), sy0 = Math.round(m.d * y0 + m.f), sw = Math.round(m.a * W), sh = Math.round(m.d * H);
            g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
            for (i = 0; i < 6; i++) { var bh = Math.round(rnd(2, 7) * m.d), by = sy0 + Math.round(rnd(0, sh - bh)), off = Math.round(rnd(-10, 10) * m.a); if (bh > 0 && sw > 0) g.drawImage(g.canvas, sx0, by, sw, bh, sx0 + off, by, sw, bh); }
            g.restore();
          }
        }
        grid(g, a.now, x0, y0, W, H, t);
      }
  };
  function grid(g, now, x0, y0, W, H, t) {
        var sp = vrSpan(t, H), i;
        if (!sp || sp[1] <= sp[0]) return;
        var top = y0 + sp[0], bot = y0 + sp[1];
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 0.12; P(g, x0, top, W, bot - top, VG);
        g.globalAlpha = 0.45 + 0.12 * Math.sin(now * 31);
        for (i = 0; i <= W; i += 8) P(g, x0 + Math.min(i, W - 1), top, 1, bot - top, VG);
        for (i = 0; i <= H; i += 8) { var gy = y0 + Math.min(i, H - 1); if (gy >= top && gy < bot) P(g, x0, gy, W, 1, VG); }
        g.globalAlpha = 0.9;
        [[x0 - 2, y0 - 2, 1, 1], [x0 + W + 1, y0 - 2, -1, 1], [x0 - 2, y0 + H + 1, 1, -1], [x0 + W + 1, y0 + H + 1, -1, -1]].forEach(function (c) {
          if (c[1] < top - 3 || c[1] > bot + 2) return;
          P(g, c[2] > 0 ? c[0] : c[0] - 4, c[1], 5, 1, VL); P(g, c[0], c[3] > 0 ? c[1] : c[1] - 4, 1, 5, VL);
        });
        for (i = 0; i < 6; i++) { g.globalAlpha = rnd(0.4, 0.9); P(g, x0 + Math.floor(rnd(0, W)), top + Math.floor(rnd(0, bot - top)), 1, 1, VL); }
        if (t < 0.4 || t > 1.3) { var ly = t < 0.4 ? bot - 1 : top; g.globalAlpha = 0.35; P(g, x0 - 3, ly - 1, W + 6, 3, VG); g.globalAlpha = 0.95; P(g, x0 - 3, ly, W + 6, 1, VL); }
        g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  add("char-029", { spawn: VR });

  var TEAM = { "char-010": 1, "char-052": 1 }, L0 = null, T0 = 0, pend = false;
  var db0 = window.drawBitfoot;
  if (typeof db0 === "function") window.drawBitfoot = function (x, fy, d, an, tt, al, lk) {
    var G = window.game, now = window.simTime || 0;
    if (window.levelStart !== L0 && now - window.levelStart < 0.25) { L0 = window.levelStart; pend = true; }
    if (pend && G && G.phase === "play") { pend = false; T0 = now; }
    var t = pend ? 0 : now - T0, worn = null;
    try { worn = BH.characters.worn(window.save); } catch (e) {}
    if (!(lk && !lk.fur && TEAM[lk.char] && worn === "char-029" && G && G.screen === "play" && t < 1.6)) return db0.apply(this, arguments);
    var g = window.ctx, Tt = window.T || 32, top = db0.call(this, x, fy, d, an, tt, 0, lk);
    if (pend) return top;
    if (t >= B1) { db0.apply(this, arguments); } else if (t >= B0 && top != null) {
      var y0 = Math.floor(top) - 3, ey = Math.round(y0 + (fy + 2 - y0) * seg(t, B0, B1));
      g.save(); g.beginPath(); g.rect(x - Tt, y0, Tt * 2, ey - y0); g.clip(); db0.apply(this, arguments); g.restore();
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.4; P(g, x - Tt + 6, ey - 2, Tt * 2 - 12, 3, VG); g.globalAlpha = 1; P(g, x - Tt + 4, ey, Tt * 2 - 8, 1, VL); g.restore();
    }
    g.save(); grid(g, now, Math.round(x - Tt * 1.25), Math.round(fy - Tt * 2.2), Math.round(Tt * 2.5), Math.round(Tt * 2.5), t); g.restore();
    return top;
  };

  function tree(c) { return c === "#" || c === "S"; }
  add("char-034", {
    egg: {
      update: function (s, a, dt) {
        s.cd = Math.max(0, (s.cd || 0) - dt);
        if (s.f) { s.f.t += dt; if (s.f.t >= 0.5) s.f = null; return; }
        var pl = a.player, T = a.T; if (!a.moving || s.cd > 0 || !pl) return;
        var tx = Math.floor(pl.x / T), ty = Math.floor(pl.y / T), hz = a.dir === "left" || a.dir === "right", kx = null, ky = null;
        if (hz) { if (Math.abs(pl.x - (tx + 0.5) * T) < 5 && tree(a.tile(tx, ty - 1)) && !tree(a.tile(tx - 1, ty - 1)) && !tree(a.tile(tx + 1, ty - 1))) { kx = (tx + 0.5) * T; ky = (ty - 1) * T + 27; } }
        else if (Math.abs(pl.y - (ty + 0.5) * T) < 5) [-1, 1].forEach(function (k) { if (kx == null && tree(a.tile(tx + k, ty)) && !tree(a.tile(tx + k, ty - 1)) && !tree(a.tile(tx + k, ty + 1))) { kx = (tx + k + 0.5) * T - k * 2; ky = ty * T + 27; } });
        var key = tx + "," + ty;
        if (kx == null || s.key === key) return;
        s.key = key; s.cd = 1.6; s.f = { t: 0, d: a.dir === "left" || a.dir === "up" ? -1 : 1 };
        a.sfx("step");
        for (var i = 0; i < 7; i++) a.fx({ x: kx + rnd(-3, 3), y: ky + rnd(-3, 3), vx: rnd(-50, 50), vy: rnd(-70, -10), g: 300, life: rnd(0.3, 0.5), c: pick(["#7a5230", "#5a3a1c", "#c8a670"]), sz: 2, fade: false });
        for (var j = 0; j < 4; j++) a.fx({ x: kx, y: ky, vx: rnd(-25, 25), vy: rnd(-25, 5), life: 0.35, c: "#e8e2d0", sz: 2, sz2: 5, a: 0.6 });
      },
      body: function (s, a) {
        if (!s.f) return null;
        var q = s.f.t / 0.5, o = mid(s.f.d * TAU * eio(q), a.h);
        o.dy -= Math.round(12 * Math.sin(q * Math.PI)); return o;
      }
    },
    demo: { map: ["##########", "#........#", "#...#....#", "#P.......#", "#......D.#", "##########"], at: [1, 3], path: [[0, 0, 0.6], [7, 0, 2.6], [0, 0, 1.2]] }
  });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.levelFx) return;
  var add = BH.levelFx.add, PI = Math.PI;

  function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.floor(x), Math.floor(y), Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function seg(t, a, b) { return cl((t - a) / (b - a)); }
  function eo(q) { return 1 - (1 - q) * (1 - q); }
  function ei(q) { return q * q; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(l) { return l[Math.floor(Math.random() * l.length)]; }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function side(a) { return a.dir === "left" ? -1 : 1; }
  function fade(s, on, dt, i, o) { s.k = cl((s.k || 0) + (on ? dt / i : -dt / o)); return s.k; }
  function near(a, kinds, r) {
    var T = a.T, px = a.x, py = a.player.y || a.y - 10, tx = Math.floor(px / T), ty = Math.floor(py / T), R = Math.ceil(r) + 1, best = null, bd = r * T;
    for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) {
      var c = a.tile(tx + dx, ty + dy); if (!c || kinds.indexOf(c) < 0) continue;
      var cx = (tx + dx + 0.5) * T, cy = (ty + dy + 0.5) * T, d = Math.sqrt((cx - px) * (cx - px) + (cy - py) * (cy - py));
      if (d <= bd) { bd = d; best = { x: cx, y: cy, d: d }; }
    }
    return best;
  }
  var SC = {};
  function scan(a, key, pred, frac) {
    var dir = a.dir || "right", k = a.id + dir + key, CH = BH.characters;
    if (SC[k] !== undefined) return SC[k] && SC[k].pts ? SC[k] : null;
    if (!CH || !CH.draw || typeof document === "undefined" || (SC[k + "@"] || 0) > a.now) return null;
    var S = window.BitfootSprite, sc = a.T * 1.45 / (S && S.H || 32), c = document.createElement("canvas"), W = 96, H = 120, ok = false, d = null;
    c.width = W; c.height = H; var x = c.getContext("2d"); x.imageSmoothingEnabled = false;
    try { ok = CH.draw(x, 48, 112, { dir: dir, state: "idle", t: 0, scale: sc, alpha: 1 }, a.id); } catch (e) {}
    if (!ok) { SC[k + "@"] = a.now + 1; return null; }
    try { d = x.getImageData(0, 0, W, H).data; } catch (e) {}
    if (!d || d.length < W * H * 4) { SC[k] = null; return null; }
    var y0 = H, yy, xx, o, pts = [], sx = 0, sy = 0, X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9;
    for (yy = 0; yy < H && y0 === H; yy++) for (xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 16) { y0 = yy; break; }
    var lim = y0 + (112 - y0) * frac;
    for (yy = y0; yy < lim; yy++) for (xx = 0; xx < W; xx++) {
      o = (yy * W + xx) * 4; if (d[o + 3] < 16 || !pred(d[o], d[o + 1], d[o + 2])) continue;
      pts.push({ x: xx - 48, y: yy - 112 }); sx += xx - 48; sy += yy - 112;
      X0 = Math.min(X0, xx - 48); X1 = Math.max(X1, xx - 48); Y0 = Math.min(Y0, yy - 112); Y1 = Math.max(Y1, yy - 112);
    }
    SC[k] = pts.length ? { pts: pts, x: sx / pts.length, y: sy / pts.length, x0: X0, x1: X1, y0: Y0, y1: Y1 } : { none: 1 };
    return pts.length ? SC[k] : null;
  }

  var FIRE = ["#ff3d1a", "#ff8a2a", "#ffd04a", "#fff3c0"];
  function bigFire(g, x, y, k, now) {
    if (k <= 0) return;
    var H = Math.round(62 * k), W = Math.round(26 * (0.5 + 0.5 * k));
    g.save(); g.globalCompositeOperation = "lighter";
    var gr = g.createRadialGradient(x, y - 10, 2, x, y - 10, 34 + 30 * k); gr.addColorStop(0, "rgba(255,150,60," + (0.45 * k).toFixed(3) + ")"); gr.addColorStop(1, "rgba(255,120,40,0)");
    g.fillStyle = gr; g.fillRect(Math.round(x - 70), Math.round(y - 80), 140, 110); g.restore();
    for (var L = 0; L < 4; L++) {
      var lw = W * (1 - L * 0.24), lh = H * (1 - L * 0.2);
      for (var i = 0; i < lh; i += 2) {
        var q = i / lh, w = Math.round(lw * Math.pow(1 - q, 0.7) * (1 + 0.18 * Math.sin(now * 22 + i * 0.5 + L))), sw = Math.round(Math.sin(now * 9 + i * 0.15) * 3 * q);
        if (w > 0) P(g, x - w / 2 + sw, y - i - 2, w, 2, FIRE[L]);
      }
    }
  }
  add("char-039", {
    egg: {
      update: function (s, a, dt) {
        var f = near(a, "C", 1.7);
        if (f) { s.f = f; s.near = (s.near || 0) + dt; } else s.near = 0;
        if (f && s.near > 0.6 && a.now >= (s.next || 0)) { s.t0 = a.now; s.next = a.now + 5; s.sd = side(a); s.boom = 0; }
        var q = s.t0 != null ? a.now - s.t0 : 9;
        if (q >= 0.45 && q < 2 && !s.boom && s.f) {
          s.boom = 1; a.sfx("whoosh"); a.sfx("voice", { f: 900, slide: 0.35, wave: "triangle", vol: 0.05 });
          for (var i = 0; i < 10; i++) a.fx({ x: a.x + s.sd * 8, y: a.top + 14, vx: s.sd * rnd(40, 110), vy: rnd(-30, 20), g: 60, life: rnd(0.25, 0.5), c: "#e8f4ff", sz: 2, sz2: 1, a: 0.7 });
          for (i = 0; i < 26; i++) a.fx({ x: s.f.x + rnd(-8, 8), y: s.f.y - rnd(0, 20), vx: rnd(-60, 60), vy: rnd(-200, -80), g: 120, life: rnd(0.5, 1.1), c: pick(FIRE), sz: pick([2, 3]), sz2: 1, add: true });
        }
      },
      body: function (s, a) {
        var q = s.t0 != null ? a.now - s.t0 : 9; if (q > 0.9) return null;
        if (q < 0.45) { var w = eo(q / 0.45); return { rot: -s.sd * 0.13 * w, sy: 1 + 0.05 * w, dy: Math.round(Math.sin(q * 40) * 0.6) }; }
        var j = 1 - seg(q, 0.45, 0.9); return { rot: s.sd * 0.22 * j, sy: 1 - 0.07 * j, dx: Math.round(s.sd * 2 * j) };
      },
      under: function (g, s, a) { var q = a.now - (s.t0 || -9); if (s.f && s.f.y <= a.y && q >= 0.45 && q < 1.8) bigFire(g, s.f.x, s.f.y + 4, k39(q), a.now); },
      over: function (g, s, a) { var q = a.now - (s.t0 || -9); if (s.f && s.f.y > a.y && q >= 0.45 && q < 1.8) bigFire(g, s.f.x, s.f.y + 4, k39(q), a.now); }
    },
    demo: { map: ["############", "#..........#", "#.P....C...#", "#..........#", "#.........D#", "############"], at: [2, 2], path: [[4, 0, 1.6], [0, 0, 3.4]] }
  });
  function k39(q) { return q < 0.6 ? eo(seg(q, 0.45, 0.6)) : 1 - ei(seg(q, 0.9, 1.8)); }

  add("char-041", {
    egg: {
      update: function (s, a) {
        if (!near(a, "MU", 3)) s.arm = 1;
        else if (s.arm !== 0 && near(a, "MU", 1.8)) { s.arm = 0; s.t0 = a.now; s.sd = side(a); }
      },
      body: function (s, a) {
        var q = s.t0 != null ? a.now - s.t0 : 9; if (q > 1.4) return null;
        var f = (q > 0.15 && q < 0.4) || (q > 0.62 && q < 0.9) ? -1 : 1, c = Math.sin(seg(q, 0, 1.4) * PI);
        return { sx: f, sy: 1 - 0.06 * c, dy: Math.round(c) };
      },
      over: function (g, s, a) {
        var q = s.t0 != null ? a.now - s.t0 : 9; if (q > 1.4) return;
        [0.15, 0.4, 0.62, 0.9].forEach(function (t0, i) {
          var u = q - t0; if (u < 0 || u > 0.14) return;
          var d = i % 2 ? 1 : -1, x = a.x + d * 14, y = a.top + 12; g.globalAlpha = 1 - u / 0.14;
          P(g, x, y, d * 5, 1, "#fffaf0"); P(g, x + d * 2, y + 4, d * 4, 1, "#fffaf0");
        });
        g.globalAlpha = 1;
        var w = seg(q, 0.85, 1.4); if (w <= 0) return;
        var sx = a.x - s.sd * 9, sy = a.top + 8 + Math.round(ei(w) * 10);
        g.globalAlpha = 1 - ei(w); P(g, sx, sy, 2, 3, "#7fd8ff"); P(g, sx, sy - 1, 1, 1, "#bff0ff"); P(g, sx, sy, 1, 1, "#ffffff"); g.globalAlpha = 1;
      }
    },
    demo: { map: ["############", "#..........#", "#.P......M.#", "#..........#", "#.........D#", "############"], at: [2, 2], path: [[6, 0, 2.2], [0, 0, 2.5]] }
  });

  add("char-042", {
    egg: {
      update: function (s, a, dt) {
        var k = fade(s, !!a.player.inShield, dt, 0.3, 0.2);
        if (k <= 0) { s.ph = 0; s.lt = a.now; return; }
        s.ph = (s.ph || 0) + dt * (a.moving ? 1.1 : 0.5); s.sl = (s.sl || 0) + dt * (a.moving ? 0.4 : 1);
        if (a.now - (s.dr || 0) > 0.22) { s.dr = a.now; a.fx({ x: a.x + rnd(-8, 8), y: a.y - rnd(0, 4), vx: rnd(-6, 6), vy: -rnd(12, 22), g: 3, life: rnd(1, 1.6), c: pick(["#bfe9ff", "#e8faff", "#8fd0ee"]), sz: 2, a: 0.85 }); }
      },
      body: function (s) { return s.k > 0 ? { alpha: 1 - s.k } : null; },
      under: function (g, s, a) {
        var k = s.k || 0; if (k <= 0) return;
        var hop = Math.abs(Math.sin((s.ph || 0) * PI)), lift = Math.round((4 + (a.moving ? 9 * hop : 2 + 2 * Math.sin((s.ph || 0) * 2 * PI))) * k);
        g.strokeStyle = "rgba(190,235,255,0.5)"; g.lineWidth = 1.5;
        for (var i = 0; i < 2; i++) { var f = (a.now * 0.6 + i * 0.5) % 1; g.globalAlpha = (1 - f) * k; g.beginPath(); g.ellipse(Math.round(a.x), Math.round(a.y), 10 + f * 22, 4 + f * 9, 0, 0, 6.283); g.stroke(); }
        g.globalAlpha = 0.3 * k; var sw = Math.max(6, 18 - lift); P(g, a.x - sw / 2, a.y - 1, sw, 3, "#0c1c30"); g.globalAlpha = 1;
        a.body(g, a.x, a.y - lift, { dir: a.dir, anim: a.moving ? "walk" : "idle", t: s.sl || 0, rot: Math.sin((s.ph || 0) * PI * 0.5) * 0.06, alpha: 0.92 * k });
      }
    },
    demo: { map: ["##############", "#............#", "#.P~~~~~~~~..#", "#..~~~~~~~~..#", "#..~~~~~~~~.D#", "##############"], at: [2, 2], path: [[7, 0, 3.4], [0, 1, 0.8], [0, 0, 1.4]] }
  });

  var MELT = 2.4;
  add("char-046", {
    egg: {
      update: function (s, a) {
        s.ice = s.ice || []; while (s.ice.length && a.now - s.ice[0].t > MELT) s.ice.shift();
        if (!a.player.inShield || !a.moving) { s.lx = null; return; }
        if (s.lx != null) s.d = (s.d || 0) + Math.abs(a.x - s.lx) + Math.abs(a.y - s.ly);
        s.lx = a.x; s.ly = a.y;
        if (s.ice.length && !((s.d || 0) >= 13)) return;
        s.d = 0; s.sd = s.sd ? 0 : 1; var x = a.x + (s.sd ? 3 : -3);
        s.ice.push({ x: x, y: a.y, t: a.now }); if (s.ice.length > 24) s.ice.shift();
        for (var i = 0; i < 2; i++) a.fx({ x: x + rnd(-4, 4), y: a.y, vx: rnd(-30, 30), vy: rnd(-40, -10), g: 80, life: 0.35, c: pick(["#e8faff", "#bdeaff"]), sz: 2, sz2: 1, add: true });
      },
      under: function (g, s, a) {
        (s.ice || []).forEach(function (p) {
          var q = cl((a.now - p.t) / MELT), w = Math.round(16 * (1 - 0.65 * q)), x = Math.round(p.x), y = Math.round(p.y);
          if (w < 3) return;
          g.globalAlpha = 0.9 * (1 - ei(q));
          if (q > 0.45) { var r = w + 4; P(g, x - r / 2, y - 3, r, 1, "#5fa8cc"); P(g, x - r / 2, y + 3, r, 1, "#5fa8cc"); }
          P(g, x - w / 2 + 2, y - 3, w - 4, 1, "#8fd0ee"); P(g, x - w / 2, y - 2, w, 4, "#8fd0ee"); P(g, x - w / 2 + 2, y + 2, w - 4, 1, "#8fd0ee");
          P(g, x - w / 2 + 1, y - 2, w - 2, 2, "#bdeaff"); P(g, x - w / 2 + 2, y - 2, Math.max(1, w - 6), 1, "#e8faff");
          if (q < 0.4) { P(g, x - 2, y - 1, 3, 1, "#5fa8cc"); P(g, x + 1, y, 1, 2, "#5fa8cc"); P(g, x - w / 2 + 2, y - 2, 1, 1, "#ffffff"); }
        });
        g.globalAlpha = 1;
      }
    },
    demo: { map: ["##############", "#............#", "#.P~~~~~~~~..#", "#..~~~~~~~~..#", "#..~~~~~~~~.D#", "##############"], at: [2, 2], path: [[7, 0, 3.4], [0, 1, 0.8], [0, 0, 1.4]] }
  });

  function gold(r, g, b) { return r > 170 && g > 120 && b < 120 && r > b + 60; }
  function litBy(a) {
    var px = a.x, py = a.player.y || a.y - 10, T = a.T, st = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state, i;
    var ns = st && st.npcs || [];
    for (i = 0; i < ns.length; i++) if (ns[i].id === "auditor") { var lx = ns[i].x + 12, ly = ns[i].y - 4; if (Math.sqrt((px - lx) * (px - lx) + (py - ly) * (py - ly)) <= T * 2) return { x: lx, y: ly - 6 }; }
    if (typeof angDiff !== "function" || typeof losClear !== "function" || typeof CONE !== "number") return null;
    for (i = 0; i < a.hunters.length; i++) {
      var h = a.hunters[i]; if (!h || h.type === "dog" || typeof h.dir !== "number") continue;
      var d = Math.sqrt((px - h.x) * (px - h.x) + (py - h.y) * (py - h.y)), V = (typeof visionOf === "function" ? visionOf(h) : 5.5) * T;
      if (d <= V && Math.abs(angDiff(Math.atan2(py - h.y, px - h.x), h.dir)) <= CONE && losClear(h.x, h.y, px, py)) return { x: h.x, y: h.y - 20 };
    }
    return null;
  }
  add("char-047", {
    egg: {
      update: function (s, a) {
        var L = litBy(a);
        if (L && (!s.lit || a.now - s.t0 > 1.6)) { s.t0 = a.now; s.src = L; a.sfx("voice", { f: 2200, slide: 1.4, wave: "sine", vol: 0.03 }); }
        s.lit = !!L;
      },
      over: function (g, s, a) {
        var q = s.t0 != null ? (a.now - s.t0) / 0.7 : 9; if (q < 0 || q >= 1) return;
        var v = scan(a, "visor", gold, 0.45), x0 = v ? v.x0 : -4, x1 = v ? v.x1 : 12, yc = v ? v.y : -a.h + 14, bx = x0 - 4 + (x1 - x0 + 8) * eo(q);
        g.save(); g.globalCompositeOperation = "lighter";
        if (v) v.pts.forEach(function (p) { var o = Math.abs(p.x - bx + (p.y - yc) * 0.7); if (o < 2.5) P(g, a.x + p.x, a.y + p.y, 1, 1, o < 1.2 ? "#ffffff" : "#ffe28a"); });
        else for (var yy = -2; yy <= 2; yy++) P(g, a.x + bx - yy * 0.7, a.y + yc + yy, 2, 1, "#ffffff");
        var sx = Math.round(a.x + (side(a) > 0 ? x1 : x0)), sy = Math.round(a.y + yc), r = Math.round(Math.sin(cl(q * 1.3) * PI) * 5);
        if (r > 0) { P(g, sx - r, sy, r * 2 + 1, 1, "#fff3c0"); P(g, sx, sy - r, 1, r * 2 + 1, "#fff3c0"); P(g, sx - 1, sy - 1, 3, 3, "#ffffff"); }
        if (s.src) {
          var dx = s.src.x - sx, dy = s.src.y - sy, n = Math.sqrt(dx * dx + dy * dy) || 1, len = Math.round(16 * Math.sin(q * PI));
          g.globalAlpha = 0.8 * (1 - q); for (var i = 3; i < len; i++) P(g, sx + dx / n * i, sy + dy / n * i, 1, 1, "#eaba49");
        }
        g.restore();
      }
    },
    demo: { map: ["############", "#..........#", "#.P........#", "#..........#", "#.........D#", "############"], at: [2, 2], path: [[5, 0, 2.0], [0, 0, 2.5]], npcs: [{ id: "auditor", at: [8, 2] }], hunters: [{ type: "hunter", patrol: [[10, 2], [8, 2]] }] }
  });

  function patty(g, x, y, c) {
    var h = Math.max(1, Math.round(3 * Math.abs(c))), X = Math.round(x) - 4, Y = Math.round(y) - h;
    P(g, X - 1, Y - 1, 10, h + 2, "#2e1a0e"); P(g, X, Y, 8, h, c >= 0 ? "#8a5430" : "#6a3a1e");
    if (h > 1) { P(g, X + 2, Y, 1, h, "#4a2a16"); P(g, X + 5, Y, 1, h, "#4a2a16"); }
    if (c >= 0) P(g, X, Y + h - 1, 8, 1, "#f2c230");
  }
  add("char-048", {
    spawn: {
      dur: 2.3,
      update: function (s, a) {
        var sd = side(a), bx = a.x + sd * 18, by = a.y - 19;
        if (a.t > 0.55 && once(s, "toss")) a.sfx("whoosh");
        if (a.t > 1.35 && once(s, "land")) { a.sfx("click"); for (var i = 0; i < 6; i++) a.fx({ x: bx + rnd(-4, 4), y: by - 3, vx: rnd(-10, 10), vy: -rnd(20, 40), g: -10, life: rnd(0.5, 0.9), c: "#e8e6e0", sz: 2, sz2: 4, a: 0.6 }); }
        if (a.t > 1.75 && once(s, "bun")) a.sfx("buy");
      },
      body: function (s, a) { var h = Math.sin(seg(a.t, 0.45, 0.7) * PI); return h > 0 ? { dy: -Math.round(3 * h), sy: 1 + 0.04 * h } : null; },
      over: function (g, s, a) {
        var t = a.t, sd = side(a), k = eo(seg(t, 0, 0.2)) * (1 - seg(t, 2.1, 2.3)); if (k <= 0) return;
        var hx = Math.round(a.x + sd * 8), hy = Math.round(a.y - 17), bx = hx + sd * 10, by = hy - 2 - Math.round(Math.sin(seg(t, 0.45, 0.6) * PI) * 3);
        g.globalAlpha = k;
        P(g, Math.min(hx, hx + sd * 5), hy, 5, 2, "#7a4a22"); P(g, Math.min(hx + sd * 5, hx + sd * 7), hy - 1, 2, 1, "#9aa0a8");
        P(g, Math.min(bx - sd * 3, bx + sd * 4), by, 8, 2, "#9aa0a8"); P(g, Math.min(bx - sd * 3, bx + sd * 4), by, 8, 1, "#d8dde4");
        var u = seg(t, 0.55, 1.35), fy = by - Math.round(Math.sin(u * PI) * 30), c = u > 0 && u < 1 ? Math.cos(u * PI * 3) : u >= 1 ? -1 : 1;
        if (t > 1.35 && t < 1.5) fy += Math.round(Math.sin(seg(t, 1.35, 1.5) * PI) * -2);
        patty(g, bx + sd, fy, c);
        if (t > 1.55) { var w = eo(seg(t, 1.55, 1.75)), ty = fy - 3 - Math.round((1 - w) * 22), X = bx + sd - 5; P(g, X, ty - 3, 10, 4, "#2e1a0e"); P(g, X + 1, ty - 3, 8, 3, "#d8913a"); P(g, X + 2, ty - 4, 6, 1, "#d8913a"); P(g, X + 3, ty - 3, 1, 1, "#fff3d0"); P(g, X + 6, ty - 2, 1, 1, "#fff3d0"); }
        g.globalAlpha = 1;
      }
    }
  });

  function eyes49(r, g, b) { return r > 235 && g > 180 && b > 130 && b < 200; }
  var DRUM = [[0, 82], [0.3, 70], [0.6, 96]];
  add("char-049", {
    egg: {
      update: function (s, a, dt) {
        var k = fade(s, !!near(a, "C", 2.2), dt, 0.6, 0.5);
        if (k < 0.4) { s.bt = 0; s.i = 0; return; }
        s.bt = (s.bt || 0) + dt; if (s.bt >= 1.2) { s.bt -= 1.2; s.i = 0; }
        while ((s.i || 0) < DRUM.length && s.bt >= DRUM[s.i][0]) { a.sfx("voice", { f: DRUM[s.i][1], slide: 0.5, wave: "sine", vol: 0.05 }); s.hit = a.now; s.i = (s.i || 0) + 1; }
        if (Math.random() < dt * 2) a.fx({ x: a.x + rnd(-6, 6), y: a.top + 10, vx: rnd(-8, 8), vy: -rnd(18, 34), g: -4, life: rnd(0.5, 0.9), c: pick(["#ff8a2a", "#ffd04a"]), sz: 2, sz2: 1, add: true });
      },
      over: function (g, s, a) {
        var k = s.k || 0; if (k <= 0) return;
        var e = scan(a, "eyes", eyes49, 0.55), pul = 0.6 + 0.4 * Math.exp(-(a.now - (s.hit || -9)) * 6), C = [];
        if (e) { var L = [0, 0, 0], R = [0, 0, 0]; e.pts.forEach(function (p) { var B = p.x < e.x ? L : R; B[0] += p.x; B[1] += p.y; B[2]++; }); [L, R].forEach(function (B) { if (B[2]) C.push([B[0] / B[2], B[1] / B[2]]); }); }
        else C = [[-3, -a.h + 20], [4, -a.h + 20]];
        g.save(); g.globalCompositeOperation = "lighter";
        C.forEach(function (c) {
          var x = Math.round(a.x + c[0]), y = Math.round(a.y + c[1]);
          g.globalAlpha = 0.25 * k * pul; P(g, x - 4, y - 4, 9, 9, "#ff5a1a");
          g.globalAlpha = 0.45 * k * pul; P(g, x - 2, y - 2, 5, 5, "#ffa040");
          g.globalAlpha = 0.9 * k; P(g, x - 1, y - 1, 3, 3, "#fff0c0");
        });
        if (e) { g.globalAlpha = 0.8 * k * pul; e.pts.forEach(function (p) { P(g, a.x + p.x, a.y + p.y, 1, 1, "#ffd27a"); }); }
        g.restore();
      }
    },
    demo: { map: ["############", "#..........#", "#.P....C...#", "#..........#", "#.........D#", "############"], at: [2, 2], path: [[4, 0, 1.6], [0, 0, 4]] }
  });
})();
(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  if (!BH.levelFx) return;
  var add = BH.levelFx.add;

  function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function cl(q) { return q < 0 ? 0 : q > 1 ? 1 : q; }
  function seg(t, a, b) { return cl((t - a) / (b - a)); }
  function ei(q) { return q * q; }
  function eo(q) { return 1 - (1 - q) * (1 - q); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function once(s, k) { if (s[k]) return false; s[k] = 1; return true; }
  function bump(t, at, w) { var q = (t - at) / w; return q < 0 || q > 1 ? 0 : Math.sin(q * Math.PI); }
  function sd(a) { return a.dir === "left" ? -1 : 1; }
  var RB = ["#ff3b4e", "#ff9a2e", "#ffe23b", "#4cff5a", "#3bd8ff", "#4a6bff", "#c04bff"];

  var SC = {};
  function scan(a, dir, step) {
    var k = a.id + dir + step; if (SC[k]) return SC[k];
    var r = { cells: [], vis: [], top: -46 }, W = 72, H = 80, d = null, c;
    try { c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d"); a.body(g, 36, 74, { dir: dir, anim: "idle", t: 0 }); d = g.getImageData(0, 0, W, H).data; } catch (e) { d = null; }
    if (d && d.length >= W * H * 4) {
      var y0 = H, y1 = 0, x, y, o;
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 16) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
      for (y = y0; y <= y1; y += step) for (x = 0; x < W; x += step) { o = (y * W + x) * 4; if (d[o + 3] > 16) r.cells.push({ x: x - 36, y: y - 74, c: "rgb(" + d[o] + "," + d[o + 1] + "," + d[o + 2] + ")" }); }
      var lim = y0 + (y1 - y0) * 0.36;
      for (y = y0; y < lim; y++) for (x = 0; x < W; x++) { o = (y * W + x) * 4; if (d[o + 3] > 16 && d[o] + d[o + 1] + d[o + 2] > 420) r.vis.push({ x: x - 36, y: y - 74 }); }
      r.top = y0 - 74;
    }
    if (!r.cells.length) { for (var yy = -46; yy < 0; yy += step) for (var xx = -11; xx <= 11; xx += step) if ((xx * xx) / 121 + ((yy + 23) * (yy + 23)) / 529 <= 1) r.cells.push({ x: xx, y: yy, c: "#cfcfcf" }); return r; }
    SC[k] = r; return r;
  }

  function cells50(s, a, d0, d1) {
    s.c = scan(a, a.dir, 2).cells.map(function (c) { var an = Math.atan2(c.y + 23, c.x) + rnd(-0.6, 0.6); return { x: c.x, y: c.y, c: c.c, an: an, d: rnd(d0, d1), sw: rnd(-2, 2) }; });
    var y0 = 0, y1 = -46; s.c.forEach(function (c) { if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y; }); s.y0 = y0; s.hh = Math.max(1, y1 - y0);
  }
  function rb(s, c) { return RB[Math.min(6, Math.max(0, Math.floor((c.y - s.y0) / s.hh * 7)))]; }
  function burst(a) { for (var i = 0; i < 14; i++) { var an = i / 14 * 6.283; a.fx({ x: a.x + Math.cos(an) * 6, y: a.y - 22 + Math.sin(an) * 10, vx: Math.cos(an) * 70, vy: Math.sin(an) * 70, life: 0.45, c: RB[i % 7], sz: 2, add: true }); } }
  var SPAWN050 = { dur: 1.8,
    start: function (s, a) { cells50(s, a, 30, 70); },
    update: function (s, a) {
      if (a.t >= 0.15 && once(s, "w")) a.sfx("whoosh");
      if (a.t >= 1.2 && once(s, "n")) { a.sfx("solved"); burst(a); }
    },
    body: function (s, a) {
      var t = a.t; if (t < 1.2) return { alpha: 0 };
      var q = seg(t, 1.2, 1.7); return { sy: 1 + Math.sin(q * Math.PI) * 0.12 * (1 - q), sx: 1 - Math.sin(q * Math.PI) * 0.06 * (1 - q) };
    },
    over: function (g, s, a) {
      var t = a.t; if (t >= 1.2 || !s.c) return;
      var out = 1 - ei(seg(t, 0.1, 1.15)), back = seg(t, 0.95, 1.15);
      for (var i = 0; i < s.c.length; i++) {
        var c = s.c[i], an = c.an + c.sw * out * 0.5, dd = c.d * out + Math.sin(t * 12 + i) * 1.5 * out;
        g.globalAlpha = Math.min(1, t * 5);
        P(g, a.x + c.x + Math.cos(an) * dd, a.y + c.y + Math.sin(an) * dd * 0.8, 2, 2, back > 0.5 ? c.c : rb(s, c));
      }
    }
  };
  var W050 = { dur: 1.6,
    start: function (s, a) { cells50(s, a, 30, 80); },
    update: function (s, a) {
      if (a.t >= 0.35 && once(s, "b")) { a.sfx("whoosh"); burst(a); }
    },
    body: function (s, a) { return a.t < 0.35 ? { dx: Math.round(Math.sin(a.t * 90)) } : { alpha: 0 }; },
    over: function (g, s, a) {
      var t = a.t; if (t < 0.35 || t >= 1.6 || !s.c) return;
      var out = eo(seg(t, 0.35, 1.3));
      g.globalAlpha = 1 - seg(t, 1.0, 1.6);
      for (var i = 0; i < s.c.length; i++) {
        var c = s.c[i], an = c.an + c.sw * out * 0.5, dd = c.d * out;
        P(g, a.x + c.x + Math.cos(an) * dd, a.y + c.y + Math.sin(an) * dd * 0.8 + 30 * out * out, 2, 2, rb(s, c));
      }
    }
  };
  add("char-050", { win: W050, spawn: SPAWN050 });

  var LC = ["#c9923a", "#b8862b", "#a2552e", "#d4a03c"];
  add("char-054", { demo: { map: ["##########", "#........#", "#P......D#", "#........#", "##########"], at: [1, 2], path: [[6, 0, 2.2], [0, 0, 0.6], [-5, 0, 2]] },
    egg: {
      update: function (s, a, dt) {
        var L = s.L = s.L || [], H = s.H = s.H || [], f = sd(a), i;
        var leafy = a.tileAt(a.x, a.player.y || a.y - 10) === "l";
        s.cd = (s.cd == null ? 0.4 : s.cd) - (a.moving ? dt * (leafy ? 3 : 1) : 0);
        if (a.moving && s.cd <= 0 && L.length < 5) {
          s.cd = rnd(0.7, 1.2);
          var hz = a.dir === "left" || a.dir === "right", ux = hz ? f : 0, uy = a.dir === "up" ? -1 : a.dir === "down" ? 1 : 0;
          L.push({ x: a.x + ux * rnd(36, 54) + (hz ? 0 : rnd(-4, 4)), y: a.top - rnd(4, 12) + uy * rnd(30, 44), gy: a.y + uy * 40, ph: rnd(0, 6), c: LC[Math.floor(Math.random() * 4)], t: 0, land: -1 });
        }
        for (i = L.length - 1; i >= 0; i--) {
          var l = L[i]; l.t += dt;
          if (l.land < 0) { l.y += 26 * dt; l.x += Math.sin(l.t * 4 + l.ph) * 14 * dt; if (l.y >= l.gy) { l.y = l.gy; l.land = l.t; } }
          if (l.land < 0 && Math.abs(l.x - a.x) < 8 && l.y > a.top - 2 && l.y < a.y - 2) {
            H.push({ x: l.x, y: l.y, vx: -14, vy: -12, c: l.c, t: 0, s: -1 }, { x: l.x, y: l.y, vx: 14, vy: -12, c: l.c, t: 0, s: 1 }, { x: l.x, y: l.y, t: 0, cut: 1 });
            L.splice(i, 1); continue;
          }
          if (l.land >= 0 && l.t - l.land > 0.8 || l.t > 6) L.splice(i, 1);
        }
        for (i = H.length - 1; i >= 0; i--) { var h = H[i]; h.t += dt; if (!h.cut) { h.vy += 60 * dt; h.x += h.vx * dt; h.y += h.vy * dt; } if (h.t > (h.cut ? 0.14 : 0.7)) H.splice(i, 1); }
      },
      over: function (g, s, a) {
        var i;
        (s.L || []).forEach(function (l) {
          g.globalAlpha = l.land >= 0 ? 1 - cl((l.t - l.land) / 0.8) : 1;
          if (Math.sin(l.t * 6 + l.ph) > 0) { P(g, l.x - 2, l.y, 4, 2, l.c); P(g, l.x - 1, l.y - 1, 2, 1, l.c); P(g, l.x + 2, l.y + 1, 1, 1, "#6b3a1f"); }
          else { P(g, l.x - 1, l.y - 1, 2, 3, l.c); P(g, l.x, l.y + 2, 1, 1, "#6b3a1f"); }
        });
        for (i = 0; s.H && i < s.H.length; i++) {
          var h = s.H[i];
          if (h.cut) { g.globalAlpha = 1 - h.t / 0.14; for (var k = -5; k <= 5; k++) P(g, h.x + k, h.y - Math.round(k * 0.6), 1, 1, "#ffffff"); continue; }
          g.globalAlpha = 1 - h.t / 0.7; P(g, h.x + (h.s > 0 ? 0 : -2), h.y, 2, 2, h.c); P(g, h.x + (h.s > 0 ? 2 : -3), h.y + 1, 1, 1, h.c);
        }
      }
    } });

  var FW = [[0.05, -22, "#ff3b4e"], [0.45, 18, "#ffffff"], [0.85, -4, "#4a6bff"], [1.3, -30, "#ff3b4e"], [1.6, 28, "#4a6bff"], [1.95, -14, "#ffffff"], [1.95, 12, "#ff3b4e"], [2.0, 0, "#4a6bff"]];
  add("char-062", { win: { dur: 3.0,
    update: function (s, a) {
      FW.forEach(function (r, i) {
        if (a.t >= r[0] && once(s, "l" + i) && i < 6) a.sfx("whoosh");
        if (a.t >= r[0] + 0.55 && once(s, "b" + i)) {
          var bx = a.x + r[1], by = a.top - 34 - (i % 3) * 8, n = 22;
          a.sfx("voice", { f: 110, slide: 0.4, wave: "square", vol: 0.06 });
          for (var k = 0; k < n; k++) { var an = k / n * 6.283, v = rnd(48, 66); a.fx({ x: bx, y: by, vx: Math.cos(an) * v, vy: Math.sin(an) * v, g: 34, life: rnd(0.8, 1.1), c: k % 5 ? r[2] : "#ffe9a0", sz: 2, add: true }); }
          a.fx({ x: bx, y: by, vx: 0, vy: 0, life: 0.12, c: "#ffffff", sz: 7, sz2: 2, add: true });
        }
      });
      if (a.t >= 2.6 && once(s, "c")) a.sfx("crowd");
    },
    body: function (s, a) { return { dy: -Math.round(bump(a.t, 0.55, 0.3) * 4 + bump(a.t, 2.5, 0.3) * 4) }; },
    over: function (g, s, a) {
      FW.forEach(function (r, i) {
        var q = (a.t - r[0]) / 0.55; if (q <= 0 || q >= 1) return;
        var x0 = a.x + Math.round(r[1] * 0.3), y0 = a.y - 6, x1 = a.x + r[1], y1 = a.top - 34 - (i % 3) * 8, e = eo(q);
        var x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e;
        for (var k = 1; k <= 4; k++) { var e2 = eo(Math.max(0, q - k * 0.05)); g.globalAlpha = 0.8 - k * 0.18; P(g, x0 + (x1 - x0) * e2, y0 + (y1 - y0) * e2, 1, 2, "#ffcf6a"); }
        g.globalAlpha = 1; P(g, x - 1, y - 1, 2, 3, r[2]);
      });
    }
  } });
})();
