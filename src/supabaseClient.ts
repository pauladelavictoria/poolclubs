import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types.gen";

/**
 * The generic is what makes every query self-checking: column names, filter
 * values, insert shapes and RPC arguments are all read from the generated
 * schema in src/types/database.types.gen.ts.
 *
 *   npm run db:types
 *
 * Run that after any migration. The file is committed so a checkout type-checks
 * without database access, and it is the only description of the schema in this
 * repo.
 */
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
