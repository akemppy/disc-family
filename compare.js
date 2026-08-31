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
  if(Math.abs(n) < 8) return {key:"even", phrase:"near even on pace", short:"near even", pole:"mixed", dir:0, lean:lean};
  if(Math.abs(n) < EVEN_BAND) return {key:lean, phrase:"slightly "+lean, short:"slight "+lean, pole:lean, dir:n>0?1:-1, lean:lean};
  if(n > 0) return {key:"fast", phrase:(n >= VERY_BAND ? "very fast" : "fast"), short:(n >= VERY_BAND ? "very fast" : "fast"), pole:"fast", dir:1, lean:"fast"};
  return {key:"slow", phrase:(n <= -VERY_BAND ? "very slow" : "slow"), short:(n <= -VERY_BAND ? "very slow" : "slow"), pole:"slow", dir:-1, lean:"slow"};
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
  const N = Nof(p), ord = orderOf(p), sh = shapeOf(p), k = keyOf(p);
  if(sh === "primary" && k) return [k];
  if(sh === "blend" && k) return [...k];
  return ord.slice(0, 2);
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

function leftoverSentence(an){
  const {A, B, diffs} = an;
  const top = diffs.filter(d=>d.abs >= 8).slice(0, 3);
  if(!top.length){
    return A.name + " and " + B.name + " sit close on all four scores. The leftover is small. Name it anyway, rather than assuming you match in every room.";
  }
  const bits = top.map(d=>{
    if(d.diff > 0) return A.name + " runs higher " + d.d + " (" + d.a + " vs " + d.b + ")";
    return B.name + " runs higher " + d.d + " (" + d.b + " vs " + d.a + ")";
  });
  return "On the four scores, " + bits.join("; ") + ". That leftover is the real gap once the badges look the same.";
}

function personHome(p){
  const S = personSnapshot(p);
  const n = S.name;
  const N = S.N;
  const scores = "D " + N.D + ", I " + N.I + ", S " + N.S + ", C " + N.C;
  const lede = n + " is " + S.paceW.phrase + " and " + S.priW.phrase + ". Scores: " + scores + ".";

  let table;
  if(S.center){
    table = "At a table, " + n + " does not run one default. Some nights that looks like listening. Some nights that looks like steering. People who only see one night will swear " + n + " is a different person than the one they met last holiday.";
  }else if(S.paceW.pole === "fast" && S.priW.pole === "people"){
    table = "At a table, " + n + " is already in the conversation. Ideas land out loud. The room gets warmer and faster. The D pull means once " + n + " sees a path, the next sentence is often an invitation to come along, which can feel like a decision to anyone still chewing.";
  }else if(S.paceW.pole === "fast" && S.priW.pole === "task"){
    table = "At a table, " + n + " wants the point. Stories get shortened. Someone is going to name the plan before dessert, and it will probably be " + n + ".";
  }else if(S.paceW.pole === "slow" && S.priW.pole === "task"){
    table = "At a table, " + n + " is not in a hurry to fill the air. The reservation, the drive, whether this actually works: that is the quiet work happening while other people are still riffing. Interrupt that mid-thought and it lands as chaos, not as fun.";
  }else if(S.paceW.pole === "slow" && S.priW.pole === "people"){
    table = "At a table, " + n + " is tracking who has not spoken yet. Equal turns matter more than a tight agenda. A loud table is work. A 1:1 after dinner is often where " + n + " actually says the thing.";
  }else if(S.paceW.pole === "slow"){
    table = "At a table, " + n + " prefers a runway. The meal can be the point. Being rushed to pick, to joke, to close a plan is the tax.";
  }else if(S.paceW.pole === "fast"){
    table = "At a table, " + n + " brings motion. Silence feels like a stall. Someone has to start, and " + n + " will.";
  }else{
    table = "At a table, " + n + " flexes. Watch what the night is asking for, because " + n + " will often match it.";
  }

  let plan;
  if(S.center){
    plan = "On a plan, " + n + " can lock a time or wait to hear who is coming. Do not assume either move is the real " + n + ". Ask which one this plan needs.";
  }else if(S.paceW.pole === "fast" && S.priW.pole === "people"){
    plan = "On a plan, " + n + " has often already moved: restaurant, time, a text in the group chat. People-priority means " + n + " still wants the room in, but buy-in is something " + n + " tries to create by going first, not by waiting. Anyone who needed a slower yes will feel skipped even when they were invited.";
  }else if(S.paceW.pole === "fast"){
    plan = "On a plan, " + n + " picks. Waiting for every vote feels like the plan dying. The restaurant gets chosen. The time gets sent.";
  }else if(S.priW.pole === "people"){
    plan = "On a plan, " + n + " waits to ask everyone. Holidays, group chat, who is actually coming: the plan is not real until the people in the room are ok. A 1:1 is safer than a pile-on.";
  }else if(S.priW.pole === "task"){
    plan = "On a plan, " + n + " wants it to be right. Hours, drive, cost, whether the place can actually seat this many. Speed without that check reads as sloppy, not as leadership.";
  }else{
    plan = "On a plan, " + n + " sits between locking it and waiting. Give a little runway and a clear ask.";
  }

  let pressure;
  if(S.center){
    pressure = "Under pressure, " + n + " shifts. There is no single tell. Ask what they need, then wait.";
  }else if(S.paceW.pole === "fast"){
    pressure = "Under pressure, " + n + " gets faster and more certain. Empathy is the first thing to thin out. The quiet person in the room will look settled when they are only stunned.";
  }else if(S.priW.pole === "task"){
    pressure = "Under pressure, " + n + " goes quieter and tighter. Mistakes feel more expensive than delay. The room may read that as withdrawal. It is usually an attempt to get it right.";
  }else if(S.priW.pole === "people"){
    pressure = "Under pressure, " + n + " tends the people. Feelings get smoothed. The actual problem can wait one beat too many, and then it looks like it came out of nowhere.";
  }else{
    pressure = "Under pressure, " + n + " slows down rather than speeding up. Give time, not a spotlight.";
  }

  return {name:n, lede, scores, table, plan, pressure, snapshot:S};
}

