# Public routes revamp: from directory to clubhouse

## Where this stands

v1 shipped the structure: the public skin, `BallScopeStyle`, `PublicShell` / `PublicNav`
/ `PublicFooter` / `CtaBand`, `Shot`, `SectionHead`, and all ten public pages recomposed
with heroes, rails, sticky filter bars and CTA bands.

**The structure landed and it works. The colour did not.** This document is the second
visual pass: same mechanism, same phases 1 and 2, a much louder skin on top. Everything
marked _revised_ replaces what v1 put in the file; everything marked _keep_ is already
correct and should not be touched.

**v2 is now implemented too** (`npm run build` and `npm run lint` both pass; `npm run
check` fails on a pre-existing unrelated Node/`.ts` loader problem in
`src/libs/avatarImage.check.ts`, on a clean tree as well). No new i18n keys were needed:
every string reuses one that already exists. **It has not been looked at on a screen
yet** — that is the next step, and Phase A's hex values are explicitly a judgement call.

Two things came up in implementation that the plan above did not anticipate:

- **`.wash-soft` had to exist.** Raising `.wash` to 55% / 26% makes it far too strong to
  sit _under_ ink: a full-strength club colour directly beneath `--color-ink` is a
  contrast failure that no single ink token survives across eight hues and two modes. So
  `.wash` is now card art only, and every band that carries a headline pairs it with
  `.wash-soft` (20% / 10%). Documented in Phase B.
- **`.wash` and `.dotfield` cannot be combined**, and the shipped player hero was already
  doing it. Both set `background-image`, `.dotfield` is defined later in the stylesheet,
  so pairing them silently dropped the wash entirely. Fixed on that hero, and called out
  at both call sites so it does not come back.

---

## Context

The public routes read as a _database directory_ no longer — the five-beat rhythm fixed
that. What they read as now is **tasteful and quiet**, which is a different failure. A
stranger deciding whether this hobby has a community worth joining is not persuaded by
restraint.

Three things are doing it, in order of damage:

1. **The skin is beige.** `--color-pocket: #f8f4ee` with brown-tinted shadows and a
   `#0b0a0a` warm near-black. That is the default warm-craft palette: artisan bakery,
   third-wave coffee, heritage cookware. It is the single most over-used palette family
   in the genre and it makes any brand wearing it invisible. It also actively fights the
   club colours: brown is a desaturated orange, so orange, maroon, red and yellow clubs
   all half-disappear into their own canvas.
2. **`.wash` is a tint, not a colour.** 34% in dark, **14%** in light. Per-club colour is
   the highest-leverage idea in the whole revamp and it is currently arriving at a
   quarter strength. Patreon's per-creator colour is a _fill_. Ours is a suggestion.
3. **Grayscale stock photography at `opacity-45` under that tint.** Desaturated random
   photos, dimmed, under a pale wash, is mud on every card. It is costing an extra origin
   per card and a mild honesty problem, and buying texture nobody can see.

Goal, restated with teeth: **the public surface should look like a Friday night, not a
Sunday morning.** References given: fable.co, patreon.com. What they do mechanically is
unchanged from v1 — per-entity colour identity, art before text, editorial scale
contrast, chunky radii and real depth, visible social proof, section rhythm. v1 built the
scaffolding for all six. This pass turns four of them up.

### Design read

**A public discovery surface for a hobby sports community, for strangers deciding whether
to join, with a loud club-colour poster language, built as a public-only re-lighting of
the existing Pool Valencia tokens.** Tournament-blue cloth canvas, the club's colour as a solid
surface rather than a tint, the product's own objects in place of stock photography,
oversized display type, native scroll-driven motion.

Dials: `DESIGN_VARIANCE 9` · `MOTION_INTENSITY 7` · `VISUAL_DENSITY 4`.
(v1 ran 8 / 6 / 4. Variance and motion each go up one; density is right and does not move.)

### Decisions taken

|             |                                                                                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**   | Unchanged. Public routes get their own skin, `/app` stays the dim focused tool, same tokens underneath.                                                                                                                           |
| **Canvas**  | _Revised._ Tournament-blue cloth in both modes, not warm brown / cream paper. Reasoning below.                                                                                                                                    |
| **Colour**  | _Revised._ The club's colour becomes a **surface**, not trim. New `.flood`, and `.wash` roughly doubles in strength.                                                                                                              |
| **Imagery** | _Revised twice._ No stock photography anywhere, and then no hero art at all. All five directory heroes are type on a quiet band, identically. Colour still does the work on cards, on the live-tournament band and on face grids. |
| **Motion**  | Unchanged in kind — native CSS only, no new dependency. More of it: hover physics on cards, a scale-in reveal, one marquee.                                                                                                       |

### Why blue cloth

The warm brown was chosen as "the bar the pool room opens onto". It is a good sentence and
a bad palette: it is the default warm-craft family, and brown is a desaturated orange, so
four of the eight ball colours half-disappear into it.

The cloth is the right object — it is the one thing every pool player on earth shares, the
app's canvas is near-neutral blue-black, and the landing page is the only place the cloth
has ever appeared. Public is where a stranger meets the product, so the cloth should be
what they meet.

