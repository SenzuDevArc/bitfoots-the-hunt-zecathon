(function () {
  "use strict";
  window.TRAIL_EXTRA_LEVELS = window.TRAIL_EXTRA_LEVELS || {};
  TRAIL_EXTRA_LEVELS.doors = {
    act: 2, tid: "doors", title: "LINKING THE DOTS", need: 6, par: 120, sprint: true, bank: true, amounts: true, noUnmatched: true, takeAsk: true,
    features: ["trail", "doors"],
    elders: ["oak", "sly"],
    piles: { A: [1, 1, 8, 3], B: [1, 9, 8, 10] },
    machines: { A: [6, 2], B: [6, 9] },
    npcs: [{ id: "pine", at: [26, 2], water: true }, { id: "merchant", at: [26, 9], water: true }],
    hunters: [{ type: "hunter", patrol: [[12, 2], [12, 9]] }],
    hints: ["need", "home"],
    map: [
      "##############################",
      "#.c.c....#.......~~~~~~~~~~~~#",
      "#........#.......~~~~~~~~~~~~#",
      "#........#.......~~~~~~~~~~~~#",
      "#................~~~~~~~~~~~~#",
      "######.....##....~~~~~~~~~~~~#",
      "#P..........##..V~~~~~~~~~~d~#",
      "######...........~~~~~~~~~~~~#",
      "#................~~~~~~~~~~~~#",
      "#........#.......~~~~~~~~~~~~#",
      "#.c.c....#.......~~~~~~~~~~~~#",
      "##############################"],
    copy: {
      goal: "Shield A and B on separate trips. 6 coins to the den.",
      lesson: "Land addresses are public: shield each one on its own trip, never together.",
      dev: "Shielding from two public addresses in one payment links them, so shield them separately and not at matching times."
    },
    term: ""
  };

  if (!window.BH) window.BH = {};
  if (!BH.features) return;

  var PAY_R = 1.35, TO_DOOR = 0.7, TO_DEN = 1.1;
  var S = null;

  function on() { return typeof L !== "undefined" && L && L.tid === "doors"; }
  function tc(at) { return { x: (at[0] + 0.5) * T, y: (at[1] + 0.5) * T }; }

  var baseStart = typeof startFeatures === "function" ? startFeatures : null;
  if (baseStart) {
    startFeatures = function () {
      if (on()) {
        var f = L.features || [];
        ["trail", "doors"].forEach(function (id) { if (f.indexOf(id) < 0) f = f.concat([id]); });
        L.features = f.filter(function (id, i) { return f.indexOf(id) === i; });
      }
      return baseStart.apply(this, arguments);
    };
  }
  var baseCopy = typeof levelCopy === "function" ? levelCopy : null;
  if (baseCopy) {
    levelCopy = function (n) {
      var lv = (window.LEVELS || [])[n - 1];
      if (lv && lv.tid === "doors" && lv.copy) return lv.copy;
      return baseCopy.apply(this, arguments);
    };
  }

  function payers() {
    var st = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state, list = (st && st.npcs) || [];
    return (L.npcs || []).map(function (d) {
      var e = list.filter(function (n) { return n.id === d.id; })[0];
      if (e) return e;
      var p = tc(d.at); return { id: d.id, x: p.x, y: p.y };
    });
  }

  function fresh() {
    S = { paid: {}, flights: [], landed: 0 };
  }

  function pay(p) {
    S.paid[p.id] = true;
    S.flights.push({ t0: simTime, from: { x: p.x, y: p.y - 10 }, done: false });
    if (typeof sfx === "function") sfx("coin");
    ring(p.x, p.y, C.gold, T * 1.3, 0.5);
  }

  function step() {
    if (game.phase !== "play") return;
    payers().forEach(function (p) {
      if (S.paid[p.id] || game.phase !== "play") return;
      if (Math.hypot(p.x - player.x, p.y - player.y) <= T * PAY_R) pay(p);
    });
    S.flights.forEach(function (f) {
      if (f.done || simTime - f.t0 < TO_DOOR + TO_DEN || !dens) return;
      f.done = true; player.stash++; S.landed++;
      ring(dens.x, dens.y, C.gold, T * 1.3, 0.5); puff(dens.x, dens.y, 12, "rgba(234,186,73,0.95)", 40);
      floatText(dens.x, dens.y - 14, "+1 ZEC", C.gold);
      if (typeof sfx === "function") sfx("stash");
    });
  }

  function coin(g, x, y) {
    g.fillStyle = "#8a5e10"; g.beginPath(); g.arc(x, y + 1, 4, 0, 6.283); g.fill();
    g.fillStyle = "#ffd24a"; g.beginPath(); g.arc(x, y, 4, 0, 6.283); g.fill();
  }
  function drawWorld(g) {
    if (!dens) return;
    S.flights.forEach(function (f) {
      if (f.done) return;
      var k = Math.min(1, (simTime - f.t0) / (TO_DOOR + TO_DEN)), e = k * k * (3 - 2 * k);
      coin(g, f.from.x + (dens.x - f.from.x) * e, f.from.y + (dens.y - f.from.y) * e - Math.sin(e * Math.PI) * T);
    });
  }

  BH.doors = {
    info: function () {
      if (!S || !on()) return null;
      return { paid: Object.keys(S.paid), landed: S.landed, flights: S.flights.length };
    }
  };

  BH.features.register("doors", {
    onLevelStart: function () { if (on()) fresh(); else S = null; },
    onStep: function () { if (S && on()) step(); },
    onDrawWorld: function (g) { if (S && on()) drawWorld(g); }
  });
})();
