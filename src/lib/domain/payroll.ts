import { isMonthInRange, sortMonths } from "@/lib/date";
import { bandLabel } from "@/lib/format";
import type {
  AppDataStore,
  CompanyTrendPoint,
  CompensationBand,
  MonthlyPayrollSnapshot,
  ParticipantRewardDetail,
  ProductSummary,
  ReferralRelationship,
} from "@/types/app";

function roundMoney(value: number): number {
  return Math.round(value || 0);
}

function sortBands(bands: CompensationBand[]): CompensationBand[] {
  return [...bands].sort((left, right) => left.minSales - right.minSales);
}

function getApplicableBand(
  bands: CompensationBand[],
  monthlySales: number,
): CompensationBand {
  const ordered = sortBands(bands);
  if (!ordered.length) {
    return {
      id: "fallback",
      minSales: 0,
      rates: {},
    };
  }

  let current = ordered[0];

  for (const band of ordered) {
    if (monthlySales >= band.minSales) {
      current = band;
    }
  }

  return current;
}

function solveLinearSystem(matrix: number[][], constants: number[]): number[] | null {
  const size = matrix.length;
  const augmented = matrix.map((row, index) => [...row, constants[index] ?? 0]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let maxRow = pivotIndex;

    for (let row = pivotIndex + 1; row < size; row += 1) {
      if (
        Math.abs(augmented[row][pivotIndex]) >
        Math.abs(augmented[maxRow][pivotIndex])
      ) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivotIndex]) < 1e-9) {
      return null;
    }

    [augmented[pivotIndex], augmented[maxRow]] = [
      augmented[maxRow],
      augmented[pivotIndex],
    ];

    const pivot = augmented[pivotIndex][pivotIndex];
    for (let column = pivotIndex; column <= size; column += 1) {
      augmented[pivotIndex][column] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivotIndex) {
        continue;
      }

      const factor = augmented[row][pivotIndex];
      for (let column = pivotIndex; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivotIndex][column];
      }
    }
  }

  return augmented.map((row) => roundMoney(row[size]));
}

function solveByIteration(matrix: number[][], base: number[]): number[] | null {
  let current = [...base];

  for (let step = 0; step < 250; step += 1) {
    const next = base.map((baseValue, rowIndex) => {
      let sum = baseValue;

      for (let columnIndex = 0; columnIndex < matrix[rowIndex].length; columnIndex += 1) {
        sum += matrix[rowIndex][columnIndex] * current[columnIndex];
      }

      return sum;
    });

    const delta = next.reduce(
      (max, value, index) => Math.max(max, Math.abs(value - current[index])),
      0,
    );

    current = next;

    if (delta < 1) {
      return current.map(roundMoney);
    }
  }

  return null;
}

function buildReferralFinalSalaries(
  memberIds: string[],
  baseSalaryByMemberId: Record<string, number>,
  referrals: ReferralRelationship[],
): { finalByMemberId: Record<string, number>; warnings: string[] } {
  if (!memberIds.length) {
    return { finalByMemberId: {}, warnings: [] };
  }

  const warnings: string[] = [];
  const indexByMemberId = Object.fromEntries(
    memberIds.map((memberId, index) => [memberId, index]),
  );
  const ratesMatrix = Array.from({ length: memberIds.length }, () =>
    Array.from({ length: memberIds.length }, () => 0),
  );

  for (const referral of referrals) {
    const introducerIndex = indexByMemberId[referral.introducerMemberId];
    const referredIndex = indexByMemberId[referral.referredMemberId];

    if (introducerIndex === undefined || referredIndex === undefined) {
      continue;
    }

    ratesMatrix[introducerIndex][referredIndex] += referral.referralRate;
  }

  const identityMinusRates = ratesMatrix.map((row, rowIndex) =>
    row.map((value, columnIndex) => (rowIndex === columnIndex ? 1 - value : -value)),
  );
  const baseVector = memberIds.map((memberId) => baseSalaryByMemberId[memberId] ?? 0);

  let solved = solveLinearSystem(identityMinusRates, baseVector);

  if (!solved) {
    solved = solveByIteration(ratesMatrix, baseVector);
    warnings.push(
      "紹介報酬に循環参照の可能性があったため、反復計算で最終給料を近似しました。",
    );
  }

  if (!solved) {
    warnings.push(
      "紹介報酬の計算が安定しなかったため、紹介報酬を除いた金額で集計しています。",
    );
    solved = [...baseVector];
  }

  return {
    finalByMemberId: Object.fromEntries(
      memberIds.map((memberId, index) => [memberId, roundMoney(solved[index] ?? 0)]),
    ),
    warnings,
  };
}

