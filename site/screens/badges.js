(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  var A = BH.achievements;
  if (!A || !Array.isArray(A.list) || typeof window.caught !== "function" || typeof window.escaped !== "function") return;

  var STEP = 50, ENOUGH = 10;
  function flags(s, k) { var b = s && s.badges; return b && b[k] && typeof b[k] === "object" ? b[k] : {}; }
  function has(id) { return function (s) { return flags(s, "trail")[id] === true ? 1 : 0; }; }
  function tally(k) { return function (s) { return Math.min(ENOUGH, Object.keys(flags(s, k)).length); }; }
  var NEW = [
    { id: "shielded", kind: "learn", name: "SHIELDED", how: "Put your first coin into the waters.", need: 1, have: has("shielded") },
    { id: "glass-key", kind: "learn", name: "GLASS KEY", how: "Let someone look at your trail with the glass key.", need: 1, have: has("glass-key") },
    { id: "memo-writer", kind: "learn", name: "MEMO WRITER", how: "Send a payment with a private memo.", need: 1, have: has("memo-writer") },
    { id: "no-double-spending", kind: "learn", name: "NO DOUBLE SPENDING", how: "Drop a note's tag in the jar.", need: 1, have: has("no-double-spending") },
    { id: "u1", kind: "learn", name: "U1", how: "Pay to an address that starts with u1.", need: 1, have: has("u1") },
    { id: "berry-buyer", kind: "fun", name: "BERRY BUYER", how: "Buy berries at the level 5 shop.", need: 1, have: has("berry-buyer") },
    { id: "broke", kind: "fun", name: "BROKE", how: "Spend your last ZEC.", need: 1, have: has("broke") },
    { id: "caught-red-pawed", kind: "fun", name: "CAUGHT RED-PAWED", how: "Get caught 10 times.", need: ENOUGH, have: tally("caught") },
    { id: "loud-walker", kind: "fun", name: "LOUD WALKER", how: "Leave 500 footprints on land.", need: ENOUGH, have: tally("steps") }
  ];
  NEW.forEach(function (a) { if (!A.list.some(function (b) { return b.id === a.id; })) A.list.push(a); });

  function keep() { if (typeof persist === "function") persist(); }
  function tree(k) { save.badges = save.badges || {}; if (!save.badges[k] || typeof save.badges[k] !== "object") save.badges[k] = {}; return save.badges[k]; }
  function earn(id) { var t = tree("trail"); if (t[id]) return false; t[id] = true; return true; }
  function bump(k, n) {
    var t = tree(k), got = false;
    for (var i = 0; i < n; i++) { var c = Object.keys(t).length; if (c >= ENOUGH) break; t[String(c + 1)] = true; got = true; }
    return got;
  }

  function readRun() {
    if (typeof save === "undefined" || !save) return;
    var any = false, log = (BH.river && BH.river.log) || [];
    var into = log.some(function (r) { return r.dir === "in" && r.n > 0; }), out = log.some(function (r) { return r.dir === "out"; });
    if (into) any = earn("shielded") || any;
    if (out) any = earn("u1") || any;
    if (out && BH.jar && BH.jar.info && BH.jar.info()) any = earn("no-double-spending") || any;
    if (BH.glasskey && BH.glasskey.shown && BH.glasskey.shown()) any = earn("glass-key") || any;
    var S = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state, b = S && S.bought;
    if (b && (b["3"] || b["7"])) any = earn("memo-writer") || any;
    if (b && b["7"]) any = earn("berry-buyer") || any;
    var n = (typeof prints !== "undefined" && prints && prints.length) || 0, left = (+save.stepsLeft || 0) + n;
    if (bump("steps", Math.floor(left / STEP))) any = true;
    save.stepsLeft = left % STEP;
    if (any) keep();
  }

  var wasCaught = window.caught, wasEscaped = window.escaped;
  window.caught = function () {
    var first = typeof game !== "undefined" && game.phase !== "caught";
    var r = wasCaught.apply(this, arguments);
    if (first) { if (typeof save !== "undefined" && save && bump("caught", 1)) keep(); readRun(); }
    return r;
  };
  window.escaped = function () { readRun(); return wasEscaped.apply(this, arguments); };

  [BH.characters, BH.cosmetics].forEach(function (K) {
    if (!K || typeof K.buy !== "function") return;
    var buy = K.buy;
    K.buy = function (id, s) {
      var ok = buy.apply(this, arguments), sv = s || (typeof save !== "undefined" ? save : null);
      if (ok && sv && sv === save && +sv.wallet === 0 && earn("broke")) keep();
      return ok;
    };
  });

})();
