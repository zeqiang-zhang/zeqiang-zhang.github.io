/* ============================================================
   Cognitive information frictions — interactive figures.
   Vanilla JS, no dependencies, offline-safe, no external assets.

   Every figure and simulator on the page is generated here, from the
   authors' own simulation code:
     · micro  — the active-inference POMDP of test3.ipynb
     · macro  — the aggregate system of macro.ipynb
     · policy — the (k, c) heatmaps of policy.ipynb
   ============================================================ */
(function(){
"use strict";

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const NS = "http://www.w3.org/2000/svg";
const C  = { alpha:'#2f6fa8', belief:'#c0392b', entropy:'#7d3c98', accent:'#6b4c9a',
             prag:'#b5762e', good:'#3f7a4e', ink:'#2b261f', ink2:'#5b544a', muted:'#8b8173',
             line:'rgba(58,46,28,.16)', line2:'rgba(58,46,28,.28)', track:'rgba(58,46,28,.07)' };

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
   SHARED — small time-series panel
   ===================================================== */
function panelShell(host,defs){
  host.innerHTML="";
  return defs.map(d=>{
    const w=document.createElement("div"); w.className="panel";
    w.innerHTML=`<div class="ph"><span class="t">${d.title}</span><span class="u">${d.unit||''}</span></div>`;
    const svg=el("svg",{viewBox:"0 0 340 150"});
    w.appendChild(svg); host.appendChild(w);
    return {svg,def:d};
  });
}
/* round a value to a tick-friendly number of decimals for the given span */
function tickFmt(span){
  const dp = span>=1 ? 1 : span>=0.2 ? 2 : span>=0.02 ? 3 : 4;
  return v=>v.toFixed(dp);
}
function drawPanel(svg,def,series,upTo,marks){
  svg.innerHTML="";
  const W=340,H=150,padL=40,padR=8,padT=10,padB=22;
  const iw=W-padL-padR, ih=H-padT-padB;
  let y0,y1,ticks,fmt;
  if(def.auto){                       // fit the axis to this run, so nothing ever clips
    let lo=Infinity, hi=-Infinity;
    series.forEach(s=>s.pts.forEach(v=>{ if(v<lo)lo=v; if(v>hi)hi=v; }));
    if(!isFinite(lo)||!isFinite(hi)){ lo=0; hi=1; }
    const pad=Math.max((hi-lo)*0.10, 1e-4);
    y0=lo-pad; y1=hi+pad;
    ticks=[y0,(y0+y1)/2,y1]; fmt=def.fmt||tickFmt(y1-y0);
  } else {
    y0=def.min!==undefined?def.min:0; y1=def.max;
    ticks=def.ticks||[y0,(y0+y1)/2,y1]; fmt=def.fmt||(v=>String(v));
  }
  const X=t=>padL+iw*t/(def.T-1);
  const Y=v=>padT+ih*(1-(clamp(v,y0,y1)-y0)/(y1-y0));
  ticks.forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line"},svg);
    txt(svg,padL-6,Y(v)+3.5,fmt(v),{class:"tick","text-anchor":"end","font-size":"9.5"});
  });
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
  [0,Math.floor((def.T-1)/2),def.T-1].forEach(t=>
    txt(svg,X(t),H-padB+13,String(t),{class:"tick","text-anchor":"middle","font-size":"9.5"}));
  (marks||[]).forEach(m=>{
    if(m<0||m>=def.T) return;
    el("line",{x1:X(m),y1:padT,x2:X(m),y2:H-padB,stroke:C.ink2,
      "stroke-width":1.2,"stroke-dasharray":"3 3",opacity:.75},svg);
  });
  const n = upTo===undefined ? def.T : clamp(upTo,1,def.T);
  series.forEach(s=>{
    let d="";
    for(let t=0;t<n;t++) d += (t===0?"M":"L")+X(t).toFixed(1)+" "+Y(s.pts[t]).toFixed(1)+" ";
    el("path",{d,class:"ser",stroke:s.c,"stroke-width":s.sw||1.8},svg);
    if(n>0) el("circle",{cx:X(n-1),cy:Y(s.pts[n-1]),r:2.6,fill:s.c},svg);
  });
}

/* =====================================================
   1. MICRO — the active-inference job seeker
   Ported from the authors' own notebook (test3.ipynb), not from the
   appendix prose: same A / B / C matrices, same partial belief update,
   same discrete sampled action.  Observation indices are
   0 no_offer, 1 low_A, 2 high_A, 3 low_B, 4 high_B, 5 news_A, 6 news_B.
   ===================================================== */
const ALPHAS=[0.1,0.5,0.9];
const PREF=[0.1,0.8,7.0,0.8,7.0,1.0,1.0];        // C-vector, before the log
const CVEC=PREF.map(p=>Math.log(p+1e-9));

/* A_pragmatic[o][s][pa] — pa = 0 apply for A-type jobs, 1 for B-type */
const APRAG=(()=>{
  const P=Array.from({length:7},()=>[[0,0],[0,0]]);
  P[2][0][0]=0.6; P[1][0][0]=0.3; P[0][0][0]=0.1;   // apply A, world is A
  P[0][1][0]=0.9; P[1][1][0]=0.1;                    // apply A, world is B
  P[4][1][1]=0.6; P[3][1][1]=0.3; P[0][1][1]=0.1;   // apply B, world is B
  P[0][0][1]=0.9; P[3][0][1]=0.1;                    // apply B, world is A
  return P;
})();
/* A_epistemic[o][s] — the news channel */
const AEPI=[[0,0],[0,0],[0,0],[0,0],[0,0],[0.8,0.2],[0.2,0.8]];

const entNat=q=>-(q.reduce((a,p)=>a+(p>1e-12?p*Math.log(p):0),0));
const entBin=b=>{ const x=clamp(b,1e-9,1-1e-9);
  return -(x*Math.log(x)+(1-x)*Math.log(1-x)); };

