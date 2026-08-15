# Public routes revamp: from directory to clubhouse

## Context

The public routes (`/clubs`, `/players`, `/tournaments`, `/drills`, `/search` and their
detail pages) are new and styled only with the app's existing component set. They read
as a *database directory*: four near-identical search + filter-pills + card-grid pages,
then four near-identical detail pages that are a vertical stack of `Card`s with
`CardHeader`s. Every card is small, monochrome, and carries two data points.

The design system (`src/index.css`, "Pool Valencia, a dim pool room") is genuinely good,
but it was designed for the *authed tool*: dim, restrained, one accent, hairline borders,
zero shadows, tight radii. Right choices for a member logging a frame at 11pm. Wrong
choices for a stranger deciding whether this hobby has a community worth joining.

Goal: the public surface should feel like a lively social network for pool players.
References given: fable.co, patreon.com. What those two do mechanically:

- every entity carries **its own colour identity**, so a grid is varied not uniform
- **image-forward** cards, art before text
- **editorial scale contrast**, display type next to 14px meta
- **chunky, generous** radii and spacing, real depth
- **social proof made visible**, faces and counts
- **section rhythm**, never the same grid twice on one page

### Decisions taken

| | |
|---|---|
| **Scope** | Public routes get their own skin. `/app` stays the dim focused tool. Same tokens underneath, public layers on top. |
| **Imagery** | Stock photography now (stable picsum seeds), with explicit slots for custom illustrations dropped in later. Both combined. |
| **Motion** | Native CSS only. No new dependency. Extend the existing `.rise` / `.reveal` (`animation-timeline: view()`) pattern. |

### Design read

**A public discovery surface for a hobby community, with a warm high-energy language,
built as a public-only re-lighting of the existing Pool Valencia tokens.** Chunkier
radii, real tinted lift, the club palette used as multi-hue identity, stock photography,
native scroll-driven motion.

Dials: `DESIGN_VARIANCE 8` · `MOTION_INTENSITY 6` · `VISUAL_DENSITY 4`.

---

## The core mechanism

`src/components/ClubThemeStyle.tsx` already proves it: redefine `--color-strike*` on a
selector and every `text-strike` / `bg-strike-tint` / `border-strike` in the subtree
repaints, zero component edits. `src/index.css:13` uses plain `@theme` (not
`@theme inline`), so Tailwind v4 utilities compile to `var(--token)` and a scoped
redefinition genuinely cascades. **Verified, this is load-bearing.**

The plan applies that move at two scales:

- **`[data-public]`** → a whole skin (warmer surfaces, chunkier radii, real lift) for the
  public route tree.
- **`[data-ball]`** → per-club colour on *individual cards*. This is the Patreon
  per-creator-colour move, and it is the highest-leverage change in the revamp because
  `theme_color` is already on every club row, `CLUB_THEME_PALETTE` already has
  AA-checked shades for both modes, and it is currently used on only 3 pages.

### Specificity arithmetic (get this wrong and nothing applies)

| selector | spec | note |
|---|---|---|
| `@theme` output on `:root` | 0,1,0 in `@layer theme` | unlayered CSS always wins |
| `:root[data-theme="light"]` (exists) | 0,2,0 | unlayered |
| `html:has([data-public])` | 0,1,1 | beats `:root`, loses to the light block |
| `html[data-theme="light"]:has([data-public])` | 0,2,1 | beats the light block ✅ |
| `ClubThemeStyle`'s inline `:root{}` | 0,1,0 | later in document, wins ties |
| `:root [data-ball="blue"]` | 0,2,0 | beats ClubThemeStyle ✅ |
| `:root[data-theme="light"] [data-ball="blue"]` | 0,3,0 | beats everything ✅ |

`html:has()` rather than a bare class, because `body`'s background and lamp gradient sit
*outside* the layout div. Precedented: `html:has([data-app-shell])` already does this at
`src/index.css:165`.

