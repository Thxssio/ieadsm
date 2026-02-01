"use client";

import { useEffect, useMemo, useState, type FormEvent, type DragEvent } from "react";
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

type LinkDoc = {
  id: string;
  text: string;
  href: string;
  order?: number;
  icon?: string;
};

const ICON_OPTIONS = [
  { label: "Padrão (logo)", value: "" },
  { label: "Logo IEADSM", value: "/logo.png" },
  { label: "Logo claro", value: "/light.svg" },
  { label: "Logo escuro", value: "/dark.svg" },
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
  text: "",
  href: "",
  order: 10,
  icon: "",
};

const safeIcon = (icon?: string) => {
  if (!icon) return "";
  if (icon.startsWith("http://") || icon.startsWith("https://")) return icon;
  if (!icon.startsWith("/")) return "";
  return encodeURI(icon);
};

export default function AdminLinksPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { pushToast } = useToast();
  const [items, setItems] = useState<LinkDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDraggingIcon, setIsDraggingIcon] = useState(false);

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
    const q = query(collection(db, "links"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<LinkDoc, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const canSubmit = useMemo(
    () => form.text.trim().length > 0 && form.href.trim().length > 0,
    [form]
  );
  const isRemoteIcon = /^https?:\/\//i.test(form.icon);
  const iconSelectValue = isRemoteIcon
    ? form.icon
    : ICON_OPTIONS.some((option) => option.value === form.icon)
    ? form.icon
    : "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !canSubmit) {
      if (!db) {
        pushToast({
          type: "error",
          title: "Firebase não configurado",
          description: "Não foi possível salvar o link.",
        });
      }
      return;
    }
    const isEditing = Boolean(editingId);
    setSaving(true);
    const payload: Omit<LinkDoc, "id"> = {
      text: form.text.trim(),
      href: form.href.trim(),
      order: Number(form.order) || 0,
      icon: form.icon.trim(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "links", editingId), payload);
      } else {
        await addDoc(collection(db, "links"), payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      pushToast({
        type: "success",
        title: isEditing ? "Link atualizado" : "Link adicionado",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: isEditing ? "Falha ao atualizar link" : "Falha ao adicionar link",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: LinkDoc) => {
    setEditingId(item.id);
    setUploadError("");
    setForm({
      text: item.text || "",
      href: item.href || "",
      order: item.order ?? 10,
      icon: item.icon || "",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setUploadError("");
  };

  const handleDelete = async (itemId: string) => {
    if (!db) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível excluir o link.",
      });
      return;
    }
    const ok = window.confirm("Deseja excluir este link?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "links", itemId));
      pushToast({
        type: "success",
        title: "Link removido",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Falha ao excluir link",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    }
  };

  const uploadIcon = async (file: File) => {
    if (!storage) {
      setUploadError("Storage não configurado.");
      pushToast({
        type: "error",
        title: "Storage não configurado",
        description: "Não foi possível enviar a imagem.",
      });
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileRef = ref(storage, `uploads/links/${Date.now()}-${safeName}`);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setForm((prev) => ({ ...prev, icon: url }));
      pushToast({
        type: "success",
        title: "Imagem enviada",
      });
    } catch (error) {
      setUploadError("Falha ao enviar a imagem.");
      pushToast({
        type: "error",
        title: "Falha ao enviar imagem",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleIconDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingIcon(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void uploadIcon(file);
    }
  };

  const handleIconDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
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
            <h1 className="text-3xl font-bold text-slate-900">Links</h1>
            <p className="text-slate-500">
              Gerencie os links exibidos na página de links.
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
              liberar o gerenciamento de links.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
            <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                {editingId ? "Editar link" : "Novo link"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Texto
                  </label>
                  <input
                    type="text"
                    value={form.text}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, text: event.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Ex.: Instagram"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    URL
                  </label>
                  <input
                    type="text"
                    value={form.href}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, href: event.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="https://"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ordem
                  </label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        order: Number(event.target.value),
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Imagem do link (opcional)
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Envie uma imagem para personalizar o link.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden ${
                        uploading ? "animate-pulse" : ""
                      }`}
                    >
                      {form.icon ? (
                        <Image
                          src={safeIcon(form.icon) || "/logo.png"}
                          alt=""
                          width={32}
                          height={32}
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <span className="text-xs text-slate-500">Logo</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      Você também pode escolher um ícone da biblioteca abaixo.
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <input
                      id="link-icon-upload"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadIcon(file);
                        }
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor="link-icon-upload"
                      onDrop={handleIconDrop}
                      onDragOver={handleIconDragOver}
                      onDragEnter={() => setIsDraggingIcon(true)}
                      onDragLeave={() => setIsDraggingIcon(false)}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed text-sm font-medium transition cursor-pointer w-full sm:w-auto sm:min-w-[240px] ${
                        isDraggingIcon || uploading
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Arraste a imagem aqui</span>
                      <span className="text-xs text-slate-500">
                        ou clique para enviar
                      </span>
                    </label>
                    {uploading ? (
                      <span className="text-xs text-slate-500">
                        Enviando imagem...
                      </span>
                    ) : null}
                  </div>
                  {uploadError ? (
                    <p className="text-xs text-red-600 mt-2">{uploadError}</p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ícone da biblioteca (opcional)
                  </label>
                  <select
                    value={iconSelectValue}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, icon: event.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white"
                  >
                    {isRemoteIcon ? (
                      <option value={form.icon}>Imagem enviada</option>
                    ) : null}
                    {ICON_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                      : "Adicionar link"}
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
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                Links cadastrados
              </h2>
              {loading ? (
                <p className="text-slate-500">Carregando links...</p>
              ) : items.length === 0 ? (
                <p className="text-slate-500">Nenhum link cadastrado.</p>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-100 rounded-2xl p-4 flex gap-4 items-start"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                        {item.icon ? (
                          <Image
                            src={safeIcon(item.icon) || "/logo.png"}
                            alt=""
                            width={32}
                            height={32}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <span className="text-xs text-slate-500">Logo</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">
                          {item.text}
                        </p>
                        <p className="text-xs text-slate-500 break-all">
                          {item.href}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Ordem: {item.order ?? 0}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="px-4 py-2 rounded-full text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="px-4 py-2 rounded-full text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition"
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
