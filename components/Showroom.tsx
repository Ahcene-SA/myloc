"use client";

import { useEffect, useRef, useState } from "react";
import { easeInOut, interpolate, motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { Armchair, ArrowDown, CalendarDays, Cog } from "lucide-react";
import { apiImageUrl, fetchCars, formatTransmission, type CarFromApi } from "@/lib/api";
import { categoryInfo } from "@/lib/site";
import { useLang } from "@/lib/i18n";
import { formatPrice } from "./client/shared";

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
 * chaque voiture entre par la droite, s'arrête au centre puis repart par la gauche
 * (sens inversé en arabe). Uniquement les vraies voitures de l'API : rien n'est affiché
 * si la flotte est vide ou l'API indisponible.
 */
export function Showroom() {
  const reduce = !!useReducedMotion();
  const [cars, setCars] = useState<ShowCar[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCars()
      .then((list) => {
        if (cancelled || list.length === 0) return;
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

  if (cars.length === 0) return null;
  if (reduce) return <StaticShowroom cars={cars} />;
  return <PinnedShowroom key={cars.map((c) => c.id).join("-")} cars={cars} />;
}

function PinnedShowroom({ cars }: { cars: ShowCar[] }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: rawProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Lissage : la molette et le trackpad avancent par à-coups, le ressort les adoucit
  const scrollYProgress = useSpring(rawProgress, { stiffness: 90, damping: 26, mass: 0.35, restDelta: 0.0005 });
  const n = cars.length;
  const { t, lang } = useLang();
  // Sens de défilement : droite → gauche en français, miroir en arabe
  const dir = lang === "ar" ? -1 : 1;
  const roadX = useTransform(scrollYProgress, [0, 1], ["0%", `${-50 * dir}%`]);

  return (
    <section ref={ref} aria-label={t("La flotte en scène")} className="relative bg-navy" style={{ height: `${n * 90 + 40}vh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden text-white">
        {/* Alger au coucher du soleil en arrière-plan, assombri pour garder les voitures en vedette */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="images/decor/alger-coucher.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_40%] opacity-60 blur-[1px]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy/95 via-navy/35 to-navy" />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[38%] h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(67,176,230,0.2) 0%, rgba(67,176,230,0.06) 40%, transparent 68%)" }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:px-8 lg:pt-28">
          <p className="kicker text-sky">{t("La flotte en scène")}</p>
          <p className="mt-2 max-w-md text-sm font-semibold uppercase tracking-[0.08em] text-white/60">{t("Faites défiler pour découvrir nos modèles")}</p>
        </div>

        <div className="relative flex-1">
          {cars.map((car, i) => (
            <Slide key={car.id} car={car} i={i} n={n} dir={dir} progress={scrollYProgress} />
          ))}
        </div>

        {/* Route qui défile sous les voitures */}
        <div aria-hidden="true" className="relative h-24 overflow-hidden">
          <div className="absolute inset-x-0 top-6 h-px bg-white/10" />
          <motion.div className="absolute top-10 flex w-[200%] gap-10" style={{ x: roadX, willChange: "transform" }}>
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

function useKeys<T extends string | number>(progress: MotionValue<number>, input: number[], output: T[], eased = false) {
  const [i, o] = clampKeys(input, output);
  // Fonction (et non tableaux) : calculé en JS à chaque frame, plus fiable qu'une animation
  // accélérée par le navigateur sur une section épinglée.
  const mix = interpolate(i, o as never[], eased ? { ease: easeInOut } : undefined) as (v: number) => T;
  return useTransform(progress, (v: number) => mix(v));
}

/** Fenêtre de scroll [début, fin] où la voiture i est au centre. */
function windowOf(i: number, n: number) {
  const span = 1 / Math.max(1, n - 1);
  const c = i * span;
  return { c, span };
}

function Slide({ car, i, n, dir, progress }: { car: ShowCar; i: number; n: number; dir: number; progress: MotionValue<number>; }) {
  const { c, span } = windowOf(i, n);
  const first = i === 0;
  const last = i === n - 1;
  const vw = (v: number) => `${v * dir}vw`;

  // Fenêtres qui se chevauchent : la voiture suivante entre (c+0.25 → c+0.75)
  // pendant que la voiture courante sort, la scène n'est donc jamais vide.
  // Points d'entrée toujours croissants (sinon l'interpolation plante).
  const x = useKeys(
    progress,
    [c - span * 0.75, c - span * 0.25, c + span * 0.25, c + span * 0.75],
    [first ? vw(0) : vw(110), vw(0), vw(0), last ? vw(0) : vw(-110)],
    true
  );
  // Fondu léger en tout début d'entrée / fin de sortie (un flou animé coûte trop cher)
  const carOpacity = useKeys<number>(
    progress,
    [c - span * 0.75, c - span * 0.55, c + span * 0.55, c + span * 0.75],
    [first ? 1 : 0, 1, 1, last ? 1 : 0]
  );
  // Freinage : le capot plonge légèrement en arrivant
  const rotate = useKeys<number>(
    progress,
    [c - span * 0.4, c - span * 0.25, c - span * 0.1],
    [first ? 0 : -2 * dir, first ? 0 : 0.8 * dir, 0]
  );
  // Fondu enchaîné court des textes : la sortie (c+0.36 → c+0.52) croise brièvement
  // l'entrée de la suivante (c+0.48 → c+0.64), sans superposition prolongée des titres.
  const info = useKeys<number>(
    progress,
    [c - span * 0.52, c - span * 0.36, c + span * 0.36, c + span * 0.52],
    [first ? 1 : 0, 1, 1, last ? 1 : 0]
  );
  const infoY = useTransform(info, [0, 1], [30, 0]);
  // Bloc invisible : il ne doit pas intercepter les clics destinés au bloc visible
  const infoEvents = useTransform(info, (v) => (v > 0.5 ? "auto" : "none"));
  const wordX = useKeys(progress, [c - span, c, c + span], [`${25 * dir}%`, "0%", `${-25 * dir}%`]);

  const cat = categoryInfo[car.category?.toLowerCase()];
  const { t } = useLang();

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Nom géant en contour, derrière la voiture */}
      <motion.p
        aria-hidden="true"
        className="absolute inset-x-0 top-[6%] whitespace-nowrap text-center text-[22vw] font-extrabold uppercase leading-none text-transparent lg:text-[15vw]"
        style={{ x: wordX, opacity: info, WebkitTextStroke: "1.5px rgba(67,176,230,0.35)", willChange: "transform, opacity" }}
      >
        <bdi dir="ltr">{car.model || car.brand}</bdi>
      </motion.p>

      <motion.div className="absolute inset-x-0 top-[14%] mx-auto w-[82%] max-w-[560px] sm:top-[12%]" style={{ x, opacity: carOpacity, willChange: "transform, opacity" }}>
        <motion.div className="origin-bottom" style={{ rotate, willChange: "transform" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={car.image} alt={`${car.brand} ${car.model}`} className="w-full drop-shadow-[0_40px_30px_rgba(0,0,0,0.55)]" draggable={false} />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8"
        style={{ opacity: info, y: infoY, pointerEvents: infoEvents, willChange: "transform, opacity" }}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky">{t(cat?.label ?? car.category)}</p>
          <p className="text-4xl font-extrabold uppercase leading-none sm:text-5xl">
            <bdi dir="ltr">
              {car.brand} <span className="text-sky-gradient">{car.model}</span>
            </bdi>
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
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <p className="leading-none">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">{t("À partir de")}</span>
            <span className="mt-1 block whitespace-nowrap text-4xl font-extrabold">
              {formatPrice(car.price)}
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
                <bdi dir="ltr">
                  {car.brand} <span className="text-sky-gradient">{car.model}</span>
                </bdi>
              </p>
              <p className="text-white/60">
                {formatPrice(car.price)} / {t("jour")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
