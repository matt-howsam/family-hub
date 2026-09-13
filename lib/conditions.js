/* ==========================================================================
   Family Hub — weather and water conditions
   See docs/family-hub-conditions-data-spec.md (addendum to the 12 September
   review, §2.5) for the full reasoning. Two surfaces read this module:
   the weekend water hero and the always-on weather line in the Today zone.

   Sources:
   - Open-Meteo forecast (rain, cloud, wind, temperature, the WMO condition
     code) — free, keyless, non-commercial. https://open-meteo.com
   - Open-Meteo marine (swell, wave, sea surface temperature) — a genuine
     multi-hour forecast, which a live buoy reading can't be. This is a
     deliberate change from the first build, which used the household's own
     buoy proxy for swell because a real reading beats a model for "right
     now" — but the verdict here needs a forward daylight window, not an
     instant, so it needs a forecast.
   - The household's own buoy/tide proxy, kept ONLY for tide. Open-Meteo's
     own docs warn its tide height is modelled at ~8km resolution and isn't
     fit for coastal use; the buoy's real gauge reading is what's kept, at
     the honest ceiling of what it can say (current level and short-term
     trend — its tideSeries has no future predictions; confirmed live
     before the first build, see git history).

   Deliberately NOT shared with SeaScore, on purpose — see DECISIONS.md.
   ========================================================================== */

import { sql } from './db.js';
import { today, TZ } from './week.js';

const LAT = -28.259;
const LON = 153.579; // South Kingscliff, NSW
const LON_MARINE = 153.60; // nudged offshore, per the data spec

const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&timezone=Australia%2FSydney&forecast_days=3` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,` +
  `precipitation_sum,rain_sum,precipitation_hours,precipitation_probability_max,` +
  `wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset` +
  `&hourly=temperature_2m,precipitation,precipitation_probability,cloud_cover,` +
  `wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code` +
  `&current=temperature_2m,weather_code,precipitation`;

const MARINE_URL =
  `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON_MARINE}` +
  `&cell_selection=sea&timezone=Australia%2FSydney` +
  `&hourly=swell_wave_height,swell_wave_direction,swell_wave_period,wave_height,wind_wave_height,sea_surface_temperature`;

const BUOY_URL = 'https://offshore-window-finder.vercel.app/api/buoy?loc=tweed';

/* Two named windows, kept apart on purpose (see the data spec) so they
   don't get merged into one "daytime" concept later:
   - DAYLIGHT: the beach/water verdict. Roughly 9am-5pm.
   - SCHOOL: the weather line's rain warning. 8am-3:30pm — Tom's met at
     3:10, Rose finishes 3:20, so anything after 15:30 is the afternoon. */
const DAYLIGHT_WINDOW = [9, 17];
const SCHOOL_WINDOW = [8, 15.5];

const WMO = {
  0: { icon: 'Sun', phrase: 'Clear' },
  1: { icon: 'CloudSun', phrase: 'Mainly clear' },
  2: { icon: 'CloudSun', phrase: 'Partly cloudy' },
  3: { icon: 'Cloud', phrase: 'Overcast' },
  45: { icon: 'CloudFog', phrase: 'Foggy' },
  48: { icon: 'CloudFog', phrase: 'Foggy' },
  51: { icon: 'CloudRain', phrase: 'Light drizzle' },
  53: { icon: 'CloudRain', phrase: 'Drizzle' },
  55: { icon: 'CloudRain', phrase: 'Heavy drizzle' },
  56: { icon: 'CloudRain', phrase: 'Freezing drizzle' },
  57: { icon: 'CloudRain', phrase: 'Freezing drizzle' },
  61: { icon: 'CloudRain', phrase: 'Light rain' },
  63: { icon: 'CloudRain', phrase: 'Rain' },
  65: { icon: 'CloudRain', phrase: 'Heavy rain' },
  66: { icon: 'CloudRain', phrase: 'Freezing rain' },
  67: { icon: 'CloudRain', phrase: 'Freezing rain' },
  71: { icon: 'CloudSnow', phrase: 'Light snow' },
  73: { icon: 'CloudSnow', phrase: 'Snow' },
  75: { icon: 'CloudSnow', phrase: 'Heavy snow' },
  77: { icon: 'CloudSnow', phrase: 'Snow grains' },
  80: { icon: 'CloudRain', phrase: 'Showers' },
  81: { icon: 'CloudRain', phrase: 'Showers' },
  82: { icon: 'CloudRain', phrase: 'Heavy showers' },
  85: { icon: 'CloudSnow', phrase: 'Snow showers' },
  86: { icon: 'CloudSnow', phrase: 'Snow showers' },
  95: { icon: 'CloudLightning', phrase: 'Thunderstorm' },
  96: { icon: 'CloudLightning', phrase: 'Thunderstorm' },
  99: { icon: 'CloudLightning', phrase: 'Thunderstorm' },
};
const wmoInfo = (code) => WMO[code] ?? { icon: 'Cloud', phrase: 'Unsettled' };

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compassFrom = (deg) => (deg == null ? null : COMPASS[Math.round(deg / 22.5) % 16]);

