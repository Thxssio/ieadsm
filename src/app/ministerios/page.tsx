"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MinistriesGrid from "@/components/sections/MinistriesGrid";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

export default function MinistriesPage() {
  const { settings } = useSiteSettings();
  const titleLines = settings.departmentsTitle.split("\n");
  return (
    <main className="pb-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <span className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-3 block">
              {settings.departmentsEyebrow}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900">
              {titleLines.map((line, index) => (
                <span key={line}>
                  {line}
                  {index < titleLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </h1>
            <p className="text-slate-500 mt-4 text-lg">
              Conheça as frentes de trabalho que edificam a igreja e servem a
              cidade. Cada ministério é um convite para viver o propósito com
              profundidade.
            </p>
          </div>
          <Link
            href="/#ministerios"
            className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md"
          >
            Voltar para a Home <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>

        <MinistriesGrid />
      </div>
    </main>
  );
}
