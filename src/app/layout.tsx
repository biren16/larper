import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";
import { FollowedNichesProvider } from "@/components/preferences/followed-niches-provider";
import { SiteHeader } from "@/components/shell/site-header";
import { AccountChrome } from "@/components/accounts/account-chrome";
import { SiteFooter } from "@/components/shell/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "larper | Find your next obsession", template: "%s | larper" },
  description: "See what niche communities are obsessed with right now, then explore the context and lore behind it.",
};

export const viewport: Viewport = { colorScheme: "light dark", themeColor: "#e9ebee" };

const introStateScript = `(function(){try{if(sessionStorage.getItem("larper:intro:v1")==="1"){document.documentElement.setAttribute("data-larper-intro","seen")}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <a className="skipLink" href="#main-content">Skip to content</a>
        <FollowedNichesProvider>
          <Suspense fallback={<SiteHeader />}><AccountChrome /></Suspense>
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
