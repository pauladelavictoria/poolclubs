# YouTube OAuth verification — submission materials

**Status:** drafted, not submitted. Nobody has signed into Google Cloud
Console for this yet. This document is the text and script to use when
somebody does — see docs/youtube-streaming.md §2.7 for why this exists and
why it's the single largest schedule risk in that plan.

I (the assistant) cannot submit this myself: it requires signing into the
project's own Google account, and for a sensitive/restricted scope Google
also wants a screen-recorded video, which needs a live deployment and a human
narrating it. Everything below is what to paste in, and what to record,
when you do.

---

## Before you start

1. **Registro Mercantil data is still missing.** `OPERATOR.legalName` /
   `.nif` / `.address` in
   [src/content/legal.ts:19-27](../src/content/legal.ts#L19-L27) are now
   real (Satellite Studio Digital S.L., CIF B88036348, Calle Juan Bautista
   Corachán 14, 46018 Valencia). `OPERATOR.registry` is still empty, though
   — an S.L. is required to be registered, so LSSI-CE art. 10 technically
   wants the Tomo/Folio/Hoja/Inscripción too. Fill it in and have someone
   check the whole page before submitting anything. The policy now also
   mentions the YouTube/video data category (§2 "Video") and lists YouTube
   as a subprocessor (§5), added alongside this document.
2. **Confirm the scope's current classification.** `.../auth/youtube` was
   "Sensitive" at the time docs/youtube-streaming.md was written
   (2026-09-04). Google moves scopes between Sensitive and Restricted
   occasionally, and Restricted adds an annual third-party security
   assessment (CASA) on top of everything below — check the scope's tier in
   Cloud Console → APIs & Services → OAuth consent screen → Data Access
   before assuming this document's checklist is the whole cost.
3. **Own the domain.** The homepage and privacy policy URLs both have to sit
   under a domain verified in Google Search Console for the account
   submitting this.

---

## OAuth consent screen — what to fill in

| Field | Value |
|---|---|
| App name | PoolClubs |
| User support email | admin@poolclubs.app |
| App logo | `/ball.png` (already used as the app mark elsewhere — see PublicShell.tsx:88) |
| Application home page | `https://poolclubs.app` |
| Application privacy policy | `https://poolclubs.app/legal/privacy` |
| Application terms of service | `https://poolclubs.app/legal/terms` |
| Authorized domains | `poolclubs.app` |
| Developer contact | juancarlos@satellitestud.io |
| Scopes | `https://www.googleapis.com/auth/youtube` |

## Scope justification

Google's form asks, per scope, why a narrower one won't do. For
`.../auth/youtube`:

> PoolClubs lets a pool club stream its tournament matches to YouTube live,
> automatically, from cameras already pointed at its tables. A club's owner
> connects their own YouTube channel once; from then on the app creates one
> reusable live stream per camera and, for each match, creates a live
> broadcast, binds it to that stream, and transitions it through the
> broadcast lifecycle (testing → live → complete) as the match starts and
> finishes — with no further action from the club.
>
> This requires the YouTube Live Streaming API's `liveBroadcasts` and
> `liveStreams` resources (insert, bind, transition, list), none of which
> are covered by a narrower scope: `youtube.readonly` cannot create or
> manage broadcasts at all, and `youtube.upload` only covers uploading a
> finished video file, not creating or controlling a live stream. The full
> `youtube` scope is the minimum that exposes live-broadcast management.
>
> The app never touches anything on the channel outside what it created
> itself — no reading existing videos, no channel settings, no comments or
> playlists. Every write is scoped to broadcasts and streams the app itself
> made on that one connected channel.

## Demo video script

Google requires a screen recording for a sensitive/restricted scope showing
the consent screen and exactly how the scope is used afterward. Narrate each
step; keep it to the real product, not a mockup — a live deployment (or a
faithful local one) with a real Google account consenting.

1. **Sign in to PoolClubs as a club admin.** Show the club's settings →
   Recording tab (`/app/<slug>/club/streaming`).
2. **Click "Connect YouTube."** Show the redirect to Google's own consent
   screen — the scope Google lists there should read "Manage your YouTube
   account." Narrate: *"This is the one scope we request, and it's what the
   next steps use."*
3. **Grant access, land back on PoolClubs.** Show the row now reading
   "Connected as <channel name>" — pulled from `channel_title`
   (`useYoutubeConnection`, `youtube.functions.ts`), nothing else from the
   account is displayed anywhere.
4. **Create a stream for a table.** Pick a table, name it, show the one-time
   ingest URL and stream key that come back (`createClubStream`). Narrate
   that this calls `liveStreams.insert` with `isReusable: true` — created
   once per camera, not per match.
5. **Start a match on that table** (a tournament fixture, or a casual game
   with "Record this game" checked). Cut to the club's YouTube Studio →
   Live Dashboard: within the minute the reconciler ticks, a broadcast
   appears, bound to the stream created in step 4.
6. **Point OBS at the ingest URL/key from step 4** (or a pre-configured
   instance) and confirm the broadcast goes live — show the overlay
   scoreboard on camera if a capture card is available, otherwise it's
   enough to show YouTube Studio reporting the stream as live.
7. **Finish the match.** Show the broadcast transition to "Complete" in
   YouTube Studio within the next minute, unassisted.
8. **Close on the disconnect button** in the same settings tab, narrating
   that revoking access is one click and immediately stops any further use
   of the channel.

Keep narration plain: what's being clicked, what scope is in play, and that
every API call after consent is one of `liveBroadcasts`/`liveStreams` on a
channel the club's own admin explicitly connected.

---

## After submission

Google's review for a sensitive scope typically runs days to a couple of
weeks; Restricted (if that's the current tier) runs longer and may ask for
the CASA assessment separately. Track it from Cloud Console → APIs &
Services → OAuth consent screen, and expect at least one round of follow-up
questions — the justification and video above should pre-empt the most
common ones (why this scope, what exactly gets called, what's shown to the
user), but the reviewer sometimes asks for the exact same demo video staged
in production rather than the local dev build.
