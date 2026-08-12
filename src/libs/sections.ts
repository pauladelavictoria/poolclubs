import type { Key } from "@/i18n";

/**
 * The four places the app is made of, plus the lobby.
 *
 * Each one is a different object in a pool room and is built to look like it:
 * tournaments are the draw sheet on the wall (few, airy, a status rail),
 * rankings are the chalkboard ladder (dense table, rules, a rank spine),
 * games are the score tape (tightest rows, sticky day rules), drills are the
 * card index (tiles, each leading with its table diagram). Shape is what tells
 * them apart; the mark below is only what confirms it.
 *
 * The mark is a hue off the rack — 2 ball, 4 ball, cloth green, 5 ball — spent
 * on a glyph, an eyebrow, a 2px rail and the nav indicator. Never a fill and
 * never a button: yellow still means "act" and nothing else does.
 *
 * Class names are written out in full on purpose. Tailwind only emits classes
 * it can find as complete literals in source, so `text-mark-${id}` would
 * compile and then silently render in default ink. sections.check.ts holds
 * these against the tokens actually defined in index.css.
 */
export type SectionId = "home" | "tournaments" | "ranking" | "games" | "drills";

export type Section = {
  id: SectionId;
  /** Reuses the nav labels, so a section is named the same everywhere. */
  labelKey: Key;
  /** Glyph and eyebrow colour. */
  mark: string;
  /** The nav indicator bar. */
  markBg: string;
  /** A 2px rail down the side of something that belongs to this section. */
  markBorder: string;
};

/** The lobby has no hue of its own — it is where the other four show up. */
export const SECTIONS: Record<SectionId, Section> = {
  home: {
    id: "home",
    labelKey: "nav.home",
    mark: "text-ink-soft",
    markBg: "bg-ink-soft",
    markBorder: "border-l-ink-soft",
  },
  tournaments: {
    id: "tournaments",
    labelKey: "nav.tournaments",
    mark: "text-mark-tournaments",
    markBg: "bg-mark-tournaments",
    markBorder: "border-l-mark-tournaments",
  },
  ranking: {
    id: "ranking",
    labelKey: "nav.ranking",
    mark: "text-mark-ranking",
    markBg: "bg-mark-ranking",
    markBorder: "border-l-mark-ranking",
  },
  games: {
    id: "games",
    labelKey: "nav.games",
    mark: "text-mark-games",
    markBg: "bg-mark-games",
    markBorder: "border-l-mark-games",
  },
  drills: {
    id: "drills",
    labelKey: "nav.drills",
    mark: "text-mark-drills",
    markBg: "bg-mark-drills",
    markBorder: "border-l-mark-drills",
  },
};
