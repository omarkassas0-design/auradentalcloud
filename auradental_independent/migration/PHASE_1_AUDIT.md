# AuraDental Cloud — Phase 1 Migration Audit

## Source archive inventory
- 374 files in the supplied project ZIP.
- 253 frontend source files under `src/`.
- 31 entity definitions.
- 53 backend functions.
- 6 scheduled workflows.

## Base44 decoupling changes in this package
- Removed `@base44/sdk` and `@base44/vite-plugin` from package dependencies and Vite config.
- Replaced the frontend client with `src/api/auraClient.js` and `src/api/supabaseClient.js`.
- Replaced email/password auth, signup verification, password recovery, OAuth provider login, and TOTP MFA with Supabase Auth APIs.
- Added Cloudflare Worker API with server-side JWT validation, owner-email protection, authoritative ClinicRoleAssignment lookup, and clinic scoping.
- Added initial Worker implementations for `getCurrentUserRole`, `loadUserClinic`, `clinicScopedCrud`, `getPaginatedRecords`, `getPatientFileSignedUrl`, `createNewClinic`, `assignUserToClinic`, `completeClinicSetup`, `saveClinicSettings`, `approveRegistration`, `rejectRegistration`, `getSuperAdminUsers`, `getDashboardStats`, `getDoctorDashboard`, `savePayment`, `saveDoctorCompensation`, `getDoctorCommissionSummary`, `getMonthlyExpenses`, and `getSuperAdminStats`. The CRUD layer includes role allowlists, doctor patient-phone redaction, notification ownership, audit logging, invoice totals, plan-discount RPC, restore, and permanent delete.
- Added basic public clinic branding uploads, private patient-file uploads, private import uploads, and 5-minute signed patient-file URLs.
- Replaced the old MFA endpoints with Supabase TOTP MFA. SMS-based MFA and external OAuth consent still require separate implementation.
- Replaced platform PWA endpoints with local manifest, icon, and service worker assets.
- Generated SQL schema from all 31 original entity definitions, including platform record metadata columns, User email/name mirror columns, enum checks, lookup indexes, updated-date triggers, and a Supabase Auth trigger that creates pending User and UserSecurityProfile records. RLS is enabled with fail-closed browser table grants.

## Function migration status
See `function-migration-status.json` for all 53 functions. Nineteen have initial Worker implementations. Thirty-two remain pending (two PWA functions are replaced by static assets). Remaining work includes reports, lab finalization, doctor payouts, export/import parsing, recycle-bin and deletion workflows, backups, notifications, external integrations, and scheduled jobs.

## Scheduled workflows
Six source workflows were identified. Their behavior is not yet ported to Cloudflare Cron Triggers. Do not configure production cron schedules until the corresponding Worker handlers have been implemented and tested.

## Verification performed
- Confirmed no active frontend import references `@base44/sdk`, `@base44/vite-plugin`, or the old Base44 client module.
- Confirmed all 53 source backend function names have entries in the migration status file.
- Confirmed all relative and `@/` imports in `src/` resolve to existing files.
- `node --check` passed for Worker and non-JSX JavaScript modules.
- Full Vite production build could not be completed in this environment because npm registry requests failed with DNS `EAI_AGAIN`; dependencies were not fully installed.
- No live Supabase migration, data import, Worker deployment, SMTP delivery, or production regression test has been performed.

## Release status
**Not production-ready.** This package is an independent migration foundation and is not safe to switch production users to until the pending functions, workflows, storage lifecycle, onboarding, and data migration are completed and tested. The original Base44 ZIP should remain preserved as a rollback/reference archive.
