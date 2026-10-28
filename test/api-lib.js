"use strict";
const { spawn } = require("child_process");
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const net = require("net");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "server", "api");
const FAKE = path.join(__dirname, "api-fake-discord.js");
const C = require(path.join(ROOT, "server", "lib", "common.js"));
const { Pool } = require(path.join(ROOT, "server", "node_modules", "pg"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OWNER_DID = "399999999999999999";

const SECRETS = {
  SESSION_SECRET: "test-only-trail-session-" + crypto.randomBytes(16).toString("hex"),
  DISCORD_CLIENT_SECRET: "test-only-discord-secret-" + crypto.randomBytes(8).toString("hex"),
  TRAIL_PROXY_KEY: "test-only-default-proxy-key-" + crypto.randomBytes(16).toString("hex"),
};
const SESSION_KEY = crypto.createHmac("sha256", Buffer.from(SECRETS.SESSION_SECRET, "utf8")).update("bf trail session v1").digest();

function freePort() { return new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); }); }); }
function startApi(file, port, dbUrl, extra) {
  const env = Object.assign({}, process.env, {
    PORT: String(port), NODE_OPTIONS: "--max-old-space-size=256 --require " + JSON.stringify(FAKE).slice(1, -1),
    PUBLIC_URL: "http://127.0.0.1:" + port, DISCORD_CLIENT_ID: "123456789012345678", DATABASE_URL: dbUrl, TRAIL_API_DEBUG_ERRORS: "1",
    OWNER_DISCORD_ID: OWNER_DID, TRAIL_FAKE_OWNER: OWNER_DID, TRAIL_ALL_CHARS_DISCORD_IDS: "300000000000000077, not-an-id",
  }, SECRETS, extra || {});
  for (const k of Object.keys(env)) if (env[k] === null) delete env[k];
  const child = spawn(process.execPath, [file], { env, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  const srv = { port, child, out: "", err: "", exited: false };
  child.stdout.on("data", (d) => { srv.out += d; });
  child.stderr.on("data", (d) => { srv.err += d; });
  child.on("exit", (code) => { srv.exited = true; srv.code = code; });
  return srv;
}
async function waitUp(srv) { for (let i = 0; i < 150; i++) { if (srv.exited) return false; if (/listening on/.test(srv.out)) return true; await sleep(100); } return false; }
function stop(srv) { return new Promise((r) => { if (srv.exited) return r(); srv.child.once("exit", () => r()); srv.child.kill("SIGTERM"); setTimeout(() => { try { srv.child.kill("SIGKILL"); } catch (e) {} r(); }, 4000); }); }
function stopGracefully(srv) {
  return new Promise((r) => {
    if (srv.exited) return r();
    srv.child.once("exit", () => r());
    if (process.platform === "win32") srv.child.send("shutdown"); else srv.child.kill("SIGTERM");
    setTimeout(() => { try { srv.child.kill("SIGKILL"); } catch (e) {} r(); }, 6000);
  });
}
function crash(srv) { return new Promise((r) => { if (srv.exited) return r(); srv.child.once("exit", () => r()); srv.child.kill("SIGKILL"); setTimeout(r, 4000); }); }

function browser(port) {
  const jar = new Map();
  const b = {
    jar, last: null,
    req(method, p, o) {
      o = o || {};
      const body = o.raw !== undefined ? o.raw : o.body !== undefined ? JSON.stringify(o.body) : undefined;
      const h = Object.assign({}, o.headers || {});
      if (body !== undefined && !h["Content-Type"]) h["Content-Type"] = "application/json";
      if (method !== "GET" && o.origin !== false) h.Origin = o.origin || "http://127.0.0.1:" + port;
      const cookies = [...jar].map(([k, v]) => k + "=" + v).join("; ");
      if (cookies) h.Cookie = cookies;
      return new Promise((resolve) => {
        const r = http.request({ host: "127.0.0.1", port, method, path: p, headers: h, agent: false }, (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            const setCookie = [].concat(res.headers["set-cookie"] || []);
            for (const sc of setCookie) {
              const [kv] = sc.split(";"); const eq = kv.indexOf("="); const k = kv.slice(0, eq), v = kv.slice(eq + 1);
              if (/Max-Age=0\b/.test(sc) || v === "") jar.delete(k); else jar.set(k, v);
            }
            let json = null; try { json = JSON.parse(text); } catch (e) {  }
            resolve({ status: res.statusCode, headers: res.headers, text, json, setCookie });
          });
        });
        r.on("error", (e) => resolve({ status: 0, text: String(e && e.code), json: null, headers: {}, setCookie: [] }));
        if (body !== undefined) r.write(body);
        r.end();
      });
    },
    get(p, o) { return b.req("GET", p, o); },
    put(p, body, o) { return b.req("PUT", p, Object.assign({ body }, o || {})); },
    post(p, body, o) { return b.req("POST", p, Object.assign({ body: body === undefined ? {} : body }, o || {})); },
  };
  return b;
}

