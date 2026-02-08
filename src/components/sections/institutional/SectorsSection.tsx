"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import {
  useCongregations,
  type Congregation,
} from "@/lib/firebase/useCongregations";
import {
  Sparkles,
  Layers,
  MapPin,
  Building2,
  Hash,
  MapPinned,
} from "lucide-react";

type Sector = {
  title: string;
  order: number;
  congregations: Congregation[];
};

type FallbackSector = {
  title: string;
  congregations: string[];
};

const FALLBACK_TITLE = "Setores e Congregações";
const DEFAULT_PHOTO = "/logo.png";

const cleanLine = (value: string) =>
  value.replace(/^[-•]\s*/, "").replace(/:+$/, "").trim();

const parseSectors = (content: string): FallbackSector[] => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sectors: FallbackSector[] = [];
  let current: FallbackSector | null = null;

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line) continue;

    if (/^SETOR\b/i.test(line)) {
      current = { title: line, congregations: [] };
      sectors.push(current);
      continue;
    }

    if (!current) {
      current = { title: "Setor", congregations: [] };
      sectors.push(current);
    }

    current.congregations.push(line);
  }

  return sectors.filter((sector) => sector.congregations.length > 0);
};

const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};

const getSectorOrder = (sectorLabel: string, fallback?: number) => {
  if (typeof fallback === "number" && !Number.isNaN(fallback)) return fallback;
  const match = sectorLabel.match(/SETOR\s*0*([0-9]+)/i);
  if (match) return Number(match[1]);
  return 0;
};

const splitSectorLabel = (label: string) => {
  const parts = label.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { code: parts[0], name: parts.slice(1).join(" | ") };
  return { code: "", name: label };
};

const toList = (value?: string) =>
  value
    ? value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

const extractEmbedSrc = (value?: string) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  const match =
    trimmed.match(/src=["']([^"']+)["']/i) ||
    trimmed.match(/src=([^\\s>]+)/i);
  return match ? match[1] : trimmed;
};

const isMyMaps = (url?: string) =>
  !!url && (url.includes("/maps/d/") || url.includes("/maps/d/u/0/"));

function formatCount(n: number) {
  return n === 1 ? "1 congregação" : `${n} congregações`;
}

type ImageWithSkeletonProps = {
  src: string;
  alt: string;
  containerClassName?: string;
  className?: string;
  loading?: "lazy" | "eager";
};

