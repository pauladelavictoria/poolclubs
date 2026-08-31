import { createFileRoute } from "@tanstack/react-router";
import ProsePage from "@/pages/public/ProsePage";
import { publicMeta, canonical } from "@/libs/algorithms/publicMeta";

/**
 * One address, no form.
 *
 * A contact form needs a mailbox, a provider and a spam story before it is worth
 * anything, and none of that exists yet — a `mailto:` reaches the same person
 * today. This page is also the route GDPR requests and the aviso legal point at,
 * so it has to exist before the first signup that isn't us.
 */
export const Route = createFileRoute("/_public/contact")({
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Contacto · PoolClubs",
      description:
        "Escríbenos sobre tu club, un error o una solicitud de protección de datos.",
      path: "/contact",
      origin: match.context.origin,
      fallback: "default",
    }),
    links: canonical("/contact", match.context.origin),
  }),
  component: () => <ProsePage id="contact" />,
});
