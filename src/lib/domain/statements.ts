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

export interface StatementAdjustmentRow {
  id: string;
  title: string;
  amount: number;
  note: string;
}

export interface StatementTemplateRow {
  id: string;
  index: number;
  memberName: string;
  productName: string;
  salePrice: number;
  closedOn: string;
  compensationTypeLabel: string;
  appliedRate: number;
  reward: number;
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
  statementAdjustmentTotal: number;
  finalSalary: number;
  transferAmount: number;
  detailRows: ReturnType<typeof buildMonthlyPayroll>["memberSummaries"][number]["dealDetails"];
  referralRows: ReturnType<typeof buildMonthlyPayroll>["memberSummaries"][number]["referralDetails"];
  groupedRows: StatementGroupRow[];
  expenseRows: StatementExpenseRow[];
  statementAdjustmentRows: StatementAdjustmentRow[];
  templateRows: StatementTemplateRow[];
  overflowRows: StatementTemplateRow[];
  abcRateLabel: string;
  aabcRateLabel: string;
}

function uniqueRates(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function buildRateLabel(values: number[]) {
  const unique = uniqueRates(values);
  if (!unique.length) {
    return "-";
  }

  return unique
    .map((value) => `${(value * 100).toFixed((value * 100) % 1 === 0 ? 0 : 1)}`)
    .join(" / ");
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

  const statementAdjustmentRows = store.statementAdjustments
    .filter((adjustment) => adjustment.month === month && adjustment.memberId === memberId)
    .map((adjustment) => ({
      id: adjustment.id,
      title: adjustment.title,
      amount: adjustment.amount,
      note: adjustment.note,
    }));

  const statementAdjustmentTotal = statementAdjustmentRows.reduce(
    (sum, adjustment) => sum + adjustment.amount,
    0,
  );
  const templateRows = summary.dealDetails.slice(0, 10).map((detail, index) => ({
    id: detail.participantId,
    index: index + 1,
    memberName: summary.memberName,
    productName: detail.productName,
    salePrice: detail.salePrice,
    closedOn: detail.closedOn,
    compensationTypeLabel: detail.compensationTypeLabel,
    appliedRate: detail.appliedRate,
    reward: detail.reward,
  }));
  const overflowRows = summary.dealDetails.slice(10).map((detail, index) => ({
    id: detail.participantId,
    index: index + 11,
    memberName: summary.memberName,
    productName: detail.productName,
    salePrice: detail.salePrice,
    closedOn: detail.closedOn,
    compensationTypeLabel: detail.compensationTypeLabel,
    appliedRate: detail.appliedRate,
    reward: detail.reward,
  }));
  const abcRates = summary.dealDetails
    .filter((detail) => detail.compensationTypeId.startsWith("ABC_"))
    .map((detail) => detail.appliedRate);
  const aabcRates = summary.dealDetails
    .filter((detail) => detail.compensationTypeId.startsWith("AABC_"))
    .map((detail) => detail.appliedRate);

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
    statementAdjustmentTotal,
    finalSalary: summary.finalSalary,
    transferAmount: summary.finalSalary + summary.personalExpense + statementAdjustmentTotal,
    detailRows: summary.dealDetails,
    referralRows: summary.referralDetails,
    groupedRows: Object.values(groupedMap)
      .map((row) => ({
        ...row,
        appliedRates: uniqueRates(row.appliedRates),
      }))
      .sort((left, right) => left.compensationTypeLabel.localeCompare(right.compensationTypeLabel)),
    expenseRows,
    statementAdjustmentRows,
    templateRows,
    overflowRows,
    abcRateLabel: buildRateLabel(abcRates),
    aabcRateLabel: buildRateLabel(aabcRates),
  };
}

export function buildMonthlyStatements(store: AppDataStore, month: string): StatementData[] {
  const snapshot = buildMonthlyPayroll(store, month);

  return snapshot.memberSummaries
    .map((summary) => buildStatementData(store, month, summary.memberId))
    .filter((statement): statement is StatementData => Boolean(statement))
    .filter(
      (statement) =>
        statement.monthlySales > 0 ||
        statement.projectReward !== 0 ||
        statement.referralReward !== 0 ||
        statement.executiveReward !== 0 ||
        statement.adjustment !== 0 ||
        statement.personalExpense !== 0 ||
        statement.statementAdjustmentTotal !== 0,
    );
}