function ImageWithSkeleton({
  src,
  alt,
  containerClassName,
  className,
  loading = "lazy",
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden ${containerClassName ?? ""}`}>
      <div
        className={`absolute inset-0 bg-slate-200/70 transition-opacity duration-500 ${
          loaded ? "opacity-0" : "opacity-100 animate-pulse"
        }`}
      />
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`${className ?? ""} transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default function SectorsSection() {
  const { settings } = useSiteSettings();
  const { items: congregations } = useCongregations();
  const sectionRef = useRef<HTMLElement | null>(null);
  const pageChangeRef = useRef(false);
  const [activeCongregation, setActiveCongregation] = useState<Congregation | null>(
    null
  );
  const [canPortal, setCanPortal] = useState(false);
  const [sectorPage, setSectorPage] = useState(1);
  const sectorPageSize = 3;

  const title = settings.institutionalSectorsTitle || FALLBACK_TITLE;
  const content = settings.institutionalSectorsContent?.trim() || "";
  const publicMapSrc = extractEmbedSrc(settings.publicCongregationsMapEmbedUrl);
  const privateMapSrc = extractEmbedSrc(settings.adminMapEmbedUrl);
  const legacyMapSrc = extractEmbedSrc(settings.mapEmbedUrl);
  const congregationMapSrc =
    publicMapSrc || privateMapSrc || (isMyMaps(legacyMapSrc) ? legacyMapSrc : "");

  const sectors = useMemo(() => {
    if (!congregations.length) return [] as Sector[];

    const map = new Map<string, Sector>();

    congregations.forEach((item) => {
      const label = item.sector?.trim() || "Setor";
      const order = getSectorOrder(label, item.sectorOrder);
      const existing = map.get(label);

      if (existing) {
        existing.congregations.push(item);
        existing.order = Math.min(existing.order, order || existing.order);
      } else {
        map.set(label, { title: label, order, congregations: [item] });
      }
    });

    const groups = Array.from(map.values()).map((group) => ({
      ...group,
      congregations: [...group.congregations].sort((a, b) => {
        const orderA = Number(a.order ?? 0);
        const orderB = Number(b.order ?? 0);
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      }),
    }));

    return groups.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title);
    });
  }, [congregations]);

  const totalPages = Math.max(1, Math.ceil(sectors.length / sectorPageSize));
  const currentPage = Math.min(sectorPage, totalPages);
  const pagedSectors = sectors.slice(
    (currentPage - 1) * sectorPageSize,
    currentPage * sectorPageSize
  );

  // Mantive o fallback pronto caso tu queira usar no empty state depois
  const fallbackSectors = useMemo(() => parseSectors(content), [content]);
  void fallbackSectors; // evita warning caso você ainda não use

  const closeModal = () => setActiveCongregation(null);
  const activeAddress = activeCongregation
    ? [activeCongregation.address, activeCongregation.number]
        .filter(Boolean)
        .join(", ")
    : "";
  const activeNeighborhood = activeCongregation?.neighborhood
    ? ` - ${activeCongregation.neighborhood}`
    : "";
  const activeCityLine = activeCongregation
    ? [activeCongregation.city, activeCongregation.state]
        .filter(Boolean)
        .join(" / ")
    : "";
  const leadersList = toList(activeCongregation?.leaders);
  const supervisionList = toList(activeCongregation?.supervision);
  const servicesList = toList(activeCongregation?.services);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    setSectorPage(1);
  }, [sectors.length]);

  useEffect(() => {
    if (!pageChangeRef.current) return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [sectorPage]);

  useEffect(() => {
    if (!activeCongregation) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCongregation]);

  return (
    <section ref={sectionRef} className="relative py-20">

      <div className="container mx-auto max-w-6xl px-4">
        {/* Cabeçalho */}
        <header className="mx-auto mb-12 md:mb-16 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm backdrop-blur">
            <Sparkles size={14} />
            <span>Organização</span>
          </div>

          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h2>

          <p className="mt-3 text-sm md:text-base text-slate-600">
            Setores organizados por região e congregações vinculadas.
          </p>

          <div className="mx-auto mt-6 h-px w-44 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
        </header>

        {sectors.length > 0 ? (
          <div className="space-y-10">
            {pagedSectors.map((sector) => {
              const { code, name } = splitSectorLabel(sector.title);
              const countText = formatCount(sector.congregations.length);

              return (
                <section
                  key={sector.title}
                  className="rounded-3xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur"
                >
                  {/* Top bar */}
                  <div className="h-1 w-full rounded-t-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />

                  {/* Cabeçalho do setor */}
                  <div className="flex flex-col gap-4 px-6 pt-6 pb-5 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {code ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                            <Hash size={14} />
                            {code}
                          </span>
                        ) : null}

                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
                          <Layers size={14} />
                          Setor
                        </span>
                      </div>

                      <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
                        {name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {countText}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                      <MapPinned size={16} className="text-blue-700" />
                      <span>{countText}</span>
                    </div>
                  </div>

                  {/* Cards de congregações */}
                  <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3">
                    {sector.congregations.map((congregation) => {
                      const address = [congregation.address, congregation.number]
                        .filter(Boolean)
                        .join(", ");

                      const neighborhood = congregation.neighborhood
                        ? ` - ${congregation.neighborhood}`
                        : "";

                      const cityLine = [congregation.city, congregation.state]
                        .filter(Boolean)
                        .join(" / ");

                      const photo = safePhoto(congregation.photo) || DEFAULT_PHOTO;

                      return (
                        <button
                          type="button"
                          key={congregation.id}
                          onClick={() => setActiveCongregation(congregation)}
                          aria-label={`Ver detalhes de ${congregation.name}`}
                          className="group relative w-full text-left rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:shadow-md"
                        >
                          {/* mini top bar */}
                          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-blue-600/70 via-indigo-600/70 to-blue-600/70" />

                          <div className="flex gap-4">
                            {/* thumb */}
                            <ImageWithSkeleton
                              src={photo}
                              alt={congregation.name}
                              containerClassName="h-16 w-16 flex-none rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="truncate text-[15px] font-bold text-slate-900">
                                  {congregation.name}
                                </h4>
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                  <Building2 size={12} />
                                  Congregação
                                </span>
                              </div>

                              {(address || congregation.neighborhood) && (
                                <p className="mt-1 text-sm text-slate-600 break-words">
                                  {address}
                                  {neighborhood}
                                </p>
                              )}

                              {cityLine && (
                                <p className="mt-1 text-sm text-slate-600 break-words">
                                  {cityLine}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {(address || cityLine) && (
                                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-[11px] font-semibold text-blue-700 max-w-full">
                                    <MapPin size={12} />
                                    <span className="inline-block max-w-[12rem] sm:max-w-[16rem] truncate">
                                      {[address, cityLine].filter(Boolean).join(" — ")}
                                    </span>
                                  </span>
                                )}

                                {congregation.cep && (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                    CEP: {congregation.cep}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                Página <span className="font-semibold text-slate-800">{currentPage}</span> de{" "}
                <span className="font-semibold text-slate-800">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    pageChangeRef.current = true;
                    setSectorPage((prev) => Math.max(1, prev - 1));
                  }}
                  disabled={currentPage === 1}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    currentPage === 1
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pageChangeRef.current = true;
                    setSectorPage((prev) => Math.min(totalPages, prev + 1));
                  }}
                  disabled={currentPage === totalPages}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    currentPage === totalPages
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm backdrop-blur">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <MapPinned size={26} />
            </div>
            <p className="text-slate-700 font-semibold">
              Nenhuma congregação cadastrada ainda.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre as congregações e vincule a um setor para exibir aqui.
            </p>
          </div>
        )}

        {congregationMapSrc ? (
          <div className="mt-10 rounded-3xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
              <MapPinned size={18} className="text-blue-700" />
              <h3 className="text-base font-bold text-slate-900">
                Mapa das Congregações
              </h3>
            </div>
            <div className="aspect-[16/9] w-full">
              <iframe
                src={congregationMapSrc}
                className="h-full w-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa das Congregações"
              />
            </div>
          </div>
        ) : null}
      </div>

      {canPortal && activeCongregation
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
              onClick={closeModal}
            >
              <div
                className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden max-h-[90vh]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      {activeCongregation.sector}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {activeCongregation.name}
                    </h3>
                    {activeCongregation.description ? (
                      <p className="text-sm text-slate-500">
                        {activeCongregation.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                </div>
                <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[calc(90vh-76px)]">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <ImageWithSkeleton
                      src={safePhoto(activeCongregation.photo) || DEFAULT_PHOTO}
                      alt={activeCongregation.name}
                      loading="eager"
                      containerClassName="w-full sm:w-64 rounded-2xl bg-slate-50 border border-slate-200"
                      className="w-full h-auto max-h-[60vh] object-contain bg-slate-50"
                    />
                    <div className="flex-1 space-y-2 text-sm text-slate-600">
                      {activeAddress || activeCongregation.neighborhood ? (
                        <p className="break-words">
                          <span className="font-semibold text-slate-700">
                            Endereço:
                          </span>{" "}
                          {activeAddress}
                          {activeNeighborhood}
                        </p>
                      ) : null}
                      {activeCityLine ? (
                        <p className="break-words">
                          <span className="font-semibold text-slate-700">
                            Cidade:
                          </span>{" "}
                          {activeCityLine}
                        </p>
                      ) : null}
                      {activeCongregation.cep ? (
                        <p>
                          <span className="font-semibold text-slate-700">
                            CEP:
                          </span>{" "}
                          {activeCongregation.cep}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {supervisionList.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Supervisão
                      </h4>
                      <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                        {supervisionList.map((item, index) => (
                          <li key={`sup-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {leadersList.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Dirigente(s)
                      </h4>
                      <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                        {leadersList.map((item, index) => (
                          <li key={`lead-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {servicesList.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Cultos
                      </h4>
                      <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                        {servicesList.map((item, index) => (
                          <li key={`culto-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
