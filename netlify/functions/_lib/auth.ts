import { getStore } from "@netlify/blobs";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { AuthUser, ManagedUser, UserRole } from "../../../src/types/auth";

const AUTH_STORE_NAME = "leapseed-auth";
const APP_STORE_NAME = "leapseed-app";
const AUTH_BLOB_KEY = "state";
const APP_BLOB_KEY = "shared-store";
const SESSION_COOKIE_NAME = "leapseed_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

interface StoredAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface StoredSession {
  id: string;
  accountId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
}

interface AuthStoreState {
  version: number;
  accounts: StoredAccount[];
  sessions: StoredSession[];
}

const defaultAuthState = (): AuthStoreState => ({
  version: 1,
  accounts: [],
  sessions: [],
});

function getAuthStore() {
  return getStore(AUTH_STORE_NAME);
}

function getAppStore() {
  return getStore(APP_STORE_NAME);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function compareHashes(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookieHeader(header: string | null) {
  if (!header) {
    return {};
  }

  return header
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, segment) => {
      const separatorIndex = segment.indexOf("=");
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function createSessionCookie(token: string) {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function isSessionExpired(session: StoredSession) {
  return new Date(session.expiresAt).getTime() <= Date.now();
}

function pruneSessions(state: AuthStoreState) {
  return {
    ...state,
    sessions: state.sessions.filter((session) => !isSessionExpired(session)),
  };
}

export async function readAuthState() {
  const store = getAuthStore();
  const state =
    (await store.get(AUTH_BLOB_KEY, {
      type: "json",
    })) as AuthStoreState | null;

  return pruneSessions(state ?? defaultAuthState());
}

export async function writeAuthState(state: AuthStoreState) {
  const store = getAuthStore();
  await store.setJSON(AUTH_BLOB_KEY, pruneSessions(state));
}

export async function readSharedStore() {
  const store = getAppStore();
  return (await store.get(APP_BLOB_KEY, { type: "json" })) as unknown;
}

export async function writeSharedStore(data: unknown) {
  const store = getAppStore();
  await store.setJSON(APP_BLOB_KEY, data);
}

export function toManagedUser(account: StoredAccount): ManagedUser {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    lastLoginAt: account.lastLoginAt,
  };
}

export function toAuthUser(account: StoredAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
  };
}

export function createAccount(params: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}) {
  const timestamp = nowIso();
  const salt = randomBytes(16).toString("hex");

  const account: StoredAccount = {
    id: `user_${randomBytes(8).toString("hex")}`,
    email: normalizeEmail(params.email),
    name: params.name.trim(),
    role: params.role,
    passwordSalt: salt,
    passwordHash: hashPassword(params.password, salt),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return account;
}

export function verifyPassword(account: StoredAccount, password: string) {
  return compareHashes(account.passwordHash, hashPassword(password, account.passwordSalt));
}

export function validatePassword(password: string) {
  return password.trim().length >= 8;
}

export function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

export function getAccountByEmail(state: AuthStoreState, email: string) {
  const normalized = normalizeEmail(email);
  return state.accounts.find((account) => account.email === normalized) ?? null;
}

export async function createSessionForAccount(
  state: AuthStoreState,
  accountId: string,
) {
  const token = randomBytes(32).toString("base64url");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const nextState: AuthStoreState = {
    ...state,
    sessions: [
      ...state.sessions.filter((session) => session.accountId !== accountId),
      {
        id: `session_${randomBytes(8).toString("hex")}`,
        accountId,
        tokenHash: hashToken(token),
        createdAt,
        expiresAt,
      },
    ],
  };

  await writeAuthState(nextState);

  return {
    token,
    cookie: createSessionCookie(token),
    state: nextState,
  };
}

export async function deleteSession(req: Request) {
  const token = parseCookieHeader(req.headers.get("cookie"))[SESSION_COOKIE_NAME];
  if (!token) {
    return;
  }

  const state = await readAuthState();
  const tokenHash = hashToken(token);
  await writeAuthState({
    ...state,
    sessions: state.sessions.filter((session) => session.tokenHash !== tokenHash),
  });
}

export async function getCurrentAccount(req: Request) {
  const state = await readAuthState();
  const token = parseCookieHeader(req.headers.get("cookie"))[SESSION_COOKIE_NAME];

  if (!token) {
    return {
      state,
      account: null,
      bootstrapNeeded: state.accounts.length === 0,
    };
  }

  const session = state.sessions.find((candidate) => candidate.tokenHash === hashToken(token));
  if (!session) {
    return {
      state,
      account: null,
      bootstrapNeeded: state.accounts.length === 0,
    };
  }

  const account = state.accounts.find((candidate) => candidate.id === session.accountId) ?? null;

  return {
    state,
    account,
    bootstrapNeeded: state.accounts.length === 0,
  };
}

export function jsonResponse(
  body: unknown,
  init?: ResponseInit,
  headers?: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
      ...(headers ?? {}),
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, { status });
}
