/* facts.js — the measurement layer.
   Everything here is computed live from the decoded answer sheets, so adding a
   person to people.js (or updating a code) updates every fact on the site.
   No family-specific numbers are hardcoded anywhere in this file.

   buildFacts(FAMILY) expects the augmented people from app.js:
   each person has .id .name .most .least .result (with .N .order .shape) and
   optionally .likert (24-char string) and .note. */

function buildFacts(fam){
  const DIMS = ["D","I","S","C"];
  const first = n => String(n||"").split(" ")[0];

  /* ---------- per person ---------- */
  const persons = {};
  fam.forEach(p => {
    const M = {D:0,I:0,S:0,C:0}, L = {D:0,I:0,S:0,C:0};
    p.most.forEach(d => M[d]++);
    p.least.forEach(d => L[d]++);
    const neutral = {};
    DIMS.forEach(d => neutral[d] = 28 - M[d] - L[d]);

    let lik = null;
    if (p.likert){
      const v = p.likert.split("").map(Number);
      lik = {vals:{D:[],I:[],S:[],C:[]}, avg:{}, min:{}, max:{}};
      v.forEach((x,i) => lik.vals[DIMS[i%4]].push(x));
      DIMS.forEach(d => {
        const a = lik.vals[d];
        lik.avg[d] = Math.round(a.reduce((s,x)=>s+x,0)/a.length*10)/10;
        lik.min[d] = Math.min.apply(null,a);
        lik.max[d] = Math.max.apply(null,a);
      });
      lik.order = [...DIMS].sort((a,b)=>lik.avg[b]-lik.avg[a]);
    }

    const approx = !!(p.note && /approximat|rebuilt|reconstructed/i.test(p.note));
    persons[p.id] = {
      id:p.id, name:first(p.name), fullName:p.name,
      N:p.result.N, order:p.result.order, shape:p.result.shape,
      M, L, neutral, lik, approx,
      care:p.result.care
    };
  });

  /* ---------- pairwise ---------- */
  const pairKey = (a,b) => [a,b].sort().join("|");
  const pairs = {};
  const pairList = [];
  for (let i=0;i<fam.length;i++) for (let j=i+1;j<fam.length;j++){
    const a = fam[i], b = fam[j];
    let sameMost = 0, sameLeast = 0, identical = 0, clash = 0;
    const strip = [];
    for (let k=0;k<28;k++){
      const sm = a.most[k]===b.most[k], sl = a.least[k]===b.least[k];
      const cx = a.most[k]===b.least[k] || b.most[k]===a.least[k];
      if (sm) sameMost++;
      if (sl) sameLeast++;
      if (sm && sl) identical++;
      if (cx) clash++;
      strip.push(sm && sl ? "twin" : sm ? "match" : cx ? "clash" : sl ? "anti" : "quiet");
    }
    const l1 = DIMS.reduce((s,d)=>s+Math.abs(a.result.N[d]-b.result.N[d]),0);
    const entry = {
      aId:a.id, bId:b.id, aName:first(a.name), bName:first(b.name),
      sameMost, sameLeast, identical, clash, l1, strip,
      approx: persons[a.id].approx || persons[b.id].approx
    };
    pairs[pairKey(a.id,b.id)] = entry;
    pairList.push(entry);
  }
  const nPairs = pairList.length;
  const rankBy = (key, dir) => {
    const sorted = [...pairList].sort((x,y)=> dir==="asc" ? x[key]-y[key] : y[key]-x[key]);
    sorted.forEach((e,i)=>{ e[key+"Rank"] = i+1; });
  };
  if (nPairs){
    rankBy("l1","asc");        /* 1 = closest pair */
    rankBy("sameMost","desc"); /* 1 = most matched answers */
    rankBy("clash","desc");    /* 1 = most inverted answers */
  }
  const avgL1 = nPairs ? Math.round(pairList.reduce((s,e)=>s+e.l1,0)/nPairs) : 0;

  /* nearest / furthest per person */
  fam.forEach(p=>{
    const rel = pairList
      .filter(e=>e.aId===p.id||e.bId===p.id)
      .map(e=>({ id:e.aId===p.id?e.bId:e.aId, name:e.aId===p.id?e.bName:e.aName, l1:e.l1 }))
      .sort((x,y)=>x.l1-y.l1);
    persons[p.id].nearest = rel[0] || null;
    persons[p.id].furthest = rel[rel.length-1] || null;
    persons[p.id].distances = rel;
  });

  /* how many people count this person as their furthest */
  fam.forEach(p=>{
    persons[p.id].furthestOfCount =
      fam.filter(o=>o.id!==p.id && persons[o.id].furthest && persons[o.id].furthest.id===p.id).length;
  });

  /* ---------- family-relative ranks ---------- */
  const ranks = {};
  DIMS.forEach(d=>{
    const sorted = [...fam].sort((a,b)=>b.result.N[d]-a.result.N[d]);
    ranks[d] = sorted.map(p=>({id:p.id, name:first(p.name), n:p.result.N[d]}));
    fam.forEach(p=>{
      const higher = fam.filter(o=>o.result.N[d] > p.result.N[d]).length;
      const tied = fam.filter(o=>o.id!==p.id && o.result.N[d] === p.result.N[d]).length;
      persons[p.id]["rank"+d] = { pos: higher+1, tied: tied>0, of: fam.length };
    });
  });

  /* family average and distance from it */
  const avg = {};
  DIMS.forEach(d=>avg[d] = Math.round(fam.reduce((s,p)=>s+p.result.N[d],0)/fam.length));
  fam.forEach(p=>{
    persons[p.id].avgDist = DIMS.reduce((s,d)=>s+Math.abs(p.result.N[d]-avg[d]),0);
  });
  const byAvgDist = [...fam].sort((a,b)=>persons[a.id].avgDist-persons[b.id].avgDist);
  byAvgDist.forEach((p,i)=>{ persons[p.id].avgDistRank = i+1; });

  /* highest / lowest single scores on the board */
  const cells = [];
  fam.forEach(p=>DIMS.forEach(d=>cells.push({id:p.id, name:first(p.name), d, n:p.result.N[d]})));
  cells.sort((a,b)=>b.n-a.n);
  const topCell = cells[0] || null;
  const topTies = topCell ? cells.filter(c=>c.n===topCell.n) : [];
  const lowCell = cells[cells.length-1] || null;
  const lowTies = lowCell ? cells.filter(c=>c.n===lowCell.n) : [];

  /* who leads with what */
  const leadCounts = {D:[],I:[],S:[],C:[]};
  fam.forEach(p=>leadCounts[p.result.order[0]].push(first(p.name)));

  /* near-unanimous questions */
  const unanimity = [];
  for (let k=0;k<28;k++){
    const votes = {};
    fam.forEach(p=>{ votes[p.most[k]] = (votes[p.most[k]]||0)+1; });
    const top = Object.entries(votes).sort((a,b)=>b[1]-a[1])[0];
    if (fam.length >= 4 && top[1] >= fam.length-2){
      const dissenters = fam.filter(p=>p.most[k]!==top[0]).map(p=>first(p.name));
      unanimity.push({item:k+1, letter:top[0], count:top[1], of:fam.length, dissenters});
    }
  }
  unanimity.sort((a,b)=>b.count-a.count);

  const sortedByL1 = [...pairList].sort((a,b)=>a.l1-b.l1);

  return {
    persons, pairs, pairList, pairKey, nPairs, avgL1,
    ranks, avg, byAvgDistIds: byAvgDist.map(p=>p.id),
    topCell, topTies, lowCell, lowTies,
    leadCounts,
    closestPair: sortedByL1[0] || null,
    widestPair: sortedByL1[sortedByL1.length-1] || null,
    mostMatched: nPairs ? [...pairList].sort((a,b)=>b.sameMost-a.sameMost)[0] : null,
    mostInverted: nPairs ? [...pairList].sort((a,b)=>b.clash-a.clash)[0] : null,
    unanimity,
    familySize: fam.length
  };
}

if (typeof window !== "undefined") window.buildFacts = buildFacts;
if (typeof module !== "undefined" && module.exports) module.exports = { buildFacts };
