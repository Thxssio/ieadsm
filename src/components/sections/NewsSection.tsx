"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import NewsModal from "@/components/ui/NewsModal";

export type NewsPost = {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  image?: string;
  createdAt?: { toDate: () => Date } | Date | number | null;
};

const safeImage = (image?: string) => {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  if (!image.startsWith("/")) return "";
  return encodeURI(image);
};

const formatDate = (value?: NewsPost["createdAt"]) => {
  if (!value) return "";
  const date =
    typeof value === "number"
      ? new Date(value)
      : value instanceof Date
      ? value
      : value?.toDate
      ? value.toDate()
      : null;
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
};

export default function NewsSection() {
  const { settings } = useSiteSettings();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);

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

  const visiblePosts = useMemo(() => posts.slice(0, 6), [posts]);

  if (loading || visiblePosts.length === 0) {
    return <span id="noticias" className="block h-0 scroll-mt-40" />;
  }

  return (
    <section id="noticias" className="py-16 md:py-24 bg-white scroll-mt-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <span className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-2 block">
              Notícias
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {settings.newsTitle}
            </h2>
            <p className="text-slate-500 mt-3 text-lg">
              {settings.newsSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePosts.map((post) => (
            <article
              key={post.id}
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPost(post)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedPost(post);
                }
              }}
            >
              <div className="relative h-44 w-full bg-slate-100">
                <Image
                  src={safeImage(post.image) || "/capa.png"}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  unoptimized
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
                  {formatDate(post.createdAt)}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  {post.title}
                </h3>
                {post.excerpt ? (
                  <p className="text-sm text-slate-500 mt-3 flex-1">
                    {post.excerpt}
                  </p>
                ) : null}
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600">
                  Ler notícia
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <NewsModal
        open={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        title={selectedPost?.title ?? ""}
        date={formatDate(selectedPost?.createdAt)}
        image={safeImage(selectedPost?.image) || "/capa.png"}
        content={selectedPost?.content}
        excerpt={selectedPost?.excerpt}
      />
    </section>
  );
}
