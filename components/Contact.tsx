import { Phone, Mail, MapPin, UserPlus } from "lucide-react";
import { Star8 } from "./Zellige";
import { WhatsAppIcon } from "./FloatingWhatsApp";
import { site } from "@/lib/site";

const contacts = [
  { label: "Téléphone", value: site.phoneDisplay, href: site.phoneHref, icon: Phone },
  { label: "WhatsApp", value: site.phoneDisplay, href: site.whatsappHref, icon: WhatsAppIcon },
  { label: "Email", value: site.email, href: `mailto:${site.email}`, icon: Mail },
  { label: "Adresse", value: site.address, href: undefined, icon: MapPin },
];

export function Contact() {
  return (
    <section id="contact" className="px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 rounded-[40px] bg-cream p-6 sm:p-10 lg:flex-row lg:gap-14 lg:p-16">
        <div className="flex flex-1 flex-col gap-7">
          <span className="eyebrow text-terra">Contactez-nous</span>
          <h2 className="font-display text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-5xl lg:text-[56px]">
            Prêt à prendre
            <br />
            <span className="font-normal italic">la route&nbsp;?</span>
          </h2>
          <p className="max-w-md text-base leading-relaxed text-ink-soft">
            Notre équipe vous répond en quelques minutes. Appelez, envoyez un message ou réservez directement en ligne.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.map(({ label, value, href, icon: Icon }) => {
              const inner = (
                <>
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-cream text-terra">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">{label}</span>
                    <span className="truncate text-base font-bold text-ink">{value}</span>
                  </span>
                </>
              );
              const cls = "flex items-center gap-4 rounded-[20px] bg-sand p-4";
              return href ? (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`${cls} transition-colors hover:bg-sand-deep`}
                >
                  {inner}
                </a>
              ) : (
                <div key={label} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative flex flex-col gap-6 overflow-hidden rounded-[28px] bg-terra p-7 text-white sm:p-10 lg:w-[440px] lg:flex-shrink-0">
          <Star8 className="absolute -right-24 -top-24 h-60 w-60 opacity-15" color="#fff" strokeWidth={0.6} />
          <h3 className="relative font-display text-3xl font-semibold">Horaires d&apos;ouverture</h3>
          <dl className="relative flex flex-col gap-3.5 text-base">
            {site.hours.map((h) => (
              <div key={h.label} className="flex justify-between gap-4">
                <dt>{h.label}</dt>
                <dd className="font-extrabold">{h.value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-white/30 pt-3.5">
              <dt>Assistance</dt>
              <dd className="font-extrabold">24h/24 – 7j/7</dd>
            </div>
          </dl>
          <div className="relative mt-auto flex flex-col gap-3 pt-4">
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-white text-base font-extrabold text-ink transition-colors hover:bg-cream"
            >
              <WhatsAppIcon className="h-5 w-5 text-olive" />
              Écrire sur WhatsApp
            </a>
            <a
              href="register.html"
              className="flex h-14 items-center justify-center gap-2.5 rounded-full border-[1.5px] border-white/70 text-base font-bold text-white transition-colors hover:bg-white/10"
            >
              <UserPlus className="h-5 w-5" />
              Créer mon compte client
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
