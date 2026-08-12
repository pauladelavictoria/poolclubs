import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LuBell, LuSwords, LuTrophy, LuNetwork, LuTarget } from "react-icons/lu";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
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
  const { items, unreadCount, markAllSeen } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!player) return null;

  const toggle = () => {
    setOpen((wasOpen) => {
      const nextOpen = !wasOpen;
      // Opening it is what "reading" it means here — there's no per-item
      // dismissal, just this feed's whole unread set.
      if (nextOpen) markAllSeen();
      return nextOpen;
    });
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
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-strike" aria-hidden />
            <span className="sr-only">{t("notifications.unread")}</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card border border-hairline bg-felt-raised"
        >
          <p className="border-b border-hairline px-4 py-3 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
            {t("notifications.title")}
          </p>

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
                    <Link
                      to={item.to}
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
                    </Link>
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
