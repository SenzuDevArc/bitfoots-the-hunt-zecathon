(function () {
  "use strict";
  var W = window;
  if (!W.BH || !BH.features || !BH.features.register) return;

  var GATE = "ð", VALID = 1.8, FLY = 0.7, GAP = 0.6, LIT = 0.6, TRICK = 1.4, AIM = 0.4, THROW = 0.6, BOUNCE = 0.5, SAID = 1.8;
  var S = null, key = null;

  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function on() { return typeof L !== "undefined" && !!L && L.tid === "dam"; }
  function sync() {
    var k = game.levelIdx + ":" + levelStart;
    if (k !== key) { key = k; S = { crossed: 0, checks: 0, t0: -99, jar: [], fly: [], next: 1, refused: 0, trick: null, blood: [], stains: [], ripples: [], seed: 9173, lastT: null }; }
    return S;
  }
  var KILL = 1.6, RUN = 0.9, STOMP = 0.9, KICK = 0.8, LEAVE = 1.4, GRAV = 520;
  var REDS = ["#5a0808", "#8a0f0f", "#b3141a", "#d42220", "#ee3b2e"];
  function rnd() { S.seed = (S.seed * 16807) % 2147483647; return (S.seed - 1) / 2147483646; }
  function scene() {
    var gp = gatePos(); if (!gp) return null;
    var j = jarPos(gp), tp = trickPos(gp, j), dx = cols;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) if (grid[y][x] === "Þ") dx = Math.min(dx, x);
    return { gp: gp, j: j, tp: tp, floor: j.y - 14 + T - 9, left: dx * T, right: gp.x + T / 2 - 4 };
  }
  function spill(sc, n, pow) {
    for (var i = 0; i < n; i++) {
      var a = -Math.PI * (0.05 + 0.9 * rnd()), v = (70 + 230 * rnd()) * pow, wet = rnd() < 0.3;
      S.blood.push({ x: sc.tp.x + (rnd() - 0.5) * 10, y: sc.tp.y + 2, vx: Math.cos(a) * v * 0.75, vy: Math.sin(a) * v, sz: 2 + Math.floor(rnd() * 3),
        col: REDS[Math.floor(rnd() * REDS.length)], to: wet ? sc.floor + 10 + rnd() * 26 : sc.tp.y + 4 + rnd() * (sc.floor - sc.tp.y - 2) });
    }
  }
  function splash(x, y) {
    for (var i = 0; i < 22; i++) {
      var a = -Math.PI * (0.15 + 0.7 * rnd()), v = 60 + 120 * rnd();
      S.blood.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, sz: 1 + Math.floor(rnd() * 2), col: i % 3 ? "#bfe9ff" : "#c41a1a", to: y + rnd() * 8, foam: true });
    }
    S.ripples.push({ x: x, y: y, t0: simTime, big: true });
    if (typeof ring === "function") { ring(x, y, "rgba(196,26,26,0.85)", T * 1.6, 0.8); ring(x, y, "rgba(191,233,255,0.7)", T * 2.2, 1.1); }
  }
  function stepBlood(sc, dt) {
    S.blood = S.blood.filter(function (p) {
      p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vy <= 0 || p.y < p.to) return true;
      var water = p.foam || p.to > sc.floor + 2 || p.x > sc.right || p.x < sc.left;
      if (water) { if (!p.foam && rnd() < 0.5) S.ripples.push({ x: p.x, y: p.to, t0: simTime }); }
      else S.stains.push({ x: Math.round(p.x), y: Math.round(p.to), w: p.sz + Math.floor(rnd() * 3), h: Math.max(1, p.sz - 1), col: p.col });
      return false;
    });
  }
  function stepKill(sc, t) {
    var k = S.trick; if (!k || !k.done) return;
    var e = t - k.t0 - KILL, dt = S.lastT == null ? 0 : Math.min(0.05, t - S.lastT);
    if (e >= RUN && !k.hit) {
      k.hit = true; spill(sc, 90, 1);
      S.stains.push({ x: sc.tp.x - 13, y: sc.tp.y + 7, w: 26, h: 6, col: "#6e0a0a" }, { x: sc.tp.x - 8, y: sc.tp.y + 5, w: 16, h: 3, col: "#8a0f0f" });
      for (var q = 0; q < 8; q++) S.stains.push({ x: Math.round(sc.tp.x - 30 + rnd() * 60), y: Math.round(sc.tp.y + 2 + rnd() * (sc.floor - sc.tp.y - 4)), w: 4 + Math.floor(rnd() * 5), h: 2 + Math.floor(rnd() * 2), col: REDS[Math.floor(rnd() * 3)] });
      if (typeof shake !== "undefined") shake = Math.max(shake, 12);
      if (typeof sfx === "function") sfx("caught");
    }
    if (k.hit && !k.hit2 && e >= RUN + 0.35) { k.hit2 = true; spill(sc, 35, 0.75); if (typeof sfx === "function") sfx("linked"); }
    if (k.hit && !k.hit3 && e >= RUN + 0.7) { k.hit3 = true; spill(sc, 35, 0.75); if (typeof shake !== "undefined") shake = Math.max(shake, 6); }
    if (!k.sunk && e >= RUN + STOMP + KICK) { k.sunk = true; k.sinkAt = t; k.sink = heapAt(sc, 1); splash(k.sink.x, k.sink.y); if (typeof sfx === "function") sfx("splash"); }
    if (!k.gone && e >= RUN + STOMP + KICK + LEAVE) k.gone = true;
    stepBlood(sc, dt);
  }
  function heapAt(sc, f) {
    var y1 = sc.floor + T * 0.7;
    return { x: sc.tp.x + f * 8, y: sc.tp.y + 6 + (y1 - sc.tp.y - 6) * f - Math.sin(f * Math.PI) * 20 };
  }
  function drawHeap(g, x, y, a) {
    g.save(); g.globalAlpha = a;
    R(g, x - 9, y - 1, 18, 5, "#2a1e30"); R(g, x - 8, y - 3, 14, 4, "#3a2a40"); R(g, x - 4, y - 6, 9, 5, "#4a3652");
    R(g, x - 2, y - 4, 4, 2, "#1b1420"); R(g, x - 7, y - 2, 3, 2, "#b3141a"); R(g, x + 3, y, 4, 2, "#8a0f0f"); R(g, x - 1, y - 6, 2, 1, "#d42220");
    g.restore();
  }
  function hunterAt(i, sc, e) {
    var y = sc.tp.y + (i ? -5 : 3), sx = sc.left + 6 - i * 18, ex = sc.tp.x + (i ? 13 : -13), h = { x: sx, y: y, dir: 0, step: e * 60, state: "chase", sus: 0 };
    if (e < RUN) { var f = e / RUN; h.x = sx + (ex - sx) * f * f * (3 - 2 * f); }
    else if (e < RUN + STOMP + KICK) {
      h.x = ex; h.dir = i ? Math.PI : 0;
      if (e < RUN + STOMP) h.y = y - Math.abs(Math.sin((e - RUN) * 14 + i * 1.6)) * 5;
      else { h.dir = Math.PI / 2; if (i) h.x = ex + Math.sin(Math.min(1, (e - RUN - STOMP) / 0.3) * Math.PI) * 6; }
    } else {
      var q = Math.min(1, (e - RUN - STOMP - KICK) / LEAVE);
      h.x = ex + (sx - 30 - ex) * q * q; h.dir = Math.PI; h.state = "patrol"; h.fade = q > 0.7 ? (1 - q) / 0.3 : 1;
    }
    return h;
  }
  function drawKill(g, sc, t) {
    S.stains.forEach(function (s) { R(g, s.x, s.y, s.w, s.h, s.col); });
    S.ripples = S.ripples.filter(function (r) { return t - r.t0 < (r.big ? 6 : 2); });
    S.ripples.forEach(function (r) {
      var a = (t - r.t0) / (r.big ? 6 : 2);
      if (r.big) { g.fillStyle = "rgba(140,10,10," + (0.4 * (1 - a)).toFixed(3) + ")"; g.beginPath(); g.ellipse(r.x, r.y, 10 + a * 26, 4 + a * 9, 0, 0, 6.283); g.fill(); }
      g.strokeStyle = "rgba(196,26,26," + (0.6 * (1 - a)).toFixed(3) + ")"; g.lineWidth = 1;
      g.beginPath(); g.ellipse(r.x, r.y, 2 + a * (r.big ? 30 : 9), 1 + a * (r.big ? 10 : 3), 0, 0, 6.283); g.stroke();
    });
    var k = S.trick; if (!k || !k.done) return;
    var e = t - k.t0 - KILL;
    if (k.sunk) {
      var se = t - k.sinkAt;
      if (se < 0.7) drawHeap(g, k.sink.x, k.sink.y + se * 10, 1 - se / 0.7);
      if (se < 3.5) for (var b = 0; b < 4; b++) { var bt = (se * 1.3 + b * 0.27) % 1; R(g, k.sink.x - 6 + b * 4, k.sink.y - bt * 14, 2, 2, "rgba(191,233,255," + (0.7 * (1 - bt)).toFixed(2) + ")"); }
    } else if (k.hit) drawHeap(g, heapAt(sc, Math.max(0, Math.min(1, (e - RUN - STOMP) / KICK))).x, heapAt(sc, Math.max(0, Math.min(1, (e - RUN - STOMP) / KICK))).y, 1);
    if (e >= 0 && !k.gone && typeof drawHunterBody === "function") {
      [0, 1].forEach(function (i) {
        var h = hunterAt(i, sc, e), keep = W.ctx; g.save(); g.globalAlpha = h.fade == null ? 1 : Math.max(0, h.fade);
        try { W.ctx = g; drawHunterBody(h); } finally { W.ctx = keep; g.restore(); }
      });
    }
    S.blood.forEach(function (p) { R(g, p.x, p.y, p.sz, p.sz, p.col); });
  }
  function gatePos() {
    var all = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) if (grid[y][x] === GATE) all.push({ x: (x + 0.5) * T, y: (y + 0.5) * T });
    return all.length ? all[Math.floor(all.length / 2)] : null;
  }
  function jarPos(gp) {
    var cx = Math.floor(gp.x / T), dy = -1;
    for (var y = 0; y < rows; y++) if (grid[y][cx] === "Þ") dy = y;
    return dy >= 0 ? { x: gp.x, y: dy * T + 14, deck: true } : { x: gp.x, y: gp.y - 3 * T + 6 };
  }
  function trickPos(gp, j) { return { x: j.x - (j.deck ? 2.5 : 2) * T, y: j.y - (j.deck ? 4 : 0) }; }
  function offer(id) {
    if (S.jar.indexOf(id) >= 0) { S.refused++; return false; }
    S.jar.push(id); return true;
  }

  function step() {
    sync();
    if (game.phase !== "play" || !BH.dam || !BH.dam.info) return;
    var di = BH.dam.info(), c = di.crossed, t = simTime;
    if (c > S.crossed) {
      var n = c - S.crossed;
      S.from = di.gate ? { x: (di.gate[0] + 0.5) * T, y: (di.gate[1] + 0.5) * T } : null;
      S.crossed = c; S.checks++; S.t0 = t + 0.2 + n * GAP;
      for (var i = 0; i < n; i++) S.fly.push({ id: S.next++, t0: t + 0.2 + i * GAP });
      if (!S.trick) S.trick = { t0: t + TRICK, id: S.next - 1, done: false, ok: null };
      if (typeof sfx === "function") sfx("click");
    }
    S.fly = S.fly.filter(function (f) {
      if (t - f.t0 < FLY) return true;
      offer(f.id); return false;
    });
    var k = S.trick;
    if (k && !k.done && t - k.t0 >= AIM + THROW) {
      k.done = true; k.ok = offer(k.id);
      if (typeof sfx === "function") sfx("click");
    }
    var sc = scene(); if (sc) stepKill(sc, t);
    S.lastT = t;
  }

  function drawTag(g, x, y, col) {
    R(g, x - 5, y - 3, 10, 6, "#13202c"); R(g, x - 4, y - 2, 8, 4, col); R(g, x - 4, y - 2, 8, 1, "#fffaf0");
    R(g, x - 2, y, 1, 1, "#13202c"); R(g, x + 1, y, 1, 1, "#13202c");
  }
  function label(g, text, x, y, col, a) {
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, a));
    g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = g.measureText(text).width + 12;
    R(g, x - w / 2, y - 8, Math.round(w), 16, "rgba(0,0,0,0.82)");
    R(g, x - w / 2, y + 7, Math.round(w), 1, col);
    g.fillStyle = col; g.fillText(text, x, y);
    g.restore();
  }
  function drawJar(g, j) {
    R(g, j.x - 11, j.y - 12, 22, 3, "#7d8890");
    R(g, j.x - 10, j.y - 9, 20, 22, "rgba(191,233,255,0.18)");
    R(g, j.x - 10, j.y - 9, 1, 22, "rgba(191,233,255,0.6)"); R(g, j.x + 9, j.y - 9, 1, 22, "rgba(191,233,255,0.6)");
    R(g, j.x - 10, j.y + 12, 20, 2, "rgba(191,233,255,0.6)");
    for (var i = 0; i < Math.min(S.jar.length, 6); i++) drawTag(g, j.x - 4 + (i % 2) * 8, j.y + 8 - Math.floor(i / 2) * 6, "#7fd8ff");
    g.save(); g.font = "600 7px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 3; g.strokeStyle = "rgba(20,20,20,0.9)"; g.strokeText("USED TAGS", j.x, j.y - 19);
    g.fillStyle = C.ice; g.fillText("USED TAGS", j.x, j.y - 19);
    g.restore();
  }
  function drawTrickster(g, x, y, a) {
    g.save(); g.globalAlpha = a;
    R(g, x - 6, y + 10, 12, 2, "rgba(0,0,0,0.3)");
    R(g, x - 6, y - 6, 12, 16, "#3a2a40"); R(g, x - 5, y - 12, 10, 8, "#4a3652");
    R(g, x - 3, y - 9, 6, 4, "#1b1420"); R(g, x - 2, y - 8, 1, 1, C.gold); R(g, x + 1, y - 8, 1, 1, C.gold);
    g.restore();
  }

  function draw(g) {
    var gp = gatePos(); if (!gp) return;
    var t = simTime, j = jarPos(gp), a = t - S.t0, src = S.from || gp;
    drawJar(g, j);
    S.fly.forEach(function (f) {
      var k = Math.max(0, Math.min(1, (t - f.t0) / FLY)); if (t < f.t0) return;
      var e = 1 - Math.pow(1 - k, 2);
      drawTag(g, Math.round(src.x + (j.x - src.x) * e), Math.round(src.y + (j.y - 14 - src.y) * e - Math.sin(k * Math.PI) * 12), C.gold);
    });
    var k0 = S.trick, tp = trickPos(gp, j), tx = tp.x, ty = tp.y, sc = scene();
    if (sc) drawKill(g, sc, t);
    if (!k0 || !k0.hit) {
      drawTrickster(g, tx, ty, 1);
      g.save(); g.font = "600 7px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 3; g.strokeStyle = "rgba(20,20,20,0.9)"; g.strokeText("TRICKSTER", tx, ty - 19);
      g.fillStyle = C.gold; g.fillText("TRICKSTER", tx, ty - 19);
      if (k0 && k0.done && t - k0.t0 - KILL >= 0) { g.font = "600 16px 'Plex Cond', sans-serif"; g.fillStyle = C.red; g.fillText("!", tx + 26, ty - 14 + Math.sin(t * 12) * 1.5); }
      g.restore();
    }
    if (k0) {
      var ta = t - k0.t0, tt = ta - AIM;
      if (tt >= 0 && tt < THROW) {
        var e1 = tt / THROW;
        drawTag(g, Math.round(tx + (j.x - tx) * e1), Math.round(ty - 6 + (j.y - 14 - ty + 6) * e1 - Math.sin(e1 * Math.PI) * 14), "#7fd8ff");
      } else if (tt >= THROW && tt < THROW + BOUNCE) {
        var e2 = (tt - THROW) / BOUNCE;
        g.save(); g.globalAlpha = 1 - e2;
        drawTag(g, Math.round(j.x - e2 * 18), Math.round(j.y - 14 - Math.sin(e2 * Math.PI) * 10 + e2 * 16), "#7fd8ff");
        g.restore();
      }
      var ts = tt - THROW;
      if (ts >= 0 && ts < SAID) {
        if (j.deck) label(g, "REFUSED: ALREADY SPENT", tx - T, ty - 34, "#ff8a7a", (SAID - ts) * 2);
        else label(g, "REFUSED: ALREADY SPENT", j.x, j.y - 40, "#ff8a7a", (SAID - ts) * 2);
      }
    }
    var lit = S.fly.filter(function (f) { return t >= f.t0 && t - f.t0 < LIT; })[0];
    var sx = gp.x, sy = j.deck ? j.y - 36 : gp.y - T + 4;
    if (lit) {
      g.globalAlpha = 0.35 * (1 - (t - lit.t0) / LIT); R(g, src.x - T / 2, src.y - T / 2, T, T, "#a8e6a0"); g.globalAlpha = 1;
      label(g, "COIN CHECKED", sx, sy, "#a8e6a0", 1);
    } else if (a >= 0 && a < VALID) label(g, "PAYMENT VALID", sx, j.deck ? sy : gp.y + T + 4, "#a8e6a0", (VALID - a) * 2);
    else {
      g.save(); g.font = "600 7px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 3; g.strokeStyle = "rgba(20,20,20,0.9)"; g.strokeText("PROOF CHECK", sx, sy);
      g.fillStyle = C.ice; g.fillText("PROOF CHECK", sx, sy);
      g.restore();
    }
  }

  BH.features.register("proof", {
    onStep: function () { if (on()) step(); },
    onDrawWorld: function (g) { if (!on()) return; sync(); draw(g); }
  });

  BH.proof = {
    info: function () { if (!on()) return null; sync(); return { crossed: S.crossed, checks: S.checks, tags: S.jar.length, flying: S.fly.length, refused: S.refused, trick: S.trick ? { done: S.trick.done, ok: S.trick.ok, hit: !!S.trick.hit, sunk: !!S.trick.sunk, gone: !!S.trick.gone } : null, stains: S.stains.length }; },
    offer: function (id) { sync(); return offer(id); },
    trickAt: function () { var gp = gatePos(); return gp ? trickPos(gp, jarPos(gp)) : null; }
  };

  (W.LEVELS || []).forEach(function (l) { if (l.tid === "dam" && (l.features || []).indexOf("proof") < 0) l.features = (l.features || []).concat(["proof"]); });
})();
