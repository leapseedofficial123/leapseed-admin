import type { AppDataStore } from "../../src/types/app";
import {
  createAccount,
  createSessionForAccount,
  errorResponse,
  jsonResponse,
  readAuthState,
  toAuthUser,
  validateEmail,
  validatePassword,
  writeAuthState,
  writeSharedStore,
} from "./_lib/auth";

interface BootstrapPayload {
  email?: string;
  password?: string;
  name?: string;
  seedStore?: AppDataStore;
}

export default async function bootstrapOwner(req: Request) {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const payload = (await req.json().catch(() => null)) as BootstrapPayload | null;
  if (!payload) {
    return errorResponse("初期オーナー登録の内容を読み取れませんでした。");
  }

  if (!payload.name?.trim()) {
    return errorResponse("オーナー名を入力してください。");
  }

  if (!payload.email || !validateEmail(payload.email)) {
    return errorResponse("メールアドレスの形式が正しくありません。");
  }

  if (!payload.password || !validatePassword(payload.password)) {
    return errorResponse("パスワードは8文字以上で入力してください。");
  }

  const state = await readAuthState();
  if (state.accounts.length > 0) {
    return errorResponse("すでにオーナー登録が完了しています。", 409);
  }

  const owner = createAccount({
    email: payload.email,
    name: payload.name,
    password: payload.password,
    role: "owner",
  });

  await writeAuthState({
    ...state,
    accounts: [...state.accounts, owner],
  });

  await writeSharedStore(
    payload.seedStore
      ? payload.seedStore
      : {
          version: 2,
          members: [],
          products: [],
          deals: [],
          dealParticipants: [],
          compensationTypes: [],
          referralRelationships: [],
          compensationBands: [],
          monthlySettings: [],
          salaryAdjustments: [],
          memberExpenses: [],
          statementAdjustments: [],
          preferences: {
            displayMonth: new Date().toISOString().slice(0, 7),
            analysisRangeMode: "month",
          },
        },
  );

  const session = await createSessionForAccount(
    {
      ...state,
      accounts: [...state.accounts, owner],
    },
    owner.id,
  );

  return jsonResponse(
    {
      user: toAuthUser(owner),
      bootstrapNeeded: false,
    },
    { status: 201 },
    { "set-cookie": session.cookie },
  );
}
