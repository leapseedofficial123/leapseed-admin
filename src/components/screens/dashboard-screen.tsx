"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Badge, EmptyState, PageSection, StatCard } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { getRangeLabel } from "@/lib/date";
import { buildPeriodOverview } from "@/lib/domain/payroll";
import { buildMonthlyStatements } from "@/lib/domain/statements";
import { formatCurrency, formatMonthLabel } from "@/lib/format";

export function DashboardScreen() {
  const { store, currentSnapshot, selectedMonth, analysisMonths, analysisRangeMode, companyTrend } =
    useAppState();
  const periodOverview = buildPeriodOverview(store, analysisMonths);
  const statements = buildMonthlyStatements(store, selectedMonth);
  const salaryRanking = [...currentSnapshot.memberSummaries]
    .filter((summary) => summary.finalSalary !== 0 || summary.personalExpense !== 0)
    .sort((left, right) => right.finalSalary - left.finalSalary);
  const productRanking = [...currentSnapshot.productSummaries];
  const recentTrend = [...companyTrend]
    .sort((left, right) => right.month.localeCompare(left.month))
    .slice(0, 6);
  const periodModeLabel =
    analysisRangeMode === "month"
      ? "単月"
      : analysisRangeMode === "quarter"
        ? "3か月"
        : analysisRangeMode === "halfyear"
          ? "半年"
          : "年間";

  return (
    <div className="space-y-6">
      <PageSection
        title="今月のメイン導線"
        description="日々の運用は、成約一覧で入力して、給与明細で出力し、最後に最終集計で確認する流れです。"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo width={150} height={78} />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <Badge tone="teal">基準月 {formatMonthLabel(selectedMonth)}</Badge>
                <Badge>{periodModeLabel}</Badge>
                <span>{getRangeLabel(selectedMonth, analysisRangeMode)}</span>
              </div>
              <p className="text-sm text-slate-600">
                毎月使うのは `成約一覧` `給与明細` `最終集計` の3つです。
              </p>
            </div>
          </div>
        </div>
      </PageSection>

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard
          label="会社全体売上"
          value={formatCurrency(periodOverview.totalSales)}
          caption={`${periodOverview.months.length}か月分の集計`}
        />
        <StatCard
          label="会社取り分"
          value={formatCurrency(periodOverview.totalCompanyShare)}
          caption="給与計算の元になる金額"
        />
        <StatCard
          label="全体給料合計"
          value={formatCurrency(periodOverview.totalSalary)}
          caption="案件報酬 + 直紹介報酬 + 役員報酬 + 調整額"
        />
        <StatCard
          label="会社経費"
          value={formatCurrency(periodOverview.expenses)}
          caption="固定経費 + 個人経費"
        />
        <StatCard
          label="利益"
          value={formatCurrency(periodOverview.profit)}
          caption="会社取り分 - 全体給料合計 - 会社経費"
        />
      </div>

      {currentSnapshot.warnings.length ? (
        <PageSection
          title="確認メモ"
          description="計算前に見直した方がよい入力や参照切れです。"
        >
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

      <PageSection title="毎月使う画面" description="メイン導線だけを並べています。">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              href: "/deals",
              title: "成約一覧",
              description: "この月に成約した案件を1件ずつ追加します。",
            },
            {
              href: "/statements",
              title: "給与明細",
              description: "個人経費や貸付返済もここで入れながら、明細を出力します。",
            },
            {
              href: "/monthly",
              title: "最終集計",
              description: "今月の全員分の最終結果を一覧で確認します。",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white"
            >
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="今月の給与明細"
        description="ここで見るのは対象メンバー一覧です。実際のダウンロードは給与明細ページで行います。"
        action={
          <Link
            href="/statements"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            給与明細へ
          </Link>
        }
      >
        {statements.length ? (
          <div className="space-y-3">
            {statements.map((statement) => (
              <div
                key={statement.memberId}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{statement.memberName}</p>
                    <Badge tone="teal">{formatMonthLabel(statement.month)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    個人売上 {formatCurrency(statement.monthlySales)} / 最終給料{" "}
                    {formatCurrency(statement.finalSalary)} / 振込予定額{" "}
                    {formatCurrency(statement.transferAmount)}
                  </p>
                </div>
                <Link
                  href="/statements"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                >
                  明細を開く
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="今月の給与明細対象がありません"
            description="成約一覧や明細調整を入れると、ここに対象メンバーが並びます。"
          />
        )}
      </PageSection>

      <PageSection title="直近の月次推移" description="売上、会社経費、利益を直近6か月で見られます。">
        {recentTrend.length ? (
          <div className="space-y-3">
            {recentTrend.map((point) => (
              <div key={point.month} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
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
                      <p className="text-xs text-slate-500">給料合計</p>
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
            title="月次推移データがありません"
            description="成約や会社経費を入れると、ここで推移が見えるようになります。"
          />
        )}
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PageSection title="メンバー給与ランキング" description="今月の最終給料順です。">
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
                        売上 {formatCurrency(summary.monthlySales)} / 個人経費{" "}
                        {formatCurrency(summary.personalExpense)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {summary.isExecutive ? <Badge tone="amber">役員</Badge> : null}
                    {summary.referralReward > 0 ? <Badge tone="teal">直紹介あり</Badge> : null}
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(summary.finalSalary)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="まだ給与データがありません"
              description="成約を入力すると、ここにメンバーごとの順位が表示されます。"
            />
          )}
        </PageSection>

        <PageSection title="商品別ランキング" description="今月の売上と会社取り分です。">
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
                      <p className="text-xs text-slate-500">売価合計</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(product.totalSales)}</p>
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
              title="商品別の集計はまだありません"
              description="成約を入力すると、ここで商品ごとの動きが見えます。"
            />
          )}
        </PageSection>
      </div>
    </div>
  );
}
