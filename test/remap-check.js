"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const SITE = path.join(ROOT, "site");
const checks = [];
const check = (name, ok, val) => { checks.push(!!ok); console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  got: " + JSON.stringify(val))); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const V2 = ["steps", "machine", "wise", "bank", "inriver", "stayin", "anybox", "piles", "glasskey", "campfire", "together"];
const V3 = ["steps", "machine", "wise", "bank", "inriver", "stayin", "anybox", "piles", "glasskey",
  "doors", "letter", "mail", "campfire", "dam", "together", "bonus1", "bonus2", "bonus3", "bonus4"];
const V4 = ["steps", "machine", "wise", "bank", "inriver", "doors", "glasskey", "mail", "campfire", "together",
  "dam", "bonus1", "bonus2", "bonus3", "bonus4"];
const V5 = V4.filter((t) => t !== "mail");
const V6 = V5.filter((t) => t !== "bonus1");
const NOW = V6.filter((t) => t !== "bonus4"), TV = 7;
const MERGED = { stayin: "inriver", anybox: "inriver", piles: "doors", letter: "mail" };
const home = (tid) => MERGED[tid] || tid;
const ownerOf = (order) => {
  const o = {}; order.forEach((t, i) => { if (!MERGED[t]) o[t] = i + 1; }); order.forEach((t, i) => { if (MERGED[t] && o[MERGED[t]] === undefined) o[MERGED[t]] = i + 1; });
  Object.keys(o).forEach((t) => { if (NOW.indexOf(t) < 0) delete o[t]; }); return o;
};

function boot(saveIn, store, failSaveWrite) {
  const ls = Object.assign({}, store || {});
  const win = { TRAIL: true, BH_TRAIL_SYNC_OFF: true, BH: {} };
  win.window = win;
  win.localStorage = { getItem: (k) => (k in ls ? ls[k] : null), removeItem: (k) => { delete ls[k]; },
    setItem: (k, v) => { if (failSaveWrite && k === "bitfoot-trail-v1") throw new Error("quota"); ls[k] = String(v); } };
  const ctx = vm.createContext(win);
  vm.runInContext("var save = null; function persist() { localStorage.setItem(BH_SAVE_KEY, JSON.stringify(save)); }", ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, "levels", "levels.js"), "utf8"), ctx, { filename: "levels.js" });
  const core = fs.readFileSync(path.join(SITE, "engine", "core.js"), "utf8");
  const from = core.indexOf("var SAVE_VERSION"), to = core.indexOf("var save = freshSave();");
  vm.runInContext(core.slice(from, to), ctx, { filename: "core.js" });
  vm.runInContext("save = migrateSave(" + JSON.stringify(saveIn) + ");", ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, "engine", "account-sync.js"), "utf8"), ctx, { filename: "account-sync.js" });
  const s = JSON.parse(vm.runInContext("JSON.stringify(save)", ctx));
  const tids = JSON.parse(vm.runInContext("JSON.stringify(LEVELS.map(function (l) { return l.tid; }))", ctx));
  return { s, tids, ls, gen: vm.runInContext("genesisAt()", ctx) };
}

const old = { v: 3, trailV: 2, gAt: 11, stars: {}, best: {}, bestZec: {}, medals: {}, badges: { sweep: {} }, last: {}, trail: { clues: {}, wallets: 1 },
  wallet: 37, cos: { owned: { "fur-bark": true } }, chars: { "char-001": true }, up: { viewingKey: true }, inv: { pouch: 2 } };
V2.forEach((tid, i) => {
  const n = i + 1;
  old.stars[n] = (n % 3) + 1; old.best[n] = 30 + n; old.bestZec[n] = n; old.medals[n] = { home: true, par: n % 2 === 0 };
  old.badges.sweep[n] = true; old.last[n] = { escaped: { r: { tid }, t: n } }; old.trail.clues[n] = ["clue " + tid];
});
const trailsKey = "bitfoot-trail-v1-trails";
const oldTrails = { _order: V2.map((t, i) => String(i + 1)) }; V2.forEach((t, i) => { oldTrails[i + 1] = { tid: t }; });
const huntKeys = { "bitfoot-hunt-v3": JSON.stringify({ v: 3, stars: { 1: 3, 10: 2, 11: 1 } }), "bitfoot-hunt-v3-trails": JSON.stringify({ 10: { x: 1 } }) };

