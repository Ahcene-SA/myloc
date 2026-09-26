"use client";

import { motion } from "framer-motion";
import { Wave, Zellige } from "./Zellige";

const features = [
  { title: "Prix transparents", desc: "Pas de frais cachés. Le prix affiché est le prix final, avec assurance et assistance incluses." },
  { title: "Réservation rapide", desc: "Réservez votre voiture en moins de 2 minutes, 24h/24 et 7j/7, directement en ligne." },
  { title: "Assistance 24/7", desc: "Notre équipe reste à votre disposition à toute heure pour vous accompagner sur la route." },
  { title: "Véhicules récents", desc: "Flotte constamment renouvelée, entretenue et nettoyée avant chaque location." },
  { title: "Kilométrage illimité", desc: "Roulez sans compter avec nos options de kilométrage illimité sur de nombreux véhicules." },
  { title: "Annulation flexible", desc: "Modifiez ou annulez votre réservation gratuitement jusqu’à 24h avant le départ." },
];

export function Features() {
  return (
    <div>
      <Wave />
      <section id="avantages" className="relative overflow-hidden bg-sea py-16 text-sand lg:py-24">
        <Zellige size={72} color="#F3E9DA" withDot className="opacity-[0.12]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[400px_1fr] lg:gap-24 lg:px-8">
          <div className="flex flex-col gap-5">
            <span className="eyebrow text-terra-light">Pourquoi MYLOC</span>
            <h2 className="font-display text-[40px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              L&apos;hospitalité <span className="font-normal italic">algérienne,</span> au volant.
            </h2>
            <p className="text-base leading-relaxed text-sea-soft lg:text-lg">
              Nous simplifions la location de voiture pour que vous puissiez vous concentrer sur l&apos;essentiel : votre
              voyage.
            </p>
          </div>

          <div className="grid gap-x-14 sm:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 2) * 0.08 }}
                className="flex gap-5 border-t border-sand/20 py-6 lg:py-7"
              >
                <span className="w-11 flex-shrink-0 font-display text-3xl italic leading-none text-terra-light lg:text-4xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold lg:text-xl">{f.title}</h3>
                  <p className="text-[15px] leading-relaxed text-sea-soft">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Wave flip />
    </div>
  );
}
