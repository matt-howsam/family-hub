/* app/icon.js gets Next's automatic <link rel="icon"> treatment, but the
 * web app manifest (what Android's "Add to Home Screen" actually reads)
 * needs its own icons array — it isn't merged in automatically. */
export default function manifest() {
  return {
    name: 'Family Hub',
    short_name: 'The Hub',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F9F9',
    theme_color: '#F2F9F9',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
    ],
  };
}
