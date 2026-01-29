"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

type AuthContextValue = {
  isAuthenticated: boolean;
  isReady: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setIsReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsReady(true);
    });
    return () => unsub();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!auth) {
        return { ok: false, error: "Firebase Auth não configurado." };
      }
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return { ok: true };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Falha ao autenticar.";
        return { ok: false, error: message };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) {
      return { ok: false, error: "Firebase Auth não configurado." };
    }
    const trimmed = email.trim();
    if (!trimmed) {
      return { ok: false, error: "Informe um email válido." };
    }
    try {
      await sendPasswordResetEmail(auth, trimmed);
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao enviar email de recuperação.";
      return { ok: false, error: message };
    }
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      isReady,
      user,
      login,
      resetPassword,
      logout,
    }),
    [isReady, user, login, resetPassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
