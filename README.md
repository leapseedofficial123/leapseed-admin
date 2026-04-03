# LeapSeed 給料計算サイト

リープシードの月次給料計算を、Excelのシート複製型ではなく「案件中心データモデル」で扱う Next.js アプリです。

## 技術構成

- Next.js 16 / App Router
- TypeScript
- Tailwind CSS v4
- localStorage 保存
- 将来の Supabase 移行を見据えた repository / domain 分離

## 主なページ

- `/` ダッシュボード
- `/deals` 案件入力
- `/products` 商品管理
- `/members` メンバー管理
- `/referrals` 紹介関係管理
- `/executives` 役員報酬設定 + 月次会社設定
- `/rates` 報酬率設定
- `/monthly` 月次集計
- `/company` 会社全体集計

## 起動方法

```bash
npm install
npm run dev
```

本番ビルド確認:

```bash
npm run build
```

## データについて

- 初回起動時はサンプルデータを localStorage に投入します
- ヘッダーから JSON の入出力ができます
- `空データ化` で初期データなしの状態にも切り替えられます

## ディレクトリ概要

```text
src/
  app/                  ルーティング
  components/           画面と共通UI
  context/              アプリ状態管理
  lib/
    data/               空データ・サンプルデータ
    domain/             給料計算・会社取り分計算
    repository/         保存層
    constants.ts        初期定数
    format.ts           表示用フォーマット
    ids.ts              ID生成
  types/                型定義
```

## 主要ロジック

- 個人売上帯判定: その月に関与した案件の `売価` 合計
- 案件報酬: `会社取り分 x 売上帯に応じた区分別率`
- 会社全体売上: 案件ごとに1回だけ計上
- 役員報酬: 会社取り分合計を母数に、役員ごとの率で算出
- 紹介報酬: 紹介関係グラフを線形方程式として扱い、被紹介者の最終給料ベースで算出

## まず触る順番

1. `/members` でメンバー登録
2. `/products` で商品ルール登録
3. `/rates` で報酬区分と売上帯を確認
4. `/referrals` で紹介関係を設定
5. `/deals` で案件入力
6. `/executives` で月次経費と役員率を確認
7. `/monthly` と `/company` で結果確認
