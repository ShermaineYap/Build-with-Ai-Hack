import { describe, expect, it } from "vitest";
import { decodeWithRules } from "@/lib/decode";
import { SAMPLE_LETTER } from "@/lib/sample-letter";
import { splitSentences } from "@/lib/text";

const r = decodeWithRules(SAMPLE_LETTER);
const byType = Object.fromEntries(r.clauses.map((c) => [c.type, c]));

describe("sentence splitting", () => {
  it("keeps exact offsets and doesn't split 'Sdn Bhd' or '9.00 am'", () => {
    const ss = splitSentences(SAMPLE_LETTER);
    for (const s of ss) expect(SAMPLE_LETTER.slice(s.start, s.end)).toBe(s.text);
    expect(ss.some((s) => s.text.includes("9.00 am to 6.00 pm"))).toBe(true);
  });
});

describe("built-in rules on the sample letter", () => {
  it("every quote is the exact text at its position", () => {
    for (const c of r.clauses) expect(SAMPLE_LETTER.slice(c.start, c.end)).toBe(c.quote);
  });

  it("catches the training bond as red, with amount and period", () => {
    expect(byType.bond.severity).toBe("red");
    expect(byType.bond.quote).toContain("liquidated damages of RM10,000.00");
    expect(byType.bond.explanation).toContain("24 months");
    expect(byType.bond.explanation).toContain("RM10,000");
  });

  it("catches probation at 90% pay as red", () => {
    expect(byType.probation.severity).toBe("red");
    expect(byType.probation.explanation).toContain("90%");
    expect(byType.probation.explanation).toContain("RM2,880");
  });

  it("catches 3 months vs 1 month notice as red", () => {
    expect(byType.notice.severity).toBe("red");
    expect(byType.notice.explanation).toMatch(/3 months.*1 month/);
  });

  it("flags the transport allowance as amber", () => {
    expect(byType.allowance.severity).toBe("amber");
    expect(byType.allowance.explanation).toContain("RM600");
  });

  it("flags no overtime under RM4,000 as red", () => {
    expect(byType.overtime.severity).toBe("red");
  });

  it("flags the non-compete, overseas transfer and 3-day deadline as amber", () => {
    expect(byType.noncompete.severity).toBe("amber");
    expect(byType.transfer.severity).toBe("amber");
    expect(byType.deadline.severity).toBe("amber");
  });

  it("marks 14 days' annual leave as normal", () => {
    expect(byType.leave.severity).toBe("green");
  });

  it("sorts red before amber before green", () => {
    const rank = { red: 0, amber: 1, green: 2 } as const;
    const ranks = r.clauses.map((c) => rank[c.severity]);
    expect([...ranks].sort()).toEqual(ranks);
  });

  it("finds the employer", () => {
    expect(r.employer).toBe("NUSANTARA ANALYTICS SDN BHD");
  });
});

describe("built-in rules on a fair letter", () => {
  const fair = `ACME BERHAD
Dear Mr Tan,
We are pleased to offer you the role of Graduate Engineer.
Your basic salary will be RM4,500 per month.
You will be on probation for three (3) months.
Upon confirmation, either party may terminate this employment by giving one (1) month's written notice.
You are entitled to sixteen (16) days of annual leave per year.
Please confirm your acceptance within seven (7) days.`;
  const f = decodeWithRules(fair);

  it("raises no red flags", () => {
    expect(f.clauses.filter((c) => c.severity === "red")).toHaveLength(0);
  });
  it("shows normal probation, notice and leave as green", () => {
    const types = f.clauses.filter((c) => c.severity === "green").map((c) => c.type).sort();
    expect(types).toEqual(["leave", "notice", "probation"]);
  });
});

it("treats random text as not a letter", () => {
  const x = decodeWithRules("The quick brown fox jumps over the lazy dog. ".repeat(10));
  expect(x.looksLikeLetter).toBe(false);
});
