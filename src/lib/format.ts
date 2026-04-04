const numberFormatter = new Intl.NumberFormat("ja-JP");
const monthFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
});
const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export function formatCurrency(value: number): string {
  return `¥${numberFormatter.format(Math.round(value || 0))}`;
}

export function formatSignedCurrency(value: number): string {
  const normalized = Math.round(value || 0);
  if (normalized > 0) {
    return `+${formatCurrency(normalized)}`;
  }

  if (normalized < 0) {
    return `-${formatCurrency(Math.abs(normalized))}`;
  }

  return formatCurrency(0);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value || 0));
}

export function formatPercent(value: number): string {
  const percent = value * 100;
  return `${percent.toFixed(percent % 1 === 0 ? 0 : 1)}%`;
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

  const normalized = value.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toInputString(value: number): string {
  if (!value) {
    return "";
  }

  return String(value);
}

function trimDecimalString(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function toPercentInputString(value: number): string {
  if (!value) {
    return "";
  }

  return trimDecimalString(value * 100);
}

export function clampRate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(value, 1));
}

export function parsePercentInput(value: string): number {
  return clampRate(parseNumberInput(value) / 100);
}

export function bandLabel(minSales: number): string {
  return `${formatNumber(minSales)}円以上`;
}
