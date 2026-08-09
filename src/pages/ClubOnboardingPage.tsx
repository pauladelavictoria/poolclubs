import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LuUsers } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useJoinOrCreateClub } from "@/hooks/useClub";
import PageHeader from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";

/**
 * What a signed-in user with no club sees. Two ways in: start one, or paste the
 * code a friend sent. The code box just navigates to /join/:code so there is
 * one join implementation, not two.
 */
export default function ClubOnboardingPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { memberships } = useAuth();
  const { createClub } = useJoinOrCreateClub();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const pending = memberships.filter((m) => m.status === "pending");

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createClub.mutate(name, {
      onSuccess: () => {
        toast.success(t("club.created"));
        navigate("/");
      },
      onError: () => toast.error(t("common.error")),
    });
  };

  return (
    <>
      <PageHeader title={t("club.welcome")} />

      <div className="mx-auto max-w-xl space-y-4 px-3 py-6">
        {pending.length > 0 && (
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <LuUsers className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint" aria-hidden />
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
            <p className="text-caption text-ink-faint">{t("club.createHint")}</p>
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
              const clean = code.trim().toLowerCase();
              if (clean) navigate(`/join/${encodeURIComponent(clean)}`);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="join-code">{t("club.code")}</Label>
              <Input
                id="join-code"
                value={code}
                autoCapitalize="none"
                spellCheck={false}
                className="font-mono"
                placeholder={t("club.codePlaceholder")}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full" disabled={!code.trim()}>
              {t("club.join")}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