**Blue rather than green**, because blue is what competition cloth is actually woven in
and what a modern hall is fitted with. Green is the colour of a pub table in 1985; it
reads period rather than current, which is the opposite of the brief. Blue also happens to
be the better engineering choice:

- **It collides with exactly one of the eight ball colours**, same as green did. Blue clubs
  run `#6f95f5` in dark and `#2f52c8` in light, both far lighter and far more saturated
  than any canvas value here, so a blue club reads as a lit ball on cloth, not camouflage.
- **The eight balls stay the most saturated thing in frame**, which is the entire point of
  `[data-ball]`. A low-chroma canvas of any hue does that; this one does it while also
  being on-brand for the object it is imitating.

The risk it carries that green did not: **the app's canvas is also blue-tinted**
(`#090b0e`). The public surfaces are deliberately bluer _and_ more saturated, and light
mode's `#e4eef8` sits well clear of the app's cool grey `#f3f5f9`, so the two do not read
as the same screen. Check this specifically, in both modes, side by side.

**If blue is wrong, the fallback is not beige.** It is a near-neutral ink canvas
(`#0a0c0f` / `#eceef1`) with the club colour doing 100% of the hue work. That keeps
everything else in this document intact — only the eight `--color-*` surface values in
Phase A change. Do not go back to warm cream; it is the one direction known to flatten the
club colours.

---

## The core mechanism — _keep_

`src/components/ClubThemeStyle.tsx` proves it and it is shipped: redefine `--color-strike*`
on a selector and every `text-strike` / `bg-strike-tint` / `border-strike` in the subtree
repaints, zero component edits. `src/index.css:13` uses plain `@theme` (not `@theme inline`),
so Tailwind v4 utilities compile to `var(--token)` and a scoped redefinition genuinely
cascades. **Verified, load-bearing, unchanged.**

Two scales, both live:

- **`[data-public]`** → a whole skin for the public route tree.
- **`[data-ball]`** → per-club colour on individual cards, via `BallScopeStyle`.

**Two accents, not one.** `--color-strike` means _act_: buttons, links, the current tab.
`--color-club` means _whose_: which club a card belongs to, which skill a tile is for,
which player a face stands in for. It defaults to `var(--color-strike)`, so anything no
club has claimed looks exactly as it did before.

Under `/app` the two are the same thing, and should be — in a club's own tool the club is
the product, so its colour is what "act" looks like, and `ClubThemeStyle` moves the accent
itself. **The public side works the other way round.** A directory is thirty clubs at once
and a stranger has to be able to find the button, so out here `[data-ball]` moves
`--color-club` only and never touches `--color-strike`. Cards and backgrounds wear the
club; every button and link on every public page is the app's yellow. The three public
detail pages no longer mount `ClubThemeStyle` at all — their heroes and washed bands carry
`data-ball` instead, which was already true and is now the whole mechanism.

### Specificity arithmetic — _keep_ (get this wrong and nothing applies)

| selector                                       | spec                    | note                                    |
| ---------------------------------------------- | ----------------------- | --------------------------------------- |
| `@theme` output on `:root`                     | 0,1,0 in `@layer theme` | unlayered CSS always wins               |
| `:root[data-theme="light"]` (exists)           | 0,2,0                   | unlayered                               |
| `html:has([data-public])`                      | 0,1,1                   | beats `:root`, loses to the light block |
| `html[data-theme="light"]:has([data-public])`  | 0,2,1                   | beats the light block ✅                |
| `ClubThemeStyle`'s inline `:root{}`            | 0,1,0                   | later in document, wins ties            |
| `:root [data-ball="blue"]`                     | 0,2,0                   | beats ClubThemeStyle ✅                 |
| `:root[data-theme="light"] [data-ball="blue"]` | 0,3,0                   | beats everything ✅                     |

> ### ⚠ Hard rule 1 — _revised_
>
> **Nothing on the public side redefines `--color-strike*`.** Not the skin, not
> `[data-ball]`, not a page. Out here the accent means one thing, "act", and it is the
> app's yellow everywhere. A club's identity rides on `--color-club`. The skin re-lights
> surfaces, ink, hairlines, radii, type and lift only.
>
> This also retires the specificity coin-flip the earlier version of this rule was written
> to avoid: with `ClubThemeStyle` off the public tree entirely, there is no bare `:root{}`
> rule for `[data-ball]` to tie with.

> ### ⚠ Hard rule 2 — _keep_
>
> **Lift is an opt-in `.lift` class, never bolted onto `cardClasses` or `rounded-card`.**
> `MatchCard`, `MatchList` rows and `LeagueTable` rows are shared with `/app` and render
> dozens at a time inside `BracketView`.

> ### ⚠ Hard rule 3 — _new_
>
> **`.flood` sets `background-color: var(--color-club)` and `color: var(--color-pocket)`
> together, always.** That pair is exactly what `buttonStyles.ts:6` already ships as the
> primary button (`bg-strike text-pocket`) in both modes, so it inherits a contrast check
> that has already been made. Splitting the pair — a flood with `text-ink` on it, or ink
> tokens on a strike background — is how this palette breaks, because `--color-strike` is
> _bright_ in dark mode and _deep_ in light mode and no single ink token survives both.

