import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { NEXT_KEY, isSafePath } from "@/libs/nextPath";
import { useT } from "@/i18n";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const next = isSafePath(rawNext) ? rawNext : "/app";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  // One slot for both the error and the "check your inbox" note — only one of
  // the two is ever on screen.
  const [note, setNote] = useState<{ text: string; ok?: boolean } | null>(null);

  // Already signed in — nothing to do here but leave
  if (!isLoading && user) return <Navigate to={next} replace />;

  const signIn = () => {
    // Google returns to a fixed URL, so the destination has to outlive the
    // page load. Layout picks it up again once the session lands — which means
    // coming back inside /app, not on the public landing at "/".
    sessionStorage.setItem(NEXT_KEY, next);
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
  };

  const submitEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const fullName = String(form.get("name") ?? "").trim();

    setBusy(true);
    setNote(null);
    // Same round-trip as OAuth: the confirmation link reloads the app at the
    // site root, so ?next= has to survive in sessionStorage.
    sessionStorage.setItem(NEXT_KEY, next);

    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            // Same key Google fills, so join_club() and the profile menu read
            // one field regardless of how the account was made.
            options: {
              emailRedirectTo: `${window.location.origin}/app`,
              data: { full_name: fullName },
            },
          });
    setBusy(false);

    if (error) {
      // Supabase messages are English-only; ours are translated, and vaguer on
      // purpose — "wrong password" tells a stranger the account exists.
      setNote({ text: t(mode === "signin" ? "auth.badCredentials" : "auth.signUpError") });
      return;
    }
    // Sign-up with email confirmation on returns a user but no session; the
    // auth listener takes over from here when a session does land.
    if (mode === "signup" && !data.session) {
      setNote({ text: t("auth.checkInbox"), ok: true });
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm p-7 text-center">
        <img
          src="/ball.png"
          alt=""
          className="mx-auto mb-5 h-14 w-14 rounded-full"
        />
        {/* The product name, not a club's — the login screen runs before we
            know which club you belong to. */}
        <h1 className="text-h2 font-semibold text-ink">{t("common.appName")}</h1>
        <p className="mx-auto mt-1 max-w-[30ch] text-body text-ink-soft">
          {t("auth.tagline")}
        </p>

        <button
          type="button"
          onClick={signIn}
          // Filled with ink, not with the accent: signing in with Google is the
          // way in, but the accent is spent on actions inside the app. The hover
          // is a token, since `white` is invisible under light mode's pale text.
          className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-control bg-ink font-medium text-pocket transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-ink-strong active:scale-[0.97]"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t("auth.continueWithGoogle")}
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-hairline" />
          <span className="text-caption text-ink-faint">{t("auth.or")}</span>
          <span className="h-px flex-1 bg-hairline" />
        </div>

        <form onSubmit={submitEmail} className="space-y-3 text-left">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("auth.name")}</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={60}
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
          </div>

          {note && (
            <p
              className={`text-caption ${note.ok ? "text-ink-soft" : "text-accent-red"}`}
            >
              {note.text}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {t(mode === "signin" ? "auth.signIn" : "auth.signUp")}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 text-caption text-ink-soft underline underline-offset-2"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setNote(null);
          }}
        >
          {t(mode === "signin" ? "auth.needAccount" : "auth.haveAccount")}
        </button>
      </Card>
    </div>
  );
}
