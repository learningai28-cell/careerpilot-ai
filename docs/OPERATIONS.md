# Operations guide

Things to set up once and check regularly so the site keeps working as traffic grows.

Items marked **(unverified)** could not be confirmed against current official docs while writing this; check them on the linked page before relying on them.

---

## A. Custom SMTP for Supabase Auth (do this before real traffic)

### Why

Supabase's built-in email service is for testing only. Per the Supabase docs it only delivers to email addresses that are members of your Supabase organization, its default limit is about 2 emails per hour, and it has no uptime guarantee. In practice, once real users sign up, confirmation and password-reset emails stop arriving, and users just see "nothing happened". The error is easy to miss because the app itself still works.

Source: https://supabase.com/docs/guides/auth/auth-smtp

### Setup with Resend (simple option)

1. Create an account at resend.com > **Domains** > Add domain `operix.co.in` (or a sub-domain such as `mail.operix.co.in`, which keeps the main domain's reputation separate; recommended).
2. Resend shows DNS records. Add each exactly as shown at the DNS provider for operix.co.in:
   - **SPF**: a TXT record (Resend typically puts it on a `send` sub-domain) with value like `v=spf1 include:amazonses.com ~all`.
   - **DKIM**: a TXT record named like `resend._domainkey` with a long public key.
   - **MX** record for the bounce sub-domain (Resend lists it) and optionally a **DMARC** TXT record `_dmarc` with `v=DMARC1; p=none; rua=mailto:you@operix.co.in`.
   Use the values Resend displays, not the examples here. Click **Verify**; it can take minutes to a few hours.
3. Resend > **API Keys** > create a key with "Sending access".
4. Supabase > Authentication > **Emails** > **SMTP Settings** (older dashboards: Project Settings > Authentication) > enable **Custom SMTP**:
   - Sender email: `no-reply@operix.co.in` (must be on the verified domain)
   - Sender name: `CareerPilot AI`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: the API key
5. Save, then test: sign up with a personal Gmail address and a fresh email, confirm both the mail arrives (check spam) and the link works.

### Setup with Brevo (alternative)

1. brevo.com account > **Senders, Domains & Dedicated IPs** > Domains > add `operix.co.in`; add the DNS records Brevo shows (a Brevo code TXT record, DKIM CNAME/TXT records, and a DMARC TXT record). Authenticate/verify.
2. **SMTP & API** > SMTP tab: note the SMTP server (`smtp-relay.brevo.com`), port `587`, login (shown on the page; not your account email necessarily) and generate an SMTP key.
3. Enter these in Supabase's SMTP settings as above, with a sender on the verified domain.

Free-plan sending quotas of both providers (Resend: roughly 100 per day, Brevo: roughly 300 per day) **(unverified, check current pricing pages)**. Whichever you pick, check the quota against your expected signups.

### Raising the Auth email rate limit

After custom SMTP is enabled, Supabase sets a default limit of 30 auth emails per hour (docs above). Change it at Supabase > Authentication > **Rate Limits** > "Rate limit for sending emails". Set it above your realistic peak signups plus resets per hour, but keep it finite: it stops someone abusing the signup form to spam. Other limits on that page (sign-ups and sign-ins per IP, OTP) can also be tuned. Also turn on CAPTCHA protection (Authentication > Attack Protection) if you see bot signups.

### Tip: email templates

Authentication > Emails > Templates: make sure the text says CareerPilot AI and the links use `{{ .ConfirmationURL }}`, which respects the Site URL below.

---

## B. Supabase plan: Free vs Pro

| | Free | Pro (about $25 per month per organization) |
| --- | --- | --- |
| Project pausing | Projects with no activity are paused (commonly after about 1 week) **(exact period unverified)**; the site then fails until someone restores it in the dashboard | Not paused for inactivity (per the Supabase billing FAQ) |
| Backups | No automatic backups listed in the docs; Supabase recommends you export your own data regularly | Daily backups, kept 7 days |
| Point-in-time recovery | No | Optional paid add-on (needs at least the Small compute add-on; roughly $100 per month for 7 days of retention). With PITR on, daily backups are replaced by it. |
| Email | Built-in test email only | Still needs custom SMTP (section A) |

Sources: https://supabase.com/docs/guides/platform/backups and https://supabase.com/docs/guides/platform/billing-faq. Prices change; confirm on https://supabase.com/pricing.

Recommendation: move the production project to **Pro** before launching to paying customers. This product stores user resumes and payment state; losing a day of data, or having the site pause, costs more than $25. PITR is worth adding once you have meaningful paying users. Until then, a free manual safety net: Supabase dashboard > Database > Backups (Pro) or a monthly `npx supabase db dump --db-url "<connection string>" -f backup.sql` saved to a private drive.

Staging can stay on the Free plan (pausing there does no harm; just restore it when needed).

---

## C. Supabase Auth URL configuration checklist

Supabase > Authentication > **URL Configuration** (production project):

- [ ] **Site URL**: `https://careerpilot.operix.co.in` (this is where confirmation and password-reset links point; a wrong value sends users to a dead page).
- [ ] **Redirect URLs** contain:
  - [ ] `https://careerpilot.operix.co.in/**`
  - [ ] `https://careerpilot-ai.pages.dev/**` (only while testing the Cloudflare move; remove afterward if you do not need it)
  - [ ] `http://localhost:5173/**` for local development (consider leaving this on staging only)
- [ ] No leftover old addresses (for example the `github.io` address) once GitHub Pages is retired.
- [ ] Authentication > Sign In / Providers > **Google**: enabled, with a client ID and secret. In Google Cloud Console the authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
- [ ] Authentication > Emails: custom SMTP enabled (section A), and a test signup and a test password reset both arrived.
- [ ] Staging project has its own Site URL (the staging website), never the production one.

---

## D. Monthly checklist (10 minutes)

- [ ] **Anthropic spend**: console.anthropic.com > Usage/Billing. Compare with last month and with the number of analyses run. Check a spend limit is set so a bug or abuse cannot run up the bill.
- [ ] **Failed or stuck payments**: Razorpay dashboard > Transactions > filter Failed/Authorized-not-captured, and compare paid orders with users on the Pro plan (a user who paid but is still Free needs a manual fix and a look at the `razorpay-webhook` function logs).
- [ ] **Usage and limits**: Supabase > Reports / Settings > Usage: database size, bandwidth, Edge Function invocations, auth emails sent versus the limits of your plan.
- [ ] **Edge Function errors**: Supabase > Edge Functions > each function > Logs; look for repeating errors or 401/500 spikes.
- [ ] **Email delivery**: Resend/Brevo dashboard bounce and complaint rates (aim for well under 1 percent complaints).
- [ ] **PostHog**: new exceptions since last month.
- [ ] **Backups**: confirm the latest backup exists (Pro) or take a manual dump (Free).
- [ ] **Deploys**: GitHub > Actions has no red runs; secrets that expire (Supabase access token, Cloudflare token) are still valid.
- [ ] **Costs overview**: Supabase, Cloudflare, Resend/Brevo, Anthropic, Razorpay fees.
