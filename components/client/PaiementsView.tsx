"use client";

import { Banknote, CreditCard, Landmark, Info } from "lucide-react";
import { useClient } from "../ClientContext";
import { useLang } from "@/lib/i18n";
import {
  Card,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  StatusBadge,
  daysBetween,
  daysLabel,
  formatDate,
  formatPrice,
  isExpiredPending,
  isPast,
  paymentLabels,
  reservationRef,
} from "./shared";

const methods = [
  { icon: Banknote, title: "Espèces", text: "À la remise des clés, à l'agence ou à la livraison." },
  { icon: CreditCard, title: "Carte bancaire", text: "À la remise des clés, sur le terminal de l'agence." },
  { icon: Landmark, title: "Virement", text: "Les coordonnées bancaires vous sont envoyées après confirmation." },
];

function amount(v: unknown) {
  return parseFloat(String(v ?? 0)) || 0;
}

export function PaiementsView() {
  const { reservations, loading, error, refresh } = useClient();
  const { t } = useLang();

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const billable = reservations
    // Une demande restée en attente après sa date de départ n'est pas à régler
    .filter((r) => r.status === "confirmed" || (r.status === "pending" && !isExpiredPending(r)))
    .sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
  const toPay = billable.filter((r) => !isPast(r)).reduce((s, r) => s + amount(r.total_price), 0);
  const finished = billable.filter((r) => r.status === "confirmed" && isPast(r)).reduce((s, r) => s + amount(r.total_price), 0);

  return (
    <div>
      <PageTitle kicker={t("Facturation")} title={t("Paiements")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm font-medium text-slate-500">{t("À régler (locations à venir)")}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">{formatPrice(toPay)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-slate-500">{t("Locations terminées")}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">{formatPrice(finished)}</p>
        </Card>
      </div>

      <div className="mt-4 flex gap-3 rounded-md border border-sky/30 bg-sky-soft/40 px-4 py-3 text-sm text-slate-700">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-text" />
        <p>
          {t(
            "Aucun paiement n'est demandé en ligne. Le montant de chaque location se règle directement auprès de MYLOC.DZ, selon le moyen choisi lors de la réservation."
          )}
        </p>
      </div>

      <Card className="mt-6 overflow-hidden">
        <p className="border-b border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-900">{t("Détail par réservation")}</p>
        {billable.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">{t("Vos réservations en attente ou confirmées apparaîtront ici avec leur montant.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-5 py-2.5">{t("Réservation")}</th>
                  <th className="px-3 py-2.5">{t("Période")}</th>
                  <th className="px-3 py-2.5">{t("Paiement")}</th>
                  <th className="px-3 py-2.5">{t("Statut")}</th>
                  <th className="px-5 py-2.5 text-end">{t("Montant")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {billable.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">
                        <bdi dir="ltr">{r.car_name}</bdi>
                      </p>
                      <p className="text-xs text-slate-500">{reservationRef(r.id)}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {formatDate(r.start_date)} {t("→")} {formatDate(r.end_date)}
                      <span className="block text-xs text-slate-500">{daysLabel(daysBetween(r.start_date || "", r.end_date || ""))}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{r.payment_method ? t(paymentLabels[r.payment_method]) : t("À définir avec l'agence")}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3 text-end font-medium tabular-nums text-slate-900">{formatPrice(r.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {methods.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="flex gap-3 p-4">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{t(title)}</p>
              <p className="mt-1 text-sm text-slate-500">{t(text)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