> ### ⚠ The one hard rule
> **`[data-public]` must never redefine `--color-strike*`.** `ClubThemeStyle` emits a bare
> `:root{}` rule from an inline `<style>`; both are specificity 0-1-0 and document order
> decides. Any strike override in the skin is a coin-flip against per-club identity, which
> is the most important thing on the detail pages. The skin re-lights surfaces, ink,
> hairlines, radii and lift only.

> ### ⚠ The second hard rule
> **Lift must be an opt-in `.lift` class, never bolted onto `cardClasses` or
> `rounded-card`.** `MatchCard`, `MatchList` rows and `LeagueTable` rows are shared with
> `/app` and render dozens at a time inside `BracketView`. A blanket shadow turns a bracket
> into a field of floating boxes.

---

## Phase 0 — the skin (CSS only, no component touched)

Two edits. Ship this first and look at it before anything else; it is where you find out
whether the warm surfaces are right.

**`src/routes/_public/route.tsx`** — one attribute on the existing layout div
(`src/routes/_public/route.tsx:23`), which is currently a plain `<div className="flex
min-h-dvh flex-col">`:

```tsx
<div data-public className="flex min-h-dvh flex-col overflow-x-clip">
```

**`src/index.css`** — unlayered, after the `:root[data-theme="dark"]` rule at line 153.
Same four surfaces, four inks, three radii, re-lit:

```css
html:has([data-public]) {
  /* Warm neutral, not blue. The blue-black is the pool room at night; this is
     the bar it opens onto. Same lightness ladder, a wider first step, because a
     card out here carries a photo and has to detach from the canvas. */
  --color-pocket: #0b0a0a;
  --color-felt: #1b1917;
  --color-felt-raised: #262220;
  --color-rail: #332e2a;

  --color-hairline: rgba(255, 243, 230, 0.10);
  --color-hairline-strong: rgba(255, 243, 230, 0.18);

  --color-ink: #f7f3ec;
  --color-ink-soft: #c6bdb2;
  --color-ink-faint: #978d83;
  --color-ink-ghost: #635b53;

  /* Still control < card < sheet, still locked. Just a different lock out here,
     where a card is a poster and not a row. */
  --radius-control: 12px;
  --radius-card: 22px;
  --radius-sheet: 28px;

  --lift: 0 1px 2px rgb(0 0 0 / .40), 0 8px 24px -12px rgb(0 0 0 / .55);
  --lift-strong: 0 2px 4px rgb(0 0 0 / .45), 0 20px 40px -16px rgb(0 0 0 / .70);

  --lamp: color-mix(in srgb, var(--color-strike) 8%, transparent);
  --lamp-strong: color-mix(in srgb, var(--color-strike) 16%, transparent);
}

/* Where the fable/patreon read actually lives: warm paper canvas, white cards
   floating on it, and a real shadow, which light mode can afford and dark never
   could. Shadows tinted with the canvas's own brown, never neutral grey. */
html[data-theme="light"]:has([data-public]) {
  --color-pocket: #f8f4ee;   /* paper, not the app's cool #f3f5f9 */
  --color-felt: #ffffff;
  --color-felt-raised: #f3ece3;
  --color-rail: #e7ded1;

  --color-hairline: rgba(41, 30, 18, 0.09);
  --color-hairline-strong: rgba(41, 30, 18, 0.18);

  --color-ink: #191410;
  --color-ink-soft: #564e45;
  --color-ink-faint: #756b62;
  --color-ink-ghost: #aaa197;

  --lift: 0 1px 2px rgb(41 30 18 / .06), 0 10px 24px -14px rgb(41 30 18 / .22);
  --lift-strong: 0 2px 6px rgb(41 30 18 / .08), 0 22px 44px -18px rgb(41 30 18 / .30);
}
```

Plus, inside the existing `@theme` block, so `.lift` is inert everywhere else:

```css
  /* Off by default. `none` cannot be the off value: box-shadow composes as a
     comma list and `none` inside a list invalidates the whole declaration. A
     fully transparent shadow composes fine and costs nothing. */
  --lift: 0 0 #0000;
  --lift-strong: 0 0 #0000;
```

