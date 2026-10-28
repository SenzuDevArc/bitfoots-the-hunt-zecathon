"use strict";
const fs = require("fs");
const path = require("path");
const pgLocal = require("./pg-local.js");
const T = require("./api-lib.js");
const { DIR, Pool, OWNER_DID, browser, signIn, pid } = T;

const WEBHOOK = "https://discord.com/api/webhooks/123456789/test-only-token";
const PROXY_KEY = "test-only-proxy-key-" + require("crypto").randomBytes(8).toString("hex");
const CAP_CHECK = "events: no daily cap: with 2,500 events already stored today, a player's next batch is still stored whole";
const BURST_CHECK = "events: the per-player limit stays: the 61st batch inside 10 minutes is refused with 429";
const CEIL_CHECK = "events: storage ceiling: a player at 50,000 stored events who sends 10 more keeps 50,000: the 10 new ones stay, the 10 oldest go";
const PENDING_CHECK = "forget with a request waiting: signing in again and asking at once gets the cooldown, no new request is stored and the owner is not pinged again";
const OVERLAP_CHECK = "rate limits across an overlapping deploy: a new server that started before the old one saved still refuses a player at the events limit, and the saved counters are cleared";
const RESTART_CHECK ="rate limits survive a restart: a player at the events limit is still refused (429) after a graceful restart, and the saved counters are cleared once loaded";

