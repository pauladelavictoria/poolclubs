import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useRouteMeta } from "@/libs/routeMeta";
import { useT } from "@/i18n";

type Props = {
  /**
   * Where leaving goes. Defaults to the route's last crumb — the same place the
   * app bar's back chevron points, so a page declares its way out once.
   */
  to?: LinkProps["to"];
  params?: Record<string, string | number>;
  className?: string;
};

/**
 * The way out of a page-sized form.
 *
 * A form in a dialog has a backdrop to tap and a Cancel beside its Save; a form
 * that is the whole page had neither. The back chevron in the app bar is
 * phone-only, so on a desktop the only ways out of /games/new were the
 * breadcrumb over the title and the browser's own back button — neither of
 * which sits where the decision is made, next to the button that commits.
 *
 * A link rather than `history.back()`: it goes to the page the form belongs
 * under, which is right whether you arrived from the list, from a challenge, or
 * by pasting the URL, and it can't land back on a form already submitted.
 */
export default function CancelLink({ to, params, className }: Props) {
  const { t } = useT();
  const { crumbs } = useRouteMeta();

  // Crumbs come out of useRouteMeta with the current URL's parameters already
  // filled in, so the fallback needs nothing from the call site.
  const target = to ? { to, params } : crumbs.at(-1);
  if (!target?.to) return null;

  // Ids are numbers by the time they reach a link; the router wants strings.
  const merged = Object.fromEntries(
    Object.entries(target.params ?? {}).map(([key, value]) => [
      key,
      String(value),
    ]),
  );

  return (
    <Link
      to={target.to}
      // Same cast, same reason as AppLink's: `to` stays checked, the parameter
      // object cannot be without restating every route's shape here.
      params={merged as never}
      viewTransition
      className={buttonClasses({ variant: "secondary", className })}
    >
      {t("common.cancel")}
    </Link>
  );
}
