"use strict";

var BH = window.BH = window.BH || {};

var T = 32, STEP = 1 / 60;
var SPEED_LAND = 3.4, SPEED_SPRINT = 5.2, SPEED_WATER = 2.7;
var STAMINA = 2.0, STAMINA_REGEN = 0.6;
var H_PATROL = 1.6, H_CHASE = 2.8, H_RUSH = 3.1, H_FOLLOW = 2.0, H_FOLLOW_FRESH = 1.2;
var D_PATROL = 2.0, D_FOLLOW = 2.3, D_FOLLOW_FRESH = 0.9, D_CHASE = 3.0, D_SENSE = 1.6;
var VISION = 5.5, CONE = 0.62, SENSE = 1.25, CATCH = 0.55;
var TOWER_RANGE = 9, TOWER_HALF = 0.3, TOWER_SPIN = 0.75;
var CROWD_WINDOW = 1.6, CROWD_RADIUS = 7, NPC_SPEED = 2.3;
var ACT_SPEED = [1, 1.05, 1.12, 1.18, 1.24];
var ACT_VISION = [4.5, 5, 5.5, 5.75, 6];
var C = {
  bg: "#1b1b1b", ground: "#132713", ground2: "#183018", ground3: "#0f200f",
  tree: "#0b1a0b", tree2: "#173117", tree3: "#1f421f", trunk: "#2b1d14", bush: "#1d4a1f", bush2: "#2a5e2a",
  water: "#0c1428", gold: "#eaba49", goldDim: "#b8862b", ink: "#fffaf0", red: "#c8412f", string: "#d04a37", ice: "#bfe9ff", wood: "#6b4a2e"
};
var F = window.FACTS, LV = window.LEVELS;

var SAVE_KEY = window.BH_SAVE_KEY || "bitfoot-hunt-v3";
var TEST_DOORS = (function () {
  try {
    if (typeof document === "undefined" || !("currentScript" in document)) return true;
    var s = document.currentScript, src = s && s.getAttribute ? s.getAttribute("src") || "" : "";
    return /(^|\/)core\.js$/.test(src);
  } catch (e) { return false; }
})();
BH.testDoors = TEST_DOORS;
var params = (function () {
  var all = new URLSearchParams(location.search);
  if (TEST_DOORS) return all;
  var open = new URLSearchParams("");
  if (all.get("fresh")) open.set("fresh", all.get("fresh"));
  return open;
})();
var SAVE_VERSION = 3;
function freshSave() { return { v: SAVE_VERSION, stars: {}, best: {}, wallet: 0, up: {}, inv: {}, loadout: [], cos: { owned: {} }, badges: {}, medals: {}, bestZec: {}, char: "", chars: {},
  gAt: typeof window.genesisAt === "function" ? window.genesisAt() : 0 }; }
function lvLabel(n) { return n - (window.LEVEL_FROM_ZERO ? 1 : 0); }
function levelCopy(n) { var lv = (window.LEVELS || [])[n - 1]; return (window.FACTS && FACTS.levels[n]) || (lv && lv.copy) || null; }
function migrateSave(old) {
  var s = freshSave();
  if (!old || typeof old !== "object") return s;
  Object.keys(old).forEach(function (k) { s[k] = old[k]; });
  var obj = function (v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; };
  s.stars = obj(s.stars); s.best = obj(s.best); s.up = obj(s.up); s.inv = obj(s.inv); s.cos = obj(s.cos); s.cos.owned = obj(s.cos.owned);
  s.badges = obj(s.badges); s.medals = obj(s.medals); s.bestZec = obj(s.bestZec);
  s.char = typeof s.char === "string" ? s.char : "";
  s.chars = obj(s.chars);
  s.loadout = Array.isArray(s.loadout) ? s.loadout : [];
  s.wallet = isFinite(+s.wallet) ? +s.wallet : 0;
  s.v = SAVE_VERSION;
  return s;
}
var save = freshSave();
try {
  if (params.get("fresh")) localStorage.removeItem(SAVE_KEY);
  var raw = localStorage.getItem(SAVE_KEY);
  if (raw) { var parsed = JSON.parse(raw); save = migrateSave(parsed); if (parsed.v !== SAVE_VERSION || parsed.gAt !== save.gAt) localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
} catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
addEventListener("storage", function (e) {
  if (e.key !== SAVE_KEY || !e.newValue) return;
  try {
    var mine = save, s = migrateSave(JSON.parse(e.newValue));
    ["stars", "bestZec"].forEach(function (k) { for (var n in mine[k] || {}) s[k][n] = Math.max(s[k][n] || 0, mine[k][n] || 0); });
    for (var n in mine.best || {}) if (!s.best[n] || mine.best[n] < s.best[n]) s.best[n] = mine.best[n];
    for (var m in mine.medals || {}) { s.medals[m] = s.medals[m] || {}; for (var q in mine.medals[m]) if (mine.medals[m][q]) s.medals[m][q] = true; }
    save = s;
  } catch (err) {}
});
function invCount(id) { return (save.inv && save.inv[id]) || 0; }
function invAdd(id, n) { save.inv[id] = invCount(id) + (n == null ? 1 : n); persist(); return save.inv[id]; }
function invConsume(id) { var c = invCount(id); if (c <= 0) return false; save.inv[id] = c - 1; persist(); return true; }
function unlockedUpTo() { if (TEST_DOORS && params.get("unlock")) return LV.length; var n = 1; while (save.stars[n] != null && n < LV.length) n++; return n; }
var TOUCH = window.matchMedia ? matchMedia("(pointer: coarse)").matches : ("ontouchstart" in window);
window.BH_INPUT_MODE = TOUCH ? "touch" : "keys";
function setInputMode(m) {
  if (window.BH_INPUT_MODE === m) return;
  window.BH_INPUT_MODE = m; TOUCH = m === "touch";
  try { window.dispatchEvent(new Event("bh-input-mode")); } catch (e) {}
}
addEventListener("pointerdown", function (e) { if (e.pointerType === "touch") setInputMode("touch"); }, true);
addEventListener("keydown", function (e) {
  if (typeof game !== "undefined") game.keyScreen = game.screen;
  if (!e.isTrusted || e.key === "Unidentified") return; setInputMode("keys");
}, true);

var canvas = document.getElementById("game"), ctx = canvas.getContext("2d");
var W = 0, H = 0, DPR = 1, zoom = 1;
var trailZoom = 1;
var ZOOM_STEPS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
var SCREEN_SCALES = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4];
var zoomSeen = null;
function zoomFromFrame(r, dpr, frame, tol) {
  var best = 0, bd = 1;
  ZOOM_STEPS.forEach(function (s) {
    if (!SCREEN_SCALES.some(function (k) { return Math.abs(dpr / s / k - 1) < 0.02; })) return;
    var f = r / s - 1, d = Math.abs(f - frame);
    if (f > frame - 0.02 && f < frame + tol && d < bd) { best = s; bd = d; }
  });
  return best;
}
function browserZoom() {
  if (TOUCH || !window.outerWidth || !window.innerWidth) return 1;
  var r = window.outerWidth / window.innerWidth, dpr = window.devicePixelRatio || 1, z = 0, p = zoomSeen;
  if (p && Math.abs(dpr / p.dpr - 1) < 0.01) return p.z;
  if (p) {
    var step = 0; ZOOM_STEPS.forEach(function (s) { if (Math.abs(dpr / p.k / s - 1) < 0.02) step = s; });
    if (step && Math.abs(r / step - 1 - p.frame) < 0.03) z = step;
  }
  z = z || zoomFromFrame(r, dpr, 0, 0.12) || 1;
  zoomSeen = { z: z, dpr: dpr, k: dpr / z, frame: Math.max(0, r / z - 1) };
  return z;
}
var mediaOrig = typeof WeakMap === "function" ? new WeakMap() : null, mediaZoom = 1;
function zoomMedia(z) {
  if (!mediaOrig || (z === mediaZoom && z === 1)) return;
  mediaZoom = z;
  var walk = function (rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.media && r.cssRules && typeof CSSMediaRule === "function" && r instanceof CSSMediaRule) {
        var o = mediaOrig.get(r);
        if (o === undefined) { o = r.media.mediaText; mediaOrig.set(r, o); }
        if (/(width|height)\s*:/.test(o)) {
          var t = o.replace(/((?:min|max)-(?:width|height)\s*:\s*)([\d.]+)px/g, function (m, k, v) { return k + +(v / z).toFixed(3) + "px"; });
          if (r.media.mediaText !== t) r.media.mediaText = t;
        }
      }
      if (r.cssRules) walk(r.cssRules);
    }
  };
  for (var s = 0; s < document.styleSheets.length; s++) { var rules = null; try { rules = document.styleSheets[s].cssRules; } catch (e) {} if (rules) walk(rules); }
}
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  trailZoom = browserZoom();
  document.documentElement.style.setProperty("--tz", String(trailZoom));
  document.documentElement.style.setProperty("--tzi", String(1 / trailZoom));
  zoomMedia(trailZoom);
  zoom = baseZoom();
}
function baseZoom() { return W * trailZoom < 700 ? W / (T * 13) : Math.min(W / (T * 24), H / (T * 14)); }
window.addEventListener("resize", resize); resize();
var fallbackSprite = new Image(); fallbackSprite.src = "assets/art/026.png";

