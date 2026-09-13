'use client';
import { useEffect, useState } from 'react';
import { weatherIcon } from '@/lib/weatherIcons';

/* Rendered on the client because the server has no idea what time it is in
   the kitchen. Ticks every 20s — a wall clock that lags a minute is worse
   than no clock, and a 1s interval on a screen that never sleeps is waste.

   `daily` (from lib/conditions.js, read from the persisted store by the
   caller — never fetched here) is the always-on weather line: present
   every day, calm by default. Appended to the date row rather than a
   separate stacked line, per the conditions data spec — the Today zone
   already carries the Tonight line beneath the date, and a second one
   starts to read as a list. Rain is the only element that can take the
   attention colour; nothing else in this line ever does. */
export default function Clock({ tz, daily }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  const opts = { timeZone: tz };
  const Icon = daily ? weatherIcon(daily.icon) : null;

  return (
    <div>
      <div className="clock" suppressHydrationWarning>
        {now
          ? now.toLocaleTimeString('en-AU', { ...opts, hour: 'numeric', minute: '2-digit', hour12: false })
          : ' '}
      </div>
      <div className="date" suppressHydrationWarning>
        {now
          ? now.toLocaleDateString('en-AU', { ...opts, weekday: 'long', day: 'numeric', month: 'long' })
          : ' '}
        {daily && (
          <span className="date__weather">
            {' · '}
            {Icon && <Icon size={20} className="date__weather-icon" />}
            {daily.tempNow != null && <span> {daily.tempNow}° now</span>}
            {daily.tempMax != null && <span> · {daily.tempMax}°</span>}
            {daily.rainFrom && <span className="date__rain"> · Rain from {daily.rainFrom}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
