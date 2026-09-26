"use client";

import { useEffect, useRef, useState } from "react";
import { interpolate, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Armchair, ArrowDown, CalendarDays, Cog } from "lucide-react";
import { apiImageUrl, fetchCars, formatTransmission, type CarFromApi } from "@/lib/api";
import { categoryInfo, site } from "@/lib/site";
import { useLang } from "@/lib/i18n";

interface ShowCar {
  id: string;
  brand: string;
  model: string;
  category: string;
  image: string;
  price: number;
  transmission: string;
  seats: number;
  year: number;
}

const fallback: ShowCar[] = [
  { id: "jetour", brand: "Jetour", model: "X70+", category: "suv", image: "images/cars/jetour-x70-plus.png", price: 95, transmission: "Automatique", seats: 7, year: 2025 },
  { id: "mokka", brand: "Opel", model: "Mokka", category: "suv", image: "images/cars/opel-mokka.png", price: 80, transmission: "Automatique", seats: 5, year: 2024 },
  { id: "astra", brand: "Opel", model: "Astra", category: "compacte", image: "images/cars/opel-astra.png", price: 75, transmission: "Automatique", seats: 5, year: 2024 },
  { id: "clio", brand: "Clio 5", model: "Alpino", category: "citadine", image: "images/cars/clio5-alpino.png", price: 55, transmission: "Automatique", seats: 5, year: 2024 },
];

function fromApi(c: CarFromApi): ShowCar {
  const [brand, ...rest] = c.name.trim().split(/\s+/);
  return {
    id: String(c.id),
    brand,
    model: rest.join(" "),
    category: c.category,
    image: apiImageUrl(c.image_url),
    price: parseFloat(String(c.price_per_day)) || 0,
    transmission: formatTransmission(c.transmission),
    seats: c.seats,
    year: c.year,
  };
}

/**
 * « La flotte en scène » : section épinglée où, au fil du scroll,
 * chaque voiture entre par la droite, s'arrête au centre puis repart par la gauche.
 */
