"use strict";

const MIGRATION_LOCK = 7245031;

const MIGRATIONS = [
  {
    version: 1,
    name: "trail players and saves",
    sql: [
      `CREATE TABLE trail_players (
        id            BIGSERIAL PRIMARY KEY,
        discord_id    TEXT NOT NULL UNIQUE CHECK (discord_id ~ '^[0-9]{5,25}$'),
        session_cut   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE trail_saves (
        player_id   BIGINT PRIMARY KEY REFERENCES trail_players (id) ON DELETE CASCADE,
        gen         UUID NOT NULL DEFAULT gen_random_uuid(),
        rev         INTEGER NOT NULL DEFAULT 0 CHECK (rev >= 0),
        save        JSONB NOT NULL CHECK (octet_length(save::text) <= 65536),
        history     JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(history) = 'array' AND jsonb_array_length(history) <= 32),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    version: 2,
    name: "own approvals, sessions, events and audit log",
    sql: [
      `ALTER TABLE trail_players
        ADD COLUMN display_name    TEXT CHECK (char_length(display_name) <= 64),
        ADD COLUMN username        TEXT CHECK (char_length(username) <= 40),
        ADD COLUMN pseudo_salt     UUID NOT NULL DEFAULT gen_random_uuid(),
        ADD COLUMN sessions_count  INTEGER NOT NULL DEFAULT 0 CHECK (sessions_count >= 0),
        ADD COLUMN events_count    INTEGER NOT NULL DEFAULT 0 CHECK (events_count >= 0),
        ADD COLUMN last_event_at   TIMESTAMPTZ`,
      `CREATE TABLE trail_access_tombstones (
        did_hash         TEXT PRIMARY KEY CHECK (char_length(did_hash) BETWEEN 16 AND 64),
        denials          INTEGER NOT NULL DEFAULT 0 CHECK (denials >= 0),
        last_decided_at  TIMESTAMPTZ NOT NULL,
        expires_at       TIMESTAMPTZ NOT NULL
      )`,
      "CREATE INDEX trail_access_tombstones_by_expiry ON trail_access_tombstones (expires_at)",
      `CREATE TABLE trail_allowlist (
        discord_id  TEXT PRIMARY KEY CHECK (discord_id ~ '^[0-9]{5,25}$'),
        added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        added_by    TEXT NOT NULL CHECK (char_length(added_by) <= 32),
        request_id  UUID,
        revoked_at  TIMESTAMPTZ,
        revoked_by  TEXT CHECK (char_length(revoked_by) <= 32)
      )`,
      `CREATE TABLE trail_access_requests (
        id                BIGSERIAL PRIMARY KEY,
        public_id         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        discord_id        TEXT NOT NULL CHECK (discord_id ~ '^[0-9]{5,25}$'),
        display_name      TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 64),
        username          TEXT NOT NULL CHECK (char_length(username) <= 40),
        status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
        notify            TEXT NOT NULL DEFAULT 'off' CHECK (notify IN ('off', 'queued', 'delivered', 'failed')),
        previous_denials  INTEGER NOT NULL DEFAULT 0 CHECK (previous_denials >= 0),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        decided_at        TIMESTAMPTZ,
        decided_by        TEXT CHECK (char_length(decided_by) <= 32),
        CHECK ((status = 'pending') = (decided_at IS NULL))
      )`,
      "CREATE UNIQUE INDEX trail_access_requests_one_pending ON trail_access_requests (discord_id) WHERE status = 'pending'",
      "CREATE INDEX trail_access_requests_by_person ON trail_access_requests (discord_id, created_at DESC)",
      "CREATE INDEX trail_access_requests_by_time ON trail_access_requests (created_at DESC)",
      `CREATE TABLE trail_sessions (
        id          BIGSERIAL PRIMARY KEY,
        player_id   BIGINT NOT NULL REFERENCES trail_players (id) ON DELETE CASCADE,
        started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        ended_at    TIMESTAMPTZ,
        ended_by    TEXT CHECK (ended_by IN ('logout', 'revoke')),
        ip_hash     TEXT CHECK (char_length(ip_hash) <= 32),
        ua_hash     TEXT CHECK (char_length(ua_hash) <= 32),
        CHECK ((ended_at IS NULL) = (ended_by IS NULL))
      )`,
      "CREATE INDEX trail_sessions_by_player ON trail_sessions (player_id, started_at DESC)",
      "CREATE INDEX trail_sessions_open ON trail_sessions (player_id) WHERE ended_at IS NULL",
      `CREATE TABLE trail_events (
        id               BIGSERIAL PRIMARY KEY,
        player_id        BIGINT NOT NULL REFERENCES trail_players (id) ON DELETE CASCADE,
        session_id       BIGINT REFERENCES trail_sessions (id) ON DELETE SET NULL,
        at               TIMESTAMPTZ NOT NULL DEFAULT now(),
        type             TEXT NOT NULL CHECK (type IN ('level_start', 'level_fail', 'level_quit', 'level_finished', 'badge_earned', 'item_bought',
                           'character_bought', 'character_unlocked', 'character_changed', 'ending_reached')),
        level            INTEGER CHECK (level BETWEEN 1 AND 999),
        detail           JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object' AND octet_length(detail::text) <= 2048),
        client_event_id  TEXT NOT NULL CHECK (char_length(client_event_id) BETWEEN 4 AND 128),
        UNIQUE (player_id, client_event_id)
      )`,
      "CREATE INDEX trail_events_by_time ON trail_events (at DESC)",
      "CREATE INDEX trail_events_by_player ON trail_events (player_id, at DESC)",
      "CREATE INDEX trail_events_by_session ON trail_events (session_id)",
      `CREATE TABLE trail_audit_log (
        id      BIGSERIAL PRIMARY KEY,
        at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        actor   TEXT NOT NULL CHECK (char_length(actor) <= 48),
        action  TEXT NOT NULL CHECK (char_length(action) <= 48),
        target  TEXT CHECK (char_length(target) <= 48),
        detail  JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object')
      )`,
      "CREATE INDEX trail_audit_log_by_time ON trail_audit_log (at DESC)",
      "CREATE INDEX trail_audit_log_by_action ON trail_audit_log (action, at DESC)",
      `CREATE OR REPLACE FUNCTION trail_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'trail_audit_log is append-only'; END $$`,
      "CREATE TRIGGER trail_audit_log_no_change BEFORE UPDATE OR DELETE ON trail_audit_log FOR EACH ROW EXECUTE FUNCTION trail_audit_append_only()",
      "CREATE TRIGGER trail_audit_log_no_truncate BEFORE TRUNCATE ON trail_audit_log FOR EACH STATEMENT EXECUTE FUNCTION trail_audit_append_only()",
    ],
  },
  {
    version: 3,
    name: "rate limits kept across a restart",
    sql: [
      `CREATE TABLE trail_rate_snapshot (
        name      TEXT NOT NULL CHECK (char_length(name) <= 24),
        key       TEXT NOT NULL CHECK (char_length(key) <= 64),
        count     INTEGER NOT NULL CHECK (count >= 1),
        reset_at  TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (name, key)
      )`,
    ],
  },
];

async function migrate(pool) {
  const latest = MIGRATIONS[MIGRATIONS.length - 1].version;
  MIGRATIONS.forEach((m, i) => { if (m.version !== i + 1) throw new Error("migrations must be numbered 1, 2, 3 ... in order"); });
  const t = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' AND table_name LIKE 'trail\\_%'");
  const tables = t.rows.map((r) => r.table_name);
  if (tables.length > 0 && !tables.includes("trail_schema_migrations"))
    throw new Error("DATABASE_URL holds trail_ tables this server did not make (no trail_schema_migrations table); refusing to touch it");
  let from = null, made = tables.includes("trail_schema_migrations");
  for (const m of MIGRATIONS) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK]);
      if (!made) { await c.query("CREATE TABLE IF NOT EXISTS trail_schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"); made = true; }
      const v = Number((await c.query("SELECT coalesce(max(version), 0) AS v FROM trail_schema_migrations")).rows[0].v);
      if (from === null) from = v;
      if (v > latest) throw new Error("the database was written by a newer version of the account server (schema " + v + ", this is " + latest + "); refusing to start");
      if (v >= m.version) { await c.query("COMMIT"); continue; }
      for (const sql of m.sql) await c.query(sql);
      await c.query("INSERT INTO trail_schema_migrations (version, name) VALUES ($1, $2)", [m.version, m.name]);
      await c.query("COMMIT");
    } catch (e) {
      try { await c.query("ROLLBACK"); } catch (e2) {  }
      throw e;
    } finally { c.release(); }
  }
  return { from: from || 0, to: latest };
}

module.exports = { MIGRATIONS, migrate, MIGRATION_LOCK };
