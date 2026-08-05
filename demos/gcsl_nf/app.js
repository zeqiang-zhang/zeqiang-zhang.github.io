/* ============================================================
   Autonomous Learning From Success and Failure — interactives.
   Vanilla JS, no dependencies, offline-safe.

   Every result figure is drawn from window.GCSL_FIG, written by
   ../../GCSL-NF/export_figure_data.py straight out of the authors'
   per-seed logs. Nothing here re-runs or re-fits anything: the page
   redraws the same means and standard deviations the paper plots.
   The two live panels are explicitly marked as illustrations of the
   method's definitions, not as results.
   ============================================================ */
(function(){
"use strict";

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const NS = "http://www.w3.org/2000/svg";
const FIG = window.GCSL_FIG || null;

const C = {
  ink:"#2b261f", ink2:"#5b544a", muted:"#8b8173", accent:"#2c6e7f",
  line:"rgba(58,46,28,.16)", line2:"rgba(58,46,28,.28)", paper:"#fffdf7",
  pos:"#3f7a4e", neg:"#c0392b"
};
/* the paper's own method palette, so page and PDF agree */
const MC = {
  "GCSL-NF":"#5B9BD5", "GCSL":"#EF5350", "HER DQN":"#66BB6A",
  "HER A2C":"#F48FB1", "W-GCSL":"#FFA726", "Contrastive GCRL":"#9575CD",
  "HER DDPG":"#66BB6A"
};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function el(tag,attrs={},parent){ const e=document.createElementNS(NS,tag);
  for(const k in attrs) if(attrs[k]!==undefined&&attrs[k]!==null) e.setAttribute(k,attrs[k]);
  if(parent) parent.appendChild(e); return e; }
function txt(parent,x,y,s,attrs={}){ const t=el("text",Object.assign({x,y},attrs),parent);
  t.textContent=s; return t; }
function svgEl(host,W,H){
  const s=el("svg",{viewBox:`0 0 ${W} ${H}`,class:"chart",
    preserveAspectRatio:"xMidYMid meet"});
  host.appendChild(s); return s;
}
const tip=$("#tooltip");
function showTip(html,x,y){ if(!tip) return; tip.innerHTML=html; tip.style.opacity=1;
  const w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=clamp(x-w/2,8,innerWidth-w-8)+"px";
  tip.style.top=Math.max(8,y-h-14)+"px"; }
function hideTip(){ if(tip) tip.style.opacity=0; }

/* thousands, with as few decimals as the tick set needs */
function kfmt(v){
  const k=v/1000;
  if(Math.abs(k-Math.round(k))<1e-9) return String(Math.round(k));
  return k.toFixed(Math.abs(k)<1?2:1);
}
function nfmt(v){
  if(Math.abs(v)>=100) return v.toFixed(0);
  if(Math.abs(v-Math.round(v))<1e-9) return String(Math.round(v));
  return Math.abs(v)<1 ? v.toFixed(2).replace(/0$/,"") : v.toFixed(1);
}

/* =====================================================
   THE WORKHORSE: one small-multiple line panel.
   A shared x-crosshair reads every series at once, which is what you
   actually want when six methods are overplotted.
   ===================================================== */
/* The plotting scripts give x ticks in two different units: figures 5 and 6
   inherit matplotlib's already-divided "Episodes (k)" ticks, the rest are in
   raw episodes. Rescale the first kind rather than trusting either. */
function xticksInEpisodes(ticks,xmax){
  if(!ticks||!ticks.length) return [0,xmax];
  const hi=Math.max.apply(null,ticks);
  return hi>0 && hi<=xmax/100 ? ticks.map(v=>v*1000) : ticks;
}

function linePanel(host,o){
  const W=o.W||260, H=o.H||200;
  /* padL and padR never shrink when the labels are hidden: in a row of
     small multiples every data area has to be the same width, or the
     curves in column 0 would be horizontally compressed relative to the rest */
  const padL=38, padR=14,
        padT=o.title?22:10, padB=o.showX===false?12:34;
  const iw=W-padL-padR, ih=H-padT-padB;
  const svg=svgEl(host,W,H);
  const [x0,x1]=[0,o.xmax], [y0,y1]=o.ylim;
  const X=v=>padL+iw*(v-x0)/(x1-x0);
  const Y=v=>padT+ih*(1-(clamp(v,y0,y1)-y0)/(y1-y0));

  if(o.title) txt(svg,padL+iw/2,padT-9,o.title,
    {class:"paneltitle","text-anchor":"middle"});

  /* one decimal count for the whole tick set, so a panel never mixes 0, 0.5, 1 */
  const yt=o.yticks||[y0,y1];
  const dec=yt.reduce((d,v)=>{
    const s=String(v); const i=s.indexOf(".");
    return Math.max(d,i<0?0:s.length-i-1);
  },0);
  yt.forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line",
      "stroke-dasharray":"3 3"},svg);
    if(o.showY!==false)
      txt(svg,padL-6,Y(v)+3.6,o.yfmt?o.yfmt(v):v.toFixed(dec),
        {class:"tick","text-anchor":"end"});
  });
  const xt=xticksInEpisodes(o.xticks,o.xmax);
  xt.forEach((v,i)=>{
    el("line",{x1:X(v),y1:padT,x2:X(v),y2:H-padB,class:"grid-line",
      "stroke-dasharray":"3 3"},svg);
    if(o.showX!==false){
      /* the outermost labels are anchored inward so they cannot be clipped */
      const first=i===0, last=i===xt.length-1;
      txt(svg,X(v)+(first?-2:last?2:0),H-padB+13,kfmt(v),
        {class:"tick","text-anchor":first?"start":last?"end":"middle"});
    }
  });
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
  el("line",{x1:padL,y1:padT,x2:padL,y2:H-padB,class:"axis-line"},svg);

  if(o.ylabel && o.showY!==false)
    txt(svg,-(padT+ih/2),11,o.ylabel,
      {class:"axlab","text-anchor":"middle",transform:"rotate(-90)"});
  if(o.xlabel && o.showX!==false)
    txt(svg,padL+iw/2,H-3,o.xlabel,{class:"axlab","text-anchor":"middle"});

  /* an optional vertical rule (the goal-distribution switch) */
  if(o.vline!==undefined)
    el("line",{x1:X(o.vline),y1:padT,x2:X(o.vline),y2:H-padB,stroke:C.ink2,
      "stroke-width":1,"stroke-dasharray":"3 3",opacity:.75},svg);

  const order=o.order||o.series.map((_,i)=>i);
  const cols=o.colors;

  /* bands first, then means, so an overlapping band never hides a line */
  order.forEach(i=>{
    const s=o.series[i]; if(!s) return;
    let up="",dn="";
    for(let k=0;k<s.x.length;k++)
      up+=(k?"L":"M")+X(s.x[k]).toFixed(1)+" "+Y(s.m[k]+s.s[k]).toFixed(1)+" ";
    for(let k=s.x.length-1;k>=0;k--)
      dn+="L"+X(s.x[k]).toFixed(1)+" "+Y(s.m[k]-s.s[k]).toFixed(1)+" ";
    el("path",{d:up+dn+"Z",fill:cols[i],"fill-opacity":.20,stroke:"none"},svg);
  });
  order.forEach(i=>{
    const s=o.series[i]; if(!s) return;
    let d="";
    for(let k=0;k<s.x.length;k++)
      d+=(k?"L":"M")+X(s.x[k]).toFixed(1)+" "+Y(s.m[k]).toFixed(1)+" ";
    el("path",{d,fill:"none",stroke:cols[i],"stroke-width":1.5,
      "stroke-linejoin":"round","stroke-linecap":"round"},svg);
    /* a few markers, as in the paper, so curves stay separable in print */
    const every=Math.max(1,Math.round(s.x.length/5));
    for(let k=0;k<s.x.length;k+=every)
      el("circle",{cx:X(s.x[k]),cy:Y(s.m[k]),r:1.9,fill:cols[i]},svg);
  });

  /* crosshair readout */
  const gx=el("g",{opacity:0},svg);
  const rule=el("line",{y1:padT,y2:H-padB,stroke:C.ink,"stroke-width":.8,
    "stroke-dasharray":"2 2",opacity:.6},gx);
  const dots=order.map(i=>o.series[i]?el("circle",
    {r:3,fill:cols[i],stroke:C.paper,"stroke-width":1.2},gx):null);
  const hit=el("rect",{x:padL,y:padT,width:iw,height:ih,fill:"transparent"},svg);
  const ref=o.series.find(s=>s);
  if(ref){
    hit.addEventListener("mousemove",ev=>{
      const box=svg.getBoundingClientRect();
      const vx=x0+(x1-x0)*((ev.clientX-box.left)/box.width*W-padL)/iw;
      let bi=0,bd=Infinity;
      ref.x.forEach((xv,k)=>{ const d=Math.abs(xv-vx); if(d<bd){bd=d;bi=k;} });
      const px=X(ref.x[bi]);
      rule.setAttribute("x1",px); rule.setAttribute("x2",px);
      let rows="";
      order.forEach((i,n)=>{
        const s=o.series[i]; if(!s||!dots[n]) return;
        const j=Math.min(bi,s.x.length-1);
        dots[n].setAttribute("cx",X(s.x[j]));
        dots[n].setAttribute("cy",Y(s.m[j]));
        rows+=`<div class="tt-r"><span style="color:${cols[i]}">&#9632;</span> `+
              `${o.names[i]} &nbsp;${s.m[j].toFixed(3)} &plusmn; ${s.s[j].toFixed(3)}</div>`;
      });
      gx.setAttribute("opacity",1);
      showTip(`<div class="tt-t">${o.title||""} &middot; episode `+
        `${Math.round(ref.x[bi]).toLocaleString()}</div>`+rows,ev.clientX,ev.clientY);
    });
    hit.addEventListener("mouseleave",()=>{ gx.setAttribute("opacity",0); hideTip(); });
  }
  return svg;
}

