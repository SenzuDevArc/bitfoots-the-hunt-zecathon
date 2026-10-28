"use strict";
(function () {
  var TOP = 120, WH = 360, BH_ = WH + TOP * 2;
  var AW = 520, MARGIN = 90;
  var PAL = [
    { ground: "#132713", g2: "#183018", tree: ["#0b1a0b", "#173117", "#1f421f"], name: "forest" },
    { ground: "#10231d", g2: "#15302a", tree: ["#0a1a15", "#133027", "#1b4034"], name: "shield" },
    { ground: "#1a2112", g2: "#222a17", tree: ["#0d130a", "#1d2a13", "#2a3a1a"], name: "hunt" },
    { ground: "#0f1b22", g2: "#15252e", tree: ["#08121a", "#11232e", "#1a3340"], name: "deep" },
    { ground: "#161524", g2: "#1d1b2e", tree: ["#0b0a14", "#1a1830", "#262344"], name: "night" }
  ];
  var GOLD = "#eaba49", INK = "#fffaf0", EDGE = "#0a0e08";
  var st = null, loopId = 0;

  function hash(x, y) { var h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function layout() {
    var N = LV.length, nActs = 0;
    LV.forEach(function (l) { nActs = Math.max(nActs, (l.act || 0) + 1); });
    var WW = MARGIN * 2 + AW * Math.max(1, nActs), nodes = [], byAct = {};
    var region = function (l) { return l.bonus ? nActs - 1 : (l.act || 0); };
    LV.forEach(function (l, i) { (byAct[region(l)] = byAct[region(l)] || []).push(i); });
    Object.keys(byAct).forEach(function (a) {
      var list = byAct[a], x0 = MARGIN + a * AW + 70, x1 = MARGIN + (+a + 1) * AW - 70;
      list.forEach(function (i, j) {
        var fx = list.length === 1 ? 0.5 : j / (list.length - 1);
        var y = TOP + WH / 2 + Math.sin(i * 1.25 + 0.4) * 105 + (hash(i, 7) - 0.5) * 30;
        nodes[i] = { i: i, n: i + 1, act: +a, x: Math.round(x0 + (x1 - x0) * fx + (hash(i, 3) - 0.5) * 24), y: Math.round(y) };
      });
    });
    var segs = [];
    for (var i = 0; i < N - 1; i++) {
      var a = nodes[i], b = nodes[i + 1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      var bend = (i % 2 ? 1 : -1) * Math.min(60, len * 0.28), cx = mx - dy / len * bend, cy = my + dx / len * bend;
      var pts = [], acc = 0, px = a.x, py = a.y, steps = Math.ceil(len * 2);
      pts.push({ x: a.x, y: a.y, d: 0 });
      for (var k = 1; k <= steps; k++) {
        var t = k / steps, u = 1 - t, x = u * u * a.x + 2 * u * t * cx + t * t * b.x, y = u * u * a.y + 2 * u * t * cy + t * t * b.y;
        acc += Math.hypot(x - px, y - py); px = x; py = y; pts.push({ x: x, y: y, d: acc });
      }
      segs.push({ pts: pts, len: acc });
    }
    var acts = [];
    for (var ai = 0; ai < nActs; ai++) acts.push({ a: ai, x0: MARGIN + ai * AW, x1: MARGIN + (ai + 1) * AW, name: (F.acts && F.acts[ai]) || "" });
    dressTrail(nodes, segs, acts);
    return { N: N, WW: WW, WH: BH_, nodes: nodes, segs: segs, acts: acts };
  }
  function riverHW(r, i) { return 10 * Math.min(1, i / 15, (r.ys.length - 1 - i) / 15); }
  function inRiver(acts, x, y, pad) {
    for (var k = 0; k < acts.length; k++) {
      var r = acts[k].river; if (!r) continue;
      var i = Math.round((x - r.x0) / 2); if (i < 0 || i >= r.ys.length) continue;
      if (Math.abs(y - r.ys[i]) < riverHW(r, i) + pad) return true;
    }
    return false;
  }
  function dressTrail(nodes, segs, acts) {
    acts.forEach(function (a) {
      var own = nodes.filter(function (n) { return n && n.act === a.a; }).sort(function (p, q) { return p.x - q.x; });
      if (!own.length) return;
      if (a.a === 1) {
        var pts = [{ x: a.x0 - 20, y: own[0].y }].concat(own, [{ x: a.x1 + 20, y: own[own.length - 1].y }]), raw = [];
        for (var x = a.x0 - 20, k = 0; x <= a.x1 + 20; x += 2) {
          while (k < pts.length - 2 && x > pts[k + 1].x) k++;
          var p = pts[k], q = pts[k + 1], f = Math.max(0, Math.min(1, (x - p.x) / ((q.x - p.x) || 1)));
          raw.push(p.y + (q.y - p.y) * f + 56);
        }
        a.river = { x0: a.x0 - 20, ys: raw.map(function (_, i) {
          var s = 0, c = 0; for (var j = i - 20; j <= i + 20; j++) if (raw[j] != null) { s += raw[j]; c++; }
          return Math.round(s / c + Math.sin(i * 0.11) * 4);
        }) };
      }
      var cx = 0, cy = 0; own.forEach(function (n) { cx += n.x; cy += n.y; }); cx /= own.length; cy /= own.length;
      var w = Math.max(("ACT " + (a.a + 1)).length * 5.6, a.name.length * 4.6) + 18, near = [];
      segs.forEach(function (s) { for (var q = 0; q < s.pts.length; q += 4) if (Math.abs(s.pts[q].x - cx) < 240) near.push(s.pts[q]); });
      var best = null, bs = 1e9;
      for (var sy = TOP - 20; sy <= TOP + WH - 30; sy += 5) for (var sx = cx - 180; sx <= cx + 180; sx += 5) {
        var l = sx - w / 2 - 5, r = sx + w / 2 + 5, t = sy - 5, b = sy + 37;
        if (l < a.x0 + 6 || r > a.x1 - 6) continue;
        if (nodes.some(function (n) { return (n.x + 20 > l && n.x - 20 < r && n.y + 22 > t && n.y - 38 < b) || (n.x + 68 > l && n.x - 68 < r && n.y + 46 > t && n.y + 20 < b); })) continue;
        if (near.some(function (p) { return p.x > l - 4 && p.x < r + 4 && p.y > t - 4 && p.y < b + 4; })) continue;
        var score = Math.hypot(sx - cx, sy + 16 - cy);
        if (a.river) {
          var gap = 1e9, wet = false;
          for (var gx = l; gx <= r; gx += 4) {
            var i = Math.round((gx - a.river.x0) / 2), ry = a.river.ys[i], hw = riverHW(a.river, i);
            if (ry == null) continue;
            if (ry + hw > t && ry - hw < b) { wet = true; break; }
            gap = Math.min(gap, ry > b ? ry - hw - b : t - ry - hw);
          }
          if (wet) continue;
          score += 3 * Math.max(0, gap - 6);
        }
        if (score < bs) { bs = score; best = { x: sx, y: sy }; }
      }
      a.sign = best;
    });
  }
  function pointAt(seg, d) {
    var p = seg.pts, lo = 0, hi = p.length - 1;
    if (d <= 0) return p[0]; if (d >= seg.len) return p[hi];
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (p[m].d < d) lo = m; else hi = m; }
    var a = p[lo], b = p[hi], f = (d - a.d) / ((b.d - a.d) || 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }
  var STEP = 11;
  function blocksOf(seg) {
    var out = [];
    for (var d = 17; d < seg.len - 14; d += STEP) out.push(pointAt(seg, d));
    return out;
  }

  function pine(g, x, y, h, c) {
    var w = Math.round(h * 0.62);
    g.fillStyle = "#2b1d14"; g.fillRect(x - 1, y - 3, 2, 3);
    g.fillStyle = c[0]; for (var t = 0; t < 4; t++) { var tw = Math.round(w * (1 - t * 0.22)), ty = y - 3 - Math.round((t + 1) * h * 0.21); g.fillRect(x - (tw >> 1), ty, tw, Math.round(h * 0.24)); }
    g.fillStyle = c[1]; for (t = 0; t < 4; t++) { tw = Math.round(w * (1 - t * 0.22)) - 2; ty = y - 3 - Math.round((t + 1) * h * 0.21); g.fillRect(x - (tw >> 1), ty, Math.max(1, tw >> 1), Math.round(h * 0.12)); }
    g.fillStyle = c[2]; g.fillRect(x - 1, y - 3 - Math.round(h * 0.95), 2, 2);
  }
  function actAt(L, x) { for (var i = 0; i < L.acts.length; i++) if (x < L.acts[i].x1) return i; return L.acts.length - 1; }
  function bake(L, u) {
    var cv = document.createElement("canvas"); cv.width = L.WW; cv.height = L.WH;
    var g = cv.getContext("2d");
    L.acts.forEach(function (a) {
      var p = PAL[a.a % PAL.length];
      g.fillStyle = p.ground; g.fillRect(a.a ? a.x0 : 0, 0, (a.a === L.acts.length - 1 ? L.WW : a.x1) - (a.a ? a.x0 : 0), L.WH);
      for (var y = 0; y < L.WH; y += 4) if (a.a) { var j = Math.round((hash(a.a, y) - 0.5) * 18); g.fillRect(a.x0 + j - 6, y, 12, 4); }
      g.fillStyle = p.g2; for (var k = 0; k < 260; k++) g.fillRect(Math.round(a.x0 + hash(k, a.a * 31 + 1) * AW), Math.round(hash(k, a.a * 31 + 2) * L.WH), 2, 2);
    });
    var nearTrail = function (x, y, r) {
      for (var i = 0; i < L.nodes.length; i++) if (Math.hypot(L.nodes[i].x - x, L.nodes[i].y - y) < r + 18) return true;
      for (var s = 0; s < L.segs.length; s++) { var p = L.segs[s].pts; for (var q = 0; q < p.length; q += 12) if (Math.hypot(p[q].x - x, p[q].y - y) < r) return true; }
      return false;
    };
    L.acts.forEach(function (a) {
      var r = a.river; if (!r) return;
      r.ys.forEach(function (y, i) {
        var x = r.x0 + i * 2, hw = Math.round(riverHW(r, i)); if (hw < 1) return;
        g.fillStyle = "#1c3a2c"; g.fillRect(x, y - hw - 2, 2, hw * 2 + 4);
        g.fillStyle = "#0c1428"; g.fillRect(x, y - hw, 2, hw * 2);
        if (hash(i, 41) < 0.14) { g.fillStyle = "rgba(191,233,255,0.3)"; g.fillRect(x, Math.round(y + (hash(i, 42) - 0.5) * hw), 5, 1); }
      });
    });
    var trees = [];
    for (var ty = 6; ty < L.WH + 16; ty += 15) for (var tx = 4; tx < L.WW; tx += 16) {
      var x = Math.round(tx + (hash(tx, ty) - 0.5) * 12), y = Math.round(ty + (hash(ty, tx) - 0.5) * 10);
      if (nearTrail(x, y, 20)) continue;
      if (inRiver(L.acts, x, y, 5)) continue;
      if (hash(x, y * 3) < 0.18) continue;
      trees.push({ x: x, y: y, h: 16 + Math.round(hash(x * 2, y) * 12) });
    }
    trees.forEach(function (t) { pine(g, t.x, t.y, t.h, PAL[actAt(L, t.x) % PAL.length].tree); });
    L.acts.forEach(function (a) {
      if (a.a % 4 !== 2) return;
      for (var k = 0; k < 3; k++) {
        var x = Math.round(a.x0 + 60 + hash(k, 99) * (AW - 120)), y = Math.round(TOP * 0.55 + hash(k, 98) * (L.WH - TOP * 1.1));
        if (nearTrail(x, y, 26)) continue;
        g.fillStyle = "#6b4a2e"; g.fillRect(x - 5, y - 22, 2, 22); g.fillRect(x + 3, y - 22, 2, 22); g.fillRect(x - 5, y - 14, 10, 2);
        g.fillStyle = "#4a3320"; g.fillRect(x - 7, y - 28, 14, 7); g.fillStyle = GOLD; g.fillRect(x - 1, y - 26, 2, 3);
      }
    });
    L.segs.forEach(function (seg, i) {
      var open = i + 1 < u, bl = blocksOf(seg);
      for (var k = 0; k < bl.length; k++) {
        var b = bl[k], nb = bl[k + 1];
        if (nb) { g.fillStyle = open ? "#7a5a1c" : "#2c302a"; var mx = Math.round((b.x + nb.x) / 2), my = Math.round((b.y + nb.y) / 2); g.fillRect(mx - 1, my - 1, 2, 2); }
        var x = Math.round(b.x) - 3, y = Math.round(b.y) - 3;
        g.fillStyle = EDGE; g.fillRect(x - 1, y - 1, 8, 9);
        g.fillStyle = open ? "#c99a3a" : "#3b3f38"; g.fillRect(x, y, 6, 6);
        g.fillStyle = open ? "#f3d27a" : "#50554c"; g.fillRect(x, y, 6, 1); g.fillRect(x, y, 1, 6);
        g.fillStyle = open ? "#8a6420" : "#2a2d27"; g.fillRect(x, y + 6, 6, 1);
        if (open && (k % 3 === 0)) { g.fillStyle = "#6f5217"; g.fillRect(x + 2, y + 2, 2, 1); }
      }
    });
    return cv;
  }

  function scaleFor(W, H) { var z = typeof trailZoom !== "undefined" ? trailZoom : 1; W *= z; H *= z; return Math.max(1.5, Math.min(H / 380, W / 300, 3)) / z; }
  function clampCam() {
    var s = st.s, vw = st.W / s, vh = st.H / s, L = st.L;
    st.cam.x = vw >= L.WW ? L.WW / 2 : Math.max(vw / 2, Math.min(L.WW - vw / 2, st.cam.x));
    st.cam.y = vh >= L.WH ? L.WH / 2 : Math.max(vh / 2, Math.min(L.WH - vh / 2, st.cam.y));
  }
  function toWorld(cx, cy) { return { x: st.cam.x + (cx - st.W / 2) / st.s, y: st.cam.y + (cy - st.H / 2) / st.s }; }
  function walkerPos() {
    var w = st.walk;
    if (!w) { var n = st.L.nodes[st.at]; return { x: n.x, y: n.y, dir: "down" }; }
    var seg = st.L.segs[w.seg], d = w.fwd ? w.d : seg.len - w.d, p = pointAt(seg, d), q = pointAt(seg, w.fwd ? d + 2 : d - 2);
    var dx = q.x - p.x, dy = q.y - p.y;
    return { x: p.x, y: p.y, dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up") };
  }
  function nodeState(i) { var n = i + 1; return n > st.u ? "locked" : save.stars[n] != null ? "done" : "open"; }
  function drawNode(g, node, t) {
    var state = nodeState(node.i), sel = node.i === st.sel, x = node.x, y = node.y, R = 11;
    if (sel) {
      var p = 0.5 + 0.5 * Math.sin(t * 4);
      g.fillStyle = "rgba(234,186,73," + (0.10 + 0.12 * p).toFixed(3) + ")"; g.fillRect(x - R - 7, y - R - 7, 2 * R + 14, 2 * R + 14);
      g.fillStyle = "rgba(234,186,73," + (0.22 + 0.12 * p).toFixed(3) + ")"; g.fillRect(x - R - 4, y - R - 4, 2 * R + 8, 2 * R + 8);
    }
    g.fillStyle = EDGE; g.fillRect(x - R - 2, y - R - 2, 2 * R + 4, 2 * R + 6);
    if (state === "locked") {
      g.fillStyle = "#34372f"; g.fillRect(x - R, y - R, 2 * R, 2 * R);
      g.fillStyle = "#474b41"; g.fillRect(x - R, y - R, 2 * R, 2); g.fillStyle = "#23261f"; g.fillRect(x - R, y + R - 2, 2 * R, 2);
      g.fillStyle = "#8d9284"; g.fillRect(x - 4, y - 7, 8, 2); g.fillRect(x - 4, y - 7, 2, 6); g.fillRect(x + 2, y - 7, 2, 6);
      g.fillStyle = "#b9bdb0"; g.fillRect(x - 6, y - 2, 12, 9); g.fillStyle = "#34372f"; g.fillRect(x - 1, y + 1, 2, 4);
    } else {
      var done = state === "done";
      g.fillStyle = done ? "#d4a23c" : "#2a2418"; g.fillRect(x - R, y - R, 2 * R, 2 * R);
      g.fillStyle = done ? "#ffe08a" : GOLD; g.fillRect(x - R, y - R, 2 * R, 2); g.fillRect(x - R, y - R, 2, 2 * R);
      g.fillStyle = done ? "#8a6420" : "#7a5a1c"; g.fillRect(x - R, y + R - 2, 2 * R, 2); g.fillRect(x + R - 2, y - R, 2, 2 * R);
      if (!done) { g.fillStyle = GOLD; g.fillRect(x - R, y - R, 2 * R, 1); g.fillRect(x - R, y + R - 1, 2 * R, 1); g.fillRect(x - R, y - R, 1, 2 * R); g.fillRect(x + R - 1, y - R, 1, 2 * R); }
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = "600 11px 'Plex Cond', sans-serif";
      g.fillStyle = done ? "#1c1c1c" : INK; g.fillText(String(lvLabel(node.n)), x, y + 1);
      if (done) {
        g.fillStyle = EDGE; g.fillRect(x + 5, y - R - 5, 11, 10);
        g.fillStyle = "#3fbf6a"; g.fillRect(x + 6, y - R - 4, 9, 8);
        g.fillStyle = INK; g.fillRect(x + 8, y - R, 2, 2); g.fillRect(x + 9, y - R + 1, 2, 2); g.fillRect(x + 11, y - R - 1, 2, 2); g.fillRect(x + 12, y - R - 3, 2, 2);
        var m = medalsOf(node.n);
        for (var k = 0; k < 3; k++) {
          var mx = x - 12 + k * 8, my = y + R + 5;
          g.fillStyle = EDGE; g.fillRect(mx - 1, my - 1, 7, 7);
          g.fillStyle = m[k] ? GOLD : "#3a3a33"; g.fillRect(mx, my, 5, 5);
          if (m[k]) { g.fillStyle = "#fff1b8"; g.fillRect(mx, my, 2, 2); }
        }
      }
    }
  }
  function medalsOf(n) {
    var m = save.medals && save.medals[n], s = save.stars[n] || 0;
    return m ? [!!m.home, !!m.par, !!m.unseen] : [s > 0, s > 1, s > 2];
  }
  function drawSign(g, x, y, text, sub) {
    g.font = "600 9px 'Plex Cond', sans-serif"; var w = Math.max(g.measureText(text).width || 0, sub ? (g.font = "500 7px 'Plex Cond', sans-serif", g.measureText(sub).width || 0) : 0) + 14, h = sub ? 24 : 15;
    x = Math.round(x - w / 2); y = Math.round(y);
    g.fillStyle = "#2b1d14"; g.fillRect(x + w / 2 - 1, y + h, 2, 8);
    g.fillStyle = "#1f130a"; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = "#5f3e22"; g.fillRect(x, y, w, h); g.fillStyle = "#86592f"; g.fillRect(x, y, w, 1); g.fillStyle = "#3f2815"; g.fillRect(x, y + h - 1, w, 1);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "600 9px 'Plex Cond', sans-serif"; g.fillStyle = GOLD; g.fillText(text, x + w / 2, y + (sub ? 8 : h / 2 + 0.5));
    if (sub) { g.font = "500 7px 'Plex Cond', sans-serif"; g.fillStyle = "#f3dfb9"; g.fillText(sub, x + w / 2, y + 17); }
  }
  function draw(now) {
    var cv = st.cv, g = st.g, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth || 1440, H = window.innerHeight || 900;
    if (W !== st.W || H !== st.H || cv.width !== Math.round(W * dpr)) {
      if (st.W && !st.dragged && !st.walk) st.settle = true;
      st.W = W; st.H = H; st.s = scaleFor(W, H); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      try { cv.style.width = W + "px"; cv.style.height = H + "px"; } catch (e) {}
      clampCam();
    }
    var t = now / 1000, dt = st.last ? Math.min(0.05, t - st.last) : 0; st.last = t;
    stepWalk(dt);
    if (st.walk && !st.dragged) { var wp = walkerPos(), k = 1 - Math.exp(-dt * 5); st.cam.x += (wp.x - st.cam.x) * k; st.cam.y += (wp.y + yBias() - st.cam.y) * k; }
    stepLook(t, dt);
    clampCam();
    edges();
    if (st.settle && st.band) { st.settle = false; st.cam.y = st.L.nodes[st.at].y + yBias(); clampCam(); }
    var s = st.s;
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    g.fillStyle = "#0f1912"; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(s * dpr, 0, 0, s * dpr, Math.round((st.W / 2 - st.cam.x * s) * dpr), Math.round((st.H / 2 - st.cam.y * s) * dpr));
    g.imageSmoothingEnabled = false;
    g.drawImage(st.bake, 0, 0);
    st.L.acts.forEach(function (a) { var p = a.sign || { x: a.x0 + 90, y: TOP + 14 }; drawSign(g, p.x, p.y, "ACT " + (a.a + 1), a.name); });
    st.L.nodes.forEach(function (n) { drawNode(g, n, t); });
    var p = walkerPos(), K = BH.cosmetics, S = window.BitfootSprite, o = { dir: p.dir, state: st.walk ? "walk" : "idle", t: t, scale: 0.75, alpha: 1 };
    if (st.walk) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(Math.round(p.x - 6), Math.round(p.y), 12, 3); }
    var feet = st.walk ? p.y + 2 : p.y - 9;
    var CHR = BH.characters, cid = CHR && typeof save !== "undefined" ? CHR.worn(save) || (CHR.main ? CHR.main(save.cos) : null) : null, drawn = false;
    if (cid) try { drawn = CHR.draw(g, p.x, feet, o, cid); } catch (e) {}
    if (!drawn) try { if (K && K.draw) K.draw(g, p.x, feet, o); else if (S && S.draw) S.draw(g, p.x, feet, o); } catch (e) {}
    var sn = st.L.nodes[st.sel];
    if (sn) drawSign(g, sn.x, sn.y + 26, lvLabel(sn.n) + " · " + LV[sn.i].title, null);
  }
  function loop(id) {
    return function (now) {
      if (id !== loopId || !st || !st.cv || st.cv.isConnected === false || game.screen !== "select") return;
      draw(now);
      requestAnimationFrame(loop(id));
    };
  }

  var EDGE_ROOM = 45, peekedThisPage = false;
  var RM = false; try { RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
  function actMid(a) { return (st.L.acts[a].x0 + st.L.acts[a].x1) / 2; }
  function edgeTarget(dir) { return Math.max(0, Math.min(st.L.acts.length - 1, actAt(st.L, st.cam.x) + dir)); }
  function room() { var hv = st.W / st.s / 2; return { left: st.cam.x - hv, right: st.L.WW - (st.cam.x + hv) }; }
  function camClampX(x) { var hv = st.W / st.s / 2; return st.L.WW <= hv * 2 ? st.L.WW / 2 : Math.max(hv, Math.min(st.L.WW - hv, x)); }
  function markPanned() {
    st.peek = null;
    if (!st.cue) return;
    st.cue = false; setCls(st.root, "cue", false);
    try { if (!save.mapPanned) { save.mapPanned = 1; if (typeof persist === "function") persist(); } } catch (e) {}
  }
  function setCls(el, c, on) { try { if (el && el.classList) el.classList.toggle(c, !!on); } catch (e) {} }
  function glideTo(x) { st.glide = { to: camClampX(x) }; st.dragged = true; }
  function stepLook(t, dt) {
    var p = st.peek;
    if (p) {
      if (p.t0 == null) {
        var r = room();
        if (r.right <= EDGE_ROOM || RM) { st.peek = null; return; }
        p.t0 = t + 0.8; p.x = st.cam.x; p.d = Math.min(r.right, st.W / st.s * 0.45, 260); peekedThisPage = true;
      }
      var u = t - p.t0, ease = function (v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
      var f = u < 0 ? 0 : u < 0.9 ? ease(u / 0.9) : u < 1.5 ? 1 : ease(1 - (u - 1.5) / 0.9);
      st.cam.x = p.x + p.d * f;
      if (u >= 2.4) { st.cam.x = p.x; st.peek = null; }
      return;
    }
    var g = st.glide;
    if (g) { var k = 1 - Math.exp(-dt * 7); st.cam.x += (g.to - st.cam.x) * k; if (Math.abs(g.to - st.cam.x) < 0.5 || dt === 0) { st.cam.x = g.to; st.glide = null; } }
  }
  function edges() {
    var r = room(), E = st.edge, L = E.l, R = E.r;
    if (!L || !R) return;
    var showL = r.left > EDGE_ROOM, showR = r.right > EDGE_ROOM;
    if (showL !== E.showL) { E.showL = showL; setCls(L, "on", showL); }
    if (showR !== E.showR) { E.showR = showR; setCls(R, "on", showR); }
    var la = showL ? "ACT " + (edgeTarget(-1) + 1) : "", ra = showR ? "ACT " + (edgeTarget(1) + 1) : "";
    if (la !== E.la && E.lt) { E.la = la; E.lt.textContent = la; }
    if (ra !== E.ra && E.rt) { E.ra = ra; E.rt.textContent = ra; }
    var top = document.getElementById("wmTop"), pan = document.getElementById("wmPanel");
    var a = top && top.offsetHeight, b = pan && pan.offsetTop;
    if (typeof a === "number" && typeof b === "number" && b > a) {
      var mid = Math.round((a + b) / 2);
      st.band = { a: a, b: b, mid: mid };
      if (mid !== E.mid) { E.mid = mid; [L, R, st.cueEl].forEach(function (el) { if (el && el.style) el.style.top = mid + "px"; }); }
    }
  }
  function yBias() {
    var B = st.band; if (!B) return 0;
    var c = st.H / 2;
    return c > B.a + 40 && c < B.b - 40 ? 0 : (c - B.mid) / st.s;
  }
  function wireEdges() {
    [["wmEdgeL", -1], ["wmEdgeR", 1]].forEach(function (d) {
      var el = document.getElementById(d[0]); if (!el) return;
      el.addEventListener("pointerdown", function (e) { if (e.stopPropagation) e.stopPropagation(); });
      el.addEventListener("click", function (e) {
        if (e.stopPropagation) e.stopPropagation();
        audioInit(); sfx("hover"); markPanned();
        var to = actMid(edgeTarget(d[1]));
        glideTo(to);
      });
    });
  }

  var SPEED = 150;
  function walkTo(target) {
    if (target === st.at && !st.walk) return;
    st.goal = target;
    var w = st.walk;
    if (!w) { startLeg(); return; }
    var ahead = w.fwd ? target >= w.seg + 1 : target <= w.seg;
    if (!ahead) { var len = st.L.segs[w.seg].len; w.fwd = !w.fwd; w.d = len - w.d; st.at = w.fwd ? w.seg : w.seg + 1; }
  }
  function startLeg() {
    if (st.goal == null || st.goal === st.at) { st.walk = null; arrive(); return; }
    var fwd = st.goal > st.at, seg = fwd ? st.at : st.at - 1;
    var left = 0; for (var i = Math.min(st.at, st.goal); i < Math.max(st.at, st.goal); i++) left += st.L.segs[i].len;
    st.walk = { seg: seg, fwd: fwd, d: 0, speed: Math.max(SPEED, left / 1.6) };
  }
  function stepWalk(dt) {
    var w = st.walk; if (!w) return;
    w.d += w.speed * dt;
    var seg = st.L.segs[w.seg];
    if (w.d >= seg.len) { st.at = w.fwd ? w.seg + 1 : w.seg; var sp = w.speed; st.walk = null; if (st.goal !== st.at) { startLeg(); if (st.walk) st.walk.speed = sp; } else arrive(); }
  }
  function arrive() { st.goal = null; if (st.playOnArrive) { st.playOnArrive = false; play(); } }
  function dashTo(i) {
    if (st.playOnArrive) return;
    if (!st.walk || st.goal !== i) walkTo(i);
    var w = st.walk; if (!w) return;
    var left = st.L.segs[w.seg].len - w.d;
    for (var j = Math.min(st.at, i); j < Math.max(st.at, i); j++) if (j !== w.seg) left += st.L.segs[j].len;
    w.speed = Math.max(w.speed, 420, left / 0.45);
    st.playOnArrive = true; sfx("click");
  }
  function finishWalk() { if (st.goal != null) { st.at = st.goal; st.walk = null; st.goal = null; } }

  function select(i, instant) {
    if (i < 0 || i >= st.L.N) return false;
    if (i + 1 > st.u) { st.sel = i; panel(); sfx("click"); return false; }
    var again = i === st.sel && i === st.at && !st.walk;
    st.sel = i; st.dragged = false; st.peek = null; st.glide = null;
    if (instant) { st.at = i; st.walk = null; st.goal = null; st.cam.x = st.L.nodes[i].x; st.cam.y = st.L.nodes[i].y + yBias(); st.settle = true; clampCam(); } else walkTo(i);
    panel();
    return again;
  }
  function play() {
    if (st.sel + 1 > st.u) return;
    if (st.walk || st.at !== st.sel) { dashTo(st.sel); return; }
    finishWalk(); sfx("click"); if (BH.story && BH.story.gate(st.sel, startLevel)) return; startLevel(st.sel);
  }
  function panel() {
    var el = document.getElementById("wmPanel"); if (!el) return;
    var i = st.sel, n = i + 1, lv = LV[i], locked = n > st.u, done = save.stars[n] != null;
    var act = (F.acts && F.acts[lv.act || 0]) || "", actLine = lv.bonus ? "BONUS LEVEL" : "ACT " + ((lv.act || 0) + 1) + " · " + act;
    setCls(el, "wm-trail", true);
    trailPanel(el, i, n, lv, locked, done);
    var head = document.getElementById("wmAct"); if (head) head.textContent = actLine;
  }
  function wmChips(n, lv, done) {
    var m = done ? medalsOf(n) : [false, false, false], names = ["Den", "Under par", "Never seen"];
    var chips = (lv.need ? '<span class="wm-chip"><i class="wm-coin"></i>FIND ' + lv.need + ' ZEC</span>' : "") +
      '<span class="wm-chip">' + (done && save.best[n] ? "BEST " + fmtTime(save.best[n]) + " · " : "") + "★ UNDER " + fmtTime(lv.par) + '</span>';
    return '<div class="wm-chips">' + chips + '</div>' +
      '<div class="wm-bigstars" aria-label="Stars: ' + m.filter(Boolean).length + ' of 3">' +
      m.map(function (on, k) { return '<span class="' + (on ? "on" : "") + '" title="' + names[k] + '">★</span>'; }).join("") + '</div>';
  }
  function hallDoor() { return !!(BH.hall && BH.hall.open); }
  function trailPanel(el, i, n, lv, locked, done) {
    var line;
    if (locked) line = "Locked · escape level " + lvLabel(st.u) + " first";
    else if (done) {
      var m = medalsOf(n), names = ["Den", "Under par", "Never seen"];
      line = '<span class="wm-stars" aria-label="Medals: ' + names.filter(function (_, k) { return m[k]; }).join(", ") + '">' +
        m.map(function (on) { return '<span class="' + (on ? "on" : "") + '">★</span>'; }).join("") + '</span>' + (save.best[n] ? " · BEST " + fmtTime(save.best[n]) : "");
    } else line = (lv.need ? "Find " + lv.need + " ZEC · " : "") + "Beat " + fmtTime(lv.par) + " for a star";
    var mid = locked ? '<div class="wm-sub">' + esc(line) + '</div>' : wmChips(n, lv, done);
    el.innerHTML = '<div class="wm-lv"><span class="wm-num">LEVEL ' + lvLabel(n) + '</span><span class="wm-name">' + esc(lv.title) + '</span></div>' + mid +
      (locked ? "" : feeLine("carry-line") + '<button class="ec-primary wm-play" id="wmPlay">▶ PLAY LEVEL ' + lvLabel(n) + '</button>');
    if (BH.story && !locked) BH.story.mapLink(el, i);
    bind("wmPlay", function () { play(); });
  }

  function wire(cv, extra) {
    var down = null;
    [cv].concat(extra || []).forEach(function (el) {
      if (!el) return;
      el.addEventListener("pointerdown", function (e) {
        audioInit(); st.peek = null; st.glide = null;
        down = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: st.cam.x, cy: st.cam.y, moved: false, el: el };
        try { el.setPointerCapture(e.pointerId); } catch (x) {}
      });
      el.addEventListener("pointermove", function (e) {
        if (!down || e.pointerId !== down.id) { if (el === cv) hover(e); return; }
        var dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.moved && Math.hypot(dx, dy) > 6) { down.moved = true; st.dragged = true; cv.classList.toggle("dragging", true); markPanned(); }
        if (down.moved) { st.cam.x = down.cx - dx / st.s; st.cam.y = down.cy - dy / st.s; clampCam(); }
      });
      el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
      el.addEventListener("wheel", function (e) {
        if (e.preventDefault) e.preventDefault();
        st.peek = null; st.glide = null;
        st.cam.x += (e.deltaX || e.deltaY) / st.s; st.dragged = true; clampCam(); markPanned();
      }, { passive: false });
    });
    function up(e) {
      if (!down || e.pointerId !== down.id) return;
      var was = down; down = null; cv.classList.toggle("dragging", false);
      if (was.moved || e.type === "pointercancel") return;
      var w = toWorld(e.clientX, e.clientY), hit = nodeAt(w.x, w.y);
      if (hit != null) { var again = select(hit); if (again) play(); else if (hit + 1 <= st.u) sfx("click"); }
    }
  }
  function nodeAt(x, y) {
    var best = null, bd = 20;
    st.L.nodes.forEach(function (n) { var d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n.i; } });
    return best;
  }
  function hover(e) {
    var w = toWorld(e.clientX, e.clientY), h = nodeAt(w.x, w.y);
    st.cv.classList.toggle("over", h != null && h + 1 <= st.u);
  }

  function key(k) {
    if (!st) return false;
    if (k === "ArrowRight" || k === "d" || k === "D") { if (st.sel + 1 < st.u) { select(st.sel + 1); sfx("hover"); } return true; }
    if (k === "ArrowLeft" || k === "a" || k === "A") { if (st.sel > 0) { select(st.sel - 1); sfx("hover"); } return true; }
    if (k === "Enter" || k === " ") { play(); return true; }
    if (k === "Escape") { sfx("click"); showTitle(); return true; }
    return false;
  }

  function show() {
    game.screen = "select"; ov.onclick = null; ensureSave();
    if (BH.router) BH.router.at("map");
    var L = layout(), u = Math.min(unlockedUpTo(), L.N);
    var start = game.phase !== "none" && typeof game.levelIdx === "number" && game.levelIdx >= 0 && game.levelIdx < u && game.levelIdx < L.N ? game.levelIdx : nextLevelIdx();
    start = Math.max(0, Math.min(u - 1, start));
    var firstTime = !save.mapPanned;
    showOverlay("select map",
      '<div class="wm' + (firstTime ? " cue" : "") + (RM ? " still" : "") + '" id="wm">' +
      '<canvas class="wm-cv" id="wmCanvas" role="img" aria-label="World map: every level on one trail through the forest. Drag to look around, click a level to walk there."></canvas>' +
      '<button class="wm-edge l" id="wmEdgeL" aria-label="Look left"><span class="wm-chev" aria-hidden="true"></span><span class="wm-edge-act" id="wmEdgeLAct"></span></button>' +
      '<button class="wm-edge r" id="wmEdgeR" aria-label="Look right"><span class="wm-chev" aria-hidden="true"></span><span class="wm-edge-act" id="wmEdgeRAct"></span></button>' +
      '<div class="wm-cue" id="wmCue" aria-hidden="true"><span class="wm-hand"></span><span class="wm-cue-t">DRAG</span></div>' +
      '<header class="wm-top" id="wmTop"><button class="wm-btn" id="wmMenu">‹ MENU</button><div class="wm-act" id="wmAct"></div>' +
      '<div class="selwallet"><span class="num">' + save.wallet + ' ZEC</span> saved<button class="tlink big" id="selShop">SELECT CHARACTER</button>' +
      (BH.achievements && !hallDoor() ? '<button class="tlink big" id="selBadges">BADGES <b>' + BH.achievements.count(save) + '/' + BH.achievements.list.length + '</b></button>' : '') +
      (trailDone() ? '<button class="tlink big" id="selHard" aria-pressed="' + !!save.hardcore + '">' + hardLabel() + '</button>' : '') + '</div></header>' +
      '<section class="wm-panel" id="wmPanel" aria-live="polite"></section>' +
      '<div class="wm-hint">' + (TOUCH ? "DRAG TO LOOK AROUND · TAP A LEVEL · TAP AGAIN TO PLAY" : "DRAG TO LOOK AROUND · CLICK A LEVEL · ENTER TO PLAY") + '</div>' +
      '</div>');
    var cv = document.getElementById("wmCanvas");
    st = { L: L, u: u, at: start, sel: start, goal: null, walk: null, cv: cv, g: cv.getContext("2d"), bake: bake(L, u),
      cam: { x: L.nodes[start].x, y: L.nodes[start].y }, s: 2, W: 0, H: 0, last: 0, dragged: false, playOnArrive: false,
      root: document.getElementById("wm"), cueEl: document.getElementById("wmCue"), cue: firstTime, glide: null, band: null, settle: true,
      peek: firstTime && !peekedThisPage ? { t0: null } : null,
      edge: { l: document.getElementById("wmEdgeL"), r: document.getElementById("wmEdgeR"), lt: document.getElementById("wmEdgeLAct"), rt: document.getElementById("wmEdgeRAct") } };
    wire(cv, [st.cueEl]);
    wireEdges();
    panel();
    bind("wmMenu", function () { showTitle(); });
    bind("selShop", function () { if (hallDoor()) BH.hall.open(); else showShop(function () { showSelect(); }); });
    bind("selBadges", function () { BH.achievements.show(function () { showSelect(); }); });
    bind("selHard", function (e, el) {
      save.hardcore = !save.hardcore; if (typeof persist === "function") persist();
      el.textContent = hardLabel(); el.setAttribute("aria-pressed", String(!!save.hardcore));
    });
    loopId++; requestAnimationFrame(loop(loopId));
  }
  function trailDone() { return LV.length > 0 && LV.every(function (l, i) { return save.stars && save.stars[i + 1] != null; }); }
  function hardLabel() { return "HARDCORE " + (save.hardcore ? "ON" : "OFF"); }
  function state() {
    if (!st) return null;
    var p = walkerPos();
    return { sel: st.sel, at: st.at, goal: st.goal, walking: !!st.walk, peeking: !!st.peek, cue: !!st.cue, gliding: !!st.glide, walker: { x: Math.round(p.x), y: Math.round(p.y) }, cam: { x: Math.round(st.cam.x), y: Math.round(st.cam.y) }, s: st.s,
      unlocked: st.u, nodes: st.L.nodes.map(function (n) { return { n: n.n, x: n.x, y: n.y, state: nodeState(n.i) }; }), world: { w: st.L.WW, h: st.L.WH } };
  }
  function screenOf(i) { var n = st.L.nodes[i]; return { x: Math.round(st.W / 2 + (n.x - st.cam.x) * st.s), y: Math.round(st.H / 2 + (n.y - st.cam.y) * st.s) }; }

  window.BH = window.BH || {};
  BH.worldmap = { show: show, key: key, state: state, select: function (n, instant) { return select(n - 1, instant); }, layout: layout, screenOf: function (n) { return st ? screenOf(n - 1) : null; } };
})();
