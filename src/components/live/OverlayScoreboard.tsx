import { CountryFlag } from "@/components/ui/Flag";
import { BALL_COLORS } from "@/libs/algorithms/drillGeometry";
import { useT } from "@/i18n";
import type { Discipline } from "@/types";

type OverlaySide = { entries: { name: string; country: string | null }[] };

/**
 * The race plate's own background hints the discipline, flat colour for flat
 * colour with the object ball each one ends the rack on — yellow for 9-ball,
 * blue for 10-ball, black for 8-ball — the same three colours
 * components/ui/Ball.tsx's DisciplineBall draws, read from the same
 * BALL_COLORS rather than restated as new hex here.
 */
const MODALITY_BG: Record<Discipline, string> = {
  "9ball": BALL_COLORS.yellow,
  "10ball": BALL_COLORS.blue,
  "8ball": BALL_COLORS.black,
};

/**
 * The lower third an OBS Browser Source composites over a table's camera —
 * see docs/youtube-streaming.md Phase 1. Deliberately not Scoreboard.tsx:
 * that is a full-screen touch surface with +/− controls, and this has to
 * stay legible over green felt under a pendant lamp instead.
 *
 * Modelled on a broadcast scorebug (Eurosport snooker, Matchroom pool) rather
 * than an app card: names flank the score, which itself flanks a
 * race/discipline emblem, as five separate plates with daylight between
 * them rather than one continuous bar. The club's own mark and the app's sit
 * outside the bar entirely, as top-corner bugs with their own name beside
 * them, the way a broadcast package keeps its sponsor marks separate from
 * the live score graphic.
 *
 * Sized in vmin/vw throughout, never px, so one URL works unchanged at
 * 1920x1080 and at 1280x720. Fixed to the viewport rather than flowing in
 * the page, with a 5vmin margin — the broadcast safe area.
 *
 * No club or app accent colour anywhere in the graphic, and no visual
 * call-out for who is at the table — both scores read the same regardless of
 * `lastSide`. The one colour that does appear is the discipline's own, as the
 * race plate's flat background — see MODALITY_BG.
 */
export default function OverlayScoreboard({
  side1,
  side2,
  score1,
  score2,
  raceTo,
  discipline,
  club,
}: {
  side1: OverlaySide;
  side2: OverlaySide;
  score1: number;
  score2: number;
  raceTo: number;
  discipline: Discipline;
  /** Who is at the table right now. Not drawn — see the note above — but
   *  kept in the props since callers always know it and a future pass may
   *  want it back. */
  lastSide?: 1 | 2 | null;
  live: boolean;
  /** Omitted on the table-keyed route, which has no bracket context. Not
   *  drawn currently — same as `lastSide`/`live` above — but kept here since
   *  callers already compute it. */
  matchNumber?: number;
  club: { slug: string; name: string };
}) {
  const { t } = useT();

  const nameBlock = (n: 1 | 2) => {
    const { entries } = n === 1 ? side1 : side2;

    return (
      <div
        className={[
          // A fixed width, not a cap: both sides must occupy the same width
          // whatever the two names' own lengths are, or a long name on one
          // side pulls the discipline/race emblem off the bar's true centre.
          "flex w-[32vw] min-w-0 shrink-0 items-center gap-[1vmin] px-[2.2vmin]",
          n === 1 ? "justify-end text-right" : "justify-start text-left",
        ].join(" ")}
      >
        {(entries.length > 0 ? entries : [{ name: "—", country: null }]).map(
          (entry, i) => (
            <span key={i} className="flex min-w-0 items-center gap-[1vmin]">
              {i > 0 && (
                <span className="text-white/50">&amp;</span>
              )}
              <span className="flex min-w-0 items-center gap-[1.5vmin] truncate text-[clamp(0.95rem,2.1vmin,1.45rem)] font-semibold tracking-wide text-white">
                {n === 1 && entry.name}
                <CountryFlag
                  country={entry.country}
                  className="h-[2vmin] w-[3vmin] shrink-0"
                />
                {n === 2 && entry.name}
              </span>
            </span>
          ),
        )}
      </div>
    );
  };

  const scoreBlock = (n: 1 | 2) => {
    const score = n === 1 ? score1 : score2;

    return (
      <div className="flex w-[8vmin] shrink-0 items-center justify-center px-[1.6vmin]">
        <span
          className="font-mono leading-none font-semibold tabular-nums text-black"
          style={{ fontSize: "clamp(1.5rem,4vmin,2.4rem)" }}
        >
          {score}
        </span>
      </div>
    );
  };

  /** A logo with its name on the right of it. No plate and no shadow on the
   *  mark itself — a club's own crest is already opaque; only the name gets
   *  a text shadow, so it reads over whatever the camera happens to show
   *  underneath rather than a painted box. */
  const corner = (
    src: string,
    name: string,
    side: "left" | "right",
    onError?: React.ReactEventHandler<HTMLImageElement>,
  ) => (
    <div
      className={[
        "fixed top-[5vmin] flex items-center gap-[1.2vmin]",
        side === "left" ? "left-[5vmin]" : "right-[5vmin]",
      ].join(" ")}
    >
      <img
        src={src}
        alt=""
        className="h-[4vmin] w-[4vmin] shrink-0 rounded-full bg-white/10 object-contain"
        onError={onError}
      />
      {/* The shadow lives on this wrapper, not on the truncating span inside
          it: `truncate` is `overflow: hidden`, which clips a `text-shadow`
          against its own box — the top and sides were being cut flat. A
          `filter: drop-shadow` one level up isn't clipped by the inner
          element's overflow, so it renders whole around whatever the span
          ends up painting, ellipsis and all. */}
      <div
        className="max-w-[16vw]"
        style={{ filter: "drop-shadow(0 0.15vmin 0.5vmin rgba(0,0,0,0.85))" }}
      >
        <div className="truncate text-[clamp(1.1rem,2.6vmin,1.8rem)] font-bold tracking-wide text-white">
          {name}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {corner(`/api/clubs/${club.slug}/logo`, club.name, "left", (e) => {
        e.currentTarget.style.visibility = "hidden";
      })}
      {corner("/ball.png", t("common.appName"), "right")}

      <div className="fixed inset-x-0 bottom-[5vmin] flex justify-center px-[5vmin]">
        <div
          className="flex items-stretch gap-[0.9vmin]"
          style={{ filter: "drop-shadow(0 0.6vmin 1.8vmin rgba(0,0,0,0.15))" }}
        >
          <div className="flex items-center rounded-[1vmin] bg-black/75 py-[0.8vmin]">
            {nameBlock(1)}
          </div>
          <div className="flex items-center rounded-[1vmin] bg-white py-[0.6vmin]">
            {scoreBlock(1)}
          </div>

          <div
            className="flex h-[7vmin] w-[7vmin] shrink-0 items-center justify-center rounded-[1vmin]"
            style={{ background: MODALITY_BG[discipline] }}
          >
            <span
              className="text-[clamp(0.9rem,2.1vmin,1.4rem)] font-semibold whitespace-nowrap"
              style={{
                color: discipline === "8ball" ? "#fff" : "#000",
                opacity: 0.75,
              }}
            >
              ({raceTo})
            </span>
          </div>

          <div className="flex items-center rounded-[1vmin] bg-white py-[0.6vmin]">
            {scoreBlock(2)}
          </div>
          <div className="flex items-center rounded-[1vmin] bg-black/75 py-[0.8vmin]">
            {nameBlock(2)}
          </div>
        </div>
      </div>
    </>
  );
}
