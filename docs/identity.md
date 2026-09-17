# Family Hub — Identity & Device Pairing

**Status:** built. `person_device`, `pairing_code` and `app_state` are in
`schema.sql`; `lib/identity.js`, `middleware.js` and the `/api/pair/*` routes
implement the flow below.
**Last updated:** 13 September 2026

Not a module. Infrastructure, closer to `lib/week.js` than to the meal planner
— a table, two routes, one screen and a middleware helper. Roughly 200 lines.

**⚠ This document amends §5 of `family-hub-design-brief.md`**, which specifies
one-time emailed magic links. That approach breaks on iOS. Paste-ready
replacement wording is at the foot of this document.

---

## Two tiers, and one is much cheaper

Worth separating, because they're needed at different times and only one is
urgent.

**Device role — is this the fridge or a phone?** One flag, set once on the
iPad, no person involved. It gates the read-only rule, the no-edit-affordances
rule, the meal planner's write gate and the 60-second return-to-dashboard
behaviour. Every screen in the product has been designed with a fridge variant
and a phone variant, and none of that is enforceable without this.

**Person identity — whose phone is this?** Needed for person pages, goals,
chore attribution, review-queue approvals, Q&A gating and discovery ownership.
This is the part that needs pairing codes.

Build both together; they share a table and a cookie. But if one has to slip,
it is not the first.

---

## ⚠ Why not magic links

§5 specifies a one-time link sent by email. On iOS this fails in a way that
looks like a bug and isn't.

An installed home-screen PWA has its own storage container, separate from
Safari. A link opened from Mail opens in Safari, the session cookie lands
there, and the installed app stays logged out. Every workaround is fiddly and
none is reliable across iOS versions.

There are four people in this household and they are all in the same kitchen.
Magic links solve remote onboarding, which is not a problem this product has.

**Use a pairing code instead.** Install the PWA first, then pair it from a
device that is already trusted. No email round trip, no storage isolation
problem, and it works identically on iOS, Android and desktop.

---

## The pairing flow

1. The person installs the PWA to their home screen and opens it.
2. Unpaired, it shows one screen: *"Ask Matt or Renée to pair this device."*
   Nothing else. No login form, no email field.
3. On an already-paired adult phone: *Settings → Pair a device → Rose.*
   A six-digit code appears, valid for ten minutes, single use.
4. The new device enters the code. The server issues a session and sets a
   cookie. The device is now Rose's.

**The code carries the identity.** Matt generates a code *for Rose*; the device
redeeming it becomes Rose's device. A device never claims an identity for
itself, which removes the only interesting attack and also the only interesting
mistake.

### Bootstrap

The first device has no paired adult to issue a code. A `SETUP_TOKEN` env var
claims the first adult identity, once. A `bootstrap_complete` flag is set on
first use and the token is inert thereafter. Rotating the env var does not
re-enable it — clearing the flag does, deliberately.

### The fridge

Paired the same way, choosing *This is the fridge* rather than a person. It
receives `role = display` and no person.

- The display session never expires. The iPad is always on, always powered, and
  a logged-out fridge is a dead appliance.
- **No re-pair or switch-device affordance renders on `role=display`.** Same
  rule as everywhere else: a control that can never legitimately be used on the
  wall is worse than an absent one. Re-pairing the fridge means visiting a URL
  with a fresh code, deliberately, which is a five-minute job done once.
- A display session can never become a person session. The role is fixed at
  pairing; changing it requires re-pairing.

---

## Cookie rules

- **Set from the server with `Set-Cookie`.** Not `document.cookie`, not
  localStorage, not IndexedDB.
- `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age` one year.
- The value is 32 random bytes, base64url. Stored **hashed** in
  `person_device`; the plaintext exists only in the cookie.
- **Re-issue the cookie on any request where it is more than seven days old.**
  Sliding expiry, so an active device never expires.

