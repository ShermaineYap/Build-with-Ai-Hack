export type Severity = "red" | "amber" | "green";

export type ClauseType =
  | "bond"
  | "probation"
  | "notice"
  | "allowance"
  | "noncompete"
  | "transfer"
  | "overtime"
  | "hours"
  | "leave"
  | "deduction"
  | "deadline";

export interface Allowance {
  label: string;
  amount: number;
  /** Counted as EPF / SOCSO wages. Travel-type allowances are not. */
  epfLiable: boolean;
}

export interface Salary {
  basic: number | null;
  allowances: Allowance[];
  period: "monthly" | "annual-converted";
  /** Where the basic salary was found in the letter, if anywhere. */
  quoteStart?: number;
  quoteEnd?: number;
}

export interface Clause {
  id: string;
  type: ClauseType;
  severity: Severity;
  title: string;
  quote: string;
  start: number;
  end: number;
  explanation: string;
  normal: string;
}

export interface ReceiptLine {
  key: "basic" | "allowance" | "gross" | "epf" | "socso" | "eis" | "pcb" | "net";
  label: string;
  malay: string;
  amount: number;
  note?: string;
}

export interface TakeHome {
  gross: number;
  epf: number;
  socso: number;
  eis: number;
  pcb: number;
  net: number;
  lines: ReceiptLine[];
  annual: {
    gross: number;
    chargeable: number;
    taxBeforeRebate: number;
    rebate: number;
    tax: number;
  };
}

export type ReadMode = "rules" | "ai" | "rules-fallback";

export interface DecodeResult {
  mode: ReadMode;
  truncated: boolean;
  text: string;
  salary: Salary;
  takeHome: TakeHome | null;
  clauses: Clause[];
  questions: string[];
  looksLikeLetter: boolean;
  checked: string[];
  /** Company name found in the letterhead, if any. */
  employer?: string;
}

export const MAX_LETTER_CHARS = 12_000;
export const MIN_LETTER_CHARS = 200;
