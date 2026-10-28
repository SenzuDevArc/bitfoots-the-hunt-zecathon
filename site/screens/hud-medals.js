(function () {
  "use strict";
  var FLASH = 1.5, PULSE_LAST = 5;
  var run = null, spotAt = null, frozen = 0;
  var reduce = false;
  try { reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}

  function runSecs() {
    if (game.phase === "play") { frozen = simTime - levelStart; return frozen; }
    if (game.phase === "escaped" && typeof game.escapedAt === "number") return game.escapedAt - levelStart;
    return frozen;
  }
  function clock(s) { s = Math.max(0, Math.ceil(s)); var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }

  function state() {
    if (run !== levelStart) { run = levelStart; spotAt = null; frozen = 0; }
    var secs = runSecs(), r = medalRules(secs), have = banked();
    var home = r.home || game.phase === "escaped";
    var left = Math.max(0, L.need - have), total = typeof caveCoinTotal === "function" ? caveCoinTotal() : (coins ? coins.length : 0);
    if (!r.unseen && spotAt == null) spotAt = simTime;
    var tl = L.par - secs;
    return {
      secs: secs,
      den: { id: "home", on: home, text: home ? "DEN" : left + " LEFT", left: left, coinsLeft: Math.max(0, total - have) },
      par: { id: "par", on: r.par, text: r.par ? clock(tl) : "OVER", timeLeft: tl, pulse: r.par && tl <= PULSE_LAST && !reduce },
      unseen: { id: "unseen", on: r.unseen, text: r.unseen ? "UNSEEN" : "SPOTTED", flash: !r.unseen && simTime - spotAt < FLASH }
    };
  }

  function medal(ctx, x, y, rad, b, scale) {
    ctx.save(); ctx.translate(x, y); if (scale !== 1) ctx.scale(scale, scale);
    if (b.on) {
      ctx.fillStyle = "#050906"; ctx.beginPath(); ctx.arc(0, 2, rad + 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#eaba49"; ctx.beginPath(); ctx.arc(0, 0, rad + 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#1f130a"; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.283); ctx.fill();
      var g = ctx.createRadialGradient ? ctx.createRadialGradient(-rad * 0.24, -rad * 0.36, 0, 0, 0, rad) : null;
      if (g && g.addColorStop) { g.addColorStop(0, "#fff3b0"); g.addColorStop(0.38, "#f0c14e"); g.addColorStop(0.75, "#c48f1e"); g.addColorStop(1, "#8a5e10"); }
      ctx.fillStyle = g || "#f0c14e"; ctx.beginPath(); ctx.arc(0, 0, rad - 1.5, 0, 6.283); ctx.fill();
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "600 " + Math.round(rad * 1.1) + "px 'Plex Cond', sans-serif";
      ctx.fillStyle = "#8a5e10"; ctx.fillText("★", 0, 1.5);
      ctx.fillStyle = "#fff6cc"; ctx.fillText("★", 0, 0);
    } else {
      ctx.fillStyle = "#2c1d10"; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, rad - 2.5, 3.5, 5.93); ctx.stroke();
      if (ctx.setLineDash) ctx.setLineDash([3, 2.5]);
      ctx.strokeStyle = b.flash ? "#c8412f" : "#6b4a2a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.283); ctx.stroke();
      if (ctx.setLineDash) ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function draw(ctx, x, top) {
    if (!L || !player) return;
    var s = state(), narrow = (typeof W === "number" ? W : 1440) * (typeof trailZoom === "number" && trailZoom > 0 ? trailZoom : 1) < 700;
    var rad = narrow ? 9 : 15, cy = top + rad + 2, ly = cy + rad + 11, fpx = narrow ? 10 : 13, ls = narrow ? "0.3px" : "0.6px";
    ctx.save();
    ctx.font = "600 " + fpx + "px 'Plex Cond', sans-serif"; ctx.letterSpacing = ls;
    var mw = function (t) { return (ctx.measureText(t).width || t.length * fpx * 0.6); };
    var slot = [Math.max(mw(L.need + " LEFT"), mw("DEN")), Math.max(mw(clock(L.par)), mw("OVER")), Math.max(mw("UNSEEN"), mw("SPOTTED"))]
      .map(function (w) { return Math.max(rad * 2 + 6, Math.ceil(w)); });
    var cxs = [], at = x, gap = narrow ? 4 : 8;
    slot.forEach(function (w) { cxs.push(at + w / 2); at += w + gap; });
    BH.hudMedals.right = at - gap;
    [s.den, s.par, s.unseen].forEach(function (b, i) {
      var cx = cxs[i], sc = 1;
      if (b.pulse) sc = 1 + 0.08 * (0.5 + 0.5 * Math.sin(simTime * 6.283 * 1.25));
      medal(ctx, cx, cy, rad, b, sc);
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.letterSpacing = ls;
      ctx.font = (b.on ? "600 " : "500 ") + fpx + "px 'Plex Cond', sans-serif";
      ctx.fillStyle = b.flash ? "#c8412f" : b.on ? "#ffe08a" : "#e8a493";
      ctx.fillText(b.text, cx, ly);
    });
    ctx.letterSpacing = "0px";
    ctx.restore();
  }

  BH.hudMedals = { state: state, draw: draw };
})();
