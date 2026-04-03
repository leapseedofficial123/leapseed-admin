"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  Input,
  Label,
  OverlayPanel,
  PageSection,
  Select,
  Textarea,
} from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { DEAL_PATTERN_OPTIONS, DEFAULT_TODAY } from "@/lib/constants";
import { getMonthEndDate, getMonthFromDate, getMonthStartDate } from "@/lib/date";
import { calculateCompanyShare } from "@/lib/domain/company-share";
import {
  formatCurrency,
  formatDateLabel,
  formatMonthLabel,
  parseNumberInput,
  toInputString,
} from "@/lib/format";

interface ParticipantFormState {
  id?: string;
  memberId: string;
  compensationTypeId: string;
  note: string;
}

interface DealFormState {
  id?: string;
  closedOn: string;
  productId: string;
  salePrice: string;
  companyShare: string;
  companyShareMode: "auto" | "manual";
  countForCompanyRevenue: boolean;
  pattern: string;
  note: string;
  participants: ParticipantFormState[];
}

function createParticipant(compensationTypeId = ""): ParticipantFormState {
  return {
    memberId: "",
    compensationTypeId,
    note: "",
  };
}

function createPatternParticipants(pattern: string): ParticipantFormState[] {
  switch (pattern) {
    case "ABC":
      return [createParticipant("ABC_A"), createParticipant("ABC_B")];
    case "AABC":
      return [
        createParticipant("AABC_A"),
        createParticipant("AABC_A"),
        createParticipant("AABC_B"),
      ];
    case "AC":
    default:
      return [createParticipant("AC")];
  }
}

function createEmptyDealForm(targetMonth: string): DealFormState {
  const suggestedDate =
    getMonthFromDate(DEFAULT_TODAY) === targetMonth ? DEFAULT_TODAY : getMonthStartDate(targetMonth);

  return {
    closedOn: suggestedDate,
    productId: "",
    salePrice: "",
    companyShare: "",
    companyShareMode: "auto",
    countForCompanyRevenue: true,
    pattern: "AC",
    note: "",
    participants: createPatternParticipants("AC"),
  };
}

