import { createFileRoute } from "@tanstack/react-router";
import { playerCardSpec } from "@/libs/algorithms/cards";
import { playerRecord, type PlayedGame } from "@/libs/algorithms/playerRecord";
import { ogHandler } from "@/libs/server/ogRoute";
import { PERSON_COLS, PLAYER_COLS } from "@/queries/public/shared";

/** Enough to be their whole history for anyone short of an obsessive, and a
 *  bound on what one preview can cost. */
const GAMES_LIMIT = 1000;

/** The four seats a person can occupy. A game is theirs if any of their player
 *  rows — one per club — is in any of them. */
const SEATS = [
  "player_1_id",
  "player_2_id",
  "player_1b_id",
  "player_2b_id",
] as const;

/** Spanish, like every public head tag in this app: a crawler's
 *  Accept-Language is not the reader's. */
const LABELS = { played: "Partidas", won: "Ganadas", winRate: "Victorias" };

/** "A", "A y B", "A, B y C" — the same sentence the page's description uses. */
const listed = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;

/** A player's link-preview image: their face, their clubs, their record. See
 *  libs/server/ogRoute.ts for what every card route shares. */
export const Route = createFileRoute("/api/og/players/$")({
  server: {
    handlers: {
      GET: ogHandler(async ({ key, supabase, cardImage, size, markUrl }) => {
        // Only their memberships of public clubs, and only active ones —
        // somebody whose every club is hidden has no public profile, so there
        // is no card to draw either.
        const { data: person } = await supabase
          .from("people")
          .select(
            `${PERSON_COLS}, memberships:players!inner(${PLAYER_COLS}, club:clubs!inner(id, name, logo_url, is_public))`,
          )
          .eq("slug", key)
          .eq("memberships.status", "active")
          .eq("memberships.club.is_public", true)
          .maybeSingle();

        const memberships = (person?.memberships ?? []) as {
          id: number;
          club: { id: number; name: string; logo_url: string | null };
        }[];
        if (!person || memberships.length === 0) return null;

        // Every game any of their player rows appears in, across every club
        // they play in — which is what makes the record cross-club, the same
        // as the page's.
        const mine = memberships.map((membership) => membership.id);
        const { data: games } = await supabase
          .from("games")
          .select(
            "player_1_id, player_1b_id, player_2_id, player_2b_id, player_1_score, player_2_score",
          )
          .in(
            "club_id",
            memberships.map((membership) => membership.club.id),
          )
          .or(SEATS.map((seat) => `${seat}.in.(${mine.join(",")})`).join(","))
          .limit(GAMES_LIMIT);

        const record = playerRecord(
          (games ?? []) as PlayedGame[],
          new Set(mine),
        );

        return cardImage.renderPlayerCardPng(
          playerCardSpec({
            name: person.name,
            clubs: listed(memberships.map((m) => m.club.name)),
            stats: [
              { value: String(record.played), label: LABELS.played },
              { value: String(record.won), label: LABELS.won },
              { value: `${record.winRate}%`, label: LABELS.winRate },
            ],
          }),
          {
            // Their face fills the slot a club's logo has on the other cards —
            // on this one they are the subject.
            logoUrl: person.avatar_url,
            markUrl,
            size,
          },
        );
      }),
    },
  },
});
