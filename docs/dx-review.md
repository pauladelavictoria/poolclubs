# PoolClubs — Code & DX Audit

**Repo:** `/Users/juancarlos/Dev/poolclubs` · branch `dev` · HEAD `bbf3f2c`
**Date:** 2026-08-29
**Purpose:** maintainability / cleanliness review. The project doubles as a portfolio piece for a developer job search, so "what a reviewer sees in the first 5 minutes" is weighted as heavily as internal code quality.

**Method:** static analysis of the working tree — `wc -l`, `grep`/`rg`, `git log`, `git ls-files`, and direct reading of config and representative source files. Every claim below carries a `file:line` or a reproducible command. Grep-derived lists (dead exports, dead i18n keys) can miss dynamic or re-exported consumers — spot-check before acting. Per GFW AI policy: this document is machine-assisted; you own it on publication.

---

## Verdict up front

The **code** is better than most portfolio projects. The **repo** is worse than the code.

What's genuinely strong: TypeScript is strict-plus and honoured (zero `any` in hand-written code), the design-system layer has real adoption (Button in 47 files), auth guarding is layered and consistent, RLS covers all 18 tables, the three i18n dictionaries are byte-for-byte in sync, and the `.check.ts` assertion suite is high-quality property testing. Comments explain _why_, not _what_ — `vite.config.ts` is the best-commented config file I've read in a portfolio repo.

What undercuts it: no CI, no LICENSE despite an MIT badge, no screenshots, a 6-month-stale second lockfile, 12 branches (one misspelled), 6 git identities for 2 people, commits titled `!` and `?`, and vendored third-party AI skills including `marketing-psychology` in a pool-hall app.

A hiring reviewer forms an opinion from `README.md` and `git log --oneline` before opening `src/`. Both currently misrepresent the work.

---

## Size baseline

| Area             | Files | Lines                             |
| ---------------- | ----- | --------------------------------- |
| `src/pages`      | 41    | 10,217                            |
| `src/components` | 82    | 10,606                            |
| `src/libs`       | 70    | 6,494 (2,110 = `*.check.ts`)      |
| `src/hooks`      | 26    | 2,878                             |
| `src/i18n`       | 5     | 2,755                             |
| `src/routes`     | 66    | 2,315                             |
| `src/types`      | 2     | 1,567 (1,270 generated)           |
| `src/queries`    | 12    | 1,311                             |
| `src/content`    | 2     | 1,134                             |
| `sql`            | 26    | 6,881 (3,216 = `schema.sql` dump) |

153 commits, 2025-05-18 → 2026-08-29.

---

# Part 1 — Repo & DX (highest portfolio impact)

## 1.1 README

`README.md`, 82 lines. **Two incompatible halves.**

Lines 1–36 are aspirational marketing copy ("The ultimate social network…", "elevate your game"). Lines 38–83 are terse engineering prose that is genuinely excellent — it explains _why_ `VAPID_PRIVATE_KEY` is not `VITE_`-prefixed, states four architectural invariants, and links into the source. Keep the bottom half verbatim.

Defects:

- **Both badges are dead links.** `README.md:5` points at `LICENSE`, `README.md:6` at `CONTRIBUTING.md`. Neither file exists on disk or in `git ls-files`. The License badge asserts MIT while the repo has no license at all.
- **Zero screenshots.** `grep -cE '!\[|<img'` → 2, both shields.io badges. No product imagery anywhere. For a portfolio piece this is the single largest gap.
- **No live demo URL**, despite a working Netlify deploy (`netlify.toml`).
- **Feature copy overstates.** Drills are advertised across `README.md:18-21` but are behind a kill switch — `src/libs/features.ts` exports `DRILLS_ENABLED`, turned off in commit `2804a8f "hide drills under a feature flag for now"`, and `src/libs/features.check.ts` wraps its whole assertion block in `if (!DRILLS_ENABLED)`. "video/photo highlights" (`README.md:33`) and "globally" ranked leaderboards (`README.md:29`) do not exist.
- **Broken source link.** `README.md:68` links `[AppLink](src/components/AppLink.tsx)`; the file is at `src/components/layout/AppLink.tsx`. The components folder was reorganised into subfolders and the README wasn't updated.
- **No prerequisites.** Node ≥ 22.6 is a hard requirement (see §1.3) and is stated nowhere. Docker + Supabase CLI are needed for `db:dump`/`db:types` and appear only in `sql/README.md`.
- No architecture diagram, no directory-layout table, no tech-stack row at the top.

## 1.2 Onboarding — a fresh clone cannot run this

`.env` holds 4 variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. It is gitignored (`.gitignore:31`) and `git log --all -- .env` is empty — **never committed.** Good.

> **Security note — act on this one first.** The last two lines of `.env` are comments holding plaintext third-party credentials for a Resend SMTP account and a Gmail account (`poolclubsapp@gmail.com`). They are not in git, but they are sitting in a dotfile in cleartext. Rotate both credentials and move them to a password manager. Do not commit them anywhere, including to an `.env.example`.

- **`.env.example` does not exist.** The four variable names live only in README prose and `netlify.toml` comments.
- **No Node version is declared anywhere.** No `engines` field, no `.nvmrc`, no `.node-version`, no `.tool-versions`. The `check` script runs `node file.check.ts` directly, relying on Node's native type stripping — that needs ≥ 22.6 and fails opaquely below it.
- **No package manager is declared.** No `packageManager` field, no `.npmrc`. Every script and doc says npm, but a committed `bun.lock` says otherwise.
- **No path from empty database to running app.** `sql/schema.sql` (3,216 lines, 98 KB) must be applied by hand and the root README never says so.
- `docs/` exists on disk, is **completely empty**, untracked, and referenced by nothing. Created 2026-08-27.

