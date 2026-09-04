/* Family DISC app. Scores computed from share codes. Report copy from disc-copy.js.
   Measurement in facts.js, reading in compare.js. Do not change scoring math. */
const DIMS=["D","I","S","C"];
const PREC={D:0,I:1,S:2,C:3};
const PAIRS=[[12,24],[6,25],[1,26],[15,27]];
const PRIMARY_GAP=14;
const BALANCED_SPREAD=15;
const NEUTRAL_MIN=20;
const NEUTRAL_MARGIN=4;
const CARE_MS=3000;
const CARE_TOTAL=150000;
const DIMHEX={D:"#d94f3d",I:"#e8a13c",S:"#43a06b",C:"#4169d9"};
const WHEEL_ANG={D:135,I:45,S:315,C:225};
const FAM_DOT="#9a9280";

function median(a){const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function segOf(n){return n<=14?1:n<=28?2:n<=42?3:n<=57?4:n<=71?5:n<=85?6:7}
function bandOf(n){return n>=65?"High":n>=36?"Moderate":"Low"}
function computeScores(most,least,times){
 const raw={D:0,I:0,S:0,C:0},M={D:0,I:0,S:0,C:0},L={D:0,I:0,S:0,C:0};
 for(let i=0;i<most.length;i++){raw[most[i]]+=2;raw[least[i]]-=1;M[most[i]]++;L[least[i]]++}
 const N={},G1={},G2={},seg={},band={},neutral={};
 DIMS.forEach(d=>{N[d]=Math.round((raw[d]+28)/84*100);G1[d]=Math.round(M[d]/28*100);
  G2[d]=Math.round((28-L[d])/28*100);seg[d]=segOf(N[d]);band[d]=bandOf(N[d]);
  neutral[d]=28-M[d]-L[d]});
 const bySc=o=>[...DIMS].sort((a,b)=>o[b]-o[a]||PREC[a]-PREC[b]);
 const s=bySc(N),gap=N[s[0]]-N[s[1]],spread=N[s[0]]-N[s[3]];
 let shape,key;
 if(spread<BALANCED_SPREAD){shape="balanced";key=""}
 else if(gap>=PRIMARY_GAP){shape="primary";key=s[0]}
 else{shape="blend";key=[s[0],s[1]].sort((a,b)=>PREC[a]-PREC[b]).join("")}
 const nu=DIMS.map(d=>[d,neutral[d]]).sort((a,b)=>b[1]-a[1]||PREC[a[0]]-PREC[b[0]]);
 const unspoken=(nu[0][1]>=NEUTRAL_MIN&&nu[0][1]-nu[1][1]>=NEUTRAL_MARGIN&&M[nu[0][0]]>=3)?nu[0][0]:null;
 let pairs=0;PAIRS.forEach(p=>{if(most[p[0]]===most[p[1]])pairs++});
 const rushed=times&&times.length?(median(times)<CARE_MS||times.reduce((a,b)=>a+b,0)<CARE_TOTAL):false;
 const care={pairs:pairs,rushed:rushed,undifferentiated:spread<BALANCED_SPREAD};
 care.level=(pairs<=1)?"low":(pairs>=3&&!rushed)?"ok":"mixed";
 return{raw,N,G1,G2,seg,band,neutral,key,shape,gap,spread,unspoken,care,order:s}
}
function wheelVec(N){
 let x=0,y=0;
 DIMS.forEach(d=>{const a=WHEEL_ANG[d]*Math.PI/180;x+=N[d]*Math.cos(a);y+=N[d]*Math.sin(a)});
 const mag=Math.min(Math.sqrt(x*x+y*y)/100,1);
 return{x,y,mag,ang:Math.atan2(y,x)*180/Math.PI}
}
function likertSummary(v){
 if(!Array.isArray(v)||v.length!==24||v.some(x=>!(Number.isFinite(x)&&x>=1&&x<=5)))return null;
 const m={D:0,I:0,S:0,C:0};v.forEach((x,i)=>m[DIMS[i%4]]+=x);
 DIMS.forEach(d=>m[d]=Math.round(m[d]/6*10)/10);
 return m}
function likertVals(likert,d){
 const off=PREC[d];
 return likert.split("").map(Number).filter((_,i)=>i%4===off);
}

function decode(code){
 const most=[],least=[];
 for(let i=0;i<28;i++){most.push(code[i*2]);least.push(code[i*2+1])}
 return {most,least}
}

const FAMILY=PEOPLE.map(p=>{
 const {most,least}=decode(p.code);
 const result=computeScores(most,least,null);
 const intensity=p.likert?likertSummary(p.likert.split("").map(Number)):null;
 return Object.assign({},p,{result,intensity,most,least});
});
const FACTS=buildFacts(FAMILY);
if(typeof window!=="undefined")window.FACTS=FACTS;

const app=document.getElementById("app");
let compareOn=false;
let picked=[];

function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}
function byId(id){return FAMILY.find(p=>p.id===id)}
function ranked(r){return r.order||[...DIMS].sort((a,b)=>r.N[b]-r.N[a]||PREC[a]-PREC[b])}
function profileOf(p){const k=p.result.key;return k&&PROFILES[k]?PROFILES[k]:null}
function shownLetters(r){
 if(r.shape==="balanced")return [];
 const ord=ranked(r);
 const out=[ord[0]];
 if(r.N[ord[1]]>=36) out.push(ord[1]);
 return out;
}
function lettersLabel(r){
 if(r.shape==="balanced")return "mix";
 const vis=shownLetters(r);
 if(vis.length===1)return vis[0];
 return vis[0]+"+"+vis[1];
}
function chips(r){
 if(r.shape==="balanced")return `<span class="chip mix">mix</span>`;
 return shownLetters(r).map(d=>`<span class="chip ${d}">${d}</span>`).join("");
}
function profileName(p){
 const pr=profileOf(p);
 if(pr)return pr.name;
 return "No single style";
}
function fname(p){return firstName(p)}
function snap(p){return personSnapshot(p)}
function stagClass(kind, pole){
 if(kind==="pace") return pole==="fast"?"stag fast":(pole==="slow"?"stag slow":"stag even");
 return pole==="task"?"stag task":(pole==="people"?"stag people":"stag even");
}
function stags(S){
 return `<span class="${stagClass("pace",S.paceW.pole)}">${esc(S.paceW.short)}</span><span class="${stagClass("pri",S.priW.pole)}">${esc(S.priW.short)}</span>`;
}
function ordinalStr(n){
 const s=["th","st","nd","rd"],v=n%100;
 return n+(s[(v-20)%10]||s[v]||s[0]);
}

