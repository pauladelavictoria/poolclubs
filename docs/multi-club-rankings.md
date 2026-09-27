# Open tournaments, couples, and multi-club seasons

**Status:** planned, not started. First written 2026-09-15, rewritten
2026-09-27 around three concrete requirements.
**Nothing in this document has been built.** No table, column, RLS policy or
route described here exists in the repo yet.

---

## Why this document exists

Every tournament today belongs to exactly one club, is singles-only, and
every entrant must already be a member of that club — enforced by an actual
RLS policy, not just the UI. That rules out three things clubs are asking
for:

1. **Open tournaments.** A club organizes a tournament — for one category,
   several, or all — and anyone can enter: members of other clubs, or people
   with no club at all.
2. **Seasons.** Several clubs run a named, branded season together. Each of
   its tournaments is organized by one of those clubs and can be played at
   any venue, and every result feeds a season ranking, per category and
   combined.
3. **Couples tournaments.** Pairs enter together and play doubles.

This is the feature set that turns PoolClubs from "one app per club" into
something with network effects: a club joining the platform becomes more
valuable to every club already on it, because their players can now play in
and be ranked against a bigger pool.

---

## What already exists (verified against the code, 2026-09-27)

| Fact                                                                                                                                                                                                                                                                                                                                | Where                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Identity is cross-club by construction: one `people` row per human, one `players` row per club they belong to                                                                                                                                                                                                                       | `sql/schema.sql` (`people`, `players`)                               |
| **Clubless users already have a `players` row**, in the sentinel club "PoolClubs Global" (slug `global`). So "anyone with an account" and "anyone who owns some `players` row" are the same set — an open tournament needs no person-keying migration                                                                               | `create_club` / sentinel-club work                                   |
| `tournaments` has one owning `club_id`, one nullable `category` (1–3, NULL = all categories), and no `mode` — tournaments are singles-only                                                                                                                                                                                          | `sql/schema.sql:2151`                                                |
| `tournament_players` is just `tournament_id, player_id, created_at, paid`                                                                                                                                                                                                                                                           | `sql/schema.sql:2140`                                                |
| **Category eligibility is enforced only in the UI**, by `canEnterTournament()`; nothing in RLS checks it. `players.category` is set by each club on its own roster (`double precision`, default 3)                                                                                                                                  | `src/libs/algorithms/tournamentEntry.ts`                             |
| The entry blocker: `"Members can enter themselves"` requires membership of the tournament's club _and_ that `player_id` is a `players` row of that club                                                                                                                                                                             | `sql/schema.sql:3084`                                                |
| Every other tournament policy is gated the same way: viewing (`:3164`, `:3168`, `:3180`), recording results (`:3114`), public read only when the owning club is public (`:3056`, `:3068`, `:3292`). **Opening entry alone is not enough** — an outside entrant must also be able to see the tournament and record their own matches | `sql/schema.sql`                                                     |
| Doubles already exist everywhere below tournaments: `GameMode` (`single`/`doubles`), `player_1b_id`/`player_2b_id` on `games` and `live_matches`; Elo, daily score, cards and the live scoreboard all handle a partner seat                                                                                                         | `sql/schema.sql:1899`, `src/libs/algorithms/elo.ts`, `dailyScore.ts` |
| Tournament results become `games` rows under the tournament's `club_id` (via `finish_live_match`, which also links `tournament_matches.game_id`)                                                                                                                                                                                    | `sql/schema.sql:575`                                                 |
| Standings are a pure function over entrant ids + matches, club-agnostic — but **league format only**. No finishing-position function exists for double elimination or groups + knockout                                                                                                                                             | `src/libs/algorithms/leagueTable.ts:59` (`standings`)                |
| Clubs already have branding: `slug`, `logo_url`, `theme_color` (`BallColor`)                                                                                                                                                                                                                                                        | `sql/schema.sql` (`clubs`)                                           |
| A federation-seeded directory of clubs (including unclaimed ones) already exists — usable as a venue list                                                                                                                                                                                                                           | `sql/clubs-seed-es.sql`, `src/pages/public/PublicClubPage.tsx`       |
| The name `season` is unused anywhere in the schema                                                                                                                                                                                                                                                                                  | —                                                                    |

