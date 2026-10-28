"use strict";
window.BH_SAVE_KEY = "bitfoot-trail-v1";
window.GAME_NAME = "THE HUNT";
window.TRAIL = true;
window.LEVEL_FROM_ZERO = true;
window.LANDING_HOW = ["Hunters were trained to track our steps, and now they have insane new tech. Grab the gold ZEC and get it to the den. Talk to the elders: they teach you how to stay hidden.",
  "Step into the waters and you leave no footprints. Click anywhere or press Space to move the talk along. Click an answer, or use the arrows or keys 1 to 3. Back shows the last line again."];
window.LANDING_BOARD = {
  story: ["Get the gold ZEC to the den."],
  keys: [[[["up", "left", "down", "right"], "Walk", "Move your Bitfoot. Every step leaves a footprint the hunters can follow."]],
    [[["sprint"], "Sprint (louder)", "Hold it to run faster. Bigger steps make more noise, so hunters notice you sooner."]],
    [[["pause"], "Pause", "Stops the game and opens the pause menu."]],
    [[["mute"], "Sound", "Turns the game's sound off or on. Click the speaker at the top right to set the volume."]]],
  tip: ""
};

window.STORY_ACTS = [
  { title: "THE PUBLIC TRAIL", scene: "ledger",
    lines: ["Every Bitfoot leaves a trail of footprints.", "Tonight you learn what those footprints give away."] },
  { title: "THE WATERS", scene: "twokinds",
    lines: ["On land, every step stays for the hunters to read.", "In the waters, nobody can read where you go."] },
  { title: "YOUR KEYS", scene: "viewkey",
    lines: ["A glass key only looks.", "Your 24 words spend."] },
  { title: "THE HARD ROAD", scene: "ironwood",
    lines: ["The hunters learned new tricks.", "The waters still keep you hidden."] }
];

