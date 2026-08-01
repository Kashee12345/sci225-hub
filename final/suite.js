/* SCI 225 — Final Exam Suite · shared helpers + progress store
   Every tool records per-week results here so the HQ dashboard can show readiness. */
(function (w) {
  "use strict";

  var KEY = "sci225_final_v1";

  function blank() { return { weeks: {}, tools: {} }; }

  function load() {
    try {
      var s = localStorage.getItem(KEY);
      if (!s) return blank();
      var d = JSON.parse(s);
      if (!d || typeof d !== "object") return blank();
      d.weeks = d.weeks || {}; d.tools = d.tools || {};
      return d;
    } catch (e) { return blank(); }
  }

  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
  }

  var Progress = {
    /* record one answered item.  week may be null for cross-week items. */
    hit: function (tool, week, correct) {
      var d = load();
      if (week != null) {
        var k = String(week);
        var wk = d.weeks[k] || { c: 0, n: 0 };
        wk.n += 1; if (correct) wk.c += 1;
        d.weeks[k] = wk;
      }
      var t = d.tools[tool] || { c: 0, n: 0, runs: 0, best: null };
      t.n += 1; if (correct) t.c += 1;
      d.tools[tool] = t;
      save(d);
    },
    /* record a completed run (simulator score, drill session) */
    run: function (tool, pct) {
      var d = load();
      var t = d.tools[tool] || { c: 0, n: 0, runs: 0, best: null };
      t.runs = (t.runs || 0) + 1;
      if (t.best == null || pct > t.best) t.best = pct;
      t.last = pct;
      d.tools[tool] = t;
      save(d);
    },
    all: load,
    weekPct: function (week) {
      var wk = load().weeks[String(week)];
      if (!wk || !wk.n) return null;
      return Math.round((wk.c / wk.n) * 100);
    },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  /* ---------- helpers ---------- */
  function shuffle(a) {
    var arr = a.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* shuffle a question's options while keeping track of the right answer */
  function shuffleQ(q) {
    var idx = q.a.map(function (_, i) { return i; });
    idx = shuffle(idx);
    return {
      q: q.q,
      a: idx.map(function (i) { return q.a[i]; }),
      c: idx.indexOf(q.c),
      t: q.t, fb: q.fb, d: q.d, week: q.week
    };
  }

  /* flatten FINAL_BANK into one array, tagging each question with its week */
  function bankAll() {
    var out = [];
    if (!w.FINAL_BANK) return out;
    Object.keys(w.FINAL_BANK).forEach(function (k) {
      w.FINAL_BANK[k].questions.forEach(function (q) {
        var o = {}; for (var p in q) o[p] = q[p];
        o.week = k;
        out.push(o);
      });
    });
    return out;
  }

  function weekTitle(k) {
    return (w.FINAL_BANK && w.FINAL_BANK[k] && w.FINAL_BANK[k].title) || ("Week " + k);
  }

  /* short label: "Week 9 · Cardiovascular" */
  function weekShort(k) {
    var t = weekTitle(k).replace(/^Week\s*\d+\s*[—–-]\s*/, "").replace(/^The\s+/, "");
    return "Week " + k + " · " + t.replace(/\s*Systems?$/, "");
  }

  var topbar = function (title, meta) {
    return '<div class="tbar"><div class="ti">' +
      '<a class="back" href="index.html">‹ Final Exam HQ</a>' +
      '<span class="tt">' + esc(title) + '</span>' +
      '<span class="spacer"></span>' +
      '<span class="meta" id="tbMeta">' + (meta || "") + '</span>' +
      '</div></div>';
  };

  w.FinalSuite = {
    Progress: Progress, shuffle: shuffle, esc: esc, shuffleQ: shuffleQ,
    bankAll: bankAll, weekTitle: weekTitle, weekShort: weekShort, topbar: topbar,
    WEEKS: ["8", "9", "10", "11", "12", "13", "14"]
  };
})(window);
