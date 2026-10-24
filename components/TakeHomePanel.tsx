"use client";

import { useState } from "react";
import type { Salary, TakeHome } from "@/lib/types";
import { computeTakeHome, fmt } from "@/lib/statutory";

interface Props {
  salary: Salary;
  takeHome: TakeHome | null;
  employer?: string;
}

export function TakeHomePanel({ salary, takeHome, employer }: Props) {
  const [manualBasic, setManualBasic] = useState("");
  const manual = Number(manualBasic.replace(/[^\d.]/g, ""));
  const th =
    takeHome ??
    (manual > 0 ? computeTakeHome({ basic: manual, allowances: salary.allowances, period: "monthly" }) : null);

  return (
    <section aria-labelledby="th-h">
      <h2 id="th-h">
        What lands in your bank <span className="malay">Gaji bersih</span>
      </h2>
      <p className="sub">Every month, after the deductions the law requires.</p>

      <div className="payslip-wrap">
        <div className="payslip">
          <div className="payslip-title">
            <span>{employer ? `${employer}` : "Monthly payslip"}</span>
            <span>RM</span>
          </div>

          {th ? (
            <table>
              <tbody>
                {th.lines.map((l, i) => (
                  <tr
                    key={`${l.key}-${i}`}
                    className={l.key === "gross" ? "gross" : l.key === "net" ? "net" : l.amount < 0 ? "minus" : undefined}
                  >
                    <td className="lbl">
                      {l.label}
                      <small>{l.malay}</small>
                      {l.note && <span className="note">{l.note}</span>}
                    </td>
                    <td className="amt">{l.amount < 0 ? `−${fmt(l.amount)}` : fmt(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="manual">
              <span>We couldn&apos;t find a monthly basic salary in this letter.</span>
              <label>
                <span className="visually-hidden">Monthly basic salary in RM</span>
                <input
                  inputMode="decimal"
                  placeholder="e.g. 3200"
                  value={manualBasic}
                  onChange={(e) => setManualBasic(e.target.value)}
                />
              </label>
              <span>Type it to see your take-home.</span>
            </div>
          )}
        </div>
      </div>

      {th && (
        <>
          <p className="payslip-foot">
            Income tax is about <strong>RM{fmt(th.pcb)} a month</strong>
            {th.pcb < 50 ? " — far less than most people expect at this salary." : "."}
            {salary.period === "annual-converted" && " Your letter states a yearly figure, so we divided it by 12."}
          </p>
          <details className="how">
            <summary>How we worked this out</summary>
            <ul>
              <li>EPF: 11% of your basic pay plus allowances, except travel or transport allowances, using the EPF table&apos;s bands.</li>
              <li>SOCSO 0.5% and EIS 0.2% of the same wages, capped at RM6,000, using PERKESO&apos;s RM100 bands.</li>
              <li>
                PCB is an estimate: yearly pay RM{fmt(th.annual.gross)} minus RM9,000 personal relief, up to RM4,000 EPF relief and up to RM350
                SOCSO/EIS relief gives RM{fmt(th.annual.chargeable)} taxable. Tax on that is RM{fmt(th.annual.taxBeforeRebate)}
                {th.annual.rebate > 0 ? `, less the RM${fmt(th.annual.rebate)} rebate` : ""}, so RM{fmt(th.annual.tax)} a year.
              </li>
              <li>Assumes you&apos;re a Malaysian resident under 60, single, with no other reliefs. Your employer&apos;s actual PCB may differ slightly.</li>
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
