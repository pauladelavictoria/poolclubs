// Relative rather than the `@/` alias: netlify/functions/youtube-reconcile.mts
// imports this and is bundled standalone by Netlify's esbuild step, where the
// alias doesn't resolve — same reasoning as mailText.ts.
import { translate, type Key, type Vars } from "../../i18n/translate";
import type { BracketSide } from "../../types";

type StageMatch = {
  bracket: BracketSide | string;
  round: number;
  group_no: number | null;
};

/** A fixture's stage, as a heading: "Group 2", "Winners bracket · Round 3",
 *  "Grand final" — "" for a league, which is one undivided stage. Shared by
 *  the match list and the YouTube title, so both name a stage the same way. */
export function stageLabel(
  match: StageMatch,
  t: (key: Key, vars?: Vars) => string,
) {
  if (match.bracket === "group") {
    return t("tournaments.group", { n: match.group_no ?? 0 });
  }
  if (match.bracket === "league") return "";
  if (match.bracket === "final") return t("tournaments.bracket.final");
  return `${t(`tournaments.bracket.${match.bracket === "winners" ? "winners" : "losers"}`)} · ${t("tournaments.round", { n: match.round })}`;
}

/** YouTube's cap on a broadcast title. */
const MAX = 100;

/**
 * One game's video title: "Liga Invierno — Ana vs Luis",
 * "Open · Final — Ana / Bea vs Luis / Marc", or "Ana vs Luis · Club" for a
 * casual game. Spanish only, for the reason mailText.ts gives: nobody's
 * language to read it in.
 *
 * Over the cap, the tournament (or club) name gives way first — the players
 * are the point of the video. YouTube refuses `<` and `>` outright, so they go.
 */
export function broadcastTitle({
  tournament,
  match,
  side1,
  side2,
  clubName,
}: {
  tournament: { name: string } | null;
  match: StageMatch | null;
  side1: string[];
  side2: string[];
  clubName: string;
}) {
  const clean = (s: string) => s.replace(/[<>]/g, "").trim();
  const players = `${side1.map(clean).join(" / ")} vs ${side2.map(clean).join(" / ")}`;

  if (!tournament) {
    const full = `${players} · ${clean(clubName)}`;
    return (full.length <= MAX ? full : players).slice(0, MAX);
  }

  const stage = match ? stageLabel(match, (k, v) => translate("es", k, v)) : "";
  const suffix = `${stage ? ` · ${stage}` : ""} — ${players}`;
  const name = clean(tournament.name);
  const room = MAX - suffix.length;
  if (name.length <= room) return `${name}${suffix}`;
  // Room for at least "X…": shorten the name. Otherwise the players alone.
  return room >= 2
    ? `${name.slice(0, room - 1)}…${suffix}`
    : players.slice(0, MAX);
}
