"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { BrandHeading, Sky } from "./Brand";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

const steps = [
  { title: "Choisissez", desc: "Vos dates et votre point de retrait : les véhicules libres s'affichent avec le prix total." },
  { title: "Réservez", desc: "En ligne depuis votre espace client, ou sur WhatsApp si vous préférez." },
  { title: "Roulez", desc: "Récupérez les clés et partez l’esprit libre : assurance et assistance 24/7 incluses." },
];

/** Position de l'étape i sur la route (0 = 1re carte, 1 = dernière). */
const reachAt = (i: number) => i / (steps.length - 1);

// La route va du centre de la 1re carte au centre de la 3e (grille de 3 colonnes, espace de 1,5 rem).
const trackInset = "calc((100% - 3rem) / 6)";

export function Steps() {
  const ref = useRef<HTMLDivElement>(null);
  const { t, dir } = useLang();
  const rtl = dir === "rtl";
  const reduce = !!useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 70%"] });
  // Ressort : la voiture glisse au lieu de suivre les à-coups de la molette
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.4, restDelta: 0.0005 });
  const p = useTransform(smooth, (v) => (reduce ? 1 : Math.min(1, Math.max(0, v))));
  // Tout passe par des transformations (accélérées par la carte graphique), jamais par left/width
  const carX = useTransform(p, (v) => `${(rtl ? -v : v) * 100}%`);

  return (
    <section className="overflow-hidden bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BrandHeading overline={t("Simple et rapide")}>
          {t("Réservez en")} <Sky>{t("3 étapes")}</Sky>
        </BrandHeading>

        <div ref={ref} className="relative mt-14 md:mt-16">
          {/* Route alignée sur le centre des cartes (grand écran) */}
          <div aria-hidden="true" className="relative mb-6 hidden h-16 md:block">
            <div className="absolute inset-y-0" style={{ left: trackInset, right: trackInset }}>
              <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-mist" />
              <motion.div
                className={cn(
                  "absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-gradient-to-r from-sky to-sky-mid",
                  rtl ? "origin-right" : "origin-left"
                )}
                style={{ scaleX: p, willChange: "transform" }}
              />
              {steps.map((s, i) => (
                <Milestone key={s.title} i={i} p={p} rtl={rtl} />
              ))}
              {/* Voiture : un calque de la largeur de la route, déplacé de 0 à 100 % */}
              <motion.div className="absolute inset-0" style={{ x: carX, willChange: "transform" }}>
                <div className={cn("absolute top-1/2 w-20 -translate-y-[80%]", rtl ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="images/cars/clio5-alpino.png"
                    alt=""
                    className={cn("block w-full drop-shadow-[0_8px_6px_rgba(15,27,45,0.25)]", !rtl && "-scale-x-100")}
                    draggable={false}
                  />
                </div>
              </motion.div>
            </div>
          </div>

          <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <StepCard key={s.title} s={s} i={i} p={p} last={i === steps.length - 1} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Milestone({ i, p, rtl }: { i: number; p: MotionValue<number>; rtl: boolean }) {
  const at = reachAt(i);
  const lit = useTransform<number, number>(p, (v) => (v >= at - 0.02 ? 1 : 0));
  const scale = useSpring(useTransform(lit, [0, 1], [0.8, 1.1]), { stiffness: 300, damping: 18 });
  const bg = useTransform(lit, [0, 1], ["#e8eef5", "#43b0e6"]);
  return (
    <span
      className="absolute top-1/2 z-10"
      style={rtl ? { right: `${at * 100}%`, transform: "translate(50%, -50%)" } : { left: `${at * 100}%`, transform: "translate(-50%, -50%)" }}
    >
      <motion.span
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-navy ring-4 ring-white transition-colors duration-300"
        style={{ scale, backgroundColor: bg }}
      >
        {i + 1}
      </motion.span>
    </span>
  );
}

function StepCard({ s, i, p, last }: { s: (typeof steps)[number]; i: number; p: MotionValue<number>; last: boolean }) {
  const at = reachAt(i);
  const { t } = useLang();
  // Carte « atteinte » quand la voiture arrive au-dessus : bordure bleue et légère montée
  const lit = useTransform<number, number>(p, (v) => (v >= at - 0.02 ? 1 : 0));
  const y = useSpring(useTransform(lit, [0, 1], [0, -6]), { stiffness: 260, damping: 22 });
  const borderColor = useTransform(lit, [0, 1], [last ? "rgba(15,27,45,1)" : "rgba(221,229,238,1)", "rgba(67,176,230,1)"]);
  const shadow = useTransform(lit, [0, 1], ["0 0 0 0 rgba(67,176,230,0)", "0 22px 40px -24px rgba(67,176,230,0.55)"]);

  return (
    <motion.li
      style={{ y, borderColor, boxShadow: shadow, willChange: "transform" }}
      className={cn(
        "relative flex min-h-[220px] flex-col gap-4 overflow-hidden rounded-3xl border-2 p-8 transition-[border-color,box-shadow] duration-500",
        last ? "bg-navy text-white" : "bg-mist text-navy"
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute -end-3 -top-6 text-[140px] font-extrabold leading-none", last ? "text-white/[0.06]" : "text-navy/[0.05]")}
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
