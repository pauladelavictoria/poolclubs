import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServer } from "@/libs/supabase/server";
import { buildObsSceneCollection } from "@/libs/algorithms/obsSceneCollection";

/**
 * The club's OBS scene collection, one scene per table with the overlay's
 * own URL already filled in — see docs/youtube-streaming.md Phase 1.5a.
 *
 * Admin-only, unlike logo.ts beside it: club_tables has no admin-only SELECT
 * policy (any member, and anon for a public club, can read it — RLS is about
 * table info being visible during scoring, not about who runs the stream), so
 * the check has to happen here rather than fall out of RLS. Same primitive
 * the "Admin can manage tables" policy itself uses.
 *
 * The stream key is deliberately never read or written here — see the doc's
 * Decisions table. A scene collection carries scenes and sources; RTMP
 * service settings live in a separate OBS profile export, which is why this
 * download stays harmless if a club forwards it around.
 */
export const Route = createFileRoute("/api/clubs/$slug/obs-scenes.json")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const supabase = getSupabaseServer();

        const { data: club } = await supabase
          .from("clubs")
          .select("id, name, slug")
          .eq("slug", params.slug)
          .maybeSingle();
        if (!club) return new Response(null, { status: 404 });

        const { data: isAdmin } = await supabase.rpc("is_club_admin", {
          cid: club.id,
        });
        if (!isAdmin) return new Response(null, { status: 403 });

        const { data: tables } = await supabase
          .from("club_tables")
          .select("id, label")
          .eq("club_id", club.id)
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true });

        const collection = buildObsSceneCollection({
          clubName: club.name,
          clubSlug: club.slug,
          tables: tables ?? [],
          origin: new URL(request.url).origin,
        });

        return new Response(JSON.stringify(collection, null, 2), {
          headers: {
            "content-type": "application/json",
            "content-disposition": `attachment; filename="${club.slug}-obs-scenes.json"`,
          },
        });
      },
    },
  },
});