**The reason this matters more than it looks:** Safari's Intelligent Tracking
Prevention caps script-writable storage at seven days of inactivity. A session
held in localStorage or written with `document.cookie` will log Tom out roughly
weekly, and he will stop opening the app. A cookie set by the server on a
first-party navigation is not subject to that cap.

### Code handling

- Six digits, ten-minute expiry, single use, stored hashed.
- Five wrong attempts burns the code.
- Rate-limit redemption by IP: ten attempts an hour.
- Codes are invalidated when a new one is issued for the same person.

---

## Roles and capabilities

Mirrors §5, with Rose's assignment write added per §7.11.

| Role | Person | Can write |
|---|---|---|
| `display` | none | Chore ticks. Meal planner nights. Nothing else. |
| `adult` | Matt | Everything |
| `adult` | Renée | Everything except the operations register |
| `child` | Rose | Her goals, her assignments, her chore ticks, holiday ideas, her own discovery settings |
| `child` | Tom | His goals, his assignments, his chore ticks, holiday ideas, his own discovery settings |

Enforce in the route handler, reading the cookie server-side. Never in the
component. A UI that hides a control is a courtesy; the route is the rule.

### Q&A gating

`role = 'adult'` **and** not `display`. Returns 403 otherwise, before any
retrieval runs.

**This gate is the actual boundary, not UI decoration.** The search index
holds `pastoral_record` rows unfiltered — Matt's call, on the basis that
nothing landing in school mail so far is sensitive enough to warrant excluding
it, revisited if that changes. Since nothing backs the gate up at the index
level, the route check is what keeps pastoral content off a child's phone or
the fridge, not a courtesy on top of a stronger guarantee. See the ingestion
brief.

---

## The honest limit

**A cookie identifies a browser, not a person.** If Rose picks up Matt's
unlocked phone, she is Matt.

This is a social model, not a security one, and that is the right call: the
real gate is Face ID on the device, which is stronger than anything this PWA
could add. Never label any of it as protection. The avatar layer stops a
sibling idly reading your goals; it does not stop a determined one.

The design consequence, everywhere else, is that no surface may hold something
whose exposure would be genuinely damaging — chore ticks and goals stay
harmless under a weak identity model precisely because nothing sensitive sits
behind them. **Q&A is the one deliberate exception.** `pastoral_record`
content sits in the index behind the role gate alone, on the judgement that
school mail hasn't carried anything genuinely damaging so far. If that stops
being true, the fix is the same one used everywhere else: pull the sensitive
content back out of reach rather than lean harder on the gate. See
`docs/family-hub-gmail-ingestion-brief.md`.

---

## Supersedes the existing role cookie

`middleware.js`, `lib/role.js` and the `fh_role` cookie (`'display'` /
`'person'`, set unauthenticated via `/?role=display`) are the entire identity
system today. This brief replaces them — `person_device` carries role and
person, not just role, and pairing replaces a URL query param. `getRole()` and
its one caller (`app/api/planner/route.js`) move onto the new cookie rather
than running alongside it. `docs/DECISIONS.md`'s "Access and writes" note that
future writes gate on the `fh_role` cookie is superseded accordingly.

---

## Data model

```
person_device
  id
  person          text                  -- null when role = 'display'
  role            text not null         -- 'adult' | 'child' | 'display'
  token_hash      text not null unique  -- sha256 of the cookie value
  label           text                  -- "Rose's iPhone", "Fridge iPad"
  created_at      timestamptz not null default now()
  last_seen_at    timestamptz
  revoked_at      timestamptz

pairing_code
  id
  code_hash       text not null
  person          text                  -- null for a display pairing
  role            text not null
  issued_by       text not null         -- the adult who generated it
  attempts        int not null default 0
  expires_at      timestamptz not null
  redeemed_at     timestamptz

app_state
  key             text primary key      -- 'bootstrap_complete'
  value           jsonb
```

Notes:

