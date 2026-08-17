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
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Shot } from "@/components/ui/Shot";
import { useSession } from "@/hooks/useAuth";
import { useT, type Key } from "@/i18n";

export default function LandingPage() {
  const { t } = useT();
  const { user } = useSession();

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
    shot?: { name: string; alt: Key; size: readonly [number, number] };
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
      shot: { name: "challenge", alt: "landing.altChallenge", size: [1200, 900] },
      span: "lg:col-span-5",
    },
    {
      icon: LuTarget,
      title: "landing.f3Title",
      body: "landing.f3Body",
      shot: { name: "drill", alt: "landing.altDrill", size: [1200, 900] },
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
    <>
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
                {/* Nothing to offer someone who is already signed in: the
                    primary button above already takes them into the app, and a
                    second one pointing at the login only invites them to sign
                    in again. */}
                {!user && (
                  <Link
                    to="/app/login"
                    className={buttonClasses({
                      variant: "secondary",
                      className: "px-5",
                    })}
                  >
                    {t("landing.signIn")}
                  </Link>
                )}
              </div>
            </div>

            {/* The phone sits slightly off the grid and bleeds past the right
                edge on desktop: the page reads as wider than the container. */}
            <div className="lg:col-span-6 lg:-mr-10 xl:-mr-20">
              <div className="rise mx-auto max-w-[300px] rounded-sheet border border-hairline-strong bg-felt p-2 lg:ml-auto lg:mr-0 lg:max-w-[340px] lg:rotate-[2deg]">
                <Shot
                  name="phone"
                  alt={t("landing.altHero")}
                  size={[1170, 2532]}
                  priority
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
                size={[2400, 1500]}
              />
            </div>
          </div>
        </section>

        {/* Features as an asymmetric bento: the two text-only tiles are wide,
            the two with screenshots are narrow, so the grid alternates weight
            instead of repeating a row. */}
        <section
          id="features"
          className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6 lg:py-24"
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
                      size={shot.size}
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
          className="border-t border-hairline bg-felt/30 scroll-mt-8"
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
    </>
  );
}
