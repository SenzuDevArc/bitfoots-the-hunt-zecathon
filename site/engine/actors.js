"use strict";

function setupCrowd() {
  npcs = []; shores = []; crowdLanes = []; crowdBandSeen = {};
  if (!L.crowd) return;
  var water = [];
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
    if (isWater(grid[y][x])) water.push([x, y]);
    else if (isOpenGround(grid[y][x])) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { if (isWater(tile(x + d[0], y + d[1]))) shores.push({ lx: x, ly: y, wx: x + d[0], wy: y + d[1] }); });
  }
  for (var i = 0; i < L.crowd; i++) {
    var w = water[Math.floor(rnd() * water.length)];
    npcs.push({ x: (w[0] + 0.5) * T, y: (w[1] + 0.5) * T, st: "swim", path: [], wait: rnd() * 2, dir: "right", anim: "idle", animT0: 0, spinUntil: 0, inWater: true, id: i });
  }
  wave = { st: "idle", t: 2 + rnd() * 2 };
  var cw = L.crowdWaves;
  if (cw) for (var k = 1; k < (cw.lanes || 1); k++) crowdLanes.push({ st: "idle", t: 1 + rnd() * 2, lane: k });
}
var crowdLanes = [], crowdBandSeen = {};
function crowdShore(lane) {
  var banks = {};
  shores.forEach(function (s) { var key = (s.lx - s.wx) + "," + (s.ly - s.wy); (banks[key] = banks[key] || []).push(s); });
  var keys = Object.keys(banks).sort(function (a, b) { return banks[b].length - banks[a].length || (a < b ? -1 : 1); });
  var bank = banks[keys[lane % keys.length]], along = function (s) { return s.lx === s.wx ? s.lx : s.ly; };
  var lo = Math.min.apply(null, bank.map(along)), hi = Math.max.apply(null, bank.map(along)), third = function (s) { return Math.min(2, Math.floor(3 * (along(s) - lo) / (hi - lo + 1))); };
  var bandKey = function (b) { return keys[lane % keys.length] + "#" + b; }, best = 0;
  for (var b = 1; b < 3; b++) if ((crowdBandSeen[bandKey(b)] || -1) < (crowdBandSeen[bandKey(best)] || -1)) best = b;
  crowdBandSeen[bandKey(best)] = simTime;
  var pick = bank.filter(function (s) { return third(s) === best; });
  if (!pick.length) pick = bank;
  return pick[Math.floor(rnd() * pick.length)];
}
function npcLit(h, n) {
  if (h.type === "dog") return false;
  var d = Math.hypot(n.x - h.x, n.y - h.y);
  if (d > visionOf(h) * T || Math.abs(angDiff(Math.atan2(n.y - h.y, n.x - h.x), h.dir)) > CONE) return false;
  return losClear(h.x, h.y, n.x, n.y);
}
var npcTagSpots = [];
function drawCrowdGroup() {
  npcTagSpots = [];
  if (!liveFrame) return;
  [wave].concat(crowdLanes).forEach(drawWaveGroup);
}
function drawWaveGroup(w) {
  if (!w || w.st !== "out" || !w.members) return;
  var out = w.members.filter(function (n) { return !n.inWater; });
  if (out.length < 2) return;
  var pts = out.map(function (n) { return { x: n.x, y: n.y + 10 }; });
  if (!player.inShield && out.some(function (n) { return Math.hypot(n.x - player.x, n.y - player.y) < 2.5 * T; })) pts.push({ x: player.x, y: player.y + 10 });
  var cx = 0, cy = 0; pts.forEach(function (p) { cx += p.x; cy += p.y; }); cx /= pts.length; cy /= pts.length;
  ctx.strokeStyle = "rgba(190,235,255,0.28)"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath();
  pts.forEach(function (p) { ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); }); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "rgba(190,235,255,0.35)"; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 6.283); ctx.fill();
}
function npcGoto(n, tx, ty, solid) { n.path = bfs(Math.floor(n.x / T), Math.floor(n.y / T), tx, ty, solid); }
function waterOnly(c) { return !isWater(c); }
function stepCrowd(dt) {
  if (!npcs.length) return;
  wave = stepWave(wave, dt, 0);
  if (crowdLanes.length && !(wave.st === "idle" && wave.t > 100)) for (var k = 0; k < crowdLanes.length; k++) crowdLanes[k] = stepWave(crowdLanes[k], dt, k + 1);
  stepNpcs(dt);
}
function stepWave(w, dt, lane) {
  var cw = L.crowdWaves;
  w.t -= dt;
  if (w.st === "idle" && w.t <= 0) {
    var s = cw ? crowdShore(lane) : shores[Math.floor(rnd() * shores.length)], far = {};
    var pool = npcs.filter(function (n) { if (n.st !== "swim") return false; var r = bfsCore(Math.floor(n.x / T), Math.floor(n.y / T), s.wx, s.wy, function (x, y) { return !isWater(tile(x, y)); }); far[n.id] = r.path.length; return r.reached; });
    if (cw) pool.sort(function (a, b) { return far[a.id] - far[b.id] || a.id - b.id; });
    if (pool.length >= 2) {
      w = { st: "gather", t: 3.2, shore: s, members: pool.slice(0, Math.min(cw ? cw.size || 3 : 3, pool.length)), lane: lane };
      w.members.forEach(function (n) { n.st = "gather"; npcGoto(n, s.wx, s.wy, waterOnly); });
    } else w.t = 1;
  } else if (w.st === "gather" && (w.t <= 0 || w.members.every(function (n) { return !n.path.length; }))) {
    w.st = "out"; w.t = cw && cw.out ? cw.out : 5;
    var sh = w.shore;
    w.members.forEach(function (n, k) {
      var dx = sh.lx - sh.wx, dy = sh.ly - sh.wy, tx = sh.lx + dx * (1 + (k % 2)), ty = sh.ly + dy * (1 + (k % 2));
      if (solidP(tile(tx, ty))) { tx = sh.lx; ty = sh.ly; }
      n.st = "out"; n.wait = 1.2 + rnd() * 1.2; npcGoto(n, tx, ty, solidP);
    });
  } else if (w.st === "out" && w.t <= 0) {
    w.members.forEach(function (n) { n.st = "back"; npcGoto(n, w.shore.wx, w.shore.wy, solidP); });
    w = { st: "idle", t: cw && cw.gap ? cw.gap[0] + rnd() * (cw.gap[1] - cw.gap[0]) : 3 + rnd() * 3, lane: lane };
  }
  return w;
}
function stepNpcs(dt) {
  npcs.forEach(function (n) {
    var sp = NPC_SPEED * T * dt, moved = false;
    if (n.path.length) {
      var g = n.path[0], dx = g[0] - n.x, dy = g[1] - n.y, d = Math.hypot(dx, dy);
      if (d < 2) n.path.shift(); else { var m = Math.min(d, sp); n.x += dx / d * m; n.y += dy / d * m; moved = true; n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"); }
    } else if (n.st === "swim") {
      n.wait -= dt;
      if (n.wait <= 0) { var tx = Math.floor(n.x / T) + Math.floor(rnd() * 7) - 3, ty = Math.floor(n.y / T) + Math.floor(rnd() * 7) - 3; if (isWater(tile(tx, ty))) npcGoto(n, tx, ty, waterOnly); n.wait = 1 + rnd() * 2; }
    } else if (n.st === "out") { n.wait -= dt; }
    else if (n.st === "back") { n.st = "swim"; }
    var wet = isWater(tileAt(n.x, n.y));
    if (n.inWater && !wet) exitEvents.push({ t: simTime, x: n.x, y: n.y, npc: n.id });
    if (!n.inWater && wet) { n.spinUntil = simTime + spinDuration(); ring(n.x, n.y, "rgba(170,230,255,0.45)", T * 1.2, 0.6); }
    n.inWater = wet;
    if (!wet && hunters.some(function (h) { return npcLit(h, n); })) n.litAt = simTime;
    var a = simTime < n.spinUntil ? "spin" : (moved ? "walk" : "idle");
    if (a !== n.anim) { n.anim = a; n.animT0 = simTime; }
  });
  exitEvents = exitEvents.filter(function (e) { return simTime - e.t < 8; });
}

function setupDrone() {
  drone = null;
  if (!L.drone) return;
  var p = L.drone[0];
  drone = { x: (p[0] + 0.5) * T, y: (p[1] + 0.5) * T, wp: 1, cool: 0 };
}
function stepDrone(dt) {
  if (!drone) return;
  var w = L.drone[drone.wp], tx = (w[0] + 0.5) * T, ty = (w[1] + 0.5) * T, dx = tx - drone.x, dy = ty - drone.y, d = Math.hypot(dx, dy), sp = 2.2 * T * dt;
  if (d < sp) drone.wp = (drone.wp + 1) % L.drone.length; else { drone.x += dx / d * sp; drone.y += dy / d * sp; }
  drone.cool -= dt;
  var fresh = null, r = 1.6 * T;
  for (var i = 0; i < prints.length; i++) { var p = prints[i]; if (!p.red && Math.abs(p.x - drone.x) < r && Math.abs(p.y - drone.y) < r) { p.red = true; fresh = p; } }
  if (fresh && drone.cool <= 0) {
    drone.cool = 4; sfx("drone"); say("drone", C.red);
    var best = null, bd = 1e9;
    hunters.forEach(function (h) { if (h.state === "chase" || h.state === "rush") return; var dd = dist(h, fresh); if (dd < bd) { bd = dd; best = h; } });
    if (best) { best.state = "rush"; best.decoy = false; best.droneSent = true; best.target = { x: fresh.x, y: fresh.y }; best.followIdx = fresh.i; best.path = []; best.pathKey = "";
      best.pursuit = { kind: "drone", age: Math.round(simTime - fresh.t) }; }
  }
}

var decoyBtn = document.getElementById("decoy");
function throwDecoy() {
  if (game.screen !== "play" || game.phase !== "play" || !player.decoys) return false;
  var a = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[player.dir], d = 0, x = player.x, y = player.y;
  while (d < 4 * T) { var nx = player.x + Math.cos(a) * (d + 4), ny = player.y + Math.sin(a) * (d + 4); if (solidP(tileAt(nx, ny))) break; d += 4; x = nx; y = ny; }
  player.decoys--; done.decoy = true;
  tufts.push({ x: x, y: y, t: simTime, sx: player.x, sy: player.y });
  sfx("decoy"); say("decoy", C.gold);
  setTimeout(function () {}, 0);
  hunters.forEach(function (h) {
    if (h.state === "chase" && canSee(h)) return;
    if (dist(h, { x: x, y: y }) < 10 * T) { h.state = "rush"; h.decoy = true; h.droneSent = false; h.target = { x: x, y: y }; h.path = []; h.pathKey = ""; }
  });
  updateStrip();
  return true;
}
if (decoyBtn) decoyBtn.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); audioInit(); throwDecoy(); });

