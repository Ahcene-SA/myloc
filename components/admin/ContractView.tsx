"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, FileWarning, Printer } from "lucide-react";
import { useAuth } from "../AuthContext";
import { Logo } from "../Brand";
import {
  fetchAllReservations,
  isStaff,
  fetchInspections,
  formatTransmission,
  zoneLabels,
  type Inspection,
  type InspectionSet,
  type ReservationFromApi,
} from "@/lib/api";
import { pageUrl } from "@/lib/routes";
import { setLang, useLang } from "@/lib/i18n";
import { site } from "@/lib/site";
import { LoadingBlock, categoryLabel, daysBetween, formatDate, formatPrice, formatTime, paymentLabels, reservationRef } from "../client/shared";
import { CarDamageMap } from "./CarDamageMap";

/** Conditions générales de MYLOC.DZ (texte fourni par l'agence). */
const DEPOSIT = `${site.deposit.toLocaleString("fr-FR")} DA (${site.depositEur} €)`;
const FRANCHISE = `${site.franchise.toLocaleString("fr-FR")} DA`;

type Clause = { title: string; text?: string[]; items?: string[] };
const conditions: Clause[] = [
  {
    title: "Pour un particulier, le locataire doit déposer",
    items: ["Un passeport en cours de validité", "Une caution par espèces ou virement bancaire", "Une copie du permis de conduire"],
  },
  {
    title: "Pour un professionnel, la société doit déposer",
    items: [
      "Une copie du registre de commerce légalisée",
      "Une pièce d'identité du gérant de la société",
      "Un justificatif de domicile du gérant",
      "Une copie du permis du ou des conducteurs",
      "Une caution par espèces, virement bancaire ou chèque",
    ],
  },
  {
    title: "Dépôt de caution",
    text: [
      `Pour toute location de véhicule, une caution est exigée en garantie de la bonne exécution des obligations du locataire. Le montant de la caution est de ${DEPOSIT}. Elle doit être versée uniquement en espèces ou par virement bancaire avant la remise du véhicule. Aucun véhicule ne pourra être délivré sans réception effective de la caution dans l'un des modes de paiement acceptés.`,
    ],
  },
  {
    title: "Restitution de la caution",
    text: [
      "En l'absence de dommage ou de frais supplémentaires à la charge du locataire, la caution est restituée immédiatement lors de la restitution du véhicule, ou dans un délai maximal de 7 jours dans le cas d'une caution par virement bancaire, sous réserve du respect de toutes les conditions du contrat.",
    ],
  },
  {
    title: "Utilisation du véhicule : le locataire s'engage à",
    items: [
      "Utiliser le véhicule avec prudence, conformément au code de la route et dans des conditions normales d'utilisation.",
      "Ne toucher ni changer aucune pièce ni aucun accessoire du véhicule.",
      "Ne pas utiliser le véhicule pour des activités illicites, le transport de marchandises dangereuses ou prohibées, ou la participation à des compétitions (courses, rallyes, etc.).",
      "Faire conduire le véhicule uniquement par la personne citée sur le contrat jusqu'à sa restitution. Tout autre conducteur doit être accepté par l'agence et mentionné comme deuxième chauffeur sur le contrat.",
      "Ne pas sous-louer ni prêter le véhicule à un tiers, à quelque titre que ce soit.",
      "Assurer la sécurité du véhicule en le fermant à clé et en activant les dispositifs de sécurité lors du stationnement.",
      "Assumer la responsabilité des amendes, infractions ou contraventions survenues pendant la location.",
      "Restituer le véhicule à la date prévue, en bon état, avec le niveau de carburant initial.",
      "Ne pas dépasser les limites géographiques mentionnées dans le contrat sans autorisation écrite du loueur.",
      "Ne pas utiliser le véhicule dans le cadre d'une compétition ou de l'apprentissage de la conduite.",
      "Ne pas utiliser le véhicule pour le remorquage, la publicité ou la propagande de toute nature.",
      "Ne pas transporter de voyageurs à titre onéreux, ni un nombre de personnes supérieur à celui prévu pour le véhicule.",
      "Ne pas conduire le véhicule après avoir consommé de l'alcool ou toute substance illicite.",
      "Ne pas fumer à l'intérieur du véhicule.",
    ],
  },
  {
    title: "État du véhicule",
    text: [
      "Le véhicule est remis au locataire propre, révisé et avec le plein de carburant. Un état des lieux contradictoire est établi à la prise en charge et à la restitution du véhicule, signé par les deux parties.",
      "Le locataire s'engage à restituer le véhicule dans le même état que celui constaté lors de la remise, sous peine de facturation des éventuelles réparations nécessaires (hors usure normale).",
      "Toute dégradation, rayure, choc, brûlure, tache ou anomalie mécanique non mentionnée sur l'état des lieux de départ et constatée à la restitution est à la charge du locataire, sauf preuve contraire.",
    ],
  },
  {
    title: "Franchise",
    text: [
      `En cas d'accident ou de dommage responsable (ou sans tiers identifié), le locataire reste redevable d'une franchise contractuelle de ${FRANCHISE} et d'une indemnité journalière de 1 500 DA pendant toute l'immobilisation du véhicule.`,
    ],
  },
  {
    title: "En cas d'accident, de dommage, de vol ou d'incendie, le locataire s'engage à",
    items: [
      "Déclarer immédiatement à l'agence tout accident de la circulation concernant le véhicule.",
      "Déclarer immédiatement aux autorités de police ou de gendarmerie tout vol ou incendie, et remettre les clés et les papiers du véhicule à l'agence.",
      "Remettre à l'agence un exemplaire du constat d'accident dans les 24 heures.",
      "Joindre à la déclaration tout rapport de police ou de gendarmerie établi.",
      "Indemniser le propriétaire à hauteur de 1 500 DA par jour jusqu'à la retrouvaille du véhicule en cas de vol.",
      "Remplir un constat amiable en cas d'accident, même sans tiers, et transmettre tous les documents utiles au traitement du dossier.",
      "Ne pas reconnaître de responsabilité sans l'accord préalable du loueur ou de l'assureur.",
    ],
  },
  {
    title: "Assurance",
    text: [
      "Le véhicule loué est couvert par une assurance automobile tous risques incluant au minimum : la responsabilité civile obligatoire (dommages causés à des tiers), la garantie contre le vol, la garantie incendie et la garantie dommages accidentels (avec franchise à la charge du locataire s'il est responsable).",
      `La couverture d'assurance ne dispense pas le locataire de sa responsabilité financière en cas de sinistre. En cas d'accident, de vol, d'incendie ou de tout dommage causé au véhicule loué, une franchise contractuelle de ${FRANCHISE} reste à la charge du locataire s'il est responsable.`,
    ],
  },
  {
    title: "Le locataire n'est pas assuré",
    items: [
      "Pour les dommages ou la perte, de quelque nature que ce soit, affectant les effets personnels et les objets se trouvant dans le véhicule.",
      "S'il a fourni au propriétaire de fausses informations concernant son identité ou la validité de son permis de conduire.",
      "Quand les dommages résultent d'un fait volontaire.",
      "S'il n'a pas respecté les engagements du contrat.",
    ],
  },
  {
    title: "Tarifs",
    text: ["Le coût de la location et des prestations est payable d'avance et non remboursable. Il comprend :"],
    items: [
      "Le prix de la location, calculé selon les tarifs de la saison en vigueur lors de la signature du contrat ;",
      "Le plein d'essence ;",
      "Le transfert agence – aéroport.",
      "Si le locataire souhaite conserver le véhicule au-delà de la durée prévue, il doit en informer l'agence au moins 24 heures avant l'expiration du contrat, pour une éventuelle prolongation si le véhicule est disponible à ces dates, et régler le loyer correspondant.",
    ],
  },
  {
    title: "Le locataire demeure seul responsable",
    text: [
      "des amendes, contraventions et procès-verbaux établis contre lui. En cas de perte des papiers du véhicule, le locataire doit immédiatement faire une déclaration de perte auprès des autorités de police ou de gendarmerie, prévenir l'agence et lui remettre une copie de la déclaration. Le montant des documents perdus sera retenu sur la caution. En cas de perte des clés, un montant de 300 000 DA sera retenu sur la caution.",
    ],
  },
  {
    title: "Clause attributive de compétence",
    text: [
      "Tout litige né du présent contrat et qui n'aurait pas pu déboucher sur un accord amiable sera, dans la mesure où la loi le permet, de la compétence du tribunal d'Alger dont dépend le siège social de l'agence.",
      "En cas de rupture du contrat par la restitution du véhicule avant l'échéance, le montant des jours restants n'est pas remboursé.",
    ],
  },
];

