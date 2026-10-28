"use strict";

const vm = require("vm");
const fs = require("fs");
const path = require("path");

const LIM = { wallet: 10000000, zec: 100000, inv: 999, best: 86400, refund: 1000000, keys: 256, flagKeys: 128 };
const ID_RE = /^(?!(?:constructor|prototype)$)[a-z0-9-]{1,48}$/;
const KEY_RE = /^(?!(?:__proto__|constructor|prototype)$)[A-Za-z0-9_-]{1,48}$/;
const SLOT_RE = /^(?!(?:constructor|prototype)$)[a-z]{1,16}$/;
const LEND_SLACK = 2;

function loadCatalog(siteDir) {
  const win = { BH: {}, console: { log() {}, warn() {}, error() {} } };
  win.window = win;
  win.document = { currentScript: null, createElement() { throw new Error("no DOM on the server"); } };
  const ctx = vm.createContext(win);
  for (const f of ["levels/levels.js", "characters/cosmetics.js", "characters/characters.js", "characters/prices.js"])
    vm.runInContext(fs.readFileSync(path.join(siteDir, f), "utf8"), ctx, { filename: f, timeout: 2000 });
  const levels = Array.isArray(win.LEVELS) ? win.LEVELS.length : 0;
  const R = win.TRAIL_REMAP || {}, remap = {}, cut = {};
  for (const v of Object.keys(R.maps || {})) {
    remap[v] = {}; cut[v] = {};
    for (const k of Object.keys(R.maps[v])) remap[v][k] = +R.maps[v][k];
    for (const k of Object.keys((R.cut || {})[v] || {})) cut[v][k] = true;
  }
  const trailV = +R.to || 6;
  const genesis = typeof win.genesisAt === "function" ? +win.genesisAt() : levels;
  const K = win.BH.cosmetics, CH = win.BH.characters;
  if (!levels || !K || !Array.isArray(K.list) || !CH || !Array.isArray(CH.list)) throw new Error("catalog: the game files did not load");
  const cosPrice = new Map(), charPrice = new Map();
  for (const it of K.list) if (it && typeof it.id === "string" && it.rule && +it.rule.price > 0) cosPrice.set(it.id, +it.rule.price);
  for (const it of CH.list) if (it && typeof it.id === "string" && it.rule && +it.rule.buy > 0) charPrice.set(it.id, +it.rule.buy);
  return { levels, cosPrice, charPrice, remap, cut, genesis, trailV };
}

