"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const C = require("../lib/common.js");
const SV = require("./save.js");
const B = require("./owner-bot.js");
const ST = require("./store.js");
const { migrate } = require("./migrations.js");
const { Pool } = require("pg");

function bootFail(msg) { console.error("api:cannot start: " + msg); process.exit(1); }
const env = process.env;
const PORT = Number(env.PORT) || 8080;
const ENABLED = env.TRAIL_API_ENABLED !== "0";
const DATABASE_URL = env.DATABASE_URL || "";
const POOL_MAX = (() => { const v = Number(env.PG_POOL_MAX); return Number.isInteger(v) && v >= 1 ? Math.min(v, 10) : 5; })();
const DISCORD_ID = env.DISCORD_CLIENT_ID || "", DISCORD_SECRET = env.DISCORD_CLIENT_SECRET || "";
const DISCORD = !!(DISCORD_ID && DISCORD_SECRET);
const OWNER = /^\d{5,25}$/.test(env.OWNER_DISCORD_ID || "") ? env.OWNER_DISCORD_ID : "";
const ALL_CHARS = new Set(String(env.TRAIL_ALL_CHARS_DISCORD_IDS || "").split(",").map((s) => s.trim()).filter((s) => /^\d{5,25}$/.test(s)));
const SITE_DIR = env.TRAIL_SITE_DIR || path.join(__dirname, "..", "..", "site");
let PUBLIC_URL = "";
if (env.PUBLIC_URL) {
  try { const u = new URL(env.PUBLIC_URL); if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("scheme"); PUBLIC_URL = u.origin; }
  catch (e) { bootFail("PUBLIC_URL is not a valid http(s) URL"); }
}
const SECURE = PUBLIC_URL.startsWith("https:");
if (DISCORD && !PUBLIC_URL) bootFail("Discord login is on but PUBLIC_URL is not set (the return address must never come from a request header)");
if (ENABLED && !DATABASE_URL) bootFail("DATABASE_URL is not set (set TRAIL_API_ENABLED=0 to run without one)");
if (DATABASE_URL && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) bootFail("SESSION_SECRET must be set, at least 32 characters");
const PROXY_KEY = env.TRAIL_PROXY_KEY || "";
if (PROXY_KEY && PROXY_KEY.length < 32) bootFail("TRAIL_PROXY_KEY must be at least 32 characters");
if (DISCORD && !PROXY_KEY) bootFail("Discord login is on but TRAIL_PROXY_KEY is not set (set the same value, at least 32 characters, on the site service and on this server)");
const AUDIT_SECRET = env.AUDIT_PSEUDO_SECRET || "";
if (AUDIT_SECRET && AUDIT_SECRET.length < 32) bootFail("AUDIT_PSEUDO_SECRET must be at least 32 characters");
let WEBHOOK = "";
if (env.DISCORD_WEBHOOK_URL) {
  try {
    const u = new URL(env.DISCORD_WEBHOOK_URL);
    if (u.protocol !== "https:" || (u.hostname !== "discord.com" && u.hostname !== "discordapp.com") || u.port || u.search || u.hash
      || !/^\/api\/webhooks\/\d{5,25}\/[A-Za-z0-9_-]{10,100}$/.test(u.pathname)) throw new Error("shape");
    WEBHOOK = u.href;
  } catch (e) { bootFail("DISCORD_WEBHOOK_URL is not a Discord webhook address"); }
}
let BOT_URL = "";
const BOT_SECRET = env.OWNER_BOT_SECRET || "";
const BOT_PREFIX = env.OWNER_BOT_HEADER_PREFIX || "x-owner-bot";
if (!/^x-[a-z0-9-]{1,30}$/.test(BOT_PREFIX)) bootFail("OWNER_BOT_HEADER_PREFIX must look like x-name");
if (env.OWNER_BOT_URL) {
  try {
    const u = new URL(env.OWNER_BOT_URL);
    const local = u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname.endsWith(".railway.internal");
    if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) throw new Error("scheme");
    if (u.search || u.hash) throw new Error("query");
    BOT_URL = u.href;
  } catch (e) { bootFail("OWNER_BOT_URL is not a plain http(s) URL"); }
}
if (!!BOT_URL !== !!BOT_SECRET) bootFail("OWNER_BOT_URL and OWNER_BOT_SECRET go together: set both or neither");
if (BOT_SECRET && BOT_SECRET.length < 32) bootFail("OWNER_BOT_SECRET must be at least 32 characters");

let CAT;
try { CAT = SV.loadCatalog(SITE_DIR); } catch (e) { bootFail("the game's level and price files did not load (" + ((e && e.name) || "Error") + ")"); }

const OWNER_FILES = {};
for (const [name, type] of [["index.html", "text/html"], ["owner.js", "text/javascript"], ["owner.css", "text/css"]]) {
  try { OWNER_FILES[name] = { body: fs.readFileSync(path.join(__dirname, "owner", name)), type: type + "; charset=utf-8" }; }
  catch (e) { bootFail("the owner page file " + name + " is missing"); }
}

