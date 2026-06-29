/* ============================================================
   assets/js/bluesky-feed.js
   Bluesky feed for timvarga.com/blog/index.html

   Posts & Reposts — fetched live from the public AT Proto API.
   Likes — read from /assets/data/likes.json, refreshed every
           6 hours by the GitHub Action at .github/workflows/fetch-likes.yml
   ============================================================ */

(function () {
  "use strict";

  var HANDLE     = "tvargs.bsky.social";
  var API        = "https://public.api.bsky.app/xrpc/";
  var LIKES_JSON = "/assets/data/likes.json";
  var LIMIT      = 5;

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

    if (embed["$type"] === "app.bsky.embed.images#view") {
      var imgs = embed.images.map(function (img) {
        return '<a href="' + esc(img.fullsize || img.thumb)
             + '" target="_blank" rel="noopener">'
             + '<img src="' + esc(img.thumb) + '" alt="' + esc(img.alt || "") + '" loading="lazy">'
             + "</a>";
      }).join("");
      return '<div class="bsky-embed-images">' + imgs + "</div>";
    }

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

    if (embed["$type"] === "app.bsky.embed.recordWithMedia#view") {
      return renderEmbed(embed.media) + renderEmbed(embed.record);
    }

    return "";
  }

  /* ── CARD BUILDER ───────────────────────────────────────── */

  function buildCard(item, isLike) {
    var post     = item.post;
    var isRepost = item.reason &&
                   item.reason["$type"] === "app.bsky.feed.defs#reasonRepost";

    var header = "";
    if (isRepost) {
      header = '<div class="bsky-repost-header">🔁 Reposted</div>';
    } else if (isLike) {
      header = '<div class="bsky-repost-header">❤️ Liked</div>';
    }

    var displayName = post.author.displayName || post.author.handle;
    var avatar = post.author.avatar
      ? '<img class="bsky-avatar" src="' + esc(post.author.avatar) + '" alt="" loading="lazy">'
      : '<div class="bsky-avatar bsky-avatar-placeholder"></div>';

    var url     = postUrl(post);
    var likes   = post.likeCount   != null ? "<span>♡ " + post.likeCount   + "</span>" : "";
    var reposts = post.repostCount != null ? "<span>🔁 " + post.repostCount + "</span>" : "";
    var replies = post.replyCount  != null ? "<span>💬 " + post.replyCount  + "</span>" : "";

    return '<article class="bsky-card">'
      + header
      + '<div class="bsky-author">'
      +   avatar
      +   '<div>'
      +     '<div class="bsky-author-name">'    + esc(displayName)        + "</div>"
      +     '<div class="bsky-author-handle">@' + esc(post.author.handle) + "</div>"
      +   "</div>"
      + "</div>"
      + '<div class="bsky-text">'  + renderText(post.record) + "</div>"
      + renderEmbed(post.embed)
      + '<div class="bsky-meta">'
      +   likes + reposts + replies
      +   '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + formatDate(post.indexedAt) + "</a>"
      + "</div>"
      + "</article>";
  }

  /* ── POSTS FEED (live API, paginated) ───────────────────── */

  function setStatus(container, msg) {
    container.innerHTML = '<p class="bsky-status">' + msg + "</p>";
  }

  function loadPosts(container, moreBtn, state) {
    var params = { actor: HANDLE, limit: LIMIT };
    if (state.cursor) params.cursor = state.cursor;

    moreBtn.disabled    = true;
    moreBtn.textContent = "Loading…";

    fetch(API + "app.bsky.feed.getAuthorFeed?" + new URLSearchParams(params))
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var items = (data.feed || []).filter(function (item) {
          var isRepost = item.reason &&
            item.reason["$type"] === "app.bsky.feed.defs#reasonRepost";
          return isRepost || !item.post.record.reply;
        });

        if (items.length === 0 && !state.cursor) {
          setStatus(container, "No posts yet.");
          moreBtn.style.display = "none";
          return;
        }

        if (!state.cursor) container.innerHTML = "";
        container.insertAdjacentHTML("beforeend", items.map(function (i) {
          return buildCard(i, false);
        }).join(""));

        state.cursor = data.cursor;
        if (data.cursor) {
          moreBtn.disabled    = false;
          moreBtn.textContent = "Load more";
        } else {
          moreBtn.style.display = "none";
        }
      })
      .catch(function (err) {
        console.error("Posts fetch error:", err);
        if (!state.cursor) setStatus(container, "Could not load posts — try refreshing.");
        moreBtn.disabled    = false;
        moreBtn.textContent = "Try again";
      });
  }

  /* ── LIKES FEED (static JSON, client-side paging) ────────── */

  function loadLikes(container, moreBtn) {
    setStatus(container, "Loading…");
    moreBtn.style.display = "none";

    fetch(LIKES_JSON + "?v=" + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var items = data.feed || [];

        if (items.length === 0) {
          var msg = "No likes yet — the GitHub Action may not have run yet. "
                  + "Go to the Actions tab on your repo and run <em>Fetch Bluesky Likes</em> manually.";
          container.innerHTML = '<p class="bsky-status">' + msg + "</p>";
          return;
        }

        container.innerHTML = "";

        /* Client-side pagination */
        var pageSize = LIMIT;
        var offset   = 0;

        function renderPage() {
          var page = items.slice(offset, offset + pageSize);
          container.insertAdjacentHTML("beforeend", page.map(function (i) {
            return buildCard(i, true);
          }).join(""));
          offset += page.length;

          if (offset < items.length) {
            moreBtn.style.display   = "block";
            moreBtn.disabled        = false;
            moreBtn.textContent     = "Load more";
            moreBtn.onclick         = renderPage;
          } else {
            moreBtn.style.display = "none";
          }
        }

        renderPage();

        /* Show freshness timestamp */
        if (data.updatedAt) {
          container.insertAdjacentHTML("afterbegin",
            '<p class="bsky-status" style="text-align:left;padding:0 0 0.5rem">'
            + "Updated " + formatDate(data.updatedAt) + "</p>"
          );
        }
      })
      .catch(function (err) {
        console.error("Likes fetch error:", err);
        setStatus(container, "Could not load likes — try refreshing.");
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

    var postsState  = { cursor: null };
    var likesLoaded = false;

    /* Tab switching */
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t)   { t.classList.remove("is-active"); });
        panels.forEach(function (p) { p.classList.remove("is-active"); });
        tab.classList.add("is-active");
        var panel = document.getElementById(tab.dataset.panel);
        if (panel) panel.classList.add("is-active");

        if (tab.dataset.panel === "bsky-panel-likes" && !likesLoaded) {
          likesLoaded = true;
          loadLikes(likesFeed, likesMore);
        }
      });
    });

    /* Posts load-more */
    postsMore.addEventListener("click", function () {
      loadPosts(postsFeed, postsMore, postsState);
    });

    /* Initial posts load */
    setStatus(postsFeed, "Loading…");
    loadPosts(postsFeed, postsMore, postsState);
  });

})();
