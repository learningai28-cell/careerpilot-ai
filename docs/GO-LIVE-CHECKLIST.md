# Go-live checklist — scaling & hardening release (branch `fix/scaling-hardening`)

Do these **in order**. The order is what keeps live users from being
disrupted: the database change is safe with the old code, but the new
server code needs the database change.

## Step 1 — Database (Supabase SQL Editor) · 2 minutes

1. Supabase Dashboard → SQL Editor → New query.
2. Paste the whole of `supabase/migrations/0009_payments_and_usage_hardening.sql`, click **Run**, confirm "Success".
   - Safe to run while the current app is live. Safe to run twice.
3. Check whether the old payment bug was ever abused (one payment upgrading several accounts):
   ```sql
   select razorpay_payment_id, count(*) as accounts, array_agg(id) as user_ids
   from profiles
   where razorpay_payment_id is not null
   group by razorpay_payment_id
   having count(*) > 1;
   ```
   No rows = nothing to do. Any rows = those extra accounts got Pro without paying; decide whether to downgrade them.

## Step 2 — Razorpay webhook · 5 minutes

1. Razorpay Dashboard → Settings → Webhooks → Add new webhook.
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/razorpay-webhook`
   - Secret: make up a long random string and note it.
   - Active events: **order.paid** only.
   - Do this in **Live mode** (and again in Test mode if you test with test keys).
2. Supabase Dashboard → Edge Functions → Secrets → add `RAZORPAY_WEBHOOK_SECRET` = that same string.

## Step 3 — Deploy the server functions · 5 minutes

Pick one:

- **Automatic (recommended):** add the GitHub secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` (see `docs/DEPLOYMENT.md`). From then on, merging to `main` deploys every function automatically.
- **From a laptop:** in this repo folder run `npx supabase login`, then
  `npx supabase functions deploy --project-ref <your-project-ref>`.

Then in Supabase Dashboard → Edge Functions, confirm `razorpay-webhook` shows **JWT verification: off** and the others show **on**.

> Do not use the Dashboard copy-paste editor any more — the old single-file copies were removed because they had drifted from the real code.

## Step 4 — Test before announcing anything · 15 minutes

Use a **fresh free account**:

- [ ] Sign up (email) → confirmation email arrives → log in. Log in with Google.
- [ ] Forgot password → email arrives → reset works.
- [ ] Resume analysis works once, the second attempt says the free limit is reached.
- [ ] Interview coach: generate a session, get feedback on an answer.
- [ ] Billing: pay ₹499 → "You're on Pro" → badge shows Pro, Billing page shows "Valid until <date 3 months out>".
- [ ] Razorpay Dashboard → Webhooks → the order.paid delivery shows **200**.

## Step 5 — Release the website

Merge `fix/scaling-hardening` into `main` and push. GitHub Pages redeploys the
site in ~2 minutes (and functions too, if Step 3's automatic option is set up).
Users with an open tab are reloaded onto the new version automatically the
first time they navigate.

## Things only you can provide

| What | Where it goes | Why |
|---|---|---|
| Google Ads conversion labels (signup, purchase) | GitHub secrets `VITE_GADS_SIGNUP_LABEL`, `VITE_GADS_PURCHASE_LABEL` | Without them conversions don't fire (everything else still works) |
| `og-image.png` (1200×630) | `public/og-image.png` | Preview image when the link is shared on WhatsApp/LinkedIn |
| Custom SMTP (Resend/Brevo) | Supabase → Auth → SMTP | Built-in email allows ~2 emails/hour — signups and password resets stop arriving as you grow. See `docs/OPERATIONS.md` |
| Supabase Pro plan (~$25/month) | Supabase → Billing | Daily backups, no pausing. See `docs/OPERATIONS.md` |
| Cloudflare Pages account | See `docs/DEPLOYMENT.md` | Proper page status codes and security headers; do it after this release is stable |

## What changed for users

- Free limits are now enforced exactly as shown in the app (resume analysis is **1/month**, which the app already displayed; the server had been allowing 2).
- Interview answer feedback: up to 5 attempts per question for everyone; 30 per month on the free plan.
- If the AI is overloaded, users see "Our AI is busy right now…" and the attempt does **not** count against their limit.
- A cookie banner appears once; PostHog analytics only use cookies after "Accept".