function copyDS(fast, slow){
  return [
    fast.name + " lives at a faster clock. " + slow.name + " lives at a steadier one. That is pace, and it is usually the louder stress. Priority is next: " + fast.name + " will often treat a decision as live once they can see it. " + slow.name + " treats a decision as live once the people in the room have had a chance to be ok with it.",
    "Directness from " + fast.name + " is often just speed. It can land on " + slow.name + " as intensity. " + slow.name + " going quiet is not a yes. It is processing. If " + fast.name + " takes the quiet as settled, the real answer shows up later, and it feels like a change of heart only because it was never invited while the plan was still soft.",
    "At home this looks like urgency versus steadiness. Already decided versus need-the-room-ok. One person is down the road. The other is still checking the room."
  ];
}
function copyIC(fastPeople, slowTask){
  return [
    fastPeople.name + " wants motion and connection in the same move: talk it out, feel the room, go. " + slowTask.name + " wants it to be right before it is loud. That is both sliders. Pace (live conversation versus time to think) and priority (the people versus the work of getting it correct).",
    "A group chat lights " + fastPeople.name + " up and drains " + slowTask.name + ". A quiet check of the details does the reverse. Neither is a character flaw. It is where the battery is."
  ];
}
function copyIS(fast, slow){
  return [
    "Same people-priority, different pace. Both care that the humans in the room are ok. They disagree about when a plan is real. " + fast.name + " often feels it is real once it has been said out loud. " + slow.name + " feels it is real once there has been buy-in, a slower yes, a sense that nobody got run over.",
    "That is the already-moved versus buy-in gap. It is pace talking, with people-priority underneath. " + fast.name + " going first can look like care (I set it up so everyone can come). " + slow.name + " asking who is actually ok with it can look like drag (we already decided). Both are trying to take care of the same room.",
    "Volume versus quiet shows up at dinner and in the group chat. " + fast.name + " fills space. " + slow.name + " waits for a turn that may never be handed over unless someone makes a 1:1."
  ];
}
function copyDC(fast, slow){
  return [
    "Same work-priority, different pace. Both want the plan to be correct. They disagree about speed versus accuracy. " + fast.name + " will pick the restaurant and fix it if it is wrong. " + slow.name + " would rather check hours, drive, and whether this actually works before anyone is in the car.",
    "At home this is the locked time versus the still-researching tab. Neither is ignoring the work. They start it at different clocks."
  ];
}
function copySC(taskP, peopleP){
  return [
    "Same slow pace, different priority. Classic split inside a steady house: harmony versus getting it right. " + peopleP.name + " is watching whether everyone is ok. " + taskP.name + " is watching whether the plan holds up.",
    "Because neither rushes, this can look like peace. The rub is quieter. " + peopleP.name + " will delay a hard call to keep the room smooth. " + taskP.name + " will delay a yes until the details sit right. A holiday, a restaurant, a group text: one is asking who feels left out, the other is asking whether this is the right call.",
    "1:1 favors the true sentence. A big equal-turn gathering favors " + peopleP.name + ". The hours and the drive favor " + taskP.name + ". Use both, on purpose."
  ];
}
function copyDI(taskP, peopleP){
  return [
    "Same fast pace, different priority. Both want to move. They disagree about what the move is for. " + taskP.name + " is closing a result. " + peopleP.name + " is keeping the connection.",
    "At home this is locking the plan versus making sure the people in the room still feel in it. Speed is not the argument. Who the speed is serving is."
  ];
}
function copySameLetter(letter, A, B){
  if(letter === "D"){
    return "Two D pulls in one house. The leftover rub is who decides. Split the call before anyone grabs the wheel: this holiday " + A.name + " picks the place, next one " + B.name + " does. Compete with the plan, not with each other.";
  }
  if(letter === "I"){
    return "Two I pulls. Airtime is the scarce thing. Fun is easy. Closing is not. Decide out loud who owns the follow-through before the good part of the night ends, or the plan stays a vibe.";
  }
  if(letter === "S"){
    return "Two S primaries. The house stays smooth, and the real thing can retire unspoken. Harmony is the gift. The tax is that nobody raises the hard sentence until it has been heavy for a while. Put a 1:1 on the calendar when something feels off, not only when it breaks.";
  }
  if(letter === "C"){
    return "Two C pulls. Both are sure. The method may differ. You can spend a whole afternoon being right at each other. Agree which decisions deserve the full check and which get a good-enough call by tonight.";
  }
  return "";
}

