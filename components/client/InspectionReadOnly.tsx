"use client";

import { useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { apiImageUrl, fetchInspections, zoneLabels, type Inspection, type InspectionSet, type ReservationFromApi } from "@/lib/api";
import { CarDamageMap, FuelGauge } from "../admin/CarDamageMap";
import { Modal } from "../admin/ui";
import { reservationRef } from "./shared";
import { dateLocale, useLang } from "@/lib/i18n";

/** Le client consulte les états des lieux faits par l'agence (transparence en cas de litige). */
export function InspectionButton({ r }: { r: ReservationFromApi }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ set: InspectionSet | null; error: string; loading: boolean }>({ set: null, error: "", loading: false });

  const show = () => {
    setOpen(true);
    if (state.set) return;
    setState({ set: null, error: "", loading: true });
    fetchInspections(r.id)
      .then((set) => setState({ set, error: "", loading: false }))
      .catch((e) => setState({ set: null, error: e instanceof Error ? e.message : t("Erreur"), loading: false }));
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3.5 text-sm font-medium hover:bg-slate-50 bg-white text-slate-700 shadow-sm"
      >
        <ClipboardCheck className="h-4 w-4 text-slate-400" />
        {t("État des lieux")}
      </button>
      {open && (
        <Modal title={`${t("État des lieux")} · ${reservationRef(r.id)}`} onClose={() => setOpen(false)} wide>
          <div className="p-5">
            {state.loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : state.error ? (
              <p className="text-sm text-red-700">{state.error}</p>
            ) : !state.set?.depart && !state.set?.retour ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{t("L'état des lieux sera réalisé avec vous à la remise des clés.")}</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <Block title={t("Au départ")} i={state.set?.depart} />
                <Block title={t("Au retour")} i={state.set?.retour} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function Block({ title, i }: { title: string; i?: Inspection }) {
  const { t } = useLang();
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      {!i ? (
        <p className="text-sm text-slate-500">{t("Pas encore réalisé.")}</p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <p>
            <span className="text-slate-500">{t("Kilométrage :")} </span>
            <strong className="font-medium text-slate-900">{i.mileage != null ? `${i.mileage.toLocaleString(dateLocale())} ${t("km")}` : "—"}</strong>
          </p>
          <FuelGauge value={i.fuel_level} />
          <CarDamageMap marked={i.damages.map((d) => d.zone)} className="[&_svg]:h-48" />
          {i.damages.length > 0 && (
            <ul className="list-disc ps-5 text-slate-600">
              {i.damages.map((d) => (
                <li key={d.zone}>
                  {t(zoneLabels[d.zone])}
                  {d.note && ` : ${d.note}`}
                </li>
              ))}
            </ul>
          )}
          {i.notes && <p className="text-slate-600">{i.notes}</p>}
          {i.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {i.photos.map((p, n) => (
                <a
                  key={p}
                  href={apiImageUrl(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("{title} : photo {n} sur {total} (nouvel onglet)", { title, n: n + 1, total: i.photos.length })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={apiImageUrl(p)} alt="" className="h-16 w-20 rounded-md object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