function nav(page){
 return `<header class="top">
  <a class="brand" href="#/">Family DISC</a>
  <nav>
    <a href="#/" class="${page==="home"?"on":""}">Home</a>
    <a href="#/family" class="${page==="family"?"on":""}">Family</a>
    <a href="#/method" class="${page==="method"?"on":""}">Method</a>
  </nav>
 </header>`;
}
function footNote(extra){
 return `<p class="footer">${extra||""}Drawn from one sitting of a DISC-style questionnaire — a strong pattern, honestly read, not a cage. <a href="#/method">How the numbers work</a>. Not for hiring; not a clinical instrument.</p>`;
}

function barRow(d,n,segv,bandv){
 const pct=Math.max(n,4);
 return `<div class="bar"><div class="lbl"><span class="dot d${d}"></span>${d} · ${DIMNAMES[d]}</div>
  <div class="track"><div class="fill c${d}-bg" style="width:${pct}%">${n}</div></div>
  <div class="band">${bandv} · seg ${segv}</div></div>`;
}
function intensityRow(d,v,vals){
 const pct=Math.max(Math.round((v-1)/4*100),8);
 const detail=vals?`${vals.join(" · ")}`:"of 5";
 return `<div class="bar"><div class="lbl"><span class="dot d${d}"></span>${d} · ${DIMNAMES[d]}</div>
  <div class="track"><div class="fill c${d}-bg" style="width:${pct}%">${v.toFixed(1)}</div></div>
  <div class="band">${detail}</div></div>`;
}

function wheelSVG(people, opts){
 const cx=170,cy=163,R=118;
 const P=(a,rr)=>[cx+rr*Math.cos(a*Math.PI/180),cy-rr*Math.sin(a*Math.PI/180)];
 const QUAD={D:[90,180],I:[0,90],S:[270,360],C:[180,270]};
 const QFILL={D:"217,79,61",I:"232,161,60",S:"67,160,107",C:"65,105,217"};
 const act=new Set();
 people.forEach(p=>{
  if(p.result.key)[...p.result.key].forEach(d=>act.add(d));
  else ranked(p.result).slice(0,2).forEach(d=>act.add(d));
 });
 const wedges=DIMS.map(d=>{
  const [a0,a1]=QUAD[d],[x0,y0]=P(a0,R),[x1,y1]=P(a1,R);
  const op=act.has(d)?.20:.07;
  return `<path d="M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="rgba(${QFILL[d]},${op})"/>`;
 }).join("");
 const letters=DIMS.map(d=>{
  const mid=(QUAD[d][0]+QUAD[d][1])/2,[lx,ly]=P(mid,R*0.60);
  return `<text x="${lx.toFixed(1)}" y="${(ly+13).toFixed(1)}" text-anchor="middle" font-size="38" font-weight="800" fill="rgba(${QFILL[d]},${act.has(d)?.85:.30})">${d}</text>`;
 }).join("");
 const rings=[0.33,0.66].map(k=>`<circle cx="${cx}" cy="${cy}" r="${(R*k).toFixed(1)}" fill="none" stroke="rgba(22,32,46,.08)" stroke-width="1"/>`).join("");
 const lab=(x,y,t,anchor)=>`<text x="${x}" y="${y}" text-anchor="${anchor||"middle"}" font-size="10.5" font-weight="700" letter-spacing="1.5" fill="rgba(101,113,140,.85)">${t}</text>`;
 const dots=people.map((p,idx)=>{
  const W=wheelVec(p.result.N);
  const dist=W.mag*R*0.86,[dx,dy]=P(W.ang,dist);
  const col=DIMHEX[ranked(p.result)[0]]||"#16202e";
  const nudge=people.length>2?((idx%3)-1)*10:0;
  const ly=dy+(dy>cy?16:-12)+nudge*0.2;
  const lx=Math.min(Math.max(dx+nudge,cx-R+20),cx+R-20);
  const nm=p.name.split(" ")[0];
  return `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${people.length>2?6:9}" fill="${col}" stroke="#fff" stroke-width="2.2"/>
   <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="${people.length>2?9:10}" font-weight="800" fill="#141d2c">${esc(nm)}</text>`;
 }).join("");
 const label=opts&&opts.label?opts.label:"DISC map";
 return `<svg viewBox="0 0 340 330" style="width:100%;max-width:420px;display:block;margin:0 auto" role="img" aria-label="${esc(label)}">
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="rgba(22,32,46,.14)" stroke-width="1.5"/>
  ${wedges}${rings}
  <line x1="${cx-R}" y1="${cy}" x2="${cx+R}" y2="${cy}" stroke="rgba(22,32,46,.10)" stroke-width="1"/>
  <line x1="${cx}" y1="${cy-R}" x2="${cx}" y2="${cy+R}" stroke="rgba(22,32,46,.10)" stroke-width="1"/>
  ${letters}
  ${lab(cx,cy-R-12,"FAST PACE")}${lab(cx,cy+R+22,"STEADY PACE")}
  ${lab(cx-R-6,cy-4,"TASK","end")}${lab(cx-R-6,cy+10,"FOCUS","end")}
  ${lab(cx+R+6,cy-4,"PEOPLE","start")}${lab(cx+R+6,cy+10,"FOCUS","start")}
  ${dots}</svg>`;
}

