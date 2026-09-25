/**
 * What the recording reconciler (netlify/functions/youtube-reconcile.mts)
 * should do next for one table, given the match it wants recorded and the
 * session it already has. Pure, so the state machine
 * (created → bound → live → complete, or → error) is tested here and the
 * reconciler is only the I/O that carries a step out — see
 * streamSession.test.ts and docs/youtube-streaming.md §2.4.
 */

export type WantedMatch = {
  id: string;
  tournament_match_id: string | null;
  record_opt_in: boolean;
  record_privacy: string | null;
};

export type ActiveSession = {
  id: number;
  live_match_id: string;
  state: string;
  broadcast_id: string | null;
  privacy_status: string;
};

export type StreamStep =
  /** Live, and its match is over: end the broadcast so the VOD is kept. */
  | { kind: "complete"; sessionId: number; broadcastId: string }
  /** Its match is over but it never went live — nothing was broadcast, and
   *  YouTube only completes a broadcast that has been live. Its broadcast, if
   *  one was created, is deleted rather than left on the channel as an empty
   *  "upcoming" entry. */
  | { kind: "abandon"; sessionId: number; broadcastId: string | null }
  /** A match wants recording and has no session yet. */
  | { kind: "open"; matchId: string; privacy: "public" | "unlisted" }
  /** A session with no broadcast: create one and save its id before anything
   *  else, so a failure after this never creates a second one. */
  | { kind: "insert"; sessionId: number; privacy: "public" | "unlisted" }
  /** A broadcast that is saved but not yet bound to the table's stream. */
  | { kind: "bind"; sessionId: number; broadcastId: string }
  /** Bound: go live once YouTube says the encoder is sending. */
  | { kind: "poll"; sessionId: number; broadcastId: string }
  | { kind: "wait" };

/** The match on a table, if it is one to record: a tournament fixture always,
 *  a casual game only when its players opted in. */
export const wantedMatch = <M extends WantedMatch>(match: M | null) =>
  match && (match.tournament_match_id !== null || match.record_opt_in)
    ? match
    : null;

export function nextStreamStep(
  wanted: WantedMatch | null,
  active: ActiveSession | null,
): StreamStep {
  // The match this session was tracking ended — the table went idle, or a new
  // match replaced it. Finish it before anything else.
  if (active && active.live_match_id !== (wanted?.id ?? null)) {
    return active.state === "live" && active.broadcast_id
      ? {
          kind: "complete",
          sessionId: active.id,
          broadcastId: active.broadcast_id,
        }
      : {
          kind: "abandon",
          sessionId: active.id,
          broadcastId: active.broadcast_id,
        };
  }

  if (!wanted) return { kind: "wait" };

  if (!active)
    return {
      kind: "open",
      matchId: wanted.id,
      // A fixture is always public; a casual game is as its players chose.
      privacy: wanted.tournament_match_id
        ? "public"
        : wanted.record_privacy === "public"
          ? "public"
          : "unlisted",
    };

  if (active.state === "created")
    return active.broadcast_id
      ? { kind: "bind", sessionId: active.id, broadcastId: active.broadcast_id }
      : {
          kind: "insert",
          sessionId: active.id,
          privacy: active.privacy_status === "public" ? "public" : "unlisted",
        };

  if (active.state === "bound" && active.broadcast_id)
    return {
      kind: "poll",
      sessionId: active.id,
      broadcastId: active.broadcast_id,
    };

  // Live, with its match still on: nothing to do until it ends.
  return { kind: "wait" };
}
