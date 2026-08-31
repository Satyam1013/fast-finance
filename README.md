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
npm run seed                  # admin@fastfinance.in / admin12345, demo products, FFP-DEMO1
npm run start:dev             # http://localhost:4000/api/v1  (docs: /api/v1/docs)
```

## Login modes (PRD §2.2)

| Role | Endpoint | Credential |
|---|---|---|
| Customer | `POST /auth/otp/request` → `POST /auth/otp/verify` | mobile + OTP (`OTP_DEV_CODE` in dev) |
| Partner | `POST /auth/partner/login` | partner code (`FFP-XXXX`) |
| Staff / Admin | `POST /auth/staff/login` | email + password |

All three return `{ accessToken, refreshToken }`. Rotate via `POST /auth/refresh`.

## Module map (`src/`)

| Module | Covers | State |
|---|---|---|
| `common/constants` | Stage enum, Role Access Matrix, document types | ✅ done |
| `auth` | 3 login flows, JWT strategy, refresh rotation | ✅ done |
| `catalogue` | products/services CRUD, activate/deactivate | ✅ done |
| `events` | SSE fan-out for "reflect without refresh" | ✅ wired |
| `audit` | append-only trail (PRD A-13) | ✅ wired |
| `applications` | lifecycle, stage transitions, duplicate-check, submission gate | 🚧 skeleton + rules documented |
| `documents` | upload, verify, manual bank entry, AA (flagged) | 🚧 skeleton |
| `commission` | calculate-once-on-disbursal, earnings | 🚧 skeleton (pure `compute()` done) |
| `messaging` | chat + system stage messages | 🚧 skeleton (`postSystem` done) |
| `customers` `partners` `staff` | records + management | 🚧 skeleton (`partners.onboard`, `staff.create` done) |
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

## Open items blocking work (FRS §13 / PRD §14)

SMS/OTP provider · Account Aggregator provider · GST rate · commission rates per
product · lender/branch dataset for pincode search · staff auto-assignment rule.
