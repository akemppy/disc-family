/* compare.js — the reading layer.
   Math first (snapshots, sliders, continua), then the writing:
   PERSON_READS / PAIR_READS are hand-written for the people currently in
   people.js, keyed by id. Anyone added later gets a generated read until a
   bespoke one is written — see README. Every number quoted in generated copy
   comes live from FACTS (facts.js), so data edits update the prose.

   House rule on hedging: the honesty note lives once, in the page footer.
   Body copy is allowed to say things. */

const EVEN_BAND = 20;
const VERY_BAND = 80;
const TINY_CONT = 10;

function clamp100(n){ return Math.max(0, Math.min(100, n)); }
function firstName(p){ return String(p.name || "").split(" ")[0]; }
function Nof(p){ return (p.result && p.result.N) ? p.result.N : p.N; }
function orderOf(p){
  if (p.result && p.result.order) return p.result.order;
  if (p.order) return p.order;
  const N = Nof(p);
  return ["D","I","S","C"].sort((a,b)=>N[b]-N[a]);
}
function shapeOf(p){
  if (p.result && p.result.shape) return p.result.shape;
  return p.shape || "";
}
function netsOf(N){
  return {
    pace: (N.D + N.I) - (N.S + N.C),
    pri:  (N.D + N.C) - (N.I + N.S)
  };
}

function paceWords(n){
  if (Math.abs(n) < 8)  return {key:"even", phrase:"an even pace", short:"even pace", pole:"mixed", dir:0, lean:"mixed", word:"even"};
  if (Math.abs(n) < EVEN_BAND){
    const f = n > 0;
    return {key:f?"fast":"slow", phrase:f?"a shade quick":"a shade unhurried", short:f?"leans fast":"leans patient", pole:f?"fast":"slow", dir:f?1:-1, lean:f?"fast":"slow", word:f?"quick":"unhurried"};
  }
  if (n > 0) return {key:"fast", phrase:(n >= VERY_BAND ? "flat-out fast" : "fast"), short:(n >= VERY_BAND ? "very fast" : "fast"), pole:"fast", dir:1, lean:"fast", word:"fast"};
  return {key:"slow", phrase:(n <= -VERY_BAND ? "deeply unhurried" : "unhurried"), short:(n <= -VERY_BAND ? "very patient" : "patient"), pole:"slow", dir:-1, lean:"slow", word:"unhurried"};
}
function priWords(n){
  if (Math.abs(n) < 8)  return {key:"even", phrase:"evenly split between the people and the plan", short:"both-and", pole:"mixed", dir:0, lean:"mixed"};
  if (Math.abs(n) < EVEN_BAND){
    const t = n > 0;
    return {key:t?"task":"people", phrase:t?"tilted toward the plan":"tilted toward the people in the room", short:t?"leans plan":"leans people", pole:t?"task":"people", dir:t?1:-1, lean:t?"task":"people"};
  }
  if (n > 0) return {key:"task", phrase:(n >= VERY_BAND ? "all about the plan" : "focused on the plan"), short:"plan-first", pole:"task", dir:1, lean:"task"};
  return {key:"people", phrase:(n <= -VERY_BAND ? "all about the people in the room" : "focused on the people in the room"), short:"people-first", pole:"people", dir:-1, lean:"people"};
}

function continuaPositions(N, nets){
  return {
    pace:     clamp100(50 + nets.pace / 2),
    priority: clamp100(50 + nets.pri / 2),
    frank:    clamp100(50 + (N.D - N.S) / 2),
    outgoing: clamp100(50 + (N.I - N.C) / 2),
    daring:   clamp100(50 + (N.D - N.C) / 2)
  };
}

const CONTINUA_META = [
  {id:"pace",     left:"Patient",                right:"Driven",    always:true},
  {id:"priority", left:"The people in the room", right:"The plan",  always:true},
  {id:"frank",    left:"Tactful",                right:"Frank",     always:false},
  {id:"outgoing", left:"Private",                right:"Outgoing",  always:false},
  {id:"daring",   left:"Careful",                right:"Daring",    always:false}
];

function letterBandOf(n){ return n >= 65 ? "High" : (n >= 36 ? "Moderate" : "Low"); }
function visibleLettersOf(p){
  const sh = shapeOf(p), N = Nof(p), ord = orderOf(p);
  if (sh === "balanced") return [];
  const out = [ord[0]];
  if (N[ord[1]] >= 36) out.push(ord[1]);
  return out;
}

/* Which letter carries a person's people-lean or plan-lean.
   High I people-focus is about energy and company; high S people-focus is
   about care and keeping the group whole. They are not the same thing and the
   copy never treats them as the same thing. */
function priVia(N, lean){
  if (lean === "people") return N.I > N.S ? "I" : (N.S > N.I ? "S" : "IS");
  if (lean === "task")   return N.C > N.D ? "C" : (N.D > N.C ? "D" : "DC");
  return null;
}

function personSnapshot(p){
  const N = Nof(p);
  const nets = netsOf(N);
  const pw = paceWords(nets.pace);
  const rw = priWords(nets.pri);
  return {
    p: p, name: firstName(p), N: N,
    pace: nets.pace, pri: nets.pri,
    paceW: pw, priW: rw,
    pos: continuaPositions(N, nets),
    shape: shapeOf(p), order: orderOf(p),
    vis: visibleLettersOf(p),
    primary: orderOf(p)[0],
    via: priVia(N, rw.lean),
    center: Math.abs(nets.pace) < EVEN_BAND && Math.abs(nets.pri) < EVEN_BAND
  };
}

function pairAnalysis(a, b){
  const A = personSnapshot(a), B = personSnapshot(b);
  const paceGap = Math.abs(A.pace - B.pace);
  const priGap = Math.abs(A.pri - B.pri);
  const largerGap = Math.abs(paceGap - priGap) < 8 ? "both" : (paceGap >= priGap ? "pace" : "priority");
  const differentPace = (A.paceW.lean === "fast" && B.paceW.lean === "slow") || (A.paceW.lean === "slow" && B.paceW.lean === "fast");
  const differentPri = (A.priW.lean === "task" && B.priW.lean === "people") || (A.priW.lean === "people" && B.priW.lean === "task");
  let pairingType;
  if (A.center && B.center) pairingType = "center";
  else if (differentPace && differentPri) pairingType = "both";
  else if (differentPace) pairingType = "pace";
  else if (differentPri) pairingType = "priority";
  else pairingType = "same-side";
  const continua = CONTINUA_META.map(m=>({
    id:m.id, left:m.left, right:m.right, always:m.always,
    posA:A.pos[m.id], posB:B.pos[m.id], gap:Math.abs(A.pos[m.id]-B.pos[m.id])
  }));
  const always = continua.filter(c=>c.always);
  const extras = continua.filter(c=>!c.always).sort((x,y)=>y.gap-x.gap);
  const top = always.concat(extras.filter(c=>c.gap >= TINY_CONT).slice(0,2));
  if (top.length < 4) extras.forEach(c=>{ if (top.length < 4 && !top.some(t=>t.id===c.id)) top.push(c); });
  const diffs = ["D","I","S","C"].map(d=>({d, a:A.N[d], b:B.N[d], diff:A.N[d]-B.N[d], abs:Math.abs(A.N[d]-B.N[d])}))
    .sort((x,y)=>y.abs-x.abs);
  return {A, B, paceGap, priGap, largerGap, differentPace, differentPri, pairingType, continua, topContinua:top, diffs};
}

/* ============================== language ============================== */

const LETTER_WORD = {D:"drive", I:"influence", S:"steadiness", C:"conscientiousness"};
function an(word){ return (/^[aeiou]/i.test(word) ? "an " : "a ") + word; }
const LETTER_GLOSS = {
  D:"taking charge and pushing through",
  I:"energy, persuasion, and company",
  S:"patience, loyalty, and an even keel",
  C:"precision, standards, and getting it right"
};

/* ============================ person reads ============================ */
/* Keyed by id. A person not listed here gets genericPersonRead().
   These describe the person's own wiring from their own scores; every
   family-relative claim lives in the generated receipts instead, so it stays
   true as people are added. */

