(function () {
  "use strict";
  var W = window;
  if (!W.BH || !BH.features || !BH.features.register) return;

  var LAND = 0.7, FEE_TEXT = "10,000 ZATOSHIS";

  function now() { return typeof simTime === "number" ? simTime : 0; }
  function trailState() { return BH.trailFeature && BH.trailFeature.api ? BH.trailFeature.api.state : null; }
  function sm(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }

  BH.features.register("miner", {
    onDrawWorld: function (g) {
      var S = trailState(), q = S && S.pay;
      if (!q || q.water) return;
      var ft = now() - q.t0;
      if (ft <= LAND || ft >= 1.9) return;
      var f2 = sm((ft - LAND) / 1.2), fa = 1 - Math.max(0, (ft - 1.5) / 0.4);
      g.save();
      g.font = "700 9px 'Plex Mono', monospace"; g.textBaseline = "middle"; g.textAlign = "left";
      var fx = q.x + 22 + f2 * 10 + g.measureText("FEE").width / 2 + 4, fy = q.y - 6 - f2 * T * 1.6;
      g.globalAlpha = fa; g.fillStyle = "#fffaf0"; g.fillText(FEE_TEXT, fx, fy);
      g.restore();
    }
  });

  (W.LEVELS || []).forEach(function (l) { if (l.tid === "machine" && (l.features || []).indexOf("miner") < 0) l.features = (l.features || []).concat(["miner"]); });
})();
