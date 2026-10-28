"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.tiles) return;

  var TWIG = "†";
  var WAKE_R = 4.5, WAKE_NEAR = 0.55, WAKE_FAR = 0.1, SPRINT_X = 2.2, BUSH_X = 0.5, DRAIN = 0.18;
  var DRAIN_AWAY = 0.45, AWAY_V = 0.6, SIDE_X = 0.35, FRIEND_X = 0.6;
  var STARTLE = 0.55, GROGGY = 3, GROGGY_SP = 0.6, GROGGY_VIS = 1.6, DAZE = 2, BUMP_R = 0.62, BUMP_CLOSE = 1.05, BUMP_COOL = 4;
  var SHOW_K = 12, LEAN = 0.09, KNOCK = 0.3, PUSH = 9;
  var st = null, lastMeter = null;

  function on() { return !!st && typeof L !== "undefined" && st.level === L; }
  function snd(n, o) { try { if (typeof sfx === "function") sfx(n, o); } catch (e) {} }
  function now() { return simTime; }
  function walker(h) { return h.type !== "dog"; }

  function wake(h, ai) {
    var g = h.fg; if (!g || g.mode !== "sleep") return;
    g.mode = "startle"; g.t0 = now(); g.ai = !!ai; g.wake = 1;
    snd("suspicion", { level: 1 }); snd("spotted");
    puff(h.x, h.y - 10, 10, "rgba(255,250,240,0.8)", 40);
    floatText(h.x, h.y - 34, "AWAKE", C.red, "", 1.1);
    if (st) st.woke++;
  }
  function bumpMeter(h, amt) {
    var g = h.fg; if (!g || g.mode !== "sleep") return;
    g.wake = Math.min(1, g.wake + amt); g.jolt = now();
    if (g.wake >= 1) wake(h);
  }

  function stepSleeper(h, dt) {
    var g = h.fg;
    if (h.state !== "sleep") { wake(h, true); return; }
    var d = Math.hypot(player.x - h.x, player.y - h.y) / T;
    if (!player.inShield && d < CATCH + 0.35) { g.wake = 1; wake(h); return; }
    var vr = g.pd == null || dt <= 0 ? 0 : (d - g.pd) / dt;
    g.pd = d;
    var near = !player.inShield && player.moving && d < WAKE_R, gain = 0, drain = DRAIN;
    if (near && vr > AWAY_V) drain = DRAIN_AWAY;
    else if (near) {
      var r = WAKE_FAR + (WAKE_NEAR - WAKE_FAR) * (1 - d / WAKE_R);
      if (vr > -AWAY_V) r *= SIDE_X;
      if (player.sprinting) r *= SPRINT_X;
      if (player.inBush) r *= BUSH_X;
      gain = r;
    }
    var ts = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state;
    if (ts && !ts.tour && !ts.cine) (ts.elders || []).forEach(function (e) {
      var de = Math.hypot(e.x - h.x, e.y - h.y) / T;
      if (e.moving && de < WAKE_R && !isWater(tileAt(e.x, e.y))) gain += FRIEND_X * (WAKE_FAR + (WAKE_NEAR - WAKE_FAR) * (1 - de / WAKE_R));
    });
    if (gain > 0) {
      g.wake = Math.min(1, g.wake + gain * dt);
      if (g.wake >= 1) { wake(h); return; }
    } else g.wake = Math.max(0, g.wake - drain * dt);
    g.shown = (g.shown || 0) + (g.wake - (g.shown || 0)) * (1 - Math.exp(-SHOW_K * dt));
    h.dir = Math.PI / 2;
    if (d < 9 && now() - (g.snore || -9) > 2.6) { g.snore = now(); snd("whoosh"); }
  }
  function stepGroggy(h, dt) {
    var g = h.fg;
    if (canSee(h)) { h.fg = null; spotted(h); return; }
    g.turnT -= dt;
    if (g.turnT <= 0) { g.turnT = 0.35 + Math.random() * 0.5; g.head += (Math.random() - 0.5) * 2.4; }
    var sp = GROGGY_SP * T * dt * (0.5 + 0.5 * Math.abs(Math.sin(now() * 5))), nx = h.x + Math.cos(g.head) * sp, ny = h.y + Math.sin(g.head) * sp;
    if (solidH(tileAt(nx + Math.cos(g.head) * 8, ny + Math.sin(g.head) * 8))) g.head += Math.PI * (0.6 + Math.random() * 0.8);
    else { h.x = nx; h.y = ny; h.step += sp; }
    h.dir = g.head + Math.sin(now() * 6) * 0.5;
    if (now() - g.t0 >= GROGGY) {
      h.fg = null; h.state = "search"; h.searchT = 1.5; h.path = []; h.pathKey = ""; h.sus = 0;
    }
  }

  function stepDaze(h, dt) {
    var g = h.fg, k = g.k = g.k + dt;
    if (k >= LEAN && !g.hit) {
      g.hit = true;
      if (g.lead) {
        var o = g.other, mx = (h.x + o.x) / 2, my = (h.y + o.y) / 2 - 10;
        snd("walletLand"); snd("talkNext");
        puff(mx, my, 18, "rgba(255,227,154,0.9)", 60); ring(mx, my, "rgba(255,250,240,0.8)", T * 1.2, 0.35);
        floatText(mx, my - 22, "BONK", "#ffe39a", "", 1.1);
        if (st && st.api) st.api.shake(0.2);
        if (st) st.bumps++;
      }
    }
    if (k > LEAN && k < LEAN + KNOCK) {
      var f = (k - LEAN) / KNOCK, sp = PUSH * 2 * (1 - f) / KNOCK * dt, nx = h.x - g.ux * sp, ny = h.y - g.uy * sp;
      if (!solidH(tileAt(nx - g.ux * 8, ny - g.uy * 8))) { h.x = nx; h.y = ny; }
    }
    h.dir = Math.atan2(g.uy, g.ux);
    if (k >= DAZE) {
      h.fg = null; h.path = []; h.pathKey = ""; h.fgCool = BUMP_COOL;
      if (h.state === "patrol" && h.patrol && h.patrol.length > 1) h.wp = (h.wp + h.patrol.length - 1) % h.patrol.length;
    }
  }
  function bonk(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 0.01) { dx = 1; dy = 0; d = 1; }
    var ux = dx / d, uy = dy / d;
    a.fg = { mode: "daze", k: 0, ux: ux, uy: uy, lead: true, other: b };
    b.fg = { mode: "daze", k: 0, ux: -ux, uy: -uy, other: a };
  }
  function pairCheck(a) {
    if (game.phase !== "play" && game.phase !== "talk") return;
    for (var j = 0; j < hunters.length; j++) {
      var b = hunters[j];
      if (a === b || !walker(a) || !walker(b) || a.fg || b.fg || !a.fgMoved || !b.fgMoved) continue;
      if (a.fgCool > 0 || b.fgCool > 0) continue;
      var d = Math.hypot(b.x - a.x, b.y - a.y), near = a.fgNear || (a.fgNear = {}), was = near[j];
      near[j] = d;
      if (d <= BUMP_R * T || (d <= BUMP_CLOSE * T && was != null && was - d > 0.15)) bonk(a, b);
    }
  }

  var prevStep = window.stepHunter;
  window.stepHunter = function (h, dt) {
    if (!on()) return prevStep(h, dt);
    if (!h.fg) {
      var x0 = h.x, y0 = h.y;
      prevStep(h, dt);
      h.fgMoved = Math.hypot(h.x - x0, h.y - y0) > 0.05;
      if (h.fgCool > 0) h.fgCool -= dt;
    } else {
      var g = h.fg; h.fgMoved = false;
      if (g.mode === "sleep") stepSleeper(h, dt);
      else if (g.mode === "startle") {
        if (now() - g.t0 >= STARTLE) {
          if (g.ai) h.fg = null;
          else { g.mode = "groggy"; g.t0 = now(); g.head = Math.random() * 6.283; g.turnT = 0; h.state = "groggy"; }
        }
      } else if (g.mode === "groggy") stepGroggy(h, dt);
      else if (g.mode === "daze") stepDaze(h, dt);
    }
    pairCheck(h);
  };

  var prevVis = window.visionOf;
  window.visionOf = function (h) { return on() && h && h.fg && h.fg.mode === "groggy" ? GROGGY_VIS : prevVis(h); };

  var prevCones = window.drawCones;
  window.drawCones = function () {
    if (!on()) return prevCones.apply(this, arguments);
    var all = hunters;
    window.hunters = all.filter(function (h) { return !h.fg || (h.fg.mode !== "sleep" && h.fg.mode !== "startle"); });
    try { return prevCones.apply(this, arguments); } finally { window.hunters = all; }
  };

  function zzz(c, x, y, g) {
    for (var i = 0; i < 3; i++) {
      var f = (now() * 0.45 + i / 3) % 1, s = 8 + f * 8;
      c.globalAlpha = Math.min(1, (1 - f) * 1.6) * 0.95;
      c.font = "600 " + Math.round(s) + "px 'Plex Cond', sans-serif"; c.textAlign = "center"; c.textBaseline = "alphabetic";
      c.lineWidth = 3; c.strokeStyle = "rgba(12,20,40,0.9)";
      var zx = x + 12 + f * 16 + Math.sin(f * 7 + i) * 3, zy = y + 4 - f * 30;
      c.strokeText("Z", zx, zy); c.fillStyle = C.ice; c.fillText("Z", zx, zy);
    }
    c.globalAlpha = 1;
  }
  function meter(c, x, y, v, jolt) {
    var w = 36, bh = 5, sh = Math.sin(now() * 40) * 1.5 * jolt;
    x = Math.round(x + sh); y = Math.round(y);
    var x0 = x - w / 2, fw = v > 0.004 ? Math.max(1, w * v) : 0;
    c.fillStyle = "#1f130a"; c.fillRect(x0 - 2, y - 4, w + 4, bh + 4);
    c.fillStyle = "#5a3d24"; c.fillRect(x0, y - 2, w, bh);
    c.fillStyle = v > 0.66 ? C.red : v > 0.33 ? "#f0a060" : C.gold; c.fillRect(x0, y - 2, fw, bh);
    c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(x0, y - 2, fw, 1);
    c.fillStyle = "#1f130a"; c.fillRect(x0 + Math.round(w / 3), y - 2, 1, bh); c.fillRect(x0 + Math.round(w * 2 / 3), y - 2, 1, bh);
    c.font = "600 9px 'Plex Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 3; c.strokeStyle = "rgba(12,20,40,0.9)"; c.strokeText("WAKE", x, y - 10);
    c.fillStyle = "#fff3c4"; c.fillText("WAKE", x, y - 10);
    var m = c.getTransform ? c.getTransform() : { a: 1, d: 1, e: 0, f: 0 };
    lastMeter = { v: v, sx: m.a * x + m.e, sy: m.d * y + m.f, wPx: Math.round(w * m.a), fillPx: Math.round(fw * m.a) };
  }
  function star(c, x, y, r) {
    c.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.4 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }

  var prevDraw = window.drawHunter;
  window.drawHunter = function (h) {
    if (!on() || !h.fg) return prevDraw.apply(this, arguments);
    var g = h.fg, c = ctx, fx = h.x, fy = h.y + 9, t = g.mode === "daze" ? g.k : now() - g.t0;
    c.save();
    if (g.mode === "sleep") { c.translate(fx, fy); c.rotate(0.14 + Math.sin(now() * 1.6) * 0.04); c.translate(-fx, -fy); }
    else if (g.mode === "startle") c.translate(0, -Math.sin(Math.min(1, t / STARTLE) * Math.PI) * 11);
    else if (g.mode === "groggy") { c.translate(fx, fy); c.rotate(Math.sin(now() * 7) * 0.24); c.translate(-fx, -fy); }
    else if (g.mode === "daze") {
      var rot, lx = 0, ly = 0, sq = 1;
      if (t < LEAN) { var e = t / LEAN; rot = g.ux * 0.45 * e; lx = g.ux * 5 * e; ly = g.uy * 5 * e; }
      else if (t < LEAN + KNOCK) { var q = (t - LEAN) / KNOCK; rot = -g.ux * 0.5 * Math.sin(q * Math.PI); ly -= Math.sin(q * Math.PI) * 7; sq = 1 - 0.18 * Math.max(0, 1 - q * 3); }
      else { var w = Math.max(0, 1 - (t - LEAN - KNOCK) / 1.2); rot = Math.sin(t * 9) * (0.08 + 0.2 * w); }
      c.translate(fx + lx, fy + ly); c.rotate(rot); c.scale(1 + (1 - sq) * 0.6, sq); c.translate(-fx, -fy);
    }
    try { prevDraw.apply(this, arguments); } finally { c.restore(); }
    var hy = h.y - 22;
    if (g.mode === "sleep") {
      zzz(c, h.x, hy, g);
      var d = Math.hypot(player.x - h.x, player.y - h.y) / T;
      var sv = g.shown == null ? g.wake : g.shown;
      if (sv > 0.01 || d < WAKE_R) { meter(c, h.x - 10, hy - 4, sv, Math.max(Math.max(0, 1 - (now() - (g.jolt || -9)) / 0.35), sv > 0.75 ? 0.5 : 0)); lastMeter.wake = g.wake; lastMeter.t = now(); }
    } else if (g.mode === "startle") {
      c.font = "600 18px 'Plex Cond', sans-serif"; c.textAlign = "center"; c.textBaseline = "alphabetic";
      c.lineWidth = 4; c.strokeStyle = "rgba(27,27,27,0.9)"; c.strokeText("!", h.x, hy - 10); c.fillStyle = C.red; c.fillText("!", h.x, hy - 10);
    } else if (g.mode === "groggy") {
      c.strokeStyle = "rgba(191,233,255,0.85)"; c.lineWidth = 1.5; c.beginPath();
      for (var k = 0; k < 18; k++) { var a = now() * 5 + k * 0.6, r = 1 + k * 0.45; c.lineTo(h.x + Math.cos(a) * r, hy - 4 + Math.sin(a) * r * 0.6); }
      c.stroke();
    } else if (g.mode === "daze" && t >= LEAN) {
      c.fillStyle = "#ffe39a";
      for (var s = 0; s < 3; s++) { var b = t * 6 + s * 2.094; star(c, h.x + Math.cos(b) * 11, hy - 2 + Math.sin(b) * 4, 4.5); }
    }
  };

  function drawFire(c, x, y) {
    var fl = Math.sin(now() * 13) * 0.5 + Math.sin(now() * 7.3) * 0.5;
    c.globalCompositeOperation = "lighter";
    var gr = c.createRadialGradient(x, y, 2, x, y, 40 + fl * 3);
    gr.addColorStop(0, "rgba(255,170,70,0.38)"); gr.addColorStop(1, "rgba(255,120,40,0)");
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, 44, 0, 6.283); c.fill();
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "#3a2a1c"; c.fillRect(x - 8, y + 2, 16, 3); c.fillStyle = "#5a3d24"; c.fillRect(x - 6, y, 12, 3);
    c.fillStyle = "#6e6a62"; [[-9, 4], [9, 4], [-6, 6], [6, 6], [0, 7]].forEach(function (p) { c.fillRect(x + p[0] - 1, y + p[1] - 1, 3, 2); });
    var hgt = 9 + fl * 2;
    c.fillStyle = "#e0602a"; c.beginPath(); c.moveTo(x - 5, y + 1); c.lineTo(x + fl, y - hgt); c.lineTo(x + 5, y + 1); c.fill();
    c.fillStyle = "#ffd06a"; c.beginPath(); c.moveTo(x - 2.5, y + 1); c.lineTo(x - fl * 0.6, y - hgt * 0.6); c.lineTo(x + 2.5, y + 1); c.fill();
    if (Math.random() < 0.12) particles.push({ x: x + (Math.random() - 0.5) * 6, y: y - 6, vx: (Math.random() - 0.5) * 8, vy: -24, life: 0.6, t: 0, col: "rgba(255,190,90,0.9)" });
  }
  function drawSticks(c, x, y, broken) {
    c.fillStyle = broken ? "#5c4630" : "#8a6a44";
    if (!broken) { c.save(); c.translate(x, y); c.rotate(-0.35); c.fillRect(-9, -1, 18, 2); c.fillRect(2, -4, 2, 4); c.fillRect(-5, 0, 2, 3); c.restore(); }
    else { c.save(); c.translate(x - 4, y); c.rotate(-0.7); c.fillRect(-5, -1, 8, 2); c.restore(); c.save(); c.translate(x + 5, y + 1); c.rotate(0.5); c.fillRect(-4, -1, 8, 2); c.restore(); }
  }

  BH.tiles.register(TWIG, {
    claim: "fungags",
    draw: function (b, px, py) { drawSticks(b, px + T / 2, py + T / 2 + 3, false); },
    onEnter: function (tx, ty, api) {
      if (!on()) return;
      var x = (tx + 0.5) * T, y = (ty + 0.5) * T;
      api.setTile(tx, ty, ".");
      st.snapped.push({ x: x, y: y + 3 });
      snd("sprint", { vol: 2.4 }); snd("click");
      puff(x, y, 12, "rgba(170,130,80,0.9)", 46); ring(x, y, "rgba(255,227,154,0.6)", T * 1.4, 0.45);
      floatText(x, y - 14, "SNAP", "#ffe39a", "", 0.9);
      api.shake(0.12);
      hunters.forEach(function (h) {
        var d = Math.hypot(h.x - x, h.y - y) / T;
        if (d < 4) bumpMeter(h, 0.55); else if (d < 7) bumpMeter(h, 0.35);
      });
      makeNoise(x, y, 2.5, "twig");
      st.snaps++;
    }
  });

  BH.features.register("fungags", {
    onLevelStart: function (level, api) {
      st = { level: level, api: api, snapped: [], seen: [], fires: [], woke: 0, bumps: 0, snaps: 0 };
      (level.hunters || []).forEach(function (def, i) {
        var h = hunters[i]; if (!h || !def || !def.sleep) return;
        h.fg = { mode: "sleep", wake: 0, t0: now() }; st.fires.push({ x: h.x + 22, y: h.y + 6 });
        h.state = "sleep"; h.dir = Math.PI / 2;
      });
    },
    onStep: function (dt, api) {
      if (!on()) return;
      noises.forEach(function (n) {
        if (n.kind === "twig" || st.seen.indexOf(n) >= 0) return;
        st.seen.push(n);
        hunters.forEach(function (h) { if (Math.hypot(h.x - n.x, h.y - n.y) < n.r + T) bumpMeter(h, 0.3); });
      });
      if (st.seen.length > 40) st.seen = st.seen.slice(-20);
    },
    onDrawWorld: function (c) {
      if (!on()) return;
      st.snapped.forEach(function (s) { drawSticks(c, s.x, s.y, true); });
      st.fires.forEach(function (f) { drawFire(c, f.x, f.y); });
    }
  });
  BH.funGags = { state: function () { return st; }, meterInfo: function () { return lastMeter; } };
})();