/* the policy mixes the two channels: A_mixed = (1-a) A_prag + a A_epi */
function mixed(alpha,pa){
  const M=new Array(7);
  for(let o=0;o<7;o++) M[o]=[ (1-alpha)*APRAG[o][0][pa]+alpha*AEPI[o][0],
                              (1-alpha)*APRAG[o][1][pa]+alpha*AEPI[o][1] ];
  return M;
}
/* expected free energy: G = -(pragmatic value + information gain), so that
   minimising G rewards anticipated information gain — the sign the authors'
   code uses, and the one that reproduces the published behaviour.        */
function policy(q,eps,beta){
  const pa = q[0]>=q[1] ? 0 : 1;
  const qp = [(1-eps)*q[0]+eps*q[1], (1-eps)*q[1]+eps*q[0]];
  const Hp = entNat(qp);
  const G = ALPHAS.map(alpha=>{
    const M=mixed(alpha,pa);
    let prag=0, cond=0;
    for(let o=0;o<7;o++){
      const qo=M[o][0]*qp[0]+M[o][1]*qp[1];
      if(qo<1e-12) continue;
      prag += qo*CVEC[o];
      cond += qo*entNat([M[o][0]*qp[0]/qo, M[o][1]*qp[1]/qo]);
    }
    return -(prag + (Hp-cond));
  });
  const m=Math.min(...G), w=G.map(g=>Math.exp(-beta*(g-m))), Z=w.reduce((a,b)=>a+b,0);
  return { pa, qp, pi:w.map(x=>x/Z) };
}
/* the environment. Note it is slightly harsher than the agent's own model:
   a mismatched application always returns "no offer", and a matched one
   never does. Both asymmetries are in the notebook.                      */
function observe(trueS,alpha,pa,rnd){
  if(rnd()>alpha){
    if(trueS!==pa) return 0;
    return rnd()<0.6 ? (trueS===0?2:4) : (trueS===0?1:3);
  }
  return trueS===0 ? (rnd()<0.8?5:6) : (rnd()<0.8?6:5);
}

function runMicro(P){
  let rs=(P.seed>>>0)||1; const rnd=()=>{ rs=(rs*1664525+1013904223)>>>0; return rs/4294967296; };
  const pick=w=>{ const r=rnd(); let c=0; for(let i=0;i<w.length;i++){ c+=w[i]; if(r<c) return i; }
    return w.length-1; };
  let q=[P.prior,1-P.prior], lastAlpha=0.1, lastPa=0;
  const out=[];
  for(let t=0;t<P.T;t++){
    const trueS = t<P.shockT ? 0 : 1;
    const {pa,qp,pi}=policy(q,P.eps,P.beta);
    const alpha=ALPHAS[pick(pi)];                  // a sampled action, not its expectation
    const o=observe(trueS,alpha,pa,rnd);
    /* the notebook updates with the PREVIOUS step's alpha and applied
       direction, and switches likelihood hard at alpha > 0.5 */
    const lik = lastAlpha>0.5 ? [AEPI[o][0],AEPI[o][1]]
                              : [APRAG[o][0][lastPa],APRAG[o][1][lastPa]];
    let post=[lik[0]*qp[0], lik[1]*qp[1]];
    const s=post[0]+post[1];
    post = s>1e-12 ? [post[0]/s,post[1]/s] : [0.5,0.5];
    /* partial Bayesian update — belief inertia, the notebook's learning_rate */
    const f0=(1-P.lr)*qp[0]+P.lr*post[0], f1=(1-P.lr)*qp[1]+P.lr*post[1], z=f0+f1;
    q=[f0/z, f1/z];
    out.push({t, bel:q[0], alpha, H:entBin(q[0])});
    lastAlpha=alpha; lastPa=pa;
  }
  return out;
}
/* N independent runs, averaged pointwise — this is what the published
   figures plot, and what turns the three-valued alpha into a smooth curve */
function ensembleMicro(P,N){
  const runs=[];
  for(let i=0;i<N;i++) runs.push(runMicro(Object.assign({},P,{seed:(i+1)*7919})));
  const T=P.T, mean=k=>Array.from({length:T},(_,t)=>
    runs.reduce((a,r)=>a+r[t][k],0)/N);
  const bel=mean("bel"), alpha=mean("alpha"), H=mean("H");
  const flatA=[], flatH=[];
  runs.forEach(r=>r.forEach(d=>{ flatA.push(d.alpha); flatH.push(d.H); }));
  return { series:Array.from({length:T},(_,t)=>({t,bel:bel[t],alpha:alpha[t],H:H[t]})),
           flatA, flatH };
}
function pearson(x,y){
  const n=x.length, mx=x.reduce((a,b)=>a+b,0)/n, my=y.reduce((a,b)=>a+b,0)/n;
  let sx=0,sy=0,sxy=0;
  for(let i=0;i<n;i++){ const a=x[i]-mx,b=y[i]-my; sx+=a*a; sy+=b*b; sxy+=a*b; }
  return (sx<1e-12||sy<1e-12) ? 0 : sxy/Math.sqrt(sx*sy);
}

const MICRO_T=60;
const MICRO_DEFS=[
  {title:'Effort on learning',unit:'α',max:1,min:0,ticks:[0,0.5,1],T:MICRO_T,k:'alpha',
   fmt:v=>v.toFixed(1)},
  {title:'Belief in the old economy',unit:'p(A)',max:1,min:0,ticks:[0,0.5,1],T:MICRO_T,k:'bel',
   fmt:v=>v.toFixed(1)},
  {title:'Belief entropy',unit:'nats',max:0.72,min:0,ticks:[0,0.35,0.69],T:MICRO_T,k:'H',
   fmt:v=>v.toFixed(2)},
  {title:'Effort against uncertainty',unit:'scatter',T:MICRO_T,k:'scatter'}
];
const MICRO_N=100;                       // runs averaged in ensemble mode
let microCells=null, microH=null, microRAF=0, microAnim=true, microSeed=1,
    microMean=true, microFlat=null;

/* =====================================================
   1b. FIGURES 1-3 — the authors' own simulation, replotted
   Produced by running test3.ipynb unchanged (numpy, seed 0, 100 runs,
   T=60, shock at 30, learning_rate=0.4, beta=10) and keeping the three
   averaged series. Drawn here in the page's own palette instead of the
   matplotlib defaults.
   ===================================================== */
