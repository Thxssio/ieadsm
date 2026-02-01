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
import { deleteStorageObject } from "@/lib/firebase/storageUtils";

type BoardMemberDoc = {
  id: string;
  role: string;
  name: string;
  photo?: string;
  order?: number;
};

const PHOTO_OPTIONS = [
  { label: "Sem foto", value: "" },
  { label: "Moisés", value: "/directors/Moises.png" },
  { label: "Joel", value: "/directors/Joel.png" },
  { label: "José", value: "/directors/José.png" },
  { label: "Paulo", value: "/directors/Paulo.png" },
  { label: "Adonir", value: "/directors/Adonir.png" },
  { label: "Emerson", value: "/directors/Emerson.png" },
  { label: "Mauricio", value: "/directors/Mauricio.png" },
];

const emptyForm = {
  role: "",
  name: "",
  photo: "",
  order: 10,
};

const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) {
    return photo;
  }
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};
const defaultPhoto = "/logo.png";

export default function AdminBoardPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { pushToast } = useToast();
  const [items, setItems] = useState<BoardMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [previousPhoto, setPreviousPhoto] = useState("");

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
    const q = query(collection(db, "boardMembers"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<BoardMemberDoc, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const canSubmit = useMemo(
    () => form.role.trim().length > 0 && form.name.trim().length > 0,
    [form]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !canSubmit) {
      if (!db) {
        pushToast({
          type: "error",
          title: "Firebase não configurado",
          description: "Não foi possível salvar o membro da diretoria.",
        });
      }
      return;
    }
    const isEditing = Boolean(editingId);
    setSaving(true);
    const payload: Omit<BoardMemberDoc, "id"> = {
      role: form.role.trim(),
      name: form.name.trim(),
      order: Number(form.order) || 0,
    };
    if (form.photo) {
      payload.photo = form.photo;
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, "boardMembers", editingId), payload);
        if (previousPhoto && previousPhoto !== form.photo) {
          await deleteStorageObject(previousPhoto);
        }
      } else {
        await addDoc(collection(db, "boardMembers"), payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      setPreviousPhoto("");
      pushToast({
        type: "success",
        title: isEditing ? "Membro atualizado" : "Membro adicionado",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: isEditing
          ? "Falha ao atualizar membro"
          : "Falha ao adicionar membro",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: BoardMemberDoc) => {
    setEditingId(item.id);
    setPreviousPhoto(item.photo || "");
    setForm({
      role: item.role || "",
      name: item.name || "",
      photo: item.photo || "",
      order: item.order ?? 10,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setPreviousPhoto("");
    setForm(emptyForm);
  };

  const uploadPhoto = async (file: File) => {
    if (!storage) {
      setUploadError("Storage não configurado.");
      pushToast({
        type: "error",
        title: "Storage não configurado",
        description: "Não foi possível enviar a foto.",
      });
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileRef = ref(
        storage,
        `uploads/board/${Date.now()}-${safeName}`
      );
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setForm((prev) => ({ ...prev, photo: url }));
      pushToast({
        type: "success",
        title: "Foto enviada",
      });
    } catch (error) {
      setUploadError("Falha ao enviar a foto.");
      pushToast({
        type: "error",
        title: "Falha ao enviar a foto",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingPhoto(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void uploadPhoto(file);
    }
  };

  const handlePhotoDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleDelete = async (itemId: string) => {
    if (!db) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível excluir o membro.",
      });
      return;
    }
    const ok = window.confirm("Deseja excluir este membro da diretoria?");
    if (!ok) return;
    try {
      const target = items.find((item) => item.id === itemId);
      await deleteDoc(doc(db, "boardMembers", itemId));
      if (target?.photo) {
        await deleteStorageObject(target.photo);
      }
      pushToast({
        type: "success",
        title: "Membro removido",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Falha ao excluir membro",
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
              Diretoria Executiva
            </h1>
            <p className="text-slate-500">
              Ajuste os membros exibidos na página institucional.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin/configuracoes")}
            className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md"
          >
            Voltar às configurações
          </button>
        </div>

        {!db ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <p className="text-slate-500">
              Firebase não configurado. Adicione as variáveis de ambiente para
              liberar o gerenciamento da diretoria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
            <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                {editingId ? "Editar membro" : "Novo membro"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, role: event.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Ex.: Presidente"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Nome do dirigente"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Foto
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Se deixar vazio, a imagem padrão será usada.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <select
                      value={form.photo}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, photo: event.target.value }))
                      }
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    >
                      {PHOTO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                      <img
                        src={safePhoto(form.photo) || defaultPhoto}
                        alt="Preview da foto"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <input
                      id="board-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadPhoto(file);
                        }
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor="board-photo-upload"
                      onDrop={handlePhotoDrop}
                      onDragOver={handlePhotoDragOver}
                      onDragEnter={() => setIsDraggingPhoto(true)}
                      onDragLeave={() => setIsDraggingPhoto(false)}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed text-sm font-medium transition cursor-pointer w-full sm:w-auto sm:min-w-[240px] ${
                        isDraggingPhoto
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Arraste a foto aqui</span>
                      <span className="text-xs text-slate-500">
                        ou clique para enviar
                      </span>
                    </label>
                    {uploading ? (
                      <span className="text-xs text-slate-500">
                        Enviando imagem...
                      </span>
                    ) : null}
                    {form.photo ? (
                      <button
                        type="button"
                        onClick={() => {
                          void deleteStorageObject(form.photo);
                          setForm((prev) => ({ ...prev, photo: "" }));
                          setPreviousPhoto("");
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Remover foto
                      </button>
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
                      : "Adicionar membro"}
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
                Membros cadastrados
              </h2>
              {loading ? (
                <p className="text-slate-500">Carregando...</p>
              ) : items.length === 0 ? (
                <p className="text-slate-500">
                  Nenhum membro cadastrado ainda.
                </p>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-100 rounded-2xl p-4 flex gap-4 items-start"
                    >
                      <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                        <img
                          src={safePhoto(item.photo) || defaultPhoto}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800">{item.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {item.role}
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
