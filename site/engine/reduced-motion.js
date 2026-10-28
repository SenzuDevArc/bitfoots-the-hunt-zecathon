(function () {
  if (!window.matchMedia) return;
  var base = window.matchMedia.bind(window);
  window.matchMedia = function (q) {
    if (/prefers-reduced-motion\s*:\s*reduce/.test(String(q))) {
      var m = base("not all"); try { Object.defineProperty(m, "media", { value: String(q) }); } catch (e) {}
      return m;
    }
    return base(q);
  };
})();
