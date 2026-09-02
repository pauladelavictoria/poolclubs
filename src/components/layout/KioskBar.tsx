import { useRef, useState } from "react";
import {
  LuEllipsisVertical,
  LuExpand,
  LuMoon,
  LuShrink,
  LuSun,
  LuTrash2,
  LuUnlink,
} from "react-icons/lu";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { useClubTables } from "@/hooks/useClubTables";
import { useLiveMatches, useManageLiveMatch } from "@/hooks/useLiveMatch";
import { useAppNavigate } from "@/components/layout/AppLink";
import { LIVE_MATCH_KEYS, dbErrorMessage } from "@/libs/algorithms/dbError";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { pickerClasses } from "@/components/ui/buttonStyles";
import { unpinKiosk } from "@/libs/browser/kiosk";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useOutsideClose } from "@/hooks/useOutsideClose";
import { setTheme, useTheme } from "@/libs/theme/theme";
import { LANGS, useT, type Lang } from "@/i18n";

/**
 * The only chrome a pinned tablet has.
 *
 * Its own component rather than markup inside the club layout, so the queries
 * it needs — the tables, for this one's name — are only made on a device that
 * is actually pinned. A hook cannot be conditional; a component can.
 *
 * Everything the tablet's own pages used to carry in a second header is here:
 * where it is, and the three things anybody standing at it might need. The
 * pages below then render nothing but their content, which on a scoreboard is
 * the whole screen.
 */
