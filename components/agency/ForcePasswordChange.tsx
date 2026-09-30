"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Logo } from "../Brand";
import { useAuth } from "../AuthContext";
import { agencyPing, changePassword } from "@/lib/api";

/** Première connexion d'un employé : il remplace le mot de passe provisoire par le sien. */
export function ForcePasswordChange() {
  const { user, updateUser, logout, renewToken } = useAuth();
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
      // Nouveau jeton : les autres sessions sont révoquées, celle-ci continue
      renewToken(await changePassword(current, next));
      const fresh = await agencyPing();
      if (fresh) updateUser(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible.");
      setBusy(false);
    }
  };

  const input =
    "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/25";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Logo />
        <span className="mt-6 flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          <KeyRound className="h-4 w-4" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">Bienvenue {user?.full_name?.split(" ")[0]} !</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pour votre sécurité, remplacez le mot de passe provisoire donné par le propriétaire par un mot de passe personnel.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Mot de passe provisoire</span>
            <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Nouveau mot de passe (8 caractères min.)</span>
            <input type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Confirmer le nouveau mot de passe</span>
            <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
          </label>
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="mt-1 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-navy text-sm font-medium text-white shadow-sm hover:bg-navy-soft disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer mon mot de passe
          </button>
          <button type="button" onClick={() => { logout(); window.location.reload(); }} className="text-sm text-slate-500 hover:text-slate-900">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