const a = boot(clone(old), Object.assign({ [trailsKey]: JSON.stringify(oldTrails) }, huntKeys));
const at = (tid) => a.tids.indexOf(tid) + 1;
const trailsNew = JSON.parse(a.ls[trailsKey] || "{}");
const own2 = ownerOf(V2);
const keptRecords = (s, trails, src, order, owners) => Object.keys(owners).every((tid) => {
  const o = owners[tid], n = at(tid), was = order[o - 1];
  return n > 0 && s.stars[n] === src.stars[o] && s.best[n] === src.best[o] && s.bestZec[n] === src.bestZec[o]
    && JSON.stringify(s.medals[n]) === JSON.stringify(src.medals[o]) && s.badges.sweep[n] === true
    && s.last[n] && s.last[n].escaped.r.tid === was && s.trail.clues[n] && s.trail.clues[n][0] === "clue " + was
    && (!trails || trails[n] && trails[n].tid === was);
});
check("(1) setup: the play order is the 12 levels, no mail, bonus1 or bonus4, bonus act opens on THE NEW RIVER", a.tids.join() === NOW.join() && a.tids.length === 12 && ["mail", "bonus1", "bonus4"].every((t) => a.tids.indexOf(t) < 0), a.tids);
check("(1) old 11-level save: each kept tid keeps its own stars, best, bestZec, medals, sweep, last, clues, stored trail; MANY DOORS gets the piles level's",
  keptRecords(a.s, trailsNew, old, V2, own2) && own2.doors === V2.indexOf("piles") + 1 && own2.inriver === V2.indexOf("inriver") + 1,
  { stars: a.s.stars, last: Object.keys(a.s.last || {}) });
check("(1) no record lands on a level the old save never had (dam, bonus2, bonus3)", ["dam", "bonus2", "bonus3"].every((t) => {
  const n = at(t); return n > 0 && a.s.stars[n] === undefined && a.s.best[n] === undefined && !(a.s.last || {})[n];
}) && Object.keys(a.s.stars).every((k) => +k >= 1 && +k <= NOW.length), a.s.stars);
check("(1) gAt = ALL TOGETHER's new number (9), trailV 7, wallet / cosmetics / items untouched",
  a.s.gAt === at("together") && at("together") === 9 && a.gen === at("together") && a.s.trailV === TV && a.s.wallet === 37 && a.s.cos.owned["fur-bark"] && a.s.up.viewingKey && a.s.inv.pouch === 2,
  { gAt: a.s.gAt, trailV: a.s.trailV });
const order2 = []; V2.map((t) => String(at(home(t)))).forEach((k) => { const j = order2.indexOf(k); if (j >= 0) order2.splice(j, 1); order2.push(k); });
check("(1) the stored end-card order follows the new numbers (a merged level once, at its latest place)", Array.isArray(trailsNew._order) && trailsNew._order.join() === order2.join(), { got: trailsNew._order, want: order2 });

const b = boot(clone(a.s), a.ls);
check("(2) the remap runs once: a second boot changes nothing", JSON.stringify(b.s) === JSON.stringify(a.s) && b.ls[trailsKey] === a.ls[trailsKey], { diff: JSON.stringify(b.s) !== JSON.stringify(a.s) });

const freshIn = { v: 3, stars: {}, best: {}, wallet: 0, up: {}, inv: {}, loadout: [], cos: { owned: {} }, badges: {}, medals: {}, bestZec: {}, char: "", chars: {}, gAt: a.gen };
const f = boot(clone(freshIn), {});
const fNoMark = clone(f.s); delete fNoMark.trailV;
check("(3) a fresh save is untouched (only marked trailV 7)", JSON.stringify(fNoMark) === JSON.stringify(freshIn) && f.s.trailV === TV, f.s);
const newPlay = clone(freshIn); newPlay.stars[at("doors")] = 2; newPlay.stars[at("together")] = 3;
const np = boot(newPlay, {});
check("(3) a new-order save with no trailV yet (made by this version) is not remapped", np.s.stars[at("doors")] === 2 && np.s.stars[at("together")] === 3 && Object.keys(np.s.stars).length === 2, np.s.stars);