const FINAL_NOTICE =
  "Veillez à la propreté du véhicule et à le remettre pendant les heures d'ouverture, avec le plein de carburant. S'il est rendu sans le plein, le prix du plein, majoré de 2 000 DA pour le service, sera déduit de la caution. Un véhicule rendu sale entraîne la retenue du double du prix du lavage, soit 2 000 DA. Respectez les horaires de remise et de restitution : tout retard non signalé à l'agence sera facturé au prix d'une journée supplémentaire. Pour prolonger votre location, appelez impérativement l'agence et passez régler la différence et faire établir la prolongation du contrat. En cas de non-respect de ces clauses, le loueur peut mettre fin à la location et retenir sur la caution le montant réclamé par l'agence.";

function Line({ label, value, narrow }: { label: string; value?: string | number | null; narrow?: boolean }) {
  return (
    <div className="flex gap-2 border-b border-dotted border-slate-300 py-1.5 text-[12.5px]">
      <span className={`${narrow ? "w-20" : "w-20 sm:w-36"} flex-shrink-0 text-slate-500`}>{label}</span>
      <span className="min-h-[1.2em] min-w-0 flex-1 break-words font-semibold text-navy">{value || ""}</span>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-xl border border-slate-300 p-4">
      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-text">{title}</h2>
      {children}
    </section>
  );
}

