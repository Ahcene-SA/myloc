"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  FileText,
  CreditCard,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import { useAdmin } from "../AdminContext";
import { WhatsAppIcon } from "../FloatingWhatsApp";
import {
  apiImageUrl,
  fetchInspections,
  updateReservationStatus,
  zoneLabels,
  type InspectionSet,
  type InspectionType,
  type ReservationFromApi,
} from "@/lib/api";
import { pageUrl } from "@/lib/routes";
import { InspectionModal } from "./InspectionModal";
import { cn } from "@/lib/utils";
import {
  DiscountLine,
  StatusBadge,
  categoryLabel,
  daysBetween,
  formatDate,
  formatPrice,
  formatTime,
  labelClass,
  paymentLabels,
  reservationRef,
  splitCarName,
  todayIso,
} from "../client/shared";
import { Drawer, FormError, SourceBadge, clientWhatsApp, formatDateTime, phaseLabel, phaseOf, telLink } from "./ui";

type Status = NonNullable<ReservationFromApi["status"]>;

/** Message WhatsApp pré-rempli selon la décision prise. */
function whatsappText(r: ReservationFromApi, status: Status, note: string) {
  const first = (r.full_name || "").split(" ")[0];
  const what = `votre réservation ${reservationRef(r.id)} (${r.car_name}, du ${formatDate(r.start_date)} au ${formatDate(r.end_date)})`;
  const extra = note.trim() ? `\n\n${note.trim()}` : "";
  if (status === "confirmed")
    return `Bonjour ${first}, c'est MYLOC.DZ. Bonne nouvelle : ${what} est confirmée ✅. Montant : ${formatPrice(r.total_price)}.${extra}\n\nÀ bientôt !`;
  if (status === "rejected")
    return `Bonjour ${first}, c'est MYLOC.DZ. Nous sommes désolés, ${what} ne peut pas être acceptée.${extra}\n\nN'hésitez pas à nous écrire pour trouver une autre solution.`;
  if (status === "cancelled") return `Bonjour ${first}, c'est MYLOC.DZ. ${what[0].toUpperCase()}${what.slice(1)} a été annulée.${extra}`;
  return `Bonjour ${first}, c'est MYLOC.DZ, au sujet de ${what}.`;
}

export function ReservationDrawer() {
  const { reservations, openedReservationId, openReservation } = useAdmin();
  const r = reservations.find((x) => x.id === openedReservationId);
  if (!r) return null;
  // key : repart d'un état propre quand on ouvre une autre réservation
  return <DrawerBody key={r.id} r={r} onClose={() => openReservation(null)} />;
}

