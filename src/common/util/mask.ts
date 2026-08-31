/**
 * Value masking for anything shown in the UI that should not carry the full
 * secret — Aadhaar, PAN, bank account, mobile (NFR-03, PRD §8, FR-CUS-23).
 * The full value stays encrypted at rest; these helpers produce the display
 * string returned by read endpoints.
 */

/** `XXXXXXXX1234` — last 4 digits of a 12-digit Aadhaar. */
export function maskAadhaar(value?: string | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "XXXX";
  return `XXXXXXXX${digits.slice(-4)}`;
}

/** `ABCXXXXX1F` — first 3 + last 2 of a 10-char PAN. */
export function maskPan(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.toUpperCase().trim();
  if (v.length < 5) return "XXXXXXXXXX";
  return `${v.slice(0, 3)}XXXXX${v.slice(-2)}`;
}

/** `XXXXXX7890` — last 4 digits of a bank account number. */
export function maskAccountNumber(value?: string | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "XXXX";
  return `${"X".repeat(Math.max(2, digits.length - 4))}${digits.slice(-4)}`;
}

/** `98765 43210` -> `XXXXXX3210`. */
export function maskMobile(value?: string | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return undefined;
  return `XXXXXX${digits.slice(-4)}`;
}
