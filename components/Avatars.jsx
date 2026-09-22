'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Gear } from '@phosphor-icons/react/ssr';
import { PEOPLE, PEOPLE_ORDER } from '@/lib/people';

/* One tap opens a person's own view — their day, goals, chores. Same
   destination as tapping a child's home block.

   `showSettings` adds one more stop at the end of the same row — Q&A,
   review queue, device pairing, all adult-only utilities with nowhere else
   to live. Deliberately NOT another avatar__disc: a disc with a gear icon
   instead of an initial would read as a fifth person, and the whole point
   of the disc shape is "this is someone." A plain icon keeps the two kinds
   of thing visually distinct while still sharing the row a family already
   taps without thinking about it.

   This bar is `position: fixed`, so .wall reserves clearance below its own
   scrolling content to match — via --fh-avatars-h, measured here rather
   than estimated in CSS. A hand-computed padding-bottom (matching the
   bar's padding/safe-area/font-size by eye) went wrong on a real iPhone
   once already; measuring the actual rendered height is correct by
   construction regardless of safe-area quirks, Dynamic Type text scaling,
   or anything else that changes how tall this bar ends up. */
export default function Avatars({ showSettings = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const setHeight = () => {
      document.documentElement.style.setProperty('--fh-avatars-h', `${el.offsetHeight}px`);
    };
    setHeight();
    const observer = new ResizeObserver(setHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="avatars" ref={ref}>
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
      {showSettings && (
        <Link className="avatar" href="/settings">
          <div className="avatar__disc avatar__disc--utility">
            <Gear size={26} />
          </div>
          <span className="avatar__name">More</span>
          <div className="avatar__rule" />
        </Link>
      )}
    </div>
  );
}
