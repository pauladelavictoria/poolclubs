import { Link } from "@tanstack/react-router";
import { LuCompass } from "react-icons/lu";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT } from "@/i18n";

/**
 * The router's defaultNotFoundComponent. It replaces two catch-all routes that
 * used to silently <Navigate> a bad URL to "/" or "/app" — which hid typos and
 * made a dead link look like a working one.
 */
export function NotFound() {
  const { t } = useT();

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={<LuCompass className="h-5 w-5" aria-hidden />}
        title={t("notFound.title")}
        hint={t("notFound.body")}
        action={
          <Link to="/" className={buttonClasses()}>
            {t("notFound.home")}
          </Link>
        }
      />
    </div>
  );
}
