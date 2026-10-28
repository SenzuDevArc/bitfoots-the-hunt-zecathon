"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.features.register || !BH.tiles) return;

  var WALL = "▓", FLOOR = "░", CRYSTAL = "◆", SHROOM = "♣";
  var glowCol = "#6fe3ff";
  function drawFloor(b, px, py, x, y) {
    b.fillStyle = "#231d2c"; b.fillRect(px, py, T, T);
    for (var k = 0; k < 5; k++) {
      var hx = hash(x * 11 + k, y * 7 - k), hy = hash(y * 13 + k, x * 5 + k);
      b.fillStyle = hx > 0.5 ? "#2e2639" : "#1a1522"; b.fillRect(px + Math.floor(hx * 14) * 2, py + Math.floor(hy * 14) * 2, 2, 2);
    }
    if (hash(x + 91, y + 7) > 0.75) { b.fillStyle = "#3b3248"; b.fillRect(px + 6 + Math.floor(hash(x, y + 3) * 14), py + 8 + Math.floor(hash(y, x + 3) * 14), 5, 3); }
  }
  function drawWall(b, px, py, x, y) {
    b.fillStyle = "#07060a"; b.fillRect(px, py, T, T);
    var n = 2 + Math.floor(hash(x, y) * 2);
    for (var k = 0; k < n; k++) {
      var rx = Math.floor(hash(x * 3 + k, y) * 16), ry = Math.floor(hash(x, y * 3 + k) * 16), rw = 10 + Math.floor(hash(k, x + y) * 8), rh = 8 + Math.floor(hash(y + k, x) * 7);
      b.fillStyle = "#120f18"; b.fillRect(px + rx, py + ry, rw, rh);
      b.fillStyle = "#4a3f5a"; b.fillRect(px + rx, py + ry, rw, 2);
      b.fillStyle = "#030204"; b.fillRect(px + rx, py + ry + rh - 2, rw, 2);
    }
  }
  function drawCrystal(b, px, py, x, y) {
    drawFloor(b, px, py, x, y);
    [[5, 13, 5, 15], [12, 3, 7, 25], [21, 10, 5, 18]].forEach(function (s, i) {
      var h = s[3] - Math.floor(hash(x + i, y) * 5);
      b.fillStyle = glowCol; b.fillRect(px + s[0], py + s[1] + s[3] - h, s[2], h);
      b.fillStyle = "rgba(255,255,255,0.6)"; b.fillRect(px + s[0], py + s[1] + s[3] - h, 1, h);
      b.fillStyle = "rgba(0,0,0,0.3)"; b.fillRect(px + s[0] + s[2] - 2, py + s[1] + s[3] - h, 2, h);
    });
  }
  function drawShroom(b, px, py, x, y) {
    drawFloor(b, px, py, x, y);
    [[6, 18, "#3fe0b0"], [16, 12, "#f0a84a"], [22, 21, "#3fe0b0"]].forEach(function (m, i) {
      var sx = px + m[0] + Math.floor(hash(x, y + i) * 4), sy = py + m[1];
      b.fillStyle = "#d8cfae"; b.fillRect(sx + 2, sy + 3, 2, 5);
      b.fillStyle = m[2]; b.fillRect(sx, sy, 6, 3); b.fillRect(sx + 1, sy - 1, 4, 1);
    });
  }
  BH.tiles.register(WALL, { solid: true, claim: "cave", draw: drawWall });
  BH.tiles.register(FLOOR, { claim: "cave", draw: drawFloor });
  BH.tiles.register(CRYSTAL, { solid: true, claim: "cave", draw: drawCrystal });
  BH.tiles.register(SHROOM, { claim: "cave", draw: drawShroom });

  var CAM_POST = "þ";
  BH.tiles.register(CAM_POST, { solid: true, claim: "camera" });
  var camTile = BH.tiles.get("y");
  if (camTile && camTile.marker) camTile.base = CAM_POST;

  function wire(list) {
    (list || []).forEach(function (lv) {
      if (!lv || !lv.caveWorld) return;
      var f = (lv.features || []).slice(); if (f.indexOf("cave") < 0) f.push("cave"); lv.features = f;
    });
  }
  wire(window.LEVELS);

  var CLOSE = 0.22, OPEN = 0.38;
  var BAT_R = 3, BAT_NOISE = 9, BAT_FLY = 2.4;
  var DRIP_WIN = 0.3, DRIP_FALL = 0.55;

  function parse(def, level) {
    var map = def.map || [], rows = map.length, cols = 0;
    map.forEach(function (r) { cols = Math.max(cols, r.length); });
    var w = { grid: [], rows: rows, cols: cols, coins: [], bats: [], drips: [], keys: [], gifts: [], crystals: [], shrooms: [],
      exit: (def.exit || [0, 0]).slice(), dark: def.dark != null ? def.dark : 0.6, light: def.light || 3, glow: def.glow || "#6fe3ff",
      name: def.name || "SECRET CAVE", dripPeriod: (def.drip && def.drip.period) || 2, dripStep: (def.drip && def.drip.step) || 0.5 };
    for (var y = 0; y < rows; y++) {
      var row = [];
      for (var x = 0; x < cols; x++) {
        var ch = map[y][x] || "#", c = FLOOR, px = (x + 0.5) * T, py = (y + 0.5) * T;
        if (ch === "#") c = WALL;
        else if (ch === "*") { c = CRYSTAL; w.crystals.push({ x: px, y: py }); }
        else if (ch === "'") { c = SHROOM; w.shrooms.push({ x: px, y: py }); }
        else if (ch === "~") c = "~";
        if (ch === "c") w.coins.push({ x: px, y: py, got: false, ph: hash(x, y) * 6 });
        if (ch === "a") w.bats.push({ tx: x, ty: y, x: px, y: py, fly: 0, ph: hash(y, x) * 6 });
        if (ch === "d") w.drips.push({ tx: x, ty: y, x: px, y: py });
        if (ch === "v") w.keys.push({ tx: x, ty: y, x: px, y: py, got: false });
        if (ch === "u") w.gifts.push({ tx: x, ty: y, x: px, y: py, got: false });
        row.push(c);
      }
      w.grid.push(row);
    }
    w.drips.forEach(function (d, i) { d.off = i * w.dripStep; });
    if (w.drips.length) {
      w.crawl = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
      w.drips.forEach(function (d) { w.crawl.x0 = Math.min(w.crawl.x0, d.tx - 1); w.crawl.x1 = Math.max(w.crawl.x1, d.tx + 1); w.crawl.y0 = Math.min(w.crawl.y0, d.ty); w.crawl.y1 = Math.max(w.crawl.y1, d.ty); });
    }
    var s = def.start;
    if (!s) [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (o) { var q = [w.exit[0] + o[0], w.exit[1] + o[1]], r = w.grid[q[1]]; if (r && r[q[0]] && r[q[0]] !== WALL && r[q[0]] !== CRYSTAL) { s = q; return true; } return false; });
    w.start = (s || w.exit).slice();
    var cl = Object.create(level);
    cl.map = map; cl.signs = def.signs || []; cl.hunters = def.hunters || []; cl.amounts = false; cl.crowd = 0; cl.drone = null;
    cl.cave = null; cl.caveWorld = null; cl.features = []; cl.isCave = true;
    w.L = cl;
    return w;
  }

  var KEYS = ["L", "grid", "rows", "cols", "bake", "waterPath", "waterEdges", "bakeDirty", "coins", "stashes", "towers", "dens", "markers",
    "hunters", "prints", "strings", "bridges", "tufts", "noises", "particles", "rings", "floaters", "npcs", "shores", "wave", "drone",
    "exitEvents", "pendingLink", "pulse", "snapPending"];
  var PKEYS = ["x", "y", "vx", "vy", "dir", "inShield", "inBush", "tx", "ty", "entry", "seg", "dist", "side"];
  var GKEYS = ["unmatchedPending", "towerCall", "tracked"];
  function capture() {
    var s = { g: {}, p: {} };
    KEYS.forEach(function (k) { s[k] = window[k]; });
    GKEYS.forEach(function (k) { s.g[k] = game[k]; });
    PKEYS.forEach(function (k) { s.p[k] = player[k]; });
    return s;
  }
  function apply(s) {
    KEYS.forEach(function (k) { window[k] = s[k]; });
    GKEYS.forEach(function (k) { game[k] = s.g[k]; });
  }
  function shiftOutside(dt) {
    var add = function (o, k) { if (o && typeof o[k] === "number" && o[k] > 0) o[k] += dt; };
    prints.forEach(function (p) { add(p, "t"); });
    strings.forEach(function (s) { add(s, "t0"); });
    noises.forEach(function (n) { add(n, "t"); });
    tufts.forEach(function (t) { add(t, "t"); });
    exitEvents.forEach(function (e) { add(e, "t"); });
    floaters.forEach(function (f) { add(f, "t0"); });
    add(pendingLink, "t"); add(game.unmatchedPending, "t"); add(pulse, "t0"); add(snapPending, "t");
    (npcs || []).forEach(function (n) { add(n, "spinUntil"); add(n, "litAt"); });
    hunters.forEach(function (h) { if (h.seen) add(h.seen, "t"); if (h.tk) { add(h.tk, "kneelUntil"); add(h.tk, "confUntil"); add(h.tk, "nextSniff"); } });
  }

  var cv = null;
  function mine() { return !!cv && (L === cv.level || L === cv.world.L); }
  function tilesOf(level, ch) { var out = []; (level.map || []).forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === ch) out.push([x, y]); }); return out; }
  function ptile() { return [Math.floor(player.x / T), Math.floor(player.y / T)]; }
  function begin(kind) { cv.tr = { kind: kind, t0: simTime, px: player.x, py: player.y, swapped: false }; }

  function swapIn() {
    var out = capture(); out.at = simTime;
    cv.saved = out;
    var w = cv.world;
    if (!w.scene) w.scene = { L: w.L, grid: w.grid, rows: w.rows, cols: w.cols, bake: null, waterPath: null, waterEdges: null, bakeDirty: false,
      coins: w.coins, stashes: [], towers: [], dens: null, markers: {}, hunters: null, prints: [], strings: [], bridges: {}, tufts: [], noises: [],
      particles: [], rings: [], floaters: [], npcs: [], shores: [], wave: null, drone: null, exitEvents: [], pendingLink: null, pulse: null,
      snapPending: null, g: { unmatchedPending: null, towerCall: false, tracked: null } };
    apply(w.scene);
    glowCol = w.glow;
    if (!bake) bakeLevel();
    if (!hunters) hunters = (w.L.hunters || []).map(makeHunter);
    var s = w.start;
    player.x = (s[0] + 0.5) * T; player.y = (s[1] + 0.5) * T; player.vx = player.vy = 0; player.tx = s[0]; player.ty = s[1];
    player.inShield = isWater(tile(s[0], s[1])); player.inBush = false; player.entry = null; player.dist = 0;
    player.dir = s[0] > w.exit[0] ? "right" : s[0] < w.exit[0] ? "left" : s[1] > w.exit[1] ? "down" : "up";
    tapGo = null; cam.x = player.x; cam.y = player.y;
    cv.inside = true; cv.armed = false; cv.entries++; cv.inAt = simTime;
    trace.push(simTime.toFixed(1) + " cave in");
    if (typeof sfx === "function") sfx("splashIn");
    if (!cv.said) { cv.said = true; if (F.words.caveIn) say("caveIn"); }
  }
  function swapOut() {
    var w = cv.world;
    w.scene = capture();
    var o = cv.saved, dt = simTime - o.at;
    apply(o);
    PKEYS.forEach(function (k) { player[k] = o.p[k]; });
    player.vx = player.vy = 0;
    shiftOutside(dt);
    tapGo = null; cam.x = player.x; cam.y = player.y;
    cv.inside = false; cv.armed = false; cv.saved = null; cv.exits++; cv.secs += dt; cv.lastOut = { at: simTime, secsInside: +dt.toFixed(2) };
    trace.push(simTime.toFixed(1) + " cave out");
    if (typeof sfx === "function") sfx("splashOut");
  }

  function stepInside(dt, api) {
    var w = cv.world, p = player, pt = ptile(), t = api.time;
    w.bats.forEach(function (b) {
      if (b.fly > 0) { b.fly -= dt; return; }
      if (p.sprinting && Math.hypot(b.x - p.x, b.y - p.y) < BAT_R * T) {
        b.fly = BAT_FLY; cv.screeches++;
        makeNoise(b.x, b.y, BAT_NOISE, "noise"); addTrauma(0.15);
        if (typeof sfx === "function") sfx("decoy");
        floatText(b.x, b.y - 16, "SCREECH!", C.red, "", 1.2);
        trace.push(simTime.toFixed(1) + " bat screech");
      }
    });
    if (w.crawl) {
      var inBox = pt[0] >= w.crawl.x0 && pt[0] <= w.crawl.x1 && pt[1] >= w.crawl.y0 && pt[1] <= w.crawl.y1;
      if (!inBox) cv.safe = { x: p.x, y: p.y };
    }
    w.drips.forEach(function (d) {
      var landing = dripPhase(d, t) < DRIP_WIN;
      if (landing && !d.was) { puff(d.x, d.y + 6, 7, "rgba(160,210,255,0.85)", 34); ring(d.x, d.y + 6, "rgba(160,210,255,0.6)", T * 0.6, 0.35); }
      d.was = landing;
      if (landing && pt[0] === d.tx && pt[1] === d.ty && !p.inShield && cv.safe) {
        cv.splashes++;
        if (typeof sfx === "function") sfx("splash");
        floatText(p.x, p.y - 20, "SPLASH!", C.ice, "", 1.0); puff(p.x, p.y, 12, "rgba(160,210,255,0.9)", 40); addTrauma(0.25);
        p.x = cv.safe.x; p.y = cv.safe.y; p.vx = p.vy = 0; tapGo = null; pt = ptile();
        trace.push(simTime.toFixed(1) + " drip splash");
      }
    });
    w.keys.forEach(function (k) {
      if (k.got || pt[0] !== k.tx || pt[1] !== k.ty) return;
      k.got = true; cv.got.key = true; puff(k.x, k.y, 16, "rgba(190,235,255,0.9)", 40); ring(k.x, k.y, "rgba(190,235,255,0.8)", T * 1.2, 0.6);
      if (F.words.viewKey) say("viewKey"); else popRaw("VIEWING KEY", C.ice);
    });
    w.gifts.forEach(function (g) {
      if (g.got || pt[0] !== g.tx || pt[1] !== g.ty) return;
      g.got = true; cv.got.gift = (cv.got.gift || 0) + 1; player.decoys = (player.decoys || 0) + 1;
      if (typeof updateStrip === "function") updateStrip();
      floatText(g.x, g.y - 12, "+1 DECOY", C.gold, "", 1.3); puff(g.x, g.y, 12, "rgba(234,186,73,0.9)", 40);
      if (typeof sfx === "function") sfx("buy");
    });
  }
  function dripPhase(d, t) { var per = cv.world.dripPeriod, q = (t - d.off) % per; return q < 0 ? q + per : q; }

  BH.features.register("cave", {
    onLevelStart: function (level, api) {
      cv = null;
      if (!level.caveWorld) return;
      var w = parse(level.caveWorld, level);
      cv = { level: level, def: level.caveWorld, world: w, inside: false, tr: null, armed: true, saved: null, mouths: tilesOf(level, "S"),
        entries: 0, exits: 0, secs: 0, said: false, got: {}, splashes: 0, screeches: 0, safe: null, lastOut: null, inAt: -1e9 };
    },
    onStep: function (dt, api) {
      if (!mine()) return;
      var tr = cv.tr;
      if (tr) {
        if (!tr.swapped) {
          player.x = tr.px; player.y = tr.py; player.vx = player.vy = 0;
          if (simTime - tr.t0 >= CLOSE) { if (tr.kind === "in") swapIn(); else swapOut(); tr.swapped = true; tr.t1 = simTime; }
          return;
        }
        if (simTime - tr.t1 >= OPEN) cv.tr = null;
      }
      var pt = ptile();
      if (!cv.inside) {
        var onMouth = cv.mouths.some(function (m) { return m[0] === pt[0] && m[1] === pt[1] && tile(m[0], m[1]) !== "S"; });
        if (!onMouth) cv.armed = true;
        else if (cv.armed && !cv.tr) begin("in");
        return;
      }
      var ex = cv.world.exit;
      if (pt[0] !== ex[0] || pt[1] !== ex[1]) cv.armed = true;
      else if (cv.armed && !cv.tr) { begin("out"); return; }
      stepInside(dt, api);
    },
    onDrawWorld: function (ctx, api) {
      if (!mine() || !cv.inside) return;
      var w = cv.world, t = simTime;
      var ex = w.exit, exX = ex[0] * T, exY = ex[1] * T;
      var dg = ctx.createRadialGradient(exX + T / 2, exY + T / 2, 2, exX + T / 2, exY + T / 2, T * 1.3);
      dg.addColorStop(0, "rgba(190,230,160,0.95)"); dg.addColorStop(0.5, "rgba(90,150,90,0.55)"); dg.addColorStop(1, "rgba(40,80,40,0)");
      ctx.fillStyle = dg; ctx.fillRect(exX - T, exY - T, T * 3, T * 3);
      ctx.fillStyle = "#3a3148"; ctx.fillRect(exX - 2, exY - 3, T + 4, 5); ctx.fillRect(exX - 3, exY, 5, T); ctx.fillRect(exX + T - 2, exY, 5, T);
      if (liveFrame && w.dark > 0) drawDark(ctx, w);
      ctx.globalCompositeOperation = "lighter";
      w.crystals.forEach(function (c, i) {
        var a = 0.28 + Math.sin(t * 1.6 + i) * 0.08, g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, T * 1.6);
        g.addColorStop(0, hexA(w.glow, a)); g.addColorStop(1, hexA(w.glow, 0)); ctx.fillStyle = g; ctx.fillRect(c.x - T * 1.6, c.y - T * 1.6, T * 3.2, T * 3.2);
      });
      w.shrooms.forEach(function (c, i) {
        var a = 0.16 + Math.sin(t * 2.2 + i * 1.7) * 0.06, g = ctx.createRadialGradient(c.x, c.y, 1, c.x, c.y, T);
        g.addColorStop(0, "rgba(90,240,190," + a.toFixed(3) + ")"); g.addColorStop(1, "rgba(90,240,190,0)"); ctx.fillStyle = g; ctx.fillRect(c.x - T, c.y - T, T * 2, T * 2);
      });
      coins.forEach(function (c) {
        if (c.got) return;
        var k = Math.pow(Math.max(0, Math.sin(t * 2.3 + c.ph * 3)), 12); if (k < 0.02) return;
        ctx.fillStyle = "rgba(255,220,120," + (0.9 * k).toFixed(3) + ")"; ctx.fillRect(c.x - 1, c.y - 7, 2, 14); ctx.fillRect(c.x - 7, c.y - 1, 14, 2);
      });
      ctx.globalCompositeOperation = "source-over";
      for (var i = 0; i < 5; i++) {
        var per = 1.9 + i * 0.37, q = ((t + i * 0.83) % per) / per, dx = (hash(i, Math.floor((t + i * 0.83) / per)) * w.cols) | 0, dy = (hash(Math.floor((t + i * 0.83) / per), i + 9) * w.rows) | 0;
        if (tile(dx, dy) === WALL || tile(dx, dy) === CRYSTAL) continue;
        var fx = (dx + 0.5) * T, fy = (dy + 0.5) * T;
        if (q < 0.7) { ctx.fillStyle = "rgba(170,210,255,0.55)"; ctx.fillRect(fx, fy - 26 + q / 0.7 * 26, 1.5, 4); }
        else { var r = (q - 0.7) / 0.3; ctx.strokeStyle = "rgba(170,210,255," + (0.5 * (1 - r)).toFixed(3) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(fx, fy + 2, 2 + r * 7, 1 + r * 2.5, 0, 0, 6.283); ctx.stroke(); }
      }
      w.drips.forEach(function (d) {
        var ph = dripPhase(d, api.time), per = w.dripPeriod, fall = ph > per - DRIP_FALL ? (ph - (per - DRIP_FALL)) / DRIP_FALL : -1;
        ctx.fillStyle = "rgba(120,170,230,0.35)"; ctx.fillRect(d.x - 3, d.y - T / 2, 6, 3);
        if (fall >= 0) {
          ctx.fillStyle = "rgba(10,20,40," + (0.25 + 0.4 * fall).toFixed(3) + ")"; ctx.beginPath(); ctx.ellipse(d.x, d.y + 6, 3 + fall * 7, 1.5 + fall * 3, 0, 0, 6.283); ctx.fill();
          ctx.fillStyle = "#bfe6ff"; ctx.fillRect(d.x - 1.5, d.y - T / 2 + fall * (T / 2 + 4), 3, 5);
        } else if (ph < DRIP_WIN) {
          var r = ph / DRIP_WIN; ctx.strokeStyle = "rgba(190,235,255," + (0.9 * (1 - r)).toFixed(3) + ")"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(d.x, d.y + 6, 5 + r * 10, 2 + r * 4, 0, 0, 6.283); ctx.stroke();
        }
      });
      w.keys.forEach(function (k) {
        if (k.got) return;
        var b = Math.sin(t * 3) * 2;
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(190,235,255,0.3)"; ctx.beginPath(); ctx.arc(k.x, k.y + b, 14, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = C.ice; ctx.fillRect(k.x - 7, k.y - 4 + b, 7, 7); ctx.fillStyle = "#1b1b1b"; ctx.fillRect(k.x - 5, k.y - 2 + b, 3, 3);
        ctx.fillStyle = C.ice; ctx.fillRect(k.x, k.y - 1 + b, 8, 2); ctx.fillRect(k.x + 4, k.y + 1 + b, 2, 3); ctx.fillRect(k.x + 7, k.y + 1 + b, 1, 2);
      });
      w.gifts.forEach(function (g) {
        if (g.got) return;
        var b = Math.sin(t * 2.5) * 1.5;
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(234,186,73,0.25)"; ctx.beginPath(); ctx.arc(g.x, g.y + b, 13, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#7a4f45"; ctx.fillRect(g.x - 5, g.y - 3 + b, 10, 7); ctx.fillStyle = "#9a6a5c"; ctx.fillRect(g.x - 3, g.y - 6 + b, 6, 3);
        ctx.fillStyle = C.gold; ctx.fillRect(g.x - 5, g.y + b, 10, 1);
      });
      w.bats.forEach(function (bt) {
        var fly = bt.fly > 0, x = bt.x + (fly ? Math.cos(t * 7 + bt.ph) * 12 : 0), y = bt.y - T * 0.3 + (fly ? Math.sin(t * 9 + bt.ph) * 7 : Math.sin(t * 1.5 + bt.ph));
        var flap = fly ? (Math.sin(t * 30) > 0 ? 1 : -1) : 0;
        if (fly) { ctx.strokeStyle = "rgba(255,90,60,0.5)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 12 + (t * 40) % 10, 0, 6.283); ctx.stroke(); }
        ctx.fillStyle = "#5a4a66"; ctx.fillRect(x - 3, y - 5, 6, 10); ctx.fillRect(x - 3, y - 7, 2, 2); ctx.fillRect(x + 1, y - 7, 2, 2);
        if (fly) { ctx.fillRect(x - 13, y - 3 + flap * 4, 10, 3); ctx.fillRect(x + 3, y - 3 + flap * 4, 10, 3); ctx.fillRect(x - 15, y - 1 + flap * 5, 3, 2); ctx.fillRect(x + 12, y - 1 + flap * 5, 3, 2); }
        else { ctx.fillStyle = "#3e3348"; ctx.fillRect(x - 5, y - 4, 2, 9); ctx.fillRect(x + 3, y - 4, 2, 9); }
        ctx.fillStyle = fly ? "#ff5a3c" : "#e8b04a"; ctx.fillRect(x - 2, y - 3, 1.5, 1.5); ctx.fillRect(x + 0.5, y - 3, 1.5, 1.5);
        if (!fly) { ctx.fillStyle = "rgba(255,250,240,0.55)"; ctx.font = "600 8px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("z", x + 8, y - 9 - (t * 3 + bt.ph) % 4); }
      });
    },
    onDrawOver: function (ctx, api) {
      if (!mine()) return;
      var tr = cv.tr, f = null;
      if (tr) f = tr.swapped ? (simTime - tr.t1) / OPEN : 1 - (simTime - tr.t0) / CLOSE;
      if (f != null && f < 1) {
        var s = toScreen(player.x, player.y), R = Math.max(0.5, Math.max(0, f) * Math.hypot(W, H));
        ctx.save(); ctx.fillStyle = "#050409"; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(s.x, s.y, R, 0, 6.283); ctx.fill("evenodd");
        ctx.strokeStyle = "rgba(234,186,73,0.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 6.283); ctx.stroke(); ctx.restore();
      }
    }
  });
  function toScreen(x, y) {
    var vw = W / zoom, vh = H / zoom, cx = clampCam(cam.x, vw, cols * T), cy = clampCam(cam.y, vh, rows * T);
    return { x: W / 2 + (x - cx) * zoom, y: H / 2 + (y - cy) * zoom };
  }
  function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + Math.max(0, a).toFixed(3) + ")"; }
  var dk = null;
  function drawDark(ctx, w) {
    var pw = w.cols * T, ph = w.rows * T;
    if (!dk) dk = document.createElement("canvas");
    if (dk.width !== pw || dk.height !== ph) { dk.width = pw; dk.height = ph; }
    var d = dk.getContext("2d");
    d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, pw, ph);
    d.fillStyle = "rgba(4,3,9," + w.dark + ")"; d.fillRect(0, 0, pw, ph);
    d.globalCompositeOperation = "destination-out";
    var hole = function (x, y, r, k) {
      var g = d.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(0,0,0," + k + ")"); g.addColorStop(0.55, "rgba(0,0,0," + (k * 0.8) + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
      d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2);
    };
    hole(player.x, player.y, w.light * T, 1);
    w.crystals.forEach(function (c) { hole(c.x, c.y, T * 1.7, 0.75); });
    w.shrooms.forEach(function (c) { hole(c.x, c.y, T * 1.1, 0.55); });
    hole((w.exit[0] + 0.5) * T, (w.exit[1] + 0.5) * T, T * 2, 0.9);
    (L.signs || []).forEach(function (s) { hole((s[0] + 0.5) * T, (s[1] + 0.1) * T, T * 1.5, 0.95); });
    ctx.drawImage(dk, 0, 0);
  }

  BH.cave = {
    inside: function () { return !!(cv && mine() && cv.inside); },
    got: function (id) { return !!(cv && cv.got[id]); },
    mouthPx: function () { var m = cv && cv.mouths[0]; return m ? { x: (m[0] + 0.5) * T, y: (m[1] + 0.5) * T } : null; },
    state: function () {
      if (!cv || !mine()) return null;
      var w = cv.world;
      return { inside: cv.inside, said: cv.said, tr: cv.tr ? cv.tr.kind : null, entries: cv.entries, exits: cv.exits, secsInside: +cv.secs.toFixed(2), lastOut: cv.lastOut,
        name: w.name, cols: w.cols, rows: w.rows, exit: w.exit.slice(), start: w.start.slice(), mouths: cv.mouths.map(function (m) { return m.slice(); }),
        coins: w.coins.length, coinsGot: w.coins.filter(function (c) { return c.got; }).length, key: !!cv.got.key, gifts: cv.got.gift || 0,
        splashes: cv.splashes, screeches: cv.screeches, bats: w.bats.map(function (b) { return b.fly > 0; }), drips: w.drips.length };
    },
    saved: function () { return cv ? cv.saved : null; },
    world: function () { return cv ? cv.world : null; },
    dripPhase: function (i) { return cv && cv.world.drips[i] ? dripPhase(cv.world.drips[i], simTime - levelStart) : null; },
    CLOSE: CLOSE, OPEN: OPEN, DRIP_WIN: DRIP_WIN, BAT_R: BAT_R
  };
  window.caveCoinTotal = function () {
    var n = coins ? coins.length : 0;
    if (!cv || !mine()) return n;
    return n + (cv.inside ? (cv.saved && cv.saved.coins ? cv.saved.coins.length : 0) : cv.world.coins.length);
  };
})();
