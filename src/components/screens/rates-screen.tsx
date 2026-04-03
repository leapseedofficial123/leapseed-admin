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
import { DEAL_PATTERN_OPTIONS } from "@/lib/constants";
import { formatPercent, parseNumberInput, toInputString } from "@/lib/format";
import { createId } from "@/lib/ids";

interface CompensationTypeFormState {
  existingId?: string;
  code: string;
  label: string;
  active: boolean;
  dealPattern: string;
  note: string;
}

interface BandFormState {
  id?: string;
  minSales: string;
  rates: Record<string, string>;
}

function createEmptyTypeForm(): CompensationTypeFormState {
  return {
    code: "",
    label: "",
    active: true,
    dealPattern: "AC",
    note: "",
  };
}

function createEmptyBandForm(typeIds: string[]): BandFormState {
  return {
    minSales: "",
    rates: Object.fromEntries(typeIds.map((typeId) => [typeId, "0"])),
  };
}

export function RatesScreen() {
  const {
    store,
    saveCompensationType,
    deleteCompensationType,
    saveCompensationBand,
    deleteCompensationBand,
  } = useAppState();
  const [typeForm, setTypeForm] = useState<CompensationTypeFormState>(createEmptyTypeForm);
  const [bandForm, setBandForm] = useState<BandFormState>(() =>
    createEmptyBandForm(store.compensationTypes.map((type) => type.id)),
  );
  const [typeError, setTypeError] = useState("");
  const [bandError, setBandError] = useState("");

  const resetTypeForm = () => {
    setTypeForm(createEmptyTypeForm());
    setTypeError("");
  };

  const resetBandForm = () => {
    setBandForm(createEmptyBandForm(store.compensationTypes.map((type) => type.id)));
    setBandError("");
  };

  const handleSaveType = () => {
    const code = (typeForm.existingId || typeForm.code).trim().toUpperCase();

    if (!code || !typeForm.label.trim()) {
      setTypeError("区分コードと表示名を入れてください。");
      return;
    }

    const duplicate = store.compensationTypes.some(
      (type) => type.id === code && type.id !== typeForm.existingId,
    );
    if (duplicate) {
      setTypeError("同じ区分コードがすでに存在します。");
      return;
    }

    saveCompensationType({
      id: code,
      label: typeForm.label.trim(),
      active: typeForm.active,
      dealPattern: typeForm.dealPattern,
      note: typeForm.note.trim(),
    });
    resetTypeForm();
  };

  const handleSaveBand = () => {
    const minSales = parseNumberInput(bandForm.minSales);
    const duplicate = store.compensationBands.some(
      (band) => band.minSales === minSales && band.id !== bandForm.id,
    );

    if (duplicate) {
      setBandError("同じ売上帯下限がすでに存在します。");
      return;
    }

    saveCompensationBand({
      id: bandForm.id || createId("band"),
      minSales,
      rates: Object.fromEntries(
        store.compensationTypes.map((type) => [
          type.id,
          parseNumberInput(bandForm.rates[type.id] ?? "0"),
        ]),
      ),
    });
    resetBandForm();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <PageSection
          title="報酬適用区分"
          description="案件参加者に付与する区分です。将来の新パターン追加に備えてここで増やせます。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label required>区分コード</Label>
              <Input
                value={typeForm.existingId || typeForm.code}
                onChange={(event) =>
                  setTypeForm((current) => ({ ...current, code: event.target.value }))
                }
                readOnly={Boolean(typeForm.existingId)}
                placeholder="例: AABB_A"
              />
            </div>
            <div>
              <Label required>表示名</Label>
              <Input
                value={typeForm.label}
                onChange={(event) =>
                  setTypeForm((current) => ({ ...current, label: event.target.value }))
                }
                placeholder="例: AABB_A"
              />
            </div>
            <div>
              <Label>初期案件パターン</Label>
              <Select
                value={typeForm.dealPattern}
                onChange={(event) =>
                  setTypeForm((current) => ({ ...current, dealPattern: event.target.value }))
                }
              >
                {[...DEAL_PATTERN_OPTIONS, { value: "ANY", label: "ANY" }].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>有効状態</Label>
              <Select
                value={typeForm.active ? "active" : "inactive"}
                onChange={(event) =>
                  setTypeForm((current) => ({
                    ...current,
                    active: event.target.value === "active",
                  }))
                }
              >
                <option value="active">有効</option>
                <option value="inactive">無効</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>備考</Label>
              <Textarea
                value={typeForm.note}
                onChange={(event) =>
                  setTypeForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="区分の説明"
              />
            </div>
          </div>

          {typeError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {typeError}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveType}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {typeForm.existingId ? "区分更新" : "区分追加"}
            </button>
            <button
              type="button"
              onClick={resetTypeForm}
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900"
            >
              入力をクリア
            </button>
          </div>
        </PageSection>

        <PageSection
          title="区分一覧"
          description="参加者入力のセレクトには有効な区分だけを出します。"
        >
          {store.compensationTypes.length ? (
            <div className="space-y-3">
              {store.compensationTypes.map((type) => (
                <div
                  key={type.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">{type.label}</p>
                        <Badge tone={type.active ? "teal" : "rose"}>
                          {type.active ? "有効" : "無効"}
                        </Badge>
                        <Badge>{type.dealPattern}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">コード: {type.id}</p>
                      {type.note ? <p className="mt-2 text-sm text-slate-600">{type.note}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTypeForm({
                            existingId: type.id,
                            code: type.id,
                            label: type.label,
                            active: type.active,
                            dealPattern: type.dealPattern,
                            note: type.note,
                          })
                        }
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCompensationType(type.id)}
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
              title="報酬区分がまだありません"
              description="まずはACやABC_Aなどの区分をここで管理します。"
            />
          )}
        </PageSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <PageSection
          title="売上帯テーブル"
          description="本人の月間売上合計に応じて、各区分の率をここで設定します。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>売上帯の下限</Label>
              <Input
                value={bandForm.minSales}
                onChange={(event) =>
                  setBandForm((current) => ({ ...current, minSales: event.target.value }))
                }
                inputMode="numeric"
                placeholder="1000000"
              />
            </div>
            {store.compensationTypes.map((type) => (
              <div key={type.id}>
                <Label>{type.label}</Label>
                <Input
                  value={bandForm.rates[type.id] ?? ""}
                  onChange={(event) =>
                    setBandForm((current) => ({
                      ...current,
                      rates: {
                        ...current.rates,
                        [type.id]: event.target.value,
                      },
                    }))
                  }
                  inputMode="decimal"
                  placeholder="0.4"
                />
              </div>
            ))}
          </div>

          {bandError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {bandError}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveBand}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {bandForm.id ? "売上帯更新" : "売上帯追加"}
            </button>
            <button
              type="button"
              onClick={resetBandForm}
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900"
            >
              入力をクリア
            </button>
          </div>
        </PageSection>

        <PageSection
          title="売上帯一覧"
          description="下限が大きいほど上位帯です。必要なら行の追加・削除ができます。"
        >
          {store.compensationBands.length ? (
            <div className="space-y-3">
              {[...store.compensationBands]
                .sort((left, right) => left.minSales - right.minSales)
                .map((band) => (
                  <div
                    key={band.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          {band.minSales.toLocaleString("ja-JP")}円以上
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {store.compensationTypes.map((type) => (
                            <Badge key={type.id} tone="slate">
                              {type.label}: {formatPercent(band.rates[type.id] ?? 0)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setBandForm({
                              id: band.id,
                              minSales: toInputString(band.minSales),
                              rates: Object.fromEntries(
                                store.compensationTypes.map((type) => [
                                  type.id,
                                  toInputString(band.rates[type.id] ?? 0),
                                ]),
                              ),
                            })
                          }
                          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCompensationBand(band.id)}
                          disabled={store.compensationBands.length <= 1}
                          className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
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
              title="売上帯がまだありません"
              description="最低1行は用意しておくと案件報酬を計算できます。"
            />
          )}
        </PageSection>
      </div>
    </div>
  );
}
