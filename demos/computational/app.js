/* ============================================================
   From Individual Learning to Market Equilibrium — interactives.
   Vanilla JS, no dependencies, offline-safe.

   Everything here is a direct implementation of the paper's own
   equations: the Appendix A steady-state system, the monopsonist
   first-order condition of Section 4, and the mean-field map of
   Section 5.  Nothing is fitted.
   ============================================================ */
(function(){
"use strict";

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const NS = "http://www.w3.org/2000/svg";
const C  = { accent:'#2c6e7f', both:'#3f7a4e', neither:'#c0392b', struct:'#b5762e',
             param:'#7d3c98', theory:'#2b261f', ink:'#2b261f', ink2:'#5b544a',
             muted:'#8b8173', line:'rgba(58,46,28,.16)', line2:'rgba(58,46,28,.28)' };

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function el(tag,attrs={},parent){ const e=document.createElementNS(NS,tag);
  for(const k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e; }
function txt(parent,x,y,s,attrs={}){ const t=el("text",Object.assign({x,y},attrs),parent);
  t.textContent=s; return t; }
const tip=$("#tooltip");
function showTip(html,x,y){ tip.innerHTML=html; tip.style.opacity=1;
  const w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=clamp(x-w/2,8,innerWidth-w-8)+"px"; tip.style.top=(y-h-14)+"px"; }
function hideTip(){ tip.style.opacity=0; }

/* =====================================================
   THE MODEL  (Section 3 + Appendix A)
   ===================================================== */
/* Table 1 of the paper, fixed. The page prints these values rather than
   letting them be moved, so every figure below refers to one calibration. */
const P={ A:1, am:0.471, alpha:2/3, lam:0.0144, eta:0.6, c:0.268, phi:0.6, r:0.01, rho:0.6 };

const q     = (th,p=P)=> p.am*Math.pow(th,-p.phi);
const Scoef = p=> p.eta*p.alpha*p.A/(p.eta*p.alpha+1-p.eta);
const Dcoef = p=> 1-(1-p.eta)*p.rho;
const wage  = (l,th,p=P)=> (Scoef(p)*Math.pow(l,p.alpha-1) + p.eta*p.c*th)/Dcoef(p);

/* marginal surplus of a worker:  f'(l) - w(l) - w'(l) l  */
function surplus(l,th,p=P){
  const la=Math.pow(l,p.alpha-1);
  return p.alpha*p.A*la
       - p.eta*p.alpha*p.alpha*p.A*la/(p.eta*p.alpha+1-p.eta)
       - (1-p.eta)*p.rho*wage(l,th,p)
       - p.eta*p.c*th;
}
/* market clearing:  lam l = q v, th = v/u, u = 1-l  =>  th as a function of l */
const thOfL = (l,p=P)=> Math.pow(p.lam*l/(p.am*(1-l)), 1/(1-p.phi));
const lOfTh = (th,p=P)=>{ const X=p.am*Math.pow(th,1-p.phi)/p.lam; return X/(1+X); };

/* perceived marginal cost of a hire.
     eco   : true  -> (r+lam)c   (economic capitalisation)   false -> lam c (RL)
     mono  : true  -> the manipulator's extra wage-feedback term of Eq. (9)   */
function mcost(l,eco,mono,p=P){
  const th=thOfL(l,p), qq=q(th,p), u=1-l;
  const k=(eco? p.r+p.lam : p.lam)*p.c;
  return mono ? k*(1+(l/u)*p.eta/Dcoef(p))/(qq*(1-p.phi)) : k/qq;
}
/* solve  surplus(l, th(l)) = mcost(l)  for l  (LHS falls, RHS rises in l) */
function solveCase(eco,mono,p=P){
  const g=l=>surplus(l,thOfL(l,p),p)-mcost(l,eco,mono,p);
  let lo=1e-9, hi=1-1e-9;
  if(g(lo)<0||g(hi)>0) return null;
  for(let i=0;i<200;i++){ const m=(lo+hi)/2; if(g(m)>0) lo=m; else hi=m; }
  const l=(lo+hi)/2, th=thOfL(l,p), qq=q(th,p), w=wage(l,th,p), v=p.lam*l/qq;
  return { l, u:1-l, th, q:qq, w, v, R:p.A*Math.pow(l,p.alpha)-w*l-p.c*v };
}
const equilibrium = (p=P)=>solveCase(true,false,p);

/* mean-field best response: fix the field, solve the FOC, aggregate back */
function Psi(th,p=P){
  const qq=q(th,p), K=(p.r+p.lam)*p.c/qq;
  let lo=1e-9, hi=1-1e-9;
  if(surplus(hi,th,p)>K) return thOfL(hi,p);        // corner: hire everyone
  for(let i=0;i<200;i++){ const m=(lo+hi)/2; if(surplus(m,th,p)>K) lo=m; else hi=m; }
  return thOfL((lo+hi)/2,p);
}

/* =====================================================
   0. PUBLISHED FIGURES, REPLOTTED
   Data from the authors' own training runs. Figure 1 is transcribed from
   the printed output of naive RL DDPG.ipynb (5 independent runs, first 12
   episodes, mean ± sd across runs). Figures 2-4 are loaded from
   figure_data.json, produced by MFRL代码/export_figure_data.py; if that
   file is absent the page silently keeps the original PNGs.
   ===================================================== */
const FIG1={
  acc  :[-515.136,-170.162,49.064,50.22,47.502,48.526,48.696,47.588,48.998,46.636,48.416,51.562],
  accSd:[150.19,35.939,2.424,1.213,3.11,2.808,2.015,2.508,2.795,2.797,1.663,3.688],
  fin  :[-2.536,0.278,0.278,0.264,0.288,0.272,0.274,0.28,0.274,0.288,0.284,0.286],
  finSd:[1.1256,0.0279,0.0204,0.0233,0.0183,0.0232,0.0185,0.0063,0.012,0.0183,0.0185,0.0174],
  th   :[13.5387,0.1669,0.0873,0.137,0.0536,0.0818,0.0651,0.0467,0.0005,0.0615,0.0756,0.0446],
  thSd :[5.3231,0.1437,0.0875,0.1443,0.0506,0.0739,0.0445,0.0446,0.001,0.0789,0.1261,0.0596]
};
/* Figures 2-4: mean ± sd across the authors' five independent runs, exported
   from the pickles/npy in MFRL代码 by export_figure_data.py. The reward series
   carries plot.ipynb's own rescaling (/100 + 0.16); everything else is raw. */
const FIG24={
  f2Rew:[0.2488,0.2335,0.2178,0.2073,0.1836,0.1757,0.1607,0.1589,0.1535,0.1541,0.1476,0.148,0.1405,0.1469,0.1471,0.1425,0.1447,0.1336,0.1427,0.1415,0.1442,0.1487,0.1449,0.1517,0.1458,0.1431,0.1417,0.1368,0.1416,0.1394,0.1329,0.1372,0.1255,0.1203,0.1281,0.1209,0.1273,0.1151,0.1255,0.1276,0.129,0.1315,0.1341,0.1373,0.1348,0.1351,0.1431,0.1408,0.1371,0.1402],
  f2RewSd:[0.0027,0.0066,0.007,0.0166,0.0248,0.0225,0.018,0.0144,0.0171,0.015,0.0062,0.0074,0.0156,0.0178,0.0134,0.0163,0.0181,0.0138,0.0094,0.011,0.0057,0.0157,0.0133,0.0105,0.0151,0.0098,0.0146,0.0136,0.0066,0.0071,0.0092,0.01,0.008,0.014,0.0165,0.0107,0.0044,0.0067,0.012,0.0048,0.0087,0.0055,0.0152,0.0109,0.008,0.01,0.0078,0.0117,0.011,0.0115],
  f2Th:[0.3,0.3663,0.4278,0.48,0.5523,0.6087,0.6573,0.6859,0.6909,0.7006,0.721,0.7355,0.7468,0.7421,0.7348,0.7585,0.7518,0.7736,0.7538,0.7614,0.7451,0.7329,0.7272,0.7241,0.7355,0.739,0.7579,0.772,0.7723,0.7803,0.8061,0.8044,0.8328,0.8529,0.8364,0.8472,0.8333,0.909,0.8545,0.8171,0.8085,0.7974,0.8003,0.7767,0.7627,0.7668,0.7753,0.7796,0.7692,0.767],
  f2ThSd:[0,0.0137,0.0373,0.0507,0.0731,0.0699,0.0872,0.0838,0.068,0.0509,0.025,0.0436,0.086,0.0783,0.0592,0.0756,0.0846,0.1004,0.0624,0.046,0.0316,0.0654,0.0604,0.0472,0.0546,0.0502,0.0609,0.0656,0.0253,0.0401,0.027,0.0359,0.0258,0.0723,0.0606,0.0531,0.0281,0.0347,0.0358,0.0185,0.0404,0.0446,0.0798,0.0573,0.0413,0.0303,0.0361,0.0526,0.067,0.0425],
  f3St:[0.3,0.3741,0.4502,0.5326,0.6037,0.6617,0.729,0.7873,0.8654,0.8679,0.8675,0.9139,0.8928,0.9039,0.9054,0.8964,0.8676,0.9153,0.8732,0.9216,0.8807,0.8669,0.8538,0.9143,0.8784,0.8872,0.9342,0.9281,0.9328,0.8736,0.8836,0.8929,0.8891,0.8966,0.8744,0.881,0.91,0.9452,0.8972,0.8896,0.8928,0.8916,0.8549,0.8746,0.8557,0.8762,0.9163,0.8749,0.9059,0.8932],
  f3StSd:[0,0.0291,0.0405,0.0369,0.0603,0.0488,0.0548,0.0454,0.0718,0.0847,0.0654,0.0633,0.0473,0.0346,0.0625,0.0482,0.0347,0.0534,0.0481,0.0358,0.0254,0.0434,0.025,0.04,0.0771,0.0528,0.0534,0.0957,0.0456,0.038,0.0654,0.0493,0.0591,0.0646,0.0507,0.0316,0.0351,0.0749,0.043,0.072,0.0487,0.0601,0.0563,0.0623,0.0407,0.0239,0.0699,0.049,0.0514,0.0639],
  f3Pa:[13.5387,0.1663,0.0857,0.1363,0.0528,0.0815,0.0648,0.0467,0.0005,0.0609,0.0216,0.0905,0.0612,0.1447,0.0339,0.1183,0.0813,0.0358,0.0409,0.2126],
  f3PaSd:[5.3231,0.1438,0.0856,0.1437,0.0496,0.0737,0.0444,0.0446,0.001,0.0782,0.0265,0.1048,0.0857,0.1096,0.0678,0.1307,0.1627,0.044,0.0819,0.33],
  f4Th:[0.661,0.6592,0.6575,0.656,0.6544,0.6527,0.651,0.6489,0.6467,0.6444,0.6421,0.6399,0.6376,0.6355,0.6333,0.6313,0.6295,0.6279,0.6265,0.6254,0.6249,0.6247,0.6247,0.625,0.6259,0.6272,0.629,0.6315,0.635,0.6396,0.6448,0.6509,0.6575,0.6656,0.6753,0.6856,0.6976,0.7116,0.7288,0.7489,0.7739,0.8053,0.8454,0.8972,0.9655,1.0576,1.1853,1.3723,1.6688,2.2025],
  f4ThSd:[0.2067,0.2079,0.2088,0.2093,0.2095,0.2094,0.2091,0.2086,0.2077,0.2064,0.2048,0.2026,0.2002,0.1973,0.1941,0.1905,0.1868,0.1831,0.1791,0.1751,0.1717,0.1685,0.165,0.1615,0.1579,0.1542,0.1501,0.146,0.1421,0.1383,0.1341,0.13,0.1252,0.1205,0.1161,0.1112,0.1056,0.0992,0.0935,0.0879,0.0846,0.0834,0.0858,0.0928,0.1051,0.1238,0.1509,0.1915,0.2557,0.3689],
  f4u:[0.2,0.1961,0.1922,0.1884,0.1845,0.1806,0.1767,0.1729,0.169,0.1651,0.1612,0.1573,0.1535,0.1496,0.1457,0.1418,0.138,0.1341,0.1302,0.1263,0.1225,0.1186,0.1147,0.1108,0.1069,0.1031,0.0992,0.0953,0.0914,0.0876,0.0837,0.0798,0.0759,0.072,0.0682,0.0643,0.0604,0.0565,0.0527,0.0488,0.0449,0.041,0.0371,0.0333,0.0294,0.0255,0.0216,0.0178,0.0139,0.01]
};
const THEORY_TH=0.78, THEORY_R=0.168, THEORY_U=0.033;

/* a small framed line panel with a mean line and a ±1 sd band */
function seriesPanel(svg,opt){
  svg.innerHTML="";
  const W=opt.W||460, H=opt.H||300;
  const padL=opt.padL||58, padR=opt.padR||16, padT=22, padB=46;
  const iw=W-padL-padR, ih=H-padT-padB;
  const n=opt.mean.length, y0=opt.y0, y1=opt.y1;
  /* x is either the index (default) or a real value carried in opt.xs */
  const xs=opt.xs, x0=opt.x0, x1=opt.x1;
  const XV=v=> xs ? padL+iw*(v-x0)/(x1-x0) : padL+iw*v/Math.max(1,n-1);
  const X =i=> XV(xs?xs[i]:i);
  const xLab=i=> xs ? (opt.xFmt?opt.xFmt(xs[i]):xs[i].toFixed(3)) : String(i);
  const Y=v=>padT+ih*(1-(clamp(v,y0,y1)-y0)/(y1-y0));
  (opt.yTicks||[y0,(y0+y1)/2,y1]).forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line"},svg);
    txt(svg,padL-8,Y(v)+4,opt.fmt?opt.fmt(v):v.toFixed(2),
      {class:"tick","text-anchor":"end"});
  });
  (opt.xTicks||(xs?[x0,(x0+x1)/2,x1]:[0,Math.floor((n-1)/2),n-1])).forEach(v=>{
    el("line",{x1:XV(v),y1:padT,x2:XV(v),y2:H-padB,class:"grid-line"},svg);
    txt(svg,XV(v),H-padB+17,xs?(opt.xFmt?opt.xFmt(v):v.toFixed(2)):String(v),
      {class:"tick","text-anchor":"middle"});
  });
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
  txt(svg,padL+iw/2,H-10,opt.xLabel,{class:"axlab","text-anchor":"middle"});
  txt(svg,padL,padT-7,opt.yLabel,{class:"axlab",fill:opt.col||C.accent});
  /* the ±1 sd band, drawn first so the mean sits on top */
  if(opt.sd){
    let up="",dn="";
    for(let i=0;i<n;i++){ up+=(i?"L":"M")+X(i).toFixed(1)+" "+Y(opt.mean[i]+opt.sd[i]).toFixed(1)+" "; }
    for(let i=n-1;i>=0;i--){ dn+="L"+X(i).toFixed(1)+" "+Y(opt.mean[i]-opt.sd[i]).toFixed(1)+" "; }
    el("path",{d:up+dn+"Z",fill:opt.col||C.accent,"fill-opacity":.16,stroke:"none"},svg);
  }
  /* an optional reference level; the label flips to the underside when the
     line sits high, so it never collides with the top gridline */
  if(opt.ref!==undefined && opt.ref>=y0 && opt.ref<=y1){
    el("line",{x1:padL,y1:Y(opt.ref),x2:W-padR,y2:Y(opt.ref),stroke:C.theory,
      "stroke-width":1.5,"stroke-dasharray":"6 4",opacity:.85},svg);
    txt(svg,W-padR-4,Y(opt.ref)+(opt.ref>(y0+y1)/2?15:-7),opt.refLabel,
      {class:"tick","text-anchor":"end",fill:C.theory,"font-weight":"700","font-size":"11.5"});
  }
  let d="";
  for(let i=0;i<n;i++) d+=(i?"L":"M")+X(i).toFixed(1)+" "+Y(opt.mean[i]).toFixed(1)+" ";
  el("path",{d,fill:"none",stroke:opt.col||C.accent,"stroke-width":2.1,
    "stroke-linejoin":"round"},svg);
  for(let i=0;i<n;i++){
    const c=el("circle",{cx:X(i),cy:Y(opt.mean[i]),r:2.6,fill:opt.col||C.accent},svg);
    c.addEventListener("mousemove",ev=>showTip(
      `<div class="tt-t">${opt.xLabel.split("·")[0].trim()} ${xLab(i)}</div>`+
      `<div class="tt-r">${opt.mean[i].toFixed(3)}${opt.sd?" ± "+opt.sd[i].toFixed(3):""}</div>`,
      ev.clientX,ev.clientY));
    c.addEventListener("mouseleave",hideTip);
  }
  /* an optional marked point (the theoretical steady state) */
  if(opt.star){
    const sx=XV(opt.star.x), sy=Y(opt.star.y);
    let pts=[];
    for(let k=0;k<10;k++){
      const R=k%2?3.4:8.2, a=-Math.PI/2+k*Math.PI/5;
      pts.push((sx+R*Math.cos(a)).toFixed(1)+","+(sy+R*Math.sin(a)).toFixed(1));
    }
    el("polygon",{points:pts.join(" "),fill:C.theory,stroke:"#fff","stroke-width":1.2},svg);
    if(opt.star.label){
      const lx=clamp(sx,padL+4,W-padR-4), ly=clamp(sy+26,padT+14,H-padB-4);
      const at={class:"tick","text-anchor":sx>W/2?"end":"start","font-weight":"700"};
      txt(svg,sx>W/2?lx-10:lx+10,ly,opt.star.label,
        Object.assign({},at,{fill:"none",stroke:"#fbf9f4","stroke-width":3.5}));
      txt(svg,sx>W/2?lx-10:lx+10,ly,opt.star.label,Object.assign({},at,{fill:C.theory}));
    }
  }
  /* flag values pushed off either end of the axis rather than silently
     flattening them; nudged inward so the label never sits on a tick */
  for(let i=0;i<n;i++){
    const v=opt.mean[i];
    if(v<=y1 && v>=y0) continue;
    const up=v>y1;
    txt(svg,clamp(X(i),padL+36,W-padR-36), up?padT+13:H-padB-7,
      (up?"↑ ":"↓ ")+v.toFixed(v>=10||v<=-10?1:2),
      {class:"tick","text-anchor":"middle",fill:opt.col||C.accent,"font-weight":"700"});
  }
}

function drawFig1(){
  const a=$("#fig1Reward"), b=$("#fig1Theta");
  if(a) seriesPanel(a,{mean:FIG1.fin,sd:FIG1.finSd,y0:-0.10,y1:0.35,
    yTicks:[-0.1,0,0.1,0.2,0.3],xTicks:[0,2,4,6,8,10,11],
    xLabel:"episode",yLabel:"final reward per period",col:C.neither,
    ref:THEORY_R,refLabel:"theory 0.168"});
  if(b) seriesPanel(b,{mean:FIG1.th,sd:FIG1.thSd,y0:0,y1:1.2,
    yTicks:[0,0.3,0.6,0.9,1.2],xTicks:[0,2,4,6,8,10,11],
    xLabel:"episode",yLabel:"market tightness θ",col:C.neither,
    ref:THEORY_TH,refLabel:"theory 0.78"});
}

function drawFig2(){
  const a=$("#fig2Reward"), b=$("#fig2Theta"), xt=[0,10,20,30,40,49];
  if(a) seriesPanel(a,{mean:FIG24.f2Rew,sd:FIG24.f2RewSd,y0:0.10,y1:0.26,
    yTicks:[0.10,0.14,0.18,0.22,0.26],xTicks:xt,
    xLabel:"mean-field iteration",yLabel:"reward per period",col:C.both,
    ref:THEORY_R,refLabel:"theory 0.168"});
  if(b) seriesPanel(b,{mean:FIG24.f2Th,sd:FIG24.f2ThSd,y0:0.2,y1:1.0,
    yTicks:[0.2,0.4,0.6,0.8,1.0],xTicks:xt,
    xLabel:"mean-field iteration",yLabel:"market tightness θ",col:C.both,
    ref:THEORY_TH,refLabel:"theory 0.78"});
}

function drawFig3(){
  const a=$("#fig3Struct"), b=$("#fig3Param");
  if(a) seriesPanel(a,{mean:FIG24.f3St,sd:FIG24.f3StSd,y0:0.25,y1:1.05,
    yTicks:[0.25,0.45,0.65,0.85,1.05],xTicks:[0,10,20,30,40,49],
    xLabel:"mean-field iteration",yLabel:"market tightness θ",col:C.struct,
    ref:THEORY_TH,refLabel:"theory 0.78"});
  if(b) seriesPanel(b,{mean:FIG24.f3Pa,sd:FIG24.f3PaSd,y0:0,y1:0.9,
    yTicks:[0,0.3,0.6,0.9],xTicks:[0,5,10,15,19],
    xLabel:"episode",yLabel:"market tightness θ",col:C.param,
    ref:THEORY_TH,refLabel:"theory 0.78"});
}

function drawFig4(){
  const s=$("#fig4Policy");
  if(!s) return;
  seriesPanel(s,{mean:FIG24.f4Th,sd:FIG24.f4ThSd,xs:FIG24.f4u,x0:0,x1:0.21,
    W:940,H:340,padL:64,padR:22,
    y0:0.4,y1:2.8,yTicks:[0.4,1.0,1.6,2.2,2.8],
    xTicks:[0,0.05,0.10,0.15,0.20],xFmt:v=>v.toFixed(2),
    xLabel:"unemployment rate u",yLabel:"market tightness θ",col:C.both,
    ref:THEORY_TH,refLabel:"theory 0.78",
    star:{x:THEORY_U,y:THEORY_TH,label:"steady state (0.033, 0.78)"}});
}

/* =====================================================
   1. THE BENCHMARK
   The calibration is fixed at the paper's Table 1 — it is printed on the
   page rather than exposed as sliders. Everything below solves against it.
   ===================================================== */
function renderEq(){
  const e=equilibrium();
  $("#benchTh").textContent = e ? e.th.toFixed(3) : "—";
  renderQuad(); drawFOC();
}

/* =====================================================
   2. THE 2x2 CORRECTION GRID
   ===================================================== */
const CASES=[
  {id:"cellNaive", eco:false, mono:true,  col:C.neither, nm:"Neither correction",
   d:"The published naive run. A manipulator that also thinks hiring is cheap."},
  {id:"cellParam", eco:true,  mono:true,  col:C.param,   nm:"Parametric only",
   d:"Cost is right, but the agent still suppresses tightness to hold wages down."},
  {id:"cellStruct",eco:false, mono:false, col:C.struct,  nm:"Structural only",
   d:"A genuine price-taker that under-prices vacancies, so it over-hires."},
  {id:"cellBoth",  eco:true,  mono:false, col:C.both,    nm:"Both corrections",
   d:"Price-taking and correctly priced. This is the competitive equilibrium."}
];
function renderQuad(){
  const bench=equilibrium();
  if(!bench) return;
  const all=CASES.map(c=>solveCase(c.eco,c.mono)).filter(Boolean).map(s=>s.th);
  const hi=Math.max(bench.th,...all)*1.08;
  CASES.forEach(c=>{
    const s=solveCase(c.eco,c.mono), node=$("#"+c.id);
    if(!node) return;
    if(!s){ node.innerHTML=`<div class="nm">${c.nm}</div><div class="th">—</div>
      <p class="d">No interior solution at this calibration.</p>`; return; }
    const gap=(s.th-bench.th)/bench.th*100;
    const near=Math.abs(gap)<2;
    node.innerHTML=
      `<div class="nm">${c.nm}</div>`+
      `<div class="th">${s.th.toFixed(3)} <small>θ</small></div>`+
      `<div class="gap">${near?"on the benchmark":(gap>0?"+":"")+gap.toFixed(0)+"% vs θ*"}</div>`+
      `<p class="d">${c.d}</p>`+
      `<div class="bar"><i style="width:${clamp(s.th/hi*100,1,100)}%"></i>`+
      `<u style="left:${clamp(bench.th/hi*100,0,99.6)}%"></u></div>`;
    node.title=`u = ${(s.u*100).toFixed(1)}%   l = ${s.l.toFixed(4)}   w = ${s.w.toFixed(3)}`;
  });
}

/* =====================================================
   3. FIRST-ORDER-CONDITION DIAGRAM
   ===================================================== */
function drawFOC(){
  const svg=$("#focChart"); if(!svg) return; svg.innerHTML="";
  const W=960,H=420,padL=64,padR=200,padT=22,padB=48;
  const iw=W-padL-padR, ih=H-padT-padB;
  const bench=equilibrium(); if(!bench) return;
  const sols=CASES.map(c=>({c,s:solveCase(c.eco,c.mono)}));
  const thMax=Math.max(1.05, ...sols.map(x=>x.s?x.s.th:0))*1.25;
  const thMin=0.02;
  /* the four perceived costs span more than an order of magnitude, so the
     vertical axis is logarithmic — otherwise either the monopsony pair or
     the price-taking pair is unreadable. */
  const y0=0.002, y1=0.40, L=Math.log10;
  const X=th=>padL+iw*(th-thMin)/(thMax-thMin);
  const Y=v=>padT+ih*(1-(L(clamp(v,y0,y1))-L(y0))/(L(y1)-L(y0)));
  /* axes */
  const nTicks=5;
  for(let i=0;i<=nTicks;i++){
    const th=thMin+(thMax-thMin)*i/nTicks;
    el("line",{x1:X(th),y1:padT,x2:X(th),y2:H-padB,class:"grid-line"},svg);
    txt(svg,X(th),H-padB+16,th.toFixed(2),{class:"tick","text-anchor":"middle"});
  }
  [0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.4].forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line"},svg);
    txt(svg,padL-8,Y(v)+4,v.toFixed(v<0.01?3:v<0.1?2:1),{class:"tick","text-anchor":"end"});
  });
  txt(svg,padL+iw/2,H-12,"market tightness θ",{class:"axlab","text-anchor":"middle"});
  txt(svg,padL,padT-7,"per-worker value  (log scale)",{class:"axlab"});
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);

  const curve=(fn,col,w,dash)=>{
    let d="",on=false;
    for(let i=0;i<=300;i++){
      const th=thMin+(thMax-thMin)*i/300, v=fn(th);
      if(!isFinite(v)||v<y0||v>y1){ on=false; continue; }
      d+=(on?"L":"M")+X(th).toFixed(1)+" "+Y(v).toFixed(1)+" "; on=true;
    }
    const p=el("path",{d,fill:"none",stroke:col,"stroke-width":w,
      "stroke-linejoin":"round","stroke-linecap":"round"},svg);
    if(dash) p.setAttribute("stroke-dasharray",dash);
  };
  /* marginal surplus */
  curve(th=>surplus(lOfTh(th),th), C.theory, 2.6);
  /* the four perceived marginal costs */
  CASES.forEach(c=>curve(th=>mcost(lOfTh(th),c.eco,c.mono), c.col, 2));

  /* benchmark line + intersection markers */
  el("line",{x1:X(bench.th),y1:padT,x2:X(bench.th),y2:H-padB,stroke:C.theory,
    "stroke-width":1.2,"stroke-dasharray":"5 4",opacity:.55},svg);
  txt(svg,X(bench.th),padT+13,"θ* = "+bench.th.toFixed(2),
    {class:"tick","text-anchor":"middle",fill:C.theory,"font-weight":"700","font-size":"11.5"});

  sols.forEach(({c,s})=>{
    if(!s||s.th<thMin||s.th>thMax) return;
    const yv=surplus(lOfTh(s.th),s.th);
    if(yv<y0||yv>y1) return;
    const dot=el("circle",{cx:X(s.th),cy:Y(yv),r:6,fill:c.col,
      stroke:"#fffdf7","stroke-width":2},svg);
    dot.addEventListener("mousemove",ev=>showTip(
      `<div class="tt-t" style="color:${c.col}">${c.nm}</div>
       <div class="tt-r">θ = ${s.th.toFixed(3)} · u = ${(s.u*100).toFixed(1)}%<br>w = ${s.w.toFixed(3)}</div>`,
      ev.clientX,ev.clientY));
    dot.addEventListener("mouseleave",hideTip);
  });

  /* right-hand labels: clamp into the plot first, then spread, so two curves
     pinned to the same edge cannot collide */
  const edge=thMax*0.995;
  const labs=CASES.map(c=>{
    const v=mcost(lOfTh(edge),c.eco,c.mono);
    return {nm:c.nm, col:c.col, y:clamp(Y(isFinite(v)?v:y1),padT+10,H-padB)};
  });
  labs.push({nm:"marginal surplus", col:C.theory,
             y:clamp(Y(surplus(lOfTh(edge),edge)),padT+10,H-padB)});
  labs.sort((a,b)=>a.y-b.y);
  for(let i=1;i<labs.length;i++)
    if(labs[i].y-labs[i-1].y<19) labs[i].y=labs[i-1].y+19;
  labs.forEach(o=>txt(svg,W-padR+12,o.y+4,o.nm,
    {"font-size":"12.5","font-weight":"600",fill:o.col}));
}

