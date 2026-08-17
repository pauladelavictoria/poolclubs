import { useMemo } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { LuPrinter } from "react-icons/lu";
import { renderSVG } from "uqr";
import { useAuth } from "@/hooks/useAuth";
import PageTitle from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { BallGlyph } from "@/components/ui/Ball";
import { useT } from "@/i18n";

/**
 * The invite poster: one A4 sheet to tape next to the table.
 *
 * This is the distribution story. A club owner cannot forward a link to forty
 * members he only sees on Thursdays, but he can print one sheet, and a phone
 * camera does the rest. The `pending` approval gate is what makes a link on a
 * public wall safe — scanning it asks to join, it does not join. The link
 * itself is the club's own slug, the same one that already addresses its
 * public page, so it never goes stale and there is nothing to revoke.
 *
 * It is an advert, not instructions. Somebody walking past a wall reads one
 * thing, so the sheet is two blocks rather than a document: a dark hero that
 * carries the offer, and a white band underneath that carries the action. The
 * three steps are small print inside that band, for the person who has already
 * stopped walking.
 *
 * Sizing is in `cqw` off the sheet, not in `vw` or `pt`: the sheet is a
 * container, so one set of sizes is right on screen at any window width *and* on
 * paper, where 1cqw is 2.1mm of A4. Nothing here needs a print-only type scale.
 *
 * Ink: the app's own three — near-black, cue-ball white, 9-ball yellow — but
 * chosen so the sheet survives a club's black-and-white printer. Yellow never
 * carries text on white; on the dark hero it is only ever the accent line and the
 * badge, both of which greyscale into a legible tint.
 *
 * The QR is generated here rather than fetched from an image service — a poster
 * that needs a third party to be up when you print it is a poster that fails in
 * front of the club. `uqr` is a few hundred lines and no dependencies of its own.
 */
const INK = "#111417";
const YELLOW = "#f4c53c";

/** Modules of white around the symbol. The QR spec says 4; anything less is a
 *  code that scans as text on some phones. */
const QUIET_ZONE = 4;

/** Below this, a member count is an argument against joining. */
const MIN_MEMBERS_TO_BRAG = 4;

