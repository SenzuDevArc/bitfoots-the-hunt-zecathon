"use strict";
(function () {
  var statusEl = document.getElementById("status");
  function say(text, bad) { statusEl.textContent = text; statusEl.className = bad ? "error" : ""; }
  function when(ms) { return ms ? new Date(ms).toLocaleString() : ""; }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text !== undefined && text !== null) e.textContent = String(text); if (cls) e.className = cls; return e; }

  function api(method, url) {
    var o = { method: method, credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } };
    return fetch(url, o).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok) throw new Error(r.status === 401 ? "Sign in first." : r.status === 403 ? "Owner only, with Discord 2FA on." : "Request failed (" + r.status + ").");
        return j;
      });
    });
  }

  function table(target, rows, columns, actions) {
    var box = document.getElementById(target);
    box.textContent = "";
    if (!rows.length) { box.appendChild(el("p", "Nothing here.", "empty")); return; }
    var t = el("table"), head = el("tr");
    columns.forEach(function (c) { head.appendChild(el("th", c[0])); });
    if (actions) head.appendChild(el("th", ""));
    var thead = el("thead"); thead.appendChild(head); t.appendChild(thead);
    var body = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      columns.forEach(function (c) { tr.appendChild(el("td", c[1](r), c[2] || "")); });
      if (actions) { var td = el("td"); actions(r).forEach(function (b) { td.appendChild(b); }); tr.appendChild(td); }
      body.appendChild(tr);
    });
    t.appendChild(body); box.appendChild(t);
  }
  function button(label, cls, run) {
    var b = el("button", label, cls); b.type = "button";
    b.addEventListener("click", function () { b.disabled = true; run().then(load, function (e) { say(e.message, true); b.disabled = false; }); });
    return b;
  }

  function load() {
    var all = document.getElementById("allRequests").checked;
    return Promise.all([
      api("GET", "/api/owner/requests" + (all ? "?status=all" : "")),
      api("GET", "/api/owner/players"),
      api("GET", "/api/owner/events?limit=100"),
      api("GET", "/api/owner/audit"),
    ]).then(function (out) {
      table("requests", out[0].requests, [
        ["Name", function (r) { return r.displayName; }], ["Username", function (r) { return r.username; }], ["Discord id", function (r) { return r.discordId; }],
        ["Asked", function (r) { return when(r.createdAt); }], ["Denied before", function (r) { return r.previousDenials; }, "num"], ["Status", function (r) { return r.status; }],
      ], function (r) {
        if (r.status !== "pending") return [];
        return [
          button("Approve", "approve", function () { return api("POST", "/api/owner/requests/" + r.id + "/approve"); }),
          button("Deny", "deny", function () { return api("POST", "/api/owner/requests/" + r.id + "/deny"); }),
        ];
      });
      table("players", out[1].players, [
        ["Name", function (p) { return p.displayName; }], ["Username", function (p) { return p.username; }], ["Discord id", function (p) { return p.discordId; }],
        ["Access", function (p) { return p.access; }], ["Levels", function (p) { return p.levels; }, "num"], ["Stars", function (p) { return p.stars; }, "num"],
        ["ZEC", function (p) { return p.wallet === null ? "" : p.wallet; }, "num"], ["Sessions", function (p) { return p.sessions; }, "num"],
        ["Events", function (p) { return p.events; }, "num"], ["Last seen", function (p) { return when(p.lastSeenAt); }],
        ["Last session", function (p) { return p.lastSession ? when(p.lastSession.at) + " (" + ({ open: "open", logout: "signed out", revoke: "revoked" }[p.lastSession.ended] || p.lastSession.ended) + ")" : ""; }],
      ], function (p) {
        if (p.access !== "allowed") return [];
        return [button("Revoke", "revoke", function () {
          if (!window.confirm("Revoke access for " + (p.displayName || p.discordId) + "?")) return Promise.reject(new Error("Not revoked."));
          return api("POST", "/api/owner/players/" + p.discordId + "/revoke");
        })];
      });
      table("events", out[2].events, [
        ["When", function (e) { return when(e.at); }], ["Player", function (e) { return e.displayName || e.discordId; }], ["Event", function (e) { return e.type; }],
        ["Level", function (e) { return e.level === null ? "" : e.level; }, "num"], ["Detail", function (e) { return JSON.stringify(e.detail); }],
      ]);
      table("audit", out[3].audit, [
        ["When", function (a) { return when(a.at); }], ["Action", function (a) { return a.action; }], ["Who", function (a) { return a.who || a.target || ""; }],
        ["By", function (a) { return a.actor; }], ["Detail", function (a) { return JSON.stringify(a.detail); }],
      ]);
      say("Updated " + new Date().toLocaleTimeString() + ".");
    }, function (e) { say(e.message, true); });
  }

  document.getElementById("allRequests").addEventListener("change", load);
  load();
})();
