(function () {
  "use strict";
  var W = window;
  if (!W.BH || !BH.features || !BH.features.register) return;

  var AT = [24, 4], USE_R = 1.1, FLY = 1.2, COL = "#7fd8ff", S = null;

  function on() { return typeof L !== "undefined" && L && L.tid === "doors"; }
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function spot() { var at = L.u1 || AT; return { tx: at[0], ty: at[1], x: (at[0] + 0.5) * T, y: (at[1] + 0.5) * T }; }
  function fresh() { S = { m: spot(), flights: [], sent: 0, landed: 0, said: -9, used: -9 }; }
  function sly() { var st = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state; return st && (st.elders || []).filter(function (e) { return e.id === "sly"; })[0]; }

  function step() {
    if (game.phase !== "play") return;
    var m = S.m;
    if (player.inShield && player.carry > 0 && Math.hypot(player.x - m.x, player.y - m.y) < T * USE_R) {
      for (var i = 0; i < player.carry; i++) S.flights.push({ t0: simTime + i * 0.25 });
      S.sent += player.carry; player.carry = 0; S.used = simTime;
      ring(m.x, m.y, COL, T * 1.3, 0.5); puff(m.x, m.y, 12, "rgba(127,216,255,0.9)", 36);
      if (typeof sfx === "function") sfx("click");
    }
    S.flights.forEach(function (f) {
      if (f.done || simTime - f.t0 < FLY || !dens) return;
      f.done = true; player.stash++; S.landed++;
      ring(dens.x, dens.y, C.gold, T * 1.3, 0.5); floatText(dens.x, dens.y - 14, "+1 ZEC", C.gold);
      if (typeof sfx === "function") sfx("stash");
    });
  }

  function envelope(g, x, y) {
    x = Math.round(x); y = Math.round(y);
    R(g, x - 6, y - 4, 12, 8, "#efe4cc"); R(g, x - 6, y + 2, 12, 2, "#d9caa8");
    R(g, x - 4, y - 3, 2, 1, "#b9a682"); R(g, x + 2, y - 3, 2, 1, "#b9a682"); R(g, x - 2, y - 2, 4, 1, "#b9a682");
    R(g, x - 2, y - 1, 4, 3, C.red);
  }
  function drawMachine(g) {
    var m = S.m, sh = simTime - S.used < 0.2 ? Math.round(Math.sin((simTime - S.used) * 60)) : 0, x = m.tx * T + sh, y = m.ty * T;
    g.save();
    g.strokeStyle = "rgba(190,235,255,0.5)"; g.lineWidth = 1.5;
    var r = 12 + ((simTime * 10) % 6); g.beginPath(); g.ellipse(x + T / 2, y + T - 3, r, r * 0.35, 0, 0, 6.283); g.stroke();
    R(g, x + 5, y + 1, 22, 30, "#0b1a26"); R(g, x + 6, y + 2, 20, 28, "#3d6a86"); R(g, x + 6, y + 2, 20, 3, "#6fa6c4");
    R(g, x + 6, y + 18, 20, 2, COL);
    R(g, x + 9, y + 6, 14, 10, "#071822");
    R(g, x + 10, y + 23, 12, 5, "#0b1a26");
    g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = player.carry > 0 ? COL : "rgba(255,250,240,0.35)"; g.fillText("U1", x + T / 2, y + 11.5);
    var text = "U1 ADDRESS", w = g.measureText(text).width + 14, ly = y - 11;
    g.fillStyle = "#0b1a26"; g.fillRect(x + T / 2 - w / 2 - 1, ly - 9, w + 2, 18); g.fillStyle = "#2f5d7a"; g.fillRect(x + T / 2 - w / 2, ly - 8, w, 16);
    g.fillStyle = COL; g.fillRect(x + T / 2 - w / 2, ly + 6, w, 2);
    g.fillStyle = "#fffaf0"; g.fillText(text, x + T / 2, ly);
    g.restore();
  }
  function drawWorld(g) {
    drawMachine(g);
    if (!dens) return;
    var m = S.m;
    S.flights.forEach(function (f) {
      var k = (simTime - f.t0) / FLY;
      if (f.done || k < 0) return;
      var e = k * k * (3 - 2 * k);
      envelope(g, m.x + (dens.x - m.x) * e, m.y - 8 + (dens.y - m.y + 8) * e - Math.sin(e * Math.PI) * T);
    });
  }

  var baseDen = W.tryDen;
  if (typeof baseDen === "function") W.tryDen = function () {
    if (S && on() && player.carry > 0 && player.stash < L.need) {
      if (simTime - S.said > 3) {
        S.said = simTime;
        var lp = typeof livePop === "function" && livePop(), wait = 0;
        if (lp) { lp.life = Math.min(popLife(lp), simTime - lp.t0 + FADE); wait = FADE * 1000; }
        setTimeout(function () {
          if (!S || !on()) return;
          var e = sly();
          if (e && BH.talk && BH.talk.bubble) BH.talk.bubble(e, "Send them through the U1 machine first.", 3);
          else popRaw("SEND THEM THROUGH THE U1 MACHINE FIRST", C.gold);
        }, wait);
      }
      return;
    }
    return baseDen.apply(this, arguments);
  };

  BH.u1 = {
    at: function () { return S ? { x: S.m.x, y: S.m.y } : null; },
    info: function () { return S && on() ? { sent: S.sent, landed: S.landed, flying: S.flights.filter(function (f) { return !f.done; }).length } : null; }
  };

  BH.features.register("u1", {
    onLevelStart: function () { if (on()) fresh(); else S = null; },
    onStep: function () { if (S && on()) step(); },
    onDrawWorld: function (g) { if (S && on()) drawWorld(g); }
  });

  (W.LEVELS || []).forEach(function (l) { if (l.tid === "doors" && (l.features || []).indexOf("u1") < 0) l.features = (l.features || []).concat(["u1"]); });
})();