function windLabel(speedKmh) {
  if (speedKmh == null) return null;
  if (speedKmh < 6) return 'Calm';
  if (speedKmh < 20) return 'Light';
  if (speedKmh < 30) return 'Moderate';
  if (speedKmh < 40) return 'Fresh';
  return 'Strong';
}

/** Indices in an hourly `time` array that fall on `dateIso` within [startHour, endHour). */
function indicesInWindow(times, dateIso, [startHour, endHour]) {
  const out = [];
  times.forEach((t, i) => {
    if (!t.startsWith(dateIso)) return;
    const hour = Number(t.slice(11, 13)) + Number(t.slice(14, 16)) / 60;
    if (hour >= startHour && hour < endHour) out.push(i);
  });
  return out;
}

function formatHour(h) {
  const whole = Math.floor(h);
  const period = whole >= 12 ? 'pm' : 'am';
  const h12 = whole % 12 === 0 ? 12 : whole % 12;
  return `${h12}${period}`;
}

async function fetchJson(url, label) {
  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`${label} status ${res.status}`);
  return res.json();
}

/**
 * Computes today's conditions payload from live sources. Weather and
 * marine are fetched independently (Promise.allSettled) so one failing
 * doesn't blank the other — the data spec's "two endpoints, two failure
 * modes" rule. Returns null only if the weather fetch itself fails, since
 * both surfaces depend on it for rain, wind and temperature.
 */
async function computeConditions() {
  const [weatherResult, marineResult, buoyResult] = await Promise.allSettled([
    fetchJson(FORECAST_URL, 'forecast'),
    fetchJson(MARINE_URL, 'marine'),
    fetchJson(BUOY_URL, 'buoy'),
  ]);

  if (weatherResult.status !== 'fulfilled') {
    console.error('weather fetch failed:', weatherResult.reason?.message);
    return null;
  }
  const weather = weatherResult.value;
  const marine = marineResult.status === 'fulfilled' ? marineResult.value : null;
  if (marineResult.status === 'rejected') console.error('marine fetch failed:', marineResult.reason?.message);
  const buoy = buoyResult.status === 'fulfilled' ? buoyResult.value : null;
  if (buoyResult.status === 'rejected') console.error('buoy fetch failed:', buoyResult.reason?.message);

  const dateIso = today(TZ).toISOString().slice(0, 10);
  const h = weather.hourly;
  const daylightIdx = indicesInWindow(h.time, dateIso, DAYLIGHT_WINDOW);
  const schoolIdx = indicesInWindow(h.time, dateIso, SCHOOL_WINDOW);

  /* ---- The daylight-window verdict, gated in priority order: rain, then
     cloud, then wind, then swell. Wind and swell were running first in the
     original build, which is exactly why an overcast, showery day with
     light south-easterlies scored as a beach day. ---- */
  const rainMax = daylightIdx.length
    ? Math.max(...daylightIdx.map((i) => h.precipitation_probability[i] ?? 0))
    : (weather.daily?.precipitation_probability_max?.[0] ?? 0);
  const rainfallMax = daylightIdx.length ? Math.max(...daylightIdx.map((i) => h.precipitation[i] ?? 0)) : 0;
  const rainGateFails = rainMax >= 50 || rainfallMax > 0.2;

  const avgCloud = daylightIdx.length
    ? daylightIdx.reduce((sum, i) => sum + (h.cloud_cover[i] ?? 0), 0) / daylightIdx.length
    : null;
  const cloudGateFails = avgCloud != null && avgCloud >= 70;

  const windMax = daylightIdx.length ? Math.max(...daylightIdx.map((i) => h.wind_speed_10m[i] ?? 0)) : null;
  const windGateFails = windMax != null && windMax >= 30;

  const marineH = marine?.hourly;
  const marineDaylightIdx = marineH ? indicesInWindow(marineH.time, dateIso, DAYLIGHT_WINDOW) : [];
  const swellMax = marineDaylightIdx.length
    ? Math.max(...marineDaylightIdx.map((i) => marineH.swell_wave_height[i] ?? 0))
    : null;
  const swellGateFails = swellMax != null && swellMax >= 1.5;

  let headline;
  if (rainGateFails) headline = 'Rain about';
  else if (!cloudGateFails && !windGateFails && !swellGateFails) headline = 'Beach day';
  else headline = 'Changeable';

  // A representative mid-window (~1pm) reading for the display facts —
  // gates above look at the whole window's worst case, but the card shows
  // one legible number, not a range.
  const midIdx = daylightIdx[Math.floor(daylightIdx.length / 2)] ?? 0;
  const marineMidIdx = marineDaylightIdx[Math.floor(marineDaylightIdx.length / 2)] ?? 0;

  const windDesc = h.wind_speed_10m[midIdx] != null
    ? `${windLabel(h.wind_speed_10m[midIdx])}${compassFrom(h.wind_direction_10m[midIdx]) ? ` ${compassFrom(h.wind_direction_10m[midIdx])}` : ''}`
    : null;

  const swellDesc = marineH && marineH.swell_wave_height[marineMidIdx] != null
    ? `${marineH.swell_wave_height[marineMidIdx].toFixed(1)}m` +
      `${compassFrom(marineH.swell_wave_direction[marineMidIdx]) ? ` ${compassFrom(marineH.swell_wave_direction[marineMidIdx])}` : ''} swell` +
      (marineH.swell_wave_period[marineMidIdx] ? `, ${Math.round(marineH.swell_wave_period[marineMidIdx])}s` : '')
    : null;

  const waterTemp = marineH?.sea_surface_temperature?.[marineMidIdx] != null
    ? Math.round(marineH.sea_surface_temperature[marineMidIdx])
    : null;

  /* Tide: current level and short-term trend only — see the module note. */
  let tideLevel = null;
  let tideTrend = null;
  const series = buoy?.tideSeries;
  if (series?.length) {
    const last = series[series.length - 1];
    const level = last.p ?? last.a;
    if (level != null) {
      tideLevel = level.toFixed(1);
      const prevIdx = Math.max(0, series.length - 4); // ~30 minutes earlier at 10-minute steps
      const prevLevel = series[prevIdx]?.p ?? series[prevIdx]?.a;
      if (prevLevel != null) tideTrend = level > prevLevel ? 'rising' : level < prevLevel ? 'falling' : 'steady';
    }
  }

  /* ---- The always-on weather line — a different question (what to wear,
     does anything get cancelled), a different window (school hours), and
     shown every day, not just weekends. ---- */
  const wmoNow = wmoInfo(weather.current?.weather_code);
  let rainFrom = null;
  for (const i of schoolIdx) {
    if ((h.precipitation_probability[i] ?? 0) >= 50 || (h.precipitation[i] ?? 0) > 0.2) {
      const hour = Number(h.time[i].slice(11, 13));
      rainFrom = formatHour(hour);
      break;
    }
  }

  return {
    weekend: {
      headline,
      windDesc,
      swellDesc,
      waterTemp,
      rainMax: Math.round(rainMax),
      tideLevel,
      tideTrend,
    },
    daily: {
      icon: wmoNow.icon,
      phrase: wmoNow.phrase,
      tempNow: weather.current?.temperature_2m != null ? Math.round(weather.current.temperature_2m) : null,
      tempMax: weather.daily?.temperature_2m_max?.[0] != null ? Math.round(weather.daily.temperature_2m_max[0]) : null,
      rainFrom,
    },
  };
}

