"use client";

import { useState } from "react";
import { ChevronDown, Mail, Phone } from "lucide-react";
import { useAdmin } from "../AdminContext";
import { WhatsAppIcon } from "../FloatingWhatsApp";
import type { ClientFromApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  StatusBadge,
  formatDate,
  formatPrice,
  reservationRef,
} from "../client/shared";
import { SearchInput, clientWhatsApp, telLink } from "./ui";

type Sort = "recent" | "reservations" | "total";

export function ClientsView() {
  const { clients, loading, error, refresh } = useAdmin();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [open, setOpen] = useState<number | null>(null);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const q = search.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const list = clients
    .filter(
      (c) =>
        !q ||
        `${c.full_name} ${c.email}`.toLowerCase().includes(q) ||
        (digits.length >= 3 && (c.phone || "").replace(/\D/g, "").includes(digits))
    )
    .sort((a, b) => {
      if (sort === "reservations") return Number(b.reservations_count || 0) - Number(a.reservations_count || 0);
      if (sort === "total") return Number(b.confirmed_total || 0) - Number(a.confirmed_total || 0);
      return (b.created_at || "").localeCompare(a.created_at || "");
    });

  return (
    <div>
      <PageTitle kicker="Comptes" title="Clients">
        <p className="text-sm font-semibold text-muted">
          {clients.length} client{clients.length > 1 ? "s" : ""} inscrit{clients.length > 1 ? "s" : ""}
        </p>
      </PageTitle>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher : nom, email, téléphone…" className="sm:flex-1" />
        <label className="flex items-center gap-2 text-sm font-semibold text-navy">
          Trier par
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-12 rounded-full border-2 border-line bg-white px-4 text-sm font-bold text-navy outline-none focus:border-sky"
          >
            <option value="recent">Inscription récente</option>
            <option value="reservations">Nombre de réservations</option>
            <option value="total">Montant confirmé</option>
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={clients.length === 0 ? "Aucun client inscrit" : "Aucun résultat"}
          text={
            clients.length === 0
              ? "Les clients qui créent un compte sur le site apparaîtront ici."
              : "Aucun client ne correspond à cette recherche."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          <div className="hidden grid-cols-[1.3fr_1.2fr_0.6fr_0.8fr_0.8fr_24px] gap-4 border-b border-line bg-mist px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted lg:grid">
            <span>Client</span>
            <span>Contact</span>
            <span className="text-center">Réservations</span>
            <span className="text-right">Confirmé</span>
            <span>Inscrit le</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {list.map((c) => (
              <ClientRow key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Les réservations saisies par l&apos;agence pour des clients sans compte se retrouvent dans l&apos;onglet Réservations (recherche par nom ou
        téléphone).
      </p>
    </div>
  );
}

function ClientRow({ c, open, onToggle }: { c: ClientFromApi; open: boolean; onToggle: () => void }) {
  const { reservations, openReservation } = useAdmin();
  const mine = reservations
    .filter((r) => r.user_id === c.id)
    .sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full gap-1 px-6 py-4 text-left transition-colors hover:bg-sky-soft/40 lg:grid-cols-[1.3fr_1.2fr_0.6fr_0.8fr_0.8fr_24px] lg:items-center lg:gap-4"
      >
        <p className="truncate font-extrabold text-navy">{c.full_name}</p>
        <div className="min-w-0 text-sm">
          <p className="truncate text-ink-soft">{c.email}</p>
          <p className="text-muted">{c.phone}</p>
        </div>
        <p className="text-sm font-bold text-navy lg:text-center">
          <span className="lg:hidden text-muted font-semibold">Réservations : </span>
          {Number(c.reservations_count || 0)}
        </p>
        <p className="text-sm font-extrabold text-navy lg:text-right">{formatPrice(c.confirmed_total)}</p>
        <p className="text-sm text-muted">{formatDate((c.created_at || "").slice(0, 10))}</p>
        <ChevronDown className={cn("hidden h-5 w-5 text-muted transition-transform lg:block", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-line bg-mist/60 px-6 py-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <a
              href={clientWhatsApp(c.phone, `Bonjour ${c.full_name.split(" ")[0]}, c'est MYLOC.DZ.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-whatsapp px-4 text-xs font-bold text-white hover:opacity-90"
            >
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </a>
            <a
              href={telLink(c.phone)}
              className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-line bg-white px-4 text-xs font-bold text-navy hover:border-navy"
            >
              <Phone className="h-4 w-4" /> Appeler
            </a>
            <a
              href={`mailto:${c.email}`}
              className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-line bg-white px-4 text-xs font-bold text-navy hover:border-navy"
            >
              <Mail className="h-4 w-4" /> Email
            </a>
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-muted">Pas encore de réservation.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {mine.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openReservation(r.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left hover:ring-2 hover:ring-sky"
                  >
                    <div>
                      <p className="text-sm font-bold text-navy">
                        {r.car_name} <span className="font-semibold text-muted">· {reservationRef(r.id)}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(r.start_date)} → {formatDate(r.end_date)} · {formatPrice(r.total_price)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
