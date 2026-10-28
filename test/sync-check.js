"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), os = require("os");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
function check(name, ok, info) { if (ok) pass++; else fail++; console.log((ok ? "PASS " : "FAIL ") + name + (info !== undefined ? "  " + JSON.stringify(info) : "")); }

const PAGE = `
const KEY = "bitfoot-trail-v1";
const lv = (f) => { const o = {}; for (let i = 1; i <= 14; i++) o[i] = f(i); return o; };
const fresh = { trailV: save.trailV, stars: Object.keys(save.stars).length };
async function load(seed) {
  localStorage.setItem(KEY, JSON.stringify(seed));
  save = migrateSave(JSON.parse(localStorage.getItem(KEY)));
  await new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "/engine/account-sync.js?run=" + Math.random(); sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  const s = JSON.parse(JSON.stringify(save));
  const stored = JSON.parse(localStorage.getItem(KEY) || "null");
  return { s, stored, n: LEVELS.length, fresh };
}
const want = TRAIL_V2_ORDER.map((tid) => trailIndexOf((TRAIL_MERGED || {})[tid] || tid) + 1);
const tids = LEVELS.map((l) => l.tid), merged = TRAIL_MERGED || {};
const old = { v: 3, gAt: 0, stars: lv(() => 3), best: lv((i) => 20 + i), bestZec: lv(() => 5), medals: lv(() => ({ home: true })),
  wallet: 37, chars: { "char-002": true }, cos: { owned: { "fur-bark": true }, fur: "fur-bark", hat: "hat-headband" }, char: "char-002", inv: { decoy: 2 } };
const a = await load(old);
const b = await load(Object.assign(JSON.parse(JSON.stringify(old)), { trailV: 4, stars: { 1: 3, 2: 2, 14: 1 } }));
const c = await load(Object.assign(JSON.parse(JSON.stringify(old)), { trailV: 2, gAt: 11, stars: { 1: 3, 10: 2, 11: 1 }, best: { 10: 31, 11: 32 }, bestZec: { 10: 4 }, medals: { 11: { home: true } } }));
const d = await load(c.s);
return { a, b, c, d, want, v2: TRAIL_V2_ORDER, tids, merged };
`;

const tmp = path.join(os.tmpdir(), "trail-sync-page-" + process.pid + ".js");
fs.writeFileSync(tmp, PAGE);
const run = spawnSync(process.execPath, [path.join(ROOT, "test", "drive.js"), "/index.html", tmp], { cwd: ROOT, encoding: "utf8", timeout: 570000 });
fs.rmSync(tmp, { force: true });
let out = null; try { out = JSON.parse(run.stdout.slice(run.stdout.indexOf("{"))); } catch (e) {  }
if (!out || !out.result || !out.result.a) { console.log("FAIL part A could not run (INVALID, not a pass)", String(run.error || "") + (run.stdout || "") + (run.stderr || "")); process.exit(1); }
const { a, b, c, d, want, v2, tids, merged } = out.result, keys = (m) => Object.keys(m || {}).map(Number);
const targets = [...new Set(want)];
const owner = (n) => { const i = want.findIndex((x, j) => x === n && !merged[v2[j]]); return (i >= 0 ? i : want.indexOf(n)) + 1; };
const same = (x, y) => JSON.stringify([...x].sort((p, q) => p - q)) === JSON.stringify([...y].sort((p, q) => p - q));
console.log("page errors:", out.errors.length, "LEVELS.length:", a.n);
check("page: 0 console errors", out.errors.length === 0, out.errors.slice(0, 3));
check("setup: 15 levels, and each of the 11 old numbers lands on its tid (or the level it was merged into)",
  a.n === 15 && v2.length === 11 && want.every((n, i) => n >= 1 && n <= a.n && tids[n - 1] === (merged[v2[i]] || v2[i])) && tids[want[5] - 1] === "inriver" && tids[want[7] - 1] === "doors", { n: a.n, want });