const PERSON_READS = {

alex: {
  hero: "Motion is the native language.",
  read: [
    "Your scores don't describe a mood; they describe a direction. I 71 and D 60 on top, S 23 and C 13 at the bottom — everything about you points forward and outward. You experience a decision as a door: it's open or it's closed, and the worst state it can be in is ajar. So you close it. Then you announce it, because a decision nobody heard barely counts as one.",
    "The influence is the bigger of your two engines, and it matters which one leads. Drive with influence out front doesn't conquer a room — it recruits one. You don't want to win the argument as much as you want everyone on the bus while it's moving: you'll hand out the good seats, do the bit, take the temperature, and close. But the influence is built for momentum, not maintenance. Long after the yes, when a plan needs tending and follow-up and gentle checking-in, that's the stretch of people-work you never signed up for.",
    "Say it plainly, because people get this wrong about profiles like yours: your people-focus is not the caretaking kind. An I of 71 over an S of 23 means you're tuned to a room's energy, not its comfort. You notice who's in, who's lit up, who's playing along, long before you'd notice who's quietly tired. That isn't a defect to fix — it's a division of labor. Others are wired to watch the comfort. You're wired to give everyone something worth gathering for.",
    "At a table you propose first, and you treat the first silence as agreement, because in your grammar it is — if you disagreed, you'd say so, immediately, possibly mid-sentence. The steadier people around you run the opposite grammar: their silence means processing, and the processing means they care enough to do it right. You already know how this goes wrong. You call the restaurant while they're still weighing it — to you that's service, someone had to — and to them the weighing was the point.",
    "Under pressure you speed up. Certainty rises, the humor sharpens, and patience — never your deep reserve — goes first. You are at your most persuasive at exactly the moments you should be double-checking, which is a dangerous gift. A C of 13 means the fine print has never once been where your eyes went first. When it matters, borrow someone else's eyes, and actually wait for them."
  ],
  annoy: [
    "“Let me think about it” with no return date. You'd take a fast no over a slow maybe every day of the week.",
    "Reopening a decision that was already made. The meeting happened. Why is it happening again.",
    "Explaining the plan a second time, slower, to the same people.",
    "Silence after you pitch something. You'll fill it, and then be annoyed that you had to.",
    "Process for its own sake — steps and approvals that exist because they exist.",
    "Being told to slow down when nothing is actually wrong."
  ],
  light: [
    "An instant, unqualified yes. Not “sounds interesting.” Yes.",
    "Someone who matches your energy and raises it a notch.",
    "Being asked “so what's the plan?” — the question you were built to answer.",
    "A big swing that lands, with witnesses.",
    "Tonight instead of someday."
  ],
  living: [
    "Give Alex a verdict the same day, even if it's no. A fast no is respect; a slow maybe reads as a no you're too polite to say.",
    "“I'm in — details tomorrow” beats going quiet. Quiet is the one answer he has no slot for.",
    "Don't make him re-win an argument he already won. If you want to reopen it, bring something new.",
    "When he's mid-pitch, a concrete question slows him down better than a stall ever will.",
    "If you need him to wait, give the wait a shape. “Yes or no by Thursday” works. “We'll see” doesn't."
  ]
},

derek: {
  hero: "Says less. Means all of it.",
  read: [
    "C 64 and S 54 on top, with I down at 18: you're built for accuracy in an unhurried frame. You don't think out loud — you think, and then, if it's useful, you talk. The gap between what you notice and what you say is enormous, and most of what's interesting about you lives in it.",
    "Your standard is internal. Praise doesn't move it, hype offends it, and being watched doesn't change it — the work is either right or it isn't, and you'd know at two in the morning with nobody looking. That's why compliments slide off you, and why one specific, accurate observation about something you built lands harder than a round of applause.",
    "The D of 31 tells the quiet truth: you don't want the wheel. You have no appetite for controlling people — you audit outcomes, not humans. You'll let a flawed plan roll a surprisingly long way if nobody asks you, not out of spite but because unrequested opinions are, in your book, a kind of shoving. Ask directly and you get the whole map, load-bearing problems marked in order of severity.",
    "Under pressure you go quieter and closer to the problem. From the outside it can look like withdrawal, or a mood; it's concentration with the ringer off. The risk was never that you'd say the wrong thing — you almost never do. The risk is the right thing going unsaid past the moment somebody needed it."
  ],
  annoy: [
    "Overselling. Adjectives doing the work that numbers should be doing.",
    "Being asked to perform enthusiasm on cue.",
    "Sloppy work waved through with a shrug — especially by people who could do better.",
    "A verdict demanded before the checking is done.",
    "Vague answers to precise questions.",
    "The standard changing halfway through the job."
  ],
  light: [
    "A thing built properly. Anyone's thing.",
    "A precise question that proves the asker thought first.",
    "Being consulted as the reference, without ceremony.",
    "The flaw he flagged early turning out to be exactly what mattered.",
    "Getting it right, quietly, and someone noticing without him pointing at it."
  ],
  living: [
    "Ask Derek the precise question, then actually wait. The pause is him assembling the complete answer, not reluctance.",
    "Show him the details before the pitch. He trusts documents more than delivery.",
    "His “that works” is a standing ovation. Calibrate accordingly.",
    "Don't drag him toward enthusiasm. Bring him toward accuracy — that's where his warmth lives."
  ]
},

ashley: {
  hero: "The quiet engine.",
  read: [
    "Your four scores sit unusually close together — C 48, D 43, S 43, I 33 — and the two that lead are a pointed combination: standards, with drive right behind them. Careful first, forceful a half-step back. You read as composed, reasonable, unhurried. The composure is real. So is the engine idling under it.",
    "You're the person who decided the meeting's outcome before the meeting, then let the meeting believe it got there on its own. That isn't manipulation — it's efficiency. Open contests cost time and dignity, and you can usually route around them. But when something matters, you intend to win it, and you generally have a plan that predates anyone else noticing there was a contest.",
    "The C in front means the win has to be earned properly: done right, defensible, no loose ends left for anyone to pull. You hold yourself to a standard you mostly don't bother explaining, and you extend everyone else a professional courtesy — you assume they're doing their best, and quietly recalibrate how much to hand them when they're not.",
    "Your I of 33 isn't shyness; it's economy. You don't perform, don't fill silence, don't sell what should sell itself. The cost of the economy is that people can miss how much conviction you're carrying, because it arrives in a level voice. Yours is the easiest strength in a loud room to underestimate — which, be honest, you don't entirely mind.",
    "Under pressure you get more organized. Lists appear. Scope gets cut. You'll carry more than your share without announcing it, right up until you announce all of it at once. The people around you would rather have the running total."
  ],
  annoy: [
    "Being micromanaged — or simply watched while you work.",
    "Being underestimated, then congratulated for the thing you said would happen.",
    "Inefficiency tolerated out of politeness.",
    "Having to perform excitement before people will believe you're on board.",
    "People who narrate instead of doing.",
    "Effort presented as if it were a finished result."
  ],
  light: [
    "Being handed the hard thing and left alone with it.",
    "A plan of yours surviving contact with reality untouched.",
    "Quietly clearing a bar that somebody set too low.",
    "Competence getting noticed without you having to raise it.",
    "A level-voiced “done” that closes a thing forever."
  ],
  living: [
    "Give Ashley the outcome, not the method. She'll beat your method.",
    "Ask her opinion directly. She won't fight for airtime, and the room loses when she doesn't get it.",
    "Don't mistake the level voice for low stakes. The flatter the delivery, the more she's already decided.",
    "Credit her specifically and briefly. A paragraph embarrasses; a sentence lands."
  ]
},

renee: {
  hero: "Runs the version of the future that actually happens.",
  read: [
    "C 55, S 48: you plan, and the plan holds. Where other people see an event, you see a sequence — who's driving, when it actually starts, what happens if it rains. By the time you say yes to something you've already lived through it once in your head, which is why your yes is worth more than most people's enthusiasm.",
    "Your I of 27 means you spend nothing on performance, and it comes across as a calm that people can misread. You have preferences — strong ones, carefully arrived at — and you deliver them once, at conversational volume. In a loud room, that can make the best-thought-out opinion at the table the one that goes unheard. You've learned to live with that more than you should have to.",
    "The care you give people is logistical, and it is care: the remembered detail, the handled arrangement, the thing someone mentioned once showing up at the right moment. You love in the future tense — by making sure the day goes right before it arrives. People who only count warmth in hugs and speeches will miss half of yours.",
    "Under pressure you tighten the plan. More lists, earlier starts, backup options. Chaos doesn't frighten you; it offends you, because most of it was preventable on Tuesday. The risk is carrying the whole scaffolding yourself and letting nobody see the weight until it's heavy."
  ],
  annoy: [
    "Last-minute changes. A changed plan isn't an inconvenience — it's the death of a small thing you built.",
    "“We'll figure it out when we get there.”",
    "Your calm being read as having no preference.",
    "Enthusiasm treated as a substitute for a plan.",
    "Being handed the logistics by default and thanked in passing.",
    "Lateness that was foreseeable from space."
  ],
  light: [
    "A plan running exactly as designed — and nobody needing to know why it went smoothly.",
    "Thought reciprocated: someone planning around you, for once.",
    "Being able to hand something off and genuinely not think about it again.",
    "The contingency you prepped quietly saving the day.",
    "A calendar that holds."
  ],
  living: [
    "Give Renee notice. Days, not hours. Changes cost her more than they look like they cost.",
    "Ask for her feasibility read early. She has usually already run the simulation.",
    "When she states a preference once, treat it as said. She won't repeat it louder — she'll just file where it landed.",
    "Thank her for the invisible parts. She notices which parts you noticed."
  ]
},

mike: {
  hero: "Ease, on purpose.",
  read: [
    "S 55, C 44, I 42 — three letters in a near-tie behind an easy front, and a D of 26 that tells you the organizing truth: you have almost no appetite for making people do things, and you've built an entire style around never needing to. You keep things running and you keep them light, and you've correctly decided those are the same job.",
    "The I of 42 is higher than people would guess from your volume. You're genuinely social — the jokes, the warmth, the well-timed line — but it's hosting energy, not headlining energy. You read the room and then work it gently from the middle: keep it comfortable, keep it moving, keep anyone from becoming the target, including you.",
    "You go along easily, and that's mostly real — most of your preferences genuinely are mild. The catch is the word mostly. When you do care, it comes out at the same easy volume as when you don't, and people who've learned that your default is “whatever works” can miss the one time in ten it isn't. The peacekeeping runs deep enough that you'll absorb a real cost rather than make a scene about one, and only the people paying close attention ever find out.",
    "Under pressure you de-escalate: humor first, then patience, then distance. You'd rather defuse than win, which makes you the person other people are calmest around — while whatever is actually bothering you takes the long way out."
  ],
  annoy: [
    "Being made to pick a side.",
    "Drama manufactured out of nothing.",
    "Being managed, hurried, or voluntold.",
    "Heaviness where lightness would have done the job.",
    "Someone souring a room and being allowed to.",
    "The joke landing and somebody explaining it."
  ],
  light: [
    "Easy company with no agenda.",
    "A running joke maturing over years.",
    "Plans that stay loose and still happen.",
    "Everyone getting along without being told to.",
    "Being included without being assigned."
  ],
  living: [
    "Ask Mike what he actually wants — then ask once more. The first answer is the sociable one; the second is the real one.",
    "Don't confuse agreeable with indifferent. He has a read on everything; he's just not selling it.",
    "Keep invitations low-pressure. He shows up best when showing up was easy.",
    "When he goes quiet-and-pleasant, something's wrong. That is the loudest he complains."
  ]
},

elliana: {
  hero: "Whoever the room needs.",
  read: [
    "S 44, D 43, C 43, I 37 — seven points from your top score to your bottom one. The instrument was built to sort people, and with you it couldn't. That's not a weak signal; that is the finding. You genuinely run different modes in different rooms — you can push or wait, structure or improvise, steer or match — and none of those is a costume. They're all natively yours.",
    "People with one loud letter get the luxury of being predictable. You get a different power and a different tax. The power: you're the one who can talk to everybody, because you meet drive with drive, care with care, precision with precision. The tax: ask five people to describe you and you'll get five different answers, each of them certain, and every one of them partial. People typecast you as whichever version of you they've spent the most rooms with.",
    "Your flexibility is smooth enough to be invisible even to you. You absorb the shape a situation needs before checking whether you wanted to — and the wanting is in there; it just files itself last. The question that unlocks you isn't “what are you like?” It's “what do you want tonight?”, asked by someone willing to wait out the small pause while you check.",
    "Under pressure you flex first: you take whatever role is missing — the calm one in chaos, the driver when it drifts, the checker when it's sloppy. Useful, every time. But anyone watching closely should notice that you are always the variable, and ask now and then who's flexing for you."
  ],
  annoy: [
    "Sentences that begin with “you always.”",
    "Being asked to be simpler than you are.",
    "Getting cast permanently in whatever role you played last.",
    "People who need you to match them every time and call it closeness.",
    "Being read as indecisive when you're mid-calibration."
  ],
  light: [
    "Being read correctly — someone asking which mode you're in instead of guessing.",
    "Rooms different enough to use the whole range.",
    "Being the translator between two people who can't hear each other.",
    "Going first, for once, about what you want."
  ],
  living: [
    "Ask which version of the plan Elliana actually prefers. She has one; it's parked behind the accommodation.",
    "Don't file her under one letter. The letter changes by room — that's the point of her.",
    "Notice which company brings out which Elliana. She notices that you noticed.",
    "When she takes over, something was missing — it's not about the wheel. She'll hand it back."
  ]
},

sofia: {
  hero: "Steady is a skill.",
  read: [
    "S 57 and C 49 over D 36 and I 25: an even keel with a good compass. You're hard to rattle, slow to spend words, and constitutionally allergic to drama — not because it wounds you but because it's inefficient. Things that put other people into orbit get, from you, a beat, a look, and a reasonable next step.",
    "Steady is not the same as soft, and yours is the profile people most often get wrong. Your steadiness isn't about hovering over everyone's feelings — the I of 25 says you're not performing warmth or working a crowd, and you never will. It's about being constant: you say what you'll do, at the volume you'll do it, and then you do it. Reliability is your first language, spoken so fluently that people stop hearing it — which is the one quiet injustice of being you.",
    "The C of 49 gives the keel its compass. You have opinions — considered, specific, usually right about practical things — and you release them on a need-to-know basis. Not timidity; economy. If the group is landing on the right answer anyway, why spend the words? The side effect is that a room can genuinely not know you disagreed until the one time you say so plainly, at which point everyone recalibrates fast.",
    "Under pressure you get quieter and more capable — the useful one while other people are busy reacting. You'll absorb a lot without flagging it, on the theory that flagging it makes it everyone's problem. The people who love you have to learn to ask before it gets heavy, because you file “handling it” under handled."
  ],
  annoy: [
    "The spotlight swung onto you without warning.",
    "Quiet mistaken for having nothing to say.",
    "Being rushed mid-task by somebody who just now thought of the task.",
    "Chaos for its own sake — noise, drama, plans that thrash.",
    "Loud certainty from people who haven't thought it through.",
    "Being asked if you're okay a third time after you already answered."
  ],
  light: [
    "Being counted on and delivering. The whole loop, start to finish.",
    "Small-circle time where nothing has to be performed.",
    "A finished thing, done right, off the list.",
    "Someone remembering the thing you said once, quietly.",
    "A day that goes to plan."
  ],
  living: [
    "Ask Sofia directly and give the answer room to arrive. She speaks when the sentence is finished, not before.",
    "Don't rush her transitions. Her momentum is continuity, not speed.",
    "Her quiet yes is a real yes. Her quiet no, when it finally surfaces, was final a while ago — catch it early by actually asking.",
    "Skip the pep talk. Give her the plan, the facts, and the time, and she'll hand you back certainty."
  ]
},

colin: {
  hero: "Still waters, load-bearing.",
  read: [
    "S 71. Start there, because everything else about you is downstream of it. That's not mild agreeableness — it's structural steadiness, the deep kind: the same person on Tuesday that you are on Saturday, the same in a crisis that you are at dinner. With a C of 57 beside it, it makes you a fixed point — consistent, thorough, allergic to fuss, and done with things only when they're actually done.",
    "Your I of 15 is the other pole, and it's just as informative. Performing — small talk, selling, being on — isn't hard for you so much as pointless: a currency you don't spend because you've never seen it buy anything real. You don't warm up to people; you let them in, which is slower and worth more. The short list of people who've been let in would describe someone strangers wouldn't recognize — funnier, more opinionated, more watchful than anyone guesses.",
    "You process before you speak. Every time, at your own speed, in your own order. The pause that makes fast people twitch is not hesitation and it is not absence — it's composition. When the sentence comes, it's usually the finished one. The tax is real, though: in quick rooms, decisions can get made on top of you while your answer was still in the shop. It reads like you not minding. You mind.",
    "The D of 23 doesn't mean you can't hold a line — it means you don't reach for the wheel. But on the things that are yours, the line does not move. Anyone who has tried to rush you off a standard you actually hold has learned the difference between quiet and soft.",
    "Under pressure you slow down and hold. You get more methodical while everyone else gets louder, which makes you the person to want nearby when it's real — and the one most likely to be asked “are you even worried?” You are. It's just already been converted into doing the next right thing."
  ],
  annoy: [
    "Being rushed mid-anything. The task had an order.",
    "Plans changing at the last minute for reasons that amount to a mood.",
    "Being put on the spot in a group.",
    "Someone finishing your sentence — and getting it wrong.",
    "“Quick questions” that are actually large.",
    "Volume used as an argument."
  ],
  light: [
    "Routine that holds.",
    "Being trusted to do it his way, at his pace, without a check-in.",
    "Loyalty running both directions over years.",
    "A finished thing that was done right the first time.",
    "Company that doesn't require performing. Parallel quiet counts."
  ],
  living: [
    "Give Colin lead time. A change he got yesterday is a plan; a change he gets in the moment is a demand.",
    "Ask, then genuinely wait. Filling the pause costs you the finished answer.",
    "One change at a time. Three at once reads as a plan with no author.",
    "Don't raise the volume to get a response — it produces the opposite. Bring him the thing early and quietly, and he's the steadiest yes in the house."
  ]
},

kate: {
  hero: "Warm the way a house is warm.",
  read: [
    "S 69 with I 40: steadiness that leans toward people. Pure steadiness holds the ground; pure influence works the crowd; you do the third thing — you gather. Your instinct in any room is to make it one room: everyone fed, everyone included, nobody stranded at the end of the table. You do it so naturally that it looks like the evening simply went well on its own.",
    "The warmth is real, not performance. Yours is the influence that remembers names and notices absences, not the kind that needs a stage. And under it the steadiness runs deep: loyal, patient, consistent, in for the long haul. People clock you as kind within minutes and they're right — what they miss is the durability. You're not warm the way weather is warm. You're warm the way a house is.",
    "Your D of 20 means you'd rather absorb a cost than fight about one, and your C of 37 means rules exist to serve people, never the other way around. That combination makes you the natural peacemaker — and the person most at risk of swallowing something hard whole to keep an evening intact. The people around you should know the price of the smoothing, because you will never send the invoice.",
    "Under pressure you tend people first. Everyone else's landing gets checked before your own, and you'll under-report your own weather for weeks if reporting it would make it someone's problem. The move that helps most is the one that feels least natural: the hard thing said early and gently, before it ever needs to be said at volume."
  ],
  annoy: [
    "Conflict at the table — especially the avoidable kind.",
    "Harshness passing itself off as honesty.",
    "Someone being left out while nobody else even notices.",
    "Being pressed to decide fast when the decision lands on people.",
    "Cold efficiency where warmth would have cost nothing."
  ],
  light: [
    "Everyone together and easy. That's the whole point.",
    "Being the reason the room felt good — even uncredited.",
    "Traditions that repeat and mean something.",
    "Laughter with no agenda.",
    "Watching two people she loves finally get along."
  ],
  living: [
    "Don't make Kate the referee. She'll take the job, and it costs her more than it costs either side.",
    "Ask what she wants, not just what's fine. “Fine” is her most fluent language and her least honest.",
    "Hard news: early and gently beats late and loud, every time.",
    "Protect the gatherings she builds. They look effortless. They're her masterwork."
  ]
}
};