const trailsOk = (ls) => { const t = JSON.parse(ls[trailsKey] || "{}"); return Object.keys(own2).every((tid) => t[at(tid)] && t[at(tid)].tid === V2[own2[tid] - 1]); };
const c1 = boot(clone(old), { [trailsKey]: JSON.stringify(oldTrails) }, true);
const c2 = boot(JSON.parse(JSON.stringify(old)), c1.ls);
check("(6) the save write fails after the trails move: the next boot does not move the trails twice", trailsOk(c2.ls), JSON.parse(c2.ls[trailsKey] || "{}")._order);
const noV = clone(old); delete noV.trailV; noV.gAt = 14;
const nv = boot(noV, { [trailsKey]: JSON.stringify(oldTrails) });
check("(7) a save from before trailV: its stored end-card trails move with its stars", trailsOk(nv.ls) && nv.s.stars[at("together")] === old.stars[11], JSON.parse(nv.ls[trailsKey] || "{}")._order);

const old3 = { v: 3, trailV: 3, gAt: 15, stars: {}, best: {}, bestZec: {}, medals: {}, badges: { sweep: {} }, last: {}, trail: { clues: {}, wallets: 1 },
  wallet: 51, cos: { owned: {} }, chars: {}, up: {}, inv: {} };
V3.forEach((tid, i) => {
  const n = i + 1;
  old3.stars[n] = (n % 3) + 1; old3.best[n] = 60 + n; old3.bestZec[n] = 100 + n; old3.medals[n] = { home: true, par: n % 2 === 1 };
  old3.badges.sweep[n] = true; old3.last[n] = { escaped: { r: { tid }, t: n } }; old3.trail.clues[n] = ["clue " + tid];
});
const oldTrails3 = { _v: 3, _order: V3.map((t, i) => String(i + 1)) }; V3.forEach((t, i) => { oldTrails3[i + 1] = { tid: t }; });
const e = boot(clone(old3), { [trailsKey]: JSON.stringify(oldTrails3) });
const trails3 = JSON.parse(e.ls[trailsKey] || "{}"), own3 = ownerOf(V3);
check("(8) old 19-level save: all 12 levels hold their own tid's records (stored trail too), trailV 7, gAt 9",
  Object.keys(own3).length === NOW.length && keptRecords(e.s, trails3, old3, V3, own3) && e.s.trailV === TV && e.s.gAt === 9 && trails3._v === TV
    && Object.keys(e.s.stars).length === NOW.length && e.s.wallet === 51, { stars: e.s.stars, trailV: e.s.trailV });
check("(8) campfire: old index 12 lands on index 7 (best, bestZec, last, clue)", V3[12] === "campfire" && at("campfire") - 1 === 7
  && e.s.best[8] === old3.best[13] && e.s.bestZec[8] === old3.bestZec[13] && e.s.last[8].escaped.r.tid === "campfire", { best8: e.s.best[8], last8: e.s.last[8] });
const onStay = { v: 3, trailV: 3, gAt: 15, stars: { 1: 3, 2: 3, 3: 2, 4: 1, 6: 2 }, best: { 6: 44 }, bestZec: { 6: 7 }, medals: { 6: { home: true } }, last: { 6: { escaped: { r: { tid: "stayin" } } } },
  badges: {}, wallet: 9, cos: { owned: {} }, chars: {}, up: {}, inv: {} };
const g = boot(clone(onStay), {});
check("(8) stayin: an old save's stayin record lands on inriver (index 4); no key left on 6 (now MANY DOORS)",
  g.tids[4] === "inriver" && g.s.stars[5] === 2 && g.s.best[5] === 44 && g.s.bestZec[5] === 7 && g.s.medals[5].home === true && g.s.last[5].escaped.r.tid === "stayin"
    && g.s.stars[6] === undefined && g.s.best[6] === undefined, { stars: g.s.stars, best: g.s.best, last: g.s.last });
