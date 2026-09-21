"use client";

import { useState } from "react";
import {
  MapPin,
  CalendarDays,
  Clock,
  ChevronDown,
  Zap,
  Clock as ClockIcon,
  CircleCheck,
  Shield,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "Flexibilité",
    desc: "Horaires souples, 7j/7",
    active: true,
  },
  {
    icon: ClockIcon,
    title: "Disponibilité",
    desc: "Flotte toujours prête",
    active: false,
  },
  {
    icon: CircleCheck,
    title: "Simplicité",
    desc: "Réservation en 2 minutes",
    active: false,
  },
  {
    icon: Shield,
    title: "Transparence",
    desc: "Prix clairs, sans surprise",
    active: false,
  },
];

export function Hero() {
  const [location, setLocation] = useState("Aéroport Messali Hadj");
  const [differentReturn, setDifferentReturn] = useState(false);
  const [departTime, setDepartTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");

  return (
    <section id="accueil" className="bg-[#43B0E6] p-3 sm:p-4 lg:p-2">
      {/* Main Hero Container */}
      <div className="rounded-[2rem] relative h-[min(calc(100svh-1.5rem),916px)] lg:h-[calc(100svh-3.5rem)] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80"
            alt="Aéroport"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
        </div>

        {/* Title */}
        <div className="absolute inset-0 flex flex-col justify-start px-6 sm:px-14 pt-[26%] sm:pt-12 lg:pt-32 pb-4 sm:pb-44 pointer-events-none">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] max-w-2xl mt-[8%] sm:mt-0">
            <span className="shimmer-text block mb-1">MYLOC,</span>
            <span className="shimmer-text block">et c'est parti !</span>
          </h1>
        </div>

        {/* Reservation Bar */}
        <div className="absolute top-[44%] sm:top-auto sm:bottom-36 left-0 right-0 z-20 max-w-5xl mx-auto px-3 sm:px-6">
          <div className="relative">
            <form className="bg-white rounded-2xl shadow-2xl border border-gray-100">
              <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                {/* Location */}
                <div className="flex items-start gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-[2] min-w-0">
                  <MapPin
                    className="w-5 h-5 flex-shrink-0 mt-5"
                    style={{ color: "#43B0E6" }}
                  />
                  <div className="relative flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5 text-gray-900">
                      Retrait et retour
                    </p>
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full"
                    >
                      <span className="font-semibold text-[15px] flex-1 text-left truncate text-gray-900">
                        {location}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Dates */}
                <div className="relative lg:flex-[1.3]">
                  <button
                    type="button"
                    className="flex items-start gap-3 px-4 py-3 sm:px-6 sm:py-4 w-full text-left hover:bg-gray-50 transition-colors"
                  >
                    <CalendarDays
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{ color: "#43B0E6" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-1.5">
                        Dates
                      </p>
                      <p className="font-semibold text-gray-400 text-[15px]">
                        Choisir
                      </p>
                    </div>
                  </button>
                </div>

                {/* Times */}
                <div className="flex divide-x divide-gray-100 lg:contents">
                  <div className="flex-1 flex items-start gap-2 px-4 py-3 lg:px-5 lg:py-4 lg:flex-1">
                    <Clock
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{ color: "#43B0E6" }}
                    />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-2">
                        Départ
                      </p>
                      <div className="relative">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-base font-semibold transition-colors text-gray-600 hover:text-gray-900"
                        >
                          <Clock className="w-4 h-4 text-gray-300" />
                          {departTime}
                          <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 flex items-start gap-2 px-4 py-3 lg:px-5 lg:py-4 lg:flex-1">
                    <Clock
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{ color: "#43B0E6" }}
                    />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-2">
                        Retour
                      </p>
                      <div className="relative">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-base font-semibold transition-colors text-gray-600 hover:text-gray-900"
                        >
                          <Clock className="w-4 h-4 text-gray-300" />
                          {returnTime}
                          <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-center">
                  <a
                    href="#vehicules"
                    className="w-full lg:w-auto px-8 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 whitespace-nowrap inline-flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#43B0E6" }}
                  >
                    Voir les véhicules
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Different return location checkbox */}
              <div className="border-t border-gray-100 px-4 py-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <button
                  type="button"
                  onClick={() => setDifferentReturn(!differentReturn)}
                  className="flex items-center gap-1.5 text-sm font-semibold transition-colors flex-shrink-0"
                  style={{ color: "#9ca3af" }}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                      differentReturn
                        ? "border-[#43B0E6] bg-[#43B0E6]"
                        : "border-gray-300 bg-transparent"
                    )}
                  >
                    {differentReturn && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </span>
                  Retour dans un lieu différent
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="mx-3 sm:mx-4 mt-6 pb-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl px-4 py-5 cursor-default transition-all duration-500 flex flex-col items-center text-center"
                style={{
                  backgroundColor: feature.active
                    ? "rgba(255,255,255,0.22)"
                    : "rgba(255,255,255,0.10)",
                  border: feature.active
                    ? "1px solid rgba(255,255,255,0.45)"
                    : "1px solid rgba(255,255,255,0.14)",
                  transform: feature.active ? "translateY(-3px)" : "none",
                  boxShadow: feature.active
                    ? "0 10px 30px rgba(0,0,0,0.10)"
                    : "none",
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 transition-all duration-500"
                  style={{
                    backgroundColor: feature.active
                      ? "#43B0E6"
                      : "rgba(255,255,255,0.18)",
                  }}
                >
                  <Icon
                    className="w-4 h-4 transition-all duration-500"
                    style={{
                      color: feature.active
                        ? "#fff"
                        : "rgba(255,255,255,0.75)",
                    }}
                  />
                </div>
                <p className="font-black text-white text-sm sm:text-base leading-tight mb-1">
                  {feature.title}
                </p>
                <p className="text-white/60 text-xs leading-snug hidden sm:block">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
