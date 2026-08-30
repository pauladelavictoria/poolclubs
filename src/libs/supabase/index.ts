import { createIsomorphicFn } from "@tanstack/react-start";
import { supabase } from "@/libs/supabase/browser";
import { getSupabaseServer } from "./server";

/**
 * The Supabase client for code that runs in both places.
 *
 * Everything in src/queries is called twice over: once by a route loader, which
 * runs on the server, and once by a component hook, which runs in the browser.
 * The two need different clients, and getting this wrong is silent — the browser
 * client on the server has no cookies to read, so RLS sees an anonymous request
 * and every club-scoped query comes back as an empty array rather than an error.
 * The loader then dehydrates that emptiness into the HTML and the page renders as
 * though the club had no games.
 *
 * createIsomorphicFn picks the right one and keeps the server-only import out of
 * the client bundle.
 *
 * Mutations don't need this: they only ever run from an event handler in the
 * browser, so they import the browser client directly.
 */
export const getSupabase = createIsomorphicFn()
  .server(() => getSupabaseServer())
  .client(() => supabase);
