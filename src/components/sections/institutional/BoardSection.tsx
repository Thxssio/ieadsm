"use client";

import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import { useBoardMembers } from "@/lib/firebase/useBoardMembers";
import { Users, Sparkles } from "lucide-react";

export default function BoardSection() {
  const { settings } = useSiteSettings();
  const { items: boardMembers } = useBoardMembers();
  const defaultPhoto = "/logo.png";

  return (
    <section className="relative overflow-hidden py-20">

      <div className="container mx-auto max-w-6xl px-4">
        {/* Cabeçalho */}
        <header className="mx-auto mb-12 md:mb-16 max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm backdrop-blur">
            <Sparkles size={14} />
            <span>Administração</span>
          </div>

          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            {settings.institutionalBoardTitle}
          </h2>

          <p className="mt-3 text-sm md:text-base text-slate-600">
            Liderança responsável pela organização e direção institucional.
          </p>

          <div className="mx-auto mt-6 h-px w-40 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
        </header>

        {boardMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {boardMembers.map((member) => (
              <article
                key={member.id}
                className="group relative rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-center shadow-sm backdrop-blur transition hover:shadow-md"
              >
                {/* Top gradient */}
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />

                {/* Avatar */}
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 ring-4 ring-white shadow-sm overflow-hidden transition group-hover:bg-blue-50">
                  <img
                    src={encodeURI(member.photo || defaultPhoto)}
                    alt={member.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <h4 className="text-lg font-bold text-slate-900">
                  {member.name}
                </h4>

                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
                  {member.role}
                </p>

                <div className="mt-4 flex justify-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-medium text-blue-700">
                    <Users size={12} />
                    Diretoria
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm backdrop-blur">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Users size={26} />
            </div>
            <p className="text-slate-700 font-semibold">
              Nenhum membro cadastrado na diretoria ainda.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre os membros no painel administrativo para que apareçam aqui.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
