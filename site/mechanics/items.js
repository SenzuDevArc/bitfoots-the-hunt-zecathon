"use strict";

BH.items = (function () {
  var reg = {}, order = [];
  var MAX_SLOTS = 3;
  function zOn() { return !!api.zcashShelf; }
  function settle() {
    retireGear();
    if (zOn() || typeof save === "undefined" || !save) return 0;
    var back = 0, held = save.inv && typeof save.inv === "object" ? save.inv : {};
    Object.keys(held).forEach(function (id) {
      var d = reg[id], n = Math.floor(+held[id] || 0);
      if (!isCarried(d) || n <= 0) return;
      back += n * d.cost; delete held[id];
    });
    var hadPack = Array.isArray(save.loadout) && save.loadout.length > 0;
    if (!back && !hadPack) return 0;
    save.loadout = [];
    if (back) {
      save.wallet = (+save.wallet || 0) + back;
      save.itemsRefund = (+save.itemsRefund || 0) + back;
    }
    persist();
    return back;
  }
  var GEAR_PAID = { longStride: 30, extraDecoys: 25, quietFeet: 40 };
  function retireGear() {
    if (typeof save === "undefined" || !save || !save.up || typeof save.up !== "object") return 0;
    var back = 0, had = false;
    Object.keys(GEAR_PAID).forEach(function (id) {
      if (!Object.prototype.hasOwnProperty.call(save.up, id)) return;
      had = true;
      if (save.up[id]) back += GEAR_PAID[id];
      delete save.up[id];
    });
    if (!had) return 0;
    if (back) {
      save.wallet = (+save.wallet || 0) + back;
      save.gearRefund = (+save.gearRefund || 0) + back;
    }
    persist();
    return back;
  }
  var run = null;

  function isCarried(d) { return !!(d && d.shelf === "zcash"); }
  function owned(id) { return !!(save && save.up && save.up[id]); }
  var coreInv = typeof invCount === "function" && typeof invAdd === "function" && typeof invConsume === "function";
  function inv() { if (!save.inv || typeof save.inv !== "object") save.inv = {}; return save.inv; }
  function count(id) { if (coreInv) { inv(); return +invCount(id); } return +(inv()[id] || 0); }
  function add(id, n) { if (coreInv) { inv(); return invAdd(id, n); } inv()[id] = count(id) + (n == null ? 1 : n); persist(); return inv()[id]; }
  function consume(id) { if (coreInv) { inv(); return invConsume(id); } var c = count(id); if (c <= 0) return false; inv()[id] = c - 1; persist(); return true; }
  function fee(n) { return n > 0 ? 1 + Math.max(0, n - 2) : 0; }
  function rawLoadout() { if (!Array.isArray(save.loadout)) save.loadout = []; return save.loadout; }
  function loadout() {
    settle();
    if (!zOn()) return [];
    var seen = {};
    return rawLoadout().filter(function (id) {
      if (seen[id] || !isCarried(reg[id]) || count(id) <= 0) return false;
      seen[id] = true; return true;
    }).slice(0, MAX_SLOTS);
  }
  function setLoadout(ids) {
    if (!zOn()) return { ok: false, reason: "the Zcash items shelf is closed", loadout: [], fee: 0 };
    ids = (ids || []).filter(function (id, i, a) { return a.indexOf(id) === i; });
    var bad = ids.filter(function (id) { return !isCarried(reg[id]); });
    if (bad.length) return { ok: false, reason: "not a carried item: " + bad.join(", "), loadout: loadout(), fee: fee(loadout().length) };
    var none = ids.filter(function (id) { return count(id) <= 0; });
    if (none.length) return { ok: false, reason: "you hold none: " + none.join(", "), loadout: loadout(), fee: fee(loadout().length) };
    if (ids.length > MAX_SLOTS) return { ok: false, reason: "max " + MAX_SLOTS + " items", loadout: loadout(), fee: fee(loadout().length) };
    save.loadout = ids; persist();
    return { ok: true, loadout: ids.slice(), fee: fee(ids.length) };
  }
  function toggleLoadout(id) {
    var cur = loadout(), i = cur.indexOf(id);
    if (i >= 0) { cur.splice(i, 1); return setLoadout(cur); }
    return setLoadout(cur.concat([id]));
  }
  function active(id) { return !!(run && run.carried.indexOf(id) >= 0); }
  function spent(id) { return !!(run && run.spent[id]); }
  function live(id) { var d = reg[id]; return isCarried(d) ? active(id) : owned(id); }

  function beginAttempt(levelIdx, retry) {
    var same = run && run.level === levelIdx && !run.done;
    if (retry === true ? !!run && run.level === levelIdx : retry === false ? false : same) {
      run.attempt++;
      run.carried = run.paidFor.filter(function (id) { return count(id) > 0; });
    } else {
      var want = loadout(), f = fee(want.length), wallet = save.wallet || 0;
      run = { level: levelIdx, attempt: 1, paidFor: [], carried: [], paid: 0, fee: f, stayedHome: [], done: false };
      if (want.length && wallet >= f) {
        save.wallet = wallet - f; persist();
        run.paid = f; run.paidFor = want.slice(); run.carried = want.slice();
      } else if (want.length) run.stayedHome = want.slice();
    }
    run.spent = {}; run.state = {};
    run.carried.forEach(function (id) { run.state[id] = {}; });
  }
  function nowT() { return typeof simTime === "number" ? simTime : 0; }

  var api = {
    MAX_SLOTS: MAX_SLOTS,
    register: function (id, def) { if (!reg[id]) order.push(id); def = def || {}; def.id = id; reg[id] = def; return def; },
    get: function (id) { return reg[id] || null; },
    list: function (filter) { return order.map(function (id) { return reg[id]; }).filter(function (d) { return !filter || Object.keys(filter).every(function (k) { return d[k] === filter[k]; }); }); },
    owned: owned, fee: fee,
    loadout: loadout, setLoadout: setLoadout, toggleLoadout: toggleLoadout,
    run: function () { return run ? { level: run.level, attempt: run.attempt, carried: run.carried.slice(), spent: Object.assign({}, run.spent), paid: run.paid, fee: run.fee, stayedHome: run.stayedHome.slice(), done: run.done } : null; },
    state: function (id) { return run && run.state[id] || null; },
    endRun: function () {
      if (run) run.done = true;
      if (BH.track && typeof game !== "undefined" && (game.screen === "play" || game.screen === "pause") && game.phase !== "caught" && game.phase !== "escaped") BH.track("level_quit", { level: game.levelIdx + 1 });
    },
    spent: spent, active: active,
    status: function (id) {
      if (!active(id)) return "home";
      var s = run.state[id] || {};
      if (s.until && nowT() < s.until) return "active";
      return spent(id) ? "spent" : "ready";
    },
    spend: function (id) {
      if (!active(id) || spent(id) || !consume(id)) return false;
      run.spent[id] = nowT();
      return true;
    },
    use: function (id) {
      var d = reg[id];
      if (!d || !isCarried(d) || !active(id) || typeof game === "undefined" || game.phase !== "play") return false;
      if (spent(id)) { itemTell("spent", "", C.string); return false; }
      return d.use ? !!d.use.call(d, run.state[id]) : false;
    },
    disclose: function (opts) { var d = reg.viewingKey; return !!(d && active("viewingKey") && d.disclose(run.state.viewingKey, opts || {})); },
    mod: function (name, base) {
      var v = base;
      for (var i = 0; i < order.length; i++) { var d = reg[order[i]]; if (d.mods && d.mods[name] && live(order[i])) v = d.mods[name](v); }
      return v;
    },
    hook: function (name) {
      var args = Array.prototype.slice.call(arguments, 1);
      if (name === "onLevelStart") beginAttempt(args[0], args[1]);
      if (name === "onEscape" && run) run.done = true;
      if (name === "onUse" && run && typeof args[0] === "string") {
        var k = args[0].toLowerCase();
        run.carried.forEach(function (id) { if (reg[id].key === k) api.use(id); });
      }
      var i, id, d;
      if (name !== "onLevelStart") for (i = 0; i < order.length; i++) { id = order[i]; d = reg[id]; if (isCarried(d) && d.tick && live(id)) d.tick(run.state[id], name, args); }
      for (i = 0; i < order.length; i++) {
        id = order[i]; d = reg[id];
        if (!live(id) || !d.hooks || !d.hooks[name]) continue;
        d.hooks[name].apply(d, (isCarried(d) ? [run.state[id]] : []).concat(args));
      }
    }
  };
  api.card = function (id) {
    var d = reg[id]; if (!d) return null;
    settle();
    var wallet = (typeof save !== "undefined" && save.wallet) || 0, carried = isCarried(d);
    return {
      id: id, shelf: d.shelf, name: d.name, price: d.cost, text: d.text,
      zcash: d.zcash || "", caveat: d.caveat || "", source: d.source || "", sources: d.sources || [],
      key: d.key || null, trigger: d.trigger || "", usesPerLevel: carried ? 1 : null, where: d.where || "",
      held: carried ? count(id) : null,
      owned: carried ? null : owned(id),
      canBuy: carried && zOn() && wallet >= d.cost,
      inLoadout: carried ? loadout().indexOf(id) >= 0 : null
    };
  };
  api.shelves = function () {
    var out = { zcash: [] };
    settle();
    order.forEach(function (id) { var d = reg[id]; if (out[d.shelf] && (d.shelf !== "zcash" || zOn())) out[d.shelf].push(api.card(id)); });
    return out;
  };
  api.buy = function (id) {
    var d = reg[id]; if (!d || !isCarried(d) || !zOn() || (save.wallet || 0) < d.cost) return false;
    save.wallet -= d.cost; add(id, 1);
    if (typeof Snd !== "undefined" && Snd.buy) Snd.buy();
    return true;
  };
  api.zcashShelf = false;
  api.settle = settle;
  api.retireGear = retireGear;
  if (!coreInv) { api.count = count; api.consume = consume; api.add = add; }
  retireGear();
  return api;
})();

