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
  isPast,
  primaryBtn,
  reservationRef,
  reservationWhatsApp,
  secondaryBtn,
  splitCarName,
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
  const pending = reservations.filter((r) => r.status === "pending" && !isPast(r)).length;
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
          <Card key={label} className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-soft text-sky-text">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-navy">{value}</span>
              <span className="block text-xs font-semibold text-muted">{label}</span>
            </span>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Prochaine location */}
        {next ? (
          <Card className="overflow-hidden">
            <div className="bg-brand-mist flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={apiImageUrl(next.car_image_url)}
                alt={next.car_name || t("Véhicule")}
                className="car-reflect mx-auto w-56 max-w-full object-contain sm:mx-0"
              />
              <div className="flex-1">
                <span className="kicker text-[11px] text-sky-text">{t("Prochaine location")}</span>
                <p className="mt-2 text-2xl font-extrabold uppercase text-navy">
                  {splitCarName(next.car_name).brand}{" "}
                  <span className="text-sky-gradient">{splitCarName(next.car_name).model}</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={next.status} />
                  <span className="text-xs font-bold text-muted">{reservationRef(next.id)}</span>
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{t("Départ")}</p>
                <p className="mt-1 font-bold text-navy">
                  {formatDate(next.start_date, true)} {formatTime(next.pickup_time) && `· ${formatTime(next.pickup_time)}`}
                </p>
                {next.pickup_place && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {t(next.pickup_place)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{t("Retour")}</p>
                <p className="mt-1 font-bold text-navy">
                  {formatDate(next.end_date, true)} {formatTime(next.return_time) && `· ${formatTime(next.return_time)}`}
                </p>
                {next.return_place && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {t(next.return_place)}
                  </p>
                )}
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-line pt-4 sm:col-span-2">
                <p>
                  <span className="block text-xs font-semibold text-muted">
                    {daysLabel(daysBetween(next.start_date || "", next.end_date || ""))}
                  </span>
                  <span className="text-2xl font-extrabold text-navy">{formatPrice(next.total_price)}</span>
                </p>
                <a href={reservationWhatsApp(next)} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
                  <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
                  {t("Contacter l'agence")}
                </a>
              </div>
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
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold uppercase tracking-wide text-navy">{t("Dernières réservations")}</p>
            {reservations.length > 0 && (
              <button type="button" onClick={() => setActiveTab("reservations")} className="text-sm font-bold text-sky-text hover:underline">
                {t("Tout voir")}
              </button>
            )}
          </div>
          {reservations.length === 0 ? (
            <p className="mt-6 text-sm text-muted">{t("Vous n'avez pas encore de réservation.")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {reservations.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={apiImageUrl(r.car_image_url)} alt="" className="h-10 w-16 flex-shrink-0 object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-navy">{r.car_name}</p>
                    <p className="text-xs text-muted">
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
