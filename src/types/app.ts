export type DealPattern = "AC" | "ABC" | "AABC" | string;

export type SaleInputMode = "manual" | "fixed_price";
export type CompanyShareMethod =
  | "fixed_amount"
  | "percentage_of_sales"
  | "sales_minus_cost"
  | "manual";

export interface Member {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  isExecutive: boolean;
  executiveCompensationRate: number;
  defaultReferralRate: number;
  note: string;
}

export interface Product {
  id: string;
  name: string;
  isActive: boolean;
  saleInputMode: SaleInputMode;
  defaultSalePrice: number;
  companyShareMethod: CompanyShareMethod;
  companyShareFixedAmount: number;
  companyShareRate: number;
  cost: number;
  note: string;
}

export interface Deal {
  id: string;
  closedOn: string;
  targetMonth: string;
  productId: string;
  salePrice: number;
  companyShare: number;
  companyShareMode: "auto" | "manual";
  countForCompanyRevenue: boolean;
  pattern: DealPattern;
  note: string;
}

export interface DealParticipant {
  id: string;
  dealId: string;
  memberId: string;
  compensationTypeId: string;
  note: string;
}

export interface CompensationType {
  id: string;
  label: string;
  active: boolean;
  dealPattern: DealPattern | "ANY";
  note: string;
}

export interface ReferralRelationship {
  id: string;
  introducerMemberId: string;
  referredMemberId: string;
  referralRate: number;
  startMonth: string;
  endMonth?: string;
}

export interface CompensationBand {
  id: string;
  minSales: number;
  rates: Record<string, number>;
}

export interface MonthlySetting {
  month: string;
  expense: number;
  note: string;
}

export interface SalaryAdjustment {
  id: string;
  month: string;
  memberId: string;
  amount: number;
  note: string;
}

export interface MemberExpense {
  id: string;
  month: string;
  memberId: string;
  amount: number;
  category: string;
  note: string;
}

export type AnalysisRangeMode = "month" | "quarter" | "year";

export interface AppPreferences {
  displayMonth: string;
  analysisRangeMode: AnalysisRangeMode;
}

export interface AppDataStore {
  version: number;
  members: Member[];
  products: Product[];
  deals: Deal[];
  dealParticipants: DealParticipant[];
  compensationTypes: CompensationType[];
  referralRelationships: ReferralRelationship[];
  compensationBands: CompensationBand[];
  monthlySettings: MonthlySetting[];
  salaryAdjustments: SalaryAdjustment[];
  memberExpenses: MemberExpense[];
  preferences: AppPreferences;
}

export interface ParticipantRewardDetail {
  participantId: string;
  dealId: string;
  compensationTypeId: string;
  compensationTypeLabel: string;
  dealPattern: DealPattern;
  productId: string;
  productName: string;
  closedOn: string;
  salePrice: number;
  companyShare: number;
  appliedRate: number;
  reward: number;
}

export interface ReferralRewardDetail {
  referralId: string;
  referredMemberId: string;
  referredMemberName: string;
  rate: number;
  referredFinalSalary: number;
  reward: number;
}

export interface MonthlyMemberSummary {
  memberId: string;
  memberName: string;
  displayOrder: number;
  isActive: boolean;
  isExecutive: boolean;
  monthlySales: number;
  appliedBandMinSales: number;
  appliedBandLabel: string;
  projectReward: number;
  referralReward: number;
  executiveReward: number;
  adjustment: number;
  personalExpense: number;
  finalSalary: number;
  dealDetails: ParticipantRewardDetail[];
  referralDetails: ReferralRewardDetail[];
}

export interface ProductSummary {
  productId: string;
  productName: string;
  dealCount: number;
  totalSales: number;
  totalCompanyShare: number;
}

export interface CompanyTrendPoint {
  month: string;
  totalSales: number;
  totalCompanyShare: number;
  totalSalary: number;
  profit: number;
}

export interface MonthlyPayrollSnapshot {
  month: string;
  totalSales: number;
  totalCompanyShare: number;
  totalProjectReward: number;
  totalReferralReward: number;
  totalExecutiveReward: number;
  totalAdjustments: number;
  totalPersonalExpenses: number;
  totalSalary: number;
  expenses: number;
  profit: number;
  memberSummaries: MonthlyMemberSummary[];
  productSummaries: ProductSummary[];
  warnings: string[];
}