var Snd = (function () {
  var ac = null, master = null, muted = false, nextBeat = 0;
  function init() { if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination); } catch (e) { ac = null; } }
  function env(n, t, a, p, d) { n.gain.setValueAtTime(0.0001, t); n.gain.exponentialRampToValueAtTime(Math.max(p, 0.0002), t + a); n.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f0, f1, dur, vol, when) {
    if (!ac || muted) return;
    var t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.008, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq) {
    if (!ac || muted) return;
    var t = ac.currentTime, n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = b; f.type = "lowpass"; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(freq * 0.3, t + dur);
    env(g, t, 0.01, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  var now = function () { return ac ? ac.currentTime : 0; };
  var hidSusp = false;
  document.addEventListener("visibilitychange", function () {
    try {
      if (!ac) return;
      if (document.hidden && ac.state === "running") { hidSusp = true; ac.suspend(); }
      else if (!document.hidden && hidSusp) { hidSusp = false; ac.resume(); }
    } catch (e) {}
  });
  return {
    init: init, toggle: function () { muted = !muted; return muted; },
    coin: function (combo) { var f = 988 * (1 + (combo - 1) * 0.12); tone("square", f, f * 1.5, 0.09, 0.08); tone("square", f * 1.5, f * 2, 0.12, 0.06, now() + 0.07); },
    stash: function () { tone("triangle", 660, 440, 0.15, 0.08); },
    splash: function () { noise(0.45, 0.35, 1400); tone("sine", 420, 160, 0.3, 0.08); },
    exit: function () { noise(0.2, 0.18, 900); },
    spotted: function () { tone("sawtooth", 220, 110, 0.35, 0.12); tone("square", 440, 220, 0.18, 0.05); },
    sniff: function () { tone("triangle", 330, 392, 0.16, 0.08); },
    bark: function () { tone("square", 300, 180, 0.08, 0.1); tone("square", 300, 170, 0.08, 0.1, now() + 0.14); },
    linked: function () { tone("sawtooth", 180, 60, 0.6, 0.16); tone("square", 90, 45, 0.5, 0.08); },
    confused: function () { tone("triangle", 392, 330, 0.14, 0.09); tone("triangle", 330, 440, 0.2, 0.09, now() + 0.15); },
    decoy: function () { noise(0.12, 0.2, 2600); tone("triangle", 880, 440, 0.2, 0.06); },
    drone: function () { tone("square", 1200, 900, 0.06, 0.04); },
    caught: function () { tone("sine", 120, 40, 0.5, 0.4); noise(0.3, 0.2, 500); },
    buy: function () { [659, 988].forEach(function (f, i) { tone("square", f, f, 0.1, 0.07, now() + i * 0.08); }); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, f, 0.18, 0.1, now() + i * 0.09); }); },
    heart: function (danger) {
      if (!ac || muted || danger < 0.08) return;
      var n = ac.currentTime; if (n < nextBeat) return;
      tone("sine", 70, 38, 0.14, 0.25 + 0.5 * danger, n); tone("sine", 62, 34, 0.12, 0.15 + 0.35 * danger, n + 0.17);
      nextBeat = n + 1.15 - 0.8 * danger;
    }
  };
})();

