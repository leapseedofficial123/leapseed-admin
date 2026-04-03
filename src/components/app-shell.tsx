"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAppState } from "@/context/app-state-context";
import { ANALYSIS_RANGE_OPTIONS, APP_TITLE } from "@/lib/constants";
import { getRangeLabel } from "@/lib/date";
import { formatMonthLabel } from "@/lib/format";
import type { AnalysisRangeMode } from "@/types/app";

const primaryItems = [
  { href: "/", label: "ダッシュボード" },
  { href: "/deals", label: "成約一覧" },
  { href: "/statements", label: "給与明細" },
  { href: "/monthly", label: "最終集計" },
  { href: "/products", label: "商品管理" },
  { href: "/company", label: "分析" },
];

const secondaryItems = [
  { href: "/members", label: "メンバー管理" },
  { href: "/referrals", label: "紹介関係" },
  { href: "/executives", label: "役員設定" },
  { href: "/rates", label: "報酬率設定" },
];

function NavList({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { selectedMonth, setSelectedMonth, trackedMonths, analysisRangeMode, setAnalysisRangeMode } =
    useAppState();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
          LeapSeed Payroll
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{APP_TITLE}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          よく使う成約入力と給与明細を上にまとめ、初期設定系は下に分けています。
        </p>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">対象期間</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">期間区分</p>
              <select
                value={analysisRangeMode}
                onChange={(event) => setAnalysisRangeMode(event.target.value as AnalysisRangeMode)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                {ANALYSIS_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">基準月</p>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                {trackedMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-500">
              表示範囲: {getRangeLabel(selectedMonth, analysisRangeMode)}
            </p>
          </div>
        </div>

        <NavList
          title="Main"
          items={primaryItems}
          pathname={pathname}
          onNavigate={() => setMenuOpen(false)}
        />
        <NavList
          title="Settings"
          items={secondaryItems}
          pathname={pathname}
          onNavigate={() => setMenuOpen(false)}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 h-16 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
              onClick={() => setMenuOpen((current) => !current)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <span className="flex items-center gap-2">
                <span className="space-y-1">
                  <span className="block h-0.5 w-4 bg-current" />
                  <span className="block h-0.5 w-4 bg-current" />
                  <span className="block h-0.5 w-4 bg-current" />
                </span>
                {menuOpen ? "閉じる" : "メニュー"}
              </span>
            </button>

            {pathname !== "/" ? (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                戻る
              </button>
            ) : null}

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                LeapSeed Payroll
              </p>
              <p className="mt-1 font-semibold text-slate-900">{APP_TITLE}</p>
            </div>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-500">現在の表示範囲</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {getRangeLabel(selectedMonth, analysisRangeMode)}
            </p>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40">
          <button
            type="button"
            aria-label="メニューの外側を閉じる"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/35"
          />
          <aside className="absolute inset-y-0 left-0 w-[84vw] max-w-[320px] overflow-y-auto border-r border-slate-200 bg-white shadow-2xl">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <main className="min-h-[calc(100vh-4rem)] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</main>
    </div>
  );
}
