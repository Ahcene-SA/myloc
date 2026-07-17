"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CheckCircle } from "lucide-react";

const highlights = [
  "Flotte moderne et entretenue",
  "Réservation en ligne simplifiée",
  "Service client réactif",
  "Tarifs compétitifs sans surprise",
];

export function About() {
  return (
    <section id="a-propos" className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-brand">
              À propos de MYLOC.DZ
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Votre partenaire mobilité en Algérie
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              MYLOC.DZ est une agence de location de voitures dédiée à offrir une expérience
              simple, fiable et accessible. Que vous soyez en voyage d’affaires, en vacances
              ou que vous ayez besoin d’un véhicule au quotidien, nous mettons à votre
              disposition une large gamme de citadines, SUV et berlines récentes.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Notre équipe travaille chaque jour pour vous garantir des tarifs justes,
              une prise en charge rapide et un service client disponible à tout moment.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {highlights.map((item, index) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle className="h-5 w-5 shrink-0 text-brand" />
                  <span className="font-semibold text-slate-700">{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Gallery */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="col-span-2 overflow-hidden rounded-3xl">
              <Image
                src="images/fleet-citadines.png"
                alt="Sélection de citadines MYLOC.DZ"
                width={800}
                height={400}
                className="h-56 w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="overflow-hidden rounded-3xl">
              <Image
                src="images/car-fiat-500.png"
                alt="Fiat 500"
                width={400}
                height={300}
                className="h-48 w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="overflow-hidden rounded-3xl">
              <Image
                src="images/fleet-suv.png"
                alt="Sélection de SUV MYLOC.DZ"
                width={400}
                height={300}
                className="h-48 w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
