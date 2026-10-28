(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  if (!BH.features) return;

  var TID = "inriver", FLY_IN = 0.8, FLY_OUT = 0.7, FLY_BACK = 0.7;
  var S = null, key = null;

  function R(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(x, y, w, h); }
  function on() { return typeof L !== "undefined" && L && L.tid === TID; }
  function TS() { return BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state; }
  function fresh() { S = { notes: [], flights: [], gets: [], pays: [], seen: {}, change: 0, spent: [] }; }
  function sync() {
    var k = game.levelIdx + ":" + levelStart;
    if (k !== key) { key = k; fresh(); }
    if (on() && typeof activeFeatures !== "undefined" && !activeFeatures.some(function (f) { return f.id === "notes"; })) {
      var api = Object.create(featureApi); api.id = "notes"; api.state = {};
      activeFeatures.push({ id: "notes", def: BH.features.get("notes"), api: api });
    }
    return S;
  }
  function wet(c) { return isWater(tile(Math.floor(c.x / T), Math.floor(c.y / T))); }
  function sum() { return S.notes.reduce(function (a, b) { return a + b; }, 0); }
  function merchant() { var ts = TS(); return ts && (ts.npcs || []).filter(function (n) { return n.id === "merchant"; })[0] || null; }
  function ease(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }

  function envelope(g, x, y, lit) {
    x = Math.round(x); y = Math.round(y);
    R(g, x - 7, y - 5, 14, 10, "#4a3a24");
    R(g, x - 6, y - 4, 12, 8, lit ? "#fffaf0" : "#efe4cc");
    R(g, x - 6, y + 2, 12, 2, "#d9caa8");
    R(g, x - 6, y - 4, 2, 1, "#b9a682"); R(g, x + 4, y - 4, 2, 1, "#b9a682");
    R(g, x - 4, y - 3, 2, 1, "#b9a682"); R(g, x + 2, y - 3, 2, 1, "#b9a682");
    R(g, x - 2, y - 2, 4, 1, "#b9a682");
    R(g, x - 2, y - 1, 4, 3, C.red); R(g, x - 1, y - 1, 1, 1, "#e8735f");
  }
  function tag(g, x, y, text, col) {
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = g.measureText(text).width + 10;
    g.fillStyle = "rgba(0,0,0,0.82)"; g.fillRect(Math.round(x - w / 2), Math.round(y - 7), Math.round(w), 14);
    g.fillStyle = col || C.ink; g.fillText(text, x, y);
    g.restore();
  }
  function slip(g, x, y, n) {
    x = Math.round(x); y = Math.round(y);
    R(g, x - 7, y - 8, 14, 16, "#4a3a24");
    R(g, x - 6, y - 7, 12, 14, "#fffaf0");
    var Q = [[0, 0], [1, 0], [0, 1], [7, 0], [8, 0], [8, 1], [0, 7], [0, 8], [1, 8], [3, 1], [5, 2], [4, 4], [2, 5], [6, 5], [3, 7], [5, 6], [7, 7], [8, 6], [6, 3]];
    Q.forEach(function (q) { R(g, x - 5 + q[0], y - 6 + q[1], 1, 1, "#1b1b1b"); });
    R(g, x - 5, y + 4, 10, 2, C.gold);
    tag(g, x, y + 16, "PAY " + n, C.gold);
  }

  function takeGets(ts) {
    var fresh_ = (ts.gets || []).filter(function (q) { return !q.landed && !q.notes; });
    if (!fresh_.length) return;
    var first = fresh_[0];
    fresh_.forEach(function (q) { q.notes = true; q.landed = simTime; });
    S.flights.push({ kind: "in", t0: first.t0, from: { x: first.from.x, y: first.from.y }, n: fresh_.length, after: fresh_.map(function (q) { return q.after; }) });
  }
  function takePay(ts) {
    var q = ts.pay;
    if (!q || !q.water || q.notes) return;
    q.notes = true;
    var from = { x: q.from.x, y: q.from.y }, to = q.to ? { x: q.to.x, y: q.to.y } : { x: q.x, y: q.y };
    q.from = { x: NaN, y: NaN };
    var big = S.notes.length ? Math.max.apply(null, S.notes) : q.n, i = S.notes.indexOf(big);
    if (i >= 0) S.notes.splice(i, 1);
    var change = Math.max(0, Math.min(big - q.n, player.carry));
    player.carry -= change;
    S.change += change;
    S.flights.push({ kind: "out", t0: q.t0, from: from, to: to, n: big, change: change });
  }
  function pickups() {
    coins.forEach(function (c, i) {
      if (!c.got || S.seen[i] || !wet(c)) return;
      S.seen[i] = true; S.notes.push(1);
    });
  }
  function land(f) {
    var t = simTime - f.t0;
    if (f.kind === "in" && t >= FLY_IN) {
      player.carry += f.n; S.notes.push(f.n);
      ring(player.x, player.y, C.gold, T * 1.2, 0.4);
      floatText(player.x, player.y - 26, f.n + " ZEC", C.gold);
      f.after.forEach(function (a) { if (a) a(); });
      return true;
    }
    if (f.kind === "out" && t >= FLY_OUT && !f.back) {
      f.back = simTime;
      if (f.change) sfx("coin");
    }
    if (f.kind === "out" && f.back && (!f.change || simTime - f.back >= FLY_BACK)) {
      if (f.change) {
        player.carry += f.change; S.change -= f.change; S.notes.push(f.change);
        ring(player.x, player.y, C.gold, T * 1.2, 0.4);
      }
      return true;
    }
    return false;
  }
  function step() {
    var ts = TS(); if (!ts) return;
    takeGets(ts); takePay(ts); pickups();
    S.flights = S.flights.filter(function (f) { return !land(f); });
    S.notes.sort(function (a, b) { return a - b; });
    while (S.notes.length && sum() > player.carry) S.notes.shift();
    if (sum() < player.carry) S.notes.push(player.carry - sum());
  }

  function drawFlights(g) {
    S.flights.forEach(function (f) {
      var t = simTime - f.t0;
      if (f.kind === "in") {
        var e = ease(t / FLY_IN);
        envelope(g, f.from.x + (player.x - f.from.x) * e, f.from.y + (player.y - 10 - f.from.y) * e - Math.sin(e * Math.PI) * T * 1.2, true);
        return;
      }
      if (!f.back) {
        var k = ease(t / FLY_OUT);
        envelope(g, f.from.x + (f.to.x - f.from.x) * k, f.from.y + (f.to.y - f.from.y) * k - Math.sin(k * Math.PI) * T, true);
        return;
      }
      if (!f.change) return;
      var b = ease((simTime - f.back) / FLY_BACK), x = f.to.x + (player.x - f.to.x) * b, y = f.to.y + (player.y - 10 - f.to.y) * b - Math.sin(b * Math.PI) * T * 0.8;
      envelope(g, x, y, true);
      tag(g, x, y - 14, "CHANGE", C.gold);
    });
  }
  function drawSlip(g) {
    var ts = TS(), m = merchant();
    if (!ts || !m || !ts.done || !ts.done.pine || ts.done.machine || ts.pay) return;
    var side = player.x < m.x ? -1 : 1;
    slip(g, m.x + side * 20, m.y - 8 + Math.sin(simTime * 2) * 1, L.pay || 1);
  }

  var baseCoins = window.drawCoins;
  if (typeof baseCoins === "function") window.drawCoins = function () {
    if (!on() || typeof coins === "undefined") return baseCoins.apply(this, arguments);
    sync();
    var hid = coins.filter(function (c) { return !c.got && wet(c); });
    hid.forEach(function (c) { c.got = true; });
    try { baseCoins.apply(this, arguments); } finally { hid.forEach(function (c) { c.got = false; }); }
    hid.forEach(function (c) {
      var y = c.y + Math.sin(simTime * 3 + c.ph) * 2.5;
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(234,186,73,0.14)"; ctx.beginPath(); ctx.arc(c.x, y, 12, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
      envelope(ctx, c.x, y, false);
    });
  };

  var baseFloaters = window.drawFloaters;
  if (typeof baseFloaters === "function") window.drawFloaters = function () {
    var r = baseFloaters.apply(this, arguments);
    if (on() && S) { drawSlip(ctx); drawFlights(ctx); }
    return r;
  };

  BH.notes = {
    info: function () { sync(); return { notes: S.notes.slice(), flights: S.flights.map(function (f) { return { kind: f.kind, n: f.n, change: f.change || 0, back: !!f.back }; }), change: S.change }; }
  };

  BH.features.register("notes", {
    onLevelStart: function () { key = null; sync(); },
    onStep: function () { if (!on()) return; sync(); step(); }
  });
  (window.LEVELS || []).forEach(function (l) { if (l.tid === TID && (l.features || []).indexOf("notes") < 0) l.features = (l.features || []).concat(["notes"]); });
})();