window.LEVELS = [
  { act: 0, tid: "steps", title: "YOUR WALLET", need: 3, par: 90, hunters: [], wallet: true,
    features: ["lighthouse", "funsecret"], funsecret: { trees: [[28, 1]], at: [28, 0] },
    elders: ["oak", "sly"],
    signs: [[11, 5, "WALK: WASD / DRAG"], [27, 10, "THE DEN", "bring 3 coins"]],
    hints: ["walk", "need", "home"],
    map: [
      "##############################",
      "#............#...............#",
      "#...c........#....c..........#",
      "#............#.........##....#",
      "#............#.........##....#",
      "#................c...........#",
      "#............................#",
      "#........P...######....#######",
      "#............#...............#",
      "#............#...............#",
      "#.....##.....#...........c...#",
      "#.....##.....#..............D#",
      "#............................#",
      "##############################"] },

  { act: 0, tid: "machine", title: "YOUR FIRST PAYMENT", need: 4, par: 90, hunters: [], pay: 1,
    features: ["funsecret"], funsecret: { trees: [[26, 1]], at: [26, 0] },
    elders: ["oak", "sly"],
    signs: [[9, 5, "PAY POST", "1 coin opens the gate"]],
    talks: [{ at: [11, 6], r: 1.6, id: "machine" }],
    hints: ["need", "home"],
    map: [
      "##############################",
      "#...........#................#",
      "#...........#.....c..........#",
      "#....c......#................#",
      "#...P.......#.......##.......#",
      "#.....##....H.......##...c...#",
      "#.....##...MH................#",
      "#...........H.......#####....#",
      "#...c.......#................#",
      "#...........#..........c....D#",
      "#.......c...#................#",
      "##############################"] },

  { act: 0, tid: "wise", title: "WALLET TRACKERS", need: 4, par: 100, pay: 1,
    features: ["funsecret", "fungags"], funsecret: { trees: [[7, 1]], at: [7, 0] },
    elders: ["oak", "sly"],
    hunters: [{ type: "hunter", patrol: [[14, 2], [14, 10]] }, { type: "hunter", sleep: true, patrol: [[24, 9], [24, 2], [30, 2], [30, 9]] }],
    signs: [[7, 3, "PAY POST", "1 coin opens the gate"]],
    talks: [{ at: [9, 4], r: 1.6, id: "machine" }],
    hints: ["need", "home"],
    map: [
      "################################",
      "#........#..........#..........#",
      "#........#....c.....#....c.....#",
      "#....P...#..........#..........#",
      "#..c.....M..bbbb..........##...#",
      "#........H..bbbb..........##...#",
      "#........#..........#..........#",
      "#####....#....c.....#...c......#",
      "#........#..........#......†...#",
      "#..c.....#......##..#.........D#",
      "#........#......##..#..........#",
      "################################"] },

  { act: 1, tid: "bank", title: "GOING PRIVATE", need: 5, par: 120, bank: true, noUnmatched: true, edgeHunt: true,
    features: ["funsecret"], funsecret: { trees: [[6, 1]], at: [6, 0] },
    elders: ["oak", "sly"],
    hunters: [{ type: "hunter", patrol: [[14, 1], [14, 10]] }],
    hints: ["need", "home"],
    map: [
      "##############################",
      "#........#..........~~~~~~...#",
      "#........#..........~~~~~~...#",
      "#..c................~~~~~~...#",
      "#.........##........~~~~~~...#",
      "#.....c...##........~~~~~~...#",
      "#...P...............~~~~~~...#",
      "#....##.....c.......~~~~~~...#",
      "#....##.............~~~~~~...#",
      "#..c......#....c....~~~~~~.D.#",
      "#.........#.........~~~~~~...#",
      "##############################"] },

  { act: 1, tid: "inriver", title: "LIFE IN THE WATERS", need: 2, par: 120, sprint: true, bank: true, amounts: true, noUnmatched: true, pay: 1,
    coinFly: true, mustPay: true, memo: true, steps: [["pine", null], ["machine", "BUY THE GATE FROM THE MERCHANT"], ["need", "GRAB THE COIN"], [null, "GO TO THE DEN"]],
    features: ["funsecret"], funsecret: { trees: [[1, 2]], at: [0, 2] },
    elders: ["oak", "sly"],
    npcs: [{ id: "pine", at: [9, 7], water: true, pays: 2 }, { id: "merchant", at: [22, 6], water: true }],
    talks: [{ at: [9, 7], r: 1.6, id: "pine" }, { at: [22, 7], r: 1.6, id: "machine" }],
    hunters: [{ type: "hunter", patrol: [[2, 1], [29, 1]] }, { type: "hunter", patrol: [[29, 10], [2, 10]] }],
    hints: ["need", "home"],
    map: [
      "################################",
      "#.....b..................b.....#",
      "#..............................#",
      "#~~~~~~~~~~~~~~~~~~~~~~~~~~YYYY#",
      "#~~~~~~~~~~~~~~~~~~~~~~~~~~Y~~~#",
      "#~~~~P~~~c~~~~~~~~~~~~~~~~~Y~..#",
      "#~~~~~~~~~~~~~~~~~~~~~~~~~~Yk.D#",
      "#~~~~~~~~~~~~~~~~~~~~~U~~~~Y~..#",
      "#~~~~~~~~~~~~~~~~c~~~~~~~~~Y~~~#",
      "#~~~~~~~~~~~~~~~~~~~~~~~~~~YYYY#",
      "#..............................#",
      "################################"] },

  { act: 2, tid: "glasskey", title: "THE GLASS KEY", need: 3, par: 150, bank: true, amounts: true, noUnmatched: true, gateBy: "key", pay: 1,
    features: ["funsecret"], funsecret: { trees: [[6, 1]], at: [6, 0] },
    elders: ["oak", "sly"],
    npcs: [{ id: "pine", at: [18, 2], water: true, pays: 2 }, { id: "merchant", at: [22, 6], water: true }],
    talks: [{ at: [18, 2], r: 1.6, id: "pine" }, { at: [22, 7], r: 1.6, id: "machine" }],
    hunters: [{ type: "hunter", patrol: [[12, 1], [12, 10]] }, { type: "hunter", patrol: [[28, 1], [34, 1], [34, 10], [28, 10]] }],
    hints: ["need", "home"],
    map: [
      "####################################",
      "#........#......~~~~~~~~~~.........#",
      "#...P....#......~~~~~~~~~~.........#",
      "#..c............~~~~~~~~~~....##...#",
      "#........##.....~~~~~~~~~~....##...#",
      "#........##.....~~~~~~~~~~.........#",
      "#...............~~~~~~~~~~.........#",
      "#....##.........~~~~~~U~~~....##...#",
      "#....##........#~~~~~~~~~~#...##...#",
      "#..c...........#~~~~~~~~~~#........#",
      "#.........#....#~~~~k~~~~~D#.......#",
      "####################################"] },

  { act: 2, tid: "campfire", title: "THE CAMPFIRE", need: 4, par: 150, bank: true, amounts: true, noUnmatched: true, startCarry: 3,
    features: ["funsecret"], funsecret: { trees: [[12, 1]], at: [12, 0] },
    elders: ["oak", "sly"],
    npcs: [{ id: "helper", at: [12, 8] }, { id: "edge", at: [18, 2] }, { id: "pine", at: [25, 3], water: true, pays: 1 }],
    talks: [{ at: [25, 3], r: 1.6, id: "pine" }],
    hunters: [{ type: "hunter", patrol: [[21, 4], [21, 9]] }],
    hints: ["need", "home"],
    map: [
      "##############################",
      "#........#######.......~~~~~~#",
      "#...P....#.....#.......~~~~~~#",
      "#..............#.......~~~~~~#",
      "#........#.............~~~~~~#",
      "#####....#.............~~~~~~#",
      "#..........C...........~~~~~~#",
      "#........#........###..~~~~~~#",
      "#........#.............~~~~..#",
      "#..##....#.............~~~k.D#",
      "#..##....######........~~~~..#",
      "##############################"] },

  { act: 2, tid: "together", title: "ALL TOGETHER", need: 3, par: 210, sprint: true, bank: true, amounts: true, noUnmatched: true, takeAsk: true, redLines: 3, pay: 1,
    features: ["funsecret", "fungags"], funsecret: { trees: [[9, 1]], at: [9, 0] },
    elders: ["oak", "sly"],
    piles: { A: [1, 1, 6, 3], B: [12, 9, 16, 10] },
    machines: { A: [5, 2], B: [14, 8] },
    npcs: [{ id: "merchant", at: [26, 2], water: true }],
    talks: [{ at: [26, 3], r: 1.6, id: "machine" }],
    hunters: [{ type: "hunter", patrol: [[16, 1], [16, 10]] }, { type: "dog", patrol: [[2, 2], [6, 2], [6, 6], [13, 6], [13, 8], [13, 6], [6, 6], [6, 2]] }, { type: "hunter", patrol: [[16, 10], [16, 1]] },
      { type: "hunter", patrol: [[38, 1], [38, 10]] }, { type: "hunter", patrol: [[43, 10], [43, 1]] }],
    hints: ["need", "home"],
    map: [
      "##############################################",
      "#c.c...#............~~~~~~~~~#~~..#..........#",
      "#......#............~~~~~~~~~#~~..#.~~.......#",
      "#c..................~~~~~~U~~#~~..#.~~.......#",
      "####......C........V~~~~~~~~~Y~~..#....#.....#",
      "#...................~~~~~~~~~Y~~..#....#.....#",
      "#...................~~~~~~~~~Y~~..#....#.....#",
      "#.......##..........~~~~~~~~~#~~..#....#.~~..#",
      "#.......##..........~~~~~~~~~#~~.......#.~~..#",
      "#............c.c....~~~~~~~~~#~~.......#....D#",
      "#P...........c......~~~~~~~~~#~~.......#.....#",
      "##############################################"] }
];

