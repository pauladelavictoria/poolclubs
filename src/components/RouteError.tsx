import { useRouteError } from "react-router-dom";
import { LuTriangleAlert } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/i18n";

/**
 * A render error used to be a white screen. This is the router's errorElement,
 * so it also catches a route chunk that failed to arrive — which is the one
 * error this app is actually likely to throw in production, see isStaleChunk.
 */
export default function RouteError() {
  const { t } = useT();
  const error = useRouteError();

  // Nothing else reports this, so the console is the only record.
  console.error(error);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={<LuTriangleAlert className="h-5 w-5" aria-hidden />}
        title={t("crash.title")}
        hint={t(isStaleChunk(error) ? "crash.stale" : "crash.body")}
        action={
          <Button onClick={() => window.location.reload()}>
            {t("crash.reload")}
          </Button>
        }
      />
    </div>
  );
}

/**
 * Route chunks are content-hashed, so a deploy renames every one of them. A tab
 * left open across a deploy — or an installed PWA resumed days later — asks for
 * a filename the server no longer has, and the dynamic import rejects. Nothing
 * is broken; the page is just out of date, and saying so beats "something
 * broke" when a reload genuinely is the whole fix.
 *
 * Matched on the message because that is all the browsers agree on, and each
 * words it differently.
 */
function isStaleChunk(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module")
  );
}