function plotXY(S){
 const x=8+(clamp100(50+S.pri/2)/100)*84;
 const y=8+(clamp100(50-S.pace/2)/100)*84;
 return {x,y};
}
function scatter2x2(people, opts){
 const compact=opts&&opts.compact;
 const snaps=people.map(p=>snap(p));
 const pts=snaps.map((S,i)=>{
  const xy=plotXY(S);
  return {S,i,x:xy.x,y:xy.y,col:DIMHEX[S.order[0]]||"#5c574c"};
 });
 for(let i=0;i<pts.length;i++){
  for(let j=0;j<i;j++){
   const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
   if(Math.hypot(dx,dy)<7){
    pts[i].x=Math.max(8, Math.min(92, pts[i].x+(i%2?5:-5)));
    pts[i].y=Math.max(8, Math.min(92, pts[i].y+((i%3)-1)*5));
   }
  }
 }
 const dots=pts.map(pt=>`<button type="button" class="m2-dot" style="left:${pt.x.toFixed(1)}%;top:${pt.y.toFixed(1)}%" data-id="${esc(pt.S.p.id)}">
   <span class="m2-pin" style="background:${pt.col}"></span>
   <span class="m2-nm">${esc(pt.S.name)}</span>
 </button>`).join("");
 const label=(opts&&opts.label)||"Pace by priority";
 return `<div class="map2x2 ${compact?"compact":""}" role="img" aria-label="${esc(label)}">
  <div class="m2-plot">
   <span class="m2-axis m2-n">Fast</span>
   <span class="m2-axis m2-s">Patient</span>
   <span class="m2-axis m2-w">People</span>
   <span class="m2-axis m2-e">The plan</span>
   <span class="m2-cross-h"></span>
   <span class="m2-cross-v"></span>
   <span class="m2-q tl">fast · people</span>
   <span class="m2-q tr">fast · plan</span>
   <span class="m2-q bl">patient · people</span>
   <span class="m2-q br">patient · plan</span>
   ${dots}
  </div>
 </div>`;
}

function continuumHTML(left, right, items){
 const close=items.length===2 && Math.abs(items[0].pos-items[1].pos)<8;
 const dots=items.map((it,idx)=>{
  const nudge=close?(idx===0?" nudge-up":" nudge-down"):"";
  return `<span class="c-dot${nudge}" style="left:${clamp100(it.pos).toFixed(1)}%">
    <span class="c-pin" style="background:${it.col||"#1c2438"}"></span>
    <span class="c-nm">${esc(it.name)}</span>
  </span>`;
 }).join("");
 return `<div class="continuum">
  <div class="c-ends"><span>${esc(left)}</span><span>${esc(right)}</span></div>
  <div class="c-track">${dots}</div>
 </div>`;
}

/* All five scales for a pair, each annotated with its computed read. */
function pairSliders(an, reads){
 const A=an.A,B=an.B;
 const colA=DIMHEX[A.order[0]], colB=DIMHEX[B.order[0]];
 return an.continua.map((c,i)=>{
  return `<div class="slider-block">
   ${continuumHTML(c.left, c.right, [
     {name:A.name, pos:c.posA, col:colA},
     {name:B.name, pos:c.posB, col:colB}
   ])}
   <p class="gapnote">${esc(reads[i]||"")}</p>
  </div>`;
 }).join("");
}

/* Person against the family average, all five scales. */
function personSliders(p){
 const S=snap(p);
 const avgNets=netsOf(FACTS.avg);
 const avgPos={
  pace:clamp100(50+avgNets.pace/2),
  priority:clamp100(50+avgNets.pri/2),
  frank:clamp100(50+(FACTS.avg.D-FACTS.avg.S)/2),
  outgoing:clamp100(50+(FACTS.avg.I-FACTS.avg.C)/2),
  daring:clamp100(50+(FACTS.avg.D-FACTS.avg.C)/2)
 };
 const col=DIMHEX[S.order[0]];
 return CONTINUA_META.map(m=>{
  const gap=Math.round(Math.abs(S.pos[m.id]-avgPos[m.id]));
  const note=gap<8?"Right at the family's center here.":(S.pos[m.id]<avgPos[m.id]
    ? `${gap} points toward ${m.left.toLowerCase()} of the family average.`
    : `${gap} points toward ${m.right.toLowerCase()} of the family average.`);
  return `<div class="slider-block">
   ${continuumHTML(m.left, m.right, [
     {name:S.name, pos:S.pos[m.id], col:col},
     {name:"Family", pos:avgPos[m.id], col:FAM_DOT}
   ])}
   <p class="gapnote">${esc(note)}</p>
  </div>`;
 }).join("");
}

const STRIP_LABEL={
 twin:"answered identically — same “most,” same “least”",
 match:"same “most me” pick",
 anti:"same “least me” pick",
 clash:"one claimed what the other rejected",
 quiet:"no overlap"
};
function stripHTML(strip){
 if(!strip)return "";
 const counts={twin:0,match:0,anti:0,clash:0,quiet:0};
 strip.forEach(s=>counts[s]++);
 const cells=strip.map((s,i)=>`<span class="sc ${s}" title="Q${i+1}: ${esc(STRIP_LABEL[s])}"></span>`).join("");
 const leg=[
  counts.twin?`<span><span class="sc twin"></span> identical ×${counts.twin}</span>`:"",
  counts.match?`<span><span class="sc match"></span> same “most” ×${counts.match}</span>`:"",
  counts.anti?`<span><span class="sc anti"></span> same “least” ×${counts.anti}</span>`:"",
  counts.clash?`<span><span class="sc clash"></span> crossed ×${counts.clash}</span>`:"",
  counts.quiet?`<span><span class="sc quiet"></span> no overlap ×${counts.quiet}</span>`:""
 ].filter(Boolean).join("");
 return `<div class="stripwrap"><div class="strip">${cells}</div><div class="striplegend">${leg}</div></div>`;
}

