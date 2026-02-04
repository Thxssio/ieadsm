"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  Link2,
  MapPin,
  ShieldCheck,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, user } = useAuth();
  const { settings } = useSiteSettings();
  const adminMapUrl = settings.adminMapEmbedUrl?.trim();

  const firstName = (() => {
    const displayName = user?.displayName?.trim();
    if (displayName) return displayName.split(/\s+/)[0];
    const emailName = user?.email?.split("@")[0]?.trim();
    if (emailName) return emailName.split(".")[0];
    return "Administrador";
  })();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/?login=1");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady) {
    return <div className="min-h-screen pb-20 bg-slate-50"></div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen pb-20 px-4 bg-slate-50 animate-fade-in-up">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Painel Administrativo
            </h1>
            <p className="text-slate-500">
              Bem-vindo de volta, {firstName}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <Link
            href="/admin/noticias"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">
              Gerenciar Notícias
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Publicar ou editar posts do mural.
            </p>
          </Link>

          <Link
            href="/admin/agenda"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CalendarDays size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">
              Agenda de Cultos
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Atualizar horários e eventos.
            </p>
          </Link>

          <Link
            href="/admin/ministerios"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Megaphone size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">
              Ministérios
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Gerencie ministérios e departamentos.
            </p>
          </Link>

          <Link
            href="/admin/diretoria"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">
              Diretoria Executiva
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Cadastre e edite os membros da diretoria.
            </p>
          </Link>

          <Link
            href="/admin/congregacoes"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <MapPin size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">
              Setores e Congregações
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Cadastre setores, endereços e fotos.
            </p>
          </Link>

          <Link
            href="/admin/patrimonio"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ClipboardList size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">Patrimônio</h3>
            <p className="text-sm text-slate-500 mt-2">
              Controle de itens e etiquetas com QR.
            </p>
          </Link>

          <Link
            href="/admin/secretaria"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <FolderOpen size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">Secretaria</h3>
            <p className="text-sm text-slate-500 mt-2">
              Fichas e documentos dos membros.
            </p>
          </Link>

          <Link
            href="/admin/usuarios"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Users size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">Usuários</h3>
            <p className="text-sm text-slate-500 mt-2">
              Gerencie usuários do sistema.
            </p>
          </Link>

          <Link
            href="/admin/links"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Link2 size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">Links</h3>
            <p className="text-sm text-slate-500 mt-2">
              Atualizar os links da página de links.
            </p>
          </Link>

          <Link
            href="/admin/configuracoes"
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Settings size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">Configurações</h3>
            <p className="text-sm text-slate-500 mt-2">
              Ajustes gerais do site.
            </p>
          </Link>
        </div>

        <div className="mt-10 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Mapa das Congregações
              </h2>
              <p className="text-sm text-slate-500">
                Visualização interna para planejamento e acompanhamento.
              </p>
            </div>
          </div>
          {adminMapUrl ? (
            <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
              <iframe
                src={adminMapUrl}
                width="100%"
                height="480"
                className="w-full h-[480px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa privado das congregações"
              />
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-500">
              Adicione o link do mapa privado em Configurações para exibir aqui.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
