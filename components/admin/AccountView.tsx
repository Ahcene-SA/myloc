"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { BellRing, Check, KeyRound, Loader2, LogOut, MonitorSmartphone, ShieldCheck, UserRound, Volume2 } from "lucide-react";
import { askNotificationPermission, playChime, setAlertSound, useAlertSound, useNotificationState } from "@/lib/alerts";
import { useAuth } from "../AuthContext";
import { QrCode } from "../agency/QrCode";
import { RecoveryCodes } from "../agency/AgencyLogin";
import {
  agencyLogoutAll,
  agencyPing,
  changePassword,
  isOwner,
  regenerateRecoveryCodes,
  twoFactorDisable,
  twoFactorEnable,
  twoFactorSetup,
  updateProfile,
} from "@/lib/api";
import { pageUrl } from "@/lib/routes";
import { Card, PageTitle, inputClass, labelClass, primaryBtn, secondaryBtn } from "../client/shared";
import { FormError, Modal, formatDateTime } from "./ui";

/** « Mon compte » de l'espace agence : profil, mot de passe, double authentification, appareils. */
export function AccountView() {
  const { user } = useAuth();
  if (!user) return null;
  const owner = isOwner(user.role);

  return (
    <div className="max-w-3xl">
      <PageTitle kicker="Espace agence" title="Mon compte" />
      <div className="flex flex-col gap-6">
        <ProfileCard />
        <PasswordCard />
        <TwoFactorCard owner={owner} />
        <AlertsCard />
        <DevicesCard />
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, text, children }: { icon: React.ElementType; title: string; text?: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-soft text-sky-text">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-navy">{title}</p>
          {text && <p className="mt-0.5 text-sm text-muted">{text}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function Ok({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
      <Check className="h-4 w-4" /> {message}
    </p>
  );
}

function ProfileCard() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setOk("");
    setErr("");
    try {
      const u = await updateProfile(name.trim(), phone.trim());
      if (u) updateUser({ ...user!, ...u });
      setOk("Profil enregistré.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      icon={UserRound}
      title="Profil"
      text={`${user?.email} · ${isOwner(user?.role) ? "Propriétaire" : "Employé"}${user?.agency ? ` · ${user.agency}` : ""}${
        user?.last_login_at ? ` · dernière connexion ${formatDateTime(user.last_login_at)}` : ""
      }`}
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ac-name" className={labelClass}>
            Nom complet
          </label>
          <input id="ac-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required minLength={2} />
        </div>
        <div>
          <label htmlFor="ac-phone" className={labelClass}>
            Téléphone
          </label>
          <input id="ac-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} required minLength={5} />
        </div>
        <div className="flex flex-col gap-3 sm:col-span-2">
          <FormError message={err} />
          <Ok message={ok} />
          <button type="submit" disabled={busy} className={`${secondaryBtn} w-fit`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </form>
    </Section>
  );
}

function PasswordCard() {
  const { renewToken } = useAuth();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setOk("");
    setErr("");
    if (f.next.length < 8) return setErr("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    if (f.next !== f.confirm) return setErr("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    try {
      // Nouveau jeton : les autres sessions sont révoquées, celle-ci continue
      renewToken(await changePassword(f.current, f.next));
      setF({ current: "", next: "", confirm: "" });
      setOk("Mot de passe modifié.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section icon={KeyRound} title="Mot de passe">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["current", "Actuel", "current-password"],
            ["next", "Nouveau", "new-password"],
            ["confirm", "Confirmer", "new-password"],
          ] as const
        ).map(([k, label, ac]) => (
          <div key={k}>
            <label htmlFor={`pw-${k}`} className={labelClass}>
              {label}
            </label>
            <input
              id={`pw-${k}`}
              type="password"
              autoComplete={ac}
              value={f[k]}
              onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
        ))}
        <div className="flex flex-col gap-3 sm:col-span-3">
          <FormError message={err} />
          <Ok message={ok} />
          <button type="submit" disabled={busy} className={`${secondaryBtn} w-fit`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Changer le mot de passe
          </button>
        </div>
      </form>
    </Section>
  );
}

function TwoFactorCard({ owner }: { owner: boolean }) {
  const { user, updateUser } = useAuth();
  const enabled = !!user?.totp_enabled;
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<null | "regenerate" | "disable">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const refresh = async () => {
    const fresh = await agencyPing();
    if (fresh) updateUser(fresh);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      icon={ShieldCheck}
      title="Double authentification"
      text={
        enabled
          ? "Activée : un code à 6 chiffres de votre téléphone est demandé à chaque connexion."
          : owner
            ? "Obligatoire pour le propriétaire."
            : "Recommandée : même si votre mot de passe fuite, personne n'entre sans votre téléphone."
      }
    >
      <div className="flex flex-col gap-4">
        {enabled ? (
          <>
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4" /> Protection active
            </p>
            {mode === null && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setMode("regenerate")} className={secondaryBtn}>
                  Nouveaux codes de secours
                </button>
                {!owner && (
                  <button type="button" onClick={() => setMode("disable")} className="inline-flex h-12 items-center rounded-full px-5 text-sm font-bold text-red-700 hover:bg-red-50">
                    Désactiver
                  </button>
                )}
              </div>
            )}
            {mode === "regenerate" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    setCodes(await regenerateRecoveryCodes(code));
                    setMode(null);
                    setCode("");
                  });
                }}
                className="flex flex-col gap-3"
              >
                <p className="text-sm text-ink-soft">Les anciens codes de secours ne fonctionneront plus. Tapez le code actuel de votre application :</p>
                <input aria-label="Code à 6 chiffres de l'application" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className={`${inputClass} max-w-48 text-center font-mono text-xl tracking-[0.3em]`} />
                <div className="flex gap-2">
                  <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Générer
                  </button>
                  <button type="button" onClick={() => setMode(null)} className={secondaryBtn}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
            {mode === "disable" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await twoFactorDisable(password);
                    await refresh();
                    setMode(null);
                    setPassword("");
                  });
                }}
                className="flex flex-col gap-3"
              >
                <p className="text-sm text-ink-soft">Confirmez avec votre mot de passe :</p>
                <input aria-label="Votre mot de passe" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} max-w-xs`} required />
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className="inline-flex h-12 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Désactiver
                  </button>
                  <button type="button" onClick={() => setMode(null)} className={secondaryBtn}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </>
        ) : setup ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                setCodes(await twoFactorEnable(code));
                setSetup(null);
                setCode("");
                await refresh();
              });
            }}
            className="flex flex-col gap-4 sm:flex-row sm:items-start"
          >
            <div className="rounded-2xl border border-line bg-white p-3">
              <QrCode value={setup.otpauth} size={170} />
            </div>
            <div className="flex flex-1 flex-col gap-3 text-sm text-ink-soft">
              <p>
                1. Dans <b className="text-navy">Google Authenticator</b>, touchez <b className="text-navy">+</b> puis{" "}
                <b className="text-navy">Scanner un QR code</b>.
              </p>
              <p className="break-all text-xs">
                Ou saisissez la clé : <span className="font-mono font-bold text-navy">{setup.secret.match(/.{1,4}/g)?.join(" ")}</span>
              </p>
              <p>2. Tapez le code à 6 chiffres affiché :</p>
              <input aria-label="Code à 6 chiffres de l'application" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className={`${inputClass} max-w-48 text-center font-mono text-xl tracking-[0.3em]`} />
              <button type="submit" disabled={busy || code.length !== 6} className={`${primaryBtn} w-fit`}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Activer
              </button>
            </div>
          </form>
        ) : (
          <button type="button" disabled={busy} onClick={() => run(async () => setSetup(await twoFactorSetup()))} className={`${primaryBtn} w-fit`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Activer la double authentification
          </button>
        )}
        <FormError message={err} />
      </div>

      {codes && (
        <Modal title="Codes de secours" onClose={() => setCodes(null)}>
          <div className="p-6">
            <RecoveryCodes codes={codes} dark={false} onDone={() => setCodes(null)} />
          </div>
        </Modal>
      )}
    </Section>
  );
}

function AlertsCard() {
  const sound = useAlertSound();
  const notif = useNotificationState();
  return (
    <Section icon={BellRing} title="Alertes de réservation" text="Chaque nouvelle demande faite sur le site s'affiche ici en direct (vérification toutes les 20 secondes).">
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-mist px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-bold text-navy">
            <Volume2 className="h-4 w-4 text-sky-text" /> Son à chaque nouvelle demande
          </span>
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => {
              setAlertSound(e.target.checked);
              if (e.target.checked) playChime();
            }}
            className="h-5 w-5 accent-sky"
          />
        </label>
        {notif === "granted" ? (
          <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <Check className="h-4 w-4" /> Notifications activées : vous êtes prévenu même si l&apos;onglet est en arrière-plan.
          </p>
        ) : notif === "denied" ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Notifications bloquées par le navigateur. Autorisez-les dans les réglages du site (icône à gauche de l&apos;adresse).
          </p>
        ) : notif === "default" ? (
          <button type="button" onClick={() => void askNotificationPermission()} className={secondaryBtn}>
            <BellRing className="h-4 w-4" /> Activer les notifications du navigateur
          </button>
        ) : null}
        <p className="text-xs text-muted">L&apos;agence reçoit aussi un e-mail à chaque nouvelle demande, et le client est prévenu par e-mail quand vous confirmez ou refusez.</p>
      </div>
    </Section>
  );
}

function DevicesCard() {
  const { logout } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const all = async () => {
    setBusy(true);
    setErr("");
    try {
      await agencyLogoutAll();
      logout();
      window.location.replace(pageUrl("agence"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action impossible.");
      setBusy(false);
    }
  };

  return (
    <Section
      icon={MonitorSmartphone}
      title="Appareils connectés"
      text="Déconnexion automatique après 30 min sans activité et au plus tard 10 h après la connexion."
    >
      {confirm ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-navy">Fermer toutes vos sessions, y compris celle-ci ? Il faudra vous reconnecter.</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={all} className="inline-flex h-12 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Tout déconnecter
            </button>
            <button type="button" onClick={() => setConfirm(false)} className={secondaryBtn}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className={secondaryBtn}>
          <LogOut className="h-4 w-4" /> Déconnecter tous mes appareils
        </button>
      )}
      <FormError message={err} />
    </Section>
  );
}
