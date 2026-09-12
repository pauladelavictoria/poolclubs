# Recording and streaming games to YouTube

**Status:** planned, not started. Written 2026-09-04, revised 2026-09-12.
**Nothing in this document has been built.** No route, table, env var or
dependency described here exists in the repo yet.

---

## Why this document exists

A club with cameras on its tables asked what it would take to put tournament
matches on YouTube live, with the app's live score, the club logo and the
PoolClubs mark on screen, and with the operator pressing nothing.

The answer turned out to be small, because the data already exists. This is the
plan and, more importantly, the context — what was checked, what was assumed,
and why each decision went the way it did — so that whoever picks this up does
not have to re-derive it.

### The pitch to a club (revised 2026-09-12)

The feature sold to clubs is two player-facing buttons, not an admin tool —
and the two buttons apply to two different kinds of game:

1. **Tournament matches are always streamed, publicly, no checkbox.** A
   player entering a tournament already knows and wants this — it is agreed
   at registration (see "Consent" in the runbook), not decided per match.
   Every tournament fixture on a camera-equipped table gets a **"Watch"**
   button that opens the live stream on YouTube while it is in progress, and
   the same link is emailed to both players once it ends.
2. **Casual games are opt-in.** A player starting an ordinary game on the
   table's tablet sees a **"Record this game"** checkbox with a public or
   unlisted choice, off by default, and gets a YouTube link to their game
   once it ends only if they checked it.

The club installs and configures exactly one thing, once: a camera and an
always-on encoder PC pointed at YouTube with a stream key pasted in. From
then on, nothing club-side happens per game or per tournament — a
tournament's matches are simply always on, and a casual game's are decided
by the player, per game, from the tablet already bolted to the table
([kiosk.ts](../src/libs/browser/kiosk.ts)).

The insight that makes both buttons cheap to build together: in the YouTube
Live API, **the broadcast id is the video id**, and YouTube automatically
keeps a completed live broadcast as a VOD at that same `youtu.be/<id>` URL.
"Record and send me the link" and "Watch live" are the same object — one
`liveBroadcast` per game — differing only in `privacyStatus` (set from the
checkbox) and in *when* the link is handed out (immediately for Watch, after
`transition(complete)` for the recording). There is no separate
record/upload pipeline to build for the checkbox; it rides on the same
live-broadcast machinery Phase 2 already needs for Watch.

---

## What already exists (verified against the code, 2026-09-04)

This is the part that makes the feature cheap. None of it needs changing.

