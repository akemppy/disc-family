/* Family DISC app. Scores computed from share codes. Copy from disc-copy.js.
   Comparison math and family copy live in compare.js. Do not change scoring math. */
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
function firstSentence(t){
 const m=String(t).match(/^.+?[.](?=\s|$)/);
 return m?m[0]:t;
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

function nav(page){
 return `<header class="top">
  <a class="brand" href="#/">Family DISC</a>
  <nav>
    <a href="#/" class="${page==="home"?"on":""}">Home</a>
    <a href="#/family" class="${page==="family"?"on":""}">Family</a>
  </nav>
 </header>`;
}

function barRow(d,n,segv,bandv){
 const pct=Math.max(n,4);
 return `<div class="bar"><div class="lbl"><span class="dot d${d}"></span>${d} · ${DIMNAMES[d]}</div>
  <div class="track"><div class="fill c${d}-bg" style="width:${pct}%">${n}</div></div>
  <div class="band">${bandv} · seg ${segv}</div></div>`;
}
function intensityRow(d,v){
 const pct=Math.max(Math.round((v-1)/4*100),8);
 return `<div class="bar"><div class="lbl"><span class="dot d${d}"></span>${d} · ${DIMNAMES[d]}</div>
  <div class="track"><div class="fill c${d}-bg" style="width:${pct}%">${v.toFixed(1)}</div></div>
  <div class="band">of 5</div></div>`;
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
   <span class="m2-axis m2-e">The work</span>
   <span class="m2-cross-h"></span>
   <span class="m2-cross-v"></span>
   <span class="m2-q tl">fast · people</span>
   <span class="m2-q tr">fast · work</span>
   <span class="m2-q bl">patient · people</span>
   <span class="m2-q br">patient · work</span>
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

function dualSliders(A, B, largerGap){
 const colA=DIMHEX[A.order[0]], colB=DIMHEX[B.order[0]];
 const paceNote=largerGap==="pace"?"Bigger gap: pace":(largerGap==="priority"?"":"Gaps about even");
 const priNote=largerGap==="priority"?"Bigger gap: people vs the work":(largerGap==="pace"?"":"Gaps about even");
 return `<div class="sliders">
  <div class="slider-block">
   <h3>Pace</h3>
   ${continuumHTML("Patient", "Driven", [
     {name:A.name, pos:A.pos.pace, col:colA},
     {name:B.name, pos:B.pos.pace, col:colB}
   ])}
   <p class="gapnote">${esc(A.name)} ${esc(A.paceW.short)} · ${esc(B.name)} ${esc(B.paceW.short)}${paceNote?" · "+paceNote:""}</p>
  </div>
  <div class="slider-block">
   <h3>Priority</h3>
   ${continuumHTML("The people in the room", "The work", [
     {name:A.name, pos:A.pos.priority, col:colA},
     {name:B.name, pos:B.pos.priority, col:colB}
   ])}
   <p class="gapnote">${esc(A.name)} ${esc(A.priW.short)} · ${esc(B.name)} ${esc(B.priW.short)}${priNote?" · "+priNote:""}</p>
  </div>
 </div>`;
}

function continuaBlock(an){
 const {A,B,topContinua}=an;
 const skip=new Set(["pace","priority"]);
 const extra=topContinua.filter(c=>!skip.has(c.id) && c.gap>=TINY_CONT);
 const show=topContinua.filter(c=>c.always || extra.some(e=>e.id===c.id));
 const colA=DIMHEX[A.order[0]], colB=DIMHEX[B.order[0]];
 return show.map(c=>{
  const tiny=c.gap<TINY_CONT?`<p class="gapnote">Small gap. Shared more than not.</p>`:`<p class="gapnote">Gap ${Math.round(c.gap)} points.</p>`;
  return `<div class="slider-block">
   ${continuumHTML(c.left, c.right, [
     {name:A.name, pos:c.posA, col:colA},
     {name:B.name, pos:c.posB, col:colB}
   ])}
   ${tiny}
  </div>`;
 }).join("");
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
  <p class="small">Tap a cell for that pair. Row is the first name on the page, column is the second.</p>`;
}

function bindScatterClicks(root){
  (root||app).querySelectorAll(".m2-dot[data-id]").forEach(btn=>{
    btn.addEventListener("click",()=>{ location.hash="#/p/"+btn.getAttribute("data-id"); });
  });
}

function renderHome(){
  const opts=FAMILY.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  app.innerHTML=`${nav("home")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Family reading</p>
      <h1>Pace, and people vs the work</h1>
      <p class="tag">Not the letter on the badge. Two sliders: how fast you move, and whether you protect the room or the plan. Tap anyone. Pick two to compare.</p>
    </div>
    <div class="card">
      <h2>This house</h2>
      ${scatter2x2(FAMILY,{label:"Family map: pace by priority", compact:true})}
      <p class="small">Fast at the top, patient at the bottom. People to the left, the work to the right. One clearly fast person. A patient majority, split between the room and the plan.</p>
      <p><a href="#/family">Open the family map</a></p>
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
    <p class="footer">DISC is a behavioral style model. First names only. Not for hiring. Not a clinical instrument.</p>
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

function methodFold(){
  return `<div class="card"><details class="method"><summary>How the scoring works</summary>
  <p class="small">D = ${esc(LEGEND.D)} · I = ${esc(LEGEND.I)} · S = ${esc(LEGEND.S)} · C = ${esc(LEGEND.C)}</p>
  <p class="small"><b>Method:</b> 28 forced-choice situations, scored most/least (+2 / -1) on the classic DISC method. Because every item forces a trade-off, the four scores are <b>relative to each other, not to other people</b>. Two people with opposite energy levels can produce the same profile if they rank the four the same way. There is no population norm behind these numbers. The optional intensity ratings are the opposite kind of measure (statements rated 1-5 with no trade-off), which is why they can say "how much" while the ranking says "which wins." Band cutoffs: Low below 36, Moderate 36-64, High 65 and up. A single style is named only when the top two scores are at least ${PRIMARY_GAP} points apart. Below that, the pair is the result. If all four sit within ${BALANCED_SPREAD} points, no style is named.</p>
  <p class="small"><b>The two sliders:</b> Pace is (D+I) minus (S+C). Positive is fast. Priority is (D+C) minus (I+S). Positive is the work, negative is the people in the room. Near even means the net sits inside 20 points. Friction between two people is mostly the gap on those sliders, even when the primary letters match.</p>
  <p class="small"><b>How far to trust it:</b> treat this as a conversation starter rather than a measurement. Reliability here has been checked by simulation only.</p>
  </details>
  <p class="small" style="margin-top:10px"><b>Disclaimer:</b> a self-awareness and communication tool based on the DISC behavioral model. Not a clinical instrument. Not for hiring, promotion, or medical decisions.</p></div>`;
}

function originalReportFold(p){
  const r=p.result, pr=profileOf(p), dims=DIMS;
  const dimSecs=dims.map(d=>`<div class="dimhead"><span class="dot d${d}"></span>${d} · ${DIMNAMES[d]}: ${r.band[d]} (${r.N[d]})</div><p>${esc(DIMTEXT[d][r.band[d]])}</p>`).join("");
  let inner="";
  if(r.shape==="blend"&&pr){
    inner+=`<h3>Why two letters, not one</h3>
    <p>Together, ${[...r.key].join(" and ")} are the pair. A style only reaches 100 by taking every win, and an even two-style split tops out at 67 apiece. Two bars in the 60s is not a lukewarm result, it is the ceiling for a strong pair.</p>
    <p>The top two are <b>${r.gap} point${r.gap===1?"":"s"}</b> apart, inside the margin where a retake can swap which comes first. The pair is the result. The order shown is how they landed this sitting.</p>`;
  }
  if(r.shape==="balanced"){
    inner+=`<h3>What a flat result means</h3>
    <p>The four scores sit close enough together that naming a type would be inventing a difference the answers do not contain. That is a real result, not a failure. It usually means this person genuinely shifts approach to fit the situation instead of running one default. Read the four dimension write-ups rather than looking for a label.</p>`;
  }
  if(pr){
    inner+=`<h3>${esc(pr.name)}</h3><p>${esc(pr.sum)}</p>
    <h3>Strengths</h3><ul>${pr.str.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h3>Watch-outs</h3><ul>${pr.watch.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h3>Motivated by</h3><p>${esc(pr.mot)}</p>
    <h3>Drained by</h3><p>${esc(pr.dr)}</p>
    <h3>Under pressure</h3><p>${esc(pr.up)}</p>
    <h3>Working with ${esc(p.name)}</h3>
    <p class="small">Original do and don't lists, written for workrooms. Translate them to the house.</p>
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
    <p class="small">This describes the answer pattern, the ${DIMNAMES[r.unspoken]} options left untouched in both directions. It is not a prediction of crisis behavior.</p>`;
  }
  return `<div class="card"><details class="orig"><summary>From the original report</summary>
    <p class="small">Office-flavored source copy, kept for the profile names and the four-dimension write-ups. The lead above is the home reading.</p>
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

function renderPerson(id){
  const p=byId(id); if(!p){location.hash="#/";return;}
  const r=p.result, home=personHome(p), S=home.snapshot;
  const note=p.note?`<p class="note">${esc(p.note)}</p>`:"";
  const others=FAMILY.filter(x=>x.id!==p.id).map(x=>`<a href="#/vs/${p.id}/${x.id}">${esc(x.name)}</a>`).join("");
  const stack=home.stack?`<p>${esc(home.stack)}</p>`:"";
  const ptrs=(home.pointers&&home.pointers.length)?`<h3>Living with ${esc(home.name)}</h3>${listBlock(home.pointers)}`:"";
  const working=(home.working&&home.working.length)?`<h3>When it is working</h3>${paras(home.working)}`:"";
  const scenes=(home.scenes&&home.scenes.length)?paras(home.scenes):"";
  const hard=(home.hard&&home.hard.length)?`<h3>When it is hard</h3>${paras(home.hard)}`:"";
  const letters=(home.letterParas&&home.letterParas.length)?`<h3>The letters</h3>${paras(home.letterParas)}`:"";
  app.innerHTML=`${nav("person")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">At home</p>
      <div class="stagrow">${stags(S)}</div>
      <h1>${esc(p.name)}</h1>
      <p class="tag">${esc(lettersLabel(r))} · D ${r.N.D} · I ${r.N.I} · S ${r.N.S} · C ${r.N.C}</p>
      ${note}
    </div>
    <div class="card">
      <h2>At home</h2>
      <p>${esc(home.lede)}</p>
      <p class="small">${esc(home.caveat||"A reading of the scores, not a script for Tuesday.")}</p>
      ${stack}
      ${working}
      ${scenes}
      <p>${esc(home.table)}</p>
      <p>${esc(home.plan)}</p>
      <p>${esc(home.pressure)}</p>
      ${hard}
      ${letters}
      ${ptrs}
    </div>
    <div class="card">
      <h2>On the family map</h2>
      ${scatter2x2([p],{label:p.name+" on pace and priority"})}
      <p class="small">Fast at the top, patient at the bottom. People to the left, the work to the right.</p>
    </div>
    <div class="card"><h2>Four scores</h2>
      ${DIMS.map(d=>barRow(d,r.N[d],r.seg[d],r.band[d])).join("")}
      <p class="small">Ranked against themself: every pick one style wins, another loses, so the four always total about the same. A bar only reaches 100 by taking every single win. A strong two-style pair tops out in the 60s.</p>
    </div>
    ${p.intensity?`<div class="card"><h2>Intensity (nothing forced to lose)</h2>
      ${DIMS.map(d=>intensityRow(d,p.intensity[d])).join("")}
      <p class="small">From the extra ratings, where nothing had to lose: how much of each they report having, not compared to anyone else.</p></div>`:""}
    ${originalReportFold(p)}
    ${methodFold()}
    <div class="card noprint"><h2>Compare with ${esc(p.name)}</h2>
      <div class="linkrow">${others}</div>
      <a class="btn wide" href="${esc(p.report)}" target="_blank" rel="noopener">Full original report</a>
    </div>
    <p class="footer"><a href="#/">← Everyone</a></p>
  </div>`;
}

function renderPair(idA,idB){
  const a=byId(idA), b=byId(idB);
  if(!a||!b||a.id===b.id){location.hash="#/";return;}
  const copy=pairCopy(a,b);
  const an=copy.analysis;
  const extraA=(copy.pointersA&&copy.pointersA.length)?`<h3>${esc(fname(a))} toward ${esc(fname(b))}</h3>${listBlock(copy.pointersA)}`:"";
  const extraB=(copy.pointersB&&copy.pointersB.length)?`<h3>${esc(fname(b))} toward ${esc(fname(a))}</h3>${listBlock(copy.pointersB)}`:"";
  app.innerHTML=`${nav("pair")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Pairing</p>
      <h1>${esc(fname(a))} and ${esc(fname(b))}</h1>
      <p class="tag">${stags(an.A)} &nbsp; with &nbsp; ${stags(an.B)}</p>
      <p class="tag">${esc(copy.typeLabel)}</p>
    </div>
    <div class="card">
      <h2>Pace and priority</h2>
      <p>${esc(copy.lede)}</p>
      ${dualSliders(an.A, an.B, an.largerGap)}
      <p class="small">${esc(copy.caveat||"A reading of the scores, not a script for Tuesday.")}</p>
    </div>
    <div class="card">
      <h2>Comparison continua</h2>
      <p class="small">Scales first. Pace and people vs the work always show. Tiny leftover lines are skipped.</p>
      ${continuaBlock(an)}
      ${paras(copy.scaleReads)}
    </div>
    <div class="card">
      <h2>Both on the map</h2>
      ${scatter2x2([a,b],{label:fname(a)+" and "+fname(b)+" on pace and priority"})}
      <p class="small">Same two sliders as the family map. Distance is the weekly translation work. Sitting on top of each other means the leftover letter still needs a name.</p>
    </div>
    <div class="card">
      <h2>Where you are similar</h2>
      ${paras(copy.similar)}
      <div class="callout"><p><b>Shared blind spot.</b> ${esc(copy.similarBlind)}</p></div>
    </div>
    ${(copy.working&&copy.working.length)?`<div class="card">
      <h2>When you two work</h2>
      ${paras(copy.working)}
    </div>`:""}
    <div class="card">
      <h2>Where it rubs</h2>
      ${paras(copy.rubs)}
      <h3>What each brings</h3>
      <p>${esc(copy.bringsA)}</p>
      <p>${esc(copy.bringsB)}</p>
      <h3>How this shows up at home</h3>
      ${paras(copy.atHome)}
      
    </div>
    <div class="card">
      <h2>How to talk, how to decide, how to spend time</h2>
      <h3>How to talk</h3>
      ${listBlock(copy.talk)}
      <h3>How to decide</h3>
      ${listBlock(copy.decide)}
      <h3>How to spend time</h3>
      ${listBlock(copy.spendTime)}
    </div>
    <div class="card">
      <h2>One tip each way</h2>
      <div class="callout blue"><p><b>${esc(fname(a))} → ${esc(fname(b))}.</b> ${esc(copy.tipAB)}</p></div>
      <div class="callout"><p><b>${esc(fname(b))} → ${esc(fname(a))}.</b> ${esc(copy.tipBA)}</p></div>
      ${extraA}${extraB}
    </div>
    <div class="card">
      <h2>Letter map and scores</h2>
      ${wheelSVG([a,b],{label:fname(a)+" and "+fname(b)+" on the DISC map"})}
      <p class="small">The letter wheel is the source scores. The two sliders above are what actually predict the week.</p>
      <div class="pairbars">
        <div class="minibars"><h3>${esc(a.name)}</h3>${DIMS.map(d=>barRow(d,a.result.N[d],a.result.seg[d],a.result.band[d])).join("")}</div>
        <div class="minibars"><h3>${esc(b.name)}</h3>${DIMS.map(d=>barRow(d,b.result.N[d],b.result.seg[d],b.result.band[d])).join("")}</div>
      </div>
    </div>
    <div class="card">
      <a class="btn wide sec" href="#/p/${a.id}">${esc(a.name)} at home</a>
      <a class="btn wide sec" href="#/p/${b.id}">${esc(b.name)} at home</a>
    </div>
    <p class="footer"><a href="#/">← Everyone</a> · <a href="#/vs/${b.id}/${a.id}">Swap order</a></p>
  </div>`;
  bindScatterClicks();
}

function namesList(arr){
  if(!arr.length) return "none";
  return arr.map(s=>s.name).join(", ");
}

function renderFamily(){
  const cl=familyClusters(FAMILY);
  const house=[
    "This house is a patient majority with one clearly fast person, and a split inside the patient group about what patience is for: the work, or the people in the room.",
    "Patient and on the work: "+namesList(cl.slowTask)+". Patient and on the people: "+namesList(cl.slowPeople)+(cl.slowEven.length ? ", with "+namesList(cl.slowEven)+" nearby (patient, mixed on priority)" : "")+". Near the middle of both sliders: "+namesList(cl.center)+". Clearly fast: "+namesList(cl.fast)+".",
    "What this house tends to do: plans get a runway. The fast wiring is often already down the road while everyone else is still checking who is coming. Inside the patient group, a holiday can stall for two different reasons at once. Someone wants it right. Someone wants everyone ok.",
    "The gift in this house is that it gets both a starter and a runway. Fast wiring can name a night. Patient wiring can hold the room and check the plan. The stall is real. So is the range.",
    "A pace gap here looks like already decided versus buy-in. A priority gap looks like the work versus who is in the room. Every pair on this site is those sliders plus the leftover blend."
  ];
  app.innerHTML=`${nav("family")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Family map</p>
      <h1>Everyone on two sliders</h1>
      <p class="tag">Fast vs patient. The work vs the people in the room. Same map for every pairing.</p>
    </div>
    <div class="card">
      <h2>Pace × priority</h2>
      ${scatter2x2(FAMILY,{label:"Family 2x2: pace by priority"})}
      <p class="small">Tap a name for their page. Fast at the top. People to the left.</p>
    </div>
    <div class="card">
      <h2>Clusters</h2>
      ${house.slice(0,2).map(t=>`<p>${esc(t)}</p>`).join("")}
    </div>
    <div class="card">
      <h2>What this house tends to do</h2>
      ${house.slice(2).map(t=>`<p>${esc(t)}</p>`).join("")}
    </div>
    <div class="card">
      <h2>All vs all</h2>
      ${matrixHTML()}
    </div>
    <p class="footer"><a href="#/">← Everyone</a></p>
  </div>`;
  bindScatterClicks();
}

function route(){
  const raw=(location.hash||"#/").replace(/^#/,"");
  const parts=raw.split("/").filter(Boolean);
  try{window.scrollTo(0,0)}catch(e){}
  if(parts.length===0){compareOn=false;picked=[];renderHome();return;}
  if(parts[0]==="p"&&parts[1]){renderPerson(parts[1].toLowerCase());return;}
  if(parts[0]==="vs"&&parts[1]&&parts[2]){renderPair(parts[1].toLowerCase(),parts[2].toLowerCase());return;}
  if(parts[0]==="family"){renderFamily();return;}
  renderHome();
}
window.addEventListener("hashchange",route);
route();
