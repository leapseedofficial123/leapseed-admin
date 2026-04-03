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
          caption="個人実績売上とは分離して管理"
        />
        <StatCard
          label="全体給料合計"
          value={formatCurrency(currentSnapshot.totalSalary)}
          caption="案件報酬 + 紹介報酬 + 役員報酬 + 調整額"
        />
        <StatCard
          label="役員報酬合計"
          value={formatCurrency(currentSnapshot.totalExecutiveReward)}
          caption="会社取り分合計を母数に算出"
        />
      </div>

      {currentSnapshot.warnings.length ? (
        <PageSection title="確認メモ" description="入力不足や循環参照の可能性をここに出します。">
          <div className="flex flex-col gap-2">
            {currentSnapshot.warnings.map((warning) => (
              <div
                key={warning}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {warning}
              </div>
            ))}
          </div>
        </PageSection>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PageSection
          title="メンバー別給料ランキング"
          description="今月の最終給料順です。"
        >
          {salaryRanking.length ? (
            <div className="space-y-3">
              {salaryRanking.map((summary, index) => (
                <div
                  key={summary.memberId}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{summary.memberName}</p>
                      <p className="text-sm text-slate-500">
                        個人売上 {formatCurrency(summary.monthlySales)} / 帯 {summary.appliedBandLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {summary.isExecutive ? <Badge tone="amber">役員</Badge> : null}
                    {summary.referralReward > 0 ? <Badge tone="teal">紹介あり</Badge> : null}
                    <p className="text-xl font-semibold text-slate-900">
                      {formatCurrency(summary.finalSalary)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="まだ給料ランキングがありません"
              description="案件やメンバーを登録すると、ここに今月の最終給料ランキングが出ます。"
            />
          )}
        </PageSection>

        <PageSection
          title="商品別売上ランキング"
          description="商品ごとの売上と会社取り分を同時に確認できます。"
        >
          {productRanking.length ? (
            <div className="space-y-3">
              {productRanking.map((product, index) => (
                <div
                  key={product.productId}
                  className="rounded-3xl border border-slate-200 bg-white px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">#{index + 1}</p>
                      <p className="font-semibold text-slate-900">{product.productName}</p>
                    </div>
                    <Badge tone="slate">{product.dealCount}件</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">売上合計</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(product.totalSales)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">会社取り分</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(product.totalCompanyShare)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="商品データがまだありません"
              description="商品を登録して案件を入れると、商品別ランキングがここに出ます。"
            />
          )}
        </PageSection>
      </div>

      <PageSection
        title="今月の集計メモ"
        description="個人の売上帯判定は、関わった案件の売価合計で見ます。"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">案件報酬合計</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(currentSnapshot.totalProjectReward)}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">紹介報酬合計</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(currentSnapshot.totalReferralReward)}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">対象案件数</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
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
