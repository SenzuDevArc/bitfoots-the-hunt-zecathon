"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.features.register) return;

  var KYC_BONUS = 3;
  var DISGUISE_GRACE = 1.5;
  var FAKE_CALL = 18;
  var FAKE_COOL = 1.0;

  var COPY = {
    disguise: { tile: "q", sign: "SWAP COATS, LOSE THEM",
      dev: "One Zcash shielded wallet can generate many diversified addresses that can't be linked to each other." },
    kyc: { tile: "K", sign: "SHORTCUT TAKES YOUR PHOTO",
      dev: "Exchanges that require identity checks (KYC) can link your identity to the addresses you withdraw to." },
    fakeden: { tile: "F", sign: "REAL DENS GLOW GOLD",
      dev: "Scam wallet apps and fake sites steal seed phrases. Get wallets only from trusted sources such as z.cash/wallets." }
  };
  var F0 = window.FACTS && FACTS.words;
  var WORDS = {
    fcRack:  { word: "SPARE COAT", zcash: "" },
    fcCoat:  { word: "NEW COAT", main: "They were looking for the old one.",
               zcash: "One shielded wallet, many unlinkable addresses." },
    fcBooth: { word: "ID CHECK", zcash: "" },
    fcPhoto: { word: "PHOTO TAKEN", main: "Every lantern knows your face now.",
               zcash: "ID-checked exchanges tie your name to the addresses you withdraw to." },
    fcFake:  { word: "FAKE DEN", main: "It called the hunters.",
               zcash: "Fake wallets steal seed phrases. Get one from z.cash/wallets." }
  };
  if (F0) Object.keys(WORDS).forEach(function (k) { if (!F0[k]) F0[k] = WORDS[k]; });

  function tilesOf(level, ch) {
    var out = [];
    (level.map || []).forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === ch) out.push([x, y]); });
    return out;
  }
  function now(api) { return typeof api.time === "function" ? api.time() : api.time; }
  function live(st) { return !!st && (typeof L === "undefined" || !st.level || L === st.level); }
  function ptile() { return [Math.floor(player.x / T), Math.floor(player.y / T)]; }
  function nearT(t, r) { return Math.hypot((t[0] + 0.5) * T - player.x, (t[1] + 0.5) * T - player.y) < r * T; }
  function tag(ctx, text, x, y, col) {
    ctx.font = "600 9px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = ctx.measureText(text).width + 8;
    ctx.fillStyle = "rgba(27,27,27,0.85)"; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 6), Math.round(w), 12);
    ctx.fillStyle = col || C.ink; ctx.fillText(text, x, y);
  }
  var FURS = ["fur-snow", "fur-ash", "fur-moss", "fur-midnight"];
  var FUR_HEX = { "fur-classic": ["#6E4250", "#472E3E"], "fur-snow": ["#DCDDE0", "#9EA2AA"], "fur-rust": ["#9A542E", "#67351A"], "fur-moss": ["#566437", "#374222"],
    "fur-ash": ["#6A6C72", "#46484E"], "fur-bark": ["#5C3B28", "#3B2619"], "fur-midnight": ["#2C2B36", "#18171F"] };
  function furHex(id) {
    var it = BH.cosmetics && BH.cosmetics.get ? BH.cosmetics.get(id) : null;
    if (it && it.pal && it.pal.fur) return [it.pal.fur, it.pal.furDk || it.pal.fur];
    return FUR_HEX[id] || FUR_HEX["fur-classic"];
  }
  function wornFur() { return (typeof save !== "undefined" && save && save.cos && save.cos.fur) || "fur-classic"; }

  var dg = null;
  if (BH.tiles) BH.tiles.register("q", { claim: "disguise" });
  BH.features.register("disguise", {
    onLevelStart: function (level) {
      var worn = wornFur(), pool = FURS.filter(function (f) { return f !== worn; });
      dg = { racks: tilesOf(level, "q").map(function (t, i) { return { t: t, used: false, fur: pool[i % pool.length] }; }),
             fur: null, staleBefore: 0, graceUntil: -1, lostBy: [], uses: 0, met: false, swapAt: -1e9, level: level };
    },
    onStep: function (dt, api) {
      if (!live(dg)) return;
      var p = ptile(), t = now(api);
      if (!dg.met && dg.racks.some(function (r) { return !r.used && nearT(r.t, 2.2); })) { dg.met = true; api.say("fcRack", C.gold); }
      if (!player.inShield) dg.racks.forEach(function (r) {
        if (r.used || r.t[0] !== p[0] || r.t[1] !== p[1]) return;
        r.used = true; dg.uses++; dg.swapAt = t;
        var fur = r.fur === (dg.fur || wornFur()) ? FURS.filter(function (f) { return f !== r.fur && f !== wornFur(); })[0] : r.fur;
        dg.fur = fur;
        player.seg += 1; player.dist = 0; dg.staleBefore = prints.length;
        var lost = [];
        hunters.forEach(function (h, i) {
          h.sus = 0; h.susTick = 0; h.lastSeen = null; h.ignoreBefore = Math.max(h.ignoreBefore || 0, prints.length);
          var after = h.state === "chase" || h.state === "follow" || h.state === "check" || h.state === "search" || (h.state === "rush" && !h.decoy);
          if (after) { if (typeof loseTrail === "function") loseTrail(h); else { h.state = "search"; h.searchT = 2.4; } lost.push(i); }
        });
        dg.lostBy = lost; dg.graceUntil = t + DISGUISE_GRACE;
        var hx = furHex(fur)[0];
        if (typeof puff === "function") puff(player.x, player.y - 10, 18, hx, 46);
        if (typeof ring === "function") ring(player.x, player.y, hx, T * 1.6, 0.6);
        if (typeof sfx === "function") sfx("decoy");
        api.shake(0.2);
        api.say("fcCoat", C.ice);
      });
      if (t < dg.graceUntil) hunters.forEach(function (h) { if (h.state !== "chase") { h.sus = 0; h.susTick = 0; } });
    },
    onDrawWorld: function (ctx) {
      if (!live(dg)) return;
      if (dg.staleBefore) {
        var m = ctx.getTransform ? ctx.getTransform() : null, x0 = -1e9, x1 = 1e9, y0 = -1e9, y1 = 1e9;
        if (m && m.a && m.d && ctx.canvas) { x0 = -m.e / m.a - 40; x1 = (ctx.canvas.width - m.e) / m.a + 40; y0 = -m.f / m.d - 40; y1 = (ctx.canvas.height - m.f) / m.d + 40; }
        var n = Math.min(dg.staleBefore, prints.length), i, q;
        for (i = 0; i < n; i++) {
          q = prints[i]; if (q.x < x0 || q.x > x1 || q.y < y0 || q.y > y1) continue;
          ctx.fillStyle = "rgba(19,39,19,0.72)"; ctx.beginPath(); ctx.arc(q.x, q.y, 5.5, 0, 6.283); ctx.fill();
          ctx.fillStyle = "rgba(160,170,165,0.35)"; ctx.fillRect(q.x - 1, q.y - 1, 2, 2);
        }
      }
      var tm = typeof simTime === "number" ? simTime : 0;
      dg.racks.forEach(function (r) { drawRack(ctx, r.t[0] * T, r.t[1] * T, r.used ? null : furHex(r.fur), tm); });
    }
  });
  function drawRack(b, px, py, col, tm) {
    b.fillStyle = "rgba(0,0,0,0.3)"; b.fillRect(px + 5, py + 27, 22, 3);
    b.fillStyle = "#3b2a1a"; b.fillRect(px + 6, py + 5, 3, 23); b.fillRect(px + 23, py + 5, 3, 23);
    b.fillStyle = C.wood; b.fillRect(px + 4, py + 4, 24, 3); b.fillRect(px + 4, py + 26, 7, 2); b.fillRect(px + 21, py + 26, 7, 2);
    b.fillStyle = "#c9c2b0"; b.fillRect(px + 15, py + 7, 2, 3); b.fillRect(px + 11, py + 10, 10, 1);
    if (!col) return;
    b.fillStyle = col[1]; b.fillRect(px + 9, py + 10, 14, 16); b.fillRect(px + 7, py + 11, 3, 11); b.fillRect(px + 22, py + 11, 3, 11);
    b.fillStyle = col[0]; b.fillRect(px + 10, py + 10, 12, 15); b.fillRect(px + 8, py + 12, 2, 9); b.fillRect(px + 22, py + 12, 2, 9);
    b.fillStyle = "rgba(255,250,240,0.35)"; b.fillRect(px + 15, py + 12, 2, 12); b.fillRect(px + 12, py + 10, 8, 2);
    var k = (Math.sin(tm * 3) + 1) / 2;
    b.fillStyle = "rgba(234,186,73," + (0.25 + 0.5 * k).toFixed(3) + ")"; b.fillRect(px + 22, py + 9, 2, 2); b.fillRect(px + 8, py + 18, 1, 1);
  }
  var baseDrawPlayer = typeof drawPlayer === "function" ? drawPlayer : null;
  if (baseDrawPlayer) {
    drawPlayer = function () {
      if (!live(dg) || !dg.fur || typeof save === "undefined" || !save) return baseDrawPlayer.apply(this, arguments);
      var s = save.cos, o = {}; Object.keys(s || {}).forEach(function (k) { o[k] = s[k]; }); o.fur = dg.fur;
      save.cos = o;
      try { return baseDrawPlayer.apply(this, arguments); } finally { save.cos = s; }
    };
  }

  var ky = null;
  if (BH.tiles) BH.tiles.register("K", { solidHunter: true, claim: "kyc", draw: drawBooth });
  function drawBooth(b, px, py) {
    b.fillStyle = "rgba(0,0,0,0.3)"; b.fillRect(px + 2, py + 28, 28, 3);
    b.fillStyle = "#3a3a36"; b.fillRect(px + 2, py + 3, 28, 26);
    b.fillStyle = "#2c2c29"; b.fillRect(px + 2, py + 3, 3, 26); b.fillRect(px + 27, py + 3, 3, 26);
    b.fillStyle = "#4a4a45"; b.fillRect(px + 1, py + 1, 30, 4);
    b.fillStyle = C.ink; b.fillRect(px + 9, py + 7, 14, 8);
    b.fillStyle = C.red; b.fillRect(px + 9, py + 7, 14, 2);
    b.fillStyle = "#1b1b1b"; b.fillRect(px + 12, py + 10, 1, 4);
    b.fillRect(px + 15, py + 10, 1, 4); b.fillRect(px + 16, py + 10, 2, 1); b.fillRect(px + 16, py + 13, 2, 1); b.fillRect(px + 18, py + 11, 1, 2);
    b.fillStyle = "#1b1b1b"; b.fillRect(px + 7, py + 18, 18, 11);
    b.fillStyle = "#101010"; b.fillRect(px + 13, py + 19, 6, 4);
    b.fillStyle = "#5a1a12"; b.fillRect(px + 15, py + 20, 2, 2);
  }
  BH.features.register("kyc", {
    onLevelStart: function (level) {
      ky = { booths: tilesOf(level, "K"), photo: false, at: -1e9, met: false, base: VISION, bonus: KYC_BONUS, level: level };
    },
    onStep: function (dt, api) {
      if (!live(ky)) return;
      var p = ptile();
      if (!ky.met && ky.booths.some(function (t) { return nearT(t, 2.2); })) { ky.met = true; if (!ky.photo) api.say("fcBooth", C.gold); }
      if (!ky.photo && ky.booths.some(function (t) { return t[0] === p[0] && t[1] === p[1]; })) {
        ky.photo = true; ky.at = now(api); ky.met = true;
        VISION += KYC_BONUS;
        if (typeof sfx === "function") sfx("click");
        if (typeof ring === "function") ring(player.x, player.y, "rgba(255,250,240,0.9)", T * 2.2, 0.35);
        api.shake(0.15);
        api.say("fcPhoto", C.red);
      }
    },
    onDrawWorld: function (ctx) {
      if (!live(ky)) return;
      var tm = typeof simTime === "number" ? simTime : 0;
      ky.booths.forEach(function (t) {
        var on = ky.photo || Math.sin(tm * 4) > 0.3;
        ctx.fillStyle = on ? C.red : "#5a1a12"; ctx.fillRect(t[0] * T + 15, t[1] * T + 20, 2, 2);
      });
      if (ky.photo) {
        hunters.forEach(function (h) { if (h.type === "dog") return; drawPhoto(ctx, h.x + 9, h.y - 30, 0.55, false); });
      }
    },
    onDrawOver: function (ctx, api) {
      if (!live(ky) || !ky.photo || (typeof game !== "undefined" && game.screen !== "play")) return;
      var t = now(api) - ky.at;
      if (t < 0.25) { ctx.fillStyle = "rgba(255,250,240," + (0.55 * (1 - t / 0.25)).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H); }
      var x = 16, y = 70 + (player.stash ? 8 : 0);
      drawPhoto(ctx, x + 12, y + 16, 1, true);
      ctx.font = "600 11px 'Plex Cond', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = C.red;
      ctx.fillText("ON FILE", x + 30, y + 16);
    }
  });
  function drawPhoto(ctx, cx, cy, s, big) {
    var w = 22 * s, h = 26 * s, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
    var fur = furHex(live(dg) && dg.fur ? dg.fur : wornFur());
    ctx.fillStyle = C.ink; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = "#2a3a4a"; ctx.fillRect(x0 + 2 * s, y0 + 2 * s, w - 4 * s, 16 * s);
    ctx.fillStyle = fur[0]; ctx.fillRect(x0 + 7 * s, y0 + 6 * s, 8 * s, 8 * s); ctx.fillRect(x0 + 5 * s, y0 + 13 * s, 12 * s, 5 * s);
    ctx.fillStyle = "#e9c9a8"; ctx.fillRect(x0 + 9 * s, y0 + 9 * s, 5 * s, 4 * s);
    ctx.fillStyle = C.red; ctx.fillRect(x0 + 2 * s, y0 + 20 * s, w - 4 * s, 4 * s);
    if (big) { ctx.strokeStyle = C.red; ctx.lineWidth = 1; ctx.strokeRect(x0 - 0.5, y0 - 0.5, w + 1, h + 1); }
  }

  var fd = null;
  if (BH.tiles) BH.tiles.register("F", { claim: "fakeden", draw: function (b, px, py, x, y) {
    if (typeof drawDen === "function") drawDen(b, px, py);
    b.fillStyle = "#3e3a46"; b.fillRect(px + 2, py + 2, T - 4, 8);
    b.fillStyle = "#6b5a48";
    [[-10, 30, 0], [-4, 36, 1], [36, 30, 0], [40, 22, 1], [4, 38, 0], [26, 38, 1], [-12, 14, 0], [42, 10, 1]].forEach(function (q) {
      var bx = px + q[0], by = py + q[1]; b.fillRect(bx, by, 3, 5); b.fillRect(bx + (q[2] ? 4 : -4), by + 2, 3, 5);
    });
  } });
  BH.features.register("fakeden", {
    onLevelStart: function (level) {
      fd = { dens: tilesOf(level, "F"), last: null, trips: 0, calls: 0, called: [], coolUntil: -1e9, flashAt: -1e9, pushedTo: null, level: level };
    },
    onStep: function (dt, api) {
      if (!live(fd) || !fd.dens.length) return;
      var p = ptile(), t = now(api), c = api.tileAt(p[0], p[1]);
      if (c !== "F") { fd.last = [p[0], p[1]]; return; }
      var den = [p[0], p[1]], back = fd.last || [p[0], p[1] + 1];
      fd.trips++; fd.flashAt = t;
      player.x = (back[0] + 0.5) * T; player.y = (back[1] + 0.5) * T; player.vx = 0; player.vy = 0; player.tx = back[0]; player.ty = back[1];
      fd.pushedTo = back.slice();
      if (typeof tapGo !== "undefined") tapGo = null;
      var dx = (den[0] + 0.5) * T, dy = (den[1] + 0.5) * T;
      if (typeof ring === "function") ring(dx, dy, "rgba(200,65,47,0.9)", T * 2.4, 0.6);
      if (typeof puff === "function") puff(dx, dy, 16, "rgba(200,65,47,0.8)", 40);
      api.shake(0.35);
      if (t >= fd.coolUntil) {
        fd.coolUntil = t + FAKE_COOL; fd.calls++;
        var called = [], newest = prints.length ? prints.length - 1 : 0;
        hunters.forEach(function (h, i) {
          if (h.state === "chase") return;
          if (Math.hypot(h.x - dx, h.y - dy) > FAKE_CALL * T) return;
          h.state = "rush"; h.decoy = false; h.droneSent = false; h.target = { x: dx, y: dy }; h.followIdx = newest; h.path = []; h.pathKey = "";
          called.push(i);
        });
        fd.called = called;
        if (typeof sfx === "function") sfx("tower");
      }
      api.say("fcFake", C.red);
    },
    onDrawWorld: function (ctx, api) {
      if (!live(fd)) return;
      var tm = typeof simTime === "number" ? simTime : 0, open = typeof banked === "function" && banked() >= L.need;
      fd.dens.forEach(function (q) {
        var x = (q[0] + 0.5) * T, y = (q[1] + 0.5) * T;
        var a = (open ? 0.26 : 0.2) + Math.sin(tm * 2.3) * 0.06;
        ctx.globalCompositeOperation = "lighter";
        var g = ctx.createRadialGradient(x, y + 6, 2, x, y + 6, T * 1.6);
        g.addColorStop(0, "rgba(200,65,47," + a.toFixed(3) + ")"); g.addColorStop(1, "rgba(200,65,47,0)");
        ctx.fillStyle = g; ctx.fillRect(x - T * 2, y - T * 2, T * 4, T * 4);
        ctx.globalCompositeOperation = "source-over";
        var tw = Math.sin(tm * 5 + q[0]) > 0.6;
        ctx.fillStyle = tw ? C.string : "rgba(200,65,47,0.6)"; ctx.fillRect(x + 8, y - 13, 2, 2);
        ctx.font = "600 11px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillStyle = C.goldDim; ctx.fillText((F.gp && F.gp.den) || "DEN", x, y - T * 0.55);
        var ft = now(api) - fd.flashAt;
        if (ft >= 0 && ft < 1.4) { ctx.globalAlpha = Math.min(1, (1.4 - ft) / 0.4); tag(ctx, "FAKE", x, y - T * 1.1, C.red); ctx.globalAlpha = 1; }
      });
    }
  });

  var prevState = BH.featureState;
  BH.featureState = function (id) {
    if (id === "disguise") return live(dg) ? { fur: dg.fur, uses: dg.uses, staleBefore: dg.staleBefore, lostBy: dg.lostBy.slice(), racks: dg.racks.map(function (r) { return r.used; }), met: dg.met } : null;
    if (id === "kyc") return live(ky) ? { photo: ky.photo, base: ky.base, bonus: ky.bonus, vision: VISION, met: ky.met } : null;
    if (id === "fakeden") return live(fd) ? { trips: fd.trips, calls: fd.calls, called: fd.called.slice(), pushedTo: fd.pushedTo, dens: fd.dens.length } : null;
    return prevState ? prevState(id) : null;
  };
})();
