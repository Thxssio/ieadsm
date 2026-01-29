"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, X } from "lucide-react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { defaultLinks, type LinkItem } from "@/data/links";

const normalizeUrl = (raw?: string) => {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const isGoogleFormsUrl = (raw?: string) => {
  if (!raw) return false;
  try {
    const url = new URL(normalizeUrl(raw));
    if (url.hostname === "forms.gle") return true;
    if (url.hostname === "docs.google.com" && url.pathname.includes("/forms/")) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

const buildEmbedUrl = (raw?: string) => {
  if (!raw) return "";
  try {
    const url = new URL(normalizeUrl(raw));
    if (url.hostname === "docs.google.com" && url.pathname.includes("/forms/")) {
      url.searchParams.set("embedded", "true");
    }
    return url.toString();
  } catch {
    return raw;
  }
};

export default function EventosPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<LinkItem | null>(null);

  useEffect(() => {
    if (!db) {
      setLinks(defaultLinks);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "links"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLinks(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as LinkItem[]
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const formLinks = useMemo(() => {
    const source = !loading && links.length === 0 ? defaultLinks : links;
    return [...source]
      .filter((link) => isGoogleFormsUrl(link.href))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [links, loading]);

  useEffect(() => {
    if (!activeForm) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveForm(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeForm]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="relative overflow-hidden border-b border-slate-200/70">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-slate-50 to-slate-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 sm:pt-14 sm:pb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
                Eventos
              </span>

              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
                Inscrições e formulários
              </h1>

              <p className="mt-3 text-slate-600 text-base sm:text-lg leading-relaxed">
                Os formulários abaixo são utilizados para inscrições em eventos,
                cadastros e outras finalidades. Clique para abrir o formulário.
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 border border-slate-200 px-4 py-3">
              <div className="text-xs text-slate-500">Disponíveis</div>
              <div className="text-lg font-extrabold text-slate-900">
                {formLinks.length}{" "}
                <span className="text-sm font-semibold text-slate-500">
                  formulário{formLinks.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-[220px] bg-white rounded-3xl border border-slate-200/70 animate-pulse"
              />
            ))}
          </div>
        ) : formLinks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/70 p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Nenhum formulário cadastrado
            </h2>
            <p className="text-slate-600 mt-2">
              Adicione links do Google Forms no painel de links para exibir aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {formLinks.map((link) => {
              const href = normalizeUrl(link.href);
              const title = link.text || "Formulário";

              return (
                <article
                  key={link.id || href || title}
                  className="group bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col transition hover:shadow-md"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="inline-flex items-center text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-3">
                          Google Forms
                        </div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                          {title}
                        </h2>
                        {href ? (
                          <p className="text-xs text-slate-400 mt-2 break-all">
                            {href}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveForm(link)}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition"
                      >
                        Inscrever-se
                      </button>
                      <a
                        href={href || link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir em nova aba
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {activeForm ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
          onClick={() => setActiveForm(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                  Formulário
                </p>
                <h2 className="text-lg font-bold text-slate-900">
                  {activeForm.text || "Inscrição"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveForm(null)}
                className="rounded-full p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-3">
              <a
                href={normalizeUrl(activeForm.href)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir em nova aba
              </a>
            </div>
            <div className="bg-white">
              {buildEmbedUrl(activeForm.href) ? (
                <iframe
                  src={buildEmbedUrl(activeForm.href)}
                  className="w-full h-[70vh]"
                  style={{ border: 0 }}
                  loading="lazy"
                  title={activeForm.text || "Formulário"}
                ></iframe>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  Não foi possível incorporar este formulário.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
