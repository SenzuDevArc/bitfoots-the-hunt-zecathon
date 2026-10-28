"use strict";
const crypto = require("crypto");

const MAX_SKEW_SEC = 300;
const MAX_BODY = 4096;
const headerNames = (prefix) => ({ ts: prefix + "-timestamp", sig: prefix + "-signature" });

function sign(secret, ts, rawBody) {
  const mac = crypto.createHmac("sha256", secret);
  mac.update(ts + ".", "utf8");
  mac.update(Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), "utf8"));
  return "sha256=" + mac.digest("hex");
}

function verify(secret, prefix, headers, rawBody, nowSec) {
  const n = headerNames(prefix);
  const ts = typeof headers[n.ts] === "string" ? headers[n.ts].trim() : "";
  const sig = typeof headers[n.sig] === "string" ? headers[n.sig].trim().toLowerCase() : "";
  if (!/^\d{1,12}$/.test(ts)) return { ok: false, why: "bad_signature" };
  const hex = sig.startsWith("sha256=") ? sig.slice(7) : "";
  if (!/^[0-9a-f]{64}$/.test(hex)) return { ok: false, why: "bad_signature" };
  const want = Buffer.from(sign(secret, ts, rawBody).slice(7), "hex");
  if (!crypto.timingSafeEqual(want, Buffer.from(hex, "hex"))) return { ok: false, why: "bad_signature" };
  if (Math.abs(Math.floor(nowSec) - Number(ts)) > MAX_SKEW_SEC) return { ok: false, why: "stale" };
  return { ok: true };
}

function readRaw(req, cap) {
  return new Promise((resolve) => {
    const type = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    let bad = type !== "application/json" || Number(req.headers["content-length"]) > cap;
    let size = 0, done = false; const chunks = [];
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on("data", (c) => {
      size += c.length;
      if (size > cap) { bad = true; chunks.length = 0; if (size > cap * 16) { finish(null); req.destroy(); } return; }
      if (!bad) chunks.push(c);
    });
    req.on("end", () => finish(bad ? null : Buffer.concat(chunks)));
    req.on("error", () => finish(null));
    req.on("close", () => finish(null));
  });
}

function accessBody(row) {
  return { id: row.public_id, discordId: String(row.discord_id), displayName: row.display_name, username: row.username,
    requestedAt: new Date(row.created_at).toISOString(), previousDenials: Number(row.previous_denials) || 0 };
}

async function deliverAccess(url, secret, prefix, body, nowSec, timeoutMs) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(nowSec));
  const n = headerNames(prefix);
  let res;
  try {
    res = await fetch(url, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(timeoutMs || 10000),
      headers: { "content-type": "application/json", [n.ts]: ts, [n.sig]: sign(secret, ts, raw), "user-agent": "bitfoot-hunt-api" },
      body: raw,
    });
  } catch (e) { return { outcome: "retry", status: 0 }; }
  try { await res.arrayBuffer(); } catch (e) { /* drained either way */ }
  if (res.status >= 200 && res.status < 300) return { outcome: "delivered", status: res.status };
  if (res.status === 401 || res.status === 404 || res.status === 409 || res.status === 429 || res.status >= 500) return { outcome: "retry", status: res.status };
  return { outcome: "rejected", status: res.status };
}

module.exports = { MAX_SKEW_SEC, MAX_BODY, sign, verify, readRaw, accessBody, deliverAccess };
