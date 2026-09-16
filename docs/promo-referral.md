# Referral codes and win-back nudges

**Status:** planned, not started. Written 2026-09-15.
**Nothing in this document has been built.** No table, route, RPC or
scheduled function described here exists in the repo yet.

---

## Why this document exists

Today a club has exactly one door in: the club's own invite link/QR
(`InvitePrintPage`, `join_club` RPC), which puts a new signup straight into
the same `pending` membership queue as anyone who found the club any other
way. There is no way to tell *who* brought someone in, and no reward for
bringing them.

This document covers two related but separable features:

1. **Referral codes** — a member's own link, tracked, that earns a reward
   (free table time, a discount, a credit) when the person they brought in
   actually shows up and plays, not just when they sign up.
2. **Scheduled nudges** — a general mechanism for the app to reach out to a
   player on its own schedule rather than only in response to something they
   just did, starting with a win-back message to someone who has gone quiet.
   Referral rewards and win-back nudges share the same delivery machinery
   (email/push, sent by a scheduled job), which is why they are written up
   together.

Deliberately **not** a payments feature: every reward here is something a
club fulfils itself (comps a free hour, waves a fee) — no money moves
through PoolClubs, so none of the Stripe/PSD2/VAT machinery in
`tournament-payments.md` applies. That keeps this cheap to build and cheap
to reason about; if a club ever wants the reward to be a real stored-value
credit redeemable against a paid booking, that is a follow-on document, not
this one.

---

## What already exists (verified against the code, 2026-09-15)

| Fact | Where |
|---|---|
| One invite path per club today: a public join link/QR carrying only the club's `slug`, no per-member identity | `src/pages/app/InvitePrintPage.tsx`, `src/routes/app/join.$slug.tsx` |
| `join_club(p_slug, claim_player_id, display_name)` is the single RPC that turns a link visit into a `players` row (`status = 'pending'`) | `sql/schema.sql:727` |
| A person's identity (`people`) is already separate from their per-club membership (`players`) — one `people` row, one `players` row per club they belong to | `sql/schema.sql` (`people`, `players`) |
| No concept of "who invited whom" anywhere in the schema — grepped for `referr`, `invited_by`, `promo` — no hits | whole-repo search |
| Club-configurable reward text has no precedent field to copy (`clubs` has no free-form settings/JSON beyond `schedule`) | `sql/schema.sql:1630` (`clubs`) |
| Games are the only "did they actually play" signal that exists — `games` rows are written from `AddGamePage`/`LiveMatchPage`, one row per completed game, `club_id` + two `players.id` | `sql/schema.sql:1794` (`games`) |
| Web push is already wired end-to-end: VAPID keys, `push_subscriptions` (per **person**, not per club — `person_id` on the table), and `sendPush` server fn that resolves recipients via a `SECURITY DEFINER` `push_targets` function | `sql/schema.sql:1914`, `src/libs/server/push.functions.ts` |
| Transactional email is already wired: Resend (`src/libs/server/resend.ts`), text built in `src/libs/algorithms/mailText.ts`, sent from server functions (`mail.functions.ts`) — used today for account-confirmation mail, not yet for any lifecycle/marketing message | `src/libs/server/resend.ts`, `src/libs/algorithms/mailText.ts` |
| A scheduled job already exists and is the shape to copy: `netlify/functions/youtube-reconcile.mts`, a Netlify Scheduled Function running once a minute, using the **service-role** Supabase client (bypasses RLS on purpose — nobody is signed in when a cron fires), no-ops cleanly if its secrets aren't configured for the environment | `netlify/functions/youtube-reconcile.mts` |
| `push_subscriptions.lang` and the mail templates are already per-recipient localized (es/en/fr) — any nudge copy needs to go through `src/i18n/*.json` like everything else, not be hardcoded | `sql/schema.sql:1914`, `src/i18n/*.json` |

Because the scheduled-job pattern, the push pipeline and the email pipeline
all already exist, the new work is: a code column, a join-table linking
referrer to referred, a reward-state machine, and one new scheduled function
that queries for "quiet" players and sends what the existing pipelines
already know how to send.

---

