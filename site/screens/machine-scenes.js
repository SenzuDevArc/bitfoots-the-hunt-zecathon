(function () {
  "use strict";
  var W0 = window;
  if (!W0.BH || !BH.talk || !BH.trailMachine) return;
  var M = BH.trailMachine;
  var SC = null;

  var CLICK = {
    post: "The pay post. Your coin went in here.",
    board: "The record board. Every payment, in order, for anyone to read.",
    gate: "The gate. It opened once the post had your coin.",
    hunter: "A hunter with a fake stamp. He can't sign for you."
  };

  function tnow() { return performance.now() / 1000; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(k) { k = clamp01(k); return k * k * (3 - 2 * k); }
  function st() { return BH.trailFeature && BH.trailFeature.api ? BH.trailFeature.api.state : null; }
  function floor(tx, ty) { var c = tile(tx, ty); return !solidP(c) && !isWater(c) && c !== "H" && c !== "J" && c !== "M"; }
  function ti(p) { return (p.rt != null ? p.rt : p.t) || 0; }

  function landPost(S) {
    var ks = Object.keys(S.posts || {});
    for (var i = 0; i < ks.length; i++) { var q = S.posts[ks[i]]; if (q && !q.water) return q; }
    return null;
  }
  function canPlay(i) {
    var S = st();
    if (!S || !bake || !player || game.levelIdx !== i - 1) return false;
    if (!S.prec || S.prec.length < 2 || !landPost(S)) return false;
    return true;
  }

  function placeBoard(S, post, path) {
    var want = { x: post.x - T * 3.6, y: post.y + T * 2 }, best = null, bc = 1e9, n = 5;
    for (var ty = 1; ty < rows - 1; ty++) for (var tx = 1; tx < cols - n; tx++) {
      var ok = true;
      for (var k = 0; k < n && ok; k++) if (!floor(tx + k, ty)) ok = false;
      if (!ok) continue;
      var cx = (tx + n / 2) * T, cy = (ty + 0.5) * T, c = Math.hypot(cx - want.x, cy - want.y);
      path.forEach(function (p) { if (p.x > tx * T - 4 && p.x < (tx + n) * T + 4 && p.y > ty * T - 20 && p.y < (ty + 1) * T + 8) c += T * 0.6; });
      if (Math.abs(cx - post.x) < T * 3 && Math.abs(cy - post.y) < T * 1.5) c += T * 20;
      if (c < bc) { bc = c; best = { x: tx * T + 4, y: ty * T - 6, w: n * T - 8, h: 44 }; }
    }
    return best || { x: post.x - T * 6, y: post.y + T * 1.5, w: T * 5 - 8, h: 44 };
  }
  function hunterRoute(stand, board, box) {
    var sx = Math.floor(stand.x / T), sy = Math.floor(stand.y / T), best = null, bl = 1e9;
    for (var ty = 1; ty < rows - 1; ty++) for (var tx = 1; tx < cols - 1; tx++) {
      if (!floor(tx, ty)) continue;
      var d = Math.abs(tx - sx) + Math.abs(ty - sy); if (d < 3 || d > 8) continue;
      if ((tx + 0.5) * T < box[0] || (tx + 0.5) * T > box[2] || (ty + 0.5) * T < box[1] || (ty + 0.5) * T > box[3]) continue;
      var r = bfsCore(tx, ty, sx, sy, function (x, y) { return solidP(tile(x, y)) || isWater(tile(x, y)) || tile(x, y) === "H"; });
      if (!r.reached) continue;
      var len = r.path.length, c = Math.abs(len - 6) * 10 - (ty - sy) * 3;
      r.path.forEach(function (p) { if (p.x > board.x && p.x < board.x + board.w && p.y > board.y && p.y < board.y + board.h + 12) c += 40; });
      if (c < bl) { bl = c; best = [{ x: (tx + 0.5) * T, y: (ty + 0.5) * T }].concat(r.path.map(function (p) { return { x: p[0], y: p[1] }; })); }
    }
    if (!best) best = [{ x: stand.x - T * 4, y: stand.y + T * 3 }, stand];
    best[best.length - 1] = { x: stand.x, y: stand.y };
    return best;
  }
  function along(pts, k) {
    var L = 0, seg = []; for (var i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); L += d; }
    var want = clamp01(k) * L;
    for (i = 0; i < seg.length; i++) {
      if (want <= seg[i] || i === seg.length - 1) { var f = seg[i] ? Math.min(1, want / seg[i]) : 1, a = pts[i], b = pts[i + 1]; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, a: Math.atan2(b.y - a.y, b.x - a.x) }; }
      want -= seg[i];
    }
    return { x: pts[0].x, y: pts[0].y, a: 0 };
  }

  function frameCam(sc) {
    var xs = [], ys = [], add = function (x, y) { xs.push(x); ys.push(y); };
    sc.path.forEach(function (p) { add(p.x, p.y); });
    add(sc.post.x, sc.post.y - T * 1.6); add(sc.post.x + T, sc.post.y + T);
    add(sc.board.x, sc.board.y - 4); add(sc.board.x + sc.board.w, sc.board.y + sc.board.h + 14);
    sc.hpath.forEach(function (p) { add(p.x, p.y); });
    var x0 = Math.min.apply(null, xs) - T * 0.8, x1 = Math.max.apply(null, xs) + T * 0.8, y0 = Math.min.apply(null, ys) - T * 0.9, y1 = Math.max.apply(null, ys) + T * 0.6;
    var bar = Math.round(H * 0.135), bot = H * 0.7;
    var el = document.querySelector(".talkbox.on"), r = el && el.getBoundingClientRect();
    if (r && r.height > 0 && r.top > H * 0.4) bot = r.top - 8;
    var band = Math.max(80, bot - bar), z = Math.min(W * 0.94 / (x1 - x0), band / (y1 - y0));
    sc.z = z;
    sc.at = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + (H / 2 - (bar + bot) / 2) / z };
    sc.bar = bar;
  }

  function beatNow(sc) {
    var s = BH.talk._state(); if (!s) return sc.beat;
    var i = sc.seq.indexOf(s.text);
    if (i >= 0 && i !== sc.beat) { sc.beat = i; sc.b0 = tnow(); }
    return sc.beat;
  }

  function pose(sc) {
    var S = sc.S, b = beatNow(sc), a = tnow() - sc.b0, keep = sc.keep = {};
    keep.prints = prints; keep.posts = S.posts; keep.lit = S.lit;
    keep.player = { x: player.x, y: player.y, dir: player.dir, anim: player.anim, animT0: player.animT0, inShield: player.inShield };
    keep.el = (S.elders || []).map(function (e) { return { x: e.x, y: e.y, dir: e.dir, anim: e.anim, t0: e.t0 }; });
    keep.h = hunters.map(function (h) { return { x: h.x, y: h.y, dir: h.dir, step: h.step, fg: h.fg, state: h.state }; });
    var path = sc.path, np = path.length, j;
    if (b === 0) j = Math.min(np - 1, (np - 1) * a / sc.walkD); else j = np - 1;
    var walking = b === 0 && j < np - 1, i0 = Math.floor(j), p = path[i0], q = path[Math.min(np - 1, i0 + 1)], f = j - i0;
    var px_ = p.x + (q.x - p.x) * f, py_ = p.y + (q.y - p.y) * f, tp = ti(p) + (ti(q) - ti(p)) * f;
    player.x = px_; player.y = py_; player.inShield = !!p.w;
    if (Math.abs(q.x - p.x) > 0.5) player.dir = q.x < p.x ? "left" : "right";
    if (!walking) player.dir = sc.post.x < player.x ? "left" : "right";
    player.anim = walking ? "walk" : "idle"; player.animT0 = simTime - a;
    (S.elders || []).forEach(function (e, k) {
      var jj = Math.max(0, j - (k + 1) * 7), e0 = path[Math.floor(jj)], e1 = path[Math.min(np - 1, Math.floor(jj) + 1)];
      e.x = e0.x + (e1.x - e0.x) * (jj - Math.floor(jj)); e.y = e0.y + (e1.y - e0.y) * (jj - Math.floor(jj));
      e.dir = walking ? (e1.x < e0.x ? "left" : "right") : "right"; e.anim = walking && jj > 0 ? "walk" : "idle"; e.t0 = simTime - a;
    });
    prints = sc.all.filter(function (pr) { return ti(pr) <= tp + 0.001; });
    var CT = S.ctime || [], CS = typeof coins !== "undefined" && coins ? coins : [];
    keep.coins = CS.map(function (c) { return [c.got, c.locked]; });
    CS.forEach(function (c, i) { if (CT[i] == null) return; c.got = CT[i] <= tp; c.locked = false; });
    var paidAge = b === 0 ? -1 : b === 1 ? a - 0.6 : 99;
    var shown = {};
    if (paidAge >= 0) { var pp = sc.post; pp.t0 = simTime - paidAge; shown[sc.postKey] = pp; }
    S.posts = shown;
    S.lit = paidAge >= 0 && b === 1 ? { t0: tnow() - paidAge, n: prints.length, key: sc.postKey, x: sc.post.x, y: sc.post.y, text: "YOU → POST · " + (sc.post.n || 1) + " ZEC" } : null;
    var openAt = paidAge >= 0.7, dirty = false;
    sc.gate.forEach(function (g) { var want = openAt ? "J" : "H"; if (grid[g[1]] && grid[g[1]][g[0]] !== want) { grid[g[1]][g[0]] = want; dirty = true; } });
    if (dirty && typeof bakeLevel === "function") bakeLevel();
    if (sc.hrec && sc.hrec.length) {
      var HR = sc.hrec, lo = 0, hi = HR.length - 1, tq = Math.min(tp, sc.tPay);
      while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (HR[mid].t <= tq) lo = mid; else hi = mid - 1; }
      hunters.forEach(function (h, k) { var r = HR[lo].p[k]; if (!r) return; h.x = r[0]; h.y = r[1]; h.dir = r[2]; h.step = tq * 12; });
    }
    sc.pose = { b: b, a: a, paidAge: paidAge };
  }
  function unpose(sc) {
    var S = sc.S, k = sc.keep; if (!k) return;
    prints = k.prints; S.posts = k.posts; S.lit = k.lit; sc.post.t0 = sc.t0Post;
    var CS = typeof coins !== "undefined" && coins ? coins : [];
    CS.forEach(function (c, i) { var v = k.coins[i]; if (v) { c.got = v[0]; c.locked = v[1]; } });
    Object.keys(k.player).forEach(function (q) { player[q] = k.player[q]; });
    (S.elders || []).forEach(function (e, i) { var v = k.el[i]; if (v) Object.keys(v).forEach(function (q) { e[q] = v[q]; }); });
    hunters.forEach(function (h, i) { var v = k.h[i]; if (v) Object.keys(v).forEach(function (q) { h[q] = v[q]; }); });
    sc.keep = null;
  }

  var GREEN = "#8fd66a", RED = "#d04a37";
  function rowText(sc) { return ["#1 YOU → POST · " + (sc.post.n || 1) + " ZEC · ✓ STAMP", "CHECK · FAKE STAMP ✗ · FAILED"]; }
  function drawBoard(g, sc) {
    var B = sc.board, x = Math.round(B.x), y = Math.round(B.y), w = B.w, h = B.h, ps = sc.pose, rowsT = rowText(sc);
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x + 2, y + h + 12, w - 4, 3);
    g.fillStyle = "#2a1a0e"; g.fillRect(x + 10, y + h - 2, 5, 15); g.fillRect(x + w - 15, y + h - 2, 5, 15);
    g.fillStyle = "#5a3418"; g.fillRect(x + 11, y + h - 2, 3, 14); g.fillRect(x + w - 14, y + h - 2, 3, 14);
    var glow = ps.b === 4 ? 0.5 + 0.5 * Math.sin(tnow() * 4) : 0;
    if (glow) { g.fillStyle = "rgba(255,224,138," + (0.35 * glow).toFixed(3) + ")"; g.fillRect(x - 4, y - 4, w + 8, h + 8); }
    g.fillStyle = "#1f130a"; g.fillRect(x, y, w, h);
    g.fillStyle = "#86592f"; g.fillRect(x + 2, y + 2, w - 4, h - 4);
    g.fillStyle = "#b07a44"; g.fillRect(x + 2, y + 2, w - 4, 2);
    g.fillStyle = "#3a2514"; g.fillRect(x + 2, y + h - 4, w - 4, 2);
    g.fillStyle = "rgba(0,0,0,0.16)"; for (var i = 14; i < w - 4; i += 14) g.fillRect(x + i, y + 4, 1, h - 8);
    g.save(); g.textBaseline = "middle"; g.textAlign = "center";
    g.font = "700 8px 'Plex Mono', monospace"; g.fillStyle = "#fff3c4"; g.fillText("THE RECORD", x + w / 2, y + 9);
    g.textAlign = "left"; g.font = "700 7px 'Plex Mono', monospace";
    var show = [0, 0];
    if (ps.b === 1) show[0] = clamp01((ps.a - 1.3) / 1.0); else if (ps.b > 1) show[0] = 1;
    if (ps.b === 3) show[1] = clamp01((ps.a - 0.9) / 0.6);
    for (var r = 0; r < 2; r++) {
      var ry = y + 18 + r * 12;
      g.fillStyle = "#3a2514"; g.fillRect(x + 5, ry - 5, w - 10, 10);
      if (!show[r]) continue;
      var full = rowsT[r], n = Math.ceil(full.length * show[r]), txt = full.slice(0, n), tx = x + 8;
      for (var c = 0; c < txt.length; c++) {
        var ch = txt.charAt(c);
        g.fillStyle = ch === "✓" ? GREEN : ch === "✗" ? RED : r === 1 ? "#f0a090" : "#fff3c4";
        g.fillText(ch, tx, ry); tx += g.measureText(ch).width;
      }
    }
    g.restore();
    sc.rect.board = [x - 4, y - 4, x + w + 4, y + h + 15];
  }
  function drawStamp(g, x, y, fake) {
    if (!fake) { g.fillStyle = 'rgba(255,224,138,0.35)'; g.beginPath(); g.arc(Math.round(x), Math.round(y), 15, 0, 6.283); g.fill(); } M.drawIcon(g, "stamp", Math.round(x - 12), Math.round(y - 12), 2, fake ? { pal: M.fake } : null); }
  function redX(g, x, y) {
    x = Math.round(x - 12); y = Math.round(y - 12);
    for (var z = 0; z < 24; z += 2) { g.fillStyle = "#1f130a"; g.fillRect(x + z - 1, y + z - 1, 5, 5); g.fillRect(x + 22 - z - 1, y + z - 1, 5, 5); }
    for (z = 0; z < 24; z += 2) { g.fillStyle = RED; g.fillRect(x + z, y + z, 3, 3); g.fillRect(x + 22 - z, y + z, 3, 3); }
  }
  function drawExtras(g, sc) {
    var ps = sc.pose, b = ps.b, a = ps.a, post = sc.post, top = { x: player.x, y: player.y - 40 };
    drawBoard(g, sc);
    var hit = { x: post.x, y: post.y - T * 0.55 };
    if (b === 0 || (b === 1 && a < 0.6)) {
      var k = b === 0 ? 0 : ease(a / 0.6), sx = top.x + (hit.x - top.x) * k, sy = top.y + (hit.y - top.y) * k - Math.sin(k * Math.PI) * T * 0.8;
      drawStamp(g, sx, sy + (b === 0 ? Math.round(Math.sin(tnow() * 4)) : 0), false);
      if (b === 1 && !sc.fired.stamp && a > 0.55) { sc.fired.stamp = true; if (typeof sfx === "function") sfx("buy"); }
    } else {
      var pulse = b === 1 && a < 1.2 ? 1 + 0.3 * (1 - a / 1.2) : 1;
      g.save(); g.translate(hit.x, hit.y); g.scale(pulse, pulse); drawStamp(g, 0, 0, false); g.restore();
      if (b === 1 && a < 1.0) { g.strokeStyle = "rgba(255,224,138," + (1 - a).toFixed(2) + ")"; g.lineWidth = 2; g.beginPath(); g.arc(hit.x, hit.y, 10 + a * 24, 0, 6.283); g.stroke(); }
    }
    sc.rect.stamp = [hit.x - 12, hit.y - 12, hit.x + 12, hit.y + 12];
    if (b >= 2) {
      var wk = b === 2 ? clamp01(a / 1.8) : 1, hp = along(sc.hpath, ease(wk)), hb = sc.hunter;
      hb.x = hp.x; hb.y = hp.y; hb.dir = wk < 1 ? hp.a : Math.atan2(post.y - hp.y, post.x - hp.x); hb.step = wk < 1 ? tnow() * 60 : 0;
      drawHunterBody(hb, null);
      sc.rect.hunter = [hb.x - 9, hb.y - 18, hb.x + 9, hb.y + 12];
      var hand = { x: hb.x + Math.cos(hb.dir) * 12, y: hb.y - 20 }, fx = hand.x, fy = hand.y, fake = { x: post.x - 4, y: post.y - T * 0.55 - 14 };
      if (b >= 3) {
        var m = ease(b === 3 ? a / 0.6 : 1); fx = hand.x + (fake.x - hand.x) * m; fy = hand.y + (fake.y - hand.y) * m - Math.sin(m * Math.PI) * 10;
        var bad = b > 3 || a >= 0.9;
        if (bad) {
          if (!sc.fired.bad) { sc.fired.bad = true; if (typeof sfx === "function") sfx("spotted"); }
          var fall = b === 3 ? Math.max(0, a - 1.6) : 1, land = { x: hb.x + 12, y: hb.y + 26 }, fk = ease(fall / 0.5);
          fx = fake.x + (land.x - fake.x) * fk; fy = fake.y + (land.y - fake.y) * fk;
          drawStamp(g, fx, fy, true); redX(g, fx, fy);
          sc.rect.x = [fx - 12, fy - 12, fx + 12, fy + 12];
        } else drawStamp(g, fx, fy, true);
      } else drawStamp(g, fx, fy, true);
      sc.rect.fake = [fx - 12, fy - 12, fx + 12, fy + 12];
    }
    var pr = prints, bx = [1e9, 1e9, -1e9, -1e9];
    pr.forEach(function (p) { bx[0] = Math.min(bx[0], p.x); bx[1] = Math.min(bx[1], p.y); bx[2] = Math.max(bx[2], p.x); bx[3] = Math.max(bx[3], p.y); });
    sc.rect.prints = pr.length ? bx : null;
    sc.rect.post = [post.x - T * 0.5, post.y - T * 1.1, post.x + T * 0.5, post.y + T * 0.5];
    sc.rect.player = [player.x - 12, player.y - 36, player.x + 12, player.y + 12];
    sc.rect.gate = sc.gate.length ? [sc.gate[0][0] * T, sc.gate[0][1] * T, (sc.gate[0][0] + 1) * T, (sc.gate[0][1] + 1) * T] : null;
  }

  function play(then) {
    if (SC) return true;
    var S = st(), post = landPost(S), path = S.prec.filter(function (p) { return p.t <= post.t0 + 0.001; });
    if (path.length < 2) path = S.prec.slice(0, 2);
    var key = Object.keys(S.posts).filter(function (k) { return S.posts[k] === post; })[0];
    var gate = []; (S.grec || []).forEach(function (r) { r.tiles.forEach(function (q) { gate.push(q); }); });
    var last = path[path.length - 1], seq = M.beats[1].map(function (b) { return b.say; }).concat([M.lines[1]]);
    var sc = SC = { S: S, then: then, post: post, postKey: key, t0Post: post.t0, path: path, all: prints.slice(), gate: gate, tPay: post.t0, hrec: S.hrec,
      seq: seq, beat: 0, b0: tnow(), fired: {}, rect: {}, walkD: Math.max(1.8, Math.min(4, path.length * 0.04)),
      hunter: { x: 0, y: 0, dir: 0, step: 0, state: "patrol", type: "hunter" }, screen0: game.screen, phase0: game.phase, zoom0: zoom, gateWas: gate.map(function (q) { return grid[q[1]][q[0]]; }) };
    sc.board = placeBoard(S, post, path);
    var stand = { x: last.x - T * 0.15, y: last.y + T * 1.05 };
    if (!floor(Math.floor(stand.x / T), Math.floor(stand.y / T))) stand = { x: last.x - T, y: last.y + T * 0.3 };
    var bx = [1e9, 1e9, -1e9, -1e9], grow = function (x, y) { bx[0] = Math.min(bx[0], x); bx[1] = Math.min(bx[1], y); bx[2] = Math.max(bx[2], x); bx[3] = Math.max(bx[3], y); };
    path.forEach(function (p) { grow(p.x, p.y); }); grow(post.x, post.y); grow(sc.board.x, sc.board.y); grow(sc.board.x + sc.board.w, sc.board.y + sc.board.h);
    sc.hpath = hunterRoute(stand, sc.board, [bx[0] - T * 1.5, bx[1] - T * 1.5, bx[2] + T * 1.5, bx[3] + T * 1.5]);
    if (typeof hideOverlay === "function") hideOverlay();
    if (BH.talk.reset) BH.talk.reset();
    game.screen = "play"; game.phase = "scene"; game.celeDone = true; player.moving = false;
    document.body.classList.add("trail-cine", "trail-scene");
    BH.talk.open(seq.map(function (t) { return ["oak", t]; }), end);
    frameCam(sc);
    setTimeout(function () { if (SC === sc) frameCam(sc); }, 120);
    if (typeof sfx === "function") sfx("whoosh");
    return true;
  }
  function end() {
    var sc = SC; if (!sc) return;
    SC = null;
    sc.post.t0 = sc.t0Post;
    var dirty = false;
    sc.gate.forEach(function (q, i) { if (grid[q[1]] && grid[q[1]][q[0]] !== sc.gateWas[i]) { grid[q[1]][q[0]] = sc.gateWas[i]; dirty = true; } });
    if (dirty && typeof bakeLevel === "function") bakeLevel();
    document.body.classList.remove("trail-cine", "trail-scene");
    zoom = sc.zoom0;
    if (game.phase === "scene") game.phase = sc.phase0;
    if (typeof sfx === "function") sfx("click");
    if (typeof sc.then === "function") sc.then();
  }
  function skip() { if (!SC) return; if (BH.talk.reset) BH.talk.reset(); end(); }

  var baseRender = W0.render;
  W0.render = function () {
    var sc = SC;
    if (!sc) return baseRender.apply(this, arguments);
    zoom = sc.z; cam.x = sc.at.x; cam.y = sc.at.y;
    pose(sc);
    try { baseRender.apply(this, arguments); } finally { unpose(sc); }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, sc.bar);
  };
  var baseFocus = W0.camFocus;
  W0.camFocus = function () { if (SC) { zoom = SC.z; return SC.at; } return typeof baseFocus === "function" ? baseFocus.apply(this, arguments) : null; };
  var baseFloaters = W0.drawFloaters;
  W0.drawFloaters = function () {
    var r = baseFloaters.apply(this, arguments);
    if (SC && SC.pose && ctx.canvas === canvas) drawExtras(ctx, SC);
    return r;
  };
  W0.addEventListener("resize", function () { if (SC) setTimeout(function () { if (SC) frameCam(SC); }, 60); });

  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return { x: view.x0 + (e.clientX - r.left) / zoom, y: view.y0 + (e.clientY - r.top) / zoom };
  }
  function inR(p, r, pad) { return r && p.x >= r[0] - pad && p.x <= r[2] + pad && p.y >= r[1] - pad && p.y <= r[3] + pad; }
  function hitAt(p) {
    var R = SC.rect, b = SC.pose ? SC.pose.b : 0;
    if (b >= 2 && inR(p, R.hunter, 4)) return "hunter";
    if (inR(p, R.board, 0)) return "board";
    if (inR(p, R.post, 4) || inR(p, R.stamp, 2)) return "post";
    if (inR(p, R.gate, 2)) return "gate";
    return null;
  }
  function speak(what) {
    var R = SC.rect[what === "post" ? "post" : what], x = (R[0] + R[2]) / 2, top = R[1];
    var sp = SC.speaker || (SC.speaker = {}); sp.x = x; sp.y = R[3]; sp.topY = top; sp.voice = what === "board" ? "board" : "oak";
    BH.talk.bubble(sp, CLICK[what], Math.max(3.4, CLICK[what].length / 14));
    SC.heard = what;
  }
  W0.addEventListener("pointerdown", function (e) {
    if (!SC) return;
    if (e.target !== canvas) return;
    var what = hitAt(toWorld(e));
    if (!what) return;
    e.stopImmediatePropagation(); e.preventDefault();
    speak(what);
  }, true);
  var MOVE = /^(arrow|w$|a$|s$|d$|e$|q$|r$|p$|shift$)/i;
  W0.addEventListener("keydown", function (e) {
    if (!SC) return;
    if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); if (!e.repeat) skip(); return; }
    if (MOVE.test(e.key)) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);

  BH.trailScene = {
    canPlay: canPlay, play: play, skip: skip,
    isOpen: function () { return !!SC; },
    lines: CLICK,
    info: function () {
      if (!SC) return null;
      var toS = function (r) { return r ? [(r[0] - view.x0) * zoom, (r[1] - view.y0) * zoom, (r[2] - view.x0) * zoom, (r[3] - view.y0) * zoom] : null; };
      var out = { beat: SC.beat, heard: SC.heard || null, rows: rowText(SC), rects: {} };
      Object.keys(SC.rect).forEach(function (k) { out.rects[k] = toS(SC.rect[k]); });
      return out;
    }
  };
})();
