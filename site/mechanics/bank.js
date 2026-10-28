(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  if (!BH.tiles || !BH.features) return;

  var NEAR = 3, REMARK = "Two in a row? Could be the same owner.";
  var S = null, key = null;

  function R(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(x, y, w, h); }
  function on() { return !!(L && L.bank); }
  function fresh() {
    S = { planks: [], bag: [], seen: coins ? coins.map(function (c) { return !!c.got; }) : null, wasIn: player ? player.inShield : false, lastLand: null,
      lastIn: null, remarks: 0, ins: 0, outs: 0 };
  }
  function sync() {
    if (grid !== key) { key = grid; fresh(); }
    if (typeof activeFeatures !== "undefined" && !activeFeatures.some(function (f) { return f.id === "bank"; })) {
      var api = Object.create(featureApi); api.id = "bank"; api.state = {};
      activeFeatures.push({ id: "bank", def: BH.features.get("bank"), api: api });
    }
    return S;
  }
  function stamps() {
    if (BH.stamps && typeof BH.stamps.count === "function") { var n = BH.stamps.count(); if (typeof n === "number") return n; }
    return Math.floor(featureApi.time / ((BH.stamps && BH.stamps.beat) || 2.5));
  }
  function watcher() {
    var v = featureApi.markers.V;
    if (!v || !v.length) return null;
    var best = v[0], d = 1e9;
    v.forEach(function (m) { var e = Math.hypot((m.tx + 0.5) * T - player.x, (m.ty + 0.5) * T - player.y); if (e < d) { d = e; best = m; } });
    return { x: (best.tx + 0.5) * T, y: (best.ty + 0.5) * T, topY: best.ty * T - 4 };
  }
  function pileOf(c) {
    if (c.machine) return c.machine;
    var p = L.piles; if (!p) return null;
    var tx = Math.floor(c.x / T), ty = Math.floor(c.y / T);
    for (var k in p) { var r = p[k]; if (tx >= r[0] && tx <= r[2] && ty >= r[1] && ty <= r[3]) return k; }
    return null;
  }
  function pileCentre(k) {
    var at = L.machines && L.machines[k]; if (at) return { x: (at[0] + 0.5) * T, y: (at[1] + 0.5) * T };
    var r = L.piles[k]; return { x: ((r[0] + r[2]) / 2 + 0.5) * T, y: ((r[1] + r[3]) / 2 + 0.5) * T };
  }

  var PAY_R = 1.3, PAY_GAP = 0.55, FLY = 0.3, BOX = "ŵ", M = [];
  function machinesStart() {
    M = [];
    if (!L.machines || !coins) return;
    Object.keys(L.machines).forEach(function (k) {
      var at = L.machines[k], m = { k: k, tx: at[0], ty: at[1], x: (at[0] + 0.5) * T, y: (at[1] + 0.5) * T, coins: [], next: 0, near: false, fly: null, paid: -9 };
      coins.forEach(function (c) { if (!c.got && pileOf(c) === k) { c.got = true; c.machine = k; m.coins.push(c); } });
      featureApi.setTile(at[0], at[1], BOX);
      M.push(m);
    });
  }
  function payOne(m) {
    m.fly = { c: m.coins.shift(), t0: simTime }; m.paid = simTime;
    puff(m.x, m.y + 4, 5, "rgba(255,214,90,0.7)", 16);
    if (typeof sfx === "function") sfx("click");
  }
  function askOf() { return M.filter(function (m) { return m.ask; })[0] || null; }
  function take(all) {
    var m = askOf(); if (!m) return false;
    m.want = all ? m.coins.length : 1; m.ask = false;
    return true;
  }
  function machinesStep() {
    M.forEach(function (m) {
      var d = Math.hypot(player.x - m.x, player.y - m.y);
      if (m.fly) {
        if (simTime - m.fly.t0 < FLY) return;
        var c = m.fly.c; c.x = player.x; c.y = player.y; c.got = false; m.fly = null; m.next = simTime + (L.takeAsk ? 0.15 : PAY_GAP);
      }
      if (L.takeAsk) {
        var by = d <= T * PAY_R && !player.inShield && game.phase === "play";
        if (!by || !m.coins.length) m.want = 0;
        m.ask = by && m.coins.length > 0 && !m.want;
        if (m.ask && !m.asked && typeof sfx === "function") sfx("ask");
        m.asked = m.ask;
        if (m.want > 0 && simTime >= m.next) { m.want--; payOne(m); }
        return;
      }
      var moved = m.lx == null ? 0 : Math.hypot(player.x - m.lx, player.y - m.ly);
      m.lx = player.x; m.ly = player.y;
      var near = d <= T * PAY_R && !player.inShield && moved < 0.3;
      if (near && !m.near) m.next = Math.max(m.next, simTime + 0.3);
      m.near = near;
      if (!near || !m.coins.length || game.phase !== "play" || simTime < m.next) return;
      payOne(m);
    });
  }
  function askBox(g, cx, y, text, k) {
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var label = TOUCH ? "TAP: " + text : text, kw = TOUCH ? 0 : 16, tw = g.measureText(label).width, w = tw + 14 + (kw ? kw + 6 : 0), x0 = cx - w / 2;
    var pulse = 0.5 + 0.5 * Math.sin(simTime * 5);
    g.fillStyle = "rgba(0,0,0,0.82)"; g.fillRect(x0, y - 11, w, 22);
    g.strokeStyle = C.gold; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y - 10.5, w - 1, 21);
    if (kw) {
      var kx = x0 + 5, ky = y - 8, dn = pulse > 0.85 ? 1 : 0;
      g.fillStyle = "#8a5e10"; g.fillRect(kx, ky + 2, kw, 15);
      g.fillStyle = C.gold; g.fillRect(kx, ky + dn, kw, 14);
      g.fillStyle = "#1f130a"; g.font = "800 10px 'Plex Mono', monospace"; g.fillText(k, kx + kw / 2, ky + 7 + dn);
      g.font = "700 9px 'Plex Mono', monospace";
    }
    g.fillStyle = C.gold; g.textAlign = "left"; g.fillText(label, x0 + 7 + (kw ? kw + 6 : 0), y);
    g.restore();
    return { x: x0 + w / 2, y: y, w: w, h: 22 };
  }
  function drawTake(g, m) {
    m.boxes = null;
    if (!m.ask) return;
    var y = m.y + T * 1.05;
    m.boxes = [askBox(g, m.x, y, "TAKE 1 ZEC", "E")];
    if (m.coins.length > 1) m.boxes.push(askBox(g, m.x, y + 26, "TAKE ALL " + m.coins.length + " ZEC", "Q"));
  }
  function drawMachine(g, m) {
    var col = m.k === "A" ? "#7fd8ff" : "#a8e6a0", n = m.coins.length;
    var sh = simTime - m.paid < 0.2 ? Math.round(Math.sin((simTime - m.paid) * 60)) : 0, x = m.tx * T + sh, y = m.ty * T;
    g.save();
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(x + T / 2, y + T - 2, 13, 4, 0, 0, 6.283); g.fill();
    R(g, x + 5, y + 1, 22, 30, "#1f130a"); R(g, x + 6, y + 2, 20, 28, "#4a5562"); R(g, x + 6, y + 2, 20, 3, "#6b7886");
    R(g, x + 6, y + 18, 20, 2, col);
    R(g, x + 9, y + 6, 14, 10, "#0d1a12");
    R(g, x + 10, y + 23, 12, 5, "#1b1b1b");
    if (n) { R(g, x + 14, y + 22, 4, 3, C.goldDim); R(g, x + 15, y + 22, 2, 2, C.gold); }
    g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = n ? col : "rgba(255,250,240,0.35)"; g.fillText(String(n), x + T / 2, y + 11.5);
    var text = "ADDRESS " + m.k, w = g.measureText(text).width + 14, ly = y - 11;
    g.fillStyle = "#2a1a0e"; g.fillRect(x + T / 2 - w / 2 - 1, ly - 9, w + 2, 18); g.fillStyle = "#8a6038"; g.fillRect(x + T / 2 - w / 2, ly - 8, w, 16);
    g.fillStyle = col; g.fillRect(x + T / 2 - w / 2, ly + 6, w, 2);
    g.fillStyle = "#fffaf0"; g.fillText(text, x + T / 2, ly);
    if (m.fly) {
      var t = Math.min(1, (simTime - m.fly.t0) / FLY), ax = m.x, ay = m.y + 8, bx = player.x, by = player.y - 8;
      var cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t - Math.sin(t * Math.PI) * 18;
      R(g, cx - 4, cy - 4, 8, 8, C.goldDim); R(g, cx - 3, cy - 3, 6, 6, C.gold);
    }
    g.restore();
  }

  function plank(x, y, text) {
    sync();
    var tx = Math.floor(x / T), ty = Math.floor(y / T);
    S.planks = S.planks.filter(function (p) { return Math.abs(p.tx - tx) > 1 || Math.abs(p.ty - ty) > 1; });
    var p = { x: (tx + 0.5) * T, y: (ty + 0.5) * T, tx: tx, ty: ty, text: String(text).toUpperCase(), stack: 0, t0: simTime };
    S.planks.push(p);
    puff(p.x, p.y + 6, 8, "rgba(255,250,240,0.6)", 26);
    if (typeof sfx === "function") sfx("gate");
    return p;
  }
  function link(ax, ay, bx, by, why) {
    sync();
    return featureApi.link(why || "SAME OWNER", ax, ay, bx, by, { rush: false });
  }
  function redLines() { return links; }
  var posed = null;
  function pose(tp) {
    if (!S || posed || !S.planks.length) return;
    var ts = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state, pr = (ts && ts.prec) || [];
    posed = S.planks;
    S.planks = posed.filter(function (p) {
      if (tp === Infinity) return true;
      var wet = !/^OUT/.test(p.text), at = p.t0;
      for (var i = 0; i < pr.length; i++) if (pr[i].t >= p.t0 && !!pr[i].w === wet) { at = pr[i].t; break; }
      return tp >= at;
    }).map(function (p) { var q = {}; for (var k in p) q[k] = p[k]; q.t0 = -1e9; return q; });
  }
  function unpose() { if (S && posed) { S.planks = posed; posed = null; } }

  function seen(n) { if (typeof floatText === "function") floatText(player.x, player.y + 46, "EVERYONE SEES " + n + " ZEC", C.gold, "", 1.5); }
  function quiet() {
    return !!(S && on() && (featureApi.markers.V || []).length && S.lastWet && !watched(S.lastWet[0], S.lastWet[1]));
  }
  function entered() {
    if (quiet()) return;
    mark("?", 1.6);
    var n = player.carry, at = S.lastLand || { x: player.x, y: player.y };
    alert(at, S.lastWet);
    if (n <= 0) { S.bag = []; return; }
    plank(at.x, at.y, "IN · " + n + " ZEC");
    seen(n);
    S.ins++;
    var st = stamps();
    if (L.amountLink !== false && S.lastIn != null && st - S.lastIn <= NEAR) {
      var ts = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state, w = watcher() || (ts && ts.elders || []).filter(function (e) { return e.id === "oak"; })[0];
      if (w && BH.talk && BH.talk.bubble) { BH.talk.bubble(w, REMARK, 3.4); S.remarks++; }
    }
    S.lastIn = st;
    var held = S.bag.slice(-n), piles = held.filter(function (k, i) { return k && held.indexOf(k) === i; });
    for (var i = 1; i < piles.length; i++) { var a = pileCentre(piles[i - 1]), b = pileCentre(piles[i]); link(a.x, a.y, b.x, b.y, "SAME OWNER"); }
    S.bag = [];
  }
  function mark(ch, secs) { S.mark = { ch: ch, t0: simTime, life: secs }; }
  function watched(tx, ty) {
    var V = featureApi.markers.V || [];
    if (!S.wet || S.wetN !== V.length) {
      S.wet = {}; S.wetN = V.length;
      var q = [];
      V.forEach(function (m) { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { q.push([m.tx + d[0], m.ty + d[1]]); }); });
      while (q.length) {
        var p = q.pop(), k = p[0] + "," + p[1];
        if (S.wet[k] || p[0] < 0 || p[1] < 0 || p[0] >= cols || p[1] >= rows || !isWater(tile(p[0], p[1]))) continue;
        S.wet[k] = true;
        q.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]);
      }
    }
    return !!S.wet[tx + "," + ty];
  }
  function alert(at, wet) {
    if (!(featureApi.markers.V || []).length || typeof hunters === "undefined") return;
    if (wet && !watched(wet[0], wet[1])) return;
    var free = hunters.filter(function (h) { return h.state === "patrol" || h.state === "return"; });
    if (!free.length) return;
    var h = free.sort(function (a, b) { return Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y); })[0];
    h.state = "check"; h.target = { x: at.x, y: at.y }; h.path = []; h.pathKey = ""; h.checkT = 0;
  }
  function left() {
    if (quiet()) return;
    mark("!", 1.6); alert({ x: player.x, y: player.y }, S.lastWet);
    if (player.carry > 0) { plank(player.x, player.y, "OUT · " + player.carry + " ZEC"); seen(player.carry); S.outs++; }
  }
  function bump() {
    (featureApi.markers.V || []).forEach(function (m) {
      var x = (m.tx + 0.5) * T, y = (m.ty + 0.5) * T, dx = player.x - x, dy = player.y - y, d = Math.hypot(dx, dy), R0 = T * (dy < 0 ? 1.05 : 0.8);
      if (d >= R0) return;
      if (d < 0.01) { dx = 0; dy = 1; d = 1; }
      player.x = x + dx / d * R0; player.y = y + dy / d * R0;
      if (simTime - (S.bumpT || -9) > 2.5) {
        S.bumpT = simTime; mark("!", 1.2);
        if (BH.talk && BH.talk.bubble) BH.talk.bubble({ x: x, y: y, topY: m.ty * T - 4 }, "Hey! Watch where you walk.", 2.4);
      }
    });
  }
  function step() {
    if ((featureApi.markers.V || []).length && typeof game !== "undefined" && game.phase === "play") bump();
    if (!on()) return;
    machinesStep();
    if (!player.inShield) S.lastLand = { x: player.x, y: player.y };
    else if (isWater(tile(Math.floor(player.x / T), Math.floor(player.y / T)))) S.lastWet = [Math.floor(player.x / T), Math.floor(player.y / T)];
    if (player.inShield && !S.wasIn) entered();
    else if (!player.inShield && S.wasIn) left();
    S.wasIn = player.inShield;
    if (!S.seen) S.seen = coins.map(function (c) { return !!c.got; });
    coins.forEach(function (c, i) {
      if (c.got && !S.seen[i] && !player.inShield) S.bag.push(pileOf(c));
      S.seen[i] = !!c.got;
    });
    if (S.bag.length > player.carry) S.bag = S.bag.slice(S.bag.length - player.carry);
  }

  function drawWatcher(g, m) {
    var x = m.tx * T, y = m.ty * T, mk = S && S.mark && simTime - S.mark.t0 < S.mark.life ? S.mark : null;
    var look = player ? Math.max(-1, Math.min(1, Math.round((player.x - (x + T / 2)) / T))) : 0;
    var hop = S && S.bumpT != null && simTime - S.bumpT < 0.35 ? -Math.round(Math.sin((simTime - S.bumpT) / 0.35 * Math.PI) * 5) : 0;
    y += hop;
    R(g, x + 7, y + 22, 18, 8, "#4e3520"); R(g, x + 7, y + 22, 18, 2, "#8a6a44"); R(g, x + 10, y + 23, 12, 1, "#6b4a2e");
    R(g, x + 11, y + 12, 10, 11, "#2c3a4a"); R(g, x + 12, y + 13, 8, 9, "#3d5066");
    R(g, x + 12, y + 4, 8, 8, "#c99a6b"); R(g, x + 11, y + 3, 10, 3, "#3a2a1a");
    R(g, x + 14 + look, y + 7, 2, 2, "#13202c"); R(g, x + 18 + look, y + 7, 2, 2, "#13202c");
    R(g, x + 21, y + 14, 3, 7, "#5a6470"); R(g, x + 20, y + 13, 5, 3, "#7d8890");
    g.save(); g.font = "700 8px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(x + T / 2 - 22, y - 9, 44, 10); g.fillStyle = "#fffaf0"; g.fillText("WATCHER", x + T / 2, y - 4);
    if (mk) { g.font = "700 13px 'Plex Mono', monospace"; g.fillStyle = mk.ch === "!" ? C.red : C.gold; g.fillText(mk.ch, x + T / 2, y - 18 + Math.sin(simTime * 10) * 1.5); }
    g.restore();
  }
  function drawPlank(g, p, board) {
    if (board) return;
    var out = /^OUT/.test(p.text), col = out ? "#f0a040" : "#5fd07a", amt = (p.text.match(/\d+\s*ZEC/) || [""])[0];
    var cx = Math.round(p.x), cy = Math.round(p.y + 8), a = Math.min(1, (simTime - p.t0) / 0.25);
    g.save(); g.globalAlpha = 0.85 * a;
    g.fillStyle = "rgba(0,0,0,0.45)"; g.beginPath(); g.ellipse(cx, cy, 24, 8, 0, 0, 6.283); g.fill();
    g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, 24, 8, 0, 0, 6.283); g.stroke();
    g.fillStyle = col; g.beginPath();
    if (out) { g.moveTo(cx - 17, cy + 3); g.lineTo(cx - 12, cy - 4); g.lineTo(cx - 7, cy + 3); }
    else { g.moveTo(cx - 17, cy - 3); g.lineTo(cx - 12, cy + 4); g.lineTo(cx - 7, cy - 3); }
    g.fill();
    g.font = "700 8px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(amt, cx + 5, cy + 1);
    g.restore();
  }
  function drawWorldBank(g) {
    (featureApi.markers.V || []).forEach(function (m) { drawWatcher(g, m); });
    M.forEach(function (m) { drawMachine(g, m); });
    S.planks.forEach(function (p) { drawPlank(g, p, false); });
  }
  function drawWarn(g) {
    var held = !player.inShield && player.carry > 0 && game.phase === "play" ? S.bag.slice(-player.carry) : [], piles = held.filter(function (k, i) { return k && held.indexOf(k) === i; });
    if (piles.length < 2) return;
    var sx = function (p) { return { x: (p.x - view.x0) * zoom, y: (p.y - view.y0) * zoom }; };
    g.save(); g.lineCap = "round"; g.setLineDash([8, 7]); g.lineDashOffset = -simTime * 30;
    for (var i = 1; i < piles.length; i++) {
      var a = sx(pileCentre(piles[i - 1])), b = sx(pileCentre(piles[i]));
      if (a.y > b.y) { var t = a; a = b; b = t; }
      a.y += 20 * zoom; b.y -= 38 * zoom;
      if (b.y <= a.y) continue;
      g.globalAlpha = 0.6; g.strokeStyle = "#000"; g.lineWidth = 6; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      g.globalAlpha = 0.75 + 0.25 * Math.sin(simTime * 5); g.strokeStyle = C.string; g.lineWidth = 3; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    g.restore();
  }
  function drawOver(g) {
    drawWarn(g);
  }

  var I = null, introSeen = {}, CHASE = "char-033", FROM = [9, 6], TO = [20, 6], VIEW = [7.5, 29];
  var SAY = [["oak", "See? In the waters he can't tell who it is. It's safe in there."]];
  function TS() { return BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state; }
  function tc(x, y) { return { x: (x + 0.5) * T, y: (y + 0.5) * T }; }
  function wet(x, y) { var c = (grid[Math.floor(y / T)] || [])[Math.floor(x / T)]; return typeof isWater === "function" ? isWater(c) : c === "~"; }
  function toward(o, p, v, dt) {
    var dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy), s = v * T * dt;
    if (d > 0.01) o.dir = Math.atan2(dy, dx);
    if (d <= s) { o.x = p.x; o.y = p.y; return true; }
    o.x += dx / d * s; o.y += dy / d * s; return false;
  }
  function introWatch() {
    var ts = TS();
    if (!ts || !L || L.tid !== "bank" || I || introSeen[L.tid]) return;
    var r = ts.tour && ts.tour.ride, prev = r && r.marks[r.i - 1];
    if (prev && prev.key === "river" && !r.talking && !r.lab && !(BH.talk && BH.talk.isOpen())) introStart(ts.tour);
  }
  function introStart(tour) {
    var h = (typeof hunters !== "undefined" ? hunters : []).filter(function (q) { return (q.type || "hunter") === "hunter"; })[0];
    if (!h || !S) return false;
    introSeen[L.tid] = true;
    if (tour) {
      var f = tc(FROM[0], FROM[1]);
      I = { t0: simTime, last: simTime, h: h, b: { x: f.x, y: f.y, a: 0, moving: false, gone: false, side: 1 }, steps: [], beat: "zoom", said: false,
        tour: tour, z0: tour.z, at0: { x: tour.at.x, y: tour.at.y }, acc: 0 };
      tour.ride.talking = true; tour.ride.vx = tour.ride.vy = 0;
      I.hold = { key: "bankscene", get: function () { return tour.at; } }; tour.ride.marks.splice(tour.ride.i, 0, I.hold);
      I.wasFrozen = tour.frozen.indexOf(h) >= 0; if (!I.wasFrozen) tour.frozen.push(h);
      return true;
    }
    var keep = {}; Object.keys(h).forEach(function (k) { keep[k] = h[k]; });
    var b = tc(11, 8);
    I = { t0: simTime, last: simTime, h: h, keep: keep, b: { x: b.x, y: b.y, a: Math.PI, moving: false, gone: false, side: 1 }, steps: [], beat: "chase", cam: window.camFocus, said: false };
    h.x = tc(7, 8).x; h.y = b.y; h.dir = 0; h.state = "chase"; h.sus = 1;
    window.camFocus = function () {
      if (!I) return null;
      var vw = W / (zoom || 1), cx = I.beat === "home" ? I.b.x : (I.b.x + I.h.x) / 2;
      return { x: Math.max(vw / 2, Math.min(cols * T - vw / 2, cx)), y: I.b.y };
    };
    game.phase = "talk"; document.body.classList.add("trail-cine");
    if (typeof sfx === "function") sfx("spotted");
    return true;
  }
  function introEnd() {
    if (!I) return;
    var c = I; I = null;
    var h = c.h;
    if (BH.talk && BH.talk.isOpen()) BH.talk.reset();
    if (c.tour) {
      var r = c.tour.ride, fi = c.tour.frozen.indexOf(h), hi = r.marks.indexOf(c.hold);
      if (hi >= 0) r.marks.splice(hi, 1);
      if (!c.wasFrozen && fi >= 0) c.tour.frozen.splice(fi, 1);
      if (h.state !== "patrol" && h.state !== "return") { h.state = "return"; h.path = []; h.pathKey = ""; }
      h.sus = 0; h.caughtHow = null; h.pursuit = null; h.seen = null;
      c.tour.z = c.z0;
      r.talking = false; r.near = 0; r.anchor = null; r.shut = performance.now() / 1000;
      return;
    }
    Object.keys(c.keep).forEach(function (k) { h[k] = c.keep[k]; });
    window.camFocus = c.cam;
    document.body.classList.remove("trail-cine");
    if (typeof levelStart === "number") levelStart += simTime - c.t0;
    if (game.phase === "talk") game.phase = "play";
  }
  function huntStep(c, dt) {
    if (typeof stepHunter !== "function") return;
    var p = player, b = c.b, keep = { x: p.x, y: p.y, inShield: p.inShield, inBush: p.inBush, sprinting: p.sprinting, seen: p.seenThisLevel, combo: p.combo },
      st = typeof stats !== "undefined" && stats ? { acq: stats.acq, trans: stats.trans } : null;
    c.acc = Math.min(0.1, c.acc + dt);
    if (b.gone) { p.x = -1e5; p.y = -1e5; } else { p.x = b.x; p.y = b.y; }
    p.inShield = !b.gone && wet(b.x, b.y); p.inBush = false; p.sprinting = false;
    try { while (c.acc >= 1 / 60) { c.acc -= 1 / 60; stepHunter(c.h, 1 / 60); } }
    finally {
      p.x = keep.x; p.y = keep.y; p.inShield = keep.inShield; p.inBush = keep.inBush; p.sprinting = keep.sprinting; p.seenThisLevel = keep.seen; p.combo = keep.combo;
      if (st) { stats.acq = st.acq; stats.trans = st.trans; }
    }
  }
  function ease(q) { q = Math.max(0, Math.min(1, q)); return q * q * (3 - 2 * q); }
  function tourStep(c, dt) {
    var b = c.b, h = c.h, tr = c.tour, now = simTime;
    var base = (zoom || 1) / (tr.z || 1), zt = W / ((VIEW[1] - VIEW[0]) * T) / base;
    var vy = Math.max(3.5 * T, Math.min((rows - 3.5) * T, (h.y + (FROM[1] + 0.5) * T) / 2));
    c.vy = c.vy == null ? vy : c.vy + (vy - c.vy) * Math.min(1, dt * 2.5);
    var view = { x: (VIEW[0] + VIEW[1]) / 2 * T, y: c.vy };
    var e = ease((now - c.t0) / 1.5);
    tr.z = c.z0 + (zt - c.z0) * e; tr.at = { x: c.at0.x + (view.x - c.at0.x) * e, y: c.at0.y + (view.y - c.at0.y) * e };
    huntStep(c, dt);
    if (c.beat === "zoom") {
      if (e >= 1) { c.beat = "wait"; c.waitAt = now; }
    } else if (c.beat === "wait") {
      var top = h.state === "patrol" && h.wp === 1 && h.y < 2.6 * T;
      if ((top && now - c.waitAt > 0.4) || now - c.waitAt > 14) { c.beat = "walk"; c.walkAt = now; }
    } else if (c.beat === "walk") {
      var wasWet = wet(b.x, b.y), sp = h.state === "chase" ? 3.6 : 2.2;
      b.moving = true; toward(b, tc(TO[0] + 2, TO[1]), sp, dt); b.a = 0;
      if (!wasWet && wet(b.x, b.y)) {
        puff(b.x, b.y + 6, 14, "rgba(190,235,255,0.85)", 40); if (typeof ring === "function") ring(b.x, b.y, "rgba(190,235,255,0.8)", T, 0.5); if (typeof sfx === "function") sfx("splash");
        c.beat = "lost"; c.lostAt = now;
      }
      if (!wet(b.x, b.y)) { var l = c.steps[c.steps.length - 1]; if (!l || Math.hypot(b.x - l.x, b.y - l.y) > T * 0.35) { b.side = -b.side; c.steps.push({ x: b.x, y: b.y + 8 + b.side * 3 }); } }
    } else if (c.beat === "lost") {
      b.moving = !toward(b, tc(TO[0] + 2, TO[1]), 2.2, dt);
      if ((now - c.lostAt > 1.6 && h.state !== "chase") || now - c.lostAt > 6) { c.beat = "talk"; BH.talk.open(SAY, function () { if (I) { I.beat = "home"; I.said = true; I.homeAt = simTime; } }); }
    } else if (c.beat === "home") {
      if (!b.gone) {
        var den = dens ? { x: dens.x, y: dens.y } : tc(27, 9), mid = { x: den.x - T * 1.6, y: den.y };
        b.moving = true;
        if (!b.pastMid) b.pastMid = toward(b, mid, 2.6, dt);
        else if (toward(b, den, 2.6, dt)) { b.gone = true; puff(den.x, den.y, 14, "rgba(234,186,73,0.9)", 36); if (typeof ring === "function") ring(den.x, den.y, C.gold, T * 1.4, 0.5); if (typeof sfx === "function") sfx("coin"); }
        b.a = Math.cos(b.dir) < 0 ? Math.PI : 0;
      }
      if ((b.gone && now - c.homeAt > 0.8) || now - c.homeAt > 8) introEnd();
    }
  }
  function introStep() {
    var c = I, b = c.b, h = c.h, t = simTime - c.t0, dt = Math.min(0.05, Math.max(0, simTime - c.last));
    c.last = simTime;
    if (c.tour) {
      var ts = TS();
      if (!ts || ts.tour !== c.tour) { introEnd(); return; }
      tourStep(c, dt); return;
    }
    h.step = (h.step || 0) + dt * 12;
    if (c.beat === "chase") {
      b.moving = t > 0.35;
      if (b.moving) {
        var wasWet = wet(b.x, b.y);
        toward(b, tc(22, 8), 4.6, dt); b.a = 0;
        if (!wasWet && wet(b.x, b.y)) { puff(b.x, b.y + 6, 14, "rgba(190,235,255,0.85)", 40); if (typeof ring === "function") ring(b.x, b.y, "rgba(190,235,255,0.8)", T, 0.5); if (typeof sfx === "function") sfx("splash"); }
        if (!wet(b.x, b.y)) { var l = c.steps[c.steps.length - 1]; if (!l || Math.hypot(b.x - l.x, b.y - l.y) > T * 0.35) { b.side = -b.side; c.steps.push({ x: b.x, y: b.y + 8 + b.side * 3 }); } }
      }
      var edge = tc(19, 8).x + T * 0.2;
      if (h.x < edge) toward(h, { x: edge, y: h.y }, 4, dt);
      if (wet(b.x, b.y) && h.x >= edge - 1) { c.beat = "lost"; c.lostAt = simTime; h.state = "search"; h.sus = 0; }
    } else if (c.beat === "lost") {
      b.moving = !toward(b, tc(22, 8), 4.6, dt);
      var lt = simTime - c.lostAt;
      h.dir = lt < 0.5 ? 0 : lt < 1 ? -Math.PI / 2 : lt < 1.5 ? Math.PI / 2 : 0;
      if (lt > 1.8) { c.beat = "talk"; BH.talk.open(SAY, function () { if (I) { I.beat = "home"; I.said = true; I.homeAt = simTime; } }); }
    } else if (c.beat === "home") {
      h.state = "patrol";
      toward(h, { x: c.keep.x, y: c.keep.y }, 3, dt);
      if (!b.gone) {
        var den = dens ? { x: dens.x, y: dens.y } : tc(27, 9), mid = { x: den.x - T * 1.6, y: den.y };
        b.moving = true;
        if (!b.pastMid) b.pastMid = toward(b, mid, 3.4, dt);
        else if (toward(b, den, 3.4, dt)) { b.gone = true; puff(den.x, den.y, 14, "rgba(234,186,73,0.9)", 36); if (typeof ring === "function") ring(den.x, den.y, C.gold, T * 1.4, 0.5); if (typeof sfx === "function") sfx("coin"); }
        b.a = Math.cos(b.dir) < 0 ? Math.PI : 0;
      }
      if ((b.gone && simTime - c.homeAt > 0.6) || simTime - c.homeAt > 6) introEnd();
    }
  }
  function introDraw(g) {
    var c = I, b = c.b;
    g.save();
    c.steps.forEach(function (p) { g.fillStyle = "rgba(234,186,73,0.7)"; g.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 1, 4, 3); });
    g.restore();
    if (b.gone) return;
    var inW = wet(b.x, b.y);
    if (inW) {
      g.save(); g.strokeStyle = "rgba(190,235,255,0.6)"; g.lineWidth = 1.5;
      var r = 10 + ((simTime * 14) % 8);
      g.beginPath(); g.ellipse(b.x, b.y + 9, r, r * 0.35, 0, 0, 6.283); g.stroke(); g.restore();
    }
    var face = c.beat === "lost" && !b.moving ? "left" : Math.cos(b.a) < 0 ? "left" : "right";
    drawBitfoot(b.x, b.y + 10, face, b.moving ? "walk" : "idle", simTime - c.t0, inW ? 0.55 : 1, { char: CHASE });
    if (c.beat === "chase" && simTime - c.t0 < 1.2) {
      g.save(); g.font = "600 16px 'Plex Cond', sans-serif"; g.textAlign = "center"; g.fillStyle = C.red;
      g.fillText("!", b.x, b.y - 22 + Math.sin(simTime * 10) * 1.5); g.restore();
    }
  }
  function introSkip(e) {
    if (!I || (BH.talk && BH.talk.isOpen())) return;
    e.preventDefault(); e.stopImmediatePropagation(); introEnd();
  }
  addEventListener("keydown", introSkip, true);
  addEventListener("pointerdown", introSkip, true);

  BH.bank = {
    intro: {
      start: function () { if (I) return true; return introStart(); },
      skip: function () { introEnd(); },
      state: function () { return I ? { beat: I.beat, b: { x: I.b.x, y: I.b.y, wet: wet(I.b.x, I.b.y), gone: I.b.gone }, h: { x: I.h.x, y: I.h.y, state: I.h.state }, said: I.said, steps: I.steps.length } : null; }
    },
    redLines: redLines, plank: plank, link: link, pose: pose, unpose: unpose, quiet: quiet,
    machines: function () { return M.map(function (m) { return { k: m.k, tx: m.tx, ty: m.ty, left: m.coins.length, flying: !!m.fly, ask: !!m.ask, want: m.want || 0 }; }); },
    take: take,
    info: function () {
      sync();
      return { planks: S.planks.map(function (p) { return { tx: p.tx, ty: p.ty, text: p.text }; }), bag: S.bag.slice(), remarks: S.remarks, ins: S.ins, outs: S.outs };
    }
  };

  var baseMove = window.movePlayer;
  if (typeof baseMove === "function") window.movePlayer = function () { if (on()) sync(); return baseMove.apply(this, arguments); };

  var baseDrawWorld = window.drawWorld;
  if (typeof baseDrawWorld === "function") window.drawWorld = function () {
    baseDrawWorld.apply(this, arguments);
    if (S && S.planks.length && typeof activeFeatures !== "undefined" && activeFeatures.some(function (f) { return f.id === "bank"; }))
      S.planks.forEach(function (p) { drawPlank(ctx, p, true); });
    if (L && L.takeAsk && typeof liveFrame !== "undefined" && liveFrame) M.forEach(function (m) { drawTake(ctx, m); });
  };

  addEventListener("keydown", function (e) {
    if (e.repeat || !(L && L.takeAsk)) return;
    var all = e.code === "KeyQ" || e.key === "q" || e.key === "Q";
    if ((all || e.code === "KeyE" || e.key === "e" || e.key === "E") && take(all)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  addEventListener("pointerdown", function (e) {
    var m = L && L.takeAsk && askOf(); if (!m || !m.boxes || !zoom || typeof cam === "undefined") return;
    var vw = W / zoom, vh = H / zoom, cx = clampCam(cam.x, vw, cols * T), cy = clampCam(cam.y, vh, rows * T);
    var r = e.target && e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : { left: 0, top: 0 }, x = e.clientX - r.left, y = e.clientY - r.top;
    m.boxes.some(function (b, i) {
      var sx = W / 2 + (b.x - cx) * zoom, sy = H / 2 + (b.y - cy) * zoom;
      if (Math.abs(x - sx) < b.w * zoom / 2 + 8 && Math.abs(y - sy) < b.h * zoom / 2 + 4 && take(i === 1)) { e.preventDefault(); e.stopImmediatePropagation(); return true; }
      return false;
    });
  }, true);

  BH.features.register("bank", {
    onLevelStart: function () {
      if (I) { window.camFocus = I.cam; I = null; document.body.classList.remove("trail-cine"); }
      key = grid; machinesStart(); fresh(); sync();
    },
    onStep: function () { sync(); step(); },
    onDrawWorld: function (g) {
      sync(); if (on() || (featureApi.markers.V || []).length) drawWorldBank(g);
      if (game.screen !== "play") return;
      introWatch();
      if (I) { introStep(); if (I) introDraw(g); }
      else if (L && L.tid === "bank" && !introSeen[L.tid] && TS() && TS().tour) { var f = tc(FROM[0], FROM[1]); drawBitfoot(f.x, f.y + 10, "right", "idle", simTime, 1, { char: CHASE }); }
    },
    onDrawOver: function (g) { sync(); drawOver(g); }
  });
  (window.LEVELS || []).forEach(function (l) { if ((l.features || []).indexOf("bank") < 0) l.features = (l.features || []).concat(["bank"]); });

  BH.tiles.register("V", { marker: true, base: ".", claim: "bank" });
  BH.tiles.register(BOX, { solid: true, claim: "bank" });
})();