window.TRAIL_V2_ORDER = ["steps", "machine", "wise", "bank", "inriver", "stayin", "anybox", "piles", "glasskey", "campfire", "together"];
window.TRAIL_V3_ORDER = ["steps", "machine", "wise", "bank", "inriver", "stayin", "anybox", "piles", "glasskey",
  "doors", "letter", "mail", "campfire", "dam", "together", "bonus1", "bonus2", "bonus3", "bonus4"];
window.TRAIL_V4_ORDER = ["steps", "machine", "wise", "bank", "inriver", "doors", "glasskey", "mail", "campfire", "together",
  "dam", "bonus1", "bonus2", "bonus3", "bonus4"];
window.TRAIL_V5_ORDER = ["steps", "machine", "wise", "bank", "inriver", "doors", "glasskey", "campfire", "together",
  "dam", "bonus1", "bonus2", "bonus3", "bonus4"];
window.TRAIL_V6_ORDER = ["steps", "machine", "wise", "bank", "inriver", "doors", "glasskey", "campfire", "together",
  "dam", "bonus2", "bonus3", "bonus4"];
window.TRAIL_ORDER = ["steps", "machine", "wise", "bank", "inriver", "doors", "glasskey", "campfire", "together",
  "dam", "bonus2", "bonus3"];
