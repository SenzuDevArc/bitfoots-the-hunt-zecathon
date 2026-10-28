"use strict";
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const pgLocal = require("./pg-local.js");
const T = require("./api-lib.js");
const { ROOT, DIR, C, Pool, sleep, SECRETS, SESSION_KEY, freePort, startApi, waitUp, stop, browser, until, OWNER_DID } = T;

let allowDb = null;
const signIn = (b, did, next, stranger) => T.signIn(b, did, { next, allowDb: stranger ? null : allowDb });
const pid = T.pid;
function device(port, jar, src, saveObj) {
  const store = new Map(), timers = new Set(); let dead = false;
  const ctx = {
    TRAIL: true, BH_SAVE_KEY: "bitfoot-trail-v1", BH: {}, save: saveObj,
    persist() { store.set("bitfoot-trail-v1", JSON.stringify(ctx.save)); },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    crypto: { getRandomValues: (a) => crypto.randomFillSync(a) }, btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    AbortController, Uint8Array,
    setTimeout: (f, ms) => { if (dead) return 0; const t = setTimeout(() => { timers.delete(t); if (!dead) f(); }, ms); timers.add(t); return t; },
    clearTimeout: (t) => { clearTimeout(t); timers.delete(t); },
    location: { pathname: "/", href: "/" },
    document: { addEventListener() {}, dispatchEvent() {}, visibilityState: "visible" }, CustomEvent: function () {},
    fetch: async (url, o) => {
      const h = Object.assign({}, o.headers, { Origin: "http://127.0.0.1:" + port });
      const ck = [...jar.jar].map(([k, v]) => k + "=" + v).join("; "); if (ck) h.Cookie = ck;
      return fetch("http://127.0.0.1:" + port + url, { method: o.method, headers: h, body: o.body, signal: o.signal });
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "site", "levels", "levels.js"), "utf8"), ctx, { filename: "levels.js" });
  vm.runInContext(src, ctx, { filename: "account-sync.js" });
  return { ctx, save: () => ctx.save, meta: () => { try { return JSON.parse(store.get("bitfoot-trail-v1-sync")); } catch (e) { return null; } }, kill() { dead = true; for (const t of timers) clearTimeout(t); } };
}
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, key) => { o[key] = x[key]; return o; }, {}) : x));

