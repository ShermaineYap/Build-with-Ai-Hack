import { describe, expect, it } from "vitest";
import { readSalary } from "@/lib/salary";
import { SAMPLE_LETTER } from "@/lib/sample-letter";

describe("readSalary", () => {
  it("reads the sample letter's basic salary and transport allowance", () => {
    const s = readSalary(SAMPLE_LETTER);
    expect(s.basic).toBe(3200);
    expect(s.period).toBe("monthly");
    expect(s.allowances).toEqual([{ label: "Transport allowance", amount: 600, epfLiable: false }]);
    expect(SAMPLE_LETTER.slice(s.quoteStart, s.quoteEnd)).toContain("basic salary of RM3,200.00");
  });

  it("converts an annual package to monthly", () => {
    const s = readSalary("Your basic salary will be RM54,000 per annum, paid monthly in arrears.");
    // "paid monthly" mentions monthly, but the figure itself is per annum
    expect(s.basic).toBe(4500);
    expect(s.period).toBe("annual-converted");
  });

  it("treats a phone allowance as EPF wages", () => {
    const s = readSalary("Basic salary: RM4,000 per month.\nMobile phone allowance: RM150 per month.");
    expect(s.basic).toBe(4000);
    expect(s.allowances[0]).toMatchObject({ amount: 150, epfLiable: true });
  });

  it("ignores claimable allowances", () => {
    const s = readSalary("Basic salary of RM3,000 per month. Travel allowance may be claimed up to RM300 per month subject to receipts.");
    expect(s.allowances).toHaveLength(0);
  });

  it("returns null basic when there is no salary", () => {
    expect(readSalary("Thank you for attending the interview.").basic).toBeNull();
  });
});
