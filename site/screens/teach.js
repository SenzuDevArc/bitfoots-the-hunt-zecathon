"use strict";

var pulse = null, snapPending = null;
var POP_RANK = { caught: 6, alone: 5, amount: 5, seen: 4, tower: 4, trailFirst: 4, lostYou: 4, flagged: 4, boss: 4,
  crowd: 3, unmatched: 3, bushFound: 3, dogOld: 3, towerPassed: 3, shield: 2, stash: 2, bush: 2,
  trail: 1, sprint: 1, dog: 1, drone: 1, decoy: 1,
  change: 5, memo: 4, viewingKey: 4, told: 4, shoreWatched: 4, autoShielded: 3, spent: 3, alarm: 3, memoDry: 1, noRanger: 1,
  caveIn: 5, matcherNear: 3,
  matchPiles: 5, matchTiming: 5, matcherBroken: 5, memoFirst: 4, babySeen: 4, dawn: 4, disclosed: 4, rangerTold: 4, sealed: 4,
  inkSpill: 4, trackerHounds: 4, trackerDrone: 4, trackerSnap: 4, viewKey: 3, matchPhase2: 3, matchPhase3: 3, trackerConfused: 3,
  babyWait: 1, babyFar: 1, rangerAsk: 1 };
var TRACKED_MIN_AGE = 5;
var OLD_PRINT = 20;
var said = {};
var goldQueue = [];
var felt = [];
var lastPickup = null;
var eventSnap = null;
var snapOwner = null;
var lookT = null;
var teachLog = [];

var READ_MIN = 2.5, READ_PER_WORD = 0.3, READ_MAX = 9, FADE = 0.35, POP_STALE = 12;
var popQueue = [];
function wordCount(s) { return s ? String(s).split(/\s+/).filter(Boolean).length : 0; }
function readTime(p) { return Math.min(READ_MAX, READ_MIN + READ_PER_WORD * (wordCount(p.text) + wordCount(p.main) + wordCount(p.sub))); }
function popLife(p) { return p.life || readTime(p) + FADE; }
function livePop() { return pops.length && simTime - pops[0].t0 < popLife(pops[0]) ? pops[0] : null; }
function showPop(p) {
  stats.pops++;
  if (p.color !== C.ink) p.color = C.gold;
  p.life = readTime(p) + FADE;
  var cur = livePop();
  if (cur && cur.text === p.text && (cur.sub || "") === (p.sub || "") && (cur.main || "") === (p.main || "")) { if (simTime - cur.t0 > 0.5) cur.t0 = simTime; return false; }
  var curRead = cur && simTime - cur.t0 >= readTime(cur);
  if (cur && !curRead && p.rank <= cur.rank) {
    if (!p.gold && (p.main || p.sub)) queuePop(p);
    return false;
  }
  if (cur && !curRead) {
    if (cur.gold && cur.gold !== p.gold) { said[cur.gold] = false; queueGold(cur.gold, cur.opts); }
    else if (!cur.gold && (cur.main || cur.sub)) queuePop(cur);
  }
  pops = [p];
  return true;
}
function queuePop(p) { if (!popQueue.some(function (q) { return q.p.text === p.text && q.p.sub === p.sub && q.p.main === p.main; })) popQueue.push({ p: p, t: simTime }); }
function flushPops() {
  if (game.phase !== "play" || !popQueue.length) return;
  popQueue = popQueue.filter(function (q) { return simTime - q.t < POP_STALE; });
  if (!popQueue.length || livePop()) return;
  var q = popQueue.shift();
  q.p.t0 = simTime;
  showPop(q.p);
}
function chaseOn() { return hunters.some(function (h) { return h.state === "chase"; }); }
function wordOnly(k, color, opts) {
  var w = F.words[k] || { word: k };
  showPop({ text: (opts && opts.word) || w.word, sub: "", color: color || C.ink, t0: simTime, rank: POP_RANK[k] || 0 });
}
function notePop(k, color, opts) {
  var w = F.words[k];
  if (said[k]) { wordOnly(k, color, opts); return; }
  showPop({ text: (opts && opts.word) || w.word, sub: (opts && opts.main) || w.note, plain: true, color: color || C.ink, t0: simTime, rank: POP_RANK[k] || 0 });
  said[k] = true;
}
function queueGold(k, opts) { if (!goldQueue.some(function (q) { return q.k === k; })) goldQueue.push({ k: k, t: simTime, opts: opts }); }
function nameIt(k, color, opts) {
  var w = F.words[k];
  if (!w || !w.zcash || said[k]) { wordOnly(k, color, opts); return; }
  if (chaseOn() && !w.now) { wordOnly(k, color, opts); queueGold(k, opts); return; }
  var shown = showPop({ text: (opts && opts.word) || w.word, main: (opts && opts.main) || w.main || "", sub: w.zcash, color: color || C.gold, t0: simTime, rank: POP_RANK[k] || 3, gold: k, opts: opts });
  if (!shown) { queueGold(k, opts); return; }
  said[k] = true;
  goldQueue = goldQueue.filter(function (q) { return q.k !== k; });
  teachLog.push({ t: +simTime.toFixed(2), lvl: game.levelIdx + 1, kind: "gold", k: k, word: w.word, line: w.zcash });
}
var GOLD_COLOR = { trailFirst: "gold", bushFound: "gold", dogOld: "gold", boss: "red", flagged: "red", towerPassed: "gold",
  lostYou: "ice", crowd: "ice", unmatched: "ice", alone: "string", amount: "string",
  change: "ice", memo: "ice", autoShielded: "ice", viewingKey: "gold", told: "string", spent: "string", shoreWatched: "red" };
