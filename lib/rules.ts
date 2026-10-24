import type { Clause, ClauseType, Severity } from "./types";
import type { SalaryReading } from "./salary";
import { findAmounts, findDurations, formatDuration, splitSentences, toMonths, type Duration, type Sentence } from "./text";
import { fmt } from "./statutory";

/**
 * Built-in clause detectors for Malaysian offer letters.
 * Each detector looks at sentences (with their exact positions in the letter) and returns
 * zero or one clause card. Explanations are plain-language and deliberately cautious.
 */

export const CHECKS: Array<{ type: ClauseType; label: string }> = [
  { type: "bond", label: "Training bonds and penalties" },
  { type: "probation", label: "Probation length and pay" },
  { type: "notice", label: "Notice periods" },
  { type: "allowance", label: "How your pay is split" },
  { type: "overtime", label: "Overtime" },
  { type: "noncompete", label: "Restrictions after you leave" },
  { type: "transfer", label: "Transfers and relocation" },
  { type: "hours", label: "Working hours" },
  { type: "leave", label: "Annual leave" },
  { type: "deduction", label: "Deductions from salary" },
  { type: "deadline", label: "Time to reply" },
];

interface Ctx {
  text: string;
  sentences: Sentence[];
  salary: SalaryReading;
  gross: number | null;
}

const MIN_WAGE = 1700;

export function detectClauses(text: string, salary: SalaryReading, sentences: Sentence[] = splitSentences(text)): Clause[] {
  const gross =
    salary.basic !== null ? salary.basic + salary.allowances.reduce((s, a) => s + a.amount, 0) : null;
  const ctx: Ctx = { text, sentences, salary, gross };
  const found = [bond, probation, notice, allowance, overtime, noncompete, transfer, hours, leave, deduction, deadline]
    .map((d) => d(ctx))
    .filter((c): c is Clause => c !== null);
  return sortClauses(found);
}

const ORDER: Record<Severity, number> = { red: 0, amber: 1, green: 2 };
// Within a severity, show what costs you most first.
const WEIGHT: ClauseType[] = ["bond", "notice", "probation", "overtime", "leave", "allowance", "deduction", "noncompete", "transfer", "hours", "deadline"];

export function sortClauses(cs: Clause[]): Clause[] {
  return [...cs].sort(
    (a, b) => ORDER[a.severity] - ORDER[b.severity] || WEIGHT.indexOf(a.type) - WEIGHT.indexOf(b.type) || a.start - b.start,
  );
}

/* ---------------- helpers ---------------- */

function clause(
  type: ClauseType,
  severity: Severity,
  title: string,
  ctx: Ctx,
  spans: Sentence[],
  explanation: string,
  normal: string,
): Clause {
  const start = Math.min(...spans.map((s) => s.start));
  const end = Math.max(...spans.map((s) => s.end));
  return { id: `${type}-${start}`, type, severity, title, quote: ctx.text.slice(start, end), start, end, explanation, normal };
}

/** A heading like "6. TRAINING BOND" — not a real sentence. */
function isHeading(s: Sentence) {
  const letters = s.text.replace(/[^A-Za-z]/g, "");
  return s.text.split(/\s+/).length <= 5 && letters === letters.toUpperCase();
}

function matching(ctx: Ctx, re: RegExp, not?: RegExp) {
  return ctx.sentences.filter((s) => !isHeading(s) && re.test(s.text) && !(not && not.test(s.text)));
}

/** Sentences on the same line (paragraph) as `s`. */
function sameLine(ctx: Ctx, s: Sentence) {
  const lineStart = ctx.text.lastIndexOf("\n", s.start) + 1;
  let lineEnd = ctx.text.indexOf("\n", s.end);
  if (lineEnd === -1) lineEnd = ctx.text.length;
  return ctx.sentences.filter((x) => x.start >= lineStart && x.end <= lineEnd);
}