function legendInto(host,names,colors,ours){
  host.innerHTML="";
  names.forEach((n,i)=>{
    const d=document.createElement("div");
    d.className="li"+(n===ours?" ours":"");
    d.innerHTML=`<span class="sw" style="background:${colors[i]}"></span>`+
      (n===ours?`<b>${n}</b>`:n);
    host.appendChild(d);
  });
}

/* =====================================================
   FIGURE 5 — discrete-action results, 7 panels
   ===================================================== */
function drawFig5(){
  const F=FIG.fig5, host=$("#fig5"); if(!host) return;
  host.innerHTML="";
  /* baselines first, ours last so it is drawn on top — the paper's own order */
  const order=[1,2,3,4,5,0];
  F.panels.forEach(p=>{
    const cell=document.createElement("div");
    host.appendChild(cell);
    linePanel(cell,{W:262,H:196,title:p.title,xlabel:"Episodes (k)",
      ylabel:p.ylabel,ylim:p.ylim,yticks:p.yticks,xticks:p.xticks,xmax:p.xmax,
      series:p.series,colors:F.colors,names:F.methods,order});
  });
  legendInto($("#fig5legend"),F.methods,F.colors,"GCSL-NF");
}

/* =====================================================
   FIGURE 6 — continuous action spaces, 6 panels
   ===================================================== */
function drawFig6(){
  const F=FIG.fig6, host=$("#fig6"); if(!host) return;
  host.innerHTML="";
  const order=[1,2,3,0];
  let lastGroup=null;
  F.panels.forEach(p=>{
    const cell=document.createElement("div");
    if(p.group!==lastGroup){
      const g=document.createElement("div");
      g.className="grouphdr"; g.textContent=p.group;
      cell.appendChild(g); lastGroup=p.group;
    } else {
      const g=document.createElement("div");
      g.className="grouphdr"; g.innerHTML="&nbsp;";
      cell.appendChild(g);
    }
    host.appendChild(cell);
    linePanel(cell,{W:262,H:190,title:p.title,xlabel:"Episodes (k)",
      ylabel:p.ylabel,ylim:p.ylim,yticks:p.yticks,xticks:p.xticks,xmax:p.xmax,
      series:p.series,colors:F.colors,names:F.methods,order});
  });
  legendInto($("#fig6legend"),F.methods,F.colors,"GCSL-NF");
}

/* =====================================================
   FIGURE 7 — the two feedback pathways
   ===================================================== */
