import { getCurrentAccount, jsonResponse, toAuthUser } from "./_lib/auth";

export default async function session(req: Request) {
  const { account, bootstrapNeeded } = await getCurrentAccount(req);

  return jsonResponse({
    user: account ? toAuthUser(account) : null,
    bootstrapNeeded,
  });
}
