"use strict";

const PERSON_LOCK = 7245032;
const CLIENT_EVENTS = new Set(["level_start", "level_fail", "level_quit"]);

async function tx(pool, fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    try { await c.query("ROLLBACK"); } catch (e2) {  }
    throw e;
  } finally { c.release(); }
}
const audit = (c, actor, action, target, detail) =>
  c.query("INSERT INTO trail_audit_log (actor, action, target, detail) VALUES ($1, $2, $3, $4)", [actor, action, target, JSON.stringify(detail || {})]);
const ms = (t) => (t ? new Date(t).getTime() : null);
const lockPerson = (c, did) => c.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [PERSON_LOCK, did]);
async function pseudoFor(c, pseudoOf, did) {
  const r = (await c.query("SELECT pseudo_salt FROM trail_players WHERE discord_id = $1", [did])).rows[0];
  return pseudoOf(did, r ? r.pseudo_salt : null);
}

async function memberRow(pool, did) {
  const r = await pool.query(
    "SELECT p.id, (extract(epoch FROM p.created_at) * 1000)::bigint AS made, (extract(epoch FROM p.session_cut) * 1000)::bigint AS cut," +
    " EXISTS (SELECT 1 FROM trail_allowlist a WHERE a.discord_id = p.discord_id AND a.revoked_at IS NULL) AS allowed" +
    " FROM trail_players p WHERE p.discord_id = $1", [did]);
  return r.rows[0] || null;
}

async function signIn(pool, who, seen, atMs) {
  return tx(pool, async (c) => {
    const p = (await c.query(
      "INSERT INTO trail_players (discord_id, display_name, username, created_at, sessions_count) VALUES ($1, $2, $3, to_timestamp($4::double precision / 1000), 1) " +
      "ON CONFLICT (discord_id) DO UPDATE SET display_name = EXCLUDED.display_name, username = EXCLUDED.username, last_seen_at = now()," +
      " sessions_count = trail_players.sessions_count + 1 RETURNING id",
      [who.did, who.displayName, who.username, atMs])).rows[0];
    const s = (await c.query("INSERT INTO trail_sessions (player_id, ip_hash, ua_hash) VALUES ($1, $2, $3) RETURNING id", [p.id, seen.ipHash, seen.uaHash])).rows[0];
    const a = (await c.query("SELECT 1 FROM trail_allowlist WHERE discord_id = $1 AND revoked_at IS NULL", [who.did])).rows[0];
    return { playerId: Number(p.id), sid: Number(s.id), allowed: !!a };
  });
}
async function logout(pool, did, atMs) {
  return tx(pool, async (c) => {
    const p = (await c.query("UPDATE trail_players SET session_cut = to_timestamp($2::double precision / 1000) WHERE discord_id = $1 RETURNING id", [did, atMs])).rows[0];
    if (p) await c.query("UPDATE trail_sessions SET ended_at = now(), ended_by = 'logout' WHERE player_id = $1 AND ended_at IS NULL", [p.id]);
  });
}

