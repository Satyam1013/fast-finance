# Fast Finance API — working notes

NestJS 11 + MongoDB (Mongoose). Backend only. Mobile PWA and web admin panel
are separate deliverables built by others against this API's OpenAPI spec
(`/api/v1/docs-json`).

## Conventions

- Double-quoted strings, semicolons, 2-space indent (Prettier + `.prettierrc`).
- Global prefix `api/v1`. Error shape: `{ success:false, message, code, errors? }`
  via `HttpExceptionFilter` — services throw structured objects for custom codes.
- One feature module per domain: `<name>/<name>.{module,service,controller}.ts`
  - `schemas/` + `dto/`.
- Mongoose schemas: `@Schema({ timestamps: true, collection: "<plural>" })`,
  `export type XDocument = HydratedDocument<X> & { createdAt: Date; updatedAt: Date }`.
- `JwtAuthGuard` is global; opt out with `@Public()`. `RolesGuard` +
  `@Roles(Role.X)` per controller/route for the coarse gate.
- **Data scoping is NOT the guard's job.** Every service that reads records must
  narrow the query by `scopeFor(module, role)` from `common/constants/roles.ts`
  (own / own-leads / assigned / all). A Staff token must never reach another
  staff member's customer by id (NFR-02, FRS §10.1, PRD §7).
- **Cross-module read access without a cycle:** when a module needs read-only
  `Application` data but importing `ApplicationsModule` would cycle back (it
  already imports the module in question), register the `Application` schema
  a second time via `MongooseModule.forFeature` — same collection, no import
  of `ApplicationsModule`/`ApplicationsService`. Used by `MessagingModule`,
  `DocumentsModule` and `OffersModule`. Anything that needs to _mutate_ the
  application's stage stays inside `ApplicationsService` itself (it injects
  the other services, never the other way round).

## Domain rules that bite if missed (FRS §10.1, PRD §6.1)

- `Application.stage`: integer 1–7, stored not derived. Rejection is
  `isRejected` + `rejectionReason`, independent of stage.
- Stage advances one at a time. Only Admin reverts, always audited. Stage 7
  locks the application.
- Stage change must be ONE transaction: update Application → SYSTEM ChatMessage
  → AuditLog → single `EventsService.publish` to [customer, staff, partner?].
  Never per-role polling.
- Duplicate prevention: before creating a Customer application, reuse any
  existing one for same customer+product at stage 1, not rejected.
- Submission gate (FR-CUS-13): block in the API, not just UI, until every
  document `requiredDocumentsFor(productCode, employmentType)` names is
  Submitted/Verified — the checklist is **per product category**, not one
  global list (see "Category-specific documents" below).
- Commission: computed once when stage hits 7 (not rejected), persisted with a
  snapshot of `commissionType`/`commissionValue`. Never recompute historically.
- Partner code auth: active partners only.
- Manual bank entry validates `accountNumber === reEnteredAccountNumber` before
  persist; re-entry is not stored. AA path is behind `FEATURE_ACCOUNT_AGGREGATOR`.

## Customer app surface (built against the Figma mock)

- Login OTP is **4 digits** (`OTP_LENGTH`, mock has 4 boxes). No guest mode.
  Delivery is WhatsApp-only via `CommsService` (`OTP_CHANNEL=whatsapp` →
  MacroPage Connect, the in-house platform). `OTP_DEV_MODE=true` skips sending
  and echoes `OTP_DEV_CODE`. No SMS path. MacroPage Connect contract (same one the
  macropage website/quiz backends use): `POST /api/v1/public/messages/send`,
  `x-api-key` header, body `{phone:"+91…", templateName, templateVars:{"1":code}}`.
  The template must be APPROVED + synced in the MacroPage workspace that owns the
  API key (`TEMPLATE_NOT_APPROVED` otherwise). A failed send marks the OTP
  consumed and returns 503 `OTP_DELIVERY_FAILED`.
- Application ID format is `FF-<PRODUCT_CODE>-<YYMMDD>-<NNNN>` (matches the mock),
  generated in `ApplicationsService`. `Product.code` is required + unique.
- Create Profile (`POST /me/profile`, multipart) captures name/email/employment/
  state/city + 4 files (photo, aadhaarFront, aadhaarBack, panCard) into
  `Customer`. `startOrResume` refuses until `profileCompletedAt` is set.
  `GET /me/profile` returns masked Aadhaar/PAN (`common/util/mask.ts`).
- `GET /applications/:id` is the tracker screen: `buildStageTracker()` 7-step
  array + `STAGE_CUSTOMER_MESSAGE` + checklist + assigned-staff contact card.
- `StorageService` picks a driver from `STORAGE_DRIVER` (`local` → `./uploads`,
  `s3` → DigitalOcean Spaces / any S3). Objects are private; reads go through the
  auth-gated `GET /files/*key` proxy (per-record scoping is a TODO). Admin uploads
  CMS images via `POST /admin/assets` then references the returned key.
- `NotificationsService` subscribes to `EventsService.stream()` and fans
  `stage.changed` / `application.rejected` out to per-customer rows — publishers
  still publish once.
