(function () {
  "use strict";
  var BH = window.BH = window.BH || {};
  function zec(old) { return old >= 60 ? 2 : 1; }
  function cut(r) {
    var was = +r.price;
    if (!(was > 0)) return;
    r.price = zec(was);
    if (r.buy != null) r.buy = r.price;
    if (typeof r.text === "string") r.text = r.text.replace(/\b\d+ ZEC$/, r.price + " ZEC");
  }
  [BH.cosmetics, BH.characters].forEach(function (K) {
    if (K && Array.isArray(K.list)) K.list.forEach(function (it) { if (it && it.rule) cut(it.rule); });
  });
  var main = BH.characters && BH.characters.get && BH.characters.get("char-014");
  if (main) main.rule = { price: 0, text: "Yours from the start" };
})();