export function Showroom() {
  const reduce = !!useReducedMotion();
  const [cars, setCars] = useState<ShowCar[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    fetchCars()
      .then((list) => {
        if (cancelled || list.length < 2) return;
        // Les plus « premium » d'abord, 5 au maximum
        const picked = [...list]
          .sort((a, b) => (parseFloat(String(b.price_per_day)) || 0) - (parseFloat(String(a.price_per_day)) || 0))
          .slice(0, 5)
          .map(fromApi);
        setCars(picked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (reduce) return <StaticShowroom cars={cars} />;
  return <PinnedShowroom key={cars.map((c) => c.id).join("-")} cars={cars} />;
}

function PinnedShowroom({ cars }: { cars: ShowCar[] }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const n = cars.length;
  const roadX = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);
  const { t } = useLang();

  return (
    <section ref={ref} aria-label={t("La flotte en scène")} className="relative bg-navy" style={{ height: `${n * 90 + 40}vh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden text-white">
        <div aria-hidden="true" className="absolute left-1/2 top-[38%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky/15 blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:px-8 lg:pt-28">
          <p className="kicker text-sky">{t("La flotte en scène")}</p>
          <p className="mt-2 max-w-md text-sm font-semibold uppercase tracking-[0.08em] text-white/60">{t("Faites défiler pour découvrir nos modèles")}</p>
        </div>

        <div className="relative flex-1">
          {cars.map((car, i) => (
            <Slide key={car.id} car={car} i={i} n={n} progress={scrollYProgress} />
          ))}
        </div>

        {/* Route qui défile sous les voitures */}
        <div aria-hidden="true" className="relative h-24 overflow-hidden">
          <div className="absolute inset-x-0 top-6 h-px bg-white/10" />
          <motion.div className="absolute top-10 flex w-[200%] gap-10" style={{ x: roadX }}>
            {Array.from({ length: 40 }, (_, k) => (
              <span key={k} className="h-1 w-16 flex-shrink-0 rounded-full bg-white/15" />
            ))}
          </motion.div>
        </div>

        {/* Progression */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {cars.map((car, i) => (
            <Dot key={car.id} i={i} n={n} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Borne les points d'entrée à [0, 1] (exigé par l'animation accélérée du navigateur)
 * en gardant la bonne valeur aux extrémités.
 */
function clampKeys<T>(input: number[], output: T[]): [number[], T[]] {
  const inp: number[] = [];
  const out: T[] = [];
  input.forEach((v, k) => {
    const c = Math.min(1, Math.max(0, v));
    if (inp.length && c <= inp[inp.length - 1]) {
      if (c === 0) out[out.length - 1] = output[k]; // plusieurs points à 0 : on garde le dernier
      return; // plusieurs points à 1 : on garde le premier
    }
    inp.push(c);
    out.push(output[k]);
  });
  if (inp.length === 1) {
    inp.push(1);
    out.push(out[0]);
  }
  return [inp, out];
}

function useKeys<T extends string | number>(progress: MotionValue<number>, input: number[], output: T[]) {
  const [i, o] = clampKeys(input, output);
  // Fonction (et non tableaux) : calculé en JS à chaque frame, plus fiable qu'une animation
  // accélérée par le navigateur sur une section épinglée.
  const mix = interpolate(i, o as never[]) as (v: number) => T;
  return useTransform(progress, (v: number) => mix(v));
}

/** Fenêtre de scroll [début, fin] où la voiture i est au centre. */
function windowOf(i: number, n: number) {
  const span = 1 / Math.max(1, n - 1);
  const c = i * span;
  return { c, span };
}

function Slide({ car, i, n, progress }: { car: ShowCar; i: number; n: number; progress: MotionValue<number> }) {
  const { c, span } = windowOf(i, n);
  const first = i === 0;
  const last = i === n - 1;

  const x = useKeys(
    progress,
    [c - span * 0.5, c - span * 0.18, c + span * 0.18, c + span * 0.5],
    [first ? "0vw" : "120vw", "0vw", "0vw", last ? "0vw" : "-120vw"]
  );
  const blur = useKeys(
    progress,
    [c - span * 0.55, c - span * 0.2, c + span * 0.2, c + span * 0.55],
    [first ? "blur(0px)" : "blur(6px)", "blur(0px)", "blur(0px)", last ? "blur(0px)" : "blur(6px)"]
  );
  // Freinage : le capot plonge légèrement en arrivant
  const rotate = useKeys<number>(progress, [c - span * 0.2, c - span * 0.1, c], [first ? 0 : -2, first ? 0 : 0.8, 0]);
  const info = useKeys<number>(
    progress,
    [c - span * 0.35, c - span * 0.12, c + span * 0.12, c + span * 0.35],
    [first ? 1 : 0, 1, 1, last ? 1 : 0]
  );
  const infoY = useTransform(info, [0, 1], [30, 0]);
  const wordX = useKeys(progress, [c - span, c, c + span], ["25%", "0%", "-25%"]);

  const cat = categoryInfo[car.category?.toLowerCase()];
  const { t } = useLang();

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Nom géant en contour, derrière la voiture */}
      <motion.p
        aria-hidden="true"
        className="absolute inset-x-0 top-[6%] whitespace-nowrap text-center text-[22vw] font-extrabold uppercase leading-none text-transparent lg:text-[15vw]"
        style={{ x: wordX, opacity: info, WebkitTextStroke: "1.5px rgba(67,176,230,0.35)" }}
      >
        {car.model || car.brand}
      </motion.p>

      <motion.div className="absolute inset-x-0 top-[14%] mx-auto w-[82%] max-w-[560px] sm:top-[12%]" style={{ x, filter: blur }}>
        <motion.div className="origin-bottom" style={{ rotate }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={car.image} alt={`${car.brand} ${car.model}`} className="w-full drop-shadow-[0_40px_30px_rgba(0,0,0,0.55)]" draggable={false} />
        </motion.div>
      </motion.div>

      <motion.div
        className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8"
        style={{ opacity: info, y: infoY }}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky">{t(cat?.label ?? car.category)}</p>
          <p className="text-4xl font-extrabold uppercase leading-none sm:text-5xl">
            {car.brand} <span className="text-sky-gradient">{car.model}</span>
          </p>
          <ul className="mt-3 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wide text-white/70">
            <li className="flex items-center gap-1.5">
              <Cog className="h-4 w-4 text-sky" /> {t(car.transmission)}
            </li>
            <li className="flex items-center gap-1.5">
              <Armchair className="h-4 w-4 text-sky" /> {car.seats} {t("places")}
            </li>
            <li className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-sky" /> {car.year}
            </li>
          </ul>
        </div>
        <div className="flex items-center gap-5">
          <p className="leading-none">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">{t("À partir de")}</span>
            <span className="mt-1 block text-4xl font-extrabold">
              {car.price} {site.currency}
              <span className="ms-1 text-sm font-semibold text-white/50">/ {t("jour")}</span>
            </span>
          </p>
          <a
            href="#vehicules"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-sky px-5 text-sm font-bold text-navy transition-colors hover:bg-white"
          >
            {t("Réserver")} <ArrowDown className="h-4 w-4" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}

function Dot({ i, n, progress }: { i: number; n: number; progress: MotionValue<number> }) {
  const { c, span } = windowOf(i, n);
  const width = useKeys<number>(progress, [c - span * 0.5, c, c + span * 0.5], [8, 32, 8]);
  const opacity = useKeys<number>(progress, [c - span * 0.5, c, c + span * 0.5], [0.35, 1, 0.35]);
  return <motion.span className="h-2 rounded-full bg-sky" style={{ width, opacity }} />;
}

/** Version sans animation (réglage « réduire les animations » du téléphone). */
function StaticShowroom({ cars }: { cars: ShowCar[] }) {
  const { t } = useLang();
  return (
    <section aria-label={t("La flotte en scène")} className="bg-navy py-20 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="kicker text-sky">{t("La flotte en scène")}</p>
        <div className="no-scrollbar mt-8 flex gap-6 overflow-x-auto pb-4">
          {cars.map((car) => (
            <div key={car.id} className="w-72 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={car.image} alt={`${car.brand} ${car.model}`} className="w-full" />
              <p className="mt-3 text-2xl font-extrabold uppercase">
                {car.brand} <span className="text-sky-gradient">{car.model}</span>
              </p>
              <p className="text-white/60">
                {car.price} {site.currency} / {t("jour")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
