import { Check } from "lucide-react";
import { AlgiersSkyline, BrandHeading, Sky, SkyCircle } from "./Brand";
import { site } from "@/lib/site";

const points = [
  "Flotte moderne et entretenue",
  "Réservation en ligne simplifiée",
  "Service client réactif",
  "Tarifs compétitifs sans surprise",
];

export function About() {
  return (
    <section id="a-propos" className="relative overflow-hidden bg-white py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        {/* Visuel : style post Instagram */}
        <div className="bg-brand-mist relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[32px] border border-line">
          <SkyCircle className="-right-24 -top-24 h-80 w-80" />
          <AlgiersSkyline className="inset-x-0 bottom-0 h-44 w-full text-navy opacity-[0.07]" />
          <div className="relative flex h-full flex-col items-center px-6 pt-12 text-center">
            <span className="kicker text-[11px] text-navy/80">
              Location de véhicules en <strong className="font-extrabold text-navy">Algérie</strong>
            </span>
            <p className="mt-4 text-[30px] font-extrabold uppercase leading-[1.02] text-navy sm:text-4xl">
              Votre <Sky>mobilité</Sky>,
              <br />
              notre priorité
            </p>
            <span className="mt-4 block h-[3px] w-14 rounded-full bg-sky" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="images/cars/jetour-x70-plus.png"
              alt="Jetour X70 Plus"
              loading="lazy"
              className="car-reflect absolute bottom-[12%] left-1/2 w-[82%] -translate-x-1/2"
            />
          </div>
        </div>

        {/* Texte */}
        <div className="flex flex-col gap-6">
          <BrandHeading overline={`À propos de ${site.name}`}>
            Votre partenaire <Sky>mobilité</Sky> en Algérie
          </BrandHeading>
          <p className="text-base leading-[1.8] text-ink-soft">
            MYLOC.DZ est une agence de location de voitures basée à Alger, dédiée à offrir une expérience simple, fiable
            et accessible. Que vous soyez en voyage d&apos;affaires, en vacances ou que vous ayez besoin d&apos;un
            véhicule au quotidien, nous mettons à votre disposition des citadines, compactes et SUV récents.
          </p>
          <p className="text-base leading-[1.8] text-ink-soft">
            Notre équipe travaille chaque jour pour vous garantir des tarifs justes, une prise en charge rapide et un
            service client disponible à tout moment.
          </p>
          <ul className="mt-2 grid gap-3.5 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm font-bold text-navy">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sky-soft">
                  <Check className="h-3.5 w-3.5 text-sky-text" strokeWidth={3} />
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
