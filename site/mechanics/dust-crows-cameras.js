"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.features.register) return;

  var DUST_TAG = 12, DUST_PING = 3, DUST_FUZZ = 1.5;
  var CROW_R = 3, CROW_CAW = 8, CROW_AWAY = 6, CROW_REST = 0.8, CROW_WARN = 6;
  var CAM_RANGE = 4.5, CAM_HALF = 0.42, CAM_REPORT = 8;
  var CALM = { patrol: 1, "return": 1, search: 1, check: 1, watch: 1 };

  var COPY = {
    dust: { words: { meet: "DUSTED", clear: "CLEAN" }, signs: ["SOME COINS ARE BAIT", "WATER HIDES THE TAG"],
      idea: "a dusting attack",
      dev: "A dusting attack sends tiny amounts to transparent addresses so that, when they're spent together with other coins, the addresses can be linked; shielded addresses don't expose that link." },
    crows: { words: { meet: "WATCHED", caw: "CAW!" }, signs: ["CROWS WATCH THE PATH", "KEEP AWAY, OR SWIM"],
      idea: "public observers: anyone can watch the network",
      dev: "Anyone can run a Zcash node and see transparent transactions as they are broadcast; fully shielded ones reveal no addresses or amounts." },
    camera: { words: { meet: "RECORDED", report: "REPORTED" }, signs: ["CAMERAS NEVER FORGET", "WATER HIDES YOU"],
      idea: "a public ledger records forever and is analysed later",
      dev: "Transparent Zcash transactions are recorded permanently on a public ledger that anyone can analyse later." }
  };
  BH.featB = { copy: COPY };

  if (BH.tiles) {
    BH.tiles.register("u", { marker: true, base: ".", claim: "dust" });
    BH.tiles.register("w", { marker: true, base: ".", claim: "crows" });
    BH.tiles.register("y", { marker: true, base: ".", claim: "camera" });
  }

  function now(api) { return typeof api.time === "function" ? api.time() : api.time; }
  function mk(api, ch) { return ((api.markers && api.markers[ch]) || []).map(function (m) { return { tx: m.tx, ty: m.ty, x: (m.tx + 0.5) * T, y: (m.ty + 0.5) * T }; }); }
  function live(st) { return !!st && (typeof L === "undefined" || L === st.level); }
  function ghosted() { return typeof ghost !== "undefined" && !!ghost; }
  function fx(name) { try { if (typeof sfx === "function") sfx(name); } catch (e) {} }
  function wantPop(st, word, api) { st.want = { word: word, t0: now(api), last: -1 }; }
  function stepPop(st, api) {
    var w = st.want; if (!w) return;
    var t = now(api);
    if (typeof pops !== "undefined" && pops[0] && pops[0].text === w.word) { st.said[w.word] = true; st.want = null; return; }
    if (t - w.t0 > 3) { st.want = null; return; }
    if (t - w.last >= 0.4) { w.last = t; api.pop(w.word); }
  }
  function sendToLook(h, x, y) { h.state = "check"; h.target = { x: x, y: y }; h.path = []; h.pathKey = ""; h.checkT = 0; }
  function nearestCalm(hs, x, y) {
    var best = null, bd = 1e9, ex = Math.floor(x / T), ey = Math.floor(y / T);
    hs.forEach(function (h) {
      if (!CALM[h.state]) return;
      var d = 1e9;
      if (typeof bfsCore === "function") { var r = bfsCore(Math.floor(h.x / T), Math.floor(h.y / T), ex, ey, function (xx, yy) { return solidH(tile(xx, yy)); }); if (r.reached) d = r.path.length; }
      if (d >= 1e9) d = 1e6 + Math.hypot(h.x - x, h.y - y) / T;
      if (d < bd) { bd = d; best = h; }
    });
    return best;
  }
  function dirOf(v) {
    if (typeof v === "number") return v;
    var d = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[v];
    return d != null ? d : Math.PI / 2;
  }
  function label(ctx, text, x, y, col) {
    ctx.font = "600 10px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = ctx.measureText(text).width + 8;
    ctx.fillStyle = "rgba(27,27,27,0.85)"; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 7), Math.round(w), 13);
    ctx.fillStyle = col || C.ink; ctx.fillText(text, x, y);
  }

  var dust = null;
  BH.features.register("dust", {
    copy: COPY.dust,
    onLevelStart: function (level, api) {
      dust = { level: level, bits: mk(api, "u").map(function (d, i) { d.got = false; d.ph = (i * 1.7 + d.tx * 0.37) % 6.283; return d; }),
               tagDur: level.dustTag || DUST_TAG, tagged: false, tagT: -1, nextPing: 0, pings: [], pingCount: 0, got: 0, clears: 0,
               printMark: 0, said: {}, want: null };
    },
    onStep: function (dt, api) {
      if (!live(dust)) return;
      var p = api.player, t = now(api);
      stepPop(dust, api);
      dust.bits.forEach(function (d) {
        if (d.got || Math.hypot(d.x - p.x, d.y - p.y) >= T * 0.55) return;
        d.got = true; dust.got++; dust.tagged = true; dust.tagT = t; dust.nextPing = t;
        fx("coin");
        if (typeof puff === "function") puff(d.x, d.y, 8, "rgba(220,70,50,0.8)", 30);
        if (!dust.said[COPY.dust.words.meet]) wantPop(dust, COPY.dust.words.meet, api);
        api.shake(0.15);
      });
      if (!dust.tagged) { dust.printMark = api.prints.length; return; }
      if (p.inShield) {
        dust.tagged = false; dust.clears++; dust.printMark = api.prints.length;
        if (typeof ring === "function") ring(p.x, p.y, "rgba(190,235,255,0.9)", T * 1.6, 0.6);
        wantPop(dust, COPY.dust.words.clear, api);
        return;
      }
      if (t - dust.tagT >= dust.tagDur) { dust.tagged = false; dust.printMark = api.prints.length; return; }
      markPrints(api);
      if (t >= dust.nextPing) {
        dust.nextPing = t + DUST_PING; dust.pingCount++;
        var x = p.x, y = p.y;
        for (var k = 0; k < 6; k++) {
          var qx = p.x + (api.rng() * 2 - 1) * DUST_FUZZ * T, qy = p.y + (api.rng() * 2 - 1) * DUST_FUZZ * T;
          if (typeof solidH !== "function" || !solidH(tile(Math.floor(qx / T), Math.floor(qy / T)))) { x = qx; y = qy; break; }
        }
        dust.pings.push({ x: x, y: y, t: t, sent: 0 });
        if (dust.pings.length > 6) dust.pings.shift();
        fx("drone");
        if (!ghosted()) api.hunters.forEach(function (h) { if (CALM[h.state]) { sendToLook(h, x, y); dust.pings[dust.pings.length - 1].sent++; } });
      }
    },
    onPlayerMove: function (api) { if (live(dust) && dust.tagged) markPrints(api); },
    onDrawWorld: function (ctx, api) {
      if (!live(dust)) return;
      var t = now(api), p = api.player;
      dust.bits.forEach(function (d) { if (!d.got) drawDust(ctx, d, t); });
      dust.pings.forEach(function (q) {
        var a = t - q.t; if (a < 0 || a > 1.4) return;
        var f = a / 1.4;
        ctx.strokeStyle = "rgba(220,70,50," + (0.8 * (1 - f)).toFixed(3) + ")"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(q.x, q.y, 6 + f * T * 1.6, 0, 6.283); ctx.stroke();
        ctx.fillStyle = "rgba(220,70,50," + (0.9 * (1 - f)).toFixed(3) + ")"; ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
      });
      if (!dust.tagged) return;
      var left = Math.max(0, 1 - (t - dust.tagT) / dust.tagDur), pulse = 0.22 + Math.sin(t * 5) * 0.07;
      ctx.globalCompositeOperation = "lighter";
      var g = ctx.createRadialGradient(p.x, p.y + 4, 2, p.x, p.y + 4, T * 1.1);
      g.addColorStop(0, "rgba(220,70,50," + pulse.toFixed(3) + ")"); g.addColorStop(1, "rgba(220,70,50,0)");
      ctx.fillStyle = g; ctx.fillRect(p.x - T * 1.2, p.y - T * 1.1, T * 2.4, T * 2.4);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(220,70,50,0.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y + 4, T * 0.62, -Math.PI / 2, -Math.PI / 2 + 6.283 * left); ctx.stroke();
      for (var i = 0; i < 4; i++) { var a = t * 2 + i * 1.57; ctx.fillStyle = C.red; ctx.fillRect(Math.round(p.x + Math.cos(a) * 11), Math.round(p.y + 2 + Math.sin(a) * 7), 2, 2); }
    }
  });
  function markPrints(api) {
    var pr = api.prints;
    for (var i = dust.printMark; i < pr.length; i++) pr[i].red = true;
    dust.printMark = pr.length;
  }
  function drawDust(ctx, d, t) {
    var y = d.y + Math.sin(t * 3.4 + d.ph) * 2, w = Math.abs(Math.cos(t * 2.8 + d.ph)) * 3.5 + 2, k = w / 5.5;
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(234,186,73,0.10)"; ctx.beginPath(); ctx.arc(d.x, y, 8, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#9a8446"; ctx.fillRect(d.x - 3 * k, y - 5, 6 * k, 10); ctx.fillRect(d.x - 4.5 * k, y - 3.5, 9 * k, 7);
    ctx.fillStyle = "#e6d38e"; ctx.fillRect(d.x - 2 * k, y - 4, 4 * k, 8); ctx.fillRect(d.x - 3.5 * k, y - 2.5, 7 * k, 5);
    if (w > 4) { ctx.fillStyle = C.red; ctx.fillRect(d.x - 1, y - 1, 2, 2); }
    for (var i = 0; i < 3; i++) {
      var ph = t * 4 + d.ph + i * 2.1, on = Math.sin(ph);
      if (on < 0.35) continue;
      var sx = Math.round(d.x + Math.cos(i * 2.1 + d.ph) * 8), sy = Math.round(y + Math.sin(i * 2.1 + d.ph) * 7);
      ctx.fillStyle = "rgba(255,250,240," + Math.min(1, on).toFixed(2) + ")";
      ctx.fillRect(sx, sy - 2, 1, 5); ctx.fillRect(sx - 2, sy, 5, 1);
    }
  }

  var crows = null;
  BH.features.register("crows", {
    copy: COPY.crows,
    onLevelStart: function (level, api) {
      crows = { level: level, cawR: level.crowCaw || CROW_CAW, birds: mk(api, "w").map(function (c) { c.st = "perch"; c.t0 = -1e9; c.restUntil = 0; c.caws = 0; c.face = 1; return c; }),
                caws: 0, said: {}, want: null, minLand: 1e9, minWater: 1e9 };
    },
    onStep: function (dt, api) {
      if (!live(crows)) return;
      var p = api.player, t = now(api);
      stepPop(crows, api);
      crows.birds.forEach(function (c) {
        var d = Math.hypot(p.x - c.x, p.y - c.y) / T;
        if (p.inShield) crows.minWater = Math.min(crows.minWater, d); else crows.minLand = Math.min(crows.minLand, d);
        if (c.st === "perch") {
          if (Math.abs(p.x - c.x) > 2) c.face = p.x > c.x ? 1 : -1;
          if (!p.inShield && !p.inBush && d < CROW_R && t >= c.restUntil) {
            c.st = "fly"; c.t0 = t; c.caws++; crows.caws++;
            api.noise(c.x, c.y, crows.cawR);
            fx("decoy");
            if (typeof floatText === "function") floatText(c.x, c.y - 30, COPY.crows.words.caw, C.ink, "", 1.2);
            if (!crows.said[COPY.crows.words.meet]) wantPop(crows, COPY.crows.words.meet, api);
          }
        } else if (t - c.t0 >= CROW_AWAY) { c.st = "perch"; c.restUntil = t + CROW_REST; }
      });
    },
    onDrawWorld: function (ctx, api) {
      if (!live(crows)) return;
      var t = now(api), p = api.player;
      crows.birds.forEach(function (c) {
        var d = Math.hypot(p.x - c.x, p.y - c.y) / T;
        drawPerch(ctx, c.x, c.y);
        if (c.st === "perch") {
          if (d < CROW_WARN && !p.inShield) {
            var a = Math.max(0, Math.min(1, (CROW_WARN - d) / 2.5));
            ctx.strokeStyle = "rgba(255,250,240," + (0.12 + 0.28 * a).toFixed(3) + ")"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.lineDashOffset = -t * 6;
            ctx.beginPath(); ctx.arc(c.x, c.y, CROW_R * T, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
          }
          drawCrow(ctx, c.x, c.y - 4, c.face, t, false, d < CROW_R + 1.5 && !p.inShield);
        } else {
          var a2 = t - c.t0, up = Math.min(1, a2 / 0.4, (CROW_AWAY - a2) / 0.6), ang = a2 * 3.2;
          var bx = c.x + Math.cos(ang) * 12 * up, by = c.y - 4 - up * (26 + Math.sin(ang) * 4);
          ctx.fillStyle = "rgba(0,0,0," + (0.3 * up).toFixed(3) + ")"; ctx.beginPath(); ctx.ellipse(bx, c.y + 6, 5, 2, 0, 0, 6.283); ctx.fill();
          drawCrow(ctx, bx, by, Math.sin(ang) > 0 ? -1 : 1, t, true, true);
        }
      });
    }
  });
  function drawPerch(ctx, x, y) {
    ctx.fillStyle = "#3b2a1a"; ctx.fillRect(x - 1.5, y - 4, 3, 16);
    ctx.fillStyle = C.wood; ctx.fillRect(x - 8, y - 5, 16, 3);
    ctx.fillStyle = "#4e3520"; ctx.fillRect(x - 8, y - 3, 16, 1);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x - 5, y + 11, 10, 2);
  }
  function drawCrow(ctx, x, y, face, t, flying, alert) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = "rgba(210,225,235,0.13)"; ctx.beginPath(); ctx.ellipse(0, -9, 14, 11, 0, 0, 6.283); ctx.fill();
    ctx.scale(face * 1.4, 1.4);
    var bob = !flying && Math.sin(t * 2.2) > 0.85 ? 1 : 0;
    ctx.fillStyle = "#0e0e14";
    ctx.fillRect(-5, -8, 9, 6); ctx.fillRect(-4, -9, 7, 1); ctx.fillRect(-9, -7, 5, 3);
    ctx.fillRect(2, -12 + bob, 5, 5);
    ctx.fillStyle = "#6e6e66"; ctx.fillRect(7, -10 + bob, 3, 2);
    ctx.fillStyle = alert ? C.gold : "#8a8a8a"; ctx.fillRect(5, -11 + bob, 1, 1);
    ctx.fillStyle = "#2a2a3c"; ctx.fillRect(-4, -7, 6, 2);
    if (flying) {
      var upW = Math.sin(t * 16) > 0;
      ctx.fillStyle = "#0e0e14";
      if (upW) { ctx.fillRect(-3, -15, 4, 7); ctx.fillRect(-6, -17, 4, 3); } else { ctx.fillRect(-3, -3, 4, 6); ctx.fillRect(-6, 1, 4, 3); }
    } else { ctx.fillStyle = "#2b1d14"; ctx.fillRect(-1, -2, 1, 2); ctx.fillRect(1, -2, 1, 2); }
    ctx.restore();
  }

  var trail = null;
  function camSees(c, p) {
    if (p.inShield || p.inBush) return false;
    var d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d > CAM_RANGE * T || d < 1) return false;
    if (Math.abs(angDiff(Math.atan2(p.y - c.y, p.x - c.x), c.dir)) > CAM_HALF) return false;
    return losClear(c.x, c.y, p.x, p.y);
  }
  BH.features.register("camera", {
    copy: COPY.camera,
    onLevelStart: function (level, api) {
      var dirs = level.cameras || [];
      trail = { level: level, list: mk(api, "y").map(function (c, i) { c.dir = dirOf(dirs[i]); c.seeing = false; c.pending = null; c.recs = 0; c.reports = 0; c.sent = 0; c.last = null; return c; }),
              said: {}, want: null, log: [] };
    },
    onStep: function (dt, api) {
      if (!live(trail)) return;
      var p = api.player, t = now(api);
      stepPop(trail, api);
      trail.list.forEach(function (c) {
        var sees = camSees(c, p);
        if (sees) {
          if (!c.pending) {
            c.pending = { t: t, x: p.x, y: p.y }; c.recs++;
            trail.log.push({ k: "rec", t: +t.toFixed(2), at: [+(p.x / T).toFixed(2), +(p.y / T).toFixed(2)] });
            if (typeof ring === "function") ring(p.x, p.y, "rgba(255,255,255,0.9)", T * 1.2, 0.35);
            fx("tower");
            if (!trail.said[COPY.camera.words.meet]) wantPop(trail, COPY.camera.words.meet, api);
          } else { c.pending.x = p.x; c.pending.y = p.y; }
        }
        c.seeing = sees;
        if (c.pending && t - c.pending.t >= CAM_REPORT) {
          var s = c.pending; c.pending = null; c.reports++;
          var h = ghosted() ? null : nearestCalm(api.hunters, s.x, s.y);
          if (h) { sendToLook(h, s.x, s.y); c.sent++; }
          c.last = { t: t, x: s.x, y: s.y, h: h };
          trail.log.push({ k: "report", t: +t.toFixed(2), at: [+(s.x / T).toFixed(2), +(s.y / T).toFixed(2)], sent: h ? api.hunters.indexOf(h) : -1 });
          fx("spotted"); api.shake(0.2);
          wantPop(trail, COPY.camera.words.report, api);
        }
      });
    },
    onDrawWorld: function (ctx, api) {
      if (!live(trail)) return;
      var t = now(api);
      trail.list.forEach(function (c) {
        var rec = c.seeing;
        ctx.globalCompositeOperation = "lighter";
        var g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, CAM_RANGE * T);
        g.addColorStop(0, rec ? "rgba(220,70,50,0.34)" : "rgba(190,235,255,0.20)"); g.addColorStop(1, rec ? "rgba(220,70,50,0.04)" : "rgba(190,235,255,0.03)");
        ctx.fillStyle = g;
        if (typeof conePoly === "function") conePoly(c.x, c.y, c.dir, CAM_HALF, CAM_RANGE * T, 14); else { ctx.beginPath(); ctx.arc(c.x, c.y, CAM_RANGE * T, c.dir - CAM_HALF, c.dir + CAM_HALF); ctx.lineTo(c.x, c.y); }
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = rec ? "rgba(220,70,50,0.7)" : "rgba(190,235,255,0.35)"; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]);
        var mark = c.pending || (c.last && t - c.last.t < 5 ? c.last : null);
        if (mark) {
          var bl = Math.sin(t * 8) > -0.3 ? 0.95 : 0.35, r = 13, L2 = 5;
          ctx.fillStyle = "rgba(220,70,50," + bl + ")";
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
            var cx = mark.x + s[0] * r, cy = mark.y + s[1] * r;
            ctx.fillRect(s[0] < 0 ? cx : cx - L2, cy - 1, L2, 2); ctx.fillRect(cx - 1, s[1] < 0 ? cy : cy - L2, 2, L2);
          });
          ctx.fillRect(mark.x - 1.5, mark.y - 1.5, 3, 3);
        }
        if (c.last && c.last.h && t - c.last.t < 1.8) {
          var h = c.last.h, fa = 1 - (t - c.last.t) / 1.8;
          ctx.strokeStyle = "rgba(220,70,50," + (0.85 * fa).toFixed(3) + ")"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 30;
          ctx.beginPath(); ctx.moveTo(c.x, c.y - 8); ctx.lineTo(h.x, h.y - 10); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        }
        drawCamera(ctx, c, t);
        if (c.pending) {
          var f = Math.min(1, (t - c.pending.t) / CAM_REPORT);
          ctx.strokeStyle = "rgba(220,70,50,0.9)"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(c.x, c.y - 7, 13, -Math.PI / 2, -Math.PI / 2 + 6.283 * f); ctx.stroke();
          label(ctx, "REC", c.x, c.y - 28, C.red);
        }
      });
    }
  });
  function drawCamera(ctx, c, t) {
    var dx = Math.cos(c.dir), dy = Math.sin(c.dir);
    ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y) + 12); ctx.scale(1.3, 1.3); ctx.translate(0, -12);
    var x = 0, y = 0;
    ctx.fillStyle = "#3b2a1a"; ctx.fillRect(x - 1.5, y - 2, 3, 14);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x - 5, y + 11, 10, 2);
    ctx.fillStyle = "#1f1f1c"; ctx.fillRect(x - 7, y - 13, 14, 11);
    ctx.fillStyle = "#3a3a36"; ctx.fillRect(x - 7, y - 14, 14, 2); ctx.fillRect(x - 7, y - 13, 1, 11);
    ctx.fillStyle = "#4b4b44"; ctx.fillRect(x - 6, y - 12, 12, 1);
    var lx = x + Math.round(dx * 5), ly = y - 7 + Math.round(dy * 3);
    ctx.fillStyle = "#0c1428"; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, 6.283); ctx.fill();
    ctx.strokeStyle = C.ice; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, 6.283); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.fillRect(lx - 1, ly - 2, 1, 1);
    var on = c.seeing || c.pending || Math.sin(t * 3) > 0.2;
    ctx.fillStyle = on ? C.red : "#5a1a12"; ctx.fillRect(x - 5 + (dx < -0.5 ? 8 : 0), y - 12, 2, 2);
    ctx.restore();
  }

  var prevState = BH.featureState;
  BH.featureState = function (id) {
    if (id === "dust") { if (!live(dust)) return null; return { tagged: dust.tagged, got: dust.got, left: dust.bits.filter(function (d) { return !d.got; }).length, pings: dust.pingCount, clears: dust.clears, tagT: dust.tagT, lastPing: dust.pings.length ? dust.pings[dust.pings.length - 1] : null, said: Object.keys(dust.said) }; }
    if (id === "crows") { if (!live(crows)) return null; return { caws: crows.caws, birds: crows.birds.map(function (c) { return { st: c.st, caws: c.caws, at: [c.tx, c.ty] }; }), minLand: +crows.minLand.toFixed(2), minWater: +crows.minWater.toFixed(2), said: Object.keys(crows.said) }; }
    if (id === "camera") { if (!live(trail)) return null; return { cams: trail.list.map(function (c) { return { recs: c.recs, reports: c.reports, sent: c.sent, seeing: c.seeing, pending: !!c.pending, dir: +c.dir.toFixed(3), at: [c.tx, c.ty] }; }), log: trail.log.slice(), said: Object.keys(trail.said) }; }
    return prevState ? prevState(id) : null;
  };
  BH.featB.geom = { CAM_RANGE: CAM_RANGE, CAM_HALF: CAM_HALF, CAM_REPORT: CAM_REPORT, CROW_R: CROW_R, DUST_TAG: DUST_TAG, DUST_PING: DUST_PING, camSees: camSees };
})();
