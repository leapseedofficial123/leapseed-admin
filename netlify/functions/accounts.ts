import {
  createAccount,
  errorResponse,
  getAccountByEmail,
  getCurrentAccount,
  jsonResponse,
  readAuthState,
  toManagedUser,
  validateEmail,
  validatePassword,
  writeAuthState,
} from "./_lib/auth";

interface CreateAccountPayload {
  email?: string;
  password?: string;
  name?: string;
}

export default async function accounts(req: Request) {
  const current = await getCurrentAccount(req);
  if (!current.account) {
    return errorResponse("ログインが必要です。", 401);
  }

  if (req.method === "GET") {
    return jsonResponse({
      currentUser: {
        id: current.account.id,
        email: current.account.email,
        name: current.account.name,
        role: current.account.role,
      },
      accounts: current.state.accounts.map(toManagedUser),
    });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  if (current.account.role !== "owner") {
    return errorResponse("アカウント管理はオーナーのみ操作できます。", 403);
  }

  const payload = (await req.json().catch(() => null)) as CreateAccountPayload | null;
  if (!payload?.name?.trim()) {
    return errorResponse("管理アカウント名を入力してください。");
  }

  if (!payload.email || !validateEmail(payload.email)) {
    return errorResponse("メールアドレスの形式が正しくありません。");
  }

  if (!payload.password || !validatePassword(payload.password)) {
    return errorResponse("パスワードは8文字以上で入力してください。");
  }

  const state = await readAuthState();
  if (getAccountByEmail(state, payload.email)) {
    return errorResponse("そのメールアドレスはすでに使われています。", 409);
  }

  const nextAccount = createAccount({
    email: payload.email,
    name: payload.name,
    password: payload.password,
    role: "admin",
  });

  const nextState = {
    ...state,
    accounts: [...state.accounts, nextAccount],
  };
  await writeAuthState(nextState);

  return jsonResponse(
    {
      account: toManagedUser(nextAccount),
    },
    { status: 201 },
  );
}
