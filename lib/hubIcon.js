/* The Hub app icon — shared between the studio (Settings › App icon), the
 * <HubIcon> preview component, and the dynamic /icon and /apple-icon routes.
 * `derive()` is pure/isomorphic (safe on the server); `toPNG()` needs a
 * canvas and only runs in the browser. */

export const FONTS = [
  { id: 'sans',    label: 'Sans',        family: "'Plus Jakarta Sans', sans-serif", weight: 800, scale: .64, dy: -.02, track: '-.03em' },
  { id: 'black',   label: 'Blackletter', family: "'UnifrakturMaguntia', serif",     weight: 400, scale: .70, dy: .02,  track: '0' },
  { id: 'tag',     label: 'Graffiti',    family: "'Sedgwick Ave Display', cursive", weight: 400, scale: .78, dy: .04,  track: '-.02em' },
  { id: 'drip',    label: 'Drip',        family: "'Rubik Wet Paint', sans-serif",   weight: 400, scale: .64, dy: 0,    track: '-.02em' },
  { id: 'marker',  label: 'Marker',      family: "'Permanent Marker', cursive",     weight: 400, scale: .70, dy: .02,  track: '0' },
  { id: 'block',   label: 'Block',       family: "'Bungee', sans-serif",            weight: 400, scale: .60, dy: .04,  track: '0' },
  { id: 'neon',    label: 'Neon',        family: "'Monoton', sans-serif",           weight: 400, scale: .62, dy: .06,  track: '0' },
  { id: 'slab',    label: 'Slab',        family: "'Alfa Slab One', serif",          weight: 400, scale: .64, dy: 0,    track: '-.01em' },
  { id: 'script',  label: 'Script',      family: "'Pacifico', cursive",             weight: 400, scale: .58, dy: -.1,  track: '0' },
  { id: 'stencil', label: 'Stencil',     family: "'Saira Stencil One', sans-serif", weight: 400, scale: .70, dy: 0,    track: '0' },
  { id: 'bubble',  label: 'Bubble',      family: "'Rubik Bubbles', sans-serif",     weight: 400, scale: .66, dy: 0,    track: '-.02em' },
  { id: 'pixel',   label: 'Pixel',       family: "'Silkscreen', monospace",         weight: 700, scale: .56, dy: -.04, track: '0' },
];

/* Preset choices for the app icon's "Letters" control — 'text' is the
 * literal string derive() renders, not an id to look up. Anything else
 * (an avatar's initials, say) can set cfg.text to any short string
 * directly; textScale() below sizes it by length, not by membership here. */
export const TEXTS = [{ id: 'H', text: 'H', label: 'H' }, { id: 'h', text: 'h', label: 'h' }, { id: 'hub', text: 'hub', label: 'hub' }];

/* One or two characters reads at the same scale as a single letter; anything
 * longer (a whole word) has to shrink to keep clear of the icon's edge. */
function textScale(text) {
  return text.length <= 2 ? 1 : .5;
}

export const MARKS = [
  { id: 'roof',   label: 'Roof',   d: 'M18 52 L50 22 L82 52 M32 47 V80 M68 47 V80 M32 64 H68', sw: 9 },
  { id: 'arch',   label: 'Door',   d: 'M28 82 V48 A22 22 0 0 1 72 48 V82 M28 63 H72', sw: 9 },
  { id: 'ring',   label: 'Hub',    d: 'M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 M39 35 V65 M61 35 V65 M39 50 H61', sw: 8 },
  { id: 'chunky', label: 'Chunky', d: 'M32 26 V74 M68 26 V74 M32 50 H68', sw: 19 },
];

export const SHAPES = [
  { id: 'squircle', label: 'Squircle',    r: .225 },
  { id: 'rounded',  label: 'Soft',        r: .34 },
  { id: 'circle',   label: 'Circle',      r: .5 },
  { id: 'square',   label: 'Full bleed',  r: 0 },
];

