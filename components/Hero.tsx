"use client";

import { useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, Search, Check } from "lucide-react";
import { AlgiersSkyline, BlueBar, PalmShadow } from "./Brand";
import { WhatsAppIcon } from "./FloatingWhatsApp";
import { HeroCars } from "./HeroCars";
import { FILTER_EVENT, categoryInfo, site, whatsappLink } from "@/lib/site";
import { AVAILABILITY_EVENT, type AvailabilitySearch } from "@/lib/booking";
import { dateLocale, useLang } from "@/lib/i18n";

const HOME = "__domicile__";
/** Libellé attendu par le formulaire de réservation de l'espace client */
const HOME_LABEL = "Livraison à domicile";

const ease = [0.22, 1, 0.36, 1] as const;

/** Titre révélé mot par mot, chaque mot glisse hors d'un masque. */
function RevealWords({ text, className, delay = 0, reduce }: { text: string; className?: string; delay?: number; reduce: boolean }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className={`inline-block ${className ?? ""}`}
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: delay + i * 0.08, ease }}
          >
            {w}
            {"\u00a0"}
          </motion.span>
        </span>
      ))}
    </>
  );
}

const categories = [
  { id: "all", label: "Toutes" },
  ...Object.entries(categoryInfo).map(([id, c]) => ({ id, label: c.label })),
];

const trust = ["Assistance 24/7", "Prix clairs, sans surprise", "Annulation gratuite 24h avant"];

const fieldLabel = "text-[11px] font-bold uppercase tracking-[0.2em] text-muted";
const fieldInput = "w-full appearance-none bg-transparent p-0 text-[15px] font-bold text-navy outline-none placeholder:text-muted/70";

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString(dateLocale(), { day: "numeric", month: "long" });
}

