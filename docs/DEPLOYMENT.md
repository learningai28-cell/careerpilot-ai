# Deployment guide

Plain-English steps for the site owner. You do not need to write code; you need to click through a few dashboards and paste values in the right place.

## How things are deployed now

| Part | Where it lives | How it gets live |
| --- | --- | --- |
| Website (what visitors see) | GitHub Pages today, Cloudflare Pages after the cutover below | Automatic when code is merged to `main` |
| Edge Functions (the AI and payment code) | Supabase | Automatic when code under `supabase/functions/` is merged to `main` (workflow "Deploy Supabase Edge Functions") |
| Database changes (migrations) | Supabase | **Still manual**: open `supabase/migrations/`, copy the new file into the Supabase SQL Editor, Run. Do not use `supabase db push` (there is no migration history table). |

Branches: `main` = production. `staging` = a private test copy (own Supabase project, own preview website). Pushing to `staging` deploys there; nothing touches production.

You can follow every deploy under the **Actions** tab of the GitHub repository. A workflow that shows "Skipping ... not set" in grey/green is normal: it means a secret is not added yet.

---

## 1. GitHub secrets to add

GitHub repo > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**. Add one at a time (name exactly as shown).

### Already there (used by the GitHub Pages deploy)

| Secret | Where the value comes from |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase > your project > Project Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Same page, the `anon` `public` key |
| `VITE_POSTHOG_KEY` | PostHog > Project settings > Project API key |
| `VITE_POSTHOG_HOST` | `https://us.i.posthog.com` |

### New: deploying Edge Functions (production)

| Secret | Where the value comes from |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens > Generate new token. It is shown once; copy it immediately. This is a personal token, so treat it like a password. |
| `SUPABASE_PROJECT_REF` | The production project's reference: the random letters in its URL `https://<ref>.supabase.co`, also under Project Settings > General > Reference ID. |

### New: staging (optional; workflows skip until these exist)

| Secret | Where the value comes from |
| --- | --- |
| `SUPABASE_STAGING_PROJECT_REF` | Reference ID of the staging Supabase project (section 2) |
| `STAGING_VITE_SUPABASE_URL` | Staging project > Project Settings > API > Project URL |
| `STAGING_VITE_SUPABASE_ANON_KEY` | Staging project, `anon` `public` key |
| `STAGING_VITE_POSTHOG_KEY` | Optional. Ideally a separate PostHog project so test traffic does not pollute real numbers. |
| `STAGING_VITE_POSTHOG_HOST` | Optional. `https://us.i.posthog.com` |

(`SUPABASE_ACCESS_TOKEN` is shared by production and staging.)

### New: Cloudflare Pages (optional until you move hosting)

| Secret | Where the value comes from |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard > My Profile > API Tokens > Create Token > "Edit Cloudflare Workers" template or a custom token with **Account > Cloudflare Pages > Edit**. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard > Workers & Pages > right-hand sidebar "Account ID". |

### Secrets that are NOT GitHub secrets

The Edge Functions' own secrets (Anthropic key, Razorpay key id/secret, webhook secret, service role key) live in **Supabase > Edge Functions > Secrets** (per project). They are not touched by the deploy. For staging, set them again on the staging project, using Razorpay **test** keys.

---

## 2. Create the staging Supabase project

1. Supabase dashboard > **New project**. Name it e.g. `careerpilot-staging`. Pick the same region as production. Save the database password somewhere safe.
2. Open the new project > **SQL Editor** > **New query**.
3. For each file in `supabase/migrations/` **in numeric order** (`0001_...` through the latest file, currently `0008_...`, plus any added later): open the file, copy everything, paste into the SQL Editor, click **Run**, and confirm "Success" before the next one. If one fails, stop and ask a developer; do not skip it.
4. Project Settings > API: copy the Project URL, `anon` key and Reference ID into the staging secrets (section 1).
5. **Edge Functions > Secrets**: add the same secret names production has (Anthropic key, Razorpay **test** key id and secret, and so on).
6. **Authentication > URL Configuration**: set Site URL to the staging website address (for example `https://staging.careerpilot-ai.pages.dev`) and add it to Redirect URLs.
7. Create the `staging` branch in GitHub (Branches > New branch from `main`). From then on, pushing to `staging` deploys functions to the staging project and a preview website to Cloudflare.

Whenever a new migration is added for production, run it on staging first, check the app on staging, then run it on production.

---

## 3. Deploying functions manually (fallback)

Use this only if GitHub Actions is down or you need an emergency fix. It needs Node.js installed and a terminal opened in the project folder.

```
npx supabase login
npx supabase functions deploy --project-ref YOUR_PROJECT_REF
```

- `login` opens a browser once. Alternatively set the token: `set SUPABASE_ACCESS_TOKEN=...` (Windows) or `export SUPABASE_ACCESS_TOKEN=...` (Mac/Linux).
- With no function name, every function is deployed. To deploy one: `npx supabase functions deploy analyze-jd --project-ref YOUR_PROJECT_REF`.
- The "no JWT check" setting for `razorpay-webhook` is read from `supabase/config.toml`, so it applies here too. After deploying, confirm in Supabase > Edge Functions > razorpay-webhook > Details that "Verify JWT" is **off**, and on all others it is **on**.
- If the deploy complains about Docker, add `--use-api`.

