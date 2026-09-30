/**
 * Minimal RFC 4180 CSV encoder for the admin panel's export endpoints.
 * exceljs (already a dependency, used by scripts/gen-api-xlsx.mjs) is
 * overkill here — the spec asks for a plain CSV file, not a workbook.
 */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s =
    value instanceof Date ? value.toISOString() : String(value as unknown);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** `columns` maps the header label to a getter run against each row. */
export function toCsv<T>(
  rows: T[],
  columns: Array<{ header: string; value: (row: T) => unknown }>,
): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(","),
  );
  return [head, ...body].join("\r\n");
}