function similarParagraphs(an){
  const {A, B, samePace, samePriority, sameSide, pairingType, sameLetter, iOverlap} = an;
  const out = [];
  if(sameSide){
    const priBit = A.priW.lean === "people" ? "the people in the room" : "the work";
    out.push(A.name + " and " + B.name + " sit on the same side of both sliders: " + A.paceW.lean + " pace, " + priBit + ". The easy read is that you two should just get along. The honest read is that the leftover still rubs, and the shared wiring has a shared blind spot.");
  }else if(samePace){
    out.push("Pace is shared: both " + A.paceW.lean + ". You two share a clock. A fast and a slow pairing does not. The gap that remains is priority.");
  }else if(samePriority){
    out.push("Priority is shared: both " + (A.priW.lean === "people" ? "tuned to the people in the room" : "tuned to the work of getting it right") + ". You will recognize each other's values. The gap that remains is pace: when a plan counts as real.");
  }else if(A.center || B.center){
    const c = A.center ? A : B;
    const o = c === A ? B : A;
    out.push(c.name + " sits near the middle of both sliders. There is not a huge opposite-poles story here. " + o.name + " will feel a small lean, not a wall.");
  }else{
    out.push("Look at the continua below. Where the dots sit close, that is shared wiring. It is also where you will both miss the same thing.");
  }
  if(iOverlap && !sameSide){
    out.push("Shared I is the easy overlap: fun, talk, a quicker yes when the mood is good. That is real. Do not let it hide the D versus S tax if one of you has already moved while the other still needs the room.");
  }
  if(sameLetter){
    const sl = copySameLetter(A.primary, A, B);
    if(sl) out.push(sl);
  }
  const close = an.similarPoles.filter(c=>c.id !== "pace" && c.id !== "priority" ? c.gap < SIMILAR_CONT : c.gap < SIMILAR_CONT);
  const named = an.topContinua.filter(c=>c.gap < SIMILAR_CONT);
  if(named.length){
    out.push("Closest continua: " + named.map(c=>{
      const side = poleSide((c.posA + c.posB) / 2);
      const pole = side === "left" ? c.left : (side === "right" ? c.right : "the middle of " + c.left + " / " + c.right);
      return c.left + " vs " + c.right + " (both toward " + pole + ")";
    }).join("; ") + ".");
  }
  return out;
}

