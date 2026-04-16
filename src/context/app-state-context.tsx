"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getRangeMonths, getRangeStartMonth, sortMonths } from "@/lib/date";
import {
  buildCompanyTrend,
  buildMonthlyPayroll,
  getTrackedMonths,
} from "@/lib/domain/payroll";
import { createId } from "@/lib/ids";
import {
  FunctionApiError,
  fetchSharedStore as fetchSharedStoreRequest,
  saveSharedStore as saveSharedStoreRequest,
} from "@/lib/netlify-functions";
import {
  createBrowserRepository,
  normalizeStore,
} from "@/lib/repository/app-repository";
import type {
  AnalysisRangeMode,
  AppDataStore,
  CompensationBand,
  CompensationType,
  Deal,
  DealParticipant,
  Member,
  MemberExpense,
  MonthlyPayrollSnapshot,
  MonthlySetting,
  Product,
  ReferralRelationship,
  SalaryAdjustment,
  StatementAdjustment,
} from "@/types/app";
import { useAuth } from "@/context/auth-context";

interface DraftParticipant extends Omit<DealParticipant, "id" | "dealId"> {
  id?: string;
}

interface DealDraft extends Omit<Deal, "id"> {
  id?: string;
  participants: DraftParticipant[];
}

interface AppStateContextValue {
  store: AppDataStore;
  selectedMonth: string;
  analysisRangeMode: AnalysisRangeMode;
  trackedMonths: string[];
  analysisMonths: string[];
  currentSnapshot: MonthlyPayrollSnapshot;
  companyTrend: ReturnType<typeof buildCompanyTrend>;
  isStoreReady: boolean;
  isSyncing: boolean;
  syncError: string;
  setSelectedMonth: (month: string) => void;
  setAnalysisRangeMode: (mode: AnalysisRangeMode) => void;
  saveMember: (member: Member) => void;
  deleteMember: (memberId: string) => void;
  saveProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  saveDealWithParticipants: (deal: DealDraft) => void;
  deleteDeal: (dealId: string) => void;
  saveReferralRelationship: (relationship: ReferralRelationship) => void;
  deleteReferralRelationship: (relationshipId: string) => void;
  saveCompensationBand: (band: CompensationBand) => void;
  deleteCompensationBand: (bandId: string) => void;
  saveCompensationType: (type: CompensationType) => void;
  deleteCompensationType: (typeId: string) => void;
  saveMonthlySetting: (setting: MonthlySetting) => void;
  saveSalaryAdjustment: (adjustment: SalaryAdjustment) => void;
  deleteSalaryAdjustment: (adjustmentId: string) => void;
  saveMemberExpense: (expense: MemberExpense) => void;
  deleteMemberExpense: (expenseId: string) => void;
  saveStatementAdjustment: (adjustment: StatementAdjustment) => void;
  deleteStatementAdjustment: (adjustmentId: string) => void;
  exportJson: () => string;
  importJson: (raw: string) => void;
  resetData: (mode: "sample" | "blank") => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const existing = items.some((candidate) => candidate.id === item.id);

  if (!existing) {
    return [...items, item];
  }

  return items.map((candidate) => (candidate.id === item.id ? item : candidate));
}

function ensureMonthlySetting(store: AppDataStore): AppDataStore {
  if (store.monthlySettings.some((setting) => setting.month === store.preferences.displayMonth)) {
    return store;
  }

  return {
    ...store,
    monthlySettings: [
      ...store.monthlySettings,
      {
        month: store.preferences.displayMonth,
        expense: 0,
        note: "",
      },
    ],
  };
}

function normalizePreferenceMonth(store: AppDataStore): AppDataStore {
  const normalizedMonth = getRangeStartMonth(
    store.preferences.displayMonth,
    store.preferences.analysisRangeMode,
  );

  if (normalizedMonth === store.preferences.displayMonth) {
    return store;
  }

  return {
    ...store,
    preferences: {
      ...store.preferences,
      displayMonth: normalizedMonth,
    },
  };
}

