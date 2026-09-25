/* Phosphor (@phosphor-icons/react, used everywhere else in the app) has no
 * BBQ, tongs, drumstick, steak or chopsticks glyphs — checked against the
 * latest version, not just what's installed. These five are hand-drawn to
 * match its look: 256×256 viewBox, stroke-based, 16-unit stroke, rounded
 * caps/joins — so they drop into the same picker grid at the same size
 * without reading as a different icon set. Each accepts the same
 * {size, className} shape components/PlannerScreen.jsx already renders
 * every food icon with. */

function IconBase({ size = '1em', className, children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256"
      fill="none" stroke="currentColor" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function Bbq(props) {
  return (
    <IconBase {...props}>
      <rect x="48" y="96" width="160" height="64" rx="14" />
      <line x1="88" y1="96" x2="88" y2="160" />
      <line x1="128" y1="96" x2="128" y2="160" />
      <line x1="168" y1="96" x2="168" y2="160" />
      <line x1="62" y1="160" x2="42" y2="216" />
      <line x1="194" y1="160" x2="214" y2="216" />
      <path d="M128 42 C112 66 112 84 128 92 C144 84 144 66 128 42 Z" />
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