var LEGACY_SND = { coin: "coin", spotted: "spotted", suspicion: "sniff", caught: "caught", escaped: "win", decoy: "decoy", bark: "bark",
  drone: "drone", tower: "spotted", linked: "linked", crowd: "confused", boss: "spotted", stash: "stash", splashIn: "splash", splashOut: "exit" };
function sfx(name, opts) {
  if (BH.audio) return BH.audio.sfx(name, opts);
  var k = LEGACY_SND[name]; if (k && Snd[k]) Snd[k](opts && opts.combo != null ? opts.combo : undefined);
}
function audioInit() { if (BH.audio) BH.audio.init(); else Snd.init(); }
function setShieldedAudio(on) { if (BH.audio) BH.audio.setShielded(on); else sfx(on ? "splashIn" : "splashOut"); }
function wireAudioFacade() {
  if (!BH.audio || Snd.routed) return;
  Snd.routed = true;
  Snd.init = function () { BH.audio.init(); };
  Snd.toggle = function () { return BH.audio.mute(); };
  Snd.buy = function () { BH.audio.sfx("buy"); };
}
function sayOr(key, text, color) { if (F.words[key]) say(key, color); else popRaw(text, color); }
function teach(kind, d) { if (typeof teachEvent === "function") teachEvent(kind, d || {}); }

var game ={ screen: "title", levelIdx: 0, phase: "none" };
var L, grid, cols, rows, player, hunters, towers, stashes, prints, strings, coins, particles, rings, pops, links, bridges, trace = [];
var npcs = [], shores = [], wave = null, exitEvents = [], pendingLink = null, tufts = [], drone = null, done = {};
var floaters = [];
function floatText(x, y, text, col, sub, life) { floaters.push({ x: x, y: y, text: text, sub: sub || "", col: col || C.gold, t0: simTime, life: life || 1.1 }); }
var cam = { x: 0, y: 0 }, shake = 0, simTime = 0, levelStart = 0, frozenUntil = 0, denFlash = 0;
var bake = null, waterPath = null, waterEdges = null, dens = null, ghost = false;
var stats = { pops: 0, trans: 0, acq: 0 }, screensSeen = {}, view = { x0: 0, x1: 1e9, y0: 0 };

var keys = {}, joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, sprint: false }, sprintHeld = false;
function latinKey(e) {
  var m = /^Key([A-Z])$/.exec(e.code || ""), k = e.key || "";
  if (!m || /^[a-z]$/i.test(k) || (k.length > 1 && !/^(Process|Unidentified|Dead)$/.test(k))) return;
  try { Object.defineProperty(e, "key", { value: e.shiftKey ? m[1] : m[1].toLowerCase() }); } catch (err) {}
}
window.addEventListener("keydown", latinKey, true);
window.addEventListener("keyup", latinKey, true);
BH.binds = (function () {
  var DEF = { up: "w", left: "a", down: "s", right: "d", sprint: "shift", decoy: "e", pause: "escape", mute: "m" };
  var RESERVED = ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter", "tab", "backspace", "r", "p", "q", "v", "1", "2", "3"];
  var NAMES = { shift: "SHIFT", escape: "ESC", control: "CTRL", alt: "ALT", capslock: "CAPS" };
  var store = "bh-keys:" + (window.BH_SAVE_KEY || "bitfoot-hunt"), cur = {};
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(store) || "null"); } catch (e) {}
    Object.keys(DEF).forEach(function (a) { cur[a] = s && typeof s[a] === "string" ? s[a] : DEF[a]; });
  }
  function save() { try { localStorage.setItem(store, JSON.stringify(cur)); } catch (e) {} }
  load();
  function owner(k) { for (var a in cur) if (cur[a] === k) return a; return null; }
  return {
    get: function (a) { return cur[a]; },
    name: function (a) { var k = cur[a]; return NAMES[k] || k.toUpperCase(); },
    walkName: function () { var w = [cur.up, cur.left, cur.down, cur.right]; return w.join("") === "wasd" ? "WASD" : w.map(function (k) { return NAMES[k] || k.toUpperCase(); }).join(""); },
    custom: function () { return Object.keys(DEF).some(function (a) { return cur[a] !== DEF[a]; }); },
    usable: function (key) { var k = String(key || "").toLowerCase(); return k.length === 1 ? RESERVED.indexOf(k) < 0 : !!NAMES[k] && k !== "escape"; },
    set: function (a, key) {
      var k = String(key).toLowerCase(), o = owner(k);
      if (o && o !== a) cur[o] = cur[a];
      cur[a] = k; save();
    },
    reset: function () { cur = {}; Object.keys(DEF).forEach(function (a) { cur[a] = DEF[a]; }); try { localStorage.removeItem(store); } catch (e) {} },
    map: function (key) {
      var k = String(key || "").toLowerCase(), a = owner(k);
      if (a) return a === "pause" ? "Escape" : a === "sprint" ? "Shift" : DEF[a];
      if (k === "escape") return key;
      for (var d in DEF) if (DEF[d] === k) return "";
      return key;
    }
  };
})();
window.addEventListener("keydown", function (e) {
  audioInit();
  var k = BH.binds.map(e.key);
  if (k.indexOf("Arrow") === 0 || k === " ") e.preventDefault();
  keys[k.toLowerCase()] = true;
  if (e.repeat) return;
  if (k === "m" || k === "M") { toggleMute(); return; }
  var s = game.screen;
  if (s === "title") { showSelect(); return; }
  if (s === "select") { if ((k === "Enter" || k === " ") && !(BH.worldmap && BH.worldmap.key)) startLevel(nextLevelIdx()); return; }
  if (s === "complete") { if (k === "Enter" || k === " ") nextFromComplete(); return; }
  if (s === "shop") { if (k === "Enter" || k === " " || k === "Escape") nextFromComplete(); return; }
  if (s === "finale") { if (k === "Enter" || k === " ") showSelect(); return; }
  if (s === "pause") { if (typeof trailPauseKey === "function" && trailPauseKey(k)) return; if (k === "Escape" || k === " " || k === "Enter") resume(); return; }
  if (s === "play") {
    if (k === "Escape" || k === "p" || k === "P") { showPause(); return; }
    if (k === "e" || k === "E") { throwDecoy(); return; }
    if ((k === "r" || k === "R") && game.phase === "play") { restartHold.armed = true; restartHold.t = 0; return; }
    if (game.phase === "caught" && (k === "r" || k === "R" || k === " " || k === "Enter")) { retryNow(); return; }
    if (game.phase === "play") BH.items.hook("onUse", k);
  }
});
window.addEventListener("keyup", function (e) { var k = BH.binds.map(e.key).toLowerCase(); keys[k] = false; if (k === "r") restartLetGo(); });
function autoPause() { if (game.screen === "play" && game.phase === "play" && typeof showPause === "function") showPause(); }
window.addEventListener("blur", function () { keys = {}; restartLetGo(); autoPause(); });
document.addEventListener("visibilitychange", function () { if (document.hidden) { keys = {}; restartLetGo(); autoPause(); } });
var RESTART_HOLD = 0.6;
var restartHold = { armed: false, t: 0 };
function restartLetGo() { restartHold.armed = false; restartHold.t = 0; }
function stepRestartHold(dt) {
  if (!restartHold.armed) return false;
  if (!keys["r"]) { restartLetGo(); return false; }
  restartHold.t += dt;
  if (restartHold.t < RESTART_HOLD) return false;
  restartHold.armed = false; restartHold.t = 0;
  retryNow();
  return true;
}
var JOY_R = 52, JOY_DEAD = 6, JOY_MIN = 0.25, JOY_FULL = 0.75;
var tapGo = null;
canvas.addEventListener("pointerdown", function (e) {
  audioInit();
  if (game.screen !== "play") return;
  joy.active = true; joy.id = e.pointerId; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});
