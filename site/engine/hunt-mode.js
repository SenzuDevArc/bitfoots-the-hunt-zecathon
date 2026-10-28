"use strict";
(function () {
  if (!BH.talk) return;
  F.words.bush = { word: "IN COVER", now: true, note: "Hunters can't see you in here. Your steps still show." };
  F.words.bushFound = { word: "IN COVER", note: "Your steps led him here." };
  SPEED_WATER = SPEED_LAND;

  var HOUND_LOOK = { scale: 1.35, coat: "#2a2a2a", band: C.red, markLift: 26 };
  var V = BH.talk.voice;
  V("oak", { name: "SHILO", f: 150, wave: "triangle", speed: 44, color: "#e8c27a", vol: 0.08, every: 1, oct: true, portrait: { char: "char-010" } });
  V("sly", { name: "AYAB", f: 560, wave: "square", speed: 26, color: "#ffb065", vol: 0.06, every: 1, portrait: { char: "char-052" } });
  V("pine", { name: "PINE", f: 330, wave: "triangle", speed: 32, color: "#a8e6a0", vol: 0.05, every: 1, portrait: { char: "char-058" } });
  V("stranger", { name: "???", f: 300, wave: "sawtooth", speed: 34, color: "#9ff0fc", vol: 0.05, every: 1, portrait: { char: "char-046" } });
  V("merchant", { name: "MERCHANT", f: 420, wave: "square", speed: 30, color: "#ffcd42", vol: 0.06, every: 1, portrait: { char: "char-078" } });
  V("auditor", { name: "AUDITOR", f: 380, wave: "triangle", speed: 34, color: "#b7bac8", vol: 0.1, every: 1, portrait: { char: "char-074" } });
  V("hound", { name: "THE HOUND", f: 92, wave: "sawtooth", speed: 54, color: "#d04a37", vol: 0.08, every: 1, oct: true, slide: 0.85, portrait: { hunter: HOUND_LOOK } });
  V("you", { name: "YOU", f: 260, wave: "square", speed: 30, color: "#fffaf0", vol: 0.035, every: 1, portrait: { char: "char-014" } });
  V("machine", { name: "MACHINE", f: 760, wave: "square", speed: 14, color: "#bfe9ff", vol: 0.04, every: 1, jit: 0.4, portrait: { none: true } });
  V("swap", { name: "SWAP POST", f: 700, wave: "square", speed: 14, color: "#c9b8ff", vol: 0.04, every: 1, jit: 0.4, portrait: { none: true } });
  V("board", { name: "NOTICE BOARD", f: 210, wave: "triangle", speed: 22, color: "#d9b38c", vol: 0.06, every: 1, jit: 0.2, portrait: { none: true } });

  (window.LEVELS || []).forEach(function (l) { l.features = (l.features || []).concat(["trail"]); });
  if (BH.story) { BH.story.gate = function () { return false; }; BH.story.mapLink = function () {}; }

  var WORDS = ["acid", "maple", "river", "shadow", "tiger", "orbit", "plate", "quote", "salad", "velvet", "wagon", "zebra", "anchor", "bamboo", "cactus", "dragon", "eagle", "fossil", "galaxy", "harbor", "island", "jungle", "kettle", "lemon",
    "mango", "nectar", "otter", "pepper", "quiver", "rocket", "saddle", "tunnel", "umbra", "violin", "walnut", "yogurt",
    "amber", "basket", "candle", "dolphin", "ember", "falcon", "garden", "hammer"];


  function TR() {
    if (!save.trail || typeof save.trail !== "object") save.trail = {};
    var t = save.trail;
    if (!t.clues || typeof t.clues !== "object") t.clues = {};
    if (typeof t.wallets !== "number") t.wallets = 0;
    return t;
  }
  function lvlN() { return game.levelIdx + 1; }
  function strikes() { var t = TR(), n = 0; for (var i = 1; i <= lvlN(); i++) n += (t.clues[i] || []).length; return n; }
  function allClues() { var t = TR(), out = []; for (var i = 1; i <= lvlN(); i++) out = out.concat(t.clues[i] || []); return out; }
  function clue(text) {
    var t = TR(), n = lvlN();
    (t.clues[n] = t.clues[n] || []).push(text); persist();
    popRaw("CLUE PINNED: " + text.toUpperCase(), C.red); sfx("linked"); if (S) S.flash = simTime;
    return strikes();
  }
  function open(seq, after) { BH.talk.open(seq, after); }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function px(at) { return { x: (at[0] + 0.5) * T, y: (at[1] + 0.5) * T }; }
  function gates(api) { var op = []; if (S) (S.grec = S.grec || []).push({ t: simTime, tiles: op }); for (var y = 0; y < api.tiles.length; y++) for (var x = 0; x < api.tiles[y].length; x++) if (api.tiles[y][x] === "H") { op.push([x, y]); api.setTile(x, y, "J"); puff((x + 0.5) * T, (y + 0.5) * T, 14, "rgba(234,186,73,0.9)", 40); } sfx("gate"); api.shake(0.2); }
  function lose(reason) {
    S.lost = reason;
    if (reason === "found") { var t = TR(); t.endings = t.endings || {}; t.endings.found = true; persist(); }
    BH.trailFeature.api.lose("trail:" + reason);
  }
  function payMe(from, tag, after, delay) {
    S.gets = S.gets || [];
    S.gets.push({ t0: simTime + (delay || 0), from: { x: from.x, y: from.y - 10 }, tag: tag, after: after });
    if (typeof sfx === "function") sfx("coin");
  }
  function getsTick() {
    (S.gets || []).forEach(function (q) {
      if (q.landed || simTime - q.t0 < 0.8) return;
      q.landed = simTime; player.carry++;
      if (typeof ring === "function") ring(player.x, player.y, C.gold, T * 1.2, 0.4);
      if (q.after) q.after();
    });
    S.gets = (S.gets || []).filter(function (q) { return !q.landed || simTime - q.landed < 3.5; });
  }
  function drawGets(g) {
    (S.gets || []).forEach(function (q) {
      var t = simTime - q.t0;
      if (!q.landed) {
        var k = Math.max(0, Math.min(1, t / 0.8)), e = k * k * (3 - 2 * k), x = q.from.x + (player.x - q.from.x) * e, y = q.from.y + (player.y - 10 - q.from.y) * e - Math.sin(e * Math.PI) * T * 1.2;
        g.fillStyle = "#8a5e10"; g.beginPath(); g.arc(x, y + 1, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffd24a"; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
        return;
      }
      if (!q.tag) return;
      var a = Math.min(1, 3.5 - (simTime - q.landed)), ty = (player.topY != null ? player.topY : player.y - 30) - 14;
      g.save(); g.globalAlpha = Math.max(0, a); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
      var w = g.measureText(q.tag).width + 12;
      g.fillStyle = "rgba(0,0,0,0.82)"; g.fillRect(player.x - w / 2, ty - 8, w, 16);
      g.fillStyle = q.tag === "ADDRESS #1" ? "#7fd8ff" : "#a8e6a0"; g.fillText(q.tag, player.x, ty);
      g.restore();
    });
  }
  function postOf(z) {
    var p = px(z.at), c = (grid[z.at[1]] || [])[z.at[0]];
    p.key = z.at[0] + "," + z.at[1]; p.water = c === "U" || isWater(c); p.at = z.at;
    return p;
  }
  function payPost(any) {
    var best = null, bd = 1e9, want = any ? null : payWant();
    (L.talks || []).forEach(function (z) {
      if (z.id !== "machine") return;
      var p = postOf(z), d = Math.hypot(p.x - player.x, p.y - player.y);
      if (want && p.water !== (want === "water")) return;
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }
  function payWant() { return L.payOrder ? L.payOrder[S.payStep || 0] || null : null; }
  function goalNext() {
    var f = levelCopy(game.levelIdx + 1), nx = f && f.next;
    S.goalStep = (S.goalStep || 0) + 1;
    var text = nx && nx[S.goalStep - 1];
    if (!text || typeof goalEl === "undefined" || !goalEl) return;
    var k = goalEl.querySelector(".k");
    goalEl.innerHTML = (k ? k.outerHTML : "") + esc(text);
    goalEl.classList.remove("lit"); void goalEl.offsetWidth; goalEl.classList.add("lit");
  }
  function merchantOf(water) { return S.npcs.filter(function (n) { return n.id === "merchant" && !!n.water === water; })[0] || null; }
  function payN() { return L.pay || 1; }
  function readyCoins() { return BH.stamps && BH.stamps.ready ? BH.stamps.ready() : player.carry; }
  function confirmOf(key) { return BH.stamps && BH.stamps.confirm ? BH.stamps.confirm(key) : { n: 1, safe: true, waiting: false, f: 1, text: "PAID" }; }
  function hasTile(code) { for (var y = 0; y < grid.length; y++) if (grid[y].indexOf(code) >= 0) return true; return false; }
  function payTick(api) {
    var p = S.payAsk;
    if (p && Math.hypot(p.x - player.x, p.y - player.y) > T * 2.6) { S.payAsk = null; S.payBox = null; }
    var q = S.pay; if (!q) return;
    var c = confirmOf(q.key);
    if (c.n < 1 || (!q.water && !c.safe) || q.opened) return;
    if (simTime - q.t0 < 0.7) return;
    if (L.memo && q.water) { q.opened = true; nice("PAID"); S.pay = null; memoBought(q.memo); return; }
    q.opened = true; done("machine"); nice("PAID"); goalNext();
    if (L.payOrder && (S.payStep || 0) < L.payOrder.length - 1) {
      S.payStep = (S.payStep || 0) + 1; S.pay = null; S.done.machine = false;
      var wk = (L.npcs || []).filter(function (d) { return d.walkTo; })[0], wn = wk && S.npcs[L.npcs.indexOf(wk)];
      if (wn) { wn.goto = px(wk.walkTo); return; }
      paidLine(q); return;
    }
    if (q.water) { if (L.gateBy !== "key" && BH.river && BH.river.valid) BH.river.valid(); }
    else {
      gates(api);
      if (!hasTile("H") && L.gateBy !== "key" && BH.river && BH.river.openGates) BH.river.openGates();
    }
    paidLine(q);
  }
  function signPay() {
    if (!S || !S.payAsk || S.pay || BH.talk.isOpen() || game.phase !== "play" || game.screen !== "play") return false;
    if (simTime - (S.lastTalk || -9) < 0.3 || askHeld(S.payAsk)) return false;
    var p = S.payAsk, n = payN();
    if (player.carry < n || readyCoins() < n) return false;
    if (L.memo && p.water && !S.memoOk) {
      if (S.memoSaid) memoOpen();
      else { S.memoSaid = true; open([["oak", "Put the order number in the memo, so he knows what we bought."]], memoOpen); }
      S.lastTalk = simTime;
      return true;
    }
    S.payAsk = null; S.payBox = null; player.carry -= n;
    S.pay = { t0: simTime, from: { x: player.x, y: player.y - 10 }, key: p.key, x: p.x, y: p.y, water: p.water, n: n, opened: false };
    var mer = L.coinFly && p.water && whoIs("merchant");
    if (mer) S.pay.to = { x: mer.x, y: mer.y - 10 };
    if (L.memo) { S.pay.memo = S.memoOk; S.memoOk = null; }
    S.posts[p.key] = S.pay;
    confirmOf(p.key);
    if (p.water && BH.river && BH.river.spent) BH.river.spent(p.x, p.y, n);
    if (typeof sfx === "function") sfx("buy");
    if (typeof floatText === "function") floatText(player.x, p.water ? player.y - 20 : Math.min(player.y - 20, p.y - T * 1.4 - 22), "SIGNED", C.gold);
    signed(S.pay);
    return true;
  }
  var memoEl = null, memoFocus = 0, memoT0 = 0, PAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];
  var SHOP = [["3", "OPEN THE GATE"], ["7", "BERRIES"]];
  function shopItem(o) { return SHOP.filter(function (s) { return s[0] === o; })[0] || null; }
  function memoOn() { return !!(memoEl && memoEl.classList.contains("on")); }
  function memoOpen() {
    if (!memoEl) {
      memoEl = document.createElement("div"); memoEl.className = "memo-pop";
      memoEl.innerHTML = '<div class="memo-card"><div class="memo-h">MEMO</div>' +
        '<div class="memo-say">A private note inside your payment. Only the merchant can read it.</div>' +
        '<div class="memo-say">Type the order number of what you want:</div><div class="memo-menu"></div>' +
        '<div class="memo-field">ORDER <b class="memo-v">_</b></div><div class="memo-pad"></div>' +
        '<div class="memo-err"></div><div class="memo-hint">ARROWS + ENTER, OR CLICK</div></div>';
      var pad = memoEl.querySelector(".memo-pad");
      PAD.forEach(function (k, i) {
        var b = document.createElement("button"); b.type = "button"; b.textContent = k; b.className = "memo-k" + (k === "OK" ? " ok" : "");
        b.addEventListener("click", function (e) { e.preventDefault(); memoFocus = i; memoPress(k); });
        pad.appendChild(b);
      });
      document.body.appendChild(memoEl);
    }
    S.memoText = ""; memoFocus = 0; memoT0 = simTime;
    if (game.phase === "play") { game.phase = "talk"; S.memoPaused = true; }
    memoEl.classList.add("on"); memoDraw();
  }
  function memoClose(paid) {
    memoEl.classList.remove("on");
    if (S.memoPaused) {
      S.memoPaused = false;
      if (typeof levelStart === "number") levelStart += Math.max(0, simTime - memoT0);
      if (game.phase === "talk") game.phase = "play";
    }
    if (paid) { S.lastTalk = -9; signPay(); }
  }
  function memoDraw() {
    memoEl.querySelector(".memo-v").textContent = S.memoText || "_";
    memoEl.querySelector(".memo-menu").innerHTML = SHOP.map(function (s) {
      var got = S.bought && S.bought[s[0]];
      return '<div class="memo-item' + (got ? " got" : "") + '"><b>' + s[0] + '</b> ' + s[1] + '<i>' + (got ? "BOUGHT" : "1 ZEC") + '</i></div>';
    }).join("");
    [].forEach.call(memoEl.querySelectorAll(".memo-k"), function (b, i) { b.classList.toggle("f", i === memoFocus); });
  }
  function memoPress(k) {
    var err = memoEl.querySelector(".memo-err"); err.textContent = "";
    if (k === "⌫") S.memoText = "";
    else if (k === "OK") {
      var it = shopItem(S.memoText), got = it && S.bought && S.bought[it[0]];
      if (it && !got) { S.memoOk = it[0]; memoClose(true); return; }
      err.textContent = !S.memoText ? "TYPE AN ORDER NUMBER" : got ? "YOU ALREADY BOUGHT THAT" : "NO ORDER " + S.memoText;
      memoEl.classList.remove("shake"); void memoEl.offsetWidth; memoEl.classList.add("shake");
    } else { S.memoText = k; memoFocus = PAD.length - 1; }
    if (typeof sfx === "function") sfx("ask");
    memoDraw();
  }
  function memoKey(e) {
    var k = e.key, mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[k];
    if (mv) { var f = memoFocus + mv; if (f >= 0 && f < PAD.length && (Math.abs(mv) === 3 || Math.floor(f / 3) === Math.floor(memoFocus / 3))) memoFocus = f; memoDraw(); }
    else if (/^[0-9]$/.test(k)) { memoFocus = PAD.indexOf(k); memoPress(k); }
    else if (k === "Backspace") { memoFocus = 9; memoPress("⌫"); }
    else if ((k === "Enter" || k === " " || e.code === "KeyE") && !e.repeat) memoPress(PAD[memoFocus]);
    else if (k === "Escape") memoClose(false);
  }
  BH.memo = { on: memoOn };
  function askBox(g, cx, y, text, fw) {
    if (S && (S.askT !== text || tnow() - (S.askLast || 0) > 0.4)) sfx("ask");
    if (S) { S.askT = text; S.askLast = tnow(); }
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var label = TOUCH ? "TAP: " + text : text, kw = TOUCH ? 0 : 16, tw = g.measureText(label).width, w = Math.max(fw || 0, tw + 14 + (kw ? kw + 6 : 0)), x0 = cx - w / 2;
    var pulse = 0.5 + 0.5 * Math.sin(simTime * 5);
    g.fillStyle = "rgba(0,0,0,0.82)"; g.fillRect(x0, y - 11, w, 22);
    g.strokeStyle = C.gold; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y - 10.5, w - 1, 21);
    if (kw) {
      var kx = x0 + 5, ky = y - 8, dn = pulse > 0.85 ? 1 : 0;
      g.fillStyle = "#8a5e10"; g.fillRect(kx, ky + 2, kw, 15);
      g.fillStyle = C.gold; g.fillRect(kx, ky + dn, kw, 14);
      g.fillStyle = "#1f130a"; g.font = "800 10px 'Plex Mono', monospace"; g.fillText("E", kx + kw / 2, ky + 7 + dn);
      g.font = "700 9px 'Plex Mono', monospace";
    }
    g.fillStyle = C.gold; g.textAlign = "left"; g.fillText(label, x0 + 7 + (kw ? kw + 6 : 0), y);
    g.restore();
    return { x: cx, y: y, w: w, h: 22 };
  }
  function boardSpot() { var z = (L.talks || []).filter(function (q) { return q.id === "board"; })[0]; return z ? px(z.at) : null; }
  function lines() { return LINES[L.tid] || {}; }
  function whoIs(id) { return S.elders.concat(S.npcs).filter(function (e) { return e.id === id; })[0] || null; }
  function say(seq) { S.sayQ = (S.sayQ || []).concat(seq); }
  function sayAt(ent, text) { if (ent) S.sayQ = (S.sayQ || []).concat([[ent, text]]); }
  function sayTick() {
    if (!S.sayQ || !S.sayQ.length || simTime < (S.sayAt || 0)) return;
    var it = S.sayQ.shift(), e = typeof it[0] === "string" ? whoIs(it[0]) : it[0];
    var life = Math.max(3.4, 1.2 + it[1].length / 40 + it[1].length / 15);
    if (e && seen(e)) { BH.talk.bubble(e, it[1], life); S.sayAt = simTime + life + 0.2; }
  }
  function seen(e) {
    if (typeof view !== "object" || !view || !zoom) return true;
    var y1 = view.y0 + (typeof H === "number" ? H : innerHeight) / zoom;
    return e.x > view.x0 && e.x < view.x1 && e.y > view.y0 && e.y < y1;
  }
  function watcherAt() { var m = markOf("V"); return m ? { x: m.x, y: m.y, topY: m.y - T * 0.9 } : null; }
  function events() {
    var ln = lines(), ev = S.ev || (S.ev = {});
    if (ln.inWater && player.inShield && !ev.inWater) { ev.inWater = true; say(ln.inWater); }
    if (ln.firstIn && !ev.firstIn && BH.bank && BH.bank.info) {
      var pl = BH.bank.info().planks.filter(function (p) { return /^IN/.test(p.text); })[0];
      if (pl) { ev.firstIn = true; sayAt(watcherAt() || whoIs("oak"), ln.firstIn.replace("{n}", (pl.text.match(/\d+/) || ["?"])[0])); }
    }
    climbTick();
    var str = typeof strings !== "undefined" ? strings : [];
    if (ev.nStr == null) ev.nStr = str.length;
    for (; ev.nStr < str.length; ev.nStr++) {
      var why = String(str[ev.nStr].why || "");
      if ((ln.linked || ln.forgive) && /LINKED|^amount$/.test(why) && !ev.linked) {
        ev.linked = true; if (ln.linked) say(ln.linked);
        if (ln.forgive && !(S.payStep > 0) && links > 0) links--;
      }
      if (ln.sameOwner && /SAME OWNER/.test(why) && !ev.same) { ev.same = true; sayAt(watcherAt(), ln.sameOwner); }
    }
    if (ln.shown && !ev.shown && BH.glasskey && BH.glasskey.shown && BH.glasskey.shown()) { ev.shown = true; say(ln.shown); }
    if (ln.board && !ev.board && BH.edge && BH.edge.board && BH.edge.board().length) { ev.board = true; sayAt(whoIs("edge"), ln.board); }
    if (ln.tracker && !ev.tracker && BH.jar && BH.jar.info) {
      var ji = BH.jar.info();
      if (ji && (ji.tokens > 0 || ji.shrug) && ji.tracker) { ev.tracker = true; sayAt({ x: ji.tracker.x, y: ji.tracker.y, topY: ji.tracker.y - T * 1.1 }, ln.tracker); }
    }
    edgeHunt(); pineSwims(); goalStep(); memoTick();
    sayTick();
  }
  function signed(q) {
    var ln = lines();
    if (q.water || !ln.signed) return;
    S.lit = { t0: tnow(), n: prints.length, key: q.key, x: q.x, y: q.y, text: "YOU → POST · " + q.n + " ZEC" };
    (typeof hunters !== "undefined" ? hunters : []).forEach(function (h) {
      var d = Math.hypot(h.x - q.x, h.y - q.y);
      if (h.type === "dog" || d > visionOf(h) * T || !losClear(h.x, h.y, q.x + (h.x - q.x) / (d || 1) * T * 0.6, q.y + (h.y - q.y) / (d || 1) * T * 0.6)) return;
      S.looks = (S.looks || []).concat([{ h: h, x: q.x, y: q.y, t0: simTime }]);
    });
    if (ln.signed.length) say(ln.signed);
  }
  function paidLine(q) {
    var ln = lines();
    if (ln.landPaid && !q.water) { sayAt(merchantOf(true), ln.landPaid); return; }
    if (ln.waterPaid && q.water) { sayAt(merchantOf(true) || merchantOf(false), ln.waterPaid); return; }
    if (q.water && ln.paid) say(ln.paid);
  }
  function memoBought(o) {
    var m = whoIs("merchant"), first = !S.bought; S.bought = S.bought || {}; S.bought[o] = true;
    var l = o === "3" ? [[m, "ORDER 3. The gate is open!"]] : [[m, "ORDER 7. Here are your berries!"]];
    if (first) l.push([m, "Only I can read your memo. The shore just sees a sealed envelope."]);
    if (o === "3") { done("machine"); goalNext(); if (BH.river && BH.river.valid) BH.river.valid(); }
    else S.basket = { t0: simTime + 0.6 };
    S.memoSay = { at: simTime + (o === "3" ? 3.6 : 0.8), l: l };
  }
  function memoTick() {
    if (!S.memoSay || simTime < S.memoSay.at) return;
    var l = S.memoSay.l; S.memoSay = null;
    (typeof hunters !== "undefined" ? hunters : []).forEach(function (h) { if (h.type !== "dog" && seen(h)) BH.talk.bubble(h, "???", 4); });
    say(l);
    if (!(S.bought["3"] && S.bought["7"])) Object.keys(S.zone).forEach(function (k) { if (k.indexOf("machine@") === 0) S.zone[k] = false; });
  }
  function basket(g, x, y) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = "#2a1a0e"; g.fillRect(x - 9, y - 5, 18, 11); g.fillStyle = "#8a6038"; g.fillRect(x - 8, y - 4, 16, 9);
    g.fillStyle = "#6b4a2e"; g.fillRect(x - 8, y, 16, 1); g.fillRect(x - 3, y - 4, 1, 9); g.fillRect(x + 3, y - 4, 1, 9);
    g.fillStyle = "#b8324a"; g.fillRect(x - 6, y - 8, 4, 4); g.fillRect(x - 1, y - 9, 4, 4); g.fillRect(x + 4, y - 8, 4, 4);
    g.fillStyle = "#e86a80"; g.fillRect(x - 5, y - 8, 1, 1); g.fillRect(x, y - 9, 1, 1); g.fillRect(x + 5, y - 8, 1, 1);
  }
  function drawBaskets(g) {
    var m = L.memo && whoIs("merchant"); if (!m) return;
    var b = S.basket, k = b ? Math.max(0, Math.min(1, (simTime - b.t0) / 0.8)) : 0, e = k * k * (3 - 2 * k), ax = m.x + 40, ay = m.y - 4;
    if (!b || k <= 0) basket(g, ax, ay);
    else if (k < 1) basket(g, ax + (player.x - ax) * e, ay + (player.y - 12 - ay) * e - Math.sin(e * Math.PI) * T);
    else if (!b.got) { b.got = true; if (typeof floatText === "function") floatText(player.x, player.y - 20, "YOUR BERRIES", C.gold); }
  }
  function lookTick() {
    S.looks = (S.looks || []).filter(function (l) { if (simTime - l.t0 > 1.5) return false; l.h.dir = Math.atan2(l.y - l.h.y, l.x - l.h.x); return true; });
  }
  function edgeHunt() {
    if (!L.edgeHunt || typeof hunters === "undefined" || !BH.bank) return;
    var e = S.edge || (S.edge = {}), ln = lines();
    if (e.lost || !player.inShield || !prints.length) return;
    var last = prints[prints.length - 1], hh = hunters.filter(function (q) { return q.type !== "dog" && q.state === "search" && Math.hypot(q.x - last.x, q.y - last.y) < T * 1.5; })[0];
    if (!hh) return;
    e.h = hh; e.lost = simTime; e.x = last.x; e.y = last.y;
    if (ln.edge) S.sayQ = [[hh, ln.edge]].concat(S.sayQ || []);
  }
  function pineSwims() {
    if (!L.pineSwims || S.done.pine || S.tour || S.tourPending || BH.talk.isOpen()) return;
    var p = whoIs("pine"), dt = Math.min(0.1, simTime - (S.pineT || simTime)); S.pineT = simTime;
    if (!p || !player.inShield) return;
    var dx = player.x - p.x, dy = player.y - p.y, d = Math.hypot(dx, dy);
    if (d < T * 1.4) { p.anim = "idle"; p.t0 = simTime; SCRIPTS.pine(api0()); return; }
    var mv = Math.min(d - T * 1.2, T * 2.6 * dt), nx = p.x + dx / d * mv, ny = p.y + dy / d * mv;
    if (mv > 0 && isWater(tileAt(nx, ny))) { p.x = nx; p.y = ny; p.dir = dx < 0 ? "left" : "right"; if (p.anim !== "walk") { p.anim = "walk"; p.t0 = simTime; } }
  }
  function goalStep() {
    if (!L.steps || typeof goalEl === "undefined" || !goalEl) return;
    var st = L.steps.filter(function (s) { return s[0] === "need" ? banked() < L.need : s[0] ? !S.done[s[0]] : true; })[0];
    var text = st ? st[1] : null;
    if (S.stepText === undefined) { S.stepText = text; return; }
    if (!text || text === S.stepText) return;
    S.stepText = text;
    var k = goalEl.querySelector(".k"); if (!k) return;
    while (k.nextSibling) goalEl.removeChild(k.nextSibling);
    goalEl.appendChild(document.createTextNode(text));
    popRaw(text, C.gold);
  }
  function drawLit(g) {
    var s = S.lit; if (!s) return;
    var t = tnow() - s.t0, k = Math.floor(s.n * Math.min(1, t / 2.5)), a = 0.65 + 0.35 * Math.sin(t * 5);
    g.fillStyle = "rgba(255,210,74," + a + ")";
    for (var i = 0; i < k && i < prints.length; i++) { var p = prints[i]; g.fillRect(p.x - 2.5, p.y - 2.5, 5, 5); }
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = g.measureText(s.text).width + 14, y = s.y - T * 1.4;
    g.fillStyle = "#2a1a0e"; g.fillRect(s.x - w / 2 - 1, y - 9, w + 2, 18); g.fillStyle = "#8a6038"; g.fillRect(s.x - w / 2, y - 8, w, 16);
    g.fillStyle = "#fffaf0"; g.fillText(s.text, s.x, y);
    g.restore();
  }
  function drawSigns_(g) {
    (S.tourLabels || []).forEach(function (l) { if (l.text) tag(g, l.x, l.y - T * 0.9, l.text); });
    S.tourLabels = (S.tourLabels || []).filter(function (l) { return tnow() - l.t0 < 2.4; });
    if (L.piles && !L.machines && !(L.signs || []).length) Object.keys(L.piles).forEach(function (k) { var c = pileMid(k); tag(g, c.x, (L.piles[k][1]) * T + T * 0.2, "ADDRESS " + k); });
  }
  function tag(g, x, y, text) {
    if (!text) return;
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = g.measureText(text).width + 12;
    g.fillStyle = "rgba(0,0,0,0.8)"; g.fillRect(x - w / 2, y - 8, w, 16); g.fillStyle = C.gold; g.fillText(text, x, y);
    g.restore();
  }
  function readBoard(api) {
    if (!S || !S.boardAsk || S.board || S.done.board || BH.talk.isOpen() || game.phase !== "play" || game.screen !== "play") return false;
    if (simTime - (S.lastTalk || -9) < 0.3) return false;
    S.boardAsk = false; S.boardBox = null; S.board = { t0: tnow() };
    open([["oak", "This board shows every payment ever made. Anyone can read it."],
          ["oak", "Same with your footprints. Look: anyone can follow them and find you."]],
      function () { S.sweep = S.board; S.board = null; done("board"); nice("GATE OPEN"); gates(api || api0()); });
    return true;
  }
  function drawBoardAsk(g) {
    if (!S || !S.boardAsk) return;
    var b = boardSpot(); if (!b) return;
    if (Math.hypot(b.x - player.x, b.y - player.y) > T * 2.6) { S.boardAsk = false; S.boardBox = null; return; }
    S.boardBox = askBox(g, b.x, b.y + T * 1.05, "READ THE BOARD");
  }
  function drawPay(g) {
    if (linkLate) { var lf = linkLate; linkLate = null; lf(g); }
    if (!S) return;
    Object.keys(S.posts || {}).forEach(function (k) { drawPost(g, S.posts[k]); });
    if (!S.payAsk) return;
    var p = S.payAsk, n = payN();
    if (askHeld(p)) { S.payBox = null; return; }
    if (readyCoins() < n) { S.payBox = askBox(g, p.x, p.y + T * 1.05, "BRING " + n + " ZEC"); return; }
    var text = "SIGN, PAY " + n + " ZEC" + (p.water ? "" : " · PUBLIC");
    var at = drawLink(g, p, n, null, L.memo && S.memo ? "ORDER " + (S.memoText || "_") : null, text);
    S.payBox = askBox(g, at.x, at.y, text, at.w);
  }
  function askWidth(g, text) {
    g.save(); g.font = "700 9px 'Plex Mono', monospace";
    var w = g.measureText(TOUCH ? "TAP: " + text : text).width + 14 + (TOUCH ? 0 : 22);
    g.restore();
    return w;
  }
  var linkUnit = null, linkLate = null;
  function unitCost(x0, y0, w, h) {
    var n = 0;
    for (var ty = Math.floor(y0 / T); ty <= Math.floor((y0 + h) / T); ty++)
      for (var tx = Math.floor(x0 / T); tx <= Math.floor((x0 + w) / T); tx++) if (tile(tx, ty) === "H") n++;
    if (dens && x0 < dens.x + T * 1.6 && x0 + w > dens.x - T * 1.6 && y0 < dens.y + T * 1.2 && y0 + h > dens.y - T * 1.8) n += 4;
    return n;
  }
  function zats(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " ZATOSHIS"; }
  function drawLink(g, p, n, to, note, ask) {
    var mer = L.coinFly && p.water && S && whoIs("merchant"), payee = mer || p;
    var fee = 5000 * Math.max(2, n);
    var rows = [(to === "THE EXCHANGE" ? "zcash:tex1shore" : p.water ? "zcash:u1river" : "zcash:t1shore") + "post7k", "TO: " + (to || (mer ? "THE MERCHANT" : "THE GATE POST")),
      "AMOUNT: " + n + " ZEC", "FEE: " + zats(fee)];
    if (p.water) rows.push("MEMO: " + (note || "OPEN THE GATE"));
    g.save(); g.font = "700 8px 'Plex Mono', monospace"; g.textBaseline = "middle";
    var w = 18 + Math.max.apply(null, rows.map(function (r) { return g.measureText(r).width; })), h = 16 + rows.length * 11;
    if (ask) w = Math.max(w, askWidth(g, ask));
    var clear = mer ? 46 : T * 0.5 + 2, unit = h + 21;
    var vx0 = typeof view !== "undefined" ? view.x0 : -1e9, vx1 = typeof view !== "undefined" ? view.x1 : 1e9;
    var vy0 = typeof view !== "undefined" ? view.y0 : -1e9, vy1 = vy0 + (typeof H === "number" && zoom ? H / zoom : 2e9);
    var x0 = payee.x + clear;
    if (x0 + w > vx1 - 4 && payee.x - clear - w >= vx0 + 4) x0 = payee.x - clear - w;
    x0 = Math.max(vx0 + 4, Math.min(vx1 - 4 - w, x0));
    var best = null, bc = 1e9;
    for (var dy = 0; dy <= T * 4; dy += 8) [-dy, dy].forEach(function (d) {
      var yy = Math.max(vy0 + 4, Math.min(vy1 - 4 - unit, payee.y - T * 1.5 + d)), c = unitCost(x0, yy, w, unit) * 1000 + Math.abs(d);
      if (c < bc) { bc = c; best = yy; }
    });
    var y0 = mer ? best : Math.max(vy0 + 4, Math.min(vy1 - 4 - unit, payee.y - unit / 2));
    if (mer) { x0 = Math.max(vx0 + 4, Math.min(vx1 - 4 - w, p.x + T * 0.7)); y0 = Math.max(vy0 + 4, Math.min(vy1 - 4 - unit, p.y - T * 0.6)); }
    linkUnit = { x0: x0, y0: y0, x1: x0 + w, y1: y0 + unit };
    g.fillStyle = "rgba(0,0,0,0.85)"; g.fillRect(x0, y0, w, h);
    g.strokeStyle = C.gold; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    g.fillStyle = C.gold; g.textAlign = "left"; g.fillText("PAYMENT LINK", x0 + 6, y0 + 9);
    var qx = x0 + w - 22, qy = y0 + 4, bits = [0x7f, 0x41, 0x5d, 0x5d, 0x41, 0x7f, 0x2a];
    g.fillStyle = "#f4ead2"; g.fillRect(qx - 1, qy - 1, 17, 17);
    g.fillStyle = "#1f130a";
    for (var r = 0; r < 7; r++) for (var c = 0; c < 7; c++) if ((bits[(r + c * 3) % 7] >> c) & 1) g.fillRect(qx + c * 2 + 1, qy + r * 2 + 1, 2, 2);
    g.fillStyle = "#f4ead2";
    rows.forEach(function (t, i) { g.fillText(t, x0 + 6, y0 + 21 + i * 11); });
    g.restore();
    return { x: x0 + w / 2, y: y0 + h + 10, w: w };
  }
  BH.payLink = drawLink;
  var lateOk = true;
  BH.payLinkLate = function (fn) {
    if (linkLate) lateOk = false;
    if (!lateOk) { linkLate = null; return false; }
    linkLate = fn; return true;
  };
  function drawPost(g, q) {
    var p = q, sm = function (k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
    g.save(); g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    {
      var t = simTime - q.t0, f = q.from;
      if (t < 0.7) {
        var to = q.to || p, k = sm(t / 0.7), cx = f.x + (to.x - f.x) * k, cy = f.y + (to.y - f.y) * k - Math.sin(k * Math.PI) * T;
        g.fillStyle = "#8a5e10"; g.beginPath(); g.arc(cx, cy + 1, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffd24a"; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
      }
      if (t > 0.7 && t < 1.9) {
        var fk = sm((t - 0.7) / 1.2), a = 1 - Math.max(0, (t - 1.5) / 0.4);
        g.globalAlpha = a; g.fillStyle = "#ffd24a"; g.fillRect(p.x + 6 + fk * 10 - 1.5, p.y - 6 - fk * T * 1.6 - 1.5, 3, 3);
        g.fillStyle = "#fffaf0"; g.fillText("FEE", p.x + 22 + fk * 10, p.y - 6 - fk * T * 1.6); g.globalAlpha = 1;
      }
      if (t > 0.8) {
        var c = confirmOf(q.key), lb = String(c.text || "").toUpperCase(), lw = g.measureText(lb).width + 12;
        g.fillStyle = "rgba(0,0,0,0.82)"; g.fillRect(p.x - lw / 2, p.y + T * 1.05 - 9, lw, 18);
        g.fillStyle = c.safe ? C.gold : "#fffaf0"; g.fillText(lb, p.x, p.y + T * 1.05);
      }
    }
    g.restore();
  }
  addEventListener("keydown", function (e) {
    if (memoOn()) { memoKey(e); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if ((e.code === "KeyE" || e.key === " " || e.key === "Enter") && !e.repeat && game.keyScreen === "play" && !(e.target && e.target.closest && e.target.closest("button, input, select, textarea")) && (signPay() || readBoard())) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  addEventListener("pointerdown", function (e) {
    if (!S || !zoom || typeof cam === "undefined") return;
    var hit = S.payBox ? signPay : S.boardBox ? readBoard : null, b = S.payBox || S.boardBox; if (!b) return;
    var vw = W / zoom, vh = H / zoom, cx = clampCam(cam.x, vw, cols * T), cy = clampCam(cam.y, vh, rows * T);
    var sx = W / 2 + (b.x - cx) * zoom, sy = H / 2 + (b.y - cy) * zoom, r = canvas.getBoundingClientRect();
    if (e.target !== canvas) return;
    var x = e.clientX - r.left, y = e.clientY - r.top, pad = 14;
    if (Math.abs(x - sx) < b.w * zoom / 2 + pad && Math.abs(y - sy) < b.h * zoom / 2 + pad && hit()) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  function done(id) { S.done[id] = true; if (id === "forever") solved[game.levelIdx + ":" + id] = true; }
  function nice(text) {
    if (typeof sfx === "function") sfx("coin");
    if (typeof ring === "function") ring(player.x, player.y, C.gold, T * 1.5, 0.4);
    if (text && typeof floatText === "function") floatText(player.x, player.y - 20, text, C.gold);
  }
  var introSeen = {}, solved = {};
  var TALK_NAME = { pay1: "PINE", pay2: "THE MERCHANT", merchant: "THE MERCHANT", forever: "THE NOTICE BOARD", camp: "AYAB AT THE FIRE", stranger: "THE STRANGER", auditor: "THE AUDITOR",
    tunnel: "PINE", swap: "THE SWAP POST", server: "PINE", link: "THE MERCHANT", build: "THE BUILD POST", prove: "THE PROVE POST", sign: "THE SIGN POST" };
  function talkLeft(ids) {
    var names = ids.map(function (id) { return TALK_NAME[id] || "EVERYONE"; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    return "TALK TO " + names.join(" AND ") + " FIRST";
  }

  var S = null, walletMadeHere = false;

  function makeWallet(api, after, intro, ask, skip) {
    var r = api.rng, w = shuffle(WORDS, r).slice(0, 24), third = w[2];
    var wrong = shuffle(WORDS.filter(function (x) { return w.indexOf(x) < 0; }), r).slice(0, 2);
    var opts = shuffle([third].concat(wrong), r);
    function quiz(lead, noted) {
      open((lead ? [["oak", lead]] : []).concat([
        { who: "oak", text: "Quick: what's word 3?", choices: opts.map(function (o) {
          return { text: o, then: function () {
            if (o !== third) {
              if (noted) quiz("Nope. Check your note again.", true);
              else { notepad(w); quiz("Lost words, lost coins. Write them down this time.", true); }
              return;
            }
            notepad(null); nice("WALLET MADE");
            var t = TR(); t.wallets = 1; walletMadeHere = true; persist();
            if (S) S.wNow = true;
            open([["sly", "Whoever has the words has the coins."]]);
            if (after) after();
          } };
        }) }
      ]));
    }
    function offer() {
      open([{ who: "oak", text: "Your wallet is backed up by 24 words. Write them down.", choices: [
        { text: "Write it down", then: function () { notepad(w); quiz(null, true); } },
        { text: "Fuck around and find out", then: function () { quiz("Your call.", false); } }] }]);
    }
    if (!ask) { offer(); return; }
    (function choose(lead) {
      open((lead || []).concat([{ who: "oak", text: lead ? "So. Want one?" : intro, choices: [
        { text: "Make a wallet", then: offer },
        { text: "Why do I need a wallet?", then: function () { choose([
          ["oak", "Look at you, all fur and no pockets. Where were you gonna keep your coins?"],
          ["sly", "No wallet, no keys, no coins. Let's make your first one."]]); } },
        { text: "Not now", then: function () { if (skip) skip(); } }] }]));
    })();
  }
  function notepad(words) {
    var el = document.getElementById("trailNote");
    if (!words) { if (el) el.classList.remove("on"); return; }
    if (!el) { el = document.createElement("div"); el.id = "trailNote"; document.body.appendChild(el); }
    el.textContent = "";
    var head = document.createElement("div"); head.className = "tn-head"; head.textContent = "MY " + words.length + " WORDS";
    var ol = document.createElement("ol"); ol.style.columnCount = "2"; ol.style.columnGap = "14px";
    words.forEach(function (x, i) {
      var li = document.createElement("li"), b = document.createElement("b");
      b.textContent = (i + 1) + "."; li.appendChild(b); li.appendChild(document.createTextNode(" " + x)); ol.appendChild(li);
    });
    el.appendChild(head); el.appendChild(ol);
    el.classList.add("on");
  }
  var TOUCHED_HOLD = 0, TOUCHED_FLY = 0.5;
  function unlockCoins() {
    if (!S || !S.locked) return; S.locked = false; S.unlockAt = simTime;
    S.coins.forEach(function (c) {
      if (!c.locked) return;
      if (c.touched) { c.touched = false; (S.touchedQ = S.touchedQ || []).push(c); return; }
      c.locked = false; c.got = false;
    });
    sfx("buy");
  }
  function touchedTick() {
    if (!S.touchedQ || !S.touchedQ.length) return;
    if (S.touchedFlyAt == null) {
      if (L.wallet && !S.wAt) return;
      var landAt = L.wallet ? S.wAt : Math.max(S.unlockAt, S.wLandAt || (S.wAt ? S.wAt + 1.4 : S.unlockAt + 1.7));
      if (simTime - landAt < TOUCHED_HOLD) return;
      S.touchedQ.forEach(function (c) { c.locked = false; c.got = true; });
      S.touchedFlyAt = simTime;
      return;
    }
    if (simTime - S.touchedFlyAt < TOUCHED_FLY) return;
    S.touchedQ.forEach(function (c) { player.carry++; BH.items.hook("onCoin", c); });
    S.touchedQ = null;
  }

  function friendSpots(api, ok, pref) {
    var x0 = player.tx, y0 = player.ty;
    if (!ok(api.tileAt(x0, y0))) return pref.filter(function (o) { return ok(api.tileAt(x0 + o[0], y0 + o[1])); });
    var dist = {}, q = [[0, 0]], out = [];
    dist["0,0"] = 0;
    while (q.length) {
      var o = q.shift(), d = dist[o[0] + "," + o[1]];
      if (d >= 4) continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (s) {
        var n = [o[0] + s[0], o[1] + s[1]], k = n[0] + "," + n[1];
        if (dist[k] != null || !ok(api.tileAt(x0 + n[0], y0 + n[1]))) return;
        dist[k] = d + 1; q.push(n);
      });
    }
    pref.forEach(function (o) { var d = dist[o[0] + "," + o[1]]; if (d && d <= 3) out.push(o); });
    Object.keys(dist).map(function (k) { return k.split(",").map(Number); })
      .filter(function (o) { return dist[o[0] + "," + o[1]] > 0 && !out.some(function (p) { return p[0] === o[0] && p[1] === o[1]; }); })
      .sort(function (a, b) { return dist[a[0] + "," + a[1]] - dist[b[0] + "," + b[1]]; })
      .forEach(function (o) { out.push(o); });
    return out;
  }

  var SCRIPTS = {
    coin: function (api) {
      if (L.sync) { popRaw("YOUR WALLET HASN'T FOUND THIS COIN YET. SYNC WITH PINE", C.gold); return; }
      if (S.coinJolt != null) return;
      S.coinJolt = simTime;
      var c = S.coins.filter(function (k) { return k.locked; }).sort(function (a, b) { return Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y); })[0];
      if (c) {
        c.touched = true;
        var dx = player.x - c.x, dy = player.y - c.y, d = Math.hypot(dx, dy);
        if (d < 1) { dx = -1; dy = 0; d = 1; }
        var from = tileAt(player.x, player.y), back = 0;
        for (var k = 1; k <= 8; k++) { if (hitsWall(c.x + dx / d * T * 0.12 * k, c.y + dy / d * T * 0.12 * k, player.r || 5, from, true)) break; back = k; }
        player.x = c.x + dx / d * T * 0.12 * back; player.y = c.y + dy / d * T * 0.12 * back;
        ring(c.x, c.y, "rgba(224,70,50,0.95)", T * 1.6, 0.6); puff(c.x, c.y, 16, "rgba(224,70,50,0.9)", 42);
        popRaw("LOCKED", C.red);
      }
      hitstop(0.6); addTrauma(0.95); sfx("linked");
    },
    machine: function (api) {
      if ((S.done.machine && !L.memo) || S.pay) return;
      if (L.memo && S.bought && S.bought["3"] && S.bought["7"]) { var mm = whoIs("merchant"); if (mm) BH.talk.bubble(mm, "Sold out! Thanks!", 2.6); return; }
      var want = payWant(), near = want && payPost(true), order = lines().order;
      if (near && near.water !== (want === "water")) { var el = whoIs(order ? order[2] : "oak"); if (el && order) BH.talk.bubble(el, order[want === "water" ? 1 : 0], 3.6); return; }
      if (player.carry < payN()) { var sly = S.elders.filter(function (e) { return e.id === "sly"; })[0]; if (sly) BH.talk.bubble(sly, "Bring the post a coin first.", 3.2); return; }
      if (L.memo && S.memo == null) {
        open([["merchant", "Welcome to my shop! Everything is 1 ZEC."],
              ["merchant", "Order 3 opens the gate to the den. Order 7 is a basket of berries."],
              ["merchant", "In the waters I can't see who paid me. The number in your memo tells me what you bought."]], function () { S.memo = true; S.payAsk = payPost(); });
        return;
      }
      S.payAsk = payPost();
    },
    pine: function (api) {
      if (S.done.pine) return;
      var d = (L.npcs || []).filter(function (q) { return q.id === "pine"; })[0], p = whoIs("pine");
      if (!d || !d.pays) return;
      done("pine");
      if (L.coinFly && p) {
        open([["pine", "Hey, friend! Here are the " + d.pays + " ZEC I owe you."]], function () {
          for (var k = 0; k < d.pays; k++) payMe(p, "", k === d.pays - 1 ? function () { open(lines().pine); } : null, k * 0.35);
          if (BH.river && BH.river.ripple) { BH.river.ripple(p.x, p.y); BH.river.log.push({ t: api0().time, x: p.x, y: p.y, n: d.pays, dir: "in", by: "PINE" }); }
        });
        return;
      }
      if (BH.river && BH.river.pay) BH.river.pay(p, d.pays, "PINE"); else player.carry += d.pays;
      if (lines().pine) sayAt(p, lines().pine);
    },
    board: function (api) {
      if (S.done.board || S.board) return;
      S.boardAsk = true;
    },
    pay1: function (api) {
      if (S.done.pay1) return;
      done("pay1");
      var p = S.npcs.filter(function (n) { return n.id === "pine"; })[0];
      open([["pine", "Here's the coin I owe you! Sending it to your address."]], function () { if (p) payMe(p, "ADDRESS #1"); });
    },
    pay2: function (api) {
      if (S.done.pay2) return;
      if (!S.done.pay1) { open([["merchant", "Pine owes you a coin first. Go see Pine."]]); return; }
      var m = S.npcs.filter(function (n) { return n.id === "merchant"; })[0], p = S.npcs.filter(function (n) { return n.id === "pine"; })[0];
      function paid(reused) {
        done("pay2");
        payMe(m, reused ? "ADDRESS #1" : "ADDRESS #2", function () {
          if (!reused) { nice("NOT LINKED"); open([["sly", "A new address. Nobody can tell both coins went to you."]]); return; }
          var w = nearestReachable(player.x, player.y); if (!w) hunters.forEach(function (h) { if (!w || Math.hypot(h.x - player.x, h.y - player.y) < Math.hypot(w.x - player.x, w.y - player.y)) w = h; });
          var to = stepBack(m);
          S.strike = { t0: simTime, h: w, api: api, pine: p, m: m, from: { x: m.x, y: m.y }, mTo: to, c0: { x: cam.x, y: cam.y }, a: { x: p.x, y: p.y - 10 }, b: { x: to.x, y: to.y - 10 }, n: 0 };
        });
      }
      open([{ who: "merchant", text: "I owe you a coin for the berries. Which address do I send it to?", choices: [
        { text: "The same one I gave Pine", then: function () { paid(true); } },
        { text: "A new address", then: function () { paid(false); } }] }]);
    },
    forever: function (api) {
      if (S.done.forever) return;
      done("forever");
      open([["oak", "These footprints are years old, and hunters can still read them."], ["sly", "They never wash away. Think before you step!"]]);
    },
    camp: function (api) {
      if (S.done.camp) return;
      open([{ who: "sly", text: "Cozy! Hey... lend me 2 coins? I'll pay you back. Pinky promise!", choices: [
        { text: "Lend Ayab 2 coins", then: function () {
          var t = TR(); t.lent = true; save.wallet = Math.max(0, (save.wallet || 0) - 2); persist(); done("camp");
          floatText(player.x, player.y - 20, "-2 ZEC", C.red, "lent to Ayab");
          open([["oak", "...A payment can't be taken back. On the chain, a loan is only trust."]]);
        } },
        { text: "Sorry, not today", then: function () { done("camp"); open([["sly", "Worth a try!"]]); } }] }]);
    },
    stranger: function (api) {
      if (S.done.stranger) return;
      open([{ who: "stranger", text: "Wallet support here! Your wallet is broken. Tell me your 24 words, quick!", choices: [
        { text: "Tell them the words", then: function () { open([["stranger", "Thanks! ...Bye!"]], function () { lose("robbed"); }); } },
        { text: "Never. Nobody needs my words.", then: function () {
          done("stranger"); nice("WORDS KEPT");
          open([["oak", "Real support never asks for your words. Ever."]]);
        } }] }]);
    },
    cubemachine: function (api) {
      if (S.built) { popRaw("GO PAY THE MERCHANT, IN THE WATER", C.gold); return; }
      if (S.held.tag && S.held.proof && BH.trailPuzzles && !S.puzzled) {
        BH.trailPuzzles.open("jar", function (r) {
          if (!r || !r.ok) return;
          BH.trailPuzzles.open("cave", function (r2) {
            if (!r2 || !r2.ok) return;
            S.puzzled = true; S.built = true; done("cubemachine"); nice("PAYMENT BUILT"); puff(player.x, player.y, 18, "rgba(190,235,255,0.9)", 50);
            open([["sly", "Payment built! Now pay the merchant. In the water!"]]);
          });
        });
        return;
      }
      if (S.held.tag && S.held.proof) {
        S.built = true; done("cubemachine"); nice("PAYMENT BUILT"); puff(player.x, player.y, 18, "rgba(190,235,255,0.9)", 50);
        open([["machine", "SPENT TAG: STOPS A COIN BEING SPENT TWICE, WITHOUT SAYING WHICH.\nPROOF: THE RULES WERE KEPT. NOTHING ELSE."],
              ["sly", "Payment built! Now pay the merchant. In the water!"]]);
        return;
      }
      popRaw("NEED: SPENT TAG" + (S.held.tag ? " ✓" : "") + " + PROOF" + (S.held.proof ? " ✓" : ""), C.gold);
    },
    merchant: function (api) {
      if (S.done.merchant) return;
      if (S.built) {
        done("merchant"); nice("PAID IN THE DARK");
        open([["merchant", "Paid! And from the shore, nobody sees who paid me, or how much."]]);
        return;
      }
      var m = S.npcs.filter(function (n) { return n.id === "merchant"; })[0];
      open([{ who: "merchant", text: "No shielded payment? Pay me the public way, then?", choices: [
        { text: "Pay the public way", then: function () {
          done("merchant"); api.link("PAID IN THE OPEN", m.x, m.y, player.x, player.y);
          clue("paid in the open");
          open([["merchant", "Got it. So did everyone watching."]]);
        } },
        { text: "I'll build a shielded payment", then: function () {} }] }]);
    },
    tunnel: function (api) {
      if (S.done.tunnel) return;
      open([["pine", "I run the server your wallet talks to. Your payments are hidden from me."],
            { who: "pine", text: "But every time you connect, I see where you're calling from. How do you connect?", choices: [
        { text: "Through a tunnel (Tor)", then: function () {
          done("tunnel"); nice("ADDRESS HIDDEN");
          open([["pine", "Now I can't tell where you are. Neither can anyone listening."]]);
        } },
        { text: "Straight in. It's private anyway", then: function () {
          done("tunnel"); clue("showed where you connect from");
          open([["oak", "Hidden payments don't hide your internet address. Use a tunnel."]]);
        } }] }]);
    },
    swap: function (api) {
      if (S.done.swap) return;
      open([["swap", "SWAP POST (NEAR INTENTS): ZEC IN, ANY OTHER COIN OUT.\nIT ONLY TAKES ZEC FROM A PUBLIC ADDRESS."],
            { who: "swap", text: "YOUR 5 ZEC ARE IN THE WATERS. HOW DO YOU SWAP?", choices: [
        { text: "Unshield all 5 and swap right away", then: function () {
          done("swap"); clue("unshielded and swapped at once");
          open([["oak", "Out of the waters and straight to the swap, same amount. Easy to match."]]);
        } },
        { text: "Wait, unshield only what I swap, shield what comes back", then: function () {
          done("swap"); nice("SWAPPED QUIETLY");
          open([["oak", "Good. Exchanges are the same: they only take public coins."],
                ["sly", "So a good wallet asks you before it unshields anything!"]]);
        } }] }]);
    },
    server: function (api) {
      if (S.done.server) return;
      open([["pine", "I run the server. I hand you every new payment. Not just yours: everyone's, all locked."],
            { who: "pine", text: "So which of these thousand payments are yours?", choices: [
        { text: "My wallet tries my key on every one", then: function () {
          done("server"); unlockCoins(); nice("4 ARE MINE");
          open([["pine", "Tried on all 1,000. Your key opened 4. Those coins are yours now."],
                ["oak", "And the server never learned which ones. That's why it tries them all."]]);
        } },
        { text: "Pine, just tell me which ones are mine", then: function () {
          done("server"); unlockCoins(); clue("told the server which payments are yours");
          open([["pine", "Sure! ...And now I know which payments are yours."],
                ["oak", "Never let the server do the looking. You check every payment yourself."]]);
        } }] }]);
    },
    link: function (api) {
      if (S.done.link) return;
      (function ask(lead) {
        open((lead || []).concat([{ who: "merchant", text: "Berries, 1 ZEC. Here's my payment link:\nzcash:u1berry...?amount=1&memo=ORDER-7", choices: [
          { text: "Scan the link", then: function () {
            done("link"); nice("PAID"); gates(api);
            open([["merchant", "Address, amount and memo, all from the link. Nothing typed, nothing wrong."],
                  ["oak", "And the wallet picks the private receiver inside that address."]]);
          } },
          { text: "Type the address by hand", then: function () { ask([["merchant", "One wrong letter and your coins go to nobody. Use the link."]]); } }] }]));
      })();
    },
    build: function (api) {
      if (S.done.build) { popRaw("BUILT · NOW THE PROVE POST", C.gold); return; }
      open([["machine", "BUILD POST, ON YOUR PHONE: 1 ZEC TO THE MERCHANT + CHANGE + 0.0001 FEE.\nNOT PROVEN, NOT SIGNED. JUST THE PLAN."]], function () { done("build"); nice("BUILT"); });
    },
    prove: function (api) {
      if (S.done.prove) { popRaw("PROVEN · NOW THE SIGN POST", C.gold); return; }
      if (!S.done.build) { popRaw("BUILD IT FIRST", C.gold); return; }
      open([["machine", "PROVE POST: MAKES THE PROOF THAT THE RULES WERE KEPT.\nHEAVY WORK, SO A FAST MACHINE DOES IT. IT NEVER SEES YOUR KEY."]], function () { done("prove"); nice("PROVEN"); });
    },
    sign: function (api) {
      if (S.done.sign) return;
      if (!S.done.prove) { popRaw(S.done.build ? "PROVE IT FIRST" : "BUILD IT FIRST", C.gold); return; }
      open([{ who: "machine", text: "SIGN POST (A HARDWARE WALLET). YOUR KEY NEVER LEAVES IT.\nSCREEN: SEND 1 ZEC TO THE MERCHANT?", choices: [
        { text: "It matches. Sign", then: function () {
          done("sign"); nice("SIGNED · SENT"); gates(api);
          open([["sly", "Three hands, one payment. The key stayed home the whole time!"]]);
        } },
        { text: "Sign without reading the screen", then: function () {
          done("sign"); clue("signed without checking the screen"); gates(api);
          open([["oak", "Sent. But the screen is the one thing a hacked phone can't fake. Always read it."]]);
        } }] }]);
    },
    auditor: function (api) {
      if (S.done.auditor) return;
      if (BH.trailPuzzles) {
        BH.trailPuzzles.open("key", function (r) {
          if (!r) return;
          done("auditor");
          if (r.pick === "incoming") nice("VIEWING KEY");
          else clue({ full: "showed more than the auditor asked for", words: "handed over the spending words", none: "refused the auditor" }[r.pick] || "refused the auditor");
        });
        return;
      }
      open([{ who: "auditor", text: "Forest council audit! Show me what you RECEIVED this season.", choices: [
        { text: "My incoming viewing key", then: function () {
          done("auditor"); nice("VIEWING KEY");
          open([["auditor", "I see every payment in, and its memo: 'ORDER 7: BERRIES'. Nothing you sent. I can't move a coin."],
                ["sly", "Memos are sealed notes inside a payment. Only a key can read them."]]);
        } },
        { text: "My full viewing key", then: function () {
          done("auditor"); clue("showed more than the auditor asked for");
          open([["auditor", "This shows what you SENT too. More than I asked for. The incoming key was enough."]]);
        } },
        { text: "My 24 words", then: function () {
          done("auditor"); clue("handed over the spending words");
          open([["auditor", "These SPEND everything! Never hand them out. I'll forget I saw them."]]);
        } },
        { text: "Nothing at all", then: function () {
          done("auditor"); clue("refused the auditor");
          open([["auditor", "Then my report says: would not cooperate."]]);
        } }] }]);
    }
  };

  var INTRO = {};
  var CHATTER = {
    steps: [[30, "oak", "The den is in the far corner."]],
    machine: [[20, "sly", "Bring the post one coin."]],
    wise: [[18, "sly", "Stay out of the light!"]]
  };
  var LINES = {
    bank: { inWater: [["sly", "You're shielded now. Nobody can see who you are in here."]], firstIn: "In: {n}, from those footprints. After that, nothing.",
      edge: "The footprints stop at the water. Where did they go?" },
    wise: { signed: [] },
    inriver: { pine: [["sly", "In the waters, money comes as a sealed envelope called a note. Nobody on land can see inside, and only you can spend it."], ["sly", "Pine paid you. On land they only saw a ripple."]] },
    stayin: { forgive: true,
      order: ["First pay the merchant at his stall, on land.", "Now pay the merchant in the waters. Stay in the water.", "oak"],
      landPaid: "Everyone on land saw that one. Pay me the next one in here and nobody will.", waterPaid: "Paid! Nobody on land saw who, or how much." },
    anybox: { tracker: "Which one was yours? Could be any." },
    piles: { sameOwner: "Both piles at once? Then both are yours." },
    doors: { sameOwner: "Coins from A and B in one trip? Then both addresses are yours." },
    glasskey: { shown: [["auditor", "I can see it all. I can't touch a coin."], ["oak", "Only she sees. And she keeps the key."]] },
    campfire: { board: "Someone got paid. Who, and how much? Hidden." }
  };

  var SHOWDOWN = {
    hound1: [
      { q: "So. The little one. I know your name, don't I?", ok: "No. My footprints show wallets, not names.", bad: "How did you find out?!", leak: "panicked about a name" },
      { q: "I know every coin in all your wallets.", ok: "Only the addresses you managed to link.", bad: "It's only the main wallet, I swear!", leak: "named the main wallet" },
      { q: "Then I'll freeze your coins.", ok: "You can't. Nobody controls the chain.", bad: "Please don't!", leak: "begged" }],
    hound2: [
      { q: "Back again. I watched you go into the waters with your coins.", ok: "And you can't see what I did inside.", bad: "I only spent two of them!", leak: "told him an amount" },
      { q: "Then I'll read your payments.", ok: "They're shielded. Only my viewing key can show them.", bad: "Fine. Here are my words.", leak: "offered the words" },
      { q: "Someone paid the merchant in the waters. I'll prove it was you.", ok: "You'll see a spent tag and a proof. Not which coin, not who.", bad: "That was my other wallet!", leak: "named another wallet" }]
  };
  function showdown(api) {
    var list = SHOWDOWN[L.showdown] || [], i = 0;
    S.sd = "on";
    var have = allClues();
    var lead = have.length ? "So. You came. My file on you: " + have.join(". ") + "." : "So. You came. My file on you is... empty. Interesting.";
    function next(pre) {
      if (strikes() >= 3) { open([["hound", "That goes in the file. And that's enough: I know who you are. Now I come and find you."]], function () { lose("found"); }); return; }
      var c = list[i++];
      if (!c) { win(pre); return; }
      var r = api.rng() < 0.5;
      var good = { text: c.ok, then: function () { next("...Hm."); } };
      var bad = { text: c.bad, then: function () { clue(c.leak); next("Thank you. That goes in the file."); } };
      open([{ who: "hound", text: pre + "\n" + c.q, choices: r ? [good, bad] : [bad, good] }]);
    }
    function win(pre) {
      S.sd = "won";
      var lines = L.showdown === "hound1"
        ? [["hound", pre + " You learn fast. But I always find a trail, sooner or later."], ["oak", "Come. Tomorrow, the waters."]]
        : [["hound", pre + " The waters show me nothing. Fine. I'll watch the shore."], ["sly", "We did it! Group hug!"]];
      open(lines, function () { api.win(); });
    }
    next(lead);
  }

  var CINE = [["oak", "You're lucky we found you out there. I'm Shilo, that's Ayab. You're safe here."]];
  function placeCine() {
    var p0 = S.cineP0;
    S.elders.forEach(function (e, i) { e.x = -T * (i ? 4.2 : 1.2); e.y = p0.y + 0.2 * T; e.dir = "right"; });
    player.x = -T * 2.6; cam.x = player.x; cam.y = player.y;
    document.body.classList.add("trail-cine");
  }
  function startCine() {
    var p0 = S.cineP0 || { x: player.x, y: player.y };
    player.y = p0.y;
    S.cine = { t0: simTime, from: [], p: { x: -T * 2.6, tx: p0.x } };
    game.phase = "talk";
    document.body.classList.add("trail-cine");
    S.elders.forEach(function (e, i) {
      var tx = p0.x + (i ? -1.4 : 1.4) * T, ty = p0.y + 0.2 * T, sx = -T * (i ? 4.2 : 1.2);
      S.cine.from.push({ x: sx, tx: tx, ty: ty });
      e.x = sx; e.y = ty; e.dir = "right"; e.anim = "walk"; e.t0 = simTime;
    });
    player.x = S.cine.p.x; player.dir = "right"; player.anim = "walk"; player.animT0 = simTime;
    cam.x = player.x; cam.y = player.y;
  }
  var CINE_SHOUTS = [];
  function cineShouts(c) {
    CINE_SHOUTS.forEach(function (s, j) {
      var e = S.elders[s[0]];
      if (!e || c.shout[j] || e.x - s[2] < view.x0 || (j && simTime - (c.shout[j - 1] || 1e9) < 1.1)) return;
      c.shout[j] = simTime; BH.talk.bubble(e, s[1], 1.3);
    });
  }
  function stepCine() {
    var c = S.cine, k = Math.min(1, (simTime - c.t0) / 2.8);
    S.elders.forEach(function (e, i) {
      var f = c.from[i]; if (!f) return;
      e.x = f.x + (f.tx - f.x) * k; e.y = f.ty; e.dir = "right";
    });
    player.x = c.p.x + (c.p.tx - c.p.x) * k;
    if (!c.shout) c.shout = []; if (!c.talked) cineShouts(c);
    if (k >= 1 && !c.talked) {
      c.talked = true; c.tArrive = simTime;
      S.elders.forEach(function (e) { e.anim = "idle"; e.t0 = simTime; });
      player.anim = "idle"; player.animT0 = simTime;
      open(CINE, function () { endCine(); S.teachWalk = true; });
    }
  }
  function cineLight(g) {
    var c = S.cine;
    if (c && !S.beam) S.beam = { t0: c.t0, tEnd: 0, prints: [], last: [] };
    var b = S.beam; if (!b) return;
    if (c) [player].concat(S.elders).forEach(function (e, i) {
      var l = b.last[i] || (b.last[i] = { x: e.x, side: 1 });
      if (e.x - l.x > T * 0.5) { l.x = e.x; l.side = -l.side; b.prints.push({ x: e.x, y: (i ? e.y + 9 : e.y + 19) + 2.5 * l.side }); }
    });
    g.save(); g.fillStyle = "rgba(255,227,154,0.3)";
    b.prints.forEach(function (p) {
      if (p.x <= 0) return;
      g.save(); g.translate(Math.round(p.x), Math.round(p.y)); g.rotate(1.5708);
      g.fillRect(-1.5, -1, 3, 4); g.fillRect(-2.5, -3.5, 1.5, 1.5); g.fillRect(-0.75, -4.25, 1.5, 1.5); g.fillRect(1, -3.5, 1.5, 1.5);
      g.restore();
    });
    var t = simTime - b.t0, a = Math.min(1, t / 0.8) * (b.tEnd ? Math.max(0, 1 - (simTime - b.tEnd) / 1.2) : 1);
    if (a > 0) {
      var lb = BH.trailLighthouse ? BH.trailLighthouse.beam(t, S.cineP0.y) : { x: -T * 9, y: S.cineP0.y, dir: Math.sin(t * 0.8) * 0.3, half: 0.2, vis: T * 12.5 }, x = lb.x, y = lb.y, dir = lb.dir, vis = lb.vis, gr = g.createRadialGradient(x, y, 4, x, y, vis);
      gr.addColorStop(0, "rgba(234,186,73," + (0.3 * a).toFixed(3) + ")"); gr.addColorStop(0.7, "rgba(234,186,73," + (0.5 * a).toFixed(3) + ")");
      gr.addColorStop(1, "rgba(234,186,73,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, y);
      for (var i = 0; i <= 24; i++) {
        var an = dir - lb.half + 2 * lb.half * i / 24, d = 0, px, py;
        while (d < vis) {
          px = x + Math.cos(an) * d; py = y + Math.sin(an) * d;
          if (px >= 0 && solidP(tileAt(px, py)) && !(S.bent && px < T && S.bent["0," + Math.floor(py / T)])) break;
          d += 4;
        }
        g.lineTo(x + Math.cos(an) * d, y + Math.sin(an) * d);
      }
      g.closePath(); g.fill();
    }
    g.restore();
  }
  var TW = 54, TH = 104, tallTrees = [];
  function tallTree(r, s) {
    var c = document.createElement("canvas"), w = Math.round(TW * s), h = Math.round(TH * s); c.width = w; c.height = h;
    var b = c.getContext("2d");
    b.fillStyle = "rgba(0,0,0,0.3)"; b.beginPath(); b.ellipse(w / 2, h - 4, 14, 4, 0, 0, 6.283); b.fill();
    b.fillStyle = C.trunk; b.fillRect(Math.round(w / 2) - 4, h - 26, 8, 22);
    [[0, 6, 6], [6, 12, 8], [13, 20, 9], [21, 28, 10], [30, 36, 11], [40, 44, 12], [51, 52, 14], [63, 54, 15]].forEach(function (l0) {
      var l = [Math.round(l0[0] * s), Math.round(l0[1] * s / 2) * 2, Math.max(4, Math.round(l0[2] * s))], x = Math.round((w - l[1]) / 2);
      b.fillStyle = C.tree; b.fillRect(x, l[0], l[1], l[2]);
      b.fillStyle = r ? C.tree2 : C.tree3; b.fillRect(x + 2, l[0], Math.floor(l[1] / 2) - 2, 2);
      b.fillStyle = "rgba(0,0,0,0.22)"; b.fillRect(x, l[0] + l[2] - 2, l[1], 2);
    });
    return c;
  }
  function treeAt(g, cx, by, r, a) {
    if (!tallTrees.length) tallTrees = [tallTree(0, 1), tallTree(1, 1), tallTree(0, 0.82), tallTree(1, 0.9)];
    var c = tallTrees[Math.floor(r * 4) % 4];
    g.globalAlpha = a; g.drawImage(c, Math.round(cx - c.width / 2), Math.round(by - c.height)); g.globalAlpha = 1;
  }
  function denArrow() {
    if (!dens || game.phase !== "play" || game.screen !== "play") return;
    var dx = dens.x - player.x, dy = dens.y - player.y, d = Math.hypot(dx, dy);
    if (d < T * 2) return;
    var a = Math.atan2(dy, dx), r = T * 1.15 + Math.sin(simTime * 5) * 2.5;
    ctx.save(); ctx.translate(player.x + Math.cos(a) * r, player.y - T * 0.2 + Math.sin(a) * r); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -7); ctx.lineTo(-2, 0); ctx.lineTo(-5, 7); ctx.closePath();
    ctx.lineJoin = "miter"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(27,27,27,0.85)"; ctx.stroke();
    ctx.fillStyle = C.gold; ctx.fill();
    ctx.restore();
  }
  var baseDrawHint = window.drawHint;
  window.drawHint = function () {
    var h = S && S.hushed && typeof currentHint === "function" && currentHint();
    if (h && h.k === "home") return L.mustPay && !S.done.machine ? undefined : denArrow();
    if (h && S.hushed[h.k]) return;
    return baseDrawHint.apply(this, arguments);
  };
  window.goalBottom = function () { return 56; };
  window.tickGoal = function () {
    if (!goalEl || goalEl.className.indexOf("on") < 0) return;
    var cine = document.body.classList.contains("trail-cine");
    if (cine) goal.cine = true;
    if (goalEl.className.indexOf("lit") < 0 && (!cine || (S && S.cine && simTime - S.cine.t0 > 2.3))) goalEl.className += " lit";
    var t = typeof simTime === "number" ? simTime : 0;
    if (goal.lastT != null) goal.seen += Math.max(0, Math.min(0.25, t - goal.lastT));
    goal.lastT = t;
    var read = goal.seen >= Math.min(goal.need, 2.5);
    if (!cine && (goal.cine || (read && (goal.hideAsked || goal.seen >= goal.need))) && goalEl.className.indexOf("dock") < 0) goalEl.className += " dock";
  };
  window.drawPine = function (b, px, py) {
    b.fillStyle = "rgba(0,0,0,0.3)"; b.beginPath(); b.ellipse(px + T / 2, py + T - 4, 14, 4, 0, 0, 6.283); b.fill();
    b.fillStyle = C.trunk; b.fillRect(px + T / 2 - 4, py + T - 14, 8, 10);
  };
  function drawBeyond(cx, cy, vw, vh) {
    var g = ctx, mw = cols * T, mh = rows * T, x0 = cx - vw / 2 - T, x1 = cx + vw / 2 + T, y0 = cy - vh / 2 - T, y1 = cy + vh / 2 + T;
    if (x0 >= 0 && x1 <= mw && y0 >= 0 && y1 <= mh) return;
    g.fillStyle = C.tree; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    var tx0 = Math.floor(x0 / T), tx1 = Math.ceil(x1 / T), ty0 = Math.floor(y0 / T), ty1 = Math.ceil(y1 / T);
    for (var ty = ty0; ty < ty1; ty++) for (var tx = tx0; tx < tx1; tx++) {
      if (tx >= 0 && tx < cols && ty >= 0 && ty < rows) continue;
      var h = hash(tx * 3 + 7, ty * 5 + 1), px = tx * T + Math.floor(h * 8) - 4, py = ty * T + Math.floor(hash(ty, tx) * 8) - 4;
      for (var k = 0; k < 4; k++) { var w = 10 + k * 6; g.fillStyle = k % 2 ? C.tree2 : C.tree; g.fillRect(px + T / 2 - w / 2, py + k * 6, w, 7); }
      g.fillStyle = C.tree3; g.fillRect(px + T / 2 - 6, py + 13, 5, 2);
    }
  }
  var baseDrawWorld = window.drawWorld;
  window.drawWorld = function (cx, cy, vw, vh) {
    drawBeyond(cx, cy, vw, vh);
    var g = ctx, rows = api0() ? api0().tiles : null;
    if (!rows) { baseDrawWorld.apply(this, arguments); return; }
    var sec = BH.funSecrets && BH.funSecrets.secret && BH.funSecrets.secret();
    var walkers = [player].concat(typeof hunters !== "undefined" ? hunters : [], typeof npcs !== "undefined" ? npcs : [], S ? (S.elders || []).concat(S.npcs || []) : [],
      S && S.hound ? [S.hound] : [], sec && sec.level === L && sec.ent && sec.st === "with" ? [sec.ent] : [],
      BH.bank && BH.bank.machines ? BH.bank.machines().map(function (m) { return { x: (m.tx + 0.5) * T, y: (m.ty + 0.5) * T }; }) : []), shut = [];
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === "H") shut.push({ x: (x + 0.5) * T, y: (y + 0.5) * T }); });
    var things = (api0().coins || []).filter(function (c) { return !c.got || c.locked; }).concat(dens ? [dens] : [], shut);
    var x0 = Math.max(0, Math.floor((cx - vw / 2) / T) - 1), x1 = Math.min(rows[0].length - 1, Math.ceil((cx + vw / 2) / T) + 1);
    var y0 = Math.max(0, Math.floor((cy - vh / 2) / T)), y1 = Math.min(rows.length - 1, Math.ceil((cy + vh / 2) / T) + 3);
    var early = [], late = [];
    function near(a, tx, by) { return a && Math.abs(a.x - tx) < TW / 2 + T * 0.3 && a.y > by - TH + 8 && a.y - T * 1.6 < by - 4; }
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      if (rows[y][x] !== "#" || (S && S.bent && S.bent[x + "," + y])) continue;
      var tx = (x + 0.5) * T, by = (y + 1) * T, front = false, behind = false;
      walkers.forEach(function (a) { if (!near(a, tx, by)) return; if (a.y > by - 4) front = true; else behind = true; });
      if (things.some(function (a) { return near(a, tx, by); })) behind = true;
      (front && !behind ? early : late).push({ x: tx + Math.round((hash(y, x) - 0.5) * 8), by: by, r: hash(x, y), hide: behind });
    }
    var tw = BH.edge && BH.edge.spot ? BH.edge.spot() : null;
    if (tw) {
      var tf = false, tb = false;
      walkers.forEach(function (a) { if (!a || a === tw.self || a.x < tw.x0 - T * 0.3 || a.x > tw.x1 + T * 0.3 || a.y <= tw.top + 8 || a.y - T * 1.6 >= tw.fy - 4) return; if (a.y > tw.fy - 4) tf = true; else tb = true; });
      var back = late.filter(function (t) { return t.by <= tw.fy && t.x > tw.x0 - TW / 2 && t.x < tw.x1 + TW / 2; });
      if (tf && !tb && !back.some(function (t) { return t.hide; })) {
        late = late.filter(function (t) { return back.indexOf(t) < 0; });
        early = early.concat(back, [{ tower: 1, by: tw.fy }]);
      } else late.push({ tower: 1, by: tw.fy, hide: tb });
      var byY = function (p, q) { return p.by - q.by; };
      early.sort(byY); late.sort(byY);
    }
    var put = function (t, a) { if (t.tower) BH.edge.place(g, a); else treeAt(g, t.x, t.by, t.r, a); };
    var fc = window.featureCall;
    if (early.length && typeof fc === "function") window.featureCall = function (name) {
      if (name === "onDrawWorld") { window.featureCall = fc; early.forEach(function (t) { put(t, 1); }); }
      return fc.apply(this, arguments);
    };
    try { baseDrawWorld.apply(this, arguments); } finally { window.featureCall = fc; }
    late.forEach(function (t) { put(t, t.hide ? 0.35 : 1); });
    drawSigns();
    drawPay(g);
    if (S) { drawLit(g); drawSigns_(g); }
    drawBoardAsk(g);
    if (S && S.gets && S.gets.length) drawGets(g);
    if (S) drawBaskets(g);
    shut.filter(function (p) { var tx = Math.floor(p.x / T), ty = Math.floor(p.y / T); return (rows[ty + 1] || [])[tx] !== "H" && rows[ty][tx + 1] !== "H"; }).forEach(function (p) {
      g.font = "700 9px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "rgba(0,0,0,0.75)"; g.fillRect(p.x - 17, p.y + T / 2 + 2, 34, 12);
      g.fillStyle = C.gold; g.fillText("GATE", p.x, p.y + T / 2 + 8);
    });
    if (S) nameTags(g);
    if (S) strings.forEach(function (s) { if (s.late && !s.quiet && simTime - s.t0 >= 0.45 && linkSignUp(s)) drawLinkSign(s); });
    if (S && !endPainting) BH.talk.drawBubbles(g);
  };
  function nameTags(g) {
    if (!S.tagT) S.tagT = {};
    var st = S.cine && BH.talk._state(), at = st ? st.text.indexOf("I'm Shilo") : -1;
    S.elders.concat(S.npcs).forEach(function (e) {
      var elder = e.id === "oak" || e.id === "sly";
      if ((!elder && !NPC_TAG[e.id]) || e.topY == null) return;
      var name = e.id === "oak" ? "Shilo" : "Ayab";
      if (!elder) name = NPC_TAG[e.id];
      if (!elder) { if (S.cine) return; drawTag(g, e, name, 1, "#fffaf0"); return; }
      if (S.cine && S.tagT[e.id] == null) {
        if (!(at >= 0 && st.shown >= st.text.indexOf(name, at) + name.length)) return;
        S.tagT[e.id] = simTime;
        if (e.id === "sly" && !TR().named) { TR().named = true; persist(); }
      }
      if (!S.cine && !TR().named) return;
      drawTag(g, e, name, S.tagT[e.id] == null ? 1 : Math.min(1, (simTime - S.tagT[e.id]) / 0.6), e.id === "oak" ? "#e8c27a" : "#ffb065");
    });
    linkUnit = null;
  }
  var NPC_TAG = { pine: "Pine", merchant: "Merchant", stranger: "Stranger", auditor: "Auditor" };
  function drawTag(g, e, name, k, col) {
    {
      e.tagDY = Math.max(e.tagDY == null ? -1e9 : e.tagDY, e.topY - e.y);
      var x = Math.round(e.x + headOffset(e)), y = Math.round(e.y + e.tagDY) - (scared(e) ? 22 : 5) + Math.round((1 - k) * 4);
      g.save(); g.globalAlpha = k; g.font = "600 8px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
      var w = Math.ceil(g.measureText(name.toUpperCase()).width) + 8, u = linkUnit;
      if (typeof coins !== "undefined" && coins.some(function (c) { return !c.got && Math.abs(c.x - x) < w / 2 + 12 && c.y > y - 30 && c.y < y + 18; })) y = Math.round(e.y) + 20;
      if (u && x + w / 2 > u.x0 && x - w / 2 < u.x1 && y + 5 > u.y0 && y - 6 < u.y1) { g.restore(); return; }
      g.fillStyle = "rgba(0,0,0,0.78)"; g.fillRect(Math.round(x - w / 2), Math.round(y - 6), w, 11);
      g.fillStyle = col; g.fillText(name.toUpperCase(), x, Math.round(y));
      g.restore();
    }
  }
  var headDX = {};
  function headOffset(e) {
    var id = { oak: "char-010", sly: "char-052", pine: "char-058", stranger: "char-046", merchant: "char-078", auditor: "char-074", helper: "char-046", edge: "char-021" }[e.id], left = e.drawDir === "left";
    if (headDX[id] == null) {
      var fr = BH.characters && BH.characters.frames(id), cv = fr && fr.idle_right_0;
      if (!cv) return 0;
      var d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data, W = cv.width, top = -1, lo = W, hi = -1;
      for (var y = 0; y < cv.height && (top < 0 || y < top + 12); y++)
        for (var x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 128) { if (top < 0) top = y; lo = Math.min(lo, x); hi = Math.max(hi, x); }
      headDX[id] = hi < 0 ? 0 : ((lo + hi + 1) / 2 - 26) * (T * 1.45) / ((window.BitfootSprite && BitfootSprite.H) || 32);
    }
    return left ? -headDX[id] : headDX[id];
  }
  function api0() { return BH.trailFeature && BH.trailFeature.api; }
  function cineTrees(g) {
    var r0 = Math.floor(S.cineP0.y / T), o = 0;
    S.elders.concat([player]).forEach(function (a) { o = Math.max(o, 1 - Math.abs(a.x - T * 0.5) / (T * 2.2)); });
    o = o * o * (3 - 2 * o);
    if (o > 0.5 && !S.cine.rustled) { S.cine.rustled = true; puff(T * 0.5, (r0 + 0.5) * T, 10, "rgba(120,170,90,0.6)", 22); }
    if (o < 0.1) S.cine.rustled = false;
    S.bent = null;
    if (o <= 0.01) return;
    S.bent = {};
    [-1, 0, 1].forEach(function (d) {
      var y = r0 + d;
      if (tile(0, y) !== "#") return;
      S.bent["0," + y] = true;
      g.drawImage(bake, T, y * T, T, T, 0, y * T, T, T);
    });
    [-1, 0, 1].forEach(function (d) {
      var y = r0 + d;
      if (!S.bent["0," + y]) return;
      var side = d < 1 ? -1 : 1, dy = side * o * T * (d === 0 ? 0.95 : 0.45);
      g.save(); g.translate(T * 0.5, (y + 1) * T + dy); g.rotate(-side * o * 0.45);
      treeAt(g, 0, 0, hash(0, y), 1);
      g.restore();
    });
  }
  function barsOut(c) { S.barsOut = { t0: simTime, k: Math.min(1, (simTime - c.t0) / 0.5) }; }
  function endCine() {
    var c = S.cine; S.cine = null; S.bent = null; if (S.beam) S.beam.tEnd = simTime;
    if (c) barsOut(c);
    document.body.classList.remove("trail-cine");
    if (typeof levelStart === "number" && c) levelStart += simTime - c.t0;
    if (game.phase === "talk") game.phase = "play";
    if (S.zk > 1 && !S.zoomAt) S.zoomAt = simTime;
  }
  var toured = {};
  var VMIN = 0.8, TURN = 4;
  function mapHas(l, ch) { return (l.map || []).some(function (r) { return r.indexOf(ch) >= 0; }); }
  function npcIn(l, id) { return (l.npcs || []).some(function (d) { return d.id === id; }); }
  function landPost(l) { return (l.talks || []).some(function (z) { return z.id === "machine" && ((l.map[z.at[1]] || "")[z.at[0]] === "M"); }); }
  function tilesOf(ch) { var o = []; for (var y = 0; y < grid.length; y++) for (var x = 0; x < grid[y].length; x++) if (grid[y][x] === ch) o.push({ x: (x + 0.5) * T, y: (y + 0.5) * T }); return o; }
  function markOf(ch) { var m = (markers[ch] || [])[0]; return m ? { x: (m.tx + 0.5) * T, y: (m.ty + 0.5) * T } : tilesOf(ch)[0] || null; }
  function npcAt(id) { return S.npcs.filter(function (n) { return n.id === id; })[0] || null; }
  function huntOf(type) { return (typeof hunters !== "undefined" ? hunters : []).filter(function (h) { return (h.type || "hunter") === type; })[0] || null; }
  function huntDef(test) { var i = (L.hunters || []).findIndex(test); return i >= 0 && typeof hunters !== "undefined" && hunters[i] ? { h: hunters[i] } : null; }
  function landTalk() { var z = (L.talks || []).filter(function (q) { return q.id === "machine" && grid[q.at[1]][q.at[0]] === "M"; })[0]; return z ? px(z.at) : null; }
  var STOPS = [
    { key: "post", has: landPost, hold: true, says: "Pay the post. Gate opens.", spots: function () { return [postAndGate()]; } },
    { key: "exchange", first: true, has: function (l) { return l.tid === "bonus2"; }, says: "Exchanges only work in public.", spots: function () { var d = L.bonus && L.bonus.desk; return [d ? { x: (d[0] + 0.5) * T, y: (d[1] + 0.5) * T } : null]; } },
    { key: "merchantpost", has: function (l) { return l.tid === "bonus2"; }, who: "sly", says: "Pay the merchant if you want to get out.", spots: function () { var p = L.bonus && L.bonus.post; return [p ? { x: (p[0] + 0.5) * T, y: (p[1] + 0.5) * T } : null]; } },
    { key: "postoffice", first: true, has: function (l) { return l.tid === "bonus3"; }, says: "This post office isn't yours. It brings your mail, and you have to trust it.", spots: function () { var p = L.mail && L.mail.post; return [p ? { x: (p[0] + 0.5) * T, y: (p[1] + 0.5) * T } : null]; } },
    { key: "mytower", has: function (l) { return l.tid === "bonus3"; }, says: "Your own Zebra Node. Check your mail there to see what you really have.", spots: function () { var t = L.bonus && L.bonus.tower; return [t ? { x: (t[0] + 0.5) * T, y: (t[1] + 0.5) * T } : null]; } },
    { key: "hunter", has: function (l) { return (l.hunters || []).some(function (h) { return (h.type || "hunter") === "hunter"; }); }, says: "That's a hunter. He reads every footprint he finds.", spots: function () { var h = huntOf("hunter"); return [h ? { h: h } : null]; } },
    { key: "chase", has: function (l) { return (l.features || []).indexOf("funchase") >= 0 && (l.hunters || []).some(function (h) { return h.type === "dog"; }); }, says: "This dog follows footprints. If it runs after you, good luck.", spots: function () { var h = huntOf("dog"); return [h ? { h: h } : null]; } },
    { key: "sleeper", has: function (l) { return (l.hunters || []).some(function (h) { return h.sleep; }); }, hold: true, says: "This one's asleep. Walk softly, twigs snap.", spots: function () { return [huntDef(function (d) { return d.sleep; })]; } },
    { key: "river", has: function (l) { return mapHas(l, "~"); }, says: "In the water you're shielded in a secret Bitfoot dimension. Nobody can see you here.", spots: function () { return [tourFocusWater()]; } },
    { key: "watcher", has: function (l) { return mapHas(l, "V"); }, tag: "WATCHER", says: "This is the watcher. He alerts the hunters when someone enters or leaves the shielded waters.", spots: function () { return [markOf("V")]; } },
    { key: "pine", has: function (l) { return (l.npcs || []).some(function (d) { return d.id === "pine" && d.water; }); }, says: "That's our friend Pine. Pine is about to pay you, right here in the water.", spots: function () { var p = npcAt("pine"); return [p ? { x: p.x, y: p.y } : null]; } },
    { key: "rapids", has: function (l) { return /[⇒⇐⇑⇓]/.test((l.map || []).join("")); }, says: "Fast water. It carries you, and still leaves no footprints.", spots: function () { var r = ["⇒", "⇐", "⇑", "⇓"].reduce(function (a, c) { return a.concat(tilesOf(c)); }, []); return [r[Math.floor(r.length / 2)] || null]; } },
    { key: "riverpost", has: function (l) { return mapHas(l, "U") && l.tid !== "bonus2"; }, tag: "WATERS PAY POST", says: "The merchant takes payments right here in the water.", spots: function () { var u = tilesOf("U")[0]; return [u ? { x: u.x, y: u.y - T * 1.2, tagY: u.y + T * 0.6 } : null]; } },
    { key: "proofgate", has: function (l) { return mapHas(l, "Y"); }, label: "PROOF GATE", spots: function () { var y = tilesOf("Y"); return [y[Math.floor(y.length / 2)]]; } },
    { key: "dog", has: function (l) { return (l.hunters || []).some(function (h) { return h.type === "dog"; }); }, says: "This dog follows footprints. If it runs after you, good luck.", spots: function () { var h = huntOf("dog"); return [h ? { h: h } : null]; } },
    { key: "tags", has: function (l) { return !!l.tags; }, tag: "USED TAGS", says: "Every payment puts a tag on this board. It never says which coin was yours.", spots: function () { var b = L.tags && L.tags.board || [16, 1]; return [{ x: (b[0] + 1) * T, y: (b[1] + 0.7) * T }]; } },
    { key: "piles", has: function (l) { return !!l.piles; }, says: "Your two public addresses, A and B. Use one at a time, so hunters can't link them.",
      spots: function () { return Object.keys(L.piles || {}).sort().map(function (k, i) { var at = L.machines && L.machines[k], p = at ? { x: (at[0] + 0.5) * T, y: (at[1] + 0.5) * T } : pileMid(k); return { x: p.x, y: p.y, quiet: i > 0 }; }); } },
    { key: "rescue", has: function (l) { return !!l.funrescue || mapHas(l, "⌘"); }, says: "Our friend is stuck on land! Lead them into the waters.", spots: function () { var r = BH.funSecrets && BH.funSecrets.rescue(), e = r && r.level === L && r.elders[0]; return [e ? { x: e.x, y: e.y } : null]; } },
    { key: "auditor", has: function (l) { return npcIn(l, "auditor"); }, says: "She wants to see your payments.", spots: function () { var a = npcAt("auditor"); return [a ? { x: a.x, y: a.y } : null]; } },
    { key: "helper", has: function (l) { return npcIn(l, "helper") && l.tid !== "doors"; }, says: "Never seen him before.", spots: function () { var h = npcAt("helper"); return [h ? { h: h } : null]; } },
    { key: "zeccheck", has: function (l) { return l.tid === "glasskey"; }, says: "A free ZEC check. Think before you hand it anything.", spots: function () { return [BH.scamkey && BH.scamkey.at ? BH.scamkey.at() : null]; } },
    { key: "u1", has: function (l) { return l.tid === "doors"; }, says: "Your U1 address. Coins sent through it travel shielded.", spots: function () { return [BH.u1 && BH.u1.at() || (dens ? { x: dens.x, y: dens.y } : null)]; } },
    { key: "proof", has: function (l) { return l.tid === "dam"; }, tag: "PROOF CHECK", says: "You're currently in an old pool that's being sealed. You can leave it, but you cannot go back in.", spots: function () { var gs = tilesOf("ð"), g = gs[Math.floor(gs.length / 2)]; return [g || null]; } },
    { key: "trickster", has: function (l) { return l.tid === "dam"; }, says: "Mmm, I've heard tricksters try to cheat the system.", spots: function () { return [BH.proof && BH.proof.trickAt ? BH.proof.trickAt() : null]; } },
    { key: "edge", has: function (l) { return npcIn(l, "edge"); }, says: "That's the hunter's control tower. It sees movement in the waters, never who or how much.", spots: function () { var e = npcAt("edge"); return [e ? { x: e.x, y: e.y } : null]; } }
  ];
  function pileMid(k) { var r = L.piles[k]; return { x: ((r[0] + r[2]) / 2 + 0.5) * T, y: ((r[1] + r[3]) / 2 + 0.5) * T }; }
  function tourFocusWater() {
    var best = null, bs = -1e9;
    for (var y = 0; y < grid.length; y++) for (var x = 0; x < grid[y].length; x++) {
      if (grid[y][x] !== "~") continue;
      var deep = 0;
      for (var r = 1; r < 6 && deep === r - 1; r++) {
        var all = true;
        for (var oy = -r; oy <= r && all; oy++) for (var ox = -r; ox <= r && all; ox++) { var c = (grid[y + oy] || "")[x + ox]; if (c !== "~" && c !== "d" && c !== "#") all = false; }
        if (all) deep = r;
      }
      var s = deep * 1000 - Math.hypot((x + 0.5) * T - player.x, (y + 0.5) * T - player.y) / T;
      if (s > bs) { bs = s; best = { x: (x + 0.5) * T, y: (y + 0.5) * T }; }
    }
    return best;
  }
  function postAndGate() {
    var p = landTalk(); if (!p) return null;
    var g = tilesOf("H").filter(function (h) { return Math.abs(h.x - p.x) < T * 3 && Math.abs(h.y - p.y) < T * 3; });
    if (!g.length) return p;
    var gx = g.reduce(function (a, h) { return a + h.x; }, 0) / g.length, gy = g.reduce(function (a, h) { return a + h.y; }, 0) / g.length;
    return { x: (p.x + gx) / 2, y: (p.y + gy) / 2 };
  }
  var FOCUS = {
    stayin: { at: function () { return landTalk(); }, says: [["oak", "That's the merchant's stall, on land. To pay him there, you have to climb out."]] }
  };
  BH.trailTour = { plan: tourPlan, stops: STOPS.map(function (s) { return s.key; }) };
  window.camFocus = function () {
    if (!S) return null;
    if (S.tour) return S.tour.at;
    if (S.cine && S.cineP0 && zoom) { var vw = W / zoom, p = S.cineP0; return { x: Math.max(vw / 2, Math.min(cols * T - vw / 2, p.x)), y: p.y + T * 0.2 + liftY(zoom) }; }
    if (S.strike && strikeLive()) { var sv = strikeView(), se = ease01((simTime - S.strike.t0) / 0.6); S.strike.z = sv.z; return { x: S.strike.c0.x + (sv.x - S.strike.c0.x) * se, y: S.strike.c0.y + (sv.y - S.strike.c0.y) * se }; }
    if (S.tourPending && S.tourAt) { zoom = tourBase() * S.tourWide.z; S.tourZoomed = true; return S.tourAt; }
    return null;
  };
  var baseClamp = window.clampCam;
  function edgeClamp(c) { return c; }
  window.clampCam = function (c, view, world) { return S ? edgeClamp(c, view, world) : baseClamp(c, view, world); };
  var baseRender = window.render;
  window.render = function () {
    if (S && S.tour) {
      walkHunters();
      stepTour();
      if (S.tour) { zoom = tourBase() * S.tour.z; S.tourZoomed = true; cam.x = S.tour.at.x; cam.y = S.tour.at.y; }
    }
    if (!S || !S.tour) return baseRender.apply(this, arguments);
    var bg = C.bg; C.bg = C.tree;
    try { return baseRender.apply(this, arguments); } finally { C.bg = bg; }
  };
  function tourFocus(api) {
    var z = (L.talks || [])[0];
    if (z) return px(z.at);
    if (S.hound) return { x: S.hound.x, y: S.hound.y };
    var best = null, bd = 1e9;
    for (var y = 0; y < api.tiles.length; y++) for (var x = 0; x < api.tiles[y].length; x++) {
      if (!isWater(api.tiles[y][x])) continue;
      var d = Math.hypot((x + 0.5) * T - player.x, (y + 0.5) * T - player.y); if (d < bd) { bd = d; best = { x: (x + 0.5) * T, y: (y + 0.5) * T }; }
    }
    return best || (dens ? { x: dens.x, y: dens.y } : null);
  }
  function tnow() { return performance.now() / 1000; }
  function walkHunters() {
    if (typeof hunters === "undefined" || typeof stepHunter !== "function") return;
    var now = tnow(), t = S.tour;
    t.acc = Math.min(0.1, (t.acc || 0) + now - (t.last || now)); t.last = now;
    var px = player.x, py = player.y;
    player.x = -1e5; player.y = -1e5;
    try { while (t.acc >= 1 / 60) { t.acc -= 1 / 60; hunters.forEach(function (h) { if (t.frozen.indexOf(h) < 0) stepHunter(h, 1 / 60); }); } }
    finally { player.x = px; player.y = py; }
  }
  function bushNear(h, r) {
    if (typeof grid === "undefined") return null;
    var best = null, bd = r * T;
    for (var y = 0; y < grid.length; y++) for (var x = 0; x < grid[y].length; x++) {
      if (grid[y][x] !== "b") continue;
      var d = Math.hypot((x + 0.5) * T - h.x, (y + 0.5) * T - h.y); if (d < bd) { bd = d; best = { x: (x + 0.5) * T, y: (y + 0.5) * T }; }
    }
    return best;
  }
  function tourBase() { return typeof baseZoom === "function" ? baseZoom() : W < 700 ? W / (T * 13) : Math.min(W / (T * 24), H / (T * 14)); }
  function tourWide(api) {
    var rows = api.tiles.length, cols = api.tiles[0].length;
    return { at: { x: cols * T / 2, y: rows * T / 2 }, z: Math.min(1, Math.min(W / (cols * T), H * 0.72 / (rows * T)) / tourBase()) };
  }
  var RIDE_Z = 1.05;
  function clampAt(p, z) { var k = tourBase() * z; return { x: edgeClamp(p.x, W / k, cols * T), y: edgeClamp(p.y, H / k, rows * T) }; }
  function rideStart(api) {
    var f = tourFocus(api), p = dens && f && Math.hypot(dens.x - f.x, dens.y - f.y) >= T * 3 ? { x: dens.x, y: dens.y } : f || tourWide(api).at;
    return { at: clampAt(p, RIDE_Z), z: RIDE_Z };
  }
  function tourPlan(i) {
    var out = [], lv = LEVELS[i]; if (!lv || i === 0) return out;
    STOPS.forEach(function (s) { if (s.has(lv) && firstLevel(s.has) === i) out.push(s.key); });
    if (out.indexOf("chase") >= 0) out = out.filter(function (k) { return k !== "dog"; });
    var lead = out.filter(function (k) { return STOPS.some(function (s) { return s.key === k && s.first; }); });
    out = lead.concat(out.filter(function (k) { return lead.indexOf(k) < 0; }));
    if (FOCUS[lv.tid]) out.push("focus");
    return out;
  }
  function firstLevel(has) { for (var i = 0; i < LEVELS.length; i++) if (has(LEVELS[i])) return i; return -1; }
  function startTour(api) {
    var plan = tourPlan(game.levelIdx);
    introSeen[L.tid] = true; S.introDone = true;
    if (!plan.length) return;
    var home = { x: player.x, y: player.y }, marks = [], firstBush = firstLevel(function (l) { return (l.map || []).some(function (r) { return r.indexOf("b") >= 0; }); });
    plan.forEach(function (key) {
      if (key === "focus") { var fz = FOCUS[L.tid]; marks.push({ get: fixed(fz.at()), says: fz.says }); return; }
      var s = STOPS.filter(function (q) { return q.key === key; })[0], spots = s.spots();
      spots.forEach(function (sp) {
        if (!sp) return;
        var m = { key: key, get: sp.h ? follow(sp.h) : fixed(sp), says: s.says && !sp.quiet ? [[s.who || "oak", s.says]] : null, label: s.says && !sp.quiet ? null : sp.label || s.label || "", quiet: !!sp.quiet, h: sp.h || null, follow: !!sp.h, act: s.act || null, hold: !!s.hold, tag: s.tag || null, tagY: sp.tagY, first: !!s.first, fit: s.fit || 0 };
        var bush = key === "hunter" && game.levelIdx === firstBush && sp.h && bushNear(sp.h, 6);
        if (bush) { marks.push(m); marks.push({ key: "bush", get: demoSpot(sp.h, bush), wide: true, says: [["oak", "The bush hides them. Their footprints don't."]], demo: bush, h: sp.h }); return; }
        marks.push(m);
      });
    });
    var from = rideStart(api).at, sorted = [], pool = marks.slice();
    if (pool.some(function (q) { return q.key === "bush"; })) ["sleeper", "hunter", "bush"].forEach(function (k) { var j = pool.findIndex(function (q) { return q.key === k; }); if (j >= 0) { sorted.push(pool.splice(j, 1)[0]); from = sorted[sorted.length - 1].get(); } });
    pool.filter(function (q) { return q.first; }).forEach(function (q) { sorted.push(pool.splice(pool.indexOf(q), 1)[0]); from = q.get(); });
    while (pool.length) {
      pool.sort(function (a, b) { var p = a.get(), q = b.get(); return Math.hypot(p.x - from.x, p.y - from.y) - Math.hypot(q.x - from.x, q.y - from.y); });
      var nx = pool.shift();
      if (nx.key === "bush") { var hi = pool.findIndex(function (q) { return q.key === "hunter"; }); if (hi >= 0) { pool.unshift(nx); nx = pool.splice(hi + 1, 1)[0]; } }
      if (nx.key === "hunter") { var bi = pool.findIndex(function (q) { return q.key === "bush"; }); if (bi >= 0) { sorted.push(nx); nx = pool.splice(bi, 1)[0]; } }
      sorted.push(nx); from = nx.get();
    }
    sorted.filter(function (q) { return q.quiet; }).forEach(function (q) { sorted.splice(sorted.indexOf(q), 1); sorted.splice(sorted.findIndex(function (p) { return p.key === q.key && !p.quiet; }) + 1, 0, q); });
    marks = sorted;
    function fixed(p) { return function () { return p; }; }
    function follow(h) { return function () { return { x: h.x, y: h.y }; }; }
    function demoSpot(h, bush) { return function () { return S.demo ? S.demo.view : demoView(bush, h); }; }
    marks.push({ get: function () { return home; }, home: true });
    var now = tnow(), a0 = rideStart(api).at, far = marks.filter(function (q) { var p = q.get(); return Math.hypot(p.x - a0.x, p.y - a0.y) > T * 1.5; })[0] || marks[0], p0 = far.get(), l0 = Math.hypot(p0.x - a0.x, p0.y - a0.y) || 1, v0 = T * 1.2;
    S.tour = { t0: simTime, at: a0, z: RIDE_Z, frozen: marks.filter(function (q) { return q.h; }).map(function (q) { return q.h; }),
      ride: { marks: marks, i: 0, vx: (p0.x - a0.x) / l0 * v0, vy: (p0.y - a0.y) / l0 * v0, t0: now, last: now, v: T * 3.5 } };
    game.phase = "talk"; document.body.classList.add("trail-cine"); sfx("whoosh");
    if (dens) [300, 700].forEach(function (ms) { setTimeout(function () { if (S.tour) ring(dens.x, dens.y, "rgba(234,186,73,0.9)", T * 2.2, 0.9); }, ms); });
  }
  var boxTop = 0;
  function liftY(k) {
    var el = document.querySelector(".talkbox.on"), r = el && el.getBoundingClientRect();
    if (r && r.height > 0) boxTop = r.top;
    var bar = Math.round(H * 0.135), bot = boxTop > H * 0.4 ? boxTop : H * 0.72;
    return (H / 2 - (bar + bot) / 2) / k;
  }
  function deadZone(r, p, k) {
    var a = r.anchor || (r.anchor = { x: p.x, y: p.y }), zx = W / k * 0.14, zy = H / k * 0.08;
    if (p.x > a.x + zx) a.x = p.x - zx; else if (p.x < a.x - zx) a.x = p.x + zx;
    if (p.y > a.y + zy) a.y = p.y - zy; else if (p.y < a.y - zy) a.y = p.y + zy;
    return { x: a.x, y: a.y };
  }
  function stepTour() {
    if (game.phase === "play") game.phase = "talk";
    var c = S.tour, r = c.ride, now = tnow(), dt = Math.min(0.05, now - r.last), age = now - r.t0; r.last = now;
    var m = r.marks[r.i]; if (!m) { endTour(); return; }
    var tg = m.get();
    if (!r.talking && !r.lab) r.anchor = null;
    var dx = tg.x - c.at.x, dy = tg.y - c.at.y, d = Math.hypot(dx, dy);
    if (m.home) c.z = RIDE_Z + (1 - RIDE_Z) * (1 - Math.min(1, d / (T * 8)));
    else if (m.fit || c.fitted) {
      var band = (boxTop > H * 0.4 ? boxTop : H * 0.72) - H * 0.135, zf = m.fit ? Math.min(RIDE_Z, band / (m.fit * T) / tourBase()) : RIDE_Z;
      c.z += (zf - c.z) * Math.min(1, dt * 2.5); c.fitted = !!m.fit || Math.abs(c.z - RIDE_Z) > 0.002;
    }
    var k0 = tourBase() * c.z;
    if ((r.talking || r.lab) && m.follow) tg = deadZone(r, tg, k0);
    tg = clampAt(m.home ? tg : { x: tg.x, y: tg.y + liftY(k0) }, c.z);
    dx = tg.x - c.at.x; dy = tg.y - c.at.y; d = Math.hypot(dx, dy);
    if (r.ptg && r.pi === r.i && dt > 0 && Math.hypot(tg.x - r.ptg.x, tg.y - r.ptg.y) < T * 0.3) { var kt = Math.min(1, dt * 8); r.tvx += ((tg.x - r.ptg.x) / dt - r.tvx) * kt; r.tvy += ((tg.y - r.ptg.y) / dt - r.tvy) * kt; } else { r.tvx = 0; r.tvy = 0; }
    r.ptg = tg; r.pi = r.i;
    var seen = m.h && Math.abs(m.h.x - c.at.x) < W / k0 / 2 + T * 1.5 && Math.abs(m.h.y - c.at.y) < H / k0 / 2 + T * 1.5;
    if (seen && c.frozen.indexOf(m.h) >= 0 && !(S.demo && S.demo.h === m.h)) c.frozen.splice(c.frozen.indexOf(m.h), 1);
    var SW = 2, ax = SW * SW * dx - 2 * SW * (r.vx - r.tvx), ay = SW * SW * dy - 2 * SW * (r.vy - r.tvy), al = Math.hypot(ax, ay), AM = T * 5;
    if (al > AM) { ax *= AM / al; ay *= AM / al; }
    r.vx += ax * dt; r.vy += ay * dt;
    var vl = Math.hypot(r.vx, r.vy), VM = r.v + Math.hypot(r.tvx, r.tvy);
    if (vl > VM) { var sv = Math.max(VM, vl - AM * dt) / vl; r.vx *= sv; r.vy *= sv; vl = Math.hypot(r.vx, r.vy); }
    var FL = VMIN * T;
    if (!m.home && !r.talking && !r.lab && d >= T * 1.5 && vl < FL) {
      var hd = vl < FL * 0.2 ? Math.atan2(dy, dx) : Math.atan2(r.vy, r.vx);
      if (vl >= FL * 0.2 && d > T * 0.02) { var da = Math.atan2(dy, dx) - hd; da = Math.atan2(Math.sin(da), Math.cos(da)); hd += Math.max(-TURN * dt, Math.min(TURN * dt, da)); }
      r.vx = Math.cos(hd) * FL; r.vy = Math.sin(hd) * FL;
    }
    if ((r.talking || r.lab) && !m.follow) { r.vx = 0; r.vy = 0; }
    else {
      var nx = clampAt({ x: c.at.x + r.vx * dt, y: c.at.y + r.vy * dt }, c.z);
      if (!m.home && !r.talking && !r.lab && d >= T * 1.5 && dt > 0 && Math.hypot(nx.x - c.at.x, nx.y - c.at.y) < FL * dt * 0.95) {
        r.vx = dx / d * FL; r.vy = dy / d * FL; nx = clampAt({ x: c.at.x + r.vx * dt, y: c.at.y + r.vy * dt }, c.z);
      }
      c.at = nx;
    }
    if (r.lab) { if (now - r.lab > (m.quiet ? 0.5 : 1.8)) { r.lab = 0; r.anchor = null; r.near = 0; r.i++; } return; }
    var rel = Math.hypot(r.vx - r.tvx, r.vy - r.tvy);
    if (!m.home && !r.talking && d < T * 1.2) r.near = r.near || now; else if (!r.talking) r.near = 0;
    if (!m.home && !r.talking && ((d < T * 0.2 && rel < T * 0.5) || (m.quiet && d < T * 0.6) || (m.follow && d < T * 1.2) || (r.near && now - r.near > 1.5))) {
      r.near = 0;
      if (m.act) m.act();
      if (m.label || !m.says) { var lp = m.get(); S.tourLabels = (S.tourLabels || []).concat([{ text: m.label || "", x: lp.x, y: lp.y, t0: tnow() }]); r.lab = now; return; }
      r.talking = true; var hp = m.get();
      if (m.tag) S.tourLabels = (S.tourLabels || []).concat([{ text: m.tag, x: hp.x, y: m.tagY != null ? m.tagY : hp.y, t0: tnow() }]); r.dwell = { t0: now, x: hp.x, y: hp.y, hx: hp.x, hy: hp.y };
      var gone = false, go = function () { if (gone || !S.tour) return; gone = true; r.talking = false; r.dwell = null; r.shut = tnow(); r.i++; sfx("whoosh"); };
      open(m.says, go);
      if (m.demo) startDemo(m.demo, m.h);
    }
    if (m.home && d < T * 0.12 && Math.hypot(r.vx, r.vy) < T * 0.4) endTour();
  }
  function demoPlan(bush, h) {
    var bx = Math.floor(bush.x / T), by = Math.floor(bush.y / T), at = function (x, y) { return isBushAt((x + 0.5) * T, (y + 0.5) * T); };
    var x0 = bx, x1 = bx, y0 = by, y1 = by;
    while (at(x0 - 1, by)) x0--; while (at(x1 + 1, by)) x1++;
    while (at(bx, y0 - 1)) y0--; while (at(bx, y1 + 1)) y1++;
    var c = function (x, y) { return { x: (x + 0.5) * T, y: (y + 0.5) * T }; };
    var pat = h && h.patrol ? h.patrol : [[bx, y0 - 2], [bx, y1 + 5]], hc = pat[0][0];
    var yTop = Math.min(pat[0][1], pat[1][1]), yBot = Math.max(pat[0][1], pat[1][1]);
    var line = pat.length === 2 && pat[1][0] === hc;
    var free = function (x, y) { var t = (grid[y] || [])[x]; return t != null && t !== "b" && !solidH(t); };
    var dir = hc - x0 >= x1 - hc ? -1 : 1, deep = hc + dir, nx = dir < 0 ? x0 - 1 : x1 + 1, fx = dir < 0 ? x1 + 2 : x0 - 2;
    var lead = c(fx, y1), tail = c(fx - dir, y1);
    var span = function (a, b, f) { for (var k = Math.min(a, b); k <= Math.max(a, b); k++) if (!f(k)) return false; return true; };
    var rows = [y1 + 1, y0 - 1, y1 + 2, y0 - 2, y1 + 3].filter(function (r) {
      return free(fx - dir, y1) && span(y1, r, function (y) { return free(fx, y); }) && span(fx, nx, function (x) { return free(x, r); })
        && span(r, r > y1 ? y1 + 1 : y0 - 1, function (y) { return free(nx, y); });
    });
    var routes = rows.map(function (r) {
      var er = r > y1 ? y1 : y0, pts = [lead, c(fx, r), c(nx, r), c(nx, er), c(deep, er)], len = lenOf(pts);
      return { pts: [pts, [tail].concat(pts)], stop: [len, len] };
    });
    return {
      hc: hc, top: c(hc, yTop), bot: c(hc, yBot), line: line, routes: routes,
      wait: [lead, tail],
      view: c((x0 + x1) / 2, (Math.min(y0, yTop) + Math.max.apply(null, rows.concat([y1]))) / 2)
    };
  }
  function demoHunterAt(p, h, t) {
    var L = p.bot.y - p.top.y, sp = T * H_PATROL * (h.sp || 1) * alarmSpeed(), w = h.patrol[h.wp], down = (w[1] + 0.5) * T > h.y;
    var s = ((down ? h.y - p.top.y : L + p.bot.y - h.y) + sp * t) % (2 * L);
    return s < L ? { y: p.top.y + s, dir: Math.PI / 2 } : { y: p.bot.y - (s - L), dir: -Math.PI / 2 };
  }
  function demoSafe(p, h, rt) {
    if (!h || !p.line) return true;
    var V = T * 4, end = Math.max(rt.stop[0], rt.stop[1]) / V;
    for (var t = 0; t <= end + 0.3; t += 0.05) {
      var hp = demoHunterAt(p, h, t);
      for (var i = 0; i < 2; i++) {
        var q = along(rt.pts[i], Math.min(t * V, rt.stop[i]));
        if (isBushAt(q.x, q.y)) continue;
        var dx = q.x - h.x, dy = q.y - hp.y, dd = Math.hypot(dx, dy), da = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - hp.dir), Math.cos(Math.atan2(dy, dx) - hp.dir)));
        if (dd < T * 1.5 || (dd < VISION * T && da < CONE)) return false;
      }
    }
    return true;
  }
  function demoView(bush, h) { return demoPlan(bush, h).view; }
  function along(pts, s) {
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y);
      if (s <= l || i === pts.length - 1) { var k = l ? Math.max(0, Math.min(1, s / l)) : 1; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, a: Math.atan2(b.y - a.y, b.x - a.x), end: s >= l && i === pts.length - 1 }; }
      s -= l;
    }
    return { x: pts[0].x, y: pts[0].y, a: 0, end: true };
  }
  function lenOf(pts) { var n = 0; for (var i = 1; i < pts.length; i++) n += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return n; }
  function startDemo(bush, h) {
    var p = demoPlan(bush, h);
    S.demo = { t0: tnow(), last: tnow(), h: h, bush: bush, plan: p, view: p.view, n0: prints.length, acq: typeof stats !== "undefined" ? [stats.acq, stats.trans] : null,
      phase: "wait", pt: tnow(), events: [], route: null,
      walkers: [0, 1].map(function (i) { return { at: p.wait[i], side: 1, last: null }; }) };
    if (h && S.tour && S.tour.frozen.indexOf(h) < 0) S.tour.frozen.push(h);
    if (h) { h.state = "patrol"; h.sus = 0; h.ignoreBefore = prints.length; h.path = []; h.pathKey = ""; }
  }
  function endDemo(d) {
    if (prints.length > d.n0) prints.length = d.n0;
    if (d.acq) { stats.acq = d.acq[0]; stats.trans = d.acq[1]; }
    var h = d.h;
    if (h) { h.state = "return"; h.sus = 0; h.pursuit = null; h.seen = null; h.caughtHow = null; h.followIdx = 0; h.ignoreBefore = 0; h.path = []; h.pathKey = ""; }
  }
  function demoPrint(x, y, a, w) {
    w.side = -w.side;
    var p = { x: x + Math.cos(a + 1.5708) * 5 * w.side, y: y + Math.sin(a + 1.5708) * 5 * w.side, a: a, t: simTime, seg: player.seg, i: prints.length, big: false };
    prints.push(p); puff(p.x, p.y, 3, "rgba(234,186,73,0.55)", 14);
  }
  function drawDemo(g) {
    var d = S.demo, now = tnow(), dt = Math.min(0.1, Math.max(0, now - d.last)), V = T * 4, h = d.h, p = d.plan;
    d.last = now;
    var pt = now - d.pt, go = function (ph) { d.phase = ph; d.pt = now; d.events.push([ph, +(now - d.t0).toFixed(2)]); pt = 0; };
    var m = h ? (h.sp || 1) * alarmSpeed() : 1;
    if (!d.spawned) { d.spawned = true; d.walkers.forEach(function (w) { puff(w.at.x, w.at.y, 10, "rgba(255,250,240,0.5)", 24); }); }
    var walk = function (i) { var w = d.walkers[i], s = Math.min((now - d.hideAt) * V, d.route.stop[i]), q = along(d.route.pts[i], s), end = s >= d.route.stop[i];
      w.moving = s > 0 && !end; w.a = q.a; w.at = { x: q.x, y: q.y };
      if (!i && (w.moving || (end && !w.lastSet)) && (!w.last || Math.hypot(q.x - w.last.x, q.y - w.last.y) > T * 0.3)) { w.last = { x: q.x, y: q.y }; demoPrint(q.x, q.y, q.a, w); }
      if (end) w.lastSet = true;
      return end; };
    if (d.phase === "wait") {
      d.walkers.forEach(function (w) { w.moving = false; });
      if (pt > 0.6) {
        d.route = p.routes.filter(function (rt) { return demoSafe(p, h, rt); })[0] || (!h && p.routes[0]) || null;
        if (d.route) { d.hideAt = now; go("hide"); }
      }
    } else if (!d.hid && !d.seenAt) {
      var e0 = walk(0), e1 = walk(1);
      if (e0 && e1) { d.hid = true; d.events.push(["hidden", +(now - d.t0).toFixed(2)]); }
    }
    if (h && !d.seenAt) {
      if (h.state === "follow") {
        var fp = prints[h.followIdx], hit = d.hid && isBushAt(h.x, h.y) ? d.walkers.filter(function (w) { return isBushAt(w.at.x, w.at.y) && Math.hypot(w.at.x - h.x, w.at.y - h.y) < T * 0.6; })[0] : null;
        if (hit || (fp && !prints[h.followIdx + 1] && d.hid && isBushAt(h.x, h.y) && Math.hypot(fp.x - h.x, fp.y - h.y) < 6)) { d.hitW = hit || d.walkers[0]; go("caught"); }
        else { followTrail(h, dt, m); if (d.phase === "follow" && isBushAt(h.x, h.y)) go("inside"); }
      } else {
        var w = h.patrol[h.wp];
        if (walkTo(h, (w[0] + 0.5) * T, (w[1] + 0.5) * T, H_PATROL * m, dt)) h.wp = (h.wp + 1) % h.patrol.length;
        var np = d.route && sniff(h, 0.6);
        if (np) { h.state = "follow"; h.followIdx = np.i; sfx("suspicion", { level: 0.5 }); go("follow"); }
      }
    }
    if (d.phase === "caught" && !d.seenAt) {
      d.seenAt = (now - d.t0) || 0.01;
      if (h) { h.state = "chase"; h.sus = 1; var hw = d.hitW || d.walkers[0]; h.dir = Math.atan2(hw.at.y - h.y, hw.at.x - h.x); }
      sfx("spotted"); if (typeof addTrauma === "function") addTrauma(0.45); if (typeof hitstop === "function") hitstop(0.06);
    }
    d.walkers.forEach(function (w, i) {
      var a = d.seenAt ? 1 : isBushAt(w.at.x, w.at.y) ? 0.18 : 1, wa = w.a || 0;
      var face = d.seenAt && h ? (h.x > w.at.x ? "right" : "left") : !w.moving ? "right" : Math.abs(Math.cos(wa)) > 0.5 ? (Math.cos(wa) > 0 ? "right" : "left") : Math.sin(wa) > 0 ? "down" : "up";
      drawBitfoot(w.at.x, w.at.y + 10, face, w.moving ? "walk" : "idle", now - d.t0, a, { char: i ? "char-021" : "char-033" });
    });
  }
  var demoBaseDraw = window.drawWorld;
  if (typeof demoBaseDraw === "function") window.drawWorld = function () {
    try { return demoBaseDraw.apply(this, arguments); }
    finally { var d = S && S.demo; if (d && d.seenAt && d.h && typeof stateMark === "function" && typeof liveFrame !== "undefined" && liveFrame) stateMark(d.h, Math.round(d.h.x), Math.round(d.h.y) - 20); }
  };
  function isBushAt(x, y) { return typeof grid !== "undefined" && (grid[Math.floor(y / T)] || [])[Math.floor(x / T)] === "b"; }
  function endTour() {
    var c = S && S.tour; if (!c) return;
    if (S.demo) endDemo(S.demo);
    S.tour = null; S.demo = null;
    barsOut(c);
    if (BH.talk.isOpen()) BH.talk.reset();
    document.body.classList.remove("trail-cine");
    if (typeof levelStart === "number") levelStart += simTime - c.t0;
    if (c.z && Math.abs(c.z - 1) > 0.01) { S.zk = S.zk0 = c.z; S.zoomAt = simTime; }
    if (game.phase === "talk") game.phase = "play";
  }
  addEventListener("keydown", function (e) {
    if (!S || !S.tour || BH.talk.isOpen() || e.repeat || tnow() - (S.tour.ride.shut || 0) < 0.6) return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); nextStop(); }
  });
  function nextStop() {
    var c = S.tour, r = c.ride, m = r.marks[r.i];
    if (!m || m.home) { endTour(); return; }
    if (r.lab) { r.lab = 0; r.anchor = null; r.near = 0; r.i++; return; }
    var tg = m.get(), k0 = tourBase() * c.z;
    c.at = clampAt({ x: tg.x, y: tg.y + liftY(k0) }, c.z);
    r.vx = 0; r.vy = 0; r.tvx = 0; r.tvy = 0; r.ptg = null; r.near = tnow() - 2;
  }
  function scared(e) {
    if (typeof hunters === "undefined") return false;
    return hunters.some(function (h) { return Math.hypot(h.x - e.x, h.y - e.y) < T * 6; });
  }

  function calm() { return !BH.talk.isOpen() && simTime - (S.lastTalk || -9) > 3; }
  var CLIMB_LINE = 1.5, CLIMB_READ = 0.4, bubbleUntil = 0;
  function climbBusy() {
    var c = S && S.climb; if (!c) return false;
    return c.pending || simTime < c.lineAt + CLIMB_READ;
  }
  function askHeld(p) { return !!(p && L.tid === "stayin" && !p.water && (player.inShield || climbBusy())); }
  function climbTick() {
    var c = S.climb; if (!c || !c.pending || simTime < c.at) return;
    c.pending = false; c.lineAt = simTime;
    var n0 = strings.length;
    baseLinkNow(c.e, c.p, "amount", c.seg);
    for (var i = n0; i < strings.length; i++) { strings[i].late = true; strings[i].quiet = true; strings[i].amount = null; }
  }
  var baseLinkNow = window.linkNow;
  if (typeof baseLinkNow === "function") window.linkNow = function (e, p, why, seg) {
    if (S && L && L.tid === "stayin" && why === "amount" && !(S.climb && S.climb.pending)) {
      S.climb = { pending: true, at: simTime + CLIMB_LINE, e: e, p: p, seg: seg != null ? seg : player.seg - 1, lineAt: 0 };
      return;
    }
    return baseLinkNow.apply(this, arguments);
  };
  var baseBubble = BH.talk.bubble;
  BH.talk.bubble = function (ent, text, secs) { bubbleUntil = Math.max(bubbleUntil, simTime + (secs || 3)); return baseBubble.apply(this, arguments); };
  var FOLK = { oak: "char-010", sly: "char-052", pine: "char-058", stranger: "char-046", merchant: "char-078", auditor: "char-074", helper: "char-046", edge: "char-021" };
  function drawFolk(g, e, now) {
    var feet = e.y + 10;
    if (!(e.water || onWater(e.x, e.y))) { g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(e.x, feet, 10, 3.5, 0, 0, 6.283); g.fill(); }
    var dir = e.dir; if (Math.abs(player.x - e.x) < T * 4 && e.anim === "idle") dir = player.x > e.x ? "right" : "left";
    var fear = (e.id === "oak" || e.id === "sly") && scared(e), jx = 0, jy = 0;
    if (S.fright && now - S.fright < 0.5) jy = -Math.sin((now - S.fright) / 0.5 * Math.PI) * 8;
    e.drawDir = dir;
    e.topY = drawBitfoot(e.x + jx, feet + jy, dir, e.anim, simTime - e.t0, e.water || onWater(e.x, e.y) ? 0.85 : 1, { char: FOLK[e.id] });
    if (fear && e.topY != null && !(BH.talk.isOpen() && S.fright && now - S.fright < 1)) {
      var my = e.topY - 6 + Math.sin(now * 8) * 1;
      g.fillStyle = "#000"; g.fillRect(e.x - 3, my - 9, 6, 12); g.fillStyle = C.ink; g.fillRect(e.x - 1.5, my - 7, 3, 6); g.fillRect(e.x - 1.5, my, 3, 2.5);
    }
  }
  var folkWrapped = false;
  function wrapPlayer() {
    if (folkWrapped || typeof window.drawPlayer !== "function") return;
    folkWrapped = true;
    var base = window.drawPlayer;
    window.drawPlayer = function () {
      var r = base.apply(this, arguments);
      if (S && S.front && S.front.length) { var f = S.front; S.front = []; f.forEach(function (e) { drawFolk(ctx, e, simTime); }); }
      return r;
    };
  }
  function elderPos(i) {
    var h = S.hist, wet = player.inShield, want = (i + 1) * (wet ? 0.95 : 1.8) * T, k = h.length - 1;
    if (k < 0) return null;
    var acc = Math.hypot(player.x - h[k].x, player.y - h[k].y), dry = false;
    for (; k > 0 && acc < want; k--) {
      if (wet && !onWater(h[k].x, h[k].y)) { dry = true; break; }
      acc += Math.hypot(h[k].x - h[k - 1].x, h[k].y - h[k - 1].y);
    }
    if (!wet) return acc >= want ? h[k] : null;
    if (!dry && acc >= want && onWater(h[k].x, h[k].y)) return deepIn(h[k]);
    return waterNear(i);
  }
  function deepIn(p) {
    var m = T * 0.4;
    if (onWater(p.x - m, p.y) && onWater(p.x + m, p.y) && onWater(p.x, p.y - m) && onWater(p.x, p.y + m)) return p;
    return { x: (Math.floor(p.x / T) + 0.5) * T, y: (Math.floor(p.y / T) + 0.5) * T };
  }
  function waterNear(i) {
    var px = Math.floor(player.x / T), py = Math.floor(player.y / T), spots = [];
    for (var r = 1; r <= 2 && spots.length <= i; r++)
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && isWater(tile(px + dx, py + dy))) spots.push({ x: (px + dx + 0.5) * T, y: (py + dy + 0.5) * T });
    if (!spots.length) return { x: player.x + (i ? 8 : -8), y: player.y + 6 };
    spots.sort(function (a, b) { return Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y); });
    return spots[Math.min(i, spots.length - 1)];
  }
  function onWater(x, y) { return isWater(tile(Math.floor(x / T), Math.floor(y / T))); }

  BH.trailFeature = BH.features.register("trail", {
    onLevelStart: function (lv, api) {
      BH.trailFeature.api = api;
      if (BH.talk.reset) BH.talk.reset();
      notepad(null);
      document.body.classList.remove("trail-cine");
      var t = TR(), n = lvlN();
      if (t.lent && (lv.talks || []).some(function (z) { return z.id === "camp"; })) { t.lent = false; save.wallet = (save.wallet || 0) + 2; }
      t.clues[n] = []; persist();
      S = api.state;
      S.t = 0; S.hrec = []; S.grec = []; S.ctime = []; S.fly = []; S.done = {}; S.zone = {}; S.held = {}; S.chat = {}; S.moveT = 0; S.hushed = {};
      document.body.classList.remove("trail-quiet");
      ["forever"].forEach(function (id) {
        if (!solved[game.levelIdx + ":" + id]) return;
        S.done[id] = true;
        if (id !== "forever") for (var y = 0; y < api.tiles.length; y++) for (var x = 0; x < api.tiles[y].length; x++) if (api.tiles[y][x] === "H") api.setTile(x, y, "J");
      });
      S.hist = [{ x: player.x, y: player.y }]; S.prec = [];
      S.posts = {}; S.payAsk = null; S.pay = null; S.denLand = null;
      var wetStart = player.inShield || isWater(api.tileAt(player.tx, player.ty));
      var spots = friendSpots(api, wetStart ? function (c) { return isWater(c); } : function (c) { return c === "." || c === "b"; },
        wetStart ? [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, 1], [0, -1], [-1, -1]] : [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, 1], [0, 2], [2, 1], [1, 2]]);
      S.elders = (lv.elders || []).map(function (id, i) { var o = spots[i] || spots[0] || [0, 0]; return { id: id, voice: id, x: player.x + o[0] * T, y: player.y + o[1] * T, dir: "right", anim: "idle", t0: simTime }; });
      S.npcs = (lv.npcs || []).map(function (d) { var p = px(d.at); return { id: d.id, voice: d.id, x: p.x, y: p.y, dir: "left", anim: "idle", t0: simTime, water: !!d.water }; });
      S.coins = api.coins;
      S.laterPosts = [];
      if (lv.payOrder) for (var py = 0; py < api.tiles.length; py++) for (var qx = 0; qx < api.tiles[py].length; qx++) if (api.tiles[py][qx] === "U") { S.laterPosts.push([qx, py]); api.setTile(qx, py, "~"); }
      if ((lv.wallet && !walletMadeHere) || lv.sync) { S.locked = true; api.coins.forEach(function (c) { c.got = true; c.locked = true; }); }
      var Q = api.markers.Q || [];
      S.cubes = Q.map(function (m, k) { return { kind: (lv.cubes || [])[k] || "tag", x: (m.tx + 0.5) * T, y: (m.ty + 0.5) * T, got: false }; });
      S.stumps = (api.markers.W || []).map(function (m) { return { x: (m.tx + 0.5) * T, y: (m.ty + 0.5) * T }; });
      S.hound = lv.showdown && dens ? { x: dens.x - T * 1.2, y: dens.y, dir: Math.PI, step: 0, state: "patrol", type: "hunter" } : null;
      S.carry = 0; S.inWater = false;
      if (typeof resize === "function") resize();
      S.zk = 1;
      if (lv === LEVELS[0]) {
        S.zk = 1.6; S.start = { x: player.x, y: player.y };
        if (!introSeen.steps) { introSeen.steps = true; S.introDone = true; S.cinePending = true; S.cineP0 = { x: player.x, y: player.y }; placeCine(); }
      } else if (!toured[lv.tid]) { toured[lv.tid] = true; S.tourPending = true; S.tourWide = rideStart(api); S.tourAt = S.tourWide.at; }
    },
    onStep: function (dt, api) {
      if (!S) return;
      S.t += dt;
      if (L.tid === "together" && game.phase === "play") { var rc = redCount(); if (TR().gRed !== rc) { TR().gRed = rc; persist(); } }
      if (game.phase === "play" && dens && !dens.water && (Math.floor(player.x / T) !== dens.tx || Math.floor(player.y / T) !== dens.ty) && Math.hypot(player.x - dens.x, player.y - dens.y) < T * 1.1) window.tryDen();
      if (typeof coins !== "undefined" && coins) coins.forEach(function (c, i) {
        if (!c.got || c.locked || S.ctime[i] != null) return;
        S.ctime[i] = simTime; S.fly.push({ x: c.x, y: c.y, t0: tnow() });
        if (L.wallet && !S.firstCoin) S.firstCoin = "want";
      });
      if (S.firstCoin === "want" && !S.cine && !S.tour && !BH.talk.isOpen()) {
        S.firstCoin = "said"; open([["sly", "You made your first wallet and picked up your first coin."]]);
      }
      if (game.phase === "play" && typeof hunters !== "undefined") {
        var hr = S.hrec || (S.hrec = []);
        if (!hr.length || simTime - hr[hr.length - 1].t >= 0.1) hr.push({ t: simTime, p: hunters.map(function (h) { var f = h.fg; return [h.x, h.y, h.dir, f && f.mode === "sleep" ? (f.shown != null ? f.shown : f.wake) : -1]; }) });
        if (hr.length > 6000) S.hrec = hr.filter(function (r, i) { return i % 2 === 0 || i === hr.length - 1; });
      }
      S.moveT = player.moving ? S.moveT + dt : 0;
      if (S.moveT > 5.8) {
        var hk = typeof currentHint === "function" && currentHint();
        if (hk) S.hushed[hk.k] = true;
        document.body.classList.add("trail-quiet");
      }
      var tid = L.tid;
      if (S.cinePending) { if (api.time > 0.4) { S.cinePending = false; startCine(); } return; }
      if (S.start && !S.shown && !S.cine && Math.hypot(player.x - S.start.x, player.y - S.start.y) > T * 3) {
        S.shown = true; if (S.zk > 1 && !S.zoomAt) S.zoomAt = simTime;
        var sly = S.elders.filter(function (e) { return e.id === "sly"; })[0];
        if (S.teachWalk) { S.teachWalk = false; open([["sly", "You leave footprints when you walk. Anyone can follow them and find you."]]); return; }
        if (sly) BH.talk.bubble(sly, "See behind you? Your footprints!", 3.4);
      }
      if (!S.introDone && api.time > 0.9) { S.introDone = true; if (INTRO[tid] && !introSeen[tid]) { introSeen[tid] = true; open(INTRO[tid]); return; } }
      if (game.phase === "play" && player.x > T && player.y > T && player.x < (grid[0].length - 1) * T && player.y < (grid.length - 1) * T) { var pr = S.prec || (S.prec = []); if (!pr.length || simTime - pr[pr.length - 1].t >= 0.1) pr.push({ x: player.x, y: player.y, t: simTime, w: !!player.inShield }); }
      var last = S.hist[S.hist.length - 1];
      if (Math.hypot(player.x - last.x, player.y - last.y) > 3) { S.hist.push({ x: player.x, y: player.y }); if (S.hist.length > 400) S.hist.shift(); }
      S.npcs.forEach(function (n) {
        if (!n.goto) return;
        var dx = n.goto.x - n.x, dy = n.goto.y - n.y, d = Math.hypot(dx, dy), st = T * 3.4 * dt;
        if (d <= st) {
          n.x = n.goto.x; n.y = n.goto.y; n.goto = null; n.water = true; n.anim = "idle"; n.t0 = simTime;
          (S.laterPosts || []).forEach(function (p) { api.setTile(p[0], p[1], "U"); puff((p[0] + 0.5) * T, (p[1] + 0.5) * T, 12, "rgba(190,235,255,0.8)", 30); });
          S.laterPosts = null;
          if (lines().landPaid) sayAt(n, lines().landPaid);
          return;
        }
        n.x += dx / d * st; n.y += dy / d * st; n.dir = dx < 0 ? "left" : "right";
        if (n.anim !== "walk") { n.anim = "walk"; n.t0 = simTime; }
      });
      S.elders.forEach(function (e, i) {
        var g = S.denWait ? denSpot(i) : S.board ? { x: player.x + (i ? 1.3 : -1.3) * T, y: player.y + 0.3 * T } : elderPos(i), far = !S.denWait && Math.hypot(player.x - e.x, player.y - e.y) > T * 9;
        if (far) {
          var b = S.hist[Math.max(0, S.hist.length - 1 - (i + 1) * 8)];
          puff(e.x, e.y, 6, "rgba(255,250,240,0.4)", 20); e.x = b.x; e.y = b.y;
        }
        var dx = g ? g.x - e.x : 0, dy = g ? g.y - e.y : 0, d = Math.hypot(dx, dy);
        if (!g) d = 0;
        if (!e.moving && (d > (S.denWait ? T * 0.1 : T * 0.7) || (g && player.inShield && !onWater(e.x, e.y) && d > 2))) e.moving = true;
        else if (e.moving && d < (S.denWait ? T * 0.05 : T * 0.2)) { e.moving = false; e.stopAt = simTime; }
        if (e.moving) {
          var sp = (S.denWait ? T * 6 : Math.min(T * 8, Math.max(T * 2.5, d * 5, Math.hypot(player.vx, player.vy) * 1.15))) * dt, m = Math.min(1, sp / d);
          e.x += dx * m; e.y += dy * m;
          e.stepD = (e.stepD || 0) + Math.hypot(dx * m, dy * m);
          if (e.stepD > T * 0.55) { e.stepD = 0; if (!onWater(e.x, e.y) && !S.denWait && game.phase === "play") sfx("step", { vol: 0.6 }); }
          if (Math.abs(dx) > T * 0.25) e.dir = dx > 0 ? "right" : "left";
          if (e.anim !== "walk") { e.anim = "walk"; if (simTime - (e.stopAt || 0) > 0.25) e.t0 = simTime; }
        } else if (e.anim !== "idle" && simTime - (e.stopAt || 0) > 0.12) { e.anim = "idle"; e.t0 = simTime; }
      });
      if (S.denWait && simTime - S.denWait > 1) S.elders.forEach(function (e, i) { var q = denSpot(i); if (Math.hypot(q.x - e.x, q.y - e.y) >= T * 0.4) { puff(e.x, e.y, 6, "rgba(255,250,240,0.4)", 20); e.x = q.x; e.y = q.y; } });
      if (S.denWait && S.elders.every(function (e, i) { var q = denSpot(i); return Math.hypot(q.x - e.x, q.y - e.y) < T * 0.4; })) { S.denWait = false; baseTryDen(); return; }
      (CHATTER[tid] || []).forEach(function (c, k) {
        if (S.chat[k] || (tid === "machine" && S.pay) || api.time < c[0] || simTime - (S.chatAt || -9) < 4.5 || BH.talk.isOpen()) return;
        var who = S.elders.filter(function (e) { return e.id === c[1]; })[0];
        if (who) { S.chat[k] = true; S.chatAt = simTime; BH.talk.bubble(who, c[2], 3.2); }
      });
      if (player.carry > S.carry) { }
      S.carry = player.carry;
      touchedTick();
      if (S.coinJolt != null && simTime - S.coinJolt >= 0.3) {
        S.coinJolt = null;
        if (S.locked) makeWallet(api, function () { unlockCoins(); }, "No wallet, no coins. Want one?", true, function () {});
      }
      if (S.locked && !S.cine && BH.talk.interruptible()) {
        var nearC = S.coins.some(function (c) { return c.locked && Math.hypot(c.x - player.x, c.y - player.y) < T * 0.9; });
        if (nearC && !S.coinAsk) { S.coinAsk = true; SCRIPTS.coin(api); return; }
        if (!nearC) S.coinAsk = false;
      }
      S.cubes.forEach(function (c) {
        if (c.got || Math.hypot(c.x - player.x, c.y - player.y) > T * 0.6) return;
        c.got = true; S.held[c.kind] = true; sfx("buy"); ring(c.x, c.y, "rgba(190,235,255,0.8)", T * 1.2, 0.5);
        floatText(c.x, c.y - 8, c.kind === "tag" ? "SPENT TAG" : "PROOF", C.ice, "cube");
      });
      (L.talks || []).forEach(function (z) {
        var p = px(z.at), d = Math.hypot(p.x - player.x, p.y - player.y);
        var zk = z.id + "@" + z.at[0] + "," + z.at[1];
        if (d > (z.r + 0.8) * T) { S.zone[zk] = false; return; }
        if (d < z.r * T && !S.zone[zk] && calm() && api.phase === "play" && (!z.when || z.when())) { S.zone[zk] = true; if (SCRIPTS[z.id]) SCRIPTS[z.id](api); }
      });
      if (S.pay || S.payAsk) payTick(api);
      if (game.phase === "play") { events(); lookTick(); }
      if (S.gets && S.gets.length) getsTick();
      if (L.clock) {
        var inW = !!player.inShield;
        if (inW && !S.inWater) { S.inWater = true; S.inAt = api.time; S.inX = player.x; S.inY = player.y; }
        else if (!inW && S.inWater) {
          S.inWater = false;
          var stay = api.time - S.inAt;
          if (stay < L.clock) { api.link("TOO FAST", S.inX, S.inY, player.x, player.y); popRaw("IN AND OUT IN " + stay.toFixed(1) + " S", C.red); }
        }
      }
      if (S.hound && !S.sd && Math.hypot(S.hound.x - player.x, S.hound.y - player.y) < T * 1.8 && !BH.talk.isOpen()) {
        var todo = (L.mustTalk || []).filter(function (id) { return !S.done[id]; });
        if (todo.length) { if (simTime > (S.denNag || 0)) { S.denNag = simTime + 1.5; popRaw(talkLeft(todo), C.gold); } return; }
        showdown(api); return;
      }
    },
    onDrawWorld: function (g, api) {
      if (!S) return;
      var now = simTime;
      if (BH.talk.isOpen()) S.lastTalk = now;
      if (S.tourPending && api.time > 0.4 && game.phase === "play") { S.tourPending = false; startTour(api); }
      if (S.cine) stepCine();
      if (S.cine) cineTrees(g);
      cineLight(g);
      if (!S.tour && !S.tourPending && S.tourZoomed) { S.tourZoomed = false; zoom = tourBase(); }
      if (!S.tour && (S.zk !== 1 || S.zoomAt)) {
        var zk = S.zk;
        if (S.zoomAt) { var q = Math.min(1, (now - S.zoomAt) / 1.6); var z0 = S.zk0 || 1.6; zk = z0 - (z0 - 1) * q * q * (3 - 2 * q); if (q >= 1) { S.zk = 1; S.zoomAt = 0; S.zk0 = 0; } }
        zoom = tourBase() * zk;
      }
      S.stumps.forEach(function (s) {
        g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(s.x, s.y + 8, 13, 3.5, 0, 0, 6.283); g.fill();
        g.fillStyle = "#3b2a1a"; g.fillRect(s.x - 12, s.y + 4, 5, 4); g.fillRect(s.x + 7, s.y + 4, 5, 4);
        g.fillStyle = "#5a3b22"; g.fillRect(s.x - 9, s.y - 4, 18, 12);
        g.fillStyle = "#432b17"; g.fillRect(s.x - 5, s.y - 3, 2, 10); g.fillRect(s.x + 2, s.y - 2, 2, 9);
        g.fillStyle = "#b8895a"; g.beginPath(); g.ellipse(s.x, s.y - 4, 9, 3.5, 0, 0, 6.283); g.fill();
        g.strokeStyle = "#7a5534"; g.lineWidth = 1; g.beginPath(); g.ellipse(s.x, s.y - 4, 5, 1.8, 0, 0, 6.283); g.stroke();
        var fy = s.y - 16 + Math.sin(now * 3) * 1.5;
        g.fillStyle = C.goldDim; g.fillRect(s.x - 3, fy - 4, 6, 8); g.fillRect(s.x - 4, fy - 3, 8, 6);
        g.fillStyle = C.gold; g.fillRect(s.x - 2, fy - 3, 4, 6); g.fillRect(s.x - 3, fy - 2, 6, 4);
      });
      S.coins.forEach(function (c) {
        if (!c.locked) return;
        var cy = c.y + Math.sin(now * 2 + c.x) * 1.5;
        if (S.touchedQ && S.touchedQ.indexOf(c) >= 0) {
          g.fillStyle = C.goldDim; g.fillRect(c.x - 4, cy - 7, 8, 14); g.fillRect(c.x - 6, cy - 5, 12, 10); g.fillRect(c.x - 7, cy - 3, 14, 6);
          g.fillStyle = C.gold; g.fillRect(c.x - 3, cy - 6, 6, 12); g.fillRect(c.x - 5, cy - 4, 10, 8); g.fillRect(c.x - 6, cy - 2, 12, 4);
          zecMark(g, c.x, cy);
          return;
        }
        g.globalAlpha = 0.7;
        g.fillStyle = C.goldDim; g.fillRect(c.x - 4, cy - 7, 8, 14); g.fillRect(c.x - 6, cy - 5, 12, 10); g.fillRect(c.x - 7, cy - 3, 14, 6);
        g.fillStyle = "#b8963e"; g.fillRect(c.x - 3, cy - 6, 6, 12); g.fillRect(c.x - 5, cy - 4, 10, 8); g.fillRect(c.x - 6, cy - 2, 12, 4);
        zecMark(g, c.x, cy);
        g.globalAlpha = 1;
        g.strokeStyle = "#e8e8e8"; g.lineWidth = 1.5; g.beginPath(); g.arc(c.x + 6, cy + 3, 2.5, Math.PI, 0); g.stroke();
        g.fillStyle = "#e8e8e8"; g.fillRect(c.x + 3, cy + 3, 6, 5); g.fillStyle = "#1b1b1b"; g.fillRect(c.x + 5.5, cy + 4.5, 1, 2);
      });
      S.cubes.forEach(function (c) {
        if (c.got) return;
        var b = Math.sin(now * 3 + c.x) * 2, col = c.kind === "tag" ? "#ff8a5c" : "#7fd8ff";
        g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(c.x - 6, c.y + 6, 12, 3);
        g.fillStyle = col; g.fillRect(c.x - 6, c.y - 8 + b, 12, 12);
        g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(c.x - 6, c.y - 8 + b, 12, 3); g.fillRect(c.x - 6, c.y - 8 + b, 3, 12);
        g.fillStyle = "#1b1b1b"; g.font = "600 8px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(c.kind === "tag" ? "#" : "?", c.x + 1, c.y - 1 + b);
      });
      (L.talks || []).forEach(function (z) {
        if (S.done[z.id] || z.id === "stump" || L.tid === "inriver") return;
        var p = px(z.at);
        if ((S.npcs || []).some(function (e) { return Math.hypot(e.x - p.x, e.y - p.y) < T * 1.5; })) return;
        var y = p.y - 26 + Math.sin(now * 4) * 2;
        g.fillStyle = "#000"; g.fillRect(p.x - 5, y - 8, 10, 13); g.fillStyle = C.gold; g.fillRect(p.x - 1.5, y - 6, 3, 6); g.fillRect(p.x - 1.5, y + 1, 3, 2.5);
      });
      if (L.tid === "camp") {
        var f = px([11, 6]);
        for (var i = 0; i < 6; i++) { var a = now * 6 + i * 1.7, hgt = 6 + Math.sin(a) * 3; g.fillStyle = i % 2 ? "#ffb347" : "#ff6a2a"; g.fillRect(f.x - 6 + i * 2, f.y - 4 - hgt, 2, hgt); }
      }
      if (S.demo) drawDemo(g);
      if (S.board || S.sweep) drawBoardTrail(g);
      if (S.strike) drawStrike(g);
      S.front = [];
      S.npcs.concat(S.elders).forEach(function (e) {
        if (e.id === "edge") { e.topY = e.y - 90; return; }
        if (!endPainting && e.y > player.y + 1) { S.front.push(e); return; }
        drawFolk(g, e, now);
      });
      wrapPlayer();
      if (S.hound) {
        var h = S.hound; h.step += 0.3;
        if (S.sd !== "won") { h.dir = Math.atan2(player.y - h.y, player.x - h.x); drawHunterBody(h, HOUND_LOOK); h.topY = h.y - 28; }
      }
    },
    onDrawOver: function (g, api) {
      if (!S) return;
      var n = lvlN(), W0 = (typeof W === "number" ? W : innerWidth);
      if (S.cine || S.tour) {
        var bh = Math.min(1, (simTime - (S.cine || S.tour).t0) / 0.5) * Math.round((typeof H === "number" ? H : innerHeight) * 0.135);
        g.fillStyle = "#000"; g.fillRect(0, 0, W0, bh); g.fillRect(0, (typeof H === "number" ? H : innerHeight) - bh, W0, bh);
        return;
      }
      if (S.barsOut) {
        var bk = S.barsOut.k - (simTime - S.barsOut.t0) / 0.5, H1 = (typeof H === "number" ? H : innerHeight);
        if (bk <= 0) S.barsOut = null;
        else { var bo = bk * Math.round(H1 * 0.135); g.fillStyle = "#000"; g.fillRect(0, 0, W0, bo); g.fillRect(0, H1 - bo, W0, bo); }
      }
      if (L.showdown && (strikes() > 0 || pastRiverPay())) {
        var k = strikes(), w = 132, x = W0 - w - 12, y = 58, hot = S.flash && simTime - S.flash < 0.8;
        g.fillStyle = "rgba(0,0,0,0.78)"; g.fillRect(x, y, w, 34); g.strokeStyle = hot ? C.red : "rgba(255,255,255,0.7)"; g.lineWidth = hot ? 2 : 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, 33);
        g.font = "600 9px 'Plex Mono', monospace"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#d9b38c"; g.fillText("HOUND'S CASE FILE", x + 8, y + 10);
        for (var i = 0; i < 3; i++) { g.fillStyle = i < k ? C.red : "rgba(255,255,255,0.18)"; g.fillRect(x + 8 + i * 18, y + 18, 12, 10); }
        g.fillStyle = k ? C.red : "rgba(255,255,255,0.6)"; g.fillText(k >= 3 ? "FOUND" : k + " / 3 CLUES", x + 66, y + 23);
      }
      if (BH.talk.isOpen()) S.wFree = 0; else if (!S.wFree) S.wFree = tnow();
      var hasW = L.wallet ? walletMadeHere && (S.wAt || S.wNow || (S.wFree && tnow() - S.wFree > 0.3)) : true;
      if (hasW) {
        var H0 = (typeof H === "number" ? H : innerHeight), need = L.need || 0, got = banked(), total = Math.max(window.trailCoinTotal ? window.trailCoinTotal() : 0, got);
        g.save(); var ks = 1.3, cw = 168, ch = 58;
        if (!S.wAt) { S.wAt = simTime; S.wFrom = { x: Math.max(8, Math.min(W0 - cw * (ks + 0.9) - 8, (player.x - view.x0) * zoom + 28)), y: Math.max(8, Math.min(H0 - ch * (ks + 0.9) - 8, (player.y - view.y0) * zoom - ch * (ks + 0.9) - 24)) }; }
        var fly = L.wallet ? Math.min(1, Math.max(0, (simTime - S.wAt - 0.5) / 0.9)) : 1, fe = fly * fly * (3 - 2 * fly), kf = ks + (1 - fe) * 0.9;
        var tx = W0 - (cw + 14) * ks, ty = H0 - (ch + (TOUCH ? 150 : 14)) * ks;
        var wf = S.wFrom || { x: W0 / 2 - cw * kf / 2, y: H0 / 2 - ch * kf / 2 };
        g.translate(tx + (1 - fe) * (wf.x - tx), ty + (1 - fe) * (wf.y - ty)); g.scale(kf, kf);
        var cx = 0, cy = 0;
        var glow = hasW && simTime - S.wAt < 1.4 ? 1 - (simTime - S.wAt) / 1.4 : 0;
        g.fillStyle = "#1f130a"; g.fillRect(cx - 3, cy - 3, cw + 6, ch + 6);
        g.fillStyle = glow ? "rgba(234,186,73," + (0.35 + glow * 0.65).toFixed(2) + ")" : "#86592f"; g.fillRect(cx - 1, cy - 1, cw + 2, ch + 2);
        g.fillStyle = "#3a2514"; g.fillRect(cx, cy, cw, ch);
        g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(cx, cy + 22, cw, 1);
        var ix = cx + 8, iy = cy + 11, on = hasW;
        g.fillStyle = on ? "#7a4a22" : "#4a3a2c"; g.fillRect(ix, iy, 26, 20);
        g.fillStyle = on ? "#9a6a3a" : "#5a4a3c"; g.fillRect(ix, iy, 26, 3);
        g.fillStyle = on ? "#5a3418" : "#3a2e24"; g.fillRect(ix + 14, iy + 7, 12, 8);
        g.fillStyle = on ? C.gold : "#6b6b6b"; g.fillRect(ix + 18, iy + 9, 4, 4);
        g.textAlign = "left"; g.textBaseline = "middle";
        g.font = "700 10px 'Plex Mono', monospace"; g.fillStyle = on ? C.gold : "rgba(255,255,255,0.55)";
        g.fillText(on ? "MY WALLET" : "NO WALLET", cx + 42, cy + 13);
        if (on) {
          g.font = "600 10px 'Plex Mono', monospace"; g.fillStyle = "#fff3c4"; g.textAlign = "right";
          g.fillText(got + " / " + total + " ZEC", cx + cw - 8, cy + 13);
          var sx = cx + 42, step = Math.min(14, (cw - 50) / Math.max(1, total)), sz = Math.max(6, Math.min(10, step - 3)), open = got >= need;
          for (var q = 0; q < total; q++) {
            var qx = sx + q * step, qy = cy + 32, den = q < need;
            g.fillStyle = den ? "rgba(234,186,73,0.45)" : "rgba(127,216,255,0.4)"; g.fillRect(qx - 1, qy - sz / 2 - 1, sz + 2, sz + 2);
            g.fillStyle = q < got ? (den ? C.gold : "#7fd8ff") : "#2a1a0e"; g.fillRect(qx, qy - sz / 2, sz, sz);
            if (q < got && sz >= 8) { g.fillStyle = den ? "#a67c1f" : "#3f8fb3"; g.fillRect(qx + sz / 2 - 2, qy - 2, 4, 4); }
          }
          g.textAlign = "left"; g.font = "500 9px 'Plex Mono', monospace";
          g.fillStyle = open ? C.gold : "rgba(255,255,255,0.65)";
          g.fillText(!need ? "NO COINS NEEDED HERE" : open ? "DEN OPEN" + (got > need ? " · " + (got - need) + " EXTRA" : "") : "DEN NEEDS " + (need - got) + " MORE", cx + 42, cy + 48);
        } else {
          g.font = "500 9px 'Plex Mono', monospace"; g.fillStyle = "rgba(255,255,255,0.5)";
          g.fillText("COINS NEED A WALLET", cx + 42, cy + 32);
        }
        g.restore();
        if (L.wallet && fe >= 1 && !S.wLand) { S.wLand = true; S.wLandAt = simTime; sfx("walletLand"); }
        if (fe >= 1) S.fly = S.fly.filter(function (f) {
          var q = (tnow() - f.t0) / 0.7; if (q >= 1) { sfx("coinIn"); return false; } if (q < 0) return true;
          var e = q * q * (3 - 2 * q), sx = (f.x - view.x0) * zoom, sy = (f.y - view.y0) * zoom, ex = tx + 60 * ks, ey = ty + 32 * ks;
          var fx = sx + (ex - sx) * e, fy = sy + (ey - sy) * e - Math.sin(e * Math.PI) * 60, r = 15 - 7 * e;
          g.fillStyle = C.goldDim; g.fillRect(fx - r, fy - r + 2, r * 2, r * 2 - 4); g.fillRect(fx - r + 2, fy - r, r * 2 - 4, r * 2);
          g.fillStyle = C.gold; g.fillRect(fx - r + 2, fy - r + 2, r * 2 - 4, r * 2 - 4);
          return true;
        });
        else S.fly.forEach(function (f) { f.t0 = tnow() + 0.15; });
      }
      if (L.clock && S.inWater) {
        var left = Math.ceil(L.clock - (api.time - S.inAt)), ok = left <= 0, lw = 132, lx = W0 - lw - 12, ly = 96;
        if (ok && !S.clockOk) { S.clockOk = true; sfx("click"); }
        g.fillStyle = "rgba(0,0,0,0.78)"; g.fillRect(lx, ly, lw, 18); g.strokeStyle = ok ? C.gold : "rgba(255,255,255,0.5)"; g.lineWidth = 1; g.strokeRect(lx + 0.5, ly + 0.5, lw - 1, 17);
        g.font = "600 9px 'Plex Mono', monospace"; g.textAlign = "left"; g.textBaseline = "middle";
        g.fillStyle = ok ? C.gold : "#fff"; g.fillText(ok ? "WAITED IN THE WATERS" : "WAIT IN THE WATERS: " + left, lx + 8, ly + 9);
      } else S.clockOk = false;
      if (S.cubes.length) {
        var cx = W0 - 144, cy = 96;
        g.fillStyle = "rgba(0,0,0,0.75)"; g.fillRect(cx, cy, 132, 18); g.font = "600 9px 'Plex Mono', monospace"; g.textAlign = "left";
        g.fillStyle = S.held.tag ? "#ff8a5c" : "rgba(255,255,255,0.35)"; g.fillText("TAG", cx + 8, cy + 9);
        g.fillStyle = S.held.proof ? "#7fd8ff" : "rgba(255,255,255,0.35)"; g.fillText("PROOF", cx + 40, cy + 9);
        g.fillStyle = S.built ? C.gold : "rgba(255,255,255,0.35)"; g.fillText(S.built ? "BUILT" : "", cx + 90, cy + 9);
      }
    }
  });

  BH.tiles.register("W", { marker: true, base: "." });
  BH.tiles.register("Q", { marker: true, base: "." });
  BH.tiles.register("H", { solid: true, draw: function (b, x, y) {
    b.fillStyle = C.ground; b.fillRect(x, y, T, T);
    b.fillStyle = "#4e3520"; b.fillRect(x + 2, y + 3, T - 4, 4); b.fillRect(x + 2, y + T - 8, T - 4, 4);
    b.fillStyle = C.wood; for (var i = 0; i < 4; i++) b.fillRect(x + 3 + i * 7, y + 1, 4, T - 2);
    b.fillStyle = C.gold; b.fillRect(x + T / 2 - 3, y + T / 2 - 3, 6, 6);
  } });
  BH.tiles.register("J", { draw: function (b, x, y) {
    b.fillStyle = C.ground; b.fillRect(x, y, T, T);
    b.fillStyle = "#4e3520"; b.fillRect(x, y + 2, 5, T - 3); b.fillRect(x + T - 5, y + 2, 5, T - 3);
    b.fillStyle = C.wood; b.fillRect(x + 1, y + 1, 3, T - 2); b.fillRect(x + T - 4, y + 1, 3, T - 2);
  } });
  BH.tiles.register("M", { solid: true, draw: function (b, x, y) {
    b.fillStyle = C.ground; b.fillRect(x, y, T, T);
    b.fillStyle = "#2c3a4a"; b.fillRect(x + 2, y + 3, T - 4, T - 5);
    b.fillStyle = "#13202c"; b.fillRect(x + 5, y + 6, T - 10, 9);
    b.fillStyle = "#7fd8ff"; b.fillRect(x + 7, y + 9, 3, 3); b.fillRect(x + 13, y + 9, 3, 3); b.fillRect(x + 19, y + 9, 3, 3);
    b.fillStyle = C.gold; b.fillRect(x + 6, y + T - 8, T - 12, 3);
  } });
  BH.tiles.register("N", { solid: true, draw: function (b, x, y) {
    b.fillStyle = C.ground; b.fillRect(x, y, T, T);
    b.fillStyle = "#3b2a1a"; b.fillRect(x + 5, y + T - 9, 3, 8); b.fillRect(x + T - 8, y + T - 9, 3, 8);
    b.fillStyle = C.wood; b.fillRect(x + 2, y + 3, T - 4, T - 11);
    b.fillStyle = "#f0e6d0"; b.fillRect(x + 5, y + 6, 8, 6); b.fillRect(x + 15, y + 5, 9, 8); b.fillRect(x + 8, y + 13, 10, 4);
    b.fillStyle = C.red; b.fillRect(x + 8, y + 6, 2, 2); b.fillRect(x + 19, y + 5, 2, 2);
  } });
  BH.tiles.register("C", { solid: true, draw: function (b, x, y) {
    b.fillStyle = C.ground; b.fillRect(x, y, T, T);
    b.fillStyle = "#555"; for (var i = 0; i < 8; i++) { var a = i / 8 * 6.283; b.fillRect(x + T / 2 + Math.cos(a) * 10 - 2, y + T / 2 + Math.sin(a) * 7 - 2, 5, 4); }
    b.fillStyle = "#4e3520"; b.fillRect(x + 8, y + 15, 16, 3); b.fillRect(x + 11, y + 12, 10, 3);
  } });

  function isLand(x, y) { var c = (grid[y] || [])[x]; return c != null && !solidP(c) && !isWater(c); }
  function landNear(tx, ty, n, only) {
    var seen = {}, q = [[tx, ty]], out = [];
    seen[tx + "," + ty] = 1;
    while (q.length && out.length < n) {
      var p = q.shift();
      if (isLand(p[0], p[1]) && (!only || only[p[0] + "," + p[1]])) out.push(p);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var x = p[0] + d[0], y = p[1] + d[1], k = x + "," + y, c = (grid[y] || [])[x];
        if (seen[k] || c == null || solidP(c) && !isWater(c)) return;
        seen[k] = 1; q.push([x, y]);
      });
    }
    return out;
  }
  function landPart(tx, ty) {
    var seen = {}, q = [[tx, ty]];
    if (!isLand(tx, ty)) return null;
    seen[tx + "," + ty] = 1;
    while (q.length) {
      var p = q.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var x = p[0] + d[0], y = p[1] + d[1], k = x + "," + y;
        if (seen[k] || !isLand(x, y)) return;
        seen[k] = 1; q.push([x, y]);
      });
    }
    return seen;
  }
  function trailSpot(i) {
    var h = S.hist, want = (i + 1) * T * 0.8, got = 0, p = { x: player.x, y: player.y };
    for (var k = h.length - 1; k >= 0; k--) {
      var sl = Math.hypot(h[k].x - p.x, h[k].y - p.y);
      if (got + sl >= want && sl > 0) { var f = (want - got) / sl; return { x: p.x + (h[k].x - p.x) * f, y: p.y + (h[k].y - p.y) * f }; }
      got += sl; p = h[k];
    }
    return { x: p.x, y: p.y };
  }
  function denSpot(i) {
    if (S.denWait) { S.denTrail = S.denTrail || [0, 1].map(trailSpot); return S.denTrail[i] || S.denTrail[0]; }
    S.denTrail = null;
    var q ={ x: dens.x + (i ? 1 : -1) * T * 0.75, y: dens.y + T * 0.55 };
    if (!dens.water || !solidP(tile(Math.floor(q.x / T), Math.floor(q.y / T)))) return q;
    if (!S.denLand) {
      var e = S.elders[0], part = e ? landPart(Math.floor(e.x / T), Math.floor(e.y / T)) : null;
      S.denLand = landNear(dens.tx, dens.ty, 2, part);
      if (!S.denLand.length) S.denLand = landNear(dens.tx, dens.ty, 2);
    }
    var t = S.denLand[i] || S.denLand[0];
    return t ? { x: (t[0] + 0.5) * T, y: (t[1] + 0.5) * T } : { x: dens.x, y: dens.y };
  }
  var baseStepHunter = window.stepHunter;
  window.stepHunter = function (h) { if (S && (S.board || (S.strike && S.strike.h === h))) return; return baseStepHunter.apply(this, arguments); };
  function ease01(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }
  function stepBack(m) {
    var best = { x: m.x, y: m.y }, bd = -1, mx = Math.floor(m.x / T), my = Math.floor(m.y / T);
    [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (d) {
      for (var k = 1; k <= 3; k++) {
        var c = (grid[my + d[1] * k] || [])[mx + d[0] * k];
        if (c == null || solidP(c) || c === "b") break;
        var x = (mx + d[0] * k + 0.5) * T, y = (my + d[1] * k + 0.5) * T, dd = Math.hypot(x - player.x, y - player.y);
        if (dd > bd) { bd = dd; best = { x: x, y: y }; }
      }
    });
    return best;
  }
  function strikeView() {
    var s = S.strike, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    function box(x, top, bot) { x0 = Math.min(x0, x - 56); x1 = Math.max(x1, x + 56); y0 = Math.min(y0, top); y1 = Math.max(y1, bot); }
    if (s.pine) box(s.pine.x, (s.pine.topY != null ? s.pine.topY : s.pine.y - 40) - 52, s.pine.y + 16);
    box(s.mTo.x, s.mTo.y - 96, s.mTo.y + 16);
    box(player.x, (player.topY != null ? player.topY : player.y - 40) - 50, player.y + 52);
    if (s.h) box(s.h.x, s.h.y - 56, s.h.y + 16);
    var sl = 40, sr = W - 40, st = 150, sb = H - 110, base = W < 700 ? W / (T * 13) : Math.min(W / (T * 24), H / (T * 14));
    var zf = Math.max(base * 0.5, Math.min(base, (sr - sl) / (x1 - x0), (sb - st) / (y1 - y0)));
    return { z: zf / base, x: (x0 + x1) / 2 - ((sl + sr) / 2 - W / 2) / zf, y: (y0 + y1) / 2 - ((st + sb) / 2 - H / 2) / zf };
  }
  function strikeLive() { return game.phase === "play" || game.phase === "talk"; }
  function drawStrike(g) {
    var s = S.strike, t = simTime - s.t0, h = s.h, ez = ease01(t / 0.6), m = s.m;
    if (!strikeLive()) { S.strike = null; S.zk0 = S.zk; S.zoomAt = simTime; if (m && m.anim === "walk") { m.anim = "idle"; m.t0 = simTime; } return; }
    S.zk = 1 + ((s.z || 1) - 1) * ez;
    if (m) { m.x = s.from.x + (s.mTo.x - s.from.x) * ez; m.y = s.from.y + (s.mTo.y - s.from.y) * ez; if (t < 0.6) { if (m.anim !== "walk") { m.anim = "walk"; m.t0 = simTime; } m.dir = s.mTo.x < s.from.x ? "left" : "right"; } else if (m.anim === "walk") { m.anim = "idle"; m.t0 = simTime; } }
    if (t >= 0.6 && s.n === 0) {
      s.to = { x: player.x, y: player.y, top: (player.topY != null ? player.topY : player.y - 40) - 24 };
      strings.push({ ax: s.a.x, ay: s.a.y, bx: s.to.x, by: s.to.y, t0: simTime, amount: null, why: "SAME ADDRESS", aWho: s.pine, bWho: s.to, near: S.elders, late: true }); s.n = 1; sfx("linked");
    }
    if (t >= 1.5 && s.n === 1) { s.api.link("SAME ADDRESS", s.b.x, s.b.y, s.to.x, s.to.y); var l2 = strings[strings.length - 1]; l2.aWho = m; l2.bWho = s.to; l2.near = S.elders; l2.late = true; s.n = 2; }
    if (t >= 2.6) {
      S.strike = null; S.zk0 = S.zk; S.zoomAt = simTime;
      clue("used one address twice");
      open([["sly", "See him? Same address twice, so he knows both coins went to you."]]);
      return;
    }
    if (!h) return;
    var str = s.n ? strings[strings.length - 1] : null;
    if (str) {
      var f = Math.min(1, (simTime - str.t0) / 0.45), mx = (str.ax + str.bx) / 2, my = (str.ay + str.by) / 2 + Math.hypot(str.bx - str.ax, str.by - str.ay) * 0.12, u = 1 - f;
      var tx = u * u * str.ax + 2 * u * f * mx + f * f * str.bx, ty = u * u * str.ay + 2 * u * f * my + f * f * str.by;
      h.dir = Math.atan2(ty - h.y, tx - h.x);
      g.save(); g.setLineDash([5, 5]); g.strokeStyle = C.string; g.globalAlpha = 0.85; g.lineWidth = 2;
      g.beginPath(); g.moveTo(h.x, h.y - 14); g.lineTo(tx, ty); g.stroke(); g.restore();
    } else h.dir = Math.atan2(player.y - h.y, player.x - h.x);
    if (s.n > 1) return;
    var ey = h.y - 34 + Math.sin(t * 8) * 1.5;
    g.font = "600 16px 'Plex Cond', sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineWidth = 4; g.strokeStyle = "rgba(27,27,27,0.9)";
    g.strokeText("!", h.x, ey); g.fillStyle = C.red; g.fillText("!", h.x, ey);
  }
  function drawBoardTrail(g) {
    var n = prints.length, t = tnow() - (S.board || S.sweep).t0;
    if (!S.board && t > 3.5) { S.sweep = null; return; }
    var k = Math.floor(n * Math.min(1, t / 2.5)), a = 0.65 + 0.35 * Math.sin(t * 5);
    g.fillStyle = "rgba(255,210,74," + a + ")";
    for (var i = 0; i < k; i++) { var p = prints[i]; g.fillRect(p.x - 2.5, p.y - 2.5, 5, 5); }
  }
  window.trailSpent = function () { return S ? Object.keys(S.posts || {}).reduce(function (n, k) { return n + (S.posts[k].n || 0); }, 0) : 0; };
  var baseTryDen = window.tryDen;
  window.tryDen = function () {
    if (S && L.mustTalk) {
      var left = L.mustTalk.filter(function (id) { return !S.done[id]; });
      if (left.length) { if (simTime > (S.denNag || 0)) { S.denNag = simTime + 1.5; popRaw(talkLeft(left), C.gold); } return; }
    }
    if (S && L.mustPay && !S.done.machine) { if (simTime > (S.denNag || 0)) { S.denNag = simTime + 1.5; popRaw("PAY THE MERCHANT FIRST", C.gold); } return; }
    if (S && L.showdown && S.sd !== "won") { if (!S.sd && !BH.talk.isOpen()) showdown(BH.trailFeature.api); return; }
    if (S && S.denWait) return;
    if (S && dens && S.elders && S.elders.length && banked() >= L.need && S.elders.some(function (e, i) { var q = denSpot(i); return Math.hypot(q.x - e.x, q.y - e.y) > T * 0.4; })) {
      S.denWait = Math.max(simTime, 1e-3); popRaw("WAIT FOR YOUR FRIENDS", C.gold); return;
    }
    return baseTryDen();
  };

  var baseWhy = window.caughtWhy;
  window.caughtWhy = function (r) {
    var c = (r && r.cause) || {}, f = String(c.feature || (r && r.how) || "");
    if (f === "trail:found") { endingSeen("found"); return { why: "Three red lines. The watcher tied it all back to you.", how: "You reached the FOUND ending.",
      cause: "RED LINES 3 / 3.", hint: "Shield one pile at a time and pay inside the waters." }; }
    if (f === "trail:robbed") { endingSeen("robbed"); return { word: "SCAMMED", why: "You gave away your 24 words.", how: "Whoever has the words has the coins. They are gone, for good.",
      cause: "A stranger asked, and you answered.", hint: "Don't give out your secret phrase." }; }
    return baseWhy(r);
  };

  var baseStartLevel = window.startLevel, fading = false;
  function layer(id) {
    var el = document.getElementById(id);
    if (!el) { el = document.createElement("div"); el.id = id; document.body.appendChild(el); }
    return el;
  }
  function tween(secs, fn, done) {
    var t0 = performance.now();
    (function f(now) {
      var k = Math.min(1, (now - t0) / (secs * 1000));
      fn(k);
      if (k < 1) requestAnimationFrame(f); else if (done) done();
    })(t0);
  }
  function easeIn(k) { return k * k * k; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function irisAt(el, x, y, r) { el.style.left = x + "px"; el.style.top = y + "px"; el.style.width = el.style.height = Math.max(0, 2 * r) + "px"; }
  function slide(rows, k, out) {
    rows.forEach(function (d, j) {
      var q = out ? k : Math.max(0, Math.min(1, (k - j * 0.15) / 0.7)), e = out ? easeIn(q) : easeOut(q);
      d.style.opacity = String(out ? 1 - e : e);
      d.style.transform = "translateY(" + (out ? -22 * e : 26 * (1 - e)) + "px)";
    });
  }
  window.startLevel = function (i) {
    if (fading) return;
    if (i === game.levelIdx && (game.screen === "play" || game.screen === "caught")) return baseStartLevel(i);
    fading = true;
    function reach(x, y) { return Math.ceil(Math.max(Math.hypot(x, y), Math.hypot(innerWidth - x, y), Math.hypot(x, innerHeight - y), Math.hypot(innerWidth - x, innerHeight - y))) + 8; }
    var cv = document.getElementById("wmCanvas"), p = cv && BH.worldmap && BH.worldmap.screenOf ? BH.worldmap.screenOf(i + 1) : null;
    if (!p) p = { x: innerWidth / 2, y: innerHeight / 2 };
    var R = reach(p.x, p.y);
    var iris = layer("trailIris"), card = layer("trailFade"), pan = document.getElementById("wmPanel");
    var lv = LV[i] || {}, acts = (window.FACTS && FACTS.acts) || [];
    card.innerHTML = '<div class="tf-act">ACT ' + ((lv.act || 0) + 1) + (acts[lv.act || 0] ? " · " + acts[lv.act || 0] : "") + '</div>' +
      '<div class="tf-n">LEVEL ' + lvLabel(i + 1) + '</div><div class="tf-title">' + (lv.title || "") + '</div>';
    var rows = [].slice.call(card.children);
    slide(rows, 0, false);
    irisAt(iris, p.x, p.y, R); iris.className = "on";
    if (cv) cv.style.transformOrigin = p.x + "px " + p.y + "px";
    tween(0.8, function (k) {
      var e = k * k;
      irisAt(iris, p.x, p.y, R * (1 - k * (2 - k)));
      if (cv) cv.style.transform = "scale(" + (1 + 1.8 * e) + ")";
      if (pan) pan.style.opacity = String(Math.max(0, 1 - k * 3));
    }, function () {
      card.className = "on";
      baseStartLevel(i);
      var held = game.phase === "play"; if (held) game.phase = "talk";
      var t0 = simTime;
      tween(0.6, function (k) { slide(rows, k, false); }, function () {
        setTimeout(function () {
          if (held && game.phase === "talk") { game.phase = "play"; if (typeof levelStart === "number") levelStart += simTime - t0; }
          var cx = innerWidth / 2, cy = innerHeight / 2;
          if (typeof view === "object" && view && typeof zoom === "number") {
            var fp = (S && S.tourPending && S.tourAt) || { x: player.x, y: player.y - 16 };
            cx = Math.max(40, Math.min(innerWidth - 40, W / 2 + (fp.x - (view.x0 + view.x1) / 2) * zoom));
            cy = Math.max(40, Math.min(innerHeight - 40, H / 2 + (fp.y - (view.y0 + H / zoom / 2)) * zoom));
          }
          var R2 = reach(cx, cy);
          tween(0.35, function (k) { slide(rows, k, true); }, function () {
            card.className = "";
            tween(0.85, function (k) { irisAt(iris, cx, cy, R2 * easeOut(k)); }, function () { iris.className = ""; fading = false; });
          });
        }, 650);
      });
    });
  };
  var huntPaint = window.paintEndMap, replay = { id: 0, cv: null }, endPainting = false, revealAnims = [];
  var V0 = { oak: "char-010", sly: "char-052" };
  var basePaint = function () {
    var d = dens, el = S && S.elders ? S.elders : [], dp = window.drawPlayer, db = window.drawBitfoot;
    var held = !replay.on && replay.pose ? replay.pose.map(function (p) { var o = p.o, was = {}; Object.keys(p.v).forEach(function (k) { was[k] = o[k]; o[k] = p.v[k]; }); return { o: o, was: was }; }) : [];
    dens = null; S && (S.elders = []);
    window.drawPlayer = function () {
      el.concat([player]).sort(function (a, b) { return a.y - b.y; }).forEach(function (o) {
        if (o === player) return dp();
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(o.x, o.y + 10, 10, 3.5, 0, 0, 6.283); ctx.fill();
        drawBitfoot(o.x, o.y + 10, o.dir, o.anim, simTime - o.t0, 1, { char: V0[o.id] });
      });
    };
    endPainting = true;
    try { return huntPaint.apply(this, arguments); } finally {
      endPainting = false; dens = d; S && (S.elders = el); window.drawPlayer = dp; window.drawBitfoot = db;
      held.forEach(function (h) { Object.keys(h.was).forEach(function (k) { h.o[k] = h.was[k]; }); });
    }
  };
  function dock() {
    var box = document.getElementById("ecMapBox"), head = document.querySelector(".overlay.complete .ec-head"), nx = document.getElementById("btnNext"), card = head && head.parentNode;
    if (!box || !head || head.parentNode === box) return;
    box.appendChild(head); head.classList.add("ec-onmap");
    var side = card && card.querySelector(".ec-side"), q = function (s) { return side && side.querySelector(s); };
    var news = head.querySelectorAll(".ec-praise.ach-new");
    if (news.length) {
      var chips = document.createElement("div"); chips.className = "ec-chips";
      Array.prototype.forEach.call(news, function (p) {
        var b = p.querySelector(".ec-badge"), c = document.createElement("button");
        c.type = "button"; c.className = "ec-chip"; c.setAttribute("data-ach-open", "1");
        var id = p.getAttribute("data-ach-id"), nm = p.getAttribute("data-ach-name"), src = id && BH.hall && BH.hall.badgeIcon ? BH.hall.badgeIcon(id) : "";
        if (src && nm) {
          c.className = "ec-chip ec-medal"; c.setAttribute("aria-label", "New badge: " + nm);
          var im = new Image(); im.className = "ec-medal-ico"; im.alt = ""; im.src = src; c.appendChild(im);
          var nw = document.createElement("span"); nw.className = "ec-medal-new"; nw.textContent = "NEW"; c.appendChild(nw);
          var tx = document.createElement("span"); tx.className = "ec-medal-name"; tx.textContent = nm; c.appendChild(tx);
        } else c.textContent = b ? b.textContent : "";
        chips.appendChild(c); p.remove();
      });
      head.appendChild(chips);
    }
    var r = game.result || {}, medals = head.querySelectorAll(".medal");
    var missed = ["par", "unseen"].filter(function (k) { return r.medals && !r.medals[k]; });
    Array.prototype.forEach.call(head.querySelectorAll(".ec-miss"), function (p, i) {
      var m = medals[missed[i] === "par" ? 1 : 2], b = p.querySelector(".ec-badge"), tip = p.textContent.slice(b ? b.textContent.length : 0).trim();
      if (m) { m.title = tip; m.setAttribute("tabindex", "0"); m.classList.add("has-tip"); m.setAttribute("data-tip", tip); }
      p.remove();
    });
    Array.prototype.forEach.call(medals, function (m) { m.addEventListener("click", function () { if (m.classList.contains("has-tip")) m.classList.toggle("tip-on"); }); });
    var zrow = document.createElement("div"); zrow.className = "ec-zecrow";
    var zec = q(".ec-zec"); if (zec) zrow.appendChild(zec);
    Array.prototype.forEach.call(head.querySelectorAll(".ec-praise:not(.ach-new)"), function (p) { zrow.appendChild(p); });
    head.insertBefore(zrow, head.querySelector(".ec-chips"));    [q(".ec-line"), q(".ec-q"), nx].forEach(function (e) { if (e) head.appendChild(e); });
    var links = q(".ec-links");
    if (links) {
      ["#btnRetry", "#btnLevels", "#btnShop"].forEach(function (s) { var b = links.querySelector(s); if (b) links.appendChild(b); });
      Array.prototype.forEach.call(links.querySelectorAll("span"), function (s) { s.remove(); });
      var shop = links.querySelector("#btnShop"); if (shop) shop.textContent = "Select Character";
      head.appendChild(links);
    }
    var share = card && card.querySelector(".ec-share"), foot = q(".ec-foot");
    if (share && foot) {
      Array.prototype.forEach.call(share.children, function (c) { c.hidden = true; });
      while (foot.firstChild) { if (share.querySelector("a, details")) { var sep = document.createElement("span"); sep.textContent = "·"; share.appendChild(sep); } share.appendChild(foot.firstChild); }
      var wl = share.querySelector("a"); if (wl) wl.textContent = "ZCASH WALLET ↗";
      shareMenu(head, share);
    }
    if (card && card.classList) card.classList.add("ec-headon");
    var ov = document.getElementById("overlay");
    if (ov) ov.classList.add("trail-full");
    fitBoard(head);
    window.addEventListener("resize", function again() { if (!head.isConnected) { window.removeEventListener("resize", again); return; } fitBoard(head); });
  }
  function fitBoard(head) {
    head.style.setProperty("--ecfit", "1"); head.style.setProperty("--ecdy", "0px");
    var m = /matrix\(([^,]+),\s*([^,]+)/.exec(getComputedStyle(head).transform || ""), k = m ? Math.hypot(+m[1], +m[2]) || 1 : 1;
    var rc = head.getBoundingClientRect(), cy = (rc.top + rc.bottom) / 2, top = 0, bot = window.innerHeight;
    var map = head.closest && head.closest(".ec-map"), framed = map && window.matchMedia && window.matchMedia("(min-width: 700px)").matches;
    if (framed) {
      var fr = map.getBoundingClientRect(), z = head.offsetHeight ? rc.height / k / head.offsetHeight : 1;
      top = Math.max(top, fr.top + 8); bot = Math.min(bot, fr.bottom - 8);
      head.style.setProperty("--ecdy", ((top + bot) / 2 - cy) / (z || 1) + "px"); cy = (top + bot) / 2;
    }
    var h = rc.height / k, room = 2 * Math.min(cy - top, bot - cy) - 24;
    if (h > room && h > 0) head.style.setProperty("--ecfit", String(Math.max(0.5, room / h)));
  }
  function shareMenu(head, share) {
    var btn = document.createElement("button"), pop = document.createElement("div");
    btn.type = "button"; btn.className = "ec-sharebtn"; btn.textContent = "SHARE"; btn.setAttribute("aria-expanded", "false");
    pop.className = "ec-sharepop"; pop.hidden = true;
    function item(label, fn) { var b = document.createElement("button"); b.type = "button"; b.textContent = label; b.addEventListener("click", function () { fn(); close(); }); pop.appendChild(b); }
    function press(id) { var b = share.querySelector(id); if (b && !b.disabled) b.click(); }
    function close() { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); if (pop.parentNode === document.body && !document.body.contains(head)) pop.remove(); }
    item("DOWNLOAD IMAGE", function () { press("#btnDlImg"); });
    item("COPY IMAGE", function () { press("#btnCopyImg"); });
    item("SHARE TO X", function () {
      var text = "I escaped " + (L && L.title ? L.title : "a level") + " in Bitfoot: The Hunt.";
      window.open("https://x.com/intent/post?text=" + encodeURIComponent(text), "_blank", "noopener");
    });
    function place() {
      var hr = head.getBoundingClientRect(), br = btn.getBoundingClientRect();
      [].forEach.call(document.querySelectorAll(".trail > .ec-sharepop"), function (o) { if (o !== pop) o.remove(); });
      document.body.appendChild(pop); pop.style.left = "-9999px"; pop.style.top = "0px";
      if (hr.right + 12 + pop.offsetWidth <= window.innerWidth - 8) { pop.style.left = Math.round(hr.right + 12) + "px"; pop.style.top = Math.round(br.top) + "px"; return; }
      if (hr.top - 8 - pop.offsetHeight >= 8) { pop.style.left = Math.round(Math.max(8, br.right - pop.offsetWidth)) + "px"; pop.style.top = Math.round(hr.top - 8 - pop.offsetHeight) + "px"; return; }
      pop.style.left = pop.style.top = ""; head.appendChild(pop);
    }
    btn.addEventListener("click", function (e) { e.stopPropagation(); pop.hidden = !pop.hidden; if (!pop.hidden) place(); btn.setAttribute("aria-expanded", String(!pop.hidden)); });
    function onClick(e) { if (!head.isConnected) { drop(); return; } if (!pop.hidden && !pop.contains(e.target)) close(); }
    function onResize() { if (!head.isConnected) { drop(); return; } close(); }
    function drop() { window.removeEventListener("resize", onResize); document.removeEventListener("click", onClick); close(); }
    window.addEventListener("resize", onResize);
    document.addEventListener("click", onClick);
    head.appendChild(btn); head.appendChild(pop);
  }
  function reveal() {
    var head = document.querySelector(".overlay.complete .ec-onmap");
    if (!head || head.classList.contains("show")) return;
    head.classList.add("show");
    fitBoard(head); setTimeout(function () { if (head.isConnected) fitBoard(head); }, 450);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (head.isConnected) fitBoard(head); });
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    if (reduce || !head.animate) return;
    var rise = [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }];
    var stamp = [{ opacity: 0, transform: "scale(2.4) rotate(-14deg)" }, { opacity: 1, transform: "scale(.92) rotate(2deg)", offset: 0.7 }, { opacity: 1, transform: "none" }];
    revealAnims = [];
    var go = function (el, kf, at, ms) { if (el) revealAnims.push(el.animate(kf, { duration: ms || 400, delay: at, easing: "ease-out", fill: "both" })); };
    go(head.querySelector(".ec-word"), rise, 0, 450);
    Array.prototype.forEach.call(head.querySelectorAll(".medal"), function (m, i) { go(m, stamp, 450 + i * 300, 500); });
    if (getComputedStyle(head).position === "absolute") go(head, [{ opacity: 0, transform: "translate(-50%, -50%) scale(.85)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1.03)", offset: 0.7 }, { opacity: 1, transform: "translate(-50%, -50%)" }], 0, 380);
    Array.prototype.forEach.call(head.querySelectorAll(".ec-praise"), function (p) { go(p, rise, 1500); });
    go(head.querySelector(".ec-zec"), stamp, 1500, 500);
    Array.prototype.forEach.call(head.querySelectorAll(".ec-chip"), function (c, i) { go(c, rise, 1800 + i * 120, 300); });
    go(head.querySelector(".ec-line"), rise, 1800);
    go(head.querySelector(".ec-q"), rise, 1950);
    go(document.getElementById("btnNext"), rise, 2050);
    go(head.querySelector(".ec-links"), rise, 2250);
  }
  window.paintEndMap = function () {
    var cv = document.getElementById("ecMap"), all = prints, n = all ? all.length : 0, reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    if (cv && replay.cv !== cv) { replay.pose = null; dock(); }
    if (!cv || replay.cv === cv || n < 2 || reduce) { if (replay.cv !== cv) reveal(); if (replay.cv !== cv || !replay.on) return basePaint.apply(this, arguments); return; }
    replay.cv = cv; replay.on = true;
    var id = ++replay.id, D = Math.max(1.6, Math.min(3.6, n * 0.03)) * 1000, t0 = null, el = S ? S.elders || [] : [];
    var keep = function (o, ks) { var r = {}; ks.forEach(function (k) { r[k] = o[k]; }); return r; };
    var P = keep(player, ["x", "y", "dir", "anim", "animT0", "inShield"]), E = el.map(function (e) { return keep(e, ["x", "y", "dir", "anim", "t0"]); });
    var put = function (o, p, a, walk, t) { o.x = p.x; o.y = p.y; if (p.a != null) o.dir = Math.cos(p.a) < 0 ? "left" : "right"; o.anim = walk ? "walk" : "idle"; o[a] = simTime - t; };
    var PR = S && S.prec && S.prec.length > 1 ? S.prec : null, path = PR || all, np = path.length;
    var stepAt = function (k) {
      var p = path[k]; if (!PR) return p;
      var q = path[Math.min(np - 1, k + 1)], dx = q.x - p.x;
      return { x: p.x, y: p.y, a: Math.abs(dx) > 0.5 ? (dx < 0 ? Math.PI : 0) : null };
    };
    var GAP = PR ? 7 : 5, IN = 4, lag = el.length * GAP + IN;
    var home = dens ? { x: dens.x, y: dens.y } : { x: path[np - 1].x, y: path[np - 1].y };
    var door = { x: home.x, y: home.y + T * 0.55 };
    var spot = function (i) { return i < 0 ? door : { x: door.x + (i ? 1 : -1) * T * 0.75, y: door.y }; };
    var at = function (o, i, j, a, t) {
      if (j < np - 1) return put(o, stepAt(Math.max(0, Math.floor(j))), a, true, t);
      var q = Math.min(1, (j - (np - 1)) / IN), e = path[np - 1], s = spot(i);
      put(o, { x: e.x + (s.x - e.x) * q, y: e.y + (s.y - e.y) * q, a: Math.atan2(s.y - e.y, s.x - e.x) }, a, q < 1, t);
      if (q >= 1 && i >= 0) o.dir = i ? "left" : "right";
    };
    var RATE = (np - 1 + lag) / (D / 1000), HR = S && S.hrec && S.hrec.length ? S.hrec : null, HS = HR ? hunters.map(function (h) { return { x: h.x, y: h.y, dir: h.dir, step: h.step, fg: h.fg, state: h.state }; }) : [];
    var CT = S && S.ctime ? S.ctime : [], CS = typeof coins !== "undefined" && coins ? coins : [];
    var poseCoins = function (tp) { CS.forEach(function (c, i) { if (CT[i] == null) return; c._rg = c.got; c._rl = c.locked; c.got = CT[i] <= tp; c.locked = false; }); };
    var unposeCoins = function () { CS.forEach(function (c) { if (c._rg !== undefined) { c.got = c._rg; c.locked = c._rl; delete c._rg; delete c._rl; } }); };
    var GR = S && S.grec ? S.grec : [], PS = S && S.posts ? S.posts : null, PK = PS ? Object.keys(PS) : [];
    var poseGates = function (tp) {
      var dirty = false;
      GR.forEach(function (r) { var want = tp < r.t ? "H" : "J"; r.tiles.forEach(function (q) { if (grid[q[1]] && grid[q[1]][q[0]] !== want) { grid[q[1]][q[0]] = want; dirty = true; } }); });
      if (dirty && typeof bakeLevel === "function") bakeLevel();
    };
    var posePosts = function (tp) {
      if (!PS) return;
      var shown = {};
      PK.forEach(function (k) { var q = PS[k]; if (q._t0 === undefined) q._t0 = q.t0; if (tp >= q._t0) { q.t0 = simTime - (tp - q._t0); shown[k] = q; } });
      S.posts = shown;
    };
    var hold = null, heldK = {}, gTp = -Infinity;
    var unposePosts = function () { if (!PS) return; PK.forEach(function (k) { var q = PS[k]; if (q._t0 !== undefined) { q.t0 = q._t0; delete q._t0; } }); S.posts = PS; };
    var ti = function (p) { return (p.rt != null ? p.rt : p.t) || 0; };
    var tAt = function (j) { var i = Math.max(0, Math.min(np - 1, Math.floor(j))), k = Math.min(np - 1, i + 1), f = Math.max(0, Math.min(1, j - i)); return ti(path[i]) + (ti(path[k]) - ti(path[i])) * f; };
    var poseHunters = function (tp) {
      var lo = 0, hi = HR.length - 1;
      while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (HR[mid].t <= tp) lo = mid; else hi = mid - 1; }
      var a = HR[lo], b = HR[Math.min(HR.length - 1, lo + 1)], f = b.t > a.t ? Math.max(0, Math.min(1, (tp - a.t) / (b.t - a.t))) : 0;
      hunters.forEach(function (h, i) { var p = a.p[i], q = b.p[i] || p; if (!p) return; h.x = p[0] + (q[0] - p[0]) * f; h.y = p[1] + (q[1] - p[1]) * f; h.dir = p[2]; h.step = tp * 12;
        if (p[3] != null && p[3] >= 0) { var w = p[3] + ((q[3] >= 0 ? q[3] : p[3]) - p[3]) * f; h.fg = { mode: "sleep", wake: w, shown: w, t0: 0 }; h.state = "sleep"; } else if (p[3] != null) h.fg = null; });
    };
    function frame(now) {
      if (id !== replay.id || !cv.isConnected) { replay.on = false; return; }
      if (t0 == null) t0 = now;
      if (replay.skip) { replay.skip = false; hold = null; t0 = now - (np - 1 + lag) / RATE * 1000; }
      var t = (now - t0) / 1000, m = Math.min(np - 1 + lag, RATE * t), done = m >= np - 1 + lag;
      if (hold && now - hold.at >= 1000) hold = null;
      if (!hold && !done) PK.forEach(function (k) { var q = PS[k], pt = q._t0 !== undefined ? q._t0 : q.t0; if (!heldK[k] && tAt(m) >= pt) { heldK[k] = true; hold = { at: now, m: m, tp: pt }; } });
      if (hold) { m = hold.m; t0 = now - m / RATE * 1000; }
      var tp = done ? Infinity : Math.max(gTp, hold ? hold.tp + (now - hold.at) / 1000 : tAt(m)); gTp = tp;
      if (PR) { var tn = done ? Infinity : tAt(m); prints = all.filter(function (p) { return ti(p) <= tn; }); }
      else prints = all.slice(0, Math.max(1, Math.min(n, Math.floor(m) + 1)));
      at(player, -1, m, "animT0", t);
      el.forEach(function (e, i) { at(e, i, m - (i + 1) * GAP, "t0", t); });
      player.inShield = !!(PR && m < np - 1 && path[Math.max(0, Math.floor(m))].w);
      if (HR) poseHunters(tAt(m));
      if (BH.funSecrets && BH.funSecrets.pose) BH.funSecrets.pose(done ? Infinity : tAt(m));
      if (BH.edge && BH.edge.pose) BH.edge.pose(done ? Infinity : tAt(m));
      if (BH.bank && BH.bank.pose) BH.bank.pose(done || !PR || m >= np - 1 ? Infinity : ti(path[Math.max(0, Math.floor(m))]));
      poseCoins(done ? Infinity : tAt(m));
      poseGates(tp); posePosts(tp);
      if (done) replay.pose = [player].concat(el).map(function (o) { return { o: o, v: keep(o, ["x", "y", "dir", "anim", "animT0", "t0", "inShield"]) }; });
      try { basePaint(); } finally {
        prints = all;
        Object.keys(P).forEach(function (q) { player[q] = P[q]; });
        el.forEach(function (e, i) { Object.keys(E[i]).forEach(function (q) { e[q] = E[i][q]; }); });
        HS.forEach(function (v, i) { var h = hunters[i]; if (h) { h.x = v.x; h.y = v.y; h.dir = v.dir; h.step = v.step; h.fg = v.fg; h.state = v.state; } });
        if (BH.funSecrets && BH.funSecrets.unpose) BH.funSecrets.unpose();
        if (BH.edge && BH.edge.unpose) BH.edge.unpose();
        if (BH.bank && BH.bank.unpose) BH.bank.unpose();
        unposeCoins(); unposePosts();
      }
      if (!done) requestAnimationFrame(frame); else { replay.on = false; basePaint(); reveal(); }
    }
    frame(typeof performance !== "undefined" ? performance.now() : 0);
  };
  window.addEventListener("keydown", function (e) {
    if (game.screen !== "complete" || (e.key !== "Enter" && e.key !== " ")) return;
    var playing = revealAnims.filter(function (a) { return a.playState !== "finished"; });
    if (!replay.on && !playing.length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat) return;
    if (replay.on) replay.skip = true;
    else playing.forEach(function (a) { try { a.finish(); } catch (err) {} });
  }, true);
  var baseLesson = window.endLesson;
  window.endLesson = function () {
    var f = levelCopy(game.levelIdx + 1);
    var term = ((window.LEVELS || [])[game.levelIdx] || {}).term || "";
    if (f && f.lesson) return { line: f.lesson, small: f.dev || "", term: term, k: "trail" };
    return baseLesson();
  };
  var baseComplete = window.showComplete;
  if (typeof baseComplete === "function") window.showComplete = function () {
    var out = baseComplete.apply(this, arguments);
    endQuestion();
    return out;
  };
  var ENDQ = {
    steps: ["WHO CAN TAKE THE COINS IN YOUR WALLET?", "ANYONE WITH MY 24 WORDS", "ONLY ME, NO MATTER WHAT", "ANYONE WITH YOUR 24 WORDS CAN TAKE THEM."],
    machine: ["WHO APPROVED YOUR PAYMENT TO THE POST?", "ME, BY SIGNING IT", "THE POST, BY TAKING IT", "YOU DID. YOU SIGNED IT."],
    wise: ["HOW LONG CAN SOMEONE FOLLOW YOUR FOOTPRINTS ON LAND?", "FOREVER", "UNTIL I REACH THE DEN", "FOREVER. LAND FOOTPRINTS STAY ON THE RECORD."],
    bank: ["YOU JUMPED IN WITH 5 COINS. WHAT DID THE SHORE SEE?", "WHERE I WENT IN, AND 5 COINS", "NOTHING AT ALL", "THE SHORE SAW WHERE YOU WENT IN, AND THAT YOU BROUGHT 5."],
    inriver: ["YOU PAID THE MERCHANT INSIDE THE WATERS. WHAT DID THE SHORE SEE?", "ONLY A RIPPLE", "WHO PAID AND HOW MUCH", "ONLY A RIPPLE. THE NOTE IS SEALED: NO NAMES, NO AMOUNT."],
    doors: ["YOU HAVE COINS ON ADDRESS A AND ADDRESS B. HOW DO YOU SHIELD THEM?", "ON TWO SEPARATE TRIPS", "BOTH IN ONE TRIP", "SEPARATE TRIPS. CARRY A AND B IN TOGETHER AND THE WATCHER KNOWS ONE PERSON OWNS BOTH."],
    glasskey: ["THE SCAM STALL HAS YOUR GLASS KEY. WHAT CAN IT DO?", "SEE MY TRIPS IN THE WATERS, NEVER TAKE A COIN", "TAKE MY COINS", "IT SEES YOUR TRIPS IN THE WATERS. IT CAN NEVER TAKE A COIN.", "RIGHT. AND YOU CAN'T TAKE THE KEY BACK."],
    mail: ["HOW DO YOU FIND YOUR OWN MAIL?", "I TRY MY KEY ON EVERY ENVELOPE", "THE POST OFFICE TELLS ME WHICH ARE MINE", "YOU TRY YOUR KEY ON EVERY ENVELOPE. THE POST OFFICE NEVER KNOWS."],
    campfire: ["A STRANGER AT THE FIRE ASKS FOR YOUR WORDS. WHO SHOULD GET THEM?", "NOBODY", "ANYONE WHO SAYS THEY CAN HELP", "NOBODY. WHOEVER HAS YOUR WORDS HAS YOUR COINS."],
    together: ["HOW DO YOU PAY SOMEONE SO THE SHORE SEES NO AMOUNT?", "PAY THEM INSIDE THE WATERS", "CLIMB OUT, PAY, JUMP BACK IN", "PAY INSIDE THE WATERS. CLIMBING OUT SHOWS THE AMOUNT."],
    dam: ["THE OLD WATERS ARE SEALED. CAN A COIN STILL GO INTO THEM?", "NO, COINS CAN ONLY LEAVE IT", "YES, IF I PAY A FEE", "NO. COINS CAN ONLY LEAVE THE OLD WATERS."],
    bonus1: ["A STRANGER DROPPED TINY COINS IN YOUR WALLET. WHAT DO THEY WANT?", "TO SEE WHEN I SPEND THEM", "TO GIVE ME A GIFT", "THEY WANT TO SEE WHEN YOU SPEND THEM."],
    bonus2: ["THE EXCHANGE DESK ONLY TAKES PUBLIC COINS. CAN YOU PAY IT FROM THE WATERS?", "NO, I CLIMB OUT FIRST", "YES, STRAIGHT FROM THE WATERS", "NO. YOU CLIMB OUT FIRST, AND THAT WALK IS PUBLIC."],
    bonus3: ["A LYING POST OFFICE HID SOME MAIL. CAN IT TAKE YOUR COINS?", "NO, IT CAN ONLY LIE ABOUT THEM", "YES, IT HOLDS MY MAIL", "NO. IT CAN HIDE MAIL, NEVER TAKE A COIN."]
  };
  BH.trailEndQ = ENDQ;
  function endQuestion() {
    var q = ENDQ[L && L.tid], side = document.querySelector(".endcard .ec-side");
    if (!q || !side || document.querySelector(".endcard .ec-q")) return;
    var box = document.createElement("div"); box.className = "ec-q"; box.setAttribute("data-tid", L.tid);
    var ask = document.createElement("p"); ask.className = "ec-q-ask"; ask.textContent = q[0]; box.appendChild(ask);
    var row = document.createElement("div"); row.className = "ec-q-row"; box.appendChild(row);
    var say = document.createElement("p"); say.className = "ec-q-say"; say.setAttribute("aria-live", "polite"); box.appendChild(say);
    var opts = [[q[1], true], [q[2], false]];
    if (Math.random() < 0.5) opts.reverse();
    opts.forEach(function (o) {
      var b = document.createElement("button"); b.className = "ec-q-a"; b.textContent = o[0]; b.setAttribute("data-ok", o[1] ? "1" : "0");
      b.addEventListener("click", function () {
        if (box.className.indexOf("done") >= 0) return;
        box.className += " done " + (o[1] ? "is-ok" : "is-no"); b.className += " picked";
        say.textContent = o[1] ? (q[4] || "RIGHT.") : q[3];
      });
      row.appendChild(b);
    });
    var head = document.querySelector(".overlay.complete .ec-onmap"), nx = document.getElementById("btnNext");
    if (head && nx && nx.parentNode === head) { head.insertBefore(box, nx); return; }
    var at = side.querySelector(".ec-res");
    side.insertBefore(box, at || side.firstChild);
  }

  var ENDINGS = [
    { id: "safe", title: "SAFE", line: "You paid privately inside the waters. The shore only saw what you shielded." },
    { id: "exposed", title: "EXPOSED", line: "You made it. The shore saw some of it." },
    { id: "found", title: "FOUND", line: "Three red lines. The watcher tied it all back to you." },
    { id: "robbed", title: "ROBBED", line: "You read out your 24 words. Whoever has the words has the coins." }
  ];
  function pastRiverPay() { var i = window.trailIndexOf ? window.trailIndexOf("inriver") : -1; return i >= 0 && game.levelIdx > i; }
  function redCount() { return BH.bank && BH.bank.redLines ? BH.bank.redLines() | 0 : 0; }
  function storyRed() { return L && L.tid === "together" ? redCount() : TR().gRed | 0; }
  function endingId() { return storyRed() > 0 ? "exposed" : "safe"; }
  function endingSeen(id) { var t = TR(); t.endings = t.endings || {}; t.endings[id] = true; persist(); }
  var baseFinale = window.showFinale;
  window.showFinale = function () {
    var cur = (window.LEVELS || [])[game.levelIdx];
    if (cur && !cur.finale && typeof baseFinale === "function" && window.trailIndexOf && game.levelIdx > window.trailIndexOf("together")) return baseFinale.apply(this, arguments);
    game.screen = "finale";
    var id = endingId(), e = ENDINGS.filter(function (x) { return x.id === id; })[0], t = TR();
    t.endings = t.endings || {}; t.endings[id] = true; persist();
    if (BH.prequelEnd && BH.prequelEnd.play) { BH.prequelEnd.play({ onAgain: function () { var keep = TR().endings; save.trail = { endings: keep }; persist(); startLevel(0); }, onMap: showSelect }); return; }
    var others = ENDINGS.map(function (x) { var got = !!t.endings[x.id]; return '<li class="' + (got ? "got" : "") + (x.id === id ? " now" : "") + '"><b>' + esc(got ? x.title : "???") + '</b><span>' + esc(got ? x.line : "Not found yet.") + '</span></li>'; }).join("");
    showOverlay("finale complete",
      '<div class="trail-end">' +
      '<div class="hero big" id="finaleSprite"></div>' +
      '<div class="ec-word"><span>' + esc(e.title) + '</span></div>' +
      '<p class="te-line">' + esc(e.line) + '</p>' +
      '<p class="te-stats">RED LINES ' + storyRed() + ' / 3</p>' +
      '<p class="te-head">ENDINGS FOUND</p><ul class="te-endings">' + others + '</ul>' +
      '<div class="te-actions"><button id="finAgain" class="ec-primary">PLAY AGAIN</button><button id="finLevels" class="te-link">WORLD MAP</button></div>' +
      '<details class="dev"><summary>For developers</summary><p>' + esc((levelCopy(game.levelIdx + 1) || {}).dev || "") + '</p></details></div>');
    bind("finLevels", showSelect);
    bind("finAgain", function () { var keep = TR().endings; save.trail = { endings: keep }; persist(); startLevel(0); });
    if (typeof mountHero === "function") mountHero("finaleSprite", "celebrate");
  };
})();