const months = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} month${n === 1 ? "" : "s"}`;
const rm = (n: number) => `RM${fmt(n).replace(/\.00$/, "")}`;

/* ---------------- detectors ---------------- */

function bond(ctx: Ctx): Clause | null {
  const hits = matching(ctx, /\b(bond|bonded|liquidated damages|serve the company|minimum (?:period of )?service|reimburse the company|repay (?:the company|all|the cost))\b/i);
  if (!hits.length) return null;
  // Gather the whole bond paragraph: the service period and the penalty are often in separate sentences.
  const para = sameLine(ctx, hits[0]).filter((s) => !isHeading(s));
  const spans = para.filter((s) => findAmounts(s.text).length || findDurations(s.text).length || hits.includes(s));
  const all = spans.map((s) => s.text).join(" ");
  const amount = findAmounts(all).map((a) => a.value).sort((a, b) => b - a)[0];
  const period = findDurations(all).filter((d) => d.unit !== "day").sort((a, b) => toMonths(b) - toMonths(a))[0];
  const periodMonths = period ? Math.round(toMonths(period)) : null;
  const severity: Severity = amount || (periodMonths && periodMonths >= 12) ? "red" : "amber";
  const monthsOfPay = amount && ctx.gross ? amount / ctx.gross : null;
  let explanation = "You're committing to stay for a minimum period.";
  if (amount && periodMonths) {
    explanation = `If you leave within ${months(periodMonths)}, you owe the company ${rm(amount)}${monthsOfPay ? `, about ${monthsOfPay.toFixed(1)} months of your gross pay` : ""}.`;
  } else if (amount) {
    explanation = `Leaving early could cost you ${rm(amount)}${monthsOfPay ? `, about ${monthsOfPay.toFixed(1)} months of your gross pay` : ""}.`;
  } else if (periodMonths) {
    explanation = `You're committing to stay at least ${months(periodMonths)}. Check what happens if you leave sooner.`;
  }
  if (/terminat\w*\s+for\s+misconduct|dismiss/i.test(all)) explanation += " It also applies if you're dismissed for misconduct.";
  else if (/terminat/i.test(all)) explanation += " It may also apply if the company ends your employment.";
  return clause(
    "bond", severity, "Training bond", ctx, spans.length ? spans : hits, explanation,
    "Bonds are common when a company pays for a scholarship or certification. A fair one is tied to real training costs and reduces the longer you stay. A flat penalty from day one is worth questioning.",
  );
}

function probation(ctx: Ctx): Clause | null {
  const hits = matching(ctx, /\bprobation/i, /\bnotice\b/i);
  if (!hits.length) return null;
  const para = sameLine(ctx, hits[0]).filter((s) => !isHeading(s) && !/\bnotice\b/i.test(s.text));
  const all = para.map((s) => s.text).join(" ");
  const d = findDurations(all).find((x) => x.unit === "month" || x.unit === "week");
  const len = d ? toMonths(d) : null;
  const pct = all.match(/(\d{2,3})\s?%\s*(?:of\s+(?:your\s+)?(?:basic\s+)?(?:salary|pay))/i);
  const reduced = pct ? Number(pct[1]) < 100 : false;
  const extendable = /\bextend/i.test(all);

  const parts: string[] = [];
  if (d) parts.push(`You're on probation for ${formatDuration(d)}.`);
  if (reduced && ctx.salary.basic) {
    const pay = (ctx.salary.basic * Number(pct![1])) / 100;
    const lost = (ctx.salary.basic - pay) * (len ?? 1);
    parts.push(`You'll be paid ${pct![1]}% of basic during that time (${rm(pay)} a month), about ${rm(lost)} less in total.`);
    if (pay < MIN_WAGE) parts.push(`That's below the RM${MIN_WAGE.toLocaleString()} minimum wage.`);
  } else if (reduced) {
    parts.push(`You'll be paid only ${pct![1]}% of your salary during that time.`);
  }
  if (extendable) parts.push("The company can extend it.");
  if (!parts.length) parts.push("Your letter mentions a probation period.");

  const severity: Severity = reduced ? "red" : (len !== null && len > 3) || extendable ? "amber" : "green";
  const title = reduced ? "Probation at reduced pay" : len !== null && len > 3 ? "Long probation" : "Probation";
  return clause(
    "probation", severity, title, ctx, para.length ? para : hits, parts.join(" "),
    "Three months is typical for fresh graduates, and six is common at banks and MNCs. Being paid less during probation is unusual. Ask for a maximum on extensions.",
  );
}

type Party = "you" | "company" | "both";

/** Who gives this notice? The subject that appears first before the duration usually does. */
function partyOf(sentence: string, at: number): Party | null {
  const before = sentence.slice(0, at);
  if (/\b(either party|both parties|either you or the company|either)\b/i.test(before)) return "both";
  const you = before.search(/\b(you|employee)\b/i);
  const co = before.search(/\b(company|employer|we)\b/i);
  if (you < 0 && co < 0) return null;
  if (you < 0) return "company";
  if (co < 0) return "you";
  return you < co ? "you" : "company";
}

