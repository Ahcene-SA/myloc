"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Search, Star } from "lucide-react";
import { Zellige } from "./Zellige";
import { WhatsAppIcon } from "./FloatingWhatsApp";
import { FILTER_EVENT, site } from "@/lib/site";

const HOME = "__domicile__";

const categories = [
  { id: "all", label: "Toutes" },
  { id: "citadine", label: "Citadine" },
  { id: "suv", label: "SUV" },
  { id: "berline", label: "Berline" },
];

const trust = ["5 points de retrait", "Assistance 24/7", "Annulation gratuite 24h avant"];

const fieldLabel = "text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted";
const fieldInput =
  "w-full appearance-none bg-transparent p-0 text-base font-semibold text-ink outline-none placeholder:text-muted/70";

export function Hero() {
  const today = new Date().toISOString().split("T")[0];

  const [pickup, setPickup] = useState<string>(site.agencies[0]);
  const [pickupAddress, setPickupAddress] = useState("");
  const [differentReturn, setDifferentReturn] = useState(false);
  const [returnPlace, setReturnPlace] = useState<string>(site.agencies[0]);
  const [returnAddress, setReturnAddress] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [retourDate, setRetourDate] = useState("");
  const [category, setCategory] = useState("all");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: category }));
    document.getElementById("vehicules")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="accueil" className="relative overflow-hidden pt-24 lg:pt-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-16 lg:px-8">
        {/* ── Texte ── */}
        <div className="relative z-10 flex flex-col gap-6 pt-4 lg:gap-7 lg:pt-12">
          <div className="fade-up flex items-center gap-3" style={{ animationDelay: "0.05s" }}>
            <span lang="ar" dir="rtl" className="font-arabic text-xl font-bold text-terra lg:text-2xl">
              يلا نمشيو
            </span>
            <span className="h-[1.5px] w-10 bg-terra" />
            <span className="eyebrow text-muted">Et c&apos;est parti&nbsp;!</span>
          </div>

          <h1
            className="fade-up font-display text-[46px] font-semibold leading-[0.98] tracking-[-0.035em] text-ink sm:text-7xl lg:text-[84px]"
            style={{ animationDelay: "0.15s" }}
          >
            Prenez la route,
            <br />
            <span className="font-normal italic text-sea">l&apos;Algérie</span>
            <br />
            vous attend.
          </h1>

          <p className="fade-up max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg" style={{ animationDelay: "0.25s" }}>
            Citadines, SUV et berlines récentes, disponibles à l&apos;aéroport et dans nos agences d&apos;Alger, Oran,
            Constantine et Annaba. Réservez en deux minutes, prix clairs, sans surprise.
          </p>

          <div className="fade-up flex flex-wrap items-center gap-3" style={{ animationDelay: "0.35s" }}>
            <a
              href="#vehicules"
              className="inline-flex h-14 items-center gap-2.5 rounded-full bg-terra px-7 text-base font-bold text-white transition-colors hover:bg-terra-dark"
            >
              Voir la flotte
              <ArrowRight className="h-[18px] w-[18px]" />
            </a>
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center gap-3 rounded-full px-3 text-base font-bold text-ink transition-colors hover:text-terra"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-olive text-white">
                <WhatsAppIcon className="h-5 w-5" />
              </span>
              Réserver sur WhatsApp
            </a>
          </div>

          <ul className="fade-up flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-muted" style={{ animationDelay: "0.45s" }}>
            {trust.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 fill-terra text-terra" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Arc + photo ── */}
        <div className="relative mx-auto h-[440px] w-full max-w-[420px] sm:h-[560px] lg:mx-0 lg:h-[660px] lg:max-w-none">
          <div className="absolute -inset-x-10 -top-4 bottom-10 hidden sm:block">
            <Zellige size={56} />
          </div>
          <div className="arch absolute inset-x-4 top-0 bottom-10 overflow-hidden border-[10px] border-cream shadow-[0_40px_80px_-30px_rgba(15,76,117,0.45)] sm:inset-x-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="images/scenes/jetour-x70-plus.jpg"
              alt="Jetour X70+ garé face à la mer, entre palmiers et murs blancs"
              className="h-full w-full object-cover object-[center_62%]"
              fetchPriority="high"
            />
          </div>

          <div className="absolute bottom-0 left-0 flex w-56 lg:bottom-24 flex-col gap-1 rounded-[20px] bg-cream p-5 shadow-[0_24px_48px_-20px_rgba(22,34,46,0.35)] sm:w-64 lg:-left-6">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-terra">À la une</span>
            <span className="font-display text-2xl font-semibold text-ink">Jetour X70+</span>
            <span className="text-[13px] text-muted">SUV · 7 places · Automatique</span>
            <span className="mt-1 font-display text-3xl font-bold text-sea">
              95 {site.currency} <span className="font-sans text-sm font-semibold text-muted">/ jour</span>
            </span>
          </div>

          <div className="float-slow absolute right-0 top-10 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-sea text-center text-sand lg:-right-4 lg:h-28 lg:w-28">
            <span className="font-display text-2xl font-semibold italic leading-none lg:text-3xl">2 min</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide lg:text-[11px]">pour réserver</span>
          </div>
        </div>
      </div>

      {/* ── Formulaire de recherche ── */}
      <div className="relative z-20 mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:-mt-6 lg:px-8">
        <form
          onSubmit={handleSubmit}
          aria-label="Rechercher un véhicule"
          className="rounded-[28px] bg-white p-2 shadow-[0_30px_60px_-28px_rgba(22,34,46,0.35)] lg:p-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <label className="flex flex-col gap-1.5 rounded-2xl px-5 py-4 focus-within:bg-sand/60 lg:flex-[1.5] lg:px-6">
              <span className={fieldLabel}>Retrait</span>
              <select className={fieldInput} value={pickup} onChange={(e) => setPickup(e.target.value)}>
                {site.agencies.map((a) => (
                  <option key={a}>{a}</option>
                ))}
                <option value={HOME}>Livraison à domicile</option>
              </select>
              {pickup === HOME && (
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Votre adresse"
                  aria-label="Adresse de livraison"
                  className={`${fieldInput} mt-1 border-b border-sand-deep pb-1 text-sm`}
                />
              )}
            </label>

            <span className="mx-5 h-px bg-sand-deep lg:mx-0 lg:my-3 lg:h-auto lg:w-px" />

            <div className="grid grid-cols-2 lg:flex lg:flex-[2]">
              <label className="flex flex-col gap-1.5 rounded-2xl px-5 py-4 focus-within:bg-sand/60 lg:flex-1 lg:px-6">
                <span className={fieldLabel}>Départ</span>
                <input
                  type="date"
                  min={today}
                  value={departDate}
                  onChange={(e) => setDepartDate(e.target.value)}
                  className={fieldInput}
                />
              </label>
              <label className="flex flex-col gap-1.5 rounded-2xl border-l border-sand-deep px-5 py-4 focus-within:bg-sand/60 lg:flex-1 lg:px-6">
                <span className={fieldLabel}>Retour</span>
                <input
                  type="date"
                  min={departDate || today}
                  value={retourDate}
                  onChange={(e) => setRetourDate(e.target.value)}
                  className={fieldInput}
                />
              </label>
            </div>

            <span className="mx-5 h-px bg-sand-deep lg:mx-0 lg:my-3 lg:h-auto lg:w-px" />

            <label className="flex flex-col gap-1.5 rounded-2xl px-5 py-4 focus-within:bg-sand/60 lg:flex-1 lg:px-6">
              <span className={fieldLabel}>Catégorie</span>
              <select className={fieldInput} value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="m-1 mt-2 flex h-14 items-center justify-center gap-2.5 rounded-[20px] bg-terra px-8 text-base font-bold text-white transition-colors hover:bg-terra-dark lg:m-0 lg:ml-2 lg:h-auto lg:self-stretch"
            >
              <Search className="h-[18px] w-[18px]" />
              Rechercher
            </button>
          </div>

          <div className="flex flex-col gap-3 border-t border-sand-deep px-5 pb-2 pt-3 sm:flex-row sm:items-center lg:mt-2 lg:px-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-muted">
              <input
                type="checkbox"
                checked={differentReturn}
                onChange={(e) => setDifferentReturn(e.target.checked)}
                className="h-[18px] w-[18px] accent-terra"
              />
              Retour dans un autre lieu
            </label>
            {differentReturn && (
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  aria-label="Lieu de retour"
                  value={returnPlace}
                  onChange={(e) => setReturnPlace(e.target.value)}
                  className="h-10 rounded-xl bg-sand px-3 text-sm font-semibold text-ink outline-none"
                >
                  {site.agencies.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                  <option value={HOME}>Récupération à domicile</option>
                </select>
                {returnPlace === HOME && (
                  <input
                    type="text"
                    value={returnAddress}
                    onChange={(e) => setReturnAddress(e.target.value)}
                    placeholder="Adresse de récupération"
                    aria-label="Adresse de récupération"
                    className="h-10 flex-1 rounded-xl bg-sand px-3 text-sm font-semibold text-ink outline-none placeholder:text-muted/70"
                  />
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
