/* Family comparison from two sliders (pace, priority) and comparison continua.
   Does not rescore DISC. Reads N from a person object (result.N or N). */

const EVEN_BAND = 20;
const VERY_BAND = 80;
const TINY_CONT = 10;
const SIMILAR_CONT = 15;

function clamp100(n){
  return Math.max(0, Math.min(100, n));
}
function firstName(p){
  return String(p.name || "").split(" ")[0];
}
function Nof(p){
  return (p.result && p.result.N) ? p.result.N : p.N;
}
function orderOf(p){
  if(p.result && p.result.order) return p.result.order;
  if(p.order) return p.order;
  const N = Nof(p);
  return ["D","I","S","C"].sort((a,b)=>N[b]-N[a]);
}
function keyOf(p){
  if(p.result && p.result.key != null) return p.result.key;
  return p.key || "";
}
function shapeOf(p){
  if(p.result && p.result.shape) return p.result.shape;
  return p.shape || "";
}
function netsOf(N){
  return {
    pace: (N.D + N.I) - (N.S + N.C),
    pri: (N.D + N.C) - (N.I + N.S)
  };
}

function paceWords(n){
  const lean = n > 0 ? "fast" : (n < 0 ? "slow" : "mixed");
  const word = n > 0 ? "fast" : (n < 0 ? "patient" : "mixed");
  if(Math.abs(n) < 8) return {key:"even", phrase:"near even on pace", short:"near even", pole:"mixed", dir:0, lean:lean, word:word};
  if(Math.abs(n) < EVEN_BAND) return {key:lean, phrase:"slightly "+word, short:"slight "+word, pole:lean, dir:n>0?1:-1, lean:lean, word:word};
  if(n > 0) return {key:"fast", phrase:(n >= VERY_BAND ? "very fast" : "fast"), short:(n >= VERY_BAND ? "very fast" : "fast"), pole:"fast", dir:1, lean:"fast", word:"fast"};
  return {key:"slow", phrase:(n <= -VERY_BAND ? "very patient" : "patient"), short:(n <= -VERY_BAND ? "very patient" : "patient"), pole:"slow", dir:-1, lean:"slow", word:"patient"};
}
function priWords(n){
  const lean = n > 0 ? "task" : (n < 0 ? "people" : "mixed");
  if(Math.abs(n) < 8) return {key:"even", phrase:"near even on people vs the work", short:"near even", pole:"mixed", dir:0, lean:lean};
  if(Math.abs(n) < EVEN_BAND){
    const phrase = lean === "task" ? "slightly on the work" : "slightly on the people in the room";
    return {key:lean, phrase:phrase, short:"slight "+lean, pole:lean, dir:n>0?1:-1, lean:lean};
  }
  if(n > 0) return {key:"task", phrase:(n >= VERY_BAND ? "strongly on the work" : "on the work"), short:(n >= VERY_BAND ? "strongly task" : "task"), pole:"task", dir:1, lean:"task"};
  return {key:"people", phrase:(n <= -VERY_BAND ? "strongly on the people in the room" : "on the people in the room"), short:(n <= -VERY_BAND ? "strongly people" : "people"), pole:"people", dir:-1, lean:"people"};
}

function continuaPositions(N, nets){
  const pace = nets.pace, pri = nets.pri;
  return {
    pace: clamp100(50 + pace / 2),
    priority: clamp100(50 + pri / 2),
    frank: clamp100(50 + (N.D - N.S) / 2),
    outgoing: clamp100(50 + (N.I - N.C) / 2),
    daring: clamp100(50 + (N.D - N.C) / 2)
  };
}

const CONTINUA_META = [
  {id:"pace", left:"Patient", right:"Driven", group:"pace", always:true, family:"pace"},
  {id:"priority", left:"The people in the room", right:"The work", group:"priority", always:true, family:"priority"},
  {id:"frank", left:"Tactful", right:"Frank", group:"ds", always:false, family:"ds"},
  {id:"outgoing", left:"Private", right:"Outgoing", group:"ic", always:false, family:"ic"},
  {id:"daring", left:"Careful", right:"Daring", group:"dc", always:false, family:"dc"}
];

function letterSet(p){
  const N = Nof(p), ord = orderOf(p), sh = shapeOf(p);
  if(sh === "balanced") return ord.slice(0, 2);
  const out = [ord[0]];
  if(N[ord[1]] >= 36) out.push(ord[1]);
  return out;
}
function visibleLettersOf(p){
  const sh = shapeOf(p);
  const N = Nof(p);
  const ord = orderOf(p);
  if(sh === "balanced") return [];
  const out = [ord[0]];
  if(N[ord[1]] >= 36) out.push(ord[1]);
  return out;
}
function letterBandOf(n){
  return n >= 65 ? "High" : (n >= 36 ? "Moderate" : "Low");
}
function clusterPhrase(L, short){
  if(L === "D") return "already-moved";
  if(L === "I") return short ? "spark and a quicker yes" : "spark and a quicker yes, not talking";
  if(L === "S") return "buy-in and runway";
  if(L === "C") return "the check";
  return L;
}
function hasLetter(p, L){
  const set = letterSet(p);
  if(set.indexOf(L) >= 0) return true;
  const N = Nof(p);
  return N[L] >= 50;
}
function dHeavy(p){
  const N = Nof(p);
  return N.D >= 40 && N.D > N.S;
}
function sHeavy(p){
  const N = Nof(p);
  return N.S >= 45 && N.S > N.D;
}
function iPresent(p){
  const N = Nof(p);
  const ord = orderOf(p);
  return N.I >= 35 || ord[0] === "I" || ord[1] === "I";
}
function isDI(p){
  const k = keyOf(p);
  const ord = orderOf(p);
  return k === "DI" || (ord[0] === "D" && ord[1] === "I") || (ord[0] === "I" && ord[1] === "D");
}
function isDSide(p){
  const k = keyOf(p);
  return isDI(p) || k === "D" || k === "DC" || k === "DS" || dHeavy(p);
}
function isSI(p){
  const k = keyOf(p);
  if(k === "IS" || k === "SI") return true;
  const N = Nof(p);
  const gap = Math.abs(N.I - N.S);
  return N.I >= 36 && N.S >= 36 && gap < 14;
}
function primaryLetter(p){
  return orderOf(p)[0];
}
function nearCenter(nets, p){
  if(Math.abs(nets.pace) < EVEN_BAND && Math.abs(nets.pri) < EVEN_BAND) return true;
  const spr = p.result && p.result.spread != null ? p.result.spread : p.spread;
  return spr != null && spr < 16 && Math.abs(nets.pace) < 25 && Math.abs(nets.pri) < 25;
}

function personSnapshot(p){
  const N = Nof(p);
  const nets = netsOf(N);
  const pw = paceWords(nets.pace);
  const rw = priWords(nets.pri);
  const pos = continuaPositions(N, nets);
  return {
    p: p,
    name: firstName(p),
    N: N,
    pace: nets.pace,
    pri: nets.pri,
    paceW: pw,
    priW: rw,
    pos: pos,
    key: keyOf(p) || "mix",
    shape: shapeOf(p),
    order: orderOf(p),
    letters: letterSet(p),
    vis: visibleLettersOf(p),
    primary: primaryLetter(p),
    center: nearCenter(nets, p),
    dHeavy: dHeavy(p),
    sHeavy: sHeavy(p),
    iPresent: iPresent(p),
    di: isDI(p),
    si: isSI(p),
    dSide: isDSide(p)
  };
}

