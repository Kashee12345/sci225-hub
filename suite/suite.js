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
    /* record one answered item.  week may be null for cross-week items.
       Week stats are shared (1-6 and 8-14 never collide) but tool stats are
       namespaced per exam, so a midterm run cannot skew a final average. */
    hit: function (tool, week, correct) {
      tool = examKey + ":" + tool;
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
      tool = examKey + ":" + tool;
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
      '<a class="back" href="' + w.FinalSuite.hq + '">‹ ' + esc(EXAM.label) + ' HQ</a>' +
      '<span class="tt">' + esc(title) + '</span>' +
      '<span class="spacer"></span>' +
      '<span class="meta" id="tbMeta">' + (meta || "") + '</span>' +
      '</div></div>';
  };

  /* ---------- which exam is this? ----------
     One copy of each tool serves both suites; ?exam=final|midterm picks the data. */
  var EXAMS = {
    final:   { label: "Final Exam",  span: "Weeks 8–14", weeks: ["8","9","10","11","12","13","14"], abgWeek: "10" },
    midterm: { label: "Midterm",     span: "Weeks 1–6",  weeks: ["1","2","3","4","5","6"],          abgWeek: "1"  }
  };
  var examKey = (function () {
    /* an explicit ?exam= wins (the shared tools under /suite/ use it);
       otherwise infer from the folder, so /midterm/index.html needs no query string */
    var m = /[?&]exam=([a-z]+)/i.exec(w.location.search);
    if (m && EXAMS[m[1].toLowerCase()]) return m[1].toLowerCase();
    var p = /\/(midterm|final)\//i.exec(w.location.pathname);
    if (p && EXAMS[p[1].toLowerCase()]) return p[1].toLowerCase();
    return "final";
  })();
  var EXAM = EXAMS[examKey];

  /* load this exam's bank + drills, then run cb */
  function loadData(cb) {
    var files = ["../" + examKey + "/bank.js", "../" + examKey + "/drills.js"];
    var i = 0;
    (function next() {
      if (i >= files.length) return cb();
      var s = document.createElement("script");
      s.src = files[i++];
      s.onload = next;
      s.onerror = function () { next(); };   /* a missing drills.js must not wedge the page */
      document.head.appendChild(s);
    })();
  }

  w.FinalSuite = {
    Progress: Progress, shuffle: shuffle, esc: esc, shuffleQ: shuffleQ,
    bankAll: bankAll, weekTitle: weekTitle, weekShort: weekShort, topbar: topbar,
    exam: examKey, EXAM: EXAM, loadData: loadData, span: EXAM.span,
    hq: "../" + examKey + "/index.html",
    link: function (page) { return page + "?exam=" + examKey; },
    get WEEKS() { return EXAM.weeks; }
  };

  /* back-links and any [data-span] placeholders resolve once the DOM is up */
  function wire() {
    var a = document.querySelectorAll('[data-hq]');
    for (var i = 0; i < a.length; i++) a[i].setAttribute("href", w.FinalSuite.hq);
    var t = document.querySelectorAll("[data-span]");
    for (var j = 0; j < t.length; j++) t[j].textContent = EXAM.span;
    var l = document.querySelectorAll("[data-label]");
    for (var k = 0; k < l.length; k++) l[k].textContent = EXAM.label;
    if (document.title.indexOf("SCI 225") >= 0)
      document.title = document.title.replace(/SCI 225 (Final|Midterm)/, "SCI 225 " + EXAM.label);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})(window);
