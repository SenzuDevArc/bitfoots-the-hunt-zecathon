"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const CHROME = process.env.CHROME_PATH || ({
  win32: [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => path.join(d, "Google", "Chrome", "Application", "chrome.exe")),
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
}[process.platform] || []).find((p) => fs.existsSync(p)) || "google-chrome";
const PORT = 9653, BASE = process.env.CDP_BASE || "http://127.0.0.1:5191/";
const LOCK = process.env.TRAIL_DRIVE_LOCK || path.join(os.tmpdir(), "trail-drive.lock");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "trail-zoom-"));
const ZOOMS = [0.67, 0.75, 1, 1.5, 2];
const PW = 1280, PH = 800;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
function check(name, ok, detail) { if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (detail !== undefined ? "  " + JSON.stringify(detail) : "")); }

const START = `(async () => {
  for (let i = 0; i < 100 && !(typeof loadLevel === "function" && window.BH && BH.trailFeature && BH.talk); i++) await new Promise(r => setTimeout(r, 100));
  loadLevel(0, false); game.screen = "play";
  for (let i = 0; i < 30 && !document.querySelector(".talkbox.on"); i++) await new Promise(r => setTimeout(r, 100));
  if (!document.querySelector(".talkbox.on")) BH.talk.open([{ who: "shilo", text: "You're lucky we found you out there. I'm Shilo, that's Ayab." }]);
  if (!window.__hudWrap) {
    window.__hudWrap = true; window.__hud = {};
    const md = BH.hudMedals.draw;
    BH.hudMedals.draw = function (c, x, top) { const r = md.apply(this, arguments), m = c.getTransform(); __hud.right = BH.hudMedals.right * m.a / canvas.width; return r; };
    const ft = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y) {
      if (/ZEC$/.test(String(t)) && x < 60) { const m = this.getTransform(); __hud.zec = { x: (x * m.a + m.e) / canvas.width, w: this.measureText(t).width * m.a / canvas.width, font: this.font }; }
      return ft.apply(this, arguments);
    };
  }
  return true;
})()`;
const MEASURE = `(async () => {
  await new Promise(r => setTimeout(r, 500));
  const camTiles = +(W / (T * zoom)).toFixed(2);
  resize();
  const z0 = zoom, iw = innerWidth, ih = innerHeight;
  const frac = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); if (!r.width) return null; return { w: +(r.width / iw).toFixed(3), h: +(r.height / ih).toFixed(3), x: +(r.left / iw).toFixed(3), y: +(r.top / ih).toFixed(3) }; };
  return {
    iw, ih, dpr: devicePixelRatio, ow: outerWidth, detected: typeof trailZoom === "number" ? trailZoom : null,    W, H, camTiles, tilesAcross: +(W / (T * z0)).toFixed(2), tilesDown: +(H / (T * z0)).toFixed(2),
    talk: frac(document.querySelector(".talkbox.on")),
    goal: frac(document.querySelector("#goal.on")), hudbtns: frac(document.getElementById("hudbtns")),
    medalsRight: window.__hud && __hud.right != null ? +__hud.right.toFixed(4) : null, zec: window.__hud && __hud.zec ? { x: +__hud.zec.x.toFixed(4), w: +__hud.zec.w.toFixed(4) } : null,
    stripMini: !!(stripEl && / mini/.test(stripEl.className)), stripOn: !!(stripEl && / on/.test(stripEl.className)),
  };
})()`;