function flushGold() {
  if (game.phase !== "play" || !goldQueue.length) return;
  goldQueue = goldQueue.filter(function (q) { return simTime - q.t < 20 && !said[q.k]; });
  if (!goldQueue.length || chaseOn() || livePop()) return;
  var q = goldQueue[0];
  nameIt(q.k, C[GOLD_COLOR[q.k]] || C.gold, q.opts);
}
function feel(k, pts) {
  felt.push({ k: k, t: simTime });
  teachLog.push({ t: +simTime.toFixed(2), lvl: game.levelIdx + 1, kind: "felt", k: k });
  if (pts && !snapPending && lessonRank(k) < (snapOwner ? lessonRank(snapOwner) : 99)) eventSnap = { t: simTime + 0.5, k: k, pts: pts };
}

function say(key, color, opts) {
  var k = key, fresh = lastPickup && lastPickup.t === simTime ? lastPickup : null;
  if (key === "trail" && fresh && fresh.p.big && !said.sprint) { said.sprint = true; k = "sprint"; }
  if (key === "dog" && fresh && fresh.h.type === "dog" && fresh.age > OLD_PRINT && !said.dogOld) { feel("dogOld", huntPts(fresh.h)); nameIt("dogOld", C.gold); return; }
  if (key === "shield") { feel("hidden", [player]); if (said.shieldWord) return; said.shieldWord = true; }
  if (key === "alone" || key === "amount") { var s = strings[strings.length - 1]; feel(key, s ? [{ x: s.ax, y: s.ay }, { x: s.bx, y: s.by }, player] : null); }
  if (key === "crowd") feel("crowd", [player]);
  if (key === "tower") feel("tower");
  if (key === "shoreWatched") feel("shoreWatched");
  if (key === "memo" && !(opts && opts.main)) { wordOnly("memo", color); return; }
  if (FELT_KEYS[key]) feel(FELT_KEYS[key], [player]);
  var w = F.words[k];
  if (w && w.zcash) nameIt(k, color, opts); else if (w && w.note) notePop(k, color, opts); else wordOnly(k, color, opts);
}
function popRaw(text, color) { showPop({ text: text, sub: "", color: color || C.ink, t0: simTime, rank: 0 }); }

