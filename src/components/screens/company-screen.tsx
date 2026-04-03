"use client";

import { useState } from "react";
import { Badge, EmptyState, PageSection, Select, StatCard } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { DEAL_PATTERN_OPTIONS } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import { getRangeLabel } from "@/lib/date";
import { buildCompanyAnalysis, type AnalysisFilters } from "@/lib/domain/analysis";
import {
  buildCompanySummaryCsvRows,
  buildFilteredDealsCsvRows,
  buildFilteredMonthlyAnalysisCsvRows,
} from "@/lib/domain/exports";
import { buildPeriodOverview } from "@/lib/domain/payroll";
import { formatCurrency, formatMonthLabel, formatNumber } from "@/lib/format";

type LocalFilters = Pick<
  AnalysisFilters,
  "productId" | "memberId" | "pattern" | "companyRevenueMode"
>;

const emptyFilters: LocalFilters = {
  productId: "",
  memberId: "",
  pattern: "",
  companyRevenueMode: "all",
};

export function CompanyScreen() {
  const { store, selectedMonth, analysisRangeMode, analysisMonths } = useAppState();
  const [filters, setFilters] = useState<LocalFilters>(emptyFilters);
  const rangeMonths = analysisMonths.length ? analysisMonths : [selectedMonth];
  const startMonth = rangeMonths[0];
  const endMonth = rangeMonths[rangeMonths.length - 1];
  const overview = buildPeriodOverview(store, rangeMonths);
  const analysis = buildCompanyAnalysis(store, {
    startMonth,
    endMonth,
    ...filters,
  });
  const companySummaryRows = buildCompanySummaryCsvRows(store, startMonth, endMonth);
  const filteredMonthlyRows = buildFilteredMonthlyAnalysisCsvRows(analysis);
  const filteredDealRows = buildFilteredDealsCsvRows(analysis);

  const handleResetFilters = () => {
    setFilters(emptyFilters);
  };

  return (
    <div className="space-y-6">
      <PageSection
        title="分析の対象範囲"
        description="期間は左メニューの対象月と表示期間で切り替えます。ここでは人・商品・案件条件で絞り込みます。"
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <Badge tone="teal">対象月 {formatMonthLabel(selectedMonth)}</Badge>
          <Badge>
            {analysisRangeMode === "month"
              ? "単月"
              : analysisRangeMode === "quarter"
                ? "3か月"
                : "年間"}
          </Badge>
          <span>{getRangeLabel(selectedMonth, analysisRangeMode)}</span>
        </div>
      </PageSection>

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="集計月数" value={formatNumber(overview.months.length)} />
        <StatCard label="会社売上" value={formatCurrency(overview.totalSales)} />
        <StatCard
          label="会社取り分合計"
          value={formatCurrency(overview.totalCompanyShare)}
        />
        <StatCard label="全体給料合計" value={formatCurrency(overview.totalSalary)} />
        <StatCard label="利益" value={formatCurrency(overview.profit)} />
      </div>

      <PageSection
        title="CSV出力"
        description="Excelでそのまま開ける UTF-8 CSV を出力できます。確定申告や月次確認では、会社月次サマリーと案件台帳が主な利用先です。"
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `leapseed-company-summary-${startMonth}-${endMonth}.csv`,
                companySummaryRows,
              )
            }
            disabled={!companySummaryRows.length}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            会社月次サマリーCSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `leapseed-monthly-analysis-${startMonth}-${endMonth}.csv`,
                filteredMonthlyRows,
              )
            }
            disabled={!filteredMonthlyRows.length}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            分析月次CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `leapseed-deal-ledger-${startMonth}-${endMonth}.csv`,
                filteredDealRows,
              )
            }
            disabled={!filteredDealRows.length}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            案件台帳CSV
          </button>
        </div>
      </PageSection>

      <PageSection
        title="分析フィルター"
        description="期間は固定したまま、メンバー・商品・案件パターン・会社売上計上有無で絞り込みできます。"
        action={
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            フィルターをリセット
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">メンバー</p>
            <Select
              value={filters.memberId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, memberId: event.target.value }))
              }
            >
              <option value="">すべて</option>
              {store.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">商品</p>
            <Select
              value={filters.productId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, productId: event.target.value }))
              }
            >
              <option value="">すべて</option>
              {store.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">案件パターン</p>
            <Select
              value={filters.pattern}
              onChange={(event) =>
                setFilters((current) => ({ ...current, pattern: event.target.value }))
              }
            >
              <option value="">すべて</option>
              {DEAL_PATTERN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">会社売上への計上</p>
            <Select
              value={filters.companyRevenueMode}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  companyRevenueMode:
                    event.target.value as LocalFilters["companyRevenueMode"],
                }))
              }
            >
              <option value="all">すべて</option>
              <option value="counted">計上する案件のみ</option>
              <option value="excluded">計上しない案件のみ</option>
            </Select>
          </div>
        </div>
      </PageSection>

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="分析対象月数" value={formatNumber(analysis.totals.monthCount)} />
        <StatCard label="該当案件数" value={formatNumber(analysis.totals.dealCount)} />
        <StatCard label="売価合計" value={formatCurrency(analysis.totals.totalSales)} />
        <StatCard
          label="会社取り分合計"
          value={formatCurrency(analysis.totals.totalCompanyShare)}
        />
        <StatCard
          label="参加者報酬合計"
          value={formatCurrency(analysis.totals.totalParticipantReward)}
        />
      </div>

      <PageSection
        title="月別分析"
        description="フィルター条件に一致した案件だけを月ごとに集計しています。"
      >
        {analysis.monthlyPoints.some((point) => point.dealCount > 0) ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">月</th>
                  <th className="pb-3 pr-4">案件数</th>
                  <th className="pb-3 pr-4">売価合計</th>
                  <th className="pb-3 pr-4">会社取り分</th>
                  <th className="pb-3">参加者報酬</th>
                </tr>
              </thead>
              <tbody>
                {analysis.monthlyPoints.map((point) => (
                  <tr key={point.month} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {formatMonthLabel(point.month)}
                    </td>
                    <td className="py-3 pr-4">{formatNumber(point.dealCount)}</td>
                    <td className="py-3 pr-4">{formatCurrency(point.totalSales)}</td>
                    <td className="py-3 pr-4">{formatCurrency(point.totalCompanyShare)}</td>
                    <td className="py-3">{formatCurrency(point.totalParticipantReward)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="条件に一致する月別データがありません"
            description="絞り込み条件か売上入力を確認してください。"
          />
        )}
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <PageSection
          title="メンバー別分析"
          description="期間内でどのメンバーがどれだけ関与したかを確認できます。"
        >
          {analysis.memberSummaries.length ? (
            <div className="space-y-2">
              {analysis.memberSummaries.map((member) => (
                <div
                  key={member.memberId}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{member.memberName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        関与売上 {formatCurrency(member.involvedSales)} / 案件数{" "}
                        {formatNumber(member.dealCount)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(member.rewardTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="メンバー別集計がありません"
              description="条件に一致する案件がないため、集計結果は空です。"
            />
          )}
        </PageSection>

        <PageSection
          title="商品別分析"
          description="期間内で売れた商品ごとの規模感を把握できます。"
        >
          {analysis.productSummaries.length ? (
            <div className="space-y-2">
              {analysis.productSummaries.map((product) => (
                <div
                  key={product.productId}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{product.productName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        売価 {formatCurrency(product.totalSales)} / 案件数{" "}
                        {formatNumber(product.dealCount)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(product.totalCompanyShare)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="商品別集計がありません"
              description="条件に一致する案件がないため、集計結果は空です。"
            />
          )}
        </PageSection>
      </div>

      <PageSection
        title="案件台帳"
        description="期間と絞り込み条件に一致する案件を一覧で確認できます。"
      >
        {analysis.filteredDeals.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">対象月</th>
                  <th className="pb-3 pr-4">成約日</th>
                  <th className="pb-3 pr-4">商品</th>
                  <th className="pb-3 pr-4">パターン</th>
                  <th className="pb-3 pr-4">売価</th>
                  <th className="pb-3 pr-4">会社取り分</th>
                  <th className="pb-3 pr-4">参加者</th>
                  <th className="pb-3">メモ</th>
                </tr>
              </thead>
              <tbody>
                {analysis.filteredDeals.map((deal) => (
                  <tr key={deal.dealId} className="border-t border-slate-100">
                    <td className="py-3 pr-4">{formatMonthLabel(deal.month)}</td>
                    <td className="py-3 pr-4">{deal.closedOn}</td>
                    <td className="py-3 pr-4">{deal.productName}</td>
                    <td className="py-3 pr-4">{deal.pattern}</td>
                    <td className="py-3 pr-4">{formatCurrency(deal.salePrice)}</td>
                    <td className="py-3 pr-4">{formatCurrency(deal.companyShare)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {deal.participantNames.map((name, index) => (
                          <Badge key={`${deal.dealId}_${name}_${index}`}>
                            {name} / {deal.compensationTypeLabels[index] ?? "-"}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3">{deal.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="条件に一致する案件がありません"
            description="期間やフィルター条件を見直してください。"
          />
        )}
      </PageSection>
    </div>
  );
}
