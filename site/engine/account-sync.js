"use strict";
(function () {
  var BH0 = window.BH = window.BH || {};
  if (typeof BH0.track !== "function") BH0.track = function () {};
  if (!window.TRAIL) return;
  var LEVEL_MAPS = ["stars", "best", "bestZec", "medals"];
  function dropExtraLevels(s) {
    var n = Array.isArray(window.LEVELS) ? window.LEVELS.length : 0;
    if (n) LEVEL_MAPS.forEach(function (k) {
      var m = s[k]; if (!m || typeof m !== "object") return;
      Object.keys(m).forEach(function (key) { if (!(+key >= 1 && +key <= n)) delete m[key]; });
    });
  }
  var REMAP = window.TRAIL_REMAP || { maps: {}, cut: {} }, V = REMAP.to || 6;
  function verOf(v) { return v !== V && REMAP.maps[v] ? v : 2; }
  function remapKeys(m, from) {
    if (!m || typeof m !== "object" || Array.isArray(m)) return m;
    var map = REMAP.maps[from] || REMAP.maps[2] || {}, cut = REMAP.cut[from] || {}, out = {};
    var ks = Object.keys(m), num = ks.filter(function (k) { return /^\d+$/.test(k); });
    ks.forEach(function (k) { if (!/^\d+$/.test(k)) out[k] = m[k]; });
    num.filter(function (k) { return !cut[k]; }).forEach(function (k) { if (map[k]) out[map[k]] = m[k]; });
    num.filter(function (k) { return cut[k]; }).forEach(function (k) { if (map[k] && out[map[k]] === undefined) out[map[k]] = m[k]; });
    return out;
  }
  function remapSave(s) {
    var from = verOf(s.trailV);
    LEVEL_MAPS.concat(["last"]).forEach(function (k) { if (s[k] && typeof s[k] === "object") s[k] = remapKeys(s[k], from); });
    if (s.badges && typeof s.badges === "object") {
      s.badges = remapKeys(s.badges, from);
      if (s.badges.sweep && typeof s.badges.sweep === "object") s.badges.sweep = remapKeys(s.badges.sweep, from);
    }
    if (s.trail && typeof s.trail === "object" && s.trail.clues && typeof s.trail.clues === "object") s.trail.clues = remapKeys(s.trail.clues, from);
    if (typeof window.genesisAt === "function") s.gAt = window.genesisAt();
    s.trailV = V;
    return s;
  }
  function remapTrails() {
    var key = (window.BH_SAVE_KEY || "bitfoot-trail-v1") + "-trails";
    try {
      var t = JSON.parse(localStorage.getItem(key) || "null"); if (!t || typeof t !== "object" || t._v === V) return;
      var from = verOf(t._v), map = REMAP.maps[from] || {}, out = remapKeys(t, from), seen = {};
      if (Array.isArray(t._order)) out._order = t._order.map(function (k) { return map[k] ? String(map[k]) : null; })
        .reverse().filter(function (k) { if (!k || seen[k]) return false; seen[k] = true; return true; }).reverse();
      out._v = V;
      localStorage.setItem(key, JSON.stringify(out));
    } catch (e) {}
  }
  (window.BH = window.BH || {}).trailRemap = { save: remapSave, keys: remapKeys, version: V };
  function grantFree(s) {
    var K = window.BH && window.BH.cosmetics;
    if (!K || !Array.isArray(K.list) || typeof K.status !== "function") return;
    if (!s.cos || typeof s.cos !== "object") s.cos = { owned: {} };
    if (!s.cos.owned || typeof s.cos.owned !== "object") s.cos.owned = {};
    K.list.forEach(function (it) {
      if (!it.rule || it.rule.clear == null && it.rule.stars == null && it.rule.badges == null && it.rule.act == null) return;
      var now = it.rule.clear, was = it.rule.clearWas;
      if (was != null) it.rule.clear = was;
      try { var st = K.status(it.id, s); if (st.state === "owned" && !st.price) s.cos.owned[it.id] = true; } catch (e) {}
      finally { it.rule.clear = now; }
    });
  }
  (function migrateOldTrail() {
    var s; try { s = typeof save !== "undefined" && save && typeof save === "object" ? save : null; } catch (e) { s = null; }
    if (!s) return;
    if (s.trailV === V) { remapTrails(); return; }
    var gNow = typeof window.genesisAt === "function" ? window.genesisAt() : 0;
    if (s.trailV == null && +s.gAt === gNow) { s.trailV = V; try { if (typeof persist === "function") persist(); } catch (e) {} return; }
    if (REMAP.maps[s.trailV]) { grantFree(s); remapSave(s); dropExtraLevels(s); try { if (typeof persist === "function") persist(); } catch (e) {} remapTrails(); return; }
    grantFree(s);
    var v2n = (window.TRAIL_V2_ORDER || []).length || 11, gWas = +s.gAt || 16;
    LEVEL_MAPS.forEach(function (k) {
      var m = s[k]; if (!m || typeof m !== "object") return;
      if (gWas !== v2n && m[gWas] !== undefined && m[v2n] === undefined) m[v2n] = m[gWas];
      if (gWas !== v2n) delete m[gWas];
      Object.keys(m).forEach(function (key) { if (!(+key >= 1 && +key <= v2n)) delete m[key]; });
    });
    remapSave(s);
    dropExtraLevels(s);
    try { if (typeof persist === "function") persist(); } catch (e) {}
    remapTrails();
  })();
  function theSave() { try { return typeof save !== "undefined" && save && typeof save === "object" ? save : null; } catch (e) { return null; } }
  function rebaseBadges() { try { if (BH0.achievements && BH0.achievements.remember && theSave()) BH0.achievements.remember(theSave()); } catch (e) {} }
  rebaseBadges();
})();
