"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Input, Label } from "@/components/ui";
import { useAppState } from "@/context/app-state-context";
import { useAuth } from "@/context/auth-context";

function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="text-center">
        <BrandLogo width={148} priority className="mx-auto" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { store, isStoreReady } = useAppState();
  const { isReady, user, bootstrapNeeded, login, bootstrapOwner } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [bootstrapForm, setBootstrapForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const summary = useMemo(
    () => ({
      members: store.members.length,
      products: store.products.length,
      deals: store.deals.length,
    }),
    [store.deals.length, store.members.length, store.products.length],
  );

  if (!isReady || (user && !isStoreReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <AuthCard
          title="LeapSeed給与計算"
          description="共有データを読み込んでいます。少しだけお待ちください。"
        >
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600">
            読み込み中...
          </div>
        </AuthCard>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      await login(loginForm.email, loginForm.password);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "ログインに失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBootstrap = async () => {
    if (bootstrapForm.password !== bootstrapForm.confirmPassword) {
      setError("確認用パスワードが一致していません。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await bootstrapOwner({
        name: bootstrapForm.name,
        email: bootstrapForm.email,
        password: bootstrapForm.password,
        seedStore: store,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "初期登録に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      {bootstrapNeeded ? (
        <AuthCard
          title="オーナー初期登録"
          description="このPCに入っている商品登録や案件データを、そのまま共有データとして引き継ぎます。最初のオーナーアカウントを作成してください。"
        >
          <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">引き継ぐ現在データ</p>
            <p className="mt-2">メンバー {summary.members}名 / 商品 {summary.products}件 / 成約 {summary.deals}件</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label required>オーナー名</Label>
              <Input
                value={bootstrapForm.name}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="LeapSeed オーナー"
              />
            </div>
            <div>
              <Label required>メールアドレス</Label>
              <Input
                type="email"
                value={bootstrapForm.email}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="owner@example.com"
              />
            </div>
            <div>
              <Label required>パスワード</Label>
              <Input
                type="password"
                value={bootstrapForm.password}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="8文字以上"
              />
            </div>
            <div>
              <Label required>確認用パスワード</Label>
              <Input
                type="password"
                value={bootstrapForm.confirmPassword}
                onChange={(event) =>
                  setBootstrapForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                placeholder="もう一度入力"
              />
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleBootstrap()}
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "登録中..." : "オーナー登録して共有を開始"}
          </button>
        </AuthCard>
      ) : (
        <AuthCard
          title="LeapSeed給与計算"
          description="オーナーまたは管理アカウントでログインすると、どの端末からでも同じ給与データを確認・編集できます。"
        >
          <div className="space-y-4">
            <div>
              <Label required>メールアドレス</Label>
              <Input
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="owner@example.com"
              />
            </div>
            <div>
              <Label required>パスワード</Label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="パスワード"
              />
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </button>
        </AuthCard>
      )}
    </div>
  );
}
