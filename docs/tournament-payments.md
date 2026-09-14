# Automated tournament entry payments

**Status:** planned, not started. Written 2026-09-13.
**Nothing in this document has been built.** No table, route, env var or
dependency described here exists in the repo yet, and no part of it should be
read as legal, tax or accounting advice — see "Who needs to sign off" at the
end.

---

## Why this document exists

Entry fees today are a free-text field (`tournaments.entry_fee`, e.g. "15 €"
or "free for members") and payment is tracked by hand: an admin ticks a
"paid" toggle per entrant (`tournament_players.paid`, shipped this session)
after collecting cash or a bank transfer outside the app entirely. Starting a
`requires_payment` tournament now prompts to remove anyone still unticked.

That is deliberately the cheap version. This document is what it would take
to remove the human in the loop — a player pays inside the app at the moment
they join, the club receives the money without PoolClubs ever holding it, and
`paid` sets itself from a webhook instead of an admin's memory of who handed
over cash at the bar.

The short version of the answer: this is not mainly a coding problem. The
code is a Stripe Connect integration, which is well-trodden ground. The real
cost is that **PoolClubs would become a payments marketplace** — money moving
from a player, through infrastructure PoolClubs operates, to a club — and
that drags in card-network rules, EU payment-services law, VAT treatment on
two different invoices per transaction, and a reporting obligation on
Satellite Studio Digital S.L. itself. None of that exists today because no
money currently moves through the app at all.

---

## What already exists (verified against the code, 2026-09-13)

| Fact | Where |
|---|---|
| `tournaments.entry_fee` is free text, no currency or amount encoding — "15 €", "£10 members" are both valid values, unparseable by a computer | `sql/schema.sql`, `src/components/tournaments/TournamentForm.tsx` |
| `tournaments.requires_payment` (boolean, default false) — just added, purely a UI gate today | `sql/schema.sql`, migration this session |
| `tournament_players.paid` (boolean, default false) — admin-toggled by hand, no money changes hands to set it | `sql/schema.sql` |
| Admin-only UPDATE RLS policy already exists for `tournament_players`, scoped by `is_club_admin(tournament_club(tournament_id))` — the exact predicate a Stripe-aware update would reuse | `sql/schema.sql`, `"Admin can mark entrants paid"` policy |
| `clubs` has `owner_id` (→ `auth.users`), `country` (ISO-3166 alpha-2, CHECK-constrained), `contact_email` — no legal name, no tax ID, no bank details, no currency | `sql/schema.sql`, `clubs` table |
| The company operating PoolClubs is a real, named Spanish entity: **Satellite Studio Digital S.L.**, NIF `B88036348`, Valencia — this is who would be the counterparty on every Stripe platform account and every invoice to a club | `src/content/legal.ts` (`OPERATOR`) |
| No payment or billing code anywhere in the repo today (grepped for `stripe`, `billing`, `invoice` — no hits) | whole-repo search |
| A near-identical OAuth-connect precedent already exists and is the shape to copy: `/api/youtube/connect` redirects a club admin to Google, `/api/youtube/callback` re-checks `is_club_admin` server-side (never trusts the signed state alone for authorization), exchanges the code, and upserts an encrypted token with the service-role client | `src/routes/api/youtube/connect.ts`, `src/routes/api/youtube/callback.ts` |
| Secret convention: `VITE_`-prefixed env vars are public (inlined client-side); unprefixed ones are server-only (`process.env`, read only in server routes) | `netlify.toml` comments, `src/libs/server/*.functions.ts` |
| Hosting is Netlify via `@netlify/vite-plugin-tanstack-start`; server routes live under `src/routes/api/*` as `createFileRoute(...).server.handlers` | `src/routes/api/youtube/callback.ts`, `netlify.toml` |
| `encryptSecret`/service-role helpers already exist for storing a third party's opaque token per club | `src/libs/server/crypto.ts`, `src/libs/supabase/serviceRole.ts` |
| Clubs already quote fees in more than one currency informally — the English placeholder uses £, Spanish/French use € (`src/i18n/*.json`, `tournaments.entryFeePlaceholder`) — so multi-currency is a real requirement, not a hypothetical |

