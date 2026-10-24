import type { Allowance, Salary } from "./types";
import { findAmounts, splitSentences, type Sentence } from "./text";

const TRAVEL_WORDS = /\b(travel|travelling|traveling|transport|transportation|petrol|fuel|mileage|toll|parking|commut)/i;
const NOT_FIXED = /\b(claim|claimable|reimburs|up to|subject to receipts|per trip|per visit|if any|where applicable)\b/i;
const ANNUAL = /\b(per annum|annual(?:ly)?|a year|per year|yearly|p\.a\.)\b/i;

export interface SalaryReading extends Salary {
  allowanceSentences: Sentence[];
  basicSentence?: Sentence;
}

/**
 * Find the basic salary and fixed monthly allowances in an offer letter.
 * Built-in rules: looks for "basic salary ... RM" and "... allowance ... RM" sentences.
 */
export function readSalary(text: string, sentences: Sentence[] = splitSentences(text)): SalaryReading {
  let basic: number | null = null;
  let period: Salary["period"] = "monthly";
  let basicSentence: Sentence | undefined;

  for (const s of sentences) {
    if (!/\b(basic|monthly)\s+(?:monthly\s+)?(salary|pay|wage)|\bsalary\b/i.test(s.text)) continue;
    if (/allowance|bonus|increment|in lieu|notice|liquidated|damages|deduct/i.test(s.text)) continue;
    const amounts = findAmounts(s.text);
    if (!amounts.length) continue;
    const value = amounts[0].value;
    if (value < 500) continue;
    if (isAnnual(s.text, amounts[0].index)) {
      basic = Math.round((value / 12) * 100) / 100;
      period = "annual-converted";
    } else {
      basic = value;
    }
    basicSentence = s;
    // Prefer a sentence that explicitly says "basic".
    if (/basic/i.test(s.text)) break;
  }

  const allowances: Allowance[] = [];
  const allowanceSentences: Sentence[] = [];
  for (const s of sentences) {
    if (!/allowance/i.test(s.text)) continue;
    if (NOT_FIXED.test(s.text)) continue;
    const amounts = findAmounts(s.text);
    if (!amounts.length) continue;
    // Name the allowance from the words right before "allowance".
    const nameMatch = s.text.match(/((?:[A-Za-z-]+\s){0,2})allowance/i);
    let label = (nameMatch?.[1] ?? "").trim();
    label = label.replace(/^(a|an|the|fixed|monthly|of|and|with|receive)\s+/i, "").replace(/^(fixed|monthly)\s+/i, "");
    label = label ? `${capitalise(label)} allowance` : "Allowance";
    let amount = amounts[0].value;
    if (isAnnual(s.text, amounts[0].index)) amount = Math.round((amount / 12) * 100) / 100;
    allowances.push({ label, amount, epfLiable: !TRAVEL_WORDS.test(label) });
    allowanceSentences.push(s);
  }

  return {
    basic,
    allowances,
    period,
    quoteStart: basicSentence?.start,
    quoteEnd: basicSentence?.end,
    basicSentence,
    allowanceSentences,
  };
}

/** Is the amount at `index` an annual figure? Looks at the words right after it first. */
function isAnnual(sentence: string, index: number): boolean {
  const after = sentence.slice(index, index + 40);
  if (ANNUAL.test(after)) return true;
  if (/\bper month|a month|monthly\b/i.test(after)) return false;
  return ANNUAL.test(sentence) && !/\bper month|a month\b/i.test(sentence);
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
