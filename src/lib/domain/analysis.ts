import { isMonthInRange } from "@/lib/date";
import { buildMonthlyPayroll, getTrackedMonths } from "@/lib/domain/payroll";
import type {
  AppDataStore,
  MonthlyPayrollSnapshot,
  ProductSummary,
} from "@/types/app";

export interface AnalysisFilters {
  startMonth: string;
  endMonth: string;
  productId: string;
  memberId: string;
  pattern: string;
  companyRevenueMode: "all" | "counted" | "excluded";
}

export interface AnalysisDealRow {
  month: string;
  dealId: string;
  closedOn: string;
  productId: string;
  productName: string;
  pattern: string;
  salePrice: number;
  companyShare: number;
  companyShareMode: "auto" | "manual";
  countForCompanyRevenue: boolean;
  participantNames: string[];
  compensationTypeLabels: string[];
  participantRewardTotal: number;
  participantRewardBreakdown: string[];
  note: string;
}

export interface AnalysisMonthlyPoint {
  month: string;
  dealCount: number;
  totalSales: number;
  totalCompanyShare: number;
  totalParticipantReward: number;
}

export interface AnalysisMemberSummary {
  memberId: string;
  memberName: string;
  dealCount: number;
  involvedSales: number;
  rewardTotal: number;
}

export interface MemberMonthlyHistoryRow {
  month: string;
  year: string;
  dealCount: number;
  monthlySales: number;
  projectReward: number;
  referralReward: number;
  executiveReward: number;
  adjustment: number;
  personalExpense: number;
  finalSalary: number;
}

export interface MemberYearlyHistoryRow {
  year: string;
  dealCount: number;
  monthlySales: number;
  projectReward: number;
  referralReward: number;
  executiveReward: number;
  adjustment: number;
  personalExpense: number;
  finalSalary: number;
}

export interface MemberHistoryResult {
  memberId: string;
  monthlyRows: MemberMonthlyHistoryRow[];
  yearlyRows: MemberYearlyHistoryRow[];
}

export type AnalysisProductSummary = ProductSummary;

export interface CompanyAnalysisResult {
  filters: AnalysisFilters;
  months: string[];
  filteredDeals: AnalysisDealRow[];
  monthlyPoints: AnalysisMonthlyPoint[];
  memberSummaries: AnalysisMemberSummary[];
  productSummaries: AnalysisProductSummary[];
  snapshotsByMonth: Record<string, MonthlyPayrollSnapshot>;
  totals: {
    monthCount: number;
    dealCount: number;
    totalSales: number;
    totalCompanyShare: number;
    totalParticipantReward: number;
  };
}

function normalizeMonthRange(startMonth: string, endMonth: string) {
  if (!startMonth && !endMonth) {
    return { startMonth: "", endMonth: "" };
  }

  if (!startMonth) {
    return { startMonth: endMonth, endMonth };
  }

  if (!endMonth) {
    return { startMonth, endMonth: startMonth };
  }

  if (startMonth <= endMonth) {
    return { startMonth, endMonth };
  }

  return { startMonth: endMonth, endMonth: startMonth };
}

function roundMoney(value: number) {
  return Math.round(value || 0);
}

export function createDefaultAnalysisFilters(
  trackedMonths: string[],
  fallbackMonth: string,
): AnalysisFilters {
  const startMonth = trackedMonths[0] ?? fallbackMonth;
  const endMonth = trackedMonths[trackedMonths.length - 1] ?? fallbackMonth;

  return {
    startMonth,
    endMonth,
    productId: "",
    memberId: "",
    pattern: "",
    companyRevenueMode: "all",
  };
}

