"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppDataStore } from "@/types/app";
import type { AuthUser, ManagedUser } from "@/types/auth";
import {
  bootstrapOwnerAccount,
  createAdminUser,
  fetchManagedUsers,
  fetchSessionPayload,
  loginWithPassword,
  logoutFromSession,
} from "@/lib/netlify-functions";

interface AuthContextValue {
  user: AuthUser | null;
  isReady: boolean;
  bootstrapNeeded: boolean;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrapOwner: (payload: {
    name: string;
    email: string;
    password: string;
    seedStore: AppDataStore;
  }) => Promise<void>;
  listManagedUsers: () => Promise<ManagedUser[]>;
  createAdmin: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<ManagedUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [bootstrapNeeded, setBootstrapNeeded] = useState(false);

  const refreshSession = useCallback(async () => {
    const session = await fetchSessionPayload();
    setUser(session.user);
    setBootstrapNeeded(session.bootstrapNeeded);
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginWithPassword(email, password);
    setUser(session.user);
    setBootstrapNeeded(session.bootstrapNeeded);
    setIsReady(true);
  }, []);

  const logout = useCallback(async () => {
    await logoutFromSession();
    setUser(null);
    setBootstrapNeeded(false);
    setIsReady(true);
  }, []);

  const bootstrapOwner = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      seedStore: AppDataStore;
    }) => {
      const session = await bootstrapOwnerAccount(payload);
      setUser(session.user);
      setBootstrapNeeded(session.bootstrapNeeded);
      setIsReady(true);
    },
    [],
  );

  const listManagedUsers = useCallback(async () => {
    const response = await fetchManagedUsers();
    return response.accounts;
  }, []);

  const createAdmin = useCallback(
    async (payload: { name: string; email: string; password: string }) => {
      const response = await createAdminUser(payload);
      return response.account;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    void fetchSessionPayload()
      .then((session) => {
        if (cancelled) {
          return;
        }

        setUser(session.user);
        setBootstrapNeeded(session.bootstrapNeeded);
        setIsReady(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setUser(null);
        setBootstrapNeeded(false);
        setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      bootstrapNeeded,
      refreshSession,
      login,
      logout,
      bootstrapOwner,
      listManagedUsers,
      createAdmin,
    }),
    [
      user,
      isReady,
      bootstrapNeeded,
      refreshSession,
      login,
      logout,
      bootstrapOwner,
      listManagedUsers,
      createAdmin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
