(function () {
  var W = window, t0 = 0, scenes = [], roll = null, stopAt = 0, done = false, y0 = 0, wrapEl = null;
  var SW = 120, SH = 48, SPEED = 32;
  var CREW = { oak: { char: "char-094" }, sly: { char: "char-004" }, pine: { char: "char-058" } };
  var CH = [
    ["LEVEL 1 · YOUR WALLET", [["SEED PHRASE", "Your 24 secret words. Whoever has them has your coins.", words]]],
    ["LEVEL 2 · YOUR FIRST PAYMENT", [["ZATOSHI", "The smallest bit of ZEC. 1 ZEC breaks into 100 million zatoshis.", zat]]],
    ["LEVEL 3 · WALLET TRACKERS", [["TRANSPARENT ZEC", "Public ZEC. Every payment leaves tracks that anyone can follow.", watch],
      ["NETWORK FEE", "Every payment pays the network a small fee. More pieces, bigger fee.", fee]]],
    ["LEVEL 4 · GOING PRIVATE", [["SHIELDING", "Jumping off the public shore into the waters. The shore sees how much went in, but nobody can follow you inside.", shield]]],
    ["LEVEL 5 · LIFE IN THE WATERS", [["NOTE", "Each envelope in the waters is a note holding some ZEC. To pay, you hand over envelopes and get a new one back as change.", note],
      ["FULLY SHIELDED PAYMENT", "Paying from inside the waters to inside the waters.", inside],
      ["NULLIFIER", "Spending a note drops its tag in the jar. Try the same note again and its tag bounces off.", nullifier],
      ["ENCRYPTED MEMO", "A private note inside a shielded payment, like an order number or a thank you. Outsiders can't read it.", memo]]],
    ["LEVEL 6 · LINKING THE DOTS", [["DIVERSIFIED ADDRESSES", "One wallet can hand out many addresses. Nobody can tell they lead to the same wallet.", doors],
      ["UNIFIED ADDRESS", "One address with several of yours packed inside. It starts with u1, and whoever pays you uses the private one when they can.", unified]]],
    ["LEVEL 7 · THE GLASS KEY", [["FULL VIEWING KEY", "Lets someone see your payments, never spend them.", glass]]],
    ["LEVEL 8 · THE CAMPFIRE", [["SPENDING KEY", "The key that spends. Never hand it to anyone.", fire]]],
    ["LEVEL 9 · ALL TOGETHER", [["IRONWOOD", "Zcash's newest shielded pool, the new waters. It opened in July 2026.", together]]],
    ["LEVEL 10 · THE NEW WATERS", [["MIGRATION", "The old waters are sealed: coins can leave them, but none can go in. So you carry your coins through the dam into the new waters.", dam]]],
    ["LEVEL 11 · THE EXCHANGE", [["TEX ADDRESS", "Some exchanges only take public coins. Their address starts with tex1, and you pay it with public coins.", tex]]],
    ["LEVEL 12 · THE LYING POST OFFICE", [["FULL NODE", "The post office can lie about your mail. Your own Zebra tower checks everything itself, so nobody can fool you.", node]]],
    ["BONUS · WHAT THE HUNT DIDN'T SHOW YOU", [["AUTO-SHIELDING", "A wallet that moves new public coins into the waters by itself.", desk],
      ["MINING", "Miners do the work that adds each new block, about every 75 seconds, and get paid in new ZEC.", mine],
      ["TRIAL DECRYPTION", "You try your key on every envelope in the waters. The ones that open are yours.", trial],
      ["INCOMING VIEWING KEY", "A weaker glass key. It shows the coins that came in, but not what you spent.", ivk],
      ["LIGHT WALLET", "A phone wallet with no tower of its own. It asks a tower for the news and opens its own envelopes.", light]]]
  ];
  var DEVS = [["ZEBRA", "Full node: checks every payment"], ["ZAINO", "Serves light wallets"], ["ZALLET", "Full node wallet"], ["SDKS", "Build wallets and apps"]];
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function foot(g, look, x, y, dir, anim, t) {
    var keep = W.ctx; W.ctx = g;
    g.save();
    try { R(g, x - 7, y - 1, 14, 2, "rgba(0,0,0,0.35)"); g.translate(Math.round(x), Math.round(y)); g.scale(0.72, 0.72); drawBitfoot(0, 0, dir, anim, t, 1, look); } finally { g.restore(); W.ctx = keep; }
  }
  function wade(g, x0, t) { R(g, x0, SH - 11, SW - x0, 11, "rgba(30,77,112,0.8)"); R(g, x0 + ((t * 20) % 30), SH - 11, 10, 1, "rgba(190,235,255,0.5)"); R(g, x0 + ((t * 20 + 15) % 30) + 40, SH - 11, 10, 1, "rgba(190,235,255,0.5)"); }
  function ground(g) { R(g, 0, 0, SW, SH, "#0f1912"); R(g, 0, SH - 8, SW, 8, "#1b2b17"); }
  function water(g, t, x0, c) { R(g, x0, 0, SW - x0, SH, c || "#1e4d70"); for (var k = 0; k < 6; k++) R(g, x0 + ((k * 37 + t * 18) % (SW - x0 + 20)) - 20, 6 + k * 7, 12, 1, "rgba(190,235,255,0.35)"); }
  function coin(g, x, y, s) { R(g, x - s, y - s, s * 2, s * 2, "#eaba49"); R(g, x - s + 1, y - s + 1, s * 2 - 2, 1, "#f6e27a"); }
  function zec(g, cx, cy) {
    for (var y = -7; y < 7; y++) for (var x = -7; x < 7; x++) { var d = Math.hypot(x + 0.5, y + 0.5); if (d < 7) R(g, cx + x, cy + y, 1, 1, d > 5.8 ? "#b8862a" : (x + y < -4 ? "#f6e27a" : "#eaba49")); }
    var Z = "#3d2918";
    R(g, cx - 3, cy - 4, 6, 1, Z); R(g, cx - 3, cy + 3, 6, 1, Z); R(g, cx - 1, cy - 6, 1, 2, Z); R(g, cx - 1, cy + 4, 1, 2, Z);
    for (var k = 0; k < 6; k++) R(g, cx + 2 - k, cy - 3 + k, 1, 1, Z);
  }
  function zat1(g, x, y) { R(g, x - 1, y - 1, 3, 3, "#eaba49"); R(g, x, y, 1, 1, "#3d2918"); }
  function env(g, x, y, seal) { R(g, x - 8, y - 5, 16, 11, "#f3dfb9"); R(g, x - 8, y - 5, 16, 1, "#b89a6a"); R(g, x - 1, y - 1, 3, 3, seal || "#c0392b"); }
  function check(g, x, y, c) { R(g, x, y + 4, 3, 3, c); R(g, x + 3, y + 7, 3, 3, c); R(g, x + 6, y + 4, 3, 3, c); R(g, x + 9, y + 1, 3, 3, c); R(g, x + 12, y - 2, 3, 3, c); }
  function cross(g, x, y, c) { for (var k = 0; k < 5; k++) { R(g, x + k * 2, y + k * 2, 3, 3, c); R(g, x + 8 - k * 2, y + k * 2, 3, 3, c); } }
  function key(g, x, y, c) { R(g, x, y, 10, 10, c); R(g, x + 3, y + 3, 4, 4, "#0f1912"); R(g, x + 10, y + 4, 16, 3, c); R(g, x + 20, y + 7, 3, 4, c); R(g, x + 24, y + 7, 2, 3, c); }
  function shieldIcon(g, x, y, c) { R(g, x, y, 10, 3, c); R(g, x, y + 3, 10, 4, c); R(g, x + 1, y + 7, 8, 2, c); R(g, x + 3, y + 9, 4, 2, c); R(g, x + 4, y + 2, 2, 6, "#0e2238"); }
  var FONT = { " ": "000000000000000", "·": "000000010000000", "D": "110101101101110", "E": "111100110100111", "I": "111010010010111", "L": "100100100100111", "N": "101111111101101",
    "O": "010101101101010", "R": "110101110101101", "S": "011100010001110", "T": "111010010010010", "U": "101101101101111", "V": "101101101101010", "W": "101101101111101", "Y": "101101010010010", "A":"010101111101101", "B": "110101110101110", "C": "011100100100011","0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "7": "111001010010010", "?": "111001011000010", "u": "000101101101111" };
  function txt(g, x, y, s, c, z) {
    z = z || 1;
    for (var i = 0; i < s.length; i++) { var f = FONT[s[i]]; if (!f) continue; for (var b = 0; b < 15; b++) if (f[b] === "1") R(g, x + i * 4 * z + (b % 3) * z, y + Math.floor(b / 3) * z, z, z, c); }
  }
  function tagged(g, x, y, s) { env(g, x, y); R(g, x - 4, y - 14, 4 * s.length + 4, 8, "#fffaf0"); txt(g, x - 2, y - 13, s, "#3d2918"); R(g, x, y - 6, 1, 1, "#b89a6a"); }
  function hunter(g, x, y, bob, lamp) {
    y -= bob;
    R(g, x - 5, y - 4, 4, 4, "#2a1e16"); R(g, x + 1, y - 4, 4, 4, "#2a1e16");
    R(g, x - 6, y - 15, 12, 11, "#4a3426"); R(g, x - 4, y - 21, 8, 6, "#d9b38c"); R(g, x + 1, y - 19, 2, 1, "#1b1b1b");
    R(g, x - 7, y - 23, 14, 2, "#1b1b1b"); R(g, x - 4, y - 27, 8, 4, "#1b1b1b");
    if (lamp) { g.fillStyle = "rgba(246,226,122,0.16)"; g.beginPath(); g.arc(x + 10, y - 10, 16, 0, 6.283); g.fill(); R(g, x + 8, y - 13, 4, 5, "#eaba49"); R(g, x + 9, y - 14, 2, 1, "#86592f"); }
  }
  function tower(g, x, y, lit) {
    R(g, x, y, 16, 30, "#e8e4da");
    for (var k = 0; k < 5; k++) R(g, x + (k % 2 ? 2 : 0), y + 3 + k * 6, 14, 2, "#1b1b1b");
    R(g, x + 5, y - 5, 6, 5, lit ? "#a8e6a0" : "#2d4a2a");
  }
  function words(g, t) {
    ground(g); R(g, 54, 8, 52, 30, "#f3dfb9"); R(g, 54, 36, 52, 2, "#b89a6a");
    var n = Math.min(24, Math.floor(t * 6) % 30);
    for (var k = 0; k < n; k++) R(g, 58 + (k % 6) * 8, 12 + Math.floor(k / 6) * 6, 6, 2, "#3d2918");
    foot(g, CREW.you, 30, SH - 6, "right", "idle", t);
  }
  function zat(g, t) {
    ground(g);
    var k = (t % 3) / 3;
    if (k < 0.35) zec(g, 74, 20);
    else { var s = Math.min(1, (k - 0.35) / 0.4); for (var d = 0; d < 24; d++) { var a = d / 24 * 6.283 + d, r = 3 + s * (8 + (d % 4) * 4); zat1(g, 74 + Math.cos(a) * r * 1.4, 20 + Math.sin(a) * r * 0.8); } }
    foot(g, CREW.you, 24, SH - 6, "right", "idle", t);
  }
  function watch(g, t) {
    ground(g);
    var p = Math.min(1, (t % 10) / 9), x = 8 + p * 106, hx = -24 + Math.max(0, x - 30) * 0.8, hunt = x >= 30;
    for (var k = 2; k < x - 8; k += 9) { var lit = hunt && k > hx + 9 && k < hx + 20; R(g, k, SH - 10, 3, 2, lit ? "#fff3b0" : "#eaba49"); R(g, k + 4, SH - 12, 3, 2, lit ? "#fff3b0" : "#eaba49"); }
    if (hunt) {
      hunter(g, hx, SH - 2, p < 1 && Math.sin(t * 8) > 0 ? 1 : 0);
      R(g, hx + 4, SH - 14, 6, 2, "#86592f");
      R(g, hx + 10, SH - 19, 10, 2, "#c9d6e0"); R(g, hx + 10, SH - 9, 10, 2, "#c9d6e0"); R(g, hx + 10, SH - 17, 2, 8, "#c9d6e0"); R(g, hx + 18, SH - 17, 2, 8, "#c9d6e0");
      R(g, hx + 12, SH - 17, 6, 8, "rgba(190,235,255,0.25)");
    }
    foot(g, CREW.sly, x, SH - 6, "right", p < 1 ? "walk" : "idle", t);
  }
  function fee(g, t) {
    ground(g);
    var big = Math.floor(t / 3) % 2, n = big ? 4 : 2, k = (t % 3) / 3;
    for (var e = 0; e < n; e++) env(g, 18 + (e % 2) * 20, big ? 12 + Math.floor(e / 2) * 15 : 19);
    R(g, 54, 23, 10, 2, "#8a95a5"); R(g, 60, 19, 2, 2, "#8a95a5"); R(g, 62, 21, 2, 2, "#8a95a5"); R(g, 64, 23, 2, 2, "#8a95a5"); R(g, 62, 25, 2, 2, "#8a95a5"); R(g, 60, 27, 2, 2, "#8a95a5");
    R(g, 76, 26, 32, 14, "#3d2918"); R(g, 76, 26, 32, 2, "#6b4a2e");
    for (var c = 0; c < (big ? 2 : 1); c++) coin(g, 86 + c * 12, Math.min(31, 2 + Math.max(0, k - 0.25 - c * 0.15) * 90), 3);
  }
  function shield(g, t) {
    ground(g); water(g, t, 62);
    var k = (t % 4) / 4, j = Math.min(1, Math.max(0, (k - 0.1) / 0.45)), x = 36 + j * 44, hx = 4 + Math.min(j, 0.75) * 34;
    var y = SH - 6 - (x > 54 ? Math.sin(Math.min(1, (x - 54) / 26) * Math.PI) * 12 : 0);
    hunter(g, hx, SH - 2, j < 0.75 && Math.sin(t * 8) > 0 ? 1 : 0, true);
    if (x > 62) { R(g, 57, SH - 15, 2, 5, "#a8e6a0"); R(g, 55, SH - 10, 6, 2, "#a8e6a0"); R(g, 56, SH - 8, 4, 1, "#a8e6a0"); R(g, 57, SH - 7, 2, 1, "#a8e6a0"); txt(g, 49, SH - 13, "3", "#a8e6a0"); }
    foot(g, CREW.you, x, y, "right", j < 1 ? "walk" : "idle", t);
    if (x > 62) wade(g, 62, t);
    if (j >= 1) txt(g, hx - 3, SH - 40, "?", "#eaba49", 2);
  }
  function note(g, t) {
    water(g, t, 0);
    var k = (t % 5) / 5;
    if (k < 0.25) { tagged(g, 32, 24, "2"); tagged(g, 52, 24, "3"); }
    else if (k < 0.45) { var m = (k - 0.25) / 0.2; tagged(g, 32 + m * 28, 24, "2"); tagged(g, 52 + m * 8, 24, "3"); }
    else { var p = Math.min(1, (k - 0.45) / 0.3); if (p < 0.15) R(g, 54, 14, 12, 12, "rgba(255,250,240,0.6)"); tagged(g, 60 + p * 30, 24, "4"); tagged(g, 60 - p * 30, 24, "1"); }
    foot(g, CREW.you, 12, SH - 4, "right", "idle", t);
    foot(g, CREW.pine, 108, SH - 4, "left", "idle", t);
    wade(g, 0, t);
  }
  function inside(g, t) {
    water(g, t, 0);
    var k = (t % 3) / 3;
    env(g, 28 + k * 64, 14 - Math.sin(k * Math.PI) * 6);
    foot(g, CREW.you, 16, SH - 4, "right", "idle", t);
    foot(g, CREW.pine, 104, SH - 4, "left", "idle", t);
    wade(g, 0, t);
  }
  function nullifier(g, t) {
    ground(g);
    var k = (t % 6) / 6, inJar = k > 0.32;
    function tg(x, y) { R(g, x - 4, y - 4, 8, 8, "#fffaf0"); txt(g, x - 1, y - 2, "7", "#3d2918"); }
    R(g, 94, 16, 22, 26, "rgba(201,214,224,0.18)"); R(g, 94, 16, 2, 26, "#c9d6e0"); R(g, 114, 16, 2, 26, "#c9d6e0"); R(g, 94, 40, 22, 2, "#c9d6e0"); R(g, 92, 14, 4, 2, "#c9d6e0"); R(g, 114, 14, 4, 2, "#c9d6e0");
    if (inJar) tg(105, 34);
    if (k < 0.2) { env(g, 16 + k / 0.2 * 54, 32); tg(16 + k / 0.2 * 54, 20); }
    else if (k < 0.32) { var a = (k - 0.2) / 0.12; tg(70 + a * 35, 20 - Math.sin(a * Math.PI) * 14 + a * 14); }
    else if (k >= 0.5 && k < 0.7) { var b = (k - 0.5) / 0.2; env(g, 16 + b * 54, 32); tg(16 + b * 54, 20); }
    else if (k >= 0.7) {
      var c = Math.min(1, (k - 0.7) / 0.15), up = c < 0.5 ? c * 2 : (1 - c) * 2;
      env(g, 70, 32); tg(70 + up * 26, 20 - up * 10);
      if (c > 0.4) cross(g, 66, 0, "#e05a4a");
    }
  }
  function memo(g, t) {
    ground(g);
    var k = (t % 4) / 4, ex = 30 + Math.min(1, k * 1.6) * 52, ey = 22 - Math.sin(Math.min(1, k * 1.6) * Math.PI) * 10;
    if (k < 0.62) env(g, ex, ey);
    else { R(g, 66, 6, 30, 22, "#fffaf0"); R(g, 66, 6, 30, 2, "#b89a6a"); R(g, 70, 12, 22, 2, "#3d2918"); R(g, 70, 17, 16, 2, "#3d2918"); R(g, 70, 22, 19, 2, "#3d2918"); }
    foot(g, CREW.you, 16, SH - 6, "right", "idle", t);
    foot(g, CREW.pine, 106, SH - 6, "left", "idle", t);
  }
  function doors(g, t) {
    ground(g);
    R(g, 92, 18, 22, 18, "#6b4a2e"); R(g, 92, 18, 22, 4, "#86592f"); R(g, 101, 24, 4, 4, "#eaba49");
    for (var k = 0; k < 3; k++) { var mx = 14 + k * 24; R(g, mx, 10, 16, 30, "#4a5260"); R(g, mx + 1, 11, 14, 1, "#8a95a5"); R(g, mx + 3, 14, 10, 9, "#7fc4e8"); txt(g, mx + 6, 16, "ABC"[k], "#1b1f24"); R(g, mx + 4, 28, 8, 2, "#1b1b1b"); }
    var d = Math.floor(t * 0.8) % 3, p = (t * 0.8) % 1;
    coin(g, 21 + d * 24 + p * (103 - 21 - d * 24), 26 - Math.sin(p * Math.PI) * 14, 2);
  }
  function unified(g, t) {
    ground(g);
    var k = (t % 4) / 4, a = Math.min(1, k / 0.45);
    R(g, 34, 2, 62, 40, "#86592f"); R(g, 36, 4, 58, 36, "#5f3e22");
    txt(g, 40, 7, "u1", "#eaba49", 2);
    R(g, 40, 21, 24, 16, "#1e4d70"); shieldIcon(g, 47, 23, "#a8e6a0");
    R(g, 68, 21, 24, 16, "#1b2b17"); for (var f = 0; f < 3; f++) R(g, 71 + f * 7, 30 - (f % 2) * 3, 3, 2, "#eaba49");
    if (k > 0.45) { R(g, 39, 20, 26, 1, "#a8e6a0"); R(g, 39, 37, 26, 1, "#a8e6a0"); R(g, 39, 20, 1, 18, "#a8e6a0"); R(g, 64, 20, 1, 18, "#a8e6a0"); }
    coin(g, 14 + a * 38, 29 - Math.sin(a * Math.PI) * 6, 3);
    if (k > 0.6) check(g, 100, 14, "#a8e6a0");
    foot(g, CREW.sly, 12, SH - 2, "right", "idle", t);
  }
  function glass(g, t) {
    ground(g);
    key(g, 62, 14, "rgba(190,235,255," + (0.75 + 0.25 * Math.sin(t * 3)).toFixed(2) + ")");
    foot(g, CREW.oak, 30, SH - 6, "right", "idle", t);
  }
  function fire(g, t) {
    ground(g);
    R(g, 54, SH - 12, 20, 4, "#5f3e22");
    for (var k = 0; k < 5; k++) { var h = 6 + Math.abs(Math.sin(t * 7 + k * 1.3)) * 10; R(g, 56 + k * 3.5, SH - 12 - h, 3, h, k % 2 ? "#eaba49" : "#e0662a"); }
    key(g, 84, 20, "#eaba49");
    foot(g, CREW.oak, 30, SH - 6, "right", "idle", t);
  }
  function together(g, t) {
    water(g, t, 0, "#173c58"); R(g, 60, 0, SW - 60, SH, "rgba(60,140,170,0.35)");
    R(g, 58, 0, 2, SH, "rgba(190,235,255,0.25)");
    foot(g, CREW.you, 40 + ((t * 16) % 70), SH - 4, "right", "walk", t);
    foot(g, CREW.sly, 12 + ((t * 16) % 70), SH - 4, "right", "walk", t + 0.4);
    wade(g, 0, t);
  }
  function dam(g, t) {
    var D = W.TILE_DEFS || {}, gy = 46, gx = 96, k = (t % 6) / 6, px = 24 + Math.min(1, k / 0.55) * 150, py = gy + 26;
    g.save(); g.scale(0.55, 0.55);
    R(g, 0, 0, 220, 90, C.water);
    for (var r = -2; r < 2; r++) {
      for (var c = 0; c < 3; c++) if (D["ø"]) D["ø"].draw(g, c * 32, gy + r * 32, c + 1, r + 7);
      if (D[r ? "Ð" : "ð"]) D[r ? "Ð" : "ð"].draw(g, gx, gy + r * 32, 10, r + 7);
    }
    for (var i = 0; i < 3; i++) { var s = (t * 0.9 + i / 3) % 1; g.globalAlpha = 0.7 * Math.sin(s * Math.PI); R(g, Math.round(gx - 16 + s * 64), gy + 9 + i * 6, 6, 1, C.ice); }
    g.globalAlpha = 1;
    for (var w = 0; w < 2; w++) { var f = (t * 0.9 + w * 0.5) % 1; g.strokeStyle = "rgba(190,235,255," + (0.5 * (1 - f)).toFixed(3) + ")"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(px, py, 10 + f * 22, 4 + f * 9, 0, 0, 6.283); g.stroke(); }
    var keep = W.ctx; W.ctx = g;
    try { drawBitfoot(px, py, "right", k < 0.55 ? "walk" : "idle", t, 0.92, CREW.you); } finally { W.ctx = keep; }
    var out = (k - 0.27) * 6;
    for (var n = 0; n < 3; n++) {
      var q = (out - n * 0.6) / 1.6; if (q < 0 || q > 1) continue;
      var cx = Math.round(gx + 16 + q * 80), cy = Math.round(py - 10 + (n % 2 ? 5 : -5) - Math.sin(q * Math.PI) * 10);
      g.globalAlpha = Math.min(1, (1 - q) * 2); R(g, cx - 4, cy - 4, 8, 8, C.goldDim); R(g, cx - 3, cy - 3, 6, 6, C.gold); R(g, cx - 3, cy - 3, 2, 2, "#fffaf0");
    }
    g.globalAlpha = 1;
    g.restore();
    R(g, 2, 2, 40, 16, "rgba(27,27,27,0.85)"); R(g, 2, 17, 40, 1, C.ice); txt(g, 4, 4, "OLD WATERS", C.ice); txt(g, 4, 10, "· OUT ONLY", C.ice);
    R(g, 79, 2, 38, 9, "rgba(27,27,27,0.85)"); R(g, 79, 10, 38, 1, C.gold); txt(g, 81, 4, "NEW WATERS", C.gold);
  }
  function tex(g, t) {
    water(g, t, 0); R(g, 44, 0, 76, SH, "#0f1912"); R(g, 44, SH - 8, 76, 8, "#1b2b17");
    R(g, 80, 22, 34, 6, "#86592f"); R(g, 82, 28, 4, 12, "#5f3e22"); R(g, 108, 28, 4, 12, "#5f3e22");
    R(g, 84, 8, 26, 9, "#eaba49"); R(g, 87, 11, 3, 3, "#3d2918"); R(g, 92, 11, 3, 3, "#3d2918"); R(g, 97, 11, 3, 3, "#3d2918"); R(g, 102, 11, 4, 3, "#3d2918");
    var k = (t % 3) / 3;
    if (k < 0.4) R(g, 20 + k * 60, 24, 6, 6, "#7fc4e8");
    else coin(g, 44 + (k - 0.4) * 80, 22 - Math.sin((k - 0.4) / 0.6 * Math.PI) * 8, 3);
    if (k > 0.9) check(g, 88, -2, "#a8e6a0");
  }
  function desk(g, t) {
    ground(g); water(g, t, 72);
    R(g, 14, 16, 16, 24, "#1b1f24"); R(g, 16, 18, 12, 18, "#7fc4e8"); shieldIcon(g, 17, 22, "#a8e6a0");
    var k = (t % 2.5) / 2.5;
    coin(g, 40 + k * 60, 18 - Math.sin(k * Math.PI) * 10, 3);
  }
  function node(g, t) {
    ground(g);
    var k = (t % 4) / 4;
    R(g, 10, 14, 30, 24, "#6b4a2e"); R(g, 8, 10, 34, 6, "#86592f"); R(g, 20, 24, 10, 14, "#3d2918");
    if (k > 0.1 && k < 0.5) { R(g, 36, 0, 30, 12, "#fffaf0"); R(g, 40, 4, 22, 2, "#3d2918"); R(g, 40, 7, 14, 2, "#3d2918"); if (k > 0.3) cross(g, 66, 1, "#e05a4a"); }
    tower(g, 90, 14, k > 0.55);
    if (k > 0.65) { env(g, 70, 26); check(g, 62, 4, "#a8e6a0"); }
  }
  function mine(g, t) {
    R(g, 0, 0, SW, SH, "#141210"); R(g, 0, SH - 8, SW, 8, "#2a221a");
    R(g, 62, 10, 34, 30, "#4a4038"); R(g, 66, 14, 8, 6, "#5a5048"); R(g, 80, 26, 10, 6, "#5a5048");
    var sw = Math.sin(t * 6), hit = sw > 0.85;
    foot(g, CREW.oak, 44, SH - 6, "right", "idle", t);
    var px = g.getImageData(45, 33, 1, 1).data, fist = "rgb(" + px[0] + "," + px[1] + "," + px[2] + ")";
    px = g.getImageData(43, 28, 1, 1).data; var arm = "rgb(" + px[0] + "," + px[1] + "," + px[2] + ")";
    R(g, 29, 31, 4, 4, "#141210"); R(g, 44, 31, 4, 4, "#141210");
    g.save(); g.translate(43, 27); g.rotate(-1.9 + (sw + 1) * 1.05);
    R(g, 0, -1, 9, 3, arm); R(g, 9, -1, 13, 2, "#86592f"); R(g, 6, -2, 3, 4, fist); R(g, 10, -2, 3, 4, fist);
    R(g, 20, -6, 3, 12, "#8a95a5"); R(g, 21, -7, 1, 14, "#c9d6e0");
    g.restore();
    if (hit) for (var k = 0; k < 4; k++) R(g, 63 + k * 3, 24 + (k % 2) * 5, 2, 2, "#f6e27a");
    var p = (t * 0.5) % 1;
    R(g, 100, SH - 18, 10, 10, "#8a95a5"); coin(g, 105, SH - 22 - p * 14, 3);
  }
  function trial(g, t) {
    water(g, t, 0);
    var i = Math.floor(t * 2) % 7, mine = 3;
    for (var k = 0; k < 5; k++) env(g, 14 + k * 23, 30, k === mine && i >= mine ? "#a8e6a0" : (k < Math.min(i, mine) ? "#6b6b6b" : "#c0392b"));
    key(g, 4 + Math.min(i, mine) * 23, 8, "#eaba49");
  }
  function ivk(g, t) {
    ground(g);
    R(g, 46, 12, 28, 24, "#5f3e22"); R(g, 46, 12, 28, 4, "#86592f");
    var k = (t % 2) / 2;
    coin(g, 14 + k * 30, 24, 3); R(g, 82, 23, 22, 3, "rgba(138,149,165,0.4)"); cross(g, 106, 18, "#6b6b6b");
    key(g, 46, 0, "rgba(190,235,255,0.55)");
    R(g, 20, 36, 18, 2, "#a8e6a0");
  }
  function light(g, t) {
    ground(g);
    R(g, 18, 12, 14, 26, "#1b1f24"); R(g, 20, 14, 10, 20, "#7fc4e8");
    tower(g, 92, 12, true);
    var p = (t % 2) / 2;
    if (p < 0.5) R(g, 34 + p * 2 * 54, 18, 3, 3, "#eaba49");
    else env(g, 88 - (p - 0.5) * 2 * 54, 24);
  }
  function div(cls, text, parent) { var d = document.createElement("div"); d.className = cls; if (text) d.textContent = text; parent.appendChild(d); return d; }
  function build(o) {
    o = o || {};
    var wrap = wrapEl = div("pq-end", "", document.body);
    var title = div("pq-title", "THE PREQUEL ENDS HERE", wrap);
    roll = div("pq-roll", "", div("pq-view", "", wrap));
    CH.forEach(function (c) {
      var chap = div("pq-chap" + (/^BONUS/.test(c[0]) ? " pq-bonus" : ""), "", roll);
      div("pq-lv", c[0], chap);
      c[1].forEach(function (it) {
        var row = div("pq-row", "", chap), cv = document.createElement("canvas");
        cv.width = SW; cv.height = SH; cv.className = "pq-scene"; row.appendChild(cv);
        var g = cv.getContext("2d"); g.imageSmoothingEnabled = false; scenes.push([g, it[2]]);
        var tx = div("pq-txt", "", row); div("pq-head", it[0], tx); div("pq-sub", it[1], tx);
      });
    });
    var fin = div("pq-fin", "", roll);
    div("pq-ready", "YOU'RE READY TO DEV", fin); div("pq-more", "MORE LEVELS COMING", fin);
    var btns = div("pq-btns", "", wrap), panel = div("pq-dev", "", wrap);
    DEVS.forEach(function (d) { var r = div("pq-devrow", "", panel); div("pq-devname", d[0], r); div("pq-devrole", d[1], r); });
    function leave(f, dflt) { return function () { if (f) { close(); f(); } else dflt(); }; }
    [["PLAY AGAIN", leave(o.onAgain, function () { location.reload(); }), true], ["WORLD MAP", leave(o.onMap, function () { location.href = "/index.html"; })], ["FOR DEVELOPERS", function () { panel.classList.toggle("on"); }]].forEach(function (b) {
      var x = document.createElement("button"); x.type = "button"; x.className = "pq-btn" + (b[2] ? " pq-primary" : ""); x.textContent = b[0]; x.addEventListener("click", b[1]); btns.appendChild(x);
    });
    setTimeout(function () { wrap.classList.add("on"); }, 50);
    setTimeout(function () { title.classList.add("on"); }, 1300);
    setTimeout(function () { title.classList.remove("on"); }, 4400);
    roll.btns = btns;
  }
  function close() { if (wrapEl) wrapEl.remove(); wrapEl = null; roll = null; scenes = []; }
  function you() {
    var ch = BH.characters && BH.characters.worn && BH.characters.worn(save);
    CREW.you = ch ? { char: ch, fur: "fur-classic", hat: "hat-none" } : save.cos || {};
  }
  W.BH = W.BH || {};
  BH.prequelEnd = {
    play: function (o) { if (wrapEl) return; you(); done = false; y0 = 0; build(o); t0 = performance.now(); requestAnimationFrame(tick); },
    close: close,
    on: function () { return !!wrapEl; }
  };
  function tick() {
    if (!scenes.length) return;
    var t = (performance.now() - t0) / 1000, vh = innerHeight;
    scenes.forEach(function (s, i) {
      var r = s[0].canvas.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) s[1](s[0], t + i * 0.7);
    });
    if (roll && t > 5.2 && !done) {
      var fin = roll.lastChild;
      if (!y0) y0 = vh;
      var y = y0 - (t - 5.2) * SPEED;
      stopAt = vh * 0.4 - fin.offsetTop;
      if (y <= stopAt) { y = stopAt; done = true; roll.classList.add("end"); setTimeout(function () { roll.btns.classList.add("on"); }, 600); }
      roll.style.transform = "translate(-50%, " + Math.round(y) + "px)";
    }
    requestAnimationFrame(tick);
  }
})();
