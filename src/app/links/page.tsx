"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { defaultLinks, type LinkItem } from "@/data/links";

/* ---------- Ícones ---------- */
const ShareIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const VerifiedIcon = () => (
  <svg className="w-5 h-5 text-blue-500 ml-1" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

/* ---------- Helpers ---------- */
const sanitizeUrl = (url?: string) => {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const domainFromUrl = (url?: string) => {
  try {
    const hostname = new URL(sanitizeUrl(url)).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return "";
  }
};

const faviconFromUrl = (url?: string) => {
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) return "";
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
    safeUrl
  )}`;
};

const autoIcon = () => "/logo.png"; // Fallback
const safeIcon = (icon?: string) => {
  if (!icon) return "";
  if (icon.startsWith("http://") || icon.startsWith("https://")) return icon;
  if (!icon.startsWith("/")) return "";
  return encodeURI(icon);
};

/* ---------- Componente Social Button ---------- */
const SocialButton = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <motion.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    whileHover={{ y: -3, scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    className="p-3 rounded-full bg-white shadow-sm text-slate-600 hover:text-blue-600 hover:shadow-md transition-all duration-300 border border-slate-100"
  >
    {children}
  </motion.a>
);

/* ---------- Grupo Social ---------- */
const SocialIcons = () => (
  <div className="flex gap-4 mt-6 justify-center">
    <SocialButton href="https://www.instagram.com/adsantamariars/">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919C2.174 15.584 2.163 15.204 2.163 12s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zM12 7.231a4.769 4.769 0 100 9.538 4.769 4.769 0 000-9.538zm6.448-.398a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" /></svg>
    </SocialButton>
    <SocialButton href="mailto:contato@adsantamaria.com.br">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18a2 2 0 002 2h16a2 2 0 002-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
    </SocialButton>
    <SocialButton href="https://www.facebook.com/ADSantaMariaRS/">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
    </SocialButton>
    <SocialButton href="https://www.youtube.com/@adsantamariars">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M21.582 7.243c-.24-.88-.9-1.54-1.78-1.78C18.25 5 12 5 12 5s-6.25 0-7.802.463c-.88.24-1.54.9-1.78 1.78C2 8.793 2 12 2 12s0 3.207.418 4.757c.24.88.9 1.54 1.78 1.78C5.75 19 12 19 12 19s6.25 0 7.802-.463c.88-.24 1.54-.9 1.78-1.78C22 15.207 22 12 22 12s0-3.207-.418-4.757zM9.75 15.5V8.5l6 3.5-6 3.5z" /></svg>
    </SocialButton>
  </div>
);

/* ---------- Skeleton ---------- */
const LinkCardSkeleton = () => (
  <div className="w-full bg-white/60 h-16 rounded-2xl animate-pulse flex items-center px-4 mb-3 border border-white/40">
    <div className="w-10 h-10 bg-slate-200 rounded-lg mr-4" />
    <div className="flex-1">
      <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-1/3" />
    </div>
  </div>
);

/* ---------- Página ---------- */
export default function LinktreePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!db) {
      setLinks(defaultLinks);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "links"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLinks(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as LinkItem[]);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const safeLinks = useMemo(() => {
    const source = !loading && links.length === 0 ? defaultLinks : links;
    return [...source]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((link) => ({
        ...link,
        href: sanitizeUrl(link.href),
        icon: safeIcon(link.icon) || faviconFromUrl(link.href) || autoIcon(),
      }));
  }, [links, loading]);

  if (!isMounted) return null;

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 260, damping: 20 },
    },
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 font-sans relative overflow-hidden flex flex-col items-center selection:bg-blue-100">
      
      {/* Background Animado */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-blue-200/30 blur-[100px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[40%] -right-[10%] w-[500px] h-[500px] rounded-full bg-indigo-200/30 blur-[100px]" 
        />
      </div>

      <div className="w-full max-w-md px-4 py-8 min-h-screen flex flex-col">
        
        {/* Topo / Share */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-white/50 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-white transition-colors shadow-sm"
          >
            Inicio
          </Link>
          <motion.button
            onClick={handleShare}
            whileTap={{ scale: 0.9 }}
            whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
            className="p-2.5 rounded-full text-slate-500 hover:text-slate-800 transition-colors bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm"
          >
            <ShareIcon />
          </motion.button>
        </div>

        {/* Header Profile */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center mb-8 relative z-10"
        >
          <div className="relative group cursor-default">
            <motion.div
              className="absolute -inset-1 bg-gradient-to-tr from-blue-400 to-indigo-400 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500"
            />
            <Image
              src="/logo.png"
              alt="Logo AD Santa Maria"
              width={100}
              height={100}
              className="relative rounded-full w-28 h-28 object-cover border-4 border-white shadow-lg bg-white"
              unoptimized
              priority
              onError={(e) => (e.currentTarget.src = "/logo.png")}
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">@adsantamariars</h1>
            <VerifiedIcon />
          </div>
          
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-xs leading-relaxed">
            Igreja Evangélica Assembleia de Deus de Santa Maria/RS
          </p>

          <SocialIcons />
        </motion.header>

        {/* Lista de Links */}
        <main className="w-full flex-1 relative z-10">
          {loading ? (
            <div className="w-full space-y-3">
              <LinkCardSkeleton />
              <LinkCardSkeleton />
              <LinkCardSkeleton />
            </div>
          ) : safeLinks.length === 0 ? (
            <div className="text-center py-10 bg-white/40 rounded-2xl backdrop-blur-sm border border-white/40">
              <p className="text-slate-500">Nenhum link disponível no momento.</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-3"
            >
              {safeLinks.map((link, index) => (
                <motion.a
                  key={link.id ?? index}
                  variants={itemVariants}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative flex items-center w-full p-1.5 pr-4 bg-white hover:bg-white/90 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100"
                >
                  {/* Ícone */}
                  <div className="w-12 h-12 flex-shrink-0 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 group-hover:border-blue-100 transition-colors">
                     {link.icon ? (
                      <Image
                        src={link.icon}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        alt=""
                        unoptimized
                        onError={(e) => (e.currentTarget.src = "/logo.png")}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        {domainFromUrl(link.href).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Texto */}
                  <div className="flex-1 ml-4 flex flex-col justify-center text-left">
                    <span className="font-semibold text-slate-800 text-[15px] group-hover:text-blue-700 transition-colors line-clamp-1">
                      {link.text}
                    </span>
                    <span className="text-xs text-slate-400 font-medium group-hover:text-blue-400/80 transition-colors truncate max-w-[200px]">
                       {domainFromUrl(link.href)}
                    </span>
                  </div>

                  {/* Seta Externa */}
                  <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <ExternalLinkIcon />
                  </div>
                </motion.a>
              ))}
            </motion.div>
          )}
        </main>

        <footer className="py-8 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            AD Santa Maria
          </p>
        </footer>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 z-50 px-6 py-3 bg-slate-800/90 text-white text-sm font-medium rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Link copiado!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
