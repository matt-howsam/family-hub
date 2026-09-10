/* Family Hub — Tailwind config extension, release 1.
   Mirrors tokens.css exactly. Use one or the other, not both.
   Night state: drive with a `night` variant on a [data-mode="night"] root. */

module.exports = {
  darkMode: ['variant', '&:is([data-mode="night"] *)'],
  theme: {
    extend: {
      colors: {
        ground:  { DEFAULT: '#FFFFFF', wash: '#F2F9F9', desk: '#EAEFEF' },
        surface: { DEFAULT: '#FFFFFF', sunken: '#FAFCFC' },
        line:    { hair: '#EDF2F2', DEFAULT: '#DCE6E6', strong: '#E4EBEB' },
        ink:     { DEFAULT: '#14454A', body: '#4F6265', label: '#566A6E', inverse: '#FFFFFF' }, // 10.6 / 6.4 / 5.8

        // Teal = progress. `teal` is 4.6:1 on white but 4.1:1 on tint-a and
        // 4.5:1 on surface-sunken — so 24px+ or fills ONLY.
        // `teal-ink` clears every ground at every size (6.2:1). Enforce in review.
        teal:    { DEFAULT: '#14828C', ink: '#0E6B74', deep: '#0A555C',
                   wash: '#EAF6F3', 'tint-a': '#E4F4F3', 'tint-b': '#F6FCFB' },
        // Amber = attention. Safe at every size (5.2:1).
        amber:   { DEFAULT: '#9A5F14', 'wash-a': '#FCF4E7', 'wash-b': '#FFFDFA',
                   hair: '#F3E9D8' },

        matt:  { a: '#DCEAF6', b: '#B9D3EA', ink: '#1F4B70' },
        renee: { a: '#FAE3DA', b: '#F0C3B2', ink: '#7E3A24' },
        rose:  { a: '#E5E4F7', b: '#C6C3EC', ink: '#3D3878' },
        tom:   { a: '#D8EFEA', b: '#AEDCD3', ink: '#0F5A51' },

        night: {
          ground: '#101E20', wash: '#16282B', surface: '#17282A',
          sunken: '#132224', hair: '#1F3336', line: '#263D40',
          ink: '#E2ECEC', body: '#8FA5A6', label: '#869C9E',
          teal: '#4FBFC4', amber: '#D99A3D',
        },
      },

      backgroundImage: {
        page:        'linear-gradient(180deg,#F2F9F9 0%,#FFFFFF 300px,#FFFFFF 100%)',
        'page-night':'linear-gradient(180deg,#16282B 0%,#101E20 340px,#101E20 100%)',
        water:       'linear-gradient(145deg,#0E6A76 0%,#12798A 55%,#158089 100%)',
        'water-night':'linear-gradient(145deg,#0A3A42 0%,#0D4B50 55%,#11595A 100%)',
        ready:       'linear-gradient(140deg,#E4F4F3 0%,#F6FCFB 100%)',
        attention:   'linear-gradient(90deg,#FCF4E7 0%,#FFFDFA 70%)',
        'attention-lg':'linear-gradient(140deg,#FCF4E7 0%,#FFFDF9 100%)',
        'slab-tom':  'linear-gradient(158deg,#DDF1EF 0%,#F0F9F8 100%)',
        'slab-rose': 'linear-gradient(158deg,#E7E9F8 0%,#F4F5FC 100%)',
        'disc-matt': 'linear-gradient(150deg,#DCEAF6 0%,#B9D3EA 100%)',
        'disc-renee':'linear-gradient(150deg,#FAE3DA 0%,#F0C3B2 100%)',
        'disc-rose': 'linear-gradient(150deg,#E5E4F7 0%,#C6C3EC 100%)',
        'disc-tom':  'linear-gradient(150deg,#D8EFEA 0%,#AEDCD3 100%)',
      },

      fontFamily: { sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'] },

      // [size, { lineHeight, letterSpacing, fontWeight }]
      fontSize: {
        hero:      ['50px', { lineHeight: '1',    letterSpacing: '-.035em', fontWeight: '800' }],
        display:   ['42px', { lineHeight: '1.06', letterSpacing: '-.035em', fontWeight: '800' }],
        next:      ['40px', { lineHeight: '1.14', letterSpacing: '-.032em', fontWeight: '800' }],
        slab:      ['34px', { lineHeight: '1.04', letterSpacing: '-.03em',  fontWeight: '800' }],
        title:     ['32px', { lineHeight: '1.05', letterSpacing: '-.03em',  fontWeight: '800' }],
        figure:    ['28px', { lineHeight: '1',    letterSpacing: '-.03em',  fontWeight: '800' }],
        answer:    ['24px', { lineHeight: '1.25', letterSpacing: '-.02em',  fontWeight: '700' }],
        row:       ['20px', { lineHeight: '1.2',  letterSpacing: '-.02em',  fontWeight: '700' }],
        body:      ['19px', { lineHeight: '1.35' }],
        'body-sm': ['16px', { lineHeight: '1.3'  }],
        label:     ['11px', { lineHeight: '1',    letterSpacing: '.16em',   fontWeight: '700' }],
        meta:      ['10px', { lineHeight: '1',    letterSpacing: '.12em',   fontWeight: '600' }],
      },

      spacing: {
        1: '4px', 2: '8px', 3: '11px', 4: '14px', 5: '18px',
        6: '22px', 7: '26px', 8: '30px', 9: '40px',
        'gutter-wall': '24px', 'gutter-phone': '14px', 'gutter-text': '30px',
        'target': '44px', 'commit': '56px', 'wet': '72px',
      },

      borderRadius: {
        sm: '8px', md: '14px', btn: '16px',
        lg: '22px', xl: '26px', '2xl': '30px', pill: '999px',
      },

      boxShadow: {
        frame: '0 0 0 1px rgba(20,69,74,.07), 0 22px 54px rgba(20,69,74,.13)',
        card:  '0 1px 3px rgba(20,69,74,.05), 0 8px 24px rgba(20,69,74,.06)',
        flat:  '0 1px 3px rgba(20,69,74,.04)',
        hair:  'inset 0 0 0 1px #EDF2F2',
        input: 'inset 0 0 0 1.5px #DCE6E6',
        select:'inset 0 0 0 2px #14828C',
        current:'0 0 0 3px rgba(20,130,140,.18)',
        'frame-night':'0 0 0 1px rgba(226,236,236,.06)',
        'card-night': '0 0 0 1px rgba(226,236,236,.05)',
      },

      transitionTimingFunction: { fh: 'cubic-bezier(.2,.8,.2,1)' },
      transitionDuration: { tick: '180ms', settle: '320ms', dim: '1200ms' },
    },
  },
};