---

## Phase A — re-light _(revised: replaces `src/index.css:161-232`)_

Two blocks, both already in the file, both getting new values. Ship this alone and look
at it before anything else, in both modes, on a real screen.

```css
/*
  Public skin. The authed tool is a dim pool room seen from the inside; the
  public surface is the cloth itself — low-chroma blue surfaces stepping by
  lightness only, chunkier radii, a real display step, real tinted lift.

  Tournament blue, not the classic green: blue is what competition cloth is
  actually woven in and what a modern hall is fitted with, and green reads
  period. It collides with exactly one of the eight ball colours, and blue clubs
  run #6f95f5 / #2f52c8 — far lighter and far more saturated than anything here,
  so a blue club reads as a lit ball on cloth rather than as camouflage. The
  point of the whole skin is that the club's colour stays the most saturated
  thing in frame.

  It is bluer *and* more saturated than the app's near-neutral #090b0e, which is
  what keeps the two surfaces from reading as the same product in two tabs.

  `--color-strike*` is never redefined here: per-club colour (ClubThemeStyle,
  [data-ball]) has to win every time, and both live at the same 0-1-0
  specificity where document order alone decides.
*/
html:has([data-public]) {
  --color-pocket: #071120; /* canvas */
  --color-felt: #0e1d31; /* cards */
  --color-felt-raised: #152a44;
  --color-rail: #1f3a5a;

  --color-hairline: rgba(214, 234, 255, 0.1);
  --color-hairline-strong: rgba(214, 234, 255, 0.2);

  /* Ratios against --color-felt, the worst case, same bar the app holds:
     ink 15:1, soft 9.5:1, faint 5.7:1, ghost intentionally sub-AA. */
  --color-ink: #eff5fb;
  --color-ink-soft: #b4c4d6;
  --color-ink-faint: #8697aa;
  --color-ink-ghost: #58697c;

  /* Still control < card < sheet, still locked. Just a chunkier lock out here,
     where a card is a poster and not a row. Interactive chips stay rounded-full;
     that is the one documented exception to the scale. */
  --radius-control: 14px;
  --radius-card: 28px;
  --radius-sheet: 36px;

  /* Editorial contrast wants a real display step, not 48px. Fluid, so a phone
     never wears an 88px headline. */
  --text-h1: clamp(2rem, 5vw, 3rem); /* 32 → 48 */
  --text-display: clamp(2.75rem, 8vw, 5.5rem); /* 44 → 88 */

  --lift: 0 1px 2px rgb(0 0 0 / 0.45), 0 10px 30px -12px rgb(0 0 0 / 0.6);
  --lift-strong:
    0 2px 4px rgb(0 0 0 / 0.5), 0 24px 46px -16px rgb(0 0 0 / 0.72);

  --lamp: color-mix(in srgb, var(--color-strike) 10%, transparent);
  --lamp-strong: color-mix(in srgb, var(--color-strike) 20%, transparent);
}

/* Light mode is chalk, not paper: a pale blue-white canvas with pure white cards
   floating on it, and a real shadow, which light mode can afford and dark never
   could. The canvas is deliberately not white — that gap is what buys the lift
   its job — and it is more saturated than the app's cool grey #f3f5f9, so the
   two light modes are not the same screen. Shadows tinted with the canvas's own
   blue, never neutral grey. */
html[data-theme="light"]:has([data-public]) {
  --color-pocket: #e4eef8;
  --color-felt: #ffffff;
  --color-felt-raised: #d6e6f4;
  --color-rail: #bfd7ec;

  --color-hairline: rgba(6, 24, 45, 0.1);
  --color-hairline-strong: rgba(6, 24, 45, 0.2);

  --color-ink: #0c1722;
  --color-ink-soft: #435363;
  --color-ink-faint: #64768a;
  --color-ink-ghost: #9aa9b8;

  --lift:
    0 1px 2px rgb(10 30 55 / 0.07), 0 12px 28px -14px rgb(10 30 55 / 0.24);
  --lift-strong:
    0 2px 6px rgb(10 30 55 / 0.09), 0 26px 50px -18px rgb(10 30 55 / 0.32);
}
```

**Notes on the values.** The ink ladder keeps the app's four levels and the app's
intent: `ink` primary, `ink-soft` secondary, `ink-faint` metadata still clearing AA at
body size, `ink-ghost` disabled and deliberately sub-AA. The light canvas is `#e4eef8`
rather than white so that white cards have somewhere to float; that gap is what buys the
lift its job. **These hex values are a judgement call. Re-measure every ratio with a
checker rather than trusting any number implied here**, in particular `ink-faint` on
`felt` in light mode, which is the tightest pair in the set.

**Shape lock.** One radius system, applied everywhere: `control 14` for inputs and
buttons, `card 28`, `sheet 36`, and interactive chips stay `rounded-full` as they already
are. That last one is the only exception and it is a documented rule, not a drift. The
change reaches past the cards — `Card`, `EmptyState`, `Skeleton`, the `Segmented` shell
and every `Input` and pill all move. Intended. Check `PageSkeleton` renders sensibly.

