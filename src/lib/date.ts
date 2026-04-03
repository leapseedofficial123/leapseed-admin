import type { AnalysisRangeMode } from "@/types/app";

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

function parseMonth(month: string) {
  const [year, rawMonth] = month.split("-").map(Number);
  return {
    year,
    month: rawMonth || 1,
  };
}

function formatMonthText(month: string) {
  const parsed = parseMonth(month);
  return `${parsed.year}年${parsed.month}月`;
}

export function getMonthStartDate(month: string): string {
  return `${month}-01`;
}

export function getMonthEndDate(month: string): string {
  const parsed = parseMonth(month);
  const lastDay = new Date(parsed.year, parsed.month, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

export function getMonthFromDate(date: string): string {
  return date.slice(0, 7);
}

export function getRangeStartMonth(anchorMonth: string, mode: AnalysisRangeMode): string {
  if (mode === "month") {
    return anchorMonth;
  }

  const parsed = parseMonth(anchorMonth);

  if (mode === "quarter") {
    const startMonth = Math.floor((parsed.month - 1) / 3) * 3 + 1;
    return `${parsed.year}-${String(startMonth).padStart(2, "0")}`;
  }

  if (mode === "halfyear") {
    const startMonth = parsed.month <= 6 ? 1 : 7;
    return `${parsed.year}-${String(startMonth).padStart(2, "0")}`;
  }

  return `${parsed.year}-01`;
}

export function getRangeMonths(anchorMonth: string, mode: AnalysisRangeMode): string[] {
  const startMonth = getRangeStartMonth(anchorMonth, mode);

  if (mode === "month") {
    return [startMonth];
  }

  if (mode === "quarter") {
    return Array.from({ length: 3 }, (_, index) => shiftMonth(startMonth, index));
  }

  if (mode === "halfyear") {
    return Array.from({ length: 6 }, (_, index) => shiftMonth(startMonth, index));
  }

  return Array.from({ length: 12 }, (_, index) => shiftMonth(startMonth, index));
}

export function getRangeLabel(anchorMonth: string, mode: AnalysisRangeMode): string {
  const months = getRangeMonths(anchorMonth, mode);
  if (months.length === 1) {
    return formatMonthText(months[0]);
  }

  return `${formatMonthText(months[0])}〜${formatMonthText(months[months.length - 1])}`;
}

export function getMonthsBetween(startMonth: string, endMonth?: string): string[] {
  if (!startMonth && !endMonth) {
    return [];
  }

  const normalizedEndMonth = endMonth || startMonth;
  if (!startMonth) {
    return [normalizedEndMonth];
  }

  if (startMonth === normalizedEndMonth) {
    return [startMonth];
  }

  const left = startMonth <= normalizedEndMonth ? startMonth : normalizedEndMonth;
  const right = startMonth <= normalizedEndMonth ? normalizedEndMonth : startMonth;
  const months: string[] = [];
  let cursor = left;

  while (cursor <= right) {
    months.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }

  return months;
}

export function isMonthInRange(month: string, startMonth: string, endMonth?: string): boolean {
  if (month < startMonth) {
    return false;
  }

  if (endMonth && month > endMonth) {
    return false;
  }

  return true;
}
