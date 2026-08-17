# PoolClubs — Go-to-Market Audit & Roadmap

## Context

The product is feature-complete for a pool club's *internal* life: Elo + daily rankings, matches (singles/doubles, 8/9/10-ball), challenges, three real tournament formats with brackets and walkovers, a drill library with a diagram editor, auto-generated training plans, an activity feed with reactions/comments, a public directory with a map, sitemap/robots, PWA, i18n EN/ES/FR, RLS-enforced multi-tenancy. 42 routes. Zero TODO markers.

What is missing is not product. It is everything around the product: the pitch, the beta instrumentation, the legal floor, and the billing rail.

**Goal:** pitch local clubs in person → sign them as free beta testers → later charge the club (players always free, positioned as a service the club gives its members).

**Decisions taken (2026-08-17):**
- Beta clubs are **grandfathered free forever**, publicly stated. Ship the flag now.
- Pitch with a **seeded demo club**, not screenshots.
- Roadmap covers all three phases.

---

## The gap list

### Pages that do not exist
~~`/pricing` · `/about` · `/contact` · `/legal/privacy` · `/legal/terms` · `/legal/aviso-legal` · a printable invite/QR poster · an operator dashboard across clubs.~~ · `/changelog` — **dropped, not wanted.**

**Shipped 2026-08-17.** Copy lives in `src/content/{pages,legal}.ts` (three languages each), rendered by `src/pages/public/ProsePage.tsx`; the poster is `/app/$clubSlug/invite/print` and ships with join-code rotation (A4 closed); the operator dashboard is `/app/ops`, gated by `is_drill_admin()`.

Two things are still open on them:
- **`OPERATOR` in `src/content/legal.ts` is placeholders** — real name, NIF and postal address. The aviso legal is not lawful until they are filled, and `CONTACT_EMAIL` (`hola@poolclubs.app`) must be a mailbox somebody reads.
- **`sql/operator-dashboard.sql` has not been applied.** `npm run db:sql sql/operator-dashboard.sql`, then `npm run db:dump && npm run db:types`; until then `/app/ops` shows its "has the SQL been applied?" state, and the narrow `rpc` cast in `src/queries/operator.ts` can come out afterwards.

### Features that do not exist
Password reset · match backdating (`played_at`) · co-admins / ownership transfer / delete-club / leave-club · data export (CSV) · account deletion · transactional & digest email · analytics of any kind · error monitoring · in-app feedback · payments · dynamic OG images · JSON-LD structured data · venue fields (phone, website, hours, description) · invite-code rotation · onboarding checklist.

### Broken promises already live
- **OG images 404.** `src/libs/publicMeta.ts:16-25` points at `/og/*.png`; `public/og/` does not exist. Every WhatsApp share of this product currently renders a blank card — on the channel that *is* your distribution.
- **`landing.a3`** promises loading "whatever matches you want to load" from previous years. `games` has only `created_at`. The schema cannot keep that promise.
- **`landing.a1`**: *"There is no paid plan, no trial that expires and no card to hand over."* True today, and with grandfathering it stays true for the beta cohort — but the sentence must be reframed before the sixth club signs up.

### Marketing-psychology read on the current landing
It is already good — segment-specific "Today / With PoolClubs" contrast, a 4-step start, an FAQ handling objections. What it lacks:
- **No social proof.** Zero. No club logos, no counts, no testimonial. This is the single biggest conversion lever and it stays empty until beta clubs exist — which is exactly why the beta is the marketing plan.
- **No authority signal.** "Designed by people who have run tournaments" is buried in a feature body; it belongs near the hero.
- **No risk reversal made concrete.** "If it does not win you over, you have lost nothing" is the right instinct (regret aversion) but abstract. "Export everything, any time" makes it real — and needs B7 to be true.
- **No reciprocity asset.** Nothing to hand over before asking for signup. The public drill library already *is* that asset; it is not framed as one.

---

## Phase A — before the first pitch

Ordered. A1 is not negotiable.

