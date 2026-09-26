"use client";

import { Banknote, CreditCard, Landmark, Info } from "lucide-react";
import { useClient } from "../ClientContext";
import {
  Card,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  StatusBadge,
  daysBetween,
  formatDate,
  formatPrice,
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

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const billable = reservations
    .filter((r) => r.status === "pending" || r.status === "confirmed")
    .sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
  const toPay = billable.filter((r) => !isPast(r)).reduce((s, r) => s + amount(r.total_price), 0);
  const finished = billable.filter((r) => r.status === "confirmed" && isPast(r)).reduce((s, r) => s + amount(r.total_price), 0);

  return (
    <div>
      <PageTitle kicker="Facturation" title="Paiements" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">À régler (locations à venir)</p>
          <p className="mt-2 text-3xl font-extrabold text-navy">{formatPrice(toPay)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Locations terminées</p>
          <p className="mt-2 text-3xl font-extrabold text-navy">{formatPrice(finished)}</p>
        </Card>
      </div>

      <div className="mt-4 flex gap-3 rounded-3xl bg-sky-soft/60 p-5 text-sm text-navy">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-text" />
        <p>
          Aucun paiement n&apos;est demandé en ligne. Le montant de chaque location se règle directement auprès de MYLOC.DZ,
          selon le moyen choisi lors de la réservation.
        </p>
      </div>

      <Card className="mt-6 overflow-hidden">
        <p className="px-6 pt-6 text-sm font-extrabold uppercase tracking-wide text-navy">Détail par réservation</p>
        {billable.length === 0 ? (
          <p className="px-6 pb-8 pt-3 text-sm text-muted">Vos réservations en attente ou confirmées apparaîtront ici avec leur montant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-y border-line bg-mist text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  <th className="px-6 py-3">Réservation</th>
                  <th className="px-3 py-3">Période</th>
                  <th className="px-3 py-3">Paiement</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-6 py-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {billable.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-navy">{r.car_name}</p>
                      <p className="text-xs text-muted">{reservationRef(r.id)}</p>
                    </td>
                    <td className="px-3 py-4 text-ink-soft">
                      {formatDate(r.start_date)} → {formatDate(r.end_date)}
                      <span className="block text-xs text-muted">{daysBetween(r.start_date || "", r.end_date || "")} jour(s)</span>
                    </td>
                    <td className="px-3 py-4 text-ink-soft">{r.payment_method ? paymentLabels[r.payment_method] : "À définir avec l'agence"}</td>
                    <td className="px-3 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-navy">{formatPrice(r.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {methods.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="flex gap-4 p-5">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-soft text-sky-text">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-navy">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
