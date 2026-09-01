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
  if(L === "D") return "already decided";
  if(L === "I") return "a quicker yes once people feel in";
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

function pnoun(S){
  const n = S.name;
  if(n === "Alex" || n === "Derek" || n === "Mike" || n === "Colin") return {s:"he", o:"him", p:"his"};
  if(n === "Ashley" || n === "Renee" || n === "Elliana" || n === "Sofia" || n === "Kate") return {s:"she", o:"her", p:"her"};
  return {s:n, o:n, p:n + "'s"};
}
function sliderLine(S){
  const n = S.name;
  const p = pnoun(S);
  if(S.center && S.shape === "balanced") return n + " sits near the middle on both sliders.";
  if(S.center) return n + " sits near the middle of both sliders.";
  const pace = S.paceW.phrase === "very fast" ? "fast" : S.paceW.phrase;
  if(S.priW.pole === "people") return n + " is " + pace + ", and " + p.s + " cares who is in the room.";
  if(S.priW.pole === "task") return n + " is " + pace + ", and leans toward the work.";
  return n + " is " + pace + ". " + p.s.charAt(0).toUpperCase() + p.s.slice(1) + " sits near even on people versus the work.";
}

const PERSON_CAVEAT = "A reading of the scores, not a script for Tuesday.";
const PAIR_CAVEAT = "A reading of the scores, not a script for Tuesday.";

function leftoverSentence(an){
  const A = an.A, B = an.B;
  const lines = leftoverLines(an, 8).slice(0, 3);
  if(!lines.length){
    return A.name + " and " + B.name + " sit close on all four scores. The leftover is small.";
  }
  return "On the four scores, " + lines.join(". ") + ".";
}

function stackPara(S){
  const n = S.name;
  const p = pnoun(S);
  const vis = S.vis || [];
  if(S.center){
    if(vis.length >= 2){
      return n + " sits near the middle. " + vis[0] + " and " + vis[1] + " are both in the mix, without a hard default.";
    }
    return n + " sits near the middle of both sliders. Some nights " + n + " steers. Some nights " + n + " matches.";
  }
  if(vis.length < 2) return "";
  const a = vis[0], b = vis[1];
  if((a === "I" && b === "D") || (a === "D" && b === "I")){
    return n + "'s I wants people in. " + p.p.charAt(0).toUpperCase() + p.p.slice(1) + " D wants a call. Together that often looks like going first: " + p.s + " names a time and a place so there is something to join. In a group " + p.s + " can be shorter than the I score suggests. Once a path is visible, " + p.s + " closes.";
  }
  if((a === "S" && b === "I") || (a === "I" && b === "S")){
    return n + "'s S wants buy-in. The I is a quicker yes once people feel in. Patience first, then " + n + " is often ready.";
  }
  if((a === "S" && b === "C") || (a === "C" && b === "S")){
    if(a === "C"){
      return n + "'s C wants a check. The S wants buy-in. Together that often looks like getting it right with a runway. C can stretch the close.";
    }
    return n + "'s S wants buy-in. The C wants a check. Together that often looks like patience plus one more look before a yes. C can stretch the close.";
  }
  if((a === "D" && b === "C") || (a === "C" && b === "D")){
    return n + "'s D wants a call. The C wants it right. Fast enough to name a path, careful enough to check it.";
  }
  if((a === "D" && b === "S") || (a === "S" && b === "D")){
    return n + " carries a close and a runway in the same person. A path gets named, then " + n + " waits for the room.";
  }
  if((a === "I" && b === "C") || (a === "C" && b === "I")){
    return n + "'s I wants people in. The C wants a check. A warmer yes, after it sits right.";
  }
  return n + " shows " + a + " with " + b + ".";
}

function capHe(S){
  const p = pnoun(S);
  return p.s.charAt(0).toUpperCase() + p.s.slice(1);
}
function personFlavor(S){
  if(S.center || !(S.vis||[]).length) return "center";
  if(isDplusI(S)) return "DI";
  if(isSplusI(S)) return "SI";
  if(isSplusC(S) && S.priW.pole === "people") return "SC-people";
  if(isSplusC(S) && (S.vis[0] === "C")){
    return S.priW.phrase.indexOf("slight") >= 0 ? "CS-slight" : "CS";
  }
  if(isSplusC(S) && S.paceW.phrase.indexOf("very") >= 0) return "SC-very";
  if(isSplusC(S)) return "SC";
  if(isDplusC(S)) return "DC";
  if(S.paceW.pole === "fast" && S.priW.pole === "people") return "fast-people";
  if(S.paceW.pole === "fast" && S.priW.pole === "task") return "fast-task";
  if(S.paceW.pole === "slow" && S.priW.pole === "task") return "slow-task";
  if(S.paceW.pole === "slow" && S.priW.pole === "people") return "slow-people";
  return "mix";
}

function workingParas(S){
  const n = S.name;
  const p = pnoun(S);
  const N = S.N;
  const f = personFlavor(S);
  if(f === "DI" || f === "fast-people"){
    return [
      n + "'s gift is that a night actually happens. Someone names a time and a place, people have something to join, the room warms up. When " + p.s + " is aligned with you, the first yes is often care: " + p.s + " is trying to get you in, not trying to win. Motion is how " + p.s + " shows welcome.",
      "Low C (" + N.C + ") and low S (" + N.S + ") mean " + p.s + " will not naturally add a long check or a long runway. That is why the house needs other people for those jobs, and why " + p.p + " job is motion. Use " + p.o + " to start things. Do not ask " + p.o + " to sit with a maybe until the day dies.",
      "Range lives in the blend. The I still wants connection after the D has named a path. In a 1:1 that can look warmer than the group version of " + p.o + ". The close already happened. Getting people in is not finished."
    ];
  }
  if(f === "SI"){
    return [
      n + "'s gift is holding the room until a yes is real. People feel in. The night does not have to be a vote. Once " + p.s + " is in, that yes is a yes, not a polite maybe. The I is warmth and a quicker close after buy-in, not a talking score, and the S is not a quiet cartoon. " + capHe(S) + " can hold a gathering without making it a show.",
      p.s.charAt(0).toUpperCase() + p.s.slice(1) + " will not naturally grab the wheel. D sits at " + N.D + ", so the path often waits until the room is ok. That is why the house needs someone else to start, and why " + p.p + " job is the hold. Use " + p.o + " to keep people in. Do not keep polling " + p.o + " after " + p.s + " is already in."
    ];
  }
  if(f === "SC-people"){
    return [
      n + "'s gift is not closing until people have had a say. S is buy-in. C is a check. I sits at " + N.I + ", a people-lean, so the wait is often for voices, not only for whether the reservation holds. That is a different job from a C-forward check of hours and drive. Consensus delay is a tendency here, not a one-off anecdote.",
      "When it is working, a plan gets time to be heard. Someone who would have been walked past gets a turn. The night can start later and still feel like everyone is in. Use " + p.o + " when the house is about to lock something that still has people who have not spoken. Do not use a third round as the only method once those people have spoken."
    ];
  }
  if(f === "SC-very"){
    return [
      n + "'s gift is buy-in plus a check. A yes from " + n + " often means people had a chance to be ok and the plan was looked at: hours, drive, whether it holds. The extra look is care, not a stall by default. Very patient wiring means a rushed close can feel like being walked past.",
      "Use " + p.o + " when the night has to be right. Send the details. Give a runway. Then stop. One more look is the gift. A third round can stall. Do not turn " + p.o + " into a polling cartoon. " + capHe(S) + " is not collecting votes for sport. " + capHe(S) + " is trying not to ship something that falls apart."
    ];
  }
  if(f === "SC"){
    return [
      n + "'s gift is buy-in plus a check. A yes from " + p.o + " often means people had a chance to be ok and the plan was looked at: hours, drive, whether it holds. The extra look is care, not a stall by default. Patient wiring means a rushed close can feel like being walked past.",
      "Use " + p.o + " when a night needs both kindness and a second pass. Send the details. Give a runway. Then stop. One more look is the gift. A third round can stall. " + capHe(S) + " will not naturally grab a live path and run. Name a time when good enough ships so the check does not become the whole week."
    ];
  }
  if(f === "CS"){
    return [
      n + "'s gift is that the plan actually works. Hours, drive, the reservation, whether it seats. C leads, S still wants buy-in, so a yes is often both correct and livable. Speed without that check can read as sloppy to " + p.o + ", because " + p.s + " has already seen the part that fails.",
      "Use " + p.o + " when the outing has to hold. Send the details before you ask for a close. " + capHe(S) + " will not naturally name a fast first yes. That is not a freeze-out. It is the check doing its job. Name a time when good enough ships so the look has an end."
    ];
  }
  if(f === "CS-slight"){
    return [
      n + "'s gift is a C-forward check with enough S to wait for buy-in. People versus the work leans slightly toward the work, so the first pass is often whether this holds, then whether people can live with it. When it is working, the plan is solid and nobody got surprised by a hole " + p.s + " would have caught.",
      "Use " + p.o + " on the look: hours, cost, whether the thing as written actually works. Give a runway. Do not demand a yes before the check. The tax is a delayed close if nobody names when good enough ships."
    ];
  }
  if(f === "DC"){
    return [
      n + "'s gift is a call plus a check. Fast enough to name a path, careful enough to look at it. When it is working, the night has a time and the time is not a fantasy.",
      "Use " + p.o + " when something has to be both decided and right. Do not skip the look, and do not let the look eat the whole day."
    ];
  }
  if(f === "center"){
    return [
      n + "'s gift is matching. Some nights " + p.s + " steers. Some nights " + p.s + " holds, checks, or follows. That range is real. It is not a missing type, and it is not a secret opposite hiding in the leftover points.",
      "When it is working, " + n + " can meet the night that is actually in front of " + p.o + ": a close if the house needs motion, a runway if people are not in, a check if the plan is thin. The tax is that the rest of the house has to ask which night this is, instead of guessing from last Saturday."
    ];
  }
  if(S.paceW.pole === "fast"){
    return [
      n + "'s gift is motion. A path gets named so there is something to join. When it is working, a night actually starts.",
      "Use " + p.o + " to start. Do not make " + p.o + " sit on a live path until it goes cold."
    ];
  }
  return [
    n + "'s gift is a slower yes that other people can live with. When it is working, people feel held and the plan does not steamroll anyone.",
    "Use " + p.o + " for runway. Give a clear ask so the patience has somewhere to land."
  ];
}

