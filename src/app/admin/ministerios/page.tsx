"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { db, storage } from "@/lib/firebase/client";

type DepartmentDoc = {
  id: string;
  title: string;
  description: string;
  logo?: string;
  order?: number;
};

const LOGO_OPTIONS = [
  { label: "Sem logo", value: "" },
  { label: "UMADESMA", value: "/UMADESMA.png" },
  { label: "UFADESMA", value: "/UFADESMA.png" },
  { label: "DEFAM", value: "/DEFAM.png" },
  { label: "DEPAD", value: "/DEPAD.png" },
  { label: "DEPINF", value: "/DEPINF.png" },
  { label: "EBD", value: "/EBD.png" },
  { label: "Missões", value: "/MISSOES.png" },
  { label: "Música", value: "/MÚSICA.png" },
  { label: "Ação Social", value: "/ACAOSOCIAL.png" },
  { label: "Afinidade", value: "/AFINIDADE.png" },
  { label: "DECOM", value: "/DECOM.png" },
];

const emptyForm = {
  title: "",
  description: "",
  logo: "",
  order: 10,
};

const safeLogo = (logo?: string) => {
  if (!logo) return "";
  if (logo.startsWith("http://") || logo.startsWith("https://")) {
    return logo;
  }
  if (!logo.startsWith("/")) return "";
  return encodeURI(logo);
};

export default function AdminMinisteriosPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { pushToast } = useToast();
  const [items, setItems] = useState<DepartmentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/?login=1");
    }
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "departments"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<DepartmentDoc, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const canSubmit = useMemo(
    () => form.title.trim().length > 0 && form.description.trim().length > 0,
    [form]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !canSubmit) {
      if (!db) {
        pushToast({
          type: "error",
          title: "Firebase não configurado",
          description: "Não foi possível salvar o ministério.",
        });
      }
      return;
    }
    const isEditing = Boolean(editingId);
    setSaving(true);
    const payload: Omit<DepartmentDoc, "id"> = {
      title: form.title.trim(),
      description: form.description.trim(),
      order: Number(form.order) || 0,
    };
    if (form.logo) {
      payload.logo = form.logo;
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, "departments", editingId), payload);
      } else {
        await addDoc(collection(db, "departments"), payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      pushToast({
        type: "success",
        title: isEditing ? "Ministério atualizado" : "Ministério adicionado",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: isEditing
          ? "Falha ao atualizar ministério"
          : "Falha ao adicionar ministério",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: DepartmentDoc) => {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      logo: item.logo || "",
      order: item.order ?? 10,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const uploadLogo = async (file: File) => {
    if (!storage) {
      setUploadError("Storage não configurado.");
      pushToast({
        type: "error",
        title: "Storage não configurado",
        description: "Não foi possível enviar a logo.",
      });
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileRef = ref(
        storage,
        `uploads/departments/${Date.now()}-${safeName}`
      );
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setForm((prev) => ({ ...prev, logo: url }));
      pushToast({
        type: "success",
        title: "Logo enviada",
      });
    } catch (error) {
      setUploadError("Falha ao enviar a logo.");
      pushToast({
        type: "error",
        title: "Falha ao enviar a logo",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!db) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível excluir o ministério.",
      });
      return;
    }
    const ok = window.confirm("Deseja excluir este ministério?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "departments", itemId));
      pushToast({
        type: "success",
        title: "Ministério removido",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Falha ao excluir ministério",
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
    <main className="min-h-screen pb-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Ministérios e Departamentos
            </h1>
            <p className="text-slate-500">
              Crie, edite ou exclua os ministérios exibidos no site.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md"
          >
            Voltar ao painel
          </button>
        </div>

        {!db ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <p className="text-slate-500">
              Firebase não configurado. Adicione as variáveis de ambiente para
              liberar o gerenciamento de ministérios.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
            <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                {editingId ? "Editar ministério" : "Novo ministério"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Título
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Ex.: UMADESMA – União da Mocidade"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all resize-none"
                    placeholder="Descreva o ministério..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Logo
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Você pode escolher uma logo padrão ou enviar uma nova imagem.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <select
                      value={form.logo}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, logo: event.target.value }))
                      }
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    >
                      {LOGO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {form.logo ? (
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <Image
                          src={safeLogo(form.logo)}
                          alt="Preview da logo"
                          width={56}
                          height={56}
                          className="w-12 h-12 object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <input
                      id="department-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadLogo(file);
                        }
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor="department-logo-upload"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 transition cursor-pointer"
                    >
                      Enviar logo
                    </label>
                    {uploading ? (
                      <span className="text-xs text-slate-500">
                        Enviando imagem...
                      </span>
                    ) : null}
                  </div>
                  {uploadError && (
                    <p className="text-xs text-red-600 mt-2">{uploadError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ordem de exibição
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        order: Number(event.target.value),
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={!canSubmit || saving}
                    className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving
                      ? "Salvando..."
                      : editingId
                      ? "Salvar alterações"
                      : "Adicionar ministério"}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                Ministérios cadastrados
              </h2>
              {loading ? (
                <p className="text-slate-500">Carregando...</p>
              ) : items.length === 0 ? (
                <p className="text-slate-500">
                  Nenhum ministério cadastrado ainda.
                </p>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-100 rounded-2xl p-4 flex gap-4 items-start"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                        {item.logo ? (
                          <Image
                            src={safeLogo(item.logo)}
                            alt={item.title}
                            width={56}
                            height={56}
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">Sem logo</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-3">
                          {item.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          Ordem: {item.order ?? 0}
                        </p>
                        <div className="flex gap-3 mt-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 text-sm font-bold hover:text-blue-800"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 text-sm font-bold hover:text-red-700"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
