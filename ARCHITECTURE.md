# Architecture & tech stack

What PoolClubs is built with, and where each piece lives. For how the parts
fit together (URL-owned clubs, server-side auth, loaders), see the
"How it fits together" section of the [README](README.md).

## At a glance

| Layer        | Choice                                                     |
| ------------ | ---------------------------------------------------------- |
| Framework    | TanStack Start (React 19 + Vite 8, server-rendered)        |
| Routing      | TanStack Router, file-based, in `src/routes/`              |
| Data & cache | TanStack Query, `queryOptions` factories in `src/queries/` |
| Backend      | Supabase: Postgres, Auth, Realtime, Storage                |
| Styling      | Tailwind CSS 4                                             |
| Forms        | react-hook-form + zod                                      |
| Language     | TypeScript, strict                                         |
| Hosting      | Netlify (SSR function + one scheduled function)            |
| Email        | Resend, plus Supabase's own auth emails                    |
| Push         | Web Push (VAPID) via `web-push`                            |
| Video        | YouTube Data API v3 + OBS                                  |
| Tests        | Vitest + Testing Library, jsdom                            |
| CI           | GitHub Actions                                             |

## Frontend

- **React 19** on **TanStack Start**. Every page is server-rendered first,
  then hydrated. Anything that reads `window`, `localStorage` or the current
  date during render also runs on the server, so theme and language live in
  cookies ([`src/libs/prefs.ts`](src/libs/prefs.ts)).
- **TanStack Router**, file-based. `src/routes/_public/` holds the public site
  (landing, club directory, public club and player pages, tournaments, drills,
  legal). `src/routes/app/` holds the signed-in app, under `/app/$clubSlug/…`.
  `src/routes/overlay/` holds the OBS overlays. `routeTree.gen.ts` is
  generated, so don't edit it.
- **TanStack Query** for the client cache. Route loaders and components share
  one `queryOptions` factory per fetch, so they share a cache key. Keys are
  built in [`src/libs/queryKeys.ts`](src/libs/queryKeys.ts).
- **Tailwind 4** through `@tailwindcss/vite`. Tokens and per-club accent
  colours are in [`src/libs/theme/`](src/libs/theme/). Fonts are
  self-hosted through Fontsource (DM Sans, Geist Mono).
- **Pages vs. components.** Route files stay thin and render a page from
  `src/pages/`. Shared UI is in `src/components/`, grouped by feature, one
  component per file.
- **Smaller libraries:**
  - `react-icons` for icons
  - `react-toastify` for toasts
  - `recharts` for stats charts
  - `maplibre-gl` + `react-map-gl` for the club map
  - `uqr` for QR codes on printable invites
  - `flag-icons` for country flags

## Backend: Supabase

- **Postgres** is the whole backend. There is no separate API server.
  Row-level security (RLS) is the security boundary, so the anon key is
  public by design.
- **Clients** are in [`src/libs/supabase/`](src/libs/supabase/):
  - `browser.ts` for the client side
  - `server.ts` for server functions, reading the session cookie
  - `serviceRole.ts` for server code that must bypass RLS, such as the YouTube
    reconciler. It is never imported into the client.
- **Auth** is Supabase Auth: email + password and Google OAuth. Sign-in,
  sign-up and sign-out run as server functions in
  [`src/libs/server/auth.functions.ts`](src/libs/server/auth.functions.ts).
  The session lives in httpOnly cookies set through `@supabase/ssr`. Auth email
  templates are in `supabase/templates/`.
- **Realtime** keeps live scoreboards, comments and reactions in sync. It
  patches the Query cache directly instead of refetching
  ([`src/libs/browser/realtime.ts`](src/libs/browser/realtime.ts)).
- **Storage** holds avatars, club logos and venue photos. They are resized in
  the browser before upload (`src/libs/browser/*Image.ts`).