function personCard(p, sel){
  const S=snap(p);
  const note=p.note?`<div class="hint">${esc(p.note.split(".")[0])}.</div>`:"";
  return `<button class="pcard ${sel?"sel":""}" data-id="${p.id}" type="button">
    <span class="letters">${chips(p.result)}</span>
    <span class="meta"><span class="nm">${esc(p.name)}</span>
    <span class="pn">${stags(S)}</span>
    <span class="pn">${esc(lettersLabel(p.result))} · ${esc(profileName(p))}</span>${note}</span>
  </button>`;
}

function matrixHTML(){
  const head=`<th></th>`+FAMILY.map(p=>`<th><div class="nm">${esc(p.name.split(" ")[0])}</div>${chips(p.result)}</th>`).join("");
  const rows=FAMILY.map(a=>{
    const cells=FAMILY.map(b=>{
      if(a.id===b.id)return `<td class="self">·</td>`;
      return `<td><a href="#/vs/${a.id}/${b.id}" title="${esc(a.name)} vs ${esc(b.name)}">${chips(b.result)}</a></td>`;
    }).join("");
    return `<tr><th class="nm">${esc(a.name.split(" ")[0])}</th>${cells}</tr>`;
  }).join("");
  return `<div class="matrixwrap"><table class="matrix"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>
  <p class="small">Tap a cell to open that pair.</p>`;
}

function bindScatterClicks(root){
  (root||app).querySelectorAll(".m2-dot[data-id]").forEach(btn=>{
    btn.addEventListener("click",()=>{ location.hash="#/p/"+btn.getAttribute("data-id"); });
  });
}

function renderHome(){
  const opts=FAMILY.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  const cl=familyClusters(FAMILY);
  const mapLine=[
    cl.fast.length?`${cl.fast.map(s=>s.name).join(" and ")} up top, moving fast`:"",
    cl.slow.length?`a patient majority below`:"",
    cl.center.length?`${cl.center.map(s=>s.name).join(" and ")} near the middle, flexing by the room`:""
  ].filter(Boolean).join(" · ");
  app.innerHTML=`${nav("home")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Family reading</p>
      <h1>${FAMILY.length} people, one instrument</h1>
      <p class="tag">Everyone answered the same 28 forced choices. This site reads the results side by side: who runs fast and who runs deep, what each person is protecting, and what your own answer sheets say about every pairing in the house. Tap anyone — or pick two.</p>
    </div>
    <div class="card">
      <h2>This house</h2>
      ${scatter2x2(FAMILY,{label:"Family map: pace by priority", compact:true})}
      <p class="small">Fast at the top, patient at the bottom. People to the left, the plan to the right.${mapLine?" "+esc(mapLine)+".":""}</p>
      <p><a href="#/family">Open the family page — maps, house numbers, every pairing</a></p>
    </div>
    <div class="card">
      <h2>Compare two people</h2>
      <div class="compare">
        <select id="c1">${opts}</select>
        <select id="c2">${opts}</select>
        <button class="btn" id="goVs" type="button">Go</button>
      </div>
      <button class="tog" id="togCmp" type="button">${compareOn?"Tap two cards, then they open as a pair. Cancel":"Or tap two cards to compare"}</button>
    </div>
    <div class="card">
      <h2>The family</h2>
      <div class="people" id="plist">${FAMILY.map(p=>personCard(p,picked.includes(p.id))).join("")}</div>
    </div>
    ${footNote()}
  </div>`;
  const c1=document.getElementById("c1"), c2=document.getElementById("c2");
  if(FAMILY[0]&&FAMILY[1]){c1.value=FAMILY[0].id;c2.value=FAMILY[1].id;}
  document.getElementById("goVs").onclick=()=>{
    if(c1.value&&c2.value&&c1.value!==c2.value)location.hash=`#/vs/${c1.value}/${c2.value}`;
  };
  document.getElementById("togCmp").onclick=()=>{compareOn=!compareOn;picked=[];renderHome();};
  document.getElementById("plist").onclick=e=>{
    const btn=e.target.closest(".pcard"); if(!btn)return;
    const id=btn.getAttribute("data-id");
    if(!compareOn){location.hash=`#/p/${id}`;return;}
    if(picked[0]===id){picked=[];renderHome();return;}
    picked.push(id);
    if(picked.length===2){const [a,b]=picked;picked=[];compareOn=false;location.hash=`#/vs/${a}/${b}`;return;}
    renderHome();
  };
  bindScatterClicks();
}

