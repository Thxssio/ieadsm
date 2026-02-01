"use client";

import { Scroll, Sparkles } from "lucide-react";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

export default function PresidentMessageSection() {
  const { settings } = useSiteSettings();

  const paragraphs = settings.presidentMessage
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section className="relative overflow-hidden py-20">

      <div className="container mx-auto max-w-6xl px-4">
        {/* Cabeçalho */}
        <header className="mx-auto mb-12 md:mb-16 max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm backdrop-blur">
            <Sparkles size={14} />
            <span>Liderança</span>
          </div>

          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            {settings.institutionalPresidentTitle}
          </h2>

          <p className="mt-3 text-sm md:text-base text-slate-600">
            Uma mensagem de fé, propósito e direção para nossa comunidade.
          </p>

          <div className="mx-auto mt-6 h-px w-40 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
        </header>

        {/* Card principal */}
        <div className="relative rounded-3xl border border-slate-200/70 bg-white/80 p-8 md:p-12 shadow-sm backdrop-blur">
          {/* Ícone decorativo */}
          <div className="pointer-events-none absolute -top-12 -right-12 text-slate-200/40">
            <Scroll size={220} />
          </div>

          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
            {/* Versículo */}
            <div className="mb-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-1.5 text-sm font-semibold text-blue-700">
                {settings.presidentVerseRef}
              </span>

              <blockquote className="mt-4 text-xl md:text-2xl lg:text-3xl font-serif italic leading-relaxed text-slate-800">
                “{settings.presidentVerseText}”
              </blockquote>
            </div>

            {/* Mensagem */}
            <div className="space-y-6 text-slate-700 leading-relaxed text-justify md:text-left">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 16)}`}>
                  {paragraph}
                </p>
              ))}

              {settings.presidentHighlight && (
                <p className="rounded-xl border-l-4 border-blue-600 bg-blue-50/60 p-4 font-medium italic text-slate-800">
                  {settings.presidentHighlight}
                </p>
              )}
            </div>

            {/* Assinatura */}
            <div className="mt-12 flex flex-col items-center">
              <div className="mb-4 h-1 w-20 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />
              <h4 className="text-xl font-bold text-slate-900">
                {settings.presidentSignatureName}
              </h4>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {settings.presidentSignatureRole}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
