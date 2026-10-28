# Accounts: sign-in, approvals, saves and the play record

## Status: no login, the account server is not used

The live game has no login and no approvals. Players open the link and play; their progress lives only in their
browser (`localStorage`). Nothing about a player is sent to any server.

- The web service (`Caddyfile`) no longer passes anything to the account server. Every `/api` and `/api/*` address
  answers `404`, so nobody can sign in, ask for access, reach an owner page or send or receive a save.
- Every old sign-in address (`/login`, `/login/...`) redirects to `/`. Only the "temporarily unavailable" page and
  its stylesheet and fonts are still served under `/login/`.
- The sign-in page, its script and its privacy page are deleted. `site/engine/account-sync.js` keeps only the local
  save migration between game versions; it sends nothing.
- `test/login-check.js` (part of `npm test`) fails if any of this comes back.

The server code below (`server/`, `Dockerfile.api`, migrations) is kept in the repo, unused. Still on the host, for
the owner to decide whether to keep, export or delete:

1. The account server service (built from `Dockerfile.api`). It can no longer be reached through the game's address,
   but it still runs if the host keeps it on, and any public address the host gave it directly still answers.
2. The Postgres database and its data: players who signed in with Discord (Discord user ID, display name, username),
   sessions, access requests and decisions, saves, the play record and the audit log.
3. Its variables: `DATABASE_URL`, `SESSION_SECRET`, `AUDIT_PSEUDO_SECRET`, `DISCORD_CLIENT_ID`,
   `DISCORD_CLIENT_SECRET`, `PUBLIC_URL`, `OWNER_DISCORD_ID`, `TRAIL_PROXY_KEY`, `DISCORD_WEBHOOK_URL`,
   `TRAIL_API_ENABLED`, `TRAIL_ALL_CHARS_DISCORD_IDS`, `TRAIL_SITE_DIR`, and the owner bot link `OWNER_BOT_URL`,
   `OWNER_BOT_SECRET`, `OWNER_BOT_HEADER_PREFIX`.
4. On the web service: `TRAIL_API_UPSTREAM` and `TRAIL_PROXY_KEY`, which are no longer read.
5. The Discord application (its client ID and secret, and its redirect address), the Discord webhook that told the
   owner about access requests, and the owner bot that carried access decisions (`/api/internal/access-decision`).
6. The players listed in `TRAIL_ALL_CHARS_DISCORD_IDS` got every character through their sign-in; without sign-in
   they see the same characters as everyone else.

Everything below describes how the account server worked when it was in use.

## How it worked

The account server of Bitfoot: The Hunt (`server/api/server.js`, built by `Dockerfile.api`) runs as its own service
next to the static site (`Caddyfile`). It does four jobs:

1. **The lock.** No page of the game is served until the visitor has signed in with Discord and the owner has
   approved them. Caddy asks `GET /api/gate` before serving any file.
2. **Approvals.** A signed-in visitor who is not approved can press Request access on `/login`. The owner sees the
   request on the owner page and approves or denies it.
3. **The save on every device.** An approved player's save is merged with the server's copy and kept there.
4. **The play record.** Every sign-in and sign-out, and what each player does in the game, is recorded for the owner.

Its only npm dependency is `pg`, pinned by `server/package-lock.json`.

## How approvals work

1. The visitor signs in with Discord (scope `identify` only). Every sign-in writes a session row, approved or not.
2. Not approved: `/login` shows Request access. Pressing it stores one pending request with the person's Discord
   display name and username. Asking again while it is pending changes nothing. After a denial or a revoke the
   person may ask again after one hour. Forgetting the account does not reset that wait or the count of earlier
   denials, and forgetting while a request is waiting starts the same one-hour wait (see "Forget").
3. If `DISCORD_WEBHOOK_URL` is set, the owner gets a Discord message naming only the display name and a link to the
   owner page. It never pings anyone. Without the variable, nothing is sent and the request waits on the owner page.
4. The owner opens `/api/owner/`, signed in with the Discord account in `OWNER_DISCORD_ID` with Discord two-factor
   authentication turned on, and presses Approve or Deny. Each decision applies once. A repeated Approve never
   re-adds someone the owner revoked since.
5. Revoke (on the Players list) locks the person out from their very next request and ends every cookie they had.
   If they are approved again later, they sign in again; an old cookie never comes back to life.

The owner is always let in and never needs an approval.

## Owner routes

