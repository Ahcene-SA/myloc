import { Phone, Mail, MapPin, UserPlus } from "lucide-react";
import { BrandHeading, PalmShadow, Sky } from "./Brand";
import { WhatsAppIcon } from "./FloatingWhatsApp";
import { site } from "@/lib/site";

const contacts = [
  { label: "WhatsApp", value: site.phoneDisplay, href: site.whatsappHref, icon: WhatsAppIcon },
  { label: "Téléphone", value: site.phoneDisplay, href: site.phoneHref, icon: Phone },
  { label: "Email", value: site.email, href: `mailto:${site.email}`, icon: Mail },
  { label: "Adresse", value: site.address, href: undefined, icon: MapPin },
];

export function Contact() {
  return (
    <section id="contact" className="bg-brand-mist relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <PalmShadow flip className="-right-32 bottom-0 w-[520px] opacity-[0.12]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_440px] lg:gap-14">
        <div className="flex flex-col gap-8">
          <BrandHeading overline="Infos & réservation">
            Prêt à prendre <Sky>la route</Sky> ?
          </BrandHeading>
          <p className="max-w-md text-base leading-relaxed text-ink-soft">
            Notre équipe vous répond en quelques minutes. Écrivez-nous sur WhatsApp, appelez-nous ou réservez directement en
            ligne.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.map(({ label, value, href, icon: Icon }) => {
              const inner = (
                <>
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-sky-soft text-sky-text">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{label}</span>
                    <span className="truncate text-[15px] font-bold text-navy">{value}</span>
                  </span>
                </>
              );
              const cls = "flex items-center gap-4 rounded-2xl border border-line bg-white p-4";
              return href ? (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`${cls} transition-colors hover:border-sky`}
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

        <div className="relative flex flex-col gap-6 overflow-hidden rounded-[28px] bg-navy p-8 text-white sm:p-10">
          <span aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[36px] border-sky/15" />
          <h3 className="relative text-2xl font-extrabold uppercase tracking-wide">
            Horaires <span className="text-sky">d&apos;ouverture</span>
          </h3>
          <dl className="relative flex flex-col gap-3.5 text-[15px]">
            {site.hours.map((h) => (
              <div key={h.label} className="flex justify-between gap-4">
                <dt className="text-white/75">{h.label}</dt>
                <dd className="font-bold">{h.value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-white/15 pt-3.5">
              <dt className="text-white/75">Assistance</dt>
              <dd className="font-bold text-sky">24h/24 – 7j/7</dd>
            </div>
          </dl>
          <div className="relative mt-auto flex flex-col gap-3 pt-4">
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-sky text-[15px] font-bold text-navy transition-colors hover:bg-white"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Écrire sur WhatsApp
            </a>
            <a
              href="register.html"
              className="flex h-14 items-center justify-center gap-2.5 rounded-full border-2 border-white/30 text-[15px] font-bold text-white transition-colors hover:border-white"
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