const FIG={
  alpha:[0.112,0.108,0.116,0.132,0.124,0.168,0.176,0.212,0.176,0.18,0.18,0.188,0.184,0.212,0.22,
    0.24,0.24,0.264,0.212,0.24,0.244,0.244,0.24,0.2,0.22,0.228,0.212,0.228,0.232,0.204,0.208,0.38,
    0.612,0.696,0.66,0.584,0.56,0.524,0.456,0.404,0.44,0.428,0.384,0.304,0.292,0.364,0.32,0.364,
    0.344,0.34,0.26,0.292,0.268,0.284,0.268,0.244,0.252,0.248,0.236,0.212],
  belief:[0.9829,0.9671,0.9464,0.9241,0.9132,0.9022,0.9019,0.8954,0.8864,0.8833,0.8762,0.8681,
    0.8646,0.8586,0.8386,0.8321,0.8285,0.8104,0.8201,0.8403,0.8482,0.8499,0.8491,0.8575,0.8529,
    0.8565,0.8529,0.8611,0.8701,0.8576,0.7132,0.581,0.5036,0.4584,0.4448,0.4281,0.3883,0.3656,
    0.3346,0.3072,0.2928,0.2729,0.2575,0.2393,0.2251,0.2298,0.2248,0.2265,0.2031,0.1913,0.1955,
    0.2,0.1894,0.1823,0.191,0.1792,0.1658,0.1655,0.1599,0.1703],
  entropy:[0.0655,0.1115,0.1591,0.2092,0.2272,0.2475,0.252,0.2613,0.2857,0.2895,0.3066,0.3168,
    0.3267,0.3218,0.3496,0.3685,0.3705,0.3897,0.3846,0.3639,0.3507,0.3397,0.3435,0.3305,0.3318,
    0.3332,0.3386,0.33,0.3175,0.3408,0.5413,0.6569,0.6848,0.6718,0.6623,0.6493,0.6279,0.6064,
    0.5779,0.5501,0.5339,0.498,0.4868,0.4813,0.4535,0.459,0.4465,0.4368,0.4149,0.4059,0.4119,
    0.4079,0.3958,0.3905,0.4007,0.3851,0.3621,0.3526,0.341,0.3517],
  corrCurve:0.9109, corrFlat:0.6255, shock:30
};

/* shared frame for the three replotted figures */
function figFrame(svg,W,H,pad,xMax){
  svg.innerHTML="";
  const {L,R,T,B}=pad, iw=W-L-R, ih=H-T-B;
  const X=t=>L+iw*t/(xMax-1);
  [0,10,20,30,40,50,59].forEach(t=>{
    el("line",{x1:X(t),y1:T,x2:X(t),y2:H-B,class:"grid-line"},svg);
    txt(svg,X(t),H-B+17,String(t===59?60:t),{class:"tick","text-anchor":"middle"}); });
  txt(svg,L+iw/2,H-6,"time step",{class:"axlab","text-anchor":"middle"});
  el("line",{x1:L,y1:H-B,x2:W-R,y2:H-B,class:"axis-line"},svg);
  return {X,iw,ih};
}
function shockMark(svg,X,pad,H,label){
  const x=X(FIG.shock);
  el("line",{x1:x,y1:pad.T,x2:x,y2:H-pad.B,stroke:C.ink2,"stroke-width":1.4,
    "stroke-dasharray":"3 3",opacity:.8},svg);
  if(label) txt(svg,x+6,pad.T+13,"structural shock",
    {class:"tick",fill:C.ink2,"font-weight":"600","font-size":"11"});
}
function line(svg,X,Y,arr,col,w){
  let d="";
  arr.forEach((v,t)=>{ d+=(t===0?"M":"L")+X(t).toFixed(1)+" "+Y(v).toFixed(1)+" "; });
  el("path",{d,fill:"none",stroke:col,"stroke-width":w||2,"stroke-linejoin":"round"},svg);
  arr.forEach((v,t)=>{ if(t%2===0) el("circle",{cx:X(t),cy:Y(v),r:1.9,fill:col,opacity:.85},svg); });
}
/* Figure 1 — alpha and belief, twin axes */
function drawFig1(){
  const svg=$("#fig1Chart"); if(!svg) return;
  const W=900,H=330,pad={L:56,R:60,T:22,B:44};
  const {X,ih}=figFrame(svg,W,H,pad,60);
  const Ya=v=>pad.T+ih*(1-clamp(v,0,1));
  [0,0.25,0.5,0.75,1].forEach(v=>{
    el("line",{x1:pad.L,y1:Ya(v),x2:W-pad.R,y2:Ya(v),class:"grid-line"},svg);
    txt(svg,pad.L-8,Ya(v)+4,v.toFixed(2),{class:"tick","text-anchor":"end",fill:C.alpha});
    txt(svg,W-pad.R+8,Ya(v)+4,v.toFixed(2),{class:"tick",fill:C.belief}); });
  txt(svg,pad.L,pad.T-7,"α · effort on learning",{class:"axlab",fill:C.alpha});
  txt(svg,W-pad.R,pad.T-7,"p(old economy)",{class:"axlab","text-anchor":"end",fill:C.belief});
  shockMark(svg,X,pad,H,true);
  line(svg,X,Ya,FIG.belief,C.belief,2.1);
  line(svg,X,Ya,FIG.alpha,C.alpha,2.1);
}
/* Figure 2 — alpha and entropy, twin axes */
function drawFig2(){
  const svg=$("#fig2Chart"); if(!svg) return;
  const W=900,H=330,pad={L:56,R:60,T:22,B:44};
  const {X,ih}=figFrame(svg,W,H,pad,60);
  const Ya=v=>pad.T+ih*(1-clamp(v,0,1));
  const eMax=0.72, Ye=v=>pad.T+ih*(1-clamp(v,0,eMax)/eMax);
  [0,0.25,0.5,0.75,1].forEach(v=>{
    el("line",{x1:pad.L,y1:Ya(v),x2:W-pad.R,y2:Ya(v),class:"grid-line"},svg);
    txt(svg,pad.L-8,Ya(v)+4,v.toFixed(2),{class:"tick","text-anchor":"end",fill:C.alpha}); });
  [0,0.2,0.4,0.6].forEach(v=>
    txt(svg,W-pad.R+8,Ye(v)+4,v.toFixed(1),{class:"tick",fill:C.entropy}));
  txt(svg,pad.L,pad.T-7,"α · effort on learning",{class:"axlab",fill:C.alpha});
  txt(svg,W-pad.R,pad.T-7,"H · belief entropy, nats",{class:"axlab","text-anchor":"end",fill:C.entropy});
  shockMark(svg,X,pad,H,true);
  line(svg,X,Ye,FIG.entropy,C.entropy,2.1);
  line(svg,X,Ya,FIG.alpha,C.alpha,2.1);
}
/* Figure 3 — the scatter, with a least-squares fit */
function drawFig3(){
  const svg=$("#fig3Chart"); if(!svg) return; svg.innerHTML="";
  const W=620,H=380,padL=62,padR=22,padT=24,padB=52;
  const iw=W-padL-padR, ih=H-padT-padB;
  const aMax=0.75, eMax=0.75;
  const X=a=>padL+iw*clamp(a,0,aMax)/aMax;
  const Y=h=>padT+ih*(1-clamp(h,0,eMax)/eMax);
  [0,0.25,0.5,0.75].forEach(v=>{
    el("line",{x1:X(v),y1:padT,x2:X(v),y2:H-padB,class:"grid-line"},svg);
    txt(svg,X(v),H-padB+17,v.toFixed(2),{class:"tick","text-anchor":"middle"});
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line"},svg);
    txt(svg,padL-8,Y(v)+4,v.toFixed(2),{class:"tick","text-anchor":"end"}); });
  txt(svg,padL+iw/2,H-12,"α · effort on learning",{class:"axlab","text-anchor":"middle"});
  txt(svg,padL,padT-8,"H · belief entropy, nats",{class:"axlab"});
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
  const xs=FIG.alpha, ys=FIG.entropy, n=xs.length;
  const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n;
  let sxy=0,sxx=0; for(let i=0;i<n;i++){ sxy+=(xs[i]-mx)*(ys[i]-my); sxx+=(xs[i]-mx)**2; }
  const b=sxy/sxx, a=my-b*mx;
  const x0=Math.min(...xs), x1=Math.max(...xs);
  el("line",{x1:X(x0),y1:Y(a+b*x0),x2:X(x1),y2:Y(a+b*x1),stroke:C.ink2,
    "stroke-width":1.6,"stroke-dasharray":"6 4",opacity:.75},svg);
  xs.forEach((x,i)=>{
    const pre=i<FIG.shock;
    const c=el("circle",{cx:X(x),cy:Y(ys[i]),r:4.2,fill:pre?C.alpha:C.entropy,
      opacity:.72,stroke:"#fffdf7","stroke-width":1},svg);
    c.addEventListener("mousemove",ev=>showTip(
      `<div class="tt-t">step ${i}</div><div class="tt-r">α = ${x.toFixed(3)} · H = ${ys[i].toFixed(3)}</div>`,
      ev.clientX,ev.clientY));
    c.addEventListener("mouseleave",hideTip);
  });
  /* the cloud runs from lower-left to upper-right, so the top-left corner is
     the only reliably empty place for the annotation */
  txt(svg,padL+14,padT+22,"r = "+FIG.corrCurve.toFixed(3),
    {"font-size":"15","font-weight":"700",fill:C.ink});
  txt(svg,padL+14,padT+39,"on the averaged curve",{class:"tick"});
}