const both = clone(onStay); both.stars[5] = 1; both.best[5] = 41; both.best[7] = 39; both.stars[8] = 3; both.best[8] = 38; both.best[10] = 70;
const h = boot(both, {});
check("(8) a merged level never overwrites the level's own record (inriver keeps 41, doors keeps its own 70 over piles' 38)",
  h.s.stars[5] === 1 && h.s.best[5] === 41 && h.s.best[6] === 70 && h.s.stars[6] === 3, { stars: h.s.stars, best: h.s.best });
const upTo = clone(old3); for (let n = 14; n <= 19; n++) { delete upTo.stars[n]; delete upTo.best[n]; }
const u = boot(upTo, {}), unlocked = (() => { let n = 1; while (u.s.stars[n] != null && n < NOW.length) n++; return n; })();
check("(8) cleared through THE CAMPFIRE (old 13): new levels 1-8 all cleared, ALL TOGETHER (9) is the next one, no removed level reachable",
  unlocked === 9 && u.tids[unlocked - 1] === "together" && u.tids.every((t) => !MERGED[t] && t !== "mail"), { unlocked, stars: u.s.stars });

const old4 = { v: 3, trailV: 4, gAt: 10, stars: {}, best: {}, bestZec: {}, medals: {}, badges: { sweep: {} }, last: {}, trail: { clues: {}, wallets: 1 },
  wallet: 64, cos: { owned: { "fur-bark": true } }, chars: { "char-012": true }, up: {}, inv: {} };
V4.forEach((tid, i) => {
  const n = i + 1;
  old4.stars[n] = (n % 3) + 1; old4.best[n] = 200 + n; old4.bestZec[n] = 300 + n; old4.medals[n] = { home: true, par: n % 2 === 0 };
  old4.badges.sweep[n] = true; old4.last[n] = { escaped: { r: { tid }, t: n } }; old4.trail.clues[n] = ["clue " + tid];
});
const oldTrails4 = { _v: 4, _order: ["3", "8", "9", "10"] }; V4.forEach((t, i) => { oldTrails4[i + 1] = { tid: t }; });
const w = boot(clone(old4), { [trailsKey]: JSON.stringify(oldTrails4) });
const trails4 = JSON.parse(w.ls[trailsKey] || "{}"), own4 = ownerOf(V4);
const mailN = V4.indexOf("mail") + 1, vals = (m) => Object.keys(m || {}).map((k) => m[k]);
const goneFrom = (s, trails, src, order, tid) => {
  const n = order.indexOf(tid) + 1;
  return vals(s.best).indexOf(src.best[n]) < 0 && vals(s.bestZec).indexOf(src.bestZec[n]) < 0
    && !vals(s.last).some((x) => x.escaped.r.tid === tid) && !vals(s.trail.clues).some((x) => x[0] === "clue " + tid)
    && !Object.keys(trails).some((k) => trails[k] && trails[k].tid === tid);
};
check("(9) old 15-level save: all 12 levels hold their own tid's records (stored trail too), trailV 7, gAt 9, wallet and found BitFoot kept",
  Object.keys(own4).length === NOW.length && keptRecords(w.s, trails4, old4, V4, own4) && w.s.trailV === TV && w.s.gAt === 9 && trails4._v === TV
    && Object.keys(w.s.stars).length === NOW.length && w.s.wallet === 64 && w.s.chars["char-012"] === true, { stars: w.s.stars, trailV: w.s.trailV });
check("(9) mail's and bonus1's records are gone (best, bestZec, last, clue, stored trail), nothing past 12",
  goneFrom(w.s, trails4, old4, V4, "mail") && goneFrom(w.s, trails4, old4, V4, "bonus1") && goneFrom(w.s, trails4, old4, V4, "bonus4") && w.s.stars[NOW.length + 1] === undefined && w.s.best[NOW.length + 1] === undefined,
  { best: w.s.best });
check("(9) the stored end-card order follows: wise 3, campfire 8, together 9 (mail dropped)", Array.isArray(trails4._order) && trails4._order.join() === "3,8,9", trails4._order);
const w2 = boot(clone(w.s), w.ls);
check("(9) control: a trailV 7 save boots again unchanged", JSON.stringify(w2.s) === JSON.stringify(w.s) && w2.ls[trailsKey] === w.ls[trailsKey], null);

