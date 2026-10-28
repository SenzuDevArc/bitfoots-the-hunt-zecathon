(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  var MIGRATION_ZIP = "ZIP 318";
  var OLD = "ø", DAM = "Ð", GATE = "ð", DECK = "Þ";

  window.TRAIL_EXTRA_LEVELS = window.TRAIL_EXTRA_LEVELS || {};
  window.TRAIL_EXTRA_LEVELS.dam = {
    act: 3, tid: "dam", title: "THE NEW WATERS", need: 4, par: 210, startCarry: 3,
    features: ["dam", "stamps", "river", "bank", "edge", "trail"],
    elders: ["oak", "sly"],
    npcs: [], talks: [],
    hunters: [{ type: "hunter", patrol: [[22, 1], [22, 10]] }, { type: "hunter", patrol: [[32, 3], [44, 3]] },
      { type: "dog", patrol: [[44, 9], [32, 9]] }, { type: "hunter", patrol: [[35, 10], [35, 1]] }],
    hints: ["need", "home"],
    map: [
      "##############################################",
      "###########~~~~~~~~~....c.....##.............#",
      "#ÞÞÞÞÞÞÞÞÞÞ~~~~~~~~~.b........##.....b.......#",
      "#ÞÞÞÞÞÞÞÞÞÞ~~~~~~~~~..........##.............#",
      "#øøøøøøøøøð~~~~~~~~~....###..........###.....#",
      "#øøøøøøøøøÐ~~~~~~~~~...................~~~...#",
      "#øøPøøøøøøð~~~~~~~~~........b..........~k~.D.#",
      "#øøøøøøøøøÐ~~~~~~~~~...................~~~...#",
      "#øøøøøøøøøð~~~~~~~~~....###..........###.....#",
      "#øøøøøøøøøÐ~~~~~~~~~..........##.............#",
      "#øøøøøøøøøÐ~~~~~~~~~......c...##.....b.......#",
      "##############################################"],
    copy: {
      goal: "Move your 3 coins through the gate, grab 1 more, bring all 4 to the den.",
      lesson: "The old waters are sealed: coins can leave them, but no coin can go in. So you carry your coins over to the new waters.",
      dev: "Since the NU6.3 upgrade the Orchard pool can only be spent from, and new shielded value goes into the Ironwood pool. Old u1 addresses still receive privately, into Ironwood. Under a draft guide" +
        " (" + MIGRATION_ZIP + ")" + ", wallets move these coins over in batches."
    },
    term: ""
  };

  if (!BH.tiles || !BH.features) return;

  var S = null, key = null;
  function R(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(x, y, w, h); }
  function on() { return typeof L !== "undefined" && !!L && L.tid === "dam"; }
  function fresh() { S = { bumps: 0, lastBump: -9, crossed: 0, flows: [], was: null, refusedIn: 0 }; }
  function sync() {
    var k = game.levelIdx + ":" + levelStart;
    if (k !== key) { key = k; fresh(); }
    if (on() && typeof activeFeatures !== "undefined" && !activeFeatures.some(function (f) { return f.id === "dam"; })) {
      var api = Object.create(featureApi); api.id = "dam"; api.state = {};
      activeFeatures.push({ id: "dam", def: BH.features.get("dam"), api: api });
    }
    return S;
  }

  function start(level, api) {
    sync();
    level.map.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        if ((row[x] === "P" || row[x] === "c") && row[x - 1] === OLD && row[x + 1] === OLD) {
          api.setTile(x, y, OLD);
          if (row[x] === "P") {
            player.inShield = true; player.entry = null;
            if (BH.audio && BH.audio.setShielded) BH.audio.setShielded(true, { sfx: false });
          }
        }
      }
    });
    S.was = tile(player.tx, player.ty);
  }

  function refusedAhead() {
    var inp = inputVec(), m = Math.hypot(inp[0], inp[1]);
    if (m < 0.3) return null;
    var here = tileAt(player.x, player.y), d = T * 0.5;
    var x = player.x + inp[0] / m * d, y = player.y + inp[1] / m * d, c = tileAt(x, y);
    return entryRefused(c, here) ? { x: (Math.floor(x / T) + 0.5) * T, y: (Math.floor(y / T) + 0.5) * T } : null;
  }

  function step() {
    if (game.phase !== "play") return;
    var here = tile(player.tx, player.ty);
    if (S.was === GATE && here !== GATE && here !== OLD && player.carry > 0) {
      var n = player.carry;
      S.crossed += n; S.lastGate = S.wasAt;
      for (var i = 0; i < n; i++) S.flows.push({ t0: simTime + i * 0.6, y: player.y + (i % 2 ? 5 : -5) });
      ring(player.x, player.y, "rgba(191,233,255,0.85)", T * 1.8, 0.7);
      floatText(player.x, player.y - 24, "NEW POOL", C.ice, "", 1.4);
      if (typeof sfx === "function") sfx("stash");
    }
    S.was = here; S.wasAt = [player.tx, player.ty];
    var r = refusedAhead();
    if (r) {
      S.refusedIn++;
      if (simTime - S.lastBump > 1.2) {
        S.lastBump = simTime; S.bumps++;
        floatText(r.x, r.y - 14, "SEALED", C.ice, "", 1.1);
        ring(r.x, r.y, "rgba(191,233,255,0.7)", T * 0.9, 0.4);
        if (typeof sfx === "function") sfx("click");
      }
    }
    S.flows = S.flows.filter(function (f) { return simTime - f.t0 < 1.6; });
  }

  function gatePos() {
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) if (grid[y][x] === GATE) return { tx: x, ty: y };
    return null;
  }
  function tag(g, text, x, y, col) {
    g.save();
    g.font = "600 10px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = g.measureText(text).width + 10;
    R(g, Math.round(x - w / 2), Math.round(y - 7), Math.round(w), 14, "rgba(27,27,27,0.85)");
    R(g, Math.round(x - w / 2), Math.round(y + 6), Math.round(w), 1, col);
    g.fillStyle = col; g.fillText(text, x, y);
    g.restore();
  }
  function drawWorld(g) {
    var gp = gatePos(), t = simTime;
    if (gp) {
      var gx = gp.tx * T;
      for (var y0 = 0; y0 < rows; y0++) {
        if (grid[y0][gp.tx] !== GATE) continue;
        for (var i = 0; i < 3; i++) {
          var k = ((t * 0.9 + i / 3) % 1), px = Math.round(gx - T * 0.5 + k * T * 2);
          g.globalAlpha = 0.7 * Math.sin(k * Math.PI);
          R(g, px, y0 * T + 9 + i * 6, 6, 1, C.ice);
        }
      }
      g.globalAlpha = 1;
      S.flows.forEach(function (f) {
        var k = (t - f.t0) / 1.6; if (k < 0) return;
        var x = Math.round(gx + T * 0.5 + k * T * 2.5), y = Math.round(f.y - Math.sin(k * Math.PI) * 10);
        g.globalAlpha = Math.min(1, (1 - k) * 2);
        R(g, x - 4, y - 4, 8, 8, C.goldDim); R(g, x - 3, y - 3, 6, 6, C.gold); R(g, x - 3, y - 3, 2, 2, "#fffaf0");
        g.globalAlpha = 1;
      });
    }
    var dx = 1e9, dy = -1, on_ = 0, oy = 1e9, ox = 0, nx = 0, nn = 0, ny = 1e9;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var c = grid[y][x];
      if (c === DECK) { dx = Math.min(dx, x); dy = Math.max(dy, y); }
      else if (c === OLD) { ox += x; on_++; oy = Math.min(oy, y); }
      else if (c === "~" && x > (gp ? gp.tx : 0)) { nx += x; nn++; ny = Math.min(ny, y); }
    }
    if (dy >= 0) tag(g, "OLD POOL · OUT ONLY", (dx + 2.5) * T, dy * T + 14, C.ice);
    else if (on_) tag(g, "OLD POOL · OUT ONLY", (ox / on_ + 0.5) * T, oy * T + 10, C.ice);
    if (nn) tag(g, "NEW POOL", (nx / nn + 0.5) * T, ny * T + 10, C.gold);
  }

  BH.tiles.register(OLD, { water: true, claim: "dam", canEnter: function (from) { return from === OLD; }, draw: function (b, x, y, tx, ty) {
    R(b, x, y, T, T, "#1a2026");
    var h = hash(tx * 3 + 1, ty * 5 + 2);
    R(b, x + 3 + Math.floor(h * 8), y + 7, 10, 1, "rgba(160,175,185,0.30)");
    R(b, x + 12 + Math.floor(h * 6), y + 20, 12, 1, "rgba(160,175,185,0.22)");
    if (h > 0.7) { R(b, x + 20, y + 11, 4, 3, "#2c343c"); R(b, x + 20, y + 11, 4, 1, "#46525c"); }
  } });
  BH.tiles.register(DAM, { solid: true, claim: "dam", draw: function (b, x, y, tx, ty) {
    R(b, x, y, T, T, "#1f1a14");
    for (var r = 0; r < 4; r++) {
      var off = (r + ty) % 2 ? 0 : 6;
      for (var s = -1; s < 3; s++) {
        var sx = x + off + s * 12, w = 10;
        var a = Math.max(x + 1, sx), z = Math.min(x + T - 1, sx + w);
        if (z - a < 2) continue;
        R(b, a, y + 1 + r * 8, z - a, 6, "#5a6470"); R(b, a, y + 1 + r * 8, z - a, 2, "#7d8890");
      }
    }
    R(b, x + 2, y, T - 4, 2, C.wood);
  } });
  BH.tiles.register(DECK, { solid: true, claim: "dam", draw: function (b, x, y, tx, ty) {
    R(b, x, y, T, T, "#2e2016");
    for (var p = 0; p < 4; p++) {
      var py = y + p * 8, h = hash(tx * 7 + p, ty * 3 + 1);
      R(b, x, py, T, 7, h > 0.5 ? "#5b4128" : "#634630"); R(b, x, py, T, 1, "#7a5a38");
      R(b, x + ((tx * 13 + p * 11) % 24) + 4, py + 1, 1, 6, "#2e2016");
    }
    var below = (grid[ty + 1] || [])[tx], right = (grid[ty] || [])[tx + 1];
    if (below !== DECK) {
      R(b, x, y + T - 9, T, 2, "#8a6a44"); R(b, x, y + T - 9, T, 1, "#b08a5a");
      for (var i = 2; i < T; i += 10) R(b, x + i, y + T - 8, 3, 8, "#3a2a1c");
    }
    if (right !== DECK) {
      R(b, x + T - 4, y, 2, T, "#8a6a44"); R(b, x + T - 4, y, 1, T, "#b08a5a");
      for (var j = 3; j < T; j += 10) R(b, x + T - 5, y + j, 4, 3, "#3a2a1c");
    }
  } });
  BH.tiles.register(GATE, { water: true, claim: "dam", canEnter: function (from) { return from === OLD; }, draw: function (b, x, y) {
    R(b, x, y, T, T, "#13202c");
    R(b, x, y, T, 4, "#5a6470"); R(b, x, y, T, 2, "#7d8890");
    R(b, x, y + T - 4, T, 4, "#5a6470"); R(b, x, y + T - 4, T, 1, "#7d8890");
    R(b, x + 2, y + 4, 3, T - 8, "#3a3a36"); R(b, x + T - 5, y + 4, 3, T - 8, "#3a3a36");
    [[9, 10], [17, 10]].forEach(function (p) {
      for (var i = 0; i < 6; i++) { R(b, x + p[0] + i, y + p[1] + i, 2, 2, C.ice); R(b, x + p[0] + i, y + p[1] + 11 - i, 2, 2, C.ice); }
    });
  } });

  BH.features.register("dam", {
    onLevelStart: function (level, api) { if (!on()) return; start(level, api); },
    onStep: function () { if (!on()) return; sync(); step(); },
    onDrawWorld: function (g) { if (!on()) return; sync(); drawWorld(g); }
  });

  BH.dam = {
    info: function () { sync(); return { bumps: S.bumps, refusedIn: S.refusedIn, crossed: S.crossed, on: on(), gate: S.lastGate || null }; }
  };
})();
