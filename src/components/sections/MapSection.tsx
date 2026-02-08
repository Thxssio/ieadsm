"use client";

import { Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { MAP_EMBED_URL } from "@/data/site";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

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

export default function MapSection() {
  const { settings } = useSiteSettings();
  const headquartersSrc = extractEmbedSrc(settings.mapEmbedUrl);
  const embedUrl =
    headquartersSrc && !isMyMaps(headquartersSrc)
      ? headquartersSrc
      : MAP_EMBED_URL;
  return (
    <section
      id="contato"
      className="py-16 md:py-24 bg-slate-900 text-white relative overflow-hidden scroll-mt-40"
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(#4b5563 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      ></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="space-y-8 md:space-y-10">
            <div>
              <span className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-2 block">
                {settings.mapEyebrow}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                {settings.mapTitle}
              </h2>
              <p className="text-slate-300 text-base md:text-lg leading-relaxed border-l-4 border-blue-500 pl-6">
                {settings.mapDescription}
              </p>
              <Link
                href="/institucional?tab=sectors"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition"
              >
                Ver Setores e Congregações
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 text-blue-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-lg mb-2">
                  {settings.locationTitle}
                </h4>
                <p className="text-slate-300 text-sm">
                  {settings.locationAddress1}
                </p>
                <p className="text-slate-300 text-sm">
                  {settings.locationAddress2}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {settings.locationCep}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 text-blue-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-lg mb-2">
                  {settings.officeTitle}
                </h4>
                <p className="text-slate-300 text-sm">
                  {settings.officeHours}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {settings.officePhone}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 p-3 rounded-3xl shadow-2xl h-[400px] md:h-[450px] w-full relative overflow-hidden ring-4 ring-white/10">
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-2xl filter grayscale-[20%] hover:grayscale-0 transition-all duration-500"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Mapa das Congregações"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
