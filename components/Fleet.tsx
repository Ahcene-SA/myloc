"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, X } from "lucide-react";
import { CarCard, type Car } from "./CarCard";
import { cn } from "@/lib/utils";
import { fetchAvailableCars, fetchCars, fetchPricingRules, mapApiCarToCar, type AvailableCar, type PricingRules } from "@/lib/api";
import { AVAILABILITY_EVENT, saveBookingIntent, type AvailabilitySearch } from "@/lib/booking";
import { pageUrl } from "@/lib/routes";
import { FILTER_EVENT, categoryInfo } from "@/lib/site";
import { BlueBar, PalmShadow } from "./Brand";
import { dateLocale, translate, useLang } from "@/lib/i18n";

const fallbackCars: Car[] = [
  {
    id: "clio5-alpino",
    name: "Clio 5 Alpino",
    category: "citadine",
    image: "images/cars/clio5-alpino.png",
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
    image: "images/cars/clio5-techno.png",
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
    image: "images/cars/citroen-c3.png",
    price: 48,
    priceUnit: "jour",
    transmission: "Manuelle",
    seats: 5,
    year: 2024,
  },
  {
    id: "opel-astra",
    name: "Opel Astra",
    category: "compacte",
    image: "images/cars/opel-astra.png",
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
    image: "images/cars/opel-mokka.png",
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
    image: "images/cars/renault-captur.png",
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
    image: "images/cars/jetour-x70-plus.png",
    price: 95,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 7,
    year: 2025,
    featured: true,
  },
];

