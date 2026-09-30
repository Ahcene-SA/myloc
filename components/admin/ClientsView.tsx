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
        <p className="text-sm text-slate-500">
          {clients.length} client{clients.length > 1 ? "s" : ""} inscrit{clients.length > 1 ? "s" : ""}
        </p>
      </PageTitle>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher : nom, email, téléphone…" className="sm:flex-1" />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          Trier par
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/25"
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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.3fr_1.2fr_0.6fr_0.8fr_0.8fr_24px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-medium text-slate-500 lg:grid">
            <span>Client</span>
            <span>Contact</span>
            <span className="text-center">Réservations</span>
            <span className="text-end">Confirmé</span>
            <span>Inscrit le</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-200">
            {list.map((c) => (
              <ClientRow key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
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
        className="grid w-full gap-1 px-5 py-3 text-start text-sm transition-colors hover:bg-slate-50 lg:grid-cols-[1.3fr_1.2fr_0.6fr_0.8fr_0.8fr_24px] lg:items-center lg:gap-4"
      >
        <p className="truncate font-medium text-slate-900">{c.full_name}</p>
        <div className="min-w-0">
          <p className="truncate text-slate-700">{c.email}</p>
          <p className="text-xs text-slate-500">{c.phone}</p>
        </div>
        <p className="tabular-nums text-slate-900 lg:text-center">
          <span className="text-slate-500 lg:hidden">Réservations : </span>
          {Number(c.reservations_count || 0)}
        </p>
        <p className="font-medium tabular-nums text-slate-900 lg:text-end">{formatPrice(c.confirmed_total)}</p>
        <p className="text-slate-500">{formatDate((c.created_at || "").slice(0, 10))}</p>
        <ChevronDown className={cn("hidden h-4 w-4 text-slate-400 transition-transform lg:block", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <a
              href={clientWhatsApp(c.phone, `Bonjour ${c.full_name.split(" ")[0]}, c'est MYLOC.DZ.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-whatsapp px-3.5 text-sm font-medium text-white hover:opacity-90"
            >
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </a>
            <a
              href={telLink(c.phone)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium hover:bg-slate-50 text-slate-700 shadow-sm"
            >
              <Phone className="h-4 w-4" /> Appeler
            </a>
            <a
              href={`mailto:${c.email}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium hover:bg-slate-50 text-slate-700 shadow-sm"
            >
              <Mail className="h-4 w-4" /> Email
            </a>
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-slate-500">Pas encore de réservation.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {mine.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openReservation(r.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-start hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {r.car_name} <span className="font-normal text-slate-500">· {reservationRef(r.id)}</span>
                      </p>
                      <p className="text-xs text-slate-500">
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