---

## 1. Open tournaments

### Decision

A tournament gets a flag, `tournaments.open boolean NOT NULL DEFAULT false`.
A closed tournament behaves exactly as today. For an open one, **the
membership check is dropped entirely**: anyone signed in can enter with any
`players` row they own — their row at their own club, or their `global` row
if they have no club.

The earlier draft of this document recommended a per-tournament list of
allowed clubs instead, to keep "vetted by a real club" as the trust
boundary. That has been decided against: an open city tournament is meant
to be open, and the organizer club's admin remains the gate (they can
remove any entrant, and `requires_payment` still applies).

### Schema

- `tournaments.open boolean NOT NULL DEFAULT false`.
- `tournaments.venue_club_id integer NULL REFERENCES clubs(id)` — where it is
  played, when that isn't the organizer's own room (see Seasons). Any club in
  the directory, claimed or not. NULL = at the organizer.
- `tournament_players.person_id integer NOT NULL` — filled by a `BEFORE
INSERT` trigger from `players.person_id`, with
  `UNIQUE (tournament_id, person_id)`. This is the one real guard an open
  tournament needs: a person with rows at two clubs cannot enter twice. It is
  also what the season ranking keys on.
- `tournament_players.player_id` **stays a `players.id`**. The entrant still
  enters as one concrete club row, so `is_own_player`, the withdraw/admin
  policies, `tournament_matches.p1_id/p2_id` and `standings()` are all
  unchanged. "Which club does this person play for" is a join through
  `players.club_id`; the `global` club is shown as "no club".

### RLS

- **Enter** (`"Members can enter themselves"`, `:3084`) becomes:
  `(tournament_is_open(tournament_id) AND is_own_player(player_id))
OR <today's check>`. The admin-adds-someone branch stays members-only; an
  admin of an open tournament can still add their own members.
- **Read**: tournaments with `open = true`, their entrants and their matches
  are readable by anyone, `anon` included — the same shape as the existing
  "…of public clubs are readable by anyone" policies, with
  `OR tournament_is_open(...)`.
- **Record results** (`"Members can record results"`, `:3114`): add a branch
  for "the caller owns a player in this match" (`p1_id`, `p2_id`, or their
  partners — see Couples), so an outside entrant can report their own match.
- **Comments/reactions** on the tournament: same widening as read, so
  outside entrants can take part in the thread.
- **Withdraw** (`:3052`) already keys on `is_own_player`; no change.

`tournament_is_open(tid)` is a `STABLE SECURITY DEFINER` helper next to
`tournament_club()`.

### Side effect worth knowing

A match played in a tournament becomes a `games` row with the organizer's
`club_id` and, now, `players.id`s from other clubs. Club rankings built from
the roster (`dailyScore`, Elo) already skip ids that aren't on the roster —
see the "partner has left the club" test in `dailyScore.test.ts` — so nothing
breaks, but outside entrants' tournament games won't count toward their own
club's day-to-day ranking. Listed as an open question below, not redesigned
here.

---

## 2. Categories: one, several, or all

- `tournaments.category smallint` → `tournaments.categories smallint[]`
  (NULL = all categories). The migration wraps the existing value:
  `categories = CASE WHEN category IS NULL THEN NULL ELSE ARRAY[category] END`.
- `canEnterTournament()` becomes an `includes` check; its test is updated,
  not replaced. `TournamentForm`'s single select becomes checkboxes for 1, 2
  and 3 (none checked = all).
- **Eligibility moves into the database for the first time.** A `BEFORE
INSERT` trigger on `tournament_players` snapshots the entrant's category
  (`players.category` rounded to 1–3) into `tournament_players.category` and
  rejects the entry if `categories` is set and doesn't contain it. With open
  tournaments the UI-only check stops being good enough — anyone can call the
  API.
