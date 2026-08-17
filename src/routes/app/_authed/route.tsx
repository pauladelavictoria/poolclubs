import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Signed in, or you don't get past here.
 *
 * A pathless layout route, so it adds a guard without adding a URL segment:
 * everything underneath is /app/… and protected by this one check. It replaces
 * the old <ProtectedRoute> component, which could only turn people away *after*
 * rendering — a skeleton, then a redirect. This runs on the server, before any
 * component and before any loader, so an unauthorised request never reaches the
 * data it was asking for.
 *
 * `session` is put on the context so children get the user and their memberships
 * already narrowed to non-null.
 */
export const Route = createFileRoute("/app/_authed")({
  beforeLoad: ({ context, location }) => {
    if (!context.session) {
      throw redirect({
        to: "/app/login",
        // Where to come back to. The provider round trip carries this onward as
        // /auth/callback?next=… — see libs/auth.functions.ts.
        search: { next: location.href },
      });
    }

    return {
      user: context.session.user,
      memberships: context.session.memberships,
    };
  },
  component: () => <Outlet />,
});
