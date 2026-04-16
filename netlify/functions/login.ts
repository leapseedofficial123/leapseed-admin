import {
  createSessionForAccount,
  errorResponse,
  getAccountByEmail,
  jsonResponse,
  readAuthState,
  toAuthUser,
  verifyPassword,
  writeAuthState,
} from "./_lib/auth";

interface LoginPayload {
  email?: string;
  password?: string;
}

export default async function login(req: Request) {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const payload = (await req.json().catch(() => null)) as LoginPayload | null;
  if (!payload?.email || !payload.password) {
    return errorResponse("メールアドレスとパスワードを入力してください。");
  }

  const state = await readAuthState();
  if (!state.accounts.length) {
    return errorResponse("先にオーナー登録を完了してください。", 409);
  }

  const account = getAccountByEmail(state, payload.email);
  if (!account || !verifyPassword(account, payload.password)) {
    return errorResponse("ログイン情報が正しくありません。", 401);
  }

  const updatedState = {
    ...state,
    accounts: state.accounts.map((candidate) =>
      candidate.id === account.id
        ? {
            ...candidate,
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : candidate,
    ),
  };
  await writeAuthState(updatedState);

  const session = await createSessionForAccount(updatedState, account.id);
  const currentAccount =
    updatedState.accounts.find((candidate) => candidate.id === account.id) ?? account;

  return jsonResponse(
    {
      user: toAuthUser(currentAccount),
      bootstrapNeeded: false,
    },
    undefined,
    { "set-cookie": session.cookie },
  );
}