async function signIn(b, did, o) {
  o = o || {};
  if (o.allowDb && did !== OWNER_DID) await o.allowDb.query("INSERT INTO trail_allowlist (discord_id, added_by) VALUES ($1, 'test') ON CONFLICT (discord_id) DO UPDATE SET revoked_at = NULL", [did]);
  const start = await b.get("/api/auth/discord" + (o.next ? "?next=" + encodeURIComponent(o.next) : ""), { headers: o.headers });
  const loc = String(start.headers.location || "");
  const state = (() => { try { return new URL(loc).searchParams.get("state"); } catch (e) { return null; } })();
  const cb = await b.get("/api/auth/discord/callback?code=" + encodeURIComponent(o.code || "player-" + did) + "&state=" + encodeURIComponent(state || ""), { headers: o.headers });
  return { start, cb, loc };
}
const pid = () => C.b64u(crypto.randomBytes(18));
async function until(fn, ms) { for (let t = 0; t < ms; t += 100) { try { if (fn()) return true; } catch (e) {  } await sleep(100); } return false; }

const FOREIGN = ["allowlist", "access_requests", "audit_log", "schema_migrations"];
async function foreignFixture(url) {
  const p = new Pool({ connectionString: url, max: 1 });
  try {
    await p.query("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL)");
    await p.query("CREATE TABLE IF NOT EXISTS allowlist (discord_id TEXT PRIMARY KEY, display_name TEXT, added_by TEXT NOT NULL, revoked_at TIMESTAMPTZ)");
    await p.query("CREATE TABLE IF NOT EXISTS access_requests (id BIGSERIAL PRIMARY KEY, discord_id TEXT NOT NULL, display_name TEXT, status TEXT NOT NULL DEFAULT 'pending')");
    await p.query("CREATE TABLE IF NOT EXISTS audit_log (id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, detail JSONB NOT NULL DEFAULT '{}')");
    await p.query("INSERT INTO schema_migrations VALUES (4, 'sentinel') ON CONFLICT DO NOTHING");
    await p.query("INSERT INTO allowlist (discord_id, display_name, added_by) VALUES ('300000000000000099', 'Sentinel', 'other-app') ON CONFLICT DO NOTHING");
    await p.query("INSERT INTO access_requests (discord_id, display_name) SELECT '300000000000000098', 'Sentinel' WHERE NOT EXISTS (SELECT 1 FROM access_requests)");
    await p.query("INSERT INTO audit_log (actor, action) SELECT 'other-app', 'sentinel' WHERE NOT EXISTS (SELECT 1 FROM audit_log)");
  } finally { await p.end(); }
}
async function foreignSnapshot(url) {
  const p = new Pool({ connectionString: url, max: 1 });
  try {
    const out = {};
    for (const t of FOREIGN) {
      const cols = (await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 ORDER BY ordinal_position", [t])).rows;
      const rows = (await p.query("SELECT to_jsonb(x)::text AS r FROM " + t + " x ORDER BY 1")).rows.map((r) => r.r);
      out[t] = { cols, rows };
    }
    return JSON.stringify(out);
  } finally { await p.end(); }
}
async function resetDb(url) {
  const p = new Pool({ connectionString: url, max: 1 });
  try {
    const t = (await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name LIKE 'trail\\_%'")).rows.map((r) => r.table_name);
    if (t.length) await p.query("DROP TABLE IF EXISTS " + t.map((n) => '"' + n + '"').join(", ") + " CASCADE");
    await p.query("DROP FUNCTION IF EXISTS trail_audit_append_only() CASCADE");
  } finally { await p.end(); }
}

async function runMutant(mu, runSuite) {
  const srcServer = fs.readFileSync(path.join(DIR, "server.js"), "utf8");
  const target = fs.readFileSync(path.join(DIR, mu.file), "utf8");
  if (!target.includes(mu.from)) return null;
  const written = [];
  let server = mu.file === "server.js" ? srcServer.replace(mu.from, mu.to) : srcServer;
  if (mu.file !== "server.js") {
    const f = path.join(DIR, "_mutant-" + mu.file);
    fs.writeFileSync(f, target.replace(mu.from, mu.to)); written.push(f);
    server = server.replace('require("./' + mu.file + '")', 'require("./_mutant-' + mu.file + '")');
  }
  const fServer = path.join(DIR, "_mutant-server.js");
  fs.writeFileSync(fServer, server); written.push(fServer);
  try { return await runSuite(fServer); } finally { for (const f of written) try { fs.unlinkSync(f); } catch (e) {} }
}

module.exports = { ROOT, DIR, C, Pool, sleep, OWNER_DID, SECRETS, SESSION_KEY, freePort, startApi, waitUp, stop, stopGracefully, crash, browser, signIn, pid, until,
  foreignFixture, foreignSnapshot, resetDb, runMutant };