canvas.addEventListener("pointermove", function (e) {
  if (!joy.active || e.pointerId !== joy.id) return;
  joy.x = e.clientX; joy.y = e.clientY;
});
function endJoy(e) { if (e.pointerId === joy.id) joy.active = false; }
canvas.addEventListener("pointerup", endJoy); canvas.addEventListener("pointercancel", endJoy);
function joyMag(l) {
  if (l <= JOY_DEAD) return 0;
  var k = Math.min(1, (l - JOY_DEAD) / (JOY_R * JOY_FULL - JOY_DEAD));
  return JOY_MIN + (1 - JOY_MIN) * k;
}

var tickIn = null;
function sampleInput() {
  var x = 0, y = 0, q = { x: 0, y: 0, a: 0, s: 0 };
  if (keys["arrowleft"] || keys["a"]) x -= 1;
  if (keys["arrowright"] || keys["d"]) x += 1;
  if (keys["arrowup"] || keys["w"]) y -= 1;
  if (keys["arrowdown"] || keys["s"]) y += 1;
  q.x = x; q.y = y;
  if (joy.active) {
    var dx = joy.x - joy.ox, dy = joy.y - joy.oy, l = Math.hypot(dx, dy), m = joyMag(l);
    if (m) {
      x = dx / l * m; y = dy / l * m;
      var len0 = Math.hypot(x, y); if (len0 > 1) { x /= len0; y /= len0; }
      q.a = 1; q.x = Math.round(x * 127); q.y = Math.round(y * 127);
    }
  }
  q.s = !!(L && L.sprint) && (keys["shift"] || sprintHeld) ? 1 : 0;
  return q;
}
function inputOf(q) {
  var x, y;
  if (q.a === 1) { x = q.x / 127; y = q.y / 127; }
  else { x = q.x; y = q.y; }
  var len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
  return [x, y];
}
function inputVec() { return inputOf(tickIn || sampleInput()); }
function wantsSprint() { return !!(L && L.sprint) && !!(tickIn || sampleInput()).s; }

var TILE_DEFS = {};
BH.tiles = {
  register: function (code, def) { TILE_DEFS[code] = def || {}; return TILE_DEFS[code]; },
  get: function (code) { return TILE_DEFS[code] || null; },
  codes: function () { return Object.keys(TILE_DEFS); }
};

function tile(x, y) { return (grid[y] && grid[y][x]) || "#"; }
function isWater(c) { if (c === "~") return true; var d = TILE_DEFS[c]; return !!(d && d.water); }
function solidP(c) { if (c === "#" || c === "T") return true; var d = TILE_DEFS[c]; return !!(d && d.solid); }
function solidH(c) { if (c === "#" || c === "T" || c === "~") return true; var d = TILE_DEFS[c]; return !!(d && (d.solid || d.water || d.solidHunter)); }
function tileAt(px, py) { return tile(Math.floor(px / T), Math.floor(py / T)); }
function hash(x, y) { var h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
var rngState = 1; function rnd() { rngState = (rngState * 1664525 + 1013904223) >>> 0; return rngState / 4294967296; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function losClear(ax, ay, bx, by) {
  var d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 6), sx = Math.floor(ax / T), sy = Math.floor(ay / T);
  for (var i = 1; i < n; i++) {
    var x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
    if (Math.floor(x / T) === sx && Math.floor(y / T) === sy) continue;
    if (solidP(tileAt(x, y))) return false;
  }
  return true;
}
function puff(x, y, n, col, spd) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, s = (0.3 + Math.random()) * (spd || 18); particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, life: 0.45 + Math.random() * 0.3, t: 0, col: col || "rgba(234,186,73,0.8)" }); } }
function ring(x, y, col, max, dur) { rings.push({ x: x, y: y, col: col, max: max, dur: dur, t: 0 }); }
function fmtTime(s) { var m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ":" + (r < 10 ? "0" : "") + r; }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function banked() { return player.carry + player.stash; }
function printGap() { return BH.items.mod("printGap", 0.42); }
function isOpenGround(c) { return c === "." || c === "b"; }

