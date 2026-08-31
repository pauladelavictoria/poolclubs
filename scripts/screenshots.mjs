/**
 * Screenshots of the pages we show off, in every language, both themes, desktop
 * and phone. Language and theme are cookies (see libs/prefs.ts), so a context
 * with the right two cookies renders the right page in the very first byte —
 * no clicking a toggle and waiting for a re-render.
 *
 * Usage: npm run dev, then `node scripts/screenshots.mjs`. The two /app pages
 * need a session: the first run opens a real browser window, you sign in by
 * hand, and the session is saved to .auth.json and reused after that. Set
 * SHOT_EMAIL and SHOT_PASSWORD instead to skip the window (CI has no hands).
 */
import { chromium, devices } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import en from "../src/i18n/en.json" with { type: "json" };
import es from "../src/i18n/es.json" with { type: "json" };
import fr from "../src/i18n/fr.json" with { type: "json" };

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "screenshots";
const CLUB = process.env.SHOT_CLUB ?? "billar-ruzafa-demo";
const AUTH = process.env.SHOT_AUTH ?? ".auth.json";
const TOURNAMENT = process.env.SHOT_TOURNAMENT ?? "13";
/** A different club on purpose: the player page is shot on a real roster. */
const ME_CLUB = process.env.SHOT_ME_CLUB ?? "poolvalencia";

const DICTS = { en, es, fr };
const LANGS = ["es", "en", "fr"];
const THEMES = ["light", "dark"];
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  phone: devices["iPhone 16 Pro Max"],
};

/** authed: needs a session. fullPage: whole document rather than the fold. */
const PAGES = [
  {
    name: "club-info",
    path: `/clubs/${CLUB}/info`,
    fullPage: true,
    // The page ends in a "join this club" banner that is a sales pitch, not the
    // club. Cut above it. Matched on the body copy, the one string in that
    // section with no club name interpolated into it.
    cutBefore: (lang) => DICTS[lang]["public.publicClub.joinBody"],
  },
  {
    // The shot is the podium and the first rounds under it, not the whole
    // bracket: scroll the results card to the top and take the fold.
    name: "tournament",
    path: `/tournaments/${TOURNAMENT}`,
    fullPage: false,
    viewport: { width: 1440, height: 1100 },
    scrollTo: (lang) => DICTS[lang]["tournaments.results"],
  },
  // Both directory pages end in the same "what about your club?" pitch
  // (PublicShell's CtaBand). Cut above it.
  {
    name: "clubs",
    path: "/clubs",
    fullPage: true,
    cutBefore: (lang) => DICTS[lang]["public.ctaBand.body"],
  },
  {
    name: "tournaments",
    path: "/tournaments",
    fullPage: true,
    cutBefore: (lang) => DICTS[lang]["public.ctaBand.body"],
  },
  {
    name: "me",
    path: `/app/${ME_CLUB}/me`,
    authed: true,
    // Same h-dvh app shell as the ranking: viewport, not fullPage.
    fullPage: false,
  },
  {
    name: "ranking-divisions",
    path: `/app/${CLUB}/ranking`,
    authed: true,
    // The app shell is h-dvh with its own scroll region (ClubLayout), so a
    // fullPage shot is one viewport of app and a screenful of empty canvas.
    fullPage: false,
    // The by-division view is component state, not a URL, so it has to be clicked.
    prepare: (page, lang) =>
      page.getByRole("tab", { name: DICTS[lang]["ranking.byCategory"] }).click(),
  },
  {
    name: "tv",
    path: `/app/${CLUB}/tv`,
    authed: true,
    fullPage: false,
    only: { device: "desktop", viewport: { width: 1920, height: 1080 } },
    // The wall screen is meant to be fullscreen: at 1920 the club sidebar pins
    // itself open (--breakpoint-pinned) and would be in every shot otherwise.
    prepare: (page, lang) =>
      page.getByRole("button", { name: DICTS[lang]["ranking.tvMode"] }).click(),
  },
];

/**
 * A session, not a URL. Watching for the page to leave /app/login calls the
 * Google button a success the moment it lands on accounts.google.com, and saves
 * a state holding nothing but a PKCE verifier. The token cookie is the session —
 * chunked as -auth-token.0/.1 when it is too big for one cookie, and never the
 * -code-verifier that the flow leaves behind.
 */
const hasSession = async (context) =>
  (await context.cookies(BASE)).some((c) => /-auth-token(\.\d+)?$/.test(c.name));

/** Poll, because the cookie is set by a server redirect no page event covers. */
async function waitForSession(context, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await hasSession(context)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for a session cookie — sign-in didn't finish.");
}

/**
 * One session, reused by every context — it is only cookies.
 *
 * A saved .auth.json wins; otherwise credentials in the environment; otherwise
 * a browser window you sign into yourself. Either way the result is written
 * back to .auth.json, so the window appears once and not on every run.
 */
