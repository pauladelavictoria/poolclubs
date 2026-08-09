# Vite Typescript/React Supabase

## Install Supabase

You need Docker to install supabase locally.

```bash
npm install supabase --save-dev
npx supabase init
npx supabase start
```

## Create table

Run sample-db.sql query in supabase studio > SQL editor.

Don't forget to enable Realtime in Table Editor > Tasks > Realtime on.

## Migrations

Files in `sql/` are applied by hand, in this order. `sample-db.sql` is stale for
`players` and `games` — the live shape of those two tables is not in the repo.

1. `supabase-migration-drills.sql`, then the `drills-seed-*.sql` you want
   (**`drills-seed-bu.sql` starts with `DELETE FROM drills`**)
2. `supabase-migration-player-user-link.sql`
3. `supabase-migration-drills-write.sql`
4. `supabase-migration-players-policy-split.sql`
5. `supabase-migration-drill-logs-delete.sql`
6. `supabase-migration-clubs.sql` — turns the single club into tenants and makes
   every club members-only. Read its header first: it needs player 1 linked to
   an account, and it drops policies by name, so check `pg_policies` for any
   added through the dashboard.
7. `supabase-migration-social.sql` — challenges, comments, reactions.

## Install project

```
bun install
```

## Set env vars in .env

You'll need the anon key and supabase API url.

```
bun run dev
```

## List of installed packages

- react-router-dom
- react-icons
- react-hook-form
- @tanstack/react-query
- react-toastify
- tailwind
