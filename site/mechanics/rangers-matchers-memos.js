"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.features.register) return;

  if (BH.tiles) {
    BH.tiles.register("S", { solid: true, claim: "memo", draw: function (b, px, py, x, y) { drawPine(b, px, py, hash(x, y)); } });
    BH.tiles.register("X", { solid: true, claim: "matcher", draw: function (b, px, py) {
      b.fillStyle = "#2c2c29"; b.fillRect(px + 1, py + 1, T - 2, T - 2);
      b.fillStyle = "#1b1b1b"; for (var i = 0; i < 4; i++) b.fillRect(px + 4 + i * 7, py + 2, 3, T - 4);
      b.fillStyle = C.red; b.fillRect(px + 2, py + T / 2 - 2, T - 4, 3);
    } });
  }

  function tilesOf(level, ch) {
    var out = [];
    (level.map || []).forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === ch) out.push([x, y]); });
    return out;
  }
  function tx(p) { return Math.floor(p.x / T); }
  function ty(p) { return Math.floor(p.y / T); }
  function center(t) { return { x: (t[0] + 0.5) * T, y: (t[1] + 0.5) * T }; }
  function now(api) { return typeof api.time === "function" ? api.time() : api.time; }
  function near(a, b, r) { return Math.hypot(a.x - b.x, a.y - b.y) < r; }
  function cool(state, key, api, sec) { var t = now(api); if ((state[key] || -1e9) + sec > t) return false; state[key] = t; return true; }
  function label(ctx, text, x, y, col, bg) {
    ctx.font = "600 10px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = ctx.measureText(text).width + 8;
    ctx.fillStyle = bg || "rgba(27,27,27,0.85)"; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 7), Math.round(w), 13);
    ctx.fillStyle = col || C.ink; ctx.fillText(text, x, y);
  }
  var NOTE_LH = 17;
  function note(ctx, lines, x, y, col, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = "500 13px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = 0; lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
    w += 20; var h = lines.length * NOTE_LH + 12, x0 = Math.round(x - w / 2), y0 = Math.round(y - h);
    ctx.fillStyle = "rgba(245,232,200,0.96)"; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = "rgba(107,74,46,0.9)"; ctx.fillRect(x0, y0, w, 2); ctx.fillRect(x0, y0 + h - 2, w, 2);
    ctx.fillStyle = col || "#2b1d14";
    lines.forEach(function (l, i) { ctx.fillText(l, x, y0 + 14 + i * NOTE_LH); });
    ctx.restore();
  }
  function wrap(text, max) {
    var words = String(text).split(" "), lines = [], cur = "";
    words.forEach(function (w) { if ((cur + " " + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur += " " + w; });
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }
  function live(st) { return !!st && (typeof L === "undefined" || !st.level || L === st.level); }
  function worldToScreen(x, y) {
    if (typeof clampCam !== "function" || typeof cam === "undefined" || !zoom) return null;
    var vw = W / zoom, vh = H / zoom, cx = clampCam(cam.x, vw, cols * T), cy = clampCam(cam.y, vh, rows * T);
    return { x: W / 2 + (x - cx) * zoom, y: H / 2 + (y - cy) * zoom };
  }
  function wet(c) { return typeof isWater === "function" ? isWater(c) : c === "~"; }
  function seeBy(h, p) {
    var d = Math.hypot(p.x - h.x, p.y - h.y);
    if (h.type === "dog") return d < D_SENSE * T;
    if (d < 1.25 * T) return true;
    if (d > visionOf(h) * T) return false;
    if (Math.abs(angDiff(Math.atan2(p.y - h.y, p.x - h.x), h.dir)) > CONE) return false;
    return losClear(h.x, h.y, p.x, p.y);
  }

  var memo = null, MEMO_AFTER = 3;
  function inCave(q, x, y) { var c = q.cave; return !!c && x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3]; }
  BH.features.register("memo", {
    onLevelStart: function (level, api) {
      var texts = level.memos || [];
      memo = { stones: tilesOf(level, "m").map(function (t, i) { var m = texts[i] || {}; return { t: t, text: m.text || "", reveal: !!m.reveal, read: false, readAt: -1, reads: 0, on: false, offAt: -1e9 }; }),
               secret: tilesOf(level, "S"), cave: level.cave || null, revealed: false, first: true, caveSaid: false, level: level };
    },
    onStep: function (dt, api) {
      if (!live(memo)) return;
      var p = api.player, px = tx(p), py = ty(p), t = now(api);
      memo.stones.forEach(function (s) {
        var here = s.t[0] === px && s.t[1] === py;
        if (here && !s.on) {
          s.on = true; s.readAt = t; s.reads++;
          if (!s.read) { s.read = true; api.say(memo.first ? "memoFirst" : "memo"); memo.first = false; }
          if (s.reveal && !memo.revealed) {
            memo.revealed = true; api.shake(0.25);
            memo.secret.forEach(function (q) { api.setTile(q[0], q[1], "."); });
          }
        } else if (!here && s.on) { s.on = false; s.offAt = t; }
      });
      if (memo.revealed && !memo.caveSaid && inCave(memo, px, py) && cool(memo, "caveT", api, 0.4)) {
        api.say("caveIn");
        var w = F.words.caveIn;
        if (!w || (typeof pops !== "undefined" && pops[0] && pops[0].text === w.word)) memo.caveSaid = true;
      }
    },
    onDrawWorld: function (ctx, api) {
      if (!live(memo)) return;
      var t = now(api), G = F.gp || {};
      if (memo.cave) {
        var cv = memo.cave;
        for (var y = cv[1]; y <= cv[3]; y++) for (var x = cv[0]; x <= cv[2]; x++) {
          if (!memo.revealed) { ctx.fillStyle = C.ground; ctx.fillRect(x * T, y * T, T, T); drawPine(ctx, x * T, y * T, hash(x, y)); }
          else { ctx.fillStyle = "rgba(10,10,14,0.42)"; ctx.fillRect(x * T, y * T, T, T); ctx.fillStyle = "rgba(120,120,130,0.18)"; ctx.fillRect(x * T + Math.floor(hash(x, y) * 20), y * T + Math.floor(hash(y, x) * 24), 6, 3); }
        }
      }
      memo.stones.forEach(function (s) {
        var c = center(s.t);
        var glow = s.read ? 0.16 + Math.sin(t * 2) * 0.05 : 0.35 + Math.sin(t * 3) * 0.15;
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(190,235,255," + glow.toFixed(3) + ")"; ctx.beginPath(); ctx.arc(c.x, c.y, 14, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
        if (!s.on) label(ctx, "MEMO", c.x, c.y - T * 0.65, C.ice);
        if (s.read && !s.on) label(ctx, G.memoHint || "STAND HERE TO READ", c.x, c.y + T * 0.7, "rgba(190,235,255,0.8)");
      });
      if (!memo.revealed) return;
      var empty = memo.cave && coins.every(function (k) { return k.got || !inCave(memo, Math.floor(k.x / T), Math.floor(k.y / T)); });
      var inside = memo.cave && inCave(memo, tx(api.player), ty(api.player));
      memo.secret.forEach(function (s) {
        var x = s[0] * T, y = s[1] * T, c = center(s), a = 0.2 + Math.sin(t * 2) * 0.06;
        ctx.fillStyle = "#3a3a36"; ctx.fillRect(x - 2, y + 2, 6, T - 2); ctx.fillRect(x + T - 4, y + 2, 6, T - 2); ctx.fillRect(x - 2, y - 2, T + 4, 6);
        ctx.fillStyle = "#52524c"; ctx.fillRect(x, y - 2, T, 2); ctx.fillStyle = "#050505"; ctx.fillRect(x + 4, y + 4, T - 8, T - 4);
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(190,235,255," + a.toFixed(3) + ")"; ctx.beginPath(); ctx.arc(c.x, c.y, T * 0.9, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
        label(ctx, inside && empty ? (G.caveBack || "BACK OUT TO THE DEN") : (G.cave || "SECRET CAVE"), c.x, c.y - T * 0.75, inside && empty ? C.gold : C.ice);
      });
    },
    onDrawOver: function (ctx, api) {
      if (!live(memo)) return;
      var t = now(api), cur = null;
      memo.stones.forEach(function (s) { if (s.text && (s.on || t - s.offAt < MEMO_AFTER) && (!cur || s.readAt > cur.readAt)) cur = s; });
      if (!cur) return;
      var alpha = Math.min(1, (t - cur.readAt) * 4, cur.on ? 1 : (MEMO_AFTER - (t - cur.offAt)) * 2);
      var ps = worldToScreen(api.player.x, api.player.y), Hd = window.innerHeight, cy = Math.min(Hd - 40, (ps ? ps.y : Hd / 2) + 60);
      var lines = [(F.gp && F.gp.memoCard) || "A MEMO HUNTERS CAN'T READ"].concat(wrap(cur.text, 34));
      note(ctx, lines, window.innerWidth / 2, cy + lines.length * NOTE_LH + 12, null, alpha);
    }
  });

  var esc = null, BABY_GAP = 1.2;
  function pathLeft(e, p) {
    var d = 0, prev = { x: e.x, y: e.y };
    for (var i = 0; i < e.crumbs.length; i++) { d += Math.hypot(e.crumbs[i].x - prev.x, e.crumbs[i].y - prev.y); prev = e.crumbs[i]; }
    return d + Math.hypot(p.x - prev.x, p.y - prev.y);
  }
  var ESC_TAG = ["LITTLE FOOT", "FOLLOWS YOU"], ESC_TAG_HOLD = 3.5, ESC_HOP = 0.8;
  function escIntro(t) {
    if (!esc) return { tag: false, hop: 0, alpha: 0 };
    if (esc.introT == null) return { tag: true, hop: 0, alpha: 1 };
    var s = t - esc.introT;
    return { tag: s < ESC_TAG_HOLD, hop: s < ESC_HOP ? s / ESC_HOP : 0, alpha: Math.max(0, Math.min(1, (ESC_TAG_HOLD - s) / 0.5)) };
  }
  BH.features.register("escort", {
    onLevelStart: function (level, api) {
      var mk = api.markers && api.markers.B && api.markers.B[0], b = mk ? [mk.tx, mk.ty] : tilesOf(level, "B")[0], d = tilesOf(level, "D")[0];
      if (b && !mk) api.setTile(b[0], b[1], ".");
      var s = b ? center(b) : { x: api.player.x, y: api.player.y };
      esc = { x: s.x, y: s.y, dir: "right", crumbs: [], prints: [], dist: 0, side: 1, inWater: false, moving: false, animT0: 0, anim: "idle",
              den: d, closed: false, seenSaid: false, lostT: -1, level: level, p0: { x: api.player.x, y: api.player.y }, introT: null };
      if (d) { api.setTile(d[0], d[1], "#"); esc.closed = true; }
    },
    onStep: function (dt, api) {
      if (!live(esc)) return;
      var p = api.player, t = now(api), last = esc.crumbs[esc.crumbs.length - 1];
      if (esc.introT == null && Math.hypot(p.x - esc.p0.x, p.y - esc.p0.y) > 0.5 * T) esc.introT = t;
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1) esc.crumbs.push({ x: p.x, y: p.y, t: t });
      var budget = (esc.inWater ? SPEED_WATER : SPEED_LAND) * T * dt, ox = esc.x, oy = esc.y;
      budget = Math.min(budget, Math.max(0, pathLeft(esc, p) - BABY_GAP * T));
      while (budget > 0 && esc.crumbs.length) {
        var c = esc.crumbs[0], dx = c.x - esc.x, dy = c.y - esc.y, d = Math.hypot(dx, dy);
        if (d <= budget) { esc.x = c.x; esc.y = c.y; budget -= d; esc.crumbs.shift(); }
        else { esc.x += dx / d * budget; esc.y += dy / d * budget; budget = 0; }
      }
      var mv = Math.hypot(esc.x - ox, esc.y - oy);
      esc.moving = mv > 0.2;
      if (esc.moving) { var ax = esc.x - ox, ay = esc.y - oy; esc.dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? "right" : "left") : (ay > 0 ? "down" : "up"); }
      var a = esc.moving ? "walk" : "idle"; if (a !== esc.anim) { esc.anim = a; esc.animT0 = t; }
      esc.inWater = wet(api.tileAt(tx(esc), ty(esc)));
      if (!esc.inWater && esc.moving) { esc.dist += mv; if (esc.dist > 0.42 * T) { esc.dist = 0; esc.side = -esc.side; var ang = Math.atan2(esc.y - oy, esc.x - ox); esc.prints.push({ x: esc.x + Math.cos(ang + 1.5708) * 3 * esc.side, y: esc.y + Math.sin(ang + 1.5708) * 3 * esc.side, a: ang }); } }
      var baby = { x: esc.x, y: esc.y };
      for (var i = 0; i < api.hunters.length; i++) {
        var h = api.hunters[i];
        if (esc.inWater) continue;
        if (near(h, baby, CATCH * T)) { api.lose("baby"); return; }
        if (seeBy(h, baby)) {
          if (h.state !== "chase") { h.state = "chase"; h.decoy = false; h.path = []; h.pathKey = ""; api.shake(0.3); if (!esc.seenSaid) { esc.seenSaid = true; api.say("babySeen"); } }
          h.target = { x: esc.x, y: esc.y };
        }
      }
      if (esc.den) {
        var dc = center(esc.den), close = near(baby, dc, 2.5 * T), onDen = tx(p) === esc.den[0] && ty(p) === esc.den[1];
        if (close && esc.closed) { api.setTile(esc.den[0], esc.den[1], "."); esc.closed = false; }
        else if (!close && !esc.closed && !onDen && !near(p, dc, 0.9 * T)) { api.setTile(esc.den[0], esc.den[1], "#"); esc.closed = true; }
        if (esc.closed && near(p, dc, 1.6 * T) && cool(esc, "waitT", api, 2.5)) api.say("babyWait");
      }
      if (Math.hypot(esc.x - p.x, esc.y - p.y) > 9 * T && cool(esc, "farT", api, 6)) api.say("babyFar");
    },
    onDrawWorld: function (ctx, api) {
      if (!live(esc)) return;
      ctx.fillStyle = "rgba(234,186,73,0.55)";
      esc.prints.forEach(function (q) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a + 1.5708); ctx.fillRect(-1, -1, 2, 3); ctx.fillRect(-1.5, -2.5, 1, 1); ctx.fillRect(0.5, -2.5, 1, 1); ctx.restore(); });
      var t = now(api), sc = 0.62, intro = escIntro(t);
      var hop = intro.hop ? Math.abs(Math.sin(intro.hop * Math.PI * 2)) * 7 : 0, feet = esc.y + 8 - hop;
      if (esc.inWater) { var f = (t * 0.9) % 1; ctx.strokeStyle = "rgba(190,235,255," + (0.45 * (1 - f)).toFixed(3) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(esc.x, feet, 6 + f * 12, 2 + f * 5, 0, 0, 6.283); ctx.stroke(); }
      else { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(esc.x, feet, 7, 2.5, 0, 0, 6.283); ctx.fill(); }
      ctx.save(); ctx.translate(esc.x, feet); ctx.scale(sc, sc); ctx.translate(-esc.x, -feet);
      var top = drawBitfoot(esc.x, feet, esc.dir, esc.anim, t - esc.animT0, esc.inWater ? 0.85 : 1);
      ctx.restore();
      var hy = feet - (feet - top) * sc - 6;
      var hk = intro.tag ? 2 : 1;
      ctx.save(); ctx.translate(esc.x, hy); ctx.scale(hk, hk); ctx.translate(-esc.x, -hy);
      ctx.fillStyle = C.gold; ctx.fillRect(esc.x - 3, hy - 2, 2, 2); ctx.fillRect(esc.x + 1, hy - 2, 2, 2); ctx.fillRect(esc.x - 3, hy, 6, 2); ctx.fillRect(esc.x - 2, hy + 2, 4, 1); ctx.fillRect(esc.x - 1, hy + 3, 2, 1);
      ctx.restore();
      if (intro.tag) {
        var ny = hy - 8 * hk - 4;
        var ts = worldToScreen(esc.x, ny - 22);
        if (ts && ts.y < 150) ny = feet + 30;
        ctx.save(); ctx.globalAlpha = intro.alpha;
        label(ctx, ESC_TAG[1], esc.x, ny, C.ink, "rgba(43,29,20,0.9)"); label(ctx, ESC_TAG[0], esc.x, ny - 14, C.gold, "rgba(43,29,20,0.9)");
        ctx.restore();
      }
      if (esc.den && esc.closed) { var dc = center(esc.den); drawDen(ctx, esc.den[0] * T, esc.den[1] * T); label(ctx, "WAIT FOR LITTLE FOOT", dc.x, dc.y + T * 0.75, C.gold); }
    }
  });

  var dawn = null;
  BH.features.register("dawn", {
    onLevelStart: function (level, api) { dawn = { at: level.dawnAt || Math.round(level.par * 1.3), t0: now(api), up: false, upT: 0, level: level }; },
    onStep: function (dt, api) {
      if (!live(dawn)) return;
      var t = now(api), el = t - dawn.t0;
      if (!dawn.up && el >= dawn.at) { dawn.up = true; dawn.upT = t; api.say("dawn"); api.shake(0.4); }
      var abs = typeof simTime === "number" ? simTime : t;
      if (dawn.up) api.prints.forEach(function (p) { p.red = true; if (abs - p.t > 20) p.t = abs - 20; });
    },
    onDrawOver: function (ctx, api) {
      if (!live(dawn)) return;
      var t = now(api), el = t - dawn.t0, left = dawn.at - el, Wd = window.innerWidth, Hd = window.innerHeight;
      var night = dawn.up ? 0 : Math.max(0, Math.min(1, left / 20)), warm = dawn.up ? Math.max(0.12, 0.4 - (t - dawn.upT) * 0.1) : (1 - night) * 0.3;
      if (night > 0) { ctx.fillStyle = "rgba(6,10,30," + (0.28 * night).toFixed(3) + ")"; ctx.fillRect(0, 0, Wd, Hd); }
      if (warm > 0) { var g = ctx.createLinearGradient(0, 0, 0, Hd); g.addColorStop(0, "rgba(255,170,90," + warm.toFixed(3) + ")"); g.addColorStop(1, "rgba(255,170,90,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd); }
      if (!dawn.up) return;
      var txt = "DAWN · EVERY PRINT IS READABLE";
      ctx.font = "600 12px 'Plex Mono', monospace"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      var w = ctx.measureText(txt).width + 16, x1 = Wd - 18, y = 50;
      ctx.fillStyle = "rgba(27,27,27,0.85)"; ctx.fillRect(x1 - w, y - 11, w, 22);
      ctx.fillStyle = C.red; ctx.fillRect(x1 - w, y + 9, w, 2); ctx.fillText(txt, x1 - 8, y);
    }
  });

  var rg = null, TELL_AFTER = 25;
  BH.features.register("ranger", {
    onLevelStart: function (level, api) {
      var k = tilesOf(level, "v")[0], at = level.ranger || [1, 1];
      if (k) api.setTile(k[0], k[1], ".");
      rg = { gates: tilesOf(level, "R"), key: k, hasKey: false, open: false, openT: 0, path: [], lastWater: null, sampleT: 0,
             x: (at[0] + 0.5) * T, y: (at[1] + 0.5) * T, dir: Math.PI / 2, step: 0, walk: [], walkT: 0, told: false, tellT: -1, level: level };
    },
    onStep: function (dt, api) {
      if (!live(rg)) return;
      var p = api.player, t = now(api);
      if (rg.key && !rg.hasKey && tx(p) === rg.key[0] && ty(p) === rg.key[1]) { rg.hasKey = true; api.say("viewKey"); }
      if (!rg.key && !rg.hasKey && BH.cave && BH.cave.got("key")) rg.hasKey = true;
      var atGate = rg.gates.some(function (g) { return near(p, center(g), 1.3 * T); });
      if (!rg.open && atGate) {
        if (rg.hasKey) { rg.open = true; rg.openT = t; rg.gates.forEach(function (g) { api.setTile(g[0], g[1], "."); }); api.say("disclosed"); api.shake(0.2); }
        else if (cool(rg, "askT", api, 3)) { api.say("rangerAsk"); rg.askedAt = t; }
      }
      if (!rg.open) return;
      rg.sampleT -= dt;
      if (rg.sampleT <= 0) { rg.sampleT = 0.2; rg.path.push({ x: p.x, y: p.y, w: !!p.inShield }); }
      if (p.inShield) rg.lastWater = { x: p.x, y: p.y };
      if (rg.told || t - rg.openT < TELL_AFTER) return;
      var best = null, bd = 1e9;
      api.hunters.forEach(function (h) { var d = Math.hypot(h.x - rg.x, h.y - rg.y); if (d < bd) { bd = d; best = h; } });
      if (!best) { rg.told = true; return; }
      if (bd < 1.5 * T) {
        rg.told = true; rg.tellT = t;
        var spot = rg.lastWater || rg.path[rg.path.length - 1];
        if (spot) { best.state = "rush"; best.decoy = false; best.target = { x: spot.x, y: spot.y }; best.path = []; best.pathKey = ""; }
        api.say("rangerTold"); api.shake(0.25);
        return;
      }
      rg.walkT -= dt;
      if (rg.walkT <= 0 || !rg.walk.length) { rg.walkT = 0.5; rg.walk = bfs(Math.floor(rg.x / T), Math.floor(rg.y / T), Math.floor(best.x / T), Math.floor(best.y / T), solidH); }
      if (rg.walk.length) {
        var g = rg.walk[0], dx = g[0] - rg.x, dy = g[1] - rg.y, d = Math.hypot(dx, dy), sp = 2.4 * T * dt;
        if (d < 3) rg.walk.shift(); else { var m = Math.min(d, sp); rg.x += dx / d * m; rg.y += dy / d * m; rg.step += m; rg.dir = Math.atan2(dy, dx); }
      }
    },
    onDrawWorld: function (ctx, api) {
      if (!live(rg)) return;
      var t = now(api);
      if (rg.open && rg.path.length > 1) {
        ctx.strokeStyle = "rgba(200,205,210,0.6)"; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.beginPath();
        rg.path.forEach(function (q, i) { if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.lineTo(api.player.x, api.player.y); ctx.stroke(); ctx.setLineDash([]);
      }
      rg.gates.forEach(function (g) {
        var x = g[0] * T, y = g[1] * T;
        if (rg.open) { ctx.fillStyle = "#4b3522"; ctx.fillRect(x + 1, y + 2, 4, T - 4); ctx.fillRect(x + T - 5, y + 2, 4, T - 4); return; }
        ctx.fillStyle = C.gold; ctx.fillRect(x + T / 2 - 3, y + 13, 6, 6); ctx.fillStyle = "#1b1b1b"; ctx.fillRect(x + T / 2 - 1, y + 15, 2, 3);
      });
      if (rg.key && !rg.hasKey) {
        var c = center(rg.key), b = Math.sin(t * 3) * 2;
        if (rg.askedAt != null && t - rg.askedAt < 4) {
          var pl = api.player, fa = Math.min(1, (4 - (t - rg.askedAt)) / 0.8);
          ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = "rgba(190,235,255,0.75)"; ctx.lineWidth = 2; ctx.setLineDash([2, 7]); ctx.lineDashOffset = -t * 20;
          ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.restore();
        }
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(190,235,255,0.22)"; ctx.beginPath(); ctx.arc(c.x, c.y + b, 12, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = C.ice; ctx.fillRect(c.x - 7, c.y - 4 + b, 7, 7); ctx.fillStyle = "#1b1b1b"; ctx.fillRect(c.x - 5, c.y - 2 + b, 3, 3);
        ctx.fillStyle = C.ice; ctx.fillRect(c.x, c.y - 1 + b, 8, 2); ctx.fillRect(c.x + 4, c.y + 1 + b, 2, 3); ctx.fillRect(c.x + 7, c.y + 1 + b, 1, 2);
        label(ctx, "VIEWING KEY", c.x, c.y - 16 + b, C.ice);
      }
      var mp = !rg.key && !rg.hasKey && rg.askedAt != null && t - rg.askedAt < 4 && BH.cave && BH.cave.mouthPx();
      if (mp) {
        ctx.save(); ctx.globalAlpha = Math.min(1, (4 - (t - rg.askedAt)) / 0.8); ctx.strokeStyle = "rgba(190,235,255,0.75)"; ctx.lineWidth = 2; ctx.setLineDash([2, 7]); ctx.lineDashOffset = -t * 20;
        ctx.beginPath(); ctx.moveTo(api.player.x, api.player.y); ctx.lineTo(mp.x, mp.y); ctx.stroke(); ctx.restore();
      }
      drawHunterBody({ x: rg.x, y: rg.y, dir: rg.dir, step: rg.step, state: "" }, { scale: 1.1, coat: "#3c5a2e", band: "#d9c27a", markLift: 22 });
      if (rg.open && !rg.told) {
        var left = Math.max(0, TELL_AFTER - (t - rg.openT));
        label(ctx, left > 0 ? "WATCHING · " + Math.ceil(left) + "s" : "WALKING OVER…", rg.x, rg.y - 30, nameColor("ranger", "rgba(220,225,230,1)"));
      } else if (rg.told && t - rg.tellT < 3) label(ctx, "TOLD A HUNTER", rg.x, rg.y - 30, C.red);
      else if (!rg.open) label(ctx, "RANGER", rg.x, rg.y - 30, nameColor("ranger", "rgba(220,225,230,1)"));
    }
  });

  var deep = null;
  BH.features.register("deep", {
    onLevelStart: function (level, api) {
      var t = tilesOf(level, "≈");
      tilesOf(level, "c").concat(tilesOf(level, "P")).forEach(function (c) {
        var row = level.map[c[1]];
        if (row[c[0] - 1] === "≈" && row[c[0] + 1] === "≈") { t.push(c); api.setTile(c[0], c[1], "≈"); }
      });
      deep = { tiles: t, key: {}, sealed: false, level: level };
      t.forEach(function (q) { deep.key[q[0] + "," + q[1]] = 1; });
    },
    onStep: function (dt, api) {
      if (!live(deep)) return;
      var p = api.player;
      if (deep.sealed) return;
      var r = 0.36 * T, touching = [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]].some(function (o) { return deep.key[Math.floor((p.x + o[0]) / T) + "," + Math.floor((p.y + o[1]) / T)]; });
      if (!touching) { deep.sealed = true; api.say("sealed"); }
    },
    onDrawWorld: function (ctx, api) {
      if (!live(deep)) return;
      if (deep.sealed) deep.tiles.forEach(function (q) {
        var x = q[0] * T, y = q[1] * T;
        ctx.fillStyle = "rgba(191,233,255,0.10)"; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = "rgba(191,233,255,0.30)"; ctx.fillRect(x + 4, y + 6, 10, 2); ctx.fillRect(x + 16, y + 20, 12, 2);
      });
      if (deep.tiles.length) {
        var sx = 0, sy = 1e9; deep.tiles.forEach(function (q) { sx += q[0]; sy = Math.min(sy, q[1]); });
        label(ctx, deep.sealed ? "OLD POOL · SEALED" : "OLD POOL · EXIT ONLY", (sx / deep.tiles.length + 0.5) * T, sy * T - 8, C.ice);
      }
    }
  });

  var mt = null;
  var MT_SIGN_LABEL = { who: "WHO IS HE?", how: "IN 3 → OUT 2", gate: "WHY SHUT?" };
  function mtCard(id) {
    if (id === "who") return { title: "THE MATCHER", lines: ["He writes your ZEC going in and coming out.", "Same number both times = LINKED. 3 links: you're out."] };
    if (id === "gate") return mt.broken ? { title: "OPEN", lines: ["Walk into the den."] }
      : { title: "SHUT", lines: ["3 × FOOLED opens it."] };
    return { title: "IN 3 → OUT 2 = FOOLED", lines: ["Blue box in the lake: drop 1.", "Coin in the lake: grab 1."] };
  }
  function drawCard(ctx, card) {
    var Wd = window.innerWidth, Hd = window.innerHeight, w = Math.min(640, Wd - 32), lh = 22, pad = 20;
    ctx.save(); ctx.font = "500 15px 'Plex Cond', sans-serif";
    var lines = []; card.lines.forEach(function (l) { lines = lines.concat(wrapPx(ctx, l, w - pad * 2)); });
    var h = pad * 2 + 30 + lines.length * lh + 22, x0 = Math.round((Wd - w) / 2), y0 = Math.round(Math.max(16, (Hd - h) / 2));
    ctx.fillStyle = "rgba(245,232,200,0.97)"; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = "#6b4a2e"; ctx.fillRect(x0, y0, w, 5); ctx.fillRect(x0, y0 + h - 5, w, 5); ctx.fillRect(x0, y0, 4, h); ctx.fillRect(x0 + w - 4, y0, 4, h);
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = "600 18px 'Plex Cond', sans-serif"; ctx.fillStyle = "#2b1d14"; ctx.fillText(card.title, x0 + pad, y0 + pad + 10);
    ctx.font = "500 15px 'Plex Cond', sans-serif";
    lines.forEach(function (l, i) { ctx.fillStyle = /← NOW/.test(l) ? "#8a2a1c" : "#2b1d14"; ctx.fillText(l, x0 + pad, y0 + pad + 40 + i * lh); });
    ctx.font = "500 12px 'Plex Mono', monospace"; ctx.fillStyle = "#6a5a4a"; ctx.fillText("walk away to close", x0 + pad, y0 + h - pad);
    ctx.restore();
  }
  function wrapPx(ctx, text, max) {
    var words = String(text).split(" "), out = [], cur = "";
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; });
    if (cur) out.push(cur); return out;
  }
  function mtLink(api, a, b) { api.link("matchTiming", a.x, a.y, b.x, b.y, { rush: false }); }
  function mtRow(text, col) { mt.rows.push({ text: text, col: col || C.ink, t: mt.t }); if (mt.rows.length > 6) mt.rows.shift(); }
  function mtFlash(text, col) { mt.flash = { text: text, col: col, t: mt.t }; }
  function mtBig(ctx, text, x, y, col, px) {
    ctx.font = "700 " + px + "px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = ctx.measureText(text).width + 14; ctx.fillStyle = "rgba(15,15,15,0.9)"; ctx.fillRect(Math.round(x - w / 2), Math.round(y - px * 0.75), Math.round(w), Math.round(px * 1.5));
    ctx.fillStyle = col; ctx.fillText(text, x, y + 1);
  }
  function mtShore(pd, text, col) { mt.shore = { x: pd.x, y: pd.y, text: text, col: col, t: mt.t }; mtFlash(text, col); }
  function mtVerdict(api) {
    var pd = mt.pending, d = pd.dive, why = null, secs = pd.exitT - d.t; mt.pending = null;
    if (links > d.links0 + d.mine) why = d.carry > 0 && pd.carry === d.carry ? "amount" : "alone";
    else if (mt.dwell && secs < mt.dwell) { mtLink(api, { x: d.x, y: d.y }, { x: pd.x, y: pd.y }); why = "time"; }
    mt.rows.pop();
    var nums = d.carry + " → " + pd.carry;
    if (why) {
      mt.by[why]++;
      mtRow("OUT · " + pd.carry + " ZEC · LINKED · " + (why === "amount" ? "same amount" : why === "alone" ? "left alone" : "only " + secs.toFixed(0) + "s inside"), C.string);
      mtShore(pd, nums + "  ✗ LINKED", "#e0634e");
    } else if (d.carry <= 0 && pd.carry <= 0) { mtRow("OUT · 0 ZEC · nothing to match", "rgba(255,250,240,0.6)"); mtShore(pd, "0 → 0  no coin, no fool", "#d8cdb4"); }
    else if (pd.carry <= 0) { mtRow("OUT · 0 ZEC · came out empty", "rgba(255,250,240,0.6)"); mtShore(pd, nums + "  empty: no fool", "#d8cdb4"); }
    else {
      mt.spills++; api.say("inkSpill"); api.shake(0.3);
      mt.snap = { ax: d.x, ay: d.y, bx: pd.x, by: pd.y, t: mt.t };
      mtRow("OUT · " + pd.carry + " ZEC · ??? · INK SPILT", C.gold); mtShore(pd, nums + "  ✓ FOOLED", "#8fe08a");
      if (mt.spills >= mt.needSpills) { mt.broken = true; mt.gates.forEach(function (g) { api.setTile(g[0], g[1], "."); }); api.say("matcherBroken"); api.shake(0.6); mtRow("HE CANNOT READ HIS OWN LEDGER", C.gold); }
    }
  }
  function mtHint(p, t) {
    if (mt.broken) return { k: "den", text: "Den open!" };
    var d = mt.dive;
    if (!p.inShield) {
      if (mt.pending) return { k: "judge", text: "He's checking…" };
      return p.carry > 0 ? { k: "lake", text: "Into the lake" } : { k: "coin", text: "Grab a coin" };
    }
    var carryIn = d ? d.carry : p.carry;
    if (!d || p.carry === carryIn) return { k: "box", text: carryIn > 0 ? "In with " + carryIn + ": blue box, drop 1" : "Grab a lake coin" };
    if (p.carry <= 0) return { k: "empty", text: "0 won't fool him: grab a coin" };
    if (mt.dwell) { var left = Math.ceil(mt.dwell - (t - d.t)); if (left > 0) return { k: "wait", text: "Wait " + left }; }
    return { k: "out", text: carryIn + " → " + p.carry + ": climb out!" };
  }

  var MT_DEMO_LEN = 8.8, mtDemoSeen = {}, mtDemoWired = false;
  function mtDemoWire() {
    if (mtDemoWired || typeof window === "undefined" || !window.addEventListener) return;
    mtDemoWired = true;
    var skip = function (e) {
      if (!mt || !mt.demo || mt.demo.done || (e.type === "keydown" && e.repeat)) return;
      mt.demo.done = true; mt.demo.skipped = true;
      e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault();
    };
    window.addEventListener("keydown", skip, true); window.addEventListener("pointerdown", skip, true);
  }
  var lerp = function (a, b, f) { return a + (b - a) * Math.max(0, Math.min(1, f)); };
  var seg = function (s, a, b) { return Math.max(0, Math.min(1, (s - a) / (b - a))); };
  function mtDrawDemo(ctx, s) {
    var Wd = window.innerWidth, Hd = window.innerHeight, w = Math.min(620, Wd - 24), h = Math.min(300, Math.round(w * 0.56));
    var x0 = Math.round((Wd - w) / 2), y0 = Math.round(Math.max(150, (Hd - h) / 2)), k = w / 620;
    var P = function (fx, fy) { return { x: x0 + fx * w, y: y0 + fy * h }; };
    ctx.save();
    ctx.fillStyle = "rgba(10,12,16,0.72)"; ctx.fillRect(0, 0, Wd, Hd);
    ctx.fillStyle = "#18241a"; ctx.fillRect(x0, y0, w, h);
    var lk = P(0.3, 0.42), lk2 = P(0.7, 0.92); ctx.fillStyle = "#1c2b4a"; ctx.fillRect(lk.x, lk.y, lk2.x - lk.x, lk2.y - lk.y);
    ctx.strokeStyle = "rgba(170,210,255,0.35)"; ctx.lineWidth = 2; ctx.strokeRect(lk.x, lk.y, lk2.x - lk.x, lk2.y - lk.y);
    ctx.strokeStyle = "#6b4a2e"; ctx.lineWidth = 4; ctx.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
    var box = P(0.5, 0.58); ctx.strokeStyle = "#9fd3ff"; ctx.lineWidth = 2; ctx.strokeRect(box.x - 9 * k - 4, box.y - 9 * k - 4, 18 * k + 8, 18 * k + 8);
    var ks = Math.max(0.8, k), mp = P(0.5, 0.2);
    drawHunterBody({ x: mp.x, y: mp.y, dir: Math.PI / 2, step: 0, state: "" }, { scale: 2 * ks, coat: "#2f2a3a", band: C.gold, markLift: 30 });
    ctx.fillStyle = "#f5e8c8"; ctx.fillRect(mp.x + 16 * ks, mp.y - 10 * ks, 20 * ks, 15 * ks); ctx.fillStyle = C.ink; ctx.fillRect(mp.x + 30 * ks + (Math.sin(s * 20) > 0 ? 1 : 0), mp.y - 26 * ks, 3, 16 * ks);
    var blots = s < 7.0 ? 0 : s < 7.7 ? 1 : s < 7.95 ? 2 : 3;
    var lp = P(0.82, 0.05); ctx.fillStyle = "rgba(245,232,200,0.95)"; ctx.fillRect(lp.x, lp.y, 0.15 * w, 26 * ks);
    for (var i = 0; i < 3; i++) { var bp = { x: lp.x + (0.03 + i * 0.045) * w, y: lp.y + 13 * ks }; ctx.beginPath(); ctx.arc(bp.x, bp.y, 7 * ks, 0, 6.283);
      if (i < blots) { ctx.fillStyle = "#1f1a2e"; ctx.fill(); ctx.beginPath(); ctx.arc(bp.x + 6 * ks, bp.y + 4 * ks, 2.4 * ks, 0, 6.283); ctx.fill(); } else { ctx.strokeStyle = "#6b4a2e"; ctx.lineWidth = 1.5; ctx.stroke(); } }
    var tag = function (p, n, col) {
      var fz = Math.round(15 * ks); ctx.font = "700 " + fz + "px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var tw = ctx.measureText(String(n)).width + 10; ctx.fillStyle = "rgba(20,20,20,0.92)"; ctx.fillRect(p.x - tw / 2, p.y - fz * 0.7, tw, fz * 1.4);
      ctx.fillStyle = col === "grey" ? "#8a8a8a" : col || C.gold; ctx.fillText(String(n), p.x, p.y + 1);
    };
    var foot = function (p, a, inW, look) { drawBitfoot(p.x, p.y, a, "walk", s, inW ? 0.85 : 1, look); };
    var line = function (a, b, f, col, dash) { ctx.strokeStyle = col; ctx.lineWidth = 3; if (dash) ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(lerp(a.x, b.x, f), lerp(a.y, b.y, f)); ctx.stroke(); ctx.setLineDash([]); };
    var word = null, wcol = C.ink, inA = P(0.3, 0.66), outA = P(0.7, 0.66);
    if (s < 3.4) {
      var f1 = seg(s, 0, 2.2), px = f1 < 0.2 ? lerp(0.1, 0.3, f1 / 0.2) : lerp(0.3, 0.78, (f1 - 0.2) / 0.8), pp = P(px, 0.66);
      var inW = px > 0.3 && px < 0.7, lost = s > 2.7;
      if (px >= 0.3) tag({ x: inA.x, y: inA.y + 18 }, 3, lost ? "#c8412f" : C.gold);
      if (px >= 0.7) tag({ x: outA.x, y: outA.y + 18 }, 3, lost ? "#c8412f" : C.gold);
      if (s > 2.2) line({ x: inA.x, y: inA.y + 18 }, { x: outA.x, y: outA.y + 18 }, seg(s, 2.2, 2.7), "#c8412f");
      foot(pp, "right", inW); tag({ x: pp.x, y: pp.y - 58 * Math.max(0.8, k) }, 3, lost ? "grey" : C.gold);
      if (lost) { ctx.fillStyle = "#c8412f"; ctx.font = "700 " + Math.round(22 * Math.max(0.8, k)) + "px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.fillText("✕", mp.x + 40 * k, mp.y); word = "3 → 3 = LINKED"; wcol = "#e0634e"; }
    } else if (s < 7.4) {
      var t2 = s - 3.4, n = t2 > 1.9 ? 2 : 3, q;
      if (t2 < 1.0) q = P(lerp(0.1, 0.3, t2 / 1.0), 0.66);
      else if (t2 < 1.6) q = { x: lerp(inA.x, box.x, (t2 - 1.0) / 0.6), y: lerp(inA.y, box.y + 22 * k, (t2 - 1.0) / 0.6) };
      else if (t2 < 2.3) q = { x: box.x, y: box.y + 22 * k };
      else q = { x: lerp(box.x, P(0.78, 0.66).x, (t2 - 2.3) / 0.8), y: lerp(box.y + 22 * k, outA.y, (t2 - 2.3) / 0.8) };
      var wet = q.x > lk.x && q.x < lk2.x;
      if (t2 >= 0.95) tag({ x: inA.x, y: inA.y + 18 }, 3);
      if (t2 > 1.6 && t2 < 2.0) { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(lerp(q.x, box.x, (t2 - 1.6) / 0.3), lerp(q.y - 40, box.y, (t2 - 1.6) / 0.3), 5, 0, 6.283); ctx.fill(); }
      foot(q, t2 < 1.6 ? "right" : t2 < 2.3 ? "down" : "right", wet);
      tag({ x: q.x, y: q.y - 58 * Math.max(0.8, k) }, n, n === 2 ? "#8fe08a" : C.gold);
      var t3 = t2 - 3.1 + 4.6;
      if (t2 >= 3.1) {
        tag({ x: outA.x, y: outA.y + 18 }, 2, "#8fe08a");
        var sf = seg(t3, 4.6, 5.1), snapF = seg(t3, 5.1, 6.0), a = { x: inA.x, y: inA.y + 18 }, b = { x: outA.x, y: outA.y + 18 };
        if (snapF <= 0) line(a, b, sf * 0.55, "#c8412f", true);
        else {
          var mid = { x: lerp(a.x, b.x, 0.55), y: lerp(a.y, b.y, 0.55) }; ctx.globalAlpha = 1 - snapF;
          line(a, { x: mid.x - 8, y: mid.y + snapF * 30 }, 1, "#c8412f", true); line({ x: mid.x + 8, y: mid.y + snapF * 40 }, { x: mid.x + 40, y: mid.y + snapF * 60 }, 1, "#c8412f", true);
          ctx.globalAlpha = 1;
        }
      }
      word = t2 < 1.4 ? null : t2 < 3.1 ? "DROP 1: 3 → 2" : "3 → 2 = FOOLED"; wcol = t2 >= 3.1 ? "#8fe08a" : "#bfe6ff";
    } else {
      var dn = P(0.9, 0.7); ctx.fillStyle = "#3a2a1e"; ctx.fillRect(dn.x - 16 * k, dn.y - 14 * k, 32 * k, 26 * k);
      ctx.fillStyle = s > 8.2 ? "#e9b949" : "#1b1b1b"; ctx.fillRect(dn.x - 8 * k, dn.y - 6 * k, 16 * k, 18 * k);
      word = s > 8.2 ? "DEN OPEN" : "FOOLED ×3"; wcol = C.gold;
    }
    if (word) {
      ctx.font = "700 " + Math.round(26 * Math.max(0.75, k)) + "px 'Plex Cond', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(10,10,10,0.7)"; var ww = ctx.measureText(word).width + 24; ctx.fillRect(x0 + w / 2 - ww / 2, y0 + h - 40 * Math.max(0.75, k) - 16, ww, 34);
      ctx.fillStyle = wcol; ctx.fillText(word, x0 + w / 2, y0 + h - 40 * Math.max(0.75, k) + 1);
    }
    ctx.font = "600 11px 'Plex Mono', monospace"; ctx.textAlign = "right"; ctx.fillStyle = "rgba(245,232,200,0.7)";
    ctx.fillText(TOUCH ? "TAP ▸ PLAY" : "ANY KEY ▸ PLAY", x0 + w - 12, y0 + h + 14);
    ctx.restore();
  }
  function mtBrushing(elapsed, carryIn, carryNow) { return elapsed < mt.minTrip && carryNow === carryIn; }
  function mtBrush(d, p, t) { return mtBrushing(t - d.t, d.carry, p.carry); }
  function mtGrace(p, inNow) {
    if (!inNow) { mt.parked = null; return; }
    var e = p.entry || mt.parked; if (!e) return;
    var b = mtBrushing(simTime - e.t, e.carry, p.carry);
    if (b && p.entry) { mt.parked = p.entry; p.entry = null; }
    else if (!b && mt.parked) { p.entry = mt.parked; mt.parked = null; }
  }
  BH.features.register("matcher", {
    onLevelStart: function (level, api) {
      var cfg = level.matcher || {};
      mt = { cfg: cfg, dwell: cfg.dwell || 0, wait: level.crowd ? CROWD_WINDOW + 0.15 : 0, needSpills: cfg.spills || 3, maxLinks: cfg.maxLinks || 3, minTrip: cfg.minTrip != null ? cfg.minTrip : 1, parked: null,
             by: { amount: 0, alone: 0, time: 0 }, gates: tilesOf(level, "X"), spills: 0, broken: false, flash: null,
             rows: [], wasIn: !!api.player.inShield, dive: null, pending: null, t: now(api), start: now(api), flashUntil: 0, lost: false, level: level };
      mtRow("THE LEDGER IS OPEN", "rgba(255,250,240,0.6)");
      mt.boards = (cfg.signs || []).map(function (b) { return { x: b[0], y: b[1], id: b[2] }; });
      mt.reading = null;
      var key = level.title || "matcher";
      if (cfg.demo !== false && !mtDemoSeen[key]) { mtDemoSeen[key] = true; mt.demo = { t0: null, done: false, skipped: false }; mtDemoWire(); }
    },
    onStep: function (dt, api) {
      if (!live(mt) || mt.lost) return;
      var p = api.player, t = now(api); mt.t = t;
      var inNow = !!p.inShield;
      mtGrace(p, inNow);
      if (inNow && !mt.wasIn) {
        if (mt.pending && t - mt.pending.exitT < CROWD_WINDOW) { mt.dive = mt.pending.dive; mt.pending = null; mt.rows.pop(); }
        else mt.dive = { t: t, carry: p.carry, x: p.x, y: p.y, links0: links, mine: 0, linked: null, real: false };
      }
      if (inNow && mt.dive && !mt.dive.real && !mtBrush(mt.dive, p, t)) {
        mt.dive.real = true;
        mtRow("IN  · " + mt.dive.carry + " ZEC · " + fmtT(mt.dive.t - mt.start), C.ice);
      }
      if (!inNow && mt.wasIn && mt.dive && !mt.dive.real) mt.dive = null;
      else if (!inNow && mt.wasIn && mt.dive) {
        var dv = mt.dive; mt.dive = null;
        mt.pending = { dive: dv, exitT: t, carry: p.carry, x: p.x, y: p.y };
        if (p.carry <= 0 && dv.carry > 0 && typeof game !== "undefined") game.unmatchedPending = null;
        mtRow("OUT · " + p.carry + " ZEC · " + fmtT(t - mt.start) + " · ?", C.gold);
        mt.flashUntil = t + CROWD_WINDOW + 0.2;
      }
      mt.wasIn = inNow;
      if (mt.pending && t - mt.pending.exitT >= mt.wait) mtVerdict(api);
      if (!mt.broken && links >= mt.maxLinks) {
        if (mt.pending) mtVerdict(api);
        mt.lost = true; api.lose("matcher");
      }
      mt.reading = null;
      (mt.boards || []).forEach(function (b) { if (!mt.reading && near(p, center([b.x, b.y]), 1.9 * T)) mt.reading = b.id; });
      if (!mt.nearSaid) {
        var clerk = api.hunters.filter(function (h) { return h.type === "matcher"; })[0];
        if (clerk && near(p, clerk, 4 * T) && cool(mt, "nearT", api, 0.4)) {
          api.say("matcherNear"); var w = F.words.matcherNear;
          if (!w || (typeof pops !== "undefined" && pops[0] && pops[0].text === w.word)) mt.nearSaid = true;
        }
      }
    },
    onDrawWorld: function (ctx, api) {
      if (!live(mt)) return;
      var t = now(api);
      mt.gates.forEach(function (g) {
        var x = g[0] * T, y = g[1] * T;
        if (mt.broken) { ctx.fillStyle = "#3a3a36"; ctx.fillRect(x + 1, y + 2, 4, T - 4); ctx.fillRect(x + T - 5, y + 2, 4, T - 4); }
      });
      if (!mt.broken && mt.gates.length) { var c = center(mt.gates[0]); label(ctx, "SHUT TILL HE'S FOOLED 3×", c.x, c.y - T * 0.8, C.red); }
      var dv = mt.dive && mt.dive.real ? mt.dive : mt.pending ? mt.pending.dive : null;
      if (dv && !mt.lost) label(ctx, dv.carry + " IN", dv.x, dv.y - 20, C.gold);
      if (mt.pending && !mt.lost) {
        var pd = mt.pending, grow = Math.min(1, (t - pd.exitT) / CROWD_WINDOW), ex = pd.dive.x + (pd.x - pd.dive.x) * grow, ey = pd.dive.y + (pd.y - pd.dive.y) * grow;
        ctx.strokeStyle = "rgba(200,65,47,0.9)"; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 30;
        ctx.beginPath(); ctx.moveTo(pd.dive.x, pd.dive.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        label(ctx, pd.carry + " OUT", pd.x, pd.y - 20, pd.carry === pd.dive.carry && pd.carry > 0 ? "#e0634e" : pd.carry <= 0 ? "#d8cdb4" : C.gold);
      }
      if (mt.snap && t - mt.snap.t < 1.1) {
        var sn = mt.snap, f = (t - sn.t) / 1.1, mx = (sn.ax + sn.bx) / 2, my = (sn.ay + sn.by) / 2;
        ctx.globalAlpha = 1 - f; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(sn.ax, sn.ay); ctx.lineTo(mx - 10, my + f * 40); ctx.moveTo(mx + 10, my + f * 55); ctx.lineTo(sn.bx, sn.by + f * 20); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      var pl = api.player;
      if (pl.inShield && mt.dive && !mt.lost) mtBig(ctx, mt.dive.carry + " → " + pl.carry, pl.x, pl.y - 44, pl.carry !== mt.dive.carry && pl.carry > 0 ? "#8fe08a" : pl.carry <= 0 && mt.dive.carry > 0 ? "#d8cdb4" : C.gold, 16);
      if (mt.shore && t - mt.shore.t < 2.4) mtBig(ctx, mt.shore.text, mt.shore.x, mt.shore.y - 50 - (t - mt.shore.t) * 8, mt.shore.col, 20);
      (mt.boards || []).forEach(function (b) {
        var x = b.x * T, y = b.y * T, on = mt.reading === b.id;
        ctx.fillStyle = "#3f2815"; ctx.fillRect(x + T / 2 - 2, y + T * 0.35, 4, T * 0.65);
        ctx.fillStyle = on ? "#a8763f" : "#86592f"; ctx.fillRect(x + 2, y + 2, T - 4, T * 0.45);
        ctx.fillStyle = "#1f130a"; ctx.fillRect(x + 2, y + 2 + T * 0.45 - 2, T - 4, 2);
        ctx.fillStyle = "#f5e8c8"; ctx.font = "600 " + Math.round(T * 0.34) + "px 'Plex Cond', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", x + T / 2, y + 2 + T * 0.23);
        label(ctx, MT_SIGN_LABEL[b.id] || "?", x + T / 2, y - 6, C.gold);
      });
    },
    onDrawOver: function (ctx, api) {
      if (!live(mt)) return;
      if (typeof game !== "undefined" && game.screen === "caught") return;
      if (mt.demo && !mt.demo.done) {
        var ms = performance.now(); if (mt.demo.t0 == null) mt.demo.t0 = ms;
        var ds = (ms - mt.demo.t0) / 1000; mt.demo.s = ds;
        if (ds >= MT_DEMO_LEN) mt.demo.done = true;
        else { if (typeof hitstopUntil !== "undefined") hitstopUntil = ms + 250; mtDrawDemo(ctx, ds); return; }
      }
      var t = now(api), Wd = window.innerWidth, w = Math.min(300, Wd - 36), x0 = Wd - w - 18, y0 = 62;
      w = Math.min(260, Wd - 36); x0 = Wd - w - 18;
      var hint = mtHint(api.player, t), h = 60;
      var ps = worldToScreen(api.player.x, api.player.y);
      ctx.save(); ctx.globalAlpha = ps && ps.x > x0 - 30 && ps.x < x0 + w + 30 && ps.y > y0 - 10 && ps.y < y0 + h + 70 ? 0.3 : 1;
      ctx.fillStyle = "rgba(245,232,200,0.95)"; ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = "rgba(107,74,46,0.9)"; ctx.fillRect(x0, y0, w, 3); ctx.fillRect(x0, y0 + h - 3, w, 3);
      ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.font = "600 11px 'Plex Cond', sans-serif";
      var ry = y0 + 17, i;
      ctx.fillStyle = "#2b1d14"; ctx.fillText("FOOLED", x0 + 10, ry);
      for (i = 0; i < mt.needSpills; i++) {
        var bx = x0 + 64 + i * 20;
        ctx.beginPath(); ctx.arc(bx, ry, 6, 0, 6.283);
        if (i < mt.spills) { ctx.fillStyle = "#1f1a2e"; ctx.fill(); ctx.beginPath(); ctx.arc(bx + 5, ry + 4, 2.2, 0, 6.283); ctx.arc(bx - 5, ry - 4, 1.6, 0, 6.283); ctx.fill(); }
        else { ctx.strokeStyle = "#6b4a2e"; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      ctx.textAlign = "left"; ctx.font = "600 15px 'Plex Cond', sans-serif"; ctx.fillStyle = mt.broken ? "#2f6b3a" : "#2b1d14";
      ctx.fillText("▸ " + hint.text, x0 + 10, y0 + 41);
      ctx.restore();
      if (mt.reading) drawCard(ctx, mtCard(mt.reading));
    }
  });
  function fmtT(s) { s = Math.max(0, s); return Math.floor(s / 60) + ":" + ("0" + Math.floor(s % 60)).slice(-2); }

  BH.featureState = function (id) {
    var s = { memo: memo, escort: esc, dawn: dawn, ranger: rg, deep: deep, matcher: mt }[id];
    if (!live(s)) return null;
    if (id === "matcher") { var hn = mtHint(player, s.t); return { demo: !!(s.demo && !s.demo.done), demoSkipped: !!(s.demo && s.demo.skipped), demoS: s.demo && s.demo.s != null ? +s.demo.s.toFixed(2) : null, spills: s.spills, broken: s.broken, lost: s.lost, rows: s.rows.map(function (r) { return r.text; }), pending: !!s.pending, inDive: !!s.dive, reading: s.reading,
      by: { amount: s.by.amount, alone: s.by.alone, time: s.by.time }, dwell: s.dwell, maxLinks: s.maxLinks, hint: hn.k, hintText: hn.text, flash: s.flash ? s.flash.text : null }; }
    if (id === "escort") return { x: s.x / T, y: s.y / T, inWater: s.inWater, closed: s.closed, crumbs: s.crumbs.length, prints: s.prints.length };
    if (id === "memo") return { read: s.stones.map(function (q) { return q.read; }), reads: s.stones.map(function (q) { return q.reads; }), on: s.stones.map(function (q) { return q.on; }), revealed: s.revealed, caveSaid: s.caveSaid };
    if (id === "dawn") return { at: s.at, up: s.up };
    if (id === "ranger") return { hasKey: s.hasKey, open: s.open, told: s.told, path: s.path.length, lastWater: s.lastWater ? [s.lastWater.x / T, s.lastWater.y / T] : null, x: s.x / T, y: s.y / T };
    if (id === "deep") return { sealed: s.sealed, tiles: s.tiles.length };
    return null;
  };
})();
