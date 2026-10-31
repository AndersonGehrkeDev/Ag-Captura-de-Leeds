import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./prospecting.css";
import "./auth.css";
import "./search-live.css";
import "./management.css";

export const metadata: Metadata = {
  title: { default: "AG Prospecção | Base da plataforma", template: "%s | AG Prospecção" },
  description: "Plataforma de prospecção e acompanhamento comercial da AG Soluções Digitais.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#080c0f" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <a href="#conteudo" className="fixed top-3 left-3 z-50 flex min-h-11 -translate-y-32 items-center rounded-md bg-primary px-4 font-bold text-primary-foreground focus:translate-y-0">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
