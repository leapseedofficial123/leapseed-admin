import { getToday } from "@/lib/date";
import { buildMonthlyPayroll } from "@/lib/domain/payroll";
import type { AppDataStore } from "@/types/app";

export interface StatementGroupRow {
  compensationTypeId: string;
  compensationTypeLabel: string;
  dealCount: number;
  salePriceTotal: number;
  companyShareTotal: number;
  rewardTotal: number;
  appliedRates: number[];
}

export interface StatementExpenseRow {
  id: string;
  category: string;
  amount: number;
  note: string;
}

export interface StatementData {
  memberId: string;
  memberName: string;
  month: string;
  issueDate: string;
  appliedBandLabel: string;
  monthlySales: number;
  projectReward: number;
  referralReward: number;
  executiveReward: number;
  adjustment: number;
  personalExpense: number;
  finalSalary: number;
  detailRows: ReturnType<typeof buildMonthlyPayroll>["memberSummaries"][number]["dealDetails"];
  referralRows: ReturnType<typeof buildMonthlyPayroll>["memberSummaries"][number]["referralDetails"];
  groupedRows: StatementGroupRow[];
  expenseRows: StatementExpenseRow[];
}

function uniqueRates(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

export function buildStatementData(
  store: AppDataStore,
  month: string,
  memberId: string,
): StatementData | null {
  const snapshot = buildMonthlyPayroll(store, month);
  const summary = snapshot.memberSummaries.find((item) => item.memberId === memberId);

  if (!summary) {
    return null;
  }

  const groupedMap = summary.dealDetails.reduce<Record<string, StatementGroupRow>>(
    (accumulator, detail) => {
      if (!accumulator[detail.compensationTypeId]) {
        accumulator[detail.compensationTypeId] = {
          compensationTypeId: detail.compensationTypeId,
          compensationTypeLabel: detail.compensationTypeLabel,
          dealCount: 0,
          salePriceTotal: 0,
          companyShareTotal: 0,
          rewardTotal: 0,
          appliedRates: [],
        };
      }

      accumulator[detail.compensationTypeId].dealCount += 1;
      accumulator[detail.compensationTypeId].salePriceTotal += detail.salePrice;
      accumulator[detail.compensationTypeId].companyShareTotal += detail.companyShare;
      accumulator[detail.compensationTypeId].rewardTotal += detail.reward;
      accumulator[detail.compensationTypeId].appliedRates.push(detail.appliedRate);

      return accumulator;
    },
    {},
  );

  const expenseRows = store.memberExpenses
    .filter((expense) => expense.month === month && expense.memberId === memberId)
    .map((expense) => ({
      id: expense.id,
      category: expense.category || "個人経費",
      amount: expense.amount,
      note: expense.note,
    }));

  return {
    memberId: summary.memberId,
    memberName: summary.memberName,
    month,
    issueDate: getToday(),
    appliedBandLabel: summary.appliedBandLabel,
    monthlySales: summary.monthlySales,
    projectReward: summary.projectReward,
    referralReward: summary.referralReward,
    executiveReward: summary.executiveReward,
    adjustment: summary.adjustment,
    personalExpense: summary.personalExpense,
    finalSalary: summary.finalSalary,
    detailRows: summary.dealDetails,
    referralRows: summary.referralDetails,
    groupedRows: Object.values(groupedMap)
      .map((row) => ({
        ...row,
        appliedRates: uniqueRates(row.appliedRates),
      }))
      .sort((left, right) => left.compensationTypeLabel.localeCompare(right.compensationTypeLabel)),
    expenseRows,
  };
}

export function buildMonthlyStatements(store: AppDataStore, month: string): StatementData[] {
  const snapshot = buildMonthlyPayroll(store, month);

  return snapshot.memberSummaries
    .filter(
      (summary) =>
        summary.monthlySales > 0 ||
        summary.projectReward !== 0 ||
        summary.referralReward !== 0 ||
        summary.executiveReward !== 0 ||
        summary.adjustment !== 0 ||
        summary.personalExpense !== 0,
    )
    .map((summary) => buildStatementData(store, month, summary.memberId))
    .filter((statement): statement is StatementData => Boolean(statement));
}
