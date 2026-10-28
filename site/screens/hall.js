(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  var FONT = '"Plex Cond", system-ui, sans-serif';
  var GAP = 104, BGAP = 76, FW = 64, FH = 84, WING = 84, HUB = 150, DOOR = 120, SPEED = 120;
  var BGS = ["#35513a", "#5a3a34", "#34465a", "#5a5034", "#46385a", "#2f5552", "#5a3a4f", "#4a5a34"];
  var hall = null, held = { l: 0, r: 0 }, cuts = {};

  function CH() { return BH.characters; }
  function cut(art) {
    if (!cuts[art]) { var im = new Image(); im.src = "assets/cut/" + art + ".png"; cuts[art] = im; }
    var c = cuts[art]; return c.complete && c.naturalWidth ? c : null;
  }
  function wornId() { var w = CH().worn(save); return w || CH().DEFAULT; }
  function artOf(it) { return it.art || (it.id === CH().DEFAULT && CH().MAIN ? CH().MAIN.slice(5) : null); }

  function layout(mode) {
    var C = CH(), list = C.list, one = function (f) { return list.filter(f); };
    var N = (window.LEVELS || []).length, upTo = function (n) { return n >= 1 && n <= N; };
    var buy = one(function (c) { return c.rule.buy != null; }).sort(function (a, b) { return a.rule.buy - b.rule.buy; });
    var earn = one(function (c) { return c.rule.clear != null && upTo(C.unlockAt(c.id)); }).sort(function (a, b) { return C.unlockAt(a.id) - C.unlockAt(b.id); });
    var found = one(function (c) { return !!c.rule.found && upTo(c.rule.found.level); }).sort(function (a, b) { return (a.rule.act || 0) - (b.rule.act || 0); });
    var reach = function (a) { var m = /level (\d+)/i.exec(a.how || ""); return a.need <= N && !(m && +m[1] > N); };
    var x = DOOR, frames = [], signs = [], A = BH.achievements, hub;
    if (mode !== "badges") {
      var put = function (c) { frames.push({ it: c, x: x + GAP / 2, gap: GAP, bg: BGS[frames.length % BGS.length], glow: 0, pop: 0 }); x += GAP; };
      if (buy.length) {
        signs.push({ x: x + WING / 2, text: "UNDER CONSTRUCTION", build: 1 }); x += WING;
        buy.slice().reverse().forEach(put);
        x += WING;
      }
      hub = x + HUB / 2; x += HUB;
      frames.push({ ladder: 1, up: 1, x: hub + 52, gap: 44, glow: 0, pop: 0 }, { exit: 1, x: hub, gap: 36, glow: 0, pop: 0 });
      x += WING / 2;
      one(function (c) { return c.id !== C.DEFAULT && c.rule.buy == null && c.rule.clear == null && !c.rule.found; }).forEach(put);
      one(function (c) { return c.id === C.DEFAULT; }).forEach(put);
      [["EARN THEM ON THE HUNT", earn], ["HIDDEN ON THE HUNT", found]].forEach(function (w) {
        if (!w[1].length) return;
        signs.push({ x: x + WING / 2, text: w[0] }); x += WING;
        w[1].forEach(put);
      });
      signs.push({ x: x + WING / 2, text: "UNDER CONSTRUCTION", build: 1 }); x += WING;
      return { frames: frames, signs: signs, hub: hub, ladder: hub + 52, len: x + DOOR / 2 };
    }
    signs.push({ x: x + WING / 2, text: "UNDER CONSTRUCTION", build: 1 }); x += WING;
    var ORDER = ["first-escape", "sweep", "ghost", "quick", "triple", "sweeper", "tracker", "shadow", "matcher", "halfway", "never-caught"];
    var rank = function (a) { var i = ORDER.indexOf(a.id); return i < 0 ? 99 : i; };
    var all = A && A.list ? A.list.filter(reach) : [], kindOf = function (a) { return a.kind || "game"; };
    ["fun", "learn", "game"].forEach(function (k) {
      var row = all.filter(function (a) { return kindOf(a) === k; });
      if (k === "game") row.sort(function (a, b) { return rank(b) - rank(a); }); else row.reverse();
      row.forEach(function (a) { frames.push({ badge: a, x: x + BGAP / 2, gap: BGAP, glow: 0, pop: 0 }); x += BGAP; });
    });
    x += WING / 2;
    hub = x + HUB / 2; x += HUB;
    frames.push({ exit: 1, x: hub, gap: 36, glow: 0, pop: 0 });
    return { frames: frames, signs: signs, hub: hub, len: x + DOOR / 2, badges: 1 };
  }
  var GG = 58, MG = 70, EDGE = 70;
  var MERCH = [
    { slots: ["fur"], name: "THE TAILOR", say: "FURS FOR EVERY BITFOOT", fur: "fur-bark", hat: "hat-beanie" },
    { slots: ["hat"], name: "THE HATTER", say: "A HAT FOR EVERY HEAD", fur: "fur-ash", hat: "hat-lantern" },
    { slots: ["print", "cele"], name: "THE PRINT MAKER", say: "FOOTPRINTS AND DEN PARTIES", fur: "fur-rust", hat: "hat-cap" }
  ];
  function treeLayout() {
    var K = BH.cosmetics, frames = [], stalls = [], x = EDGE;
    var goods = function (m) { return K.list.filter(function (i) { return m.slots.indexOf(i.slot) >= 0; }); };
    var stall = function (m, left) {
      var g = goods(m), s0 = x;
      if (!left) { frames.push({ merchant: m, x: x + MG / 2, gap: MG, glow: 0, pop: 0 }); m.x = x + MG / 2; x += MG; }
      g.forEach(function (it) { frames.push({ good: it, x: x + GG / 2, gap: GG, glow: 0, pop: 0 }); x += GG; });
      if (left) { frames.push({ merchant: m, x: x + MG / 2, gap: MG, glow: 0, pop: 0 }); m.x = x + MG / 2; x += MG; }
      stalls.push({ x0: s0, x1: x, m: m });
    };
    stall(MERCH[0], true);
    var hub = x + HUB / 2; x += HUB;
    frames.push({ ladder: 1, down: 1, x: hub, gap: 44, glow: 0, pop: 0 });
    stall(MERCH[1], false); x += 40;
    stall(MERCH[2], false);
    return { frames: frames, signs: [], stalls: stalls, hub: hub, ladder: hub, len: x + EDGE, tree: 1 };
  }
  function wornCos(slot) { var K = BH.cosmetics; return (save.cos && save.cos[slot]) || (K && K.DEFAULTS[slot]); }
  function badgeRow(f) {
    var rows = BH.achievements.state(save);
    for (var i = 0; i < rows.length; i++) if (rows[i].id === f.badge.id) return rows[i];
    return { earned: false, have: 0, need: 1, name: f.badge.name, how: f.badge.how };
  }

  function tag(f) {
    if (f.exit) return { name: "THE DOOR", line: (hall && hall.touch ? "TAP" : "ENTER") + " · GO OUT", kind: "own" };
    if (f.ladder) return { name: f.up ? "THE TREE HOUSE" : "THE GALLERY", line: (hall && hall.touch ? "TAP" : f.up ? "W" : "S") + (f.up ? " · CLIMB UP" : " · CLIMB DOWN"), kind: "own" };
    if (f.merchant) return { name: f.merchant.name, line: f.merchant.say, kind: "own" };
    if (f.good) {
      var K = BH.cosmetics, gs = K.status(f.good.id, save, window.LV), on = wornCos(f.good.slot) === f.good.id;
      var fit = (f.good.slot === "fur" || f.good.slot === "hat") && CH().worn(save) ? " (BACK TO YOUR BITFOOT)" : "";
      if (on && !fit) return { plaque: "WEARING", line: "YOU'RE WEARING IT", kind: "on" };
      if (gs.state === "owned") return { plaque: on ? "WEARING" : "OWNED", line: key("act") + " · WEAR IT" + fit, kind: "own" };
      if (gs.state === "buyable") return gs.afford ? { plaque: gs.price + " ZEC", line: key("act") + " · BUY FOR " + gs.price + " ZEC", kind: "buy", coin: 1 }
        : { plaque: gs.price + " ZEC", line: "NEED " + (gs.price - (+save.wallet || 0)) + " MORE ZEC", kind: "poor", coin: 1 };
      return { plaque: "LOCKED", line: "UNLOCK: " + String(gs.text || "").toUpperCase(), kind: "lock" };
    }
    if (f.badge) {
      var b = badgeRow(f);
      var how = String(b.how || f.badge.how || "").replace(/\.$/, "").toUpperCase();
      if (b.earned) return { plaque: "EARNED", line: "EARNED · " + how, kind: "on" };
      return { plaque: b.need > 1 ? b.have + " / " + b.need : "NOT YET", line: how, kind: "lock" };
    }
    var C = CH(), id = f.it.id, st = C.status(id, save), r = f.it.rule;
    if (id === wornId()) return { plaque: "WEARING", line: "YOU'RE WEARING IT", kind: "on" };
    if (st.state === "owned") return { plaque: "OWNED", line: key("act") + " · WEAR IT", kind: "own" };
    if (st.state === "buyable") return st.afford ? { plaque: st.price + " ZEC", line: key("act") + " · BUY FOR " + st.price + " ZEC", kind: "buy", coin: 1 }
      : { plaque: st.price + " ZEC", line: "NEED " + (st.price - (+save.wallet || 0)) + " MORE ZEC", kind: "poor", coin: 1 };
    if (r.found) return { plaque: "ACT " + (r.act + 1), line: "HIDDEN SOMEWHERE IN ACT " + (r.act + 1), kind: "hid" };
    var lv = C.unlockAt(id);
    return { plaque: r.clear === "genesis" ? "BONUS" : "LEVEL " + lv, line: String(st.text || "").toUpperCase() + " TO EARN IT", kind: "lock" };
  }
  function key(a) {
    if (a === "act") return hall && hall.touch ? "TAP" : (BH.binds ? BH.binds.name("decoy") : "E");
    return "";
  }

  function html() {
    return '<div class="hall" id="hall"><canvas id="hallCv"></canvas>' +
      '<div class="hall-top"><div class="hall-zec"><i class="hall-coin" aria-hidden="true"></i><b id="hallZec">0</b> ZEC</div>' +
      '<div class="hall-title">THE GALLERY</div>' +
      '<div class="hall-btns"><button class="hall-btn" id="hallBack">BACK</button></div></div>' +
      '<div class="hall-card" id="hallCard"><div class="hall-name" id="hallName"></div><div class="hall-line" id="hallLine"></div></div>' +
      '<div class="hall-hint" id="hallHint"></div>' +
      '<div class="hall-pad"><button class="hall-pb" id="hallL" aria-label="Walk left">◀</button><button class="hall-pb go" id="hallGo">CHOOSE</button><button class="hall-pb" id="hallR" aria-label="Walk right">▶</button></div>' +
      '</div>';
  }
  function mount(cb) {
    var cv = document.getElementById("hallCv"); if (!cv || !CH()) return;
    var bad = cb.at === "badges", L = layout(bad ? "badges" : null), T2 = BH.cosmetics && !bad ? treeLayout() : null;
    var fl = cb.at === "tree" && T2 ? 1 : 0, cur = fl ? T2 : L, startX = cur.hub;
    L.frames.forEach(function (f) { if (f.it && artOf(f.it)) cut(artOf(f.it)); });
    var touch = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
    hall = { cv: cv, g: cv.getContext("2d"), Ls: [L, T2], fl: fl, L: cur, cb: cb, x: startX, dir: "right", walk: 0, cam: null, t0: performance.now(), last: performance.now(),
      goal: null, focus: null, flash: null, bits: [], dust: [], motes: [], prints: [], pdist: 0, cele: null, lad: null, touch: touch,
      door: !fl && (!cb.at || bad) ? { t: 0, out: false } : null };
    if (CH().climbSheet) CH().climbSheet();
    setTitle();
    for (var i = 0; i < 40; i++) hall.motes.push({ x: Math.random() * L.len, y: Math.random(), v: 2 + Math.random() * 4, p: Math.random() * 6 });
    document.getElementById("hall").classList.toggle("touch", touch);
    var on = function (id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", function (e) { e.stopPropagation(); fn(); }); };
    on("hallBack", function () { sfxS("click"); cb.back(); });
    on("hallGo", function () { if (hall && hall.lad) { hall.lad.drop = 1; return; } choose(); });
    hold("hallL", "l"); hold("hallR", "r");
    cv.addEventListener("pointerdown", function (e) { tapAt(e); });
    hint();
    requestAnimationFrame(loop);
  }
  function hold(id, side) {
    var el = document.getElementById(id); if (!el) return;
    var up = function () { held[side] = 0; };
    el.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); held[side] = 1; if (hall) hall.goal = null; });
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("pointerleave", up);
  }
  function hint() {
    var el = document.getElementById("hallHint"); if (!el) return;
    var B = BH.binds;
    var t = hall.touch ? "" : hall.lad ? (B ? B.name("up") + " UP · " + B.name("down") : "W UP · S") + " DOWN · A D LET GO"
      : (B ? B.name("left") + " " + B.name("right") : "A D") + " MOVE · " + key("act") + " CHOOSE · ESC BACK";
    if (el.textContent !== t) el.textContent = t;
    var l = document.getElementById("hallL"), r = document.getElementById("hallR"), on = !!hall.lad;
    if (l && l.textContent !== (on ? "▼" : "◀")) { l.textContent = on ? "▼" : "◀"; l.setAttribute("aria-label", on ? "Climb down" : "Walk left"); }
    if (r && r.textContent !== (on ? "▲" : "▶")) { r.textContent = on ? "▲" : "▶"; r.setAttribute("aria-label", on ? "Climb up" : "Walk right"); }
  }
  function setTitle() { var el = document.querySelector && document.querySelector(".hall-title"); if (el) el.textContent = hall.fl ? "THE TREE HOUSE" : hall.L.badges ? "BADGES" : "THE GALLERY"; }
  function climb() {
    if (!hall || hall.lad || hall.tp || hall.mv || hall.land || !hall.Ls[1]) return;
    if (CH().worn(save) === "char-027") { sfxS("warpOut"); hall.tp = { t: 0, to: hall.fl ? 0 : 1, x0: hall.x }; hall.say = null; held.l = held.r = 0; hall.goal = null; hint(); return; }
    var M = move(), L = M && (hall.fl ? M.down : M.up);
    if (L) { hall.mv = { m: L, t: 0, sw: 0, to: hall.fl ? 0 : 1, up: !hall.fl, x0: hall.x, s: {} }; hall.mfr = null; held.l = held.r = 0; hall.goal = null; if (L.start) L.start(hall.mv.s, mapi(hall, hall.mv)); hint(); return; }
    sfxS("click"); hall.lad = { y: hall.view ? hall.view.floor + 1 : 0, d: 0, t: 0, x0: hall.x, sw: 0, mv: 0 }; held.l = held.r = 0; hall.goal = null; hint();
  }
  var DOORT = 0.7, RUN = 230, CLIMBV = 90, SWAP = 0.35, TPO = 0.8, TPI = 0.6, SAY = 2, TALK = 24;
  var NEON = ["#7dff6a", "#ff4dff", "#5ef2ff", "#ffffff", "#c6ff3d"];
  function neon() { return NEON[Math.floor(Math.random() * NEON.length)]; }
  function scene(h, to) { h.fl = to; h.L = h.Ls[to]; h.cam = null; h.focus = null; h.prints = []; h.bits = []; h.dust = []; setTitle(); sfxS("hover"); }
  function sfxS(n) { try { if (typeof sfx === "function") sfx(n); } catch (e) {} }
  function sfxO(n, o) { try { if (typeof sfx === "function") sfx(n, o); } catch (e) {} }
  function live() { return !!(hall && hall.cv && hall.cv.isConnected); }

  function keyDown(k) {
    if (!live()) return false;
    var m = BH.binds ? String(BH.binds.map(k) || "").toLowerCase() : String(k).toLowerCase();
    if (m === "shift") { held.run = 1; return true; }
    if (k === "ArrowLeft" || m === "a") { held.l = 1; hall.goal = null; return true; }
    if (k === "ArrowRight" || m === "d") { held.r = 1; hall.goal = null; return true; }
    var f = hall.focus;
    if (k === "ArrowUp" || m === "w") { held.u = 1; if (!hall.lad && f && f.ladder && f.up) climb(); return true; }
    if (k === "ArrowDown" || m === "s") { held.d = 1; if (!hall.lad && f && f.ladder && f.down) climb(); return true; }
    if (k === "Enter" || k === " " || m === "e") { choose(); return true; }
    return false;
  }
  window.addEventListener("keyup", function (e) {
    var k = e.key, m = BH.binds ? String(BH.binds.map(k) || "").toLowerCase() : String(k).toLowerCase();
    if (k === "ArrowLeft" || m === "a") held.l = 0;
    if (k === "ArrowRight" || m === "d") held.r = 0;
    if (k === "ArrowUp" || m === "w") held.u = 0;
    if (k === "ArrowDown" || m === "s") held.d = 0;
    if (m === "shift") held.run = 0;
  });
  window.addEventListener("blur", function () { held.l = held.r = held.run = held.u = held.d = 0; });
  function tapAt(e) {
    if (!live() || !hall.view || hall.lad || hall.tp || hall.mv || hall.land) return;
    var v = hall.view, r = hall.cv.getBoundingClientRect(), wx = (e.clientX - r.left) / v.s + hall.cam, wy = (e.clientY - r.top) / v.s;
    var hit = null;
    var y0 = hall.L.tree ? v.floor - 80 : v.fy - 8, y1 = hall.L.tree ? v.floor : v.fy + FH + 22;
    hall.L.frames.forEach(function (f) { var hw = f.ladder ? 16 : Math.min(FW / 2 + 6, f.gap / 2); if (Math.abs(wx - f.x) < hw && (f.ladder || (wy > y0 && wy < y1))) hit = f; });
    if (!hit) { hall.goal = Math.max(DOOR / 2, Math.min(hall.L.len - DOOR / 2, wx)); return; }
    if (hit === hall.focus && Math.abs(hall.x - hit.x) < 6) { choose(); return; }
    hall.goal = hit.x; hall.pick = hit;
  }

  function choose() {
    if (!live() || hall.lad || hall.door || hall.tp || hall.mv || hall.land) return;
    var f = hall.focus; if (!f) return;
    if (f.ladder) { climb(); return; }
    if (f.exit) { sfxS("click"); hall.door = { t: 0, out: true, x0: hall.x }; held.l = held.r = 0; hall.goal = null; return; }
    if (f.badge || f.merchant) { sfxS("click"); f.pop = 1; return; }
    if (f.good) { chooseCos(f); return; }
    var C = CH(), id = f.it.id, st = C.status(id, save);
    if (typeof ensureSave === "function") ensureSave();
    if (st.state === "locked") { sfxS("click"); f.shake = 0.35; return; }
    if (st.state === "buyable") {
      if ((+save.wallet || 0) < st.price) { sfxS("click"); f.shake = 0.35; return; }
      if (!C.buy(id, save)) { sfxS("click"); f.shake = 0.35; return; }
      bought(f); return;
    }
    if (id === wornId()) { sfxS("click"); f.pop = 1; return; }
    sfxS("click"); wear(id); f.pop = 1;
  }
  function burst(f) {
    var y = hall.L.tree ? hall.view.floor - 50 : hall.view.fy + FH / 2;
    for (var i = 0; i < 26; i++) { var a = Math.random() * 6.283, v = 40 + Math.random() * 90; hall.bits.push({ x: f.x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0 }); }
  }
  function bought(f) { sfxS("buy"); wear(f.it.id); f.pop = 1.4; burst(f); }
  function chooseCos(f) {
    var K = BH.cosmetics, it = f.good, id = it.id, st = K.status(id, save, window.LV);
    if (typeof ensureSave === "function") ensureSave();
    save.cos = save.cos || {}; save.cos.owned = save.cos.owned || {};
    var done = function (paid) { if (paid) { sfxS("buy"); burst(f); f.pop = 1.4; } else { sfxS("click"); f.pop = 1; } wearCos(it); };
    if (st.state === "locked") { sfxS("click"); f.shake = 0.35; return; }
    if (st.state === "buyable") {
      if ((+save.wallet || 0) < st.price) { sfxS("click"); f.shake = 0.35; return; }
      save.wallet -= st.price; save.cos.owned[id] = true; done(true); return;
    }
    done(false);
  }
  function wearCos(it) {
    save.cos[it.slot] = it.id;
    if ((it.slot === "fur" || it.slot === "hat") && CH().worn(save)) save.char = "";
    if (typeof applyLook === "function") applyLook();
    if (typeof persist === "function") persist();
    if (it.slot === "cele") hall.cele = { id: it.id, t: 0 };
  }
  function wear(id) {
    save.char = id === CH().DEFAULT ? "char-none" : id;
    if (typeof persist === "function") persist();
  }

  function loop(now) {
    if (!live()) { hall = null; held.l = held.r = 0; return; }
    requestAnimationFrame(loop);
    var h = hall, dt = Math.min(0.05, (now - h.last) / 1000); h.last = now;
    var cv = h.cv, dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var s = Math.max(2, Math.floor(Math.min(H / 236, W / 110))), R = H / s, VW = W / s, floor = R - 30;
    var fy = Math.max(24, floor - 61 - 34 - 16 - FH);
    h.view = { s: s, R: R, VW: VW, floor: floor, fy: fy };
    if (h.lad) {
      var c = h.lad, base = floor + 1, wasMv = c.mv;
      c.t += dt; c.sw = Math.max(0, c.sw - dt);
      h.x = c.x0 + (h.L.ladder - c.x0) * Math.min(1, c.t / 0.12);
      c.mv = ((held.u || (h.touch && held.r)) ? 1 : 0) - ((held.d || (h.touch && held.l)) ? 1 : 0);
      if (c.mv) { c.y -= c.mv * CLIMBV * dt; c.d += CLIMBV * dt; }
      if (c.mv !== wasMv && !c.mv) c.d = 0;
      var swap = function (to, y) { scene(h, to); h.x = c.x0 = h.L.ladder; c.t = 1; c.y = y; c.sw = SWAP; };
      var side = h.touch ? 0 : held.r - held.l;
      if ((side || c.drop) && Math.abs(c.y - base) >= 1) {
        h.fall = { y: c.y, vy: 0, vx: side * 70, sw: c.sw }; if (side) h.dir = side > 0 ? "right" : "left";
        h.lad = null; hint(); sfxS("click");
      } else if (!h.fl) {
        if (c.y >= base && c.mv <= 0) { c.y = base; if (c.mv < 0 || (!h.touch && (held.l || held.r))) { h.lad = null; hint(); } }
        else if (c.y < 12) swap(1, R + 55);
      } else {
        if (c.y <= base && c.mv >= 0) { c.y = base; if (c.mv > 0 || (!h.touch && (held.l || held.r))) { h.lad = null; hint(); } }
        else if (c.y > R + 60) swap(0, 13);
      }
    }
    if (h.tp) {
      var tp = h.tp, cy = floor - 30; tp.t += dt; h.fx = h.fx || [];
      if (!tp.sw) {
        h.x = tp.x0 + (h.L.ladder - tp.x0) * Math.min(1, tp.t / 0.12);
        h.shk = 3 * tp.t / TPO;
        for (var ti = 0; ti < Math.ceil(dt * 90); ti++) { var ta = Math.random() * 6.283, tr = 26 + Math.random() * 30; h.fx.push({ x: h.x + Math.cos(ta) * tr, y: cy + Math.sin(ta) * tr, tx: h.x, ty: cy, t: 0, life: 0.3, c: neon() }); }
        if (tp.t >= TPO) {
          tp.sw = 1; tp.t = 0; scene(h, tp.to); h.x = h.L.ladder; h.fx = []; h.flash = 1; h.shk = 7; sfxS("warpIn");
          for (var tb = 0; tb < 40; tb++) { var ba = Math.random() * 3.1416, bv = 60 + Math.random() * 160; h.dust.push({ x: h.x, y: floor - 2, vx: Math.cos(ba) * bv, vy: -Math.sin(ba) * bv, t: 0, life: 0.5 + Math.random() * 0.5, c: neon() }); }
        }
      } else if (tp.t >= TPI) { h.tp = null; h.say = { t: 0, n: 0, text: "what if i were to fall down and break???" }; hint(); }
    }
    if (h.mv) {
      var mv = h.mv, ML = mv.m; mv.t += dt;
      if (!mv.sw) {
        if (!ML.stay) h.x = mv.x0 + (h.L.ladder - mv.x0) * Math.min(1, mv.t / 0.12);
        if (mv.t >= ML.out) { mv.sw = 1; mv.t = 0; scene(h, mv.to); h.x = h.L.ladder; if (ML.swap) ML.swap(mv.s, mapi(h, mv)); }
      } else if (mv.t >= ML.in) { h.mv = null; hint(); }
      if (h.mv && ML.update) ML.update(mv.s, mapi(h, mv), dt);
    }
    if (h.land) { h.land.t += dt; if (h.land.m.update) h.land.m.update(h.land.s, mapi(h, h.land), dt); if (h.land.t >= h.land.m.dur) { h.land = null; hint(); } }
    h.shk = h.tp && !h.tp.sw ? h.shk : Math.max(0, (h.shk || 0) - dt * 14);
    h.flash = Math.max(0, (h.flash || 0) - dt * 2.5);
    if (h.say) {
      var sn = Math.min(h.say.text.length, Math.floor(h.say.t * TALK));
      for (; h.say.n < sn; h.say.n++) if (h.say.text[h.say.n] !== " ") sfxO("voice", { f: 480 + Math.random() * 420, slide: 0.55 + Math.random() * 1.4, wave: h.say.n % 3 ? "square" : "sine", vol: 0.04 });
    }
    if (h.fall) {
      var fa = h.fall;
      var MF = move(), FF = MF && MF.fall;
      fa.sw = Math.max(0, fa.sw - dt); fa.vy = Math.min(FF && FF.vmax || 420, fa.vy + 700 * dt); fa.y += fa.vy * dt;
      if (FF && FF.update) { fa.s = fa.s || {}; FF.update(fa.s, mapi(h, fa), dt); }
      h.x = Math.max(DOOR / 2, Math.min(h.L.len - DOOR / 2, h.x + fa.vx * dt));
      if (h.fl && fa.y > R + 60) { var off = h.x - h.L.ladder; scene(h, 0); h.x = h.L.ladder + off; fa.y = 13; fa.sw = SWAP; }
      else if (!h.fl && fa.y >= floor + 1) {
        h.fall = null; sfxS("hover");
        if (MF && MF.land) { h.land = { m: MF.land, t: 0, s: {} }; if (MF.land.start) MF.land.start(h.land.s, mapi(h, h.land)); }
        for (var di = 0; di < 10; di++) { var da = (di / 10) * 3.1416, dv = 30 + Math.random() * 40; h.dust.push({ x: h.x + Math.cos(da) * 6, y: floor, vx: Math.cos(da) * dv, vy: -Math.sin(da) * dv * 0.4, t: 0, life: 0.5, c: "#c8a670" }); }
      }
    }
    if (h.door) {
      h.door.t += dt;
      if (h.door.out) h.x = h.door.x0 + (h.L.hub - h.door.x0) * Math.min(1, h.door.t / 0.15);
      if (h.door.t >= DOORT) { var wasOut = h.door.out; h.door = null; if (wasOut) { h.cb.back(); return; } }
    }
    var dx = h.lad || h.fall || h.door || h.tp || h.mv || h.land ? 0 : held.r - held.l;
    if (!dx && h.goal != null) { var d = h.goal - h.x; if (Math.abs(d) < 2) { h.x = h.goal; h.goal = null; } else dx = d > 0 ? 1 : -1; }
    var lo = DOOR / 2, hi = h.L.len - DOOR / 2;
    h.run = !!dx;
    if (dx) {
      var x0 = h.x; h.x = Math.max(lo, Math.min(hi, h.x + dx * (h.run ? RUN : SPEED) * dt)); h.dir = dx > 0 ? "right" : "left"; h.walk += dt * (h.run ? 1.7 : 1);
      if (h.run && h.x !== x0) { h.puff = (h.puff || 0) - dt; if (h.puff <= 0) { h.puff = 0.09; h.dust.push({ x: h.x - dx * 8, y: floor - 1, vx: -dx * (20 + Math.random() * 20), vy: -10 - Math.random() * 14, t: 0, life: 0.4, c: "#c8a670" }); } }
      h.pdist += Math.abs(h.x - x0);
      if (h.pdist > 13) { h.pdist = 0; h.side = -(h.side || 1); h.prints.push({ x: h.x - dx * 4, y: floor + 6 + h.side * 2, a: dx > 0 ? 0 : Math.PI, t: (now - h.t0) / 1000 }); if (h.prints.length > 14) h.prints.shift(); }
    } else h.walk = 0;
    if (h.goal != null && Math.abs(h.goal - h.x) < RUN * dt) { h.x = h.goal; h.goal = null; }
    var want = Math.max(0, Math.min(h.L.len - VW, h.x - VW / 2));
    if (h.L.len < VW) want = (h.L.len - VW) / 2;
    h.cam = h.cam == null ? want : h.cam + (want - h.cam) * Math.min(1, dt * 6);
    var best = null, bd = 1e9;
    h.L.frames.forEach(function (f) { var dd = Math.abs(f.x - h.x); if (dd < f.gap * 0.55 && dd < bd) { bd = dd; best = f; } });
    if (best !== h.focus) { h.focus = best; if (best) sfxS("hover"); }
    var MW = move(), still = !dx && !h.lad && !h.fall && !h.door && !h.tp && !h.mv && !h.land;
    if (MW && MW.walk && MW.walk.update) { h.mw = h.mw || {}; MW.walk.update(h.mw, mapi(h, null), dt); }
    if (!still || !best || best.ladder || best.exit) { h.idle = 0; h.mfr = null; if (!best || best !== h.frDone) h.frDone = null; }
    else if (MW && MW.frame && best !== h.frDone && (h.idle += dt) > 0.35) { h.frDone = best; h.mfr = { m: MW.frame, t: 0, f: best, s: {} }; if (MW.frame.start) MW.frame.start(h.mfr.s, mapi(h, h.mfr)); }
    if (h.mfr) { h.mfr.t += dt; if (h.mfr.m.update) h.mfr.m.update(h.mfr.s, mapi(h, h.mfr), dt); if (h.mfr.t >= h.mfr.m.dur) h.mfr = null; }
    h.L.frames.forEach(function (f) { f.glow += ((f === best ? 1 : 0) - f.glow) * Math.min(1, dt * 8); f.pop = Math.max(0, f.pop - dt * 2.5); f.shake = Math.max(0, (f.shake || 0) - dt); });
    draw(h, (now - h.t0) / 1000, dt, dpr);
    card(h);
  }

  function card(h) {
    var c = document.getElementById("hallCard"), z = document.getElementById("hallZec");
    if (z) z.textContent = String(+save.wallet || 0);
    if (!c) return;
    var f = h.lad || h.fall || h.tp || h.mv || h.land || h.say ? null : h.focus;
    c.classList.toggle("on", !!f);
    if (!f) return;
    var t = tag(f), C = CH(), hid = !!(f.it && f.it.rule.found && C.status(f.it.id, save).state !== "owned");
    var nm = t.name || (f.badge ? f.badge.name : f.good ? String(f.good.name).toUpperCase() : hid ? "??? HIDDEN BITFOOT" : (f.it.id === CH().DEFAULT ? "BITFOOT #" + CH().MAIN.slice(5) : String(f.it.name).toUpperCase()));
    var n = document.getElementById("hallName"), l = document.getElementById("hallLine");
    if (n.textContent !== nm) n.textContent = nm;
    if (l.textContent !== t.line) l.textContent = t.line;
    c.className = "hall-card on k-" + t.kind;
    var v = h.view, W = h.cv.clientWidth, half = c.offsetWidth / 2 + 8;
    var cx = Math.max(half, Math.min(W - half, (f.x - h.cam) * v.s)), cy = (h.L.tree ? v.floor - 61 - 62 : v.fy + FH + 22) * v.s;
    c.style.left = Math.round(cx) + "px"; c.style.top = Math.round(cy) + "px";
  }

  function draw(h, t, dt, dpr) {
    var g = h.g, v = h.view, s = v.s, cam = Math.round(h.cam * s) / s;
    var kx = h.shk ? Math.round((Math.random() * 2 - 1) * h.shk) : 0, ky = h.shk ? Math.round((Math.random() * 2 - 1) * h.shk) : 0;
    g.setTransform(dpr * s, 0, 0, dpr * s, (kx - cam) * dpr * s, ky * dpr * s);
    g.imageSmoothingEnabled = false;
    var x0 = cam - 2, x1 = cam + v.VW + 2, R = v.R, F = v.floor;
    var px = function (x, y, w, hh, c) { g.fillStyle = c; g.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(hh)); };
    if (h.L.tree) treeScene(g, h, v, t, s, dpr, cam, px, x0, x1);
    else gallery(g, h, v, t, s, dpr, cam, px, x0, x1);
    var K = BH.cosmetics, devil = CH().worn(save) === "char-005";
    if (devil) h.prints.forEach(function (p) {
      var age = t - p.t; if (age > 6) return;
      var x = Math.round(p.x), y = Math.round(p.y);
      g.save(); g.globalAlpha = Math.max(0, 1 - age / 6);
      px(x - 3, y - 2, 6, 4, "#1e1008"); px(x - 2, y - 3, 4, 6, "#2a160a");
      if (age < 0.9) { if (Math.random() < 0.7) px(x - 1, y - 1, 1, 1, "#ffd06a"); if (Math.random() < 0.7) px(x + 1, y, 1, 1, "#ff7a2a"); }
      if (age < 1.6) { var up = age * 10; g.globalAlpha *= 0.5; px(x + Math.round(Math.sin(t * 7 + p.x) * 1.5), y - 4 - up, 2, 2, "#8a8a8a"); }
      g.restore();
    });
    else if (K && K.drawPrint) h.prints.forEach(function (p) {
      var age = t - p.t; if (age > 6) return;
      g.save(); g.globalAlpha = Math.max(0, 1 - age / 6) * 0.8;
      try { K.drawPrint(g, p.x, p.y, p.a, wornCos("print"), age, { scale: 0.8 }); } catch (e) {}
      g.restore();
    });
    var pxl = Math.round(h.x), fy = F + 1;
    var o = { dir: h.dir, state: h.walk > 0 ? "walk" : "idle", t: h.walk > 0 ? h.walk : t, scale: 1, alpha: 1 }, who = CH().worn(save) || (CH().main ? CH().main(save.cos) : null), drawn = false;
    var dA = 1;
    if (h.door) {
      var dp = Math.min(1, h.door.t / DOORT), q = h.door.out ? dp : 1 - dp;
      fy = Math.round(F + 1 - q * 6); o.state = "walk"; o.dir = h.door.out ? "up" : "down"; o.t = h.door.t; dA = Math.min(1, (1 - q) * 1.6);
    }
    var MD = move(), A = MD ? mapi(h, h.mv || h.land || h.mfr || h.fall || null) : null;
    if (MD && MD.walk && MD.walk.under) { g.save(); try { MD.walk.under(g, h.mw || {}, A); } catch (e) {} g.restore(); }
    g.save(); o.alpha = dA;
    var own = h.mv ? h.mv : h.land ? h.land : h.fall && MD && MD.fall && MD.fall.draw ? { m: MD.fall, s: h.fall.s || (h.fall.s = {}) } : h.mfr && h.mfr.m.draw ? h.mfr : null;
    if (own) { try { drawn = own.m.draw(g, own.s, A); } catch (e) {} if (!drawn && own === h.mfr) { if (who) try { drawn = CH().draw(g, pxl, fy, o, who); } catch (e) {} } else drawn = true; }
    else if (h.lad) {
      var cl = h.lad, ck = cl.mv ? Math.floor(cl.d / 5) % 4 : 4, hx2 = Math.round(h.L.ladder);
      fy = Math.round(cl.y);
      g.beginPath();
      if (h.fl) { g.rect(x0, 0, x1 - x0, F); g.rect(hx2 - 16, F, 32, R - F + 2); } else { g.rect(x0, 12, x1 - x0, R); g.rect(hx2 - 15, 0, 30, 12); }
      g.clip();
      try { drawn = CH().drawClimb(g, pxl, fy, ck, who || "char-001", { scale: 1, t: t, look: who ? null : { fur: wornCos("fur"), hat: wornCos("hat") } }); } catch (e) {}
    } else if (h.fall) {
      fy = Math.round(h.fall.y); o.state = "idle"; o.t = 0;
      if (h.fl) { g.beginPath(); g.rect(x0, 0, x1 - x0, F); g.rect(Math.round(h.L.ladder) - 16, F, 32, R - F + 2); g.clip(); }
      if (who) try { drawn = CH().draw(g, pxl, fy, o, who); } catch (e) {}
    } else if (h.tp) {
      drawn = warp(g, h, pxl, fy, o, who, F, t);
    } else {
      if (Math.abs(fy - F - 1) < 3) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(pxl - 12, F + 1, 24, 3); g.fillRect(pxl - 9, F + 4, 18, 1); }
      var wb = null; if (MD && MD.walk && MD.walk.body) try { wb = MD.walk.body(h.mw || {}, A); } catch (e) { wb = null; }
      if (wb) { g.translate(pxl + (wb.dx || 0), fy + (wb.dy || 0)); if (wb.rot) g.rotate(wb.rot); g.scale(wb.sx || 1, wb.sy || 1); g.translate(-pxl, -fy);
        if (wb.dir) o.dir = wb.dir; if (wb.t != null) o.t = wb.t; if (wb.alpha != null) o.alpha = wb.alpha * dA; }
      if (who) try { drawn = CH().draw(g, pxl, fy, o, who); } catch (e) {}
    }
    if (!drawn) try { var S = window.BitfootSprite; if (K && K.draw) K.draw(g, pxl, fy, o); else if (S) S.draw(g, pxl, fy, o); } catch (e) {}
    g.restore();
    if (h.fx && h.fx.length) {
      h.fx = h.fx.filter(function (p) { p.t += dt; return p.t < p.life; });
      h.fx.forEach(function (p) { var q = p.t / p.life, ex = p.x + (p.tx - p.x) * q * q, ey = p.y + (p.ty - p.y) * q * q; g.globalAlpha = 0.5 + q * 0.5; px(ex - 1, ey - 1, 2, 2, p.c); });
      g.globalAlpha = 1;
    }
    if (h.cele) { h.cele.t += dt; try { if (!K.celebrate(g, pxl, F + 1, h.cele.t, h.cele.id, { unit: 1, stars: 3 })) h.cele = null; } catch (e) { h.cele = null; } }
    h.bits = h.bits.filter(function (b) { b.t += dt; b.vy += 200 * dt; b.x += b.vx * dt; b.y += b.vy * dt; return b.t < 1.2; });
    h.bits.forEach(function (b) { px(b.x - 1, b.y - 1, 3, 3, "#9a7424"); px(b.x - 1, b.y - 1, 2, 2, "#f0c14e"); });
    h.dust = h.dust.filter(function (d) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 20 * dt; d.vx *= 1 - dt * 3; return d.t < d.life; });
    h.dust.forEach(function (d) { var a = 1 - d.t / d.life, sz = 2 + Math.round((d.t / d.life) * 2); g.globalAlpha = a * 0.7; px(d.x - sz / 2, d.y - sz / 2, sz, sz, d.c); });
    g.globalAlpha = 1;
    if (h.mfx && h.mfx.length) {
      h.mfx = h.mfx.filter(function (p) { p.t += dt; p.vy += (p.g || 0) * dt; p.vx *= 1 - (p.drag || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.t < p.life; });
      h.mfx.forEach(function (p) {
        var q = p.t / p.life, sz = p.sz2 != null ? p.sz + (p.sz2 - p.sz) * q : p.sz || 2;
        g.globalAlpha = (p.a != null ? p.a : 1) * (p.fade === false ? 1 : 1 - q); if (p.add) g.globalCompositeOperation = "lighter";
        px(p.x - sz / 2, p.y - sz / 2, sz, sz, p.c); g.globalCompositeOperation = "source-over";
      });
      g.globalAlpha = 1;
    }
    if (A) { var ov = own && own.m.over ? own : h.mfr && h.mfr.m.over ? h.mfr : null; if (ov) { g.save(); try { ov.m.over(g, ov.s, A); } catch (e) {} g.restore(); }
      if (MD.walk && MD.walk.over) { g.save(); try { MD.walk.over(g, h.mw || {}, A); } catch (e) {} g.restore(); } }
    if (h.mfl > 0) { h.mfl = Math.max(0, h.mfl - dt * 3); g.globalAlpha = Math.min(1, h.mfl); g.fillStyle = h.mflc || "#ffffff"; g.fillRect(x0, 0, x1 - x0, R); g.globalAlpha = 1; }
    var blink = h.lad ? h.lad.sw : h.fall ? h.fall.sw : 0;
    if (blink > 0) { g.fillStyle = "rgba(6,4,2," + (blink / SWAP).toFixed(3) + ")"; g.fillRect(x0, 0, x1 - x0, R); }
    var tear = h.flash > 0 ? h.flash : h.tp && !h.tp.sw ? Math.max(0, (h.tp.t / TPO - 0.6) / 0.4) : 0;
    if (tear > 0) {
      var cv = h.cv, CW = cv.width, CHh = cv.height;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      for (var gi = 0; gi < Math.round(3 + tear * 9); gi++) {
        var gy = Math.floor(Math.random() * CHh), gh = Math.ceil((2 + Math.random() * 14) * dpr), gx = Math.round((Math.random() * 2 - 1) * 40 * tear * dpr);
        try { g.drawImage(cv, 0, gy, CW, gh, gx, gy, CW, gh); } catch (e) {}
        g.globalAlpha = 0.25 * tear; g.fillStyle = neon(); g.fillRect(0, gy, CW, gh); g.globalAlpha = 1;
      }
      if (h.flash > 0) { g.globalAlpha = Math.min(1, h.flash * 1.2); g.fillStyle = "#e8ffe0"; g.fillRect(0, 0, CW, CHh); g.globalAlpha = 1; }
      g.restore();
    }
    if (h.say) { h.say.t += dt; if (h.say.t > h.say.text.length / TALK + SAY) h.say = null; else say(g, h.say, pxl, fy - 66, s, dpr, cam, px, x0, x1); }
  }

  function warp(g, h, x, y, o, who, F, t) {
    var tp = h.tp, out = !tp.sw, p = Math.min(1, tp.t / (out ? TPO : TPI)), late = out ? Math.max(0, (p - 0.65) / 0.35) : 0;
    var sx = 1, sy = 1, lift = 0, bw;
    if (out) { lift = p * p * 12; sx = 1 - 0.92 * late; sy = 1 + 2.2 * late; bw = 3 + p * 16; }
    else { var q = p; sy = q < 0.35 ? 3 - 2.4 * (q / 0.35) : q < 0.7 ? 0.6 + 0.55 * ((q - 0.35) / 0.35) : 1.15 - 0.15 * ((q - 0.7) / 0.3); sx = 1 / Math.max(0.5, sy); bw = 22 * (1 - q); }
    var jx = out ? Math.round((Math.random() * 2 - 1) * p * 2) : 0, cy = y - lift;
    g.save(); g.globalCompositeOperation = "lighter";
    if (bw > 0.5) {
      g.globalAlpha = out ? 0.2 + p * 0.5 : 0.8 * (1 - p); g.fillStyle = "#7dff6a"; g.fillRect(x - bw / 2, 0, bw, F + 1);
      g.globalAlpha = Math.min(1, g.globalAlpha + 0.2); g.fillStyle = "#ffffff"; g.fillRect(x - Math.max(1, bw / 6), 0, Math.max(2, bw / 3), F + 1);
    }
    if (!out) for (var r = 0; r < 2; r++) { var rr = 8 + p * (90 - r * 30); g.globalAlpha = (1 - p) * (r ? 0.5 : 0.9); g.strokeStyle = r ? "#ff4dff" : "#5ef2ff"; g.lineWidth = 2; g.beginPath(); g.ellipse(x, F + 1, rr, rr * 0.18, 0, 0, 6.283); g.stroke(); }
    g.restore();
    var ok = false;
    if (!who) return false;
    var split = out ? 1 + p * 5 : 4 * (1 - p);
    [[-split, "lighter", 0.55], [split, "lighter", 0.55], [0, "source-over", 1]].forEach(function (c) {
      var oc = {}; for (var k in o) oc[k] = o[k];
      oc.alpha = c[2] * (out ? 1 - late * 0.6 : Math.min(1, p * 3));
      g.save(); g.globalCompositeOperation = c[1];
      g.translate(x + jx + c[0], cy); g.scale(sx, sy);
      try { ok = CH().draw(g, 0, 0, oc, who) || ok; } catch (e) {}
      g.restore();
    });
    return ok;
  }

  function gallery(g, h, v, t, s, dpr, cam, px, x0, x1) {
    var R = v.R, F = v.floor;
    px(x0, 0, x1 - x0, F, "#20160d");
    for (var bx = Math.floor(x0 / 16) * 16; bx < x1; bx += 16) {
      var k = ((bx / 16) | 0) & 3;
      px(bx, 0, 16, F, ["#2a1d11", "#261a0f", "#2d1f12", "#241910"][k]);
      px(bx, 0, 1, F, "#170f08");
      for (var ky = 20 + ((bx * 7) % 37); ky < F - 30; ky += 53) { px(bx + 6, ky, 3, 2, "#1a1209"); }
    }
    px(x0, F - 24, x1 - x0, 24, "#3a2614"); px(x0, F - 24, x1 - x0, 2, "#5a3b1e"); px(x0, F - 2, x1 - x0, 2, "#1a1209");
    for (var wx = Math.floor(x0 / 32) * 32; wx < x1; wx += 32) px(wx, F - 22, 1, 20, "#24170c");
    px(x0, 0, x1 - x0, 12, "#3f2815"); px(x0, 10, x1 - x0, 2, "#1f130a"); px(x0, 0, x1 - x0, 2, "#5a3b1e");
    px(x0, F, x1 - x0, R - F, "#4a3018");
    for (var fx = Math.floor(x0 / 24) * 24; fx < x1; fx += 24) px(fx + (((fx / 24) | 0) % 2) * 12, F, 1, R - F, "#3a2410");
    for (var ry = F + 8; ry < R; ry += 9) px(x0, ry, x1 - x0, 1, "#3e2713");
    px(x0, F, x1 - x0, 2, "#6a4522");
    [h.L.hub - 14].forEach(function (dx0, i) {
      for (var sy = 0; sy < 74; sy += 2) px(dx0, F - 74 + sy, 28, 2, sy < 40 ? (sy < 20 ? "#0c1620" : "#0f1d22") : "#10221a");
      px(dx0 + 19, F - 66, 3, 3, "#e9e2c4"); px(dx0 + 20, F - 67, 1, 1, "#e9e2c4");
      [[5, 30, "#16301f"], [15, 40, "#1b3a24"], [24, 26, "#14291b"]].forEach(function (pn) {
        var cx = dx0 + pn[0], top = F - 20 - pn[1];
        for (var r = 0; r < pn[1]; r += 2) { var hw = 1 + Math.floor(r * 0.28); px(cx - hw, top + r, hw * 2, 2, pn[2]); }
        px(cx - 1, F - 20, 2, 6, "#2a1c10");
      });
      px(dx0, F - 14, 28, 14, "#1c3320"); px(dx0, F - 14, 28, 1, "#2a4a2c");
      px(dx0 - 3, F - 77, 34, 3, "#5a3b1e"); px(dx0 - 3, F - 77, 3, 77, "#5a3b1e"); px(dx0 + 28, F - 77, 3, 77, "#5a3b1e"); px(dx0 - 3, F - 77, 34, 1, "#7a5230");
    });
    g.globalCompositeOperation = "lighter";
    h.L.frames.forEach(function (f, i) { if (f.ladder) return;
      var lx = f.x - f.gap / 2; if (lx < x0 - 60 || lx > x1 + 60) return;
      var fl = 0.16 + 0.03 * Math.sin(t * 5 + i * 1.7) + 0.02 * Math.sin(t * 13 + i);
      var gr = g.createRadialGradient(lx, 30, 2, lx, 30, 70);
      gr.addColorStop(0, "rgba(255,190,90," + fl + ")"); gr.addColorStop(1, "rgba(255,190,90,0)");
      g.fillStyle = gr; g.fillRect(lx - 70, 0, 140, F);
    });
    g.globalCompositeOperation = "source-over";
    h.L.frames.forEach(function (f, i) { if (f.ladder) return;
      var lx = f.x - f.gap / 2; if (lx < x0 - 10 || lx > x1 + 10) return;
      px(lx, 12, 1, 12, "#1a1209"); px(lx - 3, 24, 7, 2, "#2a1c10"); px(lx - 2, 26, 5, 7, "#eaba49"); px(lx - 1, 27, 3, 5, "#fff0c0"); px(lx - 3, 33, 7, 2, "#2a1c10");
    });
    h.L.signs.forEach(function (sg) {
      if (sg.x < x0 - 60 || sg.x > x1 + 60) return;
      if (sg.build) return buildSign(sg, v, F, s, dpr, cam, px, g);
      var w = 66, y = Math.max(18, v.fy + 6);
      px(sg.x - 20, 12, 1, y - 12, "#1a1209"); px(sg.x + 20, 12, 1, y - 12, "#1a1209");
      px(sg.x - w / 2, y, w, 30, "#6e4724"); px(sg.x - w / 2, y, w, 2, "#9a6a3a"); px(sg.x - w / 2, y + 28, w, 2, "#3f2815");
      px(sg.x - w / 2, y, 2, 30, "#3f2815"); px(sg.x + w / 2 - 2, y, 2, 30, "#3f2815");
      text(g, sg.text, sg.x, y + 15, 7, "#fff3c4", 600, w - 8, s, dpr, cam);
      px(sg.x - 2, F - 26, 4, 26, "#3f2815");
    });
    if (h.L.hub > x0 - 80 && h.L.hub < x1 + 80) hub(g, h, v, s, dpr, cam, px);
    h.L.frames.forEach(function (f) { if (f.x > x0 - FW && f.x < x1 + FW) frame(g, f, v, t, s, dpr, cam, px); });
    h.motes.forEach(function (m) {
      if (m.x < x0 || m.x > x1) return;
      var y = (m.y * F + t * m.v) % F, a = 0.12 + 0.1 * Math.sin(t * 1.3 + m.p);
      px(m.x + Math.sin(t * 0.7 + m.p) * 3, y, 1, 1, "rgba(255,230,170," + a.toFixed(3) + ")");
    });
  }

  function buildSign(sg, v, F, s, dpr, cam, px, g) {
    var w = 80, y = Math.max(18, v.fy + 6), l = sg.x - w / 2;
    px(sg.x - 26, 12, 1, y - 12, "#1a1209"); px(sg.x + 26, 12, 1, y - 12, "#1a1209");
    px(l, y, w, 34, "#1a1209");
    for (var i = 0; i < w - 4; i += 8) px(l + 2 + i, y + 2, 4, 4, "#eaba49");
    for (var j = 0; j < w - 4; j += 8) px(l + 6 + j, y + 28, 4, 4, "#eaba49");
    px(l + 2, y + 7, w - 4, 20, "#eaba49");
    text(g, "UNDER", sg.x, y + 12, 7, "#1a1209", 700, w - 10, s, dpr, cam);
    text(g, "CONSTRUCTION", sg.x, y + 21, 7, "#1a1209", 700, w - 10, s, dpr, cam);
    var by = F - 22;
    px(sg.x - 26, by + 6, 3, 16, "#5a3b1e"); px(sg.x + 23, by + 6, 3, 16, "#5a3b1e");
    px(sg.x - 30, by, 60, 8, "#1a1209");
    for (var k = 0; k < 56; k += 8) px(sg.x - 28 + k, by + 1, 4, 6, "#eaba49");
  }

  function frame(g, f, v, t, s, dpr, cam, px) {
    if (f.exit) return;
    if (f.ladder) { ladder(g, f, v, t, s, dpr, cam, px); return; }
    if (f.badge) { medal(g, f, v, t, s, dpr, cam, px); return; }
    var C = CH(), st = C.status(f.it.id, save), tg = tag(f), lit = f.glow, owned = st.state === "owned";
    var hid = f.it.rule.found && !owned, dark = st.state === "locked";
    var sh = f.shake ? Math.round(Math.sin(f.shake * 60) * 2) : 0;
    var x = Math.round(f.x - FW / 2) + sh, y = Math.round(v.fy - lit * 3 - f.pop * 2), w = FW, hh = FH;
    g.strokeStyle = "#140d07"; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 10, y + 2); g.lineTo(f.x + sh, y - 14); g.lineTo(x + w - 10, y + 2); g.stroke();
    px(f.x - 1 + sh, y - 16, 3, 3, "#8a8070");
    if (lit > 0.02) {
      g.globalCompositeOperation = "lighter";
      var gr = g.createRadialGradient(f.x, y + hh / 2, 10, f.x, y + hh / 2, 80);
      gr.addColorStop(0, "rgba(255,210,120," + (0.22 * lit).toFixed(3) + ")"); gr.addColorStop(1, "rgba(255,210,120,0)");
      g.fillStyle = gr; g.fillRect(f.x - 80, y - 40, 160, hh + 80);
      g.globalCompositeOperation = "source-over";
    }
    px(x + 3, y + 4, w, hh, "rgba(0,0,0,0.45)");
    var gold = dark ? ["#4a3220", "#6e4a2a", "#2a1c10"] : ["#9a7424", "#eaba49", "#5a4214"];
    px(x, y, w, hh, gold[0]); px(x, y, w, 2, gold[1]); px(x, y, 2, hh, gold[1]); px(x, y + hh - 2, w, 2, gold[2]); px(x + w - 2, y, 2, hh, gold[2]);
    px(x + 5, y + 5, w - 10, hh - 10, gold[2]);
    var ix = x + 7, iy = y + 7, iw = w - 14, ih = hh - 14;
    px(ix, iy, iw, ih, hid ? "#161b16" : f.bg);
    px(ix, iy, iw, 3, "rgba(0,0,0,0.18)"); px(ix, iy + ih - 6, iw, 6, "rgba(0,0,0,0.22)");
    for (var q = 0; q < 6; q++) px(ix + ((q * 13 + f.x) % iw), iy + 6 + ((q * 17) % (ih - 16)), 1, 1, "rgba(255,255,255,0.08)");
    var art = artOf(f.it) ? cut(artOf(f.it)) : null, bx, by;
    g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip();
    if (art) {
      var sc = 2, aw = art.naturalWidth * sc, ah = art.naturalHeight * sc;
      bx = Math.round(f.x - aw / 2) + sh; by = iy + ih - ah;
      if (hid) silhouette(g, art, bx, by, aw, ah);
      else { g.drawImage(art, bx, by, aw, ah); if (dark) px(ix, iy, iw, ih, "rgba(8,6,4,0.62)"); }
    } else {
      var o = { dir: "down", state: "idle", t: t, scale: 1, alpha: 1 };
      try { var K = BH.cosmetics; if (K && K.draw) K.draw(g, f.x + sh, iy + ih - 2, o); else window.BitfootSprite.draw(g, f.x + sh, iy + ih - 2, o); } catch (e) {}
    }
    g.restore();
    if (hid) text(g, "?", f.x + sh, iy + ih / 2 - 4, 20, "#eaba49", 600, iw, s, dpr, cam);
    if (dark && !hid) lock(px, f.x + sh, iy + ih / 2 - 6);
    if (lit > 0.02) { g.strokeStyle = "rgba(255,226,150," + (0.85 * lit).toFixed(3) + ")"; g.lineWidth = 1; g.strokeRect(x - 1.5, y - 1.5, w + 3, hh + 3); }
    var py = y + hh + 5, pw = 50, pl = f.x - pw / 2 + sh;
    var wood = tg.kind === "on" ? ["#eaba49", "#fff0c0", "#9a7424", "#1f130a"] : tg.kind === "poor" ? ["#4a2a1c", "#6e3a26", "#2a160e", "#e3a08a"]
      : dark ? ["#3a2716", "#4e3520", "#1f130a", "#b49a7a"] : ["#6e4724", "#9a6a3a", "#3f2815", "#fff3c4"];
    px(pl, py, pw, 13, wood[0]); px(pl, py, pw, 1, wood[1]); px(pl, py + 12, pw, 1, wood[2]);
    px(pl + 2, py + 6, 1, 1, wood[2]); px(pl + pw - 3, py + 6, 1, 1, wood[2]);
    var label = tg.plaque, tx = f.x + sh;
    if (tg.coin) { tx += 4; px(tx - textW(g, label, 7, s) / 2 - 8, py + 3, 6, 7, "#9a7424"); px(tx - textW(g, label, 7, s) / 2 - 7, py + 4, 4, 5, "#f0c14e"); }
    text(g, label, tx, py + 7, 7, wood[3], 600, pw - 6, s, dpr, cam);
  }
  function disc(px, cx, cy, r, c) { for (var dy = -r; dy <= r; dy++) { var w = Math.floor(Math.sqrt(r * r - dy * dy)); px(cx - w, cy + dy, w * 2 + 1, 1, c); } }
  function medal(g, f, v, t, s, dpr, cam, px) {
    var b = badgeRow(f), on = b.earned, lit = f.glow, tg = tag(f);
    var cx = Math.round(f.x), top = Math.round(v.fy + 4 - lit * 3 - f.pop * 2), cy = top + 46;
    if (lit > 0.02) {
      g.globalCompositeOperation = "lighter";
      var gr = g.createRadialGradient(cx, cy, 6, cx, cy, 60);
      gr.addColorStop(0, "rgba(255,210,120," + (0.22 * lit).toFixed(3) + ")"); gr.addColorStop(1, "rgba(255,210,120,0)");
      g.fillStyle = gr; g.fillRect(cx - 60, cy - 60, 120, 120);
      g.globalCompositeOperation = "source-over";
    }
    px(cx - 3, 12, 7, 2, "#5a4214"); px(cx - 2, 12, 5, 1, "#9a7424");
    for (var ch = 14; ch < top - 11; ch += 3) { px(cx, ch, 1, 2, "#9a7424"); px(cx, ch + 2, 1, 1, "#5a4214"); }
    var cl = on ? ["#9a7424", "#eaba49", "#5a4214"] : ["#4e4434", "#6a5e4a", "#1f1a14"];
    var rib = on ? ["#8a2a1c", "#1f5a7a"] : ["#3a2420", "#22303a"];
    for (var y = 0; y < 36; y++) { var o = Math.floor(y * 0.22); px(cx - 9 + o, top - 8 + y, 7, 1, rib[0]); px(cx + 3 - o, top - 8 + y, 7, 1, rib[1]); }
    px(cx - 11, top - 11, 23, 4, cl[0]); px(cx - 11, top - 11, 23, 1, cl[1]); px(cx - 11, top - 8, 23, 1, cl[2]);
    px(cx - 2, top - 13, 5, 2, cl[0]); px(cx - 1, top - 13, 3, 1, cl[1]);
    disc(px, cx + 2, cy + 2, 24, "rgba(0,0,0,0.4)");
    var m = on ? ["#5a4214", "#9a7424", "#eaba49", "#fff0c0"] : ["#1f1a14", "#3a3226", "#4e4434", "#6a5e4a"];
    disc(px, cx, cy, 24, m[0]); disc(px, cx, cy, 23, m[1]); disc(px, cx, cy, 20, m[2]); disc(px, cx, cy, 17, m[1]);
    px(cx - 12, cy - 18, 7, 2, m[3]);
    emblem(px, f.badge.id, cx, cy, m, on);
    if (lit > 0.02) { g.strokeStyle = "rgba(255,226,150," + (0.85 * lit).toFixed(3) + ")"; g.lineWidth = 1; g.beginPath(); g.arc(cx + 0.5, cy + 0.5, 26, 0, 6.283); g.stroke(); }
    var pw = 54, py = cy + 39, pl = cx - pw / 2;
    var wood = on ? ["#eaba49", "#fff0c0", "#9a7424", "#1f130a"] : ["#3a2716", "#4e3520", "#1f130a", "#b49a7a"];
    px(pl, py, pw, 13, wood[0]); px(pl, py, pw, 1, wood[1]); px(pl, py + 12, pw, 1, wood[2]);
    text(g, f.badge.name, cx, cy + 31, 6, on ? "#fff3c4" : "#9a8a70", 600, f.gap - 6, s, dpr, cam);
    text(g, tg.plaque, cx, py + 7, 7, wood[3], 600, pw - 6, s, dpr, cam);
  }
  var BPAL = {"w": "#fff3c4", "y": "#eaba49", "o": "#9a6a1c", "n": "#7a4a22", "d": "#2a1c10", "b": "#2f78b8", "B": "#1f4f86", "c": "#9fdcff", "r": "#d23c2c", "R": "#8a2418", "g": "#4f9a3a", "l": "#9ad46a", "e": "#24402a", "s": "#c9d0d6", "a": "#6c7680", "q": "#c8743a"};
  var ART = {
    "first-escape": ["..............", ".....nnnn.....", "...nnnnnnnn...", "..nnwnnnnnnn..", ".nnwnnnnnnnnn.", ".nnnnddddnnnn.", "nnnnddddddnnnn", "nnnddddddddnnn", "nnnddddddddnnn", "nnnddddddddnnn", "gggggggggggggg", ".gggggggggggg.", "...w....w.....", ".....w....w..."],
    "sweep": ["..........w...", ".........www..", "..........w...", ".....yyy......", "....ywwyy.....", "....yyyyo.....", ".....ooo......", "..yyy...yyy...", ".ywwyy.ywwyy..", ".yyyyo.yyyyo..", "..ooo.yyyoo...", ".....ywwyy....", ".....yyyyo....", "......ooo....."],
    "ghost": ["..............", ".....wwww.....", "...wwwwwwww...", "..wwwwwwwwws..", "..wwddwwddws..", "..wwddwwddws..", "..wwwwwwwwws..", "..wwwwddwwws..", "..wwwwwwwwws..", "..wwwwwwwwws..", "..wwwwwwwwws..", "..ww.wwww.ws..", "..w...ww...s..", ".............."],
    "triple": ["..............", "......y.......", ".....ywy......", "....yyyyy.....", ".....yyy......", ".....y.y......", "..............", "...s......q...", "..sws....qwq..", ".sssss..qqqqq.", "..sss....qqq..", "..s.s....q.q..", "..............", ".............."],
    "quick": ["..............", ".....dddd.....", "......dd......", "....ssssss....", "...swwwwwws...", "y.swwwwdwwws..", "..swwwwdwwws..", "y.swwwwdwwws..", "..swwwwwrrws..", "..swwwwwwwws..", "...swwwwwws...", "....ssssss....", "..............", ".............."],
    "tracker": ["..............", "...aaaa.......", "..awccca......", ".awcdcdca.....", ".acdcccda.....", ".accdddca.....", ".accdddca.....", "..acccca......", "...aaaan......", "........nn....", ".........nn...", "..........nn..", "...........nd.", ".............."],
    "sweeper": ["............nn", "...........nn.", "..........nn..", ".........nn...", "........nn....", ".......nn.....", "......nn......", "....dddd......", "...yyoyyo.....", "..yyoyyoyy....", ".yyoyyoyyoy...", ".oyyoyyoyyo...", "...........yy.", "...w..w...ywwo"],
    "shadow": ["..............", "..www.........", ".ww...........", ".ww...........", ".www..........", "..wwww........", "..............", "....eeeeee....", "..eeeeeeeeee..", ".eeeyeeeeyeee.", ".eeeeeeeeeeee.", "..eeeeeeeeee..", "...dddddddd...", ".............."],
    "matcher": ["..............", "..............", "..wwww..wwww..", ".wwwwwnnwwwww.", ".wdddwnnwdddw.", ".wwwwwnnwwwww.", ".wdddwnnwdddw.", ".wwwwwnnwwwww.", ".wddwwnnwddww.", ".wwwwwnnwwwww.", "nnnnnnnnnnnnnn", ".nnnnnnnnnnnn.", "..............", ".............."],
    "halfway": ["..............", "....drr.......", "....drrrr.....", "....drrrrr....", "....drrr......", "....d.........", "....d.........", "....d.........", "..ggdgg.......", ".gggggggg.....", "gggggggggwwggg", ".gggggggggggg.", "..............", ".............."],
    "never-caught": ["..............", "..ddddddd.....", "..d.d.d.d.....", "..d.d.d.d.d...", "..d.d.d.d..d..", "..d.d.d.d...d.", "..d.d.d.d.....", "..ddddddd.....", "..............", "..........ww..", "............ww", "........ww....", "..........ww..", ".............."],
    "shielded": ["..............", "......yy......", ".....ywwy.....", ".....yyyo.....", "......oo......", "......w.......", "....c...c.....", ".bbbbbbbbbbbb.", "bbccbbbbccbbbb", "BBBBBBBBBBBBBB", ".BBBccBBBBccB.", "..BBBBBBBBBB..", "..............", ".............."],
    "glass-key": ["..............", "..............", "...........w..", "..............", "..ccc.........", ".cw.cc........", ".c...cccccccc.", ".cc.cc...c.c..", "..ccc....c.c..", "..............", "..............", "..............", "..............", ".............."],
    "memo-writer": ["..............", "..............", "..............", ".ssssssssssss.", ".wswwwwwwwwsw.", ".wwswwwwwwsww.", ".wwwswwwwswww.", ".wwwwsrrswwww.", ".wwwwwrrwwwww.", ".wwwwwwwwwwww.", ".ssssssssssss.", "..............", "..............", ".............."],
    "no-double-spending": ["..............", "....nnnnnn....", "....dddddd....", "...cwcccccc...", "..cwcccccccc..", "..cwccyyyccc..", "..cwccydyccc..", "..cwccyyyccc..", "..cwcccccccc..", "..cccccccccc..", "...cccccccc...", "..............", "..............", ".............."],
    "u1": ["..............", "..............", "..............", ".wwwwwwwwwwww.", ".wwwwwwwwwwww.", ".wwdwwdwwddww.", ".wwdwwdwwwdww.", ".wwdwwdwwwdww.", ".wwwddwwwdddw.", ".wwwwwwwwwwww.", ".ssssssssssss.", "..............", "..............", ".............."],
    "berry-buyer": ["..............", "......gg......", "......glg.....", "......g.......", "....rr..rr....", "...rwrr.rwrr..", "...rrRr.rrRr..", "....RR...RR...", ".....rwrr.....", ".....rrRr.....", "......RR......", "..............", "..............", ".............."],
    "broke": [".........w.w..", "..........w...", "....d....d....", "....dddddd....", "...nnnnnnnn...", "..nnnnnnnnnn..", "..nnnnnnnnnn..", "..nnnnddnnnn..", "..nnnnnnnnnn..", "...nnnnnnnn...", "..............", "..............", "..............", ".............."],
    "caught-red-pawed": ["..............", "..............", "....rr..rr....", "....rr..rr....", ".rr........rr.", ".rr........rr.", ".....rrrr.....", "....rrrrrr....", "...rrrrrrrr...", "...rrrrrrRR...", "....rrrrRR....", "..............", "..............", ".............."],
    "loud-walker": ["..............", "......dd......", "...dd.dd......", ".d.dd.dd......", "...........w..", ".ddddddd....w.", ".ddddddd.w..w.", ".ddddddd..w.w.", ".ddddddd..w.w.", ".dddd....w..w.", ".dddd.......w.", ".dddd......w..", "..............", ".............."]
  };
  function lumOf(hex) { var v = parseInt(hex.slice(1), 16); return (0.299 * (v >> 16) + 0.587 * (v >> 8 & 255) + 0.114 * (v & 255)) / 255; }
  function emblem(px, id, cx, cy, m, on) {
    var rows = ART[id]; if (!rows) return;
    var ox = cx - 14, oy = cy - 14;
    [1, 0].forEach(function (pass) {
      rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r[x]; if (ch === ".") continue;
        var L = lumOf(BPAL[ch]), col = pass ? m[0] : on ? BPAL[ch] : L > 0.88 ? m[3] : L > 0.3 ? m[2] : m[0];
        px(ox + x * 2 + pass, oy + y * 2 + pass, 2, 2, col); } });
    });
  }
  function hub(g, h, v, s, dpr, cam, px) {
    if (h.L.badges) return;
    var cx = Math.round(h.L.hub) - 52, F = v.floor, y = Math.max(20, v.fy + 20);
    px(cx - 3, y, 6, F - y, "#5a3b1e"); px(cx - 3, y, 2, F - y, "#7a5230"); px(cx - 5, F - 4, 10, 4, "#3f2815");
    [[-1, y + 8, "FOR SALE"], [1, y + 34, "SELECT CHARACTER"]].forEach(function (a) {
      var d = a[0], w = d > 0 ? 84 : 70, x = d < 0 ? cx - w + 6 : cx - 6, yy = a[1];
      px(x, yy, w, 20, "#6e4724"); px(x, yy, w, 2, "#9a6a3a"); px(x, yy + 18, w, 2, "#3f2815");
      for (var k = 0; k < 10; k++) px(d < 0 ? x - 1 - k : x + w + k, yy + k, 1, 20 - 2 * k, "#6e4724");
      px(cx - 1, yy + 8, 2, 4, "#2a1c10");
      text(g, (d < 0 ? "◀ " : "") + a[2] + (d > 0 ? " ▶" : ""), x + w / 2 + (d < 0 ? -2 : 2), yy + 10, 8, "#fff3c4", 600, w - 6, s, dpr, cam);
    });
  }
  function ladder(g, f, v, t, s, dpr, cam, px) {
    var x = Math.round(f.x), F = v.floor, lit = f.glow, top = f.up ? 0 : F - 4, bot = f.up ? F : v.R;
    if (f.up) { px(x - 15, 0, 30, 12, "#0c0805"); px(x - 15, 10, 30, 2, "#1f130a"); }
    else { px(x - 16, F - 1, 32, v.R - F + 1, "#0c0805"); px(x - 16, F - 1, 32, 2, "#2a1c10"); }
    px(x - 13, top, 3, bot - top, "#6e4724"); px(x + 10, top, 3, bot - top, "#6e4724");
    px(x - 13, top, 1, bot - top, "#9a6a3a"); px(x + 10, top, 1, bot - top, "#9a6a3a");
    for (var y = top + 6; y < bot - 2; y += 10) { px(x - 10, y, 20, 3, "#5a3b1e"); px(x - 10, y, 20, 1, "#8a5a30"); }
    if (lit > 0.02) { g.strokeStyle = "rgba(255,226,150," + (0.7 * lit).toFixed(3) + ")"; g.lineWidth = 1; g.strokeRect(x - 15.5, (f.up ? 12 : F - 70) + 0.5, 31, f.up ? F - 12 : 70); }
    if (f.up) {
      var sy = Math.max(30, v.fy + 70), w = 58;
      px(x - w / 2, sy, w, 16, "#6e4724"); px(x - w / 2, sy, w, 2, "#9a6a3a"); px(x - w / 2, sy + 14, w, 2, "#3f2815");
      text(g, "TREE HOUSE ▲", x, sy + 8, 7, "#fff3c4", 600, w - 6, s, dpr, cam);
    } else text(g, "▼ GALLERY", x, F - 76, 7, "#fff3c4", 600, 60, s, dpr, cam);
  }

  function pine(px, cx, base, hgt, col) { for (var r = 0; r < hgt; r += 2) { var hw = 1 + Math.floor(r * 0.3); px(cx - hw, base - hgt + r, hw * 2, 2, col); } }
  function treeScene(g, h, v, t, s, dpr, cam, px, x0, x1) {
    var R = v.R, F = v.floor, i;
    for (var y = 0; y < F; y += 4) px(x0, y, x1 - x0, 4, y < F * 0.35 ? "#0b1420" : y < F * 0.7 ? "#0e1a24" : "#102020");
    for (i = 0; i < 70; i++) { var sx = ((i * 97) % 997) * 1.3 + Math.floor(cam * 0.9 / 1300) * 1300, sy = (i * 53) % Math.floor(F * 0.6); var X = sx + cam * 0.9 - (cam * 0.9 % 1300); if (X > x0 && X < x1) px(X, sy, 1, 1, i % 7 ? "rgba(233,226,196,0.5)" : "#e9e2c4"); }
    var p1 = cam * 0.6;
    for (i = Math.floor((x0 - p1) / 22) - 1; i < (x1 - p1) / 22 + 1; i++) pine(px, i * 22 + p1 + ((i * 7) & 7), F - 30, 40 + ((i * 13) % 24), "#132a1f");
    var p2 = cam * 0.3;
    for (i = Math.floor((x0 - p2) / 30) - 1; i < (x1 - p2) / 30 + 1; i++) pine(px, i * 30 + p2 + ((i * 11) & 9), F - 22, 56 + ((i * 17) % 30), "#183623");
    for (var cx = Math.floor(x0 / 18) * 18 - 18; cx < x1 + 18; cx += 18) {
      var k = ((cx / 18) | 0), d = 14 + ((k * 7) % 11);
      px(cx - 4, 0, 30, d, "#1d3a24"); px(cx + 2, d - 2, 18, 6, "#1d3a24"); px(cx + 6, d + 2, 8, 4, "#24452b");
      px(cx, 0, 18, 4, "#16301e");
    }
    var hx = Math.round(h.L.hub);
    px(hx - 40, 0, 80, F, "#2a1c10"); for (i = 0; i < 6; i++) px(hx - 34 + i * 13, 0, 2, F, "#22170d");
    px(hx - 46, F - 18, 92, 18, "#2a1c10");
    g.globalCompositeOperation = "lighter";
    for (var lx = Math.floor(x0 / 24) * 24; lx < x1; lx += 24) {
      var ly = 26 + Math.round(Math.sin(lx * 0.13) * 3), fl = 0.12 + 0.05 * Math.sin(t * 3 + lx);
      var gr = g.createRadialGradient(lx, ly, 1, lx, ly, 26); gr.addColorStop(0, "rgba(255,200,110," + fl.toFixed(3) + ")"); gr.addColorStop(1, "rgba(255,200,110,0)");
      g.fillStyle = gr; g.fillRect(lx - 26, ly - 26, 52, 52);
    }
    g.globalCompositeOperation = "source-over";
    for (lx = Math.floor(x0 / 24) * 24; lx < x1; lx += 24) { var ly2 = 26 + Math.round(Math.sin(lx * 0.13) * 3); px(lx - 12, ly2 - 4, 24, 1, "#140d07"); px(lx - 1, ly2 - 3, 3, 4, ["#eaba49", "#e3a08a", "#bdeaff", "#9fd18a"][((lx / 24) | 0) & 3]); }
    px(x0, F - 30, x1 - x0, 1, "#8a6a40");
    for (var rp = Math.floor(x0 / 40) * 40; rp < x1; rp += 40) { if (Math.abs(rp - hx) < 50) continue; px(rp, F - 32, 3, 32, "#4a3018"); }
    h.L.stalls.forEach(function (st, n) { if (st.x1 > x0 - 20 && st.x0 < x1 + 20) stallDraw(g, h, st, n, v, t, s, dpr, cam, px); });
    px(x0, F, x1 - x0, R - F, "#5a3a1c");
    for (var fx = Math.floor(x0 / 20) * 20; fx < x1; fx += 20) px(fx, F, 1, R - F, "#3f2815");
    for (var ry = F + 7; ry < R; ry += 8) px(x0, ry, x1 - x0, 1, "#4a3018");
    px(x0, F, x1 - x0, 2, "#7a5230");
    h.L.frames.forEach(function (f) { if (f.ladder && f.x > x0 - 30 && f.x < x1 + 30) ladder(g, f, v, t, s, dpr, cam, px); });
  }
  function stallDraw(g, h, st, n, v, t, s, dpr, cam, px) {
    var F = v.floor, c0 = st.x0 + 4, c1 = st.x1 - 4, top = F - 26, roof = Math.max(44, F - 140);
    var cloth = [["#7a2a22", "#e9d9b0"], ["#1f4a6a", "#e9d9b0"], ["#3a5a2a", "#e9d9b0"]][n % 3];
    px(c0, roof, 4, top - roof, "#4a3018"); px(c1 - 4, roof, 4, top - roof, "#4a3018");
    for (var ax = c0 - 4; ax < c1 + 4; ax += 8) { px(ax, roof - 10, 8, 12, cloth[((ax - c0) / 8 | 0) & 1 ? 1 : 0]); px(ax, roof + 2, 8, 3, cloth[0]); px(ax + 2, roof + 5, 4, 2, cloth[0]); }
    px(c0 - 4, roof - 12, c1 - c0 + 8, 2, "#2a1c10");
    var mid = (c0 + c1) / 2, sw = Math.min(110, c1 - c0 - 10);
    px(mid - sw / 2, roof - 30, sw, 18, "#6e4724"); px(mid - sw / 2, roof - 30, sw, 2, "#9a6a3a"); px(mid - sw / 2, roof - 14, sw, 2, "#3f2815");
    text(g, st.m.name, mid, roof - 21, 8, "#fff3c4", 600, sw - 6, s, dpr, cam);
    px(c0 + 4, roof + 30, c1 - c0 - 8, 3, "#5a3b1e");
    var mf = h.L.frames.filter(function (f) { return f.merchant === st.m; })[0], K = BH.cosmetics;
    if (mf) {
      var bob = Math.round(Math.sin(t * 2 + n) * 0.6 + mf.pop * -3);
      try { K.draw(g, mf.x, top + 14 + bob, { dir: "down", state: "idle", t: t, scale: 1, alpha: 1, hat: st.m.hat }, st.m.fur); } catch (e) {}
      if (mf.glow > 0.05) { var wv = Math.round(Math.sin(t * 8) * 2); px(mf.x + 12, top - 30 + wv, 3, 6, "#e9d9b0"); }
    }
    h.L.frames.forEach(function (f) { if (f.good && f.x >= st.x0 && f.x <= st.x1) good(g, f, v, t, s, dpr, cam, px); });
    px(c0, top, c1 - c0, 26, "#6e4724"); px(c0, top, c1 - c0, 3, "#9a6a3a"); px(c0, top + 24, c1 - c0, 2, "#3f2815");
    for (var bx = c0 + 10; bx < c1; bx += 22) px(bx, top + 5, 1, 18, "#5a3b1e");
    h.L.frames.forEach(function (f) { if (f.good && f.x >= st.x0 && f.x <= st.x1) priceTag(g, f, v, s, dpr, cam, px); });
  }
  function good(g, f, v, t, s, dpr, cam, px) {
    var K = BH.cosmetics, it = f.good, F = v.floor, top = F - 26, x = Math.round(f.x) + (f.shake ? Math.round(Math.sin(f.shake * 60) * 2) : 0);
    var st = K.status(it.id, save, window.LV), dark = st.state === "locked", lift = Math.round(f.glow * 3 + f.pop * 2);
    if (f.glow > 0.02) {
      g.globalCompositeOperation = "lighter";
      var gr = g.createRadialGradient(x, top - 24, 4, x, top - 24, 44); gr.addColorStop(0, "rgba(255,210,120," + (0.25 * f.glow).toFixed(3) + ")"); gr.addColorStop(1, "rgba(255,210,120,0)");
      g.fillStyle = gr; g.fillRect(x - 44, top - 70, 88, 90); g.globalCompositeOperation = "source-over";
    }
    g.save(); if (dark) g.globalAlpha = 0.45;
    if (it.slot === "fur") {
      px(x - 9, top - 3, 18, 3, "#3f2815");
      try { K.draw(g, x, top - 3 - lift, { dir: "down", state: "idle", t: 0, scale: 0.75, alpha: 1, hat: "hat-none" }, it.id); } catch (e) {}
    } else if (it.slot === "hat") {
      px(x - 1, top - 25, 3, 25, "#4a3018"); px(x - 6, top - 2, 13, 2, "#3f2815");
      px(x - 6, top - 37 - lift, 13, 12, "#8a6a48"); px(x - 5, top - 38 - lift, 11, 1, "#8a6a48");
      try { K.drawHat(g, x, top + 6 - lift, "down", it.id, 1); } catch (e) {}
    } else if (it.slot === "print") {
      px(x - 13, top - 22 - lift, 26, 20, "#e9d9b0"); px(x - 13, top - 22 - lift, 26, 1, "#fff3c4"); px(x - 13, top - 3 - lift, 26, 1, "#b49a7a");
      try { K.drawPrint(g, x, top - 12 - lift, -Math.PI / 2, it.id, 2, { scale: 1.2 }); } catch (e) {}
    } else {
      var ct = (t + f.x * 0.01) % (K.CELE_DURATION + 1.4);
      px(x - 8, top - 14 - lift, 16, 14, "#7a2a22"); px(x - 8, top - 14 - lift, 16, 2, "#a0402e"); px(x - 1, top - 14 - lift, 2, 14, "#eaba49"); px(x - 8, top - 8 - lift, 16, 2, "#eaba49");
      if (f.glow > 0.3 && !dark) try { K.celebrate(g, x, top - 16, ct, it.id, { unit: 1, stars: 2 }); } catch (e) {}
    }
    g.restore();
    if (dark) lock(px, x, top - 22);
  }
  function priceTag(g, f, v, s, dpr, cam, px) {
    var tg = tag(f), F = v.floor, x = Math.round(f.x), y = F - 18, w = 44;
    var wood = tg.kind === "on" ? ["#eaba49", "#9a7424", "#1f130a"] : tg.kind === "poor" ? ["#4a2a1c", "#2a160e", "#e3a08a"] : tg.kind === "lock" ? ["#3a2716", "#1f130a", "#b49a7a"] : ["#e9d9b0", "#b49a7a", "#2a1c10"];
    px(x - w / 2, y, w, 11, wood[0]); px(x - w / 2, y + 10, w, 1, wood[1]);
    text(g, tg.plaque, x, y + 6, 6, wood[2], 600, w - 4, s, dpr, cam);
  }
  function lock(px, x, y) {
    px(x - 4, y - 6, 8, 2, "#b49a7a"); px(x - 5, y - 5, 2, 6, "#b49a7a"); px(x + 3, y - 5, 2, 6, "#b49a7a");
    px(x - 7, y, 14, 11, "#b49a7a"); px(x - 6, y + 1, 12, 9, "#8a7458"); px(x - 1, y + 3, 2, 5, "#2a1c10");
  }
  var silCv = null;
  function silhouette(g, art, x, y, w, h) {
    silCv = silCv || document.createElement("canvas");
    if (silCv.width !== w || silCv.height !== h) { silCv.width = w; silCv.height = h; }
    var c = silCv.getContext("2d"); c.imageSmoothingEnabled = false; c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over"; c.drawImage(art, 0, 0, w, h);
    c.globalCompositeOperation = "source-in"; c.fillStyle = "#2b332b"; c.fillRect(0, 0, w, h);
    g.drawImage(silCv, x, y);
  }
  function textW(g, str, size, s) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = "600 " + size * s + "px " + FONT; var w = g.measureText(str).width / s; g.restore(); return w; }
  function text(g, str, x, y, size, col, wt, maxW, s, dpr, cam) {
    g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var fs = size * s; g.font = wt + " " + fs + "px " + FONT;
    var w = g.measureText(str).width; if (w > maxW * s) { fs = Math.floor(fs * maxW * s / w); g.font = wt + " " + fs + "px " + FONT; }
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(0,0,0,0.45)";
    var sx = Math.round((x - cam) * s), sy = Math.round(y * s);
    g.fillText(str, sx, sy + Math.max(1, s / 2)); g.fillStyle = col; g.fillText(str, sx, sy);
    g.restore();
  }

  function say(g, sp, x, y, s, dpr, cam, px, x0, x1) {
    var str = sp.text, n = Math.min(str.length, Math.floor(sp.t * TALK));
    var w = Math.ceil(textW(g, str, 6, s)) + 8, hh = 11, pop = Math.min(1, sp.t / 0.12);
    y -= Math.round((1 - pop) * -4 + (n < str.length ? Math.sin(sp.t * 40) * 0.6 : 0));
    w = Math.max(8, Math.round(w * (0.4 + 0.6 * pop)));
    var bx = Math.round(Math.max(x0 + 2, Math.min(x1 - w - 2, x - w / 2))), by = Math.round(y - hh);
    str = str.slice(0, n);
    px(bx - 1, by - 1, w + 2, hh + 2, "#1f130a"); px(bx, by, w, hh, "#fff3c4");
    px(x - 2, by + hh, 5, 1, "#fff3c4"); px(x - 1, by + hh + 1, 3, 1, "#fff3c4"); px(x, by + hh + 2, 1, 1, "#1f130a");
    px(x - 3, by + hh, 1, 1, "#1f130a"); px(x + 3, by + hh, 1, 1, "#1f130a"); px(x - 2, by + hh + 1, 1, 1, "#1f130a"); px(x + 2, by + hh + 1, 1, 1, "#1f130a");
    if (str && pop >= 1) text(g, str, bx + 4 + textW(g, str, 6, s) / 2, by + hh / 2, 6, "#1f130a", "700", w - 4, s, dpr, cam);
  }

  var MOVES = {}, sprCv = {};
  function moveId() { return CH().worn(save) || (CH().main ? CH().main(save.cos) : null); }
  function move() { var id = hall && moveId(); return id && MOVES[id] || null; }
  function body(g, x, y, o) {
    var who = moveId(); if (!who) return false; o = o || {};
    var oc = { dir: o.dir || hall.dir, state: o.state || "idle", t: o.t != null ? o.t : 0, scale: 1, alpha: o.alpha != null ? o.alpha : 1 }, ok = false;
    g.save(); if (o.comp) g.globalCompositeOperation = o.comp;
    g.translate(Math.round(x), Math.round(y)); if (o.rot) g.rotate(o.rot); g.scale(o.sx || 1, o.sy || 1);
    try { ok = CH().draw(g, 0, 0, oc, who); } catch (e) {}
    g.restore(); return ok;
  }
  function sprite(dir) {
    var id = moveId(), d = dir || hall.dir || "right", k = id + d; if (sprCv[k]) return sprCv[k];
    var c = document.createElement("canvas"); c.width = 96; c.height = 112;
    var x = c.getContext("2d"), ok = false; x.imageSmoothingEnabled = false;
    try { ok = CH().draw(x, 48, 104, { dir: d, state: "idle", t: 0, scale: 1, alpha: 1 }, id); } catch (e) {}
    if (!ok) return null;
    return (sprCv[k] = { c: c, ax: 48, ay: 104 });
  }
  function mapi(h, st) {
    var v = h.view, F = v.floor, R = v.R, hx = Math.round(h.L.ladder), m = st && st.m, p = 0;
    if (m && m.out != null) p = Math.min(1, st.t / (st.sw ? m.in : m.out)); else if (m && m.dur) p = Math.min(1, st.t / m.dur);
    var vx0 = h.cam - 2, vx1 = h.cam + v.VW + 2;
    return {
      id: moveId(), F: F, R: R, x: h.x, lad: h.L.ladder, dir: h.dir || "right", tree: !!h.L.tree, cam: h.cam, VW: v.VW,
      moving: h.walk > 0, busy: !!(h.lad || h.fall || h.mv || h.land || h.tp), now: (performance.now() - h.t0) / 1000,
      T: st ? st.t || 0 : 0, p: p, out: !!(st && m && m.out != null && !st.sw), up: !!(st && st.up),
      f: st && st.f || null, y: st && st.y != null ? st.y : F + 1, vy: st && st.vy || 0, vx: st && st.vx || 0,
      rect: function (g, x, y, w, hh, c) { g.fillStyle = c; g.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(hh)); },
      body: function (g, x, y, o) { return body(g, x, y, o); },
      climb: function (g, x, y, k) { var who = moveId(); try { return CH().drawClimb(g, Math.round(x), Math.round(y), k, who || "char-001", { scale: 1, t: 0, look: null }); } catch (e) { return false; } },
      sprite: sprite,
      clip: function (g) { g.beginPath(); if (h.fl) { g.rect(vx0, 0, vx1 - vx0, F); g.rect(hx - 16, F, 32, R - F + 2); } else { g.rect(vx0, 12, vx1 - vx0, R); g.rect(hx - 15, 0, 30, 12); } g.clip(); },
      clipFloor: function (g) { g.beginPath(); g.rect(vx0, 0, vx1 - vx0, F + 1); g.clip(); },
      fx: function (q) { h.mfx = h.mfx || []; if (h.mfx.length < 400) { q.t = 0; h.mfx.push(q); } },
      sfx: function (n, o) { if (o) sfxO(n, o); else sfxS(n); },
      shake: function (n) { h.shk = Math.max(h.shk || 0, n); },
      flash: function (n, c) { h.mfl = Math.max(h.mfl || 0, n); h.mflc = c || "#ffffff"; },
      pics: function () {
        var out = [];
        h.L.frames.forEach(function (f) {
          if (f.ladder || f.exit || f.x < vx0 - 40 || f.x > vx1 + 40) return;
          out.push(h.L.tree ? { f: f, x: f.x - 20, y: F - 72, w: 40, h: 50, cx: f.x, cy: F - 47 } : { f: f, x: f.x - FW / 2, y: v.fy, w: FW, h: FH, cx: f.x, cy: v.fy + FH / 2 });
        });
        return out;
      },
      lerp: function (a, b, q) { return a + (b - a) * q; }, clamp: function (q, a, b) { return Math.max(a, Math.min(b, q)); },
      eo: function (q) { return 1 - (1 - q) * (1 - q); }, ei: function (q) { return q * q; }, eio: function (q) { return q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q); },
      rnd: function (a, b) { return a + Math.random() * (b - a); }
    };
  }
  BH.hallMoves = { add: function (id, m) { MOVES[id] = m; }, list: function () { return Object.keys(MOVES); } };

  var nextAt = null;
  function open(at) { nextAt = at || null; if (BH.landing && BH.landing.show) BH.landing.show(at === "badges" ? "badges" : "profile"); }
  var icons = {};
  function badgeIcon(id) {
    if (icons[id]) return icons[id];
    try {
      var c = document.createElement("canvas"); c.width = c.height = 52;
      var g = c.getContext("2d"), px = function (x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); };
      var m = ["#5a4214", "#9a7424", "#eaba49", "#fff0c0"], cx = 26, cy = 26;
      disc(px, cx, cy, 24, m[0]); disc(px, cx, cy, 23, m[1]); disc(px, cx, cy, 20, m[2]); disc(px, cx, cy, 17, m[1]);
      px(cx - 12, cy - 18, 7, 2, m[3]);
      emblem(px, id, cx, cy, m, true);
      icons[id] = c.toDataURL();
    } catch (e) { icons[id] = ""; }
    return icons[id];
  }
  BH.hall = { html: html, mount: function (cb) { cb.at = cb.at || nextAt; nextAt = null; mount(cb); }, key: keyDown, on: live, open: open,
    esc: function () { return false; }, badgeIcon: badgeIcon };
  if (typeof window.showShop === "function") window.showShop = function () { open(null); };
})();
