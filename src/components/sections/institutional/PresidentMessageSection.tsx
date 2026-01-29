"use client";

import { Scroll } from "lucide-react";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

export default function PresidentMessageSection() {
  const { settings } = useSiteSettings();
  const paragraphs = settings.presidentMessage
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <section className="mb-24">
      <div className="text-center mb-12">
        <span className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-2 block">
          Liderança
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
          {settings.institutionalPresidentTitle}
        </h2>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 text-slate-100 -mt-10 -mr-10">
          <Scroll size={200} opacity={0.5} />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="mb-8">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-serif font-bold italic text-lg mb-4">
                {settings.presidentVerseRef}
              </span>
              <blockquote className="text-2xl md:text-3xl font-serif text-slate-800 italic leading-relaxed">
                {settings.presidentVerseText}
              </blockquote>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed text-justify md:text-left">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
              ))}
              {settings.presidentHighlight ? (
                <p className="font-medium text-slate-800 border-l-4 border-blue-500 pl-4 italic">
                  {settings.presidentHighlight}
                </p>
              ) : null}
            </div>

            <div className="mt-10 flex flex-col items-center">
              <div className="w-16 h-1 bg-blue-600 rounded-full mb-4"></div>
              <h4 className="text-xl font-bold text-slate-900">
                {settings.presidentSignatureName}
              </h4>
              <p className="text-slate-500 text-sm uppercase tracking-wide">
                {settings.presidentSignatureRole}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
