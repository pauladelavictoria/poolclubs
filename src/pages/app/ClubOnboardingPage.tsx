import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { LuUsers } from "react-icons/lu";
import { useSession } from "@/hooks/useAuth";
import { useJoinOrCreateClub } from "@/hooks/useClub";
import PageTitle from "@/components/layout/PageTitle";
import CancelLink from "@/components/layout/CancelLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";

/**
 * What a signed-in user with no club sees. Two ways in: start one, or type the
 * slug a friend sent. The box just navigates to /join/:slug so there is one
 * join implementation, not two.
 */
export default function ClubOnboardingPage() {
  const { t } = useT();
  const navigate = useNavigate();
  // useSession, not useAuth: this page also renders at /app/clubs/new, where
  // there is no club in the URL to read one from.
  const { memberships } = useSession();
  const { createClub } = useJoinOrCreateClub();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const pending = memberships.filter((m) => m.status === "pending");
  // Where "never mind" goes. Only somebody already in a club has one: for a
  // brand new account this page is the start of the app, with nothing behind
  // it, and the route sits outside $clubSlug so there is no crumb either.
  const home = memberships.find((m) => m.status === "active")?.club?.slug;

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createClub.mutate(name, {
      // createClub's own mutationFn navigates to the new club once the session
      // has been re-read and its slug is known — see useJoinOrCreateClub.
      onSuccess: () => toast.success(t("club.created")),
      onError: () => toast.error(t("common.error")),
    });
  };

  return (
    <>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-6">
        <PageTitle title={t("club.welcome")} />
        {pending.length > 0 && (
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <LuUsers
                className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint"
                aria-hidden
              />
              <div>
                <p className="text-body font-medium text-ink">
                  {t("club.awaitingTitle", {
                    club: pending.map((m) => m.club?.name ?? "—").join(", "),
                  })}
                </p>
                <p className="mt-1 text-body text-ink-faint">
                  {t("club.awaitingHint")}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardHeader title={t("club.createTitle")} />
          <form onSubmit={submitCreate} className="space-y-3 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="club-name">{t("club.name")}</Label>
              <Input
                id="club-name"
                value={name}
                maxLength={60}
                placeholder={t("club.namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <p className="text-caption text-ink-faint">
              {t("club.createHint")}
            </p>
            <Button
              type="submit"
              className="w-full"
              disabled={!name.trim() || createClub.isPending}
            >
              {createClub.isPending ? t("common.saving") : t("club.create")}
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title={t("club.joinTitle")} />
          <form
            className="space-y-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              // The invite link is the club's own address now, so most people
              // paste the whole https://…/app/join/<slug> rather than typing
              // just the slug — take whatever comes after the last "/".
              const raw = slug.trim().toLowerCase();
              const clean = raw.slice(raw.lastIndexOf("/") + 1);
              if (clean) navigate({ to: "/app/join/$slug", params: { slug: clean } });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="join-slug">{t("club.code")}</Label>
              <Input
                id="join-slug"
                value={slug}
                autoCapitalize="none"
                spellCheck={false}
                className="font-mono"
                placeholder={t("club.codePlaceholder")}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={!slug.trim()}
            >
              {t("club.join")}
            </Button>
          </form>
        </Card>

        {home && (
          <div className="flex justify-center">
            <CancelLink to="/app/$clubSlug" params={{ clubSlug: home }} />
          </div>
        )}
      </div>
    </>
  );
}
