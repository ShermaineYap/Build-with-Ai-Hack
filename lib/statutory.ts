import type { Salary, TakeHome, ReceiptLine } from "./types";

/**
 * Malaysian statutory deductions for a Malaysian employee under 60.
 * These are estimates for a proof of concept — see README "How we worked this out".
 *
 * Sources:
 *  - EPF employee share 11% (Third Schedule, EPF Act 1991)
 *  - SOCSO (Act 4, first category) employee 0.5%, EIS (Act 800) employee 0.2%,
 *    both on wages capped at RM6,000, charged on the RM100 wage band's midpoint
 *  - PCB estimated from YA2025/YA2026 resident tax bands with standard reliefs
 */

export const EPF_EMPLOYEE_RATE = 0.11;
export const SOCSO_EMPLOYEE_RATE = 0.005;
export const EIS_EMPLOYEE_RATE = 0.002;
export const SOCSO_EIS_WAGE_CEILING = 6000;

export const INDIVIDUAL_RELIEF = 9000;
export const EPF_RELIEF_CAP = 4000;
export const SOCSO_EIS_RELIEF_CAP = 350;
export const REBATE_AMOUNT = 400;
export const REBATE_THRESHOLD = 35000;

/** [upper bound of band, rate] for YA2025/YA2026 resident individuals. */
export const TAX_BANDS: Array<[number, number]> = [
  [5_000, 0],
  [20_000, 0.01],
  [35_000, 0.03],
  [50_000, 0.06],
  [70_000, 0.11],
  [100_000, 0.19],
  [400_000, 0.25],
  [600_000, 0.26],
  [2_000_000, 0.28],
  [Infinity, 0.3],
];

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Round up to the next 5 sen, as the PERKESO tables do. */
const ceil5sen = (n: number) => Math.ceil(Math.round(n * 1000) / 50) * 0.05;

/** EPF employee share. The EPF table works in RM20 bands up to RM5,000 and RM100 bands above, rounding up to the ringgit. */
export function epfEmployee(epfWages: number): number {
  if (epfWages <= 0) return 0;
  const band = epfWages <= 5000 ? 20 : 100;
  const upper = Math.ceil(epfWages / band) * band;
  return Math.ceil(round2(upper * EPF_EMPLOYEE_RATE));
}

/** Midpoint of the RM100 band the wage falls in, capped at the RM5,900–6,000 band. */
export function bandMidpoint(wages: number): number {
  if (wages <= 0) return 0;
  const capped = Math.min(wages, SOCSO_EIS_WAGE_CEILING);
  const upper = Math.ceil(capped / 100) * 100;
  return upper - 50;
}

export function socsoEmployee(wages: number): number {
  if (wages <= 0) return 0;
  return round2(ceil5sen(bandMidpoint(wages) * SOCSO_EMPLOYEE_RATE));
}

export function eisEmployee(wages: number): number {
  if (wages <= 0) return 0;
  return round2(ceil5sen(bandMidpoint(wages) * EIS_EMPLOYEE_RATE));
}

export function annualTax(chargeable: number): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of TAX_BANDS) {
    if (chargeable <= lower) break;
    const slice = Math.min(chargeable, upper) - lower;
    tax += slice * rate;
    lower = upper;
  }
  return round2(tax);
}

export function computeTakeHome(salary: Salary): TakeHome | null {
  if (salary.basic === null || salary.basic <= 0) return null;
  const basic = round2(salary.basic);
  const allowanceTotal = round2(salary.allowances.reduce((s, a) => s + a.amount, 0));
  const gross = round2(basic + allowanceTotal);
  const liableWages = round2(
    basic + salary.allowances.filter((a) => a.epfLiable).reduce((s, a) => s + a.amount, 0),
  );

  const epf = epfEmployee(liableWages);
  const socso = socsoEmployee(liableWages);
  const eis = eisEmployee(liableWages);

  const annualGross = round2(gross * 12);
  const epfRelief = Math.min(epf * 12, EPF_RELIEF_CAP);
  const socsoEisRelief = Math.min((socso + eis) * 12, SOCSO_EIS_RELIEF_CAP);
  const chargeable = Math.max(0, round2(annualGross - INDIVIDUAL_RELIEF - epfRelief - socsoEisRelief));
  const taxBeforeRebate = annualTax(chargeable);
  const rebate = chargeable <= REBATE_THRESHOLD ? Math.min(REBATE_AMOUNT, taxBeforeRebate) : 0;
  const tax = round2(Math.max(0, taxBeforeRebate - rebate));
  const pcb = round2(tax / 12);

  const net = round2(gross - epf - socso - eis - pcb);

  const lines: ReceiptLine[] = [
    { key: "basic", label: "Basic salary", malay: "Gaji pokok", amount: basic },
    ...salary.allowances.map<ReceiptLine>((a) => ({
      key: "allowance",
      label: a.label,
      malay: "Elaun",
      amount: a.amount,
      note: a.epfLiable ? undefined : "not counted for EPF / SOCSO / EIS",
    })),
    { key: "gross", label: "Gross pay", malay: "Gaji kasar", amount: gross },
    { key: "epf", label: "EPF (11%)", malay: "KWSP", amount: -epf, note: `on RM${fmt(liableWages)}` },
    { key: "socso", label: "SOCSO", malay: "PERKESO", amount: -socso },
    { key: "eis", label: "EIS", malay: "SIP", amount: -eis },
    { key: "pcb", label: "Income tax (PCB, est.)", malay: "PCB", amount: -pcb },
    { key: "net", label: "Take-home pay", malay: "Gaji bersih", amount: net },
  ];

  return {
    gross,
    epf,
    socso,
    eis,
    pcb,
    net,
    lines,
    annual: { gross: annualGross, chargeable, taxBeforeRebate, rebate, tax },
  };
}

export function fmt(n: number): string {
  return Math.abs(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
