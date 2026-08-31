# Fast Finance API — working notes

NestJS 11 + MongoDB (Mongoose). Backend only. Mobile PWA and web admin panel
are separate deliverables built by others against this API's OpenAPI spec
(`/api/v1/docs-json`).

## Conventions

- Double-quoted strings, semicolons, 2-space indent (Prettier + `.prettierrc`).
- Global prefix `api/v1`. Error shape: `{ success:false, message, code, errors? }`
  via `HttpExceptionFilter` — services throw structured objects for custom codes.
- One feature module per domain: `<name>/<name>.{module,service,controller}.ts`
  + `schemas/` + `dto/`.
- Mongoose schemas: `@Schema({ timestamps: true, collection: "<plural>" })`,
  `export type XDocument = HydratedDocument<X> & { createdAt: Date; updatedAt: Date }`.
- `JwtAuthGuard` is global; opt out with `@Public()`. `RolesGuard` +
  `@Roles(Role.X)` per controller/route for the coarse gate.
- **Data scoping is NOT the guard's job.** Every service that reads records must
  narrow the query by `scopeFor(module, role)` from `common/constants/roles.ts`
  (own / own-leads / assigned / all). A Staff token must never reach another
  staff member's customer by id (NFR-02, FRS §10.1, PRD §7).

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
  `MANDATORY_DOCUMENTS` entry is Submitted/Verified.
- Commission: computed once when stage hits 7 (not rejected), persisted with a
  snapshot of `commissionType`/`commissionValue`. Never recompute historically.
- Partner code auth: active partners only.
- Manual bank entry validates `accountNumber === reEnteredAccountNumber` before
  persist; re-entry is not stored. AA path is behind `FEATURE_ACCOUNT_AGGREGATOR`.

## Money & formatting

Store amounts as plain numbers in rupees for now; if precision bites, switch to
integer paise. Indian digit grouping is a client concern (NFR-06).

## Commands

`npm run start:dev` · `npm run typecheck` · `npm run lint` · `npm run seed` ·
`npm run infra:up`
