"use client";

import { useState, useRef, useEffect } from "react";
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
  Home,
  Building2,
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

const agencies = [
  "Aéroport Messali Hadj",
  "Agence Alger Centre",
  "Agence Oran",
  "Agence Constantine",
  "Agence Annaba",
];

const timeSlots = Array.from({ length: 33 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export function Hero() {
  /* ── scroll-to-top on mount ── */
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const today = new Date().toISOString().split("T")[0];

  /* ── pickup location ── */
  const [pickupType, setPickupType] = useState<"agence" | "domicile">("agence");
  const [pickupAgency, setPickupAgency] = useState("Aéroport Messali Hadj");
  const [pickupAddress, setPickupAddress] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  /* ── return location ── */
  const [differentReturn, setDifferentReturn] = useState(false);
  const [returnType, setReturnType] = useState<"agence" | "domicile">("agence");
  const [returnAgency, setReturnAgency] = useState("Aéroport Messali Hadj");
  const [returnAddress, setReturnAddress] = useState("");

  /* ── date + heure départ ── */
  const [departDate, setDepartDate] = useState("");
  const [departTime, setDepartTime] = useState("10:00");
  const [showDepartPicker, setShowDepartPicker] = useState(false);

  /* ── date + heure retour ── */
  const [retourDate, setRetourDate] = useState("");
  const [retourTime, setRetourTime] = useState("10:00");
  const [showRetourPicker, setShowRetourPicker] = useState(false);

  /* refs for click-outside */
  const locationRef = useRef<HTMLDivElement>(null);
  const departRef = useRef<HTMLDivElement>(null);
  const retourRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        locationRef.current &&
        !locationRef.current.contains(event.target as Node)
      )
        setShowLocationDropdown(false);
      if (
        departRef.current &&
        !departRef.current.contains(event.target as Node)
      )
        setShowDepartPicker(false);
      if (
        retourRef.current &&
        !retourRef.current.contains(event.target as Node)
      )
        setShowRetourPicker(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fmtDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  };

  const fmtDisplay = (date: string, time: string) => {
    if (!date) return "Choisir";
    return `${fmtDate(date)}, ${time}`;
  };

  return (
    <section id="accueil" className="bg-[#43B0E6] p-3 sm:p-4 lg:p-2">
      {/* ── Hero container ── */}
      <div className="rounded-[2rem] relative h-[min(calc(100svh-1.5rem),916px)] lg:h-[calc(100svh-3.5rem)]">
        {/* Background */}
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80"
            alt="Aéroport"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
        </div>

        {/* Title */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -translate-y-16 sm:-translate-y-20 md:-translate-y-24 hero-title-wrapper">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight flex shimmer-text">
            {"MYLOC".split("").map((letter, i) => (
              <span
                key={i}
                className="letter-reveal inline-block"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {letter}
              </span>
            ))}
          </h1>
          <p className="mt-3 sm:mt-4 text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex">
            {"et c'est parti !".split("").map((letter, i) => (
              <span
                key={i}
                className="jitter-reveal inline-block text-white/90"
                style={{ animationDelay: `${1.9 + i * 0.04}s` }}
              >
                {letter === " " ? " " : letter}
              </span>
            ))}
          </p>
        </div>

        {/* ── Reservation Bar ── */}
        <div className="absolute top-[44%] sm:top-auto sm:bottom-36 left-0 right-0 z-[60] max-w-5xl mx-auto px-3 sm:px-6">
          <div className="relative">
            <form
              className="bg-white rounded-2xl shadow-2xl border border-gray-100"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Row: Location | Date+heure départ | Date+heure retour | Submit */}
              <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                {/* ── Location ── */}
                <div
                  ref={locationRef}
                  className="relative flex items-start gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-[2] min-w-0"
                >
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
                      onClick={() =>
                        setShowLocationDropdown(!showLocationDropdown)
                      }
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <span className="font-semibold text-[15px] flex-1 text-left truncate text-gray-900">
                        {pickupType === "agence"
                          ? pickupAgency
                          : "À domicile"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform",
                          showLocationDropdown && "rotate-180"
                        )}
                      />
                    </button>

                    {/* Location Dropdown — 2 options only */}
                    {showLocationDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] overflow-hidden">
                        <div className="p-2 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPickupType("agence");
                              setShowLocationDropdown(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors",
                              pickupType === "agence"
                                ? "bg-[#43B0E6]/10 text-[#43B0E6] font-semibold"
                                : "text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            <Building2 className="w-4 h-4" />
                            En agence
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPickupType("domicile");
                              setShowLocationDropdown(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors",
                              pickupType === "domicile"
                                ? "bg-[#43B0E6]/10 text-[#43B0E6] font-semibold"
                                : "text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            <Home className="w-4 h-4" />
                            À domicile
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Date et heure de départ ── */}
                <div
                  ref={departRef}
                  className="relative lg:flex-[1.3]"
                >
                  <button
                    type="button"
                    onClick={() => setShowDepartPicker(!showDepartPicker)}
                    className="flex items-start gap-3 px-4 py-3 sm:px-6 sm:py-4 w-full text-left hover:bg-gray-50 transition-colors"
                  >
                    <CalendarDays
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{ color: "#43B0E6" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-1.5">
                        Date et heure de départ
                      </p>
                      <p
                        className={cn(
                          "font-semibold text-[15px]",
                          departDate ? "text-gray-900" : "text-gray-400"
                        )}
                      >
                        {fmtDisplay(departDate, departTime)}
                      </p>
                    </div>
                  </button>

                  {/* Depart picker dropdown */}
                  {showDepartPicker && (
                    <div className="absolute left-0 right-0 lg:right-auto lg:w-80 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">
                            Date
                          </label>
                          <input
                            type="date"
                            min={today}
                            value={departDate}
                            onChange={(e) => setDepartDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#43B0E6]/30 focus:border-[#43B0E6]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">
                            Heure
                          </label>
                          <div className="grid grid-cols-4 gap-1 max-h-36 overflow-y-auto">
                            {timeSlots.map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  setDepartTime(time);
                                  setShowDepartPicker(false);
                                }}
                                className={cn(
                                  "px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                  departTime === time
                                    ? "bg-[#43B0E6] text-white"
                                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                                )}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Date et heure de retour ── */}
                <div
                  ref={retourRef}
                  className="relative lg:flex-[1.3]"
                >
                  <button
                    type="button"
                    onClick={() => setShowRetourPicker(!showRetourPicker)}
                    className="flex items-start gap-3 px-4 py-3 sm:px-6 sm:py-4 w-full text-left hover:bg-gray-50 transition-colors"
                  >
                    <CalendarDays
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{ color: "#43B0E6" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-1.5">
                        Date et heure de retour
                      </p>
                      <p
                        className={cn(
                          "font-semibold text-[15px]",
                          retourDate ? "text-gray-900" : "text-gray-400"
                        )}
                      >
                        {fmtDisplay(retourDate, retourTime)}
                      </p>
                    </div>
                  </button>

                  {/* Retour picker dropdown */}
                  {showRetourPicker && (
                    <div className="absolute left-0 right-0 lg:right-auto lg:w-80 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">
                            Date
                          </label>
                          <input
                            type="date"
                            min={departDate || today}
                            value={retourDate}
                            onChange={(e) => setRetourDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#43B0E6]/30 focus:border-[#43B0E6]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">
                            Heure
                          </label>
                          <div className="grid grid-cols-4 gap-1 max-h-36 overflow-y-auto">
                            {timeSlots.map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  setRetourTime(time);
                                  setShowRetourPicker(false);
                                }}
                                className={cn(
                                  "px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                  retourTime === time
                                    ? "bg-[#43B0E6] text-white"
                                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                                )}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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

              {/* ── Pickup detail (address for domicile) ── */}
              {pickupType === "domicile" && (
                <div className="border-t border-gray-100 px-4 py-3 sm:px-6 bg-gray-50/50">
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5 text-gray-500">
                    Adresse de retrait
                  </p>
                  <input
                    type="text"
                    placeholder="Saisissez votre adresse"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#43B0E6]/30 focus:border-[#43B0E6]"
                  />
                </div>
              )}

              {/* ── Different return checkbox ── */}
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

              {/* ── Return location detail ── */}
              {differentReturn && (
                <div className="border-t border-gray-100 px-4 py-3 sm:px-6 bg-gray-50/50">
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-2 text-gray-500">
                    Lieu de retour
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setReturnType("agence")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                          returnType === "agence"
                            ? "bg-[#43B0E6] text-white"
                            : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Building2 className="w-3 h-3" />
                        En agence
                      </button>
                      <button
                        type="button"
                        onClick={() => setReturnType("domicile")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                          returnType === "domicile"
                            ? "bg-[#43B0E6] text-white"
                            : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Home className="w-3 h-3" />
                        À domicile
                      </button>
                    </div>
                    {returnType === "agence" ? (
                      <select
                        value={returnAgency}
                        onChange={(e) => setReturnAgency(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#43B0E6]/30 focus:border-[#43B0E6] bg-white"
                      >
                        {agencies.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Adresse de retour"
                        value={returnAddress}
                        onChange={(e) => setReturnAddress(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#43B0E6]/30 focus:border-[#43B0E6]"
                      />
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* ── Feature cards ── */}
      <div className="mx-3 sm:mx-4 mt-6 pb-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map((feature) => {
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
