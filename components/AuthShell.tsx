"use client";

import type { ReactNode, InputHTMLAttributes, ElementType } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./Navbar";
import { Zellige } from "./Zellige";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  image: string;
  imageAlt: string;
  children: ReactNode;
}

/** Mise en page commune connexion / inscription : arc photo à gauche, formulaire à droite. */
export function AuthShell({ eyebrow, title, subtitle, image, imageAlt, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-sand">
      {/* Panneau visuel (desktop) */}
      <aside className="relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden bg-sea p-10 text-sand lg:flex">
        <Zellige size={72} color="#F3E9DA" withDot className="opacity-[0.1]" />
        <a href="./" className="relative" aria-label="Retour au site">
          <Logo light className="text-[32px]" />
        </a>
        <div className="arch relative mx-auto aspect-[3/4] w-full max-w-[400px] overflow-hidden border-[10px] border-sand/90 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={imageAlt} className="h-full w-full object-cover object-[center_62%]" />
        </div>
        <div className="relative flex items-end justify-between gap-6">
          <p className="max-w-sm font-display text-2xl italic leading-snug">
            Prenez la route, l&apos;Algérie vous attend.
          </p>
          <span lang="ar" dir="rtl" className="font-arabic text-xl font-bold text-terra-light">
            يلا نمشيو
          </span>
        </div>
      </aside>

      {/* Formulaire */}
      <main className="flex flex-1 flex-col px-4 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <a href="./" aria-label="Retour au site" className="lg:hidden">
            <Logo />
          </a>
          <a
            href="./"
            className="ml-auto inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </a>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10"
        >
          <span className="eyebrow text-terra">{eyebrow}</span>
          <h1 className="mt-3 text-[44px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[52px]">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>

        <p className="text-center text-xs text-muted">© {new Date().getFullYear()} MYLOC.DZ Car Rental. Tous droits réservés.</p>
      </main>
    </div>
  );
}

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ElementType;
  trailing?: ReactNode;
}

/** Champ de formulaire avec étiquette visible et icône. */
export function AuthField({ label, icon: Icon, trailing, className, id, ...props }: AuthFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          id={inputId}
          {...props}
          className={cn(
            "h-14 w-full rounded-2xl border-[1.5px] border-sand-deep bg-cream pl-12 pr-4 text-base font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-muted/60 focus:border-terra focus:bg-white",
            trailing && "pr-12",
            className
          )}
        />
        {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

export const authSubmitClass =
  "inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-terra px-6 text-base font-bold text-white transition-colors hover:bg-terra-dark disabled:opacity-60";
