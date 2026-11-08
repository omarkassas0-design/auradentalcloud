# AuraDental Cloud — Independent Deployment Foundation

## What this package changes
- Removes the Base44 SDK and Vite plugin from the frontend build.
- Replaces frontend Base44 client usage with an Aura client backed by Supabase Auth and a Cloudflare Worker API.
- Adds an initial SQL schema generated from all 31 source entity definitions, including enum validation and a pending-registration trigger.
- Adds fail-closed RLS defaults and clinic membership read policies.
- Adds a Worker with server-side auth verification, authoritative ClinicRoleAssignment lookup, `getCurrentUserRole`, `loadUserClinic`, and a guarded `clinicScopedCrud` implementation.

## Important migration status
This is an independent migration foundation, not a production-parity release. The source project contains 53 backend functions and 6 scheduled workflows. The core API operations `getCurrentUserRole`, `loadUserClinic`, `clinicScopedCrud`, `getPaginatedRecords`, `getPatientFileSignedUrl`, `createNewClinic`, `assignUserToClinic`, `completeClinicSetup`, `saveClinicSettings`, `approveRegistration`, `rejectRegistration`, and `getSuperAdminUsers`, `getDashboardStats`, `getDoctorDashboard`, `savePayment`, `saveDoctorCompensation`, `getDoctorCommissionSummary`, `getMonthlyExpenses`, and `getSuperAdminStats` have initial Worker implementations, including role allowlists, clinic scoping, doctor patient-phone redaction, and audit event writes. The remaining function names are registered and return HTTP 501 with an explicit migration message; they never return fake success. Do not switch production traffic or disconnect Base44 until every required function, workflow, integration, storage flow, and regression test has a verified replacement.

The SQL migration creates schema only. It does not import Base44 production records, auth users, or private files. Apply it only to the empty Supabase project after reviewing it.

## Configure frontend
1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm install`, then start the Worker with `npx wrangler dev --port 8787` and the Vite frontend with `npm run dev` in separate terminals.

## Configure Worker
1. install Wrangler in the project root with `npm install -D wrangler`; then run `npx wrangler dev --port 8787` from the project root for local API development
2. Set Worker secrets: `wrangler secret put SUPABASE_URL`, `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`, and `wrangler secret put OWNER_EMAIL`. For local Worker development, copy `.dev.vars.example` to `.dev.vars` and fill it locally; never commit the real file.
3. Deploy to the `workers.dev` preview first with `npx wrangler deploy`.
4. After smoke tests, add your existing domain in Cloudflare → Workers & Pages → your Worker → Settings → Domains & Routes → Add Custom Domain. Do not change the live domain until the production parity checklist is complete.

The service-role key must exist only as a Worker secret. The SQL migration revokes direct table privileges from browser roles; the Worker is the only data access path in this migration stage. Never put it in Vite variables or commit it.

## Supabase setup
1. Review `supabase/migrations/0001_initial_schema.sql`.
2. Apply it to the empty project using Supabase CLI or SQL Editor.
3. Configure Auth email templates, SMTP provider, Site URL, and redirect URLs.
4. Test password recovery end-to-end.

## Known remaining work
- Port the remaining 32 backend functions and 6 scheduled workflows (two PWA functions are replaced by static assets).
- Implement secure file download, import extraction, and additional storage lifecycle routes; basic public branding uploads, private patient-file uploads, and signed patient-file URLs are present.
- Complete direct entity APIs and remaining entity-specific constraints.
- Verify all current pages and user flows against the new backend.
- Add owner-only Super Admin operations with explicit OWNER_EMAIL enforcement and audited authorization.
- Port transactional financial functions, backup/restore, Google Drive and WhatsApp/email provider integrations.
- Complete SMS-based MFA parity (the current implementation supports Supabase TOTP MFA) and independently rebuild the OAuth consent integration.
- Import Base44 data and files with reconciliation reports.