function blindSpot(an){
  const {A, B, sameSide, samePace, samePriority, pairingType, sameLetter} = an;
  const bits = [];
  if(sameSide && A.paceW.lean === "slow" && A.priW.lean === "task"){
    bits.push("the people in the room, and speed. You can get the plan right and still leave someone unasked. You can also wait past the moment a faster person needed a yes. Ask who is not ok, out loud. Then pick a time and actually go.");
  }else if(sameSide && A.paceW.lean === "slow" && A.priW.lean === "people"){
    bits.push("the hard call, and motion without a full vote. You will protect the room and still need someone to name the thing and pick a restaurant.");
  }else if(sameSide && A.paceW.lean === "fast"){
    bits.push("the brake. Nobody here is naturally the runway. Build one on purpose for the slower people in the house.");
  }else if(samePace && A.paceW.lean === "slow"){
    bits.push("speed. Between you, plans get a runway. The house still has faster wiring in it. Do not treat delay as the only kind of care.");
  }else if(samePriority && A.priW.lean === "people"){
    bits.push("closing the work. Everyone being ok is not the same as a time, a place, and a yes.");
  }else if(samePriority && A.priW.lean === "task"){
    bits.push("whether the people in the room are actually ok, not just whether the plan is correct.");
  }
  if(sameLetter && A.primary === "S"){
    bits.push("Nobody raises the real thing. Smooth is not the same as settled. A 1:1, the same week, is the fix.");
  }else if(sameLetter && A.primary === "C"){
    bits.push("Two right answers, no close. Pick a time when good enough ships.");
  }else if(sameLetter && A.primary === "I"){
    bits.push("Airtime and no close. Fun was had. The plan still needs an owner.");
  }else if(sameLetter && A.primary === "D"){
    bits.push("Who decides. Two steering wheels. Name the owner before the outing.");
  }
  if(bits.length){
    return "Shared blind spot: " + bits.join(" ");
  }
  if(pairingType === "both"){
    return "You do not share a pole to hide in. The gift is range. The cost is translation, every week.";
  }
  return "Where you match, you will both miss the same corner of the room. Ask the person who sits opposite you on the family map what you two are skipping.";
}

