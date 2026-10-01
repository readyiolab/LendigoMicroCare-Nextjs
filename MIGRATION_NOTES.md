# React → Next.js migration notes

This app is a like-for-like migration of `../frontend` (Vite + React 19 + react-router v7) to Next.js 16 (App Router).
The backend (`../fintech-backend`) and the React app were not modified.

## Commands

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Production build (standalone) | `npm run build` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests (ported selftests) | `npm test` |
| Parity check against the React sources | `node scripts/compare-migration.mjs --verbose` |

## How the React app maps onto Next.js

- **Routes.** Every react-router route has a folder under `app/`. `app/(public)` holds login, register, verify-selfie and the legal pages. `app/(customer)` holds the protected customer pages behind `ProtectedRoute`. `app/admin/login` is public. Every other admin page sits in `app/admin/(protected)`, behind `AdminRoute` and inside `AdminLayout`.
- **Nested routes.** The application detail page (`/admin/applications/:applicationId`) renders inside the list view's `<Outlet />`, the same as in the React app. The list lives in `applications/(list)/layout.tsx`, so it stays mounted while a case is open. `applications/fill/[token]` is a sibling route, as it was in React.
- **Views.** The page and component code in `views/` and `components/` is copied from `frontend/src` without changes. The only edits are import paths and `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`. `scripts/compare-migration.mjs` checks this line by line. The only intentional code changes are the Redux admin-slice removals listed below.
- **Router shim.** `lib/router.tsx` provides the react-router API that the views use: `useNavigate`, `useLocation`, `useSearchParams`, `useParams`, `Link`, `Navigate`, `Outlet` and `useOutletContext`. It is built on `next/navigation`, and navigation never scrolls to the top, matching the React app.
- **Loading.** Pages load their view with `next/dynamic(..., { ssr: false })`, which replaces `React.lazy`. The fallbacks match the React app: routes it wrapped in `LazyRoute` show the top progress bar (`RouteLoader`), and other admin pages show `Spinner.Full`.
- **Providers.** `app/providers.tsx` nests the providers in the same order as `App.jsx`: Redux → ErrorBoundary → Tooltip → Auth → AdminAuth → Notifications, plus `GlobalLoader`. The Redux store is created once per browser session.
- **Typed core.** The API client and its 16 modules, services, contexts, guards, config, hooks, UI kit and the tested utils are TypeScript. The feature views stay `.jsx`/`.js` (`allowJs`) so they remain identical to the React sources.

## Changes Next.js required

Each of these behavioral differences is forced by the framework. The only other difference is the bug fix in the next section.

- **`/admin/register`:** now a server-side 307 redirect to `/admin/login`. React did a client-side `<Navigate replace>`, and the result is the same.
- **Legal pages** (`/privacy-policy`, `/terms-and-conditions`, `/loan-agreement`): server-rendered, so the text arrives in the first HTML response. The markup is the same.
- **`location.state`:** always `null`. Nothing in the React app passes router state. The one reader, the Register prefill, already falls back to `sessionStorage`.
- **Admin session storage:** the React `setAdmin` and admin-logout Redux actions only mirrored `adminData` into `localStorage`, and nothing read that Redux state. `AdminLogin.jsx` and `AdminLayout.jsx` now write and remove `localStorage.adminData` directly, and the unused auth slices were dropped.
- **Stale chunks after a deploy:** `ErrorBoundary` shows the "App updated → Refresh now" screen. `lazyWithRetry` is kept only for the hover preloading in `preloadRoute`.
- **DSA redirect:** while `DSA_PARTNER_UI_ENABLED` is off, `/admin/dsa/*` redirects to `/admin/dashboard` on the server, before the admin auth check. The end result is the same as in React: signed-out users land on `/admin/login`, signed-in users on the dashboard.
- **Strict mode:** `reactStrictMode: false`. The React app didn't use `<StrictMode>`, and double-running effects would take the application record lock twice.
- **Rewrite:** `next.config.ts` forwards same-origin `/api/v1/*` links (for example the e-sign agreement fallback) to `NEXT_PUBLIC_API_BASE_URL`.