- `person` is the same enum used everywhere else. No users table — §7.1 already
  settled that owners are a hardcoded enum, and this does not change it.
- Revocation is `revoked_at`, not a delete. A lost phone gets revoked from any
  adult device and the history survives.
- `last_seen_at` drives the sliding cookie re-issue and gives a plain device
  list: *Rose's iPhone, last seen 2 hours ago.*

---

## Rules that look arbitrary

- **The code carries the identity, the device never claims one.** Otherwise a
  device can pair as an adult by choosing to.
- **Sessions are re-issued, never refreshed by script.** Anything JavaScript
  writes, Safari expires in seven days.
- **The display session never expires and shows no pairing controls.**
- **Enforce in the route, not the component.** Hiding Q&A from a child's nav
  and leaving the endpoint open is not gating it.
- **Role is fixed at pairing.** No elevation path, no switch-user, no "act as."
  Four people, one kitchen — re-pair instead.
- **Kids never see a login.** Per §5. The unpaired screen asks for a parent; it
  does not ask for credentials.

---

## Acceptance checks

- [ ] A fresh install shows only "ask a parent to pair this device" — no form
- [ ] A code generated for Rose produces a device with `person = 'Rose'`,
      regardless of what the redeeming device asks for
- [ ] A code expires after ten minutes and after one successful use
- [ ] Five wrong attempts burns the code
- [ ] `SETUP_TOKEN` works exactly once; a second attempt fails with the flag set
- [ ] The session cookie is `httpOnly` and invisible to `document.cookie`
- [ ] A device idle for six weeks is still signed in on return
- [ ] `role=display` renders no pairing, re-pair or switch-device control
      anywhere
- [ ] A display session cannot be promoted to a person session
- [ ] The Q&A route returns 403 for `child` and for `display`, before retrieval
- [ ] Revoking a device from an adult phone signs it out on next request
- [ ] Every write route checks the role server-side, not just the UI

---

## Paste-ready: `DECISIONS.md`

**Devices are paired with a code, not an emailed link.**
An installed iOS PWA has its own storage container. A magic link opened from
Mail lands the session in Safari and the app stays logged out. Magic links
solve remote onboarding; four people in one kitchen do not have that problem.
An adult generates a six-digit code for a named person, and the device
redeeming it becomes that person's.

**The pairing code carries the identity; a device never claims one.**
Otherwise any device can pair itself as an adult.

**Sessions are server-set cookies, never script-written storage.**
Safari caps script-writable storage at seven days of inactivity. A child
logged out weekly stops using the app.

**Role is fixed at pairing. There is no switch-user.**
Re-pair instead. On `role=display` no pairing control renders at all.

**The identity model is social, not security.**
A cookie identifies a browser. An unlocked phone is its owner. The real gate is
Face ID. Q&A is the one deliberate exception to "keep damaging content out of
reach rather than gate it": `pastoral_record` rows are searchable, gated by
`role = 'adult'` alone, on the call that nothing in school mail so far
warrants stricter handling. Revisit if that stops being true.

---

## Paste-ready: §5 amendment

Replace the paragraph beginning *"Each person installs the PWA on their phone
and is identified by a one-time magic link…"* with:

> Each person installs the PWA on their phone and is paired by a six-digit code
> generated on an adult's device. No passwords, no email round trip. Kids never
> see a login — an unpaired device asks them to find a parent. The session is a
> server-set `httpOnly` cookie with a sliding one-year expiry. The fridge is
> paired once as `role=display`, holds no person, and never expires. See
> `docs/identity.md`.

---

## Open

- Whether Renée should be able to pair devices, or only Matt. She can write
  almost everything else; pairing is the one thing that creates access rather
  than content.
- Whether a device list needs to render anywhere, or whether revocation is
  rare enough to be a database job.
- Whether the fridge should show which person's view is open after an avatar
  tap. It returns to the dashboard after 60 seconds regardless, but a visible
  "viewing as Rose" may be worth it for the chore tick.
