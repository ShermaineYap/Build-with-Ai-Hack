---
doc: prd
status: approved
---
<!-- Approval: decisions taken from the accepted Champion Idea plan (Claude Docs,
     2026-10-24); Shermaine asked Claude to proceed ("do everything"). -->

# Baca Dulu — Product Requirements

A one-screen web app that decodes a Malaysian job offer letter for a final-year student or fresh grad: real take-home pay, clauses that bite, and questions to ask HR.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. The user opens Baca Dulu. They see a short promise ("Your first offer letter, decoded"), a large text box, and a **Try a sample letter** link. (`scope.md > The Core Loop`)
2. They paste their offer letter text, or tap the sample link, which fills the box with the Nusantara Analytics letter.
3. They tap **Decode**. The button shows a brief "Reading your letter…" state.
4. The results appear beside the letter (below it on a phone) in three panels, in this order:
   1. **Take-home** — a receipt: gross monthly pay, each deduction, and net pay in the bank.
   2. **Clauses that bite** — cards sorted red → amber → green, each with the quoted sentence.
   3. **Ask before you sign** — 3–5 numbered questions and a **Copy all** button.
5. Tapping a clause card highlights that sentence in the letter on the left and scrolls to it.
6. They tap **Copy all**, and paste the questions into an email to HR. Success = they understand what they're signing and have questions ready. (`scope.md > What "Working" Looks Like`)

## Screens and Layout
One screen.
- **Header strip:** wordmark "Baca Dulu", tagline "Your first offer letter, decoded" with the small Malay caption *Baca dulu, baru sign.*, and a mode tag showing how the letter was read ("Built-in rules" or "AI reading").
- **Left column — Your letter:** text box (becomes a read-only highlighted view after decoding, with an **Edit letter** link), character count, privacy note, **Try a sample letter**, **Decode** button.
- **Right column — Results:** the three panels stacked. Before decoding, an empty-state card explains what you'll get.
- **Footer:** "Estimates only — not legal, tax or financial advice. Check with EPF, PERKESO, LHDN or a lawyer." plus links.
- On screens under ~900px wide the columns stack: letter on top, results below.

## Look and Feel
- **Mood:** a Malaysian payslip or a kedai receipt. Warm off-white "paper" background, dark ink text, thin rules and dashed separators.
- **Type:** a monospaced face for every number and the receipt panel; a clean humanist sans for everything else.
- **Colour:** one deep teal accent for actions; flag colours limited to stamp red, turmeric amber and a muted green, used only on severity badges and card edges.
- **Details:** severity badges look like rubber stamps (uppercase, slightly rotated, bordered). Bilingual micro-labels: English first, small Malay caption (*Gaji kasar*, *Gaji bersih*, *Potongan*, *Soalan untuk HR*).
- **Tone of copy:** a kind senior who has been through it — short, plain sentences, no legal jargon, never scary.
- **Avoid:** gradients, glassmorphism, purple, emoji, chat bubbles, generic "AI sparkle" icons.

## Features and Behavior

### Reading the letter
- As a fresh grad, I want to paste my letter and have it read for me, so that I don't have to decode legal English.
  - [ ] Decode with letter text of at least 200 characters produces all three panels.
  - [ ] Works with no API key using built-in rules; mode tag says "Built-in rules".
  - [ ] When an AI key is configured on the server, the letter is read by AI and the tag says "AI reading"; if the AI call fails, it silently falls back to built-in rules and says so in the tag.
  - [ ] Letters longer than 12,000 characters are cut to 12,000 with a visible notice.

### Take-home
- As a fresh grad, I want to see what lands in my bank account, so that I can budget and compare offers honestly.
  - [ ] Shows gross monthly pay split into basic and each allowance found.
  - [ ] Shows EPF (11%), SOCSO, EIS and estimated PCB as separate lines, then net pay.
  - [ ] SOCSO and EIS use wages capped at RM6,000; EPF and SOCSO/EIS leave out travel/transport allowances.
  - [ ] PCB is marked "estimate" and assumes a single resident with only the standard reliefs.
  - [ ] A "How we worked this out" disclosure lists every rule and assumption in plain words.
  - [ ] If an annual salary is stated instead of monthly, it is divided by 12 and labelled.
  - [ ] If no salary is found, the panel says so and offers a field to type the monthly basic.

### Clauses that bite
- As a fresh grad, I want the risky clauses pointed out with the sentence they came from, so that I know where to look and why.
  - [ ] Detects at least: training bond / penalty, probation (length and pay), notice period (and asymmetry), allowance-heavy pay structure, non-compete, transfer/relocation, overtime exclusion, working hours over 45/week, annual leave below 8 days, salary deductions/clawbacks.
  - [ ] Each card: severity stamp (Watch out / Check this / Looks normal), title, the quoted sentence, a one-sentence plain explanation, and "Is this normal in Malaysia?".
  - [ ] Cards sort red first, then amber, then green.
  - [ ] Clicking a card highlights and scrolls to the quote in the letter view.

### Ask before you sign
- As a fresh grad, I want polite questions I can send HR, so that I can raise issues without sounding difficult.
  - [ ] 3–5 questions generated from this letter's red and amber flags, each mentioning the clause.
  - [ ] **Copy all** copies plain text with a short greeting line; button confirms "Copied".

## States and Boundaries
- **First use / empty:** results column shows an explainer card with the three things you'll get and a pointer to the sample letter.
- **Too short / not a letter:** under 200 characters, or no salary *and* no recognisable clauses → a friendly message: "This doesn't look like an offer letter yet — paste the full text."
- **Loading:** Decode button disabled, "Reading your letter…".
- **AI unavailable:** falls back to built-in rules; tag reads "Built-in rules (AI unavailable)".
- **Nothing risky found:** clauses panel shows a green "Nothing alarming found" card plus what we checked.
- **Persistence:** none. The letter is never stored; refreshing clears it. Privacy note under the text box says this.

## Product Decisions
- One screen, no accounts — a one-shot answer and nothing stored keeps letters private.
- Maths is deterministic code, not AI — numbers must be trustworthy and explainable.
- Built-in rules work without a key — reviewers and users can try it with zero setup, and the demo can't fail.
- English letters only for now — most Malaysian corporate offer letters are in English.

## What We're Building
The core journey above, all acceptance criteria above, the sample letter, the footer disclaimer.

## Deferred From the POC
- PDF / photo upload — needs file parsing and OCR; paste covers the demo.
- BM / Chinese letters and UI toggle — needs translated rules and copy.
- Comparing two offers — a second layout and state.
- Save / share a result — would need storage and raise privacy questions.

## Possible Later Enhancements
- "Explain like I'm your parent" mode in BM / 中文.
- Industry-specific checks (e.g. bank, Big 4, government-linked company norms).

## Non-Goals
- Legal advice or a "sign / don't sign" verdict — we explain, the user decides.
- Salary benchmarking — no reliable data.
- A chatbot — distracts from the one-shot answer.

## Open Questions
- None blocking `4-spec`.
