import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LuTriangleAlert } from "react-icons/lu";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { operatorClubsQuery, type OperatorClub } from "@/queries/operator";
import { useT } from "@/i18n";

/**
 * Every club, one row each: how many members, how many matches, and when the
 * last one was recorded.
 *
 * The anti-silent-churn instrument. A beta club does not cancel — it goes quiet,
 * and nobody finds out until the visit that never gets booked. So the column
 * that matters is the last match, and the rows that matter are the ones the
 * warning triangle is on: fourteen days of silence is a phone call.
 *
 * Deliberately read-only, and deliberately not suspending: if the SQL function
 * has not been applied to this project the page has to say so rather than fall
 * through to the router's error boundary.
 */
const QUIET_DAYS = 14;

const daysSince = (iso: string | null) =>
  iso === null
    ? null
    : Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export default function OperatorPage() {
  const { t, locale } = useT();
  const { data: clubs, isLoading, error } = useQuery(operatorClubsQuery());

  const sum = (key: keyof OperatorClub) =>
    (clubs ?? []).reduce((total, club) => total + Number(club[key] ?? 0), 0);

  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });

  /** "today" / "3 d ago", plus the exact date in the title — a row is scanned,
   *  and the gap is what is being scanned for, not the calendar day. */
  const lastPlayed = (iso: string | null) => {
    const days = daysSince(iso);
    if (days === null) return t("ops.never");
    if (days === 0) return t("ops.today");
    return t("ops.daysAgo", { n: days });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
      <div>
        <h1 className="text-h2 font-semibold text-ink">{t("ops.title")}</h1>
        <p className="mt-1 text-body text-ink-soft">{t("ops.lede")}</p>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : error ? (
          <p className="p-5 text-body text-accent-red">{t("ops.error")}</p>
        ) : (clubs ?? []).length === 0 ? (
          <EmptyState title={t("ops.empty")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead className="border-b border-hairline text-ink-faint">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">
                    {t("ops.colClub")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("ops.colMembers")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("ops.colPending")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("ops.colGames")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("ops.col7")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("ops.col30")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("ops.colLast")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("ops.colCreated")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {(clubs ?? []).map((club) => {
                  const days = daysSince(club.last_game_at);
                  const quiet = days === null || days >= QUIET_DAYS;

                  return (
                    <tr key={club.id}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {quiet && (
                            <LuTriangleAlert
                              className="h-3.5 w-3.5 shrink-0 text-strike"
                              aria-hidden
                              title={t("ops.quiet", { n: days ?? 0 })}
                            />
                          )}
                          {/* The public page, not the club's own app pages: the
                              operator is not a member of most of these. */}
                          {club.is_public ? (
                            <Link
                              to="/clubs/$slug"
                              params={{ slug: club.slug }}
                              className="font-medium text-ink transition-colors duration-150 hover:text-strike"
                            >
                              {club.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-ink">
                              {club.name}
                            </span>
                          )}
                          {!club.is_public && (
                            <span className="text-ink-faint">
                              ({t("ops.unlisted")})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                        {club.member_count}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                        {club.pending_count || ""}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                        {club.games_total}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                        {club.games_7d}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                        {club.games_30d}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right whitespace-nowrap ${quiet ? "text-strike" : "text-ink-soft"}`}
                        title={
                          club.last_game_at
                            ? shortDate(club.last_game_at)
                            : undefined
                        }
                      >
                        {lastPlayed(club.last_game_at)}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap text-ink-faint">
                        {shortDate(club.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-hairline text-ink-faint">
                <tr>
                  <td className="px-4 py-2 font-medium">{t("ops.totals")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {sum("member_count")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {sum("pending_count") || ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {sum("games_total")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {sum("games_7d")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {sum("games_30d")}
                  </td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
