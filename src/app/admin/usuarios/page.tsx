"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { 
  Users, 
  ArrowLeft, 
  Search, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye,
  EyeOff,
  KeyRound,
  Calendar,
  Monitor
} from "lucide-react";

// --- Tipos ---
type UserRow = {
  uid: string;
  email?: string;
  displayName?: string;
  disabled?: boolean;
  createdAt?: string;
  lastSignIn?: string;
  providerData?: string[];
};

type FormState = {
  email: string;
  password: string;
  displayName: string;
};

const emptyForm: FormState = {
  email: "",
  password: "",
  displayName: "",
};

// --- Helpers ---
const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getProviderIcon = (provider: string) => {
  if (provider.includes("google")) return "Google";
  if (provider.includes("github")) return "GitHub";
  if (provider === "password") return "Email/Senha";
  return provider;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, user, resetPassword } = useAuth();
  const { pushToast } = useToast();
  
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  
  // Form States
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/?login=1");
    }
  }, [isReady, isAuthenticated, router]);

  const loadUsers = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao buscar dados");
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadUsers();
  }, [isAuthenticated]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao criar");
      
      setForm(emptyForm);
      await loadUsers();
      pushToast({
        type: "success",
        title: "Usuário criado",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar usuário.";
      setError(message);
      pushToast({
        type: "error",
        title: "Falha ao criar usuário",
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!user || !window.confirm("Tem certeza que deseja remover este usuário permanentemente?")) return;
    
    try {
      setError("");
      setNotice("");
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid }),
      });
      if (!res.ok) throw new Error("Falha ao excluir");
      await loadUsers();
      pushToast({
        type: "success",
        title: "Usuário removido",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível excluir o usuário.";
      pushToast({
        type: "error",
        title: "Falha ao excluir usuário",
        description: message,
      });
    }
  };

  const handleResetPassword = async (email?: string) => {
    if (!email) {
      setError("Este usuário não possui email cadastrado.");
      setNotice("");
      pushToast({
        type: "error",
        title: "Email não cadastrado",
        description: "Este usuário não possui email cadastrado.",
      });
      return;
    }
    const result = await resetPassword(email);
    if (result.ok) {
      setError("");
      setNotice("Email de recuperação enviado.");
      pushToast({
        type: "success",
        title: "Recuperação enviada",
        description: "Email de recuperação enviado com sucesso.",
      });
    } else {
      const message =
        result.error || "Falha ao enviar email de recuperação.";
      setError(message);
      setNotice("");
      pushToast({
        type: "error",
        title: "Falha ao enviar recuperação",
        description: message,
      });
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid.includes(searchTerm)
  );

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      
      {/* Header Section */}
      <header className="bg-slate-50/95 border-b border-slate-200 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin")}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-slate-500"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                Gerenciamento de Acessos
              </h1>
            </div>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            {users.length} usuários cadastrados
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Users List (Occupies more space now) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Buscar por nome, email ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="flex gap-2 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                  <Monitor className="w-3 h-3" /> Painel Admin
                </span>
              </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-slate-900 font-medium">Nenhum usuário encontrado</h3>
                  <p className="text-slate-500 text-sm mt-1">Tente ajustar sua busca ou adicione um novo.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase font-semibold text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Usuário</th>
                        <th className="px-6 py-4">Autenticação</th>
                        <th className="px-6 py-4">Data Cadastro</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map((member) => (
                        <tr key={member.uid} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">
                                {member.displayName || "Sem nome"}
                              </span>
                              <span className="text-xs text-slate-500 font-mono mt-0.5">
                                {member.email}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {(member.providerData || []).map((p) => (
                                <span key={p} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {getProviderIcon(p)}
                                </span>
                              ))}
                              {(!member.providerData?.length) && (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatDateTime(member.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleResetPassword(member.email)}
                                disabled={!member.email}
                                className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 focus:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Enviar recuperação de senha"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(member.uid)}
                                className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 focus:opacity-100"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Form */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg shadow-indigo-900/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">Novo Acesso</h2>
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Plus className="w-4 h-4 text-indigo-600" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={form.displayName}
                      onChange={(e) => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                      placeholder="Ex: Ana Silva"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                      placeholder="ana@gmail.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Senha Provisória
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg animate-in fade-in slide-in-from-top-1">
                    {error}
                  </div>
                )}

                {notice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-lg animate-in fade-in slide-in-from-top-1">
                    {notice}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg shadow-md shadow-indigo-200 hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Cadastrar Usuário"
                  )}
                </button>
                
                <p className="text-center text-xs text-slate-400 mt-4">
                  O usuário receberá acesso imediato ao sistema.
                </p>
              </form>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
