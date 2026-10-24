"use client";

import { useEffect, useRef } from "react";
import type { Severity } from "@/lib/types";
import { MAX_LETTER_CHARS } from "@/lib/types";

export interface Mark {
  id: string;
  start: number;
  end: number;
  severity: Severity;
}

interface Props {
  text: string;
  onChange: (t: string) => void;
  decodedText: string | null;
  marks: Mark[];
  activeId: string | null;
  onMarkClick: (id: string) => void;
  onEdit: () => void;
  onSample: () => void;
  onDecode: () => void;
  busy: boolean;
  truncated: boolean;
}

export function LetterPanel(p: Props) {
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!p.activeId || !viewRef.current) return;
    const el = viewRef.current.querySelector<HTMLElement>(`[data-mark="${p.activeId}"]`);
    el?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [p.activeId]);

  const viewing = p.decodedText !== null;

  return (
    <section className="sheet" aria-labelledby="letter-h">
      <div className="sheet-head">
        <h2 id="letter-h">
          Your letter <span className="malay">Surat tawaran</span>
        </h2>
        {viewing ? (
          <button type="button" className="link-btn" onClick={p.onEdit}>
            Edit letter
          </button>
        ) : (
          <button type="button" className="link-btn" onClick={p.onSample}>
            Try a sample letter
          </button>
        )}
      </div>

      {viewing ? (
        <div ref={viewRef} className="letter-view" tabIndex={0} aria-label="Your letter with flagged sentences highlighted">
          {renderMarked(p.decodedText!, p.marks, p.activeId, p.onMarkClick)}
        </div>
      ) : (
        <>
          <label htmlFor="letter" className="visually-hidden">
            Paste your offer letter
          </label>
          <textarea
            id="letter"
            className="letter-input"
            value={p.text}
            onChange={(e) => p.onChange(e.target.value)}
            placeholder={"Paste the full text of your offer letter here.\n\nTip: open the PDF, select all (Ctrl/⌘ + A), copy, and paste."}
            spellCheck={false}
          />
        </>
      )}

      {p.truncated && viewing && (
        <p className="notice">This letter is long, so we read the first {MAX_LETTER_CHARS.toLocaleString()} characters.</p>
      )}

      {!viewing && (
        <div className="actions">
          <button type="button" className="decode-btn" onClick={p.onDecode} disabled={p.busy}>
            {p.busy ? "Reading your letter…" : "Decode letter"}
          </button>
          <span className="count">{p.text.length.toLocaleString()} characters</span>
        </div>
      )}
      <div className="sheet-foot">
        <p className="privacy">Your letter isn&apos;t saved anywhere. Refresh the page and it&apos;s gone.</p>
      </div>
    </section>
  );
}

function renderMarked(text: string, marks: Mark[], activeId: string | null, onClick: (id: string) => void) {
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let pos = 0;
  for (const m of sorted) {
    if (m.start < pos) continue; // skip overlaps
    if (m.start > pos) out.push(text.slice(pos, m.start));
    out.push(
      <mark
        key={m.id}
        data-mark={m.id}
        className={`${m.severity}${m.id === activeId ? " active" : ""}`}
        onClick={() => onClick(m.id)}
      >
        {text.slice(m.start, m.end)}
      </mark>,
    );
    pos = m.end;
  }
  out.push(text.slice(pos));
  return out;
}
