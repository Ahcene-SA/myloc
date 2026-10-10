"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CalendarX2, CheckCircle2, Cog, Armchair, Loader2, MapPin, Tag } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useClient } from "../ClientContext";
import { WhatsAppIcon } from "../FloatingWhatsApp";
import {
  apiImageUrl,
  createReservation,
  fetchBookedRanges,
  fetchQuote,
  type BookedRange,
  type PricingQuote,
  type PaymentMethod,
  type ReservationFromApi,
} from "@/lib/api";
import { categoryInfo, site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { dateLocale, useLang } from "@/lib/i18n";
import {
  Card,
  EmptyState,
  ErrorBlock,
  HOME_PICKUP_PREFIX,
  LoadingBlock,
  PageTitle,
  categoryLabel,
  daysBetween,
  daysLabel,
  formatDate,
  formatPrice,
  inputClass,
  labelClass,
  paymentLabels,
  primaryBtn,
  reservationRef,
  reservationWhatsApp,
  secondaryBtn,
  splitCarName,
  todayIso,
  whatsappRecap,
} from "./shared";

// Valeur envoyée au serveur (en français) : seul l'affichage est traduit avec t(HOME).
const HOME = "Livraison à domicile";
const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
}); // 08:00 → 20:00

// Libellés traduits au rendu
const STEPS = ["Véhicule", "Dates & lieux", "Conducteur", "Confirmation"];
const MAX_DAYS = 90;
/** Âge minimum du conducteur (contrôlé aussi côté serveur). */
const MIN_DRIVER_AGE = 18;
/** Mois affichés dans les listes de naissance (traduits par t()). */
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

interface FormState {
  pickupPlace: string;
  pickupAddress: string;
  pickupDate: string;
  pickupTime: string;
  differentReturn: boolean;
  returnPlace: string;
  returnAddress: string;
  returnDate: string;
  returnTime: string;
  fullName: string;
  email: string;
  phone: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  license: string;
  licenseConfirmed: boolean;
  note: string;
  payment: PaymentMethod;
  accepted: boolean;
}

/**
 * Brouillon de la réservation en cours (onglet courant uniquement) : changer de langue
 * ré-affiche toute l'application, le formulaire est ainsi retrouvé tel quel.
 * Effacé à l'envoi et à la déconnexion (voir AuthContext).
 */
const DRAFT_KEY = "myloc_reserver_draft";
const DRAFT_TTL = 2 * 3600_000;

interface Draft {
  origin: string;
  savedAt: number;
  step: number;
  carId: number | null;
  category: string;
  form: FormState;
  promoInput: string;
  appliedCode: string;
}

function readDraft(origin: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (d.origin !== origin || !d.form || Date.now() - d.savedAt > DRAFT_TTL) return null;
    return d;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* navigation privée */
  }
}

function transmissionLabel(t?: string) {
  const v = (t || "").toLowerCase();
  return v.startsWith("auto") ? "Automatique" : v.startsWith("manu") ? "Manuelle" : t || "";
}

