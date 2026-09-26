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
  type CarFromApi,
  type PaymentMethod,
  type ReservationFromApi,
} from "@/lib/api";
import { categoryInfo, site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import {
  Card,
  EmptyState,
  ErrorBlock,
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
  license: string;
  licenseConfirmed: boolean;
  note: string;
  payment: PaymentMethod;
  accepted: boolean;
}

function priceOf(car?: CarFromApi | null) {
  return car ? parseFloat(String(car.price_per_day)) || 0 : 0;
}

function transmissionLabel(t?: string) {
  const v = (t || "").toLowerCase();
  return v.startsWith("auto") ? "Automatique" : v.startsWith("manu") ? "Manuelle" : t || "";
}

export function ReserverView() {
  const { user } = useAuth();
  const { t } = useLang();
  const { cars, loading, error, refresh, preselectedCarId, bookingPrefill, upsertReservation, setActiveTab } = useClient();

  const [step, setStep] = useState(preselectedCarId ? 2 : 1);
  const [carId, setCarId] = useState<number | null>(preselectedCarId);
  const [category, setCategory] = useState("all");
  const [bookedState, setBookedState] = useState<{ carId: number | null; ranges: BookedRange[] }>({ carId: null, ranges: [] });
  const [stepError, setStepError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<ReservationFromApi | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
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
    license: "",
    licenseConfirmed: false,
    note: "",
    payment: "especes",
    accepted: false,
  }));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const car = cars.find((c) => c.id === carId) || null;

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

  // Devis serveur : remise durée / fidélité / code promo (la plus avantageuse)
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const quoteKey = car && days > 0 ? `${car.id}|${form.pickupDate}|${form.returnDate}|${appliedCode}` : "";
  const [quoteState, setQuoteState] = useState<{ key: string; quote: PricingQuote | null }>({ key: "", quote: null });
  useEffect(() => {
    if (!quoteKey || !car) return;
    let cancelled = false;
    fetchQuote(car.id, form.pickupDate, form.returnDate, appliedCode || undefined)
      .then((q) => !cancelled && setQuoteState({ key: quoteKey, quote: q }))
      .catch(() => !cancelled && setQuoteState({ key: quoteKey, quote: null }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);
  const quote = quoteState.key === quoteKey ? quoteState.quote : null;
  const quoting = !!quoteKey && quoteState.key !== quoteKey;
  const total = quote ? quote.total_price : days * priceOf(car);
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

  const submit = async () => {
    const err = validate(4);
    if (err) return setStepError(err);
    if (!car) return;
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
        pickup_place: form.pickupPlace,
        pickup_time: form.pickupTime,
        return_place: returnPlace === HOME ? `Récupération à domicile : ${returnAddress.trim()}`.slice(0, 150) : returnPlace,
        return_time: form.returnTime,
        delivery_address: form.pickupPlace === HOME ? form.pickupAddress.trim() : undefined,
        license_number: form.license.trim(),
        payment_method: form.payment,
        client_note: form.note.trim() || undefined,
        promo_code: quote?.promo_code || undefined,
      });
      const saved: ReservationFromApi = {
        ...(res.reservation as ReservationFromApi),
        car_name: car.name,
        car_category: car.category,
        car_image_url: car.image_url,
      };
      upsertReservation(saved);
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
        <Card className="flex flex-col items-center gap-5 px-6 py-12 text-center sm:px-12">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <p className="kicker text-sky-text">{t("Demande envoyée")}</p>
          <h1 className="text-3xl font-extrabold uppercase text-navy">{t("Merci {name} !", { name: form.fullName.split(" ")[0] })}</h1>
          <p className="max-w-md text-[15px] leading-relaxed text-ink-soft">
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
          <p className="text-2xl font-extrabold text-navy">{formatPrice(done.total_price)}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setActiveTab("reservations")} className={primaryBtn}>
              {t("Voir mes réservations")}
            </button>
            <a href={reservationWhatsApp(done)} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
              <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
              {t("Prévenir l'agence sur WhatsApp")}
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle kicker={t("Nouvelle réservation")} title={t("Réserver un véhicule")} />

      {/* Étapes */}
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "current" : "todo";
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => n < step && goTo(n)}
                disabled={n >= step}
                className="flex w-full flex-col gap-2 text-start disabled:cursor-default"
              >
                <span className={cn("h-1.5 rounded-full", state === "todo" ? "bg-line" : "bg-sky")} />
                <span className="flex items-center gap-2 text-xs font-bold">
                  <span
                    className={cn(
                      "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px]",
                      state === "done" && "bg-sky text-navy",
                      state === "current" && "bg-navy text-white",
                      state === "todo" && "bg-line text-muted"
                    )}
                  >
                    {state === "done" ? <Check className="h-3.5 w-3.5" /> : n}
                  </span>
                  <span className={cn("hidden sm:inline", state === "todo" ? "text-muted" : "text-navy")}>{t(label)}</span>
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
                <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      aria-pressed={category === c.id}
                      className={cn(
                        "h-10 flex-shrink-0 rounded-full border-2 px-4 text-xs font-bold uppercase tracking-wide",
                        category === c.id ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:border-navy"
                      )}
                    >
                      {t(c.label)}
                    </button>
                  ))}
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
                          "group flex flex-col overflow-hidden rounded-3xl border-2 bg-white text-start transition-colors",
                          selected ? "border-sky" : "border-line hover:border-sky/50"
                        )}
                      >
                        <span className="bg-brand-mist relative flex h-36 items-center justify-center px-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={apiImageUrl(c.image_url)} alt={c.name} className="car-reflect max-h-28 w-auto object-contain" />
                          {selected && (
                            <span className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-sky text-navy">
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                        <span className="flex flex-1 flex-col gap-2 p-4">
                          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{categoryLabel(c.category)}</span>
                          <span className="text-lg font-extrabold uppercase leading-tight text-navy">
                            {brand} <span className="text-sky-gradient">{model}</span>
                          </span>
                          <span className="flex gap-3 text-xs font-semibold text-muted">
                            <span className="flex items-center gap-1">
                              <Cog className="h-3.5 w-3.5" />
                              {t(transmissionLabel(c.transmission))}
                            </span>
                            <span className="flex items-center gap-1">
                              <Armchair className="h-3.5 w-3.5" />
                              {c.seats} {t("places")}
                            </span>
                          </span>
                          <span className="mt-auto pt-1 text-xl font-extrabold text-navy">
                            {formatPrice(c.price_per_day)} <span className="text-xs font-semibold text-muted">/ {t("jour")}</span>
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
            <Card className="flex flex-col gap-6 p-6 sm:p-8">
              <fieldset className="grid gap-4 sm:grid-cols-[1.4fr_1fr_0.8fr]">
                <legend className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">{t("Départ")}</legend>
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

              <fieldset className="grid gap-4 border-t border-line pt-6 sm:grid-cols-[1.4fr_1fr_0.8fr]">
                <legend className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">{t("Retour||date")}</legend>
                <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-soft sm:col-span-3">
                  <input type="checkbox" className="h-[18px] w-[18px] accent-sky" checked={form.differentReturn} onChange={(e) => set("differentReturn", e.target.checked)} />
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
                    <p className="flex h-12 items-center gap-2 text-sm font-bold text-navy">
                      <MapPin className="h-4 w-4 text-sky-text" />
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
                <div className={cn("flex gap-3 rounded-2xl p-4 text-sm", conflict ? "bg-red-50 text-red-800" : "bg-mist text-ink-soft")}>
                  <CalendarX2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">{conflict ? t("Ces dates ne sont pas disponibles") : t("Périodes déjà réservées pour ce véhicule")}</p>
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
            <Card className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
              <label className="sm:col-span-2">
                <span className={labelClass}>{t("Nom et prénom du conducteur")}</span>
                <input className={inputClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" />
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
                  className={cn(inputClass, "h-28 resize-none py-3")}
                  value={form.note}
                  maxLength={1000}
                  onChange={(e) => set("note", e.target.value)}
                  placeholder={t("Siège bébé, numéro de vol, heure d'arrivée…")}
                />
              </label>
              <label className="flex items-start gap-3 rounded-2xl bg-mist p-4 text-sm text-ink-soft sm:col-span-2">
                <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 accent-sky" checked={form.licenseConfirmed} onChange={(e) => set("licenseConfirmed", e.target.checked)} />
                {t(
                  "Je confirme que le conducteur est titulaire d'un permis de conduire valide et le présentera, avec une pièce d'identité, à la remise des clés."
                )}
              </label>
            </Card>
          )}

          {/* ── Étape 4 : paiement & envoi ── */}
          {step === 4 && car && (
            <Card className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">{t("Moyen de paiement")}</p>
                <p className="mb-4 text-sm text-muted">{t("Aucun paiement en ligne : vous réglez directement auprès de l'agence.")}</p>
                <div className="grid gap-3">
                  {(Object.keys(paymentLabels) as PaymentMethod[]).map((m) => (
                    <label
                      key={m}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 text-sm font-bold text-navy",
                        form.payment === m ? "border-sky bg-sky-soft/50" : "border-line"
                      )}
                    >
                      <input type="radio" name="payment" className="h-[18px] w-[18px] accent-sky" checked={form.payment === m} onChange={() => set("payment", m)} />
                      {t(paymentLabels[m])}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="promo" className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-navy">
                  <Tag className="h-4 w-4 text-sky-text" /> {t("Code promo")}
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
                    className={cn(inputClass, "uppercase")}
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
                      "mt-2 text-sm font-semibold",
                      quote.promo.valid && quote.promo_code ? "text-emerald-700" : quote.promo.valid ? "text-amber-700" : "text-red-700"
                    )}
                  >
                    {t(quote.promo.message)}
                  </p>
                )}
              </div>

              <dl className="grid gap-3 rounded-2xl bg-mist p-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">{t("Conducteur")}</dt>
                  <dd className="font-bold text-navy">{form.fullName}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("Contact")}</dt>
                  <dd className="font-bold text-navy">
                    {form.phone} · {form.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">{t("Départ")}</dt>
                  <dd className="font-bold text-navy">
                    {t("{date} à {time}", { date: formatDate(form.pickupDate, true), time: form.pickupTime })}
                    <br />
                    {form.pickupPlace === HOME ? t("Livraison : {address}", { address: form.pickupAddress }) : t(form.pickupPlace)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">{t("Retour||date")}</dt>
                  <dd className="font-bold text-navy">
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

              <label className="flex items-start gap-3 rounded-2xl border-2 border-line p-4 text-sm text-ink-soft">
                <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 accent-sky" checked={form.accepted} onChange={(e) => set("accepted", e.target.checked)} />
                {t(
                  "J'ai compris que ma demande doit être confirmée par l'agence MYLOC.DZ, et que le montant indiqué est réglé à la remise du véhicule."
                )}
              </label>
            </Card>
          )}

          {stepError && (
            <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {stepError}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step > 1 ? (
              <button type="button" onClick={() => goTo(step - 1)} className={secondaryBtn}>
                <ArrowLeft className="flip-rtl h-4 w-4" />
                {t("Retour")}
              </button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <button type="button" onClick={() => goTo(step + 1)} className={primaryBtn}>
                {t("Continuer")}
                <ArrowRight className="flip-rtl h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={sending} className={primaryBtn}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t("Envoyer ma demande")}
              </button>
            )}
          </div>
        </div>

        {/* ── Récapitulatif ── */}
        <aside className="xl:sticky xl:top-8 xl:self-start">
          <Card className="overflow-hidden">
            <div className="bg-brand-mist flex h-36 items-center justify-center px-6">
              {car ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={apiImageUrl(car.image_url)} alt={car.name} className="car-reflect max-h-28 w-auto object-contain" />
              ) : (
                <span className="text-sm font-semibold text-muted">{t("Aucun véhicule choisi")}</span>
              )}
            </div>
            <div className="flex flex-col gap-4 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{t("Récapitulatif")}</p>
              {car && (
                <p className="text-xl font-extrabold uppercase text-navy">
                  {splitCarName(car.name).brand} <span className="text-sky-gradient">{splitCarName(car.name).model}</span>
                </p>
              )}
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("Tarif")}</dt>
                  <dd className="font-bold text-navy">{car ? `${formatPrice(car.price_per_day)} / ${t("jour")}` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("Départ")}</dt>
                  <dd className="text-end font-bold text-navy">{form.pickupDate ? `${formatDate(form.pickupDate)} · ${form.pickupTime}` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("Retour||date")}</dt>
                  <dd className="text-end font-bold text-navy">{form.returnDate ? `${formatDate(form.returnDate)} · ${form.returnTime}` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("Durée")}</dt>
                  <dd className="font-bold text-navy">{days > 0 ? daysLabel(days) : "—"}</dd>
                </div>
              </dl>
              {quote && quote.discount_amount > 0 && (
                <dl className="flex flex-col gap-2 rounded-2xl bg-emerald-50 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">{t("Prix de base")}</dt>
                    <dd className="font-bold text-navy line-through decoration-1">{formatPrice(quote.base_price)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-emerald-800">{t(quote.discount_label ?? "")}</dt>
                    <dd className="font-bold text-emerald-800">-{formatPrice(quote.discount_amount)}</dd>
                  </div>
                </dl>
              )}
              <div className="flex items-end justify-between border-t border-line pt-4">
                <span className="text-sm font-bold uppercase tracking-wide text-navy">{t("Total")}</span>
                <span className={cn("text-3xl font-extrabold text-navy transition-opacity", quoting && "opacity-40")}>
                  {days > 0 && car ? formatPrice(total) : "—"}
                </span>
              </div>
              {quote?.loyalty && quote.loyalty.rentals < quote.loyalty.needed && (
                <p className="rounded-2xl bg-sky-soft/60 p-3 text-xs font-semibold text-navy">
                  {t(
                    quote.loyalty.needed - quote.loyalty.rentals > 1
                      ? "Fidélité : encore {n} locations terminées pour profiter de -{percent} % sur vos prochaines réservations."
                      : "Fidélité : encore {n} location terminée pour profiter de -{percent} % sur vos prochaines réservations.",
                    { n: quote.loyalty.needed - quote.loyalty.rentals, percent: quote.loyalty.percent }
                  )}
                </p>
              )}
              <p className="text-xs leading-relaxed text-muted">{t("Prix final, assurance et assistance incluses. Réglé à la remise des clés.")}</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
