"use strict";

function ensureSave() {
  if (!save || typeof save !== "object") return;
  var obj = function (v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; };
  save.stars = obj(save.stars); save.best = obj(save.best); save.up = obj(save.up);
  save.inv = obj(save.inv); save.badges = obj(save.badges);
  if (!Array.isArray(save.loadout)) save.loadout = [];
  save.cos = obj(save.cos); save.cos.owned = obj(save.cos.owned);
  if (typeof save.wallet !== "number" || !(save.wallet >= 0)) save.wallet = +save.wallet > 0 ? +save.wallet : 0;
}
ensureSave();

var uiMuted = false;

function touchUi() {
  var m = window.BH_INPUT_MODE;
  return m ? m === "touch" : !!TOUCH;
}
window.touchUi = touchUi;
window.addEventListener("bh-input-mode", function () {
  if (typeof game === "object" && game.screen === "play" && typeof L === "object" && L) updateStrip();
});

function updateStrip() {
  if (!stripEl) return;
  if (decoyBtn) { decoyBtn.className = L && L.decoys ? "on" : ""; decoyBtn.textContent = "DECOY ×" + (player ? player.decoys : 0); }
  var touchNow = touchUi();
  if (sprintBtn) sprintBtn.className = touchNow && L && L.sprint ? "on" + (L.decoys ? " above" : "") : "";
  if (touchNow) { stripEl.className = "strip"; stripEl.innerHTML = ""; return; }
  var w = function (t) { return ' <span class="w">' + t + '</span>'; };
  var kb = BH.binds;
  var parts = ["<b>" + esc(kb.walkName()) + "</b>" + w("move")];
  if (L.sprint) parts.push("<b>" + esc(kb.name("sprint")) + "</b>" + w("sprint"));
  if (L.decoys) parts.push("<b>" + esc(kb.name("decoy")) + "</b>" + w("decoy ×" + player.decoys));
  var r = BH.items && BH.items.run ? BH.items.run() : null;
  if (r) r.carried.forEach(function (id) { var d = BH.items.get(id); if (d && d.key) parts.push("<b>" + esc(d.key.toUpperCase()) + "</b>" + w(esc((d.word || d.name).toLowerCase()))); });
  parts.push("<b>ESC</b>" + w("pause"));
  stripEl.innerHTML = parts.join('<span class="dot">·</span>');
  if (stripRun !== game.levelIdx) {
    stripRun = game.levelIdx; stripMini = (window.innerWidth || 1440) * hudZoom() < 700; if (stripTimer) clearTimeout(stripTimer);
    var run = stripRun;
    stripTimer = setTimeout(function () { if (stripRun === run && game.screen === "play") { stripMini = true; stripEl.style.top = ""; stripEl.className = "strip on mini"; } }, STRIP_FULL_MS);
  }
  stripEl.className = "strip on " + (stripMini ? "mini" : "fresh");
  if (!stripMini) requestAnimationFrame(placeStrip);
}
function placeStrip() {
  if (!stripEl || stripMini || !stripEl.style) return;
  var top = 72;
  try { if (goalEl && goalEl.className.indexOf("on") >= 0 && goalEl.getBoundingClientRect) { var b = goalEl.getBoundingClientRect(); if (b.height) top = Math.round(b.bottom + 8); } } catch (e) {}
  stripEl.style.top = top + "px";
}
var stripRun = null, stripMini = false, stripTimer = null, STRIP_FULL_MS = 7000;
function stripForget() { stripRun = null; stripMini = false; if (stripTimer) clearTimeout(stripTimer); stripTimer = null; }

var TRAIL_RESCUE_GIFT = 2;
function trailCoinsGross(lv) {
  lv = lv || (typeof L === "object" ? L : null);
  if (!lv || !lv.map) return 0;
  var n = lv.startCarry || 0;
  lv.map.forEach(function (row) { for (var i = 0; i < row.length; i++) if (row[i] === "c") n++; });
  (lv.npcs || []).forEach(function (d) { if (d && d.pays) n += d.pays; });
  if (lv.funrescue) n += TRAIL_RESCUE_GIFT;
  return n;
}
function trailSpentNow() { return typeof window.trailSpent === "function" ? +window.trailSpent() || 0 : 0; }
window.trailCoinsGross = trailCoinsGross;
window.trailCoinTotal = function () { return trailCoinsGross() - trailSpentNow(); };
function hudZecLine(have, total, need) {
  var met = (window.trailDenCount ? window.trailDenCount() : have) >= need;
  total = Math.max(have, window.trailCoinTotal());
  if (!total && !need) return { main: "NO COINS HERE", need: "", met: true };
  return { main: have + " of " + total + " ZEC", need: met ? "NEED " + need + " ✓" : "NEED " + need, met: met };
}
function trailCardState(r) {
  var S = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state;
  if (r.spent == null) {
    r.spent = trailSpentNow(); r.gross = trailCoinsGross();
    r.grid = grid.map(function (row) { return row.join(""); });
    r.hunters = hunters.map(function (h) { return [Math.round(h.x), Math.round(h.y), h.dir || 0]; });
    r.posts = {};
    if (S && S.posts) Object.keys(S.posts).forEach(function (k) {
      var q = S.posts[k]; r.posts[k] = { key: q.key, x: q.x, y: q.y, water: !!q.water, n: q.n, from: q.from };
    });
    return;
  }
  if (Array.isArray(r.grid)) r.grid.forEach(function (row, y) {
    for (var x = 0; x < row.length; x++) if (grid[y] && grid[y][x] != null && grid[y][x] !== row[x]) featureApi.setTile(x, y, row[x]);
  });
  if (Array.isArray(r.hunters)) r.hunters.forEach(function (p, i) { var h = hunters[i]; if (h && p) { h.x = p[0]; h.y = p[1]; h.dir = p[2]; h.state = "patrol"; } });
  if (S && r.posts && !Object.keys(S.posts || {}).length) {
    S.posts = S.posts || {};
    Object.keys(r.posts).forEach(function (k) { var q = r.posts[k]; S.posts[k] = { key: q.key, x: q.x, y: q.y, water: q.water, n: q.n, from: q.from, t0: simTime - 60, opened: true }; });
    if (S.done) S.done.machine = true;
  }
}
function hudZoom() { return typeof trailZoom === "number" && trailZoom > 0 ? trailZoom : 1; }
function drawHud() {
  var hz = hudZoom();
  if (hz === 1) return drawHud1(W);
  ctx.save(); ctx.scale(1 / hz, 1 / hz);
  try { drawHud1(W * hz); } finally { ctx.restore(); }
}
function drawHud1(W) {
  updateCarry();
  if (game.screen === "title" || game.screen === "select" || !L) return;
  var pad = 16, cond = "'Plex Cond', sans-serif";
  ctx.textBaseline = "middle";
  if (!L.hud) {
  ctx.fillStyle = C.gold; ctx.fillRect(pad, pad + 2, 12, 12);
  ctx.fillStyle = "#1c1c1c"; ctx.fillRect(pad + 3, pad + 4, 6, 2); ctx.fillRect(pad + 5, pad + 6, 2, 4); ctx.fillRect(pad + 3, pad + 10, 6, 2);
  ctx.fillStyle = C.gold; ctx.textAlign = "left"; ctx.font = "600 16px " + cond;
  var hl = hudZecLine(banked(), typeof caveCoinTotal === "function" ? caveCoinTotal() : (coins ? coins.length : 0), L.need);
  ctx.fillText(hl.main, pad + 20, pad + 8);
  var mw = ctx.measureText(hl.main).width || 0;
  ctx.font = "500 12px " + cond; ctx.letterSpacing = "0.72px";
  var nx = pad + 20 + mw + 10;
  if (!hl.met) {
    var nw = ctx.measureText(hl.need).width || 0;
    ctx.fillStyle = HOSTILE_RED; ctx.fillRect(nx - 5, pad, nw + 10, 17);
    ctx.fillStyle = C.ink;
  } else ctx.fillStyle = C.gold;
  ctx.fillText(hl.need, nx, pad + 9);
  ctx.letterSpacing = "0px";
  ctx.font = "500 12px " + cond; ctx.letterSpacing = "0.72px"; ctx.fillStyle = "rgba(255,250,240,0.6)";
  ctx.fillText(player.score + " PTS" + (player.combo > 1 ? "  ×" + player.combo : ""), pad + 20, pad + 28);
  if (player.stash) ctx.fillText(player.stash + " ZEC IN THE DEN", pad + 20, pad + 44);
  if (BH.hudMedals && game.screen === "play") BH.hudMedals.draw(ctx, pad, pad + (player.stash ? 56 : 40));
  }
  else { ctx.font = "500 12px " + cond; ctx.letterSpacing = "0.72px"; }
  ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,250,240,0.7)";
  ctx.fillText(L.hud ? (W < 600 ? L.hud.split(" · ")[0] : L.hud) : (W < 600 ? "L" + lvLabel(game.levelIdx + 1) : "LEVEL " + lvLabel(game.levelIdx + 1) + " · " + L.title), W - 84, pad + 8);
  ctx.letterSpacing = "0px";
}
function drawJoy() {
  if (!joy.active) return;
  var dx = joy.x - joy.ox, dy = joy.y - joy.oy, l = Math.hypot(dx, dy), m = Math.min(l, JOY_R), sp = joyMag(l);
  ctx.fillStyle = "rgba(27,27,27,0.35)"; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_R, 0, 6.283); ctx.fill();
  ctx.strokeStyle = "rgba(255,250,240,0.28)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_R, 0, 6.283); ctx.stroke();
  if (sp) { ctx.strokeStyle = "rgba(234,186,73,0.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_R + 4, -1.5708, -1.5708 + 6.283 * sp); ctx.stroke(); }
  ctx.fillStyle = sprintHeld ? "rgba(220,80,60,0.7)" : "rgba(234,186,73,0.65)"; ctx.beginPath(); ctx.arc(joy.ox + (l ? dx / l * m : 0), joy.oy + (l ? dy / l * m : 0), 18, 0, 6.283); ctx.fill();
}

var sprintBtn = document.getElementById("sprint");
if (sprintBtn) {
  var sprintOn = function (e) { e.preventDefault(); e.stopPropagation(); audioInit(); sprintHeld = true; sprintBtn.classList.add("held"); };
  var sprintOff = function () { sprintHeld = false; sprintBtn.classList.remove("held"); };
  sprintBtn.addEventListener("pointerdown", sprintOn);
  ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"].forEach(function (ev) { sprintBtn.addEventListener(ev, sprintOff); });
}

var ov = document.getElementById("overlay"), hudBtns = document.getElementById("hudbtns");
function hideOverlay() { ov.className = "overlay"; ov.innerHTML = ""; hudBtns.className = "hudbtns"; }
function showOverlay(cls, html) {
  ensureSave();
  ov.className = "overlay on " + cls; ov.innerHTML = html; ov.scrollTop = 0;
  var c0 = String(cls).split(" ")[0];
  if (c0 === "title" || c0 === "select" || c0 === "complete" || c0 === "finale") stripForget();
  hudBtns.className = "hudbtns" + (c0 === "pause" ? "" : c0 === "title" || c0 === "select" ? " menu" : " dim");
  if (stripEl) stripEl.className = "strip"; if (decoyBtn) decoyBtn.className = ""; if (sprintBtn) { sprintBtn.className = ""; sprintHeld = false; } if (goalEl) goalEl.className = "goal";
}
function bind(id, fn) {
  var el = document.getElementById(id);
  if (el) el.addEventListener("click", function (e) { e.stopPropagation(); audioInit(); sfx("click"); fn(e, el); });
  return el;
}
var lastHoverEl = null;
ov.addEventListener("mouseover", function (e) {
  var b = e.target.closest ? e.target.closest("button:not(:disabled), a, summary") : null;
  if (b && b !== lastHoverEl) sfx("hover");
  lastHoverEl = b;
});
function starStr(n) { var s = ""; for (var i = 0; i < 3; i++) s += '<span class="' + (i < n ? "on" : "") + '">★</span>'; return s; }
function linkHtml(kind, id) {
  var c = F.ctas[kind];
  return '<a class="tlink" id="' + id + '" href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.label) + ' <span aria-hidden="true">↗</span></a>';
}

