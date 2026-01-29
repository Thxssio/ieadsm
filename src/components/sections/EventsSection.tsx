"use client";

import { useEffect } from "react";
import { Facebook, Instagram } from "lucide-react";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

const ELFSIGHT_SRC = "https://elfsightcdn.com/platform.js";

export default function EventsSection() {
  const { settings } = useSiteSettings();
  useEffect(() => {
    if (document.querySelector(`script[src="${ELFSIGHT_SRC}"]`)) {
      return;
    }
    const script = document.createElement("script");
    script.src = ELFSIGHT_SRC;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <section
      id="eventos"
      className="py-16 md:py-24 bg-slate-50 scroll-mt-40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {settings.socialFeedTitle}
          </h2>
          <div className="flex items-center justify-center gap-4 text-slate-500">
            <span className="text-sm">{settings.socialPrompt}</span>
            <div className="flex gap-2">
              <a
                href={settings.socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-pink-100 hover:text-pink-600 transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a
                href={settings.socialFacebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>
        </div>
        <div
          className="elfsight-app-3e9bcb32-ee05-40e9-abf9-97e5aa7840c1"
          data-elfsight-app-lazy
        ></div>
      </div>
    </section>
  );
}
