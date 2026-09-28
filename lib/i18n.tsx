"use client";

/**
 * Français / العربية.
 * La clé de traduction est le texte français lui-même : t("Réserver") → « احجز » en arabe.
 * Un texte absent du dictionnaire reste en français (pas de page cassée).
 * Variables : t("Du {start} au {end}", { start, end }).
 */

import { createContext, Fragment, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { ar } from "./i18n/ar";

export type Lang = "fr" | "ar";

const KEY = "myloc_lang";
const EVENT = "myloc:lang";

// Langue courante, lisible aussi hors des composants (formats de date, messages).
let currentLang: Lang = "fr";

/** Appelé par LangProvider à chaque rendu (idempotent). */
function syncCurrentLang(lang: Lang) {
  currentLang = lang;
}

export function getLang(): Lang {
  return currentLang;
}

/** Locale des dates et nombres (l'Algérie utilise les chiffres latins). */
export function dateLocale(): string {
  return currentLang === "ar" ? "ar-DZ-u-nu-latn" : "fr-FR";
}

/**
 * Messages construits avec des nombres/codes (renvoyés par l'API) : traduits par motif.
 * Une clé peut aussi porter un contexte après « || » (ex. « Retour||date ») : le français
 * affiche seulement la partie avant « || ».
 */
const patterns: [RegExp, string][] = [
  [/^Remise durée -([\d,.]+) % \(dès (\d+) jours\)$/, "تخفيض المدة ‎-$1%‎ (ابتداءً من $2 أيام)"],
  [/^Remise fidélité -([\d,.]+) %$/, "تخفيض الوفاء ‎-$1%"],
  [/^Code (\S+) -([\d,.]+) %$/, "الرمز $1 ‎-$2%"],
  [/^Code (\S+) \(remise fixe\)$/, "الرمز $1 (تخفيض ثابت)"],
  [/^Prix négocié par l'agence$/, "سعر متفاوض عليه مع الوكالة"],
  [/^Trop de tentatives\. Réessayez dans (\d+) secondes\.$/, "محاولات كثيرة. أعد المحاولة بعد $1 ثانية."],
  [/^Trop de demandes\. Réessayez dans (\d+) minute\(s\)\.$/, "طلبات كثيرة. أعد المحاولة بعد $1 دقيقة."],
  [/^Email ou mot de passe incorrect \((\d+) essai\(s\) restant\(s\)\)\.$/, "البريد الإلكتروني أو كلمة المرور غير صحيحة (بقيت $1 محاولة)."],
  [/^Ce code sera valable à partir du ([\d/]+)\.$/, "سيكون هذا الرمز صالحًا ابتداءً من $1."],
  [/^Ce code est valable à partir de (\d+) jours de location\.$/, "هذا الرمز صالح ابتداءً من $1 أيام كراء."],
  [/^La durée maximale d'une location en ligne est de (\d+) jours\. Contactez-nous pour une location longue durée\.$/, "أقصى مدة للحجز عبر الإنترنت هي $1 يومًا. اتصلوا بنا للكراء طويل المدة."],
  [/^Trop de tentatives depuis cette connexion\. Réessayez dans (\d+) minute\(s\)\.$/, "محاولات كثيرة من هذا الاتصال. أعد المحاولة بعد $1 دقيقة."],
  [/^Les réservations en ligne sont (?:ouvertes|possibles) jusqu'à (\d+) mois à l'avance\.(?: Contactez-nous pour une date plus lointaine\.)?$/, "الحجز عبر الإنترنت ممكن حتى $1 شهرًا مسبقًا. اتصلوا بنا لموعد أبعد."],
  [/^Vous avez déjà (\d+) demandes en attente[.:].*$/, "لديك بالفعل $1 طلبات قيد الانتظار. انتظر رد الوكالة أو ألغِ أحدها قبل تقديم طلب جديد."],
  [/^Le champ (\S+) est trop long\.$/, "الحقل $1 طويل جدًا."],
];

export function translate(text: string, vars?: Record<string, string | number>, lang: Lang = currentLang): string {
  let out: string;
  if (lang === "ar") {
    out = ar[text] ?? text;
    if (out === text) {
      const hit = patterns.find(([re]) => re.test(text));
      if (hit) out = text.replace(hit[0], hit[1]);
    }
  } else {
    out = text;
  }
  out = out.split("||")[0];
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
  return out;
}

/** Raccourci utilisable partout (hors hooks). */
export const t = translate;

/**
 * Langue imposée sans être enregistrée (espace agence, contrat : français uniquement).
 * Elle ne vaut que pour la page où elle a été demandée : la préférence du client
 * (par exemple l'arabe sur un PC partagé de l'agence) n'est jamais effacée.
 */
let override: { lang: Lang; path: string } | null = null;

function readLang(): Lang {
  if (override && override.path === window.location.pathname) return override.lang;
  try {
    return localStorage.getItem(KEY) === "ar" ? "ar" : "fr";
  } catch {
    return "fr";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Change la langue. Par défaut le choix est enregistré (bouton FR / ع) ;
 * avec { persist: false }, la langue est seulement imposée pour la page courante.
 */
export function setLang(lang: Lang, options: { persist?: boolean } = {}) {
  if (options.persist === false) {
    override = { lang, path: window.location.pathname };
  } else {
    override = null;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* navigation privée */
    }
  }
  window.dispatchEvent(new Event(EVENT));
}

interface LangValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: typeof translate;
  setLang: (l: Lang, options?: { persist?: boolean }) => void;
}

const LangContext = createContext<LangValue>({ lang: "fr", dir: "ltr", t: translate, setLang });

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "fr" as Lang);
  syncCurrentLang(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value: LangValue = {
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    t: (text, vars) => translate(text, vars, lang),
    setLang,
  };

  // key : tout se ré-affiche dans la nouvelle langue (dates, montants, textes)
  return (
    <LangContext.Provider value={value}>
      <Fragment key={lang}>{children}</Fragment>
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Bouton FR / ع pour changer de langue. */
export function LangSwitch({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const { lang } = useLang();
  const next: Lang = lang === "ar" ? "fr" : "ar";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      lang={next}
      aria-label={next === "ar" ? "التصفح بالعربية" : "Voir le site en français"}
      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border-2 px-3 text-sm font-bold transition-colors ${
        dark ? "border-white/20 text-white hover:border-white" : "border-line text-navy hover:border-navy"
      } ${className}`}
    >
      {next === "ar" ? "عربي" : "FR"}
    </button>
  );
}
