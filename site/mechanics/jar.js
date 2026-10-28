(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  if (!BH.tiles || !BH.features || typeof startFeatures !== "function") return;

  var FLY = 0.9, FALL = 0.35, BOUNCE = 0.8, HOP = 0.35, AMB = 7, WALK = 1.1 * T, LAYERS = 3, JAR_SHOW = 20;
  var S = null;

  function R(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(Math.round(x), Math.round(y), w, h); }
  function now() { return simTime; }
  function find(code) {
    var out = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) if (grid[y][x] === code) out.push([x, y]);
    return out;
  }
  function wanted(lv) {
    if (!lv) return false;
    if (lv.shelfTracker) return true;
    return (lv.map || []).some(function (r) { return r.indexOf("Z") >= 0 || r.indexOf("j") >= 0; });
  }
  function fresh() {
    var shelf = find("Z"), jar = find("j")[0] || null, seen = typeof WeakSet === "function" ? new WeakSet() : null;
    if (BH.river && BH.river.log && seen) BH.river.log.forEach(function (r) { seen.add(r); });
    S = { shelf: shelf, jar: jar ? { x: (jar[0] + 0.5) * T, y: (jar[1] + 0.5) * T } : null, seen: seen,
      boxes: [], tokens: 0, ids: {}, flying: [], bounced: 0, bouncing: [], ambient: 0, ambT: 0, made: 0,
      hop: 0, hopT: 0, cycle: [], cycles: [], done: 0, tracker: null, demo: null };
    shelf.forEach(function () { S.boxes.push({ t0: -99 }); });
    var wp = L.shelfTracker;
    if (wp && wp.length) {
      var pts = wp.map(function (p) { return { x: (p[0] + 0.5) * T, y: (p[1] + 0.5) * T }; });
      S.tracker = { pts: pts, i: 0, x: pts[0].x, y: pts[0].y, dir: 0, step: 0 };
    }
  }

  function slot(i) {
    var n = S.shelf.length; if (!n) return null;
    var p = S.shelf[i % n], layer = Math.min(LAYERS - 1, Math.floor(i / n));
    return { x: (p[0] + 0.5) * T, y: (p[1] + 1) * T - 10 - layer * 9 };
  }
  function addBox(ambient) {
    if (!S.shelf.length) return;
    S.boxes.push({ t0: now() });
    if (ambient) S.ambient++; else S.made++;
  }
  function drop(id, x, y) {
    if (!S || !S.jar) return false;
    S.flying.push({ id: String(id), x: x, y: y, t0: now() });
    return true;
  }
  function land(f) {
    if (S.ids[f.id]) { S.bounced++; S.bouncing.push({ x: S.jar.x, y: S.jar.y - 14, t0: now(), s: f.x < S.jar.x ? -1 : 1 }); sfx("click"); return; }
    S.ids[f.id] = true; S.tokens++; sfx("coin");
  }
  function demoDouble() {
    if (!S || !S.jar) return false;
    var k = "demo" + (S.demo ? S.demo.k + 1 : 0), cx = S.jar.x - 2 * T, cy = S.jar.y + 2;
    S.demo = { k: S.demo ? S.demo.k + 1 : 0, x: cx, y: cy, t0: now() };
    drop(k, cx, cy - 10);
    S.flying.push({ id: k, x: cx, y: cy - 10, t0: now() + FLY + 0.3 });
    return true;
  }

  function ambientSpot() {
    var w = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      if (grid[y][x] !== "~") continue;
      if (Math.hypot((x + 0.5) * T - player.x, (y + 0.5) * T - player.y) < 5 * T) continue;
      w.push([x, y]);
    }
    if (!w.length) return null;
    var p = w[Math.floor(hash(S.ambient + 3, game.levelIdx + 11) * w.length) % w.length];
    return { x: (p[0] + 0.5) * T, y: (p[1] + 0.5) * T };
  }

  function step(dt) {
    var t = now(), log = BH.river && BH.river.log;
    if (log && S.seen) for (var i = 0; i < log.length; i++) {
      var r = log[i]; if (S.seen.has(r)) continue;
      S.seen.add(r);
      addBox(false);
      if (r.dir === "out") drop("n" + levelStart + ":" + i + ":" + r.t, r.x, r.y);
    }
    if (S.shelf.length) {
      S.ambT += dt;
      if (S.ambT >= AMB) {
        S.ambT = 0;
        var a = ambientSpot();
        if (a) { if (BH.river && BH.river.ripple) BH.river.ripple(a.x, a.y); addBox(true); }
      }
      S.hopT += dt;
      if (S.hopT >= HOP) {
        S.hopT = 0;
        S.cycle.push(S.hop);
        S.hop++;
        if (S.hop >= S.boxes.length) { S.cycles.push(S.cycle); S.done++; if (S.cycles.length > 4) S.cycles.shift(); S.cycle = []; S.hop = 0; }
      }
    }
    S.flying = S.flying.filter(function (f) { if (t - f.t0 < FLY) return true; land(f); return false; });
    S.bouncing = S.bouncing.filter(function (b) { return t - b.t0 < BOUNCE; });
    if (S.demo && t - S.demo.t0 > 2 * FLY + 0.3 + BOUNCE) S.demo = null;
    var k = S.tracker;
    if (k) {
      var to = k.pts[k.i], dx = to.x - k.x, dy = to.y - k.y, d = Math.hypot(dx, dy), v = WALK * dt;
      if (d <= v) { k.x = to.x; k.y = to.y; k.i = (k.i + 1) % k.pts.length; }
      else { k.x += dx / d * v; k.y += dy / d * v; k.step++; }
      var s = slot(S.hop); if (s) k.dir = Math.atan2(s.y - k.y, s.x - k.x);
    }
  }

  function drawBox(g, x, y) {
    x = Math.round(x); y = Math.round(y);
    R(g, x - 5, y - 3, 10, 7, "#7a4a24"); R(g, x - 5, y - 3, 10, 2, "#9a6232");
    R(g, x - 6, y - 5, 12, 3, "#5a3418"); R(g, x - 1, y - 5, 2, 9, C.gold);
  }
  function drawToken(g, x, y) {
    x = Math.round(x); y = Math.round(y);
    R(g, x - 3, y - 2, 6, 4, "#2a4a5e"); R(g, x - 2, y - 2, 4, 1, C.ice); R(g, x - 1, y, 2, 1, "#13202c");
  }
  function drawShelf(g) {
    var t = now();
    S.boxes.forEach(function (b, i) {
      var s = slot(i); if (!s) return;
      var k = Math.min(1, (t - b.t0) / FALL);
      drawBox(g, s.x, s.y - (1 - k * k) * 22);
    });
  }
  function drawJar(g) {
    if (!S.jar) return;
    var t = now(), jx = S.jar.x, jy = S.jar.y, n = Math.min(S.tokens, JAR_SHOW);
    for (var i = 0; i < n; i++) drawToken(g, jx - 6 + (i % 4) * 4, jy + 7 -Math.floor(i / 4) * 3);
    R(g, jx - 7, jy - 6, 2, 16, "rgba(191,233,255,0.35)");
    S.flying.forEach(function (f) {
      var k = (t - f.t0) / FLY; if (k < 0) { drawToken(g, f.x, f.y); return; }
      var x = f.x + (jx - f.x) * k, y = f.y + (jy - 12 - f.y) * k - Math.sin(k * Math.PI) * 40;
      drawToken(g, x, y);
    });
    S.bouncing.forEach(function (b) {
      var k = (t - b.t0) / BOUNCE;
      g.globalAlpha = 1 - k;
      drawToken(g, b.x + b.s * k * 30, b.y - Math.sin(k * Math.PI) * 18 + k * 10);
      g.globalAlpha = 1;
    });
    if (S.demo) drawCrook(g, S.demo.x, S.demo.y);
  }
  function drawCrook(g, x, y) {
    x = Math.round(x); y = Math.round(y);
    R(g, x - 7, y + 8, 14, 3, "rgba(0,0,0,0.3)");
    R(g, x - 6, y - 4, 12, 12, "#3a2d3e"); R(g, x - 6, y + 6, 4, 3, "#1e1620"); R(g, x + 2, y + 6, 4, 3, "#1e1620");
    R(g, x - 5, y - 13, 10, 9, "#2a2030"); R(g, x - 3, y - 10, 6, 4, "#d9b38c"); R(g, x - 3, y - 9, 6, 1, "#1b1b1b");
  }
  function drawTracker(g) {
    var k = S.tracker; if (!k) return;
    var x = Math.round(k.x), y = Math.round(k.y), bob = Math.sin(k.step / 5) > 0 ? 1 : 0;
    R(g, x - 7, y + 8, 14, 3, "rgba(0,0,0,0.3)");
    R(g, x - 6, y - 4 + bob, 12, 12, "#3c4652"); R(g, x - 6, y + 6 + bob, 4, 3, "#20262e"); R(g, x + 2, y + 6 + bob, 4, 3, "#20262e");
    R(g, x - 4, y - 10 + bob, 8, 6, "#d9b38c"); R(g, x - 6, y - 5 + bob, 12, 2, "#7d8890");
    R(g, x - 7, y - 12 + bob, 14, 2, "#1b1b1b"); R(g, x - 4, y - 16 + bob, 8, 4, "#1b1b1b");
    var lx = Math.round(x + Math.cos(k.dir) * 10), ly = Math.round(y + Math.sin(k.dir) * 10);
    R(g, lx - 3, ly - 3, 6, 6, "#7d8890"); R(g, lx - 2, ly - 2, 4, 4, "rgba(191,233,255,0.7)"); R(g, lx + 2, ly + 2, 2, 3, C.wood);
    var s = slot(S.hop); if (!s) return;
    var a = Math.min(1, S.hopT / 0.12), p = slot(S.hop > 0 ? S.hop - 1 : S.hop);
    var qx = p.x + (s.x - p.x) * a, qy = s.y - 16 - Math.sin(a * Math.PI) * 6;
    R(g, qx - 6, qy - 8, 12, 12, "rgba(27,27,27,0.85)");
    g.fillStyle = C.gold; g.font = "600 12px 'Plex Cond', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("?", Math.round(qx), Math.round(qy - 2));
  }

  BH.features.register("jar", {
    onStep: function (dt) { if (S) step(dt); },
    onDrawWorld: function (g) { if (!S) return; drawShelf(g); drawJar(g); drawTracker(g); }
  });

  var coreStart = startFeatures;
  startFeatures = function () {
    var r = coreStart.apply(this, arguments);
    S = null;
    if (typeof L === "undefined" || !wanted(L)) return r;
    fresh();
    if (!activeFeatures.some(function (f) { return f.id === "jar"; })) {
      var api = Object.create(featureApi); api.id = "jar"; api.state = {};
      activeFeatures.push({ id: "jar", def: BH.features.get("jar"), api: api });
    }
    return r;
  };

  BH.jar = {
    demoDouble: demoDouble,
    drop: drop,
    info: function () {
      if (!S) return null;
      return { tokens: S.tokens, flying: S.flying.length, bounced: S.bounced, boxes: S.boxes.length, shelf: S.shelf.length, made: S.made,
        ambient: S.ambient, hop: S.hop, done: S.done, cycles: S.cycles.map(function (c) { return c.slice(); }), demo: !!S.demo,
        tracker: S.tracker ? { x: S.tracker.x, y: S.tracker.y, mode: S.tracker.mode || null } : null,
        shrug: false, pile: null };
    }
  };

  BH.tiles.register("Z", { solid: true, claim: "jar", draw: function (b, x, y) {
    R(b, x, y + 2, T, T - 8, "#2b1d14");
    R(b, x, y + T - 7, T, 4, C.wood); R(b, x, y + T - 7, T, 1, "#86592f");
    R(b, x + 1, y + 2, 3, T - 3, "#4e3520"); R(b, x + T - 4, y + 2, 3, T - 3, "#4e3520");
  } });
  BH.tiles.register("j", { solid: true, claim: "jar", draw: function (b, x, y) {
    R(b, x + 6, y + T - 4, T - 12, 3, "rgba(0,0,0,0.3)");
    R(b, x + 7, y + 8, T - 14, T - 12, "rgba(191,233,255,0.12)");
    R(b, x + 7, y + 8, 2, T - 12, "rgba(191,233,255,0.55)"); R(b, x + T - 9, y + 8, 2, T - 12, "rgba(191,233,255,0.55)");
    R(b, x + 7, y + T - 6, T - 14, 2, "rgba(191,233,255,0.55)");
    R(b, x + 9, y + 4, T - 18, 4, "#5a3418"); R(b, x + 9, y + 4, T - 18, 1, C.gold);
  } });
})();
