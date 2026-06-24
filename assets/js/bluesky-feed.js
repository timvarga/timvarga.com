/* ============================================================
   assets/js/bluesky-feed.js
   Live Bluesky feed for timvarga.com/blog/index.html

   Uses the public AT Protocol API — no auth or API key needed.
   Renders posts, reposts, and likes in a tabbed feed.
   ============================================================ */

(function () {
  "use strict";

  var HANDLE = "tvargs.bsky.social";
  var API    = "https://public.api.bsky.app/xrpc/";
  var LIMIT  = 20;

  /* ── UTILITIES ─────────────────────────────────────────── */

  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  function postUrl(post) {
    var rkey = post.uri.split("/").pop();
    return "https://bsky.app/profile/" + post.author.handle + "/post/" + rkey;
  }

  /* ── RICH TEXT (facets → HTML) ──────────────────────────── */

  function renderText(record) {
    if (!record || !record.text) return "";
    var text   = record.text;
    var facets = record.facets;

    if (!facets || facets.length === 0) {
      return esc(text).replace(/\n/g, "<br>");
    }

    var encoder = new TextEncoder();
    var decoder = new TextDecoder();
    var bytes   = encoder.encode(text);
    var sorted  = facets.slice().sort(function (a, b) {
      return a.index.byteStart - b.index.byteStart;
    });

    var html   = "";
    var cursor = 0;

    sorted.forEach(function (facet) {
      var start   = facet.index.byteStart;
      var end     = facet.index.byteEnd;
      var feature = facet.features && facet.features[0];

      if (cursor < start) {
        html += esc(decoder.decode(bytes.slice(cursor, start))).replace(/\n/g, "<br>");
      }

      var chunk = decoder.decode(bytes.slice(start, end));

      if (!feature) {
        html += esc(chunk);
      } else if (feature["$type"] === "app.bsky.richtext.facet#link") {
        html += '<a href="' + esc(feature.uri) + '" target="_blank" rel="noopener">'
              + esc(chunk) + "</a>";
      } else if (feature["$type"] === "app.bsky.richtext.facet#mention") {
        html += '<a href="https://bsky.app/profile/' + esc(feature.did)
              + '" target="_blank" rel="noopener">' + esc(chunk) + "</a>";
      } else if (feature["$type"] === "app.bsky.richtext.facet#tag") {
        html += '<a href="https://bsky.app/hashtag/' + esc(feature.tag)
              + '" target="_blank" rel="noopener">' + esc(chunk) + "</a>";
      } else {
        html += esc(chunk);
      }

      cursor = end;
    });

    if (cursor < bytes.length) {
      html += esc(decoder.decode(bytes.slice(cursor))).replace(/\n/g, "<br>");
    }

    return html;
  }

  /* ── EMBED RENDERING ────────────────────────────────────── */

  function renderEmbed(embed) {
    if (!embed) return "";

    /* Images */
    if (embed["$type"] === "app.bsky.embed.images#view") {
      var imgs = embed.images.map(function (img) {
        return '<a href="' + esc(img.fullsize || img.thumb)
             + '" target="_blank" rel="noopener">'
             + '<img src="' + esc(img.thumb) + '" alt="' + esc(img.alt || "") + '" loading="lazy">'
             + "</a>";
      }).join("");
      return '<div class="bsky-embed-images">' + imgs + "</div>";
    }

    /* External link preview */
    if (embed["$type"] === "app.bsky.embed.external#view") {
      var ext   = embed.external;
      var thumb = ext.thumb
        ? '<img src="' + esc(ext.thumb) + '" alt="" loading="lazy" class="bsky-embed-external-thumb">'
        : "";
      return '<a class="bsky-embed-external" href="' + esc(ext.uri)
           + '" target="_blank" rel="noopener">'
           + thumb
           + '<div class="bsky-embed-external-body">'
           + '<div class="bsky-embed-external-title">' + esc(ext.title || ext.uri) + "</div>"
           + (ext.description
               ? '<div class="bsky-embed-external-desc">' + esc(ext.description) + "</div>"
               : "")
           + "</div></a>";
    }

    /* Quote post */
    if (embed["$type"] === "app.bsky.embed.record#view") {
      var rec = embed.record;
      if (rec["$type"] === "app.bsky.embed.record#viewRecord" && rec.value) {
        var qText = rec.value.text
          ? esc(rec.value.text).replace(/\n/g, "<br>")
          : "";
        return '<div class="bsky-embed-quote">'
             + '<div class="bsky-embed-quote-author">@' + esc(rec.author.handle) + "</div>"
             + '<div class="bsky-embed-quote-text">' + qText + "</div>"
             + "</div>";
      }
      return "";
    }

    /* Record with media (quote + images) */
    if (embed["$type"] === "app.bsky.embed.recordWithMedia#view") {
      return renderEmbed(embed.media) + renderEmbed(embed.record);
    }

    return "";
  }

  /* ── CARD BUILDER ───────────────────────────────────────── */

  function buildCard(item, isLike) {
    var post      = item.post;
    var isRepost  = item.reason &&
                    item.reason["$type"] === "app.bsky.feed.defs#reasonRepost";

    var header = "";
    if (isRepost) {
      header = '<div class="bsky-repost-header">🔁 Reposted</div>';
    } else if (isLike) {
      header = '<div class="bsky-repost-header">❤️ Liked by @' + esc(HANDLE) + "</div>";
    }

    var displayName = post.author.displayName || post.author.handle;

    var avatar = post.author.avatar
      ? '<img class="bsky-avatar" src="' + esc(post.author.avatar) + '" alt="" loading="lazy">'
      : '<div class="bsky-avatar bsky-avatar-placeholder"></div>';

    var textHtml  = renderText(post.record);
    var embedHtml = renderEmbed(post.embed);
    var url       = postUrl(post);

    var likes   = post.likeCount   != null ? "<span>♡ " + post.likeCount   + "</span>" : "";
    var reposts = post.repostCount != null ? "<span>🔁 " + post.repostCount + "</span>" : "";
    var replies = post.replyCount  != null ? "<span>💬 " + post.replyCount  + "</span>" : "";

    return '<article class="bsky-card">'
      + header
      + '<div class="bsky-author">'
      +   avatar
      +   '<div>'
      +     '<div class="bsky-author-name">'  + esc(displayName)       + "</div>"
      +     '<div class="bsky-author-handle">@' + esc(post.author.handle) + "</div>"
      +   "</div>"
      + "</div>"
      + '<div class="bsky-text">'  + textHtml  + "</div>"
      + embedHtml
      + '<div class="bsky-meta">'
      +   likes + reposts + replies
      +   '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + formatDate(post.indexedAt) + "</a>"
      + "</div>"
      + "</article>";
  }

  /* ── FETCH + RENDER ─────────────────────────────────────── */

  function setStatus(container, msg) {
    container.innerHTML = '<p class="bsky-status">' + msg + "</p>";
  }

  function loadFeed(endpoint, extraParams, container, moreBtn, state) {
    var params = Object.assign({ actor: HANDLE, limit: LIMIT }, extraParams);
    if (state.cursor) params.cursor = state.cursor;

    moreBtn.disabled    = true;
    moreBtn.textContent = "Loading…";

    var qs  = new URLSearchParams(params).toString();
    var url = API + endpoint + "?" + qs;

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var items  = data.feed || [];
        var isLike = endpoint === "app.bsky.feed.getActorLikes";

        if (items.length === 0 && !state.cursor) {
          setStatus(container, "Nothing here yet.");
          moreBtn.style.display = "none";
          return;
        }

        /* For author feed: skip standalone replies (keep posts + reposts) */
        if (!isLike) {
          items = items.filter(function (item) {
            var isRepost = item.reason &&
              item.reason["$type"] === "app.bsky.feed.defs#reasonRepost";
            return isRepost || !item.post.record.reply;
          });
        }

        /* Clear loading message on first batch */
        if (!state.cursor) container.innerHTML = "";

        var html = items.map(function (item) {
          return buildCard(item, isLike);
        }).join("");
        container.insertAdjacentHTML("beforeend", html);

        state.cursor = data.cursor;
        if (data.cursor) {
          moreBtn.disabled    = false;
          moreBtn.textContent = "Load more";
        } else {
          moreBtn.style.display = "none";
        }
      })
      .catch(function (err) {
        console.error("Bluesky fetch error:", err);
        if (!state.cursor) {
          setStatus(container, "Could not load posts — try refreshing the page.");
        }
        moreBtn.disabled    = false;
        moreBtn.textContent = "Try again";
      });
  }

  /* ── INIT ───────────────────────────────────────────────── */

  document.addEventListener("DOMContentLoaded", function () {
    var postsFeed = document.getElementById("bsky-posts-feed");
    if (!postsFeed) return;

    var likesFeed  = document.getElementById("bsky-likes-feed");
    var postsMore  = document.getElementById("bsky-posts-more");
    var likesMore  = document.getElementById("bsky-likes-more");
    var tabs       = document.querySelectorAll(".bsky-tab");
    var panels     = document.querySelectorAll(".bsky-panel");

    var postsCursor = { cursor: null };
    var likesCursor = { cursor: null };
    var likesLoaded = false;

    /* Tab switching */
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t)   { t.classList.remove("is-active"); });
        panels.forEach(function (p) { p.classList.remove("is-active"); });
        tab.classList.add("is-active");
        var panel = document.getElementById(tab.dataset.panel);
        if (panel) panel.classList.add("is-active");

        /* Lazy-load likes on first visit to that tab */
        if (tab.dataset.panel === "bsky-panel-likes" && !likesLoaded) {
          likesLoaded = true;
          setStatus(likesFeed, "Loading…");
          loadFeed("app.bsky.feed.getActorLikes", {}, likesFeed, likesMore, likesCursor);
        }
      });
    });

    /* Load more */
    postsMore.addEventListener("click", function () {
      loadFeed("app.bsky.feed.getAuthorFeed", {}, postsFeed, postsMore, postsCursor);
    });
    likesMore.addEventListener("click", function () {
      loadFeed("app.bsky.feed.getActorLikes", {}, likesFeed, likesMore, likesCursor);
    });

    /* Initial posts load */
    setStatus(postsFeed, "Loading…");
    loadFeed("app.bsky.feed.getAuthorFeed", {}, postsFeed, postsMore, postsCursor);
  });

})();
