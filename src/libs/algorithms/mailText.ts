/**
 * The one transactional email this app sends itself.
 *
 * Spanish only, and deliberately, for exactly the reason the three Supabase
 * auth templates are (see supabase/templates/README.md): Spanish is the app's
 * source language, and there is nowhere to read a recipient's preference from.
 * A push knows, because push_subscriptions.lang was recorded on the recipient's
 * own device; a brand-new member has no device and no row. So the copy lives
 * here rather than in the i18n dictionaries, next to the markup it fills, the
 * same way the auth templates hold theirs.
 *
 * ponytail: the upgrade, if it is ever wanted, is a `lang` column on `people`
 * written at sign-up — not a lookup, which would be empty in this exact case.
 *
 * Kept apart from mail.functions.ts so the wording and the escaping are
 * testable without a network call or a server runtime.
 */

/** The deployed site. Not an env var, for the same reason VAPID_SUBJECT in
 *  push.functions.ts is not one: it is not a secret and it does not vary by
 *  deploy. Deliberately not taken from the caller — this string ends up as a
 *  link in an email, and a link built from something the browser sent is a
 *  phishing vector with our name on it. */
const SITE = "https://poolclubs.app";

/** Must be a domain verified in Resend, or every send fails with a 403. */
export const MAIL_FROM = "PoolClubs <hola@poolclubs.app>";

/** Names and club names are typed by people. They land inside an HTML
 *  attribute and inside element text, so they are escaped for both. */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export type MemberApproved = {
  /** The new member's display name in that club. */
  name: string;
  clubName: string;
  clubSlug: string;
};

/**
 * "You're in." Subject, an HTML body matching the auth templates, and a plain
 * text alternative for clients that will not render the HTML.
 *
 * The link goes straight to the club rather than to /app, because the whole
 * point of the mail is that this specific club is now open to them.
 */
export function memberApprovedMail({
  name,
  clubName,
  clubSlug,
}: MemberApproved) {
  const url = `${SITE}/app/${encodeURIComponent(clubSlug)}`;
  const club = escapeHtml(clubName);
  const who = escapeHtml(name);

  return {
    subject: `Ya eres miembro de ${clubName}`,
    text: [
      `Hola ${name},`,
      "",
      `Un administrador ha aprobado tu entrada en ${clubName}. Ya puedes registrar partidos, ver el ranking y apuntarte a los torneos.`,
      "",
      url,
      "",
      "Recibes este correo porque pediste entrar en este club en PoolClubs.",
    ].join("\n"),
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f5f9;margin:0;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid rgba(9,11,14,0.1);border-radius:14px;">
        <tr>
          <td style="padding:32px 32px 24px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:10px;" valign="middle">
                  <img src="${SITE}/ball.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;border-radius:16px;">
                </td>
                <td valign="middle" style="font-size:18px;font-weight:600;color:#12161c;letter-spacing:-0.01em;">
                  PoolClubs
                </td>
              </tr>
            </table>

            <h1 style="margin:24px 0 0 0;font-size:22px;line-height:1.3;font-weight:600;color:#12161c;">
              Ya eres miembro de ${club}
            </h1>

            <p style="margin:12px 0 0 0;font-size:15px;line-height:1.55;color:#49525e;">
              Hola ${who}: un administrador ha aprobado tu entrada. Ya puedes
              registrar partidos, ver el ranking y apuntarte a los torneos.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0 0;">
              <tr>
                <td align="center" bgcolor="#966c00" style="border-radius:10px;">
                  <a href="${url}"
                     style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                    Abrir ${club}
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0 0;font-size:13px;line-height:1.55;color:#69727e;">
              Si el botón no funciona, copia esta dirección en tu navegador:<br>
              <span style="color:#49525e;word-break:break-all;">${url}</span>
            </p>

            <p style="margin:24px 0 0 0;padding-top:20px;border-top:1px solid rgba(9,11,14,0.1);font-size:13px;line-height:1.55;color:#69727e;">
              Recibes este correo porque pediste entrar en este club en
              PoolClubs. ¿Dudas? Escríbenos a
              <a href="mailto:hola@poolclubs.app" style="color:#966c00;text-decoration:underline;">hola@poolclubs.app</a>.
            </p>

          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  };
}
