"use strict";
(function () {
  if (!window.BH || !BH.features || !BH.features.register) return;
  var AT = [7, 6], REACH = 1.3, FLY = 1.1;
  var S = null;

  if (BH.talk && BH.talk.voice) BH.talk.voice("scam", { name: "FREE ZEC CHECK", f: 520, wave: "sawtooth", color: "#7dff9a" });
  function on() { return !!(L && L.tid === "glasskey"); }
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function spot() { return { x: (AT[0] + 0.5) * T, y: (AT[1] + 0.5) * T }; }

  if (typeof canSee === "function") {
    var baseSee = canSee;
    canSee = function (h) {
      if (S && S.leaked && on() && h && h.type !== "dog" && typeof player !== "undefined" && player && player.inShield && !ghost) {
        player.inShield = false;
        try { return baseSee(h); } finally { player.inShield = true; }
      }
      return baseSee.apply(this, arguments);
    };
  }

  function leak() {
    if (S.leaked) return;
    S.leaked = true; S.leakAt = simTime; S.from = { x: player.x, y: player.y - 10 };
    if (typeof sfx === "function") sfx("spotted");
    if (typeof addTrauma === "function") addTrauma(0.4);
    BH.talk.open([["sly", "Your glass key is out. Every hunter can see you in the water now."],
      ["oak", "They can see. They can't take a coin. And there's no getting it back."]]);
  }
  function walkAway() { BH.talk.open([["oak", "Good. Never paste your keys into a site."]]); }
  function ask() {
    S.asked = true;
    BH.talk.open([{ who: "scam", text: "FREE ZEC CHECK! Paste your glass key, see your whole balance.", choices: [
      { text: "Paste my glass key", then: function () {
        BH.talk.open([{ who: "oak", text: "It shows all your payments, and you can't take it back. Paste it?", choices: [
          { text: "Paste it", then: leak }, { text: "Walk away", then: walkAway }] }]);
      } },
      { text: "Walk away", then: walkAway }] }]);
  }

  function key(g, x, y) {
    R(g, x - 5, y - 3, 6, 6, "#bfe9ff"); R(g, x - 4, y - 2, 4, 4, "rgba(255,255,255,0.35)");
    R(g, x + 1, y - 1, 7, 2, "#bfe9ff"); R(g, x + 5, y + 1, 1, 2, "#bfe9ff"); R(g, x + 7, y + 1, 1, 2, "#bfe9ff");
  }
  function stall(g) {
    var p = spot(), x = Math.round(p.x), y = Math.round(p.y), blink = Math.sin(simTime * 6) > 0;
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(x, y + 12, 16, 4, 0, 0, 6.283); g.fill();
    R(g, x - 14, y - 2, 28, 14, "#5a3d24"); R(g, x - 14, y - 2, 28, 2, "#7a5534");
    R(g, x - 12, y - 18, 2, 16, "#3d2918"); R(g, x + 10, y - 18, 2, 16, "#3d2918");
    R(g, x - 9, y - 14, 18, 11, "#0a0a0c"); R(g, x - 8, y - 13, 16, 9, blink ? "#1f5f33" : "#174a28");
    R(g, x - 6, y - 11, 12, 1, "#7dff9a"); R(g, x - 6, y - 8, 8, 1, "#7dff9a"); R(g, x - 6, y - 6, 10, 1, "#7dff9a");
  }
  function sign(g) {
    var p = spot(), sx = (p.x - view.x0) * zoom, sy = (p.y - view.y0) * zoom;
    if (sy - 27 * zoom < 112 && sx - 40 * zoom < 230) return;
    g.save(); g.translate(Math.round(sx), Math.round(sy)); g.scale(zoom, zoom);
    g.font = "700 6px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var t = "FREE ZEC CHECK", w = Math.ceil(g.measureText(t).width) + 6;
    R(g, -w / 2, -27, w, 9, "#c8302a"); g.fillStyle = "#fff3c4"; g.fillText(t, 0, -22.5);
    g.restore();
  }

  BH.features.register("scamkey", {
    onLevelStart: function () { S = { leaked: false, leakAt: 0, asked: false, from: null, seenInWater: 0 }; },
    onStep: function () {
      if (!S || !on() || game.phase !== "play") return;
      var p = spot(), near = Math.hypot(p.x - player.x, p.y - player.y) < REACH * T;
      if (!near) S.asked = false;
      else if (!S.asked && !S.leaked && BH.talk.interruptible()) ask();
      if (S.leaked && player.inShield && hunters.some(function (h) { return h.type !== "dog" && canSee(h); })) S.seenInWater++;
    },
    onDrawOver: function (g) { if (S && on() && g === ctx) sign(g); },
    onDrawWorld: function (g) {
      if (!S || !on()) return;
      stall(g);
      if (!S.leaked) return;
      var k = Math.min(1, (simTime - S.leakAt) / FLY), e = k * k * (3 - 2 * k);
      hunters.forEach(function (h) {
        if (h.type === "dog") return;
        var hx = h.x, hy = h.y - 24;
        if (k < 1) { key(g, Math.round(S.from.x + (hx - S.from.x) * e), Math.round(S.from.y + (hy - S.from.y) * e - Math.sin(k * Math.PI) * 30)); return; }
        if (typeof conePoly === "function" && g === ctx) {
          g.save(); g.lineJoin = "round";
          conePoly(h.x, h.y, h.dir, CONE, visionOf(h) * T, 22);
          g.strokeStyle = "#1b1b1b"; g.lineWidth = 3.5; g.stroke();
          g.strokeStyle = "#eaba49"; g.lineWidth = 2; g.setLineDash([6, 6]); g.lineDashOffset = -simTime * 12; g.stroke();
          g.restore();
        }
        key(g, Math.round(hx), Math.round(hy + Math.sin(simTime * 3) * 1.5));
      });
    }
  });
  BH.scamkey = { at: spot, state: function () { return S ? { leaked: S.leaked, asked: S.asked, seenInWater: S.seenInWater } : null; } };
  (window.LEVELS || []).forEach(function (l) {
    if (l.tid === "glasskey" && (l.features || []).indexOf("scamkey") < 0) l.features = (l.features || []).concat(["scamkey"]);
  });
})();
