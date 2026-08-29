import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { changePassword } from "@/libs/auth.functions";
import { useT } from "@/i18n";

/**
 * Setting a new password after a recovery link.
 *
 * Nothing here checks whether the visitor came from a recovery email, because
 * nothing needs to: the link was verified on /auth/callback, which signed them
 * in, and _authed turns away anyone without a session. Someone already signed
 * in can also just navigate here and change their password, which is a feature
 * rather than a hole — updateUser only ever touches the caller's own account.
 */
export default function UpdatePasswordPage() {
  const { t } = useT();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));

    setBusy(true);
    setError(null);
    try {
      const result = await changePassword({ data: { password } });
      if (result?.error) {
        setError(t("auth.passwordChangeError"));
        return;
      }
      await navigate({ to: "/app" });
    } catch {
      setError(t("auth.passwordChangeError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm p-7">
        <h1 className="text-h3 font-semibold text-ink">
          {t("auth.newPasswordTitle")}
        </h1>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.newPassword")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          {error && <p className="text-caption text-accent-red">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {t("auth.savePassword")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
