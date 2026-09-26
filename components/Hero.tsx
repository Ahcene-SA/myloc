"use client";

import { useState, type FormEvent } from "react";
import { ArrowDown, Search, Check } from "lucide-react";
import { AlgiersSkyline, BlueBar, PalmShadow, Sky, SkyCircle } from "./Brand";
import { WhatsAppIcon } from "./FloatingWhatsApp";
import { FILTER_EVENT, categoryInfo, site, whatsappLink } from "@/lib/site";

const HOME = "__domicile__";

const categories = [
  { id: "all", label: "Toutes" },
  ...Object.entries(categoryInfo).map(([id, c]) => ({ id, label: c.label })),
];

const trust = ["Assistance 24/7", "Prix clairs, sans surprise", "Annulation gratuite 24h avant"];

const fieldLabel = "text-[11px] font-bold uppercase tracking-[0.2em] text-muted";
const fieldInput = "w-full appearance-none bg-transparent p-0 text-[15px] font-bold text-navy outline-none placeholder:text-muted/70";

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

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

  // Message WhatsApp pré-rempli avec la recherche du visiteur
  const place = (p: string, addr: string) => (p === HOME ? `à domicile (${addr || "adresse à préciser"})` : p);
  const waMessage = [
    "Bonjour MYLOC.DZ, je souhaite louer un véhicule.",
    `Retrait : ${place(pickup, pickupAddress)}`,
    differentReturn ? `Retour : ${place(returnPlace, returnAddress)}` : "",
    departDate ? `Du ${formatDate(departDate)}${retourDate ? ` au ${formatDate(retourDate)}` : ""}` : "",
    category !== "all" ? `Catégorie : ${categoryInfo[category]?.label}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section id="accueil" className="bg-brand-mist relative overflow-hidden pt-24 lg:pt-28">
      <PalmShadow className="-left-24 -top-10 w-[420px] opacity-25 sm:w-[560px]" />
      <PalmShadow flip className="-right-32 top-40 hidden w-[480px] opacity-15 lg:block" />
      <AlgiersSkyline className="inset-x-0 bottom-0 h-40 w-full text-navy opacity-[0.035] lg:h-56" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:px-8">
        {/* ── Texte ── */}
        <div className="relative z-10 flex flex-col gap-6 pt-6 lg:pt-10">
          <span className="fade-up kicker text-navy/80" style={{ animationDelay: "0.05s" }}>
            Location de véhicules en <strong className="font-extrabold text-navy">Algérie</strong>
          </span>
          <h1
            className="fade-up text-[42px] font-extrabold uppercase leading-[1] tracking-[-0.015em] text-navy sm:text-6xl lg:text-[68px]"
            style={{ animationDelay: "0.15s" }}
          >
            Votre <Sky>mobilité</Sky>,
            <br />
            notre priorité
          </h1>
          <BlueBar className="fade-up w-16" />
          <p
            className="fade-up max-w-lg text-[15px] font-semibold uppercase leading-relaxed tracking-[0.06em] text-ink-soft sm:text-base"
            style={{ animationDelay: "0.25s" }}
          >
            Une équipe professionnelle à votre service, partout en Algérie.
          </p>

          <div className="fade-up flex flex-wrap items-center gap-3" style={{ animationDelay: "0.35s" }}>
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center gap-2.5 rounded-full bg-sky px-7 text-[15px] font-bold text-navy shadow-[0_14px_30px_-12px_rgba(67,176,230,0.8)] transition-colors hover:bg-sky-mid hover:text-white"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Réserver sur WhatsApp
            </a>
            <a
              href="#vehicules"
              className="inline-flex h-14 items-center gap-2 rounded-full border-2 border-navy px-6 text-[15px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              Voir la flotte
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          <ul className="fade-up flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-semibold text-muted" style={{ animationDelay: "0.45s" }}>
            {trust.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-soft">
                  <Check className="h-3 w-3 text-sky-text" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Groupe de voitures, comme sur les posts ── */}
        <div className="relative h-[280px] sm:h-[380px] lg:h-[500px]">
          <SkyCircle className="left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 sm:h-[440px] sm:w-[440px] lg:h-[540px] lg:w-[540px]" />
          <div className="absolute inset-x-0 bottom-10 flex items-end justify-center sm:bottom-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="images/cars/renault-captur.png"
              alt="Renault Captur"
              className="car-reflect drive-in relative z-0 -mr-[14%] w-[42%] max-w-[300px]"
              style={{ animationDelay: "0.45s" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="images/cars/jetour-x70-plus.png"
              alt="Jetour X70 Plus"
              className="car-reflect drive-in relative z-10 w-[56%] max-w-[400px]"
              style={{ animationDelay: "0.25s" }}
              fetchPriority="high"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="images/cars/clio5-alpino.png"
              alt="Renault Clio 5 Alpino"
              className="car-reflect drive-in relative z-20 -ml-[16%] w-[42%] max-w-[300px]"
              style={{ animationDelay: "0.6s" }}
            />
          </div>
        </div>
      </div>

      {/* ── Recherche ── */}
      <div className="relative z-20 mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pb-20">
        <form
          onSubmit={handleSubmit}
          aria-label="Rechercher un véhicule"
          className="rounded-3xl border border-line bg-white p-2 shadow-[0_30px_60px_-30px_rgba(15,27,45,0.3)] lg:p-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <label className="flex flex-col gap-1.5 rounded-2xl px-5 py-4 focus-within:bg-mist lg:flex-[1.5] lg:px-6">
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
                  className={`${fieldInput} mt-1 border-b border-line pb-1 text-sm`}
                />
              )}
            </label>

            <span className="mx-5 h-px bg-line lg:mx-0 lg:my-3 lg:h-auto lg:w-px" />

            <div className="grid grid-cols-2 lg:flex lg:flex-[2]">
              <label className="flex flex-col gap-1.5 rounded-2xl px-5 py-4 focus-within:bg-mist lg:flex-1 lg:px-6">
                <span className={fieldLabel}>Départ</span>
                <input type="date" min={today} value={departDate} onChange={(e) => setDepartDate(e.target.value)} className={fieldInput} />
              </label>
              <label className="flex flex-col gap-1.5 rounded-2xl border-l border-line px-5 py-4 focus-within:bg-mist lg:flex-1 lg:px-6">
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

            <span className="mx-5 h-px bg-line lg:mx-0 lg:my-3 lg:h-auto lg:w-px" />

            <label className="flex flex-col gap-1.5 rounded-2xl px-5 py-4 focus-within:bg-mist lg:flex-1 lg:px-6">
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
              className="m-1 mt-2 flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-navy px-8 text-[15px] font-bold text-white transition-colors hover:bg-navy-soft lg:m-0 lg:ml-2 lg:h-auto lg:self-stretch"
            >
              <Search className="h-[18px] w-[18px]" />
              Rechercher
            </button>
          </div>

          <div className="flex flex-col gap-3 border-t border-line px-5 pb-2 pt-3 sm:flex-row sm:items-center lg:mt-2 lg:px-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-muted">
              <input
                type="checkbox"
                checked={differentReturn}
                onChange={(e) => setDifferentReturn(e.target.checked)}
                className="h-[18px] w-[18px] accent-sky"
              />
              Retour dans un autre lieu
            </label>
            {differentReturn && (
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  aria-label="Lieu de retour"
                  value={returnPlace}
                  onChange={(e) => setReturnPlace(e.target.value)}
                  className="h-10 rounded-xl bg-mist px-3 text-sm font-semibold text-navy outline-none"
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
                    className="h-10 flex-1 rounded-xl bg-mist px-3 text-sm font-semibold text-navy outline-none placeholder:text-muted/70"
                  />
                )}
              </div>
            )}
            <a
              href={whatsappLink(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-whatsapp hover:underline sm:ml-auto"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Envoyer ma demande sur WhatsApp
            </a>
          </div>
        </form>
      </div>
    </section>
  );
}
