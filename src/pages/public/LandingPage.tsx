import { Link } from "@tanstack/react-router";
import { cardClasses } from "@/components/ui/cardStyles";
import { headlineClasses } from "@/components/layout/publicTitleStyles";
import {
  LuTrophy,
  LuSwords,
  LuNetwork,
  LuTarget,
  LuShieldCheck,
  LuMapPin,
  LuUserPlus,
  LuQrCode,
  LuApple,
  LuSmartphone,
  LuMonitor,
  LuArrowRight,
  LuCheck,
  LuChevronDown,
} from "react-icons/lu";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Shot } from "@/components/ui/Shot";
import { BallGlyph, DisciplineBall } from "@/components/ui/Ball";
import { CLUB_BALL_LABEL } from "@/libs/theme/clubTheme";
import type { BallColor } from "@/types";
import { useT, type Key } from "@/i18n";
import { DRILLS_ENABLED } from "@/libs/algorithms/features";

/**
 * The front door. It has two jobs, and it now does them one after the other
 * instead of interleaved.
 *
 * The page it replaced answered "why should our club use this" end to end and
 * left the product itself as a single block of feature cards halfway down, so a
 * reader asking "what is this thing" got an argument before they got a picture.
 * Now the page is two labelled parts:
 *
 *   1. the product, shown. A tour of four real screens, then the feature grid
 *      for everything the four do not fit, then how to install it.
 *   2. the case for a club. Who it is for, what adopting it actually costs in
 *      effort, the objections, the ask.
 *
 * The order is deliberate and not the usual funnel: a club is sent this link
 * cold, and the first question a stranger has is what the thing is. The signup
 * CTA is above the fold either way, and again at the end.
 *
 * Everything a signed-in member uses lives under /app, which is also the PWA's
 * start URL, so installing the app skips the pitch entirely.
 *
 * Copy rules inherited from the public revamp: Spanish is the source language,
 * every visible string is a key in all three dictionaries, and no visible string
 * carries an em-dash (it reads badly at 14px across es/en/fr).
 */

/** One club colour per ball, in the picker's own order. Drawn rather than
 *  described: the club-branding feature is a row of real balls. */
const CLUB_BALLS = Object.keys(CLUB_BALL_LABEL) as BallColor[];

/**
 * The tour: four screens of the running app, one block each.
 *
 * Every one is a real screenshot out of scripts/screenshots.mjs, and the four
 * were picked so that nothing on the page appears twice. The ranking is not
 * here on purpose: it is already the hero's phone and the first feature card's
 * shot, which is two more places than any other screen gets.
 *
 * `size` is the promoted file's own pixel size, so `object-cover` never crops.
 */
const TOUR: {
  shot: string;
  title: Key;
  body: Key;
  alt: Key;
  size: [number, number];
}[] = [
  {
    shot: "tournament",
    title: "landing.t1Title",
    body: "landing.t1Body",
    alt: "landing.t1Alt",
    size: [2000, 1527],
  },
  {
    shot: "tv",
    title: "landing.t2Title",
    body: "landing.t2Body",
    alt: "landing.t2Alt",
    size: [2000, 1125],
  },
  {
    shot: "me",
    title: "landing.t3Title",
    body: "landing.t3Body",
    alt: "landing.t3Alt",
    size: [2000, 1250],
  },
  {
    shot: "club",
    title: "landing.t4Title",
    body: "landing.t4Body",
    alt: "landing.t4Alt",
    size: [2000, 1696],
  },
];

const SEGMENTS: { title: Key; today: Key; now: Key }[] = [
  {
    title: "landing.whoATitle",
    today: "landing.whoAToday",
    now: "landing.whoANow",
  },
  {
    title: "landing.whoBTitle",
    today: "landing.whoBToday",
    now: "landing.whoBNow",
  },
  {
    title: "landing.whoCTitle",
    today: "landing.whoCToday",
    now: "landing.whoCNow",
  },
];

const STEPS: { icon: typeof LuTrophy; title: Key; body: Key }[] = [
  { icon: LuUserPlus, title: "landing.s1Title", body: "landing.s1Body" },
  { icon: LuQrCode, title: "landing.s2Title", body: "landing.s2Body" },
  { icon: LuSwords, title: "landing.s3Title", body: "landing.s3Body" },
  { icon: LuTrophy, title: "landing.s4Title", body: "landing.s4Body" },
];

/**
 * The six areas of the product, as an asymmetric bento: 7/5, 5/7, 7/5. Six
 * items, six cells, no filler tile.
 *
 * `art` alternates deliberately. Two cells reserve a screenshot slot, two carry
 * a washed band of real drawn objects (the three discipline balls, the eight
 * club colours), two are type only. The two washed bands are diagonal in the
 * grid and never siblings: two washes side by side average into one field.
 */
