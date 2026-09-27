"use client";

import { useSyncExternalStore } from "react";

/**
 * Réglages des alertes de l'espace agence (par navigateur) :
 * son à chaque nouvelle demande et notifications du système (onglet en arrière-plan).
 */
const KEY = "myloc_alert_sound";
const listeners = new Set<() => void>();

function readSound(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setAlertSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* navigation privée : réglage non conservé */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useAlertSound(): boolean {
  return useSyncExternalStore(subscribe, readSound, () => true);
}

export type NotifState = "unsupported" | "default" | "granted" | "denied";

export function notificationState(): NotifState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifState;
}

export async function askNotificationPermission(): Promise<NotifState> {
  if (notificationState() === "unsupported") return "unsupported";
  const result = await Notification.requestPermission();
  listeners.forEach((l) => l());
  return result as NotifState;
}

export function useNotificationState(): NotifState {
  return useSyncExternalStore(subscribe, notificationState, () => "unsupported");
}

/** Notification système, seulement quand l'onglet n'est pas regardé. */
export function systemNotify(title: string, body: string, onClick?: () => void) {
  if (notificationState() !== "granted" || document.visibilityState === "visible") return;
  try {
    const n = new Notification(title, { body, icon: "favicon.ico", tag: "myloc-reservation" });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch {
    /* Safari iOS : pas de notification hors application installée */
  }
}

// ───────── Son ─────────

let ctx: AudioContext | null = null;

/** Les navigateurs n'autorisent le son qu'après un clic : on prépare l'audio au premier clic. */
export function primeAudio() {
  if (typeof window === "undefined") return;
  const unlock = () => {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx ??= new AC();
      if (ctx.state === "suspended") void ctx.resume();
    } catch {
      /* pas d'audio */
    }
  };
  // À chaque clic : Safari remet parfois l'audio en pause quand l'onglet passe en arrière-plan
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true });
  return () => {
    window.removeEventListener("pointerdown", unlock, { capture: true });
    window.removeEventListener("keydown", unlock, { capture: true });
  };
}

/** Petit carillon à deux notes (aucun fichier audio à charger). */
export function playChime() {
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  [
    [880, 0],
    [1318.5, 0.16],
  ].forEach(([freq, delay]) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.6);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.65);
  });
}
