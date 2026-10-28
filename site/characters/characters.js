(function () {
  'use strict';
  var BH = window.BH = window.BH || {};
  var ASSET = (function () { var c = document.currentScript, s = c && c.src ? String(c.src) : ''; return s ? new URL('/', s).href : ''; })();
  function at(p) { return /^(data:|blob:|https?:)/.test(p) ? p : ASSET + p.replace(/^\//, ''); }

  var LIST = [
    { art: '001', clear: 3, act: 1, foot: '#c9b2b9', sole: '#a88d96' },
    { art: '004', clear: 5, act: 2, foot: '#ffb065', sole: '#b77e48' },
    { art: '046', clear: 10, act: 3, foot: '#9ff0fc', sole: '#68defc' },
    { art: '026', clear: 15, act: 4, foot: '#c9b2b9', sole: '#a88d96' },
    { art: '094', clear: 14, act: 5, text: 'Finish all 12 levels', foot: '#c4bbb3', sole: '#807980' },
    { art: '058', clear: 27, act: 6, foot: '#a88d96', sole: '#885e6b' },
    { art: '114', clear: 34, act: 7, foot: '#f0eee5', sole: '#e8e5d5' },
    { art: '074', clear: 41, act: 8, foot: '#b7bac8', sole: '#9da1b4' },
    { art: '078', clear: 49, act: 9, foot: '#ffcd42', sole: '#ff9e36' },
    { art: '062', clear: 'genesis', act: 0, text: 'Finish Act 3', foot: '#c4bbb3', sole: '#807980' }
  ];
  var DEFAULT = 'char-none';
  var ITEMS = [{ id: DEFAULT, art: null, name: 'Your BitFoot', desc: 'The BitFoot you started with. Furs and hats fit this one.',
    rule: { price: 0, text: 'Yours from the start' } }];
  LIST.forEach(function (c) {
    ITEMS.push({ id: 'char-' + c.art, art: c.art, name: 'BitFoot #' + c.art, foot: c.foot, sole: c.sole,
      desc: 'A real BitFoot from the collection, drawn exactly as it is. It wears its own look.',
      rule: { clear: c.clear, price: 0, text: c.text || 'Finish Act ' + c.act } });
  });
  var BATCH2 = [
    { art: '002', buy: 25 }, { art: '003', buy: 25 }, { art: '005', buy: 25 }, { art: '006', buy: 25 }, { art: '007', buy: 25 },
    { art: '008', clear: 2 }, { art: '009', clear: 5 }, { art: '010', clear: 8 }, { art: '011', clear: 11 },
    { art: '012', found: [11, 1, 6], act: 4 }, { art: '013', clear: 13 }, { art: '014', buy: 60 }, { art: '015', clear: 16 },
    { art: '016', buy: 40 }, { art: '017', buy: 40 }, { art: '018', found: [14, 38, 16], act: 4 }, { art: '019', buy: 40 },
    { art: '020', found: [8, 32, 18], act: 3 }, { art: '021', buy: 40 }, { art: '022', buy: 60 }, { art: '023', clear: 18 },
    { art: '024', found: [37, 16, 1], act: 8 }, { art: '025', clear: 49, act: 9 }, { art: '027', buy: 40 }, { art: '028', found: [25, 14, 12], act: 6 },
    { art: '029', clear: 23 }, { art: '030', found: [2, 18, 14], act: 1 }, { art: '031', buy: 40 }, { art: '032', clear: 25 },
    { art: '033', found: [9, 8, 12], act: 3 }, { art: '034', clear: 28 }, { art: '035', found: [29, 17, 16], act: 7 },
    { art: '036', clear: 30 }, { art: '037', clear: 32 }, { art: '039', found: [33, 27, 7], act: 7 }, { art: '040', clear: 35 },
    { art: '041', found: [17, 4, 9], act: 5 }, { art: '042', clear: 37 }, { art: '043', clear: 39 }, { art: '044', found: [23, 12, 7], act: 6 },
    { art: '045', clear: 42 }, { art: '047', found: [18, 27, 8], act: 5 }, { art: '048', clear: 44 }, { art: '049', clear: 46 },
    { art: '050', found: [49, 3, 10], act: 9 }, { art: '051', buy: 60 }, { art: '052', buy: 60 }, { art: '053', clear: 48 },
    { art: '054', found: [5, 28, 16], act: 2 }
  ];
  BATCH2.forEach(function (c) {
    var rule = c.clear != null ? { clear: c.clear, price: 0, text: c.act ? 'Finish Act ' + c.act : 'Clear Level ' + c.clear }
      : c.buy != null ? { buy: c.buy, price: c.buy, text: c.buy + ' ZEC' }
      : { found: { level: c.found[0], x: c.found[1], y: c.found[2] }, act: c.act, price: 0, text: 'Hidden in Act ' + c.act };
    ITEMS.push({ id: 'char-' + c.art, art: c.art, name: 'BitFoot #' + c.art,
      desc: c.found ? 'A real BitFoot from the collection, hidden somewhere off the path. Explore to find it.'
        : 'A real BitFoot from the collection, drawn exactly as it is. It wears its own look.', rule: rule });
  });
  var BY_ID = {};
  ITEMS.forEach(function (it) { BY_ID[it.id] = it; });
  var RETIRED = { 'char-078': 1, 'char-020': 1, 'char-024': 1, 'char-028': 1, 'char-030': 1, 'char-044': 1 };
  ITEMS = ITEMS.filter(function (it) { return !RETIRED[it.id]; });
  function get(id) { return BY_ID[id] || null; }
  function clearAt(r) { return r.clear === 'genesis' ? (typeof window.genesisAt === 'function' ? window.genesisAt() : 0) : r.clear; }
  function allChars() { try { var u = BH.trailSync && BH.trailSync.user(); return !!(u && u.allChars === true); } catch (e) { return false; } }
  function have(id, save) { return allChars() || !!(save && save.chars && typeof save.chars === 'object' && save.chars[id] === true); }
  function status(id, save) {
    var it = BY_ID[id];
    if (!it) return { state: 'locked', price: 0, text: 'Unknown character' };
    var r = it.rule;
    if (allChars()) return { state: 'owned', price: 0, text: r.text };
    if (r.buy != null) {
      if (have(id, save)) return { state: 'owned', price: r.buy, text: r.text };
      return { state: 'buyable', price: r.buy, text: r.text, afford: ((save && +save.wallet) || 0) >= r.buy };
    }
    if (r.found) return { state: have(id, save) ? 'owned' : 'locked', price: 0, text: r.text };
    if (r.clear == null) return { state: 'owned', price: 0, text: r.text };
    var n = clearAt(r), ok = !!(n && save && save.stars && save.stars[n] != null);
    return { state: ok ? 'owned' : 'locked', price: 0, text: r.text };
  }
  function buy(id, save) {
    var st = status(id, save);
    if (!save || st.state !== 'buyable' || !(+save.wallet >= st.price)) return false;
    save.wallet = +save.wallet - st.price;
    if (!save.chars || typeof save.chars !== 'object') save.chars = {};
    save.chars[id] = true;
    return true;
  }
  function spots(n) {
    var out = [];
    ITEMS.forEach(function (it) { var f = it.rule.found; if (f && f.level === n) out.push({ id: it.id, art: it.art, x: f.x, y: f.y }); });
    return out;
  }
  function stepFound(save, n, px, py, T, inCave) {
    if (inCave || !save || !T) return null;
    var tx = Math.floor(px / T), ty = Math.floor(py / T), list = spots(n);
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.x !== tx || s.y !== ty || have(s.id, save)) continue;
      if (!save.chars || typeof save.chars !== 'object') save.chars = {};
      save.chars[s.id] = true;
      return s.id;
    }
    return null;
  }
  function hidden(id, save) { var it = BY_ID[id]; return !!(it && it.rule.found && !have(id, save)); }
  var SIL = '#3b423b';
  function drawSil(ctx, x, y, opts, id, col) {
    var cv = ctx.canvas; if (!cv) return false;
    var off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height;
    var g = off.getContext('2d');
    if (!draw(g, x, y, opts, id)) return false;
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col || SIL; g.fillRect(0, 0, off.width, off.height);
    var d = g.getImageData(0, 0, off.width, off.height), p = d.data, c = hx(col || SIL);
    for (var i = 0; i < p.length; i += 4) { if (p[i + 3] > 0) { p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = 255; } }
    g.putImageData(d, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(off, 0, 0); ctx.restore();
    return true;
  }
  function drawFound(ctx, save, n, t, T) {
    spots(n).forEach(function (s) {
      if (have(s.id, save)) return;
      var cx = (s.x + 0.5) * T, cy = (s.y + 0.5) * T + Math.sin(t * 2.4 + s.x) * 2, r = T * 0.36, glow = 0.18 + 0.08 * Math.sin(t * 3 + s.y);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(234,186,73,' + glow.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#7a5a12'; ctx.beginPath(); ctx.arc(cx, cy, r + 1.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#eaba49'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#2a2116'; ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#eaba49';
      ctx.fillRect(Math.round(cx - 2), Math.round(cy - 1), 4, 5);
      [[-3, -4], [-1, -5], [1, -5], [3, -4]].forEach(function (o) { ctx.fillRect(Math.round(cx + o[0] - 0.5), Math.round(cy + o[1]), 1.5, 1.5); });
      ctx.restore();
    });
  }
  function worn(save) {
    var id = save && save.char;
    if (!id || id === DEFAULT || !BY_ID[id] || RETIRED[id]) return null;
    return status(id, save).state === 'owned' ? id : null;
  }

  var CW = 46, CH = 52, OX = 9;
  var ERASE = { '026': [24, 20, 33, 37] };
  var BELLY = 3, LEGS = 5, FOOTH = 4;
  function lum(c) { return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; }
  function sat(c) { var M = Math.max.apply(0, c), m = Math.min.apply(0, c); return M ? (M - m) / M : 0; }
  function hue(c) { var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
    if (!d) return 0; var h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; }
  function hdist(a, b) { if (sat(a) < 0.25 && sat(b) < 0.25) return 0; var d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); }
  function key(c) { return c[0] + ',' + c[1] + ',' + c[2]; }
  function css(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
  function hx(s) { return [1, 3, 5].map(function (i) { return parseInt(s.substr(i, 2), 16); }); }

  function Char(img, spec) {
    var C = { img: img, W: img.width, H: img.height, art: spec.art };
    var t = document.createElement('canvas'); t.width = C.W; t.height = C.H; var tg = t.getContext('2d'); tg.drawImage(img, 0, 0);
    var er = ERASE[spec.art];
    if (er) { tg.clearRect(er[0], er[1], er[2] - er[0] + 1, er[3] - er[1] + 1); C.img = t; }
    var D = tg.getImageData(0, 0, C.W, C.H).data;
    if (!D || D.length !== C.W * C.H * 4) return null;
    C.px = function (x, y) { if (x < 0 || y < 0 || x >= C.W || y >= C.H) return null; var i = (y * C.W + x) * 4; return D[i + 3] > 128 ? [D[i], D[i + 1], D[i + 2]] : null; };
    var seen = {}; C.pal = [];
    for (var y = 0; y < C.H; y++) for (var x = 0; x < C.W; x++) { var c = C.px(x, y); if (c && !seen[key(c)]) { seen[key(c)] = 1; C.pal.push(c); } }
    C.near = function (c, dir) {
      var best = null;
      C.pal.forEach(function (p) {
        if (hdist(p, c) > 30 || Math.abs(sat(p) - sat(c)) > 0.35) return;
        var dl = (lum(p) - lum(c)) * dir; if (dl < 8) return;
        if (!best || dl < (lum(best) - lum(c)) * dir) best = p;
      });
      return best || (dir < 0 ? c.map(function (v) { return Math.round(v * .72); }) : c);
    };
    C.dk = function (c, n) { for (var i = 0; i < (n || 1); i++) c = C.near(c, -1); return c; };
    C.lt = function (c, n) { for (var i = 0; i < (n || 1); i++) c = C.near(c, 1); return c; };
    var bs = 0, be = -1, run = 0, cs = 0;
    for (var x2 = 0; x2 <= C.W; x2++) {
      var n = 0; for (var y2 = C.H - 6; x2 < C.W && y2 < C.H; y2++) if (C.px(x2, y2)) n++;
      if (n >= 4) { if (!run) cs = x2; run++; if (x2 - cs > be - bs) { bs = cs; be = x2; } } else run = 0;
    }
    C.s0 = bs; C.s1 = be; var Wd = be - bs + 1;
    if (Wd >= 14) {
      var k = Wd / 19;
      C.waist = [bs + Math.round(3 * k), be - Math.round(2 * k)];
      C.hips = [bs + Math.round(4 * k), be - Math.round(3 * k)];
      C.lw = 4; C.gap = 1;
      var hw = C.hips[1] - C.hips[0] + 1;
      C.far = C.hips[0] + Math.round(2 * hw / 12); C.nearL = C.far + C.lw + C.gap;
    } else {
      C.waist = [bs, be]; C.hips = [bs, be];
      C.lw = Math.floor((Wd - 1) / 2); C.gap = Wd - 2 * C.lw;
      C.far = bs; C.nearL = bs + C.lw + C.gap;
    }
    C.srow = function (k) { var m = k % 10; return C.H - 1 - (m < 6 ? m : 10 - m); };
    C.col = function (x, k) { var y = C.srow(k); for (var i = 0; i < 10; i++) { var c = C.px(x, y - i); if (c) return c; } return C.px(x, C.H - 1) || [0, 0, 0]; };
    var base = hx(spec.foot), shade = hx(spec.sole);
    if (key(base) === key(shade) || !C.pal.some(function (p) { return key(p) === key(shade); })) shade = C.dk(base);
    var outs = C.pal.filter(function (p) { return hdist(p, base) <= 35 && lum(p) >= 0.35 * lum(base) && lum(p) < lum(shade) - 20; }).sort(function (a, b) { return lum(a) - lum(b); });
    C.feet = { base: base, shade: shade, deep: C.dk(shade), hi: C.lt(base), out: outs[0] || C.dk(shade, 2) };
    C.feetFar = { base: shade, shade: C.dk(shade), deep: C.dk(shade, 2), hi: base, out: C.feet.out };
    C.CH = CH + Math.max(0, C.H - (CH - 1 - FOOTH - LEGS - BELLY));
    return C;
  }
  function foot(g, C, x, y, lw, T) {
    var len = lw + 7, inst = lw + 2;
    var P = function (X, Y, c) { g.fillStyle = css(c); g.fillRect(X, Y, 1, 1); };
    for (var i = 0; i < inst; i++) P(x + 1 + i, y, i === 0 ? T.shade : T.base);
    P(x + inst, y, T.hi);
    for (var r = 1; r <= 2; r++) for (var j = 0; j < len; j++) {
      var c = T.base;
      if (j === 0) c = T.out; else if (j === 1) c = T.deep; else if (j === 2) c = T.shade;
      if (r === 2 && j > 2 && j < len - 1) c = j < 6 ? T.shade : T.base;
      P(x + j, y + r, c);
    }
    P(x + len - 3, y + 1, T.shade); P(x + len - 1, y + 1, T.shade);
    P(x + len - 2, y + 1, T.hi); P(x + len - 4, y + 1, T.hi);
    P(x + len - 1, y + 2, T.out);
    for (var q = 0; q < len; q++) P(x + q, y + 3, T.out);
  }
  function pick(C, ax, k, e0, e1) { return C.col(ax === e0 ? C.s0 : ax === e1 ? C.s1 : ax, k); }
  var ARM_CFG = {
    '114': { edge: '#495169' },
    '026': { base: '#6369e0', edge: '#445dc3' },
    '078': { base: '#ff9e36', edge: '#bd0b29', hand: '#ffcd42', handSh: '#ff9e36' },
    '062': { hand: '#ffffff', handSh: '#c4bbb3' }
  };
  var OWN_ARM = { '074': 1 };
  function bodyColour(C) {
    var cnt = {}, order = [];
    for (var y = C.H - 6; y < C.H; y++) for (var x = C.s0; x <= C.s1; x++) {
      var c = C.px(x, y); if (!c) continue; var kk = key(c);
      if (!cnt[kk]) { cnt[kk] = { c: c, n: 0 }; order.push(kk); } cnt[kk].n++;
    }
    var best = null; order.forEach(function (kk) { if (!best || cnt[kk].n > best.n) best = cnt[kk]; });
    return best.c;
  }
  function arm(g, C, ox, bustY, hipsY, swing, far) {
    var cfg = ARM_CFG[C.art] || {}, body = cfg.base ? hx(cfg.base) : bodyColour(C);
    var P = function (X, Y, c) { g.fillStyle = css(c); g.fillRect(X, Y, 1, 1); };
    var base = far ? C.dk(body) : body;
    var edge = cfg.edge ? hx(cfg.edge) : C.dk(base);
    if (far && cfg.edge) edge = C.dk(edge);
    var T = far ? C.feetFar : C.feet;
    if (cfg.hand) { var hb = hx(cfg.hand), hs = hx(cfg.handSh); T = { base: far ? hs : hb, shade: far ? C.dk(hs) : hs }; }
    var x0 = far ? C.s0 - 1 : C.s1 - 1, top = bustY + C.H - 7, bot = hipsY + 1, n = bot - top;
    var step = swing ? Math.max(1, Math.round(n / Math.abs(swing))) : 0;
    for (var r = 0; r < n; r++) {
      var off = swing ? (swing > 0 ? 1 : -1) * Math.min(Math.abs(swing), Math.floor(r / step)) : 0;
      P(ox + x0 + off, top + r, edge); P(ox + x0 + off + 1, top + r, base); P(ox + x0 + off + 2, top + r, base);
    }
    var hxp = ox + x0 + swing;
    for (var yy = 0; yy < 3; yy++) for (var xx = 0; xx < 3; xx++) P(hxp + xx, bot + yy, (yy === 2 || xx === 0) ? T.shade : T.base);
    P(hxp + 3, bot + 1, T.shade);
  }
  function frame(C, p) {
    var H = C.CH, f = document.createElement('canvas'); f.width = CW; f.height = H; var g = f.getContext('2d'); g.imageSmoothingEnabled = false;
    var u = p.u || 0, hop = p.hop || 0, ox = OX + (p.dx || 0), bx = p.bx || 0;
    var hipsY = H - 1 - FOOTH - LEGS - hop;
    var bustY = hipsY - BELLY - C.H + u;
    var P = function (X, Y, c) { g.fillStyle = css(c); g.fillRect(X, Y, 1, 1); };
    var bellyTop = bustY + C.H;
    for (var y = bustY + C.H - 2; y < hipsY; y++) {
      var k = y - bellyTop; if (k < 0) k = 0;
      for (var ax = C.waist[0]; ax <= C.waist[1]; ax++) P(ox + bx + ax, y, pick(C, ax, k, C.waist[0], C.waist[1]));
    }
    var kh = BELLY;
    for (var hx2 = C.hips[0]; hx2 <= C.hips[1]; hx2++) P(ox + bx + hx2, hipsY, pick(C, hx2, kh, C.hips[0], C.hips[1]));
    var arms = p.arms != null && !OWN_ARM[C.art];
    if (arms) arm(g, C, ox + bx, bustY, hipsY, -p.arms, true);
    function leg(a, shift, lift, far) {
      var h = LEGS - lift;
      for (var r = 0; r < h; r++) {
        for (var c = 0; c < C.lw; c++) {
          var col = pick(C, a + c, kh + 1 + r, a, a + C.lw - 1);
          if (far) col = C.dk(col);
          P(ox + a + c + shift, hipsY + 1 + r, col);
        }
      }
      foot(g, C, ox + a + shift - 1, hipsY + 1 + h, C.lw, far ? C.feetFar : C.feet);
    }
    leg(C.far, p.ff || 0, Math.min(p.fl || 0, 3), true);
    leg(C.nearL, p.nf || 0, Math.min(p.nl || 0, 3), false);
    if (arms) arm(g, C, ox + bx, bustY, hipsY, p.arms, false);
    g.drawImage(C.img, ox + bx, bustY);
    f._bust = { x: ox + bx, y: bustY };
    return f;
  }
  function mirror(cv) {
    var m = document.createElement('canvas'); m.width = cv.width; m.height = cv.height;
    var g = m.getContext('2d'); g.translate(cv.width, 0); g.scale(-1, 1); g.drawImage(cv, 0, 0); m._mirrored = true; return m;
  }
  var POSES = {
    idle_0: { arms: 0 }, idle_1: { u: 1, arms: 0 },
    walk_0: { u: 1, bx: 1, nf: 2, ff: -2, arms: -2 }, walk_1: { fl: 2, arms: 0 }, walk_2: { u: 1, bx: 1, nf: -1, ff: 1, arms: 2 }, walk_3: { nl: 2, arms: 0 },
    caught_0: { arms: 0 }, caught_1: { u: 1, arms: 0 },
    celebrate_0: { u: 1, arms: 0 }, celebrate_1: { nf: 2, ff: -2, arms: 0 }, celebrate_2: { nf: 2, ff: -2, arms: 0 }
  };
  function buildFrames(C) {
    var out = {};
    Object.keys(POSES).forEach(function (pk) {
      var cv = frame(C, POSES[pk]), parts = pk.split('_');
      if (parts[0] === 'idle' || parts[0] === 'walk') {
        out[parts[0] + '_right_' + parts[1]] = cv; out[parts[0] + '_down_' + parts[1]] = cv; out[parts[0] + '_up_' + parts[1]] = cv;
        out[parts[0] + '_left_' + parts[1]] = mirror(cv);
      } else out[pk] = cv;
    });
    return out;
  }

  var cache = {};
  function entry(id) {
    var it = BY_ID[id]; if (!it || !it.art) return null;
    var e = cache[id];
    if (!e) {
      e = cache[id] = { img: null, C: null, frames: null };
      try { var img = new Image(); img.onload = function () { e.loaded = true; }; var cut = 'assets/cut/' + it.art + '.png'; img.src = /^(data:|blob:|https?:)/.test(cut) ? cut : ASSET + cut; e.img = img; } catch (err) { e.failed = true; }
    }
    return e;
  }
  var SHEET = { src: 'assets/chars/walk.png', w: 58, h: 61, n: 8, ms: 80,
    arts: ['001', '004', '046', '026', '094', '058', '114', '074', '078', '062'], IDLE: 0, STRIDE: 2,
    idle: null };
  BATCH2.forEach(function (c) { SHEET.arts.push(c.art); });
  SHEET.arts.push('zec');
  var sheet = { img: null, loaded: false, failed: false };
  try {
    sheet.img = new Image();
    sheet.img.onload = function () { sheet.loaded = true; };
    sheet.img.onerror = function () { sheet.failed = true; };
    sheet.img.src = at(SHEET.src);
  } catch (err) { sheet.failed = true; }
  var idleSheet = { img: null, loaded: false, failed: true };
  function dropBuilt() { Object.keys(cache).forEach(function (k) { if (cache[k].frames && cache[k].frames._eight) cache[k].frames = null; }); }
  function useIdle(src) {
    idleSheet = { img: null, loaded: false, failed: !src };
    dropBuilt();
    if (!src) return;
    try {
      var im = new Image(); idleSheet.img = im;
      im.onload = function () { idleSheet.loaded = true; dropBuilt(); };
      im.onerror = function () { idleSheet.failed = true; };
      im.src = /^(data:|blob:|https?:)/.test(src) ? src : ASSET + src;
    } catch (err) { idleSheet.failed = true; }
  }
  if (SHEET.idle) useIdle(SHEET.idle);
  function cut(img, k, row) {
    var cv = document.createElement('canvas'); cv.width = SHEET.w; cv.height = SHEET.h;
    var g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(img, k * SHEET.w, row * SHEET.h, SHEET.w, SHEET.h, 0, 0, SHEET.w, SHEET.h);
    return cv;
  }
  function sheetFrames(row) {
    var cells = [];
    for (var k = 0; k < SHEET.n; k++) {
      var cv = document.createElement('canvas'); cv.width = SHEET.w; cv.height = SHEET.h;
      var g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(sheet.img, k * SHEET.w, row * SHEET.h, SHEET.w, SHEET.h, 0, 0, SHEET.w, SHEET.h);
      cells.push(cv);
    }
    var out = { _eight: true };
    ['right', 'down', 'up'].forEach(function (d) {
      cells.forEach(function (cv, k) { out['walk_' + d + '_' + k] = cv; });
      out['idle_' + d + '_0'] = out['idle_' + d + '_1'] = cells[SHEET.IDLE];
    });
    cells.forEach(function (cv, k) { out['walk_left_' + k] = mirror(cv); });
    out.idle_left_0 = out.idle_left_1 = out.walk_left_0;
    out.caught_0 = out.caught_1 = out.celebrate_0 = cells[SHEET.IDLE];
    out.celebrate_1 = out.celebrate_2 = cells[SHEET.STRIDE];
    var I = idleSheet.img;
    if (!idleSheet.failed && idleSheet.loaded && I && I.complete && I.naturalWidth && I.naturalHeight >= (row + 1) * SHEET.h) {
      out._idle8 = true;
      for (var q = 0; q < SHEET.n; q++) {
        var ic = cut(I, q, row);
        out['idle_right_' + q] = out['idle_down_' + q] = out['idle_up_' + q] = ic; out['idle_left_' + q] = mirror(ic);
      }
    }
    var d = cells[SHEET.IDLE].getContext('2d').getImageData(0, 0, SHEET.w, SHEET.h).data, top = SHEET.h;
    for (var i = 3; i < d.length; i += 4) if (d[i] > 128) { top = Math.floor((i >> 2) / SHEET.w); break; }
    out._height = SHEET.h - top;
    return out;
  }

  function frames(id) {
    var e = entry(id); if (!e || e.failed) return null;
    if (e.frames) return e.frames;
    var row = SHEET.arts.indexOf(BY_ID[id].art);
    if (row >= 0 && !sheet.failed) {
      if (!sheet.loaded || !sheet.img.complete || !sheet.img.naturalWidth) return null;
      try { e.frames = sheetFrames(row); return e.frames; } catch (err) { sheet.failed = true; }
    }
    var img = e.img;
    if (!img || !e.loaded || !img.complete || !img.naturalWidth) return null;
    try {
      var C = Char(img, BY_ID[id]);
      if (!C) { e.failed = true; return null; }
      e.C = C; e.frames = buildFrames(C);
    } catch (err) { e.failed = true; return null; }
    return e.frames;
  }
  function frameH(id) { var e = cache[id]; return e && e.frames && e.frames._eight ? SHEET.h : e && e.C ? e.C.CH : CH; }
  function height(id) {
    var e = cache[id];
    if (e && e.frames && e.frames._eight) return e.frames._height;
    return e && e.C ? e.C.H + BELLY + 1 + LEGS + FOOTH : 45;
  }
  function preload(id) { entry(id); }

  function feetX(fr) {
    if (fr._fx != null) return fr._fx;
    var cv = fr.idle_right_0, fx = 26;
    try {
      var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, W = cv.width, H = cv.height, bot = -1, mn = W, mx = -1;
      for (var y = H - 1; y >= 0 && bot < 0; y--) for (var x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 0) { bot = y; break; }
      for (var yy = Math.max(0, bot - 3); yy <= bot; yy++) for (var xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 0) { mn = Math.min(mn, xx); mx = Math.max(mx, xx); }
      if (mx >= mn) return (fr._fx = (mn + mx + 1) / 2);
    } catch (e) {}
    return fx;
  }
  function draw(ctx, x, y, opts, id) {
    var S = window.BitfootSprite, fr = frames(id);
    if (!fr || !S || typeof S.resolve !== 'function') return false;
    opts = opts || {};
    var s = opts.scale == null ? 3 : opts.scale, a = opts.alpha == null ? 1 : opts.alpha, r = S.resolve(opts);
    var key = r.key;
    var step8 = Math.floor(Math.max(0, +opts.t || 0) * 1000 / SHEET.ms) % SHEET.n;
    if (fr._eight && key.indexOf('walk_') === 0) key = 'walk_' + key.split('_')[1] + '_' + step8;
    else if (fr._idle8 && key.indexOf('idle_') === 0) key = 'idle_' + key.split('_')[1] + '_' + step8;
    else if (fr._idle8 && key.indexOf('caught_') === 0) key = 'idle_right_' + step8;
    var cv = fr[key] || fr.idle_right_0, H = cv.height, W = cv.width;
    var fx = feetX(fr), cx = cv._mirrored ? W - fx : fx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = a;
    ctx.drawImage(cv, Math.round(x - cx * s + r.dx * s), Math.round(y - H * s - Math.round(r.hop) * s), Math.round(W * s), Math.round(H * s));
    ctx.restore();
    return true;
  }

  var CLIMB = { src: 'assets/chars/climb-back.png', w: 58, h: 61, cx: 29, img: null, ok: false };
  function climbSheet() {
    if (!CLIMB.img) try { CLIMB.img = new Image(); CLIMB.img.onload = function () { CLIMB.ok = true; }; CLIMB.img.src = at(CLIMB.src); } catch (err) {}
    return CLIMB.ok ? CLIMB.img : null;
  }
  function drawClimb(ctx, x, y, k, id, opts) {
    var it = BY_ID[id], row = it ? SHEET.arts.indexOf(it.art) : -1, im = climbSheet();
    if (row < 0 || !im) return false;
    opts = opts || {};
    var s = opts.scale == null ? 3 : opts.scale;
    var al = opts.alpha == null ? 1 : opts.alpha, dx = Math.round(x - CLIMB.cx * s), dy = Math.round(y - CLIMB.h * s), K = window.BH && BH.cosmetics;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = al;
    if (opts.look && K && K.climbLook) K.climbLook(ctx, climbCell(im, row, k % 5), dx, dy, s, opts.look.fur, opts.look.hat, opts.t, al);
    else ctx.drawImage(im, (k % 5) * CLIMB.w, row * CLIMB.h, CLIMB.w, CLIMB.h, dx, dy, CLIMB.w * s, CLIMB.h * s);
    ctx.restore();
    return true;
  }
  var CELLS = {};
  function climbCell(im, row, k) {
    var key = row * 5 + k;
    if (!CELLS[key]) {
      var c = document.createElement('canvas'); c.width = CLIMB.w; c.height = CLIMB.h;
      c.getContext('2d').drawImage(im, k * CLIMB.w, row * CLIMB.h, CLIMB.w, CLIMB.h, 0, 0, CLIMB.w, CLIMB.h);
      CELLS[key] = c;
    }
    return CELLS[key];
  }

  var MAIN = 'char-001';
  function main(cos) {
    var f = cos && cos.fur, h = cos && cos.hat;
    return (!f || f === 'fur-classic') && (!h || h === 'hat-none') ? MAIN : null;
  }

  BH.characters = {
    drawClimb: drawClimb, climbSheet: climbSheet, main: main, MAIN: MAIN,
    list: ITEMS, DEFAULT: DEFAULT, get: get, status: status, worn: worn, unlockAt: function (id) { var it = BY_ID[id]; return it && it.rule.clear != null ? clearAt(it.rule) : 0; },
    buy: buy, spots: spots, stepFound: stepFound, drawFound: drawFound, hidden: hidden, drawSil: drawSil, SIL: SIL, SHEET_ARTS: SHEET.arts, _useIdle: useIdle,
    draw: draw, frames: frames, preload: preload, frameH: frameH, height: height, FRAME_W: CW,
    _poses: POSES, _bust: function (id) { var e = cache[id]; return e && e.frames ? e.frames.idle_right_0._bust : null; }
  };
  ITEMS.forEach(function (it) { if (it.art) preload(it.id); });
})();
