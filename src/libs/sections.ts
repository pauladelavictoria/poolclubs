import type { Key } from "@/i18n";

/**
 * The four places the app is made of, plus the lobby.
 *
 * Each one is a different object in a pool room and is built to look like it:
 * tournaments are the draw sheet on the wall (few, airy, a status rail),
 * rankings are the chalkboard ladder (dense table, rules, a rank spine),
 * games are the score tape (tightest rows, sticky day rules), drills are the
 * card index (tiles, each leading with its table diagram). Shape is what tells
 * them apart, and now it is the only thing that does.
 *
 * There used to be a hue per section — 2 ball, 4 ball, cloth green, 5 ball.
 * They are gone: the club's own colour is the one accent in the room, so a
 * section is a place, not a palette. Anything that wants to be marked wears
 * `strike`, which is whatever ball the club picked (see libs/clubTheme).
 */
export type SectionId = "home" | "tournaments" | "ranking" | "games" | "drills";

export type Section = {
  id: SectionId;
  /** Reuses the nav labels, so a section is named the same everywhere. */
  labelKey: Key;
};

export const SECTIONS: Record<SectionId, Section> = {
  home: { id: "home", labelKey: "nav.home" },
  tournaments: { id: "tournaments", labelKey: "nav.tournaments" },
  ranking: { id: "ranking", labelKey: "nav.ranking" },
  games: { id: "games", labelKey: "nav.games" },
  drills: { id: "drills", labelKey: "nav.drills" },
};
