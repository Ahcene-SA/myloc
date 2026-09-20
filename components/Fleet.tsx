"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CarCard, type Car } from "./CarCard";
import { cn } from "@/lib/utils";
import { fetchCars, mapApiCarToCar } from "@/lib/api";

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
    name: "Opel Mocca",
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
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchCars()
      .then((apiCars) => {
        if (cancelled) return;
        const mapped = apiCars
          .filter((c) => c.status === "available")
          .map(mapApiCarToCar);
        setCars(mapped.length > 0 ? mapped : fallbackCars);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Impossible de charger les véhicules.");
        setCars(fallbackCars);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCars = useMemo(() => {
    return activeCategory === "all"
      ? cars
      : cars.filter((car) => car.category === activeCategory);
  }, [activeCategory, cars]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const firstCard = container.children[0] as HTMLElement | undefined;
    if (!firstCard) return;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(container).gap) || 0;
    const scrollAmount = cardWidth + gap;
    container.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  return (
    <section id="vehicules" className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto w-full">
        <div className="text-center">
          <span className="inline-block rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-brand">
            Notre flotte
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Notre sélection de véhicules
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Des citadines économiques aux SUV spacieux, trouvez le véhicule parfait
            pour votre prochain trajet.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                activeCategory === cat.id
                  ? "bg-brand text-white shadow-md shadow-brand/25"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mx-auto mt-4 w-full sm:mt-6 lg:mt-8">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => scroll("left")}
                className="shrink-0 rounded-full bg-white p-2 text-slate-700 shadow-md transition-all hover:bg-slate-50 hover:text-brand active:scale-95 sm:p-3"
                aria-label="Défiler vers la gauche"
              >
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <div
                ref={scrollRef}
                className="flex flex-1 items-start gap-5 overflow-x-auto py-2 sm:gap-6"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {filteredCars.map((car, index) => (
                  <div
                    key={car.id}
                    className="w-[85vw] shrink-0 sm:w-[60vw] md:w-[45vw] lg:w-[36vw] xl:w-[30vw]"
                  >
                    <CarCard car={car} index={index} />
                  </div>
                ))}
              </div>

              <button
                onClick={() => scroll("right")}
                className="shrink-0 rounded-full bg-white p-2 text-slate-700 shadow-md transition-all hover:bg-slate-50 hover:text-brand active:scale-95 sm:p-3"
                aria-label="Défiler vers la droite"
              >
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
