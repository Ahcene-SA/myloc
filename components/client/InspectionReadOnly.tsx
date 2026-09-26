"use client";

import { useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { apiImageUrl, fetchInspections, zoneLabels, type Inspection, type InspectionSet, type ReservationFromApi } from "@/lib/api";
import { CarDamageMap, FuelGauge } from "../admin/CarDamageMap";
import { Modal } from "../admin/ui";
import { reservationRef } from "./shared";

/** Le client consulte les états des lieux faits par l'agence (transparence en cas de litige). */
export function InspectionButton({ r }: { r: ReservationFromApi }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ set: InspectionSet | null; error: string; loading: boolean }>({ set: null, error: "", loading: false });

  const show = () => {
    setOpen(true);
    if (state.set) return;
    setState({ set: null, error: "", loading: true });
    fetchInspections(r.id)
      .then((set) => setState({ set, error: "", loading: false }))
      .catch((e) => setState({ set: null, error: e instanceof Error ? e.message : "Erreur", loading: false }));
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-line px-4 text-xs font-bold text-navy hover:border-navy"
      >
        <ClipboardCheck className="h-4 w-4 text-sky-text" />
        État des lieux
      </button>
      {open && (
        <Modal title={`État des lieux · ${reservationRef(r.id)}`} onClose={() => setOpen(false)} wide>
          <div className="p-6">
            {state.loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-sky" />
              </div>
            ) : state.error ? (
              <p className="text-sm font-semibold text-red-700">{state.error}</p>
            ) : !state.set?.depart && !state.set?.retour ? (
              <p className="rounded-2xl bg-mist p-6 text-center text-sm text-muted">L&apos;état des lieux sera réalisé avec vous à la remise des clés.</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <Block title="Au départ" i={state.set?.depart} />
                <Block title="Au retour" i={state.set?.retour} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function Block({ title, i }: { title: string; i?: Inspection }) {
  return (
    <div className="rounded-3xl border border-line p-5">
      <p className="mb-3 text-sm font-extrabold uppercase text-navy">{title}</p>
      {!i ? (
        <p className="text-sm text-muted">Pas encore réalisé.</p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <p>
            <span className="text-muted">Kilométrage : </span>
            <strong className="text-navy">{i.mileage != null ? `${i.mileage.toLocaleString("fr-FR")} km` : "—"}</strong>
          </p>
          <FuelGauge value={i.fuel_level} />
          <CarDamageMap marked={i.damages.map((d) => d.zone)} className="[&_svg]:h-48" />
          {i.damages.length > 0 && (
            <ul className="list-disc pl-5 text-ink-soft">
              {i.damages.map((d) => (
                <li key={d.zone}>
                  {zoneLabels[d.zone]}
                  {d.note && ` : ${d.note}`}
                </li>
              ))}
            </ul>
          )}
          {i.notes && <p className="text-ink-soft">{i.notes}</p>}
          {i.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {i.photos.map((p) => (
                <a key={p} href={apiImageUrl(p)} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={apiImageUrl(p)} alt="" className="h-16 w-20 rounded-xl object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