export function buildMonthlyPayroll(
  store: AppDataStore,
  month: string,
): MonthlyPayrollSnapshot {
  const warnings: string[] = [];
  const membersById = Object.fromEntries(store.members.map((member) => [member.id, member]));
  const productsById = Object.fromEntries(
    store.products.map((product) => [product.id, product]),
  );
  const compensationTypesById = Object.fromEntries(
    store.compensationTypes.map((type) => [type.id, type]),
  );
  const dealsById = Object.fromEntries(store.deals.map((deal) => [deal.id, deal]));
  const monthDeals = store.deals.filter((deal) => deal.targetMonth === month);
  const monthDealIds = new Set(monthDeals.map((deal) => deal.id));
  const monthParticipants = store.dealParticipants.filter((participant) =>
    monthDealIds.has(participant.dealId),
  );
  const monthlySalesByMemberId: Record<string, number> = {};
  const projectRewardByMemberId: Record<string, number> = {};
  const detailByMemberId: Record<string, ParticipantRewardDetail[]> = {};

  for (const participant of monthParticipants) {
    const deal = dealsById[participant.dealId];
    if (!deal || !membersById[participant.memberId]) {
      continue;
    }

    monthlySalesByMemberId[participant.memberId] =
      (monthlySalesByMemberId[participant.memberId] ?? 0) + deal.salePrice;
  }

  for (const participant of monthParticipants) {
    const deal = dealsById[participant.dealId];
    const member = membersById[participant.memberId];
    const product = deal ? productsById[deal.productId] : undefined;
    const compensationType = compensationTypesById[participant.compensationTypeId];

    if (!deal || !member) {
      warnings.push(`案件またはメンバーが見つからない参加者があり、集計から除外しました。`);
      continue;
    }

    const band = getApplicableBand(
      store.compensationBands,
      monthlySalesByMemberId[participant.memberId] ?? 0,
    );
    const appliedRate = band.rates[participant.compensationTypeId] ?? 0;
    const reward = roundMoney(deal.companyShare * appliedRate);

    projectRewardByMemberId[participant.memberId] =
      (projectRewardByMemberId[participant.memberId] ?? 0) + reward;

    const detail: ParticipantRewardDetail = {
      participantId: participant.id,
      dealId: deal.id,
      compensationTypeId: participant.compensationTypeId,
      compensationTypeLabel: compensationType?.label ?? participant.compensationTypeId,
      dealPattern: deal.pattern,
      productId: deal.productId,
      productName: product?.name ?? "未設定商品",
      closedOn: deal.closedOn,
      salePrice: deal.salePrice,
      companyShare: deal.companyShare,
      appliedRate,
      reward,
    };

    if (!detailByMemberId[participant.memberId]) {
      detailByMemberId[participant.memberId] = [];
    }

    detailByMemberId[participant.memberId].push(detail);
  }

  const includedDeals = monthDeals.filter((deal) => deal.countForCompanyRevenue);
  const totalSales = roundMoney(
    includedDeals.reduce((sum, deal) => sum + deal.salePrice, 0),
  );
  const totalCompanyShare = roundMoney(
    includedDeals.reduce((sum, deal) => sum + deal.companyShare, 0),
  );
  const executiveRewardByMemberId: Record<string, number> = {};

  for (const member of store.members) {
    if (!member.isExecutive) {
      continue;
    }

    executiveRewardByMemberId[member.id] = roundMoney(
      totalCompanyShare * member.executiveCompensationRate,
    );
  }

  const adjustmentByMemberId: Record<string, number> = {};
  for (const adjustment of store.salaryAdjustments) {
    if (adjustment.month !== month) {
      continue;
    }

    adjustmentByMemberId[adjustment.memberId] =
      (adjustmentByMemberId[adjustment.memberId] ?? 0) + adjustment.amount;
  }

  const baseSalaryByMemberId: Record<string, number> = {};
  for (const member of store.members) {
    baseSalaryByMemberId[member.id] = roundMoney(
      (projectRewardByMemberId[member.id] ?? 0) +
        (executiveRewardByMemberId[member.id] ?? 0) +
        (adjustmentByMemberId[member.id] ?? 0),
    );
  }

  const activeReferrals = store.referralRelationships.filter((relationship) =>
    isMonthInRange(month, relationship.startMonth, relationship.endMonth),
  );

  const referralSolution = buildReferralFinalSalaries(
    store.members.map((member) => member.id),
    baseSalaryByMemberId,
    activeReferrals,
  );
  warnings.push(...referralSolution.warnings);

  const referralDetailsByMemberId: Record<
    string,
    MonthlyPayrollSnapshot["memberSummaries"][number]["referralDetails"]
  > = {};

  for (const referral of activeReferrals) {
    const referredFinalSalary = referralSolution.finalByMemberId[referral.referredMemberId] ?? 0;
    const reward = roundMoney(referredFinalSalary * referral.referralRate);

    if (!referralDetailsByMemberId[referral.introducerMemberId]) {
      referralDetailsByMemberId[referral.introducerMemberId] = [];
    }

    referralDetailsByMemberId[referral.introducerMemberId].push({
      referralId: referral.id,
      referredMemberId: referral.referredMemberId,
      referredMemberName:
        membersById[referral.referredMemberId]?.name ?? "不明メンバー",
      rate: referral.referralRate,
      referredFinalSalary,
      reward,
    });
  }

  const monthlySetting = store.monthlySettings.find((item) => item.month === month);
  const memberSummaries = store.members
    .map((member) => {
      const monthlySales = roundMoney(monthlySalesByMemberId[member.id] ?? 0);
      const band = getApplicableBand(store.compensationBands, monthlySales);
      const projectReward = roundMoney(projectRewardByMemberId[member.id] ?? 0);
      const executiveReward = roundMoney(executiveRewardByMemberId[member.id] ?? 0);
      const adjustment = roundMoney(adjustmentByMemberId[member.id] ?? 0);
      const finalSalary = roundMoney(
        referralSolution.finalByMemberId[member.id] ?? baseSalaryByMemberId[member.id] ?? 0,
      );
      const referralReward = roundMoney(
        finalSalary - projectReward - executiveReward - adjustment,
      );

      return {
        memberId: member.id,
        memberName: member.name,
        displayOrder: member.displayOrder,
        isActive: member.isActive,
        isExecutive: member.isExecutive,
        monthlySales,
        appliedBandMinSales: band.minSales,
        appliedBandLabel: bandLabel(band.minSales),
        projectReward,
        referralReward,
        executiveReward,
        adjustment,
        finalSalary,
        dealDetails: (detailByMemberId[member.id] ?? []).sort((left, right) =>
          left.closedOn.localeCompare(right.closedOn),
        ),
        referralDetails: referralDetailsByMemberId[member.id] ?? [],
      };
    })
    .sort((left, right) => left.displayOrder - right.displayOrder);

  const productSummaries: ProductSummary[] = Object.values(
    includedDeals.reduce<Record<string, ProductSummary>>((accumulator, deal) => {
      const product = productsById[deal.productId];
      const key = deal.productId || "unknown";

      if (!accumulator[key]) {
        accumulator[key] = {
          productId: key,
          productName: product?.name ?? "未設定商品",
          dealCount: 0,
          totalSales: 0,
          totalCompanyShare: 0,
        };
      }

      accumulator[key].dealCount += 1;
      accumulator[key].totalSales += deal.salePrice;
      accumulator[key].totalCompanyShare += deal.companyShare;

      return accumulator;
    }, {}),
  )
    .map((summary) => ({
      ...summary,
      totalSales: roundMoney(summary.totalSales),
      totalCompanyShare: roundMoney(summary.totalCompanyShare),
    }))
    .sort((left, right) => right.totalSales - left.totalSales);

  const totalProjectReward = roundMoney(
    memberSummaries.reduce((sum, summary) => sum + summary.projectReward, 0),
  );
  const totalReferralReward = roundMoney(
    memberSummaries.reduce((sum, summary) => sum + summary.referralReward, 0),
  );
  const totalExecutiveReward = roundMoney(
    memberSummaries.reduce((sum, summary) => sum + summary.executiveReward, 0),
  );
  const totalAdjustments = roundMoney(
    memberSummaries.reduce((sum, summary) => sum + summary.adjustment, 0),
  );
  const totalSalary = roundMoney(
    memberSummaries.reduce((sum, summary) => sum + summary.finalSalary, 0),
  );
  const expenses = roundMoney(monthlySetting?.expense ?? 0);

  return {
    month,
    totalSales,
    totalCompanyShare,
    totalProjectReward,
    totalReferralReward,
    totalExecutiveReward,
    totalAdjustments,
    totalSalary,
    expenses,
    profit: roundMoney(totalCompanyShare - totalSalary - expenses),
    memberSummaries,
    productSummaries,
    warnings: [...new Set(warnings)],
  };
}

export function getTrackedMonths(store: AppDataStore): string[] {
  const months = new Set<string>();

  for (const deal of store.deals) {
    months.add(deal.targetMonth);
  }

  for (const setting of store.monthlySettings) {
    months.add(setting.month);
  }

  for (const adjustment of store.salaryAdjustments) {
    months.add(adjustment.month);
  }

  months.add(store.preferences.displayMonth);

  return sortMonths([...months]);
}

export function buildCompanyTrend(store: AppDataStore): CompanyTrendPoint[] {
  return getTrackedMonths(store)
    .map((month) => {
      const snapshot = buildMonthlyPayroll(store, month);

      return {
        month,
        totalSales: snapshot.totalSales,
        totalCompanyShare: snapshot.totalCompanyShare,
        totalSalary: snapshot.totalSalary,
        profit: snapshot.profit,
      };
    })
    .sort((left, right) => left.month.localeCompare(right.month));
}
