import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PrivacyProvider } from "@/components/privacy-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PocketBudget",
  description: "Suivi de dépenses privé, minimaliste et synchronisé.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col overflow-x-hidden bg-[#f5f5f7] font-sans text-zinc-900 dark:bg-[#000000] dark:text-zinc-100">
        {/* Fallback couleur si le CSS Tailwind met du temps à charger (évite page noire vide) */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body{background:#f5f5f7;color:#18181b}html.dark,html.dark body{background:#000;color:#f4f4f5}`,
          }}
        />
        <ThemeProvider>
          <PrivacyProvider>
            <div className="flex min-h-dvh w-full flex-1 flex-col">{children}</div>
          </PrivacyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
