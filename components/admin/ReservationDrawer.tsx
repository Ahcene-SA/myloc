"use client";

import { useEffect, useState } from "react";
import {
  Cake,
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
import { useAuth } from "../AuthContext";
import { auditDetail, auditLabel, toneClass } from "./auditLabels";
import {
  apiImageUrl,
  fetchAudit,
  fetchInspections,
  isOwner,
  type AuditEntry,
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
  inputClass,
  secondaryBtn,
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
  const { user } = useAuth();
  const owner = isOwner(user?.role);
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
          <p className="text-xs font-medium text-slate-500">
            {reservationRef(r.id)} · reçue {formatDateTime(r.created_at)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            {r.status === "confirmed" && (
              <span className="text-xs text-slate-500">{phaseLabel[phase]}</span>
            )}
            <SourceBadge source={r.source} />
          </div>
        </div>
      }
    >
      {/* Véhicule */}
      <div className="flex items-center gap-4 border-b border-slate-200 px-5 py-4">
        <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={apiImageUrl(r.car_image_url)} alt="" className="max-h-12 w-auto object-contain" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{categoryLabel(r.car_category)}</p>
          <p className="text-base font-semibold text-slate-900">
            {brand} {model}
          </p>
          {r.car_price_per_day && <p className="text-sm text-slate-500">{formatPrice(r.car_price_per_day)} / jour</p>}
        </div>
      </div>

      <div className="flex flex-col gap-6 p-5">
        {done && (
          <div className="flex flex-col gap-3 rounded-md border border-emerald-600/20 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
            <p className="flex items-center gap-2 font-medium">
              <Check className="h-4 w-4" />
              {done === "confirmed" ? "Réservation confirmée." : done === "rejected" ? "Réservation refusée." : done === "cancelled" ? "Réservation annulée." : "Réservation remise en attente."}{" "}
              Le client le voit dans son espace{done !== "pending" && r.email ? " et reçoit un e-mail" : ""}.
            </p>
            <a
              href={clientWhatsApp(r.phone, whatsappText(r, done, note))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-whatsapp px-3.5 text-sm font-medium text-white hover:opacity-90"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Prévenir le client sur WhatsApp
            </a>
          </div>
        )}

        {/* Client */}
        <section>
          <p className={sectionLabel}>Client</p>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <UserRound className="h-4 w-4 text-slate-400" />
              {r.full_name}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {r.user_id ? "Compte client sur le site" : "Sans compte (réservation saisie par l'agence)"}
            </p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <a href={telLink(r.phone)} className="flex items-center gap-2 text-slate-900 hover:text-sky-text">
                <Phone className="h-4 w-4 text-slate-400" /> {r.phone}
              </a>
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2 break-all text-slate-900 hover:text-sky-text">
                  <Mail className="h-4 w-4 flex-shrink-0 text-slate-400" /> {email}
                </a>
              )}
              {r.birth_date && (
                <p className="flex items-center gap-2 text-slate-600">
                  <Cake className="h-4 w-4 text-slate-400" /> Né(e) le {formatDate(r.birth_date)}
                </p>
              )}
              {r.license_number && (
                <p className="flex items-center gap-2 text-slate-600">
                  <IdCard className="h-4 w-4 text-slate-400" /> Permis n° {r.license_number}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={clientWhatsApp(r.phone, whatsappText(r, "pending", ""))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-whatsapp px-3.5 text-sm font-medium text-white hover:opacity-90"
              >
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
              <a
                href={telLink(r.phone)}
                className={secondaryBtn}
              >
                <Phone className="h-4 w-4" /> Appeler
              </a>
            </div>
          </div>
        </section>

        {/* Période & lieux */}
        <section>
          <p className={sectionLabel}>Location</p>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 text-sm">
            <div className="flex gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">
                  Départ : {formatDate(r.start_date, true)}
                  {r.pickup_time && ` · ${formatTime(r.pickup_time)}`}
                </p>
                <p className="font-medium text-slate-900">
                  Retour : {formatDate(r.end_date, true)}
                  {r.return_time && ` · ${formatTime(r.return_time)}`}
                </p>
                <p className="text-slate-500">
                  {days} jour{days > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <div className="text-slate-600">
                <p>
                  <span className="text-slate-500">Retrait :</span> {r.pickup_place || "non précisé"}
                </p>
                {r.delivery_address && (
                  <p>
                    <span className="text-slate-500">Adresse de livraison :</span> {r.delivery_address}
                  </p>
                )}
                <p>
                  <span className="text-slate-500">Retour :</span> {r.return_place || "non précisé"}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <div>
                <p className="text-base font-semibold tabular-nums text-slate-900">{formatPrice(r.total_price)}</p>
                <DiscountLine r={r} />
                <p className="text-slate-600">{r.payment_method ? paymentLabels[r.payment_method] : "Moyen de paiement non précisé"}</p>
              </div>
            </div>
          </div>
        </section>

        {(r.status === "confirmed" || r.status === "pending") && <InspectionSection r={r} />}

        {r.client_note && (
          <section>
            <p className={sectionLabel}>Message du client</p>
            <p className="whitespace-pre-line rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{r.client_note}</p>
          </section>
        )}

        {/* Message pour le client */}
        <section>
          <label htmlFor="admin-note" className={cn(sectionLabel, "block")}>
            Message pour le client
          </label>
          <textarea
            id="admin-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Ex. : véhicule prêt à 10h à l'agence de Birkhadem, pensez à votre permis."
            className={cn(inputClass, "h-auto resize-y py-2")}
          />
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <MessageSquareText className="h-3.5 w-3.5" /> Visible par le client dans son espace.
          </p>
          {noteChanged && (
            <button
              type="button"
              onClick={() => act(r.status || "pending", true)}
              disabled={!!busy}
              className={cn(secondaryBtn, "mt-2")}
            >
              {busy === "note" && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer le message
            </button>
          )}
        </section>

        <History key={`${r.id}-${r.status}-${r.admin_note ?? ""}`} reservationId={r.id} />

        <FormError message={err} />
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-5 pb-[calc(env(safe-area-inset-bottom)+0.875rem)] pt-3.5">
        {asking ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-900">
              {asking === "rejected" ? "Refuser cette demande ?" : "Annuler cette réservation ?"}{" "}
              {asking === "cancelled" && r.status === "confirmed" && !owner
                ? "Indiquez obligatoirement le motif dans le message ci-dessus."
                : "Vous pouvez expliquer pourquoi dans le message ci-dessus."}
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
              <p className="text-sm text-slate-500">Location terminée.</p>
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

const sectionLabel = "mb-2 text-sm font-semibold text-slate-900";

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
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium shadow-sm transition-colors disabled:opacity-60",
        tone === "success" && "bg-navy text-white hover:bg-navy-soft",
        tone === "danger" && "bg-red-600 text-white hover:bg-red-700",
        tone === "danger-outline" && "border border-slate-300 bg-white text-red-700 hover:bg-red-50",
        tone === "ghost" && "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
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
          "flex flex-1 flex-col items-start gap-1 rounded-md border p-3 text-start transition-colors hover:bg-slate-50 disabled:opacity-50",
          i ? "border-slate-200" : "border-dashed border-slate-300"
        )}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ClipboardCheck className={cn("h-4 w-4", i ? "text-emerald-600" : "text-slate-400")} />
          {type === "depart" ? "Départ" : "Retour"}
        </span>
        {i ? (
          <span className="text-xs text-slate-600">
            {i.mileage != null ? `${i.mileage.toLocaleString("fr-FR")} km` : "km —"} · carburant {i.fuel_level ?? "—"}/8 ·{" "}
            {i.damages.length} dommage{i.damages.length > 1 ? "s" : ""} · {i.photos.length} photo{i.photos.length > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-xs text-sky-text">À faire à la {type === "depart" ? "remise" : "restitution"} des clés</span>
        )}
      </button>
    );
  };

  return (
    <section>
      <p className={sectionLabel}>État des lieux & contrat</p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          {card("depart")}
          {card("retour")}
        </div>
        {driven !== null && (
          <p className="text-sm text-slate-900">
            {driven.toLocaleString("fr-FR")} km parcourus
            {dep?.fuel_level != null && ret?.fuel_level != null && ret.fuel_level < dep.fuel_level && (
              <span className="text-amber-700"> · carburant rendu {ret.fuel_level}/8 (départ {dep.fuel_level}/8)</span>
            )}
          </p>
        )}
        {newDamages.length > 0 && (
          <p className="rounded-md border border-amber-600/20 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            Nouveaux dommages au retour : {newDamages.map((d) => zoneLabels[d.zone] + (d.note ? ` (${d.note})` : "")).join(", ")}
          </p>
        )}
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        <a
          href={`${pageUrl("contrat")}?id=${r.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(secondaryBtn, "w-fit")}
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

/** Historique de la réservation : qui l'a confirmée, annulée, etc. */
function History({ reservationId }: { reservationId: number }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAudit({ entity_type: "reservation", entity_id: reservationId, limit: 20 })
      .then((r) => !cancelled && setEntries(r.entries))
      .catch(() => !cancelled && setEntries([]));
    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  if (!entries || entries.length === 0) return null;
  return (
    <section>
      <p className={sectionLabel}>Historique</p>
      <ol className="flex flex-col gap-2.5 border-s border-slate-200 ps-4">
        {entries.map((e) => {
          const meta = auditLabel(e.action);
          const detail = auditDetail(e);
          return (
            <li key={e.id} className="text-sm">
              <span className={cn("me-2 rounded-full px-2 py-0.5 text-xs font-medium", toneClass[meta.tone])}>{meta.label}</span>
              <span className="font-medium text-slate-900">{e.user_name || "Système"}</span>
              <span className="text-slate-500"> · {formatDateTime(e.created_at)}</span>
              {detail && e.action !== "reservation_created" && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
