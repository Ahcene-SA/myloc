"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, Copy, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, Printer, ShieldCheck, Smartphone } from "lucide-react";
import { Logo } from "../Brand";
import { useAuth } from "../AuthContext";
import { QrCode } from "./QrCode";
import { agencyLogin, agencyVerify, isStaff, type AgencyLoginResult } from "@/lib/api";
import { pageUrl } from "@/lib/routes";
import { setLang, useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Step =
  | { kind: "credentials" }
  | { kind: "totp"; challenge: string }
  | { kind: "setup"; challenge: string; secret: string; otpauth: string }
  | { kind: "recovery"; result: AgencyLoginResult }
  | { kind: "lowCodes"; result: AgencyLoginResult };

const field =
  "h-13 w-full rounded-2xl border-2 border-white/10 bg-white/5 ps-12 pe-4 text-[15px] font-semibold text-white outline-none transition-colors placeholder:font-medium placeholder:text-white/30 focus:border-sky focus:bg-white/10";
const btn =
  "inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-sky text-[15px] font-bold text-navy transition-colors hover:bg-white disabled:opacity-60";

export function AgencyLogin() {
  const { token, user, isLoading, startSession } = useAuth();
  const { lang } = useLang();
  const reason = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("expired"),
    () => null
  );

  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // L'espace agence est en français
  useEffect(() => {
    if (lang !== "fr") setLang("fr");
  }, [lang]);

  // Déjà connecté comme membre de l'équipe : directement au tableau de bord
  useEffect(() => {
    if (!isLoading && token && isStaff(user?.role) && step.kind === "credentials") {
      window.location.replace(pageUrl("admin"));
    }
  }, [isLoading, token, user, step.kind]);

  const finish = (r: AgencyLoginResult) => {
    if (!r.token || !r.user) return;
    startSession(r.token, r.user);
    window.location.href = pageUrl("admin");
  };

  const handle = (r: AgencyLoginResult) => {
    setCode("");
    if (r.step === "totp" && r.challenge) return setStep({ kind: "totp", challenge: r.challenge });
    if (r.step === "totp_setup" && r.challenge && r.secret && r.otpauth)
      return setStep({ kind: "setup", challenge: r.challenge, secret: r.secret, otpauth: r.otpauth });
    if (r.recovery_codes?.length) return setStep({ kind: "recovery", result: r });
    if (r.recovery_codes_left !== undefined && r.recovery_codes_left <= 2) return setStep({ kind: "lowCodes", result: r });
    finish(r);
  };

  const run = async (fn: () => Promise<AgencyLoginResult>) => {
    setBusy(true);
    setError("");
    try {
      handle(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  const submitCredentials = (e: FormEvent) => {
    e.preventDefault();
    run(() => agencyLogin(email.trim(), password));
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    if (step.kind !== "totp" && step.kind !== "setup") return;
    const challenge = step.challenge;
    run(() => agencyVerify(challenge, useRecovery ? { recovery_code: code.trim() } : { code: code.replace(/\D/g, "") }));
  };

  const back = () => {
    setStep({ kind: "credentials" });
    setCode("");
    setError("");
    setUseRecovery(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-4 py-12 text-white">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/3 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(67,176,230,0.22), transparent 65%)" }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo light />
          <span className="rounded-full border border-sky/40 bg-sky/10 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-sky">
            Espace agence
          </span>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur sm:p-8">
          {step.kind === "credentials" && (
            <form onSubmit={submitCredentials} className="flex flex-col gap-5">
              <Header icon={Lock} title="Connexion de l'équipe" text="Réservé au propriétaire et aux employés de MYLOC.DZ." />
              {reason && !error && (
                <Notice>
                  {reason === "idle"
                    ? "Déconnecté après 30 minutes d'inactivité."
                    : reason === "disabled"
                      ? "Ce compte a été désactivé par le propriétaire."
                      : "Votre session a expiré : reconnectez-vous."}
                </Notice>
              )}
              <label className="relative block">
                <span className="sr-only">Email</span>
                <Mail className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email professionnel"
                  className={field}
                />
              </label>
              <label className="relative block">
                <span className="sr-only">Mot de passe</span>
                <Lock className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className={cn(field, "pe-12")}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute end-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:text-white"
                >
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </label>
              <ErrorLine message={error} />
              <button type="submit" disabled={busy} className={btn}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                Continuer
              </button>
            </form>
          )}

          {step.kind === "totp" && (
            <form onSubmit={submitCode} className="flex flex-col gap-5">
              <Header
                icon={useRecovery ? KeyRound : Smartphone}
                title={useRecovery ? "Code de secours" : "Code de vérification"}
                text={
                  useRecovery
                    ? "Tapez un de vos codes de secours (format XXXX-XXXX). Chaque code ne sert qu'une fois."
                    : "Ouvrez Google Authenticator sur votre téléphone et tapez le code MYLOC.DZ à 6 chiffres."
                }
              />
              <CodeInput value={code} onChange={setCode} recovery={useRecovery} />
              <ErrorLine message={error} />
              <button type="submit" disabled={busy || (!useRecovery && code.replace(/\D/g, "").length !== 6)} className={btn}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Valider
              </button>
              <div className="flex items-center justify-between text-sm font-semibold">
                <button type="button" onClick={back} className="text-white/50 hover:text-white">
                  ← Retour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseRecovery(!useRecovery);
                    setCode("");
                    setError("");
                  }}
                  className="text-sky hover:underline"
                >
                  {useRecovery ? "Utiliser l'application" : "Téléphone perdu ?"}
                </button>
              </div>
            </form>
          )}

          {step.kind === "setup" && (
            <form onSubmit={submitCode} className="flex flex-col gap-5">
              <Header
                icon={ShieldCheck}
                title="Protégez votre compte"
                text="Le compte propriétaire est protégé par un code à 6 chiffres sur votre téléphone. C'est à faire une seule fois."
              />
              <ol className="flex flex-col gap-3 text-sm text-white/80">
                <li>
                  <b className="text-white">1.</b> Installez <b className="text-white">Google Authenticator</b> (App Store ou Play Store).
                </li>
                <li>
                  <b className="text-white">2.</b> Dans l&apos;application, touchez <b className="text-white">+</b> puis{" "}
                  <b className="text-white">Scanner un QR code</b> :
                </li>
              </ol>
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl bg-white p-3">
                  <QrCode value={step.otpauth} size={180} />
                </div>
                <SecretKey secret={step.secret} />
              </div>
              <p className="text-sm text-white/80">
                <b className="text-white">3.</b>{" "}Tapez le code à 6 chiffres affiché dans l&apos;application :
              </p>
              <CodeInput value={code} onChange={setCode} />
              <ErrorLine message={error} />
              <button type="submit" disabled={busy || code.replace(/\D/g, "").length !== 6} className={btn}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Activer et continuer
              </button>
              <button type="button" onClick={back} className="text-sm font-semibold text-white/50 hover:text-white">
                ← Retour
              </button>
            </form>
          )}

          {step.kind === "recovery" && <RecoveryCodes codes={step.result.recovery_codes || []} onDone={() => finish(step.result)} />}

          {step.kind === "lowCodes" && (
            <div className="flex flex-col gap-5">
              <Header
                icon={KeyRound}
                title="Plus beaucoup de codes de secours"
                text={`Il vous reste ${step.result.recovery_codes_left} code(s) de secours. Générez-en de nouveaux dans « Mon compte » dès que possible.`}
              />
              <button type="button" onClick={() => finish(step.result)} className={btn}>
                Continuer <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Vous êtes client ?{" "}
          <a href={pageUrl("login")} className="font-bold text-white/70 hover:text-white">
            Connexion client
          </a>
        </p>
      </div>
    </div>
  );
}

function Header({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky/15 text-sky">
        <Icon className="h-6 w-6" />
      </span>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="text-sm leading-relaxed text-white/60">{text}</p>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-200">{children}</p>;
}

function ErrorLine({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
      {message}
    </p>
  );
}

function CodeInput({ value, onChange, recovery }: { value: string; onChange: (v: string) => void; recovery?: boolean }) {
  return (
    <input
      autoFocus
      inputMode={recovery ? "text" : "numeric"}
      autoComplete="one-time-code"
      value={value}
      onChange={(e) => onChange(recovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, "").slice(0, 6))}
      placeholder={recovery ? "XXXX-XXXX" : "000000"}
      aria-label={recovery ? "Code de secours" : "Code à 6 chiffres"}
      className="h-16 w-full rounded-2xl border-2 border-white/10 bg-white/5 text-center font-mono text-3xl font-bold tracking-[0.4em] text-white outline-none placeholder:text-white/20 focus:border-sky"
    />
  );
}

function SecretKey({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  const grouped = secret.match(/.{1,4}/g)?.join(" ") ?? secret;
  return (
    <div className="flex w-full flex-col items-center gap-1 text-center">
      <p className="text-xs text-white/50">Impossible de scanner ? Saisissez cette clé dans l&apos;application :</p>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(secret).then(() => setCopied(true))}
        className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 font-mono text-xs font-bold tracking-wider text-white/80 hover:bg-white/10"
      >
        {grouped}
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/** Affichage unique des codes de secours, à imprimer ou copier. */
export function RecoveryCodes({ codes, onDone, dark = true }: { codes: string[]; onDone: () => void; dark?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const print = () => {
    const w = window.open("", "_blank", "width=480,height=640");
    if (!w) return;
    w.document.write(
      `<html><head><title>Codes de secours MYLOC.DZ</title></head><body style="font-family:system-ui;padding:32px">
      <h2>MYLOC.DZ · Codes de secours</h2><p>Chaque code ne sert qu'une fois. À garder en lieu sûr, à l'agence.</p>
      <pre style="font-size:20px;line-height:1.8">${codes.join("\n")}</pre>
      <p style="color:#666">Imprimé le ${new Date().toLocaleString("fr-FR")}</p></body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", dark ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-100 text-emerald-700")}>
          <KeyRound className="h-6 w-6" />
        </span>
        <h2 className={cn("text-2xl font-extrabold", dark ? "text-white" : "text-navy")}>Vos codes de secours</h2>
        <p className={cn("text-sm leading-relaxed", dark ? "text-white/60" : "text-ink-soft")}>
          Si vous perdez votre téléphone, chacun de ces codes permet de se connecter <b>une seule fois</b>. Imprimez-les et rangez-les à
          l&apos;agence. Ils ne seront plus jamais affichés.
        </p>
      </div>
      <ul
        className={cn(
          "grid grid-cols-2 gap-2 rounded-2xl p-4 font-mono text-base font-bold tracking-wider",
          dark ? "bg-white/5 text-white" : "bg-mist text-navy"
        )}
      >
        {codes.map((c) => (
          <li key={c} className="text-center">
            {c}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={print}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold",
            dark ? "border-white/15 text-white hover:border-white" : "border-line text-navy hover:border-navy"
          )}
        >
          <Printer className="h-4 w-4" /> Imprimer
        </button>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(codes.join("\n")).then(() => setCopied(true))}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold",
            dark ? "border-white/15 text-white hover:border-white" : "border-line text-navy hover:border-navy"
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiés" : "Copier"}
        </button>
      </div>
      <label className={cn("flex cursor-pointer items-center gap-3 text-sm font-semibold", dark ? "text-white/80" : "text-navy")}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-5 w-5 accent-sky" />
        J&apos;ai rangé mes codes en lieu sûr
      </label>
      <button type="button" disabled={!saved} onClick={onDone} className={cn(btn, "disabled:opacity-40")}>
        Continuer <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
