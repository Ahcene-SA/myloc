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
      <form onSubmit={submit} className="flex flex-col gap-6 p-6">
        <p className="-mt-2 text-sm text-muted">
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
                <p className={cn("mt-1.5 text-sm font-semibold", driven !== null && driven < 0 ? "text-red-700" : "text-muted")}>
                  Départ : {depart.mileage.toLocaleString("fr-FR")} km
                  {driven !== null && driven >= 0 && (
                    <span className="text-navy"> · {driven.toLocaleString("fr-FR")} km parcourus</span>
                  )}
                </p>
              )}
            </div>

            <div>
              <p className={labelClass}>Carburant</p>
              <FuelGauge value={fuel} onChange={setFuel} />
              {type === "retour" && depart?.fuel_level != null && fuel !== null && fuel < depart.fuel_level && (
                <p className="mt-1.5 text-sm font-semibold text-amber-700">
                  Moins qu&apos;au départ ({depart.fuel_level}/8) : prévoir le complément.
                </p>
              )}
            </div>

            <div>
              <p className={labelClass}>Dommages {damages.length > 0 && `(${damages.length})`}</p>
              {damages.length === 0 ? (
                <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  Aucun dommage signalé. Touchez une zone de la voiture pour en ajouter un.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {damages.map((d, i) => (
                    <li key={d.zone} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-36 flex-shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                          newZones.includes(d.zone) ? "bg-amber-100 text-amber-900" : "bg-red-50 text-red-700"
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
                        className={cn(inputClass, "h-10 text-sm")}
                      />
                      <button
                        type="button"
                        onClick={() => toggle(d.zone)}
                        aria-label={`Retirer ${zoneLabels[d.zone]}`}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-mist p-4">
            <CarDamageMap marked={zones} highlight={newZones} onToggle={toggle} />
          </div>
        </div>

        <div>
          <p className={labelClass}>Photos ({photos.length}/12)</p>
          <div className="flex flex-wrap gap-3">
            {photos.map((p) => (
              <div key={p} className="group relative h-24 w-32 overflow-hidden rounded-2xl bg-mist">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={apiImageUrl(p)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((l) => l.filter((x) => x !== p))}
                  aria-label="Retirer la photo"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-navy/80 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <div key={`u${i}`} className="flex h-24 w-32 items-center justify-center rounded-2xl bg-mist">
                <Loader2 className="h-5 w-5 animate-spin text-sky" />
              </div>
            ))}
            {photos.length + uploading < 12 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-32 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-xs font-bold text-navy hover:border-sky"
              >
                <Camera className="h-5 w-5 text-sky-text" />
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
          <p className="mt-2 text-xs text-muted">Sur téléphone, le bouton ouvre directement l&apos;appareil photo. Les photos sont allégées avant l&apos;envoi.</p>
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
            className="w-full rounded-2xl border-2 border-line bg-mist px-4 py-3 text-sm font-semibold text-navy outline-none focus:border-sky focus:bg-white"
          />
        </div>

        <FormError message={err} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