export function DealsScreen() {
  const { store, selectedMonth, saveDealWithParticipants, deleteDeal } = useAppState();
  const [form, setForm] = useState<DealFormState>(() => createEmptyDealForm(selectedMonth));
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [error, setError] = useState("");

  const monthDeals = useMemo(
    () =>
      store.deals
        .filter((deal) => deal.targetMonth === selectedMonth)
        .sort((left, right) => right.closedOn.localeCompare(left.closedOn)),
    [selectedMonth, store.deals],
  );
  const activeCompensationTypes = store.compensationTypes.filter((type) => type.active);
  const selectedProduct = store.products.find((product) => product.id === form.productId);
  const duplicateMemberIds = form.participants
    .map((participant) => participant.memberId)
    .filter((memberId, index, list) => memberId && list.indexOf(memberId) !== index);
  const minDate = getMonthStartDate(selectedMonth);
  const maxDate = getMonthEndDate(selectedMonth);

  const recalculateCompanyShare = (
    productId: string,
    salePriceValue: string,
    mode: "auto" | "manual",
    currentCompanyShare: string,
  ) => {
    const product = store.products.find((item) => item.id === productId);
    if (!product) {
      return currentCompanyShare;
    }

    if (mode === "manual" || product.companyShareMethod === "manual") {
      return currentCompanyShare;
    }

    return toInputString(calculateCompanyShare(product, parseNumberInput(salePriceValue)));
  };

  const resetForm = () => {
    setForm(createEmptyDealForm(selectedMonth));
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

  const openEditPanel = (dealId: string) => {
    const deal = store.deals.find((item) => item.id === dealId);
    if (!deal) {
      return;
    }

    const participants = store.dealParticipants.filter((participant) => participant.dealId === deal.id);
    setForm({
      id: deal.id,
      closedOn: deal.closedOn,
      productId: deal.productId,
      salePrice: toInputString(deal.salePrice),
      companyShare: toInputString(deal.companyShare),
      companyShareMode: deal.companyShareMode,
      countForCompanyRevenue: deal.countForCompanyRevenue,
      pattern: deal.pattern,
      note: deal.note,
      participants: participants.map((participant) => ({
        id: participant.id,
        memberId: participant.memberId,
        compensationTypeId: participant.compensationTypeId,
        note: participant.note,
      })),
    });
    setError("");
    setIsPanelOpen(true);
  };

  const handleProductChange = (productId: string) => {
    const product = store.products.find((item) => item.id === productId);

    setForm((current) => {
      const salePrice =
        product?.saleInputMode === "fixed_price"
          ? toInputString(product.defaultSalePrice)
          : current.salePrice;
      const companyShareMode =
        product?.companyShareMethod === "manual" ? "manual" : current.companyShareMode;
      const companyShare = recalculateCompanyShare(
        productId,
        salePrice,
        companyShareMode,
        current.companyShare,
      );

      return {
        ...current,
        productId,
        salePrice,
        companyShareMode,
        companyShare,
      };
    });
  };

  const handlePatternChange = (pattern: string) => {
    setForm((current) => ({
      ...current,
      pattern,
      participants: createPatternParticipants(pattern),
    }));
  };

  const handleSubmit = () => {
    if (!form.closedOn || !form.productId) {
      setError("成約日と商品は必須です。");
      return;
    }

    if (getMonthFromDate(form.closedOn) !== selectedMonth) {
      setError("この画面では対象月と同じ月の成約日だけ登録できます。");
      return;
    }

    if (parseNumberInput(form.salePrice) <= 0) {
      setError("売価を入力してください。");
      return;
    }

    if (duplicateMemberIds.length) {
      setError("同じメンバーが重複しています。");
      return;
    }

    if (form.participants.length === 0) {
      setError("参加者を1名以上登録してください。");
      return;
    }

    if (
      form.participants.some((participant) => !participant.memberId || !participant.compensationTypeId)
    ) {
      setError("参加者ごとのメンバーと報酬区分をすべて選択してください。");
      return;
    }

    saveDealWithParticipants({
      id: form.id,
      targetMonth: selectedMonth,
      closedOn: form.closedOn,
      productId: form.productId,
      salePrice: parseNumberInput(form.salePrice),
      companyShare: parseNumberInput(form.companyShare),
      companyShareMode: form.companyShareMode,
      countForCompanyRevenue: form.countForCompanyRevenue,
      pattern: form.pattern,
      note: form.note.trim(),
      participants: form.participants,
    });

    closePanel();
  };

  return (
    <>
      <PageSection
        title={`${formatMonthLabel(selectedMonth)}の成約一覧`}
        description="この月に成約した案件を1件ずつ登録します。成約日は対象月の範囲内だけ入力できます。"
        action={
          <button
            type="button"
            onClick={openCreatePanel}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            成約追加
          </button>
        }
      >
        {monthDeals.length ? (
          <div className="space-y-3">
            {monthDeals.map((deal) => {
              const product = store.products.find((item) => item.id === deal.productId);
              const participants = store.dealParticipants.filter(
                (participant) => participant.dealId === deal.id,
              );

              return (
                <div key={deal.id} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">
                          {product?.name ?? "未設定の商品"}
                        </p>
                        <Badge>{deal.pattern}</Badge>
                        {deal.countForCompanyRevenue ? (
                          <Badge tone="teal">会社売上に計上</Badge>
                        ) : (
                          <Badge tone="rose">会社売上に計上しない</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {formatDateLabel(deal.closedOn)} / 対象月 {formatMonthLabel(deal.targetMonth)}
                      </p>
                      <p className="text-sm text-slate-600">
                        売価 {formatCurrency(deal.salePrice)} / 会社取り分 {formatCurrency(deal.companyShare)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {participants.map((participant) => {
                          const member = store.members.find((item) => item.id === participant.memberId);

                          return (
                            <Badge key={participant.id}>
                              {member?.name ?? "未設定"} / {participant.compensationTypeId}
                            </Badge>
                          );
                        })}
                      </div>
                      {deal.note ? <p className="text-sm leading-6 text-slate-600">{deal.note}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPanel(deal.id)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDeal(deal.id)}
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
            title={`${formatMonthLabel(selectedMonth)}の成約はまだありません`}
            description="成約追加からこの月の成約を登録してください。"
          />
        )}
      </PageSection>

      <OverlayPanel
        open={isPanelOpen}
        title={form.id ? "成約を編集" : "成約追加"}
        description={`${formatMonthLabel(selectedMonth)}の成約だけ登録できます。`}
        onClose={closePanel}
      >
        <div className="grid gap-4 xl:grid-cols-[repeat(4,minmax(0,1fr))]">
          <div>
            <Label>対象月</Label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              {formatMonthLabel(selectedMonth)}
            </div>
          </div>
          <div>
            <Label required>成約日</Label>
            <Input
              type="date"
              value={form.closedOn}
              min={minDate}
              max={maxDate}
              onChange={(event) => setForm((current) => ({ ...current, closedOn: event.target.value }))}
            />
          </div>
          <div>
            <Label required>商品</Label>
            <Select value={form.productId} onChange={(event) => handleProductChange(event.target.value)}>
              <option value="">選択してください</option>
              {store.products
                .filter((product) => product.isActive || product.id === form.productId)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label>成約形態</Label>
            <Select value={form.pattern} onChange={(event) => handlePatternChange(event.target.value)}>
              {DEAL_PATTERN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>売価</Label>
            <Input
              value={form.salePrice}
              onChange={(event) =>
                setForm((current) => {
                  const salePrice = event.target.value;
                  return {
                    ...current,
                    salePrice,
                    companyShare: recalculateCompanyShare(
                      current.productId,
                      salePrice,
                      current.companyShareMode,
                      current.companyShare,
                    ),
                  };
                })
              }
              inputMode="numeric"
              placeholder="880000"
            />
          </div>
          <div>
            <Label>会社取り分モード</Label>
            <Select
              value={form.companyShareMode}
              onChange={(event) =>
                setForm((current) => {
                  const mode = event.target.value as "auto" | "manual";
                  return {
                    ...current,
                    companyShareMode: mode,
                    companyShare: recalculateCompanyShare(
                      current.productId,
                      current.salePrice,
                      mode,
                      current.companyShare,
                    ),
                  };
                })
              }
            >
              <option value="auto">自動計算</option>
              <option value="manual">手入力</option>
            </Select>
          </div>
          <div>
            <Label>会社取り分</Label>
            <Input
              value={form.companyShare}
              onChange={(event) => setForm((current) => ({ ...current, companyShare: event.target.value }))}
              inputMode="numeric"
              placeholder="350000"
            />
          </div>
          <div>
            <Label>会社全体売上に計上</Label>
            <Select
              value={form.countForCompanyRevenue ? "yes" : "no"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  countForCompanyRevenue: event.target.value === "yes",
                }))
              }
            >
              <option value="yes">計上する</option>
              <option value="no">計上しない</option>
            </Select>
          </div>
          <div className="xl:col-span-4">
            <Label>備考</Label>
            <Textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="成約のメモ"
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">参加者</p>
              <p className="text-sm text-slate-500">
                同じメンバーの重複登録は警告します。会社売上は1件につき1回だけ計上されます。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    participants: [...current.participants, createParticipant()],
                  }))
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
              >
                参加者追加
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    participants: createPatternParticipants(current.pattern),
                  }))
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
              >
                形態初期値に戻す
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {form.participants.map((participant, index) => (
              <div
                key={participant.id ?? `new_${index}`}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <div>
                  <Label>メンバー</Label>
                  <Select
                    value={participant.memberId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        participants: current.participants.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, memberId: event.target.value } : item,
                        ),
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
                  <Label>報酬区分</Label>
                  <Select
                    value={participant.compensationTypeId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        participants: current.participants.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, compensationTypeId: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  >
                    <option value="">選択してください</option>
                    {activeCompensationTypes
                      .filter(
                        (type) =>
                          type.dealPattern === form.pattern ||
                          type.dealPattern === "ANY" ||
                          type.id === participant.compensationTypeId,
                      )
                      .map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                  </Select>
                </div>
                <div>
                  <Label>備考</Label>
                  <Input
                    value={participant.note}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        participants: current.participants.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, note: event.target.value } : item,
                        ),
                      }))
                    }
                    placeholder="参加者メモ"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        participants: current.participants.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    className="w-full rounded-lg border border-rose-200 px-4 py-2.5 text-sm text-rose-700 transition hover:bg-rose-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedProduct ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            商品設定: {selectedProduct.name} / 売価入力 {selectedProduct.saleInputMode} / 会社取り分方式{" "}
            {selectedProduct.companyShareMethod}
            {form.companyShareMode === "auto"
              ? ` / 自動計算結果 ${formatCurrency(parseNumberInput(form.companyShare))}`
              : " / 手入力モード"}
          </div>
        ) : null}

        {duplicateMemberIds.length ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            同じメンバーが複数回選ばれています。意図した登録か確認してください。
          </div>
        ) : null}

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
            {form.id ? "更新" : "成約追加"}
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