| # | Item | Effort | Where |
|---|---|---|---|
| A1 | **Seeded demo club** — ~20 members (Spanish names), ~200 games over 3 months, one completed tournament with a real bracket, drill logs, feed reactions. Real rows, owned by your account, `is_public = true`. No fake session mode. | M | `sql/demo-club.sql`, following the `sql/drills-seed-*.sql` pattern. Renders through existing `/clubs/$slug`. |
| A2 | **The five OG images**, 1200×630. | S | `public/og/{default,clubs,players,tournaments,drills}.png` |
| A3 | **Password reset** — `resetPasswordForEmail` + `updateUser` server fns, `/app/reset` route, callback handling, "forgot?" link, ~6 keys × 3 dictionaries. | S/M | [auth.functions.ts](src/libs/auth.functions.ts), [LoginPage.tsx](src/pages/app/LoginPage.tsx), [callback.ts](src/routes/auth/callback.ts) |
| A4 | **QR poster + join-code rotation** — QR generation, a print route, and a "regenerate code" action. Rotation ships in the same PR: once the code is on a wall it must be revocable. The existing `pending` approval gate makes a public QR safe. | M | new `/app/_authed/$clubSlug/invite/print`, [ClubPage.tsx](src/pages/app/ClubPage.tsx) |
| A5 | **`played_at` on games** — `timestamptz not null default now()`, backfilled from `created_at`, indexed `(club_id, played_at desc)`. Rewire ordering/filters and Elo chronology; date input on the add-game form. | M | `sql/game-played-at.sql`, [games.ts](src/queries/games.ts), [useEloRanking.ts](src/hooks/useEloRanking.ts), [AddGamePage.tsx](src/pages/app/AddGamePage.tsx) |
| A6 | **Legal pages + a contact route** — privacy, terms, aviso legal. Linked from the footer and the signup form. | M (drafting) | new `_public/legal/*`, [PublicShell.tsx](src/components/layout/PublicShell.tsx) |
| A7 | **Explicit publication choice** — flip `people.is_public` default to `false` or force a toggle at join. | S | `sql/schema.sql:807-816`, [JoinClubPage.tsx](src/pages/app/JoinClubPage.tsx) |
| A8 | **Venue fields + JSON-LD** — `phone`, `website`, `hours`, `description` on `clubs`; `SportsClub` / `SportsActivityLocation` + `BreadcrumbList` markup on all four public detail pages. Ship as one unit. | M | `sql/schema.sql`, new `src/libs/structuredData.ts`, [publicMeta.ts](src/libs/publicMeta.ts), [PublicClubPage.tsx](src/pages/public/PublicClubPage.tsx) |
| A9 | **Onboarding checklist** — derived from existing queries: add 5 players → print the QR → record a match → open a tournament. Goal-gradient: the gap between handshake and first real use is where beta clubs die silently. | M | [ClubOnboardingPage.tsx](src/pages/app/ClubOnboardingPage.tsx) / club dashboard |
| A10 | **`clubs.grandfathered boolean default false`**, set true for every beta club as it signs. Costs nothing now, is impossible to retrofit fairly later. | S | `sql/schema.sql` |

**Why A1 outranks everything:** the pitch is "this is your club in six weeks," not "here is an empty form." An empty demo is the most common way a self-built product loses the room. Availability heuristic — the owner has to *see* the outcome to believe it is reachable.

**Why A5 is a sales feature, not a data feature:** it converts the pitch from "start from zero" to "bring your notebook and we'll load last season tonight." That makes the club's existing history the reason to adopt rather than the reason to hesitate — sunk cost working *for* you instead of against you.

**Why A8 matters to the owner selfishly:** "you also get a page that shows up when someone searches for a pool hall in your city" is a benefit an owner values without understanding Elo.

**Not Phase A:** Stripe, push, service worker, co-admins, test runner, storage bucket, search indexes, analytics, `/about`, blog. None of them move a club owner across the table.

---

## Phase B — run the beta well

Cheapest-learning-first. B5 is the big one and is deliberately not first.