function originalReportFold(p){
  const r=p.result, pr=profileOf(p), dims=DIMS;
  const dimSecs=dims.map(d=>`<div class="dimhead"><span class="dot d${d}"></span>${d} · ${DIMNAMES[d]}: ${r.band[d]} (${r.N[d]})</div><p>${esc(DIMTEXT[d][r.band[d]])}</p>`).join("");
  let inner="";
  if(r.shape==="blend"&&pr){
    inner+=`<h3>Why two letters, not one</h3>
    <p>Together, ${[...r.key].join(" and ")} are the pair. A style only reaches 100 by taking every win, and an even two-style split tops out at 67 apiece. Two bars in the 60s is not a lukewarm result — it is the ceiling for a strong pair.</p>
    <p>The top two are <b>${r.gap} point${r.gap===1?"":"s"}</b> apart, inside the margin where a retake can swap which comes first. The pair is the result; the order shown is how they landed this sitting.</p>`;
  }
  if(r.shape==="balanced"){
    inner+=`<h3>What a flat result means</h3>
    <p>The four scores sit close enough together that naming a type would invent a difference the answers do not contain. That is a real result, not a failure. It usually means this person genuinely shifts approach to fit the situation instead of running one default.</p>`;
  }
  if(pr){
    inner+=`<h3>${esc(pr.name)}</h3><p>${esc(pr.sum)}</p>
    <h3>Strengths</h3><ul>${pr.str.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h3>Watch-outs</h3><ul>${pr.watch.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h3>Motivated by</h3><p>${esc(pr.mot)}</p>
    <h3>Drained by</h3><p>${esc(pr.dr)}</p>
    <h3>Under pressure</h3><p>${esc(pr.up)}</p>
    <h3>Working with ${esc(p.name)}</h3>
    <p class="small">The original do and don't lists, written for workplaces. Translate to the house as needed.</p>
    <h3 style="color:var(--green)">Do</h3><ul>${pr.comm.do.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h3 style="color:var(--red)">Don't</h3><ul>${pr.comm.dont.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h3>${esc(p.name)}, next to each style</h3>
    ${dims.map(d=>`<div class="dimhead"><span class="dot d${d}"></span>With a ${d} · ${esc(PROFILES[d].name.replace(/^The /,"the "))}</div><p>${esc(pr.pair[d])}</p>`).join("")}
    <h3>When the temperature rises</h3><p>${esc(pr.conflict)}</p>`;
  }
  inner+=`<h3>The four dimensions in ${esc(p.name)}</h3>${dimSecs}`;
  if(r.unspoken){
    inner+=`<h3>Neither reached for nor ruled out</h3>
    <p>${esc(UNSPOKEN_TEXT[r.unspoken])}</p>
    <p class="small">This describes the answer pattern — the ${DIMNAMES[r.unspoken]} options left untouched in both directions. It is not a prediction of crisis behavior.</p>`;
  }
  return `<div class="card"><details class="orig"><summary>From the original report</summary>
    <p class="small">Office-flavored source copy, kept for the profile names and the four-dimension write-ups. The read above is the home version.</p>
    ${inner}
  </details></div>`;
}

function listBlock(items){
  if(Array.isArray(items)&&items.length){
    return `<ul>${items.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`;
  }
  if(items) return `<p>${esc(items)}</p>`;
  return "";
}
function paras(arr){return (arr||[]).filter(Boolean).map(t=>`<p>${esc(t)}</p>`).join("")}

function personFamilyBits(p){
  const F = (typeof FACTS !== "undefined") ? FACTS : null;
  if(!F || !F.persons[p.id]) return {ranksRow:[], facts:[]};
  const me = F.persons[p.id];
  const ranksRow = ["D","I","S","C"].map(d=>({
    d, n: me.N[d],
    pos: me["rank"+d].pos, of: me["rank"+d].of, tied: me["rank"+d].tied
  }));
  const facts = [];
  if(me.nearest && me.furthest){
    facts.push("Closest profile to yours: "+me.nearest.name+", "+me.nearest.l1+" points away across the four scores. Farthest: "+me.furthest.name+", at "+me.furthest.l1+". The average distance between two people in this family is "+F.avgL1+".");
  }
  ranksRow.forEach(r=>{
    if(r.pos===1 && !r.tied && r.n>=50) facts.push("Your "+r.d+" is the highest in the family.");
  });
  return {ranksRow, facts};
}

function houseFacts(){
  const F = (typeof FACTS !== "undefined") ? FACTS : null;
  if(!F) return [];
  const out = [], n = F.familySize;
  const WORD = {D:"dominance",I:"influence",S:"steadiness",C:"conscientiousness"};
  const leads = ["D","I","S","C"].map(d=>({d, names:F.leadCounts[d]})).sort((a,b)=>b.names.length-a.names.length);
  const lead0 = leads[0];
  if(lead0 && lead0.names.length >= Math.ceil(n/2) && n >= 4){
    out.push(WORD[lead0.d].charAt(0).toUpperCase()+WORD[lead0.d].slice(1)+" is the house letter: "+lead0.names.length+" of the "+n+" people here lead with "+lead0.d+" ("+lead0.names.join(", ")+").");
  }
  const zeroLeads = leads.filter(l=>l.names.length===0);
  if(zeroLeads.length){
    out.push("Nobody in this family leads with "+zeroLeads.map(l=>l.d).join(" or ")+"."+(zeroLeads.some(l=>l.d==="D")?" Plenty of people here can push — nobody's wired to push first.":""));
  }
  out.push("The family's average profile is D "+F.avg.D+", I "+F.avg.I+", S "+F.avg.S+", C "+F.avg.C+".");
  if(F.closestPair && F.widestPair && F.nPairs >= 4){
    out.push("Closest pair: "+F.closestPair.aName+" and "+F.closestPair.bName+", "+F.closestPair.l1+" points apart. Widest: "+F.widestPair.aName+" and "+F.widestPair.bName+", at "+F.widestPair.l1+". Family average between any two people: "+F.avgL1+".");
  }
  if(F.mostMatched && F.nPairs >= 4){
    out.push("Most in-sync answer sheets: "+F.mostMatched.aName+" and "+F.mostMatched.bName+" picked the same “most me” answer on "+F.mostMatched.sameMost+" of 28 questions."+(F.mostInverted?" Most inverted: "+F.mostInverted.aName+" and "+F.mostInverted.bName+" — on "+F.mostInverted.clash+" questions, one claimed what the other rejected.":""));
  }
  if(F.unanimity && F.unanimity.length){
    const u = F.unanimity[0];
    out.push("The closest this family comes to unanimity: on one question, "+u.count+" of "+u.of+" people picked the same answer — the "+WORD[u.letter]+" option"+(u.dissenters.length?" (everyone but "+u.dissenters.join(" and ")+")":"")+".");
  }
  return out;
}

