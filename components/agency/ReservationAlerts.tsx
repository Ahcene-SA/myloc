"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, X } from "lucide-react";
import { useAdmin } from "../AdminContext";
import { fetchAgencyUpdates, type ReservationFromApi } from "@/lib/api";
import { playChime, primeAudio, systemNotify, useAlertSound } from "@/lib/alerts";

const POLL_MS = 20_000;
const TOAST_MS = 25_000;

const shortDate = (d?: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";

/**
 * Alertes « nouvelle réservation » de l'espace agence :
 * vérification toutes les 20 s (sans prolonger la session), son, bandeau cliquable,
 * compteur dans le titre de l'onglet et notification système si l'onglet est en arrière-plan.
 */
export function ReservationAlerts() {
  const { reservations, upsertReservation, openReservation } = useAdmin();
  const sound = useAlertSound();
  const soundRef = useRef(sound);
  const lastId = useRef(0);
  const [toasts, setToasts] = useState<ReservationFromApi[]>([]);

  // Les fonctions du contexte changent à chaque rendu : on garde la dernière version
  const actions = useRef({ upsertReservation, openReservation });
  useEffect(() => {
    soundRef.current = sound;
    actions.current = { upsertReservation, openReservation };
  });

  useEffect(() => primeAudio(), []);

  // Vérification régulière (et dès que l'onglet redevient visible)
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    // Une seule vérification à la fois : si l'onglet redevient visible pendant une
    // requête, on ne lance pas une seconde boucle en parallèle.
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      window.clearTimeout(timer);
      try {
        const res = await fetchAgencyUpdates(lastId.current);
        if (cancelled) return;
        const fresh = lastId.current > 0 ? [...res.reservations].reverse() : [];
        lastId.current = Math.max(lastId.current, res.latest_id);
        fresh.forEach((r) => actions.current.upsertReservation(r));
        // Seules les demandes faites par les clients sur le site déclenchent l'alerte
        const incoming = fresh.filter((r) => r.source !== "agence");
        if (incoming.length) {
          if (soundRef.current) playChime();
          // Dédoublonnage par id (une même demande ne s'affiche qu'une fois)
          setToasts((t) => {
            const newest = [...incoming].reverse();
            const ids = new Set(newest.map((x) => x.id));
            return [...newest, ...t.filter((x) => !ids.has(x.id))].slice(0, 3);
          });
          const r = incoming[incoming.length - 1]; // la plus récente
          systemNotify(
            incoming.length > 1 ? `${incoming.length} nouvelles demandes` : "Nouvelle demande de réservation",
            `${r.full_name} · ${r.car_name ?? ""} · ${shortDate(r.start_date)} → ${shortDate(r.end_date)}`,
            () => actions.current.openReservation(r.id)
          );
        }
      } catch {
        /* réseau coupé : on réessaie au prochain tour (une session expirée est gérée par l'API) */
      } finally {
        inFlight = false;
      }
      if (!cancelled) {
        window.clearTimeout(timer);
        timer = window.setTimeout(tick, POLL_MS);
      }
    };

    const onVisible = () => document.visibilityState === "visible" && tick();
    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Fermeture automatique des bandeaux
  useEffect(() => {
    if (!toasts.length) return;
    const t = window.setTimeout(() => setToasts((l) => l.slice(0, -1)), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toasts]);

  // Compteur « (2) » dans le titre de l'onglet
  const pending = reservations.filter((r) => r.status === "pending").length;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = pending > 0 ? `(${pending}) ${base}` : base;
  }, [pending]);
  useEffect(() => () => void (document.title = document.title.replace(/^\(\d+\)\s*/, "")), []);

  const close = (id: number) => setToasts((l) => l.filter((x) => x.id !== id));

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-20 z-[60] flex flex-col items-end gap-3 md:inset-x-auto md:end-6 md:top-6">
      <AnimatePresence initial={false}>
        {toasts.map((r) => (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-3xl border border-sky/30 bg-navy p-4 text-white shadow-2xl"
          >
            <span className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sky text-navy">
              <BellRing className="h-5 w-5" />
              <span className="absolute -end-1 -top-1 h-3 w-3 animate-ping rounded-full bg-amber-400" />
            </span>
            <button
              type="button"
              onClick={() => {
                openReservation(r.id);
                close(r.id);
              }}
              className="min-w-0 flex-1 text-start"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky">Nouvelle demande</p>
              <p className="mt-0.5 truncate text-[15px] font-extrabold">{r.full_name}</p>
              <p className="truncate text-sm text-white/70">
                {r.car_name} · {shortDate(r.start_date)} → {shortDate(r.end_date)}
              </p>
              <p className="mt-1.5 text-xs font-bold text-sky underline-offset-2 hover:underline">Voir et répondre →</p>
            </button>
            <button
              type="button"
              onClick={() => close(r.id)}
              aria-label="Fermer"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
