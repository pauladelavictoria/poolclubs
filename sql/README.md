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

**`drills-seed-*.sql`** are hand-written data, not schema: the global drill
library, one file per source. Apply one with `npm run db:sql sql/drills-seed-ppc.sql`.

Applying a change is still manual — write the SQL, run it against the project,
then re-dump. There is no `supabase/migrations/` directory and no migration
runner; the incremental `supabase-migration-*.sql` files this folder used to hold
were replaced by `schema.sql`, which reflects the database as it actually is
rather than as a pile of edits hopefully applied in order. They remain in git
history if you need to see how something came to be.
