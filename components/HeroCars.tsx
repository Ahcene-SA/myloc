"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

interface HeroCar {
  src: string;
  alt: string;
  className: string;
  delay: number;
  /** Profondeur : plus c'est grand, plus la voiture bouge avec la souris */
  depth: number;
}

// Les voitures sont photographiées de 3/4 avant, capot à gauche : elles arrivent par la droite.
const cars: HeroCar[] = [
  { src: "images/cars/renault-captur.png", alt: "Renault Captur", className: "z-0 -mr-[14%] w-[42%] max-w-[300px]", delay: 0.55, depth: 10 },
  { src: "images/cars/jetour-x70-plus.png", alt: "Jetour X70 Plus", className: "z-10 w-[56%] max-w-[400px]", delay: 0.2, depth: 18 },
  { src: "images/cars/clio5-alpino.png", alt: "Renault Clio 5 Alpino", className: "z-20 -ml-[16%] w-[42%] max-w-[300px]", delay: 0.8, depth: 26 },
];

/** Traînées de vitesse derrière une voiture pendant son arrivée. */
function SpeedLines({ delay }: { delay: number }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-y-[30%] -right-[20%] left-[60%]">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute right-0 h-[3px] rounded-full bg-gradient-to-l from-transparent via-sky to-sky/0"
          style={{ top: `${15 + i * 22}%`, width: `${70 - i * 12}%` }}
          initial={{ opacity: 0, scaleX: 0.2, x: 0 }}
          animate={{ opacity: [0, 0.9, 0], scaleX: [0.2, 1, 0.4], x: [0, -30, -60] }}
          transition={{ duration: 1.1, delay: delay + 0.05 + i * 0.04, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

/** Deux phares qui s'allument une fois le SUV arrêté (positions calées sur la photo). */
function Headlights({ delay }: { delay: number }) {
  const spots = [
    { left: "4%", top: "41%", size: "18%" },
    { left: "35%", top: "41%", size: "16%" },
  ];
  return (
    <>
      {spots.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute z-30 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(190,230,255,0.55) 25%, rgba(67,176,230,0) 70%)",
          }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0.3, 1, 0.55], scale: [0.4, 1.3, 0.9, 1.2, 1] }}
          transition={{ duration: 1.2, delay, times: [0, 0.2, 0.4, 0.6, 1] }}
        />
      ))}
      {/* faisceau vers l'avant (à gauche) */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute right-[62%] top-[30%] z-0 h-[26%] w-[70%] origin-right rounded-l-full"
        style={{ background: "linear-gradient(to left, rgba(190,230,255,0.55), rgba(190,230,255,0))", filter: "blur(10px)" }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: [0, 0.8, 0.35], scaleX: [0, 1, 1] }}
        transition={{ duration: 1.4, delay: delay + 0.1 }}
      />
    </>
  );
}

