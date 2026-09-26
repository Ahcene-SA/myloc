import { Phone, Mail } from "lucide-react";
import { Logo } from "./Navbar";
import { site } from "@/lib/site";

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
  { label: "Téléphone", href: site.phoneHref, icon: Phone },
  { label: "Email", href: `mailto:${site.email}`, icon: Mail },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="overflow-hidden bg-ink text-[#C9CFD6]">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 pb-8 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div className="flex flex-col gap-5">
            <Logo light className="text-[34px]" />
            <p className="text-[15px] leading-relaxed">
              Votre agence de location de voitures en Algérie. Des citadines aux SUV, réservez simplement et roulez en
              toute sérénité.
            </p>
            <div className="flex gap-2.5">
              {socials.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-sand transition-colors hover:bg-terra"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 text-[15px] sm:grid-cols-3 lg:justify-items-end">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-sand">Liens</span>
              {footerLinks.map((l) => (
                <a key={l.href} href={l.href} className="transition-colors hover:text-terra-light">
                  {l.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-sand">Agences</span>
              {site.agencies.map((a) => (
                <span key={a}>{a.replace(/^Agence\s+/, "")}</span>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-sand">Contact</span>
              <a href={site.phoneHref} className="transition-colors hover:text-terra-light">
                {site.phoneDisplay}
              </a>
              <a href={`mailto:${site.email}`} className="transition-colors hover:text-terra-light">
                {site.email}
              </a>
              <span>{site.address}</span>
              <span>Service 24/7</span>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="whitespace-nowrap font-display text-[64px] italic leading-[0.9] tracking-[-0.04em] text-[#22313F] sm:text-[110px] lg:text-[160px]"
        >
          et c&apos;est parti !
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-[#2C3B49] pt-6 text-[13px] sm:flex-row">
          <span>© {year} MYLOC.DZ Car Rental. Tous droits réservés.</span>
          <span lang="ar" dir="rtl" className="font-arabic text-[15px]">
            يلا نمشيو
          </span>
        </div>
      </div>
    </footer>
  );
}