---

## 4. Moving from GitHub Pages to Cloudflare Pages (zero downtime)

The GitHub Pages deploy keeps running the whole time. Visitors see no change until step 6.

**Why move:** unknown routes on GitHub Pages return HTTP 404 (the app only loads thanks to a trick), there are no security headers, and no preview environments. Cloudflare Pages fixes all three and is free for this size of site.

1. **Create the Cloudflare project.** Cloudflare dashboard > Workers & Pages > Create > Pages > **Direct Upload** (not "Connect to Git") > project name exactly `careerpilot-ai` > create with any placeholder file. Then Settings > Builds: production branch = `main`.
2. **Add the Cloudflare secrets** from section 1.
3. **Run the deploy.** GitHub > Actions > "Deploy to Cloudflare Pages" > Run workflow (branch `main`). When green, the site is live at `https://careerpilot-ai.pages.dev`.
4. **Allow the test address in Supabase and Google.**
   - Supabase > Authentication > URL Configuration > add `https://careerpilot-ai.pages.dev/**` to Redirect URLs. (Leave Site URL unchanged for now.)
   - Google Cloud Console > APIs & Services > Credentials > your OAuth client: Google redirects back to your **Supabase** URL (`https://<ref>.supabase.co/auth/v1/callback`), so normally nothing changes here. Only add the new address if that client lists website origins.
5. **Test on `careerpilot-ai.pages.dev`:**
   - Open a deep link directly, e.g. `/dashboard/billing`, and refresh: it should load (not a 404 page).
   - Sign up / log in with email and password.
   - **Google sign-in**.
   - **Password reset**: request an email, click the link, set a new password. (The email link goes to the Site URL, so on this test address it may land on the old domain; that is expected until step 6. Check that the final page works on the real domain after cutover.)
   - Interview practice: microphone prompt appears and speech is transcribed.
   - **Razorpay test payment** (use test keys on staging, or a small real payment on production): Billing > Upgrade > pay > plan changes to Pro.
   - Open the browser console (F12) and note any "Content Security Policy" messages (section 5).
6. **Cut over.**
   1. Cloudflare > the project > Custom domains > Set up a domain > `careerpilot.operix.co.in`. If operix.co.in's DNS is not on Cloudflare, Cloudflare shows a CNAME record to add at your DNS provider: change the existing `careerpilot` CNAME (currently pointing at GitHub, `<user>.github.io`) to `careerpilot-ai.pages.dev`. Lower the record's TTL to 300 seconds a day earlier if you can, so the change spreads fast.
   2. Wait until Cloudflare shows the domain as **Active** with a certificate (usually minutes).
   3. Re-run test 5 on `https://careerpilot.operix.co.in`.
   4. Supabase > Authentication > URL Configuration: confirm Site URL is `https://careerpilot.operix.co.in` and redirect URLs include `https://careerpilot.operix.co.in/**`.
7. **Retire GitHub Pages** only after a day or two of stable running: repo Settings > Pages > Source: **None** (or remove the custom domain), and then the workflow `.github/workflows/deploy.yml` and `public/404.html` can be deleted by a developer. Do not do this earlier, it is your rollback.

---

## 5. Turning on the Content Security Policy

`public/_headers` ships the policy as `Content-Security-Policy-Report-Only`: it only logs warnings and blocks nothing.

1. Visit the site on `pages.dev` or the real domain with the browser console open (F12 > Console).
2. Use every feature once: sign in (email and Google), each tool (resume analyzer, interview coach with microphone, JD analyzer, resume builder download), Billing with a Razorpay checkout, and check cookie/consent flows.
3. Look for red messages containing "Content Security Policy" / "Report Only". Each names the blocked address.
4. For each legitimate address, add it to the matching directive (`script-src`, `connect-src`, `img-src`, `frame-src` ...) in `public/_headers`. Redeploy and repeat until the console is clean.
5. Flip to enforcing: in `public/_headers`, rename `Content-Security-Policy-Report-Only:` to `Content-Security-Policy:`. Deploy, and repeat the click-through once more, especially a Razorpay payment.
6. If anything breaks for real users, rename it back to `...-Report-Only` and redeploy; that is instant.

---

## 6. Rolling back

| Problem | Fix |
| --- | --- |
| Bad website release (Cloudflare) | Cloudflare > the project > Deployments > pick the last good one > **Rollback to this deployment**. Takes seconds. |
| Bad website release (GitHub Pages, before retiring it) | Revert the commit on `main` (GitHub > the commit > Revert) and let the workflow redeploy; or re-run the last good "Deploy to GitHub Pages" run from the Actions tab. |
| Cutover went wrong | Point the `careerpilot` DNS record back to GitHub Pages (`<user>.github.io`). Because GitHub Pages was never switched off, the old site returns once DNS spreads (minutes with a low TTL). |
| Bad Edge Function release | Revert the commit on `main`; the workflow redeploys the previous code. Emergency: use the manual command in section 3 from an older commit (`git checkout <good commit>`). |
| Bad database migration | There is no automatic undo. Restore from a backup (see OPERATIONS.md), or write and run a corrective SQL. Always test migrations on staging first. |
| Content Security Policy blocks something | Rename the header back to `Content-Security-Policy-Report-Only` (section 5) and redeploy. |