function drawFig7(){
  const F=FIG.fig7, a=$("#fig7a"), b=$("#fig7b"); if(!a||!b) return;
  a.innerHTML=""; b.innerHTML="";
  linePanel(a,{W:440,H:250,title:F.left.title,xlabel:"Episodes (k)",
    ylabel:F.left.ylabel,ylim:F.left.ylim,yticks:F.left.yticks,
    xticks:F.left.xticks,xmax:F.left.xmax,series:F.left.series,
    colors:F.left.colors,names:F.left.labels,order:[2,1,0]});
  linePanel(b,{W:440,H:250,title:F.right.title,xlabel:"Episodes (k)",
    ylabel:F.right.ylabel,ylim:F.right.ylim,yticks:F.right.yticks,
    xticks:F.right.xticks,xmax:F.right.xmax,series:[F.right.series],
    colors:[F.right.color],names:["Lₒ / (Lₒ + L₊)"]});
  legendInto($("#fig7legend"),F.left.labels,F.left.colors,"Both (GCSL-NF)");
}

/* =====================================================
   FIGURE 9 — learned distances and the threshold n
   ===================================================== */
function drawFig9(){
  const F=FIG.fig9, host=$("#fig9"); if(!host) return;
  host.innerHTML="";
  F.panels.forEach(p=>{
    const cell=document.createElement("div");
    host.appendChild(cell);
    linePanel(cell,{W:400,H:230,title:p.title,xlabel:"Episodes (k)",
      ylabel:p.ylabel,ylim:p.ylim,yticks:p.yticks,xticks:p.xticks,xmax:p.xmax,
      series:p.series,colors:F.colors,names:F.labels,order:[2,3,1,0]});
  });
  legendInto($("#fig9legend"),F.labels,F.colors,"p_phi (n = 5)");
}

/* =====================================================
   FIGURE 10 — corrupted prior and runtime goal shift
   ===================================================== */
function drawFig10(){
  const F=FIG.fig10, host=$("#fig10"); if(!host) return;
  host.innerHTML="";
  const order=[1,2,3,4,5,0];
  F.panels.forEach(p=>{
    const cell=document.createElement("div");
    host.appendChild(cell);
    linePanel(cell,{W:340,H:220,title:p.title,xlabel:"Episodes (k)",
      ylabel:p.ylabel,ylim:p.ylim,yticks:p.yticks,xticks:p.xticks,xmax:p.xmax,
      vline:p.switch,series:p.series,colors:F.colors,names:F.methods,order});
  });
  legendInto($("#fig10legend"),F.methods,F.colors,"GCSL-NF");
}

/* =====================================================
   FIGURE 11 — noisy LiDAR, 2 rows x 6 columns
   ===================================================== */
function drawFig11(){
  const F=FIG.fig11, host=$("#fig11"); if(!host) return;
  host.innerHTML="";
  /* one header row spanning each noise family, then the 12 cells */
  const hdr=document.createElement("div");
  hdr.className="panels p6"; hdr.style.gap="0 16px";
  ["Sensor Noise","Sensor Noise","Sensor Noise",
   "Actuation Noise","Actuation Noise","Actuation Noise"].forEach((g,i)=>{
    const d=document.createElement("div");
    d.className="grouphdr";
    d.textContent = (i===1||i===4) ? g : " ";
    hdr.appendChild(d);
  });
  host.appendChild(hdr);

  const grid=document.createElement("div");
  grid.className="panels p6"; host.appendChild(grid);
  F.rows.forEach((row,ri)=>{
    row.cells.forEach((cell,ci)=>{
      const d=document.createElement("div");
      grid.appendChild(d);
      /* heights chosen so both rows have the same data-area height:
         row 0 is 22 + 120 + 12, row 1 is 10 + 120 + 34 */
      linePanel(d,{W:200,H:ri===0?154:164,
        title: ri===0 ? F.settings[ci].label : null,
        xlabel: ri===1 ? "Episodes (k)" : null,
        ylabel: row.ylabel, showY: ci===0, showX: ri===1,
        ylim:row.ylim,yticks:row.yticks,xticks:F.xticks,xmax:F.xmax,
        series:cell,colors:F.colors,names:F.methods,order:[1,2,0]});
    });
  });
  legendInto($("#fig11legend"),F.methods,F.colors,"GCSL-NF");
}

/* =====================================================
   FIGURE 12a — danger zone: reaching vs core avoidance
   ===================================================== */