export const FILLS = [
  { id: 'solid', label: 'Solid' }, { id: 'linear', label: 'Linear' },
  { id: 'radial', label: 'Radial' }, { id: 'split', label: 'Split' },
];

export const EFFECTS = [
  { id: 'none', label: 'None' }, { id: 'drop', label: 'Drop' }, { id: 'long', label: 'Long shadow' },
  { id: 'offset', label: 'Offset' }, { id: 'stack', label: 'Stack' }, { id: 'glow', label: 'Glow' },
  { id: 'outline', label: 'Outline' },
];

export const PALETTE = ['#FFFFFF', '#111111', '#14454A', '#14828C', '#7CF5C8', '#C6FF00', '#FFD60A',
  '#FFB800', '#FF7A00', '#FF5E3A', '#FF2A68', '#FF3DF2', '#7A2BFF', '#2B3BFF'];

export const DEFAULT_CFG = {
  kind: 'type', font: 'sans', text: 'H', mark: 'roof', fg: '#FFFFFF', bg1: '#14828C', bg2: '#0A555C',
  ac: '#FFD60A', fill: 'linear', angle: 160, shape: 'squircle', effect: 'long', gloss: false,
};

const preset = (name, note, o) => ({ name, note, cfg: Object.assign({}, DEFAULT_CFG, o) });

export const PRESETS = [
  preset('House teal', 'Brand-true. The long shadow keeps it solid at 32px.', {}),
  preset('Gothic', 'Masthead blackletter, yellow as loud as it gets.', { font: 'black', fg: '#111111', bg1: '#FFD60A', fill: 'solid', effect: 'offset', ac: '#FF2A68' }),
  preset('Wall tag', 'A handstyle H with a pink kick-back.', { font: 'tag', bg1: '#2B3BFF', bg2: '#7A2BFF', angle: 135, effect: 'offset', ac: '#FF3DF2' }),
  preset('Wet paint', 'Acid lime dripping off deep violet.', { font: 'drip', fg: '#C6FF00', bg1: '#1A0638', bg2: '#4B1AA0', fill: 'radial', effect: 'none' }),
  preset('Neon', 'Tube lettering. Best on a dark wallpaper.', { font: 'neon', fg: '#FF3DF2', bg1: '#0B0B2A', bg2: '#2A0F5E', fill: 'radial', effect: 'glow' }),
  preset('Sunset block', 'Chunky caps, warm ramp, long shadow.', { font: 'block', fg: '#FFF3D6', bg1: '#FF5E3A', bg2: '#FF2A68', angle: 150 }),
  preset('Roof', 'The only mark that says "house" without a letter.', { kind: 'mark', mark: 'roof', bg1: '#FF7A00', bg2: '#FFB800', angle: 20, effect: 'drop' }),
  preset('Bubble', 'Cartoon H with a hard black stack.', { font: 'bubble', fg: '#FF2A68', bg1: '#7CF5C8', fill: 'solid', effect: 'stack', ac: '#111111' }),
  preset('Split slab', 'Two-tone ground cut on the diagonal.', { font: 'slab', fg: '#111111', bg1: '#FFD60A', bg2: '#FF5E3A', fill: 'split', angle: 135, effect: 'none' }),
  preset('Front door', 'Arch-top H — reads as a doorway.', { kind: 'mark', mark: 'arch', fg: '#14454A', bg1: '#7CF5C8', bg2: '#C6FF00', angle: 160, effect: 'none' }),
  preset('Pixel', '8-bit H in lime on electric blue.', { font: 'pixel', fg: '#C6FF00', bg1: '#2B3BFF', fill: 'solid', effect: 'offset', ac: '#111111' }),
  preset('Script', 'The whole word, lowercase, like a sign.', { font: 'script', text: 'hub', bg1: '#FF2A68', bg2: '#FF8A3D', fill: 'radial', effect: 'drop' }),
];

const hexToRgb = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
const shade = (h, amt) => {
  const [r, g, b] = hexToRgb(h);
  const f = (v) => Math.round(v * (1 - amt)).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
};
const byId = (arr, id) => arr.find((x) => x.id === id) || arr[0];
const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i + 1)).join(', ');