const TOMB_SQL = "SELECT denials, last_decided_at, expires_at FROM trail_access_tombstones WHERE did_hash = $1 AND expires_at > now()";
async function accessStatus(pool, did, tomb) {
  const [al, rq, tb] = await Promise.all([
    pool.query("SELECT revoked_at FROM trail_allowlist WHERE discord_id = $1", [did]),
    pool.query("SELECT status, notify, created_at, decided_at FROM trail_access_requests WHERE discord_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1", [did]),
    pool.query(TOMB_SQL, [tomb]),
  ]);
  const a = al.rows[0], q = rq.rows[0], t = tb.rows[0];
  return { allowed: !!a && a.revoked_at === null, revokedAt: a ? ms(a.revoked_at) : null, forgottenDecisionAt: t ? ms(t.last_decided_at) : null,
    forgottenAskOnly: !!t && t.denials === 0 && ms(t.expires_at) - ms(t.last_decided_at) <= 86400000,
    request: q ? { status: q.status, notify: q.notify, createdAt: ms(q.created_at), decidedAt: ms(q.decided_at) } : null };
}
async function createAccessRequest(pool, who, pseudoOf, cooldownMs, notify) {
  return tx(pool, async (c) => {
    await lockPerson(c, who.did);
    const al = (await c.query("SELECT revoked_at FROM trail_allowlist WHERE discord_id = $1", [who.did])).rows[0];
    if (al && al.revoked_at === null) return { allowed: true };
    const pending = (await c.query("SELECT public_id, status, notify FROM trail_access_requests WHERE discord_id = $1 AND status = 'pending'", [who.did])).rows[0];
    if (pending) return { request: pending, created: false };
    const last = (await c.query("SELECT decided_at FROM trail_access_requests WHERE discord_id = $1 AND status = 'denied' ORDER BY decided_at DESC LIMIT 1", [who.did])).rows[0];
    const t = (await c.query(TOMB_SQL, [who.tomb])).rows[0];
    const since = Math.max(last ? ms(last.decided_at) : 0, al && al.revoked_at ? ms(al.revoked_at) : 0, t ? ms(t.last_decided_at) : 0);
    if (since && Date.now() < since + cooldownMs) return { cooldown: true, retryAt: since + cooldownMs };
    const denials = (await c.query("SELECT count(*)::int AS n FROM trail_access_requests WHERE discord_id = $1 AND status = 'denied'", [who.did])).rows[0].n + (t ? t.denials : 0);
    const ins = (await c.query(
      "INSERT INTO trail_access_requests (discord_id, display_name, username, previous_denials, notify) VALUES ($1, $2, $3, $4, $5) RETURNING public_id, status, notify",
      [who.did, who.displayName, who.username, denials, notify])).rows[0];
    const ps = await pseudoFor(c, pseudoOf, who.did);
    await audit(c, ps, "access.request", ps, { request: ins.public_id, previousDenials: denials });
    return { request: ins, created: true };
  });
}
async function setNotify(pool, publicId, notify) {
  await pool.query("UPDATE trail_access_requests SET notify = $2 WHERE public_id = $1 AND notify = 'queued'", [publicId, notify]);
}
async function unsentRequests(pool, limit) {
  const r = await pool.query(
    "SELECT public_id, discord_id, display_name, username, previous_denials, created_at FROM trail_access_requests" +
    " WHERE status = 'pending' AND notify IN ('queued', 'off') ORDER BY created_at, id LIMIT $1", [limit]);
  return r.rows;
}
async function markSent(pool, publicId, notify) {
  await pool.query("UPDATE trail_access_requests SET notify = $2 WHERE public_id = $1 AND status = 'pending' AND notify IN ('queued', 'off')", [publicId, notify]);
}
async function requestDiscordId(pool, publicId) {
  const r = await pool.query("SELECT discord_id FROM trail_access_requests WHERE public_id = $1", [publicId]);
  return r.rows[0] ? r.rows[0].discord_id : null;
}
async function listRequests(pool, all, limit) {
  const r = await pool.query(
    "SELECT public_id, discord_id, display_name, username, status, previous_denials, created_at, decided_at FROM trail_access_requests" +
    " WHERE ($1::boolean OR status = 'pending') ORDER BY created_at DESC, id DESC LIMIT $2", [all, limit]);
  return r.rows.map((q) => ({ id: q.public_id, discordId: q.discord_id, displayName: q.display_name, username: q.username, status: q.status,
    previousDenials: q.previous_denials, createdAt: ms(q.created_at), decidedAt: ms(q.decided_at) }));
}
async function decideAccess(pool, publicId, decision, pseudoOf) {
  return tx(pool, async (c) => {
    const who = (await c.query("SELECT discord_id FROM trail_access_requests WHERE public_id = $1", [publicId])).rows[0];
    if (!who) return null;
    await lockPerson(c, who.discord_id);
    const row = (await c.query("SELECT id, discord_id, status FROM trail_access_requests WHERE public_id = $1 FOR UPDATE", [publicId])).rows[0];
    if (!row) return null;
    if (row.status !== "pending") return { decision: row.status === "approved" ? "approve" : "deny", changed: false };
    await c.query("UPDATE trail_access_requests SET status = $2, decided_at = now(), decided_by = 'owner' WHERE id = $1", [row.id, decision === "approve" ? "approved" : "denied"]);
    if (decision === "approve") {
      await c.query("INSERT INTO trail_allowlist (discord_id, added_by, request_id) VALUES ($1, 'owner', $2) " +
        "ON CONFLICT (discord_id) DO UPDATE SET added_by = 'owner', added_at = now(), request_id = EXCLUDED.request_id, revoked_at = NULL, revoked_by = NULL",
        [row.discord_id, publicId]);
    }
    await audit(c, "owner", "access." + decision, await pseudoFor(c, pseudoOf, row.discord_id), { request: publicId });
    return { decision, changed: true };
  });
}
async function revoke(pool, did, pseudoOf, atMs) {
  return tx(pool, async (c) => {
    await lockPerson(c, did);
    const r = await c.query("UPDATE trail_allowlist SET revoked_at = now(), revoked_by = 'owner' WHERE discord_id = $1 AND revoked_at IS NULL RETURNING discord_id", [did]);
    if (!r.rows[0]) return { changed: false };
    const p = (await c.query("UPDATE trail_players SET session_cut = GREATEST(session_cut, to_timestamp($2::double precision / 1000)) WHERE discord_id = $1 RETURNING id", [did, atMs])).rows[0];
    if (p) await c.query("UPDATE trail_sessions SET ended_at = now(), ended_by = 'revoke' WHERE player_id = $1 AND ended_at IS NULL", [p.id]);
    await audit(c, "owner", "access.revoke", await pseudoFor(c, pseudoOf, did), {});
    return { changed: true };
  });
}