Every owner route checks, in its own handler, that the session is the owner's and that the owner signed in with
Discord two-factor authentication on. Anyone else gets `401` (signed out) or `403` (signed in). The page and its two
files answer `404` to anyone but the owner. Every change is a `POST` that must carry this site's `Origin`, and every
change writes one row to the audit log.

| Route | What it does |
| --- | --- |
| `GET /api/owner/` | The owner page (plain HTML; its script and styles are separate files, no inline script). |
| `GET /api/owner/requests` | Pending access requests. `?status=all` includes decided ones. |
| `POST /api/owner/requests/<id>/approve` | Approve one request. A repeat answers `changed: false`. |
| `POST /api/owner/requests/<id>/deny` | Deny one request. A repeat answers `changed: false`. |
| `GET /api/owner/players` | Everyone who signed in: name, username, Discord id, access, levels, stars, ZEC, sessions, stored events, last seen, and when the last session started and how it ended (open, signed out, revoked). |
| `POST /api/owner/players/<discord id>/revoke` | Revoke access. Open sessions end. A repeat answers `changed: false`. |
| `GET /api/owner/events` | Recent gameplay events. `?player=<discord id>` for one player, `?limit=` up to 500. |
| `GET /api/owner/audit` | Recent audit log rows. |

## Player routes

| Route | Who | What it does |
| --- | --- | --- |
| `GET /health` | anyone | `ok` |
| `GET /api/gate` | Caddy | `204` for the owner or an approved player, otherwise a redirect to `/login`. |
| `GET /api/me` | anyone | `{ enabled, discord, user }`; `user` only for an approved player. |
| `GET /api/auth/discord`, `GET /api/auth/discord/callback` | anyone | The Discord sign-in round trip. |
| `GET /api/access/status`, `POST /api/access/request` | signed in | What `/login` shows; Request access. |
| `GET /api/save`, `PUT /api/save` | approved | Read or push the save. |
| `POST /api/events` | approved | Gameplay events from the browser (below). |
| `POST /api/logout` | signed in | Signs out every device of this person and ends their session rows. |
| `POST /api/forget` | signed in | Deletes everything stored about this person (below). |

Any other path is `404`; another method is `405`.

## The play record

Events come from two places:

- **The server**, when a save push changes the save: `level_finished` (stars and time), `badge_earned`,
  `item_bought` (a priced cosmetic or an upgrade), `character_bought`, `character_unlocked`, `character_changed`
  and `ending_reached`. Records that were already in the first copy a device pushes are marked `imported`.
- **The browser**, through `BH.track(type, data)` in `site/engine/account-sync.js`: `level_start`, `level_fail` and
  `level_quit`. Calls are queued and sent in batches of up to 20 (and when the page is hidden or closed). The
  function never throws, never waits, and does nothing for a visitor who is not a signed-in approved player. A call
  with another type or a level that does not exist is dropped; a data field that is not a short plain text, a number
  or true/false is left out.

Every event has an id that is unique per player, so a retried batch or a repeated save push is stored once. The
server checks every event: a known type, a level that exists, at most 8 flat data fields (numbers, true/false, short
text). Batches are capped at 50 events and 16 KB, and at 60 batches per player per 10 minutes.

There is no daily cap: the per-player limit of 60 batches per 10 minutes is the only limit on how many events a
player sends. What is stored has a ceiling instead: at most 50,000 events per player. When a write takes a player
past it, that player's oldest events are deleted in the same transaction, so one player can never grow the database
without end. A real player stays far below it: a level attempt writes about 2 events, so 50,000 is about 25,000
attempts inside the 400 days events are kept, more than 60 attempts every day for 13 months. A script at the batch
limit (18,000 events an hour) reaches it in about three hours and from then on only replaces its own oldest rows.

