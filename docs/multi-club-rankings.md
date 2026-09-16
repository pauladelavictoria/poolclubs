# Multi-club tournaments and a shared ranking

**Status:** planned, not started. Written 2026-09-15.
**Nothing in this document has been built.** No table, RLS policy or route
described here exists in the repo yet.

---

## Why this document exists

Every tournament today belongs to exactly one club, and every entrant must
already be a member of that club — enforced not just by convention but by an
actual RLS policy (see below). A club that wants to run something bigger
than its own membership — a city-wide open, a league across five clubs that
already know each other, a season that feeds one shared leaderboard — cannot
do it inside a single `tournaments` row as the schema stands.

This is the feature that turns PoolClubs from "one app per club" into
something with real network effects: a club joining the platform becomes
more valuable to every other club already on it, because now their members
can play in and be ranked against a bigger pool of opponents. That is a
materially stronger pitch to a prospective club than anything scoped to a
single venue.

---

## What already exists (verified against the code, 2026-09-15)

| Fact | Where |
|---|---|
| Identity is already cross-club by construction: one `people` row per human, one `players` row per club they belong to. A serial multi-club player already has multiple `players.id`s pointing at the same `people.id` today | `sql/schema.sql` (`people`, `players`) |
| Cross-club aggregation already has real precedent, just not for a competitive ranking: `playerRecord.ts` sums a person's wins across **all** their `players.id`s at once, explicitly "cross-club by construction"; `PublicPlayersPage` is a cross-club name search; a player's public profile and link-preview card are cross-club by the same mechanism | `src/libs/algorithms/playerRecord.ts`, `src/pages/public/PublicPlayersPage.tsx`, `src/pages/public/PublicPlayerPage.tsx` |
| **The actual blocker**: entering a tournament requires club membership of *that tournament's* club, enforced in the database, not just the UI — `"Members can enter themselves" ... WITH CHECK (is_club_member(tournament_club(tournament_id)) AND ...)` | `sql/schema.sql:2912` |
| `tournaments.club_id` is a single, non-nullable integer — a tournament has exactly one owning club today | `sql/schema.sql:2034` (`tournaments`) |
| Point values for a league-format tournament already exist and are already club-authored per tournament: `points_win`, `points_play` (smallint, club sets these per tournament today) | `sql/schema.sql:2034`, `src/components/tournaments/TournamentForm.tsx` |
| Standings computation is already a pure function over entrants + matches, independent of club: `standings()` in `leagueTable.ts` takes a list of entrant ids and a list of matches and returns a table — it does not care what club an id belongs to today, because today all the ids it's given happen to share one | `src/libs/algorithms/leagueTable.ts` |
| Per-club ranking (ELO, daily/night/all-time) is computed from `games`, which is itself club-scoped (`games.club_id` required, both `players.id`s implicitly from that club by how the UI writes them) — this is a *separate* system from tournament standings and is out of scope here; this document is about tournament-driven shared points, not merging every club's day-to-day ELO into one number | `src/hooks/useEloRanking.ts`, `sql/schema.sql:1794` (`games`) |
| A federation-seeded, unclaimed club directory already exists (`clubs-seed-es.sql`) — clubs that don't yet actively run on the platform are already listed and linkable, which is relevant to "who can a network tournament include" below | `sql/clubs-seed-es.sql`, `src/pages/public/PublicClubPage.tsx` |

The identity model already does the hard part for free — a shared ranking
keyed by `people.id` rather than `players.id` is a natural aggregation, not
a redesign. The actual work is entirely on the *entry* side: letting someone
from Club B into a tournament owned by Club A, safely.

---

## Two features, not one

It's worth separating these explicitly, because they have different shapes:

1. **A network tournament** — one event, entrants may come from more than
   one participating club, one bracket/league table.
2. **A shared ranking (season)** — points from *multiple* tournaments,
   possibly run by different clubs on different dates, rolled into one
   ongoing leaderboard keyed by person, not by club.

