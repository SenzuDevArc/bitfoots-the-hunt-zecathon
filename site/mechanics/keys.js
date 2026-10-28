(function () {
  "use strict";
  if (!window.BH) window.BH = {};

  var RING = [13.5, 3.2], GAP = 0.95, MAIL_IN = 1.3;
  var BRASS = "#d8a640", BRASS_D = "#7a5414", INK = "#13202c";

  function R(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(x, y, w, h); }

  function glow(g, x, y, r, rgb, a) {
    var h = g.createRadialGradient(x, y, 1, x, y, r);
    h.addColorStop(0, "rgba(" + rgb + "," + a.toFixed(3) + ")"); h.addColorStop(1, "rgba(" + rgb + ",0)");
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = h; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.restore();
  }
  function hook(g, x, y) { R(g, x - 1, y - 9, 2, 5, BRASS_D); R(g, x - 1, y - 9, 1, 4, BRASS); }

  function doorKey(g, x, y) {
    hook(g, x, y);
    R(g, x - 5, y - 4, 8, 8, INK); R(g, x - 4, y - 3, 6, 6, BRASS); R(g, x - 2, y - 1, 2, 2, INK); R(g, x - 4, y - 3, 2, 1, "#fff0c0");
    R(g, x + 3, y - 1, 9, 3, INK); R(g, x + 3, y, 8, 1, BRASS);
    R(g, x + 7, y + 2, 2, 3, INK); R(g, x + 10, y + 2, 3, 4, INK); R(g, x + 7, y + 2, 1, 2, BRASS); R(g, x + 11, y + 2, 1, 3, BRASS);
  }
  function glassKey(g, x, y, lit) {
    hook(g, x, y);
    var c = lit ? "#e6f8ff" : C.ice;
    R(g, x - 5, y - 4, 8, 8, INK); R(g, x - 4, y - 3, 6, 6, c); R(g, x - 2, y - 1, 2, 2, INK); R(g, x - 4, y - 3, 2, 2, "#ffffff");
    R(g, x + 3, y - 1, 9, 3, INK); R(g, x + 3, y, 8, 1, c);
    R(g, x + 8, y + 2, 2, 3, INK); R(g, x + 11, y + 2, 2, 4, INK); R(g, x + 8, y + 2, 1, 2, c); R(g, x + 11, y + 2, 1, 3, c);
  }
  function mailbox(g, x, y, lit) {
    hook(g, x, y);
    R(g, x - 6, y - 4, 13, 9, INK); R(g, x - 5, y - 3, 11, 7, "#6b4a2e"); R(g, x - 5, y - 3, 11, 1, "#8a6440");
    R(g, x - 3, y - 1, 7, 3, INK); R(g, x - 2, y, 5, 1, lit ? C.gold : "#2a3a48");
    R(g, x + 7, y - 3, 1, 4, INK); R(g, x + 8, y - 3, 2, 2, C.red);
  }
  function label(g, x, y, text, a) {
    g.save(); g.globalAlpha = a;
    g.font = "700 8px 'Plex Mono', monospace"; g.textAlign = "right"; g.textBaseline = "middle";
    var w = Math.ceil(g.measureText(text).width) + 6;
    R(g, x - w, y - 5, w, 10, "rgba(0,0,0,0.72)");
    g.fillStyle = C.ink; g.fillText(text, x - 3, y + 0.5);
    g.restore();
  }
  function line(g, x0, y0, x1, y1, col, a, dash) {
    g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 1;
    g.setLineDash(dash); g.lineDashOffset = -simTime * 12;
    g.beginPath(); g.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5); g.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5); g.stroke();
    g.restore();
  }

  var info = { live: false, glassLines: 0, mailLines: 0, mailLit: false, door: "player" };

  function draw(g, a, t, seen) {
    info.live = !!(L && L.tid === "glasskey"); info.glassLines = 0; info.mailLines = 0; info.mailLit = false;
    if (!info.live) return;
    var shown = t >= 0, x = RING[0] * T, y0 = RING[1] * T;
    var yd = Math.round(y0 + 8), yg = Math.round(y0 + 8 + GAP * T), ym = Math.round(y0 + 8 + GAP * T * 2);

    R(g, x - 1, y0 - 4, 3, ym - y0 + 4, "#3a2a1a"); R(g, x - 4, y0 - 6, 9, 3, BRASS_D); R(g, x - 3, y0 - 6, 7, 1, BRASS);

    var rows = shown ? ((BH.river && BH.river.log) || []) : [], lx = a.x + 12, ly = a.y - 4;
    var gk = shown ? Math.min(1, t / 0.5) : 0, mk = shown ? Math.max(0, Math.min(1, (t - MAIL_IN) / 0.4)) : 0;
    rows.forEach(function (r, i) {
      var ra = Math.max(0, Math.min(1, (t - 0.3 - i * 0.2) / 0.35));
      if (ra <= 0 || seen(r.x, r.y)) return;
      line(g, lx, ly, r.x, r.y, C.ice, 0.55 * ra * gk, [3, 3]); info.glassLines++;
      if (r.dir === "in" && mk > 0) { line(g, x + 2, ym, r.x, r.y + 3, C.gold, 0.7 * mk, [1, 2]); info.mailLines++; }
    });

    var pulse = 0.5 + 0.5 * Math.sin(simTime * 3);
    if (shown) glow(g, x + 3, yg, T * 0.55, "191,233,255", 0.35 + 0.15 * pulse);
    if (mk > 0) { glow(g, x + 1, ym, T * 0.5, "234,186,73", 0.4 * mk); info.mailLit = true; }

    doorKey(g, x - 3, yd);
    glassKey(g, x - 3, yg, shown);
    mailbox(g, x + 1, ym, mk > 0.5);

  }

  function drawTop(g) {
    if (!info.live) return;
    var x = RING[0] * T, y0 = RING[1] * T;
    label(g, x - 9, Math.round(y0 + 8), "DOOR KEY", 0.9);
    label(g, x - 9, Math.round(y0 + 8 + GAP * T), "GLASS KEY", 0.9);
    label(g, x - 9, Math.round(y0 + 8 + GAP * T * 2), "MAILBOX", 0.9);
  }

  BH.keys = {
    draw: draw,
    drawTop: drawTop,
    info: function () { return { live: info.live, glassLines: info.glassLines, mailLines: info.mailLines, mailLit: info.mailLit, door: info.door }; }
  };
})();
