# 🎱 PoolClubs

> The ultimate social network and practice companion for pool enthusiasts.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Live:** [poolclubs.app](https://poolclubs.app)

Forked from [aluzed/vite-react-ts-supabase](https://github.com/aluzed/vite-react-ts-supabase).

---

## 🌟 Overview

**PoolClubs** brings pool players together on a single platform. Whether you want to practice targeted drills, challenge local players to matches, climb competitive rankings, or build a thriving community at your local pool hall, PoolClubs gives you the tools to elevate your game and stay connected.

---

## ✨ Key Features

### 🎯 Practice & Drills _(built, currently hidden behind a feature flag — see `src/libs/features.ts`)_

- **Drill Library:** Create, customize, and browse pool drills (position play, safety shots, cue ball control, and breaking).
- **Track Results:** Log shot attempts, completion times, success percentages, and personal bests.
- **Progress Analytics:** Monitor skill improvement over time with detailed performance stats.

### 🏆 Clubs & Communities

- **Create & Join Clubs:** Form local leagues, venue clubs, or online training groups.
- **Club Roster & Wall:** Share announcements, view active members, and track internal club rankings.

### ⚔️ Match Challenges & Rankings

- **Direct Challenges:** Challenge other players to matches (8-Ball, 9-Ball, 10-Ball, Straight Pool, etc.).
- **Competitive Leaderboards:** Skill-based ranking system (ELO / handicap system) to see where you stand within a club.
- **Match Logging:** Track scores, match history, and head-to-head records.

### 💬 Social Feed & Interactions

- **Activity Feed:** Share match results and drill achievements with your club.
- **Reactions & Comments:** Like, react, and comment on friend and club activity.

---

## 🛠 Running it

Requires Node ≥ 22.6 (see `.nvmrc`). Docker + the
[Supabase CLI](https://supabase.com/docs/guides/cli) are needed for
`db:dump` / `db:types` (see `sql/README.md`).

```bash
npm install
npm run dev      # SSR dev server on :3000
npm run build    # vite build, then a typecheck
npm run lint
npm run test     # Vitest
```

Copy `.env.example` to `.env`. It needs `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. Both are public by design; RLS is the security
boundary, not the key.

Web push adds `VITE_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` — `npx web-push
generate-vapid-keys` makes a pair. Only the public half is prefixed, because
Vite inlines every `VITE_*` into the client bundle and the signing key must not
go there. Without them the feature switches itself off rather than breaking.

## 🧱 How it fits together

**TanStack Start** (React + Vite, server-rendered) with **file-based routes** in
[`src/routes/`](src/routes/), **Supabase** for data and auth, **TanStack Query**
for the client cache, **Tailwind 4** for styling. Deployed to Netlify.

A few things worth knowing before changing it:

- **The URL owns the club.** Every page a member uses lives under
  `/app/$clubSlug/…`, and the slug is resolved against the memberships the
  session already carries — a club you are not in reads as not-found. Links are
  written as route patterns (`to="/app/$clubSlug/players/$playerId"`), so a typo
  is a build error. [`AppLink`](src/components/layout/AppLink.tsx) fills the club in.
- **Auth is server-side.** Sign-in, sign-up, sign-out and the Google round trip
  are server functions in [`src/libs/auth.functions.ts`](src/libs/auth.functions.ts);
  the session lives in httpOnly cookies that both the server and the browser
  client read. `beforeLoad` turns unauthorised requests away before any loader
  runs.
- **Initial data comes from route loaders.** Each fetch is a `queryOptions`
  factory in [`src/queries/`](src/queries/), used by both the route's loader and
  the component's hook, so they share one cache key. Filters that a loader keys
  on (games paging, drill filters, the daily ranking's date) live in the URL, not
  in `useState`.
- **Anything that touches `window`, `localStorage` or `new Date()` during render
  runs on the server too.** Theme and language are cookies for that reason;
  see [`src/libs/prefs.ts`](src/libs/prefs.ts).
- **SQL is applied by hand.** See [`sql/README.md`](sql/README.md) — write the
  migration, run it, then `npm run db:dump && npm run db:types`.
