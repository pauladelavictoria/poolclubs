# Email templates

The three emails Supabase sends on our behalf. **These files are not deployed by
anything.** They are pasted by hand into the dashboard, at
Authentication → Emails, the same way the SQL in `sql/` is applied by hand.

They live here so the copy and the markup are reviewable and diffable. Don't
assume `supabase/config.toml` drives them — it doesn't. That file is the stock
`supabase init` output and several of its values already contradict production
(`enable_confirmations`, `enable_anonymous_sign_ins`, `site_url`).

| File | Dashboard template | Subject |
|---|---|---|
| `confirmation.html` | Confirm signup | Confirma tu cuenta en PoolClubs |
| `recovery.html` | Reset password | Restablece tu contraseña de PoolClubs |
| `email-change.html` | Change email address | Confirma tu nuevo correo en PoolClubs |

Spanish only, because Spanish is the app's source language too — `src/i18n/es.json`
is what `type Key` is derived from. Supabase serves one template per type with no
language switching; per-language mail would need a send-email auth hook.

## The links matter more than the design

Every link goes to our own `/auth/callback` carrying `token_hash` and `type`,
**not** to Supabase's `/auth/v1/verify`. The stock link redeems through PKCE,
which needs a `code_verifier` cookie from the browser that started the sign-up —
so confirming from a phone, or from a mail client's in-app browser, failed and
dropped the person on a sign-in page with no explanation. `verifyOtp` needs
nothing from the browser. That is the entire reason these files exist.

`confirmation.html` appends to `{{ .RedirectTo }}` rather than building from
`{{ .SiteURL }}`, so signing up from an invite link comes back to the invite.
That only works because `callbackUrl()` in `src/libs/auth.functions.ts` always
sets `?next=`; if it ever stops doing that, the appended `&token_hash=` becomes
part of the path and every confirmation link dies. The two are a pair.

`type` values must stay in the allowlist in `src/libs/callbackParams.ts`, which
is asserted by `src/libs/callbackParams.test.ts` (`npm run test`).

## After editing

1. Paste the file into the dashboard and save.
2. Site URL under Authentication → URL Configuration must be `https://poolclubs.app`
   — `{{ .SiteURL }}` is built from it, so a wrong value breaks two of the three
   templates at once.
3. Send yourself one and open it on a different device than you signed up on.
   That is the case that used to fail.