- Home extras: `POST /tools/emi` (pure), `content` module (banners / gallery /
  lenders + `content/lenders/search?pincode=`), `support` module (FAQs + contact
  from `SUPPORT_*` env).

### Category-specific documents (Figma checklists)

`common/constants/documents.ts` maps `Product.code` (+ `employmentType` for
Personal Loan) to a fixed `DocumentType[]` — `requiredDocumentsFor()`. Lists
are transcribed from the Figma "required documents" info panels (PL/BL, HL/
MLAP, CL, INS); unmapped product codes fall back to a generic list — extend
the `switch` before adding a new product code. `DocumentsService` resolves the
list itself per application (reads `Application.productCode` +
`profile.employmentType`, both denormalised at creation) — callers just pass
an `applicationId`, never the list.

### Loan Offer (Stage 3)

`offers/` — Staff (own assigned) / Partner (own referrals) / Admin set the
offer via `POST /applications/:id/offer` (amount, rate, tenure → EMI computed
with `tools/emi.ts`); locked once the customer accepts. Customer responds via
`POST /applications/:id/offer/accept` (advances 3→4, sets
`Application.loanAmount`) or `.../offer/reject` (rejects the whole
application — declining terms ends the journey, §3.1). Both live on
`ApplicationsController`/`ApplicationsService` since they drive the stage
transition; `OffersService` only owns the offer record + the Staff/Partner
scoping check for _setting_ it.

### Customer KYC review

Manual only (no third-party verification API) — `Customer.kycStatus`
(PENDING/VERIFIED/REJECTED, mirrors `Partner.kycStatus`) reviewed by
Staff/Admin via `POST /admin/customers/:id/kyc-review`, same
`{decision:'verify'|'reject', note?}` shape as `documents.review`. Aadhaar/PAN
numbers are set once at Create Profile and are not editable via `PATCH
/me/profile` — a rejected customer currently has no self-service resubmit
path (follow-up, not built).

### Still needs the business (mock is ahead of the FRS here)

- `EmploymentCategory` enum is a guess — confirm the real "Type of Employment"
  list. Binary `EmploymentType` (for eligibility) is derived via
  `employmentTypeFor()`.
- `Customer` gained `state`/`city`/`photoRef`/`employmentCategory` — not in
  FRS §9.3, driven by the Create Profile screen.
- Document verify/reject does not yet fan an event/notification (applications ⇄
  documents boundary is one-way to avoid a module cycle) — see the TODO in
  `DocumentsService.review`.

## Admin panel surface (built against a frontend dev's spec, `feat/admin-panel-api`)

A frontend dev handed over an endpoint list for the web Admin panel (bare
paths: `/customers`, `/staffs`, `/dsas`, `/products`, `/app-banners`,
`/reports/*`, `/notifications`, `/dsa/*`) built with zero knowledge of this
API. Where a bare path they expected was already taken by an existing
customer/partner-facing route with a different shape, the admin version stays
under `/admin/...` instead and the bare alias is skipped — this only affects
`/products` (customer-facing, active-only — admin CRUD is `/admin/products`,
now with `search`/`active` query filters) and `/notifications` /
`/support` (the caller's own centre / FAQ+contact screen — admin equivalents
are `/admin/notifications` and `/admin/support/tickets`). Everything else
listed below got its exact bare path as an alias alongside the documented one,
same pattern as the customer-app aliases (`auth.controller.ts`,
`customers.controller.ts`).

- **Customers (`/customers`)** — one row **per customer** (not per
  application), joined with their **latest** application for
  `loan`/`loanAmount`/`status`/`staff`/`onboard`/`dsa`. `AdminCustomersService`
  (in `admin/`, not `customers/`) does the join — it needs to both read
  Customer data and *mutate* Application data (status changes, staff
  reassignment), and `CustomersModule` can't import `ApplicationsModule`
  (cycle — see the cross-module rule above), so the join+mutation orchestration
  lives one level up instead, in `AdminModule`, which imports both. The Customer
  ⇄ Application join itself is a factored-out pure function
  (`admin/util/build-customer-row.ts`) shared with `ReportsService`.
  - `status` is one of `STAGE_SHORT_LABELS` (already matches the spec's list
    exactly) or `"Rejected"`. `PATCH /customers/:id/status {status, note}`
    resolves the label back to a stage and calls `advanceStage`/`revertStage`
    (admin bypasses the "assigned staff only" check already) — **stage moves
    stay one step at a time** (PRD §6.1); a multi-step jump is rejected with
    `STAGE_SKIP_NOT_ALLOWED` rather than silently writing `stage` directly.
    `status: "rejected"` calls `reject()` instead (note becomes the reason).
  - `PATCH /customers/:id/staff {staffId}` reassigns the customer's latest
    application — new `ApplicationsService.reassignStaff()` (mutation, so it
    stays there per the module-boundary rule), used by both this and the
    older `AdminService.reassign` stub (now implemented for real).
  - The existing `/admin/customers` (Aadhaar/PAN/KYC-review-oriented profile
    list, `CustomersService.adminList`) is untouched — this is a second,
    additive view for a different screen, not a replacement.
