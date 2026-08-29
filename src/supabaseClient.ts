import { createBrowserClient } from "@supabase/ssr";
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
/**
 * createBrowserClient, not createClient: it keeps the session in cookies rather
 * than localStorage, which is the whole point — the server reads the same
 * cookies (see libs/supabase.server.ts), so a page can be rendered signed-in.
 * Everything else about this client is unchanged, which is why every hook and
 * the realtime channel still work as they did.
 *
 * Browser only. Server code uses getSupabaseServer().
 */
export const supabase = createBrowserClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