var chainData = null, chainReq = null;
function loadChain() {
  if (chainReq) return chainReq;
  chainReq = fetch("/data/chain.json", { cache: "no-cache", credentials: "omit" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { chainData = j && j.shielded && j.shielded.shielded_zec ? j : null; return chainData; }, function () { return null; });
  return chainReq;
}
function fmtZec(z) { return z >= 1e6 ? (z / 1e6).toFixed(2) + "M" : z >= 1e3 ? Math.round(z / 1e3) + "K" : String(Math.round(z)); }
function fmtDay(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }); }
function birthdayLine() {
  var now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (y !== 2026) return "";
  if (m === 9 && d === 28) return "Zcash turns 10 today.";
  if (m < 9 || (m === 9 && d < 28)) return "Zcash turns 10 on Oct 28.";
  return "";
}
function mountShield(id) {
  var host = document.getElementById(id); if (!host) return;
  loadChain().then(function (j) {
    if (!host.isConnected || !j) { host.className = "shield-line off"; return; }
    var s = j.shielded, line = document.createElement("p"), attr = document.createElement("a"), bday = birthdayLine();
    line.className = "sl-main";
    line.textContent = fmtZec(s.shielded_zec) + " ZEC (" + (+s.shielded_pct).toFixed(1) + "% of all ZEC) was hiding in the shield on " + fmtDay(s.as_of || j.fetched_at) + "." + (bday ? " " + bday : "");
    attr.className = "sl-attr"; attr.href = "https://zecstats.org"; attr.target = "_blank"; attr.rel = "noopener";
    attr.textContent = (j.attribution && j.attribution.zecstats) || "Data: ZecStats (https://zecstats.org), CC BY 4.0";
    attr.addEventListener("click", function (e) { e.stopPropagation(); });
    host.textContent = ""; host.appendChild(line); host.appendChild(attr); host.className = "shield-line on";
  });
}
function musicCreditHtml() {
  var c = BH.audio && BH.audio.credit;
  return c ? '<p class="music-credit"><a class="sl-attr" href="' + esc(c.href) + '" target="_blank" rel="noopener">' + esc(c.text) + '</a></p>' : "";
}
function receiptHtml(id) { return BH.receipt && BH.receipt.render ? '<div class="receipt" id="' + id + '"></div>' : ""; }
function mountReceipt(id) {
  var host = document.getElementById(id); if (!host || !BH.receipt) return;
  try { BH.receipt.render(host); } catch (e) { host.textContent = ""; }
}

function showTitle() {
  game.screen = "title"; ov.onclick = null;
  if (BH.landing && BH.landing.show) { BH.landing.show(); return; }
  if (BH.router) BH.router.at("menu");
  showOverlay("title",
    '<img class="logo" src="assets/ui/logo.svg" alt="BitFoots">' +
    '<div class="hero" id="heroSprite"></div>' +
    '<div class="name">' + esc(window.GAME_NAME || "THE HUNT") + '</div>' +
    '<p class="line">' + esc(F.finale) + '</p>' +
    '<div class="cta-hint">PRESS ANY KEY <span class="or">·</span> TAP</div>' +
    '<div class="shield-line" id="titleShield"></div>');
  mountHero("heroSprite", "walk");
  mountShield("titleShield");
  ov.onclick = function () { audioInit(); if (game.screen === "title") { sfx("click"); showSelect(); } };
}

var MEDALS = [["home", "Reached the den"], ["par", "Under par"], ["unseen", "Never seen"]];
function medalsHtml(n) {
  var m = save.medals && save.medals[n], st = save.stars[n] || 0, s = "", label = [];
  for (var i = 0; i < 3; i++) {
    var on = m ? !!m[MEDALS[i][0]] : i < st;
    if (m) label.push(MEDALS[i][1] + (on ? " ✓" : " ✗"));
    s += '<span class="' + (on ? "on" : "") + '">★</span>';
  }
  return '<span class="st" aria-label="' + (m ? esc(label.join(", ")) : st + " of 3 stars") + '">' + s + '</span>';
}
function showSelect() {
  game.screen = "select"; ov.onclick = null; ensureSave();
  if (BH.worldmap && BH.worldmap.show) { BH.worldmap.show(); return; }
  if (BH.router) BH.router.at("map");
  var u = unlockedUpTo(), html = '<div class="sel">' +
    '<div class="selhead"><div class="seltitle">CHOOSE A LEVEL</div>' +
    '<div class="selwallet"><span class="num">' + save.wallet + ' ZEC</span> saved<button class="tlink big" id="selShop">WARDROBE</button></div></div>' +
    feeLine("carry-line");
  F.acts.forEach(function (act, ai) {
    var tiles = "";
    LV.forEach(function (lv, i) {
      if ((lv.bonus ? F.acts.length - 1 : lv.act) !== ai) return;
      var n = i + 1, locked = n > u, done = save.stars[n] != null;
      tiles += '<button class="tile' + (locked ? " locked" : "") + (done ? " done" : "") + '" data-level="' + n + '"' + (locked ? " disabled" : "") + '>' +
        '<span class="num">' + n + '</span><span class="tt">' + esc(lv.title) + '</span>' +
        (locked ? '<span class="lk">LOCKED</span>' : medalsHtml(n)) +
        (save.best[n] ? '<span class="bt">BEST ' + fmtTime(save.best[n]) + '</span>' : '') + '</button>';
    });
    if (tiles) html += '<div class="act"><div class="actname">ACT ' + (ai + 1) + ' · ' + esc(act) + '</div><div class="tiles">' + tiles + '</div></div>';
  });
  html += '<div class="cta-hint">ENTER <span class="or">·</span> PLAY LEVEL ' + lvLabel(nextLevelIdx() + 1) + '</div></div>';
  showOverlay("select", html);
  Array.prototype.forEach.call(ov.querySelectorAll(".tile:not(.locked)"), function (b) {
    b.addEventListener("click", function (e) { e.stopPropagation(); audioInit(); sfx("click"); startLevel(+b.dataset.level - 1); });
  });
  bind("selShop", function () { showShop(function () { showSelect(); }); });
}