function notice(ctx: Ctx): Clause | null {
  const hits = matching(ctx, /\bnotice\b/i, /\b(accept|sign and return|acknowledge)\b/i);
  const confirmed: Array<{ party: Party; d: Duration; s: Sentence }> = [];
  for (const s of hits) {
    if (/probation/i.test(s.text) && !/confirm/i.test(s.text)) continue;
    const d = findDurations(s.text).find((x) => x.unit !== "year");
    if (!d) continue;
    const party = partyOf(s.text, d.index);
    if (party) confirmed.push({ party, d, s });
  }
  if (!confirmed.length) return null;
  const mine = confirmed.find((c) => c.party === "you" || c.party === "both");
  const theirs = confirmed.find((c) => c.party === "company" || c.party === "both");
  const youM = mine ? toMonths(mine.d) : null;
  const coM = theirs ? toMonths(theirs.d) : null;
  const law = "The Employment Act 1955 (section 12) says the notice period should be the same length for both sides.";

  if (mine && theirs && youM !== null && coM !== null && Math.abs(youM - coM) > 0.1) {
    const spans = [mine.s, theirs.s];
    const adjacent = Math.abs(mine.s.start - theirs.s.start) < 600;
    return clause(
      "notice", "red", "Uneven notice periods", ctx, adjacent ? spans : [mine.s],
      `To resign you must give ${formatDuration(mine.d)}' notice, but the company only has to give you ${formatDuration(theirs.d)}. ${youM > coM ? "That ties you down longer than it ties them." : ""}`.trim(),
      `${law} For junior roles, one month each way is most common.`,
    );
  }
  if (mine && youM !== null && youM > 1.1) {
    return clause(
      "notice", "amber", "Long notice period", ctx, [mine.s],
      `You must give ${formatDuration(mine.d)}' notice to resign. A new employer may not wait that long.`,
      "One month is typical for fresh graduates. Two to three months is more usual for senior roles.",
    );
  }
  const c = mine ?? theirs!;
  return clause(
    "notice", "green", "Notice period", ctx, [c.s],
    `The notice period is ${formatDuration(c.d)}.`,
    "One month each way is common for junior roles.",
  );
}

function allowance(ctx: Ctx): Clause | null {
  const { salary } = ctx;
  if (!salary.basic || !salary.allowances.length || !ctx.gross) return null;
  const total = salary.allowances.reduce((s, a) => s + a.amount, 0);
  const share = total / ctx.gross;
  const travel = salary.allowances.filter((a) => !a.epfLiable);
  const basicOnly = matching(ctx, /\b(basic salary only|based on (?:your )?basic|on (?:your )?basic salary)\b/i)[0];
  if (share < 0.15 && !travel.length) return null;
  const parts = [`${rm(total)} of your ${rm(ctx.gross)} (${Math.round(share * 100)}%) is allowance, not basic salary.`];
  if (travel.length) {
    const employerRate = ctx.gross <= 5000 ? 0.13 : 0.12;
    const lostEpf = Math.round(travel.reduce((s, a) => s + a.amount, 0) * (0.11 + employerRate));
    parts.push(`Travel allowances don't count for EPF, so about ${rm(lostEpf)} less goes into your EPF each month (your share plus your employer's).`);
  }
  if (basicOnly) parts.push("Your letter also says increments and bonuses use basic salary only.");
  else parts.push("Increments and bonuses are often calculated on basic only.");
  const spans = [...salary.allowanceSentences.slice(0, 1), ...(basicOnly ? [basicOnly] : [])];
  return clause(
    "allowance", "amber", "Part of your pay is an allowance", ctx, spans, parts.join(" "),
    "Allowances are normal, but a large one shrinks the base your raises, bonus and (for travel allowances) EPF are worked out on. Ask whether it can be folded into basic.",
  );
}

function overtime(ctx: Ctx): Clause | null {
  const s = matching(ctx, /\b(not|no)\b[^.]{0,60}\bovertime\b|\bovertime\b[^.]{0,40}\bnot (?:be )?(?:payable|paid|applicable)/i)[0];
  if (!s) return null;
  const covered = ctx.gross !== null && ctx.gross <= 4000;
  if (covered) {
    return clause(
      "overtime", "red", "No overtime pay", ctx, [s],
      `Your letter says you won't get overtime pay. If your monthly wages are RM4,000 or less (yours are ${rm(ctx.gross!)}), the Employment Act generally entitles you to overtime at 1.5× your hourly rate, whatever your job title.`,
      "Calling a role \"executive\" doesn't by itself remove the right to overtime. Above RM4,000 a month, no overtime is normal.",
    );
  }
  return clause(
    "overtime", "green", "No overtime pay", ctx, [s],
    "Your letter says overtime isn't paid.",
    "For salaries above RM4,000 a month this is normal in Malaysia. Ask how often late nights happen.",
  );
}

