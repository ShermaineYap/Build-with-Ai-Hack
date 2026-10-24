"use client";

import { useState } from "react";
import { emailText } from "@/lib/questions";

export function QuestionsPanel({ questions, employer }: { questions: string[]; employer?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = emailText(questions, employer);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers that block the clipboard API.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!questions.length) return null;

  return (
    <section aria-labelledby="q-h">
      <h2 id="q-h">
        Ask before you sign <span className="malay">Soalan untuk HR</span>
      </h2>
      <p className="sub">Asking about terms before you sign is normal. Most HR teams expect a few questions.</p>
      <div className="memo">
        <ol>
          {questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <div className="memo-actions">
          <button type="button" className="copy-btn" onClick={copy} data-copied={copied}>
            {copied ? "Copied" : "Copy as email"}
          </button>
          <span className="hint" aria-live="polite">
            {copied ? "Paste it into your reply to HR and add your name." : "Copies a short, polite email with these questions."}
          </span>
        </div>
      </div>
    </section>
  );
}
