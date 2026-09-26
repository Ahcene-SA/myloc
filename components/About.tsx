import { Check } from "lucide-react";
import { Star8 } from "./Zellige";

const points = [
  "Flotte moderne et entretenue",
  "Réservation en ligne simplifiée",
  "Service client réactif",
  "Tarifs compétitifs sans surprise",
];

export function About() {
  return (
    <section id="a-propos" className="py-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,620px)_1fr] lg:gap-20 lg:px-8">
        {/* Mosaïque d'arcs */}
        <div className="relative mx-auto grid h-[440px] w-full max-w-[620px] grid-cols-2 gap-4 sm:h-[600px] sm:gap-6">
          <div className="arch mt-16 h-[340px] overflow-hidden border-8 border-cream sm:mt-20 sm:h-[460px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="images/scenes/renault-captur.jpg"
              alt="Renault Captur au bord de la mer"
              loading="lazy"
              className="h-full w-full object-cover object-[center_65%]"
            />
          </div>
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="arch h-[250px] overflow-hidden border-8 border-cream sm:h-[380px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="images/scenes/clio5-alpino.jpg"
                alt="Renault Clio 5 Alpino entre les palmiers"
                loading="lazy"
                className="h-full w-full object-cover object-[center_65%]"
              />
            </div>
            <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[20px] bg-terra p-5 text-white sm:p-7">
              <Star8 className="absolute -right-8 -top-8 h-36 w-36 opacity-20" color="#fff" strokeWidth={0.6} />
              <span lang="ar" dir="rtl" className="font-arabic text-xl font-bold sm:text-[26px]">
                مرحبا بيكم
              </span>
              <span className="font-display text-base italic leading-snug sm:text-[22px]">
                Bienvenue chez vous, sur toutes les routes d&apos;Algérie.
              </span>
            </div>
          </div>
        </div>

        {/* Texte */}
        <div className="flex flex-col gap-6">
          <span className="eyebrow text-terra">À propos de MYLOC.DZ</span>
          <h2 className="font-display text-[38px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[52px]">
            Votre partenaire mobilité <span className="font-normal italic">en Algérie.</span>
          </h2>
          <p className="text-base leading-[1.75] text-ink-soft lg:text-[17px]">
            MYLOC.DZ est une agence de location de voitures dédiée à offrir une expérience simple, fiable et accessible.
            Que vous soyez en voyage d&apos;affaires, en vacances ou que vous ayez besoin d&apos;un véhicule au quotidien,
            nous mettons à votre disposition une large gamme de citadines, SUV et berlines récentes.
          </p>
          <p className="text-base leading-[1.75] text-ink-soft lg:text-[17px]">
            Notre équipe travaille chaque jour pour vous garantir des tarifs justes, une prise en charge rapide et un
            service client disponible à tout moment.
          </p>
          <ul className="mt-2 grid gap-3.5 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[15px] font-bold text-ink">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sand-deep">
                  <Check className="h-3.5 w-3.5 text-terra" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
