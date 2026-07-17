"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Users, Calendar, Settings2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Car {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  priceUnit: string;
  transmission: string;
  seats: number;
  year: number;
  fuel?: string;
  featured?: boolean;
}

interface CarCardProps {
  car: Car;
  index?: number;
}

export function CarCard({ car, index = 0 }: CarCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), {
    stiffness: 120,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), {
    stiffness: 120,
    damping: 20,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-gradient-to-b from-white to-slate-100 p-6 shadow-xl shadow-slate-200/50 transition-shadow duration-300 hover:shadow-2xl hover:shadow-slate-300/60 sm:p-8",
        car.featured && "ring-2 ring-brand/20"
      )}
    >
      {/* Top info */}
      <div className="relative z-20 flex items-start justify-between">
        <div>
          <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
            {car.category}
          </span>
          <h3 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{car.name}</h3>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-brand sm:text-4xl">{car.price}€</div>
          <div className="text-xs font-medium text-slate-500">/{car.priceUnit}</div>
        </div>
      </div>

      {/* Floating 3D PNG car */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-6 [perspective:1000px]">
        <motion.div
          animate={{
            y: [0, -18, 0],
            rotateY: [-4, 4, -4],
            rotateX: [2, -2, 2],
          }}
          transition={{
            duration: 5 + index * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-full"
        >
          <Image
            src={car.image}
            alt={car.name}
            width={900}
            height={500}
            className="mx-auto h-auto w-[110%] max-w-none object-contain drop-shadow-[0_25px_50px_rgba(15,23,42,0.35)] transition-transform duration-500 group-hover:scale-105"
            style={{ transform: "translateZ(40px)" }}
          />
        </motion.div>

        {/* Floor reflection */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-[100%] bg-slate-900/10 blur-xl" />
      </div>

      {/* Bottom specs + CTA */}
      <div className="relative z-20 mt-auto">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/60 bg-white/80 p-3 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <Settings2 className="h-5 w-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">{car.transmission}</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Users className="h-5 w-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">{car.seats} places</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Calendar className="h-5 w-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">{car.year}</span>
          </div>
        </div>

        <a
          href="#"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand"
        >
          Créer un compte pour réserver
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </motion.div>
  );
}