## One intentional bug fix

- **Signed in elsewhere (`SESSION_SUPERSEDED` on token refresh).** In `frontend/src/lib/api/config.js`, line 207 calls `redirectToLogin(isAdminRequest, 'elsewhere')`, but `isAdminRequest` is declared with `const` later in the same block (line 218). That access throws a `ReferenceError`, so the React app never redirects; the failed request just rejects with that error. `lib/api/config.ts` uses the request's admin flag that is already in scope, so the user goes to `/login?reason=elsewhere` (or `/admin/login?reason=elsewhere` for admin requests), which is what the React code meant to do. This is the only place where the Next app knowingly behaves differently from the React app.

## Dependency versions

Every runtime library is pinned to the exact version in `frontend/package-lock.json` (the lock the live React build uses): Radix, axios, recharts, Tailwind, date-fns, socket.io-client and the rest. `overrides` in `package.json` also pins the transitive packages that change UI behavior: `@floating-ui/*` (popover and select positioning), `immer`, `reselect` and `use-sync-external-store` (Redux and recharts), `es-toolkit`, `@date-fns/tz` and the socket.io internals. `react-is` is a direct dependency so recharts gets 19.2.5, as in React; otherwise an old 16.x copy from the lint tooling would be hoisted, and it does not recognise React 19 fragments.

Deliberate exceptions:
- `react` / `react-dom` are 19.2.8, not 19.2.3. App Router pages render with Next's own bundled React, and the 19.2.x patch releases after 19.2.3 are security fixes.
- Type packages, eslint and build tooling. They never reach the browser.

Do not run `npm update` or widen these ranges without re-checking parity.

## Environment variables

Each `VITE_*` variable became `NEXT_PUBLIC_*` with the same meaning; see `.env.example`. All of them are inlined into the browser bundle at build time, and no server-only secret is used by the frontend.

- **Committed values.** `.env.production` is committed with the values the live React build actually resolves to. Vite lets `frontend/.env.production` override `frontend/.env`, which means uploads go directly to S3 (`UPLOAD_VIA_BACKEND=false`) and SMS OTP is off.
- **Encryption key.** It is not committed. The deploy workflow takes it from the repository secret `NEXT_PUBLIC_PAYLOAD_ENCRYPTION_KEY` and fails the build if the secret is missing. The value must match the backend's `PAYLOAD_ENCRYPTION_KEY`, which is the same as `VITE_PAYLOAD_ENCRYPTION_KEY` in the server's `frontend/.env`.

| React (Vite) | Next.js |
| --- | --- |
| `VITE_API_BASE_URL` | `NEXT_PUBLIC_API_BASE_URL` |
| `VITE_SOCKET_URL` | `NEXT_PUBLIC_SOCKET_URL` |
| `VITE_UPLOAD_VIA_BACKEND` | `NEXT_PUBLIC_UPLOAD_VIA_BACKEND` |
| `VITE_AUTH_SMS_OTP_ENABLED` | `NEXT_PUBLIC_AUTH_SMS_OTP_ENABLED` |
| `VITE_PAYLOAD_ENCRYPTION_KEY` | `NEXT_PUBLIC_PAYLOAD_ENCRYPTION_KEY` |
| `VITE_DIGITAP_ESIGN_*` | `NEXT_PUBLIC_DIGITAP_ESIGN_*` |

## Deployment

`.github/workflows/deploy-production.yml` runs on every push to `main`. The build job typechecks, lints, runs the unit tests and runs `next build`. It then packs `.next/standalone`, `.next/static`, `public` and `ecosystem.config.cjs` into one tarball. The deploy job uploads that tarball over SSH to `/var/www/LendigoMicroCare/LendigoMicro-NextFrontend/releases/<sha>`, points `current` at it, restarts the PM2 app `lendigo-next-frontend` (`node server.js` on `127.0.0.1:3001`), checks `/login`, and keeps the five most recent releases.