function pairAnalysis(a, b){
  const A = personSnapshot(a);
  const B = personSnapshot(b);
  const paceGap = Math.abs(A.pace - B.pace);
  const priGap = Math.abs(A.pri - B.pri);
  const largerGap = Math.abs(paceGap - priGap) < 8 ? "both" : (paceGap >= priGap ? "pace" : "priority");

  const samePace = A.paceW.lean === B.paceW.lean && A.paceW.lean !== "mixed";
  const samePriority = A.priW.lean === B.priW.lean && A.priW.lean !== "mixed";
  const sameSide = samePace && samePriority;
  const bothEven = A.paceW.pole === "mixed" && B.paceW.pole === "mixed" && A.priW.pole === "mixed" && B.priW.pole === "mixed";

  const differentPace = (A.paceW.lean === "fast" && B.paceW.lean === "slow") || (A.paceW.lean === "slow" && B.paceW.lean === "fast");
  const differentPri = (A.priW.lean === "task" && B.priW.lean === "people") || (A.priW.lean === "people" && B.priW.lean === "task");

  let pairingType;
  if(A.center || B.center) pairingType = "center";
  else if(differentPace && differentPri) pairingType = "both";
  else if(differentPace && !differentPri) pairingType = "pace";
  else if(!differentPace && differentPri) pairingType = "priority";
  else pairingType = "same-side";

  let classic = null;
  if(pairingType === "both"){
    const fast = A.pace > B.pace ? A : B;
    const slow = fast === A ? B : A;
    if(fast.pri >= 0 && slow.pri < 0) classic = "D/S";
    else if(fast.pri < 0 && slow.pri >= 0) classic = "I/C";
    else classic = "D/S";
  }else if(pairingType === "pace"){
    if(samePriority && A.priW.lean === "task") classic = "D/C";
    else if(samePriority && A.priW.lean === "people") classic = "I/S";
    else classic = (A.pri + B.pri) >= 0 ? "D/C" : "I/S";
  }else if(pairingType === "priority"){
    if(samePace && A.paceW.lean === "fast") classic = "D/I";
    else if(samePace && A.paceW.lean === "slow") classic = "S/C";
    else classic = (A.pace + B.pace) >= 0 ? "D/I" : "S/C";
  }

  const dVsS = (A.dHeavy && B.sHeavy) || (B.dHeavy && A.sHeavy);
  const iOverlap = A.iPresent && B.iPresent;
  const diVsSi = (A.di && B.si) || (B.di && A.si) || (A.dSide && B.si) || (B.dSide && A.si);
  const sameLetter = A.primary === B.primary && A.shape === "primary" && B.shape === "primary";

  const continua = CONTINUA_META.map(m=>{
    const posA = A.pos[m.id];
    const posB = B.pos[m.id];
    const gap = Math.abs(posA - posB);
    return {id:m.id, left:m.left, right:m.right, group:m.group, always:m.always, posA, posB, gap};
  });

  const always = continua.filter(c=>c.always);
  const extras = continua.filter(c=>!c.always).sort((x,y)=>y.gap - x.gap);
  const top = always.concat(extras.filter(c=>c.gap >= TINY_CONT).slice(0, 2));
  if(top.length < 4){
    extras.forEach(c=>{
      if(top.length >= 4) return;
      if(!top.some(t=>t.id === c.id)) top.push(c);
    });
  }

  const similarPoles = continua.filter(c=>c.gap < SIMILAR_CONT);
  const rubPoles = continua.filter(c=>c.gap >= 22).sort((x,y)=>y.gap - x.gap);

  const diffs = ["D","I","S","C"].map(d=>({d, a:A.N[d], b:B.N[d], diff:A.N[d]-B.N[d], abs:Math.abs(A.N[d]-B.N[d])}))
    .sort((x,y)=>y.abs - x.abs);

  return {
    A, B, paceGap, priGap, largerGap,
    samePace, samePriority, sameSide, bothEven,
    differentPace, differentPri, pairingType, classic,
    dVsS, iOverlap, diVsSi, sameLetter,
    continua, topContinua: top, similarPoles, rubPoles, diffs,
    nearCenterA: A.center, nearCenterB: B.center
  };
}

function poleSide(pos){
  if(pos < 42) return "left";
  if(pos > 58) return "right";
  return "mid";
}

function fill(s, map){
  return s.replace(/\{(\w+)\}/g, (_, k)=> map[k] != null ? map[k] : "");
}

function uniq(arr){
  const out = [];
  (arr || []).forEach(function(x){
    if(x && out.indexOf(x) < 0) out.push(x);
  });
  return out;
}
function hasVis(S, L){
  return (S.vis || []).indexOf(L) >= 0;
}
function isSplusI(S){ return hasVis(S, "S") && hasVis(S, "I"); }
function isSplusC(S){ return hasVis(S, "S") && hasVis(S, "C"); }
function isDplusI(S){ return hasVis(S, "D") && hasVis(S, "I"); }
function isDplusC(S){ return hasVis(S, "D") && hasVis(S, "C"); }
function whoHigher(an, L){
  const d = an.diffs.find(function(x){ return x.d === L; });
  if(!d || d.abs < 5) return null;
  const more = d.diff > 0 ? an.A : an.B;
  const less = more === an.A ? an.B : an.A;
  return {L:L, more:more, less:less, moreN: d.diff > 0 ? d.a : d.b, lessN: d.diff > 0 ? d.b : d.a, abs:d.abs};
}
function leftoverLines(an, minAbs){
  if(minAbs == null) minAbs = 5;
  return an.diffs.filter(function(d){ return d.abs >= minAbs; }).map(function(d){
    const more = d.diff > 0 ? an.A : an.B;
    const moreN = d.diff > 0 ? d.a : d.b;
    const lessN = d.diff > 0 ? d.b : d.a;
    return more.name + " runs higher " + d.d + " (" + moreN + " vs " + lessN + "), which is " + clusterPhrase(d.d);
  });
}
function sharedModLetters(an){
  return ["D","I","S","C"].filter(function(L){ return an.A.N[L] >= 36 && an.B.N[L] >= 36; });
}
function blendPairKind(A, B){
  if((isSplusI(A) && isSplusC(B)) || (isSplusC(A) && isSplusI(B))) return "SI/SC";
  if((isDplusI(A) && isSplusI(B)) || (isDplusI(B) && isSplusI(A))) return "DI/SI";
  if((isDplusI(A) && isSplusC(B)) || (isDplusI(B) && isSplusC(A))) return "DI/SC";
  if((isDplusI(A) && isDplusC(B)) || (isDplusI(B) && isDplusC(A))) return "DI/DC";
  if((isDplusC(A) && isSplusC(B)) || (isDplusC(B) && isSplusC(A))) return "DC/SC";
  return "";
}
function siSnap(an){ return isSplusI(an.A) ? an.A : (isSplusI(an.B) ? an.B : null); }
function scSnap(an){ return isSplusC(an.A) ? an.A : (isSplusC(an.B) ? an.B : null); }
function diSnap(an){ return isDplusI(an.A) ? an.A : (isDplusI(an.B) ? an.B : null); }
function dcSnap(an){ return isDplusC(an.A) ? an.A : (isDplusC(an.B) ? an.B : null); }

const PERSON_CAVEAT = "Typical, not a prediction of this Tuesday. Scores are tendencies. Situation, mood, who else is in the room, and the other three letters all move the result. One high letter is a cluster, not one habit.";
const PAIR_CAVEAT = "Typical, not a prediction of this Tuesday. Gaps are tendencies. Situation, mood, who else is in the room, and leftover letters all move the week. A pairing type is a reading, not a script.";

function leftoverSentence(an){
  const A = an.A, B = an.B;
  const lines = leftoverLines(an, 8).slice(0, 3);
  if(!lines.length){
    return A.name + " and " + B.name + " sit close on all four scores. The leftover is small. Name it anyway, rather than assuming you match in every room.";
  }
  return "On the four scores, " + lines.join(". ") + ". That leftover is the real gap once the badges look the same.";
}
function houseLetterPara(n, L, band, N){
  if(L === "D"){
    if(band === "High"){
      return "Typical: " + n + " already moved. Results, a call, own-lane, directness. Can be short in a group. Closing is the cluster, not volume. Leftover letters and the night can move that.";
    }
    return "Typical: " + n + " can grab the wheel or leave it. When it matters, a call gets named. The cluster is a close, not how loud the sentence was. Situation can move that.";
  }
  if(L === "I"){
    const dMix = N.D >= 40
      ? " D in the mix often shortens I: high I with D can be shorter at a table than people who talk to keep the room together. Typical, not a rule."
      : " Spark is available. That is still not a prediction of who talks more.";
    if(band === "High"){
      return "Typical: energy, ideas, optimism, wanting people in, a quicker yes. Spark. Not a prediction of who talks more at dinner." + dMix;
    }
    return "Typical: spark on tap. Ideas and a warmer yes when aligned. Not a volume setting." + dMix;
  }
  if(L === "S"){
    if(band === "High"){
      return "Typical: patience, buy-in, runway, loyalty, making sure people are ok. Can be the one holding the table together. A close often waits until the room is ok. That is not silence, and it is not always.";
    }
    return "Typical: a runway without needing the same week twice. Buy-in still matters. Not a quiet setting. Leftover letters can move that.";
  }
  if(L === "C"){
    if(band === "High"){
      return "Typical: getting it right, standards, time to think. Can talk plenty about the details. A yes often waits until it checks out. Not a silent checker, and not always.";
    }
    return "Typical: checks what matters and lets the rest ride. Not a silent checker. Can talk plenty about details that still do not sit right.";
  }
  return "";
}

function stackPara(S){
  const n = S.name;
  const vis = S.vis || [];
  if(vis.length < 2) return "";
  const a = vis[0], b = vis[1];
  const pair = a + "+" + b;
  const tail = " The other two letters, the leftover, and the situation can move this. Not a script.";
  if((a === "S" && b === "I") || (a === "I" && b === "S")){
    return "The second letter changes how the primary tends to show. " + n + " is " + pair + ": S toward buy-in, I toward spark and a quicker yes once people feel in." + tail;
  }
  if((a === "S" && b === "C") || (a === "C" && b === "S")){
    return "The second letter changes how the primary tends to show. " + n + " is " + pair + ": S toward buy-in, C toward the check. C can stretch patience toward one more look. That is a tendency, not a habit of polling everyone." + tail;
  }
  if((a === "I" && b === "D") || (a === "D" && b === "I")){
    return "The second letter changes how the primary tends to show. " + n + " is " + pair + ": I toward spark and people-in, D shortens toward a close. Can be short in a group." + tail;
  }
  if((a === "D" && b === "C") || (a === "C" && b === "D")){
    return "The second letter changes how the primary tends to show. " + n + " is " + pair + ": already-moved plus the check. Fast and right in one person." + tail;
  }
  if((a === "D" && b === "S") || (a === "S" && b === "D")){
    return "The second letter changes how the primary tends to show. " + n + " is " + pair + ": a close and a runway in one person. Classic pace tax, as a tendency." + tail;
  }
  if((a === "I" && b === "C") || (a === "C" && b === "I")){
    return "The second letter changes how the primary tends to show. " + n + " is " + pair + ": spark with a check. Neither is a volume setting." + tail;
  }
  return "The second letter changes how the primary tends to show. " + n + " is " + pair + ", a cluster mix, not one habit." + tail;
}

