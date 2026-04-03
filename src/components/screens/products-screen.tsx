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
import { formatPercent, parseNumberInput, toInputString } from "@/lib/format";
import { createId } from "@/lib/ids";

interface ProductFormState {
  id?: string;
  name: string;
  isActive: boolean;
  saleInputMode: "manual" | "fixed_price";
  defaultSalePrice: string;
  companyShareMethod: "fixed_amount" | "percentage_of_sales" | "sales_minus_cost" | "manual";
  companyShareFixedAmount: string;
  companyShareRate: string;
  cost: string;
  note: string;
}

function createEmptyProductForm(): ProductFormState {
  return {
    name: "",
    isActive: true,
    saleInputMode: "manual",
    defaultSalePrice: "",
    companyShareMethod: "fixed_amount",
    companyShareFixedAmount: "",
    companyShareRate: "",
    cost: "",
    note: "",
  };
}

export function ProductsScreen() {
  const { store, saveProduct, deleteProduct } = useAppState();
  const [form, setForm] = useState<ProductFormState>(createEmptyProductForm);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm(createEmptyProductForm());
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

  const openEditPanel = (productId: string) => {
    const product = store.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    setForm({
      id: product.id,
      name: product.name,
      isActive: product.isActive,
      saleInputMode: product.saleInputMode,
      defaultSalePrice: toInputString(product.defaultSalePrice),
      companyShareMethod: product.companyShareMethod,
      companyShareFixedAmount: toInputString(product.companyShareFixedAmount),
      companyShareRate: toInputString(product.companyShareRate),
      cost: toInputString(product.cost),
      note: product.note,
    });
    setError("");
    setIsPanelOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("商品名は必須です。");
      return;
    }

    saveProduct({
      id: form.id || createId("product"),
      name: form.name.trim(),
      isActive: form.isActive,
      saleInputMode: form.saleInputMode,
      defaultSalePrice: parseNumberInput(form.defaultSalePrice),
      companyShareMethod: form.companyShareMethod,
      companyShareFixedAmount: parseNumberInput(form.companyShareFixedAmount),
      companyShareRate: parseNumberInput(form.companyShareRate),
      cost: parseNumberInput(form.cost),
      note: form.note.trim(),
    });

    closePanel();
  };

  return (
    <>
      <PageSection
        title="商品一覧"
        description="一覧から編集を開く形にしています。追加するときだけ登録フォームを表示します。"
        action={
          <button
            type="button"
            onClick={openCreatePanel}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            商品追加
          </button>
        }
      >
        {store.products.length ? (
          <div className="space-y-3">
            {store.products.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-slate-900">{product.name}</p>
                      <Badge tone={product.isActive ? "teal" : "rose"}>
                        {product.isActive ? "有効" : "無効"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      売価入力: {product.saleInputMode === "fixed_price" ? "固定売価" : "手入力"} / 取り分方式:{" "}
                      {product.companyShareMethod}
                    </p>
                    <p className="text-sm text-slate-600">
                      固定額 {toInputString(product.companyShareFixedAmount) || "0"} / 率{" "}
                      {formatPercent(product.companyShareRate)} / 原価{" "}
                      {toInputString(product.cost) || "0"}
                    </p>
                    {product.note ? (
                      <p className="text-sm leading-6 text-slate-600">{product.note}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditPanel(product.id)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProduct(product.id)}
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
            title="商品がまだありません"
            description="商品追加から登録すると、ここに一覧表示されます。"
          />
        )}
      </PageSection>

      <OverlayPanel
        open={isPanelOpen}
        title={form.id ? "商品編集" : "商品登録"}
        description="売価入力方式と会社取り分の算出方式を設定できます。"
        onClose={closePanel}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label required>商品名</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="例: LP制作"
            />
          </div>
          <div>
            <Label>有効状態</Label>
            <Select
              value={form.isActive ? "active" : "inactive"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.value === "active",
                }))
              }
            >
              <option value="active">有効</option>
              <option value="inactive">無効</option>
            </Select>
          </div>
          <div>
            <Label>売価入力方式</Label>
            <Select
              value={form.saleInputMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  saleInputMode: event.target.value as ProductFormState["saleInputMode"],
                }))
              }
            >
              <option value="manual">毎回手入力</option>
              <option value="fixed_price">固定売価</option>
            </Select>
          </div>
          <div>
            <Label>固定売価</Label>
            <Input
              value={form.defaultSalePrice}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultSalePrice: event.target.value }))
              }
              inputMode="numeric"
              placeholder="880000"
            />
          </div>
          <div>
            <Label>会社取り分算出方式</Label>
            <Select
              value={form.companyShareMethod}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  companyShareMethod:
                    event.target.value as ProductFormState["companyShareMethod"],
                }))
              }
            >
              <option value="fixed_amount">固定金額</option>
              <option value="percentage_of_sales">売価の割合</option>
              <option value="sales_minus_cost">売価 - 原価</option>
              <option value="manual">案件ごと手入力</option>
            </Select>
          </div>
          <div>
            <Label>固定取り分額</Label>
            <Input
              value={form.companyShareFixedAmount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  companyShareFixedAmount: event.target.value,
                }))
              }
              inputMode="numeric"
              placeholder="350000"
            />
          </div>
          <div>
            <Label>会社取り分率</Label>
            <Input
              value={form.companyShareRate}
              onChange={(event) =>
                setForm((current) => ({ ...current, companyShareRate: event.target.value }))
              }
              inputMode="decimal"
              placeholder="0.42"
            />
          </div>
          <div>
            <Label>原価</Label>
            <Input
              value={form.cost}
              onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))}
              inputMode="numeric"
              placeholder="180000"
            />
          </div>
          <div className="md:col-span-2">
            <Label>備考</Label>
            <Textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="計算ルールの補足"
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
            {form.id ? "商品更新" : "商品追加"}
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
