"use client";

import { useState } from "react";
import {
  EmptyState,
  Input,
  Label,
  OverlayPanel,
  PageSection,
  Select,
} from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import {
  formatCurrency,
  formatDateLabel,
  formatPercent,
  parseNumberInput,
  toInputString,
} from "@/lib/format";
import { createId } from "@/lib/ids";

interface AdjustmentFormState {
  id?: string;
  memberId: string;
  amount: string;
  note: string;
}

function createEmptyAdjustmentForm(): AdjustmentFormState {
  return {
    memberId: "",
    amount: "",
    note: "",
  };
}

export function MonthlyScreen() {
  const {
    store,
    selectedMonth,
    currentSnapshot,
    saveSalaryAdjustment,
    deleteSalaryAdjustment,
  } = useAppState();
  const [form, setForm] = useState<AdjustmentFormState>(createEmptyAdjustmentForm);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [error, setError] = useState("");
  const monthAdjustments = store.salaryAdjustments.filter(
    (adjustment) => adjustment.month === selectedMonth,
  );

  const resetForm = () => {
    setForm(createEmptyAdjustmentForm());
    setError("");
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    resetForm();
  };

  const openCreatePanel = () => {
    resetForm();
    setIsPanelOpen(true);
  };

  const openEditPanel = (adjustmentId: string) => {
    const adjustment = monthAdjustments.find((item) => item.id === adjustmentId);
    if (!adjustment) {
      return;
    }

    setForm({
      id: adjustment.id,
      memberId: adjustment.memberId,
      amount: toInputString(adjustment.amount),
      note: adjustment.note,
    });
    setError("");
    setIsPanelOpen(true);
  };

  const handleSubmit = () => {
    if (!form.memberId) {
      setError("調整対象のメンバーを選択してください。");
      return;
    }

    saveSalaryAdjustment({
      id: form.id || createId("adjustment"),
      month: selectedMonth,
      memberId: form.memberId,
      amount: parseNumberInput(form.amount),
      note: form.note.trim(),
    });

    closePanel();
  };

  return (
    <>
      <PageSection
        title="調整額一覧"
        description="一覧から編集を押すと、追加時と同じ調整フォームを右側パネルで開いて更新できます。"
        action={
          <button
            type="button"
            onClick={openCreatePanel}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            調整額を追加
          </button>
        }
      >
        {monthAdjustments.length ? (
          <div className="space-y-3">
            {monthAdjustments.map((adjustment) => {
              const member = store.members.find((item) => item.id === adjustment.memberId);

              return (
                <div
                  key={adjustment.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-slate-900">
                        {member?.name ?? "不明なメンバー"}
                      </p>
                      <p className="text-sm text-slate-500">
                        調整額 {formatCurrency(adjustment.amount)}
                      </p>
                      {adjustment.note ? (
                        <p className="text-sm leading-6 text-slate-600">{adjustment.note}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPanel(adjustment.id)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSalaryAdjustment(adjustment.id)}
                        className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
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
            title="今月の調整額はまだありません"
            description="必要なメンバーに対して調整額を追加してください。"
          />
        )}
      </PageSection>

      <PageSection
        title="月次集計"
        description="各メンバーの個人売上、案件報酬、紹介報酬、役員報酬、調整額、最終給料を確認できます。"
      >
        {currentSnapshot.memberSummaries.length ? (
          <div className="space-y-4">
            {currentSnapshot.memberSummaries.map((summary) => (
              <details
                key={summary.memberId}
                className="rounded-xl border border-slate-200 bg-white"
              >
                <summary className="cursor-pointer px-5 py-5">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{summary.memberName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        個人売上 {formatCurrency(summary.monthlySales)} / 帯 {summary.appliedBandLabel}
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
                      <p className="text-xs text-slate-500">最終給料</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        {formatCurrency(summary.finalSalary)}
                      </p>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-slate-200 px-5 py-5">
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
                                <th className="pb-3 pr-4">区分</th>
                                <th className="pb-3 pr-4">売価</th>
                                <th className="pb-3 pr-4">会社取り分</th>
                                <th className="pb-3 pr-4">適用率</th>
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
                          title="案件報酬の内訳はまだありません"
                          description="この月に案件参加がないメンバーです。"
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
                          <p>適用売上帯: {summary.appliedBandLabel}</p>
                          <p>案件報酬: {formatCurrency(summary.projectReward)}</p>
                          <p>直紹介報酬: {formatCurrency(summary.referralReward)}</p>
                          <p>役員報酬: {formatCurrency(summary.executiveReward)}</p>
                          <p>調整額: {formatCurrency(summary.adjustment)}</p>
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
            title="まだ月次集計がありません"
            description="案件やメンバーを登録すると、この画面で月次給与を確認できます。"
          />
        )}
      </PageSection>

      <OverlayPanel
        open={isPanelOpen}
        title={form.id ? "調整額を編集" : "調整額を追加"}
        description="対象月のメンバーごとの調整額を登録します。"
        onClose={closePanel}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_220px_1fr]">
          <div>
            <Label required>メンバー</Label>
            <Select
              value={form.memberId}
              onChange={(event) =>
                setForm((current) => ({ ...current, memberId: event.target.value }))
              }
            >
              <option value="">選択してください</option>
              {store.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>調整額</Label>
            <Input
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
              inputMode="numeric"
              placeholder="30000"
            />
          </div>
          <div>
            <Label>メモ</Label>
            <Input
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="補足メモ"
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
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm text-white transition hover:bg-slate-800"
          >
            保存
          </button>
          <button
            type="button"
            onClick={closePanel}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            キャンセル
          </button>
        </div>
      </OverlayPanel>
    </>
  );
}
