"use strict";
(function () {
  var VOICES = {};
  var box = null, txt, nameEl, pic, more, list, backBtn;
  var cur = null;
  var bubbles = [];

  function $(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function build() {
    if (box) return;
    box = $("div", "talkbox", document.body);
    box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Conversation");
    pic = $("canvas", "talk-pic", box); pic.width = 96; pic.height = 96;
    var col = $("div", "talk-col", box);
    nameEl = $("div", "talk-name", col);
    txt = $("div", "talk-text", col);
    list = $("div", "talk-choices", col);
    more = $("div", "talk-more", box);
    more.textContent = window.matchMedia && matchMedia("(pointer: coarse)").matches ? "Tap to continue ▶" : "Click or Space to continue ▶";
    backBtn = $("button", "talk-back", box); backBtn.type = "button"; backBtn.textContent = "◀ Back";
    window.addEventListener("pointerdown", function (e) {
      if (!cur || game.screen !== "play" || box.contains(e.target)) return;
      if (e.target.closest && e.target.closest("button, a, #overlay, .hud-btn")) return;
      if (e.clientY < 56) return;
      if (typeof audioInit === "function") audioInit();
      tap = { x: e.clientX, y: e.clientY, t: performance.now() };
    }, true);
    var tap = null;
    window.addEventListener("pointerup", function (e) {
      var t = tap; tap = null;
      if (!t || !cur || cur.choices || game.screen !== "play") return;
      if (performance.now() - t.t < 250 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 12) advance();
    }, true);
    function hov(e) { var c = e.target.closest && e.target.closest(".talk-choice"); if (c && cur && cur.choices) { cur.sel = +c.dataset.i; mark(); } }
    list.addEventListener("mouseover", hov); list.addEventListener("focusin", hov);
    box.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (typeof audioInit === "function") audioInit();
      if (e.target === backBtn) { back(); return; }
      var c = e.target && e.target.closest ? e.target.closest(".talk-choice") : null;
      if (c && cur && cur.choices) { if (ready()) pick(+c.dataset.i); return; }
      if (cur && cur.choices) return;
      advance();
    });
  }

  function trailSfx(n) { if (typeof sfx === "function") sfx(n); }
  function voiceOf(who) { return VOICES[who] || { name: "", f: 320, wave: "square", color: "#fffaf0" }; }
  var BOUNDS = {};
  function bounds(id) {
    if (BOUNDS[id]) return BOUNDS[id];
    var c = document.createElement("canvas"); c.width = 200; c.height = 200;
    var g = c.getContext("2d");
    if (!BH.characters.draw(g, 100, 180, { dir: "right", state: "idle", t: 0, scale: 1, alpha: 1 }, id)) return null;
    var d = g.getImageData(0, 0, 200, 200).data, x0 = 999, y0 = 999, x1 = -1;
    for (var y = 0; y < 200; y++) for (var x = 0; x < 200; x++) if (d[(y * 200 + x) * 4 + 3]) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; }
    if (x1 < 0) return null;
    return (BOUNDS[id] = [x0, y0, x1]);
  }
  function drawPortrait(v) {
    var g = pic.getContext("2d"); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 96, 96);
    var p = v.portrait || {};
    if (p.none) return;
    g.fillStyle = "#2b4a23"; g.fillRect(0, 0, 96, 96);
    for (var i = 0; i < 60; i++) {
      var gx = (i * 37 + (i >> 2) * 11) % 92, gy = (i * 53 + (i >> 3) * 7) % 92;
      g.fillStyle = i % 3 ? "#35592b" : "#1f3a1a"; g.fillRect(gx, gy, 2, 4); g.fillRect(gx + 2, gy + 2, 2, 2);
    }
    var keep = window.ctx;
    try {
      window.ctx = g;
      if (p.hunter) {
        var h = { x: 32, y: 40, dir: 0, step: 0, state: "patrol", type: "hunter" };
        g.save(); g.translate(48, 60); g.scale(3.3, 3.3); g.translate(-32, -40);
        drawHunterBody(h, p.hunter); g.restore();
      } else if (p.char && BH.characters) {
        var b = bounds(p.char);
        if (b && BH.characters.draw(g, 48 + (100 - (b[0] + b[2]) / 2) * 2.6, 8 + (180 - b[1]) * 2.6, { dir: "right", state: "idle", t: 0, scale: 2.6, alpha: 1 }, p.char)) return;
      } else if (window.BitfootSprite) window.BitfootSprite.draw(g, 48, 148, { dir: "right", state: "idle", t: 0, scale: 2.6, alpha: 1 });
    } catch (e) {} finally { window.ctx = keep; }
  }

  function show(line) {
    var v = voiceOf(line.who);
    cur.line = line; cur.shown = 0; cur.nextAt = 0; cur.done = false; cur.choices = null; cur.sel = 0;
    nameEl.textContent = v.name || ""; nameEl.style.color = v.color || "#fffaf0";
    txt.textContent = ""; list.textContent = ""; more.classList.remove("on");
    backBtn.classList.toggle("on", canBack());
    box.classList.toggle("nopic", !!(v.portrait && v.portrait.none));
    drawPortrait(v);
    if (v.portrait && v.portrait.char && !cur.retried) { cur.retried = true; setTimeout(function () { if (cur && cur.line === line) drawPortrait(v); }, 400); }
  }
  var ticking = false;
  function loop() { if (ticking) return; ticking = true; requestAnimationFrame(tick); }
  function tick(now) {
    if (!cur) { ticking = false; return; }
    box.classList.toggle("held", game.screen !== "play");
    if (game.screen !== "play") { cur.nextAt = now + 60; requestAnimationFrame(tick); return; }
    var line = cur.line, full = line.text;
    while (!cur.done && now >= cur.nextAt) {
      var ch = full.charAt(cur.shown);
      cur.shown++;
      txt.textContent = full.slice(0, cur.shown);
      var v = voiceOf(line.who);
      if (/[A-Za-z0-9]/.test(ch) && (cur.shown % (v.every || 4) === 1 || v.every === 1) && typeof sfx === "function")
        sfx("voice", { f: v.f * (1 + ((Math.random() - 0.5) * (v.jit == null ? 0.08 : v.jit))), wave: v.wave, slide: v.slide, vol: v.vol, oct: v.oct });
      var wait = v.speed || 34;
      if (/[.!?]/.test(ch) && full.charAt(cur.shown) === " ") wait = 260;
      else if (/[,;:…]/.test(ch)) wait = 140;
      cur.nextAt = Math.max(cur.nextAt, now - 40) + wait / 2;
      if (cur.shown >= full.length) finishLine();
    }
    if (cur.done && !cur.choices && !behind() && window.player && player.moving) {
      if (!cur.walkFrom) cur.walkFrom = now;
      if (now - cur.walkFrom > 4300) { cur.walkFrom = 0; next(); }
    } else if (cur) cur.walkFrom = 0;
    requestAnimationFrame(tick);
  }
  function finishLine() {
    cur.done = true; cur.shown = cur.line.text.length; txt.textContent = cur.line.text;
    if (cur.line.choices) {
      cur.choices = cur.line.choices;
      list.textContent = "";
      cur.choices.forEach(function (c, k) {
        var b = $("button", "talk-choice", list); b.dataset.i = k; b.textContent = c.text;
      });
      cur.choiceAt = performance.now();
      mark();
    } else more.classList.add("on");
  }
  function mark() { Array.prototype.forEach.call(list.children, function (b, k) { b.classList.toggle("sel", k === cur.sel); }); }
  function ready() { return cur && cur.choices && performance.now() - (cur.choiceAt || 0) > 350; }
  function advance() {
    if (!cur) return;
    if (cur.rev > 0) { forward(); return; }
    if (!cur.done) { trailSfx("talkNext"); finishLine(); return; }
    if (cur.choices) { if (ready()) pick(cur.sel); return; }
    if (cur.i + 1 < cur.seq.length) trailSfx("talkNext");
    next();
  }
  function pick(k) {
    var c = cur && cur.choices && cur.choices[k]; if (!c) return;
    if (typeof sfx === "function") sfx("click");
    cur.picked = c.text;
    close(function () { if (c.then) c.then(); });
  }
  var carry = null, PAST_MAX = 80;
  function heard() {
    var out = cur.past.slice(), last = Math.min(cur.i, cur.seq.length - 1);
    for (var k = 0; k <= last; k++) {
      var l = norm(cur.seq[k]);
      out.push({ who: l.who, text: l.text, picked: k === last && cur.picked ? cur.picked : null });
    }
    return out.slice(-PAST_MAX);
  }
  function canBack() { return !!cur && (cur.i > 0 || cur.rev < cur.past.length); }
  function showPast() {
    var l = cur.past[cur.past.length - cur.rev];
    show(l);
    if (l.picked) txt.textContent = l.text + "\n▶ " + l.picked; else txt.textContent = l.text;
    cur.done = true; cur.shown = l.text.length; more.classList.add("on");
    backBtn.classList.toggle("on", canBack());
  }
  function back() {
    if (!canBack()) return;
    trailSfx("talkNext");
    if (cur.rev === 0 && cur.i > 0) { cur.i--; show(norm(cur.seq[cur.i])); finishLine(); return; }
    cur.rev++; showPast();
  }
  function forward() {
    trailSfx("talkNext");
    if (cur.rev > 0) { cur.rev--; if (cur.rev) { showPast(); return; } show(norm(cur.seq[cur.i])); finishLine(); return; }
    next();
  }
  function behind() { return !!cur && (cur.rev > 0 || cur.i < cur.hi); }
  function next() {
    cur.i++; cur.hi = Math.max(cur.hi, cur.i);
    var it = cur.seq[cur.i];
    if (!it) { close(cur.after); return; }
    show(norm(it));
  }
  function norm(it) { return Array.isArray(it) ? { who: it[0], text: String(it[1]) } : it; }
  function close(then) {
    if (cur) trailSfx("talkClose");
    var wasPlay = cur && cur.paused, hist = cur ? heard() : null;
    if (wasPlay && typeof levelStart === "number") levelStart += Math.max(0, simTime - cur.t0);
    cur = null;
    box.classList.remove("on");
    if (wasPlay && game.phase === "talk") { game.phase = "play"; if (typeof joy !== "undefined") joy.active = false; }
    if (then) { carry = hist; try { then(); } finally { carry = null; } }
  }

  var seenScreen = null, screenAt = 0;
  setInterval(function () { if (window.game && game.screen !== seenScreen) { seenScreen = game.screen; screenAt = performance.now(); } }, 50);
  window.addEventListener("keydown", function (e) {
    if ((e.key === " " || e.key === "Enter") && window.BH && BH.trailMachine && BH.trailMachine.isOpen && BH.trailMachine.isOpen()) return;
    if ((e.key === " " || e.key === "Enter") && window.game && (game.screen === "complete" || game.screen === "finale") && performance.now() - screenAt < 700) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!cur || game.screen !== "play") return;
    var k = e.key;
    if (cur.choices && /^[1-9]$/.test(k) && +k <= cur.choices.length) { e.preventDefault(); e.stopImmediatePropagation(); cur.sel = +k - 1; mark(); if (ready()) pick(cur.sel); return; }
    if (k === " " || k === "Enter" || k === "z" || k === "Z") { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) advance(); return; }
    if (k === "Backspace") { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) back(); return; }
    if (cur.choices && e.repeat && /^(ArrowUp|ArrowDown)$/.test(k)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (cur.choices && k === "ArrowUp") { e.preventDefault(); e.stopImmediatePropagation(); cur.sel = (cur.sel + cur.choices.length - 1) % cur.choices.length; mark(); return; }
    if (cur.choices && k === "ArrowDown") { e.preventDefault(); e.stopImmediatePropagation(); cur.sel = (cur.sel + 1) % cur.choices.length; mark(); return; }
  }, true);

  function open(seq, after) {
    build();
    if (!seq || !seq.length) { if (after) after(); return; }
    var paused = false;
    if (!cur) trailSfx("talkOpen");
    cur = { seq: seq, i: 0, hi: 0, rev: 0, past: carry || [], after: after || null, paused: paused, t0: simTime };
    box.classList.add("on");
    show(norm(seq[0]));
    loop();
  }

  function bubble(ent, text, secs) {
    bubbles = bubbles.filter(function (b) { return b.ent !== ent; });
    bubbles.push({ ent: ent, text: text, t0: simTime, life: secs || 3 });
    var v = ent.voice && voiceOf(ent.voice);
    if (v && typeof sfx === "function") for (var i = 0; i < 3; i++) setTimeout(function () { sfx("voice", { f: v.f, wave: v.wave, slide: v.slide, vol: (v.vol || 0.045) * 0.6 }); }, i * 70);
  }
  function drawBubbles(g) {
    bubbles = bubbles.filter(function (b) { return simTime - b.t0 < b.life; });
    bubbles.forEach(function (b) {
      var age = simTime - b.t0, shown = b.text.slice(0, Math.max(1, Math.floor(age * 40)));
      var x = Math.round(b.ent.x), y = Math.round((b.ent.topY || b.ent.y - 40) - 10);
      g.save();
      g.globalAlpha = Math.min(1, (b.life - age) / 0.3);
      g.font = "600 10px 'Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
      var w = Math.ceil(g.measureText(b.text).width) + 12, hgt = 16;
      if (typeof view === "object" && view) x = Math.max(view.x0 + w / 2 + 4, Math.min(view.x1 - w / 2 - 4, x));
      g.fillStyle = "#000"; g.fillRect(x - w / 2, y - hgt, w, hgt);
      g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.strokeRect(x - w / 2 + 0.5, y - hgt + 0.5, w - 1, hgt - 1);
      g.fillStyle = "#000"; g.beginPath(); g.moveTo(x - 4, y - 1); g.lineTo(x + 4, y - 1); g.lineTo(x, y + 5); g.fill();
      g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x, y + 5); g.lineTo(x + 4, y); g.stroke();
      g.textAlign = "left"; g.fillStyle = "#fff"; g.fillText(shown, x - w / 2 + 6, y - hgt / 2);
      g.restore();
    });
  }

  function reset() { cur = null; bubbles = []; if (box) box.classList.remove("on", "held"); }

  BH.talk = {
    reset: reset,
    voice: function (id, def) { VOICES[id] = def; },
    open: open,
    isOpen: function () { return !!cur; },
    interruptible: function () { return !cur || (!cur.rev && !cur.choices && !cur.line.choices && !cur.after); },
    bubble: bubble,
    drawBubbles: drawBubbles,
    _state: function () { return cur ? { who: cur.line.who, text: cur.line.text, shown: cur.shown, done: cur.done, choices: cur.choices ? cur.choices.map(function (c) { return c.text; }) : null, back: canBack(), rev: cur.rev } : null; }
  };
})();
