"use client";

import { EmptyState, PageSection, StatCard } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { downloadCsv } from "@/lib/csv";
import { buildMemberStatementCsvRows, buildMonthlyPayrollCsvRows } from "@/lib/domain/exports";
import { formatCurrency, formatDateLabel, formatMonthLabel, formatPercent } from "@/lib/format";

export function MonthlyScreen() {
  const { store, selectedMonth, currentSnapshot } = useAppState();
  const payrollCsvRows = buildMonthlyPayrollCsvRows(store, selectedMonth);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="対象月" value={formatMonthLabel(selectedMonth)} />
        <StatCard label="集計対象メンバー数" value={`${currentSnapshot.memberSummaries.length}名`} />
        <StatCard label="全体給料合計" value={formatCurrency(currentSnapshot.totalSalary)} />
        <StatCard label="会社経費" value={formatCurrency(currentSnapshot.expenses)} />
      </div>

      <PageSection
        title="最終集計"
        description="月末の最終確認用です。個人経費や貸付返済などの入力は給与明細ページで行えます。"
        action={
          <button
            type="button"
            onClick={() => downloadCsv(`leapseed-payroll-${selectedMonth}.csv`, payrollCsvRows)}
            disabled={!payrollCsvRows.length}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            月次給与サマリーCSV
          </button>
        }
      >
        {currentSnapshot.memberSummaries.length ? (
          <div className="space-y-4">
            {currentSnapshot.memberSummaries.map((summary) => (
              <details key={summary.memberId} className="rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer px-5 py-5">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_repeat(6,minmax(0,1fr))]">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{summary.memberName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        個人売上 {formatCurrency(summary.monthlySales)} / 売上帯 {summary.appliedBandLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">案件報酬</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatCurrency(summary.projectReward)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">直紹介報酬</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatCurrency(summary.referralReward)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">役員報酬</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatCurrency(summary.executiveReward)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">調整額</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatCurrency(summary.adjustment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">個人経費</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatCurrency(summary.personalExpense)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">最終給料</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        {formatCurrency(summary.finalSalary)}
                      </p>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-slate-200 px-5 py-5">
                  <div className="mb-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          `leapseed-statement-${selectedMonth}-${summary.memberName}.csv`,
                          buildMemberStatementCsvRows(store, selectedMonth, summary.memberId),
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      このメンバーの明細CSV
                    </button>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div>
                      <p className="mb-3 text-sm font-semibold text-slate-900">案件報酬の内訳</p>
                      {summary.dealDetails.length ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead className="text-slate-500">
                              <tr>
                                <th className="pb-3 pr-4">成約日</th>
                                <th className="pb-3 pr-4">商品</th>
                                <th className="pb-3 pr-4">報酬区分</th>
                                <th className="pb-3 pr-4">売価</th>
                                <th className="pb-3 pr-4">会社取り分</th>
                                <th className="pb-3 pr-4">率</th>
                                <th className="pb-3">報酬</th>
                              </tr>
                            </thead>
                            <tbody>
                              {summary.dealDetails.map((detail) => (
                                <tr key={detail.participantId} className="border-t border-slate-100">
                                  <td className="py-3 pr-4">{formatDateLabel(detail.closedOn)}</td>
                                  <td className="py-3 pr-4">{detail.productName}</td>
                                  <td className="py-3 pr-4">{detail.compensationTypeLabel}</td>
                                  <td className="py-3 pr-4">{formatCurrency(detail.salePrice)}</td>
                                  <td className="py-3 pr-4">{formatCurrency(detail.companyShare)}</td>
                                  <td className="py-3 pr-4">{formatPercent(detail.appliedRate)}</td>
                                  <td className="py-3 font-semibold text-slate-900">
                                    {formatCurrency(detail.reward)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <EmptyState
                          title="案件報酬の内訳はありません"
                          description="この月の成約参加がありません。"
                        />
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-xl bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-900">直紹介報酬の内訳</p>
                        {summary.referralDetails.length ? (
                          <div className="mt-3 space-y-3">
                            {summary.referralDetails.map((detail) => (
                              <div key={detail.referralId} className="rounded-lg bg-white px-4 py-3">
                                <p className="font-medium text-slate-900">{detail.referredMemberName}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                  最終給料 {formatCurrency(detail.referredFinalSalary)} ×{" "}
                                  {formatPercent(detail.rate)}
                                </p>
                                <p className="mt-2 font-semibold text-slate-900">
                                  {formatCurrency(detail.reward)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">直紹介報酬はありません。</p>
                        )}
                      </div>

                      <div className="rounded-xl bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-900">集計サマリー</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                          <p>売上帯: {summary.appliedBandLabel}</p>
                          <p>案件報酬: {formatCurrency(summary.projectReward)}</p>
                          <p>直紹介報酬: {formatCurrency(summary.referralReward)}</p>
                          <p>役員報酬: {formatCurrency(summary.executiveReward)}</p>
                          <p>調整額: {formatCurrency(summary.adjustment)}</p>
                          <p>個人経費: {formatCurrency(summary.personalExpense)}</p>
                          <p>最終給料: {formatCurrency(summary.finalSalary)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="まだ月次集計データがありません"
            description="成約一覧または給与明細の入力を進めると、ここで確認できます。"
          />
        )}
      </PageSection>
    </div>
  );
}