function pairSheet(a,b){
  const F = (typeof FACTS !== "undefined") ? FACTS : null;
  if(!F) return null;
  return F.pairs[F.pairKey(a.id,b.id)] || null;
}


function renderPerson(id){
  const p=byId(id); if(!p){location.hash="#/";return;}
  const r=p.result, home=personHome(p), S=home.snapshot, fam=personFamilyBits(p);
  const note=p.note?`<p class="note">${esc(p.note)}</p>`:"";
  const others=FAMILY.filter(x=>x.id!==p.id).map(x=>`<a href="#/vs/${p.id}/${x.id}">${esc(x.name)}</a>`).join("");
  const rankRow=fam.ranksRow.length?`<div class="rankrow">${fam.ranksRow.map(rr=>
    `<span class="rankchip"><span class="dot d${rr.d}"></span>${rr.d} ${rr.n} · ${ordinalStr(rr.pos)}${rr.tied?"=":""} of ${rr.of}</span>`).join("")}</div>`:"";
  const readParas=[home.stack].concat(home.letterParas||[],[home.table,home.plan,home.pressure]).filter(Boolean);
  app.innerHTML=`${nav("person")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">At home</p>
      <div class="stagrow">${stags(S)}</div>
      <h1>${esc(p.name)}</h1>
      <p class="tag">${esc(home.lede||"")}</p>
      <p class="tag">${esc(lettersLabel(r))} · D ${r.N.D} · I ${r.N.I} · S ${r.N.S} · C ${r.N.C}</p>
      ${note}
    </div>
    <div class="card">
      <h2>The read</h2>
      ${paras(readParas)}
    </div>
    <div class="card">
      <h2>Where you sit in this family</h2>
      ${rankRow}
      ${paras(fam.facts)}
      ${scatter2x2([p],{label:p.name+" on pace and priority"})}
      <p class="small">Fast at the top, patient at the bottom. People to the left, the plan to the right.</p>
    </div>
    <div class="card">
      <h2>The scales</h2>
      <p class="small">${esc(home.name)} against the family average, on all five.</p>
      ${personSliders(p)}
    </div>
    <div class="card"><h2>Four scores</h2>
      ${DIMS.map(d=>barRow(d,r.N[d],r.seg[d],r.band[d])).join("")}
      <p class="small">Scored against themself: every pick makes one style win and another lose, so the four always total about the same. A bar only reaches 100 by taking every single win; a strong two-style pair tops out in the 60s.</p>
    </div>
    ${p.intensity?`<div class="card"><h2>Intensity — nothing forced to lose</h2>
      ${DIMS.map(d=>intensityRow(d,p.intensity[d],likertVals(p.likert,d))).join("")}
      <p class="small">The six raw ratings per letter, 1 to 5. Unlike the forced choices, nothing here had to lose — so this is how much of each they claim, not which wins. Where this and the bars above disagree, that gap is usually the most interesting thing on the page.</p></div>`:""}
    <div class="card">
      <h2>Buttons</h2>
      <h3>What quietly drives ${esc(home.name)} crazy</h3>
      ${listBlock(home.hard)}
      <h3>What lights ${esc(home.name)} up</h3>
      ${listBlock(home.scenes)}
      <h3>Pointers</h3>
      ${listBlock(home.pointers)}
    </div>
    <div class="card">
      <h2>Living with ${esc(home.name)}</h2>
      ${listBlock(home.working)}
    </div>
    ${home.caveat?`<div class="card"><p class="small">${esc(home.caveat)}</p></div>`:""}
    ${originalReportFold(p)}
    <div class="card noprint"><h2>Compare ${esc(home.name)} with…</h2>
      <div class="linkrow">${others}</div>
      <a class="btn wide" href="${esc(p.report)}" target="_blank" rel="noopener">Full original report</a>
    </div>
    ${footNote(`<a href="#/">← Everyone</a> · `)}
  </div>`;
  bindScatterClicks();
}