function rubParagraphs(an){
  const {A, B, pairingType, classic, dVsS, diVsSi, largerGap, nearCenterA, nearCenterB} = an;
  const out = [];
  if(nearCenterA && nearCenterB){
    out.push("The gaps are small. Forcing a big opposite-poles story would be inventing one. " + leftoverSentence(an) + " Use that leftover when a night feels slightly off, and skip the myth that you two are a dramatic pairing.");
    return out;
  }
  if(nearCenterA || nearCenterB){
    const c = nearCenterA ? A : B;
    const o = c === A ? B : A;
    out.push(c.name + " is near the center. " + o.name + " will feel some of their own wiring more sharply next to a flexible person, because " + c.name + " can match for a while and then not. Name the small gaps. Do not cast " + c.name + " as a secret opposite.");
    out.push(leftoverSentence(an));
    return out.filter(Boolean);
  }

  if(pairingType === "both" && classic === "D/S"){
    const fast = A.pace > B.pace ? A : B;
    const slow = fast === A ? B : A;
    copyDS(fast, slow).forEach(s=>out.push(s));
  }else if(pairingType === "both" && classic === "I/C"){
    const fast = A.pace > B.pace ? A : B;
    const slow = fast === A ? B : A;
    copyIC(fast, slow).forEach(s=>out.push(s));
    if(dVsS){
      const dh = A.dHeavy ? A : B;
      const sh = dh === A ? B : A;
      out.push("Underneath that, " + dh.name + "'s D still meets " + sh.name + "'s S: urgency versus steadiness. The quiet after a direct sentence is not a close.");
    }
  }else if(pairingType === "pace" && classic === "I/S"){
    const fast = A.pace > B.pace ? A : B;
    const slow = fast === A ? B : A;
    copyIS(fast, slow).forEach(s=>out.push(s));
    if(dVsS){
      const dh = A.dHeavy ? A : B;
      const sh = dh === A ? B : A;
      out.push("The D in " + dh.name + " still rubs the S in " + sh.name + ", even though you share people-priority. Already-moved versus buy-in is that letter pair talking. Directness lands as intensity. Quiet lands as mystery. It is wiring.");
    }
  }else if(pairingType === "pace" && classic === "D/C"){
    const fast = A.pace > B.pace ? A : B;
    const slow = fast === A ? B : A;
    copyDC(fast, slow).forEach(s=>out.push(s));
  }else if(pairingType === "priority" && classic === "S/C"){
    const taskP = A.pri > B.pri ? A : B;
    const peopleP = taskP === A ? B : A;
    copySC(taskP, peopleP).forEach(s=>out.push(s));
  }else if(pairingType === "priority" && classic === "D/I"){
    const taskP = A.pri > B.pri ? A : B;
    const peopleP = taskP === A ? B : A;
    copyDI(taskP, peopleP).forEach(s=>out.push(s));
  }else if(pairingType === "same-side"){
    out.push(leftoverSentence(an));
    const moreD = an.diffs.find(d=>d.d === "D");
    const moreI = an.diffs.find(d=>d.d === "I");
    const moreC = an.diffs.find(d=>d.d === "C");
    const bothSC = (A.key.indexOf("S") >= 0 && B.key.indexOf("S") >= 0 && (A.key.indexOf("C") >= 0 || A.order[1]==="C") && (B.key.indexOf("C") >= 0 || B.order[1]==="C"));
    if(bothSC){
      let sc = "Two SC patterns. The leftover D or I is the weather. ";
      if(moreD && moreD.abs >= 5) sc += (moreD.diff > 0 ? A.name : B.name) + " carries a bit more D, which is the one more willing to name a call. ";
      if(moreI && moreI.abs >= 5) sc += (moreI.diff > 0 ? A.name : B.name) + " carries more I, which is the one more willing to talk before the plan is perfect.";
      out.push(sc.trim());
    }
    if(A.priW.lean === "people" && B.priW.lean === "people" && moreI && moreC && moreI.abs >= 8){
      const talker = moreI.diff > 0 ? A : B;
      const quieter = talker === A ? B : A;
      out.push("People with people, pace adjacent: volume versus quiet. " + talker.name + " has more I, spark and talk. " + quieter.name + " has more C, quiet and getting it right. Same care for the room. Different volume in it.");
    }
    if(largerGap === "pace"){
      out.push("Even on the same side, pace is the wider gap. One of you is ready a little sooner. That little sooner is a whole evening if nobody names it.");
    }else if(largerGap === "priority"){
      out.push("Even on the same side, priority is the wider gap. One of you leans a little more toward the work, the other toward the people. Small, and it will still show up when you pick a restaurant.");
    }
  }else if(pairingType === "center"){
    out.push("Small gaps. " + leftoverSentence(an));
  }else{
    if(dVsS){
      const fast = A.pace > B.pace ? A : B;
      const slow = fast === A ? B : A;
      copyDS(fast, slow).forEach(s=>out.push(s));
    }else{
      out.push(leftoverSentence(an));
    }
  }

  if(diVsSi){
    const diP = A.di || (A.dSide && !A.si) ? A : B;
    const siP = diP === A ? B : A;
    out.push("When a DI or D pattern sits next to an S with I (harmony plus spark), the shared I is the fun: talking, laughing, a quick yes when you are aligned. The tax is not the I. The tax is D versus S. " + diP.name + " has often already moved. " + siP.name + " still wants the people in the room to be ok. Keep the fun. Budget time for the slower yes.");
  }

  const topRub = an.rubPoles[0];
  if(topRub && topRub.gap >= 28){
    const leftPerson = topRub.posA < topRub.posB ? A : B;
    const rightPerson = leftPerson === A ? B : A;
    const leftPos = leftPerson === A ? topRub.posA : topRub.posB;
    const rightPos = rightPerson === A ? topRub.posA : topRub.posB;
    out.push("On " + topRub.left + " versus " + topRub.right + ", " + leftPerson.name + " sits toward " + topRub.left.toLowerCase() + " and " + rightPerson.name + " toward " + topRub.right.toLowerCase() + ". That is one of the wider gaps. It will show up in tone as much as in plans.");
  }
  return out.filter(Boolean);
}

function brings(an){
  const {A, B} = an;
  function one(S){
    const bits = [];
    if(S.paceW.lean === "fast") bits.push("motion, a first yes, the thing that gets the night started");
    if(S.paceW.lean === "slow") bits.push("a runway, a steady presence, the thing that keeps the night from spinning");
    if(S.priW.lean === "people") bits.push("an eye on who has not spoken, buy-in, warmth");
    if(S.priW.lean === "task") bits.push("the check that the plan actually works, a standard, a memory for the details");
    if(S.center) bits.push("range: " + S.name + " can meet people in more than one mode");
    if(S.iPresent) bits.push("spark when the room is safe enough");
    if(!bits.length) bits.push("their actual four scores, used on purpose");
    return S.name + " brings " + bits.slice(0, 3).join("; ") + ".";
  }
  return {a: one(A), b: one(B)};
}

