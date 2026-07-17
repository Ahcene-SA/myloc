"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CarCard, type Car } from "./CarCard";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "Tous" },
  { id: "citadine", label: "Citadines" },
  { id: "suv", label: "SUV" },
  { id: "berline", label: "Berlines" },
];

const cars: Car[] = [
  {
    id: "fiat-500",
    name: "Fiat 500",
    category: "citadine",
    image: "images/audi-png-auto-car-0.png",
    price: 45,
    priceUnit: "jour",
    transmission: "Manuelle",
    seats: 4,
    year: 2025,
    featured: true,
  },
  {
    id: "renault-clio",
    name: "Renault Clio",
    category: "citadine",
    image: "images/audi-png-auto-car-0.png",
    price: 50,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "citroen-c3",
    name: "Citroën C3",
    category: "citadine",
    image: "images/audi-png-auto-car-0.png",
    price: 48,
    priceUnit: "jour",
    transmission: "Manuelle",
    seats: 5,
    year: 2024,
  },
  {
    id: "opel-mokka",
    name: "Opel Mokka",
    category: "suv",
    image: "images/audi-png-auto-car-0.png",
    price: 75,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2025,
  },
  {
    id: "fiat-500x",
    name: "Fiat 500X",
    category: "suv",
    image: "images/audi-png-auto-car-0.png",
    price: 72,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "renault-captur",
    name: "Renault Captur",
    category: "suv",
    image: "images/audi-png-auto-car-0.png",
    price: 70,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "renault-talisman",
    name: "Renault Talisman",
    category: "berline",
    image: "images/audi-png-auto-car-0.png",
    price: 85,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "peugeot-508",
    name: "Peugeot 508",
    category: "berline",
    image: "images/audi-png-auto-car-0.png",
    price: 90,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2025,
  },
  {
    id: "vw-passat",
    name: "Volkswagen Passat",
    category: "berline",
    image: "images/audi-png-auto-car-0.png",
    price: 88,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "audi-a3",
    name: "Audi A3",
    category: "citadine",
    image: "images/audi-png-auto-car-0.png",
    price: 55,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "audi-a4",
    name: "Audi A4",
    category: "berline",
    image: "images/audi-png-auto-car-0.png",
    price: 95,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2025,
  },
  {
    id: "audi-q5",
    name: "Audi Q5",
    category: "suv",
    image: "images/audi-png-auto-car-0.png",
    price: 110,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2025,
  },
  {
    id: "bmw-x1",
    name: "BMW X1",
    category: "suv",
    image: "images/audi-png-auto-car-0.png",
    price: 105,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
  {
    id: "mercedes-gla",
    name: "Mercedes GLA",
    category: "suv",
    image: "images/audi-png-auto-car-0.png",
    price: 100,
    priceUnit: "jour",
    transmission: "Automatique",
    seats: 5,
    year: 2024,
  },
];

export function Fleet() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredCars =
    activeCategory === "all"
      ? cars
      : cars.filter((car) => car.category === activeCategory);

  return (
    <section id="vehicules" className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-brand">
            Notre flotte
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Notre sélection de véhicules
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Des citadines économiques aux SUV spacieux, trouvez le véhicule parfait
            pour votre prochain trajet.
          </p>
        </motion.div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                activeCategory === cat.id
                  ? "bg-brand text-white shadow-md shadow-brand/25"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="mt-12 flex gap-5 overflow-x-auto px-4 pb-8 pt-4 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:gap-6 sm:px-6 lg:px-8"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {filteredCars.map((car, index) => (
            <div
              key={car.id}
              className="w-[78vw] shrink-0 snap-center sm:w-[52vw] md:w-[40vw] lg:w-[32vw] xl:w-[26vw]"
            >
              <CarCard car={car} index={index} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
