import { describe, expect, it } from "vitest";
import { annualTax, bandMidpoint, computeTakeHome, eisEmployee, epfEmployee, socsoEmployee } from "@/lib/statutory";

describe("EPF employee share (11%)", () => {
  it("is 11% on an exact band edge", () => {
    expect(epfEmployee(3200)).toBe(352);
  });
  it("uses the band's upper bound and rounds up to the ringgit", () => {
    // RM3,201 falls in the RM3,200.01–3,220 band → 11% × 3,220 = 354.20 → 355
    expect(epfEmployee(3201)).toBe(355);
  });
  it("is zero with no wages", () => {
    expect(epfEmployee(0)).toBe(0);
  });
});

describe("SOCSO and EIS employee share", () => {
  it("matches the PERKESO table for the RM3,100–3,200 band", () => {
    expect(bandMidpoint(3200)).toBe(3150);
    expect(socsoEmployee(3200)).toBe(15.75);
    expect(eisEmployee(3200)).toBe(6.3);
  });
  it("matches the RM3,700–3,800 band", () => {
    expect(socsoEmployee(3800)).toBe(18.75);
    expect(eisEmployee(3800)).toBe(7.5);
  });
  it("caps at the RM6,000 wage ceiling", () => {
    expect(socsoEmployee(9000)).toBe(29.75);
    expect(eisEmployee(9000)).toBe(11.9);
  });
});

describe("Annual income tax (YA2025 resident bands)", () => {
  it("is zero up to RM5,000", () => {
    expect(annualTax(5000)).toBe(0);
  });
  it("is RM150 at RM20,000 and RM600 at RM35,000", () => {
    expect(annualTax(20000)).toBe(150);
    expect(annualTax(35000)).toBe(600);
  });
  it("is RM1,500 at RM50,000", () => {
    expect(annualTax(50000)).toBe(1500);
  });
});

describe("Take-home for the sample offer (RM3,200 basic + RM600 transport allowance)", () => {
  const th = computeTakeHome({
    basic: 3200,
    allowances: [{ label: "Transport allowance", amount: 600, epfLiable: false }],
    period: "monthly",
  })!;

  it("counts the transport allowance in gross but not for EPF / SOCSO / EIS", () => {
    expect(th.gross).toBe(3800);
    expect(th.epf).toBe(352);
    expect(th.socso).toBe(15.75);
    expect(th.eis).toBe(6.3);
  });

  it("estimates a small PCB after reliefs and the RM400 rebate", () => {
    // Annual gross 45,600 − 9,000 individual − 4,000 EPF (capped) − 264.60 SOCSO+EIS = 32,335.40 chargeable
    expect(th.annual.chargeable).toBeCloseTo(32335.4, 2);
    // 150 + 3% × 12,335.40 = 520.06; − 400 rebate = 120.06 a year
    expect(th.annual.tax).toBeCloseTo(120.06, 2);
    expect(th.pcb).toBeCloseTo(10.01, 2);
  });

  it("nets about RM3,416 a month", () => {
    expect(th.net).toBeCloseTo(3800 - 352 - 15.75 - 6.3 - 10.01, 2);
  });
});

it("returns null when no basic salary is known", () => {
  expect(computeTakeHome({ basic: null, allowances: [], period: "monthly" })).toBeNull();
});
