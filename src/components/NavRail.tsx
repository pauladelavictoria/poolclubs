import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LuMenu } from "react-icons/lu";
import { PRIMARY_NAV } from "@/components/navItems";
import NavDrawer from "@/components/NavDrawer";
import { useT } from "@/i18n";

/**
 * Primary navigation. A bottom tab bar on phones (this app gets used one-handed
 * at the table, cue in the other hand) and a 72px left rail from md up — narrow
 * on purpose: navigation serves the content, it isn't a peer to it.
 */
const tab = ({ isActive }: { isActive: boolean }) =>
  [
    "group flex flex-1 flex-col items-center justify-center gap-1 py-2",
    "md:h-16 md:flex-none md:w-full",
    "transition-[color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
    isActive ? "text-strike" : "text-ink-faint hover:text-ink",
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

        {PRIMARY_NAV.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tab}>
            <Icon className="h-[22px] w-[22px]" />
            <span className="text-[11px] font-medium leading-none">
              {t(labelKey)}
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className={`${tab({ isActive: false })} md:mt-auto`}
          aria-label={t("nav.moreOptions")}
        >
          <LuMenu className="h-[22px] w-[22px]" />
          <span className="text-[11px] font-medium leading-none">
            {t("nav.more")}
          </span>
        </button>
      </nav>
    </>
  );
}