function drawScatter(svg,rows,upTo){
  svg.innerHTML="";
  const W=340,H=150,padL=40,padR=10,padT=12,padB=26;
  const iw=W-padL-padR, ih=H-padT-padB;
  const X=a=>padL+iw*clamp(a,0,1);
  const Y=h=>padT+ih*(1-clamp(h,0,0.72)/0.72);
  [0,0.5,1].forEach(a=>{
    el("line",{x1:X(a),y1:padT,x2:X(a),y2:H-padB,class:"grid-line"},svg);
    txt(svg,X(a),H-padB+13,a.toFixed(1),{class:"tick","text-anchor":"middle","font-size":"9.5"}); });
  [0,0.35,0.69].forEach(h=>{
    el("line",{x1:padL,y1:Y(h),x2:W-padR,y2:Y(h),class:"grid-line"},svg);
    txt(svg,padL-6,Y(h)+3.5,h.toFixed(2),{class:"tick","text-anchor":"end","font-size":"9.5"}); });
  txt(svg,padL+iw/2,H-4,"α",{class:"tick","text-anchor":"middle","font-size":"10"});
  const n=clamp(upTo===undefined?rows.length:upTo,1,rows.length);
  const xs=[],ys=[];
  for(let i=0;i<n;i++){ xs.push(rows[i].alpha); ys.push(rows[i].H);
    el("circle",{cx:X(rows[i].alpha),cy:Y(rows[i].H),r:2.4,fill:C.entropy,opacity:.62},svg); }
  if(n>2){                                   // least-squares line
    const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n;
    let sxy=0,sxx=0; for(let i=0;i<n;i++){ sxy+=(xs[i]-mx)*(ys[i]-my); sxx+=(xs[i]-mx)**2; }
    if(sxx>1e-9){ const b=sxy/sxx, a=my-b*mx;
      const x0=Math.min(...xs), x1=Math.max(...xs);
      el("line",{x1:X(x0),y1:Y(a+b*x0),x2:X(x1),y2:Y(a+b*x1),stroke:C.ink2,
        "stroke-width":1.4,"stroke-dasharray":"5 4",opacity:.8},svg); }
  }
}
function paintMicro(upTo){
  const shock=+$("#mShock").value;
  microCells.forEach((c,i)=>{
    const d=MICRO_DEFS[i];
    if(d.k==='scatter'){ drawScatter(c.svg,microH,upTo); return; }
    drawPanel(c.svg,d,[{c:d.k==='alpha'?C.alpha:d.k==='bel'?C.belief:C.entropy,
      pts:microH.map(r=>r[d.k])}],upTo,[shock]);
  });
  const j=clamp((upTo||MICRO_T)-1,0,MICRO_T-1);
  $("#mT").textContent=j+1;
  $("#mAlpha").textContent=microH[j].alpha.toFixed(2);
  $("#mEnt").textContent=microH[j].H.toFixed(2);
  $("#mBel").textContent=microH[j].bel.toFixed(2);
  const n=j+1;
  /* the curve correlation — this is the statistic the paper reports (0.928),
     computed on the averaged series, not on the pooled sample */
  $("#mCorr").textContent = n>4
    ? pearson(microH.slice(0,n).map(r=>r.alpha), microH.slice(0,n).map(r=>r.H)).toFixed(3)
    : "—";
  $("#mCorrFlat").textContent = microFlat
    ? pearson(microFlat.flatA,microFlat.flatH).toFixed(3) : "n/a";
}
function runMicroSim(newSeed){
  cancelAnimationFrame(microRAF);
  if(newSeed) microSeed = (microSeed*7919+13)>>>0 || 1;
  const P={ T:MICRO_T, shockT:+$("#mShock").value, lr:+$("#mLr").value,
            beta:+$("#mBeta").value, eps:+$("#mEps").value,
            prior:0.999, seed:microSeed };
  $("#mShockVal").textContent=P.shockT;
  $("#mLrVal").textContent=P.lr.toFixed(2);
  $("#mBetaVal").textContent=P.beta;
  $("#mEpsVal").textContent=P.eps.toFixed(3);
  if(microMean){
    const e=ensembleMicro(P,MICRO_N);
    microH=e.series; microFlat=e;
  } else {
    microH=runMicro(P); microFlat=null;
  }
  $("#mRun").disabled=microMean;
  $("#mRun").style.opacity=microMean?.45:1;
  if(!microCells) microCells=panelShell($("#microPanels"),MICRO_DEFS);
  if(!microAnim){ paintMicro(MICRO_T); return; }
  let k=1;
  (function frame(){ k=Math.min(MICRO_T,k+1); paintMicro(k);
    if(k<MICRO_T) microRAF=requestAnimationFrame(frame); })();
}

