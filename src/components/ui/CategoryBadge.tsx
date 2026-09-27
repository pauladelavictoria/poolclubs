import type { Category } from "@/types";
import { useT } from "@/i18n";

/**
 * Division. Still no hue — red means "act" and green means "won frame", and a
 * third colour here would spend the budget on a label. Prominence comes from
 * contrast and weight instead: rail surface, full-strength ink, semibold.
 */
export function CategoryBadge({
  category,
  full = false,
}: {
  category: Category;
  full?: boolean;
}) {
  const { t } = useT();
  const label = t(`category.${category}`);

  return (
    <span
      className="inline-flex h-6 items-center rounded-control border border-hairline-strong bg-rail px-2 font-mono text-caption font-semibold uppercase tracking-[0.06em] text-ink"
      title={label}
    >
      {full ? label : t("category.short", { n: category })}
    </span>
  );
}
