import { useRef, useState } from "react";
import { LuChevronDown, LuCheck } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useOutsideClose } from "@/hooks/useOutsideClose";
import { useT } from "@/i18n";

/**
 * The club you are in, and the way to a different one: the clubs you're a member
 * of. Only that — the club's own front page is the first line of the nav below,
 * because going home and changing club are different errands and it read as a
 * trick to find one inside the other. Starting a club is not here either: clubs
 * are asked for at /clubs/new and added by hand, so there is nothing to put
 * behind a "new club" row.
 *
 * One control, mounted in one place at a time — the top of the pinned nav column
 * on a wide screen, the app bar on anything narrower. It used to be a link in
 * the bar *and* a separate switcher in the drawer, which printed the club's name
 * twice a few hundred pixels apart and gave one concept two affordances.
 */
const menuItem =
  "flex h-10 w-full items-center gap-2.5 px-4 text-left text-body text-ink-soft transition-colors duration-150 hover:bg-felt hover:text-ink";

export default function ClubMenu({ className }: { className?: string }) {
  const { t } = useT();
  const { activeClub, memberships, setActiveClub } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(open, ref, () => setOpen(false));

  // Only clubs you are actually in are switchable; a pending request is not a
  // place you can go yet.
  const switchable = memberships.filter((m) => m.status === "active");

  return (
    <div ref={ref} className={`relative min-w-0 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("club.switch")}
        // The name truncates in the 19rem column before it truncates in the bar,
        // so the whole of it stays available to a pointer either way.
        title={activeClub?.name}
        className="-mx-1 flex h-10 min-w-0 max-w-full items-center gap-2 rounded-control px-1 text-ink transition-colors duration-150 hover:text-strike"
      >
        <img
          src={activeClub?.logo_url || "/ball.png"}
          alt=""
          // A crest uploaded with a transparent background is drawn for paper,
          // not for a dark bar — so it gets its paper.
          className={`h-8 w-8 shrink-0 rounded-full object-cover ${
            activeClub?.logo_url ? "border border-hairline bg-white" : ""
          }`}
        />
        <span className="min-w-0 truncate text-h4 font-semibold">
          {activeClub?.name ?? t("common.appName")}
        </span>
        <LuChevronDown
          className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card border border-hairline bg-felt-raised"
        >
          {switchable.map((m) => (
            <button
              key={m.club_id}
              type="button"
              role="menuitem"
              onClick={() => {
                setActiveClub(m.club_id);
                setOpen(false);
              }}
              className={menuItem}
            >
              <LuCheck
                className={`h-4 w-4 shrink-0 ${
                  m.club_id === activeClub?.id ? "text-strike" : "opacity-0"
                }`}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{m.club?.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