function teachEvent(kind, d) {
  if (game.phase !== "play") return;
  var h = d && d.h;
  if (kind === "bossLink") kind = "boss";
  if (!F.words[kind] || !F.words[kind].zcash) return;
  feel(kind, h ? [h, player] : [player]);
  nameIt(kind, C[GOLD_COLOR[kind]] || C.gold);
}
function teachReset() {
  said = {}; goldQueue = []; popQueue = []; felt = []; lastPickup = null; eventSnap = null; snapOwner = null; lookT = null;
}

var goalEl = document.getElementById("goal"), stripEl = document.getElementById("strip");
var goal = { need: 0, seen: 0, hideAsked: false, lastT: null };
function showGoal(retry) {
  teachReset();
  if (!goalEl) return;
  var f = levelCopy(game.levelIdx + 1), text = f && f.goal ? f.goal : (L.title || "");
  goalEl.innerHTML = '<span class="k">LEVEL ' + lvLabel(game.levelIdx + 1) + ' · ' + esc(L.title || "") + '</span>' + esc(text);
  goalEl.className = "goal on" + (retry ? " quick" : "");
  goal = { need: retry ? 1.5 : readTime({ text: text }), seen: 0, hideAsked: false, lastT: null };
}
function hideGoal() { goal.hideAsked = true; tickGoal(); }
function tickGoal() {
  if (!goalEl || goalEl.className.indexOf("on") < 0) return;
  var t = typeof simTime === "number" ? simTime : 0;
  if (goal.lastT != null && goalEl.style.visibility !== "hidden") goal.seen += Math.max(0, Math.min(0.25, t - goal.lastT));
  goal.lastT = t;
  if (goal.hideAsked && goal.seen >= goal.need) goalEl.className = "goal";
}