function sceneParas(S){
  const n = S.name;
  const p = pnoun(S);
  const f = personFlavor(S);
  if(f === "DI" || f === "fast-people"){
    return [
      "On a group text, " + n + " is often the first time on the thread. The invitation is the path. A thread that sits without a when can feel like the night already dying, even if everyone is still theoretically in.",
      "Saturday morning, the day is already sketched. Waiting for a full vote can feel like the day dying. " + capHe(S) + " would rather send a time and adjust than keep the morning open until nobody has energy left.",
      "For a holiday " + p.s + " wants a call so people can book. That is hospitality at a fast clock. A loose maybe until the week of is not how " + p.s + " shows love.",
      "On a drive or a trip, routing is already happening. A last-minute redo is expensive for " + p.o + " in a way it is not for a patient planner. " + capHe(S) + " can flex, but the cost is real, and it lands as wasted motion, not as fun improvising.",
      "In a 1:1, after a close, " + p.s + " can be more present than the group version of " + p.o + ". The I still wants connection. The D already finished the agenda. That is a good time to say the slower yes you did not say in the thread.",
      "When hosting, the plan is the welcome. A loose maybe until 4pm is not how " + p.s + " shows love. If you are coming, a time helps " + p.o + " open the door. If you are not, a same-day no is kinder than a floating maybe."
    ];
  }
  if(f === "SI"){
    return [
      "At a family gathering, " + n + " often keeps the table together: who has not eaten, who went quiet, whether this still feels like a welcome. That is the gift. It is not a quiet-because-S cartoon, and the I is not a talking score.",
      "Extra rounds after " + p.s + " is in chafe. Once people feel in, " + p.s + " is often ready. Another poll is not care. It is stalling a close " + p.s + " already made.",
      "If you need a small no, ask the same day, preferably not in a pile-on. " + capHe(S) + " can give one. " + capHe(S) + " may not volunteer it while the whole thread is watching.",
      "Saturday morning can wait until people are ok. A locked 9am march is expensive for " + p.o + " in a way a sketched afternoon is not. Buy-in is the start of the day, not a delay tacked on after the plan.",
      "For a holiday " + p.s + " wants the humans in before the plan hardens. A published time helps if someone else owns the start. " + n + " owns whether people actually feel invited.",
      "In a 1:1 versus a pile-on, the real yes is easier without an audience. A group thread can get a warm maybe. A walk can get the true sentence."
    ];
  }
  if(f === "SC-people"){
    return [
      "On a group text, " + n + " often waits until people have had a say before the plan feels real. That is not the same as checking whether the reservation holds. It is consensus. The delay is a tendency, not a one-night mood.",
      "At a family gathering " + p.s + " is often tracking who has not spoken yet. Closing before those voices land can feel like skipping the point of the day.",
      "For a holiday, " + p.s + " would rather be late to a published time than lock a time that quietly leaves someone out. Ask who is not ok on purpose. " + capHe(S) + " often already knows.",
      "Saturday morning may stay open until the house has actually voted with words, not shrugs. If you needed a locked morning, say so early, and still leave a beat for the people in the room.",
      "In a 1:1, " + p.s + " can give a clearer yes than in a pile-on. The C still wants a look. The S still wants buy-in. The people-lean means the look is often 'have we heard from them,' not only 'does this seat.'",
      "A stuck no may wait until everyone has been asked. Name a time when asking stops. Once people have had a say, a third round is stalling, not care."
    ];
  }
  if(f === "SC-very"){
    return [
      "Saturday morning, " + n + " often wants the shape of the day before it starts. A snap decision at the door is expensive. Runway is the point of the morning, not a luxury.",
      "For a holiday the details matter: who is coming, where it seats, whether the plan holds. Send them. A vibe-based yes is not how " + p.s + " shows care.",
      "On a trip, hours and routing are the check. Leaving 'whenever' leaves " + p.o + " nothing to look at. A written departure time is welcome. A last-minute rewrite after " + p.s + " already checked the old one is costly.",
      "When hosting, the plan should work. A loose maybe until 4pm leaves " + p.o + " nothing to check. If you are coming, say so with enough time for the look. If you are not, a same-day no is kinder than a floating slot.",
      "When someone is late, or when the house is waiting, " + n + " often prefers a runway over a scramble. Being rushed to pick is a common tax. Give time, not a spotlight.",
      "A stuck no often needs one more look, not a pile-on. Ask what still does not sit right, then stop. Do not turn " + p.o + " into a polling cartoon. One check is care. A third round can stall."
    ];
  }
  if(f === "SC"){
    return [
      "Saturday morning, " + n + " often wants the shape of the day before it starts. A snap decision at the door is expensive. " + capHe(S) + " would rather know the day than invent it on the way out.",
      "For a holiday, buy-in plus a check: who is coming, and whether the plan holds. Send the details. Extra rounds after both jobs are done will stall, but skipping the look is the other miss.",
      "On a trip, hours and drive get a look. Send them before you ask for a yes. A vibe-based departure leaves " + p.o + " nothing to check.",
      "When hosting, a plan that can actually run is the welcome. A floating maybe until 4pm is hard to check and hard to treat as care.",
      "A stuck no may be the check still running. Ask what is missing, then name when good enough ships. One look is care. A third round can stall.",
      "In a 1:1, " + p.s + " can name the leftover worry without an audience. A pile-on makes the look feel like a defense. Ask once, wait, then stop."
    ];
  }
  if(f === "CS" || f === "CS-slight"){
    const slight = f === "CS-slight";
    return [
      "Saturday morning often starts with whether the plan holds. Hours, drive, cost, whether it seats. " + n + " would rather get that right than start moving and fix it in the car.",
      "For a holiday, the gift is an outing that actually works. A published time is useful after the look, not instead of it. " + (slight ? capHe(S) + " leans slightly toward the work, so the first question is often the plan, then the people." : capHe(S) + " is watching the reservation more than the vibe."),
      "On a trip, routing and timing are the check. A last-minute redo after " + p.s + " already did the look is expensive. If something has to change, change it with the details, not with a shrug.",
      "When hosting, the plan is the welcome only if it holds. Seating, food, timing. A loose maybe until 4pm gives " + p.o + " nothing to make correct.",
      "A stuck no is often a hole in the plan, not a mood. Ask what still does not check out. Then stop. The look has to end or the week never ships.",
      (slight
        ? "People versus the work is only a slight lean. " + n + " can still hear a who-is-ok question. Ask it on purpose, because the default pass is the work."
        : "In a 1:1, " + p.s + " can walk you through why it does not hold. That is care. It is not a cold shoulder, and it is not silence. It is the check, said in words.")
    ];
  }
  if(f === "center"){
    return [
      "Saturday morning might be a locked plan or a late start. Ask which one this Saturday is. Last week is not evidence.",
      "For a holiday " + n + " can match the house: start if the house is drifting, hold if people are not in, check if the plan is thin. The gift is that flexibility. The tax is guessing it in advance.",
      "On a group text, " + p.s + " may send a time one week and wait the next. Do not build a cartoon from one thread.",
      "In a 1:1 versus a pile-on, ask which this conversation needs. Range means the first shrug might not be the answer.",
      "When hosting, " + n + " can run a tight night or a loose one. Tell " + p.o + " which you are walking into, so " + p.s + " is not guessing with you.",
      "A stuck no may need a direct question. Center wiring does not announce itself. Ask what " + p.s + " actually thinks, then wait."
    ];
  }
  if(S.paceW.pole === "fast"){
    return [
      "On a group text, " + n + " may name a time so the thread has a path.",
      "Saturday, waiting for a full vote can feel like the day dying.",
      "For a holiday " + p.s + " often wants a call so people can book.",
      "On a trip, routing is already happening. A last-minute redo is costly.",
      "When hosting, the plan is the welcome.",
      "In a 1:1, after a close, ask whether people are actually in."
    ];
  }
  return [
    "Saturday often wants a runway. Being rushed to pick is a common tax.",
    "For a holiday, " + n + " often wants people ok, or the plan holding, before a yes feels real.",
    "On a trip, last-minute rewrites cost more than they do for a fast starter.",
    "When hosting, a floating maybe is hard to live with.",
    "A stuck no may need a same-day ask, not a pile-on.",
    "In a 1:1, the true sentence is easier than in a thread."
  ];
}

