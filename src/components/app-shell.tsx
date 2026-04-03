"use client";

import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useAppState } from "@/context/app-state-context";
import { APP_TITLE } from "@/lib/constants";
import { formatMonthLabel } from "@/lib/format";

const navigationItems = [
  { href: "/", label: "ダッシュボード" },
  { href: "/deals", label: "案件入力" },
  { href: "/products", label: "商品管理" },
  { href: "/members", label: "メンバー管理" },
  { href: "/referrals", label: "紹介関係" },
  { href: "/executives", label: "役員設定" },
  { href: "/rates", label: "報酬率設定" },
  { href: "/monthly", label: "月次集計" },
  { href: "/company", label: "会社集計" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { selectedMonth, setSelectedMonth, trackedMonths, exportJson, importJson, resetData } =
    useAppState();

  const handleExport = () => {
    const payload = exportJson();
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leapseed-payroll-${selectedMonth}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    importJson(text);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 mb-6 border-b border-slate-200 bg-slate-50/95 pb-4 backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                LeapSeed Payroll
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{APP_TITLE}</h1>
                <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                  表示月: {formatMonthLabel(selectedMonth)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <span className="text-slate-500">対象月</span>
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="bg-transparent font-medium outline-none"
                >
                  {trackedMonths.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleExport}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                JSON出力
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                JSON取込
              </button>
              <button
                type="button"
                onClick={() => resetData("sample")}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white transition hover:bg-slate-800"
              >
                サンプル読込
              </button>
              <button
                type="button"
                onClick={() => resetData("blank")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                空データ化
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </div>

          <nav className="mt-4 overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {navigationItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
