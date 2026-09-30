"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { fetchAudit, fetchTeam, type AuditEntry, type TeamMember } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, EmptyState, ErrorBlock, PageTitle, inputClass, labelClass } from "../client/shared";
import { auditDetail, auditGroups, auditLabel, toneClass } from "./auditLabels";
import { formatDateTime } from "./ui";

const PAGE = 50;

/** Journal d'activité : qui a fait quoi et quand (propriétaire). */
export function AuditView() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [filters, setFilters] = useState({ user_id: "", group: "", from: "", to: "" });
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ key: string; entries: AuditEntry[]; total: number; error: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchTeam()
      .then((t) => !cancelled && setTeam(t))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const key = JSON.stringify({ filters, page, reload });
  useEffect(() => {
    let cancelled = false;
    const prefix = auditGroups.find((g) => g.id === filters.group)?.prefix ?? "";
    fetchAudit({
      user_id: filters.user_id ? Number(filters.user_id) : undefined,
      action: prefix || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      limit: PAGE,
      offset: page * PAGE,
    })
      .then((r) => !cancelled && setData({ key, entries: r.entries, total: r.total, error: "" }))
      .catch((e) => !cancelled && setData({ key, entries: [], total: 0, error: e instanceof Error ? e.message : "Erreur" }));
    return () => {
      cancelled = true;
    };
  }, [key, filters, page]);

  const loading = !data || data.key !== key;
  const set = (k: keyof typeof filters, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(0);
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <div>
      <PageTitle kicker="Sécurité" title="Journal d'activité">
        <button
          type="button"
          onClick={() => setReload((r) => r + 1)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium hover:bg-slate-50 text-slate-700 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </PageTitle>

      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="au-user" className={labelClass}>
            Membre de l&apos;équipe
          </label>
          <select id="au-user" value={filters.user_id} onChange={(e) => set("user_id", e.target.value)} className={inputClass}>
            <option value="">Tout le monde</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="au-type" className={labelClass}>
            Type d&apos;action
          </label>
          <select id="au-type" value={filters.group} onChange={(e) => set("group", e.target.value)} className={inputClass}>
            {auditGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="au-from" className={labelClass}>
            Du
          </label>
          <input id="au-from" type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="au-to" className={labelClass}>
            Au
          </label>
          <input id="au-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set("to", e.target.value)} className={inputClass} />
        </div>
      </Card>

      {data?.error ? (
        <ErrorBlock message={data.error} onRetry={() => setReload((r) => r + 1)} />
      ) : loading && !data ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : data && data.entries.length === 0 ? (
        <EmptyState title="Rien à afficher" text="Aucune action ne correspond à ces filtres." />
      ) : (
        <Card className={cn("overflow-hidden transition-opacity", loading && "opacity-50")}>
          <ul className="divide-y divide-slate-200">
            {data?.entries.map((e) => {
              const meta = auditLabel(e.action);
              const detail = auditDetail(e);
              return (
                <li key={e.id} className="flex flex-col gap-1 px-5 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-32 flex-shrink-0 text-xs tabular-nums text-slate-500">{formatDateTime(e.created_at)}</span>
                  <span className="w-40 flex-shrink-0 truncate text-sm font-medium text-slate-900">{e.user_name || "Système"}</span>
                  <span className={cn("w-fit flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", toneClass[meta.tone])}>{meta.label}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-600" title={detail}>
                    {e.entity_type === "reservation" && e.entity_id ? `MYL-${String(e.entity_id).padStart(6, "0")} · ` : ""}
                    {detail}
                  </span>
                  {e.ip && <span className="hidden flex-shrink-0 font-mono text-xs text-slate-500 xl:inline">{e.ip}</span>}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm">
            <span className="text-slate-500">
              {data?.total ?? 0} action{(data?.total ?? 0) > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium disabled:opacity-40 bg-white text-slate-700 shadow-sm"
              >
                ← Plus récentes
              </button>
              <span className="text-xs text-slate-500">
                {page + 1}/{pages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium disabled:opacity-40 bg-white text-slate-700 shadow-sm"
              >
                Plus anciennes →
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