function remapKeys(m, map, cut) {
  if (!isObj(m)) return m;
  const out = {}, num = [];
  for (const k of Object.keys(m)) { if (/^\d+$/.test(k)) num.push(k); else out[k] = m[k]; }
  for (const k of num) if (!cut[k] && map[k]) out[map[k]] = m[k];
  for (const k of num) if (cut[k] && map[k] && out[map[k]] === undefined) out[map[k]] = m[k];
  return out;
}
const verOf = (v, cat) => (cat.remap[String(v)] ? String(v) : "2");
function upgrade(s, cat) {
  if (!isObj(s) || !cat.remap || s.trailV === cat.trailV) return s;
  const v = verOf(s.trailV, cat), map = cat.remap[v], cut = (cat.cut && cat.cut[v]) || {}, o = Object.assign({}, s);
  if (!map) return s;
  const rk = (m) => remapKeys(m, map, cut);
  for (const k of ["stars", "best", "bestZec", "medals"]) if (isObj(o[k])) o[k] = rk(o[k]);
  if (isObj(o.badges)) { o.badges = rk(o.badges); if (isObj(o.badges.sweep)) o.badges.sweep = rk(o.badges.sweep); }
  if (isObj(o.trail) && isObj(o.trail.clues)) o.trail = Object.assign({}, o.trail, { clues: rk(o.trail.clues) });
  o.gAt = cat.genesis || o.gAt;
  o.trailV = cat.trailV;
  return o;
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
class Bad extends Error {}
const bad = (field) => { throw new Bad(field); };

function levelMap(v, field, nLevels, ok) {
  if (v === undefined) return {};
  if (!isObj(v)) bad(field);
  const out = {}, keys = Object.keys(v);
  if (keys.length > nLevels) bad(field);
  for (const k of keys) {
    if (!/^[1-9]\d{0,2}$/.test(k) || +k > nLevels) bad(field);
    if (v[k] === null) continue;
    if (!ok(v[k])) bad(field);
    out[k] = v[k];
  }
  return out;
}
function idFlags(v, field, re) {
  if (v === undefined) return {};
  if (!isObj(v)) bad(field);
  const keys = Object.keys(v); if (keys.length > LIM.keys) bad(field);
  const out = {};
  for (const k of keys) { if (!(re || ID_RE).test(k) || typeof v[k] !== "boolean") bad(field); if (v[k]) out[k] = true; }
  return out;
}
function flagTree(v, field) {
  if (v === undefined) return {};
  if (!isObj(v)) bad(field);
  const keys = Object.keys(v); if (keys.length > LIM.flagKeys) bad(field);
  const out = {};
  for (const k of keys) {
    if (!KEY_RE.test(k)) bad(field);
    const x = v[k];
    if (typeof x === "boolean") { if (x) out[k] = true; continue; }
    if (!isObj(x)) bad(field);
    const inner = {}, ik = Object.keys(x); if (ik.length > LIM.flagKeys) bad(field);
    for (const j of ik) { if (!KEY_RE.test(j) || typeof x[j] !== "boolean") bad(field); if (x[j]) inner[j] = true; }
    out[k] = inner;
  }
  return out;
}
function plainData(v, depth) {
  if (v === null || typeof v === "boolean") return true;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") return v.length <= 400;
  if (depth >= 4) return false;
  if (Array.isArray(v)) return v.length <= 64 && v.every((x) => plainData(x, depth + 1));
  if (!isObj(v)) return false;
  const ks = Object.keys(v); if (ks.length > 64) return false;
  return ks.every((k) => KEY_RE.test(k) && plainData(v[k], depth + 1));
}
const optInt = (v, field, hi) => { if (v === undefined || v === null) return 0; if (!isInt(v, 0, hi)) bad(field); return v; };
const optBool = (v, field) => { if (v === undefined || v === null) return false; if (typeof v !== "boolean") bad(field); return v; };

function normalize(raw, cat) {
  if (!isObj(raw)) bad("save");
  const s = {};
  s.v = optInt(raw.v, "v", 99);
  s.trailV = optInt(raw.trailV, "trailV", 99);
  const oldMap = s.trailV !== cat.trailV && cat.remap ? cat.remap[verOf(s.trailV, cat)] : null;
  const n = oldMap ? Math.max(cat.levels, ...Object.keys(oldMap).map(Number)) : cat.levels;
  s.gAt = optInt(raw.gAt, "gAt", 999);
  s.stars = levelMap(raw.stars, "stars", n, (x) => isInt(x, 0, 3));
  s.best = levelMap(raw.best, "best", n, (x) => typeof x === "number" && x > 0 && x <= LIM.best);
  s.bestZec = levelMap(raw.bestZec, "bestZec", n, (x) => isInt(x, 0, LIM.zec));
  s.medals = levelMap(raw.medals, "medals", n, (x) => isObj(x) && Object.keys(x).length <= 16 && Object.keys(x).every((k) => SLOT_RE.test(k) && typeof x[k] === "boolean"));
  for (const k of Object.keys(s.medals)) { const m = {}; for (const j of Object.keys(s.medals[k])) if (s.medals[k][j]) m[j] = true; s.medals[k] = m; }
  s.badges = flagTree(raw.badges, "badges");
  s.story = flagTree(raw.story, "story");
  s.chars = idFlags(raw.chars, "chars");
  s.up = idFlags(raw.up, "up", KEY_RE);
  s.pu = {};
  if (raw.pu !== undefined) {
    if (!isObj(raw.pu) || Object.keys(raw.pu).length > 64) bad("pu");
    for (const k of Object.keys(raw.pu)) { if (!KEY_RE.test(k) || !isInt(raw.pu[k], 0, 9)) bad("pu"); s.pu[k] = raw.pu[k]; }
  }
  s.cos = { owned: {} };
  if (raw.cos !== undefined) {
    if (!isObj(raw.cos)) bad("cos");
    for (const k of Object.keys(raw.cos)) {
      if (k === "owned") { s.cos.owned = idFlags(raw.cos.owned, "cos.owned"); continue; }
      if (!SLOT_RE.test(k) || typeof raw.cos[k] !== "string" || !ID_RE.test(raw.cos[k])) bad("cos");
      s.cos[k] = raw.cos[k];
    }
  }
  if (raw.char !== undefined && raw.char !== "" && (typeof raw.char !== "string" || !ID_RE.test(raw.char))) bad("char");
  s.char = typeof raw.char === "string" ? raw.char : "";
  s.wallet = raw.wallet === undefined ? 0 : raw.wallet;
  if (typeof s.wallet !== "number" || !Number.isFinite(s.wallet) || s.wallet < 0 || s.wallet > LIM.wallet) bad("wallet");
  s.wallet = Math.floor(s.wallet);
  s.inv = {};
  if (raw.inv !== undefined) {
    if (!isObj(raw.inv) || Object.keys(raw.inv).length > 64) bad("inv");
    for (const k of Object.keys(raw.inv)) { if (!KEY_RE.test(k) || !isInt(raw.inv[k], 0, LIM.inv)) bad("inv"); if (raw.inv[k]) s.inv[k] = raw.inv[k]; }
  }
  s.mapPanned = optInt(raw.mapPanned, "mapPanned", 1);
  s.itemsRefund = optInt(raw.itemsRefund, "itemsRefund", LIM.refund);
  s.gearRefund = optInt(raw.gearRefund, "gearRefund", LIM.refund);
  s.itemsRefundShown = optBool(raw.itemsRefundShown, "itemsRefundShown");
  s.gearRefundShown = optBool(raw.gearRefundShown, "gearRefundShown");
  s.trail = {};
  if (raw.trail !== undefined) {
    if (!isObj(raw.trail) || !plainData(raw.trail, 0) || JSON.stringify(raw.trail).length > 8192) bad("trail");
    s.trail = raw.trail;
  }
  return upgrade(s, cat);
}

const EMPTY = () => ({ v: 0, trailV: 4, gAt: 0, stars: {}, best: {}, bestZec: {}, medals: {}, badges: {}, story: {}, chars: {}, up: {}, pu: {}, cos: { owned: {} }, char: "",
  wallet: 0, inv: {}, mapPanned: 0, itemsRefund: 0, gearRefund: 0, itemsRefundShown: false, gearRefundShown: false, trail: {} });
function mergeMap(a, b, pick) { const out = Object.assign({}, a); for (const k of Object.keys(b)) out[k] = k in out ? pick(out[k], b[k]) : b[k]; return out; }
function unionTree(a, b) {
  const out = {};
  for (const src of [a, b]) for (const k of Object.keys(src)) {
    const x = src[k];
    if (x === true) { if (!isObj(out[k])) out[k] = true; continue; }
    out[k] = Object.assign(isObj(out[k]) ? out[k] : {}, x);
  }
  return out;
}
const cleared = (s) => Object.keys(s.stars).length;

function walletCap(s, cat) {
  let earned = (isObj(s.trail) && "lent" in s.trail ? LEND_SLACK : 0) + s.itemsRefund + s.gearRefund;
  for (const k of Object.keys(s.bestZec)) earned += s.bestZec[k];
  let spent = 0;
  for (const id of Object.keys(s.cos.owned)) spent += cat.cosPrice.get(id) || 0;
  for (const id of Object.keys(s.chars)) spent += cat.charPrice.get(id) || 0;
  return Math.max(0, earned - spent);
}

function merge(S, C, B, cat) {
  S = upgrade(S || Object.assign(EMPTY(), { trailV: cat.trailV }), cat); C = upgrade(C, cat); B = B || { wallet: 0, inv: {} };
  const m = {};
  m.v = Math.max(S.v, C.v); m.trailV = Math.max(S.trailV || 0, C.trailV || 0); m.gAt = Math.max(S.gAt, C.gAt);
  m.stars = mergeMap(S.stars, C.stars, Math.max);
  m.best = mergeMap(S.best, C.best, Math.min);
  m.bestZec = mergeMap(S.bestZec, C.bestZec, Math.max);
  m.medals = mergeMap(S.medals, C.medals, (a, b) => Object.assign({}, a, b));
  m.badges = unionTree(S.badges, C.badges);
  m.story = unionTree(S.story, C.story);
  m.chars = Object.assign({}, S.chars, C.chars);
  m.up = Object.assign({}, S.up, C.up);
  m.pu = mergeMap(S.pu, C.pu, Math.max);
  m.cos = Object.assign({}, S.cos, C.cos, { owned: Object.assign({}, S.cos.owned, C.cos.owned) });
  m.char = C.char;
  for (const k of ["mapPanned", "itemsRefund", "gearRefund"]) m[k] = Math.max(S[k], C[k]);
  for (const k of ["itemsRefundShown", "gearRefundShown"]) m[k] = S[k] || C[k];
  const tWin = cleared(S) > cleared(C) ? S.trail : C.trail;
  m.trail = Object.assign({}, tWin);
  const endings = Object.assign({}, isObj(S.trail.endings) ? S.trail.endings : {}, isObj(C.trail.endings) ? C.trail.endings : {});
  if (Object.keys(endings).length) m.trail.endings = endings;
  m.inv = {};
  for (const id of new Set([...Object.keys(S.inv), ...Object.keys(C.inv)])) {
    const v = Math.min(LIM.inv, Math.max(0, (S.inv[id] || 0) + (C.inv[id] || 0) - (B.inv[id] || 0)));
    if (v) m.inv[id] = v;
  }
  const three = S.wallet + C.wallet - B.wallet;
  m.wallet = Math.max(0, Math.min(three, walletCap(m, cat), LIM.wallet));
  return m;
}

const counters = (s) => ({ wallet: s.wallet, inv: Object.assign({}, s.inv) });

module.exports = { loadCatalog, normalize, merge, walletCap, counters, upgrade, Bad, EMPTY };