- **Port.** The app runs on 3001 because port 3000 is already used by the marketing website (`lendigomicrocare.com`).
- **Secrets.** The workflow reuses `PROD_HOST`, `PROD_USER` and `PROD_SSH_KEY` from the existing workflows and adds `NEXT_PUBLIC_PAYLOAD_ENCRYPTION_KEY`. Add all four to this repository's GitHub secrets.

**One-time server setup:**
- Node >= 20.9 (Next 16) and PM2. PM2 is already used by the backend.
- `mkdir -p /var/www/LendigoMicroCare/LendigoMicro-NextFrontend/releases`.

**Rollback the app version:** `pm2 delete lendigo-next-frontend && pm2 start /var/www/LendigoMicroCare/LendigoMicro-NextFrontend/releases/<previous-sha>/ecosystem.config.cjs && pm2 save`.

### Production cutover (loan.lendigomicrocare.com)

Only the `loan.lendigomicrocare.com` server block in `/etc/nginx/sites-enabled/lendigomicrocare` changes. The website, API and port-80 redirect blocks stay as they are. The domain is unchanged, so the backend's CORS origins, cookies, sockets and the Digitap/AA/e-sign return URLs keep working. Logged-in users keep their sessions, because localStorage is tied to the domain.

**1. Pre-flight checks (read-only)**

```bash
node -v                      # Next 16 needs >= 20.9
pm2 list                     # note the backend + website process names
sudo ss -ltnp | grep 3001    # must print nothing
df -h /var/www
```

**2. Deploy without switching traffic.** Run the workflow, either by pushing to `main` or with "Run workflow". Then check the app on the server:

```bash
curl -sI http://127.0.0.1:3001/login | head -1        # HTTP/1.1 200
curl -sI http://127.0.0.1:3001/admin/login | head -1
pm2 logs lendigo-next-frontend --lines 30 --nostream
```

**3. Back up the nginx config outside `sites-enabled`.** nginx loads every file in that directory, so a backup kept there would also be loaded. If `sites-enabled/lendigomicrocare` is a symlink, edit the file it points to in `sites-available`.

```bash
sudo cp /etc/nginx/sites-enabled/lendigomicrocare /etc/nginx/lendigomicrocare.react.bak
```

**4. Cookie preview (only you see Next).** Every visitor still gets the React `dist`. A browser that carries the cookie `lendigo_next=1` is sent to the Next app on the same domain, so CORS, cookies and callback URLs behave exactly as they will after the cutover. Testing from `localhost` or a tunnel doesn't work, because the backend only accepts the production origins.

Add this at the top of the file, next to the existing `map $http_upgrade ...`:

```nginx
map $cookie_lendigo_next $loan_next_preview { default 0; "1" 1; }
```

In the existing loan server block, add this named location:

```nginx
location @next_preview {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
}
```

Then add these two lines at the top of **both** the existing `location /` and the existing static `location ~* \.(js|css|png|...)$`. Leave everything else in them as it is:

```nginx
    error_page 418 = @next_preview;
    if ($loan_next_preview) { return 418; }
```

Apply it with `sudo nginx -t && sudo systemctl reload nginx`. Visitors without the cookie notice nothing.

- **Turn the preview on:** open `https://loan.lendigomicrocare.com`, run `document.cookie = "lendigo_next=1; path=/; max-age=86400; secure"` in the browser console, then hard-reload.
- **Turn it off:** run `document.cookie = "lendigo_next=; path=/; max-age=0"`.
- **Compare side by side:** use two separate browser profiles, one with the cookie (Next) and one without (React). Both apps share this domain's localStorage, so a single profile would trip the single-tab lock. Compare at about 375, 768, 1280 and 1920 px, then go through the flows in step 7. Use test accounts, and don't approve or disburse real cases.
- **Undo the preview:** restore the backup from step 3 (the same command as step 8).