function setAnim(a) { if (player.anim !== a) { player.anim = a; player.animT0 = simTime; } }
function movePlayer(dt) {
  var inp = inputVec(), here = tileAt(player.x, player.y), inWater = isWater(here);
  var moving = Math.hypot(inp[0], inp[1]) > 0.1;
  var dash = !!(BH.powerups && BH.powerups.active("dash"));
  var sprint = dash ? moving && !inWater : wantsSprint() && moving && !inWater && !player.winded && player.stamina > 0;
  player.sprinting = sprint;
  if (dash) {  }
  else if (sprint) { player.stamina -= dt; if (player.stamina <= 0) { player.stamina = 0; player.winded = true; } }
  else { player.stamina = Math.min(STAMINA, player.stamina + STAMINA_REGEN * dt); if (player.winded && player.stamina > STAMINA * 0.5) player.winded = false; }
  var sp = (inWater ? SPEED_WATER : sprint ? SPEED_SPRINT : SPEED_LAND) * T, k = 1 - Math.exp(-dt * 14);
  player.vx += (inp[0] * sp - player.vx) * k; player.vy += (inp[1] * sp - player.vy) * k;
  var r = T * 0.3, nx = player.x + player.vx * dt, ny = player.y + player.vy * dt, ox = player.x, oy = player.y;
  if (!hitsWall(nx, player.y, r, here)) player.x = nx; else player.vx = 0;
  if (!hitsWall(player.x, ny, r, here)) player.y = ny; else player.vy = 0;
  if (Math.hypot(inp[0], inp[1]) > 0.3) slideOffCorner(inp[0], inp[1], player.x !== nx, player.y !== ny, r);
  var stepLen = Math.hypot(player.x - ox, player.y - oy), spd = Math.hypot(player.vx, player.vy);
  player.traveled += stepLen / T; if (sprint) player.sprintDist += stepLen / T;
  player.moving = spd > 12;
  if (moving) {
    player.dir = Math.abs(inp[0]) > Math.abs(inp[1]) ? (inp[0] > 0 ? "right" : "left") : (inp[1] > 0 ? "down" : "up");
    if (Math.abs(inp[0]) > 0.01) player.face = inp[0] > 0 ? "right" : "left";
  }
  if (simTime < player.spinUntil) setAnim("spin"); else setAnim(player.moving ? "walk" : "idle");
  if (player.traveled > 3) { done.walk = true; hideGoal(); }
  if (player.sprintDist > 2) done.sprint = true;

  var nowWater = isWater(tileAt(player.x, player.y));
  if (nowWater && !player.inShield) enterShield();
  else if (!nowWater && player.inShield) leaveShield();
  var bush = tileAt(player.x, player.y) === "b";
  if (bush && !player.inBush) { done.bush = true; if (!player.bushSaid) { player.bushSaid = true; say("bush", C.gold); } }
  player.inBush = bush;
  if (!player.inShield && player.moving) {
    player.dist += stepLen;
    if (player.dist >= printGap() * T) {
      player.dist = 0; var sp0 = stamp();
      if (sp0 && sp0.big && (player.bigCount = (player.bigCount || 0) + 1) % 3 === 1) makeNoise(sp0.x, sp0.y, SPRINT_NOISE, "sprint");
    }
  }
  var ptx = Math.floor(player.x / T), pty = Math.floor(player.y / T);
  if (ptx !== player.tx || pty !== player.ty) { var otx = player.tx, oty = player.ty; player.tx = ptx; player.ty = pty; tileHook("onLeave", otx, oty); tileHook("onEnter", ptx, pty); }
  if (stepLen > 0) featureCall("onPlayerMove");

  if (player.inShield) {
    player.stashCool -= dt;
    stashes.forEach(function (c) {
      if (Math.floor(player.x / T) === c.tx && Math.floor(player.y / T) === c.ty && player.carry > 0 && player.stashCool <= 0) {
        player.carry--; player.stash++; c.stored++; player.stashCool = 0.6; done.amount = true;
        sfx("stash"); ring(c.x, c.y, "rgba(190,235,255,0.8)", T, 0.5); say("stash", C.ice);
        floaters.push({ x: c.x, y: c.y, fly: { x: player.x, y: player.y - 14 }, text: "", t0: simTime, life: 0.3 });
        floatText(c.x, c.y - 40, (F.gp && F.gp.stashDrop) || "+1 SHIELDED", C.ice, "", 1.0);
        floaters[floaters.length - 1].t0 = simTime + 0.25;
      }
    });
  }
}
var SPRINT_NOISE = 3;
var SLIDE = 2;
function slideOffCorner(ix, iy, stuckX, stuckY, r) {
  var go = function (ax) {
    var s = ax ? (iy > 0 ? 1 : -1) : (ix > 0 ? 1 : -1), lead = (ax ? player.y : player.x) + s * (r + 2);
    var a = ax ? solidP(tileAt(player.x - r, lead)) : solidP(tileAt(lead, player.y - r));
    var b = ax ? solidP(tileAt(player.x + r, lead)) : solidP(tileAt(lead, player.y + r));
    if (a === b) return;
    var d = a ? SLIDE : -SLIDE, x = ax ? player.x + d : player.x, y = ax ? player.y : player.y + d;
    var from = tileAt(player.x, player.y);
    if (hitsWall(x, y, r, from, true) || isWater(tileAt(x, y)) !== isWater(from)) return;
    player.x = x; player.y = y;
  };
  if (stuckX && Math.abs(ix) > 0.3 && Math.abs(iy) < 0.3) go(0);
  if (stuckY && Math.abs(iy) > 0.3 && Math.abs(ix) < 0.3) go(1);
}
function entryRefused(c, from) { if (c === from) return false; var d = TILE_DEFS[c]; return !!(d && d.canEnter && !d.canEnter(from)); }
function blocks(c, from) { return solidP(c) || entryRefused(c, from); }
function hitsWall(x, y, r, from, probe) {
  var cs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  if (entryRefused(tileAt(x, y), from)) return true;
  if (!probe && window.bankHold && isWater(from) !== isWater(tileAt(x, y)) && window.bankHold(
    { x: Math.floor(player.x / T), y: Math.floor(player.y / T), c: from }, { x: Math.floor(x / T), y: Math.floor(y / T), c: tileAt(x, y) })) return true;
  for (var i = 0; i < 4; i++) { if (solidP(tileAt(x + cs[i][0] * r, y + cs[i][1] * r))) return true; }
  return false;
}
function stamp(force) {
  if (!player.moving && !force) return null;
  if (!force && BH.powerups && BH.powerups.active("hush")) return null;
  var a = Math.atan2(player.vy, player.vx);
  player.side = -player.side;
  var p = { x: player.x + Math.cos(a + 1.5708) * 5 * player.side, y: player.y + Math.sin(a + 1.5708) * 5 * player.side, a: a, t: simTime, seg: player.seg, i: prints.length, big: player.sprinting };
  prints.push(p); puff(p.x, p.y, p.big ? 6 : 3, "rgba(234,186,73,0.55)", p.big ? 24 : 14);
  if (!force) sfx(p.big ? "sprint" : "step");
  BH.items.hook("onPrint", p);
  if (prints.length >= 18) done.look = true;
  return p;
}
function enterShield() {
  if (pendingLink && simTime - pendingLink.t < CROWD_WINDOW) { pendingLink = null; player.inShield = true; return; }
  player.inShield = true; done.water = true;
  var last = prints.length ? prints[prints.length - 1] : { x: player.x, y: player.y };
  player.entry = { x: player.x, y: player.y, t: simTime, pos: { x: last.x, y: last.y }, carry: player.carry };
  BH.items.hook("onEnterShield", player.entry);
  player.spinUntil = simTime + spinDuration();
  ring(player.x, player.y, "rgba(170,230,255,0.8)", T * 2.2, 0.9); ring(player.x, player.y, "rgba(234,186,73,0.6)", T * 1.4, 0.6);
  puff(player.x, player.y, 14, "rgba(190,235,255,0.8)", 40); setShieldedAudio(true);
  say("shield", C.ice);
}
function leaveShield() {
  player.inShield = false; player.seg += 1; player.dist = 0;
  var p = stamp(true) || prints[prints.length - 1];
  ring(player.x, player.y, "rgba(170,230,255,0.5)", T * 1.2, 0.5); setShieldedAudio(false);
  var e = player.entry; if (!e || !p) return;
  BH.items.hook("onExitShield", e, p);
  if (BH.bank && BH.bank.quiet && BH.bank.quiet()) return;
  if (L.amounts && L.amountLink !== false && e.carry > 0 && player.carry === e.carry) { linkNow(e, p, "amount"); return; }
  if (L.amounts && !L.noUnmatched && player.carry !== e.carry) game.unmatchedPending = { t: simTime, links: links };
  if (L.crowd) pendingLink = { t: simTime, x: player.x, y: player.y, e: e, p: p, seg: player.seg - 1 };
}
function crowdAt(t, x, y) { return exitEvents.filter(function (ev) { return Math.abs(ev.t - t) <= CROWD_WINDOW && Math.hypot(ev.x - x, ev.y - y) <= CROWD_RADIUS * T; }); }
function resolvePending() {
  if (!pendingLink || simTime - pendingLink.t < CROWD_WINDOW) return;
  var pl = pendingLink; pendingLink = null;
  var crowd = crowdAt(pl.t, pl.x, pl.y), seen = {};
  crowd = crowd.filter(function (ev) { if (seen[ev.npc]) return false; seen[ev.npc] = true; return true; });
  trace.push("crowd exit: " + crowd.length + " others");
  if (crowd.length >= 2) {
    done.crowd = true; sfx("crowd"); say("crowd", C.ice);
    var pick = crowd[Math.floor(rnd() * crowd.length)], h = nearestReachable(pick.x, pick.y);
    if (h) { h.state = "rush"; h.decoy = true; h.droneSent = false; h.target = { x: pick.x, y: pick.y }; h.path = []; h.pathKey = ""; }
  } else linkNow(pl.e, pl.p, "alone", pl.seg);
}
function linkNow(e, p, why, seg) {
  links++; if (L.linkCalls !== false) bridges[seg != null ? seg : player.seg - 1] = true;
  strings.push({ ax: e.pos.x, ay: e.pos.y, bx: p.x, by: p.y, t0: simTime, amount: why === "amount" ? e.carry : null, why: why });
  shake = Math.max(shake, 10); sfx("linked"); say(why, C.string);
  var h = L.linkCalls === false ? null : nearestReachable(p.x, p.y);
  if (h) { h.state = "rush"; h.decoy = false; h.droneSent = false; h.target = { x: p.x, y: p.y }; h.followIdx = p.i; h.path = []; h.pathKey = ""; bossRushesLink(h);
    h.pursuit = { kind: "link", why: why, carry: e.carry }; }
}
function bossRushesLink(h) { if (BH.bosses.get(h.type)) { sfx("boss"); teach("bossLink", { h: h }); } }
function nearestReachable(x, y) {
  var best = null, bd = 1e9, ex = Math.floor(x / T), ey = Math.floor(y / T);
  hunters.forEach(function (h) {
    var r = bfsCore(Math.floor(h.x / T), Math.floor(h.y / T), ex, ey, function (xx, yy) { return solidH(tile(xx, yy)); });
    if ((r.reached || Math.hypot(h.x - x, h.y - y) < T * 1.5) && r.path.length < bd) { bd = r.path.length; best = h; }
  });
  return best;
}
function spinDuration() { return window.BitfootSprite && window.BitfootSprite.SPIN_DURATION ? window.BitfootSprite.SPIN_DURATION : 0.6; }

