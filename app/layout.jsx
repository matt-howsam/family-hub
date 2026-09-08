import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--fh-font-loaded',
});

export const metadata = {
  title: 'Family Hub',
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2F9F9',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-AU" className={jakarta.className}>
      <body>{children}</body>
    </html>
  );
}
