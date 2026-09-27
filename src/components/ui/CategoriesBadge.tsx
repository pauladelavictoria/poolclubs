import type { Category } from "@/types";
import { useT } from "@/i18n";
import { CategoryBadge } from "./CategoryBadge";

/** A tournament's divisions: "all", or a badge for each one it takes. */
export function CategoriesBadge({
  categories,
  className,
}: {
  categories: Category[] | null;
  /** For the "all" text, which has no badge of its own to style. */
  className?: string;
}) {
  const { t } = useT();
  if (!categories)
    return <span className={className}>{t("tournaments.combined")}</span>;
  return (
    <span className="inline-flex gap-1">
      {categories.map((c) => (
        <CategoryBadge key={c} category={c} />
      ))}
    </span>
  );
}
