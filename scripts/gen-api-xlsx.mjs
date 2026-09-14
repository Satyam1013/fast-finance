/**
 * Generates docs/Fast-Finance-API.xlsx from the running server's OpenAPI spec
 * plus a curated metadata table (roles, screens, response shapes, build status).
 *
 *   node dist/main &                       # server on :4000
 *   node scripts/gen-api-xlsx.mjs          # writes docs/Fast-Finance-API.xlsx
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";

const SPEC_URL = "http://localhost:4000/api/v1/docs-json";
const OUT = "docs/Fast-Finance-API.xlsx";

// ── curated per-endpoint metadata, keyed by "METHOD /api/v1/path" (path uses {id}) ──
const META = {
  // AUTH
  "POST /api/v1/auth/otp/request": { screen: "Login", roles: "—", desc: "Send a 4-digit login OTP to the mobile via WhatsApp. In dev (OTP_DEV_MODE) it is not sent; the code is returned as `devCode`.", body: "JSON { mobile: 10-digit string }", res: "{ success, devCode? }", status: "Ready", rl: "3 / min" },
  "POST /api/v1/auth/otp/verify": { screen: "OTP", roles: "—", desc: "Verify the OTP. Creates the customer on first login. Returns tokens + whether the profile is complete.", body: "JSON { mobile, code: 4-digit string }", res: "{ accessToken, refreshToken, expiresIn, role, profile:{ id, name, mobile, profileComplete } }", status: "Ready", rl: "5 / min" },
  "POST /api/v1/auth/partner/login": { screen: "Partner login", roles: "—", desc: "Partner (DSA) login with a partner code. Active partners only.", body: "JSON { partnerCode }", res: "{ accessToken, refreshToken, role:PARTNER, profile }", status: "Ready", rl: "5 / min" },
  "POST /api/v1/auth/staff/login": { screen: "Staff/Admin login", roles: "—", desc: "Staff / Admin login with email + password.", body: "JSON { email, password }", res: "{ accessToken, refreshToken, role:STAFF|ADMIN, profile:{ id, name, email, staffRole } }", status: "Ready", rl: "5 / min" },
  "POST /api/v1/auth/refresh": { screen: "—", roles: "—", desc: "Rotate the token pair. The old refresh token is revoked; reuse invalidates the whole chain.", body: "JSON { refreshToken }", res: "{ accessToken, refreshToken, expiresIn }", status: "Ready" },
  "POST /api/v1/auth/logout": { screen: "Profile → Logout", roles: "—", desc: "Revoke a refresh token.", body: "JSON { refreshToken }", res: "{ success }", status: "Ready" },
  "GET /api/v1/auth/me": { screen: "—", roles: "any", desc: "The decoded token subject (id, role, name).", res: "{ success, user:{ sub, role, name, ... } }", status: "Ready" },

  // CUSTOMER PROFILE
  "GET /api/v1/me/profile": { screen: "Profile", roles: "CUSTOMER", desc: "Own profile. Aadhaar/PAN numbers are masked. KYC scan URLs included.", res: "{ success, profile:{ id, fullName, mobile, email, employmentCategory(+Label), state, city, pincode, photoUrl, kyc:{ aadhaarMasked, panMasked, aadhaarFrontUrl, aadhaarBackUrl, panCardUrl }, profileComplete, createdAt } }", status: "Ready" },
  "POST /api/v1/me/profile": { screen: "Create Profile", roles: "CUSTOMER", desc: "First-time profile capture. All fields + all 4 files mandatory. `startOrResume` is blocked until this is done.", body: "multipart/form-data — fields: fullName, email, employmentCategory(enum), state, city ; files: photo, aadhaarFront, aadhaarBack, panCard (jpg/png/webp/pdf, ≤10MB)", res: "{ success, profile }", status: "Ready" },
  "PATCH /api/v1/me/profile": { screen: "Edit Profile", roles: "CUSTOMER", desc: "Partial update. Any subset of fields; optional replacement `photo` file. Mobile is not editable.", body: "multipart/form-data or JSON — fullName?, email?, employmentCategory?, state?, city? ; file: photo?", res: "{ success, profile }", status: "Ready" },

  // CATALOGUE
  "GET /api/v1/catalogue/products": { screen: "Home – product cards", roles: "any", desc: "Active products/services, sorted. Card-shaped: rate label + resolved image URL.", res: "[ { id, name, code, kind:LOAN|INSURANCE, subtitle, imageUrl, interestRateMin, interestRateMax, rateLabel, processingFee } ]", status: "Ready" },
  "GET /api/v1/catalogue/products/{id}": { screen: "Product detail", roles: "any", desc: "One product (card shape). 404 if not found.", res: "{ id, name, code, kind, subtitle, imageUrl, rateLabel, ... }", status: "Ready" },
  "GET /api/v1/catalogue/admin/products": { screen: "Admin – products", roles: "ADMIN", desc: "All products incl. deactivated (raw docs).", res: "[ Product ]", status: "Ready" },
  "POST /api/v1/catalogue/admin/products": { screen: "Admin – products", roles: "ADMIN", desc: "Create a product. `code` derived from name if omitted; must be unique.", body: "JSON { name*, code?, kind?, subtitle?, interestRateMin*, interestRateMax*, processingFee?, commissionType*, commissionValue* }", res: "Product", status: "Ready" },
  "PATCH /api/v1/catalogue/admin/products/{id}": { screen: "Admin – products", roles: "ADMIN", desc: "Update / activate / deactivate. Activation changes are audited.", body: "JSON (any product field) + active?", res: "Product", status: "Ready" },

  // APPLICATIONS
  "GET /api/v1/applications": { screen: "Products tab (my applications) / Home summary", roles: "CUSTOMER, PARTNER, STAFF, ADMIN", desc: "Caller's applications, scoped by role (own / referred / assigned / all). Newest first.", res: "{ success, applications:[ { id, applicationId, productId, productName, stage(1-7), step, totalSteps, stageLabel, stageShortLabel, status:IN_PROGRESS|DISBURSED|REJECTED, statusLabel, isRejected, rejectionReason, loanAmount, pendingDocumentCount, needsAction, createdAt, updatedAt } ] }", status: "Ready" },
  "GET /api/v1/applications/{id}": { screen: "Application form (tracker)", roles: "CUSTOMER, PARTNER, STAFF, ADMIN", desc: "One application, scoped. Full 7-step tracker + current-stage message + document checklist + assigned-staff contact card. 404 if not in caller's scope.", res: "{ success, application:{ ...list fields, tracker:[ { stage, step, label, status:completed|current|pending } ]×7, currentStageMessage, documents:[ { type, label, status, fileUrl, submissionMethod, rejectionNote, verifiedAt } ], pendingDocuments:[label], assignedStaff:{ id, name, phone, staffRole }|null, profile, rejection:{ reason, at }|null, submittedAt } }", status: "Ready" },
  "POST /api/v1/applications": { screen: "Tap a product / Complete Now", roles: "CUSTOMER", desc: "Start (or resume) an application for a product. Requires a complete profile. Reuses an existing stage-1 un-rejected application for the same product. Seeds the 6-document checklist and assigns a staff member.", body: "JSON { productId: Mongo id }", res: "same as GET /applications/{id}", status: "Ready", err: "400 PROFILE_INCOMPLETE, 400 PRODUCT_UNAVAILABLE" },
  "POST /api/v1/applications/{id}/submit": { screen: "Application form – Submit", roles: "CUSTOMER", desc: "Final submission. Blocked (400 DOCUMENTS_PENDING) until every mandatory document is Submitted/Verified. On success advances stage 1 → 2.", res: "same as GET /applications/{id}", status: "Ready", err: "400 DOCUMENTS_PENDING { errors:[label] }, 403 (rejected/locked), 400 ALREADY_SUBMITTED" },
  "POST /api/v1/applications/{id}/advance": { screen: "Staff panel", roles: "STAFF (own assigned), ADMIN", desc: "Advance one stage. Writes a SYSTEM chat message, audit log, and one realtime event to the customer/partner.", res: "same as GET /applications/{id}", status: "Ready" },
  "POST /api/v1/applications/{id}/revert": { screen: "Admin panel", roles: "ADMIN", desc: "Move an application back one stage. Always audited.", res: "application detail", status: "Ready" },
  "POST /api/v1/applications/{id}/reject": { screen: "Staff / Admin panel", roles: "STAFF (own assigned), ADMIN", desc: "Reject from any stage with a mandatory reason. Emits application.rejected event + customer notification.", body: "JSON { reason: string (min 3) }", res: "application detail", status: "Ready" },

  // DOCUMENTS
  "GET /api/v1/applications/{id}/documents": { screen: "Application form – checklist", roles: "any (auth)", desc: "The 6-item document checklist with per-item status + file URL.", res: "[ { type:PAN|AADHAAR|SELFIE|ADDRESS|SALARY_SLIP|BANK_STATEMENT, label, status:PENDING|SUBMITTED|VERIFIED|REJECTED, fileUrl, submissionMethod, rejectionNote, verifiedAt, updatedAt } ]", status: "Ready" },
  "POST /api/v1/applications/{id}/documents": { screen: "Doc upload", roles: "CUSTOMER", desc: "Upload one checklist document (not the bank statement — use the bank endpoints for that). Re-upload replaces the file and clears any rejection.", body: "multipart/form-data — field: type (enum, not BANK_STATEMENT) ; file: file (jpg/png/webp/pdf, ≤10MB)", res: "{ success, document:{ type, label, status:SUBMITTED, fileUrl } }", status: "Ready" },
  "POST /api/v1/applications/{id}/documents/bank/manual": { screen: "Manual bank entry", roles: "CUSTOMER", desc: "Submit bank details manually. `accountNumber` must equal `reEnteredAccountNumber`; the re-entry is not stored.", body: "JSON { accountNumber, reEnteredAccountNumber, ifsc }", res: "{ success, document:{ type:BANK_STATEMENT, status:SUBMITTED, submissionMethod:MANUAL } }", status: "Ready", err: "400 ACCOUNT_MISMATCH" },
  "POST /api/v1/applications/{id}/documents/bank/aa": { screen: "AA bank flow", roles: "CUSTOMER", desc: "Account Aggregator OTP path — feature-flagged OFF. Always returns 400 AA_DISABLED for now; use manual entry.", res: "400 AA_DISABLED", status: "Disabled" },
  "POST /api/v1/documents/{docId}/review": { screen: "Staff – verify docs", roles: "STAFF, ADMIN", desc: "Mark a document Verified or Rejected. A note is mandatory when rejecting.", body: "JSON { decision: 'verify'|'reject', note?: string }", res: "{ success, document:{ id, type, status, rejectionNote } }", status: "Ready" },

  // MESSAGING
  "GET /api/v1/applications/{id}/messages": { screen: "Support chat", roles: "CUSTOMER, STAFF, PARTNER, ADMIN (scoped)", desc: "The shared thread for an application. Marks it read for the caller.", res: "{ success, messages:[ { id, kind:USER|SYSTEM, sender:CUSTOMER|STAFF|SYSTEM, body, mine, createdAt } ] }", status: "Ready" },
  "POST /api/v1/applications/{id}/messages": { screen: "Support chat – send", roles: "CUSTOMER, STAFF", desc: "Post a message as the customer or the assigned staff. Disabled once the application is rejected/locked.", body: "JSON { body: string (1–2000) }", res: "{ success, message:{ id, kind, sender, body, mine, createdAt } }", status: "Ready" },

  // NOTIFICATIONS
  "GET /api/v1/notifications": { screen: "Notifications", roles: "any (auth)", desc: "Caller's notifications, newest first, with unread count. Soft-deleted ones are excluded.", res: "{ success, unreadCount, notifications:[ { id, type:WELCOME|STAGE_UPDATE|DOCUMENT_REQUEST|APPLICATION_REJECTED|GENERAL, title, body, applicationId, read, createdAt } ] }", status: "Ready" },
  "POST /api/v1/notifications/read-all": { screen: "Notifications", roles: "any (auth)", desc: "Mark all of the caller's notifications read.", res: "{ success }", status: "Ready" },
  "POST /api/v1/notifications/{id}/read": { screen: "Notifications", roles: "any (auth)", desc: "Mark one notification read.", res: "{ success }", status: "Ready" },
  "DELETE /api/v1/notifications/{id}": { screen: "Notifications – swipe to delete", roles: "any (auth)", desc: "Soft-delete one notification.", res: "{ success }", status: "Ready" },

  // SUPPORT
  "GET /api/v1/support": { screen: "Support", roles: "any (auth)", desc: "Support screen payload: contact block + active FAQs.", res: "{ success, contact:{ phone, whatsapp, email, responseTimeLabel }, faqs:[ { id, question, answer, category } ] }", status: "Ready" },
  "GET /api/v1/support/faqs": { screen: "Support – FAQ list", roles: "any (auth)", desc: "Active FAQs, optionally filtered by category.", query: "category?", res: "[ { id, question, answer, category } ]", status: "Ready" },
  "GET /api/v1/admin/support/faqs": { screen: "Admin – FAQs", roles: "ADMIN", desc: "All FAQs.", res: "[ Faq ]", status: "Ready" },
  "POST /api/v1/admin/support/faqs": { screen: "Admin – FAQs", roles: "ADMIN", desc: "Create a FAQ.", body: "JSON { question*, answer*, category?, order?, active? }", res: "Faq", status: "Ready" },
  "PATCH /api/v1/admin/support/faqs/{id}": { screen: "Admin – FAQs", roles: "ADMIN", desc: "Update a FAQ.", body: "JSON (any FAQ field)", res: "Faq", status: "Ready" },
  "DELETE /api/v1/admin/support/faqs/{id}": { screen: "Admin – FAQs", roles: "ADMIN", desc: "Delete a FAQ.", res: "{ success }", status: "Ready" },

  // CONTENT
  "GET /api/v1/content/banners": { screen: "Home – banner carousel", roles: "any (auth)", desc: "Active promo banners within their start/end window.", res: "[ { id, title, subtitle, imageUrl, ctaLabel, ctaUrl } ]", status: "Ready" },
  "GET /api/v1/content/gallery": { screen: "Home – gallery", roles: "any (auth)", desc: "Active gallery items.", res: "[ { id, caption, imageUrl } ]", status: "Ready" },
  "GET /api/v1/content/lenders": { screen: "Home – Partnered NBFCs", roles: "any (auth)", desc: "Active partner banks/NBFCs.", res: "[ { id, name, kind:BANK|NBFC, logoUrl, startingRate } ]", status: "Ready" },
  "GET /api/v1/content/lenders/search": { screen: "Nearby lenders", roles: "any (auth)", desc: "Partner branches near a pincode (exact match first, then same 3-digit region). Distance ordering is a TODO.", query: "pincode (6 digits, required)", res: "{ success, pincode, count, results:[ { lenderId, name, kind, logoUrl, startingRate, branch, address, city, state, pincode, phone, exactPincode } ] }", status: "Ready" },
  "POST /api/v1/admin/content/banners": { screen: "Admin – content", roles: "ADMIN", desc: "Create a banner. `imageRef` = key from POST /admin/assets.", body: "JSON { title*, subtitle?, imageRef*, ctaLabel?, ctaUrl?, order?, active? }", res: "Banner", status: "Ready" },
  "DELETE /api/v1/admin/content/banners/{id}": { screen: "Admin – content", roles: "ADMIN", desc: "Delete a banner.", res: "{ success }", status: "Ready" },
  "POST /api/v1/admin/content/gallery": { screen: "Admin – content", roles: "ADMIN", desc: "Create a gallery item.", body: "JSON { imageRef*, caption?, order?, active? }", res: "GalleryItem", status: "Ready" },
  "DELETE /api/v1/admin/content/gallery/{id}": { screen: "Admin – content", roles: "ADMIN", desc: "Delete a gallery item.", res: "{ success }", status: "Ready" },
  "POST /api/v1/admin/content/lenders": { screen: "Admin – content", roles: "ADMIN", desc: "Create a lender with branches.", body: "JSON { name*, kind?, logoRef?, startingRate?, branches:[ { label*, address?, city?, state?, pincode*, phone? } ], order?, active? }", res: "Lender", status: "Ready" },
  "DELETE /api/v1/admin/content/lenders/{id}": { screen: "Admin – content", roles: "ADMIN", desc: "Delete a lender.", res: "{ success }", status: "Ready" },

  // TOOLS
  "POST /api/v1/tools/emi": { screen: "Home – EMI calculator", roles: "—", desc: "Reducing-balance EMI. Pure calculation, no persistence.", body: "JSON { principal (₹, 1000–1e8), annualRate (%, 0–100), tenureMonths (1–480) }", res: "{ success, emi, principal, totalInterest, totalAmount, tenureMonths, annualRate }", status: "Ready" },

  // FILES
  "GET /api/v1/files/{key}": { screen: "any image/scan", roles: "any (auth)", desc: "Stream a stored file (KYC scan, photo, CMS image). `key` is the full path from a *Url field. Per-record scoping is a TODO.", res: "binary (image/pdf)", status: "Ready" },
  "POST /api/v1/admin/assets": { screen: "Admin – upload image", roles: "ADMIN", desc: "Upload a CMS image, get a key to reference in banner/gallery/lender.", body: "multipart/form-data — file: file", res: "{ success, key, url }", status: "Ready" },

  // EVENTS
  "GET /api/v1/events/stream": { screen: "realtime (SSE)", roles: "any (auth)", desc: "Server-Sent Events stream scoped to the caller. Events: stage.changed, application.rejected, message.created, document.updated. Powers 'reflect without refresh'.", res: "text/event-stream — data: { audience, type, applicationId, payload }", status: "Ready" },

  // HEALTH
  "GET /api/v1/health": { screen: "—", roles: "—", desc: "Liveness + DB state.", res: "{ success, status, db, uptime, timestamp }", status: "Ready" },

  // PARTNERS
  "GET /api/v1/partners/me": { screen: "Partner home", roles: "PARTNER", desc: "Own partner profile.", res: "{ ...partner }", status: "Ready" },
  "GET /api/v1/partners/me/referral-link": { screen: "Partner – share", roles: "PARTNER", desc: "Referral link for sharing.", status: "Not built (501)" },
  "GET /api/v1/partners": { screen: "Admin – partners", roles: "ADMIN", desc: "List all partners.", status: "Not built (501)" },
  "POST /api/v1/partners": { screen: "Admin – add partner", roles: "ADMIN", desc: "Onboard a partner (generates a partner code).", body: "JSON { name*, phone*, city? }", res: "{ ...partner, partnerCode }", status: "Ready" },

  // STAFF
  "GET /api/v1/staff/me": { screen: "Staff profile", roles: "STAFF, ADMIN", desc: "Own staff profile.", res: "{ ...staff }", status: "Ready" },
  "GET /api/v1/staff": { screen: "Admin – staff", roles: "ADMIN", desc: "List all staff with assigned-application counts.", status: "Not built (501)" },
  "POST /api/v1/staff": { screen: "Admin – add staff", roles: "ADMIN", desc: "Create a staff member.", body: "JSON { name*, email*, phone*, password* (min 8), staffRole* (LOAN_OFFICER|RELATIONSHIP_MANAGER|DOCUMENTATION_EXECUTIVE) }", res: "{ ...staff }", status: "Ready" },

  // COMMISSION
  "GET /api/v1/commission/me": { screen: "Partner – earnings", roles: "PARTNER", desc: "Partner's commission rows. Empty until applications reach Disbursed (calculation not built yet).", res: "[ Commission ]", status: "Partial" },

  // ADMIN / GST / REPORTS
  "GET /api/v1/admin/overview": { screen: "Admin dashboard", roles: "ADMIN", desc: "Pipeline counts per stage + in-progress total. Customer/staff/disbursed totals are a TODO.", res: "{ success, applicationsInProgress, pipeline:{ 1..7: count } }", status: "Partial" },
  "POST /api/v1/admin/applications/{id}/reassign": { screen: "Admin – reassign", roles: "ADMIN", desc: "Reassign an application to another staff member.", body: "JSON { toStaffId: Mongo id }", status: "Not built (501)" },
  "GET /api/v1/admin/gst/dashboard": { screen: "Admin – GST", roles: "ADMIN", desc: "Monthly GST ledger.", status: "Not built (501)" },
  "GET /api/v1/admin/reports/{type}": { screen: "Admin – reports", roles: "ADMIN", desc: "Report data by type.", status: "Not built (501)" },
  "GET /api/v1/admin/reports/{type}/export": { screen: "Admin – reports", roles: "ADMIN", desc: "Export a report.", query: "format=pdf|excel", status: "Not built (501)" },
  "GET /api/v1/admin/customers": { screen: "Admin – customers", roles: "ADMIN", desc: "List customers (first 100, newest first, present-shaped).", res: "[ profile ]", status: "Ready" },
};

const AREA_ORDER = ["auth", "customers", "catalogue", "applications", "documents", "messaging", "notifications", "support", "content", "tools", "files", "events", "health", "partners", "staff", "commission", "admin", "gst", "reports"];

const res = await fetch(SPEC_URL);
const spec = await res.json();

const rows = [];
for (const [path, ops] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(ops)) {
    const M = method.toUpperCase();
    const key = `${M} ${path}`;
    const meta = META[key] || {};
    const auth = (op.security || []).length ? "Bearer token" : "Public";
    const pathParams = (op.parameters || []).filter((p) => p.in === "path").map((p) => `{${p.name}}`).join(", ");
    const queryParams = meta.query || (op.parameters || []).filter((p) => p.in === "query").map((p) => p.name).join(", ");
    rows.push({
      area: (op.tags || ["?"])[0],
      screen: meta.screen ?? "",
      method: M,
      endpoint: path,
      auth,
      roles: meta.roles ?? "",
      desc: meta.desc ?? "",
      pathParams,
      queryParams,
      body: meta.body ?? "",
      res: meta.res ?? "",
      errors: meta.err ?? "",
      rl: meta.rl ?? "",
      status: meta.status ?? "Ready",
    });
  }
}
rows.sort((a, b) => {
  const ai = AREA_ORDER.indexOf(a.area), bi = AREA_ORDER.indexOf(b.area);
  return (ai - bi) || a.endpoint.localeCompare(b.endpoint) || a.method.localeCompare(b.method);
});

// ── workbook ──
const wb = new ExcelJS.Workbook();
wb.creator = "Fast Finance API";
wb.created = new Date();

const HEAD = "FF6C2C7A";
const headerStyle = {
  font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEAD } },
  alignment: { vertical: "middle", horizontal: "left", wrapText: true },
};

// Sheet 1 — Endpoints
const s1 = wb.addWorksheet("Endpoints", { views: [{ state: "frozen", ySplit: 1, xSplit: 0 }] });
const cols = [
  { header: "#", key: "n", width: 5 },
  { header: "Area", key: "area", width: 13 },
  { header: "Screen / Use", key: "screen", width: 26 },
  { header: "Method", key: "method", width: 8 },
  { header: "Endpoint (prefix /api/v1)", key: "endpoint", width: 44 },
  { header: "Auth", key: "auth", width: 12 },
  { header: "Role(s)", key: "roles", width: 20 },
  { header: "Description", key: "desc", width: 60 },
  { header: "Path params", key: "pathParams", width: 14 },
  { header: "Query params", key: "queryParams", width: 16 },
  { header: "Request body", key: "body", width: 55 },
  { header: "Success response", key: "res", width: 70 },
  { header: "Error codes", key: "errors", width: 30 },
  { header: "Rate limit", key: "rl", width: 10 },
  { header: "Status", key: "status", width: 15 },
];
s1.columns = cols;
s1.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
rows.forEach((r, i) => {
  const row = s1.addRow({ n: i + 1, ...r });
  row.alignment = { vertical: "top", wrapText: true };
  const st = r.status;
  const argb = st.startsWith("Ready") ? "FFE6F4EA" : st.startsWith("Partial") ? "FFFFF4E0" : st.startsWith("Disabled") ? "FFF0F0F0" : "FFFCE8E6";
  row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  if (r.auth === "Public") row.getCell("auth").font = { bold: true, color: { argb: "FF1A7F37" } };
});
s1.autoFilter = { from: "A1", to: "O1" };

// Sheet 2 — Read me / conventions
const s2 = wb.addWorksheet("Read me");
s2.columns = [{ width: 24 }, { width: 110 }];
const kv = (k, v) => { const r = s2.addRow([k, v]); r.getCell(1).font = { bold: true }; r.alignment = { vertical: "top", wrapText: true }; };
s2.addRow(["Fast Finance API — quick reference"]).getCell(1).font = { bold: true, size: 14 };
s2.addRow([]);
kv("Base URL (dev)", "http://localhost:4000/api/v1");
kv("Base URL (staging)", "https://<render-service>.onrender.com/api/v1   (deploys from the 'develop' branch)");
kv("Interactive docs", "<base>/docs   ·   OpenAPI JSON: <base>/docs-json");
kv("Auth header", "Authorization: Bearer <accessToken>   on every non-Public endpoint");
kv("Access token TTL", "15 min. Rotate with POST /auth/refresh (send the refreshToken). Reusing a rotated refresh token invalidates the whole chain — force a fresh login.");
kv("Login flow (customer)", "1) POST /auth/otp/request { mobile }  →  2) POST /auth/otp/verify { mobile, code }  →  tokens + profile.profileComplete.  If profileComplete=false, route to Create Profile (POST /me/profile) before anything else.");
kv("OTP in dev", "OTP_DEV_MODE=true — code is NOT sent; the response contains devCode (currently \"0000\"). 4 digits.");
kv("Success shape", "2xx bodies vary per endpoint (see the Endpoints sheet). Most wrap data as { success: true, ...} .");
kv("Error shape", "{ success: false, message: string, code: string, errors?: string[] }  with the matching HTTP status.");
kv("Common error codes", "VALIDATION_ERROR (400) · UNAUTHORIZED / OTP_INVALID / OTP_LOCKED / CREDENTIALS_INVALID / PARTNER_CODE_INVALID (401) · INSUFFICIENT_ROLE / FORBIDDEN (403) · NOT_FOUND (404) · RATE_LIMITED (429).");
kv("Rate limits", "Global 120 req / 60s per IP. OTP request 3/min, OTP verify & other auth 5/min.");
kv("File uploads", "multipart/form-data. Allowed: jpg, png, webp, heic, pdf. Max 10 MB each. Responses give absolute *Url fields — fetch them WITH the bearer token (they proxy through GET /files/*).");
kv("Realtime", "GET /events/stream (SSE, bearer). Re-fetch the affected resource on stage.changed / application.rejected / message.created.");
kv("Money", "Plain numbers in rupees. Indian digit-grouping is the client's job.");
kv("Application stages", "1 Application Submitted · 2 Credit Evaluation · 3 Loan Offer · 4 Additional Documents · 5 NACH, KYC & Agreement · 6 Final Review · 7 Disbursed. 'stage' is authoritative; 'isRejected' is a separate flag.");
kv("Status column", "Ready = usable now. Partial = works but returns limited data. Disabled = intentionally off (feature flag). Not built (501) = returns HTTP 501, do not integrate yet.");
kv("Not built yet", "Partner admin list & referral link, Staff admin list, Admin reassign, GST dashboard, Reports. Commission is calculated but never triggered yet.");
kv("Pagination", "Not implemented yet — list endpoints return up to a fixed cap (usually 100). Ask backend before building infinite scroll.");

// Sheet 3 — Enums
const s3 = wb.addWorksheet("Enums");
s3.columns = [{ header: "Enum", width: 26 }, { header: "Values", width: 90 }, { header: "Used in", width: 40 }];
s3.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
const en = (k, v, u) => { const r = s3.addRow([k, v, u]); r.alignment = { vertical: "top", wrapText: true }; };
en("Role", "CUSTOMER, PARTNER, STAFF, ADMIN", "token payload, route guards");
en("StaffRole", "LOAN_OFFICER, RELATIONSHIP_MANAGER, DOCUMENTATION_EXECUTIVE", "POST /staff, staff profile");
en("EmploymentCategory", "SALARIED_PRIVATE, SALARIED_GOVERNMENT, SALARIED_PSU, SALARIED_MNC, SELF_EMPLOYED_PROFESSIONAL, SELF_EMPLOYED_BUSINESS, PROPRIETORSHIP, PARTNERSHIP, PRIVATE_LIMITED, LLP", "Create/Edit Profile (PLACEHOLDER list — pending business confirmation)");
en("Application stage", "1..7 (integer). Labels: Application Submitted, Credit Evaluation, Loan Offer, Additional Documents, NACH KYC & Agreement, Final Review, Disbursed", "applications");
en("Application status bucket", "IN_PROGRESS, DISBURSED, REJECTED", "GET /applications list");
en("Tracker step status", "completed, current, pending", "GET /applications/{id} tracker[]");
en("DocumentType", "PAN, AADHAAR, SELFIE, ADDRESS, SALARY_SLIP, BANK_STATEMENT", "documents");
en("DocumentStatus", "PENDING, SUBMITTED, VERIFIED, REJECTED", "documents");
en("BankStatementMethod", "AA_OTP, MANUAL", "bank statement doc");
en("ProductKind", "LOAN, INSURANCE", "catalogue");
en("CommissionType", "PERCENTAGE, FLAT", "product / commission");
en("LenderKind", "BANK, NBFC", "content/lenders");
en("NotificationType", "WELCOME, STAGE_UPDATE, DOCUMENT_REQUEST, APPLICATION_REJECTED, GENERAL", "notifications");
en("MessageKind / sender", "kind: USER, SYSTEM ; sender: CUSTOMER, STAFF, SYSTEM", "messaging");
en("SSE event type", "stage.changed, application.rejected, message.created, document.updated, commission.calculated", "GET /events/stream");

const buf = await wb.xlsx.writeBuffer();
writeFileSync(OUT, Buffer.from(buf));
console.log(`wrote ${OUT} — ${rows.length} endpoints`);