function renderPair(idA,idB){
  const a=byId(idA), b=byId(idB);
  if(!a||!b||a.id===b.id){location.hash="#/";return;}
  const copy=pairCopy(a,b);
  const an=copy.analysis;
  const sheet=pairSheet(a,b);
  const movesA=(copy.pointersA||[]).map(t=>`<li>${esc(t)}</li>`).join("");
  const movesB=(copy.pointersB||[]).map(t=>`<li>${esc(t)}</li>`).join("");
  app.innerHTML=`${nav("pair")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Pairing</p>
      <h1>${esc(fname(a))} and ${esc(fname(b))}</h1>
      <p class="tag">${esc(copy.typeLabel||"")}</p>
      <p class="tag">${stags(an.A)} &nbsp;·&nbsp; ${stags(an.B)}</p>
    </div>
    <div class="card">
      <h2>Side by side</h2>
      <p>${esc(copy.lede||"")}</p>
      ${pairSliders(an, copy.scaleReads||[])}
    </div>
    <div class="card">
      <h2>How the two of you work</h2>
      ${paras(copy.working)}
    </div>
    ${sheet?`<div class="card">
      <h2>Your answers, side by side</h2>
      <p class="small">Same 28 questions, both answer sheets. Computed, not composed.</p>
      ${stripHTML(sheet.strip)}
      <p>Same “most me” on ${sheet.sameMost} of 28. Identical on ${sheet.identical}. Crossed (one claimed what the other rejected) on ${sheet.clash}. Distance across the four scores: ${sheet.l1}.</p>
    </div>`:""}
    <div class="card">
      <h2>Where you're alike</h2>
      ${paras(copy.similar)}
      ${copy.similarBlind?`<p>${esc(copy.similarBlind)}</p>`:""}
    </div>
    <div class="card">
      <h2>Where the wires cross</h2>
      ${paras(copy.rubs)}
      <div class="callout blue"><p><b>${esc(fname(a))} → ${esc(fname(b))}.</b> ${esc(copy.tipAB||"")}</p></div>
      <div class="callout"><p><b>${esc(fname(b))} → ${esc(fname(a))}.</b> ${esc(copy.tipBA||"")}</p></div>
    </div>
    <div class="card">
      <h2>What you give each other</h2>
      <p>${esc(copy.bringsA||"")}</p>
      <p>${esc(copy.bringsB||"")}</p>
      ${paras(copy.atHome)}
    </div>
    <div class="card">
      <h2>One move each</h2>
      <div class="callout blue"><p><b>${esc(fname(a))}.</b></p><ul>${movesA}</ul></div>
      <div class="callout"><p><b>${esc(fname(b))}.</b></p><ul>${movesB}</ul></div>
    </div>
    <div class="card">
      <h2>Talk · decide · spend time</h2>
      <h3>Talk</h3>${listBlock(copy.talk)}
      <h3>Decide</h3>${listBlock(copy.decide)}
      <h3>Spend time</h3>${listBlock(copy.spendTime)}
    </div>
    ${copy.caveat?`<div class="card"><p class="small">${esc(copy.caveat)}</p></div>`:""}
    <div class="card">
      <h2>Both on the map</h2>
      ${scatter2x2([a,b],{label:fname(a)+" and "+fname(b)+" on pace and priority"})}
      <p class="small">Distance here is the weekly translation work. Sitting close means the remaining differences live in the letters, not the axes.</p>
    </div>
    <div class="card">
      <h2>Letter map and scores</h2>
      ${wheelSVG([a,b],{label:fname(a)+" and "+fname(b)+" on the DISC map"})}
      <div class="pairbars">
        <div class="minibars"><h3>${esc(a.name)}</h3>${DIMS.map(d=>barRow(d,a.result.N[d],a.result.seg[d],a.result.band[d])).join("")}</div>
        <div class="minibars"><h3>${esc(b.name)}</h3>${DIMS.map(d=>barRow(d,b.result.N[d],b.result.seg[d],b.result.band[d])).join("")}</div>
      </div>
    </div>
    <div class="card">
      <a class="btn wide sec" href="#/p/${a.id}">${esc(a.name)} at home</a>
      <a class="btn wide sec" href="#/p/${b.id}">${esc(b.name)} at home</a>
    </div>
    ${footNote(`<a href="#/">← Everyone</a> · <a href="#/vs/${b.id}/${a.id}">Swap order</a> · `)}
  </div>`;
  bindScatterClicks();
}

function renderFamily(){
  const cl=familyClusters(FAMILY);
  const house=houseFacts();
  const clusterLines=[];
  if(cl.fast.length)clusterLines.push("Running fast: "+cl.fast.map(s=>s.name).join(", ")+".");
  if(cl.slowTask.length)clusterLines.push("Patient, watching the plan: "+cl.slowTask.map(s=>s.name).join(", ")+".");
  if(cl.slowPeople.length)clusterLines.push("Patient, watching the people: "+cl.slowPeople.map(s=>s.name).join(", ")+".");
  const slowOther=cl.slow.filter(s=>!cl.slowTask.includes(s)&&!cl.slowPeople.includes(s));
  if(slowOther.length)clusterLines.push("Patient, watching both: "+slowOther.map(s=>s.name).join(", ")+".");
  if(cl.center.length)clusterLines.push("Near the middle of both axes, flexing by the room: "+cl.center.map(s=>s.name).join(", ")+".");
  app.innerHTML=`${nav("family")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Family map</p>
      <h1>The whole house at once</h1>
      <p class="tag">Everyone on the same two axes, then the numbers the answer sheets produce when you put all of them side by side.</p>
    </div>
    <div class="card">
      <h2>Pace × priority</h2>
      ${scatter2x2(FAMILY,{label:"Family 2x2: pace by priority"})}
      <p class="small">Tap a name for their page. Fast at the top; people to the left.</p>
    </div>
    ${house.length?`<div class="card">
      <h2>House numbers</h2>
      <p class="small">Computed from the answer sheets. These update themselves as people are added.</p>
      ${listBlock(house)}
    </div>`:""}
    <div class="card">
      <h2>Who clusters where</h2>
      ${paras(clusterLines)}
      <p>What that mix does: plans in this house get a runway by default, and the fast wiring is usually three moves ahead of the room's consensus. Inside the patient majority, a stalled plan usually means two different things are being checked at once — whether it works, and whether everyone's genuinely in. Both checks end faster when someone names them out loud.</p>
    </div>
    <div class="card">
      <h2>All vs all</h2>
      ${matrixHTML()}
    </div>
    ${footNote(`<a href="#/">← Everyone</a> · `)}
  </div>`;
  bindScatterClicks();
}

