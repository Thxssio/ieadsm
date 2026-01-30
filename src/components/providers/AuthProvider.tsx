"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

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
  const lastUserRef = useRef<User | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const updatePresence = useCallback(
    async (currentUser: User, state: "online" | "offline") => {
      if (!db) return;
      try {
        const ref = doc(db, "presence", currentUser.uid);
        await setDoc(
          ref,
          {
            uid: currentUser.uid,
            email: currentUser.email ?? "",
            displayName: currentUser.displayName ?? "",
            state,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn("[AuthProvider] Presence update failed:", error);
      }
    },
    []
  );

  useEffect(() => {
    if (!auth) {
      setIsReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsReady(true);
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      if (currentUser) {
        lastUserRef.current = currentUser;
        void updatePresence(currentUser, "online");
        presenceIntervalRef.current = setInterval(() => {
          void updatePresence(currentUser, "online");
        }, 45000);
      } else if (lastUserRef.current) {
        void updatePresence(lastUserRef.current, "offline");
        lastUserRef.current = null;
      }
    });
    return () => unsub();
  }, [updatePresence]);

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
    const currentUser = auth.currentUser;
    if (currentUser) {
      await updatePresence(currentUser, "offline");
    }
    await signOut(auth);
  }, [updatePresence]);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) {
      return { ok: false, error: "Firebase Auth não configurado." };
    }
    const trimmed = email.trim();
    if (!trimmed) {
      return { ok: false, error: "Informe um email válido." };
    }
    try {
      const actionCodeSettings = {
        url: typeof window !== "undefined" 
          ? `${window.location.origin}/?mode=resetPassword` 
          : "https://ieadsm.web.app/?mode=resetPassword",
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, trimmed, actionCodeSettings);
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao enviar email de recuperação.";
      console.error("[AuthProvider] Reset password error:", error);
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
