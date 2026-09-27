import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import {
  type PublicClubDetail,
  type PublicClubTable,
} from "@/queries/public/clubs";
import { useNow } from "@/hooks/useNow";
import {
  isAllDay,
  isEmpty,
  isOpenNow,
  parseSchedule,
  weekRows,
} from "@/libs/algorithms/schedule";
import { useT, type Key } from "@/i18n";
import { ClubTablesFacts } from "./ClubTablesFacts";

/**
 * What the club says it is, when it is open and how to phone it.
 *
 * The whole section is absent for a club that has set none of the three, rather
 * than three empty headings.
 */
export function ClubVisit({
  club,
  tables,
}: {
  club: PublicClubDetail;
  tables: PublicClubTable[];
}) {
  const { t } = useT();
  const schedule = parseSchedule(club.schedule);
  const hasHours = !isEmpty(schedule);
  const hasTableFacts = tables.some((table) => table.type);

  // Null until an effect runs, which is the point: "open now" is `Date.now()`,
  // and rendering it on the server would be a hydration mismatch that resolves
  // wrong for a few minutes either side of closing time. The server renders no
  // pill and the browser fills it in. Same trick useSuggestions uses.
  const now = useNow();
  const open =
    now !== null && hasHours && isOpenNow(schedule, club.timezone, now);

  if (
    !club.description &&
    !club.phone &&
    !club.tables_info &&
    !hasHours &&
    !hasTableFacts
  )
    return null;

  return (
    <section className="mt-8">
      <SectionHead title={t("public.publicClub.visit")} />

      {club.description && (
        // whitespace-pre-line: the admin typed it in a textarea, so their
        // paragraph breaks are the only formatting there is.
        <p className="mt-4 whitespace-pre-line text-body text-ink-soft">
          {club.description}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {hasHours && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 pb-2">
              <h3 className="text-body font-medium text-ink">
                {t("club.schedule.title")}
              </h3>
              {now !== null && (
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-caption font-medium",
                    open ? "bg-strike text-pocket" : "bg-pocket text-ink-faint",
                  ].join(" ")}
                >
                  {t(
                    open ? "club.schedule.openNow" : "club.schedule.closedNow",
                  )}
                </span>
              )}
            </div>
            <dl className="divide-y divide-hairline">
              {weekRows(schedule).map((row) => (
                <div
                  // The first day names the run, and a run is a set of
                  // consecutive days, so it is unique across the week.
                  key={row.days[0]}
                  className="flex justify-between gap-3 py-1.5"
                >
                  <dt className="text-body text-ink-soft">
                    {row.days.length === 7
                      ? t("club.schedule.everyDay")
                      : row.days.length === 1
                        ? t(`club.schedule.day.${row.days[0]}` as Key)
                        : `${t(`club.schedule.day.${row.days[0]}` as Key)} – ${t(
                            `club.schedule.day.${row.days[row.days.length - 1]}` as Key,
                          )}`}
                  </dt>
                  <dd className="text-right font-mono text-body tabular-nums text-ink">
                    {/* "00:00–00:00" is technically what an all-day row
                        holds, and it reads as a typo. */}
                    {isAllDay(row.ranges)
                      ? t("club.schedule.allDay")
                      : row.ranges.length
                        ? row.ranges.map(([f, s]) => `${f}–${s}`).join(", ")
                        : t("club.schedule.closed")}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        {club.tables_info && (
          <Card className="p-4">
            <h3 className="pb-2 text-body font-medium text-ink">
              {t("club.tablesInfo")}
            </h3>
            {/* whitespace-pre-line for the same reason the description has it:
                a textarea's line breaks are the only formatting there is. */}
            <p className="whitespace-pre-line text-body text-ink-soft">
              {club.tables_info}
            </p>
          </Card>
        )}

        {hasTableFacts && <ClubTablesFacts tables={tables} />}

        {club.phone && (
          <Card className="p-4">
            <h3 className="pb-2 text-body font-medium text-ink">
              {t("club.phone")}
            </h3>
            {/* tel: with the string exactly as typed. Stripping spaces would
                be a guess about a format that differs by country, and every
                dialler already ignores them. */}
            <a
              href={`tel:${club.phone}`}
              className="font-mono text-body text-strike transition-colors duration-150 hover:text-strike-light"
            >
              {club.phone}
            </a>
          </Card>
        )}
      </div>
    </section>
  );
}