/* Fallback for anyone added to people.js before a bespoke read is written. */
function genericPersonRead(S){
  const N = S.N, vis = S.vis, name = S.name;
  const read = [];
  const scoreLine = "D " + N.D + ", I " + N.I + ", S " + N.S + ", C " + N.C;
  if (S.shape === "balanced"){
    read.push("The four scores sit close together — " + scoreLine + " — which means the instrument couldn't sort " + name + " into one style, and that's a result, not a failure. Expect genuine range: different rooms get different modes, and all of them are real.");
  } else {
    const lead = vis[0], second = vis[1];
    read.push(name + " leads with " + LETTER_WORD[lead] + " — " + LETTER_GLOSS[lead] + (second ? " — with " + LETTER_WORD[second] + " close behind, which colors how it shows: " + LETTER_GLOSS[second] + "." : ". The rest of the profile stands well back, so this is the mode people meet."));
    read.push("The full picture is " + scoreLine + ". " + (S.paceW.pole === "fast" ? "The pace runs quick: decisions feel live early, and waiting has a cost." : S.paceW.pole === "slow" ? "The pace runs unhurried: decisions become real once there's been time to sit with them." : "The pace is flexible — quick when the moment calls for it, patient when it doesn't."));
    if (S.priW.lean === "people"){
      read.push(S.via === "I"
        ? "The people-focus here is the energetic kind — company, momentum, the room lighting up — rather than the caretaking kind."
        : "The people-focus here is the caretaking kind — an eye on whether everyone is genuinely okay — rather than the spotlight kind.");
    } else if (S.priW.lean === "task"){
      read.push(S.via === "C"
        ? "The plan-focus here runs through standards: things should be done right, and corners have names."
        : "The plan-focus here runs through results: get to done, fix what breaks on the way.");
    }
  }
  const pools = {
    D: {annoy:["Waiting on a decision that could be made now.","Being managed in detail."], light:["Owning the call.","A clear finish line."]},
    I: {annoy:["A flat room.","Enthusiasm treated as naivety."], light:["Company for the plan.","A quick, warm yes."]},
    S: {annoy:["Being rushed mid-task.","Plans changing at the last minute."], light:["Routines that hold.","Being counted on and delivering."]},
    C: {annoy:["Sloppiness waved through.","A verdict demanded before the checking is done."], light:["A thing done properly.","Time to get it right."]}
  };
  const use = vis.length ? vis : S.order.slice(0,2);
  const annoy = [], light = [];
  use.forEach(L=>{ annoy.push.apply(annoy, pools[L].annoy); light.push.apply(light, pools[L].light); });
  return {
    hero: S.shape === "balanced" ? "Range the test could measure." : (LETTER_WORD[use[0]].charAt(0).toUpperCase() + LETTER_WORD[use[0]].slice(1)) + " first.",
    read: read,
    annoy: annoy,
    light: light,
    living: ["A bespoke read hasn't been written for " + name + " yet — the numbers above are live, the prose is generated. See the README for how to add one."]
  };
}

/* ======================= generated person facts ======================= */

