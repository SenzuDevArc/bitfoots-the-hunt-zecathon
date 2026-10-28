"use strict";
const path = require("path");
const { spawnSync } = require("child_process");
let fails = 0;
function check(name, ok, detail) { if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (detail !== undefined ? "  " + JSON.stringify(detail) : "")); }

const PAGE = String.raw`
for (let i = 0; i < 150 && !(window.LEVELS && window.BH && BH.trailFeature && BH.talk && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const P = CanvasRenderingContext2D.prototype, f0 = P.fillText;
let TXT = new Set();
P.fillText = function (t) { TXT.add(String(t)); return f0.apply(this, arguments); };
function noTour() { const s = BH.trailFeature.api.state; s.tourPending = false; s.cinePending = false; s.tour = null; s.cine = null; document.body.classList.remove("trail-cine"); }
async function atPost(tid) {
  const i = LEVELS.findIndex(l => l.tid === tid);
  loadLevel(i, true); game.screen = "play"; noTour(); await sleep(300); noTour();
  hunters.forEach(h => { h.x = 1.5 * T; h.y = 10.5 * T; h.state = "sleep"; h.sleep = true; h.path = []; });
  const z = L.talks.find(q => q.id === "machine").at;
  player.x = (z[0] - 0.5) * T; player.y = (z[1] + 0.5) * T; player.carry = 1;
  for (let k = 0; k < 40 && !BH.trailFeature.api.state.payAsk; k++) { noTour(); await sleep(100); }
  TXT = new Set(); await sleep(700);
  return { level: L.tid, ask: !!BH.trailFeature.api.state.payAsk, txt: [...TXT] };
}
const a = await atPost("wise");
dispatchEvent(new KeyboardEvent("keydown", { key: "e", code: "KeyE", bubbles: true }));
TXT = new Set(); await sleep(900);
const paid = { pay: !!BH.trailFeature.api.state.pay, txt: [...TXT] };
return { a, paid };
`;
const r = spawnSync(process.execPath, [path.join(__dirname, "drive.js"), "/index.html?unlock&fresh=1", "-", "1280,800"], { input: PAGE, encoding: "utf8", env: process.env, timeout: 280000, maxBuffer: 1 << 24 });
let out = null;
try { const s = r.stdout || ""; out = JSON.parse(s.slice(s.lastIndexOf('{\n "errors"'))); } catch (e) {}
if (!out || !out.result) check("the page ran", false, { status: r.status, signal: r.signal, out: (r.stderr || r.stdout || "").slice(-600) });
else {
  const { a, paid } = out.result, has = (list, s) => list.some((t) => t === s);
  check("page: no console errors", !(out.errors || []).length, (out.errors || []).slice(0, 3));
  check("control: the Level 2 (wise) post asks to pay and draws its PAYMENT LINK", a.ask && has(a.txt, "PAYMENT LINK"), a.txt.filter((t) => /LINK|PAY/.test(t)));
  check("the payment link shows the 10,000 zatoshi fee", has(a.txt, "FEE: 10,000 ZATOSHIS"), a.txt.filter((t) => /FEE/.test(t)));
  check("no STANDARD FEE box at the post", !a.txt.some((t) => /STANDARD FEE|ODD FEE|ZEC FROM/.test(t)), a.txt.filter((t) => /FEE|FROM/.test(t)));
  check("no STANDARD FEE box after paying", paid.pay && !paid.txt.some((t) => /STANDARD FEE|ODD FEE|ZEC FROM/.test(t)), paid.txt.filter((t) => /FEE|FROM/.test(t)));
}
console.log(fails ? `${fails} FAILED` : "ALL PASS");
process.exit(fails ? 1 : 0);
