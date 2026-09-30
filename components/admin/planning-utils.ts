/**
 * Calculs du planning (heure locale uniquement : jamais new Date("YYYY-MM-DD"),
 * qui serait lu comme de l'UTC et décalerait les jours).
 */
import type { ReservationFromApi } from "@/lib/api";

const DAY_MS = 86_400_000;
/** Heure de départ / retour par défaut quand elle n'est pas renseignée. */
export const DEFAULT_HOUR = 10;

export function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Nombre de jours (calendaires) de `from` à `iso` — insensible aux changements d'heure. */
export function dayDiff(from: string, iso: string): number {
  return Math.round((parseIso(iso).getTime() - parseIso(from).getTime()) / DAY_MS);
}

/** « 14:30:00 » → 14,5 (heures décimales), valeur par défaut sinon. */
export function hourOf(time?: string | null, fallback = DEFAULT_HOUR): number {
  const m = (time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return fallback;
  return Math.min(24, +m[1] + +m[2] / 60);
}

/** « 14:00:00 » → « 14h », « 09:30:00 » → « 9h30 », défaut → « 10h ». */
export function hourLabel(time?: string | null): string {
  const h = hourOf(time);
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h${mm ? String(mm).padStart(2, "0") : ""}`;
}

export function isWeekend(iso: string): boolean {
  const d = parseIso(iso).getDay();
  return d === 5 || d === 6; // vendredi / samedi (week-end en Algérie)
}

/** Premier jour de la semaine algérienne (dimanche) : séparateur de semaine plus marqué. */
export function isWeekStart(iso: string): boolean {
  return parseIso(iso).getDay() === 0;
}

export function shortDate(iso: string): string {
  return parseIso(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function weekdayShort(iso: string): string {
  return parseIso(iso).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
}

export function monthLabel(iso: string): string {
  const s = parseIso(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Jours consécutifs regroupés par mois (en-tête « Octobre 2026 »). */
export function monthGroups(days: string[]): { label: string; short: string; start: number; span: number }[] {
  const groups: { label: string; short: string; start: number; span: number }[] = [];
  days.forEach((d, i) => {
    const key = d.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && days[last.start].slice(0, 7) === key) last.span++;
    else groups.push({ label: monthLabel(d), short: parseIso(d).toLocaleDateString("fr-FR", { month: "short" }), start: i, span: 1 });
  });
  return groups;
}

export function rangeLabel(from: string, days: number, addDays: (iso: string, n: number) => string): string {
  const a = parseIso(from);
  const b = parseIso(addDays(from, days - 1));
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
  const right = b.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return `${left} – ${right}`;
}

/** Position d'une réservation, en jours (décimaux) depuis le début de la période affichée. */
export interface BarSpan {
  r: ReservationFromApi;
  /** Début / fin réels (peuvent déborder de la période) */
  start: number;
  end: number;
  /** Début / fin bornés à la période affichée */
  left: number;
  right: number;
  clippedStart: boolean;
  clippedEnd: boolean;
  lane: number;
}

export function reservationSpan(r: ReservationFromApi, from: string): { start: number; end: number } {
  const start = dayDiff(from, r.start_date || from) + hourOf(r.pickup_time) / 24;
  let end = dayDiff(from, r.end_date || r.start_date || from) + hourOf(r.return_time) / 24;
  if (end <= start) end = start + 0.5; // données incohérentes : barre minimale
  return { start, end };
}

/**
 * Barres visibles d'un véhicule, réparties en sous-lignes quand elles se chevauchent
 * (demandes en attente sur un créneau déjà pris, par exemple).
 */
export function layoutBars(list: ReservationFromApi[], from: string, days: number): { bars: BarSpan[]; lanes: number } {
  const spans = list
    .map((r) => ({ r, ...reservationSpan(r, from) }))
    .filter((s) => s.end > 0 && s.start < days)
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const laneEnds: number[] = [];
  const bars = spans.map((s) => {
    let lane = laneEnds.findIndex((end) => end <= s.start + 1e-6);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(s.end);
    } else laneEnds[lane] = s.end;
    return {
      ...s,
      left: Math.max(0, s.start),
      right: Math.min(days, s.end),
      clippedStart: s.start < 0,
      clippedEnd: s.end > days,
      lane,
    };
  });
  return { bars, lanes: Math.max(1, laneEnds.length) };
}

/** Durée occupée (en jours, chevauchements fusionnés) sur la période affichée. */
export function occupiedDays(bars: Pick<BarSpan, "left" | "right">[]): number {
  const sorted = [...bars].sort((a, b) => a.left - b.left);
  let total = 0;
  let curL = -1;
  let curR = -1;
  for (const b of sorted) {
    if (b.left > curR) {
      if (curR > curL) total += curR - curL;
      curL = b.left;
      curR = b.right;
    } else curR = Math.max(curR, b.right);
  }
  if (curR > curL) total += curR - curL;
  return total;
}

/** Le véhicule est-il sorti (même en partie) pendant le jour d'indice `i` ? */
export function busyOnDay(bars: Pick<BarSpan, "left" | "right">[], i: number): boolean {
  return bars.some((b) => b.left < i + 1 && b.right > i);
}

export function percent(n: number): string {
  return `${Math.round(n * 100)} %`;
}
