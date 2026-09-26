"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { PointerEvent, ReactNode } from "react";
import { BadgeEuro, Timer, Headphones, Sparkles, Gauge, CalendarX2 } from "lucide-react";
import { BrandHeading, PalmShadow, Sky } from "./Brand";

const features = [
  { icon: BadgeEuro, title: "Prix transparents", desc: "Pas de frais cachés. Le prix affiché est le prix final, avec assurance et assistance incluses." },
  { icon: Timer, title: "Réservation rapide", desc: "Réservez votre voiture en moins de 2 minutes, 24h/24 et 7j/7." },
  { icon: Headphones, title: "Assistance 24/7", desc: "Notre équipe reste à votre disposition à toute heure pour vous accompagner sur la route." },
  { icon: Sparkles, title: "Véhicules récents", desc: "Flotte constamment renouvelée, entretenue et nettoyée avant chaque location." },
  { icon: Gauge, title: "Kilométrage illimité", desc: "Roulez sans compter avec nos options de kilométrage illimité sur de nombreux véhicules." },
  { icon: CalendarX2, title: "Annulation flexible", desc: "Modifiez ou annulez votre réservation gratuitement jusqu’à 24h avant le départ." },
];

/** Carte qui s'incline légèrement vers la souris (effet 3D). */
function Tilt({ children, className, delay }: { children: ReactNode; className: string; delay: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 200, damping: 20 });
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    mx.set(0);
    my.set(0);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="avantages" className="bg-brand-mist relative overflow-hidden py-20 lg:py-28">
      <PalmShadow className="-left-28 top-10 w-[480px] opacity-[0.14]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BrandHeading overline="Pourquoi choisir MYLOC.DZ" align="center">
          L&apos;expérience <Sky>MYLOC</Sky>
        </BrandHeading>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <Tilt
              key={title}
              delay={(i % 3) * 0.08}
              className="group flex flex-col gap-4 rounded-3xl border border-line bg-white p-7 transition-colors hover:border-sky/60"
            >
              <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-sky-soft text-sky-text transition-colors group-hover:bg-sky group-hover:text-navy">
                <Icon className="h-6 w-6" strokeWidth={1.9} />
              </span>
              <h3 className="text-base font-extrabold uppercase tracking-[0.06em] text-navy">{title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-soft">{desc}</p>
            </Tilt>
          ))}
        </div>
      </div>
    </section>
  );
}