**These hex values are a judgement call.** Look at them on a real screen in both modes
before locking. Re-measure the contrast ratios with a checker rather than trusting any
number quoted here.

### New utilities

Next to `.rise` / `.reveal` / `.spot`, which is where the file already puts one-offs.

```css
/* Depth as an opt-in class, so /app and the public side share one <Card>.
   Outside [data-public] --lift is transparent, so this is a no-op there. */
.lift {
  box-shadow: var(--lift);
  transition: box-shadow 220ms var(--ease-out), translate 220ms var(--ease-out),
              border-color 150ms var(--ease-out);
}
a.lift:hover, button.lift:hover {
  box-shadow: var(--lift-strong);
  translate: 0 -3px;
}

/* Entrance stagger. --i is the card index. The cap is the point: 24 cards at
   45ms each is a page and a half of waiting, so the tail arrives together.
   An inline animation-delay still wins, so LandingPage's hero delays keep working. */
.rise { animation-delay: calc(min(var(--i, 0), 8) * 45ms); }

/* The club's colour as card art, for the many cards with no image of their own.
   --color-strike is whatever [data-ball] on the card set it to, so eight clubs
   in a grid are eight different cards. --wash tunes strength: card art is loud,
   a hero band behind text is quiet. */
.wash {
  background-color: var(--color-felt-raised);
  background-image:
    radial-gradient(90% 120% at 12% 0%,
      color-mix(in srgb, var(--color-strike) var(--wash, 34%), transparent) 0%, transparent 68%),
    radial-gradient(70% 90% at 92% 8%,
      color-mix(in srgb, var(--color-strike) calc(var(--wash, 34%) / 2), transparent) 0%, transparent 60%);
}
/* Light mode's strike is a deep gold; 34% of it over paper is a bruise. */
:root[data-theme="light"] .wash { --wash: 14%; }

/* A photo has to fade into the card it sits in, not stop at it. */
.scrim {
  background-image: linear-gradient(to bottom, transparent 0%,
    color-mix(in srgb, var(--color-felt) 55%, transparent) 55%, var(--color-felt) 100%);
}

/* Chalk dust on the cloth. Texture for a hero band, one line, no asset. */
.dotfield {
  background-image: radial-gradient(var(--color-hairline-strong) 1px, transparent 1px);
  background-size: 18px 18px;
}

/* The one thing on the public side happening right now. */
@keyframes live-pulse { 50% { opacity: .3; scale: .7; } }
.live-dot { animation: live-pulse 1.7s var(--ease-out) infinite; }

/* Marquee. Track duplicated in markup, translated half its own width, so the
   loop is seamless without measuring anything in JS. */
@keyframes marquee { to { translate: -50% 0; } }
.marquee { display: flex; width: max-content; animation: marquee var(--marquee, 48s) linear infinite; }
.marquee-hold:hover .marquee, .marquee-hold:focus-within .marquee { animation-play-state: paused; }

.no-bar { scrollbar-width: none; }
.no-bar::-webkit-scrollbar { display: none; }
```

**Reduced motion needs three named additions** inside the existing block at
`src/index.css:391`. The blanket `animation-duration: 0.01ms` rule is not enough and
actively breaks the marquee:

```css
  /* The blanket rule would run this to its final frame in 0.01ms and park the
     track at -50%, i.e. half the logos missing. Must be killed by name. */
  .marquee { animation: none !important; translate: none !important; }

  /* Keep the shadow change on hover (that is feedback, not motion), drop the lift. */
  a.lift:hover, button.lift:hover { translate: none !important; }
```

`color-mix()` and `:has()` are both already used unguarded in `index.css`, so these stay
unguarded too. Degradation without `:has()` is: the public side renders in the /app skin.
Degraded, never broken. Worth a comment saying so.

---

## Phase 1 — per-club colour

Do **not** hand-write 16 rules. `CLUB_THEME_PALETTE` stays the single source of truth.
Add a second export to `src/components/ClubThemeStyle.tsx` that emits all eight scopes
once (~1.2 KB inline), and mount it in the `_public` layout:

```tsx
/**
 * Every ball colour as a scope, emitted once by the public layout.
 *
 * ClubThemeStyle paints one club onto the whole document, right for a club's own
 * page. A directory is thirty clubs at once, so the same four tokens are scoped
 * to whatever carries data-ball instead. No per-card <style>, no inline custom
 * properties, no JS, both modes in the HTML so there is no hydration flash.
 *
 * `:root [data-ball]` rather than a bare attribute selector: on /clubs/$slug,
 * ClubThemeStyle's own `:root` rule is later in the document and would win a
 * specificity tie, painting every nested card with the host club's colour.
 */
export function BallScopeStyle() { /* CLUB_BALL_COLORS.flatMap(...) */ }
```

Then `data-ball={club.theme_color ?? "yellow"}` on any card, row or chip gives everything
inside it that club's accent. Colour arrives with no layout change.

---

## Phase 2 — shell unification

**`LandingPage` and `PublicNav` are currently two different products.** Clicking "Clubs"
from `/` changes bar height (64→56), background (`bg-pocket/85`→`bg-felt/85`), container
width (1152→1024), and turns the CTA from a button into bare accent text.

**Decision: move the landing page into `_public`, and grow `PublicNav` to match it.**

- **Move** `src/routes/index.tsx` → `src/routes/_public/index.tsx`. Path stays `/`; the
  route tree regenerates. Landing then inherits `PublicNav`, `PublicFooter` and
  `data-public` for free, and its `rounded-sheet` phone frame and bento tiles pick up the
  chunkier radii with no edits. If it stayed un-skinned the seam would just move from the
  nav to the cards.
- **Delete** LandingPage's own `<header>` (`src/pages/LandingPage.tsx:144-182`), its
  `<footer>` (376-404) and its outer wrapper. Move `overflow-x-clip` onto the `_public`
  layout div, since the hero's `lg:-mr-20` bleed needs it.
- **`PublicShell`**: drop `title` / `subtitle` / `actions` entirely. Only the six
  directory/search pages pass them, and all six get real heroes below; the four detail
  pages already pass none. It becomes purely the measure:
  `<main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">`. **`max-w-5xl` → `max-w-6xl`**;
  image-forward needs the width, and a 6-col face grid does not fit 1024.
- **`PublicNav`**: `h-16`, `max-w-6xl`, `bg-pocket/80` (the bar is the canvas, cards float
  over it), `z-30`. Active section link wears `bg-strike-tint text-strike`, which is what
  the accent already means on the app's tabs. Sign in becomes a real pill button. **Search
  stops being an icon and becomes a field** at `md:` and up, collapsing back to the icon
  below. That is the strongest "social network, not brochure" signal available in a nav bar.
- **`PublicFooter`**: three beats. Brand + tagline + "Start a club" / link columns /
  bottom bar with `ThemeToggle` and the language picker / a giant clipped wordmark at
  `text-ink/[0.07]`, `text-[clamp(3rem,15vw,11rem)]`, one div. Lifting `ThemeToggle` and
  the `LANGS` picker out of `LandingPage` **fixes a real bug**: a visitor who arrives on a
  shared `/clubs/foo` link today has no way to change theme or language without signing in.

Detail pages then render their hero as a **sibling above** `PublicShell`, not as
`children`, which is what lets a hero go full-bleed:

```tsx
<>
  <ClubThemeStyle color={club.theme_color} />
  <ClubHero club={club} … />       {/* full-bleed */}
  <PublicShell>{/* body */}</PublicShell>
</>
```

---

## Phase 3 — imagery

One component, `src/components/ui/Shot.tsx`, extracted and generalised from the existing
`Shot` at `src/pages/LandingPage.tsx:39-77` (LandingPage then imports it and deletes its
local copy). Three states in priority order:

1. a real file in the `SHOTS` registry — the custom illustration, once it exists
2. a `seed` — a deterministic stock stand-in
3. neither — a reserved box

