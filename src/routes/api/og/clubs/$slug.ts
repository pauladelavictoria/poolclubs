import { createFileRoute } from "@tanstack/react-router";
import { clubCardSpec } from "@/libs/algorithms/cards";
import { orderPhotos } from "@/libs/algorithms/photoOrder";
import { clubPhotoFolder } from "@/libs/browser/photoImage";
import { CLUB_PHOTOS_BUCKET } from "@/queries/clubPhotos";
import { ogHandler } from "@/libs/server/ogRoute";
import { translate } from "@/i18n/translate";
import { PERSON_COLS, PLAYER_COLS } from "@/queries/public/shared";

/** How many faces the pile holds before it stops earning its width. */
const FACES = 8;

/**
 * A club's link-preview image: its room behind it, its name, where it is, and
 * who plays there. See libs/server/ogRoute.ts for what every card route shares.
 *
 * No extension on this route, unlike the others: what comes back is a JPEG for
 * a club that has published a photograph of its room and a PNG for one that has
 * not, and a URL ending ".png" that answers with a JPEG is a lie worth not
 * telling. Crawlers read the content type, not the path.
 */
export const Route = createFileRoute("/api/og/clubs/$slug")({
  server: {
    handlers: {
      GET: ogHandler(async ({ key, supabase, cardImage, size, markUrl }) => {
        const { data: club } = await supabase
          .from("clubs")
          .select(
            "id, name, city, country, logo_url, member_count, photo_order",
          )
          .eq("slug", key)
          .eq("is_public", true)
          .maybeSingle();
        if (!club) return null;

        const { data: roster } = await supabase
          .from("players")
          .select(`${PLAYER_COLS}, person:people(${PERSON_COLS})`)
          .eq("club_id", club.id)
          .eq("status", "active");

        // Only the people who chose to be listed, photographs first — the same
        // order and the same opt-out the club's own page applies.
        const people = (roster ?? [])
          .map(
            (row) =>
              row.person as {
                name: string;
                avatar_url: string | null;
                is_public: boolean;
              } | null,
          )
          .filter((person) => person?.is_public)
          .sort((a, b) => Number(!!b?.avatar_url) - Number(!!a?.avatar_url))
          .slice(0, FACES)
          .map((person) => ({
            name: person?.name ?? "",
            avatarUrl: person?.avatar_url,
          }));

        // The club's own photograph of the room, behind the card. Same source,
        // same order and the same first pick as the hero on its public page:
        // the bucket is the list, and photo_order is what the club dragged
        // them into.
        const bucket = supabase.storage.from(CLUB_PHOTOS_BUCKET);
        const { data: objects } = await bucket.list(clubPhotoFolder(club.id), {
          limit: 8,
          sortBy: { column: "name", order: "asc" },
        });
        const photos = (objects ?? [])
          .filter((object) => object.id !== null)
          .map((object) => ({
            path: `${clubPhotoFolder(club.id)}/${object.name}`,
          }));
        const cover = orderPhotos(photos, club.photo_order)[0];

        // JPEG with a photograph of the room, PNG without — the renderer
        // chooses, and ogHandler sends whichever content type it says.
        return cardImage.renderClubCard(
          clubCardSpec({
            name: club.name,
            // The city if there is one, the country only when there is not:
            // "Valencia · ES" reads as a form field, "Valencia" as a place.
            place: club.city || club.country,
            // Spanish, like every public head tag in this app: a crawler's
            // Accept-Language is not the reader's.
            stat: translate("es", "public.publicClubs.members", {
              n: club.member_count,
            }),
          }),
          {
            logoUrl: club.logo_url,
            markUrl,
            size,
            coverUrl: cover
              ? bucket.getPublicUrl(cover.path).data.publicUrl
              : null,
            people,
          },
        );
      }),
    },
  },
});
