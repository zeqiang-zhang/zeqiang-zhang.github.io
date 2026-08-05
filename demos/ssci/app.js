/* ============================================================
   RL-EM project page — figures, charts and simulator.
   Vanilla JS, no dependencies, offline-safe.
   ============================================================ */
(function(){
"use strict";

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const NS = "http://www.w3.org/2000/svg";
const C  = { rl:'#3f5fa8', tf:'#c1503c', emp:'#2f8f72', wage:'#7a58b0',
             accent:'#9c4a2f', ink:'#2b261f', ink2:'#5b544a', muted:'#8b8173',
             line:'rgba(58,46,28,.16)', line2:'rgba(58,46,28,.28)', track:'rgba(58,46,28,.07)' };

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function el(tag,attrs={},parent){ const e=document.createElementNS(NS,tag);
  for(const k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e; }
function txt(parent,x,y,s,attrs={}){ const t=el("text",Object.assign({x,y},attrs),parent);
  t.textContent=s; return t; }

/* ---------- tooltip ---------- */
const tip=$("#tooltip");
function showTip(html,x,y){ tip.innerHTML=html; tip.style.opacity=1;
  const w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=clamp(x-w/2,8,innerWidth-w-8)+"px"; tip.style.top=(y-h-14)+"px"; }
function hideTip(){ tip.style.opacity=0; }

/* Fig. 1 is the authors' own vector artwork (1.svg), embedded directly by
   the page — nothing to build here. */

/* =====================================================
   1. SELECTION LOTTERY — exact best-of-n_f shares
   ===================================================== */
/* share of "best of nf draws" landing on each firm, ties split by vacancy share */
function winShares(firms, nf){
  const v = firms.reduce((s,f)=>s+f.v,0);
  if(v<=0) return firms.map(()=>0);
  const idx = firms.map((f,i)=>i).sort((a,b)=>firms[a].w-firms[b].w);
  const P = new Array(firms.length).fill(0);
  let cum=0, j=0;
  while(j<idx.length){
    let k=j; while(k<idx.length && Math.abs(firms[idx[k]].w-firms[idx[j]].w)<1e-9) k++;
    let blk=0; for(let q=j;q<k;q++) blk+=firms[idx[q]].v/v;
    const pB=Math.pow(cum+blk,nf)-Math.pow(cum,nf);
    for(let q=j;q<k;q++) P[idx[q]] = blk>0 ? pB*(firms[idx[q]].v/v)/blk : 0;
    cum+=blk; j=k;
  }
  return P;
}

const lotNf=$("#lotNf"), lotW=$("#lotW"), lotV=$("#lotV");
const NF_HINT={1:'A seeker takes whatever it drew — wages cannot influence the choice.',
               2:'A seeker compares two offers. Undercutting starts to cost applicants.',
               20:'Effectively full transparency: only the best-paid vacancy is ever accepted.'};
function drawLottery(){
  const nf=+lotNf.value, w=+lotW.value, v=+lotV.value;
  $("#lotNfVal").textContent=nf; $("#lotWVal").textContent=w; $("#lotVVal").textContent=v;
  $("#lotNfHint").textContent = NF_HINT[nf] || (nf<=4
      ? 'A seeker compares '+nf+' offers; the best-paid one is taken.'
      : 'With '+nf+' offers compared, low-wage vacancies fill only once the good ones run out.');

  const firms=[{n:'Firm 1',w:w,v:v,c:C.rl}];
  for(let i=0;i<4;i++) firms.push({n:'Firm '+(i+2),w:750,v:5,c:C.tf});
  const P=winShares(firms,nf);
  $("#lotShare").textContent=(P[0]*100).toFixed(0)+"%";

  const svg=$("#lotChart"); svg.innerHTML="";
  const W=540,H=300,padL=110,padR=54,padT=14,padB=44;
  const iw=W-padL-padR, ih=H-padT-padB;
  const n=firms.length, bh=ih/n*0.58, gap=ih/n;
  [0,.25,.5,.75,1].forEach(x=>{
    const px=padL+iw*x;
    el("line",{x1:px,y1:padT,x2:px,y2:H-padB,class:"grid-line"},svg);
    txt(svg,px,H-padB+18,(x*100).toFixed(0)+"%",{class:"tick","text-anchor":"middle"});
  });
  txt(svg,padL+iw/2,H-padB+36,"share of applicants won",{class:"tick","text-anchor":"middle"});
  firms.forEach((f,i)=>{
    const y=padT+gap*i+(gap-bh)/2, bw=iw*P[i];
    el("rect",{x:padL,y,width:iw,height:bh,rx:4,fill:C.track},svg);
    const r=el("rect",{x:padL,y,width:Math.max(0,bw),height:bh,rx:4,fill:f.c,opacity:i?0.55:1},svg);
    r.addEventListener("mousemove",ev=>showTip(
      `<div class="tt-t">${f.n}</div><div class="tt-r">wage ${f.w} · ${f.v} vacancies<br>share ${(P[i]*100).toFixed(1)}%</div>`,
      ev.clientX,ev.clientY));
    r.addEventListener("mouseleave",hideTip);
    txt(svg,padL-10,y+bh/2+4,f.n,{class:"bar-name","text-anchor":"end",fill:C.ink2,"font-size":"12"});
    txt(svg,padL-10,y+bh/2+18,"w="+f.w+" · v="+f.v,{class:"tick","text-anchor":"end","font-size":"10.5"});
    txt(svg,padL+Math.max(0,bw)+8,y+bh/2+5,(P[i]*100).toFixed(1)+"%",
      {fill:C.ink,"font-size":"13","font-weight":"700"});
  });
}
[lotNf,lotW,lotV].forEach(x=>x.addEventListener("input",drawLottery));

/* =====================================================
   2. SMALL LINE PANEL (shared by Fig. 2 and the simulator)
   ===================================================== */
function panelShell(host,defs){
  host.innerHTML="";
  return defs.map(d=>{
    const w=document.createElement("div"); w.className="panel";
    w.innerHTML=`<div class="ph"><span class="t">${d.title}</span><span class="u">${d.unit||''}</span></div>`;
    const svg=el("svg",{viewBox:"0 0 340 150",preserveAspectRatio:"none"});
    svg.setAttribute("viewBox","0 0 340 150"); svg.removeAttribute("preserveAspectRatio");
    w.appendChild(svg); host.appendChild(w);
    return {svg,def:d};
  });
}
function drawPanel(svg,def,series,upTo){
  svg.innerHTML="";
  const W=340,H=150,padL=38,padR=8,padT=10,padB=22;
  const iw=W-padL-padR, ih=H-padT-padB;
  const y0=def.min!==undefined?def.min:0, y1=def.max;
  const X=t=>padL+iw*t/(def.T-1);
  const Y=v=>padT+ih*(1-(v-y0)/(y1-y0));
  const ticks=def.ticks||[y0,(y0+y1)/2,y1];
  ticks.forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line"},svg);
    txt(svg,padL-6,Y(v)+3.5,def.fmt?def.fmt(v):String(Math.round(v)),
      {class:"tick","text-anchor":"end","font-size":"9.5"});
  });
  if(y0<0){ el("line",{x1:padL,y1:Y(0),x2:W-padR,y2:Y(0),stroke:C.line2,"stroke-width":1},svg); }
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
  [0,Math.floor((def.T-1)/2),def.T-1].forEach(t=>
    txt(svg,X(t),H-padB+13,String(t),{class:"tick","text-anchor":"middle","font-size":"9.5"}));
  const nMax = upTo===undefined ? def.T : clamp(upTo,1,def.T);
  series.forEach(s=>{
    let d="";
    const step=Math.max(1,Math.round(def.T/300));
    for(let t=0;t<nMax;t+=step){ const v=clamp(s.pts[t],y0,y1);
      d += (t===0?"M":"L")+X(t).toFixed(1)+" "+Y(v).toFixed(1)+" "; }
    const last=nMax-1; if(last>0){ const v=clamp(s.pts[last],y0,y1);
      d+="L"+X(last).toFixed(1)+" "+Y(v).toFixed(1); }
    el("path",{d,class:"ser",stroke:s.c,opacity:s.o||1,"stroke-width":s.sw||1.7},svg);
  });
}

/* =====================================================
   3. FIG. 2 — digitised published traces
   ===================================================== */
function seg(pts,T,noise,seed){
  // piecewise-linear interpolation of [t,value] control points + light noise
  let s=seed||7; const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
  const out=new Array(T);
  let k=0;
  for(let t=0;t<T;t++){
    while(k<pts.length-2 && t>pts[k+1][0]) k++;
    const [t0,v0]=pts[k], [t1,v1]=pts[Math.min(k+1,pts.length-1)];
    const a = t1===t0 ? 1 : clamp((t-t0)/(t1-t0),0,1);
    out[t]=v0+(v1-v0)*a + (noise?(rnd()-0.5)*2*noise:0);
  }
  return out;
}
function stair(base,amp,T,seed,every){
  let s=seed||3; const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
  const out=new Array(T); let cur=base;
  for(let t=0;t<T;t++){ if(t%(every||14)===0) cur=base+(rnd()<0.5?0:amp); out[t]=cur; }
  return out;
}
const T=500;
const FIG2={
 1:[
  {title:'Vacancies',unit:'posted',max:105,ticks:[0,50,100],T,
   s:[{c:C.rl,p:seg([[0,0],[2,97],[120,99],[300,98],[499,99]],T,1.2,11)},
      {c:C.tf,p:seg([[0,1],[60,2],[200,7],[380,15],[460,10],[499,7]],T,0.5,12)}]},
  {title:'Wages',unit:'per worker',min:500,max:820,ticks:[500,600,700,800],T,
   s:[{c:C.rl,p:seg([[0,545],[12,527],[499,528]],T,4,13)},
      {c:C.tf,p:seg([[0,762],[16,660],[60,608],[200,600],[400,592],[499,590]],T,3,14)}]},
  {title:'Employed workers',unit:'per firm',max:260,ticks:[0,100,200],T,
   s:[{c:C.rl,p:seg([[0,0],[20,215],[70,236],[200,226],[380,200],[460,216],[499,206]],T,4,15)},
      {c:C.tf,p:seg([[0,10],[100,13],[250,20],[380,30],[460,22],[499,18]],T,2,16)}]},
  {title:'Rewards',unit:'profit / 10⁴',max:12.5,ticks:[0,5,10],T,
   s:[{c:C.rl,p:seg([[0,0],[20,10.4],[70,11.5],[200,10.8],[380,7.6],[460,9.8],[499,9.3]],T,0.22,17)},
      {c:C.tf,p:seg([[0,0.15],[100,0.3],[250,0.6],[380,1.2],[460,0.8],[499,0.6]],T,0.08,18)}]}
 ],
 2:[
  {title:'Vacancies',unit:'posted',max:105,ticks:[0,50,100],T,
   s:[{c:C.rl,p:seg([[0,0],[3,100],[63,100],[67,2],[499,2]],T,0.8,21)},
      {c:C.tf,p:seg([[0,0],[60,0],[72,22],[86,28],[104,12],[150,44],[205,75],[499,75]],T,1.2,22)}]},
  {title:'Wages',unit:'per worker',min:490,max:1010,ticks:[500,700,900],T,
   s:[{c:C.rl,p:seg([[0,600],[9,956],[62,950],[66,512],[176,512],[181,548],[187,512],[499,512]],T,4,23)},
      {c:C.tf,p:seg([[0,600],[22,762],[64,832],[120,890],[205,920],[499,920]],T,4,24)}]},
  {title:'Employed workers',unit:'per firm',max:260,ticks:[0,100,200],T,
   s:[{c:C.rl,p:seg([[0,0],[14,232],[32,182],[60,112],[100,10],[150,3],[499,2]],T,3,25)},
      {c:C.tf,p:seg([[0,55],[24,88],[46,124],[64,130],[86,22],[120,66],[205,70],[499,70]],T,3,26)}]},
  {title:'Rewards',unit:'profit / 10⁴',min:-0.7,max:3.6,ticks:[0,1,2,3],T,
   s:[{c:C.rl,p:seg([[0,0.5],[12,-0.35],[42,-0.12],[61,0.1],[65,3.15],[73,0.9],[92,0.26],[499,0.2]],T,0.05,27)},
      {c:C.tf,p:seg([[0,0],[32,0.16],[60,0.5],[74,0.86],[92,0.5],[124,-0.2],[164,-0.34],[499,-0.34]],T,0.04,28)}]}
 ],
 20:[
  {title:'Vacancies',unit:'posted',max:6.5,ticks:[0,2,4,6],T,fmt:v=>v.toFixed(0),
   s:[{c:C.rl,p:stair(2.6,2.2,T,31,17)},
      {c:C.tf,p:seg([[0,3],[499,3]],T,0.04,32)}]},
  {title:'Wages',unit:'per worker',min:490,max:830,ticks:[500,600,700,800],T,
   s:[{c:C.rl,p:seg([[0,524],[18,509],[499,509]],T,3,33)},
      {c:C.tf,p:seg([[0,800],[499,800]],T,1.5,34)}]},
  {title:'Employed workers',unit:'per firm',max:52,ticks:[0,20,40],T,
   s:[{c:C.rl,p:seg([[0,8],[30,22],[62,33],[100,44],[280,44],[302,25],[400,26],[499,25]],T,0.7,35)},
      {c:C.tf,p:seg([[0,20],[40,24],[499,24]],T,0.5,36)}]},
  {title:'Rewards',unit:'profit / 10⁴',max:2.5,ticks:[0,1,2],T,fmt:v=>v.toFixed(1),
   s:[{c:C.rl,p:seg([[0,0.45],[30,1.1],[62,1.6],[100,2.15],[280,2.15],[302,1.25],[499,1.25]],T,0.035,37)},
      {c:C.tf,p:seg([[0,0.3],[40,0.4],[499,0.4]],T,0.02,38)}]}
 ]
};
let figCells=null;
function renderFig2(nf){
  const defs=FIG2[nf];
  figCells=panelShell($("#figPanels"),defs);
  figCells.forEach((c,i)=>drawPanel(c.svg,defs[i],defs[i].s.map(s=>({c:s.c,pts:s.p}))));
  $$("#regimeSwitch button").forEach(b=>{ const on=+b.dataset.nf===nf;
    b.classList.toggle("on",on); b.setAttribute("aria-selected",String(on)); });
}
$$("#regimeSwitch button").forEach(b=>b.addEventListener("click",()=>renderFig2(+b.dataset.nf)));

/* =====================================================
   4. SIMULATOR — RL-EM reimplementation
   ===================================================== */
const PAR={ z:500, p:1000, c:100, A:0.471, alpha:0.6, lambda:0.1, T:500,
            NFIRM:5, U0:300, E0:5, b0:0.5, v0:5, mub:0.5, muv:0.1 };
const wageOf=b=>PAR.z*b+PAR.p*(1-b);

let _seed=987654321;
function rnd(){ _seed=(_seed*1664525+1013904223)>>>0; return _seed/4294967296; }
function binom(n,p){ if(n<=0||p<=0) return 0; if(p>=1) return n;
  let k=0; for(let i=0;i<n;i++) if(rnd()<p) k++; return k; }

const POLICY={
  sweatshop:{ name:'Sweatshop', col:C.tf,
    note:'Post the maximum number of vacancies at the reservation wage. Nothing is spent on attracting anyone.',
    f:t=>({v: t<3?20:97, b:0.95}) },
  bait:{ name:'Bait-and-switch wage', col:C.wage,
    note:'Announce a near-maximal wage for 65 steps to absorb the workforce, then cut pay to the floor and stop hiring.',
    f:t=> t<65 ? {v:100,b:0.08} : {v:1,b:0.98} },
  scarcity:{ name:'Scarcity-driven', col:C.rl,
    note:'Post only a handful of vacancies at the reservation wage, keeping the whole market job-scarce.',
    f:t=>({v: t<3?2:4, b:0.98}) }
};

function simulate(nf, polKey){
  _seed=987654321;
  const pol=POLICY[polKey].f;
  const fs=[]; for(let i=0;i<PAR.NFIRM;i++)
    fs.push({rl:i===0,b:PAR.b0,v:i===0?1:PAR.v0,w:wageOf(PAR.b0),e:PAR.E0,m:0,profit:0});
  let u=PAR.U0;
  const H={v:{rl:[],tf:[]},w:{rl:[],tf:[]},e:{rl:[],tf:[]},r:{rl:[],tf:[]},E:[],W:[],cumRL:0,cumTF:0};
  for(let t=0;t<PAR.T;t++){
    for(const f of fs){
      if(f.rl){ const a=pol(t); f.v=a.v; f.b=a.b; }
      f.b=clamp(f.b,0,1); f.w=wageOf(f.b);
    }
    const v=fs.reduce((s,f)=>s+f.v,0);
    let m=0; if(u>0&&v>0) m=Math.min(PAR.A*Math.pow(u,PAR.alpha)*Math.pow(v,1-PAR.alpha),u,v);
    m=Math.floor(m);
    for(const f of fs) f.m=0;
    let left=m, cap=fs.map(f=>Math.floor(f.v));
    for(let round=0;round<6&&left>0;round++){
      const act=fs.map((f,i)=>i).filter(i=>cap[i]>0); if(!act.length) break;
      const sub=act.map(i=>({v:cap[i],w:fs[i].w}));
      const sh=winShares(sub,nf);
      let rem=1, take=0;
      for(let j=0;j<act.length;j++){
        const i=act[j], q= rem>1e-9 ? Math.min(1,sh[j]/rem) : 0;
        let mi=Math.min(binom(left-take,q),cap[i]);
        fs[i].m+=mi; cap[i]-=mi; take+=mi; rem-=sh[j];
      }
      if(take===0) break; left-=take;
    }
    const mTot=fs.reduce((s,f)=>s+f.m,0);
    let sep=0;
    for(const f of fs){ const d=f.e*PAR.lambda; sep+=d; f.e=f.e+f.m-d;
      f.profit=-PAR.c*f.v+(PAR.p-f.w)*f.e; }
    u=u+sep-mTot;
    const eTot=fs.reduce((s,f)=>s+f.e,0);
    const wbar=eTot>0 ? fs.reduce((s,f)=>s+f.w*f.e,0)/eTot
                      : fs.reduce((s,f)=>s+f.w,0)/fs.length;
    const wpost=fs.reduce((s,f)=>s+f.w,0)/fs.length;
    for(const f of fs){
      if(f.rl) continue;
      const dE = mTot>0 ? f.m*v/mTot-f.v : -f.v;
      const dW = (f.w-wpost)/(PAR.p-PAR.z);
      const DW = Math.abs(dW)>0.02?dW:0, DE = Math.abs(dE)>0.5?dE:0;
      if(DW<0&&DE<0) f.b-=PAR.mub*Math.abs(DW); else if(DW>0&&DE>0) f.b+=PAR.mub*Math.abs(DW);
      if(DW<0&&DE>0) f.v+=PAR.muv*Math.abs(DE); else if(DW>0&&DE<0) f.v-=PAR.muv*Math.abs(DE);
      f.v=clamp(f.v,1,100);
    }
    const R=fs[0], tfs=fs.slice(1), avg=k=>tfs.reduce((s,f)=>s+f[k],0)/tfs.length;
    H.v.rl.push(R.v);      H.v.tf.push(avg('v'));
    H.w.rl.push(R.w);      H.w.tf.push(avg('w'));
    H.e.rl.push(R.e);      H.e.tf.push(avg('e'));
    H.r.rl.push(R.profit/1e4); H.r.tf.push(avg('profit')/1e4);
    H.E.push(eTot);        H.W.push(wbar);
    H.cumRL+=R.profit/1e4; H.cumTF+=avg('profit')/1e4;
  }
  return H;
}

const SIM_DEFS=[
  {title:'Vacancies',unit:'posted',max:105,ticks:[0,50,100],T:PAR.T,k:'v'},
  {title:'Wages',unit:'per worker',min:490,max:1010,ticks:[500,700,900],T:PAR.T,k:'w'},
  {title:'Employed workers',unit:'per firm',max:300,ticks:[0,100,200,300],T:PAR.T,k:'e'},
  {title:'Rewards',unit:'profit / 10⁴',min:-1,max:13,ticks:[0,4,8,12],T:PAR.T,k:'r'}
];
let simCells=null, simH=null, simRAF=0, simAnimate=true, simStrat='sweatshop';
function paintSim(upTo){
  simCells.forEach((c,i)=>{
    const k=SIM_DEFS[i].k;
    drawPanel(c.svg,SIM_DEFS[i],
      [{c:C.tf,pts:simH[k].tf,sw:1.6},{c:C.rl,pts:simH[k].rl,sw:1.9}],upTo);
  });
  const j=clamp((upTo||PAR.T)-1,0,PAR.T-1);
  $("#simT").textContent=j+1;
  $("#simEmp").textContent=Math.round(simH.E[j]);
  $("#simWage").textContent=Math.round(simH.W[j]);
  const cr=simH.r.rl.slice(0,j+1).reduce((a,b)=>a+b,0),
        ct=simH.r.tf.slice(0,j+1).reduce((a,b)=>a+b,0);
  $("#simRLp").textContent=cr.toFixed(0);
  $("#simTFp").textContent=ct.toFixed(0);
}
function runSim(){
  cancelAnimationFrame(simRAF);
  const nf=+$("#simNf").value;
  simH=simulate(nf,simStrat);
  const P=POLICY[simStrat];
  $("#simNote").innerHTML=`<div class="nmm" style="color:${P.col}">${P.name}</div>
     <div class="dd">${P.note}</div>`;
  $("#simNote").style.borderLeftColor=P.col;
  if(!simCells) simCells=panelShell($("#simPanels"),SIM_DEFS);
  if(!simAnimate){ paintSim(PAR.T); return; }
  let k=1;
  (function frame(){ k=Math.min(PAR.T,k+9); paintSim(k);
    if(k<PAR.T) simRAF=requestAnimationFrame(frame); })();
}
$("#simNf").addEventListener("input",()=>{ $("#simNfVal").textContent=$("#simNf").value; runSim(); });
$$("#simStrat button").forEach(b=>b.addEventListener("click",()=>{
  simStrat=b.dataset.s;
  $$("#simStrat button").forEach(x=>x.classList.toggle("on",x===b));
  runSim();
}));
$$("#simSpeed button").forEach(b=>b.addEventListener("click",()=>{
  simAnimate=b.dataset.sp==="1";
  $$("#simSpeed button").forEach(x=>x.classList.toggle("on",x===b));
  runSim();
}));
$("#simRun").addEventListener("click",runSim);

/* =====================================================
   5. FIG. 3 — final market state across configurations
   (values digitised from the summary panels of Figs. 2–4)
   ===================================================== */
const MARKET=[
  {g:'One RL firm',          sub:['n_f = 1'],            e:287, w:536, note:'sweatshop'},
  {g:'One RL firm',          sub:['n_f = 2'],            e:301, w:981, note:'bait-and-switch'},
  {g:'One RL firm',          sub:['n_f = 20'],           e:120, w:762, note:'scarcity-driven'},
  {g:'Shared policy',        sub:['N_RL = 2','n_f = 1'], e:296, w:567, note:'the learners lead the market trend'},
  {g:'Shared policy',        sub:['N_RL = 2','n_f = 2'], e:297, w:958, note:'the learners lead the market trend'},
  {g:'Shared policy',        sub:['N_RL = 5','n_f = 1'], e:297, w:542, note:'cartel'},
  {g:'Shared policy',        sub:['N_RL = 5','n_f = 2'], e:294, w:550, note:'cartel — competition no longer binds'},
  {g:'Independent policies', sub:['N_RL = 5','n_f = 1'], e:297, w:512, note:'all five choose the sweatshop'},
  {g:'Independent policies', sub:['N_RL = 5','n_f = 2'], e:293, w:805, note:'segregation into strategy groups'}
];
function txtH(parent,x,y,html,attrs={}){
  const t=el("text",Object.assign({x,y},attrs),parent); t.innerHTML=html; return t; }
function drawMarket(){
  const svg=$("#marketChart"); if(!svg) return; svg.innerHTML="";
  const W=1000,H=400,padL=54,padR=62,padT=26,padB=88;
  const iw=W-padL-padR, ih=H-padT-padB;
  const eMax=320, w0=500, w1=1000;
  const YE=v=>padT+ih*(1-v/eMax);
  const YW=v=>padT+ih*(1-(v-w0)/(w1-w0));
  // left axis (employment)
  [0,80,160,240,320].forEach(v=>{
    el("line",{x1:padL,y1:YE(v),x2:W-padR,y2:YE(v),class:"grid-line"},svg);
    txt(svg,padL-8,YE(v)+4,String(v),{class:"tick","text-anchor":"end"});
  });
  // right axis (wage)
  [500,625,750,875,1000].forEach(v=>
    txt(svg,W-padR+8,YW(v)+4,String(v),{class:"tick",fill:C.wage}));
  txt(svg,padL,padT-11,"employed workers",{class:"axlab",fill:C.emp});
  txt(svg,W-padR,padT-11,"averaged wage",{class:"axlab","text-anchor":"end",fill:C.wage});

  const n=MARKET.length, slot=iw/n, bw=slot*0.42;
  // group separators + labels
  let start=0;
  for(let i=1;i<=n;i++){
    if(i===n || MARKET[i].g!==MARKET[start].g){
      const x0=padL+slot*start, x1=padL+slot*i;
      if(start>0) el("line",{x1:x0,y1:padT-4,x2:x0,y2:H-padB+40,stroke:C.line2,"stroke-dasharray":"3 4"},svg);
      txt(svg,(x0+x1)/2,H-padB+62,MARKET[start].g,
        {class:"axlab","text-anchor":"middle","font-size":"13",fill:C.ink});
      start=i;
    }
  }
  // wage polyline
  let d="";
  MARKET.forEach((m,i)=>{ const cx=padL+slot*i+slot/2;
    d+=(i===0?"M":"L")+cx+" "+YW(m.w)+" "; });
  el("path",{d,fill:"none",stroke:C.wage,"stroke-width":1.6,"stroke-dasharray":"5 4",opacity:.55},svg);

  MARKET.forEach((m,i)=>{
    const cx=padL+slot*i+slot/2;
    const r=el("rect",{x:cx-bw/2,y:YE(m.e),width:bw,height:ih-(YE(m.e)-padT),rx:4,
      fill:C.emp,opacity:.78},svg);
    const hit=(ev)=>showTip(`<div class="tt-t">${m.g} · ${m.sub.join(' · ')}</div>
      <div class="tt-r">${m.e} employed · wage ${m.w}<br>${m.note}</div>`,ev.clientX,ev.clientY);
    r.addEventListener("mousemove",hit); r.addEventListener("mouseleave",hideTip);
    // employment value sits inside the bar so it can never collide with the wage marker
    txt(svg,cx,YE(m.e)+16,String(m.e),{"text-anchor":"middle","font-size":"12",
      "font-weight":"700",fill:"#fffdf7"});
    const c=el("circle",{cx,cy:YW(m.w),r:6,fill:C.wage,stroke:"#fffdf7","stroke-width":2.2},svg);
    c.addEventListener("mousemove",hit); c.addEventListener("mouseleave",hideTip);
    // wage value: drawn twice — a paper-coloured halo first, then the glyphs on
    // top — so it stays legible over the bars without relying on paint-order
    txt(svg,cx,YW(m.w)-12,String(m.w),{"text-anchor":"middle","font-size":"11.5",
      "font-weight":"700",fill:"none",stroke:"#fffdf7","stroke-width":"3.5",
      "stroke-linejoin":"round"});
    txt(svg,cx,YW(m.w)-12,String(m.w),{"text-anchor":"middle","font-size":"11.5",
      "font-weight":"700",fill:C.wage});
    m.sub.forEach((p,j)=>txt(svg,cx,H-padB+18+j*14,p,
      {class:"tick","text-anchor":"middle","font-size":"11",
       "font-family":'ui-monospace,"SF Mono",Menlo,Consolas,monospace'}));
  });
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
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

const secIds=["motivation","model","selection","strategies","simulator","multi","welfare","cite"];
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

/* ---------- init ---------- */
function init(){
  const safe=(name,fn)=>{ try{ fn(); }catch(err){ console.error("["+name+"]",err); } };
  safe("lottery",drawLottery);
  safe("fig2",()=>renderFig2(1));
  safe("market",drawMarket);
  safe("simulator",()=>{ $("#simNfVal").textContent=$("#simNf").value; runSim(); });
}
addEventListener("resize",()=>{ /* charts use viewBox units, nothing to recompute */ });
if(document.readyState!=="loading") init(); else addEventListener("DOMContentLoaded",init);
})();
