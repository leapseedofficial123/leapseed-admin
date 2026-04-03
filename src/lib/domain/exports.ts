import { isMonthInRange } from "@/lib/date";
import {
  buildMemberHistory,
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
      個人経費合計: snapshot.totalPersonalExpenses,
      全体給料合計: snapshot.totalSalary,
      会社経費: snapshot.expenses,
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
    個人経費: summary.personalExpense,
    最終給料: summary.finalSalary,
  }));
}

export function buildMemberStatementCsvRows(
  store: AppDataStore,
  month: string,
  memberId: string,
) {
  const snapshot = buildMonthlyPayroll(store, month);
  const summary = snapshot.memberSummaries.find((item) => item.memberId === memberId);

  if (!summary) {
    return [];
  }

  const rows: Array<Record<string, string | number>> = [
    {
      行種別: "summary",
      対象月: month,
      メンバー名: summary.memberName,
      項目: "個人売上合計",
      金額: summary.monthlySales,
      補足1: summary.appliedBandLabel,
      補足2: "",
    },
    {
      行種別: "summary",
      対象月: month,
      メンバー名: summary.memberName,
      項目: "案件報酬合計",
      金額: summary.projectReward,
      補足1: "",
      補足2: "",
    },
    {
      行種別: "summary",
      対象月: month,
      メンバー名: summary.memberName,
      項目: "直紹介報酬",
      金額: summary.referralReward,
      補足1: "",
      補足2: "",
    },
    {
      行種別: "summary",
      対象月: month,
      メンバー名: summary.memberName,
      項目: "役員報酬",
      金額: summary.executiveReward,
      補足1: "",
      補足2: "",
    },
    {
      行種別: "summary",
      対象月: month,
      メンバー名: summary.memberName,
      項目: "調整額",
      金額: summary.adjustment,
      補足1: "",
      補足2: "",
    },
    {
      行種別: "summary",
      対象月: month,
      メンバー名: summary.memberName,
      項目: "個人経費",
      金額: summary.personalExpense,
      補足1: "給与には反映しない参考値",
      補足2: "",
    },
    {
      行種別: "summary",
      対象月: month,
      メンバー名: summary.memberName,
      項目: "最終給料",
      金額: summary.finalSalary,
      補足1: "",
      補足2: "",
    },
  ];

  rows.push(
    ...summary.dealDetails.map((detail) => ({
      行種別: "deal",
      対象月: month,
      メンバー名: summary.memberName,
      項目: detail.productName,
      金額: detail.reward,
      補足1: `${detail.compensationTypeLabel} / ${detail.closedOn}`,
      補足2: `売価 ${detail.salePrice} / 会社取り分 ${detail.companyShare} / 率 ${detail.appliedRate}`,
    })),
  );

  rows.push(
    ...summary.referralDetails.map((detail) => ({
      行種別: "referral",
      対象月: month,
      メンバー名: summary.memberName,
      項目: `紹介報酬: ${detail.referredMemberName}`,
      金額: detail.reward,
      補足1: `率 ${detail.rate}`,
      補足2: `被紹介者最終給料 ${detail.referredFinalSalary}`,
    })),
  );

  rows.push(
    ...store.memberExpenses
      .filter((expense) => expense.month === month && expense.memberId === memberId)
      .map((expense) => ({
        行種別: "expense",
        対象月: month,
        メンバー名: summary.memberName,
        項目: expense.category || "個人経費",
        金額: expense.amount,
        補足1: expense.note,
        補足2: "個人確定申告用メモ",
      })),
  );

  return rows;
}

export function buildMemberHistoryCsvRows(store: AppDataStore, memberId: string) {
  const member = store.members.find((item) => item.id === memberId);
  const history = buildMemberHistory(store, memberId);

  return history.monthlyRows.map((row) => ({
    メンバー名: member?.name ?? "不明なメンバー",
    年: row.year,
    月: row.month,
    案件数: row.dealCount,
    個人売上合計: row.monthlySales,
    案件報酬合計: row.projectReward,
    直紹介報酬: row.referralReward,
    役員報酬: row.executiveReward,
    調整額: row.adjustment,
    個人経費: row.personalExpense,
    最終給料: row.finalSalary,
  }));
}

export function buildFilteredMonthlyAnalysisCsvRows(analysis: CompanyAnalysisResult) {
  return analysis.monthlyPoints.map((point) => ({
    月: point.month,
    案件数: point.dealCount,
    売価合計: point.totalSales,
    会社取り分合計: point.totalCompanyShare,
    参加者報酬合計: point.totalParticipantReward,
  }));
}

export function buildFilteredDealsCsvRows(analysis: CompanyAnalysisResult) {
  return analysis.filteredDeals.map((deal) => ({
    対象月: deal.month,
    成約日: deal.closedOn,
    案件ID: deal.dealId,
    商品名: deal.productName,
    案件形態: deal.pattern,
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