async function suite(file, dbUrl, log) {
  const results = new Map();
  const check = (name, ok, detail) => {
    results.set(name, !!ok);
    if (log) console.log((ok ? "PASS " : "FAIL ") + name + (detail !== undefined && detail !== "" ? "  [" + (typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300) + "]" : ""));
  };
  const port = await freePort();
  const srv = startApi(file, port, dbUrl);
  if (!(await waitUp(srv))) { check("server starts", false, (srv.out + srv.err).slice(-300)); await stop(srv); return { results, srv }; }
  check("server starts", true, srv.out.split("\n")[0]);
  const db = new Pool({ connectionString: dbUrl, max: 2 });
  try {
    const anon = browser(port);
    check("health: 200 ok", (await anon.get("/health")).text === "ok");
    const me0 = await anon.get("/api/me");
    check("optional: signed-out /api/me is 200 with user null", me0.status === 200 && me0.json && me0.json.enabled === true && me0.json.user === null, me0.json);
    const g0 = await anon.get("/api/save"), p0 = await anon.put("/api/save", { save: {}, base: null, pid: pid() });
    check("logged out: /api/save GET and PUT are 401", g0.status === 401 && p0.status === 401, [g0.status, p0.status]);
    check("unknown route is 404, wrong method 405", (await anon.get("/api/nope")).status === 404 && (await anon.post("/api/me")).status === 405);

    const A = browser(port), DID = "300000000000000001";
    const s = await signIn(A, DID, "/map");
    const u = (() => { try { return new URL(s.loc); } catch (e) { return null; } })();
    check("sign-in: redirect to Discord, scope identify, callback from PUBLIC_URL", !!u && u.origin === "https://discord.com" && u.searchParams.get("scope") === "identify"
      && u.searchParams.get("redirect_uri") === "http://127.0.0.1:" + port + "/api/auth/discord/callback", s.loc.slice(0, 200));
    const sessC = s.cb.setCookie.find((c) => c.startsWith("bt_s=")) || "";
    check("sign-in: callback sets bt_s HttpOnly SameSite=Lax and returns to next", s.cb.status === 302 && s.cb.headers.location === "/map" && /HttpOnly/.test(sessC) && /SameSite=Lax/.test(sessC), [s.cb.status, s.cb.headers.location, sessC.slice(0, 40)]);
    const me1 = await A.get("/api/me");
    check("sign-in: /api/me names the player", me1.json && me1.json.user && me1.json.user.name === "Player 0001", me1.json);
    check("all Bitfoots: a player NOT on TRAIL_ALL_CHARS_DISCORD_IDS gets no allChars", me1.json && me1.json.user && !("allChars" in me1.json.user), me1.json);
    const Tester = browser(port);
    await signIn(Tester, "300000000000000077");
    const meT = await Tester.get("/api/me");
    check("all Bitfoots: a tester on TRAIL_ALL_CHARS_DISCORD_IDS gets user.allChars true", meT.json && meT.json.user && meT.json.user.allChars === true, meT.json);
    const X = browser(port);
    await X.get("/api/auth/discord");
    const bad = await X.get("/api/auth/discord/callback?code=player-" + DID + "&state=forged-state-value");
    check("sign-in: a wrong state is refused (no session cookie)", bad.status === 302 && !X.jar.has("bt_s") && bad.headers.location === "/login?failed=1", [bad.status, bad.headers.location]);

    const saveA = { v: 3, stars: { 1: 3 }, best: { 1: 30 }, bestZec: { 1: 4 }, wallet: 4, cos: { owned: {}, fur: "fur-bark" }, chars: {}, medals: { 1: { home: true } }, badges: { sweep: { 1: true } }, last: { 1: { escaped: { r: {}, t: 1 } } } };
    const pa = await A.put("/api/save", { save: saveA, base: null, pid: pid() });
    check("save: first PUT stores it (rev 1, wallet 4, device-only `last` not stored)", pa.status === 200 && pa.json.rev === 1 && pa.json.save.wallet === 4 && !("last" in pa.json.save), pa.json);
    const B = browser(port);
    await signIn(B, DID);
    const saveB = { v: 3, stars: { 1: 1, 2: 2 }, best: { 1: 25, 2: 40 }, bestZec: { 2: 6 }, wallet: 6, medals: { 1: { par: true } }, cos: { owned: {} } };
    const pb = await B.put("/api/save", { save: saveB, base: null, pid: pid() });
    const mb = pb.json && pb.json.save;
    check("second device: merged = max stars, min best, union medals, wallet 4 + 6", pb.status === 200 && mb && mb.stars[1] === 3 && mb.stars[2] === 2 && mb.best[1] === 25 && mb.best[2] === 40
      && mb.medals[1].home === true && mb.medals[1].par === true && mb.wallet === 10, mb);
    const gb = await B.get("/api/save"), ga = await A.get("/api/save");
    check("second device: GET from both devices returns the same merged save", gb.status === 200 && ga.status === 200 && canon(gb.json.save) === canon(mb) && canon(ga.json.save) === canon(mb), [gb.json && gb.json.rev]);
    const gen = pb.json.gen;
    const a2 = JSON.parse(JSON.stringify(mb)); a2.bestZec[3] = 3; a2.stars[3] = 1; a2.wallet = mb.wallet + 3;
    const pa2 = await A.put("/api/save", { save: a2, base: { gen, rev: pb.json.rev }, pid: pid() });
    check("base: a push from an adopted rev adds exactly what was earned since (13)", pa2.status === 200 && pa2.json.save.wallet === 13, pa2.json && pa2.json.save && pa2.json.save.wallet);

    const rev3 = pa2.json.rev, base3 = { gen, rev: rev3 }, s3 = pa2.json.save;
    const d1 = JSON.parse(JSON.stringify(s3)); d1.bestZec[5] = 20; d1.stars[5] = 2; d1.wallet = s3.wallet + 20;
    const d2 = JSON.parse(JSON.stringify(s3)); d2.bestZec[5] = 20; d2.stars[5] = 3; d2.wallet = s3.wallet + 20;
    await A.put("/api/save", { save: d1, base: base3, pid: pid() });
    const dd = await B.put("/api/save", { save: d2, base: base3, pid: pid() });
    const earned = 33;
    check("no duplication: two devices clearing the same level are paid once (wallet 33, not 53)", dd.status === 200 && dd.json.save.wallet === earned && dd.json.save.stars[5] === 3, dd.json && dd.json.save && dd.json.save.wallet);
    const Cdev = browser(port); await signIn(Cdev, DID);
    const blind = await Cdev.put("/api/save", { save: dd.json.save, base: null, pid: pid() });
    check("no duplication: a full copy pushed with no base cannot exceed what was earned (33)", blind.status === 200 && blind.json.save.wallet <= earned, blind.json && blind.json.save && blind.json.save.wallet);
    const st = (await A.get("/api/save")).json;
    const buy = JSON.parse(JSON.stringify(st.save)); buy.cos.owned["fur-bark"] = true; buy.wallet = st.save.wallet - 1;
    const pBuy = await A.put("/api/save", { save: buy, base: { gen, rev: st.rev }, pid: pid() });
    const pStale = await Cdev.put("/api/save", { save: JSON.parse(JSON.stringify(st.save)), base: null, pid: pid() });
    const capNow = earned - 1;
    check("no duplication: spent ZEC does not come back through a stale device (wallet <= 33 - 1)", pBuy.status === 200 && pBuy.json.save.wallet === capNow && pStale.status === 200 && pStale.json.save.cos.owned["fur-bark"] === true && pStale.json.save.wallet <= capNow, [pBuy.json && pBuy.json.save.wallet, pStale.json && pStale.json.save.wallet, capNow]);

    const D = browser(port), DID2 = "300000000000000002"; await signIn(D, DID2);
    const base0 = { v: 3, stars: { 1: 3, 2: 3 }, bestZec: { 1: 10, 2: 10 }, wallet: 5, cos: { owned: {} } };
    const r0 = await D.put("/api/save", { save: base0, base: null, pid: pid() });
    const p1 = pid(), up = JSON.parse(JSON.stringify(r0.json.save)); up.wallet = 8; up.inv = { decoy: 2 };
    const r1 = await D.put("/api/save", { save: up, base: { gen: r0.json.gen, rev: r0.json.rev }, pid: p1 });
    const r1b = await D.put("/api/save", { save: up, base: { gen: r0.json.gen, rev: r0.json.rev }, pid: p1 });
    check("idempotent: the same push sent twice is applied once (wallet 8, decoys 2)", r1.status === 200 && r1b.status === 200 && r1b.json.save.wallet === 8 && r1b.json.save.inv.decoy === 2 && r1b.json.repeated === true, r1b.json && r1b.json.save);
    const later = JSON.parse(JSON.stringify(up)); later.wallet = 9; later.inv = { decoy: 1 };
    const r2 = await D.put("/api/save", { save: later, base: { gen: r0.json.gen, rev: r0.json.rev, pid: p1 }, pid: pid() });
    check("lost answer: a push based on an unadopted push id merges against what it sent (wallet 9, decoys 1)", r2.status === 200 && r2.json.save.wallet === 9 && r2.json.save.inv.decoy === 1, r2.json && r2.json.save);
    const s4 = JSON.parse(JSON.stringify(r2.json.save)); s4.wallet = 10;
    const r4 = await D.put("/api/save", { save: s4, base: { gen: r2.json.gen, rev: r2.json.rev }, pid: pid() });
    check("base: with ZEC spent on carried items, a push from an adopted rev is still exact (wallet 10)", r4.status === 200 && r4.json.save.wallet === 10, r4.json && r4.json.save && r4.json.save.wallet);

    const Ed = browser(port), DID4 = "300000000000000004"; await signIn(Ed, DID4);
    const q1 = pid(), first = { v: 3, stars: { 1: 3 }, bestZec: { 1: 10 }, wallet: 4, cos: { owned: {} } };
    await Ed.put("/api/save", { save: first, base: null, pid: q1 });
    const second = JSON.parse(JSON.stringify(first)); second.wallet = 6;
    const q2 = await Ed.put("/api/save", { save: second, base: { gen: null, rev: 0, pid: q1 }, pid: pid() });
    check("lost first answer: a push naming its first push id (no gen yet) is exact (wallet 6, not 10)", q2.status === 200 && q2.json.save.wallet === 6, q2.json && q2.json.save && q2.json.save.wallet);

    const SYNC_SRC = fs.readFileSync(path.join(ROOT, "site", "engine", "account-sync.js"), "utf8");
    const runDevices = async (src) => {
      const DID5 = "300000000000000005" + "";
      const j1 = browser(port), j2 = browser(port);
      await signIn(j1, DID5); await signIn(j2, DID5);
      const d1 = device(port, j1, src, { v: 3, trailV: 2, stars: { 1: 3 }, bestZec: { 1: 5 }, wallet: 5, cos: { owned: {} }, last: { 1: { keep: 1 } }, soundVol: 0.3 });
      await until(() => d1.meta() && d1.meta().base && d1.meta().base.rev >= 1, 8000);
      const d2 = device(port, j2, src, { v: 3, trailV: 2, stars: { 2: 1 }, bestZec: { 2: 4 }, wallet: 4, cos: { owned: {} } });
      await until(() => d2.meta() && d2.meta().base && d2.meta().base.rev >= 2, 8000);
      d1.ctx.BH.trailSync.syncNow();
      await until(() => d1.save().wallet === 9, 6000);
      d1.ctx.BH.track("level_start", { level: 1, retry: true });
      d1.ctx.BH.track("wallet_set", { level: 1 });
      d1.ctx.BH.track("level_start", { level: 0 });
      d1.ctx.BH.track("level_fail", { level: 1, why: "bad\u0007text", deep: { x: 1 } });
      d1.ctx.BH.track("level_quit", { level: 1, secs: 3.5 });
      const tracked = await (async () => {
        for (let i = 0; i < 80; i++) {
          const rows = (await db.query("SELECT e.type, e.level, e.detail FROM trail_events e JOIN trail_players p ON p.id = e.player_id WHERE p.discord_id = $1 AND e.type IN ('level_start', 'level_fail', 'level_quit') ORDER BY e.type", [DID5])).rows;
          if (rows.length >= 3) return rows.length === 3 && rows.every((r) => r.level === 1) && rows[0].type === "level_fail" && Object.keys(rows[0].detail).length === 0 && rows[1].detail.secs === 3.5 && rows[2].detail.retry === true;
          await sleep(100);
        }
        return false;
      })();
      d1.kill(); d2.kill();
      await db.query("DELETE FROM trail_players WHERE discord_id = $1", [DID5]);
      return { d1: d1.save(), d2: d2.save(), u: d1.ctx.BH.trailSync.user(), tracked };
    };
    const dv = log ? await runDevices(SYNC_SRC) : null;
    if (dv) check("browser sync: two devices end with the merged save (wallet 9, both levels) and device-only fields stay put", dv.d1.wallet === 9 && dv.d2.wallet === 9 && dv.d1.stars[1] === 3 && dv.d1.stars[2] === 1 && dv.d2.stars[1] === 3
      && dv.d1.last && dv.d1.last[1].keep === 1 && dv.d1.soundVol === 0.3 && dv.u && dv.u.name === "Player 0005", { d1: dv.d1.wallet, d2: dv.d2.wallet, s: dv.d1.stars, u: dv.u });
    if (dv) check("browser track: valid BH.track events reach the server; an unknown type, a bad level and off-shape fields never cost the batch", dv.tracked === true);
    if (log) {
      const broken = SYNC_SRC.replace("if (now === str) {", "if (false) {");
      const bv = broken !== SYNC_SRC ? await runDevices(broken) : null;
      check("browser sync (control): a copy that never adopts the answer ends with a different save", !!bv && !(bv.d1.wallet === 9 && bv.d2.wallet === 9 && bv.d1.stars[2] === 1), bv && { d1: bv.d1.wallet, d2: bv.d2.wallet });
    }

    const src = (f) => fs.readFileSync(path.join(ROOT, "site", f), "utf8");
    const itemIds = [...src("mechanics/items.js").matchAll(/carryItem\("([^"]+)"/g)].map((m) => m[1]);
    const cosIds = [...src("characters/cosmetics.js").matchAll(/\{ id: '([a-z0-9-]+)', slot: '([a-z]+)'/g)];
    const puKinds = [...new Set([...src("mechanics/powerups.js").matchAll(/kind: "([a-z]+)"/g)].map((m) => m[1]))];
    const real = { v: 3, trailV: 2, gAt: 14, stars: { 1: 3, 11: 1 }, best: { 1: 41.7 }, bestZec: { 1: 6 }, wallet: 6, medals: { 1: { home: true, par: true, unseen: true } },
      badges: { sweep: { 1: true } }, story: { acts: { 0: true, 1: true } }, chars: { "char-046": true }, char: "char-046", up: {},
      inv: {}, cos: { owned: {} }, pu: {}, mapPanned: 1, trail: { clues: { 3: ["panicked about a name"] }, wallets: 1, lent: false, named: true, endings: { safe: true } },
      last: { 1: { escaped: { r: { secs: 41.7 }, t: Date.now() } } }, loadout: itemIds.slice(0, 1), soundVol: 0.4 };
    itemIds.forEach((id) => { real.inv[id] = 1; });
    cosIds.forEach((m) => { real.cos.owned[m[1]] = true; real.cos[m[2]] = m[1]; });
    puKinds.forEach((k) => { real.pu[k] = 2; });
    const Rd = browser(port); await signIn(Rd, "300000000000000006");
    const rr = await Rd.put("/api/save", { save: real, base: null, pid: pid() });
    check("real shape: a save with every item, cosmetic and power-up id from the game files is accepted whole", itemIds.length >= 3 && cosIds.length >= 10 && puKinds.length >= 1 && rr.status === 200
      && Object.keys(rr.json.save.inv).length === itemIds.length && Object.keys(rr.json.save.cos.owned).length === cosIds.length && rr.json.save.trail.named === true,
      [itemIds.join(","), cosIds.length, puKinds.join(","), rr.status, rr.json && rr.json.field]);

    const lv = { BH: {} }; lv.window = lv; vm.createContext(lv);
    vm.runInContext(src("levels/levels.js"), lv, { filename: "levels.js" });
    const MAP = lv.TRAIL_REMAP.maps[2], to10 = +MAP[10], to11 = +MAP[11];
    const Vd = browser(port), DIDV = "300000000000000008"; await signIn(Vd, DIDV);
    const oldNums = { stars: { 1: 3, 10: 2, 11: 1 }, best: { 11: 50 }, bestZec: { 10: 4 }, medals: { 10: { home: true } } };
    const newNums = { 1: 3, [to10]: 2, [to11]: 1 };
    const vp = await Vd.put("/api/save", { save: Object.assign({ v: 3, trailV: 2, wallet: 4, cos: { owned: {} } }, JSON.parse(JSON.stringify(oldNums))), base: null, pid: pid() });
    const vs = vp.json && vp.json.save;
    check("trailV 7: an old-version push (trailV 2) is stored on each level's tid's new number, marked trailV 7", vp.status === 200 && to10 === 8 && to11 === 9 && vs
      && vs.trailV === 7 && canon(vs.stars) === canon(newNums) && vs.best[to11] === 50 && Object.keys(vs.best).length === 1 && vs.bestZec[to10] === 4 && vs.medals[to10] && vs.medals[to10].home === true && vs.wallet === 4,
      { to10, to11, got: vs && { stars: vs.stars, best: vs.best, trailV: vs.trailV } });
    const V3d = browser(port); await signIn(V3d, "300000000000000009");
    const v3p = await V3d.put("/api/save", { save: { v: 3, trailV: 3, stars: { 13: 2, 6: 1, 15: 3, 19: 1 }, best: { 13: 33 }, wallet: 2, cos: { owned: {} } }, base: null, pid: pid() });
    const v3s = v3p.json && v3p.json.save;
    check("trailV 7: a 19-level push (trailV 3) moves campfire 13 -> 8, stayin 6 -> inriver 5, together 15 -> 9, bonus4 19 dropped", v3p.status === 200 && v3s && v3s.trailV === 7
      && canon(v3s.stars) === canon({ 5: 1, 8: 2, 9: 3 }) && v3s.best[8] === 33 && Object.keys(v3s.best).length === 1, v3p.status + " " + JSON.stringify(v3s && { stars: v3s.stars, best: v3s.best, trailV: v3s.trailV, field: v3p.json && v3p.json.field }));
    const pv = (await db.query("SELECT id FROM trail_players WHERE discord_id = $1", [DIDV])).rows[0].id;
    const oldCopy = Object.assign(JSON.parse(JSON.stringify(vs || {})), { trailV: 2 }, JSON.parse(JSON.stringify(oldNums)));
    await db.query("UPDATE trail_saves SET save = $2 WHERE player_id = $1", [pv, JSON.stringify(oldCopy)]);
    const vg = (await Vd.get("/api/save")).json;
    const vm1 = await Vd.put("/api/save", { save: { v: 3, trailV: 7, stars: { 2: 1 }, bestZec: { 2: 3 }, wallet: 7, cos: { owned: {} } }, base: { gen: vg.gen, rev: vg.rev }, pid: pid() });
    const m1 = vm1.json && vm1.json.save;
    check("trailV 7: an old-version copy stored on the server is moved on the next merge (and the push's own level 2 kept)", vm1.status === 200 && vg.save.trailV === 2 && m1 && m1.trailV === 7
      && canon(m1.stars) === canon(Object.assign({ 2: 1 }, newNums)) && m1.best[to11] === 50 && m1.bestZec[to10] === 4 && m1.bestZec[2] === 3 && m1.wallet === 7, m1 && { stars: m1.stars, trailV: m1.trailV, wallet: m1.wallet });
    const vm2 = await Vd.put("/api/save", { save: m1, base: { gen: vm1.json.gen, rev: vm1.json.rev }, pid: pid() });
    const m2 = vm2.json && vm2.json.save, vg2 = (await Vd.get("/api/save")).json;
    check("trailV 7: a copy already at trailV 7 is not moved a second time (push, merge and GET keep the same numbers)", vm2.status === 200 && m2 && m1 && m2.trailV === 7 && canon(m2.stars) === canon(m1.stars)
      && canon(m2.best) === canon(m1.best) && canon(m2.bestZec) === canon(m1.bestZec) && vg2 && canon(vg2.save.stars) === canon(m1.stars), m2 && { stars: m2.stars });

    const big = await D.put("/api/save", { save: Object.assign({}, base0, { zz: "x".repeat(100 * 1024) }), base: null, pid: pid() });
    check("refused: an oversized body (100 KB) is 400", big.status === 400, [big.status, big.json]);
    const inv1 = await D.put("/api/save", { save: { stars: { 1: 7 } }, base: null, pid: pid() });
    const inv2 = await D.put("/api/save", { save: { stars: { 99: 1 } }, base: null, pid: pid() });
    const inv3 = await D.put("/api/save", { save: { wallet: -5 }, base: null, pid: pid() });
    const inv4 = await D.put("/api/save", { save: "not a save", base: null, pid: pid() });
    const inv5 = await D.put("/api/save", { save: { cos: { owned: { "<script>": true } } }, base: null, pid: pid() });
    check("refused: invalid saves are 400 invalid_save (stars 7, level 99, wallet -5, a string, a bad id)", [inv1, inv2, inv3, inv4, inv5].every((r) => r.status === 400 && r.json && r.json.error === "invalid_save"), [inv1, inv2, inv3, inv4, inv5].map((r) => r.status + ":" + (r.json && r.json.field)));
    const okSmall = await D.put("/api/save", { save: { stars: { 1: 2 } }, base: null, pid: pid() });
    check("refused (control): a small valid save from the same device is 200", okSmall.status === 200);
    const rawPut = (saveJson) => D.req("PUT", "/api/save", { raw: '{"save":' + saveJson + ',"base":null,"pid":"' + pid() + '"}' });
    const protoPuts = [await rawPut('{"v":3,"inv":{"__proto__":1}}'), await rawPut('{"v":3,"pu":{"constructor":2}}'), await rawPut('{"v":3,"up":{"prototype":true}}'),
      await rawPut('{"v":3,"trail":{"__proto__":{"named":true}}}')];
    check("refused: __proto__, constructor and prototype keys in a save are 400 invalid_save", protoPuts.every((r) => r.status === 400 && r.json && r.json.error === "invalid_save"),
      protoPuts.map((r) => r.status + ":" + (r.json && r.json.field)));
    const xo = await D.put("/api/save", { save: base0, base: null, pid: pid() }, { origin: "https://evil.example" });
    check("refused: a cross-origin PUT is 403", xo.status === 403, xo.status);

    const F = browser(port);
    const now = Date.now();
    F.jar.set("bt_s", C.seal(crypto.randomBytes(32), { id: "d:" + DID2, name: "x", via: "discord", iat: now, exp: now + 3600e3 }));
    const fg = await F.get("/api/save");
    const tampered = D.jar.get("bt_s").replace(/^(.)/, (c) => (c === "e" ? "f" : "e"));
    const T = browser(port); T.jar.set("bt_s", tampered);
    const tp = await T.get("/api/save");
    const made = Number((await db.query("SELECT (extract(epoch FROM created_at) * 1000)::bigint AS m FROM trail_players WHERE discord_id = $1", [DID2])).rows[0].m);
    const E = browser(port); E.jar.set("bt_s", C.seal(SESSION_KEY, { id: "d:" + DID2, name: "x", via: "discord", iat: made + 1, exp: made + 2 }));
    const ex = await E.get("/api/save");
    const G = browser(port); G.jar.set("bt_s", C.seal(SESSION_KEY, { id: "d:" + DID2, name: "x", via: "discord", iat: now, exp: now + 3600e3 }));
    const gd = await G.get("/api/save");
    check("cookie: a forged (wrong key) and a tampered cookie are 401", fg.status === 401 && tp.status === 401, [fg.status, tp.status]);
    check("cookie: an expired cookie (right key) is 401", ex.status === 401, ex.status);
    check("cookie (control): the same cookie sealed with the right key and in date is 200", gd.status === 200, gd.status);
    const keep = D.jar.get("bt_s");
    const lo = await D.post("/api/logout");
    const Old = browser(port); Old.jar.set("bt_s", keep);
    const oldR = await Old.get("/api/save");
    check("logout: clears the cookie and every earlier copy of it is 401", lo.status === 200 && !D.jar.has("bt_s") && oldR.status === 401, [lo.status, oldR.status]);

    const Fg = browser(port), DID3 = "300000000000000003"; await signIn(Fg, DID3);
    await Fg.put("/api/save", { save: base0, base: null, pid: pid() });
    const keep3 = Fg.jar.get("bt_s");
    const before = (await db.query("SELECT count(*)::int AS n FROM trail_saves s JOIN trail_players p ON p.id = s.player_id WHERE p.discord_id = $1", [DID3])).rows[0].n;
    const fr = await Fg.post("/api/forget");
    const afterP = (await db.query("SELECT count(*)::int AS n FROM trail_players WHERE discord_id = $1", [DID3])).rows[0].n;
    const afterS = (await db.query("SELECT count(*)::int AS n FROM trail_saves s LEFT JOIN trail_players p ON p.id = s.player_id WHERE p.id IS NULL")).rows[0].n;
    check("forget: the player row and the save are deleted", before === 1 && fr.status === 200 && afterP === 0 && afterS === 0, [before, fr.status, afterP, afterS]);
    const Old3 = browser(port); Old3.jar.set("bt_s", keep3);
    const o3 = await Old3.get("/api/save");
    await signIn(Fg, DID3);
    const fresh = await Fg.get("/api/save");
    const o3b = await Old3.get("/api/save");
    check("forget: the old cookie stays dead, even after signing in again; the new account starts empty", o3.status === 401 && o3b.status === 401 && fresh.status === 200 && fresh.json.save === null, [o3.status, o3b.status, fresh.status, fresh.json && fresh.json.save]);

    const g1 = await anon.get("/api/gate");
    check("lock: signed out, the gate sends to /login", g1.status === 302 && g1.headers.location === "/login", [g1.status, g1.headers.location]);
    const St = browser(port), SDID = "300000000000000077";
    await db.query("DELETE FROM trail_allowlist WHERE discord_id = $1", [SDID]);
    await db.query("DELETE FROM trail_access_requests WHERE discord_id = $1", [SDID]);
    const ss = await signIn(St, SDID, "/map", true);
    check("lock: a stranger's sign-in lands on /login, not the game", ss.cb.status === 302 && ss.cb.headers.location === "/login", [ss.cb.status, ss.cb.headers.location]);
    const g2 = await St.get("/api/gate");
    check("lock: a signed-in stranger is sent to /login", g2.status === 302 && g2.headers.location === "/login", [g2.status, g2.headers.location]);
    const sv = await St.get("/api/save");
    check("lock: a signed-in stranger cannot read or write a save", sv.status === 401, sv.status);
    const st1 = await St.get("/api/access/status");
    check("lock: the stranger's status says not allowed", st1.status === 200 && st1.json && st1.json.allowed === false && st1.json.user && st1.json.request === null, st1.json);
    const rq = await St.post("/api/access/request");
    const row = (await db.query("SELECT status, notify, username FROM trail_access_requests WHERE discord_id = $1", [SDID])).rows;
    check("lock: Request access stores one pending request for the owner", rq.status === 201 && row.length === 1 && row[0].status === "pending" && row[0].notify === "off" && row[0].username === "p0077", [rq.status, row]);
    const rq2 = await St.post("/api/access/request");
    const rows2 = (await db.query("SELECT count(*)::int AS n FROM trail_access_requests WHERE discord_id = $1", [SDID])).rows[0].n;
    check("lock: asking twice is still one request", rq2.status === 200 && rows2 === 1, [rq2.status, rows2]);
    check("lock: still locked while waiting", (await St.get("/api/gate")).status === 302);
    await db.query("INSERT INTO trail_allowlist (discord_id, added_by) VALUES ($1, 'test')", [SDID]);
    const g3 = await St.get("/api/gate");
    check("lock: once approved, the gate lets the same session in", g3.status === 204, g3.status);
    await db.query("UPDATE trail_allowlist SET revoked_at = now() WHERE discord_id = $1", [SDID]);
    const g4 = await St.get("/api/gate");
    check("lock: a revoke locks them out on the very next request", g4.status === 302, g4.status);
    const Ow = browser(port); const so = await signIn(Ow, OWNER_DID, "/map");
    const g5 = await Ow.get("/api/gate");
    check("lock: the owner always gets in", so.cb.headers.location === "/map" && g5.status === 204, [so.cb.headers.location, g5.status]);
    const forged = browser(port); forged.jar.set("bt_s", "forged.value.here");
    check("lock: a forged session cookie is sent to /login", (await forged.get("/api/gate")).status === 302);

    const cols = (await db.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name LIKE 'trail\\_%' AND table_name <> 'trail_schema_migrations' ORDER BY 1, 2")).rows.map((r) => r.table_name + "." + r.column_name);
    const EXPECTED = ["trail_access_requests.created_at", "trail_access_requests.decided_at", "trail_access_requests.decided_by", "trail_access_requests.discord_id", "trail_access_requests.display_name",
      "trail_access_requests.id", "trail_access_requests.notify", "trail_access_requests.previous_denials", "trail_access_requests.public_id", "trail_access_requests.status", "trail_access_requests.username",
      "trail_access_tombstones.did_hash", "trail_access_tombstones.denials", "trail_access_tombstones.last_decided_at", "trail_access_tombstones.expires_at",
      "trail_players.pseudo_salt", "trail_players.sessions_count", "trail_players.events_count", "trail_players.last_event_at",
      "trail_allowlist.added_at", "trail_allowlist.added_by", "trail_allowlist.discord_id", "trail_allowlist.request_id", "trail_allowlist.revoked_at", "trail_allowlist.revoked_by",
      "trail_audit_log.action", "trail_audit_log.actor", "trail_audit_log.at", "trail_audit_log.detail", "trail_audit_log.id", "trail_audit_log.target",
      "trail_events.at", "trail_events.client_event_id", "trail_events.detail", "trail_events.id", "trail_events.level", "trail_events.player_id", "trail_events.session_id", "trail_events.type",
      "trail_players.created_at", "trail_players.discord_id", "trail_players.display_name", "trail_players.id", "trail_players.last_seen_at", "trail_players.session_cut", "trail_players.username",
      "trail_rate_snapshot.count", "trail_rate_snapshot.key", "trail_rate_snapshot.name", "trail_rate_snapshot.reset_at",
      "trail_saves.gen", "trail_saves.history", "trail_saves.player_id", "trail_saves.rev", "trail_saves.save", "trail_saves.updated_at",
      "trail_sessions.ended_at", "trail_sessions.ended_by", "trail_sessions.id", "trail_sessions.ip_hash", "trail_sessions.player_id", "trail_sessions.started_at", "trail_sessions.ua_hash"];
    check("privacy: exactly the documented columns (names only where the owner reads them, address and browser only hashed)", cols.join(" ") === EXPECTED.slice().sort().join(" "),
      cols.filter((c) => !EXPECTED.includes(c)).concat(EXPECTED.filter((c) => !cols.includes(c)).map((c) => "missing " + c)).join(" "));
  } catch (e) {
    check("suite ran to the end", false, String(e && e.stack).slice(0, 300));
  } finally { await db.end(); }
  await stop(srv);
  const logs = srv.out + srv.err;
  check("logs: no Discord id, no secret, no DATABASE_URL", !/30000000000000000\d/.test(logs) && !logs.includes(SECRETS.SESSION_SECRET) && !logs.includes(SECRETS.DISCORD_CLIENT_SECRET) && !/postgres:\/\//.test(logs));
  return { results, srv };
}

const MUTANTS = [
  { name: "every player gets all Bitfoots", file: "server.js", from: "ALL_CHARS.has(p.did) ?", to: "true ?",
    fails: ["all Bitfoots: a player NOT on TRAIL_ALL_CHARS_DISCORD_IDS gets no allChars"] },
  { name: "gate lets any signed-in person in", file: "server.js", from: "if (m.user && m.allowed) { res.writeHead(204", to: "if (m.user) { res.writeHead(204",
    fails: ["lock: a signed-in stranger is sent to /login", "lock: a revoke locks them out on the very next request"] },
  { name: "no wallet cap", file: "save.js", from: "Math.min(three, walletCap(m, cat), LIM.wallet)", to: "Math.min(three, LIM.wallet)",
    fails: ["no duplication: two devices clearing the same level are paid once (wallet 33, not 53)", "no duplication: a full copy pushed with no base cannot exceed what was earned (33)", "no duplication: spent ZEC does not come back through a stale device (wallet <= 33 - 1)"] },
  { name: "the push replaces the server copy (no merge)", file: "save.js", from: "m.stars = mergeMap(S.stars, C.stars, Math.max);", to: "m.stars = C.stars;",
    fails: ["second device: merged = max stars, min best, union medals, wallet 4 + 6"] },
  { name: "base ignored", file: "server.js", from: "function baseOf(row, base) {", to: "function baseOf(row, base) { return null;",
    fails: ["base: with ZEC spent on carried items, a push from an adopted rev is still exact (wallet 10)", "lost answer: a push based on an unadopted push id merges against what it sent (wallet 9, decoys 1)"] },
  { name: "no idempotency", file: "server.js", from: "if (hist.some((h) => h.pid === pid)) {", to: "if (false) {",
    fails: ["idempotent: the same push sent twice is applied once (wallet 8, decoys 2)"] },
  { name: "no size cap", file: "server.js", from: "const CAP = { save: 64 * 1024,", to: "const CAP = { save: 1024 * 1024,",
    fails: ["refused: an oversized body (100 KB) is 400"] },
  { name: "no stars validation", file: "save.js", from: "(x) => isInt(x, 0, 3)", to: "(x) => true",
    fails: ["refused: invalid saves are 400 invalid_save (stars 7, level 99, wallet -5, a string, a bad id)"] },
  { name: "item ids must be lowercase (the game's are camelCase)", file: "save.js", from: "for (const k of Object.keys(raw.inv)) { if (!KEY_RE.test(k) ||", to: "for (const k of Object.keys(raw.inv)) { if (!/^[a-z0-9-]{1,48}$/.test(k) ||",
    fails: ["real shape: a save with every item, cosmetic and power-up id from the game files is accepted whole"] },
  { name: "save open to anyone", file: "server.js", from: "if (!p) { req.resume(); sendJson(res, 401, { error: \"login\" }); return null; }", to: "if (!p) { req.resume(); sendJson(res, 200, { save: null }); return null; }",
    fails: ["logged out: /api/save GET and PUT are 401"] },
  { name: "cookie MAC and expiry not checked", file: "server.js",
    from: "const sessionOf = (req) => C.readSession(SESSION_KEY, C.cookiesOf(req).bt_s);",
    to: "const sessionOf = (req) => { try { const v = C.cookiesOf(req).bt_s; const o = JSON.parse(Buffer.from(v.slice(0, v.lastIndexOf('.')), 'base64url').toString()); return { id: o.id, name: o.name, via: o.via, iat: o.iat }; } catch (e) { return null; } };",
    fails: ["cookie: a forged (wrong key) and a tampered cookie are 401", "cookie: an expired cookie (right key) is 401"] },
  { name: "logout not stored", file: "store.js", from: "UPDATE trail_players SET session_cut = to_timestamp($2::double precision / 1000) WHERE discord_id = $1", to: "SELECT $1::text, $2::double precision",
    fails: ["logout: clears the cookie and every earlier copy of it is 401"] },
  { name: "forget keeps the rows", file: "store.js", from: "DELETE FROM trail_players WHERE discord_id = $1", to: "SELECT $1::text",
    fails: ["forget: the player row and the save are deleted"] },
  { name: "state not checked", file: "server.js", from: "if (!takeState(saved, query.get(\"state\"))) return fail();", to: "if (!saved) return fail();",
    fails: ["sign-in: a wrong state is refused (no session cookie)"] },
  { name: "old-version copies are not moved to the new numbers", file: "save.js", from: "if (!isObj(s) || !cat.remap || s.trailV === cat.trailV) return s;", to: "return s;",
    fails: ["trailV 7: an old-version push (trailV 2) is stored on each level's tid's new number, marked trailV 7","trailV 7: an old-version copy stored on the server is moved on the next merge (and the push's own level 2 kept)",
      "trailV 7: a 19-level push (trailV 3) moves campfire 13 -> 8, stayin 6 -> inriver 5, together 15 -> 9, bonus4 19 dropped"] },
  { name: "every copy is moved, even one already at trailV 7", file: "save.js", from: "if (!isObj(s) || !cat.remap || s.trailV === cat.trailV) return s;", to: "if (!isObj(s) || !cat.remap) return s;",
    fails: ["trailV 7: a copy already at trailV 7 is not moved a second time (push, merge and GET keep the same numbers)"] },
  { name: "a 19-level copy is moved with the 11-level map", file: "save.js", from: "const verOf = (v, cat) => (cat.remap[String(v)] ? String(v) : \"2\");", to: "const verOf = (v, cat) => \"2\";",
    fails: ["trailV 7: a 19-level push (trailV 3) moves campfire 13 -> 8, stayin 6 -> inriver 5, together 15 -> 9, bonus4 19 dropped"] },
];

async function main() {
  let passed = 0, failed = 0;
  const top = (name, ok, detail) => { if (ok) passed++; else failed++; console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + String(detail).slice(0, 300) + "]" : "")); };
  const db = await pgLocal.start();
  if (!db.ok) { console.log("FAIL postgres could not start (INVALID run): " + db.why); process.exit(1); }
  console.log("postgres: " + db.version + " (throwaway cluster, loopback)");
  {
    const cat = require(path.join(DIR, "save.js")).loadCatalog(path.join(ROOT, "site"));
    const prices = [...cat.cosPrice.values(), ...cat.charPrice.values()];
    top("the server reads the game's prices (1 or 2 ZEC each)", prices.length >= 25 && prices.every((p) => p === 1 || p === 2), prices.join(","));
    const docker = fs.readFileSync(path.join(ROOT, "Dockerfile.api"), "utf8");
    const reads = (fs.readFileSync(path.join(DIR, "save.js"), "utf8").match(/for \(const f of \[([^\]]+)\]\)/) || ["", ""])[1].match(/[\w./-]+\.js/g) || [];
    const SV = require(path.join(DIR, "save.js"));
    const kept = SV.normalize({ badges: { trail: { u1: true, "berry-buyer": true }, caught: { 1: true, 2: true }, steps: { 1: true } } }, cat).badges;
    top("the server keeps the game's own badges and their counts", kept && kept.trail && kept.trail.u1 === true && kept.trail["berry-buyer"] === true && Object.keys(kept.caught || {}).length === 2 && kept.steps && kept.steps["1"] === true, JSON.stringify(kept));
    top("the server's deploy copies every game file its catalog reads", reads.length >= 4 && reads.every((f) => docker.includes("site/" + f)), reads.join(" "));

    const snap = typeof C.snapshotRows === "function" ? C.snapshotRows : () => [];
    const ipL = C.makeLimiter(300, 60000, 100), evL = C.makeLimiter(60, 600000, 100);
    for (let i = 0; i < 10; i++) ipL.hit("a" + i);
    evL.hit("p1");
    const capped = snap({ ip: ipL, events: evL }, 10), whole = snap({ ip: ipL, events: evL }, 100);
    top("rate limits: when the saved counters reach the cap, the small per-player limiter is kept before the big address one", capped.length === 10 && capped.some((r) => r.name === "events" && r.key === "p1"),
      JSON.stringify(capped.map((r) => r.name)));
    top("rate limits (control): under the cap every counter is saved", whole.length === 11, whole.length); // COUNT-OK: 11 keys built just above
    const mg = C.makeLimiter(60, 600000, 100);
    for (let i = 0; i < 60; i++) mg.hit("p2");
    mg.load("p2", 1, Date.now() + 300000);
    const lowKept = !mg.hit("p2");
    const mh = C.makeLimiter(60, 600000, 100);
    mh.hit("p3"); mh.load("p3", 60, Date.now() + 300000);
    const highTaken = !mh.hit("p3");
    top("rate limits: a counter read back from the database while the same key is live keeps the higher count", lowKept && highTaken, JSON.stringify({ lowKept, highTaken }));

    const priv = fs.readFileSync(path.join(ROOT, "site", "login", "privacy.html"), "utf8");
    const ipLine = (priv.match(/<li>[^<]*IP address[^<]*<\/li>/) || [""])[0];
    top("privacy page: the IP sentence says the codes are made with a secret key and nothing claims they can't be turned back; no em dash, no comments", !!ipLine && /secret key/.test(ipLine)
      && !/(can't|cannot|can not) be (turned|reversed)|irreversib/i.test(priv) && !priv.includes("—") && !priv.includes("<!--"), ipLine);
    const keep = require(path.join(DIR, "store.js")).EVENTS_PER_PLAYER;
    top("privacy page: states the same per-player event ceiling the server keeps", Number.isInteger(keep) && priv.includes("latest " + keep.toLocaleString("en-US")), keep);
  }
  try {
    await T.foreignFixture(db.url);
    const before = await T.foreignSnapshot(db.url);
    allowDb = new Pool({ connectionString: db.url, max: 1 });

    const real = await suite(path.join(DIR, "server.js"), db.url, true);
    for (const ok of real.results.values()) { if (ok) passed++; else failed++; }
    top("shared database: the other app's tables are byte-for-byte untouched", (await T.foreignSnapshot(db.url)) === before);

    {
      const q = new Pool({ connectionString: db.url, max: 1 });
      let seeded = false, after = null;
      try {
        const pidRow = (await q.query("INSERT INTO trail_players (discord_id, events_count) VALUES ('300000000000000097', 2) RETURNING id")).rows[0];
        await q.query("INSERT INTO trail_events (player_id, type, level, client_event_id, at) VALUES ($1, 'level_start', 1, 'old-401', now() - interval '401 days'), ($1, 'level_start', 1, 'old-399', now() - interval '399 days')", [pidRow.id]);
        await q.query("INSERT INTO trail_access_tombstones (did_hash, denials, last_decided_at, expires_at) VALUES ('tomb-expired-0000000000', 1, now() - interval '200 days', now() - interval '1 day'), ('tomb-current-0000000000', 1, now(), now() + interval '179 days')");
        seeded = true;
        const again = startApi(path.join(DIR, "server.js"), await freePort(), db.url);
        const up = await waitUp(again);
        await stop(again);
        const ev = (await q.query("SELECT client_event_id FROM trail_events WHERE player_id = $1 ORDER BY 1", [pidRow.id])).rows.map((r) => r.client_event_id);
        const tb = (await q.query("SELECT did_hash FROM trail_access_tombstones WHERE did_hash LIKE 'tomb-%' ORDER BY 1")).rows.map((r) => r.did_hash);
        const cnt = (await q.query("SELECT events_count FROM trail_players WHERE id = $1", [pidRow.id])).rows[0].events_count;
        after = { up, ev, tb, cnt };
      } catch (e) { after = { error: String(e && e.message).slice(0, 120) }; }
      finally { await q.end(); }
      top("retention: a boot deletes events older than 400 days and expired tombstones, keeps a 399-day event and a live tombstone, and lowers the player's count",
        seeded && after && after.up && JSON.stringify(after.ev) === '["old-399"]' && JSON.stringify(after.tb) === '["tomb-current-0000000000"]' && after.cnt === 1, JSON.stringify(after));
    }

    await T.resetDb(db.url);
    const q = new Pool({ connectionString: db.url, max: 1 });
    await q.query("CREATE TABLE trail_players (id INTEGER)");
    await q.end();
    const port = await freePort();
    const refuse = startApi(path.join(DIR, "server.js"), port, db.url);
    for (let i = 0; i < 80 && !refuse.exited; i++) await sleep(100);
    await stop(refuse);
    top("migrations: a trail_ table it did not make stops the boot", refuse.exited && refuse.code !== 0 && /did not make/.test(refuse.err), refuse.err.slice(0, 160));

    const noKey = startApi(path.join(DIR, "server.js"), await freePort(), db.url, { TRAIL_PROXY_KEY: null });
    for (let i = 0; i < 80 && !noKey.exited; i++) await sleep(100);
    await stop(noKey);
    top("network: with Discord sign-in on and no TRAIL_PROXY_KEY the server refuses to start", noKey.exited && noKey.code !== 0 && /TRAIL_PROXY_KEY/.test(noKey.err) && !/listening on/.test(noKey.out), (noKey.err || noKey.out).slice(0, 160));

    const dock = fs.readFileSync(path.join(ROOT, "Dockerfile.api"), "utf8");
    const need = ["server/lib/common.js", "server/api/server.js", "server/api/save.js", "server/api/store.js", "server/api/migrations.js",
      "server/api/owner/index.html", "server/api/owner/owner.js", "server/api/owner/owner.css", "server/package.json", "server/package-lock.json",
      "site/levels/levels.js", "site/characters/cosmetics.js", "site/characters/characters.js", "site/characters/prices.js"];
    for (const f of fs.readdirSync(DIR)) if (/\.js$/.test(f) && !f.startsWith("_mutant")) {
      for (const m of fs.readFileSync(path.join(DIR, f), "utf8").matchAll(/require\("(\.[^"]+)"\)/g)) {
        const rel = path.relative(ROOT, path.resolve(DIR, m[1])).split(path.sep).join("/");
        if (!rel.includes("node_modules")) need.push(rel.endsWith(".js") ? rel : rel + ".js");
      }
    }
    const missing = [...new Set(need)].filter((f) => !dock.includes(f) && !dock.includes(path.posix.dirname(f) + "/*.js"));
    top("Dockerfile.api copies every file the server loads", missing.length === 0, missing.join(" "));

    if (process.env.TRAIL_CHECK_NO_MUTANTS !== "1") for (const mu of MUTANTS) {
      await T.resetDb(db.url);
      const r = await T.runMutant(mu, async (f) => (await suite(f, db.url, false)).results);
      if (!r) { top("control '" + mu.name + "': the mutation applies", false, "text not found in " + mu.file); continue; }
      const caught = mu.fails.filter((n) => r.get(n) === false), ran = mu.fails.filter((n) => r.has(n));
      top("control '" + mu.name + "': its checks fail on the broken copy", ran.length === mu.fails.length && caught.length === mu.fails.length, "failed " + caught.length + "/" + mu.fails.length + (ran.length < mu.fails.length ? " (did not run: " + (mu.fails.length - ran.length) + ")" : ""));
    }
  } finally {
    if (allowDb) await allowDb.end();
    db.stop();
  }
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.log("FAIL check crashed (INVALID run): " + String(e && e.stack).slice(0, 400)); process.exit(1); });