function itemTell(key, main, color) {
  if (typeof say === "function") say(key, color, main ? { main: main } : null);
  else if (typeof popRaw === "function") popRaw(F.words[key] ? F.words[key].word : key, color);
}

var NULLIFIER = BH.items.NULLIFIER = {
  pop: "Spent. Like a Zcash nullifier: a spent note can't be spent twice.",
  again: "Already used this level. A spent note can't be spent twice.",
  zcash: "Every spent note publishes a nullifier, so it can never be spent twice.",
  source: "https://zips.z.cash/protocol/protocol.pdf"
};
BH.items.FEE = {
  text: "Carrying items costs 1 ZEC per level (up to 2 items).",
  extra: "Each item beyond 2 adds 1 ZEC.",
  zcash: "Zcash fees: a flat minimum covers 2 actions; each extra action costs more.",
  source: "https://zips.z.cash/zip-0317",
  stayedHome: "Not enough ZEC for the fee. Your items stayed home."
};

function carryItem(id, def) { def.shelf = "zcash"; def.shop = false; return BH.items.register(id, def); }

carryItem("changePouch", {
  name: "Change Pouch", word: "CHANGE", cost: 2, trigger: "auto", key: null,
  where: "levels where your ZEC shows above you",
  text: "Leave the water with a different number of ZEC.",
  zcash: "Spend part of a shielded note; the change returns as a new shielded note.",
  caveat: "Breaks amount matching only. Leaving alone still links you by timing.",
  source: "https://zips.z.cash/protocol/protocol.pdf",
  hooks: {
    onExitShield: function (st, entry) {
      if (!L.amounts || !entry || entry.carry <= 0 || player.carry !== entry.carry) return;
      if (BH.items.spent("changePouch") || !BH.items.spend("changePouch")) return;
      player.carry -= 1; player.stash += 1; st.changed = { from: entry.carry, to: player.carry, t: simTime };
      ring(player.x, player.y, "rgba(190,235,255,0.9)", T * 1.6, 0.6); puff(player.x, player.y, 10, "rgba(190,235,255,0.9)", 30);
      itemTell("change", "You left with " + player.carry + ", not " + entry.carry + ". 1 ZEC stayed shielded as change.", C.ice);
    }
  }
});

