"use client";

import { useEffect, useMemo, useState, type FormEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { db, storage } from "@/lib/firebase/client";

type CongregationDoc = {
  id: string;
  sector: string;
  sectorOrder?: number;
  name: string;
  description?: string;
  leaders?: string;
  cep?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  supervision?: string;
  services?: string;
  photo?: string;
  order?: number;
};

const emptyForm = {
  sector: "",
  sectorOrder: 1,
  name: "",
  description: "",
  leaders: "",
  cep: "",
  address: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  supervision: "",
  services: "",
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

export default function AdminCongregacoesPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { pushToast } = useToast();
  const [items, setItems] = useState<CongregationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingFlashId, setEditingFlashId] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [lastCepLookup, setLastCepLookup] = useState("");

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
    const q = collection(db, "congregations");
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<CongregationDoc, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const sectorOptions = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.sector).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const canSubmit = useMemo(
    () => form.sector.trim().length > 0 && form.name.trim().length > 0,
    [form]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !canSubmit) {
      if (!db) {
        pushToast({
          type: "error",
          title: "Firebase não configurado",
          description: "Não foi possível salvar a congregação.",
        });
      }
      return;
    }
    const isEditing = Boolean(editingId);
    setSaving(true);
    const payload: Omit<CongregationDoc, "id"> = {
      sector: form.sector.trim(),
      sectorOrder: Number(form.sectorOrder) || 0,
      name: form.name.trim(),
      description: form.description.trim(),
      leaders: form.leaders.trim(),
      cep: form.cep.trim(),
      address: form.address.trim(),
      number: form.number.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      supervision: form.supervision.trim(),
      services: form.services.trim(),
      photo: form.photo.trim(),
      order: Number(form.order) || 0,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "congregations", editingId), payload);
      } else {
        await addDoc(collection(db, "congregations"), payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      pushToast({
        type: "success",
        title: isEditing ? "Congregação atualizada" : "Congregação adicionada",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: isEditing
          ? "Falha ao atualizar congregação"
          : "Falha ao adicionar congregação",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: CongregationDoc) => {
    setEditingId(item.id);
    setEditingFlashId(item.id);
    setTimeout(() => {
      setEditingFlashId((current) => (current === item.id ? null : current));
    }, 1200);
    setCepError("");
    setLastCepLookup("");
    setForm({
      sector: item.sector || "",
      sectorOrder: item.sectorOrder ?? 1,
      name: item.name || "",
      description: item.description || "",
      leaders: item.leaders || "",
      cep: item.cep || "",
      address: item.address || "",
      number: item.number || "",
      neighborhood: item.neighborhood || "",
      city: item.city || "",
      state: item.state || "",
      supervision: item.supervision || "",
      services: item.services || "",
      photo: item.photo || "",
      order: item.order ?? 10,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCepError("");
    setLastCepLookup("");
    setEditingFlashId(null);
  };

  const normalizeCep = (value: string) => value.replace(/\D/g, "");

  const handleCepLookup = async (rawCep: string) => {
    const cep = normalizeCep(rawCep);
    if (cep.length !== 8) {
      return;
    }
    if (cep === lastCepLookup) {
      return;
    }
    setCepLoading(true);
    setCepError("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) {
        throw new Error("CEP não encontrado.");
      }
      const data = (await response.json()) as {
        erro?: boolean;
        cep?: string;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) {
        throw new Error("CEP não encontrado.");
      }
      setLastCepLookup(cep);
      setForm((prev) => ({
        ...prev,
        cep: data.cep ?? prev.cep,
        address: data.logradouro || prev.address,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch (error) {
      setCepError(
        error instanceof Error
          ? error.message
          : "Não foi possível buscar o CEP."
      );
    } finally {
      setCepLoading(false);
    }
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
        `uploads/congregations/${Date.now()}-${safeName}`
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
        description: "Não foi possível excluir a congregação.",
      });
      return;
    }
    const ok = window.confirm("Deseja excluir esta congregação?");
    if (!ok) return;
    setDeletingId(itemId);
    try {
      await deleteDoc(doc(db, "congregations", itemId));
      pushToast({
        type: "success",
        title: "Congregação removida",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Falha ao excluir congregação",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const sectorA = Number(a.sectorOrder ?? 0);
      const sectorB = Number(b.sectorOrder ?? 0);
      if (sectorA !== sectorB) return sectorA - sectorB;
      const sectorLabel = a.sector.localeCompare(b.sector);
      if (sectorLabel !== 0) return sectorLabel;
      const orderA = Number(a.order ?? 0);
      const orderB = Number(b.order ?? 0);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

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
              Setores e Congregações
            </h1>
            <p className="text-slate-500">
              Cadastre congregações com endereço e foto.
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
              liberar o gerenciamento das congregações.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
            <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                {editingId ? "Editar congregação" : "Nova congregação"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Setor
                    </label>
                    <input
                      type="text"
                      list="sector-options"
                      value={form.sector}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          sector: event.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Ex.: SETOR 01 | MATRIZ"
                      required
                    />
                    <datalist id="sector-options">
                      {sectorOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Ordem do setor
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.sectorOrder}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          sectorOrder: Number(event.target.value),
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Congregação
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Ex.: Cong. Matriz"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Ex.: IEADSM | TEMPLO MATRIZ - SETOR 01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Foto da congregação
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Opcional. Se vazio, a imagem padrão será usada.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div
                      className={`w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden ${
                        uploading ? "animate-pulse" : ""
                      }`}
                    >
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
                      id="congregation-photo-upload"
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
                      htmlFor="congregation-photo-upload"
                      onDrop={handlePhotoDrop}
                      onDragOver={handlePhotoDragOver}
                      onDragEnter={() => setIsDraggingPhoto(true)}
                      onDragLeave={() => setIsDraggingPhoto(false)}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed text-sm font-medium transition cursor-pointer w-full sm:w-auto sm:min-w-[240px] ${
                        isDraggingPhoto || uploading
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
                  </div>
                  {uploadError && (
                    <p className="text-xs text-red-600 mt-2">{uploadError}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={form.cep}
                      onChange={(event) => {
                        setCepError("");
                        setForm((prev) => ({ ...prev, cep: event.target.value }));
                      }}
                      onBlur={(event) => {
                        void handleCepLookup(event.target.value);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="00000-000"
                    />
                    {cepLoading ? (
                      <p className="text-xs text-slate-500 mt-2">
                        Buscando endereço...
                      </p>
                    ) : null}
                    {cepError ? (
                      <p className="text-xs text-red-600 mt-2">{cepError}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, address: event.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Rua/Avenida"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Número
                    </label>
                    <input
                      type="text"
                      value={form.number}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, number: event.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Ex.: 123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={form.neighborhood}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          neighborhood: event.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Ex.: Centro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, city: event.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Ex.: Santa Maria"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      UF
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={form.state}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          state: event.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="RS"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Supervisão (uma linha por item)
                  </label>
                  <textarea
                    value={form.supervision}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        supervision: event.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="1° Pr. ...\n2° Ev. ..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dirigente(s) (uma linha por item)
                  </label>
                  <textarea
                    value={form.leaders}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        leaders: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Pr. ...\nEv. ..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cultos (uma linha por item)
                  </label>
                  <textarea
                    value={form.services}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, services: event.target.value }))
                    }
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Oração: Terças-feiras | 19h30min"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ordem de exibição (dentro do setor)
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
                    className={`px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      saving ? "animate-pulse" : ""
                    }`}
                  >
                    {saving
                      ? "Salvando..."
                      : editingId
                      ? "Salvar alterações"
                      : "Adicionar congregação"}
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
                Congregações cadastradas
              </h2>
              {loading ? (
                <p className="text-slate-500">Carregando...</p>
              ) : sortedItems.length === 0 ? (
                <p className="text-slate-500">
                  Nenhuma congregação cadastrada ainda.
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`border border-slate-100 rounded-2xl p-4 flex gap-4 items-start transition ${
                        deletingId === item.id ? "opacity-60 animate-pulse" : ""
                      } ${
                        editingId === item.id || editingFlashId === item.id
                          ? "ring-2 ring-blue-200 bg-blue-50/40"
                          : ""
                      }`}
                    >
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
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
                          {item.sector}
                        </p>
                        {item.city || item.state ? (
                          <p className="text-xs text-slate-400 mt-2">
                            {[item.city, item.state].filter(Boolean).join(" / ")}
                          </p>
                        ) : null}
                        <div className="flex gap-3 mt-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            disabled={deletingId === item.id}
                            className="text-blue-600 text-sm font-bold hover:text-blue-800 disabled:opacity-50"
                          >
                            {editingId === item.id ? "Editando..." : "Editar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="text-red-500 text-sm font-bold hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingId === item.id ? "Excluindo..." : "Excluir"}
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
