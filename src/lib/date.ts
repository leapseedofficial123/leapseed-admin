export function getCurrentMonth(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getToday(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sortMonths(months: string[]): string[] {
  return [...months].sort((left, right) => left.localeCompare(right));
}

export function shiftMonth(month: string, offset: number): string {
  const [year, rawMonth] = month.split("-").map(Number);
  const date = new Date(year, (rawMonth || 1) - 1 + offset, 1);
  return getCurrentMonth(date);
}

export function getRangeMonths(
  anchorMonth: string,
  mode: "month" | "quarter" | "year",
): string[] {
  if (mode === "month") {
    return [anchorMonth];
  }

  if (mode === "quarter") {
    return [shiftMonth(anchorMonth, -2), shiftMonth(anchorMonth, -1), anchorMonth];
  }

  const [year] = anchorMonth.split("-");
  return Array.from(
    { length: 12 },
    (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`,
  );
}

export function getRangeLabel(
  anchorMonth: string,
  mode: "month" | "quarter" | "year",
): string {
  if (mode === "month") {
    return `${anchorMonth} の単月表示`;
  }

  if (mode === "quarter") {
    return `${shiftMonth(anchorMonth, -2)} 〜 ${anchorMonth}`;
  }

  return `${anchorMonth.slice(0, 4)} 年`;
}

export function isMonthInRange(
  month: string,
  startMonth: string,
  endMonth?: string,
): boolean {
  if (month < startMonth) {
    return false;
  }

  if (endMonth && month > endMonth) {
    return false;
  }

  return true;
}
