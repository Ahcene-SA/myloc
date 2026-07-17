"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Car } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[28rem] w-[28rem] rounded-full bg-slate-300/40 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo / back link */}
        <div className="mb-10 text-center">
          <Link href="./" className="inline-flex items-center gap-2">
            <Image
              src="./images/logo.svg"
              alt="MYLOC.DZ"
              width={260}
              height={70}
              className="h-16 w-auto"
              priority
            />
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-10">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Car className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              Connexion
            </h1>
            <p className="mt-2 text-base text-slate-500">
              Connectez-vous pour accéder à votre compte MYLOC.DZ
            </p>
          </div>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="Adresse email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-4 text-base outline-none transition-colors focus:border-brand focus:bg-white"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-11 text-base outline-none transition-colors focus:border-brand focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-base">
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                Se souvenir de moi
              </label>
              <Link href="#" className="font-semibold text-brand hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <Link
              href="client.html"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-lg font-bold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover hover:shadow-brand/40"
            >
              Se connecter
              <ArrowRight className="h-5 w-5" />
            </Link>
          </form>

          <p className="mt-6 text-center text-base text-slate-500">
            Vous n’avez pas de compte ?{" "}
            <Link href="./" className="font-semibold text-brand hover:underline">
              S’inscrire
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          © 2026 MYLOC.DZ Car Rental. Tous droits réservés.
        </p>
      </motion.div>
    </div>
  );
}
