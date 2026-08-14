import { LuMenu } from "react-icons/lu";
import { AppLink } from "@/components/AppLink";
import { PRIMARY_NAV } from "@/components/navItems";
import { useT } from "@/i18n";

/**
 * Primary navigation on phones: a bottom tab bar, because this app gets used
 * one-handed at the table with a cue in the other hand. Desktops navigate from
 * the drawer instead — pinned open where there is room for it, one hamburger
 * away where there isn't (see the club layout route).
 *
 * The active tab wears the club's accent. Colour alone was the whole affordance
 * once, which left the one tab without a hue of its own reading as barely
 * selected — and now that every tab shares the same accent, colour could not
 * tell them apart even in principle. Hence the 2px bar, which is what actually
 * says "here".
 *
 * The tab labels are the one place in the app under the 14px floor. Five tabs
 * across a 360px phone is 72px each, and "Ejercicios" is 10 characters — at 14
 * it overflows its own cell. A label under an icon it repeats is also the one
 * kind of text nobody has to read, which is why every platform sets tab bars
 * this size. They truncate rather than wrap if a translation runs long.
 */
const tab = ({ isActive }: { isActive: boolean }) =>
  [
    "group relative flex flex-1 flex-col items-center justify-center gap-1 py-2",
    "transition-[color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
    isActive ? "text-strike font-medium" : "text-ink-faint hover:text-ink",
  ].join(" ");

export default function NavRail({ onMore }: { onMore: () => void }) {
  const { t } = useT();

  return (
    <nav
      aria-label={t("nav.primary")}
      className={[
        // Named so it is snapshotted apart from the root: inside it, the bar
        // cross-fades with the page it isn't part of.
        "[view-transition-name:nav]",
        "fixed inset-x-0 bottom-0 z-40 flex items-stretch md:hidden",
        "border-t border-hairline bg-felt/90 backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]",
      ].join(" ")}
    >
      {PRIMARY_NAV.map(({ to, labelKey, icon: Icon, end }) => (
        <AppLink
          key={String(to)}
          to={to}
          activeOptions={{ exact: end }}
          viewTransition
          inactiveProps={{ className: tab({ isActive: false }) }}
          activeProps={{ className: tab({ isActive: true }) }}
        >
          {({ isActive }: { isActive: boolean }) => (
            <>
              {/* The indicator sits on the edge the bar is attached to. */}
              <span
                aria-hidden
                className={[
                  "absolute inset-x-3 top-0 h-[2px] rounded-full",
                  "transition-colors duration-150 ease-[var(--ease-out)]",
                  isActive ? "bg-strike" : "bg-transparent",
                ].join(" ")}
              />
              <Icon className="h-[22px] w-[22px]" />
              <span className="max-w-full truncate px-0.5 text-[12px] font-medium leading-none">
                {t(labelKey)}
              </span>
            </>
          )}
        </AppLink>
      ))}

      <button
        type="button"
        onClick={onMore}
        className={tab({ isActive: false })}
        aria-label={t("nav.moreOptions")}
      >
        <LuMenu className="h-[22px] w-[22px]" />
        <span className="max-w-full truncate px-0.5 text-[12px] font-medium leading-none">
          {t("nav.more")}
        </span>
      </button>
    </nav>
  );
}