function DrawerBody({ r, onClose }: { r: ReservationFromApi; onClose: () => void }) {
  const { upsertReservation } = useAdmin();
  const [note, setNote] = useState(r.admin_note || "");
  const [busy, setBusy] = useState<Status | "note" | null>(null);
  const [err, setErr] = useState("");
  const [asking, setAsking] = useState<"rejected" | "cancelled" | null>(null);
  const [done, setDone] = useState<Status | null>(null);

  const { brand, model } = splitCarName(r.car_name);
  const days = daysBetween(r.start_date || "", r.end_date || "");
  const phase = phaseOf(r, todayIso());
  const email = r.email || r.user_email;

  const act = async (status: Status, onlyNote = false) => {
    setBusy(onlyNote ? "note" : status);
    setErr("");
    try {
      const updated = await updateReservationStatus(r.id, status, note.trim());
      upsertReservation({ ...r, ...(updated || {}), status, admin_note: note.trim() || null });
      setAsking(null);
      setDone(onlyNote ? null : status);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  };

  const noteChanged = note.trim() !== (r.admin_note || "").trim();

  return (
    <Drawer
      onClose={onClose}
      title={
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            {reservationRef(r.id)} · reçue {formatDateTime(r.created_at)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            {r.status === "confirmed" && (
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{phaseLabel[phase]}</span>
            )}
            <SourceBadge source={r.source} />
          </div>
        </div>
      }
    >
      {/* Véhicule */}
      <div className="bg-brand-mist flex items-center gap-5 px-6 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={apiImageUrl(r.car_image_url)} alt="" className="car-reflect h-20 w-32 object-contain" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{categoryLabel(r.car_category)}</p>
          <p className="text-xl font-extrabold uppercase text-navy">
            {brand} <span className="text-sky-gradient">{model}</span>
          </p>
          {r.car_price_per_day && <p className="text-sm text-muted">{formatPrice(r.car_price_per_day)} / jour</p>}
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6">
        {done && (
          <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="flex items-center gap-2 font-bold">
              <Check className="h-4 w-4" />
              {done === "confirmed" ? "Réservation confirmée." : done === "rejected" ? "Réservation refusée." : done === "cancelled" ? "Réservation annulée." : "Réservation remise en attente."}{" "}
              Le client le voit dans son espace.
            </p>
            <a
              href={clientWhatsApp(r.phone, whatsappText(r, done, note))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-whatsapp px-4 text-xs font-bold text-white hover:opacity-90"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Prévenir le client sur WhatsApp
            </a>
          </div>
        )}

        {/* Client */}
        <section>
          <p className={labelClass}>Client</p>
          <div className="rounded-2xl border border-line p-4">
            <p className="flex items-center gap-2 text-lg font-extrabold text-navy">
              <UserRound className="h-4 w-4 text-sky-text" />
              {r.full_name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {r.user_id ? "Compte client sur le site" : "Sans compte (réservation saisie par l'agence)"}
            </p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <a href={telLink(r.phone)} className="flex items-center gap-2 font-semibold text-navy hover:text-sky-text">
                <Phone className="h-4 w-4 text-muted" /> {r.phone}
              </a>
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2 break-all font-semibold text-navy hover:text-sky-text">
                  <Mail className="h-4 w-4 flex-shrink-0 text-muted" /> {email}
                </a>
              )}
              {r.license_number && (
                <p className="flex items-center gap-2 text-ink-soft">
                  <IdCard className="h-4 w-4 text-muted" /> Permis n° {r.license_number}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={clientWhatsApp(r.phone, whatsappText(r, "pending", ""))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-whatsapp px-4 text-xs font-bold text-white hover:opacity-90"
              >
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
              <a
                href={telLink(r.phone)}
                className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-line px-4 text-xs font-bold text-navy hover:border-navy"
              >
                <Phone className="h-4 w-4" /> Appeler
              </a>
            </div>
          </div>
        </section>

        {/* Période & lieux */}
        <section>
          <p className={labelClass}>Location</p>
          <div className="flex flex-col gap-3 rounded-2xl border border-line p-4 text-sm">
            <div className="flex gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-text" />
              <div>
                <p className="font-bold text-navy">
                  Départ : {formatDate(r.start_date, true)}
                  {r.pickup_time && ` · ${formatTime(r.pickup_time)}`}
                </p>
                <p className="font-bold text-navy">
                  Retour : {formatDate(r.end_date, true)}
                  {r.return_time && ` · ${formatTime(r.return_time)}`}
                </p>
                <p className="text-muted">
                  {days} jour{days > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-text" />
              <div className="text-ink-soft">
                <p>
                  <span className="text-muted">Retrait :</span> {r.pickup_place || "non précisé"}
                </p>
                {r.delivery_address && (
                  <p>
                    <span className="text-muted">Adresse de livraison :</span> {r.delivery_address}
                  </p>
                )}
                <p>
                  <span className="text-muted">Retour :</span> {r.return_place || "non précisé"}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-text" />
              <div>
                <p className="text-lg font-extrabold text-navy">{formatPrice(r.total_price)}</p>
                <DiscountLine r={r} />
                <p className="text-ink-soft">{r.payment_method ? paymentLabels[r.payment_method] : "Moyen de paiement non précisé"}</p>
              </div>
            </div>
          </div>
        </section>

        {(r.status === "confirmed" || r.status === "pending") && <InspectionSection r={r} />}

        {r.client_note && (
          <section>
            <p className={labelClass}>Message du client</p>
            <p className="whitespace-pre-line rounded-2xl bg-mist p-4 text-sm text-ink-soft">{r.client_note}</p>
          </section>
        )}

        {/* Message pour le client */}
        <section>
          <label htmlFor="admin-note" className={labelClass}>
            Message pour le client
          </label>
          <textarea
            id="admin-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Ex. : véhicule prêt à 10h à l'agence Alger Centre, pensez à votre permis."
            className="w-full resize-y rounded-2xl border-2 border-line bg-mist px-4 py-3 text-sm font-semibold text-navy outline-none placeholder:font-medium placeholder:text-muted/60 focus:border-sky focus:bg-white"
          />
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <MessageSquareText className="h-3.5 w-3.5" /> Visible par le client dans son espace.
          </p>
          {noteChanged && (
            <button
              type="button"
              onClick={() => act(r.status || "pending", true)}
              disabled={!!busy}
              className="mt-2 inline-flex h-10 items-center gap-2 rounded-full border-2 border-navy px-4 text-xs font-bold text-navy hover:bg-navy hover:text-white disabled:opacity-50"
            >
              {busy === "note" && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer le message
            </button>
          )}
        </section>

        <FormError message={err} />
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 border-t border-line bg-white p-6">
        {asking ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-navy">
              {asking === "rejected" ? "Refuser cette demande ?" : "Annuler cette réservation ?"} Vous pouvez expliquer pourquoi dans le
              message ci-dessus.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton tone="danger" busy={busy === asking} onClick={() => act(asking)} icon={X}>
                {asking === "rejected" ? "Oui, refuser" : "Oui, annuler"}
              </ActionButton>
              <ActionButton tone="ghost" onClick={() => setAsking(null)}>
                Retour
              </ActionButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {r.status === "pending" && (
              <>
                <ActionButton tone="success" busy={busy === "confirmed"} onClick={() => act("confirmed")} icon={Check}>
                  Confirmer
                </ActionButton>
                <ActionButton tone="danger-outline" onClick={() => setAsking("rejected")} icon={X}>
                  Refuser
                </ActionButton>
              </>
            )}
            {r.status === "confirmed" && phase !== "past" && (
              <ActionButton tone="danger-outline" onClick={() => setAsking("cancelled")} icon={X}>
                Annuler la réservation
              </ActionButton>
            )}
            {r.status === "confirmed" && phase === "past" && (
              <p className="text-sm text-muted">Location terminée.</p>
            )}
            {(r.status === "rejected" || r.status === "cancelled") && (
              <ActionButton tone="ghost" busy={busy === "confirmed"} onClick={() => act("confirmed")} icon={RotateCcw}>
                Réactiver et confirmer
              </ActionButton>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function ActionButton({
  tone,
  busy,
  onClick,
  icon: Icon,
  children,
}: {
  tone: "success" | "danger" | "danger-outline" | "ghost";
  busy?: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-colors disabled:opacity-60",
        tone === "success" && "bg-emerald-600 text-white hover:bg-emerald-700",
        tone === "danger" && "bg-red-600 text-white hover:bg-red-700",
        tone === "danger-outline" && "border-2 border-red-200 text-red-700 hover:border-red-600",
        tone === "ghost" && "border-2 border-line text-navy hover:border-navy"
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

/** États des lieux (départ / retour) et accès au contrat imprimable. */
function InspectionSection({ r }: { r: ReservationFromApi }) {
  const [state, setState] = useState<{ set: InspectionSet; loaded: boolean; error: string }>({ set: {}, loaded: false, error: "" });
  const [editing, setEditing] = useState<InspectionType | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInspections(r.id)
      .then((set) => !cancelled && setState({ set, loaded: true, error: "" }))
      .catch((e) => !cancelled && setState({ set: {}, loaded: true, error: e instanceof Error ? e.message : "Erreur" }));
    return () => {
      cancelled = true;
    };
  }, [r.id]);

  const { set } = state;
  const dep = set.depart;
  const ret = set.retour;
  const driven = dep?.mileage != null && ret?.mileage != null ? ret.mileage - dep.mileage : null;
  const newDamages = ret ? ret.damages.filter((d) => !dep?.damages.some((x) => x.zone === d.zone)) : [];

  const card = (type: InspectionType) => {
    const i = set[type];
    return (
      <button
        type="button"
        onClick={() => setEditing(type)}
        disabled={!state.loaded}
        className={cn(
          "flex flex-1 flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-colors hover:border-navy disabled:opacity-50",
          i ? "border-emerald-200 bg-emerald-50/60" : "border-dashed border-line"
        )}
      >
        <span className="flex items-center gap-2 text-sm font-extrabold uppercase text-navy">
          <ClipboardCheck className={cn("h-4 w-4", i ? "text-emerald-700" : "text-muted")} />
          {type === "depart" ? "Départ" : "Retour"}
        </span>
        {i ? (
          <span className="text-xs text-ink-soft">
            {i.mileage != null ? `${i.mileage.toLocaleString("fr-FR")} km` : "km —"} · carburant {i.fuel_level ?? "—"}/8 ·{" "}
            {i.damages.length} dommage{i.damages.length > 1 ? "s" : ""} · {i.photos.length} photo{i.photos.length > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-xs font-semibold text-sky-text">À faire à la {type === "depart" ? "remise" : "restitution"} des clés</span>
        )}
      </button>
    );
  };

  return (
    <section>
      <p className={labelClass}>État des lieux & contrat</p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          {card("depart")}
          {card("retour")}
        </div>
        {driven !== null && (
          <p className="text-sm font-semibold text-navy">
            {driven.toLocaleString("fr-FR")} km parcourus
            {dep?.fuel_level != null && ret?.fuel_level != null && ret.fuel_level < dep.fuel_level && (
              <span className="text-amber-700"> · carburant rendu {ret.fuel_level}/8 (départ {dep.fuel_level}/8)</span>
            )}
          </p>
        )}
        {newDamages.length > 0 && (
          <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Nouveaux dommages au retour : {newDamages.map((d) => zoneLabels[d.zone] + (d.note ? ` (${d.note})` : "")).join(", ")}
          </p>
        )}
        {state.error && <p className="text-sm font-semibold text-red-700">{state.error}</p>}
        <a
          href={`${pageUrl("contrat")}?id=${r.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 w-fit items-center gap-2 rounded-full bg-navy px-5 text-xs font-bold text-white hover:bg-navy-soft"
        >
          <FileText className="h-4 w-4" /> Contrat de location (PDF)
        </a>
      </div>
      {editing && (
        <InspectionModal
          r={r}
          type={editing}
          inspections={set}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setState({ set: next, loaded: true, error: "" });
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