const SYM=["circle","square","triangle","diamond","cross"];
function marker(g,cx,cy,shape,fill,r=5.4){
  const a={fill,stroke:"#2b261f","stroke-width":.9};
  if(shape==="circle") return el("circle",Object.assign({cx,cy,r},a),g);
  if(shape==="square") return el("rect",Object.assign(
    {x:cx-r*.88,y:cy-r*.88,width:r*1.76,height:r*1.76},a),g);
  if(shape==="triangle") return el("polygon",Object.assign(
    {points:`${cx},${cy-r*1.1} ${cx+r},${cy+r*.75} ${cx-r},${cy+r*.75}`},a),g);
  if(shape==="diamond") return el("polygon",Object.assign(
    {points:`${cx},${cy-r*1.15} ${cx+r*1.05},${cy} ${cx},${cy+r*1.15} ${cx-r*1.05},${cy}`},a),g);
  return el("path",Object.assign({d:
    `M${cx-r} ${cy-r*.34}h${r*.66}v-${r*.66}h${r*.68}v${r*.66}h${r*.66}v${r*.68}`+
    `h-${r*.66}v${r*.66}h-${r*.68}v-${r*.66}h-${r*.66}z`},a),g);
}
function scatterPanel(host,F,o){
  const W=o.W,H=o.H,padL=54,padR=14,padT=o.title?26:14,padB=46;
  const iw=W-padL-padR, ih=H-padT-padB;
  const svg=svgEl(host,W,H);
  const [x0,x1]=o.xlim,[y0,y1]=o.ylim;
  const X=v=>padL+iw*(clamp(v,x0,x1)-x0)/(x1-x0);
  const Y=v=>padT+ih*(1-(clamp(v,y0,y1)-y0)/(y1-y0));
  if(o.title) txt(svg,padL+iw/2,padT-11,o.title,
    {class:"paneltitle","text-anchor":"middle"});

  /* the "reaches and stays out of the core" region — only on the full-range
     panel; in the zoom the whole window is inside it, so a filled block would
     say nothing and only a single reach threshold is worth marking */
  if(o.region!==false){
    el("rect",{x:X(x0),y:Y(Math.min(F.safeCore,y1)),
      width:X(Math.min(F.reach,x1))-X(x0),height:Y(y0)-Y(Math.min(F.safeCore,y1)),
      fill:C.pos,"fill-opacity":.12,stroke:C.pos,"stroke-opacity":.45,
      "stroke-dasharray":"4 3"},svg);
    if(o.note) txt(svg,X(Math.min(F.reach,x1))+10,Y(Math.min(F.safeCore,y1))-7,o.note,
      {class:"tick",fill:C.pos,"font-weight":"700"});
  } else if(F.reach>x0 && F.reach<x1){
    el("line",{x1:X(F.reach),y1:padT,x2:X(F.reach),y2:H-padB,stroke:C.pos,
      "stroke-width":1.2,"stroke-dasharray":"4 3",opacity:.7},svg);
    txt(svg,X(F.reach)-6,H-padB-8,"reaches the goal",
      {class:"tick","text-anchor":"end",fill:C.pos,"font-weight":"700"});
  }
  o.xticks.forEach((v,i)=>{
    el("line",{x1:X(v),y1:padT,x2:X(v),y2:H-padB,class:"grid-line","stroke-dasharray":"3 3"},svg);
    txt(svg,X(v)+(i===0?-2:i===o.xticks.length-1?2:0),H-padB+15,o.xfmt(v),
      {class:"tick","text-anchor":i===0?"start":i===o.xticks.length-1?"end":"middle"});
  });
  o.yticks.forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line","stroke-dasharray":"3 3"},svg);
    txt(svg,padL-7,Y(v)+3.6,o.yfmt(v),{class:"tick","text-anchor":"end"});
  });
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
  el("line",{x1:padL,y1:padT,x2:padL,y2:H-padB,class:"axis-line"},svg);
  txt(svg,padL+iw/2,H-5,"Final distance to goal  (lower is better)",
    {class:"axlab","text-anchor":"middle"});
  txt(svg,-(padT+ih/2),13,"Trajectories entering the core, %",
    {class:"axlab","text-anchor":"middle",transform:"rotate(-90)"});

  let hidden=0;
  F.points.forEach(p=>{
    const [dm,ds,cm,cs]=p.v, col=MC[p.method]||C.muted;
    if(dm<x0||dm>x1||cm<y0||cm>y1){ hidden++; return; }
    const g=el("g",{},svg);
    el("line",{x1:X(dm-ds),y1:Y(cm),x2:X(dm+ds),y2:Y(cm),stroke:col,
      "stroke-width":1.1,opacity:.55},g);
    el("line",{x1:X(dm),y1:Y(cm-cs),x2:X(dm),y2:Y(cm+cs),stroke:col,
      "stroke-width":1.1,opacity:.55},g);
    const m=marker(g,X(dm),Y(cm),SYM[p.si],col);
    m.addEventListener("mousemove",ev=>showTip(
      `<div class="tt-t">${p.method} &middot; ${p.setting}</div>`+
      `<div class="tt-r">distance ${dm.toFixed(3)} &plusmn; ${ds.toFixed(3)}</div>`+
      `<div class="tt-r">core ${cm.toFixed(2)}% &plusmn; ${cs.toFixed(2)}</div>`,
      ev.clientX,ev.clientY));
    m.addEventListener("mouseleave",hideTip);
  });
  if(hidden) txt(svg,W-padR-4,padT+12,hidden+" points outside this window",
    {class:"tick","text-anchor":"end",fill:C.muted});
}

function drawFig12a(){
  const F=FIG.fig12a, host=$("#fig12a"); if(!host) return;
  host.innerHTML="";
  const a=document.createElement("div"), b=document.createElement("div");
  host.appendChild(a); host.appendChild(b);
  scatterPanel(a,F,{W:560,H:400,xlim:[0,1.5],ylim:[0,25],
    xticks:[0,0.5,1.0,1.5],yticks:[0,5,10,15,20,25],
    xfmt:v=>v.toFixed(1),yfmt:v=>String(v),
    title:"All six methods, full range",
    note:"ideal: reaches (< 0.15) and avoids the core (< 5%)"});
  /* the interesting cluster is a few pixels wide at full range, so it gets
     its own window; the two "stay" runs of GCSL and W-GCSL sit above it */
  scatterPanel(b,F,{W:380,H:400,xlim:[0.05,0.16],ylim:[0,0.25],
    xticks:[0.05,0.08,0.11,0.14],yticks:[0,0.05,0.1,0.15,0.2,0.25],
    xfmt:v=>v.toFixed(2),yfmt:v=>v.toFixed(2),region:false,
    title:"Zoom on the safe corner"});

  /* two legends: colour = method, shape = safety setting */
  const lg=$("#fig12aLegend");
  if(lg){
    lg.innerHTML="";
    F.methods.forEach(n=>{
      const d=document.createElement("div");
      d.className="li"+(n==="GCSL-NF"?" ours":"");
      d.innerHTML=`<span class="dot" style="background:${MC[n]}"></span>`+
        (n==="GCSL-NF"?`<b>${n}</b>`:n);
      lg.appendChild(d);
    });
  }
  const sg=$("#fig12aShapes");
  if(sg){
    sg.innerHTML="";
    F.settings.forEach((s,i)=>{
      const d=document.createElement("div"); d.className="li";
      const mini=el("svg",{viewBox:"0 0 16 16",width:14,height:14});
      marker(mini,8,8,SYM[i],C.ink2,5);
      d.appendChild(mini);
      d.appendChild(document.createTextNode(" "+s));
      sg.appendChild(d);
    });
  }
}

/* =====================================================
   FIGURE 12b — radial CDFs
   ===================================================== */
