import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Links Sociais - IEADSM",
  description: "Acesse os canais oficiais da Assembleia de Deus de Santa Maria/RS.",
};

export default function LinksLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
