"use client";

import { Badge, EmptyState, PageSection, StatCard } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { formatCurrency, formatMonthLabel, formatNumber } from "@/lib/format";

export function DashboardScreen() {
  const { currentSnapshot, selectedMonth } = useAppState();
  const salaryRanking = [...currentSnapshot.memberSummaries]
    .filter((summary) => summary.finalSalary !== 0)
    .sort((left, right) => right.finalSalary - left.finalSalary);
  const productRanking = [...currentSnapshot.productSummaries];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label={`${formatMonthLabel(selectedMonth)}の会社全体売上`}
          value={formatCurrency(currentSnapshot.totalSales)}
          caption="案件は1件につき1回だけ集計"
        />
        <StatCard
          label="会社取り分"
          value={formatCurrency(currentSnapshot.totalCompanyShare)}
          caption="個人売上とは分離して管理"
        />
        <StatCard
          label="全体給料合計"
          value={formatCurrency(currentSnapshot.totalSalary)}
          caption="案件報酬・紹介報酬・役員報酬・調整額"
        />
        <StatCard
          label="役員報酬合計"
          value={formatCurrency(currentSnapshot.totalExecutiveReward)}
          caption="会社取り分合計を母数に算出"
        />
      </div>

      {currentSnapshot.warnings.length ? (
        <PageSection title="確認メモ" description="入力不足や計算上の注意点です。">
          <div className="space-y-2">
            {currentSnapshot.warnings.map((warning) => (
              <div
                key={warning}
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {warning}
              </div>
            ))}
          </div>
        </PageSection>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PageSection
          title="メンバー別給料ランキング"
          description="今月の最終給料順です。"
        >
          {salaryRanking.length ? (
            <div className="space-y-2">
              {salaryRanking.map((summary, index) => (
                <div
                  key={summary.memberId}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{summary.memberName}</p>
                      <p className="text-sm text-slate-500">
                        個人売上 {formatCurrency(summary.monthlySales)} / 帯 {summary.appliedBandLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {summary.isExecutive ? <Badge tone="amber">役員</Badge> : null}
                    {summary.referralReward > 0 ? <Badge tone="teal">紹介あり</Badge> : null}
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(summary.finalSalary)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="まだ給料データがありません"
              description="案件やメンバーを登録すると、ここにランキングが表示されます。"
            />
          )}
        </PageSection>

        <PageSection
          title="商品別売上ランキング"
          description="商品ごとの売上と会社取り分です。"
        >
          {productRanking.length ? (
            <div className="space-y-2">
              {productRanking.map((product, index) => (
                <div
                  key={product.productId}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">#{index + 1}</p>
                      <p className="font-medium text-slate-900">{product.productName}</p>
                    </div>
                    <Badge>{product.dealCount}件</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">売上合計</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(product.totalSales)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">会社取り分</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(product.totalCompanyShare)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="まだ商品集計がありません"
              description="案件を登録すると、ここに商品別の集計が表示されます。"
            />
          )}
        </PageSection>
      </div>

      <PageSection
        title="今月の集計メモ"
        description="個人の売上帯判定は、その月に関与した案件の売価合計で見ます。"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">案件報酬合計</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatCurrency(currentSnapshot.totalProjectReward)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">紹介報酬合計</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatCurrency(currentSnapshot.totalReferralReward)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">対象案件数</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatNumber(
                currentSnapshot.productSummaries.reduce(
                  (sum, item) => sum + item.dealCount,
                  0,
                ),
              )}
            </p>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
