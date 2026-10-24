import type { Allowance, Clause, ClauseType, Salary, Severity } from "./types";

/**
 * Optional AI reader using the Gemini API (generateContent with JSON output).
 * Returns null on any problem so the caller can fall back to built-in rules.
 * The API key stays on the server; it is never sent to the browser.
 */

const TYPES: ClauseType[] = ["bond", "probation", "notice", "allowance", "noncompete", "transfer", "overtime", "hours", "leave", "deduction", "deadline"];
const SEVERITIES: Severity[] = ["red", "amber", "green"];

const SCHEMA = {
  type: "OBJECT",
  properties: {
    basicMonthlySalary: { type: "NUMBER", nullable: true, description: "Monthly basic salary in RM. Divide annual figures by 12. null if not stated." },
    salaryWasAnnual: { type: "BOOLEAN" },
    allowances: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING", description: "e.g. 'Transport allowance'" },
          monthlyAmount: { type: "NUMBER" },
          isTravelType: { type: "BOOLEAN", description: "true for travel, transport, petrol, mileage, toll or parking allowances" },
        },
        required: ["label", "monthlyAmount", "isTravelType"],
      },
    },
    clauses: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: TYPES },
          severity: { type: "STRING", enum: SEVERITIES },
          title: { type: "STRING", description: "2–6 words, plain English" },
          quote: { type: "STRING", description: "The exact sentence(s) copied character-for-character from the letter" },
          explanation: { type: "STRING", description: "1–2 short sentences, second person, with the specific numbers" },
          normal: { type: "STRING", description: "1–2 sentences: is this normal in Malaysia, and what to ask" },
        },
        required: ["type", "severity", "title", "quote", "explanation", "normal"],
      },
    },
  },
  required: ["basicMonthlySalary", "salaryWasAnnual", "allowances", "clauses"],
};

const INSTRUCTIONS = `You help Malaysian fresh graduates understand their first job offer letter.
Read the letter and return JSON matching the schema.

Salary: only fixed monthly amounts. Ignore claimable or reimbursable allowances.

Clauses: return at most one clause per type, only for things the letter actually says. Types:
bond (training bond / minimum service / penalty), probation (length, pay during probation, extension),
notice (resignation vs termination notice; flag red if the employee's notice is longer than the company's,
since Employment Act 1955 s.12 requires equal notice), allowance (a large or travel-type allowance reducing EPF / bonus base),
noncompete (post-employment restraint; note Contracts Act 1950 s.28 generally makes these void in Malaysia),
transfer (mobility / overseas posting), overtime (no overtime pay; red if monthly wages are RM4,000 or less),
hours (over 45 hours a week), leave (red if under 8 days a year), deduction (company may deduct from salary),
deadline (5 days or fewer to accept).
Severity: red = likely to cost the graduate money or freedom, or conflicts with Malaysian law; amber = worth asking about; green = normal.
The "quote" MUST be copied exactly from the letter, including numbering like "7.2" if it is part of the sentence.
Write in plain, kind English for a 22-year-old. Don't give legal advice or tell them whether to sign.`;

interface AiJson {
  basicMonthlySalary: number | null;
  salaryWasAnnual: boolean;
  allowances: Array<{ label: string; monthlyAmount: number; isTravelType: boolean }>;
  clauses: Array<{ type: string; severity: string; title: string; quote: string; explanation: string; normal: string }>;
}

export interface AiReading {
  salary: Salary;
  clauses: Clause[];
}

export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function readWithAi(text: string, fetchImpl: typeof fetch = fetch): Promise<AiReading | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
        contents: [{ role: "user", parts: [{ text: `OFFER LETTER:\n"""\n${text}\n"""` }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return parseAiJson(raw, text);
  } catch {
    return null;
  }
}

/** Validate the model's JSON and pin every quote to its real position in the letter. */
export function parseAiJson(raw: string, text: string): AiReading | null {
  let j: AiJson;
  try {
    j = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!j || typeof j !== "object" || !Array.isArray(j.clauses) || !Array.isArray(j.allowances)) return null;

  const basic = typeof j.basicMonthlySalary === "number" && j.basicMonthlySalary > 0 ? round2(j.basicMonthlySalary) : null;
  const allowances: Allowance[] = j.allowances
    .filter((a) => a && typeof a.label === "string" && typeof a.monthlyAmount === "number" && a.monthlyAmount > 0)
    .map((a) => ({ label: a.label.trim(), amount: round2(a.monthlyAmount), epfLiable: !a.isTravelType }));

  const seen = new Set<string>();
  const clauses: Clause[] = [];
  for (const c of j.clauses) {
    if (!c || !TYPES.includes(c.type as ClauseType) || !SEVERITIES.includes(c.severity as Severity)) continue;
    if (seen.has(c.type)) continue;
    const pos = locate(text, String(c.quote ?? ""));
    if (!pos) continue; // never show a quote that isn't really in the letter
    seen.add(c.type);
    clauses.push({
      id: `${c.type}-${pos.start}`,
      type: c.type as ClauseType,
      severity: c.severity as Severity,
      title: String(c.title).slice(0, 80),
      quote: text.slice(pos.start, pos.end),
      start: pos.start,
      end: pos.end,
      explanation: String(c.explanation).slice(0, 500),
      normal: String(c.normal).slice(0, 500),
    });
  }

  return {
    salary: { basic, allowances, period: j.salaryWasAnnual ? "annual-converted" : "monthly" },
    clauses,
  };
}

/** Find `quote` in `text`: exactly first, then ignoring differences in whitespace and quote marks. */
export function locate(text: string, quote: string): { start: number; end: number } | null {
  const q = quote.trim();
  if (q.length < 8) return null;
  const exact = text.indexOf(q);
  if (exact >= 0) return { start: exact, end: exact + q.length };
  const pattern = q
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['’‘]/g, "['’‘]").replace(/["“”]/g, '["“”]'))
    .join("\\s+");
  const m = new RegExp(pattern).exec(text);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
