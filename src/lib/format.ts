const currencyFormatter = new Intl.NumberFormat("ja-JP");
const monthFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
});
const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatCurrency(value: number): string {
  return `¥${currencyFormatter.format(Math.round(value || 0))}`;
}

export function formatNumber(value: number): string {
  return currencyFormatter.format(Math.round(value || 0));
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(value * 100 % 1 === 0 ? 0 : 1)}%`;
}

export function formatMonthLabel(value: string): string {
  if (!value) {
    return "-";
  }

  const [year, month] = value.split("-").map(Number);
  return monthFormatter.format(new Date(year, (month || 1) - 1, 1));
}

export function formatDateLabel(value: string): string {
  if (!value) {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

export function parseNumberInput(value: string): number {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toInputString(value: number): string {
  if (!value) {
    return "";
  }

  return String(value);
}

export function clampRate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(value, 1));
}

export function bandLabel(minSales: number): string {
  return `${formatNumber(minSales)}円以上`;
}
