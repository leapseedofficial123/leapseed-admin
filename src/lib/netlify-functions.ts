import { withBasePath } from "@/lib/base-path";
import type { AppDataStore } from "@/types/app";
import type { ManagedUser, SessionPayload } from "@/types/auth";

export class FunctionApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FunctionApiError";
    this.status = status;
  }
}

function getFunctionUrl(name: string) {
  return withBasePath(`/.netlify/functions/${name}`);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: T | { error?: string } | null = null;

  if (text) {
    try {
      data = JSON.parse(text) as T | { error?: string };
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && data.error
        ? data.error
        : "サーバー処理に失敗しました。";
    throw new FunctionApiError(message, response.status);
  }

  return data as T;
}

export async function requestFunction<T>(
  name: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(getFunctionUrl(name), {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  return parseResponse<T>(response);
}

export function fetchSessionPayload() {
  return requestFunction<SessionPayload>("session");
}

export function loginWithPassword(email: string, password: string) {
  return requestFunction<SessionPayload>("login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutFromSession() {
  return requestFunction<{ ok: boolean }>("logout", {
    method: "POST",
  });
}

export function bootstrapOwnerAccount(payload: {
  name: string;
  email: string;
  password: string;
  seedStore: AppDataStore;
}) {
  return requestFunction<SessionPayload>("bootstrap-owner", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchSharedStore() {
  return requestFunction<{ store: unknown }>("app-store");
}

export function saveSharedStore(store: AppDataStore) {
  return requestFunction<{ ok: boolean; savedAt: string }>("app-store", {
    method: "PUT",
    body: JSON.stringify({ store }),
  });
}

export function fetchManagedUsers() {
  return requestFunction<{
    currentUser: ManagedUser;
    accounts: ManagedUser[];
  }>("accounts");
}

export function createAdminUser(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return requestFunction<{ account: ManagedUser }>("accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
