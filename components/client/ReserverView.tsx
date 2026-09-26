"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CalendarX2, CheckCircle2, Cog, Armchair, Loader2, MapPin } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useClient } from "../ClientContext";
import { WhatsAppIcon } from "../FloatingWhatsApp";
import {
  apiImageUrl,
  createReservation,
  fetchBookedRanges,
  type BookedRange,
  type CarFromApi,
  type PaymentMethod,
  type ReservationFromApi,
} from "@/lib/api";
import { categoryInfo, site } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  categoryLabel,
  daysBetween,
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

const HOME = "Livraison à domicile";
const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
}); // 08:00 → 20:00

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
  const { cars, loading, error, refresh, preselectedCarId, upsertReservation, setActiveTab } = useClient();

  const [step, setStep] = useState(preselectedCarId ? 2 : 1);
  const [carId, setCarId] = useState<number | null>(preselectedCarId);
  const [category, setCategory] = useState("all");
  const [bookedState, setBookedState] = useState<{ carId: number | null; ranges: BookedRange[] }>({ carId: null, ranges: [] });
  const [stepError, setStepError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<ReservationFromApi | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    pickupPlace: site.agencies[0],
    pickupAddress: "",
    pickupDate: "",
    pickupTime: "10:00",
    differentReturn: false,
    returnPlace: site.agencies[0],
    returnAddress: "",
    returnDate: "",
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
  const total = days * priceOf(car);
  const conflict = useMemo(
    () =>
      !!form.pickupDate &&
      !!form.returnDate &&
      booked.some((b) => form.pickupDate < b.end_date && form.returnDate > b.start_date),
    [booked, form.pickupDate, form.returnDate]
  );

  const categories = useMemo(() => {
    const present = new Set(cars.map((c) => c.category?.toLowerCase()));
    return [{ id: "all", label: "Tous" }, ...Object.entries(categoryInfo).filter(([id]) => present.has(id)).map(([id, c]) => ({ id, label: c.plural }))];
  }, [cars]);
  const visibleCars = cars.filter((c) => category === "all" || c.category?.toLowerCase() === category);

  const validate = (s: number): string => {
    if (s === 1 && !car) return "Choisissez un véhicule.";
    if (s === 2) {
      if (!form.pickupDate || !form.returnDate) return "Indiquez vos dates de départ et de retour.";
      if (form.pickupDate < todayIso()) return "La date de départ ne peut pas être dans le passé.";
      if (days < 1) return "La date de retour doit être après la date de départ.";
      if (days > MAX_DAYS) return `La location en ligne est limitée à ${MAX_DAYS} jours. Contactez-nous pour une longue durée.`;
      if (conflict) return "Ce véhicule est déjà réservé sur une partie de ces dates.";
      if (form.pickupPlace === HOME && form.pickupAddress.trim().length < 5) return "Indiquez l'adresse de livraison.";
      if (form.differentReturn && form.returnPlace === HOME && form.returnAddress.trim().length < 5)
        return "Indiquez l'adresse de récupération.";
    }
    if (s === 3) {
      if (form.fullName.trim().length < 2) return "Indiquez le nom du conducteur.";
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Adresse email invalide.";
      if (form.phone.trim().length < 5) return "Indiquez un numéro de téléphone.";
      if (form.license.trim().length < 4) return "Indiquez le numéro de permis de conduire.";
      if (!form.licenseConfirmed) return "Confirmez que le conducteur a un permis valide.";
    }
    if (s === 4 && !form.accepted) return "Cochez la case de confirmation pour envoyer la demande.";
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
      setStepError(e instanceof Error ? e.message : "L'envoi a échoué, réessayez.");
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
          <p className="kicker text-sky-text">Demande envoyée</p>
          <h1 className="text-3xl font-extrabold uppercase text-navy">Merci {form.fullName.split(" ")[0]} !</h1>
          <p className="max-w-md text-[15px] leading-relaxed text-ink-soft">
            Votre demande <strong className="text-navy">{reservationRef(done.id)}</strong> pour la{" "}
            <strong className="text-navy">{done.car_name}</strong> du {formatDate(done.start_date)} au {formatDate(done.end_date)}{" "}
            est <strong className="text-navy">en attente de confirmation</strong> par l&apos;agence. Vous suivrez son statut dans
            « Mes réservations ».
          </p>
          <p className="text-2xl font-extrabold text-navy">{formatPrice(done.total_price)}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setActiveTab("reservations")} className={primaryBtn}>
              Voir mes réservations
            </button>
            <a href={reservationWhatsApp(done)} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
              <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
              Prévenir l&apos;agence sur WhatsApp
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle kicker="Nouvelle réservation" title="Réserver un véhicule" />

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
                className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
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
                  <span className={cn("hidden sm:inline", state === "todo" ? "text-muted" : "text-navy")}>{label}</span>
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
              <EmptyState title="Aucun véhicule disponible" text="La flotte est vide pour le moment. Contactez l'agence sur WhatsApp." />
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
                      {c.label}
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
                          "group flex flex-col overflow-hidden rounded-3xl border-2 bg-white text-left transition-colors",
                          selected ? "border-sky" : "border-line hover:border-sky/50"
                        )}
                      >
                        <span className="bg-brand-mist relative flex h-36 items-center justify-center px-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={apiImageUrl(c.image_url)} alt={c.name} className="car-reflect max-h-28 w-auto object-contain" />
                          {selected && (
                            <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-sky text-navy">
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
                              {transmissionLabel(c.transmission)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Armchair className="h-3.5 w-3.5" />
                              {c.seats} places
                            </span>
                          </span>
                          <span className="mt-auto pt-1 text-xl font-extrabold text-navy">
                            {formatPrice(c.price_per_day)} <span className="text-xs font-semibold text-muted">/ jour</span>
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
                <legend className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Départ</legend>
                <label>
                  <span className={labelClass}>Lieu de retrait</span>
                  <select className={inputClass} value={form.pickupPlace} onChange={(e) => set("pickupPlace", e.target.value)}>
                    {site.agencies.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                    <option>{HOME}</option>
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Date</span>
                  <input type="date" className={inputClass} min={todayIso()} value={form.pickupDate} onChange={(e) => set("pickupDate", e.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Heure</span>
                  <select className={inputClass} value={form.pickupTime} onChange={(e) => set("pickupTime", e.target.value)}>
                    {HOURS.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
                {form.pickupPlace === HOME && (
                  <label className="sm:col-span-3">
                    <span className={labelClass}>Adresse de livraison</span>
                    <input className={inputClass} value={form.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} placeholder="Rue, commune, wilaya" />
                  </label>
                )}
              </fieldset>

              <fieldset className="grid gap-4 border-t border-line pt-6 sm:grid-cols-[1.4fr_1fr_0.8fr]">
                <legend className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Retour</legend>
                <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-soft sm:col-span-3">
                  <input type="checkbox" className="h-[18px] w-[18px] accent-sky" checked={form.differentReturn} onChange={(e) => set("differentReturn", e.target.checked)} />
                  Rendre le véhicule dans un autre lieu
                </label>
                {form.differentReturn ? (
                  <label>
                    <span className={labelClass}>Lieu de retour</span>
                    <select className={inputClass} value={form.returnPlace} onChange={(e) => set("returnPlace", e.target.value)}>
                      {site.agencies.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                      <option>{HOME}</option>
                    </select>
                  </label>
                ) : (
                  <div>
                    <span className={labelClass}>Lieu de retour</span>
                    <p className="flex h-12 items-center gap-2 text-sm font-bold text-navy">
                      <MapPin className="h-4 w-4 text-sky-text" />
                      {form.pickupPlace === HOME ? "Récupération à domicile" : form.pickupPlace}
                    </p>
                  </div>
                )}
                <label>
                  <span className={labelClass}>Date</span>
                  <input
                    type="date"
                    className={inputClass}
                    min={form.pickupDate || todayIso(1)}
                    value={form.returnDate}
                    onChange={(e) => set("returnDate", e.target.value)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Heure</span>
                  <select className={inputClass} value={form.returnTime} onChange={(e) => set("returnTime", e.target.value)}>
                    {HOURS.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
                {form.differentReturn && form.returnPlace === HOME && (
                  <label className="sm:col-span-3">
                    <span className={labelClass}>Adresse de récupération</span>
                    <input className={inputClass} value={form.returnAddress} onChange={(e) => set("returnAddress", e.target.value)} placeholder="Rue, commune, wilaya" />
                  </label>
                )}
              </fieldset>

              {booked.length > 0 && (
                <div className={cn("flex gap-3 rounded-2xl p-4 text-sm", conflict ? "bg-red-50 text-red-800" : "bg-mist text-ink-soft")}>
                  <CalendarX2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">{conflict ? "Ces dates ne sont pas disponibles" : "Périodes déjà réservées pour ce véhicule"}</p>
                    <ul className="mt-1 space-y-0.5">
                      {booked.map((b) => (
                        <li key={`${b.start_date}-${b.end_date}`}>
                          Du {formatDate(b.start_date)} au {formatDate(b.end_date)}
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
                <span className={labelClass}>Nom et prénom du conducteur</span>
                <input className={inputClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" />
              </label>
              <label>
                <span className={labelClass}>Email</span>
                <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
              </label>
              <label>
                <span className={labelClass}>Téléphone (WhatsApp de préférence)</span>
                <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Numéro de permis de conduire</span>
                <input className={inputClass} value={form.license} onChange={(e) => set("license", e.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Message pour l&apos;agence (facultatif)</span>
                <textarea
                  className={cn(inputClass, "h-28 resize-none py-3")}
                  value={form.note}
                  maxLength={1000}
                  onChange={(e) => set("note", e.target.value)}
                  placeholder="Siège bébé, numéro de vol, heure d'arrivée…"
                />
              </label>
              <label className="flex items-start gap-3 rounded-2xl bg-mist p-4 text-sm text-ink-soft sm:col-span-2">
                <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 accent-sky" checked={form.licenseConfirmed} onChange={(e) => set("licenseConfirmed", e.target.checked)} />
                Je confirme que le conducteur est titulaire d&apos;un permis de conduire valide et le présentera, avec une pièce
                d&apos;identité, à la remise des clés.
              </label>
            </Card>
          )}

          {/* ── Étape 4 : paiement & envoi ── */}
          {step === 4 && car && (
            <Card className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Moyen de paiement</p>
                <p className="mb-4 text-sm text-muted">Aucun paiement en ligne : vous réglez directement auprès de l&apos;agence.</p>
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
                      {paymentLabels[m]}
                    </label>
                  ))}
                </div>
              </div>

              <dl className="grid gap-3 rounded-2xl bg-mist p-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Conducteur</dt>
                  <dd className="font-bold text-navy">{form.fullName}</dd>
                </div>
                <div>
                  <dt className="text-muted">Contact</dt>
                  <dd className="font-bold text-navy">
                    {form.phone} · {form.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Départ</dt>
                  <dd className="font-bold text-navy">
                    {formatDate(form.pickupDate, true)} à {form.pickupTime}
                    <br />
                    {form.pickupPlace === HOME ? `Livraison : ${form.pickupAddress}` : form.pickupPlace}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Retour</dt>
                  <dd className="font-bold text-navy">
                    {formatDate(form.returnDate, true)} à {form.returnTime}
                    <br />
                    {form.differentReturn
                      ? form.returnPlace === HOME
                        ? `Récupération : ${form.returnAddress}`
                        : form.returnPlace
                      : form.pickupPlace === HOME
                        ? "Récupération à domicile"
                        : form.pickupPlace}
                  </dd>
                </div>
              </dl>

              <label className="flex items-start gap-3 rounded-2xl border-2 border-line p-4 text-sm text-ink-soft">
                <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 accent-sky" checked={form.accepted} onChange={(e) => set("accepted", e.target.checked)} />
                J&apos;ai compris que ma demande doit être confirmée par l&apos;agence MYLOC.DZ, et que le montant indiqué est réglé à la
                remise du véhicule.
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
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <button type="button" onClick={() => goTo(step + 1)} className={primaryBtn}>
                Continuer
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={sending} className={primaryBtn}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Envoyer ma demande
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
                <span className="text-sm font-semibold text-muted">Aucun véhicule choisi</span>
              )}
            </div>
            <div className="flex flex-col gap-4 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Récapitulatif</p>
              {car && (
                <p className="text-xl font-extrabold uppercase text-navy">
                  {splitCarName(car.name).brand} <span className="text-sky-gradient">{splitCarName(car.name).model}</span>
                </p>
              )}
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Tarif</dt>
                  <dd className="font-bold text-navy">{car ? `${formatPrice(car.price_per_day)} / jour` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Départ</dt>
                  <dd className="text-right font-bold text-navy">{form.pickupDate ? `${formatDate(form.pickupDate)} · ${form.pickupTime}` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Retour</dt>
                  <dd className="text-right font-bold text-navy">{form.returnDate ? `${formatDate(form.returnDate)} · ${form.returnTime}` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Durée</dt>
                  <dd className="font-bold text-navy">{days > 0 ? `${days} jour${days > 1 ? "s" : ""}` : "—"}</dd>
                </div>
              </dl>
              <div className="flex items-end justify-between border-t border-line pt-4">
                <span className="text-sm font-bold uppercase tracking-wide text-navy">Total</span>
                <span className="text-3xl font-extrabold text-navy">{days > 0 && car ? formatPrice(total) : "—"}</span>
              </div>
              <p className="text-xs leading-relaxed text-muted">Prix final, assurance et assistance incluses. Réglé à la remise des clés.</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
