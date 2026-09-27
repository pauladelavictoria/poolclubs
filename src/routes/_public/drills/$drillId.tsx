import { createFileRoute, notFound } from "@tanstack/react-router";
import PublicDrillPage from "@/pages/public/PublicDrillPage";
import { publicDrillQuery, publicDrillsQuery } from "@/queries/public/drills";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";

export const Route = createFileRoute("/_public/drills/$drillId")({
  loader: async ({ context, params }) => {
    const id = Number(params.drillId);
    if (!Number.isInteger(id) || id < 1) throw notFound();

    const drill = await context.queryClient.query({
      ...publicDrillQuery(id),
      staleTime: "static",
    });
    // Club-owned drills fall in here too: the query is restricted to the shared
    // catalog, so a club's own drill is a 404 rather than a redirect to sign in.
    if (!drill) throw notFound();

    // Related drills. Unpaginated over the shared catalog, so it is small, and
    // it parallelises with nothing else on this route — it depends on the
    // skill_type the drill fetch above just resolved.
    await context.queryClient.query({
      ...publicDrillsQuery({ skill_type: drill.skill_type }),
      staleTime: "static",
    });

    return { drill, origin: context.origin };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { drill, origin } = loaderData;
    const path = `/drills/${drill.id}`;
    return {
      meta: publicMeta({
        title: `${drill.name} · Ejercicio de billar · PoolClubs`,
        description: drill.description,
        path,
        origin,
        // The diagram is SVG in the page, which no crawler renders, so it is
        // redrawn as a PNG card — see routes/api/og/drills.
        image: `/api/og/drills/${drill.id}.png`,
        wideImage: true,
        fallback: "drills",
      }),
      links: canonical(path, origin),
    };
  },
  component: PublicDrillPage,
});
