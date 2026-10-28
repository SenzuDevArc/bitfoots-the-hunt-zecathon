"use strict";
(function () {
  if (!window.BH) return;

  var ROLES = [
    { id: "tower", name: "ZEBRA", role: "FULL NODE: CHECKS EVERY PAYMENT" },
    { id: "post", name: "ZAINO", role: "SERVES LIGHT WALLETS" },
    { id: "chest", name: "ZALLET", role: "FULL NODE WALLET" },
    { id: "bench", name: "SDKS", role: "BUILD WALLETS AND APPS" }
  ];
  var CLOSE = "BUILD IT FOR REAL";

  var PAL = { k: "#1a120a", w: "#5a3d24", d: "#3d2918", l: "#7a5634", g: "#eaba49", y: "#ffd24a", r: "#8a3b2a", s: "#9aa0a6", p: "#fffaf0" };
  var ART = {
    tower: [
      "......kkkk......",
      ".....krrrrk.....",
      "....krrrrrrk....",
      "...kkkkkkkkkk...",
      "....kwyyyywk....",
      "....kwyyyywk....",
      "...kkkkkkkkkk...",
      "....kd....dk....",
      "....kdk..kdk....",
      "....kd.kk.dk....",
      "....kd.kk.dk....",
      "....kdk..kdk....",
      "...kd......dk...",
      "...kdk....kdk...",
      "...kd.k..k.dk...",
      "..kd...kk...dk..",
      "..kd..k..k..dk..",
      ".kkk........kkk."],
    post: [
      ".......kk.......",
      ".....kkrrkk.....",
      "...kkrrrrrrkk...",
      ".kkrrrrrrrrrrkk.",
      "kkkkkkkkkkkkkkkk",
      ".kllllllllllllk.",
      ".klkkkkkkkkkklk.",
      ".klkppppppppklk.",
      ".klkpkppppkpklk.",
      ".klkppkppkppklk.",
      ".klkpppkkpppklk.",
      ".klkppppppppklk.",
      ".klkkkkkkkkkklk.",
      ".kllllllllllllk.",
      ".kwwwwwwwwwwwwk.",
      ".kkkkkkkkkkkkkk."],
    chest: [
      "..kkkkkkkkkkkk..",
      ".kllllllllllllk.",
      ".klwwwwwwwwwwlk.",
      ".kwwwwwwwwwwwwk.",
      "kkkkkkkggkkkkkkk",
      "kgwwwwkyykwwwwgk",
      "kwwwwwkggkwwwwwk",
      "kwwwwwwkkwwwwwwk",
      "kwwwwwwwwwwwwwwk",
      "kgwwwwwwwwwwwwgk",
      "kddddddddddddddk",
      "kkkkkkkkkkkkkkkk"],
    bench: [
      "..kkkkk.........",
      "..ksssk.....kkk.",
      "..kkdkk....ksssk",
      "....dk.....ks.sk",
      "....dk.....ksssk",
      "....dk......kkk.",
      "kkkkkkkkkkkkkkkk",
      "kllllllllllllllk",
      "kwwwwwwwwwwwwwwk",
      "kkkkkkkkkkkkkkkk",
      ".kdk........kdk.",
      ".kdk........kdk.",
      ".kdkkkkkkkkkkdk.",
      ".kdk........kdk."]
  };

  function sprite(g, rows, cx, base, px) {
    var w = rows[0].length * px, x0 = Math.round(cx - w / 2), y0 = base - rows.length * px;
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x0 + px, base - px / 2, w - px * 2, px);
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) { var c = PAL[row[x]]; if (c) { g.fillStyle = c; g.fillRect(x0 + x * px, y0 + y * px, px, px); } }
    });
  }

  function wrap(g, text, max) {
    var out = [], cur = "";
    text.split(" ").forEach(function (wd) { var t = cur ? cur + " " + wd : wd; if (cur && g.measureText(t).width > max) { out.push(cur); cur = wd; } else cur = t; });
    if (cur) out.push(cur);
    return out;
  }

  var BW = 640, BH_ = 250;
  function paint(cv) {
    var s = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    cv.width = BW * s; cv.height = BH_ * s;
    var g = cv.getContext("2d"); g.setTransform(s, 0, 0, s, 0, 0); g.imageSmoothingEnabled = false;
    g.fillStyle = "#1a120a"; g.fillRect(0, 0, BW, BH_);
    g.fillStyle = "#4a3220"; g.fillRect(4, 4, BW - 8, BH_ - 8);
    for (var y = 4; y < BH_ - 4; y += 26) { g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(4, y + 24, BW - 8, 2); g.fillStyle = "rgba(255,230,190,0.06)"; g.fillRect(4, y, BW - 8, 2); }
    [[10, 10], [BW - 16, 10], [10, BH_ - 16], [BW - 16, BH_ - 16]].forEach(function (n) { g.fillStyle = "#9aa0a6"; g.fillRect(n[0], n[1], 6, 6); g.fillStyle = "#1a120a"; g.fillRect(n[0] + 2, n[1] + 2, 2, 2); });
    var col = (BW - 40) / ROLES.length, base = 104;
    g.textAlign = "center"; g.textBaseline = "middle";
    ROLES.forEach(function (r, i) {
      var cx = 20 + col * (i + 0.5);
      sprite(g, ART[r.id], cx, base, 4);
      g.font = "700 16px 'Plex Mono', monospace"; g.fillStyle = "#eaba49"; g.fillText(r.name, cx, base + 22);
      g.font = "600 11px 'Plex Mono', monospace"; g.fillStyle = "#fffaf0";
      wrap(g, r.role, col - 16).forEach(function (ln, k) { g.fillText(ln, cx, base + 44 + k * 15); });
    });
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(40, BH_ - 50, BW - 80, 30);
    g.font = "700 18px 'Plex Mono', monospace"; g.fillStyle = "#eaba49"; g.fillText(CLOSE, BW / 2, BH_ - 35);
  }

  function board() {
    var cv = document.createElement("canvas");
    cv.id = "buildItBoard"; cv.className = "te-buildit";
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", ROLES.map(function (r) { return r.name + ": " + r.role; }).join(". ") + ". " + CLOSE + ".");
    cv.style.width = BW + "px"; cv.style.maxWidth = "100%"; cv.style.height = "auto"; cv.style.display = "block"; cv.style.imageRendering = "pixelated";
    paint(cv);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (cv.isConnected) paint(cv); });
    return cv;
  }

  function place() {
    var end = document.querySelector("#overlay .trail-end") || document.querySelector(".trail-end");
    if (!end || end.querySelector("#buildItBoard")) return;
    var at = end.querySelector(".te-head") || end.querySelector(".te-actions");
    end.insertBefore(board(), at || null);
  }

  var base = window.showFinale;
  if (typeof base === "function") {
    window.showFinale = function () {
      var lv = typeof L !== "undefined" ? L : null, last = !!(lv && lv.finale);
      var r = base.apply(this, arguments);
      if (last) try { place(); } catch (e) {}
      return r;
    };
  }

})();
