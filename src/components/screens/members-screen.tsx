"use client";

import { useMemo, useState } from "react";
import { ANALYSIS_RANGE_OPTIONS } from "@/lib/constants";
import {
  Badge,
  EmptyState,
  Input,
  InputWithSuffix,
  Label,
  OverlayPanel,
  PageSection,
  Select,
  Textarea,
} from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { downloadCsv } from "@/lib/csv";
import { buildMemberHistory } from "@/lib/domain/analysis";
import {
  buildMemberHistoryCsvRows,
  buildMemberStatementCsvRows,
} from "@/lib/domain/exports";
import {
  formatCurrency,
  formatPercent,
  parseNumberInput,
  parsePercentInput,
  toInputString,
  toPercentInputString,
} from "@/lib/format";
import { createId } from "@/lib/ids";
import { getRangeAnchorMonths, getRangeLabel, getRangeMonths } from "@/lib/date";
import type { AnalysisRangeMode } from "@/types/app";

interface MemberFormState {
  id?: string;
  name: string;
  displayOrder: string;
  isActive: boolean;
  isExecutive: boolean;
  executiveCompensationRate: string;
  defaultReferralRate: string;
  note: string;
}

function createEmptyMemberForm(nextOrder: number): MemberFormState {
  return {
    name: "",
    displayOrder: String(nextOrder),
    isActive: true,
    isExecutive: false,
    executiveCompensationRate: "",
    defaultReferralRate: "10",
    note: "",
  };
}

