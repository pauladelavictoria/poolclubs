import { createFileRoute } from "@tanstack/react-router";
import { gameCardSpec, type GameSide } from "@/libs/algorithms/cards";
import { ogHandler, peopleOf } from "@/libs/server/ogRoute";
import { translate, type Key } from "@/i18n/translate";

/** Spanish, like every public head tag in this app: a crawler's
 *  Accept-Language is not the reader's. */
const es = (key: Key) => translate("es", key);

const DATE = { day: "numeric", month: "long", year: "numeric" } as const;

/** One result's link-preview image: two sides, two scores. See
 *  libs/server/ogRoute.ts for what every card route shares. */
export const Route = createFileRoute("/api/og/games/$")({
  server: {
    handlers: {
      GET: ogHandler(async ({ key, supabase, cardImage, size, markUrl }) => {
        // `!inner` with the is_public filter is what makes a private club's
        // result indistinguishable from one that does not exist.
        const { data: game } = await supabase
          .from("games")
          .select("*, club:clubs!inner(name, logo_url, is_public)")
          .eq("id", key)
          .eq("club.is_public", true)
          .maybeSingle();

        const club = game?.club;
        if (!game || !club) return null;

        const seats = [
          [
            game.player_1_id,
            game.mode === "doubles" ? game.player_1b_id : null,
          ],
          [
            game.player_2_id,
            game.mode === "doubles" ? game.player_2b_id : null,
          ],
        ].map((side) => side.filter((seat): seat is number => seat !== null));

        const people = await peopleOf(supabase, seats.flat());
        const nameOf = (seat: number) => people.get(seat)?.name ?? "—";

        const scores = [game.player_1_score, game.player_2_score];
        const sides = seats.map((side, index) => ({
          names: side.map(nameOf),
          score: scores[index],
          won: scores[index] > scores[1 - index],
        })) as [GameSide, GameSide];

        return cardImage.renderGameCardPng(
          gameCardSpec({
            club: club.name,
            subtitle: [
              es(`discipline.${game.discipline}`),
              es(game.mode === "doubles" ? "games.doubles" : "games.single"),
              new Intl.DateTimeFormat("es-ES", DATE).format(
                new Date(game.played_at),
              ),
            ].join(" · "),
            sides,
          }),
          {
            logoUrl: club.logo_url,
            markUrl,
            size,
            avatarUrls: seats.map((side) =>
              side.map((seat) => people.get(seat)?.avatar_url),
            ),
          },
        );
      }),
    },
  },
});
