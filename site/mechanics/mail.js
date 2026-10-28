(function () {
  "use strict";
  window.TRAIL_EXTRA_LEVELS = window.TRAIL_EXTRA_LEVELS || {};
  TRAIL_EXTRA_LEVELS.mail = {
    act: 2, tid: "mail", title: "YOUR MAIL", need: 3, par: 120,
    features: ["trail", "fungags", "mail"],
    elders: ["oak", "sly"],
    hunters: [{ type: "hunter", patrol: [[5, 1], [5, 10]] }, { type: "hunter", sleep: true, patrol: [[25, 8], [25, 6], [28, 6], [28, 8]] }],
    hints: ["need", "home"],
    mail: {
      post: [10, 1],
      spots: [[12, 2], [15, 1], [18, 3], [13, 5], [16, 4], [19, 6], [12, 10], [15, 10], [18, 10]],
      mine: [2, 3, 8],
      memos: ["THANKS FOR THE FISH", "FOR YOUR NEW BOAT", "SEE YOU AT THE DEN"]
    },
    map: [
      "##############################",
      "#..........~~~~~~~~~.........#",
      "#..........~~~~~~~~~......##.#",
      "#......##..~~~~~~~~~.........#",
      "#......##..~~~~~~~~~...##....#",
      "#..........~~~~~~~~~...##....#",
      "#........##~~~~~~~~~.........#",
      "#........##~~~~~~~~~.........#",
      "#..##......~~~~~~~~~.........#",
      "#.P##......~~~~~~~~~.........#",
      "#..........~~~~~~~~~..D......#",
      "##############################"],
    copy: {
      goal: "Get the mail from the post office. Check every envelope with your lantern, read the note in yours, then bring the coins to the den.",
      lesson: "You try your key on every envelope, and only yours open. The note inside is for you and the sender. The post office only ever sees it sealed.",
      dev: "A light wallet does not keep the whole chain. A server such as Zaino, an indexer on a Zebra node, sends it a trimmed copy of each new payment, the same copy it sends every wallet. The copy leaves the memo out, so to read one the wallet fetches that full payment, which the server can notice. It still can't see the amounts or memos inside."
    },
    term: ""
  };

  if (!window.BH) window.BH = {};
  if (!BH.features) return;

  var LAMP = 1.45, CHECK_T = 0.4, FLY = 0.45, GAP = 0.05, POST_R = 1.6, FLARE = 7, STIR = 0.3, OPEN_SHOW = 0.7, SLIP_T = 2.6, CRUMBLE = 0.9;
  var S = null, key = null, subs = [];

  function R(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(x, y, w, h); }
  function on() { return !!(typeof L !== "undefined" && L && (L.tid === "mail" || L.mail)); }
  function cfg() { return (L && L.mail) || TRAIL_EXTRA_LEVELS.mail.mail; }
  function px(t) { return { x: (t[0] + 0.5) * T, y: (t[1] + 0.5) * T }; }
  function emit(type, e) { subs.slice().forEach(function (f) { try { f({ type: type, id: e ? e.id : null, env: e ? copyEnv(e) : null }); } catch (er) {} }); }
  function copyEnv(e) { return { id: e.id, tx: e.tx, ty: e.ty, mine: e.mine, fake: !!e.fake, handed: e.handed, checked: e.checked, opened: e.opened, got: e.got, memo: e.memo || null }; }

  function build(c) {
    var mine = c.mine || [], memos = c.memos || [], fakes = c.fakes || [];
    var pile = (c.spots || []).map(function (t, i) {
      var p = px(t), f = fakes.indexOf(i), memo = f >= 0 ? memos[f % Math.max(1, memos.length)] : memos[mine.indexOf(i)];
      return { id: i, tx: t[0], ty: t[1], x: p.x, y: p.y, mine: mine.indexOf(i) >= 0 || f >= 0, fake: f >= 0, memo: memo || null, handed: false, checked: false, opened: false, got: false, gone: false, prog: 0, t0: 0, ph: (i * 1.7) % 6.28, coin: null, nudge: -9 };
    });
    S = { cfg: c, pile: pile, handed: false, handT: 0, post: px(c.post || [1, 1]), lastNot: -9, slip: null, read: 0 };
  }
  function sync() {
    if (!on()) { S = null; key = null; return null; }
    var k = game.levelIdx + ":" + levelStart + ":" + L.tid;
    if (k !== key) { key = k; build(cfg()); }
    if (typeof activeFeatures !== "undefined" && !activeFeatures.some(function (f) { return f.id === "mail"; })) {
      var api = Object.create(featureApi); api.id = "mail"; api.state = {};
      activeFeatures.push({ id: "mail", def: BH.features.get("mail"), api: api });
    }
    return S;
  }

  function handOver(opts) {
    if (!sync()) return 0;
    opts = opts || {};
    var omit = opts.omit || S.cfg.omit || [], n = 0;
    (opts.extra || []).forEach(function (x) {
      var p = px([x.tx, x.ty]);
      S.pile.push({ id: S.pile.length, tx: x.tx, ty: x.ty, x: p.x, y: p.y, mine: !!x.mine, fake: !!x.fake, handed: false, checked: false, opened: false, got: false, prog: 0, t0: 0, ph: S.pile.length * 1.7 % 6.28, coin: null, nudge: -9 });
    });
    S.handed = true; S.handT = simTime;
    S.pile.forEach(function (e) {
      if (e.handed || omit.indexOf(e.id) >= 0) return;
      e.handed = true; e.t0 = simTime + n * GAP; n++;
    });
    if (typeof sfx === "function") sfx("buy");
    if (typeof ring === "function") ring(S.post.x, S.post.y, "rgba(245,232,200,0.8)", T * 1.6, 0.5);
    if (typeof floatText === "function") floatText(S.post.x, S.post.y - 30, "SAME PILE FOR EVERYONE", "#f5e8c8", "", 1.8);
    emit("handed", null);
    return n;
  }
  function landed(e) { return e.handed && simTime >= e.t0 + FLY; }

  function openEnv(e) {
    e.opened = true; e.openAt = simTime;
    e.coin = { x: e.x, y: e.y, got: false, ph: e.ph, mail: e.id, fake: !!e.fake };
    coins.push(e.coin);
    if (typeof sfx === "function") sfx("coin", { combo: 1 });
    if (typeof floatText === "function") floatText(e.x, e.y - 12, "MINE", C.gold);
    if (typeof ring === "function") { ring(e.x, e.y, "rgba(234,186,73,0.8)", T * 1.3, 0.5); ring(player.x, player.y - 6, "rgba(234,186,73,0.9)", T * 2.2, 0.6); }
    if (typeof puff === "function") puff(e.x, e.y, 12, "rgba(234,186,73,0.95)", 40);
    if (typeof makeNoise === "function") makeNoise(player.x, player.y, FLARE, "flare");
    (typeof hunters !== "undefined" ? hunters : []).forEach(function (h) {
      var g = h.fg;
      if (g && g.mode === "sleep" && Math.hypot(h.x - player.x, h.y - player.y) < T * (FLARE + 1)) g.wake = Math.min(0.95, (g.wake || 0) + STIR);
    });
    if (e.memo) { S.slip = { text: e.memo, t0: simTime }; S.read++; }
    emit("opened", e);
  }
  function step(dt) {
    if (!S || game.phase !== "play") return;
    if (!S.handed && S.cfg.auto !== false && Math.hypot(S.post.x - player.x, S.post.y - player.y) < T * POST_R) handOver();
    S.pile.forEach(function (e) {
      if (!landed(e) || e.gone) return;
      if (!e.checked) {
        if (Math.hypot(e.x - player.x, e.y - player.y) < T * LAMP) {
          e.prog += dt / CHECK_T;
          if (e.prog >= 1) {
            e.checked = true; e.prog = 1;
            emit("checked", e);
            if (e.mine) openEnv(e);
            else {
              if (typeof floatText === "function") floatText(e.x, e.y - 12, "NOT MINE", "#9aa3ad", "", 0.9);
              if (typeof sfx === "function") sfx("click");
            }
          }
        }
        return;
      }
      if (e.coin && e.coin.got && !e.got) { e.got = true; emit("got", e); }
      if (!e.mine && Math.hypot(e.x - player.x, e.y - player.y) < T * 0.55 && simTime - e.nudge > 1.2) {
        e.nudge = simTime;
        if (typeof floatText === "function") floatText(e.x, e.y - 12, "NOT MINE", "#9aa3ad", "", 0.9);
      }
    });
  }

  function drawPost(g) {
    var x = Math.round(S.post.x), y = Math.round(S.post.y);
    R(g, x - 13, y - 6, 26, 18, "#3a2a1a");
    R(g, x - 12, y - 5, 24, 16, "#c9a46a");
    R(g, x - 12, y - 5, 24, 2, "#e0bf86");
    for (var i = 0; i < 8; i++) R(g, x - 15 + i, y - 7 - i, 30 - i * 2, 1, i < 1 ? "#3a2a1a" : "#7a2e1f");
    R(g, x - 4, y + 2, 8, 9, "#3a2a1a"); R(g, x - 3, y + 3, 6, 8, "#5a3418");
    R(g, x - 10, y - 1, 5, 2, "#3a2a1a"); R(g, x + 5, y - 2, 6, 5, "#3a2a1a"); R(g, x + 6, y - 1, 4, 3, "#9fc4d8");
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var tw = Math.ceil(g.measureText("POST OFFICE").width) + 10;
    R(g, x - tw / 2, y + 13, tw, 12, "rgba(0,0,0,0.78)"); g.fillStyle = "#f5e8c8"; g.fillText("POST OFFICE", x, y + 19.5);
    g.restore();
    if (!S.handed) {
      var b = Math.round(Math.sin(simTime * 4) * 2);
      drawEnv(g, x, y - 26 + b, "sealed", 1);
    }
  }
  function drawEnv(g, x, y, kind, a) {
    var body = "#f5e8c8", flap = "#c9b48a", seal = "#b8322a";
    if (kind === "not") { body = "#8a8f96"; flap = "#6a6f76"; seal = "#3e4248"; }
    g.save(); g.globalAlpha = a;
    R(g, x - 6, y - 4, 12, 9, "#3a2a1a"); R(g, x - 5, y - 3, 10, 7, body);
    for (var i = 0; i < 5; i++) { R(g, x - 5 + i, y - 3 + i, 1, 1, flap); R(g, x + 4 - i, y - 3 + i, 1, 1, flap); }
    if (kind === "open") {
      for (var j = 0; j < 5; j++) R(g, x - 5 + j, y - 4 - j, 10 - j * 2, 1, j ? "#e0cfa0" : "#3a2a1a");
      R(g, x - 2, y - 2, 4, 3, C.gold);
    } else R(g, x - 1, y, 2, 2, seal);
    g.restore();
  }
  function drawCrumble(g, e) {
    var t = simTime - e.goneAt;
    if (t > CRUMBLE) return;
    var k = t / CRUMBLE;
    g.save(); g.globalAlpha = 1 - k;
    for (var i = 0; i < 9; i++) {
      var a = e.ph + i * 0.7, r = 3 + k * (6 + (i % 3) * 4);
      R(g, Math.round(e.x + Math.cos(a) * r), Math.round(e.y - 4 + Math.sin(a) * r * 0.5 + k * k * 14), 2, 2, i % 2 ? "#9aa0a8" : "#c9b48a");
    }
    g.restore();
  }
  function fakeCoins(carried) {
    return S ? S.pile.filter(function (e) { return e.fake && e.coin && !e.coin.burnt && (carried ? e.coin.got : !e.coin.got); }) : [];
  }
  function burn(list, carried) {
    list.forEach(function (e) {
      if (e.coin) e.coin.burnt = true;
      if (carried) player.carry = Math.max(0, player.carry - 1);
      else if (e.coin) e.coin.got = true;
    });
  }
  function unmask(onlyCarried) {
    if (!sync()) return { carried: 0, left: [] };
    var held = fakeCoins(true), left = [];
    if (!onlyCarried) S.pile.forEach(function (e) {
      if (!e.fake || e.gone) return;
      e.gone = true; e.goneAt = simTime; e.crumble = e.handed && !(e.coin && e.coin.got);
      if (e.crumble) left.push({ x: e.x, y: e.y });
    });
    burn(held, true);
    if (!onlyCarried) burn(fakeCoins(false), false);
    held.forEach(function (e) { e.got = false; });
    return { carried: held.length, left: left };
  }
  function drawWorld(g) {
    drawPost(g);
    S.pile.forEach(function (e) {
      if (!e.handed || simTime < e.t0) return;
      if (e.gone) { if (e.crumble) drawCrumble(g, e); return; }
      var k = Math.min(1, (simTime - e.t0) / FLY), bob = Math.sin(simTime * 2 + e.ph) * 1.2 * k;
      var x = Math.round(S.post.x + (e.x - S.post.x) * k), y = Math.round(S.post.y + (e.y - S.post.y) * k - Math.sin(k * 3.14) * 18 + bob);
      if (e.opened) {
        var t = simTime - e.openAt; if (t > OPEN_SHOW) return;
        drawEnv(g, x, y, "open", 1 - t / OPEN_SHOW); return;
      }
      drawEnv(g, x, y, e.checked ? "not" : "sealed", e.checked ? 0.75 : 1);
      if (!e.checked && e.prog > 0) {
        g.save(); g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, -1.571, -1.571 + 6.283 * e.prog); g.stroke(); g.restore();
      }
    });
  }
  function drawSlip(g, cx, y) {
    var s = S.slip, t = s ? simTime - s.t0 : 99;
    if (t > SLIP_T) return;
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, t / 0.2, (SLIP_T - t) / 0.3));
    g.textAlign = "center"; g.textBaseline = "middle"; g.font = "700 14px 'Plex Mono', monospace";
    var w = Math.ceil(g.measureText(s.text).width) + 36, x = Math.round(cx - w / 2), h = 46;
    R(g, x - 2, y - 2, w + 4, h + 4, "#3a2a1a"); R(g, x, y, w, h, "#f5e8c8");
    R(g, x + w - 14, y + h - 14, 8, 8, "#b8322a");
    g.fillStyle = "#6b4a2e"; g.font = "700 10px 'Plex Mono', monospace"; g.fillText("MEMO", cx, y + 12);
    g.fillStyle = "#3a2a1a"; g.font = "700 14px 'Plex Mono', monospace"; g.fillText(s.text, cx, y + 30);
    g.restore();
  }
  function drawOver(g) {
    if (!S.handed) return;
    var shown = S.pile.filter(function (e) { return e.handed && !e.gone; }), n = shown.filter(function (e) { return e.checked; }).length;
    var m = shown.filter(function (e) { return e.opened; }).length;
    var text = "CHECKED " + n + " / " + shown.length + "   MINE " + m;
    g.save(); g.font = "700 12px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = Math.ceil(g.measureText(text).width) + 22, x = (typeof W === "number" ? W : innerWidth) / 2, y = (typeof H === "number" ? H : innerHeight) - 54;
    R(g, Math.round(x - w / 2), y - 11, w, 22, "rgba(0,0,0,0.78)"); R(g, Math.round(x - w / 2), y + 10, w, 1, C.gold);
    g.fillStyle = "#f5e8c8"; g.fillText(text, x, y);
    g.restore();
    drawSlip(g, x, y - 72);
  }

  function waiting() {
    if (!on()) return 0;
    var c = sync() ? S.cfg : cfg(), omit = c.omit || [];
    if (S && S.handed) return S.pile.filter(function (e) { return e.handed && e.mine && !e.gone && !(e.coin && e.coin.burnt); }).length;
    return (c.mine || []).filter(function (i) { return omit.indexOf(i) < 0; }).length;
  }
  var baseTotal = window.trailCoinTotal;
  if (typeof baseTotal === "function") window.trailCoinTotal = function () { return baseTotal.apply(this, arguments) + waiting(); };

  BH.features.register("mail", {
    onLevelStart: function () { sync(); },
    onStep: function (dt) { if (sync()) step(typeof dt === "number" ? dt : 1 / 60); },
    onDrawWorld: function (g) { if (sync()) drawWorld(g); },
    onDrawOver: function (g) { if (sync()) drawOver(g); }
  });

  BH.mail = {
    active: function () { return !!sync(); },
    start: function (c) { if (!on()) return false; key = game.levelIdx + ":" + levelStart + ":" + L.tid; build(c || cfg()); return true; },
    handOver: handOver,
    unmask: unmask,
    fakeCarried: function () { return sync() ? fakeCoins(true).length : 0; },
    state: function () {
      if (!sync()) return null;
      var shown = S.pile.filter(function (e) { return e.handed && !e.gone; });
      return {
        handed: S.handed, total: shown.length, pileSize: S.pile.length,
        checked: shown.filter(function (e) { return e.checked; }).length,
        mine: shown.filter(function (e) { return e.opened; }).length,
        got: shown.filter(function (e) { return e.got; }).length,
        missing: S.pile.filter(function (e) { return !e.handed && e.mine; }).length,
        read: S.read,
        envelopes: S.pile.map(copyEnv)
      };
    },
    found: function () { return sync() ? S.pile.filter(function (e) { return e.opened; }).map(function (e) { return e.id; }) : []; },
    open: function (id) {
      if (!sync()) return false;
      var e = S.pile[id];
      if (!e || !landed(e) || !e.checked || !e.mine) return false;
      if (!e.opened) openEnv(e);
      return true;
    },
    on: function (fn) { if (typeof fn === "function") subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }
  };
})();
