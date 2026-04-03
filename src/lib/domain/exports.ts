import { isMonthInRange } from "@/lib/date";
import {
  type CompanyAnalysisResult,
} from "@/lib/domain/analysis";
import { buildMonthlyPayroll, getTrackedMonths } from "@/lib/domain/payroll";
import type { AppDataStore } from "@/types/app";

function formatBool(value: boolean) {
  return value ? "はい" : "いいえ";
}

export function buildCompanySummaryCsvRows(
  store: AppDataStore,
  startMonth: string,
  endMonth: string,
) {
  const months = getTrackedMonths(store).filter((month) =>
    isMonthInRange(month, startMonth, endMonth),
  );

  return months.map((month) => {
    const snapshot = buildMonthlyPayroll(store, month);
    const dealCount = store.deals.filter(
      (deal) => deal.targetMonth === month && deal.countForCompanyRevenue,
    ).length;

    return {
      月: month,
      会社全体売上: snapshot.totalSales,
      会社取り分: snapshot.totalCompanyShare,
      案件報酬合計: snapshot.totalProjectReward,
      直紹介報酬合計: snapshot.totalReferralReward,
      役員報酬合計: snapshot.totalExecutiveReward,
      調整額合計: snapshot.totalAdjustments,
      全体給料合計: snapshot.totalSalary,
      全体経費: snapshot.expenses,
      利益: snapshot.profit,
      会社売上計上案件数: dealCount,
    };
  });
}

export function buildMonthlyPayrollCsvRows(store: AppDataStore, month: string) {
  const snapshot = buildMonthlyPayroll(store, month);

  return snapshot.memberSummaries.map((summary) => ({
    対象月: month,
    メンバー名: summary.memberName,
    在籍中: formatBool(summary.isActive),
    役員: formatBool(summary.isExecutive),
    個人売上合計: summary.monthlySales,
    適用売上帯: summary.appliedBandLabel,
    案件報酬合計: summary.projectReward,
    直紹介報酬: summary.referralReward,
    役員報酬: summary.executiveReward,
    調整額: summary.adjustment,
    最終給料: summary.finalSalary,
  }));
}

export function buildFilteredMonthlyAnalysisCsvRows(
  analysis: CompanyAnalysisResult,
) {
  return analysis.monthlyPoints.map((point) => ({
    月: point.month,
    案件数: point.dealCount,
    売価合計: point.totalSales,
    会社取り分合計: point.totalCompanyShare,
    参加者報酬合計: point.totalParticipantReward,
  }));
}

export function buildFilteredDealsCsvRows(
  analysis: CompanyAnalysisResult,
) {
  return analysis.filteredDeals.map((deal) => ({
    対象月: deal.month,
    成約日: deal.closedOn,
    案件ID: deal.dealId,
    商品名: deal.productName,
    案件パターン: deal.pattern,
    売価: deal.salePrice,
    会社取り分: deal.companyShare,
    会社売上へ計上: formatBool(deal.countForCompanyRevenue),
    取り分入力モード: deal.companyShareMode,
    参加メンバー: deal.participantNames.join(" / "),
    報酬区分: deal.compensationTypeLabels.join(" / "),
    参加者報酬合計: deal.participantRewardTotal,
    参加者報酬内訳: deal.participantRewardBreakdown.join(" | "),
    備考: deal.note,
  }));
}