type Feature = {
  icon: typeof LuTrophy;
  title: Key;
  body: Key;
  points: readonly [Key, Key, Key];
  span: string;
  art?: "ranking" | "drill" | "disciplines" | "palette";
};

const FEATURES: Feature[] = [
  {
    icon: LuTrophy,
    title: "landing.f1Title",
    body: "landing.f1Body",
    points: ["landing.f1a", "landing.f1b", "landing.f1c"],
    span: "lg:col-span-7",
    art: "ranking",
  },
  {
    icon: LuSwords,
    title: "landing.f2Title",
    body: "landing.f2Body",
    points: ["landing.f2a", "landing.f2b", "landing.f2c"],
    span: "lg:col-span-5",
  },
  {
    icon: LuNetwork,
    title: "landing.f3Title",
    body: "landing.f3Body",
    points: ["landing.f3a", "landing.f3b", "landing.f3c"],
    span: "lg:col-span-5",
    art: "disciplines",
  },
  {
    icon: LuTarget,
    title: "landing.f4Title",
    body: "landing.f4Body",
    points: ["landing.f4a", "landing.f4b", "landing.f4c"],
    span: "lg:col-span-7",
    art: "drill",
  },
  {
    icon: LuMapPin,
    title: "landing.f5Title",
    body: "landing.f5Body",
    points: ["landing.f5a", "landing.f5b", "landing.f5c"],
    span: "lg:col-span-7",
  },
  {
    icon: LuShieldCheck,
    title: "landing.f6Title",
    body: "landing.f6Body",
    points: ["landing.f6a", "landing.f6b", "landing.f6c"],
    span: "lg:col-span-5",
    art: "palette",
  },
];

/** Eight questions is past the point where a stacked list reads, so they fold.
 *  Native <details>: keyboard and screen-reader behaviour for free, and it
 *  works before hydration, which matters on the page a stranger arrives at. */
const FAQ: { q: Key; a: Key }[] = [
  { q: "landing.q1", a: "landing.a1" },
  { q: "landing.q2", a: "landing.a2" },
  { q: "landing.q3", a: "landing.a3" },
  { q: "landing.q4", a: "landing.a4" },
  { q: "landing.q5", a: "landing.a5" },
  { q: "landing.q6", a: "landing.a6" },
  { q: "landing.q7", a: "landing.a7" },
  { q: "landing.q8", a: "landing.a8" },
];

const INSTALL: { icon: typeof LuApple; title: Key; body: Key }[] = [
  {
    icon: LuApple,
    title: "landing.installIos",
    body: "landing.installIosBody",
  },
  {
    icon: LuSmartphone,
    title: "landing.installAndroid",
    body: "landing.installAndroidBody",
  },
  {
    icon: LuMonitor,
    title: "landing.installDesktop",
    body: "landing.installDesktopBody",
  },
];

/**
 * The seam between the page's two halves. A rule with a word on it, so the
 * change of subject is announced rather than left to the background banding,
 * which the eye reads as rhythm and not as structure.
 */
function PartLabel({ label }: { label: Key }) {
  const { t } = useT();

  return (
    <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 pt-16 sm:px-6 lg:pt-24">
      <span className="text-caption uppercase tracking-[0.16em] text-ink-faint">
        {t(label)}
      </span>
      <span className="h-px flex-1 bg-hairline" aria-hidden />
    </div>
  );
}

/**
 * One screen of the tour. The shot is the block, not an illustration next to
 * it: it takes seven of the twelve columns, and the copy beside it is a
 * heading and a sentence.
 *
 * It does not bleed past the container the way the hero's phone does. A phone
 * mockup can run off the edge and only lose its own bezel, but these are whole
 * desktop screens with the app's nav and headings in them, and clipping one
 * cuts words in half: "PoolClubs" arrives as "Clubs". Whatever the bleed buys
 * in width is not worth a screenshot that reads as broken.
 *
 * Sides alternate, which is what stops four of these reading as a list.
 */
