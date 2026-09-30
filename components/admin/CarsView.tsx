"use client";

import { useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, ImagePlus, Loader2, Pencil, PlusCircle, Trash2, Upload } from "lucide-react";
import { useAdmin } from "../AdminContext";
import { useAuth } from "../AuthContext";
import {
  apiImageUrl,
  createCar,
  deleteCar,
  formatTransmission,
  isOwner,
  updateCar,
  uploadCarImage,
  type CarFromApi,
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
  formatPrice,
  inputClass,
  labelClass,
  primaryBtn,
  secondaryBtn,
  splitCarName,
} from "../client/shared";
import { FilterChips, FormError, Modal, SearchInput } from "./ui";

type Filter = "all" | "online" | "offline";

export function CarsView() {
  const { cars, loading, error, refresh } = useAdmin();
  const { user } = useAuth();
  // Employé : peut seulement mettre en ligne / retirer un véhicule
  const owner = isOwner(user?.role);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CarFromApi | "new" | null>(null);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const q = search.trim().toLowerCase();
  const searched = cars.filter((c) => !q || `${c.name} ${c.category}`.toLowerCase().includes(q));
  const byFilter = (c: CarFromApi, f: Filter) =>
    f === "all" || (f === "online" ? c.status === "available" : c.status !== "available");
  const list = searched.filter((c) => byFilter(c, filter));

  return (
    <div>
      <PageTitle kicker="Flotte" title="Véhicules">
        {owner && (
          <button type="button" onClick={() => setEditing("new")} className={primaryBtn}>
            <PlusCircle className="h-4 w-4" />
            Ajouter un véhicule
          </button>
        )}
      </PageTitle>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un véhicule…" className="lg:max-w-sm lg:flex-1" />
        <FilterChips
          options={(
            [
              { id: "all", label: "Tous" },
              { id: "online", label: "En ligne" },
              { id: "offline", label: "Retirés du site" },
            ] as { id: Filter; label: string }[]
          ).map((o) => ({ ...o, count: searched.filter((c) => byFilter(c, o.id)).length }))}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={cars.length === 0 ? "Aucun véhicule" : "Rien ici"}
          text={cars.length === 0 ? "Ajoutez votre premier véhicule : il apparaîtra sur le site." : "Aucun véhicule ne correspond."}
          action={
            cars.length === 0 && owner ? (
              <button type="button" onClick={() => setEditing("new")} className={primaryBtn}>
                Ajouter un véhicule
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {list.map((c) => (
            <CarAdminCard key={c.id} car={c} owner={owner} onEdit={() => setEditing(c)} />
          ))}
        </div>
      )}

      {editing && <CarFormModal car={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CarAdminCard({ car, owner, onEdit }: { car: CarFromApi; owner: boolean; onEdit: () => void }) {
  const { upsertCar, removeCar } = useAdmin();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const { brand, model } = splitCarName(car.name);
  const online = car.status === "available";

  const toggle = async () => {
    setBusy("toggle");
    setErr("");
    setMsg("");
    try {
      const updated = await updateCar(car.id, { status: online ? "unavailable" : "available" });
      upsertCar({ ...car, ...(updated || {}), status: online ? "unavailable" : "available" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    setErr("");
    try {
      const res = await deleteCar(car.id);
      if (res.deleted) removeCar(car.id);
      else {
        upsertCar({ ...car, status: "unavailable" });
        setMsg(res.message);
      }
      setConfirmDelete(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className={cn("flex flex-col overflow-hidden", !online && "opacity-80")}>
      <div className="relative flex h-36 items-center justify-center border-b border-slate-200 bg-slate-50 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={apiImageUrl(car.image_url)} alt={car.name} className={cn("max-h-24 w-auto object-contain", !online && "grayscale")} />
        <span
          className={cn(
            "absolute start-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
            online ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-white text-slate-600 ring-slate-500/20"
          )}
        >
          {online ? "En ligne" : "Retiré du site"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{categoryLabel(car.category)}</p>
            <p className="truncate text-base font-semibold text-slate-900">
              {brand} {model}
            </p>
          </div>
          <p className="flex-shrink-0 text-end">
            <span className="text-base font-semibold tabular-nums text-slate-900">{formatPrice(car.price_per_day)}</span>
            <span className="block text-xs text-slate-500">/ jour</span>
          </p>
        </div>
        <p className="text-sm text-slate-600">
          {car.plate && <span className="me-1 rounded-md border border-slate-200 px-1.5 py-0.5 bg-slate-50 font-mono text-xs text-slate-700">{car.plate}</span>}
          {formatTransmission(car.transmission)} · {car.seats} places · {car.year}
          {car.reservations_count !== undefined && (
            <span className="text-slate-500">
              {" "}
              · {car.reservations_count} réservation{Number(car.reservations_count) > 1 ? "s" : ""}
            </span>
          )}
        </p>

        {msg && <p className="rounded-md border border-sky/30 bg-sky-soft/40 px-3 py-2 text-xs text-slate-700">{msg}</p>}
        {err && <p className="text-sm text-red-700">{err}</p>}

        <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={remove}
                disabled={!!busy}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
              >
                {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin" />}
                Oui, supprimer
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={cn(secondaryBtn, "h-8 px-3")}
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              {owner && (
                <button
                  type="button"
                  onClick={onEdit}
                  className={cn(secondaryBtn, "h-8 px-3")}
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </button>
              )}
              <button
                type="button"
                onClick={toggle}
                disabled={!!busy}
                className={cn(secondaryBtn, "h-8 px-3")}
              >
                {busy === "toggle" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : online ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {online ? "Retirer du site" : "Remettre en ligne"}
              </button>
              {owner && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label={`Supprimer ${car.name}`}
                  className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

const currentYear = new Date().getFullYear();

function CarFormModal({ car, onClose }: { car: CarFromApi | null; onClose: () => void }) {
  const { upsertCar } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    name: car?.name || "",
    plate: car?.plate || "",
    category: car?.category || "citadine",
    price: car ? String(parseFloat(String(car.price_per_day)) || "") : "",
    transmission: (car?.transmission || "manuel").toLowerCase().startsWith("auto") ? "automatique" : "manuel",
    seats: String(car?.seats ?? 5),
    year: String(car?.year ?? currentYear),
    description: car?.description || "",
    image: car?.image_url || "",
    online: car ? car.status === "available" : true,
  });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setErr("Image trop lourde (5 Mo maximum).");
    setUploading(true);
    setErr("");
    try {
      set("image", await uploadCarImage(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Envoi de l'image impossible.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const payload: Partial<CarFromApi> = {
      name: f.name.trim(),
      plate: f.plate.trim(),
      category: f.category,
      price_per_day: f.price,
      transmission: f.transmission,
      seats: Number(f.seats),
      year: Number(f.year),
      description: f.description.trim(),
      image_url: f.image,
      status: f.online ? "available" : "unavailable",
    };
    try {
      const saved = car ? await updateCar(car.id, payload) : await createCar(payload);
      if (saved) upsertCar({ ...(car || {}), ...saved });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title={car ? "Modifier le véhicule" : "Ajouter un véhicule"} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
        {/* Photo */}
        <div className="sm:col-span-2">
          <p className={labelClass}>Photo</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 sm:w-56">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : f.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={apiImageUrl(f.image)} alt="" className="max-h-28 w-auto object-contain" />
              ) : (
                <ImagePlus className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-500">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={cn(secondaryBtn, "w-fit")}>
                <Upload className="h-4 w-4" />
                {f.image ? "Changer la photo" : "Choisir une photo"}
              </button>
              <p>PNG détouré (fond transparent) conseillé, 5 Mo maximum.</p>
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="car-name" className={labelClass}>
            Marque et modèle
          </label>
          <input
            id="car-name"
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
            placeholder="Ex. : Renault Clio 5"
            required
            minLength={2}
            maxLength={100}
          />
          <p className="mt-1.5 text-xs text-slate-500">Le premier mot est affiché comme la marque, le reste en bleu.</p>
        </div>
        <div>
          <label htmlFor="car-plate" className={labelClass}>
            Immatriculation
          </label>
          <input
            id="car-plate"
            value={f.plate}
            onChange={(e) => set("plate", e.target.value.toUpperCase())}
            className={cn(inputClass, "font-mono")}
            placeholder="Ex. : 12345-124-16"
            maxLength={20}
          />
          <p className="mt-1.5 text-xs text-slate-500">Interne : figure sur le contrat, jamais sur le site.</p>
        </div>
        <div>
          <label htmlFor="car-cat" className={labelClass}>
            Catégorie
          </label>
          <select id="car-cat" value={f.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
            {Object.entries(categoryInfo).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="car-price" className={labelClass}>
            Prix par jour ({site.currency})
          </label>
          <input
            id="car-price"
            type="number"
            min={1}
            step="0.01"
            value={f.price}
            onChange={(e) => set("price", e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="car-trans" className={labelClass}>
            Boîte de vitesses
          </label>
          <select id="car-trans" value={f.transmission} onChange={(e) => set("transmission", e.target.value)} className={inputClass}>
            <option value="manuel">Manuelle</option>
            <option value="automatique">Automatique</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="car-seats" className={labelClass}>
              Places
            </label>
            <input id="car-seats" type="number" min={1} max={9} value={f.seats} onChange={(e) => set("seats", e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="car-year" className={labelClass}>
              Année
            </label>
            <input
              id="car-year"
              type="number"
              min={1990}
              max={currentYear + 1}
              value={f.year}
              onChange={(e) => set("year", e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="car-desc" className={labelClass}>
            Description (facultatif)
          </label>
          <textarea
            id="car-desc"
            rows={2}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky focus:ring-2 focus:ring-sky/25"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={f.online} onChange={(e) => set("online", e.target.checked)} className="h-4 w-4 accent-sky" />
          Visible sur le site et réservable par les clients
        </label>

        <div className="sm:col-span-2">
          <FormError message={err} />
        </div>

        <div className="-mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Annuler
          </button>
          <button type="submit" disabled={busy || uploading} className={primaryBtn}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {car ? "Enregistrer" : "Ajouter le véhicule"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
