"use strict";

BH.bosses = (function () {
  var reg = {}, order = [];
  return {
    register: function (id, def) { if (!reg[id]) order.push(id); reg[id] = def || {}; return reg[id]; },
    get: function (id) { return reg[id] || null; },
    ids: function () { return order.slice(); }
  };
})();

var TRACKER = { KNEEL: 1.0, CONFUSED: 4, EVERY: [0, 6.5, 5.5, 7.5], SPEED: [0, 1, 1, 0.88], PHASE_AT: [0, 0, 4, 8], WATCH: 4 };
function trackerPhase() { var b = player ? player.carry + player.stash : 0; return b >= TRACKER.PHASE_AT[3] ? 3 : b >= TRACKER.PHASE_AT[2] ? 2 : 1; }
BH.bosses.register("tracker", {
  speed: 1.2,
  visionBonus: 1.5,
  smellsOld: true,
  look: { scale: 1.35, coat: "#2a2a2a", band: C.red, markLift: 26 },
  onStep: function (h, dt) {
    var def = this, tk = h.tk;
    if (!tk) {
      tk = h.tk = { phase: 0, sp0: h.sp, kneelUntil: 0, confUntil: 0, nextSniff: simTime + TRACKER.EVERY[1], seenExits: {}, drone: null, hounds: [] };
      def.visionBonus = 1.5;
      hunters.forEach(function (d) { if (d.type === "dog") { d.kennel = { x: d.x, y: d.y }; d.state = "kennel"; tk.hounds.push(d); } });
      if (drone) { tk.drone = drone; drone = null; }
    }
    var ph = trackerPhase();
    if (ph > tk.phase) {
      var first = tk.phase === 0; tk.phase = ph; h.sp = tk.sp0 * TRACKER.SPEED[ph];
      if (ph >= 2) tk.hounds.forEach(releaseHound);
      if (ph >= 3 && tk.drone) { drone = tk.drone; tk.drone = null; }
      if (!first) { shake = Math.max(shake, 8); say(ph === 2 ? "trackerHounds" : "trackerDrone", C.red); }
    }
    tk.hounds.forEach(function (d) {
      if (!d.kennel) return;
      if (dist(d, player) < (D_SENSE + 0.6) * T && !player.inShield) { releaseHound(d); return; }
      d.x = d.kennel.x; d.y = d.kennel.y; d.state = "kennel"; d.path = []; d.dir += dt * 0.4;
    });
    if (tk.confUntil) {
      if (simTime < tk.confUntil && (h.state === "confused" || h.state === "chase")) { h.state = "confused"; h.dir += dt * 5; def.visionBonus = -VISION; return; }
      tk.confUntil = 0; def.visionBonus = 1.5; loseTrail(h); tk.nextSniff = simTime + TRACKER.EVERY[tk.phase];
    }
    var recent = exitEvents.filter(function (e) { return simTime - e.t <= CROWD_WINDOW && Math.hypot(e.x - h.x, e.y - h.y) <= (visionOf(h) + TRACKER.WATCH) * T; });
    var ids = {}; recent.forEach(function (e) { ids[e.npc] = 1; });
    var fresh = recent.filter(function (e) { return !tk.seenExits[e.npc + "@" + e.t.toFixed(2)]; });
    if (Object.keys(ids).length >= 3 && fresh.length) {
      recent.forEach(function (e) { tk.seenExits[e.npc + "@" + e.t.toFixed(2)] = 1; });
      tk.confUntil = simTime + TRACKER.CONFUSED; tk.kneelUntil = 0; h.state = "confused"; h.path = []; def.visionBonus = -VISION;
      Snd.confused(); say("trackerConfused", C.ice); trace.push(simTime.toFixed(1) + " tracker confused by " + Object.keys(ids).length);
      return;
    }
    if (tk.kneelUntil) {
      if (h.state !== "kneel") { tk.kneelUntil = 0; tk.nextSniff = simTime + TRACKER.EVERY[tk.phase]; return; }
      if (simTime < tk.kneelUntil) return;
      tk.kneelUntil = 0; tk.nextSniff = simTime + TRACKER.EVERY[tk.phase];
      var p = prints[prints.length - 1];
      if (player.inShield || !p || p.i < h.ignoreBefore) { loseTrail(h); trace.push(simTime.toFixed(1) + " tracker stood up: lost you"); return; }
      h.state = "rush"; h.decoy = false; h.target = { x: p.x, y: p.y }; h.followIdx = p.i; h.path = []; h.pathKey = "";
      h.pursuit = { kind: "boss" };
      shake = Math.max(shake, 6); Snd.spotted(); say("trackerSnap", C.red); trace.push(simTime.toFixed(1) + " tracker snapped to print " + p.i);
      return;
    }
    var busy = h.state === "chase" || h.state === "rush";
    if (!busy && simTime >= tk.nextSniff && game.phase === "play" && prints.length) {
      tk.kneelUntil = simTime + TRACKER.KNEEL; h.state = "kneel"; h.path = []; h.pathKey = "";
      Snd.sniff(); ring(h.x, h.y, "rgba(234,186,73,0.7)", T * 1.6, TRACKER.KNEEL);
    } else if (busy) tk.nextSniff = Math.max(tk.nextSniff, simTime + 1.5);
  },
  draw: function (h) {
    var tk = h.tk, look = this.look;
    if (tk && tk.kneelUntil && h.state === "kneel") {
      ctx.save(); ctx.translate(h.x, h.y + 8); ctx.scale(1, 0.72); ctx.translate(-h.x, -h.y - 8);
      drawHunterBody({ x: h.x, y: h.y, dir: h.dir, step: 0, state: "" }, look); ctx.restore();
      var f = 1 - (tk.kneelUntil - simTime) / TRACKER.KNEEL;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y - 2, 22, -Math.PI / 2, -Math.PI / 2 + f * 6.283); ctx.stroke();
      ctx.fillStyle = C.gold; ctx.font = "600 12px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText("SNIFF", h.x, h.y - 30);
      return;
    }
    drawHunterBody(h, look);
    if (h.state === "confused") {
      ctx.fillStyle = C.ice; ctx.font = "600 16px 'Plex Cond', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText("??", h.x + Math.sin(simTime * 6) * 4, h.y - 30);
    }
  }
});
function releaseHound(d) { if (!d.kennel) return; d.kennel = null; d.state = "patrol"; d.path = []; d.pathKey = ""; }

