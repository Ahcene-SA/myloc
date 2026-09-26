"use client";

import { motion } from "framer-motion";
import { Cog, Car as CarIcon, Armchair, CalendarDays } from "lucide-react";
import { WhatsAppIcon } from "./FloatingWhatsApp";
import { categoryInfo, site, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

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
}

/** « Jetour X70+ » → marque « JETOUR », modèle « X70+ » (affichés comme sur les posts). */
function splitName(name: string) {
  const [brand, ...rest] = name.trim().split(/\s+/);
  return { brand, model: rest.join(" ") };
}

export function CarCard({ car, index = 0 }: CarCardProps) {
  const cat = categoryInfo[car.category?.toLowerCase()];
  const { brand, model } = splitName(car.name);

  const specs = [
    { icon: Cog, label: car.transmission === "Automatique" ? "Boîte auto" : `Boîte ${car.transmission.toLowerCase()}` },
    { icon: CarIcon, label: cat?.label ?? car.category },
    { icon: Armchair, label: `${car.seats} places` },
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
          <span className="absolute left-4 top-4 rounded-full bg-navy px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            Coup de cœur
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
        <h3 className="text-[22px] font-extrabold uppercase leading-[1.05] text-navy">
          {brand} {model && <span className="text-sky-gradient">{model}</span>}
        </h3>

        <ul className="mt-4 grid grid-cols-4 divide-x divide-line rounded-2xl bg-mist py-3">
          {specs.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-1.5 px-1 text-center">
              <Icon className="h-[18px] w-[18px] text-navy" strokeWidth={1.8} />
              <span className="text-[9.5px] font-bold uppercase leading-tight tracking-wide text-muted">{label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-end justify-between gap-3">
          <p className="leading-none">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">À partir de</span>
            <span className="mt-1.5 block text-[28px] font-extrabold text-navy">
              {car.price} {site.currency}
              <span className="ml-1 text-xs font-semibold text-muted">/ {car.priceUnit}</span>
            </span>
          </p>
          <a
            href={whatsappLink(`Bonjour MYLOC.DZ, je suis intéressé(e) par la ${car.name}. Est-elle disponible ?`)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Réserver la ${car.name} sur WhatsApp`}
            className="flex h-12 items-center gap-2 rounded-full bg-sky px-4 text-sm font-bold text-navy transition-colors hover:bg-sky-mid hover:text-white"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Réserver
          </a>
        </div>
      </div>
    </motion.article>
  );
}
