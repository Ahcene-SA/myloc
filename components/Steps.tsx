import { cn } from "@/lib/utils";

const steps = [
  { title: "Choisissez", desc: "Votre agence de retrait, vos dates et le véhicule qui vous ressemble." },
  { title: "Réservez", desc: "Créez votre espace client et confirmez en moins de deux minutes. Le prix affiché est le prix final." },
  { title: "Roulez", desc: "Récupérez les clés et partez l’esprit libre : assurance et assistance 24/7 incluses." },
];

export function Steps() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-display text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-5xl lg:text-[56px]">
            Réservez en <span className="font-normal italic text-terra">trois étapes</span>
          </h2>
          <p className="max-w-sm text-base leading-relaxed text-ink-soft">
            Réservez en ligne 24h/24 et 7j/7, puis récupérez vos clés à l&apos;agence ou à l&apos;aéroport.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => {
            const last = i === steps.length - 1;
            return (
              <li
                key={s.title}
                className={cn(
                  "flex min-h-[230px] flex-col gap-4 rounded-[28px] p-8 lg:p-9",
                  last ? "bg-ink text-sand" : "bg-cream text-ink"
                )}
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full font-display text-2xl font-bold",
                    last ? "bg-terra text-white" : "bg-sand-deep text-terra"
                  )}
                >
                  {i + 1}
                </span>
                <h3 className="font-display text-[28px] font-semibold">{s.title}</h3>
                <p className={cn("text-base leading-relaxed", last ? "text-[#C9CFD6]" : "text-ink-soft")}>{s.desc}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