function tablePlanPressure(S){
  const n = S.name;
  const pr = pnoun(S);
  const He = capHe(S);
  let table, plan, pressure;
  if(S.center){
    table = "At a table, " + n + " does not run one default. Some nights that looks like listening. Some nights that looks like steering. Watch the night, not last month. Range is the point of the scores sitting near the middle. If you needed a particular job from " + pr.o + " tonight, ask for it. " + He + " can often do more than one.";
    plan = "On a plan, " + n + " can lock a time or wait to hear who is coming. That is matching, not indecision for its own sake. Ask which one this plan needs: a close, buy-in, people in, or a check. Then let " + pr.o + " do that job instead of guessing from the last outing.";
    pressure = "Under pressure, " + n + " shifts. There is no single tell. Some squeezes pull a close. Some pull a hold. Ask what " + pr.s + " needs, then wait. Inventing a type from the worst night is how you miss the gift of range.";
  }else if(S.paceW.pole === "fast" && S.priW.pole === "people"){
    table = "At a table, " + n + " has often already picked. " + He + " invites by going first: a path so there is something to join, then a close once it is visible. That can feel like a decision to anyone still chewing. It is not always a verdict on them. It is often the night being started. If you needed a slower chew, say so before the path has already cooled.";
    plan = "On a plan " + pr.s + " has often already moved: a time, a place, a first yes. " + He + " still wants the room in. Anyone who needed a slower yes can feel skipped even when they were invited. The skip is the tax of speed, not proof " + pr.s + " did not care. Treat the first plan as a starting point. Name the slower yes while it is still useful.";
    pressure = "Under pressure " + pr.s + " gets faster and more certain. Empathy can thin. Someone who has not answered yet can look settled when they are only stunned. Speed and a close are " + pr.p + " tools when the room feels messy. The stunned person is not done. Ask once, wait past the first pause, and do not fill it with a second plan.";
  }else if(S.paceW.pole === "fast" && S.priW.pole === "task"){
    table = "At a table, " + n + " often wants the point. A call may get named before dessert. That is a close, not a speech. People who were still lining up their thought can feel walked past. Ask for one more round if you need it, before " + pr.s + " treats the pause as settled.";
    plan = "On a plan, " + n + " often picks. Waiting for every vote can feel like the plan dying. A time gets sent so there is something to work from. If the time is wrong, " + pr.s + " would rather fix it than sit in an open maybe. Say the correction the same day.";
    pressure = "Under pressure " + n + " gets faster and more certain. Empathy can thin. Someone who has not answered yet can look settled when they are only stunned. Wait past the first pause. Do not fill it with a second plan.";
  }else if(S.paceW.pole === "slow" && S.priW.pole === "task"){
    table = "At a table, " + n + " is often checking whether this actually works: hours, drive, the reservation, whether it seats. A yes often waits until it checks out. That is not a cold table. It is the check, done in the room instead of after the outing breaks. If you wanted a fast vibe-yes, say so, and still send the details " + pr.s + " needs.";
    plan = "On a plan, " + n + " often wants it to be right. Hours, drive, cost, whether it seats. Speed without that check can read as sloppy, because " + pr.s + " can already see the part that fails. Send the details before you ask for a close. Name a time when good enough ships so the look has an end.";
    pressure = "Under pressure, " + n + " often goes tighter. Mistakes can feel more expensive than delay. The room may read that as withdrawal. It is often the check. Ask what still does not sit right, then stop. A spotlight makes the look feel like a defense.";
  }else if(personFlavor(S) === "SC-people"){
    table = "At a table, " + n + " is often waiting until people have had a say. That is not the same as checking the reservation. Consensus is the job. A fast close before voices land can feel like the point of the meal got skipped. Ask who has not spoken yet. " + He + " often already knows.";
    plan = "On a plan, " + n + " often will not treat it as real until people have been asked. That delay is a tendency, not a one-off. If you needed a locked morning, say so early, and still leave a beat for voices. Once those people have spoken, stop the extra rounds.";
    pressure = "Under pressure, " + n + " often tends the people and delays the close. Feelings get smoothed. The actual lock can wait one beat too many. A same-day 1:1 gets a clearer yes than a pile-on. Name when asking stops.";
  }else if(S.paceW.pole === "slow" && S.priW.pole === "people"){
    table = "At a table, " + n + " is often tracking who is ok. Buy-in often matters more than a tight agenda. That is not the same as filling the air. " + He + " can hold a room without making it a show. If someone is out, the meal is not done for " + pr.o + " yet. Ask who is not ok. " + He + " often already knows.";
    if(isSplusI(S)){
      plan = "On a plan, " + n + " often waits until people feel in, then a quicker yes. Extra rounds after that can chafe. The I is the second beat, not a separate show. If the room is in, " + pr.s + " is often ready to live with the plan. If the room is not, a locked time will feel like being walked past. Ask once after people are in, then stop polling.";
    }else{
      plan = "On a plan, " + n + " often waits to ask. The plan may not feel real until people are ok. That can look like delay to anyone who already named a time. It is often buy-in doing its job. If you needed a locked morning, say so early, and still leave a beat for the people in the room.";
    }
    pressure = "Under pressure, " + n + " often tends the people. Feelings get smoothed. The actual problem can wait one beat too many. That is care, and it is also the tax: the hard call can retire unspoken. A same-day ask helps. " + He + " can take a direct question better than a pile-on.";
  }else if(S.paceW.pole === "slow"){
    table = "At a table, " + n + " often prefers a runway. The meal can be the point. Being rushed to pick is a common tax. " + He + " is not failing to have an opinion. " + He + " is often still on buy-in, or still on the check. Give time, then ask a real question, then wait.";
    if(isSplusC(S)){
      plan = "On a plan, " + n + " often wants buy-in and a check. Hours, drive, who is coming, whether this holds. A yes from " + pr.o + " often means both jobs got done. Extra rounds after that can stall. One more look is care. A third round may be the week refusing to ship.";
    }else{
      plan = "On a plan, " + n + " often wants a slower yes. Give a little runway and a clear ask. An open maybe until 4pm is not runway. It is a missing question. Name what you need, then wait.";
    }
    pressure = "Under pressure, " + n + " often slows down rather than speeding up. Give time, not a spotlight. A pile-on makes the slower yes even slower. A 1:1 the same day is one way to get the real sentence.";
  }else if(S.paceW.pole === "fast"){
    table = "At a table, " + n + " often brings motion. Once a path is visible, " + n + " may name it. That can feel like a close to anyone still chewing. Say if you still need a beat, before the path cools.";
    plan = "On a plan, " + n + " often picks. A time gets sent so there is something to join. Treat it as a starting point if you still need a slower yes, and say so the same day.";
    pressure = "Under pressure " + n + " gets faster and more certain. Empathy can thin. Wait past the first pause. The stunned person is not necessarily done.";
  }else{
    table = "At a table, " + n + " flexes. Watch what the night is asking for. Some meals want a close. Some want a hold. Ask which one this is.";
    plan = "On a plan, " + n + " sits between locking it and waiting. Give a little runway and a clear ask. Do not guess the mode from last week.";
    pressure = "Under pressure, " + n + " may slow down rather than speed up. Give time, not a spotlight. Ask what would help, then wait.";
  }
  return {table:table, plan:plan, pressure:pressure};
}

