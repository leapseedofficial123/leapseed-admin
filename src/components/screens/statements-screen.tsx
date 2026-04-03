"use client";

import { useState } from "react";
import { EmptyState, OverlayPanel, PageSection, StatCard } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { downloadCsv } from "@/lib/csv";
import { buildMemberStatementCsvRows } from "@/lib/domain/exports";
import {
  buildMonthlyStatements,
  type StatementData,
} from "@/lib/domain/statements";
import {
  formatCurrency,
  formatDateLabel,
  formatMonthLabel,
  formatPercent,
} from "@/lib/format";

const printStyles = `
  @page { size: A4; margin: 10mm; }
  body { font-family: 'Noto Sans JP', sans-serif; color: #0f172a; margin: 0; background: white; }
  .statement-page { width: 190mm; margin: 0 auto; padding: 8mm 0; box-sizing: border-box; page-break-after: always; }
  .statement-shell { border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; }
  .header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
  .title { font-size: 24px; font-weight: 700; margin: 0; }
  .subtle { color: #475569; font-size: 12px; margin: 0; }
  .grid { display: grid; gap: 12px; }
  .grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; background: #f8fafc; }
  .label { font-size: 11px; color: #64748b; }
  .value { font-size: 18px; font-weight: 700; margin-top: 6px; }
  .section-title { font-size: 13px; font-weight: 700; margin: 18px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-top: 1px solid #e2e8f0; padding: 8px 6px; text-align: left; vertical-align: top; }
  thead th { border-top: none; color: #64748b; font-weight: 600; }
  .final { display: inline-block; background: #0f172a; color: white; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 700; }
`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openPrintWindow(title: string, html: string) {
  const nextWindow = window.open("", "_blank", "width=1200,height=900");

  if (!nextWindow) {
    return;
  }

  nextWindow.document.write(`
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>${printStyles}</style>
      </head>
      <body>${html}</body>
    </html>
  `);
  nextWindow.document.close();
  nextWindow.focus();
  window.setTimeout(() => {
    nextWindow.print();
  }, 200);
}