export default function InvitePrintPage() {
  const { t } = useT();
  const { activeClub } = useAuth();
  const { origin } = getRouteApi("__root__").useRouteContext();

  const link = `${origin}/app/join/${activeClub.slug}`;
  const host = origin.replace(/^https?:\/\//, "");

  // A four-module quiet zone, which is what the QR spec requires — uqr's default
  // border of 1 is not enough, and a code with too little white around it is
  // where a phone reads the symbol but decodes garbage: the scanner then shows
  // you text with a "copy" button instead of offering to open a link.
  //
  // ecc M for the rest: the sheet gets taped to a wall in a dim room, so a code
  // that still scans with a scuffed corner is worth the handful of extra modules.
  const qr = useMemo(
    () => renderSVG(link, { ecc: "M", border: QUIET_ZONE, pixelSize: 1 }),
    [link],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
      <div className="print:hidden">
        <PageTitle title={t("invite.title")}>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <LuPrinter className="h-4 w-4" aria-hidden />
            {t("invite.print")}
          </Button>
        </PageTitle>
        <p className="mt-2 text-caption text-ink-faint">
          {t("invite.printHint")}
        </p>
      </div>

      {/* A4 is 1/√2, so the sheet keeps that ratio on screen too — what you see
          is what comes out of the printer. print-color-adjust:exact stops the
          browser helpfully dropping the fills to save the club's ink. */}
      <div className="@container aspect-[1/1.414] w-full overflow-hidden bg-white text-black [print-color-adjust:exact] print:aspect-auto print:h-screen">
        <div className="flex h-full flex-col">
          {/* ── The offer ──────────────────────────────────────────────────
              A dark block, because the sheet has to win against a noticeboard
              of white A4. The ball sits half off the corner as texture rather
              than as a logo: it is the product's own motif and it stops the
              block reading as a slide. */}
          <div
            className="relative flex-1 overflow-hidden px-[8cqw] pt-[7cqw] pb-[6cqw] text-white"
            style={{ backgroundColor: INK }}
          >
            {/* The 9, as the drill editor draws it: white ball, yellow stripe,
                no number — a number would make it an object ball in a diagram
                rather than the product's mark. Turned so the stripe runs with
                the corner instead of cutting the block in half, and shaded, so
                at this size it reads as a ball resting there rather than as a
                flat disc. Vector, because public/ball.png is 552px and this is
                11cm on paper, which came out soft. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-[14cqw] -bottom-[16cqw] h-[54cqw] w-[54cqw] opacity-[0.22]"
            >
              <BallGlyph color="yellow" striped shaded spin={-45} />
            </span>

            <div className="relative flex h-full flex-col">
              <header className="flex items-center gap-[2.5cqw]">
                {/* A white disc under the crest: club logos are transparent
                    PNGs as often as not, and one dropped straight onto the dark
                    block loses its own outline. object-contain, so a square
                    crest is not cropped into a circle. */}
                <span className="flex h-[9cqw] w-[9cqw] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-[0.8cqw]">
                  <img
                    src={activeClub.logo_url ?? "/ball.png"}
                    alt=""
                    className="h-full w-full rounded-full object-contain"
                  />
                </span>

                {/* Two lines then an ellipsis: a club name can be 60
                    characters, and it must not shove the badge off the sheet. */}
                <p
                  className="line-clamp-2 min-w-0 text-[2.1cqw] font-semibold tracking-[0.14em] uppercase"
                  style={{ color: YELLOW }}
                >
                  {t("invite.eyebrow", { club: activeClub.name })}
                </p>

                <p
                  className="ml-auto shrink-0 rounded-full px-[2.4cqw] py-[1.1cqw] text-[1.9cqw] font-semibold tracking-tight"
                  style={{ backgroundColor: YELLOW, color: INK }}
                >
                  {t("invite.free")}
                </p>
              </header>

              <div className="mt-auto">
                <h2 className="max-w-[16ch] text-[10cqw] leading-[0.92] font-semibold tracking-[-0.035em]">
                  {t("invite.headline")}
                </h2>

                {/* The accent rule, not an underline: it separates the promise
                    from the explanation without adding a third type size. */}
                <span
                  aria-hidden
                  className="mt-[3.5cqw] block h-[0.8cqw] w-[18cqw] rounded-full"
                  style={{ backgroundColor: YELLOW }}
                />

                <p className="mt-[3.5cqw] max-w-[32ch] text-[2.9cqw] leading-snug text-white/80">
                  {t("invite.sub")}
                </p>

                {/* Real social proof or none: a club of two reads as a club
                    nobody joined. */}
                {activeClub.member_count >= MIN_MEMBERS_TO_BRAG && (
                  <p
                    className="mt-[2cqw] text-[2.3cqw] font-medium"
                    style={{ color: YELLOW }}
                  >
                    {t("invite.members", { n: activeClub.member_count })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── The action ────────────────────────────────────────────────
              White, so the QR has the quiet zone and the contrast a phone
              camera wants, and so the sheet has somewhere to breathe. */}
          <div className="px-[8cqw] pt-[5cqw] pb-[4cqw]">
            <ul className="flex flex-wrap gap-[1.5cqw]">
              {[t("invite.b1"), t("invite.b2"), t("invite.b3")].map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-neutral-300 px-[2.4cqw] py-[1cqw] text-[2cqw] font-medium text-neutral-700"
                >
                  {tag}
                </li>
              ))}
            </ul>

            <div className="mt-[4cqw] flex items-center gap-[5cqw]">
              {/* uqr returns markup with no intrinsic width, so it takes this
                  box. The input is our own join URL — nothing user-written. */}
              <div
                className="w-[34cqw] shrink-0 rounded-[2cqw] p-[1cqw] [&>svg]:h-auto [&>svg]:w-full"
                style={{ border: `0.5cqw solid ${INK}` }}
              >
                <div
                  aria-label={link}
                  role="img"
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[4.6cqw] leading-[1.02] font-semibold tracking-[-0.025em]">
                  {t("invite.scanCta")}
                </p>
                <p className="mt-[1.2cqw] text-[2.2cqw] leading-snug text-neutral-600">
                  {t("invite.scan")}
                </p>

                <ol className="mt-[2.5cqw] space-y-[1cqw] text-[2cqw] leading-snug">
                  {[
                    t("invite.step1"),
                    t("invite.step2", { club: activeClub.name }),
                    t("invite.step3"),
                  ].map((step, i) => (
                    <li key={step} className="flex gap-[1.6cqw]">
                      <span
                        aria-hidden
                        className="flex h-[2.6cqw] w-[2.6cqw] shrink-0 translate-y-[0.2cqw] items-center justify-center rounded-full text-[1.7cqw] font-semibold"
                        style={{ backgroundColor: YELLOW, color: INK }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-neutral-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* The fallback for the phone whose camera won't play, and the
              wordmark. Small print, and it is allowed to look like it. */}
          <footer
            className="flex items-end justify-between gap-[4cqw] px-[8cqw] py-[2.5cqw] text-[1.7cqw] leading-snug text-white"
            style={{ backgroundColor: INK }}
          >
            <div className="min-w-0">
              <p className="text-white/60">{t("invite.orType")}</p>
              <p className="font-mono break-all">
                {host}/app/join/
                <span className="font-semibold" style={{ color: YELLOW }}>
                  {activeClub.slug}
                </span>
              </p>
            </div>
            {/* The wordmark as the app wears it: the ball then the name. Vector
                here too, so the mark is as sharp as the type beside it. */}
            <p className="flex shrink-0 items-center gap-[1.2cqw] text-[2.4cqw] font-semibold tracking-[-0.02em]">
              <span aria-hidden className="h-[3.2cqw] w-[3.2cqw] shrink-0">
                <BallGlyph color="yellow" striped shaded />
              </span>
              {t("common.appName")}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