Every rate limit (per address, per player, per Discord account and the owner's) is kept in memory. When the server
is stopped gracefully, for example on a redeploy, it writes the live counters (at most 20,000, the limiter with the fewest
counters first, so under a flood the biggest one, normally the per-address limit, is the one cut) to `trail_rate_snapshot`; the next start loads the ones
whose window has not ended and empties the table. Because a new server can start before the old one has stopped,
the new one reads the table again 15 seconds, 45 seconds and 2 minutes after it starts; a counter it already holds
keeps the higher of the two counts. Events older than 400 days are deleted when the server starts and once every
24 hours after that. The players list counts only the events still stored.

## Tables

Every table and function this server makes starts with `trail_`, and the schema version lives in
`trail_schema_migrations`. It never creates, reads, changes or drops a table without that prefix, so the same Postgres
can hold another app's tables untouched.

| Table | What it holds |
| --- | --- |
| `trail_players` | One row per person who signed in: Discord id, display name, username, when the row was made, last seen, last sign-out or revoke, a random per-person audit salt, and running counts of sessions and stored events. |
| `trail_saves` | The save of each player (at most 48,000 bytes once merged) and the counters of its last 32 pushes. |
| `trail_allowlist` | Who is approved, by whom, from which request, and any revoke. |
| `trail_access_requests` | Every access request: name, username, status, the notification state, the decision. One pending request per person. |
| `trail_sessions` | Every sign-in: start, end, how it ended (`logout`, `revoke`), and keyed hashes of the address and the browser. |
| `trail_events` | The play record above. |
| `trail_access_tombstones` | Only for a person who was denied or revoked, or had a request waiting, and then used Forget: a keyed hash of the Discord id, the number of denials, when the last decision (or the forget of a waiting request) was, and when the row expires (180 days after the forget, or one hour for a waiting request only). No name, no id. |
| `trail_rate_snapshot` | Empty while the server runs. Between a graceful stop and the next start: each rate-limit counter that was live, keyed by a keyed hash of the address or Discord id, an internal player number, or `owner`; its count and when its window ends. |
| `trail_audit_log` | Every request, decision, revoke and forget. It names people only by a keyed pseudonym (`p:...`), never a Discord id or a name. The pseudonym is keyed with the person's own random salt, so it can be tied back to a name only while their player row exists. The database refuses any `UPDATE`, `DELETE` or `TRUNCATE` on it. |

Names are read only by the owner routes. No email, avatar, Discord token, raw address or raw browser string is stored.

## Forget

`POST /api/forget` deletes, in one transaction, every row naming that Discord id: the player row with its save,
sessions and events, the allowlist entry and every access request. Deleting the player row also deletes the person's
audit salt, so the audit rows written before the forget can never be tied to them again, not even if they sign up
again with the same Discord account. The forget itself is logged under a fresh random pseudonym. Every cookie of the
site is cleared, and every older copy of the session cookie is refused from then on, including after the person signs
in again. A forgotten person is no longer approved and has to request access again.

If the person had been denied or revoked, one row is kept in `trail_access_tombstones` so that Forget cannot be used
to skip the one-hour wait or hide earlier denials. It holds a keyed hash of the Discord id, never the id itself, and
is deleted 180 days after the forget.

If the person had a request waiting, the same kind of row is kept for one hour, so that asking, forgetting and asking
again cannot send the owner a new notification each time. Signing in again during that hour shows the one-hour wait
on `/login`. An approved person who forgets keeps no row and may ask again at once.

## How two devices merge

The rule is in `save.js`. The server does the merge in one locked transaction, and the browser adopts the answer.

- **Merged by max:** stars, best ZEC per level, refunds.
- **Merged by min:** best time.
- **Union:** medals, badges, story acts, owned cosmetics, owned characters.
- **Latest push wins:** what is worn.
- **The story state (clues, the loan):** comes whole from the side with more levels cleared, plus the union of
  endings.
- **Wallet and carried items:** merged three-way, like a bank. The result is server + (this device - what this device
  was based on). The base is looked up in the server's own history, never taken from the browser.

The wallet is then capped. It can never go above:

    sum of best ZEC per level (+ refunds, + 2 once the camp loan happened)
      - the price of every cosmetic and character the player bought

So two devices that cleared the same level are paid once. ZEC that was spent never comes back through a stale
device.

This rule stops merging from making ZEC. It is not an anti-cheat: the game has no server replay, so a player who
edits their own browser storage can still claim what they did not earn.

**The save is trusted from the browser.** Stars, times, ZEC, badges and the events that come from them are what the
player's browser says. They are good for the owner's view of how people play, but they are not tamper-proof: never
use them to hand out prizes, money or rewards, or to rank players on a public leaderboard.

**Kept on the device only, never sent:** `last` (the end-card cache), `loadout`, `soundVol`, and any field `save.js`
does not list. A new save field syncs only once it is added to `save.js` (`normalize` and `merge`) and to `SYNCED`
in `site/engine/account-sync.js`.

## Env var names

On the account server (`server/api`):

| Name | Needed | What it is |
| --- | --- | --- |
| `DATABASE_URL` | yes | The Postgres connection string. |
| `SESSION_SECRET` | yes | At least 32 random characters. Signs the session cookie and keys the address and browser hashes; changing it signs everyone out. |
| `AUDIT_PSEUDO_SECRET` | recommended | At least 32 random characters. Keys the audit pseudonyms and the forget tombstones. Without it they are keyed from `SESSION_SECRET`, so changing that secret would also break the owner page's names on old audit rows and void every tombstone. Set it once and never change it. |
| `OWNER_DISCORD_ID` | yes | The owner's Discord user id. Without it nobody can use the owner page. |
| `DISCORD_CLIENT_ID` | yes | The Discord app used for sign-in. |
| `DISCORD_CLIENT_SECRET` | yes | |
| `PUBLIC_URL` | yes | The site's public origin. The Discord return address is built from it. |
| `TRAIL_PROXY_KEY` | yes | At least 32 random characters, the same value as on the site service. With Discord sign-in on, the server refuses to start without it. |
| `DISCORD_WEBHOOK_URL` | no | A Discord webhook address for the owner's new-request message. Off when unset. |
| `TRAIL_ALL_CHARS_DISCORD_IDS` | no | Comma-separated Discord ids of testers who may wear every Bitfoot from the start. |
| `TRAIL_API_ENABLED` | no | `0` turns the server off: `/api/me` says `enabled:false` and the gate answers `503`. |
| `PG_POOL_MAX` | no | Default 5, at most 10. |
| `PORT` | no | Default 8080. |
| `RAILWAY_DOCKERFILE_PATH` | yes, on Railway | `Dockerfile.api` (the site service uses `Dockerfile`). |

`TRAIL_SITE_DIR` (default `site/` next to `server/`) holds the game files the level count and prices are read from.
`TRAIL_API_DEBUG_ERRORS=1` is for tests only. So is `TRAIL_RATE_RECHECK_MS` (when, after a start, the saved rate
limits are read again; default `15000,45000,120000`).

On the site service (`Caddyfile`): `TRAIL_API_UPSTREAM` (the account server's private address and port) and
`TRAIL_PROXY_KEY`.

In the Discord developer portal, add `<PUBLIC_URL>/api/auth/discord/callback` to the OAuth2 redirects of the app in
`DISCORD_CLIENT_ID`.

## Network

The site forwards each visitor's address to the account server in `X-Bf-Client-Ip`. It is used for rate limits and
for the hashed address on a session row, so it must only be believed when it comes from the site:

- `TRAIL_PROXY_KEY` must be set to the same value on both services. The account server believes the header only when
  the request also carries the matching `X-Bf-Proxy-Key`. The site sets both headers itself and overwrites any value a
  visitor sends. A request without the key is counted under the address it really came from.
- With Discord sign-in on, the account server refuses to start without `TRAIL_PROXY_KEY`.

The account server should still have no public domain: visitors reach it only through the site's `/api/*`.

## Database roles

The server applies its own migrations when it starts. Use two Postgres roles:

1. **Owner role** (owns the `trail_` tables). Start the account server once with `DATABASE_URL` pointing at this role,
   after every update that adds a migration. It creates or changes the tables and stops being needed.
2. **App role** (what the server runs with day to day). Give it only:

       GRANT USAGE ON SCHEMA public TO trail_app;
       GRANT SELECT, INSERT, UPDATE, DELETE ON trail_players, trail_saves, trail_allowlist, trail_access_requests,
         trail_sessions, trail_events, trail_access_tombstones TO trail_app;
       GRANT SELECT, INSERT ON trail_audit_log TO trail_app;
       GRANT SELECT ON trail_schema_migrations TO trail_app;
       GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO trail_app;

   Then switch `DATABASE_URL` to this role. It cannot create, change or drop tables, and it cannot touch an audit row
   it wrote. If an update adds a migration, the app role cannot apply it and the server stops with a database error:
   run step 1 again, then grant the app role any new table.

The site and the account server both send `Strict-Transport-Security`, `Content-Security-Policy` (`script-src 'self'`,
no inline script), `X-Frame-Options: DENY` and the other security headers. Every database statement times out after
5 seconds.

## Run the checks

    npm ci --prefix server --omit=dev --ignore-scripts
    NODE_OPTIONS=--max-old-space-size=2048 timeout 400 node test/api-check.js
    NODE_OPTIONS=--max-old-space-size=2048 timeout 300 node test/api-owner-check.js

The checks need the Postgres server programs (`initdb`, `pg_ctl`) on PATH or in `PG_BIN`. Each starts a throwaway
Postgres on 127.0.0.1 and deletes it afterwards. Discord is replaced by `test/api-fake-discord.js`. After the
real run, each check breaks the server on purpose, one way at a time, and expects the matching checks to fail.
