import { createFileRoute, notFound } from "@tanstack/react-router";
import PublicDrillPage from "@/pages/public/PublicDrillPage";
import { publicDrillQuery, publicDrillsQuery } from "@/queries/public";
import { publicMeta, canonical } from "@/libs/publicMeta";

export const Route = createFileRoute("/_public/drills/$drillId")({
  loader: async ({ context, params }) => {
    const id = Number(params.drillId);
    if (!Number.isInteger(id) || id < 1) throw notFound();

    const drill = await context.queryClient.ensureQueryData(
      publicDrillQuery(id),
    );
    // Club-owned drills fall in here too: the query is restricted to the shared
    // catalog, so a club's own drill is a 404 rather than a redirect to sign in.
    if (!drill) throw notFound();

    // Related drills. Unpaginated over the shared catalog, so it is small, and
    // it parallelises with nothing else on this route — it depends on the
    // skill_type the drill fetch above just resolved.
    await context.queryClient.ensureQueryData(
      publicDrillsQuery({ skill_type: drill.skill_type }),
    );

    return { drill, origin: context.origin };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { drill, origin } = loaderData;
    const path = `/drills/${drill.id}`;
    return {
      meta: publicMeta({
        title: `${drill.name} · Pool drill · PoolClubs`,
        description: drill.description,
        path,
        origin,
        // A drill's diagram is drawn as SVG in the page, so there is no image
        // file to point a crawler at — the section card stands in.
        fallback: "drills",
      }),
      links: canonical(path, origin),
    };
  },
  component: PublicDrillPage,
});
