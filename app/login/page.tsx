"use client";

import { useState, useSyncExternalStore } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { AuthShell, AuthField, AuthError, authSubmitClass } from "@/components/AuthShell";
import { pageUrl } from "@/lib/routes";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error || "Échec de la connexion.");
      return;
    }

    // Static export: use a full page navigation so .html files resolve on any server.
    if (typeof window !== "undefined") {
      window.location.href = pageUrl(result.role === "admin" ? "admin" : "client");
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
      eyebrow="Espace client"
      title={
        <>
          Bon retour <br />
          <span className="text-sky-gradient">parmi nous.</span>
        </>
      }
      subtitle="Connectez-vous pour gérer vos réservations MYLOC.DZ."
      image="images/cars/jetour-x70-plus.png"
      imageAlt="Jetour X70 Plus"
    >
      <AuthError message={error || (expired ? "Votre session a expiré : reconnectez-vous." : "")} />
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthField
          label="Adresse email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthField
          label="Mot de passe"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="8 caractères minimum"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          trailing={eye}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-ink-soft">
            <input type="checkbox" className="h-4 w-4 accent-sky" />
            Se souvenir de moi
          </label>
          <a href="#" className="font-bold text-sky-text hover:underline">
            Mot de passe oublié ?
          </a>
        </div>

        <button type="submit" disabled={loading} className={`${authSubmitClass} mt-2`}>
          {loading ? "Connexion..." : "Se connecter"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>

      <p className="mt-8 text-center text-[15px] text-ink-soft">
        Pas encore de compte ?{" "}
        <a href={pageUrl("register")} className="font-bold text-sky-text hover:underline">
          Créer un compte
        </a>
      </p>
    </AuthShell>
  );
}
