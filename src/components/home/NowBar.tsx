import { toast } from "react-toastify";
import { LuPlus } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useCheckIn, useWhoIsHere } from "@/hooks/useNight";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { AppLink } from "@/components/layout/AppLink";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT } from "@/i18n";

/**
 * The lobby's one action strip: who is here, and the two things a member does
 * on a club night — say they have arrived, and file what they played.
 *
 * The two buttons used to be a screen apart, one in the night block and one
 * under the matches row, both drawn as the page's primary action. Two primary
 * buttons is none: the eye picks neither. They are the same kind of thing —
 * "I am here" and "here is what I played" — so they sit together, and only the
 * one you do repeatedly wears the accent.
 *
 * Above the blocks rather than inside one, because it belongs to the night
 * rather than to any section of it. The blocks below are things to read; this
 * is the thing to do.
 */
export default function NowBar() {
  const { t } = useT();
  const { player } = useAuth();
  const here = useWhoIsHere();
  const checkIn = useCheckIn();

  const imHere = here.some((p) => p.id === player?.id);

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      {/* The way through to the night itself: its tables, its suggestions and
          the call button are a page, and this line is the door to it. */}
      <AppLink
        to="/app/$clubSlug/night"
        viewTransition
        className="group flex min-w-0 items-center gap-3"
      >
        {here.length > 0 ? (
          <>
            {/* Faces, not a list: the answer to "is it worth going down" is
                who, and the count is the caption on them. */}
            <div className="flex -space-x-3">
              {here.slice(0, 8).map((p) => (
                <Avatar
                  key={p.id}
                  name={p.name}
                  url={p.avatar_url}
                  className="h-8 w-8 ring-2 ring-felt"
                />
              ))}
            </div>
            <span className="truncate text-caption text-ink-faint transition-colors duration-150 group-hover:text-strike">
              {t("tonight.count", { n: here.length })}
            </span>
          </>
        ) : (
          <span className="min-w-0 truncate text-caption text-ink-faint transition-colors duration-150 group-hover:text-strike">
            {t("tonight.nobody")}
          </span>
        )}
      </AppLink>

      {/* One row of its own on a phone, so neither button ends up a stub. */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Button
          variant="secondary"
          className="flex-1 justify-center sm:flex-none"
          onClick={() =>
            checkIn.mutate(
              { here: !imHere },
              {
                onError: (err) =>
                  toast.error(
                    t(
                      dbErrorMessage(err, "checkIn", {
                        denied: "common.deniedError",
                      }),
                    ),
                  ),
              },
            )
          }
          disabled={checkIn.isPending || !player}
        >
          {imHere ? t("tonight.youreHere") : t("tonight.imHere")}
        </Button>

        <AppLink
          to="/app/$clubSlug/games/new"
          className={buttonClasses({
            className: "flex-1 justify-center sm:flex-none",
          })}
        >
          <LuPlus className="h-4 w-4" aria-hidden />
          {t("games.add")}
        </AppLink>
      </div>
    </Card>
  );
}
