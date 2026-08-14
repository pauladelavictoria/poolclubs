import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  LuTrophy,
  LuSwords,
  LuTarget,
  LuUsers,
  LuApple,
  LuSmartphone,
  LuMonitor,
  LuArrowRight,
} from "react-icons/lu";
import ThemeToggle from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { LANGS, useT, type Key } from "@/i18n";

/**
 * Drop the real screenshots in `public/landing/` and fill these in. Every slot
 * renders a labelled frame at the right aspect ratio until then, so the layout
 * never shifts when the images land (and nothing here is a fake screenshot
 * drawn out of divs).
 *
 *   phone     1170 x 2532   a portrait screen: the dashboard or the ranking
 *   ranking   2400 x 1500   the ranking page, wide, ideally on a big screen
 *   drill     1200 x 900    a drill with its table diagram
 *   challenge 1200 x 900    the challenges screen
 */
const SHOTS: Record<string, string> = {
  phone: "",
  ranking: "",
  drill: "",
  challenge: "",
};

/**
 * An image slot. With a file it is an image; without one it is a frame the
 * same size, labelled with what belongs there.
 */
function Shot({
  name,
  alt,
  ratio,
  className = "",
}: {
  name: keyof typeof SHOTS | string;
  alt: string;
  /** CSS aspect-ratio, e.g. "16 / 10". Reserved either way, so no layout shift. */
  ratio: string;
  className?: string;
}) {
  const src = SHOTS[name];

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ aspectRatio: ratio }}
        className={`w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={alt}
      className={`flex w-full items-center justify-center border border-dashed border-hairline-strong bg-felt/60 ${className}`}
    >
      <span className="px-4 text-center font-mono text-caption text-ink-ghost">
        {name}
      </span>
    </div>
  );
}

export default function LandingPage() {
  const { t, lang, setLang } = useT();

  useEffect(() => {
    document.documentElement.dataset.smooth = "";
    return () => {
      delete document.documentElement.dataset.smooth;
    };
  }, []);

  const features: {
    icon: typeof LuTrophy;
    title: Key;
    body: Key;
    shot?: { name: string; alt: Key; ratio: string };
    span: string;
  }[] = [
    {
      icon: LuTrophy,
      title: "landing.f1Title",
      body: "landing.f1Body",
      span: "lg:col-span-7",
    },
    {
      icon: LuSwords,
      title: "landing.f2Title",
      body: "landing.f2Body",
      shot: { name: "challenge", alt: "landing.altChallenge", ratio: "4 / 3" },
      span: "lg:col-span-5",
    },
    {
      icon: LuTarget,
      title: "landing.f3Title",
      body: "landing.f3Body",
      shot: { name: "drill", alt: "landing.altDrill", ratio: "4 / 3" },
      span: "lg:col-span-5",
    },
    {
      icon: LuUsers,
      title: "landing.f4Title",
      body: "landing.f4Body",
      span: "lg:col-span-7",
    },
  ];

  const install: { icon: typeof LuApple; title: Key; body: Key }[] = [
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

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-hairline bg-pocket/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <img src="/ball.png" alt="" className="h-7 w-7 rounded-full" />
          <span className="font-semibold tracking-tight text-ink">
            {t("common.appName")}
          </span>

          <nav className="ml-auto hidden items-center gap-6 text-caption text-ink-soft sm:flex">
            <a
              href="#features"
              className="transition-colors duration-150 hover:text-ink"
            >
              {t("landing.nav.features")}
            </a>
            <a
              href="#install"
              className="transition-colors duration-150 hover:text-ink"
            >
              {t("landing.nav.install")}
            </a>
            <Link
              to="/app/login"
              className="transition-colors duration-150 hover:text-ink"
            >
              {t("landing.signIn")}
            </Link>
          </nav>

          <Link
            to="/app"
            className={buttonClasses({
              size: "sm",
              className: "ml-auto sm:ml-6",
            })}
          >
            {t("landing.openApp")}
          </Link>
        </div>
      </header>

      <main>
        {/* Hero: copy left, the product right. Split rather than centred, so
            the screenshot is doing work above the fold instead of decorating
            below it. */}
        <section className="relative">
          <div className="spot pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:pt-24 lg:pb-28">
            <div className="lg:col-span-6 lg:pt-6">
              <p className="rise text-caption uppercase tracking-[0.16em] text-ink-faint">
                {t("landing.eyebrow")}
              </p>
              <h1
                className="rise mt-5 text-4xl font-semibold leading-[1.05] tracking-tighter text-ink md:text-6xl"
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
                <Link
                  to="/app"
                  className={buttonClasses({ className: "group px-5" })}
                >
                  {t("landing.openApp")}
                  <LuArrowRight
                    className="h-4 w-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <Link
                  to="/app/login"
                  className={buttonClasses({
                    variant: "secondary",
                    className: "px-5",
                  })}
                >
                  {t("landing.signIn")}
                </Link>
              </div>
            </div>

            {/* The phone sits slightly off the grid and bleeds past the right
                edge on desktop: the page reads as wider than the container. */}
            <div className="lg:col-span-6 lg:-mr-10 xl:-mr-20">
              <div className="rise mx-auto max-w-[300px] rounded-sheet border border-hairline-strong bg-felt p-2 lg:ml-auto lg:mr-0 lg:max-w-[340px] lg:rotate-[2deg]">
                <Shot
                  name="phone"
                  alt={t("landing.altHero")}
                  ratio="1170 / 2532"
                  className="rounded-[14px]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Full-bleed proof shot. One image, one line about it, nothing else. */}
        <section className="border-y border-hairline bg-felt/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="reveal mx-auto max-w-[42ch] text-center">
              <h2 className="text-h2 font-semibold tracking-tight text-ink">
                {t("landing.rankingShotTitle")}
              </h2>
              <p className="mt-3 text-body text-ink-soft">
                {t("landing.rankingShotBody")}
              </p>
            </div>

            <div className="reveal mt-10 overflow-hidden rounded-sheet border border-hairline-strong bg-pocket">
              <Shot
                name="ranking"
                alt={t("landing.altRanking")}
                ratio="16 / 10"
              />
            </div>
          </div>
        </section>

        {/* Features as an asymmetric bento: the two text-only tiles are wide,
            the two with screenshots are narrow, so the grid alternates weight
            instead of repeating a row. */}
        <section
          id="features"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24"
        >
          <h2 className="reveal max-w-[20ch] text-h1 font-semibold leading-tight tracking-tight text-ink">
            {t("landing.featuresTitle")}
          </h2>

          <div className="mt-10 grid gap-4 lg:grid-cols-12">
            {features.map(({ icon: Icon, title, body, shot, span }) => (
              <article
                key={title}
                className={`reveal group flex flex-col overflow-hidden rounded-card border border-hairline bg-felt transition-colors duration-200 hover:border-hairline-strong ${span}`}
              >
                <div className="p-6">
                  <Icon className="h-5 w-5 text-strike" aria-hidden />
                  <h3 className="mt-4 text-h3 font-semibold tracking-tight text-ink">
                    {t(title)}
                  </h3>
                  <p className="mt-2 max-w-[46ch] text-body text-ink-soft">
                    {t(body)}
                  </p>
                </div>

                {shot && (
                  <div className="mt-auto px-6 pb-0">
                    <Shot
                      name={shot.name}
                      alt={t(shot.alt)}
                      ratio={shot.ratio}
                      className="rounded-t-card border-x border-t border-hairline"
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Install: three platforms separated by hairlines, no card boxes.
            Three short instructions do not need three containers. */}
        <section
          id="install"
          className="border-t border-hairline bg-felt/30 scroll-mt-20"
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
              {install.map(({ icon: Icon, title, body }) => (
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

        {/* The one place a centred block earns it: the last thing on the page
            is a single decision. */}
        <section className="relative border-t border-hairline">
          <div className="spot pointer-events-none absolute inset-x-0 top-0 h-[280px]" />
          <div className="reveal relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-28">
            <h2 className="text-h1 font-semibold tracking-tighter text-ink md:text-display">
              {t("landing.finalTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-[42ch] text-h4 text-ink-soft">
              {t("landing.finalBody")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/app"
                className={buttonClasses({ className: "group px-5" })}
              >
                {t("landing.openApp")}
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

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-8 text-caption text-ink-faint sm:px-6">
          <img src="/ball.png" alt="" className="h-5 w-5 rounded-full" />
          <span>{t("landing.footer")}</span>

          <ThemeToggle className="ml-auto" />

          {/* The visitor may not read the language we guessed, so the picker is
              on the page rather than behind a menu they would have to sign in
              to reach. */}
          <div className="flex gap-4">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                aria-current={l.code === lang}
                className={
                  l.code === lang
                    ? "text-ink"
                    : "transition-colors duration-150 hover:text-ink-soft"
                }
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
