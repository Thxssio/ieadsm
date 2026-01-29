"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Lock, 
  X, 
  Mail, 
  Loader2, 
  ShieldCheck 
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  redirectTo?: string;
};

export default function LoginModal({
  open,
  onClose,
  redirectTo = "/admin",
}: LoginModalProps) {
  const router = useRouter();
  const { login, resetPassword, isAuthenticated, isReady } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Travar scroll do body (com compensação de scrollbar)
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    const originalPadding = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPadding;
    };
  }, [open]);

  // Redirecionar se já logado
  useEffect(() => {
    if (!open) return;
    if (isReady && isAuthenticated) {
      onClose();
      router.push(redirectTo);
    }
  }, [open, isReady, isAuthenticated, onClose, router, redirectTo]);

  if (!open || !mounted) return null;

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setLoginError("");
    setLoginNotice("");

    try {
      const result = await login(email, password);
      if (result.ok) {
        onClose();
        router.push(redirectTo);
      } else {
        setLoginError(result.error || "Credenciais inválidas.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setLoginError("Digite seu email para recuperar a senha.");
      return;
    }
    
    setIsLoading(true);
    const result = await resetPassword(email);
    setIsLoading(false);

    if (result.ok) {
      setLoginError("");
      setLoginNotice("Enviamos um link de recuperação para seu email.");
    } else {
      setLoginError(result.error || "Falha ao enviar email.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop com Blur */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card com Animação */}
      <div
        className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="p-8 pt-10">
          {/* Header Visual */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 rotate-3 shadow-sm border border-indigo-100">
              <ShieldCheck className="text-indigo-600 w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Área Restrita
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Entre com suas credenciais de administrador
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Input Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide ml-1">
                Email
              </label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLoginError("");
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder="nome@gmail.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Senha
                </label>
              </div>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError("");
                  }}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Feedback Messages */}
            {loginError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {loginError}
              </div>
            )}

            {loginNotice && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {loginNotice}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  Acessar Painel <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Actions */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors disabled:opacity-50"
            >
              Esqueceu sua senha?
            </button>
          </div>
        </div>
        
        {/* Footer Decorativo Opcional */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      </div>
    </div>,
    document.body
  );
}