/* =====================================================
   4. chi = 1 + r / lambda
   ===================================================== */
function drawChi(){
  const svg=$("#chiChart"); if(!svg) return; svg.innerHTML="";
  const r=+$("#chiR").value, lam=+$("#chiL").value;
  $("#chiRv").textContent=r.toFixed(4);
  $("#chiLv").textContent=lam.toFixed(4);
  const chi=1+r/lam;
  $("#chiVal").textContent=chi.toFixed(2)+"×";
  $("#ceffVal").textContent=(0.268*chi).toFixed(3);

  const W=560,H=380,padL=54,padR=20,padT=22,padB=52;
  const iw=W-padL-padR, ih=H-padT-padB;
  const lMin=0.004, lMax=0.08, yMax=6;
  const Xl=l=>padL+iw*(clamp(l,lMin,lMax)-lMin)/(lMax-lMin);
  const Yv=v=>padT+ih*(1-(clamp(v,1,yMax)-1)/(yMax-1));
  [1,2,3,4,5,6].forEach(v=>{
    el("line",{x1:padL,y1:Yv(v),x2:W-padR,y2:Yv(v),class:"grid-line"},svg);
    txt(svg,padL-8,Yv(v)+4,v+"×",{class:"tick","text-anchor":"end"}); });
  [0.01,0.02,0.04,0.06,0.08].forEach(l=>{
    el("line",{x1:Xl(l),y1:padT,x2:Xl(l),y2:H-padB,class:"grid-line"},svg);
    txt(svg,Xl(l),H-padB+16,l.toFixed(2),{class:"tick","text-anchor":"middle"}); });
  txt(svg,padL+iw/2,H-14,"separation rate λ",{class:"axlab","text-anchor":"middle"});
  txt(svg,padL,padT-7,"χ · cost understatement",{class:"axlab"});
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);

  const line=(rr,col,w,dash,op)=>{
    let d="",on=false;
    for(let i=0;i<=260;i++){
      const l=lMin+(lMax-lMin)*i/260, v=1+rr/l;
      if(v>yMax){ on=false; continue; }
      d+=(on?"L":"M")+Xl(l).toFixed(1)+" "+Yv(v).toFixed(1)+" "; on=true;
    }
    const p=el("path",{d,fill:"none",stroke:col,"stroke-width":w,opacity:op===undefined?1:op},svg);
    if(dash) p.setAttribute("stroke-dasharray",dash);
  };
  [0.005,0.02,0.035,0.05].forEach(rr=>line(rr,C.muted,1.2,"4 4",.45));
  line(r,C.neither,2.4);
  /* the paper's own calibration, for reference */
  el("circle",{cx:Xl(0.0144),cy:Yv(1+0.01/0.0144),r:4,fill:"none",
    stroke:C.theory,"stroke-width":1.6,opacity:.7},svg);
  txt(svg,Xl(0.0144)+11,Yv(1+0.01/0.0144)+16,"paper: 1.69×",
    {class:"tick",fill:C.theory,"font-size":"11","font-weight":"600"});
  /* the live point, with a halo drawn under the glyphs so it stays legible */
  const cx=Xl(lam), cy=Yv(chi), off=chi>yMax;
  el("circle",{cx,cy,r:6.5,fill:C.neither,stroke:"#fffdf7","stroke-width":2.2},svg);
  const lx=clamp(cx,padL+38,W-padR-38), ly=clamp(cy-15,padT+14,H-padB-4);
  const label=(chi>99?chi.toFixed(0):chi.toFixed(2))+"×"+(off?" ↑":"");
  txt(svg,lx,ly,label,{"text-anchor":"middle","font-size":"14","font-weight":"700",
    fill:"none",stroke:"#fffdf7","stroke-width":"3.5","stroke-linejoin":"round"});
  txt(svg,lx,ly,label,{"text-anchor":"middle","font-size":"14","font-weight":"700",fill:C.neither});
}