function atHome(an){
  const {A, B, pairingType, classic, sameSide, dVsS} = an;
  const out = [];
  const fast = A.pace >= B.pace ? A : B;
  const slow = fast === A ? B : A;
  const taskP = A.pri >= B.pri ? A : B;
  const peopleP = taskP === A ? B : A;

  if(pairingType === "both" || (pairingType === "pace" && dVsS)){
    out.push("Dinner: " + fast.name + " is already on the next subject while " + slow.name + " is still with the last one. Group chat: " + fast.name + " drops a time. " + slow.name + " is still asking who is coming. Holidays: " + fast.name + " wants a call so people can book. " + slow.name + " wants a round of 1:1s so nobody is steamrolled. Restaurant: " + fast.name + " picks. " + slow.name + " would have asked the table.");
  }else if(classic === "S/C" || (pairingType === "priority" && A.paceW.pole === "slow")){
    out.push("Dinner can look calm from the outside. The split is what you are protecting. " + peopleP.name + " is watching faces. " + taskP.name + " is watching whether this plan holds. Group chat stays polite. The real preference often lives in a 1:1. Holidays need both: a correct plan and a check that the quiet person is actually ok.");
  }else if(sameSide && A.priW.lean === "people"){
    const moreI = an.diffs.find(d=>d.d === "I");
    const talker = moreI && moreI.diff > 0 ? A : B;
    const quieter = talker === A ? B : A;
    out.push("Dinner looks easy until volume shows. " + talker.name + " talks. " + quieter.name + " waits. Group chat favors " + talker.name + ". A 1:1 is where " + quieter.name + " actually votes. Holidays: someone has to raise the real preference or you will both be fine, and a little resentful. Restaurant: " + talker.name + " will float a place. " + quieter.name + " will go along unless asked twice.");
  }else if(sameSide && A.priW.lean === "task"){
    out.push("Home looks compatible until a leftover letter shows. Who texts first, who waits, who cares more that the reservation is right versus that someone was invited: that is the four-score gap, not the badge. If nobody raises the real preference, you will get a correct evening and a private list. The people in the room are the thing you two will skip.");
  }else if(sameSide){
    out.push("Home looks compatible until a leftover letter shows. Who texts first, who waits, who cares more that the reservation is right versus that someone was invited: that is the four-score gap, not the badge. If nobody raises the real preference, you will get a fine evening and a private list.");
  }else{
    out.push("Watch who picks the restaurant and who waits to ask everyone. Watch who is fine in the group chat and who saves the true sentence for a 1:1. That is this pairing, in the house.");
  }
  return out;
}