**Type lock.** `--text-display` is pinned to the landing page's own headline
(`text-4xl md:text-6xl`, 36 → 60), so `/` and `/clubs` open at the same size instead of
the public directories shouting a full step louder than the front door. With `SectionHead`
at `h2` (24) against `CardHeader`'s `h4` (18) the ladder is 60 / 24 / 16 on desktop and
36 / 24 / 16 on a phone. Headlines wear the landing page's treatment exactly:
`font-semibold leading-[1.05] tracking-tighter`, not a heavier bold.

An earlier pass ran display up to 88px with `font-bold`. It was too much: at that size the
hero band has to grow to hold it, and a directory title is not a manifesto.

---

## Phase B — colour as a surface _(revised: replaces the `.wash` block, adds three)_

This is the pass. Everything else here is support.

```css
/* The club's colour as a solid panel, not a tint. Eight clubs in a grid are eight
   solid blocks of colour, which is the whole Patreon per-creator move and the
   loudest thing available to us for free.
   The colour/background pair is fixed together on purpose: it is exactly what
   buttonStyles ships as `primary`, so it is already contrast-checked in both
   modes. Never split it. (Hard rule 3.) */
.flood {
  background-color: var(--color-strike);
  color: var(--color-pocket);
}

/* The gradient version, for when a flood would be too much weight: card art bands,
   hero backdrops. Roughly double v1's strength — a wash has to read as the club's
   colour from across the room, not as a tint you notice on inspection. */
.wash {
  background-color: var(--color-felt-raised);
  background-image:
    radial-gradient(
      90% 120% at 12% 0%,
      color-mix(in srgb, var(--color-strike) var(--wash, 55%), transparent) 0%,
      transparent 70%
    ),
    radial-gradient(
      70% 90% at 92% 8%,
      color-mix(
          in srgb,
          var(--color-strike) calc(var(--wash, 55%) / 2),
          transparent
        )
        0%,
      transparent 62%
    );
}
/* Light mode's strike is a deep shade rather than a bright one, so the same
   percentage lands much heavier. 26 is the point where it is unmistakably the
   club's colour and still carries ink at AA. */
:root[data-theme="light"] .wash {
  --wash: 26%;
}

/* Card art is loud; a band with a headline on it has to be quiet. Full-strength
   wash puts a bright club colour directly under --color-ink, which no ink token
   survives across eight hues and two modes. Pair with .wash wherever text sits
   *on* the wash rather than below it. */
.wash-soft {
  --wash: 20%;
}
:root[data-theme="light"] .wash-soft {
  --wash: 10%;
}

/* The bar floats until the page moves under it, then takes a surface and an edge.
   Scroll-driven: no listener, no state. Without support it stays transparent,
   which is its resting state anyway. Degraded, never broken. */
@keyframes nav-settle {
  to {
    background-color: color-mix(in srgb, var(--color-pocket) 80%, transparent);
    border-bottom-color: var(--color-hairline);
  }
}

.nav-settle {
  background-color: transparent;
  border-bottom: 1px solid transparent;
}

@supports (animation-timeline: scroll()) {
  .nav-settle {
    animation: nav-settle linear both;
    animation-timeline: scroll();
    animation-range: 0 56px;
  }
}
```

`.scrim`, `.dotfield`, `.live-dot`, `.marquee`, `.no-bar` are all shipped and correct —
**keep them as they are.**

### Where each one goes

| utility  | goes on                                                                                                         | never on                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `.flood` | CTA band · the 8 drill skill tiles · the champion's hero on a finished tournament · the live-event feature band | anything with body copy longer than a sentence                           |
| `.wash`  | club card art bands · club and player detail heroes · podium · join band                                        | two adjacent siblings (two washes side by side average out to one field) |

---

## Phase C — imagery _(revised: cuts v1's Phase 3 entirely)_

**There is no stock photography on the public side any more.** v1 put a grayscale picsum
photo on every club card and a duotoned one on every page hero. Both are gone, along with
`Shot`'s `seed` prop, the `stock()` helper, the `.duo` utility and the
`preconnect` to picsum in `__root.tsx`.

The reason is not the treatment, it is the subject. A random photograph of a hedgerow
tells a reader nothing about a pool club, and no amount of duotoning fixes that; under a
club's name it also quietly asserts something false about whose room they are looking at.
The product already draws better objects than any stock library can hand us, and they are
all real:

| surface                                  | art                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| club card                                | the club's `.wash` plus a 96px `BallGlyph` half-bled off the corner                                        |
| `/clubs` hero                            | the full rack, eight balls half-bled off the top edge — the directory's own colour system, stated          |
| `/tournaments` hero                      | live: `.flood` in the host club's colour. Otherwise the three discipline balls bleeding off the right edge |
| `/players` hero                          | a wall of up to 42 real member faces, seeded so the many with no photo come back as solid ball colours     |
| `/drills` hero                           | the eight skill types as eight `.flood` tiles                                                              |
| `/search` hero                           | the field                                                                                                  |
| club / player / tournament detail heroes | `.wash wash-soft` in the club's colour                                                                     |
| drill detail                             | `PoolTableDiagram`, which was always better than a photo                                                   |

