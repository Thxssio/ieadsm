"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, X, ArrowRight, CalendarDays } from "lucide-react"; // Adicionei CalendarDays
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { defaultLinks, type LinkItem } from "@/data/links";

// --- Funções Auxiliares (Mantidas iguais) ---
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

  // Fechar com ESC
  useEffect(() => {
    if (!activeForm) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveForm(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeForm]);

  return (
    <main className="min-h-screen bg-gray-50 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Header com Gradiente Suave */}
      <div className="relative border-b border-gray-200 bg-white pb-12 pt-16 sm:pb-16 sm:pt-24 lg:pt-32">
        <div className="absolute inset-0 -z-10 overflow-hidden">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-indigo-50/50 blur-3xl rounded-full opacity-60" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                </span>
                Eventos & Inscrições
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Participe dos nossos <span className="text-indigo-600">eventos</span>
              </h1>
              
              <p className="mt-4 text-lg leading-8 text-gray-600">
                Abaixo você encontra todos os formulários ativos para inscrições, 
                listas de espera e cadastros. Selecione um evento para começar.
              </p>
            </div>

            {/* Contador Estilizado */}
            {!loading && (
                <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] ring-1 ring-gray-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <CalendarDays className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Disponíveis agora</p>
                        <p className="text-xl font-bold text-gray-900">
                            {formLinks.length} <span className="text-sm font-normal text-gray-400">formulários</span>
                        </p>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-64 rounded-3xl bg-gray-200/50 animate-pulse" />
            ))}
          </div>
        ) : formLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Nenhum evento ativo</h3>
            <p className="mt-1 text-gray-500">Volte mais tarde para novas inscrições.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {formLinks.map((link) => {
              const href = normalizeUrl(link.href);
              const title = link.text || "Formulário sem título";

              return (
                <article
                  key={link.id || href || title}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:ring-indigo-500/20 hover:-translate-y-1"
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-200">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Google Forms
                        </div>
                    </div>
                    
                    <h3 className="line-clamp-2 text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {title}
                    </h3>
                    
                    <p className="mt-2 line-clamp-1 text-xs text-gray-400 font-mono">
                      {href}
                    </p>
                  </div>

                  <div className="mt-8 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveForm(link)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      Inscrever-se
                      <ArrowRight className="h-4 w-4 opacity-70" />
                    </button>
                    
                    <a
                      href={href || link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Overlay */}
      {activeForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm transition-opacity"
          onClick={() => setActiveForm(null)}
        >
          {/* Container do Modal */}
          <div
            className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-gray-900/5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh' }}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                   <FileText className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-gray-900 truncate max-w-[200px] sm:max-w-md">
                  {activeForm.text || "Formulário"}
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                 <a
                    href={normalizeUrl(activeForm.href)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Abrir original <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => setActiveForm(null)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
              </div>
            </div>

            {/* Conteúdo do Modal (iFrame) */}
            <div className="flex-1 bg-gray-50 overflow-hidden relative">
              {buildEmbedUrl(activeForm.href) ? (
                <iframe
                  src={buildEmbedUrl(activeForm.href)}
                  className="h-full w-full border-0"
                  style={{ minHeight: '60vh' }} // Garante altura mínima
                  loading="lazy"
                  title={activeForm.text || "Formulário"}
                ></iframe>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center p-8">
                  <p className="text-gray-500 mb-4">
                    Não foi possível visualizar este formulário aqui.
                  </p>
                  <a 
                    href={normalizeUrl(activeForm.href)}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Clique para abrir externamente
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}