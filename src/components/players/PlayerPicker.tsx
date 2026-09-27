import { useRef, useState } from "react";
import { LuCheck } from "react-icons/lu";
import { Avatar } from "@/components/ui/Avatar";
import { LuX } from "react-icons/lu";
import { dialogClasses } from "@/components/ui/cardStyles";
import { useDialog } from "@/hooks/useDialog";
import { usePlayers } from "@/hooks/usePlayers";
import { useT } from "@/i18n";
import type { Player } from "@/types";

/** Long enough to see the row light up, short enough not to feel slow. */
const PICK_DELAY_MS = 180;

/** "Á" files under A, a digit or "_Invitado" under #. */
const letterOf = (name: string) => {
  const c = name.normalize("NFD").charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
};

/**
 * Pick a player on the club's tablet — the roster as a phone contacts list:
 * A–Z sections and a rail of letters down the side to jump with. Used for the
 * drill's shooter and every seat of a match started at the table. No search
 * box: on a tablet a keyboard covers half the list.
 */
export default function PlayerPicker({
  open,
  onPick,
  onClose,
  players: candidates,
  title,
}: {
  open: boolean;
  onPick: (player: Player) => void;
  onClose: () => void;
  /** Who can be picked. Defaults to the club's roster. */
  players?: Player[];
  /** Defaults to "Select player". */
  title?: string;
}) {
  const { t } = useT();
  const ref = useDialog(open);
  const { data: roster } = usePlayers();
  const players = candidates ?? roster;
  const heading = title ?? t("common.selectPlayer");
  const sections = useRef(new Map<string, HTMLElement>());
  const [active, setActive] = useState<string | null>(null);
  /** The row just tapped, lit for a beat before the sheet goes, so the tap
   *  reads as "got it" rather than as the list vanishing under the finger. */
  const [tapped, setTapped] = useState<number | null>(null);
  const tap = (p: Player) => {
    if (tapped !== null) return;
    setTapped(p.id);
    setTimeout(() => onPick(p), PICK_DELAY_MS);
    // Cleared once the sheet has slid away, not before, or it would un-light
    // on the way out.
    setTimeout(() => setTapped(null), PICK_DELAY_MS + 400);
  };

  // The tablet's own account is a seat for matches, never a shooter.
  const groups = new Map<string, Player[]>();
  for (const p of (players ?? [])
    .filter((p) => !p.is_device)
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const k = letterOf(p.name);
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  // Only letters somebody's name starts with, "#" last, the way a contacts
  // list does it.
  const letters = [...groups.keys()].sort((a, b) =>
    a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b),
  );

  /** The rail is scrubbed like a phone's: press, then slide along it. */
  const scrub = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(
      ((e.clientY - rect.top) / rect.height) * letters.length,
    );
    const letter = letters[Math.max(0, Math.min(letters.length - 1, i))];
    if (letter !== active) {
      setActive(letter);
      sections.current.get(letter)?.scrollIntoView({ block: "start" });
    }
  };

  return (
    <dialog
      ref={ref}
      className={dialogClasses({
        wide: true,
        className: "p-3! overflow-x-hidden",
      })}
      aria-label={heading}
      // React bubbles a dialog's close event through the component tree, so
      // opened from inside another dialog (the match form) closing this one
      // would close that one too.
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex h-[min(85dvh,48rem)] flex-col gap-1">
        {/* Close up here rather than a Cancel row under the list: every
              line the footer took is a line of names the list loses. */}
        <div className="flex items-center justify-between gap-3 pl-2">
          <h2 className="text-h4 font-semibold text-ink">{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-11 w-11 items-center justify-center rounded-control text-ink-faint transition-colors duration-150 hover:text-ink"
          >
            <LuX className="h-6 w-6" aria-hidden />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 gap-1">
          <div className="min-h-0 flex-1 overflow-y-auto outline-none">
            {letters.map((letter) => (
              <section
                key={letter}
                ref={(el) => {
                  if (el) sections.current.set(letter, el);
                }}
              >
                <h3 className="sticky top-0 z-10 bg-felt px-2 py-0.5 text-caption font-semibold text-ink-faint">
                  {letter}
                </h3>
                <ul>
                  {groups.get(letter)!.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => tap(p)}
                        aria-pressed={tapped === p.id}
                        className={[
                          "flex min-h-12 w-full items-center gap-3 rounded-control px-2 text-left text-h4 text-ink transition-colors duration-150 hover:bg-strike-tint",
                          tapped === p.id ? "bg-strike-tint" : "",
                        ].join(" ")}
                      >
                        <Avatar
                          name={p.name}
                          url={p.avatar_url}
                          seed={p.id}
                          className="h-9 w-9 shrink-0"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {p.name}
                        </span>
                        {tapped === p.id && (
                          <LuCheck
                            className="h-6 w-6 shrink-0 text-strike"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {/* A strip, not a button per letter: the letters share its height
                evenly so all of them fit, and the pressed one grows under the finger. */}
          <nav
            aria-label={heading}
            className="relative flex w-12 shrink-0 cursor-pointer touch-none flex-col select-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              scrub(e);
            }}
            onPointerMove={(e) => active && scrub(e)}
            onPointerUp={() => setActive(null)}
            onPointerCancel={() => setActive(null)}
          >
            {letters.map((letter) => (
              <span
                key={letter}
                className={[
                  "flex min-h-0 flex-1 items-center justify-center text-caption leading-none font-semibold transition-transform duration-100",
                  "text-strike",
                  letter === active ? "z-10 scale-[1.8]" : "",
                ].join(" ")}
              >
                {letter}
              </span>
            ))}
          </nav>
        </div>
      </div>
    </dialog>
  );
}
