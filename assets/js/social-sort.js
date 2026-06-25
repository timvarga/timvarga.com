/* ============================================================
   assets/js/social-sort.js
   Sorts .social-card elements by lastActive timestamp from
   assets/data/social-activity.json — most-recently-active first.
   Cards with null timestamps sort to the end.
   Also injects a small "last active" label into each card.
   ============================================================ */

(function () {
  "use strict";

  var ACTIVITY_URL = "/assets/data/social-activity.json?v=" + Date.now();

  /* ── Relative time helper ───────────────────────────────── */
  function relativeTime(isoString) {
    if (!isoString) return null;
    var now  = Date.now();
    var then = new Date(isoString).getTime();
    var diff = Math.floor((now - then) / 1000);

    if (diff <  60)         return "just now";
    if (diff <  3600)       return Math.floor(diff / 60)    + "m ago";
    if (diff <  86400)      return Math.floor(diff / 3600)  + "h ago";
    if (diff <  86400 * 30) return Math.floor(diff / 86400) + "d ago";
    if (diff <  86400 * 365) {
      var months = Math.floor(diff / (86400 * 30));
      return months + " month" + (months !== 1 ? "s" : "") + " ago";
    }
    var years = Math.floor(diff / (86400 * 365));
    return years + " year" + (years !== 1 ? "s" : "") + " ago";
  }

  function sourceLabel(source) {
    return (source === "manual") ? "approx." : "live";
  }

  /* ── Main ───────────────────────────────────────────────── */
  fetch(ACTIVITY_URL)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      var platforms = data.platforms || {};
      var grid = document.querySelector(".social-grid");
      if (!grid) return;

      var cards = Array.from(grid.querySelectorAll(".social-card[data-platform]"));

      cards.forEach(function (card) {
        var key      = card.getAttribute("data-platform");
        var platform = platforms[key] || {};
        var ts       = platform.lastActive || null;
        var source   = platform.source || "manual";

        card.setAttribute("data-last-active", ts || "");

        var body = card.querySelector(".social-card-body");
        if (body) {
          var existing = body.querySelector(".social-last-active");
          if (existing) existing.remove();

          var label = document.createElement("p");
          label.className = "social-last-active";
          var rel = relativeTime(ts);
          if (rel) {
            label.textContent = "Last active: " + rel + " (" + sourceLabel(source) + ")";
          } else {
            label.textContent = "Activity not yet tracked";
          }
          body.appendChild(label);
        }
      });

      /* Sort: most-recent first; null/empty timestamps go to end */
      cards.sort(function (a, b) {
        var ta = a.getAttribute("data-last-active");
        var tb = b.getAttribute("data-last-active");
        if (!ta && !tb) return 0;
        if (!ta) return  1;
        if (!tb) return -1;
        return new Date(tb) - new Date(ta);
      });

      cards.forEach(function (card) {
        grid.appendChild(card);
      });
    })
    .catch(function (err) {
      console.warn("social-sort.js: could not load activity data —", err);
    });
})();