/* =====================================================
   5. MEAN-FIELD FIXED-POINT ITERATION
   ===================================================== */
function drawFP(){
  const svg=$("#fpChart"); if(!svg) return; svg.innerHTML="";
  const eta=+$("#etaIn").value, th0=+$("#th0In").value;
  $("#etaVal").textContent=eta.toFixed(4);
  $("#th0Val").textContent=th0.toFixed(2);
  const bench=equilibrium(); if(!bench) return;
  const ths=bench.th;
  const h=1e-5, slope=(Psi(ths+h)-Psi(ths-h))/(2*h);
  const thresh=2/(1-slope);
  $("#fpSlope").textContent=slope.toFixed(0);
  $("#fpEta").textContent=thresh>0? thresh.toFixed(4) : "—";

  /* Linearised around the fixed point, which is what Theorem 1 is about:
       th_{k+1} - th* = s (th_k - th*),   s = 1 + eta (Psi' - 1).
     The raw map itself cannot be iterated from below th*, where the firm's
     static best response is a corner — see the note under the chart. */
  const s=1+eta*(slope-1);
  const converged=Math.abs(s)<1;
  $("#fpVerdict").textContent = converged ? "contracts" : "diverges";
  $("#fpVerdict").style.color = converged ? C.both : C.neither;

  const N=40;
  const W=640,H=380,padL=54,padR=18,padT=22,padB=48;
  const iw=W-padL-padR, ih=H-padT-padB;
  const yMax=Math.max(1.25, ths*1.6);
  const X=k=>padL+iw*k/N;
  const Y=v=>padT+ih*(1-clamp(v,0,yMax)/yMax);
  [0,0.25,0.5,0.75,1,1.25].filter(v=>v<=yMax).forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line"},svg);
    txt(svg,padL-8,Y(v)+4,v.toFixed(2),{class:"tick","text-anchor":"end"}); });
  [0,10,20,30,40].forEach(k=>
    txt(svg,X(k),H-padB+16,String(k),{class:"tick","text-anchor":"middle"}));
  txt(svg,padL+iw/2,H-12,"mean-field iteration k",{class:"axlab","text-anchor":"middle"});
  txt(svg,padL,padT-7,"market tightness θ  (linearised)",{class:"axlab"});
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);

  el("line",{x1:padL,y1:Y(ths),x2:W-padR,y2:Y(ths),stroke:C.theory,
    "stroke-width":1.4,"stroke-dasharray":"6 4",opacity:.7},svg);
  txt(svg,W-padR-4,Y(ths)-8,"θ* = "+ths.toFixed(3),
    {class:"tick","text-anchor":"end",fill:C.theory,"font-weight":"700","font-size":"11.5"});

  let d="", dev=th0-ths, clipped=false;
  for(let k=0;k<=N;k++){
    const v=ths+dev;
    if(v<0||v>yMax) clipped=true;
    d+=(k===0?"M":"L")+X(k).toFixed(1)+" "+Y(v).toFixed(1)+" ";
    dev*=s;
    if(!isFinite(dev)) break;
  }
  el("path",{d,fill:"none",stroke:converged?C.accent:C.neither,"stroke-width":2,
    "stroke-linejoin":"round"},svg);
  el("circle",{cx:X(0),cy:Y(th0),r:5,fill:C.accent,stroke:"#fffdf7","stroke-width":2},svg);
  txt(svg,padL+8,padT+14,
    "s = 1 + ω(Ψ′−1) = "+s.toFixed(3)+"   →   "+(converged?"|s| < 1, contracts":"|s| > 1, diverges"),
    {"font-size":"12.5","font-weight":"700",fill:converged?C.both:C.neither});
  if(clipped) txt(svg,W-padR-4,padT+14,"path leaves the axis",
    {"text-anchor":"end","font-size":"11.5",fill:C.muted});
}