| Fact | Where |
|---|---|
| `live_matches` is the in-progress scoreboard row, and already carries `tournament_match_id`, `race_to`, both scores, `last_side`, `table_id` | `sql/schema.sql:1475-1497` |
| Anon RLS: *"Live matches of public clubs are readable by anyone"* | `sql/schema.sql:2424` |
| `live_matches` has a table-wide `GRANT ALL TO anon`, so `select("*")` works on it (unlike `clubs`/`players`/`people`, which are column-granted) | `sql/schema.sql:3396` |
| At most one live row per table, enforced by unique index | `sql/schema.sql:1953` |
| Abandoned-match filter (`ABANDON_AFTER_MS`, 3h) already written and used | [src/libs/algorithms/night.ts](../src/libs/algorithms/night.ts), [src/queries/live.ts:41-49](../src/queries/live.ts#L41-L49) |
| Club logo already served as a real, RLS-checked, cacheable HTTP image | [src/routes/api/clubs/$slug/logo.ts:16-39](../src/routes/api/clubs/$slug/logo.ts#L16-L39) |
| Server-route pattern to copy | same file, plus [src/routes/auth/callback.ts](../src/routes/auth/callback.ts) |
| Public-query conventions (column allowlists, why never `select("*")`) | [src/queries/public/shared.ts:1-22](../src/queries/public/shared.ts#L1-L22) |
| Scoring helpers to reuse: `leaderOf`, `isMatchOver` | [src/libs/algorithms/night.ts:19-175](../src/libs/algorithms/night.ts#L19-L175) |
| Match numbering for on-screen context | [src/libs/algorithms/bracket/numbering.ts](../src/libs/algorithms/bracket/numbering.ts) |
| Club accent colour from `clubs.theme_color` | [src/libs/theme/clubTheme.ts:32-44](../src/libs/theme/clubTheme.ts#L32-L44) |
| `live_matches` already carries **both** casual and tournament games through the same row — `challenge_id` and `tournament_match_id` are mutually exclusive (`live_matches_origin_check`), both alongside `table_id` | `sql/schema.sql:1773-1778` |
| Tablet-bolted-to-a-table concept already exists (kiosk mode), the natural home for a "record this game" checkbox at match start | [src/libs/browser/kiosk.ts](../src/libs/browser/kiosk.ts) |
| Outbound email already wired (Resend), with a `send()` helper and per-purpose functions to copy for "your game is ready" | [src/libs/server/mail.functions.ts:45-295](../src/libs/server/mail.functions.ts#L45-L295) |

Because casual and tournament games already share one row shape, the
reconciler that drives both needs only one query, one state machine — the
column that already tells them apart (`tournament_match_id` vs.
`challenge_id`, mutually exclusive) is exactly the column that decides
whether a row is desired unconditionally (tournament) or only when opted in
(casual). No separate "tournament mode" to build.

**The single gap:** nothing in `src/queries/public/` reads `live_matches`. The
only readers are [src/queries/live.ts](../src/queries/live.ts) and
[src/hooks/useLiveMatch.ts](../src/hooks/useLiveMatch.ts), both inside the
authed club shell. RLS already permits the anon read — the query and a
chrome-less page simply do not exist. That is the whole of Phase 1.

Two caveats for whoever implements: `sql/schema.sql` is a generated dump
(`npm run db:dump`), so the live database is the real authority on grants and
policies; and the realtime/polling behaviour cited here was read from code, not
observed at runtime.

---

## Decisions, and why

These were settled during planning. Recorded because the reasoning is not
recoverable from the resulting code.

| Decision | Why |
|---|---|
| **App orchestrates YouTube**, rather than the club running its own OBS + stream key by hand | Explicitly chosen: operators should press nothing. Costs OAuth, token storage and a Google review — see the risks below. |
| **Two overlay URLs**: match-keyed *and* table-keyed | Match-keyed was the original choice. Table-keyed was added later because a pre-generated OBS scene needs a URL that never changes — a camera is bolted to a table, not to a fixture. |
| **One reusable `liveStream` per camera**, many broadcasts bound in sequence | Removes most of the complexity: the stream key is created once and pasted into OBS once, forever. Confirmed supported — see Sources. |
| **No OBS plugin** | Per-platform builds, macOS notarization, ABI churn every OBS release — all to do what a Browser Source already does. |
| **No obs-websocket helper** | An https page cannot open `ws://localhost:4455` (mixed content), so it needs a binary on the club PC: builds, updates, support on three platforms. Phase 2 makes YouTube start/stop itself; OBS just streams continuously. |
| **No `googleapis` dependency** | The whole integration is `fetch` plus a token POST. Same for AES-256-GCM via Node's `crypto`. |
| **Reconcile loop, not triggers + webhooks** | Every step is idempotent and a failed tick retries — which is exactly what `transition(live)` needs anyway, since it fails until the encoder is actually connected. |
| **No `tournament_matches.video_url` column** | Derive the VOD link from `stream_sessions`. One less migration, one less thing to keep in sync. |
| **One broadcast serves both Watch and the recorded link** | Same object throughout its life: `privacyStatus` comes from the player's checkbox, and the VOD is the live broadcast after `transition(complete)` — not a second upload. See "The pitch to a club" above. |
| **Tournament matches are always public, no checkbox; casual games are opt-in** | Tournament consent is given once, at registration, for the whole event — asking again per match would be friction nobody wants. Casual games have no such prior consent, so the tablet checkbox is where it is gathered, per game. Same `live_matches` row shape, different desired-state rule (§2.4) driven by which of `tournament_match_id` / `challenge_id` is set. |
| **Public clubs only, for now** | No signed overlay tokens yet. A private club's player can still get a personal unlisted link once a signed per-table token exists — see the row above about the overlay route needing no auth today. Add the token column when a private club asks. |

---

## Phase 1 — the overlay (~1–1.5 days)

### 1.1 Public live query

New `src/queries/public/live.ts`, following the rules in
[shared.ts:1-22](../src/queries/public/shared.ts#L1-L22).

- `publicLiveMatchByTournamentMatchQuery(matchId)` —
  `from("live_matches").select("*").eq("tournament_match_id", matchId).maybeSingle()`.
  `select("*")` is correct here because of the table-wide anon grant.
- `publicLiveMatchByTableQuery(clubId, tableId)` — same select,
  `.eq("club_id", clubId).eq("table_id", tableId)`, plus the abandoned-row
  filter `.gt("updated_at", now - ABANDON_AFTER_MS)` that
  [live.ts:41-49](../src/queries/live.ts#L41-L49) already uses, so a match two
  people walked away from three hours ago does not sit on the stream forever.
  `maybeSingle()` is safe — the unique index guarantees one live row per table.
- Names come from `players` + `people`, which are **column-granted only** — use
  `PLAYER_COLS` / `PERSON_COLS` from
  [shared.ts:53-54](../src/queries/public/shared.ts#L53-L54). `select("*")` on
  those fails with a permission error, it does not merely return less.
- Fallback when there is no live row (fixture not started, or already filed):
  the public tournament query already embeds the finished score via
  `game:games(player_1_id, player_1_score, player_2_score, played_at)` —
  [src/queries/public/tournaments.ts:125](../src/queries/public/tournaments.ts#L125).
  Reuse it rather than writing a second path.
- `staleTime: 0`, `refetchInterval: 2000`.

  `// ponytail: 2s poll, not the realtime channel. One hidden browser in OBS,
  one row. libs/browser/realtime.ts is club-scoped and started from the authed
  ClubLayout (ClubLayout.tsx:37) — wiring an anon channel is real work for a
  latency nobody watching a rack can perceive. Switch if it reads laggy on
  camera.`

### 1.2 The routes

Two, both **top level, not under `_public`**, so they inherit none of
`PublicShell`'s nav, footer or theme chrome:

- `src/routes/overlay/$tournamentId.$matchId.tsx` — one fixture.
- `src/routes/overlay/table.$clubSlug.$tableId.tsx` — whatever is on that table
  now. Renders a fully transparent page when the table is idle, so a scene left
  running between matches shows clean camera rather than a stale score.

Both render the same component; only the lookup differs.

- Transparent page: a route-level `<style>` setting
  `html,body{background:transparent}`. OBS Browser Source composites it over
  the camera.
- Sizes in `vw`, not `px` — the same URL then works at 1920×1080 and 1280×720
  with no second layout.
- **Do not add `/overlay` to `PUBLIC_PREFIXES`**
  ([publicCache.ts:32-42](../src/libs/algorithms/publicCache.ts#L32-L42)).
  Leaving it out is what keeps `publicCacheControl` returning `null`, so the
  SSR HTML is never held in the CDN for 60s. Nothing to change — just know why.

### 1.3 The component

New `src/components/live/OverlayScoreboard.tsx`. **Do not reuse**
[Scoreboard.tsx](../src/components/live/Scoreboard.tsx) — that is a
full-screen touch surface with +/− controls; this is a lower third that has to
stay legible over green felt under a pendant lamp. Different object, despite
the similar name.

Shows: both names, both scores, race-to, who is at the table (`last_side`),
round label + match number, club logo, PoolClubs mark.

- Club logo: `<img src="/api/clubs/{slug}/logo">` rather than the `data:` URI
  in `clubs.logo_url`, so OBS caches the bytes instead of re-parsing base64 —
  that route already sets `cache-control: public, max-age=3600`.
- App mark: `/ball.png` (as `PublicShell.tsx:88` uses it).
- Legibility over video: near-solid backing plate, heavy weight, drop shadow.
  Keep everything ≥5% in from each edge (broadcast safe area).

Skipped: `?pos=`, `?scale=`, `?logos=0` query params. Add when an operator asks.

---

## Phase 1.5 — OBS tooling for admins (~1 day)

Zero-install: no binary to distribute, no updater, no support matrix.

Verified OBS capabilities this rests on (see Sources):

- **Scene Collection → Import** takes a plain `.json`.
- **Custom Browser Docks** — any URL docked inside the OBS window, cross
  platform via obs-browser.
- Browser Sources expose a `window.obsstudio` JS API (`getStatus()`,
  `onVisibilityChange`).
- obs-websocket is bundled by default in OBS 28+ (port 4455, auto-generated
  password) — deliberately unused, see Decisions.

### 1.5a Scene collection generator

Server route `src/routes/api/clubs/$slug/obs-scenes.json.ts`, same shape as
[logo.ts](../src/routes/api/clubs/$slug/logo.ts): club admins only,
`content-disposition: attachment`.

Reads `club_tables` (shape as in
[live.ts:84-99](../src/queries/live.ts#L84-L99)) and emits one scene per table:

- a placeholder camera source (`dshow_input` on Windows, `av_capture_input` on
  macOS, `ffmpeg_source` for an RTSP IP camera) — the operator picks the actual
  device once, which is the one thing the app cannot know;
- a `browser_source` with `url` pre-filled to
  `https://<app>/overlay/table/<slug>/<tableId>`, 1920×1080, `shutdown: false`,
  `restart_when_active: true`;
- scene named after `club_tables.name`.

`// ponytail: build the JSON literal from the table rows, no scene-collection
schema library and no OBS SDK. It is a nested object with a stable shape.`

**The stream key is deliberately not in this file.** A scene collection carries
scenes and sources; RTMP service settings live in an OBS *profile*, a separate
export. Keeping the credential out also means the download is harmless if it
gets forwarded around.

### 1.5b Admin control panel as a browser dock

An ordinary authed page in the app, designed at dock proportions (~300–400px
wide, dark), added via OBS → Docks → Custom Browser Dock. Shows the tournament's
matches, which table each is on, which table is streaming, and VOD links once
Phase 2 lands. No new auth path — the dock carries the session cookie like any
browser.

**Test fixture:** import the generated JSON into OBS once by hand, export it
back out, and snapshot-test that against the generator's output (`vitest`). If
OBS ever changes the scene-collection schema, that test is what tells you.

---

## Phase 2 — the app drives YouTube (~6–9 days + weeks of Google review)

This phase now covers both player-facing buttons (Watch and Record), since
they share one broadcast per game — see "The pitch to a club" above. What was
previously the whole of Phase 2 is §§2.1–2.4 and 2.6–2.7 below; §2.5 is the
addition for per-game opt-in and delivery.

### 2.1 API shape

YouTube Live Streaming API, part of YouTube Data API v3. Plain REST: `fetch`
plus a token POST to `https://oauth2.googleapis.com/token`.

Create the club's stream with `contentDetails.isReusable: true`. Google's own
words for that field: *"Indicates whether the stream is reusable, which means
that it can be bound to multiple broadcasts"*, and *"It is common for
broadcasters to reuse the same stream for many different broadcasts if those
broadcasts occur at different times."* Non-reusable streams would break this
design outright — bound to one broadcast only, invisible to
`liveStreams.list?mine=true`, and deleted by an automated process after the
broadcast ends.

Per opted-in game: `liveBroadcasts.insert` (with `status.privacyStatus` taken
from the player's checkbox — `public` or `unlisted`) → `liveBroadcasts.bind`
(to the club's existing stream) → poll `liveStreams.list` until
`status.streamStatus == "active"` → `liveBroadcasts.transition(status=live)` →
on match finish `transition(status=complete)`. The broadcast id **is** the video
id, so the VOD is `https://youtu.be/<broadcastId>` with no extra call — the
same URL a Watch button links to while the game is live is what gets emailed
to the player afterwards.

"Per opted-in game" deliberately says game, not tournament match: a broadcast
is created for any `live_matches` row the player flagged, tournament fixture
or casual game alike — see §2.5.

Constraints to design against:

- **One broadcast can be live on one stream at a time.** Two tables streaming
  simultaneously means two `liveStream` resources and two encoders.
- `transition(live)` fails unless the stream is already receiving data. The
  reconciler handles this for free by retrying next tick.

### 2.1a Quota — known vs assumed

The quota is a **daily unit budget per Google Cloud project**, not per club and
not per channel. At zero, every call returns `quotaExceeded` until midnight
Pacific.

**Confirmed from Google's docs:** default allocation is "100 `search.list`
calls, 100 `videos.insert` calls, and 10,000 units per day combined for all
other endpoints"; reads cost ~1 unit; the write methods that *are* listed cost
50. Exceeding 10,000/day requires the YouTube API Services Audit and Quota
Extension Form — free, manually reviewed, and a *second* Google review on top of
the OAuth verification below.

**Not confirmed:** that public quota table does not enumerate the Live Streaming
methods at all — no row for `liveBroadcasts.insert`, `.bind`, `.transition`, or
`liveStreams.insert`. Any "50 units per write, ~200 per match, ~40 matches/day"
figure is *inferred* from the other write methods, not read off the table.
Treat it as an order-of-magnitude sanity check, never as a budget.

**Get the real number in the first hour of Phase 2**, before building the
reconciler around any assumption: run one complete broadcast lifecycle against a
throwaway channel, then read Google Cloud Console → APIs & Services → YouTube
Data API v3 → Quotas, which reports units actually consumed.

The design is already close to quota-minimal, and not by accident: the reusable
stream means `liveStreams.insert` runs once per camera *ever*, not per match;
only reconcile ticks that find a state change spend write units; and the
wait-for-encoder poll is `liveStreams.list`, the 1-unit kind, running only in
the seconds between a match starting and OBS connecting.

If a measured match turns out expensive, the cheap fix is widening the reconcile
interval and the expensive fix is the extension form.

### 2.2 Schema

```
club_youtube      club_id PK, refresh_token_enc, channel_id, channel_title,
                  connected_by, connected_at
club_streams      id, club_id, table_id, youtube_stream_id,
                  ingestion_address, stream_key_enc, label
stream_sessions   id, club_stream_id, live_match_id, broadcast_id,
                  privacy_status, state, error, notified_at,
                  created_at, went_live_at, completed_at
```

Two new columns on `live_matches` itself, meaningful only for casual games
(`challenge_id` set): `record_opt_in boolean not null default false` and
`record_privacy text check (record_privacy in ('public', 'unlisted'))`, set
by the checkbox at match start. A tournament fixture (`tournament_match_id`
set) never reads these — it is desired unconditionally, always `public`; see
§2.4. `stream_sessions` no longer keys off `tournament_match_id` specifically
(renamed `live_match_id` above) so a casual game's broadcast is tracked the
same way a tournament fixture's is, once either is desired.

**Security — the part not to be lazy about.** `club_youtube` and `club_streams`
hold credentials that can post video to someone's channel.

- RLS: **deny all** to `anon` and `authenticated`. No column grants. Only the
  service role touches these tables, only from server routes.
- Refresh token and stream key encrypted at rest, AES-256-GCM via Node's
  `crypto` (~15 lines, no dependency), key in `TOKEN_ENCRYPTION_KEY`.
- Owners see connection state through a narrow view or server route returning
  `channel_title` / `connected_at` only — never the token.
- New env vars `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`,
  `TOKEN_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — **none `VITE_`
  prefixed.** Vite inlines every `VITE_*` into the client bundle. The repo
  already documents this rule for `VAPID_PRIVATE_KEY` and `RESEND_API_KEY`;
  extend both [.env.example](../.env.example) and [netlify.toml](../netlify.toml)
  the same way.

### 2.3 Server routes

Follow [logo.ts](../src/routes/api/clubs/$slug/logo.ts) and
[auth/callback.ts](../src/routes/auth/callback.ts):

- `src/routes/api/youtube/connect.ts` — club owner only; redirect to Google
  consent, scope `https://www.googleapis.com/auth/youtube`,
  `access_type=offline`, `prompt=consent`, signed state carrying the club id.
- `src/routes/api/youtube/callback.ts` — exchange the code, store the encrypted
  refresh token, create the club's first reusable `liveStream`, show the ingest
  URL and key to the owner once.

### 2.4 The reconciler

One Netlify scheduled function, `netlify/functions/youtube-reconcile.mts`,
`export const config = { schedule: "* * * * *" }`. For each `club_streams`
row, desired state is the current `live_matches` row on that table where
**either** `tournament_match_id is not null` (always desired, `privacy_status
= 'public'`, no checkbox involved) **or** `record_opt_in = true`
(`privacy_status` from `record_privacy`); actual state is its
`stream_sessions` row. Drive the state machine one step per tick,
idempotently. A table with a casual game that was never opted in desires
nothing, so no broadcast is created and OBS just streams into the void, as it
did before this feature existed — but a table with a tournament fixture
always desires a broadcast, checkbox or not.

On the tick where a session reaches `complete`, the reconciler is also what
triggers delivery (§2.5) — it is the one place that already observes the
transition, so there is nothing new to schedule.

**Verify during implementation** that `@netlify/vite-plugin-tanstack-start` and
a hand-written function in `netlify/functions/` coexist — `netlify.toml` sets no
`[functions] directory` today, and the plugin emits the SSR function. If they
fight, fall back to Supabase `pg_cron` + `pg_net` hitting a server route;
Supabase is already in the stack.

### 2.5 Player-facing UI: the checkbox, the delivery, the Watch button

This is the part that makes Phase 2 worth building — everything before it is
plumbing.

**Record checkbox, on the tablet, casual games only.** Wherever a *casual*
game is started from kiosk mode ([kiosk.ts](../src/libs/browser/kiosk.ts)),
add "Record this game" with a public/unlisted choice, writing
`record_opt_in` / `record_privacy` on the `live_matches` insert. A tournament
fixture never shows this checkbox — it is already always streamed publicly
by §2.4's rule, and asking again per match would contradict the "agreed once
at registration" design. No checkbox at all when the table has no
`club_streams` row — a club with no camera on that table sees nothing
different.

**Delivery, by email, both kinds of game.** When `stream_sessions.state`
reaches `complete`, send the game's participants `https://youtu.be/<broadcastId>`
and stamp `notified_at` so a retried reconcile tick doesn't resend it. This
fires for every completed session regardless of origin — a tournament
fixture's players get the link because it was always going to be recorded, a
casual game's players get it because they opted in. Follow the existing
pattern in [mail.functions.ts:45-295](../src/libs/server/mail.functions.ts#L45-L295)
— a new `sendGameRecordingMail`, same shape as `sendMemberApprovedMail`,
using the same `send()` helper. Doubles matches send to all of `player_1`,
`player_1b`, `player_2`, `player_2b`.

**Watch button.** On each tournament match's row/card, once a
`stream_sessions` row exists for it with `state in ('live', 'complete')`,
render a link to `https://youtu.be/<broadcastId>` — live while the match is
in progress, the same link becomes the VOD once it finishes. No new query
needed beyond joining `tournament_matches` → `live_matches` →
`stream_sessions` by id.

Not built here: a Watch button on casual games. The pitch only asked for it on
tournament matches; a casual game's opted-in player gets their link by email,
not a public Watch button, since there is no tournament bracket page to put
one on.

### 2.6 Admin UI

Club settings screen: connect/disconnect YouTube, map each `club_streams` row
to a `club_tables` row, show the ingest URL and key to copy into OBS.
Strings into `src/i18n/{en,es,fr}.json`. No per-tournament or per-match admin
toggle — that decision moved to the player, per §2.5.

### 2.7 The blocker that is not code

`https://www.googleapis.com/auth/youtube` is a **sensitive scope**. Google
requires app verification before an unlimited number of users can grant it;
unverified, the app is capped at ~100 users and shows a warning consent screen.
Weeks of calendar time, near-zero dev time.

**Start the verification submission the day Phase 2 begins, not the day it
ends.** This is the single largest schedule risk in the document.

---

## Ops runbook (club side)

**Camera.** Overhead, wide enough for the whole table, 1080p30. The lighting is
the real trap: pool pendants point straight down at the felt, so a camera
mounted above them shoots silhouettes. Mount below or beside the pendant, or at
the rail end. IP camera over RTSP → OBS Media Source; USB webcam → Video
Capture Device.

**Encoder.** Any mini PC with NVENC or QuickSync (~€250) handles two or three
streams. One OBS instance per simultaneously-streamed table.

**OBS setup.** Don't build scenes by hand — download the club's scene collection
from the app (club settings → OBS setup), then Scene Collection → Import. That
lands one scene per table with the overlay Browser Source already pointed at the
right URL. Two things remain, once, by hand:

1. In each scene, pick the actual camera device on the placeholder source.
2. Settings → Stream → Custom RTMP, server `rtmp://a.rtmp.youtube.com/live2`,
   key = the persistent key the app shows once.

Optionally add the app's control panel via Docks → Custom Browser Dock.

Because the overlay URL is table-keyed, none of this is touched again between
rounds or between tournaments.

**Bandwidth — the constraint most clubs actually hit.** 1080p30 ≈ 4.5–6 Mbps
*upload* per stream; 720p30 ≈ 2.5–4 Mbps. Three tables at 1080p is ~18 Mbps
sustained upload, which many club connections do not have. Default to 720p30 and
measure the club's uplink first.

**YouTube channel.** Phone-verified, live streaming enabled (first enable has a
24-hour wait), no active strikes. Encoder streaming has no subscriber minimum —
the 50-subscriber rule is mobile-only.

**Audio.** Club music on the stream means copyright claims and muted VODs.
Either no audio, or a directional mic aimed at the table, or licensed music.
This one silently ruins archives, so decide it up front.

**Consent.** Two different sources of consent, matching the two kinds of game
(§2.4): a tournament entrant agrees to being streamed publicly once, at
registration, for every match they play in that event — visible signage plus
a line in the registration flow covers it, and minors need guardian consent
there. A casual player has given no such prior consent, so their own
"Record this game" checkbox (§2.5) *is* the consent, per game, and is off
until they tick it. Either way, the camera itself runs continuously
regardless of any single casual game's opt-in — a casual player who never
checks the box is still on camera, just never uploaded — so the signage
still needs to say a camera is present, independent of what gets published.
The club carries the legal duty for the signage and the camera's presence;
the app only controls what happens to the recording after.

---

## Verification

**Phase 1**

1. `npm run dev`, start a live match in a public club bound to a tournament
   fixture, open `/overlay/<tournamentId>/<matchId>` in a **private window** —
   no session, so this proves the anon RLS path rather than your own membership.
2. Bump the score in the app; overlay follows within ~2s.
3. Both logos load; no `PublicShell` chrome renders.
4. `curl -sI` the overlay URL — no `s-maxage` header.
5. Open as an OBS Browser Source over a still image: transparent background,
   legible over felt, nothing inside the 5% safe area.
6. Private club → 404. Finished match → final score, not a blank.
7. Unit-test the round/score formatting helper against `night.ts`'s
   `isMatchOver` / `leaderOf` (`vitest`, matching the existing algorithm tests).
8. Table-keyed URL shows what the match-keyed URL shows for the same match.
   Finish the match: table URL goes transparent, match URL shows final score.
9. Set a live row's `updated_at` back four hours: table URL goes empty
   (abandoned-row filter), match URL unaffected.

**Phase 1.5**

10. Download the scene collection, import into a clean OBS profile: one scene
    per table, each Browser Source URL correct and loading.
11. Export it back out and snapshot-test against the generator's output.
12. `grep` the download for the stream key — must not be there.
13. Add the control panel as a Custom Browser Dock: authenticates, legible at
    ~350px wide.
14. Non-admin requests `obs-scenes.json` → denied.

**Phase 2**

15. Connect a **throwaway** YouTube channel first, never a club's real one.
16. Run one full broadcast lifecycle by hand, read Cloud Console → Quotas for
    units actually consumed. **Before building the reconciler**, not after.
17. OBS pointed at the persistent key with no casual game opted in and no
    tournament fixture on the table: reconciler creates nothing.
18. Start a casual game **without** checking "record": reconciler still
    creates nothing, no email arrives when it finishes.
19. Start a tournament match: **no checkbox is shown at all**, and within ~2
    ticks the broadcast exists with `privacyStatus: public`, is bound, and
    flips live once the encoder connects — unconditionally, confirming §2.4's
    tournament rule needs no player action.
20. Start a casual game **with** the checkbox (unlisted): same lifecycle as
    18 but the broadcast is created, confirming the opt-in path independently
    of the always-on tournament path.
21. Finish both a tournament match and an opted-in casual game: each
    broadcast goes `complete`, and every participant of both receives the VOD
    email exactly once, even if the reconcile tick that observed `complete`
    is re-run.
22. Kill OBS mid-match and restart: reconciler recovers, no duplicate broadcast.
23. Second tournament match on the same table straight after: confirms the
    reusable stream rebinds rather than needing a new key.
24. `grep -r` the built `dist/client` for `YOUTUBE_` and `TOKEN_ENCRYPTION_KEY`
    — must find nothing.
25. Query `club_youtube` with the anon key — must error.

---

## Effort

| | |
|---|---|
| Phase 1 — overlay routes (match + table), query, component | ~1–1.5 days |
| Phase 1.5 — scene collection generator + browser dock panel | ~1 day |
| Phase 2 — OAuth + connect flow | ~2 days |
| Phase 2 — schema, reconciler, state machine (broadened past tournament-only) | ~2–3 days |
| Phase 2 — record checkbox, delivery email, Watch button | ~1–2 days |
| Phase 2 — admin UI + i18n | ~1 day |
| Google OAuth verification | weeks of calendar, ~0 dev |

Phases 1 and 1.5 together — about two days — put a club live on YouTube:
import the scene collection, pick the camera, paste a stream key once. Phase 2
removes that last manual step and adds both player-facing buttons in one pass
— they share a broadcast, so there is no separate "recording" build after —
and is where all the credential handling, the two Google reviews and the
calendar risk live.

---

## Open questions for whoever implements

1. Measured quota cost of one broadcast lifecycle (§2.1a). Everything about
   daily capacity depends on it and it is currently a guess.
2. Whether `@netlify/vite-plugin-tanstack-start` tolerates a hand-written
   scheduled function in `netlify/functions/` (§2.4). Fallback is `pg_cron`.
3. Whether OBS's scene-collection JSON schema is stable enough to generate
   against long-term. The round-trip snapshot test in §1.5b is the tripwire.
4. Doubles matches — `live_matches` carries `player_1b_id`/`player_2b_id`. The
   overlay layout above assumes singles; four names need a different lower
   third. For a **casual** doubles game, the record checkbox (§2.5) is ticked
   by whichever player started the game — does that bind their partner's
   consent too, or does the checkbox need all four names' explicit sign-off
   before it can be checked? For a **tournament** doubles pair, this is
   presumably covered by both partners registering for the event, but that
   assumes tournament registration actually asks about streaming today —
   worth confirming before relying on it as consent.
5. Whether tournament registration currently says anything about streaming at
   all. The design in §2.4 treats "entered the tournament" as consent to
   being streamed publicly — that is only true if registration copy actually
   says so; if it doesn't yet, adding that line is a Phase-2 prerequisite, not
   an afterthought. Separately: whether Phase 1's public overlay page (always
   rendering whoever is live on camera, tournament or casual, streamed or
   not) is itself a consent problem independent of recording — a casual
   player who never touches the checkbox is still visible, with their real
   name, on an unauthenticated URL, the moment they start any game on a
   camera-equipped table.
6. How clearly clubs are told that opt-in is per-game, not per-camera: the
   camera and encoder run continuously regardless of any single checkbox
   (runbook, "Consent"), so a club that assumes "no one's recording, the
   checkbox is off" is wrong about the camera, only right about YouTube.

---

## Sources

Checked 2026-09-04. The claims about OBS capabilities and YouTube API behaviour
come from these; the quota inference explicitly does not.

- [YouTube liveStreams reference](https://developers.google.com/youtube/v3/live/docs/liveStreams) — `contentDetails.isReusable`
- [YouTube Live Streaming API overview](https://developers.google.com/youtube/v3/live/getting-started) — binding lifecycle
- [Determine quota cost](https://developers.google.com/youtube/v3/determine_quota_cost) — default allocation; note it lists no Live Streaming methods
- [obs-websocket](https://github.com/obsproject/obs-websocket) — bundled in OBS 28+, port 4455
- [obs-browser](https://github.com/obsproject/obs-browser) — Browser Sources, Custom Browser Docks, `window.obsstudio`
- [OBS forums: customizing OBS Studio](https://obsproject.com/forum/threads/customizing-obs-studio.177049/) — scene collection import/export
