import { Card } from "@/components/ui/Card";
import { groupTablesByFacts } from "@/libs/algorithms/tableFacts";
import { type PublicClubTable } from "@/queries/public/clubs";
import { useT, type Key } from "@/i18n";

/**
 * One row per table that has type/size/brand/felt set — the room's own
 * structured facts, beside (not instead of) the admin's free-text
 * tables_info paragraph above. Absent entirely when no table has anything
 * set, same "nothing to show, nothing shown" rule as every other card here.
 */
export function ClubTablesFacts({ tables }: { tables: PublicClubTable[] }) {
  const { t } = useT();
  const withFacts = tables.filter((table) => table.type);
  if (withFacts.length === 0) return null;

  // Same idea as weekRows for opening hours: adjacent tables sharing every
  // fact collapse into one row, so six identical 9ft American Pool tables
  // read as one line instead of six copies of it.
  const rows = groupTablesByFacts(withFacts);

  return (
    <Card className="p-4">
      <h3 className="pb-2 text-body font-medium text-ink">
        {t("tables.title")}
      </h3>
      <ul className="divide-y divide-hairline">
        {rows.map((row) => (
          <li
            key={row.labels.join(",")}
            className="flex items-baseline justify-between gap-3 py-1.5"
          >
            <span className="text-body text-ink">
              {row.labels.length > 1
                ? t("club.tablesFactsCount", { n: row.labels.length })
                : row.labels[0]}
            </span>
            <span className="text-right text-caption text-ink-soft">
              {[
                [
                  row.size,
                  row.type ? t(`tables.type.${row.type}` as Key) : null,
                ]
                  .filter(Boolean)
                  .join(" "),
                row.brand,
                row.felt,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