function hardParas(S){
  const n = S.name;
  const p = pnoun(S);
  const f = personFlavor(S);
  if(f === "DI" || f === "fast-people"){
    return [
      "The slower yes can feel skipped even when they were invited. A pause can look settled. That is the tax of a close that arrives before the room has finished chewing.",
      "Under a real squeeze, speed and certainty go up and empathy can thin. The stunned person looks done. They are often not."
    ];
  }
  if(f === "SI"){
    return [
      "The tax is a delayed hard call, and extra rounds after " + p.s + " is already in. People can read the hold as indecision, or keep polling " + p.o + " after the yes. Neither is the gift.",
      n + " may absorb a night that did not sit right and say it later. Ask the same day. Do not make " + p.o + " perform the no in front of the whole thread."
    ];
  }
  if(f === "SC-people"){
    return [
      "The tax is a consensus delay. The plan can sit while voices are gathered, and a starter in the house will feel the day dying. That wait is often for people, not for a perfect reservation.",
      "Once people have had a say, another round is stalling. Name when asking stops. Someone who was invited and did not speak is not the same as someone who was never asked."
    ];
  }
  if(f === "SC-very"){
    return [
      "The tax is a stretched close. One more look is care. A third round can stall the week. People who already feel in will hear the extra pass as distrust, even when it is the check.",
      "A rushed yes is the other tax. Very patient wiring, walked past, can go tight and quiet. That is not a freeze-out by default. It is often the look being skipped."
    ];
  }
  if(f === "CS" || f === "CS-slight"){
    return [
      "The tax is a delayed close while the look runs, and a night that feels cold to anyone who wanted a vibe-yes. The check is care. It can still leave people waiting at the door.",
      "If nobody names when good enough ships, the plan never leaves the tab. Ask what still does not hold, then pick a time. Skipping the look is the other miss: " + n + " can already see the part that fails."
    ];
  }
  if(f === "SC"){
    return [
      "The tax is patience that never lands. Buy-in plus a check needs an end, or the week stalls for two reasons at once.",
      "A rushed close skips both jobs. Give a runway and a look, then stop."
    ];
  }
  if(f === "center"){
    return [
      "The tax is guessing which night this is. The house can treat " + n + " as whichever cartoon was convenient last time, then feel betrayed when " + p.s + " matches a different job.",
      "Ask. Range only works if someone names the mode. A single dinner is not a type."
    ];
  }
  if(S.paceW.pole === "fast"){
    return [
      "The slower yes can feel skipped. A pause can look settled. Say if you still need a beat, the same day."
    ];
  }
  return [
    "The tax is a delayed hard call, or a check that outruns the week. Name when good enough ships, and ask for the real no the same day."
  ];
}

function letterParasFor(S){
  const n = S.name;
  const N = S.N;
  const vis = S.vis || [];
  const p = pnoun(S);
  const out = [];
  if(S.center && vis.length === 0){
    return out;
  }
  vis.forEach(function(L){
    const band = letterBandOf(N[L]);
    if(L === "I"){
      let t = "I " + band + " (" + N.I + "): " + n + " wants people in. That is invitation, warmth, a quicker yes when the room feels good. It is not a talking score.";
      if(isDplusI(S)){
        t += " D can shorten that in a group: once a path is visible, " + p.s + " closes, so the group version can be shorter than the I suggests.";
      }else if(isSplusI(S)){
        t += " Next to high S, the I is the second beat: buy-in first, then a real yes once people feel in.";
      }
      out.push(t);
    }else if(L === "D"){
      let t = "D " + band + " (" + N.D + "): " + n + " names a path and shortens toward a close. That is a call, not a volume setting.";
      if(isDplusC(S)){
        t += " Next to C, the close still wants a look. Fast enough to name it, careful enough to check it.";
      }
      out.push(t);
    }else if(L === "S"){
      let t = "S " + band + " (" + N.S + "): buy-in and runway. " + n + " treats a plan as real once people can live with it, not only once a time is named.";
      if(isSplusI(S)){
        t += " The I then speeds the yes after people feel in. Extra rounds after that chafe.";
      }else if(isSplusC(S)){
        t += " The C adds a check, so the runway is for both the room and the plan. C can stretch the close.";
      }
      out.push(t);
    }else if(L === "C"){
      let t;
      if(isSplusC(S) && S.priW.pole === "people"){
        t = "C " + band + " (" + N.C + "): the check. For " + n + ", that look is often whether people have had a say, not only hours and drive. A pause here is often waiting for voices, not a freeze-out. Next to S, the extra pass is care. A third round can stall.";
      }else{
        t = "C " + band + " (" + N.C + "): the check. Hours, drive, whether this holds. A pause here is often the look, not a freeze-out.";
        if(isSplusC(S) && vis[0] === "C"){
          t += " C leads this stack, so the first pass is often whether the plan works, with S still wanting buy-in before a yes.";
        }else if(isSplusC(S)){
          t += " Next to high S, the extra look is care. A third round can stall.";
        }
      }
      out.push(t);
    }
  });
  if(isDplusI(S)){
    if(N.S < 36) out.push("S Low (" + N.S + "): little natural runway. " + n + " will not sit with a maybe for long. The house needs other people for that job.");
    if(N.C < 36) out.push("C Low (" + N.C + "): little natural check. Hours, drive, and whether it seats are not " + p.p + " first move.");
  }else if(isSplusI(S) && N.D < 36){
    out.push("D Low (" + N.D + "): " + n + " will not naturally name the close first. Someone else often has to start the path.");
  }else if(isSplusC(S) && vis[0] === "S" && N.I < 36 && N.I <= 20){
    out.push("I Low (" + N.I + "): not a quicker-yes-from-warmth person. The second letter here is the check, not invitation.");
  }
  return out;
}

function personPointers(S){
  const n = S.name;
  const vis = S.vis || [];
  const p = pnoun(S);
  if(S.center || vis.length === 0){
    return [
      "Do not pick one cartoon from one night. Some nights " + n + " steers. Some nights " + n + " matches.",
      "Ask which this plan needs: a close, buy-in, people in, or a check.",
      "Use the range. " + n + " can meet more than one job if you name it.",
      "Guessing from a single dinner is the tax. Ask which night this is.",
      "A 1:1 question beats reading a shrug in a pile-on."
    ];
  }
  if(isDplusI(S) && S.paceW.pole === "fast"){
    return [
      "Treat a first plan from " + n + " as a starting point, not the whole house being in.",
      "If you need a slower yes, say so before it feels closed.",
      "Going first is often how " + n + " invites people in.",
      "Use " + p.o + " to start the night: a time and a place so there is something to join.",
      "Do not make " + p.o + " sit on a live path until it goes cold."
    ];
  }
  if(isSplusI(S)){
    return [
      "Give " + n + " a runway when you can. Buy-in is often the close.",
      "Once people feel in, " + n + " is often ready. Another round of asking may chafe.",
      "If you need a no, ask the same day, not in a pile-on.",
      "Use " + p.o + " to hold the room: who is ok, who got skipped, whether this still feels like a welcome.",
      "S is buy-in, not a hush. I is invitation, not a talking score. Ask what this night needs."
    ];
  }
  if(isSplusC(S) && S.priW.pole === "people"){
    return [
      "Give " + n + " a runway when you can. Buy-in is often the close.",
      "Do not close until people have had a say. That wait is often for voices, not only for the reservation.",
      "Ask " + n + " for the real no the same day, in a 1:1 if the thread is loud.",
      "Use " + p.o + " when the house is about to lock something that still has people who have not spoken.",
      "Once those people have spoken, stop the extra rounds. A third pass is stalling."
    ];
  }
  if(isSplusC(S) && S.paceW.phrase.indexOf("very") >= 0){
    return [
      "Give " + n + " a runway when you can. Buy-in is often the close.",
      "Send the details when the call has to be right. The extra look is care.",
      "Name a time when good enough ships. A third round can stall.",
      "Use " + p.o + " when the night has to hold: hours, drive, whether this actually works.",
      "Do not demand a yes before the check, and do not turn " + p.o + " into a polling cartoon."
    ];
  }
  if(isSplusC(S) && (S.vis[0] === "S")){
    return [
      "Give " + n + " a runway when you can. Buy-in is often the close.",
      "Send the details when the call has to be right. The extra look is care.",
      "Name a time when good enough ships. A third round can stall.",
      "Use " + p.o + " for buy-in plus a check: people can live with it, and it holds.",
      "Do not demand a yes before the look, and do not keep asking after both jobs are done."
    ];
  }
  if(isSplusC(S) || isDplusC(S)){
    return [
      "Give " + n + " a runway when you can.",
      "Send the details when the call has to be right. Do not demand a yes before the check.",
      "Name a time when good enough ships.",
      "Use " + p.o + " to make the plan actually work: hours, drive, the reservation.",
      "Ask what still does not sit right, then stop. The look needs an end."
    ];
  }
  if(hasVis(S, "D")){
    return [
      "Treat a first path from " + n + " as a starting point, not the whole house being in.",
      "If you need a slower yes, say so before it feels closed.",
      "Ask who still needs time.",
      "Use " + p.o + " to name a path so the night has somewhere to go.",
      "After the close, look back at whether people are actually in."
    ];
  }
  return [
    "Ask " + n + " what this plan needs.",
    "Give a little runway and a clear ask.",
    "One night is not the type.",
    "Use whatever gift showed up this week, on purpose.",
    "A same-day sentence beats a shrug in a thread."
  ];
}

function personHome(p){
  const S = personSnapshot(p);
  const n = S.name;
  const N = S.N;
  const scores = "D " + N.D + ", I " + N.I + ", S " + N.S + ", C " + N.C;
  const lede = sliderLine(S) + " Scores: " + scores + ".";
  const tpp = tablePlanPressure(S);
  return {
    name:n, lede:lede, scores:scores,
    table:tpp.table, plan:tpp.plan, pressure:tpp.pressure,
    snapshot:S,
    notThis: "",
    letterParas: letterParasFor(S),
    stack: stackPara(S),
    pointers: personPointers(S).slice(0, 5),
    predictions: [],
    caveat: PERSON_CAVEAT,
    working: workingParas(S),
    scenes: sceneParas(S),
    hard: hardParas(S)
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
    function pole(s){
      if(s === "The people in the room") return "the people in the room";
      if(s === "The work") return "the work";
      return s;
    }
    if(c.gap < TINY_CONT){
      return A.name + " and " + B.name + " sit close on " + pole(c.left) + " versus " + pole(c.right) + ".";
    }
    if(c.gap < 22){
      return leftPerson.name + " sits a bit toward " + pole(c.left) + ", " + rightPerson.name + " a bit toward " + pole(c.right) + ".";
    }
    return leftPerson.name + " sits toward " + pole(c.left) + ", " + rightPerson.name + " toward " + pole(c.right) + ".";
  });
}

