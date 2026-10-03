"use client";

import { useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { useClient } from "../ClientContext";
import { useLang } from "@/lib/i18n";
import { formatDate, reservationRef } from "./shared";

/** Bandeau affiché quand l'agence répond à une demande pendant que l'espace client est ouvert. */
export function StatusNotice() {
  const { statusNotice: r, dismissStatusNotice, setActiveTab } = useClient();
  const { t } = useLang();

  useEffect(() => {
    if (!r) return;
    const timer = window.setTimeout(dismissStatusNotice, 15_000);
    return () => window.clearTimeout(timer);
  }, [r, dismissStatusNotice]);

  if (!r) return null;
  const ok = r.status === "confirmed";
  const title = ok
    ? t("Votre réservation est confirmée !")
    : r.status === "rejected"
      ? t("Votre demande n'a pas pu être acceptée")
      : t("Votre réservation a été annulée");

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-4 top-20 z-[60] flex justify-center md:start-auto md:end-6 md:top-6 md:w-96">
      <div
        className={`flex w-full items-start gap-3 rounded-lg border bg-white p-4 shadow-lg ${ok ? "border-emerald-200" : "border-red-200"}`}
      >
        {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />}
        <button
          type="button"
          className="min-w-0 flex-1 text-start"
          onClick={() => {
            setActiveTab("reservations");
            dismissStatusNotice();
          }}
        >
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 truncate text-sm text-slate-600">
            <bdi dir="ltr">{r.car_name}</bdi> · {formatDate(r.start_date)} → {formatDate(r.end_date)}
          </p>
          <p className="mt-1 text-xs font-medium text-sky-700">
            {reservationRef(r.id)} · {t("Voir mes réservations")}
          </p>
        </button>
        <button
          type="button"
          onClick={dismissStatusNotice}
          aria-label={t("Fermer")}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