/* =====================================================
   2. MACRO — the aggregate system (Section 4)
   ===================================================== */
/* Parameters and dynamics are the authors' own (macro.ipynb / policy.ipynb),
   not a fit to the published figure. Note f_F = 0.02: the paper's text treats
   misdirected search as yielding a negligible match rate, but the code keeps
   a small positive one.                                                    */
const EP={ s:0.03, m0:0.45, gamma:0.5, v:0.06,
           aBase:0.05, lamE:0.05, fF:0.02 };
const Hbits = l => { const e=1e-9; l=clamp(l,e,1-e);
  return -(l*Math.log2(l)+(1-l)*Math.log2(1-l)); };
const aBar  = (lam,c)=>clamp(EP.aBase+c*Hbits(lam),0,0.95);
const mTh   = th=>EP.m0*Math.pow(th,1-EP.gamma);

const MACRO_T=120, SHOCK_T=50;
/* Faithful to the notebook, including the order the shock is applied in:
   the derived series at t = shock are computed BEFORE lambda jumps, so
   lambda moves one step ahead of entropy, effort, C, f and u.             */
function runMacro(k,c,shock,u0){
  const T=MACRO_T;
  let lam=0.10;
  let u = u0!==undefined ? u0 : (()=>{                 // notebook's own init
      const th=EP.v/0.07, fT=(1-aBar(0.10,c))*mTh(th);
      return EP.s/(EP.s+((1-0.10)*fT+0.10*EP.fF));
    })();
  const rows=[];
  for(let t=0;t<T-1;t++){
    const h=Hbits(lam), abar=aBar(lam,c), Cc=(1-lam)*(1-abar);
    const th=EP.v/Math.max(u,1e-6), fT=(1-abar)*mTh(th);
    const f=(1-lam)*fT+lam*EP.fF;
    rows.push({t,l:lam,h,abar,C:Cc,f,u,th});
    const uNext=clamp(u+(EP.s*(1-u)-f*u),1e-6,0.5);
    const sE=EP.s*(1-u)/Math.max(u,1e-9);
    const dl=(EP.lamE-lam)*sE+(fT-EP.fF)*lam*(1-lam)-k*lam;
    if(t===SHOCK_T) lam=Math.min(lam+shock,0.95);      // after dlambda, as in the code
    lam=clamp(lam+dl,1e-6,0.95);
    u=uNext;
  }
  const h=Hbits(lam), abar=aBar(lam,c), th=EP.v/Math.max(u,1e-6);
  rows.push({t:T-1,l:lam,h,abar,C:(1-lam)*(1-abar),
             f:(1-lam)*(1-abar)*mTh(th)+lam*EP.fF,u,th});
  return rows;
}
/* policy.ipynb: long run with no shock, last u — the left heatmap */
function uStar(k,c){
  let u=0.07, lam=0.05;
  for(let i=0;i<240;i++){
    const a=aBar(lam,c), th=EP.v/Math.max(u,1e-6), fT=(1-a)*mTh(th);
    const f=(1-lam)*fT+lam*EP.fF;
    u=clamp(u+(EP.s*(1-u)-f*u),1e-6,0.5);
    const sE=EP.s*(1-u)/Math.max(u,1e-9);
    lam=clamp(lam+((EP.lamE-lam)*sE+(fT-EP.fF)*lam*(1-lam)-k*lam),1e-6,0.95);
  }
  return u;
}
/* policy.ipynb: steps for f to regain 95% of its pre-shock level — right heatmap.
   That run initialises at u = 0.07 rather than at the steady state.        */
function recovSteps(k,c){
  const r=runMacro(k,c,0.25,0.07), f=r.map(x=>x.f), target=0.95*f[SHOCK_T-2];
  for(let t=SHOCK_T+1;t<MACRO_T;t++) if(f[t]>=target) return t-SHOCK_T;
  return null;
}
/* every macro panel auto-scales to its own run: the sliders span a wide
   enough region of (k, c, Δλ) that any fixed axis would clip somewhere. */
