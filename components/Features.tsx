"use client";

import { motion } from "framer-motion";
import {
  BadgeCent,
  CalendarCheck,
  Headphones,
  CarFront,
  Gauge,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: BadgeCent,
    title: "Prix transparents",
    description:
      "Pas de frais cachés. Le prix affiché est le prix final, avec assurance et assistance incluses.",
  },
  {
    icon: CalendarCheck,
    title: "Réservation rapide",
    description:
      "Réservez votre voiture en moins de 2 minutes, 24h/24 et 7j/7, directement en ligne.",
  },
  {
    icon: Headphones,
    title: "Assistance 24/7",
    description:
      "Notre équipe reste à votre disposition à toute heure pour vous accompagner sur la route.",
  },
  {
    icon: CarFront,
    title: "Véhicules récents",
    description:
      "Flotte constamment renouvelée, entretenue et nettoyée avant chaque location.",
  },
  {
    icon: Gauge,
    title: "Kilométrage illimité",
    description:
      "Roulez sans compter avec nos options de kilométrage illimité sur de nombreux véhicules.",
  },
  {
    icon: ShieldCheck,
    title: "Annulation flexible",
    description:
      "Modifiez ou annulez votre réservation gratuitement jusqu’à 24h avant le départ.",
  },
];

export function Features() {
  return (
    <section id="avantages" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-brand">
            Pourquoi nous choisir
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            L’expérience MYLOC.DZ
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Nous simplifions la location de voiture pour que vous puissiez vous concentrer
            sur l’essentiel : votre voyage.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group rounded-3xl border border-slate-100 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/20 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
