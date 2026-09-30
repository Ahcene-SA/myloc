"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2, LogOut } from "lucide-react";
import { useAuth } from "../AuthContext";
import { changePassword, updateProfile } from "@/lib/api";
import { pageUrl } from "@/lib/routes";
import { useLang } from "@/lib/i18n";
import { Card, PageTitle, formatDate, inputClass, labelClass, primaryBtn, secondaryBtn } from "./shared";

function Feedback({ ok, error }: { ok: string; error: string }) {
  if (error)
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
        {error}
      </p>
    );
  if (ok)
    return (
      <p role="status" className="flex items-center gap-2 rounded-md border border-emerald-600/20 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
        <Check className="h-4 w-4" />
        {ok}
      </p>
    );
  return null;
}

export function ProfilView() {
  const { user, updateUser, logout, renewToken } = useAuth();
  const { t } = useLang();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ ok: "", error: "" });

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changing, setChanging] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ ok: "", error: "" });

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg({ ok: "", error: "" });
    try {
      const updated = await updateProfile(fullName.trim(), phone.trim());
      if (updated) updateUser(updated);
      setProfileMsg({ ok: t("Profil mis à jour."), error: "" });
    } catch (err) {
      setProfileMsg({ ok: "", error: err instanceof Error ? err.message : t("Enregistrement impossible.") });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwdMsg({ ok: "", error: "" });
    if (next.length < 8) return setPwdMsg({ ok: "", error: t("Le nouveau mot de passe doit contenir au moins 8 caractères.") });
    if (next !== confirm) return setPwdMsg({ ok: "", error: t("Les deux mots de passe ne correspondent pas.") });
    setChanging(true);
    try {
      // Nouveau jeton : les autres sessions sont révoquées, celle-ci continue
      renewToken(await changePassword(current, next));
      setCurrent("");
      setNext("");
      setConfirm("");
      setPwdMsg({ ok: t("Mot de passe modifié."), error: "" });
    } catch (err) {
      setPwdMsg({ ok: "", error: err instanceof Error ? err.message : t("Modification impossible.") });
    } finally {
      setChanging(false);
    }
  };

  const initials = (user?.full_name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <PageTitle kicker={t("Compte")} title={t("Mon profil")} />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center gap-1 p-6 text-center xl:self-start">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-sky-soft text-lg font-semibold text-sky-text ring-1 ring-sky/30">{initials}</span>
          <p className="text-base font-semibold text-slate-900">{user?.full_name}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
          {user?.created_at && <p className="text-xs text-slate-500">{t("Client depuis le {date}", { date: formatDate(user.created_at.slice(0, 10)) })}</p>}
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = pageUrl("login");
            }}
            className={`${secondaryBtn} mt-4 w-full`}
          >
            <LogOut className="flip-rtl h-4 w-4" />
            {t("Se déconnecter")}
          </button>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-5 sm:p-6">
            <p className="mb-4 text-sm font-semibold text-slate-900">{t("Informations personnelles")}</p>
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className={labelClass}>{t("Nom et prénom")}</span>
                <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required minLength={2} />
              </label>
              <label>
                <span className={labelClass}>{t("Email")}</span>
                <input className={inputClass} value={user?.email || ""} disabled />
                <span className="mt-1.5 block text-xs text-slate-500">{t("Pour changer d'email, contactez l'agence.")}</span>
              </label>
              <label>
                <span className={labelClass}>{t("Téléphone")}</span>
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required minLength={5} />
              </label>
              <div className="flex flex-col gap-3 sm:col-span-2">
                <Feedback {...profileMsg} />
                <button type="submit" disabled={saving} className={`${primaryBtn} sm:self-start`}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("Enregistrer")}
                </button>
              </div>
            </form>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="mb-4 text-sm font-semibold text-slate-900">{t("Mot de passe")}</p>
            <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-3">
              <label>
                <span className={labelClass}>{t("Actuel")}</span>
                <input type="password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
              </label>
              <label>
                <span className={labelClass}>{t("Nouveau")}</span>
                <input type="password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required minLength={8} />
              </label>
              <label>
                <span className={labelClass}>{t("Confirmation")}</span>
                <input type="password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={8} />
              </label>
              <div className="flex flex-col gap-3 sm:col-span-3">
                <Feedback {...pwdMsg} />
                <button type="submit" disabled={changing} className={`${secondaryBtn} sm:self-start`}>
                  {changing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("Changer le mot de passe")}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
