"use client";

import { useEffect, useMemo, useState } from "react";
import { CarCard, type Car } from "./CarCard";
import { cn } from "@/lib/utils";
import { fetchCars, mapApiCarToCar } from "@/lib/api";
import { FILTER_EVENT } from "@/lib/site";

const categories = [
  { id: "all", label: "Tous" },
  { id: "citadine", label: "Citadines" },
  { id: "suv", label: "SUV" },
  { id: "berline", label: "Berlines" },
];

const fallbackCars: Car[] = [
  {
    id: "clio5-alpino",
    name: "Clio 5 Alpino",
    category: "citadine",
    image: "images/clio5-alpino.png",
    price: 55,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "clio5-techno",
    name: "Clio 5 Techno",
    category: "citadine",
    image: "images/clio5-techno.png",
    price: 52,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "citroen-c3",
    name: "Citroën C3",
    category: "citadine",
    image: "images/citroen-c3.png",
    price: 48,
    priceUnit: "jour",
    transmission: "Manuelle",
    seats: 5,
    year: 2024,
  },
  {
    id: "opel-astra",
    name: "Opel Astra",
    category: "berline",
    image: "images/opel-astra.png",
    price: 75,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "opel-mocca",
    name: "Opel Mokka",
    category: "suv",
    image: "images/opel-mocca.png",
    price: 80,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "renault-captur",
    name: "Renault Captur",
    category: "suv",
    image: "images/renault-captur.png",
    price: 72,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "jetour-x70+",
    name: "Jetour X70+",
    category: "suv",
    image: "images/jetour-x70+.png",
    price: 95,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 7,
    year: 2025,
    featured: true,
  },
];

export function Fleet() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchCars()
      .then((apiCars) => {
        if (cancelled) return;
        const available = apiCars.filter((c) => c.status === "available");
        const mapped = available.map(mapApiCarToCar);
        setCars(mapped.length > 0 ? mapped : fallbackCars);
      })
      .catch((e) => {
        if (cancelled) return;
        // API indisponible : on affiche la flotte par défaut sans message d'erreur pour le visiteur.
        console.warn("[MYLOC] Flotte par défaut affichée :", e instanceof Error ? e.message : e);
        setCars(fallbackCars);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filtre envoyé par le formulaire de recherche du Hero.
  useEffect(() => {
    const onFilter = (e: Event) => {
      const cat = (e as CustomEvent<string>).detail;
      if (categories.some((c) => c.id === cat)) setActiveCategory(cat);
    };
    window.addEventListener(FILTER_EVENT, onFilter);
    return () => window.removeEventListener(FILTER_EVENT, onFilter);
  }, []);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: cars.length };
    cars.forEach((c) => {
      const k = c.category?.toLowerCase();
      out[k] = (out[k] ?? 0) + 1;
    });
    return out;
  }, [cars]);

  const filteredCars = useMemo(
    () => (activeCategory === "all" ? cars : cars.filter((car) => car.category?.toLowerCase() === activeCategory)),
    [activeCategory, cars]
  );

  return (
    <section id="vehicules" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3.5">
            <span className="eyebrow text-terra">Notre flotte</span>
            <h2 className="font-display text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-5xl lg:text-[64px]">
              Une voiture pour
              <br />
              <span className="font-normal italic">chaque route.</span>
            </h2>
          </div>

          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrer par catégorie">
            {categories.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex h-12 flex-shrink-0 items-center gap-2 rounded-full border-[1.5px] px-5 text-[15px] font-bold transition-colors",
                    active ? "border-ink bg-ink text-sand" : "border-sand-line text-ink hover:border-ink"
                  )}
                >
                  {cat.label}
                  <span className={cn("text-xs font-extrabold", active ? "text-terra-light" : "text-muted")}>
                    {counts[cat.id] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-12">
          {loading ? (
            <div className="flex h-72 items-center justify-center" role="status" aria-label="Chargement des véhicules">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-sand-deep border-t-terra" />
            </div>
          ) : filteredCars.length > 0 ? (
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCars.map((car, index) => (
                <div key={car.id} className="w-[80%] flex-shrink-0 snap-start sm:w-auto">
                  <CarCard car={car} index={index} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-muted">Aucun véhicule dans cette catégorie pour le moment.</p>
          )}
        </div>
      </div>
    </section>
  );
}