export function buildCompanyAnalysis(
  store: AppDataStore,
  filters: AnalysisFilters,
): CompanyAnalysisResult {
  const normalizedRange = normalizeMonthRange(filters.startMonth, filters.endMonth);
  const months = getTrackedMonths(store).filter((month) =>
    isMonthInRange(month, normalizedRange.startMonth, normalizedRange.endMonth),
  );
  const snapshotsByMonth = Object.fromEntries(
    months.map((month) => [month, buildMonthlyPayroll(store, month)]),
  );
  const membersById = Object.fromEntries(store.members.map((member) => [member.id, member]));
  const productsById = Object.fromEntries(
    store.products.map((product) => [product.id, product]),
  );
  const compensationTypesById = Object.fromEntries(
    store.compensationTypes.map((type) => [type.id, type]),
  );
  const participantsByDealId = store.dealParticipants.reduce<
    Record<string, AppDataStore["dealParticipants"]>
  >((accumulator, participant) => {
    if (!accumulator[participant.dealId]) {
      accumulator[participant.dealId] = [];
    }

    accumulator[participant.dealId].push(participant);
    return accumulator;
  }, {});
  const rewardByParticipantId = Object.values(snapshotsByMonth).reduce<
    Record<
      string,
      {
        memberId: string;
        memberName: string;
        reward: number;
      }
    >
  >((accumulator, snapshot) => {
    for (const memberSummary of snapshot.memberSummaries) {
      for (const detail of memberSummary.dealDetails) {
        accumulator[detail.participantId] = {
          memberId: memberSummary.memberId,
          memberName: memberSummary.memberName,
          reward: detail.reward,
        };
      }
    }

    return accumulator;
  }, {});
  const monthlyPointMap: Record<string, AnalysisMonthlyPoint> = {};
  const memberAccumulator: Record<
    string,
    {
      memberId: string;
      memberName: string;
      dealIds: Set<string>;
      involvedSales: number;
      rewardTotal: number;
    }
  > = {};
  const productAccumulator: Record<string, AnalysisProductSummary> = {};
  const filteredDeals: AnalysisDealRow[] = [];

  for (const month of months) {
    monthlyPointMap[month] = {
      month,
      dealCount: 0,
      totalSales: 0,
      totalCompanyShare: 0,
      totalParticipantReward: 0,
    };
  }

  for (const deal of store.deals) {
    if (!months.includes(deal.targetMonth)) {
      continue;
    }

    if (filters.productId && deal.productId !== filters.productId) {
      continue;
    }

    if (filters.pattern && deal.pattern !== filters.pattern) {
      continue;
    }

    if (filters.companyRevenueMode === "counted" && !deal.countForCompanyRevenue) {
      continue;
    }

    if (filters.companyRevenueMode === "excluded" && deal.countForCompanyRevenue) {
      continue;
    }

    const participants = participantsByDealId[deal.id] ?? [];

    if (
      filters.memberId &&
      !participants.some((participant) => participant.memberId === filters.memberId)
    ) {
      continue;
    }

    const analysisParticipants = filters.memberId
      ? participants.filter((participant) => participant.memberId === filters.memberId)
      : participants;
    const product = productsById[deal.productId];
    const participantNames = participants.map(
      (participant) => membersById[participant.memberId]?.name ?? "不明なメンバー",
    );
    const compensationTypeLabels = participants.map(
      (participant) =>
        compensationTypesById[participant.compensationTypeId]?.label ??
        participant.compensationTypeId,
    );
    const participantRewardBreakdown = analysisParticipants.map((participant) => {
      const rewardSummary = rewardByParticipantId[participant.id];
      const memberName =
        rewardSummary?.memberName ?? membersById[participant.memberId]?.name ?? "不明";
      const reward = rewardSummary?.reward ?? 0;

      return `${memberName}: ${reward}`;
    });
    const participantRewardTotal = roundMoney(
      analysisParticipants.reduce(
        (sum, participant) => sum + (rewardByParticipantId[participant.id]?.reward ?? 0),
        0,
      ),
    );

    filteredDeals.push({
      month: deal.targetMonth,
      dealId: deal.id,
      closedOn: deal.closedOn,
      productId: deal.productId,
      productName: product?.name ?? "未設定の商品",
      pattern: deal.pattern,
      salePrice: roundMoney(deal.salePrice),
      companyShare: roundMoney(deal.companyShare),
      companyShareMode: deal.companyShareMode,
      countForCompanyRevenue: deal.countForCompanyRevenue,
      participantNames,
      compensationTypeLabels,
      participantRewardTotal,
      participantRewardBreakdown,
      note: deal.note,
    });

    monthlyPointMap[deal.targetMonth].dealCount += 1;
    monthlyPointMap[deal.targetMonth].totalSales += roundMoney(deal.salePrice);
    monthlyPointMap[deal.targetMonth].totalCompanyShare += roundMoney(deal.companyShare);
    monthlyPointMap[deal.targetMonth].totalParticipantReward += participantRewardTotal;

    if (!productAccumulator[deal.productId]) {
      productAccumulator[deal.productId] = {
        productId: deal.productId,
        productName: product?.name ?? "未設定の商品",
        dealCount: 0,
        totalSales: 0,
        totalCompanyShare: 0,
      };
    }

    productAccumulator[deal.productId].dealCount += 1;
    productAccumulator[deal.productId].totalSales += roundMoney(deal.salePrice);
    productAccumulator[deal.productId].totalCompanyShare += roundMoney(deal.companyShare);

    for (const participant of analysisParticipants) {
      if (!memberAccumulator[participant.memberId]) {
        memberAccumulator[participant.memberId] = {
          memberId: participant.memberId,
          memberName: membersById[participant.memberId]?.name ?? "不明なメンバー",
          dealIds: new Set<string>(),
          involvedSales: 0,
          rewardTotal: 0,
        };
      }

      memberAccumulator[participant.memberId].dealIds.add(deal.id);
      memberAccumulator[participant.memberId].involvedSales += roundMoney(deal.salePrice);
      memberAccumulator[participant.memberId].rewardTotal +=
        rewardByParticipantId[participant.id]?.reward ?? 0;
    }
  }

  const monthlyPoints = months.map((month) => ({
    month,
    dealCount: monthlyPointMap[month]?.dealCount ?? 0,
    totalSales: roundMoney(monthlyPointMap[month]?.totalSales ?? 0),
    totalCompanyShare: roundMoney(monthlyPointMap[month]?.totalCompanyShare ?? 0),
    totalParticipantReward: roundMoney(
      monthlyPointMap[month]?.totalParticipantReward ?? 0,
    ),
  }));
  const memberSummaries = Object.values(memberAccumulator)
    .map((summary) => ({
      memberId: summary.memberId,
      memberName: summary.memberName,
      dealCount: summary.dealIds.size,
      involvedSales: roundMoney(summary.involvedSales),
      rewardTotal: roundMoney(summary.rewardTotal),
    }))
    .sort((left, right) => right.rewardTotal - left.rewardTotal);
  const productSummaries = Object.values(productAccumulator)
    .map((summary) => ({
      ...summary,
      totalSales: roundMoney(summary.totalSales),
      totalCompanyShare: roundMoney(summary.totalCompanyShare),
    }))
    .sort((left, right) => right.totalSales - left.totalSales);
  const totals = {
    monthCount: months.length,
    dealCount: filteredDeals.length,
    totalSales: roundMoney(monthlyPoints.reduce((sum, point) => sum + point.totalSales, 0)),
    totalCompanyShare: roundMoney(
      monthlyPoints.reduce((sum, point) => sum + point.totalCompanyShare, 0),
    ),
    totalParticipantReward: roundMoney(
      monthlyPoints.reduce((sum, point) => sum + point.totalParticipantReward, 0),
    ),
  };

  return {
    filters: {
      ...filters,
      startMonth: normalizedRange.startMonth,
      endMonth: normalizedRange.endMonth,
    },
    months,
    filteredDeals: filteredDeals.sort((left, right) =>
      `${right.month}_${right.closedOn}`.localeCompare(`${left.month}_${left.closedOn}`),
    ),
    monthlyPoints,
    memberSummaries,
    productSummaries,
    snapshotsByMonth,
    totals,
  };
}

