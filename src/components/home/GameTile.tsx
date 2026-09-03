import { Avatar } from "@/components/ui/Avatar";
import { cardClasses } from "@/components/ui/cardStyles";
import { usePlayerLookup } from "@/hooks/usePlayers";
import { dayLabel, timeOf } from "@/libs/algorithms/dayLabel";
import type { Game } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

/**
 * A finished match, small enough to sit in a row of them.
 *
 * Stacked rather than mirrored: the feed's card puts the two sides either side
 * of a big score, which needs the width of the page. In a card you can see the
 * next one past, the sides read better as two lines with the racks down the
 * right — the same shape as the score tape on the matches page.
 */
export default function GameTile({ game }: { game: Game }) {
  const { t, locale } = useT();
  const { byId } = usePlayerLookup();
  const played = new Date(game.played_at);
  const doubles = game.mode === "doubles";

  const side = (ids: (number | null)[], score: number, won: boolean) => {
    const people = ids
      .map((id) => (id == null ? null : byId.get(id)))
      .filter((p) => !!p);

    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {/* A player who has since left the club keeps the dash the rest of
              the app shows for them, and no face. */}
          {people.map((p) => (
            <Avatar
              key={p.id}
              name={p.name}
              url={p.avatar_url}
              className={`h-7 w-7 ring-2 ring-felt ${won ? "" : "opacity-70"}`}
            />
          ))}
        </div>
        <span
          className={`min-w-0 flex-1 truncate text-caption ${
            won ? "font-semibold text-ink" : "text-ink-faint"
          }`}
        >
          {people.length > 0 ? people.map((p) => p.name).join(" / ") : "—"}
        </span>
        <span
          className={`shrink-0 font-mono text-body tabular-nums ${
            won ? "font-semibold text-ink" : "text-ink-faint"
          }`}
        >
          {score}
        </span>
      </div>
    );
  };

  return (
    // The whole tile is the tap, unlike the feed's card: there are no links
    // inside this one, so the result's page is what the card is for.
    <AppLink
      to="/app/$clubSlug/games/$gameId"
      params={{ gameId: game.id }}
      className={cardClasses({
        interactive: true,
        className: "flex w-full flex-col gap-2 p-3",
      })}
    >
      <p className="truncate text-caption text-ink-ghost">
        <span suppressHydrationWarning>{dayLabel(played, t, locale)}</span>
        {" · "}
        {timeOf(played, locale)}
      </p>
      {side(
        [game.player_1_id, doubles ? game.player_1b_id : null],
        game.player_1_score,
        game.player_1_score > game.player_2_score,
      )}
      {side(
        [game.player_2_id, doubles ? game.player_2b_id : null],
        game.player_2_score,
        game.player_2_score > game.player_1_score,
      )}
    </AppLink>
  );
}