- **Schema** is in [`sql/schema.sql`](sql/schema.sql), and migrations are
  applied by hand; see [`sql/README.md`](sql/README.md). After a change, run
  `npm run db:dump && npm run db:types` to regenerate
  `src/types/database.types.gen.ts`.

## Server code

All server-only code is in [`src/libs/server/`](src/libs/server/), as
TanStack Start server functions (`*.functions.ts`) or plain modules they call:

| File                   | Does                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `auth.functions.ts`    | sign-in, sign-up, sign-out, Google OAuth round trip           |
| `mail.functions.ts`    | transactional email through Resend (`resend.ts`)              |
| `push.functions.ts`    | web push to subscribed devices                                |
| `youtube*.ts`          | YouTube OAuth, stream creation, broadcast control             |
| `cardImage.ts`         | OG share images, drawn with `pureimage` (no headless browser) |
| `geocode.functions.ts` | address search via Photon, for club locations                 |
| `crypto.ts`            | AES-256-GCM for YouTube tokens and stream keys at rest        |

Server HTTP endpoints are in `src/routes/api/`: the OG images (`og/`), the
YouTube OAuth connect/callback (`youtube/`), and per-club files (`clubs/$slug/`:
the club logo and the OBS scene collection download).

## Hosting: Netlify

- `@netlify/vite-plugin-tanstack-start` builds the SSR app into a Netlify
  function. Static assets are served from `dist/client` with immutable caching.
- **Scheduled function:**
  [`netlify/functions/youtube-reconcile.mts`](netlify/functions/youtube-reconcile.mts)
  runs every minute. It starts and stops each table's YouTube broadcast to
  match whether a match is on, and emails players when their recording is up.
  Netlify bundles it on its own, outside Vite, so it uses relative imports
  instead of the `@/` alias.
- Environment variables are listed in `.env.example`. Only `VITE_*` values
  reach the browser bundle. Secrets (VAPID private key, YouTube client secret,
  token encryption key, service-role key) never carry that prefix.

## Streaming

- Each club links its own YouTube channel with Google OAuth. Each table has a
  camera URL and its own stream.
- OBS does the actual encoding. The app provides the rest:
  - score overlays, as browser sources (`/overlay/…`)
  - an OBS dock page for running matches from inside OBS
  - a generated scene collection
    ([`src/libs/algorithms/obsSceneCollection.ts`](src/libs/algorithms/obsSceneCollection.ts))
  - `find-cameras` scripts in `public/` to find the table cameras on the
    club's network

## Languages

Spanish is the source language, with English and French too. The dictionaries
are flat JSON in [`src/i18n/`](src/i18n/), with a small in-house lookup and
no i18n library. Keys are typed from `es.json`, so a missing or mistyped key is
a build error. Transactional emails are Spanish only; see
[`src/libs/algorithms/mailText.ts`](src/libs/algorithms/mailText.ts).

## Pure logic

[`src/libs/algorithms/`](src/libs/algorithms/) holds framework-free logic,
tested with Vitest next to each file: brackets, league tables, rankings, stream
sessions, broadcast titles and feature flags. New logic that doesn't need React
or Supabase goes here.

## Tooling

- **Node** version is set in `.nvmrc`. npm is the package manager.
- `npm run lint` runs ESLint 10 with typescript-eslint and the React hooks
  plugin. `npm run format` runs Prettier.
- `npm run test` runs Vitest (jsdom + Testing Library).
- `npm run build` runs `vite build`, then `tsc --noEmit`.
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint,
  tests and both typechecks on pushes to `main` and on pull requests. A second workflow pings Supabase
  twice a week so the project isn't paused for inactivity.
- **Scripts** in `scripts/`:
  - `npm run screenshots` (Playwright) regenerates the README screenshots
  - `npm run clubs:es` seeds the Spanish club directory
- Analytics is the Cloudflare Web Analytics beacon (`VITE_CF_BEACON_TOKEN`).
  It is off when the token is unset.
