"use strict";

(function () {
  if (!window.BH || !BH.features || !BH.tiles) return;

  var ELDER = "⌘", FAKE = "☘", SPOT = "⁂";
  var LOOK = { oak: "char-010", sly: "char-052" };
  var GAP = 1.0, JOIN_R = 1.1, SCARED = 2.5, FIND_R = 1.2;
  var CAMEOS = ["char-001", "char-046", "char-026", "char-058", "char-114", "char-074", "char-062", "char-002", "char-003",
    "char-005", "char-006", "char-007", "char-008", "char-009", "char-011", "char-012", "char-013", "char-014",
    "char-015", "char-016", "char-017", "char-018", "char-019", "char-021", "char-022", "char-023", "char-025", "char-027"];

  function sfxOk(n, o) { try { if (typeof sfx === "function") sfx(n, o); } catch (e) {} }
  function tnow() { return typeof simTime === "number" ? simTime : 0; }
  function wet(x, y) { return isWater(tile(Math.floor(x / T), Math.floor(y / T))); }
  function tid() { return (typeof L !== "undefined" && L && L.tid) || ""; }
  function pill(c, text, x, y, col) {
    c.font = "600 9px 'Plex Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
    var w = c.measureText(text).width + 8;
    c.fillStyle = "rgba(27,27,27,0.85)"; c.fillRect(Math.round(x - w / 2), Math.round(y - 6), Math.round(w), 12);
    c.fillStyle = col || C.ink; c.fillText(text, x, y);
  }
  function sparkle(x, y, n) {
    if (typeof puff === "function") { puff(x, y, n, "rgba(255,224,138,0.95)", 34); puff(x, y, Math.ceil(n / 2), "rgba(190,235,255,0.9)", 24); }
  }

  var rs = null;
  BH.tiles.register(ELDER, { marker: true, base: ".", claim: "funrescue" });
  function backAlong(dist) {
    var px = player.x, py = player.y, left = dist;
    for (var i = rs.crumbs.length - 1; i >= 0; i--) {
      var c = rs.crumbs[i], d = Math.hypot(px - c.x, py - c.y);
      if (d >= left) { var k = left / d; return { x: px + (c.x - px) * k, y: py + (c.y - py) * k }; }
      left -= d; px = c.x; py = c.y;
    }
    return { x: px, y: py };
  }
  function walkTo(e, to, sp) {
    var dx = to.x - e.x, dy = to.y - e.y, d = Math.hypot(dx, dy), ox = e.x, oy = e.y;
    if (d > sp) { e.x += dx / d * sp; e.y += dy / d * sp; } else { e.x = to.x; e.y = to.y; }
    var mv = Math.hypot(e.x - ox, e.y - oy), a = mv > 0.3 ? "walk" : "idle";
    if (mv > 0.3) e.dir = Math.abs(e.x - ox) > Math.abs(e.y - oy) ? (e.x > ox ? "right" : "left") : (e.y > oy ? "down" : "up");
    if (a !== e.anim) { e.anim = a; e.t0 = tnow(); }
    return d <= sp;
  }
  var GIFT = 2;
  function deep(e, p) {
    var tx0 = Math.floor(e.x / T), ty0 = Math.floor(e.y / T), best = { x: e.x, y: e.y }, bs = -1;
    for (var ty = ty0 - 5; ty <= ty0 + 5; ty++) for (var tx = tx0 - 5; tx <= tx0 + 5; tx++) {
      if (!isWater(tile(tx, ty))) continue;
      var cx = (tx + 0.5) * T, cy = (ty + 0.5) * T, n = 0, ok = true, d = Math.hypot(cx - e.x, cy - e.y);
      for (var k = 0; k <= d; k += 8) if (!wet(e.x + (cx - e.x) * k / (d || 1), e.y + (cy - e.y) * k / (d || 1))) { ok = false; break; }
      if (!ok) continue;
      for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) if (isWater(tile(tx + i, ty + j))) n++;
      var sc = n * 10 + Math.min(d, 4 * T) / T + Math.hypot(cx - p.x, cy - p.y) / T;
      if (sc > bs) { bs = sc; best = { x: cx, y: cy }; }
    }
    return best;
  }
  BH.features.register("funrescue", {
    onLevelStart: function (level, api) {
      var cfg = level.funrescue || {}, mk = (api.markers && api.markers[ELDER]) || [];
      var spots = mk.map(function (m) { return [m.tx, m.ty]; });
      if (cfg.at) spots.push(cfg.at);
      if (BH.trailFeature && !BH.trailFeature.api) BH.trailFeature.api = api;
      var who = cfg.who ||(api.levelIdx % 2 ? "sly" : "oak");
      rs = { level: level, crumbs: [], gifts: [], flash: 0, saved: 0, scares: 0, joins: 0,
        elders: spots.map(function (s, i) { return { id: i ? (who === "oak" ? "sly" : "oak") : who, home: s, x: (s[0] + 0.5) * T, y: (s[1] + 0.5) * T,
          st: "stuck", dir: "down", anim: "idle", t0: tnow(), scaredUntil: 0, savedAt: 0, scareAt: -9 }; }) };
    },
    onStep: function (dt, api) {
      if (!rs || rs.level !== L || game.phase !== "play") return;
      var p = api.player, t = tnow(), last = rs.crumbs[rs.crumbs.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 2) { rs.crumbs.push({ x: p.x, y: p.y }); if (rs.crumbs.length > 400) rs.crumbs.shift(); }
      while (rs.gifts.length && t >= rs.gifts[0]) { rs.gifts.shift(); if (typeof coins !== "undefined") coins.push({ x: p.x, y: p.y, got: false, ph: rs.gifts.length }); }
      var sp = SPEED_SPRINT * T * 1.3 * dt, slot = 0;
      rs.elders.forEach(function (e) {
        if (e.st === "stuck" && t >= e.scaredUntil && Math.hypot(e.x - p.x, e.y - p.y) < JOIN_R * T) {
          e.st = "with"; rs.joins++;
          if (typeof ring === "function") ring(e.x, e.y, "rgba(234,186,73,0.7)", T * 1.2, 0.5);
          sfxOk("coin");
          if (typeof floatText === "function") floatText(e.x, e.y - 30, "WITH YOU", C.gold, "", 0.9);
        }
        if (e.st === "with") {
          slot++;
          walkTo(e, backAlong(slot * GAP * T), sp);
          if (wet(e.x, e.y)) {
            e.st = "safe"; e.savedAt = t; rs.saved++;
            sparkle(e.x, e.y - 10, 18);
            if (typeof ring === "function") { ring(e.x, e.y, "rgba(255,224,138,0.85)", T * 1.6, 0.6); ring(e.x, e.y, "rgba(190,235,255,0.7)", T * 2.2, 0.9); }
            sfxOk("solved"); sfxOk("splash"); api.shake(0.15);
            if (typeof floatText === "function") floatText(e.x, e.y - 34, "SAVED", C.gold, "", 1.6);
            for (var g = 0; g < GIFT; g++) rs.gifts.push(t + 0.15 + g * 0.45);
          }
        } else if (e.st === "safe" && t - e.savedAt > 1.3) {
          e.dest = deep(e, p); e.st = "swim"; e.t0 = t;
        } else if (e.st === "swim") {
          if (walkTo(e, e.dest, SPEED_WATER * T * dt)) { e.st = "dive"; e.diveAt = t; e.anim = "idle"; sfxOk("splash"); if (typeof ring === "function") ring(e.x, e.y + 10, "rgba(190,235,255,0.8)", T * 1.3, 0.7); }
        } else if (e.st === "dive" && t - e.diveAt > 0.9) {
          e.st = "gone"; if (typeof ring === "function") ring(e.x, e.y + 10, "rgba(190,235,255,0.6)", T * 1.8, 0.9);
        } else if (e.st === "flee") {
          if (walkTo(e, { x: (e.home[0] + 0.5) * T, y: (e.home[1] + 0.5) * T }, SPEED_SPRINT * T * 1.6 * dt)) { e.st = "stuck"; e.anim = "idle"; e.dir = "down"; }
        } else if (e.st === "safe" && e.anim !== "idle") { e.anim = "idle"; e.t0 = t; }
        if (e.st === "safe" || wet(e.x, e.y)) return;
        var touch = api.hunters.some(function (h) { return Math.hypot(h.x - e.x, h.y - e.y) < CATCH * T * 1.4; });
        if (!touch) return;
        if (t - e.scareAt > 0.8) {
          e.scareAt = t; rs.scares++;
          if (typeof puff === "function") puff(e.x, e.y, 12, "rgba(255,255,255,0.8)", 40);
          sfxOk("spotted"); api.shake(0.12);
          if (typeof floatText === "function") floatText(e.x, e.y - 30, "SCARED", C.red, "", 1);
        }
        if (e.st === "with") { e.st = "flee"; e.scaredUntil = t + SCARED; }
      });
    },
    onDrawWorld: function (c) {
      if (!rs || rs.level !== L) return;
      var t = tnow(), near = typeof hunters !== "undefined" ? hunters : [];
      rs.elders.forEach(function (e, i) {
        if (e.st === "gone") return;
        var feet = e.y + 10, inW = wet(e.x, e.y), jx = 0, jy = 0;
        if (e.st === "dive") {
          var q = Math.min(1, (t - e.diveAt) / 0.9), hop = q < 0.3 ? -Math.sin(q / 0.3 * Math.PI) * 10 : 0, sink = q < 0.3 ? 0 : (q - 0.3) / 0.7;
          var tp = drawBitfoot(e.x, -999, "down", "idle", 0, 0, { char: LOOK[e.id] || LOOK.oak }), hgt = tp != null ? -999 - tp : 46;
          c.save(); c.beginPath(); c.rect(e.x - T, feet - hgt - 20, T * 2, hgt + 20 - 2); c.clip();
          drawBitfoot(e.x, feet + hop + sink * (hgt + 4), "down", "idle", 0, 0.85, { char: LOOK[e.id] || LOOK.oak });
          c.restore();
          for (var bb = 0; bb < 4; bb++) { var by = feet - 4 - ((t * 30 + bb * 9) % 26); c.fillStyle = "rgba(220,245,255," + (0.7 * q).toFixed(3) + ")"; c.fillRect(e.x - 8 + bb * 5 + Math.sin(t * 6 + bb) * 2, by, 2, 2); }
          return;
        }
        var scared = e.st !== "safe" && near.some(function (h) { return Math.hypot(h.x - e.x, h.y - e.y) < T * 6; });
        if (e.st === "safe") { var k = t - e.savedAt; if (k < 1.4) jy = -Math.abs(Math.sin(k * Math.PI / 0.35)) * 9; }
        else if (e.st === "stuck" || e.st === "flee") jx = Math.round(Math.sin(t * (scared ? 44 : 26) + i) * (scared ? 1.6 : 0.8));
        if (t - e.scareAt < 0.4) jy = -Math.sin((t - e.scareAt) / 0.4 * Math.PI) * 8;
        if (inW) { var f = (t * 0.9 + i * 0.3) % 1; c.strokeStyle = "rgba(190,235,255," + (0.5 * (1 - f)).toFixed(3) + ")"; c.lineWidth = 1.5; c.beginPath(); c.ellipse(e.x, feet, 8 + f * 16, 3 + f * 6, 0, 0, 6.283); c.stroke(); }
        else { c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(e.x, feet, 10, 3.5, 0, 0, 6.283); c.fill(); }
        var dir = e.dir;
        if (e.anim === "idle" && Math.abs(player.x - e.x) < T * 4) dir = player.x > e.x ? "right" : "left";
        var top = drawBitfoot(e.x + jx, feet + jy, dir, e.anim, t - e.t0, inW ? 0.85 : 1, { char: LOOK[e.id] || LOOK.oak });
        if (e.st === "stuck" || e.st === "flee") {
          var b = Math.sin(t * 6 + i) * 2, y = top - 10 + b;
          c.fillStyle = "#000"; c.fillRect(e.x - 5, y - 8, 10, 14);
          c.fillStyle = scared ? C.red : C.gold; c.fillRect(e.x - 1.5, y - 6, 3, 7); c.fillRect(e.x - 1.5, y + 2.5, 3, 2.5);
        } else if (e.st === "safe" && t - e.savedAt < 2.5) {
          var a = 1 - (t - e.savedAt) / 2.5;
          for (var s = 0; s < 4; s++) {
            var an = t * 3 + s * 1.57, r = 12 + Math.sin(t * 5 + s) * 3;
            c.fillStyle = "rgba(255,224,138," + a.toFixed(3) + ")"; c.fillRect(e.x + Math.cos(an) * r - 1, top + 6 + Math.sin(an) * r * 0.6 - 1, 2, 2);
          }
        }
      });
      if (dens && rs.saved < rs.elders.length) pill(c, "RESCUE " + rs.saved + "/" + rs.elders.length, dens.x, dens.y + T * 0.75, C.gold);
    }
  });
  var baseTryDen = window.tryDen;
  window.tryDen = function () {
    if (rs && rs.level === L && (L.features || []).indexOf("funrescue") >= 0 && rs.saved < rs.elders.length) {
      var need = L.need, df = denFlash;
      L.need = 1e9; denFlash = simTime + 99;
      try { baseTryDen.apply(this, arguments); } finally { L.need = need; denFlash = df; }
      if (tnow() > rs.flash) { rs.flash = tnow() + 1.5; if (typeof popRaw === "function") popRaw("LEAD THEM TO THE WATERS", C.gold); }
      return;
    }
    return baseTryDen.apply(this, arguments);
  };

  var sc = null, session = {};
  BH.tiles.register(FAKE, { solidHunter: true, claim: "funsecret", draw: function (b, px, py, x, y) { drawPine(b, px, py, hash(x, y)); } });
  BH.tiles.register(SPOT, { marker: true, base: ".", claim: "funsecret" });
  function realTids() {
    var seen = {};
    (window.LEVELS || []).forEach(function (l) { if (l && l.tid && l.tid.indexOf("fun") !== 0) seen[l.tid] = 1; });
    return Object.keys(seen);
  }
  function foundCount() {
    var f = (typeof save !== "undefined" && save && save.funSecrets) || {}, n = 0;
    Object.keys(f).forEach(function (k) { if (f[k]) n++; });
    Object.keys(session).forEach(function (k) { if (!f[k]) n++; });
    return n;
  }
  function pose(tp) {
    var rec = sc && sc.level === L && sc.rec; if (!rec || !rec.length) return;
    var lo = 0, hi = rec.length - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (rec[mid].t <= tp) lo = mid; else hi = mid - 1; }
    var a = rec[lo], b = rec[Math.min(rec.length - 1, lo + 1)], f = b.t > a.t ? Math.max(0, Math.min(1, (tp - a.t) / (b.t - a.t))) : 0;
    if (!sc.posed) sc.posed = { x: sc.ent.x, y: sc.ent.y };
    sc.ent.x = a.x + (b.x - a.x) * f; sc.ent.y = a.y + (b.y - a.y) * f;
  }
  function unpose() { if (sc && sc.posed) { sc.ent.x = sc.posed.x; sc.ent.y = sc.posed.y; sc.posed = null; } }
  BH.funSecrets = { found: foundCount, total: function () { return realTids().length; }, rescue: function () { return rs; }, secret: function () { return sc; }, pose: pose, unpose: unpose };
  var FREED = "freed-", CH = BH.characters;
  function freed(id, s) { return !!(s && s.chars && typeof s.chars === "object" && s.chars[FREED + id] === true); }
  if (CH && CH.status && CH.worn) {
    var baseStatus = CH.status, baseWorn = CH.worn;
    CH.status = function (id, s) {
      var st = baseStatus.apply(this, arguments);
      return st.state !== "owned" && freed(id, s) && CH.get(id) ? { state: "owned", price: 0, text: st.text } : st;
    };
    CH.worn = function (s) {
      var w = baseWorn.apply(this, arguments); if (w) return w;
      var id = s && s.char;
      return id && freed(id, s) && CH.get(id) ? id : null;
    };
  }
  function owns(id) { return !!(CH && CH.status && CH.status(id, save).state === "owned"); }
  function unlock(id) {
    if (!id || owns(id)) return false;
    save.chars = save.chars && typeof save.chars === "object" ? save.chars : {};
    save.chars[FREED + id] = true;
    if (typeof persist === "function") persist();
    return true;
  }
  function cameoFor(id) {
    var worn = CH && CH.worn ? CH.worn(save) : null;
    var ok = CAMEOS.filter(function (c) { return c !== worn && (!CH || !CH.get || CH.get(c)); });
    var list = ok.filter(function (c) { return !owns(c); });
    if (!list.length) list = ok.length ? ok : CAMEOS;
    var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return list[h % list.length];
  }
  var SIGN_S = 5, TALK_GAP = 3.6, FREE_IN = 1.4;
  var RIVER_SAYS = [
      ["You found me! The hunters have new tech.", "They are tracking every Bitfoot. Take me to the waters."],
      ["Shh! A hunter walked right past me.", "He follows footprints. In the waters there are none. Let's go!"],
      ["Finally! I've been hiding here all day.", "Get me to the water and nobody can follow us."],
      ["You found my hiding spot!", "On land they read every step. Take me to the waters."],
      ["Hey! I lost my friends on the trail.", "In the waters nobody sees who swims with who. Let's go."],
      ["You saw through the tree! Nice.", "My footprints lead right here. The waters will hide them."],
      ["Over here! The hunters almost had me.", "Water leaves no trail. Take me there."],
      ["You're the one who swims, right?", "Take me to the waters. I can't stay on land."]],
    LAND_SAYS = [
      ["You found me! The hunters have new tech.", "They are tracking every Bitfoot, one footprint at a time.", "Every step leaves footprints. Keep moving!"],
      ["You found me! Stay close.", "Every step leaves footprints. Keep moving!"],
      ["Shh! Hunters read every footprint.", "Walk where they don't look."]],
    TALK_FREE = "No footprints in the waters. I'm free!";
  function hasRiver(rows) {
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) if (isWater(rows[y][x])) return true;
    return false;
  }
  function charName(id) { var it = BH.characters && BH.characters.get && BH.characters.get(id); return it && it.name ? it.name.toUpperCase() : "A BITFOOT"; }
  var otherUntil = -9;
  if (BH.talk && BH.talk.bubble) {
    var baseBubble = BH.talk.bubble;
    BH.talk.bubble = function (ent, text, secs) {
      if (sc && ent !== sc.ent) {
        otherUntil = tnow() + (secs || 3);
        if (sc.line && tnow() - sc.lineAt < TALK_GAP - 1) { sc.talk.unshift(sc.line); sc.line = null; baseBubble.call(this, sc.ent, "", -1); }
      }
      return baseBubble.apply(this, arguments);
    };
  }
  function says() { var pool = sc.river ? RIVER_SAYS : LAND_SAYS, n = typeof game !== "undefined" ? game.levelIdx || 0 : 0; return pool[n % pool.length]; }
  function talkTick() {
    if (!sc.talk.length || tnow() < sc.talkAt || tnow() < otherUntil + 0.2 || (BH.talk && BH.talk.isOpen && BH.talk.isOpen())) return;
    sc.line = sc.talk.shift(); sc.lineAt = tnow();
    if (BH.talk && BH.talk.bubble) BH.talk.bubble(sc.ent, sc.line, TALK_GAP - 0.2);
    sc.talkAt = tnow() + TALK_GAP;
  }
  function boxTalk(lines) {
    if (!BH.talk || !BH.talk.open || !BH.talk.voice) { sc.talk = lines.slice(); sc.talkAt = tnow() + 1.2; return; }
    BH.talk.voice("secret", { name: charName(sc.char), f: 400, wave: "triangle", speed: 30, color: "#ffe08a", vol: 0.05, every: 1, portrait: { char: sc.char } });
    BH.talk.open(lines.map(function (l) { return ["secret", l]; }));
  }
  function sign(title, sub) { sc.sign ={ title: title, sub: sub, t0: tnow() }; }
  function queueSign(x, y) { if (sc.sign) sc.signAt = [x, y]; }
  function drawSign(c, x, y) {
    var s = sc.sign; if (!s) return;
    var age = tnow() - s.t0; if (age > SIGN_S) { sc.sign = null; return; }
    var pop = age < 0.35 ? 1 - Math.pow(1 - age / 0.35, 3) : 1, a = Math.min(1, (SIGN_S - age) / 0.4);
    c.save(); c.globalAlpha = a;
    c.font = "700 13px 'Plex Cond', sans-serif"; c.letterSpacing = "1px";
    var tw = c.measureText(s.title).width;
    c.font = "600 8px 'Plex Cond', sans-serif"; c.letterSpacing = "0.5px";
    var sw = c.measureText(s.sub).width, bw = Math.round(Math.max(tw, sw) + 22), bh = 32;
    var bx = Math.round(x - bw / 2), by = Math.round(y - bh - 8 - (1 - pop) * 14 + Math.sin(age * 3) * 1);
    c.fillStyle = "#3b2a1a"; c.fillRect(Math.round(x) - 2, by + bh, 4, 8);
    c.fillStyle = "#1f130a"; c.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    c.fillStyle = "#86592f"; c.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    c.fillStyle = "#1f130a"; c.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    c.fillStyle = "#5a3a1f"; c.fillRect(bx, by, bw, bh);
    c.fillStyle = "#3f2815"; c.fillRect(bx, by + bh / 2, bw, bh / 2);
    c.fillStyle = "rgba(0,0,0,0.28)"; c.fillRect(bx, by + bh / 2 - 1, bw, 2);
    c.fillStyle = "#1f130a"; [[3, 3], [bw - 5, 3], [3, bh - 5], [bw - 5, bh - 5]].forEach(function (n) { c.fillRect(bx + n[0], by + n[1], 2, 2); });
    c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "700 13px 'Plex Cond', sans-serif"; c.letterSpacing = "1px";
    c.fillStyle = "#1f130a"; c.fillText(s.title, x, by + 11);
    c.fillStyle = C.gold; c.fillText(s.title, x, by + 10);
    c.font = "600 8px 'Plex Cond', sans-serif"; c.letterSpacing = "0.5px";
    c.fillStyle = "#fff3c4"; c.fillText(s.sub, x, by + 24);
    c.letterSpacing = "0px";
    c.restore();
  }
  function followTo(dist) {
    var px = player.x, py = player.y, left = dist, cr = sc.crumbs;
    for (var i = cr.length - 1; i >= 0; i--) {
      var c = cr[i], d = Math.hypot(px - c.x, py - c.y);
      if (d >= left) { var k = left / d; return { x: px + (c.x - px) * k, y: py + (c.y - py) * k }; }
      left -= d; px = c.x; py = c.y;
    }
    return { x: px, y: py };
  }
  function free() {
    var e = sc.ent, t = tnow();
    sc.st = "free"; sc.freeAt = t;
    sparkle(e.x, e.y - 10, 22);
    if (typeof ring === "function") { ring(e.x, e.y, "rgba(255,224,138,0.85)", T * 1.8, 0.6); ring(e.x, e.y, "rgba(190,235,255,0.7)", T * 2.6, 0.9); }
    sfxOk("splash");
    sc.talk = [TALK_FREE]; sc.talkAt = t;
  }
  BH.features.register("funsecret", {
    onLevelStart: function (level, api) {
      var cfg = level.funsecret || {}, sid = tid() || ("lv" + api.levelIdx), smem = (save.funSecrets || {})[sid];
      if (sid.indexOf("fun") !== 0 && typeof smem === "string" && owns(smem)) { (cfg.trees || []).forEach(function (q) { api.setTile(q[0], q[1], "#"); }); sc = null; return; }
      (cfg.clear || []).forEach(function (q) { api.setTile(q[0], q[1], "."); });
      (cfg.trees || []).forEach(function (q) { api.setTile(q[0], q[1], FAKE); });
      var mk = (api.markers && api.markers[SPOT]) || [], at = cfg.at || (mk[0] ? [mk[0].tx, mk[0].ty] : null);
      if (cfg.at) api.setTile(cfg.at[0], cfg.at[1], ".");
      var trees = [];
      api.tiles.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === FAKE) trees.push([x, y]); });
      if (BH.trailFeature && !BH.trailFeature.api) BH.trailFeature.api = api;
      var id = tid() || ("lv" + api.levelIdx);
      var mem = (save.funSecrets || {})[id], had = !!(mem || session[id]);
      var x0 = at ? (at[0] + 0.5) * T : 0, y0 = at ? (at[1] + 0.5) * T : 0;
      var who = cfg.char || (typeof mem === "string" && CH && CH.get && CH.get(mem) ? mem : cameoFor(id));
      sc = { level: level, id: id, trees: trees, at: at, char: who, found: had, foundAt: had ? -99 : 0, leafT: 0,
        x: x0, y: y0, st: "home", river: hasRiver(api.tiles), crumbs: [], talk: [], talkAt: 0, sign: null,
        ent: { x: x0, y: y0, topY: y0 - 40, dir: "down", anim: "idle", t0: 0 } };
    },
    onStep: function (dt, api) {
      if (!sc || sc.level !== L || !sc.at || game.phase !== "play") return;
      var p = api.player, t = tnow(), e = sc.ent, demo = sc.id.indexOf("fun") === 0;
      if (!sc.found && Math.hypot(p.x - sc.x, p.y - sc.y) < FIND_R * T) {
        sc.found = true; sc.foundAt = t;
        if (demo) session[sc.id] = true;
        else { save.funSecrets = save.funSecrets || {}; save.funSecrets[sc.id] = sc.char; if (typeof persist === "function") persist(); }
        sfxOk("coinIn"); setTimeout(function () { sfxOk("buy"); }, 140);
        sparkle(sc.x, sc.y - 14, 16);
        if (typeof ring === "function") ring(sc.x, sc.y, "rgba(255,224,138,0.8)", T * 1.8, 0.7);
        var tot = Math.max(BH.funSecrets.total(), foundCount());
        sign("SECRET FOUND", foundCount() + "/" + tot);
        if (!demo) {
          boxTalk(says());
          sc.st = "with"; sc.crumbs = [{ x: e.x, y: e.y }]; e.t0 = t;
        }
      } else if (sc.found && sc.st === "home" && !demo && !owns(sc.char) && Math.hypot(p.x - sc.x, p.y - sc.y) < FIND_R * T) {
        save.funSecrets = save.funSecrets || {}; save.funSecrets[sc.id] = sc.char;
        sc.st = "with"; sc.crumbs = [{ x: e.x, y: e.y }]; e.t0 = t;
        if (sc.river) boxTalk([says()[1]]);
      }
      if (sc.later && t >= sc.later.at) { sign(sc.later.title, sc.later.sub); sfxOk("buy"); sparkle(sc.x, sc.y - 14, 14); sc.later = null; }
      if (sc.st === "with") {
        var last = sc.crumbs[sc.crumbs.length - 1];
        if (Math.hypot(last.x - p.x, last.y - p.y) > 2) { sc.crumbs.push({ x: p.x, y: p.y }); if (sc.crumbs.length > 400) sc.crumbs.shift(); }
        walkTo(e, followTo(GAP * T), SPEED_SPRINT * T * 1.3 * dt);
        sc.wetT = sc.river && wet(e.x, e.y) ? (sc.wetT || 0) + dt : 0;
        if (sc.wetT > 0.5) free();
      }
      var rec = sc.rec || (sc.rec = []);
      if (!rec.length || simTime - rec[rec.length - 1].t >= 0.1) rec.push({ t: simTime, x: e.x, y: e.y });
      if (sc.found) talkTick();
      if (sc.trees.some(function (q) { return Math.hypot(p.x - (q[0] + 0.5) * T, p.y - (q[1] + 0.5) * T) < 2.2 * T; }) && t > sc.leafT) {
        sc.leafT = t + 1.6;
        var q = sc.trees[0];
        if (typeof particles !== "undefined") particles.push({ x: (q[0] + 0.5) * T + 10, y: (q[1] + 1) * T - 46, vx: -6, vy: 14, life: 1.2, t: 0, col: C.tree2 });
      }
    },
    onDrawWorld: function (c) {
      if (!sc || sc.level !== L || !sc.at) return;
      var t = tnow(), near = Math.hypot(player.x - sc.x, player.y - sc.y) < 4 * T, jy = 0, dir = "down", e = sc.ent;
      if (sc.st === "with" || sc.st === "free") {
        var feet = e.y + 10, inW = wet(e.x, e.y), look = { char: sc.char }, ft = 0;
        if (sc.st === "free") {
          ft = t - sc.freeAt;
          if (ft > 2.6) { queueSign(e.x, e.topY - 28); return; }
          var hop = ft < 1.5 ? -Math.abs(Math.sin(ft * Math.PI / 0.375)) * 10 : 0, sink = ft < 1.5 ? 0 : (ft - 1.5) / 1.1;
          var spin = ["down", "right", "up", "left"][Math.floor(ft * 8) % 4];
          var hgt = Math.max(30, feet - e.topY);
          c.save(); c.beginPath(); c.rect(e.x - T, feet - hgt - 30, T * 2, hgt + 28); c.clip();
          drawBitfoot(e.x, feet + hop + sink * (hgt + 4), ft < 1.5 ? spin : "down", "idle", 0, 0.9, look);
          c.restore();
          var ga = Math.max(0, 1 - ft / 2.6);
          for (var s2 = 0; s2 < 8; s2++) {
            var an2 = t * 4 + s2 * 0.785, r2 = 10 + ft * 14;
            c.fillStyle = "rgba(255,224,138," + ga.toFixed(3) + ")"; c.fillRect(e.x + Math.cos(an2) * r2 - 1, feet - hgt / 2 + Math.sin(an2) * r2 * 0.6 - 1, 2, 2);
          }
          queueSign(e.x, e.topY - 28);
          return;
        }
        if (inW) { var f = (t * 0.9) % 1; c.strokeStyle = "rgba(190,235,255," + (0.5 * (1 - f)).toFixed(3) + ")"; c.lineWidth = 1.5; c.beginPath(); c.ellipse(e.x, feet, 8 + f * 16, 3 + f * 6, 0, 0, 6.283); c.stroke(); }
        else { c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(e.x, feet, 10, 3.5, 0, 0, 6.283); c.fill(); }
        var fdir = e.anim === "idle" ? (player.x > e.x ? "right" : "left") : e.dir;
        var tp = drawBitfoot(e.x, feet, fdir, e.anim, t - e.t0, inW ? 0.85 : 1, look);
        if (tp != null) e.topY = tp;
        queueSign(e.x, e.topY - 28);
        return;
      }
      if (sc.found || near) {
        var k = t - sc.foundAt;
        jy = -Math.abs(Math.sin(t * 9)) * (sc.found && k < 3 ? 6 : 3);
        dir = Math.floor(t * 4) % 2 ? "left" : "right";
      }
      var dp = Math.hypot(player.x - sc.x, player.y - sc.y) / T, al = sc.found ? 1 : Math.max(0, Math.min(1, (3.2 - dp) / 1.2));
      if (al <= 0) return;
      c.fillStyle = "rgba(0,0,0," + (0.3 * al).toFixed(3) + ")"; c.beginPath(); c.ellipse(sc.x, sc.y + 10, 10, 3.5, 0, 0, 6.283); c.fill();
      var top = drawBitfoot(sc.x, sc.y + 10 + jy, dir, "idle", t, al, { char: sc.char });
      if (top != null) e.topY = top - jy;
      queueSign(sc.x, e.topY - 28);
      if (sc.found && t - sc.foundAt < 3) {
        var a = 1 - (t - sc.foundAt) / 3;
        for (var s = 0; s < 5; s++) {
          var an = t * 2.4 + s * 1.256, r = 14 + Math.sin(t * 4 + s) * 3;
          c.fillStyle = "rgba(255,224,138," + a.toFixed(3) + ")"; c.fillRect(sc.x + Math.cos(an) * r - 1, top + 8 + Math.sin(an) * r * 0.6 - 1, 2, 2);
        }
      }
    }
  });
  var baseEscaped = window.escaped;
  if (typeof baseEscaped === "function") window.escaped = function () {
    var r = baseEscaped.apply(this, arguments);
    if (sc && sc.level === L && (sc.st === "with" || sc.st === "free") && unlock(sc.char)) { sfxOk("buy"); sparkle(sc.ent.x, sc.ent.y - 10, 22); sign("UNLOCKED", charName(sc.char)); }
    return r;
  };
  var baseDrawWorld = window.drawWorld;
  window.drawWorld = function () {
    var on = sc && sc.level === L && sc.trees.length && typeof grid !== "undefined" && grid;
    if (on) sc.trees.forEach(function (q) { if (grid[q[1]] && grid[q[1]][q[0]] === FAKE) grid[q[1]][q[0]] = "#"; });
    try { return baseDrawWorld.apply(this, arguments); }
    finally {
      if (sc && sc.signAt) { if (liveFrame && sc.level === L) drawSign(ctx, sc.signAt[0], sc.signAt[1]); sc.signAt = null; }
      if (on) {
        sc.trees.forEach(function (q) { if (grid[q[1]] && grid[q[1]][q[0]] === "#") grid[q[1]][q[0]] = FAKE; });
        var t = tnow();
        sc.trees.forEach(function (q) {
          var tx = (q[0] + 0.5) * T, by = (q[1] + 1) * T;
          if (Math.hypot(player.x - tx, player.y - (q[1] + 0.5) * T) > 2.6 * T) return;
          var w = Math.round(Math.sin(t * 13 + q[0]) * 1.5);
          ctx.fillStyle = C.tree2; ctx.fillRect(Math.round(tx + 13 + w), Math.round(by - 52), 4, 2); ctx.fillRect(Math.round(tx + 15 + w), Math.round(by - 50), 2, 2);
        });
      }
    }
  };
})();
