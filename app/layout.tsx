import type { Metadata } from "next";
import { Cairo, Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { LangProvider } from "@/lib/i18n";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

// Police arabe (version العربية du site)
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MYLOC.DZ | Location de voitures en Algérie",
  description:
    "MYLOC.DZ, agence de location de voitures à Alger. Citadines, compactes et SUV récents. Infos et réservation via WhatsApp, service 24/7.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${cairo.variable} h-full antialiased`}
      suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <LangProvider>
          <AuthProvider>{children}</AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