## 1.3 CI — there is none

`.github/` contains exactly one workflow: `.github/workflows/supabase-keepalive.yml`. Triggers are `schedule` + `workflow_dispatch`. **No `push` trigger, no `pull_request` trigger.** It curls the Supabase REST API to stop the free tier pausing, then pushes an empty commit if the repo has been quiet 50 days.

Consequences:

- `npm run lint` runs on nobody's machine but the developer's.
- `npm run check` — 21 files, ~430 assertions — runs on nobody's machine but the developer's.
- `tsc --noEmit` runs only inside `npm run build` on Netlify deploy, and it runs **after** `vite build`, so a type error costs a full bundle first (`package.json:7`).
- No pre-commit hooks: no `.husky/`, no `lefthook`, `core.hooksPath` unset, `.git/hooks/` holds only `.sample` files.
- No `dependabot.yml`, no `CODEOWNERS`, no PR/issue templates.

The `.check.ts` discipline is real and well-executed but entirely unenforced. That is the gap between "this developer writes tests" and "this developer's tests are load-bearing" — and it is one 20-line YAML file wide.

## 1.4 Lockfiles — the clearest hygiene defect

Both `bun.lock` (66 KB) and `package-lock.json` (508 KB) are tracked.

- `bun.lock` was last updated in commit `fedc367` ("ud"), **2026-02-08**. `package.json` was last updated `db4c777`, **2026-08-27**. The bun lockfile is ~6 months stale and cannot describe the current tree — Vite 8/rolldown, the `optionalDependencies` block, and `@netlify/vite-plugin-tanstack-start` all postdate it.
- `.gitignore` ignores `bun.lockb` (the old binary format) but not `bun.lock` (the current text format). The ignore rule silently stopped applying when Bun changed formats.
- Anyone running `bun install` gets a 6-month-old dependency tree. Anyone reviewing sees two lockfiles and reads carelessness.

## 1.5 Committed AI tooling

Tracked: `.agents/` (16 files), `.claude/skills/*` (2 symlinks, mode `120000`), `skills-lock.json`.

`.agents/skills/` vendors two third-party skill packs, named in `skills-lock.json`:

```json
"marketing-psychology":            { "source": "coreyhaines31/marketingskills" },
"tanstack-start-best-practices":   { "source": "deckardger/tanstack-agent-skills" }
```

Observable facts a reviewer can check: `.agents/` is the third-largest tracked directory by file count (behind `src/` at 313 and `sql/` at 26); a `marketing-psychology` skill is committed to a pool-hall app with no code relationship to it; the content is copyright of two unrelated GitHub authors, sitting in a repo whose badge claims MIT with no LICENSE present; and git symlinks do not survive a Windows checkout cleanly.

Also: `.gitignore` has **no `.claude/` or `.agents/` entry**. `.claude/settings.local.json` (11 KB) is excluded only by the user's _global_ ignore file (`/Users/juancarlos/.config/git/ignore:1`) — on any other machine it appears as untracked noise immediately.

**Decision taken:** untrack all three (`git rm -r --cached`), add to `.gitignore`, keep working locally.

## 1.6 Branches and git identity

12 remote branches, 8 local. `origin/HEAD → origin/main`, current work on `dev`.

Remotes: `add-drills`, `app-mode`, `dev`, `drills`, `league-night`, `main`, `marketing-plan`, `new-header`, `notifications`, `player-profile`, `tanstack-start`, **`toutnaments`** — that last one is a typo of "tournaments" and exists both locally and on origin. Stale local `tanstack-start-migration` has no remote.

**Six author identities for what appears to be 2–3 humans:**

```
98  pauladelavictoria
69  satellitestudiodesign
37  paula de la Victoria
17  Paula de la victoria
 6  Aluzed
 4  Alexandre Pénombre
```

Three of these are one person; GitHub renders them as separate contributors with separate avatars. No `.mailmap` exists.

## 1.7 Commit messages

**4 of 153 (2.6%)** follow Conventional Commits. The log is bimodal.

Good: `ccfc315 refactor: add query enabling to useGetGames, and move realtime initialization to the club-specific route to optimize re-renders`, `983b882 fix: apply color-scheme inline to root html to prevent white flashes during initial paint`.

Bad, and visible within one screen of `git log --oneline`: `80974dd !`, `ea8f989 ?`, `fedc367 ud`, `c61df14 go back`, `21aaea7 remove user`, `4c0755d fix notificactions` (typo), `db4c777 fix build`.

Provenance note: `a08de38 Merge branch 'main' of github.com:aluzed/vite-react-ts-supabase` — the repo's root is a fork of a starter template by another author. That is visible in the log and stated nowhere in the README. Attributing it costs one line and removes any question.

Trajectory is upward — the last ~20 commits read noticeably better than the first ~60.

## 1.8 What's clean

- `dist/` (7.5 MB on disk) and `.DS_Store` are ignored and **absent from the entire history**. Verified with `git log --all --`.
- `.netlify/`, `.tanstack/`, `.output`, `.nitro` all correctly ignored.
- No secrets in any of the 26 SQL files. Scanned for JWT-shaped strings, `supabase.co` URLs, `password =`, `secret`, `api_key`, bearer tokens — zero hits. The ~90 `service_role` matches are all `GRANT … TO service_role`, a Postgres role name, not a credential. `sql/push-notifications.sql:8` mentions `SUPABASE_SERVICE_ROLE_KEY` only in a comment explaining the design _avoids_ needing one.

