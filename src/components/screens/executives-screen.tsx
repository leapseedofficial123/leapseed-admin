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
import { formatCurrency, formatMonthLabel, formatPercent, parseNumberInput, toInputString } from "@/lib/format";

export function ExecutivesScreen() {
  const {
    store,
    selectedMonth,
    currentSnapshot,
    saveMember,
    saveMonthlySetting,
  } = useAppState();
  const currentSetting =
    store.monthlySettings.find((setting) => setting.month === selectedMonth) ?? {
      month: selectedMonth,
      expense: 0,
      note: "",
    };

  return (
    <div className="space-y-6">
      <PageSection
        title="月次会社設定"
        description="表示中の対象月に対する全体経費とメモを管理します。"
      >
        <MonthlySettingForm
          key={selectedMonth}
          month={selectedMonth}
          expense={currentSetting.expense}
          note={currentSetting.note}
          onSave={saveMonthlySetting}
        />
      </PageSection>

      <PageSection
        title="役員報酬設定"
        description="役員フラグが立ったメンバーだけ、会社取り分合計を母数にした報酬が付きます。"
      >
        {store.members.length ? (
          <div className="space-y-3">
            {store.members.map((member) => {
              const summary = currentSnapshot.memberSummaries.find(
                (candidate) => candidate.memberId === member.id,
              );

              return (
                <div
                  key={member.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">{member.name}</p>
                        {member.isExecutive ? <Badge tone="amber">役員</Badge> : <Badge>一般</Badge>}
                      </div>
                      <p className="text-sm text-slate-500">
                        現在の役員報酬率 {formatPercent(member.executiveCompensationRate)} / 今月見込み{" "}
                        {formatCurrency(summary?.executiveReward ?? 0)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[180px_160px_150px]">
                      <Select
                        value={member.isExecutive ? "yes" : "no"}
                        onChange={(event) =>
                          saveMember({
                            ...member,
                            isExecutive: event.target.value === "yes",
                          })
                        }
                      >
                        <option value="no">一般メンバー</option>
                        <option value="yes">役員</option>
                      </Select>
                      <Input
                        value={toInputString(member.executiveCompensationRate)}
                        onChange={(event) =>
                          saveMember({
                            ...member,
                            executiveCompensationRate: parseNumberInput(event.target.value),
                          })
                        }
                        inputMode="decimal"
                        placeholder="0.01"
                      />
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        {formatCurrency(currentSnapshot.totalCompanyShare)} x{" "}
                        {formatPercent(member.executiveCompensationRate)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="メンバーがまだありません"
            description="先にメンバーを登録すると、ここで役員フラグと役員報酬率を調整できます。"
          />
        )}
      </PageSection>
    </div>
  );
}

function MonthlySettingForm({
  month,
  expense,
  note,
  onSave,
}: {
  month: string;
  expense: number;
  note: string;
  onSave: (setting: { month: string; expense: number; note: string }) => void;
}) {
  const [expenseValue, setExpenseValue] = useState(toInputString(expense));
  const [noteValue, setNoteValue] = useState(note);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>対象月</Label>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            {formatMonthLabel(month)}
          </div>
        </div>
        <div>
          <Label>全体経費</Label>
          <Input
            value={expenseValue}
            onChange={(event) => setExpenseValue(event.target.value)}
            inputMode="numeric"
            placeholder="450000"
          />
        </div>
        <div className="md:col-span-2">
          <Label>全体メモ</Label>
          <Textarea
            value={noteValue}
            onChange={(event) => setNoteValue(event.target.value)}
            placeholder="今月の全体メモ"
          />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            onSave({
              month,
              expense: parseNumberInput(expenseValue),
              note: noteValue.trim(),
            })
          }
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          会社設定を保存
        </button>
      </div>
    </>
  );
}