`Shot` survives, reduced to what it should have been: a registry lookup or a reserved box,
ratio held in both states so dropping real artwork in never moves the layout.

### Illustration brief — the slots that still matter

- `empty-clubs` … `empty-search` — 1/1, via an optional `art?: ReactNode` on `EmptyState`
  that replaces the icon circle
- **`/og/{clubs,players,tournaments,drills}.png` + `/og/default.png` — 1200×630.** Already
  wired in `src/libs/publicMeta.ts` and `__root.tsx`, and **they 404 today**. Every shared
  public link is imageless. This is the highest-value art in the list and the only one
  that is currently a bug.
- LandingPage's existing four: `phone`, `ranking`, `drill`, `challenge`

`public/table.svg` / `public/table-light.svg` exist and are themed, if a hero ever wants
texture behind the type.

## Phase D — motion _(revised: `MOTION_INTENSITY 6 → 7`)_

Every addition below has one job. Anything that cannot be justified in a sentence does not
ship.

```css
/* Cards arrive with a little scale as well as a rise. Communicates hierarchy:
   the grid assembles, so the eye lands on the first card rather than on all
   twenty-four at once. --i is the card index; the cap is the point, because 24
   cards at 45ms each is a page and a half of waiting. */
@keyframes pop {
  from {
    opacity: 0;
    translate: 0 18px;
    scale: 0.96;
  }
}
.pop {
  animation: pop 620ms var(--ease-out) backwards;
  animation-delay: calc(min(var(--i, 0), 8) * 45ms);
}

/* The same, scroll-linked, for everything below the fold. Compositor-driven, no
   listener. Browsers without view() simply show the content. */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .pop-in {
      animation: pop linear both;
      animation-timeline: view();
      animation-range: entry 4% cover 24%;
    }
  }
}

/* Press feedback on a card, matching what buttonClasses already does at 0.97. */
a.lift:active,
button.lift:active {
  scale: 0.985;
}
```

`.rise` and `.reveal` stay for the landing page's hero, which is tuned to them.
`.lift` and its hover keep their shipped definition.

**On the card itself**, in markup rather than CSS, because it is per-component:

- the ball mark: `transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110`
  — feedback, and it makes an otherwise static colour field feel touchable
- the art band: `transition-[filter] group-hover:saturate-150` — the club's colour gets
  louder under the cursor, which is the single cheapest "this is alive" signal available
- the title: keep the existing `group-hover:text-strike`

**One marquee on the site, total.** Put it in the CTA band as a strip of club names in
their own colours, and nowhere else. Two marquees on one site reads as filler. The
`.marquee-hold` pause-on-hover and the named reduced-motion kill are already shipped and
are both required.

**Reduced motion.** The block at the end of `index.css` is correct and already handles
`.pop` (the blanket `animation-duration: 0.01ms` lands it on its final frame, which is the
resting state). The two named exceptions — parking `.marquee` at its start rather than at
`-50%`, and dropping the `.lift` hover translate while keeping its shadow — are shipped.
Add nothing.

---

## Phase E — heroes _(revised down: no hero art at all)_

v1 put a photograph in every hero. v2 replaced the photographs with the product's own
objects: the rack on `/clubs`, a wall of member faces on `/players`, the discipline balls
on `/tournaments`, the skill tiles on `/drills`. **Those are gone too.** The heroes are
type on a quiet band, and nothing else, until there is real art worth putting there.

Every directory hero is now the same shape, and it has no shape of its own — no band,
no border, no surface. Type floating on the canvas:

```tsx
<section>
  <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <h1 className="text-display leading-[0.95] font-bold tracking-[-0.03em] text-ink">
      …
    </h1>
    <p className="mt-4 max-w-[52ch] text-body text-ink-soft sm:text-h4">…</p>
  </div>
</section>
```

One exception: **`/search`** keeps the field inside the band, because the field is the
page and there is nothing to put above it.

`/tournaments` used to flood its hero in the live event's club colour, then kept it as a
band below the hero. Both are gone: all five open identically, and the live event is now
just the first card in the Live group.

**This deliberately costs the page-to-page variety v2 was aiming for.** Five identical
hero shapes is exactly the sameness the five-beat rhythm was designed against. The
variety now has to come from beats 2 to 5, which do still differ per page, and from the
cards. It is a holding position, not a design: the heroes are the obvious place for real
art when there is some.

**Where the colour still lives**, so the loudness has not simply been deleted along with
the art: `ClubCard`'s `.wash` band and its 96px `BallGlyph`, `TournamentCard`'s `.wash`
header and `DisciplineBall`, the `.flood` champion plate, `.flood` seeded avatars across
every face grid, the `.wash` skill rail on `/drills`, and the club's colour on every
detail hero.

**Beat 2, the rail, is gone from three of the five.** `/clubs` had a featured rail of the
six biggest, `/players` a portrait rail of the first eight, `/tournaments` a band for the
one live event. All three are removed: they were a second, weaker view of rows the grid
below already shows, and a directory does not need to introduce itself to itself. What
survives is the rail that is _not_ a preview of the list under it — the eight skill types
on `/drills`, which is a filter, and "clubs they play for" at the foot of `/players`,
which is a cross-link derived from the loaded page at no query cost.