| # | Item | Effort | Note |
|---|---|---|---|
| B1 | **Error monitoring** — wire into `__root.tsx`'s `errorComponent` + a global handler. | S | Beta without telemetry is hoping. Any US-hosted provider is a sub-processor: DPA + privacy-policy line. |
| B2 | **Cookieless usage events** — EU-hosted Plausible/Umami, or an `events` table written by a server fn. Stay cookieless or you inherit a consent-banner obligation you do not currently have. | M | Proving value needs matches/club/week and days-since-last-match, not vibes. |
| B3 | **Operator health dashboard** — every club with member count, last match date, matches/week trend. Gate it the way global drill admin already is. Depends on A5. | S | The anti-silent-churn instrument: 14 days quiet is a phone call, not a churn you find at renewal. |
| B4 | **In-app feedback** — a `feedback` table + a button in the shell. | S | Beta clubs never email. They grumble at the bar and stop. |
| B5 | **Transactional + weekly digest email** — provider, templates × 3 languages, `notification_prefs`, token-based one-click unsubscribe. | L | The bell is localStorage-derived, so it only reaches members who already open the app — the opposite of the member who is churning. Consent + working unsubscribe are non-optional. |
| B6 | **Co-admins** — `club_admins` table (or `players.role`); `is_club_admin()` consults it, `owner_id` stays the billing/legal contact. | M | The man who signs up is rarely the man who runs league night. Today he hands over his password. **Hard dependency for Phase C.** |
| B7 | **Export, access, deletion** — CSV export for games/players/tournaments; deletion implemented as **anonymisation, not cascade**. | M | Legally required, and simultaneously the best answer to the lock-in objection a club committee raises. Deleting a person would corrupt other members' match history — that is *their* data. |
| B8 | **Real test runner** — migrate `bracket/dailyScore/leagueTable/scoreBand` `*.check.ts` to vitest. | S/M | A wrong Elo is the fastest way to lose a club's trust. Do it when the first regression bites. |
| B9 | **Storage bucket for avatars/logos** — currently base64 in TEXT, loaded on every list query, and `publicMeta.ts` skips `data:` URIs entirely. | M | Prerequisite for B10. |
| B10 | **Dynamic OG images** per club/player/tournament. | M | A club sharing its finished bracket into WhatsApp with a real card is free, compounding distribution among exactly the right people. |
| B11 | **Search indexes** — `pg_trgm` GIN on `people.name`, `clubs.name/city`, drill titles. | S | Ship when `/search` feels slow, not before. |
| B12 | ~~**Changelog**~~ | — | Dropped 2026-08-17. Built and removed the same day: the retention argument does not outweigh a page somebody has to keep writing. Skip the blog too. |
| B13 | **Harvest social proof** — club logos on the landing, one quoted owner, live club/match counts. Add as beta clubs land. | S | The single biggest empty lever on the current landing page. |

---

## Phase C — switch on billing

### C0 — the dependency wall (nothing ships without all of it)

| Item | Effort |
|---|---|
| Legal entity able to invoice (autónomo/SL), VAT handling — **not code, this is the real gate** | — |
| Co-admins + ownership transfer + named billing contact (extends B6) | M |
| `club_subscriptions` — `status, plan, stripe_customer_id, stripe_subscription_id, current_period_end, trial_ends_at` | S |
| **One** entitlement check — a `club_plan(cid)` SQL fn + one `useEntitlement` hook. Design before writing a line of Stripe, or gating leaks into 42 routes. | S |
| `src/libs/supabase.admin.ts` service-role client — server-only, never client-reachable. First of its kind in this repo. | S |

### C1 — Stripe (L)
Checkout Session + Billing Portal + webhook route with signature verification and idempotency. Stripe Tax on; collect VAT/NIF at checkout. **Do not build** card forms, your own invoices, dunning, or tax logic — Spain's anti-fraud invoicing rules make self-issued invoices a compliance project of their own.

### C2 — Pricing page + landing rewrite (M)
`/pricing` under `_public`; rewrite `landing.q1/a1` in all three dictionaries. Structure:
- **One price, per club, per month.** No seats, no metering, no annual toggle, no tiers. Every extra dimension multiplies the entitlement surface before you know whether anyone pays.
- Anchor against the alternative the owner already knows: *"less than one night's table time."* Mental accounting beats a bare number.
- State the grandfathering publicly: *"The clubs that tested this keep it free, forever."* That sentence is a trust asset for every club that reads it afterwards, not a cost.