function bfsCore(sx, sy, tx, ty, blocked) {
  var prev = new Int32Array(cols * rows).fill(-2), start = sy * cols + sx, q = [start], head = 0, best = start, bestD = 1e9, reached = false;
  prev[start] = -1;
  while (head < q.length) {
    var k = q[head++], x = k % cols, y = (k / cols) | 0, d = Math.abs(x - tx) + Math.abs(y - ty);
    if (d < bestD) { bestD = d; best = k; }
    if (d === 0) { reached = true; break; }
    for (var i = 0; i < 4; i++) {
      var nx = x + [1, -1, 0, 0][i], ny = y + [0, 0, 1, -1][i], nk = ny * cols + nx;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || prev[nk] !== -2 || blocked(nx, ny, nk)) continue;
      prev[nk] = k; q.push(nk);
    }
  }
  var out = [];
  for (var c = best; c !== -1 && c !== start; c = prev[c]) out.push([(c % cols + 0.5) * T, (((c / cols) | 0) + 0.5) * T]);
  return { path: out.reverse(), reached: reached };
}
function bfs(sx, sy, tx, ty, solid) { return bfsCore(sx, sy, tx, ty, function (x, y) { return solid(tile(x, y)); }).path; }

BH.features = (function () {
  var reg = {};
  return {
    register: function (id, def) { reg[id] = def || {}; return reg[id]; },
    get: function (id) { return reg[id] || null; },
    ids: function () { return Object.keys(reg); }
  };
})();
var activeFeatures = [], markers = {}, bakeDirty = false;
var featureApi = {
  T: T,
  get player() { return player; },
  get hunters() { return hunters; },
  get prints() { return prints; },
  get coins() { return coins; },
  get links() { return links; },
  get tiles() { return grid; },
  get markers() { return markers; },
  get level() { return L; },
  get levelIdx() { return game.levelIdx; },
  get time() { return simTime - levelStart; },
  get phase() { return game.phase; },
  tileAt: function (tx, ty) { return tile(tx, ty); },
  setTile: function (tx, ty, code) { if (!grid[ty] || grid[ty][tx] == null) return false; grid[ty][tx] = code; bakeDirty = true; return true; },
  pop: function (keyOrText, color) { if (F.words[keyOrText]) say(keyOrText, color); else popRaw(keyOrText, color); },
  say: function (key, color) { say(key, color); },
  win: function () { if (game.phase === "play") escaped(); },
  lose: function (reason) { if (game.phase === "play") caught(null, reason || "lost"); },
  rng: function () { return rnd(); },
  spawnHunter: function (def) { var h = makeHunter(def || {}); hunters.push(h); return h; },
  shake: function (t) { addTrauma(t); },
  noise: function (x, y, radiusTiles) { makeNoise(x, y, radiusTiles); },
  link: function (reason, x1, y1, x2, y2, opts) { return apiLink(reason, x1, y1, x2, y2, opts); }
};
function apiLink(reason, x1, y1, x2, y2, opts) {
  opts = opts || {};
  links++; if (opts.seg != null) bridges[opts.seg] = true;
  strings.push({ ax: x1, ay: y1, bx: x2, by: y2, t0: simTime, amount: opts.amount != null ? opts.amount : null, why: reason || "alone" });
  shake = Math.max(shake, 10); sfx("linked");
  var r = reason || "alone"; sayOr(r, String(r).toUpperCase(), C.string);
  if (opts.rush !== false && L.linkCalls !== false) { var h = nearestReachable(x2, y2); if (h) { h.state = "rush"; h.decoy = false; h.droneSent = false; h.target = { x: x2, y: y2 }; h.path = []; h.pathKey = ""; bossRushesLink(h); } }
  trace.push(simTime.toFixed(1) + " api.link " + r);
  return links;
}
function isLastLevel() { var list = window.LEVELS || LV; return game.levelIdx === list.length - 1 || !!(list[game.levelIdx] && list[game.levelIdx].finale); }
function startFeatures() {
  activeFeatures = [];
  (L.features || []).forEach(function (id) {
    var def = BH.features.get(id);
    if (!def) { trace.push("feature not registered: " + id); return; }
    var api = Object.create(featureApi); api.id = id; api.state = {};
    activeFeatures.push({ id: id, def: def, api: api });
  });
  activeFeatures.forEach(function (f) { if (f.def.onLevelStart) f.def.onLevelStart(L, f.api); });
}
function featureCall(name, arg) {
  for (var i = 0; i < activeFeatures.length; i++) { var f = activeFeatures[i]; if (f.def[name]) { if (arg === undefined) f.def[name](f.api); else f.def[name](arg, f.api); } }
}
function tileHook(name, tx, ty) { var d = TILE_DEFS[tile(tx, ty)]; if (d && d[name]) d[name](tx, ty, featureApi); }

var trauma = 0, hitstopUntil = 0, noises = [];
function addTrauma(t) { trauma = Math.min(1, Math.max(trauma, 0) + t); }
function hitstop(sec) { hitstopUntil = Math.max(hitstopUntil, performance.now() + sec * 1000); }
function makeNoise(x, y, radiusTiles, kind) {
  noises.push({ x: x, y: y, r: radiusTiles * T, t: simTime, kind: kind || "noise" });
  if (ghost) return;
  hunters.forEach(function (h) {
    if (h.state !== "patrol" && h.state !== "return" && h.state !== "search") return;
    if (Math.hypot(h.x - x, h.y - y) > radiusTiles * T) return;
    h.state = "check"; h.target = { x: x, y: y }; h.path = []; h.pathKey = ""; h.checkT = 0;
  });
}