export function Hero() {
  const { t, lang } = useLang();
  const today = new Date().toISOString().split("T")[0];

  const [pickup, setPickup] = useState<string>(site.agencies[0]);
  const [pickupAddress, setPickupAddress] = useState("");
  const [differentReturn, setDifferentReturn] = useState(false);
  const [returnPlace, setReturnPlace] = useState<string>(site.agencies[0]);
  const [returnAddress, setReturnAddress] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [retourDate, setRetourDate] = useState("");
  const [category, setCategory] = useState("all");
  const [formError, setFormError] = useState("");

  const reduce = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const palmY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 220]);
  const palmRotate = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 8]);
  const skylineY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0.15]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (departDate || retourDate) {
      if (!departDate || !retourDate) return setFormError(t("Choisissez une date de départ et une date de retour."));
      if (retourDate <= departDate) return setFormError(t("La date de retour doit être après la date de départ."));
      const toLabel = (p: string) => (p === HOME ? HOME_LABEL : p);
      const detail: AvailabilitySearch = {
        start: departDate,
        end: retourDate,
        category,
        pickupPlace: toLabel(pickup),
        pickupAddress: pickup === HOME ? pickupAddress : "",
        returnPlace: toLabel(differentReturn ? returnPlace : pickup === HOME ? site.agencies[0] : pickup),
        returnAddress: differentReturn && returnPlace === HOME ? returnAddress : "",
      };
      window.dispatchEvent(new CustomEvent(AVAILABILITY_EVENT, { detail }));
    } else {
      window.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: category }));
    }
    document.getElementById("vehicules")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  // Message WhatsApp pré-rempli avec la recherche du visiteur
  const place = (p: string, addr: string) =>
    p === HOME ? t("à domicile ({address})", { address: addr || t("adresse à préciser") }) : t(p);
  const waMessage = [
    t("Bonjour MYLOC.DZ, je souhaite louer un véhicule."),
    t("Retrait : {place}", { place: place(pickup, pickupAddress) }),
    differentReturn ? t("Retour : {place}", { place: place(returnPlace, returnAddress) }) : "",
    departDate
      ? retourDate
        ? t("Du {start} au {end}", { start: formatDate(departDate), end: formatDate(retourDate) })
        : t("À partir du {start}", { start: formatDate(departDate) })
      : "",
    category !== "all" ? t("Catégorie : {category}", { category: t(categoryInfo[category]?.label ?? category) }) : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section ref={sectionRef} id="accueil" className="bg-brand-mist relative overflow-hidden pt-24 lg:pt-28">
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ y: palmY, rotate: palmRotate }}>
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.6, ease }}
        >
          <PalmShadow className="palm-sway -left-24 -top-10 w-[420px] opacity-25 sm:w-[560px]" />
          <PalmShadow flip className="palm-sway-slow -right-32 top-40 hidden w-[480px] opacity-15 lg:block" />
        </motion.div>
      </motion.div>
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 lg:h-56" style={{ y: skylineY }}>
        <AlgiersSkyline className="inset-0 h-full w-full text-navy opacity-[0.05]" />
      </motion.div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:px-8">
        {/* ── Texte ── */}
        <motion.div className="relative z-10 flex flex-col gap-6 pt-6 lg:pt-10" style={{ y: textY, opacity: textOpacity }}>
          <span className="fade-up kicker text-navy/80" style={{ animationDelay: "0.05s" }}>
            {t("Location de véhicules en")} <strong className="font-extrabold text-navy">{t("Algérie")}</strong>
          </span>
          <h1 className="text-[42px] font-extrabold uppercase leading-[1] tracking-[-0.015em] text-navy sm:text-6xl lg:text-[68px]">
            {lang === "ar" ? (
              <>
                <RevealWords text={t("Votre mobilité,")} className="text-sky-shimmer" reduce={reduce} delay={0.1} />
                <br />
                <RevealWords text={t("notre priorité")} reduce={reduce} delay={0.26} />
              </>
            ) : (
              <>
                <RevealWords text="Votre" reduce={reduce} delay={0.1} />
                <RevealWords text="mobilité," className="text-sky-shimmer" reduce={reduce} delay={0.18} />
                <br />
                <RevealWords text="notre priorité" reduce={reduce} delay={0.32} />
              </>
            )}
          </h1>
          <motion.span
            className="block origin-left rtl:origin-right"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease }}
          >
            <BlueBar className="w-16" />
          </motion.span>
          <p
            className="fade-up max-w-lg text-[15px] font-semibold uppercase leading-relaxed tracking-[0.06em] text-ink-soft sm:text-base"
            style={{ animationDelay: "0.25s" }}
          >
            {t("Une équipe professionnelle à votre service, partout en Algérie.")}
          </p>

          <div className="fade-up flex flex-wrap items-center gap-3" style={{ animationDelay: "0.35s" }}>
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center gap-2.5 rounded-full bg-sky px-7 text-[15px] font-bold text-navy shadow-[0_14px_30px_-12px_rgba(67,176,230,0.8)] transition-colors hover:bg-sky-mid hover:text-white"
            >
              <WhatsAppIcon className="h-5 w-5" />
              {t("Réserver sur WhatsApp")}
            </a>
            <a
              href="#vehicules"
              className="inline-flex h-14 items-center gap-2 rounded-full border-2 border-navy px-6 text-[15px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              {t("Voir la flotte")}
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          <ul className="fade-up flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-semibold text-muted" style={{ animationDelay: "0.45s" }}>
            {trust.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-soft">
                  <Check className="h-3 w-3 text-sky-text" strokeWidth={3} />
                </span>
                {t(item)}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* ── Groupe de voitures, comme sur les posts ── */}
        <HeroCars scrollYProgress={scrollYProgress} reduce={reduce} />
      </div>

      {/* ── Recherche ── */}
      <div className="relative z-20 mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pb-20">
        <motion.form
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease }}
          onSubmit={handleSubmit}
          aria-label={t("Rechercher un véhicule")}
          className="rounded-3xl border border-line bg-white p-2 shadow-[0_30px_60px_-30px_rgba(15,27,45,0.3)] lg:p-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <label className="flex flex-col gap-1.5 rounded-2xl px-5 py-4 focus-within:bg-mist lg:flex-[1.5] lg:px-6">
              <span className={fieldLabel}>{t("Retrait")}</span>
              <select className={fieldInput} value={pickup} onChange={(e) => setPickup(e.target.value)}>
                {site.agencies.map((a) => (
                  <option key={a} value={a}>
                    {t(a)}
                  </option>
                ))}
                <option value={HOME}>{t("Livraison à domicile")}</option>
              </select>
              {pickup === HOME && (
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder={t("Votre adresse")}
                  aria-label={t("Adresse de livraison")}
                  className={`${fieldInput} mt-1 border-b border-line pb-1 text-sm`}
                />
              )}
            </label>

            <span className="mx-5 h-px bg-line lg:mx-0 lg:my-3 lg:h-auto lg:w-px" />

            <div className="grid grid-cols-2 lg:flex lg:flex-[2]">
              <label className="flex flex-col gap-1.5 rounded-2xl px-5 py-4 focus-within:bg-mist lg:flex-1 lg:px-6">
                <span className={fieldLabel}>{t("Départ")}</span>
                <input type="date" min={today} value={departDate} onChange={(e) => setDepartDate(e.target.value)} className={fieldInput} />
              </label>
              <label className="flex flex-col gap-1.5 rounded-2xl border-s border-line px-5 py-4 focus-within:bg-mist lg:flex-1 lg:px-6">
                <span className={fieldLabel}>{t("Retour||date")}</span>
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
              <span className={fieldLabel}>{t("Catégorie")}</span>
              <select className={fieldInput} value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.label)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="shine m-1 mt-2 flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-navy px-8 text-[15px] font-bold text-white transition-colors hover:bg-navy-soft lg:m-0 lg:ms-2 lg:h-auto lg:self-stretch"
            >
              <Search className="h-[18px] w-[18px]" />
              {departDate && retourDate ? t("Voir les dispos") : t("Rechercher")}
            </button>
          </div>
          {formError && (
            <p role="alert" className="mx-3 mb-1 mt-2 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
              {formError}
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-line px-5 pb-2 pt-3 sm:flex-row sm:items-center lg:mt-2 lg:px-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-muted">
              <input
                type="checkbox"
                checked={differentReturn}
                onChange={(e) => setDifferentReturn(e.target.checked)}
                className="h-[18px] w-[18px] accent-sky"
              />
              {t("Retour dans un autre lieu")}
            </label>
            {differentReturn && (
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  aria-label={t("Lieu de retour")}
                  value={returnPlace}
                  onChange={(e) => setReturnPlace(e.target.value)}
                  className="h-10 rounded-xl bg-mist px-3 text-sm font-semibold text-navy outline-none"
                >
                  {site.agencies.map((a) => (
                    <option key={a} value={a}>
                      {t(a)}
                    </option>
                  ))}
                  <option value={HOME}>{t("Récupération à domicile")}</option>
                </select>
                {returnPlace === HOME && (
                  <input
                    type="text"
                    value={returnAddress}
                    onChange={(e) => setReturnAddress(e.target.value)}
                    placeholder={t("Adresse de récupération")}
                    aria-label={t("Adresse de récupération")}
                    className="h-10 flex-1 rounded-xl bg-mist px-3 text-sm font-semibold text-navy outline-none placeholder:text-muted/70"
                  />
                )}
              </div>
            )}
            <a
              href={whatsappLink(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-whatsapp hover:underline sm:ms-auto"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {t("Envoyer ma demande sur WhatsApp")}
            </a>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
