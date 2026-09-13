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
 */
export function getSupabaseServiceRole() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(import.meta.env.VITE_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
