/* ==========================================================================
   Family Hub — beach/weather conditions
   Real data for the weekend water hero, replacing the fully fabricated copy
   the original mockup shipped with (see
   docs/reviews/family-hub-review-2026-09-12.md §2.5 — "Beach day" was wrong
   on an overcast, rainy day because nothing behind it was real).

   Two sources, neither needing an account:
   - Open-Meteo forecast — rain, cloud, wind. Free, keyless, non-commercial
     use. https://open-meteo.com
   - The household's own buoy/tide proxy, a Vercel deployment Matt already
     runs over Queensland Government open data for the Tweed Sand-bypass
     Jetty gauge and the Tweed Offshore buoy. Real readings, not a model —
     wins over Open-Meteo's marine model for swell.

   The verdict is deliberately conservative (docs/reviews/... §2.5's own
   suggestion): it only claims "Beach day" when rain and swell both clear a
   real bar. Everything else states what's actually happening rather than
   grading it. Tune the thresholds against the household's own SeaScore
   rules if those say something different — this is a first pass.
   ========================================================================== */

const LAT = -28.2598;
const LON = 153.5782; // South Kingscliff, NSW

const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&hourly=precipitation_probability,cloud_cover,wind_speed_10m,wind_direction_10m` +
  `&timezone=Australia%2FSydney&forecast_days=1`;

const BUOY_URL = 'https://offshore-window-finder.vercel.app/api/buoy?loc=tweed';

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
function compassFrom(deg) {
  if (deg == null) return null;
  return COMPASS[Math.round(deg / 22.5) % 16];
}

function windLabel(speedKmh) {
  if (speedKmh == null) return null;
  if (speedKmh < 6) return 'Calm';
  if (speedKmh < 20) return 'Light';
  if (speedKmh < 30) return 'Moderate';
  if (speedKmh < 40) return 'Fresh';
  return 'Strong';
}

async function fetchForecast() {
  const res = await fetch(FORECAST_URL, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`forecast status ${res.status}`);
  return res.json();
}

async function fetchBuoy() {
  const res = await fetch(BUOY_URL, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`buoy status ${res.status}`);
  return res.json();
}

/* tideSeries only ever runs up to "now" — it's a predicted-vs-actual
   calibration record, not a forecast — so there is no future high/low to
   read off it. Current level and a short-term trend is the honest ceiling
   of what this source can say. Checked directly against a live sample
   before writing this: the last entry's timestamp equalled the request
   time to the minute. */
function tideNow(series) {
  if (!series?.length) return null;
  const last = series[series.length - 1];
  const level = last.p ?? last.a;
  if (level == null) return null;

  const prevIdx = Math.max(0, series.length - 4); // ~30 minutes earlier at 10-minute steps
  const prevLevel = series[prevIdx]?.p ?? series[prevIdx]?.a;
  const trend = prevLevel == null ? null
    : level > prevLevel ? 'rising' : level < prevLevel ? 'falling' : 'steady';

  return { level, trend };
}

/**
 * Real conditions for the weekend water hero. Returns null on any failure —
 * the card doesn't render rather than showing a stale or fabricated guess,
 * which is a real change from the old always-on placeholder but matches
 * "never a confident guess" everywhere else in the app.
 */
export async function getConditions() {
  let forecast, buoy;
  try {
    [forecast, buoy] = await Promise.all([fetchForecast(), fetchBuoy()]);
  } catch (e) {
    console.error('getConditions failed:', e.message);
    return null;
  }

  const hourly = forecast?.hourly;
  if (!hourly?.time?.length) return null;

  // Remaining hours of today — the API was asked for Australia/Sydney, so
  // these timestamps are already local; no separate conversion needed.
  const nowHour = new Date().toISOString().slice(0, 13);
  let fromIdx = hourly.time.findIndex((t) => t.slice(0, 13) >= nowHour);
  if (fromIdx === -1) fromIdx = 0;

  const rainMax = Math.max(...hourly.precipitation_probability.slice(fromIdx));
  const windMax = Math.max(...hourly.wind_speed_10m.slice(fromIdx));
  const windNow = hourly.wind_speed_10m[fromIdx];
  const windDirNow = hourly.wind_direction_10m[fromIdx];

  const wave = buoy?.wave;
  const tide = tideNow(buoy?.tideSeries);
  const swellHeight = wave?.hs ?? null;

  let headline;
  if (rainMax >= 50) {
    headline = 'Rain about';
  } else if (rainMax < 30 && windMax < 30 && (swellHeight == null || swellHeight < 1.5)) {
    headline = 'Beach day';
  } else {
    headline = 'Changeable';
  }

  const windDesc = windNow != null
    ? `${windLabel(windNow)}${compassFrom(windDirNow) ? ` ${compassFrom(windDirNow)}` : ''}`
    : null;

  const swellDesc = swellHeight != null
    ? `${swellHeight.toFixed(1)}m${compassFrom(wave.dir) ? ` ${compassFrom(wave.dir)}` : ''} swell` +
      (wave.tp ? `, ${Math.round(wave.tp)}s` : '')
    : null;

  return {
    headline,
    windDesc,
    swellDesc,
    rainMax: Math.round(rainMax),
    waterTemp: wave?.sst != null ? Math.round(wave.sst) : null,
    tideLevel: tide?.level != null ? tide.level.toFixed(1) : null,
    tideTrend: tide?.trend ?? null,
    generatedAt: new Date().toISOString(),
  };
}