A network tournament is useful on its own (one-off city open). A shared
ranking needs network tournaments as its input but is a bigger commitment —
it implies an ongoing "season" concept and, eventually, governance over who
can add a tournament to somebody else's ranking. Recommend building #1
first and proving it works before committing to #2's data model, since #2's
shape depends on lessons from real network-tournament usage.

---

## Core decision: how does a Club-B player enter a Club-A tournament?

Three shapes, in increasing order of complexity:

- **A. Per-tournament guest list.** The owning club's admin explicitly adds
  specific outside players (by club + player, or by inviting another club's
  admin to add their own roster). Simplest RLS change: a new policy that
  checks membership of *any* club on an explicit allow-list for that
  tournament, not just the tournament's own club. No change to who *owns*
  the tournament or its data.
- **B. Open network tournament.** Tournament flagged as open to a set of
  clubs (or to every public club) rather than an explicit player list;
  anyone active in one of those clubs can self-enter, same self-service
  spirit as today's "Members can enter themselves" policy, just with a wider
  membership check. Needs a new small join table (`tournament_clubs`, see
  below) rather than a single `club_id`.
- **C. Person-level entry, no club gate at all.** Drop the membership check
  entirely for tournaments marked this way — anyone with an account can
  enter. Simplest schema, but removes the one thing that currently keeps a
  tournament's entrant list trustworthy (a real human vetted by a real
  club's join flow), and reopens exactly the fake-account concern the
  referral document (`promo-referral.md`) designs around on the other side
  of the app. Not recommended as the default.

**B is recommended.** It keeps the trust boundary that already exists
(entering still requires being a real, active member of *some* participating
club) while removing the single-club restriction, and it maps directly onto
"five clubs that already know each other running a joint league" — the
actual business case a club owner would recognize and want.

---

## Schema changes this implies (Option B, sketched, not final)

- **New `tournament_clubs`** — `tournament_id, club_id`, composite PK. The
  owning club still exists (`tournaments.club_id`, whoever administers the
  bracket/settings), but this table lists every club whose active members
  may self-enter. A single-club tournament, which is every tournament today,
  is just one row in this table matching its own `club_id` — existing
  tournaments backfill trivially and nothing about them changes.
- **RLS**: `"Members can enter themselves"` (`sql/schema.sql:2912`) changes
  its `is_club_member(tournament_club(tournament_id))` check to
  `EXISTS (SELECT 1 FROM tournament_clubs tc WHERE tc.tournament_id =
  tournament_players.tournament_id AND is_club_member(tc.club_id))`. Same
  shape, wider set. The SELECT/read policies (`"Members can view entrants"`,
  the public one) need the equivalent widening so entrants from every
  participating club can actually see the bracket.