function TourBlock({
  shot,
  title,
  body,
  alt,
  size,
  flipped,
}: (typeof TOUR)[number] & { flipped: boolean }) {
  const { t } = useT();

  return (
    <article className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
      <div className={`pop-in lg:col-span-7 ${flipped ? "lg:order-2" : ""}`}>
        {/* A mat, not a hairline.

            These are screenshots of a dark app on a dark canvas, and the frame
            was bg-felt on pocket with a 10%-white edge: three near-blacks, so
            the shot had no edge at all and read as a hole in the page. Light
            mode had the mirror of the same problem, a white shot in a white
            frame on pale blue.

            felt-raised is the one surface that steps the right way in both
            themes — up from the canvas on dark, down from the shot on light —
            so the mat is visible either way. The stronger hairline and the
            page's own lift do the rest; `lift` is a no-op outside the public
            skin, which is where this lives. */}
        <div className="lift overflow-hidden rounded-sheet border border-hairline-strong bg-felt-raised p-2">
          <Shot
            name={shot}
            alt={t(alt)}
            size={size}
            className="rounded-[10px]"
          />
        </div>
      </div>

      <div className={`lg:col-span-5 ${flipped ? "lg:order-1" : ""}`}>
        <h3 className="reveal text-h2 font-semibold leading-tight tracking-tight text-ink">
          {t(title)}
        </h3>
        <p className="reveal mt-4 max-w-[44ch] text-body leading-relaxed text-ink-soft">
          {t(body)}
        </p>
      </div>
    </article>
  );
}

