"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Copy, Loader2, Pencil, Plus, PlusCircle, Trash2, X } from "lucide-react";
import {
  deletePromo,
  fetchPromos,
  savePromo,
  type PromoCode,
} from "@/lib/api";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Card, ErrorBlock, LoadingBlock, PageTitle, formatDate, inputClass, labelClass, primaryBtn, secondaryBtn, todayIso } from "../client/shared";
import { FormError, Modal } from "./ui";

function promoValue(p: PromoCode) {
  const v = parseFloat(String(p.discount_value)) || 0;
  return p.discount_type === "percent" ? `-${v} %` : `-${v} ${site.currency}`;
}

function promoState(p: PromoCode): { label: string; cls: string } {
  const today = todayIso();
  if (!Number(p.active)) return { label: "Désactivé", cls: "bg-slate-50 text-slate-600 ring-slate-500/20" };
  if (p.valid_until && p.valid_until < today) return { label: "Expiré", cls: "bg-slate-50 text-slate-600 ring-slate-500/20" };
  if (p.max_uses && p.uses >= p.max_uses) return { label: "Épuisé", cls: "bg-slate-50 text-slate-600 ring-slate-500/20" };
  if (p.valid_from && p.valid_from > today) return { label: "Programmé", cls: "bg-sky-soft/60 text-sky-text ring-sky/30" };
  return { label: "Actif", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" };
}

export function PromosView() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<PromoCode | "new" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPromos()
      .then((p) => {
        if (cancelled) return;
        setPromos(p);
        setError("");
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Chargement impossible."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) return <LoadingBlock />;
  if (error)
    return (
      <ErrorBlock
        message={error}
        onRetry={() => {
          setLoading(true);
          setReloadKey((k) => k + 1);
        }}
      />
    );

  const upsert = (p: PromoCode) => setPromos((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [p, ...l]));

  return (
    <div>
      <PageTitle kicker="Tarifs" title="Codes promo">
        <button type="button" onClick={() => setEditing("new")} className={primaryBtn}>
          <PlusCircle className="h-4 w-4" />
          Créer un code promo
        </button>
      </PageTitle>

      <p className="mb-4 text-sm text-slate-500">
        Les remises ne s&apos;appliquent que par un code promo que vous créez et partagez : jamais automatiquement.
      </p>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Codes promo</p>
            <p className="text-sm text-slate-500">À partager sur Instagram, WhatsApp ou à vos clients fidèles. Le client le saisit à la réservation.</p>
          </div>
        </div>
        {promos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Aucun code pour l&apos;instant. Exemple : <strong className="text-slate-900">ETE26</strong> pour -15 % cet été.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {promos.map((p) => (
              <PromoRow key={p.id} p={p} onEdit={() => setEditing(p)} onChange={upsert} onDelete={() => setPromos((l) => l.filter((x) => x.id !== p.id))} />
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <PromoForm
          promo={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            upsert(p);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}


function PromoRow({
  p,
  onEdit,
  onChange,
  onDelete,
}: {
  p: PromoCode;
  onEdit: () => void;
  onChange: (p: PromoCode) => void;
  onDelete: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const state = promoState(p);

  const toggle = async () => {
    setBusy(true);
    setErr("");
    try {
      const saved = await savePromo({ ...p, active: !Number(p.active) });
      if (saved) onChange(saved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deletePromo(p.id);
      onDelete();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Suppression impossible.");
      setBusy(false);
    }
  };

  const conditions = [
    p.min_days ? `dès ${p.min_days} jours` : "",
    p.valid_from || p.valid_until
      ? `${p.valid_from ? `du ${formatDate(p.valid_from)}` : ""}${p.valid_until ? ` jusqu'au ${formatDate(p.valid_until)}` : ""}`.trim()
      : "",
    `${p.uses}${p.max_uses ? `/${p.max_uses}` : ""} utilisation${p.uses > 1 ? "s" : ""}`,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 px-5 py-3 hover:bg-slate-50/60 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(p.code).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
          title="Copier le code"
          className="group flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-sm font-medium text-slate-900 hover:border-slate-300"
        >
          {p.code}
          <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {promoValue(p)} {p.description && <span className="font-normal text-slate-500">· {p.description}</span>}
          </p>
          <p className="text-xs text-slate-500">{copied ? "Code copié !" : conditions.join(" · ")}</p>
          {err && <p className="text-xs text-red-700">{err}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", state.cls)}>{state.label}</span>
        {confirm ? (
          <>
            <button type="button" onClick={remove} disabled={busy} className="h-8 rounded-md bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700">
              Supprimer
            </button>
            <button type="button" onClick={() => setConfirm(false)} className={cn(secondaryBtn, "h-8 px-3")}>
              Annuler
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className={cn(secondaryBtn, "h-8 px-3")}
            >
              {Number(p.active) ? "Désactiver" : "Activer"}
            </button>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Modifier ${p.code}`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirm(true)}
              aria-label={`Supprimer ${p.code}`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function PromoForm({ promo, onClose, onSaved }: { promo: PromoCode | null; onClose: () => void; onSaved: (p: PromoCode) => void }) {
  const [f, setF] = useState({
    code: promo?.code || "",
    description: promo?.description || "",
    discount_type: promo?.discount_type || "percent",
    discount_value: promo ? String(parseFloat(String(promo.discount_value))) : "10",
    min_days: promo?.min_days ? String(promo.min_days) : "",
    valid_from: promo?.valid_from || "",
    valid_until: promo?.valid_until || "",
    max_uses: promo?.max_uses ? String(promo.max_uses) : "",
    active: promo ? !!Number(promo.active) : true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const saved = await savePromo({
        id: promo?.id,
        code: f.code,
        description: f.description,
        discount_type: f.discount_type as "percent" | "fixed",
        discount_value: f.discount_value,
        min_days: f.min_days ? Number(f.min_days) : null,
        valid_from: f.valid_from || null,
        valid_until: f.valid_until || null,
        max_uses: f.max_uses ? Number(f.max_uses) : null,
        active: f.active,
      });
      if (saved) onSaved(saved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title={promo ? "Modifier le code" : "Nouveau code promo"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="pc-code" className={labelClass}>
            Code
          </label>
          <input
            id="pc-code"
            value={f.code}
            onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
            className={cn(inputClass, "font-mono")}
            placeholder="ETE26"
            required
            minLength={3}
            maxLength={40}
            pattern="[A-Za-z0-9_\-]{3,40}"
          />
        </div>
        <div>
          <label htmlFor="pc-type" className={labelClass}>
            Type de remise
          </label>
          <select id="pc-type" value={f.discount_type} onChange={(e) => set("discount_type", e.target.value as "percent" | "fixed")} className={inputClass}>
            <option value="percent">Pourcentage (%)</option>
            <option value="fixed">Montant fixe ({site.currency})</option>
          </select>
        </div>
        <div>
          <label htmlFor="pc-value" className={labelClass}>
            Valeur
          </label>
          <input
            id="pc-value"
            type="number"
            min={1}
            max={f.discount_type === "percent" ? 90 : undefined}
            step="0.5"
            value={f.discount_value}
            onChange={(e) => set("discount_value", e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pc-desc" className={labelClass}>
            Description (pour vous)
          </label>
          <input id="pc-desc" value={f.description} onChange={(e) => set("description", e.target.value)} className={inputClass} maxLength={160} placeholder="Ex. : Offre Instagram été" />
        </div>
        <div>
          <label htmlFor="pc-from" className={labelClass}>
            Valable du (facultatif)
          </label>
          <input id="pc-from" type="date" value={f.valid_from} onChange={(e) => set("valid_from", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pc-until" className={labelClass}>
            Jusqu&apos;au (facultatif)
          </label>
          <input id="pc-until" type="date" value={f.valid_until} min={f.valid_from || undefined} onChange={(e) => set("valid_until", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pc-min" className={labelClass}>
            Durée minimale (jours)
          </label>
          <input id="pc-min" type="number" min={1} value={f.min_days} onChange={(e) => set("min_days", e.target.value)} className={inputClass} placeholder="Aucune" />
        </div>
        <div>
          <label htmlFor="pc-max" className={labelClass}>
            Utilisations max.
          </label>
          <input id="pc-max" type="number" min={1} value={f.max_uses} onChange={(e) => set("max_uses", e.target.value)} className={inputClass} placeholder="Illimité" />
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-sky" />
          Code actif
        </label>
        <div className="sm:col-span-2">
          <FormError message={err} />
        </div>
        <div className="-mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Annuler
          </button>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {promo ? "Enregistrer" : "Créer le code"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
