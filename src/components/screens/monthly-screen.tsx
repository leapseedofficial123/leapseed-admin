"use client";

import { useState } from "react";
import { EmptyState, Input, Label, PageSection, Select } from "@/components/ui";
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
  const [error, setError] = useState("");
  const monthAdjustments = store.salaryAdjustments.filter(
    (adjustment) => adjustment.month === selectedMonth,
  );

  const resetForm = () => {
    setForm(createEmptyAdjustmentForm());
    setError("");
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
    resetForm();
  };

  return (
    <div className="space-y-6">
      <PageSection
        title="調整額入力"
        description="表示中の月に対する個別調整額を登録します。"
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
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              inputMode="numeric"
              placeholder="30000"
            />
          </div>
          <div>
            <Label>備考</Label>
            <Input
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="役割調整"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {form.id ? "調整額更新" : "調整額追加"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900"
          >
            入力をクリア
          </button>
        </div>

        {monthAdjustments.length ? (
          <div className="mt-5 space-y-3">
            {monthAdjustments.map((adjustment) => {
              const member = store.members.find((item) => item.id === adjustment.memberId);
              return (
                <div
                  key={adjustment.id}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{member?.name ?? "不明メンバー"}</p>
                    <p className="text-sm text-slate-500">
                      {formatCurrency(adjustment.amount)}
                      {adjustment.note ? ` / ${adjustment.note}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: adjustment.id,
                          memberId: adjustment.memberId,
                          amount: toInputString(adjustment.amount),
                          note: adjustment.note,
                        })
                      }
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSalaryAdjustment(adjustment.id)}
                      className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700"
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </PageSection>

      <PageSection
        title="月次集計"
        description="各メンバーの個人売上合計、適用帯、案件報酬、紹介報酬、役員報酬、調整額、最終給料をまとめています。"
      >
        {currentSnapshot.memberSummaries.length ? (
          <div className="space-y-4">
            {currentSnapshot.memberSummaries.map((summary) => (
              <details
                key={summary.memberId}
                className="rounded-3xl border border-slate-200 bg-white"
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
                      <p className="text-xs text-slate-500">紹介報酬</p>
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
                      <p className="mb-3 text-sm font-semibold text-slate-900">案件内訳</p>
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
                          title="案件報酬の明細がありません"
                          description="この月に案件参加がないメンバーです。"
                        />
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-900">紹介報酬の内訳</p>
                        {summary.referralDetails.length ? (
                          <div className="mt-3 space-y-3">
                            {summary.referralDetails.map((detail) => (
                              <div key={detail.referralId} className="rounded-2xl bg-white px-4 py-3">
                                <p className="font-medium text-slate-900">{detail.referredMemberName}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                  最終給料 {formatCurrency(detail.referredFinalSalary)} x{" "}
                                  {formatPercent(detail.rate)}
                                </p>
                                <p className="mt-2 font-semibold text-slate-900">
                                  {formatCurrency(detail.reward)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">紹介報酬はありません。</p>
                        )}
                      </div>

                      <div className="rounded-3xl bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-900">集計サマリー</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                          <p>適用売上帯: {summary.appliedBandLabel}</p>
                          <p>案件報酬: {formatCurrency(summary.projectReward)}</p>
                          <p>紹介報酬: {formatCurrency(summary.referralReward)}</p>
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
            description="案件やメンバーを登録すると、この画面で月次給料を確認できます。"
          />
        )}
      </PageSection>
    </div>
  );
}
