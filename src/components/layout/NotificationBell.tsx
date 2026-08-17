import { useRef, useState } from "react";
import { AppLink } from "@/components/layout/AppLink";
import {
  LuBell,
  LuSwords,
  LuTrophy,
  LuNetwork,
  LuTarget,
} from "react-icons/lu";
import {
  useNotifications,
  type AppNotification,
} from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useOutsideClose } from "@/libs/useOutsideClose";
import { useT } from "@/i18n";

const ICONS: Record<
  AppNotification["kind"],
  React.ComponentType<{ className?: string }>
> = {
  challengeReceived: LuSwords,
  challengeAccepted: LuSwords,
  challengeDeclined: LuSwords,
  tournamentOpen: LuTrophy,
  tournamentAction: LuNetwork,
  drillAdded: LuTarget,
};

/**
 * Everything that concerns you as a player, in one place: challenges you sent
 * that got an answer, tournaments open for your category, tournaments where
 * a fixture is waiting on you. There's no notifications table behind this —
 * see useNotifications — so it's a plain button + panel rather than
 * <details>, which can't be told to mark things read on open.
 */
export default function NotificationBell() {
  const { player } = useAuth();
  const { t } = useT();
  const { items, unreadCount, markAllSeen, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClose(open, ref, () => setOpen(false));

  if (!player) return null;

  // Read off `open` rather than from inside a setOpen updater: React runs an
  // updater during render, and marking things read now updates a store the other
  // bell is subscribed to as well — which is not something a render may do.
  const toggle = () => {
    setOpen(!open);
    // Opening it is what "reading" it means here — there's no per-item
    // dismissal, just this feed's whole unread set.
    if (!open) markAllSeen();
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-label={t("notifications.aria")}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
      >
        <LuBell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <>
            <span
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-strike"
              aria-hidden
            />
            <span className="sr-only">{t("notifications.unread")}</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          // Hangs off whichever edge has the room. In the bar the bell is at the
          // top right of the window, so the panel grows leftwards; in the pinned
          // column it is 40px from the left of a 19rem strip and 20rem of panel
          // does not fit there, so it grows rightwards over the page instead.
          // A breakpoint rather than a prop because those two are the same two
          // sides of --breakpoint-pinned: the bar is display:none above it and
          // the column does not exist below it.
          className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card border border-hairline bg-felt-raised pinned:right-auto pinned:left-0"
        >
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
              {t("notifications.title")}
            </p>
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-caption font-medium text-ink-faint transition-colors duration-150 hover:text-ink"
              >
                {t("notifications.clearAll")}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-caption text-ink-faint">
              {t("notifications.empty")}
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-hairline overflow-y-auto">
              {items.map((item) => {
                const Icon = ICONS[item.kind];
                return (
                  <li key={item.id}>
                    <AppLink
                      to={item.link.to}
                      params={item.link.params}
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 text-body transition-colors duration-150 hover:bg-felt ${
                        item.needsAction ? "bg-strike-tint" : ""
                      }`}
                    >
                      <Icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          item.needsAction ? "text-strike" : "text-ink-faint"
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 text-ink">{item.message}</span>
                    </AppLink>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