const MACRO_DEFS=[
  {title:'Misinformed share',   unit:'λ',   auto:1,T:MACRO_T,k:'l'},
  {title:'Belief entropy',      unit:'bits',auto:1,T:MACRO_T,k:'h'},
  {title:'Search intensity',    unit:'ᾱᵀ',  auto:1,T:MACRO_T,k:'abar'},
  {title:'Cognitive channel',   unit:'Cₜ',  auto:1,T:MACRO_T,k:'C'},
  {title:'Job-finding rate',    unit:'fₜ',  auto:1,T:MACRO_T,k:'f'},
  {title:'Unemployment',        unit:'uₜ',  auto:1,T:MACRO_T,k:'u'}
];
let macroCells=null, macroH=null, macroRAF=0, macroAnim=true;

/* =====================================================
   2b. FIGURES 4 and 5 — the authors' macro runs, replotted
   ===================================================== */
const F4=[
  {t:'Shock to belief alignment', u:'λₜ',   k:'l',    c:()=>C.belief},
  {t:'Entropy dynamics',          u:'bits', k:'h',    c:()=>C.entropy},
  {t:'Search intensity',          u:'ᾱᵀₜ',  k:'abar', c:()=>C.alpha},
  {t:'Cognitive matching channel',u:'Cₜ',   k:'C',    c:()=>C.accent},
  {t:'Job-finding rate',          u:'fₜ',   k:'f',    c:()=>C.accent},
  {t:'Unemployment dynamics',     u:'uₜ',   k:'u',    c:()=>C.accent}
];
function drawFig4(){
  const host=$("#fig4Panels"); if(!host) return;
  const rows=runMacro(0.08,0.40,0.25);
  const cells=panelShell(host,F4.map(d=>({title:d.t,unit:d.u,auto:1,T:MACRO_T,k:d.k})));
  cells.forEach((cell,i)=>drawPanel(cell.svg,cell.def,
    [{c:F4[i].c(),pts:rows.map(r=>r[F4[i].k])}],undefined,[SHOCK_T]));
}
/* the two (k, c) heatmaps, computed live */
function heat(svg,fn,fmt,label){
  svg.innerHTML="";
  const W=430,H=330,padL=54,padR=74,padT=22,padB=52, N=12;
  const iw=W-padL-padR, ih=H-padT-padB;
  const kLo=0.05,kHi=0.16,cLo=0.15,cHi=0.55;
  const grid=[]; let lo=Infinity,hi=-Infinity;
  for(let i=0;i<N;i++){ grid.push([]);
    for(let j=0;j<N;j++){
      const k=kLo+(kHi-kLo)*i/(N-1), c=cLo+(cHi-cLo)*j/(N-1);
      const v=fn(k,c); grid[i].push(v);
      if(v!=null&&isFinite(v)){ lo=Math.min(lo,v); hi=Math.max(hi,v); }
    } }
  const cw=iw/N, chh=ih/N;
  /* a single-hue ramp from the page's paper tone to the accent colour */
  const ramp=x=>{
    const r=Math.round(247-(247-45)*x), g=Math.round(242-(242-76)*x),
          b=Math.round(232-(232-154)*x);
    return `rgb(${r},${g},${b})`;
  };
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){
    const v=grid[i][j];
    const x=padL+cw*j, y=padT+ih-chh*(i+1);
    const cell=el("rect",{x,y,width:cw+0.5,height:chh+0.5,
      fill: v==null||!isFinite(v) ? "rgba(58,46,28,.08)" : ramp((v-lo)/(hi-lo||1))},svg);
    const k=kLo+(kHi-kLo)*i/(N-1), c=cLo+(cHi-cLo)*j/(N-1);
    cell.addEventListener("mousemove",ev=>showTip(
      `<div class="tt-t">${label}</div><div class="tt-r">k = ${k.toFixed(3)} · c = ${c.toFixed(3)}<br>${
        v==null?"no recovery within the horizon":fmt(v)}</div>`,ev.clientX,ev.clientY));
    cell.addEventListener("mouseleave",hideTip);
  }
  el("rect",{x:padL,y:padT,width:iw,height:ih,fill:"none",stroke:C.line2},svg);
  [0.15,0.25,0.35,0.45,0.55].forEach(c=>
    txt(svg,padL+iw*(c-cLo)/(cHi-cLo),H-padB+17,c.toFixed(2),
      {class:"tick","text-anchor":"middle"}));
  [0.05,0.08,0.11,0.14,0.16].forEach(k=>
    txt(svg,padL-8,padT+ih-ih*(k-kLo)/(kHi-kLo)+4,k.toFixed(2),
      {class:"tick","text-anchor":"end"}));
  txt(svg,padL+iw/2,H-12,"c · uncertainty sensitivity",{class:"axlab","text-anchor":"middle"});
  txt(svg,padL,padT-7,"k · learning speed",{class:"axlab"});
  /* colour bar */
  const bx=W-padR+16, bw=14;
  for(let i=0;i<40;i++)
    el("rect",{x:bx,y:padT+ih*(1-(i+1)/40),width:bw,height:ih/40+0.6,fill:ramp(i/39)},svg);
  el("rect",{x:bx,y:padT,width:bw,height:ih,fill:"none",stroke:C.line2},svg);
  txt(svg,bx+bw+5,padT+7,fmt(hi),{class:"tick","font-size":"10.5"});
  txt(svg,bx+bw+5,padT+ih,fmt(lo),{class:"tick","font-size":"10.5"});
  /* the baseline calibration */
  const cx=padL+iw*(0.40-cLo)/(cHi-cLo);
  const cy=padT+ih-ih*(0.08-kLo)/(kHi-kLo);
  el("circle",{cx,cy,r:5,fill:"none",stroke:C.ink,"stroke-width":1.8},svg);
  txt(svg,cx+9,cy-7,"baseline",
    {class:"tick",fill:C.ink,"font-weight":"600","font-size":"10.5"});
}
function drawFig5(){
  const a=$("#heatU"), b=$("#heatR");
  if(a) heat(a,(k,c)=>uStar(k,c),v=>(v*100).toFixed(1)+"%","steady-state unemployment u*");
  if(b) heat(b,(k,c)=>recovSteps(k,c),v=>v+" steps","steps to 95% recovery of f");
}
function paintMacro(upTo){
  macroCells.forEach((c,i)=>{
    const d=MACRO_DEFS[i];
    drawPanel(c.svg,d,[{c:d.k==='l'?C.belief:d.k==='h'?C.entropy:d.k==='abar'?C.alpha:C.accent,
      pts:macroH.map(r=>r[d.k])}],upTo,[SHOCK_T]);
  });
  const j=clamp((upTo||MACRO_T)-1,0,MACRO_T-1);
  $("#macroT").textContent=j+1;
  $("#uNow").textContent=(macroH[j].u*100).toFixed(1)+"%";
  $("#fNow").textContent=macroH[j].f.toFixed(3);
  const pre=macroH[SHOCK_T-1].f;
  const peak=macroH.reduce((a,b)=>b.u>a.u?b:a);
  $("#uPeak").textContent=(peak.u*100).toFixed(1)+"%";
  let rec=null;
  for(let t=SHOCK_T+1;t<MACRO_T;t++) if(macroH[t].f>=0.95*pre){ rec=t-SHOCK_T; break; }
  $("#tRec").textContent = rec===null ? "> "+(MACRO_T-SHOCK_T) : rec;
  const sl=$("#bevStepIn"); if(sl) sl.value=j;
  drawBeveridge(j);
}
function runMacroSim(){
  cancelAnimationFrame(macroRAF);
  const k=+$("#kIn").value, c=+$("#cIn").value, sh=+$("#sIn").value;
  $("#kVal").textContent=k.toFixed(3);
  $("#cVal").textContent=c.toFixed(3);
  $("#sVal").textContent=sh.toFixed(2);
  macroH=runMacro(k,c,sh);
  if(!macroCells) macroCells=panelShell($("#macroPanels"),MACRO_DEFS);
  if(!macroAnim){ paintMacro(MACRO_T); return; }
  /* one model step every other frame — slow enough to watch the Beveridge
     curve swing out and come back (~4 s at 60 fps) */
  let t=1, half=0;
  (function frame(){
    if(++half%2===0) t=Math.min(MACRO_T,t+1);
    paintMacro(t);
    if(t<MACRO_T) macroRAF=requestAnimationFrame(frame);
  })();
}

