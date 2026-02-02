"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";
import { LOGO_BLACK, LOGO_WHITE } from "@/data/site";
import { useAuth } from "@/components/providers/AuthProvider";
import LoginModal from "@/components/ui/LoginModal";

const sectionLinks = [
  { label: "Ministérios", href: "/ministerios" },
  { label: "Notícias", href: "/#noticias" },
  { label: "Eventos", href: "/eventos" },
  { label: "Contato", href: "/contato" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  const isHome = pathname === "/";
  const isInstitutional = pathname === "/institucional";
  const isHero = isHome && !isScrolled;
  const isSolid = isScrolled || !isHome;
  const isHeroMenu = isHero && isMenuOpen;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loginParam = searchParams?.get("login");
    if (!loginParam) return;
    setIsLoginOpen(true);
    setIsMenuOpen(false);
    router.replace(pathname || "/", { scroll: false });
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    const originalPadding = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPadding;
    };
  }, [isMenuOpen]);

  const baseLinkClasses =
    "px-3 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 relative group overflow-hidden";
  const linkTone = isSolid
    ? "text-slate-600 hover:text-blue-700"
    : "text-white/90 hover:text-white";
  const hoverBg = isSolid ? "bg-blue-50" : "bg-white/10";
  const mobileMenuBg = isSolid ? "bg-white" : "bg-[#1b3b83]";
  const mobileLinkText = isSolid
    ? "text-slate-600 hover:text-blue-700"
    : "text-white/90 hover:text-white";
  const mobileLinkHover = isSolid ? "hover:bg-blue-50" : "hover:bg-white/10";
  const mobileBorder = isSolid ? "border-slate-50" : "border-white/10";

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    router.push("/");
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-in-out ${
        isSolid
          ? "bg-white/95 backdrop-blur-md shadow-md py-2"
          : isHeroMenu
          ? "bg-[#1b3b83] shadow-md py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 cursor-pointer flex-shrink-0"
            onClick={() => setIsMenuOpen(false)}
          >
            <img
              src={isSolid ? LOGO_BLACK : LOGO_WHITE}
              alt="Logo IEADSM"
              className={`w-auto transition-all duration-500 ease-in-out object-contain ${
                isScrolled ? "h-10 md:h-16" : "h-14 md:h-[108px]"
              }`}
            />
          </Link>

          <nav className="hidden lg:flex items-center space-x-1 justify-self-center">
            <Link
              href="/"
              className={`${baseLinkClasses} ${linkTone} ${
                isHome ? "text-blue-700" : ""
              }`}
            >
              <span className="relative z-10">Início</span>
              <span
                className={`pointer-events-none absolute inset-0 ${hoverBg} opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300`}
              ></span>
            </Link>

            <Link
              href="/institucional"
              className={`${baseLinkClasses} ${linkTone} ${
                isInstitutional ? "text-blue-700 bg-blue-50" : ""
              }`}
            >
              <span className="relative z-10">Institucional</span>
              <span
                className={`pointer-events-none absolute inset-0 ${hoverBg} opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300`}
              ></span>
            </Link>

            {sectionLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`${baseLinkClasses} ${linkTone}`}
              >
                <span className="relative z-10">{item.label}</span>
                <span
                  className={`pointer-events-none absolute inset-0 ${hoverBg} opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300`}
                ></span>
              </Link>
            ))}

            <Link
              href="/contribua"
              className={`${baseLinkClasses} ${linkTone}`}
            >
              <span className="relative z-10">Contribua</span>
              <span
                className={`pointer-events-none absolute inset-0 ${hoverBg} opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300`}
              ></span>
            </Link>
          </nav>

          <div className="flex items-center justify-self-end">
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/admin"
                    className={`px-6 py-2.5 rounded-full font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:-translate-y-0.5 ${
                      isSolid
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-white text-green-700 hover:bg-green-50"
                    }`}
                  >
                    <LayoutDashboard size={18} />
                    <span>Painel</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`px-4 py-2.5 rounded-full font-bold transition-all border flex items-center gap-2 ${
                      isSolid
                        ? "border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        : "border-white/40 text-white hover:bg-white/15"
                    }`}
                  >
                    <LogOut size={18} />
                    <span>Sair</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/carteirinha"
                    className={`px-5 py-2.5 rounded-full font-bold transition-all border flex items-center gap-2 ${
                      isSolid
                        ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "border-white/40 text-white hover:bg-white/15"
                    }`}
                  >
                    Carteirinha
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsLoginOpen(true)}
                    className={`px-6 py-2.5 rounded-full font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:-translate-y-0.5 ${
                      isSolid
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white text-blue-900 hover:bg-blue-50"
                    }`}
                  >
                    <LogIn size={18} />
                    <span>Acesso</span>
                  </button>
                </>
              )}
            </div>

            <button
              className={`lg:hidden transition-colors duration-300 p-2 ${
                isSolid ? "text-slate-800" : "text-white"
              }`}
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div
          className={`lg:hidden absolute top-full left-0 w-full border-t shadow-xl animate-fade-in max-h-[85vh] overflow-y-auto ${mobileMenuBg} ${
            isSolid ? "border-slate-100" : "border-white/10"
          }`}
        >
          <div className="px-4 py-6 space-y-2">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className={`block w-full text-left px-4 py-3 text-base font-bold rounded-xl transition-colors border-b ${mobileLinkText} ${mobileLinkHover} ${mobileBorder}`}
            >
              Início
            </Link>
            <Link
              href="/institucional"
              onClick={() => setIsMenuOpen(false)}
              className={`block w-full text-left px-4 py-3 text-base font-bold rounded-xl transition-colors border-b ${mobileLinkText} ${mobileLinkHover} ${mobileBorder}`}
            >
              Institucional
            </Link>
            {[...sectionLinks, { label: "Contribua", href: "/contribua" }].map(
              (item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block w-full text-left px-4 py-3 text-base font-bold rounded-xl transition-colors border-b last:border-0 ${mobileLinkText} ${mobileLinkHover} ${mobileBorder}`}
                >
                  {item.label}
                </Link>
              )
            )}
            <div className="pt-4 mt-2">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className={`w-full px-5 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md text-lg ${
                      isSolid
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-white text-green-700 hover:bg-white/90"
                    }`}
                  >
                    <LayoutDashboard size={20} />
                    Painel
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`w-full px-5 py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg border ${
                      isSolid
                        ? "border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        : "border-white/40 text-white hover:bg-white/15"
                    }`}
                  >
                    <LogOut size={20} />
                    Sair
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link
                    href="/carteirinha"
                    onClick={() => setIsMenuOpen(false)}
                    className={`w-full px-5 py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg border ${
                      isSolid
                        ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "border-white/40 text-white hover:bg-white/15"
                    }`}
                  >
                    Carteirinha
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsLoginOpen(true);
                    }}
                    className={`w-full px-5 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md text-lg ${
                      isSolid
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white text-blue-900 hover:bg-white/90"
                    }`}
                  >
                    <LogIn size={20} />
                    Acesso
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <LoginModal
        open={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </header>
  );
}
