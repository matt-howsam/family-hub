import Link from 'next/link';
import { PEOPLE, PEOPLE_ORDER } from '@/lib/people';

/* One tap opens a person's own view — their day, goals, chores. Same
   destination as tapping a child's home block. */
export default function Avatars() {
  return (
    <div className="avatars">
      {PEOPLE_ORDER.map((id) => {
        const p = PEOPLE[id];
        return (
          <Link className="avatar" href={`/people/${id}`} key={id}>
            <div
              className="avatar__disc"
              style={{ background: `var(--fh-${id}-disc)`, color: `var(--fh-${id}-ink)` }}
            >
              {p.initial}
            </div>
            <span className="avatar__name">{p.name}</span>
            <div className="avatar__rule" />
          </Link>
        );
      })}
    </div>
  );
}
