"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, MailCheck, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { AuthShell, AuthField, AuthError, authSubmitClass } from "@/components/AuthShell";
import { HttpError, checkResetToken, requestPasswordReset, resetPassword } from "@/lib/api";
import { pageUrl } from "@/lib/routes";
import { useLang } from "@/lib/i18n";

/** Page « mot de passe oublié », en gardant ?equipe=1 pour l'espace agence. */
function resetPageUrl(team: boolean): string {
  return team ? `${pageUrl("reinitialiser")}?equipe=1` : pageUrl("reinitialiser");
}

type Params = { token: string; team: boolean };
const noParams: Params = { token: "", team: false };
let cached: { search: string; value: Params } | null = null;

function readParams(): Params {
  const search = window.location.search;
  if (cached?.search !== search) {
    const q = new URLSearchParams(search);
    cached = { search, value: { token: q.get("token") ?? "", team: q.has("equipe") } };
  }
  return cached.value;
}

/**
 * Mot de passe oublié (clients et équipe).
 * - sans ?token : on demande l'adresse e-mail et on envoie le lien ;
 * - avec ?token : on choisit le nouveau mot de passe (lien de 30 min, usage unique).
 */
export default function ResetPasswordPage() {
  const params = useSyncExternalStore(() => () => {}, readParams, () => noParams);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const { t } = useLang();

  return (
    <AuthShell
      eyebrow={params.team ? t("Espace agence") : t("Espace client")}
      title={
        <>
          {t("Mot de passe")} <br />
          <span className="text-sky-gradient">{t("oublié ?")}</span>
        </>
      }
      subtitle={
        params.token
          ? t("Choisissez votre nouveau mot de passe.")
          : t("Indiquez l'adresse e-mail de votre compte : nous vous envoyons un lien pour en choisir un nouveau.")
      }
      image="images/cars/jetour-x70-plus.png"
      imageAlt="Jetour X70 Plus"
    >
      {!mounted ? null : params.token ? <NewPasswordForm token={params.token} team={params.team} /> : <RequestForm team={params.team} />}
    </AuthShell>
  );
}

function RequestForm({ team }: { team: boolean }) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const back = team ? pageUrl("agence") : pageUrl("login");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      setSent(await requestPasswordReset(email.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Impossible de joindre le serveur."));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex gap-3 rounded-2xl border border-sky/40 bg-sky-soft px-4 py-4 text-sm font-semibold text-navy">
          <MailCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-text" />
          <div>
            <p>{t(sent)}</p>
            <p className="mt-2 font-medium text-ink-soft">{t("Le lien est valable 30 minutes et ne fonctionne qu'une seule fois.")}</p>
          </div>
        </div>
        <a href={back} className={authSubmitClass}>
          {t("Retour à la connexion")}
          <ArrowRight className="flip-rtl h-5 w-5" />
        </a>
        <button type="button" onClick={() => setSent("")} className="text-sm font-bold text-sky-text hover:underline">
          {t("Je n'ai rien reçu : renvoyer un lien")}
        </button>
      </div>
    );
  }

  return (
    <>
      <AuthError message={error ? t(error) : ""} />
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <AuthField
          label={t("Adresse email")}
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder={t("vous@exemple.com")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <button type="submit" disabled={loading} className={`${authSubmitClass} mt-2`}>
          {loading ? t("Envoi...") : t("Recevoir le lien")}
          <ArrowRight className="flip-rtl h-5 w-5" />
        </button>
      </form>
      <p className="mt-8 text-center text-[15px] text-ink-soft">
        <a href={back} className="font-bold text-sky-text hover:underline">
          {t("Retour à la connexion")}
        </a>
      </p>
    </>
  );
}

function NewPasswordForm({ token, team }: { token: string; team: boolean }) {
  const { t } = useLang();
  // invalid : le serveur a refusé le lien (410) ; sinon (réseau, serveur) on propose de réessayer
  const [check, setCheck] = useState<{ ok: boolean; firstName?: string; staff?: boolean; error?: string; invalid?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ staff: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkResetToken(token)
      .then((r) => !cancelled && setCheck({ ok: true, firstName: r.first_name, staff: r.staff }))
      .catch((e) => {
        if (cancelled) return;
        const invalid = e instanceof HttpError && (e.status === 410 || e.status === 400 || e.status === 404);
        setCheck({ ok: false, invalid, error: e instanceof Error ? e.message : undefined });
      });
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const retry = () => {
    setCheck(null);
    setAttempt((n) => n + 1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("Les deux mots de passe ne sont pas identiques."));
      return;
    }
    setLoading(true);
    try {
      setDone(await resetPassword(token, password));
      // L'ancienne session (s'il y en avait une) est fermée côté serveur
      localStorage.removeItem("myloc_token");
      localStorage.removeItem("myloc_user");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Impossible de joindre le serveur."));
    } finally {
      setLoading(false);
    }
  };

  if (!check) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sky" />
      </div>
    );
  }

  if (!check.ok && !check.invalid) {
    // Coupure réseau ou serveur indisponible : le lien est peut-être encore bon
    return (
      <div className="flex flex-col gap-5">
        <AuthError message={check.error || t("Impossible de joindre le serveur. Vérifiez votre connexion.")} />
        <button type="button" onClick={retry} className={authSubmitClass}>
          <RefreshCw className="h-5 w-5" />
          {t("Réessayer")}
        </button>
      </div>
    );
  }

  if (!check.ok) {
    return (
      <div className="flex flex-col gap-5">
        <AuthError message={check.error || t("Lien invalide.")} />
        <a href={resetPageUrl(team || !!check.staff)} className={authSubmitClass}>
          {t("Demander un nouveau lien")}
          <ArrowRight className="flip-rtl h-5 w-5" />
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            {t("Mot de passe modifié. Vous pouvez vous connecter.")}
            {done.staff && <span className="mt-1 block font-medium">{t("Votre code à 6 chiffres vous sera demandé comme d'habitude.")}</span>}
          </p>
        </div>
        <a href={done.staff ? pageUrl("agence") : pageUrl("login")} className={authSubmitClass}>
          {t("Se connecter")}
          <ArrowRight className="flip-rtl h-5 w-5" />
        </a>
      </div>
    );
  }

  const eye = (
    <button
      type="button"
      onClick={() => setShow(!show)}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-navy"
      aria-label={show ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}
    >
      {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  return (
    <>
      <p className="mb-5 text-[15px] font-bold text-navy">{t("Bonjour {name} !", { name: check.firstName ?? "" })}</p>
      <AuthError message={error ? t(error) : ""} />
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <AuthField
          label={t("Nouveau mot de passe")}
          icon={Lock}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder={t("8 caractères minimum")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          trailing={eye}
          autoFocus
        />
        <AuthField
          label={t("Confirmez le mot de passe")}
          icon={Lock}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError("");
          }}
          required
          minLength={8}
        />
        <button type="submit" disabled={loading} className={`${authSubmitClass} mt-2`}>
          {loading ? t("Enregistrement...") : t("Enregistrer le mot de passe")}
          <ArrowRight className="flip-rtl h-5 w-5" />
        </button>
      </form>
    </>
  );
}
