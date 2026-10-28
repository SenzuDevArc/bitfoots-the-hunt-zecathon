"use strict";
const realFetch = globalThis.fetch;
const OWNER = process.env.TRAIL_FAKE_OWNER || "111111111111111111";
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
globalThis.fetch = async function (url, opts) {
  const u = String(url);
  if (!u.startsWith("https://discord.com/")) return realFetch(url, opts);
  if (u.startsWith("https://discord.com/api/webhooks/")) {
    let body = null; try { body = JSON.parse(String(opts && opts.body)); } catch (e) {  }
    const clean = !!body && typeof body.content === "string" && body.allowed_mentions && Array.isArray(body.allowed_mentions.parse)
      && body.allowed_mentions.parse.length === 0 && !/\d{15,}/.test(JSON.stringify(body));
    process.stderr.write("FAKE-WEBHOOK " + (clean ? "clean" : "unclean") + "\n");
    return new Response(null, { status: 204 });
  }
  if (u === "https://discord.com/api/oauth2/token") {
    const body = new URLSearchParams(String((opts && opts.body) || ""));
    if (body.get("client_secret") !== process.env.DISCORD_CLIENT_SECRET) return json(401, { error: "invalid_client" });
    const code = body.get("code") || "";
    if (code === "refuse") return json(400, { error: "invalid_grant" });
    return json(200, { access_token: "tok-" + code, token_type: "Bearer" });
  }
  if (u === "https://discord.com/api/users/@me") {
    const auth = String((opts && opts.headers && (opts.headers.Authorization || opts.headers.authorization)) || "");
    const code = auth.replace(/^Bearer tok-/, "");
    if (code === "owner-mfa") return json(200, { id: OWNER, username: "owner", global_name: "Owner", mfa_enabled: true });
    if (code === "owner-nomfa") return json(200, { id: OWNER, username: "owner", global_name: "Owner", mfa_enabled: false });
    const m = /^(player|mfa)-(\d{5,25})$/.exec(code);
    if (m) return json(200, { id: m[2], username: "p" + m[2].slice(-4), global_name: "Player " + m[2].slice(-4), mfa_enabled: m[1] === "mfa" });
    return json(401, { message: "401: Unauthorized" });
  }
  return json(404, {});
};
