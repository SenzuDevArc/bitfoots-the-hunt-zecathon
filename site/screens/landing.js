"use strict";
(function () {
  var ART = ["001", "002", "004", "006", "010", "014", "018", "022", "024", "026", "030", "034", "038", "039", "042", "046", "050",
    "054", "058", "062", "066", "070", "074", "078", "082", "086", "090", "094", "098", "102", "106", "110", "114", "118"];
  var LINKS = { discord: "https://discord.gg/ZsjKEBup4g", x: (window.FACTS && FACTS.ctas && FACTS.ctas.meet && FACTS.ctas.meet.url) || null };
  var view = "menu", sel = 0, picked = null, resizeWired = false;

  function pick(n) {
    var pool = ART.slice(), out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }
  var ART_W = {"102":30,"106":32,"110":29,"114":23,"118":28,"001":22,"002":22,"004":22,"006":22,"010":22,"014":22,"018":42,"022":30,"024":22,"026":34,"030":22,"034":24,"038":41,"039":34,"042":29,"046":22,"050":22,"054":42,"058":22,"062":25,"066":35,"070":27,"074":25,"078":27,"082":30,"086":25,"090":30,"094":22,"098":33};
  if (ART.indexOf("014") >= 0) { ART[ART.indexOf("014")] = "zec"; ART_W.zec = ART_W["014"]; }
  var PAIR_W = 56;
  function pickCrew() {
    var w = function (id) { return ART_W[id] || 99; };
    for (var tries = 0; tries < 400; tries++) {
      var p = pick(4);
      if (p.length === 4 && w(p[0]) + w(p[1]) <= PAIR_W && w(p[2]) + w(p[3]) <= PAIR_W) return p;
    }
    return ART.slice().sort(function (x, y) { return w(x) - w(y); }).slice(0, 4);
  }
  function narrow() { return (window.innerWidth || 1440) * (typeof trailZoom !== "undefined" ? trailZoom : 1) < 700; }
  function xUrl() { return LINKS.x || ""; }

  function items() {
    return [
      { id: "ldPlay", label: "PLAY", hint: "World map", primary: true, act: function () { showSelect(); } },
      { id: "ldHow", label: "HOW TO PLAY", hint: "Controls", act: function () { show("how"); } },
      { id: "ldProfile", label: "SELECT CHARACTER", hint: save.wallet + " ZEC saved", act: function () { show("profile"); } },
      { id: "ldBadges", label: "BADGES", hint: "Your medals", act: function () { show("badges"); } },
      { id: "ldSocials", label: "SOCIALS", hint: "X · Discord", act: function () { socials(true); } }
    ].filter(function (it) { return it.id !== "ldBadges" || BH.hall; });
  }
  function socialsHtml() {
    var x = xUrl(), d = LINKS.discord;
    var ICON = {
      ldX: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
      ldDiscord: '<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>' };
    var row = function (id, label, hint, url, go) {
      var inner = '<span class="ld-socic" aria-hidden="true"><svg viewBox="0 0 24 24">' + ICON[id] + '</svg></span><span class="ld-soct"><span class="ld-il">' + esc(label) + '</span><span class="ld-ih">' + esc(hint) + '</span></span>' + (url ? '<span class="ld-socgo">' + go + ' ↗</span>' : '');
      return url ? '<a class="ld-item" id="' + id + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + '</a>'
                 : '<button class="ld-item" id="' + id + '" disabled>' + inner + '</button>';
    };
    return '<div class="ld-pop" id="ldPop" role="dialog" aria-modal="true" aria-label="Socials"><div class="ld-popbox">' +
      '<div class="ld-kicker">SOCIALS</div>' +
      '<canvas class="ld-soccamp" id="ldSocCamp" width="360" height="124" aria-hidden="true"></canvas>' +
      '<div class="ld-popitems">' + row("ldX", "@BITFOOTS_", "On X", x, "FOLLOW") + row("ldDiscord", "DISCORD", d ? "The BitFoots den" : "Coming soon", d, "JOIN") + '</div>' +
      '<button class="ld-item ld-popclose" id="ldPopClose" aria-label="Close"><span class="ld-il">BACK</span></button></div></div>';
  }
  var popOpen = false;
  var SOC = { img: null, cells: {} };
  function socCamp() {
    var cv = document.getElementById("ldSocCamp"); if (!cv || cv.running) return;
    cv.running = true;
    if (!SOC.img) { SOC.img = new Image(); SOC.img.src = "assets/chars/moves.png"; }
    var img = SOC.img, cells = SOC.cells, g = cv.getContext("2d"), t0 = performance.now();
    var W = 58, H = 61, AX = 26, GY = 118, S = 2, P = 1.6, XL = 128, XR = 232, ROW = { a: 1, b: 4 };
    function cell(row, col, left) {
      var k = row + "_" + col + (left ? "L" : "");
      if (cells[k]) return cells[k];
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var cg = c.getContext("2d");
      if (left) { cg.translate(W, 0); cg.scale(-1, 1); }
      cg.drawImage(img, col * W, row * H, W, H, 0, 0, W, H);
      return cells[k] = c;
    }
    function kickCell(row, shear, left) {
      var k = "k" + row + "_" + shear + (left ? "L" : "");
      if (cells[k]) return cells[k];
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var cg = c.getContext("2d");
      cg.drawImage(img, 0, row * H, W, H, 0, 0, W, H);
      cg.clearRect(11, 48, 7, 9); cg.clearRect(18, 48, 1, 5); cg.clearRect(11, 57, 6, 4);
      for (var y = 48; y <= 56; y++) {
        if (shear < 0) { cg.drawImage(img, 20 * W, row * H + y, 19, 1, 0, y, 19, 1); continue; }
        cg.save(); cg.translate(31 + Math.round((y - 47) * shear), 0); cg.scale(-1, 1);
        cg.drawImage(img, 20 * W, row * H + y, 19, 1, 0, y, 19, 1);
        cg.restore();
      }
      if (left) { var m = document.createElement("canvas"); m.width = W; m.height = H; var mg = m.getContext("2d"); mg.translate(W, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); c = m; }
      return cells[k] = c;
    }
    function body(row, col, x, dir) {
      var c = col === "kick" ? kickCell(row, 1.4, dir < 0) : col === "wind" ? kickCell(row, -1, dir < 0) : cell(row, col, dir < 0), ax = dir < 0 ? W - AX : AX;
      g.drawImage(c, Math.round(x - ax * S), GY - H * S, W * S, H * S);
    }
    var RING = ["..####..", ".#....#.", "#......#", "#......#", "#......#", "#......#", ".#....#.", "..####.."];
    var SPOTS = [[2, 2], [5, 3], [3, 5]];
    function ball(cx, cy, f) {
      var s = 3, ox = Math.round(cx - 12), oy = Math.round(cy - 12);
      for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
        var inside = (x - 3.5) * (x - 3.5) + (y - 3.5) * (y - 3.5) < 12.5;
        if (RING[y][x] === "#") { g.fillStyle = "#1f130a"; g.fillRect(ox + x * s, oy + y * s, s, s); }
        else if (inside) { g.fillStyle = "#fff3d6"; g.fillRect(ox + x * s, oy + y * s, s, s); }
      }
      g.fillStyle = "#2c1d10";
      SPOTS.forEach(function (p) { var x = p[0], y = p[1]; for (var k = 0; k < f; k++) { var nx = 7 - y; y = x; x = nx; } g.fillRect(ox + x * s, oy + y * s, s, s); });
    }
    var loop = function (now) {
      if (!cv.isConnected || !popOpen) { cv.running = false; return; }
      g.clearRect(0, 0, 360, 124); g.imageSmoothingEnabled = false;
      if (!img.complete || !img.naturalWidth) { BH.nextFrame(loop, true); return; }
      var t = (now - t0) / 1000, p = (t % P) / P, toRight = Math.floor(t / P) % 2 === 0, d = toRight ? 1 : -1;
      var idle = Math.floor(t * 1000 / 110) % 8, kc = p < 0.1 ? "wind" : p <= 0.34 ? "kick" : null;
      body(ROW.a, toRight && kc ? kc : idle, 100, 1);
      body(ROW.b, !toRight && kc ? kc : (idle + 3) % 8, 260, -1);
      var K = 0.12, LAND = 0.8, q = p < K ? 0 : p < LAND ? (p - K) / (LAND - K) : 1;
      var x0 = toRight ? XL : XR, x = x0 + d * (XR - XL) * q;
      var h = p < K ? 0 : p < LAND ? Math.sin(Math.PI * q) * 30 : Math.sin(Math.PI * Math.min(1, (p - LAND) / 0.1)) * 4;
      g.fillStyle = "rgba(0, 0, 0, " + (0.35 - h / 200).toFixed(2) + ")";
      var sw = Math.round(16 - h / 5); g.fillRect(Math.round(x - sw / 2), GY - 2, sw, 3);
      if (p >= K && p < K + 0.1) {
        g.fillStyle = "#fff3d6";
        for (var i = 0; i < 3; i++) g.fillRect(Math.round(x - d * (18 + i * 3) - 3), GY - 26 + i * 8, 6, 2);
      }
      var f = p < K || p > LAND + 0.1 ? 0 : Math.floor(t * 12) % 4;
      ball(x, GY - 12 - h, toRight ? f : (4 - f) % 4);
      BH.nextFrame(loop, true);
    };
    requestAnimationFrame(loop);
  }
  function socials(open) {
    var p = document.getElementById("ldPop"); if (!p) return;
    popOpen = !!open; p.classList.toggle("on", popOpen); sel = 0;
    if (popOpen) socCamp();
    if (BH.router) BH.router.at(popOpen ? "socials" : "menu");
    sfx("click");
    if (popOpen) { var bs = buttons(), first = 0; while (first < bs.length - 1 && bs[first].disabled) first++; setSel(first, true); return; }
    setSel(Math.max(0, buttons().map(function (b) { return b.id; }).indexOf("ldSocials")), true);
  }
  function menuHtml() {
    return '<nav class="ld-menu" id="ldMenu" aria-label="Main menu">' + items().map(function (it, i) {
      var cls = "ld-item" + (it.primary ? " primary" : "") + (i === sel ? " cur" : "");
      var inner = '<span class="ld-il">' + esc(it.label) + (it.url && !it.sameTab ? ' <span aria-hidden="true">↗</span>' : '') + '</span><span class="ld-ih">' + esc(it.hint) + '</span>';
      if (it.url && !it.off) return '<a class="' + cls + '" id="' + it.id + '" data-i="' + i + '" href="' + esc(it.url) + '"' + (it.sameTab ? '' : ' target="_blank" rel="noopener"') + '>' + inner + '</a>';
      return '<button class="' + cls + '" id="' + it.id + '" data-i="' + i + '"' + (it.off ? " disabled" : "") + '>' + inner + '</button>';
    }).join("") + '</nav>';
  }
  function crewHtml() {
    if (!picked) picked = pickCrew();
    var fig = function (id, i, side) { return '<figure class="ld-bf ld-bf' + i + (side === "r" ? " flip" : "") + '"><img src="assets/cut/' + id + '.png" alt="BitFoot No. ' + +id + '"></figure>'; };
    return '<div class="ld-crew" id="ldCrew" data-picks="' + picked.join(",") + '">' +
      '<div class="ld-side l">' + fig(picked[0], 0, "l") + fig(picked[1], 1, "l") + '</div>' +
      '<div class="ld-side r">' + fig(picked[2], 2, "r") + fig(picked[3], 3, "r") + '</div></div>';
  }
  function crewScale() {
    var vh = window.innerHeight || 900;
    return Math.max(3, Math.floor(vh * (narrow() ? 0.34 : 0.62) / 44));
  }
  var GAP = 40, MIN_TALL = 0.45, EDGE = 16;
  function room(s) { var cs = getComputedStyle(s); return s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); }
  function sizeCrew() {
    var box = document.getElementById("ldCrew"); if (!box || !box.querySelectorAll) return;
    var imgs = Array.prototype.slice.call(box.querySelectorAll("img"));
    var pending = imgs.filter(function (i) { return !i.complete; });
    if (pending.length) { pending.forEach(function (i) { i.addEventListener("load", sizeCrew, { once: true }); i.addEventListener("error", sizeCrew, { once: true }); }); return; }
    imgs.forEach(function (i) { if (!i.naturalWidth && i.parentNode) i.parentNode.classList.add("gone"); });
    var sides = Array.prototype.slice.call(box.querySelectorAll(".ld-side")), vh = window.innerHeight || 900;
    var kMax = crewScale(), kMin = narrow() ? 3 : Math.max(3, Math.ceil(vh * MIN_TALL / 44)), k = kMax;
    var pairOf = function (s) { var p = s.querySelectorAll("img"), l = s.classList.contains("l"); return { inner: p[l ? 1 : 0], outer: p[l ? 0 : 1] }; };
    sides.forEach(function (s) {
      var p = pairOf(s), r = room(s);
      k = Math.min(k, Math.max(3, Math.floor(r / p.inner.naturalWidth)));
      if (!narrow()) { var most = Math.floor((r - GAP - EDGE) / Math.max(PAIR_W, p.inner.naturalWidth + p.outer.naturalWidth)); k = Math.min(k, Math.max(3, most)); }
    });
    sides.forEach(function (s) {
      var p = pairOf(s);
      var tight = !narrow() && p.inner.naturalWidth * k + GAP + p.outer.naturalWidth * k + EDGE > room(s);
      p.outer.parentNode.classList.toggle("out", narrow() || tight);
      [p.inner, p.outer].forEach(function (img) { img.width = img.naturalWidth * k; img.height = img.naturalHeight * k; });
    });
  }
  function frame(inner) {
    return '<div class="ld ld-m4 ld-v-' + view + '">' +
      '<canvas class="ld-forest" id="ldForest" aria-hidden="true"></canvas>' +
      '<footer class="ld-footer">' +
      '<p class="ld-copy">© 2026 BitFoots. All rights reserved.</p></footer>' +
      '<div class="ld-main">' +
      '<div class="ld-brand"><img class="logo" src="assets/ui/logo.svg" alt="BitFoots"><div class="ld-name">' + esc(window.GAME_NAME || "THE HUNT") + '</div></div>' +
      inner + (view === "menu" ? '<p class="ld-press" aria-hidden="true">' + pressText() + '</p>' : "") + '</div>' +
      crewHtml() + (view === "menu" ? socialsHtml() : "") + '</div>';
  }


  function isTouch() { shownTouch = typeof touchUi === "function" ? touchUi() : TOUCH; return shownTouch; }
  function pressText() { return isTouch() ? "TAP PLAY TO START" : "PRESS ENTER TO PLAY"; }
  function howHtml() {
    var touch = isTouch();
    var rows = touch
      ? [["DRAG", "A stick appears under your thumb. Push further to go faster"], ["LIFT", "Stop, instantly"], ["HOLD SPRINT", "Sprint: bigger steps, but louder"], ["DECOY", "Throw a decoy (the button, from Act 3)"], ["❚❚", "Pause"]]
      : [["WASD / ARROWS", "Walk"], ["SHIFT", "Sprint: bigger steps, but louder"], ["E", "Throw a decoy (from Act 3)"], ["ESC", "Pause"], ["M", "Sound on / off"]];
    var B = window.LANDING_BOARD;
    if (B) {
      var kb = BH.binds;
      var cap = function (a) { return '<button class="ld-cap" data-bind="' + a + '" aria-label="Change the key for ' + a + '">' + esc(kb.name(a)) + '</button>'; };
      var keyRows = touch ? rows.map(function (r) { return '<div class="ld-krow"><span class="ld-kp"><kbd class="ld-cap">' + esc(r[0]) + '</kbd><span>' + esc(r[1]) + '</span></span></div>'; }).join("")
        : B.keys.map(function (row) {
          return '<div class="ld-krow">' + row.map(function (p) { return '<span class="ld-kp"><span class="ld-caps' + (p[0].length === 4 ? ' ld-wasd' : '') + '">' + p[0].map(cap).join("") + '</span><span>' + esc(p[1]) + (p[2] ? '<span class="ld-help" tabindex="0" role="button" aria-label="What does ' + esc(p[1]) + ' do?">?<span class="ld-helpbox" role="tooltip">' + esc(p[2]) + '</span></span>' : '') + '</span></span>'; }).join("") + '</div>';
        }).join("");
      return '<section class="ld-panel ld-board" aria-label="How to play"><div class="ld-kicker">HOW TO PLAY</div>' +
        '<div class="ld-story">' + B.story.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join("") + '</div>' +
        '<div class="ld-krows">' + keyRows + '</div>' +
        (touch ? '' : '<p class="ld-rebind" id="ldRebind">CLICK A KEY TO CHANGE IT' + (kb.custom() ? ' <button class="ld-reset" id="ldReset">RESET</button>' : '') + '</p>') +
        (B.tip ? '<p class="ld-tip">' + esc(B.tip) + '</p>' : '') + (touch || !B.talk ? '' : '<p class="ld-talk">' + esc(B.talk) + '</p>') +
        '<div class="ld-back"><button class="ld-item primary cur" id="ldGo" data-i="0"><span class="ld-il">PLAY</span></button>' +
        '<button class="ld-item" id="ldBack" data-i="1"><span class="ld-il">BACK</span></button></div></section>';
    }
    return '<section class="ld-panel" aria-label="How to play"><div class="ld-kicker">HOW TO PLAY</div>' +
      '<p class="ld-goal">' + esc((window.LANDING_HOW || [])[0] || "Grab the gold ZEC, then carry it to the den. Hunters never see you. They read the footprints you leave.") + '</p>' +
      '<p class="ld-goal dim">' + esc((window.LANDING_HOW || [])[1] || "Step into the water and you are shielded: no footprints, nothing to follow.") + '</p>' +
      '<dl class="ld-keys">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join("") + '</dl>' +
      '<div class="ld-back"><button class="ld-item primary cur" id="ldGo" data-i="0"><span class="ld-il">PLAY</span></button>' +
      '<button class="ld-item" id="ldBack" data-i="1"><span class="ld-il">BACK</span></button></div></section>';
  }

  function profileStats() {
    ensureSave();
    var n = LV.length, done = 0, medals = 0, sweeps = 0, best = 0, bestAll = true;
    for (var i = 1; i <= n; i++) {
      if (save.stars[i] != null) done++;
      var m = save.medals && save.medals[i];
      if (m) medals += (m.home ? 1 : 0) + (m.par ? 1 : 0) + (m.unseen ? 1 : 0); else medals += save.stars[i] || 0;
      if (save.badges.sweep && save.badges.sweep[i]) sweeps++;
      if (save.best[i]) best += save.best[i]; else bestAll = false;
    }
    return { wallet: save.wallet, done: done, n: n, medals: medals, sweeps: sweeps, total: bestAll && best ? best : null };
  }
  var RANKS = [[0, "SAPLING"], [1, "SCOUT"], [5, "PRINT-DODGER"], [10, "SHADOW"], [15, "LEGEND OF THE LAKE"]];
  function rankOf(done) { var r = RANKS[0][1]; RANKS.forEach(function (x) { if (done >= x[0]) r = x[1]; }); return r; }
  function actsOf() {
    var nActs = 1, acts = [];
    LV.forEach(function (l) { nActs = Math.max(nActs, (l.act || 0) + 1); });
    for (var a = 0; a < nActs; a++) acts.push({ a: a, name: (F && F.acts && F.acts[a]) || "", lv: [] });
    LV.forEach(function (l, i) { acts[l.bonus ? nActs - 1 : (l.act || 0)].lv.push(i + 1); });
    return acts.filter(function (x) { return x.lv.length; });
  }
  function trailHtml() {
    var open = typeof unlockedUpTo === "function" ? unlockedUpTo() : 1, pages = "", dots = "";
    var stamp = function (i, k) {
      var lv = LV[i - 1], done = save.stars[i] != null, m = save.medals && save.medals[i];
      var got = m ? [m.home, m.par, m.unseen] : [0, 1, 2].map(function (q) { return (save.stars[i] || 0) > q; });
      var st = done ? "done" : i <= open ? "next" : "locked";
      return '<li class="pf-lv ' + st + (lv.bonus ? " bonus" : "") + (i % 2 ? " up" : " dn") + '" data-n="' + i + '" title="' + esc((lv.bonus ? "Bonus · " : "Level " + i + " · ") + lv.title) + '">' +
        '<span class="pf-stamp"><span class="pf-t">' + esc(lv.title) + '</span><span class="pf-tok"><span class="pf-n">' + (lv.bonus ? "★" : i) + '</span>' +
        '<span class="pf-pips">' + got.map(function (g) { return '<i class="' + (g ? "on" : "") + '"></i>'; }).join("") + '</span></span></span></li>';
    };
    actsOf().forEach(function (act, p) {
      var done = act.lv.filter(function (i) { return save.stars[i] != null; }).length;
      pages += '<section class="pf-page pf-a' + (act.a % 5) + (done === act.lv.length ? " clear" : "") + '" data-p="' + p + '" aria-label="' + esc("Act " + (act.a + 1) + (act.name ? ": " + act.name : "")) + '">' +
        '<header class="pf-sign"><span class="pf-actn">ACT ' + (act.a + 1) + '</span>' + (act.name ? '<span class="pf-actname">' + esc(act.name) + '</span>' : "") +
        '<span class="pf-actp">' + done + ' / ' + act.lv.length + '</span></header>' +
        '<ol class="pf-trail">' + act.lv.map(stamp).join("") + '</ol></section>';
      dots += '<button class="pf-dot" data-p="' + p + '" aria-label="' + esc("Act " + (act.a + 1)) + '"></button>';
    });
    if (BH.story && typeof BH.story.guideHtml === "function") {
      var p2 = (pages.match(/class="pf-page /g) || []).length;
      pages += '<section class="pf-page pf-guide" data-p="' + p2 + '" data-slot="story-guide" aria-label="Field guide">' + BH.story.guideHtml() + '</section>';
      dots += '<button class="pf-dot guide" data-p="' + p2 + '" aria-label="Field guide"></button>';
    }
    return '<div class="pf-jr"><div class="ld-kicker pf-sub">YOUR JOURNEY</div>' +
      '<div class="pf-strip"><div class="pf-journey" id="pfJourney" tabindex="0" role="region" aria-label="Your journey, act by act, scroll sideways">' + pages + '</div>' +
      '<button class="pf-arrow pv" id="pfPrev" aria-label="Previous act" disabled>‹</button><button class="pf-arrow nx" id="pfNext" aria-label="Next act">›</button></div>' +
      '<div class="pf-dots" id="pfDots">' + dots + '</div></div>';
  }
  function profileHtml() {
    var s = profileStats();
    var plaque = function (ic, v, k) { return '<div class="ld-stat pf-plq"><span class="pf-ic ' + ic + '" aria-hidden="true"></span><span class="v">' + esc(v) + '</span><span class="k">' + esc(k) + '</span></div>'; };
    return '<section class="ld-panel pf" aria-label="Profile">' +
      '<div class="pf-head"><div class="ld-kicker">PROFILE · THIS BROWSER</div><div class="pf-rank">RANK · <b>' + esc(rankOf(s.done)) + '</b></div></div>' +
      '<div class="pf-me">' +
      '<div class="pf-hero"><div class="hero" id="ldHero"></div><div class="pf-stump" aria-hidden="true"></div></div>' +
      '<div class="ld-stats pf-stats">' +
      plaque("coin", s.wallet + " ZEC", "saved for the Wardrobe") + plaque("map", s.done + " / " + s.n, "levels escaped") +
      plaque("medal", s.medals + " / " + (s.n * 3), "medals") + plaque("sweep", String(s.sweeps), "clean sweeps") +
      (s.total ? plaque("clock", fmtTime(s.total), "every best, added up") : "") + '</div></div>' +
      trailHtml() +
      '<div class="pf-foot"><p class="ld-goal dim">Your progress lives in this browser only: no account, nothing sent anywhere.</p>' +
      '<div class="ld-back pf-back"><button class="ld-item primary cur" id="ldWard" data-i="0"><span class="ld-il">WARDROBE</span></button>' +
      '<button class="ld-item" id="ldBack" data-i="1"><span class="ld-il">BACK</span></button></div></div></section>';
  }
  function wireJourney() {
    var strip = document.getElementById("pfJourney");
    if (!strip || !strip.querySelectorAll || !strip.getBoundingClientRect) return;
    var pages = Array.prototype.slice.call(strip.querySelectorAll(".pf-page"));
    var dots = Array.prototype.slice.call(document.querySelectorAll(".pf-dot"));
    var prev = document.getElementById("pfPrev"), next = document.getElementById("pfNext");
    if (!pages.length) return;
    var leftOf = function (el) { return el.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft; };
    var max = function () { return strip.scrollWidth - strip.clientWidth; };
    var go = function (p, smooth) {
      p = Math.max(0, Math.min(pages.length - 1, p));
      var x = Math.min(max(), Math.round(leftOf(pages[p])));
      if (strip.scrollTo) strip.scrollTo({ left: x, behavior: smooth ? "smooth" : "auto" }); else strip.scrollLeft = x;
    };
    var at = function () {
      var sl = strip.scrollLeft, best = 0;
      pages.forEach(function (pg, i) { if (leftOf(pg) <= sl + 8) best = i; });
      return best;
    };
    var sync = function () {
      var p = at(), end = strip.scrollLeft >= max() - 2;
      if (prev) prev.disabled = strip.scrollLeft <= 2;
      if (next) next.disabled = end;
      var sr = strip.getBoundingClientRect();
      dots.forEach(function (d, i) { var b = pages[i] && pages[i].getBoundingClientRect(); d.classList.toggle("cur", !!b && b.left < sr.right - b.width * 0.5 && b.right > sr.left + b.width * 0.5); });
      return p;
    };
    var cur = strip.querySelector(".pf-lv.next"), start = 0;
    if (cur) pages.forEach(function (pg, i) { if (pg.contains(cur)) start = i; });
    go(start, false); sync();
    strip.addEventListener("scroll", sync, { passive: true });
    if (prev) prev.addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); go(at() - 1, true); });
    if (next) next.addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); go(at() + 1, true); });
    dots.forEach(function (d) { d.addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); go(+d.dataset.p, true); }); });
    var lastWheel = 0;
    strip.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || !e.deltaY) return;
      var dir = e.deltaY > 0 ? 1 : -1;
      if ((dir > 0 && strip.scrollLeft >= max() - 2) || (dir < 0 && strip.scrollLeft <= 2)) return;
      e.preventDefault();
      var now = Date.now(); if (now - lastWheel < 350) return; lastWheel = now;
      go(at() + dir, true);
    }, { passive: false });
    if (window.addEventListener) window.addEventListener("resize", function once() { if (!strip.isConnected) { window.removeEventListener("resize", once); return; } sync(); });
  }

  function show(v) {
    var at = v === "badges" && BH.hall ? "badges" : null; if (at) v = "profile";
    view = v === "how" || v === "profile" ? v : "menu"; sel = 0; listen = null;
    game.screen = "title"; ov.onclick = null;
    if (BH.router) BH.router.at(at || view);
    if (view === "profile" && BH.hall) {
      showOverlay("title landing hall-on", BH.hall.html());
      BH.hall.mount({ at: at, back: function () { show("menu"); }, more: function () { shopTab = "wardrobe"; showShop(function () { show("profile"); }); } });
      return;
    }
    var inner = view === "how" ? howHtml() : view === "profile" ? profileHtml() : menuHtml();
    showOverlay("title landing", frame(inner));
    if (BH.forest) BH.forest.start(document.getElementById("ldForest"));
    popOpen = false;
    if (view === "menu") {
      items().forEach(function (it) { if (!it.url && !it.off) bind(it.id, it.act); });
      bind("ldPopClose", function () { socials(false); });
      var pop = document.getElementById("ldPop");
      if (pop) pop.addEventListener("click", function (e) { if (e.target === pop) socials(false); });
    }
    if (view !== "profile") {
      sizeCrew();
      if (!resizeWired && window.addEventListener) { resizeWired = true; window.addEventListener("resize", sizeCrew); }
    }
    if (view !== "menu") {
      bind("ldBack", function () { show("menu"); });
      if (view === "how") { bind("ldGo", function () { showSelect(); }); wireBinds(); }
      else {
        bind("ldWard", function () { shopTab = "wardrobe"; showShop(function () { show("profile"); }); });
        mountHero("ldHero", "idle");
        wireJourney();
      }
    }
    wireHover();
  }
  function buttons() { return ov.querySelectorAll ? Array.prototype.slice.call(ov.querySelectorAll(popOpen ? ".ld-pop .ld-item" : ".ld-main .ld-item")) : []; }
  function wireHover() {
    Array.prototype.forEach.call(ov.querySelectorAll ? ov.querySelectorAll(".ld-item") : [], function (b) {
      var at = function () { var i = buttons().indexOf(b); if (i >= 0 && !b.disabled) setSel(i, false); };
      b.addEventListener("mouseenter", at); b.addEventListener("focus", at);
    });
  }
  function setSel(i, focus) {
    var bs = buttons(); if (!bs.length) return;
    sel = (i + bs.length) % bs.length;
    bs.forEach(function (b, j) { b.classList.toggle("cur", j === sel); });
    if (focus && bs[sel].focus) bs[sel].focus();
  }
  function move(d) {
    var bs = buttons(), i = sel;
    for (var t = 0; t < bs.length; t++) { i = (i + d + bs.length) % bs.length; if (!bs[i].disabled) break; }
    if (i !== sel) sfx("hover");
    setSel(i, true);
  }
  var listen = null;
  function caps() { return document.querySelectorAll ? Array.prototype.slice.call(document.querySelectorAll(".ld-cap[data-bind]")) : []; }
  function paintCaps(no) {
    caps().forEach(function (c) {
      var on = c.dataset.bind === listen;
      c.textContent = on ? (no ? "NOT THAT KEY" : "PRESS A KEY") : BH.binds.name(c.dataset.bind);
      c.classList.toggle("listen", on); c.classList.toggle("no", on && !!no);
    });
    var line = document.getElementById("ldRebind");
    if (line) {
      line.innerHTML = (listen ? "ESC TO CANCEL" : "CLICK A KEY TO CHANGE IT") + (BH.binds.custom() && !listen ? ' <button class="ld-reset" id="ldReset">RESET</button>' : '');
      bind("ldReset", function () { BH.binds.reset(); listen = null; paintCaps(); });
    }
  }
  function fitBoard() {
    var b = document.querySelector && document.querySelector(".ld-board"), brand = document.querySelector && document.querySelector(".ld-brand");
    if (!b || !b.style) return;
    b.style.zoom = "";
    var h = b.getBoundingClientRect().height, top = brand ? brand.getBoundingClientRect().height + 20 : 0;
    b.style.zoom = String(Math.max(1, Math.min(1.15, (window.innerHeight - top - 64 / (typeof trailZoom !== "undefined" ? trailZoom : 1)) / h)));
  }
  function wireBinds() {
    listen = null;
    fitBoard();
    if (!wireBinds.resize && window.addEventListener) { wireBinds.resize = true; window.addEventListener("resize", function () { if (view === "how") fitBoard(); }); }
    caps().forEach(function (c) { c.addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); listen = c.dataset.bind; paintCaps(); }); });
    bind("ldReset", function () { BH.binds.reset(); listen = null; paintCaps(); });
  }
  function key(k, e) {
    if (view === "profile" && BH.hall && BH.hall.on()) {
      if (k === "Escape") { if (BH.hall.esc && BH.hall.esc()) return true; sfx("click"); show("menu"); return true; }
      return BH.hall.key(k);
    }
    if (listen) {
      if (k === "Escape") { listen = null; paintCaps(); return true; }
      if (BH.binds.usable(k)) { BH.binds.set(listen, k); listen = null; sfx("click"); paintCaps(); }
      else { paintCaps(true); setTimeout(function () { if (listen) paintCaps(); }, 700); }
      return true;
    }
    if (k === "Tab" && popOpen) {
      var all = buttons(), on = all.filter(function (b) { return !b.disabled; });
      if (!on.length) return true;
      var at = on.indexOf(document.activeElement), to = e && e.shiftKey ? (at <= 0 ? on.length - 1 : at - 1) : (at + 1) % on.length;
      setSel(all.indexOf(on[to]), true);
      return true;
    }
    if (k === "ArrowDown" || k === "s" || k === "S") { move(1); return true; }
    if (k === "ArrowUp" || k === "w" || k === "W") { move(-1); return true; }
    if (k === "Enter" || k === " ") { var b = buttons()[sel]; if (b && !b.disabled) b.click(); return true; }
    if (k === "Escape" && popOpen) { socials(false); return true; }
    if (k === "Escape" && view !== "menu") { sfx("click"); show("menu"); return true; }
    return false;
  }

  var shownTouch = false;
  window.addEventListener("bh-input-mode", function () {
    setTimeout(function () {
      var before = shownTouch;
      if (game.screen !== "title" || before === isTouch()) return;
      if (view === "how") { var was = sel; show("how"); setSel(was, true); return; }
      var p = document.querySelector(".ld-press"); if (p) p.textContent = pressText();
    }, 0);
  }, true);

  window.BH = window.BH || {};
  BH.landing = { show: show, key: key, listening: function () { return !!listen; }, picks: function () { return picked ? picked.slice() : null; }, ART: ART, narrow: narrow, socials: socials };
})();
