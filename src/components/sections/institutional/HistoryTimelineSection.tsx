"use client";

import { historyTimeline } from "@/data/site";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

export default function HistoryTimelineSection() {
  const { settings } = useSiteSettings();
  return (
    <section className="mb-24">
      <div className="text-center mb-16">
        <span className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-2 block">
          Legado
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
          {settings.institutionalHistoryTitle}
        </h2>
      </div>

      <div className="relative">
        <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-1 bg-blue-100 transform md:-translate-x-1/2 ml-4 md:ml-0"></div>
        <div className="space-y-12">
          {historyTimeline.map((event, index) => (
            <div
              key={`${event.year}-${event.title}`}
              className={`relative flex flex-col md:flex-row items-start ${
                index % 2 === 0 ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className="hidden md:block w-1/2"></div>
              <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 border-4 border-white shadow-md ml-0 md:ml-0 z-10">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="ml-12 md:ml-0 md:px-12 w-full md:w-1/2">
                <div
                  className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow ${
                    index % 2 === 0 ? "md:text-right" : "md:text-left"
                  }`}
                >
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg mb-3 text-sm">
                    {event.year}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {event.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 relative z-10 text-center">
          <span className="absolute left-1/2 -translate-x-1/2 -top-12 w-1 h-12 bg-blue-100"></span>
          <div className="inline-block bg-blue-600 text-white px-8 py-4 rounded-full shadow-lg mx-auto">
            <h4 className="font-bold text-xl mb-1">Ebenezer</h4>
            <p className="text-sm opacity-90">Até aqui nos ajudou o Senhor</p>
          </div>
        </div>
      </div>
          <p className="mt-6 text-slate-600 max-w-2xl mx-auto">
            Décadas após o primeiro culto, a Assembleia de Deus de Santa Maria
            estendeu suas raízes por toda a região, mantendo a missão de levar a
            Palavra de Deus até o último da terra.
          </p>
    </section>
  );
}