function copyDS(fast, slow){
  return [
    fast.name + " sits toward Driven, " + slow.name + " toward Patient. " + fast.name + " treats a decision as live once they can see it. " + slow.name + " treats it as live once the room has had a chance to be ok.",
    "Directness is often speed. A pause is not a yes. If " + fast.name + " takes that as settled, the real answer can show up later."
  ];
}
function copyIC(fastPeople, slowTask){
  return [
    fastPeople.name + " sits toward motion and the room, " + slowTask.name + " toward time to think and the check.",
    "A fast yes is often an invitation, not proof the details work. A pause is often the check, not a cold shoulder."
  ];
}
function copyIS(fast, slow){
  return [
    "Same people-first, different clock. Both often care that the humans are ok. They disagree about when a plan is real. " + fast.name + " has often already moved. " + slow.name + " often wants buy-in first.",
    "That is already decided versus buy-in. You split the clock, not the care."
  ];
}
function copyDC(fast, slow){
  return [
    "Same work-first, different clock. " + fast.name + " often locks a time and fixes it if wrong. " + slow.name + " often wants the look first: hours, drive, whether it works.",
    "Locked time versus the still-researching tab."
  ];
}
function copySC(taskP, peopleP){
  return [
    "Same patient pace, different priority. " + peopleP.name + " often watches whether everyone is ok. " + taskP.name + " often watches whether the plan holds.",
    "Because neither rushes, this can look like peace. The rub is a delayed hard call versus a delayed yes until the details sit right."
  ];
}
function copyDI(taskP, peopleP){
  return [
    "Same fast pace, different priority. " + taskP.name + " often closes a result. " + peopleP.name + " often keeps people in. Speed is shared. Who it serves is not.",
    "You share Driven. You split the work versus the room."
  ];
}
function copySIvsSC(siP, scP){
  return [
    "One leftover split among others: I versus C on a shared S. " + siP.name + " sits further toward a quicker yes once people feel in (I " + siP.N.I + " vs " + scP.N.I + "). " + scP.name + " sits further toward the check (C " + scP.N.C + " vs " + siP.N.C + ").",
    siP.name + " leans buy-in, then a quicker yes once people feel in. " + scP.name + " leans buy-in plus a look. C can stretch the close."
  ];
}
function copyDIvsSI(diP, siP){
  return [
    "The tax is the clock: D versus S. " + diP.name + " has often already picked (D " + diP.N.D + " vs " + siP.N.D + "). " + siP.name + " wants buy-in first (S " + siP.N.S + " vs " + diP.N.S + ").",
    diP.name + " is I with D: people in, then a close. In a group " + diP.name + " can be shorter than the I suggests. " + siP.name + " is S with I: buy-in first, then a quicker yes once people feel in."
  ];
}
function copyDIvsSC(diP, scP){
  return [
    diP.name + " leans motion and the room, then D closes. " + scP.name + " leans buy-in and the check. C can stretch the close.",
    diP.name + " is further down the road. " + scP.name + " still wants a look. Leftover D and I versus leftover S and C."
  ];
}
function copyDIvsDC(diP, dcP){
  return [
    "Shared D is a call. Leftover I versus C is people in versus the check.",
    diP.name + " treats a first yes as live. " + dcP.name + " still wants the look."
  ];
}
function copyDCvsSC(dcP, scP){
  return [
    "Shared C is the check. Leftover D versus S is already decided versus buy-in.",
    dcP.name + " will lock a time and still want it correct. " + scP.name + " will not lock until people are ok and it checks out. Same standard, different clock."
  ];
}
function copySameLetter(letter, A, B){
  if(letter === "D"){
    return "Two D leans in one house. The leftover rub is often who decides. Split the call before anyone grabs the wheel.";
  }
  if(letter === "I"){
    return "Two I leans. People in is easy. Closing often is not. Decide who owns the follow-through before the good part of the night ends.";
  }
  if(letter === "S"){
    return "Two S primaries. The house often stays smooth, and the real thing can retire unspoken. If leftover I versus leftover C is in the scores, read that split too.";
  }
  if(letter === "C"){
    return "Two C leans. Both tend to be sure. Agree which decisions deserve the full check and which get a good-enough call by tonight.";
  }
  return "";
}
function similarParagraphs(an){
  const A = an.A, B = an.B;
  const kind = blendPairKind(A, B);
  const out = [];
  if(kind === "SI/SC"){
    out.push(A.name + " and " + B.name + " share patience and buy-in. The leftover is I versus C, one split among others.");
    return out;
  }
  if(kind === "DI/SI"){
    out.push("Priority is shared: both tuned to the people in the room. The gap that remains is pace: when a plan counts as real.");
    out.push("You share I (" + A.name + " " + A.N.I + ", " + B.name + " " + B.N.I + ").");
    return out;
  }
  if(an.sameSide){
    const priPole = A.priW.pole === B.priW.pole ? A.priW.pole : "mixed";
    const priBit = priPole === "people" ? "the people in the room" : (priPole === "task" ? "the work" : "priority near even for one of you");
    out.push(A.name + " and " + B.name + " sit on the same side of both sliders: " + A.paceW.word + " pace, " + priBit + ". The leftover is where you will still rub.");
  }else if(an.samePace){
    out.push("Pace is shared: both " + A.paceW.word + ". The gap that remains is priority.");
  }else if(an.samePriority){
    out.push("Priority is shared: both " + (A.priW.lean === "people" ? "tuned to the people in the room" : "tuned to the work") + ". The gap that remains is pace: when a plan counts as real.");
  }else if(A.center || B.center){
    const c = A.center ? A : B;
    const o = c === A ? B : A;
    out.push(c.name + " sits near the middle of both sliders. " + o.name + " will feel a small lean, not a wall.");
  }else{
    out.push("Where the dots sit close, that is shared. It is also where you will both miss the same thing.");
  }
  if(an.sameLetter){
    const sl = copySameLetter(A.primary, A, B);
    if(sl) out.push(sl);
  }else{
    const shared = sharedModLetters(an);
    if(shared.length){
      const named = shared.map(function(L){
        return L + " (" + A.name + " " + A.N[L] + ", " + B.name + " " + B.N[L] + ")";
      }).join("; ");
      out.push("You share " + named + ".");
    }
  }
  return out.slice(0, 2);
}

