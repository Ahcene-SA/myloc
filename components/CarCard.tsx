"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Zellige } from "./Zellige";
import { site } from "@/lib/site";
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

const categoryStyle: Record<string, { label: string; tint: string }> = {
  citadine: { label: "Citadine", tint: "#CFE3EE" },
  suv: { label: "SUV", tint: "#E9D3BE" },
  berline: { label: "Berline", tint: "#D6DCCB" },
};

export function CarCard({ car, index = 0 }: CarCardProps) {
  const style = categoryStyle[car.category?.toLowerCase()] ?? { label: car.category, tint: "#E4DCCD" };

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.08, ease: "easeOut" }}
      className={cn(
        "group flex h-full flex-col rounded-[28px] bg-cream p-3.5 shadow-[0_1px_0_#E6D6BC] transition-transform duration-300 hover:-translate-y-1.5",
        car.featured && "ring-2 ring-terra/30"
      )}
    >
      <div
        className="arch relative flex h-[210px] items-end justify-center overflow-hidden sm:h-[230px]"
        style={{ backgroundColor: style.tint }}
      >
        <Zellige size={40} color="#FFFFFF" className="opacity-35" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={car.image}
          alt={car.name}
          loading="lazy"
          className="relative -mb-4 w-[112%] max-w-none object-contain drop-shadow-[0_18px_16px_rgba(22,34,46,0.28)] transition-transform duration-500 group-hover:translate-x-2 group-hover:scale-[1.04]"
        />
        <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-xl bg-cream/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink">
          {style.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-2 pb-1 pt-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">{car.name}</h3>
          <span className="text-[13px] font-bold text-muted">{car.year}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold text-ink-soft">
          <span className="rounded-[10px] bg-sand px-2.5 py-1.5">{car.transmission}</span>
          <span className="rounded-[10px] bg-sand px-2.5 py-1.5">{car.seats} places</span>
          {car.fuel && <span className="rounded-[10px] bg-sand px-2.5 py-1.5">{car.fuel}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="font-display text-3xl font-bold text-sea">
            {car.price} {site.currency}
            <span className="ml-1 font-sans text-[13px] font-semibold text-muted">/{car.priceUnit}</span>
          </span>
          <a
            href="register.html"
            aria-label={`Réserver ${car.name}`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-terra text-white transition-colors hover:bg-terra-dark"
          >
            <ArrowUpRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </motion.article>
  );
}
