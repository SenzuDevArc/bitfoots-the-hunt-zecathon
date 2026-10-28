"use strict";
const { spawnSync } = require("child_process");
const path = require("path");
const ONLY = process.argv[2] || "";

const COMMON = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && BH.river && typeof loadLevel === "function" && typeof bake !== "undefined"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const out = {};
let fx = 0;
function TS() { return BH.trailFeature.api.state; }
function quiet() { const s = TS(); s.tourPending = false; s.cinePending = false; s.introDone = true; if (s.tour) s.tour = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play"; }
function go(i) { loadLevel(i, false); game.screen = "play"; ghost = true; autopilot = null; }
function fixture(map, extra, keepTour) {
  const lv = Object.assign({ title: "FEAT FIXTURE", tid: "featfix" + (fx++), act: 0, par: 999, need: 99, map: map, features: ["trail", "stamps", "river", "bank"],
    hunters: [], elders: ["oak", "sly"], copy: { goal: "t", lesson: "t", dev: "t" } }, extra || {});
  LEVELS.push(lv);
  go(LEVELS.length - 1);
  if (!keepTour) quiet();
  return lv;
}
function run(sec, each) { for (let i = 0, n = Math.round(sec / STEP); i < n; i++) { step(STEP); if (each) each(i); } }
function count(code) { let n = 0; for (const r of grid) for (const c of r) if (c === code) n++; return n; }
function drawn(fn) {
  const got = [], P = CanvasRenderingContext2D.prototype, f0 = P.fillText, s0 = P.strokeText;
  P.fillText = function (t) { got.push(String(t)); return f0.apply(this, arguments); };
  P.strokeText = function (t) { got.push(String(t)); return s0.apply(this, arguments); };
  try { fn(); } finally { P.fillText = f0; P.strokeText = s0; }
  return got;
}
function at(tx, ty) { player.x = (tx + 0.5) * T; player.y = (ty + 0.5) * T; player.tx = tx; player.ty = ty; }
function pressE() { dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", key: "e", bubbles: true })); }
function wet(e) { return isWater(tileAt(e.x, e.y)); }
`;

const P16 = String.raw`
{
  const seqs = [], open0 = BH.talk.open;
  BH.talk.open = function (seq, after) { seqs.push(seq); return open0.apply(this, arguments); };
  try {
    save.trail = {}; go(0); quiet(); run(0.5);
    const c = coins.find(c => c.locked);
    if (c) { player.x = c.x; player.y = c.y; }
    const s0 = seqs.length;
    run(0.15);
    out.jolt = { trauma: +trauma.toFixed(2), talkBefore: seqs.length - s0, apartTiles: c ? +(Math.hypot(player.x - c.x, player.y - c.y) / T).toFixed(2) : null };
    run(0.4);
    out.jolt.talkAfter = seqs.length - s0;
    const pick = (label) => { for (let k = seqs.length - 1; k >= 0; k--) for (const it of seqs[k]) if (it && it.choices) { const ch = it.choices.find(x => x.text === label); if (ch) return ch; } return null; };
    const make = pick("Make a wallet"); if (make) make.then();
    const write = pick("Write it down"); if (write) write.then();
    const lis = [...document.querySelectorAll("#trailNote li")].map(li => li.textContent.replace(/^\d+\.\s*/, "").trim());
    const head = (document.querySelector("#trailNote .tn-head") || {}).textContent;
    const ol = document.querySelector("#trailNote ol");
    let quiz = null; for (let k = seqs.length - 1; k >= 0 && !quiz; k--) for (const it of seqs[k]) if (it && it.choices && /word 3/.test(it.text)) quiz = it;
    const opts = quiz ? quiz.choices.map(x => x.text) : [];
    out.wallet = { level0: L.title, lis: lis.length, distinct: new Set(lis).size, head, cols: ol ? getComputedStyle(ol).columnCount : null, opts, distinctOpts: new Set(opts).size,
      rightOnPad: opts.filter(o => lis.indexOf(o) >= 0).length, third: lis[2], thirdIsOpt: opts.indexOf(lis[2]) >= 0 };
  } finally { BH.talk.open = open0; BH.talk.reset(); }
}

{
  const i1 = LEVELS.findIndex(l => (l.talks || []).some(z => z.id === "machine") && l.map.some(r => r.indexOf("H") >= 0));
  go(i1); quiet(); run(0.5);
  const z = L.talks.find(q => q.id === "machine");
  let nx = z.at[0] - 1; at(nx, z.at[1]);
  player.carry = 1;
  const h0 = count("H");
  run(3);
  const shutNoPay = count("H");
  BH.talk.reset(); TS().lastTalk = -9; run(0.1);
  const ask = TS().payAsk ? { key: TS().payAsk.key, water: TS().payAsk.water } : null;
  pressE();
  const pay = TS().pay, t0 = simTime;
  let openedAfter = null, g = 0, waitDrawn = 0;
  while (g++ < 600 && openedAfter == null) {
    step(STEP);
    waitDrawn += drawn(() => render()).filter(t => /WAITING|UNLOCK|BLOCK|SAFE/.test(t)).length;
    if (count("H") === 0) openedAfter = +(simTime - t0).toFixed(2);
  }
  run(1.0); render();
  const txt = drawn(() => render());
  out.level1 = { title: L.title, hBefore: h0, shutNoPay, ask, signed: !!pay, carryAfter: player.carry, openedAfter, waitDrawn, conf: BH.stamps.confirm(pay ? pay.key : "x").text,
    paidDrawn: txt.filter(t => t === "PAID").length };
}
{
  out.payNag = {};
  for (const pay of [false, true]) {
    const i1 = LEVELS.findIndex(l => (l.talks || []).some(z => z.id === "machine") && l.map.some(r => r.indexOf("H") >= 0));
    go(i1); quiet(); run(0.5);
    const said = [], b0 = BH.talk.bubble;
    BH.talk.bubble = function (who, text) { said.push(text); return b0.apply(this, arguments); };
    const z = L.talks.find(q => q.id === "machine");
    if (pay) { at(z.at[0] - 1, z.at[1]); player.carry = 1; run(3); BH.talk.reset(); TS().lastTalk = -9; run(0.1); pressE(); }
    const paid = !!TS().pay;
    for (let k = 0; k < 40; k++) { run(1); if (BH.talk.isOpen()) BH.talk.reset(); }
    BH.talk.bubble = b0;
    out.payNag[pay ? "paid" : "notPaid"] = { paid, nag: said.filter(t => /Bring the post/.test(t)).length };
  }
}

{
  const MAP = ["##########", "#P.......#", "#....M...#", "#........#", "##########"];
  fixture(MAP, { talks: [{ at: [5, 2], r: 1.6, id: "machine" }] });
  run(0.3);
  player.carry = 0;
  at(4, 2); BH.talk.reset(); TS().lastTalk = -9; run(0.1);
  pressE();
  const noCoin = !!TS().pay;
  at(2, 3); run(0.2);
  player.carry = 1;
  at(4, 2); BH.talk.reset(); TS().lastTalk = -9; run(0.1);
  const readyNow = BH.stamps.ready();
  pressE();
  out.instantPay = { noCoin, readyNow, signed: !!TS().pay };
}

{
  const MAP = [
    "####################",
    "#P.....M...........#",
    "#..................#",
    "#~~~~~~~~~~~~~~~~~~#",
    "#~~~~~~~~~U~~~~~~~~#",
    "#~~~~~~~~~~~~~~~~~~#",
    "####################"];
  fixture(MAP, { talks: [{ at: [7, 1], r: 1.6, id: "machine" }, { at: [10, 4], r: 1.6, id: "machine" }] });
  run(0.3);
  player.carry = 2;
  at(6, 1); BH.talk.reset(); TS().lastTalk = -9; run(0.1);
  const nearLand = TS().payAsk ? TS().payAsk.key : null;
  render(); const landAsk = drawn(() => render()).filter(t => /SIGN, PAY/.test(t));
  const landLink = drawn(() => render()).filter(t => /PAYMENT LINK|^zcash:|^TO: |^AMOUNT: |^MEMO: /.test(t));
  pressE(); run(1.0); render();
  const landLinkAfter = drawn(() => render()).filter(t => t === "PAYMENT LINK").length;
  const landFee = drawn(() => render()).filter(t => t === "FEE").length;
  const l0 = BH.river.log.length;
  const MAP2 = MAP.map(r => r.replace("M", "."));
  fixture(MAP2, { talks: [{ at: [7, 1], r: 1.6, id: "machine" }, { at: [10, 4], r: 1.6, id: "machine" }] });
  run(0.3); player.carry = 1;
  at(9, 4); player.inShield = true; BH.talk.reset(); TS().lastTalk = -9; run(0.1);
  const nearRiver = TS().payAsk ? TS().payAsk.key : null, riverWater = TS().payAsk ? TS().payAsk.water : null;
  render(); const riverAsk = drawn(() => render()).filter(t => /SIGN, PAY/.test(t));
  const riverLink = drawn(() => render()).filter(t => /PAYMENT LINK|^zcash:|^TO: |^AMOUNT: |^MEMO: /.test(t));
  const lr = BH.river.log.length;
  pressE(); run(1.0); render();
  const riverFee = drawn(() => render()).filter(t => t === "FEE").length;
  out.twoPosts = { landLink, landLinkAfter, riverLink, nearLand, nearRiver, riverWater, landAsk, riverAsk, landFee, riverFee, outRows: BH.river.log.slice(lr).filter(r => r.dir === "out").length };
}

{
  const MAP = [
    "####################",
    "#P.................#",
    "#~~~~~~~~~~~~~~~~~~#",
    "#~~~~U~~~~~~~~~~~~~#",
    "#YYYYYYYYYYYYYYYYYY#",
    "#~~~~~~~~~~~~~~~~~~#",
    "####################"];
  const runGate = (extra) => {
    fixture(MAP, Object.assign({ talks: [{ at: [5, 3], r: 1.6, id: "machine" }] }, extra));
    run(0.3); player.carry = 1; at(4, 3); player.inShield = true; BH.talk.reset(); TS().lastTalk = -9; run(0.1);
    const y0 = count("Y"); pressE(); const signed = !!TS().pay;
    const k = BH.stamps.count(); let g = 0; while (g++ < 4000 && BH.stamps.count() < k + 4) step(STEP);
    run(1.5);
    return { y0, y1: count("Y"), signed };
  };
  out.gateKey = runGate({ gateBy: "key" });
  out.gateCtrl = runGate({});
}

{
  const MAP = [
    "####################",
    "#P....M............#",
    "#~~~~~~~~~~~~~~~~~~#",
    "#YYYYYYYYYYYYYYYYYY#",
    "#~~~~~~~~~~~~~~~~~~#",
    "####################"];
  fixture(MAP, { talks: [{ at: [6, 1], r: 1.6, id: "machine" }] });
  run(0.3); player.carry = 1; at(5, 1); BH.talk.reset(); TS().lastTalk = -9; run(0.1);
  const y0 = count("Y"); pressE();
  run(1.0);
  const at05 = count("Y");
  run(1.0);
  out.landOpensY = { y0, at05, y1: count("Y") };
}

{
  const MAP = ["##########", "#P.c....D#", "##########"];
  fixture(MAP, { need: 1, elders: [] });
  run(0.3);
  save.trail = save.trail || {}; const w0 = save.trail.wallets; save.trail.wallets = Math.max(1, w0 | 0);
  player.x = coins[0].x; player.y = coins[0].y; step(STEP);
  const k = BH.stamps.count(), readyAtGrab = BH.stamps.ready();
  let all = []; run(4, (i) => { if (i % 10 === 0) all = all.concat(drawn(() => render())); });
  const denTxt = all.filter(t => /^DEN /.test(t)), lockTalk = all.filter(t => /UNLOCK|BLOCK|STAMP/i.test(t));
  save.trail.wallets = w0;
  at(8, 1); run(0.2);
  out.padDen = { readyAtGrab, phase: game.phase, stampsWaited: BH.stamps.count() - k, denTxt, lockTalk, drawnN: all.length };
}

{
  const MAP = [
    "################",
    "#P.....~~~~~~~~#",
    "#......~~~~d~~~#",
    "#......~~~~~~~~#",
    "################"];
  fixture(MAP, { need: 2 });
  run(1);
  let elderWet = 0, samples = 0;
  player.carry = 2; at(11, 2); player.inShield = true;
  let g = 0;
  while (g++ < 1200 && game.phase === "play") { step(STEP); samples++; TS().elders.forEach(e => { if (wet(e)) elderWet++; }); }
  out.riverDen = { phase: game.phase, elderWet, samples, waitedSteps: g, wetAtEnd: TS().elders.map(wet) };
}

{
  const MAP = [
    "################################",
    "#.....~~~~.....................#",
    "#.....~~~~.....................#",
    "#..P..~~~~.....................#",
    "#.....~~~~.....................#",
    "#.....~~~~.....................#",
    "################################"];
  const swim = (elders, hunters) => {
    fixture(MAP, { need: 99, elders: elders, hunters: hunters || [] });
    run(1.5);
    let feed = { x: 1, y: 0, a: 0, s: 0 }, t = 0, tIn = null, tOut = null, wetAt = [null, null], dryAt = [null, null], maxGap = 0, wasWet = false;
    const keep = inputFeed; inputFeed = () => feed;
    try {
      for (let k = 0; k < Math.round(8 / STEP) && game.phase === "play"; k++) {
        step(STEP); t += STEP;
        if (player.inShield && tIn == null) tIn = t;
        if (tIn != null && !player.inShield && tOut == null) tOut = t;
        TS().elders.forEach((e, i) => {
          if (tIn != null && wetAt[i] == null && wet(e)) wetAt[i] = +(t - tIn).toFixed(3);
          if (tOut != null && wetAt[i] != null && dryAt[i] == null && !wet(e)) dryAt[i] = +(t - tOut).toFixed(3);
          maxGap = Math.max(maxGap, Math.hypot(e.x - player.x, e.y - player.y) / T);
        });
        if (tOut != null && t - tOut > 2.5) break;
      }
    } finally { inputFeed = keep; }
    return { tIn: tIn && +tIn.toFixed(3), tOut: tOut && +tOut.toFixed(3), wetAt, dryAt, maxGap: +maxGap.toFixed(2), phase: game.phase, n: TS().elders.length };
  };
  out.follow = swim(["oak", "sly"]);
  out.followCtrl = swim([]);
}

return out;
`;

const DOC = { steps: [], machine: ["post"], wise: ["hunter", "sleeper"], bank: ["river"], inriver: ["pine", "riverpost", "proofgate"], stayin: ["focus"], anybox: ["dog", "tags"], piles: ["watcher", "piles"], glasskey: [], doors: ["watcher", "piles", "u1"], letter: [], mail: [], campfire: ["helper", "edge"], dam: ["proof"], bonus2: ["exchange"], together: ["dog"] };
const P22 = (from, to) => String.raw`
out.plans = LEVELS.map((l, i) => ({ i, tid: l.tid, plan: BH.trailTour.plan(i) }));
out.cam = [];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (let i = ${from}; i <= ${to} && i < LEVELS.length; i++) {
  if (!BH.trailTour.plan(i).length) continue;
  loadLevel(i, false); game.screen = "play";
  const s = { i, tid: L.tid, move: [], dwell: [], dwellFollow: [], samples: 0, stopsSeen: 0, frozenTalk: 0, talkSamples: 0, ended: false };
  let prev = null, t0 = performance.now(), lastAdvance = 0, started = false, gap = 0, lastF = performance.now(), live = true;
  (function tick() { const n = performance.now(); gap = Math.max(gap, n - lastF); lastF = n; if (live) requestAnimationFrame(tick); })();
  ${process.env.CAM_CTRL ? "let held = null; (function hold() { const c = TS().tour; if (c && !BH.talk.isOpen() && performance.now() - t0 > 1500 && performance.now() - t0 < 2500) { held = held || { x: c.at.x, y: c.at.y }; c.at.x = held.x; c.at.y = held.y; } if (live) requestAnimationFrame(hold); })();" : ""}
  s.stalls = 0;
  while (performance.now() - t0 < 60000) {
    await sleep(100);
    const st = TS();
    if (st.tour && !started) {
      const mk = st.tour.ride.marks; s.order = mk.filter(m => !m.home).map(m => m.key);
      const rv = mk.find(m => m.key === "river"), V = (markers.V || [])[0];
      if (rv) { const p = rv.get(); s.riverSpot = { tile: tile(Math.floor(p.x / T), Math.floor(p.y / T)), fromWatcher: V ? +Math.hypot(p.x / T - (V.tx + 0.5), p.y / T - (V.ty + 0.5)).toFixed(1) : null }; }
      const said = mk.filter(m => m.says).map(m => m.says[0][1]); s.lines = said;
      const pm = mk.find(m => m.key === "post"), pz = (L.talks || []).find(z => z.id === "machine");
      if (pm && pz) s.postDx = +((pm.get().x / T) - (pz.at[0] + 0.5)).toFixed(2);
    }
    if (st.tour) started = true;
    if (started && !st.tour) { s.ended = true; break; }
    if (!st.tour) continue;
    const r = st.tour.ride, at = { x: st.tour.at.x, y: st.tour.at.y, t: performance.now() };
    const drew = gap <= 55; gap = 0;
    if (prev && !drew) s.stalls++;
    const hm = r.marks[r.i], near = hm && !hm.home && Math.hypot(at.x - hm.get().x, at.y - hm.get().y) < T * 3, held = hm && (r.talking || r.lab || near);
    const v = prev && drew ? Math.hypot(at.x - prev.x, at.y - prev.y) / T / ((at.t - prev.t) / 1000) : null;
    if (hm && r.talking && BH.talk.isOpen()) {
      if (!s.lineAt) s.lineAt = performance.now();
      if (v != null && performance.now() - s.lineAt > 600) (hm.follow ? s.dwellFollow : s.dwell).push(+v.toFixed(2));
    } else s.lineAt = 0;
    const departing = s.wasHeld; s.wasHeld = held;
    if (v != null && !hm?.home && !held && !departing && performance.now() - t0 > 400) {
      s.move.push(+v.toFixed(2)); if (v < 0.6) (s.where = s.where || []).push([r.i, r.marks.length, Math.round(performance.now() - t0), +(Math.hypot(st.tour.at.x - r.marks[r.i].get().x, st.tour.at.y - r.marks[r.i].get().y) / T).toFixed(1), game.phase]);
    }
    prev = at;
    const hOpen = BH.talk.isOpen();
    if (hOpen && !s.hOpenAt) s.hOpenAt = performance.now(); if (!hOpen) s.hOpenAt = 0;
    if (hOpen && performance.now() - s.hOpenAt > 1800) { lastAdvance = performance.now(); s.hOpenAt = 0; BH.talk.reset(); const r2 = st.tour.ride; if (r2.talking) { r2.talking = false; r2.dwell = null; r2.i++; } s.stopsSeen++; }
  }
  live = false;
  s.minMove = s.move.length ? Math.min(...s.move) : null; s.maxDwell = s.dwell.length ? Math.max(...s.dwell) : null;
  s.slowMove = s.move.filter(v => v < 0.6).length; s.movingDwell = s.dwell.filter(v => v > 0.15).length;
  const fs = s.dwellFollow.slice().sort((a, b) => a - b); s.followMedian = fs.length ? fs[Math.floor(fs.length / 2)] : null; s.nFollow = fs.length;
  s.nMove = s.move.length; s.nDwell = s.dwell.length; delete s.move; delete s.dwell; delete s.dwellFollow;
  for (const z of (L.talks || [])) {
    player.carry = 3; at(z.at[0], z.at[1] + 1); if (solidP(tile(z.at[0], z.at[1] + 1))) at(z.at[0] - 1, z.at[1]);
    for (let k = 0; k < 40; k++) { step(STEP); if (BH.talk.isOpen()) { s.talkSamples++; if (game.phase !== "play" && game.phase !== "escaped") s.frozenTalk++; } }
  }
  out.cam.push(s);
}
return out;
`;

const P23 = String.raw`
loadLevel(2, false); game.screen = "play";
const t0 = performance.now();
let openAt = 0, worst = 0, held = 0, started = false, z = 0;
while (performance.now() - t0 < 50000) {
  await new Promise(r => setTimeout(r, 200));
  const c = TS().tour;
  if (c) started = true;
  if (started && !c) break;
  if (!c) continue;
  const r = c.ride, m = r.marks[r.i];
  if (!m || m.home) continue;
  z = c.z;
  const g = m.get(), off = Math.hypot(c.at.x - g.x, c.at.y - g.y) / T;
  if (BH.talk.isOpen()) { if (!openAt) openAt = performance.now(); if (performance.now() - openAt > 3000) worst = Math.max(worst, off); }
  if (BH.talk.isOpen() && performance.now() - openAt > 10000) { held++; BH.talk.reset(); r.talking = false; r.dwell = null; r.i++; openAt = 0; }
}
out.slowRead = { held, worst: +worst.toFixed(1), z: +z.toFixed(2) };
return out;
`;

function drive(body, size) {
  const r = spawnSync(process.execPath, [path.join(__dirname, "drive.js"), "/index.html?unlock", "-", size || "1280,800"], { input: body, encoding: "utf8", timeout: 480000, env: process.env });
  try { return JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
}

const checks = [];
function add(name, ok, val) { checks.push([name, !!ok, val]); }

if (!ONLY || ONLY === "1.6") {
  const d = drive(COMMON + P16), o = d.result || {};
  add("1.6  0 console errors (new levels + retired levels + fixtures)", d.errors.length === 0, d.errors.slice(0, 5).join(" | ") || 0);
  const w = o.wallet || {};
  const jl = o.jolt || {};
  add("1.6  touching a coin with no wallet: pause, rumble and sound first, the talk only after", jl.trauma > 0.5 && jl.talkBefore === 0 && jl.talkAfter > 0 && jl.apartTiles >= 0.6, JSON.stringify(jl));
  add("1.6  level 0 notepad shows 24 distinct words, head MY 24 WORDS, 2 columns", w.lis === 24 && w.distinct === 24 && w.head === "MY 24 WORDS" && String(w.cols) === "2", JSON.stringify({ lis: w.lis, head: w.head, cols: w.cols }));
  add("1.6  word test: 3 distinct options, word 3 among them, the 2 wrong ones not on the notepad", w.distinctOpts === 3 && w.thirdIsOpt && w.rightOnPad === 1, JSON.stringify({ opts: w.opts, third: w.third }));
  const l1 = o.level1 || {};
  add("1.6  level 1: the post asks, signing takes the coin", l1.ask && !l1.ask.water && l1.signed && l1.carryAfter === 0, JSON.stringify(l1.ask));
  add("1.6  level 1 control: no pay, gate H shut for 3 s", l1.hBefore > 0 && l1.shutNoPay === l1.hBefore, `${l1.shutNoPay}/${l1.hBefore}`);
  add("1.6  level 1: the gate opens once the coin lands in the post (#305), 0.7 to 1.0 s after signing", l1.openedAfter != null && l1.openedAfter >= 0.7 && l1.openedAfter <= 1.0, `opened ${l1.openedAfter} s after signing`);
  add("1.6  level 1: nothing reads WAITING / UNLOCK / BLOCK / SAFE after signing (drawn)", l1.waitDrawn === 0, `drawn x${l1.waitDrawn}`);
  add("1.6  level 1: post label reads PAID (drawn; positive control for the scan above)", l1.conf === "PAID" && l1.paidDrawn > 0, `${l1.conf}, drawn x${l1.paidDrawn}`);
  const pn = o.payNag || {};
  add("1.6  level 1: Sly's pay line never plays after paying (control: plays once unpaid)", pn.paid && pn.paid.paid && pn.paid.nag === 0 && pn.notPaid && pn.notPaid.nag === 1, JSON.stringify(pn));
  const ip = o.instantPay || {};
  add("1.6  a coin just picked up signs at the post at once (control: no coin, no signing)", ip.noCoin === false && ip.readyNow === 1 && ip.signed === true, JSON.stringify(ip));
  const tp = o.twoPosts || {};
  add("1.6  M and U: the nearer post prompts", tp.nearLand === "7,1" && tp.nearRiver === "10,4" && tp.riverWater === true, `${tp.nearLand} / ${tp.nearRiver}`);
  add("1.6  prompt text: land SIGN, PAY 1 ZEC · PUBLIC, river SIGN, PAY 1 ZEC", (tp.landAsk || [])[0] === "SIGN, PAY 1 ZEC · PUBLIC" && (tp.riverAsk || [])[0] === "SIGN, PAY 1 ZEC", JSON.stringify([tp.landAsk, tp.riverAsk]));
  const ll = tp.landLink || [], rl = tp.riverLink || [];
  add("1.6  payment link: land fills in zcash:t1 address, who, amount, NO memo; river adds a memo; gone once signed",
    ll.includes("PAYMENT LINK") && ll.some(t => /^zcash:t1/.test(t)) && ll.includes("AMOUNT: 1 ZEC") && !ll.some(t => /^MEMO: /.test(t)) &&
    rl.some(t => /^zcash:u1/.test(t)) && rl.some(t => /^MEMO: /.test(t)) && tp.landLinkAfter === 0, JSON.stringify([ll, rl, tp.landLinkAfter]));
  add("1.6  fee dot drawn on a land sign and on a river sign", tp.landFee > 0 && tp.riverFee > 0, `land ${tp.landFee}, river ${tp.riverFee}`);
  add("1.6  river sign logs 1 OUT row (BH.river.spent)", tp.outRows === 1, tp.outRows);
  const gk = o.gateKey || {}, gc = o.gateCtrl || {};
  add("1.6  gateBy key: a river payment leaves every Y shut", gk.signed && gk.y0 > 0 && gk.y1 === gk.y0, `${gk.y1}/${gk.y0}`);
  add("1.6  control: same payment without gateBy opens the PROOF GATE", gc.signed && gc.y0 > 0 && gc.y1 === 0, `${gc.y1}/${gc.y0}`);
  const ly = o.landOpensY || {};
  add("1.6  land post, no H, river gate present (level 5): opens once the coin lands (by 1.0 s, #305)", ly.y0 > 0 && ly.at05 === 0 && ly.y1 === 0, `${ly.at05} -> ${ly.y1}/${ly.y0}`);
  const pd = o.padDen || {};
  add("1.6  a coin just picked up is ready at once and the den takes it: escaped", pd.readyAtGrab === 1 && pd.phase === "escaped", JSON.stringify({ ready: pd.readyAtGrab, phase: pd.phase }));
  add("1.6  4 s after a pickup: wallet card says DEN OPEN, nothing says UNLOCK / BLOCK / STAMP", (pd.denTxt || []).length > 0 && pd.denTxt.every(t => /^DEN OPEN\b/.test(t)) && (pd.lockTalk || []).length === 0, JSON.stringify({ den: (pd.denTxt || []).slice(0, 2), lock: pd.lockTalk, drawn: pd.drawnN }));
  const rd = o.riverDen || {};
  add("1.6  river den with both elders (#299): they swim to the den with you, escaped", rd.phase === "escaped" && rd.elderWet > 0 && (rd.wetAtEnd || []).every(Boolean), JSON.stringify({ phase: rd.phase, wet: rd.elderWet, steps: rd.waitedSteps, end: rd.wetAtEnd }));
  const fo = o.follow || {}, fc = o.followCtrl || {};
  add("1.6  #299 both friends follow you into the water: each tile is water within 2 s of you", fo.n === 2 && fo.wetAt.every(x => x != null && x <= 2), JSON.stringify(fo));
  add("1.6  #299 and out again on the far bank: both on land within 2 s of you", fo.tOut != null && fo.dryAt.every(x => x != null && x <= 2) && fo.maxGap < 6, JSON.stringify({ dry: fo.dryAt, gap: fo.maxGap }));
  add("1.6  #299 they never block you: in and out at the same moments as with no friends, never caught", fc.n === 0 && fo.tIn === fc.tIn && fo.tOut === fc.tOut && fo.phase === "play", JSON.stringify({ with: [fo.tIn, fo.tOut], without: [fc.tIn, fc.tOut], phase: fo.phase }));
}

if (!ONLY || ONLY === "2.2") {
  for (const size of ["1280,800", "1920,1080"]) {
    for (const [a, b] of [[1, 5], [6, 10]]) {
      const d = drive(COMMON + P22(a, b), size), o = d.result || {};
      add(`2.2  ${size} levels ${a}-${b}: 0 console errors`, d.errors.length === 0, d.errors.slice(0, 3).join(" | ") || 0);
      if (a === 1 && size === "1280,800") {
        (o.plans || []).forEach(p => add(`2.2  level ${p.i} (${p.tid}) tour stops = design doc`, JSON.stringify(p.plan) === JSON.stringify(DOC[p.tid] || []), JSON.stringify(p.plan) + " vs " + JSON.stringify(DOC[p.tid])));
      }
      for (const s of o.cam || []) {
        add(`2.2  ${size} level ${s.i} (${s.tid}): tour ran and ended`, s.ended, s.stopsSeen + " talk stops");
        add(`2.2  ${size} level ${s.i}: camera never under 0.6 tiles/s between stops`, s.nMove > 2 && s.slowMove === 0, `min ${s.minMove} over ${s.nMove} samples, ${s.slowMove} slow ${JSON.stringify(s.where || [])}, ${s.stalls} page stalls skipped`);
        add(`2.2  ${size} level ${s.i}: camera stands still (under 0.15 tiles/s) while a line about a fixed spot is read`, s.nDwell === 0 || s.movingDwell === 0, `max ${s.maxDwell} over ${s.nDwell} samples, ${s.movingDwell} moving; on a walking hunter (keeps him in frame) median ${s.followMedian} over ${s.nFollow}`);
        add(`2.2  ${size} level ${s.i}: no talk box freezes play`, s.frozenTalk === 0, `${s.frozenTalk} frozen of ${s.talkSamples} talk samples`);
        if (s.i === 1) add(`2.2  ${size} level 1: the post stop frames post and gate, centred right of the post`, s.postDx > 0.2 && s.postDx < 1, `${s.postDx} tiles right of the post`);
        if (s.i === 2) add(`2.2  ${size} level 2: the sleeper comes first, then the hunter and the bush`, JSON.stringify((s.order || []).slice(0, 3)) === JSON.stringify(["sleeper", "hunter", "bush"]), JSON.stringify(s.order));
        if (s.i === 6) add(`2.2  ${size} level 6: the coin pile comes first, then the dog, both lines read`, JSON.stringify(s.order) === JSON.stringify(["coinpile", "tags", "dog"]) && s.stopsSeen === 3, JSON.stringify(s.order) + ", " + s.stopsSeen + " talk stops");
        if (s.i === 3) add(`2.2  ${size} level 3: "No prints in the water." looks at open water, and level 4 has no watcher`,
          s.riverSpot && s.riverSpot.tile === "~" && s.riverSpot.fromWatcher === null, JSON.stringify({ spot: s.riverSpot, order: s.order }));
      }
    }
  }
}

if (!ONLY || ONLY === "2.2") {
  const d = drive(COMMON + P23), sr = (d.result || {}).slowRead || {};
  add("2.2  level 2 slow reader (each line held 10 s): camera stays within 3 tiles (at 1.35 zoom, same screen distance at any zoom) of what the line is about", sr.held >= 2 && sr.worst <= 3 * 1.35 / (sr.z || 1.35), JSON.stringify(sr));
}

if (!ONLY || ONLY === "3.2") {
  const src = require("fs").readFileSync(path.join(__dirname, "..", "site", "engine", "hunt-mode.js"), "utf8");
  const lits = [...src.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1].replace(/\\n/g, " ").replace(/\\'/g, "'")).filter(s => / /.test(s) && /[a-z]/i.test(s) && /[.!?]$/.test(s.trim()));
  const sentences = (s) => s.split(/(?<=[.!?])\s+(?=[A-Z0-9'])/).filter(x => !/^\.\.\./.test(x)).length;
  const RETIRED = /lend me 2 coins|Wallet support here|Payment built|SPENT TAG|I run the server|Tried on all|BUILD POST|PROVE POST|SIGN POST|Sent\. But the screen|ORDER 7|SENT too|SPEND everything|The little one|You came\. My file|That goes in the file|river shows me nothing|walks this path/;
  const DOCLINE = /Someone got paid\. Who, and how much\? Hidden\./;
  const long = lits.filter(s => sentences(s) > 2 && !RETIRED.test(s) && !DOCLINE.test(s));
  console.log("3.2  every sentence-like string in hunt-mode.js (" + lits.length + "):\n" + lits.map(s => "     [" + sentences(s) + "] " + s).join("\n"));
  add("3.2  every line is at most 2 sentences", lits.length > 50 && long.length === 0, long.join(" | ") || lits.length + " lines");
  const banned = /12 words|twelve|2\.5 min|SAFE TO CLIMB|leave with the crowd|most exchanges|Paper, not screens|keep them\?|anyone can grab|anyone to grab/i;
  add("3.2  0 banned words (12 words, twelve, SAFE TO CLIMB, crowd, paper, fur, anyone can grab)", !banned.test(src), (src.match(banned) || [""])[0]);
  add("3.2  no em dash in hunt-mode.js", src.indexOf("—") < 0, src.split("—").length - 1);
  const need = ["Your wallet is backed up by 24 words. Write them down.", "Whoever has the words has the coins.", "Bring the post a coin first.",
    "That's a hunter. He reads every footprint he finds.","In: {n}, from those footprints. After that, nothing.", "You're shielded now. Nobody can see who you are in here.", "Pine paid you. On land they only saw a ripple.", "The footprints stop at the water. Where did they go?", "The merchant takes payments right here in the water.",
    "This dog follows footprints. If it runs after you, good luck.", "That's the merchant's stall, on land. To pay him there, you have to climb out.",
    "Which one was yours? Could be any.", "A pile of coins in the waters. From outside, every one looks the same.", "Both piles at once? Then both are yours.", "She wants to see your payments.", "I can see it all. I can't touch a coin.",
    "Only she sees. And she keeps the key.", "Never seen him before.", "That's the hunter's control tower. It sees movement in the waters, never who or how much.", "Someone got paid. Who, and how much? Hidden.",
    "You paid privately inside the waters. The shore only saw what you shielded.", "You made it. The shore saw some of it.", "In the water you're shielded, in a private layer. Nobody can see who you are.", "No wallet, no coins. Want one?",
    "No wallet, no keys, no coins. Let's make your first one.", "Same with your footprints. Look: anyone can follow them and find you."];
  const miss = need.filter(s => src.indexOf(s.replace(/'/g, "'")) < 0);
  add("3.2  every design-doc line for this file is present word for word", miss.length === 0, miss.join(" | ") || need.length + " lines");
}

const P41 = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.trailFeature && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 600));
const wait = (ms) => new Promise(r => setTimeout(r, ms)), TS = () => BH.trailFeature.api.state, out = { q: BH.trailEndQ, order: (window.TRAIL_ORDER || []).slice() };
const mi = trailIndexOf("machine");
async function card(idx, ok) {
  loadLevel(idx, false); game.screen = "play";
  const s = TS(); s.tourPending = false; s.cinePending = false; s.tour = null; document.body.classList.remove("trail-cine"); if (game.phase === "talk") game.phase = "play";
  BH.trailFeature.api.win();
  for (let k = 0; k < 60 && !document.querySelector(".ec-onmap .ec-q"); k++) await wait(100);
  const q = document.querySelector(".ec-onmap .ec-q"); if (!q) return null;
  q.querySelector('.ec-q-a[data-ok="' + (ok ? 1 : 0) + '"]').click(); q.querySelector('.ec-q-a[data-ok="' + (ok ? 0 : 1) + '"]').click();
  return { tid: q.dataset.tid, n: q.querySelectorAll(".ec-q-a").length, said: q.querySelector(".ec-q-say").textContent, cls: q.className, next: !!q.parentNode.querySelector("#btnNext") };
}
out.wrong = await card(mi, false); out.right = await card(trailIndexOf("bank"), true);
return out;
`;
if (!ONLY || ONLY === "4.1") {
  const d = drive(P41), o = d.result || {}, Q = o.q || {};
  const TIDS = o.order || [];
  const badQ = TIDS.filter(t => { const q = Q[t]; return !q || q.length < 4 || q.slice(0, 4).some(s => !s || s !== s.toUpperCase() || /—/.test(s)) || q[1] === q[2]; });
  add("4.1  end-card question for every level in TRAIL_ORDER: question, right, wrong, the right answer, ALL CAPS, no em dash", TIDS.length > 0 && badQ.length === 0, badQ.join(",") || TIDS.length);
  add("4.1  wrong tap shows the right answer, second tap ignored, NEXT LEVEL still there", o.wrong && o.wrong.tid === "machine" && o.wrong.n === 2 && o.wrong.said === Q.machine[3] && /is-no/.test(o.wrong.cls) && o.wrong.next, JSON.stringify(o.wrong));
  add("4.1  right tap confirms", o.right && o.right.tid === "bank" && o.right.said === "RIGHT." && /is-ok/.test(o.right.cls) && o.right.next, JSON.stringify(o.right));
  if (d.errors && d.errors.length) add("4.1  no page errors", false, d.errors.slice(0, 3).join(" | "));
}

let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
