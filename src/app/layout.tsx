import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { seedRepository } from "@/data/seed/repository";
import { FollowedNichesProvider } from "@/components/preferences/followed-niches-provider";
import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LARPer | Find your next obsession", template: "%s | LARPer" },
  description: "See what niche communities are obsessed with right now, then explore the context and lore behind it.",
};

export const viewport: Viewport = { colorScheme: "light dark", themeColor: "#e9ebee" };

const introStateScript = `(function(){try{if(sessionStorage.getItem("larper:intro:v1")==="1"){document.documentElement.setAttribute("data-larper-intro","seen")}}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const niches = await seedRepository.listNiches();
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <a className="skipLink" href="#main-content">Skip to content</a>
        <FollowedNichesProvider knownNicheIds={niches.map((niche) => niche.id)}>
          <SiteHeader />
          {children}
          <SiteFooter />
        </FollowedNichesProvider>
        <Script id="larper-intro-state" strategy="beforeInteractive">
          {introStateScript}
        </Script>
      </body>
    </html>
  );
}
