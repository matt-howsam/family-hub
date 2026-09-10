const PEOPLE = [
  { id: 'matt', name: 'Matt', initial: 'M' },
  { id: 'renee', name: 'Renée', initial: 'R' },
  { id: 'rose', name: 'Rose', initial: 'R' },
  { id: 'tom', name: 'Tom', initial: 'T' },
];

/* One tap should open a person's own view — their day, goals, chores. That
   view doesn't exist yet, so this renders as a static strip rather than a
   dead link or a disabled button. */
export default function Avatars() {
  return (
    <div className="avatars">
      {PEOPLE.map((p) => (
        <div className="avatar" key={p.id}>
          <div
            className="avatar__disc"
            style={{ background: `var(--fh-${p.id}-disc)`, color: `var(--fh-${p.id}-ink)` }}
          >
            {p.initial}
          </div>
          <span className="avatar__name">{p.name}</span>
          <div className="avatar__rule" />
        </div>
      ))}
    </div>
  );
}