export function HeroCars({ scrollYProgress, reduce }: { scrollYProgress: MotionValue<number>; reduce: boolean }) {
  // Parallaxe au scroll
  const stageY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -70]);
  const stageScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.12]);
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -30]);

  // Parallaxe à la souris (ordinateur uniquement)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const tilt = useTransform(sx, [-1, 1], [4, -4]);

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, mx, my]);

  // Une fois les voitures arrivées, on passe en « ralenti » (légère respiration)
  const [parked, setParked] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const t = window.setTimeout(() => setParked(true), 2300);
    return () => window.clearTimeout(t);
  }, [reduce]);

  return (
    <div className="relative h-[280px] [perspective:1200px] sm:h-[380px] lg:h-[500px]">
      {/* Horizon méditerranéen : soleil pâle, mer qui ondule, mouettes */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-12%] bottom-4 h-[88%]"
        style={{
          y: sceneY,
          // bords fondus : la scène se perd dans le décor
          maskImage: "radial-gradient(ellipse 50% 60% at 50% 50%, #000 55%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 50% 60% at 50% 50%, #000 55%, transparent 100%)",
        }}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8, ease }}
      >
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" className="h-full w-full overflow-visible">
          <defs>
            <radialGradient id="med-sun-glow">
              <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.55" />
              <stop offset="0.45" stopColor="#ffe6c2" stopOpacity="0.25" />
              <stop offset="1" stopColor="#ffe6c2" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="med-sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#43b0e6" stopOpacity="0.26" />
              <stop offset="1" stopColor="#43b0e6" stopOpacity="0.04" />
            </linearGradient>
            <clipPath id="med-sky">
              <rect x="-200" y="0" width="1200" height="262" />
            </clipPath>
          </defs>

          <g transform="translate(0 -85)">
          {/* soleil qui se lève sur l'horizon */}
          <g clipPath="url(#med-sky)">
            <circle cx="400" cy="262" r="210" fill="url(#med-sun-glow)" />
            <circle className="med-sun" cx="400" cy="262" r="78" fill="#fff1d9" fillOpacity="0.75" />
          </g>

          {/* mer */}
          <rect x="-200" y="262" width="1200" height="230" fill="url(#med-sea)" />
          <line x1="-200" y1="262" x2="1000" y2="262" stroke="#43b0e6" strokeOpacity="0.35" strokeWidth="1.2" />
          {/* reflet du soleil */}
          <g fill="#fff6e6" fillOpacity="0.7">
            <rect x="350" y="270" width="100" height="3" rx="1.5" />
            <rect x="366" y="282" width="68" height="3" rx="1.5" />
            <rect x="380" y="296" width="40" height="3" rx="1.5" />
            <rect x="390" y="312" width="20" height="3" rx="1.5" />
          </g>
          {/* vagues qui ondulent (trois vitesses) */}
          <g fill="none" strokeLinecap="round">
            <path className="med-wave med-wave-1" d="M0 275 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0 q30.0 -3 60.0 0 t60.0 0" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.6" transform="translate(-460 0)" />
            <path className="med-wave med-wave-2" d="M0 300 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0 q40.0 -4 80.0 0 t80.0 0" stroke="#43b0e6" strokeOpacity="0.28" strokeWidth="1.6" transform="translate(-460 0)" />
            <path className="med-wave med-wave-3" d="M0 335 q50.0 -5 100.0 0 t100.0 0 q50.0 -5 100.0 0 t100.0 0 q50.0 -5 100.0 0 t100.0 0 q50.0 -5 100.0 0 t100.0 0 q50.0 -5 100.0 0 t100.0 0 q50.0 -5 100.0 0 t100.0 0 q50.0 -5 100.0 0 t100.0 0 q50.0 -5 100.0 0 t100.0 0 q50.0 -5 100.0 0 t100.0 0" stroke="#43b0e6" strokeOpacity="0.2" strokeWidth="2" transform="translate(-460 0)" />
          </g>

          {/* mouettes */}
          <g fill="none" stroke="#0b1f3a" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path className="med-gull" d="M250 120 q9 -9 18 0 q9 -9 18 0" />
            <path className="med-gull med-gull-2" d="M300 92 q6 -6 12 0 q6 -6 12 0" />
          </g>
          </g>
        </svg>
      </motion.div>
      <motion.div className="absolute inset-x-0 bottom-10 sm:bottom-14" style={{ y: stageY, scale: stageScale, rotateY: tilt }}>
        {/* ombre au sol */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-[12%] -bottom-2 h-6 rounded-[50%] bg-navy/20 blur-xl"
          initial={reduce ? false : { opacity: 0, scaleX: 0.3 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.6, delay: 0.3, ease }}
        />
        <div className="flex items-end justify-center">
          {cars.map((car) => (
            <CarLayer key={car.src} car={car} reduce={reduce} parked={parked} sx={sx} sy={sy} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function CarLayer({
  car,
  reduce,
  parked,
  sx,
  sy,
}: {
  car: HeroCar;
  reduce: boolean;
  parked: boolean;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
}) {
  const x = useTransform(sx, [-1, 1], [-car.depth, car.depth]);
  const y = useTransform(sy, [-1, 1], [-car.depth * 0.35, car.depth * 0.35]);
  const isHero = car.src.includes("jetour");
  const arrive = 1.35;

  return (
    <motion.div className={`relative ${car.className}`} style={{ x, y }}>
      {/* arrivée depuis la droite + freinage (le capot plonge puis se relève) */}
      <motion.div
        className="relative origin-bottom"
        initial={reduce ? false : { x: "140%", opacity: 0, filter: "blur(8px)" }}
        animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: arrive, delay: car.delay, ease }}
      >
        <motion.div
          className="origin-bottom"
          initial={false}
          animate={reduce ? undefined : parked ? { y: [0, -1.5, 0] } : { rotate: [0, 0, -1.6, 0.6, 0] }}
          transition={
            parked
              ? { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: car.delay }
              : { duration: arrive + 0.6, delay: car.delay, times: [0, 0.6, 0.72, 0.86, 1] }
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={car.src}
            alt={car.alt}
            className="car-reflect relative block w-full"
            fetchPriority={isHero ? "high" : undefined}
            draggable={false}
          />
          {isHero && !reduce && <Headlights delay={car.delay + arrive + 0.1} />}
        </motion.div>
        {!reduce && <SpeedLines delay={car.delay} />}
      </motion.div>
    </motion.div>
  );
}
