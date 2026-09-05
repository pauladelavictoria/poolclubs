import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { LuCircleCheck } from "react-icons/lu";
import PublicShell from "@/components/layout/PublicShell";
import { headlineClasses } from "@/components/layout/publicTitleStyles";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useSession } from "@/hooks/useAuth";
import { useClubRequests } from "@/hooks/useClub";
import { myClubRequestQuery } from "@/queries/operator";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { loginLink } from "@/libs/algorithms/nextPath";
import { useT } from "@/i18n";

/**
 * "Add my club." The only way a club comes into existence now — nothing inside
 * the app creates one, so this page and the Approve button on /app/ops are the
 * whole of it.
 *
 * Public, and signed out it is a sign-up that comes back here: the request is
 * filed against an account because that account is what the club gets handed to
 * on approval. Same shape as claiming a club off its own public page, for the
 * same reason.
 */
export default function ClubRequestPage() {
  const { t } = useT();
  const { user } = useSession();
  const { requestClub } = useClubRequests();

  // Only asked for once there is somebody to ask about: signed out this reads
  // nothing back anyway, and the sign-up card does not need it.
  const { data: mine } = useQuery({
    ...myClubRequestQuery(),
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [note, setNote] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    requestClub.mutate(
      { name: name.trim(), city, country, note },
      {
        onSuccess: () => toast.success(t("clubRequest.sent")),
        onError: (err) =>
          toast.error(
            t(
              dbErrorMessage(err, "requestClub", {
                denied: "common.deniedError",
                fallback: "clubRequest.error",
              }),
            ),
          ),
      },
    );
  };

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl px-3 py-10">
        <h1 className={headlineClasses("display", "max-w-[20ch]")}>
          {t("clubRequest.title")}
        </h1>
        <p className="mt-3 max-w-[52ch] text-body text-ink-soft">
          {t("clubRequest.lede")}
        </p>

        {!user ? (
          <Card className="mt-8 overflow-hidden">
            <div className="space-y-4 p-5">
              <p className="text-body text-ink-soft">
                {t("clubRequest.signInHint")}
              </p>
              {/* A full page load: the session lands in a cookie, and the
                  ?next= has to survive the OAuth round trip in the URL. */}
              <a
                href={loginLink("/clubs/new")}
                className={buttonClasses({ className: "w-full" })}
              >
                {t("clubRequest.signInCta")}
              </a>
            </div>
          </Card>
        ) : mine ? (
          // One open request at a time — request_club returns the existing one
          // rather than filing a second, and this is that answer with a face on.
          <Card className="mt-8 p-5">
            <div className="flex items-start gap-3">
              <LuCircleCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint"
                aria-hidden
              />
              <div>
                <p className="text-body font-medium text-ink">
                  {t("clubRequest.pendingTitle", { club: mine.name })}
                </p>
                <p className="mt-1 text-body text-ink-faint">
                  {t("clubRequest.pendingHint")}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="mt-8 overflow-hidden">
            <CardHeader title={t("clubRequest.formTitle")} />
            <form onSubmit={submit} className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="club-name">{t("clubRequest.name")}</Label>
                <Input
                  id="club-name"
                  value={name}
                  maxLength={60}
                  required
                  placeholder={t("clubRequest.namePlaceholder")}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="club-city">{t("clubRequest.city")}</Label>
                  <Input
                    id="club-city"
                    value={city}
                    maxLength={80}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="w-24 space-y-1.5">
                  <Label htmlFor="club-country">
                    {t("clubRequest.country")}
                  </Label>
                  {/* Two letters, uppercase, because that is the shape the
                      clubs table's CHECK accepts — better refused here than by
                      the INSERT the approval turns into. */}
                  <Input
                    id="club-country"
                    value={country}
                    maxLength={2}
                    pattern="[A-Za-z]{2}"
                    autoCapitalize="characters"
                    className="font-mono uppercase"
                    placeholder="ES"
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="club-note">{t("clubRequest.note")}</Label>
                <textarea
                  id="club-note"
                  value={note}
                  rows={4}
                  maxLength={1000}
                  placeholder={t("clubRequest.notePlaceholder")}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-control border border-hairline bg-felt px-3 py-2 text-body text-ink placeholder:text-ink-ghost focus:outline-none focus:ring-2 focus:ring-strike/40"
                />
                <p className="text-caption text-ink-faint">
                  {t("clubRequest.noteHint")}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!name.trim() || requestClub.isPending}
              >
                {requestClub.isPending
                  ? t("common.saving")
                  : t("clubRequest.submit")}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}
