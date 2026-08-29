# Contributing

## Setup

1. Node ≥ 22.6 (native TypeScript stripping is required — see `.nvmrc`).
2. `npm install` — npm is the package manager this repo uses; `bun.lock` is
   stale and untracked.
3. Copy `.env.example` to `.env` and fill in the Supabase project's URL and
   anon key. Web push (`VITE_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`) is
   optional in dev — the feature switches itself off without them.
4. Apply `sql/schema.sql` to a Supabase project (see `sql/README.md` for the
   full loop, including `npm run db:dump` / `npm run db:types`).
5. `npm run dev` — SSR dev server on `:3000`.

## Before opening a PR

```bash
npm run lint
npm run check     # .check.ts assertion suite
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

## Commit messages

Conventional Commits (`fix:`, `feat:`, `refactor:`, `chore:`, …) with a
description that says _why_, not just _what_.

## Code style

- TypeScript strict-plus (see `tsconfig.app.json`); avoid `any`.
- `queryOptions` factories live in `src/queries/`, thin `useQuery` wrappers in
  `src/hooks/`. Don't call Supabase directly from a component.
- Comments explain _why_, not _what_ — see `vite.config.ts` for the standard
  this repo holds itself to.
