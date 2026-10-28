(function () {
  "use strict";
  if (!window.BH) window.BH = {};
  var W = 320, H = 180;
  var C = { wood: "#3a2514", plank: "#86592f", edge: "#1f130a", gold: "#eaba49", hi: "#ffe08a", cream: "#fff3c4", bark: "#c9a27a",
    red: "#d9573f", green: "#5fbf4a", dark: "#2a1a0d", sky: "#24331f", grass: "#2f5a26", stone: "#4a3b2c", stone2: "#5e4b37" };

  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, max = mp(2, 32), result = "", words = [], bitLen = ascii.length * 8, hash = [], k = [], pc = 0, isC = {}, i, j;
    for (var cand = 2; pc < 64; cand++) { if (!isC[cand]) { for (i = 0; i < 313; i += cand) isC[i] = cand; hash[pc] = (mp(cand, 0.5) * max) | 0; k[pc++] = (mp(cand, 1 / 3) * max) | 0; } }
    ascii += "\x80";
    while (ascii.length % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii.length; i++) { j = ascii.charCodeAt(i); if (j >> 8) return ""; words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = ((bitLen / max) | 0); words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash; hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : "") + b.toString(16); }
    return result;
  }

  function sound(n) { try { if (typeof sfx === "function") sfx(n); } catch (e) {} }
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { t = clamp(t); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sprite(g, rows, pal, x, y, s, flip) {
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) {
      var ch = rows[r].charAt(flip ? rows[r].length - 1 - c : c), col = pal[ch];
      if (col) R(g, x + c * s, y + r * s, s, s, col);
    }
  }
  function arrowDown(g, x, y, t, col) {
    var b = Math.round(Math.sin(t * 6) * 2);
    sprite(g, ["#####", ".###.", "..#.."], { "#": col || C.hi }, x - 5, y + b, 2);
  }
  function arrowSide(g, x, y, dir, s, col) {
    var rows = dir < 0 ? ["...#..", "..##..", ".#####", "######", ".#####", "..##..", "...#.."] : ["..#...", "..##..", "#####.", "######", "#####.", "..##..", "..#..."];
    sprite(g, rows, { "#": col || C.hi }, x - 3 * s, y - 3.5 * s, s);
  }
  function walkPath(pts) {
    var segs = [], len = 0;
    for (var i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); len += d; }
    return { pts: pts, segs: segs, len: len, at: function (dist) {
      var d = Math.max(0, Math.min(len, dist));
      for (var i = 0; i < segs.length; i++) {
        if (d <= segs[i] || i === segs.length - 1) { var f = segs[i] ? Math.min(1, d / segs[i]) : 1; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f), pts[i + 1][0] - pts[i][0]]; }
        d -= segs[i];
      }
      return pts[pts.length - 1];
    } };
  }

  var BF = ["..oooooo..", ".oOOOOOOo.", "oOOOOOOOOo", "oOwwOOwwOo", "oOwkOOwkOo", "oOOOOOOOOo", "oOOOOOOOOo", ".oOOOOOOo.", "..oOOOOo..", ".FFF..FFF.", "FFFF..FFFF"];
  var BF_PAL = { o: "#2c1a0c", O: "#8a5a2e", w: "#fff3c4", k: "#1f130a", F: "#5a3418" };
  var FAKE_PAL = { o: "#2a2a2a", O: "#7c7c74", w: "#e8e8e0", k: "#1f1f1f", F: "#55554e" };
  function bitfoot(g, x, y, s, pal, flip, t) {
    var b = t ? Math.round(Math.abs(Math.sin(t * 10))) : 0;
    sprite(g, BF, pal || BF_PAL, x - 5 * s, y - 11 * s - b, s, flip);
  }
  var PERSON = ["..HHHH..", ".HHHHHH.", "HHHHHHHH", "..ssss..", "..sesE..", "..ssss..", "..BBBB..", ".CCCCCC.", "CCCCCCCC", "C.CCCC.C", "..CCCC..", "..L..L..", "..L..L.."];
  var PERSON_BACK = ["..HHHH..", ".HHHHHH.", "HHHHHHHH", "..hhhh..", "..hhhh..", "..hhhh..", "..hhhh..", ".CCCCCC.", "CCCCCCCC", "C.CCCC.C", "..CCCC..", "..L..L..", "..L..L.."];
  function person(g, x, y, s, pal, back, flip) { sprite(g, back ? PERSON_BACK : PERSON, pal, x - 4 * s, y - 13 * s, s, flip); }
  var HUNTER_PAL = { H: "#3b2a1a", s: "#d6a77a", e: "#1f130a", E: "#1f130a", B: "#3b2a1a", C: "#6b4a2a", L: "#2a1a0d", h: "#3b2a1a" };
  var ELDER_PAL = { H: "#e8e0d0", s: "#d6a77a", e: "#1f130a", E: "#1f130a", B: "#f2ede0", C: "#3f6a3a", L: "#2a1a0d", h: "#e8e0d0" };
  var WATCH_PAL = { H: "#7a2e2a", s: "#d6a77a", e: "#1f130a", E: "#1f130a", B: "#d6a77a", C: "#2f4f7a", L: "#2a1a0d", h: "#5a2220" };
  var CROSS = ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"];

  var GLYPHS = {
    sun: [".#.#.", "..#..", "#####", "..#..", ".#.#."],
    leaf: ["...##", "..###", ".###.", "###..", "#...."],
    fish: [".....", ".##.#", "#####", ".##.#", "....."],
    moon: [".###.", "##...", "#....", "##...", ".###."],
    drop: ["..#..", ".###.", "#####", "#####", ".###."],
    heart: [".#.#.", "#####", "#####", ".###.", "..#.."]
  };
  var GNAMES = ["sun", "leaf", "fish", "moon", "drop", "heart"];
  var GCOL = ["#eaba49", "#5fbf4a", "#4fa3d9", "#e8e0d0", "#6fc6e0", "#d9573f"];
  var RUNE = ["#.#.#", ".###.", "##.##", ".###.", "#.#.#"];
  var NOKEY = ["###", "..#", ".#.", "...", ".#."];

  var cur = null, frames = 0;
  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  function open(name, done) {
    if (cur) close(null);
    var def = PUZZLES[name];
    if (!def) { if (typeof done === "function") setTimeout(function () { done(null); }, 0); return false; }
    var root = el("div", "tpz", document.body);
    root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Puzzle");
    var card = el("div", "tpz-card", root); card.tabIndex = -1;
    var xBtn = el("button", "tpz-x", card); xBtn.type = "button"; xBtn.textContent = "CLOSE";
    var cv = el("canvas", "tpz-cv", card); cv.width = W; cv.height = H;
    var line = el("div", "tpz-line", card);
    var btns = el("div", "tpz-btns", card);
    var g = cv.getContext("2d");
    var s = { name: name, done: done, root: root, cv: cv, g: g, scale: 1, t: 0, last: 0, raf: 0, solved: false, result: null, froze: false, listeners: [] };
    cur = s;
    if (window.game && game.phase === "play") { game.phase = "talk"; s.froze = true; }
    try { if (typeof keys !== "undefined") keys = {}; if (typeof joy !== "undefined") joy.active = false; } catch (e) {}

    function on(target, type, fn, opt) { target.addEventListener(type, fn, opt); s.listeners.push([target, type, fn, opt]); }
    on(window, "keydown", function (e) {
      if (root.contains(e.target)) return;
      e.stopImmediatePropagation();
      if (/^(Arrow|Escape| )/.test(e.key)) e.preventDefault();
      if (e.key === "Escape") nudge();
      if (e.key === "Tab") { e.preventDefault(); tabTo(e.shiftKey ? -1 : 1); }
    }, true);
    on(root, "keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); nudge(); }
      if (e.key === "Tab") { e.preventDefault(); tabTo(e.shiftKey ? -1 : 1); }
    });
    function tabTo(d) {
      var list = Array.prototype.filter.call(card.querySelectorAll("button, [href], input, [tabindex]:not([tabindex='-1'])"), function (b) { return !b.disabled && b.offsetParent !== null; });
      if (!list.length) { try { card.focus({ preventScroll: true }); } catch (er) {} return; }
      var i = list.indexOf(document.activeElement);
      var j = i < 0 ? (d > 0 ? 0 : list.length - 1) : (i + d + list.length) % list.length;
      try { list[j].focus({ preventScroll: true }); } catch (er) {}
    }
    on(root, "pointerdown", function (e) { e.stopPropagation(); if (typeof audioInit === "function") try { audioInit(); } catch (er) {} });
    on(root, "click", function (e) { e.stopPropagation(); });
    on(cv, "pointerdown", function (e) {
      e.preventDefault();
      var p = toLogical(e);
      if (s.api && s.api.down) s.api.down(p[0], p[1]);
    });
    on(cv, "pointermove", function (e) {
      var p = toLogical(e);
      cv.style.cursor = s.api && s.api.hot && s.api.hot(p[0], p[1]) ? "pointer" : "default";
    });
    on(window, "resize", fit);
    on(xBtn, "click", function () { sound("click"); close(null); });
    function toLogical(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
    function nudge() { xBtn.classList.remove("nudge"); void xBtn.offsetWidth; xBtn.classList.add("nudge"); }
    function fit() {
      var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      var k = Math.max(1, Math.ceil(r.width * dpr / W));
      if (k !== s.scale || cv.width !== W * k) { s.scale = k; cv.width = W * k; cv.height = H * k; }
    }
    s.ui = {
      buttons: function (list) {
        btns.textContent = "";
        (list || []).forEach(function (b) {
          var x = el("button", "tpz-btn" + (b.cls ? " " + b.cls : ""), btns); x.type = "button"; x.textContent = b.label;
          x.addEventListener("click", function () { sound("click"); b.fn(); });
        });
      },
      say: function (text) { if (s.solved) return; line.textContent = text || ""; line.classList.toggle("on", !!text); },
      solve: function (text, result, again) {
        if (s.solved) return;
        s.solved = true; s.result = result;
        line.textContent = text; line.classList.add("on");
        sound("solved");
        var list = [{ label: "GOT IT", cls: "go", fn: function () { close(s.result); } }];
        if (again) list.push({ label: "TRY ANOTHER", fn: function () { s.solved = false; line.classList.remove("on"); line.textContent = ""; s.ui.buttons([]); again(); } });
        s.ui.buttons(list);
        var first = btns.querySelector("button"); if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
      }
    };
    s.api = def(s.ui);
    fit();
    try { card.focus({ preventScroll: true }); } catch (e) {}
    s.last = performance.now();
    s.raf = requestAnimationFrame(tick);
    return true;
  }
  function tick(now) {
    var s = cur;
    if (!s) return;
    var dt = Math.min(0.05, Math.max(0, (now - s.last) / 1000)); s.last = now; s.t += dt;
    frames++;
    if (s.api.update) s.api.update(dt, s.t);
    if (cur !== s) return;
    var g = s.g;
    g.setTransform(s.scale, 0, 0, s.scale, 0, 0); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    s.api.draw(g, s.t);
    s.raf = requestAnimationFrame(tick);
  }
  function close(result) {
    var s = cur;
    if (!s) return;
    cur = null;
    cancelAnimationFrame(s.raf);
    s.listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
    if (s.root.parentNode) s.root.parentNode.removeChild(s.root);
    if (s.froze && window.game && game.phase === "talk") game.phase = "play";
    try { if (typeof keys !== "undefined") keys = {}; } catch (e) {}
    if (typeof s.done === "function") s.done(result == null ? null : result);
  }

  var PUZZLES = {};

  PUZZLES.stamp = function (ui) {
    var orig = [[0, 1, 2], [3, 4, 5], [2, 5, 1], [4, 0, 3]];
    var forged = [3, 1, 0];
    var syms = orig.map(function (a) { return a.slice(); });
    var carried = ["start"], live = [], pressAt = [-9, -9, -9, -9];
    function stampOf(i) { return sha256("page" + i + ":" + syms[i].map(function (n) { return GNAMES[n]; }).join(",") + "|" + carried[i]); }
    for (var i = 0; i < 4; i++) { live[i] = stampOf(i); if (i < 3) carried[i + 1] = live[i]; }
    var INKS = ["#b8322a", "#2f5fa8", "#2f8a4a", "#7a3fa0", "#c0701e", "#1d7f86"];
    var st = { stage: "D", t: 0, changed: null, hunterX: 340, lift: 0, scan: -1, reveal: [true, true, true], edits: 0, now: 0 };
    var PY = 22, PW = 62, PH = 120;
    function px(i) { return 12 + i * 76; }
    function symPos(i, k) { return [px(i) + 6 + k * 19, PY + 26]; }
    function brokenAt() { for (var i = 0; i < 3; i++) if (live[i] !== carried[i + 1]) return i; return -1; }
    function drawStamp(g, h, x, y, s) {
      var bits = parseInt(h.slice(0, 4), 16), ink = INKS[parseInt(h.charAt(4), 16) % INKS.length];
      for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) {
        var cc = c < 3 ? c : 4 - c;
        if ((bits >> (r * 3 + cc)) & 1) R(g, x + c * s, y + r * s, s, s, ink);
      }
    }
    function setSym(i, k, v) { syms[i][k] = v; live[i] = stampOf(i); pressAt[i] = st.now; }
    function symAt(x, y) {
      for (var i = 0; i < 4; i++) for (var k = 0; k < 3; k++) { var p = symPos(i, k); if (x >= p[0] - 4 && x < p[0] + 14 && y >= p[1] - 4 && y < p[1] + 14) return [i, k]; }
      return null;
    }
    var HAND = [".oOOo..", ".oOOo..", ".oOOo..", ".oOOooo", "ooOOOOo", "oOOOOOo", "oOOOOOo", "oFOFOFo", ".ooooo."];
    var D_PRESS = [0.85, 2.45], D_END = 3.3, YOUR_TURN = "TAP A SYMBOL. WATCH THE PAGES AFTER IT.";
    function handTip(t) {
      var hov = PY + 24, dn = PY + 32, up = -2;
      if (t < 0.7) return lerp(up, hov, ease(t / 0.7));
      for (var j = 0; j < 2; j++) { var pt = t - D_PRESS[j]; if (pt > -0.15 && pt < 0.15) return pt < 0 ? lerp(hov, dn, ease((pt + 0.15) / 0.15)) : lerp(dn, hov, ease(pt / 0.15)); }
      if (t < D_END - 0.7) return hov;
      return lerp(hov, up, ease((t - (D_END - 0.7)) / 0.7));
    }
    function demo() {
      if (st.t >= D_PRESS[0] && !st.d1) { st.d1 = true; setSym(0, 1, (orig[0][1] + 1) % GNAMES.length); st.changed = [0, 1]; sound("caught"); }
      if (st.t >= D_PRESS[1] && !st.d2) { st.d2 = true; setSym(0, 1, orig[0][1]); st.changed = null; sound("linked"); }
      if (st.t >= D_END) { st.stage = "A0"; st.t = 0; ui.say(YOUR_TURN); }
    }
    function check() {
      if (st.stage !== "B2") return;
      st.stage = "B3"; st.t = 0; ui.buttons([]); sound("tower");
    }
    return {
      info: function () { return { stage: st.stage, broken: brokenAt(), edits: st.edits, changed: st.changed ? st.changed.slice() : null }; },
      hot: function (x, y) { return (st.stage === "A0" || st.stage === "A1") && symAt(x, y) !== null; },
      down: function (x, y) {
        if (st.stage !== "A0" && st.stage !== "A1") return;
        var hit = symAt(x, y);
        if (!hit) return;
        var i = hit[0], k = hit[1];
        if (!st.touched) { st.touched = true; ui.say(""); }
        if (syms[i][k] === orig[i][k]) {
          if (st.changed) setSym(st.changed[0], st.changed[1], orig[st.changed[0]][st.changed[1]]);
          setSym(i, k, (orig[i][k] + 1) % GNAMES.length); st.changed = [i, k]; st.edits++;
          st.stage = "A1"; sound("caught");
        } else {
          setSym(i, k, orig[i][k]); st.changed = null;
          if (brokenAt() < 0) { st.stage = "A2"; st.t = 0; sound("linked"); }
        }
      },
      update: function (dt) {
        st.t += dt; st.now += dt;
        if (st.stage === "D") demo();
        if (st.stage === "A2" && st.t > 1.2) { st.stage = "B0"; st.t = 0; st.reveal = [false, false, false]; sound("suspicion"); }
        if (st.stage === "B0") { st.hunterX = lerp(340, px(1) + 31, ease(st.t / 1.6)); if (st.t > 1.6) { st.stage = "B1"; st.t = 0; } }
        if (st.stage === "B1") {
          st.lift = Math.sin(clamp(st.t / 1.2) * Math.PI) * 10;
          if (st.t > 0.6 && !st.forged) { st.forged = true; syms[1] = forged.slice(); live[1] = stampOf(1); }
          if (st.t > 1.2) { st.stage = "B2"; st.t = 0; st.lift = 0; ui.buttons([{ label: "CHECK", cls: "go", fn: check }]); }
        }
        if (st.stage === "B2") st.hunterX = lerp(px(1) + 31, 292, ease(st.t / 1.2));
        if (st.stage === "B3") {
          st.scan = st.t / 1.6 * W;
          for (var i = 0; i < 3; i++) if (!st.reveal[i] && st.scan > px(i) + PW + 7) { st.reveal[i] = true; sound(live[i] === carried[i + 1] ? "coin" : "caught"); }
          if (st.t > 1.7) { st.stage = "B4"; st.t = 0; st.scan = -1; }
        }
        if (st.stage === "B4") {
          st.hunterX = lerp(292, 360, ease((st.t - 0.4) / 1.0));
          if (st.t > 1.2) ui.solve("CHANGE ONE THING, THE STAMP CHANGES. CHANGE AN OLD PAGE, EVERY PAGE AFTER BREAKS.", { ok: true });
        }
      },
      draw: function (g, t) {
        R(g, 0, 0, W, H, C.dark);
        R(g, 0, 150, W, 30, "#24170b");
        var br = brokenAt(), inB = st.stage.charAt(0) === "B";
        for (var i = 0; i < 4; i++) {
          var x = px(i), y = PY - (i === 1 ? st.lift : 0);
          R(g, x - 2, y - 2, PW + 4, PH + 4, C.edge);
          R(g, x, y, PW, PH, "#efe3c2");
          R(g, x, y + PH - 4, PW, 4, "#d6c59b");
          R(g, x + 3, y + 3, 14, 14, "#d6c59b");
          if (i === 0) sprite(g, CROSS, { "#": "#b5a27a" }, x + 5, y + 5, 2);
          else drawStamp(g, carried[i], x + 5, y + 5, 2);
          for (var k = 0; k < 3; k++) { var sp = symPos(i, k); R(g, sp[0] - 2, y + 24, 14, 14, "#2a1a0d"); sprite(g, GLYPHS[GNAMES[syms[i][k]]], { "#": GCOL[syms[i][k]] }, sp[0], y + 26, 2); }
          var pt = st.now - pressAt[i];
          R(g, x + 12, y + 56, 38, 38, "#e4d4ac");
          R(g, x + 12, y + 56, 38, 2, "#c9b688"); R(g, x + 12, y + 92, 38, 2, "#c9b688");
          if (pt > 0.12) drawStamp(g, live[i], x + 16, y + 60, 6);
          if (pt < 0.3) {
            var drop = pt < 0.12 ? ease(pt / 0.12) : 1 - ease((pt - 0.12) / 0.18);
            R(g, x + 10, y - 30 + drop * 84, 42, 8, C.plank); R(g, x + 28, y - 60 + drop * 84, 6, 30, C.edge);
          }
          var after = !inB ? (br >= 0 && i > br) : (st.stage === "B4" && i >= 1);
          if (after) { g.fillStyle = "rgba(217,87,63," + (0.26 + 0.12 * Math.sin(t * 10)).toFixed(2) + ")"; g.fillRect(x, y, PW, PH); R(g, x - 2, y - 2, PW + 4, 2, C.red); R(g, x - 2, y + PH, PW + 4, 2, C.red); R(g, x - 2, y, 2, PH, C.red); R(g, x + PW, y, 2, PH, C.red); }
          if (!inB && st.changed && st.changed[0] === i) { R(g, x + 10, y + 54, 42, 2, C.hi); R(g, x + 10, y + 94, 42, 2, C.hi); }
          if (i < 3) {
            var lx = x + PW + 2, ly = PY + 40, ok = live[i] === carried[i + 1], shown = !inB || st.reveal[i];
            var col = !shown ? "#6b5a48" : ok ? C.green : C.red;
            if (shown && !ok) {
              R(g, lx, ly, 4, 3, col); R(g, lx, ly + 6, 4, 3, col); R(g, lx, ly, 2, 9, col);
              R(g, lx + 8, ly + 3, 4, 3, col); R(g, lx + 8, ly + 9, 4, 3, col); R(g, lx + 10, ly + 3, 2, 9, col);
              if (Math.sin(t * 14) > 0) R(g, lx + 5, ly + 4, 2, 3, C.hi);
            } else {
              R(g, lx, ly, 7, 3, col); R(g, lx, ly + 6, 7, 3, col); R(g, lx, ly, 2, 9, col);
              R(g, lx + 5, ly + 3, 7, 3, col); R(g, lx + 5, ly + 9, 7, 3, col); R(g, lx + 10, ly + 3, 2, 9, col);
            }
          }
        }
        if (st.stage === "B3" && st.scan >= 0) { g.fillStyle = "rgba(255,224,138,0.35)"; g.fillRect(st.scan - 4, 0, 8, 150); }
        if (inB) {
          var hx = st.hunterX, flip = st.stage === "B2" || st.stage === "B4";
          person(g, hx, 178, 2, HUNTER_PAL, false, flip);
          if (st.stage === "B1") R(g, hx - 8, 140 - st.lift, 16, 12, "#efe3c2");
          if (st.stage === "B4") sprite(g, ["#", "#", "#", ".", "#"], { "#": C.red }, hx - 1, 134, 2);
        }
        if (st.stage === "A0") {
          var sp0 = symPos(0, 1), pu = 0.5 + 0.5 * Math.sin(t * 5), gw = 3 + Math.round(pu * 2);
          g.fillStyle = "rgba(255,224,138," + (0.35 + 0.5 * pu).toFixed(2) + ")";
          g.fillRect(sp0[0] - 2 - gw, sp0[1] - 2 - gw, 14 + gw * 2, gw); g.fillRect(sp0[0] - 2 - gw, sp0[1] + 12, 14 + gw * 2, gw);
          g.fillRect(sp0[0] - 2 - gw, sp0[1] - 2, gw, 14); g.fillRect(sp0[0] + 12, sp0[1] - 2, gw, 14);
          arrowDown(g, sp0[0] + 5, sp0[1] - 16 - gw, t);
        }
        if (st.stage === "D") {
          var sph = symPos(0, 1), tip = handTip(st.t), hx0 = sph[0] + 5 - 7;
          if (tip - 18 > 0) { R(g, hx0 + 2, 0, 2, tip - 18, BF_PAL.o); R(g, hx0 + 4, 0, 4, tip - 18, BF_PAL.O); R(g, hx0 + 8, 0, 2, tip - 18, BF_PAL.o); }
          sprite(g, HAND, BF_PAL, hx0, tip - 18, 2);
        }
        if (st.stage === "A1" && st.changed) { var sp1 = symPos(st.changed[0], st.changed[1]); arrowDown(g, sp1[0] + 5, sp1[1] - 16, t, C.red); }
      }
    };
  };

  PUZZLES.jar = function (ui) {
    var SLOT = [[12, 128], [42, 128], [72, 128]], GATE = [116, 128], JAR = { x: 214, y: 34, w: 88, h: 128 };
    function rndPat(seed) { var p = [], x = seed; for (var i = 0; i < 9; i++) { x = (x * 9301 + 49297) % 233280; p.push(x / 233280 > 0.5 ? 1 : 0); } p[4] = 1 - p[0]; return p; }
    var boxTok = [rndPat(11), rndPat(57), rndPat(203)];
    var tokens = [];
    for (var i = 0; i < 9; i++) tokens.push({ pat: rndPat(500 + i * 37), from: -1 });
    var spots = [];
    for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) spots.push([JAR.x + 8 + c * 12 + (r % 2) * 4, JAR.y + JAR.h - 16 - r * 13]);
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
    var order = shuffle(tokens.map(function (x, i) { return i; }));
    var st = { spent: [false, false, false], ghost: -1, refused: 0, anim: null, shake: 0, glow: -1, glowT: -9, payT: -9, frownT: -9, now: 0 };
    function spentCount() { return st.spent.filter(Boolean).length; }
    function boxAt(x, y) {
      for (var i = 0; i < 3; i++) { var s = SLOT[i]; if (x >= s[0] - 3 && x < s[0] + 27 && y >= s[1] - 6 && y < s[1] + 24) { if (!st.spent[i] || st.ghost === i) return i; } }
      return -1;
    }
    function drawBox(g, x, y, open, ghost, t) {
      if (ghost) g.globalAlpha = 0.65 + 0.3 * Math.sin(t * 6);
      R(g, x, y + 4, 24, 16, "#7a4a24"); R(g, x, y + 4, 24, 3, "#9a6232"); R(g, x + 10, y + 4, 4, 16, C.gold);
      if (!open) { R(g, x - 1, y, 26, 5, "#5a3418"); R(g, x + 10, y, 4, 5, C.gold); R(g, x + 10, y + 9, 4, 4, C.edge); }
      else R(g, x - 3, y - 6, 26, 4, "#5a3418");
      g.globalAlpha = 1;
      if (ghost) { var on = Math.floor(t * 8) % 2; for (var k = 0; k < 28; k += 4) if ((k / 4 + on) % 2) { R(g, x - 2 + k, y - 3, 2, 1, C.hi); R(g, x - 2 + k, y + 22, 2, 1, C.hi); } }
    }
    function drawToken(g, x, y, pat, col) {
      R(g, x + 2, y, 8, 12, col || "#c9d1d6"); R(g, x, y + 2, 12, 8, col || "#c9d1d6");
      R(g, x + 2, y + 10, 8, 2, "#7d8890");
      for (var i = 0; i < 9; i++) if (pat[i]) R(g, x + 3 + (i % 3) * 2, y + 3 + Math.floor(i / 3) * 2, 2, 2, "#5b6670");
    }
    return {
      info: function () { return { spent: st.spent.slice(), ghost: st.ghost, refused: st.refused, busy: !!st.anim, inJar: tokens.length }; },
      hot: function (x, y) { return !st.anim && boxAt(x, y) >= 0; },
      down: function (x, y) {
        if (st.anim) return;
        var i = boxAt(x, y); if (i < 0) return;
        st.anim = { box: i, t: 0, dup: st.spent[i] };
        if (st.anim.dup) st.ghost = -1;
        sound("click");
      },
      update: function (dt) {
        st.now += dt;
        st.shake = Math.max(0, st.shake - dt);
        var a = st.anim;
        if (!a) return;
        a.t += dt;
        if (!a.dup) {
          if (a.t > 0.9 && !a.payed) { a.payed = true; st.payT = st.now; sound("coin"); }
          if (a.t > 1.6 && !a.landed) { a.landed = true; tokens.push({ pat: boxTok[a.box], from: a.box }); order = shuffle(tokens.map(function (x, i) { return i; })); sound("stash"); }
          if (a.t > 2.0) { st.spent[a.box] = true; st.anim = null; if (st.ghost < 0 && !st.refused && spentCount() === 1) st.ghost = a.box; }
        } else {
          if (a.t > 1.3 && !a.hit) {
            a.hit = true; st.shake = 0.6; st.frownT = st.now; st.refused++; sound("caught");
            for (var k = 0; k < tokens.length; k++) if (tokens[k].from === a.box) st.glow = k;
            st.glowT = st.now;
          }
          if (a.t > 2.4) { st.anim = null; st.ghost = a.box; }
        }
        if (!st.anim && st.refused > 0 && spentCount() >= 2) ui.solve("THE JAR REMEMBERS EVERY SPENT TOKEN, NOT WHICH BOX IT CAME FROM. NO COIN SPENDS TWICE.", { ok: true });
      },
      draw: function (g, t) {
        R(g, 0, 0, W, H, C.sky); R(g, 0, 150, W, 30, C.grass); R(g, 0, 150, W, 2, "#3f7a32");
        R(g, 104, 92, 6, 60, C.plank); R(g, 146, 92, 6, 60, C.plank); R(g, 100, 86, 56, 8, C.plank); R(g, 100, 86, 56, 2, "#b07a44");
        var a = st.anim, refuse = a && a.dup && a.t > 1.3;
        if (refuse) for (var b = 0; b < 5; b++) R(g, 112 + b * 8, 94, 3, 56, C.red);
        var payBob = st.now - st.payT < 0.6 ? Math.round(Math.abs(Math.sin((st.now - st.payT) * 14)) * 3) : 0;
        bitfoot(g, 180, 150 - payBob, 2, { o: "#1f2a3a", O: "#4f7ab0", w: "#fff3c4", k: "#1f130a", F: "#2f4a70" }, true);
        if (st.now - st.frownT < 1.2) sprite(g, CROSS, { "#": C.red }, 175 + (Math.sin(st.now * 30) > 0 ? 1 : 0), 112, 2);
        if (st.now - st.payT < 1.5) { var cy = 116 - (st.now - st.payT) * 6; R(g, 176, cy, 8, 8, C.gold); R(g, 178, cy + 2, 4, 4, C.hi); }
        var sx = st.shake > 0 ? Math.round(Math.sin(st.shake * 60) * 3) : 0, jx = JAR.x + sx;
        g.fillStyle = "rgba(190,230,240,0.16)"; g.fillRect(jx, JAR.y, JAR.w, JAR.h);
        R(g, jx - 2, JAR.y, 2, JAR.h, "#bfe3ea"); R(g, jx + JAR.w, JAR.y, 2, JAR.h, "#bfe3ea"); R(g, jx - 2, JAR.y + JAR.h, JAR.w + 4, 2, "#bfe3ea");
        R(g, jx + 4, JAR.y + 8, 2, 60, "rgba(255,255,255,0.45)");
        R(g, jx - 6, JAR.y - 8, JAR.w + 12, 8, "#8a6a4a"); R(g, jx + JAR.w / 2 - 8, JAR.y - 8, 16, 3, C.edge);
        for (var k = 0; k < tokens.length && k < spots.length; k++) {
          var sp = spots[order.indexOf(k)], glow = st.glow === k && st.now - st.glowT < 1.4 && Math.sin(t * 16) > -0.2;
          drawToken(g, sp[0] + sx, sp[1], tokens[k].pat, glow ? "#ff8f7a" : null);
        }
        for (var i = 0; i < 3; i++) {
          if (a && a.box === i) continue;
          if (!st.spent[i]) drawBox(g, SLOT[i][0], SLOT[i][1], false, false, t);
          else if (st.ghost === i) drawBox(g, SLOT[i][0], SLOT[i][1], false, true, t);
          else R(g, SLOT[i][0], SLOT[i][1] + 18, 24, 2, "#1f3a1a");
        }
        if (a) {
          var from = SLOT[a.box], back = a.dup && a.t > 1.9, f = back ? 1 - ease((a.t - 1.9) / 0.5) : ease(a.t / 0.5);
          var bx = lerp(from[0], GATE[0], f), by = from[1];
          drawBox(g, bx, by, a.t > 0.5 && !back, a.dup, t);
          if (!a.dup && a.t > 0.6 && a.t < 0.95) { var cf = ease((a.t - 0.6) / 0.35); R(g, lerp(bx + 8, 174, cf), lerp(by - 8, 118, cf) - Math.sin(cf * Math.PI) * 18, 8, 8, C.gold); }
          if (a.t > 0.6 && a.t < (a.dup ? 1.3 : 1.6)) {
            var end = a.dup ? 1.3 : 1.6, tf = clamp((a.t - 0.6) / (end - 0.6)), tx = lerp(bx + 6, JAR.x + JAR.w / 2 - 6, tf);
            var ty = lerp(by - 10, a.dup ? JAR.y - 22 : JAR.y + 30, tf) - Math.sin(tf * Math.PI) * 60;
            drawToken(g, tx, ty, boxTok[a.box]);
          }
          if (a.dup && a.t >= 1.3 && a.t < 2.0) {
            var bf = (a.t - 1.3) / 0.7;
            drawToken(g, lerp(JAR.x + JAR.w / 2 - 6, JAR.x - 24, bf), JAR.y - 22 - Math.sin(bf * Math.PI) * 26 + bf * 140, boxTok[a.box], "#ff8f7a");
          }
        } else {
          if (st.ghost >= 0 && !st.refused) arrowDown(g, SLOT[st.ghost][0] + 12, SLOT[st.ghost][1] - 16, t);
          else if (spentCount() === 0) arrowDown(g, SLOT[0][0] + 12, SLOT[0][1] - 16, t);
          else if (st.refused && spentCount() < 2) { for (var u = 0; u < 3; u++) if (!st.spent[u]) { arrowDown(g, SLOT[u][0] + 12, SLOT[u][1] - 16, t); break; } }
          arrowSide(g, 96, 118, 1, 2, "rgba(255,224,138,0.5)");
        }
      }
    };
  };

  PUZZLES.cave = function (ui) {
    var OUT = [160, 172], ENT = [160, 142], FORK = [160, 120];
    var SIDE = [[[90, 120], [90, 34], [148, 34]], [[230, 120], [230, 34], [172, 34]]];
    function inPath(s) { return [OUT, ENT, FORK].concat(SIDE[s]); }
    function backPath(s) { return [SIDE[s][2], SIDE[s][1], SIDE[s][0], FORK]; }
    var FAKE_SCRIPT = [[0, 0], [0, 1], [1, 1], [1, 0]];
    var st = { who: "you", stage: "pick", side: -1, ask: -1, trust: 0, fake: [], round: 0, mover: null, pos: OUT.slice(), dirx: 1, wait: 0, door: 0, rattle: 0, nod: -9, frown: -9, now: 0, turned: true, misses: 0 };
    function speed() { return st.who === "you" ? 160 : 230; }
    function move(pts, then) { st.mover = { p: walkPath(pts), d: 0, then: then }; }
    function pickSide(s) {
      st.side = s; st.stage = "walkin"; st.turned = true;
      move(inPath(s), function () { st.stage = "ask"; st.wait = 0.4; });
    }
    function chooseAsk() {
      if (st.who === "fake") return FAKE_SCRIPT[st.fake.length][1];
      if (st.round === 0) return 1 - st.side;
      return Math.random() < 0.5 ? 0 : 1;
    }
    function exitBy(c) {
      if (c === st.side) { st.stage = "walkout"; move(backPath(st.side), function () { arrive(c); }); return; }
      if (st.who === "fake") { st.stage = "rattle"; st.rattle = 0.8; sound("bark"); return; }
      st.stage = "door"; st.door = 0; sound("linked");
    }
    function arrive(c) {
      var ok = c === st.ask;
      if (st.who === "you") {
        if (ok) { st.trust++; st.nod = st.now; sound("coin"); } else { st.trust = Math.max(0, st.trust - 1); st.misses++; st.frown = st.now; sound("caught"); }
      } else {
        st.fake.push(ok); if (ok) { st.nod = st.now; sound("coin"); } else { st.frown = st.now; sound("caught"); }
      }
      st.stage = "out";
      move([FORK, ENT, OUT], nextRound);
    }
    function nextRound() {
      st.round++; st.ask = -1; st.side = -1; st.turned = true;
      if (st.who === "you" && st.trust >= 5) { st.who = "fake"; st.stage = "fakewait"; st.wait = 1.0; return; }
      if (st.who === "fake" && st.fake.length >= FAKE_SCRIPT.length) { st.stage = "end"; ui.solve("YOU PROVED YOU KNOW THE CODE. YOU NEVER SAID IT.", { ok: true }); return; }
      if (st.who === "fake") { st.stage = "fakewait"; st.wait = 0.4; return; }
      st.stage = "pick";
    }
    return {
      info: function () { return { who: st.who, stage: st.stage, side: st.side, ask: st.ask, trust: st.trust, fake: st.fake.slice(), misses: st.misses }; },
      hot: function () { return st.who === "you" && (st.stage === "pick" || st.stage === "choose"); },
      down: function (x) {
        if (st.who !== "you") return;
        var s = x < 160 ? 0 : 1;
        if (st.stage === "pick") { sound("click"); pickSide(s); }
        else if (st.stage === "choose") { sound("click"); exitBy(s); }
      },
      update: function (dt) {
        st.now += dt;
        var m = st.mover;
        if (m) {
          m.d += speed() * dt;
          var p = m.p.at(m.d); st.pos = [p[0], p[1]]; if (p[2]) st.dirx = p[2] > 0 ? 1 : -1;
          if (m.d >= m.p.len) { st.mover = null; m.then(); }
        }
        if (st.stage === "ask") { st.wait -= dt; if (st.wait <= 0) { st.ask = chooseAsk(); st.turned = false; sound("hover"); st.stage = st.who === "you" ? "choose" : "fakethink"; st.wait = 0.6; } }
        if (st.stage === "fakethink") { st.wait -= dt; if (st.wait <= 0) exitBy(st.ask); }
        if (st.stage === "door") {
          st.door = Math.min(1, st.door + dt * 2.5);
          if (st.door >= 1 && !st.mover) {
            var c = 1 - st.side;
            st.stage = "walkout";
            move([SIDE[st.side][2], SIDE[c][2], SIDE[c][1], SIDE[c][0], FORK], function () { arrive(c); });
          }
        }
        if (st.stage === "walkout" && st.door > 0 && st.mover && st.mover.d > 40) st.door = Math.max(0, st.door - dt * 3);
        if (st.stage === "rattle") {
          st.rattle -= dt;
          if (st.rattle <= 0) { var s = st.side; st.stage = "walkout"; move(backPath(s), function () { arrive(s); }); }
        }
        if (st.stage === "fakewait") { st.wait -= dt; if (st.wait <= 0) pickSide(FAKE_SCRIPT[st.fake.length][0]); }
      },
      draw: function (g, t) {
        R(g, 0, 0, W, H, C.sky);
        R(g, 0, 150, W, 30, C.grass); R(g, 0, 150, W, 2, "#3f7a32");
        R(g, 62, 10, 196, 144, C.stone);
        for (var i = 0; i < 40; i++) R(g, 64 + (i * 47) % 190, 12 + (i * 29) % 138, 4, 3, C.stone2);
        var TW = 16, tun = "#1a120b";
        R(g, 82, 26, 156, TW, tun); R(g, 82, 26, TW, 102, tun); R(g, 222, 26, TW, 102, tun); R(g, 82, 112, 156, TW, tun); R(g, 152, 112, TW, 44, tun);
        var dx = 156, dy = 24, dh = 20, op = st.door, shakeX = st.stage === "rattle" ? Math.round(Math.sin(st.now * 50) * 2) : 0;
        R(g, dx + shakeX, dy, 8, Math.round(dh * (1 - op)), "#6b3f1e"); R(g, dx + 1 + shakeX, dy + 2, 6, 2, "#8a5a2e");
        if (op < 0.6) sprite(g, RUNE, { "#": st.stage === "rattle" ? C.red : (st.stage === "door" ? C.hi : "#b07a2a") }, dx - 1 + shakeX, dy + 7, 2);
        var you = st.who === "you";
        bitfoot(g, st.pos[0], st.pos[1] + 5, 1, you ? BF_PAL : FAKE_PAL, st.dirx < 0, st.mover ? st.now : 0);
        if (you) sprite(g, RUNE, { "#": C.gold }, st.pos[0] - 2, st.pos[1] - 13, 1);
        else sprite(g, NOKEY, { "#": "#9a9a90" }, st.pos[0] - 1, st.pos[1] - 13, 1);
        var wx = 196, nod = st.now - st.nod < 0.8, fr = st.now - st.frown < 1.0;
        person(g, wx, 178 - (nod ? Math.round(Math.abs(Math.sin((st.now - st.nod) * 14)) * 2) : 0), 2, WATCH_PAL, st.turned, false);
        if (fr) sprite(g, CROSS, { "#": C.red }, wx - 5, 136, 2);
        if (st.ask >= 0 && !nod && !fr) {
          R(g, wx + 6, 118, 30, 22, C.cream); R(g, wx + 4, 120, 34, 18, C.cream); R(g, wx + 6, 140, 4, 4, C.cream);
          arrowSide(g, wx + 21, 129, st.ask ? 1 : -1, 2, C.edge);
        }
        R(g, 270, 30, 18, 104, C.edge); sprite(g, RUNE, { "#": C.gold }, 274, 18, 2);
        for (var p = 0; p < 5; p++) R(g, 273, 114 - p * 20, 12, 16, p < st.trust ? C.green : "#3a2a1a");
        if (!you || st.fake.length) {
          R(g, 294, 50, 18, 84, C.edge); sprite(g, NOKEY, { "#": "#9a9a90" }, 300, 36, 2);
          for (var q = 0; q < 4; q++) R(g, 297, 114 - q * 20, 12, 16, q < st.fake.length ? (st.fake[q] ? C.green : C.red) : "#3a2a1a");
        }
        if (you && (st.stage === "pick" || st.stage === "choose")) {
          var b = Math.sin(t * 6) > 0 ? 1 : 0;
          arrowSide(g, 116 - b * 2, 120, -1, 2); arrowSide(g, 204 + b * 2, 120, 1, 2);
        }
      }
    };
  };

  PUZZLES.key = function (ui) {
    var SLOTS = [{ id: "words", x: 12 }, { id: "full", x: 49 }, { id: "incoming", x: 86 }, { id: "none", x: 123 }];
    var ROWS = [true, false, true, true, false];
    var LINES = {
      incoming: "HE SEES WHAT CAME IN. HE CAN'T MOVE A COIN.",
      full: "HE SEES WHAT CAME IN AND WHAT WENT OUT. MORE THAN HE ASKED.",
      words: "YOUR 24 WORDS CAN SPEND EVERY COIN. NEVER HAND THEM OVER.",
      none: "NO KEY, NO LOOK. HE CAN'T CHECK WHAT YOU GOT."
    };
    var st = { pick: null, t: 0 };
    function reset() { st.pick = null; st.t = 0; }
    var EX = 250, EY = 128;
    function slotAt(x, y) { for (var i = 0; i < 4; i++) if (x >= SLOTS[i].x && x < SLOTS[i].x + 35 && y >= 112 && y < 172) return SLOTS[i].id; return null; }
    function head(g, x, y, on) { R(g, x, y, 10, 10, on ? "#8a5a2e" : "#4a3a2a"); if (on) { R(g, x + 2, y + 3, 2, 2, C.cream); R(g, x + 6, y + 3, 2, 2, C.cream); } }
    function drawKey(g, id, x, y) {
      if (id === "none") {
        for (var k = 0; k < 24; k += 4) { R(g, x + k, y - 4, 2, 2, C.bark); R(g, x + k, y + 18, 2, 2, C.bark); R(g, x, y - 4 + k, 2, 2, C.bark); R(g, x + 24, y - 4 + k, 2, 2, C.bark); }
        sprite(g, CROSS, { "#": C.bark }, x + 8, y + 3, 2);
        return;
      }
      var body = id === "words" ? C.gold : id === "full" ? "rgba(200,240,250,0.35)" : "#dfe6ea", edge = id === "words" ? "#8a5e10" : id === "full" ? "#bfe3ea" : "#a9b6bd";
      R(g, x, y, 16, 16, edge); R(g, x + 2, y + 2, 12, 12, body);
      R(g, x + 16, y + 6, 14, 4, edge); R(g, x + 16, y + 7, 13, 2, body);
      R(g, x + 24, y + 10, 2, 5, edge); R(g, x + 28, y + 10, 2, 4, edge);
      if (id === "words") for (var d = 0; d < 12; d++) R(g, x + 3 + (d % 4) * 3, y + 4 + Math.floor(d / 4) * 3, 1, 1, "#5a3a08");
      if (id === "full") { R(g, x + 4, y + 6, 8, 4, "#bfe3ea"); R(g, x + 7, y + 7, 2, 2, C.edge); }
      if (id === "incoming") sprite(g, ["..#..", "...#.", "#####", "...#.", "..#.."], { "#": "#4a6a78" }, x + 3, y + 3, 2);
    }
    function drawRow(g, i, on) {
      var y = 14 + i * 17, inc = ROWS[i];
      R(g, 12, y, 150, 14, "#2a1a0d");
      var col = !on ? "#4a3a2a" : inc ? C.green : "#e08a3a";
      if (inc) {
        R(g, 18, y + 3, 8, 8, on ? C.gold : "#5a4a3a"); R(g, 34, y + 6, 18, 2, col); arrowSide(g, 58, y + 7, 1, 1, col); head(g, 72, y + 2, on);
        if (on) { R(g, 92, y + 3, 12, 8, C.cream); R(g, 93, y + 4, 10, 1, C.bark); R(g, 96, y + 6, 4, 1, C.bark); }
      } else { head(g, 18, y + 2, on); R(g, 34, y + 6, 18, 2, col); arrowSide(g, 58, y + 7, 1, 1, col); R(g, 72, y + 3, 8, 8, on ? C.gold : "#5a4a3a"); }
      if (!on) for (var k = 0; k < 18; k++) R(g, 14 + (k * 29 + i * 7) % 144, y + 1 + (k * 5) % 11, 3, 2, "#5f4c3a");
    }
    function lit(i) {
      if (!st.pick || st.t < 0.7) return false;
      var k = st.t - 0.7 - i * 0.18;
      if (st.pick === "full") return k > 0;
      if (st.pick === "incoming") return ROWS[i] && k > 0;
      return false;
    }
    return {
      info: function () { return { pick: st.pick, t: st.t }; },
      hot: function (x, y) { return !st.pick && !!slotAt(x, y); },
      down: function (x, y) {
        if (st.pick) return;
        var id = slotAt(x, y); if (!id) return;
        st.pick = id; st.t = 0; sound("click");
      },
      update: function (dt) {
        if (!st.pick) return;
        var before = st.t; st.t += dt;
        if (st.pick === "words" && before < 1.0 && st.t >= 1.0) sound("caught");
        if (st.pick === "incoming" && before < 1.4 && st.t >= 1.4) sound("coin");
        if (st.pick === "none" && before < 0.7 && st.t >= 0.7) sound("bark");
        if (st.t >= (st.pick === "words" ? 3.0 : 2.0)) ui.solve(LINES[st.pick], { pick: st.pick }, reset);
      },
      draw: function (g, t) {
        R(g, 0, 0, W, H, C.dark); R(g, 0, 150, W, 30, "#24170b");
        R(g, 8, 8, 158, 96, C.edge);
        for (var i = 0; i < 5; i++) drawRow(g, i, lit(i));
        var p = st.pick, tt = st.t, nod = p === "incoming" && tt > 1.4 && tt < 2.4 ? Math.round(Math.abs(Math.sin(tt * 12)) * 2) : 0;
        person(g, EX, EY + nod, 3, ELDER_PAL, false, true);
        R(g, 214, 16, 46, 30, C.cream); R(g, 212, 18, 50, 26, C.cream); R(g, 240, 46, 4, 4, C.cream); R(g, 244, 50, 2, 2, C.cream);
        if (p === "none" && tt > 0.7) sprite(g, CROSS, { "#": C.red }, 230, 23, 3);
        else if (p === "full" && tt > 1.3) { R(g, 226, 20, 4, 14, C.red); R(g, 226, 37, 4, 4, C.red); R(g, 242, 20, 4, 14, C.red); R(g, 242, 37, 4, 4, C.red); }
        else if (p === "incoming" && tt > 1.4) sprite(g, [".....#", "....##", "#..##.", "####..", ".##..."], { "#": C.green }, 228, 23, 3);
        else { R(g, 218, 27, 8, 8, C.gold); R(g, 228, 30, 6, 2, C.green); arrowSide(g, 238, 31, 1, 1, C.green); head(g, 246, 26, true); }
        var steal = p === "words" ? (tt < 0.6 ? 0 : tt < 1.4 ? ease((tt - 0.6) / 0.8) : tt < 2.2 ? 1 : 1 - ease((tt - 2.2) / 0.6)) : 0;
        for (var c = 0; c < 5; c++) {
          var wob = p === "words" && tt < 1.4 ? Math.round(Math.sin(tt * 30 + c) * 1.5) : 0;
          var x0 = 198 + (c % 3) * 9, y0 = 142 - Math.floor(c / 3) * 8;
          var x1 = lerp(x0, EX - 24 + (c % 3) * 6, steal), y1 = lerp(y0, EY - 8 - Math.floor(c / 3) * 6, steal);
          R(g, x1 + wob, y1, 8, 8, C.gold); R(g, x1 + 2 + wob, y1 + 2, 4, 4, C.hi);
        }
        bitfoot(g, 180, 150, 2, BF_PAL, false);
        R(g, 8, 108, 154, 68, C.edge); R(g, 10, 110, 150, 64, "#2a1a0d");
        for (var s = 0; s < 4; s++) {
          var sl = SLOTS[s], given = p === sl.id;
          R(g, sl.x, 112, 35, 60, given ? "#1a0f07" : "#3a2514");
          if (!given) drawKey(g, sl.id, sl.x + 3, 134);
        }
        if (p && p !== "none") {
          var go = ease(tt / 0.6), back = p === "words" ? ease((tt - 2.3) / 0.6) : 0;
          var sx = SLOTS.filter(function (z) { return z.id === p; })[0].x + 3;
          drawKey(g, p, lerp(lerp(sx, EX - 36, go), sx, back), lerp(lerp(134, EY - 28, go), 134, back));
        }
        if (p === "words" && tt > 1.0 && tt < 1.6 && Math.sin(tt * 30) > 0) { g.fillStyle = "rgba(217,87,63,0.35)"; g.fillRect(0, 0, W, H); }
        if (!p) arrowDown(g, 90, 100, t);
      }
    };
  };

  window.BH.trailPuzzles = { open: open, isOpen: function () { return !!cur; }, frames: function () { return frames; },
    info: function () { return cur && cur.api && cur.api.info ? cur.api.info() : null; } };
})();
