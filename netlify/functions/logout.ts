import { clearSessionCookie, deleteSession, jsonResponse } from "./_lib/auth";

export default async function logout(req: Request) {
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  await deleteSession(req);

  return jsonResponse(
    {
      ok: true,
    },
    undefined,
    { "set-cookie": clearSessionCookie() },
  );
}