---

# Part 2 — Tooling & configuration

## 2.1 TypeScript — strict-plus, and honoured

`tsconfig.json` is a solution file with project references. Both `tsconfig.app.json` and `tsconfig.node.json` set:

```
strict, noUnusedLocals, noUnusedParameters,
erasableSyntaxOnly, noFallthroughCasesInSwitch, noUncheckedSideEffectImports
```

`erasableSyntaxOnly` is the clever bit — it is what makes `node src/libs/slug.check.ts` work with no build step. `paths` maps `@/*` → `./src/*` and `vite.config.ts` sets `resolve.tsconfigPaths: true`, so the alias is declared exactly once.

Missing from strict-plus territory: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. `skipLibCheck: true` in both.

## 2.2 ESLint — small, competent, one contradiction

`eslint.config.js` (36 lines) is flat config, extends `js.configs.recommended` + `tseslint.configs.recommended`, adds `react-hooks` and `react-refresh`, and disables `react-refresh/only-export-components` for `src/routes/**` with a correct one-line justification (`eslint.config.js:31-34`).

Two issues:

- **`"@typescript-eslint/no-explicit-any": "off"` (`eslint.config.js:23`) is unearned.** There is exactly **one** `: any` in 313 hand-written files, and it's prose (`src/libs/kiosk.ts:53`, "has any business showing"). The rule is off, the code doesn't need it off. Turning it on costs nothing and converts a voluntary discipline into an enforced one.
- `globals: globals.browser` only (`eslint.config.js:15`), despite the app being server-rendered and `tsconfig.app.json` including `"types": ["node"]`. Server-only files lint against the wrong global set.
- Uses `tseslint.configs.recommended`, not `recommendedTypeChecked` — no type-aware rules (`no-floating-promises`, `no-misused-promises`) are running.
- `ecmaVersion: 2020` is unnecessarily old for a project targeting `chrome87`.

## 2.3 No formatter at all

No `.prettierrc*`, no `.editorconfig`, no `format` script, no formatter dependency. Visible consequences:

- `src/hooks/useEloRanking.ts` is the **only file in `src/` indented with 4 spaces**; every other file uses 2.
- `src/types/index.ts:158,181,198,210-212` and `src/libs/scoreBand.ts:7,15-19` are the **only** single-quoted string literals in the codebase.
- 12 `interface` declarations survive against 204 `type` aliases, clustered in exactly three folders (see §4.4) — an older stratum a formatter wouldn't fix but a lint rule would.

## 2.4 Vite / Netlify config — the high point

`vite.config.ts` (38 lines) is the best-documented file in the repo. Every non-obvious line explains itself: the `process.env.VAPID_PRIVATE_KEY ??= loadEnv(...)` shim, `build.target: "chrome87"` ("an old Android tablet on the club's rail does not meet baseline"), and plugin ordering ("Order is not cosmetic: `tanstackStart()` has to see the code before `viteReact()` transforms it").

`netlify.toml` is 1,183 bytes of which **3 lines are configuration** and ~20 are comments documenting the four env vars and the VAPID prefix rule. Missing: `NODE_VERSION` in `[build.environment]` — which means the Node version is undeclared on the deploy target too.

---

# Part 3 — Testing

## 3.1 What exists

`package.json:12`:

```json
"check": "for f in src/libs/*.check.ts src/i18n/*.check.ts; do node \"$f\" || exit 1; done"
```

**21 files, ~430 assertions.** 20 in `src/libs/`, 1 in `src/i18n/`. Each is a standalone executable script — no runner, no `describe`/`it`, just `node:assert/strict` and bare top-level assertions, ending in `console.log("<name>: ok")`.

**The assertion quality is high — these are property tests, not smoke tests.**

- `src/libs/slug.check.ts` (56 lines) asserts Unicode folding (`"Peña Billar"` → `pena-billar`, `"Straße 8"` → `strasse-8`), punctuation collapse, the `slugify("!!!") === "club"` fallback that satisfies a DB CHECK constraint, a loop asserting `isValidSlug(slugify(name))` holds for every sample, and reserved-route shadowing. Its docblock states a cross-boundary contract explicitly: _"The point of these assertions is the SQL: every case below is also what `public.slugify()` in `sql/club-slug.sql` must return. If you change one, change both."_
- `src/libs/bracket.check.ts` (544 lines, ~90 assertions) builds deterministic id generators and asserts invariants across sizes — `for (const size of [2,4,8,16,32])` checking `order[i] + order[i+1] === size + 1`.
- `src/libs/features.check.ts` (26 lines) wraps its body in `if (!DRILLS_ENABLED)` so the suite stays honest when the flag flips.
- `src/libs/pushKey.check.ts` asserts a real VAPID key decodes to 65 bytes starting `0x04`, and that base64url `-`/`_` map to `+`/`/` rather than being dropped.

## 3.2 What's missing

- **Coverage: 20 of 50 non-check modules in `src/libs/` (~40%).** Nothing covers components, routes, queries, or server functions.
- **No test framework.** `git ls-files | grep -iE "\.test\.|\.spec\.|__tests__|vitest|jest|playwright|cypress"` → zero. No coverage tooling.
- **No CI** (§1.3). `check` appears in exactly one place: the `scripts` block.
- **Portability:** the `for … do … done` loop is POSIX shell and fails on Windows `cmd`. The `.ts` execution hard-requires Node ≥ 22.6, declared nowhere.