function carryApi() { return BH.items && typeof BH.items.shelves === "function" && typeof BH.items.loadout === "function" ? BH.items : null; }
function itemName(id) { var d = BH.items && BH.items.get(id); return d ? d.name : id; }
function currentLoadout() { var I = carryApi(); return I ? I.loadout() : []; }
function feeFor(n) { var I = carryApi(); return I && I.fee ? I.fee(n) : 0; }
function maxSlots() { var I = carryApi(); return I && I.MAX_SLOTS ? I.MAX_SLOTS : 2; }
function feeLine(cls) {
  var lo = currentLoadout(); if (!lo.length) return "";
  var f = feeFor(lo.length), names = esc(lo.map(itemName).join(" + "));
  return save.wallet >= f
    ? '<p class="' + cls + '">Carrying ' + names + ' · ' + f + ' ZEC entry fee, paid once when the level starts</p>'
    : '<p class="' + cls + ' warn">Packed ' + names + ', but the ' + f + ' ZEC entry fee is more than your ' + save.wallet + ' ZEC, so your items will stay home.</p>';
}
var afterShop = null, shopTab = "zcash";
var SHELVES = [["zcash", "Zcash items"], ["wardrobe", "Select Character"]];
function shopShelves() { return SHELVES.filter(function (s) { return s[0] !== "zcash" || !!(BH.items && BH.items.zcashShelf); }); }
var shopSel = { zcash: null, wardrobe: null }, shopFeeView = false, shopBought = null, shopSpent = 0;
function shopCards() { return Array.prototype.slice.call(ov.querySelectorAll(".sv3-row .sv3-card")); }
function showShop(then, keep) {
  var oldRow = keep ? ov.querySelector(".sv3-row") : null, x = oldRow ? oldRow.scrollLeft : 0, y = keep ? ov.scrollTop : 0;
  game.screen = "shop"; if (then !== undefined) afterShop = then || null; ensureSave();
  if (BH.items && BH.items.settle) BH.items.settle();
  if (!keep) shopFeeView = false;
  var tabs = shopShelves();
  if (!tabs.some(function (s) { return s[0] === shopTab; })) shopTab = tabs[0][0];
  if (!keep && BH.router) BH.router.at("wardrobe", shopTab === "zcash" ? "zcash-items" : null);
  var body = shopTab === "zcash" ? zcashShelf() : wardrobeShelf();
  var html = '<div class="shopworld"><canvas class="ld-forest shopforest" id="shopForest" aria-hidden="true"></canvas>' +
    '<div class="shopcard sv3 sv3-' + shopTab + '"><div class="sv3-bar">' +
    '<div class="shophead"><div class="sv3-sign"><span class="kicker">LOOKS</span><span class="word">SELECT CHARACTER</span></div></div>' +
    '<nav class="tabs" role="tablist">' + tabs.map(function (s) {
      return '<button role="tab" class="tab' + (shopTab === s[0] ? " on" : "") + '" aria-selected="' + (shopTab === s[0]) + '" data-tab="' + s[0] + '">' + s[1] + '</button>';
    }).join("") + '</nav>' +
    '<div class="selwallet purse" id="shopPurse" aria-label="Your purse: ' + save.wallet + ' ZEC saved"><span class="coinic" aria-hidden="true"></span><span class="num">' + save.wallet + '</span> ZEC</div></div>' +
    body + '<div class="actions"><button class="primary" id="shopDone">CONTINUE</button></div></div></div>';
  showOverlay("shop", html);
  if (BH.forest) BH.forest.start(document.getElementById("shopForest"));
  if (keep) ov.classList.add("still");
  var row = ov.querySelector(".sv3-row");
  ov.scrollTop = y;
  Array.prototype.forEach.call(ov.querySelectorAll(".tab"), function (b) {
    b.addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); shopTab = b.dataset.tab; showShop(); });
  });
  Array.prototype.forEach.call(ov.querySelectorAll("[data-buy]"), function (b) {
    b.addEventListener("click", function (e) { e.stopPropagation(); buy(b.dataset.buy); });
  });
  Array.prototype.forEach.call(ov.querySelectorAll("[data-pack]"), function (b) {
    b.addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); togglePack(b.dataset.pack); });
  });
  Array.prototype.forEach.call(ov.querySelectorAll("[data-cos]"), function (b) {
    var off = b.classList.contains("off");
    if (off) { b.style.filter = "grayscale(1)"; b.style.opacity = "0.45"; b.style.cursor = "default"; }
    b.addEventListener("click", function (e) { e.stopPropagation(); shopSel.wardrobe = b.dataset.cos; if (off) { sfx("click"); shopSelect(b.dataset.cos); return; } cosmeticClick(b.dataset.cos); });
    b.addEventListener("mouseenter", function () { previewLook(b.dataset.cos); });
    b.addEventListener("mouseleave", function () { previewLook(null); });
  });
  Array.prototype.forEach.call(ov.querySelectorAll("[data-char]"), function (b) {
    b.addEventListener("click", function (e) { e.stopPropagation(); shopSel.wardrobe = b.dataset.char; charClick(b.dataset.char); });
    b.addEventListener("mouseenter", function () { previewLook(b.dataset.char); });
    b.addEventListener("mouseleave", function () { previewLook(null); });
  });
  if (row) mountShelf(row, keep ? x : 0);
  if (shopTab === "wardrobe") mountWardrobe(); else mountStall();
  var fb = document.getElementById("shopFee");
  if (fb) fb.addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); shopFeeView = true; shopShowDetail(null); });
  shopFeedback();
  bind("shopDone", function () { nextFromComplete(); });
}
function srcLink(url) { return url ? ' <a class="src" href="' + esc(url) + '" target="_blank" rel="noopener">source ↗</a>' : ''; }
function shelfHtml(stall, top, cards, count) {
  return '<div class="sv3-main"><aside class="sv3-detail">' + stall + '<div class="sv3-dtext" id="shopDetail" aria-live="polite"></div></aside>' +
    '<div class="sv3-shelf"><div class="sv3-top">' + top + '<span class="sv3-hint" aria-hidden="true">' + count + ' ' + (count === 1 ? "ITEM" : "ITEMS") +
    ' <span class="sv3-go">· ' + (touchUi() ? "SWIPE" : "SCROLL") + ' →</span></span></div>' +
    '<div class="sv3-rowwrap"><button class="sv3-arrow l" aria-label="Scroll the shelf left" tabindex="-1"></button>' +
    '<div class="sv3-row" role="list">' + cards + '</div>' +
    '<button class="sv3-arrow r" aria-label="Scroll the shelf right" tabindex="-1"></button></div></div></div>';
}
function stallHtml() {
  return '<div class="sv3-stall"><canvas class="sv3-keeper" id="shopKeeper" width="120" height="120" aria-hidden="true"></canvas>' +
    '<canvas class="sv3-big" id="shopBig" width="16" height="16" aria-hidden="true"></canvas><div class="sv3-counter" aria-hidden="true"></div></div>';
}
function priceTag(c) {
  return '<button class="sv3-tag" data-buy="' + esc(c.id) + '"' + (c.canBuy ? "" : " disabled") + ' aria-label="Buy ' + esc(c.name) + ' for ' + c.price + ' ZEC">' +
    '<span class="coinic sm" aria-hidden="true"></span>' + c.price + ' ZEC</button>';
}
function zcashShelf() {
  var I = carryApi();
  if (!I) return '<p class="empty">No Zcash items on the shelf yet.</p>';
  var list = I.shelves().zcash, lo = I.loadout(), n = maxSlots(), f = feeFor(lo.length), full = lo.length >= n;
  var top = '<div class="loadout sv3-pack" aria-label="Your loadout"><span class="sv3-label">YOUR PACK</span>';
  for (var i = 0; i < n; i++) top += '<div class="slot' + (lo[i] ? " full" : "") + '"' + (lo[i] ? ' title="' + esc(itemName(lo[i])) + '"' : "") + '>' +
    (lo[i] ? '<canvas class="sv3-ic sm" width="16" height="16" data-icon="' + esc(lo[i]) + '" aria-hidden="true"></canvas><span class="sv3-sname">' + esc(itemName(lo[i])) + '</span>' : "EMPTY") + '</div>';
  top += '<div class="fee' + (lo.length && save.wallet < f ? " warn" : "") + '">' + (lo.length ? "ENTRY FEE " + f + " ZEC" : "NO FEE WHEN EMPTY") + '</div>' +
    '<button class="tlink sv3-feebtn" id="shopFee">HOW IT WORKS</button></div>';
  if (lo.length && save.wallet < f) top += '<p class="feenote warn sv3-warn">Fee ' + f + ' ZEC · you have ' + save.wallet + ', items stay home</p>';
  if (!list.length) return shelfHtml(stallHtml(), top, '<p class="empty">No Zcash items on the shelf yet.</p>', 0);
  var cards = list.map(function (c) {
    return '<div class="sv3-card' + (c.inLoadout ? " own packed" : "") + (c.held ? " held" : "") + '" data-id="' + esc(c.id) + '" role="listitem" tabindex="0" aria-label="' + esc(c.name) + '">' +
      (c.inLoadout ? '<span class="sv3-ribbon">IN YOUR PACK</span>' : "") +
      (c.held ? '<span class="sv3-badge">×' + c.held + '</span>' : "") +
      '<span class="sv3-pic"><canvas class="sv3-ic" width="16" height="16" data-icon="' + esc(c.id) + '" aria-hidden="true"></canvas></span>' +
      '<span class="sv3-name">' + esc(c.name) + '</span><span class="sv3-use">' + (c.key ? "PRESS " + esc(c.key.toUpperCase()) : "WORKS BY ITSELF") + '</span>' +
      '<span class="sv3-acts">' + priceTag(c) +
      (c.inLoadout ? '<button class="sv3-packbtn" data-pack="' + esc(c.id) + '">UNPACK</button>'
        : c.held ? '<button class="sv3-packbtn" data-pack="' + esc(c.id) + '"' + (full ? ' disabled aria-label="Your pack is full"' : "") + '>' + (full ? "FULL" : "PACK") + '</button>' : '') +
      '</span></div>';
  }).join("");
  return shelfHtml(stallHtml(), top, cards, list.length);
}
var COS_SLOTS = [["fur", "Fur"], ["hat", "Hat"], ["print", "Prints"], ["cele", "Den celebration"]];
function worn(slot) { var K = BH.cosmetics; return (save.cos && save.cos[slot]) || (K && K.DEFAULTS[slot]); }
function cosTag(it, st) {
  var on = worn(it.slot) === it.id, poor = st.state === "buyable" && !st.afford;
  return on ? "✓ WEARING" : st.state === "owned" ? "WEAR" : st.state === "buyable" ? (poor ? "NEED " + st.price + " ZEC" : st.price + " ZEC") : st.text;
}
var CHAR_OFF = "this BitFoot wears its own look";
function wornChar() { var CH = BH.characters; return CH ? CH.worn(save) : null; }
function drawnChar() { var CH = BH.characters; return CH ? CH.worn(save) || (CH.main ? CH.main(save.cos) : null) : null; }
function charTag(id, st) {
  var on = (wornChar() || BH.characters.DEFAULT) === id;
  return on ? "✓ WEARING" : st.state === "owned" ? "WEAR" : st.state === "buyable" ? (st.afford ? st.price + " ZEC" : "NEED " + st.price + " ZEC") : st.text;
}
function charCards() {
  var CH = BH.characters; if (!CH) return "";
  var cards = '<div class="sv3-post" data-slot="char" aria-hidden="true"><span>Characters</span></div>';
  CH.list.forEach(function (it) {
    var st = CH.status(it.id, save), on = (wornChar() || CH.DEFAULT) === it.id, tag = charTag(it.id, st), poor = st.state === "buyable" && !st.afford;
    cards += '<button class="chip sv3-card ' + st.state + (on ? " on" : "") + (poor ? " poor" : "") + '" data-char="' + esc(it.id) + '" data-id="' + esc(it.id) + '" data-slot="char" role="listitem"' +
      ' aria-label="' + esc(it.name + ": " + (st.state === "locked" ? "locked, " + st.text : tag)) + '">' +
      (on ? '<span class="sv3-ribbon">WEARING</span>' : "") +
      '<span class="sv3-pic"><canvas class="cth" width="64" height="64" data-th="' + esc(it.id) + '" aria-hidden="true"></canvas></span>' +
      '<span class="cn">' + esc(it.name) + '</span><span class="cs">' + (st.state === "buyable" ? '<span class="coinic sm" aria-hidden="true"></span>' : "") + esc(tag) + '</span></button>';
  });
  return cards;
}
function wardrobeShelf() {
  var K = BH.cosmetics, CH = BH.characters;
  if (!K) return '<p class="empty">The wardrobe is closed.</p>';
  var subs = (CH ? [["char", "Characters"]] : []).concat(COS_SLOTS), wc = wornChar();
  var top = '<div class="sv3-subs" role="tablist" aria-label="Jump to">' + subs.map(function (sl, i) {
    return '<button class="sv3-sub' + (i ? "" : " on") + '" data-slot="' + sl[0] + '">' + sl[1] + '</button>';
  }).join("") + '</div>';
  var cards = charCards();
  COS_SLOTS.forEach(function (sl) {
    cards += '<div class="sv3-post" data-slot="' + sl[0] + '" aria-hidden="true"><span>' + sl[1] + '</span></div>';
    K.list.filter(function (it) { return it.slot === sl[0]; }).forEach(function (it) {
      var st = K.status(it.id, save, LV), off = !!wc && (sl[0] === "fur" || sl[0] === "hat");
      var on = !off && worn(sl[0]) === it.id, poor = st.state === "buyable" && !st.afford, tag = off ? CHAR_OFF : cosTag(it, st);
      cards += '<button class="chip sv3-card ' + st.state + (on ? " on" : "") + (poor ? " poor" : "") + (off ? " off" : "") + '" data-cos="' + esc(it.id) + '" data-id="' + esc(it.id) + '" data-slot="' + sl[0] + '" role="listitem"' +
        (off ? ' aria-disabled="true"' : "") +
        ' aria-label="' + esc(it.name + ": " + (off ? CHAR_OFF : st.state === "locked" ? "locked, " + st.text : tag)) + '">' +
        (on ? '<span class="sv3-ribbon">WEARING</span>' : "") +
        '<span class="sv3-pic"><canvas class="cth" width="64" height="64" data-th="' + esc(it.id) + '" aria-hidden="true"></canvas></span>' +
        '<span class="cn">' + esc(it.name) + '</span><span class="cs">' + (st.state === "buyable" && !off ? '<span class="coinic sm" aria-hidden="true"></span>' : "") + esc(tag) + '</span></button>';
    });
  });
  var stall = '<div class="sv3-stall preview"><canvas id="cosPreview" width="240" height="240" aria-label="Your Bitfoot in the chosen look"></canvas>' +
    '<div class="pf-stump" aria-hidden="true"></div></div>';
  return shelfHtml(stall, top, cards, K.list.length + (CH ? CH.list.length : 0));
}
function shopDetailHtml(id) {
  var I = carryApi();
  if (shopTab === "zcash" && (shopFeeView || !id) && I) {
    var FEE = I.FEE || {}, lo = I.loadout(), f = feeFor(lo.length);
    return '<div class="sv3-dhead"><span class="sv3-dname">Your pack</span><span class="sv3-dstate">' + lo.length + ' OF ' + maxSlots() + ' SLOTS' + (lo.length ? " · FEE " + f + " ZEC" : "") + '</span></div>' +
      '<p class="sv3-dtxt">Carried into a level. Each one works once, then it is spent. ' + esc((I.NULLIFIER && I.NULLIFIER.zcash) || "") + '</p>' +
      '<p class="sv3-dtxt">' + esc(FEE.text || "") + ' ' + esc(FEE.extra || "") + '</p>' +
      '<p class="sv3-dz dim">' + esc(FEE.zcash || "") + srcLink(FEE.source) + '</p>' +
      (lo.length && save.wallet < f ? '<p class="feenote warn">The ' + f + ' ZEC entry fee is more than your ' + save.wallet + ' ZEC. Start a level now and your items stay home.</p>' : '');
  }
  if (shopTab === "zcash" && I) {
    var c = I.card(id); if (!c) return "";
    return '<div class="sv3-dhead"><span class="sv3-dname">' + esc(c.name) + '</span><span class="sv3-dstate">' +
      (c.held ? "×" + c.held + " HELD" : "NONE HELD") + (c.inLoadout ? " · IN YOUR PACK" : "") + '</span></div>' +
      '<p class="sv3-dtxt">' + esc(c.text || "") + '</p>' +
      (c.zcash ? '<p class="sv3-dz"><span class="kicker">REAL ZCASH</span> ' + esc(c.zcash) + srcLink(c.source) + '</p>' : '') +
      (c.caveat ? '<p class="sv3-dz dim">' + esc(c.caveat) + '</p>' : '') +
      '<p class="iuse">' + (c.key ? "PRESS " + esc(c.key.toUpperCase()) + " · " : "WORKS BY ITSELF · ") + esc(c.where || "") + '</p>';
  }
  var CH = BH.characters, ch = CH && CH.get(id);
  if (ch) {
    var cst = CH.status(id, save);
    return '<div class="sv3-dhead"><span class="sv3-dname">' + esc(ch.name) + '</span><span class="sv3-dstate">' + esc(cst.state === "locked" ? "LOCKED" : charTag(id, cst)) + '</span></div>' +
      '<p class="sv3-dtxt">' + esc(ch.desc) + '</p>' +
      '<p class="sv3-dz dim">' + (cst.state === "locked" ? "To unlock: " : cst.state === "buyable" ? "Buy it: " : "") + esc(cst.text) +
        (cst.state === "buyable" && !cst.afford ? " (you have " + (+save.wallet || 0) + " ZEC)" : "") + '</p>' +
      (ch.art ? '<p class="sv3-dz dim">Fur and hats are off while you wear it. Prints and den celebrations still work.</p>' : '') +
      '<p class="prevnote">Point at anything to try it on.</p>';
  }
  var K = BH.cosmetics, it = K && K.get(id); if (!it) return "";
  var st = K.status(id, save, LV);
  if (wornChar() && (it.slot === "fur" || it.slot === "hat"))
    return '<div class="sv3-dhead"><span class="sv3-dname">' + esc(it.name) + '</span><span class="sv3-dstate">OFF</span></div>' +
      '<p class="sv3-dtxt">' + esc(CHAR_OFF.charAt(0).toUpperCase() + CHAR_OFF.slice(1)) + '. Pick "Your BitFoot" under Characters to wear furs and hats again.</p>' +
      '<p class="sv3-dz dim">' + (st.state === "locked" ? "To unlock: " : "") + esc(st.text || "") + '</p>';
  return '<div class="sv3-dhead"><span class="sv3-dname">' + esc(it.name) + '</span><span class="sv3-dstate">' + esc(st.state === "locked" ? "LOCKED" : cosTag(it, st)) + '</span></div>' +
    (it.desc ? '<p class="sv3-dtxt">' + esc(it.desc) + '</p>' : '') +
    '<p class="sv3-dz dim">' + (st.state === "locked" ? "To unlock: " : "") + esc(st.text || "") +
    (st.state === "locked" && it.rule.badges && BH.achievements ? " " + BH.achievements.linkHtml() : "") + '</p>' +
    '<p class="prevnote">Point at anything to try it on.</p>';
}
var shopBigId = null;
function shopShowDetail(id) {
  var d = document.getElementById("shopDetail"); if (!d) return;
  d.innerHTML = shopDetailHtml(id); d.scrollTop = 0;
  Array.prototype.forEach.call(d.querySelectorAll("a"), function (a) { a.addEventListener("click", function (e) { e.stopPropagation(); }); });
  shopBigId = shopFeeView && shopTab === "zcash" ? "pack" : id;
  var big = document.getElementById("shopBig"); if (big) drawShopIcon(big, shopBigId);
}
function shopSelect(id, reveal) {
  var cards = shopCards(); if (!cards.length) return;
  if (!id || !cards.some(function (c) { return c.dataset.id === id; })) id = cards[0].dataset.id;
  shopSel[shopTab] = id; shopFeeView = false;
  cards.forEach(function (c) { c.classList.toggle("sel", c.dataset.id === id); });
  shopShowDetail(id);
  if (reveal) { var c = cards.filter(function (k) { return k.dataset.id === id; })[0]; if (c) shelfReveal(c); }
}
function shelfReveal(card) {
  var row = card.parentNode, l = card.offsetLeft - row.offsetLeft, r = l + card.offsetWidth, pad = 24;
  if (l - pad < row.scrollLeft) row.scrollLeft = l - pad;
  else if (r + pad > row.scrollLeft + row.clientWidth) row.scrollLeft = r + pad - row.clientWidth;
}
function mountShelf(row, x0) {
  var wrap = row.parentNode, shelf = wrap.parentNode, L0 = wrap.querySelector(".sv3-arrow.l"), R0 = wrap.querySelector(".sv3-arrow.r");
  var subs = Array.prototype.slice.call(ov.querySelectorAll(".sv3-sub")), posts = Array.prototype.slice.call(row.querySelectorAll(".sv3-post"));
  var sync = function () {
    var more = row.scrollWidth > row.clientWidth + 1, x = row.scrollLeft, end = x + row.clientWidth >= row.scrollWidth - 2;
    shelf.classList.toggle("more", more); shelf.classList.toggle("end", end);
    if (L0) L0.classList.toggle("off", !more || x <= 2);
    if (R0) R0.classList.toggle("off", !more || end);
    if (posts.length) {
      var on = posts[0].dataset.slot;
      posts.forEach(function (p) { if (p.offsetLeft - row.offsetLeft - x <= row.clientWidth * 0.5) on = p.dataset.slot; });
      subs.forEach(function (s) { s.classList.toggle("on", s.dataset.slot === on); });
    }
  };
  var fit = function () {
    var sx = row.scrollLeft, old = wrap.style.getPropertyValue("--cw");
    wrap.style.removeProperty("--cw");
    var nw = measure();
    if (nw) wrap.style.setProperty("--cw", nw + "px");
    if (old !== wrap.style.getPropertyValue("--cw") || row.scrollLeft !== sx) row.scrollLeft = sx;
  };
  var measure = function () {
    var c = row.querySelector(".sv3-card"); if (!c) return 0;
    var gap = 14, pad = 12, lead = row.firstElementChild && row.firstElementChild.classList.contains("sv3-post") ? row.firstElementChild.offsetWidth + gap : 0;
    var w = row.clientWidth - pad - lead, cw = c.offsetWidth, n = shopCards().length;
    if (!w || !cw || n * (cw + gap) - gap <= w) return 0;
    var k = (w + gap) / (cw + gap), m = Math.max(1, Math.round(k - 0.45)), nw = (w + gap) / (m + 0.45) - gap;
    if (nw > cw * 1.15) nw = (w + gap) / (m + 1.45) - gap;
    return Math.floor(nw);
  };
  fit();
  var step = function (dir) { row.scrollBy({ left: dir * Math.max(120, row.clientWidth * 0.8), behavior: "smooth" }); };
  if (L0) L0.addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); step(-1); });
  if (R0) R0.addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); step(1); });
  row.addEventListener("scroll", sync, { passive: true });
  row.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || row.scrollWidth <= row.clientWidth + 1) return;
    e.preventDefault(); row.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? row.clientWidth : 1);
  }, { passive: false });
  subs.forEach(function (s) {
    s.addEventListener("click", function (e) {
      e.stopPropagation(); sfx("click");
      var p = row.querySelector('.sv3-post[data-slot="' + s.dataset.slot + '"]'); if (!p) return;
      row.scrollLeft = p.offsetLeft - row.offsetLeft - 4; sync();
      if (BH.router) BH.router.at("wardrobe", { char: "characters", print: "prints", cele: "celebration" }[s.dataset.slot] || s.dataset.slot);
    });
  });
  row.addEventListener("mousemove", function (e) { if (shopKeyed && (Math.abs(e.clientX - shopKeyed.x) > 3 || Math.abs(e.clientY - shopKeyed.y) > 3)) shopKeyed = null; else if (!shopKeyed) shopMouse = { x: e.clientX, y: e.clientY }; });
  row.addEventListener("mouseover", function (e) {
    if (shopKeyed) return;
    var c = e.target.closest ? e.target.closest(".sv3-card") : null;
    if (c && c.dataset.id !== shopHoverId) { shopHoverId = c.dataset.id; shopShowDetail(c.dataset.id); }
  });
  row.addEventListener("mouseleave", function () { shopHoverId = null; if (shopFeeView) shopShowDetail(null); else shopShowDetail(shopSel[shopTab]); });
  shopCards().forEach(function (c) {
    if (!c.dataset.cos) c.addEventListener("click", function (e) { if (e.target.closest("button, a")) return; e.stopPropagation(); sfx("click"); shopSelect(c.dataset.id); });
    c.addEventListener("focus", function () { if (shopSel[shopTab] !== c.dataset.id) shopSelect(c.dataset.id, true); });
  });
  Array.prototype.forEach.call(ov.querySelectorAll("canvas[data-icon]"), function (cv) { drawShopIcon(cv, cv.dataset.icon); });
  shopHoverId = null;
  shopSelect(shopFeeView ? null : shopSel[shopTab] || (shopTab === "wardrobe" ? (BH.characters ? wornChar() || BH.characters.DEFAULT : worn("fur")) : null));
  if (shopFeeView) shopShowDetail(null);
  if (x0) row.scrollLeft = x0;
  sync();
  if (typeof ResizeObserver === "function") { var ro = new ResizeObserver(function () { if (!row.isConnected) { ro.disconnect(); return; } fit(); sync(); }); ro.observe(row); }
}
var shopHoverId = null, shopKeyed = null, shopMouse = { x: -1, y: -1 };
window.addEventListener("keydown", function (e) {
  if (game.screen !== "shop" || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
  var cards = shopCards(); if (!cards.length) return;
  var i = -1; cards.forEach(function (c, k) { if (c.classList.contains("sel")) i = k; });
  var j = Math.max(0, Math.min(cards.length - 1, i + (e.key === "ArrowRight" ? 1 : -1)));
  if (j === i) return;
  shopKeyed = { x: shopMouse.x, y: shopMouse.y }; shopHoverId = null;
  shopSelect(cards[j].dataset.id, true);
  if (shopTab === "wardrobe") previewLook(cards[j].dataset.id);
  sfx("hover");
});
function shopFeedback() {
  var back = +save.itemsRefund || 0, pp = document.getElementById("shopPurse"), top = ov.querySelector(".sv3-top");
  if (back > 0 && !save.itemsRefundShown && pp) {
    var rp = document.createElement("span"); rp.className = "sv3-pop"; rp.textContent = "+" + back;
    pp.appendChild(rp); pp.classList.add("paid");
    if (top) { var n = document.createElement("p"); n.className = "feenote sv3-warn"; n.textContent = "Zcash items were retired: +" + back + " ZEC back"; top.appendChild(n); }
    save.itemsRefundShown = true; persist();
  }
  var gback = +save.gearRefund || 0;
  if (gback > 0 && !save.gearRefundShown && pp) {
    var gp = document.createElement("span"); gp.className = "sv3-pop"; gp.textContent = "+" + gback;
    pp.appendChild(gp); pp.classList.add("paid");
    if (top) { var gn = document.createElement("p"); gn.className = "feenote sv3-warn"; gn.textContent = "Gear was retired: +" + gback + " ZEC back"; top.appendChild(gn); }
    save.gearRefundShown = true; persist();
  }
  if (!shopBought) return;
  var c = ov.querySelector('.sv3-card[data-id="' + shopBought + '"]'), p = document.getElementById("shopPurse");
  if (c) c.classList.add("sv3-bought");
  if (p && shopSpent > 0) {
    var pop = document.createElement("span"); pop.className = "sv3-pop"; pop.textContent = "−" + shopSpent;
    p.appendChild(pop); p.classList.add("paid");
  }
  shopBought = null; shopSpent = 0;
}
var SHOP_PAL = { k: "#1b120b", g: "#eaba49", G: "#ffe39a", d: "#9a7424", b: "#86592f", B: "#5f3e22", l: "#b07a44", c: "#f3dfb9",
  w: "#fffaf0", s: "#8a8f96", S: "#b4b9bf", D: "#555a61", i: "#7fd4e6", I: "#2f8fae", e: "#5f9139", r: "#dc4632" };
var SHOP_ICONS = {
  changePouch: ["................", ".....kkkkkk.....", "....kBbBbBbk....", ".....kkkkkk.....", "......kbbk......", "....kkbllbkk....",
    "...kbllllllbk...", "..kbllcllllllbk.", "..kbllllllllbk..", "..kbllllllllbk..", "..kbllllllkkkk..", "...kbbbbbkgGgk..",
    "....kkkkkkgggdk.", "..........kgdk..", "...........kk...", "................"],
  autoShield: ["....k......k....", ".....k....k.....", "......k..k......", "..kkkkkkkkkkkk..", "..kgggggggggdk..", "..kgIIIIIIIIdk..",
    "..kgIiiiiiiIdk..", "..kgIiiwiiiIdk..", "..kgIiiwwiiIdk..", "...kgIiiiiIdk...", "....kgIiiIdk....", ".....kgIIdk.....",
    "......kgdk......", ".......kk.......", "................", "................"],
  memoStone: ["................", "................", ".....kkkkkk.....", "...kkSSSSSSkk...", "..kSSSsssssSSk..", ".kSSggggggggsSk.",
    ".kSsssssssssssk.", ".kSsggggggsssDk.", ".kssssssssssssk.", ".ksggggggggssDk.", ".kssssssssssDDk.", "..kDsssssssDDk..",
    "...kkDDDDDDkk...", ".....kkkkkk.....", "................", "................"],
  viewingKey: ["................", "..kkkkkk........", ".kggggggk.......", "kgGwwwwGgk......", "kgwwkkwwgk......", "kgwkIIkwgk......",
    "kgwwkkwwgk......", "kgGwwwwGgk......", ".kggggggkkkkkkk.", "..kkkkkkgggggggk", "........kkkgkgkk", "..........kgkgk.",
    "...........k.k..", "................", "................", "................"],
  pack: ["................", ".....kkkkkk.....", "....kBBBBBBk....", "...kBk....kBk...", "..kkkkkkkkkkkk..", ".kbbbbbbbbbbbbk.",
    ".kbllllllllllbk.", ".kbllkkggkkllbk.", ".kbllkgGgdkllbk.", ".kbllkkggkkllbk.", ".kbllllllllllbk.", ".kbllllllllllbk.",
    ".kbbbbbbbbbbbbk.", "..kkkkkkkkkkkk..", "................", "................"]
};
function drawShopIcon(cv, id) {
  var x = cv.getContext && cv.getContext("2d"); if (!x) return;
  x.clearRect(0, 0, cv.width, cv.height);
  var map = SHOP_ICONS[id]; if (!map) return;
  for (var r = 0; r < 16; r++) {
    var row = (map[r] || "") + "................";
    for (var q = 0; q < 16; q++) { var p = SHOP_PAL[row.charAt(q)]; if (p) { x.fillStyle = p; x.fillRect(q, r, 1, 1); } }
  }
}
function mountStall() {
  var cv = document.getElementById("shopKeeper"), K = BH.cosmetics; if (!cv || !K || !K.draw) return;
  var g = cv.getContext("2d"), t0 = performance.now();
  var loop = function (now) {
    if (!cv.isConnected) return;
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
    try { K.draw(g, 60, 118, { dir: "right", state: "idle", t: (now - t0) / 1000, scale: 2, hat: "hat-lantern" }, "fur-rust"); } catch (e) { return; }
    BH.nextFrame(loop, true);
  };
  requestAnimationFrame(loop);
}
var previewId = null;
function previewLook(id) { previewId = id; }
function mountWardrobe() {
  var cv = document.getElementById("cosPreview"), K = BH.cosmetics; if (!cv || !K) return;
  var g = cv.getContext("2d"), t0 = performance.now();
  var CH = BH.characters;
  var chThumbs = Array.prototype.filter.call(document.querySelectorAll("canvas.cth"), function (c) { return CH && CH.get(c.dataset.th); });
  var thumbTries = 0, thumb = function () {
    chThumbs = chThumbs.filter(function (c) {
      if (!c.isConnected) return false;
      var x = c.getContext("2d"), id = c.dataset.th; x.imageSmoothingEnabled = false; x.clearRect(0, 0, 64, 64);
      if (id === CH.DEFAULT) { try { K.draw(x, 32, 62, { dir: "right", state: "idle", t: 0, scale: 1.3, hat: "hat-none" }, "fur-classic"); } catch (e) {} return false; }
      var ok = false, po = { dir: "right", state: "idle", t: 0, scale: Math.min(1.3, 60 / CH.height(id)) };
      try { ok = CH.hidden && CH.hidden(id, save) ? CH.drawSil(x, 32, 62, po, id) : CH.draw(x, 32, 62, po, id); } catch (e) {}
      return !ok;
    });
    if (chThumbs.length && ++thumbTries < 240) requestAnimationFrame(thumb);
  };
  thumb();
  Array.prototype.forEach.call(document.querySelectorAll("canvas.cth"), function (c) {
    var it = K.get(c.dataset.th); if (!it) return;
    var x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 64, 64);
    try {
      if (it.slot === "fur") K.draw(x, 32, 62, { dir: "right", state: "idle", t: 0, scale: 1.3, hat: "hat-none" }, it.id);
      else if (it.slot === "hat") K.draw(x, 32, 62, { dir: "right", state: "idle", t: 0, scale: 1.3, hat: it.id }, worn("fur"));
      else if (it.slot === "print") { K.drawPrint(x, 22, 40, 0, it.id, 2, { scale: 2.2 }); K.drawPrint(x, 42, 28, 0, it.id, 3, { scale: 2.2 }); }
      else K.celebrate(x, 32, 50, 0.9, it.id, { unit: 0.6, stars: 3 });
    } catch (e) {}
  });
  var loop = function (now) {
    if (!cv.isConnected) return;
    var t = (now - t0) / 1000, look = { fur: worn("fur"), hat: worn("hat"), print: worn("print"), cele: worn("cele") };
    if (previewId && K.get(previewId)) look[K.get(previewId).slot] = previewId;
    var who = wornChar();
    if (previewId && CH && CH.get(previewId)) who = previewId === CH.DEFAULT ? null : previewId;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, 240, 240);
    for (var p = 0; p < 5; p++) K.drawPrint(g, 18 + p * 22, 196 + (p % 2 ? 7 : -7), 0, look.print, 2 + p, { scale: 1.6 });
    var lt = t % (K.CELE_DURATION + 1.2), celeOn = lt < K.CELE_DURATION;
    var po = { dir: "right", state: celeOn ? "celebrate" : "idle", t: lt, scale: 4, hat: look.hat }, drawn = false;
    if (who) { po.scale = Math.min(4, 196 / CH.height(who)); try { drawn = CH.hidden && CH.hidden(who, save) ? CH.drawSil(g, 160, 208, po, who) : CH.draw(g, 160, 208, po, who); } catch (e) {} po.scale = 4; }
    if (!drawn) try { K.draw(g, 160, 208, po, look.fur); } catch (e) {}
    K.celebrate(g, 160, 208, lt, look.cele, { unit: 3, stars: 3 });
    BH.nextFrame(loop, true);
  };
  requestAnimationFrame(loop);
}
function cosmeticClick(id) {
  var K = BH.cosmetics, it = K && K.get(id); if (!it) return;
  ensureSave();
  var st = K.status(id, save, LV);
  if (st.state === "locked") { sfx("click"); return; }
  if (st.state === "buyable") {
    if (save.wallet < st.price) return;
    localBuy();
  } else sfx("click");
  wearCosmetic(it, id);
  function localBuy() { save.wallet -= st.price; save.cos.owned[id] = true; sfx("buy"); shopBought = id; shopSpent = st.price; }
}
function wearCosmetic(it, id) {
  save.cos[it.slot] = id;
  applyLook(); persist(); showShop(undefined, true);
}
function charClick(id) {
  var CH = BH.characters, it = CH && CH.get(id); if (!it) return;
  ensureSave();
  var st = CH.status(id, save);
  if (st.state === "locked") { sfx("click"); return; }
  if (st.state === "buyable") {
    if (save.wallet < st.price) { sfx("click"); return; }
    if (!CH.buy(id, save)) { sfx("click"); return; }
    sfx("buy"); shopBought = id; shopSpent = st.price; wearChar(id); return;
  }
  sfx("click");
  wearChar(id);
}
function wearChar(id) {
  var CH = BH.characters;
  save.char = id === CH.DEFAULT ? "char-none" : id;
  persist(); showShop(undefined, true);
}
function applyLook() {
  var K = BH.cosmetics; if (!K || !save.cos) return;
  K.applyToSprite({ fur: worn("fur"), hat: worn("hat") });
}
function togglePack(id) {
  var I = carryApi(); if (!I) return;
  I.toggleLoadout(id); shopSel[shopTab] = id; showShop(undefined, true);
}
function buy(k) {
  ensureSave();
  var I = carryApi(), ok = false, w0 = save.wallet;
  if (I) ok = I.buy(k);
  if (ok) { shopBought = k; shopSpent = w0 - save.wallet; shopSel[shopTab] = k; }
  showShop(undefined, true); return ok;
}
function quitToLevels() { if (BH.items && BH.items.endRun) BH.items.endRun(); showSelect(); }

