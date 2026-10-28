(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  if (!BH.features || !BH.talk) return;

  var SPEED = 2.4, NEAR = 0.95, FLICK = 1.2, FLY = 0.7, ROWS = 3;
  var HEAD = "FROM  TO    ZEC", ROW = "???   ???   ???   PAID";
  var S = null;

  BH.talk.voice("helper", { name: "???", f: 300, wave: "sawtooth", speed: 34, color: "#9ff0fc", vol: 0.05, every: 1, portrait: { char: "char-046" } });

  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function trailState() {
    if (typeof activeFeatures === "undefined") return null;
    for (var i = 0; i < activeFeatures.length; i++) if (activeFeatures[i].id === "trail") return activeFeatures[i].api.state;
    return null;
  }
  function npc(id) {
    var TS = trailState();
    return TS && TS.npcs ? TS.npcs.filter(function (n) { return n.id === id; })[0] || null : null;
  }
  function land(tx, ty) { var c = tile(tx, ty); return !solidP(c) && !isWater(c); }
  function fresh(api) {
    S = api.state;
    S.seen = 0; S.rows = []; S.rowT = []; S.flickT = []; S.flick = -9; S.flicks = 0; S.fly = []; S.kept = false; S.robbed = false; S.loseAt = null;
    S.h = { state: "walk", path: [], repath: 0, home: null };
  }

  function readLog() {
    var log = BH.river && BH.river.log;
    if (!log) return;
    if (S.seen > log.length) S.seen = 0;
    var watched = !!npc("edge");
    for (; S.seen < log.length; S.seen++) {
      if (!watched) continue;
      S.flick = simTime; S.flicks++; S.flickT.push(simTime);
      if (log[S.seen].dir === "in") { S.rows.push(ROW); S.rowT.push(simTime); }
    }
  }

  function goal(h) {
    if (S.h.state === "leave") return S.h.home;
    var tx = Math.floor(player.x / T), ty = Math.floor(player.y / T);
    if (land(tx, ty)) return { tx: tx, ty: ty };
    var best = null, bd = 1e9;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      if (!land(x, y)) continue;
      var d = Math.hypot((x + 0.5) * T - player.x, (y + 0.5) * T - player.y);
      if (d < bd) { bd = d; best = { tx: x, ty: y }; }
    }
    return best;
  }
  function walk(h, dt) {
    var H = S.h, gl = goal(h);
    if (!gl) return;
    H.repath -= dt;
    if (H.repath <= 0 || !H.path.length) {
      H.repath = 0.25;
      H.path = bfsCore(Math.floor(h.x / T), Math.floor(h.y / T), gl.tx, gl.ty, function (x, y) { return !land(x, y); }).path;
    }
    var p = H.path[0];
    if (!p) { if (h.anim !== "idle") { h.anim = "idle"; h.t0 = simTime; } return; }
    var dx = p[0] - h.x, dy = p[1] - h.y, d = Math.hypot(dx, dy), sp = SPEED * T * dt;
    if (d <= sp) { h.x = p[0]; h.y = p[1]; H.path.shift(); }
    else { h.x += dx / d * sp; h.y += dy / d * sp; }
    if (Math.abs(dx) > 1) h.dir = dx > 0 ? "right" : "left";
    if (h.anim !== "walk") { h.anim = "walk"; h.t0 = simTime; }
  }

  function tell(h) {
    var n = player.carry + player.stash;
    S.robbed = true; S.h.state = "took";
    player.carry = 0; player.stash = 0;
    for (var i = 0; i < n; i++) S.fly.push({ t0: simTime + i * 0.12, x: player.x, y: player.y - 8, s: (i % 2 ? 1 : -1) * (6 + i * 3) });
    if (typeof sfx === "function") sfx("coin");
    S.loseAt = simTime + FLY + n * 0.12;
  }
  function stepLose() {
    if (S.loseAt == null || simTime < S.loseAt) return;
    S.loseAt = null;
    var a = BH.trailFeature && BH.trailFeature.api;
    (a || featureApi).lose("trail:robbed");
  }
  function refuse() {
    S.kept = true; S.h.state = "leave"; S.h.path = [];
    popRaw("WORDS KEPT", C.gold);
    BH.talk.open([["oak", "Real support never asks for your words. Ever."]]);
  }
  function ask(h) {
    S.h.state = "ask"; h.anim = "idle"; h.t0 = simTime;
    BH.talk.open([{ who: "helper", text: "Wallet support! Read me your 24 words.", choices: [
      { text: "Read him my 24 words", then: function () { tell(h); } },
      { text: "Never. Nobody needs my words.", then: refuse }] }]);
  }

  function stepHelper(dt) {
    var h = npc("helper"), TS = trailState(), H = S.h;
    if (!h || (TS && (TS.tour || TS.cine || TS.tourPending || TS.cinePending))) return;
    if (!H.home) H.home = { tx: Math.floor(h.x / T), ty: Math.floor(h.y / T) };
    if (H.state === "took" || H.state === "gone") return;
    if (H.state === "ask") { if (!BH.talk.isOpen()) H.state = "wait"; return; }
    if (H.state === "wait") { if (Math.hypot(player.x - h.x, player.y - h.y) > T * 2.5) H.state = "walk"; return; }
    walk(h, dt);
    if (H.state === "leave") {
      if (H.home.tx === Math.floor(h.x / T) && H.home.ty === Math.floor(h.y / T) && !H.path.length) {
        H.state = "gone"; puff(h.x, h.y, 10, "rgba(255,250,240,0.5)", 24);
        TS.npcs.splice(TS.npcs.indexOf(h), 1);
      }
      return;
    }
    if (Math.hypot(player.x - h.x, player.y - h.y) < NEAR * T && BH.talk.interruptible()) ask(h);
  }

  function drawCoin(g, x, y) { R(g, x - 4, y - 4, 8, 8, "#7a5a12"); R(g, x - 3, y - 3, 6, 6, C.gold); R(g, x - 1, y - 2, 2, 4, "#fff3b0"); }
  function drawFly(g) {
    var h = npc("helper");
    S.fly = S.fly.filter(function (c) {
      var k = (simTime - c.t0) / FLY;
      if (k >= 1) return false;
      if (k < 0 || !h) return true;
      var e = 1 - Math.pow(1 - k, 2);
      drawCoin(g, Math.round(c.x + (h.x - c.x) * e + Math.sin(k * Math.PI) * c.s), Math.round(c.y + (h.y - 10 - c.y) * e - Math.sin(k * Math.PI) * 24));
      return true;
    });
  }
  function drawGlow(g) {
    var k = (simTime - S.flick) / FLICK;
    if (k < 0 || k >= 1) return;
    var on = Math.floor(k * 10) % 2 === 0, r = T * (on ? 1.5 : 1.1), cx = player.x, cy = player.y - 6;
    var gr = g.createRadialGradient(cx, cy, 2, cx, cy, r);
    gr.addColorStop(0, "rgba(255,214,120," + (on ? 0.55 : 0.25) * (1 - k * 0.5) + ")");
    gr.addColorStop(1, "rgba(255,214,120,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fill();
  }
  function drawTower(g, e) {
    var x = Math.round(e.x), fy = Math.round(e.y + 10), blink = Math.floor(simTime * 2) % 2 === 0;
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(x, fy, 16, 4, 0, 0, 6.283); g.fill();
    R(g, x - 12, fy - 5, 24, 5, "#4a5058"); R(g, x - 12, fy - 5, 24, 1, "#6b727b");
    R(g, x - 5, fy - 60, 10, 55, "#333b45"); R(g, x - 5, fy - 60, 2, 55, "#4f5a66");
    for (var k = fy - 14; k > fy - 58; k -= 10) R(g, x - 5, k, 10, 2, "#20262d");
    R(g, x - 16, fy - 78, 32, 19, "#1a1f25");
    R(g, x - 14, fy - 76, 28, 10, "#173246"); R(g, x - 14, fy - 76, 28, 2, "#5fb3e0");
    R(g, x - 5, fy - 76, 1, 10, "#1a1f25"); R(g, x + 4, fy - 76, 1, 10, "#1a1f25");
    R(g, x - 18, fy - 82, 36, 4, "#0f1216"); R(g, x - 1, fy - 92, 2, 10, "#4f5a66");
    R(g, x - 2, fy - 95, 4, 4, blink ? "#ff3b30" : "#5a1a16");
    g.save(); g.font = "600 8px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var t = "CONTROL TOWER", w = Math.ceil(g.measureText(t).width) + 8;
    g.fillStyle = "rgba(0,0,0,0.78)"; g.fillRect(x - Math.round(w / 2), fy - 111, w, 11);
    g.fillStyle = "#fffaf0"; g.fillText(t, x, fy - 105);
    g.restore();
    return { x: x, fy: fy };
  }
  function drawScreen(g, p) {
    var x0 = p.x + 22, w = 118, lh = 11, top = p.fy - 72, hgt = 12 + ROWS * lh + 4;
    R(g, x0 + 10, top + hgt, 3, p.fy - top - hgt, "#2a2f36"); R(g, x0 + w - 13, top + hgt, 3, p.fy - top - hgt, "#2a2f36");
    R(g, x0 - 2, top - 2, w + 4, hgt + 4, "#14171b"); R(g, x0, top, w, hgt, "#050505");
    g.save(); g.font = "600 7px 'Plex Mono', monospace"; g.textAlign = "left"; g.textBaseline = "middle";
    g.fillStyle = "#a86f00"; g.fillText(HEAD, x0 + 6, top + 7);
    R(g, x0 + 4, top + 12, w - 8, 1, "#3a2600");
    var cw = g.measureText("M").width;
    [5, 11, 17].forEach(function (c) { R(g, Math.round(x0 + 6 + cw * c) - 1, top + 2, 1, hgt - 4, "#7a5200"); });
    var rows_ = S.rows.slice(-ROWS);
    rows_.forEach(function (t, i) {
      var fresh_ = i === rows_.length - 1 && simTime - S.flick < FLICK && Math.floor(simTime * 6) % 2 === 0;
      g.fillStyle = fresh_ ? "#fff1b8" : "#ffb000";
      g.fillText(t, x0 + 6, top + 12 + lh * i + lh / 2 + 2);
    });
    g.restore();
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (var y = top + 1; y < top + hgt; y += 2) g.fillRect(x0, y, w, 1);
  }
  function drawBoard(g) {
    var e = npc("edge");
    if (!e) return;
    drawScreen(g, drawTower(g, e));
  }

  var posed = null;
  function pose(tp) {
    if (!S || posed) return;
    posed = { rows: S.rows, flick: S.flick };
    if (tp === Infinity) { S.flick = -9; return; }
    S.rows = S.rows.filter(function (r, i) { return S.rowT[i] <= tp; });
    var last = S.flickT.filter(function (t) { return t <= tp; }).pop();
    S.flick = last == null ? -9 : simTime - (tp - last);
  }
  function unpose() { if (S && posed) { S.rows = posed.rows; S.flick = posed.flick; posed = null; } }

  BH.edge = {
    pose: pose, unpose: unpose,
    board: function () { return S ? S.rows.slice() : []; },
    info: function () { return S ? { rows: S.rows.length, flicks: S.flicks, helper: S.h.state, kept: S.kept, robbed: S.robbed, flying: S.fly.length } : null; }
  };

  function live() { return !!S && typeof activeFeatures !== "undefined" && activeFeatures.some(function (f) { return f.id === "edge"; }); }
  var wrapped = false;
  function overTrees() {
    var base = window.drawWorld;
    if (wrapped || typeof base !== "function") return;
    wrapped = true;
    window.drawWorld = function () { placed = false; var r = base.apply(this, arguments); if (live() && !placed) drawBoard(ctx); return r; };
  }
  BH.edge.drawBoard = function (g) { if (live()) drawBoard(g); };
  var placed = false;
  BH.edge.spot = function () {
    var e = live() && npc("edge"); if (!e) return null;
    var x = Math.round(e.x), fy = Math.round(e.y + 10);
    return { x0: x - 18, x1: x + 142, top: fy - 111, fy: fy, self: e };
  };
  BH.edge.place = function (g, a) {
    if (!live()) return;
    placed = true; g.globalAlpha = a == null ? 1 : a;
    try { drawBoard(g); } finally { g.globalAlpha = 1; }
  };

  BH.features.register("edge", {
    onLevelStart: function (lv, api) { fresh(api); overTrees(); },
    onStep: function (dt) { if (!S) return; readLog(); stepHelper(dt); stepLose(); },
    onDrawWorld: function (g) { overTrees(); if (!S) return; drawGlow(g); drawFly(g); }
  });
  (window.LEVELS || []).forEach(function (l) { if ((l.features || []).indexOf("edge") < 0) l.features = (l.features || []).concat(["edge"]); });
})();
