import { describe, expect, it } from "vitest";
import {
  encoderDown,
  nextStreamStep,
  wantedMatch,
  type ActiveSession,
  type WantedMatch,
} from "./streamSession";

const match = (over: Partial<WantedMatch> = {}): WantedMatch => ({
  id: "m1",
  tournament_match_id: null,
  record_opt_in: true,
  record_privacy: "unlisted",
  ...over,
});
const session = (over: Partial<ActiveSession> = {}): ActiveSession => ({
  id: 7,
  live_match_id: "m1",
  state: "created",
  broadcast_id: null,
  privacy_status: "unlisted",
  ...over,
});

describe("wantedMatch", () => {
  it("records a fixture always and a casual game only when opted in", () => {
    expect(wantedMatch(match({ record_opt_in: false }))).toBeNull();
    expect(
      wantedMatch(match({ record_opt_in: false, tournament_match_id: "f" })),
    ).not.toBeNull();
    expect(wantedMatch(null)).toBeNull();
  });
});

describe("nextStreamStep — created → bound → live → complete", () => {
  it("opens a session for a match that wants one; a fixture is public", () => {
    expect(nextStreamStep(match(), null)).toEqual({
      kind: "open",
      matchId: "m1",
      privacy: "unlisted",
    });
    expect(
      nextStreamStep(
        match({ tournament_match_id: "f", record_privacy: null }),
        null,
      ),
    ).toMatchObject({ privacy: "public" });
  });

  it("inserts a broadcast, then binds the saved one — never inserts twice", () => {
    expect(nextStreamStep(match(), session())).toEqual({
      kind: "insert",
      sessionId: 7,
      privacy: "unlisted",
    });
    // A tick where the bind failed after the insert was saved.
    expect(nextStreamStep(match(), session({ broadcast_id: "b" }))).toEqual({
      kind: "bind",
      sessionId: 7,
      broadcastId: "b",
    });
  });

  it("polls a bound session for the encoder", () => {
    expect(
      nextStreamStep(match(), session({ state: "bound", broadcast_id: "b" })),
    ).toEqual({ kind: "poll", sessionId: 7, broadcastId: "b" });
  });

  it("waits while live and the match is still on", () => {
    expect(
      nextStreamStep(match(), session({ state: "live", broadcast_id: "b" })),
    ).toEqual({ kind: "wait" });
  });

  it("completes a live session whose match ended", () => {
    expect(
      nextStreamStep(null, session({ state: "live", broadcast_id: "b" })),
    ).toEqual({ kind: "complete", sessionId: 7, broadcastId: "b" });
  });

  it("abandons one that never went live, also when a new match replaced it", () => {
    expect(
      nextStreamStep(null, session({ state: "bound", broadcast_id: "b" })),
    ).toEqual({ kind: "abandon", sessionId: 7, broadcastId: "b" });
    expect(
      nextStreamStep(match({ id: "m2" }), session({ state: "bound" })),
    ).toEqual({ kind: "abandon", sessionId: 7, broadcastId: null });
  });

  it("does nothing for an idle table", () => {
    expect(nextStreamStep(null, null)).toEqual({ kind: "wait" });
  });
});

describe("encoderDown", () => {
  const now = Date.parse("2026-09-26T20:10:00Z");
  const started = (minutesAgo: number) => ({
    ...match(),
    started_at: new Date(now - minutesAgo * 60_000).toISOString(),
  });
  const encoder = (status: string, minutesAgo = 0) => ({
    status,
    checked_at: new Date(now - minutesAgo * 60_000).toISOString(),
  });

  it("warns for a recorded match whose stream isn't active", () => {
    expect(encoderDown(started(5), encoder("inactive"), now)).toBe(true);
    expect(encoderDown(started(5), encoder("active"), now)).toBe(false);
  });

  it("warns when the status went stale — the reconciler stopped checking", () => {
    expect(encoderDown(started(10), encoder("active", 4), now)).toBe(true);
  });

  it("gives a new match time for the encoder to start", () => {
    expect(encoderDown(started(1), encoder("inactive", 30), now)).toBe(false);
  });

  it("stays quiet for a match nobody is recording, or a table with no stream", () => {
    expect(
      encoderDown(
        { ...started(5), record_opt_in: false },
        encoder("inactive"),
        now,
      ),
    ).toBe(false);
    expect(encoderDown(started(5), null, now)).toBe(false);
  });
});
