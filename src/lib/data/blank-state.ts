import {
  DEFAULT_COMPENSATION_BANDS,
  DEFAULT_COMPENSATION_TYPES,
  STORE_VERSION,
} from "@/lib/constants";
import { getCurrentMonth } from "@/lib/date";
import type { AppDataStore } from "@/types/app";

export function createBlankAppDataStore(
  displayMonth = getCurrentMonth(),
): AppDataStore {
  return {
    version: STORE_VERSION,
    members: [],
    products: [],
    deals: [],
    dealParticipants: [],
    compensationTypes: DEFAULT_COMPENSATION_TYPES,
    referralRelationships: [],
    compensationBands: DEFAULT_COMPENSATION_BANDS,
    monthlySettings: [
      {
        month: displayMonth,
        expense: 0,
        note: "",
      },
    ],
    salaryAdjustments: [],
    memberExpenses: [],
    statementAdjustments: [],
    preferences: {
      displayMonth,
      analysisRangeMode: "month",
    },
  };
}
