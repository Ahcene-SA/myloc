"use client";

import { Phone, Mail } from "lucide-react";
import { AlgiersSkyline, Logo } from "./Brand";
import { WhatsAppIcon } from "./FloatingWhatsApp";
import { site } from "@/lib/site";
import { useLang } from "@/lib/i18n";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

const footerLinks = [
  { label: "Accueil", href: "#accueil" },
  { label: "Véhicules", href: "#vehicules" },
  { label: "Avantages", href: "#avantages" },
  { label: "À propos", href: "#a-propos" },
  { label: "Contact", href: "#contact" },
];

const socials = [
  { label: "Instagram", href: site.instagram, icon: InstagramIcon },
  { label: "WhatsApp", href: site.whatsappHref, icon: WhatsAppIcon },
  { label: "Téléphone", href: site.phoneHref, icon: Phone },
  { label: "Email", href: `mailto:${site.email}`, icon: Mail },
];

export function Footer() {
  const year = new Date().getFullYear();
  const { t } = useLang();

  return (
    <footer className="relative overflow-hidden bg-navy text-white/70">
      <AlgiersSkyline className="inset-x-0 bottom-0 h-40 w-full text-white opacity-[0.025] lg:h-52" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 pb-8 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div className="flex flex-col gap-5">
            <Logo light />
            <p className="text-sm leading-relaxed">
              {t(
                "Agence de location de voitures à Alger. Citadines, compactes et SUV : réservez simplement et roulez en toute sérénité, partout en Algérie."
              )}
            </p>
            <div className="flex gap-2.5">
              {socials.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={t(label)}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-sky hover:text-navy"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3 lg:justify-items-end">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-white">{t("Liens")}</span>
              {footerLinks.map((l) => (
                <a key={l.href} href={l.href} className="transition-colors hover:text-sky">
                  {t(l.label)}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-white">{t("Points de retrait")}</span>
              {site.agencies.map((a) => (
                <span key={a}>{t(a).replace(/^(Agence|وكالة)\s+/, "")}</span>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-white">{t("Contact")}</span>
              <a href={site.phoneHref} dir="ltr" className="transition-colors hover:text-sky">
                {site.phoneDisplay}
              </a>
              <a href={`mailto:${site.email}`} className="transition-colors hover:text-sky">
                {site.email}
              </a>
              <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-sky">
                {site.instagramHandle}
              </a>
              <span>{t("Service 24/7")}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row">
          <span>{t("© {year} MYLOC.DZ Car Rental. Tous droits réservés.", { year })}</span>
          <span className="font-semibold uppercase tracking-[0.2em]">{t("Alger, Algérie")}</span>
        </div>
      </div>
    </footer>
  );
}
