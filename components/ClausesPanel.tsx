"use client";

import type { Clause, Severity } from "@/lib/types";

const STAMP: Record<Severity, string> = {
  red: "Watch out",
  amber: "Check this",
  green: "Looks normal",
};

interface Props {
  clauses: Clause[];
  checked: string[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function ClausesPanel({ clauses, checked, activeId, onSelect }: Props) {
  const red = clauses.filter((c) => c.severity === "red").length;
  const amber = clauses.filter((c) => c.severity === "amber").length;

  return (
    <section aria-labelledby="cl-h">
      <h2 id="cl-h">
        Clauses that could cost you <span className="malay">Fasal yang perlu diteliti</span>
      </h2>
      <p className="sub">
        {red || amber
          ? `${count(red, "thing to watch out for", "things to watch out for")}${amber ? ` and ${count(amber, "to check", "to check")}` : ""}. Tap one to find it in your letter.`
          : "Nothing alarming found. Here's what we looked at."}
      </p>

      {clauses.length > 0 && (
        <ul className="flags">
          {clauses.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`flag ${c.severity}${c.id === activeId ? " active" : ""}`}
                onClick={() => onSelect(c.id)}
                aria-pressed={c.id === activeId}
              >
                <span className="stamp">{STAMP[c.severity]}</span>
                <h3>{c.title}</h3>
                <blockquote>{shorten(c.quote)}</blockquote>
                <p>
                  {c.explanation}
                  <span className="normal">
                    <b>Is this normal?</b> {c.normal}
                  </span>
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="checked">We checked: {checked.join(", ").toLowerCase().replace(/^./, (m) => m.toUpperCase())}.</p>
    </section>
  );
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function shorten(q: string) {
  const flat = q.replace(/\s*\n\s*/g, " ");
  return flat.length > 260 ? `${flat.slice(0, 250).replace(/\s\S*$/, "")}…` : flat;
}
