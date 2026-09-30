"use client";

import { ArrowRight, CalendarClock, Clock3, MapPin, Wallet, PlusCircle } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useClient } from "../ClientContext";
import { apiImageUrl } from "@/lib/api";
import { WhatsAppIcon } from "../FloatingWhatsApp";
import { useLang } from "@/lib/i18n";
import {
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  StatusBadge,
  daysBetween,
  daysLabel,
  formatDate,
  formatPrice,
  formatTime,
  isActiveOrUpcoming,
  primaryBtn,
  reservationRef,
  reservationWhatsApp,
  secondaryBtn,
  sectionTitle,
  placeLabel,
} from "./shared";

export function AccueilView() {
  const { user } = useAuth();
  const { reservations, loading, error, refresh, setActiveTab, goReserve } = useClient();
  const { t } = useLang();
  const firstName = (user?.full_name || "").split(" ")[0];

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const upcoming = reservations
    .filter(isActiveOrUpcoming)
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  const next = upcoming[0];
  const pending = reservations.filter((r) => r.status === "pending" && isActiveOrUpcoming(r)).length;
  const spent = reservations
    .filter((r) => r.status === "confirmed")
    .reduce((sum, r) => sum + (parseFloat(String(r.total_price ?? 0)) || 0), 0);

  const stats = [
    { icon: CalendarClock, label: t("Locations à venir"), value: String(upcoming.length) },
    { icon: Clock3, label: t("En attente de confirmation"), value: String(pending) },
    { icon: Wallet, label: t("Total des locations confirmées"), value: formatPrice(spent) },
  ];

  return (
    <div>
      <PageTitle kicker={t("Espace client")} title={firstName ? t("Bonjour, {name}", { name: firstName }) : t("Bonjour")}>
        <button type="button" onClick={() => goReserve()} className={primaryBtn}>
          <PlusCircle className="h-4 w-4" />
          {t("Nouvelle réservation")}
        </button>
      </PageTitle>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-slate-500">{label}</span>
              <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
            </div>
            <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Prochaine location */}
        {next ? (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
              <p className={sectionTitle}>{t("Prochaine location")}</p>
              <span className="text-xs tabular-nums text-slate-500">{reservationRef(next.id)}</span>
            </div>
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-full flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 sm:w-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={apiImageUrl(next.car_image_url)} alt={next.car_name || t("Véhicule")} className="max-h-24 w-auto max-w-[85%] object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900">
                  <bdi dir="ltr">{next.car_name}</bdi>
                </p>
                <div className="mt-1.5">
                  <StatusBadge status={next.status} />
                </div>
              </div>
            </div>
            <dl className="grid gap-4 border-t border-slate-200 p-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">{t("Départ")}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {formatDate(next.start_date, true)} {formatTime(next.pickup_time) && `· ${formatTime(next.pickup_time)}`}
                </dd>
                {next.pickup_place && (
                  <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {placeLabel(next.pickup_place)}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">{t("Retour")}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {formatDate(next.end_date, true)} {formatTime(next.return_time) && `· ${formatTime(next.return_time)}`}
                </dd>
                {next.return_place && (
                  <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {placeLabel(next.return_place)}
                  </dd>
                )}
              </div>
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3.5">
              <p className="text-sm text-slate-500">
                {daysLabel(daysBetween(next.start_date || "", next.end_date || ""))} ·{" "}
                <span className="whitespace-nowrap text-base font-semibold tabular-nums text-slate-900">{formatPrice(next.total_price)}</span>
              </p>
              <a href={reservationWhatsApp(next)} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
                <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
                {t("Contacter l'agence")}
              </a>
            </div>
          </Card>
        ) : (
          <EmptyState
            title={t("Aucune location prévue")}
            text={t("Choisissez un véhicule, vos dates et votre point de retrait : votre demande est envoyée à l'agence en quelques clics.")}
            action={
              <button type="button" onClick={() => goReserve()} className={primaryBtn}>
                {t("Réserver un véhicule")}
                <ArrowRight className="flip-rtl h-4 w-4" />
              </button>
            }
          />
        )}

        {/* Dernières réservations */}
        <Card className="self-start">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <p className={sectionTitle}>{t("Dernières réservations")}</p>
            {reservations.length > 0 && (
              <button type="button" onClick={() => setActiveTab("reservations")} className="text-sm font-medium text-sky-text hover:underline">
                {t("Tout voir")}
              </button>
            )}
          </div>
          {reservations.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">{t("Vous n'avez pas encore de réservation.")}</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {reservations.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={apiImageUrl(r.car_image_url)} alt="" className="h-10 w-16 flex-shrink-0 object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      <bdi dir="ltr">{r.car_name}</bdi>
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(r.start_date)} {t("→")} {formatDate(r.end_date)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