function blindSpot(an){
  const A = an.A, B = an.B;
  const bits = [];
  const kind = blendPairKind(A, B);
  if(kind === "SI/SC"){
    bits.push("One of you hears extra rounds as stalling. The other hears a quick close as skipping the look. Name both jobs, then stop.");
  }else if(an.sameSide && A.paceW.lean === "slow" && A.priW.lean === "task"){
    bits.push("The people in the room, and speed. You can get the plan right and still leave someone unasked.");
  }else if(an.sameSide && A.paceW.lean === "slow" && A.priW.lean === "people"){
    bits.push("The hard call, and motion without a full vote. Protecting the room still needs someone to name the thing.");
  }else if(an.sameSide && A.paceW.lean === "fast"){
    bits.push("The brake. Nobody here is naturally the runway. Build one on purpose when slower people are in the house.");
  }else if(an.samePace && A.paceW.lean === "slow"){
    bits.push("Speed. Between you, plans get a runway. The house still has faster wiring in it.");
  }else if(an.samePriority && A.priW.lean === "people"){
    bits.push("Closing the work. Everyone being ok is not the same as a time, a place, and a yes.");
  }else if(an.samePriority && A.priW.lean === "task"){
    bits.push("Whether the people in the room are actually ok, not just whether the plan is correct.");
  }
  if(an.sameLetter && A.primary === "S" && kind !== "SI/SC"){
    bits.push("The real thing can stay unspoken. Smooth is not the same as settled.");
  }else if(an.sameLetter && A.primary === "C"){
    bits.push("Two right answers, no close. Pick a time when good enough ships.");
  }else if(an.sameLetter && A.primary === "I"){
    bits.push("People in and no close. The plan still needs an owner.");
  }else if(an.sameLetter && A.primary === "D"){
    bits.push("Who decides. Two steering wheels. Name the owner before the outing.");
  }
  if(bits.length) return bits.join(" ");
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
    return out.slice(0, 3);
  }
  if(an.nearCenterA || an.nearCenterB){
    const c = an.nearCenterA ? A : B;
    const o = c === A ? B : A;
    out.push(c.name + " is near the center. " + o.name + " will feel some of their own wiring more sharply next to a flexible person. Name the small gaps. Do not cast " + c.name + " as a secret opposite.");
    out.push(leftoverSentence(an));
    return out.filter(Boolean).slice(0, 3);
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
  }else if(an.pairingType === "pace" && an.classic === "I/S"){
    const fast = A.pace > B.pace ? A : B;
    copyIS(fast, fast === A ? B : A).forEach(function(s){ out.push(s); });
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
    if(isSplusC(A) && isSplusC(B)){
      let sc = "Two S+C stacks. Leftover D or I is the weather.";
      if(moreD && moreD.abs >= 5) sc += " " + (moreD.diff > 0 ? A.name : B.name) + " carries a bit more D (" + (moreD.diff > 0 ? moreD.a : moreD.b) + " vs " + (moreD.diff > 0 ? moreD.b : moreD.a) + "), which is already decided.";
      if(moreI && moreI.abs >= 5) sc += " " + (moreI.diff > 0 ? A.name : B.name) + " carries more I (" + (moreI.diff > 0 ? moreI.a : moreI.b) + " vs " + (moreI.diff > 0 ? moreI.b : moreI.a) + "), which is a quicker yes once people feel in.";
      out.push(sc.trim());
    }
    if(an.largerGap === "pace"){
      out.push("Even on the same side, pace is the wider gap. One of you is ready a little sooner.");
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

  return uniq(out.filter(Boolean)).slice(0, 3);
}

function brings(an){
  function one(S){
    const vis = S.vis || [];
    const bits = vis.map(function(L){
      if(L === "D") return "a call";
      if(L === "I") return "people in, a quicker yes when aligned";
      if(L === "S") return "buy-in, runway, an eye on who is ok";
      if(L === "C") return "the check, standards, time to think";
      return "";
    }).filter(Boolean);
    let s1 = S.name + " tends to bring " + (bits.join(", ") || "a mix of the four scores") + ".";
    let s2 = "";
    if(S.center) s2 = "Range is the extra: " + S.name + " can meet people in more than one mode.";
    else if(isDplusI(S)) s2 = "Invitation plus a close.";
    else if(isSplusI(S)) s2 = "Buy-in, then a quicker yes once people feel in.";
    else if(isSplusC(S)) s2 = "Buy-in plus the check. C can stretch the close.";
    else if(isDplusC(S)) s2 = "A call plus the check. Fast and right, in one person.";
    else if(S.paceW.lean === "fast" && S.priW.lean === "people") s2 = "The room is invited in, then a close.";
    else if(S.paceW.lean === "slow" && S.priW.lean === "people") s2 = "Patience here is often for the room. The close often waits until people are ok.";
    else if(S.paceW.lean === "slow" && S.priW.lean === "task") s2 = "Patience here is often for the work. A yes often waits on the check.";
    return (s1 + " " + s2).trim();
  }
  return {a: one(an.A), b: one(an.B)};
}
function pairWorking(an){
  const A = an.A, B = an.B;
  const kind = blendPairKind(A, B);
  const fast = A.pace >= B.pace ? A : B;
  const slow = fast === A ? B : A;
  const taskP = A.pri >= B.pri ? A : B;
  const peopleP = taskP === A ? B : A;
  const siP = siSnap(an), scP = scSnap(an), diP = diSnap(an), dcP = dcSnap(an);
  if(kind === "DI/SI" && diP && siP){
    return [
      A.name + " and " + B.name + " both care who is in the room. That is why this pairing works: the night is for people, not only for a correct plan. " + diP.name + " starts so there is something to join. " + siP.name + " holds so people can actually get in. Nights happen because one names a path and the other keeps the room.",
      "Shared I is warmth on both sides (" + A.name + " " + A.N.I + ", " + B.name + " " + B.N.I + "). When it is working, the first plan is a starting point, the slower yes gets said the same day, and you use each other on purpose: motion from " + diP.name + ", runway from " + siP.name + ". The clock is the work. The care is shared."
    ];
  }
  if(kind === "SI/SC" && siP && scP){
    return [
      A.name + " and " + B.name + " share patience and buy-in. Nights can be warm without anyone grabbing the wheel. " + siP.name + " brings a quicker yes once people feel in. " + scP.name + " brings a check. Together a plan can be kind and still hold.",
      "When it works, " + siP.name + " names when the room is in, " + scP.name + " names whether the hours and the drive actually work, and you stop. Shared S is the gift. The leftover I versus C is weather, not a war. One look, then a close, is the pairing at its best."
    ];
  }
  if(kind === "DI/SC" && diP && scP){
    return [
      "This pairing can make a night that both happens and holds. " + diP.name + " starts: a time, a place, people invited in. " + scP.name + " checks: hours, drive, whether it actually works. Complementary jobs. You do not both have to do the same one.",
      "When it works, you lock after the look, not instead of it. " + diP.name + " keeps the path from dying. " + scP.name + " keeps the path from being a fantasy. Use both on purpose and the outing ships."
    ];
  }
  if(kind === "DI/DC" && diP && dcP){
    return [
      "Shared close. This pairing can actually decide. " + diP.name + " keeps people in. " + dcP.name + " keeps the look. A night can start and still be correct.",
      "When it works, a first yes from " + diP.name + " is a starting point, and " + dcP.name + " runs the check before it hardens. Shared D is motion. Leftover I versus C is which job this decision is."
    ];
  }
  if(kind === "DC/SC" && dcP && scP){
    return [
      "Shared check. This pairing can make a plan that holds. " + dcP.name + " is further down the road. " + scP.name + " still wants buy-in. Same standard, complementary clocks.",
      "When it works, " + dcP.name + " names a call and " + scP.name + " names who is not ok yet. You use both. The outing is right, and people can live with it."
    ];
  }
  if(an.samePriority && A.priW.lean === "people"){
    return [
      A.name + " and " + B.name + " both tune to the people in the room. That is the shared gift: a night that forgets the humans is a miss for both of you. When it works, someone still has to start, and someone still has to close, but nobody gets treated as furniture.",
      "Use the shared people-first on purpose. Then pick a clock. If one of you is faster, let them name a first time. If one of you holds, let them check who is actually in. Complementary jobs beat two polite maybes."
    ];
  }
  if(an.samePriority && A.priW.lean === "task"){
    return [
      "You both care whether the plan holds. That is the shared gift: outings that work, reservations that seat, hours that make sense. When it is working, the night is solid.",
      "Use each other on the look, then name when good enough ships. Shared work-first still needs a close, and still needs a who-is-ok pass borrowed from elsewhere in the house."
    ];
  }
  if(an.samePace && A.paceW.lean === "slow"){
    return [
      "Pace is shared: both " + A.paceW.word + ". Nights can have a runway. Nobody here is trying to steamroll the morning. When it works, people can live with the day.",
      "The leftover job still needs a name: people versus the work, or I versus C. Use the shared patience, then split the remaining job instead of both stalling for different reasons."
    ];
  }
  if(an.samePace && A.paceW.lean === "fast"){
    return [
      "Pace is shared: both fast. Nights happen. Someone names a path and you move. That is the gift.",
      "Build a runway on purpose when slower people are in the house. You two will not grow one by accident. Use the shared motion to start, then borrow a check."
    ];
  }
  if(A.center || B.center){
    const c = A.center ? A : B;
    const o = c === A ? B : A;
    return [
      c.name + " can match " + o.name + " more than a typed opposite would. That is the gift of the middle: fewer walls, more nights that can be either a close or a hold.",
      "When it works, " + o.name + " names the job this night needs, and " + c.name + " meets it. Range only shows up if someone asks which night this is."
    ];
  }
  return [
    A.name + " and " + B.name + " cover more than one job when you use both. A night can start and still have a runway, or a check, depending on who is in the pairing.",
    "When it works, you name the complementary jobs out loud: who starts, who holds, who checks. Then you stop doing each other's work as a protest."
  ];
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
      "Dinner: both S. The table can be warm. This is why you like each other: nobody is rushing the meal into a vote. " + siP.name + " is often ready once people feel in. " + scP.name + " often wants one more look.",
      "On a group text, " + siP.name + " may be ready after the room feels in. " + scP.name + " may still want a look before a yes lands in the thread. One check, then a close. A third message asking the same thing will chafe " + siP.name + ".",
      "For a holiday, extra rounds can chafe " + siP.name + ". A fast close can land on " + scP.name + " as skipping the look. Publish after one look, not after a week of polite circling.",
      "On a trip, " + scP.name + " checks hours, drive, whether it holds. " + siP.name + " checks who is ok. Use both jobs. That is the pairing working, not a fight.",
      "A stuck moment: " + siP.name + " names when the room is in. " + scP.name + " names what still does not sit right. Then stop. Shared patience is the gift. Endless extra rounds are the tax."
    ];
  }
  if(kind === "DI/SI" && diP && siP){
    return [
      "Dinner: " + siP.name + " may hold the table together. " + diP.name + " has often already picked. This is why you like each other some nights: one starts, one holds, the meal happens and people feel in.",
      "On a group text, " + diP.name + " is often the first time on the thread. " + siP.name + " is often still checking who is ok before a yes. The invitation is real. The buy-in is also real. Treat the first time as a starting point.",
      "For a holiday, " + diP.name + " wants a call so people can book. " + siP.name + " wants the room in first. Publish a time, then check that " + siP.name + " is actually in. Hospitality at two clocks.",
      "On a trip or a drive, routing is already happening on " + diP.name + "'s side. A last-minute redo is expensive for " + diP.name + ". " + siP.name + " may still be on who is ok and whether the plan feels kind. Lock after " + siP.name + " is in, not instead of it.",
      "A stuck moment: " + diP.name + " can read a pause as settled. " + siP.name + " may still be checking who is ok. Same-day words. A walk beats a pile-on. The slower yes is not a no until it is said."
    ];
  }
  if(kind === "DI/SC" && diP && scP){
    return [
      "Dinner: " + diP.name + " wants the room in and a path named. " + scP.name + " is checking whether this works. Different jobs at the same table. This is why you like each other when it works: the night starts, and the night holds.",
      "On a group text, " + diP.name + " often sends a time. " + scP.name + " often still wants hours, drive, and a look. The first time is an invitation. The look is care. Do not treat either as a veto of the other.",
      "For a holiday, " + diP.name + " has a time in mind so people can book. " + scP.name + " has whether it seats. Lock after the check, not instead of it, when the call has to hold.",
      "On a trip, leftover D and I want motion and people in. Leftover S and C want runway and a look. Write the departure, then let " + scP.name + " check it, then go.",
      "A stuck moment: leftover D and I versus leftover S and C. Name which job this decision is. Then use both people, once."
    ];
  }
  if(kind === "DI/DC" && diP && dcP){
    return [
      "Dinner: both already decided. " + diP.name + " keeping people in. " + dcP.name + " keeping the look. This is why you like each other: things close, and they are not sloppy.",
      "On a group text, a first yes from " + diP.name + " versus a still-open check from " + dcP.name + ". Treat the yes as a starting point.",
      "For a holiday, name which job this is: people in, or the look. Then do both, once.",
      "On a trip, " + diP.name + " wants to go. " + dcP.name + " wants the routing to be right. Shared close, leftover I versus C.",
      "A stuck moment: people in versus the look. Say which job this decision is, then stop arguing the other one."
    ];
  }
  if(kind === "DC/SC" && dcP && scP){
    return [
      "Dinner: both want it right. " + dcP.name + " is further down the road. " + scP.name + " is still on buy-in. This is why you like each other: the standard is shared.",
      "On a group text, locked time versus people plus a check. Same C, different clock. Send the details, then ask who is ok.",
      "For a holiday, " + dcP.name + " will lock a time and still want it correct. " + scP.name + " will not lock until people are ok and it checks out.",
      "On a trip, use both: a call from " + dcP.name + ", buy-in from " + scP.name + ". Same check, complementary clocks.",
      "A stuck moment: " + dcP.name + " names a call. " + scP.name + " names who is not ok yet. Use both. Then ship."
    ];
  }
  if(an.pairingType === "both" || (an.pairingType === "pace" && an.dVsS)){
    return [
      "Dinner: " + fast.name + " is already on the next subject while " + slow.name + " is still with the last one. When it works, that is range at one table: motion and a hold.",
      "On a group text, " + fast.name + " often sends a time. " + slow.name + " often needs a slower yes. Treat the first time as a starting point.",
      "For a holiday, " + fast.name + " often wants a call so people can book. " + slow.name + " often wants a slower yes so nobody is steamrolled. Publish, then check.",
      "On a trip, " + fast.name + " is already routing. " + slow.name + " is still on buy-in or the look. A last-minute redo is expensive for " + fast.name + ". A skipped beat is expensive for " + slow.name + ".",
      "A stuck moment: " + fast.name + " can treat a pause as settled. " + slow.name + " may still be checking the room. Same-day words. This is why you like each other when you wait: one starts, one keeps it livable."
    ];
  }
  if(an.classic === "S/C" || (an.pairingType === "priority" && A.paceW.pole === "slow")){
    return [
      "Dinner can look calm. " + peopleP.name + " often watching faces. " + taskP.name + " often watching whether this plan holds. This is why you like each other: two jobs, no rush.",
      "On a group text, two polite delays can look like agreement. Ask once for the plan, once for who is ok.",
      "For a holiday you need both jobs: a correct plan and a check that people are actually ok. Not the same question. Write both down.",
      "On a trip, " + taskP.name + " wants hours and drive. " + peopleP.name + " wants who is in. Use both before you leave.",
      "A stuck moment: two polite delays. Name one preference out loud. Smooth is not the same as settled."
    ];
  }
  if(an.sameSide && A.priW.lean === "people"){
    const extra = (iH ? iH.more.name + "'s extra I (" + iH.moreN + " vs " + iH.lessN + ") is a quicker yes. " : "") +
      (sH ? sH.more.name + "'s extra S is buy-in. " : "") +
      (cH ? cH.more.name + "'s extra C is the check." : "");
    return [
      "Dinner looks easy until leftover letters show. " + extra.trim() + " This is why you like each other: the humans are the point.",
      "On a group text, warmth can hide a missing vote. Ask twice, same day, without a pile-on.",
      "For a holiday, someone has to raise the real preference or you will both be fine, and a little resentful.",
      "On a trip, leftover clock or leftover check still matters. Name who starts and who holds.",
      "A stuck moment: do not wait for a louder table. A walk or a same-day check is one way to get the real no."
    ];
  }
  if(an.sameSide && A.priW.lean === "task"){
    const extra = (dH ? dH.more.name + " carries a bit more D (" + dH.moreN + " vs " + dH.lessN + "), a lean toward naming a call. " : "") +
      (cH ? cH.more.name + " carries more C (" + cH.moreN + " vs " + cH.lessN + "), toward another pass on the details." : "");
    return [
      "Home looks compatible on the surface. " + extra.trim() + " This is why you like each other: the plan can actually work.",
      "On a group text, both want it right and neither rushes. The stall is two checks, not a pace war.",
      "For a holiday, pick a time when good enough ships. Shared work-first will not grow a close by accident.",
      "On a trip, hours and drive will get love. Ask who is not ok on purpose. That is the skip.",
      "A stuck moment: the people in the room are what you two will skip. Ask who is not ok before you lock."
    ];
  }
  if(an.sameSide){
    return [
      "Home looks compatible until a leftover letter shows. " + leftoverSentence(an) + " Shared ground is also why you like each other.",
      "On a group text, leftover clock or leftover check still peeks through. Name it.",
      "For a holiday: who closes, who needs runway, who needs the check.",
      "On a trip, write the plan, then ask the leftover question once.",
      "A stuck moment: if nobody raises the real preference, you get a fine evening and a private list."
    ];
  }
  return [
    "Dinner: watch leftover letters. " + leftoverLines(an, 8).slice(0, 2).join(". ") + ".",
    "On a group text, who has already named a time, who needs buy-in, who needs the look.",
    "For a holiday, publish after both jobs have had one pass.",
    "On a trip, leftover clusters show up as routing versus runway.",
    "A stuck moment: name the leftover cluster, then stop. This pairing works when you use both jobs, not when you argue which job is the real one."
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
      "Shared S: give a runway when you can. Buy-in first.",
      siP.name + ": once people feel in, a quicker yes is fair. Another round may chafe.",
      scP.name + ": name what still does not check out. One more look is real. A third round may be stalling."
    ];
    decide = [
      "Split the jobs. " + siP.name + " names when the room is in. " + scP.name + " names whether it works.",
      "Do not use extra rounds as the only method. That can chafe S with I.",
      "Do not skip the look when the call has to hold."
    ];
    time = [
      "A who-is-ok pass, then a close. Then stop.",
      "Details on paper for " + scP.name + " when it has to be right.",
      "When stuck, one more vote or a check of the plan, not both forever.",
      "Use " + siP.name + " to read who is in. Use " + scP.name + " for the look. Then stop re-asking."
    ];
    talk.push("Shared patience is the gift. Spend it on a runway, not on a third round of the same question.");
    decide.push("Name when good enough ships so the check has an end.");
  }else if(kind === "DI/SI" && diP && siP){
    talk = [
      diP.name + ": say the plan in one sentence, then ask what " + siP.name + " needs to be ok. Wait past the first pause.",
      siP.name + ": say the small no while it is still small, the same day, when you can.",
      "A pause is not a yes."
    ];
    decide = [
      "Name whether this is buy-in or already decided.",
      "If people have to live with it, " + siP.name + " often needs a slower yes, then a quicker yes once in.",
      "If it is tonight and it can be wrong, let " + diP.name + " pick and move."
    ];
    time = [
      "A holiday often needs a published time from " + diP.name + " plus a check that " + siP.name + " is actually in.",
      "Dinner can be " + siP.name + "'s room.",
      "When stuck, a walk the same day beats a pile-on.",
      "Use " + diP.name + " to start the night. Use " + siP.name + " to hold it. Trade whose clock the next one is."
    ];
    talk.push("Going first is often invitation. A pause is buy-in. Do not mix those up in the same sentence.");
    decide.push("Treat " + diP.name + "'s first plan as a starting point, not the whole house being in.");
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
      "Not every night is a research tab, and not every night is a locked time. Trade.",
      "Use " + diP.name + " to start. Use " + scP.name + " to make it hold."
    ];
    decide.push("If it can be wrong tonight, let " + diP.name + " pick after one look, not after five.");
  }else if(an.dVsS || an.pairingType === "both"){
    talk = [
      fast.name + " often leads with the point. That is speed, not a verdict on " + slow.name + ".",
      slow.name + " often needs a beat. Do not close in a pile-on. Thirty seconds of quiet is not a stall.",
      "Ask one question you actually want the answer to. " + slow.name + ": say the small no while it is still small, the same day, when you can."
    ];
    decide = [
      "Name whether this is a buy-in decision or an already decided one.",
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
      "A 1:1 is one tool for " + slow.name + "."
    ];
    decide = [
      "Name whether this is buy-in or already decided.",
      "If people have to live with it, " + slow.name + " often needs a slower yes.",
      "If it can be wrong tonight, let " + fast.name + " pick and move."
    ];
    time = [
      "Trade who the night is for: the room, or a close.",
      "A walk for the stuck no.",
      "Holidays get a written time plus a check that nobody got run over."
    ];
  }else if(an.sameSide && A.priW.lean === "people"){
    talk = [
      iH ? ("The extra I in " + iH.more.name + " (" + iH.moreN + " vs " + iH.lessN + ") is a quicker yes once people feel in.") : ("Ask " + A.name + " and " + B.name + " for the real preference, not the warm default."),
      sH ? ("The extra S in " + sH.more.name + " (" + sH.moreN + " vs " + sH.lessN + ") is buy-in.") : "Buy-in is shared. A warm table is not a vote.",
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
      "A pause is not a yes. People in is not a close."
    ];
    decide = [
      "Say who owns this one. One person picks. The other can veto once, with a reason. Then go.",
      leftoverLines(an, 8)[0] || "Name the leftover letter in the room.",
      "Do not use one rule for a buy-in call and a tonight-can-be-wrong call."
    ];
    time = [
      "Trade who picks. One night " + A.name + " chooses the place and the pace. Next night " + B.name + " does.",
      "Holidays get a written time plus a check for anyone who went quiet.",
      "Mix faces and the look."
    ];
  }
  while(talk.length < 4) talk.push("Ask one question you actually want the answer to, then wait.");
  while(decide.length < 4) decide.push("Say who owns this one, then go.");
  while(time.length < 4) time.push("Trade who picks the format.");
  return {talk: talk.slice(0, 4), decide: decide.slice(0, 4), time: time.slice(0, 4)};
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
        return "Once people feel in, say you are ready. " + toward.name + " often still wants a look. Give one more check, not a third round.";
      }
      return "Name what still does not sit right, then stop. " + toward.name + " can hear another vote as stalling. One look is care. Endless extra rounds are the tax.";
    }
    if(kind === "DI/SI" && from.dSide && isSplusI(toward)){
      return "Wait for the slower yes before you treat the plan as closed. Ask " + toward.name + " the same day, not in a pile-on.";
    }
    if(kind === "DI/SI" && isSplusI(from) && toward.dSide){
      return "Say the true sentence while it is still small. " + toward.name + " can take a no. " + toward.name + " cannot use a no you only thought.";
    }
    if(an.diVsSi && from.dSide && toward.si){
      return "Wait for the slower yes before you treat the plan as closed.";
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
    return "Read " + toward.name + "'s four scores, not the badge. Pace first, then priority, then leftover.";
  }
  return {ab: to(A, B), ba: to(B, A)};
}

