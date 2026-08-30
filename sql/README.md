# sql/

**`schema.sql`** is the database, dumped from the live project. Tables, the
`GameMode` enum, every RLS policy, every CHECK, the indexes, and the function and
trigger bodies. Regenerate it after any migration:

```bash
npm run db:dump    # needs Docker running — pg_dump runs in a container
npm run db:types   # and the TypeScript the app is typed from
```

Run both together. `schema.sql` is what the database _is_; `src/types/database.types.gen.ts`
is what the app compiles against. They come from the same place and drift together.

**`drills-seed-*.sql`** and **`demo-club.sql`** are hand-written data, not schema:
the global drill library, one file per source, and a club's worth of plausible
results to develop against. Apply one with `npm run db:sql sql/drills-seed-ppc.sql`.

## Making a change

Applying a change is manual — write the SQL in a scratch file, run it against the
project with `npm run db:sql`, then re-dump. There is no `supabase/migrations/`
directory and no migration runner.

**The scratch file does not stay here.** This folder used to hold every patch
ever applied — two dozen of them, all of them already inside `schema.sql`, each
one a second place to look and a chance to read a policy that had since been
replaced. `git log -- sql/` has them, with the message that says why. Delete the
file once the dump reflects it, and let a code comment cite `sql/schema.sql`
rather than a patch that will be gone.