export default function LandingPage() {
  const { t } = useT();

  return (
    <main>
      {/* Hero: copy left, the product right. Split rather than centred, so the
          screenshot is doing work above the fold instead of decorating below
          it. Four text elements at most, and the CTA is visible without
          scrolling at every width. */}
      <section>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:pt-24 lg:pb-28">
          <div className="lg:col-span-5 lg:pt-6">
            <p className="rise text-caption uppercase tracking-[0.16em] text-ink-faint">
              {t("landing.eyebrow")}
            </p>
            <h1
              // text-display, not a hand-rolled ramp: the public skin pins
              // --text-display to clamp(2.25rem, 5vw, 3.75rem), which is what
              // the three breakpoints spelled out here already resolved to.
              className={headlineClasses("display", "rise mt-5")}
              style={{ animationDelay: "80ms" }}
            >
              {t("landing.title")}
            </h1>
            <p
              className="rise mt-5 max-w-[46ch] text-h4 leading-relaxed text-ink-soft"
              style={{ animationDelay: "160ms" }}
            >
              {t("landing.subtitle")}
            </p>

            <div
              className="rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
              {/* One label for one intent, and it is the label the footer and
                  the directories' CTA band already use. */}
              <Link
                to="/app/clubs/new"
                className={buttonClasses({ className: "group px-5" })}
              >
                {t("public.footer.startClub")}
                <LuArrowRight
                  className="h-4 w-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                to="/clubs"
                className={buttonClasses({
                  variant: "secondary",
                  className: "px-5",
                })}
              >
                {t("landing.seeClub")}
              </Link>
            </div>
          </div>

          {/* The mockup bleeds past the right edge on desktop: the page reads
              as wider than the container.

              No frame around it, unlike every other Shot on this page. It is
              already a laptop, a tablet and three phones with their own
              shadows, and a border and a felt panel behind that is a picture of
              a screen inside a picture of a screen. Nothing to round off and
              nothing to pad, so the wrapper is only the bleed and the tilt. */}
          <div className="relative lg:col-span-7 lg:-mr-10 xl:-mr-24">
            {/* A slab of the accent behind the devices, running off the right
                edge of the page.

                The mockup is a transparent cut-out of five screens, and on the
                page's own background it read as five small dark rectangles
                floating in a lot of nothing. On the one hue the app has, it
                reads as one object. `w-screen` rather than a negative offset so
                it reaches the edge at any width, and it is the only element on
                the page allowed to: the accent is the app's "act" colour and a
                second slab of it anywhere else would be competing with the
                button underneath.

                Inset from the left and short at the top, so the laptop and the
                phones hang off it instead of sitting inside a frame. */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-6 w-screen rounded-l-sheet bg-strike"
            />

            {/* Padded in on three sides and hanging off the bottom: the slab is
                the ground, and the devices breaking its lower edge is what
                keeps it from looking like a framed picture. */}
            <div className="rise relative mx-auto -mb-12 max-w-[600px] px-10 pt-10 lg:ml-auto lg:mr-0 lg:max-w-none lg:pr-4">
              <Shot
                name="hero"
                alt={t("landing.altHero")}
                size={[1400, 1025]}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <PartLabel label="landing.partProduct" />

      {/* The tour. Four screens, alternating sides, and nothing between them
          but air: the shots are the argument here, so the copy beside each one
          is a heading and a sentence and stops. */}
      <section
        id="tour"
        className="mx-auto max-w-6xl scroll-mt-8 px-4 pt-10 pb-16 sm:px-6 lg:pt-14 lg:pb-24"
      >
        <h2 className="reveal max-w-[20ch] text-h1 font-semibold leading-tight tracking-tight text-ink">
          {t("landing.tourTitle")}
        </h2>
        <p className="reveal mt-4 max-w-[58ch] text-h4 leading-relaxed text-ink-soft">
          {t("landing.tourBody")}
        </p>

        <div className="mt-14 flex flex-col gap-16 lg:gap-24">
          {TOUR.map((block, i) => (
            <TourBlock key={block.shot} {...block} flipped={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* The product itself, area by area. Asymmetric bento so the grid
          alternates weight instead of repeating a row of equal cards, and every
          cell spells out three concrete things rather than one adjective. */}
      <section
        id="features"
        className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6 lg:py-24"
      >
        <h2 className="reveal max-w-[20ch] text-h1 font-semibold leading-tight tracking-tight text-ink">
          {t("landing.featuresTitle")}
        </h2>
        <p className="reveal mt-4 max-w-[58ch] text-h4 leading-relaxed text-ink-soft">
          {t("landing.featuresBody")}
        </p>

        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          {/* The drills card leaves with the feature (libs/features). Dropping a
              7-wide cell would leave the last one orphaned on its own row, so
              whatever ends the list runs the full width instead. */}
          {FEATURES.filter(
            (feature) => DRILLS_ENABLED || feature.art !== "drill",
          ).map(({ icon: Icon, title, body, points, span, art }, i, shown) => (
            <article
              key={title}
              className={cardClasses({
                className: `pop-in flex flex-col overflow-hidden ${
                  !DRILLS_ENABLED && i === shown.length - 1
                    ? "lg:col-span-12"
                    : span
                }`,
              })}
            >
              <div className="p-6 sm:p-8">
                <Icon className="h-5 w-5 text-strike" aria-hidden />
                <h3 className="mt-4 text-h3 font-semibold tracking-tight text-ink">
                  {t(title)}
                </h3>
                <p className="mt-2 max-w-[52ch] text-body text-ink-soft">
                  {t(body)}
                </p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {points.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <LuCheck
                        className="mt-1 h-4 w-4 shrink-0 text-strike"
                        aria-hidden
                      />
                      <span className="text-caption text-ink-soft">
                        {t(point)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {art === "ranking" && (
                <div className="mt-auto px-6 pb-0 sm:px-8">
                  <Shot
                    name="ranking"
                    alt={t("landing.altRanking")}
                    size={[2400, 1500]}
                    className="rounded-t-card border-x border-t border-hairline"
                  />
                </div>
              )}

              {art === "drill" && (
                <div className="mt-auto px-6 pb-0 sm:px-8">
                  <Shot
                    name="drill"
                    alt={t("landing.altDrill")}
                    size={[1200, 900]}
                    className="rounded-t-card border-x border-t border-hairline"
                  />
                </div>
              )}

              {/* The three disciplines, drawn as the balls they are named
                  after. A real object out of the product, not an illustration
                  of one. */}
              {art === "disciplines" && (
                <div className="wash wash-soft mt-auto flex items-center gap-5 border-t border-hairline px-6 py-6 sm:px-8">
                  <DisciplineBall discipline="8ball" className="h-11 w-11" />
                  <DisciplineBall discipline="9ball" className="h-11 w-11" />
                  <DisciplineBall discipline="10ball" className="h-11 w-11" />
                  {/* ink-soft rather than ink-faint: this caption sits on the
                      washed surface, not on the card, and faint does not clear
                      AA against felt-raised in light mode. */}
                  <span className="text-caption text-ink-soft">
                    {t("landing.disciplinesNote")}
                  </span>
                </div>
              )}

              {/* The eight colours a club can pick, which is literally the
                  branding picker's palette. */}
              {art === "palette" && (
                <div className="wash wash-soft mt-auto flex flex-wrap items-center gap-2.5 border-t border-hairline px-6 py-6 sm:px-8">
                  {CLUB_BALLS.map((color) => (
                    <BallGlyph
                      key={color}
                      color={color}
                      label={CLUB_BALL_LABEL[color]}
                      className="h-9 w-9"
                    />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Install closes the product half: the last thing you are told about the
          thing itself is that having it costs ten seconds. Banded, because the
          tour and the feature grid above it are both plain and the page needs
          the change of ground to say the part has ended. */}
      <section
        id="install"
        className="scroll-mt-8 border-y border-hairline bg-felt/30"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2 font-semibold tracking-tight text-ink">
              {t("landing.installTitle")}
            </h2>
            <p className="text-caption text-ink-faint">
              {t("landing.storeSoon")}
            </p>
          </div>

          <div className="reveal mt-10 grid divide-y divide-hairline border-t border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {INSTALL.map(({ icon: Icon, title, body }) => (
              <div key={title} className="py-8 sm:px-8 sm:first:pl-0">
                <Icon className="h-5 w-5 text-ink-faint" aria-hidden />
                <h3 className="mt-4 text-h4 font-semibold text-ink">
                  {t(title)}
                </h3>
                <p className="mt-1.5 max-w-[34ch] text-body text-ink-soft">
                  {t(body)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PartLabel label="landing.partClub" />

      {/* Who this is for. Three club types as hairline-divided rows rather than
          three cards: the interesting part is the pair of columns inside each
          row, and a card box around them would only add weight. */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 lg:pt-14 lg:pb-24">
        <h2 className="reveal max-w-[22ch] text-h1 font-semibold leading-tight tracking-tight text-ink">
          {t("landing.whoTitle")}
        </h2>
        <p className="reveal mt-4 max-w-[58ch] text-h4 leading-relaxed text-ink-soft">
          {t("landing.whoBody")}
        </p>

        <div className="mt-12 divide-y divide-hairline border-t border-hairline">
          {SEGMENTS.map(({ title, today, now }) => (
            <article
              key={title}
              className="pop-in grid gap-x-8 gap-y-5 py-8 lg:grid-cols-12"
            >
              <h3 className="text-h3 font-semibold tracking-tight text-ink lg:col-span-4">
                {t(title)}
              </h3>
              {/* Column labels, not eyebrows: they name which side of the
                  comparison you are reading, so they separate on colour and
                  weight rather than on small caps. */}
              <div className="lg:col-span-4">
                <p className="text-caption font-medium text-ink-faint">
                  {t("landing.whoTodayLabel")}
                </p>
                <p className="mt-2 text-body text-ink-soft">{t(today)}</p>
              </div>
              <div className="lg:col-span-4">
                <p className="text-caption font-medium text-strike">
                  {t("landing.whoNowLabel")}
                </p>
                <p className="mt-2 text-body text-ink-soft">{t(now)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* The ask. Not "adopt an app" but "record one night", so the steps are
          an icon list rather than a milestone chart: four small things, in
          order, none of them a decision. */}
      <section className="border-y border-hairline bg-felt/30">
        <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <h2 className="reveal max-w-[20ch] text-h1 font-semibold leading-tight tracking-tight text-ink">
              {t("landing.startTitle")}
            </h2>
            <p className="reveal mt-4 max-w-[52ch] text-h4 leading-relaxed text-ink-soft">
              {t("landing.startBody")}
            </p>

            <ol className="mt-10 flex flex-col gap-7">
              {STEPS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="pop-in flex gap-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-hairline bg-felt text-strike">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-h4 font-semibold text-ink">
                      {t(title)}
                    </h3>
                    <p className="mt-1.5 max-w-[48ch] text-body text-ink-soft">
                      {t(body)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* The objection that stops every club, answered next to the steps
              rather than fifty lines further down. */}
          <aside className="lg:col-span-5 lg:pt-4">
            <div className="wash wash-soft reveal rounded-card border border-hairline p-7">
              <LuShieldCheck className="h-6 w-6 text-strike" aria-hidden />
              <h3 className="mt-4 text-h3 font-semibold tracking-tight text-ink">
                {t("landing.approveTitle")}
              </h3>
              <p className="mt-3 text-body text-ink-soft">
                {t("landing.approveBody")}
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Eight objections, folded. A club reads the two that worry it and
          skips the rest, which a stacked list of eight paragraphs does not
          allow. Plain ground: the steps above it are banded, and two banded
          sections in a row average into one field. */}
      <section>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="reveal text-h1 font-semibold leading-tight tracking-tight text-ink">
            {t("landing.faqTitle")}
          </h2>

          <div className="reveal mt-10 divide-y divide-hairline border-y border-hairline">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-h4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {t(q)}
                  <LuChevronDown
                    className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="pb-6 text-body text-ink-soft">{t(a)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* The one place a centred block earns it: the last thing on the page
          is a single decision. */}
      <section className="border-t border-hairline">
        <div className="reveal mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <h2 className="text-h1 font-semibold text-ink md:text-display">
            {t("landing.finalTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-[42ch] text-h4 text-ink-soft">
            {t("landing.finalBody")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/app/clubs/new"
              className={buttonClasses({ className: "group px-5" })}
            >
              {t("public.footer.startClub")}
              <LuArrowRight
                className="h-4 w-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
          <p className="mt-4 text-caption text-ink-faint">
            {t("landing.ctaNote")}
          </p>
        </div>
      </section>
    </main>
  );
}