const MASTER = env.SESSION_SECRET ? Buffer.from(env.SESSION_SECRET, "utf8") : crypto.randomBytes(32);
const subKey = (label) => crypto.createHmac("sha256", MASTER).update(label).digest();
const SESSION_KEY = subKey("bf trail session v1"), STATE_KEY = subKey("bf trail oauth state v1");
const IP_HASH_KEY = subKey("bf trail ip hash v1"), UA_HASH_KEY = subKey("bf trail ua hash v1");
const AUDIT_MASTER = AUDIT_SECRET ? Buffer.from(AUDIT_SECRET, "utf8") : MASTER;
const auditKey = (label) => crypto.createHmac("sha256", AUDIT_MASTER).update(label).digest();
const PSEUDO_KEY = auditKey("bf trail audit pseudonym v2"), TOMB_KEY = auditKey("bf trail access tombstone v1");
const IP_KEY = subKey("bf hunt rate address v1"), RATE_KEY = subKey("bf hunt rate account v1"), CMP_KEY = crypto.randomBytes(32);
const safeEqual = C.makeSafeEqual(CMP_KEY);
const hash22 = (key, text) => C.mac(key, text).toString("base64url").slice(0, 22);
const pseudoOf = (did, salt) => "p:" + (salt ? hash22(PSEUDO_KEY, did + ":" + salt) : C.b64u(crypto.randomBytes(16)).slice(0, 22));
const tombOf = (did) => C.mac(TOMB_KEY, did).toString("base64url");
const SESSION_DAYS = 7, STATE_TTL_MS = 10 * 60 * 1000, MAX_PENDING_STATES = 5000, DISCORD_TIMEOUT_MS = 8000;
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const EVENT_RETENTION_DAYS = 400, TOMBSTONE_DAYS = 180;
const LIMIT_KEYS = 20000;
const L = (max, ms) => C.makeLimiter(max, ms, LIMIT_KEYS);
const rateKey = (did) => "d" + hash22(RATE_KEY, did);
const lim = { ip: L(300, MIN), login: L(30, 10 * MIN), save: L(120, 10 * MIN), events: L(60, 10 * MIN), forget: L(5, HOUR), gate: L(3000, MIN),
  accessUser: L(10, HOUR), accessIp: L(30, HOUR), owner: L(120, MIN) };
const ACCESS_COOLDOWN_MS = 60 * MIN;
const CAP = { save: 64 * 1024, events: 16 * 1024 };
const DRAIN = 256 * 1024;
const SAVE_MAX_BYTES = 48000;
const HISTORY = 32;
const PID_RE = /^[A-Za-z0-9_-]{16,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EVENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const DATA_KEY_RE = /^(?!(?:constructor|prototype)$)[a-z][A-Za-z0-9_]{0,23}$/;
const NEXT_RE = /^\/(map|badges|profile|how-to-play|socials|wardrobe(\/[a-z-]{1,24})?|level\/[1-9]\d{0,2}|api\/owner\/)?$/;

const headers = (extra) => Object.assign({}, C.SEC_HEADERS, extra);
function sendJson(res, status, obj, extra) {
  const body = JSON.stringify(obj);
  res.writeHead(status, headers(Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(body) }, extra)));
  res.end(body);
}
function sendText(res, status, text, extra) {
  res.writeHead(status, headers(Object.assign({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(text) }, extra)));
  res.end(text);
}
const notFound = (res) => sendText(res, 404, "404 Not Found");
function redirect(res, location, cookies) {
  const h = { Location: location, "Cache-Control": "no-store", "Content-Length": 0 };
  if (cookies && cookies.length) h["Set-Cookie"] = cookies;
  res.writeHead(302, headers(h)); res.end();
}
const secureFor = (req) => SECURE || C.isHttps(req);
const cookie = (req, name, value, maxAge, o) => C.cookieString(name, value, { path: (o && o.path) || "/", sameSite: "Lax", maxAge, secure: secureFor(req) });
const clearAll = (req) => [cookie(req, "bt_s", "", 0), cookie(req, "bt_o", "", 0, { path: "/api/auth/discord" })];
function clientIp(req) {
  const sock = String(req.socket.remoteAddress || "").replace(/^::ffff:/i, ""), h = req.headers["x-bf-client-ip"];
  const fromProxy = PROXY_KEY !== "" && safeEqual(String(req.headers["x-bf-proxy-key"] || ""), PROXY_KEY);
  if (fromProxy && typeof h === "string" && h.length <= 64 && /^[0-9A-Fa-f:.]+$/.test(h)) return C.ipBucket(h);
  return C.ipBucket(sock || "unknown");
}
const ipKeyOf = (req) => C.mac(IP_KEY, clientIp(req)).toString("base64url").slice(0, 22);
function seenOf(req) {
  const ua = req.headers["user-agent"];
  return { ipHash: hash22(IP_HASH_KEY, clientIp(req)), uaHash: typeof ua === "string" && ua.length > 0 && ua.length <= 512 ? hash22(UA_HASH_KEY, ua) : null };
}

