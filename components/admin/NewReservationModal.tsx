"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAdmin, type NewReservationPrefill } from "../AdminContext";
import { adminCreateReservation, fetchQuote, type PaymentMethod, type PricingQuote } from "@/lib/api";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { daysBetween, formatDate, formatPrice, inputClass, labelClass, primaryBtn, secondaryBtn, todayIso } from "../client/shared";
import { FormError, Modal, addDays } from "./ui";

const HOME = "Livraison à domicile";
const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});

export function NewReservationModal() {
  const { newReservation, closeNewReservation } = useAdmin();
  if (!newReservation) return null;
  return <Form prefill={newReservation} onClose={closeNewReservation} />;
}

function Form({ prefill, onClose }: { prefill: NewReservationPrefill; onClose: () => void }) {
  const { cars, clients, reservations, upsertReservation, openReservation } = useAdmin();
  const today = todayIso();
  const start0 = prefill.startDate || today;

  const [f, setF] = useState({
    carId: prefill.carId ? String(prefill.carId) : String(cars.find((c) => c.status === "available")?.id ?? ""),
    start: start0,
    end: addDays(start0, 3),
    pickupTime: "10:00",
    returnTime: "10:00",
    pickupPlace: site.agencies[0] as string,
    returnPlace: site.agencies[0] as string,
    address: "",
    clientId: "",
    fullName: "",
    phone: "",
    email: "",
    license: "",
    payment: "especes" as PaymentMethod,
    status: "confirmed" as "confirmed" | "pending",
    customPrice: false,
    price: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const car = cars.find((c) => String(c.id) === f.carId);
  const days = daysBetween(f.start, f.end);
  const baseComputed = car ? (parseFloat(String(car.price_per_day)) || 0) * days : 0;

  // Remise automatique (durée) calculée par le serveur
  const quoteKey = car && days > 0 ? `${car.id}|${f.start}|${f.end}` : "";
  const [quoteState, setQuoteState] = useState<{ key: string; quote: PricingQuote | null }>({ key: "", quote: null });
  useEffect(() => {
    if (!quoteKey) return;
    const [id, start, end] = quoteKey.split("|");
    let cancelled = false;
    fetchQuote(Number(id), start, end)
      .then((q) => !cancelled && setQuoteState({ key: quoteKey, quote: q }))
      .catch(() => !cancelled && setQuoteState({ key: quoteKey, quote: null }));
    return () => {
      cancelled = true;
    };
  }, [quoteKey]);
  const quote = quoteState.key === quoteKey ? quoteState.quote : null;
  const computed = quote ? quote.total_price : baseComputed;

  const conflict = useMemo(
    () =>
      reservations.find(
        (r) =>
          String(r.car_id) === f.carId &&
          (r.status === "pending" || r.status === "confirmed") &&
          (r.start_date || "") < f.end &&
          (r.end_date || "") > f.start
      ),
    [reservations, f.carId, f.start, f.end]
  );

  const pickClient = (id: string) => {
    const c = clients.find((x) => String(x.id) === id);
    setF((p) => ({
      ...p,
      clientId: id,
      fullName: c ? c.full_name : p.fullName,
      phone: c ? c.phone : p.phone,
      email: c ? c.email : p.email,
    }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!car) return setErr("Choisissez un véhicule.");
    if (days <= 0) return setErr("La date de retour doit être après la date de départ.");
    if (f.pickupPlace === HOME && !f.address.trim()) return setErr("Indiquez l'adresse de livraison.");
    setBusy(true);
    try {
      const created = await adminCreateReservation({
        car_id: car.id,
        start_date: f.start,
        end_date: f.end,
        pickup_time: f.pickupTime,
        return_time: f.returnTime,
        pickup_place: f.pickupPlace,
        return_place: f.returnPlace,
        delivery_address: f.pickupPlace === HOME ? f.address.trim() : undefined,
        full_name: f.fullName.trim(),
        phone: f.phone.trim(),
        email: f.email.trim() || undefined,
        user_id: f.clientId ? Number(f.clientId) : undefined,
        license_number: f.license.trim() || undefined,
        payment_method: f.payment,
        status: f.status,
        total_price: f.customPrice && f.price !== "" ? f.price : undefined,
        admin_note: f.note.trim() || undefined,
      });
      if (created) {
        upsertReservation(created);
        onClose();
        openReservation(created.id);
      } else onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  const places = [...site.agencies, HOME];

  return (
    <Modal title="Nouvelle réservation" onClose={onClose} wide>
      <form onSubmit={submit} className="flex flex-col gap-6 p-5">
        <p className="-mt-2 text-sm text-slate-500">
          Pour une réservation prise par WhatsApp, par téléphone ou au comptoir. Le client n&apos;a pas besoin de compte.
        </p>

        {/* Véhicule & dates */}
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 w-full border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">Véhicule et dates</legend>
          <div className="sm:col-span-2">
            <label htmlFor="nr-car" className={labelClass}>
              Véhicule
            </label>
            <select id="nr-car" value={f.carId} onChange={(e) => set("carId", e.target.value)} className={inputClass} required>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {formatPrice(c.price_per_day)}/jour{c.status !== "available" ? " (retiré du site)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nr-start" className={labelClass}>
              Départ
            </label>
            <div className="flex gap-2">
              <input
                id="nr-start"
                type="date"
                value={f.start}
                onChange={(e) => {
                  const v = e.target.value;
                  setF((p) => ({ ...p, start: v, end: p.end <= v ? addDays(v, 1) : p.end }));
                }}
                className={inputClass}
                required
              />
              <select aria-label="Heure de départ" value={f.pickupTime} onChange={(e) => set("pickupTime", e.target.value)} className={cn(inputClass, "w-28")}>
                {HOURS.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="nr-end" className={labelClass}>
              Retour
            </label>
            <div className="flex gap-2">
              <input
                id="nr-end"
                type="date"
                value={f.end}
                min={addDays(f.start, 1)}
                onChange={(e) => set("end", e.target.value)}
                className={inputClass}
                required
              />
              <select aria-label="Heure de retour" value={f.returnTime} onChange={(e) => set("returnTime", e.target.value)} className={cn(inputClass, "w-28")}>
                {HOURS.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="nr-pickup" className={labelClass}>
              Retrait
            </label>
            <select id="nr-pickup" value={f.pickupPlace} onChange={(e) => set("pickupPlace", e.target.value)} className={inputClass}>
              {places.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nr-return" className={labelClass}>
              Retour à
            </label>
            <select id="nr-return" value={f.returnPlace} onChange={(e) => set("returnPlace", e.target.value)} className={inputClass}>
              {site.agencies.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          {f.pickupPlace === HOME && (
            <div className="sm:col-span-2">
              <label htmlFor="nr-address" className={labelClass}>
                Adresse de livraison
              </label>
              <input id="nr-address" value={f.address} onChange={(e) => set("address", e.target.value)} className={inputClass} maxLength={255} />
            </div>
          )}
          {conflict && (
            <p className="flex gap-2 rounded-md border border-amber-600/20 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 sm:col-span-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Déjà réservé du {formatDate(conflict.start_date)} au {formatDate(conflict.end_date)} ({conflict.full_name}). Changez les dates ou
              le véhicule.
            </p>
          )}
        </fieldset>

        {/* Client */}
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 w-full border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">Client</legend>
          {clients.length > 0 && (
            <div className="sm:col-span-2">
              <label htmlFor="nr-client" className={labelClass}>
                Client déjà inscrit (facultatif)
              </label>
              <select id="nr-client" value={f.clientId} onChange={(e) => pickClient(e.target.value)} className={inputClass}>
                <option value="">— Nouveau client, sans compte —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} · {c.phone}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="nr-name" className={labelClass}>
              Nom complet
            </label>
            <input id="nr-name" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} className={inputClass} required minLength={2} maxLength={100} />
          </div>
          <div>
            <label htmlFor="nr-phone" className={labelClass}>
              Téléphone / WhatsApp
            </label>
            <input id="nr-phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} required minLength={5} maxLength={20} placeholder="0555 00 00 00" />
          </div>
          <div>
            <label htmlFor="nr-email" className={labelClass}>
              Email (facultatif)
            </label>
            <input id="nr-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="nr-license" className={labelClass}>
              N° de permis (facultatif)
            </label>
            <input id="nr-license" value={f.license} onChange={(e) => set("license", e.target.value)} className={inputClass} maxLength={50} />
          </div>
        </fieldset>

        {/* Paiement & statut */}
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 w-full border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">Paiement</legend>
          <div>
            <label htmlFor="nr-pay" className={labelClass}>
              Moyen de paiement
            </label>
            <select id="nr-pay" value={f.payment} onChange={(e) => set("payment", e.target.value as PaymentMethod)} className={inputClass}>
              <option value="especes">Espèces</option>
              <option value="carte">Carte bancaire</option>
              <option value="virement">Virement</option>
            </select>
          </div>
          <div>
            <label htmlFor="nr-status" className={labelClass}>
              Statut
            </label>
            <select id="nr-status" value={f.status} onChange={(e) => set("status", e.target.value as "confirmed" | "pending")} className={inputClass}>
              <option value="confirmed">Confirmée</option>
              <option value="pending">En attente</option>
            </select>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {days > 0 && car ? (
                  <>
                    {days} jour{days > 1 ? "s" : ""} × {formatPrice(car.price_per_day)} ={" "}
                    <span className={cn("font-semibold text-slate-900", f.customPrice && "line-through opacity-50")}>{formatPrice(computed)}</span>
                    {quote && quote.discount_amount > 0 && !f.customPrice && (
                      <span className="ms-2 text-xs text-emerald-700">
                        ({quote.discount_label}, au lieu de {formatPrice(quote.base_price)})
                      </span>
                    )}
                  </>
                ) : (
                  "Choisissez un véhicule et des dates."
                )}
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={f.customPrice} onChange={(e) => set("customPrice", e.target.checked)} className="h-4 w-4 accent-sky" />
                Prix négocié
              </label>
            </div>
            {f.customPrice && (
              <input
                type="number"
                min={0}
                step="0.01"
                value={f.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder={`Montant total (${site.currency})`}
                aria-label="Montant total négocié"
                className={cn(inputClass, "mt-3 bg-white")}
                required
              />
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="nr-note" className={labelClass}>
              Message pour le client (facultatif)
            </label>
            <textarea
              id="nr-note"
              rows={2}
              value={f.note}
              onChange={(e) => set("note", e.target.value)}
              maxLength={1000}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky focus:ring-2 focus:ring-sky/25"
            />
          </div>
        </fieldset>

        <FormError message={err} />

        <div className="-mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Annuler
          </button>
          <button type="submit" disabled={busy || !!conflict} className={primaryBtn}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer la réservation
          </button>
        </div>
      </form>
    </Modal>
  );
}