function bgCss(c) {
  if (c.fill === 'solid') return c.bg1;
  if (c.fill === 'radial') return `radial-gradient(circle at 30% 25%, ${c.bg2} 0%, ${c.bg1} 70%)`;
  if (c.fill === 'split') return `linear-gradient(${c.angle}deg, ${c.bg1} 50%, ${c.bg2} 50%)`;
  return `linear-gradient(${c.angle}deg, ${c.bg1} 0%, ${c.bg2} 100%)`;
}

/* Turns a stored icon config into the CSS values <HubIcon> renders with.
 * Pure — no DOM — so it also runs in the /icon and /apple-icon routes.
 *
 * `simplify` only touches 'long' and 'stack': each is built from many
 * text-shadow copies a fraction of a CSS pixel apart, which reads as a
 * crisp diagonal trail at app-icon scale (1024px) but blurs together at
 * avatar scale — see HubIcon.jsx. Collapsing to a single, larger-offset
 * copy keeps the "shadow trailing behind" look without the sub-pixel
 * smear. Every other effect (glow's halo, drop's shadow, outline's
 * stroke) is a single shadow layer already, so it was never the actual
 * problem and renders at full quality regardless of size. */
export function derive(cfgIn, opts) {
  const c = Object.assign({}, DEFAULT_CFG, cfgIn || {});
  const simplify = !!(opts && opts.simplify);
  const f = byId(FONTS, c.font), m = byId(MARKS, c.mark), s = byId(SHAPES, c.shape);
  const text = c.text || DEFAULT_CFG.text;
  const sh = shade(c.bg1, .38);
  let shadow = 'none', stroke = '0 transparent', color = c.fg, filter = 'none', sw = m.sw;
  switch (c.effect) {
    case 'drop':    shadow = '0 .03em .06em rgba(0,0,0,.32)'; filter = 'drop-shadow(0 .02em .035em rgba(0,0,0,.32))'; break;
    case 'long':
      if (simplify) { shadow = `.09em .09em 0 ${sh}`; filter = `drop-shadow(.09em .09em 0 ${sh})`; }
      else { shadow = repeat(18, (i) => `${(i * .012).toFixed(3)}em ${(i * .012).toFixed(3)}em 0 ${sh}`); filter = Array(10).fill(`drop-shadow(.008em .008em 0 ${sh})`).join(' '); }
      break;
    case 'offset':  shadow = `.07em .07em 0 ${c.ac}`; filter = `drop-shadow(.04em .04em 0 ${c.ac})`; break;
    case 'stack':
      if (simplify) { shadow = `.05em .05em 0 ${c.ac}`; filter = `drop-shadow(.05em .05em 0 ${c.ac})`; }
      else { shadow = repeat(6, (i) => `${(i * .012).toFixed(3)}em ${(i * .012).toFixed(3)}em 0 ${c.ac}`); filter = Array(5).fill(`drop-shadow(.009em .009em 0 ${c.ac})`).join(' '); }
      break;
    case 'glow':    shadow = `0 0 .03em ${c.fg}, 0 0 .12em ${c.fg}, 0 0 .28em ${c.fg}`; filter = `drop-shadow(0 0 .015em ${c.fg}) drop-shadow(0 0 .06em ${c.fg})`; break;
    case 'outline': color = 'transparent'; stroke = `.035em ${c.fg}`; sw = m.sw * .45; break;
  }
  return {
    radius: (s.r * 100) + '%', bg: bgCss(c), isType: c.kind !== 'mark', isMark: c.kind === 'mark',
    family: f.family, weight: f.weight, fsize: +(f.scale * textScale(text)).toFixed(3), dy: f.dy, track: f.track, text,
    fg: c.fg, color, shadow, stroke, path: m.d, sw, filter, gloss: !!c.gloss,
  };
}

/* Browser-only: rasterizes a config to a canvas at S×S px for the PNG
 * download and for the bytes we hand to the server on save. */