function prepareStore(store: AppDataStore) {
  return ensureMonthlySetting(normalizePreferenceMonth(store));
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [repository] = useState(createBrowserRepository);
  const initialStore = useMemo(() => prepareStore(repository.load()), [repository]);
  const [store, setStore] = useState<AppDataStore>(initialStore);
  const [isRemoteLoaded, setIsRemoteLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const remoteSnapshotRef = useRef(JSON.stringify(initialStore));
  const { user, isReady: isAuthReady, refreshSession } = useAuth();

  useEffect(() => {
    repository.save(store);
  }, [repository, store]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user) {
      setIsRemoteLoaded(true);
      setIsSyncing(false);
      setSyncError("");
      return;
    }

    let cancelled = false;
    setIsRemoteLoaded(false);
    setSyncError("");

    void fetchSharedStoreRequest()
      .then((response) => {
        if (cancelled) {
          return;
        }

        const nextStore = prepareStore(normalizeStore(response.store));
        remoteSnapshotRef.current = JSON.stringify(nextStore);
        repository.save(nextStore);
        setStore(nextStore);
        setIsRemoteLoaded(true);
      })
      .catch(async (error) => {
        if (cancelled) {
          return;
        }

        if (error instanceof FunctionApiError && error.status === 401) {
          await refreshSession();
        }

        setSyncError(error instanceof Error ? error.message : "共有データを読み込めませんでした。");
        setIsRemoteLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, refreshSession, repository, user]);

  useEffect(() => {
    if (!user || !isRemoteLoaded) {
      return;
    }

    const serializedStore = JSON.stringify(store);
    if (serializedStore === remoteSnapshotRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsSyncing(true);

        try {
          await saveSharedStoreRequest(store);
          remoteSnapshotRef.current = serializedStore;
          setSyncError("");
        } catch (error) {
          if (error instanceof FunctionApiError && error.status === 401) {
            await refreshSession();
          }

          setSyncError(error instanceof Error ? error.message : "共有データを保存できませんでした。");
        } finally {
          setIsSyncing(false);
        }
      })();
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isRemoteLoaded, refreshSession, store, user]);

  const selectedMonth = store.preferences.displayMonth;
  const currentSnapshot = buildMonthlyPayroll(store, selectedMonth);
  const companyTrend = buildCompanyTrend(store);
  const trackedMonths = getTrackedMonths(store);
  const analysisRangeMode = store.preferences.analysisRangeMode;
  const analysisMonths = sortMonths(getRangeMonths(selectedMonth, analysisRangeMode));
  const isStoreReady = !user || isRemoteLoaded;

  const value: AppStateContextValue = {
    store,
    selectedMonth,
    analysisRangeMode,
    trackedMonths,
    analysisMonths,
    currentSnapshot,
    companyTrend,
    isStoreReady,
    isSyncing,
    syncError,
    setSelectedMonth(month) {
      setStore((current) =>
        prepareStore({
          ...current,
          preferences: {
            ...current.preferences,
            displayMonth: getRangeStartMonth(month, current.preferences.analysisRangeMode),
          },
        }),
      );
    },
    setAnalysisRangeMode(mode) {
      setStore((current) =>
        prepareStore({
          ...current,
          preferences: {
            ...current.preferences,
            displayMonth: getRangeStartMonth(current.preferences.displayMonth, mode),
            analysisRangeMode: mode,
          },
        }),
      );
    },
    saveMember(member) {
      setStore((current) => ({
        ...current,
        members: upsertById(current.members, member).sort(
          (left, right) => left.displayOrder - right.displayOrder,
        ),
      }));
    },
    deleteMember(memberId) {
      setStore((current) => ({
        ...current,
        members: current.members.filter((member) => member.id !== memberId),
        dealParticipants: current.dealParticipants.filter(
          (participant) => participant.memberId !== memberId,
        ),
        referralRelationships: current.referralRelationships.filter(
          (relationship) =>
            relationship.introducerMemberId !== memberId &&
            relationship.referredMemberId !== memberId,
        ),
        salaryAdjustments: current.salaryAdjustments.filter(
          (adjustment) => adjustment.memberId !== memberId,
        ),
        memberExpenses: current.memberExpenses.filter(
          (expense) => expense.memberId !== memberId,
        ),
        statementAdjustments: current.statementAdjustments.filter(
          (adjustment) => adjustment.memberId !== memberId,
        ),
      }));
    },
    saveProduct(product) {
      setStore((current) => ({
        ...current,
        products: upsertById(current.products, product),
      }));
    },
    deleteProduct(productId) {
      setStore((current) => {
        const keptDeals = current.deals.filter((deal) => deal.productId !== productId);
        const keptDealIds = new Set(keptDeals.map((deal) => deal.id));

        return {
          ...current,
          products: current.products.filter((product) => product.id !== productId),
          deals: keptDeals,
          dealParticipants: current.dealParticipants.filter((participant) =>
            keptDealIds.has(participant.dealId),
          ),
        };
      });
    },
    saveDealWithParticipants(dealDraft) {
      const dealId = dealDraft.id || createId("deal");
      const nextDeal: Deal = {
        id: dealId,
        closedOn: dealDraft.closedOn,
        targetMonth: dealDraft.targetMonth,
        productId: dealDraft.productId,
        salePrice: dealDraft.salePrice,
        companyShare: dealDraft.companyShare,
        companyShareMode: dealDraft.companyShareMode,
        countForCompanyRevenue: dealDraft.countForCompanyRevenue,
        pattern: dealDraft.pattern,
        note: dealDraft.note,
      };

      const participants: DealParticipant[] = dealDraft.participants.map((participant) => ({
        id: participant.id || createId("participant"),
        dealId,
        memberId: participant.memberId,
        compensationTypeId: participant.compensationTypeId,
        note: participant.note,
      }));

      setStore((current) => ({
        ...current,
        deals: upsertById(current.deals, nextDeal).sort((left, right) =>
          right.closedOn.localeCompare(left.closedOn),
        ),
        dealParticipants: [
          ...current.dealParticipants.filter((participant) => participant.dealId !== dealId),
          ...participants,
        ],
      }));
    },
    deleteDeal(dealId) {
      setStore((current) => ({
        ...current,
        deals: current.deals.filter((deal) => deal.id !== dealId),
        dealParticipants: current.dealParticipants.filter(
          (participant) => participant.dealId !== dealId,
        ),
      }));
    },
    saveReferralRelationship(relationship) {
      setStore((current) => ({
        ...current,
        referralRelationships: upsertById(current.referralRelationships, relationship),
      }));
    },
    deleteReferralRelationship(relationshipId) {
      setStore((current) => ({
        ...current,
        referralRelationships: current.referralRelationships.filter(
          (relationship) => relationship.id !== relationshipId,
        ),
      }));
    },
    saveCompensationBand(band) {
      setStore((current) => ({
        ...current,
        compensationBands: upsertById(current.compensationBands, band).sort(
          (left, right) => left.minSales - right.minSales,
        ),
      }));
    },
    deleteCompensationBand(bandId) {
      setStore((current) => ({
        ...current,
        compensationBands: current.compensationBands.filter((band) => band.id !== bandId),
      }));
    },
    saveCompensationType(type) {
      setStore((current) => ({
        ...current,
        compensationTypes: upsertById(current.compensationTypes, type),
      }));
    },
    deleteCompensationType(typeId) {
      setStore((current) => ({
        ...current,
        compensationTypes: current.compensationTypes.filter((type) => type.id !== typeId),
        dealParticipants: current.dealParticipants.filter(
          (participant) => participant.compensationTypeId !== typeId,
        ),
        compensationBands: current.compensationBands.map((band) => {
          const nextRates = { ...band.rates };
          delete nextRates[typeId];

          return {
            ...band,
            rates: nextRates,
          };
        }),
      }));
    },
    saveMonthlySetting(setting) {
      setStore((current) => {
        const exists = current.monthlySettings.some((item) => item.month === setting.month);

        return {
          ...current,
          monthlySettings: exists
            ? current.monthlySettings.map((item) =>
                item.month === setting.month ? setting : item,
              )
            : [...current.monthlySettings, setting],
        };
      });
    },
    saveSalaryAdjustment(adjustment) {
      setStore((current) => ({
        ...current,
        salaryAdjustments: upsertById(current.salaryAdjustments, adjustment),
      }));
    },
    deleteSalaryAdjustment(adjustmentId) {
      setStore((current) => ({
        ...current,
        salaryAdjustments: current.salaryAdjustments.filter(
          (adjustment) => adjustment.id !== adjustmentId,
        ),
      }));
    },
    saveMemberExpense(expense) {
      setStore((current) => ({
        ...current,
        memberExpenses: upsertById(current.memberExpenses, expense),
      }));
    },
    deleteMemberExpense(expenseId) {
      setStore((current) => ({
        ...current,
        memberExpenses: current.memberExpenses.filter((expense) => expense.id !== expenseId),
      }));
    },
    saveStatementAdjustment(adjustment) {
      setStore((current) => ({
        ...current,
        statementAdjustments: upsertById(current.statementAdjustments, adjustment),
      }));
    },
    deleteStatementAdjustment(adjustmentId) {
      setStore((current) => ({
        ...current,
        statementAdjustments: current.statementAdjustments.filter(
          (adjustment) => adjustment.id !== adjustmentId,
        ),
      }));
    },
    exportJson() {
      return repository.export(store);
    },
    importJson(raw) {
      const nextStore = prepareStore(repository.import(raw));
      setStore(nextStore);
    },
    resetData(mode) {
      const nextStore = prepareStore(repository.reset(mode));
      setStore(nextStore);
    },
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider.");
  }

  return context;
}
