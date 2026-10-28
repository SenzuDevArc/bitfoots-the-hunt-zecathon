"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.features.register) return;

  var TRIG = 8, WIND = 0.4, HOUND = 4.6, NEAR = 2.2, GAIN = 0.55, GIVEUP = 9, BLIND = 1.6, COOL = 5;
  var SKID = 0.7, SIT = 1.7, WIDE = 0.8;
  var S = null, zSet = null, zBase = null;

  function live() { return !!S && typeof L !== "undefined" && L === S.level; }
  function sfxOk(n, o) { try { if (typeof sfx === "function") sfx(n, o); } catch (e) {} }
  function tdist(h) { return Math.hypot(h.x - player.x, h.y - player.y) / T; }
  function blockedH(x, y) { return solidH(tileAt(x, y)); }
  function ease(k) { return k * k * (3 - 2 * k); }

  function restoreZoom() { if (zSet !== null) { if (zoom === zSet) zoom = zBase; zSet = null; } }
  function applyZoom() {
    if (zSet === null || zoom !== zSet) zBase = zoom;
    var k = 1 - (1 - WIDE) * ease(S ? S.wide : 0);
    if (k >= 0.999) { restoreZoom(); return; }
    zoom = zSet = zBase * k;
  }

  function start(d) {
    var h = d.h;
    d.m = "wind"; d.t0 = simTime; d.seenT = simTime; d.lx = h.x; d.ly = h.y;
    h.state = "funwind"; h.path = []; h.pathKey = "";
    S.cap = "THE HOUND HAS YOUR FOOTPRINTS"; S.capT = simTime;
    sfxOk("spotted"); sfxOk("bark");
    if (typeof addTrauma === "function") addTrauma(0.35);
    if (typeof ring === "function") ring(h.x, h.y - 6, "rgba(208,74,55,0.8)", T * 1.2, 0.4);
  }
  function skid(d) {
    var h = d.h, sp = Math.hypot(d.vx, d.vy);
    d.m = "skid"; d.t0 = simTime; d.v0 = d.run ? Math.max(sp, HOUND * T * 0.8) : 0;
    d.ux = sp > 1 ? d.vx / sp : Math.sign(player.x - h.x); d.uy = sp > 1 ? d.vy / sp : Math.sign(player.y - h.y);
    d.bank = false; d.said = false;
    h.state = "funskid"; h.path = []; h.pathKey = ""; h.sus = 0;
    S.cap = "THE WATERS KEEP NO FOOTPRINTS"; S.capT = simTime;
    if (d.v0) sfxOk("whoosh");
  }
  function release(d) {
    var h = d.h;
    d.m = "idle"; d.cool = simTime + COOL; d.run = false;
    if (h.state === "funwind" || h.state === "funskid" || h.state === "chase") {
      h.state = "return"; h.path = []; h.pathKey = ""; h.sus = 0;
      h.ignoreBefore = prints.length; h.caughtHow = null; h.pursuit = null; h.seen = null;
    }
  }

  function stepDog(d, dt) {
    var h = d.h, now = simTime, dd = tdist(h);
    if (d.m === "idle") {
      if (now < d.cool || player.inShield) return;
      if ((h.state === "follow" || h.state === "chase") && dd <= TRIG && losClear(h.x, h.y, player.x, player.y)) start(d);
      return;
    }
    if (d.m === "wind") {
      if (player.inShield) { skid(d); return; }
      if (h.state === "funwind") h.dir += angDiff(Math.atan2(player.y - h.y, player.x - h.x), h.dir) * Math.min(1, dt * 10);
      if (now - d.t0 >= WIND || h.state === "chase") { d.m = "run"; d.run = true; d.t0 = now; sfxOk("bark"); }
      d.lx = h.x; d.ly = h.y; d.vx = 0; d.vy = 0;
      return;
    }
    if (d.m === "run") {
      var mvx = (h.x - d.lx) / dt, mvy = (h.y - d.ly) / dt;
      if (Math.hypot(mvx, mvy) > 1) { d.vx = mvx; d.vy = mvy; }
      if (player.inShield) { skid(d); return; }
      if (losClear(h.x, h.y, player.x, player.y)) d.seenT = now;
      if (now - d.seenT > BLIND || now - d.t0 > GIVEUP || dd > TRIG * 1.6) { S.cap = null; release(d); return; }
      h.state = "chase"; h.target = { x: player.x, y: player.y }; h.sus = 1;
      var pv = Math.hypot(player.vx, player.vy) / T, want = dd > NEAR || pv < 1 ? HOUND : Math.min(HOUND, pv + GAIN);
      var extra = want - D_CHASE * h.sp * (typeof alarmSpeed === "function" ? alarmSpeed() : 1);
      d.lx = h.x; d.ly = h.y;
      if (extra > 0 && typeof walkPrints === "function" && walkPrints(h, extra, dt) === "end" && dd < DOG_LAST) walkTo(h, player.x, player.y, extra, dt);
      d.dust -= dt;
      if (d.dust <= 0 && typeof puff === "function") { d.dust = 0.07; puff(h.x - Math.cos(h.dir) * 7, h.y + 6, 2, "rgba(190,160,120,0.75)", 12); }
      if (Math.floor(now * 2) !== Math.floor((now - dt) * 2)) sfxOk("heartbeat", { danger: 0.8 });
      return;
    }
    if (h.state !== "funskid") { d.m = "idle"; d.cool = now + COOL; return; }
    var t = now - d.t0;
    if (d.m === "skid") {
      var v = d.v0 * Math.max(0, 1 - t / SKID), step = v * dt;
      if (step > 0 && !d.bank) {
        var nx = h.x + d.ux * step, ny = h.y + d.uy * step;
        if (blockedH(nx + d.ux * 9, ny + d.uy * 9)) {
          d.bank = true;
          var bx = h.x + d.ux * 12, by = h.y + d.uy * 12;
          if (typeof puff === "function") { puff(bx, by, 16, "rgba(190,235,255,0.9)", 46); puff(bx, by, 6, "rgba(255,255,255,0.9)", 30); }
          if (typeof ring === "function") ring(bx, by, "rgba(170,230,255,0.8)", T * 1.1, 0.5);
          sfxOk("splash"); if (typeof addTrauma === "function") addTrauma(0.2);
        } else {
          S.marks.push({ x1: h.x, y1: h.y, x2: nx, y2: ny, ux: d.ux, uy: d.uy, t: now });
          h.x = nx; h.y = ny;
          if (typeof puff === "function") puff(h.x - d.ux * 4, h.y + 6, 2, "rgba(170,140,100,0.85)", 20);
        }
      }
      h.dir = Math.atan2(d.uy, d.ux);
      if (t >= SKID || d.bank || !d.v0) { d.m = "sit"; d.t0 = now; }
      return;
    }
    if (d.m === "sit") {
      h.dir += angDiff(Math.atan2(player.y - h.y, player.x - h.x), h.dir) * Math.min(1, dt * 3);
      if (!d.said && t > 0.25) { d.said = true; if (typeof floatText === "function") floatText(h.x, h.y - 22, "NO TRAIL", C.ice || "#bfe9ff"); }
      if (Math.floor(t / 0.55) !== Math.floor((t - dt) / 0.55) && t < SIT - 0.3) sfxOk("suspicion", { level: 0.02 });
      if (t >= SIT) { release(d); S.cap = null; }
    }
  }

  BH.features.register("funchase", {
    onLevelStart: function (level) {
      restoreZoom();
      S = { level: level, wide: 0, cap: null, capT: 0, marks: [],
        dogs: hunters.filter(function (h) { return h.type === "dog"; }).map(function (h) { return { h: h, m: "idle", cool: 0, dust: 0, vx: 0, vy: 0, lx: h.x, ly: h.y }; }) };
    },
    onStep: function (dt) {
      if (!live() || game.phase !== "play") return;
      S.dogs.forEach(function (d) { stepDog(d, dt); });
      var on = S.dogs.some(function (d) { return d.m === "wind" || d.m === "run"; });
      S.wide = on ? Math.min(1, S.wide + dt * 2.6) : Math.max(0, S.wide - dt * 1.1);
      var old = simTime - 6; while (S.marks.length && S.marks[0].t < old) S.marks.shift();
      applyZoom();
    },
    onDrawWorld: function (c) {
      if (!live()) return;
      S.marks.forEach(function (m) {
        var a = Math.max(0, 1 - (simTime - m.t) / 6) * 0.8, px = -m.uy * 3, py = m.ux * 3;
        c.strokeStyle = "rgba(122,92,58," + a.toFixed(3) + ")"; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(m.x1 + px, m.y1 + 7 + py); c.lineTo(m.x2 + px, m.y2 + 7 + py);
        c.moveTo(m.x1 - px, m.y1 + 7 - py); c.lineTo(m.x2 - px, m.y2 + 7 - py); c.stroke();
      });
      S.dogs.forEach(function (d) {
        var h = d.h;
        if (d.m === "run") {
          var sp = Math.hypot(d.vx, d.vy); if (sp < 1) return;
          var ux = d.vx / sp, uy = d.vy / sp;
          c.strokeStyle = "rgba(255,243,196,0.55)"; c.lineWidth = 1.5; c.beginPath();
          for (var i = -1; i <= 1; i++) {
            var ox = -uy * i * 5, oy = ux * i * 5, j = (Math.sin(simTime * 40 + i * 2) + 1) * 3, len = 12 + j + (i ? 0 : 6);
            c.moveTo(h.x - ux * 10 + ox, h.y - uy * 10 + oy); c.lineTo(h.x - ux * (10 + len) + ox, h.y - uy * (10 + len) + oy);
          }
          c.stroke();
        } else if (d.m === "sit") {
          var t = simTime - d.t0, f = Math.cos(h.dir) >= 0 ? 1 : -1, dy = (t * 14) % 10;
          c.fillStyle = "rgba(170,220,255," + Math.max(0, 1 - dy / 10).toFixed(3) + ")";
          c.fillRect(Math.round(h.x + f * 4), Math.round(h.y - 6 + dy), 2, 3);
        }
      });
    },
    onDrawOver: function (c) {
      if (!live()) return;
      if (game.phase !== "play") { S.wide = 0; restoreZoom(); return; }
      var w = ease(S.wide);
      if (w <= 0.01 && !S.cap) return;
      var bar = Math.round(Math.min(40, H * 0.07) * w);
      if (w > 0.01) {
        var g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
        g.addColorStop(0, "rgba(120,20,10,0)"); g.addColorStop(1, "rgba(120,20,10," + (0.32 * w * (0.8 + 0.2 * Math.sin(simTime * 9))).toFixed(3) + ")");
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = "rgba(255,243,196," + (0.22 * w).toFixed(3) + ")"; c.lineWidth = 1.5; c.beginPath();
        var R = Math.hypot(W, H) / 2, seed = Math.floor(simTime * 20);
        for (var i = 0; i < 26; i++) {
          var r1 = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453, a = (r1 - Math.floor(r1)) * 6.283;
          var r2 = Math.sin(seed * 4.1 + i * 9.7) * 9631.3, k = 0.62 + (r2 - Math.floor(r2)) * 0.18;
          c.moveTo(W / 2 + Math.cos(a) * R * k, H / 2 + Math.sin(a) * R * k); c.lineTo(W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R);
        }
        c.stroke();
        c.fillStyle = "rgba(10,8,6,0.92)"; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar);
      }
      if (S.cap) {
        var al = Math.min(1, (simTime - S.capT) * 4);
        c.globalAlpha = al; c.font = "600 13px 'Plex Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
        var y = bar > 18 ? H - bar / 2 : H - 30, tw = c.measureText(S.cap).width + 16;
        if (bar <= 18) { c.fillStyle = "rgba(10,8,6,0.8)"; c.fillRect(W / 2 - tw / 2, y - 11, tw, 22); }
        c.fillStyle = S.cap.indexOf("WATERS") >= 0 ? "#bfe9ff" : "#eaba49"; c.fillText(S.cap, W / 2, y);
        c.globalAlpha = 1;
      }
    }
  });

  if (typeof window.drawDog === "function") {
    var dd0 = window.drawDog;
    window.drawDog = function (h) {
      var d = live() && h ? S.dogs.find(function (q) { return q.h === h; }) : null;
      if (!d || d.m !== "sit") return dd0.apply(this, arguments);
      var x = Math.round(h.x), y = Math.round(h.y) + 7;
      ctx.save(); ctx.translate(x, y); ctx.scale(1.06, 0.84); ctx.translate(-x, -y);
      try { return dd0.apply(this, arguments); } finally { ctx.restore(); }
    };
  }
  if (typeof window.caughtWhy === "function") {
    var why0 = window.caughtWhy;
    window.caughtWhy = function (r) {
      if (r && r.how === "friendHunter")
        return { why: "The hunter caught one of your friends.", how: "When a friend gets caught, you get caught too.",
          cause: "Your friends walk right behind you, so the hunter can reach them first.", hint: "Keep your friends away from the hunters too." };
      if (!r || r.how !== "friend") return why0.apply(this, arguments);
      return { why: "The dog caught one of your friends.", how: "When a friend gets caught, you get caught too.",
        cause: "Your friends walk in your footprints, and so does the dog.", hint: "Get your friends into the waters before the dog gets close." };
    };
  }
  if (typeof window.loadLevel === "function") {
    var ll0 = window.loadLevel;
    window.loadLevel = function () { restoreZoom(); if (S) S.wide = 0; return ll0.apply(this, arguments); };
  }
})();