async function listPlayers(pool, limit) {
  const r = await pool.query(
    "SELECT p.discord_id, p.display_name, p.username, p.created_at, p.last_seen_at, a.discord_id IS NOT NULL AS listed, a.revoked_at," +
    " (SELECT count(*) FROM jsonb_each_text(CASE WHEN jsonb_typeof(s.save->'stars') = 'object' THEN s.save->'stars' ELSE '{}'::jsonb END))::int AS levels," +
    " (SELECT coalesce(sum(value::numeric), 0) FROM jsonb_each_text(CASE WHEN jsonb_typeof(s.save->'stars') = 'object' THEN s.save->'stars' ELSE '{}'::jsonb END))::int AS stars," +
    " CASE WHEN jsonb_typeof(s.save->'wallet') = 'number' THEN (s.save->>'wallet')::numeric::bigint END AS wallet," +
    " p.sessions_count AS sessions, p.events_count AS events, p.last_event_at, ls.started_at AS last_session_at, ls.ended_by AS last_session_end" +
    " FROM trail_players p LEFT JOIN trail_saves s ON s.player_id = p.id LEFT JOIN trail_allowlist a ON a.discord_id = p.discord_id" +
    " LEFT JOIN LATERAL (SELECT x.started_at, x.ended_by FROM trail_sessions x WHERE x.player_id = p.id ORDER BY x.started_at DESC LIMIT 1) ls ON true" +
    " ORDER BY p.last_seen_at DESC, p.id DESC LIMIT $1", [limit]);
  return r.rows;
}
async function listEvents(pool, did, limit) {
  const r = await pool.query(
    "SELECT e.at, e.type, e.level, e.detail, p.discord_id, p.display_name FROM trail_events e JOIN trail_players p ON p.id = e.player_id" +
    " WHERE ($1::text IS NULL OR p.discord_id = $1) ORDER BY e.at DESC, e.id DESC LIMIT $2", [did, limit]);
  return r.rows.map((e) => ({ at: ms(e.at), type: e.type, level: e.level, detail: e.detail, discordId: e.discord_id, displayName: e.display_name }));
}
async function listAudit(pool, limit) {
  return (await pool.query("SELECT at, actor, action, target, detail FROM trail_audit_log ORDER BY at DESC, id DESC LIMIT $1", [limit])).rows
    .map((a) => ({ at: ms(a.at), actor: a.actor, action: a.action, target: a.target, detail: a.detail }));
}
async function namesForPseudonyms(pool, pseudoOf, limit) {
  const out = new Map();
  for (const p of (await pool.query("SELECT discord_id, display_name, pseudo_salt FROM trail_players ORDER BY last_seen_at DESC LIMIT $1", [limit])).rows)
    out.set(pseudoOf(p.discord_id, p.pseudo_salt), p.display_name || p.discord_id);
  return out;
}

const EVENT_SQL = "INSERT INTO trail_events (player_id, session_id, type, level, detail, client_event_id)" +
  " SELECT $1, (SELECT id FROM trail_sessions WHERE id = $2 AND player_id = $1), $3, $4, $5, $6" +
  " ON CONFLICT (player_id, client_event_id) DO NOTHING RETURNING id";