export function ReserverView() {
  const { user } = useAuth();
  const { t } = useLang();
  const { cars, loading, error, refresh, preselectedCarId, bookingPrefill, upsertReservation, setActiveTab } = useClient();

  // Même clé que dans ClientContent : un brouillon ne sert que pour la même entrée
  const origin = String(preselectedCarId ?? "all");
  const [draft] = useState(() => (bookingPrefill ? null : readDraft(origin)));

  const [step, setStep] = useState(draft?.step ?? (preselectedCarId ? 2 : 1));
  const [carId, setCarId] = useState<number | null>(draft ? draft.carId : preselectedCarId);
  const [category, setCategory] = useState(draft?.category ?? "all");
  const [bookedState, setBookedState] = useState<{ carId: number | null; ranges: BookedRange[] }>({ carId: null, ranges: [] });
  const [stepError, setStepError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<ReservationFromApi | null>(null);
  // Écran intermédiaire : avant l'envoi de la demande, le récapitulatif passe d'abord par WhatsApp
  const [confirmWa, setConfirmWa] = useState(false);
  // Le bouton « terminer » ne s'active qu'après un appui sur le bouton WhatsApp
  const [waSent, setWaSent] = useState(false);

  const [form, setForm] = useState<FormState>(() => {
    if (draft?.form) {
      // Brouillon antérieur à l'ajout de la date de naissance : les champs manquants sont créés
      const legacy = draft.form;
      return {
        ...legacy,
        birthDay: legacy.birthDay ?? "",
        birthMonth: legacy.birthMonth ?? "",
        birthYear: legacy.birthYear ?? "",
      };
    }
    return {
      pickupPlace: bookingPrefill?.pickupPlace || site.agencies[0],
      pickupAddress: bookingPrefill?.pickupAddress || "",
      pickupDate: bookingPrefill?.start || "",
      pickupTime: "10:00",
      differentReturn: !!bookingPrefill?.returnPlace && bookingPrefill.returnPlace !== bookingPrefill.pickupPlace,
      returnPlace: bookingPrefill?.returnPlace || site.agencies[0],
      returnAddress: bookingPrefill?.returnAddress || "",
      returnDate: bookingPrefill?.end || "",
      returnTime: "10:00",
      fullName: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      birthDay: "",
      birthMonth: "",
      birthYear: "",
      license: "",
      licenseConfirmed: false,
      note: "",
      payment: "especes",
      accepted: false,
    };
  });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const car = cars.find((c) => c.id === carId) || null;

  /** Date de naissance reconstruite (AAAA-MM-JJ), vide si incomplète. */
  const birthIso =
    form.birthDay && form.birthMonth && form.birthYear
      ? `${form.birthYear}-${form.birthMonth.padStart(2, "0")}-${form.birthDay.padStart(2, "0")}`
      : "";
  // Années proposées : de la plus récente autorisée (18 ans) vers le passé
  const birthYears = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - MIN_DRIVER_AGE - i);

  useEffect(() => {
    if (!carId) return;
    let cancelled = false;
    fetchBookedRanges(carId)
      .then((ranges) => !cancelled && setBookedState({ carId, ranges }))
      .catch(() => !cancelled && setBookedState({ carId, ranges: [] }));
    return () => {
      cancelled = true;
    };
  }, [carId]);
  const booked = useMemo(() => (bookedState.carId === carId ? bookedState.ranges : []), [bookedState, carId]);

  const days = daysBetween(form.pickupDate, form.returnDate);

  // Devis serveur : remise code promo (créée et choisie par l'agence)
  const [promoInput, setPromoInput] = useState(draft?.promoInput ?? "");
  const [appliedCode, setAppliedCode] = useState(draft?.appliedCode ?? "");
  const quoteKey = car && days > 0 ? `${car.id}|${form.pickupDate}|${form.returnDate}|${appliedCode}` : "";
  const [quoteState, setQuoteState] = useState<{ key: string; quote: PricingQuote | null; failed: boolean }>({
    key: "",
    quote: null,
    failed: false,
  });
  useEffect(() => {
    if (!quoteKey || !car) return;
    let cancelled = false;
    fetchQuote(car.id, form.pickupDate, form.returnDate, appliedCode || undefined)
      .then((q) => !cancelled && setQuoteState({ key: quoteKey, quote: q, failed: false }))
      .catch(() => !cancelled && setQuoteState({ key: quoteKey, quote: null, failed: true }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);
  const quote = quoteState.key === quoteKey ? quoteState.quote : null;
  const quoting = !!quoteKey && quoteState.key !== quoteKey;
  // Devis impossible (réseau, serveur) : pas de total inventé, l'agence confirmera le prix
  const quoteFailed = !!quoteKey && quoteState.key === quoteKey && quoteState.failed;
  const totalLabel = !car || days < 1 ? "—" : quote ? formatPrice(quote.total_price) : quoteFailed ? null : "…";

  // Sauvegarde du brouillon à chaque modification
  useEffect(() => {
    if (done) return;
    try {
      const d: Draft = { origin, savedAt: Date.now(), step, carId, category, form, promoInput, appliedCode };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* navigation privée */
    }
  }, [origin, step, carId, category, form, promoInput, appliedCode, done]);
  const conflict = useMemo(
    () =>
      !!form.pickupDate &&
      !!form.returnDate &&
      booked.some((b) => form.pickupDate < b.end_date && form.returnDate > b.start_date),
    [booked, form.pickupDate, form.returnDate]
  );

  const categories = useMemo(() => {
    const present = new Set(cars.map((c) => c.category?.toLowerCase()));
    return [
      { id: "all", label: "Tous" },
      ...Object.entries(categoryInfo)
        .filter(([id]) => present.has(id))
        .map(([id, c]) => ({ id, label: c.plural })),
    ];
  }, [cars]);
  const visibleCars = cars.filter((c) => category === "all" || c.category?.toLowerCase() === category);

  const validate = (s: number): string => {
    if (s === 1 && !car) return t("Choisissez un véhicule.");
    if (s === 2) {
      if (!form.pickupDate || !form.returnDate) return t("Indiquez vos dates de départ et de retour.");
      if (form.pickupDate < todayIso()) return t("La date de départ ne peut pas être dans le passé.");
      if (days < 1) return t("La date de retour doit être après la date de départ.");
      if (days > MAX_DAYS) return t("La location en ligne est limitée à {max} jours. Contactez-nous pour une longue durée.", { max: MAX_DAYS });
      if (conflict) return t("Ce véhicule est déjà réservé sur une partie de ces dates.");
      if (form.pickupPlace === HOME && form.pickupAddress.trim().length < 5) return t("Indiquez l'adresse de livraison.");
      if (form.differentReturn && form.returnPlace === HOME && form.returnAddress.trim().length < 5)
        return t("Indiquez l'adresse de récupération.");
    }
    if (s === 3) {
      if (form.fullName.trim().length < 2) return t("Indiquez le nom du conducteur.");
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return t("Adresse email invalide.");
      if (form.phone.trim().length < 5) return t("Indiquez un numéro de téléphone.");
      if (!birthIso) return t("Indiquez la date de naissance du conducteur.");
      if (Number(form.birthDay) > new Date(Number(form.birthYear), Number(form.birthMonth), 0).getDate())
        return t("Cette date de naissance n'existe pas.");
      // Date d'anniversaire des 18 ans : si elle est à venir, le conducteur est trop jeune
      if (`${Number(form.birthYear) + MIN_DRIVER_AGE}-${form.birthMonth.padStart(2, "0")}-${form.birthDay.padStart(2, "0")}` > todayIso())
        return t("Le conducteur doit avoir au moins {age} ans.", { age: MIN_DRIVER_AGE });
      if (form.license.trim().length < 4) return t("Indiquez le numéro de permis de conduire.");
      if (!form.licenseConfirmed) return t("Confirmez que le conducteur a un permis valide.");
    }
    if (s === 4 && !form.accepted) return t("Cochez la case de confirmation pour envoyer la demande.");
    return "";
  };

  const goTo = (target: number) => {
    for (let s = 1; s < target; s++) {
      const err = validate(s);
      if (err) {
        setStep(s);
        setStepError(err);
        return;
      }
    }
    setStepError("");
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** « Envoyer ma demande » : le formulaire est validé, puis on passe par l'écran
   *  WhatsApp — la réservation ne part vers le serveur qu'après (voir submit). */
  const requestWhatsApp = () => {
    const err = validate(4);
    if (err) return setStepError(err);
    setStepError("");
    setWaSent(false);
    setConfirmWa(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const err = validate(4);
    if (err) return setStepError(err);
    if (!car) return;
    if (!confirmWa) return requestWhatsApp();
    setSending(true);
    setStepError("");
    const returnPlace = form.differentReturn ? form.returnPlace : form.pickupPlace;
    const returnAddress = form.differentReturn ? form.returnAddress : form.pickupAddress;
    try {
      const res = await createReservation({
        car_id: car.id,
        start_date: form.pickupDate,
        end_date: form.returnDate,
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        birth_date: birthIso,
        pickup_place: form.pickupPlace,
        pickup_time: form.pickupTime,
        return_place: returnPlace === HOME ? `${HOME_PICKUP_PREFIX}${returnAddress.trim()}`.slice(0, 150) : returnPlace,
        return_time: form.returnTime,
        delivery_address: form.pickupPlace === HOME ? form.pickupAddress.trim() : undefined,
        license_number: form.license.trim(),
        payment_method: form.payment,
        client_note: form.note.trim() || undefined,
        // Le code saisi est envoyé tel quel : le serveur recalcule la meilleure remise
        promo_code: appliedCode || undefined,
      });
      const saved: ReservationFromApi = {
        ...(res.reservation as ReservationFromApi),
        car_name: car.name,
        car_category: car.category,
        car_image_url: car.image_url,
      };
      upsertReservation(saved);
      clearDraft();
      setConfirmWa(false);
      setDone(saved);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setStepError(e instanceof Error ? e.message : t("L'envoi a échoué, réessayez."));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  /* ─────────── Écran de confirmation ─────────── */
  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center sm:px-12">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/20">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-slate-500">{t("Demande envoyée")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("Merci {name} !", { name: form.fullName.split(" ")[0] })}</h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            {t(
              "Votre demande {ref} pour la {car} du {start} au {end} est en attente de confirmation par l'agence. Vous suivrez son statut dans « Mes réservations ».",
              {
                ref: reservationRef(done.id),
                car: done.car_name || "",
                start: formatDate(done.start_date),
                end: formatDate(done.end_date),
              }
            )}
          </p>
          <p className="text-xl font-semibold tabular-nums text-slate-900">{formatPrice(done.total_price)}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setActiveTab("reservations")} className={cn(primaryBtn, "w-full sm:w-auto")}>
              {t("Voir mes réservations")}
            </button>
            <a href={reservationWhatsApp(done)} target="_blank" rel="noopener noreferrer" className={cn(secondaryBtn, "w-full sm:w-auto")}>
              <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
              {t("Prévenir l'agence sur WhatsApp")}
            </a>
          </div>
        </Card>
      </div>
    );
  }

  /* ─────────── Écran intermédiaire : WhatsApp avant l'envoi ─────────── */
  if (confirmWa && car && !done) {
    const returnPlace = form.differentReturn ? form.returnPlace : form.pickupPlace;
    const returnAddress = form.differentReturn ? form.returnAddress : form.pickupAddress;
    const waLink = whatsappRecap({
      id: null,
      car_name: car.name,
      car_price_per_day: car.price_per_day,
      start_date: form.pickupDate,
      pickup_time: form.pickupTime,
      pickup_place: form.pickupPlace === HOME ? `${HOME} : ${form.pickupAddress.trim()}` : form.pickupPlace,
      end_date: form.returnDate,
      return_time: form.returnTime,
      return_place: returnPlace === HOME ? `${HOME_PICKUP_PREFIX}${returnAddress.trim()}`.slice(0, 150) : returnPlace,
      total_price: quote?.total_price ?? null,
      payment_method: form.payment,
      full_name: form.fullName.trim(),
      birth_date: birthIso || null,
      phone: form.phone.trim(),
      email: form.email.trim(),
      client_note: form.note.trim() || null,
    }, "⏳ Réservation en cours — le client finalise sa demande sur mylocdz.com.");
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center sm:px-12">
          <WhatsAppIcon className="h-10 w-10 text-whatsapp" />
          <p className="text-sm font-medium text-slate-500">{t("Avant l'envoi de votre demande")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("Envoyez le récapitulatif sur WhatsApp")}</h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            {t(
              "Votre demande n'est pas encore envoyée : ouvrez WhatsApp avec le bouton — le récapitulatif complet (véhicule, dates, coordonnées) est déjà rédigé, il ne reste qu'à l'envoyer à l'agence. Revenez ensuite ici pour terminer."
            )}
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setWaSent(true)}
            className={cn(primaryBtn, "h-auto w-full whitespace-normal py-2 sm:h-9 sm:w-auto sm:whitespace-nowrap")}
          >
            <WhatsAppIcon className="h-4 w-4" />
            {t("Envoyer le récapitulatif sur WhatsApp")}
          </a>
          <p className="max-w-md text-xs text-slate-500">{t("La réservation n'est enregistrée qu'à l'étape suivante : rien n'a encore été envoyé à l'agence.")}</p>
          {stepError && (
            <p role="alert" className="mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {stepError}
            </p>
          )}
          <button type="button" onClick={submit} disabled={sending || !waSent} className={cn(primaryBtn, "h-auto w-full whitespace-normal py-2 sm:h-9 sm:w-auto sm:whitespace-nowrap")}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("J'ai envoyé le message — terminer ma réservation")}
          </button>
          {!waSent && !sending && <p className="max-w-md text-xs text-slate-500">{t("Ce bouton s'activera une fois le message envoyé sur WhatsApp.")}</p>}
          <button type="button" onClick={() => { setConfirmWa(false); setStepError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={secondaryBtn}>
            <ArrowLeft className="flip-rtl h-4 w-4" />
            {t("Modifier ma demande")}
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle kicker={t("Nouvelle réservation")} title={t("Réserver un véhicule")} />

      {/* Étapes */}
      <p className="mb-2 text-sm font-medium text-slate-900 sm:hidden" aria-live="polite">
        {t("Étape {n}/{total} · {label}", { n: step, total: STEPS.length, label: t(STEPS[step - 1]) })}
      </p>
      <ol className="mb-6 grid grid-cols-4 gap-3" aria-label={t("Étapes de la réservation")}>
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "current" : "todo";
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => n < step && goTo(n)}
                disabled={n >= step}
                aria-current={state === "current" ? "step" : undefined}
                aria-label={t("Étape {n}/{total} · {label}", { n, total: STEPS.length, label: t(label) })}
                className="flex w-full flex-col gap-2 text-start disabled:cursor-default"
              >
                <span className={cn("h-1 rounded-full", state === "todo" ? "bg-slate-200" : "bg-sky")} />
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
                      state === "done" && "bg-sky text-white",
                      state === "current" && "bg-navy text-white",
                      state === "todo" && "bg-white text-slate-500 ring-1 ring-inset ring-slate-300"
                    )}
                  >
                    {state === "done" ? <Check className="h-3.5 w-3.5" /> : n}
                  </span>
                  <span className={cn("hidden sm:inline", state === "todo" ? "text-slate-500" : "text-slate-900")}>{t(label)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {/* ── Étape 1 : véhicule ── */}
          {step === 1 &&
            (cars.length === 0 ? (
              <EmptyState
                title={t("Aucun véhicule disponible")}
                text={t("La flotte est vide pour le moment. Contactez l'agence sur WhatsApp.")}
              />
            ) : (
              <>
                <div className="no-scrollbar -mx-1 mb-4 overflow-x-auto px-1">
                <div className="inline-flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      aria-pressed={category === c.id}
                      className={cn(
                        "h-8 flex-shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors",
                        category === c.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {t(c.label)}
                    </button>
                  ))}
                </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {visibleCars.map((c) => {
                    const selected = c.id === carId;
                    const { brand, model } = splitCarName(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCarId(c.id);
                          setStepError("");
                        }}
                        aria-pressed={selected}
                        className={cn(
                          "group flex flex-col overflow-hidden rounded-lg border bg-white text-start shadow-sm transition-colors",
                          selected ? "border-sky ring-1 ring-sky" : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <span className="relative flex h-32 items-center justify-center border-b border-slate-200 bg-slate-50 px-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={apiImageUrl(c.image_url)} alt={c.name} className="max-h-24 w-auto object-contain" />
                          {selected && (
                            <span className="absolute end-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky text-white">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </span>
                        <span className="flex flex-1 flex-col gap-1.5 p-4">
                          <span className="text-xs text-slate-500">{categoryLabel(c.category)}</span>
                          <span className="text-sm font-semibold leading-tight text-slate-900">
                            <bdi dir="ltr">
                              {brand} {model}
                            </bdi>
                          </span>
                          <span className="flex gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Cog className="h-3.5 w-3.5" />
                              {t(transmissionLabel(c.transmission))}
                            </span>
                            <span className="flex items-center gap-1">
                              <Armchair className="h-3.5 w-3.5" />
                              {c.seats} {t("places")}
                            </span>
                          </span>
                          <span className="mt-auto pt-2 text-base font-semibold tabular-nums text-slate-900">
                            {formatPrice(c.price_per_day)} <span className="text-xs font-normal text-slate-500">/ {t("jour")}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ))}

          {/* ── Étape 2 : dates & lieux ── */}
          {step === 2 && (
            <Card className="flex flex-col gap-6 p-5 sm:p-6">
              <fieldset className="grid gap-4 sm:grid-cols-[1.4fr_1fr_0.8fr]">
                <legend className="mb-3 text-sm font-semibold text-slate-900">{t("Départ")}</legend>
                <label>
                  <span className={labelClass}>{t("Lieu de retrait")}</span>
                  <select className={inputClass} value={form.pickupPlace} onChange={(e) => set("pickupPlace", e.target.value)}>
                    {site.agencies.map((a) => (
                      <option key={a} value={a}>
                        {t(a)}
                      </option>
                    ))}
                    <option value={HOME}>{t(HOME)}</option>
                  </select>
                </label>
                <label>
                  <span className={labelClass}>{t("Date")}</span>
                  <input type="date" className={inputClass} min={todayIso()} value={form.pickupDate} onChange={(e) => set("pickupDate", e.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>{t("Heure")}</span>
                  <select className={inputClass} value={form.pickupTime} onChange={(e) => set("pickupTime", e.target.value)}>
                    {HOURS.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
                {form.pickupPlace === HOME && (
                  <label className="sm:col-span-3">
                    <span className={labelClass}>{t("Adresse de livraison")}</span>
                    <input className={inputClass} value={form.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} placeholder={t("Rue, commune, wilaya")} />
                  </label>
                )}
              </fieldset>

              <fieldset className="grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-[1.4fr_1fr_0.8fr]">
                <legend className="mb-3 text-sm font-semibold text-slate-900">{t("Retour||date")}</legend>
                <label className="flex items-center gap-2.5 text-sm text-slate-700 sm:col-span-3">
                  <input type="checkbox" className="h-4 w-4 accent-sky" checked={form.differentReturn} onChange={(e) => set("differentReturn", e.target.checked)} />
                  {t("Rendre le véhicule dans un autre lieu")}
                </label>
                {form.differentReturn ? (
                  <label>
                    <span className={labelClass}>{t("Lieu de retour")}</span>
                    <select className={inputClass} value={form.returnPlace} onChange={(e) => set("returnPlace", e.target.value)}>
                      {site.agencies.map((a) => (
                        <option key={a} value={a}>
                          {t(a)}
                        </option>
                      ))}
                      <option value={HOME}>{t(HOME)}</option>
                    </select>
                  </label>
                ) : (
                  <div>
                    <span className={labelClass}>{t("Lieu de retour")}</span>
                    <p className="flex h-9 items-center gap-2 text-sm text-slate-900">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {form.pickupPlace === HOME ? t("Récupération à domicile") : t(form.pickupPlace)}
                    </p>
                  </div>
                )}
                <label>
                  <span className={labelClass}>{t("Date")}</span>
                  <input
                    type="date"
                    className={inputClass}
                    min={form.pickupDate || todayIso(1)}
                    value={form.returnDate}
                    onChange={(e) => set("returnDate", e.target.value)}
                  />
                </label>
                <label>
                  <span className={labelClass}>{t("Heure")}</span>
                  <select className={inputClass} value={form.returnTime} onChange={(e) => set("returnTime", e.target.value)}>
                    {HOURS.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
                {form.differentReturn && form.returnPlace === HOME && (
                  <label className="sm:col-span-3">
                    <span className={labelClass}>{t("Adresse de récupération")}</span>
                    <input className={inputClass} value={form.returnAddress} onChange={(e) => set("returnAddress", e.target.value)} placeholder={t("Rue, commune, wilaya")} />
                  </label>
                )}
              </fieldset>

              {booked.length > 0 && (
                <div className={cn("flex gap-3 rounded-md border px-3 py-2.5 text-sm", conflict ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-600")}>
                  <CalendarX2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{conflict ? t("Ces dates ne sont pas disponibles") : t("Périodes déjà réservées pour ce véhicule")}</p>
                    <ul className="mt-1 space-y-0.5">
                      {booked.map((b) => (
                        <li key={`${b.start_date}-${b.end_date}`}>
                          {t("Du {start} au {end}", { start: formatDate(b.start_date), end: formatDate(b.end_date) })}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ── Étape 3 : conducteur ── */}
          {step === 3 && (
            <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <label className="sm:col-span-2">
                <span className={labelClass}>{t("Nom et prénom du conducteur")}</span>
                <input className={inputClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>{t("Date de naissance du conducteur")}</span>
                <div className="grid grid-cols-[0.6fr_1.1fr_0.8fr] gap-2">
                  <select aria-label={t("Jour de naissance")} className={inputClass} value={form.birthDay} onChange={(e) => set("birthDay", e.target.value)}>
                    <option value="">{t("Jour")}</option>
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                    ))}
                  </select>
                  <select aria-label={t("Mois de naissance")} className={inputClass} value={form.birthMonth} onChange={(e) => set("birthMonth", e.target.value)}>
                    <option value="">{t("Mois")}</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={String(i + 1)}>{t(m)}</option>
                    ))}
                  </select>
                  <select aria-label={t("Année de naissance")} className={inputClass} value={form.birthYear} onChange={(e) => set("birthYear", e.target.value)}>
                    <option value="">{t("Année")}</option>
                    {birthYears.map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </label>
              <label>
                <span className={labelClass}>{t("Email")}</span>
                <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
              </label>
              <label>
                <span className={labelClass}>{t("Téléphone (WhatsApp de préférence)")}</span>
                <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>{t("Numéro de permis de conduire")}</span>
                <input className={inputClass} value={form.license} onChange={(e) => set("license", e.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>{t("Message pour l'agence (facultatif)")}</span>
                <textarea
                  className={cn(inputClass, "h-24 resize-none py-2")}
                  value={form.note}
                  maxLength={1000}
                  onChange={(e) => set("note", e.target.value)}
                  placeholder={t("Siège bébé, numéro de vol, heure d'arrivée…")}
                />
              </label>
              <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" className="mt-0.5 h-4 w-4 flex-shrink-0 accent-sky" checked={form.licenseConfirmed} onChange={(e) => set("licenseConfirmed", e.target.checked)} />
                {t(
                  "Je confirme que le conducteur est titulaire d'un permis de conduire valide et le présentera, avec une pièce d'identité, à la remise des clés."
                )}
              </label>
            </Card>
          )}

          {/* ── Étape 4 : paiement & envoi ── */}
          {step === 4 && car && (
            <Card className="flex flex-col gap-6 p-5 sm:p-6">
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-900">{t("Moyen de paiement")}</p>
                <p className="mb-2 text-sm text-slate-500">{t("Aucun paiement en ligne : vous réglez directement auprès de l'agence.")}</p>
                <p className="mb-4 rounded-md border border-sky/30 bg-sky-soft/50 px-3 py-2.5 text-sm text-slate-700">
                  {t("À prévoir le jour du départ : passeport, permis de conduire et caution de {amount} (espèces ou virement), restituée au retour du véhicule.", {
                    amount: `${site.deposit.toLocaleString(dateLocale())} ${t(site.currency)}`,
                  })}
                </p>
                <div className="grid gap-2">
                  {(Object.keys(paymentLabels) as PaymentMethod[]).map((m) => (
                    <label
                      key={m}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium text-slate-900 transition-colors",
                        form.payment === m ? "border-sky bg-sky-soft/40 ring-1 ring-sky" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <input type="radio" name="payment" className="h-4 w-4 accent-sky" checked={form.payment === m} onChange={() => set("payment", m)} />
                      {t(paymentLabels[m])}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="promo" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Tag className="h-4 w-4 text-slate-400" /> {t("Code promo")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setAppliedCode(promoInput.trim());
                      }
                    }}
                    placeholder={t("Ex. : ETE26")}
                    className={cn(inputClass, "font-mono")}
                    maxLength={40}
                  />
                  <button
                    type="button"
                    onClick={() => setAppliedCode(promoInput.trim())}
                    disabled={!promoInput.trim() || quoting}
                    className={cn(secondaryBtn, "flex-shrink-0")}
                  >
                    {quoting && appliedCode ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Appliquer")}
                  </button>
                </div>
                {appliedCode && quote?.promo && (
                  <p
                    role="status"
                    className={cn(
                      "mt-2 text-sm",
                      quote.promo.valid && quote.promo_code ? "text-emerald-700" : quote.promo.valid ? "text-amber-700" : "text-red-700"
                    )}
                  >
                    {t(quote.promo.message)}
                  </p>
                )}
              </div>

              <dl className="grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">{t("Conducteur")}</dt>
                  <dd className="font-medium text-slate-900">
                    {form.fullName}
                    {birthIso && (
                      <span className="block text-sm font-normal text-slate-500">
                        {t("Né(e) le {date}", { date: formatDate(birthIso) })}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("Contact")}</dt>
                  <dd className="font-medium text-slate-900">
                    {form.phone} · {form.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("Départ")}</dt>
                  <dd className="font-medium text-slate-900">
                    {t("{date} à {time}", { date: formatDate(form.pickupDate, true), time: form.pickupTime })}
                    <br />
                    {form.pickupPlace === HOME ? t("Livraison : {address}", { address: form.pickupAddress }) : t(form.pickupPlace)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("Retour||date")}</dt>
                  <dd className="font-medium text-slate-900">
                    {t("{date} à {time}", { date: formatDate(form.returnDate, true), time: form.returnTime })}
                    <br />
                    {form.differentReturn
                      ? form.returnPlace === HOME
                        ? t("Récupération : {address}", { address: form.returnAddress })
                        : t(form.returnPlace)
                      : form.pickupPlace === HOME
                        ? t("Récupération à domicile")
                        : t(form.pickupPlace)}
                  </dd>
                </div>
              </dl>

              <label className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 flex-shrink-0 accent-sky" checked={form.accepted} onChange={(e) => set("accepted", e.target.checked)} />
                {t(
                  "J'ai compris que ma demande doit être confirmée par l'agence MYLOC.DZ, et que le montant indiqué est réglé à la remise du véhicule."
                )}
              </label>
            </Card>
          )}

          {stepError && (
            <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {stepError}
            </p>
          )}

          {/* Actions : barre collante en bas de l'écran sur mobile/tablette, avec le total
              (le récapitulatif complet est plus bas), en ligne sur grand écran. */}
          <div className="sticky bottom-0 z-20 mt-6 rounded-t-lg border border-b-0 border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-4px_12px_-6px_rgba(15,23,42,0.12)] backdrop-blur xl:static xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-none">
            {car && days > 0 && (
              <div className="mb-3 flex items-center justify-between gap-3 xl:hidden">
                <span className="flex-shrink-0 whitespace-nowrap text-xs text-slate-500">
                  {t("Total")} · {daysLabel(days)}
                </span>
                {totalLabel === null ? (
                  <span className="min-w-0 text-end text-sm font-semibold leading-tight text-amber-800">{t("Prix à confirmer par l'agence")}</span>
                ) : (
                  <span className={cn("text-lg font-semibold tabular-nums text-slate-900 transition-opacity", quoting && "opacity-40")}>{totalLabel}</span>
                )}
              </div>
            )}
            <div className="flex gap-3 sm:justify-between">
              {step > 1 ? (
                <button type="button" onClick={() => goTo(step - 1)} className={secondaryBtn}>
                  <ArrowLeft className="flip-rtl h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">{t("Retour")}</span>
                </button>
              ) : (
                <span className="hidden sm:block" />
              )}
              {step < 4 ? (
                <button type="button" onClick={() => goTo(step + 1)} className={cn(primaryBtn, "flex-1 sm:flex-none")}>
                  {t("Continuer")}
                  <ArrowRight className="flip-rtl h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={requestWhatsApp}
                  // Pas d'envoi pendant le calcul du devis (le code promo doit être vérifié)
                  disabled={sending || quoting}
                  className={cn(primaryBtn, "flex-1 sm:flex-none")}
                >
                  {sending || quoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t("Envoyer ma demande")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Récapitulatif ── */}
        {/* Sur mobile, pas de récapitulatif vide tant qu'aucun véhicule n'est choisi */}
        <aside className={cn("xl:sticky xl:top-8 xl:self-start", !car && "hidden xl:block")}>
          <Card className="overflow-hidden">
            <div className="flex h-32 items-center justify-center border-b border-slate-200 bg-slate-50 px-6">
              {car ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={apiImageUrl(car.image_url)} alt={car.name} className="max-h-24 w-auto object-contain" />
              ) : (
                <span className="text-sm text-slate-500">{t("Aucun véhicule choisi")}</span>
              )}
            </div>
            <div className="flex flex-col gap-4 p-5">
              <p className="text-sm font-semibold text-slate-900">{t("Récapitulatif")}</p>
              {car && (
                <p className="-mt-2 text-sm text-slate-500">
                  <bdi dir="ltr">
                    {splitCarName(car.name).brand} {splitCarName(car.name).model}
                  </bdi>
                </p>
              )}
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("Tarif")}</dt>
                  <dd className="font-medium text-slate-900">{car ? `${formatPrice(car.price_per_day)} / ${t("jour")}` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("Départ")}</dt>
                  <dd className="text-end font-medium text-slate-900">{form.pickupDate ? `${formatDate(form.pickupDate)} · ${form.pickupTime}` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("Retour||date")}</dt>
                  <dd className="text-end font-medium text-slate-900">{form.returnDate ? `${formatDate(form.returnDate)} · ${form.returnTime}` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("Durée")}</dt>
                  <dd className="font-medium text-slate-900">{days > 0 ? daysLabel(days) : "—"}</dd>
                </div>
              </dl>
              {quote && quote.discount_amount > 0 && (
                <dl className="flex flex-col gap-2 rounded-md border border-emerald-600/20 bg-emerald-50 px-3 py-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t("Prix de base")}</dt>
                    <dd className="font-semibold text-slate-900 line-through decoration-1">{formatPrice(quote.base_price)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-emerald-800">{t(quote.discount_label ?? "")}</dt>
                    <dd className="font-semibold text-emerald-800">
                      <bdi dir="ltr">-{formatPrice(quote.discount_amount)}</bdi>
                    </dd>
                  </div>
                </dl>
              )}
              <div className="flex items-end justify-between border-t border-slate-200 pt-4">
                <span className="text-sm font-medium text-slate-700">{t("Total")}</span>
                {totalLabel === null ? (
                  <span className="text-end text-sm font-semibold text-amber-800">{t("Prix à confirmer par l'agence")}</span>
                ) : (
                  <span className={cn("text-2xl font-semibold tabular-nums text-slate-900 transition-opacity", quoting && "opacity-40")}>{totalLabel}</span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-slate-500">{t("Prix final, assurance et assistance incluses. Réglé à la remise des clés.")}</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