### C3 — Lapsed-club behaviour (M)
**Read-only. Never delete, never unpublish the public page.** A club that loses access to its own season records tells every other club in the province — and in a market you sell in person, that is the only channel that matters.

### C4 — Paid terms + DPA (M)
Subscription terms, withdrawal rights, and an art. 28 Data Processing Agreement offered to every club: you process members' data on the club's behalf, which makes you a processor.

### C5/C6 — Dunning banner (S) · Stripe Billing Portal deep-link in club settings (S)

---

## Dependency graph

```
A5 played_at ─────────► B3 health dashboard, B2 metrics
A4 QR poster ─────────► join-code rotation (same PR)
A6 legal ─────────────► first non-you signup (BLOCKING)
A7 is_public default ─► every member who joins during beta
A10 grandfathered ────► C2 pricing page credibility
B9 storage ───────────► B10 dynamic OG
B6 co-admins ─────────► C0 billing contact ──► C1 Stripe
C0 entitlement fn ────► C1, C3
B2 usage data ────────► C2 pricing decision
B13 social proof ─────► landing conversion (currently empty)
```

---

## Traps — do not build

| Item | Verdict |
|---|---|
| Push notifications + service worker | Phase C at the earliest, arguably never. B5's email does the job for a fraction of the cost. |
| Native apps | No. PWA + QR poster is the whole distribution story. |
| Cross-club global ranking | Elo across differently-calibrated clubs compares nothing. Nobody has asked. |
| Live at-the-table scoring | Large build, tiny delta over recording the result afterwards. |
| Video/media uploads | Needs B9 first. A base64 approach here would be catastrophic. |
| De-hardcoding drill admin (`players.id = 1`) | Ugly, works, nobody pays for it. |
| More languages | es/en/fr already exceeds the addressable market. |
| Any redesign | The public revamp v2 already shipped. Stop. |

---

## EU / Spain compliance — non-optional

1. **Privacy policy** at point of collection (GDPR 13–14) — before the first real signup.
2. **Aviso legal** with identity and contact (LSSI-CE art. 10) — required of any information-society service offered from Spain.
3. **Cookies:** currently only strictly-necessary (auth session, theme, lang), so **no consent banner is required today**. Say so on the cookie page, and treat adding any cookie-based analytics as the decision that creates the banner obligation.
4. **Lawful basis:** contract for the service; consent for digest email (B5) with one-click unsubscribe.
5. **Data subject rights** (B7). Erasure = anonymisation, because match records are jointly other people's data. Document the reasoning in the policy.
6. **You are a processor** for club member data → art. 28 DPA per club (C4), plus a published sub-processor list (Supabase, Netlify, Google OAuth, Stripe, email, error monitoring) with hosting regions. **Check the Supabase project region** — an EU region removes an entire transfer-assessment problem.
7. **Default-public publication of names and photos** — fixed by A7.
8. **Minors:** pool clubs have juniors. Cheapest defensible beta posture — terms require 16+, juniors recorded as guest players by the admin with no account and no email, which `add_guest_player()` already supports. State it in the terms.
9. **Art. 30 record of processing** — a document, not code, but required.

> These legal points are stated from model knowledge; no sources were fetched. Verify with a Spanish adviser before publishing or signing anything. You own the published content.

---

## Verification

- **A1:** `npm run dev`, open `/clubs` → demo club appears on the map and in the list; `/clubs/<demo-slug>` shows a populated ranking, a finished bracket and recent results. Then hand a phone to someone who has never seen the app and watch where they stall.
- **A2:** paste a `/clubs/<slug>` URL into a WhatsApp chat with yourself — the card must render an image.
- **A3:** sign up a throwaway address, reset the password end to end, sign in with the new one.
- **A5:** record a match dated last month, confirm it lands in the right position in history *and* that the Elo recalculates in chronological order, not insertion order. This is the riskiest change in Phase A — read the diff.
- **A8:** run the public club URL through Google's Rich Results Test.
- **General:** `npm run check` must stay green (note: `avatarImage.check.ts` currently fails on a Node loader issue — fix or excise it before it masks a real failure).
- **C1:** Stripe test-mode checkout → webhook → `club_subscriptions` row → entitlement flips. The webhook is the first service-role code in the repo; read every line.
