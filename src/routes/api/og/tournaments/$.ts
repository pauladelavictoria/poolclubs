import { createFileRoute } from "@tanstack/react-router";
import { ogHandler, peopleOf } from "@/libs/server/ogRoute";
import { resolveBracket, tournamentResults } from "@/libs/algorithms/bracket";
import { eventDates } from "@/libs/algorithms/eventDates";
import {
  clubCardSpec,
  podiumIds,
  resultCardSpec,
} from "@/libs/algorithms/cards";
import { translate } from "@/i18n/translate";
import type { TournamentMatch, TournamentStatus } from "@/types";

/** Link previews are Spanish, like every other public head tag in this app —
 *  the crawler's Accept-Language is not the reader's. */
const LOCALE = "es-ES";

/**
 * A tournament's link-preview image: the podium once it is finished, and what
 * phase it is in until then.
 *
 * `status` decides, not whether a podium can be read: a league has a leader
 * the moment there are entrants, and a tournament whose entries had only just
 * opened used to preview as three people on a podium they had not stood on.
 *
 * See libs/server/ogRoute.ts for what every card route shares.
 */
export const Route = createFileRoute("/api/og/tournaments/$")({
  server: {
    handlers: {
      GET: ogHandler(async ({ key, supabase, cardImage, size, markUrl }) => {
        const id = Number(key);
        if (!Number.isInteger(id)) return null;

        // `!inner` with the is_public filter is what makes a private club's
        // tournament indistinguishable from one that does not exist — the
        // same rule the public page itself is built on.
        const { data: tournament } = await supabase
          .from("tournaments")
          .select(
            `id, name, format, starts_on, ends_on, status, points_win, points_play,
               club:clubs!inner(name, slug, logo_url, is_public),
               tournament_players(player_id),
               tournament_matches(*, game:games(player_1_id, player_1_score, player_2_score))`,
          )
          .eq("id", id)
          .eq("club.is_public", true)
          .maybeSingle();

        const club = tournament?.club;
        if (!tournament || !club) return null;

        const status = tournament.status as TournamentStatus;
        const dates = eventDates(
          tournament.starts_on,
          tournament.ends_on,
          LOCALE,
        );
        const chrome = { logoUrl: club.logo_url, markUrl, size };

        const { podium: places } = tournamentResults(
          {
            ...tournament,
            format: tournament.format as
              "double_elim" | "league" | "group_knockout",
          },
          (tournament.tournament_players ?? []).map((e) => e.player_id),
          resolveBracket(
            (tournament.tournament_matches ?? []) as TournamentMatch[],
          ),
        );

        // Open, in groups, or still being played — and a finished one whose
        // podium never resolved, which is a tournament with no results rather
        // than one with a winner we failed to find. The club's layout,
        // borrowed: the tournament is the headline, the club the byline, and
        // the phase where a club's member count would be.
        if (status !== "done" || places.first === null)
          return cardImage.renderClubCard(
            clubCardSpec({
              name: tournament.name,
              place: dates,
              stat: translate("es", `tournaments.status.${status}`),
              club: club.name,
            }),
            chrome,
          );

        const ids = podiumIds(places);
        const people = await peopleOf(supabase, ids);

        return cardImage.renderResultCardPng(
          resultCardSpec({
            club: club.name,
            title: tournament.name,
            subtitle: dates,
            places,
            nameOf: (playerId) => people.get(playerId)?.name ?? "—",
          }),
          {
            ...chrome,
            // In podium order, which is what podiumIds is for.
            avatarUrls: ids.map((id) => people.get(id)?.avatar_url),
          },
        );
      }),
    },
  },
});