- **Blocked (Customer/Staff/DSA)** — chosen behaviour: blocking cuts off
  login **and** every subsequent request, not just a reporting flag.
  - Staff/Partner already had a live re-check on every request
    (`AuthService.resolveSubject` re-reads `active`/`status` from the DB each
    time) — the admin panel's "blocked" toggle just flips that same field
    (`Staff.active = false`, `Partner.status = INACTIVE`; there's no separate
    `blocked` column on either).
    Customer had no such flag before — added `Customer.blocked`, checked in
    `resolveSubject`, `requestOtp` and `verifyOtp`.
  - Every blocking service also revokes the account's refresh tokens (each of
    `CustomersModule`/`StaffModule`/`PartnersModule` registers `RefreshToken`
    a second time to do this) — belt-and-braces, since `resolveSubject`
    already blocks the *next* request either way.
- **Staffs (`/staffs`)**, **DSA (`/dsas` + `/dsa/*`)** — `Staff.designation`
  (Junior/Senior/Team Lead/Manager — `common/constants/staff-designation.ts`)
  is new and separate from the existing `staffRole` (which drives
  `pickAssignee`/contact-card logic; the admin panel's Add Staff form doesn't
  send it, so it defaults to `LOAN_OFFICER`). `Partner.staffId` (assigned
  point of contact) is new. `/dsa/resources`, `/dsa/cibil-links`,
  `/dsa/commission-files`, `/dsa/banking-links` (singular `dsa`, per the spec)
  are a new content-library module (`src/dsa/`) — global lists Admin curates,
  Partners read; **`BankingLink.password` is plaintext, `select:false` only**
  (same caveat as Aadhaar/PAN in `customer.schema.ts` — encrypt before this
  carries anything real). Never returned by `POST`, `PATCH` or `GET` — a
  freshly-`.create()`d in-memory doc still carries a `select:false` field
  (that flag only suppresses *queries*), so the create path strips it by hand.
  The same gap existed for `Staff.passwordHash` on `POST /staffs` from before
  this branch — fixed here too.
- **Reset password (`/auth/reset-password[/confirm]`)** — no email/SMTP
  provider is wired (same category of gap as WhatsApp OTP before MacroPage was
  wired — see above). The token is logged and, outside `NODE_ENV=production`
  only, echoed as `devResetToken` so the flow is testable end-to-end; wire a
  real provider before this reaches real users. `POST /auth/login` is an
  alias for `/auth/staff/login`, same request/response shape — **not** the
  `{token, user}` shape a from-scratch spec guessed at; every login endpoint
  keeps this API's one shape (`{accessToken, refreshToken, role, profile}`).
- **Notifications (`/admin/notifications`)** — admin-authored broadcast, fans
  one `Notification` row to every customer for the in-app centre/SSE stream
  (existing `NotificationsService`) plus one `AdminBroadcast` row so the panel
  can list what it sent. No push provider (FCM/APNs) is wired — same
  "not built yet" category, flagged rather than faked.
- **Support tickets (`/admin/support/tickets`, `POST /support/tickets`)** — new
  `SupportTicket` schema/flow; distinct from the FAQ/contact `support` screen
  that already existed.
- **App Banners (`/app-banners`)** — reuses the existing `content` Banner
  schema/CRUD (`ctaUrl`↔`redirect`, `active`↔`status` are aliases in both
  directions, not a rename); added the missing `GET` admin list and `PATCH`
  status toggle, and the spec's "max 8" cap (enforced on create, total count).
- **Products** — `ProductKind` gained `INVESTMENT`/`CREDIT_CARD`. `POST`/`PATCH
  /admin/products` now also accept a multipart `image` file. Added `DELETE
  /admin/products/:id` — hard delete, but refused (`PRODUCT_IN_USE`) once any
  Application references the product; deactivating (`active:false`, already
  existed) is still the normal way to retire one (FR-ADM-21/22).
- **Reports (`/reports/*`)** — `stats`/`customer`/`dsa`/`staffs`/`export` are
  new, sit alongside (don't replace) the older FR-ADM-28..34 `/admin/reports/
  :type` skeleton (still `NotImplementedException` — 5-report PDF/Excel job,
  unrelated ask). Plain CSV (`common/util/csv.ts`), not PDF/Excel — exceljs
  is already a dependency (used by `scripts/gen-api-xlsx.mjs`) but is overkill
  for a flat CSV.
- Every `*/export` returns `text/csv`, not JSON — check `Content-Type` before
  assuming a JSON parse in a client.

## Money & formatting

Store amounts as plain numbers in rupees for now; if precision bites, switch to
integer paise. Indian digit grouping is a client concern (NFR-06).

## Commands

`npm run start:dev` · `npm run typecheck` · `npm run lint` · `npm test` ·
`npm run seed` · `npm run infra:up`

Seed creates: admin (`admin@fastfinance.in` / `admin12345`), a loan officer
(`officer@fastfinance.in` / `officer12345` — applications need an assignee),
6 products, a partner, 5 FAQs, 1 lender.
