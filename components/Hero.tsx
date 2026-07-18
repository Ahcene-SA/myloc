"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BadgeCheck, User, Mail, Lock, ArrowRight, Phone } from "lucide-react";
import { useAuth } from "./AuthContext";
import { FloatingOrbs } from "./FloatingOrbs";
import { cn } from "@/lib/utils";

const stats = [
  { value: "126k+", label: "UTILISATEURS" },
  { value: "5+", label: "ANNÉES D’EXPÉRIENCE" },
  { value: "4.8", label: "NOTE MOYENNE" },
  { value: "24/7", label: "SERVICE CLIENT" },
];

export function Hero() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await register(fullName, email, password, phone);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Échec de l'inscription.");
      return;
    }
    if (typeof window !== "undefined") {
      window.location.href = "./client.html";
    }
  };

  return (
    <section
      id="accueil"
      className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 pt-32 pb-16 lg:pt-36"
    >
      <FloatingOrbs />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          {/* Left: Text + Booking */}
          <div className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                <BadgeCheck className="h-5 w-5 text-brand" />
                <span className="text-sm font-semibold text-slate-700">Location de voitures fiable en Algérie</span>
              </div>

              <h1 className="text-balance text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Louez une voiture,{" "}
                <span className="text-brand">roulez en toute sérénité !</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
                Des locations abordables, fiables et sans tracas pour chaque voyage.
                Réservez votre véhicule en quelques clics avec MYLOC.DZ.
              </p>
            </motion.div>

            {/* Sign-up Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="mt-8 rounded-3xl bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6"
            >
              <h3 className="mb-5 text-xl font-bold text-slate-900">
                Créez votre compte
              </h3>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nom complet"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Adresse email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover hover:shadow-brand/40 disabled:opacity-60"
                >
                  {loading ? "Inscription..." : "S’inscrire"}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-slate-500">
                Vous avez déjà un compte ?{" "}
                <a href="login.html" className="font-semibold text-brand hover:underline">
                  Se connecter
                </a>
              </p>
            </motion.div>
          </div>

          {/* Right: 3D floating car */}
          <div className="relative order-1 flex items-center justify-center lg:order-2">
            <motion.div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ rotateX, rotateY, transformPerspective: 1000 }}
              className="perspective-1000 relative z-10 w-full max-w-xl cursor-pointer lg:max-w-2xl"
            >
              <div className="relative">
                <motion.div
                  animate={{
                    y: [0, -18, 0],
                    rotateY: [-5, 5, -5],
                    rotateX: [2, -2, 2],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Image
                    src="images/audi-png-auto-car-0.png"
                    alt="Audi S4 - MYLOC.DZ"
                    width={900}
                    height={500}
                    className="relative z-10 mx-auto h-auto w-full scale-125 object-contain drop-shadow-[0_35px_60px_rgba(15,23,42,0.35)]"
                    priority
                  />
                </motion.div>
                {/* Floor reflection */}
                <div className="pointer-events-none absolute -bottom-2 left-1/2 h-8 w-[85%] -translate-x-1/2 rounded-[100%] bg-slate-900/15 blur-2xl" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
          className="mt-16 rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8"
        >
          <div className="grid grid-cols-2 gap-6 divide-slate-100 sm:grid-cols-4 sm:divide-x">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "text-center",
                  index < stats.length - 1 && "sm:border-r sm:border-slate-100"
                )}
              >
                <div className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{stat.value}</div>
                <div className="mt-1 text-xs font-semibold tracking-wide text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
