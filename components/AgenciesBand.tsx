"use client";

import { MapPin } from "lucide-react";
import { site } from "@/lib/site";
import { useLang } from "@/lib/i18n";

/** Bandeau défilant avec les points de retrait MYLOC. */
export function AgenciesBand() {
  const { t } = useLang();
  const names = site.agencies.map((a) => t(a).replace(/^(Agence|وكالة)\s+/, ""));
  const loop = [...names, ...names, ...names, ...names];

  return (
    <section id="agences" aria-label={t("Nos points de retrait")} className="overflow-hidden bg-sky py-4 text-navy">
      <ul className="sr-only">
        {site.agencies.map((a) => (
          <li key={a}>{t(a)}</li>
        ))}
      </ul>
      <div className="flex w-max animate-slide-left items-center gap-10 whitespace-nowrap" aria-hidden="true">
        {loop.map((name, i) => (
          <span key={i} className="flex items-center gap-10 text-sm font-extrabold uppercase tracking-[0.2em] sm:text-base">
            {name}
            <MapPin className="h-4 w-4 opacity-60" />
          </span>
        ))}
      </div>
    </section>
  );
}
