"use client";

import { motion } from "framer-motion";
import { Cog, Car as CarIcon, Armchair, CalendarDays } from "lucide-react";
import { WhatsAppIcon } from "./FloatingWhatsApp";
import { categoryInfo, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { formatPrice } from "./client/shared";

export interface Car {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  priceUnit: string;
  transmission: string;
  seats: number;
  year: number;
  fuel?: string;
  featured?: boolean;
}

interface CarCardProps {
  car: Car;
  index?: number;
  /** Prix total pour les dates recherchées sur l'accueil */
  quote?: { days: number; total: number; label: string; range?: string; base?: number; discountLabel?: string | null };
  onBook?: () => void;
}

/** « Jetour X70+ » → marque « JETOUR », modèle « X70+ » (affichés comme sur les posts). */
function splitName(name: string) {
  const [brand, ...rest] = name.trim().split(/\s+/);
  return { brand, model: rest.join(" ") };
}

export function CarCard({ car, index = 0, quote, onBook }: CarCardProps) {
  const { t } = useLang();
  const cat = categoryInfo[car.category?.toLowerCase()];
  const { brand, model } = splitName(car.name);

  const specs = [
    { icon: Cog, label: car.transmission === "Automatique" ? t("Boîte auto") : t(`Boîte ${car.transmission.toLowerCase()}`) },
    { icon: CarIcon, label: t(cat?.label ?? car.category) },
    { icon: Armchair, label: `${car.seats} ${t("places")}` },
    { icon: CalendarDays, label: String(car.year) },
  ];

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.08, ease: "easeOut" }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white transition-shadow duration-300 hover:shadow-[0_24px_50px_-24px_rgba(15,27,45,0.35)]",
        car.featured && "ring-2 ring-sky/50"
      )}
    >
      {/* Visuel */}
      <div className="bg-brand-mist relative flex h-[200px] items-center justify-center overflow-hidden px-6 pt-4">
        <span aria-hidden="true" className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[26px] border-sky/10" />
        {car.featured && (
          <span className="absolute start-4 top-4 rounded-full bg-navy px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            {t("Coup de cœur")}
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={car.image}
          alt={car.name}
          loading="lazy"
          className="car-reflect relative w-[88%] object-contain transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03]"
        />
      </div>

      {/* Nom façon post Instagram */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        {/* Nom isolé en LTR : « JETOUR X70+ » ne doit pas devenir « +JETOUR X70 » en arabe */}
        <h3 className="text-[22px] font-extrabold uppercase leading-[1.05] text-navy">
          <bdi dir="ltr">
            {brand} {model && <span className="text-sky-gradient">{model}</span>}
          </bdi>
        </h3>

        <ul className="mt-4 grid grid-cols-4 items-start divide-x divide-line rounded-2xl bg-mist py-3">
          {specs.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-1.5 px-1 text-center">
              <Icon className="h-[18px] w-[18px] text-navy" strokeWidth={1.8} />
              <span className="text-[9.5px] font-bold uppercase leading-tight tracking-wide text-muted">{label}</span>
            </li>
          ))}
        </ul>

        {quote ? (
          <div className="mt-auto flex flex-col gap-3 pt-5">
            <div className="rounded-2xl bg-sky-soft/70 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.1em] text-sky-text">
                  {t(quote.days > 1 ? "Total · {days} jours" : "Total · {days} jour", { days: quote.days })}
                </span>
                <span className="whitespace-nowrap text-[11px] font-semibold text-muted">
                  {formatPrice(car.price)}/{t("jour")}
                </span>
              </div>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 leading-none">
                <span className="whitespace-nowrap text-[26px] font-extrabold text-navy">
                  {formatPrice(quote.total)}
                </span>
                {!!quote.base && quote.base > quote.total && (
                  <span className="whitespace-nowrap text-sm font-semibold text-muted line-through">
                    {formatPrice(quote.base)}
                  </span>
                )}
              </p>
              {/* Période sous le total, sur une seule ligne */}
              <p className="mt-1.5 whitespace-nowrap text-[12px] font-semibold text-muted">{quote.range ?? quote.label}</p>
              {quote.discountLabel && (
                <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {t(quote.discountLabel)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onBook}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-navy px-4 text-sm font-bold text-white transition-colors hover:bg-navy-soft"
              >
                {t("Réserver ces dates")}
              </button>
              <a
                href={whatsappLink(
                  t("Bonjour MYLOC.DZ, je souhaite réserver la {car} {period} ({days} jours).", {
                    car: car.name,
                    period: quote.label.toLowerCase(),
                    days: quote.days,
                  })
                )}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("Demander la {car} sur WhatsApp", { car: car.name })}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sky text-navy transition-colors hover:bg-sky-mid hover:text-white"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-5">
            <p className="leading-none">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{t("À partir de")}</span>
              <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-[28px] font-extrabold text-navy">
                <span className="whitespace-nowrap">{formatPrice(car.price)}</span>
                <span className="whitespace-nowrap text-xs font-semibold text-muted">/ {t(car.priceUnit)}</span>
              </span>
            </p>
            {/* Bouton sous le prix, pleine largeur : il ne déborde plus de la carte, quelle que soit la police */}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onBook}
                className="flex h-12 flex-1 items-center justify-center rounded-full bg-navy px-4 text-sm font-bold text-white transition-colors hover:bg-navy-soft"
              >
                {t("Réserver")}
              </button>
              <a
                href={whatsappLink(t("Bonjour MYLOC.DZ, je suis intéressé(e) par la {car}. Est-elle disponible ?", { car: car.name }))}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("Demander la {car} sur WhatsApp", { car: car.name })}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sky text-navy transition-colors hover:bg-sky-mid hover:text-white"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </motion.article>
  );
}