So the rhythm is now four beats on most pages: hero, sticky filter bar, body, CTA band.

**Body shapes — _keep_, all five are correct.** Clubs is a 2/3-col colour-washed grid. Players is A-Z indexed
under `sort==="name"` and three division bands under `sort==="category"`. Tournaments
gives Live and Open **cards** and Finished **rows in one Card**, so the archive does not
look like the news. Drills groups into three sections unfiltered and one flat grid
filtered, with the eight skill types as a `.wash` rail above the filter bar — a rail
rather than a second pills row, because eight options each carrying a live count is more
than a pill row holds. Search runs four blocks in four different shapes.

**Every facet lives behind one button** (`src/components/ui/FilterMenu.tsx`). The sticky
bar draws a filter icon and the result count, nothing else. The menu is a native
`<details>` — no dependency, keyboard and screen-reader behaviour for free, and it works
before hydration, which matters on a route a stranger arrives at from a search engine. It
stays open after a choice, because setting two facets should be one visit rather than two.

Inside, each facet is a `FilterGroup`: its name, then its options, stacked. `FilterPills`
draws no label of its own by design — a visible label per row would double the height of an
_inline_ filter bar — but in a stacked menu that reasoning inverts, and unlabelled pills
stop saying what they belong to. So the label lives in the group rather than in the
control.

**The badge is what makes hiding them safe.** Folded-away filters that are silently on are
how a reader ends up staring at three results and blaming the data, so the button carries
the number of facets currently set. Tournaments counts all three (status, format,
discipline), not just the two that used to sit behind its old "more filters" disclosure —
the menu hides every one of them now, so every one has to be announced.

This retires the three-stacked-`FilterPills` problem outright rather than collapsing it:
there is no filter row on any directory at rest.

**Text search lives on `/search` alone.** The four directories used to carry a debounced
`SearchInput` writing `?q=`. They no longer do: one box, in one place, reachable from the
nav icon on every page. The directories keep their _facets_ — sort, division, status,
format, discipline, difficulty, skill — because those are browse controls, not queries.

The consequence to watch: `?q=` is still honoured by every directory route and query, but
nothing in the UI produces it any more, and a directory has no field to display it in or
clear it from. So `/search`'s "see all" links deliberately **drop the term** and go to the
whole section. Landing on a directory filtered by an invisible term would be a short list
with no visible cause and no way out.

### Card specs _(revised)_

- **`ClubCard`** — a **fixed `h-20`** `.wash` band, no photo and no ball. A height rather
  than an aspect ratio, so a card does not grow taller as the grid gets wider; a directory
  is scanned down and every row should cost the same screen. The logo straddles the seam at
  `-mt-6` in a **padded wrapper** (not an `outline` class override:
  Tailwind orders compiled utilities by property, not by class-string order, so an
  `outline-2` passed via `className` is not reliably the winner against `Avatar`'s built-in
  `outline-1 outline-white/10`), name at `text-body font-semibold`, member count as a mono
  figure, and a **`.flood` "New" pill** when `created_at` is inside 30 days. Carries
  `pop lift` and `style={{ "--i": index }}`.
- **`PublicPlayerCard`** — `w-52` portrait, rail only, `.wash` top band, 80px avatar in a
  padded ring, name, club, `CategoryBadge`.
- **Player list row** — 44px avatar, name, and the club's colour as a 3px dot. Per-creator
  identity in a dense list with no new colour utility.
- **`TournamentCard`** — `.wash` header band with a large `DisciplineBall` (already exists
  in `src/components/ui/Ball.tsx` and is the perfect card mark), a `live-dot` badge when
  running, name, club chip, then format / category / entrants in mono.
- **`DrillCard`** — still the best card in the app. Three additions only: `pop` + `--i`,
  `lift`, and `group-hover:scale-[1.03]` on the diagram inside the existing
  `overflow-hidden`.
- **Skill tile** — new, 8 of them, `.flood` in the mapped ball colour, skill name, live
  count as a mono `text-h1` figure. Eight skills, eight balls, exact mapping.

---

## Phase F — the four detail pages

Structurally unchanged from v1 and largely shipped. The revisions are colour and scale
only.

| page           | hero                                                                                                                                                                                                                                                                                 | body                                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Club**       | `.wash` cover band at the new strength (no photo), logo plate overlapping it, name at `display`, roster **face pile**. The Patreon creator-header shape.                                                                                                                             | Stat rail (no box, 3-up, hairline-divided, mono `display` numbers) / "On now" scroller / roster as a 64-80px face grid / recent results (keeps its Card) / `.flood` join band. **No leaderboard**, see constraint 5.    |
| **Player**     | Colour, type and their own face, with the two headline numbers pulled up into the hero beside a last-10 form strip.                                                                                                                                                                  | Opponents strip (no box, 3 tiles, W-L in mono) / history (keeps its Card) / club cross-link band.                                                                                                                       |
| **Tournament** | Status-driven, three shapes: `open` → entrants as a `display` figure plus a face pile; `running` → live pill plus a real progress bar; `done` → **the champion's face on a `.flood` field in their club's colour**, which is the one genuinely celebratory moment the data supports. | Entrants face strip / podium sheds its Card and goes full-bleed `.wash` / groups go `lg:grid-cols-2` / draw keeps its `Segmented` toggle and its box / club band.                                                       |
| **Drill**      | **The diagram is the hero**, `lg:col-span-7`, slightly rotated in a `rounded-sheet` frame.                                                                                                                                                                                           | Lede promoted out of its card to `text-h3` / setup and scoring as two numbered steps with `font-mono text-display text-strike/30` numerals / related drills, which turns the page from a dead end into a browsing loop. |