const EVENTS_PER_PLAYER = 50000;
async function insertEvents(q, playerId, sid, events) {
  if (!events.length) return 0;
  if (!(await q.query("SELECT 1 FROM trail_players WHERE id = $1 FOR UPDATE", [playerId])).rows.length) return 0;
  let n = 0;
  for (const e of events) {
    const r = await q.query(EVENT_SQL, [playerId, sid || null, e.type, e.level === undefined ? null : e.level, JSON.stringify(e.detail || {}), e.key]);
    n += r.rows.length;
  }
  if (!n) return 0;
  const total = (await q.query("UPDATE trail_players SET events_count = events_count + $2, last_event_at = now() WHERE id = $1 RETURNING events_count", [playerId, n])).rows[0];
  if (total && total.events_count > EVENTS_PER_PLAYER) {
    const over = total.events_count - EVENTS_PER_PLAYER;
    const d = await q.query("DELETE FROM trail_events WHERE id IN (SELECT id FROM trail_events WHERE player_id = $1 ORDER BY at, id LIMIT $2)", [playerId, over]);
    if (d.rowCount) await q.query("UPDATE trail_players SET events_count = GREATEST(0, events_count - $2) WHERE id = $1", [playerId, d.rowCount]);
  }
  return n;
}
async function insertClientEvents(pool, playerId, sid, events) {
  const list = events.filter((e) => CLIENT_EVENTS.has(e.type));
  return tx(pool, async (c) => ({ offered: list.length, inserted: await insertEvents(c, playerId, sid, list) }));
}
const RATE_CHUNK = 5000;
async function saveRates(pool, rows) {
  return tx(pool, async (c) => {
    await c.query("DELETE FROM trail_rate_snapshot");
    for (let i = 0; i < rows.length; i += RATE_CHUNK) {
      const part = rows.slice(i, i + RATE_CHUNK);
      await c.query("INSERT INTO trail_rate_snapshot (name, key, count, reset_at) SELECT n, k, c, to_timestamp(r / 1000.0)"
        + " FROM unnest($1::text[], $2::text[], $3::int[], $4::float8[]) AS t(n, k, c, r) ON CONFLICT (name, key) DO NOTHING",
        [part.map((r) => r.name), part.map((r) => r.key), part.map((r) => r.count), part.map((r) => r.reset)]);
    }
    return rows.length;
  });
}
async function takeRates(pool) {
  const r = await pool.query("DELETE FROM trail_rate_snapshot RETURNING name, key, count, (extract(epoch FROM reset_at) * 1000)::float8 AS reset");
  return r.rows.filter((x) => x.reset > Date.now());
}
const PURGE_BATCH = 5000;
async function purge(pool, retentionDays) {
  let events = 0;
  for (;;) {
    const n = await tx(pool, async (c) => (await c.query(
      "WITH d AS (DELETE FROM trail_events WHERE id IN (SELECT id FROM trail_events WHERE at < now() - make_interval(days => $1) ORDER BY at LIMIT $2) RETURNING player_id)," +
      " g AS (SELECT player_id, count(*)::int AS n FROM d GROUP BY player_id)," +
      " u AS (UPDATE trail_players p SET events_count = GREATEST(0, p.events_count - g.n) FROM g WHERE p.id = g.player_id RETURNING 1)" +
      " SELECT count(*)::int AS n FROM d", [retentionDays, PURGE_BATCH])).rows[0].n);
    events += n;
    if (n < PURGE_BATCH) break;
  }
  const tombstones = (await pool.query("DELETE FROM trail_access_tombstones WHERE expires_at <= now()")).rowCount;
  return { events, tombstones };
}

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const obj = (v) => (isObj(v) ? v : {});
const SAFE_KEY = /^[A-Za-z0-9_-]{1,48}$/;
function diffEvents(prev, next, rev, cat) {
  const out = [], P = obj(prev), N = obj(next), imported = !prev;
  const add = (key, type, level, detail) => { if (out.length < 100) out.push({ key: "s:" + key, type, level, detail: imported ? Object.assign({ imported: true }, detail) : detail }); };
  const ps = obj(P.stars), pb = obj(P.best), nb = obj(N.best);
  for (const lv of Object.keys(obj(N.stars))) {
    if (!/^\d{1,3}$/.test(lv)) continue;
    const a = N.stars[lv], b = ps[lv], t = nb[lv], tb = pb[lv];
    if (b !== undefined && !(Number(a) > Number(b)) && !(t !== undefined && (tb === undefined || Number(t) < Number(tb)))) continue;
    add("lf:" + lv + ":" + a + ":" + (t === undefined ? "" : t), "level_finished", Number(lv), { stars: a, time: t === undefined ? null : t });
  }
  const leaves = (tree) => {
    const s = new Set();
    for (const [k, v] of Object.entries(obj(tree))) {
      if (!SAFE_KEY.test(k)) continue;
      if (v === true) s.add(k);
      else for (const [k2, v2] of Object.entries(obj(v))) if (v2 === true && SAFE_KEY.test(k2)) s.add(k + ":" + k2);
    }
    return s;
  };
  const pBadges = leaves(P.badges);
  for (const b of leaves(N.badges)) if (!pBadges.has(b)) add("bd:" + b, "badge_earned", null, { badge: b });
  const fresh = (a, b) => Object.keys(obj(a)).filter((k) => obj(a)[k] === true && obj(b)[k] !== true && SAFE_KEY.test(k));
  for (const id of fresh(obj(N.cos).owned, obj(P.cos).owned)) if (cat.cosPrice.has(id)) add("cb:" + id, "item_bought", null, { kind: "cosmetic", id, price: cat.cosPrice.get(id) });
  for (const id of fresh(N.up, P.up)) add("ub:" + id, "item_bought", null, { kind: "upgrade", id });
  for (const id of fresh(N.chars, P.chars)) {
    if (cat.charPrice.has(id)) add("hb:" + id, "character_bought", null, { id, price: cat.charPrice.get(id) });
    else add("hu:" + id, "character_unlocked", null, { id });
  }
  if (typeof N.char === "string" && N.char && N.char !== P.char && SAFE_KEY.test(N.char)) add("hc:" + rev, "character_changed", null, { id: N.char });
  for (const k of fresh(obj(N.trail).endings, obj(P.trail).endings)) add("en:" + k, "ending_reached", null, { ending: k });
  return out;
}

