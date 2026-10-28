"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.features.register || !BH.tiles) return;

  var WORDS = {
    burrowIn: "UNLINKED",
    burrowLost: "LOST YOU",
    leavesFirst: "CRUNCH!",
    leavesCrunch: "crunch",
    seedSet: "SEED SAVED",
    seedUsed: "RESTORED",
    seedSpent: "SEED USED",
    seedOn: "SEED SAVED ✓",
    seedOnSub: "caught? you restart here"
  };
  var SIGNS = {
    burrow: ["IN HERE, OUT THERE", "NO STEPS BETWEEN"],
    leaves: ["DRY LEAVES: GO ROUND", "CRUNCH CARRIES FAR"],
    seed: ["STEP ON THE STONE", "ONE SECOND CHANCE"]
  };
  var DEV = {
    burrow: "In a shielded Zcash transaction the chain doesn't show which note was spent or who received it.",
    leaves: "Network-level metadata like timing and IP address can identify you even when the transaction is shielded.",
    seed: "A wallet's seed phrase can restore its funds on a new device, so it must be kept secret and backed up."
  };
  var NOISE = { walk: 6, sprint: 9 };

  var S = {};
  function live(id) { var s = S[id]; return s && typeof L !== "undefined" && s.level === L ? s : null; }
  function center(t) { return { x: (t[0] + 0.5) * T, y: (t[1] + 0.5) * T }; }
  function tilesOf(level, ch) {
    var out = [];
    (level.map || []).forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === ch) out.push([x, y]); });
    return out;
  }
  function word(text, rank) {
    if (typeof showPop === "function") return showPop({ text: text, sub: "", color: C.gold, t0: simTime, rank: rank }) !== false;
    if (typeof popRaw === "function") popRaw(text, C.gold);
    return true;
  }
  function pairsOf(level) {
    if (level.burrows && level.burrows.length) return level.burrows.map(function (p) { return [p[0].slice(), p[1].slice()]; });
    var holes = tilesOf(level, "o"), out = [];
    for (var i = 0; i + 1 < holes.length; i += 2) out.push([holes[i], holes[i + 1]]);
    return out;
  }
  function pairIndex(tx, ty) {
    var pairs = (typeof L !== "undefined" && L) ? pairsOf(L) : [];
    for (var i = 0; i < pairs.length; i++) for (var e = 0; e < 2; e++) if (pairs[i][e][0] === tx && pairs[i][e][1] === ty) return { i: i, end: e, other: pairs[i][1 - e] };
    return null;
  }

  var PAIR_COL = [C.gold, C.ice, "#e58f5a", "#b9e36a"];
  BH.tiles.register("o", { claim: "burrow",
    draw: function (b, px, py, x, y) {
      b.fillStyle = "#3b2a1a"; b.fillRect(px + 4, py + 10, 24, 15); b.fillRect(px + 7, py + 7, 18, 21);
      b.fillStyle = C.wood; b.fillRect(px + 7, py + 7, 18, 2); b.fillRect(px + 4, py + 10, 3, 2); b.fillRect(px + 25, py + 10, 3, 2);
      b.fillStyle = "#5a3f27"; b.fillRect(px + 5, py + 22, 3, 2); b.fillRect(px + 23, py + 23, 3, 2); b.fillRect(px + 14, py + 26, 4, 2);
      b.fillStyle = "#050505"; b.fillRect(px + 9, py + 12, 14, 10); b.fillRect(px + 11, py + 10, 10, 14);
      b.fillStyle = "#1b120b"; b.fillRect(px + 9, py + 12, 14, 2);
      var p = pairIndex(x, y); if (!p) return;
      b.fillStyle = PAIR_COL[p.i % PAIR_COL.length];
      for (var k = 0; k <= Math.floor(p.i / PAIR_COL.length); k++) b.fillRect(px + 14 - k * 3, py + 2, 4, 3);
    },
    onEnter: function (tx, ty, api) {
      var s = live("burrow"); if (!s || game.phase !== "play" || player.inShield) return;
      var p = pairIndex(tx, ty); if (!p) return;
      if (simTime - s.lastJump < 0.5) return;
      var a = center([tx, ty]), bT = p.other, bb = center(bT);
      s.lastJump = simTime; s.jumps++;
      puff(a.x, a.y, 16, "rgba(107,74,46,0.9)", 40); ring(a.x, a.y, "rgba(107,74,46,0.8)", T * 1.2, 0.5);
      player.x = bb.x; player.y = bb.y; player.vx = 0; player.vy = 0; player.tx = bT[0]; player.ty = bT[1];
      if (typeof tapGo !== "undefined") tapGo = null;
      player.seg += 1; player.dist = 0; stamp(true);
      puff(bb.x, bb.y, 18, "rgba(107,74,46,0.9)", 46); ring(bb.x, bb.y, "rgba(234,186,73,0.6)", T * 1.4, 0.6);
      player.spinUntil = simTime + 0.35;
      sfx("splashOut");
      var lost = 0;
      hunters.forEach(function (h) {
        var onYou = h.state === "chase" || h.state === "follow" || (h.state === "rush" && !h.decoy) || (h.state === "check" && h.lastSeen);
        if (!onYou) return;
        loseTrail(h); h.sus = 0; h.lastSeen = null;
        h.state = "check"; h.target = { x: a.x, y: a.y }; h.path = []; h.pathKey = ""; h.checkT = 0; lost++;
      });
      s.lostAt.push({ t: simTime, from: [tx, ty], to: bT.slice(), lost: lost });
      if (!s.said) s.said = word(WORDS.burrowIn, 5);
      else if (lost) word(WORDS.burrowLost, 4);
      trace.push(simTime.toFixed(1) + " burrow " + tx + "," + ty + ">" + bT[0] + "," + bT[1] + " lost " + lost);
    }
  });
  BH.features.register("burrow", {
    onLevelStart: function (level) { S.burrow = { level: level, pairs: pairsOf(level), jumps: 0, lastJump: -1e9, said: false, lostAt: [] }; }
  });

  var LEAF_COL = ["#8a5a2b", "#b8862b", "#6b3a1f", "#a2552e", "#c9923a"];
  BH.tiles.register("l", { claim: "leaves",
    draw: function (b, px, py, x, y) {
      b.fillStyle = "#2a2412"; b.fillRect(px, py, T, T);
      for (var k = 0; k < 14; k++) {
        var hx = hash(x * 11 + k, y * 17 + k * 3), hy = hash(y * 13 + k * 5, x * 7 - k), hc = hash(x + k * 31, y - k * 19);
        var lx = px + 1 + Math.floor(hx * 26), ly = py + 1 + Math.floor(hy * 27);
        b.fillStyle = LEAF_COL[Math.floor(hc * LEAF_COL.length)];
        if (hc > 0.5) { b.fillRect(lx, ly, 4, 2); b.fillRect(lx + 1, ly - 1, 2, 1); } else { b.fillRect(lx, ly, 2, 4); b.fillRect(lx + 2, ly + 1, 1, 2); }
      }
      b.fillStyle = "#4e3520"; b.fillRect(px + 6 + Math.floor(hash(x, y) * 14), py + 5 + Math.floor(hash(y, x) * 18), 7, 1);
    },
    onEnter: function (tx, ty, api) {
      var s = live("leaves"); if (!s || game.phase !== "play" || player.inShield) return;
      if (simTime - s.last < 0.12) return;
      s.last = simTime;
      var kind = player.sprinting ? "sprint" : "walk", r = NOISE[kind];
      var c = center([tx, ty]);
      makeNoise(c.x, c.y, r, "crunch");
      s.crunches.push({ t: +simTime.toFixed(2), at: [tx, ty], kind: kind, r: r });
      puff(c.x, c.y + 6, 8, "rgba(184,134,43,0.9)", 30);
      sfx("sprint", { vol: 1.4 });
      if (!s.said) { s.said = word(WORDS.leavesFirst, 3); addTrauma(0.15); }
      else floatText(c.x, c.y - 10, WORDS.leavesCrunch, C.goldDim, "", 0.7);
    }
  });
  BH.features.register("leaves", {
    onLevelStart: function (level) { S.leaves = { level: level, last: -1e9, said: false, crunches: [] }; }
  });

  BH.tiles.register("z", { claim: "seed",
    draw: function (b, px, py) {
      b.fillStyle = "rgba(0,0,0,0.35)"; b.fillRect(px + 5, py + 25, 23, 4);
      b.fillStyle = "#3a3a36"; b.fillRect(px + 6, py + 9, 20, 17); b.fillRect(px + 8, py + 7, 16, 2);
      b.fillStyle = "#55554f"; b.fillRect(px + 8, py + 7, 16, 3); b.fillRect(px + 6, py + 10, 2, 12);
      b.fillStyle = "#2c2c29"; b.fillRect(px + 6, py + 24, 20, 2);
    },
    onEnter: function (tx, ty, api) {
      var s = live("seed"); if (!s || game.phase !== "play" || s.touched) return;
      s.touched = true; s.at = [tx, ty]; s.touchT = +simTime.toFixed(2);
      s.snap = { carry: player.carry, stash: player.stash, got: coins.map(function (c) { return c.got; }),
        stored: stashes.map(function (k) { return k.stored; }), score: player.score };
      var c = center([tx, ty]);
      ring(c.x, c.y, "rgba(234,186,73,0.9)", T * 2, 0.8); puff(c.x, c.y, 16, "rgba(234,186,73,0.95)", 40);
      sfx("stash"); word(WORDS.seedSet, 4);
      if (typeof floatText === "function") floatText(c.x, c.y - T * 0.6, WORDS.seedSet, C.gold, WORDS.seedOnSub, 2.6);
      trace.push(simTime.toFixed(1) + " seed set carry " + player.carry);
    }
  });
  BH.features.register("seed", {
    onLevelStart: function (level) {
      S.seed = { level: level, stones: tilesOf(level, "z"), touched: false, used: false, at: null, snap: null, restores: 0 };
      if (level && level.signs) level.signs = level.signs.map(function (sg) { return sg[2] === "TOUCH THE STONE" ? [sg[0], sg[1], SIGNS.seed[0]].concat(sg.slice(3)) : sg; });
    },
    onDrawWorld: function (ctx2) {
      var s = live("seed"); if (!s) return;
      s.stones.forEach(function (t) {
        var px = t[0] * T, py = t[1] * T, armed = s.touched && !s.used && s.at && s.at[0] === t[0] && s.at[1] === t[1];
        var spent = s.used && s.at && s.at[0] === t[0] && s.at[1] === t[1];
        if (armed) {
          var f = 0.5 + 0.5 * Math.sin(simTime * 4);
          ctx2.fillStyle = "rgba(234,186,73," + (0.18 + 0.12 * f).toFixed(3) + ")"; ctx2.beginPath(); ctx2.arc(px + 16, py + 16, 17 + f * 3, 0, 6.283); ctx2.fill();
          ctx2.strokeStyle = "rgba(234,186,73," + (0.5 + 0.4 * f).toFixed(3) + ")"; ctx2.lineWidth = 1.5; ctx2.beginPath(); ctx2.arc(px + 16, py + 16, 19 + f * 3, 0, 6.283); ctx2.stroke();
        }
        ctx2.fillStyle = spent ? "#6a6a63" : armed ? C.gold : C.goldDim;
        ctx2.fillRect(px + 13, py + 19, 6, 4); ctx2.fillRect(px + 14, py + 18, 4, 6);
        ctx2.fillRect(px + 15, py + 14, 2, 4);
        ctx2.fillRect(px + 10, py + 11, 5, 2); ctx2.fillRect(px + 11, py + 10, 3, 1); ctx2.fillRect(px + 13, py + 13, 2, 1);
        ctx2.fillRect(px + 17, py + 11, 5, 2); ctx2.fillRect(px + 18, py + 10, 3, 1); ctx2.fillRect(px + 17, py + 13, 2, 1);
        if (!s.touched) { var tw = (simTime * 1.5 + t[0]) % 2; if (tw < 0.3) { ctx2.fillStyle = C.ink; ctx2.fillRect(px + 22, py + 8, 2, 2); } }
        if (spent) {
          ctx2.fillStyle = "#111"; ctx2.fillRect(px + 9, py + 8, 2, 5); ctx2.fillRect(px + 11, py + 12, 2, 4); ctx2.fillRect(px + 13, py + 15, 3, 2);
          ctx2.fillRect(px + 16, py + 16, 2, 5); ctx2.fillRect(px + 18, py + 20, 2, 5);
          ctx2.font = "600 8px 'Plex Mono', monospace"; ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
          ctx2.fillStyle = "rgba(27,27,27,0.8)"; ctx2.fillRect(px - 8, py + 29, T + 16, 10);
          ctx2.fillStyle = "#9a9a90"; ctx2.fillText(WORDS.seedSpent, px + 16, py + 34);
        }
        if (armed) {
          ctx2.font = "600 9px 'Plex Mono', monospace"; ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
          var ow = (ctx2.measureText(WORDS.seedOn).width || 0) + 10;
          ctx2.fillStyle = "rgba(27,27,27,0.85)"; ctx2.fillRect(px + 16 - ow / 2, py + 29, ow, 12);
          ctx2.fillStyle = C.gold; ctx2.fillText(WORDS.seedOn, px + 16, py + 35);
        }
      });
    }
  });
  function restoreSeed(s, h) {
    s.used = true; s.restores++;
    var c = center(s.at), snap = s.snap;
    player.carry = snap.carry; player.stash = snap.stash; player.score = snap.score; player.combo = 1;
    coins.forEach(function (k, i) { if (i < snap.got.length) k.got = snap.got[i]; });
    stashes.forEach(function (k, i) { if (i < snap.stored.length) k.stored = snap.stored[i]; });
    player.x = c.x; player.y = c.y; player.vx = 0; player.vy = 0; player.tx = s.at[0]; player.ty = s.at[1];
    player.inShield = false; player.seg += 1; player.dist = 0;
    pendingLink = null; game.unmatchedPending = null;
    if (typeof tapGo !== "undefined") tapGo = null;
    var CORE = { patrol: 1, "return": 1, search: 1, check: 1, chase: 1, follow: 1, rush: 1 };
    hunters.forEach(function (q) {
      q.ignoreBefore = prints.length;
      if (!CORE[q.state] && q !== h) return;
      var p0 = q.patrol && q.patrol[0]; if (p0) { q.x = (p0[0] + 0.5) * T; q.y = (p0[1] + 0.5) * T; }
      q.state = "patrol"; q.wp = q.patrol ? 1 % q.patrol.length : 0; q.path = []; q.pathKey = ""; q.target = null;
      q.sus = 0; q.susTick = 0; q.lastSeen = null; q.decoy = false; q.caughtHow = null; q.pursuit = null; q.seen = null;
    });
    addTrauma(0.5); hitstop(0.15); sfx("caught");
    ring(c.x, c.y, "rgba(234,186,73,0.9)", T * 2.4, 0.9); puff(c.x, c.y, 22, "rgba(234,186,73,0.95)", 50);
    word(WORDS.seedUsed, 5);
    trace.push(simTime.toFixed(1) + " seed restored carry " + player.carry + (h ? " (" + h.type + ")" : ""));
  }
  if (typeof caught === "function") {
    var coreCaught = caught;
    caught = function (h, reason) {
      var s = live("seed");
      if (h && s && s.touched && !s.used && s.snap && game.phase === "play") { restoreSeed(s, h); return; }
      return coreCaught.apply(this, arguments);
    };
  }

})();