function notThisPara(S){
  const vis = S.vis || [];
  const n = S.name;
  if(S.center || !vis.length){
    return "A high letter is a cluster, not one habit. High I is not a prediction of who talks more at dinner. High S is not a prediction of who stays quiet. High D is not a prediction of who is loudest. High C is not a prediction of who barely speaks. " + n + " sits near the middle, so none of those cartoons fit anyway.";
  }
  const bits = vis.map(function(L){
    const band = letterBandOf(S.N[L]);
    const label = band === "High" ? "High " + L : L;
    if(L === "I") return label + " is energy, ideas, a quicker yes, not a prediction of who talks more at dinner.";
    if(L === "S") return label + " is patience, buy-in, making sure people are ok, not a prediction of who stays quiet.";
    if(L === "D") return label + " is already-moved, a call, directness, not a prediction of who is loudest.";
    if(L === "C") return label + " is getting it right and time to think, not a prediction of who barely speaks.";
    return "";
  });
  return "A high letter is a cluster, not one habit. " + bits.filter(Boolean).join(" ");
}
function personPredictions(S){
  const n = S.name;
  const out = [];
  if(hasVis(S, "D") || S.N.D >= 40){
    out.push("Lean: " + n + " is often already moved. A path gets named. Leftover letters and the night can move that.");
  }
  if(hasVis(S, "S")){
    out.push("Lean: " + n + " often delays a close until people feel ok. Not a lock.");
  }
  if(hasVis(S, "C")){
    out.push("Lean: " + n + " often wants a look, or the plan on paper, before a yes. Not a lock.");
  }
  if(hasVis(S, "I") && !hasVis(S, "D")){
    out.push("Lean: " + n + " often wants people in, then a quicker yes. Spark, not a talking score.");
  }
  if(hasVis(S, "I") && hasVis(S, "D")){
    out.push("Lean: " + n + " often wants the room in, then D shortens toward a close. Faces, then a call. Typical, not this Tuesday.");
  }
  if(isSplusC(S)){
    out.push("Lean: C in the mix can stretch patience toward one more look. That is not a habit of polling everyone.");
  }
  if(isSplusI(S)){
    out.push("Lean: once people feel in, " + n + " is often ready. Another round of asking can chafe. Situation can move that.");
  }
  if(S.priW.lean === "people"){
    out.push("Lean: faces often matter more than a spec. A 1:1 is one picture of that, not the whole model.");
  }
  if(S.priW.lean === "task"){
    out.push("Lean: whether it works often lands before whether everyone feels in.");
  }
  return uniq(out).slice(0, 4);
}

function personPointers(S){
  const n = S.name;
  const vis = S.vis || [];
  const out = [];
  if(hasVis(S, "D")){
    out.push("Treat a first path from " + n + " as a lean toward already-moved, not as the whole house being in. Ask who still needs a slower yes.");
  }
  if(hasVis(S, "I")){
    out.push("The I in " + n + " is spark, ideas, a quicker yes when aligned. It is not a prediction of who talks more.");
  }
  if(hasVis(S, "S")){
    out.push("Give " + n + " a runway when you can. Buy-in is often the close. A warm table is not a yes, and silence is not the trait.");
  }
  if(hasVis(S, "C")){
    out.push("Send " + n + " the details when the call has to be right. Do not demand a yes before the check. " + n + " can talk plenty about those details.");
  }
  if(isSplusI(S)){
    out.push("If the room already feels in, another round of asking may chafe. Ask once more, then look at leftover C and the night.");
  }
  if(isSplusC(S)){
    out.push("Build in a look when the plan has to hold. Skipping it can land as sloppy. That is a lean, not a rule that " + n + " polls everyone.");
  }
  if(S.paceW.pole === "fast" && S.priW.pole === "people"){
    out.push("If you need a slower yes, say so before " + n + " treats the plan as closed. Going first is often how " + n + " invites the room in.");
  }else if(S.paceW.pole === "slow" && S.priW.pole === "people"){
    out.push("Ask " + n + " for the real no the same day. " + n + " may be holding the table together. The lean is still buy-in.");
  }else if(S.paceW.pole === "slow" && S.priW.pole === "task"){
    out.push("Name a time when good enough ships. The check is real. An endless look is the tax.");
  }else if(S.center){
    out.push("Ask which mode this plan needs. Do not pick a cartoon from one night.");
  }
  if(S.center || vis.length === 0){
    return [
      "Do not pick one cartoon from one night. Some nights " + n + " steers. Some nights " + n + " matches.",
      "Ask which lean this plan needs: a close, buy-in, spark, or a check.",
      "Range is the gift. Guessing from a single dinner is the tax.",
      "A letter is a cluster. A score is a lean, not a lock. None of the four is a volume setting."
    ];
  }
  return uniq(out).slice(0, 4);
}

function personHome(p){
  const S = personSnapshot(p);
  const n = S.name;
  const N = S.N;
  const scores = "D " + N.D + ", I " + N.I + ", S " + N.S + ", C " + N.C;
  const lede = n + " is " + S.paceW.phrase + " and " + S.priW.phrase + ". Scores: " + scores + ".";
  const vis = S.vis || visibleLettersOf(p);
  const letterParas = vis.map(function(L){
    const band = letterBandOf(N[L]);
    return {letter:L, band:band, para:houseLetterPara(n, L, band, N)};
  });

  let table;
  if(S.center){
    table = "At a table, " + n + " does not run one default. Some nights that looks like listening. Some nights that looks like steering. One night is not the type.";
  }else if(S.paceW.pole === "fast" && S.priW.pole === "people"){
    table = "At a table, " + n + " has often already moved. The room is invited in. D in the mix often shortens the airtime: once a path is visible, the next move is a close, not a longer riff. High I with D can be short in a group. Do not read I as who talked more. Lean, not lock.";
  }else if(S.paceW.pole === "fast" && S.priW.pole === "task"){
    table = "At a table, " + n + " often wants the point. A call may get named before dessert. That is already-moved plus the work, not who was loudest. Lean, not lock.";
  }else if(S.paceW.pole === "slow" && S.priW.pole === "task"){
    table = "At a table, " + n + " is often checking whether this actually works: hours, drive, the reservation. C can stretch patience toward one more look. " + n + " can talk plenty about the details. The lean is the check, not silence.";
  }else if(S.paceW.pole === "slow" && S.priW.pole === "people"){
    table = "At a table, " + n + " is often tracking who is ok. Buy-in often matters more than a tight agenda. " + n + " can be the one holding the table together. A 1:1 is one place the real no lives, not because " + n + " had nothing to say at the table, and not as a rule.";
  }else if(S.paceW.pole === "slow"){
    table = "At a table, " + n + " often prefers a runway. The meal can be the point. Being rushed to pick or close a plan is a common tax. Not always.";
  }else if(S.paceW.pole === "fast"){
    table = "At a table, " + n + " often brings motion. Once a path is visible, " + n + " may name it. That is a close, not a volume setting.";
  }else{
    table = "At a table, " + n + " flexes. Watch what the night is asking for.";
  }

  let plan;
  if(S.center){
    plan = "On a plan, " + n + " can lock a time or wait to hear who is coming. Do not assume either move is the real " + n + ". Ask which one this plan needs.";
  }else if(S.paceW.pole === "fast" && S.priW.pole === "people"){
    plan = "On a plan, " + n + " has often already moved: a time, a place, a first yes. People-priority means " + n + " still wants the room in, often by going first. Anyone who needed a slower yes can feel skipped even when invited. Typical, not guaranteed.";
  }else if(S.paceW.pole === "fast"){
    plan = "On a plan, " + n + " often picks. Waiting for every vote can feel like the plan dying. A time gets sent. That is already-moved, not a talking contest.";
  }else if(isSplusC(S)){
    plan = "On a plan, " + n + " often wants buy-in and a check. Hours, drive, who is coming, whether this holds. C can stretch S toward one more look. That is a lean, not a script of polling everyone.";
  }else if(isSplusI(S)){
    plan = "On a plan, " + n + " often waits until people feel in, then a quicker yes. Endless extra rounds can chafe. Leftover C and the night can move that.";
  }else if(S.priW.pole === "people"){
    plan = "On a plan, " + n + " often waits to ask. The plan may not feel real until people are ok. A 1:1 is one tool, not the model.";
  }else if(S.priW.pole === "task"){
    plan = "On a plan, " + n + " often wants it to be right. Hours, drive, cost, whether it seats. Speed without that check can read as sloppy. Lean, not lock.";
  }else{
    plan = "On a plan, " + n + " sits between locking it and waiting. Give a little runway and a clear ask.";
  }

  let pressure;
  if(S.center){
    pressure = "Under pressure, " + n + " shifts. There is no single tell. Ask what they need, then wait.";
  }else if(S.paceW.pole === "fast"){
    pressure = "Under pressure, " + n + " often gets faster and more certain. Empathy can thin. The person who has not answered yet can look settled when they are only stunned. Typical, not this Tuesday.";
  }else if(S.priW.pole === "task"){
    pressure = "Under pressure, " + n + " often goes tighter. Mistakes can feel more expensive than delay. The room may read that as withdrawal. It is often the check.";
  }else if(S.priW.pole === "people"){
    pressure = "Under pressure, " + n + " often tends the people. Feelings get smoothed. The actual problem can wait one beat too many. Lean, not lock.";
  }else{
    pressure = "Under pressure, " + n + " often slows down rather than speeding up. Give time, not a spotlight.";
  }

  return {
    name:n, lede:lede, scores:scores, table:table, plan:plan, pressure:pressure, snapshot:S,
    notThis: notThisPara(S),
    letterParas: letterParas,
    stack: stackPara(S),
    pointers: personPointers(S),
    predictions: personPredictions(S),
    caveat: PERSON_CAVEAT
  };
}
function wileyFlavor(id){
  if(id === "pace") return "Patient vs Driven (also Calm vs Energetic)";
  if(id === "priority") return "the people in the room vs the work";
  if(id === "frank") return "Tactful vs Frank (also Accommodating vs Strong-willed, Soft-spoken vs Forceful)";
  if(id === "outgoing") return "Private vs Outgoing (also Lively vs Reserved, Skeptical vs Accepting)";
  if(id === "daring") return "Careful vs Daring";
  return id;
}

