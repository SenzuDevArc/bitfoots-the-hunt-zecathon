"use strict";
(function () {
  var ACTS = window.STORY_ACTS || [
    { title: "EVERY STEP STAYS", scene: "ledger",
      lines: ["Most blockchains show every payment in public.", "Anyone can follow the trail."] },
    { title: "SPROUT · 2016", scene: "sprout",
      lines: ["28 Oct 2016: Zcash launched with a shielded pool, Sprout.", "In the shield, your payments stay private."] },
    { title: "TWO KINDS OF ZEC", scene: "twokinds",
      lines: ["Transparent ZEC is public, like most blockchains.", "Shielded ZEC keeps the trail private."] },
    { title: "SAPLING · 2018", scene: "sapling",
      lines: ["Shielded payments: as little as a few seconds and 40 MB.", "It paved the way for shielded ZEC on phones."] },
    { title: "YOU CHOOSE WHO SEES", scene: "viewkey",
      lines: ["A viewing key shows your shielded payments. It can't spend.", "Whoever holds it can pass it on."] },
    { title: "BLOSSOM · 2019", scene: "blossom",
      lines: ["Blocks came twice as often: about one every 75 seconds.", "Wait for the block, then move."] },
    { title: "ORCHARD · 2022", scene: "orchard",
      lines: ["NU5 brought Orchard: no trusted setup ceremony.", "Unified addresses: one address for many pools."] },
    { title: "IRONWOOD · 2026", scene: "ironwood",
      lines: ["28 Jul 2026: a new shielded pool, Ironwood, opened.", "Orchard can now only be spent from, not added to."] },
    { title: "HIDE IN A CROWD", scene: "crowd",
      lines: ["Each shielded pool is its own crowd.", "The more notes it holds, the more you blend in."] }
  ];

  var GOLD = "#eaba49", INK = "#fffaf0", ICE = "#bfe9ff", EDGE = "#0a0e08", WATER = "#0c1428", RED = "#c8412f";
  var CW = 320, CH = 160;
  var cur = null, loopId = 0, armedAt = 0, keysBound = false, shown = 0;

  function now() { return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now(); }
  function still() { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
  function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function lv(i) { return (window.LEVELS || LV || [])[i]; }
  function levels() { return window.LEVELS || LV || []; }
  function actOf(i) { var l = lv(i); return !l || l.bonus ? -1 : (l.act || 0); }
  function book() {
    if (!save.story || typeof save.story !== "object") save.story = {};
    if (!save.story.acts || typeof save.story.acts !== "object") save.story.acts = {};
    return save.story;
  }
  function seen(a) {
    if (save.story && save.story.acts && save.story.acts[a]) return true;
    var L_ = levels();
    for (var i = 0; i < L_.length; i++) if (!L_[i].bonus && (L_[i].act || 0) >= a && save.stars[i + 1] != null) return true;
    return false;
  }
  function actName(a) { return (F.acts && F.acts[a]) || ""; }

  function gate(i, then) {
    var a = actOf(i);
    if (a < 0 || !ACTS[a] || seen(a)) return false;
    book().acts[a] = true;
    if (typeof persist === "function") persist();
    show(a, function () { then(i); }, false);
    return true;
  }
  function mapLink(panel, i) {
    var a = actOf(i); if (a < 0 || !seen(a) || !panel || !document.createElement) return;
    try {
      var b = document.createElement("button"); b.className = "tlink wm-story"; b.id = "wmStory"; b.textContent = "▶ ACT " + (a + 1) + " STORY";
      b.addEventListener("click", function (e) { e.stopPropagation(); audioInit(); sfx("click"); show(a, function () { BH.worldmap.show(); BH.worldmap.select(i + 1, true); }, true); });
      panel.appendChild(b);
    } catch (e) {}
  }
  function show(a, then, replay) {
    var A = ACTS[a]; if (!A) { if (then) then(); return; }
    cur = { act: a, then: then || null, replay: !!replay, t0: now() };
    shown++;
    game.screen = "story";
    var hint = (typeof TOUCH !== "undefined" && TOUCH ? "TAP · " : "ANY KEY · ") + (replay ? "BACK" : "PLAY");
    showOverlay("story" + (still() ? " still" : ""),
      '<div class="story-card" role="dialog" aria-labelledby="storyTitle">' +
      '<canvas class="story-cv" id="storyCv" width="' + CW + '" height="' + CH + '" role="img" aria-label="' + esc(A.title) + '"></canvas>' +
      '<div class="story-kick">ACT ' + (a + 1) + ' · ' + esc(actName(a)) + '</div>' +
      '<h2 class="story-title" id="storyTitle">' + esc(A.title) + '</h2>' +
      A.lines.slice(0, 2).map(function (l) { return '<p class="story-line">' + esc(l) + '</p>'; }).join("") +
      '</div>' +
      '<div class="cta-hint story-hint" id="storyHint">' + esc(hint) + '</div>');
    armedAt = now() + 400;
    ov.onclick = function () { if (game.screen === "story" && now() >= armedAt) { sfx("click"); skip(); } };
    bindKeys();
    try { sizeCard(); } catch (e) {}
    try { paint(0); } catch (e) {}
    loopId++;
    if (!still() && typeof requestAnimationFrame === "function") requestAnimationFrame(loop(loopId));
  }
  function skip() {
    if (game.screen !== "story" || !cur) return false;
    var c = cur; cur = null; loopId++;
    ov.onclick = null;
    if (c.then) c.then(); else if (typeof showSelect === "function") showSelect();
    return true;
  }
  function bindKeys() {
    if (keysBound) return; keysBound = true;
    window.addEventListener("keydown", function (e) {
      if (game.screen !== "story") return;
      var k = e.key; if (k === "m" || k === "M") return;
      e.stopPropagation(); if (k === " " || k.indexOf("Arrow") === 0) e.preventDefault();
      if (e.repeat || now() < armedAt) return;
      skip();
    }, true);
  }
  function sizeCard() {
    var cv = $("storyCv"); if (!cv || !cv.style) return;
    var w = (window.innerWidth || 1440) - 32, h = window.innerHeight || 900;
    var k = Math.max(1, Math.min(Math.floor(Math.min(w, 720) / CW), Math.floor(h * 0.46 / CH)));
    cv.style.width = CW * k + "px"; cv.style.height = CH * k + "px";
  }
  function loop(id) {
    return function () {
      if (id !== loopId || game.screen !== "story" || !cur) return;
      var cv = $("storyCv"); if (!cv || cv.isConnected === false) return;
      try { paint((now() - cur.t0) / 1000); } catch (e) { return; }
      if (window.BH && BH.nextFrame) BH.nextFrame(loop(id), true); else requestAnimationFrame(loop(id));
    };
  }
  if (typeof window.addEventListener === "function") window.addEventListener("resize", function () { if (game.screen === "story") try { sizeCard(); } catch (e) {} });

  var g = null;
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function hash(x, y) { var h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function pine(x, y, h, c) {
    var w = Math.round(h * 0.62);
    R(x - 1, y - 3, 2, 3, "#2b1d14");
    for (var t = 0; t < 4; t++) { var tw = Math.round(w * (1 - t * 0.22)), ty = y - 3 - Math.round((t + 1) * h * 0.21); R(x - (tw >> 1), ty, tw, Math.round(h * 0.24), c[0]); R(x - (tw >> 1), ty, Math.max(1, tw >> 2), Math.round(h * 0.12), c[1]); }
  }
  function sky(top, bot, horizon) {
    for (var y = 0; y < horizon; y += 4) { var f = y / horizon; g.fillStyle = "rgb(" + Math.round(top[0] + (bot[0] - top[0]) * f) + "," + Math.round(top[1] + (bot[1] - top[1]) * f) + "," + Math.round(top[2] + (bot[2] - top[2]) * f) + ")"; g.fillRect(0, y, CW, 4); }
    for (var i = 0; i < 26; i++) { var sx = Math.floor(hash(i, 3) * CW), sy = Math.floor(hash(i, 5) * horizon * 0.8); R(sx, sy, 1, 1, i % 5 ? "rgba(255,250,240,.55)" : "rgba(255,250,240,.9)"); }
  }
  function ground(y, c1, c2) { R(0, y, CW, CH - y, c1); for (var i = 0; i < 90; i++) R(Math.floor(hash(i, 11) * CW), y + Math.floor(hash(i, 13) * (CH - y)), 2, 2, c2); }
  function treeline(y, c, seed) { for (var x = -6; x < CW + 12; x += 11) pine(x + Math.round((hash(x, seed) - 0.5) * 6), y + Math.round(hash(seed, x) * 4), 20 + Math.round(hash(x, seed + 1) * 12), c); }
  function water(x, y, w, h, t, deep) {
    for (var yy = 0; yy < h; yy += 3) { var f = yy / h, inset = Math.round(Math.pow(Math.abs(f - 0.5) * 2, 3) * w * 0.12); R(x + inset, y + yy, w - inset * 2, 3, deep || WATER); }
    for (var i = 0; i < 9; i++) { var gx = x + 8 + hash(i, 21) * (w - 24), gy = y + 4 + hash(i, 23) * (h - 8), s = Math.sin(t * 2 + i) > 0.2 ? 0.55 : 0.2; R(gx + Math.sin(t + i) * 2, gy, 6 + (i % 3) * 3, 1, "rgba(191,233,255," + s + ")"); }
  }
  function print(x, y, a) { var c = "rgba(234,224,200," + (a == null ? 0.7 : a) + ")"; R(x, y, 3, 4, c); R(x + 5, y - 3, 3, 4, c); }
  function block(x, y, s, on) {
    R(x - 1, y - 1, s + 2, s + 2, EDGE); R(x, y, s, s, on ? "#c99a3a" : "#3b3f38");
    R(x, y, s, 1, on ? "#f3d27a" : "#50554c"); R(x, y, 1, s, on ? "#f3d27a" : "#50554c"); R(x, y + s - 1, s, 1, on ? "#8a6420" : "#2a2d27");
  }
  function coin(x, y, c) { R(x - 2, y - 3, 4, 6, c || GOLD); R(x - 3, y - 2, 6, 4, c || GOLD); R(x - 1, y - 2, 1, 2, "rgba(255,255,255,.7)"); }
  function bitfoot(x, y, o) {
    o = o || {}; var K = window.BH && BH.cosmetics, S = window.BitfootSprite;
    var opts = { dir: o.dir || "right", state: o.state || "idle", t: o.t || 0, scale: o.scale || 1, alpha: 1 };
    if (K && K.draw) K.draw(g, x, y, opts); else if (S && S.draw) S.draw(g, x, y, opts);
    else { R(x - 8, y - 30, 16, 30, "#6E4250"); R(x - 4, y - 26, 8, 6, "#C9B2B9"); }
  }
  function hunter(x, y, t) {
    var fl = 0.7 + 0.3 * Math.sin(t * 9);
    g.fillStyle = "rgba(234,186,73," + (0.10 * fl).toFixed(3) + ")"; g.beginPath(); g.arc(x + 9, y - 14, 20, 0, 6.283); g.fill();
    R(x - 5, y - 26, 10, 18, "#3a2a22"); R(x - 4, y - 32, 8, 7, "#c9a489"); R(x - 7, y - 34, 14, 3, "#241812"); R(x - 4, y - 38, 8, 5, "#241812");
    R(x - 4, y - 8, 3, 8, "#241812"); R(x + 1, y - 8, 3, 8, "#241812"); R(x + 5, y - 20, 2, 8, "#3a2a22");
    R(x + 6, y - 14, 5, 6, "rgba(234,186,73," + fl.toFixed(2) + ")"); R(x + 7, y - 16, 3, 2, "#6b4a2e");
  }
  function head(x, y, t, i, dir) {
    var b = still() ? 0 : Math.round(Math.sin(t * 3 + i) * 1.5);
    g.save(); g.beginPath(); g.rect(x - 24, y - 48, 48, 48); g.clip();
    bitfoot(x, y + 25 + b, { dir: dir || (i % 2 ? "left" : "right"), state: "idle", t: t });
    g.restore();
    R(x - 11, y, 22, 1, "rgba(191,233,255,.7)"); R(x - 7, y + 2, 14, 1, "rgba(191,233,255,.3)");
  }
  function moon(x, y, r, bg) {
    for (var dy = -r; dy <= r; dy++) { var w = Math.round(Math.sqrt(r * r - dy * dy)); R(x - w, y + dy, w * 2, 1, "#fffaf0"); }
    for (dy = -r; dy <= r; dy++) { var w2 = Math.round(Math.sqrt(r * r - dy * dy)); R(x - w2 + Math.round(r * 0.7), y + dy - 2, w2 * 2, 1, bg); }
  }
  function key(x, y, s, c) {
    c = c || GOLD; s = s || 1;
    R(x, y, 10 * s, 10 * s, c); R(x + 3 * s, y + 3 * s, 4 * s, 4 * s, "rgba(12,20,40,.9)");
    R(x + 10 * s, y + 4 * s, 16 * s, 2 * s, c); R(x + 20 * s, y + 6 * s, 2 * s, 4 * s, c); R(x + 24 * s, y + 6 * s, 2 * s, 3 * s, c);
  }
  function eye(x, y, open) {
    R(x - 7, y - 2, 14, 4, INK); R(x - 5, y - 3, 10, 6, INK); R(x - 2, y - 2, 4, 4, "#07152B");
    if (!open) R(x - 7, y - 3, 14, 3, "#3a2a22");
  }

  var TREE = ["#0b1a0b", "#1f421f"], TREE2 = ["#0a1a15", "#1b4034"], IRON = ["#27303c", "#56657a"];
  var SCENES = {
    ledger: function (t) {
      sky([6, 10, 12], [20, 34, 24], 70); treeline(72, TREE, 1); ground(70, "#132713", "#183018");
      var bx = 214;
      for (var i = 0; i < 9; i++) print(26 + i * 20, 104 + (i % 2) * 6, 0.35 + i * 0.07);
      hunter(28, 108, t);
      bitfoot(bx, 112, { dir: "right", state: "walk", t: t });
      var n = 9, glow = Math.floor(t * 1.2) % n;
      for (i = 0; i < n; i++) {
        var x = 18 + i * 33, y = 132;
        if (i) R(x - 9, y + 9, 9, 2, "#7a5a1c");
        block(x, y, 20, true); R(x + 6, y + 9, 3, 4, "#5a3e10"); R(x + 11, y + 6, 3, 4, "#5a3e10");
        if (i === glow) { R(x - 2, y - 2, 24, 1, "rgba(255,241,184,.9)"); R(x - 2, y + 21, 24, 1, "rgba(255,241,184,.9)"); }
      }
    },
    sprout: function (t) {
      sky([8, 10, 16], [24, 30, 44], 64); moon(268, 22, 8, "rgb(13,17,26)");
      treeline(66, TREE2, 4); ground(64, "#10231d", "#15302a");
      water(150, 82, 170, 70, t);
      for (var i = 0; i < 6; i++) print(28 + i * 20, 118 - i * 3, 0.3 + i * 0.1);
      head(222, 122, t, 0, "right");
      var gr = still() ? 1 : Math.min(1, t / 1.2);
      R(64, 110 - Math.round(18 * gr), 2, Math.round(18 * gr), "#3f8a3a");
      if (gr > 0.6) { R(56, 96, 8, 4, "#5fbf4a"); R(66, 92, 8, 4, "#5fbf4a"); R(58, 95, 4, 2, "#8fe06a"); }
      R(58, 110, 14, 3, "#2b1d14");
    },
    twokinds: function (t) {
      sky([10, 12, 8], [30, 34, 20], 60); treeline(62, TREE, 7); ground(60, "#1a2112", "#222a17");
      water(176, 72, 150, 86, t);
      var a = Math.sin(t * 0.9) * 0.45 + 0.35, tx = 60, ty = 44;
      g.save(); g.beginPath(); g.rect(0, 0, 174, CH); g.clip();
      g.fillStyle = "rgba(234,186,73,.16)"; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + Math.cos(a - 0.22) * 170, ty + 60 + Math.sin(a - 0.22) * 90); g.lineTo(tx + Math.cos(a + 0.22) * 170, ty + 60 + Math.sin(a + 0.22) * 90); g.closePath(); g.fill(); g.restore();
      R(tx - 10, ty, 3, 70, "#6b4a2e"); R(tx + 7, ty, 3, 70, "#6b4a2e"); R(tx - 10, ty + 30, 20, 3, "#6b4a2e"); R(tx - 14, ty - 12, 28, 13, "#4a3320"); R(tx - 3, ty - 9, 6, 6, GOLD);
      for (var i = 0; i < 5; i++) { coin(96 + i * 16, 108 + (i % 2) * 8); print(92 + i * 16, 124 + (i % 2) * 4, 0.6); }
      for (i = 0; i < 4; i++) { var p = 0.25 + 0.2 * Math.sin(t * 2 + i); coin(214 + i * 24, 104 + (i % 2) * 14, "rgba(191,233,255," + p.toFixed(2) + ")"); }
      R(174, 60, 2, 100, "rgba(191,233,255,.25)");
    },
    sapling: function (t) {
      sky([10, 12, 18], [28, 36, 52], 70); treeline(72, TREE2, 9); ground(70, "#0f1b22", "#15252e");
      var gr = still() ? 1 : Math.min(1, t / 1.6);
      var h = Math.round(56 * gr);
      R(96, 132 - h, 4, h, "#6b4a2e");
      for (var i = 0; i < 4; i++) if (gr > 0.3 + i * 0.15) { var ly = 132 - h + 6 + i * 11; R(100, ly, 14 - i * 2, 5, "#5fbf4a"); R(82 + i * 2, ly + 4, 14 - i * 2, 5, "#4aa53c"); }
      R(84, 132, 28, 4, "#2b1d14");
      R(198, 48, 50, 90, EDGE); R(200, 50, 46, 86, "#232221"); R(203, 58, 40, 68, "#0c1428");
      for (var sy = 0; sy < 30; sy++) { var sw = sy < 18 ? 13 : Math.round(13 * (1 - (sy - 18) / 12)); R(223 - sw, 66 + sy, sw * 2, 1, GOLD); if (sw > 2) R(225 - sw, 66 + sy, sw * 2 - 4, 1, sy < 2 ? GOLD : ICE); }
      R(215, 80, 3, 3, WATER); R(218, 83, 3, 3, WATER); R(221, 80, 3, 3, WATER); R(224, 77, 3, 3, WATER); R(227, 74, 3, 3, WATER);
      R(212, 104, 22, 2, "rgba(191,233,255,.5)"); R(215, 110, 16, 2, "rgba(191,233,255,.35)");
      R(218, 129, 10, 2, "#50554c");
      bitfoot(160, 138, { dir: "right", state: "idle", t: t });
    },
    viewkey: function (t) {
      sky([12, 10, 20], [32, 28, 50], 62); treeline(64, ["#0b0a14", "#262344"], 12); ground(62, "#161524", "#1d1b2e");
      water(170, 84, 150, 70, t);
      for (var i = 0; i < 4; i++) print(200 + i * 26, 110 + (i % 2) * 10, 0.55);
      bitfoot(58, 126, { dir: "right", state: "idle", t: t });
      var bob = still() ? 0 : Math.round(Math.sin(t * 2.4) * 2);
      key(84, 92 + bob, 1.5);
      R(82, 88 + bob, 2, 2, "#fff1b8"); R(124, 86 + bob, 2, 2, "#fff1b8");
      hunter(150, 128, t);
      eye(150, 72, true);
      for (var s = 0; s < 5; s++) R(160 + s * 7, 76 + s * 5, 3, 2, "rgba(255,250,240,.45)");
      var f = (t * 0.35) % 1, cx = 170 + f * 110, cy = 40 - Math.sin(f * 3.14) * 16;
      g.globalAlpha = 0.35 + 0.4 * (1 - f); key(cx, cy, 1); g.globalAlpha = 1;
      eye(292, 34, true);
    },
    blossom: function (t) {
      sky([10, 10, 16], [36, 26, 40], 64); treeline(66, TREE, 14); ground(64, "#132713", "#183018");
      R(0, 18, 120, 4, "#4a3320"); R(60, 22, 50, 3, "#4a3320");
      for (var i = 0; i < 9; i++) { var bx = 10 + i * 12 + (i % 2) * 3, by = 12 + (i % 3) * 6; R(bx, by, 6, 6, "#f2a7c3"); R(bx + 2, by + 2, 2, 2, "#fff1b8"); }
      var n = still() ? 7 : 3 + Math.floor(t / 0.9) % 6, x0 = 28;
      for (i = 0; i < 8; i++) {
        var on = i < n, x = x0 + i * 34, y = 112;
        if (i) R(x - 12, y + 10, 12, 2, on ? "#7a5a1c" : "#2c302a");
        block(x, y, 22, on);
      }
      var cx = 270, cy = 60, a = still() ? 1.2 : ((t / 0.9) % 1) * 6.283 - 1.57;
      R(cx - 16, cy - 16, 32, 32, EDGE); R(cx - 14, cy - 14, 28, 28, "#232221"); R(cx - 1, cy - 12, 2, 3, INK); R(cx - 1, cy + 9, 2, 3, INK);
      for (var r = 0; r < 11; r++) R(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r - 1, 2, 2, GOLD);
      bitfoot(22, 104, { dir: "right", state: "idle", t: t });
    },
    orchard: function (t) {
      sky([10, 14, 10], [30, 44, 28], 58); ground(58, "#132713", "#183018");
      for (var i = 0; i < 4; i++) {
        var x = 30 + i * 80, y = 60;
        R(x - 2, y, 4, 22, "#4a3320"); R(x - 16, y - 20, 32, 22, "#1f5a24"); R(x - 12, y - 26, 24, 8, "#2a6e2c");
        for (var k = 0; k < 4; k++) R(x - 10 + k * 6, y - 16 + (k % 2) * 8, 3, 3, GOLD);
      }
      water(20, 118, 70, 36, t); water(124, 122, 70, 32, t);
      R(228, 118, 76, 34, "#1a2112"); for (i = 0; i < 4; i++) coin(240 + i * 16, 136, GOLD);
      var tx = 130, ty = 88, pulse = 0.5 + 0.5 * Math.sin(t * 3);
      R(tx - 1, ty - 1, 62, 18, EDGE); R(tx, ty, 60, 16, GOLD); R(tx + 4, ty + 6, 30, 3, "#5a3e10"); R(tx + 38, ty + 6, 8, 3, "#5a3e10"); R(tx + 50, ty + 5, 5, 5, "#5a3e10");
      var ends = [[55, 118], [159, 122], [266, 118]];
      ends.forEach(function (e, j) {
        var sx = tx + 10 + j * 20, sy = ty + 16;
        for (var s = 0; s <= 10; s++) { var f = s / 10; R(sx + (e[0] - sx) * f, sy + (e[1] - sy) * f, 2, 2, "rgba(234,186,73," + (0.35 + 0.5 * pulse).toFixed(2) + ")"); }
      });
    },
    ironwood: function (t) {
      sky([8, 10, 14], [26, 32, 42], 60); treeline(62, IRON, 17); ground(60, "#12161c", "#1a2028");
      water(14, 92, 100, 56, t, "#0b1220"); water(160, 78, 156, 78, t, "#10304c");
      for (var gl = 0; gl < 3; gl++) R(176 + gl * 44, 84 + (gl % 2) * 6, 22, 1, "rgba(191,233,255,.35)");
      R(24, 88, 80, 2, "rgba(140,150,160,.5)");
      for (var i = 0; i < 6; i++) R(24 + i * 16, 82, 2, 8, "#3a4656");
      var tx = 132, ty = 118, a = still() ? 0.6 : t * 2;
      R(tx - 1, ty - 16, 2, 30, "#6b7788");
      for (i = 0; i < 3; i++) { var aa = a + i * 2.094; R(tx + Math.cos(aa) * 8 - 1, ty - 6 + Math.sin(aa) * 3, 3, 3, "#aab4c2"); }
      for (i = 0; i < 5; i++) {
        var f = still() ? i / 5 : ((t * 0.28 + i / 5) % 1), x, y;
        if (f < 0.4) { x = 70 + (tx - 70) * (f / 0.4); y = 118; } else { x = tx + (230 - tx) * ((f - 0.4) / 0.6); y = 118 - Math.sin((f - 0.4) / 0.6 * 3.14) * 10; }
        coin(x, y, ICE);
      }
      head(270, 132, t, 2, "left");
    },
    crowd: function (t) {
      sky([8, 8, 14], [22, 24, 40], 56); treeline(58, ["#0b0a14", "#262344"], 19); ground(56, "#161524", "#1d1b2e");
      water(70, 76, 250, 82, t);
      var spots = [[118, 104], [168, 126], [206, 100], [244, 134], [282, 108], [136, 146]];
      spots.forEach(function (p, i) { head(p[0], p[1], t, i); });
      hunter(34, 126, t);
      var q = 0.5 + 0.5 * Math.sin(t * 4);
      R(26, 72, 18, 18, EDGE); R(27, 73, 16, 16, INK);
      g.fillStyle = "rgba(28,28,28," + (0.6 + 0.4 * q).toFixed(2) + ")"; g.font = "600 14px 'Plex Cond', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", 35, 82);
    }
  };
  function paint(t) {
    var cv = $("storyCv"); if (!cv || !cv.getContext || !cur) return;
    g = cv.getContext("2d"); if (!g) return;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, CW, CH);
    SCENES[ACTS[cur.act].scene](t);
  }

  var PIC_WORD = { prints: "trailFirst", bush: "bush", sprint: "dawn", shield: "lostYou", crowd: "crowd", amount: "amount",
    dogs: "dogOld", tower: "towerPassed", drone: "flagged", tracker: "boss" };
  function copyOf(n) { var l = lv(n - 1) || {}, f = (typeof levelCopy === "function" && levelCopy(n)) || {}; return { lesson: (l.copy && l.copy.lesson) || f.lesson || "", dev: f.dev || (l.copy && l.copy.dev) || "", mechanic: f.mechanic || (l.copy && l.copy.mechanic) || "" }; }
  function mechanicOf(n) { var l = lv(n - 1) || {}, c = copyOf(n); return c.mechanic && ICONS[c.mechanic] ? c.mechanic : l.pic && ICONS[l.pic] ? l.pic : "shield"; }
  function ideaOf(n) {
    var c = copyOf(n); if (c.lesson) return c.lesson;
    var l = lv(n - 1) || {}, w = F.words[PIC_WORD[l.pic]];
    return (w && w.zcash) || "";
  }
  function guideState() {
    var out = [];
    levels().forEach(function (l, i) { var n = i + 1; out.push({ n: n, title: l.title, unlocked: save.stars[n] != null, mechanic: mechanicOf(n), idea: ideaOf(n), hasDev: !!copyOf(n).dev }); });
    return out;
  }
  function guideHtml() {
    ensureSave();
    var cards = guideState(), got = cards.filter(function (c) { return c.unlocked; }).length;
    var html = cards.map(function (c) {
      var l = lv(c.n - 1), tag = l.bonus ? "BONUS" : "LEVEL " + lvLabel(c.n);
      if (!c.unlocked) return '<li class="fg-card locked" data-n="' + c.n + '"><canvas class="fg-cv" id="fgCv' + c.n + '" width="24" height="24" aria-hidden="true"></canvas>' +
        '<div class="fg-tag">' + tag + '</div><div class="fg-name">???</div><p class="fg-idea">Escape ' + (l.bonus ? "the bonus level" : "level " + lvLabel(c.n)) + ' to find this card.</p></li>';
      var dev = copyOf(c.n).dev;
      return '<li class="fg-card" data-n="' + c.n + '"><canvas class="fg-cv" id="fgCv' + c.n + '" width="24" height="24" aria-hidden="true"></canvas>' +
        '<div class="fg-tag">' + tag + '</div><div class="fg-name">' + esc(c.title) + '</div>' +
        '<p class="fg-idea">' + esc(c.idea) + '</p>' +
        (dev ? '<details class="fg-dev"><summary>THE REAL FACT</summary><p>' + esc(dev) + '</p></details>' : '') + '</li>';
    }).join("");
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(function () { cards.forEach(function (c) { try { paintIcon($("fgCv" + c.n), c.mechanic, !c.unlocked); } catch (e) {} }); });
    return '<section class="fg" id="fieldGuide" aria-label="Field guide">' +
      '<div class="fg-head"><div class="ld-kicker">FIELD GUIDE</div><div class="fg-count"><b>' + got + '</b> / ' + cards.length + ' found · every level you escape adds its card</div></div>' +
      '<ol class="fg-strip">' + html + '</ol></section>';
  }

  function tree(x, y) { R(x + 2, y + 6, 2, 4, "#6b4a2e"); R(x, y, 6, 7, "#2a6e2c"); R(x + 1, y - 2, 4, 3, "#2a6e2c"); }
  function pond(x, y, w, h) { R(x + 1, y, w - 2, h, WATER); R(x, y + 1, w, h - 2, WATER); R(x + 2, y + 2, Math.max(2, w >> 2), 1, ICE); }
  function dot(x, y, c) { R(x, y, 2, 2, c); }
  function mini(x, y, c) { R(x, y, 4, 5, c || "#6E4250"); R(x + 2, y + 1, 2, 2, "#C9B2B9"); }
  var ICONS = {
    prints: function () { print(3, 16, 1); print(12, 9, 1); R(4, 20, 16, 1, "rgba(234,186,73,.5)"); },
    bush: function () { R(3, 10, 18, 10, "#1d4a1f"); R(6, 7, 12, 5, "#2a5e2a"); R(8, 12, 3, 2, "#3f8a3a"); print(16, 21, 0.9); },
    sprint: function () { R(10, 8, 6, 8, "rgba(234,224,200,1)"); R(4, 9, 4, 1, INK); R(2, 12, 6, 1, INK); R(4, 15, 4, 1, INK); R(17, 14, 5, 6, "rgba(234,224,200,1)"); },
    shield: function () { pond(2, 8, 20, 12); R(6, 5, 12, 3, ICE); R(8, 3, 8, 2, ICE); },
    crowd: function () { mini(3, 10); mini(10, 8); mini(17, 11); R(2, 17, 20, 3, WATER); },
    amount: function () { for (var i = 0; i < 3; i++) R(3, 16 - i * 3, 7, 2, GOLD); for (i = 0; i < 2; i++) R(14, 16 - i * 3, 7, 2, ICE); R(11, 12, 2, 1, INK); },
    dogs: function () { R(4, 12, 12, 5, "#8a6a4a"); R(15, 9, 6, 5, "#8a6a4a"); R(19, 8, 2, 2, "#5a3e28"); R(5, 17, 2, 3, "#5a3e28"); R(13, 17, 2, 3, "#5a3e28"); R(2, 12, 2, 2, "#8a6a4a"); R(19, 11, 1, 1, EDGE); },
    tower: function () { R(5, 4, 8, 5, "#4a3320"); R(8, 5, 2, 2, GOLD); R(5, 9, 2, 12, "#6b4a2e"); R(11, 9, 2, 12, "#6b4a2e"); R(13, 6, 9, 2, "rgba(234,186,73,.6)"); R(13, 9, 9, 3, "rgba(234,186,73,.35)"); },
    drone: function () { R(7, 10, 10, 4, "#6b7788"); R(3, 8, 6, 1, "#aab4c2"); R(15, 8, 6, 1, "#aab4c2"); R(11, 12, 2, 2, RED); R(10, 17, 4, 4, "rgba(200,65,47,.6)"); },
    tracker: function () { R(8, 3, 8, 3, "#241812"); R(6, 6, 12, 2, "#241812"); R(8, 8, 8, 6, "#c9a489"); R(9, 10, 2, 1, RED); R(13, 10, 2, 1, RED); R(7, 14, 10, 8, "#3a2a22"); },
    memo: function () { R(4, 6, 16, 14, "#6f7478"); R(6, 9, 12, 1, INK); R(6, 12, 10, 1, INK); R(6, 15, 8, 1, INK); R(4, 20, 16, 2, WATER); },
    escort: function () { R(4, 6, 8, 14, "#6E4250"); R(8, 8, 4, 3, "#C9B2B9"); R(15, 12, 5, 8, "#8a5a6a"); R(17, 13, 3, 2, "#C9B2B9"); },
    dawn: function () { R(0, 16, 24, 8, "#132713"); R(7, 10, 10, 6, "#f0c14e"); R(9, 8, 6, 2, "#f0c14e"); R(3, 9, 2, 1, GOLD); R(19, 9, 2, 1, GOLD); R(11, 4, 2, 2, GOLD); print(4, 21, 1); },
    ranger: function () { key(1, 7, 0.75); R(2, 18, 20, 2, "#6b4a2e"); },
    matcher: function () { R(4, 4, 16, 16, "#e8dcc0"); R(12, 4, 1, 16, "#8a6420"); R(6, 8, 4, 1, "#3a2a22"); R(14, 8, 4, 1, "#3a2a22"); R(6, 12, 4, 1, "#3a2a22"); R(14, 12, 4, 1, RED); R(6, 16, 4, 1, "#3a2a22"); R(14, 16, 4, 1, "#3a2a22"); },
    burrow: function () { R(2, 14, 7, 4, EDGE); R(15, 8, 7, 4, EDGE); for (var i = 0; i < 4; i++) R(8 + i * 2, 14 - i * 2, 1, 1, "rgba(255,250,240,.5)"); },
    leaves: function () { R(4, 8, 6, 4, "#c8702f"); R(12, 12, 6, 4, "#d9923a"); R(7, 16, 5, 3, "#a85a24"); R(15, 6, 4, 3, "#e0a64a"); },
    dust: function () { coin(8, 12, GOLD); R(14, 6, 6, 5, RED); R(15, 7, 1, 1, INK); R(10, 9, 5, 1, RED); dot(18, 16, "rgba(234,186,73,.6)"); dot(4, 19, "rgba(234,186,73,.6)"); },
    crows: function () { R(6, 10, 12, 6, "#101014"); R(15, 7, 6, 5, "#101014"); R(21, 9, 2, 1, "#e0a64a"); R(18, 8, 1, 1, "#e8e8f0"); R(3, 12, 4, 2, "#101014"); R(9, 16, 1, 4, "#e0a64a"); R(13, 16, 1, 4, "#e0a64a"); },
    genesis: function () { block(5, 5, 14, true); R(10, 9, 4, 6, "#5a3e10"); R(11, 10, 2, 4, "#c99a3a"); },
    blocks: function () { block(1, 8, 6, true); R(8, 11, 2, 1, "#7a5a1c"); block(10, 8, 6, true); R(17, 11, 2, 1, "#2c302a"); block(19, 8, 4, false); },
    bridge: function () { R(0, 16, 24, 6, WATER); R(1, 11, 22, 1, "#8a6420"); for (var i = 0; i < 6; i++) R(2 + i * 4, 12, 3, 3, "#6b4a2e"); R(1, 6, 1, 6, "#6b4a2e"); R(22, 6, 1, 6, "#6b4a2e"); },
    camera: function () { R(4, 8, 14, 10, "#3a3f46"); R(18, 10, 4, 6, "#3a3f46"); R(8, 11, 5, 5, "#0c1428"); R(9, 12, 2, 2, ICE); R(5, 9, 2, 2, RED); R(9, 18, 2, 4, "#6b4a2e"); },
    seed: function () { R(5, 8, 14, 12, "#6f7478"); R(7, 6, 10, 2, "#6f7478"); R(9, 11, 6, 6, "#3f8a3a"); R(11, 9, 2, 2, "#8fe06a"); },
    disguise: function () { R(11, 2, 2, 20, "#6b4a2e"); R(7, 22, 10, 2, "#6b4a2e"); R(6, 5, 12, 2, "#6b4a2e"); R(12, 6, 7, 10, "#8a2a1c"); R(13, 16, 5, 2, "#8a2a1c"); },
    kyc: function () { R(2, 6, 20, 13, "#e8dcc0"); R(4, 9, 6, 7, "#8a8f96"); R(6, 10, 2, 2, "#c9a489"); R(12, 9, 8, 1, "#3a2a22"); R(12, 12, 6, 1, "#3a2a22"); R(12, 15, 7, 1, RED); },
    fakeden: function () { R(2, 12, 9, 8, "#4a3320"); R(4, 15, 5, 5, EDGE); R(13, 12, 9, 8, "#4a3320"); R(15, 15, 5, 5, "#d05030"); R(17, 6, 2, 4, RED); R(17, 11, 2, 1, RED); },
    auditor: function () { key(1, 5, 0.75); eye(17, 18, true); },
    flock: function () { for (var i = 0; i < 3; i++) { R(2 + i * 7, 8 + (i % 2) * 6, 6, 3, "#101014"); R(6 + i * 7, 7 + (i % 2) * 6, 2, 2, "#101014"); } eye(12, 20, true); },
    stakeout: function () { pond(1, 14, 7, 6); pond(10, 6, 13, 15); mini(14, 9); mini(18, 12); },
    a9relay: function () { R(3, 7, 18, 12, "#e8dcc0"); for (var i = 0; i < 9; i++) R(3 + i, 7 + i * 0.6, 2, 1, "#8a6420"), R(19 - i, 7 + i * 0.6, 2, 1, "#8a6420"); R(10, 11, 4, 4, RED); },
    a9lead: function () { mini(2, 12); mini(9, 12, "#8a5a6a"); mini(16, 12, "#8a5a6a"); print(2, 21, 0.4); },
    a9clear: function () { R(3, 14, 5, 6, "#8a6420"); R(3, 13, 5, 1, "#c99a3a"); R(14, 14, 5, 6, "#8a6420"); R(14, 13, 5, 1, "#c99a3a"); R(10, 4, 10, 3, "#aab4c2"); for (var i = 0; i < 5; i++) R(10 + i * 2, 7, 1, 1, "#aab4c2"); }
  };
  function paintIcon(cv, mech, locked) {
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d"); if (!ctx) return;
    var keep = g; g = ctx;
    try {
      g.imageSmoothingEnabled = false; g.clearRect(0, 0, 24, 24);
      (ICONS[mech] || ICONS.shield)();
      if (locked) { g.globalCompositeOperation = "source-in"; R(0, 0, 24, 24, "#34372f"); g.globalCompositeOperation = "source-over"; }
    } finally { g = keep; }
  }

  window.BH = window.BH || {};
  BH.story = { gate: gate, show: show, skip: skip, seen: seen, mapLink: mapLink, guideHtml: guideHtml, guideState: guideState, ACTS: ACTS,
    state: function () { return { screen: game.screen, act: cur ? cur.act : null, replay: cur ? cur.replay : null, shown: shown, seenActs: ACTS.map(function (a, i) { return seen(i); }) }; } };
})();
