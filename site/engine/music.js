(function (W) {
  "use strict";
  W.BH = W.BH || {};

  var SCENES = {
    forest: "forest", sneak: "lantern-rounds", hunted: "lantern-rounds", river: "river", boss: "trappers-due", clear: "clear",
    caves: "caves_a", fort: "sneak", ice: "river", puzzle: "forest"
  };
  var RECORDED = {
    uncatchable: { ogg: "/assets/music/uncatchable.ogg", m4a: "/assets/music/uncatchable.m4a", start: 24, samples: 0, fallback: "hunted", load: "level",
      title: "Uncatchable", by: "Alexandr Zhelanov, CC-BY 4.0" },
    "lantern-rounds": { ogg: "/assets/music/lantern-rounds.ogg", m4a: "/assets/music/lantern-rounds.m4a", start: 0, samples: 3528000, fallback: "sneak", load: "scene",
      title: "Lantern Rounds", by: "original, made for Bitfoot" },
    "trappers-due": { ogg: "/assets/music/trappers-due.ogg", m4a: "/assets/music/trappers-due.m4a", start: 0, samples: 3386880, fallback: "sneak", load: "scene",
      title: "The Trapper's Due", by: "original, made for Bitfoot" }
  };
  var LEVEL_DB = { forest: -1.0, sneak: 7.0, hunted: -0.4, river: -0.2, boss: -0.6, clear: 1.5, uncatchable: -11.2,
    caves_a: 4.0, "lantern-rounds": -7.3, "trappers-due": -7.6 };
  var CREDIT = { text: "Music: “Uncatchable” by Alexandr Zhelanov, CC-BY 4.0", href: "https://creativecommons.org/licenses/by/4.0/",
    source: "https://opengameart.org/content/uncatchable" };

  function prng(seed) { seed = seed >>> 0; return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function clamp(v, a, b) { v = +v; if (!(v === v)) v = a; return v < a ? a : v > b ? b : v; }
  var SC = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11], harm: [0, 2, 3, 5, 7, 8, 11], phryg: [0, 1, 3, 5, 7, 8, 10]
  };
  function hz(rootHz, scale, deg, oct, semis) {
    var n = scale.length, o = Math.floor(deg / n), d = ((deg % n) + n) % n;
    return rootHz * Math.pow(2, (scale[d] + 12 * (o + (oct || 0)) + (semis || 0)) / 12);
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
  function dbToGain(db) { return Math.pow(10, (db || 0) / 20); }

  function impulse(ctx, sec, decay, seed) {
    var key = sec + "/" + decay + "/" + seed, cache = ctx.__bhImpulses || (ctx.__bhImpulses = {});
    if (cache[key]) return cache[key];
    var r = prng(seed || 7), len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return (cache[key] = b);
  }
  function noiseBuf(ctx) {
    if (ctx.__bhNoise) return ctx.__bhNoise;
    var len = ctx.sampleRate, nb = ctx.createBuffer(1, len, ctx.sampleRate), nd = nb.getChannelData(0), nr = prng(99);
    for (var i = 0; i < len; i++) nd[i] = nr() * 2 - 1;
    return (ctx.__bhNoise = nb);
  }
  function makeKit(ctx, dest, fx, levelDb) {
    fx = fx || {};
    var k = { ctx: ctx, ends: [], maxVoices: fx.maxVoices || 96, skipped: 0, notes: 0, held: [] };
    function keep(n) { k.held.push(n); return n; }
    k.fade = keep(ctx.createGain()); k.fade.gain.value = 0; k.fade.connect(dest);
    k.trim = keep(ctx.createGain()); k.trim.gain.value = 0.85 * dbToGain(levelDb); k.trim.connect(k.fade);
    var lim = keep(ctx.createDynamicsCompressor()); lim.threshold.value = -10; lim.knee.value = 4; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
    lim.connect(k.trim);
    k.out = keep(ctx.createGain()); k.out.gain.value = fx.gain == null ? 1.3 : fx.gain; k.out.connect(lim);
    var hpHz = fx.hp || 170;
    var h2 = keep(ctx.createBiquadFilter()); h2.type = "highpass"; h2.frequency.value = hpHz; h2.Q.value = 0.6; h2.connect(k.out);
    var h1 = keep(ctx.createBiquadFilter()); h1.type = "highpass"; h1.frequency.value = hpHz; h1.Q.value = 0.6; h1.connect(h2);
    k.dry = keep(ctx.createGain()); k.dry.gain.value = 1; k.dry.connect(h1);
    k.verb = keep(ctx.createConvolver()); k.verb.buffer = impulse(ctx, fx.verbSec || 2.6, fx.verbDecay || 2.4, 11);
    k.wet = keep(ctx.createGain()); k.wet.gain.value = fx.wet == null ? 0.22 : fx.wet;
    k.dry.connect(k.verb); k.verb.connect(k.wet); k.wet.connect(h1);
    k.echo = keep(ctx.createGain()); k.echo.gain.value = 1;
    var dl = keep(ctx.createDelay(2)), fb = keep(ctx.createGain()), elp = keep(ctx.createBiquadFilter()), eg = keep(ctx.createGain());
    dl.delayTime.value = fx.echoSec || 0.42; fb.gain.value = fx.echoFb == null ? 0.38 : fx.echoFb;
    elp.type = "lowpass"; elp.frequency.value = 3200; eg.gain.value = fx.echoMix == null ? 0.45 : fx.echoMix;
    k.echo.connect(dl); dl.connect(elp); elp.connect(fb); fb.connect(dl); elp.connect(eg); eg.connect(k.dry);
    k.noiseBuf = noiseBuf(ctx);

    function room(t, dur) {
      var e = k.ends, j = 0;
      for (var i2 = 0; i2 < e.length; i2++) if (e[i2] > t) e[j++] = e[i2];
      e.length = j;
      if (e.length >= k.maxVoices) { k.skipped++; return false; }
      e.push(t + dur); k.notes++; return true;
    }
    function outFor(o) {
      var g = ctx.createGain(), last = g, parts = [g];
      if (o.pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); last = p; parts.push(p); }
      last.connect(o.to || k.dry);
      if (o.echo) { var es = ctx.createGain(); es.gain.value = o.echo; last.connect(es); es.connect(k.echo); parts.push(es); }
      return { g: g, parts: parts };
    }
    function cleanup(src, parts) { src.onended = function () { try { src.disconnect(); } catch (e) {} for (var i3 = 0; i3 < parts.length; i3++) { try { parts[i3].disconnect(); } catch (e) {} } }; }
    function envExp(g, t, a, peak, dec) {
      peak = Math.max(peak, 0.0002);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.max(a, 0.002));
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, 0.002) + Math.max(dec, 0.01));
    }
    function envLin(g, t, a, hold, rel, peak) {
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setValueAtTime(peak, t + a + hold); g.gain.linearRampToValueAtTime(0, t + a + hold + rel);
    }
    function osc(t, type, f, v, a, dec, o) {
      o = o || {}; if (!room(t, a + dec)) return;
      var s = ctx.createOscillator(), w = outFor(o), parts = w.parts.slice();
      s.type = type; s.frequency.setValueAtTime(Math.max(20, f), t);
      if (o.f1) s.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.glide || dec));
      if (o.detune) s.detune.value = o.detune;
      if (o.lp) { var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = o.lp; lp.Q.value = o.q || 0.7; s.connect(lp); lp.connect(w.g); parts.push(lp); }
      else s.connect(w.g);
      if (o.lin) envLin(w.g, t, a, o.hold || 0, dec, v); else envExp(w.g, t, a, v, dec);
      cleanup(s, parts); s.start(t); s.stop(t + a + (o.hold || 0) + dec + 0.05);
      return s;
    }
    function noise(t, v, type, f, dur, o) {
      o = o || {}; if (!room(t, dur)) return;
      var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), w = outFor(o);
      s.buffer = k.noiseBuf; s.loop = true;
      fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = o.q || 0.8;
      if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
      s.connect(fl); fl.connect(w.g);
      if (o.lin) envLin(w.g, t, o.a || 0.01, o.hold || 0, dur, v); else envExp(w.g, t, o.a || 0.002, v, dur);
      cleanup(s, [fl].concat(w.parts)); s.start(t, (o.off || 0) % 0.9); s.stop(t + (o.a || 0.01) + (o.hold || 0) + dur + 0.05);
    }

    k.pluck = function (t, f, v, o) { o = o || {}; var dec = o.dec || 0.7;
      osc(t, "triangle", f, v, 0.004, dec, { pan: o.pan, lp: Math.min(6000, f * 5), echo: o.echo });
      osc(t, "sine", f * 2, v * 0.35, 0.002, dec * 0.5, { pan: o.pan, echo: o.echo }); };
    k.bell = function (t, f, v, o) { o = o || {}; var dec = o.dec || 2.2, ratio = o.ratio || 3.5;
      if (!room(t, dec)) return;
      var c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), w = outFor(o);
      c.type = "sine"; m.type = "sine"; c.frequency.value = f; m.frequency.value = f * ratio;
      mg.gain.setValueAtTime(f * (o.index || 1.6), t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + dec * 0.6);
      m.connect(mg); mg.connect(c.frequency); c.connect(w.g); envExp(w.g, t, 0.003, v, dec);
      cleanup(c, [m, mg].concat(w.parts)); m.onended = function () { try { m.disconnect(); } catch (e) {} };
      c.start(t); m.start(t); c.stop(t + dec + 0.1); m.stop(t + dec + 0.1); };
    k.flute = function (t, f, dur, v, o) { o = o || {};
      var s = osc(t, "sine", f, v, 0.08, dur, { lin: true, hold: dur * 0.3, pan: o.pan, echo: o.echo });
      if (s && dur > 0.4) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.2; lg.gain.value = f * 0.006; l.connect(lg); lg.connect(s.frequency); l.start(t + 0.15); l.stop(t + dur * 1.4 + 0.1); l.onended = function () { try { l.disconnect(); lg.disconnect(); } catch (e) {} }; }
      noise(t, v * 0.12, "bandpass", f * 2, dur * 0.5, { q: 3, a: 0.05, lin: true, pan: o.pan }); };
    k.shaker = function (t, v, o) { o = o || {}; noise(t, v, "highpass", o.f || 7000, o.dur || 0.045, { pan: o.pan, off: t * 7.3 }); };
    k.tick = function (t, v, o) { o = o || {}; noise(t, v, "bandpass", o.f || 3000, 0.022, { q: o.q || 6, pan: o.pan, off: t * 3.1, echo: o.echo }); };
    k.drip = function (t, f, v, o) { o = o || {}; osc(t, "sine", f, v, 0.002, 0.09, { f1: f * 1.9, glide: 0.07, pan: o.pan, echo: o.echo == null ? 0.6 : o.echo }); };
    k.hand = function (t, f, v, o) { o = o || {};
      osc(t, "sine", f, v, 0.002, 0.16, { f1: f * 0.72, glide: 0.12, pan: o.pan });
      noise(t, v * 0.45, "bandpass", 1400, 0.04, { q: 1.2, pan: o.pan }); };
    k.stab = function (t, freqs, v, o) { o = o || {};
      for (var i5 = 0; i5 < freqs.length; i5++) osc(t, "sawtooth", freqs[i5], v / freqs.length, 0.006, o.dec || 0.22, { lp: o.lp || 2800, detune: (i5 % 2 ? 6 : -6), pan: (i5 - 1) * 0.3 }); };
    k.air = function (t, f, dur, v, o) { o = o || {}; noise(t, v, "bandpass", f, dur * 0.5, { q: o.q || 2, a: dur * 0.5, lin: true, f1: o.f1 || f * 0.7, pan: o.pan }); };
    k.sparkle = function (t, f, v, o) { o = o || {}; osc(t, "sine", f, v, 0.002, o.dec || 0.25, { pan: o.pan, echo: o.echo == null ? 0.5 : o.echo }); };
    k.choir = function (t, f, dur, v) {
      if (!room(t, dur)) return;
      var s = ctx.createOscillator(), s2 = ctx.createOscillator(), b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(), w = outFor({});
      s.type = s2.type = "sawtooth"; s.frequency.value = f; s2.frequency.value = f; s2.detune.value = 10;
      b1.type = b2.type = "bandpass"; b1.frequency.value = 750; b2.frequency.value = 1150; b1.Q.value = b2.Q.value = 6;
      s.connect(b1); s2.connect(b1); s.connect(b2); s2.connect(b2); b1.connect(w.g); b2.connect(w.g);
      envLin(w.g, t, dur * 0.35, dur * 0.3, dur * 0.35, v);
      cleanup(s, [s2, b1, b2].concat(w.parts)); s2.onended = function () { try { s2.disconnect(); } catch (e) {} };
      s.start(t); s2.start(t); s.stop(t + dur + 0.1); s2.stop(t + dur + 0.1); };
    k.piano = function (t, f, v, o) { o = o || {}; var dec = o.dec || 2.4;
      var P = [[1, 1], [2, 0.42], [3, 0.16], [4.02, 0.08], [5.04, 0.04]];
      for (var i6 = 0; i6 < P.length; i6++) osc(t, "sine", f * P[i6][0], v * P[i6][1], 0.003, dec / (1 + i6 * 0.9), { pan: o.pan, echo: o.echo, detune: i6 === 0 ? 0 : 1.5 * i6 });
      noise(t, v * 0.08, "bandpass", Math.min(7000, f * 6), 0.02, { q: 2, pan: o.pan }); };
    k.bowed = function (t, f, dur, v, o) { o = o || {}; var a = Math.min(0.28, dur * 0.35), rel = o.rel || 0.35;
      if (!room(t, dur + rel)) return;
      var w = outFor(o), lp = ctx.createBiquadFilter(), s1 = ctx.createOscillator(), s2 = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain();
      s1.type = s2.type = "sawtooth"; s1.frequency.value = f; s2.frequency.value = f; s1.detune.value = -5; s2.detune.value = 6;
      lp.type = "lowpass"; lp.frequency.value = Math.min(3400, f * 4.5); lp.Q.value = 0.5;
      l.frequency.value = 5.3; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.005, t + Math.min(0.5, dur * 0.6));
      l.connect(lg); lg.connect(s1.frequency); lg.connect(s2.frequency);
      s1.connect(lp); s2.connect(lp); lp.connect(w.g);
      w.g.gain.setValueAtTime(0, t); w.g.gain.linearRampToValueAtTime(v, t + a); w.g.gain.setValueAtTime(v, t + Math.max(a, dur - 0.05));
      w.g.gain.linearRampToValueAtTime(0, t + dur + rel);
      cleanup(s1, [s2, l, lg, lp].concat(w.parts));
      s2.onended = function () { try { s2.disconnect(); } catch (e) {} }; l.onended = function () { try { l.disconnect(); } catch (e) {} };
      [s1, s2, l].forEach(function (x) { x.start(t); x.stop(t + dur + rel + 0.05); }); };
    k.spicc = function (t, f, v, o) { o = o || {};
      osc(t, "sawtooth", f, v, 0.008, o.dec || 0.13, { lp: o.lp || 2400, pan: o.pan, detune: -4 });
      osc(t, "sawtooth", f, v * 0.7, 0.01, (o.dec || 0.13) * 0.9, { lp: o.lp || 2400, pan: -(o.pan || 0), detune: 5 }); };
    k.box = function (t, f, v, o) { o = o || {}; k.bell(t, f, v, { dec: o.dec || 1.5, ratio: 4, index: 0.45, pan: o.pan, echo: o.echo });
      osc(t, "sine", f * 2, v * 0.18, 0.002, 0.3, { pan: o.pan }); };
    k.harp = function (t, f, v, o) { o = o || {}; k.pluck(t, f, v, { dec: o.dec || 1.3, pan: o.pan, echo: o.echo }); };
    k.osc = osc; k.noise = noise;
    k.dispose = function () { for (var i7 = 0; i7 < k.held.length; i7++) { try { k.held[i7].disconnect(); } catch (e) {} } k.held.length = 0; };
    return k;
  }

  function parse(str) { return str.split(/\s+/).filter(Boolean).map(function (x) { var p = x.split(":"); return { at: +p[0], d: +p[1], l: +p[2] }; }); }
  function lead(k, inst, t, f, sec, v, pan) {
    if (inst === "piano") k.piano(t, f, v, { dec: Math.max(1.2, sec * 1.6), pan: pan, echo: 0.15 });
    else if (inst === "bowed") k.bowed(t, f, Math.max(0.2, sec * 0.92), v * 0.75, { pan: pan, echo: 0.1 });
    else if (inst === "flute") k.flute(t, f, Math.max(0.2, sec * 0.9), v * 0.8, { pan: pan, echo: 0.2 });
    else if (inst === "box") k.box(t, f, v * 0.9, { pan: pan, echo: 0.3 });
    else if (inst === "harp") k.harp(t, f, v, { pan: pan, echo: 0.2 });
  }
  function composed(c) {
    var tr = {
      name: c.name, situation: c.situation, fx: c.fx,
      bpm: function (d) { return c.bpm[0] + (c.bpm[1] - c.bpm[0]) * d; },
      init: function (k, S) { S.r = prng(c.seed); S.A = parse(c.A); S.B = parse(c.B); if (c.init) c.init(k, S); },
      step: function (k, S, s, t, d) {
        var bar = s >> 4, b = s & 15, phr = bar >> 2, sec = c.form[phr % c.form.length];
        var semis = c.wander[(bar >> 4) % c.wander.length], R = c.root * Math.pow(2, semis / 12);
        var sc = d > (c.dangerAt == null ? 0.6 : c.dangerAt) ? c.scaleD : c.scale;
        var N = function (deg, oct) { return hz(R, sc, deg, oct || 0); };
        var spb = 60 / tr.bpm(d), chord = c.chords[bar % c.chords.length];
        var x = { k: k, S: S, s: s, t: t, d: d, bar: bar, b: b, phr: phr, sec: sec, N: N, spb: spb, chord: chord, sc: sc, R: R };
        if (b === 0 && bar % 4 === 0) {
          var pr = prng(c.seed * 31 + phr * 7); S.vary = pick(pr, ["same", "same", "up", "thin", "shift"]);
        }
        if (sec.lead && sec.lead !== "--") {
          var half = (bar >> 1) & 1, which = sec.lead[half], pos = s & 31;
          if (which !== "-") {
            var th = which === "A" ? S.A : S.B;
            for (var i = 0; i < th.length; i++) if (th[i].at === pos) {
              var e = th[i], deg = e.d, oct = sec.oct || 0, vv = sec.v || 0.09;
              if (half === 1 && S.vary === "up" && i >= th.length - 2) oct += 1;
              if (half === 1 && S.vary === "shift") deg += 2;
              if (half === 1 && S.vary === "thin" && i % 3 === 1) continue;
              lead(k, sec.inst, t, N(deg, oct), e.l * spb / 4, vv, c.leadPan || 0.1);
            }
          }
        }
        if (c.accomp) c.accomp(x);
        if (c.texture) c.texture(x);
        if (c.perc) c.perc(x);
      }
    };
    return tr;
  }
  function harpArp(x, pat, every, v, oct) {
    if (x.s % every) return; var i = (x.s / every) % pat.length;
    if (pat[i] == null) return; x.k.harp(x.t, x.N(x.chord + pat[i], oct || 0), v, { pan: (i / pat.length - 0.5) * 0.8 });
  }
  function dangerTicks(x, f) {
    var d = x.d; if (d < 0.3) return; var div = d > 0.75 ? 2 : 4;
    if (x.s % div === 0) x.k.tick(x.t, 0.02 + 0.03 * d, { f: (x.s / div) % 2 ? f : f * 1.3, pan: (x.s / div) % 2 ? 0.3 : -0.3 });
    if (d > 0.8) x.k.shaker(x.t, x.b % 2 ? 0.01 : 0.018, {});
  }

  var T = {};

  T.forest = composed({
    name: "Greenroot", situation: "Calm forest exploring", seed: 101, bpm: [74, 92],
    root: 293.66, scale: SC.dorian, scaleD: SC.phryg, chords: [0, -1, 3, 4], wander: [0, 5, 0, -2],
    A: "0:4:6 6:3:2 8:2:8 16:4:4 20:5:4 24:4:8", B: "0:2:6 6:1:2 8:0:6 14:1:2 16:2:12",
    form: [{ lead: "AB", inst: "piano", oct: 1, v: 0.09 }, { lead: "AB", inst: "bowed", oct: 0, v: 0.1 }, { lead: "--", acc: 1 }, { lead: "A-", inst: "flute", oct: 1, v: 0.06 }],
    accomp: function (x) { var thin = x.sec.lead === "A-" && x.bar % 4 >= 2; if (thin) return;
      harpArp(x, [0, 2, 4, 7, 9, 7, 4, 2], x.d > 0.5 ? 1 : 2, 0.06 + 0.02 * x.d, 0); },
    texture: function (x) { if (x.d < 0.5 && x.b === 6 && x.S.r() < 0.25) { var bf = 2400 + x.S.r() * 1400; x.k.sparkle(x.t, bf, 0.02, { pan: 0.7 }); x.k.sparkle(x.t + 0.09, bf * 1.18, 0.016, { pan: 0.7 }); } },
    perc: function (x) { dangerTicks(x, 2600); if (x.d > 0.65 && [0, 6, 12].indexOf(x.b) >= 0) x.k.hand(x.t, 420, 0.05 * x.d, {}); }
  });

  T.sneak = composed({
    name: "Quiet Corridors", situation: "Tense, sneaking past guards", seed: 202, bpm: [80, 100],
    root: 220, scale: SC.minor, scaleD: SC.phryg, dangerAt: 0.55, chords: [0, 0, 5, 4], wander: [0, 3, -2, 1],
    A: "0:7:2 4:9:2 8:10:4 16:9:2 20:8:2 24:7:8", B: "0:11:2 4:10:2 8:12:6 16:11:2 20:10:2 24:6:8",
    form: [{ lead: "AB", inst: "piano", v: 0.07 }, { lead: "A-", inst: "box", v: 0.06 }, { lead: "--" }, { lead: "-B", inst: "bowed", v: 0.06 }],
    accomp: function (x) { if (x.s & 1) return; var p = [0, null, 4, null, 2, null, null, 3], i = (x.s >> 1) & 7;
      if (p[i] == null || (x.sec.lead === "--" && x.bar % 4 === 3 && x.d < 0.5)) return;
      x.k.pluck(x.t, x.N(x.chord + p[i], 0), 0.08, { dec: 0.16, pan: (i - 3.5) / 7 }); },
    perc: function (x) { var div = x.d > 0.75 ? 2 : x.d > 0.4 ? 4 : 8;
      if (x.s % div === 0) x.k.tick(x.t, 0.03 + 0.02 * x.d, { f: (x.s / div) % 2 ? 2200 : 2900, pan: (x.s / div) % 2 ? 0.35 : -0.35 });
      if (x.d > 0.55 && x.b === 8 && x.bar % 2) for (var j = 0; j < 6; j++) x.k.spicc(x.t + j * 0.07, x.N(11, 0), 0.025 * x.d, { dec: 0.06 });
      if (x.d > 0.8) x.k.shaker(x.t, 0.012, {}); }
  });

  T.hunted = composed({
    name: "Thorns at My Heels", situation: "Being hunted / chase", seed: 303, bpm: [116, 138], fx: { gain: 1.05 },
    root: 329.63, scale: SC.harm, scaleD: SC.harm, chords: [0, 0, 5, 4], wander: [0, -2, 3, 0],
    A: "0:4:3 3:5:3 6:7:2 8:6:4 12:4:4 16:3:3 19:4:3 22:2:2 24:0:8", B: "0:7:6 6:6:2 8:5:8 16:4:3 19:5:3 22:6:2 24:7:8",
    form: [{ lead: "--" }, { lead: "AB", inst: "bowed", v: 0.11 }, { lead: "AB", inst: "bowed", oct: 1, v: 0.08 }, { lead: "A-", inst: "piano", oct: 1, v: 0.08 }],
    init: function (k, S) { S.ost = [0, 0, 4, 0, 5, 0, 4, 2]; },
    accomp: function (x) { if (x.bar % 8 === 7) return; var every = x.d > 0.45 ? 1 : 2; if (x.s % every) return;
      var o = x.S.ost[(x.s / every) & 7]; x.k.spicc(x.t, x.N(x.chord + o, -1), (x.b % 4 === 0 ? 0.09 : 0.055), { pan: x.b % 2 ? 0.25 : -0.25 }); },
    perc: function (x) { var brk = x.bar % 8 === 7;
      if (!brk && [0, 3, 6, 8, 11, 14].indexOf(x.b) >= 0) x.k.tick(x.t, 0.045, { f: 2400, q: 3 });
      if (!brk && (x.b === 0 || x.b === 10) && x.d > 0.25) x.k.hand(x.t, 330, 0.08 * x.d, {});
      if (!brk && x.d > 0.4) x.k.shaker(x.t, x.b % 2 ? 0.01 : 0.02, {});
      if (brk && x.b === 0) x.k.air(x.t, 2000, 1.6, 0.03, { f1: 4000, q: 3 }); }
  });

  T.river = composed({
    name: "Riverbend", situation: "River / water", seed: 404, bpm: [72, 88],
    root: 349.23, scale: SC.lydian, scaleD: SC.dorian, dangerAt: 0.55, chords: [0, 1, 5, 4], wander: [0, 2, -3, 0],
    A: "0:4:8 8:5:4 12:4:4 16:2:12 28:1:4", B: "0:6:4 4:7:4 8:9:8 16:8:4 20:7:4 24:4:8",
    form: [{ lead: "AB", inst: "flute", oct: 1, v: 0.06 }, { lead: "AB", inst: "piano", oct: 1, v: 0.08 }, { lead: "--" }, { lead: "-B", inst: "bowed", v: 0.08 }],
    accomp: function (x) { var half = x.b < 8 || (x.d > 0.5 && x.bar % 2); if (!half || (x.bar % 4 === 3 && x.b >= 8)) return;
      x.k.harp(x.t, x.N(x.chord + [0, 2, 4, 7, 9, 7, 4, 2][x.b & 7], 0), 0.06, { dec: 1.1, pan: (x.b & 7) / 7 - 0.5 }); },
    texture: function (x) { if (x.S.r() < 0.06 + 0.04 * x.d) x.k.drip(x.t, 900 + x.S.r() * 900, 0.035, { pan: x.S.r() * 1.6 - 0.8 });
      if (x.b === 0 && x.bar % 4 === 1) x.k.air(x.t, 1800, 3.2, 0.03, { f1: 900, q: 1.5, pan: -0.3 }); },
    perc: function (x) { dangerTicks(x, 3400); }
  });

  T.boss = composed({
    name: "The Big Bad", situation: "Boss fight", seed: 909, bpm: [126, 146], fx: { gain: 0.9 },
    root: 440, scale: SC.harm, scaleD: SC.harm, chords: [0, 5, 3, 4], wander: [0, 3, -2, 1],
    A: "0:0:4 4:4:4 8:7:6 14:6:2 16:5:4 20:4:4 24:3:4 28:4:4", B: "0:7:4 4:8:4 8:9:6 14:8:2 16:7:8 24:6:4 28:4:4",
    form: [{ lead: "--" }, { lead: "AB", inst: "bowed", v: 0.12 }, { lead: "AB", inst: "bowed", oct: 1, v: 0.09 }, { lead: "-B", inst: "piano", oct: 1, v: 0.08 }],
    init: function (k, S) { S.ost = [0, 0, 4, 0, 5, 0, 4, 2]; },
    accomp: function (x) { var brk = x.bar % 8 === 7, every = x.d > 0.35 ? 1 : 2;
      if (!brk && x.s % every === 0) x.k.spicc(x.t, x.N(x.chord + x.S.ost[(x.s / every) & 7], -1), x.b % 4 === 0 ? 0.1 : 0.065, { pan: x.b % 2 ? 0.2 : -0.2 });
      if ([0, 3, 6, 10].indexOf(x.b) >= 0 && (x.bar % 2 === 0 || x.d > 0.5 || brk)) x.k.stab(x.t, [x.N(x.chord, 0), x.N(x.chord + 2, 0), x.N(x.chord + 4, 0)], x.b === 0 ? 0.09 : 0.06, { dec: brk ? 0.5 : 0.16, lp: 2400 + 1600 * x.d });
      if (x.b === 0 && x.bar % 4 === 0) x.k.choir(x.t, x.N(x.chord, 0), x.spb * 8, 0.035 + 0.03 * x.d); },
    perc: function (x) { if (x.bar % 8 === 7) return;
      if (x.b === 0 || x.b === 7 || x.b === 10) x.k.hand(x.t, x.b === 0 ? 270 : 370, 0.08, {});
      if (x.d > 0.3 || x.b % 2 === 0) x.k.shaker(x.t, x.b % 4 === 2 ? 0.022 : 0.011, {});
      if (x.b === 4 || x.b === 12) x.k.noise(x.t, 0.055, "bandpass", 2200, 0.09, { q: 1 }); }
  });

  T.clear = composed({
    name: "After the Storm", situation: "Level clear / calm after a boss", seed: 1010, bpm: [64, 74], fx: { wet: 0.3 },
    root: 329.63, scale: SC.major, scaleD: SC.major, chords: [0, 3, 5, 4], wander: [0, 5, 0, 2],
    A: "0:4:4 4:5:4 8:7:8 16:6:4 20:4:4 24:2:8", B: "0:2:4 4:4:4 8:5:8 16:4:4 20:2:4 24:0:8",
    form: [{ lead: "AB", inst: "piano", oct: 1, v: 0.08 }, { lead: "AB", inst: "bowed", v: 0.08 }, { lead: "A-", inst: "box", oct: 1, v: 0.06 }, { lead: "--", rest: true }],
    accomp: function (x) { if (x.sec.rest) { if (x.b === 0 && x.bar % 4 === 0) x.k.bell(x.t, x.N(7, 0), 0.04, { dec: 3, ratio: 3, index: 0.8, echo: 0.3 }); return; }
      if (x.s & 1) return; var p = [0, 2, 4, 7, 4, null, 2, null], i = (x.s >> 1) & 7; if (p[i] == null) return;
      x.k.harp(x.t, x.N(x.chord + p[i], 0), 0.05, { dec: 1.3, pan: (i - 3.5) / 9 }); },
    texture: function (x) { if (x.b === 12 && x.bar % 4 === 1 && x.d < 0.5) { x.k.sparkle(x.t, 2800, 0.014, { pan: -0.6 }); x.k.sparkle(x.t + 0.1, 3300, 0.012, { pan: -0.6 }); } },
    perc: function (x) { if (x.d > 0.4 && x.b % 4 === 2) x.k.tick(x.t, 0.018 * x.d, { f: 3200 }); }
  });

  function accHarp(pat, v, oct) { return function (x) { var every = x.d > 0.5 ? 1 : 2; if (x.s % every) return; var i = (x.s / every) % pat.length; if (pat[i] == null) return; x.k.harp(x.t, x.N(x.chord + pat[i], oct || 0), v + 0.02 * x.d, { dec: 1.1, pan: (i / pat.length - 0.5) * 0.8 }); }; }
  var RAND = function (x) { return x.S.r(); };
  T.caves_a = composed({
    name: "Lantern Deep", situation: "Caves — phrygian harp, piano theme, drips", seed: 1201, bpm: [70, 92], fx: { gain: 0.86, wet: 0.35, verbSec: 3.6, echoSec: 0.6, echoFb: 0.42 },
    root: 261.63, scale: SC.phryg, scaleD: SC.phryg, chords: [0, 1, 0, 6], wander: [0, -2, 1, 0],
    A: "0:4:4 4:5:4 8:4:8 16:3:4 20:1:4 24:0:8", B: "0:7:6 6:8:2 8:7:8 16:5:4 20:4:4 24:1:8",
    form: [{ lead: "AB", inst: "piano", v: 0.1 }, { lead: "AB", inst: "bowed", v: 0.09 }, { lead: "-B", inst: "piano", oct: 1, v: 0.08 }, { lead: "AB", inst: "piano", v: 0.1 }],
    accomp: accHarp([0, 2, 4, 7, 4, 2, 4, 2], 0.06, 0),
    texture: function (x) { if (RAND(x) < 0.04) x.k.drip(x.t, 1000 + RAND(x) * 800, 0.035, { pan: RAND(x) * 1.6 - 0.8 }); },
    perc: function (x) { dangerTicks(x, 1500); }
  });

  function fadeParam(p, ctx, to, sec) {
    var t = ctx.currentTime, g = p.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + Math.max(0.01, sec));
  }
  function player(ctx, dest, id) {
    var tr = T[id]; if (!tr) throw new Error("unknown track " + id);
    var k = makeKit(ctx, dest, tr.fx, LEVEL_DB[id]), S = {}, st = { step: 0, next: ctx.currentTime + 0.08, danger: 0, errors: [] }, live = true, gone = false, timer = null;
    tr.init(k, S);
    return {
      id: id, kit: k, errors: st.errors,
      pump: function (until) {
        if (gone) return;
        var t0 = ctx.currentTime, guard = 0;
        if (st.next < t0 - 0.2) st.next = t0 + 0.05;
        while (st.next < until && guard++ < 64) {
          try { tr.step(k, S, st.step, st.next, st.danger); } catch (e) { if (st.errors.length < 20) st.errors.push(String(e && e.message || e)); }
          st.next += 60 / tr.bpm(st.danger) / 4; st.step++;
        }
      },
      setDanger: function (v) { st.danger = clamp(v, 0, 1); },
      fade: function (to, sec) { if (live) fadeParam(k.fade, ctx, to, sec); },
      gain: function () { return k.fade.gain.value; },
      notes: function () { return k.notes; },
      stop: function (sec) {
        if (gone) return; live = false; sec = sec == null ? 1.75 : sec;
        fadeParam(k.fade, ctx, 0, sec);
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () { if (gone) return; gone = true; k.dispose(); player.alive--; }, sec * 1000 + 600);
      },
      alive: function () { return live; },
      gone: function () { return gone; }
    };
  }
  player.alive = 0;
  function bufferPlayer(ctx, dest, buffer, id, offset) {
    id = id || "uncatchable";
    var held = [], live = true, gone = false, timer = null;
    function keep(n) { held.push(n); return n; }
    var fade = keep(ctx.createGain()); fade.gain.value = 0; fade.connect(dest);
    var trim = keep(ctx.createGain()); trim.gain.value = dbToGain(LEVEL_DB[id]); trim.connect(fade);
    var h2 = keep(ctx.createBiquadFilter()); h2.type = "highpass"; h2.frequency.value = 150; h2.Q.value = 0.6; h2.connect(trim);
    var h1 = keep(ctx.createBiquadFilter()); h1.type = "highpass"; h1.frequency.value = 150; h1.Q.value = 0.6; h1.connect(h2);
    var dur = buffer.duration, off = ((offset || 0) % dur + dur) % dur, t0 = ctx.currentTime + 0.02;
    var src = keep(ctx.createBufferSource()); src.buffer = buffer; src.loop = true; src.loopStart = 0; src.loopEnd = 0;
    src.connect(h1); src.start(t0, off);
    return {
      id: id, kit: { fade: fade }, errors: [],
      loop: function () { return { start: src.loopStart, end: src.loopEnd, length: buffer.length, rate: buffer.sampleRate }; },
      position: function () { return (off + Math.max(0, ctx.currentTime - t0)) % dur; },
      pump: function () {}, setDanger: function () {},
      fade: function (to, sec) { if (live) fadeParam(fade, ctx, to, sec); },
      gain: function () { return fade.gain.value; },
      notes: function () { return 0; },
      stop: function (sec) {
        if (gone) return; live = false; sec = sec == null ? 1.75 : sec;
        fadeParam(fade, ctx, 0, sec);
        try { src.stop(ctx.currentTime + sec + 0.05); } catch (e) {}
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          if (gone) return; gone = true; player.alive--;
          for (var i = 0; i < held.length; i++) { try { held[i].disconnect(); } catch (e) {} }
        }, sec * 1000 + 600);
      },
      alive: function () { return live; },
      gone: function () { return gone; }
    };
  }

  function render(id, seconds, danger, sr, buffer, offset) {
    sr = sr || 44100;
    var OAC = W.OfflineAudioContext || W.webkitOfflineAudioContext;
    var ctx = new OAC(2, Math.ceil(seconds * sr), sr), p;
    if (buffer) p = bufferPlayer(ctx, ctx.destination, buffer, id, offset);
    else { p = player(ctx, ctx.destination, id); }
    p.kit.fade.gain.value = 1;
    if (!buffer) {
      var feed = function (t) { p.setDanger(typeof danger === "function" ? danger(t) : danger || 0); p.pump(t + 1.2); };
      feed(0);
      for (var s = 1; s < seconds; s++) (function (t) { ctx.suspend(t).then(function () { feed(t); ctx.resume(); }); })(s);
    }
    return ctx.startRendering();
  }

  W.BH.music = {
    SCENES: SCENES, RECORDED: RECORDED, LEVEL_DB: LEVEL_DB, credit: CREDIT, tracks: T, ids: Object.keys(T),
    player: function (ctx, dest, id) { var p = player(ctx, dest, id); player.alive++; return p; },
    bufferPlayer: function (ctx, dest, buffer, id, offset) { var p = bufferPlayer(ctx, dest, buffer, id, offset); player.alive++; return p; },
    alive: function () { return player.alive; },
    render: render
  };
})(typeof window !== "undefined" ? window : this);