function namedMoves(an){
  const A = an.A, B = an.B;
  const kind = blendPairKind(A, B);
  const siP = siSnap(an), scP = scSnap(an), diP = diSnap(an);
  function two(from, toward){
    const moves = [];
    if(isDplusI(from)){
      moves.push("Use your gift: start the night. Name a time and a place so " + toward.name + " has something to join.");
    }
    if(isSplusI(from)){
      moves.push("Use your gift: hold the room. After a path is named, say who is ok and who is not.");
    }
    if(isSplusC(from) && from.priW.pole === "people"){
      moves.push("Use your gift: do not close until people have had a say. Ask " + toward.name + " to wait for those voices.");
    }else if(isSplusC(from) || isDplusC(from)){
      moves.push("Use your gift: run the check. Hours, drive, whether it holds. Send " + toward.name + " what you find, then stop.");
    }
    if(from.center){
      moves.push("Use your range. Tell " + toward.name + " which mode you are in tonight, matching or steering, so they are not guessing.");
    }
    if(isDplusI(toward) && moves.length < 3){
      moves.push("Use " + toward.name + " to start the night. A first time is often care. Then say your slower yes the same day.");
    }
    if(isSplusI(toward) && moves.length < 3){
      moves.push("Use " + toward.name + " to hold the room. Ask who is ok after you name a path.");
    }
    if(isSplusC(toward) && toward.priW.pole !== "people" && moves.length < 3){
      moves.push("Use " + toward.name + " for the look when the call has to hold. Send details. Wait for one check.");
    }
    if(from.paceW.lean === "fast" && toward.paceW.lean === "slow"){
      moves.push("After you name a path, ask what " + toward.name + " needs in order to be ok. Wait past the first pause.");
    }
    if(from.paceW.lean === "slow" && toward.paceW.lean === "fast"){
      moves.push("Give " + toward.name + " a yes or a no the same day. " + toward.name + " already moved because that is often care, not a steamroll by default.");
    }
    if(kind === "SI/SC" && siP && scP && from === siP){
      moves.push("Once the room feels in, say you are ready. Give " + toward.name + " one look, not a new poll.");
    }
    if(kind === "SI/SC" && siP && scP && from === scP){
      moves.push("Name the one thing that still does not check out, then stop extra rounds. " + toward.name + " may already be done asking.");
    }
    if(isDplusI(from)){
      moves.push("After the close, look back at whether " + toward.name + " is actually in.");
    }
    if(from.priW.lean === "people" && toward.priW.lean === "task"){
      moves.push("Name one thing about the plan itself, not only about who might be upset.");
    }
    if(from.priW.lean === "task" && toward.priW.lean === "people"){
      moves.push("Ask who is not ok before you lock the details. Correct and lonely is still a miss.");
    }
    an.diffs.filter(function(d){ return d.abs >= 8; }).forEach(function(d){
      const more = d.diff > 0 ? an.A : an.B;
      if(more === from && moves.length < 3){
        moves.push("Your extra " + d.d + " (" + (d.diff > 0 ? d.a : d.b) + ") is " + clusterPhrase(d.d, true) + ". Spend it on " + toward.name + ", then leave room.");
      }
    });
    if(moves.length < 3) moves.push("Ask " + toward.name + " one question you actually want the answer to, then wait.");
    if(moves.length < 3) moves.push("Name your preference in a full sentence.");
    if(moves.length < 3) moves.push("Use the shared ground, then stop pushing the leftover.");
    return uniq(moves).slice(0, 3);
  }
  return {a: two(A, B), b: two(B, A)};
}

