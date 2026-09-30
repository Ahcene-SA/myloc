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

  // Dernière version de logout (sa référence change à chaque rendu du contexte) :
  // l'effet ci-dessous ne doit pas se relancer pour autant.
  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  });
  // L'avertissement est lu par les écouteurs sans relancer l'effet
  const warningRef = useRef(false);

  const signOut = useCallback(() => {
    logoutRef.current();
    window.location.replace(`${pageUrl("agence")}?expired=idle`);
  }, []);

  const keepAlive = useCallback(() => {
    lastActivity.current = Date.now();
    if (Date.now() - lastPing.current > PING_MS) {
      lastPing.current = Date.now();
      agencyPing().catch(() => {});
    }
  }, []);

  // Monté une seule fois : lastActivity n'est remis à zéro qu'au montage
  // et lors d'une vraie action de l'utilisateur (sinon le compte à rebours se fige).
  useEffect(() => {
    lastActivity.current = Date.now();
    lastPing.current = Date.now();
    const onActivity = () => {
      // Pendant l'avertissement, il faut cliquer sur « Rester connecté »
      if (!warningRef.current) keepAlive();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_MS) {
        window.clearInterval(timer);
        signOut();
      } else if (idle >= IDLE_MS - WARN_MS) {
        warningRef.current = true;
        setWarning(true);
        setLeft(Math.max(0, Math.ceil((IDLE_MS - idle) / 1000)));
      }
    }, 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(timer);
    };
  }, [keepAlive, signOut]);

  if (!warning) return null;

  const stay = () => {
    lastPing.current = 0;
    keepAlive();
    warningRef.current = false;
    setWarning(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-xl">
        <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
          <Clock className="h-4 w-4" />
        </span>
        <p id="idle-title" className="mt-4 text-base font-semibold text-slate-900">
          Vous êtes toujours là ?
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Par sécurité, vous serez déconnecté dans <b className="text-slate-900">{left} s</b>.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={stay} autoFocus className="h-9 rounded-md bg-navy text-sm font-medium text-white shadow-sm hover:bg-navy-soft">
            Rester connecté
          </button>
          <button type="button" onClick={signOut} className="h-9 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Me déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