function continuaReads(an){
  const A = an.A, B = an.B;
  return (an.topContinua || []).map(function(c){
    const leftPerson = c.posA < c.posB ? A : B;
    const rightPerson = leftPerson === A ? B : A;
    const gap = Math.round(c.gap);
    const flavor = wileyFlavor(c.id);
    if(c.gap < TINY_CONT){
      return "On " + c.left + " vs " + c.right + ", you sit close. Shared lean on " + flavor + ". Not a guarantee you match this Tuesday.";
    }
    if(c.gap < 22){
      return "On " + c.left + " vs " + c.right + ", a small gap (" + gap + "). " + leftPerson.name + " a bit toward " + c.left.toLowerCase() + ", " + rightPerson.name + " a bit toward " + c.right.toLowerCase() + ". " + flavor + ". A tendency, leftover letters can move it.";
    }
    return "On " + c.left + " vs " + c.right + ", " + leftPerson.name + " sits toward " + c.left.toLowerCase() + " and " + rightPerson.name + " toward " + c.right.toLowerCase() + " (gap " + gap + "). " + flavor + ". Typical read of this scale, not a lock. Situation and the other three letters can move it.";
  });
}

function copyDS(fast, slow){
  return [
    "On Patient vs Driven, " + fast.name + " sits toward Driven and " + slow.name + " toward Patient. Typical: " + fast.name + " treats a decision as live once they can see it. " + slow.name + " treats it as live once the room has had a chance to be ok. Lean, not lock.",
    "On Tactful vs Frank, a D vs S gap often shows as Forceful next to Soft-spoken, Strong-willed next to Accommodating. Directness is often speed. A pause is not a yes. If " + fast.name + " takes that as settled, the real answer can show up later."
  ];
}
function copyIC(fastPeople, slowTask){
  return [
    "On Patient vs Driven and people vs the work, " + fastPeople.name + " sits toward motion and the room, " + slowTask.name + " toward time to think and the check. Typical: energy and people-in versus getting it right. Not talking versus quiet.",
    "On Outgoing vs Private (Lively vs Reserved, Skeptical vs Accepting), a fast yes is often an invitation, not proof the details work. A pause is often the check, not a cold shoulder. Battery, not character."
  ];
}
function copyIS(fast, slow){
  return [
    "Same people-priority, different pace. On Patient vs Driven you split. Both often care that the humans are ok. They tend to disagree about when a plan is real. " + fast.name + " has often already moved. " + slow.name + " often wants buy-in first.",
    "That is already-moved versus buy-in as a scale read, not a volume story. I is not who talks. S is not who waits for a turn. Leftover letters can move both."
  ];
}
function copyDC(fast, slow){
  return [
    "Same work-priority, different pace. On Patient vs Driven and Careful vs Daring, " + fast.name + " often locks a time and fixes it if wrong. " + slow.name + " often wants the look first: hours, drive, whether it works.",
    "Locked time versus the still-researching tab. D is not who picked by talking. C is not who sat silent. Typical, not this Tuesday."
  ];
}
function copySC(taskP, peopleP){
  return [
    "Same patient pace, different priority. On people vs the work, " + peopleP.name + " often watches whether everyone is ok. " + taskP.name + " often watches whether the plan holds.",
    "Because neither rushes, this can look like peace. Typical rub: a delayed hard call versus a delayed yes until the details sit right. Faces versus the hours. Use both, on purpose. Not always."
  ];
}
function copyDI(taskP, peopleP){
  return [
    "Same fast pace, different priority. On people vs the work you split. " + taskP.name + " often closes a result. " + peopleP.name + " often keeps people in. Speed is shared. Who it serves is not.",
    "Calm vs Energetic is not the gap. You share Driven. You split the work versus the room. Lean, not lock."
  ];
}
function copySIvsSC(siP, scP){
  return [
    "One leftover split among others: I versus C on a shared S. On Outgoing vs Private and Skeptical vs Accepting, " + siP.name + " sits further toward spark and a quicker yes (I " + siP.N.I + " vs " + scP.N.I + "). " + scP.name + " sits further toward the check (C " + scP.N.C + " vs " + siP.N.C + ").",
    "Typical: " + siP.name + " (S with I) leans buy-in, then a quicker yes once people feel in. " + scP.name + " (S with C) leans buy-in plus a look. C can stretch patience toward one more check. That is not a rule that " + scP.name + " polls everyone, and not a rule that " + siP.name + " skips people.",
    "Two S people can still rub here. Shared S is patience and buy-in, as a lean. The leftover is I versus C. Same weight as any other leftover split. Situation can move it."
  ];
}
function copyDIvsSI(diP, siP){
  return [
    "Shared I is spark and a quicker yes when aligned, as a lean, not a talking score. The tax is often D versus S, already-moved versus buy-in, Driven versus Patient.",
    diP.name + " is I with D (I " + diP.N.I + ", D " + diP.N.D + "): spark, then D often shortens toward a close. Can be short in a group. " + siP.name + " is S with I (S " + siP.N.S + ", I " + siP.N.I + "): buy-in first, then a quicker yes once people feel in. Typical, leftover and the night can move both."
  ];
}
function copyDIvsSC(diP, scP){
  return [
    "On Patient vs Driven and people vs the work, " + diP.name + " leans motion and the room, then D closes. " + scP.name + " leans buy-in and the check. C can stretch S toward one more look. Not a volume story.",
    "Typical: " + diP.name + " is further down the road. " + scP.name + " still wants a look. Leftover D/I versus leftover S/C. A score is a lean, not a lock."
  ];
}
function copyDIvsDC(diP, dcP){
  return [
    "Shared D is a call, as a lean. On Private vs Outgoing and Careful vs Daring, leftover I versus C is people-in versus the check.",
    "Typical: " + diP.name + " treats a first yes as live. " + dcP.name + " still wants the look. Fast and right versus spark and a close. Not a lock."
  ];
}
function copyDCvsSC(dcP, scP){
  return [
    "Shared C is the check, as a lean. On Patient vs Driven, leftover D versus S is already-moved versus buy-in.",
    "Typical: " + dcP.name + " will lock a time and still want it correct. " + scP.name + " will not lock until people are ok and it checks out. Same standard, different clock. Situation can move that."
  ];
}
function copySameLetter(letter, A, B){
  if(letter === "D"){
    return "Two D leans in one house. The leftover rub is often who decides. Split the call before anyone grabs the wheel. Compete with the plan, not with each other. Not always.";
  }
  if(letter === "I"){
    return "Two I leans. Spark is easy. Closing often is not. Decide who owns the follow-through before the good part of the night ends. Lean, not lock.";
  }
  if(letter === "S"){
    return "Two S primaries. The house often stays smooth, and the real thing can retire unspoken. If leftover I versus leftover C is in the scores, read that split too. Do not stop at same-S. Harmony is a gift, not a script.";
  }
  if(letter === "C"){
    return "Two C leans. Both tend to be sure. The method may differ. Agree which decisions deserve the full check and which get a good-enough call by tonight.";
  }
  return "";
}
function similarParagraphs(an){
  const A = an.A, B = an.B;
  const out = [];
  if(an.sameSide){
    const priBit = A.priW.lean === "people" ? "the people in the room" : (A.priW.lean === "task" ? "the work" : "a mixed priority");
    out.push(A.name + " and " + B.name + " sit on the same side of both sliders: " + A.paceW.word + " pace, " + priBit + ". Shared lean, not a promise you match every night. The leftover still rubs.");
  }else if(an.samePace){
    out.push("Pace is shared: both " + A.paceW.word + ". On Patient vs Driven you sit on the same side. The gap that remains is priority.");
  }else if(an.samePriority){
    out.push("Priority is shared: both " + (A.priW.lean === "people" ? "tuned to the people in the room" : "tuned to the work of getting it right") + ". The gap that remains is pace: when a plan counts as real.");
  }else if(A.center || B.center){
    const c = A.center ? A : B;
    const o = c === A ? B : A;
    out.push(c.name + " sits near the middle of both sliders. There is not a huge opposite-poles story here. " + o.name + " will feel a small lean, not a wall.");
  }else{
    out.push("Look at the scales below. Where the dots sit close, that is a shared lean. It is also where you will both miss the same thing.");
  }
  const shared = sharedModLetters(an);
  if(shared.length){
    const nots = [];
    if(shared.indexOf("I") >= 0) nots.push("shared I is not who talks more");
    if(shared.indexOf("S") >= 0) nots.push("shared S is not who stays quiet");
    if(shared.indexOf("D") >= 0) nots.push("shared D is not who is loudest");
    if(shared.indexOf("C") >= 0) nots.push("shared C is not who barely speaks");
    const named = shared.map(function(L){
      return L + " (" + A.name + " " + A.N[L] + ", " + B.name + " " + B.N[L] + ")";
    }).join("; ");
    out.push("Shared Moderate+ letters: " + named + ". " + nots.join(". ") + ". A score is a lean, not a lock.");
  }else{
    out.push("You do not share a Moderate letter. The overlap, if any, is a slider side, not a matching cluster.");
  }
  if(an.sameLetter){
    const sl = copySameLetter(A.primary, A, B);
    if(sl) out.push(sl);
  }
  return out.slice(0, 3);
}

