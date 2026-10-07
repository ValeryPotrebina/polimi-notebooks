/* ==========================================================================
   Study notebook — runtime + widget toolkit (global object: Course)
   Classic script, no modules, no fetch: works from file://, a static server
   and as a claude.ai Artifact. Loaded in <head>, after assets/syllabus.js
   and before MathJax.
   Nothing in this file names a course: the title, the storage key, the footer
   sentence, the label of the source pages, the exam language and extra TeX
   macros all come from window.SYLLABUS.course (see assets/syllabus.js).
   Authoring contract: see COMPONENTS.md.
   ========================================================================== */
(function () {
  'use strict';
  if (window.Course) return;

  var doc = document, root = doc.documentElement;
  var Course = window.Course = { version: '1.3.0' };
  root.classList.add('js');

  /* The course block of the syllabus, with the defaults of every field (documented in assets/syllabus.js). */
  var CFG = (function () {
    var c = (window.SYLLABUS && window.SYLLABUS.course) || {}, out = {}, k;
    for (k in c) if (Object.prototype.hasOwnProperty.call(c, k)) out[k] = c[k];
    function slug(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-+|-+$/g, ''); }
    out.hasId = !!slug(c.id);
    out.id = slug(c.id) || slug(c.title) || 'course';
    out.title = c.title ? String(c.title) : 'Notebook';
    out.subtitle = c.subtitle ? String(c.subtitle) : '';
    out.footer = c.footer ? String(c.footer) : '';
    out.sourceLabel = c.sourceLabel ? String(c.sourceLabel).replace(/\s+$/, '') : 'Source, p.';
    out.redpenLabel = c.redpenLabel ? String(c.redpenLabel) : 'Red pen';
    out.examLang = c.examLang === undefined ? 'en' : String(c.examLang || '');
    out.examStrings = c.examStrings && typeof c.examStrings === 'object' ? c.examStrings : {};
    out.macros = c.macros && typeof c.macros === 'object' ? c.macros : {};
    return out;
  })();
  /* An exam block speaks the language of the exam (course.examLang) like the question itself: its head line, its
     controls and its verdicts. The commentary under the answer stays in the language of the lesson. With examLang ''
     (no exam language) the block follows the language of the page. A language that is not listed here gets the English
     texts; course.examStrings in the syllabus replaces any of them:
     { head, open, numeric, mcq, points, answer, check, right, retry, almost, number }. */
  var EXAM_UI = {
    en: { head: 'Exam question', open: 'open', numeric: 'numeric', mcq: 'multiple choice', points: 'pt',
      answer: 'Your answer', check: 'Check', right: 'Correct', retry: 'Not yet: recheck the computation or open the model answer', almost: 'Not quite', number: 'Enter a number, e.g. 0.75 or 3/4.' },
    it: { head: 'Domanda d’esame', open: 'aperta', numeric: 'numerica', mcq: 'scelta multipla', points: 'pt',
      answer: 'La tua risposta', check: 'Verifica', right: 'Corretto', retry: 'Non ancora: ricontrolla il calcolo o apri la soluzione', almost: 'Non proprio', number: 'Inserisci un numero, ad es. 0.75 o 3/4.' },
    de: { head: 'Prüfungsfrage', open: 'offen', numeric: 'numerisch', mcq: 'Multiple Choice', points: 'P.',
      answer: 'Deine Antwort', check: 'Prüfen', right: 'Richtig', retry: 'Noch nicht: prüfe die Rechnung oder öffne die Musterlösung', almost: 'Nicht ganz', number: 'Gib eine Zahl ein, z. B. 0.75 oder 3/4.' },
    fr: { head: 'Question d’examen', open: 'ouverte', numeric: 'numérique', mcq: 'choix multiple', points: 'pt',
      answer: 'Ta réponse', check: 'Vérifier', right: 'Correct', retry: 'Pas encore : revois le calcul ou ouvre la réponse modèle', almost: 'Pas tout à fait', number: 'Saisis un nombre, par ex. 0.75 ou 3/4.' },
    es: { head: 'Pregunta de examen', open: 'abierta', numeric: 'numérica', mcq: 'opción múltiple', points: 'pt',
      answer: 'Tu respuesta', check: 'Comprobar', right: 'Correcto', retry: 'Todavía no: revisa el cálculo o abre la respuesta modelo', almost: 'No del todo', number: 'Introduce un número, p. ej. 0.75 o 3/4.' },
    ru: { head: 'Экзаменационный вопрос', open: 'развёрнутый ответ', numeric: 'число', mcq: 'выбор вариантов', points: 'б.',
      answer: 'Твой ответ', check: 'Проверить', right: 'Верно', retry: 'Пока нет: проверь вычисления или открой модельный ответ', almost: 'Не совсем', number: 'Введи число, например 0.75 или 3/4.' }
  };
  function examUi() {
    var want = String(CFG.examLang || root.getAttribute('lang') || 'en').toLowerCase();
    var known = EXAM_UI[want] || EXAM_UI[want.split('-')[0]], base = known || EXAM_UI.en, out = {}, all = true, k;
    for (k in base) { if (CFG.examStrings[k] != null) out[k] = String(CFG.examStrings[k]); else { out[k] = base[k]; all = false; } }
    out.lang = known || all ? want : 'en';        // the lang attribute of the controls: what their texts are really written in
    return out;
  }
  /* The caption of a .redpen callout is generated content in course.css; its two texts come from the syllabus:
     "<redpenLabel>" and "<redpenLabel> · <sourceLabel, first letter lower-cased> N" (N = data-page). */
  (function () {
    function cssStr(s) { return '"' + String(s).replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]+/g, ' ') + '"'; }
    var src = CFG.sourceLabel.charAt(0).toLowerCase() + CFG.sourceLabel.slice(1);
    try {
      root.style.setProperty('--redpen-label', cssStr(CFG.redpenLabel));
      root.style.setProperty('--redpen-page-label', cssStr(CFG.redpenLabel + ' · ' + src + ' '));
      /* the head line of an exam block ("Exam question · numeric", "3 pt") in the language of the exam */
      var U = examUi();
      root.style.setProperty('--exam-head', cssStr(U.head));
      ['open', 'numeric', 'mcq'].forEach(function (k) { root.style.setProperty('--exam-head-' + k, cssStr(U.head + ' · ' + U[k])); });
      root.style.setProperty('--exam-points', cssStr(' ' + U.points));
    } catch (e) { /* the defaults of course.css stay */ }
  })();

  /* ------------------------------------------------------------------------
     0. Parameters, error reporting, storage
     ------------------------------------------------------------------------ */
  var params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = { get: function () { return null; } }; }
  var SELFTEST = params.get('selftest') === '1';
  var stCtx = '';              // id of the widget the self-test is exercising right now
  /* One key per course: two courses opened from file:// share one origin and both have lessons l01, l02, …
     — without the course id in the key the progress of one would show up in the other. */
  var STORE_KEY = CFG.id + '.v1';

  function baseName(u) { return String(u || '').split(/[?#]/)[0].split('/').pop(); }
  function whereOf(err) {
    var st = err && err.stack ? String(err.stack).split('\n') : [];
    for (var i = 1; i < st.length; i++) {
      var m = /([^\/\\()\s]+\.(?:html|js))[^:]*:(\d+):\d+\)?\s*$/.exec(st[i]);
      if (m && m[1] !== 'course.js') return ' [' + m[1] + ':' + m[2] + ']';
    }
    return '';
  }
  /** One place for every error line. In self-test mode the line starts with "SELFTEST FAIL: <context>:". */
  var stCounts = { fail: 0, warn: 0 };          // what the self-test found; printed in its last line
  function report(context, err) {
    var msg = err && err.message ? err.message : String(err);
    if (SELFTEST) stCounts.fail++;
    console.error((SELFTEST ? 'SELFTEST FAIL: ' : 'Course Error: ') + context + ': ' + msg + whereOf(err));
  }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) {
      var url = String(t.src || t.href);
      console.error('Course Error: failed to load resource ' + url);
      if (/mathjax/i.test(url) && mathReadyResolve) mathReadyResolve(false);   // formulas stay as readable TeX; nothing waits forever
      return;
    }
    if (/ResizeObserver loop/.test(String(e.message || ''))) return;            // a benign browser notice, not a page error
    report(stCtx || 'uncaught', { message: (e.message || 'error') + ' (' + baseName(e.filename) + ':' + e.lineno + ')' });
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    report(stCtx || 'unhandled rejection', e.reason || 'promise rejected');
  });

  /* One JSON blob in localStorage. Every read and every write goes to localStorage afresh, so a page restored
     from the back/forward cache, or a second tab, can never write a stale copy over newer progress. */
  var store = {
    mem: null, volatile: false,
    load: function () {
      if ((SELFTEST || this.volatile) && this.mem) return this.mem;   // a test run, or a browser without storage: keep an in-memory copy
      var raw = null, d = null;
      try { raw = window.localStorage.getItem(STORE_KEY); } catch (e) { this.volatile = true; }
      try { d = JSON.parse(raw || '{}'); } catch (e) { d = null; }
      this.mem = d && typeof d === 'object' && !Array.isArray(d) ? d : (this.volatile && this.mem ? this.mem : {});
      return this.mem;
    },
    get: function (key, fallback) { var d = this.load(); return Object.prototype.hasOwnProperty.call(d, key) ? d[key] : fallback; },
    set: function (key, value) {
      var d = this.load();
      if (value === undefined) delete d[key]; else d[key] = value;
      if (SELFTEST) return;                       // a test run never leaves traces
      try { window.localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) { this.volatile = true; /* private mode, quota: kept for this page view only */ }
    }
  };
  /** Small storage for a page that wants to remember something. Never required for the page to work.
      The keys are private to the page: they are filed under the page id (data-lesson), so two lessons whose authors
      both wrote Course.store.set('state', …) do not share a slot. */
  function pageKey(key) {
    var m = doc.querySelector('main[data-lesson]');
    return 'x:' + ((m && m.getAttribute('data-lesson')) || baseName(window.location.pathname) || 'page') + ':' + key;
  }
  Course.store = {
    get: function (key, fallback) { return store.get(pageKey(key), fallback); },
    set: function (key, value) { store.set(pageKey(key), value); }
  };

  /* ------------------------------------------------------------------------
     1. Theme (runs immediately, before first paint)
     ------------------------------------------------------------------------ */
  var hostTheme = root.getAttribute('data-theme');          // an embedding host may have stamped one
  var forcedTheme = params.get('theme');
  if (forcedTheme !== 'light' && forcedTheme !== 'dark') forcedTheme = null;
  var themePref = forcedTheme || store.get('theme', 'auto');
  if (themePref !== 'light' && themePref !== 'dark') themePref = 'auto';
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  if (hostTheme !== 'light' && hostTheme !== 'dark') hostTheme = null;
  var ownTheme = hostTheme;                                  // the last value course.js itself wrote (null = attribute removed)
  function writeTheme(v) {
    ownTheme = v || null;
    if (v) root.setAttribute('data-theme', v); else root.removeAttribute('data-theme');
  }
  function applyTheme(pref) { writeTheme(pref === 'light' || pref === 'dark' ? pref : hostTheme); }
  applyTheme(themePref);

  /** Effective theme: 'light' or 'dark'. */
  Course.theme = function () {
    var a = root.getAttribute('data-theme');
    if (a === 'light' || a === 'dark') return a;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  };
  var COLOR_VARS = {
    ink: '--ink', soft: '--ink-2', muted: '--ink-3', paper: '--paper', paper2: '--paper-2', stage: '--stage',
    grid: '--grid', grid2: '--grid-2', line: '--line', line2: '--line-2', link: '--link', focus: '--focus',
    s1: '--s1', s2: '--s2', s3: '--s3', s4: '--s4', s5: '--s5', s6: '--s6',
    good: '--good', bad: '--bad', key: '--key', keyline: '--key-line'
  };
  var COLOR_HELP = 'ink, soft, muted, s1..s6, good, bad, key, keyline, grid, grid2, line, line2, paper, paper2, stage';
  var warned = {};
  /* an unknown colour name is an author mistake: a failure under the self-test, a warning otherwise */
  function badColour(name, where) {
    var k = where + ':' + name;
    if (warned[k]) return;
    warned[k] = 1;
    var msg = 'unknown colour name "' + name + '" in ' + where + ' (use ' + COLOR_HELP + ')';
    if (SELFTEST) { stCounts.fail++; console.error('SELFTEST FAIL: ' + (stCtx || 'colour') + ': ' + msg); } else console.warn('Course: ' + msg);
  }
  var colorCache = null, fontCache = null;
  /** Resolved colour tokens of the current theme, by semantic name. Refreshed on theme change. */
  Course.colors = function () {
    if (!colorCache) {
      var cs = window.getComputedStyle(root); colorCache = {};
      for (var k in COLOR_VARS) colorCache[k] = cs.getPropertyValue(COLOR_VARS[k]).trim() || '#808080';
    }
    return colorCache;
  };
  function fonts() {
    if (!fontCache) {
      var cs = window.getComputedStyle(root);
      fontCache = {
        ui: cs.getPropertyValue('--f-display').trim() || 'sans-serif',
        body: cs.getPropertyValue('--f-body').trim() || 'serif',
        hand: cs.getPropertyValue('--f-hand').trim() || 'cursive',
        mono: cs.getPropertyValue('--f-mono').trim() || 'monospace'
      };
    }
    return fontCache;
  }
  var themeFns = [], lastTheme = null;
  /** Call fn(theme, colors) whenever the effective theme changes. Returns an "off" function. */
  Course.onTheme = function (fn) {
    themeFns.push(fn);
    return function () { var i = themeFns.indexOf(fn); if (i >= 0) themeFns.splice(i, 1); };
  };
  function themeChanged() {
    colorCache = null;
    syncThemeToggle();
    var t = Course.theme();
    if (t === lastTheme) return;
    lastTheme = t;
    themeFns.slice().forEach(function (fn) { try { fn(t, Course.colors()); } catch (e) { report('onTheme', e); } });
  }
  /* data-theme changed. If the value is not the one course.js wrote, an embedding host did it:
     follow the host and show the course toggle as "auto", so the two can never disagree. */
  function themeAttrChanged() {
    var a = root.getAttribute('data-theme');
    if (a !== 'light' && a !== 'dark') a = null;
    if (a !== ownTheme) { hostTheme = a; ownTheme = a; themePref = 'auto'; }
    themeChanged();
  }
  lastTheme = Course.theme();
  try { new MutationObserver(themeAttrChanged).observe(root, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { /* very old browser */ }
  if (darkQuery) {
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', themeChanged);
    else if (darkQuery.addListener) darkQuery.addListener(themeChanged);
  }
  function setThemePref(pref) {
    themePref = pref;
    if (!forcedTheme || pref !== forcedTheme) store.set('theme', pref);
    applyTheme(pref);
    themeChanged();
  }
  function syncThemeToggle() {
    var bs = doc.querySelectorAll('.tb-theme button');
    for (var i = 0; i < bs.length; i++) {
      var on = bs[i].getAttribute('data-theme-set') === themePref;
      bs[i].setAttribute('aria-checked', on ? 'true' : 'false');
      bs[i].tabIndex = on ? 0 : -1;               // one tab stop for the group; arrows move inside it
    }
  }

  /* ------------------------------------------------------------------------
     2. MathJax configuration (must exist before the MathJax script runs)
     ------------------------------------------------------------------------ */
  var mathReadyResolve, mathIsReady = false;
  var mathReady = new Promise(function (res) { mathReadyResolve = res; });
  var mathQueue = mathReady;
  window.MathJax = {
    tex: {
      inlineMath: [['\\(', '\\)']],
      displayMath: [['\\[', '\\]']],
      processEscapes: false,
      macros: {
        R: '\\mathbb{R}',
        E: '\\mathbb{E}',
        T: '^{\\mathsf{T}}',
        vb: ['#1', 1],                            // vectors are set plain (w^T x, E(w)); a course that wants bold sets course.macros.vb
        argmin: '\\operatorname*{arg\\,min}',
        argmax: '\\operatorname*{arg\\,max}',
        sign: '\\operatorname{sign}',
        pd: ['\\frac{\\partial #1}{\\partial #2}', 2],
        norm: ['\\lVert #1 \\rVert', 1],          // no \left…\right: that adds inner-atom space around the bars in running text
        abs: ['\\lvert #1 \\rvert', 1]
      }
    },
    svg: { fontCache: 'global', mtextInheritFont: false },  // SMBUD: \text{} in the TeX font; with the page font MathJax measured the words before the web font loaded and they overlapped their brackets
    options: {
      enableMenu: false,
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'annotation', 'annotation-xml'],
      ignoreHtmlClass: 'no-math'
    },
    startup: {
      ready: function () {
        window.MathJax.startup.defaultReady();
        window.MathJax.startup.promise.then(function () { mathIsReady = true; afterMath(doc.body); mathReadyResolve(true); },
          function (e) { report('MathJax', e); mathIsReady = true; mathReadyResolve(false); });
      }
    }
  };
  /* course-specific macros (course.macros in the syllabus) are added to, or replace, the ones above */
  (function () { var m = window.MathJax.tex.macros, k; for (k in CFG.macros) if (Object.prototype.hasOwnProperty.call(CFG.macros, k)) m[k] = CFG.macros[k]; })();
  /**
   * Typeset TeX that was inserted after page load. Course.typeset(el) -> Promise.
   * Safe to call at any time; does nothing harmful if MathJax never loads (raw TeX stays readable).
   */
  Course.typeset = function (elm) {
    mathQueue = mathQueue.then(function () {
      var MJ = window.MathJax;
      if (!MJ || !MJ.typesetPromise) return;
      var list = elm ? [elm] : undefined;
      try { if (list && MJ.typesetClear) MJ.typesetClear(list); } catch (e) { /* nothing to clear */ }
      return MJ.typesetPromise(list);
    }).then(function () { afterMath(elm || doc.body); }, function (e) { report('MathJax typeset', e); });
    return mathQueue;
  };
  setTimeout(function () { mathReadyResolve(false); }, 10000);      // MathJax blocked or very slow: stop waiting, TeX stays readable
  function hasRawTex(node) { var t = node.textContent || ''; return t.indexOf('\\(') >= 0 || t.indexOf('\\[') >= 0; }

  /* ---- typography passes -------------------------------------------------- */
  var NBSP = ' ';
  /** " —" -> NBSP + "—": a line never starts with a dash. Raw TeX inside the text is left alone. */
  function glueDashes(scope) {
    if (!scope) return;
    var walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null), tn, list = [];
    while ((tn = walker.nextNode())) if (tn.nodeValue.indexOf(' —') >= 0 || tn.nodeValue.indexOf(' – ') >= 0) list.push(tn);
    list.forEach(function (n) {
      var p = n.parentNode;
      if (!p || (p.closest && p.closest('script, style, code, pre, textarea, svg, .no-math, mjx-container'))) return;
      var parts = n.nodeValue.split(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/);
      for (var i = 0; i < parts.length; i += 2) parts[i] = parts[i].replace(/ (—)/g, NBSP + '$1').replace(/ (– )/g, NBSP + '$1');
      var out = parts.join('');
      if (out !== n.nodeValue) n.nodeValue = out;
    });
  }
  /** Short tokens that must not break across lines go into span.nw: a page reference "p. 171" / "pp. 1163–1192" (a line never
      ends with a bare "p.") and a hyphenated acronym such as "TF-IDF". Raw TeX inside the text is left alone. */
  var GLUE_RE = /\b(?:pp?\.[  ]\d+(?:[–—-]\d+)?|[A-Z]{2,}-[A-Z]{2,}\b)/g;
  function glueWords(scope) {
    if (!scope) return;
    var walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null), tn, list = [];
    while ((tn = walker.nextNode())) { GLUE_RE.lastIndex = 0; if (GLUE_RE.test(tn.nodeValue)) list.push(tn); }
    list.forEach(function (n) {
      var p = n.parentNode;
      if (!p || (p.closest && p.closest('script, style, code, pre, textarea, svg, .no-math, mjx-container, .nw'))) return;
      var parts = n.nodeValue.split(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/), frag = doc.createDocumentFragment(), buf = '', changed = false;
      for (var i = 0; i < parts.length; i++) {
        if (i % 2) { buf += parts[i]; continue; }
        var s = parts[i], last = 0, m;
        GLUE_RE.lastIndex = 0;
        while ((m = GLUE_RE.exec(s))) {
          buf += s.slice(last, m.index);
          if (buf) { frag.appendChild(doc.createTextNode(buf)); buf = ''; }
          var span = doc.createElement('span');
          span.className = 'nw';
          span.textContent = m[0].replace(' ', NBSP);
          frag.appendChild(span);
          last = m.index + m[0].length;
          changed = true;
        }
        buf += s.slice(last);
      }
      if (!changed) return;
      if (buf) frag.appendChild(doc.createTextNode(buf));
      p.replaceChild(frag, n);
    });
  }
  /** Punctuation next to an inline formula must not wrap away from it: wrap "(" + formula + ".,;:?!)»" (or NBSP + dash) in .nw */
  function glueMath(scope) {
    if (!scope || !scope.querySelectorAll) return;
    var list = scope.querySelectorAll('mjx-container:not([display="true"])');
    Array.prototype.forEach.call(list, function (mj) {
      var par = mj.parentNode;
      if (!par || (par.classList && par.classList.contains('mj-glue'))) return;
      var next = mj.nextSibling, prev = mj.previousSibling, tail = '', head = '', m;
      if (next && next.nodeType === 3 && (m = /^(?:[.,;:?!)»…%]+| [—–])/.exec(next.nodeValue))) tail = m[0];
      if (prev && prev.nodeType === 3 && (m = /[(«„]+$/.exec(prev.nodeValue))) head = m[0];
      if (!tail && !head) return;
      var span = doc.createElement('span');
      span.className = 'nw mj-glue';
      par.insertBefore(span, mj);
      if (head) { prev.nodeValue = prev.nodeValue.slice(0, -head.length); span.appendChild(doc.createTextNode(head)); }
      span.appendChild(mj);
      if (tail) { next.nodeValue = next.nodeValue.slice(tail.length); span.appendChild(doc.createTextNode(tail)); }
    });
  }
  /** Blocks that scroll sideways (wide display formulas, tables, code) get a fade on the cut edge and keyboard access. */
  function markScrollers() {
    var list = doc.querySelectorAll('mjx-container[display="true"], .scroll-x, main pre, .cheat dd');
    Array.prototype.forEach.call(list, function (s) {
      var over = s.scrollWidth > s.clientWidth + 1;
      s.classList.toggle('is-scrollable', over);
      if (over) {
        if (!s.hasAttribute('tabindex')) s.tabIndex = 0;
        if (!s._fadeBound) {
          s._fadeBound = true;
          s.addEventListener('scroll', function () { s.classList.toggle('is-end', s.scrollLeft + s.clientWidth >= s.scrollWidth - 2); }, { passive: true });
        }
        s.classList.toggle('is-end', s.scrollLeft + s.clientWidth >= s.scrollWidth - 2);
      }
    });
  }
  var scrollerTimer = null;
  function markScrollersSoon() { clearTimeout(scrollerTimer); scrollerTimer = setTimeout(markScrollers, 120); }
  function afterMath(scope) {
    try { glueMath(scope); markScrollers(); } catch (e) { report('typography', e); }
  }

  /* ------------------------------------------------------------------------
     3. Small helpers (public)
     ------------------------------------------------------------------------ */
  var clamp = Course.clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  Course.lerp = function (a, b, t) { return a + (b - a) * t; };
  Course.linspace = function (a, b, n) {
    n = Math.max(2, n | 0); var out = new Array(n), d = (b - a) / (n - 1);
    for (var i = 0; i < n; i++) out[i] = a + d * i;
    return out;
  };
  Course.sigmoid = function (x) { return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x)); };
  Course.tanh = function (x) { return Math.tanh(x); };
  Course.relu = function (x) { return x > 0 ? x : 0; };
  /** Least-squares line through points [{x, y}] or [[x, y]]: -> { w, b, sse, n } for y = w·x + b. */
  Course.linfit = function (points) {
    var P = (points || []).map(function (p) { return Array.isArray(p) ? { x: +p[0], y: +p[1] } : { x: +p.x, y: +p.y }; })
      .filter(function (p) { return isFinite(p.x) && isFinite(p.y); });
    var n = P.length, mx = 0, my = 0, sxx = 0, sxy = 0, sse = 0;
    if (!n) return { w: 0, b: 0, sse: 0, n: 0 };
    P.forEach(function (p) { mx += p.x / n; my += p.y / n; });
    P.forEach(function (p) { sxx += (p.x - mx) * (p.x - mx); sxy += (p.x - mx) * (p.y - my); });
    var w = sxx > 1e-12 ? sxy / sxx : 0, b = my - w * mx;
    P.forEach(function (p) { var r = p.y - (w * p.x + b); sse += r * r; });
    return { w: w, b: b, sse: sse, n: n };
  };
  /** Format a number: fixed digits, a real minus sign, no "-0.00". */
  var fmt = Course.fmt = function (x, digits) {
    if (digits == null) digits = 2;
    if (typeof x !== 'number' || isNaN(x)) return '—';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    var s = x.toFixed(digits);
    if (parseFloat(s) === 0) s = (0).toFixed(digits);
    return s.replace('-', '−');
  };
  /** Seeded random generator (mulberry32): the same seed gives the same data on every load. */
  Course.rng = function (seed) {
    var a = (seed == null ? 1 : seed) >>> 0;
    function next() {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var api = {
      random: next,
      uniform: function (lo, hi) { if (lo == null) lo = 0; if (hi == null) hi = 1; return lo + (hi - lo) * next(); },
      normal: function (mu, sigma) {
        var u = 0, v = 0;
        while (u === 0) u = next();
        v = next();
        return (mu || 0) + (sigma == null ? 1 : sigma) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      },
      int: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      shuffle: function (arr) {
        var out = arr.slice();
        for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)); var t = out[i]; out[i] = out[j]; out[j] = t; }
        return out;
      }
    };
    return api;
  };

  var SVGNS = 'http://www.w3.org/2000/svg';
  function setAttrs(node, attrs) {
    for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
  }
  function addKids(node, kids) {
    if (kids == null) return;
    if (!Array.isArray(kids)) kids = [kids];
    kids.forEach(function (c) { if (c == null || c === false) return; node.appendChild(typeof c === 'object' ? c : doc.createTextNode(String(c))); });
  }
  /** Course.el('div', {class:'x', text:'…', onclick: fn}, [children]) -> HTMLElement */
  var el = Course.el = function (tag, attrs, kids) { var n = doc.createElement(tag); if (attrs) setAttrs(n, attrs); addKids(n, kids); return n; };
  /** Course.svg('circle', {cx:10, cy:10, r:4, class:'fi-s1'}, parent) -> SVGElement (appended to parent if given) */
  var svg = Course.svg = function (tag, attrs, parent) { var n = doc.createElementNS(SVGNS, tag); if (attrs) setAttrs(n, attrs); if (parent) parent.appendChild(n); return n; };
  function icon(name, cls) {
    var s = svg('svg', { 'class': 'ico' + (cls ? ' ' + cls : ''), viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
    svg('use', { href: '#i-' + name }, s);
    return s;
  }
  Course.icon = icon;

  /* "x_1", "w_10", "w_{ij}", "x^2" -> runs with sub/superscripts (used on canvas and in SVG labels).
     After _ or ^ the index is: a {group}, or a whole run of digits, or one character. */
  function richRuns(str) {
    str = String(str == null ? '' : str);
    var runs = [], buf = '', i = 0;
    function push(t, m) { if (t !== '') runs.push({ t: t, m: m }); }
    function digit(c) { return c >= '0' && c <= '9'; }
    while (i < str.length) {
      var ch = str[i];
      if (ch === '\\' && i + 1 < str.length) { buf += str[i + 1]; i += 2; continue; }
      if ((ch === '_' || ch === '^') && i + 1 < str.length) {
        push(buf, 0); buf = '';
        var mode = ch === '_' ? -1 : 1, t;
        if (str[i + 1] === '{') { var j = str.indexOf('}', i + 2); if (j < 0) j = str.length; t = str.slice(i + 2, j); i = j + 1; }
        else if (digit(str[i + 1])) { var e = i + 1; while (e < str.length && digit(str[e])) e++; t = str.slice(i + 1, e); i = e; }
        else { t = str[i + 1]; i += 2; }
        push(t, mode);
      } else { buf += ch; i++; }
    }
    push(buf, 0);
    return runs;
  }
  function setRich(textNode, str) {
    while (textNode.firstChild) textNode.removeChild(textNode.firstChild);
    var runs = richRuns(str), prev = 0;
    runs.forEach(function (r) {
      var a = {}, dy = 0;
      if (prev === -1) dy -= 0.25; if (prev === 1) dy += 0.4;      // undo the previous shift (in base em)
      if (r.m === -1) { a['font-size'] = '0.72em'; dy = dy / 0.72 + 0.35; }
      else if (r.m === 1) { a['font-size'] = '0.72em'; dy = dy / 0.72 - 0.55; }
      if (dy) a.dy = dy.toFixed(3) + 'em';
      var ts = svg('tspan', a, textNode); ts.textContent = r.t;
      prev = r.m;
    });
  }

  /* ------------------------------------------------------------------------
     4. Icon sprite + SVG arrow markers (injected once)
     ------------------------------------------------------------------------ */
  var ICONS = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    moon: '<path d="M20 14.2A8.3 8.3 0 0 1 9.8 4 8.3 8.3 0 1 0 20 14.2z"/>',
    auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    book: '<path d="M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10.5"/>',
    slides: '<rect x="3.5" y="5" width="17" height="11" rx="1.5"/><path d="M12 16v3.5M8.5 19.5h7"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    next: '<path d="M9 6l6 6-6 6"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    pause: '<path d="M8 5.5v13M16 5.5v13"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
    video: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M10.5 9.5v5l4.5-2.5z"/>',
    interactive: '<path d="M4 7h10M18 7h2M4 12h3M11 12h9M4 17h12"/><circle cx="16" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="18" cy="17" r="2"/>',
    reading: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6"/>',
    paper: '<path d="M6 4.5h12v15H6z"/><path d="M9 9h6M9 12h6M9 15h3.5"/>',
    bookopen: '<path d="M4.5 5.5c2.5-1 5-1 7.5.5v13c-2.5-1.5-5-1.5-7.5-.5z"/><path d="M19.5 5.5c-2.5-1-5-1-7.5.5v13c2.5-1.5 5-1.5 7.5-.5z"/>',
    ext: '<path d="M10 5.5H5.5V18.5H18.5V14"/><path d="M13.5 5h5.5v5.5M19 5l-8 8"/>',
    notebook: '<rect x="5.5" y="3.5" width="13" height="17" rx="1.5"/><path d="M9.5 3.5v17M5.5 8H4M5.5 12H4M5.5 16H4"/>',
    cap: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4c1.5 1.5 3.4 2.2 5.5 2.2s4-.7 5.5-2.2v-4M21.5 9.5v5"/>',
    glossary: '<path d="M4 6.5h9M4 11h6M4 15.5h8"/><path d="M14.5 18.5l3-8 3 8M15.6 16h3.8"/>',
    pen: '<path d="M4.5 19.5l1-4L16.5 4.5l3 3L8.5 18.5z"/><path d="M14.5 6.5l3 3"/>',
    list: '<path d="M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01"/>'
  };
  var ARROW_COLORS = ['ink', 'muted', 's1', 's2', 's3', 's4', 's5', 's6', 'good', 'bad', 'key'];
  function injectSprite() {
    if (doc.getElementById('course-sprite')) return;
    var h = '<defs>';
    for (var k in ICONS) h += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>';
    ARROW_COLORS.forEach(function (c) {
      /* #arr-key is a thin mark, so it wears the line version of the highlighter colour */
      h += '<marker id="arr' + (c === 'ink' ? '' : '-' + c) + '" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
        '<path d="M1 1.4L9 5L1 8.6z" class="fi-' + (c === 'key' ? 'keyline' : c) + '"/></marker>';
    });
    h += '</defs>';
    var s = svg('svg', { id: 'course-sprite', 'aria-hidden': 'true', focusable: 'false', width: 0, height: 0, style: 'position:absolute;width:0;height:0;overflow:hidden' });
    s.innerHTML = h;
    doc.body.insertBefore(s, doc.body.firstChild);
  }

  /* ------------------------------------------------------------------------
     5. Syllabus + progress
     ------------------------------------------------------------------------ */
  var SYL = null;
  function syllabus() {
    if (SYL) return SYL;
    var S = window.SYLLABUS || {};
    /* lessons: every lesson of the map; live: the ones that exist (`ready: false` marks a page that is not written yet:
       it is listed as "coming soon" without a link, skipped by prev / next and left out of the progress total) */
    var out = { course: CFG, modules: [], lessons: [], live: [], extras: [], byId: {} };
    (S.modules || []).forEach(function (m, mi) {
      var mod = { id: m.id, title: m.title || '', source: m.source || '', index: mi + 1, lessons: [] };
      (m.lessons || []).forEach(function (l) {
        var parsed = /^l0*(\d+)$/.exec(l.id || '');
        var L = { id: l.id, file: l.file || (l.id + '.html'), title: l.title || l.id, teaser: l.teaser || '', minutes: l.minutes, pages: l.pages, slides: l.slides,
          num: l.num != null ? String(l.num) : parsed ? parsed[1] : String(out.lessons.length + 1), module: mod, index: out.lessons.length, kind: 'lesson', ready: l.ready !== false };
        mod.lessons.push(L); out.lessons.push(L); out.byId[L.id] = L;
        if (L.ready) out.live.push(L);
      });
      out.modules.push(mod);
    });
    (S.extras || []).forEach(function (x) {
      var X = { id: x.id, file: x.file || (x.id + '.html'), title: x.title || x.id, teaser: x.teaser || '', kind: 'extra', ready: x.ready !== false };
      out.extras.push(X);
      if (!out.byId[X.id]) out.byId[X.id] = X;
    });
    SYL = out;
    return out;
  }
  /* the nearest existing lesson before (dir = -1) or after (dir = +1) lesson L */
  function neighbour(L, dir) {
    var all = syllabus().lessons;
    for (var i = L.index + dir; i >= 0 && i < all.length; i += dir) if (all[i].ready) return all[i];
    return null;
  }
  function doneMap() { var d = store.get('done', {}); return d && typeof d === 'object' ? d : {}; }
  function isDone(id) { return !!doneMap()[id]; }
  function setDone(id, on) { var d = doneMap(); if (on) d[id] = 1; else delete d[id]; store.set('done', d); }
  function doneCount() { var S = syllabus(), d = doneMap(), n = 0; S.live.forEach(function (l) { if (d[l.id]) n++; }); return n; }
  function plural(n, one, few, many) {
    return Math.abs(n) === 1 ? one : many;           /* English: one form for 1, the plural for everything else (few is unused) */
  }
  function minutesText(m) {
    if (m == null) return '';
    m = Math.round(m);
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return h + ' h' + (r ? ' ' + r + ' min' : '');
  }

  /* ------------------------------------------------------------------------
     6. Chrome: top bar, sidebar / drawer, in-page contents, lesson end, footer
     ------------------------------------------------------------------------ */
  var chrome = { main: null, lesson: null, isHub: false, id: null, file: '', draft: false, sample: false, problem: '' };
  var SAMPLE_ID = 'ks';                       // kitchen-sink.html, the reference lesson: allowed outside the syllabus

  function buildChrome() {
    var main = doc.querySelector('main');
    if (!main) return;
    var S = syllabus();
    chrome.main = main;
    chrome.isHub = main.classList.contains('hub');
    chrome.id = main.getAttribute('data-lesson') || null;
    chrome.lesson = chrome.id ? S.byId[chrome.id] || null : null;
    chrome.file = baseName(window.location.pathname);
    chrome.draft = chrome.file.charAt(0) === '_';              // "_name.html" = a scratch page that is not part of the course
    chrome.sample = chrome.id === SAMPLE_ID;
    if (!main.id) main.id = 'content';
    doc.body.classList.add(chrome.isHub ? 'page-hub' : 'page-lesson');
    /* the lesson id is the contract with the syllabus: a missing or unknown one is reported, never silently accepted */
    if (!chrome.isHub && !chrome.lesson && !chrome.sample && !chrome.draft) {
      chrome.problem = chrome.id
        ? 'data-lesson="' + chrome.id + '" is not in assets/syllabus.js: the page gets no lesson number, no prev / next links, and its progress is not counted. Use the id from the syllabus (for example "l07" for l07.html)'
        : '<main class="lesson"> has no data-lesson attribute: the page is not linked to assets/syllabus.js';
      report('page', chrome.problem);
    }

    var skip = el('a', { 'class': 'skip', href: '#' + main.id, text: 'Skip to content' });

    /* top bar */
    var L = chrome.lesson, pos = '';
    if (L && L.kind === 'lesson') pos = 'Module ' + L.module.index + ' · lesson ' + L.num;
    else if (L && L.kind === 'extra') pos = 'Extras';
    else if (chrome.sample) pos = 'Sample lesson';
    else if (chrome.draft && !chrome.isHub) pos = 'Draft';
    else if (!chrome.isHub) { var h1 = main.querySelector('h1'); pos = h1 ? h1.textContent.replace(/[ \t\r\n]+/g, ' ').trim() : ''; }
    var bar = el('header', { 'class': 'topbar' });
    if (!chrome.isHub) {
      bar.appendChild(el('button', { 'class': 'tb-btn tb-menu', type: 'button', id: 'tb-menu', 'aria-controls': 'course-nav', 'aria-expanded': 'false', 'aria-label': 'Lesson list', onclick: function () { toggleNav(); } }, icon('menu')));
    }
    bar.appendChild(el('a', { 'class': 'tb-brand', href: 'index.html', title: 'Back to the course map' }, [icon('notebook'), el('span', { text: S.course.title })]));
    if (pos) bar.appendChild(el('span', { 'class': 'tb-pos', text: pos }));
    bar.appendChild(el('span', { 'class': 'tb-space' }));
    if (S.live.length) {
      bar.appendChild(el('a', { 'class': 'tb-progress', href: 'index.html', id: 'tb-progress' }, [
        el('span', { 'class': 'tb-progress-bar', 'aria-hidden': 'true' }, el('span')),
        el('span', { 'class': 'tb-progress-num' })
      ]));
    }
    var tg = el('div', { 'class': 'tb-theme', role: 'radiogroup', 'aria-label': 'Colour theme' });
    var themeOpts = [['auto', 'auto', 'Follow the system'], ['light', 'sun', 'Notebook: light theme'], ['dark', 'moon', 'Blackboard: dark theme']];
    themeOpts.forEach(function (t) {
      tg.appendChild(el('button', { type: 'button', role: 'radio', id: 'tb-theme-' + t[0], 'data-theme-set': t[0], 'aria-checked': 'false', 'aria-label': t[2], title: t[2], onclick: function () { setThemePref(t[0]); } }, icon(t[1])));
    });
    tg.addEventListener('keydown', function (e) {       // a radiogroup: arrows move and select
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var cur = 0; themeOpts.forEach(function (t, k) { if (t[0] === themePref) cur = k; });
      var nx = themeOpts[(cur + d + themeOpts.length) % themeOpts.length][0];
      setThemePref(nx);
      var b = doc.getElementById('tb-theme-' + nx); if (b) b.focus();
    });
    bar.appendChild(tg);

    /* shell */
    var shell = el('div', { 'class': 'shell' });
    var page = el('div', { 'class': 'page' });
    main.parentNode.insertBefore(shell, main);
    if (!chrome.isHub) {
      shell.appendChild(buildSidebar(S));
      shell.appendChild(el('button', { 'class': 'scrim', type: 'button', hidden: true, 'aria-label': 'Close the lesson list', tabindex: '-1', onclick: function () { toggleNav(false); } }));
    }
    shell.appendChild(page);
    page.appendChild(main);
    shell.parentNode.insertBefore(bar, shell);
    bar.parentNode.insertBefore(skip, bar);

    if (!chrome.isHub) buildLessonEnd(S, page);
    page.appendChild(el('footer', { 'class': 'site-foot' }, [
      /* the sentence after the title is course.footer (plain text), else course.subtitle, else nothing */
      el('p', { html: '<b>' + escapeHtml(S.course.title) + '</b>' + (S.course.footer || S.course.subtitle ? ' — ' + escapeHtml(S.course.footer || S.course.subtitle) : '') }),
      el('p', { html: 'Progress and answers are stored only in this browser. <a href="index.html">Course map</a>' })
    ]));

    syncThemeToggle();
    refreshProgress();
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && doc.body.classList.contains('nav-open')) toggleNav(false); });
    /* the drawer is a phone / tablet thing: when the window grows into the desktop layout, close it (it holds the page inert) */
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 68.75em)'), onWide = function () { if (wide.matches && doc.body.classList.contains('nav-open')) toggleNav(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
    }
    /* progress written elsewhere (another tab, or this page restored from the back/forward cache): show it */
    window.addEventListener('pageshow', function (e) { if (e.persisted) resync(); });
    window.addEventListener('storage', function (e) { if (!e.key || e.key === STORE_KEY) resync(); });
  }
  var syncDone = null;
  function resync() {
    if (!forcedTheme) {
      var t = store.get('theme', 'auto');
      if (t !== 'light' && t !== 'dark') t = 'auto';
      if (t !== themePref) { themePref = t; applyTheme(t); themeChanged(); }
    }
    refreshProgress();
    if (syncDone) syncDone();
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function buildSidebar(S) {
    var nav = el('nav', { 'class': 'sidebar', id: 'course-nav', 'aria-label': 'Course lessons' });
    var inner = el('div', { 'class': 'sb-inner' });
    inner.appendChild(el('div', { 'class': 'sb-top' }, [
      el('a', { 'class': 'sb-home', href: 'index.html' }, [icon('list'), 'Course map']),
      el('button', { 'class': 'tb-btn sb-close', type: 'button', 'aria-label': 'Close the lesson list', onclick: function () { toggleNav(false); } }, icon('close'))
    ]));
    /* a page that is not written yet (`ready: false`) is listed as plain text with a "coming soon" tag — never a dead link */
    function entry(item, n, tick) {
      var here = item.id === chrome.id, kids = [el('span', { 'class': 'sb-n', text: n }), el('span', { 'class': 'sb-t', text: item.title })];
      if (!item.ready && !here) { kids.push(el('span', { 'class': 'sb-soon', text: 'coming soon' })); return el('span', { 'class': 'sb-link is-soon' }, kids); }
      kids.push(tick ? icon('check', 'sb-tick') : el('span'));
      var a = el('a', { 'class': 'sb-link', href: item.file }, kids);
      if (tick) a.setAttribute('data-lesson-link', item.id);
      if (here) a.setAttribute('aria-current', 'page');
      return a;
    }
    S.modules.forEach(function (m) {
      var box = el('div', { 'class': 'sb-mod' });
      box.appendChild(el('p', { 'class': 'sb-mod-title' }, [el('span', { 'class': 'sb-mod-n', text: 'Module ' + m.index }), m.title]));
      var ol = el('ol', { 'class': 'sb-list' });
      m.lessons.forEach(function (l) { ol.appendChild(el('li', null, entry(l, l.num, true))); });
      box.appendChild(ol);
      inner.appendChild(box);
    });
    if (S.extras.length) {
      var ex = el('div', { 'class': 'sb-mod' });
      ex.appendChild(el('p', { 'class': 'sb-mod-title' }, [el('span', { 'class': 'sb-mod-n', text: 'Extras' })]));
      var ol2 = el('ol', { 'class': 'sb-list' });
      S.extras.forEach(function (x) { ol2.appendChild(el('li', null, entry(x, '+', false))); });
      ex.appendChild(ol2);
      inner.appendChild(ex);
    }
    nav.appendChild(inner);
    return nav;
  }
  function toggleNav(open) {
    var body = doc.body, btn = doc.getElementById('tb-menu'), scrim = doc.querySelector('.scrim'), nav = doc.getElementById('course-nav');
    if (!nav) return;
    var was = body.classList.contains('nav-open');
    if (open == null) open = !was;
    body.classList.toggle('nav-open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (scrim) scrim.hidden = !open;
    /* while the drawer is open the page under the scrim is inert: focus cannot leave the drawer */
    Array.prototype.forEach.call(doc.querySelectorAll('.page, .topbar'), function (n) { if (open) n.setAttribute('inert', ''); else n.removeAttribute('inert'); });
    if (open) {
      var cur = nav.querySelector('[aria-current="page"]') || nav.querySelector('a');
      if (cur) { try { cur.focus({ preventScroll: true }); cur.scrollIntoView({ block: 'center' }); } catch (e) { /* older engines */ } }
    } else if (was && btn) { try { btn.focus({ preventScroll: true }); } catch (e) { /* hidden on desktop */ } }
  }

  function refreshProgress() {
    var S = syllabus(), total = S.live.length, n = doneCount();
    var tp = doc.getElementById('tb-progress');
    if (tp) {
      tp.querySelector('.tb-progress-bar > span').style.width = (total ? Math.round(100 * n / total) : 0) + '%';
      tp.querySelector('.tb-progress-num').textContent = n + '/' + total;
      var label = n + ' of ' + total + ' ' + plural(total, 'lesson', 'lessons', 'lessons') + ' done';
      tp.setAttribute('aria-label', label); tp.title = label;
    }
    var links = doc.querySelectorAll('[data-lesson-link]');
    for (var i = 0; i < links.length; i++) links[i].classList.toggle('is-done', isDone(links[i].getAttribute('data-lesson-link')));
    var note = doc.querySelector('.done-note');
    if (note) note.textContent = total ? n + ' of ' + total + ' done.' : '';
    if (chrome.isHub) renderHub();
  }

  function buildLessonEnd(S, page) {
    var L = chrome.lesson, id = chrome.id;
    var box = el('footer', { 'class': 'lesson-end' });
    if (id && (!L || L.kind === 'lesson')) {
      var btn = el('button', { 'class': 'btn done-btn', type: 'button', id: 'done-btn', 'aria-pressed': 'false' }, [
        el('span', { 'class': 'done-check' }, icon('check')), el('span', { 'class': 'done-text' })]);
      var sync = syncDone = function () {
        var on = isDone(id);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.querySelector('.done-text').textContent = on ? 'Lesson done' : 'Mark the lesson as done';
      };
      btn.addEventListener('click', function () { setDone(id, !isDone(id)); sync(); refreshProgress(); });
      box.appendChild(el('div', { 'class': 'done-box' }, [btn, el('span', { 'class': 'done-note', 'aria-live': 'polite' })]));
      sync();
    }
    var prev = null, next = null;
    if (L && L.kind === 'lesson') { prev = neighbour(L, -1); next = neighbour(L, 1); }
    var pager = el('nav', { 'class': 'pager', 'aria-label': 'Neighbouring lessons' });
    if (prev) pager.appendChild(el('a', { 'class': 'pager-prev', href: prev.file, rel: 'prev' }, [
      el('span', { 'class': 'pager-dir' }, [icon('arrow-left'), 'Back · lesson ' + prev.num]), el('span', { 'class': 'pager-title', text: prev.title })]));
    if (next) pager.appendChild(el('a', { 'class': 'pager-next', href: next.file, rel: 'next' }, [
      el('span', { 'class': 'pager-dir' }, ['Next · lesson ' + next.num, icon('arrow-right')]), el('span', { 'class': 'pager-title', text: next.title })]));
    if (!prev && !next) pager.appendChild(el('a', { 'class': 'pager-prev', href: 'index.html' }, [
      el('span', { 'class': 'pager-dir' }, [icon('arrow-left'), 'Back']), el('span', { 'class': 'pager-title', text: 'Back to the course map' })]));
    box.appendChild(pager);
    page.appendChild(box);
  }

  /* lesson head: number, module, meta chips from the syllabus */
  function initLessonHead() {
    var main = chrome.main; if (!main || chrome.isHub) return;
    var head = main.querySelector('.lesson-head'); if (!head) return;
    var L = chrome.lesson, h1 = head.querySelector('h1');
    if (L && L.kind === 'lesson') {
      var eb = head.querySelector('.eyebrow');
      if (!eb) { eb = el('p', { 'class': 'eyebrow' }); head.insertBefore(eb, head.firstChild); }
      eb.textContent = 'Module ' + L.module.index + ' · ' + L.module.title;
      if (!head.querySelector('.lesson-no')) head.insertBefore(el('p', { 'class': 'lesson-no', text: 'Lesson ' + L.num }), eb);
      if (h1 && !doc.title) doc.title = L.title + ' · ' + syllabus().course.title;
    } else if (L && L.kind === 'extra' && !head.querySelector('.eyebrow')) {
      head.insertBefore(el('p', { 'class': 'eyebrow', text: 'Extras' }), head.firstChild);
    }
    var meta = head.querySelector('.meta');
    if (!meta && L && L.kind === 'lesson') { meta = el('ul', { 'class': 'meta' }); head.appendChild(meta); }
    if (!meta) return;
    function has(kind) { return !!meta.querySelector('[data-meta="' + kind + '"]'); }
    var first = meta.firstChild;
    if (L && L.minutes != null && !has('time')) meta.insertBefore(el('li', { 'data-meta': 'time', text: minutesText(L.minutes) }), first);
    if (L && L.pages && !has('pages')) meta.insertBefore(el('li', { 'data-meta': 'pages', text: syllabus().course.sourceLabel + ' ' + L.pages }), first);
    if (L && L.slides && !has('slides')) meta.appendChild(el('li', { 'data-meta': 'slides', text: L.slides }));
    var icons = { time: 'clock', pages: 'book', slides: 'slides' };
    var lis = meta.querySelectorAll('li');
    for (var i = 0; i < lis.length; i++) {
      var k = lis[i].getAttribute('data-meta');
      if (icons[k] && !lis[i].querySelector('.ico')) lis[i].insertBefore(icon(icons[k]), lis[i].firstChild);
    }
  }

  /* "In this lesson": in-page list + nested list in the sidebar with scroll-spy */
  function initToc() {
    var main = chrome.main; if (!main || chrome.isHub) return;
    var heads = [], all = main.querySelectorAll('h2');
    for (var i = 0; i < all.length; i++) {
      var h = all[i];
      if (h.closest('.widget, .exam, .no-toc, .toc')) continue;
      var sec = h.parentNode && h.parentNode.tagName === 'SECTION' ? h.parentNode : h;
      if (!sec.id) sec.id = (chrome.id || 'p') + '-sec-' + (heads.length + 1);
      heads.push({ h: h, target: sec, text: h.textContent.replace(/[ \t\r\n]+/g, ' ').trim() });   // not \s: that would undo the no-break space before a dash
    }
    if (heads.length < 2) return;
    /* the list shows the same numbers as the page: only sections that the CSS counter numbers get one */
    var ol = el('ol'), num = 0;
    heads.forEach(function (x) {
      var sec = x.target, numbered = sec.tagName === 'SECTION' && sec.parentNode === main && !sec.matches('.quiz, .recap, .resources, .no-num');
      if (numbered) num++;
      ol.appendChild(el('li', null, el('a', { href: '#' + sec.id }, [el('span', { 'class': 'toc-n', text: numbered ? String(num) : '' }), el('span', { text: x.text })])));
    });
    var toc = el('nav', { 'class': 'toc', 'aria-label': 'In this lesson' }, [el('p', { 'class': 'toc-title', text: 'In this lesson' }), ol]);
    var firstSec = heads[0].target;
    if (firstSec.parentNode === main) main.insertBefore(toc, firstSec);
    else { var hd = main.querySelector('.lesson-head'); if (hd && hd.parentNode === main) main.insertBefore(toc, hd.nextSibling); else main.insertBefore(toc, main.firstChild); }

    var cur = doc.querySelector('.sidebar [aria-current="page"]');
    var sideLinks = [];
    if (cur) {
      var sol = el('ol', { 'class': 'sb-toc' });
      heads.forEach(function (x) {
        var a = el('a', { href: '#' + x.target.id, text: x.text, onclick: function () { if (doc.body.classList.contains('nav-open')) toggleNav(false); } });
        sideLinks.push(a); sol.appendChild(el('li', null, a));
      });
      cur.parentNode.appendChild(sol);
    }
    if (sideLinks.length && 'IntersectionObserver' in window) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
        var active = -1;
        for (var k = 0; k < heads.length; k++) if (visible[heads[k].target.id]) { active = k; break; }
        if (active < 0) return;
        sideLinks.forEach(function (a, k) { a.classList.toggle('is-active', k === active); });
      }, { rootMargin: '-15% 0px -70% 0px' });
      heads.forEach(function (x) { io.observe(x.target); });
    }
  }

  /* ------------------------------------------------------------------------
     7. Declarative components
     ------------------------------------------------------------------------ */
  var uid = 0;
  function autoId(node, prefix) { if (!node.id) node.id = (chrome.id || 'p') + '-' + prefix + '-' + (++uid); return node.id; }

  /* 7 derivation stepper */
  function initSteps() {
    var lists = doc.querySelectorAll('ol.steps');
    Array.prototype.forEach.call(lists, function (ol) {
      var items = Array.prototype.filter.call(ol.children, function (c) { return c.tagName === 'LI'; });
      if (items.length < 2) return;
      autoId(ol, 'steps');
      var shown = 1;
      var next = el('button', { 'class': 'btn btn--primary', type: 'button', id: ol.id + '-next' }, ['Next step', icon('next')]);
      var all = el('button', { 'class': 'btn btn--ghost', type: 'button', id: ol.id + '-all', text: 'Show all' });
      var reset = el('button', { 'class': 'btn btn--ghost', type: 'button', id: ol.id + '-reset' }, [icon('refresh'), 'Start over']);
      var count = el('span', { 'class': 'steps-count', 'aria-live': 'polite' });
      var bar = el('div', { 'class': 'steps-bar' }, [next, all, reset, count]);
      function render(fresh) {
        items.forEach(function (li, i) { li.hidden = i >= shown; li.classList.toggle('is-new', fresh && i === shown - 1); });
        next.disabled = shown >= items.length; all.disabled = shown >= items.length; reset.hidden = shown <= 1;
        count.textContent = 'step ' + shown + ' of ' + items.length;
      }
      next.addEventListener('click', function () { if (shown < items.length) { shown++; render(true); } });
      all.addEventListener('click', function () { shown = items.length; render(false); });
      reset.addEventListener('click', function () { shown = 1; render(false); ol.scrollIntoView({ block: 'nearest' }); });
      ol.parentNode.insertBefore(bar, ol.nextSibling);
      render(false);
    });
  }

  /* option lists: shared by .quiz questions and mcq exam questions */
  function buildOptions(list, multi, idBase, labelEl) {
    var lis = Array.prototype.filter.call(list.children, function (c) { return c.tagName === 'LI'; });
    list.setAttribute('role', multi ? 'group' : 'radiogroup');
    list.setAttribute('data-type', multi ? 'multi' : 'single');
    if (labelEl) { if (!labelEl.id) labelEl.id = idBase + '-text'; list.setAttribute('aria-labelledby', labelEl.id); }
    var opts = lis.map(function (li, i) {
      var fb = null, kids = Array.prototype.slice.call(li.childNodes);
      var body = el('span', { 'class': 'opt-body' });
      kids.forEach(function (n) { if (n.nodeType === 1 && n.classList.contains('fb')) fb = n; else body.appendChild(n); });
      var btn = el('button', { 'class': 'opt', type: 'button', role: multi ? 'checkbox' : 'radio', 'aria-checked': 'false', id: idBase + '-o' + (i + 1) },
        [el('span', { 'class': 'opt-mark', 'aria-hidden': 'true' }), body]);
      if (fb) { if (!fb.id) fb.id = idBase + '-fb' + (i + 1); btn.setAttribute('aria-describedby', fb.id); }   // the explanation is read with the option
      li.insertBefore(btn, li.firstChild);
      return { li: li, btn: btn, fb: fb, correct: li.hasAttribute('data-correct') };
    });
    if (!multi) {
      /* a radiogroup is one tab stop; arrows move the focus (they do not answer: choosing is Enter / Space / click) */
      opts.forEach(function (o, i) { o.btn.tabIndex = i === 0 ? 0 : -1; });
      list.addEventListener('keydown', function (e) {
        var keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }, cur = -1;
        opts.forEach(function (o, i) { if (o.btn === doc.activeElement) cur = i; });
        if (cur < 0 || opts[cur].btn.disabled) return;
        var k = e.key === 'Home' ? 0 : e.key === 'End' ? opts.length - 1 : keys[e.key] ? (cur + keys[e.key] + opts.length) % opts.length : -1;
        if (k < 0) return;
        e.preventDefault();
        opts.forEach(function (o, i) { o.btn.tabIndex = i === k ? 0 : -1; });
        opts[k].btn.focus();
      });
    }
    return opts;
  }
  /* after grading the option buttons are disabled; put the focus on the verdict so it is neither lost nor silent */
  function focusVerdict(node) {
    if (!node) return;
    node.tabIndex = -1;
    try { node.focus({ preventScroll: true }); } catch (e) { /* older engines */ }
  }
  function gradeOptions(opts, selected) {
    var ok = true;
    opts.forEach(function (o, i) {
      var sel = selected.indexOf(i) >= 0;
      o.btn.disabled = true;
      o.btn.setAttribute('aria-checked', sel ? 'true' : 'false');
      o.li.classList.toggle('is-right', sel && o.correct);
      o.li.classList.toggle('is-wrong', sel && !o.correct);
      o.li.classList.toggle('is-missed', !sel && o.correct);
      o.li.classList.toggle('is-shown', sel || o.correct);
      if (sel !== o.correct) ok = false;
    });
    return ok;
  }
  function clearOptions(opts) {
    opts.forEach(function (o, i) {
      o.btn.disabled = false; o.btn.setAttribute('aria-checked', 'false');
      if (o.btn.getAttribute('role') === 'radio') o.btn.tabIndex = i === 0 ? 0 : -1;
      o.li.classList.remove('is-right', 'is-wrong', 'is-missed', 'is-shown');
    });
  }

  /* 13 quiz */
  function initQuizzes() {
    var quizzes = doc.querySelectorAll('.quiz');
    Array.prototype.forEach.call(quizzes, function (quiz) {
      var qid = autoId(quiz, 'quiz');
      var saved = store.get('quiz', {}); saved = (saved && saved[qid]) || {};
      var qs = Array.prototype.slice.call(quiz.querySelectorAll('.q'));
      if (!qs.length) return;
      var state = qs.map(function () { return { sel: [], graded: false, ok: false }; });
      var score = el('span', { 'class': 'quiz-score', 'aria-live': 'polite' });
      var retry = el('button', { 'class': 'btn btn--ghost', type: 'button', id: qid + '-retry' }, [icon('refresh'), 'Try again']);
      var foot = el('div', { 'class': 'quiz-foot' }, [score, retry]);
      function persist() {
        var all = store.get('quiz', {}); if (!all || typeof all !== 'object') all = {};
        all[qid] = state.map(function (s) { return s.graded ? { sel: s.sel, g: 1 } : 0; });
        store.set('quiz', all);
      }
      function summary() {
        var done = state.filter(function (s) { return s.graded; }).length, ok = state.filter(function (s) { return s.graded && s.ok; }).length;
        retry.hidden = done === 0;
        foot.classList.toggle('is-perfect', done === qs.length && ok === qs.length);
        if (!done) { score.textContent = qs.length + ' ' + plural(qs.length, 'question', 'questions', 'questions') + NBSP + '— answer them to check yourself.'; return; }
        score.innerHTML = 'Correct: <b>' + ok + '</b> of <b>' + qs.length + '</b>' + (done < qs.length ? ' · ' + (qs.length - done) + ' left' : ok === qs.length ? NBSP + '— all clear.' : NBSP + '— reread the sections you got wrong and try again.');
      }
      var parts = qs.map(function (q, qi) {
        var list = q.querySelector('.options');
        if (!list) return null;
        var nCorrect = list.querySelectorAll(':scope > li[data-correct]').length;
        var multi = q.getAttribute('data-type') === 'multi' || nCorrect > 1;
        q.setAttribute('data-type', multi ? 'multi' : 'single');
        var opts = buildOptions(list, multi, qid + '-q' + (qi + 1), q.querySelector('.q-text'));
        q.insertBefore(el('p', { 'class': 'q-head', text: 'Question ' + (qi + 1) + ' of ' + qs.length + (multi ? ' · select every correct option' : '') }), q.firstChild);
        var verdict = el('span', { 'class': 'q-verdict', role: 'status' });
        var check = multi ? el('button', { 'class': 'btn btn--primary', type: 'button', id: qid + '-q' + (qi + 1) + '-check', text: 'Check', disabled: true }) : null;
        var actions = el('div', { 'class': 'q-actions' }, [check, verdict]);
        list.parentNode.insertBefore(actions, list.nextSibling);
        function grade(silent) {
          var s = state[qi], hadFocus = q.contains(doc.activeElement);
          s.graded = true; s.ok = gradeOptions(opts, s.sel);
          q.classList.add('is-graded'); q.classList.toggle('is-ok', s.ok); q.classList.toggle('is-fail', !s.ok);
          while (verdict.firstChild) verdict.removeChild(verdict.firstChild);
          verdict.appendChild(icon(s.ok ? 'check' : 'cross')); verdict.appendChild(doc.createTextNode(s.ok ? 'Correct' : 'Not quite'));
          if (check) check.hidden = true;
          if (!silent) { persist(); summary(); if (hadFocus) focusVerdict(verdict); }
        }
        opts.forEach(function (o, oi) {
          o.btn.addEventListener('click', function () {
            var s = state[qi]; if (s.graded) return;
            if (multi) {
              var k = s.sel.indexOf(oi);
              if (k >= 0) s.sel.splice(k, 1); else s.sel.push(oi);
              o.btn.setAttribute('aria-checked', k >= 0 ? 'false' : 'true');
              check.disabled = s.sel.length === 0;
            } else { s.sel = [oi]; grade(false); }
          });
        });
        if (check) check.addEventListener('click', function () { if (state[qi].sel.length) grade(false); });
        var sv = saved[qi];
        if (sv && sv.g && Array.isArray(sv.sel)) { state[qi].sel = sv.sel.filter(function (v) { return v >= 0 && v < opts.length; }); grade(true); }
        return { q: q, opts: opts, check: check, verdict: verdict };
      });
      retry.addEventListener('click', function () {
        parts.forEach(function (p, qi) {
          if (!p) return;
          state[qi] = { sel: [], graded: false, ok: false };
          clearOptions(p.opts); p.q.classList.remove('is-graded', 'is-ok', 'is-fail');
          while (p.verdict.firstChild) p.verdict.removeChild(p.verdict.firstChild);
          if (p.check) { p.check.hidden = false; p.check.disabled = true; }
        });
        persist(); summary();
        quiz.scrollIntoView({ block: 'start' });
      });
      quiz.appendChild(foot);
      summary();
    });
  }

  /** "1.5", "1,5", "−0.25", ".5", "3/2" -> number; anything else ("1.5abc", "1.5.9", "") -> null */
  function parseNumber(s) {
    s = String(s == null ? '' : s).replace(/\s+/g, '').replace(/,/g, '.').replace(/[−–—]/g, '-');
    var m = /^([-+]?(?:\d+\.?\d*|\.\d+))(?:\/([-+]?(?:\d+\.?\d*|\.\d+)))?$/.exec(s);
    if (!m) return null;
    var v = parseFloat(m[1]);
    if (m[2] != null) { var d = parseFloat(m[2]); if (!d) return null; v = v / d; }
    return isFinite(v) ? v : null;
  }

  /* 12 exam-style questions */
  function initExams() {
    var exams = doc.querySelectorAll('.exam'), UI = examUi();
    Array.prototype.forEach.call(exams, function (ex) {
      var id = autoId(ex, 'exam'), kind = ex.getAttribute('data-kind') || 'open';
      var sol = ex.querySelector('.exam-solution');
      /* the block is framed as an exam, so its own controls are in the language of the exam like the question (EXAM_UI);
         the commentary stays in the language of the lesson */
      if (kind === 'numeric') {
        var ans = parseNumber(ex.getAttribute('data-answer'));
        if (ans == null) {
          report('exam ' + id, 'data-kind="numeric" needs data-answer="<number>" (got ' + JSON.stringify(ex.getAttribute('data-answer')) + '): the answer field is not shown');
        } else {
          var tolAttr = ex.hasAttribute('data-tol') ? parseNumber(ex.getAttribute('data-tol')) : null;
          var tol = tolAttr != null ? Math.abs(tolAttr) : Math.max(1e-9, Math.abs(ans) * 0.01);
          var input = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', id: id + '-input', placeholder: '0.00' });
          var verdict = el('span', { 'class': 'exam-verdict', role: 'status' });
          var check = function () {
            var val = parseNumber(input.value);
            verdict.className = 'exam-verdict';
            while (verdict.firstChild) verdict.removeChild(verdict.firstChild);
            if (val == null) { verdict.textContent = UI.number; return; }
            var ok = Math.abs(val - ans) <= tol + 1e-12;
            verdict.classList.add(ok ? 'is-right' : 'is-wrong');
            verdict.appendChild(icon(ok ? 'check' : 'cross'));
            verdict.appendChild(doc.createTextNode(ok ? UI.right : UI.retry));
          };
          var row = el('form', { 'class': 'exam-try', lang: UI.lang }, [
            el('label', { 'for': id + '-input' }, [UI.answer + (ex.getAttribute('data-unit') ? ' (' + ex.getAttribute('data-unit') + ')' : '')]), input,
            el('button', { 'class': 'btn', type: 'submit', id: id + '-check', text: UI.check }), verdict]);
          row.addEventListener('submit', function (e) { e.preventDefault(); check(); });
          ex.insertBefore(row, sol && sol.parentNode === ex ? sol : null);
        }
      }
      if (kind === 'mcq') {
        var list = ex.querySelector('.options');
        if (list) {
          var multi = list.querySelectorAll(':scope > li[data-correct]').length > 1;
          var opts = buildOptions(list, multi, id, ex.querySelector('.exam-q')), sel = [], graded = false;
          var chk = multi ? el('button', { 'class': 'btn btn--primary', type: 'button', id: id + '-check', text: UI.check, lang: UI.lang, disabled: true }) : null;
          var mv = el('span', { 'class': 'q-verdict', role: 'status', lang: UI.lang });
          var grade = function () {
            var hadFocus = ex.contains(doc.activeElement);
            graded = true;
            var ok = gradeOptions(opts, sel);
            ex.classList.add('is-graded'); ex.classList.toggle('is-ok', ok); ex.classList.toggle('is-fail', !ok);
            if (chk) chk.hidden = true;
            mv.appendChild(icon(ok ? 'check' : 'cross')); mv.appendChild(doc.createTextNode(ok ? UI.right : UI.almost));
            if (hadFocus) focusVerdict(mv);
          };
          opts.forEach(function (o, oi) {
            o.btn.addEventListener('click', function () {
              if (graded) return;
              if (multi) { var k = sel.indexOf(oi); if (k >= 0) sel.splice(k, 1); else sel.push(oi); o.btn.setAttribute('aria-checked', k >= 0 ? 'false' : 'true'); chk.disabled = !sel.length; }
              else { sel = [oi]; grade(); }
            });
          });
          if (chk) chk.addEventListener('click', function () { if (!graded && sel.length) grade(); });
          list.parentNode.insertBefore(el('div', { 'class': 'q-actions' }, [chk, mv]), list.nextSibling);
        }
      }
    });
  }

  /* 17 tabs */
  function initTabs() {
    var sets = doc.querySelectorAll('.tabs');
    Array.prototype.forEach.call(sets, function (tabs) {
      var id = autoId(tabs, 'tabs');
      var panels = Array.prototype.filter.call(tabs.children, function (c) { return c.hasAttribute('data-tab'); });
      if (!panels.length) return;
      var list = el('div', { 'class': 'tabs-list', role: 'tablist' });
      var btns = panels.map(function (p, i) {
        p.classList.add('tab'); p.id = p.id || id + '-p' + (i + 1); p.setAttribute('role', 'tabpanel');
        var b = el('button', { type: 'button', role: 'tab', id: id + '-t' + (i + 1), 'aria-controls': p.id, text: p.getAttribute('data-tab') });
        p.setAttribute('aria-labelledby', b.id);
        b.addEventListener('click', function () { show(i); });
        b.addEventListener('keydown', function (e) {
          var k = e.key === 'ArrowRight' ? (i + 1) % panels.length : e.key === 'ArrowLeft' ? (i + panels.length - 1) % panels.length
            : e.key === 'Home' ? 0 : e.key === 'End' ? panels.length - 1 : -1;
          if (k < 0) return;
          show(k); btns[k].focus(); e.preventDefault();
        });
        list.appendChild(b);
        return b;
      });
      function show(k) {
        panels.forEach(function (p, i) { p.hidden = i !== k; btns[i].setAttribute('aria-selected', i === k ? 'true' : 'false'); btns[i].tabIndex = i === k ? 0 : -1; });
        markScrollersSoon();                 // a formula or table in the panel that just appeared may need its scroll hint
      }
      tabs.insertBefore(list, tabs.firstChild);
      show(0);
    });
  }

  /* 15 resources, external links, scrollable blocks, bridge */
  var RES_KINDS = { video: ['video', 'Video'], interactive: ['interactive', 'Interactive'], reading: ['reading', 'Article'], paper: ['paper', 'Paper'], book: ['bookopen', 'Book'] };
  function initMisc() {
    var res = doc.querySelectorAll('.res');
    Array.prototype.forEach.call(res, function (r) {
      var k = RES_KINDS[r.getAttribute('data-kind')] || RES_KINDS.reading;
      var kind = el('span', { 'class': 'res-kind' }, [icon(k[0]), k[1]]);
      if (r.getAttribute('data-when')) kind.appendChild(el('span', { 'class': 'res-when', text: r.getAttribute('data-when') }));
      r.insertBefore(kind, r.firstChild);
      var a = r.querySelector('a.res-title');
      if (a) a.appendChild(icon('ext'));
      var by = r.querySelector('.res-by'), dur = r.querySelector('.res-dur');
      if (by || dur) {
        var src = el('span', { 'class': 'res-src' });
        (by || dur).parentNode.insertBefore(src, by || dur);
        if (by) src.appendChild(by); if (dur) src.appendChild(dur);
      }
    });
    var links = doc.querySelectorAll('main a[href^="http"]');
    Array.prototype.forEach.call(links, function (a) { a.target = '_blank'; a.rel = 'noopener'; });
    var sx = doc.querySelectorAll('.scroll-x');
    Array.prototype.forEach.call(sx, function (s) { s.setAttribute('role', 'region'); if (!s.getAttribute('aria-label')) s.setAttribute('aria-label', 'Table: scrolls horizontally'); });
    var det = doc.querySelectorAll('main details');
    Array.prototype.forEach.call(det, function (d) { d.addEventListener('toggle', markScrollersSoon); });
    /* the link to the next lesson lives in the pager right below the bridge (one link, not two);
       an author-written a.bridge-link (to point somewhere else) is kept and gets its arrow */
    var bl = doc.querySelectorAll('.bridge-link');
    Array.prototype.forEach.call(bl, function (a) { if (!a.querySelector('svg')) a.appendChild(icon('arrow-right')); });
    var nets = doc.querySelectorAll('[data-net]');
    Array.prototype.forEach.call(nets, function (n) {
      try { Course.net(n, JSON.parse(n.getAttribute('data-net'))); } catch (e) { report('data-net' + (n.id ? ' #' + n.id : ''), e); }
    });
  }

  /* ------------------------------------------------------------------------
     8. Hub page
     ------------------------------------------------------------------------ */
  function renderHub() {
    var main = chrome.main, S = syllabus();
    if (!main || !S.lessons.length) return;
    var total = S.live.length, n = doneCount();
    var nextL = null;
    for (var i = 0; i < total; i++) if (!isDone(S.live[i].id)) { nextL = S.live[i]; break; }
    var left = 0; S.live.forEach(function (l) { if (!isDone(l.id)) left += l.minutes || 0; });

    var pr = main.querySelector('[data-hub="progress"]');
    if (pr && !total) {                    // a course map without a finished lesson yet: no dead "start" link
      pr.textContent = '';
      pr.appendChild(el('p', { 'class': 'hub-fallback', text: 'The lessons are still being written: they appear in the list below as soon as they are ready.' }));
    }
    if (pr && total) {
      pr.textContent = ''; pr.className = 'hub-progress';
      var cta = nextL
        ? el('a', { 'class': 'btn btn--primary', href: nextL.file, id: 'hub-continue' }, [(n ? 'Continue: lesson ' : 'Start with lesson ') + nextL.num, icon('arrow-right')])
        : el('a', { 'class': 'btn', href: S.live[0].file, id: 'hub-continue' }, ['All lessons done · review', icon('refresh')]);
      var bar = el('span'); bar.style.width = Math.round(100 * n / total) + '%';
      pr.appendChild(cta);
      pr.appendChild(el('div', { 'class': 'hub-meter' }, [
        el('div', { 'class': 'hub-meter-top' }, [el('span', { html: '<b>' + n + '</b> of <b>' + total + '</b> done' }), el('span', { text: left ? '≈ ' + minutesText(left) + ' left' : '' })]),
        el('div', { 'class': 'hub-meter-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(n), 'aria-label': 'Lessons done' }, bar)
      ]));
    }
    var mods = main.querySelector('[data-hub="modules"]');
    if (mods) {
      mods.textContent = '';
      S.modules.forEach(function (m) {
        var live = m.lessons.filter(function (l) { return l.ready; });
        var md = live.filter(function (l) { return isDone(l.id); }).length;
        var sec = el('section', { 'class': 'hub-mod', id: 'hub-' + m.id });
        sec.appendChild(el('header', { 'class': 'hub-mod-head' }, [
          el('p', { 'class': 'hub-mod-n', text: 'Module ' + m.index }),
          el('h2', { text: m.title }),
          el('p', { 'class': 'hub-mod-src' }, [m.source ? m.source + ' · ' : '', el('span', { 'class': 'hub-mod-count', text: md + '/' + live.length })])
        ]));
        var ol = el('ol', { 'class': 'hub-list' });
        m.lessons.forEach(function (l) {
          var meta = [minutesText(l.minutes), l.pages ? 'p. ' + l.pages : ''].filter(Boolean).join(' · ');
          var title = el('span', { 'class': 'lcard-title', text: l.title }), done = isDone(l.id);
          if (!l.ready) title.appendChild(el('span', { 'class': 'lcard-flag', text: 'coming soon' }));
          else if (nextL && l.id === nextL.id) title.appendChild(el('span', { 'class': 'lcard-flag', text: n ? '← you are here' : '← start here' }));
          var kids = [
            el('span', { 'class': 'lcard-n', text: l.num.length < 2 ? '0' + l.num : l.num }),
            title,
            el('span', { 'class': 'lcard-teaser', text: l.teaser }),
            el('span', { 'class': 'lcard-meta', text: meta })
          ];
          /* the tick appears only on finished lessons: an empty box in a row that is a link reads as a checkbox */
          if (l.ready && done) kids.push(el('span', { 'class': 'lcard-box', role: 'img', 'aria-label': 'done' }, icon('check')));
          var card = l.ready
            ? el('a', { 'class': 'lcard' + (done ? ' is-done' : '') + (nextL && l.id === nextL.id ? ' is-next' : ''), href: l.file }, kids)
            : el('div', { 'class': 'lcard is-soon' }, kids);
          ol.appendChild(el('li', null, card));
        });
        sec.appendChild(ol);
        mods.appendChild(sec);
      });
    }
    var ex = main.querySelector('[data-hub="extras"]');
    if (ex && S.extras.length) {
      ex.textContent = ''; ex.className = 'hub-extras';
      var xi = { formulas: 'paper', exam: 'cap', glossary: 'glossary', errata: 'pen' };
      S.extras.forEach(function (x) {
        var kids = [
          el('span', { 'class': 'xcard-title' }, [icon(xi[x.id] || 'reading'), el('span', { text: x.title }), x.ready ? null : el('span', { 'class': 'lcard-flag', text: 'coming soon' })]),
          el('span', { 'class': 'xcard-teaser', text: x.teaser || '' })];
        ex.appendChild(el('li', null, x.ready ? el('a', { 'class': 'xcard', href: x.file }, kids) : el('div', { 'class': 'xcard is-soon' }, kids)));
      });
    }
    glueDashes(main);
  }

  /* ------------------------------------------------------------------------
     9. Widget toolkit
     ------------------------------------------------------------------------ */
  var widgets = [], widgetById = {}, booted = false, allPlots = [], allNets = [];

  /**
   * Course.widget(id, init) — register an interactive widget.
   * init(root, ui) runs once the DOM is ready, inside try/catch: a broken widget never breaks the page.
   */
  Course.widget = function (id, init) {
    if (typeof id !== 'string' || typeof init !== 'function') { report('Course.widget', 'expected (id: string, init: function(root, ui))'); return; }
    if (widgetById[id]) { report(SELFTEST ? id : 'widget ' + id, 'Course.widget was called twice with this id'); return; }
    var w = { id: id, init: init, root: null, ui: null, ok: false };
    widgetById[id] = w; widgets.push(w);
    if (booted) mountWidget(w);
  };

  function WidgetCtx(id, rootEl) {
    this.id = id; this.root = rootEl; this.plots = []; this.changeFns = []; this.inits = []; this.timers = [];
    this.steppers = []; this.players = []; this.readouts = []; this.seen = {};
    this.ready = false; this.n = 0; this.failed = false; this.stage = null; this.live = null; this.liveTimer = null;
  }
  WidgetCtx.prototype.nextId = function (given) { return given || (this.id + '-c' + (++this.n)); };
  WidgetCtx.prototype.fail = function (err, what) {
    var text = (err && err.message ? err.message : String(err)) + (what ? ' (in ' + what + ')' : '');
    if (!this.seen[text]) {                    // the same failure on every redraw is reported once
      this.seen[text] = 1;
      report(SELFTEST ? this.id : 'widget ' + this.id, { message: text, stack: err && err.stack });
    }
    if (this.failed) return;
    this.failed = true;
    /* right under the stage, next to the half-drawn picture, not at the bottom of the widget */
    var note = el('p', { 'class': 'widget-error', role: 'status' }, ['The widget broke: ', el('code', { text: (err && err.message) || String(err) })]);
    if (this.stage && this.stage.parentNode === this.root) this.root.insertBefore(note, this.stage.nextSibling); else this.root.appendChild(note);
  };
  WidgetCtx.prototype.safe = function (fn, what) {
    var self = this;
    return function () { try { return fn.apply(null, arguments); } catch (e) { self.fail(e, what); } };
  };
  WidgetCtx.prototype.changed = function (source) {
    if (!this.ready) return;
    var self = this;
    this.changeFns.forEach(function (fn) { self.safe(fn, 'ui.onChange')(source); });
    this.plots.forEach(function (p) { p.redraw(); });
    if (source !== 'init') this.announce();
  };
  /* screen readers: one summary of the readouts after the changes settle, instead of a live region firing on every slider tick */
  WidgetCtx.prototype.announce = function () {
    var self = this;
    if (!this.live || !this.readouts.length) return;
    clearTimeout(this.liveTimer);
    this.liveTimer = setTimeout(function () {
      self.live.textContent = self.readouts.map(function (r) { return r.label.textContent + ': ' + r.val.textContent; }).join('; ');
    }, 700);
  };
  /* a block that replaces a widget which could not start */
  function widgetDown(rootEl, stage, err) {
    Array.prototype.forEach.call(rootEl.querySelectorAll(':scope > .widget-controls, :scope > .widget-readouts, :scope > .widget-legend, :scope > .widget-note'), function (n) { n.textContent = ''; n.hidden = true; });
    stage.textContent = '';
    stage.appendChild(el('p', { 'class': 'widget-error', role: 'status' }, ['The widget did not load. The rest of the lesson works; try reloading the page.', err ? el('code', { text: (err && err.message) || String(err) }) : null]));
  }
  /* title + intro go into the head block; returns the stage (created if the author did not write one) */
  function widgetFrame(rootEl, id) {
    rootEl.classList.add('widget');
    var title = rootEl.querySelector(':scope > .widget-title'), intro = rootEl.querySelector(':scope > .widget-intro');
    var head = el('div', { 'class': 'widget-head' }, [el('span', { 'class': 'widget-tag' }, [icon('interactive'), 'Interactive'])]);
    rootEl.insertBefore(head, rootEl.firstChild);
    if (title) head.appendChild(title);
    if (intro) head.appendChild(intro);
    var stage = rootEl.querySelector(':scope > .widget-stage') || el('div', { 'class': 'widget-stage' });
    if (stage.parentNode !== rootEl) rootEl.insertBefore(stage, head.nextSibling);
    if (title && !rootEl.getAttribute('aria-labelledby')) { if (!title.id) title.id = id + '-title'; rootEl.setAttribute('role', 'group'); rootEl.setAttribute('aria-labelledby', title.id); }
    return { head: head, stage: stage };
  }

  function mountWidget(w) {
    var rootEl = doc.getElementById(w.id);
    if (!rootEl) { report(SELFTEST ? w.id : 'widget ' + w.id, 'no element with id="' + w.id + '" on the page'); return; }
    w.root = rootEl;
    /* structure: head (tag, title, intro) · stage · legend · controls · readouts · tasks */
    var frame = widgetFrame(rootEl, w.id), stage = frame.stage;
    var controls = rootEl.querySelector(':scope > .widget-controls') || el('div', { 'class': 'widget-controls' });
    var readouts = rootEl.querySelector(':scope > .widget-readouts') || el('div', { 'class': 'widget-readouts' });
    var after = stage.nextSibling;
    [controls, readouts].forEach(function (part) { if (part.parentNode !== rootEl) rootEl.insertBefore(part, after); });

    var ctx = new WidgetCtx(w.id, rootEl);
    ctx.stage = stage;
    var ui = w.ui = makeUI(ctx, stage, controls, readouts);
    w.ctx = ctx;
    try {
      w.init(rootEl, ui);
      w.ok = true;
    } catch (err) {
      report(SELFTEST ? w.id : 'widget ' + w.id, err);
      ctx.failed = true;
      ctx.timers.forEach(function (stop) { try { stop(); } catch (e) { /* ignore */ } });
      widgetDown(rootEl, stage, err);           // no dead sliders or stale readouts under the message
      return;
    }
    ctx.ready = true;
    ctx.inits.forEach(function (fn) { fn(); });
    ctx.changed('init');
    rootEl.classList.add('is-ready');
    if (hasRawTex(rootEl) && mathIsReady) Course.typeset(rootEl);
  }
  /* a .widget whose script never registered (a syntax error stops the whole <script>) still gets its frame and a message */
  function mountOrphans() {
    Array.prototype.forEach.call(doc.querySelectorAll('.widget'), function (rootEl) {
      if (rootEl.querySelector(':scope > .widget-head')) return;
      if (rootEl.id && widgetById[rootEl.id]) return;
      report(SELFTEST ? (rootEl.id || 'widget') : 'widget ' + (rootEl.id || '(no id)'),
        rootEl.id ? 'no Course.widget("' + rootEl.id + '", ...) ran for this .widget: its <script> is missing, has a syntax error, or uses another id' : 'a .widget element has no id');
      widgetDown(rootEl, widgetFrame(rootEl, rootEl.id || 'widget').stage, null);
    });
  }

  function makeUI(ctx, stage, controls, readouts) {
    var ui = { id: ctx.id, root: ctx.root, stage: stage, controls: controls };

    function decimals(step) { var s = String(step); var i = s.indexOf('.'); return i < 0 ? 0 : Math.min(6, s.length - i - 1); }
    function btnGroup() {
      var last = controls.lastElementChild;
      if (last && last.classList.contains('ctl-btns')) return last;
      var g = el('div', { 'class': 'ctl ctl-btns' }); controls.appendChild(g); return g;
    }

    /** ui.slider({label, min, max, step, value, format, onInput, id}) -> {value, set(v), el} */
    ui.slider = function (o) {
      o = o || {};
      var min = o.min != null ? +o.min : 0, max = o.max != null ? +o.max : 1, step = o.step != null ? +o.step : (max - min) / 100;
      var val = o.value != null ? +o.value : (min + max) / 2, id = ctx.nextId(o.id), d = decimals(step);
      var format = typeof o.format === 'function' ? o.format : function (v) { return fmt(v, d); };
      var out = el('output', { 'class': 'ctl-val', 'for': id });
      var input = el('input', { type: 'range', id: id, min: min, max: max, step: step });
      input.value = String(val);
      var lab = el('label', { 'for': id }, [el('span', { 'class': 'ctl-label', html: o.label || '' }), out]);
      controls.appendChild(el('div', { 'class': 'ctl ctl-slider' }, [lab, input]));
      function show() { var t; try { t = format(+input.value); } catch (e) { ctx.fail(e, 'slider.format'); t = input.value; } out.textContent = t; input.setAttribute('aria-valuetext', String(t)); }
      input.addEventListener('input', function () { show(); if (o.onInput) ctx.safe(o.onInput, 'slider.onInput')(+input.value); ctx.changed('slider'); });
      show();
      return {
        el: input,
        get value() { return +input.value; },
        set value(v) { input.value = String(v); show(); },
        set: function (v, silent) { input.value = String(v); show(); if (!silent) { if (o.onInput) ctx.safe(o.onInput, 'slider.onInput')(+input.value); ctx.changed('slider'); } return this; }
      };
    };

    /** ui.button(label, fn, {kind:'primary'|'ghost', id, icon}) -> {el, label(text), disabled} */
    ui.button = function (label, fn, o) {
      o = o || {};
      var b = el('button', { 'class': 'btn' + (o.kind === 'primary' ? ' btn--primary' : o.kind === 'ghost' ? ' btn--ghost' : ''), type: 'button', id: ctx.nextId(o.id) });
      var text = el('span', { html: label });
      if (o.icon && ICONS[o.icon]) b.appendChild(icon(o.icon));
      b.appendChild(text);
      b.addEventListener('click', function (ev) { if (fn) ctx.safe(fn, 'button "' + b.textContent + '"')(ev); ctx.changed('button'); });
      btnGroup().appendChild(b);
      return { el: b, label: function (t) { text.innerHTML = t; return this; }, get disabled() { return b.disabled; }, set disabled(v) { b.disabled = !!v; } };
    };

    /** ui.toggle(label, initial, fn) -> {value, el} */
    ui.toggle = function (label, initial, fn, o) {
      o = o || {};
      var id = ctx.nextId(o.id);
      var input = el('input', { type: 'checkbox', id: id, role: 'switch' });
      input.checked = !!initial;
      var lab = el('label', { 'class': 'ctl-toggle', 'for': id }, [input, el('span', { 'class': 'ctl-label', html: label })]);
      controls.appendChild(el('div', { 'class': 'ctl' }, lab));
      input.addEventListener('change', function () { if (fn) ctx.safe(fn, 'toggle')(input.checked); ctx.changed('toggle'); });
      return { el: input, get value() { return input.checked; }, set value(v) { input.checked = !!v; } };
    };

    /** ui.select(label, options, fn, initial) — options: ['a','b'] or [{value, label}] -> {value, index, el} */
    ui.select = function (label, options, fn, initial, o) {
      o = o || {};
      var id = ctx.nextId(o.id);
      var sel = el('select', { id: id });
      (options || []).forEach(function (op) {
        var v = typeof op === 'object' ? op.value : op, t = typeof op === 'object' ? (op.label != null ? op.label : op.value) : op;
        sel.appendChild(el('option', { value: String(v), text: String(t) }));
      });
      if (initial != null) sel.value = String(initial);
      controls.appendChild(el('div', { 'class': 'ctl' }, [el('label', { 'for': id }, el('span', { 'class': 'ctl-label', html: label })), sel]));
      sel.addEventListener('change', function () { if (fn) ctx.safe(fn, 'select')(sel.value, sel.selectedIndex); ctx.changed('select'); });
      return { el: sel, get value() { return sel.value; }, set value(v) { sel.value = String(v); }, get index() { return sel.selectedIndex; } };
    };

    /**
     * ui.stepper({steps: n | ['step label', …], onStep(i, api), start, play: ms}) -> {index, count, go(i), next(), prev(), reset()}
     * onStep(start) is called once right after init() returns, then on every step.
     */
    ui.stepper = function (o) {
      o = o || {};
      var labels = Array.isArray(o.steps) ? o.steps : null, n = labels ? labels.length : Math.max(1, o.steps | 0);
      var i = clamp(o.start | 0, 0, n - 1), base = ctx.nextId(o.id), timer = null;
      var prev = el('button', { 'class': 'btn', type: 'button', id: base + '-prev', 'aria-label': 'Previous step' }, [icon('back'), 'Back']);
      var next = el('button', { 'class': 'btn btn--primary', type: 'button', id: base + '-next', 'aria-label': 'Next step' }, ['Next', icon('next')]);
      var reset = el('button', { 'class': 'btn btn--ghost', type: 'button', id: base + '-reset', 'aria-label': 'To the first step' }, [icon('refresh'), 'Start over']);
      var count = el('span', { 'class': 'step-count' });
      var lab = el('span', { 'class': 'step-label', 'aria-live': 'polite' });
      var play = o.play ? el('button', { 'class': 'btn btn--ghost', type: 'button', id: base + '-play' }, [icon('play'), el('span', { text: 'Play' })]) : null;
      controls.appendChild(el('div', { 'class': 'ctl ctl-stepper', role: 'group', 'aria-label': 'Step-by-step view' }, [prev, next, play, reset, count, lab]));
      function stop() { if (timer) { clearInterval(timer); timer = null; if (play) play.lastChild.textContent = 'Play'; } }
      var api = {
        get index() { return i; }, get count() { return n; },
        go: function (k) { i = clamp(k | 0, 0, n - 1); emit(); ctx.changed('stepper'); return api; },
        next: function () { return api.go(i + 1); }, prev: function () { return api.go(i - 1); }, reset: function () { stop(); return api.go(0); },
        stop: stop
      };
      ctx.steppers.push(api);
      function emit() {
        prev.disabled = i <= 0; next.disabled = i >= n - 1;
        count.textContent = 'step ' + (i + 1) + ' of ' + n;
        lab.innerHTML = labels ? labels[i] : '';
        if (labels && hasRawTex(lab) && mathIsReady) Course.typeset(lab);
        if (o.onStep) ctx.safe(o.onStep, 'stepper.onStep')(i, api);
      }
      prev.addEventListener('click', function () { stop(); api.prev(); });
      next.addEventListener('click', function () { stop(); api.next(); });
      reset.addEventListener('click', function () { api.reset(); });
      if (play) {
        play.addEventListener('click', function () {
          if (timer) { stop(); return; }
          if (i >= n - 1) api.go(0);
          play.lastChild.textContent = 'Pause';
          timer = setInterval(function () { if (i >= n - 1) { stop(); return; } api.next(); }, Math.max(120, +o.play || 900));
        });
        ctx.timers.push(stop);
      }
      ctx.inits.push(emit);
      return api;
    };

    /**
     * ui.player({onTick(i), ms, max, onReset, label}) — a "Run / Pause" loop for training animations.
     * -> {running, ticks, start(), stop(), reset()}
     */
    ui.player = function (o) {
      o = o || {};
      var base = ctx.nextId(o.id), timer = null, ticks = 0, max = o.max != null ? +o.max : Infinity, ms = Math.max(16, +o.ms || 80);
      var text = el('span', { text: o.label || 'Run' }), ic = icon('play');
      var play = el('button', { 'class': 'btn btn--primary', type: 'button', id: base + '-play' }, [ic, text]);
      var step = el('button', { 'class': 'btn', type: 'button', id: base + '-step', text: o.stepLabel || 'One step' });
      var reset = el('button', { 'class': 'btn btn--ghost', type: 'button', id: base + '-reset' }, [icon('refresh'), 'Reset']);
      var g = btnGroup(); g.appendChild(play); g.appendChild(step); g.appendChild(reset);
      function setIcon(name) { ic.firstChild.setAttribute('href', '#i-' + name); }
      /* buttons tell the truth: at the last tick there is nothing left to run, only "Reset" */
      function sync() {
        var end = ticks >= max;
        play.disabled = end; step.disabled = end;
        text.textContent = timer ? 'Pause' : (o.label || 'Run'); setIcon(timer ? 'pause' : 'play');
      }
      function halt() { if (!timer) return false; clearInterval(timer); timer = null; return true; }
      function tick() {
        if (ticks >= max) { api.stop(); return; }
        if (o.onTick) ctx.safe(o.onTick, 'player.onTick')(ticks, api);
        ticks++;
        if (ticks >= max) halt();                // stop first: onChange then sees running === false on the last tick
        sync();
        ctx.changed('player');
      }
      var api = {
        get running() { return !!timer; }, get ticks() { return ticks; }, get max() { return max; },
        start: function () { if (timer || ticks >= max) return api; timer = setInterval(tick, ms); sync(); ctx.changed('player'); return api; },
        /* stop() fires ui.onChange when it really stopped something, so a "running" readout never goes stale */
        stop: function () { var was = halt(); sync(); if (was) ctx.changed('player'); return api; },
        reset: function () { halt(); ticks = 0; if (o.onReset) ctx.safe(o.onReset, 'player.onReset')(); sync(); ctx.changed('player'); return api; }
      };
      play.addEventListener('click', function () { if (timer) api.stop(); else api.start(); });
      step.addEventListener('click', function () { api.stop(); tick(); });
      reset.addEventListener('click', function () { api.reset(); });
      doc.addEventListener('visibilitychange', function () { if (doc.hidden) api.stop(); });
      ctx.timers.push(function () { halt(); sync(); });
      ctx.players.push({ api: api, tick: tick });
      sync();
      return api;
    };

    /**
     * ui.readout(label, {digits}) -> {set(value, tone, digits)}; tone: 'good' | 'bad' | 'key' | undefined.
     * A number is formatted with `digits` decimals (default 2; use {digits: 0} for counters); a string is shown as is (HTML).
     */
    ui.readout = function (label, o) {
      o = o || {};
      var val = el('span', { 'class': 'ro-val', text: '—' });
      var lab = el('span', { 'class': 'ro-label', html: label || '' });
      var box = el('div', { 'class': 'ro' }, [lab, val]);
      readouts.appendChild(box);
      if (!ctx.live) { ctx.live = el('p', { 'class': 'sr-only', 'aria-live': 'polite' }); ctx.root.appendChild(ctx.live); }
      ctx.readouts.push({ label: lab, val: val });
      var last = null;
      return {
        el: box,
        set: function (v, tone, digits) {
          var s = typeof v === 'number' ? fmt(v, digits != null ? digits : o.digits != null ? o.digits : 2) : String(v == null ? '—' : v);
          if (s !== last) { val.innerHTML = s; last = s; if (hasRawTex(val) && mathIsReady) Course.typeset(val); }
          box.classList.toggle('is-good', tone === 'good'); box.classList.toggle('is-bad', tone === 'bad'); box.classList.toggle('is-key', tone === 'key');
          return this;
        }
      };
    };

    /** ui.note(html) -> {set(html)} — a line of explanatory text under the controls */
    ui.note = function (html) {
      var p = el('p', { 'class': 'widget-note', html: html || '' });
      ctx.root.insertBefore(p, readouts.nextSibling);
      return { el: p, set: function (h) { p.innerHTML = h; if (hasRawTex(p) && mathIsReady) Course.typeset(p); return this; } };
    };

    /** ui.legend([{label, color, mark}]) — mark: 'dot' | 'line' | 'dash' | 'area' | 'square' | 'cross' | 'ring' | 'triangle' | 'diamond' */
    ui.legend = function (items) {
      var ul = ctx.root.querySelector(':scope > .widget-legend');
      if (!ul) { ul = el('ul', { 'class': 'widget-legend' }); ctx.root.insertBefore(ul, stage.nextSibling); }
      ul.textContent = '';
      (items || []).forEach(function (it) {
        var s = svg('svg', { 'class': 'lg-key', viewBox: '0 0 24 14', 'aria-hidden': 'true' });
        /* colours come straight from the token map, so every documented name works (soft, muted, grid2, key, …) */
        var c = it.color || 'ink', mark = it.mark || 'dot';
        if (!COLOR_VARS[c]) { badColour(c, 'ui.legend of ' + ctx.id); c = 'ink'; }
        var thin = c === 'key' ? COLOR_VARS.keyline : COLOR_VARS[c];              // yellow as a thin mark is not readable: use its line version
        var tok = 'var(' + COLOR_VARS[c] + ')', line = 'var(' + thin + ')';
        function stroked(tag, a) { var n = svg(tag, a, s); n.style.stroke = line; n.style.fill = 'none'; return n; }
        function filled(tag, a) { var n = svg(tag, a, s); n.style.fill = tok; n.style.stroke = 'none'; return n; }
        switch (mark) {
          case 'line': stroked('path', { d: 'M1 7H23', 'stroke-width': 2.5, 'stroke-linecap': 'round' }); break;
          case 'dash': stroked('path', { d: 'M1 7H23', 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }); break;
          case 'area': { var a = svg('rect', { x: 1, y: 1, width: 22, height: 12 }, s); a.style.fill = 'color-mix(in srgb, ' + tok + ' ' + (c === 'key' ? 60 : 22) + '%, transparent)'; a.style.stroke = line; a.style.strokeWidth = '1'; break; }
          case 'hl': { var h = svg('path', { d: 'M2 7H22', 'stroke-width': 9, 'stroke-linecap': 'round' }, s); h.style.stroke = 'var(--key)'; h.style.opacity = '0.75'; h.style.fill = 'none';
            var k = svg('path', { d: 'M2 7H22', 'stroke-width': 2, 'stroke-linecap': 'round' }, s); k.style.stroke = c === 'key' ? 'var(--ink)' : tok; k.style.fill = 'none'; break; }
          case 'square': filled('rect', { x: 7.5, y: 2.5, width: 9, height: 9 }); break;
          case 'cross': stroked('path', { d: 'M8 3l8 8M16 3l-8 8', 'stroke-width': 2.4, 'stroke-linecap': 'round' }); break;
          case 'ring': stroked('circle', { cx: 12, cy: 7, r: 4.5, 'stroke-width': 2 }); break;
          case 'triangle': filled('path', { d: 'M12 2l5.5 9.5h-11z' }); break;
          case 'diamond': filled('path', { d: 'M12 1.5l5.5 5.5-5.5 5.5L6.5 7z' }); break;
          default: filled('circle', { cx: 12, cy: 7, r: 5 });
        }
        ul.appendChild(el('li', null, [s, el('span', { html: it.label || '' })]));
      });
      if (hasRawTex(ul) && mathIsReady) Course.typeset(ul);
      return ul;
    };

    /** ui.plot(opts) -> Plot (canvas in the stage). See Plot below. */
    ui.plot = function (o) { var p = new Plot(ctx, stage, o); ctx.plots.push(p); allPlots.push(p); return p; };
    /** ui.net(opts) -> Course.net(...) drawn in the stage */
    ui.net = function (o) { return Course.net(stage, o); };
    /** ui.svg(width, height) -> an empty <svg class="dia"> in the stage, for hand-made SVG interactives */
    ui.svg = function (w, h, o) {
      o = o || {};
      var s = svg('svg', { 'class': 'dia stage-svg', viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': o.label || '' });
      stage.appendChild(s);
      return s;
    };
    /**
     * ui.onChange(fn) — fn runs once after init, and then after every slider / toggle / select change, button click,
     * stepper step, player tick / start / stop / reset, point drag and plot click — always BEFORE the plots repaint.
     */
    ui.onChange = function (fn) { if (typeof fn === 'function') ctx.changeFns.push(fn); return ui; };
    /** ui.changed() — tell the toolkit that state changed (for hand-made controls): runs onChange handlers, redraws plots. */
    ui.changed = function () { ctx.changed('manual'); return ui; };
    ui.redraw = function () { ctx.plots.forEach(function (p) { p.redraw(); }); return ui; };
    return ui;
  }

  /* ------------------------------------------------------------------------
     10. Plot — canvas plot in data coordinates
     ------------------------------------------------------------------------ */
  function niceStep(span, target) {
    var raw = span / Math.max(1, target), p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }
  function tickList(a, b, step) {
    var out = [], t = Math.ceil(a / step - 1e-9) * step, guard = 0;
    for (; t <= b + step * 1e-9 && guard < 400; t += step, guard++) out.push(Math.abs(t) < step * 1e-9 ? 0 : +t.toPrecision(12));
    return out;
  }
  function stepDecimals(step) { return clamp(Math.ceil(-Math.log(step) / Math.LN10 - 1e-9), 0, 6); }

  function Plot(ctx, host, o) {
    var self = this;
    this.w = ctx;
    this.o = o = Object.assign({ x: [0, 1], y: [0, 1], aspect: 1.6, grid: true, axes: true, equalAspect: false, xLabel: '', yLabel: '', minHeight: 300, maxHeight: 560, hover: false, label: '' }, o || {});
    this.base = { x0: +o.x[0], x1: +o.x[1], y0: +o.y[0], y1: +o.y[1] };
    this.view = Object.assign({}, this.base);
    this.declared = Object.assign({}, this.base);        // the ranges the author wrote: default drag bounds, and what fit() never shrinks below
    this.fn = null; this.drags = []; this.h = null; this.ptr = null; this.cssW = 0; this.cssH = 0; this.dpr = 1;
    this._pending = false; this._drag = null; this._active = null; this._down = false; this._bound = false; this._tap = null; this._raf = 0;
    this.el = el('div', { 'class': 'plot' });
    this.canvas = el('canvas', { role: 'img', 'aria-label': o.label || 'Chart' });
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    host.appendChild(this.el);
    this.m = { l: 40, r: 14, t: 12, b: 28 }; this.pw = 1; this.ph = 1;
    /* the observer watches the width; the height we set in response is applied in the next frame,
       so the observer never sees its own change inside one delivery ("ResizeObserver loop" notices) */
    var later = function () { if (self._raf) return; self._raf = nextFrame(function () { self._raf = 0; self._resize(); }); };
    if ('ResizeObserver' in window) { this._ro = new ResizeObserver(later); this._ro.observe(this.el); }
    else window.addEventListener('resize', later);
    this._resize();
    if (o.hover) this._bindPointer();
  }
  function nextFrame(fn) { return window.requestAnimationFrame ? window.requestAnimationFrame(fn) : setTimeout(fn, 16); }
  Plot.prototype._resize = function () {
    var cw = Math.round(this.el.clientWidth);
    if (!cw) return;
    var ch = Math.round(clamp(cw / this.o.aspect, this.o.minHeight, this.o.maxHeight));
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (cw === this.cssW && ch === this.cssH && dpr === this.dpr) return;
    this.cssW = cw; this.cssH = ch; this.dpr = dpr;
    this.canvas.width = Math.round(cw * dpr); this.canvas.height = Math.round(ch * dpr);
    this.canvas.style.height = ch + 'px';
    this._layout();
    this._drawNow();
  };
  Plot.prototype._layout = function () {
    var o = this.o, F = fonts(), c = this.ctx;
    var m = o.axes ? { l: 40, r: 14, t: o.yLabel ? 30 : 12, b: o.xLabel ? 46 : 28 } : { l: 4, r: 4, t: 4, b: 4 };
    var ph = Math.max(10, this.cssH - m.t - m.b);
    var v = Object.assign({}, this.base);
    /* first pass with a provisional left margin to get y ticks, then widen the margin to fit their labels */
    for (var pass = 0; pass < 2; pass++) {
      var pw = Math.max(10, this.cssW - m.l - m.r);
      v = Object.assign({}, this.base);
      if (o.equalAspect) {
        var s = Math.min(pw / (v.x1 - v.x0), ph / (v.y1 - v.y0)), cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2;
        v.x0 = cx - pw / s / 2; v.x1 = cx + pw / s / 2; v.y0 = cy - ph / s / 2; v.y1 = cy + ph / s / 2;
      }
      var xs = Array.isArray(o.xTicks) ? null : niceStep(v.x1 - v.x0, typeof o.xTicks === 'number' ? o.xTicks : pw / 76);
      var ys = Array.isArray(o.yTicks) ? null : niceStep(v.y1 - v.y0, typeof o.yTicks === 'number' ? o.yTicks : ph / 46);
      if (o.equalAspect && xs && ys) xs = ys = Math.max(xs, ys);
      this.xStep = xs || (o.xTicks.length > 1 ? Math.abs(o.xTicks[1] - o.xTicks[0]) : 1);
      this.yStep = ys || (o.yTicks.length > 1 ? Math.abs(o.yTicks[1] - o.yTicks[0]) : 1);
      this.xT = xs ? tickList(v.x0, v.x1, xs) : o.xTicks.slice();
      this.yT = ys ? tickList(v.y0, v.y1, ys) : o.yTicks.slice();
      this.pw = pw; this.ph = ph; this.view = v; this.m = m;
      if (!o.axes || pass) break;
      c.font = '11px ' + F.mono;
      var widest = 0, dy = stepDecimals(this.yStep);
      this.yT.forEach(function (t) { widest = Math.max(widest, c.measureText(fmt(t, dy)).width); });
      m.l = Math.max(30, Math.ceil(widest) + 14);
    }
  };
  Plot.prototype.toPx = function (x, y) {
    var v = this.view, m = this.m;
    return { x: m.l + (x - v.x0) / (v.x1 - v.x0) * this.pw, y: m.t + (1 - (y - v.y0) / (v.y1 - v.y0)) * this.ph };
  };
  Plot.prototype.toData = function (px, py) {
    var v = this.view, m = this.m;
    return { x: v.x0 + (px - m.l) / this.pw * (v.x1 - v.x0), y: v.y0 + (1 - (py - m.t) / this.ph) * (v.y1 - v.y0) };
  };
  /** plot.setView({x:[a,b], y:[c,d]}) — change the visible range. Safe inside ui.onChange (applies before the repaint). */
  Plot.prototype.setView = function (r) {
    function ok(p) { return p && isFinite(+p[0]) && isFinite(+p[1]) && +p[1] > +p[0]; }
    if (r && ok(r.x)) { this.base.x0 = +r.x[0]; this.base.x1 = +r.x[1]; }
    if (r && ok(r.y)) { this.base.y0 = +r.y[0]; this.base.y1 = +r.y[1]; }
    this._layout(); this.redraw();
    return this;
  };
  /**
   * plot.fit(points, {pad, keep, x, y}) — zoom so that all points are in view (a trajectory that leaves the frame).
   * pad: free space around them as a fraction (default 0.1); keep: never show less than the declared ranges (default true);
   * x: false or y: false leaves that axis alone. Safe inside ui.onChange.
   */
  Plot.prototype.fit = function (points, opt) {
    opt = opt || {};
    var d = this.declared, keep = opt.keep !== false, pad = opt.pad != null ? +opt.pad : 0.1;
    var bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    (points || []).forEach(function (p) {
      var x = Array.isArray(p) ? +p[0] : +p.x, y = Array.isArray(p) ? +p[1] : +p.y;
      if (!isFinite(x) || !isFinite(y)) return;
      bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
    });
    if (bx0 > bx1) { if (!keep) return this; bx0 = d.x0; bx1 = d.x1; by0 = d.y0; by1 = d.y1; }
    function axis(lo, hi, dlo, dhi) {
      var a = keep ? Math.min(lo, dlo) : lo, b = keep ? Math.max(hi, dhi) : hi, span = (b - a) || (dhi - dlo) || 1;
      if (!keep || lo < dlo) a -= pad * span;          // free space only on the sides that had to grow
      if (!keep || hi > dhi) b += pad * span;
      return [a, b];
    }
    var r = {};
    if (opt.x !== false) r.x = axis(bx0, bx1, d.x0, d.x1);
    if (opt.y !== false) r.y = axis(by0, by1, d.y0, d.y1);
    return this.setView(r);
  };
  /** plot.draw(fn) — register the drawing routine fn(g). It is called on every redraw (first time right after init). */
  Plot.prototype.draw = function (fn) { this.fn = fn; this.redraw(); return this; };
  /** plot.redraw() — repaint on the next microtask (several calls collapse into one). */
  Plot.prototype.redraw = function () {
    if (this._pending) return this;
    this._pending = true;
    var self = this;
    Promise.resolve().then(function () { self._drawNow(); });
    return this;
  };
  Plot.prototype._drawNow = function () {
    this._pending = false;
    if (!this.cssW) return;
    var c = this.ctx, dpr = this.dpr;
    if (c.reset) c.reset(); else this.canvas.width = this.canvas.width;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._frame();
    if (this.fn && this.w.ready) {
      var g = makeG(this);
      try { this.fn(g); } catch (e) { this.w.fail(e, 'plot.draw'); }
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1; c.setLineDash([]);
    }
    this._handles();
    this._hover();
  };
  Plot.prototype._frame = function () {
    var c = this.ctx, o = this.o, C = Course.colors(), F = fonts(), m = this.m, pw = this.pw, ph = this.ph, v = this.view, self = this;
    c.fillStyle = C.stage; c.fillRect(0, 0, this.cssW, this.cssH);
    function X(x) { return m.l + (x - v.x0) / (v.x1 - v.x0) * pw; }
    function Y(y) { return m.t + (1 - (y - v.y0) / (v.y1 - v.y0)) * ph; }
    function vline(x, col, w) { var p = Math.round(X(x)) + 0.5; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(p, m.t); c.lineTo(p, m.t + ph); c.stroke(); }
    function hline(y, col, w) { var p = Math.round(Y(y)) + 0.5; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(m.l, p); c.lineTo(m.l + pw, p); c.stroke(); }
    if (o.grid) {
      /* squared paper: light squares between the labelled lines when there is room */
      var pxX = pw / (v.x1 - v.x0) * this.xStep, pxY = ph / (v.y1 - v.y0) * this.yStep;
      var subX = pxX >= 110 ? 5 : pxX >= 44 ? 2 : 1, subY = pxY >= 110 ? 5 : pxY >= 44 ? 2 : 1;
      if (o.equalAspect) subX = subY = Math.min(subX, subY);
      if (subX > 1) tickList(v.x0, v.x1, this.xStep / subX).forEach(function (t) { vline(t, C.grid, 1); });
      if (subY > 1) tickList(v.y0, v.y1, this.yStep / subY).forEach(function (t) { hline(t, C.grid, 1); });
      this.xT.forEach(function (t) { vline(t, C.grid2, 1); });
      this.yT.forEach(function (t) { hline(t, C.grid2, 1); });
    }
    if (!o.axes) return;
    c.strokeStyle = C.line2; c.lineWidth = 1; c.strokeRect(Math.round(m.l) + 0.5, Math.round(m.t) + 0.5, Math.round(pw), Math.round(ph));
    if (v.y0 < 0 && v.y1 > 0) hline(0, C.muted, 1.25);
    if (v.x0 < 0 && v.x1 > 0) vline(0, C.muted, 1.25);
    c.fillStyle = C.muted; c.font = '11px ' + F.mono;
    var dx = stepDecimals(this.xStep), dy = stepDecimals(this.yStep);
    c.textAlign = 'center'; c.textBaseline = 'top';
    var lastRight = -1e9;
    this.xT.forEach(function (t) {
      var s = fmt(t, dx), w = c.measureText(s).width, px = X(t);
      if (px - w / 2 < lastRight + 6 || px + w / 2 > self.cssW - 1 || px - w / 2 < 1) return;
      c.fillText(s, px, m.t + ph + 7); lastRight = px + w / 2;
    });
    c.textAlign = 'right'; c.textBaseline = 'middle';
    this.yT.forEach(function (t) { c.fillText(fmt(t, dy), m.l - 7, Y(t)); });
    c.fillStyle = C.soft;
    if (o.xLabel) drawRich(c, o.xLabel, m.l + pw, this.cssH - 8, { align: 'right', baseline: 'alphabetic', size: 12.5, weight: 600, font: F.ui });
    if (o.yLabel) drawRich(c, o.yLabel, Math.max(4, m.l - 30), 17, { align: 'left', baseline: 'alphabetic', size: 12.5, weight: 600, font: F.ui });
  };

  /* canvas text with sub/superscripts */
  function drawRich(c, str, x, y, o) {
    var runs = richRuns(str), size = o.size || 12, font = o.font, weight = o.weight || 500, total = 0;
    function setFont(r) { c.font = weight + ' ' + (r.m ? size * 0.74 : size).toFixed(2) + 'px ' + font; }
    runs.forEach(function (r) { setFont(r); r.w = c.measureText(r.t).width; total += r.w; });
    var x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    var by = y;
    if (o.baseline === 'middle') by = y + size * 0.35; else if (o.baseline === 'top') by = y + size * 0.82; else if (o.baseline === 'bottom') by = y - size * 0.22;
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    if (o.halo) {
      c.save(); c.strokeStyle = o.halo; c.lineWidth = 4; c.lineJoin = 'round';
      var hx = x0; runs.forEach(function (r) { setFont(r); c.strokeText(r.t, hx, by + (r.m === -1 ? size * 0.28 : r.m === 1 ? -size * 0.38 : 0)); hx += r.w; });
      c.restore();
    }
    runs.forEach(function (r) { setFont(r); c.fillText(r.t, x0, by + (r.m === -1 ? size * 0.28 : r.m === 1 ? -size * 0.38 : 0)); x0 += r.w; });
    return total;
  }
  function marker(c, x, y, r, shape, color, surface, ring, hollow) {
    c.save();
    c.lineJoin = 'round'; c.lineCap = 'round';
    var stroked = shape === 'cross' || shape === 'plus' || shape === 'ring';
    function path() {
      c.beginPath();
      switch (shape) {
        case 'square': c.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8); break;
        case 'triangle': c.moveTo(x, y - r * 1.15); c.lineTo(x + r * 1.1, y + r * 0.85); c.lineTo(x - r * 1.1, y + r * 0.85); c.closePath(); break;
        case 'diamond': c.moveTo(x, y - r * 1.25); c.lineTo(x + r * 1.1, y); c.lineTo(x, y + r * 1.25); c.lineTo(x - r * 1.1, y); c.closePath(); break;
        case 'cross': c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); break;
        case 'plus': c.moveTo(x - r * 1.2, y); c.lineTo(x + r * 1.2, y); c.moveTo(x, y - r * 1.2); c.lineTo(x, y + r * 1.2); break;
        default: c.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    if (stroked) {
      if (ring) { path(); c.strokeStyle = surface; c.lineWidth = 5.5; c.stroke(); }
      path(); c.strokeStyle = color; c.lineWidth = 2.4; c.stroke();
    } else {
      path();
      if (ring) { c.strokeStyle = surface; c.lineWidth = 4; c.stroke(); }
      if (hollow) { c.fillStyle = surface; c.fill(); c.strokeStyle = color; c.lineWidth = 2; c.stroke(); }
      else { c.fillStyle = color; c.fill(); }
    }
    c.restore();
  }

  function richWidth(c, str, size, weight, font) {
    var total = 0;
    richRuns(str).forEach(function (r) { c.font = (weight || 500) + ' ' + (r.m ? size * 0.74 : size).toFixed(2) + 'px ' + font; total += c.measureText(r.t).width; });
    return total;
  }
  var heatCanvas = null, rgbCache = {}, probeCtx = null;
  /* any CSS colour -> [r, g, b] (the canvas normalises it for us) */
  function rgbOf(color) {
    if (rgbCache[color]) return rgbCache[color];
    if (!probeCtx) probeCtx = doc.createElement('canvas').getContext('2d');
    probeCtx.fillStyle = '#000'; probeCtx.fillStyle = color;
    var s = String(probeCtx.fillStyle), out = [0, 0, 0], m;
    if (s.charAt(0) === '#') out = [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    else if ((m = /rgba?\(([^)]+)\)/.exec(s))) out = m[1].split(',').slice(0, 3).map(function (t) { return Math.round(parseFloat(t)); });
    rgbCache[color] = out;
    return out;
  }
  function makeG(plot) {
    var c = plot.ctx, C = Course.colors(), F = fonts(), m = plot.m, pw = plot.pw, ph = plot.ph, v = plot.view;
    function X(x) { return m.l + (x - v.x0) / (v.x1 - v.x0) * pw; }
    function Y(y) { return clamp(m.t + (1 - (y - v.y0) / (v.y1 - v.y0)) * ph, -2e4, 2e4); }
    /* thin = the colour is used for a thin stroke: highlighter yellow is then replaced by its darker line version,
       because #ffd83d on white paper is close to invisible as a 2 px line */
    function col(name, def, thin) {
      if (name == null) name = def;
      if (thin && name === 'key') name = 'keyline';
      if (Object.prototype.hasOwnProperty.call(C, name)) return C[name];
      badColour(name, 'the plot of ' + plot.w.id);
      return C.ink;
    }
    function underlay(drawPath, w) {       // the highlighter stroke beneath a mark: "look here"
      c.save(); c.setLineDash([]); c.strokeStyle = C.key; c.globalAlpha = 0.7; c.lineWidth = w + 8; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); drawPath(); c.stroke(); c.restore();
    }
    function clip(pad) { c.save(); c.beginPath(); c.rect(m.l - pad, m.t - pad, pw + 2 * pad, ph + 2 * pad); c.clip(); }
    function dashOf(o) { return o.dash === true ? [6, 5] : Array.isArray(o.dash) ? o.dash : []; }
    function xy(p) { return Array.isArray(p) ? p : [p.x, p.y]; }
    function sample(src, o) {
      if (typeof src !== 'function') return (src || []).map(xy);
      var a = v.x0, b = v.x1;
      if (o && o.domain) { a = Math.max(a, o.domain[0]); b = Math.min(b, o.domain[1]); }
      var n = Math.max(2, (o && o.samples) || Math.round(pw / 2)), out = [];
      for (var i = 0; i <= n; i++) { var x = a + (b - a) * i / n; out.push([x, src(x)]); }
      return out;
    }
    function trace(P) {
      var pen = false;
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        if (!isFinite(p[0]) || !isFinite(p[1])) { pen = false; continue; }
        if (pen) c.lineTo(X(p[0]), Y(p[1])); else { c.moveTo(X(p[0]), Y(p[1])); pen = true; }
      }
    }
    function pick(val, p, i, def) { return typeof val === 'function' ? val(p, i) : val != null ? val : def; }
    function shape(o, defAlpha) {           // fill + outline of a closed path already traced
      if (o.fill !== false) { c.globalAlpha = o.alpha != null ? o.alpha : defAlpha; c.fillStyle = col(o.color, 's1'); c.fill(); }
      if (o.stroke !== false) {
        c.globalAlpha = 1; c.strokeStyle = col(typeof o.stroke === 'string' ? o.stroke : o.color, 's1', true);
        c.lineWidth = o.width != null ? o.width : 1.5; c.setLineDash(dashOf(o)); c.stroke();
      }
    }
    var g = {
      ctx: c, plot: plot, colors: C, px: X, py: Y,
      get view() { return { x0: v.x0, x1: v.x1, y0: v.y0, y1: v.y1 }; },
      get width() { return pw; }, get height() { return ph; },

      /** g.line(points | f(x), {color, width, dash, alpha, domain, samples, highlight}) — a line 6 px or wider in 'key' is a highlighter stroke */
      line: function (src, o) {
        o = o || {}; clip(1);
        var P = sample(src, o), w = o.width != null ? o.width : (o.color === 's6' ? 2.5 : 2);   // s6 is the dimmest series on the blackboard
        if (o.highlight) underlay(function () { trace(P); }, w);
        c.beginPath(); trace(P);
        c.strokeStyle = col(o.color, 'ink', w < 6); c.lineWidth = w; c.globalAlpha = o.alpha != null ? o.alpha : 1;
        c.lineJoin = 'round'; c.lineCap = 'round'; c.setLineDash(dashOf(o)); c.stroke(); c.restore();
        return g;
      },
      /** g.points(list, {color, r, shape, ring, hollow}) — every option may be a function (point, index) */
      points: function (list, o) {
        o = o || {}; clip(12);
        (list || []).forEach(function (p, i) {
          var q = xy(p); if (!isFinite(q[0]) || !isFinite(q[1])) return;
          var shp = pick(o.shape, p, i, 'circle'), hollow = pick(o.hollow, p, i, false);
          marker(c, X(q[0]), Y(q[1]), pick(o.r, p, i, 4.5), shp, col(pick(o.color, p, i, 's1'), 's1', hollow || shp === 'cross' || shp === 'plus' || shp === 'ring'), C.stage, pick(o.ring, p, i, true), hollow);
        });
        c.restore(); return g;
      },
      /** g.area(points | f(x), {color, alpha, base}) — fill between the curve and base (number or f(x), default 0) */
      area: function (src, o) {
        o = o || {}; var P = sample(src, o).filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
        if (P.length < 2) return g;
        var base = o.base == null ? 0 : o.base;
        clip(0); c.beginPath(); trace(P);
        for (var i = P.length - 1; i >= 0; i--) c.lineTo(X(P[i][0]), Y(typeof base === 'function' ? base(P[i][0]) : base));
        c.closePath(); c.globalAlpha = o.alpha != null ? o.alpha : 0.14; c.fillStyle = col(o.color, 's1'); c.fill(); c.restore();
        return g;
      },
      /** g.band(lower, upper, {color, alpha}) — fill between two curves (points or functions) */
      band: function (lo, hi, o) {
        o = o || {}; var A = sample(lo, o), B = sample(hi, o);
        clip(0); c.beginPath(); trace(A);
        for (var i = B.length - 1; i >= 0; i--) if (isFinite(B[i][1])) c.lineTo(X(B[i][0]), Y(B[i][1]));
        c.closePath(); c.globalAlpha = o.alpha != null ? o.alpha : 0.14; c.fillStyle = col(o.color, 's1'); c.fill(); c.restore();
        return g;
      },
      /** g.hline(y, {color, width, dash, label}) */
      hline: function (y, o) {
        o = o || {}; g.line([[v.x0, y], [v.x1, y]], { color: o.color || 'muted', width: o.width != null ? o.width : 1.25, dash: o.dash, alpha: o.alpha });
        if (o.label) g.text(v.x1, y, o.label, { align: 'right', baseline: 'bottom', dx: -6, dy: -4, color: o.labelColor || 'soft', size: 11.5 });
        return g;
      },
      /** g.vline(x, {color, width, dash, label}) */
      vline: function (x, o) {
        o = o || {}; g.line([[x, v.y0], [x, v.y1]], { color: o.color || 'muted', width: o.width != null ? o.width : 1.25, dash: o.dash, alpha: o.alpha });
        if (o.label) g.text(x, v.y1, o.label, { align: 'left', baseline: 'top', dx: 6, dy: 6, color: o.labelColor || 'soft', size: 11.5 });
        return g;
      },
      /**
       * g.arrow(x1, y1, x2, y2, {color, width, dash, head, label, labelColor, highlight})
       * The label is ink on a paper halo (text never wears a series colour) and sits beside the tip, on the side that is inside the frame.
       * highlight: true puts a highlighter stroke under the arrow — "the step being taken now".
       */
      arrow: function (x1, y1, x2, y2, o) {
        o = o || {}; clip(12);
        var ax = X(x1), ay = Y(y1), bx = X(x2), by = Y(y2), len = Math.hypot(bx - ax, by - ay), h = o.head != null ? o.head : 9, w = o.width != null ? o.width : 2;
        if (o.highlight && len > 0.5) underlay(function () { c.moveTo(ax, ay); c.lineTo(bx, by); }, w);
        c.strokeStyle = c.fillStyle = col(o.color, 'ink', w < 6); c.lineWidth = w; c.lineCap = 'round'; c.globalAlpha = o.alpha != null ? o.alpha : 1;
        if (len > 0.5) {
          var ux = (bx - ax) / len, uy = (by - ay) / len, k = Math.min(h, len);
          c.setLineDash(dashOf(o)); c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx - ux * k * 0.8, by - uy * k * 0.8); c.stroke(); c.setLineDash([]);
          c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - ux * k - uy * k * 0.45, by - uy * k + ux * k * 0.45); c.lineTo(bx - ux * k + uy * k * 0.45, by - uy * k - ux * k * 0.45); c.closePath(); c.fill();
        }
        c.restore();
        if (o.label) {
          var size = 12, tw = richWidth(c, o.label, size, 600, F.ui);
          var lx = bx + 8, ly = by - 8, align = 'left';
          if (lx + tw > m.l + pw - 3) { lx = bx - 8; align = 'right'; }       // no room on the right of the tip: put the label on its left
          if (ly - size * 0.6 < m.t + 3) ly = by + 14;                        // no room above: below
          c.save(); c.fillStyle = col(o.labelColor, 'ink');
          drawRich(c, o.label, lx, ly, { align: align, baseline: 'middle', size: size, weight: 600, font: F.ui, halo: C.stage });
          c.restore();
        }
        return g;
      },
      /** g.text(x, y, str, {color, align, baseline, size, weight, font:'ui'|'mono'|'hand'|'body', dx, dy, halo}) — "x_1", "w_10", "w^{2}" give indices */
      text: function (x, y, str, o) {
        o = o || {};
        var f = F[o.font || 'ui'] || F.ui, size = o.size || (o.font === 'hand' ? 19 : 12);
        if (SELFTEST && /^(s[1-6]|key|keyline)$/.test(o.color || '')) stWarn(plot.w.id, 'g.text in colour "' + o.color + '": text never wears a series colour (use ink, soft, muted, good or bad)');
        c.save(); c.globalAlpha = o.alpha != null ? o.alpha : 1; c.fillStyle = col(o.color, 'ink');
        drawRich(c, str, X(x) + (o.dx || 0), Y(y) + (o.dy || 0), { align: o.align || 'left', baseline: o.baseline || 'middle', size: size, weight: o.weight || (o.font === 'hand' ? 600 : 500), font: f, halo: o.halo === false ? null : C.stage });
        c.restore(); return g;
      },
      /** g.rect(x1, y1, x2, y2, {color, alpha, fill, stroke, width, dash}) */
      rect: function (x1, y1, x2, y2, o) {
        o = o || {}; clip(1); c.beginPath(); c.rect(Math.min(X(x1), X(x2)), Math.min(Y(y1), Y(y2)), Math.abs(X(x2) - X(x1)), Math.abs(Y(y2) - Y(y1)));
        shape(o, 0.14); c.restore(); return g;
      },
      /** g.circle(x, y, r, {color, alpha, fill, stroke, width, dash, px}) — r in data units of x (px:true -> pixels) */
      circle: function (x, y, r, o) {
        o = o || {}; clip(1); c.beginPath();
        if (o.px) c.arc(X(x), Y(y), r, 0, Math.PI * 2);
        else c.ellipse(X(x), Y(y), Math.abs(r * pw / (v.x1 - v.x0)), Math.abs(r * ph / (v.y1 - v.y0)), 0, 0, Math.PI * 2);
        shape(o, 0.14); c.restore(); return g;
      },
      /** g.poly(points, {color, alpha, fill, stroke, width, dash}) — closed polygon */
      poly: function (P, o) {
        o = o || {}; clip(1); c.beginPath(); trace((P || []).map(xy)); c.closePath(); shape(o, 0.14); c.restore(); return g;
      },
      /**
       * g.heat(f(x, y), {mode, colors, alpha, cell, range}) — colour the plane by a function, e.g. decision regions.
       *  mode 'sign' (default): f < 0 -> colors[0], f > 0 -> colors[1]
       *  mode 'class': f returns an integer k -> colors[k]
       *  mode 'value': one colour, opacity grows from range[0] to range[1]
       *  mode 'diverging': like 'sign', opacity grows with |f| up to range[1]
       */
      heat: function (f, o) {
        o = o || {};
        var mode = o.mode || 'sign', cols = (o.colors || ['s1', 's2']).map(function (n) { return rgbOf(col(n)); }), alpha = o.alpha != null ? o.alpha : 0.16;
        var smooth = o.smooth != null ? !!o.smooth : (mode === 'value' || mode === 'diverging');
        var cell = Math.max(2, o.cell || (smooth ? 8 : 4)), nx = Math.max(1, Math.ceil(pw / cell)), ny = Math.max(1, Math.ceil(ph / cell));
        var lo = o.range ? o.range[0] : 0, hi = o.range ? o.range[1] : 1;
        var off = heatCanvas || (heatCanvas = doc.createElement('canvas'));
        off.width = nx; off.height = ny;
        var octx = off.getContext('2d'), img = octx.createImageData(nx, ny), D = img.data, k = 0;
        for (var j = 0; j < ny; j++) {
          var y = v.y1 - (j + 0.5) / ny * (v.y1 - v.y0);
          for (var i = 0; i < nx; i++, k += 4) {
            var x = v.x0 + (i + 0.5) / nx * (v.x1 - v.x0), val = f(x, y), a = alpha, rgb;
            if (val == null || isNaN(val)) continue;
            if (mode === 'class') { rgb = cols[val | 0]; if (!rgb) continue; }
            else if (mode === 'value') { rgb = cols[0]; a = alpha * clamp((val - lo) / (hi - lo || 1), 0, 1); }
            else if (mode === 'diverging') { rgb = val < 0 ? cols[0] : cols[1]; a = alpha * clamp(Math.abs(val) / (hi || 1), 0, 1); }
            else { if (val === 0) continue; rgb = val < 0 ? cols[0] : cols[1]; }
            D[k] = rgb[0]; D[k + 1] = rgb[1]; D[k + 2] = rgb[2]; D[k + 3] = Math.round(255 * clamp(a, 0, 1));
          }
        }
        octx.putImageData(img, 0, 0);
        clip(0); c.imageSmoothingEnabled = smooth; c.drawImage(off, m.l, m.t, pw, ph);
        c.restore(); return g;
      }
    };
    return g;
  }

  /* pointer: clicks, drags, hover */
  Plot.prototype._pos = function (ev) {
    var r = this.canvas.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top, d = this.toData(px, py), m = this.m;
    return { x: d.x, y: d.y, px: px, py: py, inside: px >= m.l && px <= m.l + this.pw && py >= m.t && py <= m.t + this.ph, down: this._down, event: ev };
  };
  Plot.prototype._hit = function (p, tol) {
    var best = null, bd = tol, self = this;
    this.drags.forEach(function (d) {
      d.list.forEach(function (pt, i) {
        var q = Array.isArray(pt) ? { x: pt[0], y: pt[1] } : pt, s = self.toPx(q.x, q.y), dist = Math.hypot(s.x - p.px, s.y - p.py);
        if (dist <= bd) { bd = dist; best = { d: d, pt: pt, i: i }; }
      });
    });
    return best;
  };
  Plot.prototype._moveTo = function (hit, x, y, p) {
    var o = hit.d.o, v = this.view, d = this.declared, bx, by;
    if (o.bounds === 'view') { bx = [v.x0, v.x1]; by = [v.y0, v.y1]; }
    else {
      /* default: the ranges the author declared (with equalAspect the visible view is wider than those),
         pulled in from the frame so that the grab ring stays whole */
      var ix = (o.r + 3) / this.pw * (v.x1 - v.x0), iy = (o.r + 3) / this.ph * (v.y1 - v.y0);
      bx = [Math.max(d.x0, v.x0 + ix), Math.min(d.x1, v.x1 - ix)]; by = [Math.max(d.y0, v.y0 + iy), Math.min(d.y1, v.y1 - iy)];
      if (o.bounds && typeof o.bounds === 'object') { if (o.bounds.x) bx = o.bounds.x; if (o.bounds.y) by = o.bounds.y; }
    }
    if (o.snap) { x = Math.round(x / o.snap) * o.snap; y = Math.round(y / o.snap) * o.snap; }
    x = clamp(x, bx[0], bx[1]); y = clamp(y, by[0], by[1]);
    if (o.axis === 'x') y = Array.isArray(hit.pt) ? hit.pt[1] : hit.pt.y;
    if (o.axis === 'y') x = Array.isArray(hit.pt) ? hit.pt[0] : hit.pt.x;
    if (Array.isArray(hit.pt)) { hit.pt[0] = x; hit.pt[1] = y; } else { hit.pt.x = x; hit.pt.y = y; }
    if (o.onDrag) this.w.safe(o.onDrag, 'draggable.onDrag')(hit.pt, hit.i, p);
    this.w.changed('drag');
  };
  Plot.prototype._bindPointer = function () {
    if (this._bound) return;
    this._bound = true;
    var self = this, cv = this.canvas;
    if (this.drags.length || this.h) cv.classList.add('is-interactive');
    /* Touch: the canvas scrolls with the page (touch-action: pan-y). A finger that lands on a drag handle
       must move the point instead, so only that touch is taken away from the browser. */
    cv.addEventListener('touchstart', function (ev) {
      if (!self.drags.length || !ev.touches || !ev.touches.length) return;
      var t = ev.touches[0], r = cv.getBoundingClientRect();
      if (self._hit({ px: t.clientX - r.left, py: t.clientY - r.top }, 30) && ev.cancelable) ev.preventDefault();
    }, { passive: false });
    cv.addEventListener('pointerdown', function (ev) {
      if (ev.button > 0) return;
      var p = self._pos(ev), hit = self._hit(p, ev.pointerType === 'touch' ? 30 : 18);
      if (hit) {
        self._drag = hit; self._active = hit; cv.classList.add('is-grabbing');
        try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic pointer */ }
        ev.preventDefault(); self._moveTo(hit, p.x, p.y, p);
        return;
      }
      if (self.h) {
        /* a finger on a plot without a move handler: wait for the release. A swipe scrolls the page (the browser
           cancels the pointer); a tap arrives as down + up together. */
        if (ev.pointerType === 'touch' && !self.h.move) { self._tap = { id: ev.pointerId, px: p.px, py: p.py }; return; }
        self._down = true; p.down = true;
        try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic pointer */ }
        if (self.h.down) { self.w.safe(self.h.down, 'onPointer.down')(p); self.w.changed('pointer'); }
      }
    });
    cv.addEventListener('pointermove', function (ev) {
      var p = self._pos(ev);
      if (self._drag) { self._moveTo(self._drag, p.x, p.y, p); return; }
      if (self.drags.length) cv.classList.toggle('is-grab', !!self._hit(p, 18));
      if (self.h && self.h.move) { self.w.safe(self.h.move, 'onPointer.move')(p); if (self._down) self.w.changed('pointer'); }
      if (self.o.hover && ev.pointerType !== 'touch') { self.ptr = p.inside ? p : null; self.redraw(); }
    });
    function end(ev) {
      var p = self._pos(ev);
      if (self._drag) {
        var d = self._drag; self._drag = null; cv.classList.remove('is-grabbing');
        if (d.d.o.onEnd) self.w.safe(d.d.o.onEnd, 'draggable.onEnd')(d.pt, d.i);
        self.w.changed('drag');
        return;
      }
      if (self._tap && self._tap.id === ev.pointerId) {
        var tap = self._tap; self._tap = null;
        if (ev.type === 'pointerup' && self.h && Math.hypot(p.px - tap.px, p.py - tap.py) < 12) {
          p.down = true; if (self.h.down) self.w.safe(self.h.down, 'onPointer.down')(p);
          p.down = false; if (self.h.up) self.w.safe(self.h.up, 'onPointer.up')(p);
          self.w.changed('pointer');
        }
        return;
      }
      if (self._down) { self._down = false; if (self.h && self.h.up) self.w.safe(self.h.up, 'onPointer.up')(p); self.w.changed('pointer'); }
    }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', function () { if (self.ptr) { self.ptr = null; self.redraw(); } });
    cv.addEventListener('keydown', function (ev) {
      if (!self.drags.length) return;
      var all = [];
      self.drags.forEach(function (d) { d.list.forEach(function (pt, i) { all.push({ d: d, pt: pt, i: i }); }); });
      if (!all.length) return;
      var cur = 0;
      if (self._active) all.forEach(function (a, k) { if (a.pt === self._active.pt) cur = k; });
      if (ev.key === ' ' || ev.key === 'Enter') { self._active = all[(cur + 1) % all.length]; self.redraw(); ev.preventDefault(); return; }
      var dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[ev.key];
      if (!dir) return;
      ev.preventDefault();
      var hit = self._active = all[cur], v = self.view, k = ev.shiftKey ? 0.1 : 0.02;
      var q = Array.isArray(hit.pt) ? { x: hit.pt[0], y: hit.pt[1] } : hit.pt;
      var sx = hit.d.o.snap || (v.x1 - v.x0) * k, sy = hit.d.o.snap || (v.y1 - v.y0) * k;
      self._moveTo(hit, q.x + dir[0] * sx, q.y + dir[1] * sy, null);
      if (hit.d.o.onEnd) self.w.safe(hit.d.o.onEnd, 'draggable.onEnd')(hit.pt, hit.i);
    });
    cv.addEventListener('focus', function () { self.redraw(); });
    cv.addEventListener('blur', function () { self.redraw(); });
  };
  /**
   * plot.onPointer({down(p), move(p), up(p)}) — p = {x, y, px, py, inside, down, event} in data coordinates; mouse and touch.
   * Without `move` (click to add a point) the plot still scrolls with the page under a finger, and a tap calls down + up.
   * With `move` (free drawing, scrubbing) the plot captures the finger: the page cannot be scrolled from it — keep such plots short.
   */
  Plot.prototype.onPointer = function (h) {
    this.h = h || null; this._bindPointer();
    this.canvas.classList.add('is-interactive');
    this.canvas.classList.toggle('is-capture', !!(h && h.move));
    return this;
  };
  /**
   * plot.draggable(list, {r, color, onDrag(pt, i), onEnd(pt, i), bounds, snap, axis, show})
   * list: array of {x, y} objects (or [x, y] pairs); the toolkit moves them in place and redraws.
   * bounds: default = the declared x / y ranges of the plot; {x:[a,b], y:[c,d]}; or 'view' = everything visible.
   */
  Plot.prototype.draggable = function (list, o) {
    if (!Array.isArray(list) || (list.length === 2 && typeof list[0] === 'number')) list = [list];
    this.drags.push({ list: list, o: Object.assign({ r: 9, color: 'ink', show: true, bounds: null, snap: 0 }, o || {}) });
    this._bindPointer();
    this.canvas.classList.add('is-interactive');
    this.canvas.tabIndex = 0;
    var base = this.o.label || 'Chart';
    /* it takes arrow keys, so it is not a plain image for assistive technology */
    this.canvas.setAttribute('role', 'application');
    this.canvas.setAttribute('aria-roledescription', 'chart with draggable points');
    this.canvas.setAttribute('aria-label', base + '. Drag the points with the mouse or a finger; from the keyboard use the arrow keys, space selects the next point.');
    this.redraw();
    return this;
  };
  Plot.prototype._handles = function () {
    if (!this.drags.length) return;
    var c = this.ctx, C = Course.colors(), self = this, focused = doc.activeElement === this.canvas;
    this.drags.forEach(function (d) {
      if (d.o.show === false) return;
      d.list.forEach(function (pt) {
        var q = Array.isArray(pt) ? { x: pt[0], y: pt[1] } : pt, s = self.toPx(q.x, q.y);
        if (!isFinite(s.x) || !isFinite(s.y)) return;
        c.save();
        c.beginPath(); c.arc(s.x, s.y, d.o.r + 2, 0, Math.PI * 2); c.strokeStyle = C.stage; c.lineWidth = 5; c.stroke();
        c.beginPath(); c.arc(s.x, s.y, d.o.r + 2, 0, Math.PI * 2); c.strokeStyle = C[d.o.color] || C.ink; c.lineWidth = 2; c.setLineDash([4, 3]); c.stroke();
        if (focused && self._active && self._active.pt === pt) { c.setLineDash([]); c.beginPath(); c.arc(s.x, s.y, d.o.r + 7, 0, Math.PI * 2); c.strokeStyle = C.focus; c.lineWidth = 2; c.stroke(); }
        c.restore();
      });
    });
  };
  Plot.prototype._hover = function () {
    var p = this.ptr, o = this.o;
    if (!o.hover || !p) return;
    var c = this.ctx, C = Course.colors(), F = fonts(), m = this.m;
    var text = typeof o.hover === 'function' ? null : 'x = ' + fmt(p.x, stepDecimals(this.xStep) + 1) + '   y = ' + fmt(p.y, stepDecimals(this.yStep) + 1);
    var hx = p.px, hy = p.py;
    if (typeof o.hover === 'function') {
      var res; try { res = o.hover(p); } catch (e) { this.w.fail(e, 'plot hover'); return; }
      if (res && typeof res === 'object') { text = res.text; if (res.x != null && res.y != null) { var q = this.toPx(res.x, res.y); hx = q.x; hy = q.y; } }
      else text = res;
    }
    c.save(); c.strokeStyle = C.line2; c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(Math.round(hx) + 0.5, m.t); c.lineTo(Math.round(hx) + 0.5, m.t + this.ph); c.moveTo(m.l, Math.round(hy) + 0.5); c.lineTo(m.l + this.pw, Math.round(hy) + 0.5); c.stroke();
    if (hx !== p.px || hy !== p.py) { c.setLineDash([]); c.beginPath(); c.arc(hx, hy, 4, 0, Math.PI * 2); c.fillStyle = C.ink; c.fill(); c.strokeStyle = C.stage; c.lineWidth = 2; c.stroke(); c.strokeStyle = C.line2; c.lineWidth = 1; }
    if (text) {
      c.setLineDash([]); c.font = '11px ' + F.mono;
      var w = c.measureText(text).width + 12, bx = clamp(hx + 10, m.l + 2, m.l + this.pw - w - 2), by = clamp(hy - 28, m.t + 2, m.t + this.ph - 22);
      c.fillStyle = C.paper2; c.strokeStyle = C.line2; c.beginPath(); c.rect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(w), 20); c.fill(); c.stroke();
      c.fillStyle = C.ink; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(text, bx + 6, by + 11);
    }
    c.restore();
  };

  /* ------------------------------------------------------------------------
     11. Course.net — SVG feed-forward network diagram
     ------------------------------------------------------------------------ */
  /**
   * Course.net(container, {layers, labels, layerLabels, weights, bias, width, gap, r, maxUnits, io, ariaLabel}) -> handle
   * Styled entirely through CSS classes, so it follows the theme by itself.
   */
  Course.net = function (container, o) {
    if (typeof container === 'string') container = doc.getElementById(container) || doc.querySelector(container);
    if (!container) throw new Error('Course.net: container not found');
    o = Object.assign({ layers: [2, 3, 1], labels: null, layerLabels: null, weights: null, bias: false, width: 640, gap: 64, r: 20, maxUnits: 7, io: false, ariaLabel: '' }, o || {});
    var sizes = o.layers.map(function (n) { return Math.max(1, n | 0); }), Ln = sizes.length;
    container.classList.add('net');
    var s = svg('svg', { 'class': 'net-svg', role: 'img', 'aria-label': o.ariaLabel || ('Neural network with layers ' + sizes.join('–')) });
    var gEdges = svg('g', { 'class': 'net-edges' }, s), gFlow = svg('g', { 'class': 'net-flows' }, s), gIO = svg('g', null, s),
      gNodes = svg('g', { 'class': 'net-nodes' }, s), gLabels = svg('g', null, s);

    /* visible slots per layer: units, an ellipsis for big layers, an optional bias unit */
    var slots = sizes.map(function (n, l) {
      var list = [], i;
      if (n <= o.maxUnits) for (i = 0; i < n; i++) list.push({ i: i });
      else { for (i = 0; i < o.maxUnits - 2; i++) list.push({ i: i }); list.push({ dots: true }); list.push({ i: n - 1 }); }
      if (o.bias && l < Ln - 1) list.push({ i: 'b', bias: true });
      return list;
    });
    var nodes = {}, edges = {}, nodeList = [], edgeList = [], dotEls = [], layerEls = [], ioEls = [];
    function key() { return Array.prototype.join.call(arguments, ':'); }
    var noopHandle = (function () {
      var h = {}; ['highlight', 'dim', 'drop', 'color', 'label', 'value', 'width'].forEach(function (k) { h[k] = function () { return h; }; }); h.el = null; h.missing = true; return h;
    })();
    function cls(node, name, on) { node.classList.toggle(name, on === undefined ? true : !!on); }
    function setColor(node, name) {
      Array.prototype.slice.call(node.classList).forEach(function (c) { if (c.indexOf('c-') === 0) node.classList.remove(c); });
      if (name) node.classList.add('c-' + name);
    }

    slots.forEach(function (list, l) {
      list.forEach(function (sl) {
        if (sl.dots) { var d = svg('text', { 'class': 'net-dots' }, gNodes); d.textContent = '⋮'; sl.el = d; dotEls.push(sl); return; }
        var gN = svg('g', { 'class': 'net-node' + (sl.bias ? ' is-bias' : ''), 'data-layer': l, 'data-unit': sl.i }, gNodes);
        var circle = svg('circle', { r: o.r }, gN);
        var x1 = svg('line', { 'class': 'net-x' }, gN), x2 = svg('line', { 'class': 'net-x' }, gN);
        var text = svg('text', { 'class': 'net-label' }, gN), val = svg('text', { 'class': 'net-val' }, gN);
        var lab = sl.bias ? '1' : (o.labels && o.labels[l] && o.labels[l][sl.i] != null ? o.labels[l][sl.i] : (o.labels && o.labels[l] && sizes[l] > o.maxUnits && sl.i === sizes[l] - 1 ? o.labels[l][o.labels[l].length - 1] : ''));
        setRich(text, lab || '');
        var n = { g: gN, circle: circle, x1: x1, x2: x2, text: text, val: val, l: l, i: sl.i, sl: sl };
        n.handle = {
          el: gN,
          highlight: function (on) { cls(gN, 'is-hi', on); return n.handle; },
          dim: function (on) { cls(gN, 'is-dim', on); return n.handle; },
          drop: function (on) { cls(gN, 'is-drop', on); return n.handle; },
          color: function (name) { setColor(gN, name); return n.handle; },
          label: function (t) { setRich(text, t == null ? '' : t); return n.handle; },
          value: function (v, digits) { val.textContent = v == null || v === '' ? '' : typeof v === 'number' ? fmt(v, digits == null ? 2 : digits) : String(v); return n.handle; }
        };
        sl.node = n; nodes[key(l, sl.i)] = n; nodeList.push(n);
      });
    });
    for (var l = 0; l < Ln - 1; l++) {
      slots[l].forEach(function (a) {
        if (a.dots) return;
        slots[l + 1].forEach(function (b) {
          if (b.dots || b.bias) return;
          var line = svg('line', { 'class': 'net-edge' }, gEdges);
          var e = { line: line, l: l, i: a.i, j: b.i, a: a, b: b, label: null, flow: null, dir: null };
          e.handle = {
            el: line,
            highlight: function (on) { cls(line, 'is-hi', on); return e.handle; },
            dim: function (on) { cls(line, 'is-dim', on); if (e.label) cls(e.label.g, 'is-dim', on); return e.handle; },
            drop: function (on) { cls(line, 'is-drop', on); if (e.label) cls(e.label.g, 'is-dim', on); return e.handle; },
            color: function (name) { setColor(line, name); return e.handle; },
            width: function (px) { if (px == null) line.style.strokeWidth = ''; else line.style.strokeWidth = (+px).toFixed(2) + 'px'; return e.handle; },
            /* the number sits on a small paper-coloured plate, so the connection never strikes through it */
            label: function (t) {
              if (t == null || t === '') { if (e.label) { e.label.g.parentNode.removeChild(e.label.g); e.label = null; } return e.handle; }
              if (typeof t === 'number') t = fmt(t, 1);
              if (!e.label) {
                var gl = svg('g', { 'class': 'net-edge-label' }, gLabels);
                e.label = { g: gl, rect: svg('rect', { rx: 3, ry: 3 }, gl), text: svg('text', null, gl) };
              }
              e.label.text.textContent = String(t);
              placeLabel(e);
              return e.handle;
            }
          };
          edges[key(l, a.i, b.i)] = e; edgeList.push(e);
        });
      });
    }
    if (o.layerLabels) o.layerLabels.forEach(function (t, l) { if (l >= Ln || t == null) return; var te = svg('text', { 'class': 'net-layer-label' }, gLabels); te.textContent = t; layerEls[l] = te; });
    if (o.io) {
      slots[0].forEach(function (sl) { if (sl.node && !sl.bias) ioEls.push({ sl: sl, side: -1, el: svg('line', { 'class': 'net-io', 'marker-end': 'url(#arr-muted)' }, gIO) }); });
      slots[Ln - 1].forEach(function (sl) { if (sl.node) ioEls.push({ sl: sl, side: 1, el: svg('line', { 'class': 'net-io', 'marker-end': 'url(#arr-muted)' }, gIO) }); });
    }
    container.appendChild(s);

    var W = 0, R = o.r;
    /* labels of one layer are staggered along the connections by source unit (26 %, 50 %, 74 % of the way),
       so the numbers of crossing connections do not land on each other */
    var LABEL_AT = [0.26, 0.5, 0.74];
    function placeLabel(e) {
      if (!e.label || e.a.x == null) return;
      var k = slots[e.l].indexOf(e.a), t = LABEL_AT[(k < 0 ? 0 : k) % LABEL_AT.length];
      var x = e.a.x + (e.b.x - e.a.x) * t, y = e.a.y + (e.b.y - e.a.y) * t;
      var w = String(e.label.text.textContent).length * 6.7 + 7, h = 15;     // 11 px mono: no measuring, works in a hidden tab too
      e.label.text.setAttribute('x', x.toFixed(1)); e.label.text.setAttribute('y', y.toFixed(1));
      e.label.rect.setAttribute('x', (x - w / 2).toFixed(1)); e.label.rect.setAttribute('y', (y - h / 2).toFixed(1));
      e.label.rect.setAttribute('width', w.toFixed(1)); e.label.rect.setAttribute('height', h);
    }
    /* the travelling dots and the arrowhead of net.flow(): drawn from rim to rim, so the head is not hidden under the unit */
    function placeFlow(e) {
      if (!e.flow || e.a.x == null) return;
      var dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      var ra = (e.a.bias ? R * 0.72 : R) + 3, rb = R + 3;
      e.flow.setAttribute('x1', (e.a.x + ux * ra).toFixed(1)); e.flow.setAttribute('y1', (e.a.y + uy * ra).toFixed(1));
      e.flow.setAttribute('x2', (e.b.x - ux * rb).toFixed(1)); e.flow.setAttribute('y2', (e.b.y - uy * rb).toFixed(1));
    }
    var flowPending = false;
    function applyFlow() {
      flowPending = false;
      edgeList.forEach(function (e) {
        var dir = e.want || null;
        if (dir === e.dir) return;
        e.dir = dir;
        if (!dir) { if (e.flow) { gFlow.removeChild(e.flow); e.flow = null; } return; }
        if (!e.flow) { e.flow = svg('line', { 'class': 'net-flow' }, gFlow); placeFlow(e); }
        e.flow.classList.toggle('is-back', dir === 'backward');
        if (dir === 'forward') { e.flow.setAttribute('marker-end', 'url(#arr)'); e.flow.removeAttribute('marker-start'); }
        else { e.flow.setAttribute('marker-start', 'url(#arr)'); e.flow.removeAttribute('marker-end'); }
      });
    }
    function place() {
      var avail = container.clientWidth || o.width;
      var w = clamp(avail, 260, o.width);
      W = w;
      var compact = w < 440, r = compact ? Math.min(o.r, 16) : o.r, gap = compact ? Math.min(o.gap, 54) : o.gap;
      R = r;
      var maxSlots = Math.max.apply(null, slots.map(function (x) { return x.length; }));
      var top = 14, bottom = (o.layerLabels ? 30 : 12), H = top + maxSlots * gap + bottom;
      var padX = r + (o.io ? 40 : 10);
      s.setAttribute('viewBox', '0 0 ' + w + ' ' + H);
      s.style.maxWidth = o.width + 'px';
      slots.forEach(function (list, l) {
        var x = Ln === 1 ? w / 2 : padX + l * (w - 2 * padX) / (Ln - 1);
        list.forEach(function (sl, k) {
          sl.x = x; sl.y = top + (maxSlots - list.length) / 2 * gap + k * gap + gap / 2;
          if (sl.dots) { sl.el.setAttribute('x', x); sl.el.setAttribute('y', sl.y); return; }
          var n = sl.node, rr = sl.bias ? r * 0.72 : r;
          n.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + sl.y.toFixed(1) + ')');
          n.circle.setAttribute('r', rr);
          n.x1.setAttribute('x1', -rr * 0.62); n.x1.setAttribute('y1', -rr * 0.62); n.x1.setAttribute('x2', rr * 0.62); n.x1.setAttribute('y2', rr * 0.62);
          n.x2.setAttribute('x1', rr * 0.62); n.x2.setAttribute('y1', -rr * 0.62); n.x2.setAttribute('x2', -rr * 0.62); n.x2.setAttribute('y2', rr * 0.62);
          n.val.setAttribute('y', rr + 11);
        });
        if (layerEls[l]) { layerEls[l].setAttribute('x', x); layerEls[l].setAttribute('y', H - 8); }
      });
      edgeList.forEach(function (e) {
        e.line.setAttribute('x1', e.a.x); e.line.setAttribute('y1', e.a.y); e.line.setAttribute('x2', e.b.x); e.line.setAttribute('y2', e.b.y);
        placeLabel(e); placeFlow(e);
      });
      ioEls.forEach(function (q) {
        var x0 = q.side < 0 ? q.sl.x - r - 32 : q.sl.x + r + 2, x1 = q.side < 0 ? q.sl.x - r - 3 : q.sl.x + r + 32;
        q.el.setAttribute('x1', x0); q.el.setAttribute('y1', q.sl.y); q.el.setAttribute('x2', x1); q.el.setAttribute('y2', q.sl.y);
      });
    }
    place();
    /* the new viewBox changes the height of the observed box: apply it in the next frame, outside the observer delivery */
    var netRaf = 0;
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      if (netRaf) return;
      netRaf = nextFrame(function () { netRaf = 0; var a = clamp(container.clientWidth || o.width, 260, o.width); if (Math.abs(a - W) > 2) place(); });
    }).observe(container);

    var api = {
      el: s, layers: sizes.slice(),
      /** net.node(layer, unit) — unit index, or 'b' for the bias unit */
      node: function (l, i) { var n = nodes[key(l, i)]; return n ? n.handle : noopHandle; },
      /** net.edge(layer, from, to) — the connection from unit `from` of `layer` to unit `to` of the next layer */
      edge: function (l, i, j) { var e = edges[key(l, i, j)]; return e ? e.handle : noopHandle; },
      nodes: function (l) { return nodeList.filter(function (n) { return l == null || n.l === l; }).map(function (n) { return n.handle; }); },
      edges: function (l) { return edgeList.filter(function (e) { return l == null || e.l === l; }).map(function (e) { return e.handle; }); },
      /** net.setWeights([W1, W2, …], {max, biases, labels}) — W[l][j][i]: weight from unit i of layer l to unit j of layer l+1 */
      setWeights: function (Ws, opt) {
        opt = opt || {};
        var max = opt.max || 0;
        if (!max) edgeList.forEach(function (e) { var w = weightOf(e); if (w != null) max = Math.max(max, Math.abs(w)); });
        if (!max) max = 1;
        function weightOf(e) {
          if (e.i === 'b') { var B = opt.biases && opt.biases[e.l]; return B && B[e.j] != null ? +B[e.j] : null; }
          var M = Ws && Ws[e.l]; return M && M[e.j] && M[e.j][e.i] != null ? +M[e.j][e.i] : null;
        }
        edgeList.forEach(function (e) {
          var w = weightOf(e);
          if (w == null) { e.line.classList.remove('is-pos', 'is-neg'); e.handle.width(null); return; }
          e.line.classList.toggle('is-pos', w > 0); e.line.classList.toggle('is-neg', w < 0);
          e.handle.width(0.7 + 4.3 * Math.min(1, Math.abs(w) / max));
          if (opt.labels) e.handle.label(fmt(w, opt.digits == null ? 1 : opt.digits));
        });
        return api;
      },
      /**
       * net.setValues([[…], […], …], {digits}) — a number (or text) under every unit. It replaces ALL values:
       * a layer that is null or missing is cleared (partial reveal: setValues([[1, 2], null, null])).
       * Numbers get `digits` decimals (default 2), strings are shown as they are.
       */
      setValues: function (vals, opt) {
        opt = opt || {};
        nodeList.forEach(function (n) { if (n.i === 'b') return; var V = vals && vals[n.l]; n.handle.value(V && V[n.i] != null ? V[n.i] : null, opt.digits); });
        return api;
      },
      highlightLayer: function (l, on) { nodeList.forEach(function (n) { if (n.l === l) n.handle.highlight(on); }); return api; },
      /** net.path([[layer, unit], …], {dimRest}) — highlight units and the connections between consecutive ones */
      path: function (list, opt) {
        opt = opt || {};
        if (opt.dimRest !== false) { nodeList.forEach(function (n) { n.handle.dim(true); }); edgeList.forEach(function (e) { e.handle.dim(true); }); }
        (list || []).forEach(function (p, k) {
          api.node(p[0], p[1]).dim(false).highlight(true);
          if (k > 0 && list[k - 1][0] === p[0] - 1) api.edge(p[0] - 1, list[k - 1][1], p[1]).dim(false).highlight(true);
        });
        return api;
      },
      /** net.dropout(layer, [units]) — mark units as dropped and fade their connections */
      dropout: function (l, units) {
        nodeList.forEach(function (n) { if (n.l === l && n.i !== 'b') n.handle.drop(units.indexOf(n.i) >= 0); });
        edgeList.forEach(function (e) {
          var dropA = nodes[key(e.l, e.i)] && nodes[key(e.l, e.i)].g.classList.contains('is-drop');
          var dropB = nodes[key(e.l + 1, e.j)] && nodes[key(e.l + 1, e.j)].g.classList.contains('is-drop');
          e.handle.drop(dropA || dropB);
        });
        return api;
      },
      /**
       * net.flow(layer | 'all', 'forward' | 'backward' | false) — the signal moving along connections:
       * dots travel over each connection and an arrowhead at its end shows the direction (so a still frame,
       * or reduced motion, still tells forward from backward). The connection itself keeps its colour and dash.
       */
      flow: function (l, dir) {
        if (dir !== 'forward' && dir !== 'backward') dir = null;
        edgeList.forEach(function (e) { if (l === 'all' || e.l === l) e.want = dir; });
        /* applied once per tick: the usual "net.reset(); net.flow(…)" inside ui.onChange does not restart the animation */
        if (!flowPending) { flowPending = true; Promise.resolve().then(applyFlow); }
        return api;
      },
      /** net.reset({weights, values, flow}) — remove highlight / dim / drop / colours (weights and values stay unless asked; flow stops unless flow: false) */
      reset: function (opt) {
        opt = opt || {};
        nodeList.forEach(function (n) { n.g.classList.remove('is-hi', 'is-dim', 'is-drop'); setColor(n.g, null); if (opt.values) n.handle.value(null); });
        edgeList.forEach(function (e) {
          e.line.classList.remove('is-hi', 'is-dim', 'is-drop'); setColor(e.line, null);
          if (e.label) e.label.g.classList.remove('is-dim');
          if (opt.weights) { e.line.classList.remove('is-pos', 'is-neg'); e.handle.width(null); e.handle.label(null); }
        });
        if (opt.flow !== false) api.flow('all', false);
        return api;
      },
      /** net.onNode(fn(layer, unit, handle)) — make units clickable (mouse, touch, Enter / Space) */
      onNode: function (fn) {
        nodeList.forEach(function (n) {
          n.g.setAttribute('role', 'button'); n.g.setAttribute('tabindex', '0');
          n.g.setAttribute('aria-label', 'Neuron ' + (n.i === 'b' ? 'bias' : (n.i + 1)) + ', layer ' + (n.l + 1));
          function go(ev) { try { fn(n.l, n.i, n.handle, ev); } catch (e) { report('net.onNode', e); } }
          n.g.addEventListener('click', go);
          n.g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(ev); } });
        });
        return api;
      },
      relayout: place
    };
    if (o.weights) api.setWeights(o.weights);
    allNets.push(api);
    return api;
  };

  /* ------------------------------------------------------------------------
     12. Self-test (?selftest=1)
     Exercises every control of every widget (repainting after each single state), then checks the page against
     the authoring contract of COMPONENTS.md. "SELFTEST FAIL: …" = must be fixed; "SELFTEST WARN: …" = advice.
     ------------------------------------------------------------------------ */
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fire(node, type) { node.dispatchEvent(new Event(type, { bubbles: true })); }
  function cssPath(n) {
    var parts = [];
    while (n && n.nodeType === 1 && n !== doc.body && parts.length < 4) {
      parts.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : n.classList.length ? '.' + Array.prototype.slice.call(n.classList, 0, 2).join('.') : ''));
      n = n.parentNode;
    }
    return parts.join(' > ');
  }
  function stFail(ctx, msg) { stCounts.fail++; console.error('SELFTEST FAIL: ' + ctx + ': ' + msg); }
  function stWarn(ctx, msg) {
    var k = 'w:' + ctx + ':' + msg;
    if (warned[k]) return;
    warned[k] = 1; stCounts.warn++;
    console.warn('SELFTEST WARN: ' + ctx + ': ' + msg);
  }
  function short(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > (n || 60) ? s.slice(0, n || 60) + '…' : s; }

  var CSS_COLOUR = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-z_-])|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(|:\s*(?:red|blue|green|white|black|orange|yellow|gray|grey|purple|pink|brown|cyan|magenta|navy|teal)\b/i;
  var JS_COLOUR = /['"`]\s*#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\s*['"`]|\b(?:rgb|rgba|hsl|hsla)\(\s*[\d.]/i;
  var HAND_OK = /^[\u0009\u000A\u000D -ɏЀ-ԯ‐-‧‰-› №−]*$/;

  function runSelfTest() {
    var counts = { widgets: 0, controls: 0, math: 0 };
    var main = chrome.main || doc.body;
    function drawNow(rootEl) { allPlots.forEach(function (p) { if (rootEl.contains(p.canvas)) p._drawNow(); }); }
    /* one interaction, then a synchronous repaint: a crash of plot.draw in THIS state is reported for this state
       (redraws are normally coalesced, which would hide a crash at a slider's min or max) */
    function guard(ctx, fn, rootEl) {
      stCtx = ctx;
      try { fn(); if (rootEl) drawNow(rootEl); } catch (e) { stFail(ctx, (e && e.message) || e); }
      stCtx = '';
    }

    /* A mark for the page checker (tools/check_page), which hides these lines: when the page never answers again - a
       loop that does not end at some value of a control - the last mark says which widget, which control, which value. */
    function at(what) { console.log('SELFTEST AT ' + what); }
    function ctlName(rootEl, node) {
      var lab = node.id ? rootEl.querySelector('label[for="' + node.id + '"]') : null;
      var t = lab ? (lab.querySelector('.ctl-label') || lab).textContent : (node.getAttribute('aria-label') || node.textContent);
      return '"' + short(t, 40) + '"';
    }

    function exercise(rootEl, ctx, w) {
      var ranges = rootEl.querySelectorAll('input[type="range"]');
      Array.prototype.forEach.call(ranges, function (inp) {
        var min = parseFloat(inp.min || '0'), max = parseFloat(inp.max || '100'), start = inp.value, name = ctlName(rootEl, inp);
        [[min, 'its minimum'], [max, 'its maximum'], [(min + max) / 2, 'the middle'], [start, 'its initial value']].forEach(function (v) {
          at('widget ' + ctx + ', slider ' + name + ' set to ' + v[0] + ' (' + v[1] + ')');
          guard(ctx, function () { inp.value = String(v[0]); fire(inp, 'input'); fire(inp, 'change'); }, rootEl);
        });
        counts.controls++;
      });
      var selects = rootEl.querySelectorAll('select');
      Array.prototype.forEach.call(selects, function (sel) {
        var start = sel.selectedIndex, name = ctlName(rootEl, sel);
        for (var k = sel.options.length - 1; k >= 0; k--) (function (k) {
          at('widget ' + ctx + ', select ' + name + ' set to option ' + (k + 1) + ' "' + short(sel.options[k].textContent, 30) + '"');
          guard(ctx, function () { sel.selectedIndex = k; fire(sel, 'change'); }, rootEl);
        })(k);
        guard(ctx, function () { sel.selectedIndex = start; fire(sel, 'change'); }, rootEl);
        counts.controls++;
      });
      var checks = rootEl.querySelectorAll('input[type="checkbox"]');
      Array.prototype.forEach.call(checks, function (cb) {
        at('widget ' + ctx + ', toggle ' + ctlName(rootEl, cb) + ' switched both ways');
        guard(ctx, function () { cb.click(); }, rootEl); guard(ctx, function () { cb.click(); }, rootEl);
        counts.controls++;
      });
      var buttons = rootEl.querySelectorAll('button:not(.opt)');
      Array.prototype.forEach.call(buttons, function (b) {
        at('widget ' + ctx + ', button ' + ctlName(rootEl, b) + ' pressed three times');
        for (var k = 0; k < 3; k++) guard(ctx, function () { if (!b.disabled && b.isConnected) b.click(); }, rootEl);
        counts.controls++;
      });
      if (w && w.ctx) {
        w.ctx.timers.forEach(function (stop) { try { stop(); } catch (e) { /* ignore */ } });
        w.ctx.steppers.forEach(function (s) {                      // every step, in order
          for (var k = 0; k < s.count; k++) (function (k) {
            at('widget ' + ctx + ', stepper at step ' + (k + 1) + ' of ' + s.count);
            guard(ctx, function () { s.go(k); }, rootEl);
          })(k);
          guard(ctx, function () { s.reset(); }, rootEl);
          counts.controls++;
        });
        w.ctx.players.forEach(function (p) {                       // a training loop: to its end when it is short, else 60 ticks
          guard(ctx, function () { p.api.reset(); }, rootEl);
          var n = isFinite(p.api.max) && p.api.max <= 200 ? p.api.max : 60;
          at('widget ' + ctx + ', player run for ' + n + ' ticks and reset');
          for (var k = 0; k < n; k++) guard(ctx, function () { p.tick(); }, rootEl);
          guard(ctx, function () { p.api.reset(); }, rootEl);
          counts.controls++;
        });
      }
      at('widget ' + ctx + ', pointer and keyboard on its plots and network units');
      var canvases = rootEl.querySelectorAll('.plot canvas');
      Array.prototype.forEach.call(canvases, function (cv) {
        var plot = null; allPlots.forEach(function (p) { if (p.canvas === cv) plot = p; });
        if (!plot || !plot._bound) return;
        var r = cv.getBoundingClientRect();
        function pe(type, fx, fy) { cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy })); }
        function key(k) { cv.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
        if (plot.drags.length) {                                    // grab the first draggable point, move it, put it back
          var pt = plot.drags[0].list[0], q = Array.isArray(pt) ? { x: pt[0], y: pt[1] } : { x: pt.x, y: pt.y }, s = plot.toPx(q.x, q.y);
          guard(ctx, function () { pe('pointerdown', s.x / r.width, s.y / r.height); pe('pointermove', 0.3, 0.3); }, rootEl);
          guard(ctx, function () { pe('pointermove', 0.7, 0.6); pe('pointerup', 0.7, 0.6); }, rootEl);
          guard(ctx, function () { pe('pointerdown', 0.7, 0.6); pe('pointermove', s.x / r.width, s.y / r.height); pe('pointerup', s.x / r.width, s.y / r.height); }, rootEl);
          guard(ctx, function () { key('ArrowRight'); key('ArrowUp'); }, rootEl);
          guard(ctx, function () { key('ArrowLeft'); key('ArrowDown'); key(' '); }, rootEl);
          guard(ctx, function () { if (Array.isArray(pt)) { pt[0] = q.x; pt[1] = q.y; } else { pt.x = q.x; pt.y = q.y; } w.ctx.changed('drag'); }, rootEl);
        }
        guard(ctx, function () { pe('pointerdown', 0.5, 0.5); pe('pointermove', 0.55, 0.45); pe('pointerup', 0.55, 0.45); }, rootEl);
        counts.controls++;
      });
      var nodesBtn = rootEl.querySelectorAll('.net-node[role="button"]');
      Array.prototype.forEach.call(nodesBtn, function (n) { guard(ctx, function () { n.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, rootEl); counts.controls++; });
      if (w && w.ctx) w.ctx.timers.forEach(function (stop) { try { stop(); } catch (e) { /* ignore */ } });
    }

    /* ---- contract checks ---------------------------------------------------- */
    function each(sel, fn, scope) { Array.prototype.forEach.call((scope || doc).querySelectorAll(sel), fn); }
    function authorSvg(s) {
      return !(s.classList.contains('ico') || s.classList.contains('lg-key') || s.classList.contains('net-svg') || s.id === 'course-sprite' || s.closest('mjx-container, .net'));
    }

    function checkPage() {
      var L = chrome.lesson;
      /* the lesson id and the file name must be the pair written in the syllabus (an unknown id was already reported at boot);
         a scratch copy of a lesson, "_l07b.html" with data-lesson="l07", is not the lesson and is left alone */
      if (L && chrome.file && !chrome.draft && baseName(L.file).toLowerCase() !== chrome.file.toLowerCase())
        stFail('page', 'data-lesson="' + chrome.id + '" belongs to ' + L.file + ' in assets/syllabus.js, but this file is ' + chrome.file);
      if (!CFG.hasId) stWarn('page', 'assets/syllabus.js has no course.id: progress is stored under a key made from the title ("' + STORE_KEY + '"); give the course an id of its own');
      if (!doc.title || !/\S/.test(doc.title)) stFail('page', 'the page has no <title>');
      else if (!chrome.isHub && doc.title.indexOf(syllabus().course.title) < 0) stWarn('page', '<title> should be "Lesson title · ' + syllabus().course.title + '"');
      /* allowed hosts: scripts from cdnjs, stylesheets from Google Fonts, everything else local */
      each('script[src]', function (sc) {
        var u; try { u = new URL(sc.getAttribute('src'), window.location.href); } catch (e) { return; }
        if (/^https?:$/.test(u.protocol) && u.host !== window.location.host && u.host !== 'cdnjs.cloudflare.com') stFail('page', 'external script from ' + u.host + ' (only https://cdnjs.cloudflare.com is allowed): ' + sc.getAttribute('src'));
      });
      each('link[href]', function (ln) {
        var u; try { u = new URL(ln.getAttribute('href'), window.location.href); } catch (e) { return; }
        if (/^https?:$/.test(u.protocol) && u.host !== window.location.host && u.host !== 'fonts.googleapis.com') stFail('page', 'external <link> to ' + u.host + ' (only the Google Fonts stylesheet of the boilerplate is allowed): ' + ln.getAttribute('href'));
      });
      authorStyles.forEach(function (st) {          // the page's own <style> blocks (MathJax adds its own later: not checked)
        var m = CSS_COLOUR.exec(st.textContent || '');
        if (m) stFail('colour', 'literal colour "' + m[0].replace(/^:\s*/, '') + '" in a page <style>: use the tokens (var(--ink), var(--s1), …)');
      });
      each('img, picture, iframe, object, embed, video, audio', function (n) { stFail('page', '<' + n.tagName.toLowerCase() + '> is not allowed (draw with inline SVG / canvas, link to videos) @ ' + cssPath(n)); }, main);
      each('[style]', function (n) {
        if (n.closest('mjx-container, .net, .lg-key, .plot, .hub-progress, #course-sprite')) return;
        var st = n.getAttribute('style') || '';
        if (CSS_COLOUR.test(st)) stFail('colour', 'literal colour in style="' + short(st, 50) + '" @ ' + cssPath(n));
      }, main);
    }

    /* the hub of a new course starts as the template: say so until its two placeholders are replaced */
    function checkHub() {
      if (!chrome.isHub) return;
      if (doc.querySelector('.hub-sketch[data-placeholder]'))
        stWarn('hub', 'the sketch is still the PLACEHOLDER of the template: redraw figure.hub-sketch in index.html for the subject of this course and remove its data-placeholder attribute');
      var S = window.SYLLABUS || {}, ex = (S.modules || []).filter(function (m) { return m && m.example; });
      if (ex.length) stWarn('hub', 'assets/syllabus.js still contains the EXAMPLE module of the template ("' + short(ex[0].title, 40) + '", example: true): replace it with the real course map');
    }

    function checkLayoutRules() {
      /* desktop lesson page: the sidebar must stay on screen while the lesson scrolls */
      var sb = doc.querySelector('.page-lesson .sidebar');
      if (sb && window.matchMedia && window.matchMedia('(min-width: 68.75em)').matches) {
        var cs = window.getComputedStyle(sb);
        if (cs.position !== 'sticky' || cs.top === 'auto') stFail('layout', 'the desktop lesson sidebar is not sticky (position: ' + cs.position + ', top: ' + cs.top + ')');
      }
    }

    function checkStructure() {
      if (chrome.isHub) return;
      var L = chrome.lesson, lessonLike = !L || L.kind === 'lesson';
      /* ids */
      if (chrome.id) {
        var pre = chrome.id + '-', bad = [];
        each('[id]', function (n) { if (n.id.indexOf('MJX-') === 0 || n.closest('mjx-container')) return; if (n.id.indexOf(pre) !== 0) bad.push(n.id); }, main);
        if (bad.length) stFail('ids', bad.length + ' id(s) do not start with the lesson id "' + pre + '": ' + bad.slice(0, 8).join(', ') + (bad.length > 8 ? ', …' : ''));
      }
      /* headings and sections */
      each('h2', function (h) {
        var p = h.parentNode;
        if (!(p && p.tagName === 'SECTION' && p.parentNode === main && p.firstElementChild === h))
          stFail('structure', '<h2> must be the first child of a <section> that is a direct child of <main>: "' + short(h.textContent, 50) + '"');
      }, main);
      each('h1', function (h) { if (!h.closest('.lesson-head')) stFail('structure', '<h1> outside header.lesson-head: "' + short(h.textContent, 50) + '"'); }, main);
      each('.margin-note', function (n) {
        var p = n.parentNode;
        if (!(p === main || (p && p.tagName === 'SECTION' && p.parentNode === main))) stWarn('structure', '.margin-note should be a direct child of a <section>, not inside another component @ ' + cssPath(n));
      }, main);
      /* figures */
      each('figure', function (f) { if (!f.querySelector(':scope > figcaption')) stFail('figure', '<figure> without <figcaption> @ ' + cssPath(f)); }, main);
      /* red pen: a correction needs the page, the quoted claim, the fix and the reason */
      each('.redpen', function (r) {
        var miss = [];
        if (!/^\d+([–-]\d+)?$/.test(r.getAttribute('data-page') || '')) miss.push('data-page="N"');
        ['claim', 'fix', 'because'].forEach(function (c) { if (!r.querySelector(':scope > .' + c)) miss.push('.' + c); });
        if (miss.length) stFail('redpen', 'missing ' + miss.join(', ') + ' @ ' + cssPath(r));
      }, main);
      /* quiz and exam questions */
      each('.quiz .q', function (q, i) {
        var list = q.querySelector('.options');
        if (!q.querySelector('.q-text')) stFail('quiz', 'question ' + (i + 1) + ' has no .q-text');
        if (!list) { stFail('quiz', 'question ' + (i + 1) + ' has no <ul class="options">'); return; }
        var lis = list.querySelectorAll(':scope > li');
        if (lis.length < 2) stFail('quiz', 'question ' + (i + 1) + ' has fewer than 2 options');
        if (!list.querySelector(':scope > li[data-correct]')) stFail('quiz', 'question ' + (i + 1) + ' has no option marked data-correct');
        if (list.querySelectorAll(':scope > li[data-correct]').length === lis.length && lis.length > 1) stWarn('quiz', 'question ' + (i + 1) + ': every option is marked data-correct');
        Array.prototype.forEach.call(lis, function (li, k) { if (!li.querySelector('.fb')) stWarn('quiz', 'question ' + (i + 1) + ', option ' + (k + 1) + ' has no <span class="fb"> explanation'); });
      }, main);
      each('.exam', function (ex) {
        var kind = ex.getAttribute('data-kind') || 'open', where = ex.id || cssPath(ex);
        if (['open', 'numeric', 'mcq'].indexOf(kind) < 0) stFail('exam ' + where, 'unknown data-kind="' + kind + '" (open, numeric, mcq)');
        if (!ex.querySelector('.exam-q')) stFail('exam ' + where, 'no .exam-q');
        else if (CFG.examLang && !chrome.sample && ex.querySelector('.exam-q').getAttribute('lang') !== CFG.examLang)     // the reference lesson keeps its English examples
          stWarn('exam ' + where, '.exam-q should carry lang="' + CFG.examLang + '" (the language of the exam: course.examLang in assets/syllabus.js)');
        if (!ex.querySelector('.exam-solution .exam-answer')) stWarn('exam ' + where, 'no model answer (details.exam-solution > .exam-answer)');
        if (kind === 'mcq' && !ex.querySelector('.options > li[data-correct]')) stFail('exam ' + where, 'mcq without an option marked data-correct');
      }, main);
      /* widgets */
      each('.widget', function (wd) {
        if (!wd.querySelector('.tasks')) stWarn(wd.id || 'widget', 'no <ol class="tasks"> ("Try it"): a widget should come with 2–4 predict-first experiments');
        if (!wd.querySelector('.widget-title')) stFail(wd.id || 'widget', 'no .widget-title');
      }, main);
      allPlots.forEach(function (p) {
        if (!p.o.label) stFail(p.w.id, 'ui.plot({ … }) without `label`: say what the plot shows (it is the text a screen reader gets)');
      });
      /* lesson anatomy (advice: an extras page is free-form) */
      if (lessonLike) {
        var need = [['.lesson-head h1', 'header.lesson-head with <h1>'], ['.lesson-head .lede', '.lede in the lesson head'], ['.hook', '.hook'],
          ['section.quiz', 'section.quiz'], ['section.recap', 'section.recap'], ['.recap .cheat', '.cheat inside the recap'],
          ['section.resources', 'section.resources'], ['.bridge', 'aside.bridge'], ['.exam', '.exam question'], ['.widget', 'widget']];
        need.forEach(function (x) { if (!main.querySelector(x[0])) stWarn('anatomy', 'the lesson has no ' + x[1]); });
        if (main.querySelectorAll('figure.fig').length < 2) stWarn('anatomy', 'fewer than 2 figures (figure.fig) in the lesson');
      }
    }

    /* author SVG: no colours, a label for screen readers, lettering that does not collide — also at phone size */
    function checkSvg() {
      each('svg', function (s) {
        if (!authorSvg(s)) return;
        var where = (s.closest('figure[id], .widget[id]') || {}).id || cssPath(s);
        if (s.getAttribute('role') !== 'img' || !/\S/.test(s.getAttribute('aria-label') || '')) stFail('svg ' + where, 'needs role="img" and a non-empty aria-label that says what the picture shows');
        if (!s.getAttribute('viewBox')) stFail('svg ' + where, 'no viewBox');
        if (s.hasAttribute('width') || s.hasAttribute('height')) stFail('svg ' + where, 'fixed width / height attribute: size the drawing with viewBox only');
        each('style, script, foreignObject, image', function (n) { stFail('svg ' + where, '<' + n.tagName + '> inside the SVG is not allowed'); }, s);
        var hits = [];
        Array.prototype.forEach.call([s].concat(Array.prototype.slice.call(s.querySelectorAll('*'))), function (n) {
          ['fill', 'stroke', 'color', 'stop-color', 'flood-color'].forEach(function (a) {
            var v = n.getAttribute(a);
            if (v != null && !/^(none|currentColor|inherit|transparent|url\(#.*\))$/i.test(v.trim())) hits.push(a + '="' + v + '"');
          });
          var st = n.getAttribute('style');
          if (st && /(fill|stroke|color|background|font)/i.test(st)) hits.push('style="' + short(st, 40) + '"');
        });
        if (hits.length) stFail('svg ' + where, 'literal colour / inline style (' + hits.slice(0, 4).join(', ') + (hits.length > 4 ? ', …' : '') + '): use the classes st-*, fi-*, fw-*, tx-* so that both themes work');
        collisions(s, where, false);
        if (!s.closest('.fig--pair')) collisions(s, where, true);
      }, main);
      /* handwriting has Latin and Cyrillic only: Greek, indices and math symbols fall back to another face */
      each('.tx-hand, .hand, .margin-note', function (n) {
        var walker = doc.createTreeWalker(n, NodeFilter.SHOW_TEXT, null), tn, odd = '';
        while ((tn = walker.nextNode())) {
          if (tn.parentNode.closest('mjx-container, code, .en, script')) continue;
          var t = tn.nodeValue;
          if (t.indexOf('\\(') >= 0) continue;
          for (var i = 0; i < t.length; i++) if (!HAND_OK.test(t[i]) && odd.indexOf(t[i]) < 0) odd += t[i];
        }
        if (odd) stWarn('handwriting', 'the handwriting face has no glyph for "' + odd + '" (Latin and Cyrillic only; write Greek and indices as a formula or in a normal label) @ ' + cssPath(n) + ': "' + short(n.textContent, 40) + '"');
      }, main);
    }
    /* overlapping labels and labels that stick out of the viewBox; phone = with the larger phone lettering (class sim-phone) */
    function collisions(s, where, phone) {
      var vb = s.viewBox && s.viewBox.baseVal, r0 = s.getBoundingClientRect();
      if (!vb || !vb.width || !r0.width) return;
      if (phone) s.classList.add('sim-phone');
      var k = vb.width / r0.width, boxes = [];
      each('text', function (t) {
        if (!/\S/.test(t.textContent)) return;
        for (var a = t; a && a !== s; a = a.parentNode) if (a.getAttribute && a.getAttribute('transform')) return;     // rotated text: its box says little
        var r = t.getBoundingClientRect();
        if (!r.width) return;
        var trim = r.height * 0.24;                                        // the line box is taller than the letters
        boxes.push({ t: short(t.textContent, 24), x0: (r.left - r0.left) * k, x1: (r.right - r0.left) * k, y0: (r.top - r0.top + trim) * k, y1: (r.bottom - r0.top - trim) * k });
      }, s);
      if (phone) s.classList.remove('sim-phone');
      var at = phone ? ' at phone size (lettering is about 30 % larger there: leave room after every label)' : '';
      boxes.forEach(function (b) {
        var out = Math.max(-b.x0, b.x1 - vb.width, -b.y0, b.y1 - vb.height);
        if (out > 3) stFail('svg ' + where, 'the label "' + b.t + '" sticks out of the viewBox by ' + Math.round(out) + ' units' + at);
      });
      for (var i = 0; i < boxes.length; i++) for (var j = i + 1; j < boxes.length; j++) {
        var a = boxes[i], b = boxes[j], ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > 2 && oy > 2) stFail('svg ' + where, 'the labels "' + a.t + '" and "' + b.t + '" overlap' + at);
      }
    }

    /* widget scripts: what a static look at the source can catch */
    function checkScripts() {
      each('script:not([src])', function (sc) {
        var t = sc.textContent || '', m, where = (/Course\.widget\(\s*['"]([^'"]+)['"]/.exec(t) || [])[1] || 'inline script';
        if ((m = JS_COLOUR.exec(t))) stFail(where, 'literal colour ' + m[0] + ' in the script: use colour names (\'s1\', \'ink\', …) or Course.colors()');
        if (/\bMath\.random\s*\(/.test(t)) stFail(where, 'Math.random(): use Course.rng(seed) so that every load shows the same data');
        if (/\b(?:localStorage|sessionStorage|indexedDB)\b/.test(t)) stFail(where, 'direct browser storage: use Course.store.get / set');
        if (/\bfetch\s*\(|\bXMLHttpRequest\b|\bimport\s*\(|^\s*import\s/m.test(t)) stFail(where, 'fetch / XMLHttpRequest / import do not work from file:// and in an Artifact');
        if (/(^|[^.\w])(?:alert|confirm|prompt)\s*\(|\bwindow\.print\b|\bdocument\.write\b/.test(t)) stFail(where, 'alert / confirm / prompt / window.print / document.write are not available');
        if (/\bset(?:Interval|Timeout)\s*\(|\brequestAnimationFrame\s*\(/.test(t)) stWarn(where, 'own timer in the script: prefer ui.player / ui.stepper (they pause in a hidden tab and are covered by the self-test)');
        if (/\bwindow\.[A-Za-z_$][\w$]*\s*=[^=]/.test(t)) stWarn(where, 'the script assigns a global (window.x = …): keep state in local variables of init');
      }, main);
    }

    function checkText() {
      var walker = doc.createTreeWalker(main, NodeFilter.SHOW_TEXT, null), tn, dollars = 0, emoji = 0;
      while ((tn = walker.nextNode())) {
        var p = tn.parentNode, t = tn.nodeValue;
        if (!p || p.closest('script, style, textarea, pre, code, noscript, .no-math, mjx-container, svg')) continue;
        if (/\$[^$\n]{1,80}\$/.test(t) && ++dollars <= 3) stWarn('math', 'looks like $…$ math (use \\( … \\)): "' + short(t, 70) + '" @ ' + cssPath(p));
        if (/[☀-⛿✀-➿]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDEFF]|\uD83E[\uDD00-\uDEFF]/.test(t) && ++emoji <= 3) stWarn('text', 'emoji or pictograph in the text (no emoji as icons or bullets): "' + short(t, 50) + '" @ ' + cssPath(p));
      }
    }

    return wait(30).then(function () {
      /* (a) widgets */
      var roots = doc.querySelectorAll('.widget');
      var chain = Promise.resolve();
      Array.prototype.forEach.call(roots, function (r) {
        chain = chain.then(function () {
          counts.widgets++;
          at('widget ' + (r.id || '(widget without id)'));
          exercise(r, r.id || '(widget without id)', r.id ? widgetById[r.id] : null);
          return wait(20);
        });
      });
      return chain;
    }).then(function () {
      at('the derivation steppers, tabs, details, quiz and exam questions (after the widgets)');
      widgets.forEach(function (w) { if (w.ctx) w.ctx.timers.forEach(function (stop) { try { stop(); } catch (e) { /* ignore */ } }); });
      /* declarative components */
      var bars = doc.querySelectorAll('.steps-bar');
      Array.prototype.forEach.call(bars, function (bar) {
        var ctx = 'steps ' + cssPath(bar.previousElementSibling || bar), b = bar.querySelectorAll('button');
        guard(ctx, function () { for (var k = 0; k < 60 && !b[0].disabled; k++) b[0].click(); b[2].click(); b[0].click(); b[1].click(); });
        counts.controls++;
      });
      var tabs = doc.querySelectorAll('.tabs-list button');
      Array.prototype.forEach.call(tabs, function (t) { guard('tabs ' + t.id, function () { t.click(); }); counts.controls++; });
      var firstTabs = doc.querySelectorAll('.tabs-list button:first-child');
      Array.prototype.forEach.call(firstTabs, function (t) { t.click(); });
      var det = doc.querySelectorAll('main details');
      Array.prototype.forEach.call(det, function (d) { guard('details ' + cssPath(d), function () { d.open = true; }); counts.controls++; });
      var quizzes = doc.querySelectorAll('.quiz');
      Array.prototype.forEach.call(quizzes, function (q) {
        var ctx = 'quiz ' + (q.id || '');
        guard(ctx, function () {
          var pass = function () {
            Array.prototype.forEach.call(q.querySelectorAll('.opt'), function (o) { o.click(); counts.controls++; });
            Array.prototype.forEach.call(q.querySelectorAll('.q-actions .btn'), function (b) { if (!b.disabled) b.click(); });
          };
          pass();
          var retry = q.querySelector('.quiz-foot .btn'); if (retry) retry.click();
          pass();
        });
      });
      var exams = doc.querySelectorAll('.exam');
      Array.prototype.forEach.call(exams, function (ex) {
        guard('exam ' + (ex.id || ''), function () {
          var inp = ex.querySelector('.exam-try input'), form = ex.querySelector('.exam-try');
          if (inp && form) {
            ['', 'abc', '1.5abc', '1e999', ex.getAttribute('data-answer')].forEach(function (v) { inp.value = v; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
            if (!ex.querySelector('.exam-verdict.is-right')) stFail('exam ' + (ex.id || ''), 'the numeric check does not accept its own data-answer="' + ex.getAttribute('data-answer') + '"');
            counts.controls++;
          }
          Array.prototype.forEach.call(ex.querySelectorAll('.opt'), function (o) { o.click(); counts.controls++; });
          Array.prototype.forEach.call(ex.querySelectorAll('.q-actions .btn'), function (b) { if (!b.disabled) b.click(); });
        });
      });
      /* chrome: done button twice, drawer, theme round trip (exercises every onTheme handler and redraw) */
      guard('chrome', function () {
        var done = doc.getElementById('done-btn'); if (done) { done.click(); done.click(); }
        if (doc.getElementById('course-nav')) { toggleNav(true); toggleNav(false); }
        if (doc.activeElement && doc.activeElement.blur) doc.activeElement.blur();
      });
      var before = ownTheme, eff = Course.theme();
      writeTheme(eff === 'dark' ? 'light' : 'dark');
      return wait(30).then(function () { writeTheme(before); return wait(30); });
    }).then(function () {
      return Promise.race([Course.typeset(), wait(4000)]);
    }).then(function () { return wait(60); }).then(function () {
      at('the checks of formulas, layout and the authoring contract (after all interactions)');
      /* (b) math */
      var MJ = window.MathJax, containers = doc.querySelectorAll('mjx-container');
      counts.math = containers.length;
      if ((!MJ || !MJ.typesetPromise) && doc.querySelector('script[src*="mathjax"]')) stFail('math', 'MathJax did not load - formulas are left as raw TeX');
      function texOf(box) { try { var items = MJ.startup.document.getMathItemsWithin(box); if (items && items[0]) return String(items[0].math); } catch (e) { /* ignore */ } return ''; }
      Array.prototype.forEach.call(doc.querySelectorAll('mjx-container [data-mjx-error], mjx-container mjx-merror'), function (bad) {
        var box = bad.closest('mjx-container');
        stFail('math', 'TeX error "' + (bad.getAttribute('data-mjx-error') || bad.getAttribute('title') || bad.textContent || '?') + '" in formula: ' + (texOf(box) || box.textContent).slice(0, 160) + ' @ ' + cssPath(box.parentNode));
      });
      var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null), tn, rawSeen = 0;
      while ((tn = walker.nextNode())) {
        var t = tn.nodeValue;
        if (t.indexOf('\\(') < 0 && t.indexOf('\\[') < 0 && t.indexOf('\\)') < 0 && t.indexOf('\\]') < 0) continue;
        var p = tn.parentNode;
        if (!p || p.closest('script, style, textarea, pre, code, noscript, .no-math, mjx-container')) continue;
        if (++rawSeen <= 12) stFail('math', 'raw TeX delimiter left in visible text: "' + t.trim().slice(0, 120) + '" @ ' + cssPath(p));
      }
      /* (c) horizontal overflow */
      var vw = root.clientWidth;
      if (root.scrollWidth > vw + 1 || doc.body.scrollWidth > vw + 1) {
        var offenders = [];
        Array.prototype.forEach.call(doc.body.querySelectorAll('*'), function (n) {
          var r = n.getBoundingClientRect();
          if (r.width === 0 || r.right <= vw + 1) return;
          if (n.closest('.scroll-x, pre, .sidebar, #course-sprite, .cheat dd, .sr-only')) return;
          var mj = n.closest('mjx-container');
          if (mj && (mj !== n || mj.getAttribute('display') === 'true')) return;
          var st = window.getComputedStyle(n); if (st.position === 'fixed') return;
          offenders.push({ n: n, right: r.right });
        });
        offenders.sort(function (a, b) { return b.right - a.right; });
        /* report the innermost culprits: skip ancestors of an already listed element */
        var listed = [];
        offenders.forEach(function (o) { if (listed.length < 6 && !listed.some(function (x) { return o.n.contains(x.n); })) listed.push(o); });
        stFail('layout', 'the document scrolls horizontally (scrollWidth ' + root.scrollWidth + ' > viewport ' + vw + '). Widest elements: ' +
          listed.map(function (o) { return cssPath(o.n) + ' -> right edge ' + Math.round(o.right) + 'px'; }).join('; '));
      }
      /* phone-width hazards that a desktop run cannot see as overflow */
      Array.prototype.forEach.call(doc.querySelectorAll('main mjx-container:not([display="true"])'), function (mj) {
        var w = mj.getBoundingClientRect().width;
        if (w <= 270) return;
        stFail('math', 'inline formula is ' + Math.round(w) + 'px wide and cannot wrap - it will overflow on a phone; make it display math or split it: ' + texOf(mj).slice(0, 120) + ' @ ' + cssPath(mj.parentNode));
      });
      Array.prototype.forEach.call(doc.querySelectorAll('main mjx-container[display="true"]'), function (mj) {
        var g = mj.firstElementChild, w = g ? g.getBoundingClientRect().width : 0;
        if (w <= 330) return;
        stWarn('math', 'display formula is ' + Math.round(w) + 'px wide: on a phone it is cut at the screen edge and has to be scrolled. Break it into two lines (aligned, or two \\[ \\]): ' + texOf(mj).slice(0, 100) + ' @ ' + cssPath(mj.parentNode));
      });
      Array.prototype.forEach.call(doc.querySelectorAll('main table'), function (t) {
        if (!t.closest('.scroll-x')) stFail('layout', 'table outside .scroll-x (it will overflow on a phone) @ ' + cssPath(t));
      });
      /* (d) duplicate ids */
      var seen = {}, dups = {};
      Array.prototype.forEach.call(doc.querySelectorAll('[id]'), function (n) { if (n.id.indexOf('MJX-') === 0) return; if (seen[n.id]) dups[n.id] = 1; seen[n.id] = 1; });
      Object.keys(dups).forEach(function (id) { stFail('ids', 'duplicate id="' + id + '"'); });
      /* (e) the authoring contract */
      [['page', checkPage], ['hub', checkHub], ['layout', checkLayoutRules], ['structure', checkStructure], ['svg', checkSvg], ['scripts', checkScripts], ['text', checkText]].forEach(function (c) {
        try { c[1](); } catch (e) { stFail('selftest ' + c[0], (e && e.message) || e); }
      });
      console.log('SELFTEST DONE widgets=' + counts.widgets + ' controls=' + counts.controls + ' math=' + counts.math + ' fails=' + stCounts.fail + ' warnings=' + stCounts.warn);
    }).then(null, function (e) { stFail('selftest', (e && e.message) || e); console.log('SELFTEST DONE (aborted)'); });
  }

  /* ------------------------------------------------------------------------
     13. Boot
     ------------------------------------------------------------------------ */
  function step(name, fn) { try { fn(); } catch (e) { report(name, e); } }
  var readyResolve;
  /** Course.ready — a Promise that resolves when the page is fully set up: chrome, widgets, fonts and formulas. */
  Course.ready = new Promise(function (res) { readyResolve = res; });
  var authorStyles = [];
  function boot() {
    if (booted) return;
    /* before MathJax injects its own; a block stamped data-host belongs to an embedding host (or to the emulation of one
       made by tools/make_artifact_index.py), not to the author of the page */
    authorStyles = Array.prototype.slice.call(doc.querySelectorAll('style:not([data-host])'));
    step('sprite', injectSprite);
    step('chrome', buildChrome);
    step('typography', function () { glueDashes(chrome.main); glueDashes(doc.querySelector('.site-foot')); glueWords(chrome.main); });
    step('lesson head', initLessonHead);
    step('steps', initSteps);
    step('quiz', initQuizzes);
    step('exam', initExams);
    step('tabs', initTabs);
    step('misc', initMisc);
    step('toc', initToc);
    booted = true;
    widgets.forEach(function (w) { mountWidget(w); });
    step('widgets', mountOrphans);
    Course.onTheme(function () { allPlots.forEach(function (p) { p.redraw(); }); });
    var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready.then(function () { fontCache = null; allPlots.forEach(function (p) { p._layout(); p.redraw(); }); }) : Promise.resolve();
    if (!doc.querySelector('script[src*="mathjax" i]')) mathReadyResolve(false);              // a page without formulas
    mathReady.then(function () { widgets.forEach(function (w) { if (w.root && hasRawTex(w.root)) Course.typeset(w.root); }); });
    window.addEventListener('resize', markScrollersSoon);
    markScrollersSoon();
    if (window.location.hash.length > 1) {
      var target = null; try { target = doc.getElementById(decodeURIComponent(window.location.hash.slice(1))); } catch (e) { target = null; }
      if (target) setTimeout(function () { target.scrollIntoView(); }, 0);
    }
    var loaded = new Promise(function (res) { if (doc.readyState === 'complete') res(); else window.addEventListener('load', res); });
    var settled = loaded.then(function () { return Promise.race([mathReady, wait(11000)]); })
      .then(function () { return Promise.race([fontsReady, wait(3000)]); })
      .then(function () { return mathQueue; })
      .then(function () { return new Promise(function (res) { nextFrame(function () { setTimeout(res, 30); }); setTimeout(res, 400); }); })
      .then(function () { markScrollers(); });
    settled.then(function () { readyResolve(true); }, function () { readyResolve(false); });
    if (SELFTEST) settled.then(runSelfTest);
  }
  if (doc.readyState === 'loading') {
    /* 'interactive' fires when parsing ends, before deferred scripts (MathJax) run: the chrome does not wait for MathJax to download */
    doc.addEventListener('readystatechange', function () { if (doc.readyState !== 'loading') boot(); });
    doc.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();
