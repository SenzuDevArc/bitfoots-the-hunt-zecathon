"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os"), net = require("net");

function bin(name) {
  const exe = process.platform === "win32" ? name + ".exe" : name;
  if (process.env.PG_BIN) return path.join(process.env.PG_BIN, exe);
  for (const dir of String(process.env.PATH || "").split(path.delimiter)) {
    const p = path.join(dir, exe);
    try { if (fs.statSync(p).isFile()) return p; } catch (e) {  }
  }
  return null;
}
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

async function start() {
  const initdb = bin("initdb"), pgctl = bin("pg_ctl");
  if (!initdb || !pgctl) return { ok: false, why: "no initdb / pg_ctl on PATH (set PG_BIN)" };
  const dir = fs.mkdtempSync(path.join(process.env.PG_TEST_TMP || os.tmpdir(), "bf-pg-"));
  const data = path.join(dir, "data"), log = path.join(dir, "pg.log");
  const port = await freePort();
  let r = spawnSync(initdb, ["-D", data, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--no-sync", "--no-instructions"], { encoding: "utf8", timeout: 120000 });
  if (r.status !== 0) { cleanup(dir); return { ok: false, why: "initdb failed: " + String(r.stderr || r.error || "").slice(0, 300) }; }
  r = spawnSync(pgctl, ["-D", data, "-l", log, "-w", "-t", "60", "-o", "-p " + port + " -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off -c full_page_writes=off -c max_connections=60", "start"], { encoding: "utf8", timeout: 90000 });
  if (r.status !== 0) {
    const tail = fs.existsSync(log) ? fs.readFileSync(log, "utf8").slice(-400) : "";
    cleanup(dir); return { ok: false, why: "pg_ctl start failed: " + String(r.stderr || "").slice(0, 200) + " " + tail };
  }
  const stop = () => {
    spawnSync(pgctl, ["-D", data, "-m", "immediate", "-w", "-t", "30", "stop"], { encoding: "utf8", timeout: 60000 });
    cleanup(dir);
  };
  return { ok: true, url: "postgres://postgres@127.0.0.1:" + port + "/postgres", port, stop, version: spawnSync(bin("postgres") || initdb, ["--version"], { encoding: "utf8" }).stdout.trim() };
}
function cleanup(dir) { for (let i = 0; i < 5; i++) { try { fs.rmSync(dir, { recursive: true, force: true }); return; } catch (e) {  } } }

module.exports = { start };
