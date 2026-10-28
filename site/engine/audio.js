(function () {
  "use strict";
  var W = window;
  W.BH = W.BH || {};

  var AC = W.AudioContext || W.webkitAudioContext;
  var ac = null, failed = false;
  var nodes = {};
  var st = {
    danger: 0, shielded: false, act: 1, muted: false, vol: 0.8, heart: true, music: true, scene: null
  };
  var dbg = { created: 0, live: 0, notes: { l1: 0, l2: 0, l3: 0, heart: 0 }, sfx: {}, skipped: 0, errors: [] };
  var lastSfx = {};
  var MAX_VOICES = 64;

  var ACT_SCENE = [null, "forest", "river", "forest", "river", "caves", "ice", "river", "fort", "forest"];
  var SCENE_NAMES = ["forest", "sneak", "hunted", "river", "caves", "fort", "ice", "puzzle", "boss", "clear"];
  var MUSIC_GAIN = 0.2;
  var XF = 1.75;
  var CALM = 4;
  var STEALTH_ONLY = true;

  function logErr(where, e) { if (dbg.errors.length < 20) dbg.errors.push(where + ": " + (e && e.message || e)); }
  function clamp(v, a, b) { v = +v; if (!(v === v)) v = a; return v < a ? a : v > b ? b : v; }
  function now() { return ac ? ac.currentTime : 0; }

  function makeImpulse(sec, decay) {
    var len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  function build() {
    var n = nodes;
    n.master = ac.createGain(); n.master.gain.value = st.muted ? 0 : st.vol;
    n.analyser = ac.createAnalyser(); n.analyser.fftSize = 1024;
    n.master.connect(ac.destination); n.master.connect(n.analyser);
    n.bus = ac.createGain();
    n.shieldLP = ac.createBiquadFilter(); n.shieldLP.type = "lowpass"; n.shieldLP.Q.value = 0.9;
    n.shieldLP.frequency.value = st.shielded ? 600 : 18000;
    n.dry = ac.createGain(); n.dry.gain.value = st.shielded ? 0.8 : 1;
    n.verb = ac.createConvolver(); n.verb.buffer = makeImpulse(2.2, 2.6);
    n.wet = ac.createGain(); n.wet.gain.value = st.shielded ? 0.55 : 0.07;
    n.bus.connect(n.shieldLP); n.shieldLP.connect(n.dry); n.dry.connect(n.master);
    n.shieldLP.connect(n.verb); n.verb.connect(n.wet); n.wet.connect(n.master);
    n.sfx = ac.createGain(); n.sfx.gain.value = 0.9; n.sfx.connect(n.bus);
    n.music = ac.createGain(); n.music.gain.value = st.music ? MUSIC_GAIN : 0.0001; n.music.connect(n.bus);
    n.duck = ac.createGain(); n.duck.gain.value = 1; n.duck.connect(n.music);
    var len = ac.sampleRate, nb = ac.createBuffer(1, len, ac.sampleRate), d = nb.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    n.noise = nb;
    dbg.created += 11;
  }

  function track(src, parts) {
    dbg.created += parts.length + 1; dbg.live++;
    src.onended = function () {
      dbg.live--;
      try { src.disconnect(); } catch (e) {}
      for (var i = 0; i < parts.length; i++) { try { parts[i].disconnect(); } catch (e) {} }
    };
  }
  function busy() { return dbg.live >= MAX_VOICES; }
  function env(g, t, a, peak, d) {
    peak = Math.max(peak, 0.0002);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.max(a, 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, 0.002) + Math.max(d, 0.01));
  }
  function panner(p, out) {
    if (!p || !ac.createStereoPanner) return out;
    var sp = ac.createStereoPanner(); sp.pan.value = clamp(p, -1, 1); sp.connect(out); return sp;
  }
  function tone(dest, type, f0, f1, dur, vol, when, o) {
    if (busy()) { dbg.skipped++; return; }
    o = o || {};
    var t = when || ac.currentTime, osc = ac.createOscillator(), g = ac.createGain(), parts = [g], out = dest;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(f0, 1), t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    env(g, t, o.attack || 0.006, vol, dur);
    if (o.pan) { out = panner(o.pan, dest); parts.push(out); }
    if (o.lp) {
      var f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(o.lp, t);
      osc.connect(f); f.connect(g); parts.push(f);
    } else osc.connect(g);
    g.connect(out);
    track(osc, parts);
    osc.start(t); osc.stop(t + (o.attack || 0.006) + dur + 0.05);
  }
  function noise(dest, dur, vol, type, freq, freqEnd, when, o) {
    if (busy()) { dbg.skipped++; return; }
    o = o || {};
    var t = when || ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), parts = [f, g], out = dest;
    s.buffer = nodes.noise; s.loop = true;
    f.type = type || "lowpass"; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(Math.max(freq, 20), t);
    if (freqEnd && freqEnd !== freq) f.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t + dur);
    env(g, t, o.attack || 0.004, vol, dur);
    if (o.pan) { out = panner(o.pan, dest); parts.push(out); }
    s.connect(f); f.connect(g); g.connect(out);
    track(s, parts);
    s.start(t, Math.random() * 0.5); s.stop(t + (o.attack || 0.004) + dur + 0.05);
  }
  function duck(amount, hold) {
    var g = nodes.duck.gain, t = now();
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(amount, t + 0.04); g.setTargetAtTime(1, t + hold, 0.35);
  }

  var S = function () { return nodes.sfx; };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var FX = {
    step: function (o) {
      var t = now(), side = (dbg.sfx.step || 0) % 2 ? 0.25 : -0.25, v = (o.vol || 1);
      noise(S(), rnd(0.05, 0.08), 0.12 * v, "lowpass", rnd(500, 900), 180, t, { pan: side });
      tone(S(), "sine", rnd(95, 125), 60, 0.07, 0.07 * v, t, { pan: side });
    },
    sprint: function (o) {
      var t = now(), v = (o.vol || 1);
      noise(S(), rnd(0.07, 0.1), 0.22 * v, "bandpass", rnd(1400, 2200), 700, t, { q: 1.2, pan: rnd(-0.3, 0.3) });
      tone(S(), "sine", rnd(120, 150), 55, 0.08, 0.12 * v, t);
    },
    coin: function (o) {
      var c = Math.max(1, o.combo || 1), f = 988 * (1 + (Math.min(c, 12) - 1) * 0.12), t = now();
      tone(S(), "square", f, f * 1.5, 0.08, 0.06, t, { lp: 5000 });
      tone(S(), "square", f * 1.5, f * 2, 0.12, 0.05, t + 0.07, { lp: 5000 });
      tone(S(), "sine", f * 2, f * 2, 0.25, 0.03, t + 0.07);
    },
    stash: function () { tone(S(), "triangle", 660, 440, 0.15, 0.08); },
    voice: function (o) {
      var f = o.f || 300;
      tone(S(), o.wave || "square", f, f * (o.slide || 1), 0.045, o.vol || 0.045, now(), { lp: 3200 });
      if (o.oct) tone(S(), "square", f * 2, f * 2 * (o.slide || 1), 0.04, (o.vol || 0.045) * 0.45, now(), { lp: 2400 });
    },
    talkOpen: function () { var t = now(); tone(S(), "square", 523, 523, 0.05, 0.045, t, { lp: 3000 }); tone(S(), "square", 784, 784, 0.07, 0.045, t + 0.05, { lp: 3000 }); },
    talkNext: function () { tone(S(), "triangle", 1100, 760, 0.035, 0.07); },
    talkClose: function () { var t = now(); tone(S(), "square", 784, 784, 0.05, 0.035, t, { lp: 3000 }); tone(S(), "square", 523, 523, 0.07, 0.035, t + 0.05, { lp: 3000 }); },
    ask: function () { var t = now(); tone(S(), "sine", 1319, 1319, 0.14, 0.06, t); tone(S(), "sine", 1760, 1760, 0.2, 0.05, t + 0.07); },
    walletLand: function () {
      var t = now();
      tone(S(), "sine", 150, 70, 0.14, 0.16, t);
      noise(S(), 0.07, 0.09, "lowpass", 700, 300, t);
      tone(S(), "square", 659, 659, 0.05, 0.035, t + 0.06, { lp: 4000 });
    },
    coinIn: function () { var t = now(); tone(S(), "triangle", 1568, 2093, 0.06, 0.06, t); tone(S(), "sine", 2093, 2093, 0.18, 0.03, t + 0.04); },
    gate: function () {
      var t = now();
      tone(S(), "sawtooth", 190, 120, 0.5, 0.045, t, { lp: 900 });
      noise(S(), 0.45, 0.07, "bandpass", 400, 900, t, { q: 4 });
      tone(S(), "sine", 95, 45, 0.22, 0.18, t + 0.45);
      noise(S(), 0.12, 0.08, "lowpass", 500, 200, t + 0.45);
    },
    solved: function () { var t = now(); [659, 784, 1047].forEach(function (f, i) { tone(S(), "square", f, f, i < 2 ? 0.08 : 0.22, 0.055, t + i * 0.08, { lp: 5000 }); }); tone(S(), "sine", 2093, 2093, 0.3, 0.025, t + 0.16); },
    whoosh: function () { noise(S(), 0.45, 0.13, "bandpass", 300, 1600, now(), { q: 0.8, attack: 0.18 }); },
    warpOut: function () {
      var t = now();
      tone(S(), "sawtooth", 110, 1700, 0.8, 0.05, t, { lp: 2600 });
      tone(S(), "square", 220, 3300, 0.8, 0.025, t, { detune: 14, lp: 4200 });
      noise(S(), 0.8, 0.1, "bandpass", 300, 5200, t, { q: 3 });
      for (var i = 0; i < 7; i++) tone(S(), "sine", 600 + i * 230, 950 + i * 320, 0.05, 0.03, t + 0.1 * i);
    },
    warpIn: function () {
      var t = now();
      tone(S(), "sawtooth", 2600, 55, 0.35, 0.08, t, { lp: 3000 });
      tone(S(), "sine", 95, 32, 0.7, 0.2, t);
      noise(S(), 0.55, 0.25, "lowpass", 3200, 180, t);
      [1319, 1760, 2637].forEach(function (f, i) { tone(S(), "triangle", f, f * 1.03, 0.12, 0.035, t + 0.18 + i * 0.07); });
      duck(0.4, 0.4);
    },
    splash: function () { noise(S(), 0.45, 0.3, "lowpass", 1400, 400); tone(S(), "sine", 420, 160, 0.3, 0.08); },
    splashIn: function () {
      var t = now();
      noise(S(), 0.5, 0.32, "lowpass", 2600, 300, t);
      tone(S(), "sine", 520, 140, 0.35, 0.1, t);
      tone(S(), "sine", 300, 600, 0.12, 0.05, t + 0.18);
      tone(S(), "sine", 380, 760, 0.1, 0.04, t + 0.3);
    },
    splashOut: function () {
      var t = now();
      noise(S(), 0.35, 0.22, "highpass", 600, 3000, t, { attack: 0.08 });
      tone(S(), "sine", 900, 1500, 0.08, 0.05, t + 0.3);
    },
    spotted: function () {
      var t = now(); duck(0.25, 0.5);
      tone(S(), "sawtooth", 880, 880, 0.12, 0.09, t, { lp: 3000 });
      tone(S(), "square", 1175, 1175, 0.18, 0.06, t + 0.08, { lp: 3000 });
      tone(S(), "sawtooth", 220, 110, 0.35, 0.1, t);
      noise(S(), 0.18, 0.15, "highpass", 3000, 6000, t);
    },
    suspicion: function (o) {
      var lv = clamp(o.level == null ? 0.5 : o.level, 0, 1), f = 520 * Math.pow(2, lv * 1.1);
      tone(S(), "triangle", f, f * 1.06, 0.06, 0.05 + 0.04 * lv, now());
    },
    caught: function () {
      var t = now(); duck(0.05, 1.6);
      tone(S(), "sine", 140, 40, 0.6, 0.4, t);
      tone(S(), "sawtooth", 196, 98, 0.7, 0.08, t, { lp: 900 });
      tone(S(), "sawtooth", 185, 92, 0.7, 0.08, t + 0.02, { lp: 900 });
      noise(S(), 0.35, 0.22, "lowpass", 600, 150, t);
    },
    escaped: function () {
      var t = now(), ns = [523.25, 659.25, 783.99, 1046.5]; duck(0.3, 1.0);
      ns.forEach(function (f, i) { tone(S(), "triangle", f, f, 0.2, 0.1, t + i * 0.09); tone(S(), "square", f, f, 0.08, 0.025, t + i * 0.09, { lp: 4000 }); });
      tone(S(), "triangle", 1046.5, 1046.5, 0.6, 0.08, t + 0.36); tone(S(), "triangle", 1318.5, 1318.5, 0.6, 0.06, t + 0.36);
      for (var i = 0; i < 5; i++) tone(S(), "sine", 2093 * (1 + i * 0.12), 2093 * (1 + i * 0.12), 0.1, 0.02, t + 0.45 + i * 0.05);
    },
    decoy: function () { var t = now(); noise(S(), 0.14, 0.18, "bandpass", 2600, 1200, t, { q: 2 }); tone(S(), "triangle", 880, 440, 0.2, 0.06, t); tone(S(), "sine", 300, 180, 0.08, 0.08, t + 0.32); },
    bark: function () {
      var t = now();
      [0, 0.16].forEach(function (d) {
        tone(S(), "sawtooth", 420, 190, 0.09, 0.09, t + d, { lp: 1400 });
        noise(S(), 0.07, 0.12, "bandpass", 900, 500, t + d, { q: 1.5 });
      });
    },
    drone: function () {
      var t = now();
      tone(S(), "sawtooth", 180, 196, 0.9, 0.035, t, { attack: 0.25, lp: 1200 });
      tone(S(), "sawtooth", 182, 199, 0.9, 0.035, t, { attack: 0.25, lp: 1200, detune: 9 });
      tone(S(), "square", 1200, 900, 0.06, 0.03, t + 0.1, { lp: 3000 });
    },
    tower: function () {
      var t = now();
      noise(S(), 1.1, 0.12, "bandpass", 400, 2400, t, { q: 4, attack: 0.3, pan: -0.5 });
      tone(S(), "sine", 330, 440, 1.0, 0.03, t, { attack: 0.3 });
    },
    linked: function () {
      var t = now(); duck(0.2, 0.9);
      tone(S(), "sawtooth", 180, 60, 0.6, 0.14, t, { lp: 1600 });
      tone(S(), "square", 90, 45, 0.5, 0.07, t, { lp: 800 });
      tone(S(), "triangle", 622, 587, 0.5, 0.05, t + 0.05);
    },
    crowd: function () {
      var t = now();
      for (var i = 0; i < 6; i++) noise(S(), rnd(0.25, 0.5), 0.06, "bandpass", rnd(350, 900), rnd(300, 800), t + i * 0.09, { q: 5, attack: 0.05, pan: rnd(-0.6, 0.6) });
    },
    boss: function () {
      var t = now(); duck(0.2, 1.5);
      tone(S(), "sine", 65, 55, 1.6, 0.3, t, { attack: 0.01 });
      tone(S(), "triangle", 98, 97, 1.4, 0.08, t);
      tone(S(), "sawtooth", 131, 262, 0.9, 0.04, t + 0.2, { lp: 1500, attack: 0.4 });
      noise(S(), 1.0, 0.1, "bandpass", 200, 3000, t, { q: 3, attack: 0.6 });
    },
    click: function () { tone(S(), "triangle", 1400, 900, 0.03, 0.05); },
    hover: function () { tone(S(), "sine", 1800, 1900, 0.02, 0.018); },
    buy: function () { var t = now(); [659, 988].forEach(function (f, i) { tone(S(), "square", f, f, 0.1, 0.06, t + i * 0.08, { lp: 5000 }); }); },
    heartbeat: function (o) {
      var t = now(), dg = clamp(o.danger == null ? st.danger : o.danger, 0, 1); dbg.notes.heart++;
      tone(S(), "sine", 70, 38, 0.14, 0.22 + 0.45 * dg, t); tone(S(), "sine", 62, 34, 0.12, 0.13 + 0.3 * dg, t + 0.17);
    }
  };
  var ALIAS = { sniff: "suspicion", confused: "crowd", win: "escaped", exit: "splashOut", heart: "heartbeat" };
  var MIN_GAP = { step: 0.06, sprint: 0.06, hover: 0.04, suspicion: 0.05, click: 0.02, coin: 0.02, heartbeat: 0.4, voice: 0.04, talkNext: 0.05, ask: 0.3, coinIn: 0.05, whoosh: 0.3 };

  var seq = { next: 0, timer: null, patAct: 0 };
  var mus = {
    players: [], cur: null, scene: null, since: -99, hunt: false, sneak: false, huntCalm: null, sneakCalm: null,
    latch: null, huntNext: "hunted", picks: [], xfades: 0, maxAlive: 0, want: null,
    rec: {}
  };
  function haveMusic() { return !!(W.BH.music && W.BH.music.player); }
  function inCave() { var cv = W.BH.cave; try { return !!(cv && cv.inside && cv.inside()); } catch (e) { return false; } }
  function baseScene() { return st.scene || (inCave() ? "caves" : null) || ACT_SCENE[st.act] || "forest"; }
  function updateDangerState(t) {
    var d = st.danger;
    if (d >= 0.8) { mus.hunt = true; mus.huntCalm = null; }
    else if (mus.hunt) { if (d >= 0.5) mus.huntCalm = null; else if (mus.huntCalm == null) mus.huntCalm = t; else if (t - mus.huntCalm >= CALM) mus.hunt = false; }
    if (d >= 0.45) { mus.sneak = true; mus.sneakCalm = null; }
    else if (mus.sneak) { if (d >= 0.3) mus.sneakCalm = null; else if (mus.sneakCalm == null) mus.sneakCalm = t; else if (t - mus.sneakCalm >= CALM) mus.sneak = false; }
  }
  function wantedScene() {
    if (mus.latch) return mus.latch;
    var base = baseScene();
    if (base === "boss" || base === "clear") return base;
    if (mus.hunt) return "hunted";
    if (mus.sneak) return "sneak";
    return base;
  }
  function huntTrack() {
    var want = mus.huntNext, got = want;
    if (want === "uncatchable" && !recOf("uncatchable").buf) got = "hunted";
    if (got === "uncatchable") mus.huntNext = "hunted"; else if (want === "hunted") mus.huntNext = "uncatchable";
    mus.picks.push(got); if (mus.picks.length > 20) mus.picks.shift();
    loadRecorded("uncatchable");
    return got;
  }
  function trackFor(scene) { var S = W.BH.music.SCENES; return S[scene] || S.forest; }
  function recRow(id) { var R = W.BH.music && W.BH.music.RECORDED; return R && Object.prototype.hasOwnProperty.call(R, id) ? R[id] : null; }
  function recOf(id) {
    var row = recRow(id);
    return mus.rec[id] || (mus.rec[id] = { state: "idle", buf: null, url: null, tries: 0, pos: row ? row.start || 0 : 0 });
  }
  function playable(id) {
    var row = recRow(id); if (!row) return id;
    if (recOf(id).buf) return id;
    loadRecorded(id);
    return row.fallback;
  }
  function startTrack(id) {
    var M = W.BH.music, row = recRow(id);
    if (mus.cur && mus.cur.position && recRow(mus.cur.id)) recOf(mus.cur.id).pos = mus.cur.position();
    var p = row ? M.bufferPlayer(ac, nodes.duck, recOf(id).buf, id, recOf(id).pos) : M.player(ac, nodes.duck, id);
    p.setDanger(st.danger);
    mus.players.forEach(function (q) { if (q !== mus.cur) q.stop(0.15); });
    mus.players = [];
    if (mus.cur) { mus.cur.stop(XF); mus.players.push(mus.cur); mus.xfades++; }
    p.fade(1, mus.cur ? XF : 0.6);
    mus.players.push(p); mus.cur = p;
    dbg.created++;
  }
  function applyScene(t) {
    if (!haveMusic()) return;
    updateDangerState(t);
    var want = wantedScene();
    if (want !== mus.scene) {
      if (mus.scene && t - mus.since < 1.5 && !(want === "hunted" || want === "boss" || want === "clear")) return;
      mus.want = want === "hunted" && !STEALTH_ONLY ? huntTrack() : trackFor(want);
      mus.scene = want; mus.since = t;
    }
    var id = playable(mus.want);
    if (mus.cur && mus.cur.id === id) return;
    try { startTrack(id); } catch (e) { logErr("music", e); }
  }
  function tick() {
    if (!ac || ac.state !== "running") return;
    try {
      var t0 = ac.currentTime;
      mus.players = mus.players.filter(function (p) { return p === mus.cur || !p.gone(); });
      if (st.muted || !st.music) { seq.next = t0 + 0.05; return; }
      applyScene(t0);
      for (var i = 0; i < mus.players.length; i++) {
        var p = mus.players[i];
        p.setDanger(st.danger);
        try { p.pump(t0 + 0.12); } catch (e) { logErr("step", e); }
      }
      if (W.BH.music) mus.maxAlive = Math.max(mus.maxAlive, W.BH.music.alive());
      seq.next = t0 + 0.12;
    } catch (e) { logErr("tick", e); }
  }
  function loadRecorded(id) {
    var row = recRow(id); if (!row) return;
    var u = recOf(id);
    if (!ac || (u.state !== "idle" && u.state !== "retry")) return;
    var ogg = false;
    try { var el = W.document && W.document.createElement("audio"); ogg = !!(el && el.canPlayType && el.canPlayType('audio/ogg; codecs="vorbis"')); } catch (e) {}
    var url = u.state === "retry" || !ogg ? row.m4a : row.ogg;
    u.state = "loading"; u.url = url; u.tries++;
    if (!W.fetch) { u.state = "failed"; return; }
    W.fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.arrayBuffer(); }).then(function (data) {
      return new Promise(function (res, rej) { var pr = ac.decodeAudioData(data, res, rej); if (pr && pr.then) pr.then(res, rej); });
    }).then(function (buf) { u.buf = buf; u.state = "ready"; u.seconds = buf.duration; u.length = buf.length; }, function (e) {
      u.error = String(e && e.message || e);
      u.state = url === row.ogg ? "retry" : "failed";
      if (u.state === "retry") loadRecorded(id);
    });
  }
  function loadLevelTracks() {
    var R = W.BH.music && W.BH.music.RECORDED; if (!R) return;
    Object.keys(R).forEach(function (id) { if (R[id].load === "level") loadRecorded(id); });
  }
  function calmStart() { mus.latch = null; mus.hunt = mus.sneak = false; mus.huntCalm = mus.sneakCalm = null; mus.since = -99; }
  function applyActDrone() { mus.since = -99; }
  function applyDanger() { seq.appliedDanger = st.danger; }
  function applyShield(withSfx) {
    var t = now(), n = nodes, on = st.shielded;
    if (withSfx) { var nm = on ? "splashIn" : "splashOut"; dbg.sfx[nm] = (dbg.sfx[nm] || 0) + 1; FX[nm]({}); }
    var at = t + (on ? 0.12 : 0);
    n.shieldLP.frequency.cancelScheduledValues(t); n.shieldLP.frequency.setValueAtTime(n.shieldLP.frequency.value, t);
    n.shieldLP.frequency.setValueAtTime(n.shieldLP.frequency.value, at);
    n.shieldLP.frequency.exponentialRampToValueAtTime(on ? 600 : 18000, at + 0.15);
    n.wet.gain.setTargetAtTime(on ? 0.55 : 0.07, at, 0.08);
    n.dry.gain.setTargetAtTime(on ? 0.8 : 1, at, 0.08);
  }
  function applyVolume() {
    var t = now(), g = nodes.master.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.setTargetAtTime(st.muted ? 0 : st.vol, t, 0.03);
  }

  var hidSusp = false;
  if (W.document && W.document.addEventListener) W.document.addEventListener("visibilitychange", function () {
    try {
      if (!ac) return;
      if (W.document.hidden && ac.state === "running") { hidSusp = true; ac.suspend(); }
      else if (!W.document.hidden && hidSusp) { hidSusp = false; ac.resume(); seq.next = ac.currentTime + 0.1; }
    } catch (e) {}
  });

  function ready() { return !!ac && !!nodes.master; }
  function init() {
    try {
      if (!ac && !failed) {
        if (!AC) { failed = true; return false; }
        ac = new AC();
        build();
        seq.next = ac.currentTime + 0.1; seq.patAct = st.act; applyActDrone(); applyDanger();
        seq.timer = setInterval(tick, 25);
      }
      if (ac && ac.state === "suspended" && ac.resume) ac.resume().catch(function () {});
      return !!ac;
    } catch (e) { failed = true; ac = null; logErr("init", e); return false; }
  }
  function guard(fn) { return function () { try { return fn.apply(null, arguments); } catch (e) { logErr("api", e); } }; }

  var api = {
    init: guard(init),
    setDanger: guard(function (v) {
      st.danger = clamp(v, 0, 1);
      if (ready() && (seq.appliedDanger == null || Math.abs(st.danger - seq.appliedDanger) >= 0.01 || (st.danger !== seq.appliedDanger && (st.danger === 0 || st.danger === 1)))) applyDanger();
      return st.danger;
    }),
    setShielded: guard(function (on, o) {
      on = !!on; var changed = on !== st.shielded; st.shielded = on;
      if (ready() && changed) applyShield(!(o && o.sfx === false) && !st.muted);
      return on;
    }),
    setAct: guard(function (n) { st.act = Math.round(clamp(n, 1, 9)); calmStart(); if (ready()) loadLevelTracks(); return st.act; }),
    setScene: guard(function (name) {
      st.scene = SCENE_NAMES.indexOf(name) >= 0 ? name : null; calmStart();
      if (ready()) loadLevelTracks();
      return st.scene;
    }),
    sfx: guard(function (name, o) {
      name = ALIAS[name] || name;
      if (name === "escaped" && ready()) { mus.latch = "clear"; mus.hunt = mus.sneak = false; }
      if (typeof o === "number") o = { combo: o, level: o, danger: o };
      var fn = FX[name];
      if (!fn) { logErr("sfx", "unknown sound " + name); return false; }
      if (!ready() || st.muted || ac.state !== "running") { dbg.skipped++; return false; }
      var t = ac.currentTime;
      if (MIN_GAP[name] && lastSfx[name] && t - lastSfx[name] < MIN_GAP[name]) return false;
      lastSfx[name] = t;
      dbg.sfx[name] = (dbg.sfx[name] || 0) + 1;
      fn(o || {});
      return true;
    }),
    mute: guard(function (m) { st.muted = m === undefined ? !st.muted : !!m; if (ready()) applyVolume(); return st.muted; }),
    volume: guard(function (v) { if (v !== undefined) { st.vol = clamp(v, 0, 1); if (ready()) applyVolume(); } return st.vol; }),
    setHeartbeat: guard(function (on) { st.heart = !!on; return st.heart; }),
    setMusic: guard(function (on) {
      st.music = !!on;
      if (ready()) nodes.music.gain.setTargetAtTime(st.music ? MUSIC_GAIN : 0.0001, now(), 0.4);
      return st.music;
    }),
    names: Object.keys(FX),
    _debug: function () {
      var out = {
        available: !!AC, started: !!ac, state: ac ? ac.state : "none", time: now(),
        danger: st.danger, shielded: st.shielded, act: st.act, muted: st.muted, volume: st.vol,
        created: dbg.created, live: dbg.live, notes: JSON.parse(JSON.stringify(dbg.notes)),
        sfx: JSON.parse(JSON.stringify(dbg.sfx)), skipped: dbg.skipped, errors: dbg.errors.slice()
      };
      out.scene = mus.scene; out.base = st.scene; out.latch = mus.latch; out.track = mus.cur ? mus.cur.id : null;
      out.picks = mus.picks.slice(); out.huntNext = mus.huntNext; out.xfades = mus.xfades; out.maxAlive = mus.maxAlive;
      out.playersAlive = W.BH.music ? W.BH.music.alive() : 0; out.musicOn = st.music;
      out.recorded = {};
      Object.keys((W.BH.music && W.BH.music.RECORDED) || {}).forEach(function (id) {
        var u = mus.rec[id] || { state: "idle", tries: 0 };
        out.recorded[id] = { state: u.state, url: u.url || null, tries: u.tries, seconds: u.seconds || 0, length: u.length || 0, error: u.error || null };
      });
      out.uncatchable = out.recorded.uncatchable || { state: "idle", url: null, tries: 0, seconds: 0, error: null };
      out.want = mus.want;
      if (mus.cur && mus.cur.loop) out.loop = mus.cur.loop();
      out.players = mus.players.map(function (p) { return { id: p.id, gain: p.gain(), stopping: !p.alive(), notes: p.notes() }; });
      if (ready()) {
        out.shieldHz = nodes.shieldLP.frequency.value; out.wet = nodes.wet.gain.value;
        out.master = nodes.master.gain.value; out.musicGain = nodes.music.gain.value;
      }
      return out;
    },
    _peak: function () {
      if (!ready()) return 0;
      var a = nodes.analyser, buf = new Float32Array(a.fftSize), m = 0;
      if (a.getFloatTimeDomainData) a.getFloatTimeDomainData(buf);
      for (var i = 0; i < buf.length; i++) { var v = Math.abs(buf[i]); if (v > m) m = v; }
      return m;
    },
    credit: W.BH.music ? W.BH.music.credit : null
  };
  W.BH.audio = api;

  function arm() {
    api.init();
    if (ac && ac.state === "running") {
      ["pointerdown", "keydown", "touchend"].forEach(function (ev) { W.removeEventListener(ev, arm, true); });
    }
  }
  if (W.addEventListener) ["pointerdown", "keydown", "touchend"].forEach(function (ev) { W.addEventListener(ev, arm, true); });
})();
