"use strict";
(function () {
  var BH = window.BH = window.BH || {};
  var TRAIL_KEY = (window.BH_SAVE_KEY || "bitfoot-hunt-v3") + "-trails", TRAIL_LEVELS = 19, TRAIL_PRINTS = 1500;
  var HASH = typeof location !== "undefined" && /\.html$/.test(location.pathname || "");
  var SHIFT = 1;
  var SHELF = { characters: ["wardrobe", "char"], fur: ["wardrobe", "fur"], hat: ["wardrobe", "hat"], prints: ["wardrobe", "print"],
    celebration: ["wardrobe", "cele"], "zcash-items": ["zcash", null] };
  var SIMPLE = { "/": "menu", "/socials": "socials", "/how-to-play": "how", "/profile": "profile", "/map": "map", "/badges": "badges",
    "/wardrobe": "wardrobe", "/ending": "ending" };
  var PATTERNS = ["/", "/socials", "/how-to-play", "/profile", "/map", "/badges", "/wardrobe", "/wardrobe/*", "/level/*", "/ending", "/ending/*"];

  var hasHist = typeof history !== "undefined" && !!history && typeof history.pushState === "function" &&
    typeof location !== "undefined" && typeof location.pathname === "string";
  var inert = !hasHist;
  function addr() { return HASH ? (location.hash || "").replace(/^#/, "") || "/" : location.pathname; }
  var quiet = 0;

  function parse(path) {
    path = String(path || "/").replace(/\/+$/, "") || "/";
    if (SIMPLE[path]) return { name: SIMPLE[path] };
    var m = /^\/wardrobe\/([a-z-]+)$/.exec(path);
    if (m) return SHELF[m[1]] ? { name: "wardrobe", shelf: m[1] } : null;
    if (path === "/ending/after") return { name: "ending", after: true };
    m = /^\/level\/(0|[1-9]\d{0,3})(?:\/(paused|escaped|caught))?$/.exec(path);
    if (m) return { name: m[2] || "level", n: +m[1] + SHIFT };
    return null;
  }
  function pathOf(r) {
    if (!r) return "/";
    switch (r.name) {
      case "menu": return "/";
      case "socials": return "/socials";
      case "how": return "/how-to-play";
      case "profile": return "/profile";
      case "map": return "/map";
      case "badges": return "/badges";
      case "wardrobe": return "/wardrobe" + (r.shelf ? "/" + r.shelf : "");
      case "ending": return r.after ? "/ending/after" : "/ending";
      case "level": return "/level/" + (r.n - SHIFT);
      case "paused": case "escaped": case "caught": return "/level/" + (r.n - SHIFT) + "/" + r.name;
    }
    return "/";
  }

  function progress() {
    var lv = window.LEVELS || [], s = (typeof save !== "undefined" && save) || {}, stars = s.stars || {}, last = s.last || {};
    var cleared = {}, results = {};
    Object.keys(stars).forEach(function (k) { if (stars[k] != null) cleared[k] = true; });
    Object.keys(last).forEach(function (k) { var e = last[k] || {}; results[k] = { escaped: !!e.escaped, caught: !!e.caught }; });
    var fi = lv.findIndex ? lv.findIndex(function (l) { return l.finale; }) : -1;
    return { levels: lv.length, unlocked: typeof unlockedUpTo === "function" ? unlockedUpTo() : 1, cleared: cleared, results: results,
      finale: fi >= 0 ? fi + 1 : null, genesis: lv.length,
      zcashShelf: !!(BH.items && BH.items.zcashShelf) };
  }

  function canEnter(r) {
    var P = BH.router.progress(), no = function (to) { return { ok: false, redirectTo: to }; };
    if (!r) return no({ name: "menu" });
    if (r.n != null) {
      if (!(r.n >= 1 && r.n <= P.levels) || r.n > P.unlocked) return no({ name: "map" });
      if (r.name === "escaped" || r.name === "caught") {
        var res = P.results[r.n];
        if (!res || !res[r.name] || (r.name === "escaped" && !P.cleared[r.n])) return no({ name: "level", n: r.n });
      }
      return { ok: true };
    }
    if (r.name === "ending") {
      var lvN = r.after ? P.genesis : P.finale;
      return lvN && P.cleared[lvN] ? { ok: true } : no({ name: "map" });
    }
    if (r.name === "wardrobe" && r.shelf === "zcash-items" && !P.zcashShelf) return no({ name: "wardrobe" });
    return { ok: true };
  }

  function search() {
    var p = new URLSearchParams(location.search || ""); p.delete("fresh");
    var s = p.toString(); return (s ? "?" + s : "") + (HASH ? "" : location.hash || "");
  }
  function href(path) { return HASH ? location.pathname + search() + "#" + path : path + search(); }
  function sameGroup(a, b) {
    var lv = function (p) { var m = /^\/level\/(\d+)/.exec(p); return m ? m[1] : null; };
    if (lv(a) && lv(a) === lv(b)) return true;
    if (/^\/wardrobe/.test(a) && /^\/wardrobe/.test(b)) return true;
    return (a === "/" || a === "/socials") && (b === "/" || b === "/socials");
  }
  function go(path, replace) {
    if (inert || path === addr()) return;
    var rep = replace || sameGroup(addr(), path);
    try { history[rep ? "replaceState" : "pushState"]({ bh: path }, "", href(path)); } catch (e) {}
  }
  function at(name, arg) {
    if (inert || quiet) return;
    var n = typeof game !== "undefined" && game ? game.levelIdx + 1 : 1, r;
    switch (name) {
      case "level": case "paused": r = { name: name, n: n }; break;
      case "escaped": record(n, "escaped"); r = { name: name, n: n }; break;
      case "caught": record(n, "caught"); r = { name: name, n: n }; break;
      case "wardrobe": r = { name: "wardrobe", shelf: arg || null }; break;
      case "ending": r = { name: "ending", after: arg === "after" }; break;
      default: r = { name: name };
    }
    go(pathOf(r), false);
  }

  function clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; } }
  function readTrails() { try { var t = JSON.parse(localStorage.getItem(TRAIL_KEY) || "{}"); return t && typeof t === "object" ? t : {}; } catch (e) { return {}; } }
  function record(n, kind) {
    if (typeof save === "undefined" || !save) return;
    var r = clone(kind === "escaped" ? game.result : game.replay);
    if (!r) return;
    save.last = save.last && typeof save.last === "object" && !Array.isArray(save.last) ? save.last : {};
    var e = save.last[n] = save.last[n] && typeof save.last[n] === "object" ? save.last[n] : {};
    e[kind] = { r: r, t: Date.now() };
    if (typeof persist === "function") persist();
    if (kind !== "escaped" || typeof prints === "undefined" || !prints || !player) return;
    var step = Math.max(1, Math.ceil(prints.length / TRAIL_PRINTS)), p = [];
    for (var i = 0; i < prints.length; i += step) { var f = prints[i]; p.push([Math.round(f.x), Math.round(f.y), Math.round((f.a || 0) * 100), f.seg || 0, f.red ? 1 : 0, Math.round((f.t || 0) * 10), f.burn ? 1 : 0]); }
    var ts = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state, hr = ts && Array.isArray(ts.hrec) ? ts.hrec : [], hs = Math.max(1, Math.ceil(hr.length / 600)), h = [];
    for (var j = 0; j < hr.length; j += hs) { var row = [Math.round(hr[j].t * 10)]; hr[j].p.forEach(function (q) { row.push(Math.round(q[0]), Math.round(q[1]), Math.round((q[2] || 0) * 100)); }); h.push(row); }
    var trails = readTrails(), order = Array.isArray(trails._order) ? trails._order.filter(function (k) { return k !== String(n); }) : [];
    trails[n] = { p: p, step: step, px: Math.round(player.x), py: Math.round(player.y),
      tr: game.tracked && game.tracked.from != null ? Math.floor(game.tracked.from / step) : null,
      felt: (typeof felt !== "undefined" && felt ? felt : []).map(function (x) { return x.k; }), h: h,
      ct: (ts && Array.isArray(ts.ctime) ? ts.ctime : []).map(function (t) { return t == null ? -1 : Math.round(t * 10); }), pr: [] };
    var pr = ts && Array.isArray(ts.prec) ? ts.prec : [], ps = Math.max(1, Math.ceil(pr.length / TRAIL_PRINTS));
    for (var k = 0; k < pr.length; k += ps) trails[n].pr.push([Math.round(pr[k].x), Math.round(pr[k].y), pr[k].w ? 1 : 0, Math.round(pr[k].t * 10)]);
    order.push(String(n));
    while (order.length > TRAIL_LEVELS) delete trails[order.shift()];
    trails._order = order;
    trails._v =(window.TRAIL_REMAP && window.TRAIL_REMAP.to) || 4;
    try { localStorage.setItem(TRAIL_KEY, JSON.stringify(trails)); } catch (e) {}
  }
  function loadForCard(n) {
    var I = BH.items, hook = I && I.hook;
    if (hook) I.hook = function (name) { if (name === "onLevelStart") return; return hook.apply(I, arguments); };
    try { loadLevel(n - 1, true); } finally { if (hook) I.hook = hook; }
  }
  function showStoredEscape(n) {
    var rec = save.last[n].escaped, tr = readTrails()[n];
    quiet++;
    try {
      loadForCard(n);
      game.phase = "escaped"; game.escapedAt = simTime;
      if (tr && Array.isArray(tr.p)) {
        prints = tr.p.map(function (a) { return { x: a[0], y: a[1], a: a[2] / 100, seg: a[3], red: !!a[4], t: 0, rt: (a[5] || 0) / 10, burn: a[6] ? 1 : 0 }; });
        var ts = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state;
        if (ts) ts.ctime = (Array.isArray(tr.ct) ? tr.ct : []).map(function (t) { return t < 0 ? null : t / 10; });
        if (ts && typeof coins !== "undefined" && coins) { ts.locked = false; coins.forEach(function (c, i) { c.locked = false; c.got = ts.ctime[i] != null; }); }
        if (ts) ts.prec = (Array.isArray(tr.pr) ? tr.pr : []).map(function (a) { return { x: a[0], y: a[1], w: !!a[2], t: a[3] / 10 }; });
        if (ts) ts.hrec = (Array.isArray(tr.h) ? tr.h : []).map(function (a) { var p = []; for (var k = 1; k + 2 < a.length; k += 3) p.push([a[k], a[k + 1], a[k + 2] / 100]); return { t: a[0] / 10, p: p }; });
        player.x = tr.px; player.y = tr.py;
        game.tracked = tr.tr != null ? { from: tr.tr, t: 0 } : null;
        if (typeof felt !== "undefined") felt = (tr.felt || []).map(function (k) { return { k: k, t: 0 }; });
      }
      game.result = clone(rec.r);
      try { if (typeof takeTrailSnapshot === "function") takeTrailSnapshot(); } catch (e) { game.snapshot = null; }
      showComplete();
    } finally { quiet--; }
  }
  function showStoredCaught(n) {
    var rec = save.last[n].caught;
    quiet++;
    try {
      loadForCard(n);
      var r = game.replay = clone(rec.r);
      game.phase = "caught"; game.loseReason = r.how || "caught"; game.caughtCard = true; frozenUntil = 0;
      if (r.px != null) { player.x = r.px; player.y = r.py; }
      showCaughtCard();
    } finally { quiet--; }
  }

  function pauseWhenLive() {
    var t0 = Date.now();
    (function f() {
      if (game.screen === "play" && game.phase === "play") return showPause();
      if (Date.now() - t0 > 10000 || !/^(title|select|play)$/.test(game.screen)) return;
      requestAnimationFrame(f);
    })();
  }
  function inRun() { return typeof game !== "undefined" && game && /^(play|pause|caught|complete)$/.test(game.screen); }
  function leaveRun() { if (inRun() && BH.items && BH.items.endRun) BH.items.endRun(); }
  function open(r, depth) {
    var c = canEnter(r);
    if (!c.ok) {
      var to = c.redirectTo || { name: "menu" };
      try { history.replaceState({ bh: pathOf(to) }, "", href(pathOf(to))); } catch (e) {}
      if ((depth || 0) < 3) open(to, (depth || 0) + 1);
      return;
    }
    var LD = BH.landing;
    switch (r.name) {
      case "menu": leaveRun(); showTitle(); break;
      case "socials": leaveRun(); showTitle(); if (LD && LD.socials) LD.socials(true); break;
      case "how": case "profile": leaveRun(); if (LD && LD.show) LD.show(r.name); else showTitle(); break;
      case "map": leaveRun(); showSelect(); break;
      case "badges": leaveRun(); if (BH.achievements) BH.achievements.show(); else showSelect(); break;
      case "wardrobe": {
        leaveRun();
        var sh = r.shelf ? SHELF[r.shelf] : ["wardrobe", null];
        shopTab = sh[0];
        showShop(function () { showSelect(); });
        if (sh[1]) {
          var b = document.querySelector ? document.querySelector('.sv3-sub[data-slot="' + sh[1] + '"]') : null;
          if (b && b.click) b.click();
        }
        go(pathOf(r), true);
        break;
      }
      case "level": startLevel(r.n - 1); break;
      case "paused": startLevel(r.n - 1); pauseWhenLive(); break;
      case "escaped": showStoredEscape(r.n); break;
      case "caught": showStoredCaught(r.n); break;
      case "ending": {
        leaveRun();
        var P = BH.router.progress(), lvN = r.after ? P.genesis : P.finale;
        game.levelIdx = lvN - 1; L = window.LEVELS[lvN - 1];
        showFinale();
        break;
      }
    }
  }
  function boot() {
    if (inert) return false;
    if (!HASH && /^#\//.test(location.hash || "")) try { var h = location.hash.slice(1); history.replaceState(null, "", h + location.search); } catch (e) {}
    var r = parse(addr());
    if (r && r.name === "menu") return false;
    open(r, 0);
    return true;
  }
  if (!inert && typeof window.addEventListener === "function") window.addEventListener("popstate", function () { open(parse(addr()), 0); });

  BH.router = { boot: boot, at: at, canEnter: canEnter, parse: parse, pathOf: pathOf, open: function (r) { open(r, 0); }, progress: progress,
    PATTERNS: PATTERNS, TRAIL_KEY: TRAIL_KEY, inert: function () { return inert; } };
})();