var CHARM_SECS = 20;
function charmPoll(st) {
  if (typeof player === "undefined" || !player) return;
  var got = player.carry - (st.lastCarry == null ? player.carry : st.lastCarry);
  if (got > 0) {
    var armed = st.until && simTime < st.until;
    if (!armed && !BH.items.spent("autoShield") && BH.items.spend("autoShield")) { st.until = simTime + CHARM_SECS; armed = true; }
    if (armed) {
      player.carry -= got; player.stash += got; st.moved = (st.moved || 0) + got;
      if (player.inShield && player.entry) player.entry.carry = player.carry;
      ring(player.x, player.y, "rgba(190,235,255,0.85)", T, 0.5);
      itemTell("autoShielded", "+" + got + " straight into the shield. Nothing showed in public.", C.ice);
      st.said = true;
    }
  }
  st.lastCarry = player.carry;
}
carryItem("autoShield", {
  name: "Auto-Shield Charm", word: "CHARM", cost: 3, trigger: "auto", key: null,
  where: "any level; best where your ZEC shows above you",
  text: "Coins you grab go straight into the shield.",
  zcash: "Shielded-by-default wallets receive into the shielded pool, not a public address.",
  caveat: "Lasts " + CHARM_SECS + " s from your first pickup.",
  sources: ["https://z.cash/wallets/", "https://zips.z.cash/zip-0316", "https://zips.z.cash/zip-0315"],
  source: "https://z.cash/wallets/",
  tick: function (st) { charmPoll(st); },
  hooks: {
    onLevelStart: function (st) { st.lastCarry = player.carry; },
    onEnterShield: function (st, entry) { charmPoll(st); if (entry) entry.carry = player.carry; }
  }
});

