"use client";

import { useRef, useState } from "react";
import { CalendarSearch, Check, KeyRound, Smartphone } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { BrandHeading, Sky } from "./Brand";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

const steps = [
  {
    title: "Choisissez",
    desc: "Vos dates et votre point de retrait : les véhicules libres s'affichent avec le prix total.",
    icon: CalendarSearch,
    perk: "Prix total affiché",
  },
  {
    title: "Réservez",
    desc: "En ligne depuis votre espace client, ou sur WhatsApp si vous préférez.",
    icon: Smartphone,
    perk: "Confirmation rapide",
  },
  {
    title: "Roulez",
    desc: "Récupérez les clés et partez l’esprit libre : assurance et assistance 24/7 incluses.",
    icon: KeyRound,
    perk: "Assistance 24/7",
  },
];

/** Part du scroll réservée au tracé du contour de la 1re carte avant que la voiture parte. */
const LEAD = 0.2;
/** Durée (en part de scroll) du tracé du contour d'une carte ; il se termine quand la voiture arrive. */
const TRACE = 0.3;

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
  // q : progression globale ; la voiture ne démarre qu'après LEAD, le temps que la 1re carte se dessine
  const q = useTransform(smooth, (v) => (reduce ? 1 : Math.min(1, Math.max(0, v))));
  const p = useTransform(q, (v) => Math.min(1, Math.max(0, (v - LEAD) / (1 - LEAD))));
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

          <ol className="grid gap-5 pt-2 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <StepCard key={s.title} s={s} i={i} p={p} q={q} rtl={rtl} />
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

function StepCard({
  s,
  i,
  p,
  q,
  rtl,
}: {
  s: (typeof steps)[number];
  i: number;
  p: MotionValue<number>;
  q: MotionValue<number>;
  rtl: boolean;
}) {
  const at = reachAt(i);
  const { t } = useLang();
  // La carte s'allume quand la voiture arrive au-dessus (re-rendu seulement au franchissement)
  const [lit, setLit] = useState(() => p.get() >= at - 0.02);
  useMotionValueEvent(p, "change", (v) => setLit(v >= at - 0.02));
  const Icon = s.icon;

  // Contour bleu qui fait le tour de la carte pendant que la voiture s'en approche
  const end = LEAD + (1 - LEAD) * at;
  const trace = useTransform(q, (v) => {
    const k = Math.min(1, Math.max(0, (v - (end - TRACE)) / TRACE));
    return `${(k * 360).toFixed(1)}deg`;
  });
  const ringBg = rtl
    ? "conic-gradient(from 0deg, transparent calc(360deg - var(--trace)), #43b0e6 0)"
    : "conic-gradient(from 0deg, #43b0e6 var(--trace), transparent 0)";

  return (
    <li className={cn("relative rounded-[28px] transition-transform duration-500 ease-out", lit && "-translate-y-1.5")}>
      <div
        className={cn(
          "group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-[28px] border-2 border-line bg-white p-7 transition-shadow duration-500 lg:p-8",
          lit ? "shadow-[0_28px_50px_-28px_rgba(46,147,204,0.7)]" : "shadow-[0_18px_40px_-32px_rgba(15,27,45,0.35)]"
        )}
      >
        {/* grand numéro en filigrane */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -bottom-14 -end-2 text-[170px] font-extrabold leading-none transition-colors duration-500",
            lit ? "text-sky/15" : "text-navy/[0.04]"
          )}
        >
          {i + 1}
        </span>

        <div className="flex items-center justify-between gap-4">
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-500",
              lit ? "bg-sky text-navy" : "bg-sky-soft text-sky-text"
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={1.9} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted">
            {t("Étape")} {String(i + 1).padStart(2, "0")}
          </span>
        </div>

        <h3 className="mt-6 text-2xl font-extrabold uppercase tracking-wide text-navy">{t(s.title)}</h3>
        <p className="relative mb-6 mt-3 text-[15px] leading-relaxed text-ink-soft">{t(s.desc)}</p>

        <span
          className={cn(
            "relative mt-auto inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors duration-500",
            lit ? "bg-navy text-white" : "bg-mist text-navy"
          )}
        >
          <Check className={cn("h-3.5 w-3.5", lit ? "text-sky" : "text-sky-text")} strokeWidth={3} />
          {t(s.perk)}
        </span>
      </div>

      {/* Anneau de 2 px posé sur la bordure, rempli en « cadran » depuis le haut */}
      <motion.span
        aria-hidden="true"
        className="trace-ring pointer-events-none absolute inset-0 rounded-[28px]"
        style={{ "--trace": trace, background: ringBg } as React.CSSProperties & Record<string, unknown>}
      />
    </li>
  );
}