function blindSpot(an){
  const A = an.A, B = an.B;
  const bits = [];
  const kind = blendPairKind(A, B);
  if(kind === "SI/SC"){
    bits.push("Leftover I vs C on shared S: one lean hears extra rounds as stalling, the other hears a quick close as skipping the look. Name both jobs, then stop. Typical, not a plot.");
  }else if(an.sameSide && A.paceW.lean === "slow" && A.priW.lean === "task"){
    bits.push("the people in the room, and speed. You can get the plan right and still leave someone unasked.");
  }else if(an.sameSide && A.paceW.lean === "slow" && A.priW.lean === "people"){
    bits.push("the hard call, and motion without a full vote. Protecting the room still needs someone to name the thing.");
  }else if(an.sameSide && A.paceW.lean === "fast"){
    bits.push("the brake. Nobody here is naturally the runway. Build one on purpose when slower people are in the house.");
  }else if(an.samePace && A.paceW.lean === "slow"){
    bits.push("speed. Between you, plans get a runway. The house still has faster wiring in it.");
  }else if(an.samePriority && A.priW.lean === "people"){
    bits.push("closing the work. Everyone being ok is not the same as a time, a place, and a yes.");
  }else if(an.samePriority && A.priW.lean === "task"){
    bits.push("whether the people in the room are actually ok, not just whether the plan is correct.");
  }
  if(an.sameLetter && A.primary === "S" && kind !== "SI/SC"){
    bits.push("The real thing can stay unspoken. Smooth is not the same as settled.");
  }else if(an.sameLetter && A.primary === "C"){
    bits.push("Two right answers, no close. Pick a time when good enough ships.");
  }else if(an.sameLetter && A.primary === "I"){
    bits.push("Spark and no close. The plan still needs an owner.");
  }else if(an.sameLetter && A.primary === "D"){
    bits.push("Who decides. Two steering wheels. Name the owner before the outing.");
  }
  if(bits.length) return "Shared blind spot (a lean): " + bits.join(" ");
  if(an.pairingType === "both") return "You do not share a pole to hide in. The gift is range. The cost is translation.";
  return "Where you match, you will both miss the same corner of the room. Ask the person who sits opposite you on the family map what you two are skipping.";
}

function rubParagraphs(an){
  const A = an.A, B = an.B;
  const out = [];
  const kind = blendPairKind(A, B);
  const siP = siSnap(an), scP = scSnap(an), diP = diSnap(an), dcP = dcSnap(an);

  if(an.nearCenterA && an.nearCenterB){
    out.push("The gaps are small. Forcing a big opposite-poles story would be inventing one. " + leftoverSentence(an));
    return out;
  }
  if(an.nearCenterA || an.nearCenterB){
    const c = an.nearCenterA ? A : B;
    const o = c === A ? B : A;
    out.push(c.name + " is near the center. " + o.name + " will feel some of their own wiring more sharply next to a flexible person. Name the small gaps. Do not cast " + c.name + " as a secret opposite.");
    out.push(leftoverSentence(an));
    return out.filter(Boolean);
  }

  if(kind === "SI/SC" && siP && scP){
    copySIvsSC(siP, scP).forEach(function(s){ out.push(s); });
  }else if(kind === "DI/SI" && diP && siP){
    copyDIvsSI(diP, siP).forEach(function(s){ out.push(s); });
  }else if(kind === "DI/SC" && diP && scP){
    copyDIvsSC(diP, scP).forEach(function(s){ out.push(s); });
  }else if(kind === "DI/DC" && diP && dcP){
    copyDIvsDC(diP, dcP).forEach(function(s){ out.push(s); });
  }else if(kind === "DC/SC" && dcP && scP){
    copyDCvsSC(dcP, scP).forEach(function(s){ out.push(s); });
  }else if(an.pairingType === "both" && an.classic === "D/S"){
    const fast = A.pace > B.pace ? A : B;
    copyDS(fast, fast === A ? B : A).forEach(function(s){ out.push(s); });
  }else if(an.pairingType === "both" && an.classic === "I/C"){
    const fast = A.pace > B.pace ? A : B;
    copyIC(fast, fast === A ? B : A).forEach(function(s){ out.push(s); });
    if(an.dVsS){
      const dh = A.dHeavy ? A : B;
      const sh = dh === A ? B : A;
      out.push("Underneath, " + dh.name + "'s D still meets " + sh.name + "'s S on Patient vs Driven. A pause after a direct sentence is not a close. Lean, not lock.");
    }
  }else if(an.pairingType === "pace" && an.classic === "I/S"){
    const fast = A.pace > B.pace ? A : B;
    copyIS(fast, fast === A ? B : A).forEach(function(s){ out.push(s); });
    if(an.dVsS){
      const dh = A.dHeavy ? A : B;
      const sh = dh === A ? B : A;
      out.push("The D in " + dh.name + " still rubs the S in " + sh.name + " on already-moved versus buy-in, even with shared people-priority. Typical, not a fight.");
    }
  }else if(an.pairingType === "pace" && an.classic === "D/C"){
    const fast = A.pace > B.pace ? A : B;
    copyDC(fast, fast === A ? B : A).forEach(function(s){ out.push(s); });
  }else if(an.pairingType === "priority" && an.classic === "S/C"){
    const taskP = A.pri > B.pri ? A : B;
    copySC(taskP, taskP === A ? B : A).forEach(function(s){ out.push(s); });
  }else if(an.pairingType === "priority" && an.classic === "D/I"){
    const taskP = A.pri > B.pri ? A : B;
    copyDI(taskP, taskP === A ? B : A).forEach(function(s){ out.push(s); });
  }else if(an.pairingType === "same-side"){
    out.push(leftoverSentence(an));
    const moreD = an.diffs.find(function(d){ return d.d === "D"; });
    const moreI = an.diffs.find(function(d){ return d.d === "I"; });
    const moreC = an.diffs.find(function(d){ return d.d === "C"; });
    if(isSplusC(A) && isSplusC(B)){
      let sc = "Two S+C stacks, as a lean. Leftover D or I is the weather. ";
      if(moreD && moreD.abs >= 5) sc += (moreD.diff > 0 ? A.name : B.name) + " carries a bit more D (" + (moreD.diff > 0 ? moreD.a : moreD.b) + " vs " + (moreD.diff > 0 ? moreD.b : moreD.a) + "), which is already-moved. ";
      if(moreI && moreI.abs >= 5) sc += (moreI.diff > 0 ? A.name : B.name) + " carries more I (" + (moreI.diff > 0 ? moreI.a : moreI.b) + " vs " + (moreI.diff > 0 ? moreI.b : moreI.a) + "), which is spark and a quicker yes, not talking.";
      out.push(sc.trim());
    }
    if(an.largerGap === "pace"){
      out.push("Even on the same side, pace is the wider gap on Patient vs Driven. One of you is ready a little sooner.");
    }else if(an.largerGap === "priority"){
      out.push("Even on the same side, priority is the wider gap: the work versus the people.");
    }
  }else if(an.pairingType === "center"){
    out.push("Small gaps. " + leftoverSentence(an));
  }else if(an.dVsS){
    const fast = A.pace > B.pace ? A : B;
    copyDS(fast, fast === A ? B : A).forEach(function(s){ out.push(s); });
  }else{
    out.push(leftoverSentence(an));
  }

  if(an.diVsSi && kind !== "DI/SI"){
    const diX = A.di || (A.dSide && !A.si) ? A : B;
    const siX = diX === A ? B : A;
    out.push("When a DI or D pattern sits next to an S with I, shared I is spark as a lean, not a talking score. The tax is often D versus S. " + diX.name + " has often already moved. " + siX.name + " still wants buy-in.");
  }

  const leftover = leftoverLines(an, 5);
  if(leftover.length && kind !== "SI/SC"){
    out.push("Leftover letters: " + leftover.join(". ") + ".");
  }
  return uniq(out.filter(Boolean));
}