function smellsOld(h) { var b = BH.bosses.get(h.type); return h.type === "dog" || !!(b && b.smellsOld); }
function visionOf(h) { var b = BH.bosses.get(h.type); return b ? VISION + (b.visionBonus || 0) : VISION; }
function bankHides() {
  if (!L.bankHides) return false;
  var tx = Math.floor(player.x / T), ty = Math.floor(player.y / T);
  for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (tile(tx + dx, ty + dy) === "~") return true;
  return false;
}
function canSee(h) {
  if (player.inShield || ghost || bankHides()) return false;
  var d = dist(h, player);
  if (h.type === "dog") return d < D_SENSE * T;
  if (d < SENSE * T) return true;
  if (player.inBush) return false;
  var vis = visionOf(h);
  if (d > vis * T) return false;
  if (Math.abs(angDiff(Math.atan2(player.y - h.y, player.x - h.x), h.dir)) > CONE) return false;
  if (!bushClear(h.x, h.y, player.x, player.y)) return false;
  return losClear(h.x, h.y, player.x, player.y);
}
function bushClear(ax, ay, bx, by) {
  var d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 6), sx = Math.floor(ax / T), sy = Math.floor(ay / T), ex = Math.floor(bx / T), ey = Math.floor(by / T);
  for (var i = 1; i < n; i++) {
    var x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if ((tx === sx && ty === sy) || (tx === ex && ty === ey)) continue;
    if (tile(tx, ty) === "b") return false;
  }
  return true;
}
function stepHunter(h, dt) {
  var s0 = h.state, x0 = h.x, y0 = h.y, boss = BH.bosses.get(h.type); stepHunterInner(h, dt); if (boss && boss.onStep) boss.onStep(h, dt);
  if (isWater(tileAt(h.x, h.y)) && !isWater(tileAt(x0, y0))) { h.x = x0; h.y = y0; h.path = []; h.pathKey = ""; if (h.state !== "patrol" && h.state !== "return") loseTrail(h); }
  if (h.state !== s0) { stats.trans++; trace.push(simTime.toFixed(1) + " " + h.type + " " + s0 + ">" + h.state); } }
