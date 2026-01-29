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
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { db, storage } from "@/lib/firebase/client";

const IMAGE_OPTIONS = [
  { label: "Capa padrão", value: "/capa.png" },
  { label: "Logo padrão", value: "/logo.png" },
  { label: "Dark", value: "/dark.svg" },
  { label: "Light", value: "/light.svg" },
];
const defaultImage = "/capa.png";

type NewsPost = {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  image?: string;
  createdAt?: { toDate: () => Date } | null;
  updatedAt?: { toDate: () => Date } | null;
};

const emptyForm = {
  title: "",
  excerpt: "",
  content: "",
  image: defaultImage,
};

const formatDate = (value?: NewsPost["createdAt"]) => {
  if (!value) return "";
  const date = value?.toDate ? value.toDate() : null;
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
};

const safeImage = (image?: string) => {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  if (!image.startsWith("/")) return "";
  return encodeURI(image);
};

export default function AdminNewsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { pushToast } = useToast();
  const [posts, setPosts] = useState<NewsPost[]>([]);
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
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPosts(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<NewsPost, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const canSubmit = useMemo(
    () => form.title.trim().length > 0 && form.excerpt.trim().length > 0,
    [form]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !canSubmit) {
      if (!db) {
        pushToast({
          type: "error",
          title: "Firebase não configurado",
          description: "Não foi possível salvar a notícia.",
        });
      }
      return;
    }
    const isEditing = Boolean(editingId);
    setSaving(true);

    try {
      if (editingId) {
        await updateDoc(doc(db, "news", editingId), {
          title: form.title.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content.trim(),
          image: form.image,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "news"), {
          title: form.title.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content.trim(),
          image: form.image,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setForm(emptyForm);
      setEditingId(null);
      pushToast({
        type: "success",
        title: isEditing ? "Notícia atualizada" : "Notícia publicada",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: isEditing ? "Falha ao atualizar notícia" : "Falha ao publicar notícia",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (post: NewsPost) => {
    setEditingId(post.id);
    setForm({
      title: post.title || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      image: post.image || defaultImage,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (postId: string) => {
    if (!db) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível excluir a notícia.",
      });
      return;
    }
    const ok = window.confirm("Deseja excluir esta notícia?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "news", postId));
      pushToast({
        type: "success",
        title: "Notícia removida",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Falha ao excluir notícia",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    }
  };

  const uploadImage = async (file: File) => {
    if (!storage) {
      setUploadError("Storage não configurado.");
      pushToast({
        type: "error",
        title: "Storage não configurado",
        description: "Não foi possível enviar a imagem da notícia.",
      });
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileRef = ref(storage, `uploads/news/${Date.now()}-${safeName}`);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setForm((prev) => ({ ...prev, image: url }));
      pushToast({
        type: "success",
        title: "Imagem da notícia enviada",
      });
    } catch {
      setUploadError("Falha ao enviar a imagem da notícia.");
      pushToast({
        type: "error",
        title: "Falha ao enviar a imagem da notícia",
        description: "Tente novamente em instantes.",
      });
    } finally {
      setUploading(false);
    }
  };

  const imageOptions = useMemo(() => {
    if (!form.image) return IMAGE_OPTIONS;
    const hasOption = IMAGE_OPTIONS.some((option) => option.value === form.image);
    if (hasOption) return IMAGE_OPTIONS;
    return [
      ...IMAGE_OPTIONS,
      { label: "Imagem personalizada", value: form.image },
    ];
  }, [form.image]);

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
            <h1 className="text-3xl font-bold text-slate-900">Notícias</h1>
            <p className="text-slate-500">
              Crie e edite os comunicados publicados na home.
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

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
          <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              {editingId ? "Editar notícia" : "Nova notícia"}
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
                  placeholder="Digite o título da notícia"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Resumo
                </label>
                <textarea
                  value={form.excerpt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, excerpt: event.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Resumo curto para o card"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Conteúdo completo (opcional)
                </label>
                <textarea
                  value={form.content}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, content: event.target.value }))
                  }
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Detalhes completos da notícia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Imagem
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Escolha uma imagem padrão ou envie uma nova.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  <select
                    value={form.image}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, image: event.target.value }))
                    }
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white"
                  >
                    {imageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="w-24 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                    <img
                      src={safeImage(form.image) || defaultImage}
                      alt="Prévia"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                  <input
                    id="news-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadImage(file);
                      }
                    }}
                    className="sr-only"
                  />
                  <label
                    htmlFor="news-image-upload"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 transition cursor-pointer"
                  >
                    Enviar imagem da notícia
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
                    : "Publicar notícia"}
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
              Publicadas
            </h2>
            {loading ? (
              <p className="text-slate-500">Carregando notícias...</p>
            ) : posts.length === 0 ? (
              <p className="text-slate-500">Nenhuma notícia publicada ainda.</p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border border-slate-100 rounded-2xl overflow-hidden"
                  >
                    <div className="relative h-32 w-full bg-slate-100">
                      <Image
                        src={safeImage(post.image) || defaultImage}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        unoptimized
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
                        {formatDate(post.createdAt)}
                      </p>
                      <h3 className="font-bold text-slate-900 mt-1">
                        {post.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-2">
                        {post.excerpt}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(post)}
                          className="px-4 py-2 rounded-full text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
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
      </div>
    </main>
  );
}
