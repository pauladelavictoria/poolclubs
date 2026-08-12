import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LuMenu } from "react-icons/lu";
import { PRIMARY_NAV } from "@/components/navItems";
import { SECTIONS, type SectionId } from "@/libs/sections";
import NavDrawer from "@/components/NavDrawer";
import { useT } from "@/i18n";

/**
 * Primary navigation. A bottom tab bar on phones (this app gets used one-handed
 * at the table, cue in the other hand) and a 72px left rail from md up — narrow
 * on purpose: navigation serves the content, it isn't a peer to it.
 *
 * The active tab wears its section's mark rather than the accent: where you are
 * is not something you can act on, and yellow is needed elsewhere. Colour alone
 * was also the whole affordance before, which left Home — the one tab with no
 * hue of its own — reading as barely selected. Hence the 2px bar.
 *
 * The tab labels are the one place in the app under the 14px floor. Five tabs
 * across a 360px phone is 72px each, and "Ejercicios" is 10 characters — at 14
 * it overflows its own cell. A label under an icon it repeats is also the one
 * kind of text nobody has to read, which is why every platform sets tab bars
 * this size. They truncate rather than wrap if a translation runs long.
 */
const tab = ({
  isActive,
  section,
}: {
  isActive: boolean;
  section?: SectionId;
}) =>
  [
    "group relative flex flex-1 flex-col items-center justify-center gap-1 py-2",
    "md:h-16 md:flex-none md:w-full",
    "transition-[color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
    isActive && section
      ? `${SECTIONS[section].mark} font-medium`
      : "text-ink-faint hover:text-ink",
  ].join(" ");

export default function NavRail() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { t } = useT();

  return (
    <>
      <NavDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <nav
        aria-label={t("nav.primary")}
        className={[
          "fixed inset-x-0 bottom-0 z-40 flex items-stretch",
          "border-t border-hairline bg-felt/90 backdrop-blur-xl",
          "pb-[env(safe-area-inset-bottom)]",
          // From md it detaches from the bottom and becomes a left rail
          "md:inset-x-auto md:left-0 md:top-0 md:h-dvh md:w-[72px] md:flex-col",
          "md:items-center md:gap-1 md:border-r md:border-t-0 md:py-3",
        ].join(" ")}
      >
        <NavLink
          to="/app"
          className="hidden md:mb-2 md:flex md:h-10 md:w-10 md:items-center md:justify-center"
          aria-label={t("nav.home")}
        >
          <img src="/ball.png" alt="" className="h-8 w-8 rounded-full" />
        </NavLink>

        {PRIMARY_NAV.map(({ to, labelKey, icon: Icon, end, section }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            viewTransition
            className={({ isActive }) => tab({ isActive, section })}
          >
            {({ isActive }) => (
              <>
                {/* The indicator sits on the edge the bar is attached to:
                    across the top on a phone, down the left on the rail. */}
                <span
                  aria-hidden
                  className={[
                    "absolute inset-x-3 top-0 h-[2px] rounded-full",
                    "md:inset-x-auto md:inset-y-2 md:left-0 md:h-auto md:w-[2px]",
                    "transition-colors duration-150 ease-[var(--ease-out)]",
                    isActive ? SECTIONS[section].markBg : "bg-transparent",
                  ].join(" ")}
                />
                <Icon className="h-[22px] w-[22px]" />
                <span className="max-w-full truncate px-0.5 text-[12px] font-medium leading-none">
                  {t(labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className={`${tab({ isActive: false })} md:mt-auto`}
          aria-label={t("nav.moreOptions")}
        >
          <LuMenu className="h-[22px] w-[22px]" />
          <span className="max-w-full truncate px-0.5 text-[12px] font-medium leading-none">
            {t("nav.more")}
          </span>
        </button>
      </nav>
    </>
  );
}
