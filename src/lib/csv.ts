export type CsvRow = Record<string, string | number | boolean | null | undefined>;

function escapeCell(value: CsvRow[string]): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  const escaped = text.replace(/"/g, '""');

  if (/[",\r\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

export function stringifyCsv(rows: CsvRow[]): string {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ];

  return lines.join("\r\n");
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  if (!rows.length) {
    return;
  }

  const csv = `\uFEFF${stringifyCsv(rows)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
