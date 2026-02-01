"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { db } from "@/lib/firebase/client";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import { defaultSiteSettings, type SiteSettings } from "@/data/siteContent";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { settings, loading } = useSiteSettings();
  const { pushToast } = useToast();
  const [form, setForm] = useState<SiteSettings>(defaultSiteSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/?login=1");
    }
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (!loading) {
      setForm(settings);
    }
  }, [loading, settings]);

  const handleChange = (key: keyof SiteSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível salvar as configurações.",
      });
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "site"), form, { merge: true });
      pushToast({
        type: "success",
        title: "Configurações salvas",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Falha ao salvar configurações",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
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
            <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
            <p className="text-slate-500">Atualize os textos do site.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md"
          >
            Voltar ao painel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Diretoria Executiva
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Ajuste os membros exibidos na página institucional.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/admin/diretoria")}
              className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors bg-blue-50 px-5 py-2.5 rounded-full shadow-sm hover:shadow-md"
            >
              Gerenciar diretoria
            </button>
          </div>
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Setores e Congregações
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre congregações, endereços e fotos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/admin/congregacoes")}
              className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors bg-blue-50 px-5 py-2.5 rounded-full shadow-sm hover:shadow-md"
            >
              Gerenciar congregações
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-8"
        >
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Hero</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Badge
                </label>
                <input
                  type="text"
                  value={form.heroBadge}
                  onChange={(event) => handleChange("heroBadge", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Linha do título
                </label>
                <input
                  type="text"
                  value={form.heroTitleLine}
                  onChange={(event) =>
                    handleChange("heroTitleLine", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Destaque do título
                </label>
                <input
                  type="text"
                  value={form.heroTitleHighlight}
                  onChange={(event) =>
                    handleChange("heroTitleHighlight", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Referência bíblica
                </label>
                <input
                  type="text"
                  value={form.heroVerseRef}
                  onChange={(event) =>
                    handleChange("heroVerseRef", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Versículo
              </label>
              <textarea
                value={form.heroVerse}
                onChange={(event) => handleChange("heroVerse", event.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Programação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Eyebrow
                </label>
                <input
                  type="text"
                  value={form.scheduleEyebrow}
                  onChange={(event) =>
                    handleChange("scheduleEyebrow", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={form.scheduleTitle}
                  onChange={(event) =>
                    handleChange("scheduleTitle", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subtítulo
              </label>
              <textarea
                value={form.scheduleSubtitle}
                onChange={(event) =>
                  handleChange("scheduleSubtitle", event.target.value)
                }
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              Ministérios e notícias
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Eyebrow ministérios
                </label>
                <input
                  type="text"
                  value={form.departmentsEyebrow}
                  onChange={(event) =>
                    handleChange("departmentsEyebrow", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título ministérios (uma linha por linha)
                </label>
                <textarea
                  value={form.departmentsTitle}
                  onChange={(event) =>
                    handleChange("departmentsTitle", event.target.value)
                  }
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título notícias
                </label>
                <input
                  type="text"
                  value={form.newsTitle}
                  onChange={(event) => handleChange("newsTitle", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subtítulo notícias
                </label>
                <input
                  type="text"
                  value={form.newsSubtitle}
                  onChange={(event) =>
                    handleChange("newsSubtitle", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Mural e redes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título do mural
                </label>
                <input
                  type="text"
                  value={form.socialFeedTitle}
                  onChange={(event) =>
                    handleChange("socialFeedTitle", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Chamada redes sociais
                </label>
                <input
                  type="text"
                  value={form.socialPrompt}
                  onChange={(event) => handleChange("socialPrompt", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Instagram
                </label>
                <input
                  type="text"
                  value={form.socialInstagram}
                  onChange={(event) =>
                    handleChange("socialInstagram", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Facebook
                </label>
                <input
                  type="text"
                  value={form.socialFacebook}
                  onChange={(event) =>
                    handleChange("socialFacebook", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  YouTube
                </label>
                <input
                  type="text"
                  value={form.socialYoutube}
                  onChange={(event) =>
                    handleChange("socialYoutube", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Contato</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Eyebrow
                </label>
                <input
                  type="text"
                  value={form.mapEyebrow}
                  onChange={(event) => handleChange("mapEyebrow", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={form.mapTitle}
                  onChange={(event) => handleChange("mapTitle", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descrição
              </label>
              <textarea
                value={form.mapDescription}
                onChange={(event) =>
                  handleChange("mapDescription", event.target.value)
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                URL do mapa (embed)
              </label>
              <input
                type="text"
                value={form.mapEmbedUrl}
                onChange={(event) =>
                  handleChange("mapEmbedUrl", event.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                placeholder="https://www.google.com/maps/d/embed?mid=..."
              />
              <p className="text-xs text-slate-400 mt-2">
                Cole aqui o link de embed do Google Maps para atualizar o mapa.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                URL do mapa (painel)
              </label>
              <input
                type="text"
                value={form.adminMapEmbedUrl}
                onChange={(event) =>
                  handleChange("adminMapEmbedUrl", event.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                placeholder="https://www.google.com/maps/d/embed?mid=..."
              />
              <p className="text-xs text-slate-400 mt-2">
                Link privado usado apenas no painel administrativo.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título endereço
                </label>
                <input
                  type="text"
                  value={form.locationTitle}
                  onChange={(event) =>
                    handleChange("locationTitle", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Endereço linha 1
                </label>
                <input
                  type="text"
                  value={form.locationAddress1}
                  onChange={(event) =>
                    handleChange("locationAddress1", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Endereço linha 2
                </label>
                <input
                  type="text"
                  value={form.locationAddress2}
                  onChange={(event) =>
                    handleChange("locationAddress2", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  CEP
                </label>
                <input
                  type="text"
                  value={form.locationCep}
                  onChange={(event) => handleChange("locationCep", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Secretaria
                </label>
                <input
                  type="text"
                  value={form.officeTitle}
                  onChange={(event) => handleChange("officeTitle", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Horário secretaria
                </label>
                <input
                  type="text"
                  value={form.officeHours}
                  onChange={(event) => handleChange("officeHours", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  value={form.officePhone}
                  onChange={(event) => handleChange("officePhone", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={form.pixKey}
                  onChange={(event) => handleChange("pixKey", event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="95629689/0001-24 ou adsm.tesouraria@gmail.com"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Institucional</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Palavra do presidente
                </label>
                <input
                  type="text"
                  value={form.institutionalPresidentTitle}
                  onChange={(event) =>
                    handleChange("institutionalPresidentTitle", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nossa história
                </label>
                <input
                  type="text"
                  value={form.institutionalHistoryTitle}
                  onChange={(event) =>
                    handleChange("institutionalHistoryTitle", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Diretoria executiva
                </label>
                <input
                  type="text"
                  value={form.institutionalBoardTitle}
                  onChange={(event) =>
                    handleChange("institutionalBoardTitle", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assessorias da presidência
                </label>
                <input
                  type="text"
                  value={form.institutionalAdvisoryTitle}
                  onChange={(event) =>
                    handleChange("institutionalAdvisoryTitle", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Setores e congregações
                </label>
                <input
                  type="text"
                  value={form.institutionalSectorsTitle}
                  onChange={(event) =>
                    handleChange("institutionalSectorsTitle", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              Nossa história (conteúdo)
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Texto completo (use títulos em CAIXA ALTA para separar seções)
              </label>
              <textarea
                value={form.institutionalHistoryContent}
                onChange={(event) =>
                  handleChange("institutionalHistoryContent", event.target.value)
                }
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              Texto do presidente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Referência bíblica
                </label>
                <input
                  type="text"
                  value={form.presidentVerseRef}
                  onChange={(event) =>
                    handleChange("presidentVerseRef", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Versículo
                </label>
                <input
                  type="text"
                  value={form.presidentVerseText}
                  onChange={(event) =>
                    handleChange("presidentVerseText", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mensagem (um parágrafo por linha em branco)
              </label>
              <textarea
                value={form.presidentMessage}
                onChange={(event) =>
                  handleChange("presidentMessage", event.target.value)
                }
                rows={8}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Destaque (citação)
              </label>
              <textarea
                value={form.presidentHighlight}
                onChange={(event) =>
                  handleChange("presidentHighlight", event.target.value)
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assinatura (nome)
                </label>
                <input
                  type="text"
                  value={form.presidentSignatureName}
                  onChange={(event) =>
                    handleChange("presidentSignatureName", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assinatura (cargo)
                </label>
                <input
                  type="text"
                  value={form.presidentSignatureRole}
                  onChange={(event) =>
                    handleChange("presidentSignatureRole", event.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              Assessorias da presidência
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Conteúdo (uma linha por item; use títulos em CAIXA ALTA e
                subtítulos com dois pontos)
              </label>
              <textarea
                value={form.institutionalAdvisoryContent}
                onChange={(event) =>
                  handleChange("institutionalAdvisoryContent", event.target.value)
                }
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              Setores e congregações
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Conteúdo (uma linha por item; inicie com "SETOR 01 | NOME" e
                abaixo liste as congregações)
              </label>
              <textarea
                value={form.institutionalSectorsContent}
                onChange={(event) =>
                  handleChange("institutionalSectorsContent", event.target.value)
                }
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-full bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