function brings(an){
  function one(S){
    const vis = S.vis || [];
    const bits = vis.map(function(L){
      if(L === "D") return "already-moved, a call, own-lane";
      if(L === "I") return "spark, ideas, a quicker yes when aligned";
      if(L === "S") return "buy-in, runway, an eye on who is ok";
      if(L === "C") return "the check, standards, time to think";
      return "";
    }).filter(Boolean);
    let s1 = S.name + " tends to bring " + (bits.join(", ") || "a mix of the four scores") + ".";
    let s2;
    if(S.center) s2 = "Range is the extra: " + S.name + " can meet people in more than one mode.";
    else if(isDplusI(S)) s2 = "D often shortens I. Invitation plus already-moved, not a volume setting.";
    else if(isSplusI(S)) s2 = "I often warms S. Buy-in, then a quicker yes once people feel in.";
    else if(isSplusC(S)) s2 = "C can stretch S toward one more look. Buy-in plus the check, as a lean, not a polling script.";
    else if(isDplusC(S)) s2 = "Already-moved plus the check. Fast and right, in one person, as a tension.";
    else if(S.paceW.lean === "fast" && S.priW.lean === "people") s2 = "The room is invited in, then a close. Typical.";
    else if(S.paceW.lean === "slow" && S.priW.lean === "people") s2 = "Patience here is often for the room. " + S.name + " may talk plenty. The close often waits until people are ok.";
    else if(S.paceW.lean === "slow" && S.priW.lean === "task") s2 = "Patience here is often for the work. A yes often waits on the check.";
    else s2 = "Watch the four scores, not a cartoon of the badge.";
    return s1 + " " + s2 + " A score is a lean, not a lock.";
  }
  return {a: one(an.A), b: one(an.B)};
}
function atHome(an){
  const A = an.A, B = an.B;
  const kind = blendPairKind(A, B);
  const fast = A.pace >= B.pace ? A : B;
  const slow = fast === A ? B : A;
  const taskP = A.pri >= B.pri ? A : B;
  const peopleP = taskP === A ? B : A;
  const siP = siSnap(an), scP = scSnap(an), diP = diSnap(an), dcP = dcSnap(an);
  const dH = whoHigher(an, "D"), iH = whoHigher(an, "I"), sH = whoHigher(an, "S"), cH = whoHigher(an, "C");

  if(kind === "SI/SC" && siP && scP){
    return [
      "Dinner, as a lean: both S. The table can be warm. The leftover is I versus C, not who talks. " + siP.name + " is often ready once people feel in. " + scP.name + " often wants one more look.",
      "A plan or holiday, as a lean: extra rounds can chafe " + siP.name + ". A fast close can land on " + scP.name + " as skipping the look. Not a rule that " + scP.name + " polls everyone.",
      "A stuck moment: split the jobs. " + siP.name + " names when the room is in. " + scP.name + " names what still does not sit right. Then stop. Typical, not guaranteed."
    ];
  }
  if(kind === "DI/SI" && diP && siP){
    return [
      "Dinner, as a lean: " + siP.name + " may hold the table together. " + diP.name + " has often already moved. D often shortens " + diP.name + ". Do not score who talked more.",
      "A plan or holiday: " + diP.name + " often sends a time. " + siP.name + " often needs buy-in, then a quicker yes once in.",
      "A stuck moment: " + diP.name + " can read a pause as settled. " + siP.name + " may still be checking who is ok. Same-day words. Lean, not lock."
    ];
  }
  if(kind === "DI/SC" && diP && scP){
    return [
      "Dinner, as a lean: " + diP.name + " wants the room in and a path named. " + scP.name + " is checking whether this works. Different jobs at the same table.",
      "A plan or holiday: " + diP.name + " has a time in mind. " + scP.name + " has hours, drive, and a look. Lock after the check, not instead of it, when the call has to hold.",
      "A stuck moment: leftover D/I versus leftover S/C, not enthusiasm versus silence."
    ];
  }
  if(kind === "DI/DC" && diP && dcP){
    return [
      "Dinner, as a lean: both already-moved. " + diP.name + " keeping people in. " + dcP.name + " keeping the look.",
      "A plan or holiday: a first yes from " + diP.name + " versus a still-open check from " + dcP.name + ".",
      "A stuck moment: spark versus the look. Name which job this decision is. Not a lock."
    ];
  }
  if(kind === "DC/SC" && dcP && scP){
    return [
      "Dinner, as a lean: both want it right. " + dcP.name + " is further down the road. " + scP.name + " is still on buy-in.",
      "A plan or holiday: locked time versus people-plus-check. Same C, different clock.",
      "A stuck moment: " + dcP.name + " names a call. " + scP.name + " names who is not ok yet. Use both."
    ];
  }
  if(an.pairingType === "both" || (an.pairingType === "pace" && an.dVsS)){
    return [
      "Dinner, as a lean: " + fast.name + " is already on the next subject while " + slow.name + " is still with the last one. Patient vs Driven, not who talked more.",
      "A plan or holiday: " + fast.name + " often wants a call so people can book. " + slow.name + " often wants a slower yes so nobody is steamrolled.",
      "A stuck moment: " + fast.name + " can treat a pause as settled. " + slow.name + " may still be checking the room. Same-day words."
    ];
  }
  if(an.classic === "S/C" || (an.pairingType === "priority" && A.paceW.pole === "slow")){
    return [
      "Dinner can look calm. " + peopleP.name + " often watching faces. " + taskP.name + " often watching whether this plan holds.",
      "A plan or holiday needs both jobs: a correct plan and a check that people are actually ok. Not the same question.",
      "A stuck moment: two polite delays. Name one preference out loud. Typical, not a fight."
    ];
  }
  if(an.sameSide && A.priW.lean === "people"){
    const spark = iH ? iH.more.name + "'s extra I (" + iH.moreN + " vs " + iH.lessN + ") is spark, not a talking score. " : "";
    const buy = sH ? sH.more.name + "'s extra S is buy-in. " : "";
    const chk = cH ? cH.more.name + "'s extra C is the check." : "";
    return [
      "Dinner looks easy until leftover letters show. " + spark + buy + chk,
      "A plan or holiday: someone has to raise the real preference or you will both be fine, and a little resentful. Ask twice. A warm yes is not always a close.",
      "A stuck moment: do not wait for a louder table. A walk or a same-day check is one way to get the real no. One picture, not the whole model."
    ];
  }
  if(an.sameSide && A.priW.lean === "task"){
    const call = dH ? dH.more.name + " carries a bit more D (" + dH.moreN + " vs " + dH.lessN + "), a lean toward naming a call. " : "";
    const chk = cH ? cH.more.name + " carries more C (" + cH.moreN + " vs " + cH.lessN + "), a lean toward another pass on the details." : "";
    return [
      "Home looks compatible on the surface. " + call + chk,
      "A plan or holiday: both want it right and neither rushes. The stall is two checks, not a pace war. Pick a time when good enough ships.",
      "A stuck moment: the people in the room are what you two will skip. Ask who is not ok on purpose."
    ];
  }
  if(an.sameSide){
    return [
      "Home looks compatible until a leftover letter shows. " + leftoverSentence(an),
      "A plan or holiday: who closes, who needs runway, who needs the check. That is the four-score gap, not the badge.",
      "A stuck moment: if nobody raises the real preference, you get a fine evening and a private list."
    ];
  }
  return [
    "Dinner: watch leftover letters, not who talks. " + leftoverLines(an, 8).slice(0, 2).join(". ") + ".",
    "A plan or holiday: who is already moved, who needs buy-in, who needs the look. Leans.",
    "A stuck moment: name the leftover cluster. Do not invent a volume story."
  ];
}
function talkDecideTime(an){
  const A = an.A, B = an.B;
  const kind = blendPairKind(A, B);
  const fast = A.pace >= B.pace ? A : B;
  const slow = fast === A ? B : A;
  const taskP = A.pri >= B.pri ? A : B;
  const peopleP = taskP === A ? B : A;
  const siP = siSnap(an), scP = scSnap(an), diP = diSnap(an);
  const dH = whoHigher(an, "D"), iH = whoHigher(an, "I"), sH = whoHigher(an, "S"), cH = whoHigher(an, "C");
  let talk = [], decide = [], time = [];

  if(kind === "SI/SC" && siP && scP){
    talk = [
      "Shared S: give a runway when you can. Buy-in first. Do not score the night by who talked more.",
      siP.name + ": once people feel in, a quicker yes is fair. Another round may chafe. Lean, not lock.",
      scP.name + ": name what still does not check out. One more look is real. A third round may be stalling. Not a polling script."
    ];
    decide = [
      "Split the jobs. " + siP.name + " names when the room is in. " + scP.name + " names whether it works.",
      "Do not use extra rounds as the only method. That can chafe S with I. Typical, not always.",
      "Do not skip the look when the call has to hold. That is what " + scP.name + " often hears as skipping people and the plan."
    ];
    time = [
      "A who-is-ok pass, then a close. Then stop.",
      "Details on paper for " + scP.name + " when it has to be right. Faces for both, because S is shared, as a lean.",
      "When stuck, one more vote OR a check of the plan, not both forever."
    ];
  }else if(kind === "DI/SI" && diP && siP){
    talk = [
      diP.name + ": say the plan in one sentence, then ask what " + siP.name + " needs to be ok. Wait past the first pause.",
      siP.name + ": say the small no while it is still small, the same day, when you can.",
      "Shared I is spark. Do not score " + diP.name + " as who talks more, or " + siP.name + " as who stays quiet. D often shortens " + diP.name + " in a group."
    ];
    decide = [
      "Name whether this is buy-in or already-moved.",
      "If people have to live with it, " + siP.name + " often needs a slower yes, then a quicker yes once in.",
      "If it is tonight and it can be wrong, let " + diP.name + " pick and move."
    ];
    time = [
      "A holiday often needs a published time from " + diP.name + " plus a check that " + siP.name + " is actually in.",
      "Dinner can be " + siP.name + "'s room. That is buy-in, not silence.",
      "When stuck, a walk the same day beats a pile-on. Group versus 1:1 is one picture of people-priority, not the whole pairing."
    ];
  }else if(kind === "DI/SC" && diP && scP){
    talk = [
      diP.name + ": lead with the invite and the path. Then send the details " + scP.name + " needs.",
      scP.name + ": name what still does not check out. A pause is often the check, not a freeze-out.",
      "Do not treat energy as a close, or the check as a no."
    ];
    decide = [
      "Lock after the check when the call has to hold, not instead of it.",
      diP.name + " names a first yes. " + scP.name + " names the look.",
      "Good enough by this afternoon is a real standard."
    ];
    time = [
      "Give " + scP.name + " a details hour before the plan goes live, when it has to be right.",
      "Let " + diP.name + " name a first yes, then let " + scP.name + " run the check.",
      "Not every night is a research tab, and not every night is a locked time. Trade."
    ];
  }else if(an.dVsS || an.pairingType === "both"){
    talk = [
      fast.name + " often leads with the point. That is speed, not a verdict on " + slow.name + ".",
      slow.name + " often needs a beat. Do not close in a pile-on. Thirty seconds of quiet is not a stall.",
      "Ask one question you actually want the answer to. " + slow.name + ": say the small no while it is still small, the same day, when you can."
    ];
    decide = [
      "Name whether this is a buy-in decision or an already-moved decision.",
      "If people have to live with it, " + slow.name + " often needs a slower yes.",
      "If it is tonight and it can be wrong, let " + fast.name + " pick and move."
    ];
    time = [
      "Mix the clocks. One night " + fast.name + " sets the pace. Next night " + slow.name + " gets the runway.",
      "Holidays often need a published plan and a private check.",
      "Do not make every night a town hall. Do not make every night a closed call either."
    ];
  }else if(an.classic === "S/C"){
    talk = [
      "Keep hard calls without an audience when you can. Both of you often hear better that way.",
      peopleP.name + " often needs a check-in that is actually about who is ok.",
      taskP.name + " often needs the details in a form they can look at twice. Calm is not agreement."
    ];
    decide = [
      "Split the job. " + taskP.name + " checks whether it works. " + peopleP.name + " checks who is left out.",
      "Both have to say yes, or the quiet no can arrive after the reservation.",
      "Pick a time when good enough ships."
    ];
    time = [
      "A correct-plan hour for " + taskP.name + ". A who-is-ok check for " + peopleP.name + ".",
      "Do not make every night a town hall. Do not make every night a closed spec either.",
      "Holidays need both jobs written down."
    ];
  }else if(an.classic === "I/S"){
    talk = [
      fast.name + " has often already moved. " + slow.name + " is still on buy-in. Match that on purpose.",
      "Warm up, then ask, then wait. Do not treat a pause as a stall, and do not sit on a live path until it goes cold.",
      "A 1:1 is one tool for " + slow.name + ". People-priority is bigger than that picture."
    ];
    decide = [
      "Name whether this is buy-in or already-moved.",
      "If people have to live with it, " + slow.name + " often needs a slower yes.",
      "If it can be wrong tonight, let " + fast.name + " pick and move."
    ];
    time = [
      "Trade who the night is for: the room, or a close.",
      "A walk for the stuck no. A table for the people-in.",
      "Holidays get a written time plus a check that nobody got run over."
    ];
  }else if(an.sameSide && A.priW.lean === "people"){
    talk = [
      iH ? ("The extra I in " + iH.more.name + " (" + iH.moreN + " vs " + iH.lessN + ") is spark and a quicker yes. Do not score " + iH.more.name + " as who talks more.") : ("Ask " + A.name + " and " + B.name + " for the real preference, not the warm default."),
      sH ? ("The extra S in " + sH.more.name + " (" + sH.moreN + " vs " + sH.lessN + ") is buy-in. Do not treat " + sH.more.name + " as the quiet one.") : "Buy-in is shared, as a lean. A warm table is not a vote.",
      "Ask twice, same day, without a pile-on."
    ];
    decide = [
      "One of you has to raise the real preference. Take turns being that person.",
      "A coin flip is kinder than two polite maybes.",
      cH ? (cH.more.name + " still often needs a look before a yes.") : "Close once the room is ok, when you can."
    ];
    time = [
      "Host a night that is slightly harder than your default.",
      "The real preference may wait unless someone asks twice.",
      "Invite one person who sits elsewhere on the family map when you need range."
    ];
  }else if(an.sameSide && A.priW.lean === "task"){
    talk = [
      "You two will default to the plan. Name the people in the room on purpose.",
      "Put one preference in words even if it is small. A pause is not a vote.",
      dH ? (dH.more.name + "'s extra D can name the call. Name it, then wait for the real yes.") : "Someone has to close."
    ];
    decide = [
      "Pick a time when the check is done.",
      "Good enough by this afternoon is a real standard.",
      "Ask who is not ok before you lock."
    ];
    time = [
      "Your default night will feel easy. Schedule one night that is only good enough, on purpose.",
      "Take turns being the person who names a call.",
      "Invite someone who sits elsewhere on the family map when you need range."
    ];
  }else if(A.center || B.center){
    talk = [
      "Do not assume a default opening. Ask which mode this conversation needs.",
      "Then one of you speak the ask, and the other wait.",
      "Range is the gift. Guessing is the tax."
    ];
    decide = [
      "Say who owns this one.",
      "One person picks. The other can veto once, with a reason. Then go.",
      "Do not invent a type from a small leftover."
    ];
    time = [
      "Ask which format this night needs.",
      "Do not copy last holiday.",
      "Range is the gift. Use it."
    ];
  }else{
    talk = [
      "Use the scales. Tactful versus Frank: soften the first sentence and keep the point.",
      "Outgoing versus Private: skip the pile-on for anything that matters.",
      "A pause is not a yes. Spark is not a close."
    ];
    decide = [
      "Say who owns this one. One person picks. The other can veto once, with a reason. Then go.",
      leftoverLines(an, 8)[0] || "Name the leftover letter in the room.",
      "Do not use one rule for a buy-in call and a tonight-can-be-wrong call."
    ];
    time = [
      "Trade who picks. One night " + A.name + " chooses the place and the pace. Next night " + B.name + " does.",
      "Holidays get a written time plus a check for anyone who went quiet in the group thread.",
      "Mix faces and the look. Group versus 1:1 is one illustration, not the whole model."
    ];
  }
  while(talk.length < 3) talk.push("Ask one question you actually want the answer to, then wait.");
  while(decide.length < 3) decide.push("Say who owns this one, then go.");
  while(time.length < 3) time.push("Trade who picks the format.");
  return {talk: talk.slice(0, 3), decide: decide.slice(0, 3), time: time.slice(0, 3)};
}
function tips(an){
  const A = an.A, B = an.B;
  const kind = blendPairKind(A, B);
  const fast = A.pace >= B.pace ? A : B;
  const slow = fast === A ? B : A;
  const taskP = A.pri >= B.pri ? A : B;
  const peopleP = taskP === A ? B : A;
  const siP = siSnap(an), scP = scSnap(an);

  function to(from, toward){
    if(kind === "SI/SC" && siP && scP){
      if(from === siP){
        return "Once people feel in, say you are ready. " + toward.name + " often still wants a look. Give one more check, not a third round. Lean, not lock.";
      }
      return "Name what still does not sit right, then stop. " + toward.name + " can hear another vote as stalling. One look is care. Endless extra rounds are the tax, not a rule.";
    }
    if(kind === "DI/SI" && from.dSide && isSplusI(toward)){
      return "Keep the spark. Then wait for the slower yes before you treat the plan as closed. Ask " + toward.name + " the same day, not in a pile-on.";
    }
    if(kind === "DI/SI" && isSplusI(from) && toward.dSide){
      return "Say the true sentence while it is still small. " + toward.name + " can take a no. " + toward.name + " cannot use a no you only thought.";
    }
    if(an.diVsSi && from.dSide && toward.si){
      return "Keep the spark. Then wait for the slower yes before you treat the plan as closed.";
    }
    if(an.diVsSi && toward.dSide && from.si){
      return "Say the true sentence while it is still small. " + toward.name + " can take a no. " + toward.name + " cannot use a no you only thought.";
    }
    if(an.dVsS && from === fast){
      return "Say the plan in one sentence, then ask what " + toward.name + " needs in order to be ok with it. Wait. Do not fill the pause with a second plan.";
    }
    if(an.dVsS && from === slow){
      return "Give the no (or the real yes) the same day. Quiet is not a message " + toward.name + " can read.";
    }
    if(an.classic === "S/C" && from === peopleP){
      return "Name one preference about the plan itself, not only about who might be upset. " + toward.name + " is trying to get it right, and needs your actual vote.";
    }
    if(an.classic === "S/C" && from === taskP){
      return "Ask who is not ok, before you lock the details. Correct and lonely is still a miss.";
    }
    if(an.classic === "I/S" && from === fast){
      return "Invite, then wait. Buy-in is often slower than your close. A same-day check after the group thread is one method.";
    }
    if(an.classic === "I/S" && from === slow){
      return "A late yes is fine. A silent maybe is not. " + toward.name + " already moved because that is how they often care. Catch them up with words.";
    }
    if(from.center){
      return "Tell " + toward.name + " which mode you are in tonight, matching or steering, so they are not guessing.";
    }
    if(toward.center){
      return "Ask " + toward.name + " what they actually think, then wait. The mix means the first shrug might not be the answer.";
    }
    const d0 = an.diffs[0];
    if(d0 && d0.abs >= 5){
      const more = d0.diff > 0 ? A : B;
      if(from === more){
        return "Your extra " + d0.d + " (" + (d0.diff > 0 ? d0.a : d0.b) + " vs " + (d0.diff > 0 ? d0.b : d0.a) + ") is " + clusterPhrase(d0.d, true) + ". Use it on purpose, then stop pushing " + toward.name + ".";
      }
      return "Say your preference in a full sentence. " + toward.name + "'s extra " + d0.d + " will close this if you do not name one.";
    }
    return "Read " + toward.name + "'s four scores, not the badge. Pace first, then priority, then leftover. A score is a lean, not a lock.";
  }
  return {ab: to(A, B), ba: to(B, A)};
}

