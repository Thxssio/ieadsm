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
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/client";

const IMAGE_OPTIONS = ["/capa.png", "/logo.png", "/dark.svg", "/light.svg"];

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
  image: "/capa.png",
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

export default function AdminNewsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
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
    if (!db || !canSubmit) return;
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
      image: post.image || "/capa.png",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (postId: string) => {
    if (!db) return;
    const ok = window.confirm("Deseja excluir esta notícia?");
    if (!ok) return;
    await deleteDoc(doc(db, "news", postId));
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
                <select
                  value={form.image}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, image: event.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white"
                >
                  {IMAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
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
                        src={post.image || "/capa.png"}
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