let pool = null, dbState = "off", errorCount = 0;
const errName = (e) => ((e && e.name) || "Error") + (e && e.code ? " " + e.code : "");
function serverError(res, e) {
  errorCount++;
  if (env.TRAIL_API_DEBUG_ERRORS === "1") console.error("api:error " + errName(e) + " " + String((e && e.stack) || "").split("\n").slice(1, 4).join(" | "));
  if (!res.headersSent) sendJson(res, 503, { error: "storage" }); else res.destroy();
}

const sessionOf = (req) => C.readSession(SESSION_KEY, C.cookiesOf(req).bt_s);
function sessionCookie(req, user) { const s = C.sessionValue(SESSION_KEY, user, SESSION_DAYS); return cookie(req, "bt_s", s.value, s.maxAge); }
async function memberOf(req) {
  const user = sessionOf(req);
  if (!user || !pool) return { user: null };
  const did = user.id.slice(2);
  const r = await ST.memberRow(pool, did);
  if (!r) return { user: null };
  if (user.iat < Number(r.made)) return { user: null };
  if (r.cut !== null && !(user.iat > Number(r.cut))) return { user: null };
  return { user, did, playerId: Number(r.id), allowed: (OWNER !== "" && did === OWNER) || r.allowed === true };
}
async function playerOf(req) {
  const m = await memberOf(req);
  if (!m.user || !m.allowed) return null;
  return { id: m.playerId, name: m.user.name, did: m.did, sid: m.user.sid || null };
}

const pendingStates = new Map();
function newState() {
  const t = Date.now();
  if (pendingStates.size >= MAX_PENDING_STATES) for (const [k, exp] of pendingStates) { if (exp < t || pendingStates.size >= MAX_PENDING_STATES) pendingStates.delete(k); else break; }
  const state = C.b64u(crypto.randomBytes(24));
  pendingStates.set(state, t + STATE_TTL_MS);
  return state;
}
function takeState(saved, given) {
  if (!saved || typeof saved.s !== "string" || typeof given !== "string" || !safeEqual(saved.s, given)) return false;
  const exp = pendingStates.get(saved.s);
  pendingStates.delete(saved.s);
  return !!exp && Date.now() <= exp;
}
const REDIRECT_URI = () => PUBLIC_URL + "/api/auth/discord/callback";
const authorizeUrl = (state) => "https://discord.com/oauth2/authorize?" + new URLSearchParams({ response_type: "code", client_id: DISCORD_ID, scope: "identify", state, redirect_uri: REDIRECT_URI() }).toString();
function discordName(me) { const n = Array.from(C.cleanName(me.global_name) || C.cleanName(me.username)).slice(0, 16).join("").trim(); return n || "Player"; }

function authDiscord(req, res, a, query) {
  req.resume();
  if (!DISCORD) return notFound(res);
  if (!lim.login.hit(ipKeyOf(req))) return sendText(res, 429, "429 Too Many Requests");
  const nextRaw = query.get("next"), next = typeof nextRaw === "string" && NEXT_RE.test(nextRaw) ? nextRaw : "/";
  const state = newState();
  redirect(res, authorizeUrl(state), [cookie(req, "bt_o", C.seal(STATE_KEY, { s: state, n: next }), STATE_TTL_MS / 1000, { path: "/api/auth/discord" })]);
}
async function authDiscordCallback(req, res, a, query) {
  req.resume();
  if (!DISCORD) return notFound(res);
  const clear = cookie(req, "bt_o", "", 0, { path: "/api/auth/discord" });
  const fail = () => redirect(res, "/login?failed=1", [clear]);
  const saved = C.unseal(STATE_KEY, C.cookiesOf(req).bt_o), code = query.get("code");
  if (!takeState(saved, query.get("state"))) return fail();
  if (query.get("error") || typeof code !== "string" || code.length < 1 || code.length > 512) return fail();
  let me;
  try { me = await C.discordIdentify({ clientId: DISCORD_ID, clientSecret: DISCORD_SECRET, code, redirectUri: REDIRECT_URI(), timeoutMs: DISCORD_TIMEOUT_MS }); }
  catch (e) { errorCount++; return fail(); }
  if (!me) return fail();
  const name = discordName(me);
  const who = { did: me.id, displayName: name, username: Array.from(C.cleanName(me.username)).slice(0, 40).join("") || name };
  let r;
  try { r = await ST.signIn(pool, who, seenOf(req), Date.now()); } catch (e) { errorCount++; return fail(); }
  const ok = (OWNER !== "" && me.id === OWNER) || r.allowed;
  const user = { id: "d:" + me.id, name, via: "discord", sid: r.sid, mfa: me.mfa_enabled === true };
  const next = ok && typeof saved.n === "string" && NEXT_RE.test(saved.n) ? saved.n : ok ? "/" : "/login";
  redirect(res, next, [clear, sessionCookie(req, user)]);
}

