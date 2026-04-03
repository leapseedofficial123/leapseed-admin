"use client";

import Link from "next/link";
import { Badge, EmptyState, PageSection, StatCard } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { getRangeLabel } from "@/lib/date";
import { buildPeriodOverview } from "@/lib/domain/payroll";
import { buildMonthlyStatements } from "@/lib/domain/statements";
import { formatCurrency, formatMonthLabel, formatNumber } from "@/lib/format";

export function DashboardScreen() {
  const {
    store,
    currentSnapshot,
    selectedMonth,
    analysisMonths,
    analysisRangeMode,
    companyTrend,
  } = useAppState();
  const periodMonths = analysisMonths.length ? analysisMonths : [selectedMonth];
  const periodOverview = buildPeriodOverview(store, periodMonths);
  const statements = buildMonthlyStatements(store, selectedMonth);
  const salaryRanking = [...currentSnapshot.memberSummaries]
    .filter((summary) => summary.finalSalary !== 0)
    .sort((left, right) => right.finalSalary - left.finalSalary);
  const productRanking = [...currentSnapshot.productSummaries];
  const recentTrend = [...companyTrend]
    .sort((left, right) => right.month.localeCompare(left.month))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageSection
        title="現在の表示範囲"
        description="左メニューの対象月と表示期間を切り替えると、ダッシュボードと分析の見え方が連動します。"
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

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="会社売上"
          value={formatCurrency(periodOverview.totalSales)}
          caption={`${periodOverview.months.length}か月分を集計`}
        />
        <StatCard
          label="会社取り分"
          value={formatCurrency(periodOverview.totalCompanyShare)}
          caption="報酬計算のベース"
        />
        <StatCard
          label="全体給料合計"
          value={formatCurrency(periodOverview.totalSalary)}
          caption="案件報酬・紹介報酬・役員報酬・調整額込み"
        />
        <StatCard
          label="利益"
          value={formatCurrency(periodOverview.profit)}
          caption="会社取り分 - 全体給料 - 会社経費"
        />
      </div>

      {currentSnapshot.warnings.length ? (
        <PageSection
          title="確認メモ"
          description="入力不足や計算上の注意点がある場合に表示します。"
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

      <PageSection
        title="よく使う画面"
        description="毎月の運用で頻繁に使う画面を上にまとめています。"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href: "/deals",
              title: "売上入力",
              description: "成約した案件を1件ずつ登録します。月末にまとめて入力しても大丈夫です。",
            },
            {
              href: "/statements",
              title: "給与明細",
              description: "今月の明細を一覧で確認し、PDF保存や明細CSV出力ができます。",
            },
            {
              href: "/monthly",
              title: "月次集計",
              description: "役員報酬、調整額、個人経費を含めて最終給料を確認します。",
            },
            {
              href: "/company",
              title: "分析",
              description: "月別・3か月・年間で売上や利益を見える化し、CSV出力できます。",
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
        description="売上入力や月次調整を更新すると、自動でここに今月の明細対象メンバーが並びます。"
        action={
          <Link
            href="/statements"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            給与明細一覧へ
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
                    {formatCurrency(statement.finalSalary)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/statements"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                  >
                    明細を開く
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="今月の給与明細対象はまだありません"
            description="売上入力や月次調整を入れると、自動で給与明細の候補が作られます。"
          />
        )}
      </PageSection>

      <PageSection
        title="直近の月次推移"
        description="会社売上と利益の流れを直近6か月で確認できます。"
      >
        {recentTrend.length ? (
          <div className="space-y-3">
            {recentTrend.map((point) => (
              <div
                key={point.month}
                className="rounded-xl border border-slate-200 bg-white px-5 py-4"
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
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(point.totalSales)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">会社取り分</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(point.totalCompanyShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">全体給料</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(point.totalSalary)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">利益</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(point.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="月次推移データがまだありません"
            description="売上入力と会社設定を入れていくと、ここに月次の流れが表示されます。"
          />
        )}
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PageSection title="メンバー別ランキング" description="今月の最終給料順です。">
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
                    {summary.referralReward > 0 ? <Badge tone="teal">紹介報酬あり</Badge> : null}
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
              description="売上入力を進めると、ここにメンバー別のランキングが表示されます。"
            />
          )}
        </PageSection>

        <PageSection title="商品別ランキング" description="今月の売上上位商品です。">
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
              title="まだ商品別集計がありません"
              description="売上入力を進めると、ここに商品ごとの集計が表示されます。"
            />
          )}
        </PageSection>
      </div>

      <PageSection title="今月の集計メモ" description="今月の報酬内訳をまとめています。">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">案件報酬合計</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatCurrency(currentSnapshot.totalProjectReward)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">直紹介報酬合計</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatCurrency(currentSnapshot.totalReferralReward)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">役員報酬合計</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatCurrency(currentSnapshot.totalExecutiveReward)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">案件数</p>
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