export function Fleet() {
  const { t } = useLang();
  const [activeCategory, setActiveCategory] = useState("all");
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  // Recherche par dates depuis l'accueil
  const [search, setSearch] = useState<AvailabilitySearch | null>(null);
  const [free, setFree] = useState<AvailableCar[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [rules, setRules] = useState<PricingRules | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPricingRules()
      .then((r) => !cancelled && setRules(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (cat === "all" || cat in categoryInfo) setActiveCategory(cat);
    };
    window.addEventListener(FILTER_EVENT, onFilter);
    return () => window.removeEventListener(FILTER_EVENT, onFilter);
  }, []);

  // Recherche de disponibilités envoyée par le Hero
  useEffect(() => {
    const onSearch = (e: Event) => {
      const q = (e as CustomEvent<AvailabilitySearch>).detail;
      setSearch(q);
      setSearching(true);
      setSearchError("");
      setActiveCategory(q.category in categoryInfo ? q.category : "all");
      fetchAvailableCars(q.start, q.end)
        .then((list) => setFree(list))
        .catch((err) => {
          setFree(null);
          setSearchError(err instanceof Error ? err.message : translate("Impossible de vérifier les disponibilités."));
        })
        .finally(() => setSearching(false));
    };
    window.addEventListener(AVAILABILITY_EVENT, onSearch);
    return () => window.removeEventListener(AVAILABILITY_EVENT, onSearch);
  }, []);

  const clearSearch = () => {
    setSearch(null);
    setFree(null);
    setSearchError("");
  };

  const quotes = useMemo(() => {
    const m = new Map<string, AvailableCar>();
    free?.forEach((c) => m.set(String(c.id), c));
    return m;
  }, [free]);

  const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
  const quoteLabel = search ? t("Du {start} au {end}", { start: shortDate(search.start), end: shortDate(search.end) }) : "";

  const book = (carId: string) => {
    if (!search) return;
    saveBookingIntent({
      carId: Number(carId),
      start: search.start,
      end: search.end,
      pickupPlace: search.pickupPlace,
      pickupAddress: search.pickupAddress,
      returnPlace: search.returnPlace,
      returnAddress: search.returnAddress,
    });
    window.location.assign(pageUrl("client"));
  };

  // Pendant une recherche par dates : uniquement les véhicules libres
  const pool = useMemo(
    () => (search && free ? free.map((c) => ({ ...mapApiCarToCar(c) })) : cars),
    [search, free, cars]
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: pool.length };
    pool.forEach((c) => {
      const k = c.category?.toLowerCase();
      out[k] = (out[k] ?? 0) + 1;
    });
    return out;
  }, [pool]);

  // Onglets : uniquement les catégories présentes dans la flotte.
  const categories = useMemo(
    () => [
      { id: "all", label: "Tous" },
      ...Object.entries(categoryInfo)
        .filter(([id]) => (counts[id] ?? 0) > 0 || id === activeCategory)
        .map(([id, c]) => ({ id, label: c.plural })),
    ],
    [counts, activeCategory]
  );

  const active = categoryInfo[activeCategory];

  const filteredCars = useMemo(
    () => (activeCategory === "all" ? pool : pool.filter((car) => car.category?.toLowerCase() === activeCategory)),
    [activeCategory, pool]
  );

  return (
    <section id="vehicules" className="relative overflow-hidden bg-white py-20 lg:py-28">
      <PalmShadow flip className="-right-40 -top-20 w-[520px] opacity-[0.12]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="kicker text-navy/80">{t("Notre sélection de")}</span>
          <h2
            key={activeCategory}
            className="fade-up text-sky-gradient text-5xl font-extrabold uppercase leading-none tracking-[-0.01em] sm:text-6xl lg:text-[84px]"
          >
            {active ? t(active.plural) : t("Véhicules")}
          </h2>
          <BlueBar />
          <p className="max-w-md text-sm font-semibold uppercase tracking-[0.08em] text-ink-soft sm:text-[15px]">
            {active ? t(active.tagline) : t("Citadines, compactes et SUV récents, entretenus avant chaque location")}
          </p>
        </div>

        {rules && rules.duration.length > 0 && (
          <p className="mx-auto mt-6 flex w-fit flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-emerald-800">
            <span aria-hidden="true">%</span>
            {t("Remise automatique :")}{" "}
            {rules.duration.map((r) => t("-{percent} % dès {days} jours", { percent: r.percent, days: r.min_days })).join(" · ")}
          </p>
        )}

        {search && (
          <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center justify-between gap-3 rounded-3xl border-2 border-sky bg-sky-soft/60 px-5 py-4 text-navy sm:flex-row">
            <p className="flex items-center gap-3 text-sm font-semibold">
              <CalendarCheck2 className="h-5 w-5 flex-shrink-0 text-sky-text" />
              <span>
                <strong className="font-extrabold">{quoteLabel}</strong>
                {searching
                  ? ` · ${t("recherche des véhicules libres…")}`
                  : searchError
                    ? ` · ${searchError}`
                    : free
                      ? ` · ${t(free.length > 1 ? "{count} véhicules libres" : "{count} véhicule libre", { count: free.length })}${
                          cars.length > free.length ? t(", {count} déjà pris", { count: cars.length - free.length }) : ""
                        }`
                      : ""}
              </span>
            </p>
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-bold uppercase tracking-wide text-navy hover:bg-navy hover:text-white"
            >
              <X className="h-3.5 w-3.5" /> {t("Toute la flotte")}
            </button>
          </div>
        )}

        <div
          className="no-scrollbar -mx-4 mt-10 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:justify-center sm:px-0"
          role="group"
          aria-label={t("Filtrer par catégorie")}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                aria-pressed={isActive}
                className={cn(
                  "flex h-11 flex-shrink-0 items-center gap-2 rounded-full border-2 px-5 text-[13px] font-bold uppercase tracking-[0.1em] transition-colors",
                  isActive ? "border-navy bg-navy text-white" : "border-line text-navy hover:border-navy"
                )}
              >
                {t(cat.label)}
                <span className={cn("text-[11px]", isActive ? "text-sky" : "text-muted")}>{counts[cat.id] ?? 0}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-12">
          {loading || searching ? (
            <div className="flex h-72 items-center justify-center" role="status" aria-label={t("Chargement des véhicules")}>
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-line border-t-sky" />
            </div>
          ) : filteredCars.length > 0 ? (
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCars.map((car, index) => (
                <div key={car.id} className="w-[80%] flex-shrink-0 snap-start sm:w-auto">
                  <CarCard
                    car={car}
                    index={index}
                    quote={
                      search && quotes.has(car.id)
                        ? {
                            days: quotes.get(car.id)!.days,
                            total: Number(quotes.get(car.id)!.total_price),
                            base: Number(quotes.get(car.id)!.base_price),
                            discountLabel: quotes.get(car.id)!.discount_label,
                            label: quoteLabel,
                          }
                        : undefined
                    }
                    onBook={() => book(car.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center font-semibold text-muted">
              {search && free
                ? t("Aucun véhicule libre dans cette catégorie sur ces dates. Essayez d'autres dates ou une autre catégorie.")
                : t("Aucun véhicule dans cette catégorie pour le moment.")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
