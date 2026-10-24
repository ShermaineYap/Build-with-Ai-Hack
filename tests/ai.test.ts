import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decode } from "@/lib/decode";
import { locate, parseAiJson } from "@/lib/ai";
import { SAMPLE_LETTER } from "@/lib/sample-letter";

const bondQuote =
  "Should you resign or be terminated for misconduct before the end of this period, you shall pay the Company liquidated damages of RM10,000.00.";

function geminiReply(obj: unknown): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 }),
  ) as unknown as typeof fetch;
}

const good = {
  basicMonthlySalary: 3200,
  salaryWasAnnual: false,
  allowances: [{ label: "Transport allowance", monthlyAmount: 600, isTravelType: true }],
  clauses: [
    { type: "bond", severity: "red", title: "RM10,000 training bond", quote: bondQuote, explanation: "AI explanation", normal: "AI normal" },
    { type: "notice", severity: "red", title: "Made-up quote", quote: "You must give ten years' notice.", explanation: "x", normal: "y" },
  ],
};

describe("locate", () => {
  it("finds exact quotes and tolerates curly quotes and line breaks", () => {
    expect(locate(SAMPLE_LETTER, bondQuote)).not.toBeNull();
    const fuzzy = "7.2 Upon confirmation, you are required to give three (3) months’ written\nnotice";
    const pos = locate(SAMPLE_LETTER, fuzzy)!;
    expect(SAMPLE_LETTER.slice(pos.start, pos.end)).toContain("months' written notice");
  });
  it("rejects text that isn't in the letter", () => {
    expect(locate(SAMPLE_LETTER, "You must give ten years' notice.")).toBeNull();
  });
});

describe("parseAiJson", () => {
  it("rejects invalid JSON", () => {
    expect(parseAiJson("not json", SAMPLE_LETTER)).toBeNull();
  });
  it("drops clauses whose quote isn't in the letter", () => {
    const r = parseAiJson(JSON.stringify(good), SAMPLE_LETTER)!;
    expect(r.clauses.map((c) => c.type)).toEqual(["bond"]);
    expect(r.salary.allowances[0].epfLiable).toBe(false);
  });
});

describe("decode with and without a Gemini key", () => {
  const saved = process.env.GEMINI_API_KEY;
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = saved;
  });

  it("uses built-in rules with no key and never calls the network", async () => {
    const f = vi.fn() as unknown as typeof fetch;
    const r = await decode(SAMPLE_LETTER, f);
    expect(r.mode).toBe("rules");
    expect(f).not.toHaveBeenCalled();
  });

  it("uses AI reading when a key is set, keeping rules for types the AI missed", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const r = await decode(SAMPLE_LETTER, geminiReply(good));
    expect(r.mode).toBe("ai");
    const bond = r.clauses.find((c) => c.type === "bond")!;
    expect(bond.explanation).toBe("AI explanation");
    // The AI's notice quote was invented, so the rules' notice card is used instead.
    expect(r.clauses.find((c) => c.type === "notice")!.explanation).toMatch(/3 months/);
    expect(r.takeHome!.net).toBeCloseTo(3415.94, 2);
  });

  it("falls back to rules when the API errors", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const failing = vi.fn(async () => new Response("quota", { status: 429 })) as unknown as typeof fetch;
    const r = await decode(SAMPLE_LETTER, failing);
    expect(r.mode).toBe("rules-fallback");
    expect(r.clauses.length).toBeGreaterThan(5);
  });

  it("falls back to rules when fetch throws", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const throwing = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect((await decode(SAMPLE_LETTER, throwing)).mode).toBe("rules-fallback");
  });
});