- **`tournament_players.player_id` stays a `players.id`, not a `people.id`.**
  A player entering a network tournament still enters as their
  *club-specific* `players` row (whichever club's membership let them in) —
  this keeps `is_own_player`, existing withdraw/admin policies, and
  `leagueTable.ts`'s existing entrant-id shape all working unchanged.
  Anywhere the standings need to show "which club is this person playing
  for," that's a join through `players.club_id`, not a new column.
- **UI**: `TournamentForm` gains a multi-club picker when creating a
  tournament (defaulting to just the creating club, i.e. today's behavior
  unchanged unless a club deliberately opts in). Needs a way for Club A to
  actually invite Club B — simplest v1 is "pick from clubs you're already
  connected to somehow" (no such concept exists yet) or, more realistically
  for a first version, any club admin can add *any* public club to the list
  without that club's opt-in, the same way anyone can already see any public
  club's roster today. Whether that's the right trust model is an open
  question below, not a settled one.

---

## Shared ranking (season), once network tournaments exist

If/when this is worth building on top of the above:

- **New `series`** (name pending — "league," "circuit," "season" all taken
  or overloaded elsewhere in the schema) — `id, name, starts_on, ends_on`,
  probably owned by one club (whoever proposes it) but conceptually neutral.
- **New `series_tournaments`** — `series_id, tournament_id` — which
  tournaments feed this season. A tournament need not know at creation time
  that it will belong to a series; this table is what makes that decision
  retroactive-friendly (a club runs its normal tournament, someone later
  proposes folding its results into a season).
- **Points already exist per tournament** (`points_win`, `points_play`) —
  the season standing is `sum(points earned across every tournament in
  series_tournaments, grouped by people.id via players.person_id)`, a pure
  aggregation function very close in shape to the existing `standings()` in
  `leagueTable.ts`, just fed from `tournament_matches` across many
  tournaments instead of one.
- **Display**: a new public page, `PublicSeriesPage` or similar, sibling to
  `PublicTournamentPage` — the cross-club precedent (`PublicPlayersPage`,
  the OG-card renderers) means this is mostly assembly of things that
  already exist, not new rendering logic.

This layer is deliberately sketched lighter than the network-tournament
layer above — it is the part most likely to change shape once a club has
actually run one multi-club event and reports back what they wanted the
follow-up season to look like.

---

## Governance and business questions (not engineering, but block the design)

- **Who can add a club to a network tournament's list?** Any admin
  unilaterally (spam/vanity risk — a club stuffing a "we beat everyone"
  tournament with clubs that never agreed), or does the invited club have to
  accept? An accept step is a small state machine (`tournament_clubs.status
  = 'invited' | 'accepted'`) but is real added scope.
- **Who owns a season's rules once it spans clubs?** Point values today are
  set per-tournament by that tournament's own club (`points_win`/
  `points_play`), which is fine for one tournament but gets uncomfortable
  once five clubs are comparing their members on one leaderboard built from
  tournaments each club configured independently, with no shared agreement
  on relative difficulty/weight.
- **Does PoolClubs itself ever run/administer a season**, e.g. an official
  platform-wide ranking independent of any single club, the way
  `is_drill_admin()`/the operator role already exists for drills? That's a
  materially different product decision (PoolClubs as a competition body,
  not just infrastructure for clubs) and is out of scope for this document,
  but worth flagging since it's the natural next question once a shared
  ranking exists at all.
- **Dispute handling across clubs** — today a tournament's own admin
  resolves disputes inside their own membership. A multi-club bracket needs
  an answer for "Club A's admin and Club B's entrant disagree about a
  result" that doesn't exist in any single-club flow today.

None of these block building option A or B's *tournament* layer (an
explicit or open guest list is uncontroversial); they matter once a
recurring, cross-club *season* is on the table, which is why the shared-
ranking section above is written as a lighter, more provisional sketch than
the network-tournament section.

---

## Effort, order of magnitude

| | |
|---|---|
| `tournament_clubs` table + RLS widening on entry/read policies | ~1–2 days |
| `TournamentForm` multi-club picker + backfill existing tournaments into the table | ~1 day |
| Bracket/standings UI showing which club each entrant plays for | ~0.5–1 day |
| Public multi-club tournament page (extends `PublicTournamentPage`) | ~0.5 day |
| **Shared ranking (season)**, if pursued: `series`/`series_tournaments` + aggregation query | ~2–3 days |
| Public season standings page | ~1 day |
| Invite/accept flow for adding a club to a tournament, if not left unilateral | ~1–2 days |

---

## Open questions for whoever implements

1. Option A (explicit guest list) vs. B (open to a set of clubs) vs. C
   (no club gate) — this document recommends B; confirm that matches the
   actual use case being sold to clubs before building the RLS change.
2. Unilateral add vs. invite/accept for putting another club into a
   tournament's list — affects both trust model and scope.
3. Does a network tournament's `entry_fee`/`requires_payment` even make
   sense multi-club, given `tournament-payments.md`'s Stripe Connect design
   pays out to *one* club's connected account? A paid network tournament
   likely needs its own follow-up document once both features are closer to
   real, rather than being assumed solvable by extension.
4. Is a shared season worth building at all before real usage data exists
   from network tournaments run under option B? This document's own
   position is: wait and see.
5. Whether `points_win`/`points_play` staying per-tournament (club-set) is
   acceptable for a cross-club season, or whether a season needs its own
   normalized weighting independent of any one club's settings.