function InspectionBlock({ title, i, compare }: { title: string; i?: Inspection; compare?: Inspection }) {
  const fresh = compare && i ? i.damages.filter((d) => !compare.damages.some((x) => x.zone === d.zone)).map((d) => d.zone) : [];
  return (
    <div className="flex gap-3">
      <CarDamageMap marked={i?.damages.map((d) => d.zone) ?? []} highlight={fresh} className="w-20 flex-shrink-0 [&_svg]:h-36" />
      <div className="flex-1">
        <p className="mb-1 text-[12px] font-extrabold uppercase text-navy">{title}</p>
        <Line narrow label="Kilométrage" value={i?.mileage != null ? `${i.mileage.toLocaleString("fr-FR")} km` : ""} />
        <Line narrow label="Carburant" value={i?.fuel_level != null ? `${i.fuel_level}/8` : ""} />
        <Line
          label="Dommages"
          value={i ? (i.damages.length ? i.damages.map((d) => zoneLabels[d.zone] + (d.note ? ` (${d.note})` : "")).join(" ; ") : "Aucun") : ""}
        />
        <Line narrow label="Remarques" value={i?.notes} />
        {i && i.photos.length > 0 && <p className="mt-1 text-[11px] text-slate-500">{i.photos.length} photo(s) enregistrée(s) dans le dossier.</p>}
      </div>
    </div>
  );
}

/** Contrat impossible à afficher : message clair et retour vers l'espace agence. */
function ContractError({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      <div role="alert" className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <FileWarning className="h-6 w-6" />
        </span>
        <p className="text-lg font-extrabold text-navy">{message}</p>
        <p className="text-sm text-slate-600">Ouvrez le contrat depuis la fiche d&apos;une réservation, dans l&apos;espace agence.</p>
        <a
          href={pageUrl("admin")}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white hover:bg-navy-soft"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;espace agence
        </a>
      </div>
    </div>
  );
}

