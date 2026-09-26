"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Printer } from "lucide-react";
import { useAuth } from "../AuthContext";
import { Logo } from "../Brand";
import {
  fetchAllReservations,
  fetchInspections,
  formatTransmission,
  zoneLabels,
  type Inspection,
  type InspectionSet,
  type ReservationFromApi,
} from "@/lib/api";
import { pageUrl } from "@/lib/routes";
import { setLang, useLang } from "@/lib/i18n";
import { site } from "@/lib/site";
import { LoadingBlock, categoryLabel, daysBetween, formatDate, formatPrice, formatTime, paymentLabels, reservationRef } from "../client/shared";
import { CarDamageMap } from "./CarDamageMap";

const conditions = [
  "Le locataire doit être titulaire d'un permis de conduire valide depuis au moins 2 ans et présenter une pièce d'identité.",
  "Le véhicule est restitué avec le même niveau de carburant qu'au départ ; à défaut, le complément est facturé.",
  "Tout retard de restitution non signalé peut être facturé au tarif journalier en vigueur.",
  "Les amendes, péages et infractions commises pendant la location sont à la charge du locataire.",
  "La sous-location, le transport rémunéré de personnes et la sortie du territoire national sont interdits sans accord écrit.",
  "Tout dommage constaté au retour et absent de l'état des lieux de départ est à la charge du locataire, dans la limite de la franchise.",
  "En cas d'accident ou de panne, le locataire prévient immédiatement l'agence (assistance 24/7).",
];

function Line({ label, value, narrow }: { label: string; value?: string | number | null; narrow?: boolean }) {
  return (
    <div className="flex gap-2 border-b border-dotted border-slate-300 py-1.5 text-[12.5px]">
      <span className={`${narrow ? "w-20" : "w-36"} flex-shrink-0 text-slate-500`}>{label}</span>
      <span className="min-h-[1.2em] flex-1 font-semibold text-navy">{value || ""}</span>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-xl border border-slate-300 p-4">
      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-text">{title}</h2>
      {children}
    </section>
  );
}

function InspectionBlock({ title, i, compare }: { title: string; i?: Inspection; compare?: Inspection }) {
  const fresh = compare && i ? i.damages.filter((d) => !compare.damages.some((x) => x.zone === d.zone)).map((d) => d.zone) : [];
  return (
    <div className="flex gap-3">
      <CarDamageMap marked={i?.damages.map((d) => d.zone) ?? []} highlight={fresh} className="w-20 flex-shrink-0 [&_svg]:h-36" />
      <div className="flex-1">
        <p className="mb-1 text-[12px] font-extrabold uppercase text-navy">{title}</p>
        <Line narrow label="Kilométrage" value={i?.mileage != null ? `${i.mileage.toLocaleString("fr-FR")} km` : ""} />
        <Line narrow label="Carburant" value={i?.fuel_level != null ? `${i.fuel_level}/8` : ""} />
        <Line
          label="Dommages"
          value={i ? (i.damages.length ? i.damages.map((d) => zoneLabels[d.zone] + (d.note ? ` (${d.note})` : "")).join(" ; ") : "Aucun") : ""}
        />
        <Line narrow label="Remarques" value={i?.notes} />
        {i && i.photos.length > 0 && <p className="mt-1 text-[11px] text-slate-500">{i.photos.length} photo(s) enregistrée(s) dans le dossier.</p>}
      </div>
    </div>
  );
}