async function forget(pool, did, tomb, pseudo, tombDays, cooldownMs) {
  return tx(pool, async (c) => {
    await lockPerson(c, did);
    await c.query(
      "INSERT INTO trail_access_tombstones (did_hash, denials, last_decided_at, expires_at)" +
      " SELECT $2, h.denials, GREATEST(h.denied_at, h.revoked_at, h.asked_at)," +
      " CASE WHEN h.denials > 0 OR h.revoked_at IS NOT NULL THEN now() + make_interval(days => $3) ELSE now() + make_interval(secs => $4::double precision / 1000) END FROM (SELECT" +
      " count(*) FILTER (WHERE status = 'denied')::int AS denials, max(decided_at) FILTER (WHERE status = 'denied') AS denied_at," +
      " CASE WHEN bool_or(status = 'pending') THEN now() END AS asked_at," +
      " (SELECT revoked_at FROM trail_allowlist WHERE discord_id = $1) AS revoked_at FROM trail_access_requests WHERE discord_id = $1) h" +
      " WHERE h.denials > 0 OR h.revoked_at IS NOT NULL OR h.asked_at IS NOT NULL" +
      " ON CONFLICT (did_hash) DO UPDATE SET" +
      " denials = EXCLUDED.denials + CASE WHEN trail_access_tombstones.expires_at > now() THEN trail_access_tombstones.denials ELSE 0 END," +
      " last_decided_at = GREATEST(trail_access_tombstones.last_decided_at, EXCLUDED.last_decided_at)," +
      " expires_at = GREATEST(trail_access_tombstones.expires_at, EXCLUDED.expires_at)",
      [did, tomb, tombDays, cooldownMs]);
    await c.query("DELETE FROM trail_players WHERE discord_id = $1", [did]);
    await c.query("DELETE FROM trail_allowlist WHERE discord_id = $1", [did]);
    await c.query("DELETE FROM trail_access_requests WHERE discord_id = $1", [did]);
    await audit(c, pseudo, "player.forget", pseudo, {});
  });
}

module.exports = { CLIENT_EVENTS, EVENTS_PER_PLAYER, tx, memberRow, signIn, logout, accessStatus, createAccessRequest, setNotify, unsentRequests, markSent, requestDiscordId, listRequests, decideAccess, revoke,
  listPlayers, listEvents, listAudit, namesForPseudonyms, insertEvents, insertClientEvents, saveRates, takeRates, purge, diffEvents, forget };
