# Family DISC

A private DISC read for one family, first names only. Static site — no build step, no
dependencies, nothing leaves the browser. Everyone answered the same 28 forced-choice
questions; the site reads the results individually, pairwise, and as a house.

Live: https://akemppy.github.io/disc-family/

## What makes it different

Most personality sites paraphrase your scores back at you. This one also reads the
**answer sheets themselves**. Because everyone sat the identical questions, the site can
compute things no summary paragraph knows:

- how many of the 28 questions two people answered identically, and on how many one
  person's "most me" was the other's "least me"
- who never once claimed a letter, or never once rejected one, across all 56 judgments
- where the forced trade-offs and the free 1–5 self-ratings disagree — the gap between
  the public answer and the private one
- every family-relative rank, distance, and superlative — closest pair, widest pair,
  most in-sync answer sheets, the family's center of gravity

All of it recomputes live from `people.js`. Add a person and every rank, receipt, and
house number updates itself.

## Files

| File | What it holds |
|---|---|
| `index.html` | Shell. Loads the five scripts in order. |
| `styles.css` | All styling. Warm paper, navy heroes, the four letter colors. |
| `people.js` | The people: id, name, 56-char answer code, optional 24-char likert string, notes. The single source of truth. |
| `facts.js` | The measurement layer. `buildFacts(FAMILY)` computes item-level counts, pairwise agreement, distances, ranks, and family superlatives. Pure computation, no prose, nothing hardcoded. |
| `compare.js` | The reading layer. Hand-written reads (`PERSON_READS` by id, `PAIR_READS` by sorted `"idA|idB"`), generated receipts that quote live numbers, the five scales, generic fallbacks for anyone new. |
| `disc-copy.js` | Original report copy (profile names, four-dimension write-ups), kept in the "From the original report" fold. |
| `app.js` | Scoring (do not change the math), rendering, routing. Five views: home, person, pair, family, method. |
| `verify.js` | `node verify.js` — renders all 84+ pages in Node and fails on `undefined`, `NaN`, unbalanced tags, or classes with no CSS. Run before every push. |

## Adding or updating a person

1. Add an entry to the `PEOPLE` array in `people.js`. Only `id`, `name`, `code` (and
   `report`) are required — everything else on the site derives from the code.
   `likert` (24 digits, 1–5, interleaved D-I-S-C × 6) unlocks the intensity card and the
   public-vs-private receipts. Use `note` for any data caveat; if it contains
   "approximated" or "rebuilt," item-level receipts are automatically flagged as
   reconstructions.
2. Run `node verify.js`. The new person's page, all their pairings, and every family
   fact will already exist, with generated prose and a visible "no hand-written read
   yet" note.
3. Write the bespoke read: add a `PERSON_READS[id]` entry (`hero`, `read[]`, `annoy[]`,
   `light[]`, `living[]`) and a `PAIR_READS["a|b"]` entry per pairing (`read[]`,
   `misreadA/B`, `giveA/B`, `moveA/B` — **A is always the alphabetically first id**;
   the engine flips automatically when the page is opened in the other order).
   `verify.js` warns about missing coverage; it's a warning, not a failure.

If someone retakes the test, just replace their `code`/`likert` — but reread their
`PERSON_READS` entry, since bespoke prose cites their own scores.

## House style for the written reads

- Second person on person pages; names on pair pages.
- A scene beats an adjective: "you call the restaurant while they're still weighing it"
  beats "impatient."
- Say the thing. No hedging clauses mid-sentence. The honesty note lives once, in the
  footer of every page, and links to the method page — that's its home, not the body copy.
- People-focus through I (energy, company) and people-focus through S (care, keeping the
  group whole) are different things. Never write one as the other.
- A balanced profile is a finding, not a failure. Never write flexibility as vagueness.
- Family-relative claims ("highest in the family," "all 8 of them") belong in the
  computed receipts, never in hand-written text — hand-written facts go stale when
  people are added; computed ones can't.

## Check before you push

```bash
node verify.js
```

Node only, no install. It loads the real shipped files, so it cannot drift from what
ships.
