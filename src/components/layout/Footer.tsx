"use client";

import { Facebook, Instagram, Youtube } from "lucide-react";
import { LOGO_WHITE } from "@/data/site";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

export default function Footer() {
  const { settings } = useSiteSettings();
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 md:py-16 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <img
                src={LOGO_WHITE}
                alt="Logo IEADSM"
                className="h-[60px] md:h-[90px] w-auto opacity-80"
              />
            </div>
            <div className="text-sm">
              <p>R. Venâncio Aires, 1504 - Centro, Santa Maria - RS, 97010-001</p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex gap-4">
              <a
                href={settings.socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center hover:bg-gradient-to-tr hover:from-yellow-500 hover:via-pink-500 hover:to-purple-500 hover:text-white transition-all duration-300"
              >
                <Instagram size={20} />
              </a>
              <a
                href={settings.socialFacebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300"
              >
                <Facebook size={20} />
              </a>
              <a
                href={settings.socialYoutube || "#"}
                className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all duration-300"
              >
                <Youtube size={20} />
              </a>
            </div>
            <div className="text-sm text-slate-500 text-center md:text-right">
              &copy; {new Date().getFullYear()} DECOM - TECNOLOGIA DA INFORMAÇÃO.
              <br />
              Todos os Direitos Reservados.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
