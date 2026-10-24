import type { Clause, ClauseType } from "./types";
import { findAmounts, findDurations, formatDuration } from "./text";
import { fmt } from "./statutory";

const rm = (n: number) => `RM${fmt(n).replace(/\.00$/, "")}`;

type Writer = (c: Clause) => string;

const WRITERS: Partial<Record<ClauseType, Writer>> = {
  bond: (c) => {
    const amt = findAmounts(c.quote).sort((a, b) => b.value - a.value)[0];
    return `Could you share what training the ${amt ? `${rm(amt.value)} ` : ""}bond covers, and whether the amount reduces pro-rata the longer I stay?`;
  },
  notice: (c) => {
    const ds = findDurations(c.quote).filter((d) => d.unit !== "year");
    if (c.severity === "red" && ds.length >= 2) {
      return `The letter sets ${formatDuration(ds[0])}' notice for me to resign but ${formatDuration(ds[ds.length - 1])} for the company. Would it be possible to make the notice period the same for both sides?`;
    }
    return `Would you consider a one-month notice period after confirmation, which is common for graduate roles?`;
  },
  probation: (c) => {
    const pct = c.quote.match(/(\d{2,3})\s?%/);
    const d = findDurations(c.quote).find((x) => x.unit === "month");
    const parts: string[] = [];
    if (pct && Number(pct[1]) < 100) parts.push(`Is it possible to receive the full basic salary during probation, rather than ${pct[1]}%?`);
    if (!parts.length && d && d.count > 3) parts.push("Could the probation period be three months, with confirmation based on a review?");
    if (/extend/i.test(c.quote)) parts.push("If probation is extended, what is the longest it could run?");
    return parts.join(" ") || "What does confirmation after probation depend on?";
  },
  overtime: () =>
    "Since my wages are under RM4,000, could you confirm how overtime will be handled under the Employment Act, and how often work beyond normal hours is expected?",
  allowance: (c) => {
    const amt = findAmounts(c.quote)[0];
    return `Could part or all of the ${amt ? `${rm(amt.value)} ` : ""}allowance be included in my basic salary, so that it counts towards EPF, increments and bonus?`;
  },
  noncompete: () =>
    "Could you clarify what the restriction after leaving covers in practice? Would it stop me joining any company in the same industry?",
  transfer: () =>
    "If I'm transferred to another location, would the company provide relocation support, and would I be consulted before any overseas posting?",
  deduction: () => "In what situations would the company deduct from my salary, and would I be told in writing first?",
  leave: () => "Could the annual leave be increased to at least the Employment Act minimum of 8 days?",
  hours: () => "How are hours beyond 45 a week compensated?",
  deadline: () => "Would it be possible to have a few more days to review the offer before signing?",
};

/** Turn red and amber flags into 3–5 polite questions, most serious first. */
export function writeQuestions(clauses: Clause[]): string[] {
  const out: string[] = [];
  for (const c of clauses) {
    if (c.severity === "green") continue;
    const w = WRITERS[c.type];
    if (!w) continue;
    const q = w(c);
    if (q && !out.includes(q)) out.push(q);
    if (out.length === 5) break;
  }
  return out;
}

export function emailText(questions: string[], employer?: string): string {
  const who = employer ? ` at ${titleCase(employer)}` : "";
  return [
    "Hi,",
    "",
    `Thank you for the offer${who}. I'm excited about the role. Before I sign, I'd like to clarify a few points:`,
    "",
    ...questions.map((q, i) => `${i + 1}. ${q}`),
    "",
    "Thank you, and I look forward to hearing from you.",
    "",
    "Best regards,",
    "[Your name]",
  ].join("\n");
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/\bSdn Bhd\b/i, "Sdn Bhd");
}
