"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, Input, Label, PageSection, Select } from "@/components/ui";
import { useAuth } from "@/context/auth-context";
import type { ManagedUser } from "@/types/auth";

export function AccessScreen() {
  const { user, listManagedUsers, createAdmin } = useAuth();
  const [accounts, setAccounts] = useState<ManagedUser[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    let cancelled = false;

    void listManagedUsers()
      .then((nextAccounts) => {
        if (!cancelled) {
          setAccounts(nextAccounts);
          setLoading(false);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "アカウント一覧を読み込めませんでした。");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listManagedUsers]);

  const ownerAccount = useMemo(
    () => accounts.find((account) => account.role === "owner") ?? null,
    [accounts],
  );

  const handleCreateAdmin = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const nextAccount = await createAdmin(form);
      setAccounts((current) => [...current, nextAccount].sort((left, right) => left.createdAt.localeCompare(right.createdAt)));
      setForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "管理アカウントを追加できませんでした。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageSection
        title="アクセス管理"
        description="オーナーと管理アカウントの一覧です。ログインできる人をここで管理します。"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm text-slate-500">現在ログイン中</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{user?.name ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-600">{user?.email ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm text-slate-500">オーナー</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{ownerAccount?.name ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-600">{ownerAccount?.email ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm text-slate-500">登録アカウント数</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{accounts.length}件</p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="アカウント一覧"
        description="owner は共有データと管理権限を持ちます。admin は日常の閲覧と編集ができます。"
      >
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            読み込み中...
          </div>
        ) : accounts.length ? (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">{account.name}</p>
                      <Badge tone={account.role === "owner" ? "amber" : "teal"}>
                        {account.role}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{account.email}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      作成: {new Date(account.createdAt).toLocaleString("ja-JP")} / 最終ログイン:{" "}
                      {account.lastLoginAt
                        ? new Date(account.lastLoginAt).toLocaleString("ja-JP")
                        : "未ログイン"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="アカウントがまだありません"
            description="オーナー登録後に管理アカウントを追加すると、複数端末で同じデータを共有できます。"
          />
        )}
      </PageSection>

      <PageSection
        title="管理アカウント追加"
        description="日常の入力や確認を任せる人用のログインを作成します。"
      >
        {user?.role !== "owner" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            管理アカウントの追加はオーナーのみ操作できます。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label required>表示名</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="管理者名"
              />
            </div>
            <div>
              <Label required>メールアドレス</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <Label required>権限</Label>
              <Select value="admin" disabled>
                <option value="admin">admin</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label required>パスワード</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="8文字以上"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void handleCreateAdmin()}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "追加中..." : "管理アカウントを追加"}
              </button>
            </div>
          </div>
        )}

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </PageSection>
    </div>
  );
}
