(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  var FEATS = ["stamps", "river", "bank", "edge", "trail", "bonus"];
  var X = window.TRAIL_EXTRA_LEVELS = window.TRAIL_EXTRA_LEVELS || {};

  X.bonus1 = { act: 3, tid: "bonus1", title: "DUSTING", need: 3, par: 120, bank: true, amounts: true, noUnmatched: true,
    features: FEATS.slice(), elders: ["oak", "sly"],
    bonus: { post: [19, 4], box: [17, 2], from: 1 },
    hunters: [{ type: "hunter", patrol: [[12, 1], [12, 9]] }, { type: "hunter", patrol: [[26, 1], [26, 9]] }],
    hints: ["need", "home"],
    map: [
      "##############################",
      "#.c......#.....~~~~~~~~~.....#",
      "#..P.....#.....~~~~~~~~~.....#",
      "#.....c........~~~~~~~~~..##.#",
      "#..............~~~~U~~~~.....#",
      "#....##........~~~~~~~~~.....#",
      "#....##..c.....~~~~~~~~~.....#",
      "#.c............~~~~~~~~~.....#",
      "#..............#YYYYYYY#.....#",
      "#..............#~~~~~~D#.....#",
      "##############################"],
    term: "",
    copy: { goal: "Pay the post 1 coin from the waters. Then bring 3 coins to the den.",
      lesson: "Someone can drop tiny coins into your wallet. Spend them together with your own, and the sender can tell when you paid.",
      dev: "A payment that spends lots of tiny coins at once stands out, even fully shielded." } };

  X.bonus2 = { act: 3, tid: "bonus2", title: "THE EXCHANGE", need: 3, par: 180, bank: true, amounts: true, noUnmatched: true, amountLink: false, startCarry: 3,
    features: FEATS.slice(), elders: ["oak", "sly"],
    bonus: { desk: [27, 4], spot: [27, 5], post: [16, 10], gateCol: 14 },
    npcs: [{ id: "merchant", at: [17, 10], water: true }], pay: 1,
    talks: [{ at: [16, 10], r: 1.6, id: "machine", when: function () { return !!(BH.bonus && BH.bonus.info().paid) && player.carry >= 1; } }],
    hunters: [{ type: "hunter", patrol: [[18, 1], [18, 7]] }, { type: "hunter", patrol: [[22, 7], [22, 1]] },
      { type: "dog", patrol: [[23, 2], [36, 2], [36, 5], [33, 5], [33, 2]] }, { type: "hunter", patrol: [[40, 1], [40, 12]] }],
    hints: ["need", "home"],
    map: [
      "##############################################",
      "#~~~~~~~~~~~~~#......#.........c.....~~...Y..#",
      "#~~P~~~~~~~~~~.......#...............~~...Y.D#",
      "#~~~~~~~~~~~~~#............ê..............YYY#",
      "#~~~~~~~~~~~~~#.##......~~.ê..#.#.....#......#",
      "#~~~~~~~~~~~~~#.##......~~....#.#.....#......#",
      "#~~~~~~~~~~~~~...................~~~~........#",
      "#~~~~~~~~~~~~~#..................~~~~........#",
      "#~~~~~~~~~~~~~###################~~~~.....#..#",
      "#~~~~~~~~~~~~~Y~~~~~~~~~~~~~~~~~~~~~~.....#..#",
      "#~~~~~~~~~~~~~Y~U~~~~~~~~~~~~~~~~~~~~........#",
      "#~~~~~~~~~~~~~Y~~~~~~~~~~~~~~~c~~~~~~........#",
      "#~~~~~~~~~~~~~Y~~~~~~~~~~~~~~~~~~~~~~........#",
      "##############################################"],
    term: "",
    copy: { goal: "Pay the exchange 1 coin. Pay the merchant to get out. Then bring 3 coins to the den.",
      lesson: "An exchange only takes public coins. Climb out, pay, and get straight back in the waters. The less time you spend out, the fewer footprints they can follow.",
      dev: "On the chain, that payment looks like any other public payment. Exchange addresses start with tex1: they only take coins sent from a public address, so the exchange can see where they came from." } };

  X.bonus3 = { act: 3, tid: "bonus3", title: "THE LYING POST OFFICE", finale: true, need: 3, par: 240, bank: true, amounts: true, linkCalls: false, bankHides: true, noUnmatched: true,
    features: FEATS.concat(["mail", "fungags"]), elders: ["oak", "sly"],
    bonus: { tower: [44, 4], watch: 4 },
    mail: { post: [8, 7],
      spots: [[19, 2], [23, 3], [20, 7], [24, 6], [21, 10], [24, 11], [13, 1], [47, 13]],
      mine: [3, 4, 6, 7], omit: [6, 7], fakes: [1, 5],
      memos: ["THANKS FOR THE FISH", "FOR YOUR NEW BOAT", "SEE YOU AT THE DEN"] },
    hunters: [{ type: "hunter", patrol: [[16, 1], [16, 6]] }, { type: "hunter", patrol: [[22, 4], [30, 4], [30, 7], [22, 7]] },
      { type: "hunter", patrol: [[26, 11], [20, 11]], sleep: true }, { type: "dog", patrol: [[32, 7], [38, 7]] }],
    hints: ["need", "home"],
    map: [
      "##################################################",
      "#..........#.......................#..##.........#",
      "#........b.#...............##..b...#..##.........#",
      "#.....##...#...............##......#.............#",
      "#.....##...#.......................#.............#",
      "#............##......b.............#.............#",
      "#............##....................#.............#",
      "#..P.........................................##..#",
      "#.................#........b.................##..#",
      "#..............b..#....b...........#.............#",
      "#....##....#.......................#....##.......#",
      "#..........#.......................#....##....b..#",
      "#........b..~~~~~~~~~~~~~~~~~~~~~~.#..b..........#",
      "#.D.........~~~~~~~~~~~~~~~~~~~~~~.#.............#",
      "#..................................#.............#",
      "##################################################"],
    term: "",
    copy: { goal: "Get your mail. Some of it is fake. Check it at your own Zebra Node, then bring 3 coins to the den.",
      lesson: "A post office you don't run can hide your mail and show you less than you have. It can't take your coins.",
      dev: "A wallet that asks a server only sees what the server sends. A full node keeps and checks the chain itself." } };

  if (!BH.features) return;

  var S = null, key = null;
  function R(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(x, y, w, h); }
  function px(at) { return { x: (at[0] + 0.5) * T, y: (at[1] + 0.5) * T }; }
  function tid() { return typeof L !== "undefined" && L && /^bonus[1-3]$/.test(L.tid || "") ? L.tid : null; }
  function cfg() { return (L && L.bonus) || {}; }
  function d2(p) { return Math.hypot(p.x - player.x, p.y - player.y); }
  function fresh() {
    S = { t: tid(), dust: 0, aside: 0, dusted: false, fly: [], paid: false, dirty: false, bounces: 0, out: false, outAt: null,
      synced: false, checked: false, got: 0, ask: null, act: null, checks: [], watch: [], beam: null };
  }
  function sync() {
    var k = game.levelIdx + ":" + levelStart;
    if (k !== key) { key = k; fresh(); }
    return S;
  }
  function live() { return !!tid() && !!S && game.phase === "play"; }
  function fly(from, to, col, t, n, after) { S.fly.push({ a: { x: from.x, y: from.y }, b: to, col: col, t0: simTime, dur: t || 0.6, n: n || 1, after: after }); }
  function pop(x, y, text, col) { if (typeof floatText === "function") floatText(x, y, text, col || C.gold, "", 1.6); }
  function free() { return !(BH.talk && BH.talk.isOpen && BH.talk.isOpen()); }

  function step1() {
    var c = cfg(), h = hunters[c.from || 0];
    if (!S.dusted && player.inShield && h) {
      S.dusted = true;
      for (var i = 0; i < 5; i++) fly({ x: h.x, y: h.y - 10 }, null, "#9aa0a8", 0.7 + i * 0.12, 1, function () { S.dust++; });
      if (typeof sfx === "function") sfx("coin");
    }
    var post = px(c.post), box = px(c.box);
    S.ask = null;
    if (!S.paid && d2(post) < T * 1.6 && player.inShield && player.carry >= 1) S.ask = { at: post, text: "PAY 1 ZEC", go: pay1 };
    else if (S.dust > 0 && d2(box) < T * 1.4 && player.inShield) S.ask = { at: box, text: "SET DUST ASIDE", go: aside };
  }
  function aside() {
    var box = px(cfg().box), n = S.dust; S.dust = 0;
    fly({ x: player.x, y: player.y - 8 }, box, "#9aa0a8", 0.4, n, function () { S.aside += n; });
    if (typeof sfx === "function") sfx("click");
    return true;
  }
  function pay1() {
    var post = px(cfg().post), h = hunters[cfg().from || 0], n = 1 + S.dust;
    player.carry -= 1; S.paid = true;
    fly({ x: player.x, y: player.y - 8 }, post, C.gold, 0.5, 1);
    if (BH.river && BH.river.spent) BH.river.spent(post.x, post.y, n);
    if (typeof sfx === "function") sfx("buy");
    if (S.dust > 0) {
      S.dirty = true;
      fly({ x: player.x, y: player.y - 8 }, post, "#9aa0a8", 0.5, S.dust);
      S.dust = 0;
      ring(post.x, post.y, "rgba(208,74,55,0.9)", T * 2.4, 0.9);
      pop(post.x, post.y - 26, "DUST SPENT TOO", C.string);
      if (h) featureApi.link("DUST", h.x, h.y, post.x, post.y, { rush: true });
      S.loseAt = simTime + 0.9;
      return true;
    }
    pop(post.x, post.y - 26, "PAID");
    if (BH.river && BH.river.valid) BH.river.valid();
    return true;
  }

  function step2() {
    var c = cfg(), desk = px(c.desk);
    if (!player.inShield && !S.out) { S.out = true; S.outAt = { x: player.x, y: player.y }; }
    S.ask = null;
    if (!S.paid && d2(desk) < T * 1.5 && player.carry >= 1) S.ask = { at: desk, text: "PAY THE EXCHANGE 1 ZEC", go: pay2 };
    var post = c.post && px(c.post);
    if (!post || !S.paid) return;
    if (!S.posted && !grid.some(function (r) { return r.indexOf("Y") >= 0; })) S.posted = true;
    var near = player.inShield && d2(post) < T * 2.6;
    if (near && !S.posted && !S.lent && player.carry < 1 && player.stash > 0) { player.stash -= 1; player.carry += 1; S.lent = true; }
    else if (S.lent && (S.posted || !near)) { if (!S.posted && player.carry > 0) { player.carry -= 1; player.stash += 1; } S.lent = false; }
  }
  function pay2() {
    var desk = px(cfg().desk);
    if (player.inShield) {
      S.bounces++;
      fly({ x: player.x, y: player.y - 8 }, desk, C.ice, 0.35, 1, function () { fly({ x: desk.x, y: desk.y - 6 }, null, C.ice, 0.4, 1); });
      pop(desk.x, desk.y - 26, "WALK AROUND, PAY FROM OUTSIDE", C.string);
      if (typeof sfx === "function") sfx("click");
      featureApi.noise(desk.x + T, desk.y, 7);
      return true;
    }
    player.carry -= 1; S.paid = true;
    fly({ x: player.x, y: player.y - 8 }, desk, C.gold, 0.5, 1);
    pop(desk.x, desk.y - 26, "PAID");
    if (typeof sfx === "function") sfx("buy");
    var col = cfg().gateCol, n = 0;
    if (col != null) for (var gy = 0; gy < rows; gy++) if (grid[gy][col] === "Y") {
      featureApi.setTile(col, gy, "~"); puff((col + 0.5) * T, (gy + 0.5) * T, 10, "rgba(191,233,255,0.85)", 34); n++;
    }
    if (n) { if (typeof sfx === "function") sfx("gate"); addTrauma(0.15); }
    return true;
  }

  function mailCfg() { return (L && L.mail) || {}; }
  function step3() {
    var c = cfg(), m = mailCfg(), tower = px(c.tower), st = BH.mail && BH.mail.state ? BH.mail.state() : null;
    if (st && st.handed && !S.synced) {
      S.synced = true;
      var po = px(m.post), shown = (m.mine || []).length - (m.omit || []).length + (m.fakes || []).length;
      pop(po.x, po.y - 44, "YOU HAVE " + shown);
    }
    watchStep(c, m);
    S.ask = null;
    if (!S.checked && d2(tower) < T * 1.5) S.ask = { at: tower, text: "CHECK AT MY ZEBRA NODE", go: check3 };
  }
  function check3() {
    var c = cfg(), m = mailCfg(), tower = px(c.tower);
    S.checked = true;
    var lied = S.synced; S.synced = true;
    ring(tower.x, tower.y - 20, "rgba(234,186,73,0.85)", T * 2, 0.7);
    pop(tower.x, tower.y - 92, "YOU HAVE " + (m.mine || []).length);
    if (BH.mail && BH.mail.handOver) {
      var hid = lied ? (m.omit || []).map(function (i) { return m.spots[i]; }) : [];
      BH.mail.handOver({ omit: [] });
      hid.forEach(function (t) { var p = px(t); fly({ x: tower.x, y: tower.y - 40 }, p, C.gold, 0.6, 1, function () { pop(p.x, p.y - 22, "HIDDEN", C.string); ring(p.x, p.y, "rgba(208,74,55,0.9)", T * 1.4, 0.6); }); });
    }
    if (BH.mail && BH.mail.unmask) {
      var u = BH.mail.unmask(false);
      u.left.forEach(function (p) { pop(p.x, p.y - 22, "FAKE", "#9aa0a8"); ring(p.x, p.y, "rgba(154,160,168,0.9)", T * 1.2, 0.5); });
      if (u.carried) crumbleOn(u.carried);
    }
    if (typeof sfx === "function") sfx("buy");
    return true;
  }
  var subbed = false;
  function onMail(ev) {
    if (tid() !== "bonus3" || !S || !ev.env) return;
    if (ev.type === "checked") S.checks.push({ id: ev.id, t: simTime });
    if (ev.type === "opened" && ev.env.memo) { var p = px([ev.env.tx, ev.env.ty]); S.watch.push({ id: ev.id, t: simTime, x: p.x, y: p.y }); }
  }
  function lampAt() { var p = px(mailCfg().post); return { x: p.x, y: p.y - 24 }; }
  function watchStep(c) {
    if (!subbed && BH.mail && BH.mail.on) { subbed = true; BH.mail.on(onMail); }
    var win = c.watch || 4;
    S.watch = S.watch.filter(function (w) {
      var near = S.checks.filter(function (k) { return k.id !== w.id && Math.abs(k.t - w.t) <= win; }).length;
      if (near >= 2) { pop(w.x, w.y - 34, "LOST IN THE PILE", C.ice); return false; }
      if (simTime - w.t < win) return true;
      spotted(w);
      return false;
    });
  }
  function spotted(w) {
    S.beam = { t0: simTime, x: w.x, y: w.y };
    pop(w.x, w.y - 34, "THE POST OFFICE SAW THIS ONE", C.string);
    if (typeof sfx === "function") sfx("linked");
  }
  function crumbleOn(n) {
    pop(player.x, player.y - 30, "-" + n + " FAKE", "#9aa0a8");
    if (typeof puff === "function") puff(player.x, player.y - 8, 14, "rgba(154,160,168,0.95)", 40);
  }
  var baseDen = window.tryDen;
  if (typeof baseDen === "function") window.tryDen = function () {
    if (tid() === "bonus3" && BH.mail && BH.mail.fakeCarried && BH.mail.fakeCarried() > 0) {
      crumbleOn(BH.mail.unmask(true).carried);
      if (dens) pop(dens.x, dens.y - 44, "FAKE COINS DON'T COUNT", C.string);
    }
    return baseDen.apply(this, arguments);
  };
  function drawLamp(g) {
    var l = lampAt(), lx = Math.round(l.x), ly = Math.round(l.y), look = S.watch.length > 0, b = S.beam, bt = b ? simTime - b.t0 : 99;
    if (bt < 1.8) {
      var a = Math.max(0, Math.min(1, bt / 0.15, (1.8 - bt) / 0.5)), tx = b.x, ty = b.y - 6, ang = Math.atan2(ty - ly, tx - lx), wd = 22;
      g.save(); g.globalAlpha = a * 0.5; g.fillStyle = "#fff2b0";
      g.beginPath(); g.moveTo(lx, ly);
      g.lineTo(tx + Math.cos(ang + 1.571) * wd, ty + Math.sin(ang + 1.571) * wd); g.lineTo(tx - Math.cos(ang + 1.571) * wd, ty - Math.sin(ang + 1.571) * wd);
      g.closePath(); g.fill();
      g.globalAlpha = a * 0.6; g.beginPath(); g.ellipse(tx, ty + 8, wd, wd * 0.45, 0, 0, 6.283); g.fill(); g.restore();
    }
    R(g, lx - 1, ly + 2, 2, 6, "#3a2a1a");
    R(g, lx - 4, ly - 4, 8, 7, "#3a2a1a");
    var on = bt < 1.8 || (look ? Math.floor(simTime * 8) % 2 === 0 : false);
    R(g, lx - 3, ly - 3, 6, 5, on ? "#fff2b0" : look ? "#c0582a" : "#6b5a3a");
    R(g, lx - 5, ly - 6, 10, 2, "#3a2a1a");
  }

  function act() {
    sync();
    if (!live() || !S.ask || !free()) return false;
    var a = S.ask; S.ask = null;
    return a.go();
  }
  BH.bonus = { act: act, info: function () { sync(); var o = {}; Object.keys(S).forEach(function (k) { if (k !== "fly" && k !== "ask") o[k] = S[k]; }); o.asking = S.ask ? S.ask.text : null; return o; } };

  function stepAll() {
    S.fly = S.fly.filter(function (f) {
      if (simTime - f.t0 < f.dur) return true;
      if (f.after) f.after();
      return false;
    });
    var t = tid();
    if (S.loseAt && simTime >= S.loseAt) { S.loseAt = 0; featureApi.lose("bonus:dust"); return; }
    if (t === "bonus1") step1(); else if (t === "bonus2") step2(); else if (t === "bonus3") step3();
  }

  function coin(g, x, y, col, r) {
    R(g, x - r, y - r + 1, r * 2, r * 2, "rgba(0,0,0,0.5)"); R(g, x - r, y - r, r * 2, r * 2, col); R(g, x - r, y - r, Math.max(1, r - 1), Math.max(1, r - 1), "#fffaf0");
  }
  function letter(g, x, y) { R(g, x - 5, y - 4, 10, 8, "#6b4a2e"); R(g, x - 4, y - 3, 8, 6, "#f5e8c8"); R(g, x - 4, y - 3, 4, 2, "#c8b48a"); R(g, x, y - 3, 4, 2, "#c8b48a"); }
  function sign(g, x, y, text, col) {
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = g.measureText(text).width + 14;
    R(g, x - w / 2 - 1, y - 9, w + 2, 18, "#2a1a0e"); R(g, x - w / 2, y - 8, w, 16, "#8a6038"); R(g, x - w / 2, y + 6, w, 2, col || C.gold);
    g.fillStyle = "#fffaf0"; g.fillText(text, x, y); g.restore();
  }
  function askBox(g, cx, y, text, fw) {
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var label = TOUCH ? "TAP: " + text : text, kw = TOUCH ? 0 : 16, tw = g.measureText(label).width, w = Math.max(fw || 0, tw + 14 + (kw ? kw + 6 : 0)), x0 = cx - w / 2;
    g.fillStyle = "rgba(0,0,0,0.82)"; g.fillRect(x0, y - 11, w, 22);
    g.strokeStyle = C.gold; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y - 10.5, w - 1, 21);
    if (kw) {
      var kx = x0 + 5, ky = y - 8, dn = Math.sin(simTime * 5) > 0.7 ? 1 : 0;
      g.fillStyle = "#8a5e10"; g.fillRect(kx, ky + 2, kw, 15); g.fillStyle = C.gold; g.fillRect(kx, ky + dn, kw, 14);
      g.fillStyle = "#1f130a"; g.font = "800 10px 'Plex Mono', monospace"; g.fillText("E", kx + kw / 2, ky + 7 + dn); g.font = "700 9px 'Plex Mono', monospace";
    }
    g.fillStyle = C.gold; g.textAlign = "left"; g.fillText(label, x0 + 7 + (kw ? kw + 6 : 0), y);
    g.restore();
    S.boxAt = { x: cx, y: y, w: w, h: 22 };
  }
  function drawDesk(g, at) {
    var x = at[0] * T, y = at[1] * T, cx = x + T / 2;
    R(g, x, y, T, T, C.ground);
    g.fillStyle = "rgba(0,0,0,0.4)"; g.beginPath(); g.ellipse(cx, y + 30, 24, 5, 0, 0, 6.283); g.fill();
    R(g, x - 2, y - 14, 36, 44, "#3d2918"); R(g, x - 1, y - 13, 34, 42, "#6b4a2e");
    for (var w = 0; w < 5; w++) R(g, x - 1, y - 9 + w * 8, 34, 1, "#5a3d24");
    R(g, x - 6, y - 18, 44, 5, "#3d2918"); R(g, x - 3, y - 23, 38, 5, "#5a3d24"); R(g, x + 1, y - 27, 30, 4, "#8a6038");
    R(g, x + 4, y - 6, 24, 14, "#1f130a"); R(g, x + 2, y + 8, 28, 4, "#8a6038");
    R(g, x + 9, y + 4, 4, 4, C.gold); R(g, x + 17, y + 4, 4, 4, C.goldDim);
    sign(g, cx, y - 36, "EXCHANGE", "#f0a040");
  }
  function drawSpot(g, at) {
    var x = (at[0] + 0.5) * T, y = (at[1] + 0.5) * T, a = 0.35 + 0.2 * Math.sin(simTime * 3);
    g.save(); g.globalAlpha = a; g.strokeStyle = "#f0a040"; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 4, 13, 5, 0, 0, 6.283); g.stroke(); g.restore();
  }
  function drawTower(g, at) {
    var lx = Math.round((at[0] + 0.5) * T), base = (at[1] + 1) * T, ly = base - 54, hw = 11, K = "#141416", W = "#f2f0ea";
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(lx, base, 20, 5, 0, 0, 6.283); g.fill();
    for (var y = ly + 10; y < base; y += 4) {
      var c = ((y - ly) / 4) % 2 ? K : W;
      R(g, lx - hw - 2, y, 4, Math.min(4, base - y), c); R(g, lx + hw - 2, y, 4, Math.min(4, base - y), c);
    }
    g.strokeStyle = K; g.lineWidth = 2; g.beginPath();
    for (var q = ly + 16; q < base - 8; q += 12) { g.moveTo(lx - hw, q); g.lineTo(lx + hw, q + 10); g.moveTo(lx + hw, q); g.lineTo(lx - hw, q + 10); }
    g.stroke();
    R(g, lx - hw - 5, ly + 6, hw * 2 + 10, 7, K);
    R(g, lx - hw - 3, ly - 12, hw * 2 + 6, 18, W);
    for (var s = 0; s < 4; s++) R(g, lx - hw - 1 + s * 7, ly - 12, 3, 18, K);
    R(g, lx - hw + 1, ly - 6, hw * 2 - 2, 8, "#0d1a12");
    for (var k = 0; k < 5; k++) {
      var on = S.checked || Math.floor(simTime * 4 + k * 1.7) % 3 !== 0;
      R(g, lx - hw + 3 + k * 4, ly - 4, 2, 2, on ? "#5ef08a" : "#1e4a2c"); R(g, lx - hw + 3 + k * 4, ly - 1, 2, 2, on && k % 2 ? "#eaba49" : "#2a2a1a");
    }
    R(g, lx - hw - 7, ly - 16, hw * 2 + 14, 5, K);
    R(g, lx - 1, ly - 26, 2, 10, K); R(g, lx - 2, ly - 28, 4, 3, Math.floor(simTime * 2) % 2 ? "#5ef08a" : "#1e4a2c");
    sign(g, lx, ly - 36, "ZEBRA NODE", C.gold);
  }
  function drawWorld(g) {
    var t = tid(), c = cfg();
    if (t === "bonus1") {
      var b = px(c.box);
      R(g, b.x - 8, b.y - 4, 16, 10, "#3d2918"); R(g, b.x - 7, b.y - 3, 14, 8, "#5a3d24"); R(g, b.x - 8, b.y - 6, 16, 3, "#8a6038");
      for (var i = 0; i < S.aside; i++) coin(g, b.x - 6 + (i % 5) * 3, b.y - 8 - Math.floor(i / 5) * 3, "#9aa0a8", 1);
      for (var j = 0; j < S.dust; j++) coin(g, player.x - 8 + j * 4, (player.topY != null ? player.topY : player.y - 30) - 6 + Math.sin(simTime * 6 + j) * 1, "#9aa0a8", 1);
    } else if (t === "bonus2") {
      drawSpot(g, c.spot); drawDesk(g, c.desk);    } else if (t === "bonus3") {
      drawTower(g, c.tower); drawLamp(g);
    }
    S.fly.forEach(function (f) {
      var k = Math.max(0, Math.min(1, (simTime - f.t0) / f.dur)), to = f.b || { x: player.x, y: player.y - 8 }, e = k * k * (3 - 2 * k);
      for (var i = 0; i < f.n; i++) {
        var x = f.a.x + (to.x - f.a.x) * e + (i - f.n / 2) * 3, y = f.a.y + (to.y - f.a.y) * e - Math.sin(e * Math.PI) * T;
        if (f.col === "#f5e8c8") letter(g, Math.round(x), Math.round(y)); else coin(g, Math.round(x), Math.round(y), f.col, f.col === C.gold ? 3 : 1);
      }
    });
    S.boxAt = null;
    var ask = S.ask && game.phase === "play" ? S.ask : null;
    if (!ask) return;
    var link = BH.payLink && (ask.go === pay1 || ask.go === pay2);
    var paint = function (g2) {
      if (!link) { askBox(g2, ask.at.x, ask.at.y + T * 1.05, ask.text); return; }
      var under = ask.go === pay1 ? BH.payLink(g2, { x: ask.at.x, y: ask.at.y, water: true }, 1, null, null, ask.text)
        : BH.payLink(g2, { x: ask.at.x, y: ask.at.y, water: false }, 1, "THE EXCHANGE", null, ask.text);
      askBox(g2, under.x, under.y, ask.text, under.w);
    };
    if (!(BH.payLinkLate && BH.payLinkLate(paint))) paint(g);
  }

  addEventListener("keydown", function (e) {
    if ((e.code === "KeyE" || e.key === "e" || e.key === "E") && !e.repeat && tid() && act()) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  addEventListener("pointerdown", function (e) {
    if (!tid() || !S || !S.boxAt || !S.ask || !zoom || typeof cam === "undefined") return;
    var b = S.boxAt, vw = W / zoom, vh = H / zoom, cx = clampCam(cam.x, vw, cols * T), cy = clampCam(cam.y, vh, rows * T);
    var sx = W / 2 + (b.x - cx) * zoom, sy = H / 2 + (b.y - cy) * zoom, r = e.target && e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : { left: 0, top: 0 };
    if (Math.abs(e.clientX - r.left - sx) < b.w * zoom / 2 + 14 && Math.abs(e.clientY - r.top - sy) < b.h * zoom / 2 + 14 && act()) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  var baseWhy = window.caughtWhy;
  if (typeof baseWhy === "function") window.caughtWhy = function (r) {
    var c = (r && r.cause) || {}, f = String(c.feature || (r && r.how) || "");
    if (f === "bonus:dust") return { why: "You spent the tiny coins together with your own.", how: "The one who sent them saw that payment.",
      cause: "DUST SPENT TOO.", hint: "Set the tiny coins aside before you pay." };
    return baseWhy(r);
  };

  if (BH.tiles) BH.tiles.register("ê", { solid: true, claim: "bonus" });
  BH.features.register("bonus", {
    onLevelStart: function () { key = null; sync(); },
    onStep: function () { sync(); if (tid()) stepAll(); },
    onDrawWorld: function (g) { sync(); if (tid()) drawWorld(g); }
  });
})();
