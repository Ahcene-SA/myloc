"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { useAuth } from "../AuthContext";
import { agencyPing } from "@/lib/api";
import { pageUrl } from "@/lib/routes";

const IDLE_MS = 30 * 60_000; // déconnexion après 30 min sans activité
const WARN_MS = 60_000; // avertissement 1 min avant
const PING_MS = 5 * 60_000; // l'activité est signalée au serveur toutes les 5 min au plus

/**
 * Sessions agence : si personne ne touche le PC de l'agence pendant 30 minutes,
 * on se déconnecte tout seul (le serveur applique la même règle de son côté).
 */
export function IdleGuard() {
  const { logout } = useAuth();
  const lastActivity = useRef(0);
  const lastPing = useRef(0);
  const [warning, setWarning] = useState(false);
  const [left, setLeft] = useState(60);

  const signOut = useCallback(() => {
    logout();
    window.location.replace(`${pageUrl("agence")}?expired=idle`);
  }, [logout]);

  const keepAlive = useCallback(() => {
    lastActivity.current = Date.now();
    if (Date.now() - lastPing.current > PING_MS) {
      lastPing.current = Date.now();
      agencyPing().catch(() => {});
    }
  }, []);

  useEffect(() => {
    lastActivity.current = Date.now();
    lastPing.current = Date.now();
    const onActivity = () => {
      if (!warning) keepAlive();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_MS) signOut();
      else if (idle >= IDLE_MS - WARN_MS) {
        setWarning(true);
        setLeft(Math.max(0, Math.ceil((IDLE_MS - idle) / 1000)));
      }
    }, 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(timer);
    };
  }, [keepAlive, signOut, warning]);

  if (!warning) return null;

  const stay = () => {
    lastPing.current = 0;
    keepAlive();
    setWarning(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <Clock className="h-6 w-6" />
        </span>
        <p id="idle-title" className="mt-4 text-xl font-extrabold text-navy">
          Vous êtes toujours là ?
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Par sécurité, vous serez déconnecté dans <b className="text-navy">{left} s</b>.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={stay} autoFocus className="h-12 rounded-full bg-sky text-sm font-bold text-navy hover:bg-sky-mid hover:text-white">
            Rester connecté
          </button>
          <button type="button" onClick={signOut} className="h-11 rounded-full text-sm font-bold text-muted hover:text-navy">
            Me déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
