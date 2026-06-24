/* ============================================================
   assets/js/maps.js
   Leaflet v1.9 commute maps — timvarga.com/about.html

   Wires up small, non-interactive Leaflet maps inside each
   .tl-map-placeholder div when its parent .tl-node is expanded.

   Each placeholder already has:
     id="map-{job-id}"
     data-home-lat / data-home-lng   (Oakland, CA)
     data-office-lat / data-office-lng  (job office)

   When home == office (freelance role) we skip the polyline and
   show a single "home base" marker instead.
   ============================================================ */

(function () {
  "use strict";

  /* Guard: Leaflet must be loaded before this script */
  if (typeof L === "undefined") {
    console.warn("maps.js: Leaflet not found — skipping commute maps.");
    return;
  }

  /* ── TILE LAYER ─────────────────────────────────────────── */
  var TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  var TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" '
                + 'target="_blank" rel="noopener">OpenStreetMap</a>';

  /* ── ICON HELPERS ───────────────────────────────────────── */

  function makeIcon(emoji, size) {
    size = size || 22;
    return L.divIcon({
      className:  "",            // suppress Leaflet's default white-box class
      html:       '<span style="font-size:' + size + 'px;line-height:1;'
                + 'filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))">'
                + emoji + "</span>",
      iconSize:   [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor:[0, -(size / 2 + 4)],
    });
  }

  var homeIcon   = makeIcon("🏠", 20);
  var officeIcon = makeIcon("📍", 22);

  /* ── MAP REGISTRY (avoid double-init) ───────────────────── */
  var initialized = {};

  /* ── INIT A SINGLE MAP ──────────────────────────────────── */

  function initMap(placeholder) {
    var id = placeholder.id;
    if (initialized[id]) {
      /* Already created — just tell Leaflet the container may have resized */
      initialized[id].invalidateSize();
      return;
    }

    var homeLat    = parseFloat(placeholder.getAttribute("data-home-lat"));
    var homeLng    = parseFloat(placeholder.getAttribute("data-home-lng"));
    var officeLat  = parseFloat(placeholder.getAttribute("data-office-lat"));
    var officeLng  = parseFloat(placeholder.getAttribute("data-office-lng"));

    var sameLocation = (
      Math.abs(homeLat - officeLat) < 0.001 &&
      Math.abs(homeLng - officeLng) < 0.001
    );

    /* Clear placeholder label */
    placeholder.innerHTML = "";
    /* Remove the dashed-box look so the map fills cleanly */
    placeholder.style.border   = "none";
    placeholder.style.background = "transparent";
    placeholder.style.display  = "block";

    /* Create map — deliberately non-interactive (decorative) */
    var map = L.map(id, {
      zoomControl:       false,
      attributionControl: true,
      scrollWheelZoom:   false,
      doubleClickZoom:   false,
      dragging:          false,
      touchZoom:         false,
      boxZoom:           false,
      keyboard:          false,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom:     16,
    }).addTo(map);

    /* Work out the org name from the nearest .tl-org sibling */
    var orgName = "";
    var card = placeholder.closest(".tl-card");
    if (card) {
      var orgEl = card.querySelector(".tl-org");
      if (orgEl) orgName = orgEl.textContent;
    }

    if (sameLocation) {
      /* Freelance / home-office role: single marker */
      L.marker([homeLat, homeLng], { icon: homeIcon })
        .addTo(map)
        .bindPopup("Home base — Oakland, CA");
      map.setView([homeLat, homeLng], 12);
    } else {
      /* Commute route: home + office markers + dashed polyline */
      L.marker([homeLat, homeLng], { icon: homeIcon })
        .addTo(map)
        .bindPopup("Home — Oakland, CA");

      L.marker([officeLat, officeLng], { icon: officeIcon })
        .addTo(map)
        .bindPopup(orgName || "Office");

      L.polyline(
        [[homeLat, homeLng], [officeLat, officeLng]],
        { color: "#2563eb", weight: 2, opacity: 0.75, dashArray: "6 5" }
      ).addTo(map);

      /* Fit both markers with padding */
      var bounds = L.latLngBounds(
        [homeLat, homeLng],
        [officeLat, officeLng]
      );
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
    }

    initialized[id] = map;
  }

  /* ── OBSERVE .tl-node CLASS CHANGES ─────────────────────── */

  /*  timeline.js adds/removes "is-active" on .tl-node elements.
      When a node becomes active we wait for the CSS max-height
      transition (~300 ms) to finish before initialising the map,
      so Leaflet can measure the container correctly.              */

  function handleNodeMutation(node) {
    if (!node.classList.contains("is-active")) return;
    var placeholder = node.querySelector(".tl-map-placeholder");
    if (!placeholder) return;
    setTimeout(function () {
      initMap(placeholder);
    }, 320); /* slightly longer than the 300 ms CSS transition */
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.attributeName === "class" && m.target.classList.contains("tl-node")) {
        handleNodeMutation(m.target);
      }
    });
  });

  document.querySelectorAll(".tl-node").forEach(function (node) {
    observer.observe(node, { attributes: true, attributeFilter: ["class"] });
  });

})();
