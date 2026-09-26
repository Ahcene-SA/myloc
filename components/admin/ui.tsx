"use client";

import { useEffect, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import type { ReservationFromApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { todayIso } from "../client/shared";

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

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-full border-2 border-line bg-white pl-11 pr-4 text-sm font-semibold text-navy outline-none placeholder:font-medium placeholder:text-muted/70 focus:border-sky"
      />
    </label>
  );
}

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
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Filtrer">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "flex h-10 flex-shrink-0 items-center gap-2 rounded-full border-2 px-4 text-xs font-bold uppercase tracking-wide",
            value === o.id ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:border-navy"
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={value === o.id ? "text-sky" : "text-muted"}>{o.count}</span>}
        </button>
      ))}
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

/** Panneau latéral (détail d'une réservation). */
export function Drawer({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-mist text-navy hover:bg-line"
          >
            <X className="h-5 w-5" />
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
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <p className="text-lg font-extrabold uppercase text-navy">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-navy hover:bg-line"
          >
            <X className="h-5 w-5" />
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
    <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </p>
  );
}

export function SourceBadge({ source }: { source?: string }) {
  if (source !== "agence") return null;
  return (
    <span className="inline-flex items-center rounded-full bg-navy/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">
      Saisie agence
    </span>
  );
}
