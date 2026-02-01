"use client";

import { useMemo } from "react";
import { historyTimeline } from "@/data/site";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import {
  Sparkles,
  Landmark,
  Milestone,
  Calendar,
  Quote,
  ScrollText,
} from "lucide-react";

type HistorySection = {
  title: string;
  paragraphs: string[];
};

type ParsedHistory = {
  introTitle?: string;
  sections: HistorySection[];
  ebenezer?: HistorySection;
};

const stripColon = (value: string) => value.replace(/:+$/, "").trim();

const isHeading = (value: string) => {
  const cleaned = stripColon(value);
  if (!cleaned) return false;
  const letters = cleaned.match(/[A-Za-zÀ-ÿ]/g) ?? [];
  if (letters.length < 3) return false;
  const upper = cleaned.match(/[A-ZÀ-Ü]/g) ?? [];
  const ratio = upper.length / letters.length;
  return ratio >= 0.6;
};

const normalizeParagraph = (value: string) => value.replace(/\s+/g, " ").trim();

const parseHistoryContent = (
  content: string,
  fallbackTitle: string
): ParsedHistory => {
  const lines = content.split("\n");
  const sections: HistorySection[] = [];
  let current: HistorySection | null = null;
  let buffer: string[] = [];
  let lastTokenWasHeading = false;

  const flushParagraph = () => {
    if (!current || buffer.length === 0) return;
    current.paragraphs.push(normalizeParagraph(buffer.join(" ")));
    buffer = [];
  };

  const startSection = (title: string) => {
    flushParagraph();
    current = { title: stripColon(title), paragraphs: [] };
    sections.push(current);
  };

  const ensureSection = () => {
    if (!current) startSection(fallbackTitle);
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      lastTokenWasHeading = false;
      return;
    }

    if (isHeading(line)) {
      if (current && current.paragraphs.length === 0 && lastTokenWasHeading) {
        current.title = `${current.title} ${stripColon(line)}`.trim();
      } else {
        startSection(line);
      }
      lastTokenWasHeading = true;
      return;
    }

    ensureSection();
    buffer.push(line);
    lastTokenWasHeading = false;
  });

  flushParagraph();

  let introTitle: string | undefined;
  let workingSections = [...sections];

  if (workingSections.length > 1 && workingSections[0].paragraphs.length === 0) {
    introTitle = workingSections[0].title;
    workingSections = workingSections.slice(1);
  }

  workingSections = workingSections.filter((section) => section.paragraphs.length > 0);

  let ebenezer: HistorySection | undefined;
  const ebenezerIndex = workingSections.findIndex((section) =>
    section.title.toUpperCase().includes("EBENEZER")
  );

  if (ebenezerIndex >= 0) {
    ebenezer = workingSections[ebenezerIndex];
    workingSections.splice(ebenezerIndex, 1);
  }

  return { introTitle, sections: workingSections, ebenezer };
};