var MEMO_SECS = 8;
function memoShores() {
  var sx = Math.floor(player.x / T), sy = Math.floor(player.y / T), seen = {}, q = [[sx, sy]], out = [], head = 0;
  seen[sx + "," + sy] = true;
  while (head < q.length && head < 4000) {
    var c = q[head++];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      var nx = c[0] + d[0], ny = c[1] + d[1], k = nx + "," + ny, t = tile(nx, ny);
      if (t === "~") { if (!seen[k]) { seen[k] = true; q.push([nx, ny]); } }
      else if (t === "." || t === "b") out.push({ lx: nx, ly: ny, wx: c[0], wy: c[1] });
    });
  }
  return out;
}
function landPath(fx, fy, tx, ty) { return bfsCore(fx, fy, tx, ty, function (x, y) { var t = tile(x, y); return t === "#" || t === "T" || t === "~"; }); }
function pickShore() {
  var best = null, bestS = -1e9;
  memoShores().forEach(function (s) {
    var cx = (s.lx + 0.5) * T, cy = (s.ly + 0.5) * T, near = 1e9;
    hunters.forEach(function (h) { near = Math.min(near, Math.hypot(h.x - cx, h.y - cy) / T); });
    if (!hunters.length) near = 20;
    var walk = dens ? landPath(s.lx, s.ly, dens.tx, dens.ty) : { reached: true, path: [] };
    var score = Math.min(near, 14) - 0.35 * walk.path.length - (walk.reached ? 0 : 1000);
    if (score > bestS) { bestS = score; best = s; }
  });
  return best;
}
function shoreName(s) {
  var dx = s.lx - s.wx, dy = s.ly - s.wy;
  return dx > 0 ? "EAST" : dx < 0 ? "WEST" : dy > 0 ? "SOUTH" : "NORTH";
}
function memoSendWave(st) {
  if (!st.shore || st.waveSent || typeof wave === "undefined" || !wave || !npcs || !npcs.length) return;
  var s = st.shore, sh = null;
  if (typeof shores !== "undefined") shores.forEach(function (x) { if (x.lx === s.lx && x.ly === s.ly && x.wx === s.wx && x.wy === s.wy) sh = x; });
  sh = sh || s;
  if (wave.st === "gather") {
    wave.shore = sh; wave.memo = true; wave.t = Math.max(wave.t, 2);
    wave.members.forEach(function (n) { npcGoto(n, sh.wx, sh.wy, waterOnly); });
    st.waveSent = simTime; return;
  }
  if (wave.st !== "idle") return;
  var pool = npcs.filter(function (n) { return n.st === "swim" && bfsCore(Math.floor(n.x / T), Math.floor(n.y / T), sh.wx, sh.wy, function (x, y) { return tile(x, y) !== "~"; }).reached; });
  if (pool.length < 2) return;
  wave = { st: "gather", t: 3.2, shore: sh, members: pool.slice(0, Math.min(3, pool.length)), memo: true };
  wave.members.forEach(function (n) { n.st = "gather"; npcGoto(n, sh.wx, sh.wy, waterOnly); });
  st.waveSent = simTime;
}
carryItem("memoStone", {
  name: "Memo Stone", word: "MEMO", cost: 3, trigger: "key", key: "q",
  where: "in the water",
  text: "In the water, read a secret note: the safest shore.",
  zcash: "Shielded payments carry an encrypted memo; outsiders can't read it.",
  caveat: "Anyone you give your viewing key to can read your memos too.",
  sources: ["https://zcash.readthedocs.io/en/latest/rtd_pages/memos.html", "https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html"],
  source: "https://zcash.readthedocs.io/en/latest/rtd_pages/memos.html",
  use: function (st) {
    if (!player.inShield) { itemTell("memoDry", "", C.ice); return false; }
    var s = pickShore(); if (!s) return false;
    if (!BH.items.spend("memoStone")) return false;
    st.shore = s; st.name = shoreName(s); st.t = simTime; st.until = simTime + MEMO_SECS; st.route = [];
    var water = bfsCore(Math.floor(player.x / T), Math.floor(player.y / T), s.wx, s.wy, function (x, y) { return tile(x, y) !== "~"; }).path;
    var land = dens ? landPath(s.lx, s.ly, dens.tx, dens.ty).path : [];
    var pts = water.concat([[(s.lx + 0.5) * T, (s.ly + 0.5) * T]]).concat(land);
    pts.forEach(function (p, i) { if (i % 2 === 0) { ring(p[0], p[1], "rgba(190,235,255,0.9)", T * 0.25, MEMO_SECS); st.route.push(p); } });
    ring((s.lx + 0.5) * T, (s.ly + 0.5) * T, "rgba(234,186,73,0.9)", T * 1.2, MEMO_SECS);
    itemTell("memo", "“LEAVE BY THE " + st.name + " SHORE.” Hunters can't read it.", C.ice);
    memoSendWave(st);
    return true;
  },
  tick: function (st) { if (st.shore && !st.waveSent && simTime < st.until) memoSendWave(st); }
});