async function apiGate(req, res) {
  req.resume();
  if (!lim.gate.hit(ipKeyOf(req))) return sendText(res, 429, "429 Too Many Requests");
  if (!ENABLED || !pool) return sendText(res, 503, "503 Service Unavailable");
  const m = await memberOf(req);
  if (m.user && m.allowed) { res.writeHead(204, headers({ "Cache-Control": "no-store" })); return res.end(); }
  redirect(res, "/login");
}
async function apiAccessStatus(req, res) {
  req.resume();
  const out = { discord: DISCORD, user: null, allowed: false, request: null };
  const m = await memberOf(req);
  if (!m.user) return sendJson(res, 200, out);
  out.user = { name: m.user.name };
  if (m.allowed) { out.allowed = true; return sendJson(res, 200, out); }
  const st = await ST.accessStatus(pool, m.did, tombOf(m.did));
  const r = st.request;
  if (r && r.status === "pending") out.request = { status: "pending", sent: r.notify === "delivered" || r.notify === "off", stuck: r.notify === "failed" };
  else {
    const since = Math.max(r && r.status === "denied" ? r.decidedAt : 0, st.revokedAt || 0, st.forgottenDecisionAt || 0);
    const recent = st.forgottenAskOnly && since === st.forgottenDecisionAt;
    if (since) out.request = { status: recent ? "recent" : "denied", retryAt: since + ACCESS_COOLDOWN_MS, now: Date.now() };
  }
  sendJson(res, 200, out);
}
function notifyOwner(publicId, displayName) {
  const safe = displayName.replace(/[\\`*_~|>#[\]()@<:-]/g, "\\$&");
  const content = "New access request for Bitfoot: The Hunt from " + safe + "." + (PUBLIC_URL ? " Review it at " + PUBLIC_URL + "/api/owner/" : "");
  fetch(WEBHOOK, { method: "POST", redirect: "error", signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS), headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) })
    .then((r) => ST.setNotify(pool, publicId, r.ok ? "delivered" : "failed"), () => ST.setNotify(pool, publicId, "failed"))
    .catch(() => { errorCount++; });
}
async function apiAccessRequest(req, res) {
  req.resume();
  const m = await memberOf(req);
  if (!m.user) return sendJson(res, 401, { error: "login" });
  if (m.allowed) return sendJson(res, 200, { allowed: true });
  if (!lim.accessIp.hit(ipKeyOf(req)) || !lim.accessUser.hit(rateKey(m.did))) return sendJson(res, 429, { error: "slow_down" });
  const row = (await pool.query("SELECT display_name, username FROM trail_players WHERE id = $1", [m.playerId])).rows[0] || {};
  const displayName = Array.from(C.cleanName(row.display_name || m.user.name)).slice(0, 64).join("") || "Player";
  const username = Array.from(C.cleanName(row.username || "")).slice(0, 40).join("") || displayName.slice(0, 40);
  const r = await ST.createAccessRequest(pool, { did: m.did, displayName, username, tomb: tombOf(m.did) }, pseudoOf, ACCESS_COOLDOWN_MS, BOT_URL || WEBHOOK ? "queued" : "off");
  if (r.allowed) return sendJson(res, 200, { allowed: true });
  if (r.cooldown) return sendJson(res, 429, { error: "cooldown", retryAt: r.retryAt, now: Date.now() });
  if (r.created && BOT_URL) void sendToBot();
  else if (r.created && WEBHOOK) notifyOwner(r.request.public_id, displayName);
  sendJson(res, r.created ? 201 : 200, { request: { status: "pending", sent: r.request.notify === "delivered" || r.request.notify === "off" } });
}
let sending = null;
function sendToBot() {
  if (!BOT_URL || !pool || stopping) return Promise.resolve();
  if (sending) return sending;
  sending = (async () => {
    try {
      for (const row of await ST.unsentRequests(pool, 5)) {
        const out = await B.deliverAccess(BOT_URL, BOT_SECRET, BOT_PREFIX, B.accessBody(row), Date.now() / 1000);
        if (out.outcome === "delivered") await ST.markSent(pool, row.public_id, "delivered");
        else if (out.outcome === "rejected") { await ST.markSent(pool, row.public_id, "failed"); console.error("api:owner bot refused a request: " + out.status); }
        else { console.error("api:owner bot not reached: " + out.status); break; }
      }
    } catch (e) { errorCount++; console.error("api:owner bot send failed: " + errName(e)); }
    finally { sending = null; }
  })();
  return sending;
}
const DISCORD_ID_RE = /^\d{5,25}$/;
async function apiAccessDecision(req, res) {
  if (!BOT_SECRET || !pool || !ENABLED) { req.resume(); return notFound(res); }
  const raw = await B.readRaw(req, B.MAX_BODY);
  if (!raw) return sendJson(res, 400, { error: "bad_request" });
  const v = B.verify(BOT_SECRET, BOT_PREFIX, req.headers, raw, Date.now() / 1000);
  if (!v.ok) return sendJson(res, 401, { error: v.why });
  let body; try { body = JSON.parse(raw.toString("utf8")); } catch (e) { return sendJson(res, 400, { error: "bad_json" }); }
  if (!body || typeof body !== "object" || typeof body.id !== "string" || !UUID_RE.test(body.id)) return sendJson(res, 400, { error: "bad_id" });
  if (typeof body.discordId !== "string" || !DISCORD_ID_RE.test(body.discordId)) return sendJson(res, 400, { error: "bad_discord_id" });
  if (body.decision !== "approve" && body.decision !== "deny") return sendJson(res, 400, { error: "bad_decision" });
  const did = await ST.requestDiscordId(pool, body.id);
  if (!did) return sendJson(res, 404, { error: "unknown_request" });
  if (did !== body.discordId) return sendJson(res, 409, { error: "discord_id_mismatch" });
  const out = await ST.decideAccess(pool, body.id, body.decision, pseudoOf);
  if (!out) return sendJson(res, 404, { error: "unknown_request" });
  sendJson(res, 200, { ok: true, id: body.id, decision: out.decision, changed: out.changed });
}

async function apiMe(req, res) {
  req.resume();
  const out = { enabled: ENABLED && !!pool, discord: DISCORD, user: null };
  if (!out.enabled) return sendJson(res, 200, out);
  const p = await playerOf(req);
  if (p) out.user = ALL_CHARS.has(p.did) ? { name: p.name, allChars: true } : { name: p.name };
  sendJson(res, 200, out);
}
async function playerOrDeny(req, res) {
  const p = await playerOf(req);
  if (!p) { req.resume(); sendJson(res, 401, { error: "login" }); return null; }
  return p;
}
async function apiSaveGet(req, res) {
  req.resume();
  const p = await playerOrDeny(req, res); if (!p) return;
  const r = await pool.query("SELECT gen, rev, save FROM trail_saves WHERE player_id = $1", [p.id]);
  const row = r.rows[0];
  if (!row || row.rev === 0) return sendJson(res, 200, { gen: row ? row.gen : null, rev: 0, save: null });
  sendJson(res, 200, { gen: row.gen, rev: row.rev, save: row.save });
}
function baseOf(row, base) {
  if (!base) return null;
  const hist = Array.isArray(row.history) ? row.history : [];
  if (base.pid) { const e = hist.find((h) => h.pid === base.pid); if (e) return e.sent; }
  if (base.gen !== row.gen) return null;
  if (base.rev === row.rev && row.rev > 0) return SV.counters(row.save);
  const e = hist.find((h) => h.rev === base.rev);
  return e ? e.after : null;
}
async function apiSavePut(req, res) {
  const p = await playerOrDeny(req, res); if (!p) return;
  if (!lim.save.hit("p" + p.id)) { req.resume(); return sendJson(res, 429, { error: "slow_down" }); }
  const body = await C.readJson(req, CAP.save, DRAIN);
  if (!body) return sendJson(res, 400, { error: "bad_body" });
  const { pid, base } = body;
  if (typeof pid !== "string" || !PID_RE.test(pid)) return sendJson(res, 400, { error: "bad_pid" });
  if (base !== null && base !== undefined) {
    if (typeof base !== "object" || Array.isArray(base) || !(base.gen === null || (typeof base.gen === "string" && UUID_RE.test(base.gen))) || !Number.isInteger(base.rev) || base.rev < 0 || base.rev > 2e9
      || (base.pid !== undefined && (typeof base.pid !== "string" || !PID_RE.test(base.pid)))) return sendJson(res, 400, { error: "bad_base" });
  }
  let pushed;
  try { pushed = SV.normalize(body.save, CAT); }
  catch (e) { if (e instanceof SV.Bad) return sendJson(res, 400, { error: "invalid_save", field: e.message }); throw e; }
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("INSERT INTO trail_saves (player_id, save) VALUES ($1, '{}'::jsonb) ON CONFLICT (player_id) DO NOTHING", [p.id]);
    const row = (await c.query("SELECT gen, rev, save, history FROM trail_saves WHERE player_id = $1 FOR UPDATE", [p.id])).rows[0];
    const hist = Array.isArray(row.history) ? row.history : [];
    if (hist.some((h) => h.pid === pid)) {
      await c.query("COMMIT");
      return sendJson(res, 200, { gen: row.gen, rev: row.rev, save: row.save, repeated: true });
    }
    const prev = row.rev > 0 ? row.save : null;
    const merged = SV.merge(prev, pushed, baseOf(row, base || null), CAT);
    if (Buffer.byteLength(JSON.stringify(merged)) > SAVE_MAX_BYTES) { await c.query("ROLLBACK"); return sendJson(res, 413, { error: "too_big" }); }
    const rev = row.rev + 1;
    const nextHist = hist.concat([{ rev, pid, after: SV.counters(merged), sent: SV.counters(pushed) }]).slice(-HISTORY);
    await c.query("UPDATE trail_saves SET rev = $2, save = $3, history = $4, updated_at = now() WHERE player_id = $1", [p.id, rev, JSON.stringify(merged), JSON.stringify(nextHist)]);
    await c.query("UPDATE trail_players SET last_seen_at = now() WHERE id = $1", [p.id]);
    const evs = ST.diffEvents(prev, merged, rev, CAT);
    await ST.insertEvents(c, p.id, p.sid, evs);
    await c.query("COMMIT");
    sendJson(res, 200, { gen: row.gen, rev, save: merged });
  } catch (e) {
    try { await c.query("ROLLBACK"); } catch (e2) {  }
    throw e;
  } finally { c.release(); }
}
function checkEvents(body) {
  const list = body && body.events;
  if (!Array.isArray(list) || list.length < 1 || list.length > 50) return null;
  const out = [], seen = new Set();
  for (const e of list) {
    if (!e || typeof e !== "object" || Array.isArray(e)) return null;
    if (typeof e.id !== "string" || !EVENT_ID_RE.test(e.id) || seen.has(e.id)) return null;
    if (!ST.CLIENT_EVENTS.has(e.type)) return null;
    if (e.level !== undefined && e.level !== null && !(Number.isInteger(e.level) && e.level >= 1 && e.level <= CAT.levels)) return null;
    let detail = {};
    if (e.data !== undefined && e.data !== null) {
      if (typeof e.data !== "object" || Array.isArray(e.data)) return null;
      const keys = Object.keys(e.data);
      if (keys.length > 8) return null;
      for (const k of keys) {
        const v = e.data[k];
        if (!DATA_KEY_RE.test(k)) return null;
        if (!(typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1e9) || (typeof v === "string" && v.length <= 64 && C.cleanName(v) === v))) return null;
      }
      detail = e.data;
    }
    seen.add(e.id);
    out.push({ key: e.id, type: e.type, level: e.level === undefined ? null : e.level, detail });
  }
  return out;
}
async function apiEvents(req, res) {
  const p = await playerOrDeny(req, res); if (!p) return;
  if (!lim.events.hit("p" + p.id)) { req.resume(); return sendJson(res, 429, { error: "slow_down" }); }
  const body = await C.readJson(req, CAP.events, DRAIN);
  const evs = body ? checkEvents(body) : null;
  if (!evs) return sendJson(res, 400, { error: "bad_events" });
  const r = await ST.insertClientEvents(pool, p.id, p.sid, evs);
  sendJson(res, 200, { accepted: r.inserted, repeated: r.offered - r.inserted, dropped: evs.length - r.offered });
}
async function apiLogout(req, res) {
  req.resume();
  const user = sessionOf(req);
  if (user && pool) await ST.logout(pool, user.id.slice(2), Date.now()).catch(function () { errorCount++; });
  sendJson(res, 200, { user: null }, { "Set-Cookie": clearAll(req) });
}
async function apiForget(req, res) {
  req.resume();
  const m = await memberOf(req);
  if (!m.user) return sendJson(res, 401, { error: "login" });
  if (!lim.forget.hit(rateKey(m.did))) return sendJson(res, 429, { error: "slow_down" });
  await ST.forget(pool, m.did, tombOf(m.did), pseudoOf(m.did, null), TOMBSTONE_DAYS, ACCESS_COOLDOWN_MS);
  sendJson(res, 200, { forgotten: true }, { "Set-Cookie": clearAll(req) });
}

async function ownerOrDeny(req, res, page) {
  req.resume();
  const m = await memberOf(req);
  const SAYS = {
    owner_only: "This page is only for the game's owner. You are signed in with a different Discord account: log out at /login/ and log in with the owner's account.",
    owner_2fa: "Your Discord account needs two-factor sign-in. Turn it on in Discord (User Settings, My Account), then log out at /login/ and log in again.",
    slow_down: "Too many requests. Wait a minute and reload."
  };
  const no = (status, error) => {
    if (page === "signin" && SAYS[error]) sendText(res, status, SAYS[error]);
    else if (page) notFound(res);
    else sendJson(res, status, { error });
    return null;
  };
  if (!m.user && page === "signin") { redirect(res, "/api/auth/discord?next=/api/owner/"); return null; }
  if (!m.user) return no(401, "login");
  if (m.did !== OWNER || !OWNER) return no(403, "owner_only");
  if (m.user.mfa !== true) return no(403, "owner_2fa");
  if (!lim.owner.hit("owner")) return no(429, "slow_down");
  return { did: m.did };
}
async function ownerPage(req, res, file) {
  const o = await ownerOrDeny(req, res, file === "index.html" ? "signin" : true); if (!o) return;
  const f = OWNER_FILES[file || "index.html"];
  res.writeHead(200, headers({ "Content-Type": f.type, "Cache-Control": "no-store", "Content-Length": f.body.length }));
  res.end(f.body);
}
async function ownerRequests(req, res, a, query) {
  const o = await ownerOrDeny(req, res); if (!o) return;
  sendJson(res, 200, { requests: await ST.listRequests(pool, query.get("status") === "all", 200) });
}
async function ownerDecide(req, res, id, decision) {
  if (!UUID_RE.test(id)) return sendJson(res, 404, { error: "unknown" });
  const r = await ST.decideAccess(pool, id, decision, pseudoOf);
  if (!r) return sendJson(res, 404, { error: "unknown" });
  sendJson(res, 200, r);
}
async function ownerApprove(req, res, id) {
  const o = await ownerOrDeny(req, res); if (!o) return;
  return ownerDecide(req, res, id, "approve");
}
async function ownerDeny(req, res, id) {
  const o = await ownerOrDeny(req, res); if (!o) return;
  return ownerDecide(req, res, id, "deny");
}
async function ownerRevoke(req, res, did) {
  const o = await ownerOrDeny(req, res); if (!o) return;
  sendJson(res, 200, await ST.revoke(pool, did, pseudoOf, Date.now()));
}
async function ownerPlayers(req, res) {
  const o = await ownerOrDeny(req, res); if (!o) return;
  const rows = await ST.listPlayers(pool, 500);
  sendJson(res, 200, { players: rows.map((p) => ({
    discordId: p.discord_id, displayName: p.display_name, username: p.username,
    createdAt: new Date(p.created_at).getTime(), lastSeenAt: new Date(p.last_seen_at).getTime(),
    access: p.discord_id === OWNER ? "owner" : !p.listed ? "none" : p.revoked_at ? "revoked" : "allowed",
    levels: p.levels, stars: p.stars, wallet: p.wallet === null ? null : Number(p.wallet), sessions: p.sessions, events: p.events,
    lastEventAt: p.last_event_at ? new Date(p.last_event_at).getTime() : null,
    lastSession: p.last_session_at ? { at: new Date(p.last_session_at).getTime(), ended: p.last_session_end || "open" } : null,
  })) });
}
async function ownerEvents(req, res, a, query) {
  const o = await ownerOrDeny(req, res); if (!o) return;
  const who = query.get("player"), n = Number(query.get("limit"));
  sendJson(res, 200, { events: await ST.listEvents(pool, typeof who === "string" && /^\d{5,25}$/.test(who) ? who : null, Number.isInteger(n) && n >= 1 && n <= 500 ? n : 200) });
}
async function ownerAudit(req, res) {
  const o = await ownerOrDeny(req, res); if (!o) return;
  const names = await ST.namesForPseudonyms(pool, pseudoOf, 1000);
  const rows = (await ST.listAudit(pool, 200)).map((r) => Object.assign(r, { who: names.get(r.target) || null }));
  sendJson(res, 200, { audit: rows });
}

const ROUTES = [
  { re: /^\/(api\/)?health$/, kind: "open", m: { GET: (req, res) => { req.resume(); sendText(res, 200, "ok"); } } },
  { re: /^\/api\/gate$/, kind: "gate", m: { GET: apiGate } },
  { re: /^\/api\/access\/status$/, kind: "auth", m: { GET: apiAccessStatus } },
  { re: /^\/api\/access\/request$/, kind: "auth", m: { POST: apiAccessRequest } },
  { re: /^\/api\/internal\/access-decision$/, kind: "internal", m: { POST: apiAccessDecision } },
  { re: /^\/api\/me$/, kind: "me", m: { GET: apiMe } },
  { re: /^\/api\/auth\/discord$/, kind: "auth", m: { GET: authDiscord } },
  { re: /^\/api\/auth\/discord\/callback$/, kind: "auth", m: { GET: authDiscordCallback } },
  { re: /^\/api\/logout$/, kind: "auth", m: { POST: apiLogout } },
  { re: /^\/api\/save$/, kind: "user", m: { GET: apiSaveGet, PUT: apiSavePut } },
  { re: /^\/api\/events$/, kind: "user", m: { POST: apiEvents } },
  { re: /^\/api\/forget$/, kind: "user", m: { POST: apiForget } },
  { re: /^\/api\/owner\/?()$/, kind: "owner", m: { GET: (req, res) => ownerPage(req, res, "index.html") } },
  { re: /^\/api\/owner\/(owner\.js|owner\.css)$/, kind: "owner", m: { GET: ownerPage } },
  { re: /^\/api\/owner\/requests$/, kind: "owner", m: { GET: ownerRequests } },
  { re: /^\/api\/owner\/requests\/([0-9a-f-]{36})\/approve$/, kind: "owner", m: { POST: ownerApprove } },
  { re: /^\/api\/owner\/requests\/([0-9a-f-]{36})\/deny$/, kind: "owner", m: { POST: ownerDeny } },
  { re: /^\/api\/owner\/players$/, kind: "owner", m: { GET: ownerPlayers } },
  { re: /^\/api\/owner\/players\/(\d{5,25})\/revoke$/, kind: "owner", m: { POST: ownerRevoke } },
  { re: /^\/api\/owner\/events$/, kind: "owner", m: { GET: ownerEvents } },
  { re: /^\/api\/owner\/audit$/, kind: "owner", m: { GET: ownerAudit } },
];

async function handle(req, res) {
  const url = typeof req.url === "string" ? req.url : "/";
  if (url.length > 2048) { req.resume(); return sendText(res, 414, "414 URI Too Long"); }
  const qAt = url.indexOf("?"), pathname = qAt < 0 ? url : url.slice(0, qAt);
  for (const route of ROUTES) {
    const hit = route.re.exec(pathname);
    if (!hit) continue;
    const fn = Object.prototype.hasOwnProperty.call(route.m, req.method) ? route.m[req.method] : null;
    if (!fn) { req.resume(); return sendText(res, 405, "405 Method Not Allowed", { Allow: Object.keys(route.m).join(", ") }); }
    if (route.kind !== "open" && route.kind !== "gate" && !lim.ip.hit(ipKeyOf(req))) { req.resume(); return sendJson(res, 429, { error: "slow_down" }); }
    if (req.method !== "GET" && route.kind !== "internal" && !C.sameOrigin(req)) { req.resume(); return sendJson(res, 403, { error: "origin" }); }
    if ((route.kind === "user" || route.kind === "auth" || route.kind === "owner") && (!ENABLED || !pool)) { req.resume(); return sendJson(res, 503, { error: "api_off" }); }
    return fn(req, res, hit[1], new URLSearchParams(qAt < 0 ? "" : url.slice(qAt + 1)));
  }
  req.resume();
  return notFound(res);
}

const server = http.createServer((req, res) => { handle(req, res).catch((e) => serverError(res, e)); });
server.headersTimeout = 10 * 1000;
server.requestTimeout = 30 * 1000;
server.keepAliveTimeout = 65 * 1000;
server.maxHeadersCount = 64;

function fatal(kind, err) {
  const frames = String((err && err.stack) || "").split("\n").filter((l) => /^\s+at /.test(l)).slice(0, 6).join("\n");
  console.error("api:fatal " + kind + ": " + errName(err) + "\n" + frames);
  process.exit(1);
}
process.on("uncaughtException", (e) => fatal("exception", e));
process.on("unhandledRejection", (e) => fatal("rejection", e));

let minuteTimer = null, dayTimer = null;
async function housekeeping() {
  try { await ST.purge(pool, EVENT_RETENTION_DAYS); }
  catch (e) { errorCount++; console.error("api:retention purge failed: " + errName(e)); }
}
async function main() {
  if (DATABASE_URL && ENABLED) {
    pool = new Pool({ connectionString: DATABASE_URL, max: POOL_MAX, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000,
      statement_timeout: 5000, query_timeout: 6000, application_name: "bitfoot-hunt-api" });
    pool.on("error", () => { errorCount++; });
    try { const m = await migrate(pool); dbState = "schema " + m.to + (m.from !== m.to ? " (migrated from " + m.from + ")" : ""); }
    catch (e) { bootFail("database: " + (/refusing|newer|did not make/.test(String(e && e.message)) ? e.message : errName(e))); }
    await loadLimits();
    for (const d of RATE_RECHECK_MS) recheckTimers.push(setTimeout(loadLimits, d).unref());
    await housekeeping();
    dayTimer = setInterval(housekeeping, DAY);
  }
  minuteTimer = setInterval(() => {
    for (const l of Object.values(lim)) l.sweep();
    const t = Date.now(); for (const [k, exp] of pendingStates) if (exp < t) pendingStates.delete(k);
    void sendToBot();
    console.log("api:errors=" + errorCount + " addresses=" + lim.ip.size());
  }, MIN);
  server.on("error", (e) => bootFail("cannot listen on port " + PORT + " (" + (e && e.code) + ")"));
  server.listen(PORT, "::", () => {
    console.log("api:listening on [::]:" + PORT + " enabled=" + (ENABLED ? "yes" : "NO(kill switch)") + " db=" + (pool ? dbState : "none") +
      " discord=" + (DISCORD ? "on" : "off") + " owner=" + (OWNER ? "set" : "unset") + " webhook=" + (WEBHOOK ? "on" : "off") + " owner-bot=" + (BOT_URL ? "on" : "off") +
      " client-ip=" + (PROXY_KEY ? "proxy-key" : "socket") + " audit-key=" + (AUDIT_SECRET ? "own" : "from-session-secret") + " levels=" + CAT.levels);
  });
}
const RATE_RECHECK_MS = (() => {
  const v = String(env.TRAIL_RATE_RECHECK_MS || "15000,45000,120000").split(",").map(Number);
  return v.every((x) => Number.isInteger(x) && x >= 100 && x <= 600000) ? v : [15000, 45000, 120000];
})();
const recheckTimers = [];
let loading = Promise.resolve();
function loadLimits() {
  if (stopping) return loading;
  loading = (async () => {
    try {
      const rows = await ST.takeRates(pool);
      for (const r of rows) if (Object.prototype.hasOwnProperty.call(lim, r.name)) lim[r.name].load(r.key, r.count, r.reset);
      if (rows.length) console.log("api:rate limits restored=" + rows.length);
    } catch (e) { errorCount++; console.error("api:rate limits not restored: " + errName(e)); }
  })();
  return loading;
}
async function saveLimits() {
  if (!pool) return;
  await loading;
  const rows = C.snapshotRows(lim, LIMIT_KEYS);
  try { if (rows.length) await ST.saveRates(pool, rows); }
  catch (e) { console.error("api:rate limits not saved: " + errName(e)); }
}
let stopping = false;
function shutdown() {
  if (stopping) return; stopping = true;
  clearInterval(minuteTimer); clearInterval(dayTimer); for (const t of recheckTimers) clearTimeout(t);
  server.close(async () => {
    await saveLimits();
    (pool ? pool.end() : Promise.resolve()).finally(() => process.exit(0));
  });
  server.closeAllConnections();
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
if (process.send) process.on("message", (m) => { if (m === "shutdown") shutdown(); });
main();
