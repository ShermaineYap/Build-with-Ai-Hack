import type { Clause, DecodeResult, ReadMode, Salary } from "./types";
import { MAX_LETTER_CHARS, MIN_LETTER_CHARS } from "./types";
import { computeTakeHome } from "./statutory";
import { readSalary } from "./salary";
import { splitSentences } from "./text";
import { CHECKS, detectClauses, sortClauses } from "./rules";
import { writeQuestions } from "./questions";
import { aiConfigured, readWithAi } from "./ai";

export interface Reading {
  salary: Salary;
  clauses: Clause[];
}

export const CHECKED = ["Basic salary and allowances", ...CHECKS.map((c) => c.label)];

export function readWithRules(text: string): Reading {
  const sentences = splitSentences(text);
  const salary = readSalary(text, sentences);
  return {
    salary: { basic: salary.basic, allowances: salary.allowances, period: salary.period, quoteStart: salary.quoteStart, quoteEnd: salary.quoteEnd },
    clauses: detectClauses(text, salary, sentences),
  };
}

export function prepareText(raw: string): { text: string; truncated: boolean } {
  const normalised = raw.replace(/\r\n?/g, "\n");
  if (normalised.length > MAX_LETTER_CHARS) {
    return { text: normalised.slice(0, MAX_LETTER_CHARS), truncated: true };
  }
  return { text: normalised, truncated: false };
}

export function buildResult(text: string, truncated: boolean, reading: Reading, mode: ReadMode): DecodeResult {
  const takeHome = computeTakeHome(reading.salary);
  const looksLikeLetter = text.trim().length >= MIN_LETTER_CHARS && (reading.salary.basic !== null || reading.clauses.length > 0);
  return {
    mode,
    truncated,
    text,
    salary: reading.salary,
    takeHome,
    clauses: reading.clauses,
    questions: writeQuestions(reading.clauses),
    looksLikeLetter,
    checked: CHECKED,
    employer: findEmployer(text),
  };
}

/** Decode with built-in rules only (no network). */
export function decodeWithRules(raw: string): DecodeResult {
  const { text, truncated } = prepareText(raw);
  return buildResult(text, truncated, readWithRules(text), "rules");
}

/**
 * The decode used by the API route: AI reading when a Gemini key is configured, built-in rules otherwise.
 * Rules always run too, so a clause type the AI missed is still caught.
 */
export async function decode(raw: string, fetchImpl: typeof fetch = fetch): Promise<DecodeResult> {
  const { text, truncated } = prepareText(raw);
  const rules = readWithRules(text);
  if (!aiConfigured()) return buildResult(text, truncated, rules, "rules");

  const ai = await readWithAi(text, fetchImpl);
  if (!ai) return buildResult(text, truncated, rules, "rules-fallback");

  const salary = ai.salary.basic !== null ? { ...ai.salary, quoteStart: rules.salary.quoteStart, quoteEnd: rules.salary.quoteEnd } : rules.salary;
  const aiTypes = new Set(ai.clauses.map((c) => c.type));
  const clauses = sortClauses([...ai.clauses, ...rules.clauses.filter((c) => !aiTypes.has(c.type))]);
  return buildResult(text, truncated, { salary, clauses }, "ai");
}

/** The first line that names a Malaysian company, e.g. "NUSANTARA ANALYTICS SDN BHD (1234567-X)". */
export function findEmployer(text: string): string | undefined {
  for (const line of text.split("\n").slice(0, 15)) {
    const m = line.match(/^\s*([A-Za-z0-9&.,'() -]{2,60}?\b(?:Sdn\.?\s*Bhd\.?|Berhad|Bhd\.?|PLT))\b/i);
    if (m) return m[1].replace(/\s+/g, " ").trim().toUpperCase();
  }
  return undefined;
}
