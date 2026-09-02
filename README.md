# Fast Finance — API

Backend for the Fast Finance loan & investment origination platform. One API +
one MongoDB serving four roles: **Customer** and **Partner** (mobile PWA), plus
**Staff** and **Admin** (web panel).

Source of truth for scope: the internal FRS and the PRD (`/docs`). Requirement
IDs (`FR-CUS-*`, `FR-PTR-*`, `FR-STF-*`, `FR-ADM-*`, `NFR-*`) are referenced in
code comments.

## Stack

| | |
|---|---|
| Runtime | Node 22, NestJS 11 |
| DB | MongoDB 7 + Mongoose (`@nestjs/mongoose`) |
| Auth | Passport-JWT, rotating refresh tokens, 3 login modes |
| Realtime | Server-Sent Events (`/api/v1/events/stream`) |
| Docs | OpenAPI at `/api/v1/docs` |

## Getting started

```bash
cp .env.example .env          # then set JWT_SECRET
npm install
npm run infra:up              # MongoDB + mongo-express on :8081
npm run seed                  # see logins below + products, FAQs, a lender, FFP-DEMO1
npm run start:dev             # http://localhost:4000/api/v1  (docs: /api/v1/docs)
npm test                      # unit specs (emi, stage tracker, masking)
```

Seed logins: `admin@fastfinance.in` / `admin12345` · `officer@fastfinance.in` /
`officer12345` (a Loan Officer — applications need an assignee).

## Login modes (PRD §2.2)

| Role | Endpoint | Credential |
|---|---|---|
| Customer | `POST /auth/otp/request` → `POST /auth/otp/verify` | mobile + 4-digit OTP (`OTP_DEV_CODE=0000` in dev) |
| Partner | `POST /auth/partner/login` | partner code (`FFP-XXXX`) |
| Staff / Admin | `POST /auth/staff/login` | email + password |

All three return `{ accessToken, refreshToken }`. Rotate via `POST /auth/refresh`.

## Module map (`src/`)

| Module | Covers | State |
|---|---|---|
| `common/constants` | Stage enum + tracker, Role Access Matrix, document types | ✅ done |
| `auth` | 3 login flows, JWT strategy, refresh rotation, 4-digit OTP | ✅ done |
| `catalogue` | products/services CRUD, card shaping | ✅ done |
| `events` | SSE fan-out for "reflect without refresh" | ✅ wired |
| `audit` | append-only trail (PRD A-13) | ✅ wired |
| `storage` | local-disk file store + `/files/*` + `/admin/assets` | ✅ done (S3 driver = TODO) |
| `customers` | profile create/edit/view, masked KYC | ✅ customer path done |
| `applications` | list, detail + tracker, start/resume, submit, advance/revert/reject | ✅ customer + core staff path |
| `documents` | upload, checklist, manual bank, staff verify/reject | ✅ done (AA flagged off) |
| `messaging` | customer↔staff chat + system stage messages | ✅ done |
| `notifications` | per-user centre + domain-event fan-out | ✅ done |
| `support` | FAQs + contact block | ✅ done |
| `content` | banners, gallery, lenders + pincode search | ✅ done |
| `tools` | `POST /tools/emi` reducing-balance calculator | ✅ done |
| `commission` | calculate-once-on-disbursal, earnings | 🚧 skeleton (pure `compute()` done) |
| `partners` `staff` | records + management | 🚧 skeleton (`partners.onboard`, `staff.create`, `staff.pickAssignee` done) |
| `gst` | monthly ledger, GST calc | 🚧 skeleton (`gstOn()` done) |
| `reports` | 5 report types, PDF + Excel export | 🚧 skeleton |
| `admin` | dashboard KPIs, reassignment | 🚧 skeleton (`overview` partial) |

`NotImplementedException` marks every unbuilt path, each with a `TODO(FR-…)`.

## Build order (from PRD §10)

1. ✅ Foundation — config, data model, auth, role guards, catalogue
2. **Server-side authorization scoping** — `scopeFor()` in every service query (NFR-02, PRD §7)
3. Customer core — `applications.startOrResume`, document seeding, `submit`
4. Staff processing — `documents.review`, `applications.advanceStage` transaction
5. Partner channel — lead creation, `staff.pickAssignee`, `commission.calculateFor`
6. Admin — dashboard aggregations, `admin.reassign`, staff/partner lists
7. GST + reports — ledger, export engine
8. Hardening — AA integration (flag), notifications, low-end/4G load test

## Non-negotiables (FRS §10.1)

- `stage` is stored, never derived; rejection is a **separate** flag
- role scoping enforced in the service layer, not just the UI
- stage change = one transaction: update + system message + audit + **one** event
- commission computed once at disbursal and persisted with a snapshot of the rate
- manual bank-statement path is fully supported; AA sits behind `FEATURE_ACCOUNT_AGGREGATOR`

## Deploy (Render)

`render.yaml` is a Blueprint for the **`develop`** branch. MongoDB is not
provisioned by it — use a free MongoDB Atlas cluster and set `MONGODB_URI` in
the Render dashboard along with the other `sync: false` vars
(`ALLOWED_ORIGINS`, `PUBLIC_ASSET_BASE_URL`, `SUPPORT_PHONE`).

Branch flow: `feat/*` → `develop` (Render preview) → `main`.

⚠️ `STORAGE_DRIVER=local` on Render is ephemeral — uploaded KYC files are lost
on redeploy. Fine for testing; wire the S3 driver before real use.

## Open items blocking work (FRS §13 / PRD §14)

MacroPage Connect API contract (WhatsApp OTP — `CommsService` has the wiring,
needs the real endpoint/payload) · Account Aggregator provider · GST rate ·
commission rates per product · lender/branch dataset for pincode search ·
**"Type of Employment" option list** (`EmploymentCategory` is a placeholder) ·
S3 storage driver.
