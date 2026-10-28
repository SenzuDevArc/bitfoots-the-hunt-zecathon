"use strict";
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const pgLocal = require("./pg-local.js");
const T = require("./api-lib.js");
const { DIR, Pool, browser, signIn } = T;

const SECRET = "test-only-bot-secret-" + crypto.randomBytes(8).toString("hex");
const PREFIX = "x-test-bot", BOT_PATH = "/bot/access-request";
const PROXY_KEY = "test-only-proxy-key-" + crypto.randomBytes(8).toString("hex");
const sign = (secret, ts, raw) => "sha256=" + crypto.createHmac("sha256", secret).update(ts + ".").update(raw).digest("hex");

function fakeBot(answer) {
  const got = [];
  const srv = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const ts = req.headers[PREFIX + "-timestamp"], sig = req.headers[PREFIX + "-signature"];
      got.push({ path: req.url, raw, signed: typeof ts === "string" && sig === sign(SECRET, ts, raw), body: (() => { try { return JSON.parse(raw); } catch (e) { return null; } })() });
      res.writeHead(answer.status); res.end("{}");
    });
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r({ srv, got, url: "http://127.0.0.1:" + srv.address().port })));
}

function decision(port, body, o) {
  o = o || {};
  const raw = JSON.stringify(body), ts = String(Math.floor(Date.now() / 1000) + (o.skew || 0));
  const h = { "Content-Type": "application/json", [PREFIX + "-timestamp"]: ts, [PREFIX + "-signature"]: sign(o.secret || SECRET, ts, raw) };
  return new Promise((resolve) => {
    const r = http.request({ host: "127.0.0.1", port, method: "POST", path: "/api/internal/access-decision", headers: h, agent: false }, (res) => {
      const c = []; res.on("data", (d) => c.push(d)); res.on("end", () => { let json = null; try { json = JSON.parse(Buffer.concat(c).toString()); } catch (e) {} resolve({ status: res.statusCode, json }); });
    });
    r.on("error", () => resolve({ status: 0, json: null }));
    r.end(raw);
  });
}