const old5 = { v: 3, trailV: 5, gAt: 9, stars: {}, best: {}, bestZec: {}, medals: {}, badges: { sweep: {} }, last: {}, trail: { clues: {}, wallets: 1, gRed: 1 },
  wallet: 71, cos: { owned: { "fur-bark": true } }, chars: { "char-041": true }, up: {}, inv: {} };
V5.forEach((tid, i) => {
  const n = i + 1;
  old5.stars[n] = (n % 3) + 1; old5.best[n] = 400 + n; old5.bestZec[n] = 500 + n; old5.medals[n] = { home: true, par: n % 2 === 1 };
  old5.badges.sweep[n] = true; old5.last[n] = { escaped: { r: { tid }, t: n } }; old5.trail.clues[n] = ["clue " + tid];
});
const oldTrails5 = { _v: 5, _order: ["9", "11", "12", "14"] }; V5.forEach((t, i) => { oldTrails5[i + 1] = { tid: t }; });
const x5 = boot(clone(old5), { [trailsKey]: JSON.stringify(oldTrails5) });
const trails5 = JSON.parse(x5.ls[trailsKey] || "{}"), own5 = ownerOf(V5);
check("(10) old 14-level save: all 12 levels hold their own tid's records (stored trail too), trailV 7, gAt 9, wallet, found BitFoot and red lines kept",
  Object.keys(own5).length === NOW.length && keptRecords(x5.s, trails5, old5, V5, own5) && x5.s.trailV === TV && x5.s.gAt === 9 && trails5._v === TV
    && Object.keys(x5.s.stars).length === NOW.length && x5.s.wallet === 71 && x5.s.chars["char-041"] === true && x5.s.trail.gRed === 1, { stars: x5.s.stars, trailV: x5.s.trailV });
check("(10) bonus1's and bonus4's records are gone, THE EXCHANGE moves 12 -> 11, nothing on 13 or 14",
  goneFrom(x5.s, trails5, old5, V5, "bonus1") && goneFrom(x5.s, trails5, old5, V5, "bonus4") && x5.s.best[11] === old5.best[12]
    && x5.s.stars[13] === undefined && x5.s.stars[14] === undefined,
  { best: x5.s.best });
check("(10) the stored end-card order follows: together 9, exchange 11 (bonus1 and bonus4 dropped)", Array.isArray(trails5._order) && trails5._order.join() === "9,11", trails5._order);
const x6 = boot(clone(x5.s), x5.ls);
check("(10) control: the moved save boots again unchanged", JSON.stringify(x6.s) === JSON.stringify(x5.s) && x6.ls[trailsKey] === x5.ls[trailsKey], null);

const old6 = { v: 3, trailV: 6, gAt: 9, stars: {}, best: {}, bestZec: {}, medals: {}, badges: { sweep: {} }, last: {}, trail: { clues: {}, wallets: 1 },
  wallet: 88, cos: { owned: {} }, chars: {}, up: {}, inv: {} };
V6.forEach((tid, i) => {
  const n = i + 1;
  old6.stars[n] = (n % 3) + 1; old6.best[n] = 700 + n; old6.bestZec[n] = 800 + n; old6.medals[n] = { home: true, par: n % 2 === 1 };
  old6.badges.sweep[n] = true; old6.last[n] = { escaped: { r: { tid }, t: n } }; old6.trail.clues[n] = ["clue " + tid];
});
const oldTrails6 = { _v: 6, _order: ["9", "11", "13"] }; V6.forEach((t, i) => { oldTrails6[i + 1] = { tid: t }; });
const y6 = boot(clone(old6), { [trailsKey]: JSON.stringify(oldTrails6) });
const trails6 = JSON.parse(y6.ls[trailsKey] || "{}"), own6 = ownerOf(V6);
check("(11) old 13-level save (trailV 6, with UNDONE PAYMENTS cleared): it loads, all 12 levels keep their records, trailV 7, wallet kept",
  V6.length === 13 && Object.keys(own6).length === NOW.length && keptRecords(y6.s, trails6, old6, V6, own6) && y6.s.trailV === TV && trails6._v === TV
    && Object.keys(y6.s.stars).length === NOW.length && y6.s.wallet === 88, { stars: y6.s.stars, trailV: y6.s.trailV });
