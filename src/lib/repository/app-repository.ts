import { STORAGE_KEY, STORE_VERSION } from "@/lib/constants";
import { createBlankAppDataStore } from "@/lib/data/blank-state";
import { createSampleAppDataStore } from "@/lib/data/sample-data";
import { getCurrentMonth } from "@/lib/date";
import type {
  AppDataStore,
  CompensationBand,
  CompensationType,
  Deal,
  DealParticipant,
  MonthlyExecutiveAssignment,
  Member,
  MemberExpense,
  MonthlySetting,
  Product,
  ReferralRelationship,
  SalaryAdjustment,
  StatementAdjustment,
} from "@/types/app";

export interface AppRepository {
  load(): AppDataStore;
  save(store: AppDataStore): void;
  export(store: AppDataStore): string;
  import(raw: string): AppDataStore;
  reset(mode: "sample" | "blank"): AppDataStore;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function migrateStore(store: AppDataStore, version: number): AppDataStore {
  let nextStore = { ...store };

  if (version < 2) {
    nextStore = {
      ...nextStore,
      products: nextStore.products ?? [],
      deals: nextStore.deals ?? [],
      dealParticipants: nextStore.dealParticipants ?? [],
    };
  }

  if (version < 3) {
    nextStore = {
      ...nextStore,
      monthlySettings: nextStore.monthlySettings.map((setting) => ({
        ...setting,
        executiveRewardMode: "fixed",
      })),
      monthlyExecutiveAssignments: [],
    };
  }

  return {
    ...nextStore,
    version: STORE_VERSION,
  };
}

export function normalizeStore(raw: unknown): AppDataStore {
  const fallback = createBlankAppDataStore(getCurrentMonth());

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const candidate = raw as Partial<AppDataStore>;

  const normalized: AppDataStore = {
    ...fallback,
    version: typeof candidate.version === "number" ? candidate.version : fallback.version,
    members: asArray<Member>(candidate.members),
    products: asArray<Product>(candidate.products),
    deals: asArray<Deal>(candidate.deals),
    dealParticipants: asArray<DealParticipant>(candidate.dealParticipants),
    compensationTypes: asArray<CompensationType>(candidate.compensationTypes).length
      ? asArray<CompensationType>(candidate.compensationTypes)
      : fallback.compensationTypes,
    referralRelationships: asArray<ReferralRelationship>(
      candidate.referralRelationships,
    ),
    compensationBands: asArray<CompensationBand>(candidate.compensationBands).length
      ? asArray<CompensationBand>(candidate.compensationBands)
      : fallback.compensationBands,
    monthlySettings: asArray<MonthlySetting>(candidate.monthlySettings).length
      ? asArray<MonthlySetting>(candidate.monthlySettings).map((setting) => ({
          ...setting,
          executiveRewardMode: setting.executiveRewardMode ?? "fixed",
        }))
      : fallback.monthlySettings,
    monthlyExecutiveAssignments: asArray<MonthlyExecutiveAssignment>(
      candidate.monthlyExecutiveAssignments,
    ).map((assignment) => ({
      ...assignment,
      enabled: assignment.enabled ?? true,
    })),
    salaryAdjustments: asArray<SalaryAdjustment>(candidate.salaryAdjustments),
    memberExpenses: asArray<MemberExpense>(candidate.memberExpenses),
    statementAdjustments: asArray<StatementAdjustment>(candidate.statementAdjustments),
    preferences: {
      displayMonth:
        candidate.preferences?.displayMonth || fallback.preferences.displayMonth,
      analysisRangeMode:
        candidate.preferences?.analysisRangeMode || fallback.preferences.analysisRangeMode,
    },
  };

  return migrateStore(normalized, normalized.version);
}

export function createBrowserRepository(): AppRepository {
  return {
    load() {
      if (typeof window === "undefined") {
        return createBlankAppDataStore(getCurrentMonth());
      }

      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = createBlankAppDataStore(getCurrentMonth());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }

      try {
        return normalizeStore(JSON.parse(raw));
      } catch {
        return createBlankAppDataStore(getCurrentMonth());
      }
    },
    save(store) {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    },
    export(store) {
      return JSON.stringify(store, null, 2);
    },
    import(raw) {
      return normalizeStore(JSON.parse(raw));
    },
    reset(mode) {
      return mode === "blank"
        ? createBlankAppDataStore(getCurrentMonth())
        : createSampleAppDataStore();
    },
  };
}