var SUS_NEAR = 0.25, SUS_FAR = 1.0, SUS_DRAIN = 0.5, SUS_CHECK = 0.5;
function susFillTime(h) {
  var d = dist(h, player) / T;
  if (h.type === "dog" || d < SENSE) return 0;
  var vis = visionOf(h), f = Math.max(0, Math.min(1, (d - SENSE) / Math.max(0.01, vis - SENSE)));
  return SUS_NEAR + (SUS_FAR - SUS_NEAR) * f;
}
function spotted(h) {
  var dog = h.type === "dog";
  h.state = "chase"; h.decoy = false; h.sus = 1; h.target = { x: player.x, y: player.y }; addTrauma(0.45); hitstop(0.06); player.combo = 1; player.seenThisLevel = true;
  h.caughtHow = "spotted";
  h.seen = { d: Math.round(dist(h, player) / T), sprint: !!player.sprinting, t: simTime };
  if (!h.pursuit) h.pursuit = { kind: "seen" };
  if (dog) sfx("bark"); else if (BH.bosses.get(h.type)) sfx("boss"); else sfx("spotted");
  say("seen", C.red);
}
function stepHunterInner(h, dt) {
  var dog = h.type === "dog", sees = canSee(h);
  if (sees && h.state !== "chase" && !dog && dist(h, player) >= SENSE * T && BH.powerups && BH.powerups.active("cloak")) sees = false;
  if (sees && h.state !== "chase") {
    var ft = susFillTime(h);
    h.sus = ft <= 0 ? 1 : Math.min(1, (h.sus || 0) + dt / ft);
    var q4 = Math.floor(h.sus * 4); if (q4 > (h.susTick || 0) && h.sus < 1) sfx("suspicion", { level: h.sus }); h.susTick = q4;
    h.lastSeen = { x: player.x, y: player.y };
    if (h.sus >= 1) spotted(h);
    else if (h.state !== "rush") { turn(h, Math.atan2(player.y - h.y, player.x - h.x), dt * 0.5); return catchCheck(h); }
  } else if (!sees && h.state !== "chase" && h.sus > 0) {
    var was = h.sus;
    h.sus = Math.max(0, h.sus - SUS_DRAIN * dt); h.susTick = Math.floor(h.sus * 4);
    if (was >= SUS_CHECK && h.lastSeen && (h.state === "patrol" || h.state === "return" || h.state === "search")) {
      h.state = "check"; h.target = h.lastSeen; h.path = []; h.pathKey = ""; h.checkT = 0; h.sus = Math.min(h.sus, SUS_CHECK - 0.01);
    }
  }
  if (sees) { h.lastSeen = { x: player.x, y: player.y }; if (h.state === "chase") { h.target = { x: player.x, y: player.y }; h.sus = 1; } }
  if (h.state === "patrol" || h.state === "return" || h.state === "search" || h.state === "check") {
    var np = trailDog(h) ? dogSniff(h, 1.0) : sniff(h, smellsOld(h) ? 1.0 : 0.6);
    if (np) {
      stats.acq++; stats.trans++;
      h.state = "follow"; h.followIdx = np.i; shake = Math.max(shake, 4);
      h.pursuit = { kind: "prints", age: Math.round(simTime - np.t), sprint: !!np.big };
      if (dog) sfx("bark"); else sfx("suspicion", { level: 0.5 });
      if (!trackedMoment(h, np)) say(dog && simTime - np.t > 12 ? "dog" : "trail", C.gold);
    }
  }
  var m = h.sp * alarmSpeed();
  if (h.state === "check") {
    if (walkTo(h, h.target.x, h.target.y, (dog ? D_PATROL : H_PATROL) * 1.15 * m, dt)) { h.state = "search"; h.searchT = 2.0; }
  } else if (h.state === "watch") {
    if (walkTo(h, h.target.x, h.target.y, (dog ? D_PATROL : H_PATROL) * 1.2 * m, dt)) turn(h, h.watchDir || 0, dt);
  } else if (h.state === "patrol") {
    var w = h.patrol[h.wp];
    if (walkTo(h, (w[0] + 0.5) * T, (w[1] + 0.5) * T, (dog ? D_PATROL : H_PATROL) * m, dt)) h.wp = (h.wp + 1) % h.patrol.length;
  } else if (h.state === "return") {
    var rw = h.patrol[h.wp];
    if (walkTo(h, (rw[0] + 0.5) * T, (rw[1] + 0.5) * T, (dog ? D_PATROL : H_PATROL) * 1.2 * m, dt)) h.state = "patrol";
  } else if (h.state === "chase" && trailDog(h)) {
    dogChase(h, dt, D_CHASE * m);
  } else if (h.state === "chase") {
    if (!player.inShield && dist(h, player) < 8 * T) h.target = { x: player.x, y: player.y };
    if (walkTo(h, h.target.x, h.target.y, (dog ? D_CHASE : H_CHASE) * m, dt) && !sees) {
      var nb = sniff(h, 1.2);
      if (nb) { h.state = "follow"; h.followIdx = nb.i; } else loseTrail(h);
    }
  } else if (h.state === "rush") {
    if (walkTo(h, h.target.x, h.target.y, H_RUSH * m, dt)) {
      if (h.decoy) { h.decoy = false; loseTrail(h); }
      else { h.state = "follow"; if (h.droneSent) { h.droneSent = false; teach("flagged", { h: h }); } }
    }
  } else if (h.state === "follow") {
    if (trailDog(h)) dogFollow(h, dt, m); else followTrail(h, dt, m);
  } else if (h.state === "search") {
    h.searchT -= dt; h.dir += dt * 2.2;
    if (h.searchT <= 0) { h.state = "return"; h.path = []; h.pathKey = ""; h.ignoreBefore = prints.length; }
  }
  catchCheck(h);
}
function catchCheck(h) {
  if (!player.inShield && !ghost && dist(h, player) < CATCH * T && game.phase === "play") { if (!h.caughtHow) h.caughtHow = "caught"; caught(h); }
  else if ((trailDog(h) || h.type === "hunter") && !ghost && game.phase === "play") catchFriend(h);
}
var DOG_LAST = 1.5;
function trailDog(h) { return h.type === "dog" && window.BH_SAVE_KEY === "bitfoot-trail-v1"; }
function dogSniff(h, radius) {
  var np = sniff(h, radius);
  if (!np) return null;
  var q = BH.items.mod("sniffRadius", 1);
  for (var i = h.ignoreBefore || 0; i < np.i; i++) {
    var p = prints[i], r = radius * T * q * (p.big ? 1.8 : 1) * (p.red ? 1.4 : 1);
    if (p.seg === np.seg && Math.abs(p.x - h.x) < r && Math.abs(p.y - h.y) < r) return p;
  }
  return np;
}
function walkPrints(h, speedTiles, dt) {
  var budget = speedTiles * T * dt;
  while (budget > 0) {
    var p = prints[h.followIdx];
    if (!p) return "end";
    var dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy);
    if (d > 0.01) turn(h, Math.atan2(dy, dx), dt);
    if (d > budget) { h.x += dx / d * budget; h.y += dy / d * budget; h.step += budget; return "ok"; }
    h.x = p.x; h.y = p.y; h.step += d; budget -= d;
    if (tileAt(p.x, p.y) === "b" && player.inBush) teach("bushFound", { h: h });
    var nxt = prints[h.followIdx + 1];
    if (!nxt) return "end";
    if (nxt.seg !== p.seg) return "break";
    h.followIdx++;
  }
  return "ok";
}
function dogTrailEnd(h, how, speedTiles, dt) {
  if (how === "ok") return;
  var p = prints[h.followIdx], nxt = prints[h.followIdx + 1];
  if (how === "break" && bridges[p.seg]) { h.state = "rush"; h.decoy = false; h.droneSent = false; h.target = { x: nxt.x, y: nxt.y }; h.followIdx = nxt.i; h.path = []; h.pathKey = ""; bossRushesLink(h); return; }
  if (how === "end" && !player.inShield && dist(h, player) < DOG_LAST * T) { walkTo(h, player.x, player.y, speedTiles, dt); return; }
  loseTrail(h); teach("lostYou", { h: h });
}
function dogFollow(h, dt, m) {
  var p = prints[h.followIdx];
  if (!p) { loseTrail(h); return; }
  var fresh = Math.max(0, Math.min(1, 1 - (simTime - p.t) / 20)) * BH.items.mod("followFresh", 1), sp = (D_FOLLOW + D_FOLLOW_FRESH * fresh) * m;
  dogTrailEnd(h, walkPrints(h, sp, dt), sp, dt);
}
function dogChase(h, dt, sp) {
  var p = prints[h.followIdx];
  if (!p || h.followIdx < (h.ignoreBefore || 0) || dist(h, p) > 2 * T) {
    var np = dogSniff(h, D_SENSE);
    if (np) h.followIdx = np.i;
    else { if (!player.inShield && dist(h, player) < DOG_LAST * T) walkTo(h, player.x, player.y, sp, dt); else loseTrail(h); return; }
  }
  dogTrailEnd(h, walkPrints(h, sp, dt), sp, dt);
}
function catchFriend(h) {
  var st = BH.trailFeature && BH.trailFeature.api && BH.trailFeature.api.state, el = st && st.elders;
  if (!el || st.tour || st.tourPending || st.cine || st.demo) return;
  for (var i = 0; i < el.length; i++) {
    var e = el[i];
    if (isWater(tileAt(e.x, e.y)) || isWater(tileAt(e.x, e.y - T * 0.35)) || dist(h, e) >= CATCH * T) continue;
    h.caughtHow = h.type === "dog" ? "friend" : "friendHunter"; caught(h); return;
  }
}
function sniff(h, radius) {
  var q = BH.items.mod("sniffRadius", 1), old = smellsOld(h);
  for (var i = prints.length - 1; i >= h.ignoreBefore; i--) {
    var p = prints[i];
    if (!old && simTime - p.t > 25) break;
    var r = radius * T * q * (p.big ? 1.8 : 1) * (p.red ? 1.4 : 1);
    if (Math.abs(p.x - h.x) < r && Math.abs(p.y - h.y) < r) return p;
  }
  return null;
}
function loseTrail(h) { h.caughtHow = null; h.pursuit = null; h.seen = null; h.state = "search"; h.searchT = 2.4; h.ignoreBefore = prints.length; }
function followTrail(h, dt, m) {
  var p = prints[h.followIdx];
  if (!p) { loseTrail(h); return; }
  var dog = h.type === "dog", age = simTime - p.t;
  var fresh = Math.max(0, Math.min(1, 1 - age / (dog ? 20 : 10))) * BH.items.mod("followFresh", 1);
  var sp = ((dog ? D_FOLLOW : H_FOLLOW) + (dog ? D_FOLLOW_FRESH : H_FOLLOW_FRESH) * fresh) * m * T;
  var dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy);
  if (d > 2) {
    turn(h, Math.atan2(dy, dx), dt); var mv = Math.min(d, sp * dt), nx = h.x + dx / d * mv, ny = h.y + dy / d * mv;
    if (isWater(tileAt(nx, ny)) && !isWater(tileAt(h.x, h.y))) { loseTrail(h); return; }
    h.x = nx; h.y = ny; h.step += mv;
  }
  if (d < 6) {
    var nxt = prints[h.followIdx + 1];
    if (tileAt(p.x, p.y) === "b" && player.inBush) teach("bushFound", { h: h });
    if (!nxt) {
      if (player.inShield) { loseTrail(h); teach("lostYou", { h: h }); }
      else { h.state = "chase"; h.target = { x: player.x, y: player.y }; h.ignoreBefore = prints.length; }
      return;
    }
    if (nxt.seg !== p.seg) {
      if (bridges[p.seg]) { h.state = "rush"; h.decoy = false; h.droneSent = false; h.target = { x: nxt.x, y: nxt.y }; h.followIdx = nxt.i; h.path = []; h.pathKey = ""; bossRushesLink(h); }
      else { loseTrail(h); teach("lostYou", { h: h }); }
      return;
    }
    h.followIdx++;
  }
}
function walkTo(h, tx, ty, speedTiles, dt) {
  var ttx = Math.floor(tx / T), tty = Math.floor(ty / T), key = ttx + "," + tty;
  h.pathT -= dt;
  if (h.pathKey !== key || h.pathT <= 0) { h.path = bfs(Math.floor(h.x / T), Math.floor(h.y / T), ttx, tty, solidH); h.pathKey = key; h.pathT = 0.4; }
  if (!h.path.length && solidH(tileAt(tx, ty))) return true;
  var goal = h.path.length ? h.path[0] : [tx, ty];
  var dx = goal[0] - h.x, dy = goal[1] - h.y, d = Math.hypot(dx, dy), sp = speedTiles * T * dt;
  if (d > 0.5) {
    turn(h, Math.atan2(dy, dx), dt); var mv = Math.min(d, sp), nx = h.x + dx / d * mv, ny = h.y + dy / d * mv;
    if (isWater(tileAt(nx, ny)) && !isWater(tileAt(h.x, h.y))) return true;
    h.x = nx; h.y = ny; h.step += mv;
  }
  if (d < 3 && h.path.length) h.path.shift();
  return !h.path.length && Math.hypot(tx - h.x, ty - h.y) < 4;
}
function turn(h, target, dt) { h.dir += angDiff(target, h.dir) * Math.min(1, dt * 8); }
function towerSees(t) {
  if (player.inShield || player.inBush || ghost) return false;
  var d = dist(t, player);
  if (d > TOWER_RANGE * T) return false;
  if (Math.abs(angDiff(Math.atan2(player.y - t.y, player.x - t.x), t.a)) > TOWER_HALF) return false;
  return losClear(t.x, t.y, player.x, player.y);
}
function stepTower(t, dt) {
  t.a += TOWER_SPIN * dt; t.cool -= dt; t.hot -= dt;
  if (towerSees(t) && t.cool <= 0) {
    t.cool = 2.5; t.hot = 1.2; shake = Math.max(shake, 9); sfx("tower"); player.combo = 1; game.towerCall = true;
    hunters.forEach(function (h) { if (dist(h, player) < 16 * T) { h.towerCalled = true; h.state = "chase"; h.decoy = false; h.target = { x: player.x, y: player.y }; h.path = []; h.pathKey = "";
      h.pursuit = { kind: "tower", link: h.pursuit && h.pursuit.kind === "link" ? h.pursuit : (h.pursuit && h.pursuit.link) || null }; } });
    say("tower", C.red);
  }
}

