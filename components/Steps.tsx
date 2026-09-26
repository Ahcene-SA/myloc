"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { BrandHeading, Sky } from "./Brand";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

const steps = [
  { title: "Choisissez", desc: "Vos dates et votre point de retrait : les véhicules libres s'affichent avec le prix total." },
  { title: "Réservez", desc: "En ligne depuis votre espace client, ou sur WhatsApp si vous préférez." },
  { title: "Roulez", desc: "Récupérez les clés et partez l’esprit libre : assurance et assistance 24/7 incluses." },
];

export function Steps() {
  const ref = useRef<HTMLOListElement>(null);
  const { t } = useLang();
  const reduce = !!useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const p = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0, 1]);
  // La petite voiture roule de gauche à droite sur la route (image retournée : capot vers la droite)
  const carLeft = useTransform(p, [0, 1], ["0%", "100%"]);

  return (
    <section className="overflow-hidden bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BrandHeading overline={t("Simple et rapide")}>
          {t("Réservez en")} <Sky>{t("3 étapes")}</Sky>
        </BrandHeading>

        {/* Route (grand écran) */}
        <div aria-hidden="true" className="relative mx-[16%] mt-16 hidden h-16 md:block">
          <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-mist" />
          <motion.div
            className="absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-gradient-to-r from-sky to-sky-mid"
            style={{ width: carLeft }}
          />
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
            {steps.map((s, i) => (
              <Milestone key={s.title} i={i} p={p} />
            ))}
          </div>
          <motion.div className="absolute top-1/2 w-24 -translate-x-1/2 -translate-y-[78%]" style={{ left: carLeft }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="images/cars/clio5-alpino.png" alt="" className="car-reflect w-full -scale-x-100" />
          </motion.div>
        </div>

        <ol ref={ref} className="mt-12 grid gap-4 md:mt-8 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => (
            <StepCard key={s.title} s={s} i={i} p={p} last={i === steps.length - 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function reachAt(i: number) {
  return 0.04 + (i / (steps.length - 1)) * 0.92;
}

function Milestone({ i, p }: { i: number; p: MotionValue<number> }) {
  const at = reachAt(i);
  const scale = useTransform(p, [Math.max(0, at - 0.08), at], [0.7, 1]);
  const bg = useTransform(p, [Math.max(0, at - 0.02), at], ["#e8eef5", "#43b0e6"]);
  return (
    <motion.span
      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-navy ring-4 ring-white"
      style={{ scale, backgroundColor: bg }}
    >
      {i + 1}
    </motion.span>
  );
}

function StepCard({ s, i, p, last }: { s: (typeof steps)[number]; i: number; p: MotionValue<number>; last: boolean }) {
  const at = reachAt(i);
  const opacity = useTransform(p, [Math.max(0, at - 0.25), at], [0.35, 1]);
  const y = useTransform(p, [Math.max(0, at - 0.25), at], [24, 0]);
  const { t } = useLang();
  return (
    <motion.li
      style={{ opacity, y }}
      className={cn(
        "relative flex min-h-[220px] flex-col gap-4 overflow-hidden rounded-3xl p-8",
        last ? "bg-navy text-white" : "border border-line bg-mist text-navy"
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute -right-3 -top-6 text-[140px] font-extrabold leading-none", last ? "text-white/[0.06]" : "text-navy/[0.05]")}
      >
        {i + 1}
      </span>
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold md:hidden",
          last ? "bg-sky text-navy" : "bg-white text-sky-text"
        )}
      >
        {i + 1}
      </span>
      <h3 className="text-2xl font-extrabold uppercase tracking-wide">{t(s.title)}</h3>
      <p className={cn("text-[15px] leading-relaxed", last ? "text-white/75" : "text-ink-soft")}>{t(s.desc)}</p>
    </motion.li>
  );
}
