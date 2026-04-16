export type UserRole = "owner" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface SessionPayload {
  user: AuthUser | null;
  bootstrapNeeded: boolean;
}

export interface ManagedUser extends AuthUser {
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}
