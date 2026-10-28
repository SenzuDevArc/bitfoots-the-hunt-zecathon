(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  if (!BH.features) return;

  var BEAT = 2.5;

  function entry() {
    if (typeof activeFeatures === "undefined") return null;
    for (var i = 0; i < activeFeatures.length; i++) if (activeFeatures[i].id === "stamps") return activeFeatures[i];
    var api = Object.create(featureApi); api.id = "stamps"; api.state = {};
    var e = { id: "stamps", def: BH.features.get("stamps"), api: api };
    activeFeatures.push(e);
    return e;
  }
  function init(S) {
    if (S.playT == null) S.playT = 0;
    return S;
  }
  function st() { var e = entry(); return e ? init(e.api.state) : null; }
  function cnt(S) { return Math.floor(S.playT / BH.stamps.beat + 1e-6); }
  function held() { return typeof player !== "undefined" && player ? Math.max(0, player.carry | 0) : 0; }

  BH.stamps = {
    beat: BEAT,
    count: function () { var S = st(); return S ? cnt(S) : 0; },
    lock: function () {},
    ready: function () { return held(); },
    confirm: function () { return { n: 1, safe: true, waiting: false, f: 1, text: "PAID" }; },
    locks: function () { return []; }
  };

  BH.features.register("stamps", {
    onLevelStart: function (lv, api) { init(api.state); },
    onStep: function (dt, api) { init(api.state).playT += dt; }
  });
  (window.LEVELS || []).forEach(function (l) { if ((l.features || []).indexOf("stamps") < 0) l.features = (l.features || []).concat(["stamps"]); });
})();
