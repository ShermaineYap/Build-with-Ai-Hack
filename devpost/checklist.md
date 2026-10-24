---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (Shermaine asked Claude to "do everything"; hands-on checkpoints are hers to do before recording)

## Slices

- [x] **1. Paste a letter and see your real take-home pay**
  Becomes usable: A running app where pasting the sample letter and tapping Decode shows the take-home receipt (gross → EPF, SOCSO, EIS, PCB → net).
  Why now: Proves the whole path — page, API route, reader, calculator — and the most trust-critical numbers first.
  PRD ref: `prd.md > The Core Journey` (steps 1–4), `prd.md > Features and Behavior > Take-home`
  Spec ref: `spec.md > Components > Calculator`, `spec.md > Components > Decode route`, `spec.md > File Structure`
  Build: Scaffold Next.js + TypeScript + Vitest; sample letter; salary/allowance reading in the rules reader; calculator; `/api/decode`; page with letter box and receipt panel.
  Verify (mechanical): `npm test` passes calculator tests against hand-worked values; `npm run build` succeeds; POST the sample to `/api/decode` returns basic 3200, one non-EPF allowance 600, net computed.
  Learner check: Open the app, tap Try a sample letter → Decode, and check the receipt matches what you'd expect from a RM3,800 offer.
  Commit: `Decode take-home pay from a pasted offer letter`

- [x] **2. Risky clauses appear as cards quoting your letter**
  Becomes usable: Red/amber/green cards for bond, probation, notice, allowance structure and the other detectors, each quoting the sentence; clicking a card highlights it in the letter.
  Why now: This is the kernel — reading *this* letter and pointing at the sentence.
  PRD ref: `prd.md > Features and Behavior > Clauses that bite`
  Spec ref: `spec.md > Components > Rules reader`, `spec.md > Data Model`
  Build: Sentence splitter with offsets; detectors; ClausesPanel; highlighted letter view.
  Verify (mechanical): Rules tests: sample letter yields red bond, red probation, red notice asymmetry, amber allowance; every quote equals `text.slice(start,end)`.
  Learner check: Decode the sample and click each red card; confirm the right sentence lights up.
  Commit: `Flag risky clauses with quotes and highlights`

- [x] **3. Questions to ask HR, copied in one tap**
  Becomes usable: 3–5 polite questions built from the flags with a Copy all button.
  Why now: Turns understanding into action; completes the core journey.
  PRD ref: `prd.md > Features and Behavior > Ask before you sign`
  Spec ref: `spec.md > Components > Question writer`
  Build: Question templates; QuestionsPanel with clipboard copy and confirmation.
  Verify (mechanical): Test: sample letter yields 3–5 questions mentioning bond, probation and notice.
  Learner check: Tap Copy all and paste into a note; read it as if you were HR.
  Commit: `Generate questions to ask HR`

- [x] **4. Optional AI reading with safe fallback**
  Becomes usable: With `GEMINI_API_KEY` set, letters are read by Gemini; without it, or on failure, built-in rules are used and the mode tag says which.
  Why now: Improves coverage for unusual letters without making the demo depend on a network call.
  PRD ref: `prd.md > Features and Behavior > Reading the letter`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components > AI reader`, `spec.md > External Services and Dependencies`
  Build: `lib/ai.ts` with schema, validation and quote location; route picks reader; `.env.example`.
  Verify (mechanical): Tests with a mocked Gemini response: valid → mode `ai`; unlocatable quotes dropped; thrown error → mode `rules-fallback`.
  Learner check: (Optional) add your key to `.env.local`, decode the sample, and see the tag say "AI reading".
  Commit: `Add optional Gemini reader with fallback`

- [x] **5. Finished feel: states, mobile, dark mode**
  Becomes usable: Empty state, "not a letter" message, manual basic-salary entry, nothing-alarming card, truncation notice, stacked phone layout, dark mode, footer disclaimer.
  Why now: Design is the first tie-breaker; this is what makes it a product rather than a demo.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > Look and Feel`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Look and Feel`
  Build: EmptyState, edge-state messages, responsive CSS, dark theme, footer.
  Verify (mechanical): Screenshots at 1440px and 390px wide in light and dark; short text shows the friendly message; `npm run build` passes.
  Learner check: Open on your phone-width browser window; try pasting a random paragraph.
  Commit: `Polish states, layout and dark mode`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 3 (Shermaine runs the sample end to end)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: not yet done — Shermaine delegated the build; the app map's reference route is ready for her to walk (about 3 minutes).
Route and stops: reference route only — `app/page.tsx` `decode` → `lib/rules.ts` `detectClauses` → `lib/statutory.ts` `computeTakeHome`.
Edit outcome: not applicable yet.
Reflection: not offered yet.
Activity mode: static reference (app map), not an interactive tour.

## Revisions

- Interface font changed from Atkinson Hyperlegible to Schibsted Grotesk — Atkinson's slashed zero made ringgit amounts hard to read.
- Background changed from warm paper (PRD Look and Feel) to a sage "office desk" with green-bar payslip paper — the warm-paper look is a common generic default; green-bar continuous-form paper is closer to a real Malaysian payslip.
- Added a "time to reply" (deadline) detector and a probation take-home line — the sample letter's 3-day deadline and 90% probation pay were worth surfacing; both stay inside the one-screen journey.
- Questions button labelled "Copy as email" instead of "Copy all" — it copies a short email, so the label says what happens.