**Body rule — _keep_, applied uniformly.** A `Card` earns its box when it contains a dense
repeating list whose rows are _inset_ (surface goes down from the page). By that rule
`GamesList` keeps its Card (its rows are `bg-pocket` pills needing `bg-felt` behind them to
read as inset, `src/components/GamesList.tsx:196`), `LeagueTable` keeps its Card,
`BracketView` keeps its box. Everything else sheds the box for a `SectionHead` plus a
hairline.

### `Avatar` additions — _keep_, both still needed

- **`mark?: boolean`** — **required for club logos.** They are nearly always transparent
  PNGs drawn dark-on-clear, so on the dark canvas they simply vanish. `mark` puts white
  behind the image and switches `object-cover` to `object-contain`, because cropping a face
  at the edges is fine and cropping a wordmark is not. Passed at every club-logo call site
  across the public pages.
- **`shape?: "circle" | "plate"`** — the ring string hardcodes `rounded-full`, and a
  `rounded-sheet` passed via `className` will not reliably win a same-property conflict. A
  club logo is a mark, not a face.
- **`seed?: number | string`** — the thing that would otherwise quietly ruin the face
  grids and the new players hero. Most players have `avatar_url === null` and the fallback
  is a grey initial on `bg-felt-raised`; twenty-four identical grey circles is a
  spreadsheet, not a club. A deterministic tint from the eight ball tokens gives variety
  with no new tokens and no data change. Pass `seed={player.id}` wherever faces appear in
  bulk; omit it under `/app` so the authed side stays byte-identical.

---

## Social-network moves the data supports — _keep_

**Build these:** face piles (club hero, tournament entrants; the roster query is already
loaded on both) · roster as a face grid · the players-page face wall · champion in the
tournament hero (`placings()` already computed) · "Playing since {year}" from the unused
`club.created_at` · "Last played N days ago" on the club _detail_ page from
`gamesData.games[0]` · tournament progress bar from
`matches.filter(m => m.winner_id !== null).length` · player last-10 form strip and
most-frequent opponents, both falling out of the single existing pass over up to 1000 games
at `src/pages/PublicPlayerPage.tsx:41` at zero added cost · cross-link bands player → club
and tournament → club.

**Do not fake these:** likes / comments / reactions (`SocialBar` is members-only; anon
cannot read those tables, `src/components/GamesList.tsx:90`) · "active this week" on the
club _directory_ (no per-club last-activity column, documented refusal in
`publicClubsQuery`) · followers, view counts, "N people looking at this" · a player's
tournament history (`publicTournamentsQuery` selects `tournament_players(count)`, not
`player_id`) · general head-to-head (needs a new route).

---

## Honest constraints

1. **No club location, city or description.** Club cards cannot say where a club is, the
   single most-wanted fact in a club directory. The meta description on `/clubs` promises
   "Find a club near you", which the data does not support. Fix the copy either way.
2. **No tournament start/end dates**, only `created_at` and `status`. Live / Open /
   Finished is the entire temporal vocabulary.
3. **No player win rate on directory listings** (documented at
   `src/pages/PublicPlayersPage.tsx:138`). Player cards carry name, avatar, club and
   category. The avatar and the club colour carry the whole load, which is more workable
   under this pass than under v1 because the colour is now doing real work.
4. **No club member avatars in the clubs directory**, only `member_count`, so the face-pile
   proof works on `/players` and `/search` but **not** on club cards. An embed might work
   given `avatar_url` is in the anon grant, but it depends on the RLS policy. Spike, not
   assumption. **This also gates the new players hero** — verify the face wall has real
   faces to draw before building it.
5. **There is no ranking on any public page, by decision.** The club page used to print a
   podium of its top three, computed with `useEloRanking` over the last
   `CLUB_GAMES_LIMIT = 30` games. That was a 30-game _form_ table wearing the clothes of an
   all-time ranking, and three celebratory tiles made the inaccuracy louder rather than
   fixing it. It is removed rather than relabelled: standings are what a member signs in
   for, and a stranger has no way to read them correctly. `useEloRanking` is untouched and
   still serves `/app`.
6. **There is no photography at all now, which is a real constraint, not a win.** Every
   hero is type plus vector objects, and that ceiling is reached. A club genuinely wants a
   photograph of its own room, which needs a `cover_url` column: a new grant in
   `CLUB_COLS` plus a migration in `sql/`. Until then, no third-party image origin is
   better than a random one.
