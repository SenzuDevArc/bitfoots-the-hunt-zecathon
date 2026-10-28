(function () {
  "use strict";
  if (window.__autopilotReady) return;
  window.__autopilotReady = true;
  window.autopilot = null;
  window.inputFeed = null;
  var splashSeen = null;
  function caveSplashes() { var s = BH.cave && BH.cave.state ? BH.cave.state() : null; return s ? s.splashes : null; }
  function vec() {
    var a = window.autopilot, sp = caveSplashes();
    if (splashSeen !== null && sp !== null && sp > splashSeen) a.path = [];
    splashSeen = sp;
    if (!a.path.length) {
      if (!a.targets.length) { if (a.clearGhost) ghost = false; window.autopilot = null; return [0, 0]; }
      var t = a.targets.shift(); a.path = bfs(Math.floor(player.x / T), Math.floor(player.y / T), t[0], t[1], solidP);
      if (!a.path.length) return [0, 0];
    }
    var g = a.path[0], dx = g[0] - player.x, dy = g[1] - player.y, d = Math.hypot(dx, dy);
    if (d < 5) { a.path.shift(); return vec(); }
    return [dx / d, dy / d];
  }
  var sample = window.sampleInput;
  window.sampleInput = function () {
    if (typeof window.inputFeed === "function") return window.inputFeed();
    var q = sample();
    if (window.autopilot) {
      var ap = vec();
      q.a = 0; q.x = ap[0]; q.y = ap[1];
      if (window.autopilot && window.autopilot.sprint && L && L.sprint) q.s = 1;
    } else splashSeen = null;
    return q;
  };
  var load = window.loadLevel;
  window.loadLevel = function () { window.autopilot = null; splashSeen = null; return load.apply(this, arguments); };
})();
