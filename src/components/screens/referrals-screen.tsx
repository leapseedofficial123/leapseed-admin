"use client";

import { useState } from "react";
import {
  EmptyState,
  Input,
  InputWithSuffix,
  Label,
  OverlayPanel,
  PageSection,
  Select,
} from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import {
  formatMonthLabel,
  formatPercent,
  parsePercentInput,
  toPercentInputString,
} from "@/lib/format";
import { createId } from "@/lib/ids";

interface ReferralFormState {
  id?: string;
  introducerMemberId: string;
  referredMemberId: string;
  referralRate: string;
  startMonth: string;
  endMonth: string;
}

function createEmptyReferralForm(): ReferralFormState {
  return {
    introducerMemberId: "",
    referredMemberId: "",
    referralRate: "10",
    startMonth: "",
    endMonth: "",
  };
}

export function ReferralsScreen() {
  const { store, saveReferralRelationship, deleteReferralRelationship } = useAppState();
  const [form, setForm] = useState<ReferralFormState>(createEmptyReferralForm);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm(createEmptyReferralForm());
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

  const openEditPanel = (relationshipId: string) => {
    const relationship = store.referralRelationships.find((item) => item.id === relationshipId);
    if (!relationship) {
      return;
    }

    setForm({
      id: relationship.id,
      introducerMemberId: relationship.introducerMemberId,
      referredMemberId: relationship.referredMemberId,
      referralRate: toPercentInputString(relationship.referralRate),
      startMonth: relationship.startMonth,
      endMonth: relationship.endMonth ?? "",
    });
    setError("");
    setIsPanelOpen(true);
  };

  const handleSubmit = () => {
    if (!form.introducerMemberId || !form.referredMemberId) {
      setError("紹介者と被紹介者の両方を選択してください。");
      return;
    }

    if (form.introducerMemberId === form.referredMemberId) {
      setError("同じメンバー同士では紹介関係を作れません。");
      return;
    }

    if (!form.startMonth) {
      setError("有効開始月を入力してください。");
      return;
    }

    saveReferralRelationship({
      id: form.id || createId("referral"),
      introducerMemberId: form.introducerMemberId,
      referredMemberId: form.referredMemberId,
      referralRate: parsePercentInput(form.referralRate) || 0.1,
      startMonth: form.startMonth,
      endMonth: form.endMonth || undefined,
    });

    closePanel();
  };

  return (
    <>
      <PageSection
        title="紹介関係一覧"
        description="一覧から編集を開く形にしています。追加するときだけ登録フォームを表示します。"
        action={
          <button
            type="button"
            onClick={openCreatePanel}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            紹介関係追加
          </button>
        }
      >
        {store.referralRelationships.length ? (
          <div className="space-y-3">
            {store.referralRelationships.map((relationship) => {
              const introducer = store.members.find(
                (member) => member.id === relationship.introducerMemberId,
              );
              const referred = store.members.find(
                (member) => member.id === relationship.referredMemberId,
              );

              return (
                <div
                  key={relationship.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {introducer?.name ?? "不明"} → {referred?.name ?? "不明"}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        報酬率 {formatPercent(relationship.referralRate)} / 開始{" "}
                        {formatMonthLabel(relationship.startMonth)}
                        {relationship.endMonth
                          ? ` / 終了 ${formatMonthLabel(relationship.endMonth)}`
                          : " / 終了未設定"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPanel(relationship.id)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReferralRelationship(relationship.id)}
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
            title="紹介関係がまだありません"
            description="紹介関係追加から登録すると、ここに一覧表示されます。"
          />
        )}
      </PageSection>

      <OverlayPanel
        open={isPanelOpen}
        title={form.id ? "紹介関係編集" : "紹介関係登録"}
        description="紹介報酬率と有効期間を月単位で設定できます。"
        onClose={closePanel}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label required>紹介者</Label>
            <Select
              value={form.introducerMemberId}
              onChange={(event) => {
                const selected = store.members.find(
                  (member) => member.id === event.target.value,
                );
                setForm((current) => ({
                  ...current,
                  introducerMemberId: event.target.value,
                      referralRate:
                        current.id || current.referralRate
                          ? current.referralRate
                      : toPercentInputString(selected?.defaultReferralRate ?? 0.1),
                }));
              }}
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
            <Label required>被紹介者</Label>
            <Select
              value={form.referredMemberId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  referredMemberId: event.target.value,
                }))
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
            <Label>紹介報酬率</Label>
            <InputWithSuffix
              value={form.referralRate}
              onChange={(event) =>
                setForm((current) => ({ ...current, referralRate: event.target.value }))
              }
              inputMode="decimal"
              placeholder="10"
              suffix="%"
            />
          </div>
          <div>
            <Label required>有効開始月</Label>
            <Input
              type="month"
              value={form.startMonth}
              onChange={(event) =>
                setForm((current) => ({ ...current, startMonth: event.target.value }))
              }
            />
          </div>
          <div>
            <Label>有効終了月</Label>
            <Input
              type="month"
              value={form.endMonth}
              onChange={(event) =>
                setForm((current) => ({ ...current, endMonth: event.target.value }))
              }
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
            {form.id ? "紹介関係更新" : "紹介関係追加"}
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
