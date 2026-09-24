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
  and echoes `OTP_DEV_CODE`. No SMS path. MacroPage Connect contract (probed):
  `POST /api/v1/public/messages/send`, `x-api-key` header, body `{phone:"+91…",
templateName, variables:[code]}` — the `variables` field name is still a
  guess (unknown fields are stripped server-side); confirm with one live send.
  The template must be APPROVED by Meta first. A failed send marks the OTP
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

## Money & formatting

Store amounts as plain numbers in rupees for now; if precision bites, switch to
integer paise. Indian digit grouping is a client concern (NFR-06).

## Commands

`npm run start:dev` · `npm run typecheck` · `npm run lint` · `npm test` ·
`npm run seed` · `npm run infra:up`

Seed creates: admin (`admin@fastfinance.in` / `admin12345`), a loan officer
(`officer@fastfinance.in` / `officer12345` — applications need an assignee),
6 products, a partner, 5 FAQs, 1 lender.