function renderStatementHtml(statement: StatementData) {
  const groupedRows = statement.groupedRows.length
    ? statement.groupedRows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.compensationTypeLabel)}</td>
              <td>${row.dealCount}</td>
              <td>${formatCurrency(row.salePriceTotal)}</td>
              <td>${formatCurrency(row.companyShareTotal)}</td>
              <td>${row.appliedRates.map((rate) => formatPercent(rate)).join(" / ")}</td>
              <td>${formatCurrency(row.rewardTotal)}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="6">案件報酬はありません。</td></tr>`;
  const detailRows = statement.detailRows.length
    ? statement.detailRows
        .map(
          (row) => `
            <tr>
              <td>${formatDateLabel(row.closedOn)}</td>
              <td>${escapeHtml(row.productName)}</td>
              <td>${escapeHtml(row.compensationTypeLabel)}</td>
              <td>${formatCurrency(row.salePrice)}</td>
              <td>${formatCurrency(row.companyShare)}</td>
              <td>${formatPercent(row.appliedRate)}</td>
              <td>${formatCurrency(row.reward)}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="7">案件はありません。</td></tr>`;
  const referralRows = statement.referralRows.length
    ? statement.referralRows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.referredMemberName)}</td>
              <td>${formatPercent(row.rate)}</td>
              <td>${formatCurrency(row.referredFinalSalary)}</td>
              <td>${formatCurrency(row.reward)}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="4">紹介報酬はありません。</td></tr>`;
  const expenseRows = statement.expenseRows.length
    ? statement.expenseRows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.category)}</td>
              <td>${formatCurrency(row.amount)}</td>
              <td>${escapeHtml(row.note || "")}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="3">個人経費はありません。</td></tr>`;

  return `
    <div class="statement-page">
      <div class="statement-shell">
        <div class="header">
          <div>
            <p class="subtle">LeapSeed</p>
            <h1 class="title">給与明細</h1>
            <p class="subtle">${formatMonthLabel(statement.month)} / 発行日 ${formatDateLabel(statement.issueDate)}</p>
          </div>
          <div>
            <p class="subtle">対象者</p>
            <p class="value">${escapeHtml(statement.memberName)}</p>
            <p class="subtle">適用売上帯 ${escapeHtml(statement.appliedBandLabel)}</p>
          </div>
        </div>

        <div class="grid grid-4">
          <div class="card"><div class="label">個人売上合計</div><div class="value">${formatCurrency(statement.monthlySales)}</div></div>
          <div class="card"><div class="label">案件報酬合計</div><div class="value">${formatCurrency(statement.projectReward)}</div></div>
          <div class="card"><div class="label">紹介報酬</div><div class="value">${formatCurrency(statement.referralReward)}</div></div>
          <div class="card"><div class="label">役員報酬</div><div class="value">${formatCurrency(statement.executiveReward)}</div></div>
        </div>

        <div class="grid grid-4" style="margin-top:12px;">
          <div class="card"><div class="label">調整額</div><div class="value">${formatCurrency(statement.adjustment)}</div></div>
          <div class="card"><div class="label">個人経費</div><div class="value">${formatCurrency(statement.personalExpense)}</div></div>
          <div class="card"><div class="label">案件件数</div><div class="value">${statement.detailRows.length}件</div></div>
          <div class="card"><div class="label">最終給料</div><div class="value"><span class="final">${formatCurrency(statement.finalSalary)}</span></div></div>
        </div>

        <p class="section-title">報酬内訳まとめ</p>
        <table>
          <thead>
            <tr>
              <th>区分</th>
              <th>件数</th>
              <th>売価合計</th>
              <th>会社取り分</th>
              <th>適用率</th>
              <th>報酬額</th>
            </tr>
          </thead>
          <tbody>${groupedRows}</tbody>
        </table>

        <p class="section-title">案件明細</p>
        <table>
          <thead>
            <tr>
              <th>成約日</th>
              <th>商品</th>
              <th>区分</th>
              <th>売価</th>
              <th>会社取り分</th>
              <th>率</th>
              <th>報酬額</th>
            </tr>
          </thead>
          <tbody>${detailRows}</tbody>
        </table>

        <div class="grid grid-2">
          <div>
            <p class="section-title">紹介報酬</p>
            <table>
              <thead>
                <tr>
                  <th>被紹介者</th>
                  <th>率</th>
                  <th>被紹介者最終給料</th>
                  <th>報酬額</th>
                </tr>
              </thead>
              <tbody>${referralRows}</tbody>
            </table>
          </div>
          <div>
            <p class="section-title">個人経費</p>
            <table>
              <thead>
                <tr>
                  <th>区分</th>
                  <th>金額</th>
                  <th>メモ</th>
                </tr>
              </thead>
              <tbody>${expenseRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function StatementCard({ statement }: { statement: StatementData }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Payslip</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">給与明細</h3>
          <p className="mt-2 text-sm text-slate-500">
            {formatMonthLabel(statement.month)} / 発行日 {formatDateLabel(statement.issueDate)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">対象者</p>
          <p className="mt-1 font-semibold text-slate-900">{statement.memberName}</p>
          <p className="mt-1 text-sm text-slate-500">{statement.appliedBandLabel}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <MiniStat label="個人売上合計" value={formatCurrency(statement.monthlySales)} />
        <MiniStat label="案件報酬合計" value={formatCurrency(statement.projectReward)} />
        <MiniStat label="紹介報酬" value={formatCurrency(statement.referralReward)} />
        <MiniStat label="役員報酬" value={formatCurrency(statement.executiveReward)} />
        <MiniStat label="調整額" value={formatCurrency(statement.adjustment)} />
        <MiniStat label="個人経費" value={formatCurrency(statement.personalExpense)} />
        <MiniStat label="案件件数" value={`${statement.detailRows.length}件`} />
        <MiniStat label="最終給料" value={formatCurrency(statement.finalSalary)} strong />
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900">報酬内訳まとめ</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">区分</th>
                  <th className="pb-3 pr-4">件数</th>
                  <th className="pb-3 pr-4">売価合計</th>
                  <th className="pb-3 pr-4">会社取り分</th>
                  <th className="pb-3 pr-4">適用率</th>
                  <th className="pb-3">報酬額</th>
                </tr>
              </thead>
              <tbody>
                {statement.groupedRows.length ? (
                  statement.groupedRows.map((row) => (
                    <tr key={row.compensationTypeId} className="border-t border-slate-100">
                      <td className="py-3 pr-4">{row.compensationTypeLabel}</td>
                      <td className="py-3 pr-4">{row.dealCount}</td>
                      <td className="py-3 pr-4">{formatCurrency(row.salePriceTotal)}</td>
                      <td className="py-3 pr-4">{formatCurrency(row.companyShareTotal)}</td>
                      <td className="py-3 pr-4">
                        {row.appliedRates.map((rate) => formatPercent(rate)).join(" / ")}
                      </td>
                      <td className="py-3 font-semibold text-slate-900">
                        {formatCurrency(row.rewardTotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 text-slate-500" colSpan={6}>
                      案件報酬はありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">紹介報酬</p>
            {statement.referralRows.length ? (
              <div className="mt-3 space-y-2">
                {statement.referralRows.map((row) => (
                  <div key={row.referralId} className="rounded-lg bg-white px-3 py-3 text-sm">
                    <p className="font-medium text-slate-900">{row.referredMemberName}</p>
                    <p className="mt-1 text-slate-500">
                      {formatPercent(row.rate)} / 被紹介者最終給料{" "}
                      {formatCurrency(row.referredFinalSalary)}
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatCurrency(row.reward)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">紹介報酬はありません。</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">個人経費</p>
            {statement.expenseRows.length ? (
              <div className="mt-3 space-y-2">
                {statement.expenseRows.map((row) => (
                  <div key={row.id} className="rounded-lg bg-white px-3 py-3 text-sm">
                    <p className="font-medium text-slate-900">{row.category}</p>
                    <p className="mt-1 text-slate-500">{row.note || "メモなし"}</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatCurrency(row.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">個人経費はありません。</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-semibold text-slate-900">案件明細</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4">成約日</th>
                <th className="pb-3 pr-4">商品</th>
                <th className="pb-3 pr-4">区分</th>
                <th className="pb-3 pr-4">売価</th>
                <th className="pb-3 pr-4">会社取り分</th>
                <th className="pb-3 pr-4">率</th>
                <th className="pb-3">報酬額</th>
              </tr>
            </thead>
            <tbody>
              {statement.detailRows.length ? (
                statement.detailRows.map((row) => (
                  <tr key={row.participantId} className="border-t border-slate-100">
                    <td className="py-3 pr-4">{formatDateLabel(row.closedOn)}</td>
                    <td className="py-3 pr-4">{row.productName}</td>
                    <td className="py-3 pr-4">{row.compensationTypeLabel}</td>
                    <td className="py-3 pr-4">{formatCurrency(row.salePrice)}</td>
                    <td className="py-3 pr-4">{formatCurrency(row.companyShare)}</td>
                    <td className="py-3 pr-4">{formatPercent(row.appliedRate)}</td>
                    <td className="py-3 font-semibold text-slate-900">
                      {formatCurrency(row.reward)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={7}>
                    案件はありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 ${strong ? "text-xl font-semibold" : "font-semibold"} text-slate-900`}>
        {value}
      </p>
    </div>
  );
}

export function StatementsScreen() {
  const { store, selectedMonth, currentSnapshot } = useAppState();
  const statements = buildMonthlyStatements(store, selectedMonth);
  const [previewId, setPreviewId] = useState("");
  const previewStatement =
    statements.find((statement) => statement.memberId === previewId) ?? null;

  const printSingleStatement = (statement: StatementData) => {
    openPrintWindow(
      `${statement.memberName}-${statement.month}-給与明細`,
      renderStatementHtml(statement),
    );
  };

  const printAllStatements = () => {
    if (!statements.length) {
      return;
    }

    openPrintWindow(
      `${selectedMonth}-給与明細一括`,
      statements.map((statement) => renderStatementHtml(statement)).join(""),
    );
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="対象月" value={formatMonthLabel(selectedMonth)} />
        <StatCard label="明細対象人数" value={`${statements.length}名`} />
        <StatCard label="当月の給与合計" value={formatCurrency(currentSnapshot.totalSalary)} />
        <StatCard
          label="当月の個人経費合計"
          value={formatCurrency(currentSnapshot.totalPersonalExpenses)}
        />
      </div>

      <PageSection
        title="今月の給与明細"
        description="売上入力や月次調整から自動で給与明細候補が作られます。ブラウザの印刷機能から PDF 保存できます。"
        action={
          <button
            type="button"
            onClick={printAllStatements}
            disabled={!statements.length}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            一括でPDF保存 / 印刷
          </button>
        }
      >
        {statements.length ? (
          <div className="space-y-3">
            {statements.map((statement) => (
              <div
                key={statement.memberId}
                className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-900">{statement.memberName}</p>
                    <p className="text-sm text-slate-500">
                      個人売上 {formatCurrency(statement.monthlySales)} / 最終給料{" "}
                      {formatCurrency(statement.finalSalary)}
                    </p>
                    <p className="text-sm text-slate-600">
                      案件報酬 {formatCurrency(statement.projectReward)} / 個人経費{" "}
                      {formatCurrency(statement.personalExpense)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewId(statement.memberId)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                    >
                      プレビュー
                    </button>
                    <button
                      type="button"
                      onClick={() => printSingleStatement(statement)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                    >
                      PDF保存 / 印刷
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          `leapseed-statement-${selectedMonth}-${statement.memberName}.csv`,
                          buildMemberStatementCsvRows(store, selectedMonth, statement.memberId),
                        )
                      }
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                    >
                      明細CSV
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="今月の給与明細対象がまだありません"
            description="売上入力や月次調整を入れると、自動でここに給与明細候補が並びます。"
          />
        )}
      </PageSection>

      <OverlayPanel
        open={Boolean(previewStatement)}
        title={previewStatement ? `${previewStatement.memberName} の給与明細` : "給与明細"}
        description="このプレビューを確認したうえで、PDF保存 / 印刷ができます。"
        onClose={() => setPreviewId("")}
      >
        {previewStatement ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => printSingleStatement(previewStatement)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
              >
                PDF保存 / 印刷
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `leapseed-statement-${selectedMonth}-${previewStatement.memberName}.csv`,
                    buildMemberStatementCsvRows(
                      store,
                      selectedMonth,
                      previewStatement.memberId,
                    ),
                  )
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                明細CSV
              </button>
            </div>
            <StatementCard statement={previewStatement} />
          </div>
        ) : null}
      </OverlayPanel>
    </>
  );
}