function namedMoves(an){
  const A = an.A, B = an.B;
  function two(from, toward){
    const moves = [];
    if(from.paceW.lean === "fast" && toward.paceW.lean === "slow"){
      moves.push("After you name a path, ask what " + toward.name + " needs in order to be ok. Wait past the first pause.");
    }
    if(from.paceW.lean === "slow" && toward.paceW.lean === "fast"){
      moves.push("Give " + toward.name + " a yes or a no the same day. " + toward.name + " already moved because that is often care, not a steamroll by default.");
    }
    if(from.priW.lean === "people" && toward.priW.lean === "task"){
      moves.push("Name one thing about the plan itself, not only about who might be upset.");
    }
    if(from.priW.lean === "task" && toward.priW.lean === "people"){
      moves.push("Ask who is not ok before you lock the details. Correct and lonely is still a miss.");
    }
    if(isSplusI(from) && isSplusC(toward)){
      moves.push("Once the room feels in, say you are ready. Give " + toward.name + " one look, not a new poll.");
    }
    if(isSplusC(from) && isSplusI(toward)){
      moves.push("Name the one thing that still does not check out, then stop extra rounds. " + toward.name + " may already be done asking.");
    }
    if(isDplusI(from)){
      moves.push("D often shortens you. After the close, look back at whether " + toward.name + " is actually in.");
    }
    an.diffs.filter(function(d){ return d.abs >= 8; }).forEach(function(d){
      const more = d.diff > 0 ? an.A : an.B;
      if(more === from && moves.length < 2){
        moves.push("Your extra " + d.d + " (" + (d.diff > 0 ? d.a : d.b) + ") is " + clusterPhrase(d.d, true) + ". Spend it on " + toward.name + ", then leave room.");
      }
    });
    if(moves.length < 2) moves.push("Ask " + toward.name + " one question you actually want the answer to, then wait.");
    if(moves.length < 2) moves.push("Name your preference in a full sentence.");
    return uniq(moves).slice(0, 2);
  }
  return {a: two(A, B), b: two(B, A)};
}

