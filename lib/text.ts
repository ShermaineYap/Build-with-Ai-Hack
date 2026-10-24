/** Helpers for reading offer-letter text with character offsets. */

export interface Sentence {
  text: string;
  start: number;
  end: number;
}

const ABBREVIATIONS = /(?:\b(?:Sdn|Bhd|No|Nos|Dr|Mr|Mrs|Ms|Jln|Jalan|Tmn|e\.g|i\.e|etc|vs|approx|Co|Ltd|Inc|St)|\b[A-Z])\.$/;

/**
 * Split a letter into sentences, keeping the exact character range of each in the original text.
 * Lines are treated as hard boundaries (letters are mostly one clause per line); inside a line we
 * split after . ! ? or ; when the next thing looks like the start of a new sentence.
 */
export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const lineRe = /[^\n]+/g;
  let line: RegExpExecArray | null;
  while ((line = lineRe.exec(text))) {
    const lineText = line[0];
    const lineStart = line.index;
    let segStart = 0;
    const boundary = /[.!?;](?=\s+[A-Z(“"0-9])/g;
    let m: RegExpExecArray | null;
    while ((m = boundary.exec(lineText))) {
      const candidate = lineText.slice(segStart, m.index + 1);
      // Don't split "No. 12", "Sdn. Bhd.", "2.1" style tokens.
      if (ABBREVIATIONS.test(candidate) || /\d\.$/.test(candidate) && /^\s*\d/.test(lineText.slice(m.index + 1))) {
        continue;
      }
      pushTrimmed(out, text, lineStart + segStart, lineStart + m.index + 1);
      segStart = m.index + 1;
    }
    pushTrimmed(out, text, lineStart + segStart, lineStart + lineText.length);
  }
  return out;
}

function pushTrimmed(out: Sentence[], text: string, start: number, end: number) {
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (end - start < 2) return;
  out.push({ text: text.slice(start, end), start, end });
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, eighteen: 18,
  twenty: 20, "twenty-one": 21, "twenty-four": 24, thirty: 30, "thirty-six": 36, sixty: 60, ninety: 90,
};

/** "six (6)", "6", "six", "(6)" → 6 */
export function parseCount(raw: string): number | null {
  const s = raw.toLowerCase().trim();
  const paren = s.match(/\((\d+)\)/);
  if (paren) return Number(paren[1]);
  const digits = s.match(/\d+/);
  if (digits) return Number(digits[0]);
  const word = s.replace(/[^a-z-]/g, "");
  return NUMBER_WORDS[word] ?? null;
}

/** Matches a duration like "six (6) months", "3 months", "two weeks", "24 months". Groups: count, unit. */
export const DURATION_RE =
  /\b((?:[a-z]+(?:-[a-z]+)?\s*)?\(\d+\)|\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|eighteen|twenty-four|thirty|thirty-six|sixty|ninety)\s*(day|week|month|year)s?(?:['’]s?|['’])?/gi;

export interface Duration {
  count: number;
  unit: "day" | "week" | "month" | "year";
  index: number;
  raw: string;
}

export function findDurations(s: string): Duration[] {
  const out: Duration[] = [];
  for (const m of s.matchAll(DURATION_RE)) {
    const count = parseCount(m[1]);
    if (count === null) continue;
    out.push({ count, unit: m[2].toLowerCase() as Duration["unit"], index: m.index ?? 0, raw: m[0] });
  }
  return out;
}

export function toMonths(d: Duration): number {
  switch (d.unit) {
    case "day": return d.count / 30;
    case "week": return d.count / 4.345;
    case "month": return d.count;
    case "year": return d.count * 12;
  }
}

/** All RM amounts in a string: "RM3,200.00", "RM 600", "MYR 10,000". */
export function findAmounts(s: string): Array<{ value: number; index: number }> {
  const out: Array<{ value: number; index: number }> = [];
  for (const m of s.matchAll(/\b(?:RM|MYR)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(\s?k\b)?/gi)) {
    let v = Number(m[1].replace(/,/g, "")) + (m[2] ? Number(`0.${m[2]}`) : 0);
    if (m[3]) v *= 1000;
    out.push({ value: v, index: m.index ?? 0 });
  }
  return out;
}

export function formatDuration(d: Duration): string {
  const n = Number.isInteger(d.count) ? d.count : d.count.toFixed(1);
  return `${n} ${d.unit}${d.count === 1 ? "" : "s"}`;
}
