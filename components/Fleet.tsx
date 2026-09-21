"use client";

import { useEffect, useMemo, useState } from "react";
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
        const available = apiCars.filter((c) => c.status === "available");
        const mapped = available.map(mapApiCarToCar);
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

  return (
    <section id="vehicules" className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

        <div className="mx-auto mt-10 w-full">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCars.map((car, index) => (
                <CarCard key={car.id} car={car} index={index} />
              ))}
            </div>
          )}
        </div>

        {!loading && filteredCars.length === 0 && (
          <p className="mt-8 text-center text-slate-500">Aucun véhicule ne correspond à votre recherche.</p>
        )}
      </div>
    </section>
  );
}
