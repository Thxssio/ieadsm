"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Youtube,
  ExternalLink,
} from "lucide-react";
import { MAP_EMBED_URL } from "@/data/site";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

const CONTACT_EMAIL = "contato@adsantamaria.com.br";

const sanitizeUrl = (url?: string) => {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const normalizePhone = (value?: string) => (value || "").replace(/\D/g, "");

const whatsappFromPhone = (value?: string) => {
  const digits = normalizePhone(value);
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length > 11) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
};

export default function ContactPage() {
  const { settings } = useSiteSettings();
  const phoneDigits = normalizePhone(settings.officePhone);
  const whatsappDigits = whatsappFromPhone(settings.officePhone);
  const telHref = phoneDigits ? `tel:${phoneDigits}` : "";
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "";

  const embedUrl = settings.mapEmbedUrl?.trim() || MAP_EMBED_URL;

  const addressLines = [
    settings.locationAddress1,
    settings.locationAddress2,
    settings.locationCep,
  ].filter(Boolean);

  const socialLinks = [
    {
      label: "Instagram",
      href: sanitizeUrl(settings.socialInstagram),
      Icon: Instagram,
      color: "text-pink-600",
      bg: "bg-pink-50",
      border: "hover:border-pink-200",
    },
    {
      label: "Facebook",
      href: sanitizeUrl(settings.socialFacebook),
      Icon: Facebook,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "hover:border-blue-200",
    },
    {
      label: "YouTube",
      href: sanitizeUrl(settings.socialYoutube),
      Icon: Youtube,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "hover:border-red-200",
    },
  ].filter((item) => item.href);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-emerald-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest mb-6 border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Canais de Atendimento
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif tracking-tight text-slate-900 mb-6">
            Como podemos <span className="text-blue-600">ajudar você?</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed mb-10">
            Seja para um pedido de oração, informações sobre cultos ou assuntos
            administrativos, nossa equipe está pronta para lhe ouvir.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Conversar no WhatsApp</span>
                <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
              </a>
            ) : null}
            <a
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:border-slate-300"
            >
              Voltar para Home
            </a>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {settings.officeTitle || "Secretaria"}
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  Atendimento presencial e telefônico
                </p>
                <div className="space-y-3">
                  <p className="text-slate-700 font-medium">
                    {settings.officeHours || "Segunda a Sexta, 13h às 18h"}
                  </p>
                  {telHref ? (
                    <a
                      href={telHref}
                      className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm hover:underline decoration-blue-200 underline-offset-4"
                    >
                      <Phone className="w-4 h-4" />
                      {settings.officePhone || "Ligar agora"}
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Email</h3>
                <p className="text-slate-500 text-sm mb-4">
                  Para assuntos gerais e documentos
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="block text-slate-700 font-medium break-all hover:text-indigo-600 transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>

              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-400" />
                  Redes Sociais
                </h3>
                <div className="flex gap-3">
                  {socialLinks.map(({ href, Icon, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      aria-label={label}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm h-full flex flex-col">
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">
                      <MapPin className="w-4 h-4" />
                      Localização
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {settings.locationTitle || "Templo Sede"}
                    </h2>
                    <div className="text-slate-600 mt-1 max-w-md">
                      {addressLines.length > 0
                        ? addressLines.join(", ")
                        : "Endereço não cadastrado"}
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <span className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium">
                      IEADSM
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-h-[400px] relative bg-slate-100">
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    title="Mapa de localização da igreja"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-sm text-slate-500">
                  <p>Venha nos visitar em nossa Sede ou Congregações.</p>
                  <Link
                    href="/institucional?tab=sectors"
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                  >
                    Ver Setores e Congregações
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {socialLinks.length > 0 ? (
        <section className="py-16 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              Acompanhe nosso conteúdo
            </h2>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {socialLinks.map(({ label, href, Icon, color, bg, border }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center gap-3 pl-4 pr-6 py-3 rounded-full border border-slate-200 hover:border-transparent ${border} hover:shadow-lg transition-all duration-300 bg-white hover:bg-white`}
                >
                  <div
                    className={`w-10 h-10 rounded-full ${bg} ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-slate-700 group-hover:text-slate-900">
                    {label}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