- **The snapshot is what the season ranking groups by.** A result counts for
  the category the player entered with, even if their club re-categorizes
  them later. That makes multi-category and all-category tournaments feed the
  per-category season tables correctly.
- `LeagueTable` already shows each entrant's own category when the
  tournament has no single category; it switches to reading the snapshot.

**Caveat:** a category is assigned by each club on its own roster, so two
clubs can disagree about who is a "1", and clubless players default to 3.
For v1 the entrant's own club is trusted. A season that wants to own its
categories is an open question, not v1.

---

## 3. Couples tournaments

**Built for closed (single-club) tournaments on 2026-09-27** — see
`tournament_player_pair_guard` in `sql/schema.sql` and
`src/libs/algorithms/pairs.ts`. Built as sketched below, plus
`tournaments.pair_min_sum`: the least the pair's two categories may add up to
(4 = a 1st pairs only with a 3rd, two 2nds can pair). Couples league fixtures
start from the tablet (captains take each side's first seat), and late league
entry takes a pair. What remains is the open-tournament and season side
(partner snapshots, `partner_person_id`).

- `tournaments.mode "GameMode" NOT NULL DEFAULT 'single'` — the same enum
  games already use.
- `tournament_players` gains `partner_id integer NULL` (a `players.id`), and
  trigger-filled snapshots `partner_person_id` and `partner_category`.
- The entry trigger enforces:
  - a partner iff the tournament's mode is `doubles`;
  - partner ≠ entrant (by person);
  - the partner is category-eligible too;
  - one person in at most one pair per tournament: a unique index on
    `(tournament_id, partner_person_id)`, plus a check that the partner isn't
    already an entrant, or the entrant already someone's partner.
- **The entrant id stays the captain's `player_id`.** Brackets,
  `tournament_matches.p1_id/p2_id`, `standings()` and the draw code are
  untouched: one entry is one side. When a fixture becomes a live match or a
  game, `player_1b_id`/`player_2b_id` are filled from the entry's
  `partner_id`, and from there doubles already works end to end.
- For an open doubles tournament the partner may be from any club, or none;
  for a closed one, both must be members.
- **Consent (v1):** the captain names the partner; either partner can
  withdraw the pair (the delete policy gains `OR is_own_player(partner_id)`),
  and the partner can record results. An invite/accept step can be added if
  people get entered without asking.
- Entry UI: the partner picker searches people the same way
  `PublicPlayersPage` does, and the entrant list shows both names on one row
  ("Ana / Luis").

---

## 4. Seasons

A season is a named, branded ranking that several clubs feed with
tournaments. Each tournament still belongs to one organizing club, can be
played at any venue, and contributes points by finishing position.

### Schema

- **`seasons`** — `id, slug, name, owner_club_id, logo_url, theme_color
("BallColor"), starts_on, ends_on, points smallint[]`.
  - `slug`, `logo_url` and `theme_color` mirror `clubs`, so the public page,
    link-preview card and logo upload reuse the club patterns.
  - `points` is the **placement table**: `points[1]` for 1st, `points[2]` for
    2nd, and so on (e.g. `{100,80,60,60,40,40,40,40}`); places beyond its
    length score 0. It is the same for every tournament in the season,
    regardless of format, so no club's `points_win`/`points_play` settings
    leak into the season.
- **`season_clubs`** — `season_id, club_id`, composite PK: the co-organizing
  clubs. The owner club's admins edit the season and this list.
- **`tournaments.season_id integer NULL REFERENCES seasons(id)`** — a column,
  not a join table, because a tournament belongs to at most one season.
  Setting it is allowed for an admin of `tournaments.club_id` when that club
  is in `season_clubs`. A tournament can be attached after creation.
- **Venue** is `tournaments.venue_club_id` (above): a season tournament
  organized by club A can be played at club C's room, including a directory
  club that isn't on the platform yet.

### RLS

- `seasons`, `season_clubs`: readable by anyone. Insert by any club admin
  (as owner); update/delete by the owner club's admins. `season_clubs`
  insert/delete by the owner club's admins.
- Season tournaments are expected to be open, but a season doesn't force
  that — a closed one is allowed and simply only has members as entrants.

### Scoring

Two pure functions in `src/libs/algorithms/`, with one small test file:

- **`placements(tournament, entrants, matches)`** → finishing position per
  entrant, for all three formats:
  - `league`: rank in `standings()`.
  - `double_elim` / `group_knockout`: 1st and 2nd from the final; everyone
    else by the round they went out in, with ties sharing the position
    (e.g. both losing semi-finalists are 3rd). Group-stage exits in
    `group_knockout` share the position after the last knockout place.
  - Only `done` tournaments count.
- **`seasonStandings(season, tournaments)`** → for every placement, look up
  `season.points`. Credit the entrant's `person_id` **and** the partner's
  `partner_person_id`: both partners get the pair's points in their own
  personal ranking. Produce:
  - one table per category, grouped by the snapshot category (`category` /
    `partner_category`);
  - one combined table, summing everything per person.
    Ties are broken by number of 1st places, then 2nds, and so on.

The data is read with one query: the season's tournaments with their
entrants and matches, the same shape `src/queries/tournaments.ts` already
loads for a single tournament. No materialized table — a season is at most
dozens of tournaments.

### Display

- Public **`PublicSeasonPage`** (`/seasons/$slug`): season branding up top;
  a calendar of its tournaments with organizer and venue; tabs for each
  category and "Combined". It reuses `PublicTournamentPage` pieces and the
  player rows from `PublicPlayersPage`.
- A season's tournament page shows the season badge and links back.
- Season settings (name, logo, colour, dates, points table, co-organizers)
  sit in the owner club's admin area.

---

## Governance and business questions

- **Disputes across clubs.** Today a tournament's admin settles disputes
  among their own members. In an open tournament the organizer club's admin
  settles them, including for outside entrants — it is their tournament. A
  dispute the organizer can't settle has no escalation path, and there
  won't be one in v1.
- **Categories across clubs.** See the caveat in §2. If seasons get serious,
  clubs will want the season (or a federation) to assign categories, not
  each club separately.
- **Paid open tournaments.** `tournament-payments.md`'s Stripe Connect design
  pays one connected account, which fits: the organizer club is paid. The
  case that doesn't fit is a paid tournament whose venue is a _different_
  club expecting a share. That needs its own follow-up.
- **Does PoolClubs itself run a season** (an official platform-wide ranking),
  the way the operator role already exists for drills? That makes PoolClubs a
  competition body, not just infrastructure — out of scope, but the obvious
  next question once seasons exist.

---

## Effort, order of magnitude

|                                                                                           |           |
| ----------------------------------------------------------------------------------------- | --------- |
| `open` flag, `person_id` uniqueness, widened entry/read/record/comment policies           | ~1–2 days |
| `categories` array, DB eligibility trigger + snapshot, form and badge updates             | ~1 day    |
| Couples: `mode`, `partner_id` + triggers, entry UI, partner seats into live matches/games | ~2 days   |
| `venue_club_id` + showing each entrant's club                                             | ~0.5 day  |
| Seasons: `seasons`/`season_clubs`/`season_id`, settings form, logo upload                 | ~2 days   |
| `placements()` + `seasonStandings()` with tests                                           | ~1–2 days |
| `PublicSeasonPage` + OG card                                                              | ~1 day    |

---

## Open questions for whoever implements

1. Should tournament games count toward an outside entrant's _own_ club
   ranking? Today they land under the organizer's `club_id` and are ignored
   by the entrant's club.
2. Should a partner confirm before they are entered, or is
   "either partner can withdraw" enough?
3. Should a season restrict discipline (8/9/10-ball) or mode (singles vs
   couples), or can it mix them in one ranking?
4. Should the season, rather than each club, own the categories its rankings
   use?
5. Paid tournaments where the venue club is not the organizer.