export function buildMemberHistory(
  store: AppDataStore,
  memberId: string,
): MemberHistoryResult {
  const monthlyRows = getTrackedMonths(store)
    .map((month) => {
      const snapshot = buildMonthlyPayroll(store, month);
      const summary = snapshot.memberSummaries.find((item) => item.memberId === memberId);

      if (!summary) {
        return null;
      }

      return {
        month,
        year: month.slice(0, 4),
        dealCount: summary.dealDetails.length,
        monthlySales: summary.monthlySales,
        projectReward: summary.projectReward,
        referralReward: summary.referralReward,
        executiveReward: summary.executiveReward,
        adjustment: summary.adjustment,
        personalExpense: summary.personalExpense,
        finalSalary: summary.finalSalary,
      };
    })
    .filter((row): row is MemberMonthlyHistoryRow => Boolean(row))
    .sort((left, right) => right.month.localeCompare(left.month));

  const yearlyMap = monthlyRows.reduce<Record<string, MemberYearlyHistoryRow>>((accumulator, row) => {
    if (!accumulator[row.year]) {
      accumulator[row.year] = {
        year: row.year,
        dealCount: 0,
        monthlySales: 0,
        projectReward: 0,
        referralReward: 0,
        executiveReward: 0,
        adjustment: 0,
        personalExpense: 0,
        finalSalary: 0,
      };
    }

    accumulator[row.year].dealCount += row.dealCount;
    accumulator[row.year].monthlySales += row.monthlySales;
    accumulator[row.year].projectReward += row.projectReward;
    accumulator[row.year].referralReward += row.referralReward;
    accumulator[row.year].executiveReward += row.executiveReward;
    accumulator[row.year].adjustment += row.adjustment;
    accumulator[row.year].personalExpense += row.personalExpense;
    accumulator[row.year].finalSalary += row.finalSalary;

    return accumulator;
  }, {});

  return {
    memberId,
    monthlyRows,
    yearlyRows: Object.values(yearlyMap).sort((left, right) => right.year.localeCompare(left.year)),
  };
}
