"use client";

import { useEffect, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import type { ReservationFromApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { todayIso } from "../client/shared";
import { useLang } from "@/lib/i18n";

/* ─────────────── Dates & phases d'une location ─────────────── */

export type Phase = "pending" | "upcoming" | "ongoing" | "past" | "closed";

/** Où en est la réservation, vu de l'agence. */
export function phaseOf(r: ReservationFromApi, today = todayIso()): Phase {
  if (r.status === "pending") return "pending";
  if (r.status !== "confirmed") return "closed";
  if ((r.start_date || "") > today) return "upcoming";
  if ((r.end_date || "") >= today) return "ongoing";
  return "past";
}

export const phaseLabel: Record<Phase, string> = {
  pending: "À traiter",
  upcoming: "À venir",
  ongoing: "En cours",
  past: "Terminée",
  closed: "Annulée / refusée",
};

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/**
 * Horodatage du serveur (« YYYY-MM-DD HH:MM:SS », sans fuseau, déjà à l'heure d'Alger) :
 * affiché tel quel, sans conversion par le fuseau du navigateur (PC ou téléphone
 * réglé sur un autre pays, anciens Safari qui lisent ces dates comme de l'UTC).
 */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    // Heure « murale » : construite en UTC et formatée en UTC, donc jamais décalée
    const wall = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)));
    return wall.toLocaleString("fr-FR", { ...opts, timeZone: "UTC" });
  }
  // Date avec fuseau explicite (Z, +01:00…) : affichée à l'heure de l'agence
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-FR", { ...opts, timeZone: "Africa/Algiers" });
}

/* ─────────────── Contact client ─────────────── */

/** « 0555 12 34 56 » → « 213555123456 » (format international pour WhatsApp). */
export function internationalPhone(phone?: string | null): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) digits = `213${digits.slice(1)}`;
  return digits;
}

export function clientWhatsApp(phone?: string | null, text?: string): string {
  const n = internationalPhone(phone);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(phone?: string | null): string {
  return `tel:${(phone || "").replace(/[^\d+]/g, "")}`;
}

/* ─────────────── Blocs d'interface ─────────────── */

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-slate-300 bg-white ps-9 pe-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky focus:ring-2 focus:ring-sky/25"
      />
    </label>
  );
}

/** Filtres en onglets segmentés. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
      <div className="inline-flex gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Filtrer">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={cn(
              "flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors",
              value === o.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("text-xs tabular-nums", value === o.id ? "text-slate-500" : "text-slate-400")}>{o.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

const closeBtn =
  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900";

/** Panneau latéral (détail d'une réservation). */
export function Drawer({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEscape(onClose);
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="absolute inset-y-0 end-0 flex w-full max-w-xl flex-col border-s border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">{title}</div>
          <button type="button" onClick={onClose} aria-label={t("Fermer")} className={closeBtn}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/** Fenêtre centrée (formulaires). */
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEscape(onClose);
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-lg border border-slate-200 bg-white shadow-xl sm:rounded-lg",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <button type="button" onClick={onClose} aria-label={t("Fermer")} className={closeBtn}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function SourceBadge({ source }: { source?: string }) {
  if (source !== "agence") return null;
  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
      Saisie agence
    </span>
  );
}
