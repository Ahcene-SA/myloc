"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, CheckCircle2, FileWarning, Loader2, LogOut } from "lucide-react";
import { useAuth } from "../AuthContext";
import {
  changePassword,
  fetchMyDocuments,
  openDocumentFile,
  updateProfile,
  uploadMyDocument,
  type ClientDocument,
  type ClientDocumentType,
} from "@/lib/api";
import { pageUrl } from "@/lib/routes";
import { useLang } from "@/lib/i18n";
import { Modal } from "../admin/ui";
import { cn } from "@/lib/utils";
import { Card, PageTitle, formatDate, ghostBtn, inputClass, labelClass, primaryBtn, secondaryBtn } from "./shared";

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
  const { user, updateUser, logout, renewToken, token } = useAuth();
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

  // Documents (passeport + permis) : obligatoires pour réserver, visibles uniquement par l'agence.
  const [docs, setDocs] = useState<ClientDocument[] | null>(null);
  const [docBusy, setDocBusy] = useState<ClientDocumentType | null>(null);
  const [docMsg, setDocMsg] = useState({ ok: "", error: "" });
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyDocuments()
      .then((d) => !cancelled && setDocs(d))
      .catch(() => !cancelled && setDocs([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const viewDoc = async (doc: ClientDocument) => {
    if (!token) return;
    setOpeningId(doc.id);
    setDocMsg({ ok: "", error: "" });
    try {
      // Image → aperçu (URL objet révoquée à la fermeture) ; PDF → téléchargement
      // (le CSP du site interdit l'aperçu de blob PDF dans le navigateur).
      const isPdf = doc.mime === "application/pdf";
      const { url } = await openDocumentFile(token, doc.id, isPdf ? 60_000 : 0);
      if (isPdf) {
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.original_name || `${doc.type}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        setPreview({ url, label: doc.type === "passeport" ? t("Passeport") : t("Permis de conduire") });
      }
    } catch (err) {
      setDocMsg({ ok: "", error: err instanceof Error ? err.message : t("Document indisponible.") });
    } finally {
      setOpeningId(null);
    }
  };

  const uploadDoc = async (type: ClientDocumentType, file: File | undefined) => {
    if (!file) return;
    setDocMsg({ ok: "", error: "" });
    if (file.type && !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      setDocMsg({ ok: "", error: t("Format non accepté (JPG, PNG, WEBP ou PDF).") });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDocMsg({ ok: "", error: t("Fichier trop lourd (5 Mo maximum).") });
      return;
    }
    setDocBusy(type);
    try {
      const updated = await uploadMyDocument(type, file);
      setDocs(updated);
      setDocMsg({ ok: t("Document enregistré."), error: "" });
    } catch (err) {
      setDocMsg({ ok: "", error: err instanceof Error ? err.message : t("Envoi impossible, réessayez.") });
    } finally {
      setDocBusy(null);
    }
  };

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
            <p className="mb-1 text-sm font-semibold text-slate-900">{t("Documents requis")}</p>
            <p className="mb-4 text-sm text-slate-500">{t("Passeport et permis de conduire : obligatoires avant d'envoyer une réservation.")}</p>
            <div className="grid gap-3">
              {(
                [
                  { type: "passeport" as ClientDocumentType, label: t("Passeport") },
                  { type: "permis" as ClientDocumentType, label: t("Permis de conduire") },
                ]
              ).map(({ type, label }) => {
                const doc = docs?.find((d) => d.type === type) || null;
                return (
                  <div key={type} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5">
                    {doc ? (
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <FileWarning className="h-5 w-5 flex-shrink-0 text-amber-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{label}</p>
                      {doc ? (
                        <p className="text-xs text-slate-500">{t("Envoyé le {date}", { date: formatDate(doc.uploaded_at.slice(0, 10)) })}</p>
                      ) : (
                        <p className="text-xs text-amber-700">{t("Manquant")}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {doc && (
                        <button type="button" className={ghostBtn} disabled={openingId !== null || !!docBusy} onClick={() => viewDoc(doc)}>
                          {openingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : doc.mime === "application/pdf" ? t("Télécharger") : t("Voir")}
                        </button>
                      )}
                      <label
                        className={cn(
                          secondaryBtn,
                          "cursor-pointer",
                          doc && "opacity-90",
                          docBusy === type && "pointer-events-none opacity-60"
                        )}
                      >
                        {docBusy === type && <Loader2 className="h-4 w-4 animate-spin" />}
                        {doc ? t("Remplacer") : t("Ajouter")}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          disabled={docBusy !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            void uploadDoc(type, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <Feedback ok={docMsg.ok} error={docMsg.error} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {t("Formats acceptés : JPG, PNG, WEBP ou PDF (5 Mo maximum). Ces documents ne sont visibles que par l'agence.")}
            </p>
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

      {preview && (
        <Modal
          title={preview.label}
          onClose={() => {
            URL.revokeObjectURL(preview.url);
            setPreview(null);
          }}
          wide
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt={preview.label} className="mx-auto max-h-[70vh] w-auto max-w-full" />
        </Modal>
      )}
    </div>
  );
}
