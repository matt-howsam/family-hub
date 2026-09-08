'use client';
import { useEffect, useState } from 'react';

/* Rendered on the client because the server has no idea what time it is in
   the kitchen. Ticks every 20s — a wall clock that lags a minute is worse
   than no clock, and a 1s interval on a screen that never sleeps is waste. */
export default function Clock({ tz }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  const opts = { timeZone: tz };
  return (
    <div>
      <div className="clock" suppressHydrationWarning>
        {now
          ? now.toLocaleTimeString('en-AU', { ...opts, hour: 'numeric', minute: '2-digit', hour12: false })
          : '\u00A0'}
      </div>
      <div className="date" suppressHydrationWarning>
        {now
          ? now.toLocaleDateString('en-AU', { ...opts, weekday: 'long', day: 'numeric', month: 'long' })
          : '\u00A0'}
      </div>
    </div>
  );
}
