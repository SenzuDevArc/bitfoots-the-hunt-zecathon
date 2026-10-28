"use strict";
// Builds the site the way the Dockerfile does, serves the built copy with the live CSP, and starts a level in it through real input.
const fs = require("fs"), path = require("path"), os = require("os"), net = require("net");
const { spawn, spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once("error", rej); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bh-built-smoke-"));
  let server = null, code = 1;
  try {
    fs.cpSync(path.join(ROOT, "site"), dir, { recursive: true });
    for (const f of ["ibm-plex-sans-condensed-500.woff2", "ibm-plex-sans-condensed-600.woff2"]) fs.copyFileSync(path.join(dir, "assets", "fonts", f), path.join(dir, "login", f));
    const b = spawnSync("sh", [path.join(ROOT, "tools", "build-site.sh"), dir], { encoding: "utf8" });
    console.log((b.status === 0 ? "PASS" : "FAIL") + " build-site.sh into a temp copy  " + JSON.stringify((b.stdout + b.stderr).trim().split("\n").slice(-2)));
    if (b.status !== 0) return;
    const debug = fs.existsSync(path.join(dir, "debug.js"));
    console.log((debug ? "FAIL" : "PASS") + " built copy has no debug.js");
    if (debug) return;
    const port = +process.env.BUILT_PORT || await freePort();
    server = spawn(process.execPath, [path.join(__dirname, "csp-serve.js"), String(port), dir], { stdio: ["ignore", "pipe", "inherit"] });
    let up = false;
    for (let i = 0; i < 50 && !up; i++) { try { up = (await fetch(`http://127.0.0.1:${port}/health`)).ok; } catch { await sleep(100); } }
    console.log((up ? "PASS" : "FAIL") + " built copy served on port " + port);
    if (!up) return;
    const r = spawnSync(process.execPath, [path.join(__dirname, "ui-flow-check.js"), "smoke"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], timeout: 240000,
      env: Object.assign({}, process.env, { CDP_BASE: `http://127.0.0.1:${port}/` }) });
    process.stdout.write(r.stdout || "");
    code = r.status === 0 ? 0 : 1;
  } finally {
    if (server) { server.kill(); await new Promise((r) => { if (server.exitCode !== null) return r(); server.once("exit", r); setTimeout(r, 3000); }); }
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
    console.log(code ? "BUILT SMOKE FAIL" : "BUILT SMOKE PASS");
    process.exitCode = code;
  }
}
main().catch((e) => { console.error(e.stack || e); process.exit(2); });