var carryEl = document.getElementById("carry"), carrySig = "";
function carriedNow() { var r = BH.items && BH.items.run ? BH.items.run() : null; return r && game.screen === "play" ? r : null; }
function updateCarry() {
  if (!carryEl) return;
  var r = carriedNow(), I = BH.items, sig = "";
  if (r) sig = r.carried.map(function (id) { return id + ":" + I.status(id); }).join(",") + "|" + (r.stayedHome.length && r.attempt === 1 && simTime - levelStart < 5 ? "home" : "");
  if (sig === carrySig) return;
  carrySig = sig;
  carryEl.textContent = "";
  if (!r || (!r.carried.length && sig.slice(-4) !== "home")) { carryEl.className = "carry-btns"; return; }
  if (sig.slice(-4) === "home") {
    var note = document.createElement("div"); note.className = "carry-note";
    note.textContent = (I.FEE && I.FEE.stayedHome) || "Not enough ZEC for the fee. Your items stayed home.";
    carryEl.appendChild(note);
  }
  r.carried.forEach(function (id) {
    var d = I.get(id), st = I.status(id), b = document.createElement("button");
    b.className = "citem " + st; b.type = "button";
    var name = (d.word || d.name).toUpperCase(), tag = st === "spent" ? "SPENT" : st === "active" ? "ON" : d.key ? (touchUi() ? "TAP" : d.key.toUpperCase()) : "AUTO";
    b.textContent = name + " · " + tag;
    b.setAttribute("aria-label", d.name + ": " + (st === "spent" ? "spent" : st === "active" ? "working now" : d.key ? "use" : "works by itself"));
    if (d.key && st === "ready") b.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); audioInit(); if (I.use(id)) sfx("click"); updateCarry(); });
    else b.disabled = true;
    carryEl.appendChild(b);
  });
  carryEl.className = "carry-btns on";
}

