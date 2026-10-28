(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  if (!BH.features || typeof startFeatures !== "function") return;

  var BOARD = [16, 1], SIGN = [14, 3], SLOTS = 12, OLD = 7, FLY = 0.9, GLOW = 2.4, TICK = 0.12;
  var S = null;

  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function now() { return simTime; }
  function wanted(lv) { return !!lv && !!lv.tags; }
  function fresh() {
    BOARD = L.tags && L.tags.board || [16, 1]; SIGN = L.tags && L.tags.sign || [14, 3];
    var seen = typeof WeakSet === "function" ? new WeakSet() : null;
    if (BH.river && BH.river.log && seen) BH.river.log.forEach(function (r) { seen.add(r); });
    var lit = [];
    for (var i = 0; i < SLOTS; i++) lit.push(i < OLD ? { t0: -99, mine: false, k: Math.floor(hash(i + 5, 61) * 4) } : null);
    S = { seen: seen, lit: lit, fly: [], posted: 0, total: null, shown: null, tickT: 0, glowT: -99 };
  }
  function slotAt(i) {
    var bx = BOARD[0] * T, by = BOARD[1] * T;
    return { x: bx + 11 + (i % 4) * 14, y: by + 19 + Math.floor(i / 4) * 8 };
  }
  function nextSlot() { for (var i = 0; i < SLOTS; i++) if (!S.lit[i]) return i; return -1; }
  function post(x, y) {
    var i = nextSlot(); if (i < 0) return;
    S.lit[i] = { t0: 1e9, mine: true, k: S.posted % 4 };
    S.fly.push({ i: i, x: x, y: y - 10, t0: now() });
    S.posted++;
  }
  function riverTotal() {
    var j = BH.jar && BH.jar.info && BH.jar.info(), p = j && j.pile;
    var n = p ? p.coins + (p.flying ? 1 : 0) : 0;
    n += (player.stash | 0) + (player.inShield ? (player.carry | 0) : 0);
    return Math.max(0, n);
  }
  function step(dt) {
    var log = BH.river && BH.river.log, t = now();
    if (log && S.seen) for (var i = 0; i < log.length; i++) {
      var r = log[i]; if (S.seen.has(r)) continue;
      S.seen.add(r);
      if (r.dir === "out") post(r.x, r.y);
    }
    S.fly = S.fly.filter(function (f) {
      if (t - f.t0 < FLY) return true;
      S.lit[f.i].t0 = t; S.glowT = t;
      if (typeof sfx === "function") sfx("click");
      return false;
    });
    var target = riverTotal();
    if (S.shown == null) S.shown = target;
    if (target === S.shown) S.tickT = 0;
    else {
      S.tickT += dt;
      if (S.tickT >= TICK) { S.tickT = 0; S.shown = Math.max(0, S.shown + (target > S.shown ? 1 : -1)); }
    }
    S.total = target;
  }

  function drawTag(g, x, y, k, col, hi) {
    x = Math.round(x); y = Math.round(y);
    R(g, x - 5, y - 3, 10, 6, "#13202c"); R(g, x - 4, y - 2, 8, 4, col);
    R(g, x - 4, y - 2, 8, 1, hi);
    R(g, x - 3 + k, y, 1, 1, "#13202c"); R(g, x + 1 - (k % 2), y, 1, 1, "#13202c"); R(g, x + 2, y - 1 + (k > 1 ? 1 : 0), 1, 1, "#13202c");
  }
  function drawBoard(g) {
    var t = now(), bx = BOARD[0] * T, by = BOARD[1] * T, w = 2 * T;
    R(g, bx + 6, by + 40, 4, 24, "#4e3520"); R(g, bx + w - 10, by + 40, 4, 24, "#4e3520");
    R(g, bx + 7, by + 40, 1, 24, C.wood); R(g, bx + w - 9, by + 40, 1, 24, C.wood);
    R(g, bx + 4, by + 62, 8, 2, "rgba(0,0,0,0.3)"); R(g, bx + w - 12, by + 62, 8, 2, "rgba(0,0,0,0.3)");
    R(g, bx + 1, by + 2, w - 2, 40, "#2a1a0e"); R(g, bx + 2, by + 3, w - 4, 38, "#5a3c22");
    R(g, bx + 2, by + 3, w - 4, 1, "#86592f"); R(g, bx + 2, by + 14, w - 4, 1, "#3a2614");
    R(g, bx + 4, by + 4, w - 8, 9, "#1f130a");
    g.save(); g.font = "600 7px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = C.ice; g.fillText("USED TAGS", bx + w / 2, by + 9);
    g.restore();
    for (var i = 0; i < SLOTS; i++) {
      var s = slotAt(i), l = S.lit[i];
      if (!l || l.t0 > t) { R(g, s.x - 5, s.y - 3, 10, 6, "#3a2614"); R(g, s.x - 4, s.y - 2, 8, 4, "#2a1a0e"); continue; }
      var a = t - l.t0, glow = l.mine && a < GLOW, on = glow && Math.floor(a * 6) % 2 === 0;
      if (glow) { R(g, s.x - 7, s.y - 5, 14, 10, on ? "rgba(234,186,73,0.85)" : "rgba(191,233,255,0.45)"); }
      drawTag(g, s.x, s.y, l.k, glow && on ? C.gold : "#7fd8ff", "#fffaf0");
    }
    S.fly.forEach(function (f) {
      var s = slotAt(f.i), k = Math.max(0, Math.min(1, (t - f.t0) / FLY)), e = 1 - Math.pow(1 - k, 2);
      drawTag(g, f.x + (s.x - f.x) * e, f.y + (s.y - f.y) * e - Math.sin(k * Math.PI) * 30, f.i % 4, C.gold, "#fffaf0");
    });
    if (t - S.glowT < GLOW) {
      var gy = by + 40 - Math.min(1, (t - S.glowT) * 3) * 4;
      g.save(); g.globalAlpha = Math.max(0, 1 - (t - S.glowT) / GLOW);
      g.font = "600 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "bottom";
      g.lineWidth = 3; g.strokeStyle = "rgba(20,20,20,0.9)"; g.strokeText("NEW TAG", bx + w / 2, gy + 14);
      g.fillStyle = C.gold; g.fillText("NEW TAG", bx + w / 2, gy + 14);
      g.restore();
    }
  }
  function drawSign(g) {
    var x = (SIGN[0] + 0.5) * T, y = SIGN[1] * T, n = S.shown == null ? 0 : S.shown, moving = S.total != null && S.total !== S.shown;
    R(g, x - 2, y + 18, 4, 14, "#4e3520"); R(g, x - 1, y + 18, 1, 14, C.wood); R(g, x - 4, y + 30, 8, 2, "rgba(0,0,0,0.3)");
    R(g, x - 15, y - 1, 30, 21, "#2a1a0e"); R(g, x - 14, y, 28, 19, "#5a3c22"); R(g, x - 14, y, 28, 1, "#86592f");
    R(g, x - 12, y + 9, 24, 9, "#13202c");
    g.save(); g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "600 7px 'Plex Mono', monospace"; g.fillStyle = "#fffaf0"; g.fillText("WATERS", x, y + 5);
    g.font = "700 8px 'Plex Mono', monospace"; g.fillStyle = moving ? C.gold : C.ice; g.fillText(n + " ZEC", x, y + 14);
    g.restore();
  }

  BH.features.register("nullifier", {
    onStep: function (dt) { if (S) step(dt); },
    onDrawWorld: function (g) { if (!S) return; drawBoard(g); drawSign(g); }
  });

  var coreStart = startFeatures;
  startFeatures = function () {
    var r = coreStart.apply(this, arguments);
    S = null;
    if (typeof L === "undefined" || !wanted(L)) return r;
    fresh();
    if (!activeFeatures.some(function (f) { return f.id === "nullifier"; })) {
      var api = Object.create(featureApi); api.id = "nullifier"; api.state = {};
      activeFeatures.push({ id: "nullifier", def: BH.features.get("nullifier"), api: api });
    }
    return r;
  };

  BH.nullifier = {
    info: function () {
      if (!S) return null;
      return { posted: S.posted, lit: S.lit.filter(function (l) { return l; }).length, flying: S.fly.length, total: S.total, shown: S.shown };
    }
  };
})();
