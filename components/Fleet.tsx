"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  /* reset carousel when category changes */
  useEffect(() => {
    setCurrentPage(0);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [activeCategory]);

  /* responsive page size */
  const [pageSize, setPageSize] = useState(2);
  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      let size = 1;
      if (window.innerWidth >= 1280) size = 4;
      else if (window.innerWidth >= 1024) size = 3;
      else if (window.innerWidth >= 640) size = 2;
      setPageSize(size);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredCars.length / pageSize));

  const scrollToPage = (page: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const pageWidth = container.clientWidth;
    container.scrollTo({ left: pageWidth * page, behavior: "smooth" });
    setCurrentPage(page);
  };

  const goPrev = () => scrollToPage(Math.max(0, currentPage - 1));
  const goNext = () => scrollToPage(Math.min(totalPages - 1, currentPage + 1));

  /* sync dot when user swipes / scrolls manually */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const pageWidth = container.clientWidth;
      if (pageWidth === 0) return;
      const page = Math.round(container.scrollLeft / pageWidth);
      setCurrentPage(Math.min(page, totalPages - 1));
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [totalPages]);

  return (
    <section id="vehicules" className="mx-3 sm:mx-4 mt-6 bg-white rounded-[2.5rem] overflow-hidden shadow-2xl py-20 lg:py-28">
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
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
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

        <div className="relative mx-auto mt-10 w-full">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
            </div>
          ) : filteredCars.length > 0 ? (
            <>
              {/* Left Arrow */}
              <button
                onClick={goPrev}
                disabled={currentPage === 0}
                className="hidden sm:flex absolute left-0 top-1/2 z-10 w-10 h-10 -translate-y-1/2 -translate-x-4 rounded-full items-center justify-center shadow-md border border-gray-100 bg-white hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-brand" />
              </button>

              {/* Right Arrow */}
              <button
                onClick={goNext}
                disabled={currentPage === totalPages - 1}
                className="hidden sm:flex absolute right-0 top-1/2 z-10 w-10 h-10 -translate-y-1/2 translate-x-4 rounded-full items-center justify-center shadow-md border border-gray-100 bg-white hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-brand" />
              </button>

              {/* Scrollable Track */}
              <div
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory pb-12"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {filteredCars.map((car, index) => (
                  <div
                    key={car.id}
                    className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 flex-shrink-0 snap-start px-2"
                  >
                    <CarCard car={car} index={index} />
                  </div>
                ))}
              </div>

              {/* Pagination Dots */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 -mt-4">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToPage(i)}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === currentPage ? 28 : 10,
                        height: 10,
                        backgroundColor: i === currentPage ? "#43B0E6" : "#e5e7eb",
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="mt-8 text-center text-slate-500">
              Aucun véhicule ne correspond à votre recherche.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
