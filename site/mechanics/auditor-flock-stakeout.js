"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.features.register) return;

  var FLOCK_R = 2.4, CROW_SEE = 2.2, CROW_REST = 2.5, FLOCK_SPIN = 0.8;
  var STAKE = { small: 16, range: 10, watchers: 3, max: 12 };
  var CALM = { patrol: 1, "return": 1, search: 1, check: 1 };

  var COPY = {
    auditor: { sign: "HE SEES INTO WATER",
      lesson: "Hand someone your viewing key and the water no longer hides you from them.",
      dev: "A Zcash viewing key lets whoever holds it see that wallet's shielded transactions, but not spend them." },
    flock: { sign: "HIS CROWS SEE BEHIND",
      lesson: "Anyone can watch the network, and some watchers work for the hunters. Out in the open they see you; shielded, they can't see who or how much.",
      dev: "Anyone can run a Zcash node and see transparent transactions as they are broadcast; fully shielded ones reveal no addresses or amounts." },
    stakeout: { sign: "SMALL POOL, SMALL CROWD",
      lesson: "A small pool hides you among few. The more people share the pool, the more it hides each one.",
      dev: "A shielded Zcash spend proves its note is in the pool's note commitment tree without revealing which one, so it hides among every note in that pool." }
  };
  var WORDS = {
    a8Key:   { word: "VIEWING KEY", main: "He can see you in the water.", zcash: "A viewing key shows your shielded payments. It can't spend them." },
    a8Crows: { word: "CAW!", main: "His crows saw you. He is turning.", zcash: "Anyone can watch the network. Fully shielded payments show no addresses or amounts." },
    a8Stake: { word: "STAKED OUT", main: "A small pool: they can watch every edge.", zcash: "A shielded spend hides among every note in its pool: bigger pool, better cover." }
  };
  var F0 = window.FACTS && FACTS.words;
  if (F0) Object.keys(WORDS).forEach(function (k) { if (!F0[k]) F0[k] = WORDS[k]; });

  function live(st) { return !!st && typeof L !== "undefined" && L === st.level; }
  function now(api) { return typeof api.time === "function" ? api.time() : api.time; }
  function ghosted() { return typeof ghost !== "undefined" && !!ghost; }
  function fx(name, o) { try { if (typeof sfx === "function") sfx(name, o); } catch (e) {} }
  function tOf(px) { return Math.floor(px / T); }
  function marked(level, key) {
    var out = [];
    (level.hunters || []).forEach(function (d, i) { if (d && d[key] && hunters[i] && hunters[i].type !== "dog") out.push({ h: hunters[i], i: i, def: d }); });
    return out;
  }
  function label(ctx, text, x, y, col) {
    ctx.font = "600 9px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = ctx.measureText(text).width + 8;
    ctx.fillStyle = "rgba(27,27,27,0.85)"; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 6), Math.round(w), 12);
    ctx.fillStyle = col || C.ink; ctx.fillText(text, x, y);
  }

  var guard = { at: -1, held: 0, level: null };
  function shoreGuard() {
    if (guard.at === simTime) return; guard.at = simTime;
    if (guard.level !== L) { guard.level = L; guard.held = 0; }
    hunters.forEach(function (h) {
      var c = tile(tOf(h.x), tOf(h.y));
      if (!solidH(c) || c === "g") { h.a8Safe = { x: h.x, y: h.y }; return; }
      if (h.a8Safe) { h.x = h.a8Safe.x; h.y = h.a8Safe.y; }
      h.path = []; h.pathKey = ""; h.pathT = 0; guard.held++;
      if (h.state === "check") { h.state = "search"; h.searchT = 2.0; }
      else if (h.state === "chase" && !canSee(h) && typeof loseTrail === "function") loseTrail(h);
    });
  }

  var au = null;
  function isAuditor(h) { return live(au) && au.hs.indexOf(h) >= 0; }
  function looksAt(h) {
    if (player.inBush) return false;
    var d = Math.hypot(player.x - h.x, player.y - h.y);
    if (d < SENSE * T) return true;
    if (d > visionOf(h) * T) return false;
    if (Math.abs(angDiff(Math.atan2(player.y - h.y, player.x - h.x), h.dir)) > CONE) return false;
    return losClear(h.x, h.y, player.x, player.y);
  }
  if (typeof canSee === "function") {
    var coreCanSee = canSee;
    canSee = function (h) {
      if (h && typeof player !== "undefined" && player && player.inShield && !ghosted() && isAuditor(h)) {
        player.inShield = false;
        try { return coreCanSee(h); } finally { player.inShield = true; }
      }
      return coreCanSee.apply(this, arguments);
    };
  }
  BH.features.register("auditor", {
    copy: COPY.auditor,
    onLevelStart: function (level) {
      au = { level: level, hs: [], idx: [], sightings: 0, waterSteps: 0, seeing: false, said: false, lastSeenBy: -1 };
      marked(level, "key").forEach(function (m) { au.hs.push(m.h); au.idx.push(m.i); });
    },
    onStep: function (dt, api) {
      if (!live(au) || game.phase !== "play") return;
      shoreGuard();
      var seeing = false;
      if (player.inShield) au.hs.forEach(function (h) { if (looksAt(h)) { seeing = true; au.lastSeenBy = hunters.indexOf(h); } });
      if (seeing) { au.waterSteps++; if (!au.seeing) au.sightings++; }
      if (seeing && !au.said) { au.said = true; api.say("a8Key", C.gold); }
      au.seeing = seeing;
    },
    onDrawWorld: function (ctx) {
      if (!live(au)) return;
      var tm = typeof simTime === "number" ? simTime : 0;
      au.hs.forEach(function (h) {
        if (typeof conePoly === "function") {
          ctx.strokeStyle = "rgba(234,186,73,0.55)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -tm * 12;
          conePoly(h.x, h.y, h.dir, CONE, visionOf(h) * T, 18); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        }
        drawKey(ctx, h.x, h.y - 38, tm);
      });
      if (au.seeing) {
        var f = 0.5 + 0.5 * Math.sin(tm * 8);
        ctx.strokeStyle = "rgba(234,186,73," + (0.5 + 0.4 * f).toFixed(3) + ")"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(player.x, player.y, T * (0.7 + 0.1 * f), 0, 6.283); ctx.stroke();
      }
    }
  });
  function drawKey(ctx, x, y, tm) {
    var b = Math.round(Math.sin(tm * 3) * 1.5);
    x = Math.round(x); y = Math.round(y) + b;
    ctx.fillStyle = "rgba(27,27,27,0.7)"; ctx.fillRect(x - 8, y - 5, 17, 11);
    ctx.fillStyle = C.gold;
    ctx.fillRect(x - 6, y - 3, 6, 6); ctx.fillStyle = "#1b1b1b"; ctx.fillRect(x - 4, y - 1, 2, 2);
    ctx.fillStyle = C.gold; ctx.fillRect(x, y - 1, 7, 2); ctx.fillRect(x + 4, y + 1, 1, 2); ctx.fillRect(x + 6, y + 1, 1, 3);
  }

  var fl = null;
  function crowPos(f, k, t) {
    var a = f.a0 + t * FLOCK_SPIN * f.spin + k * 6.283 / f.n;
    return { x: f.h.x + Math.cos(a) * FLOCK_R * T, y: f.h.y + Math.sin(a) * FLOCK_R * T, a: a };
  }
  function crowSees(c) {
    if (player.inShield || player.inBush) return false;
    if (Math.hypot(player.x - c.x, player.y - c.y) > CROW_SEE * T) return false;
    return losClear(c.x, c.y, player.x, player.y);
  }
  BH.features.register("flock", {
    copy: COPY.flock,
    onLevelStart: function (level) {
      fl = { level: level, flocks: [], caws: 0, alerts: 0, said: false, log: [] };
      marked(level, "crows").forEach(function (m, j) {
        var n = Math.max(1, Math.min(5, +m.def.crows || 3));
        fl.flocks.push({ h: m.h, i: m.i, n: n, a0: j * 1.3, spin: j % 2 ? -1 : 1, rest: [], cawT: [] });
      });
    },
    onStep: function (dt, api) {
      if (!live(fl) || game.phase !== "play") return;
      shoreGuard();
      var t = now(api);
      fl.flocks.forEach(function (f) {
        for (var k = 0; k < f.n; k++) {
          if ((f.rest[k] || -1e9) > t) continue;
          var c = crowPos(f, k, t);
          if (!crowSees(c)) continue;
          f.rest[k] = t + CROW_REST; f.cawT[k] = t; fl.caws++;
          fl.log.push({ t: +t.toFixed(2), hunter: f.i, crow: k, at: [tOf(player.x), tOf(player.y)] });
          if (fl.log.length > 20) fl.log.shift();
          fx("decoy");
          if (typeof floatText === "function") floatText(c.x, c.y - 24, "CAW!", C.ink, "", 1.0);
          if (typeof ring === "function") ring(c.x, c.y - 12, "rgba(255,250,240,0.7)", T * 1.2, 0.4);
          if (!fl.said) { fl.said = true; api.say("a8Crows", C.gold); }
          var h = f.h;
          if (!ghosted() && h.state !== "chase") {
            h.dir = Math.atan2(player.y - h.y, player.x - h.x);
            h.lastSeen = { x: player.x, y: player.y };
            if (CALM[h.state] || h.state === "follow" || h.state === "watch") {
              h.state = "check"; h.target = { x: player.x, y: player.y }; h.path = []; h.pathKey = ""; h.checkT = 0;
            }
            fl.alerts++;
          }
        }
      });
    },
    onDrawWorld: function (ctx, api) {
      if (!live(fl)) return;
      var t = now(api), tm = typeof simTime === "number" ? simTime : 0;
      fl.flocks.forEach(function (f) {
        var near = Math.hypot(player.x - f.h.x, player.y - f.h.y) < (FLOCK_R + CROW_SEE + 3) * T && !player.inShield;
        for (var k = 0; k < f.n; k++) {
          var c = crowPos(f, k, t), resting = (f.rest[k] || -1e9) > t;
          if (near && !resting) {
            ctx.strokeStyle = "rgba(255,250,240,0.22)"; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]); ctx.lineDashOffset = -tm * 6;
            ctx.beginPath(); ctx.arc(c.x, c.y, CROW_SEE * T, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
          }
          var up = resting ? 30 : 16;
          ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(c.x, c.y + 4, 6, 2, 0, 0, 6.283); ctx.fill();
          drawCrow(ctx, c.x, c.y - up, Math.cos(c.a + Math.PI / 2 * f.spin) >= 0 ? 1 : -1, tm + k, resting);
        }
      });
    }
  });
  function drawCrow(ctx, x, y, face, tm, alert) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = "rgba(210,225,235,0.14)"; ctx.beginPath(); ctx.ellipse(0, -2, 12, 8, 0, 0, 6.283); ctx.fill();
    ctx.scale(face * 1.2, 1.2);
    ctx.fillStyle = "#0e0e14";
    ctx.fillRect(-5, -4, 9, 5); ctx.fillRect(-9, -3, 5, 2); ctx.fillRect(2, -7, 5, 5);
    ctx.fillStyle = "#6e6e66"; ctx.fillRect(7, -5, 3, 2);
    ctx.fillStyle = alert ? C.gold : "#8a8a8a"; ctx.fillRect(5, -6, 1, 1);
    ctx.fillStyle = "#0e0e14";
    if (Math.sin(tm * 14) > 0) { ctx.fillRect(-3, -11, 4, 7); ctx.fillRect(-6, -13, 4, 3); } else { ctx.fillRect(-3, 1, 4, 5); ctx.fillRect(-6, 4, 4, 3); }
    ctx.restore();
  }

  var sk = null;
  function stakeCfg(level) {
    var s = level.stake || {};
    return { small: +s.small > 0 ? +s.small : STAKE.small, range: +s.range > 0 ? +s.range : STAKE.range,
             watchers: +s.watchers > 0 ? +s.watchers : STAKE.watchers, max: +s.max > 0 ? +s.max : STAKE.max };
  }
  function pools() {
    var id = new Int32Array(cols * rows).fill(-1), out = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      if (id[y * cols + x] >= 0 || !isWater(tile(x, y))) continue;
      var p = { id: out.length, tiles: [], shore: [], cx: 0, cy: 0 }, q = [[x, y]], seenShore = {};
      id[y * cols + x] = p.id;
      while (q.length) {
        var c = q.shift(); p.tiles.push(c); p.cx += c[0] + 0.5; p.cy += c[1] + 0.5;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = c[0] + d[0], ny = c[1] + d[1]; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
          var ch = tile(nx, ny);
          if (isWater(ch)) { if (id[ny * cols + nx] < 0) { id[ny * cols + nx] = p.id; q.push([nx, ny]); } }
          else if (!solidH(ch) && !seenShore[nx + "," + ny]) { seenShore[nx + "," + ny] = true; p.shore.push([nx, ny]); }
        });
      }
      p.cx /= p.tiles.length; p.cy /= p.tiles.length; p.size = p.tiles.length;
      out.push(p);
    }
    return { id: id, list: out };
  }
  function release(h) { if (h.state === "watch") { h.state = "return"; h.target = null; h.path = []; h.pathKey = ""; } }
  BH.features.register("stakeout", {
    copy: COPY.stakeout,
    onLevelStart: function (level) {
      var P = pools(), cfg = stakeCfg(level);
      sk = { level: level, cfg: cfg, id: P.id, pools: P.list, wasIn: false, active: null, stakes: 0, bigDives: 0, sent: 0, said: false, log: [] };
      sk.pools.forEach(function (p) { p.small = p.size <= cfg.small; });
    },
    onStep: function (dt, api) {
      if (!live(sk) || game.phase !== "play") return;
      shoreGuard();
      var t = now(api), inW = !!player.inShield;
      if (inW && !sk.wasIn) {
        var pid = sk.id[tOf(player.y) * cols + tOf(player.x)], p = pid >= 0 ? sk.pools[pid] : null;
        if (p && p.small) {
          sk.stakes++;
          var a = { pool: p.id, t0: t, watchers: [], left: -1 };
          if (!ghosted()) {
            var calm = hunters.filter(function (h) { return h.type !== "dog" && CALM[h.state] && Math.hypot(h.x - player.x, h.y - player.y) <= sk.cfg.range * T; });
            calm.sort(function (m, n) { return Math.hypot(m.x - player.x, m.y - player.y) - Math.hypot(n.x - player.x, n.y - player.y); });
            var taken = {};
            calm.slice(0, sk.cfg.watchers).forEach(function (h) {
              var spots = p.shore.filter(function (s) { return !taken[s + ""]; }).sort(function (m, n) {
                return Math.hypot((m[0] + 0.5) * T - h.x, (m[1] + 0.5) * T - h.y) - Math.hypot((n[0] + 0.5) * T - h.x, (n[1] + 0.5) * T - h.y); });
              for (var i = 0; i < spots.length; i++) {
                var s = spots[i], r = bfsCore(tOf(h.x), tOf(h.y), s[0], s[1], function (x, y) { return solidH(tile(x, y)); });
                if (!r.reached) continue;
                taken[s + ""] = true;
                h.state = "watch"; h.target = { x: (s[0] + 0.5) * T, y: (s[1] + 0.5) * T }; h.watchDir = Math.atan2(p.cy - (s[1] + 0.5), p.cx - (s[0] + 0.5));
                h.path = []; h.pathKey = ""; h.lastSeen = null;
                a.watchers.push({ h: h, i: hunters.indexOf(h), spot: s.slice() }); sk.sent++;
                break;
              }
            });
          }
          sk.active = a;
          sk.log.push({ t: +t.toFixed(2), pool: p.id, size: p.size, watchers: a.watchers.map(function (w) { return w.i; }) });
          if (sk.log.length > 20) sk.log.shift();
          if (typeof ring === "function") ring((p.cx) * T, (p.cy) * T, "rgba(200,65,47,0.8)", T * 2.4, 0.7);
          fx("tower"); api.shake(0.15);
          if (!sk.said) { sk.said = true; api.say("a8Stake", C.gold); }
        } else if (p) sk.bigDives++;
      }
      sk.wasIn = inW;
      var A = sk.active;
      if (A) {
        if (!inW && A.left < 0) A.left = t;
        if ((A.left >= 0 && t - A.left > 1) || t - A.t0 > sk.cfg.max) { A.watchers.forEach(function (w) { release(w.h); }); sk.active = null; }
      }
    },
    onDrawWorld: function (ctx, api) {
      if (!live(sk)) return;
      var tm = typeof simTime === "number" ? simTime : 0, A = sk.active;
      sk.pools.forEach(function (p) {
        if (!p.small) return;
        var d = Math.hypot(p.cx * T - player.x, p.cy * T - player.y) / T;
        if (d > 7 && !(A && A.pool === p.id)) return;
        var a = A && A.pool === p.id ? 0.55 : Math.max(0.12, 0.35 - d * 0.03);
        ctx.fillStyle = "rgba(200,65,47," + a.toFixed(3) + ")";
        p.shore.forEach(function (s) { ctx.fillRect(s[0] * T + 14, s[1] * T + 14, 4, 4); });
      });
      if (!A) return;
      var p = sk.pools[A.pool];
      A.watchers.forEach(function (w) {
        var x = (w.spot[0] + 0.5) * T, y = (w.spot[1] + 0.5) * T, k = 0.6 + 0.4 * Math.sin(tm * 5);
        ctx.strokeStyle = "rgba(200,65,47," + k.toFixed(3) + ")"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, 9, 5, 0, 0, 6.283); ctx.stroke();
        ctx.fillStyle = "rgba(200,65,47," + k.toFixed(3) + ")"; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.283); ctx.fill();
      });
      var t = now(api) - A.t0, left = Math.max(0, sk.cfg.max - t);
      if (t < 2.5) label(ctx, "STAKED OUT", p.cx * T, (p.cy - 1.4) * T, C.red);
      else label(ctx, Math.ceil(left) + "s", p.cx * T, (p.cy - 1.4) * T, C.red);
    }
  });

  var prevState = BH.featureState;
  BH.featureState = function (id) {
    if (id === "auditor") return live(au) ? { auditors: au.idx.slice(), sightings: au.sightings, waterSteps: au.waterSteps, seeing: au.seeing, lastSeenBy: au.lastSeenBy, said: au.said, held: guard.level === L ? guard.held : 0 } : null;
    if (id === "flock") return live(fl) ? { flocks: fl.flocks.map(function (f) { return { hunter: f.i, crows: f.n }; }), caws: fl.caws, alerts: fl.alerts, log: fl.log.slice(), said: fl.said, held: guard.level === L ? guard.held : 0 } : null;
    if (id === "stakeout") {
      if (!live(sk)) return null;
      return { cfg: sk.cfg, pools: sk.pools.map(function (p) { return { size: p.size, small: p.small, shore: p.shore.length, at: [Math.floor(p.cx), Math.floor(p.cy)] }; }),
        stakes: sk.stakes, bigDives: sk.bigDives, sent: sk.sent, log: sk.log.slice(), said: sk.said,
        active: sk.active ? { pool: sk.active.pool, watchers: sk.active.watchers.map(function (w) { return { i: w.i, spot: w.spot, state: w.h.state }; }) } : null };
    }
    return typeof prevState === "function" ? prevState(id) : null;
  };
})();