export default function HistoryTimelineSection() {
  const { settings } = useSiteSettings();

  const historyContent = settings.institutionalHistoryContent?.trim() || "";
  const parsedHistory = useMemo(
    () =>
      historyContent
        ? parseHistoryContent(
            historyContent,
            settings.institutionalHistoryTitle || "Nossa História"
          )
        : null,
    [historyContent, settings.institutionalHistoryTitle]
  );

  const hasNarrative = Boolean(historyContent);

  return (
    <section className="relative overflow-hidden py-20">

      <div className="container mx-auto max-w-6xl px-4">
        {/* Cabeçalho */}
        <header className="mx-auto mb-12 md:mb-16 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm backdrop-blur">
            <Sparkles size={14} />
            <span>Legado</span>
          </div>

          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            {settings.institutionalHistoryTitle}
          </h2>

          {parsedHistory?.introTitle ? (
            <p className="mt-3 text-xs sm:text-sm uppercase tracking-wider text-slate-500">
              {parsedHistory.introTitle}
            </p>
          ) : (
            <p className="mt-3 text-sm md:text-base text-slate-600">
              Uma linha do tempo de fé, serviço e expansão.
            </p>
          )}

          <div className="mx-auto mt-6 h-px w-44 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
        </header>

        {hasNarrative && parsedHistory ? (
          <div className="mx-auto max-w-5xl space-y-8">
            {/* Bloco introdutório opcional */}
            {parsedHistory.sections.length > 0 ? (
              <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 md:p-8 shadow-sm backdrop-blur">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
                    <ScrollText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-slate-900">
                      Nossa caminhada
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Leitura em seções — uma narrativa detalhada da nossa história.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Seções narrativas */}
            {parsedHistory.sections.map((section, sectionIndex) => (
              <article
                key={`${section.title}-${sectionIndex}`}
                className="rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur"
              >
                <div className="h-1 w-full rounded-t-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />

                <div className="p-6 md:p-8">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700">
                      <Landmark size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-slate-900">
                        {section.title}
                      </h3>
                      <div className="mt-3 h-px w-full bg-slate-200/70" />
                    </div>
                  </div>

                  <div className="mt-6 space-y-4 text-slate-700 leading-relaxed text-[15px] md:text-base">
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={`${section.title}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </article>
            ))}

            {/* Ebenezer (destaque) */}
            {parsedHistory.ebenezer ? (
              <div className="relative overflow-hidden rounded-3xl border border-blue-500/25 bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-700 p-6 md:p-8 text-white shadow-sm">
                <div className="pointer-events-none absolute -top-20 -right-16 opacity-15">
                  <Quote size={220} />
                </div>

                <div className="relative">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                    <Milestone size={14} />
                    Marco de fé
                  </span>

                  <h4 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
                    {parsedHistory.ebenezer.title}
                  </h4>

                  <div className="mt-4 space-y-3 text-sm md:text-base leading-relaxed text-white/90">
                    {parsedHistory.ebenezer.paragraphs.map((paragraph, index) => (
                      <p key={`ebenezer-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto max-w-6xl">
            {/* Timeline */}
            <div className="relative">
              {/* Linha central */}
              <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-blue-200 via-blue-200/70 to-transparent md:block" />

              <div className="space-y-10 md:space-y-12">
                {historyTimeline.map((event, index) => {
                  const isRight = index % 2 === 0;

                  return (
                    <div
                      key={`${event.year}-${event.title}`}
                      className="relative grid grid-cols-1 md:grid-cols-2 md:items-center"
                    >
                      {/* Lado esquerdo (card quando ímpar) */}
                      <div className={`md:pr-10 ${isRight ? "md:order-1" : "md:order-1"}`}>
                        {!isRight ? (
                          <TimelineCard
                            year={event.year}
                            title={event.title}
                            description={event.description}
                            align="right"
                          />
                        ) : (
                          <div className="hidden md:block" />
                        )}
                      </div>

                      {/* Lado direito (card quando par) */}
                      <div className={`md:pl-10 ${isRight ? "md:order-3" : "md:order-3"}`}>
                        {isRight ? (
                          <TimelineCard
                            year={event.year}
                            title={event.title}
                            description={event.description}
                            align="left"
                          />
                        ) : (
                          <div className="hidden md:block" />
                        )}
                      </div>

                      {/* Marcador central */}
                      <div className="pointer-events-none absolute left-1/2 top-6 hidden -translate-x-1/2 md:block">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />
                        </div>
                      </div>

                      {/* Versão mobile: card único */}
                      <div className="md:hidden">
                        <TimelineCard
                          year={event.year}
                          title={event.title}
                          description={event.description}
                          align="left"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Final Ebenezer */}
              <div className="mt-14 md:mt-16">
                <div className="mx-auto max-w-2xl rounded-3xl border border-blue-500/25 bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-700 p-6 md:p-8 text-center text-white shadow-sm">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                    <Milestone size={14} />
                    Marco de fé
                  </span>
                  <h4 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
                    Ebenezer
                  </h4>
                  <p className="mt-2 text-sm md:text-base text-white/90">
                    Até aqui nos ajudou o Senhor
                  </p>
                </div>

                <p className="mx-auto mt-6 max-w-2xl text-slate-600">
                  Décadas após o primeiro culto, a Assembleia de Deus de Santa Maria
                  estendeu suas raízes por toda a região, mantendo a missão de levar a
                  Palavra de Deus até o último da terra.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TimelineCard({
  year,
  title,
  description,
  align,
}: {
  year: string;
  title: string;
  description: string;
  align: "left" | "right";
}) {
  return (
    <article
      className={`relative rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur transition hover:shadow-md ${
        align === "right" ? "md:text-right" : "md:text-left"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />

      <div className={`flex items-center gap-2 ${align === "right" ? "md:justify-end" : "md:justify-start"}`}>
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700">
          <Calendar size={14} />
          {year}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </article>
  );
}