Because the OAuth-connect pattern, the server-route layout, the secret
convention and the admin-authorization predicate all already exist, the
*engineering* shape of "club connects a payment account" is not new work —
it is the YouTube integration's skeleton with Stripe in place of Google. The
new work is everything payments-specific: PCI exposure, webhooks as the only
source of truth, refunds, and the accounting/legal layer below.

---

## Recommended architecture: Stripe Connect, PoolClubs never holds the money

The one architectural decision everything else follows from: **PoolClubs
(Satellite Studio Digital S.L.) must never receive a player's payment into
its own account and then forward it to a club.** That pattern — collecting
money from one party to pay out to another — is regulated payment-services
activity under the EU's PSD2 directive. Doing it directly would require
PoolClubs to become an authorised payment institution (or e-money
institution), which is a licensing process measured in months and real legal
cost, entirely disproportionate to a small SaaS.

**Stripe Connect** exists specifically to avoid this: each club gets its own
Stripe "connected account", and Stripe — which already holds the necessary
licenses across the EU/UK/US — moves money directly from the player's card to
the club's account. PoolClubs's own cut is taken automatically at the same
moment via an **application fee**, without ever touching PoolClubs's bank
account or balance sheet in between. This is the standard reason every
marketplace SaaS (booking platforms, freelance marketplaces, creator
platforms) is built this way rather than running its own ledger.

Within Connect, three account types exist:

- **Express** — recommended. A short, Stripe-hosted onboarding flow (ID,
  bank account) that a club admin completes once; Stripe owns the KYC
  checks, the payout dashboard, and country-specific tax-form collection
  (e.g. EU VAT-related self-certifications). PoolClubs never sees or stores
  a club's ID documents or bank details.
- **Standard** — even lighter for PoolClubs (the club effectively gets a
  full independent Stripe dashboard), but weaker platform branding and
  slightly less control over the player-facing checkout experience.
- **Custom** — full control, but PoolClubs would own the onboarding UI,
  identity verification, and much of the compliance burden Stripe otherwise
  absorbs. Not worth it without a dedicated compliance function.

Payment collection should be a **Stripe Checkout Session** (Stripe-hosted
page), not a hand-built card form:

- Card data never touches PoolClubs's servers or frontend, which keeps PCI-
  DSS scope at the lightest self-assessment tier (**SAQ A**). Embedding
  Stripe Elements directly in the app instead would raise that to SAQ A-EP
  for no real benefit here.
- Checkout handles 3-D Secure / Strong Customer Authentication natively,
  which EU card payments require under PSD2 — a hand-rolled form would have
  to reimplement this itself.
- `payment_intent_data.application_fee_amount` (destination charges) takes
  PoolClubs's cut and settles the remainder to the club's connected account
  in one step, with one Stripe fee, not two separate transfers.

---

## Schema changes this implies

None of this exists yet; sketched, not final:

