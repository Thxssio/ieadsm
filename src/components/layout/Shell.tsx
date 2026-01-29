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

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <div className={isHome ? "" : "pt-40"}>{children}</div>
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