7. **The radius change reaches past the cards.** `--radius-card: 28px` also hits `Card`,
   `EmptyState`'s frame, `Skeleton`, the `Segmented` shell, and via `control` every `Input`
   and pill. Intended, but check `PageSkeleton` at the new radii.
8. **`--text-display` becomes a clamp under `[data-public]`.** Anything that assumed a
   fixed 48px — fixed-height hero boxes, `line-clamp` counts tuned to a wrap point — needs
   a look. `/app` is untouched because the redefinition is scoped.
9. **The five directory heroes are now identical**, deliberately — same band, same
   headline, same subtitle, no exceptions beyond `/search` holding its field. That is the
   sameness the five-beat rhythm exists to prevent, accepted as a holding position until
   there is real art. Everything downstream of the hero still differs per page, so the
   cost is confined to the first screen.
10. **i18n is a real cost, not free.** `src/i18n/es.json` is the source of truth,
    `i18n.check.ts` enforces key parity across es/en/fr, and the dictionaries are typed
    `Record<Key, string>` so a missing key is a **build error**. This pass adds fewer keys
    than v1 (it is mostly colour), but the drills rack and the search hero need theirs.
    Write Spanish first. Keep new visible strings free of em-dashes; a hyphen or a second
    sentence reads better at 14px and across three languages.

---

## Slop guard

Run this before calling any page done. These are the failure modes this specific direction
invites.

- [ ] **One accent per surface.** A card is one club's colour throughout. No page has a
      section in a hue no entity on it owns.
- [ ] **No two `.wash` siblings adjacent.** Two washes side by side average into one field
      and the per-club identity disappears.
- [ ] **`.flood` never carries body copy.** A heading, a figure, a label. Not a paragraph.
- [ ] **Eyebrows: at most one per three sections.** Count the `uppercase tracking` labels.
      A section's position on the page already categorises it.
- [ ] **One marquee on the site.** Currently: the CTA band.
- [ ] **No section-number labels**, no `01 / 04` pagination on tiles, no scroll cues, no
      decorative status dots. `live-dot` is the one dot that survives, and only because it
      carries real state.
- [ ] **Four different layout families minimum per page.** The five-beat rhythm gives this
      for free as long as beats 2 and 4 do not both end up as grids.
- [ ] **Every animation justified in a sentence.** Entrance = hierarchy. Hover saturate +
      ball spin = feedback. `live-dot` = state. Marquee = breadth. Anything else, cut.
- [ ] **No em-dashes in any visible string** (constraint 10).

---

## Verification

Per phase, not at the end.

**Phase A.** `npm run dev`. Toggle theme on `/clubs` and on `/app/$slug/ranking` in the
same session: public must be tournament blue and lifted, `/app` byte-identical to today.
The two are both blue-ish now, so check they do not read as the same screen.
Confirm in devtools that `--radius-card` computes to `28px` on a `/clubs` card and `14px`
on an `/app` card, and that `--text-display` is a clamp on one and `3rem` on the other.
Throttle to a slow connection and confirm no flash: the attribute is in the SSR'd HTML, so
`:has()` matches on first parse. Then check `ink-faint` on `felt` in **light** mode with a
contrast checker; it is the tightest pair in the palette.

**Phase B.** Load `/clubs` with clubs of at least three `theme_color` values and confirm
each card is unmistakably a different colour from a metre away, in both modes. Then load
`/clubs/$slug` for a blue club and confirm nested cards inside it are **not** all blue —
that is `:root [data-ball]` doing its job, and it is the failure mode that fails silently.
Confirm `.flood` text is legible in both modes on all eight balls.

**Phase C.** Build for production and confirm no dashed dev frames ship, and that no
request goes to picsum.photos from any public page.

**Phase D.** Force `prefers-reduced-motion: reduce` in devtools: the marquee parks at its
start rather than at `-50%`, cards are visible at rest, hover still changes the shadow.

**Phases E-F.** Per page: empty state, loading skeleton, error state, not just the happy
path. A club with one member, a tournament with zero entrants, a player with zero games
(the hero must still render a presence), a drill with no description. And a club whose
`theme_color` is `black`, which is the graphite that has no hue and is the one ball where
`.flood` will look least like a colour.

**Every phase.** `npm run build` (which runs `tsc --noEmit`), `npm run lint`, `npm run
check` (i18n parity). Test at 375px and 1440px. Tab through a directory page and confirm
the chalk-blue focus ring is visible against the new blue surfaces in both modes. This is
the one accessibility regression risk the palette carries, and blue makes it sharper than
green did: `--color-chalk` (`#5b9dd9` / `#1f6fb2`) is now the same hue family as the
surfaces it has to separate from. It measures about 5.9:1 against the dark card, well past
the 3:1 a non-text indicator needs, and the 2px `outline-offset` does the rest — but it is
a same-hue ring on a same-hue field, so look at it rather than trusting the number.

---

## Scale

Much smaller than v1, because v1 built the structure. Phase A is **one file and two rule
blocks** and delivers most of the change in feel; ship it and look at it before committing
to the rest. Phase B is the same file plus one search-and-replace of `<Shot>` out of the
two card components. Phases C through F are one page per PR.