- **`clubs`**: `stripe_account_id` (Stripe's `acct_...` id), `stripe_charges_enabled`, `stripe_payouts_enabled` (Stripe tells you these per account; a club can be "connected" but not yet able to receive money if Stripe is still waiting on a document).
- **`tournaments`**: a structured amount replaces free text for anything actually charged — `entry_fee_cents` (integer) + `entry_fee_currency` (ISO 4217, e.g. `"EUR"`). The existing free-text `entry_fee` likely stays as a display fallback for clubs that quote a fee but still collect it in person (i.e. `requires_payment = false`).
- **`tournament_players`**: `stripe_checkout_session_id`, `stripe_payment_intent_id`, `paid_at` (timestamp, not just a boolean — needed for reconciliation and receipts), `refunded_at`.
- **A new `stripe_events` table**: Stripe delivers webhooks at-least-once and expects the receiver to be idempotent. A small table of processed event ids (`id text primary key, processed_at timestamptz`) is the standard way to make the webhook handler safe against retries and replay.

## Flow

1. **Club connects Stripe.** Club settings gets a "Connect payments" button.
   Mirrors `youtube/connect.ts` → `youtube/callback.ts` almost exactly: redirect
   to Stripe's onboarding (`AccountLink`), callback route re-verifies
   `is_club_admin` server-side, stores `stripe_account_id` with the
   service-role client. No encryption needed here (unlike the YouTube
   refresh token) — the account id is not a secret, only Stripe API calls
   made *as* PoolClubs's platform account are.
2. **Admin sets a real price.** `TournamentForm` gains an amount + currency
   control for `requires_payment` tournaments, replacing the free-text guess
   with something a computer can charge.
3. **Player joins.** Instead of `joinTournament` inserting a row directly, a
   server route creates a Stripe Checkout Session for that tournament/player,
   with the club's connected account as destination and PoolClubs's cut as
   `application_fee_amount`. The player is redirected to Stripe's hosted page.
4. **Confirmation is webhook-driven, not redirect-driven.** The
   `checkout.session.completed` (or `payment_intent.succeeded`) webhook —
   verified against Stripe's signing secret, checked against `stripe_events`
   for idempotency — is what actually inserts/updates `tournament_players`
   with `paid = true` and `paid_at`. The browser redirect back from Stripe is
   only ever a "thanks, hang on" screen; a player closing the tab mid-payment
   must not silently count as entered, and a network hiccup on the redirect
   must not silently count as *not* entered. This is the one hard rule of
   integrating Stripe correctly.
5. **Decide when a seat is reserved.** Does clicking "join" on a paid
   tournament provisionally hold a spot before payment completes (risk: a
   capped bracket fills with people who never pay), or does the entrant only
   appear once the webhook confirms payment (safer, but a player sees
   nothing happen until they've paid — needs its own pending-state UI)?
6. **Refunds need a money-aware version of "remove entrant".** The
   unpaid-entrant removal flow shipped this session (`TournamentAdminPanel`,
   confirm-then-`leaveTournament`) only ever removes people who *never*
   paid. A *paid* entrant withdrawing, or being removed by an admin, needs a
   new path that calls Stripe's refund API first — and a policy decision on
   whether Stripe's own non-refundable processing fee is absorbed by the
   club, the player, or PoolClubs.
7. **A disconnected or unverified club** mid-collection (Stripe paused
   payouts pending a document, or the admin simply never finished
   onboarding) needs a UI state — a `requires_payment` tournament with no
   working Stripe account behind it must not silently let people pay into
   nothing, or silently fail to let them pay at all.

---

## Costs

- **Stripe's own processing fee** — representative published rates, not
  quoted precisely on purpose because they vary by the *connected account's*
  country and change over time: roughly 1.4–1.5% + a small fixed fee for
  domestic EU/UK cards, higher (often ~2.9% + fee) for non-EU cards or Amex.
  **Check Stripe's live pricing page for the actual country before building
  anything that assumes a number.**
- **Connect itself** may add a small per-payout or per-active-account cost
  depending on current Stripe pricing and plan — also needs checking at
  build time, not assumed from this document.
- **PoolClubs's own application fee** is a business decision, not a
  technical one: a flat percentage, a fixed amount per entry, or some
  combination — and a decision on who absorbs Stripe's processing fee within
  that split (the club's payout, the player's total, or PoolClubs's own
  cut). Whatever is chosen, **the player must see the true total before
  paying** — hidden add-on fees discovered at the last step of checkout are
  a "drip pricing" consumer-protection problem in the EU, independent of
  card-network rules against surprise surcharging.
- **Engineering effort**, order of magnitude, once Stripe's actual current
  pricing and API shape are confirmed:

  | | |
  |---|---|
  | Club Stripe Connect onboarding (route pair + schema + settings UI) | ~2–3 days |
  | Structured entry fee (schema + form) | ~0.5 day |
  | Checkout session route + webhook handler + idempotency table | ~2–3 days |
  | Pending/paid entrant states in the join flow | ~1 day |
  | Refund flow tied into entrant removal | ~1–2 days |
  | Receipts, club-facing payout visibility, i18n | ~1–2 days |
  | Stripe test-mode → live-mode cutover, webhook signing secret rotation per environment | ~0.5 day |

- **Ongoing, non-engineering cost**: disputes/chargebacks. Stripe forwards
  these and charges a per-dispute fee regardless of outcome; someone has to
  respond with evidence inside Stripe's deadline or the club (and
  indirectly PoolClubs's reputation with Stripe) loses automatically.

---

## Financial and accounting implications

This is the part with no code precedent in the repo to check against, and
the part most likely to need a real accountant before a single line ships.

- **Two different sales happen in every transaction, to two different
  parties.** The player buys a tournament entry *from the club* — the club
  is the merchant of record for that sale, and whatever VAT treatment
  applies to it is the club's, not PoolClubs's. Separately, the club buys a
  software/platform service *from Satellite Studio Digital S.L.* — the
  application fee — and that invoice is PoolClubs's own sale, with its own
  VAT treatment. These are legally distinct and need to be invoiced/reported
  separately, even though Stripe moves both amounts in one transaction.
- **VAT on the club's entry fee** depends on facts the app does not
  currently model at all: whether a club is a registered business, an
  unincorporated association, or a federation-affiliated non-profit. Spanish
  VAT law (Ley 37/1992, art. 20.Uno.13º) exempts certain sports-competition
  services provided by non-profit sports entities to competitors — whether
  any given club qualifies is a fact about that club, not something
  PoolClubs can assume. A real implementation likely needs to ask clubs for
  a legal form / tax status during onboarding, purely so the right thing
  ends up on a receipt.
- **VAT on PoolClubs's own application fee** is more tractable but still not
  free: a Spanish club gets a normal Spanish invoice with 21% IVA. A club in
  another EU country with a valid, VIES-checkable VAT number is typically a
  B2B reverse-charge (0% Spanish IVA, the club self-assesses locally) — this
  requires collecting and *validating* a VAT number per club, which nothing
  in `clubs` does today. A non-EU club is different again. `clubs.country`
  (already ISO-3166 alpha-2) is a start; a VAT-number field is not.
- **Multi-currency bookkeeping.** Clubs already informally quote fees in
  different currencies (§ "What already exists"). Stripe settles a connected
  account in its own local currency, but typically takes the platform's
  application fee in the *charge's* currency — meaning Satellite Studio
  Digital S.L., a single Spanish company, would end up holding a mix of EUR,
  GBP, etc. across its own Stripe balance. That is solvable but is a real,
  non-zero addition to the company's own accounting, not just a UI detail.
- **A reporting obligation may fall on PoolClubs itself, independent of any
  single club.** EU platforms that facilitate payments between third-party
  sellers (clubs) and buyers (players) can trigger **DAC7** reporting duties
  to the platform's own tax authority (AEAT, for a Spanish company) once
  volume thresholds are met. Whether "tournament entry via a connected
  Stripe account" counts as the kind of "relevant service" DAC7 targets is
  exactly the kind of question to put to an accountant rather than assume —
  but the possibility should be flagged before, not after, this launches.
- **Record-keeping.** Every charge, application fee and refund needs to
  reconcile against Satellite Studio Digital S.L.'s own books independently
  of Stripe's dashboard — practically, either a monthly Stripe
  reporting/Sigma export or a lightweight internal ledger table, so IVA
  trimestral and Impuesto de Sociedades filings have a paper trail that
  outlives whatever Stripe's UI happens to retain.

---

## Compliance and legal implications

- **PSD2 / Strong Customer Authentication** — handled by Stripe Checkout
  automatically for EU cards; a reason (not the only one) to stay on
  Checkout rather than a custom card form.
- **PCI-DSS** — Checkout keeps PoolClubs at SAQ A. This should be treated as
  a hard constraint on the implementation, not just a preference: card data
  must never be handled by PoolClubs's own frontend or backend code.
- **KYC / AML** — delegated to Stripe via Connect. PoolClubs's own
  responsibility narrows to handling Stripe's onboarding-status states
  gracefully (a club that can collect payments but not yet receive payouts,
  pending a document Stripe is waiting on).
- **Terms of Service** — today's legal pages (`src/content/legal.ts`) say
  nothing about payments, refunds, or PoolClubs's role as a limited
  technical intermediary between clubs and players. A payments-specific ToS
  addendum is needed before launch, covering at minimum: who a player is
  contracting with (the club, not PoolClubs), refund/cancellation policy,
  and what happens if a tournament is cancelled after entries were paid.
- **Consumer withdrawal rights** — EU distance-selling rules give consumers
  a cooling-off right for most online purchases; bookings for a specific
  date (events, accommodation, similar) are typically exempted, and a
  tournament entry likely falls in that category — but "likely" is not
  "confirmed," and the refund policy shown to players needs to say plainly,
  in plain language, what happens on withdrawal or cancellation regardless
  of how the legal exemption analysis lands.

---

## Who needs to sign off before this is built

This document deliberately mirrors the disclaimer already in
`src/content/legal.ts` about `OPERATOR`: it is drafted from general
knowledge of how Stripe Connect and EU payments regulation work, not from a
lawyer or accountant engaged for Satellite Studio Digital S.L. specifically.
Before any of this is built:

1. A **gestor/accountant** for Satellite Studio Digital S.L. should confirm
   the VAT treatment on both sides of the transaction (club → player, and
   PoolClubs → club) and whether DAC7 reporting applies.
2. A **lawyer** should draft the payments addendum to the Terms of Service
   and confirm the consumer-withdrawal-rights analysis for tournament
   entries specifically.
3. Stripe's **current** pricing, Connect account-type documentation, and
   country-availability pages should be re-read at build time — every fee
   figure in this document is a representative ballpark, not a quote.

---

## Open questions for whoever implements

1. Does a "join" click on a paid tournament reserve a seat before payment
   completes, or only after the webhook confirms it? (§ Flow, step 5)
2. Who absorbs Stripe's processing fee — the club's payout, the player's
   total, or PoolClubs's own application fee? Must be decided before the
   checkout UI can show a real total.
3. What happens to a `requires_payment` tournament whose club never
   finishes Stripe onboarding, or whose payouts get paused mid-tournament?
4. Refund policy specifics: full refund on withdrawal up to what point
   before the tournament starts, if any; who eats Stripe's non-refundable
   processing fee on a refund.
5. Whether to collect a club's legal form / VAT number / tax status at
   Stripe Connect onboarding time, or as a separate club-settings step —
   needed for correct invoicing regardless of when it's asked.
6. Express vs. Standard Connect accounts — Express gives PoolClubs more
   control over the player-facing checkout branding; Standard is lighter to
   integrate but hands the club a fuller independent Stripe dashboard.
   Worth revisiting once the accountant/lawyer sign-off (above) is in hand,
   since the compliance answer may inform the technical one.

---

## Sources

Written from general knowledge of Stripe Connect and EU payments law, 2026-09-13
— re-verify everything with a fee number, a legal citation, or a "current
Stripe behavior" claim before building against it.

- [Stripe Connect overview](https://stripe.com/docs/connect) — account types, destination charges, application fees
- [Stripe Checkout](https://stripe.com/docs/payments/checkout) — hosted payment page, PCI scope, 3-D Secure handling
- [Stripe webhooks](https://stripe.com/docs/webhooks) — at-least-once delivery, signature verification, idempotency
- PSD2 (Directive (EU) 2015/2366) — Strong Customer Authentication requirement
- Ley 37/1992 (Spanish VAT law), art. 20.Uno.13º — sports-competition service exemption for non-profit entities
- DAC7 (Council Directive (EU) 2021/514) — platform reporting obligations for facilitated sales/services