BH.bosses.register("matcher", {
  speed: 0.0001,
  visionBonus: -5.5,
  look: { scale: 1.5, coat: "#2f2a3a", band: C.gold, markLift: 34 },
  onStep: function (h, dt) {
    this.visionBonus = -VISION;
    if (!h.perch) h.perch = { x: h.x, y: h.y };
    h.x = h.perch.x; h.y = h.perch.y; h.state = "perch"; h.path = []; h.pathKey = ""; h.decoy = false; h.target = null;
    h.dir = Math.atan2(player.y - h.y, player.x - h.x);
  },
  draw: function (h) {
    var x = Math.round(h.x), y = Math.round(h.y);
    ctx.fillStyle = "#3a2a1e"; ctx.fillRect(x - 14, y + 4, 28, 6); ctx.fillRect(x - 12, y + 10, 3, 12); ctx.fillRect(x + 9, y + 10, 3, 12);
    ctx.fillStyle = "#5a4330"; ctx.fillRect(x - 16, y + 2, 32, 3);
    drawHunterBody({ x: x, y: y - 6, dir: h.dir, step: 0, state: "" }, this.look);
    var writing = Math.sin(simTime * 20) > 0 ? 1 : 0;
    ctx.fillStyle = "#f5e8c8"; ctx.fillRect(x + 8, y - 6, 12, 9); ctx.fillStyle = "#8a6a44"; ctx.fillRect(x + 13, y - 6, 1, 9);
    ctx.fillStyle = C.ink; ctx.fillRect(x + 17 + writing, y - 16, 2, 10); ctx.fillStyle = "#1b1b1b"; ctx.fillRect(x + 17 + writing, y - 7, 2, 2);
    ctx.fillStyle = "#1b1b1b"; ctx.fillRect(x - 20, y - 2, 5, 5);
    ctx.font = "600 11px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var lbl = "THE MATCHER", w = ctx.measureText(lbl).width + 8;
    ctx.fillStyle = "rgba(27,27,27,0.85)"; ctx.fillRect(x - w / 2, y - 48, w, 14); ctx.fillStyle = nameColor(h.type || "matcher", C.gold); ctx.fillText(lbl, x, y - 41);
    var tag = (F.gp && F.gp.matcherTag) || "WRITES · NEVER CHASES";
    ctx.font = "600 9px 'Plex Mono', monospace"; var tw = ctx.measureText(tag).width + 8;
    ctx.fillStyle = "rgba(27,27,27,0.85)"; ctx.fillRect(x - tw / 2, y - 34, tw, 12); ctx.fillStyle = "rgba(255,250,240,0.8)"; ctx.fillText(tag, x, y - 28);
  }
});