Notable coverage gaps, in rough risk order: `realtime.ts` (260), `auth.functions.ts` (351), `push.functions.ts` (200), `queryKeys.ts` (197), `clubTheme.ts` (164), `prefs.ts` (113), `dayLabel.ts` (63), `kiosk.ts` (64). The last two are pure and trivially checkable — `kiosk.ts` is the same shape as `features.ts`, which _is_ covered.

**And one structural gap:** `src/hooks/useEloRanking.ts:17-151` is 130 lines of pure Elo computation wrapped in a `useMemo`. Its exact counterpart — the daily-points tally — is `src/libs/dailyScore.ts` (107 lines) + `dailyScore.check.ts` (160 lines) bound by a 16-line `useDailyRanking.tsx`. `dailyScore.ts:6` even documents the pairing: _"The all-time board is Elo instead, in hooks/useEloRanking.ts."_ So the app's other ranking algorithm sits in the one folder `npm run check` cannot reach.

**Decision taken:** migrate to Vitest, add component tests.

---

# Part 4 — Application code

## 4.1 The biggest files

| File                                         | Lines   | Problem                                                                     |
| -------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| `src/pages/app/TournamentPage.tsx`           | **735** | 610 lines in one component; a 460-line JSX const; duplicates `leaguePodium` |
| `src/components/social/ActivityFeed.tsx`     | **716** | 7 unexported components in one file; shadows `MatchCard`                    |
| `src/components/drills/DrillForm.tsx`        | **674** | one component, geometry editor state machine inlined                        |
| `src/queries/public.ts`                      | **618** | 9 query factories + 14 types spanning 5 unrelated domains                   |
| `src/libs/bracket.ts`                        | **611** | 11 exports covering 4 distinct concerns                                     |
| `src/pages/public/LandingPage.tsx`           | **538** | zero hooks; bypasses the existing `src/content/` mechanism                  |
| `src/pages/app/TodayPage.tsx`                | **433** | one component, zero sub-components, ~380 lines of JSX                       |
| `src/pages/public/PublicTournamentPage.tsx`  | **401** | duplicates the bracket/list toggle from `TournamentPage`                    |
| `src/hooks/useTournaments.tsx`               | **395** | 3 queries bypassing `queries/`, 8 mutations in one bag                      |
| `src/routes/app/_authed/$clubSlug/route.tsx` | **244** | 163-line page-sized component living in `routes/`                           |

**`TournamentPage.tsx` in detail.** Default export runs lines 60→670. Inside: 5 `useState`, 5 `useMemo`, 10 mutation call sites, and 16 derived-value helpers declared inline in the component body (`entrants` :91, `seeded` :98, `matches` :110, `index` :117, `minimum` :137, `groups` :138, `entered` :139, `addable` :145, `groupMatches` :156, `playable` :162, `recorder` :165, `playedMatches` :171, `pendingMatches` :176, `findMatch` :181, `entrantPlayers` :188, `raceOf` :191). All 16 are pure functions of the tournament — they belong in `libs/bracket.ts`, which already has `.check.ts` coverage, instead of being untestable inside a component. `:194` defines `run()`, a page-local "await, toast on success, toast on error" wrapper no other page shares. `:210` assigns `adminBlock`, a ~460-line JSX expression, to a `const`. `:702` redefines `leaguePodium` — which already exists in `src/libs/leagueTable.ts` and is imported by `PublicTournamentPage.tsx`.

**`LandingPage.tsx` in detail.** Lines 1–171 are data tables (`CLUB_BALLS`, `SEGMENTS`, `STEPS`, `FEATURES`), 172–538 pure markup, zero hooks. This _is_ content — and the repo already has a content layer: `src/content/pages.ts` (415 lines) holds pricing/about/contact as typed `ContentDoc` objects per language, rendered generically by `ProsePage.tsx` (120 lines). The landing page ignores it. The app has two competing content strategies.

**21 files over 250 lines have 1 or 2 top-level functions.** Worst: `TodayPage` 433/1, `LandingPage` 538/1, `TrainingProgressPage` 352/1, `ChallengesPage` 346/1, `PublicTournamentsPage` 330/1, `LiveMatchPage` 325/1, `LoginPage` 288/1.

## 4.2 The `queries/` ↔ `hooks/` contract is followed about half the time

The stated pattern (README, `src/queries/players.ts:6-19`): a `queryOptions` factory in `queries/`, a thin `useQuery` wrapper in `hooks/`. All 12 files in `queries/` use `queryOptions` and nothing else does — verified.

**Three reads break it**, all in `src/hooks/useTournaments.tsx`: `useGameTournaments` (`:60`, query at `:67`), `useMyTournamentIds` (`:86`, `:95`), `useMyPendingMatches` (`:114`, `:123`). These are the only three `queryFn`s defined outside `src/queries/`. They use the browser client, so **no route loader can prime them** — which is the entire stated point of the `queries/` layer. Meanwhile `src/queries/tournaments.ts` is 57 lines with 2 queries. Which tournament read lives where is decided by nothing visible.

**Two components reach the DB directly**, skipping both layers:

- `src/components/players/AvatarUpload.tsx:40` — `.from("people").update(...)` plus a manual `queryClient.invalidateQueries` at `:44`
- `src/components/club/ClubTablesCard.tsx:75` — `.rpc("start_device_pairing")` through an untyped shim at `:65-73`

Otherwise: 47 `supabase.from(` hits outside `queries/` across 17 files, and all the rest are mutations in `hooks/` (which matches the documented rule at `src/libs/supabase.ts:19-21`) or server-side route handlers.

**Two accepted call styles coexist.** Pages under `src/pages/app/` go through hooks; pages under `src/pages/public/` import `queryOptions` from `queries/` directly (17 import sites). Neither is wrong; having both undocumented is.

