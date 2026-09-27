import { useQuery } from "@tanstack/react-query";
import { useClub } from "./publicClubData";
import { clubPhotosQuery } from "@/queries/clubPhotos";
import { orderPhotos } from "@/libs/algorithms/photoOrder";
import { publicClubTablesQuery } from "@/queries/public/clubs";
import { isEmpty, parseSchedule } from "@/libs/algorithms/schedule";
import { useT } from "@/i18n";
import { ClubTabEmpty } from "./ClubTabEmpty";
import { ClubPhotos } from "./ClubPhotos";
import { ClubVisit } from "./ClubVisit";
import { ClubFloorPlanView } from "./ClubFloorPlanView";

/**
 * What a stranger needs before turning up: the room, what the club says it is,
 * when it is open and how to phone it.
 */
export function ClubInfoTab() {
  const { t } = useT();
  const club = useClub();

  // Read here rather than inside ClubPhotos so the empty case below can see
  // whether there is anything on this tab at all. The cover stays in this
  // list — ClubPhotos drops it from the thumbnail strip (it's already the
  // hero's banner) but keeps it in the lightbox, so arrowing left from the
  // first thumbnail still reaches it.
  const { data: storedPhotos = [] } = useQuery(clubPhotosQuery(club.id));
  const photos = orderPhotos(storedPhotos, club.photo_order);
  const { data: tables = [] } = useQuery(publicClubTablesQuery(club.id));

  const hasVisit = Boolean(
    club.description ||
    club.phone ||
    club.tables_info ||
    !isEmpty(parseSchedule(club.schedule)) ||
    tables.some((table) => table.type || table.map_x != null),
  );

  if (photos.length <= 1 && !hasVisit) {
    return <ClubTabEmpty text={t("public.publicClub.noInfo")} />;
  }

  return (
    <>
      <ClubPhotos photos={photos} />
      <ClubVisit club={club} tables={tables} />
      <ClubFloorPlanView tables={tables} />
    </>
  );
}
