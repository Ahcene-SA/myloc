"use client";

import { useId, type ReactNode, type InputHTMLAttributes, type ElementType } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { AlgiersSkyline, BlueBar, Logo, PalmShadow, SkyCircle } from "./Brand";
import { cn } from "@/lib/utils";
import { LangSwitch, useLang } from "@/lib/i18n";

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
  const { t, lang } = useLang();
  return (
    <div className="flex min-h-screen bg-white">
      {/* Panneau visuel (desktop), style des posts Instagram */}
      <aside className="bg-brand-mist relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden border-e border-line p-10 lg:flex">
        <PalmShadow className="-left-24 -top-10 w-[520px] opacity-25" />
        <SkyCircle className="-right-40 top-1/3 h-[520px] w-[520px]" />
        <AlgiersSkyline className="inset-x-0 bottom-0 h-48 w-full text-navy opacity-[0.04]" />
        <a href="./" className="relative" aria-label={t("Retour au site")}>
          <Logo />
        </a>
        <div className="relative flex flex-col items-center text-center">
          <span className="kicker text-navy/80">
            {t("Location de véhicules en")} <strong className="font-extrabold text-navy">{t("Algérie")}</strong>
          </span>
          <p className="mt-4 text-4xl font-extrabold uppercase leading-[1.02] text-navy xl:text-5xl">
            {lang === "ar" ? (
              <>
                <span className="text-sky-gradient">{t("Votre mobilité")}</span>،
              </>
            ) : (
              <>
                Votre <span className="text-sky-gradient">mobilité</span>,
              </>
            )}
            <br />
            {t("notre priorité")}
          </p>
          <BlueBar className="mt-5" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={imageAlt} className="car-reflect mt-10 w-[88%] max-w-[460px]" />
        </div>
        <p className="relative text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {t("Infos & réservation via WhatsApp")}
        </p>
      </aside>

      {/* Formulaire */}
      <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between gap-2">
          <a href="./" aria-label={t("Retour au site")} className="lg:hidden">
            <Logo compact />
          </a>
          <div className="ms-auto flex items-center gap-2">
            {/* Sous sm : flèche seule (le libellé reste lu par les lecteurs d'écran) */}
            <a
              href="./"
              aria-label={t("Retour au site")}
              className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold text-muted transition-colors hover:text-navy"
            >
              <ArrowLeft className="flip-rtl h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t("Retour au site")}</span>
            </a>
            <LangSwitch />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10"
        >
          <span className="kicker text-sky-text">{eyebrow}</span>
          <h1 className="mt-3 text-[38px] font-extrabold uppercase leading-[1.02] text-navy sm:text-[44px]">{title}</h1>
          <BlueBar className="mt-4" />
          <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>

        <p className="text-center text-xs text-muted">
          <bdi dir="ltr" suppressHydrationWarning>
            © {new Date().getFullYear()} MYLOC.DZ Car Rental.
          </bdi>{" "}
          {t("Tous droits réservés.")}
        </p>
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
export function AuthField({ label, icon: Icon, trailing, className, id, type, ...props }: AuthFieldProps) {
  // useId : l'étiquette peut être en arabe, on ne peut pas en dériver un id fiable.
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          id={inputId}
          type={type}
          {...props}
          className={cn(
            // Email / téléphone : sens déterminé par le contenu (LTR), y compris en arabe
            (type === "email" || type === "tel") && "[unicode-bidi:plaintext] placeholder:[unicode-bidi:plaintext]",
            "h-14 w-full rounded-2xl border-2 border-line bg-mist ps-12 pe-4 text-[15px] font-semibold text-navy outline-none transition-colors placeholder:font-medium placeholder:text-muted/60 focus:border-sky focus:bg-white",
            trailing && "pe-12",
            className
          )}
        />
        {trailing && <div className="absolute end-3 top-1/2 -translate-y-1/2">{trailing}</div>}
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
  "inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-sky px-6 text-[15px] font-bold text-navy transition-colors hover:bg-sky-mid hover:text-white disabled:opacity-60";