## 4.3 `libs/` is a 70-file junk drawer

One flat directory holding nine unrelated categories: pure algorithms (`bracket`, `dailyScore`, `leagueTable`), server functions (`*.functions.ts`), the query-key registry (`queryKeys.ts`, 197), the realtime socket (`realtime.ts`, 260), two Supabase clients, theme tokens (`clubTheme`, `chartTheme`, `theme`), image processing, geocoding, cookie prefs, polyfills — **and 7 React hooks**:

```
libs/useDialog.ts (22)          — 11 importers
libs/useDebouncedQuery.ts (64)  —  5
libs/useOutsideClose.ts (30)    —  4
libs/useFullscreen.ts (23)      —  4
libs/useMedia.ts (47)           —  3
libs/useNow.ts (23)             —  3
libs/useWakeLock.ts (58)        —  2
```

`useDialog` has **11 importers — more than most things in `hooks/`** — yet lives in `libs/`. No stated rule separates `libs/useDialog.ts` from `hooks/useInstallPrompt.ts`; both are browser-API hooks with no data layer. There are two hooks directories, discoverable only by grep.

**Two Supabase client modules split on no discoverable rule.** `src/supabaseClient.ts` (27 lines, browser singleton) is imported by 19 files, all hooks/components. `src/libs/supabase.ts` (24 lines, isomorphic wrapper) is imported by 11, all `queries/`. The _reason_ is documented (`libs/supabase.ts:19-21`); the _placement_ is odd — one sits at `src/` root outside `libs/`, the other inside, and `libs/supabase.ts:2` imports `@/supabaseClient`, a `libs/` file reaching up to a root-level module. (A third, `libs/supabase.server.ts`, is correct and well-justified: fresh per call, with `:18-20` explaining why a singleton would leak sessions.)

## 4.4 Naming inconsistencies

**Hook file extensions carry no information.** 23 of 26 hooks are `.tsx`; **20 of those 23 contain zero JSX.** The three that do have 1–4 JSX-shaped lines. The three `.ts` files aren't distinguished by anything except being newer. Sharpest example: `useDailyRanking.tsx` (16 lines, no JSX) is `.tsx` while `useEloRanking.ts` (151 lines, no JSX) is `.ts` — same job, two ranking systems, disagreeing extensions.

**Three competing hook naming schemes:**

```
useGetX     : useGetGames, useGetPlayers, useGetDrills, useGetDrillLogs,
              useGetDrill, useGetChallenges, useGetTournaments, useGetTournament
useX        : useClubMembers, useClubTables, useLiveMatches, useComments,
              useReactions, useSession, useWhoIsHere, useNotifications
useManageX  : useManageClub, useManagePlayers, useManageDrills,
              useManageTournaments, useManageChallenges, useManageLiveMatch
one-per-file: useAddGame, useDeleteGame, useAddDrillLog, useDeleteDrillLog
```

The fourth group costs most: drills have `useManageDrills.tsx` (72) **and** `useAddDrillLog.tsx` (31) **and** `useDeleteDrillLog.tsx` (25). Whether a mutation gets its own file or joins a `useManageX` bag is arbitrary. `useGet*` vs plain `use*` reads as vintage, not intent — `useGetPlayers` and `useClubMembers` are both plain reads.

**`interface` vs `type`.** 12 `interface` vs 204 `type`, and the interfaces cluster in exactly three folders — `components/drills/` (5), `components/ranking/` (2), `components/games/GamesList` (1) — plus `ui/ButtonProps` (justified, extends `ButtonHTMLAttributes`). Those same folders carry the other old-stratum tells: single quotes, `interface`, older naming. It is a visible archaeological layer.

**Query-key factory naming has no single rule:** `.in(clubId)`, `.list(...)`, `.of(playerId)`, `.for(q)`, `.one(id)` — each documented per case, none consistent. And two keys escape the registry entirely: `SESSION_KEY` is declared at `src/queries/session.ts:12`, and `src/queries/public.ts:281` builds a key inline (`[...keys.public.all, "roster", clubId]`) — the only inline `queryKey:` literal in the codebase.

## 4.5 Duplication

- **Two different `MatchCard`s.** `src/components/games/MatchCard.tsx:13` (147 lines, renders a `TournamentMatch`) and a file-local `function MatchCard` at `src/components/social/ActivityFeed.tsx:280` (renders a `Game`). Same name, different domain object, one importable and one not.
- **`leaguePodium` twice**: `src/libs/leagueTable.ts` (imported by `PublicTournamentPage`) and re-declared at `src/pages/app/TournamentPage.tsx:702`.
- **`CATEGORIES = [1,2,3]` three times**: `src/pages/app/PlayersPage.tsx:22`, `src/components/ranking/Ranking.tsx:13`, `src/pages/public/PublicPlayersPage.tsx:21` — the third typed differently.
- **`avatarImage.ts` / `logoImage.ts` are a partial fork.** `logoImage.ts:1` imports `squareCrop` and `MAX_FILE_BYTES` from `avatarImage`, then **re-exports `MAX_FILE_BYTES`** (`:17`), and declares its own `SIZES` (`:14`) and `MAX_OUT_BYTES` (`:15`). `MAX_OUT_BYTES` exists twice with the same name and different meanings — 40 KB in `avatarImage.ts:17`, 80 KB in `logoImage.ts:15`. Their component twins `AvatarUpload.tsx` (77) and `ClubLogoUpload.tsx` (92) mirror the split.
- **`DISMISSED_KEY` twice, two values**: `libs/installPrompt.ts:1` (`"pc:installPromptDismissed"`) and `layout/PushConsentModal.tsx:26` (`"pc:pushPromptDismissed"`). No shared storage-key registry — and their consumers (`AppPrompts.tsx:32`, `PushConsentModal.tsx:45`) carry _identical_ `eslint-disable react-hooks/set-state-in-effect` comments with identical justification text, i.e. copy-pasted hydration logic.
- `SIZES` declared in three files, `SIZE` in two, `clamp` in two with unrelated semantics (`drillGeometry.ts:69` numeric, `publicMeta.ts:39` string truncation).
- `TournamentPage.tsx` (735) and `PublicTournamentPage.tsx` (401) independently implement the same bracket/list `Segmented` toggle with separate `useState<"bracket" | "list">`, and import an overlapping set of 12 modules.