function renderMethod(){
  const notes=PEOPLE.filter(p=>p.note).map(p=>`<li><b>${esc(p.name)}:</b> ${esc(p.note)}</li>`).join("");
  app.innerHTML=`${nav("method")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Methodology</p>
      <h1>How the numbers work</h1>
      <p class="tag">Everything this site claims traces back to one of the mechanisms on this page. No line of copy outranks the data underneath it.</p>
    </div>
    <div class="card">
      <h2>The instrument</h2>
      <p>Everyone answered the same 28 forced-choice questions. Each question offers four statements — one flavored toward each of D (${esc(LEGEND.D)}), I (${esc(LEGEND.I)}), S (${esc(LEGEND.S)}), and C (${esc(LEGEND.C)}) — and demands two picks: <b>most like me</b> and <b>least like me</b>. You cannot flatter every option. Every answer is a trade.</p>
      <p>Scoring follows the classic method: +2 to the letter picked "most," −1 to the letter picked "least," summed over 28 questions and rescaled to a 0–100 range. Band cutoffs: <b>Low</b> below 36, <b>Moderate</b> 36–64, <b>High</b> 65 and up.</p>
      <p>Because every point one letter gains is a point another letter forfeits, the four scores are <b>relative to the person, not to other people</b>. This is called ipsative measurement, and it has two consequences worth understanding. First, the four bars always total roughly the same, so a bar only approaches 100 by winning nearly every question — two bars in the 60s is the ceiling for a strong pair, not a lukewarm result. Second, two people with the same profile shape can differ enormously in raw intensity; the shape says which of your own gears wins, not how big the engine is.</p>
    </div>
    <div class="card">
      <h2>Shapes: primary, blend, balanced</h2>
      <p>A single style is named only when the top score clears the second by at least ${PRIMARY_GAP} points. Closer than that, the pair is the honest result (a "blend"), and the order the two landed in this sitting is within retake noise. If all four scores fit inside a ${BALANCED_SPREAD}-point spread, no style is named at all — a "balanced" shape. That is a real finding, not a shrug: it means the instrument pushed 28 times and could not find a consistent favorite, which is what genuine situational range looks like in the data.</p>
    </div>
    <div class="card">
      <h2>The intensity ratings</h2>
      <p>Some people also completed 24 free-standing statements, rated 1–5, six per letter. This is the opposite kind of measurement: nothing is forced to lose, so it captures <b>how much</b> of each style a person claims rather than <b>which wins</b> a trade. When the forced choices and the free ratings agree, the picture is confirmed from two directions. When they disagree — the trade-off test crowns one letter while the free ratings crown another — you are usually looking at the difference between how someone operates in public trade-offs and how they see themselves when nothing has to be sacrificed. The site flags those gaps deliberately; they are among the most informative numbers here.</p>
    </div>
    <div class="card">
      <h2>The five scales</h2>
      <p>The site's scales are simple, transparent arithmetic on the four scores — nothing hidden:</p>
      <ul>
        <li><b>Patient vs Driven</b> (pace): (D + I) − (S + C). How soon a decision feels real.</li>
        <li><b>The people in the room vs The plan</b> (priority): (D + C) − (I + S). What gets protected first. Note that a people-lean can arrive two ways — through I (energy and company) or through S (care and keeping the group whole) — and the copy keeps them distinct, because they are.</li>
        <li><b>Tactful vs Frank</b>: D − S. Whether the first draft of a sentence gets softened.</li>
        <li><b>Private vs Outgoing</b>: I − C. How much thinking happens out loud.</li>
        <li><b>Careful vs Daring</b>: D − C. The appetite for acting before everything is verified.</li>
      </ul>
      <p>A gap under about 10 points on a scale is agreement; past about 25 it shapes actual evenings.</p>
    </div>
    <div class="card">
      <h2>The answer-sheet comparisons</h2>
      <p>Because everyone sat the identical questions, two people's sheets can be laid row against row — that is what the pair pages' receipts are. The definitions:</p>
      <ul>
        <li><b>Same "most":</b> both picked the same statement as most-like-me on that question.</li>
        <li><b>Identical:</b> same "most" and same "least" — the full answer matched.</li>
        <li><b>Crossed:</b> one person's "most me" statement is the very one the other marked "least me." The purest unit of built-in mistranslation the data can measure.</li>
      </ul>
      <p>Distance between two people is the sum of their four score gaps — |ΔD| + |ΔI| + |ΔS| + |ΔC| — used for "closest pair," "farthest," and the family average. Rankings recompute automatically as people are added.</p>
    </div>
    <div class="card">
      <h2>Care checks</h2>
      <p>Four of the 28 questions appear twice in different clothing. Matching picks on those twins indicate a consistent read; scattered picks indicate either a hurried sitting or — specifically for balanced shapes — answers that genuinely track situations rather than a fixed default. The site only cites this signal where the shape supports the interpretation.</p>
    </div>
    <div class="card">
      <h2>What this cannot tell you</h2>
      <p>One sitting of a self-report questionnaire measures how a person sorted 28 trade-offs on one day. It does not measure intelligence, character, effort, or love. It will not predict any particular Tuesday, and a strong pattern is still a pattern — everyone here has overridden their own wiring a thousand times for someone they care about, which is a fact about them the instrument cannot see. Read every page with that in your pocket. This is a mirror and a translation guide, not a verdict.</p>
    </div>
    ${notes?`<div class="card"><h2>Data notes</h2><ul>${notes}</ul></div>`:""}
    <div class="card">
      <h2>Adding or updating a person</h2>
      <p>Everything on this site derives live from the answer codes in <b>people.js</b>. Adding a person's code adds their page, every pairing with them, and re-ranks every family fact automatically. The hand-written reads are keyed by person; a new person gets a generated read until one is written. Details in the repo's README.</p>
    </div>
    ${footNote(`<a href="#/">← Everyone</a> · `)}
  </div>`;
}

function route(){
  const raw=(location.hash||"#/").replace(/^#/,"");
  const parts=raw.split("/").filter(Boolean);
  try{window.scrollTo(0,0)}catch(e){}
  try{
    if(parts.length===0){compareOn=false;picked=[];renderHome();return;}
    if(parts[0]==="p"&&parts[1]){renderPerson(parts[1].toLowerCase());return;}
    if(parts[0]==="vs"&&parts[1]&&parts[2]){renderPair(parts[1].toLowerCase(),parts[2].toLowerCase());return;}
    if(parts[0]==="family"){renderFamily();return;}
    if(parts[0]==="method"){renderMethod();return;}
    renderHome();
  }catch(err){
    console.error("Family DISC render failed", err);
    app.innerHTML=`${nav("home")}<div class="wrap"><div class="card"><h2>Could not open that page</h2><p class="err">${esc(err&&err.message||err)}</p><p><a href="#/">Back to everyone</a></p></div></div>`;
  }
}
window.addEventListener("hashchange",route);
route();
