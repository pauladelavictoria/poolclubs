import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types.gen";

/**
 * The service-role client, for the tables RLS denies to anon and
 * authenticated outright — club_youtube, club_streams, stream_sessions (see
 * docs/youtube-streaming.md §2.2). Only server routes and the reconciler may
 * import this; never a component, and never re-exported to the client bundle.
 *
 * A fresh client per call, like getSupabaseServer — this one carries no
 * per-request state at all, but the same "no module-level singleton" habit
 * keeps the two clients easy to tell apart at a glance.
 *
 * Also imported from netlify/functions/youtube-reconcile.mts, which esbuild
 * bundles standalone — outside Vite, so `import.meta.env` is never rewritten
 * and reads as undefined. process.env.VITE_SUPABASE_URL is the fallback:
 * Netlify injects every configured site env var into a function's
 * process.env regardless of its VITE_ prefix, that prefix only controls
 * Vite's client-bundle inlining.
 */
export function getSupabaseServiceRole() {
  const url = import.meta.env?.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
