import { MapPin } from "lucide-react";
import { site } from "@/lib/site";

const names = site.agencies.map((a) => a.replace(/^Agence\s+/, ""));

/** Bandeau défilant avec les points de retrait MYLOC. */
export function AgenciesBand() {
  const loop = [...names, ...names, ...names, ...names];

  return (
    <section id="agences" aria-label="Nos points de retrait" className="overflow-hidden bg-sky py-4 text-navy">
      <ul className="sr-only">
        {site.agencies.map((a) => (
          <li key={a}>{a}</li>
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
