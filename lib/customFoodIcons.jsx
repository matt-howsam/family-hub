/* Phosphor (@phosphor-icons/react, used everywhere else in the app) has no
 * BBQ, tongs, drumstick, steak or chopsticks glyphs — checked against the
 * latest version, not just what's installed. These five are hand-drawn to
 * match its look: 256×256 viewBox, stroke-based, rounded caps/joins, 16-unit
 * stroke by default (Bbq overrides — see below) — so they drop into the
 * same picker grid at the same size without reading as a different icon
 * set. Each accepts the same {size, className} shape
 * components/PlannerScreen.jsx already renders every food icon with. */

function IconBase({ size = '1em', className, strokeWidth = 16, children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

/* A kettle grill, not a grate-and-flame — closer to how people actually
 * picture "BBQ", and legible in a way the flatter grate version wasn't.
 * More detail than the other four (rim highlight, smoke, a wheel and a
 * two-leg stand) needs a thinner stroke than IconBase's default to stay
 * crisp instead of muddy at picker size — checked side by side at 26px. */
export function Bbq(props) {
  return (
    <IconBase strokeWidth={10} {...props}>
      <path d="M100 58 C92 74 104 82 98 98" />
      <path d="M128 50 C120 66 132 76 126 92" />
      <path d="M156 58 C148 74 160 82 154 98" />
      <path d="M56 120 A72 75 0 0 0 200 120 Z" />
      <path d="M85 145 A45 26 0 0 0 152 160" />
      <line x1="90" y1="186" x2="78" y2="222" />
      <circle cx="70" cy="230" r="13" />
      <line x1="166" y1="184" x2="206" y2="220" />
      <line x1="150" y1="205" x2="188" y2="228" />
    </IconBase>
  );
}

export function Tongs(props) {
  return (
    <IconBase {...props}>
      <line x1="72" y1="52" x2="182" y2="208" />
      <line x1="186" y1="52" x2="78" y2="208" />
      <circle cx="128" cy="130" r="9" fill="currentColor" stroke="none" />
      <rect x="145" y="180" width="46" height="24" rx="10" transform="rotate(48 168 192)" />
      <rect x="65" y="180" width="46" height="24" rx="10" transform="rotate(-48 88 192)" />
    </IconBase>
  );
}

export function ChickenLeg(props) {
  return (
    <IconBase {...props}>
      <path d="M92 82 Q92 32 128 32 Q164 32 164 82 Q164 134 128 168 Q92 134 92 82 Z" />
      <line x1="128" y1="168" x2="128" y2="196" />
      <circle cx="110" cy="206" r="15" />
      <circle cx="146" cy="206" r="15" />
    </IconBase>
  );
}

export function Steak(props) {
  return (
    <IconBase {...props}>
      <ellipse cx="128" cy="128" rx="90" ry="58" transform="rotate(-12 128 128)" />
      <line x1="88" y1="96" x2="112" y2="168" />
      <line x1="122" y1="86" x2="146" y2="164" />
      <line x1="156" y1="90" x2="176" y2="150" />
    </IconBase>
  );
}

export function Chopsticks(props) {
  return (
    <IconBase {...props}>
      <line x1="70" y1="40" x2="130" y2="216" />
      <line x1="110" y1="40" x2="170" y2="216" />
    </IconBase>
  );
}
