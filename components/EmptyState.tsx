export function EmptyState({ onSample }: { onSample: () => void }) {
  return (
    <section className="empty" aria-labelledby="empty-h">
      <h2 id="empty-h">Before you sign, you&apos;ll see three things</h2>
      <ol>
        <li>
          <b>What lands in your bank each month</b>
          <span>Your gross pay minus EPF, SOCSO, EIS and income tax.</span>
        </li>
        <li>
          <b>The clauses that could cost you</b>
          <span>Training bonds, long probation, uneven notice periods, and more, each pointing at the exact sentence.</span>
        </li>
        <li>
          <b>What to ask HR</b>
          <span>Polite questions you can copy into an email.</span>
        </li>
      </ol>
      <button type="button" className="link-btn" onClick={onSample}>
        No letter yet? Try a sample one
      </button>
    </section>
  );
}
