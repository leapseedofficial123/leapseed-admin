"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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

const TEMPLATE_WIDTH = 1190;
const TEMPLATE_HEIGHT = 1684;
const TEMPLATE_PATH = "/templates/statement-template-page-1.png";
const MAIN_ROWS_Y = [539, 626, 713, 800, 887, 974, 1061, 1148, 1235, 1322];

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

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function left(value: number) {
  return `${(value / TEMPLATE_WIDTH) * 100}%`;
}

function top(value: number) {
  return `${(value / TEMPLATE_HEIGHT) * 100}%`;
}

function positionedHtml(
  content: string,
  x: number,
  y: number,
  width: number,
  align: "left" | "center" | "right" = "left",
  extra = "",
) {
  return `<div class="t" style="left:${left(x)};top:${top(y)};width:${(width / TEMPLATE_WIDTH) * 100}%;text-align:${align};${extra}">${content}</div>`;
}

function OverlayText({
  x,
  y,
  width,
  align = "left",
  bold,
  large,
  children,
}: {
  x: number;
  y: number;
  width: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute text-slate-900 ${bold ? "font-semibold" : ""} ${
        large ? "text-[2vw]" : "text-[1.22vw]"
      }`}
      style={{
        left: left(x),
        top: top(y),
        width: `${(width / TEMPLATE_WIDTH) * 100}%`,
        textAlign: align,
        lineHeight: 1,
      }}
    >
      {children}
    </div>
  );
}

function MiniSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SectionTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string | number>>;
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

function StatementTemplate({ statement }: { statement: StatementData }) {
  const otherRewardTotal = statement.executiveReward + statement.referralReward;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${TEMPLATE_WIDTH} / ${TEMPLATE_HEIGHT}` }}
      >
        <Image
          src={TEMPLATE_PATH}
          alt="給与明細テンプレート"
          fill
          sizes="(max-width: 1024px) 100vw, 900px"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <OverlayText x={873} y={151} width={165} align="right" bold>
          {statement.aabcRateLabel}
        </OverlayText>
        <OverlayText x={873} y={235} width={165} align="right" bold>
          {statement.abcRateLabel}
        </OverlayText>
        <OverlayText x={898} y={321} width={220} align="center" large bold>
          {formatCurrency(statement.projectReward)}
        </OverlayText>

        {statement.templateRows.map((row, index) => (
          <div key={row.id}>
            <OverlayText x={33} y={MAIN_ROWS_Y[index]} width={42} align="center">
              {row.index}
            </OverlayText>
            <OverlayText x={82} y={MAIN_ROWS_Y[index]} width={177}>
              {row.memberName}
            </OverlayText>
            <OverlayText x={275} y={MAIN_ROWS_Y[index]} width={263}>
              {row.productName}
            </OverlayText>
            <OverlayText x={541} y={MAIN_ROWS_Y[index]} width={165} align="right">
              {formatCurrency(row.salePrice)}
            </OverlayText>
            <OverlayText x={702} y={MAIN_ROWS_Y[index]} width={147} align="center">
              {formatDateLabel(row.closedOn)}
            </OverlayText>
            <OverlayText x={846} y={MAIN_ROWS_Y[index]} width={148} align="center">
              {row.compensationTypeLabel}
            </OverlayText>
            <OverlayText x={995} y={MAIN_ROWS_Y[index]} width={58} align="center">
              {formatPercent(row.appliedRate)}
            </OverlayText>
            <OverlayText x={1060} y={MAIN_ROWS_Y[index]} width={109} align="right" bold>
              {formatCurrency(row.reward)}
            </OverlayText>
          </div>
        ))}

        <OverlayText x={431} y={1432} width={250} align="center" bold>
          {formatCurrency(otherRewardTotal)}
        </OverlayText>
        <OverlayText x={93} y={1495} width={200}>
          マネージャー報酬
        </OverlayText>
        <OverlayText x={322} y={1495} width={132} align="center">
          -
        </OverlayText>
        <OverlayText x={465} y={1495} width={194} align="right" bold>
          {formatCurrency(statement.executiveReward)}
        </OverlayText>
        <OverlayText x={93} y={1550} width={200}>
          直紹介報酬
        </OverlayText>
        <OverlayText x={322} y={1550} width={132} align="center">
          -
        </OverlayText>
        <OverlayText x={465} y={1550} width={194} align="right" bold>
          {formatCurrency(statement.referralReward)}
        </OverlayText>
        <OverlayText x={420} y={1635} width={355} align="center" large bold>
          {formatCurrency(statement.finalSalary)}
        </OverlayText>
      </div>
    </div>
  );
}

