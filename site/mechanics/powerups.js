"use strict";

(function () {
  if (!window.BH || !BH.features || typeof startFeatures !== "function") return;

  var KINDS = {
    cloak: { name: "CLOAK", pop: "CLOAKED", dur: 3, col: "#bfe9ff", dim: "#6f97ad", sub: "lanterns miss you 3s" },
    dash: { name: "DASH", pop: "DASH", dur: 2, col: "#e58f5a", dim: "#9a5532", sub: "free sprint 2s" },
    hush: { name: "HUSH", pop: "HUSH", dur: 4, col: "#b9e36a", dim: "#6d8f35", sub: "no footprints 4s" }
  };
  var PLACES = {
    31: { kind: "cloak", at: [14, 9] },
    33: { kind: "dash", at: [15, 9] },
    37: { kind: "hush", at: [18, 2] },
    39: { kind: "cloak", at: [7, 6] },
    43: { kind: "dash", at: [10, 4] },
    46: { kind: "hush", at: [26, 6] }
  };
  var SEE_RANGE = 7;

  var S = null;
  function live() { return S && typeof L !== "undefined" && S.level === L ? S : null; }
  function seenBook() { try { save.pu = save.pu && typeof save.pu === "object" ? save.pu : {}; return save.pu; } catch (e) { return {}; } }
  function keep() { try { if (typeof persist === "function") persist(); } catch (e) {} }

  function active(kind) {
    var s = live();
    if (!s || !s.effect || s.effect.done) return false;
    if (!api.on || simTime >= s.effect.until) { close(s); return false; }
    if (typeof game !== "undefined" && game.phase !== "play") return false;
    return (!kind || s.effect.kind === kind) && simTime < s.effect.until;
  }
  function left(kind) { return active(kind) ? Math.max(0, live().effect.until - simTime) : 0; }

  function give(kind) {
    var s = live(), k = KINDS[kind];
    if (!api.on || !s || !k) return false;
    s.effect = { kind: kind, t0: simTime, until: simTime + k.dur, done: false };
    s.took.push({ kind: kind, t: simTime });
    if (typeof trace !== "undefined") trace.push(simTime.toFixed(1) + " powerup " + kind);
    return true;
  }
  function close(s) {
    var e = s.effect; if (!e || e.done) return;
    e.done = true; e.ended = simTime;
    if (e.kind === "hush") { player.seg += 1; player.dist = 0; }
  }

  function take(s) {
    var p = s.pickup, k = KINDS[p.kind], x = (p.at[0] + 0.5) * T, y = (p.at[1] + 0.5) * T;
    p.taken = true;
    give(p.kind);
    seenBook()[p.kind] = 2; keep();
    if (typeof sfx === "function") sfx("buy");
    if (typeof puff === "function") puff(x, y, 16, k.col, 46);
    if (typeof ring === "function") ring(x, y, k.col, T * 1.4, 0.5);
    if (typeof showPop === "function") showPop({ text: k.pop, sub: "", color: C.gold, t0: simTime, rank: 5 });
    else if (typeof popRaw === "function") popRaw(k.pop, C.gold);
  }

  var def = {
    onStep: function () {
      var s = live(); if (!s) return;
      if (s.effect && !s.effect.done && !active(s.effect.kind)) close(s);
      var p = s.pickup; if (!p || p.taken || !api.on) return;
      var x = (p.at[0] + 0.5) * T, y = (p.at[1] + 0.5) * T, d = Math.hypot(player.x - x, player.y - y);
      if (!p.named && d < SEE_RANGE * T && (seenBook()[p.kind] || 0) < 1 && losClear(player.x, player.y, x, y)) {
        p.named = true; seenBook()[p.kind] = 1; keep();
        if (typeof floatText === "function") floatText(x, y - T * 0.7, KINDS[p.kind].name, KINDS[p.kind].col, KINDS[p.kind].sub, 2.8);
      }
      if (d < T * 0.55 && !player.inShield) take(s);
    },
    onDrawWorld: function (c) {
      var s = live(); if (!s || typeof liveFrame === "undefined" || !liveFrame) return;
      var p = s.pickup;
      if (p && !p.taken && api.on) drawPickup(c, p);
      var e = s.effect;
      if (active()) {
        var k = KINDS[e.kind], f = left(e.kind) / k.dur;
        c.strokeStyle = k.col; c.globalAlpha = 0.8; c.lineWidth = 2;
        c.beginPath(); c.arc(player.x, player.y + 10, 13, -1.5708, -1.5708 + 6.283 * f); c.stroke(); c.globalAlpha = 1;
      }
    },
    onDrawOver: function (c) {
      var s = live(); if (!s || !active()) return;
      var e = s.effect, k = KINDS[e.kind], t = left(e.kind), x = 16, y = 70, w = 112;
      c.fillStyle = "rgba(27,27,27,0.85)"; c.fillRect(x, y, w, 22);
      icon(c, e.kind, x + 4, y + 3, 16);
      c.font = "600 12px 'Plex Cond', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillStyle = k.col;
      c.fillText(k.name, x + 26, y + 9);
      c.textAlign = "right"; c.fillStyle = C.ink; c.fillText(t.toFixed(1) + "s", x + w - 6, y + 9);
      c.fillStyle = k.dim; c.fillRect(x + 26, y + 16, w - 32, 3);
      c.fillStyle = k.col; c.fillRect(x + 26, y + 16, (w - 32) * (t / k.dur), 3);
    }
  };

  function icon(c, kind, x, y, sz) {
    var k = KINDS[kind], u = sz / 16;
    c.fillStyle = "#1b1b1b"; c.fillRect(x, y, sz, sz);
    c.fillStyle = k.col; c.fillRect(x, y, sz, 2 * u); c.fillRect(x, y + sz - 2 * u, sz, 2 * u); c.fillRect(x, y, 2 * u, sz); c.fillRect(x + sz - 2 * u, y, 2 * u, sz);
    var r = function (a, b, w, h, col) { c.fillStyle = col || k.col; c.fillRect(x + a * u, y + b * u, w * u, h * u); };
    if (kind === "cloak") {
      r(6, 3, 4, 2); r(5, 5, 6, 2); r(4, 7, 8, 6); r(6, 7, 4, 3, "#1b1b1b"); r(3, 11, 10, 2, k.dim);
    } else if (kind === "dash") {
      [0, 5].forEach(function (o) { r(2 + o, 3, 2, 2); r(4 + o, 5, 2, 2); r(6 + o, 7, 2, 2); r(4 + o, 9, 2, 2); r(2 + o, 11, 2, 2); });
    } else {
      r(5, 8, 6, 5); r(6, 7, 4, 1); r(3, 5, 2, 3); r(6, 3, 2, 3); r(9, 3, 2, 3); r(11, 5, 2, 3);
    }
  }
  function drawPickup(c, p) {
    var k = KINDS[p.kind], x = (p.at[0] + 0.5) * T, y = (p.at[1] + 0.5) * T + Math.sin(simTime * 3) * 2.5;
    c.globalCompositeOperation = "lighter"; c.fillStyle = "rgba(255,250,240,0.10)";
    c.beginPath(); c.arc(x, y, 14 + Math.sin(simTime * 4) * 1.5, 0, 6.283); c.fill(); c.globalCompositeOperation = "source-over";
    icon(c, p.kind, x - 9, y - 9, 18);
    if (Math.sin(simTime * 5) > 0.6) { c.fillStyle = C.ink; c.fillRect(x + 8, y - 11, 2, 2); }
    if ((seenBook()[p.kind] || 0) < 2) {
      c.font = "600 10px 'Plex Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
      var w = (c.measureText(k.name).width || 0) + 8;
      c.fillStyle = "rgba(27,27,27,0.85)"; c.fillRect(x - w / 2, y + 13, w, 12);
      c.fillStyle = k.col; c.fillText(k.name, x, y + 19);
    }
  }

  function walkable(tx, ty) { var ch = tile(tx, ty); return ch === "." && !solidP(ch); }
  var coreStart = startFeatures;
  startFeatures = function () {
    var r = coreStart.apply(this, arguments);
    S = null;
    if (!api.on || typeof L === "undefined" || !L || typeof game === "undefined") return r;
    var at = PLACES[game.levelIdx + 1];
    if (!at || !KINDS[at.kind]) return r;
    S = { level: L, pickup: null, effect: null, took: [] };
    if (walkable(at.at[0], at.at[1])) S.pickup = { kind: at.kind, at: at.at.slice(), taken: false, named: false };
    else if (typeof trace !== "undefined") trace.push("powerup spot not walkable on level " + (game.levelIdx + 1));
    var fapi = Object.create(featureApi); fapi.id = "powerups"; fapi.state = {};
    activeFeatures.push({ id: "powerups", def: def, api: fapi });
    return r;
  };

  var api = BH.powerups = {
    on: true,
    KINDS: KINDS, PLACES: PLACES, SEE_RANGE: SEE_RANGE,
    active: active, left: left,
    state: function () { var s = live(); return s ? JSON.parse(JSON.stringify({ pickup: s.pickup, effect: s.effect, took: s.took })) : null; }
  };
})();
