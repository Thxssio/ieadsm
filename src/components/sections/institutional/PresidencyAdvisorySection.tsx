"use client";

import { useMemo } from "react";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import { Users, ChevronRight, Hash, Sparkles } from "lucide-react";

type AdvisoryGroup = {
  heading?: string;
  items: string[];
};

type AdvisorySection = {
  title: string;
  groups: AdvisoryGroup[];
};

const FALLBACK_TITLE = "Assessorias da Presidência";

const stripColon = (value: string) => value.replace(/:+$/, "").trim();

const isUppercaseHeading = (value: string) => {
  const cleaned = stripColon(value);
  if (!cleaned) return false;
  if (!/[A-ZÀ-Ü]/.test(cleaned)) return false;
  return cleaned === cleaned.toUpperCase();
};

const isSubheading = (value: string) => {
  const cleaned = stripColon(value);
  if (!cleaned) return false;
  if (/^Regi[aã]o\s+\d+/i.test(cleaned)) return true;
  return value.endsWith(":") && !isUppercaseHeading(value);
};

const parseAdvisoryContent = (
  content: string,
  fallbackTitle: string
): AdvisorySection[] => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: AdvisorySection[] = [];
  let currentSection: AdvisorySection | null = null;
  let currentGroup: AdvisoryGroup | null = null;

  const startSection = (title: string) => {
    currentSection = { title, groups: [] };
    sections.push(currentSection);
    currentGroup = null;
  };

  const ensureSection = () => {
    if (!currentSection) startSection(fallbackTitle);
  };

  const startGroup = (heading?: string) => {
    ensureSection();
    currentGroup = { heading, items: [] };
    currentSection?.groups.push(currentGroup);
  };

  for (const rawLine of lines) {
    const cleanedLine = rawLine.replace(/^[-•]\s*/, "").trim();
    if (!cleanedLine) continue;

    if (isUppercaseHeading(cleanedLine)) {
      startSection(stripColon(cleanedLine));
      continue;
    }

    if (isSubheading(cleanedLine)) {
      startGroup(stripColon(cleanedLine));
      continue;
    }

    ensureSection();
    if (!currentGroup) startGroup();
    currentGroup?.items.push(cleanedLine);
  }

  return sections
    .map((section) => ({
      ...section,
      groups: section.groups.filter((group) => group.items.length > 0),
    }))
    .filter((section) => section.groups.length > 0);
};

export default function PresidencyAdvisorySection() {
  const { settings } = useSiteSettings();
  const title = settings.institutionalAdvisoryTitle || FALLBACK_TITLE;
  const content = settings.institutionalAdvisoryContent?.trim() || "";

  const sections = useMemo(
    () => parseAdvisoryContent(content, title),
    [content, title]
  );

  return (
    <section className="relative overflow-hidden py-16 md:py-20">

      <div className="container mx-auto max-w-6xl px-4">
        {/* Cabeçalho */}
        <header className="mx-auto mb-12 md:mb-16 max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm backdrop-blur">
            <Sparkles size={14} className="text-blue-700" />
            <span>Organização</span>
          </div>

          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-3 text-sm md:text-base text-slate-600">
            Estrutura, equipes e atribuições organizadas por seção e área.
          </p>

          <div className="mx-auto mt-6 h-px w-40 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
        </header>

        {sections.length > 0 ? (
          <div className="columns-1 md:columns-2 gap-8 [column-fill:balance]">
            {sections.map((section, idx) => (
              <article
                key={`${section.title}-${idx}`}
                className="mb-8 break-inside-avoid rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur transition hover:shadow-md"
              >
                {/* Top border com gradiente */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />

                <div className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700">
                      <Users size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                        {section.title}
                      </h3>
                      <div className="mt-2 h-px w-full bg-slate-200/70" />
                    </div>
                  </div>

                  <div className="mt-6 space-y-7">
                    {section.groups.map((group, groupIndex) => (
                      <div
                        key={`${section.title}-${groupIndex}`}
                        className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                      >
                        {group.heading && (
                          <div className="mb-3 flex items-center gap-2">
                            <Hash size={14} className="text-blue-600/70" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              {group.heading}
                            </h4>
                          </div>
                        )}

                        <ul className="space-y-2.5">
                          {group.items.map((item, itemIndex) => (
                            <li
                              key={`${section.title}-${groupIndex}-${itemIndex}`}
                              className="group flex items-start gap-2 text-[15px] leading-relaxed text-slate-700"
                            >
                              <span className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-blue-600/10 text-blue-700 transition group-hover:bg-blue-600/15">
                                <ChevronRight size={14} strokeWidth={2.6} />
                              </span>
                              <span className="transition group-hover:text-slate-900">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
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
              Nenhuma assessoria cadastrada no momento.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Assim que você adicionar conteúdo nas configurações do site, ele aparecerá aqui.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
