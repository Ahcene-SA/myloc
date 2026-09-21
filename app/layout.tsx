import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <head>
        {
          /* To point the frontend to your backend, set localStorage.myloc_api_url
             in the browser console or pass ?apiUrl=YOUR_URL as a query param.
             Example: localStorage.setItem("myloc_api_url", "https://abc.trycloudflare.com");
             Previous runtime override (expired tunnel) removed. */
        }
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
