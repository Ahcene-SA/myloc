"use client";

import { useState, useSyncExternalStore } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { AuthShell, AuthField, AuthError, authSubmitClass } from "@/components/AuthShell";
import { pageUrl } from "@/lib/routes";
import { AGENCY_PENDING_KEY, agencyLogin } from "@/lib/api";
import { useLang } from "@/lib/i18n";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // ?expired=1 : la session a expiré (renvoyé ici automatiquement)
  const expired = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).has("expired"),
    () => false
  );
  const { login } = useAuth();
  const { t } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.ok) {
      // Compte de l'équipe : on continue directement vers l'espace agence (code à 6 chiffres),
      // sans lui faire ressaisir son email et son mot de passe.
      const msg = result.error || "";
      if (msg.includes("espace agence") || msg === t("Ce compte appartient à l'équipe de l'agence : connectez-vous depuis l'espace agence.")) {
        try {
          const next = await agencyLogin(email.trim(), password);
          sessionStorage.setItem(AGENCY_PENDING_KEY, JSON.stringify(next));
          window.location.href = pageUrl("agence");
          return;
        } catch {
          /* on affiche le message et le lien habituels */
        }
      }
      setError(msg || "Échec de la connexion.");
      return;
    }

    // Static export: use a full page navigation so .html files resolve on any server.
    if (typeof window !== "undefined") {
      window.location.href = pageUrl("client");
    }
  };

  const eye = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-navy"
      aria-label={showPassword ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}
    >
      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  return (
    <AuthShell
      eyebrow={t("Espace client")}
      title={
        <>
          {t("Bon retour")} <br />
          <span className="text-sky-gradient">{t("parmi nous.")}</span>
        </>
      }
      subtitle={t("Connectez-vous pour gérer vos réservations MYLOC.DZ.")}
      image="images/cars/jetour-x70-plus.png"
      imageAlt="Jetour X70 Plus"
    >
      <AuthError message={error ? t(error) : expired ? t("Votre session a expiré : reconnectez-vous.") : ""} />
      {error.includes("espace agence") && (
        <a href={pageUrl("agence")} className="-mt-2 text-sm font-bold text-sky-text hover:underline">
          {t("Aller à l'espace agence")} →
        </a>
      )}
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthField
          label={t("Adresse email")}
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder={t("vous@exemple.com")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthField
          label={t("Mot de passe")}
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder={t("8 caractères minimum")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          trailing={eye}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-ink-soft">
            <input type="checkbox" className="h-4 w-4 accent-sky" />
            {t("Se souvenir de moi")}
          </label>
          <a href={pageUrl("reinitialiser")} className="font-bold text-sky-text hover:underline">
            {t("Mot de passe oublié ?")}
          </a>
        </div>

        <button type="submit" disabled={loading} className={`${authSubmitClass} mt-2`}>
          {loading ? t("Connexion...") : t("Se connecter")}
          <ArrowRight className="flip-rtl h-5 w-5" />
        </button>
      </form>

      <p className="mt-8 text-center text-[15px] text-ink-soft">
        {t("Pas encore de compte ?")}{" "}
        <a href={pageUrl("register")} className="font-bold text-sky-text hover:underline">
          {t("Créer un compte")}
        </a>
      </p>
    </AuthShell>
  );
}
