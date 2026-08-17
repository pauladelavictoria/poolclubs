import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import type { Database } from "@/types/database.types.gen";

/**
 * The Supabase client for code running on the server.
 *
 * The session used to live in localStorage, which the server cannot read — so
 * nothing rendered until the browser had asked Supabase who the user was. Now
 * `@supabase/ssr` keeps it in cookies: they arrive with the request, so
 * beforeLoad knows the user before a single component runs, and the browser
 * client (src/supabaseClient.ts) reads those same cookies, which is why every
 * existing hook and the realtime channel carry on working unchanged.
 *
 * Never import this from a component. It is for server functions and server
 * route handlers only — the `.server.ts` suffix is the reminder.
 *
 * A fresh client per call, deliberately: it closes over this request's cookies,
 * so a module-level singleton would hand one user's session to the next.
 */
export function getSupabaseServer() {
  return createServerClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () =>
          Object.entries(getCookies()).map(([name, value]) => ({
            name,
            value: value ?? "",
          })),
        setAll: (cookies) => {
          // The options are the security: httpOnly keeps the token away from
          // any script on the page, secure keeps it off plain HTTP, sameSite
          // is the CSRF half. Supabase supplies them — passing only name and
          // value, as some examples do, silently drops all three.
          cookies.forEach(({ name, value, options }) =>
            setCookie(name, value, options),
          );
        },
      },
    },
  );
}
