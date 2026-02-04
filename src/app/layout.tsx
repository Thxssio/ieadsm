import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import Shell from "@/components/layout/Shell";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "IEADSM",
  description: "Igreja Evangélica Assembleia de Deus de Santa Maria",
  metadataBase: new URL("https://adsantamariars.com.br"),
  alternates: {
    canonical: "https://adsantamariars.com.br",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${cormorant.variable} min-h-screen bg-slate-50 font-sans text-slate-800 antialiased`}
      >
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
