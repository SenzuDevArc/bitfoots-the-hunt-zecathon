(function () {
  'use strict';

  var BH = window.BH = window.BH || {};

  var BASE = { fur: '#6E4250', furDk: '#472E3E', furLt: '#7B525F' };
  var GOLD = '#eaba49', GOLD_DK = '#b8862b', INK = '#fffaf0', RED = '#c8412f', ICE = '#bfe9ff';

  var ITEMS = [
    { id: 'fur-classic', slot: 'fur', name: 'Classic', desc: 'The fur you were born with.',
      pal: BASE, rule: { price: 0, text: 'Yours from the start' } },
    { id: 'fur-bark', slot: 'fur', name: 'Bark', desc: 'Deep forest brown.',
      pal: { fur: '#5C3B28', furDk: '#3B2619', furLt: '#704A34' }, rule: { stars: 10, price: 25, text: '10 stars · 25 ZEC' } },
    { id: 'fur-ash', slot: 'fur', name: 'Ash', desc: 'Grey as a cold campfire.',
      pal: { fur: '#6A6C72', furDk: '#46484E', furLt: '#7E8187' }, rule: { stars: 10, price: 25, text: '10 stars · 25 ZEC' } },
    { id: 'fur-moss', slot: 'fur', name: 'Moss', desc: 'Blends into the pines.',
      pal: { fur: '#566437', furDk: '#374222', furLt: '#6A7946' }, rule: { stars: 20, price: 40, text: '20 stars · 40 ZEC' } },
    { id: 'fur-rust', slot: 'fur', name: 'Rust', desc: 'Ginger, loud, proud.',
      pal: { fur: '#9A542E', furDk: '#67351A', furLt: '#B06840' }, rule: { stars: 20, price: 40, text: '20 stars · 40 ZEC' } },
    { id: 'fur-midnight', slot: 'fur', name: 'Midnight', desc: 'Near-black. Hunters hate it.',
      pal: { fur: '#2C2B36', furDk: '#18171F', furLt: '#3D3C4A' }, rule: { stars: 30, price: 50, text: '30 stars · 50 ZEC' } },
    { id: 'fur-snow', slot: 'fur', name: 'Snow', desc: 'Pale winter coat.',
      pal: { fur: '#DCDDE0', furDk: '#9EA2AA', furLt: '#EEEFF1' }, rule: { stars: 30, price: 50, text: '30 stars · 50 ZEC' } },
    { id: 'fur-shielded', slot: 'fur', name: 'Shielded Gold', desc: 'Rare. A light runs through it, like a note moving unseen.',
      pal: { fur: '#B98A2E', furDk: '#7E5A17', furLt: '#CFA048' }, shimmer: '#F6DC8A', rare: true,
      rule: { stars: 30, clear: 15, price: 60, text: '30 stars + Clear Level 12 · 60 ZEC' } },

    { id: 'hat-none', slot: 'hat', name: 'No hat', desc: 'Bare head.', rule: { price: 0, text: 'Always' } },
    { id: 'hat-headband', slot: 'hat', name: 'Tracker headband', desc: 'Taken off the Tracker\'s camp line.',
      rule: { clear: 3, price: 0, text: 'Clear Level 3' } },
    { id: 'hat-cap', slot: 'hat', name: 'Ranger cap', desc: 'The ranger never asked for it back.',
      rule: { clear: 6, price: 0, text: 'Clear Level 6' } },
    { id: 'hat-beanie', slot: 'hat', name: 'Deep beanie', desc: 'Keeps the ears warm underwater.',
      rule: { clear: 10, price: 0, text: 'Clear Level 9' } },
    { id: 'hat-lantern', slot: 'hat', name: 'Lantern hat', desc: 'A hunter\'s lamp, now on your side.',
      rule: { clear: 13, price: 0, text: 'Clear Level 11' } },
    { id: 'hat-crown', slot: 'hat', name: 'Crown', desc: 'For whoever took the Ledger.',
      rule: { clear: 14, price: 0, text: 'Clear Level 12' } },

    { id: 'print-paw', slot: 'print', name: 'Gold paw', desc: 'The classic public trail.', rule: { price: 0, text: 'Yours from the start' } },
    { id: 'print-shoe', slot: 'print', name: 'Pixel shoe', desc: 'Sneaker tread.', rule: { badges: 3, price: 40, text: '3 badges · 40 ZEC' } },
    { id: 'print-leaf', slot: 'print', name: 'Leaf', desc: 'Looks natural. Still public.', rule: { badges: 3, price: 40, text: '3 badges · 40 ZEC' } },
    { id: 'print-snow', slot: 'print', name: 'Snowflake', desc: 'Every one different, every one seen.', rule: { badges: 6, price: 50, text: '6 badges · 50 ZEC' } },
    { id: 'print-rune', slot: 'print', name: 'Glowing rune', desc: 'Pulses as it ages.', rule: { badges: 6, price: 60, text: '6 badges · 60 ZEC' } },
    { id: 'print-zec', slot: 'print', name: 'ZEC stamp', desc: 'A coin pressed into the mud. Public, like a transparent address.',
      rule: { badges: 10, price: 75, text: '10 badges · 75 ZEC' } },

    { id: 'cele-burst', slot: 'cele', name: 'Gold burst', desc: 'The default den burst.', rule: { price: 0, text: 'Yours from the start' } },
    { id: 'cele-rain', slot: 'cele', name: 'Gold rain', desc: 'Coins fall from the pines.', rule: { act: 0, price: 50, text: '3 stars on all of Act 1 · 50 ZEC' } },
    { id: 'cele-fireflies', slot: 'cele', name: 'Fireflies', desc: 'The forest lights up for you.', rule: { act: 1, price: 50, text: '3 stars on all of Act 2 · 50 ZEC' } },
    { id: 'cele-ripple', slot: 'cele', name: 'Shield ripple', desc: 'Rings of shield water spread from the den.', rule: { act: 2, price: 50, text: '3 stars on all of Act 3 · 50 ZEC' } }
  ];
  var BY_ID = {};
  ITEMS.forEach(function (it) { BY_ID[it.id] = it; });
  var SLOTS = ['fur', 'hat', 'print', 'cele'];
  var DEFAULTS = { fur: 'fur-classic', hat: 'hat-none', print: 'print-paw', cele: 'cele-burst' };

  function get(id) { return BY_ID[id] || null; }
  function clearAt(r) { return r.clear === 'genesis' ? (typeof window.genesisAt === 'function' ? window.genesisAt() : 0) : r.clear; }
  function unlockRule(id) { var it = BY_ID[id]; if (!it) return null; var r = Object.assign({}, it.rule); if (r.clear != null) r.clear = clearAt(r); return r; }

  function sumStars(save) {
    var n = 0, s = (save && save.stars) || {};
    for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) n += +s[k] || 0;
    return n;
  }
  function countBadges(save) {
    var A = window.BH && window.BH.achievements;
    if (A && typeof A.count === 'function') return A.count(save);
    var n = 0, b = (save && save.badges) || {};
    for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k) && b[k]) n++;
    return n;
  }
  function actPerfect(save, act, levels) {
    levels = levels || window.LEVELS || [];
    var any = false, s = (save && save.stars) || {};
    for (var i = 0; i < levels.length; i++) {
      if (levels[i].act !== act) continue;
      any = true;
      if ((s[i + 1] || 0) < 3) return false;
    }
    return any;
  }
  function status(id, save, levels) {
    var it = BY_ID[id];
    if (!it) return { state: 'locked', price: 0, text: 'Unknown item' };
    var r = it.rule, price = r.price || 0, owned = (save && save.cos && save.cos.owned) || {};
    if (owned[id] || DEFAULTS[it.slot] === id) return { state: 'owned', price: price, text: r.text };
    var ok = true;
    if (r.stars != null && sumStars(save) < r.stars) ok = false;
    if (r.badges != null && countBadges(save) < r.badges) ok = false;
    if (r.clear != null && !(save && save.stars && save.stars[clearAt(r)] != null)) ok = false;
    if (r.act != null && !actPerfect(save, r.act, levels)) ok = false;
    if (!ok) return { state: 'locked', price: price, text: r.text };
    if (!price) return { state: 'owned', price: 0, text: r.text };
    return { state: 'buyable', price: price, text: r.text, afford: ((save && save.wallet) || 0) >= price };
  }

  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  var SRC = [hexRgb(BASE.fur), hexRgb(BASE.furDk), hexRgb(BASE.furLt)];
  var SHIMMER_PHASES = 16, SHIMMER_STEP = 0.09;
  var recolCache = new WeakMap();
  var INFO = new WeakMap();

  function recolour(orig, fur, phase) {
    var slot = recolCache.get(orig);
    if (!slot) { slot = {}; recolCache.set(orig, slot); }
    var ck = fur.id + (phase == null ? '' : '@' + phase);
    if (slot[ck]) return slot[ck];
    var w = orig.width, h = orig.height, c = mkCanvas(w, h), g = c.getContext('2d');
    g.drawImage(orig, 0, 0);
    var img = g.getImageData(0, 0, w, h), d = img.data;
    var dst = [hexRgb(fur.pal.fur), hexRgb(fur.pal.furDk), hexRgb(fur.pal.furLt)];
    var sh = fur.shimmer ? hexRgb(fur.shimmer) : null;
    for (var i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      for (var j = 0; j < 3; j++) {
        var s = SRC[j];
        if (d[i] === s[0] && d[i + 1] === s[1] && d[i + 2] === s[2]) {
          var o = dst[j];
          if (sh && phase != null) {
            var p = i >> 2, x = p % w, y = (p / w) | 0, band = (x + y - phase * 5) % 80;
            if (band < 0) band += 80;
            if (band < 2 && j !== 1) o = sh;
          }
          d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2];
          break;
        }
      }
    }
    g.putImageData(img, 0, 0);
    slot[ck] = c;
    var inf = INFO.get(orig); if (inf) INFO.set(c, inf);
    return c;
  }

  function headInfo(key, cv) {
    var w = cv.width, h = cv.height, d;
    try { d = cv.getContext('2d').getImageData(0, 0, w, h).data; } catch (e) { return null; }
    var mirror = key.indexOf('_left_') > 0, kind = key.indexOf('_up_') > 0 ? 'back' : 'side';
    function op(x, y) { var xx = mirror ? w - 1 - x : x; return d[(y * w + xx) * 4 + 3] > 0; }
    var tuft = -1, x, y;
    for (y = 0; y < h && tuft < 0; y++) for (x = 10; x <= 22; x++) if (op(x, y)) { tuft = y; break; }
    if (tuft < 0) return null;
    var Y = tuft + 1, L = -1, Rr = -1;
    for (x = 4; x <= 26; x++) if (op(x, Y)) { if (L < 0) L = x; Rr = x; }
    if (L < 0) return null;
    return { kind: kind, mirror: mirror, Y: Y, L: L, R: Rr, W: w, H: h };
  }
  var infoDone = new WeakMap();
  function ensureInfo(frames) {
    Object.keys(frames).forEach(function (k) {
      var cv = frames[k];
      if (!cv || !cv.getContext || infoDone.get(cv) === k) return;
      if (!INFO.get(cv)) { var inf = headInfo(k, cv); if (inf) INFO.set(cv, inf); }
      infoDone.set(cv, k);
    });
  }

  function furById(id) { var f = BY_ID[id]; return f && f.slot === 'fur' ? f : null; }
  function furFrames(furId, phase) {
    var S = window.BitfootSprite, out = {};
    if (!S || !S.frames) return out;
    ensureInfo(S.frames);
    var fur = furById(furId);
    Object.keys(S.frames).forEach(function (k) {
      var cv = S.frames[k];
      out[k] = (!fur || fur.pal === BASE || !cv || !cv.getContext) ? cv : recolour(cv, fur, fur.shimmer ? (phase || 0) : null);
    });
    return out;
  }

  var equipped = { fur: DEFAULTS.fur, hat: DEFAULTS.hat };
  function applyToSprite(look) {
    look = look || {};
    if (look.fur && furById(look.fur)) equipped.fur = look.fur;
    if (look.hat && BY_ID[look.hat] && BY_ID[look.hat].slot === 'hat') equipped.hat = look.hat;
    return { fur: equipped.fur, hat: equipped.hat };
  }

  var lastHit = null;
  function draw(ctx, x, y, opts, furId) {
    var S = window.BitfootSprite;
    if (!S || !S.draw) return;
    opts = opts || {};
    var fur = furById(furId || opts.fur || equipped.fur);
    var hatId = opts.hat || equipped.hat;
    var frames = S.frames;
    if (!frames) { S.draw(ctx, x, y, opts); return; }
    ensureInfo(frames);
    var swap = fur && fur.pal !== BASE, saved = null, keys = null;
    var phase = fur && fur.shimmer ? Math.floor((opts.shimmerT != null ? opts.shimmerT : now()) / SHIMMER_STEP) % SHIMMER_PHASES : null;
    var hit = null, hasOwn = Object.prototype.hasOwnProperty.call(ctx, 'drawImage'), real = ctx.drawImage;
    try {
      if (swap) {
        keys = Object.keys(frames); saved = {};
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i], cv = frames[k];
          saved[k] = cv;
          if (cv && cv.getContext) frames[k] = recolour(cv, fur, phase);
        }
      }
      ctx.drawImage = function (img) {
        if (arguments.length >= 5) {
          var inf = INFO.get(img);
          if (inf) hit = { inf: inf, dx: arguments[1], dy: arguments[2], dw: arguments[3], dh: arguments[4] };
        }
        return real.apply(this, arguments);
      };
      S.draw(ctx, x, y, opts);
    } finally {
      if (hasOwn) ctx.drawImage = real; else delete ctx.drawImage;
      if (saved) for (var j = 0; j < keys.length; j++) frames[keys[j]] = saved[keys[j]];
    }
    lastHit = hit;
    if (hit && hatId && hatId !== 'hat-none') {
      var sx = hit.dw / hit.inf.W, sy = hit.dh / hit.inf.H;
      hatAt(ctx, hit.dx, hit.dy, sx, sy, hit.inf, hatId, +opts.t || 0, opts.alpha == null ? 1 : opts.alpha);
    }
  }
  function now() { return (window.performance && performance.now ? performance.now() : Date.now()) / 1000; }

  var HAT = {
    'hat-beanie': { body: '#5B6FA8', dk: '#43548A', cuff: '#E8E0CC', cuffDk: '#C9C0A8' },
    'hat-cap': { body: '#9C8A5A', dk: '#75673F', band: '#5E5233', badge: GOLD },
    'hat-headband': { band: '#F2EDE0', stripe: GOLD, tail: '#DCD5C3' },
    'hat-crown': { body: GOLD, dk: GOLD_DK, gem: INK, gem2: '#2E6F68' },
    'hat-lantern': { body: '#3B3F46', dk: '#272A30', lamp: '#FFE3A0', rim: '#8A8F98' }
  };
  function hatAt(ctx, dx, dy, sx, sy, inf, hatId, t, alpha) {
    var pal = HAT[hatId];
    if (!pal) return;
    var W = inf.W;
    function R(fx, fy, w, h, col) {
      if (inf.mirror) fx = W - fx - w;
      var x0 = Math.round(dx + fx * sx), y0 = Math.round(dy + fy * sy);
      var x1 = Math.round(dx + (fx + w) * sx), y1 = Math.round(dy + (fy + h) * sy);
      ctx.fillStyle = col; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    var L = inf.L, Y = inf.Y, w = inf.R - inf.L + 1, side = inf.kind === 'side';
    var back = side ? L - 2 : L;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (hatId === 'hat-beanie') {
      R(L + 1, Y - 5, w - 2, 1, pal.body);
      R(L, Y - 4, w, 3, pal.body);
      R(L + 2, Y - 4, 1, 3, pal.dk); R(L + 5, Y - 4, 1, 3, pal.dk); R(L + 8, Y - 4, 1, 3, pal.dk); if (w > 12) R(L + 11, Y - 4, 1, 3, pal.dk);
      R(back - (side ? 0 : 1), Y - 1, (side ? w + 3 : w + 2), 3, pal.cuff);
      R(back - (side ? 0 : 1), Y + 1, (side ? w + 3 : w + 2), 1, pal.cuffDk);
      var pw = side ? 3 : 4, px = L + Math.floor((w - pw) / 2) - (side ? 1 : 0);
      R(px, Y - 7, pw, 2, pal.cuff); R(px + 1, Y - 8, pw - 2, 1, pal.cuff);
    } else if (hatId === 'hat-cap') {
      R(L + 1, Y - 4, w - 2, 1, pal.body);
      R(L, Y - 3, w, 3, pal.body);
      R(L, Y - 3, 2, 3, pal.dk);
      R(back, Y, side ? w + 2 : w, 1, pal.band);
      if (side) {
        R(L + w - 2, Y, 9, 1, pal.dk);
        R(L + w - 1, Y + 1, 7, 1, pal.body);
        R(L + w - 5, Y - 2, 2, 2, pal.badge);
      } else {
        R(L + Math.floor(w / 2) - 2, Y - 1, 4, 1, pal.dk);
        R(L + Math.floor(w / 2) - 1, Y - 1, 2, 1, pal.band);
      }
    } else if (hatId === 'hat-headband') {
      R(back - (side ? 0 : 1), Y + 1, (side ? w + 3 : w + 2), 2, pal.band);
      R(back - (side ? 0 : 1), Y + 1, (side ? w + 3 : w + 2), 1, pal.stripe);
      var wave = Math.floor(t * 6) % 2;
      if (side) {
        R(back - 3, Y + 1 + wave, 3, 1, pal.tail);
        R(back - 5, Y + 2 + wave, 3, 1, pal.tail);
        R(back - 2, Y + 3 - wave, 2, 1, pal.band);
        R(back - 4, Y + 4 - wave, 2, 1, pal.band);
      } else {
        var kx = L + Math.floor(w / 2) - 1;
        R(kx, Y + 1, 2, 2, pal.tail);
        R(kx - 1, Y + 3, 1, 3 + wave, pal.band); R(kx + 2, Y + 3, 1, 4 - wave, pal.band);
      }
    } else if (hatId === 'hat-crown') {
      R(L + 1, Y - 3, w - 2, 3, pal.body);
      R(L + 1, Y - 1, w - 2, 1, pal.dk);
      var n = 3, step = (w - 4) / (n - 1);
      for (var i = 0; i < n; i++) {
        var cx = L + 1 + Math.round(i * step);
        R(cx, Y - 5, 2, 2, pal.body); R(cx, Y - 6, 1, 1, pal.body);
      }
      R(L + Math.floor(w / 2) - 1, Y - 2, 2, 1, pal.gem2);
      if (Math.floor(t * 3) % 3 === 0) R(L + 2, Y - 3, 1, 1, pal.gem);
      else R(L + w - 4, Y - 3, 1, 1, pal.gem);
    } else if (hatId === 'hat-lantern') {
      R(L + 2, Y - 4, w - 4, 1, pal.body);
      R(L, Y - 3, w, 3, pal.body);
      R(L, Y - 3, 2, 3, pal.dk);
      R(back - 1, Y, (side ? w + 4 : w + 2), 1, pal.rim);
      if (side) {
        var lx = L + w - 3;
        R(lx, Y - 4, 4, 4, pal.dk);
        R(lx + 1, Y - 3, 3, 2, pal.lamp);
        var fl = 0.55 + 0.25 * Math.sin(t * 9) + 0.1 * Math.sin(t * 23);
        var gx = dx + (inf.mirror ? W - (lx + 4) : lx + 4) * sx, gy = dy + (Y - 2) * sy;
        var r = 6 * sx;
        var grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        grd.addColorStop(0, 'rgba(255,227,160,' + (0.5 * fl).toFixed(3) + ')');
        grd.addColorStop(1, 'rgba(255,227,160,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 6.283); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        R(L + Math.floor(w / 2) - 1, Y - 3, 2, 3, pal.dk);
      }
    }
    ctx.restore();
  }
  function drawHat(ctx, x, y, dir, hatId, scale) {
    var S = window.BitfootSprite;
    if (!S || !S.frames || !hatId || hatId === 'hat-none') return;
    dir = { down: 1, up: 1, left: 1, right: 1 }[dir] ? dir : 'down';
    ensureInfo(S.frames);
    var cv = S.frames['idle_' + dir + '_0'], inf = cv && INFO.get(cv);
    if (!inf) return;
    var s = scale == null ? 3 : scale;
    var dw = Math.round(inf.W * s), dh = Math.round(inf.H * s);
    hatAt(ctx, Math.round(x - (inf.W * s) / 2), Math.round(y - inf.H * s), dw / inf.W, dh / inf.H, inf, hatId, now(), 1);
  }

  var PRINT_COL = { 'print-paw': GOLD, 'print-shoe': GOLD, 'print-leaf': '#E3C35A', 'print-snow': '#F6E7B8', 'print-rune': '#FFD978', 'print-zec': GOLD };
  function drawPrint(ctx, x, y, angle, styleId, age, opts) {
    opts = opts || {};
    age = age == null ? 1 : age;
    var hq = opts.heat || 0, red = opts.red || hq > 0.35;
    var sc = (age < 0.15 ? 1.6 - age * 4 : 1) * (opts.big ? 1.5 : 1) * (1 + 0.5 * hq) * (opts.scale || 1);
    var col = red ? RED : (PRINT_COL[styleId] || GOLD);
    ctx.save();
    ctx.translate(x, y); ctx.rotate((angle || 0) + 1.5708); ctx.scale(sc, sc);
    ctx.fillStyle = col;
    switch (styleId) {
      case 'print-shoe':
        ctx.fillRect(-2, -4.25, 4, 1); ctx.fillRect(-2.5, -3.25, 5, 3);
        ctx.fillRect(-2, 1, 4, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(-2.5, -2.4, 5, 0.6); ctx.fillRect(-2.5, -1.2, 5, 0.6); ctx.fillRect(-2, 1.8, 4, 0.5);
        break;
      case 'print-leaf':
        ctx.fillRect(-0.75, -4.25, 1.5, 1); ctx.fillRect(-1.75, -3.25, 3.5, 1.5);
        ctx.fillRect(-2.5, -1.75, 5, 2.5); ctx.fillRect(-1.75, 0.75, 3.5, 1);
        ctx.fillRect(-0.5, 1.75, 1, 1.25);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-0.25, -3.25, 0.5, 4);
        break;
      case 'print-snow':
        ctx.fillRect(-0.6, -3.6, 1.2, 7.2);
        ctx.save(); ctx.rotate(1.0472); ctx.fillRect(-0.5, -2.7, 1, 5.4); ctx.rotate(1.0472); ctx.fillRect(-0.5, -2.7, 1, 5.4); ctx.restore();
        ctx.fillRect(-1.4, -3.4, 2.8, 0.8); ctx.fillRect(-1.4, 2.6, 2.8, 0.8);
        break;
      case 'print-rune': {
        var pulse = 0.55 + 0.45 * Math.sin(age * 3.2);
        if (!red) {
          var gl = (0.1 + 0.18 * pulse) * Math.max(0.35, 1 - age / 20);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(255,217,120,' + gl.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(0, -0.6, 4.2, 0, 6.283); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = col;
        }
        ctx.fillRect(-0.7, -4.25, 1.4, 7.25);
        ctx.fillRect(-2.5, -4.25, 1.3, 2); ctx.fillRect(1.2, -4.25, 1.3, 2);
        ctx.fillRect(-1.6, -2.6, 1.2, 1); ctx.fillRect(0.4, -2.6, 1.2, 1);
        ctx.fillRect(-2.5, 0.8, 1.3, 2.2); ctx.fillRect(1.2, 0.8, 1.3, 2.2);
        ctx.fillRect(-1.6, 0.2, 1.2, 1); ctx.fillRect(0.4, 0.2, 1.2, 1);
        break;
      }
      case 'print-zec': {
        ctx.beginPath(); ctx.arc(0, -0.6, 2.9, 0, 6.283); ctx.fill();
        ctx.fillRect(-0.9, 2.3, 1.8, 0.9);
        ctx.fillStyle = red ? '#5a1810' : '#5b3f0c';
        ctx.save(); ctx.translate(0, -0.6); ctx.rotate(-((angle || 0) + 1.5708));
        ctx.fillRect(-1.5, -1.8, 3, 0.8); ctx.fillRect(-1.5, 1.0, 3, 0.8);
        ctx.rotate(-0.83); ctx.fillRect(-1.9, -0.35, 3.8, 0.7);
        ctx.restore();
        break;
      }
      default:
        ctx.fillRect(-1.5, -1, 3, 4); ctx.fillRect(-2.5, -3.5, 1.5, 1.5); ctx.fillRect(-0.75, -4.25, 1.5, 1.5); ctx.fillRect(1, -3.5, 1.5, 1.5);
    }
    ctx.restore();
  }

  var CELE_DURATION = 2.2;
  function rnd(i, k) { var s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); }
  function px(ctx, x, y, s, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); }
  function celebrate(ctx, x, y, t, id, opts) {
    opts = opts || {};
    var u = opts.unit || 3;
    if (t < 0 || t > CELE_DURATION) return false;
    var fade = t > CELE_DURATION - 0.5 ? (CELE_DURATION - t) / 0.5 : 1, i, a, r, p;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    if (id === 'cele-rain') {
      for (i = 0; i < 26; i++) {
        var delay = rnd(i, 1) * 0.9, lt = t - delay;
        if (lt < 0) continue;
        var cx = x + (rnd(i, 2) - 0.5) * 60 * u, top = y - 70 * u + rnd(i, 3) * 20 * u;
        var fall = Math.min(1, lt / 0.7), cy = top + (y - top + (rnd(i, 4) - 0.5) * 10 * u) * fall * fall;
        if (fall >= 1) cy -= Math.abs(Math.sin((lt - 0.7) * 9)) * 6 * u * Math.max(0, 1 - (lt - 0.7) * 2);
        var spin = Math.abs(Math.cos(lt * 8 + i)), cw = Math.max(1, Math.round(3 * u * spin));
        ctx.fillStyle = GOLD_DK; ctx.fillRect(Math.round(cx - cw / 2), Math.round(cy - 1.5 * u), cw, 3 * u);
        ctx.fillStyle = GOLD; ctx.fillRect(Math.round(cx - cw / 2), Math.round(cy - 1.5 * u), Math.max(1, cw - u), 2 * u);
      }
    } else if (id === 'cele-fireflies') {
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < 22; i++) {
        var ang = rnd(i, 1) * 6.283, rad = (10 + rnd(i, 2) * 40) * u * Math.min(1, t / 0.8);
        var fx = x + Math.cos(ang + t * (0.6 + rnd(i, 3))) * rad, fy = y - 12 * u - Math.sin(ang + t * 0.9) * rad * 0.5 - t * 8 * u * rnd(i, 4);
        var blink = 0.5 + 0.5 * Math.sin(t * (4 + rnd(i, 5) * 5) + i);
        ctx.fillStyle = 'rgba(214,255,140,' + (0.25 * blink).toFixed(3) + ')'; ctx.fillRect(Math.round(fx - 2 * u), Math.round(fy - 2 * u), 4 * u, 4 * u);
        px(ctx, fx, fy, u * 2, 'rgba(240,255,190,' + (0.6 + 0.4 * blink).toFixed(3) + ')');
      }
    } else if (id === 'cele-ripple') {
      for (i = 0; i < 4; i++) {
        var lt2 = t - i * 0.3; if (lt2 < 0) continue;
        r = lt2 * 38 * u; a = Math.max(0, 1 - lt2 / 1.4);
        var n = Math.max(12, Math.round(r / u));
        for (p = 0; p < n; p++) {
          var th = p / n * 6.283;
          px(ctx, x + Math.cos(th) * r, y + Math.sin(th) * r * 0.45, u, 'rgba(191,233,255,' + a.toFixed(3) + ')');
        }
      }
      for (i = 0; i < 10; i++) {
        var dl = t - 0.1 - rnd(i, 7) * 0.4; if (dl < 0 || dl > 0.9) continue;
        var dth = rnd(i, 8) * 6.283, dv = (18 + rnd(i, 9) * 14) * u;
        px(ctx, x + Math.cos(dth) * dv * dl, y - (dv * 1.4 * dl - 60 * u * dl * dl), u, ICE);
      }
    } else {
      var count = 18 + 6 * (opts.stars || 3);
      for (i = 0; i < count; i++) {
        var bth = rnd(i, 1) * 6.283, sp = (26 + rnd(i, 2) * 34) * u;
        var bx = x + Math.cos(bth) * sp * t, by = y - 12 * u + Math.sin(bth) * sp * t * 0.8 + 40 * u * t * t;
        var tw = Math.floor(t * 12 + i) % 4 === 0;
        px(ctx, bx, by, tw ? u * 2 : u, tw ? INK : (i % 3 ? GOLD : GOLD_DK));
      }
      if (t < 0.35) {
        var fr = t / 0.35 * 20 * u;
        ctx.globalAlpha = (1 - t / 0.35) * fade;
        ctx.strokeStyle = GOLD; ctx.lineWidth = u; ctx.beginPath(); ctx.arc(x, y - 12 * u, fr, 0, 6.283); ctx.stroke();
      }
    }
    ctx.restore();
    return true;
  }

  var CLIMBHEAD = new WeakMap();
  function climbHead(cell) {
    if (CLIMBHEAD.has(cell)) return CLIMBHEAD.get(cell);
    var w = cell.width, h = cell.height, d, inf = null, cx = w >> 1, x, y, top = -1;
    try { d = cell.getContext('2d').getImageData(0, 0, w, h).data; } catch (e) { return null; }
    var op = function (x, y) { return d[(y * w + x) * 4 + 3] > 0; };
    for (y = 0; y < h && top < 0; y++) for (x = cx - 6; x <= cx + 5; x++) if (op(x, y)) { top = y; break; }
    if (top >= 0) {
      var Y = top + 1, L = cx, R = cx;
      while (L > 0 && op(L - 1, Y)) L--;
      while (R < w - 1 && op(R + 1, Y)) R++;
      inf = { kind: 'back', mirror: false, Y: Y, L: L, R: R, W: w, H: h };
    }
    CLIMBHEAD.set(cell, inf);
    return inf;
  }
  function climbLook(ctx, cell, dx, dy, s, furId, hatId, t, alpha) {
    var fur = furById(furId), cv = cell;
    if (fur && fur.pal !== BASE) cv = recolour(cell, fur, fur.shimmer ? Math.floor(now() / SHIMMER_STEP) % SHIMMER_PHASES : null);
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(cv, dx, dy, cell.width * s, cell.height * s); ctx.restore();
    if (!hatId || hatId === 'hat-none' || !HAT[hatId]) return;
    var inf = climbHead(cell);
    if (inf) hatAt(ctx, dx, dy, s, s, inf, hatId, t || 0, alpha);
  }

  BH.cosmetics = {
    climbLook: climbLook,
    list: ITEMS,
    SLOTS: SLOTS,
    DEFAULTS: DEFAULTS,
    CELE_DURATION: CELE_DURATION,
    get: get,
    unlockRule: unlockRule,
    status: status,
    applyToSprite: applyToSprite,
    draw: draw,
    furFrames: furFrames,
    drawHat: drawHat,
    drawPrint: drawPrint,
    celebrate: celebrate,
    _lastHit: function () { return lastHit; }
  };
})();