const SCREEN_ZOOMS = process.env.SCREEN_ZOOMS ? process.env.SCREEN_ZOOMS.split(",").map(Number) : [1, 0.67, 1.5, 2];
const LIB = `
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && BH.landing && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 300));
const TS = () => BH.trailFeature.api.state;
function noTour() { const s = TS(); if (s.cinePending && s.cineP0) { player.x = s.cineP0.x; player.y = s.cineP0.y; } s.tourPending = false; s.cinePending = false; if (s.tour) s.tour = null; s.cine = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play"; if (BH.talk && BH.talk.isOpen && BH.talk.isOpen() && BH.talk.close) BH.talk.close(); }
`;
const SCREENS = {
  menu: { setup: `BH.landing.show("menu");`, sel: [".ld-brand", ".ld-menu", ".ld-press", ".ld-footer"] },
  how: { setup: `BH.landing.show("how");`, sel: [".ld-board", ".ld-board .ld-kicker", ".ld-board .ld-back", ".ld-brand"] },
  map: { setup: `showSelect();`, sel: ["#wmTop", "#wmPanel", "#wmEdgeR", "#wmCanvas"] },
  badges: { setup: `BH.achievements.show(function () {});`, sel: [".overlay.on > :first-child", ".overlay.on > :last-child"] },
  wardrobe: { setup: `showShop(function () {});`, sel: [".overlay.on > :first-child", ".overlay.on > :last-child"] },
  pause: { setup: `loadLevel(0, false); game.screen = "play"; noTour(); await new Promise(r => setTimeout(r, 300)); showPause();`, sel: [".overlay.pause .card", ".overlay.pause .card .word"] },
  caught: { nav: true, setup: `let lv = -1;
for (let i = 0; i < LV.length && lv < 0; i++) { loadLevel(i, true); if (hunters.some(x => x.type === "dog")) lv = i; }
loadLevel(lv, true); game.screen = "play"; noTour(); await new Promise(r => setTimeout(r, 300));
const h = hunters.find(x => x.type === "dog"); h.caughtHow = "spotted"; caught(h, "caught");
for (let i = 0; i < 200 && !game.caughtCard; i++) await new Promise(r => setTimeout(r, 25));`, sel: [".caughtcard", ".caughtcard .cc-word", ".caughtcard .cc-cause", ".caughtcard .ec-primary"] },
  escaped: { nav: true, setup: `const PAY = LV.findIndex(l => (l.signs || []).some(s => s[2] === "PAY POST"));
loadLevel(PAY, true); game.screen = "play"; noTour(); await new Promise(r => setTimeout(r, 300));
const S = TS(); S.posts = S.posts || {}; S.posts.fixture = { n: 1 };
player.carry = 0; player.stash = coins.length - 1; ghost = true; escaped();
for (let i = 0; i < 160 && !document.querySelector(".ec-onmap.show"); i++) await new Promise(r => setTimeout(r, 50));
await new Promise(r => setTimeout(r, 1200));`, sel: [".ec-map", ".ec-onmap", ".ec-onmap .ec-word", ".endcard .ec-share"] },
};
const SCREEN_MEASURE = (sel) => `(() => { const iw = innerWidth, ih = innerHeight;
  const frac = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); if (!r.width) return null; return { w: +(r.width / iw).toFixed(3), h: +(r.height / ih).toFixed(3), x: +(r.left / iw).toFixed(3), y: +(r.top / ih).toFixed(3) }; };
  const o = { iw, html: document.documentElement.className };
  o.layout = [...document.querySelectorAll("#overlay *, #hudbtns *")].filter((e) => !e.closest("canvas, .ld-crew")).map((e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return [e.tagName, e.className && e.className.baseVal === undefined ? e.className : "", Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), cs.fontSize, cs.display].join(" "); });
  ${JSON.stringify(sel)}.forEach((s) => { o[s] = frac(document.querySelector(s)); });
  return o; })()`;

function pngPixels(f) {
  const b = fs.readFileSync(f), idat = []; let p = 8, w = 0, h = 0, ct = 6;
  while (p < b.length) { const len = b.readUInt32BE(p), t = b.toString("ascii", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len); if (t === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } if (t === "IDAT") idat.push(d); p += 12 + len; }
  const bpp = ct === 6 ? 4 : 3, raw = require("zlib").inflateSync(Buffer.concat(idat)), st = w * bpp, out = Buffer.alloc(h * st);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (st + 1)], o = y * (st + 1) + 1;
    for (let x = 0; x < st; x++) {
      const a = x >= bpp ? out[y * st + x - bpp] : 0, u = y ? out[(y - 1) * st + x] : 0, c = x >= bpp && y ? out[(y - 1) * st + x - bpp] : 0;
      let v = raw[o + x];
      if (ft === 1) v += a; else if (ft === 2) v += u; else if (ft === 3) v += (a + u) >> 1;
      else if (ft === 4) { const q = a + u - c, pa = Math.abs(q - a), pb = Math.abs(q - u), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
      out[y * st + x] = v & 255;
    }
  }
  return { w, h, bpp, out };
}
function pixelDiff(fa, fb) {
  const A = pngPixels(fa), B = pngPixels(fb); if (A.w !== B.w || A.h !== B.h) return { n: -1 };
  let n = 0; const box = [1e9, 1e9, -1, -1];
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
    const i = (y * A.w + x) * A.bpp, j = (y * B.w + x) * B.bpp;
    if (A.out[i] !== B.out[j] || A.out[i + 1] !== B.out[j + 1] || A.out[i + 2] !== B.out[j + 2]) { n++; box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); }
  }
  return { n, box: n ? box : null };
}