## Referral codes

### Core decision: reward triggers on a played game, not on signup

A reward that fires the moment someone signs up is a reward for a fake
account. The only trustworthy signal already in the schema that someone
*actually showed up* is a row in `games` naming their `players.id`. Tying
the reward to that — first completed game, not first click — is what makes
this resistant to a member inviting themself from a second browser.

### Schema changes (sketched, not final)

- **`clubs`**: reward configuration. Simplest shape is two nullable columns
  rather than a new table, since a club has exactly one referral offer live
  at a time in the obvious version of this: `referral_reward_text` (free
  text the club writes, e.g. "30 min free table time" — same pattern as
  today's free-text `tournaments.entry_fee`, deliberately not structured
  because the reward is fulfilled by a human at the club, not charged by the
  app) and `referral_reward_active` (boolean — a club can turn the whole
  program off without deleting its history).
- **`players`**: add `referred_by_player_id` (nullable, self-referencing FK
  to `players.id`, same club only — a referral is a club-scoped relationship
  even though identity is cross-club). Set once, at `join_club` time, never
  changed after.
- **`join_club`**: gains an optional `p_ref` parameter (the referrer's
  short code, not their raw `players.id` — see below). Resolves it to a
  `players.id` inside the same club being joined and stores it on the new
  row. An unresolvable or missing code is not an error — it just means no
  referrer, same as today.
- **A short code, not a raw id, in the URL.** `players.id` is a sequential
  bigint; putting it directly in a shareable link lets anyone guess
  neighbouring ids and attribute a signup to a stranger. Cheapest fix that
  needs no new table: a short deterministic code derived from the id and a
  server-side pepper (`slugify`-style hashing already exists in
  `src/libs/algorithms/slug.ts` for a related problem — reuse the shape, not
  necessarily the function), resolved back to an id only inside the
  `SECURITY DEFINER` RPC.
- **Reward state**, one row per successful referral rather than a column on
  `players` (a player could in principle refer more than one person): new
  table `referral_rewards` — `id, club_id, referrer_player_id,
  referred_player_id, status ('earned' | 'redeemed'), earned_at,
  redeemed_at`. Written by a trigger or a small RPC the first time a `games`
  row appears naming the referred player's id (`earned`); flipped to
  `redeemed` by a club admin from `ClubMembersPage` or similar, the same
  hand-fulfilment model as `tournament_players.paid` today.

### Flow

1. Club turns the referral program on, writes its own reward text in club
   settings (mirrors how `entry_fee` is already club-authored free text).
2. Existing member gets their own link from their profile — same QR-in-a-
   card pattern as `InvitePrintPage`, but carrying their short code instead
   of just the club slug. `ShareButton`'s native-share-sheet path already
   covers "hand this to somebody" — this just changes what URL it's handed.
3. New person joins via that link. `join_club` resolves the code, sets
   `referred_by_player_id`. Nothing rewarded yet — this state is
   indistinguishable from an ordinary join except for that one column.
