/* Household events that aren't a child's own commitment — theirs are on
   their own card, so the same activity never appears twice on one screen.
   Multi-day spans are deduped to their first occurrence by the caller so a
   school holiday doesn't fill this with repeats. */
export default function WhatsOn({ items }) {
  if (!items.length) return null;
  return (
    <div className="whats-on">
      <div className="whats-on__label">What&rsquo;s on</div>
      {items.map((e) => (
        <div className="whats-on__row" key={e.uid}>
          <span className="whats-on__when">{e.when}</span>
          {e.label}
        </div>
      ))}
    </div>
  );
}