function cdfPanel(host,title,ylabel,curves,F){
  const W=430,H=250,padL=44,padR=12,padT=22,padB=36;
  const iw=W-padL-padR, ih=H-padT-padB;
  const svg=svgEl(host,W,H);
  let hi=0; curves.forEach(c=>c.m.forEach((v,i)=>{ hi=Math.max(hi,v+c.s[i]); }));
  const y1=Math.max(5,Math.ceil(hi/10)*10);
  const X=v=>padL+iw*v/F.danger;
  const Y=v=>padT+ih*(1-clamp(v,0,y1)/y1);

  txt(svg,padL+iw/2,padT-9,title,{class:"paneltitle","text-anchor":"middle"});
  [0,y1/2,y1].forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line","stroke-dasharray":"3 3"},svg);
    txt(svg,padL-6,Y(v)+3.6,nfmt(v),{class:"tick","text-anchor":"end"});
  });
  [0,0.1,0.2,0.3,0.4].forEach(v=>{
    txt(svg,X(v),H-padB+14,v.toFixed(1),{class:"tick","text-anchor":"middle"});
  });
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
  el("line",{x1:padL,y1:padT,x2:padL,y2:H-padB,class:"axis-line"},svg);
  el("line",{x1:X(F.core),y1:padT,x2:X(F.core),y2:H-padB,stroke:C.ink,
    "stroke-width":1,"stroke-dasharray":"4 3",opacity:.7},svg);
  txt(svg,X(F.core)+5,padT+11,"core r = 0.2",{class:"tick",fill:C.ink2,"font-weight":"700"});
  txt(svg,padL+iw/2,H-3,"radius x",{class:"axlab","text-anchor":"middle"});
  txt(svg,-(padT+ih/2),12,ylabel,{class:"axlab","text-anchor":"middle",transform:"rotate(-90)"});

  curves.forEach((c,i)=>{
    let up="",dn="";
    for(let k=0;k<c.m.length;k++)
      up+=(k?"L":"M")+X(F.x[k]).toFixed(1)+" "+Y(c.m[k]+c.s[k]).toFixed(1)+" ";
    for(let k=c.m.length-1;k>=0;k--)
      dn+="L"+X(F.x[k]).toFixed(1)+" "+Y(c.m[k]-c.s[k]).toFixed(1)+" ";
    el("path",{d:up+dn+"Z",fill:F.colors[i],"fill-opacity":.16,stroke:"none"},svg);
  });
  curves.forEach((c,i)=>{
    let d="";
    for(let k=0;k<c.m.length;k++)
      d+=(k?"L":"M")+X(F.x[k]).toFixed(1)+" "+Y(c.m[k]).toFixed(1)+" ";
    el("path",{d,fill:"none",stroke:F.colors[i],"stroke-width":1.8},svg);
  });

  const gx=el("g",{opacity:0},svg);
  const rule=el("line",{y1:padT,y2:H-padB,stroke:C.ink,"stroke-width":.8,
    "stroke-dasharray":"2 2",opacity:.6},gx);
  const dots=curves.map((c,i)=>el("circle",{r:3,fill:F.colors[i],
    stroke:C.paper,"stroke-width":1.1},gx));
  const hit=el("rect",{x:padL,y:padT,width:iw,height:ih,fill:"transparent"},svg);
  hit.addEventListener("mousemove",ev=>{
    const box=svg.getBoundingClientRect();
    const vx=F.danger*((ev.clientX-box.left)/box.width*W-padL)/iw;
    let bi=0,bd=Infinity;
    F.x.forEach((xv,k)=>{ const d=Math.abs(xv-vx); if(d<bd){bd=d;bi=k;} });
    rule.setAttribute("x1",X(F.x[bi])); rule.setAttribute("x2",X(F.x[bi]));
    let rows="";
    curves.forEach((c,i)=>{
      dots[i].setAttribute("cx",X(F.x[bi])); dots[i].setAttribute("cy",Y(c.m[bi]));
      rows+=`<div class="tt-r"><span style="color:${F.colors[i]}">&#9632;</span> `+
            `${F.settings[i]} &nbsp;${c.m[bi].toFixed(2)}%</div>`;
    });
    gx.setAttribute("opacity",1);
    showTip(`<div class="tt-t">radius ${F.x[bi].toFixed(3)}</div>`+rows,
      ev.clientX,ev.clientY);
  });
  hit.addEventListener("mouseleave",()=>{ gx.setAttribute("opacity",0); hideTip(); });
}
function drawFig12b(){
  const F=FIG.fig12b, host=$("#fig12b"); if(!host) return;
  host.innerHTML="";
  const a=document.createElement("div"), b=document.createElement("div");
  host.appendChild(a); host.appendChild(b);
  cdfPanel(a,"Trajectory CDF","Trajectories within radius x, %",F.traj,F);
  cdfPanel(b,"Step CDF","Steps within radius x, %",F.step,F);
  const lg=$("#fig12bLegend");
  if(lg) legendInto(lg,F.settings,F.colors,null);
}

/* =====================================================
   FIGURE 12c — visit heatmaps
   ===================================================== */
const REDS=["#fff5f0","#fee0d2","#fcbba1","#fc9272","#fb6a4a",
            "#ef3b2c","#cb181d","#a50f15","#67000d"];
function redsAt(t){
  const p=clamp(t,0,1)*(REDS.length-1), i=Math.floor(p), f=p-i;
  const a=REDS[i], b=REDS[Math.min(i+1,REDS.length-1)];
  const hx=s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
  const A=hx(a),B=hx(b);
  return [Math.round(A[0]+(B[0]-A[0])*f),Math.round(A[1]+(B[1]-A[1])*f),
          Math.round(A[2]+(B[2]-A[2])*f)];
}
function drawFig12c(){
  const F=FIG.fig12c, host=$("#fig12c"); if(!host) return;
  host.innerHTML="";
  const n=F.n;
  F.grids.forEach((grid,gi)=>{
    const cell=document.createElement("div");
    host.appendChild(cell);
    const S=220, svg=svgEl(cell,S,S+26);
    txt(svg,S/2,13,F.settings[gi],{class:"paneltitle","text-anchor":"middle"});

    /* render the grid off-screen and drop it in as one image: 2 500 rects
       per panel would be a lot of DOM for no visual gain */
    const cv=document.createElement("canvas");
    cv.width=n; cv.height=n;
    const ctx=cv.getContext("2d");
    const img=ctx.createImageData(n,n);
    for(let k=0;k<n*n;k++){
      /* the .npz grids are stored row = y, and y grows upward, so flip */
      const r=Math.floor(k/n), c=k%n, src=(n-1-r)*n+c;
      const rgb=redsAt(grid[src]/255);
      img.data[k*4]=rgb[0]; img.data[k*4+1]=rgb[1];
      img.data[k*4+2]=rgb[2]; img.data[k*4+3]=255;
    }
    ctx.putImageData(img,0,0);
    const pad=8, side=S-2*pad, top=22;
    el("image",{href:cv.toDataURL(),x:pad,y:top,width:side,height:side,
      preserveAspectRatio:"none"},svg);
    el("rect",{x:pad,y:top,width:side,height:side,fill:"none",
      stroke:C.ink,"stroke-width":1},svg);
    const cx=pad+side/2, cy=top+side/2, unit=side/2;   /* the box spans [-1,1] */
    el("circle",{cx,cy,r:F.danger*unit,fill:"none",stroke:C.ink,"stroke-width":1.4},svg);
    el("circle",{cx,cy,r:F.core*unit,fill:"none",stroke:C.ink,"stroke-width":1.4,
      "stroke-dasharray":"4 3"},svg);
  });

  /* a shared colour ramp */
  const bar=$("#fig12cBar");
  if(bar){
    bar.innerHTML="";
    const W=300,H=40, svg=svgEl(bar,W,H);
    const grad=el("defs",{},svg);
    const lg=el("linearGradient",{id:"redsRamp",x1:"0",x2:"1"},grad);
    REDS.forEach((c,i)=>el("stop",{offset:(i/(REDS.length-1)*100)+"%","stop-color":c},lg));
    el("rect",{x:0,y:6,width:W-60,height:11,fill:"url(#redsRamp)",
      stroke:C.line2,"stroke-width":.8},svg);
    txt(svg,0,32,"0",{class:"tick"});
    txt(svg,W-60,32,(F.zmax*100).toFixed(2)+"%",{class:"tick","text-anchor":"end"});
    txt(svg,W-52,16,"of all visits",{class:"tick"});
  }
}

