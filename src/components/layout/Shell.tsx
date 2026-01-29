"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const HIDE_SHELL_PREFIXES = ["/links", "/linktree"];

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const hideShell = HIDE_SHELL_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isHome = pathname === "/";
  const pageBackground = pathname.startsWith("/institucional")
    ? "bg-white"
    : "bg-slate-50";

  if (hideShell) {
    return <>{children}</>;
  }

  const contentSpacing = isHome
    ? ""
    : `pt-28 md:pt-32 lg:pt-36 xl:pt-40 ${pageBackground}`;

  return (
    <>
      <Header />
      <div className={contentSpacing}>{children}</div>
      <Footer />
    </>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <ShellContent>{children}</ShellContent>
    </Suspense>
  );
}
