/* ============================================================
   assets/js/timeline.js
   D3 v7 interactive career timeline — timvarga.com/about.html

   Architecture:
   • D3 builds all DOM from job data (no hand-written HTML for jobs)
   • Items list interleaves jobs + year-marker dividers
   • Click a node → expand detail panel (CSS max-height transition)
   • Each expanded panel includes a .tl-map-placeholder div with
     data-home-lat/lng and data-office-lat/lng attributes, ready for
     Leaflet to hydrate in the next phase.
   ============================================================ */

(function () {
  "use strict";

  /* ── CONFIG ─────────────────────────────────────────────── */

  // Tim's approximate home coordinates (Oakland, CA)
  const HOME = [37.8044, -122.2712];

  const TYPE = {
    teaching:       { label: "Teaching",        color: "#16a34a" },
    research:       { label: "Research",        color: "#2563eb" },
    communications: { label: "Communications",  color: "#7c3aed" },
    freelance:      { label: "Freelance",       color: "#d97706" },
    other:          { label: "Other",           color: "#6b7280" },
  };

  /* ── JOB DATA ───────────────────────────────────────────── */

  const jobs = [
    {
      id: "bishop-odowd",
      title: "Science Teacher",
      org: "Bishop O'Dowd High School",
      type: "teaching",
      start: new Date(2026, 5),
      end: null,
      dateLabel: "Jun 2026 – Present",
      location: "Oakland, CA",
      office: [37.7989, -122.1857],
      desc: "",
    },
    {
      id: "castilleja",
      title: "Science Teacher",
      org: "Castilleja School",
      type: "teaching",
      start: new Date(2025, 6),
      end: new Date(2026, 5),
      dateLabel: "Jul 2025 – Jun 2026",
      location: "Palo Alto, CA",
      office: [37.4450, -122.1597],
      desc: "",
    },
    {
      id: "nueva-teacher",
      title: "Science Teacher",
      org: "The Nueva School",
      type: "teaching",
      start: new Date(2021, 7),
      end: new Date(2025, 6),
      dateLabel: "Aug 2021 – Jul 2025",
      location: "Hillsborough, CA",
      office: [37.5630, -122.3620],
      desc: "",
    },
    {
      id: "nueva-assoc",
      title: "Associate Teacher, MS Science",
      org: "The Nueva School",
      type: "teaching",
      start: new Date(2019, 7),
      end: new Date(2021, 6),
      dateLabel: "Aug 2019 – Jul 2021",
      location: "Hillsborough, CA",
      office: [37.5630, -122.3620],
      desc: "",
    },
    {
      id: "cpi-manager",
      title: "Communications Manager",
      org: "Climate Policy Initiative",
      type: "communications",
      start: new Date(2018, 0),
      end: new Date(2018, 5),
      dateLabel: "Jan 2018 – Jun 2018",
      location: "San Francisco Bay Area",
      office: [37.7887, -122.4000],
      desc: "Built CPI's scientific visual identity and established CPI's reputation for excellence in data visualization and design. Managed, edited, and produced data visualizations for print and web media across climate and energy finance, national institutions, and land use.",
    },
    {
      id: "cpi-senior",
      title: "Senior Communications Specialist",
      org: "Climate Policy Initiative",
      type: "communications",
      start: new Date(2016, 0),
      end: new Date(2017, 11),
      dateLabel: "Jan 2016 – Dec 2017",
      location: "San Francisco Bay Area",
      office: [37.7887, -122.4000],
      desc: "Helped skilled researchers communicate, collaborate, and share knowledge across continents and disciplines.",
    },
    {
      id: "cpi-assoc",
      title: "Associate, Communications & Knowledge Management",
      org: "Climate Policy Initiative",
      type: "communications",
      start: new Date(2014, 0),
      end: new Date(2015, 11),
      dateLabel: "Jan 2014 – Dec 2015",
      location: "San Francisco, CA",
      office: [37.7887, -122.4000],
      desc: "",
    },
    {
      id: "cpi-km",
      title: "Knowledge Manager",
      org: "Climate Policy Initiative",
      type: "communications",
      start: new Date(2011, 0),
      end: new Date(2013, 11),
      dateLabel: "Jan 2011 – Dec 2013",
      location: "San Francisco, CA",
      office: [37.7887, -122.4000],
      desc: "",
    },
    {
      id: "terrapass",
      title: "Carbon Offset Project Associate",
      org: "TerraPass Inc",
      type: "research",
      start: new Date(2008, 5),
      end: new Date(2011, 5),
      dateLabel: "Jun 2008 – Jun 2011",
      location: "San Francisco Bay Area",
      office: [37.7580, -122.4070],
      desc: "Managed data collection, quantification, and verification of carbon emissions reduction projects. Coordinated with farm and municipal clients; produced weekly blog posts on climate science, green technology, and land use.",
    },
    {
      id: "freelance",
      title: "Freelance Designer, Educator & Science Communicator",
      org: "TimVarga.com",
      type: "freelance",
      start: new Date(2007, 6),
      end: new Date(2020, 5),
      dateLabel: "Jul 2007 – Jun 2020",
      location: "Oakland, CA",
      office: HOME,
      concurrent: true,
      desc: "Worked with scientists, NGOs, start-ups, and foundations to ingest, clean, analyze, and visualize data. Clients include Science Philanthropy Alliance, UN's SEforAll, and startups at the intersection of science, environment, technology, and policy. Guest lectured at the University of Hawai'i-Hilo, PUC-Rio, and the University of Palangka Raya.",
    },
    {
      id: "carnegie-ecologist",
      title: "Research Ecologist",
      org: "Carnegie Institution of Science",
      type: "research",
      start: new Date(2007, 5),
      end: new Date(2008, 5),
      dateLabel: "Jun 2007 – Jun 2008",
      location: "Hawai'i",
      office: [19.8968, -155.5828],
      desc: "Led research in biological conservation and carbon storage accounting in native and invaded Hawaiian ecosystems. Served as liaison between Carnegie Institution and Hawaiian NGO, governmental, and private organizations.",
    },
    {
      id: "stanford-ta",
      title: "Teaching & Course Assistant",
      org: "Stanford University",
      type: "teaching",
      start: new Date(2005, 8),
      end: new Date(2007, 5),
      dateLabel: "Sep 2005 – Jun 2007",
      location: "Stanford, CA",
      office: [37.4275, -122.1697],
      desc: "Head TA for 'Remote Sensing of Land Use and Land Cover' (Prof. Karen Seto). Also Course Assistant for 'Assessing Katrina' and 'Geosphere,' core Earth Systems Program curriculum.",
    },
    {
      id: "touchstone",
      title: "Front Desk Staff",
      org: "Touchstone Climbing",
      type: "other",
      start: new Date(2005, 7),
      end: new Date(2007, 5),
      dateLabel: "Aug 2005 – Jun 2007",
      location: "San Jose, CA",
      office: [37.3688, -121.9289],
      desc: "",
    },
    {
      id: "carnegie-ra",
      title: "Research Assistant",
      org: "Carnegie Institution of Science",
      type: "research",
      start: new Date(2005, 5),
      end: new Date(2007, 5),
      dateLabel: "Jun 2005 – Jun 2007",
      location: "Stanford, CA",
      office: [37.4276, -122.1693],
      desc: "Analyzed remotely sensed hyperspectral imagery from JPL's AVIRIS sensor to quantify biophysical properties. Performed spatial analysis using ArcView GIS; executed allometric studies of pinyon-juniper ecosystems in the arid Southwest.",
    },
    {
      id: "jasper-ridge",
      title: "Docent",
      org: "Jasper Ridge Biological Preserve, Stanford University",
      type: "teaching",
      start: new Date(2003, 0),
      end: new Date(2006, 11),
      dateLabel: "2003 – 2006",
      location: "Stanford, CA",
      office: [37.4024, -122.2248],
      desc: "Natural history, ecosystem ecology, and 6th–7th grade science tutoring.",
    },
    {
      id: "sierra-camp",
      title: "Assistant Naturalist, Photographer & Rock Climbing Instructor",
      org: "Stanford Sierra Camp",
      type: "other",
      start: new Date(2003, 0),
      end: new Date(2004, 11),
      dateLabel: "2003 – 2004",
      location: "Fallen Leaf Lake, CA",
      office: [38.8969, -120.0577],
      desc: "",
    },
    {
      id: "rei",
      title: "Sales Associate",
      org: "REI",
      type: "other",
      start: new Date(2001, 4),
      end: new Date(2002, 8),
      dateLabel: "May 2001 – Sep 2002",
      location: "Seattle, WA",
      office: [47.6062, -122.3321],
      desc: "Hats, socks, and shoes.",
    },
    {
      id: "uw-copy",
      title: "Copy Services Staff",
      org: "UW Creative Communications",
      type: "other",
      start: new Date(1999, 0),
      end: new Date(2001, 11),
      dateLabel: "1999 – 2001",
      location: "Seattle, WA",
      office: [47.6553, -122.3035],
      desc: "",
    },
  ];

  /* ── SORT + INTERLEAVE YEAR MARKERS ─────────────────────── */

  jobs.sort(function (a, b) { return b.start - a.start; });

  // 5-year markers, descending
  var MARK_YEARS = [2025, 2020, 2015, 2010, 2005, 2000];

  function buildItems(sortedJobs, markYears) {
    var result = [];
    var mIdx = 0;

    for (var i = 0; i < sortedJobs.length; i++) {
      var jobYear = sortedJobs[i].start.getFullYear();

      // Insert any marker whose year >= this job's start year
      while (mIdx < markYears.length && markYears[mIdx] >= jobYear) {
        result.push({ type: "marker", year: markYears[mIdx] });
        mIdx++;
      }

      result.push({ type: "job", data: sortedJobs[i] });
    }

    // Flush any remaining markers below the oldest job
    while (mIdx < markYears.length) {
      result.push({ type: "marker", year: markYears[mIdx++] });
    }

    return result;
  }

  var items = buildItems(jobs, MARK_YEARS);

  /* ── LEGEND ─────────────────────────────────────────────── */

  var legend = d3.select("#timeline-legend");

  legend.selectAll(".legend-item")
    .data(Object.entries(TYPE))
    .enter()
    .append("span")
    .attr("class", "legend-item")
    .each(function (entry) {
      var val = entry[1];
      d3.select(this).append("span")
        .attr("class", "legend-dot")
        .style("background", val.color);
      d3.select(this).append("span")
        .text(val.label);
    });

  /* ── RENDER TIMELINE ────────────────────────────────────── */

  var container = d3.select("#career-timeline");

  var itemEls = container.selectAll(".tl-item")
    .data(items)
    .enter()
    .append("div")
    .attr("class", function (d) {
      return d.type === "marker" ? "tl-year-marker" : "tl-node";
    });

  // Render year markers
  itemEls.filter(function (d) { return d.type === "marker"; })
    .text(function (d) { return d.year; });

  // Render job nodes
  var nodes = itemEls.filter(function (d) { return d.type === "job"; });

  nodes
    .attr("tabindex", "0")
    .attr("role", "button")
    .attr("aria-expanded", "false");

  // Dot (colored by job type)
  nodes.append("div")
    .attr("class", "tl-dot")
    .style("border-color", function (d) { return TYPE[d.data.type].color; })
    .style("color", function (d) { return TYPE[d.data.type].color; });

  // Card
  var cards = nodes.append("div").attr("class", "tl-card");

  // Header
  var headers = cards.append("div").attr("class", "tl-card-header");

  headers.append("h3")
    .attr("class", "tl-title")
    .text(function (d) { return d.data.title; });

  headers.append("div")
    .attr("class", "tl-org")
    .text(function (d) { return d.data.org; });

  headers.append("time")
    .attr("class", "tl-dates")
    .attr("datetime", function (d) {
      return d.data.start.toISOString().slice(0, 7);
    })
    .text(function (d) { return d.data.dateLabel; });

  headers.filter(function (d) { return d.data.concurrent; })
    .append("span")
    .attr("class", "tl-concurrent-badge")
    .text("ran concurrently");

  headers.append("span")
    .attr("class", "tl-toggle-icon")
    .attr("aria-hidden", "true")
    .html("&#9662;");

  // Detail panel (collapsed by default)
  var details = cards.append("div").attr("class", "tl-detail");
  var inner   = details.append("div").attr("class", "tl-detail-inner");

  inner.append("div")
    .attr("class", "tl-location")
    .text(function (d) { return "📍 " + d.data.location; });

  inner.filter(function (d) { return d.data.desc; })
    .append("p")
    .attr("class", "tl-desc")
    .text(function (d) { return d.data.desc; });

  // Map placeholder — Leaflet will target these divs by id in the next phase
  inner.append("div")
    .attr("class", "tl-map-placeholder")
    .attr("id", function (d) { return "map-" + d.data.id; })
    .attr("data-home-lat",   HOME[0])
    .attr("data-home-lng",   HOME[1])
    .attr("data-office-lat", function (d) { return d.data.office[0]; })
    .attr("data-office-lng", function (d) { return d.data.office[1]; })
    .html('<span class="tl-map-label">🗺 Commute map — coming next</span>');

  /* ── INTERACTIONS ───────────────────────────────────────── */

  nodes.on("click", function (event) {
    var el       = d3.select(this);
    var wasActive = el.classed("is-active");

    // Collapse everything and reset aria
    d3.selectAll(".tl-node")
      .classed("is-active", false)
      .attr("aria-expanded", "false");

    if (!wasActive) {
      el.classed("is-active", true)
        .attr("aria-expanded", "true");
      // Nudge the card into view
      var card = this.querySelector(".tl-card");
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  });

  nodes.on("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.click();
    }
  });

  // On active: fill the dot
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      var el  = d3.select(m.target);
      var dot = el.select(".tl-dot");
      if (el.classed("is-active")) {
        var color = dot.style("border-color");
        dot.style("background-color", color);
      } else {
        dot.style("background-color", "#ffffff");
      }
    });
  });

  document.querySelectorAll(".tl-node").forEach(function (node) {
    observer.observe(node, { attributes: true, attributeFilter: ["class"] });
  });

})();
