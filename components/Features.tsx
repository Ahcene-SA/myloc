"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { PointerEvent, ReactNode } from "react";
import { Baby, Headphones, Map as MapIcon, MapPin, Plane, Sparkles } from "lucide-react";
import { BrandHeading, PalmShadow, Sky } from "./Brand";
import { useLang } from "@/lib/i18n";

const features = [
  { icon: MapPin, title: "Agence basée à Alger", desc: "Notre agence de Birkhadem vous accueille et prépare votre véhicule avant chaque départ." },
  { icon: Plane, title: "Livraison aux aéroports", desc: "Votre voiture vous attend à votre arrivée, dans plusieurs aéroports d'Algérie." },
  { icon: MapIcon, title: "Livraison dans plusieurs wilayas", desc: "Nous livrons votre véhicule là où vous en avez besoin, à domicile ou à l'hôtel." },
  { icon: Sparkles, title: "Véhicules récents", desc: "Des modèles 2025 et 2026, entretenus et nettoyés avant chaque location." },
  { icon: Baby, title: "Siège bébé et cosy offerts", desc: "Voyagez en famille : sièges bébé et cosy disponibles gratuitement sur demande." },
  { icon: Headphones, title: "Assistance réactive", desc: "Une équipe joignable par téléphone et WhatsApp pour vous accompagner sur la route." },
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
  const { t } = useLang();
  return (
    <section id="avantages" className="bg-brand-mist relative overflow-hidden py-20 lg:py-28">
      <PalmShadow className="-left-28 top-10 w-[480px] opacity-[0.14]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BrandHeading overline={t("Pourquoi choisir MYLOC.DZ")} align="center">
          {t("L'expérience")} <Sky>MYLOC</Sky>
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
              <h3 className="text-base font-extrabold uppercase tracking-[0.06em] text-navy">{t(title)}</h3>
              <p className="text-[15px] leading-relaxed text-ink-soft">{t(desc)}</p>
            </Tilt>
          ))}
        </div>
      </div>
    </section>
  );
}
