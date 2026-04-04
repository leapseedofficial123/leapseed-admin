"use client";

import { useState } from "react";
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
import {
  formatCurrency,
  formatMonthLabel,
  formatPercent,
  parseNumberInput,
  parsePercentInput,
  toInputString,
  toPercentInputString,
} from "@/lib/format";

interface MonthlySettingFormState {
  expense: string;
  note: string;
}

interface ExecutiveMemberFormState {
  memberId: string;
  name: string;
  isExecutive: boolean;
  executiveCompensationRate: string;
  note: string;
}

function createMonthlySettingForm(expense: number, note: string): MonthlySettingFormState {
  return {
    expense: toInputString(expense),
    note,
  };
}

function createExecutiveMemberForm(): ExecutiveMemberFormState {
  return {
    memberId: "",
    name: "",
    isExecutive: false,
    executiveCompensationRate: "",
    note: "",
  };
}

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

  const [panelMode, setPanelMode] = useState<"setting" | "member" | null>(null);
  const [settingForm, setSettingForm] = useState<MonthlySettingFormState>(() =>
    createMonthlySettingForm(currentSetting.expense, currentSetting.note),
  );
  const [memberForm, setMemberForm] = useState<ExecutiveMemberFormState>(
    createExecutiveMemberForm,
  );

  const closePanel = () => {
    setPanelMode(null);
    setSettingForm(createMonthlySettingForm(currentSetting.expense, currentSetting.note));
    setMemberForm(createExecutiveMemberForm());
  };

  const openSettingPanel = () => {
    setSettingForm(createMonthlySettingForm(currentSetting.expense, currentSetting.note));
    setPanelMode("setting");
  };

  const openMemberPanel = (memberId: string) => {
    const member = store.members.find((item) => item.id === memberId);
    if (!member) {
      return;
    }

    setMemberForm({
      memberId: member.id,
      name: member.name,
      isExecutive: member.isExecutive,
      executiveCompensationRate: toPercentInputString(member.executiveCompensationRate),
      note: member.note,
    });
    setPanelMode("member");
  };

  const handleSaveSetting = () => {
    saveMonthlySetting({
      month: selectedMonth,
      expense: parseNumberInput(settingForm.expense),
      note: settingForm.note.trim(),
    });
    closePanel();
  };

  const handleSaveMember = () => {
    const member = store.members.find((item) => item.id === memberForm.memberId);
    if (!member) {
      return;
    }

    saveMember({
      ...member,
      isExecutive: memberForm.isExecutive,
      executiveCompensationRate: parsePercentInput(memberForm.executiveCompensationRate),
    });
    closePanel();
  };

  return (
    <>
      <PageSection
        title="当月の会社設定"
        description="表示中の対象月にひもづく全体経費とメモを管理します。"
        action={
          <button
            type="button"
            onClick={openSettingPanel}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            編集
          </button>
        }
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_repeat(3,minmax(0,1fr))]">
            <div>
              <p className="text-xs text-slate-500">対象月</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatMonthLabel(selectedMonth)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">全体経費</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatCurrency(currentSetting.expense)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">会社取り分合計</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatCurrency(currentSnapshot.totalCompanyShare)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">役員報酬合計</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatCurrency(currentSnapshot.totalExecutiveReward)}
              </p>
            </div>
          </div>
          {currentSetting.note ? (
            <p className="mt-4 text-sm leading-6 text-slate-600">{currentSetting.note}</p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">メモはまだ登録されていません。</p>
          )}
        </div>
      </PageSection>

      <PageSection
        title="役員設定一覧"
        description="一覧から編集を押すと、同じ設定フォームを右側パネルで開いて更新できます。"
      >
        {store.members.length ? (
          <div className="space-y-3">
            {[...store.members]
              .sort((left, right) => left.displayOrder - right.displayOrder)
              .map((member) => {
                const summary = currentSnapshot.memberSummaries.find(
                  (candidate) => candidate.memberId === member.id,
                );

                return (
                  <div
                    key={member.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">{member.name}</p>
                          {member.isExecutive ? (
                            <Badge tone="amber">役員</Badge>
                          ) : (
                            <Badge>一般メンバー</Badge>
                          )}
                          {!member.isActive ? <Badge tone="rose">休止</Badge> : null}
                        </div>
                        <p className="text-sm text-slate-500">
                          役員報酬率 {formatPercent(member.executiveCompensationRate)} / 今月の役員報酬{" "}
                          {formatCurrency(summary?.executiveReward ?? 0)}
                        </p>
                        {member.note ? (
                          <p className="text-sm leading-6 text-slate-600">{member.note}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => openMemberPanel(member.id)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                      >
                        編集
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <EmptyState
            title="メンバーがまだ登録されていません"
            description="先にメンバー管理で登録すると、ここで役員フラグと役員報酬率を設定できます。"
          />
        )}
      </PageSection>

      <OverlayPanel
        open={panelMode !== null}
        title={panelMode === "setting" ? "会社設定を編集" : "役員設定を編集"}
        description={
          panelMode === "setting"
            ? "表示中の月に対する全体経費とメモを更新します。"
            : "一覧から選んだメンバーの役員設定を更新します。"
        }
        onClose={closePanel}
      >
        {panelMode === "setting" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>対象月</Label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  {formatMonthLabel(selectedMonth)}
                </div>
              </div>
              <div>
                <Label>全体経費</Label>
                <Input
                  value={settingForm.expense}
                  onChange={(event) =>
                    setSettingForm((current) => ({
                      ...current,
                      expense: event.target.value,
                    }))
                  }
                  inputMode="numeric"
                  placeholder="450000"
                />
              </div>
              <div className="md:col-span-2">
                <Label>全体メモ</Label>
                <Textarea
                  value={settingForm.note}
                  onChange={(event) =>
                    setSettingForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="今月の全体メモ"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveSetting}
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
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>メンバー名</Label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  {memberForm.name}
                </div>
              </div>
              <div>
                <Label>役員フラグ</Label>
                <Select
                  value={memberForm.isExecutive ? "yes" : "no"}
                  onChange={(event) =>
                    setMemberForm((current) => ({
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
                  value={memberForm.executiveCompensationRate}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      executiveCompensationRate: event.target.value,
                    }))
                  }
                  inputMode="decimal"
                  placeholder="1"
                  suffix="%"
                />
              </div>
              <div className="md:col-span-2">
                <Label>補足</Label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-700">
                  {memberForm.note || "メモはありません。"}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveMember}
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
          </>
        )}
      </OverlayPanel>
    </>
  );
}