The ratio is reserved in all three cases, so swapping a stand-in for real artwork never
moves the layout. Always emits `width`/`height` attributes as well as `aspect-ratio`, so
the box exists before CSS parses. `loading="lazy" decoding="async"`, except heroes which
go eager with `fetchpriority="high"`.

```ts
/** Deterministic on purpose: the same seed is the same photo forever, so a card
 *  does not reshuffle between the server render and hydration. Grayscale is not
 *  optional: picsum returns random-palette photography, and a teal photo under a
 *  purple club reads as a broken theme. Desaturated under .wash, a random photo
 *  becomes texture wearing the club's hue. */
const stock = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}?grayscale`;
```

Two fixes over the current `Shot` while we are in there: `SHOTS` is all empty strings
today, so **live visitors currently see four dashed placeholder boxes on the landing
page** — the labelled frame should render only in `import.meta.env.DEV` and a plain
`bg-felt/40` box in production.

Add `<link rel="preconnect" href="https://picsum.photos" />` to the `head` in
`src/routes/__root.tsx`. No CSP in `netlify.toml`, nothing to allowlist.

**Seeds** (stable ids → stable photos, and the same club looks the same in the directory
and on its profile):

| surface | seed | size |
|---|---|---|
| club card art / club hero cover | `club-${club.id}` | 800×450 / 1600×500 |
| tournament feature + hero cover | `tourney-${t.id}` | 1200×450 / 1600×600 |
| page heroes | `clubs-hero`, `players-hero`, … | 1200×900 |
| CTA band backdrop | `cta-band` | 1800×770 |

**No photography on players or drills.** A stock pool-hall photo behind a named real
person implies it is their room, and picsum can hand you a beach. Drills already have
real generated art (`PoolTableDiagram`) that beats any photo.

### Illustration brief (register the slots now, drop files in `public/art/` later)

- `hero-clubs`, `hero-players`, `hero-tournaments`, `hero-drills`, `hero-search` — 16/9
- `cta-band` — 21/9
- `empty-clubs` … `empty-search` — 1/1, wired via a new optional `art?: ReactNode` on
  `EmptyState` that replaces the icon circle
- `player.flourish` (3/4, decorative, hero right edge), `drill.flourish` (1/1, per
  `skill_type` watermark) — both `fallback="none"`, nothing shows until they exist
- **`/og/{clubs,players,tournaments,drills}.png` + `/og/default.png` — 1200×630.** Already
  wired in `src/libs/publicMeta.ts` and in `__root.tsx`, and **they 404 today**. Every
  shared public link is imageless. Same production batch.
- LandingPage's existing four: `phone`, `ranking`, `drill`, `challenge`

`public/table.svg` and `public/table-light.svg` already exist and are themed. Reusable as
texture behind a hero band.

---

## Phase 4 — the six directory surfaces

Every directory follows the same **five-beat rhythm**, but each beat is a *different
shape per page*. That is what stops six identical grids.

1. **Hero** — editorial, image-forward, different art each page
2. **A rail** — horizontal, snap-scrolling, breaks the grid before it starts
3. **A sticky filter bar** — `sticky top-16`, one row, never three
4. **The body** — different structure per page (below)
5. **CTA band** — same component on all five, so pages *end* instead of trailing off

| page | body shape | notes |
|---|---|---|
| **Clubs** | `sm:grid-cols-2 lg:grid-cols-3` of the new colour-washed `ClubCard` | Featured rail from `data.clubs.slice(0,6)`, **no extra query**. Hidden when `q` or a non-default sort is set, because "biggest" is only true under the default sort. |
| **Players** | `sort==="name"` → A–Z indexed list; `sort==="category"` → three division bands | Portrait-card rail above. A trailing "Clubs they play for" rail derived from the embedded club on each row: zero extra queries, free cross-linking, free colour. |
| **Tournaments** | Live + Open get **cards** (`sm:grid-cols-2`); Finished gets **rows** in one Card | The archive must not look like the news. That single decision does more for rhythm here than anything else. Feature band above for the first live event, washed in its host club's colour. |
| **Drills** | No difficulty filter → three grouped sections; filtered → one flat grid | 8 skill-type tiles as a chunky rail, each `data-ball` from the 8-colour palette (8 skills, 8 balls, exact mapping), with live counts. Replaces the second pills row. Drills are unpaginated so grouping and counts are free. |
| **Search** | Four blocks, four shapes: club rail / player rows / tournament Card list / **real `DrillCard` grid** | A count chip row under the field is the proof the search worked. Empty state becomes suggestion chips (`8ball`, `league`, `potting`) instead of a dead screen. |

**Three stacked `FilterPills` rows on tournaments is the worst offender in the codebase.**
Collapse to status only, with format and discipline behind a native `<details>` disclosure
carrying an active-count badge. No JS, no dependency.

### Card specs

- **`ClubCard`** — 16/9 `.wash` art band in the club's colour with the grayscale stock
  photo at `opacity-45` on top, a real `BallGlyph` with its rack number top-right, the logo
  straddling the seam at `-mt-8` in a **padded wrapper** (not an `outline` class override:
  Tailwind orders compiled utilities by property, not by class-string order, so an
  `outline-2` passed via `className` is not reliably the winner against `Avatar`'s built-in
  `outline-1 outline-white/10`), name, member count, and a "New" pill when `created_at` is
  inside 30 days. Carries `rise lift` and `style={{ "--i": index }}`.
- **`PublicPlayerCard`** — `w-52` portrait, rail only, `.wash` top band in the club's
  colour, 80px avatar in a padded ring, name, club, `CategoryBadge`.
- **Player list row** — 44px avatar, name, and the club's colour as a 2px dot. Per-creator
  identity in a dense list with no new colour utility.
- **`TournamentCard`** — `.wash` header band with `DisciplineBall` (already exists in
  `src/components/ui/Ball.tsx`, currently underused, and it is the perfect card mark), a
  `live-dot` badge when running, name, club chip, then format / category / entrants.
- **`DrillCard`** — leave it alone, it is the best card in the app. Three additions only:
  `rise` + `--i`, `lift`, and `group-hover:scale-[1.03]` on the diagram inside the existing
  `overflow-hidden`.

---

## Phase 5 — the four detail pages

The four heroes are currently the same "avatar left, h1 + meta, buttons right" header.
That repetition is the single biggest thing killing the lively feel. Each gets a distinct
one, all full-bleed, all lit by `.wash` in the club's own colour (which follows
`ClubThemeStyle` automatically, because a `var()` inside a gradient resolves at use time).

| page | hero | body |
|---|---|---|
| **Club** | Cover band, logo plate overlapping it, name at `text-display`, roster **face pile** as the social-proof line. The Patreon creator-header shape. | Stat rail (no box, 3-up, hairline-divided, `text-display` numbers) / "On now" scroller / leaderboard trio as podium-ordered tiles / **roster as a 64-80px face grid** / recent results (keeps its Card) / join band. |
| **Player** | No photography. Colour + type + their own face, with the two headline numbers pulled **up into the hero** alongside a last-10 **form strip**. | Opponents strip (no box, 3 tiles, W–L in mono) / history (keeps its Card) / club cross-link band. |
| **Tournament** | Status-driven, three shapes: `open` → entrants as a `text-display` figure plus a face pile; `running` → live pill plus a real progress bar; `done` → **the champion's face in the hero**. | Entrants face strip / podium sheds its Card and goes full-bleed `.wash` / groups go `lg:grid-cols-2` (currently each 4-row table wastes 60% of the width) / draw keeps its `Segmented` toggle and its box / club band. |
| **Drill** | **The diagram is the hero**, `lg:col-span-7`, slightly rotated in a `rounded-sheet` frame. | Lede promoted out of its card to `text-h3` / setup + scoring as two numbered steps with `font-mono text-display text-strike/30` numerals / **related drills**, which turns the page from a dead end into a browsing loop. |

Body rule, applied uniformly: **a `Card` earns its box when it contains a dense repeating
list whose rows are *inset* (surface goes down from the page).** By that rule `GamesList`
keeps its Card (its rows are `bg-pocket` pills that need `bg-felt` behind them to read as
inset, `src/components/GamesList.tsx:196`), `LeagueTable` keeps its Card, `BracketView`
keeps its box. Everything else sheds the box for a `SectionHead` plus a hairline.

New shared `SectionHead` runs at `text-h2` (24) against `CardHeader`'s `text-h4` (18).
With heroes at `text-display` that gives 48 / 24 / 16, the editorial contrast the brief
wants, instead of today's 32 / 18 / 16.

### Two small `Avatar` additions (`src/components/ui/Avatar.tsx`, currently 38 lines)

- **`shape?: "circle" | "plate"`** — the ring string hardcodes `rounded-full`, and a
  `rounded-sheet` passed via `className` will not reliably win a same-property conflict. A
  club logo is a mark, not a face; making it square-ish is what stops the club header and
  the player header looking identical.
- **`seed?: number | string`** — **the thing that will otherwise quietly ruin the face
  grids.** Most players have `avatar_url === null` and the fallback is a grey initial on
  `bg-felt-raised`. Twenty-four identical grey circles is a spreadsheet, not a club. A
  deterministic tint picked from the existing ball tokens gives colour variety with no new
  tokens and no data change. Pass `seed={player.id}` wherever faces appear in bulk; omit it
  under `/app` so the authed side is byte-identical.

---

## Social-network moves the data actually supports

**Build these:** face piles (club hero, tournament entrants; the roster query is already
loaded on both pages) · roster as a face grid · champion in the tournament hero
(`placings()` already computed) · "Playing since {year}" from the unused `club.created_at`
· "Last played N days ago" on the club *detail* page from `gamesData.games[0]` · tournament
progress bar from `matches.filter(m => m.winner_id !== null).length` · player last-10 form
strip and most-frequent opponents, both falling out of the single existing pass over up to
1000 games at `src/pages/PublicPlayerPage.tsx:41` at zero added cost · cross-link bands
player → club and tournament → club.

**Do not fake these:** likes / comments / reactions (`SocialBar` is members-only; anon
cannot read those tables, `src/components/GamesList.tsx:90`) · "active this week" on the
club *directory* (no per-club last-activity column, documented refusal in
`publicClubsQuery`) · followers, view counts, "N people looking at this" · a player's
tournament history (`publicTournamentsQuery` selects `tournament_players(count)`, not
`player_id`; needs a new query shape) · general head-to-head (needs a new route).

---

## Honest constraints

1. **No club location, city or description.** Club cards cannot say where a club is, the
   single most-wanted fact in a club directory. Related: the meta description on `/clubs`
   currently promises "Find a club near you", which the data does not support. Worth fixing
   the copy either way.
2. **No tournament start/end dates**, only `created_at` and `status`. "Starts Friday" is
   impossible; Live / Open / Finished is the entire temporal vocabulary.
3. **No player win rate on directory listings** (documented at
   `src/pages/PublicPlayersPage.tsx:138`). Player cards carry name, avatar, club, category
   and nothing else, so the portrait rail cards will feel sparse. The avatar and the club
   colour carry the whole load. Fixing it needs a materialised column or a view.
4. **No club member avatars in the clubs directory**, only `member_count`, so the face-pile
   proof works on `/players` and `/search` but **not** on club cards. An embed might work
   given `avatar_url` is in the anon grant, but it depends on the RLS policy allowing it.
   Treat as a spike, not an assumption.
5. **`CLUB_GAMES_LIMIT = 30`.** The club leaderboard is a 30-game *form* table, not an
   all-time ranking, and making it three big celebratory tiles amplifies a quiet inaccuracy
   that exists today. Relabel it ("Form, last 30 matches"); do not silently raise the limit
   on a page already shipping 30 games plus a full roster plus every tournament.
6. **picsum is a stopgap**: random unrelated photography, third party, no SLA, one extra
   origin per card. The grayscale + `.wash` treatment makes it read as intentional texture,
   but if you want on-brand imagery before the illustrations exist, hand-pick ~6 pool-hall
   photos into `public/art/hall-1..6.jpg` and have `Shot` select by a hash of the seed.
   Same API, real subject matter. The real fix for club covers is a `cover_url` column,
   which needs a new grant in `CLUB_COLS` plus a migration in `sql/`.
7. **Stock photography behind a real club's name is a mild honesty problem** — a visitor
   may read it as that club's room. Grayscale at `opacity-45` under a colour wash is the
   mitigation, not a cure.
8. **The radius change reaches past the cards.** `--radius-card: 22px` also hits `Card`,
   `EmptyState`'s frame, `Skeleton`, the `Segmented` shell, and via `control` every `Input`
   and pill. Intended, but check `PageSkeleton` renders sensibly at the new radii.
9. **`PublicShell` widening to `max-w-6xl` touches all eight public pages**, not just the
   six in Phase 4. Re-check the tournament list rows afterwards.
10. **The drill page loses its sticky sidebar diagram.** Deliberate trade for a hero that
    is not a fifth identical header, on a page whose body is three short paragraphs.
11. **Related drills needs a loader change** in `src/routes/_public/drills/$drillId.tsx`
    (`ensureQueryData(publicDrillsQuery({ skill_type }))`). Unpaginated over the shared
    catalog, so it is small, and it parallelises with nothing else on that route.
12. **i18n is a real cost, not free.** `src/i18n/es.json` is the source of truth,
    `i18n.check.ts` enforces key parity across es/en/fr, and the dictionaries are typed
    `Record<Key, string>` so a missing key is a **build error**. Budget ~25-30 new keys × 3
    languages, written in Spanish first. Keep new visible strings free of em-dashes; a
    hyphen or a second sentence reads better at 14px and across three languages.

---

## Verification

Per phase, not at the end.

**Phase 0.** `npm run dev`. Toggle theme on `/clubs` and on `/app/$slug/ranking` in the
same session: the public side must be warm and lifted, the app side byte-identical to
today. Confirm in devtools that `--radius-card` computes to `22px` on a `/clubs` card and
`14px` on an `/app` card. Then throttle to a slow connection and confirm no flash: the
attribute is in the SSR'd HTML, so `:has()` should match on first parse.

**Phase 1.** Load `/clubs` with clubs of at least three different `theme_color` values and
confirm each card's accent differs. Then load `/clubs/$slug` for a blue club and confirm
nested cards inside it are **not** all blue — that is the `:root [data-ball]` specificity
rule doing its job, and it is the failure mode that fails silently.

**Phase 2.** Navigate `/` → `/clubs` → `/clubs/$slug` → `/players` and watch the nav bar:
no height, colour or width change at any step. Confirm `ThemeToggle` and the language
picker work from a deep link like `/clubs/foo` (they cannot today).

**Phase 3.** Build for production and confirm no dashed dev frames ship. Confirm every
`Shot` reserves its box with JS disabled and images blocked.

**Phases 4-5.** Per page: empty state, loading skeleton, and error state, not just the
happy path. A club with one member, a tournament with zero entrants, a player with zero
games (the hero must still render a presence rather than a bare header over an empty card),
a drill with no description.

**Every phase.** `npm run build` (which runs `tsc --noEmit`), `npm run lint`,
`npm run check` (the i18n parity check). Test at 375px and 1440px. Test with
`prefers-reduced-motion: reduce` forced in devtools and confirm the marquee is parked at
its start, not at `-50%`. Tab through a directory page and confirm the chalk-blue focus
ring is visible against the new warm surfaces in both modes.

---

## Scale

This is a large piece of work: 2 new components plus 2 new component files, ~10 edited
files, one route file moved, and every public page recomposed. **Phase 0 is 2 files and
delivers most of the change in feel** — ship it and look at it before committing to the
rest. Phases 4 and 5 are one page per PR.