/* =====================================================
   FIGURE 13 — goal reaching vs rule adherence
   ===================================================== */
function drawFig13(){
  const F=FIG.fig13, host=$("#fig13"); if(!host) return;
  host.innerHTML="";
  const W=520,H=300,padL=44,padR=14,padT=18,padB=44;
  const iw=W-padL-padR, ih=H-padT-padB;
  const svg=svgEl(host,W,H);
  const Y=v=>padT+ih*(1-clamp(v,0,105)/105);
  [0,25,50,75,100].forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line","stroke-dasharray":"3 3"},svg);
    txt(svg,padL-6,Y(v)+3.6,String(v),{class:"tick","text-anchor":"end"});
  });
  el("line",{x1:padL,y1:Y(100),x2:W-padR,y2:Y(100),stroke:C.ink,"stroke-width":1,
    "stroke-dasharray":"2 3",opacity:.65},svg);
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
  txt(svg,-(padT+ih/2),13,"% of 2 000 evaluation trips",
    {class:"axlab","text-anchor":"middle",transform:"rotate(-90)"});

  const gw=iw/F.bars.length, bw=gw*0.28;
  F.bars.forEach((b,i)=>{
    const cx=padL+gw*(i+0.5);
    [["reached",-1,F.colors[0]],["obeyed",1,F.colors[1]]].forEach(([k,side,col])=>{
      const [m,sd]=b[k];
      const x=cx+side*bw*0.58-bw/2;
      el("rect",{x,y:Y(m),width:bw,height:Math.max(0,Y(0)-Y(m)),fill:col,
        stroke:C.ink,"stroke-width":.7},svg);
      if(sd>0){
        el("line",{x1:x+bw/2,y1:Y(m-sd),x2:x+bw/2,y2:Y(Math.min(105,m+sd)),
          stroke:C.ink,"stroke-width":1},svg);
        el("line",{x1:x+bw/2-3.5,y1:Y(Math.min(105,m+sd)),x2:x+bw/2+3.5,
          y2:Y(Math.min(105,m+sd)),stroke:C.ink,"stroke-width":1},svg);
      }
      txt(svg,x+bw/2,Y(Math.min(105,m+sd))-6,m.toFixed(0),
        {class:"tick","text-anchor":"middle",fill:C.ink,"font-weight":"700"});
    });
    txt(svg,cx,H-padB+16,b.name,{class:"axlab","text-anchor":"middle"});
  });
  const lg=$("#fig13legend");
  if(lg) legendInto(lg,["reached the goal","obeyed the waypoint rule"],F.colors,null);
}

/* =====================================================
   LIVE PANEL 1 — how p_varphi's training pairs are sampled
   This is an illustration of Equations (5)-(7), drawn from the
   definitions. It is not a result and uses no experimental data.
   ===================================================== */