check("(11) bonus4's records are gone, nothing on 13, end-card order 9, 11",
  goneFrom(y6.s, trails6, old6, V6, "bonus4") && y6.s.stars[13] === undefined && y6.s.best[13] === undefined && trails6._order.join() === "9,11", { best: y6.s.best, order: trails6._order });
const y7 = boot(clone(y6.s), y6.ls);
check("(11) control: the moved save boots again unchanged", JSON.stringify(y7.s) === JSON.stringify(y6.s) && y7.ls[trailsKey] === y6.ls[trailsKey], null);

let SV = null, cat = null;
try { SV = require(path.join(ROOT, "server", "api", "save.js")); cat = SV.loadCatalog(SITE); } catch (e) { console.log("server load: " + e.message); }
if (SV && cat) try {
  const S = { v: 3, gAt: 11, stars: clone(old.stars), best: clone(old.best), bestZec: clone(old.bestZec), medals: clone(old.medals), badges: { sweep: clone(old.badges.sweep) },
    story: {}, chars: {}, up: {}, pu: {}, cos: { owned: {} }, char: "", wallet: 37, inv: {}, mapPanned: 0, itemsRefund: 0, gearRefund: 0, itemsRefundShown: false, gearRefundShown: false,
    trail: clone(old.trail) };
  const mine = clone(a.s); delete mine.last; mine.stars[at("doors")] = 1;
  const C = SV.normalize(mine, cat);
  const m = SV.merge(S, C, { wallet: 37, inv: {} }, cat);
  const ok = Object.keys(own2).every((tid) => { const o = own2[tid]; return m.best[at(tid)] === old.best[o] && m.bestZec[at(tid)] === old.bestZec[o]; });
  const stale = Object.keys(m.stars).filter((k) => !Object.keys(own2).some((t) => at(t) === +k));
  check("(4) an old-version server copy merged into a migrated save: every tid keeps its own records, no stale key on another level, trailV 7",
    cat.levels === NOW.length && cat.trailV === TV && ok && stale.length === 0 && m.trailV === TV && m.trail.clues[at("together")][0] === "clue together",
    { levels: cat.levels, stars: m.stars, stale, trailV: m.trailV });
  const oldPush = SV.normalize({ v: 3, stars: { 10: 2, 11: 3 }, bestZec: { 10: 4 }, wallet: 0, cos: { owned: {} } }, cat);
  check("(4) an old-version (11-level) push is renumbered too (campfire 10 -> 9, together 11 -> 10)", oldPush.stars[at("campfire")] === 2 && oldPush.stars[at("together")] === 3
    && Object.keys(oldPush.stars).join() === [at("campfire"), at("together")].sort((p, q) => p - q).join() && oldPush.trailV === TV, oldPush.stars);
  const v3Push = SV.normalize({ v: 3, trailV: 3, stars: { 13: 2, 6: 1, 15: 3 }, wallet: 0, cos: { owned: {} } }, cat);
  check("(4) a 19-level (trailV 3) push: campfire 13 -> 8, stayin 6 -> inriver 5, together 15 -> 9",
    v3Push.stars[8] === 2 && v3Push.stars[5] === 1 && v3Push.stars[9] === 3 && Object.keys(v3Push.stars).length === 3 && v3Push.trailV === TV, v3Push.stars);
  const v4In = clone(old4); delete v4In.last; v4In.medals = {}; v4In.chars = {};
  const v4Push = SV.normalize(v4In, cat);
  check("(4) a 15-level (trailV 4) push: every kept tid's best moves to its new number, mail's goes, nothing past 12, trailV 7",
    Object.keys(own4).every((tid) => v4Push.best[at(tid)] === old4.best[own4[tid]] && v4Push.bestZec[at(tid)] === old4.bestZec[own4[tid]])
      && vals(v4Push.best).indexOf(old4.best[mailN]) < 0 && Object.keys(v4Push.stars).every((k) => +k >= 1 && +k <= NOW.length) && v4Push.trailV === TV,
    { best: v4Push.best, trailV: v4Push.trailV });
  const v5In = clone(old5); delete v5In.last; v5In.medals = {}; v5In.chars = {};
  const v5Push = SV.normalize(v5In, cat), b1N = V5.indexOf("bonus1") + 1;
  check("(4) a 14-level (trailV 5) push: every kept tid's best moves to its new number, bonus1's goes, nothing past 12, trailV 7",
    Object.keys(own5).every((tid) => v5Push.best[at(tid)] === old5.best[own5[tid]] && v5Push.bestZec[at(tid)] === old5.bestZec[own5[tid]])
      && vals(v5Push.best).indexOf(old5.best[b1N]) < 0 && Object.keys(v5Push.stars).every((k) => +k >= 1 && +k <= NOW.length) && v5Push.trailV === TV,
    { best: v5Push.best, trailV: v5Push.trailV });
  const v6In = clone(old6); delete v6In.last; v6In.medals = {}; v6In.chars = {};
  const v6Push = SV.normalize(v6In, cat), b4N = V6.indexOf("bonus4") + 1;
  check("(4) a 13-level (trailV 6) push: every kept tid's best stays on its number, bonus4's goes, nothing past 12, trailV 7",
    Object.keys(own6).every((tid) => v6Push.best[at(tid)] === old6.best[own6[tid]] && v6Push.bestZec[at(tid)] === old6.bestZec[own6[tid]])
      && vals(v6Push.best).indexOf(old6.best[b4N]) < 0 && Object.keys(v6Push.stars).every((k) => +k >= 1 && +k <= NOW.length) && v6Push.trailV === TV,
    { best: v6Push.best, trailV: v6Push.trailV });
  const fresh6 = SV.merge(null, SV.normalize({ v: 3, trailV: TV, stars: { 8: 2, 12: 1 }, wallet: 0, cos: { owned: {} } }, cat), null, cat);
  check("(4) a first push from a new save keeps its numbers (campfire stays on 8, the finale on 12)", fresh6.stars[8] === 2 && fresh6.stars[12] === 1 && Object.keys(fresh6.stars).length === 2 && fresh6.trailV === TV, fresh6.stars);
  const again = SV.merge(m, SV.normalize(clone(m), cat), null, cat);
  check("(4) merging a v6 copy with itself moves nothing", JSON.stringify(again.stars) === JSON.stringify(m.stars), again.stars);
} catch (e) { check("(4) server merge ran", false, e.message); }
else check("(4) server save.js loads", false, null);