/* =====================================================
   6. PAGE PLUMBING
   ===================================================== */
const progress=$("#progress");
addEventListener("scroll",()=>{
  const st=document.documentElement.scrollTop, sh=document.documentElement.scrollHeight-innerHeight;
  progress.style.width=(sh>0?st/sh*100:0)+"%";
},{passive:true});

const revObs=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){ e.target.classList.add("in"); revObs.unobserve(e.target); }
}),{threshold:.1});
$$(".reveal").forEach(x=>revObs.observe(x));
setTimeout(()=>$$(".reveal:not(.in)").forEach(x=>x.classList.add("in")),3500);

const secIds=["conflict","model","structural","parametric","fix","results","cite"];
const spy=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){
  $$(".nav-links a").forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+e.target.id));
}}),{rootMargin:"-45% 0px -50% 0px"});
secIds.forEach(id=>{ const s=document.getElementById(id); if(s) spy.observe(s); });

$("#burger").addEventListener("click",()=>$("#navlinks").classList.toggle("open"));
$$(".nav-links a").forEach(a=>a.addEventListener("click",()=>$("#navlinks").classList.remove("open")));

$("#copyBib").addEventListener("click",()=>{
  const s=$("#bibtex").textContent;
  const done=()=>{ $("#copyMsg").textContent="copied"; setTimeout(()=>$("#copyMsg").textContent="",1800); };
  if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(s).then(done,done);
  else { const ta=document.createElement("textarea"); ta.value=s; document.body.appendChild(ta);
    ta.select(); try{document.execCommand("copy");}catch(e){} ta.remove(); done(); }
});

/* control wiring */
["chiR","chiL"].forEach(id=>$("#"+id).addEventListener("input",drawChi));
["etaIn","th0In"].forEach(id=>$("#"+id).addEventListener("input",drawFP));

/* ---------- init ---------- */
function init(){
  const safe=(n,f)=>{ try{ f(); }catch(err){ console.error("["+n+"]",err); } };
  safe("fig1",drawFig1);
  safe("fig2",drawFig2);
  safe("fig3",drawFig3);
  safe("fig4",drawFig4);
  safe("equilibrium",renderEq);
  safe("chi",drawChi);
  safe("fixed point",drawFP);
}
if(document.readyState!=="loading") init(); else addEventListener("DOMContentLoaded",init);
})();
