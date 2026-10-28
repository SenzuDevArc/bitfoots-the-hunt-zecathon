"use strict";
(function () {
  var BH = window.BH = window.BH || {};
  function swap() {
    var L = window.LEVELS, X = window.TRAIL_EXTRA_LEVELS || {}, n = 0;
    if (!Array.isArray(L)) return 0;
    L.forEach(function (stub, i) {
      if (!stub || !stub.stub || !X[stub.tid] || X[stub.tid] === stub) return;
      var real = X[stub.tid], own = real.features || [];
      var added = (stub.features || []).filter(function (f) { return own.indexOf(f) < 0; });
      if ((real.npcs || []).some(function (d) { return d.id === "auditor"; }) && own.indexOf("glasskey") < 0 && added.indexOf("glasskey") < 0) added.push("glasskey");
      real.features = own.concat(added).filter(function (f, k, all) { return all.indexOf(f) === k; });
      if (real.act == null) real.act = stub.act;
      real.tid = stub.tid;
      if (real.term === undefined) real.term = "";
      L[i] = real; n++;
    });
    return n;
  }
  var TERMS = {
    steps: "YOUR 24 SECRET WORDS ARE CALLED A SEED PHRASE",
    machine: "THE SMALLEST BIT OF ZEC IS CALLED A ZATOSHI",
    wise: "PUBLIC ZEC IS CALLED TRANSPARENT ZEC",
    bank: "JUMPING INTO THE WATERS IS CALLED SHIELDING",
    inriver: "EACH SEALED ENVELOPE IS CALLED A NOTE",
    stayin: "PAYING INSIDE THE WATERS IS A FULLY SHIELDED PAYMENT",
    anybox: "THE USED TAG IS CALLED A NULLIFIER",
    piles: "THE WATERS ARE CALLED THE SHIELDED POOL",
    glasskey: "THE GLASS KEY IS CALLED A FULL VIEWING KEY",
    doors: "THOSE DOORS ARE CALLED DIVERSIFIED ADDRESSES",
    letter: "THAT SEALED NOTE IS CALLED AN ENCRYPTED MEMO",
    mail: "TRYING YOUR KEY ON EVERY ENVELOPE IS CALLED TRIAL DECRYPTION",
    campfire: "THE KEY THAT SPENDS IS CALLED THE SPENDING KEY",
    dam: "MOVING TO THE NEW WATERS IS CALLED A MIGRATION",
    together: "THE NEW WATERS ARE CALLED IRONWOOD",
    bonus1: "THOSE TINY COINS ARE CALLED DUST",
    bonus2: "A PUBLIC-COINS-ONLY ADDRESS IS CALLED A TEX ADDRESS",
    bonus3: "YOUR OWN TOWER IS A FULL NODE, LIKE ZEBRA"
  };
  var EXTRA = {
    wise: "A SIMPLE PAYMENT'S STANDARD FEE IS 10,000 ZATOSHIS",
    inriver: "THE PRIVATE MESSAGE IN A PAYMENT IS CALLED AN ENCRYPTED MEMO",
    doors: "AN ADDRESS STARTING WITH U1 IS A UNIFIED ADDRESS",
    dam: "THE GATE'S CHECK IS A PROOF, AND ZCASH'S WATERS USE HALO 2"
  };
  function terms() {
    var M = window.TRAIL_MERGED || {};
    (window.LEVELS || []).forEach(function (l) {
      if (!l) return;
      if (!l.term && TERMS[l.tid]) l.term = TERMS[l.tid];
      var all = l.term ? [l.term] : [];
      Object.keys(M).forEach(function (cut) { if (M[cut] === l.tid && TERMS[cut] && all.indexOf(TERMS[cut]) < 0) all.push(TERMS[cut]); });
      if (EXTRA[l.tid] && all.indexOf(EXTRA[l.tid]) < 0) all.push(EXTRA[l.tid]);
      l.terms = all;
    });
  }
  var FOUND = {
    "char-033": ["glasskey", 1, 10], "char-018": ["dam", 32, 1], "char-054": ["inriver", 30, 2],
    "char-012": ["campfire", 1, 10], "char-041": ["bonus2", 31, 7], "char-047": ["bonus3", 48, 1]
  };
  function found() {
    var K = BH.characters, L = window.LEVELS || [];
    if (!K || !Array.isArray(K.list)) return;
    K.list.forEach(function (it) {
      var f = it.rule && it.rule.found; if (!f) return;
      var p = FOUND[it.id], i = p && window.trailIndexOf ? window.trailIndexOf(p[0]) : -1;
      if (i < 0) { if (f.level >= 1 && f.level <= L.length) f.level = 0; return; }
      it.rule.found = { level: i + 1, x: p[1], y: p[2] };
      if (L[i].act != null) { it.rule.text = "Hidden in Act " + (L[i].act + 1); it.rule.act = L[i].act; }
    });
  }
  function clears() {
    var OLD = window.TRAIL_V4_ORDER || [];
    function to(n) {
      if (!(n >= 1 && n <= OLD.length)) return n;
      for (var i = n - 1; i < OLD.length; i++) { var j = window.trailIndexOf ? window.trailIndexOf(OLD[i]) : -1; if (j >= 0) return j + 1; }
      return (window.LEVELS || []).length || n;
    }
    [BH.cosmetics, BH.characters].forEach(function (K) {
      if (!K || !Array.isArray(K.list)) return;
      K.list.forEach(function (it) {
        var r = it.rule; if (!r || typeof r.clear !== "number" || r.clearWas != null) return;
        r.clearWas = r.clear; r.clear = to(r.clear);
        if (r.clear !== r.clearWas && r.text === "Clear Level " + r.clearWas) r.text = "Clear Level " + r.clear;
      });
    });
  }
  function zcashBitfoot() {
    var K = BH.characters, it = K && K.get && K.get("char-014");
    if (!it) return;
    it.art = "zec"; it.name = "Zcash BitFoot";
    var worn = K.worn;
    K.worn = function (s) {
      var c = s && s.cos || {}, plain = (!c.fur || c.fur === "fur-classic") && (!c.hat || c.hat === "hat-none");
      return s && !s.char && plain ? "char-014" : worn(s);
    };
    if (K.preload) K.preload("char-014");
  }
  swap();
  terms();
  found();
  clears();
  zcashBitfoot();
})();