function trackedMoment(h, p) {
  var age = simTime - p.t, boss = BH.bosses.get(h.type), dog = h.type === "dog";
  lastPickup = { h: h, p: p, age: age, t: simTime };
  teachLog.push({ t: +simTime.toFixed(2), lvl: game.levelIdx + 1, kind: "pickup", who: h.type, age: +age.toFixed(2), big: !!p.big });
  if (player.inBush && tileAt(p.x, p.y) === "b" && !said.bushFound) { feel("bushFound", [h, player]); nameIt("bushFound", C.gold); if (game.tracked || age <= TRACKED_MIN_AGE) return true; }
  if (boss && age > OLD_PRINT && !said.boss) { feel("boss", [h, player]); nameIt("boss", C.red); return true; }
  if (dog && age > OLD_PRINT) return false;
  if (game.tracked || age <= TRACKED_MIN_AGE) return false;
  game.tracked = { t: simTime, from: p.i };
  pulse = { from: p.i, t0: simTime };
  shake = Math.max(shake, 7);
  feel("tracked");
  nameIt("trailFirst", C.gold);
  if (pops[0]) pops[0].avoid = h;
  var mech = (eventSnap && eventSnap.k) || snapOwner;
  if (!mech || lessonRank("tracked") < lessonRank(mech)) { snapPending = { t: simTime + 0.55, h: h, from: p.i }; eventSnap = null; snapOwner = "tracked"; }
  return true;
}
function bbox(pts) {
  var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
  return { x0: Math.min.apply(null, xs), y0: Math.min.apply(null, ys), x1: Math.max.apply(null, xs), y1: Math.max.apply(null, ys) };
}
function fitsAt(b, sc) { var m = 0.5 * T; return b.x1 - b.x0 + 2 * m <= 720 / sc && b.y1 - b.y0 + 2 * m <= 360 / sc; }
function takeTrackedSnapshot() {
  var s = snapPending; snapPending = null;
  var redEnd = Math.min(prints.length - 1, s.from + Math.ceil((simTime - game.tracked.t) * 40));
  var core = [{ x: s.h.x, y: s.h.y }];
  for (var i = s.from; i <= redEnd; i++) core.push(prints[i]);
  var me0 = [{ x: player.x, y: player.y + 0.4 * T }, { x: player.x, y: player.y - 1.1 * T }];
  var all = bbox(core.concat(me0));
  var start = core.slice(0, 7);
  var cands = [[all, [3, 2, 1]], [bbox(start.concat(me0)), [2, 1]], [bbox(core), [2, 1]], [bbox(start), [2, 1]]], sc = 1, box = bbox(start);
  outer: for (var c = 0; c < cands.length; c++) for (var k = 0; k < cands[c][1].length; k++) if (fitsAt(cands[c][0], cands[c][1][k])) { box = cands[c][0]; sc = cands[c][1][k]; break outer; }
  trace.push("snapshot scale=" + sc + " box=" + [box.x0, box.y0, box.x1, box.y1].map(function (v) { return (v / T).toFixed(1); }).join(",") + " player=" + (player.x / T).toFixed(1) + "," + (player.y / T).toFixed(1));
  game.snapshot = snapshotWorld(box.x0, box.y0, box.x1, box.y1, 0, sc);
  snapOwner = "tracked";
}
function takeEventSnapshot() {
  var e = eventSnap; eventSnap = null;
  var pts = e.pts.concat([{ x: player.x, y: player.y + 0.4 * T }, { x: player.x, y: player.y - 1.1 * T }]);
  var b = bbox(pts), sc = fitsAt(b, 2) ? 2 : fitsAt(b, 1) ? 1 : 0;
  game.snapshot = snapshotWorld(b.x0, b.y0, b.x1, b.y1, sc ? 0 : 1.5, sc || undefined);
  snapOwner = e.k;
  trace.push("snapshot " + e.k + " scale=" + (sc || "fit"));
}
function huntPts(h) { return [{ x: h.x, y: h.y }, player]; }
function takeTrailSnapshot() {
  var xs = [player.x], ys = [player.y];
  prints.forEach(function (p) { xs.push(p.x); ys.push(p.y); });
  game.snapshot = snapshotWorld(Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys), 1.5);
  snapFrame = null;
}
function signText(s) {
  var f = levelCopy(game.levelIdx + 1), o = f && f.signs && f.signs[s[2]];
  var t = o ? [o[0], o[1] || ""] : [s[2], s[3] || ""];
  if (TOUCH) t[0] = t[0].replace(/^SHIFT\b/, "HOLD SPRINT");
  else if (BH.binds && BH.binds.custom()) t[0] = t[0].replace(/^SHIFT\b/, BH.binds.name("sprint")).replace(/\bWASD\b/, BH.binds.walkName());
  return t;
}
function applyMemoCopy() {
  var missed = [];
  Object.keys(F.levels).forEach(function (n) {
    var m = F.levels[n].memos, lv = window.LEVELS && LEVELS[n - 1];
    if (!m) return;
    m.forEach(function (text, i) { if (lv && lv.memos && lv.memos[i]) lv.memos[i].text = text; else missed.push(n + ":" + i); });
  });
  return missed;
}
var memoCopyMissed = applyMemoCopy();
function drawSigns() {
  (L.signs || []).forEach(function (s0) {
    var st = signText(s0), s = [s0[0], s0[1], st[0], st[1]];
    var x = (s[0] + 0.5) * T, y = (s[1] + 0.5) * T;
    ctx.font = "600 9px 'Plex Cond', sans-serif"; ctx.letterSpacing = "0.5px";
    var tw = ctx.measureText(s[2]).width, sub = s[3] || "";
    ctx.font = "500 7px 'Plex Cond', sans-serif"; var sw = sub ? ctx.measureText(sub).width : 0;
    var bw = Math.max(tw, sw) + 12, bh = sub ? 24 : 15;
    ctx.fillStyle = "#3b2a1a"; ctx.fillRect(x - 1.5, y - 2, 3, 14);
    ctx.fillStyle = C.wood; ctx.fillRect(x - bw / 2, y - bh - 2, bw, bh);
    ctx.fillStyle = "#4e3520"; ctx.fillRect(x - bw / 2, y - 4, bw, 2);
    ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "600 9px 'Plex Cond', sans-serif"; ctx.fillText(s[2], x, y - bh + 5);
    if (sub) { ctx.font = "500 7px 'Plex Cond', sans-serif"; ctx.fillStyle = "#f3d27a"; ctx.fillText(sub, x, y - bh + 15); }
    ctx.letterSpacing = "0px";
  });
}
function oldPrintsOnScreen() {
  var y1 = view.y0 + H / zoom;
  return prints.length >= 18 && prints.some(function (p) { return simTime - p.t > 10 && p.x >= view.x0 && p.x <= view.x1 && p.y >= view.y0 && p.y <= y1; });
}
function currentHint() {
  var list = L.hints || [];
  for (var i = 0; i < list.length; i++) {
    var k = list[i];
    if (k === "need") { if (banked() < L.need) return { k: k, text: "collect ZEC · " + banked() + "/" + L.need }; continue; }
    if (k === "home") return banked() >= L.need ? { k: k } : null;
    if (k === "amount") { if (!done.amount && player.inShield && player.entry && player.carry === player.entry.carry && player.carry > 0) return { k: k }; continue; }
    if (k === "crowd") { if (!done.crowd && player.inShield) return { k: k }; continue; }
    if (k === "bush" && done.bush) { if (player.inBush) return { k: "inBush" }; continue; }
    if (k === "look") {
      if (lookT == null ? oldPrintsOnScreen() : simTime - lookT < Math.max(5, readTime({ text: F.hints.look.text }))) return { k: k };
      continue;
    }
    if (!done[k]) return { k: k };
  }
  return null;
}
function drawHint() {
  if (game.phase !== "play" || game.screen !== "play") return;
  if (livePop()) return;
  var h = currentHint(); if (!h) return;
  if (h.k === "need") return;
  if (h.k === "look" && lookT == null) lookT = simTime;
  var def = F.hints[h.k] || { text: h.k }, key = "", text = h.text || def.text;
  var x = player.x, y = (player.labelY || player.y - T) - 4;
  ctx.font = "600 9px 'Plex Cond', sans-serif"; ctx.letterSpacing = "0.4px";
  var kw = key ? ctx.measureText(key).width + 8 : 0; ctx.font = "500 9px 'Plex Cond', sans-serif"; var tw = ctx.measureText(text).width;
  var total = kw + (kw ? 4 : 0) + tw + 10, x0 = x - total / 2;
  var sy = (y - 14 - view.y0) * zoom, sx = (player.x - view.x0) * zoom;
  if (sy < 112 && sx < 230) y = player.y + 0.9 * T + 14;
  else if (sy < 60) { x0 = player.x + 18; y = player.y; }
  x0 = Math.max(view.x0 + 6, Math.min(view.x1 - total - 6, x0));
  ctx.fillStyle = "rgba(27,27,27,0.82)"; ctx.fillRect(x0, y - 14, total, 14);
  var cx = x0 + 5;
  if (key) { ctx.strokeStyle = C.gold; ctx.lineWidth = 1; ctx.strokeRect(cx - 0.5, y - 12.5, kw, 11); ctx.fillStyle = C.gold; ctx.font = "600 9px 'Plex Cond', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(key, cx + 4, y - 7); cx += kw + 4; }
  ctx.fillStyle = C.ink; ctx.font = "500 9px 'Plex Cond', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, cx, y - 7);
  ctx.letterSpacing = "0px";
}
var GOAL_TOP = 56;
function goalBottom() {
  if (!goalEl || goalEl.className.indexOf("on") < 0) return GOAL_TOP;
  var r = goalEl.getBoundingClientRect();
  return r.height ? r.bottom : GOAL_TOP;
}
function drawPops() {
  flushGold();
  flushPops();
  if (eventSnap && simTime >= eventSnap.t && game.phase === "play") takeEventSnapshot();
  if (goalEl) goalEl.style.visibility = livePop() ? "hidden" : "";
  tickGoal();
  var top = goalBottom() + 96;
  if (pops[0] && pops[0].avoid && (pops[0].avoid.y - view.y0) * zoom < top + 134) top = H - 230;
  var cy = top;
  pops.forEach(function (p) { cy += drawPopCard(p, cy) + 12; });
  ctx.letterSpacing = "0px"; ctx.globalAlpha = 1;
}
function drawPopCard(p, top) {
  var life = popLife(p), t = simTime - p.t0, sc = t < 0.12 ? 1.35 - t * 2.9 : 1;
  var alpha = t > life - FADE ? Math.max(0, (life - t) / FADE) : 1, f = popFonts(W);
  ctx.letterSpacing = "5px"; var wordFont = fitFont(p.text, f.word, W - 24), wordW = ctx.measureText(p.text).width;
  var wordH = parseInt(wordFont.match(/(\d+)px/)[1], 10) + 4, rows = [], inner = wordW;
  function add(s, font, lh, col, teach) {
    if (!s) return;
    ctx.letterSpacing = "0px"; ctx.font = font;
    wrapLines(s, W - 40).forEach(function (ln) { var w = ctx.measureText(ln).width; inner = Math.max(inner, w); rows.push({ s: ln, font: font, lh: lh, col: col, teach: teach }); });
  }
  add(p.main, f.main, f.mainH, C.ink, false);
  add(p.sub, f.sub, f.subH, p.plain ? C.ink : C.gold, !p.plain);
  var cw = Math.round(Math.min(W - 12, inner + 40)), x0 = Math.round(W / 2 - cw / 2), y0 = Math.round(top);
  var bodyH = rows.reduce(function (a, r) { return a + r.lh; }, 0), teachN = rows.filter(function (r) { return r.teach; }).length;
  var ch = 14 + wordH + (rows.length ? 6 + bodyH + (teachN ? 10 : 0) : 0) + 14;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(x0 - 3, y0 + 6, cw + 6, ch + 6);
  ctx.fillStyle = "#1f130a"; ctx.fillRect(x0 - 3, y0 - 3, cw + 6, ch + 6);
  ctx.fillStyle = "#86592f"; ctx.fillRect(x0, y0, cw, ch);
  ctx.fillStyle = "#b07a44"; ctx.fillRect(x0, y0, cw, 2);
  ctx.fillStyle = "rgba(58,37,20,0.95)"; ctx.fillRect(x0 + 4, y0 + 4, cw - 8, ch - 8);
  var wy = y0 + 14 + wordH / 2;
  ctx.save(); ctx.translate(W / 2, wy); ctx.scale(sc, sc);
  ctx.letterSpacing = "5px"; ctx.font = wordFont; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#1f130a"; ctx.fillText(p.text, 2.5, 3);
  ctx.fillStyle = p.color; ctx.fillText(p.text, 2.5, 0);
  ctx.restore();
  var y = y0 + 14 + wordH + 6, inTeach = false;
  ctx.letterSpacing = "0px"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  rows.forEach(function (r) {
    if (r.teach && !inTeach) {
      inTeach = true; y += 4;
      var th = r.lh * teachN + 6, tx = x0 + 10, tw = cw - 20;
      ctx.fillStyle = "#5f3e22"; ctx.fillRect(tx, y - 3, tw, th);
      ctx.fillStyle = "rgba(31,19,10,0.85)"; ctx.fillRect(tx + 2, y - 1, tw - 4, th - 4);
    }
    ctx.font = r.font;
    ctx.fillStyle = "#1f130a"; ctx.fillText(r.s, W / 2, y + r.lh / 2 + 2);
    ctx.fillStyle = r.col; ctx.fillText(r.s, W / 2, y + r.lh / 2);
    y += r.lh;
  });
  ctx.restore();
  return ch;
}
function popFonts(w) {
  var small = w < 600;
  return { word: "600 " + (small ? 28 : 40) + "px 'Plex Cond', sans-serif", main: "600 " + (small ? 14 : 17) + "px 'Plex Cond', sans-serif", mainH: 26,
           sub: "500 " + (small ? 13 : 15) + "px 'Plex Cond', sans-serif", subH: 24 };
}
function fitFont(text, font, max) {
  var px = parseInt(font.split(" ")[1], 10);
  ctx.font = font;
  while (px > 14 && ctx.measureText(text).width > max) { px -= 2; ctx.font = font.replace(/\d+px/, px + "px"); }
  return ctx.font;
}
function wrapLines(s, max) {
  var out = [], cur = "";
  String(s).split(/\s+/).forEach(function (w) {
    var tryS = cur ? cur + " " + w : w;
    if (cur && ctx.measureText(tryS).width > max) { out.push(cur); cur = w; } else cur = tryS;
  });
  if (cur) out.push(cur);
  return out;
}

var MECHANIC_KINDS = { shield: ["lostYou", "hidden"], crowd: ["crowd", "alone"], amount: ["amount", "unmatched"], dogs: ["dogOld"],
  tower: ["towerPassed", "tower"], drone: ["flagged"], tracker: ["boss", "trackerConfused"], boss: ["boss", "trackerConfused"],
  memo: ["memoFirst"], escort: ["babySeen"], dawn: ["dawn"], ranger: ["rangerTold", "disclosed"],
  matcher: ["matcherBroken", "matched", "inkSpill"], genesis: ["sealed"] };
var FELT_KEYS = { memoFirst: "memoFirst", babySeen: "babySeen", dawn: "dawn", disclosed: "disclosed", rangerTold: "rangerTold",
  sealed: "sealed", matchPiles: "matched", matchTiming: "matched", inkSpill: "inkSpill", matcherBroken: "matcherBroken",
  trackerConfused: "trackerConfused" };
var LESSON_ORDER = ["tracked", "alone", "amount", "lostYou", "crowd", "unmatched", "towerPassed", "tower", "hidden"];
var TRACKED_KINDS = ["boss", "flagged", "dogOld", "tracked", "bushFound"];
function levelMechanic() {
  var f = levelCopy(game.levelIdx + 1) || {};
  if (f.mechanic) return f.mechanic;
  if (L.pic && MECHANIC_KINDS[L.pic]) return L.pic;
  return (L.hunters || []).some(function (h) { return BH.bosses.get(h.type); }) ? "boss" : null;
}
function mechanicKinds() { return MECHANIC_KINDS[levelMechanic()] || []; }
function lessonRank(k) {
  var m = mechanicKinds().indexOf(k);
  if (m >= 0) return -10 + m;
  return TRACKED_KINDS.indexOf(k) >= 0 ? 0 : LESSON_ORDER.indexOf(k) >= 0 ? LESSON_ORDER.indexOf(k) : 99;
}
function levelOwnTracker() {
  var types = (L.hunters || []).map(function (h) { return h.type; });
  if (types.some(function (t) { return BH.bosses.get(t); })) return "boss";
  if (L.drone) return "flagged";
  if (types.indexOf("dog") >= 0) return "dogOld";
  return "tracked";
}
function has(k) { return felt.some(function (f) { return f.k === k; }); }
function endLesson() {
  var E = F.endCard, pick = mechanicKinds().filter(has)[0] || null;
  if (pick) {  }
  else if (TRACKED_KINDS.some(has)) {
    var own = levelOwnTracker(), order = [own].concat(TRACKED_KINDS.filter(function (k) { return k !== own; }));
    for (var i = 0; i < order.length && !pick; i++) if (has(order[i])) pick = order[i];
  } else for (var j = 0; j < LESSON_ORDER.length && !pick; j++) if (has(LESSON_ORDER[j])) pick = LESSON_ORDER[j];
  if (pick === "tower") pick = "towerPassed";
  var e = pick && E[pick];
  if (!e) return { line: E.untracked.line, small: E.untracked.small + (game.levelIdx === 0 ? " " + E.untracked.next : ""), k: "untracked" };
  return { line: e.line, small: e.small || F.words[e.from].zcash, k: pick };
}