async function main() {
  let got = false;
  for (let i = 0; i < 240 && !got; i++) { try { fs.mkdirSync(LOCK); got = true; } catch { await sleep(5000); } }
  if (!got) { console.error("browser lock busy for 20 minutes"); process.exit(2); }
  let chrome, ws, code = 0, profile = PROFILE, launches = 0, id = 1;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, timeout: 60000 }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
  const quit = async () => {
    if (!chrome) return;
    try { await send("Browser.close"); } catch {}
    try { ws && ws.close(); } catch {}
    await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once("exit", r); setTimeout(r, 5000); }); try { chrome.kill(); } catch {}
    chrome = null; await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 }); } catch (e) { console.error("profile not removed: " + e.code); }
  };
  const launch = async (dsf) => {
    await quit();
    if (launches++) profile = fs.mkdtempSync(path.join(os.tmpdir(), "trail-zoom-"));
    const port = PORT + launches - 1;
    chrome = spawn(CHROME, ["--headless=new", "--mute-audio", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`].concat(dsf && dsf !== 1 ? [`--force-device-scale-factor=${dsf}`] : []).concat([
      "--no-first-run", "--no-default-browser-check", `--window-size=${PW},${PH}`, "about:blank"]), { stdio: "ignore" });
    let ver = null;
    for (let i = 0; i < 100 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(150); } }
    if (!ver) throw new Error("chrome did not start");
    const tab = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
    await send("Page.enable"); await send("Runtime.enable");
  };
  try {
    await launch(1);
    const metrics = (z, dsf, gap) => send("Emulation.setDeviceMetricsOverride", { width: Math.round((PW - (gap || 0)) / z), height: Math.round(PH / z), deviceScaleFactor: dsf, mobile: false });
    const nav = async (label) => {
      await send("Page.navigate", { url: BASE + "index.html?unlock&fresh=1" });
      await sleep(800);
      for (let i = 0; i < 300; i++) { await sleep(100); if (await ev(`document.readyState === "complete" && typeof loadLevel === "function"`)) break; }
      if (!(await ev(`typeof loadLevel === "function"`))) throw new Error(label + ": game did not load at " + (await ev("location.href + ' ' + document.title")));
    };
    const rows = [];
    const CASES = ZOOMS.map((z) => ({ label: Math.round(z * 100) + "%", z, dsf: z }))
      .concat([{ label: "100% retina", z: 1, dsf: 2 }, { label: "100% then 150% live", z: 1, dsf: 1, live: 1.5 },
        { label: "100% side bar", z: 1, dsf: 1, gap: 60 }, { label: "100% side bar 125% screen", z: 1, dsf: 1.25, gap: 60 }, { label: "150% side bar", z: 1.5, dsf: 1.5, gap: 60 }]);
    for (const c of process.env.SCREENS_ONLY ? [] : CASES) {
      await metrics(c.z, c.dsf, c.gap);
      await nav(c.label);
      await ev(START);
      if (c.live) { await metrics(c.live, c.live); await sleep(300); }
      const m = await ev(MEASURE);
      m.label = c.label; m.z = c.live || c.z; m.gap = !!c.gap; rows.push(m);
      if (process.env.SHOTS_DIR) { const s = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(process.env.SHOTS_DIR, `zoom-${c.label.replace(/[^0-9a-z]+/g, "-")}.png`), Buffer.from(s.data, "base64")); }
      console.log(JSON.stringify(m));
    }
    const plainRef = rows.find((r) => r.label === "100%"), gapRef = rows.find((r) => r.label === "100% side bar");
    const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;
    const box = (a, b) => !!(a && b) && near(a.w, b.w, 0.01) && near(a.h, b.h, 0.01) && near(a.x, b.x, 0.01) && near(a.y, b.y, 0.01);
    if (plainRef) {
    const ref = plainRef;
    check("100%: talk box and HUD buttons are on screen (the reference)", !!(ref.talk && ref.hudbtns), { talk: ref.talk, hudbtns: ref.hudbtns });
    check("100%: the canvas HUD and the key strip were measured (the reference)", ref.medalsRight != null && !!ref.zec && ref.stripOn, { medalsRight: ref.medalsRight, zec: ref.zec, stripOn: ref.stripOn });
    for (const r of rows) {
      const ref = r.gap ? gapRef : plainRef;
      if (r === ref) { check(`${r.label}: zoom detected`, near(r.detected, r.z, 0.01), { got: r.detected, want: r.z }); continue; }
      check(`${r.label}: tiles across and down same as 100%`, near(r.tilesAcross, ref.tilesAcross, 0.05) && near(r.tilesDown, ref.tilesDown, 0.05), { got: [r.tilesAcross, r.tilesDown], ref: [ref.tilesAcross, ref.tilesDown] });
      check(`${r.label}: tour camera shows the same tiles across as 100%`, near(r.camTiles, ref.camTiles, 0.1), { got: r.camTiles, ref: ref.camTiles });
      check(`${r.label}: zoom detected`, near(r.detected, r.z, 0.01), { got: r.detected, want: r.z });
      check(`${r.label}: talk box same place and share of the window`, box(r.talk, ref.talk), { got: r.talk, ref: ref.talk });
      check(`${r.label}: HUD buttons same place and share of the window`, box(r.hudbtns, ref.hudbtns), { got: r.hudbtns, ref: ref.hudbtns });
      if (ref.goal) check(`${r.label}: goal text same place and share of the window`, box(r.goal, ref.goal), { got: r.goal, ref: ref.goal });
      check(`${r.label}: HUD medal row ends at the same share of the window`, near(r.medalsRight, ref.medalsRight, 0.004), { got: r.medalsRight, ref: ref.medalsRight });
      check(`${r.label}: HUD ZEC line same place and width`, !!(r.zec && ref.zec) && near(r.zec.x, ref.zec.x, 0.003) && near(r.zec.w, ref.zec.w, 0.003), { got: r.zec, ref: ref.zec });
      check(`${r.label}: key strip in the same form as 100% (full or small)`, r.stripMini === ref.stripMini && r.stripOn === ref.stripOn, { got: [r.stripOn, r.stripMini], ref: [ref.stripOn, ref.stripMini] });
    }
    }
    const scr = {};
    let launched = 1;
    for (const z of SCREEN_ZOOMS) {
      if (z !== launched) { await launch(z); launched = z; }
      await metrics(z, z);
      let first = true;
      for (const [name, s] of Object.entries(SCREENS)) {
        if (first || s.nav) await nav(name + " " + z); first = false;
        await ev(`(async () => { ${LIB} ${s.setup} })()`);
        await sleep(900);
        const m = await ev(SCREEN_MEASURE(s.sel));
        (scr[name] = scr[name] || {})[z] = m;
        if (z === 1 && process.env.SHOTS_DIR) fs.writeFileSync(path.join(process.env.SHOTS_DIR, `screen-${name}-100.json`), JSON.stringify(m.layout, null, 0));
        const nl = m.layout.length; delete m.layout; m.boxes = nl;
        if (process.env.SHOTS_DIR) { const p = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(process.env.SHOTS_DIR, `screen-${name}-${Math.round(z * 100)}.png`), Buffer.from(p.data, "base64")); }
        console.log(name, Math.round(z * 100) + "%", JSON.stringify(m));
      }
    }
    if (process.env.BEFORE_DIR && process.env.SHOTS_DIR) for (const name of Object.keys(scr)) {
      const fa = path.join(process.env.BEFORE_DIR, `screen-${name}-100.png`), fb = path.join(process.env.SHOTS_DIR, `screen-${name}-100.png`);
      const ja = fa.replace(/\.png$/, ".json"), jb = fb.replace(/\.png$/, ".json");
      if (!fs.existsSync(ja)) continue;
      const la = JSON.parse(fs.readFileSync(ja, "utf8")), lb = JSON.parse(fs.readFileSync(jb, "utf8"));
      const moved = la.filter((x, i) => x !== lb[i]).slice(0, 5);
      check(`${name} 100%: every box and font the same as before (${la.length} boxes)`, la.length === lb.length && moved.length === 0, { moved, pixelsDiffering: fs.existsSync(fa) ? pixelDiff(fa, fb) : null });
    }
    for (const [name, byZ] of Object.entries(scr)) {
      const ref = byZ[1];
      check(`${name} 100%: every part measured (the reference)`, SCREENS[name].sel.every((q) => ref[q]), SCREENS[name].sel.filter((q) => !ref[q]));
      for (const z of SCREEN_ZOOMS) {
        if (z === 1) continue;
        const bad = SCREENS[name].sel.filter((q) => !box(byZ[z][q], ref[q]));
        check(`${name} ${Math.round(z * 100)}%: same place and share of the window as 100%`, bad.length === 0, bad.map((q) => ({ part: q, got: byZ[z][q], ref: ref[q] })));
      }
    }
    console.log(fails ? `${fails} FAILED` : "ALL PASS");
    code = fails ? 1 : 0;
  } finally {
    await quit();
    try { fs.rmdirSync(LOCK); } catch {}
  }
  process.exit(code);
}
main().catch((e) => { console.error(e.stack || e); try { fs.rmdirSync(LOCK); } catch {} process.exit(2); });