export async function toPNG(cfgIn, S) {
  S = S || 1024;
  const c = Object.assign({}, DEFAULT_CFG, cfgIn);
  const text = c.text || DEFAULT_CFG.text;
  const f = byId(FONTS, c.font), m = byId(MARKS, c.mark), s = byId(SHAPES, c.shape);
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const x = cv.getContext('2d');
  x.beginPath(); x.roundRect(0, 0, S, S, s.r * S); x.clip();

  let fill;
  if (c.fill === 'solid') fill = c.bg1;
  else if (c.fill === 'radial') {
    fill = x.createRadialGradient(.3 * S, .25 * S, 0, .3 * S, .25 * S, 1.026 * S);
    fill.addColorStop(0, c.bg2); fill.addColorStop(.7, c.bg1); fill.addColorStop(1, c.bg1);
  } else {
    const a = c.angle * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = (Math.abs(S * dx) + Math.abs(S * dy)) / 2;
    fill = x.createLinearGradient(S / 2 - dx * L, S / 2 - dy * L, S / 2 + dx * L, S / 2 + dy * L);
    if (c.fill === 'split') { fill.addColorStop(0, c.bg1); fill.addColorStop(.5, c.bg1); fill.addColorStop(.5, c.bg2); fill.addColorStop(1, c.bg2); }
    else { fill.addColorStop(0, c.bg1); fill.addColorStop(1, c.bg2); }
  }
  x.fillStyle = fill; x.fillRect(0, 0, S, S);

  const sh = shade(c.bg1, .38), E = c.effect;
  if (c.kind !== 'mark') {
    const fs = f.scale * textScale(text) * S, font = `${f.weight} ${fs}px ${f.family}`;
    await document.fonts.load(font, text);
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    const ty = S / 2 + f.dy * fs;
    const put = (col, ox, oy) => { x.fillStyle = col; x.fillText(text, S / 2 + ox * fs, ty + oy * fs); };
    if (E === 'long') for (let i = 18; i >= 1; i--) put(sh, i * .012, i * .012);
    if (E === 'offset') put(c.ac, .07, .07);
    if (E === 'stack') for (let i = 6; i >= 1; i--) put(c.ac, i * .012, i * .012);
    if (E === 'drop') { x.shadowColor = 'rgba(0,0,0,.32)'; x.shadowOffsetY = .03 * fs; x.shadowBlur = .06 * fs; }
    if (E === 'glow') { x.shadowColor = c.fg; x.shadowBlur = .2 * fs; put(c.fg, 0, 0); put(c.fg, 0, 0); }
    if (E === 'outline') { x.lineWidth = .035 * fs; x.strokeStyle = c.fg; x.strokeText(text, S / 2, ty); }
    else put(c.fg, 0, 0);
    x.shadowColor = 'transparent';
  } else {
    const k = S * .72 / 100, u = 100 / .72, p = new Path2D(m.d);
    const stroke = (col, ox, oy, w) => {
      x.save(); x.translate(S * .14, S * .14); x.scale(k, k); x.translate(ox * u, oy * u);
      x.lineWidth = w || m.sw; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke(p); x.restore();
    };
    if (E === 'long') for (let i = 10; i >= 1; i--) stroke(sh, i * .008, i * .008);
    if (E === 'offset') stroke(c.ac, .04, .04);
    if (E === 'stack') for (let i = 5; i >= 1; i--) stroke(c.ac, i * .009, i * .009);
    if (E === 'drop') { x.shadowColor = 'rgba(0,0,0,.32)'; x.shadowOffsetY = .02 * S; x.shadowBlur = .035 * S; }
    if (E === 'glow') { x.shadowColor = c.fg; x.shadowBlur = .06 * S; stroke(c.fg, 0, 0); }
    stroke(c.fg, 0, 0, E === 'outline' ? m.sw * .45 : m.sw);
    x.shadowColor = 'transparent';
  }
  if (c.gloss) {
    const g = x.createLinearGradient(0, 0, 0, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S / 2);
  }
  return cv;
}