**5. Replace only the loan server block** (this is the real cutover). Also remove the preview pieces from step 4: the `map $cookie_lendigo_next` line, `location @next_preview`, and the `error_page 418` / `if` lines.
- Remove `root`, `index`, the `try_files` location, and the static-file regex block `location ~* \.(js|css|png|...)$`. That regex would keep catching `/_next/static/*.js` and look for the files under the old `dist/` root, which returns 404s and a blank page.
- Next already sends `Cache-Control: immutable` for `/_next/static`, so proxying everything is enough.
- Keep gzip, the security headers (the `Permissions-Policy` camera/geolocation header is needed for the selfie and location steps), the logs and the Certbot lines.

```nginx
server {
    server_name loan.lendigomicrocare.com;

    # gzip block: unchanged
    # security headers: unchanged

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    access_log /var/log/nginx/loan_access.log;
    error_log /var/log/nginx/loan_error.log;

    # listen 443 ssl + ssl_* Certbot lines: unchanged
}
```

**6. Switch traffic** at a quiet time: `sudo nginx -t && sudo systemctl reload nginx`.

**7. Check right away.** Keep `pm2 logs lendigo-next-frontend` and `sudo tail -f /var/log/nginx/loan_error.log` open while you test:
- Customer: OTP login, the dashboard wizard steps, a document upload, the return from e-sign/eKYC/AA, My Loans, and Repayment with the payment page.
- Admin: login, the applications list and a case detail, the disbursal sheet, collections, and live updates (sockets), with no errors in the browser console.

**8. Roll back to React (seconds).** `LendigoMicro-Frontend/dist` is never touched, so this brings back exactly the previous site:

```bash
sudo cp /etc/nginx/lendigomicrocare.react.bak /etc/nginx/sites-enabled/lendigomicrocare
sudo nginx -t && sudo systemctl reload nginx
```

**After the new app is stable:**
- Pause the React workflow in `frontend/`. Until then it keeps rebuilding `dist/`, which does no harm and keeps the rollback path fresh.
- Consider rotating the payload encryption key together with the backend's `PAYLOAD_ENCRYPTION_KEY`. Anyone can read it from the browser bundle, and it has been shared in plain text.

## Skipped (unreachable) React code

These files could not be reached from any route in the React app, so they were not migrated. They remain in `../frontend/src`.

- **Unrouted admin pages:** `AdminUserActivity`, `AdminAuditLogs`, `SystemDLQ` (route commented out), `AdminGuide` (route commented out), `AdminPaymentGateway`, `AdminRegister` (the route always redirected), `TelecallerDashboard`.
- **Unused pages and components:**
  - `pages/user/MockPayPage`, `components/EligibilitySheet`, `components/tools/EMICalculator`, `components/admin/AdminActivityTicker`
  - `components/admin/dashboard/{ApplicationOverview, DashboardStats, PerformanceReport, QueueOverview, QuickActions, UserActivityStats}`
  - `components/admin/applications/{AssignModal, AutoAssignModal, BatchAssignModal}`
  - `components/admin/bre/ManualReviewsTable`, `components/admin/products/LoanCalculator`
  - `components/admin/telecaller/AssignedApplicationsTable` (only used by `TelecallerDashboard`)
  - `components/admin/application-details/common/{CustomerProfileCard, DocumentRow}`
- **Empty files:** `components/admin/application-details/shell/{CaseHeader, CaseSectionNav}.jsx` (0 bytes).
- **Stray scripts:** `components/forms/steps/test_date.js`, `components/forms/steps/verify_fix.js`.
- **Redux:** `store/slices/authSlice.js` (registered but never read) and `store/slices/adminAuthSlice.js` (see "Admin session storage" above).
- **Replaced by the App Router:** `main.jsx`, `App.jsx`, `routes/index.jsx`, `App.css` (not imported anywhere), `assets/react.svg`.
- **Kept as-is:** `NotificationContext`'s no-op `fetchNotifications`, `markAsRead` and `markAllAsRead`. They are part of the context value, so the no-ops stay as well.

