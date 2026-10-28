"use strict";

(function () {
  var BH = window.BH = window.BH || {};
  var cfg = { targetSec: 8, minSpeed: 6, holdSec: 1, fps: 30, interval: 0.1, maxFrames: 600, maxBytes: 20e6,
              maxSide: 1280, jpeg: 0.8, bitrate: 2500000 };
  var MIMES = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

  var mime = null;
  try {
    var probe = document.createElement("canvas");
    if (typeof MediaRecorder === "function" && typeof probe.captureStream === "function" && typeof probe.toBlob === "function" &&
        typeof createImageBitmap === "function") {
      for (var i = 0; i < MIMES.length; i++) if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(MIMES[i])) { mime = MIMES[i]; break; }
    }
  } catch (e) { mime = null; }
  var container = mime ? mime.split(";")[0] : null;
  var ext = container === "video/mp4" ? "mp4" : "webm";

  var clip = null;
  var run = null;
  var job = null;
  var seenStart = null;
  var why = null;
  var lastT = 0;

  function g(name) { try { return window[name]; } catch (e) { return undefined; } }
  function freeClip() {
    if (clip && clip.url) { try { URL.revokeObjectURL(clip.url); } catch (e) {} }
    clip = null;
  }

  function startRun(game, src) {
    run = null;
    if (!mime || !src) return;
    try {
      var sw = src.width || 1, sh = src.height || 1, k = Math.min(1, cfg.maxSide / Math.max(sw, sh));
      var cv = document.createElement("canvas");
      cv.width = Math.max(2, Math.round(sw * k / 2) * 2); cv.height = Math.max(2, Math.round(sh * k / 2) * 2);
      run = { cv: cv, cx: cv.getContext("2d"), frames: [], bytes: 0, interval: cfg.interval, nextAt: 0, active: 0,
              inflight: 0, level: (game.levelIdx | 0) + 1, done: null };
      sample(run, src);
    } catch (e) { run = null; }
  }
  function sample(r, src) {
    var cv = r.cv, cx = r.cx, w = cv.width, h = cv.height, t = r.active;
    cx.fillStyle = "#1b1b1b"; cx.fillRect(0, 0, w, h);
    var sw = src.width || 1, sh = src.height || 1, k = Math.min(w / sw, h / sh), dw = sw * k, dh = sh * k;
    try { cx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh); } catch (e) { return; }
    r.inflight++;
    setTimeout(function () {
      try {
        cv.toBlob(function (b) {
          r.inflight--;
          if (b && b.size) { r.frames.push({ t: t, blob: b }); r.bytes += b.size; thin(r); }
          if (r.done && !r.inflight) r.done();
        }, "image/jpeg", cfg.jpeg);
      } catch (e) { r.inflight--; if (r.done && !r.inflight) r.done(); }
    }, 0);
  }
  function thin(r) {
    while (r.frames.length > 2 && (r.frames.length > cfg.maxFrames || r.bytes > cfg.maxBytes)) {
      r.frames.sort(function (a, b) { return a.t - b.t; });
      var keep = [], last = r.frames.length - 1;
      r.frames.forEach(function (f, i) { if ((last - i) % 2 === 0) keep.push(f); });
      r.frames = keep; r.bytes = keep.reduce(function (s, f) { return s + f.blob.size; }, 0);
      r.interval *= 2;
    }
  }
  function endRun(outcome, src) {
    var r = run; run = null;
    if (!r || !outcome) return;
    freeClip();
    if (job) job.cancel = true;
    why = null;
    var mine = job = { preparing: true, level: r.level, outcome: outcome };
    sample(r, src);
    r.done = function () { r.done = null; encode(r, outcome, mine); };
    if (!r.inflight) r.done();
  }

  function encode(r, outcome, me) {
    if (me.cancel || job !== me) return;
    var frames = r.frames.sort(function (a, b) { return a.t - b.t; });
    r.frames = [];
    if (!frames.length) { job = null; why = "no samples"; return; }
    var play = Math.max(r.active, frames[frames.length - 1].t), speed = Math.max(cfg.minSpeed, play / cfg.targetSec);
    var nOut = Math.max(1, Math.round(play / speed * cfg.fps)), nHold = Math.round(cfg.holdSec * cfg.fps);
    var cv = r.cv, cx = r.cx, stream, track, mr, chunks = [];
    try {
      stream = cv.captureStream(0); track = stream.getVideoTracks()[0];
      mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: cfg.bitrate });
      mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
    } catch (e) { job = null; why = "recorder: " + (e && e.message); return; }
    var label = "BITFOOT: THE HUNT  ·  L" + r.level + "  ·  ×" + Math.round(speed);
    var cache = {};
    function bmp(j) { if (!cache[j]) cache[j] = createImageBitmap(frames[j].blob).catch(function () { return null; }); return cache[j]; }
    function pick(i) {
      var t = i / cfg.fps * speed, lo = 0, hi = frames.length - 1;
      while (lo < hi) { var m = (lo + hi) >> 1; if (frames[m].t < t) lo = m + 1; else hi = m; }
      if (lo > 0 && Math.abs(frames[lo - 1].t - t) <= Math.abs(frames[lo].t - t)) lo--;
      return lo;
    }
    var shown = -1, t0 = 0, i = 0, total = nOut + nHold;
    function draw(img) {
      var w = cv.width, h = cv.height;
      if (img) { cx.drawImage(img, 0, 0, w, h); }
      var fs = Math.max(10, Math.round(Math.min(w, h) / 40)), pad = Math.round(fs * 0.7);
      cx.font = "600 " + fs + "px 'Plex Mono', monospace"; cx.textAlign = "right"; cx.textBaseline = "bottom";
      var tw = cx.measureText(label).width;
      cx.fillStyle = "rgba(27,27,27,0.72)"; cx.fillRect(w - tw - pad * 3, h - fs - pad * 2.4, tw + pad * 2, fs + pad * 1.4);
      cx.fillStyle = "#eaba49"; cx.fillText(label, w - pad * 2, h - pad * 1.5);
    }
    function finish() {
      mr.onstop = function () {
        try { stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) {}
        if (me.cancel || job !== me || !chunks.length) { if (job === me) { job = null; why = "encode produced no data"; } return; }
        job = null;
        freeClip();
        clip = { blob: new Blob(chunks, { type: container }), url: null, seconds: total / cfg.fps, playSeconds: play, speed: speed, samples: frames.length, level: r.level, outcome: outcome };
        try { window.dispatchEvent(new CustomEvent("bh:clip-ready", { detail: api.info() })); } catch (e) {}
      };
      try { mr.stop(); } catch (e) { job = null; why = "recorder stop: " + (e && e.message); }
    }
    function next() {
      if (me.cancel) { try { mr.stop(); } catch (e) {} Object.keys(cache).forEach(function (k) { cache[k].then(function (b) { if (b) b.close(); }); }); return; }
      if (i >= total) {
        Object.keys(cache).forEach(function (k) { cache[k].then(function (b) { if (b) b.close(); }); });
        finish(); return;
      }
      var j = i < nOut ? pick(i) : frames.length - 1;
      bmp(j).then(function (img) {
        if (j !== shown) {
          if (shown >= 0 && cache[shown]) { cache[shown].then(function (b) { if (b) b.close(); }); delete cache[shown]; }
          shown = j;
        }
        draw(img);
        try { track.requestFrame(); } catch (e) {}
        if (i + 1 < nOut) bmp(pick(i + 1));
        i++;
        var wait = t0 + i / cfg.fps * 1000 - performance.now();
        setTimeout(next, Math.max(0, wait));
      }).catch(function (e) { why = "encode frame " + i + ": " + (e && e.message); me.cancel = true; if (job === me) job = null; try { mr.stop(); } catch (e2) {} });
    }
    try { mr.start(); } catch (e) { job = null; why = "recorder start: " + (e && e.message); return; }
    t0 = performance.now();
    next();
  }

  function tick(ts, resync) {
    if (!mime) return;
    if (resync) lastT = ts;
    try {
      var dt = Math.min(0.1, Math.max(0, (ts - lastT) / 1000)); lastT = ts;
      var game = g("game"), src = g("canvas"), ls = g("levelStart");
      if (game && src && src.getContext) {
        var phase = game.phase;
        if (phase === "play" && game.screen === "play" && ls !== seenStart) { seenStart = ls; startRun(game, src); }
        if (run) {
          if (phase === "escaped" || phase === "caught") endRun(phase, src);
          else if (phase !== "play" || (game.screen !== "play" && game.screen !== "pause")) run = null;
          else if (game.screen === "play" && !document.hidden) {
            run.active += dt;
            if (run.active >= run.nextAt) { run.nextAt = run.active + run.interval; sample(run, src); }
          }
        }
      }
    } catch (e) {}
  }

  var api = BH.clip = {
    config: cfg,
    step: tick,
    supported: function () { return !!mime; },
    available: function () { return !!(clip && clip.blob && clip.blob.size); },
    info: function () {
      if (clip) return { state: "ready", ready: true, bytes: clip.blob.size, seconds: +clip.seconds.toFixed(2), playSeconds: +clip.playSeconds.toFixed(2),
        speed: +clip.speed.toFixed(2), samples: clip.samples, mime: mime, container: container, ext: ext, level: clip.level, outcome: clip.outcome };
      if (job) return { state: "preparing", ready: false, level: job.level, outcome: job.outcome };
      if (run) return { state: "recording", ready: false, level: run.level, samples: run.frames.length, sampleBytes: run.bytes, interval: run.interval };
      return { state: "idle", ready: false, error: why };
    },
    download: function (filename) {
      try {
        if (!api.available()) return false;
        if (!clip.url) clip.url = URL.createObjectURL(clip.blob);
        var name = String(filename || ("bitfoot-hunt-L" + clip.level)).replace(/\.(webm|mp4|mov|mkv|m4v)$/i, "") + "." + ext;
        var a = document.createElement("a");
        a.href = clip.url; a.download = name; a.rel = "noopener"; a.style.display = "none";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        return true;
      } catch (e) { return false; }
    }
  };
})();
