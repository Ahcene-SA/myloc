"use client";

import { useRef, useState, type FormEvent } from "react";
import { Camera, Loader2, X } from "lucide-react";
import {
  apiImageUrl,
  saveInspection,
  uploadInspectionPhoto,
  zoneLabels,
  type DamageZone,
  type InspectionSet,
  type InspectionType,
  type ReservationFromApi,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { inputClass, labelClass, primaryBtn, reservationRef, secondaryBtn } from "../client/shared";
import { CarDamageMap, FuelGauge } from "./CarDamageMap";
import { FormError, Modal } from "./ui";

export function InspectionModal({
  r,
  type,
  inspections,
  onClose,
  onSaved,
}: {
  r: ReservationFromApi;
  type: InspectionType;
  inspections: InspectionSet;
  onClose: () => void;
  onSaved: (set: InspectionSet) => void;
}) {
  const existing = inspections[type];
  const depart = inspections.depart;
  const fileRef = useRef<HTMLInputElement>(null);

  const [mileage, setMileage] = useState(existing?.mileage != null ? String(existing.mileage) : "");
  const [fuel, setFuel] = useState<number | null>(existing?.fuel_level ?? (type === "depart" ? 8 : null));
  const [damages, setDamages] = useState<{ zone: DamageZone; note: string }[]>(
    existing?.damages ?? (type === "retour" && depart ? depart.damages.map((d) => ({ ...d })) : [])
  );
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const zones = damages.map((d) => d.zone);
  const departZones = depart?.damages.map((d) => d.zone) ?? [];
  const newZones = type === "retour" ? zones.filter((z) => !departZones.includes(z)) : [];

  const toggle = (z: DamageZone) =>
    setDamages((list) => (list.some((d) => d.zone === z) ? list.filter((d) => d.zone !== z) : [...list, { zone: z, note: "" }]));

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr("");
    const list = Array.from(files).slice(0, 12 - photos.length);
    setUploading((n) => n + list.length);
    for (const f of list) {
      try {
        const path = await uploadInspectionPhoto(f);
        setPhotos((p) => [...p, path]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Envoi d'une photo impossible.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const km = mileage ? Number(mileage) : null;
  const driven = type === "retour" && km !== null && depart?.mileage != null ? km - depart.mileage : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (driven !== null && driven < 0) return setErr("Le kilométrage de retour est inférieur à celui du départ.");
    setBusy(true);
    setErr("");
    try {
      const set = await saveInspection(r.id, type, {
        mileage: km,
        fuel_level: fuel,
        damages,
        photos,
        notes: notes.trim() || null,
      });
      onSaved(set);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title={`État des lieux · ${type === "depart" ? "départ" : "retour"}`} onClose={onClose} wide>
      <form onSubmit={submit} className="flex flex-col gap-6 p-5">
        <p className="-mt-2 text-sm text-slate-500">
          {reservationRef(r.id)} · {r.car_name} · {r.full_name}
        </p>

        <div className="grid gap-6 md:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-6">
            <div>
              <label htmlFor="insp-km" className={labelClass}>
                Kilométrage
              </label>
              <input
                id="insp-km"
                type="number"
                inputMode="numeric"
                min={0}
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className={inputClass}
                placeholder="Ex. : 42150"
              />
              {type === "retour" && depart?.mileage != null && (
                <p className={cn("mt-1.5 text-sm", driven !== null && driven < 0 ? "text-red-700" : "text-slate-500")}>
                  Départ : {depart.mileage.toLocaleString("fr-FR")} km
                  {driven !== null && driven >= 0 && (
                    <span className="text-slate-900"> · {driven.toLocaleString("fr-FR")} km parcourus</span>
                  )}
                </p>
              )}
            </div>

            <div>
              <p className={labelClass}>Carburant</p>
              <FuelGauge value={fuel} onChange={setFuel} />
              {type === "retour" && depart?.fuel_level != null && fuel !== null && fuel < depart.fuel_level && (
                <p className="mt-1.5 text-sm text-amber-700">
                  Moins qu&apos;au départ ({depart.fuel_level}/8) : prévoir le complément.
                </p>
              )}
            </div>

            <div>
              <p className={labelClass}>Dommages {damages.length > 0 && `(${damages.length})`}</p>
              {damages.length === 0 ? (
                <p className="rounded-md border border-emerald-600/20 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                  Aucun dommage signalé. Touchez une zone de la voiture pour en ajouter un.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {damages.map((d, i) => (
                    <li key={d.zone} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-28 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset sm:w-36",
                          newZones.includes(d.zone) ? "bg-amber-50 text-amber-800 ring-amber-600/20" : "bg-red-50 text-red-700 ring-red-600/20"
                        )}
                      >
                        {zoneLabels[d.zone]}
                        {newZones.includes(d.zone) && " · nouveau"}
                      </span>
                      <input
                        value={d.note}
                        onChange={(e) => setDamages((l) => l.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)))}
                        placeholder="Ex. : rayure 10 cm"
                        aria-label={`Détail ${zoneLabels[d.zone]}`}
                        maxLength={200}
                        className={cn(inputClass, "h-8")}
                      />
                      <button
                        type="button"
                        onClick={() => toggle(d.zone)}
                        aria-label={`Retirer ${zoneLabels[d.zone]}`}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <CarDamageMap marked={zones} highlight={newZones} onToggle={toggle} />
          </div>
        </div>

        <div>
          <p className={labelClass}>Photos ({photos.length}/12)</p>
          <div className="flex flex-wrap gap-3">
            {photos.map((p) => (
              <div key={p} className="group relative h-24 w-32 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={apiImageUrl(p)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((l) => l.filter((x) => x !== p))}
                  aria-label="Retirer la photo"
                  className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-slate-900/70 text-white hover:bg-slate-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <div key={`u${i}`} className="flex h-24 w-32 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ))}
            {photos.length + uploading < 12 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-32 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
              >
                <Camera className="h-5 w-5 text-slate-400" />
                Ajouter
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => addPhotos(e.target.files)}
          />
          <p className="mt-2 text-xs text-slate-500">Sur téléphone, le bouton ouvre directement l&apos;appareil photo. Les photos sont allégées avant l&apos;envoi.</p>
        </div>

        <div>
          <label htmlFor="insp-notes" className={labelClass}>
            Remarques
          </label>
          <textarea
            id="insp-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            placeholder="Ex. : siège bébé fourni, véhicule propre"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky focus:ring-2 focus:ring-sky/25"
          />
        </div>

        <FormError message={err} />

        <div className="-mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Annuler
          </button>
          <button type="submit" disabled={busy || uploading > 0} className={primaryBtn}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer l&apos;état des lieux
          </button>
        </div>
      </form>
    </Modal>
  );
}