/* =====================================================
   3. BINARY ENTROPY CURVE
   ===================================================== */
function drawEntropyCurve(mark){
  const svg=$("#entropyCurve"); if(!svg) return; svg.innerHTML="";
  const W=480,H=210,padL=44,padR=14,padT=14,padB=38;
  const iw=W-padL-padR, ih=H-padT-padB;
  const X=l=>padL+iw*l, Y=h=>padT+ih*(1-h);
  [0,0.5,1].forEach(h=>{
    el("line",{x1:padL,y1:Y(h),x2:W-padR,y2:Y(h),class:"grid-line"},svg);
    txt(svg,padL-7,Y(h)+4,h.toFixed(1),{class:"tick","text-anchor":"end"}); });
  [0,0.25,0.5,0.75,1].forEach(l=>
    txt(svg,X(l),H-padB+17,l.toFixed(2),{class:"tick","text-anchor":"middle"}));
  txt(svg,padL+iw/2,H-8,"λ · share of the unemployed with misaligned beliefs",
    {class:"tick","text-anchor":"middle","font-size":"11"});
  txt(svg,padL,padT-3,"H, bits",{class:"axlab",fill:C.entropy});
  let d="";
  for(let i=0;i<=200;i++){ const l=i/200; d+=(i===0?"M":"L")+X(l).toFixed(1)+" "+Y(Hbits(l)).toFixed(1)+" "; }
  el("path",{d,class:"ser",stroke:C.entropy,"stroke-width":2.1},svg);
  el("line",{x1:X(0.5),y1:Y(0),x2:X(0.5),y2:Y(0.97),stroke:C.line2,"stroke-dasharray":"3 4"},svg);
  txt(svg,X(0.5),Y(0.12),"maximum confusion",{class:"tick","text-anchor":"middle",fill:C.muted});
  const l=clamp(mark===undefined?0.107:mark,0.001,0.999), h=Hbits(l);
  el("line",{x1:X(l),y1:Y(0),x2:X(l),y2:Y(h),stroke:C.accent,"stroke-width":1.2,opacity:.5},svg);
  el("circle",{cx:X(l),cy:Y(h),r:6,fill:C.accent,stroke:"#fffdf7","stroke-width":2},svg);
  const lab=el("text",{x:clamp(X(l),padL+50,W-padR-50),y:Y(h)-14,"text-anchor":"middle",
    "font-size":"12","font-weight":"700",fill:C.accent},svg);
  lab.textContent="λ="+l.toFixed(2)+" · H="+h.toFixed(2);
  // hit area
  const hit=el("rect",{x:padL,y:padT,width:iw,height:ih,fill:"transparent",style:"cursor:col-resize"},svg);
  const move=ev=>{
    const r=svg.getBoundingClientRect();
    const px=(ev.clientX-r.left)/r.width*W;
    drawEntropyCurve(clamp((px-padL)/iw,0.001,0.999));
  };
  hit.addEventListener("mousemove",move);
  hit.addEventListener("touchmove",ev=>{ if(ev.touches[0]) move(ev.touches[0]); },{passive:true});
}

/* =====================================================
   4. BEVERIDGE CURVE  (derived from the paper's equations)
   ===================================================== */
/*  steady state: s(1-u) = f u,  f = C m0 (v/u)^(1-gamma) + lam fF
    =>  v = u [ ( s(1-u)/u - lam fF ) / (C m0) ]^(1/(1-gamma))           */
