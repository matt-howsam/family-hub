# Family Hub — Conditions Card: Data Source Spec

Addendum to the 12 September review, §2.5. Replaces whatever currently feeds
the "Beach day" card.

---

## Why not BOM directly

Worth settling now so it isn't revisited.

**`api.weather.bom.gov.au` is off limits.** It's the undocumented JSON API
behind the BOM Weather app, and every response carries a copyright notice
stating the API is owned by the Bureau and must not be used, copied or shared,
directing you to contact them about legitimate access. It works, it's widely
reverse-engineered, and it is explicitly not licensed for this. Don't build on
it.

**The FTP feeds are legitimate but awkward.** BOM publishes forecast, warning
and observation products free via anonymous FTP, not for commercial use, with
no availability guarantee. They're XML text products per forecast district —
usable, but you'd be parsing precis forecasts and district text rather than
querying a point, and BOM explicitly says it can't notify anonymous users of
service changes.

**WillyWeather** is the commercial route. It's a paid, keyed API covering wind,
tides, rainfall, swell and UV across Australian locations including beaches,
and it sources from BOM among others. Worth knowing about specifically for
tides. Not worth paying for the rest.

## Use Open-Meteo

Free for non-commercial use, no API key, and it returns exactly the daily
variables asked for.

**Use the default `/v1/forecast` endpoint, not `/v1/bom`.** There's a
BOM-specific endpoint serving the ACCESS-G model, but Open-Meteo currently
carries a notice that BOM is upgrading its platforms and open-data delivery is
temporarily suspended. Pinning `models=bom_access_global` would make the card
depend on a feed that is down. The default endpoint picks the best available
model per location and is the one Open-Meteo recommends anyway.

### Forecast request

`https://api.open-meteo.com/v1/forecast`

Kingscliff is roughly `-28.259, 153.579`. Confirm against the household
address.

```
latitude=-28.259
longitude=153.579
timezone=Australia/Sydney
forecast_days=3
daily=weather_code,temperature_2m_max,temperature_2m_min,
      apparent_temperature_max,precipitation_sum,rain_sum,
      precipitation_hours,precipitation_probability_max,
      wind_speed_10m_max,wind_gusts_10m_max,
      wind_direction_10m_dominant,uv_index_max,sunrise,sunset
hourly=temperature_2m,precipitation,precipitation_probability,
       cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,
       weather_code
current=temperature_2m,weather_code,precipitation
```

Notes:

- **`timezone` is required whenever daily variables are requested.** Set it
  explicitly to `Australia/Sydney` — never `auto`. Same reasoning as
  `lib/week.js#today()`: the household sits on the DST border and from 4
  October NSW and Queensland diverge.
- `precipitation_probability_max` and `uv_index_max` are on the main forecast
  API; confirm they're returned for this location before relying on them.
- `weather_code` is a WMO code. 0 is clear, 1–3 mainly clear through overcast,
  45/48 fog, 51–55 drizzle, 61–65 rain, 80–82 showers, 95+ thunderstorm. Map
  it to a Phosphor icon and a short phrase — don't display the number.

### Marine request (separate endpoint)

`https://marine-api.open-meteo.com/v1/marine`

```
latitude=-28.259
longitude=153.60          # nudge offshore
cell_selection=sea
timezone=Australia/Sydney
hourly=swell_wave_height,swell_wave_direction,swell_wave_period,
       wave_height,wind_wave_height,sea_surface_temperature
```

This covers the swell, period and water temperature already on the card.

**Do not use `sea_level_height_msl` for tides.** Open-Meteo's own docs warn
that tides and currents are modelled at roughly 8 km resolution, that coastal
accuracy is limited, and that it is not suitable for coastal navigation. Tide
times are the numbers most likely to put someone on a sandbar — keep whatever
source currently produces `High 4:12pm · Low 10:38am`, and note in the code
where it comes from.

### Attribution

Open-Meteo's licence requires clear attribution, and the marine data
additionally requires crediting DWD. A line on the phone view or an about
screen is enough — it doesn't need to be on the wall.

---

## The actual fix: use a daylight window, not a daily total

This is the part that would have caught Saturday.

A `precipitation_sum` of 4mm tells you nothing about whether the afternoon was
usable — it could have all fallen overnight. Equally, a daily
`wind_direction_10m_dominant` of SE averages away a morning northerly.

**Compute the verdict from the hourly series across a daylight window** —
roughly 09:00 to 17:00 local, or sunrise to sunset if you want to be tidy —
and use the daily aggregates only for the display numbers (max temp, rain
total).

Over that window, gate in this order:

1. **Rain.** Any hour with meaningful precipitation, or a high
   `precipitation_probability`, disqualifies a beach verdict outright. This is
   the check that was missing.
2. **Cloud.** Sustained high `cloud_cover` downgrades it. Overcast is not a
   beach day even when dry.
3. **Wind.** Speed and direction. Offshore and light is the good case.
4. **Swell and period.** Only now does the surf/boating quality matter.

Wind and swell currently appear to be running first, which is why an overcast,
showery day with light south-easterlies scored as a beach day.

---

## Two rules for the card itself

**Show generation time.** The brief requires it wherever content is derived
rather than entered, and the card currently has none. A verdict computed at
6am and still on screen at 3:51pm is a different claim from a live one.

