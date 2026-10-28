"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.features.register || !BH.tiles) return;

  var NOTE = "£", POST = "¥", SEAL = "¬", STRAY = "®", STUMP = "¢", MUD = "°";
  var SEEN_CALL = 0.6;
  var CALM = { patrol: 1, "return": 1, search: 1 };
  var MIX = 2;
  var GAP = 0.85;
  var JOIN_R = 1.1;
  var SCARED = 3;

  var COPY = {
    a9relay: { sign: ["CARRY THE NOTE", "only its post reads it"], mechanic: "a9relay",
      lesson: "A memo travels sealed. Outsiders can't open it.",
      dev: "A shielded Zcash payment can carry an encrypted 512-byte memo that only the receiver, the sender or a viewing-key holder can read." },
    a9lead: { sign: ["THEY FOLLOW YOU", "together, nobody's trail"], mechanic: "a9lead",
      lesson: "Alone, your trail is yours. In a crowd, nobody can say whose it is.",
      dev: "A shielded spend proves its note is one of all the notes in its pool without saying which, so everyone using the pool helps hide everyone else." },
    a9clear: { sign: ["THE SAWS ARE COMING", "cleared ground hides nothing"], mechanic: "a9clear",
      lesson: "Hide early. Once the cover is gone, what you did in the open stays seen.",
      dev: "Shielding coins hides what happens to them next, but everything they did while transparent stays on the public chain for good." }
  };
  var WORDS = {
    a9Note: { word: "SEALED NOTE", main: "Only its own post can read it.", zcash: "A shielded payment's memo is encrypted to its receiver." },
    a9Read: { word: "READ", zcash: "" },
    a9NotMine: { word: "NOT FOR ME", zcash: "" },
    a9Join: { word: "WITH YOU", main: "Two or more behind you mix your steps.", zcash: "Every shielded user makes the others harder to pick out." },
    a9Mixed: { word: "MIXED TRAIL", zcash: "" },
    a9Scatter: { word: "SCATTERED", zcash: "" },
    a9Saw: { word: "THE SAWS", main: "The forest is being cleared from the west.", zcash: "What's done in the open stays on the public chain for good." },
    a9Open: { word: "NO COVER", zcash: "" }
  };
  var F0 = window.FACTS && FACTS.words;
  if (F0) Object.keys(WORDS).forEach(function (k) { if (!F0[k]) F0[k] = WORDS[k]; });

  var RIB = ["#eaba49", "#bfe9ff", "#e58f9a", "#b9e36a"];
  function live(st) { return !!st && typeof L !== "undefined" && L === st.level; }
  function now(api) { return api.time; }
  function ptile(p) { return [Math.floor(p.x / T), Math.floor(p.y / T)]; }
  function same(a, b) { return !!a && !!b && a[0] === b[0] && a[1] === b[1]; }
  function sfxOk(n, o) { try { if (typeof sfx === "function") sfx(n, o); } catch (e) {} }
  function ghosted() { return typeof ghost !== "undefined" && !!ghost; }
  function tag(c, text, x, y, col) {
    c.font = "600 9px 'Plex Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
    var w = c.measureText(text).width + 8;
    c.fillStyle = "rgba(27,27,27,0.85)"; c.fillRect(Math.round(x - w / 2), Math.round(y - 6), Math.round(w), 12);
    c.fillStyle = col || C.ink; c.fillText(text, x, y);
  }
  function drawScroll(c, x, y, col, s) {
    s = s || 1;
    c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(x - 7 * s, y + 5 * s, 14 * s, 2 * s);
    c.fillStyle = "#e8dcb8"; c.fillRect(x - 7 * s, y - 4 * s, 14 * s, 8 * s);
    c.fillStyle = "#c9b98f"; c.fillRect(x - 8 * s, y - 5 * s, 3 * s, 10 * s); c.fillRect(x + 5 * s, y - 5 * s, 3 * s, 10 * s);
    c.fillStyle = col; c.fillRect(x - 3 * s, y - 5 * s, 6 * s, 10 * s);
    c.fillStyle = C.red; c.fillRect(x - 1.5 * s, y - 1.5 * s, 3 * s, 3 * s);
  }
  function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a.toFixed(3) + ")"; }
  function glow(c, x, y, r, col, a) { c.globalCompositeOperation = "lighter"; c.fillStyle = hexA(col, a); c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); c.globalCompositeOperation = "source-over"; }

  var rl = null;
  function relayOf(level) { return (level && level.a9relay) || []; }
  function colourAt(x, y, kind) {
    var list = relayOf(typeof L !== "undefined" ? L : null);
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (kind === "note" && same(e.note, [x, y])) return RIB[i % RIB.length];
      if (kind === "post" && same(e.post, [x, y])) return RIB[i % RIB.length];
      if (kind === "gate" && (e.gates || []).some(function (g) { return same(g, [x, y]); })) return RIB[i % RIB.length];
    }
    return "#8a8a80";
  }
  BH.tiles.register(NOTE, { claim: "a9relay", draw: function (b, px, py) {
    b.fillStyle = "rgba(0,0,0,0.35)"; b.fillRect(px + 4, py + 23, 25, 4);
    b.fillStyle = "#4a4a44"; b.fillRect(px + 4, py + 12, 24, 13); b.fillStyle = "#62625a"; b.fillRect(px + 5, py + 12, 22, 3);
    b.fillStyle = "#3a3a36"; b.fillRect(px + 4, py + 23, 24, 2);
  } });
  BH.tiles.register(POST, { claim: "a9relay", draw: function (b, px, py, x, y) {
    var col = colourAt(x, y, "post");
    b.fillStyle = "rgba(0,0,0,0.3)"; b.fillRect(px + 8, py + 27, 17, 3);
    b.fillStyle = "#3b2a1a"; b.fillRect(px + 13, py + 10, 6, 18);
    b.fillStyle = C.wood; b.fillRect(px + 7, py + 3, 18, 11); b.fillStyle = "#8a6440"; b.fillRect(px + 7, py + 3, 18, 2);
    b.fillStyle = "#1b1b1b"; b.fillRect(px + 10, py + 8, 12, 2);
    b.fillStyle = col; b.fillRect(px + 7, py + 12, 18, 2);
  } });
  BH.tiles.register(SEAL, { solid: true, claim: "a9relay", draw: function (b, px, py, x, y) {
    var col = colourAt(x, y, "gate");
    b.fillStyle = "#2c2c29"; b.fillRect(px, py, T, T);
    b.fillStyle = "#44443e"; b.fillRect(px + 2, py + 2, T - 4, T - 4);
    b.fillStyle = "#35352f"; b.fillRect(px + 15, py + 2, 2, T - 4); b.fillRect(px + 2, py + 15, T - 4, 2);
    b.fillStyle = col; b.fillRect(px + 10, py + 10, 12, 12);
    b.fillStyle = C.red; b.fillRect(px + 12, py + 12, 8, 8); b.fillStyle = "#e0634e"; b.fillRect(px + 14, py + 15, 4, 2);
  } });
  BH.features.register("a9relay", {
    copy: COPY.a9relay,
    onLevelStart: function (level) {
      var at = function (q) { return q ? ((level.map[q[1]] || "")[q[0]] || "#") : "#"; };
      rl = { level: level, list: relayOf(level).map(function (e) { return { note: at(e.note) === NOTE ? e.note : null, post: at(e.post) === POST ? e.post : null,
               gates: (e.gates || []).slice(), after: e.after, delivered: false, deliveredT: -1 }; }),
             carrying: -1, lastTile: null, took: 0, wrong: 0, opened: 0, readAt: [] };
    },
    onStep: function (dt, api) {
      if (!live(rl) || game.phase !== "play") return;
      var p = ptile(api.player), moved = !same(p, rl.lastTile);
      rl.lastTile = p;
      if (!moved) return;
      rl.list.forEach(function (e, i) {
        if (e.delivered || rl.carrying === i || !same(p, e.note)) return;
        if (e.after != null && !(rl.list[e.after] && rl.list[e.after].delivered)) return;
        rl.carrying = i; rl.took++;
        var x = (p[0] + 0.5) * T, y = (p[1] + 0.5) * T;
        if (typeof puff === "function") puff(x, y - 6, 10, "rgba(232,220,184,0.9)", 26);
        sfxOk("click"); api.say("a9Note", C.gold);
      });
      rl.list.forEach(function (e, i) {
        if (e.delivered || !same(p, e.post) || rl.carrying < 0) return;
        if (rl.carrying !== i) { rl.wrong++; api.say("a9NotMine", C.ink); api.shake(0.1); sfxOk("step", { vol: 1.4 }); return; }
        e.delivered = true; e.deliveredT = now(api); rl.carrying = -1; rl.readAt.push({ i: i, t: +now(api).toFixed(2) });
        e.gates.forEach(function (g) {
          if (api.tileAt(g[0], g[1]) === SEAL) { api.setTile(g[0], g[1], "."); rl.opened++; }
          var gx = (g[0] + 0.5) * T, gy = (g[1] + 0.5) * T;
          if (typeof puff === "function") puff(gx, gy, 14, "rgba(160,160,150,0.9)", 40);
          if (typeof ring === "function") ring(gx, gy, "rgba(234,186,73,0.7)", T * 1.4, 0.6);
        });
        api.hunters.forEach(function (h) { h.path = []; h.pathKey = ""; h.pathT = 0; });
        sfxOk("stash"); api.shake(0.2); api.say("a9Read", C.gold);
      });
    },
    onDrawWorld: function (c, api) {
      if (!live(rl)) return;
      var tm = typeof simTime === "number" ? simTime : 0;
      rl.list.forEach(function (e, i) {
        var col = RIB[i % RIB.length], ready = e.after == null || (rl.list[e.after] && rl.list[e.after].delivered);
        if (e.note && !e.delivered && rl.carrying !== i && ready) {
          var nx = (e.note[0] + 0.5) * T, ny = e.note[1] * T + 12 + Math.sin(tm * 2.4 + i) * 1.5;
          glow(c, nx, ny, 15, col, 0.22);
          drawScroll(c, nx, ny, col, 1.15);
        }
        if (e.post && !e.delivered) {
          var px = (e.post[0] + 0.5) * T, py = e.post[1] * T, mine = rl.carrying === i;
          if (mine) glow(c, px, py + 10, 18 + Math.sin(tm * 5) * 3, col, 0.3);
          c.fillStyle = "#3b2a1a"; c.fillRect(px + 8, py - 12, 2, 16);
          c.fillStyle = col; c.fillRect(px + 10, py - 12, 9, 6);
        }
        if (e.delivered) {
          var sx = (e.post[0] + 0.5) * T, sy = e.post[1] * T + 2;
          c.fillStyle = "#8fe08a"; c.fillRect(sx - 4, sy + 2, 2, 2); c.fillRect(sx - 2, sy + 4, 2, 2); c.fillRect(sx, sy + 2, 2, 2); c.fillRect(sx + 2, sy, 2, 2);
        }
      });
      if (rl.carrying >= 0) {
        var hy = (typeof player.labelY === "number" && player.labelY < player.y) ? player.labelY - 4 : player.y - 34;
        drawScroll(c, player.x, hy, RIB[rl.carrying % RIB.length], 0.8);
      }
    }
  });

  var ld = null;
  BH.tiles.register(STRAY, { marker: true, base: ".", claim: "a9lead" });
  function withList() { return ld.strays.filter(function (s) { return s.st === "with"; }).sort(function (a, b) { return a.slot - b.slot; }); }
  function backAlong(dist) {
    var px = player.x, py = player.y, left = dist;
    for (var i = ld.crumbs.length - 1; i >= 0; i--) {
      var c = ld.crumbs[i], d = Math.hypot(px - c.x, py - c.y);
      if (d >= left) { var k = left / d; return { x: px + (c.x - px) * k, y: py + (c.y - py) * k }; }
      left -= d; px = c.x; py = c.y;
    }
    return { x: px, y: py };
  }
  function strayLit(h, s) {
    var d = Math.hypot(s.x - h.x, s.y - h.y);
    if (h.type === "dog") return d < D_SENSE * T;
    if (d < SENSE * T) return true;
    if (s.inBush) return false;
    if (d > visionOf(h) * T || Math.abs(angDiff(Math.atan2(s.y - h.y, s.x - h.x), h.dir)) > CONE) return false;
    return losClear(h.x, h.y, s.x, s.y);
  }
  function scatter(s, h, api) {
    var fx = s.x, fy = s.y;
    if (typeof puff === "function") puff(fx, fy, 14, "rgba(190,235,255,0.8)", 40);
    s.st = "home"; s.x = (s.home[0] + 0.5) * T; s.y = (s.home[1] + 0.5) * T; s.seenT = 0; s.slot = 99; s.inWater = false;
    s.scaredUntil = now(api) + SCARED;
    if (typeof puff === "function") puff(s.x, s.y, 10, "rgba(190,235,255,0.6)", 30);
    ld.scatters.push({ t: +now(api).toFixed(2), by: api.hunters.indexOf(h) });
    withList().forEach(function (q, k) { q.slot = k; });
    if (h && !ghosted() && h.state !== "chase" && h.state !== "follow" && h.state !== "rush") {
      h.state = "check"; h.target = { x: fx, y: fy }; h.path = []; h.pathKey = ""; h.checkT = 0;
    }
    if (typeof floatText === "function") floatText(fx, fy - 18, WORDS.a9Scatter.word, C.ice, "", 1.1);
    sfxOk("splash"); api.shake(0.15);
    if (!ld.saidScatter) { ld.saidScatter = true; api.say("a9Scatter", C.ink); }
  }
  function denGate(api, open) {
    if (!ld.den) return;
    if (open && ld.denShut) { api.setTile(ld.den[0], ld.den[1], "."); ld.denShut = false; }
    else if (!open && !ld.denShut) {
      var p = ptile(api.player); if (same(p, ld.den) || Math.hypot(api.player.x - (ld.den[0] + 0.5) * T, api.player.y - (ld.den[1] + 0.5) * T) < 0.9 * T) return;
      api.setTile(ld.den[0], ld.den[1], "#"); ld.denShut = true;
    }
  }
  BH.features.register("a9lead", {
    copy: COPY.a9lead,
    onLevelStart: function (level, api) {
      var mk = (api.markers && api.markers[STRAY]) || [];
      var d = null; (level.map || []).forEach(function (row, y) { var x = row.indexOf("D"); if (x >= 0) d = [x, y]; });
      ld = { level: level, strays: mk.map(function (m, i) { return { home: [m.tx, m.ty], x: (m.tx + 0.5) * T, y: (m.ty + 0.5) * T, st: "wait", slot: 99, seenT: 0,
               dir: "down", anim: "idle", animT0: 0, inWater: false, inBush: false, id: i }; }),
             crumbs: [], printMark: 0, mixed: 0, lost: 0, scatters: [], calls: [], joins: 0, den: d, denShut: false, saidMixed: false, saidScatter: false, saidJoin: false };
      if (ld.strays.length) denGate(api, false);
    },
    onStep: function (dt, api) {
      if (!live(ld) || game.phase !== "play") return;
      var p = api.player, t = now(api);
      var last = ld.crumbs[ld.crumbs.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 2) { ld.crumbs.push({ x: p.x, y: p.y }); if (ld.crumbs.length > 400) ld.crumbs.shift(); }
      ld.strays.forEach(function (s) {
        if (s.st === "with" || t < (s.scaredUntil || 0) || Math.hypot(s.x - p.x, s.y - p.y) > JOIN_R * T) return;
        s.st = "with"; s.slot = withList().length; ld.joins++;
        if (typeof ring === "function") ring(s.x, s.y, "rgba(234,186,73,0.7)", T * 1.2, 0.5);
        sfxOk("coin");
        if (!ld.saidJoin) { ld.saidJoin = true; api.say("a9Join", C.gold); }
      });
      var list = withList();
      list.forEach(function (s, k) {
        var to = backAlong((k + 1) * GAP * T), dx = to.x - s.x, dy = to.y - s.y, d = Math.hypot(dx, dy);
        var sp = SPEED_SPRINT * T * 1.3 * dt, ox = s.x, oy = s.y;
        if (d > sp) { s.x += dx / d * sp; s.y += dy / d * sp; } else { s.x = to.x; s.y = to.y; }
        var mv = Math.hypot(s.x - ox, s.y - oy), a = mv > 0.3 ? "walk" : "idle";
        if (mv > 0.3) s.dir = Math.abs(s.x - ox) > Math.abs(s.y - oy) ? (s.x > ox ? "right" : "left") : (s.y > oy ? "down" : "up");
        if (a !== s.anim) { s.anim = a; s.animT0 = t; }
      });
      ld.strays.forEach(function (s) { var c = tile(Math.floor(s.x / T), Math.floor(s.y / T)); s.inWater = isWater(c); s.inBush = c === "b"; });
      var prs = api.prints;
      for (var i = ld.printMark; i < prs.length; i++) if (list.length >= MIX && !prs[i].a9mixed) { prs[i].a9mixed = true; ld.mixed++; }
      ld.printMark = prs.length;
      api.hunters.forEach(function (h) {
        if (h.state !== "follow") return;
        var q = prs[h.followIdx];
        if (!q || !q.a9mixed) return;
        loseTrail(h); ld.lost++;
        if (typeof floatText === "function") floatText(q.x, q.y - 16, WORDS.a9Mixed.word, C.ice, "", 1.1);
        if (!ld.saidMixed) { ld.saidMixed = true; api.say("a9Mixed", C.ice); }
      });
      list.forEach(function (s) {
        if (s.st !== "with" || s.inWater) { s.seenT = 0; return; }
        var by = null, touch = null;
        api.hunters.forEach(function (h) {
          if (Math.hypot(h.x - s.x, h.y - s.y) < CATCH * T * 1.2) touch = touch || h;
          else if (strayLit(h, s)) by = by || h;
        });
        if (touch) { scatter(s, touch, api); return; }
        if (!by) { s.seenT = Math.max(0, s.seenT - dt); return; }
        s.seenT += dt;
        if (s.seenT < SEEN_CALL) return;
        s.seenT = 0; ld.calls.push({ t: +t.toFixed(2), by: api.hunters.indexOf(by), sent: false });
        if (!ghosted() && CALM[by.state]) {
          by.state = "check"; by.target = { x: s.x, y: s.y }; by.path = []; by.pathKey = ""; by.checkT = 0; ld.calls[ld.calls.length - 1].sent = true;
          if (typeof floatText === "function") floatText(s.x, s.y - 22, "?", C.gold, "", 0.9);
        }
      });
      if (ld.strays.length) denGate(api, withList().length === ld.strays.length);
    },
    onDrawWorld: function (c, api) {
      if (!live(ld)) return;
      var t = now(api);
      if (liveFrame) {
        c.fillStyle = "rgba(190,235,255,0.35)";
        api.prints.forEach(function (q) {
          if (!q.a9mixed || simTime - q.t > 20) return;
          c.fillRect(q.x - 4, q.y + 2, 2, 3); c.fillRect(q.x + 3, q.y - 3, 2, 3); c.fillRect(q.x + 1, q.y + 4, 2, 2);
        });
      }
      ld.strays.forEach(function (s) {
        var feet = s.y + 8, sc = 0.72, waiting = s.st !== "with";
        if (s.inWater) { var f = (t * 0.9 + s.id * 0.3) % 1; c.strokeStyle = "rgba(190,235,255," + (0.45 * (1 - f)).toFixed(3) + ")"; c.lineWidth = 1; c.beginPath(); c.ellipse(s.x, feet, 6 + f * 12, 2 + f * 5, 0, 0, 6.283); c.stroke(); }
        else { c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(s.x, feet, 8, 2.8, 0, 0, 6.283); c.fill(); }
        c.save(); c.translate(s.x, feet); c.scale(sc, sc); c.translate(-s.x, -feet);
        var top = drawBitfoot(s.x, feet, s.dir, waiting ? "idle" : s.anim, t - s.animT0, s.inWater ? 0.85 : 1);
        c.restore();
        var hy = feet - (feet - top) * sc - 6;
        if (waiting) {
          var b = Math.sin(t * 3 + s.id) * 1.5;
          c.fillStyle = C.gold; c.font = "700 11px 'Plex Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("?", s.x, hy - 2 + b);
        } else if (s.seenT > 0) {
          c.strokeStyle = C.red; c.lineWidth = 2; c.beginPath(); c.arc(s.x, hy - 2, 5, -1.5708, -1.5708 + 6.283 * Math.min(1, s.seenT / SEEN_CALL)); c.stroke();
        }
      });
      if (ld.den && ld.denShut) {
        var dx = (ld.den[0] + 0.5) * T, dy = (ld.den[1] + 0.5) * T;
        if (typeof drawDen === "function") drawDen(c, ld.den[0] * T, ld.den[1] * T);
        tag(c, "BRING ALL " + ld.strays.length + " · " + withList().length + "/" + ld.strays.length, dx, dy + T * 0.75, C.gold);
      }
    }
  });

  var cl = null;
  BH.tiles.register(STUMP, { claim: "a9clear", draw: function (b, px, py, x, y) {
    b.fillStyle = "#3a2c1a"; b.fillRect(px + 2, py + 20, 28, 8);
    b.fillStyle = "#6b4a2e"; b.fillRect(px + 9, py + 14, 14, 12); b.fillStyle = "#c8a070"; b.fillRect(px + 9, py + 12, 14, 4);
    b.fillStyle = "#8a6440"; b.fillRect(px + 12, py + 13, 8, 2); b.fillStyle = "#4a3320"; b.fillRect(px + 15, py + 13, 2, 2);
    b.fillStyle = "#2b5a2a"; b.fillRect(px + 3 + Math.floor(hash(x, y) * 6), py + 26, 5, 2);
  } });
  BH.tiles.register(MUD, { claim: "a9clear", draw: function (b, px, py, x, y) {
    b.fillStyle = "#2a2116"; b.fillRect(px, py, T, T);
    for (var k = 0; k < 4; k++) { var hx = hash(x * 5 + k, y * 3 - k), hy = hash(y * 7 + k, x + k); b.fillStyle = hx > 0.5 ? "#3a2e1e" : "#1d170f"; b.fillRect(px + Math.floor(hx * 24), py + Math.floor(hy * 26), 7, 3); }
    b.fillStyle = "rgba(120,150,170,0.25)"; b.fillRect(px + 4 + Math.floor(hash(y, x) * 14), py + 12, 8, 2);
  } });
  function clearCfg(level) { var c = level.a9clear || {}; return { every: +c.every > 0 ? +c.every : 4, start: +c.start >= 0 ? +c.start : 6, from: +c.from > 0 ? +c.from : 1 }; }
  function cutFor(cfg, t) { return t < cfg.start ? cfg.from : cfg.from + 1 + Math.floor((t - cfg.start) / cfg.every); }
  function isStash(x, y) { return typeof stashes !== "undefined" && stashes.some(function (s) { return s.tx === x && s.ty === y; }); }
  BH.features.register("a9clear", {
    copy: COPY.a9clear,
    onLevelStart: function (level) {
      var cfg = clearCfg(level);
      cl = { level: level, cfg: cfg, cutTo: cfg.from, cuts: 0, drained: 0, seenAround: 0, saidSaw: false, saidOpen: false, spotted: 0 };
    },
    onStep: function (dt, api) {
      if (!live(cl) || game.phase !== "play") return;
      var t = now(api), to = Math.min(cutFor(cl.cfg, t), (grid[0] || []).length);
      if (to > cl.cutTo) {
        for (var x = cl.cutTo; x < to; x++) for (var y = 0; y < grid.length; y++) {
          var c = api.tileAt(x, y);
          if (c === "b") { api.setTile(x, y, STUMP); cl.cuts++; }
          else if (c === "~" && !isStash(x, y)) { api.setTile(x, y, MUD); cl.drained++; }
        }
        cl.cutTo = to;
        var near = Math.abs(api.player.x / T - to) < 12;
        if (near) { sfxOk("step", { vol: 1.8 }); api.shake(0.08); }
        if (!cl.saidSaw) { cl.saidSaw = true; api.say("a9Saw", C.gold); }
      }
      var p = api.player, open = Math.floor(p.x / T) < cl.cutTo && !p.inShield && !ghosted();
      if (open && !cl.saidOpen) { cl.saidOpen = true; api.say("a9Open", C.ink); }
      api.hunters.forEach(function (h) {
        var sees = false;
        if (open && h.type !== "dog" && h.state !== "chase") {
          var d = Math.hypot(p.x - h.x, p.y - h.y);
          sees = d <= visionOf(h) * T && d >= SENSE * T && Math.abs(angDiff(Math.atan2(p.y - h.y, p.x - h.x), h.dir)) > CONE && losClear(h.x, h.y, p.x, p.y);
        }
        if (!sees) { h.a9sus = Math.max(0, (h.a9sus || 0) - 0.5 * dt); return; }
        var ft = typeof susFillTime === "function" ? susFillTime(h) : 0.6;
        h.a9sus = Math.min(1, (h.a9sus || 0) + dt / Math.max(0.05, ft));
        h.sus = Math.max(h.sus || 0, Math.min(0.49, h.a9sus)); h.lastSeen = { x: p.x, y: p.y }; cl.seenAround++;
        if (h.a9sus >= 1) { h.a9sus = 0; spotted(h); cl.spotted++; }
      });
    },
    onDrawWorld: function (c, api) {
      if (!live(cl)) return;
      var t = now(api), H = (grid.length || 0) * T, fx = cl.cutTo * T, started = t >= cl.cfg.start;
      if (cl.cutTo > cl.cfg.from) { c.fillStyle = "rgba(150,110,60,0.13)"; c.fillRect(cl.cfg.from * T, 0, fx - cl.cfg.from * T, H); }
      var next = !started ? cl.cfg.start - t : cl.cfg.every - ((t - cl.cfg.start) % cl.cfg.every);
      var pulse = (started ? 0.08 : 0.04) + (started ? 0.12 : 0.06) * (Math.sin(t * (next < 1.5 ? 16 : 6)) + 1) / 2;
      c.fillStyle = "rgba(200,65,47," + pulse.toFixed(3) + ")"; c.fillRect(fx, 0, T, H);
      c.fillStyle = "#c8a070";
      for (var y = 0; y < H; y += 8) c.fillRect(fx - 2 + ((y / 8) % 2 ? 2 : 0), y, 3, 5);
      for (var by = 3; by * T < H - T; by += 4) {
        var bx = fx, byy = by * T + T / 2, rot = started ? t * 14 : 0;
        c.fillStyle = "#8d949c"; c.beginPath(); c.arc(bx, byy, 9, 0, 6.283); c.fill();
        c.fillStyle = "#d8dde2";
        for (var k = 0; k < 8; k++) { var a = rot + k * 0.785; c.fillRect(bx + Math.cos(a) * 9 - 1.5, byy + Math.sin(a) * 9 - 1.5, 3, 3); }
        c.fillStyle = "#3a3f45"; c.beginPath(); c.arc(bx, byy, 3, 0, 6.283); c.fill();
      }
      for (var ry = 5; ry * T < H - T; ry += 6) {
        var cx = fx + T / 2 + 14, cy = ry * T, r = 7, frac = !started ? 1 - next / Math.max(1, cl.cfg.start) : 1 - next / cl.cfg.every;
        c.fillStyle = "rgba(20,20,20,0.9)"; c.beginPath(); c.arc(cx, cy, r + 2, 0, 6.283); c.fill();
        c.fillStyle = C.red; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, -1.5708, -1.5708 + 6.283 * Math.max(0, Math.min(1, frac))); c.closePath(); c.fill();
      }
    }
  });

  var prevState = BH.featureState;
  BH.featureState = function (id) {
    if (id === "a9relay") return live(rl) ? { carrying: rl.carrying, took: rl.took, wrong: rl.wrong, opened: rl.opened, readAt: rl.readAt.slice(),
      delivered: rl.list.map(function (e) { return e.delivered; }) } : null;
    if (id === "a9lead") return live(ld) ? { total: ld.strays.length, with: withList().length, joins: ld.joins, mixed: ld.mixed, lost: ld.lost, scatters: ld.scatters.slice(), calls: ld.calls.slice(),
      denShut: ld.denShut, strays: ld.strays.map(function (s) { return { st: s.st, at: [+(s.x / T).toFixed(2), +(s.y / T).toFixed(2)], inWater: s.inWater }; }) } : null;
    if (id === "a9clear") return live(cl) ? { cutTo: cl.cutTo, cuts: cl.cuts, drained: cl.drained, seenAround: cl.seenAround, spotted: cl.spotted, every: cl.cfg.every, start: cl.cfg.start } : null;
    return typeof prevState === "function" ? prevState(id) : null;
  };
})();
