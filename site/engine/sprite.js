(function () {
  'use strict';

  var W = 32, H = 45;
  var SPIN_DURATION = 0.45;

  var C = {
    fur: '#6E4250', furDk: '#472E3E', furLt: '#7B525F',
    face: '#C9B2B9', faceSh: '#A88D96',
    eye: '#07152B', eye2: '#0D2140', glint: '#F8F7F4', teeth: '#F8F7F4'
  };

  function mk() {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    return { c: c, g: g };
  }
  function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  function P(g, x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  function mirror(cv) {
    var m = mk(); m.g.translate(W, 0); m.g.scale(-1, 1); m.g.drawImage(cv, 0, 0); return m.c;
  }

  function head(g, X, Y, mouth, blink) {
    R(g, X + 3, Y, 13, 3, C.fur);
    P(g, X + 7, Y - 1, C.fur); P(g, X + 8, Y - 1, C.fur);
    R(g, X + 1, Y + 1, 2, 20, C.furDk);
    R(g, X + 3, Y + 3, 2, 18, C.fur);
    R(g, X + 5, Y + 3, 12, 11, C.face);
    R(g, X + 5, Y + 14, 2, 6, C.furLt);
    R(g, X + 7, Y + 14, 10, 6, C.face);
    R(g, X + 5, Y + 20, 11, 1, C.furLt);
    R(g, X, Y + 7, 4, 4, C.face);
    R(g, X + 1, Y + 8, 2, 1, C.faceSh); P(g, X + 2, Y + 9, C.faceSh);
    if (blink) {
      R(g, X + 7, Y + 9, 5, 2, C.eye); R(g, X + 13, Y + 9, 5, 2, C.eye);
    } else {
      R(g, X + 7, Y + 6, 3, 5, C.eye); R(g, X + 10, Y + 6, 2, 5, C.eye2);
      R(g, X + 13, Y + 6, 3, 5, C.eye); R(g, X + 16, Y + 6, 2, 5, C.eye2);
      R(g, X + 10, Y + 8, 1, 2, C.glint); R(g, X + 16, Y + 8, 1, 2, C.glint);
    }
    P(g, X + 11, Y + 12, C.faceSh); P(g, X + 13, Y + 12, C.faceSh);
    if (mouth === 'wide') {
      R(g, X + 9, Y + 13, 7, 7, C.eye);
      R(g, X + 9, Y + 13, 6, 1, C.teeth); R(g, X + 9, Y + 19, 6, 1, C.teeth);
    } else if (mouth === 'big') {
      R(g, X + 9, Y + 14, 7, 5, C.eye);
      R(g, X + 9, Y + 14, 6, 1, C.teeth); R(g, X + 9, Y + 18, 6, 1, C.teeth);
    } else {
      R(g, X + 9, Y + 14, 7, 4, C.eye);
      R(g, X + 9, Y + 14, 6, 1, C.teeth); R(g, X + 9, Y + 17, 6, 1, C.teeth);
    }
  }

  function foot(g, x, y, far) {
    var a = far ? C.faceSh : C.face, s = far ? C.furDk : C.faceSh;
    R(g, x + 1, y, 6, 1, a);
    R(g, x, y + 1, 11, 2, a);
    R(g, x, y + 3, 11, 1, s);
    P(g, x + 8, y + 1, s); P(g, x + 10, y + 1, s);
  }

  var HX = 7;
  function side(p) {
    var f = mk(), g = f.g, u = p.u || 0, sw = p.sw || 0;
    var hy = 1 + u;
    var up = p.arms === 'up' || p.arms === 'wave';
    if (up) {
      R(g, 1, 5 + u, 3, 19, C.furDk); R(g, 1, 3 + u, 3, 2, C.faceSh);
    } else {
      var fa = 17 - sw;
      R(g, fa, 23 + u, 3, 12, C.furDk); R(g, fa, 35 + u, 3, 2, C.faceSh);
    }
    var fx = 8 + (p.ff || 0), fl = p.fl || 0;
    var nx = 13 + (p.nf || 0), nl = p.nl || 0;
    R(g, fx, 36, 4, 5 - fl, C.furDk);
    foot(g, fx - 1, 41 - fl, true);
    R(g, 5, 22 + u, 15, 1, C.fur);
    R(g, 3, 23 + u, 18, 1, C.fur);
    R(g, 2, 24 + u, 19, 8, C.fur);
    R(g, 3, 23 + u, 2, 1, C.furDk); R(g, 2, 24 + u, 3, 8, C.furDk);
    R(g, 5, 32 + u, 14, 3 - u, C.fur);
    R(g, 5, 32 + u, 2, 3 - u, C.furDk);
    R(g, 6, 35, 12, 1, C.fur);
    R(g, 10, 24 + u, 4, 3, C.faceSh); R(g, 15, 24 + u, 3, 3, C.faceSh);
    R(g, 10, 28 + u, 4, 2, C.faceSh); R(g, 15, 28 + u, 3, 2, C.faceSh);
    R(g, 11, 32 + u, 3, 1, C.furLt); R(g, 15, 32 + u, 2, 1, C.furLt);
    head(g, HX, hy, p.mouth || 'grin', p.blink);
    R(g, nx, 36, 4, 5 - nl, C.fur); R(g, nx, 36, 1, 5 - nl, C.furDk);
    foot(g, nx - 1, 41 - nl, false);
    if (up) {
      var top = 2 + u + (p.arms === 'wave' ? 3 : 0);
      R(g, 19, 22 + u, 6, 3, C.furDk);
      R(g, 25, top + 2, 3, 23 + u - top, C.furDk); R(g, 27, top + 2, 1, 23 + u - top, C.fur);
      R(g, 25, top, 3, 2, C.face);
    } else {
      var ax = 20 + sw;
      R(g, ax, 23 + u, 3, 12, C.furDk); R(g, ax + 2, 23 + u, 1, 12, C.fur);
      R(g, ax, 35 + u, 3, 2, C.face); P(g, ax, 36 + u, C.faceSh);
    }
    return f.c;
  }

  function back(p) {
    var f = mk(), g = f.g, u = p.u || 0;
    var l = p.ll || 0, r = p.rl || 0;
    R(g, 10, 36, 5, 5 - l, C.fur); R(g, 10, 36, 1, 5 - l, C.furDk);
    R(g, 17, 36, 5, 5 - r, C.fur); R(g, 21, 36, 1, 5 - r, C.furDk);
    R(g, 8, 41 - l, 8, 4, C.face); R(g, 8, 44 - l - (l ? 2 : 0), 8, l ? 3 : 1, C.faceSh);
    R(g, 17, 41 - r, 8, 4, C.face); R(g, 17, 44 - r - (r ? 2 : 0), 8, r ? 3 : 1, C.faceSh);
    R(g, 9, 22 + u, 14, 1, C.fur);
    R(g, 7, 23 + u, 18, 1, C.fur);
    R(g, 6, 24 + u, 20, 8, C.fur);
    R(g, 6, 24 + u, 2, 8, C.furDk);
    R(g, 9, 25 + u, 4, 3, C.furLt); R(g, 19, 25 + u, 4, 3, C.furLt);
    R(g, 15, 25 + u, 2, 7, C.furDk);
    R(g, 8, 32 + u, 16, 3 - u, C.fur); R(g, 8, 32 + u, 2, 3 - u, C.furDk);
    R(g, 9, 35, 14, 1, C.fur);
    R(g, 3, 23 + u + (p.la || 0), 3, 12, C.furDk); R(g, 3, 35 + u + (p.la || 0), 3, 2, C.faceSh);
    R(g, 26, 23 + u + (p.ra || 0), 3, 12, C.furDk); R(g, 26, 35 + u + (p.ra || 0), 3, 2, C.faceSh);
    var hy = 1 + u;
    R(g, 9, hy, 14, 21, C.fur);
    P(g, 14, hy - 1, C.fur); P(g, 15, hy - 1, C.fur);
    R(g, 9, hy + 1, 2, 20, C.furDk);
    R(g, 12, hy, 8, 2, C.furLt);
    R(g, 9, hy + 20, 14, 1, C.furDk);
    R(g, 6, hy + 7, 3, 4, C.face); P(g, 7, hy + 8, C.faceSh);
    R(g, 23, hy + 7, 3, 4, C.face); P(g, 24, hy + 8, C.faceSh);
    return f.c;
  }

  var frames = {}, FRAME_KEYS = [];
  function put(k, cv) { frames[k] = cv; FRAME_KEYS.push(k); }

  function build() {
    put('idle_right_0', side({}));
    put('idle_right_1', side({ u: 1, blink: true }));
    put('walk_right_0', side({ nf: 3, ff: -3, fl: 1, sw: -2 }));
    put('walk_right_1', side({ u: 1, nf: 0, ff: 0, fl: 2 }));
    put('walk_right_2', side({ nf: -3, ff: 3, nl: 1, sw: 2 }));
    put('walk_right_3', side({ u: 1, nf: 0, ff: 0, nl: 2 }));
    ['idle_right_0', 'idle_right_1', 'walk_right_0', 'walk_right_1', 'walk_right_2', 'walk_right_3']
      .forEach(function (k) {
        put(k.replace('right', 'left'), mirror(frames[k]));
        put(k.replace('right', 'down'), frames[k]);
      });
    put('idle_up_0', back({}));
    put('idle_up_1', back({ u: 1 }));
    put('walk_up_0', back({ ll: 3, la: -1, ra: 1 }));
    put('walk_up_1', back({ u: 1 }));
    put('walk_up_2', back({ rl: 3, la: 1, ra: -1 }));
    put('walk_up_3', back({ u: 1 }));
    put('caught_0', side({ arms: 'up', mouth: 'wide' }));
    put('caught_1', side({ arms: 'up', mouth: 'wide', u: 1, blink: true }));
    put('celebrate_0', side({ u: 2, mouth: 'big', nf: 1, ff: -1 }));
    put('celebrate_1', side({ arms: 'up', mouth: 'big', nf: 2, ff: -2 }));
    put('celebrate_2', side({ arms: 'wave', mouth: 'big', nf: 2, ff: -2 }));
  }

  var sheet = null, sheetMap = null;
  function useSheet(img, frameMap) { sheet = img || null; sheetMap = img ? (frameMap || {}) : null; }

  var SPIN_ORDER = ['down', 'left', 'up', 'right', 'down'];
  var DIRS = { down: 1, up: 1, left: 1, right: 1 };
  function resolve(o) {
    var dir = DIRS[o.dir] ? o.dir : 'down', st = o.state || 'idle', t = Math.max(0, +o.t || 0);
    var r = { key: 'idle_' + dir + '_0', hop: 0, dx: 0 };
    if (st === 'walk') {
      r.key = 'walk_' + dir + '_' + (Math.floor(t / 0.12) % 4);
    } else if (st === 'spin') {
      var p = Math.min(1, t / SPIN_DURATION);
      r.key = 'idle_' + SPIN_ORDER[Math.min(4, Math.floor(p * 5))] + '_0';
      r.hop = p < 1 ? Math.sin(Math.PI * p) * 8 : 0;
    } else if (st === 'caught') {
      var ci = Math.floor(t / 0.12) % 2;
      r.key = 'caught_' + ci;
      r.dx = t < 0.72 ? (ci ? 1 : -1) : 0;
    } else if (st === 'celebrate') {
      var cyc = 0.7, ph = (t % cyc) / cyc;
      if (ph < 0.18) r.key = 'celebrate_0';
      else {
        r.hop = Math.sin(Math.PI * (ph - 0.18) / 0.82) * 10;
        r.key = (Math.floor(t / 0.14) % 2) ? 'celebrate_2' : 'celebrate_1';
      }
    } else {
      r.key = 'idle_' + dir + '_' + ((t % 1.6) > 1.25 ? 1 : 0);
    }
    return r;
  }

  function draw(ctx, x, y, opts) {
    opts = opts || {};
    var s = opts.scale == null ? 3 : opts.scale;
    var a = opts.alpha == null ? 1 : opts.alpha;
    var r = resolve(opts);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = a;
    var hop = Math.round(r.hop) * s, jx = r.dx * s;
    var rect = sheet && sheetMap[r.key], mirrored = false;
    if (sheet && !rect && r.key.indexOf('_left_') > 0) {
      rect = sheetMap[r.key.replace('_left_', '_right_')]; mirrored = !!rect;
    }
    if (rect) {
      var dw = rect[2] * s, dh = rect[3] * s;
      var dx = Math.round(x - dw / 2 + jx), dy = Math.round(y - dh - hop);
      if (mirrored) {
        ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
        ctx.drawImage(sheet, rect[0], rect[1], rect[2], rect[3], 0, 0, dw, dh);
      } else {
        ctx.drawImage(sheet, rect[0], rect[1], rect[2], rect[3], dx, dy, dw, dh);
      }
    } else {
      ctx.drawImage(frames[r.key] || frames.idle_down_0,
        Math.round(x - (W * s) / 2 + jx), Math.round(y - H * s - hop), Math.round(W * s), Math.round(H * s));
    }
    ctx.restore();
  }

  build();

  window.BitfootSprite = {
    W: W, H: H,
    draw: draw,
    SPIN_DURATION: SPIN_DURATION,
    useSheet: useSheet,
    resolve: resolve,
    FRAME_KEYS: FRAME_KEYS.slice(),
    frames: frames
  };
})();
