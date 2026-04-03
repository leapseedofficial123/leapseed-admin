"use client";

import { useState } from "react";
import {
  Badge,
  EmptyState,
  Input,
  Label,
  PageSection,
  Select,
  Textarea,
} from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { formatPercent, parseNumberInput, toInputString } from "@/lib/format";
import { createId } from "@/lib/ids";

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
    defaultReferralRate: "0.1",
    note: "",
  };
}

export function MembersScreen() {
  const { store, saveMember, deleteMember } = useAppState();
  const [form, setForm] = useState<MemberFormState>(() =>
    createEmptyMemberForm(store.members.length + 1),
  );
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm(createEmptyMemberForm(store.members.length + 1));
    setError("");
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("メンバー名は必須です。");
      return;
    }

    saveMember({
      id: form.id || createId("member"),
      name: form.name.trim(),
      displayOrder: parseNumberInput(form.displayOrder) || store.members.length + 1,
      isActive: form.isActive,
      isExecutive: form.isExecutive,
      executiveCompensationRate: parseNumberInput(form.executiveCompensationRate),
      defaultReferralRate: parseNumberInput(form.defaultReferralRate) || 0.1,
      note: form.note.trim(),
    });
    resetForm();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <PageSection
        title="メンバー登録"
        description="在籍管理、役員フラグ、直紹介初期率までまとめて設定できます。"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label required>名前</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="例: 伊藤綾音"
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
            <Label>在籍状況</Label>
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
              <option value="inactive">停止・退職</option>
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
            <Input
              value={form.executiveCompensationRate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  executiveCompensationRate: event.target.value,
                }))
              }
              inputMode="decimal"
              placeholder="0.01"
            />
          </div>
          <div>
            <Label>直紹介報酬率 初期値</Label>
            <Input
              value={form.defaultReferralRate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultReferralRate: event.target.value,
                }))
              }
              inputMode="decimal"
              placeholder="0.1"
            />
          </div>
          <div className="md:col-span-2">
            <Label>備考</Label>
            <Textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="補足があれば入力"
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
            {form.id ? "メンバー更新" : "メンバー追加"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900"
          >
            入力をクリア
          </button>
        </div>
      </PageSection>

      <PageSection
        title="メンバー一覧"
        description="表示順で並びます。編集するときは各行の編集ボタンから読み込めます。"
      >
        {store.members.length ? (
          <div className="space-y-3">
            {[...store.members]
              .sort((left, right) => left.displayOrder - right.displayOrder)
              .map((member) => (
                <div
                  key={member.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">{member.name}</p>
                        <Badge tone={member.isActive ? "teal" : "rose"}>
                          {member.isActive ? "在籍中" : "停止"}
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
                      {member.note ? (
                        <p className="text-sm leading-6 text-slate-600">{member.note}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            id: member.id,
                            name: member.name,
                            displayOrder: toInputString(member.displayOrder),
                            isActive: member.isActive,
                            isExecutive: member.isExecutive,
                            executiveCompensationRate: toInputString(
                              member.executiveCompensationRate,
                            ),
                            defaultReferralRate: toInputString(member.defaultReferralRate),
                            note: member.note,
                          })
                        }
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMember(member.id)}
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState
            title="メンバーがまだありません"
            description="まずはここから登録すると、案件入力や紹介設定で選べるようになります。"
          />
        )}
      </PageSection>
    </div>
  );
}
