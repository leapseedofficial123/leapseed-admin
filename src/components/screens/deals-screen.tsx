"use client";

import { useState } from "react";
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
import { calculateCompanyShare } from "@/lib/domain/company-share";
import {
  formatCurrency,
  formatDateLabel,
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
  targetMonth: string;
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
  return {
    targetMonth,
    closedOn: DEFAULT_TODAY,
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

  const activeCompensationTypes = store.compensationTypes.filter((type) => type.active);
  const selectedProduct = store.products.find((product) => product.id === form.productId);
  const duplicateMemberIds = form.participants
    .map((participant) => participant.memberId)
    .filter((memberId, index, list) => memberId && list.indexOf(memberId) !== index);

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

    const participants = store.dealParticipants.filter(
      (participant) => participant.dealId === deal.id,
    );

    setForm({
      id: deal.id,
      targetMonth: deal.targetMonth,
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
    if (!form.targetMonth || !form.closedOn || !form.productId) {
      setError("対象月・成約日・商品は必須です。");
      return;
    }

    if (parseNumberInput(form.salePrice) <= 0) {
      setError("売価を入力してください。");
      return;
    }

    if (duplicateMemberIds.length) {
      setError("同じメンバーが参加者に重複しています。");
      return;
    }

    if (
      form.participants.some(
        (participant) => !participant.memberId || !participant.compensationTypeId,
      )
    ) {
      setError("参加者ごとにメンバーと報酬適用区分を選択してください。");
      return;
    }

    saveDealWithParticipants({
      id: form.id,
      targetMonth: form.targetMonth,
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
        title="案件一覧"
        description="一覧から編集を開く形にしています。追加するときだけ案件入力フォームを表示します。"
        action={
          <button
            type="button"
            onClick={openCreatePanel}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            案件追加
          </button>
        }
      >
        {store.deals.length ? (
          <div className="space-y-3">
            {[...store.deals]
              .sort((left, right) => right.closedOn.localeCompare(left.closedOn))
              .map((deal) => {
                const product = store.products.find((item) => item.id === deal.productId);
                const participants = store.dealParticipants.filter(
                  (participant) => participant.dealId === deal.id,
                );

                return (
                  <div
                    key={deal.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">
                            {product?.name ?? "未設定商品"}
                          </p>
                          <Badge>{deal.pattern}</Badge>
                          {deal.countForCompanyRevenue ? (
                            <Badge tone="teal">会社売上に計上</Badge>
                          ) : (
                            <Badge tone="rose">会社売上に計上しない</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {formatDateLabel(deal.closedOn)} / 対象月 {deal.targetMonth}
                        </p>
                        <p className="text-sm text-slate-600">
                          売価 {formatCurrency(deal.salePrice)} / 会社取り分{" "}
                          {formatCurrency(deal.companyShare)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {participants.map((participant) => {
                            const member = store.members.find(
                              (item) => item.id === participant.memberId,
                            );

                            return (
                              <Badge key={participant.id}>
                                {member?.name ?? "不明"} / {participant.compensationTypeId}
                              </Badge>
                            );
                          })}
                        </div>
                        {deal.note ? (
                          <p className="text-sm leading-6 text-slate-600">{deal.note}</p>
                        ) : null}
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
            title="案件がまだありません"
            description="案件追加から登録すると、ここに一覧表示されます。"
          />
        )}
      </PageSection>

      <OverlayPanel
        open={isPanelOpen}
        title={form.id ? "案件編集" : "案件入力"}
        description="案件単位で入力し、参加者をぶら下げる形で管理します。"
        onClose={closePanel}
      >
        <div className="grid gap-4 xl:grid-cols-[repeat(4,minmax(0,1fr))]">
          <div>
            <Label required>対象月</Label>
            <Input
              type="month"
              value={form.targetMonth}
              onChange={(event) =>
                setForm((current) => ({ ...current, targetMonth: event.target.value }))
              }
            />
          </div>
          <div>
            <Label required>成約日</Label>
            <Input
              type="date"
              value={form.closedOn}
              onChange={(event) =>
                setForm((current) => ({ ...current, closedOn: event.target.value }))
              }
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
            <Label>案件パターン</Label>
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
              onChange={(event) =>
                setForm((current) => ({ ...current, companyShare: event.target.value }))
              }
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
              placeholder="案件の補足"
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">参加者</p>
              <p className="text-sm text-slate-500">
                同じ案件でも会社売上は1回だけ計上します。
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
                パターン初期化
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
                          itemIndex === index
                            ? { ...item, memberId: event.target.value }
                            : item,
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
                  <Label>報酬適用区分</Label>
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
                    placeholder="任意"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        participants: current.participants.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
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
            商品設定: {selectedProduct.name} / 売価入力 {selectedProduct.saleInputMode} / 取り分方式{" "}
            {selectedProduct.companyShareMethod}
            {form.companyShareMode === "auto"
              ? ` / 自動計算結果 ${formatCurrency(parseNumberInput(form.companyShare))}`
              : " / 手入力モード"}
          </div>
        ) : null}

        {duplicateMemberIds.length ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            同じメンバーが複数回選ばれています。重複登録の可能性があるので確認してください。
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
            {form.id ? "案件更新" : "案件追加"}
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
