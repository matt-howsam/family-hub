import { Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudLightning, CloudSnow } from '@phosphor-icons/react/ssr';

/* Matches the icon names lib/conditions.js's WMO table assigns. */
const WEATHER_ICONS = { Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudLightning, CloudSnow };

export function weatherIcon(name) {
  return WEATHER_ICONS[name] ?? Cloud;
}
