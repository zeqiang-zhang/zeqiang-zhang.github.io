/*
  Interactive impulse response for
  "A Cognitive Perspective on Information Frictions in Labor Markets" (Entropy, 2025).

  The macro model of Section 4 with the parameters of the authors' simulation code.
  At k = 0.08, c = 0.40 it reproduces Figure 4; over the slider ranges it reproduces
  the ranges of Figure 5. Markup: <div class="widget" data-widget="policy" data-lang="en|zh">.
*/
(function () {
  'use strict';
  var root = document.querySelector('[data-widget="policy"]');
  if (!root) return;
  var zh = root.getAttribute('data-lang') === 'zh';

  var L = zh ? {
    k: '学习速度 <i>k</i>', c: '不确定性敏感度 <i>c</i>',
    f: '工作发现率 <i>f<sub>t</sub></i>', u: '失业率 <i>u<sub>t</sub></i>',
    cur: '当前参数', base: '基准（<i>k</i> = 0.08，<i>c</i> = 0.40）',
    pre: '冲击前失业率', peak: '失业率峰值', rec: '工作发现率恢复至 95%',
    steps: ' 步', none: '未恢复', reset: '重置', shock: '冲击'
  } : {
    k: 'Learning speed <i>k</i>', c: 'Uncertainty sensitivity <i>c</i>',
    f: 'Job-finding rate <i>f<sub>t</sub></i>', u: 'Unemployment rate <i>u<sub>t</sub></i>',
    cur: 'Selected parameters', base: 'Baseline (<i>k</i> = 0.08, <i>c</i> = 0.40)',
    pre: 'Unemployment before the shock', peak: 'Peak unemployment', rec: 'Job finding back to 95%',
    steps: ' steps', none: 'not reached', reset: 'Reset', shock: 'shock'
  };

  /* ---- Model (Section 4) ---- */
  var P = { s: 0.03, m0: 0.45, gamma: 0.5, v: 0.06, aBase: 0.05, lamE: 0.05, fF: 0.02 };
  var T = 120, SHOCK = 50, DLAM = 0.25, K0 = 0.08, C0 = 0.40;

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function hbits(l) { l = clamp(l, 1e-9, 1 - 1e-9); return -(l * Math.log2(l) + (1 - l) * Math.log2(1 - l)); }
  function abar(l, c) { return clamp(P.aBase + c * hbits(l), 0, 0.95); }
  function mth(th) { return P.m0 * Math.pow(th, 1 - P.gamma); }

  function run(k, c) {
    var lam = 0.10;
    var u = P.s / (P.s + ((1 - 0.10) * (1 - abar(0.10, c)) * mth(P.v / 0.07) + 0.10 * P.fF));
    var us = [], fs = [];
    for (var t = 0; t < T; t++) {
      var a = abar(lam, c), th = P.v / Math.max(u, 1e-6), fT = (1 - a) * mth(th);
      var f = (1 - lam) * fT + lam * P.fF;
      us.push(u); fs.push(f);
      var uNext = clamp(u + (P.s * (1 - u) - f * u), 1e-6, 0.5);
      var sE = P.s * (1 - u) / Math.max(u, 1e-9);
      var dl = (P.lamE - lam) * sE + (fT - P.fF) * lam * (1 - lam) - k * lam;
      if (t === SHOCK) lam = Math.min(lam + DLAM, 0.95);
      lam = clamp(lam + dl, 1e-6, 0.95);
      u = uNext;
    }
    var peak = 0;
    for (var i = SHOCK; i < T; i++) peak = Math.max(peak, us[i]);
    var target = 0.95 * fs[SHOCK - 2], rec = null;
    for (var j = SHOCK + 1; j < T; j++) if (fs[j] >= target) { rec = j - SHOCK; break; }
    return { u: us, f: fs, pre: us[SHOCK - 1], peak: peak, rec: rec };
  }

  /* Fixed axes covering the whole slider range, so curves are comparable. */
  var KR = [0.05, 0.16], CR = [0.15, 0.55];
  var corners = [run(KR[0], CR[0]), run(KR[0], CR[1]), run(KR[1], CR[0]), run(KR[1], CR[1]), run(K0, C0)];
  function range(key) {
    var lo = Infinity, hi = -Infinity;
    corners.forEach(function (r) { r[key].forEach(function (x) { lo = Math.min(lo, x); hi = Math.max(hi, x); }); });
    var pad = (hi - lo) * 0.06; return [lo - pad, hi + pad];
  }
  var YR = { f: range('f'), u: range('u') };
  var base = run(K0, C0);

  /* ---- DOM ---- */
  function pct(x) { return (100 * x).toFixed(1) + '%'; }
  root.innerHTML =
    '<div class="widget-controls">' +
      control('k', L.k, KR[0], KR[1], 0.005, K0) +
      control('c', L.c, CR[0], CR[1], 0.01, C0) +
    '</div>' +
    '<div class="widget-plots">' +
      '<div class="widget-plot"><p class="ttl">' + L.f + '</p><svg viewBox="0 0 320 170" role="img" aria-label="' + strip(L.f) + '" data-key="f"></svg></div>' +
      '<div class="widget-plot"><p class="ttl">' + L.u + '</p><svg viewBox="0 0 320 170" role="img" aria-label="' + strip(L.u) + '" data-key="u"></svg></div>' +
    '</div>' +
    '<div class="widget-stats" aria-live="polite"></div>' +
    '<div class="widget-foot">' +
      '<div class="widget-legend"><span><span class="sw"></span>' + L.cur + '</span><span><span class="sw base"></span>' + L.base + '</span></div>' +
      '<button type="button" class="more" data-reset>' + L.reset + '</button>' +
    '</div>';

  function control(id, label, min, max, step, val) {
    return '<label class="widget-control"><span class="row"><span>' + label + '</span>' +
      '<output data-out="' + id + '">' + val.toFixed(id === 'k' ? 3 : 2) + '</output></span>' +
      '<input type="range" data-in="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"></label>';
  }
  function strip(s) { return s.replace(/<[^>]+>/g, ''); }

  var NS = 'http://www.w3.org/2000/svg';
  var M = { l: 40, r: 8, t: 8, b: 22 }, W = 320, H = 170;
  function sx(t) { return M.l + (W - M.l - M.r) * t / (T - 1); }
  function sy(y, key) { var r = YR[key]; return H - M.b - (H - M.t - M.b) * (y - r[0]) / (r[1] - r[0]); }
  function path(arr, key) {
    return arr.map(function (y, t) { return (t ? 'L' : 'M') + sx(t).toFixed(1) + ' ' + sy(y, key).toFixed(1); }).join('');
  }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(e);
    return e;
  }

  var curPaths = {};
  root.querySelectorAll('svg[data-key]').forEach(function (svg) {
    var key = svg.getAttribute('data-key'), r = YR[key];
    for (var i = 0; i < 3; i++) {
      var y = r[0] + (r[1] - r[0]) * (0.1 + 0.4 * i);
      el('line', { x1: M.l, x2: W - M.r, y1: sy(y, key), y2: sy(y, key), 'class': 'w-grid' }, svg);
      var lbl = el('text', { x: M.l - 6, y: sy(y, key) + 3.5, 'text-anchor': 'end', 'class': 'w-tick' }, svg);
      lbl.textContent = key === 'u' ? (100 * y).toFixed(0) + '%' : y.toFixed(2);
    }
    [0, 50, 100].forEach(function (t) {
      var lbl = el('text', { x: sx(t), y: H - 6, 'text-anchor': 'middle', 'class': 'w-tick' }, svg);
      lbl.textContent = t;
    });
    el('path', { d: 'M' + M.l + ' ' + M.t + 'V' + (H - M.b) + 'H' + (W - M.r), 'class': 'w-axis' }, svg);
    el('line', { x1: sx(SHOCK), x2: sx(SHOCK), y1: M.t, y2: H - M.b, 'class': 'w-shock' }, svg);
    var s = el('text', { x: sx(SHOCK) + 4, y: M.t + 9, 'class': 'w-tick' }, svg);
    s.textContent = L.shock;
    el('path', { d: path(base[key], key), 'class': 'w-base' }, svg);
    curPaths[key] = el('path', { d: '', 'class': 'w-cur' }, svg);
  });

  var inK = root.querySelector('[data-in="k"]'), inC = root.querySelector('[data-in="c"]');
  var outK = root.querySelector('[data-out="k"]'), outC = root.querySelector('[data-out="c"]');
  var stats = root.querySelector('.widget-stats');

  function stat(label, v, b) {
    return '<span>' + label + ': <b>' + v + '</b> <span class="sub">(' + b + ')</span></span>';
  }
  function recTxt(x) { return x === null ? L.none : x + L.steps; }

  function update() {
    var k = +inK.value, c = +inC.value, r = run(k, c);
    outK.textContent = k.toFixed(3); outC.textContent = c.toFixed(2);
    curPaths.f.setAttribute('d', path(r.f, 'f'));
    curPaths.u.setAttribute('d', path(r.u, 'u'));
    stats.innerHTML =
      stat(L.pre, pct(r.pre), pct(base.pre)) +
      stat(L.peak, pct(r.peak), pct(base.peak)) +
      stat(L.rec, recTxt(r.rec), recTxt(base.rec));
  }
  inK.addEventListener('input', update);
  inC.addEventListener('input', update);
  root.querySelector('[data-reset]').addEventListener('click', function () {
    inK.value = K0; inC.value = C0; update();
  });
  update();
})();
