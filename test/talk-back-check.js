"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const BODY = String.raw`
for (let i = 0; i < 100 && !(window.BH && BH.talk && BH.trailFeature && typeof loadLevel === "function"); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fails = [], log = [];
const ok = (c, m) => { log.push((c ? "ok  " : "FAIL ") + m); if (!c) fails.push(m); };
const st = () => BH.talk._state();
const key = (k) => dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
const btn = () => document.querySelector(".talkbox .talk-back");
const click = (el) => el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
async function settle() { for (let i = 0; i < 40 && st() && !st().done; i++) await sleep(50); }
async function adv() { if (st() && !st().done) key("z"); await sleep(30); key("z"); await sleep(60); await settle(); }
const text = () => st() && st().text;

loadLevel(0, true); game.screen = "play";
const s = BH.trailFeature.api.state;
if (s) { s.tourPending = false; s.cinePending = false; s.tour = null; s.cine = null; s.introDone = true; }
document.body.classList.remove("trail-cine");
if (game.phase === "talk") game.phase = "play";
await sleep(600);
BH.talk.reset();

let after1 = 0;
BH.talk.open([["oak", "Line one."], ["sly", "Line two."], ["oak", "Line three."], ["sly", "Line four."]], () => { after1++; });
await settle();
ok(text() === "Line one." && st().back === false, "line 1 shown, Back hidden");
ok(getComputedStyle(btn()).display === "none", "Back button not displayed on line 1");
key("Backspace"); await sleep(60);
ok(text() === "Line one.", "control: Backspace on line 1 does nothing");
click(btn()); await sleep(60);
ok(text() === "Line one.", "control: clicking hidden Back on line 1 does nothing");
await adv(); await adv();
ok(text() === "Line three.", "advanced 2 lines to line 3");
const b = btn(), r = b.getBoundingClientRect(), m = document.querySelector(".talkbox .talk-more").getBoundingClientRect();
const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
ok(getComputedStyle(b).display !== "none" && r.width > 30 && r.height > 14, "Back visible on line 3 (" + Math.round(r.width) + "x" + Math.round(r.height) + ")");
ok(hit === b, "Back is the element under its own centre (not covered)");
ok(r.right < m.left || r.left > m.right || r.bottom < m.top || r.top > m.bottom, "Back does not overlap the continue hint");
key("Backspace"); await sleep(60);
ok(text() === "Line two.", "Backspace -> line 2");
click(btn()); await sleep(60);
ok(text() === "Line one.", "click Back -> line 1");
ok(st().back === false, "Back hidden again on line 1");
key("Backspace"); await sleep(60);
ok(text() === "Line one.", "control: Back again on line 1 stays on line 1");
await adv(); ok(text() === "Line two.", "forward -> line 2");
await adv(); ok(text() === "Line three.", "forward -> line 3");
await adv(); ok(text() === "Line four.", "forward -> line 4");
ok(after1 === 0, "nothing ran before the last line");
await adv();
ok(st() === null && !BH.talk.isOpen(), "talk closes after the last line");
ok(after1 === 1, "after callback ran exactly once");

let picked = 0, after2 = 0;
BH.talk.open([["oak", "Before the question."], { who: "oak", text: "Want one?", choices: [
  { text: "Yes please", then: () => { picked++; BH.talk.open([["sly", "Follow-up one."], ["sly", "Follow-up two."]], () => { after2++; }); } },
  { text: "No", then: () => {} }] }]);
await settle(); await adv();
await sleep(400); key("1"); await sleep(80); await settle();
ok(text() === "Follow-up one." && picked === 1, "choice opened the follow-up box");
ok(st().back === true, "Back offered on the first line of the follow-up box");
key("Backspace"); await sleep(60);
const shown = document.querySelector(".talkbox .talk-text").textContent;
ok(/^Want one\?/.test(text()) && /Yes please/.test(shown) && st().choices === null && !document.querySelector(".talkbox .talk-choice"), "Back crosses into the question, shows the pick, no live choices");
click(btn()); await sleep(60);
ok(text() === "Before the question." && st().back === false, "Back again -> first line of the conversation, Back hidden");
key("1"); await sleep(80);
ok(picked === 1, "digit keys do nothing while reviewing");
await adv(); ok(/^Want one\?/.test(text()) && st().choices === null, "forward -> question (still review, no buttons)");
await adv(); ok(text() === "Follow-up one." && st().rev === 0, "forward -> back on the live line");
await adv(); ok(text() === "Follow-up two.", "forward -> follow-up two");
await adv();
ok(st() === null && picked === 1 && after2 === 1, "closes; choice and after each ran once");

BH.talk.open([["oak", "Unrelated A."]]); await settle();
BH.talk.open([["oak", "Unrelated B."]]); await settle();
ok(text() === "Unrelated B." && st().back === false, "a box replacing another gets no history");
BH.talk.reset();
const later = new Promise(res => BH.talk.open([["oak", "First."]], () => setTimeout(() => { BH.talk.open([["oak", "Later box."]]); res(); }, 50)));
await settle(); await adv(); await later; await settle();
ok(text() === "Later box." && st().back === false, "a box opened later (timer) gets no history");
BH.talk.reset();
return { fails, log };
`;

let bad = 0;
for (const size of ["1280,800", "390,844"]) {
  const r = spawnSync(process.execPath, [path.join(__dirname, "drive.js"), "index.html?unlock", "-", size], { input: BODY, encoding: "utf8", env: process.env, timeout: 600000 });
  let out = null; try { out = JSON.parse(r.stdout); } catch (e) {}
  if (!out || !out.result) { console.log(size, "NO RESULT", r.status, (r.stdout || "").slice(-800), (r.stderr || "").slice(-800)); bad++; continue; }
  console.log("== " + size + "\n" + out.result.log.join("\n"));
  if (out.errors.length) console.log("page errors:", out.errors);
  if (out.result.fails.length || out.errors.length) bad++;
}
console.log(bad ? "TALK BACK CHECK FAILED" : "TALK BACK CHECK PASSED");
process.exit(bad ? 1 : 0);