const kept = (m, v) => same(keys(m), targets) && targets.every((n) => JSON.stringify(m[n]) === JSON.stringify(v(owner(n))));
check("old save: stars, best, bestZec, medals of its 11 levels kept with their values, each on its tid's new number (a level's own beats a merged one)",
  kept(a.s.stars, () => 3) && kept(a.s.best, (i) => 20 + i) && kept(a.s.bestZec, () => 5) && kept(a.s.medals, () => ({ home: true })), { best: a.s.best, want });
check("old save: no key above LEVELS.length in any level map", ["stars", "best", "bestZec", "medals"].every((k) => keys(a.s[k]).every((x) => x <= a.n)), keys(a.s.stars));
check("old save: wallet 37 kept", a.s.wallet === 37, a.s.wallet);
check("old save: characters kept (chars, worn char)", a.s.chars["char-002"] === true && a.s.char === "char-002", { chars: a.s.chars, char: a.s.char });
check("old save: cosmetics kept (bought fur, worn look, inventory)", a.s.cos.owned["fur-bark"] === true && a.s.cos.fur === "fur-bark" && a.s.inv.decoy === 2, a.s.cos);
check("old save: the free hat earned on old level 10 stays owned", a.s.cos.owned["hat-headband"] === true, a.s.cos.owned);
check("old save: marked trailV 4 and written to localStorage", a.s.trailV === 4 && a.stored && a.stored.trailV === 4 && same(keys(a.stored.stars), targets) && a.stored.best[want[10]] === 31, a.stored && { trailV: a.stored.trailV, stars: a.stored.stars });
check("first real page load: a brand-new player's save is marked trailV 4", a.fresh.trailV === 4 && a.fresh.stars === 0, a.fresh);
check("control: a save already at trailV 4 is not migrated again (its stars untouched, still trailV 4)", b.s.stars[1] === 3 && b.s.stars[2] === 2 && b.s.stars[14] === 1 && b.s.wallet === 37
  && b.s.trailV === 4 && b.stored && b.stored.trailV === 4, { stars: b.s.stars, trailV: b.s.trailV });
check("trailV 2 save: each level's records move to its tid's new number (10 -> " + want[9] + ", 11 -> " + want[10] + "), trailV 4, stored",
  want[9] === 9 && want[10] === 10 && c.s.trailV === 4 && c.s.stars[1] === 3 && c.s.stars[want[9]] === 2 && c.s.stars[want[10]] === 1 && same(keys(c.s.stars), [1, want[9], want[10]])
  && c.s.best[want[9]] === 31 && c.s.best[want[10]] === 32 && c.s.bestZec[want[9]] === 4 && c.s.medals[want[10]] && c.s.medals[want[10]].home === true
  && c.stored && c.stored.trailV === 4 && c.stored.stars[want[9]] === 2, { stars: c.s.stars, best: c.s.best, trailV: c.s.trailV });
check("trailV 2 save, loaded again after its move: not moved a second time", JSON.stringify(d.s.stars) === JSON.stringify(c.s.stars) && JSON.stringify(d.s.best) === JSON.stringify(c.s.best) && d.s.trailV === 4, d.s.stars);