async function suite(file, dbUrl, log) {
  const results = new Map();
  const check = (name, ok, detail) => {
    results.set(name, !!ok);
    if (log) console.log((ok ? "PASS " : "FAIL ") + name + (detail !== undefined && detail !== "" ? "  [" + (typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300) + "]" : ""));
  };
  const port = await T.freePort();
  const env = { DISCORD_WEBHOOK_URL: WEBHOOK, TRAIL_PROXY_KEY: PROXY_KEY };
  const srv = T.startApi(file, port, dbUrl, env);
  const servers = [srv];
  let live = srv;
  if (!(await T.waitUp(srv))) { check("server starts", false, (srv.out + srv.err).slice(-300)); await T.stop(srv); return results; }
  const db = new Pool({ connectionString: dbUrl, max: 2 });
  const count = async (sql, args) => (await db.query(sql, args)).rows[0].n;
  try {
    const Own = browser(port); await signIn(Own, OWNER_DID, { code: "owner-mfa" });
    const OwnNo = browser(port); await signIn(OwnNo, OWNER_DID, { code: "owner-nomfa" });
    const anon = browser(port);
    const SDID = "300000000000000011", St = browser(port);
    await signIn(St, SDID, { code: "mfa-" + SDID, headers: { "User-Agent": "test-agent/1" } });
    const OWNER_GETS = ["/api/owner/requests", "/api/owner/players", "/api/owner/events", "/api/owner/audit"];
    const denyAll = async (b, want, says) => {
      const out = [];
      for (const p of OWNER_GETS) out.push((await b.get(p)).status === want);
      for (const p of ["/api/owner/requests/00000000-0000-4000-8000-000000000000/approve", "/api/owner/requests/00000000-0000-4000-8000-000000000000/deny", "/api/owner/players/" + SDID + "/revoke"])
        out.push((await b.post(p)).status === want);
      for (const p of ["/api/owner/", "/api/owner"]) {
        const r = await b.get(p);
        out.push(want === 401 ? r.status === 302 && r.headers.location === "/api/auth/discord?next=/api/owner/" : r.status === 403 && says.test(r.text) && !/owner\.js|request/i.test(r.text));
      }
      for (const p of ["/api/owner/owner.js", "/api/owner/owner.css"]) out.push((await b.get(p)).status === 404);
      return out;
    };
    const sAnon = await denyAll(anon, 401), sSt = await denyAll(St, 403, /only for the game's owner/), sNo = await denyAll(OwnNo, 403, /needs two-factor/);
    check("owner routes: refused signed out (401; the page sends you to Discord sign-in, its files 404)", sAnon.every(Boolean), sAnon);
    const back = await signIn(browser(port), OWNER_DID, { code: "owner-mfa", next: "/api/owner/" });
    check("owner sign-in from the owner page comes back to the owner page", back.cb.status === 302 && back.cb.headers.location === "/api/owner/", back.cb.headers.location);
    check("owner routes: refused for a signed-in non-owner (403; the page says it is owner-only)", sSt.every(Boolean), sSt);
    check("owner routes: refused for the owner signed in without Discord 2FA (the page says to turn it on)", sNo.every(Boolean), sNo);
    const srcNow = fs.readFileSync(file, "utf8");
    const ownerRoutes = [...srcNow.matchAll(/\{ re: [^\n]*kind: "owner", m: \{ (GET|POST): ([^}]+) \} \}/g)].map((m) => m[2].trim());
    const firstIsCheck = (h) => {
      const name = /ownerPage\(/.test(h) ? "ownerPage" : h;
      const body = new RegExp("async function " + name + "\\(req, res[^)]*\\) \\{\\n  const o = await ownerOrDeny\\(req, res(, true|, file === \"index\\.html\" \\? \"signin\" : true)?\\); if \\(!o\\) return;").test(srcNow);
      return /^[A-Za-z]+$|^\(req, res\) => ownerPage\(req, res, "index\.html"\)$/.test(h) && body;
    };
    check("owner routes: every owner route's handler starts with the owner check", ownerRoutes.length >= 9 && ownerRoutes.every(firstIsCheck), ownerRoutes.filter((h) => !firstIsCheck(h)).concat(["n=" + ownerRoutes.length]));
    const okGets = [];
    for (const p of OWNER_GETS) okGets.push((await Own.get(p)).status);
    check("owner routes (control): the owner with 2FA gets every list", okGets.every((s) => s === 200), okGets);
    const page = await Own.get("/api/owner/"), js = await Own.get("/api/owner/owner.js");
    check("owner page: served to the owner, no inline script, its script a separate file", page.status === 200 && /text\/html/.test(page.headers["content-type"] || "")
      && /<script src="\/api\/owner\/owner\.js"><\/script>/.test(page.text) && !/<script>|<script [^>]*>[^<]/.test(page.text.replace(/<script src="[^"]+"><\/script>/g, ""))
      && js.status === 200 && /javascript/.test(js.headers["content-type"] || ""), [page.status, js.status]);
    check("headers: the API sends Strict-Transport-Security", /max-age=\d{7,}/.test(String(page.headers["strict-transport-security"] || "")), page.headers["strict-transport-security"]);

    const sRow = (await db.query("SELECT s.id, s.ended_at, s.ip_hash, s.ua_hash FROM trail_sessions s JOIN trail_players p ON p.id = s.player_id WHERE p.discord_id = $1", [SDID]).catch(() => ({ rows: [] }))).rows;
    check("sessions: a stranger's sign-in writes one open session row with hashed address and agent", sRow.length === 1 && sRow[0].ended_at === null && /^[A-Za-z0-9_-]{16,}$/.test(sRow[0].ip_hash || "") && /^[A-Za-z0-9_-]{16,}$/.test(sRow[0].ua_hash || ""), sRow);

    const rq = await St.post("/api/access/request");
    await T.until(() => /FAKE-WEBHOOK/.test(srv.err), 3000);
    await T.sleep(200);
    const st1 = await St.get("/api/access/status");
    check("access: a request is stored and reported as sent", (rq.status === 201 || rq.status === 200) && st1.json && st1.json.request && st1.json.request.status === "pending" && st1.json.request.sent === true, [rq.status, st1.json]);
    check("webhook: the owner's notification went out once, with no id and no pings", (srv.err.match(/FAKE-WEBHOOK clean/g) || []).length === 1 && !/FAKE-WEBHOOK unclean/.test(srv.err), (srv.err.match(/FAKE-WEBHOOK \w+/g) || []).join(","));
    const list = await Own.get("/api/owner/requests");
    const mine = list.json && Array.isArray(list.json.requests) ? list.json.requests.find((r) => r.discordId === SDID) : null;
    check("owner: the pending request is listed with the name the person signed in with", !!mine && mine.status === "pending" && mine.displayName === "Player 0011" && mine.username === "p0011", mine);
    const rid = mine ? mine.id : "00000000-0000-4000-8000-000000000000";
    const self = await St.post("/api/owner/requests/" + rid + "/approve");
    const stillPending = await count("SELECT count(*)::int AS n FROM trail_access_requests WHERE public_id = $1 AND status = 'pending'", [rid]).catch(() => -1);
    check("owner routes: a non-owner (with 2FA) approving their own request is refused and it stays pending", self.status === 403 && stillPending === 1 && (await St.get("/api/gate")).status === 302, [self.status, stillPending]);
    const a1 =await Own.post("/api/owner/requests/" + rid + "/approve"), a2 = await Own.post("/api/owner/requests/" + rid + "/approve");
    const al = await count("SELECT count(*)::int AS n FROM trail_allowlist WHERE discord_id = $1", [SDID]).catch(() => -1);
    const au = await count("SELECT count(*)::int AS n FROM trail_audit_log WHERE action = 'access.approve'").catch(() => -1);
    check("approve twice: one allowlist row, one audit row, the second answer says unchanged", a1.status === 200 && a2.status === 200 && a1.json.changed === true && a2.json.changed === false && al === 1 && au === 1, [a1.status, a2.status, al, au]);
    const d1 = await Own.post("/api/owner/requests/" + rid + "/deny");
    check("deny after approve changes nothing", d1.status === 200 && d1.json.changed === false && (await St.get("/api/gate")).status === 204, [d1.status, d1.json]);
    const xo = await Own.post("/api/owner/players/" + SDID + "/revoke", {}, { origin: "https://evil.example" });
    check("owner writes: a cross-origin POST is 403 and changes nothing", xo.status === 403 && (await St.get("/api/gate")).status === 204, xo.status);

    const ev = { events: [{ id: "evt-aaaa1111", type: "level_start", level: 1 }, { id: "evt-aaaa2222", type: "level_fail", level: 1, data: { reason: "caught", secs: 12 } }] };
    const e1 = await St.post("/api/events", ev), e2 = await St.post("/api/events", ev);
    const en = await count("SELECT count(*)::int AS n FROM trail_events e JOIN trail_players p ON p.id = e.player_id WHERE p.discord_id = $1 AND e.client_event_id IN ('evt-aaaa1111', 'evt-aaaa2222')", [SDID]).catch(() => -1);
    check("events: a replayed batch (same client ids) is stored once", e1.status === 200 && e2.status === 200 && en === 2 && e2.json.accepted === 0, [e1.status, e2.status, en, e2.json]);
    const bad = [
      await St.post("/api/events", { events: [{ id: "evt-bbbb1111", type: "wallet_set", level: 1 }] }),
      await St.post("/api/events", { events: [{ id: "x", type: "level_start", level: 1 }] }),
      await St.post("/api/events", { events: [{ id: "evt-bbbb2222", type: "level_start", level: 999 }] }),
      await St.post("/api/events", { events: [{ id: "evt-bbbb3333", type: "level_start", level: 1, data: { a: { deep: 1 } } }] }),
      await St.post("/api/events", { events: new Array(51).fill(0).map((_, i) => ({ id: "evt-cccc" + String(1000 + i), type: "level_start", level: 1 })) }),
    ];
    check("events: an unknown type, a bad id, a bad level, nested data and an oversized batch are 400", bad.every((r) => r.status === 400), bad.map((r) => r.status));
    const evAnon = await anon.post("/api/events", ev);
    const U = browser(port), UDID = "300000000000000012"; await signIn(U, UDID);
    const evU = await U.post("/api/events", { events: [{ id: "evt-dddd1111", type: "level_start", level: 1 }] });
    check("events: refused signed out and for a signed-in person not approved", evAnon.status === 401 && evU.status === 401, [evAnon.status, evU.status]);

    const s1 = { v: 3, stars: { 1: 2 }, best: { 1: 50 }, bestZec: { 1: 2 }, wallet: 2, cos: { owned: {} } };
    const p1 = await St.put("/api/save", { save: s1, base: null, pid: pid() });
    const s2 = JSON.parse(JSON.stringify((p1.json && p1.json.save) || s1)); s2.stars[2] = 3; s2.best[2] = 41.5; s2.bestZec[2] = 3; s2.wallet += 3;
    const repeatPid = pid();
    const p2 = await St.put("/api/save", { save: s2, base: p1.json ? { gen: p1.json.gen, rev: p1.json.rev } : null, pid: repeatPid });
    await St.put("/api/save", { save: s2, base: p1.json ? { gen: p1.json.gen, rev: p1.json.rev } : null, pid: repeatPid });
    const St2 = browser(port); await signIn(St2, SDID);
    await St2.put("/api/save", { save: s2, base: null, pid: pid() });
    const lf = (await db.query("SELECT e.level, e.detail FROM trail_events e JOIN trail_players p ON p.id = e.player_id WHERE p.discord_id = $1 AND e.type = 'level_finished' AND e.level = 2", [SDID]).catch(() => ({ rows: [] }))).rows;
    check("save diff: finishing level 2 writes one level_finished event (stars, time), not again on a retry or another device", p2.status === 200 && lf.length === 1 && lf[0].detail.stars === 3 && lf[0].detail.time === 41.5, [p2.status, lf]);
    const s3 = JSON.parse(JSON.stringify(s2)); s3.badges = { sweep: { 2: true } }; s3.trail = { endings: { safe: true } };
    const g3 = (await St.get("/api/save")).json;
    await St.put("/api/save", { save: s3, base: g3 ? { gen: g3.gen, rev: g3.rev } : null, pid: pid() });
    const kinds = (await db.query("SELECT e.type, count(*)::int AS n FROM trail_events e JOIN trail_players p ON p.id = e.player_id WHERE p.discord_id = $1 GROUP BY 1", [SDID]).catch(() => ({ rows: [] }))).rows;
    const k = Object.fromEntries(kinds.map((r) => [r.type, r.n]));
    check("save diff: a new badge and an ending are one event each", k.badge_earned === 1 && k.ending_reached === 1, k);
    const evList = await Own.get("/api/owner/events?player=" + SDID);
    const pl = await Own.get("/api/owner/players");
    const me = pl.json && Array.isArray(pl.json.players) ? pl.json.players.find((p) => p.discordId === SDID) : null;
    check("owner: players list shows who is who with stats; events list shows the events", evList.status === 200 && evList.json.events.length >= 5 && !!me && me.displayName === "Player 0011"
      && me.access === "allowed" && me.levels === 2 && me.stars === 5 && me.sessions >= 2 && me.events >= 5 && !!me.lastSession && me.lastSession.ended === "open", [evList.status, me]);

    const r1 = await Own.post("/api/owner/players/" + SDID + "/revoke"), r2 = await Own.post("/api/owner/players/" + SDID + "/revoke");
    const ru = await count("SELECT count(*)::int AS n FROM trail_audit_log WHERE action = 'access.revoke'").catch(() => -1);
    check("revoke twice: locked out at the next request, one audit row", r1.status === 200 && r2.status === 200 && r1.json.changed === true && r2.json.changed === false && ru === 1 && (await St.get("/api/gate")).status === 302, [r1.status, r2.status, ru]);

    const Ukeep = U.jar.get("bt_s");
    await U.post("/api/logout");
    const Uold = browser(port); Uold.jar.set("bt_s", Ukeep || "x");
    const uSt = await Uold.get("/api/access/status");
    const uEnd = (await db.query("SELECT s.ended_at, s.ended_by FROM trail_sessions s JOIN trail_players p ON p.id = s.player_id WHERE p.discord_id = $1", [UDID]).catch(() => ({ rows: [] }))).rows;
    check("logout: an unapproved person's session row ends and their old cookie is signed out", uEnd.length === 1 && uEnd[0].ended_at !== null && uEnd[0].ended_by === "logout" && uSt.json && uSt.json.user === null, [uEnd, uSt.json]);

    const FDID = "300000000000000013", F = browser(port);
    await signIn(F, FDID); await F.post("/api/access/request");
    const fr = ((await Own.get("/api/owner/requests")).json || { requests: [] }).requests.find((r) => r.discordId === FDID);
    if (fr) await Own.post("/api/owner/requests/" + fr.id + "/approve");
    await F.put("/api/save", { save: { v: 3, stars: { 1: 3 }, best: { 1: 30 }, bestZec: { 1: 3 }, wallet: 3, cos: { owned: {} } }, base: null, pid: pid() });
    await F.post("/api/events", { events: [{ id: "evt-ffff1111", type: "level_quit", level: 1 }] });
    const keepF = F.jar.get("bt_s");
    const fg = await F.post("/api/forget");
    const cleared = ["bt_s", "bt_o"].every((n) => fg.setCookie.some((c) => c.startsWith(n + "=") && /Max-Age=0\b/.test(c)));
    const tables = (await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name LIKE 'trail\\_%' AND table_name <> 'trail_schema_migrations'")).rows.map((r) => r.table_name);
    const naming = [];
    for (const t of tables) {
      const n = await count("SELECT count(*)::int AS n FROM " + t + " x WHERE to_jsonb(x)::text ~ $1", ["(" + FDID + "|Player 0013|p0013)"]);
      if (n) naming.push(t + ":" + n);
    }
    const fa = (await db.query("SELECT actor, target, detail FROM trail_audit_log WHERE action = 'player.forget'").catch(() => ({ rows: [] }))).rows;
    check("forget: zero rows name the person in any trail_ table; one pseudonymous audit row; every cookie cleared", fg.status === 200 && tables.length >= 7 && naming.length === 0
      && fa.length === 1 && /^p:[A-Za-z0-9_-]{16,}$/.test(fa[0].target) && cleared, [fg.status, tables.length, naming, fa, cleared]);
    const Fold = browser(port); Fold.jar.set("bt_s", keepF || "x");
    const fGate = await Fold.get("/api/gate");
    check("forget: the pre-forget cookie is refused by the gate", fGate.status === 302, fGate.status);

    const findReq = async (did) => ((await Own.get("/api/owner/requests")).json || { requests: [] }).requests.find((r) => r.discordId === did);
    const MDID = "300000000000000015", M = browser(port);
    await signIn(M, MDID); await M.post("/api/access/request");
    const mr = await findReq(MDID);
    const md = mr ? await Own.post("/api/owner/requests/" + mr.id + "/deny") : null;
    await M.post("/api/forget");
    await signIn(M, MDID);
    const mAgain = await M.post("/api/access/request"), mStatus = await M.get("/api/access/status");
    const mRows = await count("SELECT count(*)::int AS n FROM trail_access_requests WHERE discord_id = $1", [MDID]);
    check("forget after a denial: signing in again and asking at once gets the cooldown, and no new request is stored", !!md && md.status === 200 && mAgain.status === 429 && mAgain.json && mAgain.json.error === "cooldown"
      && mStatus.json && mStatus.json.request && mStatus.json.request.status === "denied" && mRows === 0, [md && md.status, mAgain.status, mAgain.json, mStatus.json && mStatus.json.request, mRows]);

    const pings = () => (srv.err.match(/FAKE-WEBHOOK/g) || []).length;
    const WDID = "300000000000000019", W = browser(port);
    await signIn(W, WDID);
    const pingsBefore = pings();
    const w1 = await W.post("/api/access/request");
    await T.until(() => pings() > pingsBefore, 3000); await T.sleep(300);
    const pings0 = pings();
    await W.post("/api/forget");
    await signIn(W, WDID);
    const w2 = await W.post("/api/access/request"), wStatus = await W.get("/api/access/status");
    await T.sleep(500);
    const wRows = await count("SELECT count(*)::int AS n FROM trail_access_requests WHERE discord_id = $1", [WDID]);
    check(PENDING_CHECK, w1.status === 201 && w2.status === 429 && w2.json && w2.json.error === "cooldown" && wRows === 0 && pings() === pings0
      && wStatus.json && wStatus.json.request && wStatus.json.request.status === "recent", [w1.status, w2.status, w2.json, wRows, pings0, pings(), wStatus.json && wStatus.json.request]);
    const wTomb = await db.query("UPDATE trail_access_tombstones SET last_decided_at = now() - interval '2 hours' WHERE denials = 0 AND expires_at < now() + interval '2 hours'");
    const w3 = await W.post("/api/access/request");
    check("forget with a request waiting (control): once the hour is over the same person can ask again", wTomb.rowCount === 1 && w3.status === 201, [wTomb.rowCount, w3.status]);

    const NDID = "300000000000000016", N = browser(port);
    const au0 = await count("SELECT coalesce(max(id), 0)::int AS n FROM trail_audit_log");
    await signIn(N, NDID); await N.post("/api/access/request");
    const nr = await findReq(NDID);
    if (nr) await Own.post("/api/owner/requests/" + nr.id + "/approve");
    const au1 = await count("SELECT coalesce(max(id), 0)::int AS n FROM trail_audit_log");
    const oldTargets = (await db.query("SELECT DISTINCT target FROM trail_audit_log WHERE id > $1 AND id <= $2", [au0, au1])).rows.map((r) => r.target);
    await N.post("/api/forget");
    await signIn(N, NDID); await N.post("/api/access/request");
    const newTarget = ((await db.query("SELECT target FROM trail_audit_log WHERE action = 'access.request' ORDER BY id DESC LIMIT 1")).rows[0] || {}).target;
    const auditRows = ((await Own.get("/api/owner/audit")).json || { audit: [] }).audit;
    const oldShown = auditRows.filter((r) => oldTargets.includes(r.target)), newShown = auditRows.filter((r) => r.target === newTarget);
    check("forget: the person's earlier audit rows can no longer be tied to them, even after they sign up again", oldTargets.length >= 1 && oldShown.length >= 2 && oldShown.every((r) => r.who === null)
      && !!newTarget && !oldTargets.includes(newTarget) && newShown.length === 1 && newShown[0].who === "Player 0016", [oldTargets.length, oldShown.map((r) => r.who), newShown.map((r) => r.who), oldTargets.includes(newTarget)]);

    const RDID = "300000000000000017", R = browser(port);
    await db.query("INSERT INTO trail_allowlist (discord_id, added_by) VALUES ($1, 'test')", [RDID]);
    await signIn(R, RDID);
    const rKeep = R.jar.get("bt_s"), rg0 = await R.get("/api/gate");
    const rv = await Own.post("/api/owner/players/" + RDID + "/revoke");
    await db.query("UPDATE trail_allowlist SET revoked_at = NULL, revoked_by = NULL WHERE discord_id = $1", [RDID]);
    const Rold = browser(port); Rold.jar.set("bt_s", rKeep || "x");
    const rg1 = await Rold.get("/api/gate");
    const Rnew = browser(port); await signIn(Rnew, RDID);
    const rg2 = await Rnew.get("/api/gate");
    check("revoke: the cookie the person had stays dead after a re-approval; a fresh sign-in gets in", rg0.status === 204 && rv.status === 200 && rg1.status === 302 && rg2.status === 204, [rg0.status, rv.status, rg1.status, rg2.status]);

    const CDID = "300000000000000018", Cp = browser(port);
    await db.query("INSERT INTO trail_allowlist (discord_id, added_by) VALUES ($1, 'test')", [CDID]);
    await signIn(Cp, CDID);
    const cpid = ((await db.query("SELECT id FROM trail_players WHERE discord_id = $1", [CDID])).rows[0] || {}).id;
    await db.query("INSERT INTO trail_events (player_id, type, level, client_event_id) SELECT $1, 'level_start', 1, 'seed-' || g FROM generate_series(1, 2500) g", [cpid]);
    const capBatch = (tag) => ({ events: Array.from({ length: 10 }, (_, i) => ({ id: "evt-" + tag + String(1000 + i), type: "level_start", level: 1 })) });
    const own = { headers: { "X-Bf-Client-Ip": "192.0.2.50", "X-Bf-Proxy-Key": PROXY_KEY } };
    const c1 = await Cp.post("/api/events", capBatch("capa"), own);
    const capStored = await count("SELECT count(*)::int AS n FROM trail_events WHERE player_id = $1 AND client_event_id LIKE 'evt-cap%'", [cpid]);
    check(CAP_CHECK, capStored === 10 && c1.status === 200 && c1.json && c1.json.accepted === 10, [capStored, c1.status, c1.json]);
    const one = (i) => ({ events: [{ id: "evt-burst" + String(1000 + i), type: "level_start", level: 1 }] });
    const burst = [];
    for (let i = 0; i < 60; i++) burst.push((await Cp.post("/api/events", one(i), own)).status);
    check(BURST_CHECK, burst.slice(0, 59).every((s) => s === 200) && burst[59] === 429, burst.join(""));
    const KDID = "300000000000000010", Kp = browser(port), KEEP = require(path.join(DIR, "store.js")).EVENTS_PER_PLAYER;
    await db.query("INSERT INTO trail_allowlist (discord_id, added_by) VALUES ($1, 'test')", [KDID]);
    await signIn(Kp, KDID);
    const kpid = ((await db.query("SELECT id FROM trail_players WHERE discord_id = $1", [KDID])).rows[0] || {}).id;
    await db.query("INSERT INTO trail_events (player_id, type, level, client_event_id, at) SELECT $1, 'level_start', 1, 'seed-' || g, now() - interval '30 days' + g * interval '1 second' FROM generate_series(1, $2::int) g", [kpid, KEEP]);
    await db.query("UPDATE trail_players SET events_count = $2 WHERE id = $1", [kpid, KEEP]);
    const k1 = await Kp.post("/api/events", capBatch("ceil"), own);
    const kAll = await count("SELECT count(*)::int AS n FROM trail_events WHERE player_id = $1", [kpid]);
    const kNew = await count("SELECT count(*)::int AS n FROM trail_events WHERE player_id = $1 AND client_event_id LIKE 'evt-ceil%'", [kpid]);
    const kGone = await count("SELECT count(*)::int AS n FROM trail_events WHERE player_id = $1 AND client_event_id IN ('seed-1', 'seed-10')", [kpid]);
    const kNext = await count("SELECT count(*)::int AS n FROM trail_events WHERE player_id = $1 AND client_event_id = 'seed-11'", [kpid]);
    const kCnt = await count("SELECT events_count AS n FROM trail_players WHERE id = $1", [kpid]);
    check(CEIL_CHECK, KEEP === 50000 && k1.status === 200 && kAll === KEEP && kNew === 10 && kGone === 0 && kNext === 1 && kCnt === KEEP, [KEEP, k1.status, kAll, kNew, kGone, kNext, kCnt]);
    const OwnKeep = Own.jar.get("bt_s"), OwnF = browser(port);
    await signIn(OwnF, OWNER_DID, { code: "owner-mfa" });
    await OwnF.post("/api/forget");
    await signIn(browser(port), OWNER_DID, { code: "owner-mfa" });
    const Oold = browser(port); Oold.jar.set("bt_s", OwnKeep || "x");
    const oGate = await Oold.get("/api/gate");
    check("forget: the owner's pre-forget cookie is refused by the gate, even after signing in again", oGate.status === 302, oGate.status);

    const upd = await db.query("UPDATE trail_audit_log SET action = 'x'").then(() => "updated", (e) => e.code || "error");
    const del = await db.query("DELETE FROM trail_audit_log").then(() => "deleted", (e) => e.code || "error");
    check("audit log: UPDATE and DELETE are refused by the database", upd !== "updated" && del !== "deleted" && upd !== "42P01", [upd, del]);

    const V = "300000000000000014", hashOf = async () => (await db.query("SELECT s.ip_hash FROM trail_sessions s JOIN trail_players p ON p.id = s.player_id WHERE p.discord_id = $1 ORDER BY s.id DESC LIMIT 1", [V]).catch(() => ({ rows: [] }))).rows.map((r) => r.ip_hash)[0];
    await signIn(browser(port), V, { headers: { "X-Bf-Client-Ip": "203.0.113.7" } }); const h1 = await hashOf();
    await signIn(browser(port), V, { headers: { "X-Bf-Client-Ip": "198.51.100.9" } }); const h2 = await hashOf();
    await signIn(browser(port), V, { headers: { "X-Bf-Client-Ip": "198.51.100.9", "X-Bf-Proxy-Key": PROXY_KEY } }); const h3 = await hashOf();
    check("client address: the header is ignored without the proxy key and used with it", !!h1 && h1 === h2 && !!h3 && h3 !== h2, [h1, h2, h3]);

    await T.stopGracefully(live);
    const saved = (await db.query("SELECT name, key FROM trail_rate_snapshot").catch(() => ({ rows: [] }))).rows;
    const rawKeys = saved.filter((r) => /\d+\.\d+\.\d+\.\d+|:|\d{15,}/.test(r.key));
    check("rate limits: the saved counters hold no raw address or Discord id", saved.length >= 3 && rawKeys.length === 0, [saved.length, rawKeys.slice(0, 3)]);
    live = T.startApi(file, port, dbUrl, env); servers.push(live);
    const upB = await T.waitUp(live);
    const afterRestart = await Cp.post("/api/events", one(900), own);
    const leftB = await count("SELECT count(*)::int AS n FROM trail_rate_snapshot").catch(() => -1);
    check(RESTART_CHECK, upB && afterRestart.status === 429 && leftB === 0, [upB, afterRestart.status, leftB]);
    await T.crash(live);
    live = T.startApi(file, port, dbUrl, env); servers.push(live);
    const upC = await T.waitUp(live);
    const afterCrash = await Cp.post("/api/events", one(901), own);
    check("rate limits (control): after a crash, when nothing was saved, the same player is let through again", upC && afterCrash.status === 200, [upC, afterCrash.status]);
    const refill = [];
    for (let i = 0; i < 60; i++) refill.push((await Cp.post("/api/events", one(2000 + i), own)).status);
    const port2 = await T.freePort();
    const next = T.startApi(file, port2, dbUrl, Object.assign({ TRAIL_RATE_RECHECK_MS: "6000,9000" }, env)); servers.push(next);
    const upN = await T.waitUp(next);
    const Cp2 = browser(port2); for (const [k, v] of Cp.jar) Cp2.jar.set(k, v);
    const early = await Cp2.post("/api/events", one(3000), own);
    await T.stopGracefully(live);
    const savedN = await count("SELECT count(*)::int AS n FROM trail_rate_snapshot").catch(() => -1);
    live = next;
    await T.until(() => /rate limits restored=/.test(next.out), 15000);
    const lateN = await Cp2.post("/api/events", one(3001), own);
    const leftN = await count("SELECT count(*)::int AS n FROM trail_rate_snapshot").catch(() => -1);
    check(OVERLAP_CHECK, upN && refill[refill.length - 1] === 429 && early.status === 200 && savedN >= 1 && lateN.status === 429 && leftN === 0,
      [upN, refill[refill.length - 1], early.status, savedN, lateN.status, leftN]);
  } catch (e) {
    check("suite ran to the end", false, String(e && e.stack).slice(0, 300));
  } finally { await db.end(); }
  await T.stop(live);
  const logs = servers.map((s) => s.out + s.err).join("");
  check("logs: no Discord id, no secret, no webhook URL", !/30000000000000001\d/.test(logs) && !logs.includes(T.SECRETS.SESSION_SECRET) && !logs.includes("test-only-token") && !logs.includes(PROXY_KEY));
  return results;
}

const MUTANTS = [
  { name: "owner check removed from the approve handler", file: "server.js", from: "async function ownerApprove(req, res, id) {\n  const o = await ownerOrDeny(req, res); if (!o) return;", to: "async function ownerApprove(req, res, id) {\n  const o = { did: \"\" };",
    fails: ["owner routes: a non-owner (with 2FA) approving their own request is refused and it stays pending", "owner routes: refused for a signed-in non-owner (403; the page says it is owner-only)",
      "owner routes: every owner route's handler starts with the owner check"] },
  { name: "owner check removed from the deny handler", file: "server.js", from: "async function ownerDeny(req, res, id) {\n  const o = await ownerOrDeny(req, res); if (!o) return;", to: "async function ownerDeny(req, res, id) {\n  const o = { did: \"\" };",
    fails: ["owner routes: refused for a signed-in non-owner (403; the page says it is owner-only)", "owner routes: every owner route's handler starts with the owner check"] },
  { name: "owner check accepts any signed-in person", file: "server.js", from: "if (m.did !== OWNER || !OWNER) return no(403", to: "if (false) return no(403",
    fails: ["owner routes: refused for a signed-in non-owner (403; the page says it is owner-only)", "owner routes: a non-owner (with 2FA) approving their own request is refused and it stays pending"] },
  { name: "2FA not required for the owner", file: "server.js", from: "if (m.user.mfa !== true)", to: "if (false)",
    fails: ["owner routes: refused for the owner signed in without Discord 2FA (the page says to turn it on)"] },
  { name: "a decided request can be decided again", file: "store.js", from: "if (row.status !== \"pending\") return", to: "if (false) return",
    fails: ["approve twice: one allowlist row, one audit row, the second answer says unchanged", "deny after approve changes nothing"] },
  { name: "event replay stored twice", file: "store.js", from: "ON CONFLICT (player_id, client_event_id) DO NOTHING", to: "ON CONFLICT (id) DO NOTHING",
    fails: ["events: a replayed batch (same client ids) is stored once"] },
  { name: "forget skips the access requests", file: "store.js", from: "DELETE FROM trail_access_requests WHERE discord_id = $1", to: "SELECT $1::text",
    fails: ["forget: zero rows name the person in any trail_ table; one pseudonymous audit row; every cookie cleared"] },
  { name: "gate ignores when the player row was made", file: "server.js", from: "if (user.iat < Number(r.made)) return { user: null };", to: "",
    fails: ["forget: the owner's pre-forget cookie is refused by the gate, even after signing in again"] },
  { name: "a save write records no events", file: "server.js", from: "const evs = ST.diffEvents(", to: "const evs = [] || ST.diffEvents(",
    fails: ["save diff: finishing level 2 writes one level_finished event (stars, time), not again on a retry or another device"] },
  { name: "forget leaves no record of a denial", file: "store.js", from: "WHERE h.denials > 0 OR h.revoked_at IS NOT NULL OR h.asked_at IS NOT NULL", to: "WHERE h.asked_at IS NOT NULL",
    fails: ["forget after a denial: signing in again and asking at once gets the cooldown, and no new request is stored"] },
  { name: "forget leaves no record of a waiting request", file: "store.js", from: "OR h.revoked_at IS NOT NULL OR h.asked_at IS NOT NULL\"", to: "OR h.revoked_at IS NOT NULL\"",
    fails: [PENDING_CHECK] },
  { name: "no storage ceiling per player", file: "store.js", from: "if (total && total.events_count > EVENTS_PER_PLAYER) {", to: "if (false) {",
    fails: [CEIL_CHECK] },
  { name: "saved limits are read only once at boot", file: "server.js", from: "for (const d of RATE_RECHECK_MS) recheckTimers.push(", to: "for (const d of []) recheckTimers.push(",
    fails: [OVERLAP_CHECK] },
  { name: "audit pseudonym ignores the per-person salt", file: "server.js", from: "hash22(PSEUDO_KEY, did + \":\" + salt)", to: "hash22(PSEUDO_KEY, did)",
    fails: ["forget: the person's earlier audit rows can no longer be tied to them, even after they sign up again"] },
  { name: "revoke does not cut cookies", file: "store.js", from: "SET session_cut = GREATEST(session_cut, to_timestamp($2::double precision / 1000)) WHERE discord_id = $1",
    to: "SET session_cut = session_cut WHERE discord_id = $1 AND $2::double precision IS NOT NULL",
    fails: ["revoke: the cookie the person had stays dead after a re-approval; a fresh sign-in gets in"] },
  { name: "no per-player event limit", file: "server.js", from: "events: L(60, 10 * MIN)", to: "events: L(1e9, 10 * MIN)",
    fails: [BURST_CHECK] },
  { name: "limits not saved on shutdown", file: "server.js", from: "await saveLimits();", to: "",
    fails: [RESTART_CHECK] },
  { name: "proxy key not checked", file: "server.js", from: "PROXY_KEY !== \"\" && safeEqual(", to: "true || safeEqual(",
    fails: ["client address: the header is ignored without the proxy key and used with it"] },
];

async function main() {
  let passed = 0, failed = 0;
  const top = (name, ok, detail) => { if (ok) passed++; else failed++; console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + String(detail).slice(0, 300) + "]" : "")); };
  const db = await pgLocal.start();
  if (!db.ok) { console.log("FAIL postgres could not start (INVALID run): " + db.why); process.exit(1); }
  console.log("postgres: " + db.version + " (throwaway cluster, loopback)");
  try {
    await T.foreignFixture(db.url);
    const before = await T.foreignSnapshot(db.url);
    const real = await suite(path.join(DIR, "server.js"), db.url, true);
    for (const ok of real.values()) { if (ok) passed++; else failed++; }
    top("shared database: the other app's allowlist, access_requests, audit_log and schema_migrations are byte-for-byte untouched", (await T.foreignSnapshot(db.url)) === before);
    if (process.env.TRAIL_CHECK_NO_MUTANTS !== "1") for (const mu of MUTANTS) {
      await T.resetDb(db.url);
      const r = await T.runMutant(mu, (f) => suite(f, db.url, false));
      if (!r) { top("control '" + mu.name + "': the mutation applies", false, "text not found in " + mu.file); continue; }
      const caught = mu.fails.filter((n) => r.get(n) === false), ran = mu.fails.filter((n) => r.has(n));
      top("control '" + mu.name + "': its checks fail on the broken copy", ran.length === mu.fails.length && caught.length === mu.fails.length, "failed " + caught.length + "/" + mu.fails.length);
    }
  } finally { db.stop(); }
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.log("FAIL check crashed (INVALID run): " + String(e && e.stack).slice(0, 400)); process.exit(1); });