var RANGER_SECS = 25;
function rangerGateNear() {
  var tx = Math.floor(player.x / T), ty = Math.floor(player.y / T);
  for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (tile(tx + dx, ty + dy) === "R") return { tx: tx + dx, ty: ty + dy };
  return null;
}
function openTile(g) {
  if (typeof featureApi !== "undefined" && featureApi && featureApi.setTile) { featureApi.setTile(g.tx, g.ty, "."); return; }
  grid[g.ty][g.tx] = "."; if (typeof bakeLevel === "function") bakeLevel();
}
function bridgeAll() { for (var s = 0; s < player.seg; s++) bridges[s] = true; }
carryItem("viewingKey", {
  name: "Viewing Key", word: "VIEWING KEY", cost: 4, trigger: "key", key: "v",
  where: "next to a ranger gate",
  text: "Show a ranger your trail; he opens the gate.",
  zcash: "A viewing key shows your shielded history, read-only. It can't spend.",
  caveat: "Once shared it can't be taken back, and he can pass it on.",
  sources: ["https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html", "https://zkonomics.com/content/viewing-keys-explained/"],
  source: "https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html",
  use: function (st) {
    var g = rangerGateNear();
    if (!g) { itemTell("noRanger", "", C.ink); return false; }
    return this.disclose(st, { gate: g });
  },
  disclose: function (st, opts) {
    if (st.disclosed || !BH.items.spend("viewingKey")) return false;
    if (opts.gate) openTile(opts.gate);
    st.disclosed = simTime; st.tellAt = simTime + RANGER_SECS; st.told = null;
    bridgeAll();
    itemTell("viewingKey", "", C.gold);
    return true;
  },
  tick: function (st) {
    if (!st.disclosed || st.told || simTime < st.tellAt || !prints.length) return;
    var p = prints[prints.length - 1], best = null, bd = 1e9;
    hunters.forEach(function (h) { var d = Math.hypot(h.x - p.x, h.y - p.y); if (d < bd) { bd = d; best = h; } });
    st.told = { t: simTime, print: p.i, hunter: best ? hunters.indexOf(best) : -1 };
    if (best) { best.state = "rush"; best.decoy = false; best.target = { x: p.x, y: p.y }; best.followIdx = p.i; best.path = []; best.pathKey = ""; }
    itemTell("told", "", C.string);
  },
  hooks: {
    onExitShield: function (st) { if (st.disclosed) bridgeAll(); }
  }
});
