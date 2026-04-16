"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Input } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { useAuth } from "@/context/auth-context";
import { ANALYSIS_RANGE_OPTIONS, APP_TITLE } from "@/lib/constants";
import { getRangeLabel } from "@/lib/date";
import type { AnalysisRangeMode } from "@/types/app";

const primaryItems = [
  { href: "/", label: "ダッシュボード" },
  { href: "/deals", label: "成約一覧" },
  { href: "/statements", label: "給与明細" },
  { href: "/monthly", label: "最終集計" },
];

const secondaryItems = [
  { href: "/products", label: "商品管理" },
  { href: "/company", label: "分析" },
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
  const {
    selectedMonth,
    setSelectedMonth,
    analysisRangeMode,
    setAnalysisRangeMode,
    isSyncing,
    syncError,
  } = useAppState();
  const { user, logout } = useAuth();

  const settingsItems = useMemo(
    () =>
      user?.role === "owner"
        ? [...secondaryItems, { href: "/access", label: "アクセス管理" }]
        : secondaryItems,
    [user?.role],
  );

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <BrandLogo width={132} priority className="mx-auto" />
        <h1 className="mt-3 text-center text-lg font-semibold tracking-tight text-slate-900">
          {APP_TITLE}
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-600">
          共有ログインで同じデータを確認できる給与計算画面です。
        </p>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">表示基準</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">対象期間</p>
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
              <Input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  if (event.target.value) {
                    setSelectedMonth(event.target.value);
                  }
                }}
              />
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
          items={settingsItems}
          pathname={pathname}
          onNavigate={() => setMenuOpen(false)}
        />
      </div>

      <div className="mt-auto border-t border-slate-200 px-5 py-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">{user?.name ?? "未ログイン"}</p>
          <p className="mt-1 text-xs text-slate-500">{user?.email ?? "-"}</p>
          <p className="mt-2 text-xs text-slate-500">権限: {user?.role ?? "-"}</p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 h-16 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
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

            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo width={76} className="shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{APP_TITLE}</p>
                <p className="hidden text-xs text-slate-500 sm:block">{user?.name ?? ""}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-slate-500">現在の表示範囲</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {getRangeLabel(selectedMonth, analysisRangeMode)}
              </p>
              <p className={`mt-1 text-xs ${syncError ? "text-rose-600" : "text-slate-500"}`}>
                {syncError ? syncError : isSyncing ? "共有データを同期中" : "共有データ同期済み"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white sm:hidden">
        <div className="overflow-x-auto px-4 py-3">
          <div className="flex w-max items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              {getRangeLabel(selectedMonth, analysisRangeMode)}
            </span>
            {primaryItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <p className={`mt-2 text-xs ${syncError ? "text-rose-600" : "text-slate-500"}`}>
            {syncError ? syncError : isSyncing ? "共有データを同期中" : "共有データ同期済み"}
          </p>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40">
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/35"
          />
          <aside className="absolute inset-y-0 left-0 w-[92vw] max-w-[360px] overflow-y-auto border-r border-slate-200 bg-white shadow-2xl">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <main className="min-h-[calc(100vh-4rem)] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</main>
    </div>
  );
}
