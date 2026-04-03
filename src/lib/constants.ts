import { getCurrentMonth, getToday } from "@/lib/date";
import type { CompensationBand, CompensationType } from "@/types/app";

export const APP_TITLE = "LeapSeed 給与計算サイト";
export const STORAGE_KEY = "leapseed-payroll-store";
export const STORE_VERSION = 1;

export const DEFAULT_DISPLAY_MONTH = getCurrentMonth();
export const DEFAULT_TODAY = getToday();

export const DEAL_PATTERN_OPTIONS = [
  { value: "AC", label: "AC" },
  { value: "ABC", label: "ABC" },
  { value: "AABC", label: "AABC" },
] as const;

export const ANALYSIS_RANGE_OPTIONS = [
  { value: "month", label: "単月" },
  { value: "quarter", label: "3か月" },
  { value: "halfyear", label: "半年" },
  { value: "year", label: "年間" },
] as const;

export const DEFAULT_COMPENSATION_TYPES: CompensationType[] = [
  {
    id: "AC",
    label: "AC",
    active: true,
    dealPattern: "AC",
    note: "Bのみで成約した案件",
  },
  {
    id: "ABC_A",
    label: "ABC_A",
    active: true,
    dealPattern: "ABC",
    note: "ABC案件のA側",
  },
  {
    id: "ABC_B",
    label: "ABC_B",
    active: true,
    dealPattern: "ABC",
    note: "ABC案件のB側",
  },
  {
    id: "AABC_A",
    label: "AABC_A",
    active: true,
    dealPattern: "AABC",
    note: "AABC案件のA側",
  },
  {
    id: "AABC_B",
    label: "AABC_B",
    active: true,
    dealPattern: "AABC",
    note: "AABC案件のB側",
  },
];

export const DEFAULT_COMPENSATION_BANDS: CompensationBand[] = [
  {
    id: "band_0",
    minSales: 0,
    rates: {
      AC: 0.4,
      ABC_A: 0.17,
      ABC_B: 0.24,
      AABC_A: 0.14,
      AABC_B: 0.18,
    },
  },
  {
    id: "band_100",
    minSales: 1_000_000,
    rates: {
      AC: 0.44,
      ABC_A: 0.2,
      ABC_B: 0.28,
      AABC_A: 0.15,
      AABC_B: 0.19,
    },
  },
  {
    id: "band_200",
    minSales: 2_000_000,
    rates: {
      AC: 0.47,
      ABC_A: 0.23,
      ABC_B: 0.32,
      AABC_A: 0.16,
      AABC_B: 0.2,
    },
  },
  {
    id: "band_300",
    minSales: 3_000_000,
    rates: {
      AC: 0.5,
      ABC_A: 0.25,
      ABC_B: 0.35,
      AABC_A: 0.17,
      AABC_B: 0.21,
    },
  },
  {
    id: "band_400",
    minSales: 4_000_000,
    rates: {
      AC: 0.52,
      ABC_A: 0.26,
      ABC_B: 0.36,
      AABC_A: 0.18,
      AABC_B: 0.22,
    },
  },
  {
    id: "band_500",
    minSales: 5_000_000,
    rates: {
      AC: 0.54,
      ABC_A: 0.27,
      ABC_B: 0.37,
      AABC_A: 0.19,
      AABC_B: 0.23,
    },
  },
  {
    id: "band_600",
    minSales: 6_000_000,
    rates: {
      AC: 0.56,
      ABC_A: 0.28,
      ABC_B: 0.38,
      AABC_A: 0.2,
      AABC_B: 0.24,
    },
  },
  {
    id: "band_800",
    minSales: 8_000_000,
    rates: {
      AC: 0.58,
      ABC_A: 0.29,
      ABC_B: 0.39,
      AABC_A: 0.21,
      AABC_B: 0.25,
    },
  },
  {
    id: "band_1000",
    minSales: 10_000_000,
    rates: {
      AC: 0.6,
      ABC_A: 0.3,
      ABC_B: 0.4,
      AABC_A: 0.22,
      AABC_B: 0.26,
    },
  },
];
