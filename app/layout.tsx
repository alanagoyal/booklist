import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import Providers from "./providers";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/header";
import Script from "next/script";

// Font must be loaded at the module scope with a const assignment
// Add error handling through optional fallback fonts
const specialElite = localFont({
  src: '../public/fonts/SpecialElite-Regular.ttf',
  variable: '--font-special-elite',
  display: 'block',
  fallback: ['system-ui', 'Arial'],
  adjustFontFallback: "Arial",
});

export const viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.title,
    url: siteConfig.url,
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Mobile web app capability meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Error tracking script */}
        <Script id="error-detection" strategy="afterInteractive">
          {`
            window.addEventListener('error', function(event) {
              console.error('JavaScript error caught:', {
                message: event.message,
                source: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error?.stack || event.error || 'Unknown'
              });
            });
          `}
        </Script>
      </head>
      <body className={`antialiased ${specialElite.className}`}>
        <Providers>
          <div className="h-dvh w-full text-sm flex flex-col overflow-hidden">
            <div className="flex flex-col flex-1 m-4 border border-border overflow-hidden">
              <Header />
              <main className="flex-1 overflow-hidden">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