window.TRAIL_MERGED = { stayin: "inriver", anybox: "inriver", piles: "doors", letter: "mail" };
window.TRAIL_EXTRA_LEVELS = window.TRAIL_EXTRA_LEVELS || {};
(function () {
  var STUB = { doors: [2, "LINKING THE DOTS"], letter: [2, "THE LETTER"], mail: [2, "FINDING YOUR MAIL"], dam: [3, "THE NEW WATERS"],
    bonus1: [3, "DUST"], bonus2: [3, "THE EXCHANGE"], bonus3: [3, "THE LYING POST OFFICE"] };
  function stub(tid) {
    return { act: STUB[tid][0], tid: tid, title: STUB[tid][1], stub: true, need: 3, par: 120, bank: true, amounts: true, noUnmatched: true,
      features: [], elders: ["oak", "sly"],
      hunters: [{ type: "hunter", patrol: [[14, 2], [14, 9]] }],
      hints: ["need", "home"],
      copy: { goal: "Bring 3 coins to the den.", lesson: "Stay out of sight and bring the coins home.", dev: "" },
      map: [
        "##############################",
        "#............#...............#",
        "#...c........#.......c.......#",
        "#............#...............#",
        "#....P..............##.......#",
        "#...................##.......#",
        "#............#...............#",
        "#..c.........#...............#",
        "#............#..............D#",
        "#............#...............#",
        "##############################"] };
  }
  var byTid = {};
  window.LEVELS.forEach(function (l) { byTid[l.tid] = l; });
  var next = window.TRAIL_ORDER.map(function (tid) { return byTid[tid] || window.TRAIL_EXTRA_LEVELS[tid] || stub(tid); });
  window.LEVELS.length = 0;
  next.forEach(function (l) { if (l.term === undefined) l.term = ""; window.LEVELS.push(l); });
  var R = window.TRAIL_REMAP = { from: 6, to: 7, maps: {}, cut: {} };
  [[2, window.TRAIL_V2_ORDER], [3, window.TRAIL_V3_ORDER], [4, window.TRAIL_V4_ORDER], [5, window.TRAIL_V5_ORDER], [6, window.TRAIL_V6_ORDER]].forEach(function (p) {
    var m = R.maps[p[0]] = {}, c = R.cut[p[0]] = {};
    p[1].forEach(function (tid, i) {
      var to = window.TRAIL_MERGED[tid] || tid, n = window.TRAIL_ORDER.indexOf(to) + 1;
      m[i + 1] = n;
      if (to !== tid) c[i + 1] = true;
    });
  });
  R.map = R.maps[3];
  window.trailIndexOf = function (tid) { for (var i = 0; i < window.LEVELS.length; i++) if (window.LEVELS[i].tid === tid) return i; return -1; };
})();

window.genesisAt = function () { var i = window.trailIndexOf ? window.trailIndexOf("together") : -1; return i >= 0 ? i + 1 : window.LEVELS.length; };