function pairPredictions(an){
  const A = an.A, B = an.B;
  const dH = whoHigher(an, "D"), iH = whoHigher(an, "I"), sH = whoHigher(an, "S"), cH = whoHigher(an, "C");
  const out = [];
  if(dH) out.push("Lean: " + dH.more.name + " is often already moved (D " + dH.moreN + " vs " + dH.lessN + "). Not a lock.");
  if(sH) out.push("Lean: " + sH.more.name + " often delays the close for buy-in (S " + sH.moreN + " vs " + sH.lessN + ").");
  if(cH) out.push("Lean: " + cH.more.name + " often wants a look, or the plan on paper, before a yes (C " + cH.moreN + " vs " + cH.lessN + ").");
  if(iH) out.push("Lean: " + iH.more.name + " is often the quicker yes once people feel in (I " + iH.moreN + " vs " + iH.lessN + "). Spark, not who talks more.");
  const kind = blendPairKind(A, B);
  if(kind === "SI/SC"){
    const siP = siSnap(an), scP = scSnap(an);
    if(siP && scP) out.push("Leftover I vs C, as one split among others: " + siP.name + " often raises the preference once the room is in. " + scP.name + " often raises one more look. Typical, not a script.");
  }
  return uniq(out).slice(0, 4);
}

function gapSentence(an){
  const A = an.A, B = an.B;
  const p1 = A.name + " is " + A.paceW.phrase + " (pace " + (A.pace > 0 ? "+" : "") + A.pace + ") and " + A.priW.phrase + " (priority " + (A.pri > 0 ? "+" : "") + A.pri + ").";
  const p2 = B.name + " is " + B.paceW.phrase + " (pace " + (B.pace > 0 ? "+" : "") + B.pace + ") and " + B.priW.phrase + " (priority " + (B.pri > 0 ? "+" : "") + B.pri + ").";
  let which;
  if(an.largerGap === "both"){
    which = "The two gaps are about the same size. You will feel both.";
  }else if(an.largerGap === "pace"){
    which = "The bigger gap is pace (" + Math.round(an.paceGap) + " vs " + Math.round(an.priGap) + " on priority). Clock first, then what the clock is for.";
  }else{
    which = "The bigger gap is priority (" + Math.round(an.priGap) + " vs " + Math.round(an.paceGap) + " on pace). What the night is for, more than how fast it moves.";
  }
  return p1 + " " + p2 + " " + which;
}

function pairCopy(a, b){
  const an = pairAnalysis(a, b);
  const kind = blendPairKind(an.A, an.B);
  an.blendKind = kind;
  const similar = similarParagraphs(an);
  const rubs = rubParagraphs(an);
  const br = brings(an);
  const home = atHome(an);
  const tdt = talkDecideTime(an);
  const tp = tips(an);
  const mv = namedMoves(an);
  let typeLabel;
  if(kind === "SI/SC") typeLabel = "Shared S, leftover I versus C. One leftover split among others. Two patient people can still rub.";
  else if(kind === "DI/SI") typeLabel = "Shared I, with a D versus S tax. Spark, then already-moved versus buy-in. A lean.";
  else if(kind === "DI/SC") typeLabel = "Already-moved and people-in versus buy-in and the check.";
  else if(kind === "DI/DC") typeLabel = "Shared D. Leftover I versus C: people-in versus the check.";
  else if(kind === "DC/SC") typeLabel = "Shared C. Leftover D versus S: already-moved versus buy-in.";
  else if(an.pairingType === "both") typeLabel = "Both sliders differ. Pace is usually the heavier stress.";
  else if(an.pairingType === "pace") typeLabel = "Different pace, closer on priority.";
  else if(an.pairingType === "priority") typeLabel = "Same-ish pace, different priority.";
  else if(an.pairingType === "same-side") typeLabel = "Same side of both sliders. The leftover still counts.";
  else typeLabel = "One person sits near the middle. Name the leftover without inventing a type.";
  if(an.diVsSi && kind !== "DI/SI") typeLabel += " Shared I, with a D versus S tax.";
  return {
    analysis: an,
    lede: gapSentence(an),
    typeLabel: typeLabel,
    scaleReads: continuaReads(an),
    similar: similar,
    similarBlind: blindSpot(an),
    rubs: rubs,
    bringsA: br.a,
    bringsB: br.b,
    atHome: home,
    talk: tdt.talk,
    decide: tdt.decide,
    spendTime: tdt.time,
    tipAB: tp.ab,
    tipBA: tp.ba,
    pointersA: mv.a,
    pointersB: mv.b,
    predictions: pairPredictions(an),
    caveat: PAIR_CAVEAT
  };
}

function familyClusters(people){
  const snaps = people.map(personSnapshot);
  const fast = snaps.filter(s=>s.pace > EVEN_BAND);
  const slow = snaps.filter(s=>s.pace < -EVEN_BAND);
  const center = snaps.filter(s=>s.center);
  const slowTask = snaps.filter(s=>s.pace < -EVEN_BAND && s.pri >= 8 && !s.center);
  const slowPeople = snaps.filter(s=>s.pace < -EVEN_BAND && s.pri < 0 && !s.center);
  const slowEven = snaps.filter(s=>s.pace < -EVEN_BAND && s.pri >= 0 && s.pri < 8 && !s.center);
  return {snaps, fast, slow, slowTask, slowPeople, slowEven, center};
}

if(typeof window !== "undefined"){
  window.EVEN_BAND = EVEN_BAND;
  window.netsOf = netsOf;
  window.paceWords = paceWords;
  window.priWords = priWords;
  window.pairAnalysis = pairAnalysis;
  window.pairCopy = pairCopy;
  window.personHome = personHome;
  window.personSnapshot = personSnapshot;
  window.familyClusters = familyClusters;
  window.firstName = firstName;
  window.CONTINUA_META = CONTINUA_META;
  window.clamp100 = clamp100;
}
if(typeof module !== "undefined" && module.exports){
  module.exports = {pairAnalysis, pairCopy, personHome, personSnapshot, familyClusters, netsOf, paceWords, priWords, firstName, EVEN_BAND};
}