const src = fs.readFileSync(path.join(ROOT, "site", "engine", "account-sync.js"), "utf8");
const levelsSrc = fs.readFileSync(path.join(ROOT, "site", "levels", "levels.js"), "utf8");
function device(serverSave, localSave) {
  const store = new Map(), timers = [];
  const ctx = {
    TRAIL: true, BH_SAVE_KEY: "bitfoot-trail-v1", BH: {},
    save: localSave || { trailV: 4, stars: { 1: 3 }, bestZec: { 1: 5 }, wallet: 5, cos: { owned: {} } },
    persist() { store.set("bitfoot-trail-v1", JSON.stringify(ctx.save)); },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    crypto: { getRandomValues: (x) => require("crypto").randomFillSync(x) }, btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    Uint8Array, setTimeout: (f, ms) => { const t = setTimeout(f, Math.min(ms, 50)); timers.push(t); return t; }, clearTimeout,
    location: { pathname: "/" }, document: { addEventListener() {}, dispatchEvent() {} }, CustomEvent: function () {},
    fetch: async (url, o) => ({ status: 200, json: async () => (url === "/api/me" ? { enabled: true, user: { name: "p" } } : { gen: "g", rev: 1, save: JSON.parse(JSON.stringify(serverSave)) }) }),
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(levelsSrc, ctx, { filename: "levels.js" });
  vm.runInContext(src, ctx);
  return { ctx, stop() { timers.forEach(clearTimeout); } };
}
(async () => {
  const N = 15;
  const srv = { trailV: 4, stars: { 1: 3, 15: 1, 20: 1, 22: 2 }, best: { 21: 9 }, bestZec: { 1: 5, 20: 4 }, medals: { 25: { home: true } }, wallet: 5, cos: { owned: {} } };
  const d = device(srv);
  await new Promise((r) => setTimeout(r, 1500));
  d.stop();
  const s = d.ctx.save, big = ["stars", "best", "bestZec", "medals"].flatMap((k) => keys(s[k]).filter((x) => x > N));
  check("adopt: keys above LEVELS.length dropped from the server copy", d.ctx.LEVELS.length === N && big.length === 0 && s.stars[1] === 3 && s.stars[15] === 1, { stars: s.stars, bestZec: s.bestZec, n: d.ctx.LEVELS.length });
  check("adopt control: the server copy really held keys 20-25", keys(srv.stars).some((x) => x > N));

  const M = d.ctx.TRAIL_REMAP.maps[2], to10 = M[10], to11 = M[11];
  const srvOld = { trailV: 2, stars: { 1: 3, 10: 2, 11: 1, 12: 1, 14: 2 }, best: { 11: 40, 13: 9 }, bestZec: { 1: 5, 10: 4 }, medals: { 10: { home: true } }, wallet: 5, cos: { owned: {} } };
  const dOld = device(srvOld);
  await new Promise((r) => setTimeout(r, 1500));
  dOld.stop();
  const so = dOld.ctx.save, storedO = JSON.parse(dOld.ctx.localStorage.getItem("bitfoot-trail-v1") || "null") || {};
  check("adopt: an old-version server copy is moved once to the new numbers (10 -> " + to10 + ", 11 -> " + to11 + "), trailV 4, persisted",
    to10 === 9 && to11 === 10 && so.trailV === 4 && so.stars[1] === 3 && so.stars[to10] === 2 && so.stars[to11] === 1 && same(keys(so.stars), [1, to10, to11])
    && so.best[to11] === 40 && keys(so.best).length === 1 && so.bestZec[to10] === 4 && so.medals[to10] && so.medals[to10].home === true
    && storedO.trailV === 4 && storedO.stars && storedO.stars[to10] === 2, { stars: so.stars, best: so.best, trailV: so.trailV });
  check("adopt control: the old server copy really used the old numbers (trailV 2, keys 10-11 set)", srvOld.trailV === 2 && srvOld.stars[10] === 2 && srvOld.stars[11] === 1);

  const srvC = { stars: { 1: 3 }, bestZec: { 1: 5 }, wallet: 5, cos: { owned: { "hat-cap": true }, fur: "fur-bark" } };
  const dc = device(srvC, { trailV: 2, stars: { 1: 3 }, bestZec: { 1: 5 }, wallet: 5, cos: { owned: { "hat-headband": true, "fur-bark": true }, fur: "fur-gray" } });
  await new Promise((r) => setTimeout(r, 1500));
  dc.stop();
  const c = dc.ctx.save, stored = JSON.parse(dc.ctx.localStorage.getItem("bitfoot-trail-v1") || "null") || {};
  check("adopt: local owned cosmetics kept next to the server's (union), and persisted",
    c.cos.owned["hat-headband"] === true && c.cos.owned["fur-bark"] === true && c.cos.owned["hat-cap"] === true && stored.cos && stored.cos.owned["hat-headband"] === true, c.cos);
  check("adopt control: the server copy really was adopted (its worn fur won)", c.cos.fur === "fur-bark" && !srvC.cos.owned["hat-headband"], c.cos);
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