export function ContractView() {
  const { token, user, isLoading } = useAuth();
  const id = useSyncExternalStore(
    () => () => {},
    () => Number(new URLSearchParams(window.location.search).get("id")) || 0,
    () => 0
  );
  // L'administration et le contrat sont en français
  const { lang } = useLang();
  useEffect(() => {
    if (lang !== "fr") setLang("fr");
  }, [lang]);

  const [data, setData] = useState<{ r: ReservationFromApi | null; insp: InspectionSet; error: string } | null>(null);

  useEffect(() => {
    if (isLoading || !id) return;
    if (!token || user?.role !== "admin") {
      window.location.replace(pageUrl("login"));
      return;
    }
    let cancelled = false;
    Promise.all([fetchAllReservations(), fetchInspections(id)])
      .then(([all, insp]) => !cancelled && setData({ r: all.find((x) => x.id === id) ?? null, insp, error: "" }))
      .catch((e) => !cancelled && setData({ r: null, insp: {}, error: e instanceof Error ? e.message : "Erreur" }));
    return () => {
      cancelled = true;
    };
  }, [id, token, user, isLoading]);

  if (!data) return <LoadingBlock label="Préparation du contrat…" />;
  const { r, insp } = data;
  if (!r) return <p className="p-10 text-center font-semibold text-navy">{data.error || "Réservation introuvable."}</p>;

  const days = daysBetween(r.start_date || "", r.end_date || "");
  const discount = parseFloat(String(r.discount_amount ?? 0)) || 0;
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 10mm; } @media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4">
        <p className="text-sm text-slate-600">Vérifiez le contrat puis imprimez-le ou enregistrez-le en PDF.</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white hover:bg-navy-soft"
        >
          <Printer className="h-4 w-4" /> Imprimer / PDF
        </button>
      </div>

      <article className="mx-auto flex max-w-[210mm] flex-col gap-4 bg-white p-[12mm] text-navy shadow-xl print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-navy pb-4">
          <div>
            <Logo />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              {site.address}
              <br />
              {site.phoneDisplay} · {site.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-text">Contrat de location</p>
            <p className="text-2xl font-extrabold">{reservationRef(r.id)}</p>
            <p className="text-[11px] text-slate-600">Établi le {today}</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <Box title="Locataire">
            <Line label="Nom et prénom" value={r.full_name} />
            <Line label="Téléphone" value={r.phone} />
            <Line label="Email" value={r.email || r.user_email} />
            <Line label="N° de permis" value={r.license_number} />
            <Line label="Date de naissance" />
            <Line label="Pièce d'identité n°" />
            <Line label="Adresse" />
          </Box>
          <Box title="Véhicule">
            <Line label="Modèle" value={r.car_name} />
            <Line label="Catégorie" value={categoryLabel(r.car_category)} />
            <Line label="Immatriculation" value={r.car_plate} />
            <Line label="Boîte / places" value={[r.car_transmission && formatTransmission(r.car_transmission), r.car_seats && `${r.car_seats} places`].filter(Boolean).join(" · ")} />
            <Line label="Année" value={r.car_year} />
          </Box>
        </div>

        <Box title="Période de location">
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <Line label="Départ" value={`${formatDate(r.start_date, true)}${r.pickup_time ? ` à ${formatTime(r.pickup_time)}` : ""}`} />
              <Line label="Lieu de retrait" value={r.pickup_place + (r.delivery_address ? ` (${r.delivery_address})` : "")} />
            </div>
            <div>
              <Line label="Retour" value={`${formatDate(r.end_date, true)}${r.return_time ? ` à ${formatTime(r.return_time)}` : ""}`} />
              <Line label="Lieu de retour" value={r.return_place} />
            </div>
          </div>
          <Line label="Durée" value={`${days} jour${days > 1 ? "s" : ""}`} />
        </Box>

        <Box title="Tarif et paiement">
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <Line label="Prix par jour" value={r.car_price_per_day ? formatPrice(r.car_price_per_day) : ""} />
              {discount > 0 && <Line label="Prix de base" value={formatPrice(r.base_price)} />}
              {discount > 0 && <Line label="Remise" value={`-${formatPrice(discount)} · ${r.discount_label ?? ""}`} />}
              <Line label="Total à payer" value={formatPrice(r.total_price)} />
            </div>
            <div>
              <Line label="Mode de paiement" value={r.payment_method ? paymentLabels[r.payment_method] : ""} />
              <Line label="Caution" />
              <Line label="Franchise" />
              <Line label="Kilométrage inclus" value="Illimité" />
            </div>
          </div>
        </Box>

        <Box title="État des lieux">
          <div className="grid grid-cols-2 gap-4">
            <InspectionBlock title="Au départ" i={insp.depart} />
            <InspectionBlock title="Au retour" i={insp.retour} compare={insp.depart} />
          </div>
        </Box>

        <Box title="Conditions générales">
          <ol className="list-decimal space-y-1 pl-5 text-[11px] leading-snug text-slate-700">
            {conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </Box>

        <div className="grid grid-cols-2 gap-4 break-inside-avoid">
          {["Le loueur (MYLOC.DZ)", "Le locataire, « lu et approuvé »"].map((who) => (
            <div key={who} className="rounded-xl border border-slate-300 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{who}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] text-slate-500">
                <div>
                  Au départ
                  <div className="mt-1 h-16 rounded-lg border border-dashed border-slate-300" />
                </div>
                <div>
                  Au retour
                  <div className="mt-1 h-16 rounded-lg border border-dashed border-slate-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
