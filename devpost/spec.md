---
doc: spec
status: approved
---
<!-- Approval: decisions taken from the accepted Champion Idea plan (Claude Docs,
     2026-10-24); Shermaine asked Claude to proceed ("do everything").
     Implementation details below were chosen by Claude to fit those decisions. -->

# Baca Dulu — Technical Spec

## How This Works, In Plain Language
Baca Dulu is one web page plus one small server function.

- **The page** is where you paste the letter and see the three panels.
- **The reader** turns letter text into facts: salary, allowances, and the risky clauses with the exact sentence each came from. It has two ways of reading:
  - **Built-in rules** — pattern matching written for Malaysian offer letters (phrases like "probation", "bond", "notice"). Always available, no key needed.
  - **AI reading** — if a Gemini API key is set on the server, the letter is sent to Gemini, which returns the same facts as structured JSON. If that fails, we fall back to the rules.
- **The calculator** takes the salary facts and works out EPF, SOCSO, EIS and an estimated PCB with fixed, tested arithmetic. AI never does the maths.
- **The question writer** turns each red/amber clause into a polite question for HR.

Why this shape: the numbers must be trustworthy, so they're plain code with tests. The rules make the app work for anyone (including judges) with zero setup. AI is a bonus layer, not a dependency.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. User pastes text (or taps the sample) → stored in the page's state only.
2. User taps Decode → the page sends `POST /api/decode { text }`.
3. The server trims the text to 12,000 characters → if `GEMINI_API_KEY` is set, asks Gemini for facts; otherwise (or on any error) runs the built-in rules.
4. Every quote is checked against the letter: if it isn't found verbatim, it's dropped (AI) — so highlights always point at real text.
5. The calculator computes the take-home receipt from the salary facts; the question writer builds questions from the flags.
6. The server returns one `DecodeResult` JSON → the page renders the three panels and switches the letter box to a highlighted view.
7. Clicking a card → the page highlights the quote's character range and scrolls to it.
8. Copy all → `navigator.clipboard.writeText`.