function showComplete() {
  game.screen = "complete";
  var r = game.result, n = game.levelIdx + 1, f = levelCopy(n), v = endLesson();
  var head;
  if (r.medals) {
    head = '<div class="ec-medals" role="list">' + [["home", "DEN"], ["par", "UNDER " + fmtTime(L.par)], ["unseen", "UNSEEN"]].map(function (m) {
      var on = !!r.medals[m[0]];
      return '<div class="medal' + (on ? " on" : "") + '" role="listitem" aria-label="' + esc(m[1].toLowerCase()) + (on ? ": earned" : ": not this time") + '"><span class="mk">★</span><span class="ml">' + esc(m[1]) + '</span></div>';
    }).join("") + '</div>';
  } else {
    var keyTip = (r.zec >= r.total ? "★" : "☆") + " every coin · " + (r.secs <= L.par ? "★" : "☆") + " under " + fmtTime(L.par) + " · " + (r.links === 0 ? "★" : "☆") + " never linked";
    head = '<div class="ec-stars" title="' + esc(keyTip) + '" aria-label="' + r.stars + ' of 3 stars: ' + esc(keyTip) + '">' + starStr(r.stars) + '</div>';
  }
  var paid = typeof r.paid === "number"
    ? '<span class="ec-paid">' + (r.paid > 0 ? "+" + r.paid + " ZEC to your wallet" : "No new ZEC. Beat your best to earn more") + '</span>' : '';
  trailCardState(r);
  var pr = coinPraise(r, n), canClip = clipOffered(), clipNow = clipReady();
  if (!r.newBadges) r.newBadges = BH.achievements ? BH.achievements.fresh(save) : [];
  if (BH.router) BH.router.at("escaped");
  var badgeNote = BH.achievements ? BH.achievements.noteHtml(r.newBadges.filter(function (id) { return id !== "sweep" || !(pr && pr.full); })) : "";
  var shareRow = '<nav class="ec-share" aria-label="Share this run">' +
    '<button id="btnCopyImg">Copy image</button><span>·</span><button id="btnDlImg">Download image</button>' +
    (canClip ? '<span>·</span><button id="btnClip"' + (clipNow ? '' : ' disabled') + '>' + (clipNow ? CLIP_LABEL : CLIP_WAIT) + '</button>' : '') +
    '</nav>' +
    '<p class="ec-status" id="shareStatus" aria-live="polite"></p>';
  showOverlay("complete",
    '<div class="endcard">' + shareRow +
    '<div class="ec-head"><div class="ec-word"><span>ESCAPED</span></div>' +
    '<div class="ec-hero" id="ecHero" aria-hidden="true"></div>' + head +
    missHtml(r) +
    (pr ? '<p class="ec-praise' + (pr.full ? " full" : "") + '"><span class="ec-badge">' + esc(pr.badge) + '</span>' + esc(pr.line) + '</p>' : '') + badgeNote + '</div>' +
    '<figure class="ec-map" id="ecMapBox"><button class="ec-trail" id="ecTrail" aria-expanded="false">YOUR TRAIL</button><canvas class="ec-mapcv" id="ecMap" role="img" aria-label="The whole map: every footprint you left, from where you started to the den"></canvas>' +
    '<figcaption class="ec-legend"><span class="lg lg-start">Start</span><span class="lg lg-trail">Every footprint (' + r.prints + ')</span>' +
    '<span class="lg lg-den">Den</span><span class="lg lg-tracked" id="lgTracked" hidden>Picked up here</span></figcaption></figure>' +
    '<div class="ec-side">' +
    '<p class="ec-line">' + esc(v.line) + '</p>' +
    '<p class="ec-small">' + esc(v.small) + '</p>' +
    '<div class="ec-res"><p class="ec-zec"><b id="ecZecN">' + r.zec + '</b> ZEC</p>' + (paid ? '<p class="ec-zpaid">' + paid + '</p>' : '') +
    '<p class="ec-zsub">' + fmtTime(r.secs) + ' · ' + r.prints + ' footprints · ' + r.score + ' PTS</p></div>' +
    '<p class="ec-stats">' + fmtTime(r.secs) + ' · ' + r.zec + ' ZEC banked · ' + r.prints + ' footprints · ' + r.score + ' PTS' + (paid ? '<span class="or">·</span>' + paid : '') + '</p>' +
    '<button class="ec-primary" id="btnNext">' + (L.finale ? "THE ENDING ▸" : "NEXT LEVEL") + '</button>' +
    '<nav class="ec-links">' +
    '<button id="btnShop">Wardrobe (' + save.wallet + ' ZEC)</button><span>·</span><button id="btnRetry">Retry</button><span>·</span><button id="btnLevels">World map</button></nav>' +
    '<div class="ec-foot"><a href="' + esc(F.ctas.wallet.url) + '" target="_blank" rel="noopener">' + esc(F.ctas.wallet.label) + ' ↗</a>' +
    '<details><summary>For developers</summary><p>' + esc(f.dev) + '</p></details></div>' +
    '</div></div>');
  mountEndMap();
  bind("btnNext", nextFromComplete); bind("btnRetry", function () { startLevel(game.levelIdx); }); bind("btnLevels", showSelect);
  bind("btnShop", function () { showShop(null); });
  bind("btnCopyImg", function (e, el) { copyRunImage(el, r, n); });
  bind("btnDlImg", function (e, el) { downloadRunImage(el, r, n); });
  if (canClip) bind("btnClip", function (e, el) { downloadClip(el, n); });
  mountLook49(r);
}
function look49() { var r = document.documentElement; return !!(r && r.getAttribute && r.getAttribute("data-ecv") === "49"); }
function mountLook49(r) {
  var reduce = false; try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  mountHero("ecHero", "celebrate", { active: look49, scale: function () { var z = typeof trailZoom !== "undefined" ? trailZoom : 1, h = window.innerHeight * z, w = window.innerWidth * z; return h < 500 ? 2 : w < 600 ? 4 : h < 900 ? 4 : 5; } });
  var nEl = document.getElementById("ecZecN"), N = +r.zec || 0, started = false;
  var count = function () {
    if (started || !nEl || !look49() || reduce || N <= 0) return;
    started = true; var t0 = null;
    var tick = function (now) {
      if (!nEl.isConnected) return;
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0 - 1500) / 800);
      nEl.textContent = String(p <= 0 ? 0 : Math.round(N * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  count();
  if (!started && nEl && typeof MutationObserver === "function") new MutationObserver(function (m, o) { if (!nEl.isConnected) { o.disconnect(); return; } if (look49()) { count(); o.disconnect(); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-ecv"] });
  var box = document.getElementById("ecMapBox"), tb = document.getElementById("ecTrail");
  if (!box || !tb) return;
  var setOpen = function (on) {
    box.classList.toggle("open", on); tb.setAttribute("aria-expanded", on ? "true" : "false");
    try { window.dispatchEvent(new Event("resize")); } catch (e) {}
  };
  box.addEventListener("click", function (e) { if (!look49()) return; e.stopPropagation(); setOpen(!box.classList.contains("open")); });
  window.addEventListener("keydown", function esc(e) {
    if (!box.isConnected) { window.removeEventListener("keydown", esc, true); return; }
    if (e.key === "Escape" && box.classList.contains("open")) { e.stopPropagation(); e.preventDefault(); setOpen(false); }
  }, true);
}

function missHtml(r) {
  var M = (F && F.medalMiss) || {}, out = "", fill = function (s) { return String(s || "").replace(/\{par\}/g, fmtTime(L.par)).replace(/\{secs\}/g, fmtTime(Math.ceil(r.secs))); };
  if (!r || !r.medals) return "";
  ["par", "unseen"].forEach(function (k) {
    if (r.medals[k] || !M[k]) return;
    out += '<p class="ec-praise ec-miss"><span class="ec-badge">' + esc(fill(M[k].badge)) + '</span>' + esc(fill(M[k].line)) + '</p>';
  });
  return out;
}
function coinPraise(r, n) {
  var total = +r.gross || trailCoinsGross(), got = Math.min(+r.zec || 0, total);
  if (!total) return null;
  var spent = r.spent != null ? +r.spent || 0 : trailSpentNow(), picked = Math.min(total, got + spent);
  if (picked < total) return { full: false, badge: picked + " OF " + total + " COINS", line: "Good run. " + (total - picked) + " more coin" + (total - picked > 1 ? "s" : "") + " out there." };
  ensureSave(); var sw = save.badges.sweep = save.badges.sweep && typeof save.badges.sweep === "object" ? save.badges.sweep : {};
  if (!sw[n]) { sw[n] = true; persist(); }
  if (got < total) return { full: true, badge: "CLEAN SWEEP", line: "Every coin on the map: " + got + " to the den, " + (total - got) + " paid on the way." };
  return { full: true, badge: "CLEAN SWEEP", line: "Every coin on the map: all " + total + " ZEC made it to the den with you." };
}

var CLIP_LABEL = "Download clip", CLIP_WAIT = "Clip preparing…";
function clipOffered() { try { return !!(BH.clip && typeof BH.clip.download === "function" && (typeof BH.clip.supported !== "function" || BH.clip.supported())); } catch (e) { return false; } }
function clipReady() { try { return !!(BH.clip && typeof BH.clip.available === "function" && BH.clip.available()); } catch (e) { return false; } }
function refreshClipButton() {
  var b = document.getElementById("btnClip");
  if (!b || game.screen !== "complete" || !clipReady()) return;
  b.disabled = false; b.textContent = CLIP_LABEL;
}
window.addEventListener("bh:clip-ready", refreshClipButton);
function setShareStatus(t) { var s = document.getElementById("shareStatus"); if (s && s.isConnected !== false) s.textContent = t; }
function runFileName(n, ext) { return "bitfoot-hunt-level-" + n + "-" + String(LV[n - 1].title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "." + ext; }
function runImageBlob(r, n) {
  return new Promise(function (resolve, reject) {
    if (typeof renderFullMap !== "function") { reject(new Error("no map")); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, 2), map = document.createElement("canvas");
    var info = renderFullMap(map, 1600 / dpr);
    if (!info || !map.width) { reject(new Error("map did not draw")); return; }
    var W0 = map.width, band = Math.round(W0 * 0.06), out = document.createElement("canvas");
    out.width = W0; out.height = map.height + band;
    var g = out.getContext("2d");
    g.fillStyle = "#1c1c1c"; g.fillRect(0, 0, out.width, out.height);
    g.drawImage(map, 0, 0);
    var fs = Math.round(band * 0.4), y = map.height + band / 2, pad = Math.round(band * 0.4);
    g.textBaseline = "middle"; g.textAlign = "left"; g.font = "600 " + fs + "px 'Plex Cond', sans-serif"; g.fillStyle = "#fffaf0";
    g.fillText("BITFOOT: THE HUNT  ·  LEVEL " + n + " " + LV[n - 1].title, pad, y);
    g.textAlign = "right"; g.fillStyle = "#eaba49";
    var cTot = +r.gross || trailCoinsGross(), cGot = Math.min((+r.zec || 0) + (+r.spent || 0), cTot);
    g.fillText(fmtTime(r.secs) + "  ·  " + cGot + "/" + cTot + " COINS  ·  " + r.prints + " FOOTPRINTS", W0 - pad, y);
    out.toBlob(function (b) { if (b) resolve(b); else reject(new Error("no png")); }, "image/png");
  });
}
function saveBlob(blob, name) {
  var url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
}
function copyRunImage(el, r, n) {
  el.disabled = true; setShareStatus("Copying the picture…");
  runImageBlob(r, n).then(function (blob) {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("no clipboard");
    return navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  }).then(function () { setShareStatus("Picture copied. Paste it into a post."); },
    function () { setShareStatus("This browser won't copy pictures. Use Download image instead."); })
    .then(function () { el.disabled = false; });
}
function downloadRunImage(el, r, n) {
  el.disabled = true; setShareStatus("Saving the picture…");
  runImageBlob(r, n).then(function (blob) { saveBlob(blob, runFileName(n, "png")); setShareStatus("Picture saved."); },
    function () { setShareStatus("The picture could not be made this time."); })
    .then(function () { el.disabled = false; });
}
function downloadClip(el, n) {
  if (!clipReady()) { setShareStatus("The clip is still being prepared, one moment."); return; }
  el.disabled = true; setShareStatus("Saving the clip…");
  Promise.resolve().then(function () { if (BH.clip.download(runFileName(n, "mp4")) === false) throw new Error("no clip"); })
    .then(function () { setShareStatus("Clip saved."); }, function () { setShareStatus("The clip could not be saved this time."); })
    .then(function () { el.disabled = false; });
}

function caughtWhy(r) {
  var c = r.cause || {}, p = c.pursuit || {}, seen = c.seen, feat = c.feature || (r.htype ? null : r.how);
  var fs = function (id) { try { return BH.featureState ? BH.featureState(id) : null; } catch (e) { return null; } };
  var steps = function (n) { return n + (n === 1 ? " step" : " steps"); };
  if (feat === "matcher") {
    var m = fs("matcher") || {}, by = m.by || {}, parts = [];
    if (by.amount) parts.push("same ZEC in and out ×" + by.amount);
    if (by.time) parts.push("out too soon ×" + by.time);
    if (by.alone) parts.push("climbed out alone ×" + by.alone);
    if (by.piles) parts.push("both piles in one dive ×" + by.piles);
    return { why: "The Matcher linked your trips " + (m.maxLinks || 3) + " times.",
      how: "His ledger, not a hunter: 3 links and you're out.",
      cause: parts.length ? (function (s) { return s.charAt(0).toUpperCase() + s.slice(1); })(parts.join(" · ")) + "." : "Your trips in and out of the lake looked alike.",
      hint: "Come out of the lake with a different amount than you took in." };
  }
  if (feat === "prologue") { var pz = fs("prologue"); if (pz) return pz; }
  if (feat === "baby") {
    var e = fs("escort"), gap = e && r.px != null ? Math.round(Math.hypot(e.x - r.px / T, e.y - r.py / T)) : null;
    return { why: "A hunter reached Little Foot.", how: "Little Foot was caught, so the run ends.",
      cause: gap != null ? "Little Foot was " + steps(gap) + " away from you." : "Little Foot was left where a lantern could reach.",
      hint: "Keep Little Foot close and out of the light." };
  }
  if (!r.htype) return { why: "Caught.", how: "", cause: "", hint: "" };
  var who = r.htype === "dog" ? "the dog" : r.htype === "tracker" ? "the Tracker" : "the " + String(r.htype).toLowerCase();
  var Who = who.charAt(0).toUpperCase() + who.slice(1), spotted = r.how === "spotted";
  var how = spotted ? Who + " saw you and ran you down." : Who + " walked your trail right up to you.";
  if (p.kind === "tower" && p.link) p = { kind: "link", why: p.link.why, carry: p.link.carry, tower: true };
  if (p.kind === "tower") return { why: "The watchtower's light found you.", how: "It called " + who + ", who ran you down.",
    cause: "You were in the open, " + steps(c.steps) + " from the water.", hint: "Wait for the beam to pass, or stay in the water." };
  if (p.kind === "drone") return { why: "The drone marked your footprints.", how: "It sent " + who + " straight to them.",
    cause: "It flagged a footprint " + p.age + " s old.", hint: "Cross water to break your trail." };
  var linkHow = p.tower ? "That linked you: " + who + " came for you, and the watchtower's light kept him on you."
    : "That linked you: " + who + " came to where you climbed out.";
  if (p.kind === "link") return p.why === "amount"
    ? { why: "You left the water with the same ZEC you took in.", how: linkHow,
        cause: "In with " + p.carry + " ZEC, out with " + p.carry + " ZEC.", hint: "Change your ZEC in the water before you climb out." }
    : { why: "You left the water alone.", how: linkHow,
        cause: "Nobody climbed out next to you.", hint: "Climb out together with other BitFoots." };
  if (p.kind === "boss") return { why: "The Tracker read your newest footprint.", how: how,
    cause: "You were on land, " + steps(c.steps) + " from the water.", hint: "Be in the water when he stands up." };
  if (p.kind === "prints") return { why: "Your footprints led " + who + " to you.", how: how,
    cause: r.htype === "dog" && p.age > 12 ? "The dog smelled a footprint " + p.age + " s old. Dogs read old footprints."
      : Who + " found a footprint " + p.age + " s old" + (p.sprint ? ". Sprint footprints smell from further away" : "") + ".",
    hint: "Cross water to break your trail." };
  if (p.kind === "seen" || spotted) return r.htype === "dog"
    ? { why: "The dog smelled you close by.", how: how, cause: "You came within " + steps(seen ? seen.d : 2) + " of it.", hint: "Give dogs a wide berth, or cross water." }
    : { why: "A lantern saw you in the open.", how: how,
        cause: "He saw you from " + (seen ? steps(seen.d) : "close by") + (seen && seen.sprint ? ", sprinting" : "") + (c.bush ? ", in a bush" : "") + ".",
        hint: "Stay out of the lantern cones; bushes and water hide you." };
  return { why: "You walked into " + who + ".", how: Who + " was right there.", cause: "You were " + steps(c.steps) + " from the water.", hint: "" };
}
function showCaughtCard() {
  if (game.screen === "caught") return;
  var r = game.replay || {}, W;
  try { W = caughtWhy(r); } catch (e) { W = { why: "Caught.", how: "", cause: "", hint: "" }; }
  game.screen = "caught"; keys = {}; ensureSave();
  if (BH.router) BH.router.at("caught");
  var line = function (tag, cls, label, text) { return text ? '<' + tag + ' class="' + cls + '"><span class="cc-bl">' + label + '</span> ' + esc(text) + '</' + tag + '>' : ""; };
  var saved = typeof r.saved === "number" ? r.saved : null;
  var ward = "Select Character";
  var money = saved != null && saved > 0
    ? "+" + saved + " ZEC saved to your wallet anyway. It's yours to spend in " + ward + ". You have " + save.wallet + " ZEC."
    : save.wallet > 0 ? "Getting caught never costs you your wallet: your " + save.wallet + " ZEC is still saved for " + ward + "."
    : "Getting caught never costs you your wallet. Every ZEC you bank by escaping stays saved for " + ward + ".";
  var noDash = function (s) { return String(s || "").replace(/\s*—\s*(\S)/g, function (m, c) { return ". " + c.toUpperCase(); }); };
  money = noDash(money); W = { why: noDash(W.why), how: noDash(W.how), cause: noDash(W.cause), hint: noDash(W.hint), word: W.word };
  if (typeof pops !== "undefined" && pops) for (var pi = pops.length - 1; pi >= 0; pi--) if (pops[pi].text === "CAUGHT") pops.splice(pi, 1);
  var bar = function (label, frac, val) {
    return '<div class="cc-bar"><span class="cc-bl">' + label + '</span><span class="cc-track"><span class="cc-fill" data-frac="' + Math.max(0, Math.min(1, frac || 0)).toFixed(3) + '"></span></span><span class="cc-bv">' + esc(val) + '</span></div>';
  };
  var bars = (r.need ? bar("ZEC", r.zec / r.need, r.zec + " / " + r.need) : "") +
    (r.homeStart != null && r.homeLeft != null ? bar("DEN", r.homeStart ? 1 - r.homeLeft / r.homeStart : 0, r.homeLeft + " steps left") : "");
  showOverlay("caught",
    '<div class="caughtcard" role="dialog" aria-label="' + (W.word ? esc(W.word) : "Caught") + '">' +
    '<div class="ec-word cc-word">' + esc(W.word || "CAUGHT") + '</div>' +
    (W.how || W.cause ? line("p", "cc-how", "WHY", W.why) +
      '<div class="cc-bars cc-cause">' + line("span", "cc-line", "HOW", W.how) + line("span", "cc-line", "CAUSE", W.cause) + line("span", "cc-line", "NEXT TIME", W.hint) + '</div>'
      : '<p class="cc-how">' + esc(W.why) + '</p>') +
    (bars ? '<div class="cc-bars">' + bars + '</div>' : '') +
    '<p class="cc-money">' + esc(money) + '</p>' +
    '<button class="ec-primary" id="ccRetry">TRY AGAIN</button>' +
    '<nav class="ec-links"><button id="ccMap">World map</button><span>·</span><button id="ccMenu">Main menu</button></nav>' +
    '<div class="cta-hint">' + (touchUi() ? "TAP TRY AGAIN" : "R · TRY AGAIN <span class=\"or\">·</span> ESC · WORLD MAP") + '</div>' +
    '</div>');
  Array.prototype.forEach.call(ov.querySelectorAll(".cc-fill"), function (e) { try { e.style.width = (+e.dataset.frac * 100) + "%"; } catch (x) {} });
  bind("ccRetry", caughtRetry); bind("ccMap", quitToLevels); bind("ccMenu", quitToMenu);
}
function caughtRetry() { retryNow(); }
function quitToMenu() { if (BH.items && BH.items.endRun) BH.items.endRun(); showTitle(); }

function screenKey(e) {
  var s = game.screen, k = e.key;
  if (s !== "title" && s !== "select" && s !== "caught") return;
  var rebinding = s === "title" && BH.landing && BH.landing.listening && BH.landing.listening();
  if (BH.binds.map(k) === "m" && !rebinding) return;
  var t = e.target, onBtn = t && t.tagName && /^(BUTTON|A|SUMMARY)$/.test(t.tagName);
  e.stopPropagation(); audioInit();
  if (e.repeat) return;
  if (rebinding) { e.preventDefault(); BH.landing.key(k, e); return; }
  if (onBtn && (k === "Enter" || k === " ")) { e.preventDefault(); if (!t.disabled && t.click) t.click(); return; }
  if (s === "caught") {
    if (k === "r" || k === "R" || k === "Enter" || k === " ") { e.preventDefault(); sfx("click"); caughtRetry(); }
    else if (k === "Escape") { sfx("click"); quitToLevels(); }
    return;
  }
  var mod = s === "title" ? BH.landing : BH.worldmap;
  if (mod && mod.key) { if (mod.key(k, e)) e.preventDefault(); }
  else if (s === "title") showSelect();
  else if (k === "Enter" || k === " ") startLevel(nextLevelIdx());
}
window.addEventListener("keydown", screenKey, true);
var endMapResizeBound = false;
function mountEndMap() {
  var cv = document.getElementById("ecMap"), box = document.getElementById("ecMapBox");
  if (!cv || !box) return;
  try { box.style.setProperty("--ar", String(END_MAP_AR)); cv.style.aspectRatio = String(END_MAP_AR); } catch (e) {  }
  paintEndMap();
  if (!endMapResizeBound) { endMapResizeBound = true; window.addEventListener("resize", function () { if (game.screen === "complete") paintEndMap(); }); }
}
function paintEndMap() {
  var cv = document.getElementById("ecMap");
  if (!cv || !cv.isConnected) return;
  var w = cv.getBoundingClientRect().width, info = w > 0 && typeof renderFullMap === "function" ? renderFullMap(cv, w) : null;
  game.endMap = info;
  if (!info) {
    if (game.snapshot) { var img = new Image(); img.className = "ec-mapcv ec-fallback"; img.alt = "What the hunters saw in this level"; img.src = game.snapshot; cv.replaceWith(img); }
    return;
  }
  var t = document.getElementById("lgTracked");
  if (t) t.hidden = !info.tracked;
}
function nextFromComplete() {
  if (game.screen === "shop" && afterShop) { var f = afterShop; afterShop = null; f(); return; }
  if (game.levelIdx < LV.length - 1 && !(LV[game.levelIdx] && LV[game.levelIdx].finale)) { if (!(BH.story && BH.story.gate(game.levelIdx + 1, startLevel))) startLevel(game.levelIdx + 1); } else showFinale();
}

function showFinale() {
  game.screen = "finale";
  if (BH.router) BH.router.at("ending", L && L.finale ? "ending" : "after");
  var total = 0; for (var i = 1; i <= LV.length; i++) total += save.stars[i] || 0;
  showOverlay("finale",
    '<div class="card">' +
    '<div class="hero big" id="finaleSprite"></div>' +
    '<div class="word">BITFOOT HAS NEVER BEEN CAUGHT</div>' +
    '<p class="lesson">' + esc(F.finale) + '</p>' +
    '<div class="total">' + total + ' / ' + (LV.length * 3) + ' ★</div>' +
    '<div class="actions"><button id="finLevels" class="primary">WORLD MAP</button></div>' +
    '<nav class="ctas">' + linkHtml("wallet", "finWallet") + linkHtml("meet", "finMeet") + '</nav>' +
    '<div class="shield-line" id="finShield"></div>' + musicCreditHtml() +
    receiptHtml("finReceipt") +
    '<details class="dev"><summary>For developers</summary><p>' + esc((levelCopy(window.genesisAt()) || {}).dev || "") + '</p></details></div>');
  bind("finLevels", showSelect);
  mountHero("finaleSprite", "celebrate");
  mountShield("finShield");
  mountReceipt("finReceipt");
}

function showPause() {
  if (game.screen !== "play") return;
  game.screen = "pause"; keys = {};
  if (BH.router) BH.router.at("paused");
  if (document.body && document.body.classList.contains("trail")) { showTrailPause(); return; }
  showOverlay("pause",
    '<div class="card"><div class="word">PAUSED</div>' +
    '<div class="actions"><button class="primary" id="pResume">RESUME</button></div>' +
    '<nav class="ctas"><button class="tlink" id="pRestart">Restart</button><span class="or">·</span><button class="tlink" id="pLevels">World map</button></nav>' +
    receiptHtml("pReceipt") +
    '<nav class="ctas">' + linkHtml("wallet", "pWallet") + '</nav>' +
    '<div class="cta-hint">ESC <span class="or">·</span> RESUME</div></div>');
  bind("pResume", resume); bind("pRestart", retryNow); bind("pLevels", quitToLevels);
  mountReceipt("pReceipt");
}
function showTrailPause() {
  var teach = (levelCopy(game.levelIdx + 1) || {}).lesson;
  var hl = hudZecLine(banked(), typeof caveCoinTotal === "function" ? caveCoinTotal() : (coins ? coins.length : 0), L.need);
  var s = Math.max(0, Math.floor(simTime - levelStart)), clock = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
  showOverlay("pause",
    '<div class="card tp-card"><div class="word">PAUSED</div>' +
    '<div class="tp-row"><div class="tp-camp"><div class="hero" id="pHero"></div><canvas id="pFire" width="24" height="24"></canvas></div>' +
    (teach ? '<div class="p-teach"><div class="p-teach-k">THIS LEVEL TEACHES</div><p class="lesson">' + esc(teach) + '</p></div>' : '') + '</div>' +
    '<div class="tp-stats"><span class="tp-chip"><i class="tp-coin"></i>' + esc(hl.main) + '</span><span class="tp-chip">TIME ' + clock + '</span></div>' +
    '<div class="tp-btns"><button class="tp-btn primary" id="pResume">RESUME</button><button class="tp-btn" id="pRestart">RESTART</button><button class="tp-btn" id="pLevels">MAP</button><button class="tp-btn" id="pMenu">MAIN MENU</button></div>' +
    '<nav class="ctas">' + linkHtml("wallet", "pWallet") + '</nav></div>');
  bind("pResume", resume); bind("pRestart", retryNow); bind("pLevels", quitToLevels);
  bind("pMenu", function () { if (BH.items && BH.items.endRun) BH.items.endRun(); showTitle(); });
  pauseBtns().forEach(function (b, i) { b.addEventListener("mouseenter", function () { pauseSel(i); }); });
  pauseSel(0);
  mountHero("pHero", "idle");
  mountFire("pFire");
}
function pauseBtns() { return Array.prototype.slice.call(document.querySelectorAll("#overlay .tp-btns .tp-btn")); }
function pauseSel(i) { pauseBtns().forEach(function (b, j) { b.classList.toggle("sel", j === i); }); }
function trailPauseKey(k) {
  var bs = pauseBtns(); if (!bs.length) return false;
  var i = Math.max(0, bs.findIndex(function (b) { return b.classList.contains("sel"); }));
  if (k === "ArrowDown" || k === "s" || k === "S") { pauseSel((i + 1) % bs.length); sfx("click"); return true; }
  if (k === "ArrowUp" || k === "w" || k === "W") { pauseSel((i + bs.length - 1) % bs.length); sfx("click"); return true; }
  if (k === "Enter" || k === " ") { bs[i].click(); return true; }
  return false;
}
function mountFire(id) {
  var cv = document.getElementById(id); if (!cv) return;
  var c2 = cv.getContext("2d"), cols = ["#ffe08a", "#ffb43a", "#e8652a", "#a8321c"];
  var loop = function (now) {
    if (!cv.isConnected) return;
    var t = now / 1000; c2.clearRect(0, 0, 24, 24);
    for (var y = 0; y < 14; y++) {
      var w = Math.max(0, Math.round((y / 14) * 9 * (0.8 + 0.2 * Math.sin(t * 9 + y)))), sway = Math.round(Math.sin(t * 6 + y * 0.7) * (14 - y) / 9);
      for (var x = -w; x <= w; x++) {
        var e = Math.abs(x) / (w + 1) + (14 - y) / 22;
        c2.fillStyle = cols[Math.min(3, Math.floor(e * 2.2))]; c2.fillRect(12 + x + sway, 4 + y, 1, 1);
      }
    }
    c2.fillStyle = "#5f3e22"; c2.fillRect(3, 19, 18, 3); c2.fillStyle = "#86592f"; c2.fillRect(5, 18, 14, 2);
    c2.fillStyle = "#1f130a"; c2.fillRect(3, 22, 18, 1);
    BH.nextFrame(loop, true);
  };
  requestAnimationFrame(loop);
}
function resume() { hideOverlay(); volClose(); game.screen = "play"; updateStrip(); if (BH.router) BH.router.at("level"); }

function mountHero(id, state, px) {
  var host = document.getElementById(id); if (!host) return;
  var S = window.BitfootSprite, K = BH.cosmetics;
  if (!S || !S.draw) { host.innerHTML = '<img src="assets/art/026.png" alt="Bitfoot #026">'; return; }
  if (px) { mountHeroPx(host, state, px, S, K); return; }
  var size = host.classList.contains("big") ? 200 : 180, cv = document.createElement("canvas");
  cv.width = size; cv.height = size; host.appendChild(cv);
  var c2 = cv.getContext("2d"), t0 = performance.now();
  var loop = function (now) {
    if (!cv.isConnected) return;
    c2.clearRect(0, 0, size, size); c2.imageSmoothingEnabled = false;
    var sc = (size - 24) / Math.max(S.H || 32, S.W || 32), o = { dir: "right", state: state, t: (now - t0) / 1000, scale: sc, alpha: 1 };
    var who = drawnChar(), drawn = false;
    if (who) { var o2 = Object.assign({}, o, { scale: (size - 24) / BH.characters.height(who) }); try { drawn = BH.characters.draw(c2, size / 2, size - 8, o2, who); } catch (e) {} }
    if (!drawn) try { if (K && K.draw) K.draw(c2, size / 2, size - 8, o); else S.draw(c2, size / 2, size - 8, o); } catch (e) {}
    BH.nextFrame(loop, true);
  };
  requestAnimationFrame(loop);
}
function mountHeroPx(host, state, px, S, K) {
  var cv = document.createElement("canvas"); host.appendChild(cv);
  var c2 = cv.getContext("2d"), t0 = null, s0 = 0;
  var loop = function (now) {
    if (!cv.isConnected) return;
    BH.nextFrame(loop, true);
    if (px.active && !px.active()) { t0 = null; return; }
    if (t0 === null) t0 = now;
    var who = drawnChar(), Hc = who ? BH.characters.height(who) : (S.H || 45), s = Math.max(1, Math.round(px.scale()));
    var w = 48 * s, h = (Hc + 22) * s;
    if (s !== s0 || cv.width !== w || cv.height !== h) { s0 = s; cv.width = w; cv.height = h; }
    c2.clearRect(0, 0, w, h); c2.imageSmoothingEnabled = false;
    var o = { dir: "right", state: state, t: (now - t0) / 1000, scale: s, alpha: 1 }, drawn = false;
    if (who) { try { drawn = BH.characters.draw(c2, w / 2, h - s, o, who); } catch (e) {} }
    if (!drawn) try { if (K && K.draw) K.draw(c2, w / 2, h - s, o); else S.draw(c2, w / 2, h - s, o); } catch (e) {}
  };
  requestAnimationFrame(loop);
}

var muteBtn = document.getElementById("mute");
function toggleMute() {
  audioInit();
  uiMuted = !uiMuted;
  if (BH.audio && BH.audio.mute) BH.audio.mute(uiMuted);
  else if (typeof Snd !== "undefined" && Snd.toggle) { var m = Snd.toggle(); if (m !== uiMuted) Snd.toggle(); }
  muteBtn.classList.toggle("off", uiMuted);
  if (document.body.classList.contains("trail")) muteBtn.removeAttribute("aria-pressed");
  else muteBtn.setAttribute("aria-pressed", String(uiMuted));
  volPaint();
}
var volPop = null;
function soundVol() { return BH.audio && BH.audio.volume ? BH.audio.volume() : 0.8; }
function volPaint() {
  if (!volPop) return;
  var p = Math.round(soundVol() * 100), r = volPop.querySelector("input");
  r.value = p; r.style.setProperty("--p", p + "%");
  volPop.querySelector(".vol-n").textContent = (uiMuted ? 0 : p) + "%";
  volPop.querySelector(".vol-m").classList.toggle("off", uiMuted);
  volPop.querySelector(".vol-m").textContent = uiMuted ? "UNMUTE" : "MUTE";
}
function volIsOpen() { return !!volPop && volPop.classList.contains("on"); }
function volClose(refocus) {
  if (!volIsOpen()) return;
  volPop.classList.remove("on");
  muteBtn.setAttribute("aria-expanded", "false");
  if (refocus) try { muteBtn.focus({ preventScroll: true }); } catch (e) {}
}
window.addEventListener("keydown", function (e) {
  if (!volIsOpen() || (e.target instanceof Node && volPop.contains(e.target))) return;
  if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); volClose(e.target === muteBtn); return; }
  if (e.key === "Tab" || (e.target === muteBtn && (e.key === "Enter" || e.key === " "))) return;
  volClose();
}, true);
function volOpen(fromKeys) {
  if (!volPop) {
    volPop = document.createElement("div"); volPop.className = "vol-pop"; volPop.setAttribute("role", "dialog"); volPop.setAttribute("aria-label", "Volume");
    volPop.innerHTML = '<button class="vol-m"></button><input type="range" min="0" max="100" step="1" aria-label="Volume"><span class="vol-n"></span>';
    ["pointerdown", "mousedown", "touchstart", "click", "keydown"].forEach(function (t) {
      volPop.addEventListener(t, function (e) {
        if (t === "keydown" && !/^(Arrow|Home$|End$|Page|Tab$|Enter$| $|Escape$|Shift$|Control$|Alt$|Meta$)/.test(e.key)) { volClose(); try { document.activeElement.blur(); } catch (er) {} return; }
        e.stopPropagation();
        if (t === "keydown" && e.key === "Escape") { e.preventDefault(); volClose(true); }
      });
    });
    volPop.addEventListener("focusout", function (e) { var to = e.relatedTarget; if (to && !volPop.contains(to) && to !== muteBtn) volClose(); });
    volPop.querySelector(".vol-m").addEventListener("click", function () { toggleMute(); volPaint(); });
    volPop.querySelector("input").addEventListener("input", function (e) {
      var v = +e.target.value / 100;
      if (BH.audio && BH.audio.volume) BH.audio.volume(v);
      if (uiMuted && v > 0) toggleMute();
      try { save.soundVol = v; if (typeof persist === "function") persist(); } catch (er) {}
      volPaint();
    });
    document.body.appendChild(volPop);
    document.addEventListener("pointerdown", function (e) { if (volPop.classList.contains("on") && e.target !== muteBtn && !muteBtn.contains(e.target)) volClose(); });
  }
  audioInit();
  var b = muteBtn.getBoundingClientRect();
  volPop.style.top = Math.round(b.bottom + 8) + "px";
  volPop.style.right = Math.max(8, Math.round(innerWidth - b.right)) + "px";
  volPaint();
  volPop.classList.add("on");
  muteBtn.setAttribute("aria-expanded", "true");
  if (fromKeys) try { volPop.querySelector("input").focus({ preventScroll: true }); } catch (e) {}
}
if (document.body.classList.contains("trail")) muteBtn.setAttribute("aria-expanded", "false");
muteBtn.addEventListener("click", function (e) {
  e.stopPropagation();
  if (!document.body.classList.contains("trail")) { toggleMute(); return; }
  sfx("click");
  if (volIsOpen()) volClose(e.detail === 0); else volOpen(e.detail === 0);
});
try { if (save && save.soundVol != null && BH.audio && BH.audio.volume) BH.audio.volume(save.soundVol); } catch (e) {}
document.getElementById("pause").addEventListener("click", function (e) { e.stopPropagation(); sfx("click"); if (game.screen === "play") showPause(); else if (game.screen === "pause") resume(); });

applyLook();
BH.ui = { ensureSave: ensureSave, quitToLevels: quitToLevels, updateCarry: updateCarry, hudZecLine: hudZecLine, coinPraise: coinPraise };