## Known bugs carried over unchanged

- **"New Application" link:** in `views/user/LoanApplications.jsx` the button goes to `/loan/eligibility`, which is not a route, so it shows the 404 page.
- **Missing auth background:** `components/layouts/AuthLayout.jsx` uses `/images/customer_login_bg.png`, which doesn't exist in either app, so the left panel shows only its dark fallback colour.
- **White-on-white buttons:** the submit buttons on the Register page ("GET OTP", "VERIFY & REGISTER") use `bg-white text-white`, so they look blank.
- **Settlement approval check:** `views/admin/Account360Page.jsx` calls `canApproveSettlement(admin, s.requested_by_admin)`, but the helper expects the settlement object, so maker/checker checks on that screen get the wrong argument. `SettlementPanel` passes `s` correctly.
- **404 page dashboard link:** "Go to Dashboard" on the 404 page always goes to `/dashboard`, the customer dashboard, even from `/admin/*` URLs.

## Security follow-ups (not changed by the migration)

- **Response encryption key in the browser.** Encrypted API responses are decrypted in the browser, so `NEXT_PUBLIC_PAYLOAD_ENCRYPTION_KEY` ships in the JS bundle, exactly as `VITE_PAYLOAD_ENCRYPTION_KEY` did. The encryption therefore only obscures data in transit logs and gives no real confidentiality. A real fix needs a backend change, either dropping the payload encryption or decrypting in a server-side proxy.
- **Auth.** Auth still uses HttpOnly cookies on the API domain, and route guards run in the browser, as before. The Next server holds no session data.

## Remaining typing work and lint warnings

- **Untyped files.** 218 `.jsx` and 63 `.js` files are still untyped: the feature views and components, plus the helpers listed by `Get-ChildItem config,data,hooks,lib,utils -Recurse -Include *.js,*.jsx`. They can be moved to TypeScript one at a time without changing behavior. The TypeScript core already has the types they need (`lib/api/types.ts`).
- **Lint warnings.** `npm run lint` passes with 0 errors. The roughly 490 warnings are all in the copied JS/JSX files: unused imports, and `react-hooks` v7 React Compiler rules such as `set-state-in-effect` and `immutability`. The React app's own lint config used the same `react-hooks` preset and had the same findings. `eslint.config.mjs` reports them as warnings for `*.js`/`*.jsx` only, so they stay visible without forcing behavior-changing rewrites.

## Verification done

- `tsc --noEmit`, `next build` (62 routes), `npm run lint` (0 errors) and `npm test` (17/17) all pass.
- `scripts/compare-migration.mjs` confirms every migrated React file matches its counterpart apart from the mechanical rewrites and the admin-slice edits above.
- Production-build smoke test with the backend offline:
  - Every public route renders.
  - The guards redirect signed-out users to `/login` and `/admin/login`.
  - With a stored Super Admin session, all 36 admin routes render with no error-boundary crash.
  - `/admin/dsa/*` redirects to the dashboard, and unknown paths show the 404 page.
- With a stubbed customer session, all 9 customer routes render, and the dashboard wizard's eligibility form opens.
- The standalone bundle (`node server.js`) serves pages, `/_next/static` and `public/`. The client bundle contains no secret-like strings, and the only env variables it reads are `NEXT_PUBLIC_*` and `NODE_ENV`.
- **Not done here:** end-to-end flows against a live backend (OTP login, uploads, eKYC/AA/e-sign redirects, payments, sockets) and a pixel-by-pixel comparison with the running React app. `../frontend` has no `node_modules` installed. Run these during the cookie preview (cutover step 4), before switching traffic.