async function session() {
  const saved = await readFile(AUTH, "utf8").catch(() => null);
  if (saved) return JSON.parse(saved);

  const email = process.env.SHOT_EMAIL;
  const password = process.env.SHOT_PASSWORD;
  // Headed only when a person has to type into it.
  const browser = await chromium.launch({ headless: Boolean(email && password) });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/app/login`);

  if (email && password) {
    // React has to be attached before the click, or the browser submits the
    // form natively — a GET to /app/login?email=…&password=… that signs nobody
    // in. A fiber key on the form is hydration having actually happened.
    await page.waitForFunction(() => {
      const form = document.querySelector("form");
      return form && Object.keys(form).some((k) => k.startsWith("__reactFiber$"));
    });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await waitForSession(context, 30_000);
  } else {
    console.log(`Sign in in the window that just opened — waiting up to 5 min.`);
    // Long, because the wait is a human finding a password manager, and with
    // Google a whole consent round trip.
    await waitForSession(context, 300_000);
  }

  const state = await context.storageState();
  await browser.close();
  await writeFile(AUTH, JSON.stringify(state, null, 2));
  console.log(`Session saved to ${AUTH} — delete it to sign in as someone else.`);
  return state;
}

async function shoot(browser, spec, { lang, theme, device, storageState }) {
  const override = spec.only?.viewport ?? (device === "desktop" && spec.viewport);
  const preset = override
    ? { viewport: override, deviceScaleFactor: 2 }
    : VIEWPORTS[device];
  const context = await browser.newContext({
    ...preset,
    colorScheme: theme,
    locale: lang,
    storageState,
  });
  await context.addCookies(
    [
      ["theme", theme],
      ["lang", lang],
    ].map(([name, value]) => ({ name, value, url: BASE })),
  );
  // The install and push asks open on every app launch until answered, and a
  // modal over the page is not the screenshot anyone wants. Their "never again"
  // flags are plain localStorage, set before the app's first paint.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("pc:installPromptDismissed", "1");
      localStorage.setItem("pc:pushPromptDismissed", "1");
    } catch {
      // A context that refuses storage also never shows the modals.
    }
  });
  const page = await context.newPage();
  await page.goto(`${BASE}${spec.path}`, { waitUntil: "networkidle" });
  if (spec.authed && new URL(page.url()).pathname.startsWith("/app/login"))
    throw new Error(`Bounced to login — the saved session expired. Delete ${AUTH} and rerun.`);
  if (spec.prepare) {
    await spec.prepare(page, lang);
    // Clicking a control inside a horizontally scrollable row scrolls that row
    // to reach it, which on a phone shifts the whole column sideways and slices
    // the first characters off every line. Put everything back to the left.
    await page.evaluate(() => {
      window.scrollTo({ left: 0 });
      document.querySelectorAll("*").forEach((el) => {
        if (el.scrollLeft) el.scrollLeft = 0;
      });
    });
  }
  if (spec.scrollTo) {
    await page
      .getByText(spec.scrollTo(lang), { exact: true })
      .first()
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
    // scrollIntoView puts the heading flush against the top edge, where the
    // sticky nav then covers it. Back off by the nav's own height plus a gap.
    await page.evaluate(() =>
      window.scrollBy(0, -((document.querySelector("header")?.offsetHeight ?? 0) + 32)),
    );
  }
  // Fonts and any entry transition; networkidle fires before either finishes.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const clip = spec.cutBefore && {
    x: 0,
    y: 0,
    width: page.viewportSize().width,
    // Its border-box top: the gap above it is the banner's own margin, and
    // taking any of that back off crops the card that ends the page.
    height: await page
      .getByText(spec.cutBefore(lang))
      .first()
      .evaluate((el) => el.closest("section").getBoundingClientRect().top + window.scrollY),
  };
  // Foldered by theme then language, so a whole set is one directory to hand
  // over rather than a flat list of 78 names to filter by eye.
  const dir = `${OUT}/${theme}/${lang}`;
  await mkdir(dir, { recursive: true });
  const file = `${dir}/${spec.name}-${device}.png`;
  await page.screenshot({ path: file, fullPage: spec.fullPage, clip });
  await context.close();
  console.log(file);
}

const storageState = await session();
const browser = await chromium.launch();
for (const spec of PAGES) {
  for (const lang of LANGS)
    for (const theme of THEMES)
      for (const device of Object.keys(VIEWPORTS)) {
        if (spec.only?.device && spec.only.device !== device) continue;
        // Signed in everywhere, public pages included: the header should show
        // the avatar of somebody using the thing, not a "sign in" button.
        await shoot(browser, spec, { lang, theme, device, storageState });
      }
}
await browser.close();
