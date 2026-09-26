import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
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
    <html lang="fr" className={`${montserrat.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: 'window.MYLOC_API_URL = "https://significant-happiness-allowed-hereby.trycloudflare.com";',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
