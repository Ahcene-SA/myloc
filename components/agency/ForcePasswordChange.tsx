"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Logo } from "../Brand";
import { useAuth } from "../AuthContext";
import { agencyPing, changePassword } from "@/lib/api";

/** Première connexion d'un employé : il remplace le mot de passe provisoire par le sien. */
export function ForcePasswordChange() {
  const { user, updateUser, logout } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 8) return setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    if (next !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    try {
      await changePassword(current, next);
      const fresh = await agencyPing();
      if (fresh) updateUser(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible.");
      setBusy(false);
    }
  };

  const input =
    "h-12 w-full rounded-2xl border-2 border-line bg-mist px-4 text-[15px] font-semibold text-navy outline-none focus:border-sky focus:bg-white";

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-8 shadow-xl">
        <Logo />
        <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-soft text-sky-text">
          <KeyRound className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-navy">Bienvenue {user?.full_name?.split(" ")[0]} !</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Pour votre sécurité, remplacez le mot de passe provisoire donné par le propriétaire par un mot de passe personnel.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Mot de passe provisoire" className={input} />
          <input type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nouveau mot de passe (8 caractères min.)" className={input} />
          <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer le nouveau mot de passe" className={input} />
          {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-sky text-sm font-bold text-navy hover:bg-sky-mid hover:text-white disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer mon mot de passe
          </button>
          <button type="button" onClick={() => { logout(); window.location.reload(); }} className="text-sm font-semibold text-muted hover:text-navy">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
