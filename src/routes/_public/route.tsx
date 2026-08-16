import { Outlet, createFileRoute } from "@tanstack/react-router";
import { BallScopeStyle } from "@/components/club/ClubThemeStyle";
import { PublicFooter, PublicNav } from "@/components/layout/PublicShell";

/**
 * The public site's chrome, mounted once.
 *
 * A pathless layout route: it adds no URL segment, so /clubs stays /clubs. It is
 * the mirror of /app/_authed — same mechanism, opposite job. That one turns
 * strangers away; this one is the part of the product a stranger is allowed to
 * see, and has no guard at all.
 *
 * Unlike the app shell, nothing here locks the window scroll. A public page is a
 * web page: it scrolls, it can be printed, the browser's own find-in-page works
 * down the whole of it. The app shell's fixed-height column is right for a tool
 * and wrong for a page somebody arrived at from a search engine.
 */
export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <div data-public className="flex min-h-dvh flex-col overflow-x-clip">
      <BallScopeStyle />
      <PublicNav />
      <div className="flex-1">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
}
