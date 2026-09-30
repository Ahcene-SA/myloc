"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, KeyRound, Loader2, MoreHorizontal, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { useAuth } from "../AuthContext";
import {
  createTeamMember,
  fetchTeam,
  resetMemberPassword,
  resetMemberTwoFactor,
  updateTeamMember,
  type TeamMember,
} from "@/lib/api";
import { site } from "@/lib/site";
import { pageUrl } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Card, ErrorBlock, LoadingBlock, PageTitle, inputClass, labelClass, primaryBtn, secondaryBtn } from "../client/shared";
import { FormError, Modal, formatDateTime } from "./ui";

/** Comptes de l'équipe : le propriétaire crée, désactive et gère les accès. */
export function TeamView() {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [secret, setSecret] = useState<{ name: string; email: string; password: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchTeam()
      .then((t) => {
        if (cancelled) return;
        setTeam(t);
        setError("");
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Chargement impossible."));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const upsert = (m: TeamMember) => setTeam((l) => (l ? (l.some((x) => x.id === m.id) ? l.map((x) => (x.id === m.id ? m : x)) : [...l, m]) : [m]));

  if (error) return <ErrorBlock message={error} onRetry={() => setReload((r) => r + 1)} />;
  if (!team) return <LoadingBlock />;

  const active = team.filter((m) => m.active);

  return (
    <div>
      <PageTitle kicker="Accès" title="Équipe">
        <button type="button" onClick={() => setAdding(true)} className={primaryBtn}>
          <UserPlus className="h-4 w-4" />
          Ajouter un employé
        </button>
      </PageTitle>

      <p className="-mt-2 mb-5 max-w-2xl text-sm text-slate-500">
        Chaque membre a son propre compte : le journal d&apos;activité indique qui a fait quoi. Un employé gère les réservations, le planning et les
        états des lieux, sans accès aux prix, aux promos ni à l&apos;équipe.
      </p>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.9fr_1fr_48px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-medium text-slate-500 lg:grid">
          <span>Membre</span>
          <span>Agence</span>
          <span>Rôle</span>
          <span>Sécurité</span>
          <span>Dernière connexion</span>
          <span />
        </div>
        <ul className="divide-y divide-slate-200">
          {team.map((m) => (
            <MemberRow
              key={m.id}
              m={m}
              isMe={m.id === user?.id}
              lastOwner={m.role === "owner" && active.filter((x) => x.role === "owner").length <= 1}
              onChange={upsert}
              onSecret={(password) => setSecret({ name: m.full_name, email: m.email, password })}
            />
          ))}
        </ul>
      </Card>

      {adding && (
        <AddMemberModal
          onClose={() => setAdding(false)}
          onCreated={(m, password) => {
            upsert(m);
            setAdding(false);
            setSecret({ name: m.full_name, email: m.email, password });
          }}
        />
      )}
      {secret && <TemporaryPasswordModal {...secret} onClose={() => setSecret(null)} />}
    </div>
  );
}

function MemberRow({
  m,
  isMe,
  lastOwner,
  onChange,
  onSecret,
}: {
  m: TeamMember;
  isMe: boolean;
  lastOwner: boolean;
  onChange: (m: TeamMember) => void;
  onSecret: (password: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState<null | "deactivate" | "reset2fa" | "role">(null);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
      setMenu(false);
      setConfirm(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = () =>
    act(async () => {
      const u = await updateTeamMember(m.id, { active: !m.active });
      if (u) onChange(u as TeamMember);
    });
  const changeRole = () =>
    act(async () => {
      const u = await updateTeamMember(m.id, { role: m.role === "owner" ? "employee" : "owner" });
      if (u) onChange(u as TeamMember);
    });
  const resetPassword = () =>
    act(async () => {
      const p = await resetMemberPassword(m.id);
      onChange({ ...m, must_change_password: true });
      onSecret(p);
    });
  const reset2fa = () =>
    act(async () => {
      await resetMemberTwoFactor(m.id);
      onChange({ ...m, totp_enabled: false });
    });

  return (
    <li className={cn("relative px-5 py-3 text-sm", !m.active && "bg-slate-50")}>
      <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr_0.9fr_0.9fr_1fr_48px] lg:items-center lg:gap-4">
        <div className="min-w-0">
          <p className={cn("truncate font-medium", m.active ? "text-slate-900" : "text-slate-500 line-through")}>
            {m.full_name} {isMe && <span className="ms-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 no-underline">Vous</span>}
          </p>
          <p className="truncate text-xs text-slate-500">
            {m.email} · {m.phone}
          </p>
        </div>
        <p className="text-sm text-slate-600">{m.agency || "Toutes les agences"}</p>
        <p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
              m.role === "owner" ? "bg-sky-soft/60 text-sky-text ring-sky/30" : "bg-slate-50 text-slate-600 ring-slate-500/20"
            )}
          >
            {m.role === "owner" ? "Propriétaire" : "Employé"}
          </span>
          {!m.active && <span className="ms-2 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">Désactivé</span>}
        </p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs">
          {m.totp_enabled ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Code 2FA
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <ShieldOff className="h-3.5 w-3.5" /> Sans 2FA
            </span>
          )}
          {m.must_change_password && <span className="text-amber-700">· mot de passe provisoire</span>}
        </p>
        <p className="text-sm text-slate-500">{m.last_login_at ? formatDateTime(m.last_login_at) : "Jamais connecté"}</p>
        {!isMe && (
          <button
            type="button"
            onClick={() => setMenu(!menu)}
            aria-label={`Actions pour ${m.full_name}`}
            aria-expanded={menu}
            className="flex h-8 w-8 items-center justify-center justify-self-end rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </button>
        )}
      </div>

      {menu && !isMe && (
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          {confirm ? (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-slate-900">
                {confirm === "deactivate" &&
                  `Désactiver le compte de ${m.full_name} ? Il sera déconnecté immédiatement. L'historique de ses actions est conservé.`}
                {confirm === "reset2fa" && `Réinitialiser la double authentification de ${m.full_name} ? Ses sessions ouvertes seront fermées.`}
                {confirm === "role" &&
                  (m.role === "owner"
                    ? `Retirer les droits de propriétaire à ${m.full_name} ?`
                    : `Donner les droits de propriétaire à ${m.full_name} ? Il aura accès aux prix, aux promos, à l'équipe et au journal.`)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirm === "deactivate" ? toggleActive : confirm === "reset2fa" ? reset2fa : changeRole}
                  className={primaryBtn}
                >
                  Confirmer
                </button>
                <button type="button" onClick={() => setConfirm(null)} className="h-9 rounded-md border border-slate-300 px-3.5 text-sm font-medium bg-white text-slate-700 shadow-sm">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={resetPassword} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3.5 text-sm font-medium hover:bg-slate-50 bg-white text-slate-700 shadow-sm">
                <KeyRound className="h-3.5 w-3.5" /> Nouveau mot de passe provisoire
              </button>
              {m.totp_enabled && (
                <button type="button" onClick={() => setConfirm("reset2fa")} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3.5 text-sm font-medium hover:bg-slate-50 bg-white text-slate-700 shadow-sm">
                  <ShieldOff className="h-3.5 w-3.5" /> Réinitialiser la 2FA
                </button>
              )}
              {!lastOwner && m.active && (
                <button type="button" onClick={() => setConfirm("role")} className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3.5 text-sm font-medium hover:bg-slate-50 bg-white text-slate-700 shadow-sm">
                  {m.role === "owner" ? "Passer employé" : "Passer propriétaire"}
                </button>
              )}
              {m.active ? (
                !lastOwner && (
                  <button type="button" onClick={() => setConfirm("deactivate")} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50">
                    Désactiver le compte
                  </button>
                )
              ) : (
                <button type="button" disabled={busy} onClick={toggleActive} className={primaryBtn}>
                  Réactiver le compte
                </button>
              )}
            </div>
          )}
          {err && <p className="text-sm text-red-700">{err}</p>}
        </div>
      )}
    </li>
  );
}

function AddMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: (m: TeamMember, password: string) => void }) {
  const [f, setF] = useState({ full_name: "", email: "", phone: "", agency: "", role: "employee" as "employee" | "owner" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await createTeamMember({ ...f, full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone.trim() });
      onCreated(res.member, res.temporary_password);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Création impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title="Ajouter un membre" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <div>
          <label htmlFor="tm-name" className={labelClass}>
            Nom complet
          </label>
          <input id="tm-name" value={f.full_name} onChange={(e) => set("full_name", e.target.value)} className={inputClass} required minLength={2} maxLength={100} />
        </div>
        <div>
          <label htmlFor="tm-email" className={labelClass}>
            Email (identifiant de connexion)
          </label>
          <input id="tm-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={inputClass} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tm-phone" className={labelClass}>
              Téléphone
            </label>
            <input id="tm-phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} required minLength={5} maxLength={20} />
          </div>
          <div>
            <label htmlFor="tm-agency" className={labelClass}>
              Agence
            </label>
            <select id="tm-agency" value={f.agency} onChange={(e) => set("agency", e.target.value)} className={inputClass}>
              <option value="">Toutes les agences</option>
              {site.agencies.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
        <fieldset>
          <legend className={labelClass}>Rôle</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["employee", "Employé", "Réservations, planning, états des lieux, clients."],
                ["owner", "Propriétaire", "Tout, y compris prix, promos, équipe et journal."],
              ] as const
            ).map(([value, label, text]) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-2.5",
                  f.role === value ? "border-sky bg-sky-soft/40 ring-1 ring-sky" : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <input type="radio" name="tm-role" checked={f.role === value} onChange={() => set("role", value)} className="accent-sky" />
                  {label}
                </span>
                <span className="text-xs text-slate-500">{text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Un mot de passe provisoire sera généré : l&apos;employé devra le remplacer à sa première connexion sur l&apos;espace agence.
        </p>
        <FormError message={err} />
        <div className="-mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Annuler
          </button>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer le compte
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TemporaryPasswordModal({ name, email, password, onClose }: { name: string; email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const agencyUrl = typeof window !== "undefined" ? new URL(pageUrl("agence"), window.location.href).href : "/agence";
  const message = `Bonjour ${name.split(" ")[0]}, voici ton accès à l'espace agence MYLOC.DZ :\n${agencyUrl}\nIdentifiant : ${email}\nMot de passe provisoire : ${password}\nTu devras choisir ton propre mot de passe à la première connexion.`;
  return (
    <Modal title="Mot de passe provisoire" onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-slate-600">
          Transmettez ces informations à <b className="text-slate-900">{name}</b> en main propre ou par message privé. Le mot de passe ne sera{" "}
          <b>plus affiché</b> ensuite.
        </p>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="text-slate-500">Identifiant</p>
          <p className="font-medium text-slate-900">{email}</p>
          <p className="mt-3 text-slate-500">Mot de passe provisoire</p>
          <p className="font-mono text-xl font-medium text-slate-900">{password}</p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(message).then(() => setCopied(true))}
          className={secondaryBtn}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Message copié" : "Copier le message à envoyer"}
        </button>
        <button type="button" onClick={onClose} className={primaryBtn}>
          C&apos;est transmis
        </button>
      </div>
    </Modal>
  );
}
