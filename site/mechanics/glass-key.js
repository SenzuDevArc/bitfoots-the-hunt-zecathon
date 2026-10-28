(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  if (!BH.features) return;

  var REACH = 1.15, GOLD_IN = 0.5, PAW_T = 0.9, GATE_AT = 1.9, POOL = 0.85;
  var S = null, key = null;

  function R(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(x, y, w, h); }
  function fresh() { S = { shown: false, t0: 0, shows: 0, opened: 0, gated: false, paw: false, box: null, drawn: 0, hidden: 0, marks: [], labels: [], tops: {} }; }
  function sync() {
    var k = game.levelIdx + ":" + levelStart;
    if (k !== key) { key = k; fresh(); }
    if (typeof activeFeatures !== "undefined" && auditorDef() && !activeFeatures.some(function (f) { return f.id === "glasskey"; })) {
      var api = Object.create(featureApi); api.id = "glasskey"; api.state = {};
      activeFeatures.push({ id: "glasskey", def: BH.features.get("glasskey"), api: api });
    }
    return S;
  }
  function auditorDef() { return L && (L.npcs || []).filter(function (d) { return d.id === "auditor"; })[0] || null; }
  function auditor() {
    var d = auditorDef(); if (!d) return null;
    var st = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state, list = st && st.npcs;
    var e = list && list.filter(function (n) { return n.id === "auditor"; })[0];
    return e || { id: "auditor", x: (d.at[0] + 0.5) * T, y: (d.at[1] + 0.5) * T };
  }
  function nearPost(a) {
    var best = 1e9;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) if (grid[y][x] === "U") best = Math.min(best, Math.hypot((x + 0.5) * T - player.x, (y + 0.5) * T - player.y));
    return best < Math.hypot(a.x - player.x, a.y - player.y);
  }
  function askShown() {
    if (!S || S.shown || game.phase !== "play") return false;
    var a = auditor(); if (!a) return false;
    return Math.hypot(a.x - player.x, a.y - player.y) <= T * REACH && !nearPost(a);
  }
  function now() { return simTime; }

  function show() {
    sync();
    if (!askShown()) return false;
    S.shown = true; S.t0 = now(); S.shows++; S.box = null;
    var a = auditor();
    if (typeof sfx === "function") sfx("buy");
    if (typeof ring === "function") ring(a.x, a.y - 10, "rgba(234,186,73,0.85)", T * 1.6, 0.6);
    return true;
  }

  function seenByHunter(x, y) {
    if (typeof hunters === "undefined") return false;
    return hunters.some(function (h) {
      var d = Math.hypot(x - h.x, y - h.y);
      if (h.type === "dog") return d <= D_SENSE * T;
      if (d <= SENSE * T) return true;
      if (d > visionOf(h) * T || Math.abs(angDiff(Math.atan2(y - h.y, x - h.x), h.dir)) > CONE) return false;
      return losClear(h.x, h.y, x, y);
    });
  }

  function step() {
    if (!S.shown) return;
    var t = now() - S.t0;
    if (!S.paw && t >= GOLD_IN + PAW_T * 0.6) {
      S.paw = true;
      if (typeof floatText === "function") floatText(player.x, player.y - 22, "CAN'T SPEND", C.ice);
      if (typeof sfx === "function") sfx("click");
    }
    if (!S.gated && t >= GATE_AT) {
      S.gated = true;
      if (L.gateBy === "key" && BH.river && BH.river.openGates) S.opened = BH.river.openGates();
    }
  }

  function drawKey(g, x, y) {
    R(g, x - 5, y - 4, 8, 8, "#13202c"); R(g, x - 4, y - 3, 6, 6, C.ice); R(g, x - 2, y - 1, 2, 2, "#13202c");
    R(g, x - 4, y - 3, 2, 2, "#ffffff");
    R(g, x + 3, y - 1, 9, 3, "#13202c"); R(g, x + 3, y, 8, 1, C.ice);
    R(g, x + 8, y + 2, 2, 3, "#13202c"); R(g, x + 11, y + 2, 2, 4, "#13202c"); R(g, x + 8, y + 2, 1, 2, C.ice); R(g, x + 11, y + 2, 1, 3, C.ice);
  }
  function drawPool(g, x, y, a) {
    var r = T * POOL, pg = g.createRadialGradient(x, y, 2, x, y, r);
    pg.addColorStop(0, "rgba(234,186,73," + (0.5 * a).toFixed(3) + ")"); pg.addColorStop(1, "rgba(234,186,73,0)");
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = pg; g.beginPath(); g.ellipse(x, y + 4, r, r * 0.6, 0, 0, 6.283); g.fill(); g.restore();
  }
  function drawPin(g, x, y, a) {
    g.save(); g.globalAlpha = a;
    R(g, x - 4, y - 1, 8, 6, "#5a3418"); R(g, x - 4, y - 1, 8, 2, C.gold); R(g, x - 1, y - 1, 2, 6, C.gold);
    g.restore();
  }
  function markTop(m) {
    if (S.tops[m.k] != null) return S.tops[m.k];
    var st = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state, top = m.y - 19 - T;
    ((st && st.npcs) || []).forEach(function (n) {
      if (n.topY != null && Math.abs(n.x - m.x) < T * 0.8 && Math.abs(n.y - m.y) < T * 0.8) top = Math.min(top, Math.round(n.topY) - 26);
    });
    return (S.tops[m.k] = top);
  }
  function drawMark(g, m) {
    var x = m.x, text = m.text;
    g.save(); g.globalAlpha = m.a;
    g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = Math.ceil(g.measureText(text).width) + 10, top = markTop(m);
    R(g, x - w / 2, top, w, 13, "rgba(0,0,0,0.82)"); R(g, x - w / 2, top + 12, w, 1, C.gold);
    g.fillStyle = C.gold; g.fillText(text, x, top + 7);
    g.restore();
  }
  function drawPaw(g, a, t) {
    var k = (t - GOLD_IN) / PAW_T; if (k <= 0 || k >= 1.25) return;
    var sx = a.x + 8, sy = a.y - 8, ex = player.x + (player.x - sx) * 0.35, ey = player.y - 6 + (player.y - sy) * 0.35;
    var x = Math.round(sx + (ex - sx) * Math.min(1, k)), y = Math.round(sy + (ey - sy) * Math.min(1, k)), al = k > 1 ? (1.25 - k) * 4 : k > 0.55 ? 0.45 : 0.85;
    g.save(); g.globalAlpha = al;
    R(g, x - 4, y - 3, 8, 6, C.ice); R(g, x - 5, y - 6, 2, 3, C.ice); R(g, x - 1, y - 7, 2, 3, C.ice); R(g, x + 3, y - 6, 2, 3, C.ice);
    R(g, x - 2, y - 1, 4, 3, "#fffaf0");
    g.restore();
  }
  function askBox(g, cx, y, text) {
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var label = TOUCH ? "TAP: " + text : text, kw = TOUCH ? 0 : 16, tw = g.measureText(label).width, w = tw + 14 + (kw ? kw + 6 : 0), x0 = cx - w / 2;
    if (typeof view === "object" && view && view.x1 > view.x0) x0 = Math.max(view.x0 + 4, Math.min(view.x1 - w - 4, x0));
    var pulse = 0.5 + 0.5 * Math.sin(simTime * 5);
    g.fillStyle = "rgba(0,0,0,0.82)"; g.fillRect(x0, y - 11, w, 22);
    g.strokeStyle = C.gold; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y - 10.5, w - 1, 21);
    if (kw) {
      var kx = x0 + 5, ky = y - 8, dn = pulse > 0.85 ? 1 : 0;
      g.fillStyle = "#8a5e10"; g.fillRect(kx, ky + 2, kw, 15);
      g.fillStyle = C.gold; g.fillRect(kx, ky + dn, kw, 14);
      g.fillStyle = "#1f130a"; g.font = "800 10px 'Plex Mono', monospace"; g.fillText("E", kx + kw / 2, ky + 7 + dn);
      g.font = "700 9px 'Plex Mono', monospace";
    }
    g.fillStyle = C.gold; g.textAlign = "left"; g.fillText(label, x0 + 7 + (kw ? kw + 6 : 0), y);
    g.restore();
    return { x: x0 + w / 2, y: y, w: w, h: 22 };
  }

  function drawWorld(g) {
    var a = auditor(); if (!a) return;
    var t = S.shown ? now() - S.t0 : 0;
    S.drawn = 0; S.hidden = 0; S.marks = []; S.labels = [];
    if (S.shown) {
      var rows_ = (BH.river && BH.river.log) || [];
      rows_.forEach(function (r, i) {
        var a2 = Math.max(0, Math.min(1, (t - GOLD_IN * 0.6 - i * 0.2) / 0.35));
        if (a2 <= 0) return;
        drawPool(g, r.x, r.y, a2);
        if (seenByHunter(r.x, r.y)) { S.hidden++; return; }
        var text = (r.dir === "out" ? "OUT " : "IN ") + r.n;
        drawPin(g, Math.round(r.x), Math.round(r.y), a2);
        S.labels.push({ k: i, x: Math.round(r.x), y: Math.round(r.y), text: text, a: a2 });
        S.drawn++; S.marks.push({ x: r.x, y: r.y, text: text });
      });
      var ky = (a.topY != null ? a.topY : a.y - 40) - 34 + Math.sin(now() * 2.5) * 1.5, fly = Math.min(1, t / 0.4);
      g.save(); g.translate(Math.round(player.x + (a.x - 8 - player.x) * fly), Math.round(player.y - 30 + (ky - player.y + 30) * fly)); g.scale(2, 2);
      drawKey(g, 0, 0); g.restore();
      drawPaw(g, a, t);
      S.box = null;
    } else if (askShown()) S.box = askBox(g, a.x, a.y + T * 1.05, "SHOW MY GLASS KEY");
    else S.box = null;
    if (BH.keys && BH.keys.draw) BH.keys.draw(g, a, S.shown ? t : -1, seenByHunter);
  }

  addEventListener("keydown", function (e) {
    if ((e.code === "KeyE" || e.key === "e" || e.key === "E") && !e.repeat && S && show()) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  addEventListener("pointerdown", function (e) {
    if (!S || !S.box || !askShown() || !zoom || typeof cam === "undefined") return;
    var b = S.box, vw = W / zoom, vh = H / zoom, cx = clampCam(cam.x, vw, cols * T), cy = clampCam(cam.y, vh, rows * T);
    var sx = W / 2 + (b.x - cx) * zoom, sy = H / 2 + (b.y - cy) * zoom, r = e.target && e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : { left: 0, top: 0 };
    var x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.abs(x - sx) < b.w * zoom / 2 + 14 && Math.abs(y - sy) < b.h * zoom / 2 + 14 && show()) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  BH.glasskey = {
    shown: function () { sync(); return S.shown; },
    info: function () {
      sync();
      return { shown: S.shown, shows: S.shows, asking: askShown(), drawn: S.drawn, hidden: S.hidden, marks: S.marks.slice(), paw: S.paw, gated: S.gated, opened: S.opened };
    }
  };

  function live() { return !!S && typeof activeFeatures !== "undefined" && activeFeatures.some(function (f) { return f.id === "glasskey"; }); }
  var wrapped = false;
  function overTrees() {
    var base = window.drawWorld;
    if (wrapped || typeof base !== "function") return;
    wrapped = true;
    window.drawWorld = function () {
      var r = base.apply(this, arguments);
      if (live() && S.shown && S.labels) S.labels.forEach(function (m) { drawMark(ctx, m); });
      if (live() && BH.keys && BH.keys.drawTop) BH.keys.drawTop(ctx);
      return r;
    };
  }

  BH.features.register("glasskey", {
    onLevelStart: function () { sync(); overTrees(); },
    onStep: function () { sync(); step(); },
    onDrawWorld: function (g) { sync(); overTrees(); drawWorld(g); }
  });
  (window.LEVELS || []).forEach(function (l) {
    if ((l.npcs || []).some(function (d) { return d.id === "auditor"; }) && (l.features || []).indexOf("glasskey") < 0) l.features = (l.features || []).concat(["glasskey"]);
  });
})();
