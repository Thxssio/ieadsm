"use client";

import Link from "next/link";
import { HERO_IMAGE_URL } from "@/data/site";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

export default function HeroSection() {
  const { settings } = useSiteSettings();
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src={HERO_IMAGE_URL}
          alt="Worship Background"
          className="w-full h-full object-cover transform scale-105 animate-slow-zoom"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-900/80 via-blue-900/40 to-slate-900/90"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center text-white space-y-8 mt-16">
        <div className="animate-fade-in-up">
          <span className="inline-block py-1.5 px-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-sm font-bold tracking-widest uppercase mb-4 text-blue-100">
            {settings.heroBadge}
          </span>
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold tracking-tight font-serif mb-6 leading-tight text-shadow-lg">
            {settings.heroTitleLine}
            <br />
            <span className="text-blue-200">{settings.heroTitleHighlight}</span>
          </h1>
        </div>

        <div className="animate-fade-in-up delay-100 my-6 md:my-10 p-6 md:p-8 border-l-4 border-blue-400 bg-black/20 backdrop-blur-md rounded-r-2xl max-w-3xl mx-auto hover:bg-black/30 transition-colors duration-300">
          <p className="text-lg md:text-3xl font-serif italic leading-relaxed text-white drop-shadow-md">
            "{settings.heroVerse}"
          </p>
          <p className="text-right mt-4 text-blue-300 font-bold uppercase tracking-widest text-xs md:text-sm">
            {settings.heroVerseRef}
          </p>
        </div>

        <div className="animate-fade-in-up delay-200 flex flex-col sm:flex-row gap-4 justify-center mt-8 md:mt-10">
          <Link
            href="/contato"
            className="bg-white text-blue-900 hover:bg-blue-50 px-8 py-4 rounded-full font-bold transition-all shadow-lg hover:shadow-white/20 hover:-translate-y-1"
          >
            Planeje sua Visita
          </Link>
          <Link
            href="/institucional"
            className="bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white px-8 py-4 rounded-full font-bold transition-all hover:-translate-y-1 backdrop-blur-sm"
          >
            Conheça Nossa História
          </Link>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce pointer-events-none hidden md:block">
        <div className="w-8 h-12 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-white rounded-full"></div>
        </div>
      </div>
    </section>
  );
}