function StatementSupplement({ statement }: { statement: StatementData }) {
  const hasSupplement =
    statement.overflowRows.length > 0 ||
    statement.adjustment !== 0 ||
    statement.expenseRows.length > 0 ||
    statement.statementAdjustmentRows.length > 0;

  if (!hasSupplement) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
        <MiniSummary label="調整額" value={formatCurrency(statement.adjustment)} />
        <MiniSummary label="個人経費" value={formatCurrency(statement.personalExpense)} />
        <MiniSummary
          label="明細調整"
          value={formatSignedCurrency(statement.statementAdjustmentTotal)}
        />
      </div>

      {statement.overflowRows.length ? (
        <SectionTable
          title="テンプレート外の案件内訳"
          headers={["No.", "商品", "成約日", "形態", "売価", "率", "報酬"]}
          rows={statement.overflowRows.map((row) => [
            row.index,
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
        <SectionTable
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
        <SectionTable
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

function tableHtml(title: string, headers: string[], rows: Array<Array<string | number>>) {
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

function printableHtml(statement: StatementData, origin: string) {
  const otherRewardTotal = statement.executiveReward + statement.referralReward;
  const rows = statement.templateRows
    .map(
      (row, index) => `
        ${positionedHtml(String(row.index), 33, MAIN_ROWS_Y[index], 42, "center")}
        ${positionedHtml(esc(row.memberName), 82, MAIN_ROWS_Y[index], 177)}
        ${positionedHtml(esc(row.productName), 275, MAIN_ROWS_Y[index], 263)}
        ${positionedHtml(formatCurrency(row.salePrice), 541, MAIN_ROWS_Y[index], 165, "right")}
        ${positionedHtml(formatDateLabel(row.closedOn), 702, MAIN_ROWS_Y[index], 147, "center")}
        ${positionedHtml(esc(row.compensationTypeLabel), 846, MAIN_ROWS_Y[index], 148, "center")}
        ${positionedHtml(formatPercent(row.appliedRate), 995, MAIN_ROWS_Y[index], 58, "center")}
        ${positionedHtml(formatCurrency(row.reward), 1060, MAIN_ROWS_Y[index], 109, "right", "font-weight:700;")}
      `,
    )
    .join("");

  const supplement =
    statement.overflowRows.length ||
    statement.adjustment !== 0 ||
    statement.expenseRows.length ||
    statement.statementAdjustmentRows.length
      ? `
        <div class="page supplement">
          <div class="head">
            <div>
              <p class="eyebrow">Supplement</p>
              <h2>給与明細の補足</h2>
              <p>${esc(statement.memberName)} / ${formatMonthLabel(statement.month)}</p>
            </div>
            <div class="box">
              <p>振込予定額</p>
              <strong>${formatCurrency(statement.transferAmount)}</strong>
            </div>
          </div>
          <div class="grid">
            <div class="card"><p>調整額</p><strong>${formatCurrency(statement.adjustment)}</strong></div>
            <div class="card"><p>個人経費</p><strong>${formatCurrency(statement.personalExpense)}</strong></div>
            <div class="card"><p>明細調整</p><strong>${formatSignedCurrency(statement.statementAdjustmentTotal)}</strong></div>
          </div>
          ${statement.overflowRows.length ? tableHtml("テンプレート外の案件内訳", ["No.", "商品", "成約日", "形態", "売価", "率", "報酬"], statement.overflowRows.map((row) => [row.index, esc(row.productName), formatDateLabel(row.closedOn), esc(row.compensationTypeLabel), formatCurrency(row.salePrice), formatPercent(row.appliedRate), formatCurrency(row.reward)])) : ""}
          ${statement.expenseRows.length ? tableHtml("個人経費", ["項目", "メモ", "金額"], statement.expenseRows.map((row) => [esc(row.category), esc(row.note || "メモなし"), formatCurrency(row.amount)])) : ""}
          ${statement.statementAdjustmentRows.length ? tableHtml("明細調整", ["項目", "メモ", "金額"], statement.statementAdjustmentRows.map((row) => [esc(row.title), esc(row.note || "メモなし"), formatSignedCurrency(row.amount)])) : ""}
        </div>
      `
      : "";

  return `
    <div class="page template">
      <img class="bg" src="${origin}${TEMPLATE_PATH}" alt="statement template" />
      ${positionedHtml(esc(statement.aabcRateLabel), 873, 151, 165, "right", "font-weight:700;")}
      ${positionedHtml(esc(statement.abcRateLabel), 873, 235, 165, "right", "font-weight:700;")}
      ${positionedHtml(formatCurrency(statement.projectReward), 898, 321, 220, "center", "font-size:20px;font-weight:700;")}
      ${rows}
      ${positionedHtml(formatCurrency(otherRewardTotal), 431, 1432, 250, "center", "font-weight:700;")}
      ${positionedHtml("マネージャー報酬", 93, 1495, 200)}
      ${positionedHtml("-", 322, 1495, 132, "center")}
      ${positionedHtml(formatCurrency(statement.executiveReward), 465, 1495, 194, "right", "font-weight:700;")}
      ${positionedHtml("直紹介報酬", 93, 1550, 200)}
      ${positionedHtml("-", 322, 1550, 132, "center")}
      ${positionedHtml(formatCurrency(statement.referralReward), 465, 1550, 194, "right", "font-weight:700;")}
      ${positionedHtml(formatCurrency(statement.finalSalary), 420, 1635, 355, "center", "font-size:24px;font-weight:700;")}
    </div>
    ${supplement}
  `;
}

function openPrintWindow(title: string, statements: StatementData[]) {
  const nextWindow = window.open("", "_blank", "width=1200,height=900");
  if (!nextWindow) {
    return;
  }

  const origin = window.location.origin;
  nextWindow.document.write(`
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <title>${esc(title)}</title>
        <style>
          @page { size: A4; margin: 8mm; }
          body { margin: 0; font-family: "Yu Gothic", "Yu Gothic UI", sans-serif; color: #0f172a; background: white; }
          .page { width: 194mm; margin: 0 auto 8mm; page-break-after: always; }
          .template { position: relative; aspect-ratio: ${TEMPLATE_WIDTH} / ${TEMPLATE_HEIGHT}; }
          .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
          .t { position: absolute; font-size: 11px; line-height: 1; }
          .supplement { border: 1px solid #cbd5e1; border-radius: 14px; padding: 18px; box-sizing: border-box; }
          .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
          .head h2 { margin: 8px 0 4px; font-size: 22px; }
          .head p { margin: 0; color: #475569; font-size: 12px; }
          .eyebrow { letter-spacing: .2em; text-transform: uppercase; }
          .box { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 12px; padding: 12px; min-width: 180px; text-align: right; }
          .box strong { display: block; margin-top: 8px; font-size: 20px; color: #0f172a; }
          .grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-top: 18px; }
          .card { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 12px; }
          .card p { margin: 0; font-size: 12px; color: #475569; }
          .card strong { display: block; margin-top: 8px; font-size: 18px; }
          .section { margin-top: 24px; }
          .section h3 { margin: 0 0 10px; font-size: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border-top: 1px solid #e2e8f0; padding: 8px 6px; text-align: left; vertical-align: top; }
          thead th { border-top: none; color: #475569; }
        </style>
      </head>
      <body>${statements.map((statement) => printableHtml(statement, origin)).join("")}</body>
    </html>
  `);
  nextWindow.document.close();
  nextWindow.focus();
  window.setTimeout(() => nextWindow.print(), 300);
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
        description="1枚目はテンプレートと同じレイアウトで、入りきらない内容は補足ページへまとめます。"
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
        description="テンプレート1枚目と補足ページをまとめて確認できます。"
        onClose={() => setPreviewId("")}
      >
        {preview ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => openPrintWindow(`${preview.memberName}-${preview.month}-給与明細`, [preview])} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800">PDF保存 / 印刷</button>
              <button type="button" onClick={() => downloadCsv(`leapseed-statement-${selectedMonth}-${preview.memberName}.csv`, buildMemberStatementCsvRows(store, selectedMonth, preview.memberId))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100">明細CSV</button>
            </div>
            <StatementTemplate statement={preview} />
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
