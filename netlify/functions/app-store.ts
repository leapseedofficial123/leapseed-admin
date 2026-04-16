import {
  errorResponse,
  getCurrentAccount,
  jsonResponse,
  readSharedStore,
  writeSharedStore,
} from "./_lib/auth";

export default async function appStore(req: Request) {
  const current = await getCurrentAccount(req);
  if (!current.account) {
    return errorResponse("ログインが必要です。", 401);
  }

  if (req.method === "GET") {
    const store = await readSharedStore();
    return jsonResponse({
      store,
    });
  }

  if (req.method !== "PUT") {
    return errorResponse("Method not allowed", 405);
  }

  const payload = (await req.json().catch(() => null)) as { store?: unknown } | null;
  if (!payload?.store) {
    return errorResponse("共有データを読み取れませんでした。");
  }

  await writeSharedStore(payload.store);

  return jsonResponse({
    ok: true,
    savedAt: new Date().toISOString(),
  });
}