export default function KioskBar({
  tableId,
  containerRef,
  floating = false,
}: {
  tableId: number;
  /** The element fullscreen acts on — the whole kiosk shell, so the browser's
   *  chrome goes with the app's. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Laid on the page rather than stacked above it, for the pages that are the
   * whole screen. A row of its own takes height off the top of a scoreboard —
   * which pushes both numerals below the middle of the display and stops the
   * spine short of the top edge. Floating, it is the same four controls in the
   * same corners, over an area of the board that has nothing in it.
   */
  floating?: boolean;
}) {
  const { t, lang, setLang } = useT();
  const { activeClub } = useAuth();
  const { data: tables } = useClubTables();
  // Polled, and it is the whole kiosk that gets it: this bar is mounted for as
  // long as the device is pinned, and the list it keeps warm is the same cache
  // the table page reads to decide there is a match to show. So a match started
  // from a phone at the table reaches this tablet without anybody touching it.
  const { data: live } = useLiveMatches({ poll: true });
  const { abandonMatch } = useManageLiveMatch();
  const appNavigate = useAppNavigate();
  const { isFullscreen, toggle } = useFullscreen(containerRef);
  // Showing the theme you are not in, the same way ThemeToggle does.
  const nextTheme = useTheme() === "dark" ? "light" : "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useOutsideClose(menuOpen, menuRef, () => setMenuOpen(false));

  const table = (tables ?? []).find((tbl) => tbl.id === tableId);
  // The one match this device is for. The list is already in cache — every page
  // this bar sits over reads it — so this is a lookup, not a request.
  const match = (live ?? []).find((m) => m.table_id === tableId);

  return (
    <div
      className={[
        "flex items-start justify-between gap-3 px-3 py-2",
        floating
          ? // Nothing but the controls takes a tap: the strip covers the top of
            // both halves of the board, and the board is what is being pressed.
            "pointer-events-none absolute inset-x-0 top-0 z-30"
          : "shrink-0 items-center border-b border-hairline bg-felt",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {activeClub && (
          <Avatar
            name={activeClub.name}
            url={activeClub.logo_url}
            mark
            className="h-7 w-7 shrink-0"
          />
        )}
        <span className="truncate text-body font-medium text-ink">
          {activeClub?.name}
        </span>
        {table && (
          <>
            <span className="shrink-0 text-ink-ghost" aria-hidden>
              ·
            </span>
            <span className="truncate text-body text-ink-soft">
              {table.label}
            </span>
          </>
        )}
      </div>

      <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
        {/* Ending the match the device is showing. It belongs to whatever is on
            screen, but it lives here: the alternative was a strip of chrome
            under this bar holding one rarely-wanted button, on the one screen
            that wants the whole display. */}
        {match && (
          <ConfirmButton
            size="sm"
            variant="ghost"
            onConfirm={() =>
              abandonMatch.mutate(match.id, {
                // The row is gone, so a scoreboard has nothing left to show.
                // Back to the table, which is this device's own home.
                onSuccess: () =>
                  appNavigate("/app/$clubSlug/tables/$tableId", {
                    tableId,
                  }),
                onError: (err) =>
                  toast.error(
                    t(dbErrorMessage(err, "abandonMatch", LIVE_MATCH_KEYS)),
                  ),
              })
            }
            confirmLabel={t("live.abandonConfirm")}
            className="text-ink-faint"
          >
            <LuTrash2 className="h-4 w-4" aria-hidden />
            {t("live.abandon")}
          </ConfirmButton>
        )}

        {/* Setup, not play. Neither of these is wanted twice a night, and both
            of them sat in the bar all evening next to the one button that is —
            so they are behind the dots and the bar is the table's name, the
            match, and the screen. */}
        <div ref={menuRef} className="relative shrink-0">
          <IconButton
            label={t("nav.moreOptions")}
            size="sm"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((wasOpen) => !wasOpen)}
          >
            <LuEllipsisVertical className="h-4 w-4" aria-hidden />
          </IconButton>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-card border border-hairline bg-felt-raised"
            >
              {/* A tablet is shared, and the person at it may not read the
                  language the last one left it in. */}
              <div className="border-b border-hairline px-4 py-3">
                <p className="text-caption font-medium uppercase tracking-wide text-ink-faint">
                  {t("nav.language")}
                </p>
                <div
                  className="mt-2 flex items-center gap-1"
                  role="group"
                  aria-label={t("nav.language")}
                >
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLang(l.code as Lang)}
                      aria-pressed={l.code === lang}
                      title={l.name}
                      className={`${pickerClasses(l.code === lang)} px-2`}
                    >
                      {l.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Left open, because the second press is the one that unpins and
                  a menu that shut itself would have thrown the question away. */}
              <ConfirmButton
                variant="ghost"
                onConfirm={unpinKiosk}
                confirmLabel={t("kiosk.unpinConfirm")}
                role="menuitem"
                className="w-full justify-start gap-2.5 rounded-none px-4 text-ink-soft"
              >
                <LuUnlink className="h-[18px] w-[18px] shrink-0" aria-hidden />
                {t("kiosk.unpin")}
              </ConfirmButton>
            </div>
          )}
        </div>

        {/* Light or dark, on the bar rather than behind the dots.

            The language picker is setup — set once when the tablet is mounted —
            but the theme is not: the same rail is a bright room at six and a
            dark one at eleven, and whoever is squinting at the board wants it in
            one tap, not three. It sits beside fullscreen because those two are
            the pair that are about the screen rather than about the match.

            Not ThemeToggle: that is the pill built for the row of language
            buttons it lives in elsewhere, and this row is icon buttons. Same
            store either way, so the two can never disagree. */}
        <IconButton
          label={t(`theme.${nextTheme}`)}
          title={t(`theme.${nextTheme}`)}
          size="sm"
          onClick={() => setTheme(nextTheme)}
        >
          {nextTheme === "light" ? (
            <LuSun className="h-4 w-4" aria-hidden />
          ) : (
            <LuMoon className="h-4 w-4" aria-hidden />
          )}
        </IconButton>

        <IconButton
          label={t(isFullscreen ? "common.close" : "ranking.tvMode")}
          size="sm"
          onClick={toggle}
        >
          {isFullscreen ? (
            <LuShrink className="h-4 w-4" aria-hidden />
          ) : (
            <LuExpand className="h-4 w-4" aria-hidden />
          )}
        </IconButton>
      </div>
    </div>
  );
}
