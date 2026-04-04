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
import { DEAL_PATTERN_OPTIONS } from "@/lib/constants";
import {
  formatNumber,
  formatPercent,
  parseNumberInput,
  parsePercentInput,
  toInputString,
  toPercentInputString,
} from "@/lib/format";
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
  const [panelMode, setPanelMode] = useState<"type" | "band" | null>(null);
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

  const closePanel = () => {
    setPanelMode(null);
    resetTypeForm();
    resetBandForm();
  };

  const openCreateTypePanel = () => {
    resetTypeForm();
    setPanelMode("type");
  };

  const openEditTypePanel = (typeId: string) => {
    const type = store.compensationTypes.find((item) => item.id === typeId);
    if (!type) {
      return;
    }

    setTypeForm({
      existingId: type.id,
      code: type.id,
      label: type.label,
      active: type.active,
      dealPattern: type.dealPattern,
      note: type.note,
    });
    setTypeError("");
    setPanelMode("type");
  };

  const openCreateBandPanel = () => {
    resetBandForm();
    setPanelMode("band");
  };

  const openEditBandPanel = (bandId: string) => {
    const band = store.compensationBands.find((item) => item.id === bandId);
    if (!band) {
      return;
    }

    setBandForm({
      id: band.id,
      minSales: toInputString(band.minSales),
      rates: Object.fromEntries(
        store.compensationTypes.map((type) => [
          type.id,
          toPercentInputString(band.rates[type.id] ?? 0),
        ]),
      ),
    });
    setBandError("");
    setPanelMode("band");
  };

  const handleSaveType = () => {
    const code = (typeForm.existingId || typeForm.code).trim().toUpperCase();

    if (!code || !typeForm.label.trim()) {
      setTypeError("区分コードと表示名は必須です。");
      return;
    }

    const duplicate = store.compensationTypes.some(
      (type) => type.id === code && type.id !== typeForm.existingId,
    );
    if (duplicate) {
      setTypeError("同じ区分コードがすでに登録されています。");
      return;
    }

    saveCompensationType({
      id: code,
      label: typeForm.label.trim(),
      active: typeForm.active,
      dealPattern: typeForm.dealPattern,
      note: typeForm.note.trim(),
    });

    closePanel();
  };

  const handleSaveBand = () => {
    const minSales = parseNumberInput(bandForm.minSales);
    const duplicate = store.compensationBands.some(
      (band) => band.minSales === minSales && band.id !== bandForm.id,
    );

    if (duplicate) {
      setBandError("同じ売上帯の下限がすでに登録されています。");
      return;
    }

    saveCompensationBand({
      id: bandForm.id || createId("band"),
      minSales,
      rates: Object.fromEntries(
        store.compensationTypes.map((type) => [
          type.id,
          parsePercentInput(bandForm.rates[type.id] ?? "0"),
        ]),
      ),
    });

    closePanel();
  };

  return (
    <>
      <PageSection
        title="報酬区分一覧"
        description="一覧から編集を押すと、区分登録フォームを右側パネルで開いて更新できます。"
        action={
          <button
            type="button"
            onClick={openCreateTypePanel}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            区分を追加
          </button>
        }
      >
        {store.compensationTypes.length ? (
          <div className="space-y-3">
            {store.compensationTypes.map((type) => (
              <div
                key={type.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-slate-900">{type.label}</p>
                      <Badge tone={type.active ? "teal" : "rose"}>
                        {type.active ? "有効" : "無効"}
                      </Badge>
                      <Badge>{type.dealPattern}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">コード: {type.id}</p>
                    {type.note ? (
                      <p className="text-sm leading-6 text-slate-600">{type.note}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditTypePanel(type.id)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCompensationType(type.id)}
                      className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
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
            title="報酬区分がまだ登録されていません"
            description="まずは AC や ABC_A などの区分を追加してください。"
          />
        )}
      </PageSection>

      <PageSection
        title="売上帯一覧"
        description="一覧から編集を押すと、売上帯フォームを右側パネルで開いて更新できます。"
        action={
          <button
            type="button"
            onClick={openCreateBandPanel}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            売上帯を追加
          </button>
        }
      >
        {store.compensationBands.length ? (
          <div className="space-y-3">
            {[...store.compensationBands]
              .sort((left, right) => left.minSales - right.minSales)
              .map((band) => (
                <div
                  key={band.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <p className="text-lg font-semibold text-slate-900">
                        {formatNumber(band.minSales)}円以上
                      </p>
                      <div className="flex flex-wrap gap-2">
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
                        onClick={() => openEditBandPanel(band.id)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCompensationBand(band.id)}
                        disabled={store.compensationBands.length <= 1}
                        className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
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
            title="売上帯がまだ登録されていません"
            description="最低でも 0 円以上の売上帯を追加してください。"
          />
        )}
      </PageSection>

      <OverlayPanel
        open={panelMode !== null}
        title={panelMode === "type" ? "報酬区分を編集" : "売上帯を編集"}
        description={
          panelMode === "type"
            ? "報酬適用区分の追加と編集を行います。"
            : "本人の月間売上合計に応じた報酬率テーブルを設定します。"
        }
        onClose={closePanel}
      >
        {panelMode === "type" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label required>区分コード</Label>
                <Input
                  value={typeForm.existingId || typeForm.code}
                  onChange={(event) =>
                    setTypeForm((current) => ({ ...current, code: event.target.value }))
                  }
                  readOnly={Boolean(typeForm.existingId)}
                  placeholder="例: ABC_A"
                />
              </div>
              <div>
                <Label required>表示名</Label>
                <Input
                  value={typeForm.label}
                  onChange={(event) =>
                    setTypeForm((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="例: ABC_A"
                />
              </div>
              <div>
                <Label>案件パターン</Label>
                <Select
                  value={typeForm.dealPattern}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      dealPattern: event.target.value,
                    }))
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
                <Label>メモ</Label>
                <Textarea
                  value={typeForm.note}
                  onChange={(event) =>
                    setTypeForm((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="区分の補足"
                />
              </div>
            </div>

            {typeError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {typeError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveType}
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
                <Label>売上帯の下限</Label>
                <Input
                  value={bandForm.minSales}
                  onChange={(event) =>
                    setBandForm((current) => ({
                      ...current,
                      minSales: event.target.value,
                    }))
                  }
                  inputMode="numeric"
                  placeholder="1000000"
                />
              </div>
              {store.compensationTypes.map((type) => (
                <div key={type.id}>
                  <Label>{type.label}</Label>
                  <InputWithSuffix
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
                    placeholder="40"
                    suffix="%"
                  />
                </div>
              ))}
            </div>

            {bandError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {bandError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveBand}
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