function talkDecideTime(an){
  const {A, B, pairingType, classic, dVsS, sameLetter} = an;
  const fast = A.pace >= B.pace ? A : B;
  const slow = fast === A ? B : A;
  const taskP = A.pri >= B.pri ? A : B;
  const peopleP = taskP === A ? B : A;

  let talk;
  if(dVsS || pairingType === "both"){
    talk = "How to talk: " + fast.name + " leads with the point. That is speed, not a verdict on " + slow.name + ". " + slow.name + " needs a beat, and often a smaller room. Do not close in the group chat. Say the thing once, plainly, then wait. Thirty seconds of quiet is not a stall. Ask one question you actually want the answer to. " + slow.name + ": say the small no while it is still small, in a 1:1, the same day.";
  }else if(classic === "S/C"){
    talk = "How to talk: keep the volume down. Both of you hear better without an audience. " + peopleP.name + " needs a check-in that is actually about feelings. " + taskP.name + " needs the details in a form they can look at twice. Put the preference in words once. Do not assume the calm means agreement.";
  }else if(classic === "I/S"){
    talk = "How to talk: " + fast.name + " thinks out loud. " + slow.name + " thinks, then talks. Match that on purpose. Warm up, then ask, then wait. Do not fill " + slow.name + "'s pause. Do not make " + fast.name + " sit on the idea until it goes cold. A 1:1 beats a pile-on for " + slow.name + ".";
  }else if(an.sameSide && A.priW.lean === "people"){
    const moreI = an.diffs.find(d=>d.d === "I");
    const talker = moreI && moreI.diff > 0 ? A : B;
    const quieter = talker === A ? B : A;
    talk = "How to talk: " + talker.name + " fills space. " + quieter.name + " needs a pause that actually stays empty. Ask " + quieter.name + " in a 1:1, then wait. " + talker.name + ": the spark is welcome. The second question is whether " + quieter.name + " got a turn.";
  }else if(an.sameSide && A.priW.lean === "task"){
    talk = "How to talk: you two will default to the plan. Name the people in the room on purpose. Put one preference in words even if it is small. Quiet is not a vote.";
  }else if(A.center || B.center){
    talk = "How to talk: do not assume a default opening. Ask which mode this conversation needs. Then one of you speak, and the other wait.";
  }else{
    talk = "How to talk: use the continua. If one of you is frank and the other is tactful, soften the first sentence and keep the point. If one is private and the other is outgoing, skip the group thread for anything that matters.";
  }

  let decide;
  if(classic === "I/S" || (pairingType === "pace" && dVsS)){
    decide = "How to decide: name whether this is a buy-in decision or an already-moved decision. If people have to live with it (holidays, who hosts, who is in the car), " + slow.name + " needs a slower yes. If it is tonight's restaurant and it can be wrong, let " + fast.name + " pick and move. Do not use one rule for both kinds of call.";
  }else if(classic === "S/C"){
    decide = "How to decide: split the job. " + taskP.name + " checks whether it works. " + peopleP.name + " checks who is left out. Both have to say yes, or the quiet no will arrive after the reservation.";
  }else if(classic === "D/C"){
    decide = "How to decide: pick a time when the check is done. " + fast.name + " does not get to skip the look. " + slow.name + " does not get an endless look. Good enough by this afternoon is a real standard.";
  }else if(sameLetter && A.primary === "S"){
    decide = "How to decide: one of you has to raise the real preference. Take turns being that person. A coin flip is kinder than two polite maybes.";
  }else{
    decide = "How to decide: say who owns this one. One person picks the restaurant. The other can veto once, with a reason. Then go.";
  }

  let time;
  if(peopleP !== taskP && (classic === "S/C" || classic === "I/S" || pairingType === "both")){
    time = "How to spend time: mix the formats. Group dinner and the chaotic family thread feed the people-priority wiring. A walk or a 1:1 is where the slower S or C actually talks. Holidays need a published plan and a private check. Do not make every night a town hall. Do not make every night a closed call between two people either.";
  }else if(pairingType === "same-side"){
    time = "How to spend time: your default night will feel easy, which is why you should schedule the slightly harder format on purpose. If you both like quiet, host once in a while. If you both like the plan to be right, pick a place without a twenty-minute compare. Invite one person who sits elsewhere on the family map when you need range.";
  }else{
    time = "How to spend time: trade who picks. One night " + A.name + " chooses the place and the pace. Next night " + B.name + " does. Holidays get a written time plus a 1:1 for anyone who went quiet in the group chat.";
  }
  return {talk, decide, time};
}