function gapSentence(an){
  const A = an.A, B = an.B;
  const p1 = sliderLine(A);
  const p2 = sliderLine(B);
  let which;
  if(an.largerGap === "both"){
    which = "The two gaps are about the same size. You will feel both.";
  }else if(an.largerGap === "pace"){
    which = "The bigger gap is pace. Clock first, then what the clock is for.";
  }else{
    which = "The bigger gap is priority. What the night is for, more than how fast it moves.";
  }
  return p1 + " " + p2 + " " + which;
}

function pairCopy(a, b){
  const an = pairAnalysis(a, b);
  const kind = blendPairKind(an.A, an.B);
  an.blendKind = kind;
  const similar = similarParagraphs(an);
  const working = pairWorking(an);
  const rubs = rubParagraphs(an);
  const br = brings(an);
  const home = atHome(an);
  const tdt = talkDecideTime(an);
  const tp = tips(an);
  const mv = namedMoves(an);
  let typeLabel;
  if(kind === "SI/SC") typeLabel = "Same patience, leftover I versus C.";
  else if(kind === "DI/SI") typeLabel = "Same people-first, different clock.";
  else if(kind === "DI/SC") typeLabel = "Already decided versus buy-in plus a check.";
  else if(kind === "DI/DC") typeLabel = "Shared close. Leftover I versus C.";
  else if(kind === "DC/SC") typeLabel = "Shared check. Leftover D versus S.";
  else if(an.pairingType === "both") typeLabel = "Different clock, different job.";
  else if(an.pairingType === "pace" && an.classic === "I/S") typeLabel = "Same people-first, different clock.";
  else if(an.pairingType === "pace") typeLabel = "Same-ish priority, different clock.";
  else if(an.pairingType === "priority") typeLabel = "Same-ish pace, different priority.";
  else if(an.pairingType === "same-side") typeLabel = "Same side of both sliders. The leftover still counts.";
  else typeLabel = "One person sits near the middle. Name the leftover without inventing a type.";
  return {
    analysis: an,
    lede: gapSentence(an),
    typeLabel: typeLabel,
    scaleReads: continuaReads(an),
    similar: similar,
    similarBlind: blindSpot(an),
    working: working,
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
    predictions: [],
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