function ordinal(n){
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function personReceipts(p, S){
  const F = (typeof FACTS !== "undefined") ? FACTS : null;
  if (!F) return [];
  const me = F.persons[p.id];
  if (!me) return [];
  const out = [];
  const DIMS = ["D","I","S","C"];
  const n1 = F.familySize - 1;

  if (me.approx){
    out.push("First, a flag: your answer sheet was rebuilt from a screenshot of your scores, so the question-level counts below are close reconstructions, not your literal picks.");
  }

  /* polarity: never claimed / never rejected */
  const neverClaimed = DIMS.filter(d=>me.M[d]===0);
  const neverRejected = DIMS.filter(d=>me.L[d]===0);
  if (neverClaimed.length && neverRejected.length){
    out.push("Twenty-eight questions, each demanding one “most me” and one “least me.” In all fifty-six judgments you never once claimed " +
      an(neverClaimed.map(d=>LETTER_WORD[d]).join(" or ")) + " answer, and never once rejected " +
      neverRejected.map(d=>LETTER_WORD[d]).join(" or ") + ".");
  } else if (neverClaimed.length){
    out.push("Across 28 questions you never once picked " + an(neverClaimed.map(d=>LETTER_WORD[d]).join(" or ")) + " answer as “most me.” Not once.");
  } else if (neverRejected.length){
    out.push("Across 28 questions you never once marked " + an(neverRejected.map(d=>LETTER_WORD[d]).join(" or ")) + " option as “least me.”");
  }

  /* dominant claim */
  const maxMd = DIMS.reduce((a,b)=>me.M[b]>me.M[a]?b:a);
  if (me.M[maxMd] >= 14){
    out.push("Of your 28 “most me” picks, " + me.M[maxMd] + " went to " + LETTER_WORD[maxMd] + " — more than half the test.");
  }

  /* strongest rejection, with family context */
  const maxLd = DIMS.reduce((a,b)=>me.L[b]>me.L[a]?b:a);
  if (me.L[maxLd] >= 13){
    let famNote = "";
    const allL = [];
    Object.keys(F.persons).forEach(id=>DIMS.forEach(d=>allL.push({id, d, n:F.persons[id].L[d]})));
    const famMax = Math.max.apply(null, allL.map(x=>x.n));
    if (me.L[maxLd] === famMax){
      const holders = allL.filter(x=>x.n===famMax);
      famNote = holders.length === 1
        ? " — the most emphatic “not me” anyone in this family recorded about anything"
        : " — tied for the most emphatic “not me” in the family";
    }
    out.push("You marked the " + LETTER_WORD[maxLd] + " option “least me” " + me.L[maxLd] + " times" + famNote + ".");
  }

  /* untouched axis — only meaningful when the letter is genuinely low for them */
  const maxNd = DIMS.reduce((a,b)=>me.neutral[b]>me.neutral[a]?b:a);
  if (me.neutral[maxNd] >= 17 && me.N[maxNd] < 40){
    out.push("On " + me.neutral[maxNd] + " of 28 questions you left the " + LETTER_WORD[maxNd] + " option completely untouched — not claimed, not rejected. It isn't that you push it away; it's not the axis you see choices on.");
  }

  /* perfect balance (flat profiles) */
  if (DIMS.every(d=>Math.abs(me.M[d]-me.L[d]) <= 1)){
    out.push("The test asked you to pick a side 28 times. On every single letter you claimed it and rejected it in almost equal measure — D " + me.M.D + " for, " + me.L.D + " against; I " + me.M.I + "/" + me.L.I + "; S " + me.M.S + "/" + me.L.S + "; C " + me.M.C + "/" + me.L.C + ". That is not indecision. That is range, measured.");
  }

  /* likert floors, ceilings, carve-outs, flips */
  if (me.lik){
    const hi = DIMS.filter(d=>me.lik.min[d] >= 4);
    const lo = DIMS.filter(d=>me.lik.max[d] <= 2);
    if (hi.length && lo.length){
      out.push("In the free self-ratings you never scored " + hi.map(d=>an(LETTER_WORD[d]) + " statement").join(" or ") + " below a " + Math.min.apply(null,hi.map(d=>me.lik.min[d])) + ", and never scored " + lo.map(d=>an(LETTER_WORD[d]) + " one").join(" or ") + " above a " + Math.max.apply(null,lo.map(d=>me.lik.max[d])) + ". The forced test and the free one drew the same picture from opposite sides.");
    } else if (hi.length){
      out.push("In the free self-ratings you never scored " + hi.map(d=>an(LETTER_WORD[d]) + " statement").join(" or ") + " below a 4.");
    } else if (lo.length){
      out.push("In the free self-ratings you never scored " + lo.map(d=>an(LETTER_WORD[d]) + " statement").join(" or ") + " above a 2.");
    }
    /* rare carve-outs: one high rating in a sea of lows, or one hard exception in a sea of highs */
    DIMS.forEach(d=>{
      const vals = me.lik.vals[d];
      const lows = vals.filter(v=>v<=2).length, highs = vals.filter(v=>v>=4).length;
      if (lows >= 5 && me.lik.max[d] >= 4){
        out.push("Your six " + LETTER_WORD[d] + " self-ratings are almost all floor — except one, a " + me.lik.max[d] + ". There is exactly one flavor of " + LETTER_WORD[d] + " you claim, and everything else about it you left on the shelf.");
      } else if (highs >= 5 && me.lik.min[d] === 1){
        out.push("You rated " + LETTER_WORD[d] + " 4s and 5s straight down the column — except a single 1. Even your strongest suit has one deliberate exception.");
      }
    });
    const likTop = me.lik.order[0], forcedTop = me.order[0];
    if (likTop !== forcedTop && me.lik.avg[likTop] - me.lik.avg[forcedTop] >= 0.2 && me.shape !== "balanced"){
      let famNote = "";
      const withLik = Object.keys(F.persons).filter(id=>F.persons[id].lik);
      const best = withLik.reduce((a,b)=>F.persons[b].lik.avg[likTop] > F.persons[a].lik.avg[likTop] ? b : a);
      if (best === p.id && withLik.length > 1){
        famNote = " — the highest " + LETTER_WORD[likTop] + " self-rating of anyone who did the ratings";
      }
      out.push("Here's the interesting one. When the test forced a trade, " + LETTER_WORD[forcedTop] + " won. When you could rate yourself freely, with nothing forced to lose, you put " + LETTER_WORD[likTop] + " on top: " + me.lik.avg[likTop].toFixed(1) + " out of 5" + famNote + ". The public answer and the private one are not the same answer.");
    } else if (likTop === forcedTop && me.lik.avg[likTop] >= 3.8 && me.shape !== "balanced"){
      out.push("Both ways of asking agree about you. The forced trade-offs crowned " + LETTER_WORD[forcedTop] + "; rating yourself freely, you crowned it again — " + me.lik.avg[likTop].toFixed(1) + " out of 5. The public answer and the private one are the same answer.");
    }
  }

  /* single highest / lowest score on the whole board */
  const myTop = F.topTies.filter(c=>c.id===p.id);
  if (myTop.length){
    const others = F.topTies.filter(c=>c.id!==p.id);
    if (others.length){
      out.push("Your " + myTop[0].d + " of " + myTop[0].n + " is tied with " + others.map(o=>o.name + "'s " + o.d).join(" and ") + " for the single highest score anyone in this family posted — and " + (others.length===1 ? "the two of them point in opposite directions." : "they point in different directions."));
    } else {
      out.push("Your " + myTop[0].d + " of " + myTop[0].n + " is the single highest score anyone in this family posted, on any letter.");
    }
  }
  const myLow = F.lowTies.filter(c=>c.id===p.id);
  if (myLow.length && !myTop.some(c=>c.d===myLow[0].d)){
    out.push("Your " + myLow[0].d + " of " + myLow[0].n + " is the single lowest score on the family's whole board" + (F.lowTies.length>1 ? " (shared)" : "") + ". Nobody here rules anything out harder than you rule out " + LETTER_WORD[myLow[0].d] + ".");
  }

  /* the sleeper rank: second-highest in the family on a letter that isn't your lead */
  DIMS.forEach(d=>{
    const rk = me["rank"+d];
    if (rk.pos === 2 && me.N[d] >= 40 && d !== me.order[0] && F.ranks[d] && F.ranks[d][0]){
      const leader = F.ranks[d][0];
      if (leader.id !== p.id){
        out.push("Quietly, your " + d + " of " + me.N[d] + " is the " + (rk.tied ? "tied-" : "") + "second-highest in this family — behind only " + leader.name + ". It doesn't announce itself, but the numbers see it.");
      }
    }
  });

  /* everyone's furthest */
  if (me.furthestOfCount === n1 && n1 >= 3){
    out.push("Ask the numbers who each person in this family is least like, and every answer comes back the same: you. All " + n1 + " of them, independently.");
  }

  /* center of gravity / far outlier */
  if (me.avgDistRank === 1 && F.familySize >= 4){
    out.push("You sit closer to the family's average profile than anyone else here. Whatever this family's shared temperament is, you're its center of gravity.");
  }
  if (me.avgDistRank === F.familySize && F.familySize >= 4){
    const secondId = F.byAvgDistIds[F.familySize - 2];
    const second = F.persons[secondId];
    if (me.avgDist >= second.avgDist * 1.7){
      out.push("You sit " + me.avgDist + " points from the family's average profile. The next-most-distinct person here is " + second.name + ", at " + second.avgDist + ". You are not a variation on this family's theme; you're the counterpoint.");
    }
  }

  /* twice-asked questions, for flat profiles */
  if (me.shape === "balanced" && me.care && me.care.pairs <= 1){
    out.push("The test asks four of its questions twice, in disguise. You answered the pairs differently almost every time — which sounds careless until you look at the shape of you: your answers genuinely depend on the situation. The flat profile isn't noise. It's the point.");
  }

  return out;
}

function personFamily(p){
  const F = (typeof FACTS !== "undefined") ? FACTS : null;
  if (!F) return {ranksRow:[], facts:[]};
  const me = F.persons[p.id];
  if (!me) return {ranksRow:[], facts:[]};
  const ranksRow = ["D","I","S","C"].map(d=>({
    d, n: me.N[d],
    pos: me["rank"+d].pos, of: me["rank"+d].of, tied: me["rank"+d].tied
  }));
  const facts = [];
  if (me.nearest && me.furthest){
    facts.push("Closest profile to yours: " + me.nearest.name + ", " + me.nearest.l1 + " points away across the four scores. Farthest: " + me.furthest.name + ", at " + me.furthest.l1 + ". The average distance between two people in this family is " + F.avgL1 + ".");
  }
  ranksRow.forEach(r=>{
    if (r.pos === 1 && !r.tied && r.n >= 50){
      facts.push("Your " + r.d + " is the highest in the family.");
    }
  });
  return {ranksRow, facts};
}

function personHome(p){
  const S = personSnapshot(p);
  const bespoke = PERSON_READS[p.id] || genericPersonRead(S);
  const fam = personFamily(p);
  return {
    name: S.name,
    snapshot: S,
    hero: bespoke.hero,
    read: bespoke.read,
    annoy: bespoke.annoy,
    light: bespoke.light,
    living: bespoke.living,
    receipts: personReceipts(p, S),
    famFacts: fam.facts,
    ranksRow: fam.ranksRow,
    generated: !PERSON_READS[p.id]
  };
}

/* ============================= pair reads ============================= */
/* Keyed by the two ids, sorted, joined with "|". A is always the first id
   alphabetically. misreadA = how A tends to get read wrong by B.
   giveA = what A gives B. moveA = the one move for A. */

const PAIR_READS = {

"alex|ashley": {
  read: [
    "Two engines, one loud and one silent. Alex's drive announces itself from the hallway; Ashley's runs so quietly that people regularly discover it only in the results. She will match him on substance — on where the bar should be, on wanting the thing actually done — while declining, completely, to match him on volume. Watch them long enough and you notice the pattern: he generates the momentum, she decides what survives it.",
    "The pace gap is real but it isn't the interesting gap. The interesting one is signal style. He processes in public — the pitch is the thinking. She processes in private and publishes conclusions. So he can mistake her for uncommitted when she's already three moves in, and she can mistake his out-loud draft for a final position when it was 60% test balloon."
  ],
  misreadA: "When Alex pushes to lock something in tonight, Ashley can hear carelessness about the details she'd want checked. It isn't — speed is what conviction looks like on him, and he assumes anything broken can be fixed in motion.",
  misreadB: "When Ashley answers in a level voice, Alex can hear lukewarm. It's the opposite. The flatter her delivery, the more decided she already is; she just refuses to sell what she's concluded.",
  giveA: "Alex gives Ashley ignition — the shove that turns her well-built plans into events with dates on them.",
  giveB: "Ashley gives Alex the version of his idea that survives Monday morning: same swing, load-bearing walls added.",
  moveA: "Ask for her read before you've sold the room, not after. Afterward all you'll get is a polite audit.",
  moveB: "Say the number out loud. Your conviction lives in understatement, and understatement is the one dialect he can't hear."
},

"alex|colin": {
  read: [
    "The family's full wingspan, in one pairing. One of you runs on ignition, the other on continuity, and between you two you cover just about the entire map — which means that anything the two of you actually agree on has been stress-tested from both ends and is probably true.",
    "The mechanism to understand is time. Alex treats a decision as a race that started the moment it was mentioned; Colin treats it as something being built, which cannot be hurried without changing what gets built. Neither of you is doing the other one's step wrong — you are doing different steps. Alex is making sure the thing happens. Colin is making sure the thing holds. A family needs both jobs done, and it is genuinely lucky when they're done this well, this far apart."
  ],
  misreadA: "Alex's instant certainty can read to Colin like not caring whether it's right. Wrong: it's confidence that wrong can be fixed later. Moving is how Alex takes a thing seriously.",
  misreadB: "Colin's pause reads to Alex like a no forming, or worse, like nothing happening. Wrong: it's the answer being assembled, whole. When it arrives it will be the finished sentence — and it will not have changed because someone repeated the question louder.",
  giveA: "Alex gives Colin motion — the outside world showing up with plans, energy, and a reason to leave the routine, which Colin would rarely generate but often quietly enjoys.",
  giveB: "Colin gives Alex ground truth. When something finally passes Colin, it is actually done, actually solid, actually true — a certainty Alex can't produce at his own speed.",
  moveA: "One change at a time, delivered early, with a date the answer is needed by. Then leave. The wait is the cost of the good answer.",
  moveB: "Give the verdict unprompted, before the deadline. He can build anything around a real answer; it's the silent interval he can't use."
},

"alex|derek": {
  read: [
    "The seller and the auditor. Alex leads with the version of events where it all works; Derek leads with the list of reasons it might not — not because he's negative, but because finding those reasons is what caring about an outcome looks like on him. These are two complete, opposite theories of helpfulness, and each of you privately suspects the other one's theory is a character flaw.",
    "It's worth saying what the numbers say: this isn't one intense person and one mild one. It's two intense people pointed in different directions — one at the room, one at the work. Derek's flat reception of a pitch is him taking it seriously enough to test the load-bearing walls. Alex's overselling isn't dishonesty; it's momentum-building, the belief that confidence is a construction material. Both are correct often enough to keep the argument alive forever."
  ],
  misreadA: "Alex's enthusiasm can smell like inflation to Derek — adjectives where numbers should be. But the enthusiasm is real, and it does real work: half of what Alex promises comes true because he promised it in front of people.",
  misreadB: "Derek's scrutiny can land on Alex like a vote of no confidence. It's the opposite of indifference. Derek doesn't bother checking things he's written off — the inspection is the compliment.",
  giveA: "Alex gets Derek's work seen. Things Derek builds quietly would stay quietly built; Alex is distribution.",
  giveB: "Derek keeps Alex's swings from landing on rot. One precise Derek question at the right moment is worth three of Alex's later apologies.",
  moveA: "Bring Derek the numbers version first — the pitch with the adjectives removed. He'll add conviction on his own once it checks out, and his conviction doesn't wobble.",
  moveB: "Say the approval out loud, not just the concern. You inspect because you care; tell him the part that passed inspection, or all he hears is the 20% that didn't."
},

"alex|elliana": {
  read: [
    "Elliana is the one person in the family who can genuinely meet Alex at his speed — and the only one who chooses, room by room, whether to. That makes this pairing lighter than most of Alex's: less translation overhead, more actual play. It also hides a subtle imbalance worth naming: when the two of you sync, it's almost always because she moved.",
    "Her range is doing quiet work here. She can ride the momentum when the plan is good, and she can put a hand on the wheel when it isn't — and she does both so smoothly that Alex can go months without noticing which one has been happening. He reads the compatibility as natural. It is. It's also, partly, skilled labor."
  ],
  misreadA: "Alex's constant broadcast can read to Elliana like a man who doesn't need input. He does — he just collects it as reactions rather than memos. Her raised eyebrow genuinely changes his course; neither of them tends to notice it happening.",
  misreadB: "Her matched energy can read to Alex as full agreement. Sometimes it's just skill — meeting the room's speed while she decides what she actually thinks. Matched is not the same as convinced.",
  giveA: "Alex gives Elliana a room that uses her whole range instead of filing her under one letter — plans big enough to need every mode she has.",
  giveB: "Elliana is Alex's translator to the patient majority: the one who can take a plan launched at full speed and re-deliver it in a dialect the unhurried people can hear.",
  moveA: "Ask which mode she's in before assuming it's the one you needed. The answer costs ten seconds and is never what you'd have guessed.",
  moveB: "Tell him when you're matching versus when you're actually in. He can take a real no at full speed — it's the skilled maybe that gets lost on him."
},

"alex|kate": {
  read: [
    "Two people-people, running on entirely different definitions of the word. Alex's people-focus is the spotlight kind — energy, audience, the room lighting up. Kate's is the hearth kind — everyone gathered, everyone fed, nobody stranded. Put them on the same evening and it's a natural division of labor: he's the reason there's an occasion, she's the reason it feels like home. Neither could do the other's half.",
    "The friction, when it comes, is about tempo at the threshold of decisions. Alex closes fast because open decisions leak energy; Kate keeps things open because closing early might strand somebody. He's optimizing the plan's momentum, she's optimizing its headcount — both genuinely people-motivated, pulling on opposite ends of the same evening."
  ],
  misreadA: "Alex's push to lock the plan can land on Kate as steamrolling the very people the plan is for. It isn't a bulldozer — it's his belief that a decided plan is a kindness, because everyone can finally relax.",
  misreadB: "Kate's keep-it-open instinct can read to Alex as indecision. It's not — it's her running the guest list in her head, holding the door for whoever hasn't answered yet. That's a job, and she's doing it.",
  giveA: "Alex gives Kate's gatherings their spark — the story at the table, the reason half the room showed up.",
  giveB: "Kate makes Alex's wins land softly. She's the difference between a plan people went along with and a plan people were glad about.",
  moveA: "Let the plan breathe one extra round before you close it. The people Kate is holding the door for are usually worth the wait.",
  moveB: "Tell him your real preference in plain words. He can take it — what he can't do is read the one signal you're best at: graceful accommodation."
},

"alex|mike": {
  read: [
    "The two most social people in the family, mounted on opposite chassis. Alex's sociability is offense — pitch, occasion, the plan that needs a headcount by nine. Mike's is defense — ease, the running joke, the temperature held steady. They can carry an evening between them for hours, and it looks effortless because for both of them it mostly is.",
    "The thing to watch is what happens under Alex's push. Mike absorbs it. He'll agree, go along, keep it light — and Alex banks each easy yes as a real one. Most are. But Mike's peacekeeping yes and his actual yes are pronounced identically, and Alex, moving at speed, has no reason to check which one he just heard. The gap only surfaces later, as plans that quietly evaporate rather than get declined."
  ],
  misreadA: "Alex's directness can feel like pressure to Mike even when nothing's being demanded — throughput reads as urgency. Most of the time Alex isn't pushing; he's just moving, and anyone nearby feels the wind.",
  misreadB: "Mike's easygoing yes reads to Alex as commitment. Often it's hospitality — the answer that keeps the moment pleasant. The tell isn't in the words; it's in whether Mike ever mentions it again.",
  giveA: "Alex gives Mike occasions — the plans and mild adventures that Mike would never initiate and almost always enjoys.",
  giveB: "Mike gives Alex a rare thing: company with no scoreboard. Around Mike, nothing has to be won.",
  moveA: "Ask for his real pick twice, casually. The first answer is hosting; the second one's his.",
  moveB: "Give him the real no at the moment it forms. He'd honestly rather have it than the yes that dissolves next week."
},

"alex|renee": {
  read: [
    "The improviser and the itinerary. Alex generates plans the way weather generates fronts — abundantly, on the move, with revisions mid-sentence. Renee builds plans the way bridges get built: once, properly, in advance. The magic, when it works, is obvious: his sparks plus her load-bearing structure equals things that actually happen and are actually good. The tax is just as obvious: every one of his mid-course swerves lands somewhere in a sequence she has already built.",
    "Understand what a plan is to each of you and the whole pairing decodes. To Alex a plan is a living thing — improving it at 4 p.m. is devotion, not disruption. To Renee the plan was finished, and finished is a place she likes. Neither definition is wrong. But only one of you can hear “small change” and feel the true size of it."
  ],
  misreadA: "Alex's swerves read to Renee as disrespect for work she already did. They aren't aimed at her — he genuinely experiences a changed plan as a gift to the plan. He is upgrading, in his head, right up until he sees her face.",
  misreadB: "Renee's logistics questions land on Alex as brakes. They're the opposite — they are how she says yes. She's already building the thing; the questions are construction sounds.",
  giveA: "Alex puts things on Renee's calendar worth planning — occasions with some heat on them, instead of another quiet weekend that plans itself.",
  giveB: "Renee is why Alex's ideas have a survival rate. Sparks are cheap; she's the difference between a great idea and a great story about an idea that almost happened.",
  moveA: "Freeze the plan 48 hours out. Give the itch one deadline: improvements welcome until Thursday, then the plan is a building, not a draft.",
  moveB: "Flag the two details that actually matter instead of auditing all ten. He'll honor a short list forever; a long one he'll charm his way around."
},

"alex|sofia": {
  read: [
    "The broadcaster and the ballast. Alex thinks at full volume — the pitch, the revision, the callback to the joke from an hour ago. Sofia runs almost silent, and none of it is absence: she's tracking everything, deciding most of it doesn't require her, and spending words only where they change something. Two completely different information styles, one loud, one lossless.",
    "Be precise about what Sofia's quiet is, because profiles like hers get cartooned. She is not sitting there anxiously monitoring everyone's feelings — her steadiness is self-possession, not worry. She has usually reached her conclusion well before the discussion ends; she simply sees no reason to race anyone to it. Alex fills rooms; Sofia outlasts them. Both are forms of confidence."
  ],
  misreadA: "Alex's volume can read to Sofia as a demand that everyone perform a reaction. Mostly it isn't — the broadcast is just his thinking made audible, and he'd genuinely rather have her real answer than her applause.",
  misreadB: "Sofia's economy of words can read to Alex as no opinion present. Wrong — the opinion is fully formed and on the shelf. She'll hand it over when asked directly, and it will arrive suspiciously complete.",
  giveA: "Alex brings the outside world in — noise, plans, and stories Sofia would never chase and quietly enjoys having delivered.",
  giveB: "Sofia is weatherproof. Alex's storms — enthusiasm, frustration, the whole broadcast day — break on her and nothing moves, and that steadiness is worth more to him than agreement.",
  moveA: "Ask her straight, then let the answer arrive at her speed. It was ready before you asked; the pause is just the walk to the shelf.",
  moveB: "Say the conclusion you already reached out loud. He honestly cannot hear the silent one, and he'd rather be corrected than unopposed."
},

"ashley|colin": {
  read: [
    "Two careful people with different clocks. Ashley's carefulness has drive bolted to it — a standard plus a deadline, done right and done by Friday. Colin's carefulness has steadiness underneath — a standard plus patience, done right no matter when. Same destination, different physics: she applies force to the finish line; he removes hurry from the equation entirely.",
    "They respect each other's work almost automatically, which makes this one of the quieter pairings in the family. The rub is small but persistent: pace at the margins. Her “this is taking too long” and his “this takes what it takes” are both quality arguments — hers about the cost of open loops, his about the cost of closed-too-soon."
  ],
  misreadA: "Ashley's push toward done can read to Colin like corners about to be cut. They won't be — her standard travels with the deadline. Done-right-by-Friday is one word in her language.",
  misreadB: "Colin's pace can read to Ashley as lack of urgency. It isn't — it's thoroughness with no ego attached to speed. The job arrives finished, which was the assignment.",
  giveA: "Ashley gives Colin the nudge over the line — the small applied force that turns nearly-finished into finished.",
  giveB: "Colin gives Ashley permission she rarely gives herself: to let a thing take the time it actually takes.",
  moveA: "Set the deadline with him once, at the start, then stop steering. He keeps deadlines he agreed to; he resists ones applied mid-task.",
  moveB: "Report percent-done without being asked. It's not oversight — silence is where her urge to manage grows."
},

"ashley|derek": {
  read: [
    "The family's understatement summit. Two people with high standards and no interest in performing them, doing quality-control in adjacent lanes: Derek's is craft — is the thing itself right; Ashley's is operations — is the whole system moving and right. They recognize each other instantly and rate each other highly, in the currency both prefer: zero fuss.",
    "The failure mode isn't conflict — it's silence. Two understaters can run for months on nods, each assuming the other's non-comment means full alignment. Between these two, nothing important gets said twice, which is elegant right up until the one time it needed saying twice."
  ],
  misreadA: "Ashley's drive for efficiency can read to Derek as impatience with proper craft. It's not — she'll spend the time where the time buys quality; she just refuses to spend it on ceremony.",
  misreadB: "Derek's one-more-check can read to Ashley as distrust of work she already finished. It's nothing personal — he re-checks his own work harder than anyone's.",
  giveA: "Ashley ships what Derek deepens — she's the reason his standard reaches the world on a schedule.",
  giveB: "Derek is the second set of eyes Ashley actually trusts, which is a list with almost nobody on it.",
  moveA: "Grant the extra day when the stakes are real. His delay is almost always buying something.",
  moveB: "Name it when it's done enough. She'll match your standard; she just needs to hear the standard has a floor."
},

"ashley|elliana": {
  read: [
    "On paper, the family's closest pair — and the numbers underneath tell a stranger, better story: nearly identical profiles produced by noticeably different answers. You landed on the same shape from different directions. Ashley holds one consistent line everywhere she goes; Elliana arrives at balance by ranging across the whole map and averaging out. Same silhouette; one of them is a statue and one is a gyroscope.",
    "In practice you're the pair most at risk of false consensus. You assume you've read each other — reasonably, since you're so alike on paper — and skip the confirming sentence other pairs are forced to say out loud. Most days that costs nothing. On the days it costs, it costs quietly and gets discovered late."
  ],
  misreadA: "Ashley's consistency can look like rigidity to Elliana — one setting, everywhere. It's chosen, not stuck: she found the mode that works and sees no reason to freelance.",
  misreadB: "Elliana's flexing can look like a lack of conviction to Ashley. It's the opposite of empty — every mode is a real conviction about what this particular room needs.",
  giveA: "Ashley shows Elliana what holding one line buys: compounding returns, a reputation that walks in ahead of you.",
  giveB: "Elliana shows Ashley there's more than one right way to be — and covers the rooms Ashley's one setting doesn't fit.",
  moveA: "Say the assumption out loud before acting on it. You two skip that step because you're usually right; the exceptions are expensive.",
  moveB: "Same move, other direction. You read her well, not perfectly — and she's harder to read than she looks."
},

"ashley|kate": {
  read: [
    "The standard-bearer and the gatherer. Ashley optimizes the outcome; Kate optimizes the table. It's easy to shorthand that as head versus heart and wrong to: Ashley's outcomes are for people, and Kate's warmth has real spine under it. What differs is which failure each finds unacceptable. Ashley cannot stand a preventable mess; Kate cannot stand a preventable hurt.",
    "They make an excellent tag team when they remember they're on one: Ashley says the thing that must be said, Kate repairs the room afterward — or Kate senses the temperature and Ashley re-plans around it. Run in sequence, that's a complete skill set. Run in parallel with no coordination, they simply exhaust each other."
  ],
  misreadA: "Ashley's directness can land on Kate as coldness. It's actually respect — Ashley doesn't pad things for people she rates, and she rates Kate.",
  misreadB: "Kate's harmony-keeping can read to Ashley as conflict-avoidance that lets problems age. Sometimes. But mostly it's a real job — someone has to keep the room whole while the problem gets fixed, and nobody does it better.",
  giveA: "Ashley says the hard thing so Kate doesn't have to carry it unsaid — and Kate is always carrying at least one.",
  giveB: "Kate warms the rooms Ashley has to be effective in. People take Ashley's high standards better with Kate's welcome around them.",
  moveA: "Spend one warm sentence before the useful ones. It changes the exchange rate on everything after.",
  moveB: "When she handles the hard call, let it stay handled. Re-soothing everyone afterward quietly re-opens it."
},

"ashley|mike": {
  read: [
    "Quiet drive next to quiet ease. Ashley is always mildly at work — assessing, improving, keeping the operation tight. Mike is fluent in the opposite: keeping things loose enough that everyone can breathe. Neither performs, neither fusses, so from the outside this pairing looks like nothing but calm. Inside it there's a low-grade philosophical dispute about what a Saturday is for.",
    "It works because each secretly rates what the other has. Ashley knows her idle runs too high, and Mike's company lowers it without her having to announce a break. Mike knows his days can dissolve, and her structure gives them a spine without him having to build one."
  ],
  misreadA: "Ashley's standing standards can feel to Mike like ambient judgment — as if the bar being visible means it's aimed at him. It mostly isn't; the bar is just always in her hand.",
  misreadB: "Mike's low gear can read to Ashley as unserious. It's not — it's a discipline of its own. Keeping a room easy for years takes exactly the consistency she respects; it just doesn't produce a deliverable.",
  giveA: "Ashley gives Mike's easy days a spine — the two fixed points that keep loose from becoming lost.",
  giveB: "Mike gives Ashley the off-switch she doesn't naturally own.",
  moveA: "Ask, don't assign. He'll do nearly anything asked warmly, and quietly resist the same thing issued as a task.",
  moveB: "Deliver the small thing exactly when you said. It buys more peace with her than a month of pleasantness."
},

"ashley|renee": {
  read: [
    "Two careful planners, one household style — and different centers of gravity. Renee plans the event: the sequence, the logistics, the day running right. Ashley plans the outcome: the goal, the resources, the result holding up later. Usually those are the same plan and this pair hums. When they diverge, each is startled to learn the other was optimizing something else all along.",
    "The kinship is real: neither wings it, neither needs credit, both notice everything. That mutual competence is also the trap — you extend each other so much benefit of the doubt that alignment gets assumed instead of checked, and the answer sheets say your instincts differ more than your reputations do."
  ],
  misreadA: "Ashley's outcome-focus can read to Renee as indifference to the how — as if the day itself were a detail. It isn't; she just trusts Renee's how completely enough to stop watching it.",
  misreadB: "Renee's process-focus can read to Ashley as fussing over mechanics after the destination's been settled. But the mechanics are the caring — the plan is how she holds people.",
  giveA: "Ashley holds the why steady, so Renee's beautifully built how is always pointed at the right thing.",
  giveB: "Renee makes Ashley's outcomes land on schedule and intact. Strategy without her is a memo.",
  moveA: "Tell her the priority ranking out loud — which parts are load-bearing, which are nice-to-have. She'll build to it exactly.",
  moveB: "Flag early when the plan starts serving itself. She'd rather re-plan than find out at the table."
},

"ashley|sofia": {
  read: [
    "Quiet competence squared. Neither performs, neither fusses, both deliver — different directions. Ashley's competence points forward: improve it, tighten it, get it where it should be. Sofia's points down, into the foundation: keep it steady, keep it true, keep it running. An improver and a maintainer, both allergic to announcing themselves.",
    "The gap worth naming is what done means. For Ashley, done is a rung — pause, then reach for the next one. For Sofia, done is a place — arrive, and be there. Neither reads the other's relationship to finished quite right, and both are a little wrong about it in the same conversation."
  ],
  misreadA: "Ashley's constant improving can read to Sofia as never-satisfied — as if nothing anyone maintains could be enough. It's not aimed at her; the ratchet is just always on.",
  misreadB: "Sofia's contentment can read to Ashley as low ambition. Look again: keeping something good, steady, for years, without drama, is an achievement — Sofia's ambition is stability, and she's better at it than anyone.",
  giveA: "Ashley opens the doors Sofia would never push on — the upgrade, the ask, the change that turns out to be worth it.",
  giveB: "Sofia shows Ashley that enough exists, and what it feels like to stand on it.",
  moveA: "Celebrate the maintained thing, not just the improved one. What she's holding steady is invisible precisely because it's working.",
  moveB: "Tell her one thing you'd change. She'll make it happen at speed — she's just not going to guess."
},

"colin|derek": {
  read: [
    "The quiet alliance. Two people who never needed to explain themselves to each other — the same unhurried clock, the same distaste for fuss, the same instinct to do it properly or not at all. Derek's version leans exacting: the standard is the point. Colin's leans steady: the constancy is the point. Adjacent species, effortless coexistence.",
    "There is no friction story here worth telling; the risk runs the other way. Two low-broadcast people can go months on pure autopilot — comfortable, wordless, and quietly out of date about each other. Each reads the other's non-comment as all good, and it almost always is. Almost."
  ],
  misreadA: "Colin's silence is comfort, not distance — but even Derek, fluent in silence, can occasionally file it as nothing to report when something's slowly going on.",
  misreadB: "Derek's exactness could look, from anyone else, like criticism. Colin mostly reads it right: that's just how Derek handles a thing he cares about — with calipers.",
  giveA: "Colin gives Derek the easiest company he has — a room where nothing needs performing and nothing needs checking.",
  giveB: "Derek gives Colin a peer standard — the one person whose “done right” means the same thing his does.",
  moveA: "Say one real thing out loud per visit. It'll feel unnecessary. It's the maintenance the autopilot doesn't do.",
  moveB: "Same move back. Between you two, someone has to be the talkative one, and it's a two-way tie for last."
},

"colin|elliana": {
  read: [
    "The fixed point and the gyroscope. Colin is the same person in every room — that's his gift, and he pays for it in flexibility. Elliana is whatever the room is missing — that's hers, and she pays for it in being hard to pin. Each has exactly what the other traded away, which makes this pairing far more complementary than it looks from the outside.",
    "She reads him better than most because reading is her native skill; he anchors her better than most because anchoring is his. The distance between their scores is real, but it behaves less like a gap and more like a division of labor: one of them holds the ground, one of them covers it."
  ],
  misreadA: "Colin's sameness can read to Elliana as refusal to meet her partway. But he isn't withholding other versions of himself — there's one version, offered whole. That's the entire gift.",
  misreadB: "Elliana's shifting can read to Colin as changeability — and he's built to distrust what changes. Her mode changes; her substance doesn't. Watch what she protects across all the modes and you'll see how consistent she actually is.",
  giveA: "Colin is Elliana's fixed reference — the one point on her map that never moves, which is precisely what a navigator needs.",
  giveB: "Elliana is Colin's ambassador to rooms that need flex — she absorbs the improvisation so his routine doesn't have to.",
  moveA: "Let her run point when plans go sideways. Improvisation costs her nothing and costs you plenty.",
  moveB: "Don't test him for versions he doesn't have. Ask for the one he does — it holds weight."
},

"colin|kate": {
  read: [
    "The family's deep keel, in two drafts. Both of you run on steadiness first — patient, loyal, in for the long haul — and the difference is one letter doing a lot of work: her steadiness gathers, his holds. Kate's version points at the table: everyone in, everyone fed, the room made whole. Colin's points at the ground: the standard kept, the routine defended, the thing finished properly.",
    "Together you're a kind of infrastructure — the reliable floor other people build their louder lives on. The one true gap is social metabolism. Her battery charges at the full table; his drains there, slowly, no matter how much he loves everyone at it. Neither of you is wrong about what an evening is for. You're measuring different evenings."
  ],
  misreadA: "Colin's early exits and quiet corners can read to Kate as not caring about the gathering. He cares by being there — presence is the whole statement. Working the room isn't a thing he owes; it's a thing he doesn't have.",
  misreadB: "Kate's tending — the check-ins, the seconds, the who-needs-what scan — can read to Colin as fuss. It's not nervousness; it's her craft, as deliberate as his. The room runs because she's running it.",
  giveA: "Colin gives Kate a fixed point that doesn't need managing — one person at the table who is simply, reliably fine.",
  giveB: "Kate builds the warmth Colin gets to quietly live inside without ever having to generate it.",
  moveA: "Give her gatherings two degrees more visible warmth — a sentence at the table, a thanks at the door. Costs you little. Lands enormous.",
  moveB: "Count his presence as the participation it is. He came; that was the speech."
},

"colin|mike": {
  read: [
    "The no-wheel caucus. Neither of you wants to run anything or anybody — a rare, restful agreement — and you keep the peace in different registers: Mike keeps it warm, Colin keeps it still. Mike's ease has company in it, chatter, the light touch. Colin's has quiet in it, and the quiet is load-bearing.",
    "This is one of the family's most comfortable pairings, with one asymmetry worth a sentence: Mike's version of comfortable includes talking, and Colin's version includes not. Neither is faking; the same couch means two different things. It works because neither needs the other to convert."
  ],
  misreadA: "Colin's minimal chat can read to Mike, occasionally, as unwelcome — as if the quiet meant the visit wasn't wanted. Backwards: comfortable silence is Colin's five-star review.",
  misreadB: "Mike's banter can read to Colin as noise that wants hosting. It doesn't — it's Mike including him, no response required. The line was the gift; the laugh is optional.",
  giveA: "Colin gives Mike an audience with no performance debt — the one room where the host can be off duty.",
  giveB: "Mike keeps a thread running to Colin without ever making it a demand — included, never extracted.",
  moveA: "Throw a line back now and then. One sentence keeps Mike's whole tank full.",
  moveB: "Sit in his quiet without filling it. It isn't awkward to him — it's the good part."
},

"colin|renee": {
  read: [
    "Kindred keepers. Renee keeps the plan; Colin keeps the ground. Both of you experience predictability as care — a promise kept early, a day that runs the way it was said to run — which puts this pairing among the family's lowest-friction: nobody springs anything on anybody, ever, and both of you privately grade that as love.",
    "The one seam: Renee's care is forward-looking — she wants things settled ahead, which means asking for commitments early. Colin's steadiness lives in the present tense — he'll commit solidly, but pressure to commit now, for later, reads like being rushed in slow motion. She's not rushing him; she's building. He's not stalling her; he's arriving."
  ],
  misreadA: "Colin's unbudging routine can read to Renee as inflexibility toward her plans. But the routine is where his yes lives — schedule with it rather than against it and he's the most reliable date on her calendar.",
  misreadB: "Renee's early asks can feel to Colin like pressure. They're the opposite of pressure in her language — asking early is how she avoids ever having to ask urgently.",
  giveA: "Colin is the one commitment on Renee's board that never wobbles — plan around him once and it's done forever.",
  giveB: "Renee builds the ordered days Colin's steadiness runs best inside. Her plans are his routine, upgraded.",
  moveA: "Answer her early asks early, even if the answer is “probably.” A probability she can plan with beats a certainty that arrives late.",
  moveB: "Put changes on his calendar the moment you know them. His flexibility is real; it just runs on notice."
},

"colin|sofia": {
  read: [
    "The two quietest yeses in the family, and the pairing that needs the least translation of any of them. Same unhurried clock, same economy of words, same instinct to handle things rather than discuss them. Where most pairs here have to work out an exchange rate, you two clear transactions instantly — a look, a half sentence, done.",
    "The only caution for a pairing this smooth is inheritance drift: with so little friction, everything defaults to precedent. Decisions stop being made and start being assumed — the same weekend, the same roles, the same silences — not because either of you chose it, but because nothing ever forced the choosing."
  ],
  misreadA: "Colin's settledness can read, even to Sofia, as the answer to a question she never quite asked. His contentment is real — but it will absorb an unraised issue indefinitely.",
  misreadB: "Sofia's smoothness can read to Colin as everything's fine. It usually is. The exceptions run silent, and by the time one surfaces it has been true for a while.",
  giveA: "Colin gives Sofia total steadiness — the one person whose calm needs no monitoring at all.",
  giveB: "Sofia gives Colin the same, with a compass: she'll quietly steer the practical call while he holds the ground.",
  moveA: "Every so often, ask the question neither of you needs: “anything you'd change?” The answer will be small and worth it.",
  moveB: "Same move, both directions. In the family's calmest pairing, somebody still has to raise things — take turns."
},

"derek|elliana": {
  read: [
    "The fixed standard and the moving read. Derek holds one register — precise, level, permanent. Elliana holds all of them, and switches on purpose. He evaluates what's in front of him; she calibrates to it. The pairing works better than the distance suggests, because her range includes his register — she can meet him in exact, unhurried mode, and does.",
    "What each should know about the other: his consistency isn't coldness toward her variety, and her variety isn't inconsistency of substance. Under her changing delivery the content holds steady — track what she says across three different rooms and it's the same position, dressed for the weather."
  ],
  misreadA: "Derek's single register can read to Elliana as indifference to nuance — one tool for every job. But precision is how he does nuance; the register doesn't move because the standard doesn't.",
  misreadB: "Elliana's mode-shifts can trip Derek's inconsistency alarm — the thing his whole wiring distrusts. Grade her on outcomes, not delivery: the outcomes are as consistent as his.",
  giveA: "Derek is Elliana's quality floor — the fixed standard that makes her flexibility safe to spend anywhere.",
  giveB: "Elliana is Derek's range extender — the one who takes his precise, correct position and gets it heard in rooms that don't speak precision.",
  moveA: "Judge the outcome, say so briefly. Your specific approval is worth ten of anyone else's applause to her.",
  moveB: "Bring him the exact version — numbers in, adjectives out. It's a dialect you already speak; use it and he's yours."
},

"derek|kate": {
  read: [
    "Precision meets warmth, and each privately suspects the other is doing communication wrong. Derek transmits content: accurate, complete, unpadded. Kate transmits care: the point wrapped so it lands without bruising. Both styles work. They just fail differently — his by wounding where he only meant to inform, hers by softening a message until it no longer arrives.",
    "Together, run in the right order, they're a complete system: his content, her delivery. Everything he most needs said to the family lands better through her; everything she most needs verified is exactly his craft. The pairing struggles only when each grades the other by their own rubric — his honesty scored as harshness, her kindness scored as imprecision."
  ],
  misreadA: "Derek's corrections can land on Kate as criticism of people. They're about the thing — always the thing, never the person. In his grammar, fixing your facts is a service to you.",
  misreadB: "Kate's warmth-first can read to Derek as accuracy-last. It isn't — she usually knows the hard truth cold. She's just routing it through the version everyone will still be friends after.",
  giveA: "Derek keeps the family's facts straight — the one source where the answer is checked before it's spoken.",
  giveB: "Kate is how his truths land whole — heard, not just said.",
  moveA: "One warm sentence before the fix. It's not padding; it's the handshake that gets the fix accepted.",
  moveB: "Relay his point straight — softening it in transit changes it, and he'll notice the difference even when nobody else does."
},

"derek|mike": {
  read: [
    "Low friction, different fuels. Derek runs on standards; Mike runs on ease. Neither wants the spotlight, neither pushes people around, so the pairing idles beautifully — Mike keeps it light enough that Derek's checking never curdles into gloom, and Derek keeps enough rigor in the room that Mike's loose days still land on their feet.",
    "The quiet dispute is over what deserves effort. Derek can't not care about quality; Mike can't not care about atmosphere. Each rounds the other's specialty down to optional — until the moment it saves the day, which, in both directions, it periodically does."
  ],
  misreadA: "Derek's exactness can feel like heaviness to Mike — weather that takes the fun out of a loose afternoon. It isn't a mood; it's attention. That's what his caring looks like out loud.",
  misreadB: "Mike's looseness can read to Derek as not caring about quality. But Mike's medium is the room, not the artifact — and his mood-keeping is quality control, maintained to a standard Derek would respect if it were measurable.",
  giveA: "Derek makes sure the easy day's actual stuff — the gear, the plan, the fix — genuinely works.",
  giveB: "Mike keeps the temperature where Derek's precision reads as helpful instead of heavy.",
  moveA: "Say “good enough” out loud sometimes, and mean it. It tells him the standard has an off-duty setting.",
  moveB: "Hand him the thing you half-fixed. Finishing it properly is, no kidding, his idea of a good time."
},

"derek|renee": {
  read: [
    "The aligned auditors. Same operating system: check first, plan ahead, distrust winging-it, say it once. You two agree on more, before a word is spoken, than most pairs here manage after an hour — and your answer sheets bear that out. Renee runs the plans; Derek runs the verification; both of you consider preventable chaos a moral failing.",
    "The shared blind spot is the interesting part. Between you there is no one whose job is the reckless yes — two careful people can politely decline their way through a decade of perfectly nice, perfectly optimized, slightly smaller life. Nobody's grabbing the wheel here, which is exactly the point, and occasionally the problem."
  ],
  misreadA: "Derek's checks can read, even to Renee, as doubt about her planning. Never — hers are the plans he checks least. The checking is just always on; it isn't aimed.",
  misreadB: "Renee's forward-building can read to Derek as commitment pressure. It's not pressure; it's how she keeps urgency from ever existing — a goal he shares more than anyone.",
  giveA: "Derek gives Renee verified ground — plans built on facts he's already tested twice.",
  giveB: "Renee gives Derek's rigor somewhere to live — a real structure, on a real calendar, instead of a standard waiting for an occasion.",
  moveA: "Once in a while, vote yes to the unplanned thing, out loud, first. From you it's a permission slip for both of you.",
  moveB: "Same move. Between two careful people, somebody has to bring the recklessness ration, and it might as well rotate."
},

"derek|sofia": {
  read: [
    "Two quiet, thorough, unshowy people whose answer sheets agree at a rate most pairs can't touch. The shared ground is enormous: neither performs, neither rushes, neither says a thing twice. The difference is what leads. Derek's precision fronts the operation — the standard is the point, and the calm serves it. Sofia's steadiness fronts hers — the keel is the point, and the care serves that.",
    "In practice: he's holding the work to spec, she's holding the world steady, and both jobs run so silently that each can underrate how much the other one is carrying. This is the pairing most likely to function perfectly for years and never once discuss it."
  ],
  misreadA: "Derek's detail-holding can read to Sofia as fuss over things that were fine. To him fine-unverified isn't a category — checked is how a thing becomes fine.",
  misreadB: "Sofia's flexibility on specifics can read to Derek as lower standards. Look at what she's exact about: showing up, following through, staying level. Her precision is behavioral, and it never misses.",
  giveA: "Derek makes sure what Sofia steadily maintains is worth maintaining — right at the core, not just running.",
  giveB: "Sofia gives his standards a stable world to apply to — nothing thrashing, nothing dramatic, everything where it was left.",
  moveA: "Tell her which detail is load-bearing so she can care about it your way. She'll hold it forever; she just prices details differently.",
  moveB: "Hand him a real problem now and then — something to verify, fix, or figure. It's not burdening him; it's feeding him."
},

"elliana|kate": {
  read: [
    "The two room-readers. Both of you track the table nobody else is tracking — who's in, who's fading, what the temperature is — and you respond with different instruments. Kate adjusts the room: warmth up, plates full, that one pulled back in. Elliana adjusts herself: the register the moment needs, on demand. Between you, no guest goes unread.",
    "You also cover each other's ranges: warmth alone doesn't land in every room, and Elliana has the other registers; range alone doesn't hold a family together, and Kate has the hearth. The friction, when it exists, is faint and specific — each of you can read the other's adjustment as a signal when it was just craft."
  ],
  misreadA: "Elliana's cooler modes can read to Kate as something's wrong — because in Kate's language a temperature drop is information. Usually it's just Elliana matching a different room than the one Kate is warming.",
  misreadB: "Kate's constant warmth can read to Elliana as a single setting — as if Kate couldn't do the other registers. She can; she's chosen. The warmth is a discipline, not a limitation.",
  giveA: "Elliana covers the rooms warmth alone can't carry — the tense ones, the formal ones, the ones that need an edge.",
  giveB: "Kate gives Elliana somewhere to stop calibrating — a table where the mode is preset to welcome.",
  moveA: "Tell her when a mode is just a mode. One sentence saves her an evening of quiet worry.",
  moveB: "Borrow her range on purpose when warmth isn't landing. Handing her the hard room isn't failing at your job — it's staffing it."
},

"elliana|mike": {
  read: [
    "The family's two easiest people to be around, for opposite reasons. Mike is easy because he holds one comfortable register and keeps everyone in it. Elliana is easy because she'll match whatever register you brought. Put them together and there's no friction to find — which is itself the finding: someone has to generate a preference, and neither of you is reaching for the pen.",
    "“Whatever you want” squared is a real phenomenon between you: two genuinely flexible people, each deferring to the other's deferral, choosing the default nobody chose. Nine times out of ten the default is fine. The tenth time, both of you had a real preference, and both of you yielded it to be nice — a small double loss that neither reports."
  ],
  misreadA: "Elliana's accommodation can read to Mike as truly having no preference. She has one — it's just parked behind her read of what keeps things easy, which is the language he speaks best.",
  misreadB: "Mike's easygoing yes can read to Elliana as the full answer. It's the sociable layer; his actual pick shows up on the second, more casual ask.",
  giveA: "Elliana brings the range — when the easy default won't do, she's the one who can shift the whole gear.",
  giveB: "Mike brings the floor — around him, her calibration can finally idle, because the room is already handled.",
  moveA: "Take turns going first. “I actually want X” from you frees him to have a preference too.",
  moveB: "Same rule. Whoever names a real pick first that day wins the tenth time for both of you."
},

"elliana|renee": {
  read: [
    "The planner and the flex, closer in temperament than the labels suggest. Renee builds structure ahead of time because structure is how a day goes right. Elliana keeps her options open because reading the moment is how she gets it right. One optimizes before; one optimizes during. A well-run day usually needs both, in that order.",
    "The trade works cleanly when each trusts the other's phase. Renee's plan gives Elliana a solid frame to improvise inside — and improvising inside a good frame is her best work. Elliana's in-the-moment reads catch what no plan could have known — and handing those to Renee early is how the next plan gets even better."
  ],
  misreadA: "Elliana's it-depends posture can read to Renee as unreliability about the plan. She's reliable about the outcome — she's just reserving the route, which is where her value lives.",
  misreadB: "Renee's early-lock instinct can read to Elliana as a cage. It's a foundation. She locks the load-bearing parts so the day can afford Elliana's freelancing everywhere else.",
  giveA: "Elliana handles the parts no plan covers — the mood shift, the surprise guest, the moment that needed reading, not scheduling.",
  giveB: "Renee builds the frame that makes flexibility a luxury instead of an emergency.",
  moveA: "Lock the two details she needs locked, early and cheerfully. It buys you the whole rest of the day loose.",
  moveB: "Leave one block genuinely unplanned, on purpose, and let her run it. It's not a gap in the plan; it's a feature you can't build."
},

"elliana|sofia": {
  read: [
    "The adjustable and the anchored. Sofia holds one steady setting, chosen and true; Elliana carries the whole dial. What makes this pairing quietly good is that Elliana never has to perform for Sofia — steadiness doesn't ask the room to entertain it — and Sofia never has to adapt for Elliana, because adaptation is the one commodity Elliana never runs short of.",
    "Each is also slightly illegible to the other in a predictable spot: constancy can't quite imagine choosing to shift, and range can't quite imagine not needing to. It's worth both of you knowing that the other's mode is chosen — Sofia's stillness is self-possession, not passivity, and Elliana's motion is calibration, not restlessness."
  ],
  misreadA: "Elliana's shifting can read to Sofia as restlessness — someone not yet settled. She is settled; the settling just lives underneath the modes, in what she protects across all of them.",
  misreadB: "Sofia's sameness can read to Elliana as passivity — a person on default. It's the opposite: one deliberate setting, held on purpose, for years. That's not an absence of choosing. It's one long choice.",
  giveA: "Elliana speaks for Sofia in rooms Sofia would rather not address — the flexible front end to a steady core.",
  giveB: "Sofia is the fixed point Elliana can calibrate against — the reading that's always true.",
  moveA: "Ask her the direct question others assume she'd have volunteered. She won't have; the answer will be worth it.",
  moveB: "Tell her which mode you'd like more of. She takes requests — nobody ever thinks to make one."
},

"kate|mike": {
  read: [
    "The comfortable pairing — the family's two warm-steady people, fluent in each other from the first sentence. Both of you read rooms, keep peace, and prefer everyone happy over anyone right. Kate does it as the gatherer, actively building the warmth; Mike does it as the regulator, keeping everything light and level. Same values, two different instruments, zero translation cost.",
    "One shared trait runs deep enough to name: neither of you will start the hard conversation. Ever. Between two conflict-averse people, the difficult thing doesn't get half as much airtime — it gets none, indefinitely, while both of you tend the pleasantness around it. Nothing about this pairing needs fixing except that single missing job."
  ],
  misreadA: "Kate's tending can occasionally read to Mike as making things heavier than they need to be — a check-in where a joke would've done. Her check-ins are the joke's cousin: same goal, the room okay, different tool.",
  misreadB: "Mike's deflecting humor can read to Kate as not taking the moment seriously. He is — the joke is him taking it seriously; it's a pressure valve installed on purpose.",
  giveA: "Kate gives Mike's ease a destination — gatherings worth keeping light.",
  giveB: "Mike gives Kate a co-host who never adds to the load — the one guest who's self-tending.",
  moveA: "Whichever of you notices the hard thing first, says it — that's the rule, or it goes unsaid forever.",
  moveB: "Same rule, and it's usually you who noticed. The gentle version counts; silence doesn't."
},

"kate|renee": {
  read: [
    "The gatherer and the coordinator. Kate fills the room; Renee makes the room run. Any occasion that has ever gone truly well owes something to both jobs — someone made everyone want to be there, and someone made sure there was somewhere to be, at a time, with food. Each of you privately believes her half is the harder half. You're both right.",
    "The seam shows at the guest list and the clock: Kate's instinct says the more, the later, the merrier — the door stays open. Renee's says a headcount is a load-bearing number. Neither is wrong; a party is both a feeling and a logistics problem. The best ones happen when the two of you trade drafts instead of defending them."
  ],
  misreadA: "Kate's open-door spontaneity can read to Renee as chaos volunteering itself. It's hospitality — the extra chair is the whole point of the table.",
  misreadB: "Renee's run-sheet can read to Kate as coldness around something that should be warm. The sheet is warmth, in her dialect — it's how she makes sure nobody, including Kate, is scrambling at six o'clock.",
  giveA: "Kate supplies the reason everyone came.",
  giveB: "Renee supplies the reason it worked.",
  moveA: "Get her the headcount early — it's the one gift that makes her whole job possible.",
  moveB: "Build one extra chair into every plan. Then her surprise guest is your contingency, already handled."
},

"kate|sofia": {
  read: [
    "Warm steadiness and cool steadiness. The same deep keel runs under both of you — patient, loyal, unshakeable — surfaced two ways: Kate's steadiness reaches outward, toward the table and the group; Sofia's holds inward, toward the small circle and the quiet. Neither of you is more caring than the other. You're running different ranges on the same current.",
    "The gap to manage is scale. Kate's love wants everyone there; Sofia's wants almost no one, on purpose. Left unnamed, that difference miscounts itself as rejection in one direction and pressure in the other — when it's actually just two correct answers to “how many people make an evening good?”"
  ],
  misreadA: "Kate's gathering can land on Sofia as obligation pressure — another full table to attend. The invitation was never a demand; in Kate's language, being wanted there is the entire message.",
  misreadB: "Sofia's small-circle preference can land on Kate as withdrawal from her. It isn't — Sofia at a quiet kitchen table is Sofia at maximum connection. The small room is the compliment.",
  giveA: "Kate makes sure Sofia stays woven in — included, remembered, expected — without Sofia ever having to work the room for it.",
  giveB: "Sofia is the guest Kate never has to host — and the one who sees the work behind Kate's effortless evenings.",
  moveA: "Invite her without headcount pressure — “come for the first hour” is a real invitation, and it's the one she'll take.",
  moveB: "Take the first hour, visibly glad. An hour of present beats an evening of polite, and she'd rather have it too."
},

"mike|renee": {
  read: [
    "Ease meets order. Renee builds the structure of family life — the plans, the calendar, the day that runs. Mike supplies the atmosphere inside it — the lightness that makes the structure worth building. Each of you is quietly essential to the other's product: her plans without his ease are efficient and a little airless; his ease without her plans dissolves into a nice afternoon nobody organized.",
    "The friction, such as it is, is billing. Renee can feel like the only adult holding the clipboard while Mike floats; Mike can feel the clipboard hovering over perfectly good afternoons. Both readings are half-true, which is what keeps them alive."
  ],
  misreadA: "Mike's looseness can read to Renee as leaving the work to her. Some of it is obliviousness, not evasion — the logistics are simply invisible to him, the way the mood he's tending is invisible to most people.",
  misreadB: "Renee's structure can read to Mike as the fun being scheduled out of things. The structure is what the fun stands on — somebody booked the thing everyone's being spontaneous at.",
  giveA: "Mike keeps her plans humane — the loose air inside the itinerary that makes it a day instead of a program.",
  giveB: "Renee keeps his days from dissolving — the two fixed points that turn a nice mood into an actual memory.",
  moveA: "Own one lane completely — the drinks, the tickets, the driving — and run it every time without being asked. One owned lane retires years of clipboard.",
  moveB: "Leave one stretch of the plan officially loose and let him fill it. Label it on the itinerary if it helps. It will not fail — that stretch is his craft."
},

"mike|sofia": {
  read: [
    "Two low-key people, different kinds of low-key. Mike's is social — easy company, light touch, the room kept comfortable. Sofia's is private — quiet competence, small circle, words used sparingly. Neither of you performs, neither pushes, and so you coexist beautifully: the family's least demanding pairing, in both directions.",
    "The one crossed wire is what quiet means. To Mike, a quiet person might need warming up — so he brings the line, the nudge, the gentle include. To Sofia, quiet is the destination, already reached. His cheer isn't a misread of her so much as a standing offer; her non-uptake isn't a decline of him so much as a receipt."
  ],
  misreadA: "Mike's joking can read to Sofia as never-serious. The jokes are where his serious things live — listen to the third one; it's usually carrying something real.",
  misreadB: "Sofia's quiet can read to Mike as a mood to fix. It isn't — it's her at optimal. She was having a good time before the rescue, and she'll be having one after.",
  giveA: "Mike keeps a light line running to Sofia that never demands anything back — included, at her own volume.",
  giveB: "Sofia gives Mike a rare audience: someone he never has to entertain, whose calm is real all the way down.",
  moveA: "Match her quiet sometimes instead of warming it. Ten silent minutes in the same room is, to her, a complete conversation.",
  moveB: "Laugh at the third joke. That one was for you."
},

"renee|sofia": {
  read: [
    "Near-twins on the careful, steady side of the family — and genuinely different at the leading edge. Renee's carefulness runs forward: plan it, sequence it, have it handled before it arrives. Sofia's steadiness runs deep: absorb it, stay level, handle it as it comes. One pre-loads the world; one out-lasts it. Both styles produce the same outward result — a person you can absolutely count on — by almost opposite internal methods.",
    "Because you resemble each other so closely, each of you tends to assume the other wants what she wants — and you're usually right, which is exactly why the exceptions blindside you. The pair runs so smoothly on assumed agreement that neither of you has much practice at catching the one day the assumption is wrong."
  ],
  misreadA: "Renee's pre-planning can read to Sofia as worry — solving problems that don't exist yet. It isn't anxiety; it's how she buys the calm that Sofia generates natively.",
  misreadB: "Sofia's take-it-as-it-comes can read to Renee as leaving things to chance. Nothing's being left — Sofia's capacity to absorb the unexpected is a plan; it's just stored in the person instead of the calendar.",
  giveA: "Renee hands Sofia days that never need absorbing — pre-smoothed, pre-sequenced, nothing to outlast.",
  giveB: "Sofia is the contingency Renee can't write down — whatever the plan misses, she's the one who takes it in stride.",
  moveA: "Say the exception loudly when you have one. She calibrates to your usual yes; the rare no needs a flag on it.",
  moveB: "Same rule, mirrored. Your agreement rate is why neither of you sees the exception coming."
}
};

/* Fallback for pairs involving someone new. */
function genericPairRead(an){
  const A = an.A, B = an.B;
  const read = [];
  if (an.pairingType === "both"){
    const fast = A.pace > B.pace ? A : B, slow = fast === A ? B : A;
    read.push(fast.name + " and " + slow.name + " differ on both of the big axes: speed, and what the speed is for. " + fast.name + " treats a decision as live the moment it's spoken; " + slow.name + " treats it as real once there's been time to sit with it. Neither is doing the other's step wrong — they're doing different steps.");
  } else if (an.pairingType === "pace"){
    const fast = A.pace > B.pace ? A : B, slow = fast === A ? B : A;
    read.push("Same priorities, different clocks. " + fast.name + " is ready early; " + slow.name + " arrives more slowly and more finished. The gap between you is mostly timing — which is the most fixable gap there is, and the easiest one to mistake for something personal.");
  } else if (an.pairingType === "priority"){
    const task = A.pri > B.pri ? A : B, ppl = task === A ? B : A;
    read.push("Same speed, different destinations. " + task.name + " is watching whether the plan holds; " + ppl.name + " is watching how it lands on the people in it. A good outcome needs both watched — this pair covers it naturally, as long as each remembers the other is guarding something real.");
  } else {
    read.push(A.name + " and " + B.name + " sit on the same side of the family's big axes. The overlap is comfortable and real. The remaining differences live in the four letters below — smaller gaps, but the ones that decide how a specific evening actually goes.");
  }
  const d0 = an.diffs[0];
  if (d0 && d0.abs >= 12){
    const more = d0.diff > 0 ? A : B, less = more === A ? B : A;
    read.push("The single widest letter gap between you is " + d0.d + ": " + more.name + " " + (d0.diff>0?d0.a:d0.b) + ", " + less.name + " " + (d0.diff>0?d0.b:d0.a) + ". That's a real difference in " + LETTER_GLOSS[d0.d] + " — worth translating on purpose rather than discovering by accident.");
  }
  return {
    read: read,
    misreadA: A.name + "'s default reads differently up close than it looks from the outside — check the read before acting on it.",
    misreadB: B.name + "'s default deserves the same courtesy in the other direction.",
    giveA: A.name + " covers ground " + B.name + " doesn't naturally walk.",
    giveB: B.name + " does the same in return — that's what the gap is for.",
    moveA: "Ask one direct question you'd normally answer by assumption.",
    moveB: "Same move, other direction. (This pair doesn't have a hand-written read yet — see the README to add one.)",
    generated: true
  };
}

/* ======================= generated pair material ====================== */

function pairGeometry(an, pf, F){
  if (!pf || !F) return "";
  if (F.closestPair && pf.l1 === F.closestPair.l1) return "The two closest profiles in the family — " + pf.l1 + " points apart across the four scores.";
  if (F.widestPair && pf.l1 === F.widestPair.l1) return pf.l1 + " points apart across the four scores — the widest gap in the family. Nobody here has more translating to do, or more coverage when they do it.";
  if (pf.l1 <= F.avgL1 * 0.6) return pf.l1 + " points apart across the four scores — one of the family's closest pairings.";
  if (pf.l1 >= F.avgL1 * 1.5) return pf.l1 + " points apart across the four scores — one of the family's wider spans. (Family average: " + F.avgL1 + ".)";
  return pf.l1 + " points apart across the four scores, near the family average of " + F.avgL1 + ".";
}

function pairReceipts(an, pf, F){
  if (!pf || !F) return [];
  const A = an.A.name, B = an.B.name;
  const out = [];
  const n = F.nPairs;
  const maxSame = F.mostMatched ? F.mostMatched.sameMost : null;
  const minSame = n ? Math.min.apply(null, F.pairList.map(e=>e.sameMost)) : null;
  const maxClash = F.mostInverted ? F.mostInverted.clash : null;
  const minClash = n ? Math.min.apply(null, F.pairList.map(e=>e.clash)) : null;

  let s1 = "You sat the same 28 questions. You picked the same “most me” answer on " + pf.sameMost + " of them";
  if (pf.identical > 0) s1 += ", and on " + pf.identical + " you matched top to bottom — same “most,” same “least.”";
  else s1 += ", and never once matched an answer top to bottom.";
  if (n >= 6 && pf.sameMost === maxSame) s1 += " No pair in this family agrees more.";
  if (n >= 6 && pf.sameMost === minSame) s1 += " No pair in this family agrees less.";
  out.push(s1);

  let s2;
  if (pf.clash === 0){
    s2 = "Not once did either of you claim an answer the other had rejected. Zero crossed wires in 28 questions.";
  } else {
    s2 = "On " + pf.clash + " of the 28, one of you claimed the very answer the other marked “least me.”";
    if (n >= 6 && pf.clash === maxClash) s2 += " That's the highest crossover of any pair here: where one of you sees yourself is precisely where the other doesn't.";
    if (n >= 6 && pf.clash === minClash) s2 += " No pair in the family crosses wires less.";
  }
  out.push(s2);

  if (pf.sameLeast >= 10){
    out.push("You agree hardest about what you're not: on " + pf.sameLeast + " questions you rejected the same option. Whatever you two are, you're jointly sure of what you aren't.");
  }
  if (F.closestPair && pf.l1 === F.closestPair.l1 && pf.sameMost <= 9){
    out.push("And here's the strange one: you own the closest scores in the family, yet you matched answers on only " + pf.sameMost + " of 28 questions. You arrived at nearly the same shape from different instincts — same silhouette, different routes.");
  }
  if (pf.approx){
    out.push("One caveat: at least one of these answer sheets was reconstructed from recorded scores, so treat the question-level counts as close estimates.");
  }
  return out;
}

function alikeParas(an, pf){
  const A = an.A, B = an.B;
  const out = [];
  const sharedSide = [];
  if (A.paceW.lean === B.paceW.lean && A.paceW.lean !== "mixed"){
    sharedSide.push(A.paceW.lean === "fast" ? "you both run quick — plans feel live early" : "you both run unhurried — plans become real with time, not pressure");
  }
  if (A.priW.lean === B.priW.lean && A.priW.lean !== "mixed"){
    if (A.priW.lean === "people"){
      if (A.via === B.via){
        sharedSide.push(A.via === "I" ? "you're both tuned to the people in the room, the energetic way — company and momentum" : "you're both tuned to the people in the room, the caretaking way — whether everyone is actually okay");
      } else {
        sharedSide.push("you're both tuned to the people in the room — one of you through energy, the other through care, which looks identical from a distance and isn't");
      }
    } else {
      sharedSide.push("you're both tuned to the plan — whether the thing itself holds up");
    }
  }
  if (sharedSide.length){
    out.push("Start with the overlap: " + sharedSide.join(", and ") + ". Shared ground like that is why some evenings between you need no negotiation at all.");
  }
  const shared = ["D","I","S","C"].filter(d=>A.N[d] >= 36 && B.N[d] >= 36);
  if (shared.length){
    out.push("You also share real weight on " + shared.map(d=>d + " (" + A.name + " " + A.N[d] + ", " + B.name + " " + B.N[d] + ")").join(" and ") + " — " + shared.map(d=>LETTER_GLOSS[d]).join("; ") + ". Where you match, you'll also miss the same things; the corner neither of you covers is worth knowing about.");
  } else {
    out.push("You don't share a single letter at moderate strength or above — the overlap between you, where it exists, is temperament, not type. What you have in common you built, and that's sturdier than resemblance anyway.");
  }
  return out;
}

function scaleReads(an){
  const A = an.A, B = an.B;
  const gloss = {
    pace: "when a decision starts feeling real",
    priority: "what gets protected first",
    frank: "how blunt the first draft of a sentence is",
    outgoing: "how much of the thinking happens out loud",
    daring: "the appetite for moving before everything is verified"
  };
  const bigClose = {
    pace: "This is the headline gap of the pairing: align the clocks and most of the rest becomes footnotes.",
    priority: "Same table, different cargo — worth saying out loud which one tonight is actually about.",
    frank: "Translate accordingly: the bluntness isn't temper, and the softening isn't evasion. It's the same sentence, drafted twice.",
    daring: "One of you calls it momentum and the other calls it gambling. It's both, which is why you need each other's vote.",
    outgoing: "One of you drafts in public and one publishes only finished work. Neither is hiding anything."
  };
  return (an.continua || []).map(c=>{
    const L = c.posA < c.posB ? A : B;
    const R = L === A ? B : A;
    const g = Math.round(c.gap);
    if (c.gap < TINY_CONT){
      return c.left + " vs " + c.right + ": nearly identical — on " + gloss[c.id] + ", you're the same person.";
    }
    if (c.gap < 25){
      return c.left + " vs " + c.right + ": a modest " + g + "-point gap. " + L.name + " a step toward " + c.left.toLowerCase() + ", " + R.name + " toward " + c.right.toLowerCase() + " — noticeable on " + gloss[c.id] + ", but the kind of gap one sentence fixes.";
    }
    return c.left + " vs " + c.right + ": " + g + " points, " + L.name + " well toward " + c.left.toLowerCase() + " and " + R.name + " well toward " + c.right.toLowerCase() + ". This gap decides " + gloss[c.id] + ". " + bigClose[c.id];
  });
}

function pairLede(an){
  const A = an.A, B = an.B;
  const p1 = A.name + " runs " + A.paceW.phrase + " and " + A.priW.phrase + ". " + B.name + " runs " + B.paceW.phrase + " and " + B.priW.phrase + ".";
  let which;
  if (an.largerGap === "both") which = "The two gaps are about the same size — you'll feel them both.";
  else if (an.largerGap === "pace") which = "The wider gap is pace: when a plan becomes real. Get the clocks aligned and most of the rest follows.";
  else which = "The wider gap is priority: what each of you is protecting. Same speed, different cargo.";
  return p1 + " " + which;
}

function pairTypeLabel(an, pf, F){
  if (pf && F && F.nPairs >= 4){
    if (F.closestPair && pf.l1 === F.closestPair.l1) return "The family's closest pairing";
    if (F.widestPair && pf.l1 === F.widestPair.l1) return "The family's full wingspan";
  }
  if (an.pairingType === "both") return "Different speed, different cargo";
  if (an.pairingType === "pace") return "Same priorities, different clocks";
  if (an.pairingType === "priority") return "Same speed, different cargo";
  if (an.pairingType === "center") return "Two flexible profiles";
  return "Same side of the map";
}

function pairCopy(a, b){
  const an = pairAnalysis(a, b);
  const F = (typeof FACTS !== "undefined") ? FACTS : null;
  const pf = F ? F.pairs[F.pairKey(a.id, b.id)] : null;

  const key = [a.id, b.id].sort().join("|");
  const bespoke = PAIR_READS[key] || genericPairRead(an);
  /* bespoke text is written with A = first id alphabetically; flip if needed */
  const flipped = a.id !== [a.id, b.id].sort()[0];
  const mA = flipped ? bespoke.misreadB : bespoke.misreadA;
  const mB = flipped ? bespoke.misreadA : bespoke.misreadB;
  const gA = flipped ? bespoke.giveB : bespoke.giveA;
  const gB = flipped ? bespoke.giveA : bespoke.giveB;
  const vA = flipped ? bespoke.moveB : bespoke.moveA;
  const vB = flipped ? bespoke.moveA : bespoke.moveB;

  return {
    analysis: an,
    typeLabel: pairTypeLabel(an, pf, F),
    lede: pairLede(an),
    geometry: pairGeometry(an, pf, F),
    read: bespoke.read,
    generated: !!bespoke.generated,
    receipts: pairReceipts(an, pf, F),
    strip: pf ? pf.strip : null,
    alike: alikeParas(an, pf),
    misreadA: mA, misreadB: mB,
    giveA: gA, giveB: gB,
    moveA: vA, moveB: vB,
    scaleReads: scaleReads(an)
  };
}

/* ============================ family page ============================= */

function familyClusters(people){
  const snaps = people.map(personSnapshot);
  return {
    snaps,
    fast: snaps.filter(s=>s.pace > EVEN_BAND),
    slow: snaps.filter(s=>s.pace < -EVEN_BAND),
    slowTask: snaps.filter(s=>s.pace < -EVEN_BAND && s.priW.lean === "task"),
    slowPeople: snaps.filter(s=>s.pace < -EVEN_BAND && s.priW.lean === "people"),
    center: snaps.filter(s=>s.center)
  };
}

function houseFacts(){
  const F = (typeof FACTS !== "undefined") ? FACTS : null;
  if (!F) return [];
  const out = [];
  const n = F.familySize;

  const leads = ["D","I","S","C"].map(d=>({d, names:F.leadCounts[d]}))
    .sort((a,b)=>b.names.length-a.names.length);
  const lead0 = leads[0];
  if (lead0.names.length >= Math.ceil(n/2) && n >= 4){
    out.push(LETTER_WORD[lead0.d].charAt(0).toUpperCase() + LETTER_WORD[lead0.d].slice(1) + " is the house letter: " + lead0.names.length + " of the " + n + " people here lead with " + lead0.d + " (" + lead0.names.join(", ") + ").");
  }
  const zeroLeads = leads.filter(l=>l.names.length===0);
  if (zeroLeads.length){
    out.push("Nobody in this family leads with " + zeroLeads.map(l=>l.d).join(" or ") + ". " + (zeroLeads.some(l=>l.d==="D") ? "Plenty of people here can push — nobody's wired to push first." : ""));
  }
  out.push("The family's average profile is D " + F.avg.D + ", I " + F.avg.I + ", S " + F.avg.S + ", C " + F.avg.C + " — a steady, careful house by temperament, whatever any given evening looks like.");

  if (F.topTies.length >= 2){
    const t = F.topTies;
    const sameDir = t.every(c=>c.d===t[0].d);
    if (!sameDir){
      let s = "The " + (t.length===2?"two":String(t.length)) + " highest scores on the whole board are " + (t.length===2?"both":"all") + " " + t[0].n + "s: " + t.map(c=>c.name + "'s " + c.d).join(" and ") + " — twin peaks pointing in different directions.";
      if (F.widestPair && t.length === 2){
        const ids = [t[0].id, t[1].id].sort().join("|");
        const wid = [F.widestPair.aId, F.widestPair.bId].sort().join("|");
        if (ids === wid) s += " They belong to the two people farthest apart here, which is not a coincidence.";
      }
      out.push(s);
    }
  } else if (F.topCell){
    out.push("The single highest score on the board is " + F.topCell.name + "'s " + F.topCell.d + " at " + F.topCell.n + ".");
  }
  if (F.closestPair && F.widestPair && F.nPairs >= 4){
    out.push("Closest pair: " + F.closestPair.aName + " and " + F.closestPair.bName + ", " + F.closestPair.l1 + " points apart. Widest: " + F.widestPair.aName + " and " + F.widestPair.bName + ", at " + F.widestPair.l1 + ". Family average between any two people: " + F.avgL1 + ".");
  }
  if (F.mostMatched && F.nPairs >= 4){
    out.push("Most in-sync answer sheets: " + F.mostMatched.aName + " and " + F.mostMatched.bName + " picked the same “most me” answer on " + F.mostMatched.sameMost + " of 28 questions." +
      (F.mostInverted ? " Most inverted: " + F.mostInverted.aName + " and " + F.mostInverted.bName + " — on " + F.mostInverted.clash + " questions, one claimed what the other rejected." : ""));
  }
  if (F.unanimity.length){
    const u = F.unanimity[0];
    out.push("The closest this family comes to unanimity: on one question, " + u.count + " of " + u.of + " people picked the same answer — the " + LETTER_WORD[u.letter] + " option" + (u.dissenters.length ? " (everyone but " + u.dissenters.join(" and ") + ")" : "") + ".");
  }
  return out;
}

/* ============================== exports =============================== */

if (typeof window !== "undefined"){
  window.EVEN_BAND = EVEN_BAND;
  window.TINY_CONT = TINY_CONT;
  window.netsOf = netsOf;
  window.paceWords = paceWords;
  window.priWords = priWords;
  window.pairAnalysis = pairAnalysis;
  window.pairCopy = pairCopy;
  window.personHome = personHome;
  window.personSnapshot = personSnapshot;
  window.familyClusters = familyClusters;
  window.houseFacts = houseFacts;
  window.firstName = firstName;
  window.CONTINUA_META = CONTINUA_META;
  window.clamp100 = clamp100;
  window.PERSON_READS = PERSON_READS;
  window.PAIR_READS = PAIR_READS;
}
if (typeof module !== "undefined" && module.exports){
  module.exports = {pairAnalysis, pairCopy, personHome, personSnapshot, familyClusters, houseFacts, netsOf, paceWords, priWords, firstName, EVEN_BAND, PERSON_READS, PAIR_READS};
}
