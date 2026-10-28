"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.features.register || !BH.tiles) return;

  var RAPIDS = "≋";
  var WORDS = {
    fdBlockWait: { word: "NEXT BLOCK", zcash: "Blocks come on a steady beat. Wait for the next one." },
    fdBlockGo: { word: "CONFIRMED", zcash: "In a block = confirmed. Zcash makes one about every 75 s." },
    fdTooLate: { word: "TOO LATE" },
    fdBridgeOn: { word: "ONE USE" },
    fdSpent: { word: "SPENT", zcash: "A note spends once. Its nullifier stops a second spend." }
  };
  var F0 = window.FACTS;
  if (F0 && F0.words) Object.keys(WORDS).forEach(function (k) { if (!F0.words[k]) F0.words[k] = WORDS[k]; });

  function tilesOf(level, ch) {
    var out = [];
    (level.map || []).forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === ch) out.push([x, y]); });
    return out;
  }
  function now(api) { return api.time; }
  function live(st) { return !!st && typeof L !== "undefined" && L === st.level; }
  function tOf(px) { return Math.floor(px / T); }
  var R = 0.3;
  function hitboxTiles(p) {
    var r = R * T, out = [];
    [[0, 0], [-r, -r], [r, -r], [-r, r], [r, r]].forEach(function (o) { out.push([tOf(p.x + o[0]), tOf(p.y + o[1])]); });
    return out;
  }
  function near(p, t, rTiles) { return Math.hypot(p.x - (t[0] + 0.5) * T, p.y - (t[1] + 0.5) * T) < rTiles * T; }
  function wordOf(k) { var w = window.FACTS && FACTS.words[k]; return w ? w.word : k; }
  function queueWord(st, k, color, api, rank) { var q = st.words[k]; if (q && !q.done) return; st.words[k] = { t0: now(api), last: -9, done: false, color: color, rank: rank || 0 }; }
  function flushWords(st, api) {
    var t = now(api);
    Object.keys(st.words).forEach(function (k) {
      var q = st.words[k]; if (q.done) return;
      if (typeof pops !== "undefined" && pops.some(function (p) { return p.text === wordOf(k); })) { q.done = true; if (st.shown.indexOf(k) < 0) st.shown.push(k); return; }
      if (t - q.t0 > 6) { q.done = true; return; }
      if (t - q.last >= 0.4) {
        q.last = t;
        if (q.rank && typeof showPop === "function") showPop({ text: wordOf(k), sub: "", color: q.color, t0: simTime, rank: q.rank });
        else api.say(k, q.color);
      }
    });
  }
  function sound(name, o) { try { if (typeof sfx === "function") sfx(name, o); } catch (e) {} }
  function freeTileNear(tx0, ty0) {
    for (var d = 1; d <= 4; d++) for (var dy = -d; dy <= d; dy++) for (var dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      if (!solidH(tile(tx0 + dx, ty0 + dy))) return [tx0 + dx, ty0 + dy];
    }
    return null;
  }
  function passage(x, y, isBank) {
    var l = tile(x - 1, y), r = tile(x + 1, y), u = tile(x, y - 1), d = tile(x, y + 1);
    var open = function (c) { return !isBank(c); };
    var hScore = (open(l) ? 1 : 0) + (open(r) ? 1 : 0), vScore = (open(u) ? 1 : 0) + (open(d) ? 1 : 0);
    return hScore >= vScore ? "h" : "v";
  }

  var guardAt = -1;
  function badForHunter(c) { return (c === "g" && !gateOpenNow()) || c === RAPIDS; }
  function guardHunters(api) {
    if (guardAt === simTime) return; guardAt = simTime;
    api.hunters.forEach(function (h) {
      var c = tile(tOf(h.x), tOf(h.y));
      if (badForHunter(c)) {
        var back = h.fdSafe && !badForHunter(tile(tOf(h.fdSafe.x), tOf(h.fdSafe.y))) ? h.fdSafe : null;
        if (!back) { var f = freeTileNear(tOf(h.x), tOf(h.y)); if (f) back = { x: (f[0] + 0.5) * T, y: (f[1] + 0.5) * T }; }
        if (back) { h.x = back.x; h.y = back.y; }
        h.path = []; h.pathKey = ""; h.pathT = 0;
        if (c === RAPIDS && h.state === "follow" && typeof loseTrail === "function") { loseTrail(h); if (brg && live(brg)) brg.trailsLost++; }
        if (blk && live(blk) && c === "g") blk.huntersHeld++;
      } else if (c !== "g" && c !== RAPIDS && c !== "n") h.fdSafe = { x: h.x, y: h.y };
    });
  }

  var blk = null;
  function blockCfg(level) {
    var b = level.blocks || {}, every = +b.every > 0 ? +b.every : 12, open = +b.open > 0 ? Math.min(+b.open, every - 0.5) : 4;
    return { every: every, open: open, offset: +b.offset || 0 };
  }
  function beat(cfg, t) {
    var ph = ((t + cfg.offset) % cfg.every + cfg.every) % cfg.every, shutLen = cfg.every - cfg.open, open = ph >= shutLen;
    return { open: open, left: open ? cfg.every - ph : shutLen - ph, frac: open ? (cfg.every - ph) / cfg.open : ph / shutLen };
  }
  function gateOpenNow() { return !!(blk && live(blk) && blk.open); }
  BH.tiles.register("g", {
    claim: "blocks",
    get solid() { return !gateOpenNow(); },
    draw: function (b, px, py, x, y) {
      var dir = passage(x, y, function (c) { return c === "#" || c === "T" || c === RAPIDS; });
      b.fillStyle = "#3f2815";
      if (dir === "h") { b.fillRect(px + 11, py - 1, 10, 6); b.fillRect(px + 11, py + T - 5, 10, 6); b.fillStyle = "#5a3a1f"; b.fillRect(px + 12, py, 8, 2); b.fillRect(px + 12, py + T - 4, 8, 2); }
      else { b.fillRect(px - 1, py + 11, 6, 10); b.fillRect(px + T - 5, py + 11, 6, 10); b.fillStyle = "#5a3a1f"; b.fillRect(px, py + 12, 2, 8); b.fillRect(px + T - 4, py + 12, 2, 8); }
    }
  });
  BH.features.register("blocks", {
    onLevelStart: function (level, api) {
      var cfg = blockCfg(level), b = beat(cfg, now(api));
      blk = { level: level, cfg: cfg, gates: tilesOf(level, "g").map(function (g) {
                return { t: g, dir: passage(g[0], g[1], function (c) { return c === "#" || c === "T" || c === RAPIDS; }) }; }),
              open: b.open, flipT: -9, opens: 0, pushes: 0, huntersHeld: 0, safe: { x: api.player.x, y: api.player.y },
              waitSaid: false, goSaid: false, lastTick: -1, words: {}, shown: [] };
    },
    onStep: function (dt, api) {
      if (!live(blk)) return;
      var p = api.player, t = now(api), b = beat(blk.cfg, t);
      if (b.open !== blk.open) {
        blk.open = b.open; blk.flipT = t;
        var heard = blk.gates.some(function (g) { return near(p, g.t, 9); });
        if (b.open) { blk.opens++; if (heard) sound("stash"); }
        else {
          if (heard) sound("step", { vol: 1.6 });
          var onGate = hitboxTiles(p).some(function (q) { return tile(q[0], q[1]) === "g"; });
          if (onGate) { p.x = blk.safe.x; p.y = blk.safe.y; p.vx = 0; p.vy = 0; blk.pushes++; queueWord(blk, "fdTooLate", C.red, api, 4); api.shake(0.2); }
        }
        api.hunters.forEach(function (h) { h.path = []; h.pathKey = ""; h.pathT = 0; });
      }
      if (!hitboxTiles(p).some(function (q) { return tile(q[0], q[1]) === "g"; })) blk.safe = { x: p.x, y: p.y };
      if (!b.open && b.left <= 3 && blk.gates.some(function (g) { return near(p, g.t, 7); })) {
        var s = Math.ceil(b.left); if (s !== blk.lastTick) { blk.lastTick = s; sound("suspicion", { level: 0.15 }); }
      }
      if (!blk.waitSaid && !b.open && blk.gates.some(function (g) { return near(p, g.t, 2.2); })) { blk.waitSaid = true; queueWord(blk, "fdBlockWait", C.gold, api); }
      if (!blk.goSaid && b.open && tile(tOf(p.x), tOf(p.y)) === "g") { blk.goSaid = true; queueWord(blk, "fdBlockGo", C.gold, api); }
      flushWords(blk, api);
      guardHunters(api);
    },
    onDrawWorld: function (ctx, api) {
      if (!live(blk)) return;
      var t = now(api), b = beat(blk.cfg, t), anim = Math.min(1, (t - blk.flipT) / 0.3);
      var o = b.open ? anim : 1 - anim;
      blk.gates.forEach(function (g) {
        var x = g.t[0] * T, y = g.t[1] * T, cx = x + T / 2;
        ctx.save(); ctx.translate(x + T / 2, y + T / 2); if (g.dir === "v") ctx.rotate(Math.PI / 2); ctx.translate(-T / 2, -T / 2);
        if (o > 0.02) {
          ctx.fillStyle = "rgba(143,224,138," + (0.12 * o).toFixed(3) + ")"; ctx.fillRect(2, 10, T - 4, T - 14);
          ctx.fillStyle = "rgba(143,224,138," + (0.7 * o).toFixed(3) + ")";
          for (var dx = 3; dx < T - 2; dx += 6) ctx.fillRect(dx, 19, 3, 2);
        }
        var len = Math.max(6, Math.round((T - 6) * (1 - o)));
        for (var i = 0; i < 3; i++) {
          var lx = 7 + i * 7;
          ctx.fillStyle = "#6b4a2e"; ctx.fillRect(lx, 3, 6, len);
          ctx.fillStyle = "#95683f"; ctx.fillRect(lx + 1, 3, 2, len);
          ctx.fillStyle = "#2b1d14"; ctx.fillRect(lx + 5, 3, 1, len);
          { ctx.fillStyle = "#c89a60"; ctx.fillRect(lx + 1, 3 + len - 3, 4, 3); ctx.fillStyle = "#6b4a2e"; ctx.fillRect(lx + 2, 3 + len - 2, 2, 1); }
        }
        if (len > 14) { ctx.fillStyle = "#d9c27a"; ctx.fillRect(6, 9, 21, 2); if (len > 20) ctx.fillRect(6, 21, 21, 2); }
        ctx.restore();
        var py = y - 7, rr = 7, a0 = -Math.PI / 2;
        ctx.fillStyle = "rgba(20,20,20,0.9)"; ctx.beginPath(); ctx.arc(cx, py, rr + 2, 0, 6.283); ctx.fill();
        ctx.fillStyle = b.open ? "#8fe08a" : C.gold; ctx.beginPath(); ctx.moveTo(cx, py);
        ctx.arc(cx, py, rr, a0, a0 + 6.283 * b.frac); ctx.closePath(); ctx.fill();
        ctx.font = "700 9px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#101010"; ctx.fillText(String(Math.ceil(b.left)), cx + 0.5, py + 1.5);
        ctx.fillStyle = C.ink; ctx.fillText(String(Math.ceil(b.left)), cx, py + 1);
      });
    }
  });

  var brg = null;
  function isRiver(c) { return c === RAPIDS || c === "~" || c === "#"; }
  BH.tiles.register(RAPIDS, {
    solid: true, claim: "bridge",
    draw: function (b, px, py, x, y) {
      b.fillStyle = "#0a1224"; b.fillRect(px, py, T, T);
      b.fillStyle = "#101c38"; b.fillRect(px, py + 10, T, 4); b.fillRect(px, py + 24, T, 3);
      b.fillStyle = "rgba(200,225,255,0.42)";
      for (var k = 0; k < 4; k++) {
        var u = Math.floor(hash(x * 3 + k, y * 5 - k) * 22), v = 3 + k * 7 + Math.floor(hash(y + k, x) * 3);
        b.fillRect(px + u, py + v, 7, 1); b.fillRect(px + u + 2, py + v + 1, 3, 1);
      }
    }
  });
  BH.tiles.register("n", {
    claim: "bridge",
    draw: function (b, px, py, x, y) {
      b.fillStyle = "#0a1224"; b.fillRect(px, py, T, T);
      var dir = passage(x, y, isRiver);
      b.save(); b.translate(px + T / 2, py + T / 2); if (dir === "v") b.rotate(Math.PI / 2); b.translate(-T / 2, -T / 2);
      for (var i = 0; i < 5; i++) {
        var lx = 1 + i * 6 + (hash(x + i, y) > 0.7 ? 1 : 0);
        b.fillStyle = i % 2 ? "#8a6440" : "#7a5634"; b.fillRect(lx, 4, 5, T - 8);
        b.fillStyle = "#a57a4c"; b.fillRect(lx, 4, 5, 1);
        b.fillStyle = C.gold; b.fillRect(lx + 2, 6, 1, 1); b.fillRect(lx + 2, T - 7, 1, 1);
      }
      b.fillStyle = "#3f2815"; b.fillRect(0, 2, T, 2); b.fillRect(0, T - 4, T, 2);
      b.fillStyle = "#d9c27a"; b.fillRect(0, 2, T, 1); b.fillRect(0, T - 4, T, 1);
      b.restore();
    }
  });
  function spans(level) {
    var list = tilesOf(level, "n"), seen = {}, out = [];
    list.forEach(function (s) {
      var k = s + ""; if (seen[k]) return;
      var span = [], q = [s]; seen[k] = true;
      while (q.length) {
        var c = q.shift(); span.push(c);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var n = [c[0] + d[0], c[1] + d[1]], nk = n + "";
          if (!seen[nk] && (level.map[n[1]] || "")[n[0]] === "n") { seen[nk] = true; q.push(n); }
        });
      }
      out.push({ tiles: span, key: span.map(function (q2) { return q2 + ""; }), spent: false, used: false, spentT: 0, seal: span[Math.floor(span.length / 2)] });
    });
    return out;
  }
  function onSpan(s, x, y) { return s.key.indexOf(x + "," + y) >= 0; }
  function spend(s, api) {
    s.spent = true; s.spentT = now(api); brg.spentCount++;
    s.tiles.forEach(function (q) {
      api.setTile(q[0], q[1], RAPIDS);
      var cx = (q[0] + 0.5) * T, cy = (q[1] + 0.5) * T;
      if (typeof puff === "function") puff(cx, cy, 8, "rgba(138,100,64,0.9)", 30);
      if (typeof ring === "function") ring(cx, cy, "rgba(190,235,255,0.7)", T, 0.5);
      api.hunters.forEach(function (h) {
        if (tOf(h.x) === q[0] && tOf(h.y) === q[1]) { var f = freeTileNear(q[0], q[1]); if (f) { h.x = (f[0] + 0.5) * T; h.y = (f[1] + 0.5) * T; } h.path = []; h.pathKey = ""; h.pathT = 0; }
      });
    });
    api.hunters.forEach(function (h) { h.path = []; h.pathKey = ""; h.pathT = 0; });
    sound("splash"); api.shake(0.2); queueWord(brg, "fdSpent", C.red, api);
  }
  BH.features.register("bridge", {
    onLevelStart: function (level, api) {
      brg = { level: level, spans: spans(level), spentCount: 0, trailsLost: 0, onSaid: false, words: {}, shown: [] };
      (level.fdSpentAtStart || []).forEach(function (i) { var s = brg.spans[i]; if (s) { s.spent = true; s.used = true; s.tiles.forEach(function (q) { api.setTile(q[0], q[1], RAPIDS); }); } });
    },
    onStep: function (dt, api) {
      if (!live(brg)) return;
      var p = api.player, cx = tOf(p.x), cy = tOf(p.y), box = hitboxTiles(p);
      brg.spans.forEach(function (s) {
        if (s.spent) return;
        if (onSpan(s, cx, cy)) { if (!s.used) { s.used = true; if (!brg.onSaid) { brg.onSaid = true; queueWord(brg, "fdBridgeOn", C.gold, api); } } return; }
        if (s.used && !box.some(function (q) { return onSpan(s, q[0], q[1]); })) spend(s, api);
      });
      flushWords(brg, api);
      guardHunters(api);
    },
    onDrawWorld: function (ctx, api) {
      if (!live(brg)) return;
      var t = now(api);
      brg.spans.forEach(function (s) {
        if (!s.spent) return;
        var since = t - s.spentT;
        s.tiles.forEach(function (q, i) {
          if (i !== 0 && i !== s.tiles.length - 1) return;
          var x = q[0] * T, y = q[1] * T;
          ctx.fillStyle = "#5a3f26"; ctx.fillRect(x + 6 + (i ? 10 : 0), y + 12 + Math.sin(t * 2 + i) * 1.5, 9, 3);
          ctx.fillStyle = "#7a5634"; ctx.fillRect(x + 8 + (i ? 12 : 0), y + 19 + Math.cos(t * 2 + i) * 1.5, 6, 2);
        });
        var sx = (s.seal[0] + 0.5) * T, sy = (s.seal[1] + 0.5) * T, pop = since < 0.5 ? 1 + (0.5 - since) * 1.2 : 1, r = 6 * pop;
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.arc(sx + 1, sy + 2, r + 1, 0, 6.283); ctx.fill();
        ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(sx, sy, r + 1, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#8a2a1c"; ctx.beginPath(); ctx.arc(sx, sy, r - 1.5, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#e0634e"; ctx.fillRect(sx - 3, sy - 1, 6, 2); ctx.fillRect(sx - 1, sy - 3, 2, 6);
        ctx.fillStyle = "rgba(255,210,190,0.7)"; ctx.fillRect(sx - r + 1, sy - r + 2, 2, 2);
      });
    }
  });

  var prevState = BH.featureState;
  BH.featureState = function (id) {
    if (id === "blocks") {
      if (!live(blk)) return null;
      var b = beat(blk.cfg, featureApi.time);
      return { open: blk.open, left: +b.left.toFixed(2), every: blk.cfg.every, openFor: blk.cfg.open, gates: blk.gates.length, opens: blk.opens, pushes: blk.pushes, huntersHeld: blk.huntersHeld, shown: blk.shown.slice() };
    }
    if (id === "bridge") {
      if (!live(brg)) return null;
      return { spans: brg.spans.map(function (s) { return { tiles: s.tiles.length, used: s.used, spent: s.spent }; }), spent: brg.spentCount, trailsLost: brg.trailsLost, shown: brg.shown.slice() };
    }
    return typeof prevState === "function" ? prevState(id) : null;
  };
})();
