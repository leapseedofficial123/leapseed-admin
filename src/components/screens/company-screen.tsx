"use client";

import { useState } from "react";
import { Badge, EmptyState, Input, PageSection, Select, StatCard } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { ANALYSIS_RANGE_OPTIONS, DEAL_PATTERN_OPTIONS } from "@/lib/constants";
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
import type { AnalysisRangeMode } from "@/types/app";

type LocalFilters = Pick<AnalysisFilters, "productId" | "memberId" | "pattern" | "companyRevenueMode">;

const emptyFilters: LocalFilters = {
  productId: "",
  memberId: "",
  pattern: "",
  companyRevenueMode: "all",
};

export function CompanyScreen() {
  const {
    store,
    selectedMonth,
    setSelectedMonth,
    analysisRangeMode,
    setAnalysisRangeMode,
    analysisMonths,
  } = useAppState();
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
  return (
    <div className="space-y-6">
      <PageSection
        title="分析の表示範囲"
        description="この画面の中でも、単月、3か月、半年、年間を切り替えられます。"
      >
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">期間区分</p>
            <Select
              value={analysisRangeMode}
              onChange={(event) => setAnalysisRangeMode(event.target.value as AnalysisRangeMode)}
            >
              {ANALYSIS_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">表示基準</p>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <Badge tone="teal">表示期間 {getRangeLabel(selectedMonth, analysisRangeMode)}</Badge>
          <span>基準開始月 {formatMonthLabel(startMonth)}</span>
        </div>
      </PageSection>

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="対象月数" value={formatNumber(overview.months.length)} />
        <StatCard label="会社全体売上" value={formatCurrency(overview.totalSales)} />
        <StatCard label="会社取り分" value={formatCurrency(overview.totalCompanyShare)} />
        <StatCard label="会社経費" value={formatCurrency(overview.expenses)} />
        <StatCard label="利益" value={formatCurrency(overview.profit)} />
      </div>

      <PageSection
        title="CSV出力"
        description="Excelで開きやすいUTF-8 CSVです。月次サマリー、分析用、案件台帳を出力できます。"
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
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            分析月次CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsv(`leapseed-deal-ledger-${startMonth}-${endMonth}.csv`, filteredDealRows)
            }
            disabled={!filteredDealRows.length}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            成約台帳CSV
          </button>
        </div>
      </PageSection>

      <PageSection
        title="絞り込み"
        description="商品、メンバー、成約形態、会社売上への計上有無で絞り込めます。"
        action={
          <button
            type="button"
            onClick={() => setFilters(emptyFilters)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            リセット
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
            <p className="mb-2 text-sm font-medium text-slate-700">成約形態</p>
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
                  companyRevenueMode: event.target.value as LocalFilters["companyRevenueMode"],
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
        <StatCard label="成約件数" value={formatNumber(analysis.totals.dealCount)} />
        <StatCard label="売価合計" value={formatCurrency(analysis.totals.totalSales)} />
        <StatCard label="会社取り分合計" value={formatCurrency(analysis.totals.totalCompanyShare)} />
        <StatCard
          label="参加者報酬合計"
          value={formatCurrency(analysis.totals.totalParticipantReward)}
        />
      </div>

      <PageSection title="月別推移" description="絞り込み後の成約だけを月別で確認できます。">
        {analysis.monthlyPoints.some((point) => point.dealCount > 0) ? (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">月</th>
                  <th className="pb-3 pr-4">成約件数</th>
                  <th className="pb-3 pr-4">売価合計</th>
                  <th className="pb-3 pr-4">会社取り分合計</th>
                  <th className="pb-3">参加者報酬合計</th>
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
            title="条件に一致する月次データがありません"
            description="期間や絞り込み条件を見直してください。"
          />
        )}
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <PageSection title="メンバー別分析" description="期間内で各メンバーがどれだけ売り上げたかを確認できます。">
          {analysis.memberSummaries.length ? (
            <div className="space-y-2">
              {analysis.memberSummaries.map((member) => (
                <div key={member.memberId} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{member.memberName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        関与売上 {formatCurrency(member.involvedSales)} / 成約件数{" "}
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
              title="メンバー別データがありません"
              description="この条件では対象となる成約がありません。"
            />
          )}
        </PageSection>

        <PageSection title="商品別分析" description="商品ごとの成約件数と会社取り分を確認できます。">
          {analysis.productSummaries.length ? (
            <div className="space-y-2">
              {analysis.productSummaries.map((product) => (
                <div key={product.productId} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{product.productName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        売価 {formatCurrency(product.totalSales)} / 成約件数{" "}
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
              title="商品別データがありません"
              description="この条件では対象となる商品がありません。"
            />
          )}
        </PageSection>
      </div>

      <PageSection title="成約台帳" description="期間内の成約を一覧で確認できます。">
        {analysis.filteredDeals.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">対象月</th>
                  <th className="pb-3 pr-4">成約日</th>
                  <th className="pb-3 pr-4">商品</th>
                  <th className="pb-3 pr-4">形態</th>
                  <th className="pb-3 pr-4">売価</th>
                  <th className="pb-3 pr-4">会社取り分</th>
                  <th className="pb-3 pr-4">参加者</th>
                  <th className="pb-3">備考</th>
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
            title="成約データがありません"
            description="期間や絞り込み条件を見直してください。"
          />
        )}
      </PageSection>
    </div>
  );
}
