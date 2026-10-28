"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.tiles) return;

  var FLOW = { "⇒": [1, 0], "⇐": [-1, 0], "⇓": [0, 1], "⇑": [0, -1] }, ROCK = "◍";
  var PUSH = 3.6;
  var S = { rapids: null, night: null }, WM = null, WMat = -1;

  function live(st) { return !!st && typeof L !== "undefined" && L === st.level; }
  function sfxOk(n, o) { try { if (typeof sfx === "function") sfx(n, o); } catch (e) {} }
  function grabWorld(c) { if (typeof liveFrame !== "undefined" && liveFrame) { WM = c.getTransform(); WMat = simTime; } }
  function worldOk() { return WM && WMat === simTime; }

  Object.keys(FLOW).forEach(function (code) {
    var f = FLOW[code];
    BH.tiles.register(code, { water: true, claim: "funrapids", draw: function (b, px, py, x, y) {
      b.fillStyle = "rgba(6,14,40,0.38)"; b.fillRect(px, py, T, T);
      b.fillStyle = "rgba(200,225,255,0.16)";
      for (var k = 0; k < 2; k++) {
        var u = 6 + k * 14 + Math.floor(hash(x * 3 + k, y * 7) * 4), v = 8 + Math.floor(hash(y * 5 + k, x) * 16);
        if (f[0]) { b.fillRect(px + u, py + v, 5, 1); b.fillRect(px + u + (f[0] > 0 ? 3 : -1), py + v - 1, 2, 3); }
        else { b.fillRect(px + v, py + u, 1, 5); b.fillRect(px + v - 1, py + u + (f[1] > 0 ? 3 : -1), 3, 2); }
      }
    } });
  });
  BH.tiles.register(ROCK, { solid: true, water: true, claim: "funrapids", draw: function (b, px, py, x, y) {
    b.fillStyle = C.water; b.fillRect(px, py, T, T);
    b.fillStyle = "rgba(0,0,0,0.35)"; b.fillRect(px + 5, py + 22, 24, 6);
    b.fillStyle = "#55554d"; b.fillRect(px + 5, py + 9, 22, 16); b.fillRect(px + 8, py + 6, 16, 3);
    b.fillStyle = "#77776c"; b.fillRect(px + 8, py + 8, 12, 4); b.fillRect(px + 7, py + 12, 4, 3);
    b.fillStyle = "#3a3a34"; b.fillRect(px + 5, py + 22, 22, 3); b.fillRect(px + 17 + Math.floor(hash(x, y) * 4), py + 14, 2, 6);
  } });

  BH.features.register("funrapids", {
    onLevelStart: function (level, api) {
      var flows = [], rocks = [];
      for (var y = 0; y < grid.length; y++) for (var x = 0; x < grid[y].length; x++) {
        var c = grid[y][x]; if (FLOW[c]) flows.push([x, y, FLOW[c]]); else if (c === ROCK) rocks.push([x, y]);
      }
      S.rapids = { level: level, flows: flows, rocks: rocks, on: false, said: false, spray: 0, rides: 0, pushed: 0 };
    },
    onStep: function (dt, api) {
      var st = S.rapids; if (!live(st) || game.phase !== "play") return;
      var p = api.player, here = tileAt(p.x, p.y), f = FLOW[here];
      if (!f) { st.on = false; return; }
      if (!st.on) { st.on = true; st.rides++; sfxOk("splash"); if (!st.said) { st.said = true; floatText(p.x, p.y - 34, "RAPIDS", C.ice, "", 1.2); } }
      var r = T * 0.3, nx = p.x + f[0] * PUSH * T * dt, ny = p.y + f[1] * PUSH * T * dt;
      if (f[0] && isWater(tileAt(nx, p.y)) && !hitsWall(nx, p.y, r, here, true)) { p.x = nx; st.pushed += PUSH * dt; }
      if (f[1] && isWater(tileAt(p.x, ny)) && !hitsWall(p.x, ny, r, here, true)) { p.y = ny; st.pushed += PUSH * dt; }
      st.spray -= dt;
      if (st.spray <= 0) { st.spray = 0.07; puff(p.x - f[0] * 9, p.y - f[1] * 9 + 4, 2, "rgba(225,240,255,0.85)", 12); }
    },
    onDrawWorld: function (c) {
      grabWorld(c);
      var st = S.rapids; if (!live(st)) return;
      var t = simTime;
      c.fillStyle = "rgba(225,240,255,0.55)";
      st.flows.forEach(function (q) {
        var px = q[0] * T, py = q[1] * T, f = q[2];
        for (var k = 0; k < 3; k++) {
          var h = hash(q[0] * 11 + k, q[1] * 17 - k), ph = ((t * PUSH * T * 1.2 + h * T) % T), len = 5 + Math.floor(h * 6), off = 4 + k * 10 + Math.floor(h * 4);
          var s = f[0] > 0 || f[1] > 0 ? ph : T - ph, l = Math.min(len, T - s);
          if (f[0]) c.fillRect(px + (f[0] > 0 ? s : s - l), py + off, l, 1);
          else c.fillRect(px + off, py + (f[1] > 0 ? s : s - l), 1, l);
        }
      });
      st.rocks.forEach(function (q) {
        var x = q[0] * T + 16, y = q[1] * T + 16, a = 0.25 + 0.15 * Math.sin(t * 6 + q[0]);
        c.strokeStyle = "rgba(230,245,255," + a.toFixed(3) + ")"; c.lineWidth = 2;
        c.beginPath(); c.arc(x, y, 15 + Math.sin(t * 9 + q[1]) * 1.5, 0, 6.283); c.stroke();
      });
    }
  });

  var off = null, oc = null;
  BH.features.register("funnight", {
    onLevelStart: function (level, api) {
      var flies = [];
      for (var i = 0; i < 14; i++) flies.push({ x: (1 + api.rng() * (cols - 2)) * T, y: (1 + api.rng() * (rows - 2)) * T, ph: api.rng() * 6.283, sp: 0.3 + api.rng() * 0.5 });
      S.night = { level: level, flies: flies };
    },
    onDrawWorld: function (c) { grabWorld(c); }
  });
  function hardcore() { try { return !!(window.save && save.hardcore) || /[?&]hardcore\b/.test(location.search); } catch (e) { return false; } }
  var prevLoad = window.loadLevel;
  if (typeof prevLoad === "function") window.loadLevel = function (i) {
    var lv = window.LEVELS && LEVELS[i], had = lv && lv.features;
    S.night = null; S.rapids = null;
    if (lv && hardcore() && (had || []).indexOf("funnight") < 0) lv.features = (had || []).concat("funnight");
    try { return prevLoad.apply(this, arguments); } finally { if (lv) lv.features = had; }
  };
  BH.funRides = BH.funRides || {}; BH.funRides.hardcore = hardcore;
  function fly(q, t) { return { x: q.x + Math.sin(t * q.sp + q.ph) * T * 1.6, y: q.y + Math.sin(t * q.sp * 1.7 + q.ph * 2) * T * 0.9, a: 0.5 + 0.5 * Math.sin(t * 3 + q.ph * 5) }; }
  function hole(x, y, r, a) {
    var g = oc.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(0.6, "rgba(0,0,0," + (a * 0.7).toFixed(3) + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
    oc.fillStyle = g; oc.beginPath(); oc.arc(x, y, r, 0, 6.283); oc.fill();
  }
  function drawNight(c, st) {
    if (!worldOk()) return;
    var cw = canvas.width, ch = canvas.height, t = simTime;
    if (!off) { off = document.createElement("canvas"); oc = off.getContext("2d"); }
    if (off.width !== cw || off.height !== ch) { off.width = cw; off.height = ch; }
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalCompositeOperation = "source-over"; oc.clearRect(0, 0, cw, ch);
    oc.fillStyle = "rgba(3,5,14,0.93)"; oc.fillRect(0, 0, cw, ch);
    oc.globalCompositeOperation = "destination-out"; oc.setTransform(WM);
    var saved = ctx;
    try {
      hunters.forEach(function (h) {
        if (h.type === "dog") return;
        var vis = visionOf(h) * T, g = oc.createRadialGradient(h.x, h.y, 4, h.x, h.y, vis);
        g.addColorStop(0, "rgba(0,0,0,0.95)"); g.addColorStop(0.75, "rgba(0,0,0,0.7)"); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx = oc; conePoly(h.x, h.y, h.dir, CONE, vis, 22); ctx = saved; oc.fillStyle = g; oc.fill();
        hole(h.x, h.y, T * 1.5, 0.9);
      });
      if (typeof towers !== "undefined") towers.forEach(function (w) {
        ctx = oc; conePoly(w.x, w.y, w.a, TOWER_HALF, TOWER_RANGE * T, 16); ctx = saved; oc.fillStyle = "rgba(0,0,0,0.8)"; oc.fill();
      });
    } finally { ctx = saved; }
    hole(player.x, player.y - 6, T * 1.7, 0.6);
    if (dens) hole(dens.x, dens.y, T * 2.2, 0.5);
    (coins || []).forEach(function (q) { if (!q.got) hole(q.x, q.y, T * 0.7, 0.55); });
    st.flies.forEach(function (q) { var f = fly(q, t); hole(f.x, f.y, T * 0.8, (0.35 * f.a).toFixed(3)); });
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(off, 0, 0); c.setTransform(WM);
    c.globalCompositeOperation = "lighter";
    st.flies.forEach(function (q) { var f = fly(q, t); c.fillStyle = "rgba(240,230,120," + (0.4 + 0.6 * f.a).toFixed(3) + ")"; c.fillRect(f.x - 1, f.y - 1, 2, 2); });
    c.globalCompositeOperation = "source-over";
    hunters.forEach(function (h) { if (h.type !== "dog") return; c.fillStyle = C.red; c.fillRect(h.x - 4, h.y - 6, 2, 2); c.fillRect(h.x + 2, h.y - 6, 2, 2); });
    c.restore();
  }

  var prevVig = window.drawVignette;
  if (typeof prevVig === "function") window.drawVignette = function () {
    var r = prevVig.apply(this, arguments);
    try {
      if (live(S.night)) drawNight(ctx, S.night);
    } catch (e) { if (typeof trace !== "undefined") trace.push("funrides draw " + e.message); }
    return r;
  };

  BH.funRides.state = function () {
    var r = S.rapids;
    return {
      rapids: live(r) ? { rides: r.rides, pushed: +r.pushed.toFixed(2), flows: r.flows.length, rocks: r.rocks.length } : null,
      night: live(S.night) ? { flies: S.night.flies.length } : null
    };
  };
})();