async function suite(file, dbUrl, log) {
  const results = new Map();
  const check = (name, ok, detail) => { results.set(name, !!ok); if (log) console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + JSON.stringify(detail).slice(0, 300) + "]" : "")); };
  const bot = await fakeBot({ status: 200 });
  const db = new Pool({ connectionString: dbUrl, max: 2 });
  const port = await T.freePort();
  const OLD = "300000000000000501";
  const srvA = T.startApi(file, port, dbUrl, { TRAIL_PROXY_KEY: PROXY_KEY, DISCORD_WEBHOOK_URL: null });
  try {
    if (!(await T.waitUp(srvA))) { check("server starts without the owner bot", false, (srvA.out + srvA.err).slice(-300)); return results; }
    const O = browser(port); await signIn(O, OLD); await O.post("/api/access/request");
    const before = (await db.query("SELECT notify FROM trail_access_requests WHERE discord_id = $1", [OLD])).rows[0];
    check("without the owner bot a request is saved with no alert", before && before.notify === "off", before);
  } finally { await T.stop(srvA); }

  const srv = T.startApi(file, port, dbUrl, { TRAIL_PROXY_KEY: PROXY_KEY, DISCORD_WEBHOOK_URL: null, OWNER_BOT_URL: bot.url + BOT_PATH, OWNER_BOT_SECRET: SECRET, OWNER_BOT_HEADER_PREFIX: PREFIX });
  try {
    if (!(await T.waitUp(srv))) { check("server starts with the owner bot", false, (srv.out + srv.err).slice(-300)); return results; }
    check("startup line says owner-bot=on", /owner-bot=on/.test(srv.out), srv.out.slice(-200));
    const DID = "300000000000000502", P = browser(port);
    await signIn(P, DID);
    const rq = await P.post("/api/access/request");
    check("asking to join answers 201", rq.status === 201, rq.status);
    const sent = await T.until(() => bot.got.some((g) => g.body && g.body.discordId === DID), 3000);
    const msg = bot.got.find((g) => g.body && g.body.discordId === DID);
    check("the request reaches the owner bot at once, signed, with the player's id", sent && msg.signed && msg.path === BOT_PATH && typeof msg.body.id === "string", msg);
    const st = await P.get("/api/access/status");
    check("after the bot took it the player sees 'Request sent'", st.json && st.json.request && st.json.request.sent === true, st.json);
    const oldSent = await T.until(() => bot.got.some((g) => g.body && g.body.discordId === OLD), 3000);
    check("a request saved before the bot was set up is sent too", oldSent);

    const id = msg.body.id;
    const forged = await decision(port, { id, discordId: DID, decision: "approve" }, { secret: "x".repeat(40) });
    check("an approve signed with the wrong key is refused (401) and changes nothing", forged.status === 401 && (await P.get("/api/access/status")).json.allowed === false, forged);
    const stale = await decision(port, { id, discordId: DID, decision: "approve" }, { skew: -900 });
    check("an approve signed 15 minutes ago is refused (401)", stale.status === 401, stale);
    const wrong = await decision(port, { id, discordId: "300000000000000999", decision: "approve" });
    check("an approve naming a different player is refused (409)", wrong.status === 409, wrong);
    const ok = await decision(port, { id, discordId: DID, decision: "approve" });
    check("the bot's approve is taken (200, changed)", ok.status === 200 && ok.json && ok.json.changed === true, ok);
    const st2 = await P.get("/api/access/status");
    check("after the bot's approve the player is in", st2.json && st2.json.allowed === true, st2.json);
    const again = await decision(port, { id, discordId: DID, decision: "deny" });
    check("a repeat or late deny keeps the first answer (200, not changed)", again.status === 200 && again.json.changed === false && again.json.decision === "approve", again);
    check("the player is still in after the repeat", (await P.get("/api/access/status")).json.allowed === true);

    const D2 = "300000000000000503", Q = browser(port); await signIn(Q, D2); await Q.post("/api/access/request");
    await T.until(() => bot.got.some((g) => g.body && g.body.discordId === D2), 3000);
    const id2 = bot.got.find((g) => g.body && g.body.discordId === D2).body.id;
    const no = await decision(port, { id: id2, discordId: D2, decision: "deny" });
    const st3 = await Q.get("/api/access/status");
    check("the bot's deny keeps the player out", no.status === 200 && st3.json.allowed === false && st3.json.request && st3.json.request.status === "denied", st3.json);
  } finally { await T.stop(srv); bot.srv.close(); await db.end(); }
  return results;
}

const MUTANTS = [
  { name: "signature not checked", file: "server.js", from: "if (!v.ok) return sendJson(res, 401, { error: v.why });", to: "",
    fails: ["an approve signed with the wrong key is refused (401) and changes nothing"] },
  { name: "player id not matched", file: "server.js", from: "if (did !== body.discordId) return", to: "if (false) return",
    fails: ["an approve naming a different player is refused (409)"] },
  { name: "requests saved without an alert never sent", file: "store.js", from: "status = 'pending' AND notify IN ('queued', 'off') ORDER BY", to: "status = 'pending' AND notify IN ('queued') ORDER BY",
    fails: ["a request saved before the bot was set up is sent too"] },
];

async function main() {
  let passed = 0, failed = 0;
  const top = (name, ok, detail) => { if (ok) passed++; else failed++; console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + String(detail).slice(0, 300) + "]" : "")); };
  const db = await pgLocal.start();
  if (!db.ok) { console.log("FAIL postgres could not start (INVALID run): " + db.why); process.exit(1); }
  try {
    const real = await suite(path.join(DIR, "server.js"), db.url, true);
    for (const ok of real.values()) { if (ok) passed++; else failed++; }
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