**Only assert a verdict when the data supports one.** The facts underneath —
water 21°, 1.2m E swell 11s, high 4:12pm — were all correct and useful on
Saturday. Only the one-word headline was wrong. Consider a plain conditions
headline as the default, with a named verdict appearing only when the gates
above clear comfortably. `DECISIONS.md` already says never a confident guess;
this is that rule applied to a judgement rather than to a number.

---

## Where weather lives on a school morning

The On the water card is a weekend object. At 7:15 on a Tuesday nobody needs
swell period, and that space belongs to the kids' blocks — the home screen
brief is explicit that the uniform answer must dominate State 1.

But weather still matters on a school morning. It just changes question:
not *is it worth going down there*, but **what do they wear and does anything
get cancelled**.

### Two surfaces, not one

**1. A permanent weather line in the Today zone.** Always present, every day,
calm. Minimal — an icon and two or three numbers.

**2. The On the water card.** Additive, conditional, and the expansion of the
line rather than a competitor to it.

### The line

Recommended placement: appended to the date, as part of the same composed
unit.

> **15:51**
> Saturday, 12 September · ☁ 19° now · 24°

Reasons to prefer this over a separate row: the Today zone already carries the
Tonight line beneath the date, and a second stacked one-liner starts to read
as a list. Keeping weather on the date row holds the zone to two lines and
leaves the week letter chip unchallenged on the right.

The alternative worth trying is a small right-hand column beneath the week
chip. Test both at a metre — the deciding factor is whether the date row gets
too long to scan, and that can only be judged on the fridge.

**Contents, in priority order:**

1. **Condition icon**, from `weather_code`. Phosphor, taking the palette, not
   emoji — same rule the meal planner set.
2. **Temperature now**, from `current=temperature_2m`. At 7:15 this is the
   more useful of the two numbers: it's what they walk out into.
3. **Today's max**, from `temperature_2m_max`. Answers whether the jumper
   comes home in a bag.
4. **Rain, only when there is some.** Omit the element entirely on a dry day
   rather than printing a zero.

Deliberately absent: wind speed, wind direction, UV, humidity, overnight min.
All are in the payload and none of them change what anyone does before school.
Wind and swell stay on the water card where they're the point.

### The rain element is the only thing that can take attention

Everything in this line is calm by default. Rain during school hours is the
one weather fact that changes behaviour — a raincoat, a lift instead of a
walk, sport moved indoors — so it earns the attention treatment. Nothing else
in the line ever does.

Compute it over a **school-day window, 08:00 to 15:30**, from the hourly
series. Note this is a *different* window from the daylight one used for the
beach verdict — name them both in code so they don't get merged later. Tom is
met at 3:10 and Rose finishes at 3:20, so anything after 15:30 belongs to the
afternoon, not the school day.

Express it as the thing that gets acted on, not as meteorology: `rain from
11am` beats `6mm` beats `precipitation_probability_max: 78`. A time is
actionable; a millimetre total is trivia.

### When the On the water card appears

Both conditions must hold:

- **There is time to act on it** — a non-school day, or a weekday after 15:30.
- **The conditions gates clear**, per the section above.

Otherwise the card is absent entirely. Not collapsed, not greyed, not a
placeholder — absent, and the kids' blocks take the space. Same rule as the
fridge's missing edit controls: an element that has nothing to say shouldn't
occupy the wall.

On a Saturday with poor conditions the card can still appear with a plain
conditions headline rather than a verdict — that's the honest version, and it
keeps the tide times visible, which were the most useful thing on it.

### Freshness applies to both

The line and the card read from the same store and the same `fetched_at`. If
the fetch is stale, both say so. They must never disagree — a line saying 24°
above a card built from a different fetch is the kind of small contradiction
that costs trust in everything else on the screen.

---

## Caching

Weather models update every 6 hours; the best-match endpoint varies by model.
There is no reason for the fridge to hit Open-Meteo on render.

- Fetch on a schedule — hourly is generous — and persist the result with a
  `fetched_at`.
- The card reads from the store, never from the API.
- On fetch failure, render the last known values marked stale with their
  timestamp. Never a spinner, never a gap.
- Two endpoints means two failure modes: the card should still render the
  weather half if marine fails, and vice versa.

This also means the conditions card contributes nothing to the home screen
navigation lag in §1 of the review — worth confirming that's actually true of
the current implementation.

---

## Settled: SeaScore stays separate

**The logic is deliberately duplicated. Do not share a module with SeaScore,
and do not import from it.**

The two look similar because they call the same endpoints, but they answer
different questions for different people:

- **SeaScore** is one experienced adult deciding whether to cross a bar and go
  offshore. Being wrong is dangerous. It can afford to be conservative, and it
  can assume the reader understands period, swell direction and what a
  forecast doesn't cover.
- **Family Hub** is a household — including two kids — deciding whether this
  afternoon is worth going down to the water. Being wrong means a dull hour.
  It has to be readable at a metre by an eleven-year-old.

The thresholds genuinely differ: conditions that are an easy yes for a tinny
after lunch inside the river can be a clear no offshore. A shared module would
either force one threshold vocabulary onto both, or grow a configuration layer
that is more code than the duplication it avoids. It would also couple two
independently deployed apps, so a SeaScore change could silently alter what
the fridge says.

Accepted costs, stated so nobody rediscovers them as bugs: the Open-Meteo
request is written twice, and an improvement to one does not reach the other.
That's the trade, and it's the right one.

The only thing worth copying across is knowledge rather than code — if
SeaScore has already learned which model performs best for this stretch of
coast, reuse the finding, not the file.