function makeHunter(h) {
  var patrol = h.patrol || [[Math.floor(player.x / T), Math.floor(player.y / T)]], p = patrol[0], boss = BH.bosses.get(h.type);
  var sp = (ACT_SPEED[L.act] || ACT_SPEED[ACT_SPEED.length - 1]) * (boss && boss.speed ? boss.speed : 1);
  return { type: h.type || "hunter", sp: sp, x: (p[0] + 0.5) * T, y: (p[1] + 0.5) * T, dir: 0, patrol: patrol, wp: 1 % patrol.length, state: "patrol",
    path: [], pathKey: "", pathT: 0, followIdx: 0, ignoreBefore: 0, searchT: 0, target: null, step: 0, decoy: false, sus: 0, lastSeen: null };
}

function loadLevel(i, retry) {
  tapGo = null; sprintHeld = false;
  restartHold.armed = false; restartHold.t = 0;
  LV = window.LEVELS || LV;
  game.levelIdx = i; L = LV[i];
  var w = 0; L.map.forEach(function (r) { w = Math.max(w, r.length); });
  grid = L.map.map(function (r) { return (r + "#".repeat(w - r.length)).split(""); });
  rows = grid.length; cols = w;
  coins = []; stashes = []; towers = []; dens = null; markers = {}; var start = [1, 1];
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
    var c = grid[y][x], td = TILE_DEFS[c];
    if (td && td.marker) { (markers[c] = markers[c] || []).push({ tx: x, ty: y }); grid[y][x] = td.base || "."; continue; }
    var wet = grid[y][x - 1] === "~" && grid[y][x + 1] === "~";
    if (c === "P") { start = [x, y]; grid[y][x] = wet ? "~" : "."; }
    if (c === "c") { coins.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, got: false, ph: hash(x, y) * 6 }); grid[y][x] = wet ? "~" : "."; }
    if (c === "k") { stashes.push({ tx: x, ty: y, x: (x + 0.5) * T, y: (y + 0.5) * T, stored: 0 }); grid[y][x] = "~"; }
    if (c === "D") { dens = { tx: x, ty: y, x: (x + 0.5) * T, y: (y + 0.5) * T }; grid[y][x] = "."; }
    if (c === "d") { dens = { tx: x, ty: y, x: (x + 0.5) * T, y: (y + 0.5) * T, water: wet }; grid[y][x] = wet ? "~" : "."; }
    if (c === "T") towers.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, a: hash(x, y) * 6.28, cool: 0, hot: 0 });
  }
  player = { x: (start[0] + 0.5) * T, y: (start[1] + 0.5) * T, vx: 0, vy: 0, dir: "right", inShield: false, inBush: false, dist: 0, side: 1, seg: 0,
    entry: null, moving: false, sprinting: false, stamina: STAMINA, winded: false, carry: 0, stash: 0, stashCool: 0,
    anim: "idle", animT0: 0, spinUntil: 0, traveled: 0, sprintDist: 0, combo: 1, score: 0, seenThisLevel: false };
  VISION = ACT_VISION[L.act] || ACT_VISION[ACT_VISION.length - 1];
  hunters = (L.hunters || []).map(makeHunter);
  prints = []; strings = []; particles = []; rings = []; pops = []; floaters = []; links = 0; bridges = {}; trace = [];
  tufts = []; exitEvents = []; pendingLink = null; wave = null; done = {}; noises = []; trauma = 0; shake = 0;
  game.tracked = null; game.snapshot = null; game.caughtBy = null; game.caughtCard = false; game.loseReason = null; game.replay = null; pulse = null; snapPending = null;
  player.decoys = L.decoys ? BH.items.mod("decoys", L.decoys) : 0;
  player.tx = start[0]; player.ty = start[1];
  player.carry = L.startCarry || 0;
  player.inShield = isWater(grid[start[1]][start[0]]);
  if (BH.audio) BH.audio.setShielded(player.inShield, { sfx: false });
  game.phase = "play"; game.screen = "play"; levelStart = simTime; frozenUntil = 0; ghost = false; denFlash = 0; game.run = (game.run || 0) + 1;
  game.alarm = 0; game.shieldHeat = 0; game.unmatchedPending = null; game.towerCall = false; game.escapedAt = null; game.celeDone = false; game.celeFrames = 0;
  cam.x = player.x; cam.y = player.y;
  rngState = (i + 1) * 7919;
  bakeLevel(); bakeDirty = false; setupCrowd(); setupDrone();
  game.denDist0 = dens ? bfsCore(start[0], start[1], dens.tx, dens.ty, function (x, y) { return solidP(tile(x, y)); }).path.length : null;
  startFeatures();
  BH.items.hook("onLevelStart", i, !!retry);
  if (BH.audio) BH.audio.setAct((L.act || 0) + 1);
  if (BH.audio && BH.audio.setScene) BH.audio.setScene(L.music || (hunters.some(function (h) { return BH.bosses && BH.bosses.get(h.type); }) ? "boss" : null));
  if (typeof teachReset === "function") teachReset();
  hideOverlay(); updateStrip();
  if (BH.router) BH.router.at("level");
  showGoal(retry);
}
function startLevel(i) { if (BH.track) BH.track("level_start", { level: i + 1 }); loadLevel(i, false); }
function nextLevelIdx() { var u = unlockedUpTo(); for (var i = 0; i < u; i++) if (save.stars[i + 1] == null) return i; return Math.min(u, LV.length) - 1; }

