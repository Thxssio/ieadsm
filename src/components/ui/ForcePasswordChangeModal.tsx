"use client";

import { useEffect, useState, type FormEvent } from "react";
import { updatePassword } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { Eye, EyeOff, Lock } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export default function ForcePasswordChangeModal() {
  const { user, isAuthenticated } = useAuth();
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!db || !user) {
      setMustChangePassword(false);
      return;
    }
    const ref = doc(db, "userFlags", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() as { mustChangePassword?: boolean } | undefined;
      setMustChangePassword(Boolean(data?.mustChangePassword));
    });
    return () => unsub();
  }, [db, user]);

  if (!isAuthenticated || !user || !mustChangePassword) return null;

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    const trimmed = newPassword.trim();
    if (!trimmed || trimmed.length < 6) {
      setPasswordError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (trimmed !== confirmPassword.trim()) {
      setPasswordError("As senhas não conferem.");
      return;
    }
    setChangingPassword(true);
    try {
      await updatePassword(user, trimmed);
      if (db) {
        await setDoc(
          doc(db, "userFlags", user.uid),
          { mustChangePassword: false, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
      setMustChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const code = err?.code || "";
      const message =
        code === "auth/requires-recent-login"
          ? "Faça login novamente para atualizar sua senha."
          : err?.message || "Não foi possível atualizar a senha.";
      setPasswordError(message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Defina uma nova senha
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Sua senha é provisória. Para continuar, escolha uma nova senha.
          </p>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Nova senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type={showNewPassword ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
                title={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Confirmar senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
                title={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {passwordError ? (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">
              {passwordError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={changingPassword}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg shadow-md shadow-indigo-200 hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {changingPassword ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Atualizar senha"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
