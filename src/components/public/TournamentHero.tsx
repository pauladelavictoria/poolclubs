import { headlineClasses } from "@/components/layout/publicTitleStyles";
import { Link } from "@tanstack/react-router";
import ShareButton from "@/components/social/ShareButton";
import { Avatar } from "@/components/ui/Avatar";
import { CategoriesBadge } from "@/components/ui/CategoriesBadge";
import { Fact } from "@/components/ui/Fact";
import { eventDates } from "@/libs/algorithms/eventDates";
import type { PublicTournament } from "@/queries/public/tournaments";
import { FORMAT_KEY } from "@/types";
import { useT } from "@/i18n";
import { TournamentEntry } from "./TournamentEntry";

/**
 * The name, the way in, and every fact about the tournament as a labelled
 * field. Below those, only what the fields cannot say: a live pill and a real
 * progress bar while it is under way. Nothing while it is open — the entrant
 * count is a field and the entrants themselves are a named section below — and
 * nothing once it is finished, because the results section opens with the
 * podium and saying it twice on one screen read as two different facts.
 */
export function TournamentHero({
  tournament,
  entrantIds,
  partners,
  matchesTotal,
  matchesPlayed,
  url,
}: {
  tournament: PublicTournament;
  entrantIds: number[];
  partners: Map<number, number>;
  matchesTotal: number;
  matchesPlayed: number;
  url: string;
}) {
  const { t, locale } = useT();
  const progress = matchesTotal > 0 ? matchesPlayed / matchesTotal : 0;
  const when = eventDates(tournament.starts_on, tournament.ends_on, locale);

  return (
    <section className="border-b border-hairline">
      <div className="px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* The title alone on its line. Everything that qualifies it is a
              labelled field below rather than a run-on of pills and separators:
              a reader looking for the date was reading a sentence to find it,
              and "Bola 9 · Inscripción abierta" gave neither word a name. */}
          <h1 className={headlineClasses("display", "min-w-0 flex-1 truncate")}>
            {tournament.name}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <TournamentEntry
              tournament={tournament}
              entrantIds={entrantIds}
              partners={partners}
            />
            <ShareButton title={tournament.name} url={url} />
          </div>
        </div>

        {/* A definition list, because that is what this is: every row names the
            question and then answers it. Grid rather than flex so the labels
            line up down the columns — a ragged left edge is what made the old
            run-on hard to scan. Fields with nothing in them are absent, not
            blank: most tournaments open before anyone has dated them. */}
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:gap-x-8 lg:grid-cols-3 xl:grid-cols-4">
          {tournament.club && (
            <Fact
              className="col-span-2 sm:col-span-1"
              label={t("public.publicTournament.hostedBy")}
            >
              <Link
                to="/clubs/$slug"
                params={{ slug: tournament.club.slug }}
                className="inline-flex max-w-full items-center gap-1.5 transition-colors duration-150 hover:text-strike"
              >
                <Avatar
                  name={tournament.club.name}
                  url={tournament.club.logo_url}
                  mark
                  className="h-4 w-4 shrink-0"
                />
                <span className="truncate">{tournament.club.name}</span>
              </Link>
            </Fact>
          )}
          <Fact label={t("tournaments.statusLabel")}>
            {t(`tournaments.status.${tournament.status}`)}
          </Fact>
          <Fact label={t("tournaments.format")}>
            {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
          </Fact>
          <Fact label={t("tournaments.discipline")}>
            {t(`discipline.${tournament.discipline}`)}
          </Fact>
          <Fact label={t("tournaments.category")}>
            <CategoriesBadge categories={tournament.categories} />
          </Fact>
          {tournament.status === "open" && (
            <Fact label={t("public.publicTournament.entrantsLabel")}>
              <span className="font-mono tabular-nums">
                {entrantIds.length}
              </span>
            </Fact>
          )}
          {/* Both of these run long — a date range, and a fee the club wrote in
              its own words — so on a phone they take the whole row rather than
              half of one and lose their tail to the truncation. */}
          {when && (
            <Fact
              className="col-span-2 sm:col-span-1"
              label={t("tournaments.dates")}
            >
              {when}
            </Fact>
          )}
          {tournament.entry_fee && (
            <Fact
              className="col-span-2 sm:col-span-1"
              label={t("tournaments.entryFee")}
            >
              {tournament.entry_fee}
            </Fact>
          )}
        </dl>

        {/* Prizes and anything else the organiser wants entrants to read —
            long-form, so it sits below the fixed facts rather than fighting
            them for a grid cell. */}
        {tournament.notes && (
          <p className="mt-4 whitespace-pre-wrap text-body text-ink">
            {tournament.notes}
          </p>
        )}

        {/* Under the fields: only progress, and only while there is any.
            A count and a row of faces used to sit here too, directly above a
            section that lists the same people larger and with their names on —
            the same four faces twice on one screen, the second time captioned.
            The count is a field now; the faces belong to the list that names
            them. Nothing at all once it is finished: the results section below
            opens with the podium, and the champion twice made the second one
            look like a different fact. */}
        {tournament.status === "running" || tournament.status === "groups" ? (
          <div className="mt-8 max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-strike-tint px-2 py-1 font-mono text-caption font-semibold text-strike">
              <span
                className="live-dot h-1.5 w-1.5 rounded-full bg-strike"
                aria-hidden
              />
              {t("tournaments.status.running")}
            </span>
            {/* ponytail: track tinted from the fill colour rather than a
                surface token, so it reads whatever the header sits on */}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-strike/20">
              <div
                className="h-full rounded-full bg-strike transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-caption tabular-nums text-ink-faint">
              {t("public.publicTournament.progress", {
                done: matchesPlayed,
                total: matchesTotal,
              })}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
