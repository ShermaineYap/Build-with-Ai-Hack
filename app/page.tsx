"use client";

import { useState } from "react";
import type { DecodeResult } from "@/lib/types";
import { MIN_LETTER_CHARS } from "@/lib/types";
import { SAMPLE_LETTER } from "@/lib/sample-letter";
import { LetterPanel, type Mark } from "@/components/LetterPanel";
import { TakeHomePanel } from "@/components/TakeHomePanel";
import { EmptyState } from "@/components/EmptyState";

type Status = "idle" | "busy" | "done" | "error";

const MODE_LABEL: Record<DecodeResult["mode"], string> = {
  rules: "Built-in rules",
  ai: "AI reading",
  "rules-fallback": "Built-in rules (AI unavailable)",
};

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function decode(input = text) {
    setError(null);
    if (input.trim().length < MIN_LETTER_CHARS) {
      setResult(null);
      setStatus("error");
      setError("This doesn't look like an offer letter yet. Paste the full text, from the greeting to the signature.");
      return;
    }
    setStatus("busy");
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong reading the letter.");
      const r = data as DecodeResult;
      if (!r.looksLikeLetter) {
        setResult(null);
        setStatus("error");
        setError("We couldn't find a salary or any employment terms in this text. Paste the full offer letter, from the greeting to the signature.");
        return;
      }
      setResult(r);
      setActiveId(null);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong reading the letter. Try again.");
    }
  }

  function loadSample() {
    setText(SAMPLE_LETTER);
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  function edit() {
    setResult(null);
    setStatus("idle");
    setActiveId(null);
  }

  const marks: Mark[] = result?.clauses.map((c) => ({ id: c.id, start: c.start, end: c.end, severity: c.severity })) ?? [];

  return (
    <>
      <header className="masthead">
        <div>
          <h1 className="wordmark">
            Baca Dulu<span className="dot">.</span>
          </h1>
          <p className="tagline">
            Read your first offer letter properly before you sign it.
            <span className="malay">Baca dulu, baru sign.</span>
          </p>
        </div>
        {result && (
          <span className="mode-tag" aria-live="polite">
            Read with <b>{MODE_LABEL[result.mode]}</b>
          </span>
        )}
      </header>

      <main className="desk">
        <LetterPanel
          text={text}
          onChange={setText}
          decodedText={result ? result.text : null}
          marks={marks}
          activeId={activeId}
          onMarkClick={setActiveId}
          onEdit={edit}
          onSample={loadSample}
          onDecode={() => decode()}
          busy={status === "busy"}
          truncated={result?.truncated ?? false}
        />

        <div className="results" aria-live="polite">
          {status === "error" && error && (
            <section className="message" role="alert">
              <h2>Nothing to decode yet</h2>
              <p>{error}</p>
            </section>
          )}
          {!result && status !== "error" && <EmptyState onSample={loadSample} />}
          {result && (
            <div className="printing" key={result.text.length + result.mode}>
              <TakeHomePanel salary={result.salary} takeHome={result.takeHome} employer={result.employer} />
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>
          Estimates only, not legal, tax or financial advice. Check figures with{" "}
          <a href="https://www.kwsp.gov.my" target="_blank" rel="noreferrer">EPF</a>,{" "}
          <a href="https://www.perkeso.gov.my" target="_blank" rel="noreferrer">PERKESO</a> and{" "}
          <a href="https://www.hasil.gov.my" target="_blank" rel="noreferrer">LHDN</a>, and ask a lawyer about anything you&apos;re unsure of.
        </p>
        <p>Baca Dulu is an open-source student project, built for Devpost&apos;s Build With AI: Basics.</p>
      </footer>
    </>
  );
}