export function ContractView() {
  const { token, user, isLoading } = useAuth();
  const id = useSyncExternalStore(
    () => () => {},
    () => Number(new URLSearchParams(window.location.search).get("id")) || 0,
    () => 0
  );
  // Vrai seulement côté navigateur : avant, l'identifiant n'est pas encore lu
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  // L'administration et le contrat sont en français
  const { lang } = useLang();
  useEffect(() => {
    if (lang !== "fr") setLang("fr", { persist: false }); // sans effacer le choix du client
  }, [lang]);

  const [data, setData] = useState<{ r: ReservationFromApi | null; insp: InspectionSet; error: string } | null>(null);

  useEffect(() => {
    if (isLoading || !id) return;
    if (!token || !isStaff(user?.role)) {
      window.location.replace(pageUrl("agence"));
      return;
    }
    let cancelled = false;
    Promise.all([fetchAllReservations(), fetchInspections(id)])
      .then(([all, insp]) => !cancelled && setData({ r: all.find((x) => x.id === id) ?? null, insp, error: "" }))
      .catch((e) => !cancelled && setData({ r: null, insp: {}, error: e instanceof Error ? e.message : "Erreur" }));
    return () => {
      cancelled = true;
    };
  }, [id, token, user, isLoading]);

  // Lien sans ?id= (ou invalide) : sinon le chargement tournerait indéfiniment
  if (mounted && !id) return <ContractError message="Aucune réservation indiquée." />;
  if (!data) return <LoadingBlock label="Préparation du contrat…" />;
  const { r, insp } = data;
  if (!r) return <ContractError message={data.error || "Réservation introuvable."} />;

  const days = daysBetween(r.start_date || "", r.end_date || "");
  const discount = parseFloat(String(r.discount_amount ?? 0)) || 0;
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-dvh bg-slate-100 py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 10mm; } @media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4">
        <p className="text-sm text-slate-600">Vérifiez le contrat puis imprimez-le ou enregistrez-le en PDF.</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white hover:bg-navy-soft"
        >
          <Printer className="h-4 w-4" /> Imprimer / PDF
        </button>
      </div>

      <article className="mx-auto flex max-w-[210mm] flex-col gap-4 bg-white p-6 text-navy shadow-xl sm:p-[12mm] print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-navy pb-4">
          <div>
            <Logo />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              {site.address}
              <br />
              Tél. / WhatsApp : {site.phoneDisplay} · {site.email}
              <br />
              RC n° {site.rc}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-text">Contrat de location</p>
            <p className="text-2xl font-extrabold">{reservationRef(r.id)}</p>
            <p className="text-[11px] text-slate-600">Établi le {today}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Box title="Le locataire">
            <Line label="Nom et prénom" value={r.full_name} />
            <Line label="Adresse" />
            <Line label="Téléphone" value={r.phone} />
            <Line label="Email" value={r.email || r.user_email} />
            <Line label="Date et lieu de naissance" value={r.birth_date ? formatDate(r.birth_date) : ""} />
            <Line label="N° de passeport / pièce" />
            <Line label="N° de permis" value={r.license_number} />
            <Line label="2ᵉ conducteur" />
          </Box>
          <Box title="Objet du contrat">
            <p className="mb-1 text-[11px] text-slate-500">Location temporaire du véhicule suivant :</p>
            <Line label="Marque / modèle" value={r.car_name} />
            <Line label="Catégorie" value={categoryLabel(r.car_category)} />
            <Line label="Immatriculation" value={r.car_plate} />
            <Line label="Boîte / places" value={[r.car_transmission && formatTransmission(r.car_transmission), r.car_seats && `${r.car_seats} places`].filter(Boolean).join(" · ")} />
            <Line label="Année" value={r.car_year} />
            <Line label="Kilométrage actuel" value={insp.depart?.mileage != null ? `${insp.depart.mileage.toLocaleString("fr-FR")} km` : ""} />
          </Box>
        </div>

        <Box title="Période de location">
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <div>
              <Line label="Début de location" value={`${formatDate(r.start_date, true)}${r.pickup_time ? ` à ${formatTime(r.pickup_time)}` : ""}`} />
              <Line label="Lieu de remise" value={[r.pickup_place, r.delivery_address && `(${r.delivery_address})`].filter(Boolean).join(" ") || undefined} />
            </div>
            <div>
              <Line label="Fin de location" value={`${formatDate(r.end_date, true)}${r.return_time ? ` à ${formatTime(r.return_time)}` : ""}`} />
              <Line label="Lieu de retour" value={r.return_place || r.pickup_place || undefined} />
            </div>
          </div>
          <Line label="Durée" value={`${days} jour${days > 1 ? "s" : ""}`} />
        </Box>

        <Box title="Règlement">
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <div>
              <Line label="Prix par jour" value={r.car_price_per_day ? formatPrice(r.car_price_per_day) : ""} />
              {discount > 0 && <Line label="Prix de base" value={formatPrice(r.base_price)} />}
              {discount > 0 && <Line label="Remise" value={`-${formatPrice(discount)} · ${r.discount_label ?? ""}`} />}
              <Line label="Somme à payer" value={formatPrice(r.total_price)} />
              <Line label="Acompte versé" />
              <Line label="Reste à payer" />
            </div>
            <div>
              <Line label="Moyen de paiement" value={r.payment_method ? paymentLabels[r.payment_method] : ""} />
              <Line label="Caution" value={`${DEPOSIT} · espèces ou virement`} />
              <Line label="Franchise" value={`${FRANCHISE} + 1 500 DA / jour d'immobilisation`} />
            </div>
          </div>
        </Box>

        <Box title="État des lieux">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InspectionBlock title="Au départ" i={insp.depart} />
            <InspectionBlock title="Au retour" i={insp.retour} compare={insp.depart} />
          </div>
        </Box>

        <section className="break-before-page rounded-xl border border-slate-300 p-4 print:break-before-page">
          <h2 className="mb-3 text-center text-[13px] font-extrabold uppercase tracking-[0.14em] text-navy">Conditions générales du contrat</h2>
          <div className="gap-6 text-[10.5px] leading-snug text-slate-700 sm:columns-2">
            {conditions.map((c) => (
              <div key={c.title} className="mb-2.5 break-inside-avoid">
                <h3 className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-navy underline underline-offset-2">{c.title}</h3>
                {c.text?.map((p) => (
                  <p key={p} className="mb-1">
                    {p}
                  </p>
                ))}
                {c.items && (
                  <ul className="list-disc space-y-0.5 pl-4">
                    {c.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] font-extrabold uppercase text-navy">
            Lisez bien les conditions générales de location avant de signer le contrat, et suivez nos consignes à la lettre. Merci.
          </p>
          <p className="mt-2 rounded-lg bg-slate-50 p-3 text-[10px] font-semibold leading-snug text-slate-700">{FINAL_NOTICE}</p>
        </section>

        <div className="grid grid-cols-1 gap-4 break-inside-avoid sm:grid-cols-2">
          {["Signature de la société (MYLOC.DZ)", "Date et signature du locataire (« lu et approuvé »)"].map((who) => (
            <div key={who} className="rounded-xl border border-slate-300 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{who}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] text-slate-500">
                <div>
                  Au départ
                  <div className="mt-1 h-16 rounded-lg border border-dashed border-slate-300" />
                </div>
                <div>
                  Au retour
                  <div className="mt-1 h-16 rounded-lg border border-dashed border-slate-300" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer className="flex items-end justify-between border-t border-slate-200 pt-3 text-[10.5px] text-slate-600">
          <p>
            Tél. : {site.phoneDisplay} · WhatsApp : {site.phoneDisplay}
            <br />
            Adresse : {site.address}
          </p>
          <Logo compact />
        </footer>
      </article>
    </div>
  );
}