const STALE_MS = 50 * 60 * 1000; // treat cached data under 50 minutes old as fresh enough to skip a re-fetch

/**
 * Re-fetches and persists conditions, unless the stored row is already
 * fresh and `force` isn't set. Never called from a page render — only from
 * the API route AutoRefresh pings. Returns the fresh (or already-fresh
 * cached) payload, or null if there's nothing usable at all.
 */
export async function refreshConditions({ force = false } = {}) {
  if (sql && !force) {
    try {
      const [row] = await sql`select fetched_at from conditions_cache where id = true`;
      if (row && Date.now() - new Date(row.fetched_at).getTime() < STALE_MS) {
        return getStoredConditions();
      }
    } catch (e) {
      console.error('checking conditions freshness failed:', e.message);
    }
  }

  const payload = await computeConditions();
  if (!payload) return sql ? getStoredConditions() : null;

  if (sql) {
    try {
      await sql`
        insert into conditions_cache (id, payload, fetched_at)
        values (true, ${JSON.stringify(payload)}::jsonb, now())
        on conflict (id) do update set payload = excluded.payload, fetched_at = now()`;
    } catch (e) {
      console.error('persisting conditions failed:', e.message);
    }
  }

  return { ...payload, fetchedAt: new Date().toISOString(), stale: false };
}

/**
 * The only function a page render should call. Reads the persisted row —
 * never hits Open-Meteo itself. Bootstraps with one live fetch if nothing
 * has ever been stored; with no database configured, falls back to a live
 * fetch every time (matching every other lib module's no-db behaviour).
 */
export async function getStoredConditions() {
  if (!sql) return computeConditions().then((p) => (p ? { ...p, fetchedAt: new Date().toISOString(), stale: false } : null));

  try {
    const [row] = await sql`select payload, fetched_at from conditions_cache where id = true`;
    if (!row) return refreshConditions({ force: true }); // cold start
    return {
      ...row.payload,
      fetchedAt: row.fetched_at.toISOString(),
      stale: Date.now() - row.fetched_at.getTime() > STALE_MS,
    };
  } catch (e) {
    console.error('getStoredConditions failed:', e.message);
    return null;
  }
}
