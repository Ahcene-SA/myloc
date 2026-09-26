import { BrandHeading, Sky } from "./Brand";
import { cn } from "@/lib/utils";

const steps = [
  { title: "Choisissez", desc: "Votre point de retrait, vos dates et le véhicule qui vous convient." },
  { title: "Réservez", desc: "Envoyez-nous votre demande sur WhatsApp ou créez votre espace client en ligne." },
  { title: "Roulez", desc: "Récupérez les clés et partez l’esprit libre : assurance et assistance 24/7 incluses." },
];

export function Steps() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BrandHeading overline="Simple et rapide">
          Réservez en <Sky>3 étapes</Sky>
        </BrandHeading>

        <ol className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => {
            const last = i === steps.length - 1;
            return (
              <li
                key={s.title}
                className={cn(
                  "relative flex min-h-[220px] flex-col gap-4 overflow-hidden rounded-3xl p-8",
                  last ? "bg-navy text-white" : "border border-line bg-mist text-navy"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -right-3 -top-6 text-[140px] font-extrabold leading-none",
                    last ? "text-white/[0.06]" : "text-navy/[0.05]"
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold", last ? "bg-sky text-navy" : "bg-white text-sky-text")}>
                  {i + 1}
                </span>
                <h3 className="text-2xl font-extrabold uppercase tracking-wide">{s.title}</h3>
                <p className={cn("text-[15px] leading-relaxed", last ? "text-white/75" : "text-ink-soft")}>{s.desc}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
