"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  Award,
  BookOpen,
  Clock,
  Flame,
  Heart,
  Sun,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { db } from "@/lib/firebase/client";
import { serviceTimes, type ServiceTime } from "@/data/site";
import { AdminHeader } from "@/components/admin/AdminHeader";

const ICON_OPTIONS = [
  "Sun",
  "Flame",
  "Heart",
  "BookOpen",
  "Award",
  "Users",
  "Clock",
] as const;

const COLOR_OPTIONS = [
  "bg-yellow-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-blue-600",
  "bg-green-600",
  "bg-purple-600",
] as const;

const iconMap = {
  Sun,
  Flame,
  Heart,
  BookOpen,
  Award,
  Users,
  Clock,
};

type ServiceTimeDoc = Omit<ServiceTime, "id"> & { id: string };

const emptyForm = {
  day: "",
  label: "",
  times: "",
  iconName: "Clock" as (typeof ICON_OPTIONS)[number],
  color: "bg-blue-600",
  textColor: "text-blue-600",
  order: 1,
};

export default function AdminAgendaPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { pushToast } = useToast();
  const [items, setItems] = useState<ServiceTimeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/?login=1");
    }
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (!db) {
      setItems(
        serviceTimes.map((item, index) => ({
          ...item,
          id: String(item.id ?? index),
        }))
      );
      setLoading(false);
      return;
    }
    const q = query(collection(db, "serviceTimes"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<ServiceTimeDoc, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const canSubmit = useMemo(
    () => form.day.trim().length > 0 && form.times.trim().length > 0,
    [form]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !canSubmit) {
      if (!db) {
        pushToast({
          type: "error",
          title: "Firebase não configurado",
          description: "Não foi possível salvar o horário.",
        });
      }
      return;
    }
    const isEditing = Boolean(editingId);
    setSaving(true);
    const payload = {
      day: form.day.trim(),
      label: form.label.trim(),
      times: form.times.split("\n").map((t) => t.trim()).filter(Boolean),
      iconName: form.iconName,
      color: form.color,
      textColor: form.textColor,
      order: Number(form.order) || 0,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "serviceTimes", editingId), payload);
      } else {
        await addDoc(collection(db, "serviceTimes"), payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      pushToast({
        type: "success",
        title: isEditing ? "Horário atualizado" : "Horário adicionado",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: isEditing ? "Falha ao atualizar horário" : "Falha ao adicionar horário",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ServiceTimeDoc) => {
    setEditingId(item.id);
    setForm({
      day: item.day || "",
      label: item.label || "",
      times: (item.times || []).join("\n"),
      iconName: (item.iconName as (typeof ICON_OPTIONS)[number]) || "Clock",
      color: item.color || "bg-blue-600",
      textColor: item.textColor || "text-blue-600",
      order: item.order ?? 1,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (itemId: string) => {
    if (!db) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível excluir o horário.",
      });
      return;
    }
    const ok = window.confirm("Deseja excluir este horário?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "serviceTimes", itemId));
      pushToast({
        type: "success",
        title: "Horário removido",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Falha ao excluir horário",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    }
  };

  if (!isReady) {
    return <div className="min-h-screen pb-20 bg-slate-50" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      <AdminHeader
        title="Agenda de Cultos"
        subtitle="Atualize os horários semanais."
        icon={<Clock className="w-6 h-6" />}
        right={<span>{items.length} horários cadastrados</span>}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
          <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              {editingId ? "Editar horário" : "Novo horário"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dia
                </label>
                <input
                  type="text"
                  value={form.day}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, day: event.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Ex.: Domingo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, label: event.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Ex.: Dia do Senhor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Horários (um por linha)
                </label>
                <textarea
                  value={form.times}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, times: event.target.value }))
                  }
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="08:50 - Escola Bíblica Dominical"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ícone
                  </label>
                  <select
                    value={form.iconName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        iconName: event.target.value as (typeof ICON_OPTIONS)[number],
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white"
                  >
                    {ICON_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cor
                  </label>
                  <select
                    value={form.color}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        color: event.target.value as (typeof COLOR_OPTIONS)[number],
                        textColor: event.target.value.replace("bg-", "text-"),
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white"
                  >
                    {COLOR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ordem
                </label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, order: Number(event.target.value) }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  min={0}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit || saving}
                  className="px-6 py-3 rounded-full bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "Salvando..."
                    : editingId
                    ? "Salvar alterações"
                    : "Adicionar horário"}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition"
                  >
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Horários</h2>
            {loading ? (
              <p className="text-slate-500">Carregando horários...</p>
            ) : items.length === 0 ? (
              <p className="text-slate-500">Nenhum horário cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const Icon = iconMap[item.iconName as keyof typeof iconMap] || Clock;
                  return (
                    <div
                      key={item.id}
                      className="border border-slate-100 rounded-2xl overflow-hidden"
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${item.color}`}
                        >
                          <Icon size={22} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{item.day}</p>
                          <p className="text-sm text-slate-500">{item.label}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="px-3 py-2 rounded-full text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-2 rounded-full text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
