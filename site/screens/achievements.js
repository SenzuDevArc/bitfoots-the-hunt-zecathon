"use strict";
(function () {
  window.BH = window.BH || {};
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function stars(s) { return (s && s.stars) || {}; }
  function escapedCount(s) { var n = 0, st = stars(s); for (var k in st) if (own(st, k) && st[k] != null) n++; return n; }
  function escaped(s, n) { return stars(s)[n] != null; }
  function medalCount(s, which) {
    var n = 0, m = (s && s.medals) || {};
    for (var k in m) if (own(m, k) && m[k] && m[k][which]) n++;
    return n;
  }
  function tripleCount(s) {
    var n = 0, m = (s && s.medals) || {};
    for (var k in m) if (own(m, k) && m[k] && m[k].home && m[k].par && m[k].unseen) n++;
    return n;
  }
  function sweepCount(s) {
    var b = (s && s.badges) || {}, n = 0, seen = {};
    var sw = b.sweep && typeof b.sweep === "object" ? b.sweep : {};
    for (var k in sw) if (own(sw, k) && sw[k]) { seen[k] = 1; n++; }
    for (k in b) if (own(b, k) && /^\d+$/.test(k) && b[k] && b[k].sweep && !seen[k]) n++;
    return n;
  }
  function finaleN() {
    var L = window.LEVELS || [];
    for (var i = 0; i < L.length; i++) if (L[i].finale) return i + 1;
    return 0;
  }

  var LIST = [
    { id: "first-escape", name: "FIRST ESCAPE", how: "Get home to the den on any level.", need: 1, have: escapedCount },
    { id: "sweep", name: "CLEAN SWEEP", how: "Bring every coin on a level home in one run.", need: 1, have: sweepCount },
    { id: "ghost", name: "GHOST", how: "Finish a level without a hunter ever seeing you.", need: 1, have: function (s) { return medalCount(s, "unseen"); } },
    { id: "triple", name: "ALL THREE", how: "Earn all three medals on one level: den, under par and unseen.", need: 1, have: tripleCount },
    { id: "quick", name: "QUICK PAWS", how: "Finish 5 levels under the par time.", need: 5, have: function (s) { return medalCount(s, "par"); } },
    { id: "tracker", name: "TRACKER BEATEN", how: "Escape level 10, The Tracker.", need: 1, have: function (s) { return escaped(s, 10) ? 1 : 0; } },
    { id: "sweeper", name: "SWEEPER", how: "Get a Clean Sweep on 5 different levels.", need: 5, have: sweepCount },
    { id: "shadow", name: "SHADOW", how: "Finish 10 levels without ever being seen.", need: 10, have: function (s) { return medalCount(s, "unseen"); } },
    { id: "matcher", name: "LEDGER TAKEN", how: "Escape level 15, The Matcher.", need: 1, have: function (s) { return escaped(s, 15) ? 1 : 0; } },
    { id: "halfway", name: "HALFWAY HOME", how: "Escape 25 levels.", need: 25, have: escapedCount },
    { id: "never-caught", name: "NEVER CAUGHT", how: "Escape the final level, Never Caught.", need: 1, have: function (s) { var n = finaleN(); return n && escaped(s, n) ? 1 : 0; } }
  ];

  function earnedOne(a, s) { return a.have(s) >= a.need; }
  function state(s) {
    return LIST.map(function (a) {
      var have = Math.min(a.have(s), a.need);
      return { id: a.id, name: a.name, how: a.how, need: a.need, have: have, earned: have >= a.need };
    });
  }
  function count(s) { var n = 0; LIST.forEach(function (a) { if (earnedOne(a, s)) n++; }); return n; }
  function earnedIds(s) { return LIST.filter(function (a) { return earnedOne(a, s); }).map(function (a) { return a.id; }); }
  var known = null;
  function remember(s) { known = earnedIds(s); }
  function fresh(s) {
    if (!known) { remember(s); return []; }
    var now = earnedIds(s), out = now.filter(function (id) { return known.indexOf(id) < 0; });
    known = now;
    return out;
  }
  function byId(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i]; return null; }
  function escH(t) { return typeof esc === "function" ? esc(t) : String(t); }

  function noteHtml(ids) {
    return (ids || []).map(function (id) {
      var a = byId(id); if (!a) return "";
      return '<p class="ec-praise full ach-new" data-ach-id="' + escH(a.id) + '" data-ach-name="' + escH(a.name) + '"><span class="ec-badge">NEW BADGE · ' + escH(a.name) + '</span>' + escH(a.how) +
        ' <button class="tlink ach-open" data-ach-open="1">SEE BADGES</button></p>';
    }).join("");
  }
  function linkHtml() { return '<button class="tlink ach-open" data-ach-open="1" id="achLink">SEE BADGES</button>'; }

  function show() {
    if (BH.hall && BH.hall.open) BH.hall.open("badges");
    else if (typeof showSelect === "function") showSelect();
  }

  if (typeof document !== "undefined" && document && typeof document.addEventListener === "function") {
    document.addEventListener("click", function (e) {
      var t = e.target, el = t && t.closest ? t.closest("[data-ach-open]") : null;
      if (!el) return;
      e.stopPropagation(); e.preventDefault();
      if (typeof audioInit === "function") audioInit();
      if (typeof sfx === "function") sfx("click");
      show();
    }, true);
  }
  try { if (typeof save !== "undefined" && save) remember(save); } catch (e) {}

  BH.achievements = { list: LIST, state: state, count: count, remember: remember, fresh: fresh, show: show, linkHtml: linkHtml, noteHtml: noteHtml };
})();
