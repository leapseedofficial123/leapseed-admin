"use client";

import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import {
  EmptyState,
  Input,
  Label,
  OverlayPanel,
  PageSection,
  Select,
  StatCard,
} from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { downloadCsv } from "@/lib/csv";
import { buildMemberStatementCsvRows } from "@/lib/domain/exports";
import { buildMonthlyStatements, type StatementData } from "@/lib/domain/statements";
import {
  formatCurrency,
  formatDateLabel,
  formatMonthLabel,
  formatPercent,
  formatSignedCurrency,
  parseNumberInput,
  toInputString,
} from "@/lib/format";
import { createId } from "@/lib/ids";

const SHEET_WIDTH = 980;
const STATEMENT_ROW_COUNT = 10;

interface ExpenseFormState {
  id?: string;
  memberId: string;
  amount: string;
  category: string;
  note: string;
}

interface AdjustmentFormState {
  id?: string;
  memberId: string;
  title: string;
  amount: string;
  note: string;
}

function emptyExpenseForm(): ExpenseFormState {
  return { memberId: "", amount: "", category: "", note: "" };
}

function emptyAdjustmentForm(): AdjustmentFormState {
  return { memberId: "", title: "", amount: "", note: "" };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRateLabel(value: string) {
  if (!value || value === "-") {
    return "-";
  }

  return value
    .split(" / ")
    .map((item) => `${item}%`)
    .join(" / ");
}

function buildDisplayRows(statement: StatementData) {
  const rows = statement.detailRows.slice(0, STATEMENT_ROW_COUNT).map((detail, index) => ({
    key: detail.participantId,
    index: index + 1,
    memberName: statement.memberName,
    productName: detail.productName,
    salePrice: formatCurrency(detail.salePrice),
    closedOn: formatDateLabel(detail.closedOn),
    compensationTypeLabel: detail.compensationTypeLabel,
    appliedRate: formatPercent(detail.appliedRate),
    reward: formatCurrency(detail.reward),
  }));

  while (rows.length < STATEMENT_ROW_COUNT) {
    rows.push({
      key: `blank_${rows.length}`,
      index: rows.length + 1,
      memberName: "",
      productName: "",
      salePrice: "",
      closedOn: "",
      compensationTypeLabel: "",
      appliedRate: "",
      reward: "",
    });
  }

  return rows;
}

function SummaryBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SupplementTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="pb-3 pr-4">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}_${index}`} className="border-t border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td key={`${title}_${index}_${cellIndex}`} className="py-3 pr-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatementSheet({ statement }: { statement: StatementData }) {
  const rows = buildDisplayRows(statement);
  const otherRows = [
    ["1", "マネージャー報酬", "-", formatCurrency(statement.executiveReward)],
    ["2", "直紹介報酬", "-", formatCurrency(statement.referralReward)],
  ];

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto rounded-[28px] border border-sky-100 bg-white p-8 shadow-sm" style={{ width: SHEET_WIDTH }}>
        <div className="grid grid-cols-[240px_1fr_230px] items-start gap-6">
          <div className="pt-1">
            <BrandLogo width={170} height={92} priority />
          </div>
          <div className="pt-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Statement</p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[0.08em] text-slate-900">報酬明細</h2>
            <p className="mt-3 text-sm text-slate-500">
              {formatMonthLabel(statement.month)} / 発行日 {formatDateLabel(statement.issueDate)}
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">AABC 報酬率</span>
                <span className="font-semibold text-slate-900">{formatRateLabel(statement.aabcRateLabel)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">ABC 報酬率</span>
                <span className="font-semibold text-slate-900">{formatRateLabel(statement.abcRateLabel)}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-[#b6caee] px-4 py-5 text-center">
              <p className="text-xs tracking-[0.24em] text-slate-600">案件報酬合計</p>
              <p className="mt-2 text-[26px] font-semibold text-slate-900">
                {formatCurrency(statement.projectReward)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">営業報酬（A or B or AC）</p>
            <p className="text-sm text-slate-500">{statement.memberName}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-sky-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#d6eefc] text-slate-700">
                <tr>
                  <th className="px-3 py-3">No.</th>
                  <th className="px-3 py-3">名前</th>
                  <th className="px-3 py-3">商材</th>
                  <th className="px-3 py-3">金額</th>
                  <th className="px-3 py-3">着金日</th>
                  <th className="px-3 py-3">営業形態</th>
                  <th className="px-3 py-3">%</th>
                  <th className="px-3 py-3">報酬</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.key}
                    className={index % 2 === 0 ? "bg-[#eef9ff]" : "bg-white"}
                  >
                    <td className="px-3 py-3">{row.index}</td>
                    <td className="px-3 py-3">{row.memberName}</td>
                    <td className="px-3 py-3">{row.productName}</td>
                    <td className="px-3 py-3">{row.salePrice}</td>
                    <td className="px-3 py-3">{row.closedOn}</td>
                    <td className="px-3 py-3">{row.compensationTypeLabel}</td>
                    <td className="px-3 py-3">{row.appliedRate}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{row.reward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_260px]">
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-900">その他報酬</p>
            <div className="overflow-hidden rounded-2xl border border-sky-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#d6eefc] text-slate-700">
                  <tr>
                    <th className="px-3 py-3">No.</th>
                    <th className="px-3 py-3">名前</th>
                    <th className="px-3 py-3">報酬率</th>
                    <th className="px-3 py-3">報酬</th>
                  </tr>
                </thead>
                <tbody>
                  {otherRows.map((row, index) => (
                    <tr key={row[0]} className={index % 2 === 0 ? "bg-[#eef9ff]" : "bg-white"}>
                      {row.map((cell) => (
                        <td key={`${row[0]}_${cell}`} className="px-3 py-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <SummaryBar label="売上帯" value={statement.appliedBandLabel} />
            <SummaryBar label="調整額" value={formatCurrency(statement.adjustment)} />
            <SummaryBar label="振込予定額" value={formatCurrency(statement.transferAmount)} />
          </div>
        </div>

        <div className="mt-8 rounded-[20px] bg-[#84c9ec] px-6 py-5 text-center text-slate-900">
          <p className="text-sm tracking-[0.22em] text-slate-700">月報酬総額</p>
          <p className="mt-2 text-[34px] font-semibold">{formatCurrency(statement.finalSalary)}</p>
        </div>
      </div>
    </div>
  );
}

function StatementSupplement({ statement }: { statement: StatementData }) {
  const hasSupplement =
    statement.overflowRows.length > 0 ||
    statement.expenseRows.length > 0 ||
    statement.statementAdjustmentRows.length > 0 ||
    statement.adjustment !== 0;

  if (!hasSupplement) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Supplement</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">給与明細の補足</h3>
          <p className="mt-2 text-sm text-slate-500">
            {statement.memberName} / {formatMonthLabel(statement.month)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs text-slate-500">振込予定額</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatCurrency(statement.transferAmount)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SummaryBar label="調整額" value={formatCurrency(statement.adjustment)} />
        <SummaryBar label="個人経費" value={formatCurrency(statement.personalExpense)} />
        <SummaryBar label="明細調整" value={formatSignedCurrency(statement.statementAdjustmentTotal)} />
      </div>

      {statement.overflowRows.length ? (
        <SupplementTable
          title="テンプレート外の案件内訳"
          headers={["No.", "商材", "着金日", "営業形態", "金額", "%", "報酬"]}
          rows={statement.overflowRows.map((row) => [
            String(row.index),
            row.productName,
            formatDateLabel(row.closedOn),
            row.compensationTypeLabel,
            formatCurrency(row.salePrice),
            formatPercent(row.appliedRate),
            formatCurrency(row.reward),
          ])}
        />
      ) : null}

      {statement.expenseRows.length ? (
        <SupplementTable
          title="個人経費"
          headers={["項目", "メモ", "金額"]}
          rows={statement.expenseRows.map((row) => [
            row.category,
            row.note || "メモなし",
            formatCurrency(row.amount),
          ])}
        />
      ) : null}

      {statement.statementAdjustmentRows.length ? (
        <SupplementTable
          title="明細調整"
          headers={["項目", "メモ", "金額"]}
          rows={statement.statementAdjustmentRows.map((row) => [
            row.title,
            row.note || "メモなし",
            formatSignedCurrency(row.amount),
          ])}
        />
      ) : null}
    </div>
  );
}

function printTableHtml(title: string, headers: string[], rows: Array<Array<string>>) {
  return `
    <section class="section">
      <h3>${title}</h3>
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </section>
  `;
}

function renderStatementSheetHtml(statement: StatementData, origin: string) {
  const rows = buildDisplayRows(statement);
  const otherRows = [
    ["1", "マネージャー報酬", "-", formatCurrency(statement.executiveReward)],
    ["2", "直紹介報酬", "-", formatCurrency(statement.referralReward)],
  ];

  return `
    <div class="sheet">
      <div class="sheet-head">
        <div class="logo-wrap"><img class="logo" src="${origin}/branding/leapseed-logo.png" alt="LeapSeed" /></div>
        <div class="title-wrap">
          <p class="eyebrow">Statement</p>
          <h2>報酬明細</h2>
          <p>${formatMonthLabel(statement.month)} / 発行日 ${formatDateLabel(statement.issueDate)}</p>
        </div>
        <div class="rate-stack">
          <div class="rate-box"><span>AABC 報酬率</span><strong>${formatRateLabel(statement.aabcRateLabel)}</strong></div>
          <div class="rate-box"><span>ABC 報酬率</span><strong>${formatRateLabel(statement.abcRateLabel)}</strong></div>
          <div class="amount-box"><span>案件報酬合計</span><strong>${formatCurrency(statement.projectReward)}</strong></div>
        </div>
      </div>

      <section class="section">
        <div class="section-head"><strong>営業報酬（A or B or AC）</strong><span>${escapeHtml(statement.memberName)}</span></div>
        <table class="sheet-table">
          <thead>
            <tr>
              <th>No.</th><th>名前</th><th>商材</th><th>金額</th><th>着金日</th><th>営業形態</th><th>%</th><th>報酬</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row, index) => `
                  <tr class="${index % 2 === 0 ? "blue-row" : "white-row"}">
                    <td>${row.index}</td>
                    <td>${escapeHtml(row.memberName)}</td>
                    <td>${escapeHtml(row.productName)}</td>
                    <td>${row.salePrice}</td>
                    <td>${row.closedOn}</td>
                    <td>${escapeHtml(row.compensationTypeLabel)}</td>
                    <td>${row.appliedRate}</td>
                    <td><strong>${row.reward}</strong></td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>

      <div class="bottom-grid">
        <section class="section">
          <strong>その他報酬</strong>
          <table class="sheet-table small">
            <thead>
              <tr>
                <th>No.</th><th>名前</th><th>報酬率</th><th>報酬</th>
              </tr>
            </thead>
            <tbody>
              ${otherRows
                .map(
                  (row, index) => `
                    <tr class="${index % 2 === 0 ? "blue-row" : "white-row"}">
                      ${row.map((cell) => `<td>${cell}</td>`).join("")}
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </section>

        <div class="summary-col">
          <div class="summary-box"><span>売上帯</span><strong>${escapeHtml(statement.appliedBandLabel)}</strong></div>
          <div class="summary-box"><span>調整額</span><strong>${formatCurrency(statement.adjustment)}</strong></div>
          <div class="summary-box"><span>振込予定額</span><strong>${formatCurrency(statement.transferAmount)}</strong></div>
        </div>
      </div>

      <div class="final-box">
        <span>月報酬総額</span>
        <strong>${formatCurrency(statement.finalSalary)}</strong>
      </div>
    </div>
  `;
}

function renderSupplementHtml(statement: StatementData) {
  const hasSupplement =
    statement.overflowRows.length > 0 ||
    statement.expenseRows.length > 0 ||
    statement.statementAdjustmentRows.length > 0 ||
    statement.adjustment !== 0;

  if (!hasSupplement) {
    return "";
  }

  return `
    <div class="sheet supplement-sheet">
      <div class="supplement-head">
        <div>
          <p class="eyebrow">Supplement</p>
          <h2>給与明細の補足</h2>
          <p>${escapeHtml(statement.memberName)} / ${formatMonthLabel(statement.month)}</p>
        </div>
        <div class="summary-box right">
          <span>振込予定額</span>
          <strong>${formatCurrency(statement.transferAmount)}</strong>
        </div>
      </div>

      <div class="supplement-grid">
        <div class="summary-box"><span>調整額</span><strong>${formatCurrency(statement.adjustment)}</strong></div>
        <div class="summary-box"><span>個人経費</span><strong>${formatCurrency(statement.personalExpense)}</strong></div>
        <div class="summary-box"><span>明細調整</span><strong>${formatSignedCurrency(statement.statementAdjustmentTotal)}</strong></div>
      </div>

      ${statement.overflowRows.length ? printTableHtml("テンプレート外の案件内訳", ["No.", "商材", "着金日", "営業形態", "金額", "%", "報酬"], statement.overflowRows.map((row) => [String(row.index), escapeHtml(row.productName), formatDateLabel(row.closedOn), escapeHtml(row.compensationTypeLabel), formatCurrency(row.salePrice), formatPercent(row.appliedRate), formatCurrency(row.reward)])) : ""}
      ${statement.expenseRows.length ? printTableHtml("個人経費", ["項目", "メモ", "金額"], statement.expenseRows.map((row) => [escapeHtml(row.category), escapeHtml(row.note || "メモなし"), formatCurrency(row.amount)])) : ""}
      ${statement.statementAdjustmentRows.length ? printTableHtml("明細調整", ["項目", "メモ", "金額"], statement.statementAdjustmentRows.map((row) => [escapeHtml(row.title), escapeHtml(row.note || "メモなし"), formatSignedCurrency(row.amount)])) : ""}
    </div>
  `;
}

function openPrintWindow(title: string, statements: StatementData[]) {
  const nextWindow = window.open("", "_blank", "width=1400,height=900");
  if (!nextWindow) {
    return;
  }

  nextWindow.document.write(`
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <base href="${origin}/" />
        <style>
          @page { size: A4; margin: 10mm; }
          body { margin: 0; font-family: "Yu Gothic", "Yu Gothic UI", sans-serif; color: #0f172a; background: white; }
          .sheet { width: 190mm; margin: 0 auto 8mm; border: 1px solid #d8eaf7; border-radius: 28px; padding: 9mm; box-sizing: border-box; page-break-after: always; }
          .sheet-head { display: grid; grid-template-columns: 46mm 1fr 44mm; gap: 6mm; align-items: start; }
          .logo { width: 42mm; height: auto; }
          .title-wrap { padding-top: 3mm; text-align: center; }
          .title-wrap h2 { margin: 3mm 0 0; font-size: 22px; letter-spacing: .08em; }
          .title-wrap p { margin: 3mm 0 0; font-size: 11px; color: #64748b; }
          .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: .28em; font-size: 10px; color: #94a3b8; }
          .rate-stack { display: grid; gap: 3mm; }
          .rate-box, .summary-box { border: 1px solid #d8eaf7; background: #f0f9ff; border-radius: 12px; padding: 3mm; }
          .rate-box { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
          .amount-box { background: #b6caee; border-radius: 16px; padding: 4mm 3mm; text-align: center; }
          .amount-box span, .summary-box span, .final-box span { display: block; font-size: 10px; color: #475569; letter-spacing: .18em; }
          .amount-box strong { display: block; margin-top: 2mm; font-size: 22px; color: #0f172a; }
          .section { margin-top: 7mm; }
          .section-head { display: flex; justify-content: space-between; gap: 4mm; margin-bottom: 2.5mm; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { padding: 2.2mm 2.5mm; text-align: left; vertical-align: top; }
          thead th { background: #d6eefc; color: #334155; font-weight: 600; }
          .blue-row td { background: #eef9ff; }
          .white-row td { background: #ffffff; }
          .sheet-table { border: 1px solid #d8eaf7; border-radius: 16px; overflow: hidden; }
          .bottom-grid { display: grid; grid-template-columns: 1fr 48mm; gap: 6mm; margin-top: 7mm; }
          .summary-col { display: grid; gap: 3mm; }
          .summary-box strong { display: block; margin-top: 2mm; font-size: 16px; color: #0f172a; }
          .summary-box.right { text-align: right; }
          .final-box { margin-top: 7mm; border-radius: 20px; background: #84c9ec; padding: 4mm; text-align: center; }
          .final-box strong { display: block; margin-top: 2mm; font-size: 28px; color: #0f172a; }
          .supplement-head { display: flex; justify-content: space-between; gap: 6mm; align-items: start; }
          .supplement-head h2 { margin: 3mm 0 0; font-size: 22px; }
          .supplement-head p { margin: 3mm 0 0; font-size: 11px; color: #64748b; }
          .supplement-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 4mm; margin-top: 6mm; }
          .section h3 { margin: 0 0 2.5mm; font-size: 13px; }
        </style>
      </head>
      <body>${statements
        .map((statement) => renderStatementSheetHtml(statement, origin) + renderSupplementHtml(statement))
        .join("")}</body>
    </html>
  `);
  nextWindow.document.close();
  nextWindow.focus();
  window.setTimeout(() => nextWindow.print(), 250);
}

export function StatementsScreen() {
  const {
    store,
    selectedMonth,
    currentSnapshot,
    saveMemberExpense,
    deleteMemberExpense,
    saveStatementAdjustment,
    deleteStatementAdjustment,
  } = useAppState();
  const statements = useMemo(() => buildMonthlyStatements(store, selectedMonth), [store, selectedMonth]);
  const monthExpenses = store.memberExpenses.filter((expense) => expense.month === selectedMonth);
  const monthAdjustments = store.statementAdjustments.filter((adjustment) => adjustment.month === selectedMonth);
  const totalTransferAmount = statements.reduce((sum, statement) => sum + statement.transferAmount, 0);
  const [previewId, setPreviewId] = useState("");
  const [panelMode, setPanelMode] = useState<"expense" | "adjustment" | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(emptyExpenseForm);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>(emptyAdjustmentForm);
  const [error, setError] = useState("");
  const preview = statements.find((statement) => statement.memberId === previewId) ?? null;

  const closePanel = () => {
    setPanelMode(null);
    setExpenseForm(emptyExpenseForm());
    setAdjustmentForm(emptyAdjustmentForm());
    setError("");
  };

  const openExpensePanel = (expenseId?: string) => {
    if (!expenseId) {
      setExpenseForm(emptyExpenseForm());
      setError("");
      setPanelMode("expense");
      return;
    }

    const expense = monthExpenses.find((item) => item.id === expenseId);
    if (!expense) {
      return;
    }

    setExpenseForm({
      id: expense.id,
      memberId: expense.memberId,
      amount: toInputString(expense.amount),
      category: expense.category,
      note: expense.note,
    });
    setError("");
    setPanelMode("expense");
  };

  const openAdjustmentPanel = (adjustmentId?: string) => {
    if (!adjustmentId) {
      setAdjustmentForm(emptyAdjustmentForm());
      setError("");
      setPanelMode("adjustment");
      return;
    }

    const adjustment = monthAdjustments.find((item) => item.id === adjustmentId);
    if (!adjustment) {
      return;
    }

    setAdjustmentForm({
      id: adjustment.id,
      memberId: adjustment.memberId,
      title: adjustment.title,
      amount: toInputString(adjustment.amount),
      note: adjustment.note,
    });
    setError("");
    setPanelMode("adjustment");
  };

  const saveExpense = () => {
    if (!expenseForm.memberId) {
      setError("メンバーを選択してください。");
      return;
    }

    if (parseNumberInput(expenseForm.amount) === 0) {
      setError("金額を入力してください。");
      return;
    }

    saveMemberExpense({
      id: expenseForm.id || createId("expense"),
      month: selectedMonth,
      memberId: expenseForm.memberId,
      amount: parseNumberInput(expenseForm.amount),
      category: expenseForm.category.trim(),
      note: expenseForm.note.trim(),
    });
    closePanel();
  };

  const saveAdjustment = () => {
    if (!adjustmentForm.memberId) {
      setError("メンバーを選択してください。");
      return;
    }

    if (!adjustmentForm.title.trim()) {
      setError("項目名を入力してください。");
      return;
    }

    if (parseNumberInput(adjustmentForm.amount) === 0) {
      setError("金額を入力してください。");
      return;
    }

    saveStatementAdjustment({
      id: adjustmentForm.id || createId("statement_adjustment"),
      month: selectedMonth,
      memberId: adjustmentForm.memberId,
      title: adjustmentForm.title.trim(),
      amount: parseNumberInput(adjustmentForm.amount),
      note: adjustmentForm.note.trim(),
    });
    closePanel();
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="対象月" value={formatMonthLabel(selectedMonth)} />
        <StatCard label="明細対象メンバー数" value={`${statements.length}名`} />
        <StatCard label="最終給料合計" value={formatCurrency(currentSnapshot.totalSalary)} />
        <StatCard label="振込予定額合計" value={formatCurrency(totalTransferAmount)} />
      </div>

      <PageSection
        title="今月の給与明細"
        description="ここが個人ごとの給与明細を出す画面です。ダウンロードや印刷はここから行います。"
        action={
          <button
            type="button"
            onClick={() => openPrintWindow(`${selectedMonth}-給与明細一括`, statements)}
            disabled={!statements.length}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            今月分を一括でPDF保存 / 印刷
          </button>
        }
      >
        {statements.length ? (
          <div className="space-y-3">
            {statements.map((statement) => (
              <div key={statement.memberId} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-900">{statement.memberName}</p>
                    <p className="text-sm text-slate-500">
                      個人売上 {formatCurrency(statement.monthlySales)} / 最終給料 {formatCurrency(statement.finalSalary)} / 振込予定額 {formatCurrency(statement.transferAmount)}
                    </p>
                    <p className="text-sm text-slate-600">
                      個人経費 {formatCurrency(statement.personalExpense)} / 明細調整 {formatSignedCurrency(statement.statementAdjustmentTotal)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPreviewId(statement.memberId)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white">プレビュー</button>
                    <button type="button" onClick={() => openPrintWindow(`${statement.memberName}-${statement.month}-給与明細`, [statement])} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white">PDF保存 / 印刷</button>
                    <button type="button" onClick={() => downloadCsv(`leapseed-statement-${selectedMonth}-${statement.memberName}.csv`, buildMemberStatementCsvRows(store, selectedMonth, statement.memberId))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white">明細CSV</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="今月の給与明細対象がありません" description="成約一覧や明細調整を入れると、ここに対象メンバーが並びます。" />
        )}
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <PageSection
          title="個人経費"
          description="交通費や広告費など、メンバーごとの経費をここで登録します。"
          action={<button type="button" onClick={() => openExpensePanel()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800">個人経費を追加</button>}
        >
          {monthExpenses.length ? (
            <div className="space-y-3">
              {monthExpenses.map((expense) => {
                const member = store.members.find((item) => item.id === expense.memberId);
                return (
                  <div key={expense.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{member?.name ?? "未設定メンバー"}</p>
                        <p className="mt-1 text-sm text-slate-500">{expense.category || "個人経費"} / {formatCurrency(expense.amount)}</p>
                        {expense.note ? <p className="mt-2 text-sm text-slate-600">{expense.note}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openExpensePanel(expense.id)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white">編集</button>
                        <button type="button" onClick={() => deleteMemberExpense(expense.id)} className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50">削除</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState title="今月の個人経費はまだありません" description="この月に支払った個人経費があれば、ここへ追加してください。" />}
        </PageSection>

        <PageSection
          title="明細調整"
          description="貸付、返済、立替清算など、給与計算とは別枠の増減をここで管理します。"
          action={<button type="button" onClick={() => openAdjustmentPanel()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800">明細調整を追加</button>}
        >
          {monthAdjustments.length ? (
            <div className="space-y-3">
              {monthAdjustments.map((adjustment) => {
                const member = store.members.find((item) => item.id === adjustment.memberId);
                return (
                  <div key={adjustment.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{member?.name ?? "未設定メンバー"}</p>
                        <p className="mt-1 text-sm text-slate-500">{adjustment.title} / {formatSignedCurrency(adjustment.amount)}</p>
                        {adjustment.note ? <p className="mt-2 text-sm text-slate-600">{adjustment.note}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openAdjustmentPanel(adjustment.id)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white">編集</button>
                        <button type="button" onClick={() => deleteStatementAdjustment(adjustment.id)} className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50">削除</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState title="今月の明細調整はまだありません" description="貸付や返済などがある場合だけ登録してください。" />}
        </PageSection>
      </div>

      <OverlayPanel
        open={Boolean(preview)}
        title={preview ? `${preview.memberName} の給与明細` : "給与明細"}
        description="このプレビューのまま、PDF保存や印刷へ進めます。"
        onClose={() => setPreviewId("")}
      >
        {preview ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => openPrintWindow(`${preview.memberName}-${preview.month}-給与明細`, [preview])} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800">PDF保存 / 印刷</button>
              <button type="button" onClick={() => downloadCsv(`leapseed-statement-${selectedMonth}-${preview.memberName}.csv`, buildMemberStatementCsvRows(store, selectedMonth, preview.memberId))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100">明細CSV</button>
            </div>
            <StatementSheet statement={preview} />
            <StatementSupplement statement={preview} />
          </div>
        ) : null}
      </OverlayPanel>

      <OverlayPanel
        open={panelMode !== null}
        title={panelMode === "expense" ? (expenseForm.id ? "個人経費を編集" : "個人経費を追加") : adjustmentForm.id ? "明細調整を編集" : "明細調整を追加"}
        description={panelMode === "expense" ? "対象月の個人経費を入力します。" : "貸付や返済などの金額を入力します。"}
        onClose={closePanel}
      >
        {panelMode === "expense" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label required>メンバー</Label>
              <Select value={expenseForm.memberId} onChange={(event) => setExpenseForm((current) => ({ ...current, memberId: event.target.value }))}>
                <option value="">選択してください</option>
                {store.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </Select>
            </div>
            <div>
              <Label required>金額</Label>
              <Input value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} inputMode="numeric" placeholder="12000" />
            </div>
            <div>
              <Label>項目名</Label>
              <Input value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))} placeholder="交通費" />
            </div>
            <div>
              <Label>メモ</Label>
              <Input value={expenseForm.note} onChange={(event) => setExpenseForm((current) => ({ ...current, note: event.target.value }))} placeholder="内容メモ" />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label required>メンバー</Label>
              <Select value={adjustmentForm.memberId} onChange={(event) => setAdjustmentForm((current) => ({ ...current, memberId: event.target.value }))}>
                <option value="">選択してください</option>
                {store.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </Select>
            </div>
            <div>
              <Label required>項目名</Label>
              <Input value={adjustmentForm.title} onChange={(event) => setAdjustmentForm((current) => ({ ...current, title: event.target.value }))} placeholder="貸付返済" />
            </div>
            <div>
              <Label required>金額</Label>
              <Input value={adjustmentForm.amount} onChange={(event) => setAdjustmentForm((current) => ({ ...current, amount: event.target.value }))} inputMode="numeric" placeholder="-20000" />
            </div>
            <div>
              <Label>メモ</Label>
              <Input value={adjustmentForm.note} onChange={(event) => setAdjustmentForm((current) => ({ ...current, note: event.target.value }))} placeholder="内容メモ" />
            </div>
          </div>
        )}

        {error ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={panelMode === "expense" ? saveExpense : saveAdjustment} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm text-white transition hover:bg-slate-800">保存</button>
          <button type="button" onClick={closePanel} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100">キャンセル</button>
        </div>
      </OverlayPanel>
    </>
  );
}
