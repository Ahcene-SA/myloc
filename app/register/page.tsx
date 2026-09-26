"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { AuthShell, AuthField, AuthError, authSubmitClass } from "@/components/AuthShell";
import { pageUrl } from "@/lib/routes";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

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
      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
    >
      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  return (
    <AuthShell
      eyebrow="Inscription"
      title={
        <>
          Créez votre <span className="text-sky-gradient">compte.</span>
        </>
      }
      subtitle="Un compte MYLOC.DZ pour réserver votre véhicule en deux minutes et suivre vos locations."
      image="images/cars/renault-captur.png"
      imageAlt="Renault Captur"
    >
      <AuthError message={error} />
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthField
          label="Nom complet"
          icon={User}
          type="text"
          autoComplete="name"
          placeholder="Prénom Nom"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <AuthField
            label="Téléphone"
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
          label="Mot de passe"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="8 caractères minimum"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          trailing={eye}
        />

        <button type="submit" disabled={loading} className={`${authSubmitClass} mt-2`}>
          {loading ? "Inscription..." : "Créer mon compte"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>

      <p className="mt-8 text-center text-[15px] text-ink-soft">
        Déjà un compte ?{" "}
        <a href={pageUrl("login")} className="font-bold text-sky-text hover:underline">
          Se connecter
        </a>
      </p>
    </AuthShell>
  );
}