function tips(an){
  const {A, B, pairingType, classic, dVsS, diVsSi} = an;
  const fast = A.pace >= B.pace ? A : B;
  const slow = fast === A ? B : A;
  const taskP = A.pri >= B.pri ? A : B;
  const peopleP = taskP === A ? B : A;

  function to(from, toward){
    if(diVsSi && from.dSide && toward.si){
      return "Keep the fun. Then wait for the slower yes before you treat the plan as closed. Ask " + toward.name + " in a 1:1, not in the group thread.";
    }
    if(diVsSi && toward.dSide && from.si){
      return "Say the true sentence while it is still small. " + toward.name + " can take a no. " + toward.name + " cannot use a no you only thought.";
    }
    if(dVsS && from === fast){
      return "Say the plan in one sentence, then ask what " + toward.name + " needs in order to be ok with it. Wait. Do not fill the pause.";
    }
    if(dVsS && from === slow){
      return "Give the no (or the real yes) the same day, in private. Quiet is not a message " + toward.name + " can read.";
    }
    if(classic === "S/C" && from === peopleP){
      return "Name one preference about the plan itself, not only about who might be upset. " + toward.name + " is trying to get it right, and needs your actual vote.";
    }
    if(classic === "S/C" && from === taskP){
      return "Ask who is not ok, before you lock the details. Correct and lonely is still a miss.";
    }
    if(classic === "I/S" && from === fast){
      return "Invite, then wait. Buy-in is slower than your mouth. A 1:1 after the group chat is not extra. It is the whole method.";
    }
    if(classic === "I/S" && from === slow){
      return "A late yes is fine. A silent maybe is not. " + toward.name + " already moved because that is how they care. Catch them up with words.";
    }
    if(from.center){
      return "Tell " + toward.name + " which mode you are in tonight, matching or steering, so they are not guessing.";
    }
    if(toward.center){
      return "Ask " + toward.name + " what they actually think, then wait. The mix means the first shrug might not be the answer.";
    }
    if(an.sameSide && A.priW.lean === "people"){
      const moreI = an.diffs.find(d=>d.d === "I");
      const talker = moreI && moreI.diff > 0 ? A : B;
      if(from === talker){
        return "Leave a pause after you float the plan. Ask " + toward.name + " once, in a 1:1, and treat the first quiet as thinking, not as yes.";
      }
      return "Say the true sentence while it is still small. " + toward.name + " will keep talking if you do not. A 1:1 is enough.";
    }
    if(an.sameSide && A.priW.lean === "task"){
      const moreD = an.diffs.find(d=>d.d === "D");
      const moreI = an.diffs.find(d=>d.d === "I");
      const moreC = an.diffs.find(d=>d.d === "C");
      if(moreC && from === (moreC.diff > 0 ? A : B)){
        return "Keep the check. Then ask who we have not asked. Correct and lonely is still a miss for this house.";
      }
      if(moreD && from === (moreD.diff > 0 ? A : B)){
        return "Your extra D can name the call. Name it, then look at " + toward.name + " and wait for the real yes.";
      }
      if(moreI && from === (moreI.diff > 0 ? A : B)){
        return "Your extra I can open the room. Use it to ask the people " + toward.name + " will forget while getting it right.";
      }
    }
    if(an.sameSide){
      const d0 = an.diffs[0];
      if(from === (d0.diff > 0 ? A : B)){
        return "Your extra " + d0.d + " is useful. Use it to name the thing " + toward.name + " will not raise, then stop pushing.";
      }
      return "Say your preference in a full sentence. " + toward.name + "'s extra " + d0.d + " will fill the space if you do not.";
    }
    return "Match " + toward.name + "'s pace first, then priority. Read the sliders, not the badge.";
  }
  return {ab: to(A, B), ba: to(B, A)};
}

function gapSentence(an){
  const {A, B, paceGap, priGap, largerGap} = an;
  const p1 = A.name + " is " + A.paceW.phrase + " (pace " + (A.pace > 0 ? "+" : "") + A.pace + ") and " + A.priW.phrase + " (priority " + (A.pri > 0 ? "+" : "") + A.pri + ").";
  const p2 = B.name + " is " + B.paceW.phrase + " (pace " + (B.pace > 0 ? "+" : "") + B.pace + ") and " + B.priW.phrase + " (priority " + (B.pri > 0 ? "+" : "") + B.pri + ").";
  let which;
  if(largerGap === "both"){
    which = "The two gaps are about the same size. You will feel both.";
  }else if(largerGap === "pace"){
    which = "The bigger gap is pace (" + Math.round(paceGap) + " vs " + Math.round(priGap) + " on priority). Clock first, then what the clock is for.";
  }else{
    which = "The bigger gap is priority (" + Math.round(priGap) + " vs " + Math.round(paceGap) + " on pace). What the night is for, more than how fast it moves.";
  }
  return p1 + " " + p2 + " " + which;
}

function pairCopy(a, b){
  const an = pairAnalysis(a, b);
  const similar = similarParagraphs(an);
  const rubs = rubParagraphs(an);
  const br = brings(an);
  const home = atHome(an);
  const tdt = talkDecideTime(an);
  const tp = tips(an);
  let typeLabel;
  if(an.pairingType === "both") typeLabel = "Both sliders differ. Pace is usually the louder stress.";
  else if(an.pairingType === "pace") typeLabel = "Different pace, closer on priority.";
  else if(an.pairingType === "priority") typeLabel = "Same-ish pace, different priority.";
  else if(an.pairingType === "same-side") typeLabel = "Same side of both sliders. The leftover still counts.";
  else typeLabel = "One person sits near the middle. Name the leftover without inventing a type.";
  if(an.diVsSi) typeLabel += " Shared I, with a D versus S tax.";
  return {
    analysis: an,
    lede: gapSentence(an),
    typeLabel: typeLabel,
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
    tipBA: tp.ba
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
