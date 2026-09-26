"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { AuthShell, AuthField, AuthError, authSubmitClass } from "@/components/AuthShell";
import { pageUrl } from "@/lib/routes";
import { useLang } from "@/lib/i18n";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await register(fullName, email, password, phone);
    setLoading(false);

    if (!result.ok) {
      setError(result.error || "Échec de l'inscription.");
      return;
    }

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
      eyebrow={t("Inscription")}
      title={
        <>
          {t("Créez votre")} <span className="text-sky-gradient">{t("compte.")}</span>
        </>
      }
      subtitle={t("Un compte MYLOC.DZ pour réserver votre véhicule en deux minutes et suivre vos locations.")}
      image="images/cars/renault-captur.png"
      imageAlt="Renault Captur"
    >
      <AuthError message={error ? t(error) : ""} />
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthField
          label={t("Nom complet")}
          icon={User}
          type="text"
          autoComplete="name"
          placeholder={t("Prénom Nom")}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField
            label={t("Email")}
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder={t("vous@exemple.com")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <AuthField
            label={t("Téléphone")}
            icon={Phone}
            type="tel"
            autoComplete="tel"
            placeholder="0555 00 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <AuthField
          label={t("Mot de passe")}
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder={t("8 caractères minimum")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          trailing={eye}
        />

        <button type="submit" disabled={loading} className={`${authSubmitClass} mt-2`}>
          {loading ? t("Inscription...") : t("Créer mon compte")}
          <ArrowRight className="flip-rtl h-5 w-5" />
        </button>
      </form>

      <p className="mt-8 text-center text-[15px] text-ink-soft">
        {t("Déjà un compte ?")}{" "}
        <a href={pageUrl("login")} className="font-bold text-sky-text hover:underline">
          {t("Se connecter")}
        </a>
      </p>
    </AuthShell>
  );
}
