import type { Metadata } from "next";
import { Fraunces, Manrope, Reem_Kufi } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const reemKufi = Reem_Kufi({
  variable: "--font-reem-kufi",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MYLOC.DZ | Location de voitures en Algérie",
  description:
    "Louez une voiture facilement avec MYLOC.DZ. Large gamme de citadines, SUV et berlines. Tarifs abordables, réservation rapide et service 24/7.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${manrope.variable} ${reemKufi.variable} h-full antialiased`}
    >
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
