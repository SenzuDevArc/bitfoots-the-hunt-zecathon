"use strict";

const crypto = require("crypto");

const SEC_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; connect-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), midi=(), accelerometer=(), gyroscope=(), magnetometer=(), display-capture=(), screen-wake-lock=(), idle-detection=(), publickey-credentials-get=(), xr-spatial-tracking=(), browsing-topics=(), private-state-token-issuance=(), private-state-token-redemption=(), local-fonts=(), window-management=(), web-share=(self), clipboard-write=(self), fullscreen=(self), autoplay=(self)",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Frame-Options": "DENY",
};

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const mac = (key, text) => crypto.createHmac("sha256", key).update(text).digest();
function makeSafeEqual(cmpKey) {
  return function safeEqual(a, b) { if (typeof a !== "string" || typeof b !== "string") return false; return crypto.timingSafeEqual(mac(cmpKey, a), mac(cmpKey, b)); };
}
function seal(key, obj) { const body = b64u(JSON.stringify(obj)); return body + "." + b64u(mac(key, body)); }
function unseal(key, value) {
  if (typeof value !== "string" || value.length > 1024) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const body = value.slice(0, dot);
  let given; try { given = Buffer.from(value.slice(dot + 1), "base64url"); } catch (e) { return null; }
  const want = mac(key, body);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;
  try { const o = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); return o && typeof o === "object" ? o : null; } catch (e) { return null; }
}

const SESSION_ID_RE = /^d:\d{5,25}$/;
function readSession(sessionKey, value) {
  const o = unseal(sessionKey, value);
  if (!o || typeof o.id !== "string" || typeof o.name !== "string" || o.via !== "discord" || !SESSION_ID_RE.test(o.id)) return null;
  if (typeof o.exp !== "number" || Date.now() > o.exp) return null;
  const user = { id: o.id, name: o.name, via: o.via, iat: typeof o.iat === "number" ? o.iat : 0 };
  if (o.mfa === true) user.mfa = true;
  if (Number.isSafeInteger(o.sid) && o.sid > 0) user.sid = o.sid;
  return user;
}
function sessionValue(sessionKey, user, days) {
  const maxAge = days * 24 * 60 * 60;
  const iat = Date.now();
  const o = { id: user.id, name: user.name, via: user.via, iat, exp: iat + maxAge * 1000 };
  if (user.mfa === true) o.mfa = true;
  if (Number.isSafeInteger(user.sid) && user.sid > 0) o.sid = user.sid;
  return { value: seal(sessionKey, o), maxAge };
}

function cookiesOf(req) {
  const out = Object.create(null), raw = req.headers.cookie;
  if (typeof raw !== "string" || raw.length > 4096) return out;
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const k = part.slice(0, eq).trim();
    if (!(k in out)) out[k] = part.slice(eq + 1).trim();
  }
  return out;
}
const isHttps = (req) => String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase() === "https";
function cookieString(name, value, o) {
  return name + "=" + value + "; Path=" + (o.path || "/") + "; HttpOnly; SameSite=" + (o.sameSite || "Lax") + "; Max-Age=" + o.maxAge + (o.secure ? "; Secure" : "");
}

function ipBucket(ip) {
  if (ip.indexOf(":") < 0 || ip.length > 64) return ip;
  if (/^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(ip)) return ip.slice(7);
  const halves = ip.toLowerCase().split("%")[0].split("::");
  if (halves.length > 2) return ip;
  const head = halves[0] ? halves[0].split(":") : [], tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const groups = halves.length === 2 ? head.concat(new Array(Math.max(0, 8 - head.length - tail.length)).fill("0"), tail) : head;
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return ip;
  return groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

function sameOrigin(req) {
  const origin = req.headers.origin, host = req.headers.host;
  if (typeof origin !== "string" || typeof host !== "string" || !host) return false;
  let u; try { u = new URL(origin); } catch (e) { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  return u.host.toLowerCase() === host.toLowerCase();
}

function readJson(req, cap, drainCap) {
  return new Promise((resolve) => {
    const type = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    let bad = type !== "application/json" || Number(req.headers["content-length"]) > cap;
    let size = 0, done = false; const chunks = [];
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on("data", (c) => {
      size += c.length;
      if (size > cap) { bad = true; chunks.length = 0; }
      if (size > drainCap) { finish(null); req.destroy(); return; }
      if (!bad) chunks.push(c);
    });
    req.on("end", () => {
      if (bad) return finish(null);
      try { const v = JSON.parse(Buffer.concat(chunks).toString("utf8")); finish(v && typeof v === "object" && !Array.isArray(v) ? v : null); }
      catch (e) { finish(null); }
    });
    req.on("error", () => finish(null));
    req.on("close", () => finish(null));
  });
}

function makeLimiter(max, windowMs, maxKeys) {
  const m = new Map();
  return {
    hit(key) {
      const now = Date.now(), e = m.get(key);
      if (!e || now >= e.reset) {
        if (e) m.delete(key);
        else if (m.size >= maxKeys) {
          this.sweep();
          while (m.size >= maxKeys) m.delete(m.keys().next().value);
        }
        m.set(key, { n: 1, reset: now + windowMs }); return true;
      }
      if (e.n >= max) return false;
      e.n++; return true;
    },
    sweep() { const now = Date.now(); for (const [k, e] of m) if (now >= e.reset) m.delete(k); },
    size() { return m.size; },
    dump() { const now = Date.now(), out = []; for (const [k, e] of m) if (now < e.reset) out.push({ key: k, count: e.n, reset: e.reset }); return out; },
    load(key, count, reset) {
      const now = Date.now();
      if (typeof key !== "string" || !(reset > now)) return;
      const n = Math.max(1, Math.min(max, count | 0)), r = Math.min(reset, now + windowMs), e = m.get(key);
      if (e && now < e.reset) { e.n = Math.max(e.n, n); e.reset = Math.max(e.reset, r); return; }
      if (!e && m.size >= maxKeys) return;
      m.set(key, { n, reset: r });
    },
  };
}

function snapshotRows(limiters, cap) {
  const rows = [];
  const order = Object.entries(limiters).sort((a, b) => a[1].size() - b[1].size());
  for (const [name, l] of order) for (const r of l.dump()) { if (rows.length >= cap) return rows; rows.push({ name, key: r.key, count: r.count, reset: r.reset }); }
  return rows;
}

function cleanName(raw) {
  if (typeof raw !== "string" || raw.length > 256) return "";
  return raw.replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Cn}\p{Zl}\p{Zp}]/gu, "").replace(/\s+/gu, " ").trim();
}

async function discordIdentify(o) {
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(o.timeoutMs),
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: o.clientId, client_secret: o.clientSecret, grant_type: "authorization_code", code: o.code, redirect_uri: o.redirectUri }).toString(),
  });
  if (!tokenRes.ok) return null;
  const token = await tokenRes.json();
  if (!token || typeof token.access_token !== "string" || !token.access_token) return null;
  const meRes = await fetch("https://discord.com/api/users/@me", {
    redirect: "error", signal: AbortSignal.timeout(o.timeoutMs), headers: { Authorization: "Bearer " + token.access_token, Accept: "application/json" },
  });
  if (!meRes.ok) return null;
  const me = await meRes.json();
  if (!me || typeof me.id !== "string" || !/^\d{5,25}$/.test(me.id)) return null;
  return me;
}

module.exports = {
  SEC_HEADERS, b64u, mac, makeSafeEqual, seal, unseal, readSession, sessionValue, cookiesOf, isHttps, cookieString, ipBucket, sameOrigin,
  readJson, makeLimiter, snapshotRows, cleanName, discordIdentify,
};