const SAMP={ nTraj:6, T:40, ref:{tr:2, t:18}, n:5 };
function drawSampler(){
  const host=$("#sampler"); if(!host) return;
  host.innerHTML="";
  const W=700,H=250,padL=54,padR=14,padT=26,padB=40;
  const iw=W-padL-padR, ih=H-padT-padB;
  const svg=svgEl(host,W,H);
  const X=t=>padL+iw*t/(SAMP.T-1);
  const Yr=r=>padT+ih*(r+0.5)/SAMP.nTraj;
  const n=SAMP.n, ref=SAMP.ref;

  txt(svg,padL+iw/2,H-6,"time step within a trajectory",
    {class:"axlab","text-anchor":"middle"});
  txt(svg,-(padT+ih/2),13,"trajectories in the buffer",
    {class:"axlab","text-anchor":"middle",transform:"rotate(-90)"});

  /* the triangle Delta(i, n) that positives are drawn from */
  const tri=[];
  for(let t=0;t<SAMP.T;t++){
    const w=Math.max(0,1-Math.abs(t-ref.t)/n);
    tri.push(w);
  }
  let d=`M${X(0)} ${Yr(ref.tr)-2}`;
  tri.forEach((w,t)=>{ d+=`L${X(t)} ${(Yr(ref.tr)-2-w*20).toFixed(1)}`; });
  d+=`L${X(SAMP.T-1)} ${Yr(ref.tr)-2}Z`;
  el("path",{d,fill:C.pos,"fill-opacity":.20,stroke:C.pos,"stroke-width":1},svg);

  let nPos=0,nNeg1=0,nNeg2=0;
  for(let r=0;r<SAMP.nTraj;r++){
    el("line",{x1:X(0),y1:Yr(r),x2:X(SAMP.T-1),y2:Yr(r),
      stroke:C.line2,"stroke-width":.8},svg);
    txt(svg,padL-9,Yr(r)+3.6,"τ"+(r+1),
      {class:"tick","text-anchor":"end",
       "font-weight": r===ref.tr?"700":"400",
       fill: r===ref.tr?C.ink:C.muted});
    for(let t=0;t<SAMP.T;t++){
      let fill=C.line2, rad=2.2, kind="";
      if(r===ref.tr){
        const dt=Math.abs(t-ref.t);
        if(t===ref.t){ fill=C.ink; rad=4.2; kind="reference state s_i"; }
        else if(dt<n){ fill=C.pos; rad=3.2; kind="D+ (same trajectory, |i-j| < n)"; nPos++; }
        else if(dt>n){ fill=C.neg; rad=2.8; kind="D-1 (same trajectory, |i-j| > n)"; nNeg1++; }
        else { fill=C.muted; rad=2.4; kind="on the threshold, |i-j| = n"; }
      } else { fill="#b07d3a"; rad=2.4; kind="D-2 (a different trajectory)"; nNeg2++; }
      const c=el("circle",{cx:X(t),cy:Yr(r),r:rad,fill,opacity:r===ref.tr?1:.55},svg);
      if(kind){
        c.addEventListener("mousemove",ev=>showTip(
          `<div class="tt-t">τ${r+1}, step ${t}</div><div class="tt-r">${kind}</div>`,
          ev.clientX,ev.clientY));
        c.addEventListener("mouseleave",hideTip);
      }
    }
  }
  /* the threshold marks, and inline names for the three sets */
  [ref.t-n,ref.t+n].forEach(t=>{
    if(t<0||t>=SAMP.T) return;
    el("line",{x1:X(t),y1:Yr(ref.tr)-26,x2:X(t),y2:Yr(ref.tr)+9,stroke:C.ink2,
      "stroke-width":1,"stroke-dasharray":"3 2"},svg);
  });
  /* these labels sit over the neighbouring rows, so each is drawn twice:
     once as a paper-coloured halo, once in its own colour */
  const tag=(x,y,s,col,anchor)=>{
    const a={class:"tick","text-anchor":anchor||"start","font-weight":"700"};
    txt(svg,x,y,s,Object.assign({},a,{fill:"none",stroke:"#fffdf7","stroke-width":3.5}));
    txt(svg,x,y,s,Object.assign({},a,{fill:col}));
  };
  tag(X(ref.t),Yr(ref.tr)-31,`𝒟₊ , within n = ${n}`,C.pos,"middle");
  tag(X(Math.max(0,ref.t-n-2)),Yr(ref.tr)+19,"𝒟₋¹",C.neg,"end");
  tag(X(Math.min(SAMP.T-1,ref.t+n+2)),Yr(ref.tr)+19,"𝒟₋¹",C.neg,"start");
  tag(X(SAMP.T-1),Yr(SAMP.nTraj-1)+18,"𝒟₋²  ·  every other trajectory",
    "#8a6428","end");

  const nOut=$("#sampN"); if(nOut) nOut.textContent=n;
  const cOut=$("#sampCounts");
  if(cOut) cOut.innerHTML=
    `<span style="color:${C.pos};font-weight:700">${nPos}</span> positive &middot; `+
    `<span style="color:${C.neg};font-weight:700">${nNeg1}</span> in-trajectory negative &middot; `+
    `<span style="color:#b07d3a;font-weight:700">${nNeg2}</span> cross-trajectory negative`;
}

/* =====================================================
   LIVE PANEL 2 — the two targets a single trajectory produces
   Also an illustration of the definitions: Equation (2) pushes the
   relabelled target to 1, Equation (4) pushes the original-goal target
   to p_varphi(s_T, g), discounted by gamma^(T-t).
   ===================================================== */
const TWO={ T:12, gamma:0.9, p:0.15 };
function drawTwoTargets(){
  const host=$("#twoTargets"); if(!host) return;
  host.innerHTML="";
  const W=700,H=280,padL=52,padR=124,padT=24,padB=46;
  const iw=W-padL-padR, ih=H-padT-padB;
  const svg=svgEl(host,W,H);
  const X=t=>padL+iw*t/TWO.T;
  const Y=v=>padT+ih*(1-clamp(v,0,1));

  [0,0.25,0.5,0.75,1].forEach(v=>{
    el("line",{x1:padL,y1:Y(v),x2:W-padR,y2:Y(v),class:"grid-line","stroke-dasharray":"3 3"},svg);
    txt(svg,padL-6,Y(v)+3.6,v.toFixed(2),{class:"tick","text-anchor":"end"});
  });
  [0,3,6,9,12].forEach((t,i)=>{
    el("line",{x1:X(t),y1:padT,x2:X(t),y2:H-padB,class:"grid-line","stroke-dasharray":"3 3"},svg);
    txt(svg,X(t),H-padB+14,String(t),
      {class:"tick","text-anchor":i===0?"start":i===4?"end":"middle"});
  });
  el("line",{x1:padL,y1:H-padB,x2:W-padR,y2:H-padB,class:"axis-line"},svg);
  el("line",{x1:padL,y1:padT,x2:padL,y2:H-padB,class:"axis-line"},svg);
  txt(svg,padL+iw/2,H-5,"step t in a trajectory of length T = 12",
    {class:"axlab","text-anchor":"middle"});
  txt(svg,-(padT+ih/2),13,"target for pθ(succ = 1 | sₜ, aₜ)",
    {class:"axlab","text-anchor":"middle",transform:"rotate(-90)"});

  /* L+ : the relabelled target is 1 at every step */
  el("line",{x1:X(0),y1:Y(1),x2:X(TWO.T),y2:Y(1),stroke:C.pos,"stroke-width":2.2},svg);
  txt(svg,W-padR+8,Y(1)+4,"L₊ target = 1",
    {class:"tick",fill:C.pos,"font-weight":"700"});

  /* L_o : the original-goal target, and its effective weight */
  let dw="",dt="";
  for(let t=0;t<=TWO.T;t++){
    const w=Math.pow(TWO.gamma,TWO.T-t);
    dw+=(t?"L":"M")+X(t).toFixed(1)+" "+Y(w).toFixed(1)+" ";
    dt+=(t?"L":"M")+X(t).toFixed(1)+" "+Y(TWO.p).toFixed(1)+" ";
  }
  el("path",{d:dw,fill:"none",stroke:C.accent,"stroke-width":1.6,
    "stroke-dasharray":"5 3"},svg);
  el("path",{d:dt,fill:"none",stroke:C.neg,"stroke-width":2.2},svg);
  txt(svg,W-padR+8,Y(TWO.p)+4,"Lₒ target",
    {class:"tick",fill:C.neg,"font-weight":"700"});
  txt(svg,W-padR+8,Y(TWO.p)+18,"= pφ(s_T, g)",{class:"tick",fill:C.muted});
  /* the weight label sits on the dashed curve rather than in the margin,
     where it would collide with the L+ label */
  txt(svg,X(2)+4,Y(Math.pow(TWO.gamma,TWO.T-2))-9,"weight γᵀ⁻ᵗ",
    {class:"tick",fill:"none",stroke:"#fffdf7","stroke-width":3.5,"font-weight":"700"});
  txt(svg,X(2)+4,Y(Math.pow(TWO.gamma,TWO.T-2))-9,"weight γᵀ⁻ᵗ",
    {class:"tick",fill:C.accent,"font-weight":"700"});

  for(let t=0;t<=TWO.T;t++){
    const w=Math.pow(TWO.gamma,TWO.T-t);
    el("circle",{cx:X(t),cy:Y(TWO.p),r:3,fill:C.neg,opacity:.35+0.65*w},svg);
    el("circle",{cx:X(t),cy:Y(1),r:3,fill:C.pos},svg);
  }
  const gOut=$("#twoGamma"), pOut=$("#twoP"), rOut=$("#twoRead");
  if(gOut) gOut.textContent=TWO.gamma.toFixed(2);
  if(pOut) pOut.textContent=TWO.p.toFixed(2);
  if(rOut) rOut.innerHTML=
    `At the last step the corrective target carries full weight `+
    `(<span class="mono">γ⁰ = 1</span>); ten steps earlier it carries `+
    `<span class="mono">${Math.pow(TWO.gamma,10).toFixed(3)}</span>. `+
    (TWO.p<0.5
      ? `Because <span class="mono">pφ = ${TWO.p.toFixed(2)}</span> is low, every action in this
         trajectory is pushed <em>away</em> from being chosen for the original goal.`
      : `Because <span class="mono">pφ = ${TWO.p.toFixed(2)}</span> is high, the trajectory is
         treated as near-successful for the original goal too, and the corrective
         term nearly agrees with the relabelled one.`);
}

