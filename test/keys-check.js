"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const PAGE = String.raw`
for (let i = 0; i < 100 && !(typeof startLevel === "function" && typeof sampleInput === "function" && window.LEVELS); i++) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 400));
startLevel(0);
const out = {};
const send = (type, key, code, shift) => dispatchEvent(new KeyboardEvent(type, { key, code, shiftKey: !!shift, bubbles: true, cancelable: true }));
const held = (key, code, shift) => { keys = {}; send("keydown", key, code, shift); const q = sampleInput(); send("keyup", key, code, shift); const after = sampleInput(); return { x: q.x, y: q.y, cleared: after.x === 0 && after.y === 0 }; };
out.screen = game.screen;
out.latin = { w: held("w", "KeyW"), a: held("a", "KeyA"), s: held("s", "KeyS"), d: held("d", "KeyD") };
out.arrows = { up: held("ArrowUp", "ArrowUp"), left: held("ArrowLeft", "ArrowLeft"), down: held("ArrowDown", "ArrowDown"), right: held("ArrowRight", "ArrowRight") };
out.hebrew = { w: held("'", "KeyW"), a: held("ש", "KeyA"), s: held("ד", "KeyS"), d: held("ג", "KeyD") };
out.russian = { w: held("ц", "KeyW"), a: held("ф", "KeyA"), s: held("ы", "KeyS"), d: held("в", "KeyD") };
out.caps = held("W", "KeyW", true);
keys = {}; send("keydown", "w", "KeyW"); send("keyup", "'", "KeyW"); out.switched = sampleInput().y;
keys = {}; send("keydown", "ש", ""); out.noCode = sampleInput().x;
keys = {}; send("keydown", "d", "KeyD"); dispatchEvent(new Event("blur")); out.blur = sampleInput().x;
removeEventListener("keydown", latinKey, true); removeEventListener("keyup", latinKey, true);
out.unfixed = held("ג", "KeyD").x;
keys = {};
return out;
`;

const drive = path.join(__dirname, "drive.js");
const r = spawnSync(process.execPath, [drive, "/index.html?unlock", "-"], { input: PAGE, encoding: "utf8", timeout: 200000, env: process.env });
let data;
try { data = JSON.parse(r.stdout); } catch (e) { console.log(r.stdout, r.stderr); process.exit(1); }
const o = data.result || {};
const dir = (set) => set && set.w && set.w.y === -1 && set.w.x === 0 && set.a.x === -1 && set.s.y === 1 && set.d.x === 1;
const off = (set) => !!set && Object.keys(set).every((k) => set[k].cleared);
const ar = o.arrows || {};
const checks = [
  ["0 console errors", data.errors.length === 0, data.errors.length],
  ["WASD moves up, left, down, right and stops on release", dir(o.latin) && off(o.latin), JSON.stringify(o.latin)],
  ["arrow keys move up, left, down, right and stop on release", ar.up && ar.up.y === -1 && ar.left.x === -1 && ar.down.y === 1 && ar.right.x === 1 && off(ar), JSON.stringify(ar)],
  ["WASD works with a Hebrew keyboard layout", dir(o.hebrew) && off(o.hebrew), JSON.stringify(o.hebrew)],
  ["WASD works with a Russian keyboard layout", dir(o.russian) && off(o.russian), JSON.stringify(o.russian)],
  ["W works with Caps Lock or Shift held", o.caps && o.caps.y === -1 && o.caps.cleared, JSON.stringify(o.caps)],
  ["switching layout while W is held does not leave the player walking", o.switched === 0, o.switched],
  ["leaving the window lets go of every key", o.blur === 0, o.blur],
  ["CONTROL: a non-Latin letter with no physical key does not move", o.noCode === 0, o.noCode],
  ["CONTROL: without the layout fix, Hebrew D does not move (the check can fail)", o.unfixed === 0, o.unfixed],
];
let bad = 0;
for (const [name, ok, val] of checks) { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + "  [" + val + "]"); }
if (data.errors.length) console.log(data.errors.join("\n"));
console.log(bad ? `${bad} FAILED of ${checks.length}` : `ALL ${checks.length} PASS`);
process.exit(bad ? 1 : 0);
