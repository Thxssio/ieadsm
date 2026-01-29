"use client";

import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import { useBoardMembers } from "@/lib/firebase/useBoardMembers";

export default function BoardSection() {
  const { settings } = useSiteSettings();
  const { items: boardMembers } = useBoardMembers();
  const defaultPhoto = "/logo.png";
  return (
    <section>
      <div className="text-center mb-16">
        <span className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-2 block">
          Administração
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
          {settings.institutionalBoardTitle}
        </h2>
      </div>

      {boardMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {boardMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center hover:border-blue-200 transition-colors group"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden group-hover:bg-blue-50 transition-colors">
                <img
                  src={encodeURI(member.photo || defaultPhoto)}
                  alt={member.name}
                  className="w-full h-full rounded-full object-cover"
                  loading="lazy"
                />
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-1">
                {member.name}
              </h4>
              <p className="text-blue-600 font-medium text-sm uppercase tracking-wide">
                {member.role}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center text-slate-500">
          Nenhum membro cadastrado na diretoria ainda.
        </div>
      )}
    </section>
  );
}