function bevV(u,Cc,lam){
  if(u<=1e-4||Cc<=1e-6) return NaN;
  const need=EP.s*(1-u)/u - (lam||0)*EP.fF;
  if(need<=0) return NaN;                       // misdirected search alone clears it
  return u*Math.pow(need/(Cc*EP.m0), 1/(1-EP.gamma));
}
function drawBeveridge(idx){
  const svg=$("#bevChart"); if(!svg||!macroH) return; svg.innerHTML="";
  const W=620,H=400,padL=58,padR=18,padT=20,padB=52;
  const iw=W-padL-padR, ih=H-padT-padB;
  const uMax=0.45, vMax=0.14;
  const X=u=>padL+iw*clamp(u,0,uMax)/uMax;
  const Y=v=>padT+ih*(1-clamp(v,0,vMax)/vMax);
  [0,0.15,0.30,0.45].forEach(u=>{
    el("line",{x1:X(u),y1:padT,x2:X(u),y2:H-padB,class:"grid-line"},svg);
    txt(svg,X(u),H-padB+16,(u*100).toFixed(0)+"%",{class:"tick","text-anchor":"middle"}); });
  [0,0.04,0.08,0.12].forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line"},svg);
    txt(svg,padL-8,Y(v)+4,(v*100).toFixed(0)+"%",{class:"tick","text-anchor":"end"}); });
  txt(svg,padL+iw/2,H-14,"unemployment rate u",{class:"axlab","text-anchor":"middle"});
  txt(svg,padL,padT-7,"vacancy rate v",{class:"axlab"});

  const curve=(Cc,lam,col,w,dash,op)=>{
    let d="",started=false;
    for(let i=0;i<=260;i++){
      const u=0.012+ (uMax-0.012)*i/260, v=bevV(u,Cc,lam);
      if(!isFinite(v)||v>vMax*1.6){ started=false; continue; }
      d+=(started?"L":"M")+X(u).toFixed(1)+" "+Y(v).toFixed(1)+" "; started=true;
    }
    const p=el("path",{d,fill:"none",stroke:col,"stroke-width":w,opacity:op===undefined?1:op},svg);
    if(dash) p.setAttribute("stroke-dasharray",dash);
  };
  const j=clamp(idx===undefined?MACRO_T-1:idx,0,MACRO_T-1);
  const pre=macroH[SHOCK_T-1], now=macroH[j];
  const Cpre=pre.C, Cnow=now.C;
  // faint fan of intermediate efficiencies
  for(let i=1;i<=4;i++) curve(Cpre+(Cnow-Cpre)*i/5, pre.l+(now.l-pre.l)*i/5,
                              C.belief,1,"2 5",.22);
  curve(Cpre,pre.l,C.good,2,null,.95);
  if(Math.abs(Cnow-Cpre)>1e-4) curve(Cnow,now.l,C.belief,2,"6 4",.95);

  // the economy's path so far, then the current point
  let d="";
  for(let t=0;t<=j;t++) d+=(t===0?"M":"L")+X(macroH[t].u)+" "+Y(EP.v)+" ";
  el("path",{d,fill:"none",stroke:C.accent,"stroke-width":1.4,opacity:.35},svg);
  el("circle",{cx:X(macroH[j].u),cy:Y(EP.v),r:7,fill:C.accent,stroke:"#fffdf7","stroke-width":2.2},svg);
  el("line",{x1:padL,y1:Y(EP.v),x2:W-padR,y2:Y(EP.v),stroke:C.accent,
    "stroke-width":1,"stroke-dasharray":"2 5",opacity:.35},svg);
  txt(svg,W-padR-4,Y(EP.v)-8,"v held constant",
    {class:"tick","text-anchor":"end",fill:C.accent,"font-size":"10.5"});

  $("#bevC").textContent=Cnow.toFixed(3);
  $("#bevU").textContent=(macroH[j].u*100).toFixed(1)+"%";
  $("#bevStep").textContent=j+1;
}

/* =====================================================
   5. PAGE PLUMBING
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

const secIds=["puzzle","fep","micro","macro","beveridge","policy","discussion","cite"];
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
["mShock","mLr","mBeta","mEps"].forEach(id=>
  $("#"+id).addEventListener("input",()=>runMicroSim(false)));
$("#mRun").addEventListener("click",()=>runMicroSim(true));
$$("#microSpeed button").forEach(b=>b.addEventListener("click",()=>{
  microAnim=b.dataset.sp==="1";
  $$("#microSpeed button").forEach(x=>x.classList.toggle("on",x===b));
  runMicroSim(false);
}));
$$("#microMode button").forEach(b=>b.addEventListener("click",()=>{
  microMean=b.dataset.mode==="mean";
  $$("#microMode button").forEach(x=>x.classList.toggle("on",x===b));
  runMicroSim(false);
}));

["kIn","cIn","sIn"].forEach(id=>$("#"+id).addEventListener("input",runMacroSim));
$("#macroRun").addEventListener("click",runMacroSim);
$$("#macroSpeed button").forEach(b=>b.addEventListener("click",()=>{
  macroAnim=b.dataset.sp==="1";
  $$("#macroSpeed button").forEach(x=>x.classList.toggle("on",x===b));
  runMacroSim();
}));
$$("#bevPlay button").forEach(b=>b.addEventListener("click",()=>{
  macroAnim=true;
  $$("#macroSpeed button").forEach(x=>x.classList.toggle("on",x.dataset.sp==="1"));
  runMacroSim();
}));
/* scrubbing the step slider stops the animation and drives both this panel
   and the impulse responses above it */
$("#bevStepIn").addEventListener("input",()=>{
  cancelAnimationFrame(macroRAF);
  if(!macroH) return;
  paintMacro(clamp(+$("#bevStepIn").value+1,1,MACRO_T));
});

/* ---------- init ---------- */
function init(){
  const safe=(n,f)=>{ try{ f(); }catch(err){ console.error("["+n+"]",err); } };
  safe("fig1",drawFig1);
  safe("fig2",drawFig2);
  safe("fig3",drawFig3);
  safe("fig4",drawFig4);
  safe("fig5",drawFig5);
  safe("entropy",()=>drawEntropyCurve());
  safe("micro",()=>runMicroSim(false));
  safe("macro",runMacroSim);
}
if(document.readyState!=="loading") init(); else addEventListener("DOMContentLoaded",init);
})();
