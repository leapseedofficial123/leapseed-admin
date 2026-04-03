"use client";

import { Badge, EmptyState, PageSection, StatCard } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { formatCurrency, formatMonthLabel } from "@/lib/format";

export function CompanyScreen() {
  const { selectedMonth, currentSnapshot, companyTrend } = useAppState();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label={`${formatMonthLabel(selectedMonth)}の会社全体売上`}
          value={formatCurrency(currentSnapshot.totalSales)}
          caption="重複計上しない案件売上"
        />
        <StatCard
          label="会社取り分合計"
          value={formatCurrency(currentSnapshot.totalCompanyShare)}
          caption="役員報酬の母数"
        />
        <StatCard
          label="全体経費"
          value={formatCurrency(currentSnapshot.expenses)}
          caption="月次会社設定から入力"
        />
        <StatCard
          label="全体利益"
          value={formatCurrency(currentSnapshot.profit)}
          caption="会社取り分 - 全体給料 - 経費"
        />
      </div>

      <PageSection
        title="商品別集計"
        description="表示中の月の商品別売上、会社取り分、件数です。"
      >
        {currentSnapshot.productSummaries.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">商品</th>
                  <th className="pb-3 pr-4">件数</th>
                  <th className="pb-3 pr-4">売上合計</th>
                  <th className="pb-3">会社取り分合計</th>
                </tr>
              </thead>
              <tbody>
                {currentSnapshot.productSummaries.map((product) => (
                  <tr key={product.productId} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">{product.productName}</td>
                    <td className="py-3 pr-4">{product.dealCount}件</td>
                    <td className="py-3 pr-4">{formatCurrency(product.totalSales)}</td>
                    <td className="py-3 font-semibold text-slate-900">
                      {formatCurrency(product.totalCompanyShare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="商品別集計がまだありません"
            description="案件を入れるとここに商品別の集計が表示されます。"
          />
        )}
      </PageSection>

      <PageSection title="月別推移" description="売上、会社取り分、全体給料、利益の推移です。">
        {companyTrend.length ? (
          <div className="space-y-3">
            {companyTrend.map((point) => (
              <div
                key={point.month}
                className="rounded-3xl border border-slate-200 bg-white px-5 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-900">
                      {formatMonthLabel(point.month)}
                    </p>
                    {point.month === selectedMonth ? <Badge tone="teal">表示中</Badge> : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-500">売上</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(point.totalSales)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">会社取り分</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(point.totalCompanyShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">全体給料</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(point.totalSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">利益</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(point.profit)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="月別推移がまだありません"
            description="月ごとの案件や経費を入れると、ここに推移が並びます。"
          />
        )}
      </PageSection>
    </div>
  );
}