/* =====================================================
   page furniture
   ===================================================== */
function furniture(){
  const bar=$("#progress");
  const onScroll=()=>{
    const h=document.documentElement;
    const p=h.scrollTop/Math.max(1,h.scrollHeight-h.clientHeight);
    if(bar) bar.style.width=(p*100).toFixed(2)+"%";
    let cur=null;
    $$("section[id]").forEach(s=>{
      if(s.getBoundingClientRect().top<=120) cur=s.id;
    });
    $$(".nav-links a").forEach(a=>
      a.classList.toggle("active",a.getAttribute("href")==="#"+cur));
  };
  addEventListener("scroll",onScroll,{passive:true}); onScroll();

  const burger=$(".nav-burger");
  if(burger) burger.addEventListener("click",()=>$(".nav-links").classList.toggle("open"));

  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); }
  }),{threshold:.08});
  $$(".reveal").forEach(n=>io.observe(n));

  const bib=$("#copyBib");
  if(bib) bib.addEventListener("click",()=>{
    const t=$("#bibtex").textContent;
    navigator.clipboard.writeText(t).then(
      ()=>{ $("#copyMsg").textContent="copied"; setTimeout(()=>$("#copyMsg").textContent="",1600); },
      ()=>{ $("#copyMsg").textContent="press ⌘C / Ctrl+C"; });
  });

  /* figures inside a collapsed <details> have zero width when first drawn,
     so redraw them the first time the section is opened */
  $$("details.acc").forEach(d=>{
    d.addEventListener("toggle",()=>{
      if(d.open && !d.dataset.drawn){ d.dataset.drawn="1"; drawDeferred(d); }
    });
  });
}

const DEFERRED={};
function drawDeferred(d){
  const key=d.dataset.fig;
  if(key && DEFERRED[key]) safe(key,DEFERRED[key]);
}

function safe(n,f){ try{ f(); }catch(err){ console.error("["+n+"]",err); } }

function init(){
  furniture();
  if(!FIG){
    $$(".needsdata").forEach(n=>{ n.style.display=""; });
    console.warn("figure_data.js not loaded - run export_figure_data.py");
  } else {
    $$(".needsdata").forEach(n=>{ n.style.display="none"; });
    /* open by default */
    if(FIG.fig5) safe("fig5",drawFig5);
    if(FIG.fig6) safe("fig6",drawFig6);
    /* deferred until their <details> is opened */
    if(FIG.fig7) DEFERRED.fig7=drawFig7;
    if(FIG.fig9) DEFERRED.fig9=drawFig9;
    if(FIG.fig10) DEFERRED.fig10=drawFig10;
    if(FIG.fig11) DEFERRED.fig11=drawFig11;
    /* each sub-panel is gated on its own key, so a partial export degrades to
       a missing panel rather than a blank section */
    if(FIG.fig12a||FIG.fig12b||FIG.fig12c) DEFERRED.fig12=()=>{
      if(FIG.fig12a) safe("fig12a",drawFig12a);
      if(FIG.fig12b) safe("fig12b",drawFig12b);
      if(FIG.fig12c) safe("fig12c",drawFig12c);
    };
    if(FIG.fig13) DEFERRED.fig13=drawFig13;
  }
  safe("sampler",drawSampler);
  safe("twoTargets",drawTwoTargets);

  const nIn=$("#sampNIn");
  if(nIn) nIn.addEventListener("input",()=>{ SAMP.n=+nIn.value; drawSampler(); });
  const gIn=$("#twoGammaIn"), pIn=$("#twoPIn");
  if(gIn) gIn.addEventListener("input",()=>{ TWO.gamma=+gIn.value; drawTwoTargets(); });
  if(pIn) pIn.addEventListener("input",()=>{ TWO.p=+pIn.value; drawTwoTargets(); });

  addEventListener("resize",()=>{
    clearTimeout(window.__rz);
    window.__rz=setTimeout(()=>{ safe("sampler",drawSampler); },200);
  });
}
if(document.readyState!=="loading") init(); else addEventListener("DOMContentLoaded",init);
})();
