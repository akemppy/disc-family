/* Family DISC app. Scores computed from share codes. Copy from disc-copy.js. */
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
function lettersLabel(r){
 if(r.shape==="balanced")return "mix";
 if(r.shape==="primary")return r.key;
 const dk=[...r.key].sort((a,b)=>r.N[b]-r.N[a]||PREC[a]-PREC[b]);
 return dk[0]+"+"+dk[1];
}
function chips(r){
 if(r.shape==="balanced")return `<span class="chip mix">mix</span>`;
 if(r.shape==="primary")return `<span class="chip ${r.key}">${r.key}</span>`;
 const dk=[...r.key].sort((a,b)=>r.N[b]-r.N[a]||PREC[a]-PREC[b]);
 return dk.map(d=>`<span class="chip ${d}">${d}</span>`).join("");
}
function profileName(p){
 const pr=profileOf(p);
 if(pr)return pr.name;
 return "No single style";
}
function profileTag(p){
 const pr=profileOf(p);
 if(pr)return pr.tag;
 return "All four scores sit close together.";
}
function activeLetters(p){
 const r=p.result;
 if(r.shape==="primary")return [r.key];
 if(r.shape==="blend")return [...r.key].sort((a,b)=>r.N[b]-r.N[a]||PREC[a]-PREC[b]);
 return ranked(r).slice(0,2);
}
function firstSentence(t){
 const m=String(t).match(/^.+?[.](?=\s|$)/);
 return m?m[0]:t;
}
function asPerson(text,name){
 if(!text)return "";
 let t=String(text);
 t=t.replace(/\byou'll\b/g,name+" will");
 t=t.replace(/\bYou'll\b/g,name+" will");
 t=t.replace(/\bYou'd\b/g,name+" would");
 t=t.replace(/\byou'd\b/g,name+" would");
 t=t.replace(/\bYou're\b/g,name+" is");
 t=t.replace(/\byou're\b/g,name+" is");
 t=t.replace(/\bYou've\b/g,name+" has");
 t=t.replace(/\byou've\b/g,name+" has");
 t=t.replace(/\bYour\b/g,name+"'s");
 t=t.replace(/\byour\b/g,name+"'s");
 t=t.replace(/\bYou\b/g,name);
 t=t.replace(/\byou\b/g,name);
 return t;
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

function clusterNote(){
 const groups={};
 FAMILY.forEach(p=>{
  const k=p.result.shape==="balanced"?"mix":p.result.key;
  (groups[k]=groups[k]||[]).push(p.name);
 });
 const sc=(groups.SC||[]).length, s=(groups.S||[]).length;
 const di=(groups.DI||[]).length, dc=(groups.DC||[]).length, mix=(groups.mix||[]).length;
 const steady=sc+s, drive=di+dc;
 return `<p>Nine people. <b>${steady} sit on the steady side</b> (S or SC). <b>${drive} bring drive</b> (DI or DC). ${mix} ${mix===1?"is":"are"} balanced across all four.</p>
  <p class="small">${Object.keys(groups).sort().map(k=>`<b>${k}</b>: ${groups[k].join(", ")}`).join(". ")}.</p>`;
}

function personCard(p, sel){
  const note=p.note?`<div class="hint">${esc(p.note.split(".")[0])}.</div>`:"";
  return `<button class="pcard ${sel?"sel":""}" data-id="${p.id}" type="button">
    <span class="letters">${chips(p.result)}</span>
    <span class="meta"><span class="nm">${esc(p.name)}</span>
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
  <p class="small">Tap a cell for that pair. Row is the first name on the page, column is the second. Both directions are on every pair page.</p>`;
}

function renderHome(){
  const opts=FAMILY.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  app.innerHTML=`${nav("home")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Family comparison</p>
      <h1>Everyone on one screen</h1>
      <p class="tag">Tap a person for the full report. Pick two to see how they land on each other.</p>
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
    <div class="card">
      <h2>Family map</h2>
      ${wheelSVG(FAMILY,{label:"All nine people on the DISC map"})}
      <p class="small">Direction is the style they lean toward. Distance from center is how strongly that lean won. Edge means one style ran the table. Center means the picks spread out.</p>
      ${clusterNote()}
    </div>
    <div class="card">
      <h2>All vs all</h2>
      ${matrixHTML()}
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
}

function methodFold(){
  return `<div class="card"><details class="method"><summary>How the scoring works</summary>
  <p class="small">D = ${esc(LEGEND.D)} · I = ${esc(LEGEND.I)} · S = ${esc(LEGEND.S)} · C = ${esc(LEGEND.C)}</p>
  <p class="small"><b>Method:</b> 28 forced-choice situations, scored most/least (+2 / -1) on the classic DISC method. Because every item forces a trade-off, the four scores are <b>relative to each other, not to other people</b>. Two people with opposite energy levels can produce the same profile if they rank the four the same way. There is no population norm behind these numbers. The optional intensity ratings are the opposite kind of measure (statements rated 1-5 with no trade-off), which is why they can say "how much" while the ranking says "which wins." Band cutoffs: Low below 36, Moderate 36-64, High 65 and up. A single style is named only when the top two scores are at least ${PRIMARY_GAP} points apart. Below that, the pair is the result. If all four sit within ${BALANCED_SPREAD} points, no style is named.</p>
  <p class="small"><b>How far to trust it:</b> treat this as a conversation starter rather than a measurement. Reliability here has been checked by simulation only.</p>
  </details>
  <p class="small" style="margin-top:10px"><b>Disclaimer:</b> a self-awareness and communication tool based on the DISC behavioral model. Not a clinical instrument. Not for hiring, promotion, or medical decisions.</p></div>`;
}

function renderPerson(id){
  const p=byId(id); if(!p){location.hash="#/";return;}
  const r=p.result, pr=profileOf(p), dims=DIMS;
  const dk=lettersLabel(r);
  let hero;
  if(r.shape==="primary"){
    hero=`<div class="bigkey">${r.key}</div><h1>${esc(p.name)}</h1><p class="tag">${esc(pr.name)}. ${esc(pr.tag)}</p>`;
  }else if(r.shape==="blend"){
    hero=`<div class="bigkey">${dk}</div><h1>${esc(p.name)}</h1><p class="tag">${esc(pr.name)}. ${esc(pr.tag)}</p>`;
  }else{
    hero=`<div class="bigkey">mix</div><h1>${esc(p.name)}</h1><p class="tag">No single style stands out. All four scores land within ${r.spread} points.</p>`;
  }
  const note=p.note?`<p class="note">${esc(p.note)}</p>`:"";
  const others=FAMILY.filter(x=>x.id!==p.id).map(x=>`<a href="#/vs/${p.id}/${x.id}">${esc(x.name)}</a>`).join("");
  const dimSecs=dims.map(d=>`<div class="dimhead"><span class="dot d${d}"></span>${d} · ${DIMNAMES[d]}: ${r.band[d]} (${r.N[d]})</div><p>${esc(DIMTEXT[d][r.band[d]])}</p>`).join("");
  const opp=r.key==="DS"||r.key==="IC";
  let body="";
  if(r.shape==="blend"&&pr){
    body+=`<div class="card"><h2>Why two letters, not one</h2>
    <p>Together, ${[...r.key].join(" and ")} are the pair. A style only reaches 100 by taking every win, and an even two-style split tops out at 67 apiece. Two bars in the 60s is not a lukewarm result, it is the ceiling for a strong pair.</p>
    <p>The top two are <b>${r.gap} point${r.gap===1?"":"s"}</b> apart, inside the margin where a retake can swap which comes first. The pair is the result. The order shown is how they landed this sitting.</p></div>`;
  }
  if(r.shape==="balanced"){
    body+=`<div class="card"><h2>What a flat result means</h2>
    <p>The four scores sit close enough together that naming a type would be inventing a difference the answers do not contain. That is a real result, not a failure. It usually means this person genuinely shifts approach to fit the situation instead of running one default. Read the four dimension write-ups rather than looking for a label.</p></div>`;
  }
  if(pr){
    body+=`<div class="card"><h2>What this means</h2><p>${esc(pr.sum)}</p>
    <h3>Strengths</h3><ul>${pr.str.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h3>Watch-outs</h3><ul>${pr.watch.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h3>Motivated by</h3><p>${esc(pr.mot)}</p>
    <h3>Drained by</h3><p>${esc(pr.dr)}</p>
    <h3>Under pressure</h3><p>${esc(pr.up)}</p></div>
    <div class="card"><h2>Working with ${esc(p.name)}</h2>
    <h3 style="color:var(--green)">Do</h3><ul>${pr.comm.do.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <h3 style="color:var(--red)">Don't</h3><ul>${pr.comm.dont.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div>
    <div class="card"><h2>${esc(p.name)}, next to each style</h2>
    <p class="small">Four kinds of person they will deal with, and the move that makes each pairing work.</p>
    ${dims.map(d=>`<div class="dimhead"><span class="dot d${d}"></span>With a ${d} · ${esc(PROFILES[d].name.replace(/^The /,"the "))}</div><p>${esc(pr.pair[d])}</p>`).join("")}</div>
    <div class="card"><h2>When it turns into a fight</h2><p>${esc(pr.conflict)}</p></div>`;
  }
  body+=`<div class="card"><h2>Scores</h2>
    ${dims.map(d=>barRow(d,r.N[d],r.seg[d],r.band[d])).join("")}
    <p class="small">Ranked against themself: every pick one style wins, another loses, so the four always total about the same. A bar only reaches 100 by taking every single win. A strong two-style pair tops out in the 60s. Shaded meaning: Low / Moderate / High.</p></div>`;
  if(p.intensity){
    body+=`<div class="card"><h2>Intensity (nothing forced to lose)</h2>
    ${dims.map(d=>intensityRow(d,p.intensity[d])).join("")}
    <p class="small">From the extra ratings, where nothing had to lose: how much of each they report having, not compared to anyone else. Read the differences between the bars, not their heights.</p></div>`;
  }
  body+=`<div class="card"><h2>The four dimensions in ${esc(p.name)}</h2>${dimSecs}</div>`;
  if(r.unspoken){
    body+=`<div class="card"><h2>Neither reached for nor ruled out</h2>
    <p>${esc(UNSPOKEN_TEXT[r.unspoken])}</p>
    <p class="small">This describes the answer pattern, the ${DIMNAMES[r.unspoken]} options left untouched in both directions. It is not a prediction of crisis behavior.</p></div>`;
  }
  app.innerHTML=`${nav("person")}
  <div class="wrap">
    <div class="hero"><p class="eyebrow">${esc(p.name)} · DISC profile</p>${hero}${note}</div>
    <div class="card"><h2>The DISC map</h2>
      ${wheelSVG([p],{label:p.name+" on the DISC map"})}
      <p class="small">Direction is the style they lean toward. Distance from center is how strongly that lean won.</p>
      ${opp?`<p class="small"><b>The two strongest styles sit on opposite sides of the map,</b> so they pull the dot toward the middle. Read that as tension the map cannot draw as a direction. There is range across one whole axis, not a missing style.</p>`:""}
    </div>
    ${body}
    ${methodFold()}
    <div class="card noprint"><h2>Compare with ${esc(p.name)}</h2>
      <div class="linkrow">${others}</div>
      <a class="btn wide" href="${esc(p.report)}" target="_blank" rel="noopener">Full report</a>
    </div>
    <p class="footer"><a href="#/">← Everyone</a></p>
  </div>`;
}

function pairTextFor(a,b){
  const letters=activeLetters(b);
  const extra=(b.result.shape==="blend"||b.result.shape==="balanced")?letters:letters.slice(0,1);
  const chunks=[];
  const ap=profileOf(a);
  if(ap){
    extra.forEach(L=>{if(ap.pair[L])chunks.push(ap.pair[L]);});
  }else{
    ranked(a.result).slice(0,2).forEach(La=>{
      const pr=PROFILES[La];
      extra.forEach(L=>{if(pr&&pr.pair[L])chunks.push(pr.pair[L]);});
    });
  }
  const seen=new Set();
  return chunks.filter(t=>seen.has(t)?false:seen.add(t));
}

function admireList(b){
  const pr=profileOf(b);
  if(pr)return pr.str;
  return ranked(b.result).slice(0,2).map(d=>DIMTEXT[d][b.result.band[d]]);
}
function watchList(b){
  const pr=profileOf(b);
  if(pr)return pr.watch;
  return ["Their mix. No single watch-out list, because no single style won."];
}

function clashPara(a,b){
  const ap=profileOf(a), bp=profileOf(b);
  const parts=[];
  if(ap)parts.push(asPerson(firstSentence(ap.conflict), a.name));
  if(bp){
    parts.push(asPerson(firstSentence(bp.conflict), b.name));
    parts.push(b.name+"'s listed watch-outs include "+bp.watch.slice(0,2).join(", and ").toLowerCase()+".");
  }else{
    parts.push(b.name+" has no single fight style. The four scores sit close enough that naming one would be inventing it.");
  }
  return parts.join(" ");
}

function weekMoves(a,b){
  const out=[], seen=new Set();
  const add=s=>{if(!s)return; const t=s.replace(/\s+/g," ").trim(); if(!t||seen.has(t)||out.length>=6)return; seen.add(t); out.push(t);};
  const bp=profileOf(b);
  if(bp){
    add(a.name+" with "+b.name+": "+bp.comm.do[0]+".");
    add("With "+b.name+", do not: "+bp.comm.dont[0]+".");
    if(bp.comm.do[1]) add(a.name+": "+bp.comm.do[1]+".");
    if(bp.comm.dont[1]) add("Skip this with "+b.name+": "+bp.comm.dont[1]+".");
  }
  pairTextFor(a,b).forEach(add);
  if(bp&&out.length<6) add("If "+b.name+" is under pressure: "+asPerson(bp.up,b.name));
  return out.slice(0,6);
}

function oppositeBlock(a,b){
  const notes=[];
  const copy="The two strongest styles sit on opposite sides of the map, so they pull toward the middle. Read that as tension the map cannot draw as a direction. There is range across one whole axis, not a missing style.";
  [a,b].forEach(p=>{
    if(p.result.key==="DS"||p.result.key==="IC"){
      notes.push(`${p.name}'s own pair is ${p.result.key}, an opposite-axis blend. ${copy}`);
    }
  });
  const aTop=ranked(a.result)[0], bTop=ranked(b.result)[0];
  const cross=(aTop==="D"&&bTop==="S")||(aTop==="S"&&bTop==="D")||(aTop==="I"&&bTop==="C")||(aTop==="C"&&bTop==="I");
  if(cross){
    notes.push(`${a.name}'s top letter is ${aTop} and ${b.name}'s is ${bTop}. Those sit on opposite sides of the map (D opposite S, I opposite C). ${copy} Between two people, that same pull shows up as pace or focus friction, not as one of them being wrong.`);
  }
  const aLets=new Set(activeLetters(a)), bLets=new Set(activeLetters(b));
  if((aLets.has("D")&&bLets.has("S"))||(aLets.has("S")&&bLets.has("D"))){
    if(!cross) notes.push(`${a.name} and ${b.name} both carry D and S across the pairing (fast/task vs steady/people). ${copy}`);
  }
  if((aLets.has("I")&&bLets.has("C"))||(aLets.has("C")&&bLets.has("I"))){
    if(!((aTop==="I"&&bTop==="C")||(aTop==="C"&&bTop==="I"))) notes.push(`${a.name} and ${b.name} both carry I and C across the pairing (people/pace vs task/precision). ${copy}`);
  }
  if(!notes.length)return "";
  const uniq=[...new Set(notes)];
  return `<div class="card"><h2>Opposite-axis tension</h2>${uniq.map(n=>`<p>${esc(n)}</p>`).join("")}</div>`;
}

function motDrain(a,b){
  const ap=profileOf(a), bp=profileOf(b);
  if(!ap&&!bp){
    return `<p>Neither has a single profile, so there is no one fuel tank to compare. Use the four dimension write-ups on each person page.</p>`;
  }
  let html="";
  if(ap) html+=`<p><b>${esc(a.name)} is motivated by</b> ${esc(ap.mot)} <b>Drained by</b> ${esc(ap.dr)}</p>`;
  else html+=`<p><b>${esc(a.name)}</b> has no single fuel list. Scores sit within ${a.result.spread} points.</p>`;
  if(bp) html+=`<p><b>${esc(b.name)} is motivated by</b> ${esc(bp.mot)} <b>Drained by</b> ${esc(bp.dr)}</p>`;
  else html+=`<p><b>${esc(b.name)}</b> has no single fuel list. Scores sit within ${b.result.spread} points.</p>`;
  if(ap&&bp){
    const aDrive=/control|winning|targets|speed|new ventures|competition|authority|excellence|mastery/i.test(ap.mot);
    const bSteady=/stability|trust|clear standards|quiet|harmony|belonging/i.test(bp.mot);
    const bRush=/improvisation|spotlight|moving targets|rushed|sudden change|micromanagement|slow consensus|paperwork/i.test(bp.dr);
    if(aDrive&&bRush){
      html+=`<p class="small">${esc(a.name)}'s fuel (speed, targets, control) sits next to what drains ${esc(b.name)}. That is a mismatch, not a moral failure. Slow the delivery, keep the target.</p>`;
    }else if(bSteady&&/sudden change|conflict|improvisation|spotlight/i.test(ap.dr)===false && /new|speed|winning|audience/i.test(ap.mot)){
      html+=`<p class="small">${esc(b.name)} is fueled by stability and a clear standard. ${esc(a.name)} is fueled by motion. Name the shared target so the motion has a place to land.</p>`;
    }else{
      html+=`<p class="small">Read those two lists next to each other. Where one person's fuel is the other's drain, that is the weekly friction. Stay inside the canon: do the "Do" list for the other person, skip the "Don't."</p>`;
    }
  }
  return html;
}

function commBlock(a,b){
  const ap=profileOf(a), bp=profileOf(b);
  let html=`<div class="two">`;
  html+=`<div><h3>${esc(a.name)} needs to hear</h3>`;
  if(ap) html+=`<ul>${ap.comm.do.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>`;
  else html+=`<p class="small">No single do-list. Ask what they need this week, then wait.</p>`;
  html+=`</div><div><h3>${esc(b.name)} tends to lead with</h3>`;
  if(bp) html+=`<p>${esc(bp.tag)} ${esc(firstSentence(bp.sum))}</p><p class="small">Under pressure: ${esc(bp.up)}</p>`;
  else html+=`<p class="small">They shift. Do not expect one opening move.</p>`;
  html+=`</div></div>`;
  if(ap&&bp){
    html+=`<p class="small">${esc(a.name)} wants ${esc(ap.comm.do[0].charAt(0).toLowerCase()+ap.comm.do[0].slice(1))}. ${esc(b.name)}'s opening move is ${esc(bp.tag.toLowerCase())} That gap is the communication problem. Use ${esc(b.name)}'s do-list when you are the one talking, and ${esc(a.name)}'s do-list when you need them to hear you.</p>`;
  }
  return html;
}

function directedHTML(a,b, alt){
  const bp=profileOf(b);
  const admire=admireList(b);
  const watch=watchList(b);
  const pairBits=pairTextFor(a,b);
  let interact="";
  if(bp){
    interact+=`<h3 style="color:var(--green)">Do (this is how ${esc(b.name)} actually hears you)</h3>
      <ul>${bp.comm.do.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
      <h3 style="color:var(--red)">Don't</h3>
      <ul>${bp.comm.dont.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>`;
  }else{
    interact+=`<p>${esc(b.name)} has no single instruction card. Their mix is the point. Ask what they think, then wait.</p>`;
  }
  if(pairBits.length){
    interact+=`<h3>From ${esc(a.name)}'s pairing notes</h3>`+pairBits.map(t=>`<p>${esc(t)}</p>`).join("");
  }
  return `<div class="card">
    <div class="directed ${alt?"alt":""}">
      <h2>${esc(a.name)} looking at ${esc(b.name)}</h2>
      <p class="small">${esc(a.name)} is ${esc(lettersLabel(a.result))} · ${esc(profileName(a))}. ${esc(b.name)} is ${esc(lettersLabel(b.result))} · ${esc(profileName(b))}.</p>
      <h3>You will admire</h3>
      <ul>${admire.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
      <h3>This will drive you nuts</h3>
      <ul>${watch.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
      <div class="callout warn"><p>${esc(clashPara(a,b))}</p></div>
      <h3>How to interact</h3>
      ${interact}
    </div>
  </div>`;
}

function renderPair(idA,idB){
  const a=byId(idA), b=byId(idB);
  if(!a||!b||a.id===b.id){location.hash="#/";return;}
  const fightA=profileOf(a)?asPerson(profileOf(a).conflict,a.name):`${a.name} has no single fight paragraph. The scores are too close to name a type, so the fight style shifts with the room.`;
  const fightB=profileOf(b)?asPerson(profileOf(b).conflict,b.name):`${b.name} has no single fight paragraph. The scores are too close to name a type, so the fight style shifts with the room.`;
  const upA=profileOf(a)?asPerson(profileOf(a).up,a.name):`${a.name} has no single pressure move.`;
  const upB=profileOf(b)?asPerson(profileOf(b).up,b.name):`${b.name} has no single pressure move.`;
  const weekA=weekMoves(a,b), weekB=weekMoves(b,a);
  app.innerHTML=`${nav("pair")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Pairing</p>
      <h1>${esc(a.name)} and ${esc(b.name)}</h1>
      <p class="tag">${chips(a.result)} ${esc(lettersLabel(a.result))} · ${esc(profileName(a))} &nbsp; with &nbsp; ${chips(b.result)} ${esc(lettersLabel(b.result))} · ${esc(profileName(b))}</p>
    </div>
    <div class="card">
      <h2>Both on the map</h2>
      ${wheelSVG([a,b],{label:a.name+" and "+b.name+" on the DISC map"})}
      <p class="small">Two dots. Same wheel. If they sit far apart, the weekly work is translation. If they sit on top of each other, the weekly work is saying the quiet thing out loud.</p>
    </div>
    <div class="card">
      <h2>Side by side scores</h2>
      <div class="pairbars">
        <div class="minibars"><h3>${esc(a.name)}</h3>${DIMS.map(d=>barRow(d,a.result.N[d],a.result.seg[d],a.result.band[d])).join("")}</div>
        <div class="minibars"><h3>${esc(b.name)}</h3>${DIMS.map(d=>barRow(d,b.result.N[d],b.result.seg[d],b.result.band[d])).join("")}</div>
      </div>
    </div>
    ${directedHTML(a,b,false)}
    ${directedHTML(b,a,true)}
    <div class="card">
      <h2>When you two fight</h2>
      <p class="small">Both conflict paragraphs, named. Neither is the villain. The pattern is.</p>
      <h3>${esc(a.name)}</h3><p>${esc(fightA)}</p>
      <h3>${esc(b.name)}</h3><p>${esc(fightB)}</p>
    </div>
    <div class="card">
      <h2>Under pressure</h2>
      <h3>${esc(a.name)}</h3><p>${esc(upA)}</p>
      <p class="small">${profileOf(a)?esc(b.name+" should, in that moment: "+profileOf(a).comm.do.join("; ")+"."):esc(b.name+" should ask what "+a.name+" needs, then wait.")}</p>
      <h3>${esc(b.name)}</h3><p>${esc(upB)}</p>
      <p class="small">${profileOf(b)?esc(a.name+" should, in that moment: "+profileOf(b).comm.do.join("; ")+"."):esc(a.name+" should ask what "+b.name+" needs, then wait.")}</p>
    </div>
    <div class="card">
      <h2>Motivated and drained</h2>
      ${motDrain(a,b)}
    </div>
    <div class="card">
      <h2>Communication</h2>
      <p class="small">What each needs to hear, versus how the other tends to show up.</p>
      ${commBlock(a,b)}
      <hr style="border:none;border-top:1px solid var(--line);margin:12px 0">
      ${commBlock(b,a)}
    </div>
    ${oppositeBlock(a,b)}
    <div class="card">
      <h2>This week</h2>
      <p class="small">Concrete moves for this pairing, taken from the do/don't lists and the pairing notes. Not generic advice.</p>
      <h3>${esc(a.name)} → ${esc(b.name)}</h3>
      <ul class="week">${weekA.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
      <h3>${esc(b.name)} → ${esc(a.name)}</h3>
      <ul class="week">${weekB.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    </div>
    <div class="card">
      <a class="btn wide sec" href="#/p/${a.id}">${esc(a.name)}'s report</a>
      <a class="btn wide sec" href="#/p/${b.id}">${esc(b.name)}'s report</a>
      <a class="btn wide" href="${esc(a.report)}" target="_blank" rel="noopener">Full report · ${esc(a.name)}</a>
      <a class="btn wide" href="${esc(b.report)}" target="_blank" rel="noopener">Full report · ${esc(b.name)}</a>
    </div>
    <p class="footer"><a href="#/">← Everyone</a> · <a href="#/vs/${b.id}/${a.id}">Swap order</a></p>
  </div>`;
}

function driveCluster(){
  return FAMILY.filter(p=>/D/.test(p.result.key)&&p.result.shape!=="balanced");
}
function steadyCluster(){
  return FAMILY.filter(p=>p.result.key==="S"||p.result.key==="SC");
}

function renderFamily(){
  const byKey={};
  FAMILY.forEach(p=>{
    const k=p.result.shape==="balanced"?"balanced":p.result.key;
    (byKey[k]=byKey[k]||[]).push(p);
  });
  const shared=Object.keys(byKey).sort().map(k=>{
    const list=byKey[k];
    const title=k==="balanced"?"No single style":(PROFILES[k]?PROFILES[k].name+" ("+k+")":k);
    return `<h3>${esc(title)}</h3><p>${list.map(p=>`<a href="#/p/${p.id}">${esc(p.name)}</a>`).join(", ")} · ${list.length===1?"the only one":list.length+" people"}.</p>
      ${PROFILES[k]?`<p class="small">${esc(PROFILES[k].tag)} ${esc(firstSentence(PROFILES[k].conflict))}</p>`:`<p class="small">Read the four dimension write-ups rather than looking for a label.</p>`}`;
  }).join("");
  const singles=Object.keys(byKey).filter(k=>byKey[k].length===1).map(k=>byKey[k][0]);
  const drive=driveCluster();
  const steady=steadyCluster();
  const mix=FAMILY.filter(p=>p.result.shape==="balanced");
  const hardTalk=drive.map(p=>{
    const pr=profileOf(p);
    return `<p><b>${esc(p.name)}</b> (${esc(lettersLabel(p.result))}). ${esc(firstSentence(pr.conflict))} ${esc(pr.comm.do[0])}.</p>`;
  }).join("");
  const absorb=steady.map(p=>{
    const pr=profileOf(p);
    return `<p><b>${esc(p.name)}</b> (${esc(lettersLabel(p.result))}). ${esc(firstSentence(pr.conflict))} Watch-outs: ${esc(pr.watch[0].toLowerCase())}, ${esc(pr.watch[1].toLowerCase())}.</p>`;
  }).join("");
  app.innerHTML=`${nav("family")}
  <div class="wrap">
    <div class="hero">
      <p class="eyebrow">Family dynamics</p>
      <h1>Who shares a pattern, who does not</h1>
      <p class="tag">Grounded in the same report copy as the person pages. No invented psychology.</p>
    </div>
    <div class="card">
      <h2>Family map</h2>
      ${wheelSVG(FAMILY,{label:"Family DISC map"})}
      ${clusterNote()}
    </div>
    <div class="card">
      <h2>Who shares a profile</h2>
      ${shared}
    </div>
    <div class="card">
      <h2>Odd one out</h2>
      ${singles.map(p=>`<p><b>${esc(p.name)}</b> is the only ${esc(lettersLabel(p.result))} (${esc(profileName(p))}). ${profileOf(p)?esc(profileOf(p).tag):"The four scores refused to name a type."}</p>`).join("")}
      <p class="small">Alex is the only high I (71) and the only Trailblazer. Ashley is the only Architect, with D, S, and C all in the 40s. Elliana is the only flat map (spread ${mix[0]?mix[0].result.spread:7}). Colin and Kate share S, but Colin's second letter is C (57) and Kate's is I (40), so they are not the same person in a room.</p>
    </div>
    <div class="card">
      <h2>Steady cluster (S / SC)</h2>
      <div class="callout"><p>${steady.map(p=>esc(p.name)).join(", ")}. ${steady.length} of 9.</p></div>
      <p>The Craftsman and the Anchor share a conflict move: it does not look like a fight from the outside. SC: fights look like doing it correctly, silently, while the disagreement calcifies. S: they absorb the first hit, smooth over the second, and keep score of neither, out loud. Inside, it stacks.</p>
      ${absorb}
    </div>
    <div class="card">
      <h2>Drive cluster (D / DI / DC)</h2>
      <div class="callout warn"><p>${drive.map(p=>esc(p.name)).join(", ")||"None"}.</p></div>
      <p>DI fights to win the room (volume up, charm on, scoreboard visible). DC wins fights on competence and loses people on temperature. Neither is trying to be cruel. Both will name the thing the steady cluster will not.</p>
      ${hardTalk}
    </div>
    <div class="card">
      <h2>Who to send into a hard conversation</h2>
      <p>Send someone from the drive cluster when something has to be named in the room. ${drive.map(p=>esc(p.name)).join(" or ")} will escalate to settle it, or dismantle it on the facts. That is the D-side conflict copy.</p>
      <p>Do not send the steady cluster to "handle it" and then treat their silence as done. ${steady.map(p=>esc(p.name.split(" ")[0])).join(", ")} will absorb it, comply on the surface, and keep doing it their way. The report already says the relationship you protect with silence is the one the silence erodes.</p>
      ${mix.length?`<p>${esc(mix[0].name)} is the flexible middle. No default. Useful in the room if someone asks what they actually think, then waits.</p>`:""}
    </div>
    <div class="card">
      <h2>All vs all</h2>
      ${matrixHTML()}
    </div>
    <p class="footer"><a href="#/">← Everyone</a></p>
  </div>`;
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