## 4.6 Dead code

`tsc` catches dead _locals_ by construction (`noUnusedLocals`), which is exactly why the dead code that survives is all at **module-export granularity** — the one thing `tsc` cannot see, and nothing in CI does either.

**Fully dead files/functions:**

- `src/hooks/useDeleteGame.tsx:5` — whole 14-line file, zero call sites
- `src/hooks/useChallenges.tsx:16` — `useMyChallenges`, zero call sites
- `src/libs/sections.ts:27` — `SECTIONS` and `Section` unused; only the `SectionId` type is imported. ~20 of 32 lines dead.
- `src/libs/dbError.ts:44` — `dbMessageOf`, zero call sites
- `src/libs/dayLabel.ts:58` — `sameDay` exported, used only internally
- `src/libs/prefs.ts:47` — `TODAY_COOKIE` exported, used only internally

**~25 exports with no external consumer** (mostly types): `PLAYER_SELECT`, `PublicPerson`, `PublicTournamentDetail`, `SEARCH_LIMIT`, `PublicClubPin`, `PublicPlayerSort`, `PublicSearchResults`, `Session`/`AuthFailure`/`PairFailure`, `MatchLike`/`SeatSource`/`Races`, `OTP_TYPES`/`OtpType`/`Branch`, `GroupableRow`, `OgFallback`, `PushPayload`, `ScoreBand`/`SCORE_BANDS`, `Theme`, `NewGame`, `NewLiveMatch`, `CreatePlayerInput`/`UpdatePlayerInput`, `NotificationKind`, `targetColumns`, `PendingMatch`/`NewTournament`, `NavItem`, `ScoreboardVariant`, `GamesListPlayer`.

`src/libs/auth.functions.ts:22` `Session` is worth calling out — documented as _"What the whole app knows about who is looking at it"_ and imported by nobody.

**~22 dead i18n keys × 3 dictionaries = 66 entries.** Confirmed-dead (no dynamic construction site): `theme.light`, `theme.dark`, `nav.profile`, `nav.theme`, `games.recent`, `dashboard.noGamesRecorded`, `common.seeAllPlural`, `drills.autoPlan`, `drills.autoPlanHint`, `drills.selectPlayerError`, `drills.viewCurrentPlan`, `drillLog.signInPrompt`, `drillLog.loadingPlayer`, `drillLog.linkPrompt`, `club.membersCount`, `live.youAre`, `live.against`, `tv.nextUp`, `kiosk.backToTable`, plus 5 under `public.publicClub.*` / `public.publicTournament.champion`. **Excluded** from that count: `difficulty.*`, `skill.*`, `theme.*` variants and `discipline.*`, which are reached by template construction (``t(`skill.${x}`)``) and documented as such at `src/types/index.ts:216, 248-249`. `i18n.check.ts` verifies the three dictionaries agree with each other but cannot detect a key none of them needs.

## 4.7 Stale type-workaround scaffolding — the schema already caught up

Seven places carry comments and casts asserting a column or RPC "is not in the generated types yet". **All seven are in the generated file now.**

| Claim                                                  | Workaround at                                               | Actually present at         |
| ------------------------------------------------------ | ----------------------------------------------------------- | --------------------------- |
| `clubs.slug` not generated                             | `src/types/index.ts:34-44`                                  | `database.types.gen.ts:164` |
| `clubs.timezone` not generated                         | `src/types/index.ts:45-50`, `src/hooks/useClub.tsx:102-110` | `:166`                      |
| `players.device_table_id` not generated                | `src/types/index.ts:115-118`                                | `:599`                      |
| `players.is_device` "arrives with live-night.sql"      | `src/queries/players.ts:86-93`                              | `:601`                      |
| `operator_clubs()` "newer than the types"              | `src/queries/operator.ts:34-45`                             | `:1081-1096`                |
| `claim_device` "types carry the old shape"             | `src/libs/auth.functions.ts:199-215`                        | `:1046-1052`                |
| `start_device_pairing` "types carry the 1-arg version" | `src/components/club/ClubTablesCard.tsx:62-77`              | `:1111-1114`                |

Three of these are **load-bearing**: they justify `as unknown as { rpc: … }` shims that cast the client to `unknown` to call an RPC untyped. Deleting the shims restores full type checking on three RPC call sites at zero cost.

This is the specific risk the codebase's comment density creates: heavily-commented code that goes stale reads as _authoritative_ stale.

## 4.8 Type assertions

`any` in hand-written code: **0** (the 5 grep hits are the English word in prose). `@ts-ignore`: **0**. `@ts-expect-error`: **4**, all in `polyfills.check.ts` and all deliberately commented. `eslint-disable`: **9**, all justified inline.