function drawDrone() {
  if (!drone) return;
  var x = drone.x, y = drone.y - 20, blink = Math.sin(simTime * 10) > 0;
  ctx.strokeStyle = "rgba(220,70,50,0.35)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(drone.x, drone.y, 1.6 * T, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x - 8, drone.y - 2, 16, 3);
  ctx.fillStyle = "#2c2c29"; ctx.fillRect(x - 6, y - 3, 12, 6);
  ctx.fillStyle = "#3a3a36"; ctx.fillRect(x - 12, y - 5, 6, 2); ctx.fillRect(x + 6, y - 5, 6, 2); ctx.fillRect(x - 12, y + 3, 6, 2); ctx.fillRect(x + 6, y + 3, 6, 2);
  ctx.fillStyle = blink ? C.red : "#5a1a12"; ctx.fillRect(x - 1, y - 1, 2, 2);
}
function stateMark(h, x, y) {
  var mark = h.state === "chase" || (h.state === "rush" && !h.decoy) ? "!" : (h.state === "follow" || h.state === "search" || h.state === "check" || h.state === "watch" || h.decoy) ? "?" : "";
  if (mark !== "!" && h.sus > 0.01) { drawSusMeter(h, x, y); return; }
  if (!mark) return;
  ctx.fillStyle = mark === "!" ? C.red : C.gold; ctx.font = "600 16px 'Plex Cond', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText(mark, x, y + Math.sin(simTime * 10) * 1.5);
}
function drawSusMeter(h, x, y) {
  var s = Math.max(0, Math.min(1, h.sus)), size = 26, top = y - size + 5, bob = Math.sin(simTime * 10) * 1.5 * s;
  ctx.font = "600 " + size + "px 'Plex Cond', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(27,27,27,0.9)"; ctx.strokeText("?", x, y + bob);
  ctx.fillStyle = "rgba(255,250,240,0.55)"; ctx.fillText("?", x, y + bob);
  ctx.save(); ctx.beginPath(); ctx.rect(x - size, top + (1 - s) * size, size * 2, s * size + 6); ctx.clip();
  ctx.fillStyle = s > 0.66 ? C.red : s > 0.33 ? "#f0a060" : C.gold; ctx.fillText("?", x, y + bob);
  ctx.restore();
}
function drawHunter(h) {
  var boss = BH.bosses.get(h.type);
  if (boss && boss.draw) { boss.draw(h); return; }
  drawHunterBody(h, boss && boss.look);
}
function drawHunterBody(h, look) {
  var x = Math.round(h.x), y = Math.round(h.y), bob = Math.sin(h.step / 5) > 0 ? 1 : 0;
  ctx.save(); if (look && look.scale) { ctx.translate(x, y); ctx.scale(look.scale, look.scale); ctx.translate(-x, -y); }
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x - 7, y + 8, 14, 3);
  ctx.fillStyle = look && look.coat ? look.coat : "#4a3426"; ctx.fillRect(x - 6, y - 4 + bob, 12, 12);
  ctx.fillStyle = "#2a1e16"; ctx.fillRect(x - 6, y + 6 + bob, 4, 3); ctx.fillRect(x + 2, y + 6 + bob, 4, 3);
  ctx.fillStyle = "#d9b38c"; ctx.fillRect(x - 4, y - 10 + bob, 8, 6);
  if (look && look.band) { ctx.fillStyle = look.band; ctx.fillRect(x - 6, y - 5 + bob, 12, 2); }
  ctx.fillStyle = "#1b1b1b"; ctx.fillRect(x - 7, y - 12 + bob, 14, 2); ctx.fillRect(x - 4, y - 16 + bob, 8, 4);
  var lx = x + Math.cos(h.dir) * 10, ly = y + Math.sin(h.dir) * 10;
  ctx.fillStyle = C.gold; ctx.fillRect(Math.round(lx) - 2, Math.round(ly) - 2, 4, 5);
  ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(234,186,73,0.25)"; ctx.beginPath(); ctx.arc(lx, ly, 7, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
  ctx.restore();
  stateMark(h, x, y - (look && look.markLift ? look.markLift : 20));
}
function drawDog(h) {
  var x = Math.round(h.x), y = Math.round(h.y), f = Math.cos(h.dir) >= 0 ? 1 : -1, leg = Math.sin(h.step / 3) > 0 ? 1 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x - 8, y + 6, 16, 3);
  ctx.fillStyle = "#6b5a48"; ctx.fillRect(x - 7, y - 3, 14, 7);
  ctx.fillStyle = "#4e4134"; ctx.fillRect(x - 6, y + 4, 2, 3 + leg); ctx.fillRect(x + 4, y + 4, 2, 4 - leg);
  ctx.fillStyle = "#6b5a48"; ctx.fillRect(x + f * 6 - 3, y - 7, 7, 6);
  ctx.fillStyle = "#1b1b1b"; ctx.fillRect(x + f * 9 - (f > 0 ? 0 : 1), y - 5, 2, 2);
  ctx.fillStyle = "#4e4134"; ctx.fillRect(x + f * 5 - 1, y - 9, 2, 3);
  ctx.fillStyle = "#6b5a48"; ctx.fillRect(x - f * 9 - 1, y - 5 + leg, 2, 4);
  stateMark(h, x, y - 14);
}
var walkSeen = [];
function walkGuard(x, y, anim, look) {
  if (anim !== "walk" || (x === 0 && y === 0)) return anim;
  var now = performance.now(), k = look ? look.char || look.fur || "you" : "plain", best = null, bd = T * 0.75;
  walkSeen = walkSeen.filter(function (r) { return now - r.at < 1000; });
  walkSeen.forEach(function (r) { var d = Math.hypot(r.x - x, r.y - y); if (r.k === k && r.at < now - 4 && d < bd) { bd = d; best = r; } });
  if (!best) { walkSeen.push({ k: k, x: x, y: y, since: now, at: now }); return anim; }
  best.at = now;
  if (bd > 0.25) { best.x = x; best.y = y; best.since = now; return anim; }
  return now - best.since > 150 ? "idle" : anim;
}
// Character art has no back/front pose: up and down keep the last side faced.
function sideDir(a) {
  if (a.dir === "left" || a.dir === "right") a.face = a.dir;
  return a.dir === "up" || a.dir === "down" ? a.face || "right" : a.dir;
}
function drawBitfoot(x, feetY, dir, anim, t, alpha, look) {
  anim = walkGuard(x, feetY, anim, look);
  var S = window.BitfootSprite;
  if (S && S.draw) {
    var sc = (T * 1.45) / (S.H || 32), o = { dir: dir, state: anim, t: t, scale: sc, alpha: alpha };
    var cid = look && BH.characters ? look.char || (BH.characters.main && BH.characters.main(look)) : null;
    if (cid) { var CHR = BH.characters; try { if (CHR.draw(ctx, x, feetY, o, cid)) return feetY - CHR.height(cid) * sc; } catch (e) {} }
    if (look && BH.cosmetics && BH.cosmetics.draw) { o.hat = look.hat; try { BH.cosmetics.draw(ctx, x, feetY, o, look.fur); } catch (e) {} return feetY - (S.H || 32) * sc; }
    try { S.draw(ctx, x, feetY, o); } catch (e) {}
    return feetY - (S.H || 32) * sc;
  }
  if (fallbackSprite.complete && fallbackSprite.naturalWidth) {
    var sz = T * 1.25, b = anim === "walk" ? Math.abs(Math.sin(t * 9)) : 0, spin = anim === "spin" ? Math.cos(t / spinDuration() * Math.PI * 4) : 1;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, feetY - 4 - b * 5); ctx.scale(Math.max(0.08, Math.abs(spin)), 1);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(fallbackSprite, -sz / 2, -sz, sz, sz); ctx.restore();
    return feetY - 4 - sz;
  }
  return feetY - T;
}
function drawNpc(n) {
  var py = n.y + 10;
  if (n.inWater) { var f = (simTime * 0.9 + n.id * 0.3) % 1; ctx.strokeStyle = "rgba(190,235,255," + (0.35 * (1 - f)).toFixed(3) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(n.x, py, 8 + f * 16, 3 + f * 6, 0, 0, 6.283); ctx.stroke(); }
  else { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(n.x, py, 10, 3.5, 0, 0, 6.283); ctx.fill(); }
  var top = drawBitfoot(n.x, py, sideDir(n), n.anim, simTime - n.animT0, n.inWater ? 0.9 : 1);
  var lit = n.litAt != null ? simTime - n.litAt : 99;
  if (liveFrame && lit < 1.2 && !n.inWater && !npcTagSpots.some(function (s) { return Math.abs(s.x - n.x) < 56 && Math.abs(s.y - top) < 20; })) {
    npcTagSpots.push({ x: n.x, y: top });
    var tag = (F.gp && F.gp.noTrail) || "NO TRAIL";
    ctx.globalAlpha = Math.min(1, (1.2 - lit) / 0.4);
    ctx.font = "600 9px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = ctx.measureText(tag).width + 8;
    ctx.fillStyle = "rgba(12,20,40,0.85)"; ctx.fillRect(n.x - w / 2, top - 12, w, 12); ctx.fillStyle = C.ice; ctx.fillText(tag, n.x, top - 6);
    ctx.globalAlpha = 1;
  }
}
function drawPlayer() {
  var px = player.x, py = player.y + 10, t = simTime - player.animT0;
  if (player.inShield) {
    for (var i = 0; i < 2; i++) { var f = (simTime * 0.9 + i * 0.5) % 1; ctx.strokeStyle = "rgba(190,235,255," + (0.5 * (1 - f)).toFixed(3) + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(px, py, 10 + f * 22, 4 + f * 9, 0, 0, 6.283); ctx.stroke(); }
  } else { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(px, py, 11, 4, 0, 0, 6.283); ctx.fill(); }
  if (npcs.length) { ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(px, py, 12, 4.5, 0, 0, 6.283); ctx.stroke(); }
  var ch = BH.characters && BH.characters.worn(save);
  var topY = drawBitfoot(px, py, sideDir(player), player.anim, t, player.inShield ? 0.92 : 1, ch ? { char: ch, fur: "fur-classic", hat: "hat-none" } : save.cos || {});
  player.topY = topY;
  var labelY = topY - 9;
  if (L.amounts && !player.inShield && game.phase === "play") {
    var label = player.carry + " ZEC";
    ctx.font = "600 11px 'Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = ctx.measureText(label).width + 8, ly = labelY;
    if ((ly - 8 - view.y0) * zoom < 112 && (px - view.x0) * zoom < 230) ly = py + 14;
    ctx.fillStyle = "rgba(27,27,27,0.85)"; ctx.fillRect(px - w / 2, ly - 7, w, 13);
    ctx.fillStyle = C.gold; ctx.fillText(label, px, ly);
    if (ly === labelY) labelY -= 16;
  } else if (npcs.length) {
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(px - 4, labelY - 3); ctx.lineTo(px + 4, labelY - 3); ctx.lineTo(px, labelY + 2); ctx.fill(); labelY -= 10;
  }
  player.labelY = labelY;
  if (L.sprint && player.stamina < STAMINA - 0.01) {
    var bw = 22, fr = player.stamina / STAMINA;
    ctx.fillStyle = "rgba(27,27,27,0.8)"; ctx.fillRect(px - bw / 2 - 1, py + 6, bw + 2, 4);
    ctx.fillStyle = player.winded ? C.red : C.gold; ctx.fillRect(px - bw / 2, py + 7, bw * fr, 2);
  }
}
