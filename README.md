# Zola — Omani Frankincense (Luban) · Landing page + Admin CMS

Trilingual (AR/FR/EN) single-product landing page for the Algerian market (COD),
with an auth-protected admin dashboard. Vanilla HTML/CSS/JS + Supabase + Cloudinary.

**Supabase project:** `zola` (`caclaqpyfspkarpzfpxu`, eu-west-1) — everything below is already deployed.
**Live site:** deployed on Vercel, project `elitexvault/zola`, domain `zoladz.store`.

```
index.html / style.css / script.js  → public landing page (site root)
admin/   → admin dashboard      (auth-protected, noindex)
login/   → admin login          (auth-protected app, noindex)
images/  → logo + favicon (shared by all three; everything else is Cloudinary)
cities.sql → source data for the 69 wilayas / 1541 communes (already imported)
vercel.json → trailing-slash + noindex header config for the deploy
```

The landing page used to live in a `user/` subfolder during local development; it now
sits at the project root so it resolves at `https://zoladz.store/` directly. `admin/`
and `login/` stay as subfolders (`/admin/`, `/login/`) and reference `images/` via
`../images/…`, which still resolves correctly since `images/` is a root-level sibling.

---

## Deployment (Vercel)

- Linked project: `elitexvault/zola` (static site, no framework/build step).
- Deploy: `vercel --prod` from the project root (or push — connect the Vercel project
  to a git repo for auto-deploys if you want that instead of CLI pushes).
- Domains attached to the project: `zoladz.store` and `www.zoladz.store`.

**DNS — do this once at your domain registrar** (wherever `zoladz.store` was purchased):
add an `A` record pointing the domain at Vercel:

| Type | Host | Value |
|---|---|---|
| A | `@` (root) | `76.76.21.21` |
| A | `www` | `76.76.21.21` |

(Alternative: point the domain's nameservers at `ns1.vercel-dns.com` / `ns2.vercel-dns.com`
instead, which hands *all* DNS for the domain to Vercel — the A-record approach above is
simpler if you want to keep other DNS records, like email, at your current registrar.)

DNS propagation can take anywhere from a few minutes to a few hours. Vercel auto-issues
an SSL certificate and emails you once the domain is verified — no action needed beyond
adding the record.

`vercel.json` sets `trailingSlash: true` so `/admin` and `/login` always redirect to
`/admin/` / `/login/` consistently (avoids the classic "relative asset paths break
without the trailing slash" bug), and adds an `X-Robots-Tag: noindex` header on `/admin/*`
and `/login/*` as a second layer on top of the `<meta name="robots" content="noindex">`
tag already in those pages.

---

## Secrets to set (Edge Function env — NEVER in client code)

Supabase Dashboard → **Edge Functions → Secrets** (already configured and verified working):

| Secret | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `TELEGRAM_CHANNEL_ID` | Channel chat ID (`-100…`); the bot must be an admin of the channel. **Name must match exactly** — a one-letter typo here (`CHANEL` vs `CHANNEL`) silently disabled all notifications for a while; the fix was just re-adding it under the correct name. |
| `FB_CAPI_TOKEN` | optional — Meta Conversions API token for server-side Purchase events |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — you never handle them.

Test anytime via Admin → Settings → "Send test Telegram", or by placing a real order —
both `submit-order` and `submit-contact` now log the real Telegram API error if a send
ever fails (`telegram sendMessage failed <status> <body>` in Edge Function logs), instead
of failing silently like the very first version did.

## Create the first admin (no public signup exists)

1. Supabase Dashboard → **Authentication → Users → Add user** → email + password, check *Auto Confirm*.
2. **Important:** Authentication → Sign In / Providers → **disable "Allow new users to sign up"**.
   RLS grants write access to any `authenticated` user, so signup must stay off.
3. Log in at `/login/` (redirects to `/admin/` automatically once authenticated).

## Facebook Pixel

Admin → Settings → Pixel ID. The landing page fires `PageView`, `ViewContent`, and
`Purchase` (on successful order, with an `eventID`). If `FB_CAPI_TOKEN` is set,
`submit-order` also sends the same Purchase server-side with the same `event_id`,
so Meta dedupes and you recover iOS/ad-blocker losses.

## Redeploying Edge Functions (only if you edit them)

Functions live in the Supabase project (`submit-order`, `submit-contact`, `admin-telegram-test`).
Edit/redeploy from the Dashboard → Edge Functions, or `supabase functions deploy <name>` with the CLI
(logged into the account that owns project `caclaqpyfspkarpzfpxu`).

---

## Pricing & promotions (fully optional, admin-controlled)

Per product, in Admin → Stock:
- **Percentage discount** — applies to the base price unless a quantity tier below overrides it.
- **Quantity tiers** ("buy 2+, pay X/unit") — a list of `{quantity, unit price}` rows; the
  entered price is *per unit*, not a bundle total (the live preview under each row shows
  the resulting total as you type, specifically to avoid that mix-up).
- **Buy X get Y free** — repeats per full group (buy 3 get 1 free → buy 6 get 2 free).
  Free units are added to the *shipped* quantity and correctly deducted from stock, but
  never charged.

All three are computed server-side inside the same atomic `place_order()` Postgres
function that prevents overselling — the browser never dictates price or free-item count.

## Security model (verified)

- Client code (root `index.html`/`script.js`, `admin/`, `login/`) contains **only** the public anon key:
  `grep -rniE "service_role|sb_secret|TELEGRAM_BOT" index.html script.js admin/ login/` → no secrets.
- RLS is ON for every table. Verified with the anon key:
  - direct `INSERT` into `orders` → `42501 row-level security violation`
  - `UPDATE products` → 0 rows affected
  - calling `place_order` RPC directly → `permission denied` (service-role only)
- Stock decrement is a single conditional `UPDATE … WHERE stock >= qty RETURNING`
  inside the `place_order` RPC → concurrent orders cannot oversell, and free (BOGO)
  units are reserved from stock too, not just paid units.
- Anti-fraud in `submit-order` / `submit-contact`: honeypot field (bots get fake success),
  per-IP rate limit, phone+product dedup window — tunable in Admin → Settings.
- Phone numbers accept local (`05/06/07…`) and international (`+213…`, `00213…`) formats,
  normalized consistently client- and server-side.
- Supabase security advisors: **0 findings**.

## Data model

| Table | Public (anon) | Admin (authenticated) |
|---|---|---|
| `wilayas`, `communes`, `delivery_fees`, `content` | read | read/write (fees, content) |
| `products` | read (active only) | read/write (incl. discount/tiers/BOGO fields) |
| `settings` | read `is_public` rows only | read/write |
| `orders`, `contacts` | **no access** — insert only via Edge Functions | read + update status |

## Acceptance checklist

- [x] No service_role key / bot token in client source (grep above)
- [x] Oversell rejected server-side; atomic conditional decrement (incl. BOGO free units)
- [x] Wilaya → commune cascade uses real cities.sql data (69/1541 rows imported verbatim)
- [x] AR (RTL, default at build time; French is the current runtime default) / FR / EN
      switcher; layout mirrors via `dir` + logical CSS properties
- [x] Order & contact → Telegram (verified end-to-end against the live channel)
- [x] Admin unreachable without session; no signup UI; content editable in 3 languages
- [x] Mobile-first, sticky order CTA + WhatsApp FAB, readable at 320–360px
- [x] Deployed on Vercel; custom domain attached, pending your DNS record
- [ ] **You:** add the DNS `A` record above at your registrar; review current price/stock/
      discount/delivery-fee values in Admin (they get changed often during testing)