4. New person plays their first logged game at the club. Whatever writes
   `games` (today: `AddGamePage`, `LiveMatchPage`'s finish path) is where a
   check for "does either player have `referred_by_player_id` set and no
   existing `referral_rewards` row" belongs, inserting one `earned` row.
5. Club admin sees a small "rewards to give out" list (reuses
   `ClubMembersPage`'s existing admin-only surface), marks one `redeemed`
   after comping the table time or discount in person. No app-side balance,
   no expiry logic — the club's memory of who they already comped is the
   `redeemed_at` timestamp, nothing more automated than that in v1.

### Anti-abuse, kept deliberately light

- Reward requires a played game (above) — kills pure signup farming.
- One `referred_by_player_id` per `players` row, set once at join — a
  player cannot retroactively claim to have been referred, and cannot be
  attributed to two referrers.
- A per-referrer cap (e.g. N rewarded referrals per rolling 30 days) is a
  `count(*)` check inside the RPC/trigger if abuse turns out to be real; not
  worth building pre-emptively for a reward a human hands out in person and
  can simply decline to honour if something looks wrong.

---

## Scheduled nudges (win-back, and reusable beyond it)

### What "dormant" means, computed not stored

No new "last active" column needed — it is a query, not a stat to keep in
sync: for a given club, the newest `games.played_at` naming each active
`players.id`, players absent from that set for longer than a club-chosen
window (e.g. 21 days) are the win-back audience. Same shape of query
`RankingDailyPage`/`RankingNightPage` already run over `games`, just windowed
the other direction.

### Schema changes

- **`clubs`**: `win_back_days` (integer, nullable — null means the club
  hasn't opted in), reusing the "feature is off unless a club configures it"
  pattern already used for `requires_payment` on tournaments.
- **A dedup table**, so nobody gets the same nudge twice: `nudges_sent` —
  `id, club_id, person_id, kind ('winBack' | future kinds), sent_at`. A
  unique constraint on `(club_id, person_id, kind)` scoped to a time window
  (or simplest: just check `sent_at > now() - interval` before sending) is
  what stops a player getting re-messaged every time the cron runs before
  they've come back.

### Flow

1. New Netlify Scheduled Function, `nudges.mts`, same shape as
   `youtube-reconcile.mts`: service-role client, no-ops if unconfigured, runs
   on a coarser schedule than the once-a-minute YouTube reconciler — once a
   day is enough for a win-back message.
2. For each club with `win_back_days` set: find players whose last `games`
   row is older than the window and who have no `nudges_sent` row for
   `winBack` in, say, the last 30 days.
3. Send via whichever channel the person has: push if they hold a
   `push_subscriptions` row (`person_id`-scoped already, so this is a
   straight join), email via Resend otherwise — same two pipelines already
   used elsewhere, just a new template in `mailText.ts` and a new `kind` in
   `sendPush`'s payload enum.
4. Copy is where the referral program and the win-back nudge meet: "haven't
   seen you in a while — come back and bring a friend, you both get
   `{club.referral_reward_text}`" is one sentence once both features exist,
   and is a meaningfully stronger message than either alone. Not required
   for v1 of either feature, worth keeping in mind when writing the i18n
   strings so the two don't get written independently and then need
   reconciling later.
5. Unsubscribe/opt-out: a player already controls their push subscription
   from the browser; email needs a real one-click unsubscribe link per
   `mailText.ts` template (legal requirement in most jurisdictions for
   anything read as marketing, not just good manners) — this is the one
   piece of this document that does touch compliance, however lightly.

---

## Effort, order of magnitude

| | |
|---|---|
| Referral code column + short-code resolution in `join_club` | ~1 day |
| Referral link/QR on player profile (reuse `InvitePrintPage` pattern) | ~1 day |
| `referral_rewards` table + earn-on-first-game trigger/RPC | ~1 day |
| Admin "rewards to give out" list + redeem action | ~0.5–1 day |
| Club settings for reward text + on/off toggle | ~0.5 day |
| `nudges.mts` scheduled function + dormant-player query | ~1 day |
| `nudges_sent` dedup table + win-back email template + push kind | ~1 day |
| Email unsubscribe link (once, reusable by any future nudge) | ~0.5 day |

---

## Open questions for whoever implements

1. Does the referral reward apply once per referred person only, or can a
   club choose to reward every visit (loyalty-style) rather than a one-time
   bonus? This document assumes one-time.
2. Short-code scheme for the referral link — reuse/extend
   `src/libs/algorithms/slug.ts`, or a dedicated hash? Needs to be short
   enough to fit comfortably in a QR at poster size (`InvitePrintPage` is
   already tuned for a specific code length via the club slug).
3. Win-back window is club-configurable per this sketch — should there be a
   sane platform-wide default shown at onboarding, or does the field stay
   empty (feature off) until a club deliberately turns it on?
4. Does a win-back nudge risk feeling intrusive from a small club (20
   members, everyone knows when you've been gone)? Worth a copy review, not
   just an engineering one, before this ships to any club.
5. Should `nudges.mts` eventually generalize beyond win-back (e.g.
   "tournament starting tomorrow and you haven't confirmed") — the
   `nudges_sent` table and scheduled-function shape are written generically
   on purpose, but only win-back is scoped here.