function noncompete(ctx: Ctx): Clause | null {
  const s = matching(
    ctx,
    /\b(non-?compet|restraint of trade|competitor|competing business|similar business)\b|\b(shall not|must not|will not|not to)\b[^.]{0,80}\b(join|be employed|work for|engage)\b[^.]{0,80}\b(after|following|upon)\b/i,
  )[0];
  if (!s) return null;
  const d = findDurations(s.text).find((x) => x.unit === "month" || x.unit === "year");
  const client = /\bclient|customer/i.test(s.text);
  return clause(
    "noncompete", "amber", "Restriction after you leave", ctx, [s],
    `You're told not to work for a competitor${client ? " or client" : ""}${d ? ` for ${formatDuration(d)}` : ""} after leaving.`,
    "In Malaysia, section 28 of the Contracts Act 1950 generally makes restraints on working elsewhere after you leave unenforceable. Confidentiality and not poaching clients or staff can still apply.",
  );
}

function transfer(ctx: Ctx): Clause | null {
  const s = matching(ctx, /\b(transfer|relocat|second(?:ed|ment))\w*\b[^.]*\b(any|overseas|outside|abroad|other (?:location|state|countr)|associated|subsidiar)/i, /\bEPF|provident|salary into\b/i)[0];
  if (!s) return null;
  const overseas = /overseas|abroad|outside malaysia/i.test(s.text);
  return clause(
    "transfer", "amber", overseas ? "Can be transferred overseas" : "Can be transferred", ctx, [s],
    `The company can move you to another office${overseas ? ", including overseas" : ""}, and the letter doesn't mention relocation support.`,
    "Mobility clauses are common at larger companies. Ask whether a transfer would come with relocation support and whether you'd be consulted first.",
  );
}

function hours(ctx: Ctx): Clause | null {
  const s = matching(ctx, /\b\d{2}\s*(?:working\s+)?hours?\s*(?:a|per|each)\s*week\b/i)[0];
  if (!s) return null;
  const h = Number(s.text.match(/(\d{2})\s*(?:working\s+)?hours?/i)![1]);
  if (h <= 45) {
    return clause("hours", "green", "Working hours", ctx, [s], `You'll work ${h} hours a week.`, "The Employment Act limit is 45 hours a week.");
  }
  return clause(
    "hours", "amber", "Long working week", ctx, [s],
    `Your letter sets ${h} hours a week.`,
    "The Employment Act limit is 45 hours a week for most employees. Anything above that should normally be paid as overtime.",
  );
}

function leave(ctx: Ctx): Clause | null {
  const s = matching(ctx, /\bannual leave\b/i)[0];
  if (!s) return null;
  const d = findDurations(s.text).find((x) => x.unit === "day");
  if (!d) return null;
  if (d.count < 8) {
    return clause(
      "leave", "red", "Less leave than the law requires", ctx, [s],
      `You get ${d.count} days of annual leave.`,
      "The Employment Act minimum is 8 days a year in your first two years. 12 to 16 days is common for office jobs.",
    );
  }
  return clause(
    "leave", "green", "Annual leave", ctx, [s],
    `You get ${d.count} days of annual leave a year.`,
    "The legal minimum is 8 days in your first two years; 12 to 16 days is common for office jobs.",
  );
}

function deduction(ctx: Ctx): Clause | null {
  const s = matching(ctx, /\bdeduct\w*\b[^.]{0,120}\b(salary|wages|pay|final pay)\b|\b(salary|wages)\b[^.]{0,60}\bdeduct/i, /\b(EPF|SOCSO|EIS|statutory|income tax|PCB|zakat)\b/i)[0];
  if (!s) return null;
  return clause(
    "deduction", "amber", "Company can deduct from your pay", ctx, [s],
    "The company says it can take money out of your salary.",
    "The Employment Act only allows certain deductions (like statutory contributions, or ones you agree to in writing). Ask what this would be used for.",
  );
}

function deadline(ctx: Ctx): Clause | null {
  const s = matching(ctx, /\b(accept|acceptance|sign and return|return the duplicate|confirm your acceptance)\b[^.]*\bwithin\b|\bwithin\b[^.]*\b(accept|acceptance|sign)/i)[0];
  if (!s) return null;
  const d = findDurations(s.text).find((x) => x.unit === "day" || x.unit === "week");
  if (!d) return null;
  const days = d.unit === "week" ? d.count * 7 : d.count;
  if (days > 5) return null;
  return clause(
    "deadline", "amber", `Only ${days} day${days === 1 ? "" : "s"} to decide`, ctx, [s],
    `You're asked to sign within ${formatDuration(d)}.`,
    "Short deadlines are common, but it's normal and polite to ask for a few more days to read the letter properly or talk it over with family.",
  );
}
