import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";

/**
 * Prev / n of m / next. The shape GamesPage has had inline; lifted out once the
 * three public directories wanted the same one.
 *
 * Renders nothing when everything fits on one page, so callers don't each guard.
 */
export function Pager({
  page,
  pageSize,
  totalCount,
  onPage,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPage: (page: number) => void;
}) {
  const { t } = useT();
  if (totalCount <= pageSize) return null;

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        {t("common.previous")}
      </Button>
      <span className="font-mono text-caption tabular-nums text-ink-faint">
        {page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPage(page + 1)}
        disabled={page * pageSize >= totalCount}
      >
        {t("common.next")}
      </Button>
    </div>
  );
}