export function MembersScreen() {
  const {
    store,
    selectedMonth,
    setSelectedMonth,
    trackedMonths,
    analysisRangeMode,
    setAnalysisRangeMode,
    currentSnapshot,
    saveMember,
    deleteMember,
  } = useAppState();
  const [panelMode, setPanelMode] = useState<"edit" | "history" | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [form, setForm] = useState<MemberFormState>(() =>
    createEmptyMemberForm(store.members.length + 1),
  );
  const [error, setError] = useState("");

  const selectedMember = store.members.find((member) => member.id === selectedMemberId);
  const selectedMemberCurrentSummary = currentSnapshot.memberSummaries.find(
    (summary) => summary.memberId === selectedMemberId,
  );
  const historyRangeAnchors = getRangeAnchorMonths(
    trackedMonths,
    analysisRangeMode,
    selectedMonth,
  );
  const visibleHistoryMonths = getRangeMonths(selectedMonth, analysisRangeMode);
  const selectedMemberHistory = useMemo(
    () =>
      selectedMemberId ? buildMemberHistory(store, selectedMemberId) : { monthlyRows: [], yearlyRows: [], memberId: "" },
    [selectedMemberId, store],
  );
  const filteredHistory = useMemo(() => {
    const monthSet = new Set(visibleHistoryMonths);
    const monthlyRows = selectedMemberHistory.monthlyRows.filter((row) => monthSet.has(row.month));
    const yearlyMap = monthlyRows.reduce<Record<string, (typeof selectedMemberHistory.yearlyRows)[number]>>(
      (accumulator, row) => {
        if (!accumulator[row.year]) {
          accumulator[row.year] = {
            year: row.year,
            dealCount: 0,
            monthlySales: 0,
            projectReward: 0,
            referralReward: 0,
            executiveReward: 0,
            adjustment: 0,
            personalExpense: 0,
            finalSalary: 0,
          };
        }

        accumulator[row.year].dealCount += row.dealCount;
        accumulator[row.year].monthlySales += row.monthlySales;
        accumulator[row.year].projectReward += row.projectReward;
        accumulator[row.year].referralReward += row.referralReward;
        accumulator[row.year].executiveReward += row.executiveReward;
        accumulator[row.year].adjustment += row.adjustment;
        accumulator[row.year].personalExpense += row.personalExpense;
        accumulator[row.year].finalSalary += row.finalSalary;
        return accumulator;
      },
      {},
    );

    return {
      monthlyRows,
      yearlyRows: Object.values(yearlyMap).sort((left, right) => right.year.localeCompare(left.year)),
      totals: monthlyRows.reduce(
        (sum, row) => ({
          dealCount: sum.dealCount + row.dealCount,
          monthlySales: sum.monthlySales + row.monthlySales,
          projectReward: sum.projectReward + row.projectReward,
          referralReward: sum.referralReward + row.referralReward,
          executiveReward: sum.executiveReward + row.executiveReward,
          adjustment: sum.adjustment + row.adjustment,
          personalExpense: sum.personalExpense + row.personalExpense,
          finalSalary: sum.finalSalary + row.finalSalary,
        }),
        {
          dealCount: 0,
          monthlySales: 0,
          projectReward: 0,
          referralReward: 0,
          executiveReward: 0,
          adjustment: 0,
          personalExpense: 0,
          finalSalary: 0,
        },
      ),
    };
  }, [selectedMemberHistory, visibleHistoryMonths]);

  const resetForm = () => {
    setForm(createEmptyMemberForm(store.members.length + 1));
    setError("");
  };

  const closePanel = () => {
    setPanelMode(null);
    setSelectedMemberId("");
    resetForm();
  };

  const openCreatePanel = () => {
    setSelectedMemberId("");
    resetForm();
    setPanelMode("edit");
  };

  const openEditPanel = (memberId: string) => {
    const member = store.members.find((item) => item.id === memberId);
    if (!member) {
      return;
    }

    setSelectedMemberId(member.id);
    setForm({
      id: member.id,
      name: member.name,
      displayOrder: toInputString(member.displayOrder),
      isActive: member.isActive,
      isExecutive: member.isExecutive,
      executiveCompensationRate: toPercentInputString(member.executiveCompensationRate),
      defaultReferralRate: toPercentInputString(member.defaultReferralRate),
      note: member.note,
    });
    setError("");
    setPanelMode("edit");
  };

  const openHistoryPanel = (memberId: string) => {
    setSelectedMemberId(memberId);
    setPanelMode("history");
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("メンバー名を入力してください。");
      return;
    }

    saveMember({
      id: form.id || createId("member"),
      name: form.name.trim(),
      displayOrder: parseNumberInput(form.displayOrder) || store.members.length + 1,
      isActive: form.isActive,
      isExecutive: form.isExecutive,
      executiveCompensationRate: parsePercentInput(form.executiveCompensationRate),
      defaultReferralRate: parsePercentInput(form.defaultReferralRate) || 0.1,
      note: form.note.trim(),
    });

    closePanel();
  };

  return (
    <>
      <PageSection
        title="メンバー一覧"
        description="メンバー登録に加えて、各メンバーの月次・年次の売上履歴と給与履歴もここから確認できます。"
        action={
          <button
            type="button"
            onClick={openCreatePanel}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            メンバーを追加
          </button>
        }
      >
        {store.members.length ? (
          <div className="space-y-3">
            {[...store.members]
              .sort((left, right) => left.displayOrder - right.displayOrder)
              .map((member) => {
                const summary = currentSnapshot.memberSummaries.find(
                  (item) => item.memberId === member.id,
                );

                return (
                  <div
                    key={member.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">{member.name}</p>
                          <Badge tone={member.isActive ? "teal" : "rose"}>
                            {member.isActive ? "在籍中" : "休止"}
                          </Badge>
                          {member.isExecutive ? <Badge tone="amber">役員</Badge> : null}
                        </div>
                        <p className="text-sm text-slate-500">
                          表示順 {member.displayOrder} / 直紹介初期率{" "}
                          {formatPercent(member.defaultReferralRate)}
                          {member.isExecutive
                            ? ` / 役員報酬率 ${formatPercent(member.executiveCompensationRate)}`
                            : ""}
                        </p>
                        <p className="text-sm text-slate-600">
                          今月売上 {formatCurrency(summary?.monthlySales ?? 0)} / 今月最終給料{" "}
                          {formatCurrency(summary?.finalSalary ?? 0)}
                        </p>
                        {member.note ? (
                          <p className="text-sm leading-6 text-slate-600">{member.note}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openHistoryPanel(member.id)}
                          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white sm:w-auto"
                        >
                          履歴
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditPanel(member.id)}
                          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white sm:w-auto"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMember(member.id)}
                          className="w-full rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50 sm:w-auto"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <EmptyState
            title="メンバーがまだ登録されていません"
            description="まずはメンバーを追加してください。"
          />
        )}
      </PageSection>

      <OverlayPanel
        open={panelMode === "edit"}
        title={form.id ? "メンバーを編集" : "メンバーを登録"}
        description="在籍状況、役員設定、直紹介の初期率までまとめて登録できます。"
        onClose={closePanel}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label required>名前</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="例: 田中 太郎"
            />
          </div>
          <div>
            <Label>表示順</Label>
            <Input
              value={form.displayOrder}
              onChange={(event) =>
                setForm((current) => ({ ...current, displayOrder: event.target.value }))
              }
              inputMode="numeric"
            />
          </div>
          <div>
            <Label>在籍状態</Label>
            <Select
              value={form.isActive ? "active" : "inactive"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.value === "active",
                }))
              }
            >
              <option value="active">在籍中</option>
              <option value="inactive">休止</option>
            </Select>
          </div>
          <div>
            <Label>役員フラグ</Label>
            <Select
              value={form.isExecutive ? "yes" : "no"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isExecutive: event.target.value === "yes",
                }))
              }
            >
              <option value="no">一般メンバー</option>
              <option value="yes">役員</option>
            </Select>
          </div>
          <div>
            <Label>役員報酬率</Label>
            <InputWithSuffix
              value={form.executiveCompensationRate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  executiveCompensationRate: event.target.value,
                }))
              }
              inputMode="decimal"
              placeholder="1"
              suffix="%"
            />
          </div>
          <div>
            <Label>直紹介報酬率の初期値</Label>
            <InputWithSuffix
              value={form.defaultReferralRate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultReferralRate: event.target.value,
                }))
              }
              inputMode="decimal"
              placeholder="10"
              suffix="%"
            />
          </div>
          <div className="md:col-span-2">
            <Label>メモ</Label>
            <Textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="補足があれば記入"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm text-white transition hover:bg-slate-800 sm:w-auto"
          >
            保存
          </button>
          <button
            type="button"
            onClick={closePanel}
            className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100 sm:w-auto"
          >
            キャンセル
          </button>
        </div>
      </OverlayPanel>

      <OverlayPanel
        open={panelMode === "history"}
        title={selectedMember ? `${selectedMember.name} の履歴` : "メンバー履歴"}
        description="この画面の中で単月、3か月、半年、年間を切り替えながら確認できます。"
        onClose={closePanel}
      >
        {selectedMember ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>期間区分</Label>
                <Select
                  value={analysisRangeMode}
                  onChange={(event) =>
                    setAnalysisRangeMode(event.target.value as AnalysisRangeMode)
                  }
                >
                  {ANALYSIS_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>表示基準</Label>
                <Select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                >
                  {historyRangeAnchors.map((month) => (
                    <option key={month} value={month}>
                      {getRangeLabel(month, analysisRangeMode)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `leapseed-member-history-${selectedMember.name}.csv`,
                    buildMemberHistoryCsvRows(store, selectedMember.id),
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 sm:w-auto"
              >
                売上履歴CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `leapseed-statement-${selectedMonth}-${selectedMember.name}.csv`,
                    buildMemberStatementCsvRows(store, selectedMonth, selectedMember.id),
                  )
                }
                disabled={!selectedMemberCurrentSummary}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                選択月の給与明細CSV
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">表示期間売上</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {formatCurrency(filteredHistory.totals.monthlySales)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">表示期間最終給料</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {formatCurrency(filteredHistory.totals.finalSalary)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">表示期間個人経費</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {formatCurrency(filteredHistory.totals.personalExpense)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">表示月数</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {filteredHistory.monthlyRows.length}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-slate-900">表示期間の年別集計</p>
              {filteredHistory.yearlyRows.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="pb-3 pr-4">年</th>
                        <th className="pb-3 pr-4">案件数</th>
                        <th className="pb-3 pr-4">売上</th>
                        <th className="pb-3 pr-4">案件報酬</th>
                        <th className="pb-3 pr-4">個人経費</th>
                        <th className="pb-3">最終給料</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.yearlyRows.map((row) => (
                        <tr key={row.year} className="border-t border-slate-100">
                          <td className="py-3 pr-4 font-medium text-slate-900">{row.year}</td>
                          <td className="py-3 pr-4">{row.dealCount}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.monthlySales)}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.projectReward)}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.personalExpense)}</td>
                          <td className="py-3 font-semibold text-slate-900">
                            {formatCurrency(row.finalSalary)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="表示期間の年別データがありません"
                  description="この期間では対象データがありません。"
                />
              )}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-slate-900">表示期間の月別履歴</p>
              {filteredHistory.monthlyRows.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="pb-3 pr-4">月</th>
                        <th className="pb-3 pr-4">案件数</th>
                        <th className="pb-3 pr-4">売上</th>
                        <th className="pb-3 pr-4">案件報酬</th>
                        <th className="pb-3 pr-4">直紹介報酬</th>
                        <th className="pb-3 pr-4">役員報酬</th>
                        <th className="pb-3 pr-4">調整額</th>
                        <th className="pb-3 pr-4">個人経費</th>
                        <th className="pb-3">最終給料</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.monthlyRows.map((row) => (
                        <tr key={row.month} className="border-t border-slate-100">
                          <td className="py-3 pr-4 font-medium text-slate-900">{row.month}</td>
                          <td className="py-3 pr-4">{row.dealCount}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.monthlySales)}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.projectReward)}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.referralReward)}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.executiveReward)}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.adjustment)}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.personalExpense)}</td>
                          <td className="py-3 font-semibold text-slate-900">
                            {formatCurrency(row.finalSalary)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="表示期間の月別履歴がありません"
                  description="この期間では対象データがありません。"
                />
              )}
            </div>
          </>
        ) : null}
      </OverlayPanel>
    </>
  );
}