{
  const win = { TRAIL: true, BH: {} }; win.window = win;
  win.document = { currentScript: null, createElement() { throw new Error("no DOM"); } };
  const ctx = vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(SITE, "levels", "facts.js"), "utf8").replace(/^/, "var window = this.window;\n"), ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, "levels", "levels.js"), "utf8"), ctx);
  for (const f of ["characters/cosmetics.js", "characters/characters.js"]) vm.runInContext(fs.readFileSync(path.join(SITE, f), "utf8"), ctx, { filename: f });
  const L = win.LEVELS, F = win.FACTS, copyAt = (n) => (F.levels && F.levels[n]) || (L[n - 1] && L[n - 1].copy) || null;
  const byTid = F.levelsByTid || {}, tidAt = (n) => L[n - 1] && L[n - 1].tid;
  const want = (n) => byTid[tidAt(n)] || L[n - 1].copy;
  check("(copy) every position reads its own tid's copy; campfire (8) and together (9) keep their text after the move",
    L.every((l, i) => copyAt(i + 1) && copyAt(i + 1) === want(i + 1)) && /approve every leak/.test(copyAt(9).lesson) && /Keep your words/.test(copyAt(8).goal)
      && tidAt(6) === "doors" && tidAt(7) === "glasskey" && tidAt(8) === "campfire" && tidAt(9) === "together" && tidAt(10) === "dam" && tidAt(11) === "bonus2" && tidAt(12) === "bonus3" && L.length === NOW.length,
    L.map((l, i) => tidAt(i + 1) + ": " + (copyAt(i + 1) || {}).goal));
  check("(copy) no cut level's copy shows on a level (stayin, anybox, piles text gone from the play order)",
    ["stayin", "anybox", "piles"].every((t) => !byTid[t] || L.every((l, i) => copyAt(i + 1) !== byTid[t])), null);
  const ord = path.join(SITE, "levels", "order.js");
  if (fs.existsSync(ord)) {
    ["bank", "river"].forEach((f) => L.forEach((l) => { if (l.features.indexOf(f) < 0) l.features = l.features.concat([f]); }));
    win.TRAIL_EXTRA_LEVELS.doors = { title: "MANY DOORS", act: 2, features: ["trail", "bank"], copy: { goal: "real doors", lesson: "x", dev: "y" }, map: ["#"] };
    L.forEach((l) => { if (l.tid !== "doors" && l.features.indexOf("trail") < 0) l.features = l.features.concat(["trail"]); });
    const before = L.length, at = L.findIndex((l) => l.tid === "doors");
    vm.runInContext(fs.readFileSync(ord, "utf8"), ctx);
    const d = L[at], dup = d.features.filter((f, k, a) => a.indexOf(f) !== k);
    check("(swap) the real level takes the stub's place, keeps the features attached to the stub, none twice, and its own copy",
      L.length === before && d === win.TRAIL_EXTRA_LEVELS.doors && !d.stub && d.tid === "doors" && dup.length === 0 && ["trail", "bank", "river"].every((f) => d.features.includes(f))
        && copyAt(at + 1).goal === "real doors" && L[at + 1].tid === "glasskey" && L[at + 2].tid === "campfire",
      { at, features: d.features, goal: (copyAt(at + 1) || {}).goal });
    const K = win.BH.characters, CO = win.BH.cosmetics, byArt = (a) => K.list.filter((c) => c.id === "char-" + a)[0];
    const wantClear = (n) => { if (!(n >= 1 && n <= V4.length)) return n; for (let i = n - 1; i < V4.length; i++) if (L.findIndex((l) => l.tid === V4[i]) >= 0) return L.findIndex((l) => l.tid === V4[i]) + 1; return L.length; };
    const huntClear = { "001": 3, "004": 5, "046": 10, "026": 15, "094": 14, "008": 2, "009": 5, "010": 8, "011": 11, "013": 13 };
    const badChar = Object.keys(huntClear).filter((a) => !byArt(a) || byArt(a).rule.clear !== wantClear(huntClear[a]));
    const badCos = CO.list.filter((it) => it.rule && typeof it.rule.clear === "number" && it.rule.clear !== wantClear(it.rule.clearWas)).map((it) => it.id);
    check("(unlock) every numbered unlock follows its level: together 10 -> 9, finale 15 -> 12, mail's 8 -> campfire 8, 3 and 5 unchanged, #094 at the last level",
      badChar.length === 0 && badCos.length === 0 && byArt("046").rule.clear === 9 && byArt("026").rule.clear === 12 && byArt("010").rule.clear === 8
        && byArt("001").rule.clear === 3 && byArt("004").rule.clear === 5 && byArt("094").rule.clear === 12 && CO.list.some((it) => it.rule && it.rule.clearWas === 15 && it.rule.clear === 12),
      { badChar, badCos });
    const f12 = byArt("012").rule.found, cf = L[f12.level - 1];
    check("(unlock) the hidden BitFoot #012 now sits on THE CAMPFIRE, on an open tile no secret uses",
      cf && cf.tid === "campfire" && cf.map[f12.y][f12.x] === "." && !(cf.funsecret && cf.funsecret.at[0] === f12.x && cf.funsecret.at[1] === f12.y)
        && byArt("012").rule.text === "Hidden in Act " + (cf.act + 1), f12);
  } else check("(swap) site/levels/order.js exists", false, null);
}

check("(5) Hunt save keys (non-trail) are byte-identical before/after", Object.keys(huntKeys).every((k) => a.ls[k] === huntKeys[k]), Object.keys(huntKeys).map((k) => a.ls[k]));

const fails = checks.filter((x) => !x).length;
console.log(fails ? "RESULT: " + fails + " FAIL of " + checks.length : "RESULT: ALL PASS (" + checks.length + ")");
process.exit(fails ? 1 : 0);