var CAUGHT_REPLAY = 2.0;
function caught(h, reason) {
  game.phase = "caught"; addTrauma(0.9); hitstop(0.12); sfx("caught"); setAnim("caught"); if (reason !== "trail:robbed") say("caught", C.red);
  game.caughtBy = h || null; game.loseReason = reason || "caught";
  if (BH.track) BH.track("level_fail", { level: game.levelIdx + 1, reason: game.loseReason });
  game.replay = makeReplay(h);
  var n = game.levelIdx + 1, prevZec = save.bestZec[n] || 0;
  game.replay.saved = Math.max(0, banked() - prevZec);
  if (game.replay.saved) {
    save.bestZec[n] = Math.max(prevZec, banked());
    save.wallet = (save.wallet || 0) + game.replay.saved;
    persist();
  }
  frozenUntil = simTime + (game.loseReason === "trail:robbed" ? 1e-3 : CAUGHT_REPLAY);
}
function makeReplay(h) {
  var d0 = null, dNow = null;
  if (dens) {
    var tx = dens.tx, ty = dens.ty;
    dNow = bfsCore(Math.floor(player.x / T), Math.floor(player.y / T), tx, ty, function (x, y) { return solidP(tile(x, y)); }).path.length;
    d0 = game.denDist0 || dNow;
  }
  return { t0: simTime, zec: banked(), need: L.need, homeLeft: dNow, homeStart: d0, px: player.x, py: player.y,
    hx: h ? h.x : null, hy: h ? h.y : null, hdir: h ? h.dir : 0, htype: h ? h.type : null, how: h ? (h.caughtHow || "caught") : (game.loseReason || "caught"),
    cause: causeOf(h) };
}
function causeOf(h) {
  var run = prints.filter(function (p) { return p.seg === player.seg; }).length;
  return { pursuit: h && h.pursuit ? JSON.parse(JSON.stringify(h.pursuit)) : null, seen: h && h.seen ? { d: h.seen.d, sprint: h.seen.sprint } : null,
    steps: run, bush: !!player.inBush, sprint: !!player.sprinting, carry: player.carry, feature: h ? null : game.loseReason || null };
}
function retryNow() { if (BH.track) BH.track("level_start", { level: game.levelIdx + 1 }); frozenUntil = 0; loadLevel(game.levelIdx, true); }
function afterCaughtReplay() {
  frozenUntil = 0; trauma = 0; shake = 0;
  if (typeof showCaughtCard === "function") { game.caughtCard = true; showCaughtCard(); }
  else retryNow();
}
function tryDen() {
  if (dens.water && player.carry) { player.stash += player.carry; player.carry = 0; sfx("stash"); }
  if (banked() >= L.need) { escaped(); return; }
  if (simTime > denFlash) { denFlash = simTime + 1.5; popRaw("NEED " + (L.need - banked()) + " MORE", C.gold); }
}
function medalRules(secs) { return { home: banked() >= L.need, par: secs <= L.par, unseen: !player.seenThisLevel }; }
function escaped() {
  game.phase = "escaped"; game.escapedAt = simTime; sfx("escaped"); ring(player.x, player.y, "rgba(234,186,73,0.8)", T * 3, 0.7);
  player.spinUntil = simTime + spinDuration(); setAnim("spin");
  var nCoins = typeof caveCoinTotal === "function" ? caveCoinTotal() : coins.length;
  var secs = simTime - levelStart, allCoins = banked() >= nCoins;
  var stars = (allCoins ? 1 : 0) + (secs <= L.par ? 1 : 0) + (links === 0 ? 1 : 0);
  var n = game.levelIdx + 1;
  var bonus = player.seenThisLevel ? 0 : 500;
  var medals = medalRules(secs); medals.home = true;
  var prevZec = save.bestZec[n] || 0, paid = Math.max(0, banked() - prevZec);
  game.result = { secs: secs, zec: banked(), total: nCoins, links: links, prints: prints.length, stars: stars, score: player.score + bonus, ghostBonus: bonus, bestBefore: save.best[n],
    medals: medals, paid: paid, bestZecBefore: prevZec };
  BH.items.hook("onEscape", game.result);
  save.stars[n] = Math.max(save.stars[n] || 0, stars);
  if (!save.best[n] || secs < save.best[n]) save.best[n] = secs;
  var m = save.medals[n] = save.medals[n] || {};
  Object.keys(medals).forEach(function (k) { if (medals[k]) m[k] = true; });
  save.bestZec[n] = Math.max(prevZec, banked());
  save.wallet = (save.wallet || 0) + paid;
  persist();
  if (snapPending) takeTrackedSnapshot();
  if (!game.snapshot) takeTrailSnapshot();
  var wonRun = game.run;
  setTimeout(function () {
    if (game.run !== wonRun || !/^(play|pause)$/.test(game.screen)) return;
    if (isLastLevel()) showFinale(); else showComplete();
  }, 750);
}

function step(dt) {
  simTime += dt;
  if (game.phase === "play") {
    if (stepRestartHold(dt)) return;
    tickIn = sampleInput();
    try { stepPlay(dt); } finally { tickIn = null; }
  } else if (game.phase === "caught" && frozenUntil && simTime >= frozenUntil) afterCaughtReplay();
  else if (game.phase === "escaped") { if (simTime >= player.spinUntil) setAnim("idle"); }
  stepAfter(dt);
}
function stepPlay(dt) {
  {
    movePlayer(dt);
    coins.forEach(function (c) {
      if (!c.got && Math.hypot(c.x - player.x, c.y - player.y) < T * 0.55) {
        c.got = true; player.carry++; done.coin = true;
        BH.items.hook("onCoin", c);
        var hunted = hunters.some(function (h) { return h.state === "chase" || h.state === "rush"; });
        player.combo = hunted ? 1 : Math.min(5, player.combo + (player.carry > 1 ? 1 : 0));
        player.score += 100 * player.combo;
        var G = F.gp || {};
        floatText(c.x, c.y - 8, G.coin || "+1 ZEC", C.gold, player.combo > 1 ? "×" + player.combo + " " + (G.combo || "COMBO") : "");
        sfx("coin", { combo: player.combo }); puff(c.x, c.y, 12, "rgba(234,186,73,0.95)", 50); ring(c.x, c.y, "rgba(234,186,73,0.7)", T, 0.4);
      }
    });
    var CHF = BH.characters, fid = CHF && CHF.stepFound ? CHF.stepFound(save, game.levelIdx + 1, player.x, player.y, T, !!(BH.cave && BH.cave.inside())) : null;
    if (fid) { persist(); popRaw("You found BitFoot #" + CHF.get(fid).art + "!", C.gold); sfx("buy"); }
    stepCrowd(dt); resolvePending(); stepDrone(dt);
    if (snapPending && simTime >= snapPending.t) takeTrackedSnapshot();
    towers.forEach(function (t) { stepTower(t, dt); });
    hunters.forEach(function (h) { stepHunter(h, dt); });
    if (game.phase === "play") { stepPressure(dt); stepTeachWatch(); BH.items.hook("onStep", dt); featureCall("onStep", dt); }
    if (game.phase === "play" && dens && Math.floor(player.x / T) === dens.tx && Math.floor(player.y / T) === dens.ty) tryDen();
  }
}
function stepAfter(dt) {
  particles = particles.filter(function (p) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; return p.t < p.life; });
  rings = rings.filter(function (r) { r.t += dt; return r.t < r.dur; });
  floaters = floaters.filter(function (f) { return simTime - f.t0 < f.life; });
  noises = noises.filter(function (n) { return simTime - n.t < 0.9; });
  pops = pops.filter(function (p) { return simTime - p.t0 < (p.life || (p.sub ? 2.6 : 1.1)); });
  tufts = tufts.filter(function (t) { return simTime - t.t < 6; });
  if (shake > 0) { trauma = Math.max(trauma, Math.min(1, shake / 16)); shake = 0; }
  trauma = Math.max(0, trauma - 1.5 * dt);
  var camX = player.x, camY = player.y;
  if (game.phase === "caught" && game.replay && game.replay.hx != null) { camX = (game.replay.hx + player.x) / 2; camY = (game.replay.hy + player.y) / 2; }
  var focus = typeof window.camFocus === "function" ? window.camFocus() : null;
  if (focus) { cam.x = focus.x; cam.y = focus.y; return; }
  var k = 1 - Math.exp(-dt * 6); cam.x += (camX - cam.x) * k; cam.y += (camY - cam.y) * k;
}

