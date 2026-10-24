---
doc: scope
status: approved
---
<!-- Approval: Shermaine accepted the "Build With AI Basics — Champion Idea" plan
     (Claude Docs, 2026-10-24) and asked Claude to proceed with it ("do everything").
     The decisions below are taken from that plan. -->

# Baca Dulu

Paste your first Malaysian job offer letter and see, on one screen, what you'll really take home, which clauses can hurt you, and what to ask HR before you sign. *Baca dulu* is Malay for "read first".

## The Unique Kernel
It reads **your** letter and quotes it back to you. Every number and every warning points at the exact sentence it came from, so a fresh grad can see why it matters, not just that it does. It also turns the warnings into polite questions you can send to HR.

A salary calculator doesn't know what your letter says, and a generic "AI contract summary" doesn't know Malaysian EPF, SOCSO, probation or bond norms. The kernel is the combination: this letter + Malaysian rules + the questions to ask.

## Who It's For
A Malaysian final-year student or fresh graduate holding their first offer letter, e.g. an APU data analytics student offered RM3,800/month at a KL tech company. They have 2–5 days to sign. Today they skim it, maybe ask a senior or a parent, and sign. Nobody has explained gross vs net, what a training bond is, or what a normal notice period looks like.

Secondary: parents or older siblings helping them read it.

## The Core Loop
1. Open the page, paste the offer letter text (or tap "Try a sample letter").
2. Tap **Decode**.
3. Read three panels: **Take-home** (gross → EPF, SOCSO, EIS, estimated PCB → net), **Clauses that bite** (red / amber / green cards, each quoting the letter), **Ask before you sign** (questions with a Copy button).
4. Copy the questions into an email to HR.

They come back when the next offer arrives, or to compare a revised letter after HR answers.

## Inspiration & Identity
Looks like a Malaysian payslip or a kedai receipt: warm paper background, dark ink, monospaced numbers, rubber-stamp style flag badges, one accent colour. English first with small Malay captions (*Gaji bersih*, *Baca dulu*). Plain-spoken and kind, like a helpful senior, not a lawyer. No gradients, no glassmorphism, no purple "AI app" look.

## Why This Matters to the Learner
Shermaine is a final-year student who will get her own first offer letter soon, as will her coursemates. She's building the tool she and her friends would actually use.

## What "Working" Looks Like
Paste the sample letter from *Nusantara Analytics Sdn Bhd* (fictional), tap Decode, and within a few seconds see:
- RM3,800 gross becoming about RM3,4xx in the bank, with each deduction shown;
- red cards for a RM10,000 training bond over 24 months, six-month probation at reduced pay, and a 3-month employee notice vs 1-month employer notice, plus an amber card for RM600 of pay being a transport allowance (left out of EPF and bonus);
- 3–5 questions for HR, copied in one tap.

**The "oh, that's cool" moment:** the tax line is only about RM10 a month. Most people guess hundreds. Then each red card highlights the exact sentence in the letter.

## The POC Boundary
- Paste plain text (English letters).
- Deterministic Malaysian statutory maths (EPF, SOCSO, EIS, estimated PCB).
- Clause detection that works with no API key (built-in rules), with optional AI reading for better explanations when a key is set.
- One screen, three panels, a sample letter, copyable questions.
- Clear "estimates, not legal or tax advice" notice.

## Later
- Upload a PDF or a photo of the letter.
- Bahasa Malaysia letters and a BM / 中文 interface toggle.
- Compare two offers side by side.
- Save or share a result.

## Explicitly Cut
- Accounts and saved history — nothing to store; keeps letters private.
- A chat assistant — the value is a one-shot, clear answer, not a conversation.
- Negotiation coaching / salary benchmarks — needs real market data we don't have; would dilute the kernel.
- Legal advice — we explain what a clause says and whether it's common; we don't tell people what to sign.
