"use client";

import { useState } from "react";
import {
  Badge,
  EmptyState,
  PageSection,
  Select,
  StatCard,
} from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { DEAL_PATTERN_OPTIONS } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import {
  buildCompanyAnalysis,
  createDefaultAnalysisFilters,
  type AnalysisFilters,
} from "@/lib/domain/analysis";
import {
  buildCompanySummaryCsvRows,
  buildFilteredDealsCsvRows,
  buildFilteredMonthlyAnalysisCsvRows,
} from "@/lib/domain/exports";
import { formatCurrency, formatMonthLabel, formatNumber } from "@/lib/format";

export function CompanyScreen() {
  const { store, selectedMonth, currentSnapshot, trackedMonths } = useAppState();
  const defaultFilters = createDefaultAnalysisFilters(trackedMonths, selectedMonth);
  const [filters, setFilters] = useState<AnalysisFilters>(defaultFilters);
  const resolvedFilters = {
    ...filters,
    startMonth: trackedMonths.includes(filters.startMonth)
      ? filters.startMonth
      : defaultFilters.startMonth,
    endMonth: trackedMonths.includes(filters.endMonth)
      ? filters.endMonth
      : defaultFilters.endMonth,
  };
  const analysis = buildCompanyAnalysis(store, resolvedFilters);
  const companySummaryRows = buildCompanySummaryCsvRows(
    store,
    analysis.filters.startMonth,
    analysis.filters.endMonth,
  );
  const filteredMonthlyRows = buildFilteredMonthlyAnalysisCsvRows(analysis);
  const filteredDealRows = buildFilteredDealsCsvRows(analysis);

  const handleResetFilters = () => {
    setFilters(createDefaultAnalysisFilters(trackedMonths, selectedMonth));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label={`${formatMonthLabel(selectedMonth)}の会社全体売上`}
          value={formatCurrency(currentSnapshot.totalSales)}
          caption="会社売上に計上する案件のみを集計"
        />
        <StatCard
          label="会社取り分合計"
          value={formatCurrency(currentSnapshot.totalCompanyShare)}
          caption="役員報酬の計算母数"
        />
        <StatCard
          label="全体経費"
          value={formatCurrency(currentSnapshot.expenses)}
          caption="当月の会社設定で管理"
        />
        <StatCard
          label="会社利益"
          value={formatCurrency(currentSnapshot.profit)}
          caption="会社取り分 - 全体給料 - 経費"
        />
      </div>

      <PageSection
        title="CSV出力"
        description="Excelでそのまま開ける UTF-8 CSV を出力できます。確定申告や月次確認では、まず会社月次サマリーと案件台帳を使う想定です。"
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `leapseed-company-summary-${analysis.filters.startMonth}-${analysis.filters.endMonth}.csv`,
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
                `leapseed-monthly-analysis-${analysis.filters.startMonth}-${analysis.filters.endMonth}.csv`,
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
                `leapseed-deal-ledger-${analysis.filters.startMonth}-${analysis.filters.endMonth}.csv`,
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
        description="期間、メンバー、商品、案件パターン、会社売上計上の有無で絞り込んで月ごとの分析ができます。"
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">開始月</p>
            <Select
              value={analysis.filters.startMonth}
              onChange={(event) =>
                setFilters((current) => ({ ...current, startMonth: event.target.value }))
              }
            >
              {trackedMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">終了月</p>
            <Select
              value={analysis.filters.endMonth}
              onChange={(event) =>
                setFilters((current) => ({ ...current, endMonth: event.target.value }))
              }
            >
              {trackedMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">メンバー</p>
            <Select
              value={analysis.filters.memberId}
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
              value={analysis.filters.productId}
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
              value={analysis.filters.pattern}
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
              value={analysis.filters.companyRevenueMode}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  companyRevenueMode: event.target.value as AnalysisFilters["companyRevenueMode"],
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
                    <td className="py-3 font-semibold text-slate-900">
                      {formatCurrency(point.totalParticipantReward)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="条件に一致する月次データがありません"
            description="フィルター条件をゆるめると、ここに月別の分析結果が表示されます。"
          />
        )}
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PageSection
          title="メンバー別分析"
          description="フィルター条件に一致する案件に参加したメンバーの関与売上と報酬合計です。"
        >
          {analysis.memberSummaries.length ? (
            <div className="space-y-3">
              {analysis.memberSummaries.map((summary) => (
                <div
                  key={summary.memberId}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{summary.memberName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatNumber(summary.dealCount)}案件 / 関与売上{" "}
                        {formatCurrency(summary.involvedSales)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(summary.rewardTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="対象メンバーがいません"
              description="この条件に一致する参加メンバーはいません。"
            />
          )}
        </PageSection>

        <PageSection
          title="商品別分析"
          description="フィルター条件に一致する案件を商品ごとにまとめています。"
        >
          {analysis.productSummaries.length ? (
            <div className="space-y-3">
              {analysis.productSummaries.map((product) => (
                <div
                  key={product.productId}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{product.productName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatNumber(product.dealCount)}案件 / 売価{" "}
                        {formatCurrency(product.totalSales)}
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
              title="対象商品がありません"
              description="この条件に一致する商品別集計はありません。"
            />
          )}
        </PageSection>
      </div>

      <PageSection
        title="案件台帳"
        description="CSVに出す前に、フィルター済みの案件一覧を画面上でも確認できます。"
      >
        {analysis.filteredDeals.length ? (
          <div className="space-y-3">
            {analysis.filteredDeals.map((deal) => (
              <div
                key={deal.dealId}
                className="rounded-xl border border-slate-200 bg-white px-5 py-4"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-slate-900">{deal.productName}</p>
                      <Badge>{deal.pattern}</Badge>
                      {deal.countForCompanyRevenue ? (
                        <Badge tone="teal">会社売上に計上</Badge>
                      ) : (
                        <Badge tone="rose">会社売上に計上しない</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {formatMonthLabel(deal.month)} / {deal.closedOn}
                    </p>
                    <p className="text-sm text-slate-600">
                      売価 {formatCurrency(deal.salePrice)} / 会社取り分{" "}
                      {formatCurrency(deal.companyShare)} / 参加者報酬合計{" "}
                      {formatCurrency(deal.participantRewardTotal)}
                    </p>
                    <p className="text-sm text-slate-600">
                      参加メンバー: {deal.participantNames.join(" / ")}
                    </p>
                    <p className="text-sm text-slate-600">
                      報酬区分: {deal.compensationTypeLabels.join(" / ")}
                    </p>
                    {deal.note ? (
                      <p className="text-sm leading-6 text-slate-600">{deal.note}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="条件に一致する案件がありません"
            description="期間やフィルター条件を調整すると、ここに案件台帳が表示されます。"
          />
        )}
      </PageSection>
    </div>
  );
}
