import { Star8 } from "./Zellige";
import { site } from "@/lib/site";

const names = site.agencies.map((a) => a.replace(/^Agence\s+/, ""));

/** Bandeau défilant avec les agences MYLOC. */
export function AgenciesBand() {
  // Liste doublée pour une boucle continue (translateX -50%).
  const loop = [...names, ...names, ...names, ...names];

  return (
    <section id="agences" aria-label="Nos agences" className="mt-16 overflow-hidden bg-sea py-5 text-sand lg:mt-20">
      <ul className="sr-only">
        {site.agencies.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <div className="flex w-max animate-slide-left items-center gap-9 whitespace-nowrap font-display text-xl italic sm:text-2xl" aria-hidden="true">
        {loop.map((name, i) => (
          <span key={i} className="flex items-center gap-9">
            {name}
            <Star8 className="h-[18px] w-[18px]" color="var(--terra-light)" />
          </span>
        ))}
      </div>
    </section>
  );
}