But: **561 `as` outside generated files, 95 of them `as const`** → ~466 real assertions, mostly the `return data as Game[]` query-return pattern. **22 are double casts (`as unknown as`)**, which erase checking entirely — 10 of them in `src/queries/public.ts` alone (`:296, 365, 408, 454, 479, 514, 532, 608, 609, 612`), plus `tournaments.ts:32,55`, `trainingPlan.ts:41`, `players.ts:58`, `operator.ts:38`, `useTournaments.tsx:71,131`, `auth.functions.ts:75,203`, `ClubTablesCard.tsx:65`.

`src/queries/players.ts:49-58` is the sharp one: `flattenPlayer` ends in `as unknown as Player`, while its own doc-comment at `:35-48` says the `Player` type is what enforces the embed. The double cast defeats exactly the enforcement the comment claims.

**Also unused: the generated Insert/Update helpers.** `TablesInsert<>`, `TablesUpdate<>`, `Tables<>`, `Enums<>` exist at the tail of `database.types.gen.ts` and are **imported nowhere**. `src/types/index.ts:20` defines a local `Row<T>` helper but no Insert/Update counterpart, so mutation payloads are hand-shaped — e.g. `src/hooks/useClub.tsx:78-88` re-declares 9 `clubs` columns by hand.

## 4.9 Console noise

13 `console.*`. Eleven are `console.error`/`warn` in error paths and defensible. Two aren't:

- `src/libs/push.functions.ts:125` — `console.log(\`[push] ${data.kind}#${data.id}: ${reason}\`)`, an unconditional server log left in by commit `db178eb "add logs to notification errors"`.
- `src/libs/queryClient.ts:3` — `const log = (error: unknown) => console.error(error)`, wired as the global query _and_ mutation error handler (`:15-25`), so every failed query prints a bare object with no context about which query failed.

## 4.10 Error handling is two-tier and only one tier is used

`src/libs/dbError.ts` (44 lines) maps Postgres codes to i18n keys — `23505` → `live.startError`, `42501`/`PGRST*` → `live.startDenied`, `P0001` → `live.startRefused`, else `common.error` (`:32-40`).

It is called at **7 sites, all live-match related**: `KioskBar.tsx:128`, `TablePage.tsx:175`, `TodayPage.tsx:90,422`, `LiveMatchPage.tsx:146,238,266`. The **other ~38 of 45 `toast.error(...)` sites use a flat hardcoded string** — which is precisely the failure mode `dbError.ts:5-10` describes as its reason for existing.

---

# Part 5 — What's genuinely good

Worth stating plainly, because it should survive any cleanup and belongs in the README:

- **Design system with real adoption.** `Button` imported in 47 files, `Card` 42, `EmptyState` 26, `Skeleton` 23, `Avatar` 21, `Ball` 21. Raw-element escapes across the whole app: 43 `<button`, 7 `<input`, 6 `<select`, 1 `<textarea` — and most `<button>`s are inside `ui/` primitives themselves. `ui/` uses named exports consistently (22 of 23; `ConfirmButton.tsx` is the lone `export default`).
- **Auth guarding is single-source and layered.** One gate at `src/routes/app/_authed/route.tsx:17-31`; everything under `/app/$clubSlug` inherits it with no repeated per-route check. Second-level guards all live in `beforeLoad` and all `throw redirect` — never a component-level `<Navigate>`. Deliberate exceptions (`app/pair.tsx:5-9`, `app/join.$slug.tsx:6-16`) each carry a comment saying why. `$clubSlug/route.tsx:42` returns `notFound()` rather than 403 for non-members, so club existence isn't disclosed. `ops.tsx:12-14` states outright that the client gate is courtesy and the SQL function is the real one.
- **Loaders are uniform.** All 31 routes with a loader use `context.queryClient.ensureQueryData(xQuery(...))`. No route builds a Supabase query inline (except `sitemap[.]xml.ts`, which is a server handler). `loaderDeps` used consistently — `ranking/daily.tsx:42-44` explicitly notes the loader must pass the same `tz` as the hook or it primes a key nothing reads.
- **RLS is complete.** 18 `CREATE TABLE` and 18 `ENABLE ROW LEVEL SECURITY` in `schema.sql` — no table left open. 117 policies, with predicates factored into `SECURITY DEFINER` helpers (`is_club_admin`, `is_club_member`, `is_club_device`, `is_own_person`, `is_public_club`, `person_shares_club`) rather than copy-pasted per policy.
- **Schema and types are in step.** `sql/schema.sql` and `database.types.gen.ts` were last committed together. Spot-checked three RPC signatures against the dump; all match.
- **i18n is perfect.** en/es/fr all exactly **859 keys**, zero set-difference in any direction, zero placeholder-signature mismatches, zero empty values, all three sharing an mtime. (Soft drift: 18 keys where the English string is byte-identical to the Spanish — either shared tokens or untranslated leftovers; the check script can't distinguish.)
- **`routes/` ↔ `pages/` split holds.** 54 of 66 route files import their component from `@/pages/…`; the 12 that don't are layouts or pure redirect shims. **Zero orphan pages** — every file in `pages/` is reachable from a route. Mean route file: 35 lines.
- **The comments are the best thing here.** `vite.config.ts` on plugin ordering, `libs/supabase.server.ts:18-20` on why a per-request client, `slug.check.ts:4-7` on the SQL contract, `package.json`'s `_comment` on why native binaries must be `optionalDependencies` and not `devDependencies` (EBADPLATFORM). This is senior-level writing and it is the strongest signal in the repo.

**Three deliberate deferrals are recorded as prose, not TODOs** — they won't be found by grepping:

- `src/types/index.ts:26-30` — _"this is papering over the schema. The real fix is one migration — `ALTER TABLE <t> ALTER COLUMN created_at SET NOT NULL` on clubs, games, challenges, comments and reactions — after which this helper can go."_
- `src/queries/players.ts:37-41` — `flattenPlayer` exists so ~18 components didn't have to learn the `players`/`people` split; the cost is that every player-selecting query must remember to embed and flatten.
- `src/libs/avatarImage.ts:7-9` — _"data URI in a TEXT column. Move to Supabase Storage if avatars ever need to be bigger… the ranking query pulls every player's avatar_url, so row size is paid on every fetch."_

Only **one** actual `TODO` exists in the whole codebase: `src/content/legal.ts:28` — _"The one mailbox the public pages hand out. TODO: confirm it exists and is monitored."_ On a legally-published contact address. Worth 5 minutes.

---

# Recommended sequence

Based on the four decisions taken: **full architectural pass**, **untrack AI tooling**, **migrate to Vitest**, **fix README errors keeping its shape**.

### Phase 0 — security, today

Rotate the Resend and Gmail credentials sitting in `.env` comments. Move to a password manager. (§1.2)

### Phase 1 — repo surface (~1 day, highest payoff per hour)

Add `LICENSE` (MIT) and `CONTRIBUTING.md` so both README badges resolve. Add `.env.example` with the four variable names and no values. Add `engines`, `packageManager`, `.nvmrc`. `git rm --cached bun.lock` and ignore it. `git rm -r --cached .agents .claude skills-lock.json` and ignore them. Add `.mailmap` collapsing the six identities. Delete the 10 merged/stale branches including `toutnaments`. Delete the empty `docs/` or fill it. Fix `README.md:68`'s broken `AppLink` path, correct the overstated features, add screenshots and the Netlify demo URL, credit the `vite-react-ts-supabase` origin.

### Phase 2 — enforcement (~half day)

Add `.github/workflows/ci.yml` on `push` + `pull_request`: install, `lint`, `check`, `tsc --noEmit`. Turn on `@typescript-eslint/no-explicit-any` (costs nothing — there are zero). Add `globals.node`. Add Prettier + `.editorconfig` and run it once. Add `NODE_VERSION` to `netlify.toml`.

Do this **before** Phase 3 — the refactors are much safer with a green CI gate behind them.

### Phase 3 — delete before refactoring (~half day)

Remove the 6 dead files/functions, ~25 dead exports, 66 dead i18n entries. Delete the 7 stale type-workaround comments and the 3 `as unknown as { rpc: … }` shims they justify (§4.7) — this _restores_ type safety rather than costing anything. Remove the two stray `console.log`s. De-duplicate `leaguePodium`, `CATEGORIES`, `MatchCard`, `MAX_OUT_BYTES`, `DISMISSED_KEY`.

### Phase 4 — Vitest migration (~1 day)

Convert the 21 `.check.ts` files (~430 assertions) to `*.test.ts`. The assertions port near-mechanically; `node:assert/strict` → `expect`. Keep the docblocks — especially `slug.check.ts:4-7`'s SQL contract note, which is the most valuable comment in the suite. Add component tests for the `ui/` primitives and one for `PlayGameForm`. Wire `vitest run` into the Phase 2 workflow. Once migrated, `erasableSyntaxOnly` and the POSIX-shell `check` script can both go.

### Phase 5 — structure (~2-3 days)

Split `libs/` into `libs/{algorithms,server,browser,supabase,theme}/` and move the 7 `libs/use*.ts` hooks into `hooks/`. Collapse the two Supabase client modules' placement (`src/supabaseClient.ts` → `libs/supabase/browser.ts`). Move `useEloRanking`'s 130 pure lines into `libs/algorithms/elo.ts` with a test. Move the three loose queries out of `useTournaments.tsx` into `queries/tournaments.ts`. Split `queries/public.ts` (618) by domain. Split `libs/bracket.ts` (611) into its four concerns. Move the 163-line `ClubLayout` out of `routes/app/_authed/$clubSlug/route.tsx` into `components/layout/`.

Pick one hook naming scheme (recommend dropping `useGet*`) and one file extension rule (`.ts` unless the file contains JSX — that reclassifies 20 of 26). Both are mechanical renames; do them in a single commit each so the diff is reviewable.

### Phase 6 — decomposition (~3-4 days)

`TournamentPage.tsx` first: lift the 16 inline derivations (`:91-191`) into `libs/algorithms/bracket/` where they become testable, extract `adminBlock` (`:210`, ~460 lines) into its own component, and delete the page-local `run()` in favour of a shared mutation-toast helper. Then `ActivityFeed.tsx` — 7 components, one file each. Then `DrillForm.tsx`. Then `LandingPage.tsx` onto the existing `src/content/` mechanism, which removes the two-content-strategies problem.

Extend `dbError.ts` to the other ~38 `toast.error` sites (§4.10) — the mapping already exists, it's just not wired up.

### Verification at every phase

`npm run lint && npm run check && npx tsc --noEmit -p tsconfig.app.json && npm run build`, then `npm run dev` and walk: sign in → club → today → add game → tournament bracket → live match → public club page. The i18n check and the `.check.ts`/Vitest suite catch pure-logic regressions; nothing catches component regressions until Phase 4 adds them, so keep Phase 6 behind Phase 4.

---

_Findings are reproducible from the working tree at `bbf3f2c` with the commands and file:line references given inline. Spot-check the grep-derived lists (dead exports §4.6, dead i18n keys §4.6) before deleting — a dynamic or re-exported consumer would not show up._