(function () {
  var F = window.FACTS;
  if (!F) return;
  F.acts = ["THE PUBLIC TRAIL", "THE WATERS", "YOUR KEYS", "THE HARD ROAD"];
  var byNum = {
    1: { goal: "Make a wallet. Then bring 3 coins to the den.",
         lesson: "Your secret words back up your wallet, and whoever has them has the coins.",
         dev: "A new Zcash wallet is backed up by 24 words, and every key in it comes from them." },
    2: { goal: "Pay the post 1 coin to open the gate. Then bring 4 coins to the den.",
         lesson: "You approve a payment by signing it, and a tiny fee goes to the network. Then the gate opens.",
         dev: "Signing proves you approved the payment. The fee depends on the size of the payment, not the amount sent." },
    3: { goal: "Pay the post on land. Then bring 4 coins to the den past both hunters.",
         lesson: "Every step you take on land leaves footprints. Anyone can follow them and find you, even years later.",
         dev: "Transparent Zcash works like Bitcoin: sender, receiver and amount sit on the public chain for good, and transparent addresses start with t." },
    4: { goal: "Grab 5 coins, step into the waters and bring them to the den inside it.",
         lesson: "Jumping into the waters hides your footprints. But everyone sees where you went in, and how much you brought.",
         dev: "Shielding shows the amount and the public address it came from. After that the coins sit in the shielded pool, and today new shielded coins go into Ironwood." },
    5: { goal: "Get paid by Pine and pay the merchant, all inside the waters. Then reach the den.",
         lesson: "Stay in the waters: you can get paid and pay there, and from outside every coin looks the same. Climb out and everyone sees how much you took.",
         dev: "Fully shielded payments hide the sender, the receiver and the amount, a proof shows each one is valid, and a spend could have used any note an outsider does not know is spent. Leaving the shielded pool shows the amount, and others can still see that a shielded payment happened." },
    6: { goal: "Pay the merchant at his stall. It's on land, so you have to climb out.",
         next: ["Now pay the merchant in the waters, without climbing out.", "Bring 3 coins to the den."],
         lesson: "Climb out and everyone sees how much you took out. Same amount in and out, and they can guess it was you.",
         dev: "Moving coins in or out of the shielded pool shows the amount, so the same amount in and out soon after is easy to pair. Paying shielded to shielded skips the crossing. A new amount still leaks the timing." },
    7: { goal: "Pay the merchant inside the waters. Then bring 2 coins to the den.",
         next: ["Bring 2 coins to the den."],
         lesson: "Every coin in the waters looks the same from outside. When you pay, nobody can tell which one was yours.",
         dev: "Every shielded coin is a sealed note on the chain. A payment could have used any note that an outsider does not know is spent." },
    8: { goal: "Shield the coins from address A and address B on separate trips. 4 coins to the den.",
         lesson: "Shield coins from two addresses on separate trips, never together. Doing it right after each other can still hint they are yours.",
         dev: "Shielding from two public addresses in one payment shows they belong to the same person. Shield them separately, and not at matching times." },
    9: { goal: "A stall wants your glass key. 3 coins to the den.",
         lesson: "Whoever gets your glass key sees every trip you make in the waters, but can never spend. Once it is out, you can't take it back.",
         dev: "A full viewing key shows the payments coming in and going out of a wallet, and cannot spend. You choose who gets one, and a key once shared stays shared." },
    10: { goal: "Keep your words, get paid by Pine, then bring 4 coins to the den.",
          lesson: "Whoever has your words owns your coins, so never share them. Someone watching your connection can still see when you get paid.",
          dev: "Your 24 words make the spending key, the only way to spend, and real support never asks for them. Someone watching your wallet's traffic can still tell when you send or receive, even fully shielded." },
    11: { goal: "Shield each pile on its own, pay inside the waters and keep your words. 3 red lines and you are found.",
          lesson: "Stay in the waters, keep your words, and approve every leak yourself. The shore only sees what you let it see.",
          dev: "Stay shielded, pay inside the shielded pool, and let your wallet tell you before anything public is shown. Today that pool is Ironwood." }
  };
  var COPY = {};
  window.TRAIL_V2_ORDER.forEach(function (tid, i) { COPY[tid] = byNum[i + 1]; });
  F.levelsByTid = COPY;
  F.levels = {};
  window.LEVELS.forEach(function (l, i) { if (COPY[l.tid]) F.levels[i + 1] = COPY[l.tid]; });
  if (F.hints) {
    if (F.hints.look) F.hints.look.text = "look back: every step is still there";
    if (F.hints.crowd) F.hints.crowd.text = "stay in the waters to pay";
    if (F.hints.amount) F.hints.amount.text = "stay in the waters to pay";
  }
  var W = F.words || {}, E = F.endCard || {};
  if (W.unmatched) W.unmatched.main = "A new amount. The timing can still link you.";
  if (W.change) W.change.main = "You left with a new amount. The rest stayed in the waters.";
  if (E.unmatched) E.unmatched.line = "You left with a new amount. The timing can still link you.";
  if (E.crowd) E.crowd.line = "You left with a crowd, and they lost you.";
  F.finale = "The hunters have new tech, and they are tracking every Bitfoot. Learn how Bitcoin and Zcash really work, one footprint at a time.";
})();