var ALARM_STEP = 30, ALARM_MAX = 4;
function stepPressure(dt) {
  game.shieldHeat = 0;
  var over = simTime - levelStart - L.par, notch = over > 0 ? Math.min(ALARM_MAX, 1 + Math.floor(over / ALARM_STEP)) : 0;
  if (notch > game.alarm) { game.alarm = notch; sayOr("alarm", "ALARM " + notch, C.red); addTrauma(0.2); trace.push(simTime.toFixed(1) + " alarm " + notch); }
}
function stepTeachWatch() {
  var u = game.unmatchedPending;
  if (u && simTime - u.t >= CROWD_WINDOW) { game.unmatchedPending = null; if (links === u.links) teach("unmatched", {}); }
  if (game.towerCall) {
    var called = hunters.filter(function (h) { return h.towerCalled; });
    if (called.every(function (h) { return h.state === "search" || h.state === "return" || h.state === "patrol"; })) {
      called.forEach(function (h) { h.towerCalled = false; }); game.towerCall = false; teach("towerPassed", {});
    }
  }
}
function alarmSpeed() { return 1 + 0.06 * (game.alarm || 0); }

var last = performance.now(), acc = 0;
var winFocused = !(document.hasFocus && !document.hasFocus()), bgWaiters = [];
window.addEventListener("focus", function () { winFocused = true; var w = bgWaiters; bgWaiters = []; w.forEach(function (f) { f(); }); });
window.addEventListener("blur", function () { winFocused = false; });
BH.nextFrame = function (fn, idle) {
  if (!idle || winFocused) { requestAnimationFrame(fn); return; }
  var done = false, go = function () { if (done) return; done = true; clearTimeout(tm); requestAnimationFrame(fn); };
  var tm = setTimeout(go, 100); bgWaiters.push(go);
};
var loopAsleep = false, loopResync = false, screenNow = game.screen;
Object.defineProperty(game, "screen", { enumerable: true, configurable: true,
  get: function () { return screenNow; },
  set: function (v) { screenNow = v; if (loopAsleep) { loopAsleep = false; loopResync = true; requestAnimationFrame(frame); } } });
function menuCoversGame() {
  if (game.screen === "play" || typeof getComputedStyle !== "function" || !document.getElementById) return false;
  var o = document.getElementById("overlay");
  if (!o || !o.classList || !o.classList.contains("on")) return false;
  var bg = getComputedStyle(o).backgroundColor || "";
  return /^rgb\(/.test(bg) || /^rgba\(.*,\s*1\)$/.test(bg);
}
function frame(now) {
  var woke = loopResync;
  if (loopResync) { loopResync = false; last = now; }
  var dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (BH.clip && BH.clip.step) BH.clip.step(now, woke);
  screensSeen[game.screen] = true;
  if (game.screen === "play" && bake) {
    if (now < hitstopUntil) dt = 0;
    acc += dt;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    var danger = 0;
    if (game.phase === "play") hunters.forEach(function (h) {
      var v = Math.max(0, 1 - dist(h, player) / T / 10);
      if (h.state === "chase" || (h.state === "rush" && !h.decoy)) v = Math.max(v, 0.85); else if (h.state === "follow") v = Math.max(v, 0.55);
      danger = Math.max(danger, v);
    });
    if (BH.audio) BH.audio.setDanger(danger); else Snd.heart(danger);
    game.danger = danger;
  } else { acc = 0; if (BH.audio && game.danger) { BH.audio.setDanger(0); game.danger = 0; } }
  if (menuCoversGame()) { loopAsleep = true; return; }
  if (game.screen === "pause") { loopAsleep = true; return; }
  render();
  BH.nextFrame(frame, game.screen !== "play");
}
function boot() {
  wireAudioFacade();
  if (BH.items) ["count", "consume", "add"].forEach(function (k) { if (!BH.items[k]) BH.items[k] = { count: invCount, consume: invConsume, add: invAdd }[k]; });
  if (!(BH.router && BH.router.boot())) showTitle();
  requestAnimationFrame(frame);
}
var fontsReady = document.fonts ? Promise.all(["500 12px 'Plex Cond'", "600 48px 'Plex Cond'", "500 14px 'Plex Mono'", "600 11px 'Plex Mono'"].map(function (f) { return document.fonts.load(f); })).catch(function () {}) : Promise.resolve();
var domReady = new Promise(function (r) { if (document.readyState && document.readyState === "loading") document.addEventListener("DOMContentLoaded", r); else r(); });
Promise.all([fontsReady, domReady, new Promise(function (r) { if (fallbackSprite.complete) r(); else { fallbackSprite.onload = r; fallbackSprite.onerror = r; } })]).then(boot);
