"use client";

import Image from "next/image";
import { Phone, Mail, Globe, type LucideIcon } from "lucide-react";

const footerLinks = [
  { label: "Accueil", href: "#accueil" },
  { label: "Véhicules", href: "#vehicules" },
  { label: "Avantages", href: "#avantages" },
  { label: "À propos", href: "#a-propos" },
  { label: "Contact", href: "#contact" },
];

type SocialLink =
  | { type: "image"; src: string; href: string; label: string }
  | { type: "icon"; icon: LucideIcon; href: string; label: string };

const socialLinks: SocialLink[] = [
  { type: "image", src: "images/logo-instagram.png", href: "https://instagram.com/myloc.dz", label: "Instagram" },
  { type: "icon", icon: Globe, href: "#", label: "Site web" },
  { type: "icon", icon: Phone, href: "tel:+213555000000", label: "Téléphone" },
  { type: "icon", icon: Mail, href: "mailto:contact@myloc.dz", label: "Email" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 py-12 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Image
              src="images/logo.svg"
              alt="MYLOC.DZ Car Rental"
              width={150}
              height={40}
              className="h-9 w-auto"
            />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              MYLOC.DZ, votre agence de location de voitures en Algérie. Des citadines
              aux SUV, réservez simplement et roulez en toute sérénité.
            </p>
            <div className="mt-6 flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-brand hover:text-white"
                >
                  {social.type === "image" ? (
                    <Image
                      src={social.src}
                      alt={social.label}
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain brightness-90 invert transition-all hover:brightness-100"
                    />
                  ) : (
                    <social.icon className="h-5 w-5" />
                  )}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Liens rapides</h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors hover:text-brand"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Contact</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>+213 555 00 00 00</li>
              <li>contact@myloc.dz</li>
              <li>Alger, Algérie</li>
              <li>Service 24/7</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8 text-center text-xs">
          <p>
            © {currentYear} MYLOC.DZ Car Rental. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