## Stack
- **Next.js 16 (App Router) + React 19 + TypeScript** — one project holds the page and the server function; easy to deploy on Vercel later. [Docs](https://nextjs.org/docs)
- **Plain CSS** (one global stylesheet with CSS variables) — full control of the receipt look, no extra tooling.
- **System font stacks** — monospaced numbers (`ui-monospace, "SF Mono", Menlo, Consolas`), humanist sans (`"Segoe UI", system-ui, -apple-system, Roboto`). No web-font download, works offline.
- **Vitest** — unit tests for the calculator and the rules. [Docs](https://vitest.dev)
- **Gemini API** via `fetch` (no SDK) — `generateContent` with JSON output. Default model `gemini-3.8-flash`, overridable by `GEMINI_MODEL`. [Docs](https://ai.google.dev/api/generate-content)

## Where It Runs and How Someone Tries It
- Node.js 20+.
- `npm install` then `npm run dev` → open http://localhost:3000, tap **Try a sample letter**, tap **Decode**.
- Optional: copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to enable AI reading.
- `npm test` runs the unit tests.
- Demo video: recorded on a laptop browser at localhost (or the Vercel URL if deployed).
- Deployment (optional): Vercel, import the GitHub repo, add `GEMINI_API_KEY` as an environment variable if wanted.

## Look and Feel
From `prd.md > Look and Feel`:
- CSS variables: `--paper #f6f1e7`, `--paper-2 #efe7d6`, `--ink #1f1b16`, `--ink-2 #5b5348`, `--rule #d8ccb4`, `--teal #0f5e5c` (actions), `--red #b3261e`, `--amber #b7791f`, `--green #3f7d4e`.
- Receipt panel: monospaced, dashed separators, right-aligned amounts, a "torn" zig-zag bottom edge.
- Stamps: uppercase, 2px border, slight rotation (−2°), letter-spaced.
- Bilingual captions: small, italic, `--ink-2`.
- Dark mode: a "night shift" variant — dark brown paper `#1c1914`, cream ink — same accents, lightened for contrast.
- Generous spacing, calm; one accent colour; no gradients.

## Components

### Calculator (`lib/statutory.ts`)
`computeTakeHome(salary)` → receipt lines and net. Rules:
- EPF employee 11% of EPF wages (basic + allowances except travel/transport), rounded up to the next ringgit (EPF table convention).
- SOCSO employee (Act 4, first category): 0.5% of the RM100-band midpoint of wages, wages capped at RM6,000.
- EIS employee: 0.2% of the same band midpoint, capped at RM6,000.
- PCB estimate: annualise gross; subtract RM9,000 individual relief, EPF relief (capped RM4,000), SOCSO+EIS relief (capped RM350); apply YA2025 resident bands; subtract RM400 rebate if chargeable income ≤ RM35,000; divide by 12; floor at 0.
PRD ref: `prd.md > Features and Behavior > Take-home`.

### Rules reader (`lib/rules.ts`)
Splits the letter into sentences with character offsets, then runs one detector per clause type: salary/allowances, probation, notice, bond, non-compete, transfer, overtime, hours, leave, deductions. Each detector returns `Clause { id, type, severity, title, quote, start, end, explanation, normal }`.
PRD ref: `prd.md > Features and Behavior > Clauses that bite`.

### AI reader (`lib/ai.ts`)
Sends the letter with instructions and a `responseSchema`; parses JSON; validates shape; locates each quote in the letter (exact, then whitespace-normalised); drops unlocated clauses. Any error → returns `null` so the route falls back.
PRD ref: `prd.md > Features and Behavior > Reading the letter`.

### Question writer (`lib/questions.ts`)
Maps each red/amber clause type to a question template filled with clause details; keeps the top 5 by severity.
PRD ref: `prd.md > Features and Behavior > Ask before you sign`.

### Decode route (`app/api/decode/route.ts`)
Validates input, truncates, picks reader, runs calculator and question writer, returns `DecodeResult`.

### Page (`app/page.tsx` + `components/*`)
Client component holding `text`, `result`, `status`, `activeClauseId`. Components: `LetterPanel`, `TakeHomePanel`, `ClausesPanel`, `QuestionsPanel`, `EmptyState`.

## Data Model
Nothing is persisted. State lives in the page until refresh.
```ts
type Allowance = { label: string; amount: number; epfLiable: boolean };
type Salary = { basic: number | null; allowances: Allowance[]; period: "monthly" | "annual-converted"; quote?: Span };
type Clause = { id: string; type: ClauseType; severity: "red" | "amber" | "green";
                title: string; quote: string; start: number; end: number;
                explanation: string; normal: string };
type DecodeResult = { mode: "rules" | "ai" | "rules-fallback"; truncated: boolean; text: string;
                      salary: Salary; takeHome: TakeHome | null; clauses: Clause[]; questions: string[];
                      looksLikeLetter: boolean };
```

## File Structure
```
build-with-ai-hack/
├── app/
│   ├── layout.tsx            # html shell, metadata
│   ├── globals.css           # all styling (receipt look, stamps, dark mode)
│   ├── page.tsx              # the one screen (client component)
│   └── api/decode/route.ts   # POST: text → DecodeResult
├── components/
│   ├── LetterPanel.tsx       # textarea / highlighted letter view
│   ├── TakeHomePanel.tsx     # receipt
│   ├── ClausesPanel.tsx      # flag cards
│   ├── QuestionsPanel.tsx    # questions + copy
│   └── EmptyState.tsx
├── lib/
│   ├── types.ts
│   ├── statutory.ts          # EPF / SOCSO / EIS / PCB
│   ├── rules.ts              # built-in clause + salary reader
│   ├── ai.ts                 # optional Gemini reader
│   ├── questions.ts
│   ├── decode.ts             # orchestration used by the route and tests
│   └── sample-letter.ts      # fictional Nusantara Analytics letter
├── tests/                    # vitest
├── devpost/                  # Devpost learning workspace
├── .env.example
└── README.md
```

## External Services and Dependencies
- **Gemini API (optional)** — `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, header `x-goog-api-key`, body `{ contents:[{parts:[{text}]}], generationConfig:{ responseMimeType:"application/json", responseSchema, temperature:0.1 } }`; text at `candidates[0].content.parts[].text`. Free tier has per-minute limits; one call per Decode. Key only on the server, never sent to the browser.
- No database, no other services.

## Important Failure Modes
- **Rules miss or misread a clause** in an unusual letter → the user still sees what was found plus a "What we checked" list, and the salary field can be typed manually.
- **AI call fails / returns bad JSON / quotes that aren't in the letter** → fall back to built-in rules (or drop the bad quotes); tag says so.
- **No salary found** → Take-home panel asks for the monthly basic and recomputes in the browser.

## What Was Simplified and Why
- **PCB estimated by annualising** instead of LHDN's month-by-month MTD formula — close enough for a single fresh grad with standard reliefs; labelled "estimate". The full formula needs YTD figures we don't have.
- **SOCSO/EIS by band-midpoint arithmetic** instead of embedding the full PERKESO table — gives the same values as the table's RM100 bands for this salary range.
- **Paste-only input** instead of PDF/photo upload — keeps the POC to one path.
- **English rules only** — most corporate offer letters in Malaysia are in English.

## Decisions and Open Issues
- Learner decisions (from the accepted plan): one screen; deterministic maths; works without a key; receipt look; no storage; English only.
- Implementation choices (Claude): Next.js + plain CSS; Vitest; Gemini via fetch with fallback; quote verification against the letter.
- Genuine uncertainty: **which allowances count for EPF**. EPF counts most fixed allowances as wages but excludes travelling allowance; we treat allowances labelled travel/transport/petrol/mileage as not EPF-liable and everything else as liable, and say so in "How we worked this out". To check during build: the sample letter's numbers against a hand calculation in a test.
- Open: none blocking.
