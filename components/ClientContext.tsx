"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { ClientTab } from "./ClientSidebar";
import { fetchCars, fetchMyReservations, type CarFromApi, type ReservationFromApi } from "@/lib/api";
import { takeBookingIntent, type BookingIntent } from "@/lib/booking";
import { t } from "@/lib/i18n";

// Onglet et voiture présélectionnée, gardés pour la session de l'onglet : changer de
// langue ré-affiche toute l'application, on retrouve ainsi l'écran où l'on était.
const NAV_KEY = "myloc_client_nav";
const TABS: ClientTab[] = ["accueil", "reserver", "reservations", "paiements", "profil"];

function readNav(): { tab: ClientTab; carId: number | null } | null {
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { tab?: ClientTab; carId?: number | null };
    if (!data.tab || !TABS.includes(data.tab)) return null;
    return { tab: data.tab, carId: typeof data.carId === "number" ? data.carId : null };
  } catch {
    return null;
  }
}

function saveNav(tab: ClientTab, carId: number | null) {
  try {
    sessionStorage.setItem(NAV_KEY, JSON.stringify({ tab, carId }));
  } catch {
    /* navigation privée */
  }
}

interface ClientContextValue {
  activeTab: ClientTab;
  setActiveTab: (tab: ClientTab) => void;
  /** Voiture présélectionnée quand on passe d'un écran à « Réserver ». */
  preselectedCarId: number | null;
  goReserve: (carId?: number) => void;
  /** Dates et lieux choisis sur l'accueil avant la connexion */
  bookingPrefill: BookingIntent | null;

  cars: CarFromApi[];
  reservations: ReservationFromApi[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  /** Remplace une réservation dans la liste (après annulation, par exemple). */
  upsertReservation: (r: ReservationFromApi) => void;
  /** Réponse de l'agence arrivée pendant que l'espace est ouvert (bandeau à afficher). */
  statusNotice: ReservationFromApi | null;
  dismissStatusNotice: () => void;
}

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  // Le fournisseur n'est rendu que côté navigateur (voir ClientLayout) : lecture directe possible.
  const [bookingPrefill, setBookingPrefill] = useState<BookingIntent | null>(() => takeBookingIntent());
  const [savedNav] = useState(() => (bookingPrefill ? null : readNav()));
  const [activeTab, setActiveTabState] = useState<ClientTab>(bookingPrefill ? "reserver" : savedNav?.tab ?? "accueil");
  const [preselectedCarId, setPreselectedCarId] = useState<number | null>(bookingPrefill?.carId ?? savedNav?.carId ?? null);

  useEffect(() => saveNav(activeTab, preselectedCarId), [activeTab, preselectedCarId]);
  const [cars, setCars] = useState<CarFromApi[]>([]);
  const [reservations, setReservations] = useState<ReservationFromApi[]>([]);
  // Dernière liste connue, lue par la vérification en direct pour repérer un changement de statut
  const reservationsRef = useRef<ReservationFromApi[]>([]);
  useEffect(() => {
    reservationsRef.current = reservations;
  }, [reservations]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, r] = await Promise.all([fetchCars(), fetchMyReservations()]);
      setCars(c.filter((car) => car.status === "available"));
      setReservations(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Impossible de joindre le serveur."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Premier chargement (les setState sont faits dans les callbacks de la promesse)
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCars(), fetchMyReservations()])
      .then(([c, r]) => {
        if (cancelled) return;
        setCars(c.filter((car) => car.status === "available"));
        setReservations(r);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : t("Impossible de joindre le serveur.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Mise à jour en direct : la réponse de l'agence apparaît sans recharger la page
  const [statusNotice, setStatusNotice] = useState<ReservationFromApi | null>(null);
  const dismissStatusNotice = useCallback(() => setStatusNotice(null), []);
  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const check = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const fresh = await fetchMyReservations();
        if (cancelled) return;
        const before = new Map(reservationsRef.current.map((r) => [r.id, r.status]));
        const changed = fresh.find((r) => before.has(r.id) && before.get(r.id) !== r.status && r.status !== "pending");
        reservationsRef.current = fresh;
        setReservations(fresh);
        if (changed) setStatusNotice(changed);
      } catch {
        /* réseau coupé ou session expirée : géré au prochain tour / par l'API */
      } finally {
        busy = false;
      }
    };
    const timer = window.setInterval(check, 15_000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    // Safari : page restaurée depuis le cache « précédent/suivant » ou réseau revenu
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, []);

  const setActiveTab = (tab: ClientTab) => {
    setActiveTabState(tab);
    if (tab !== "reserver") setPreselectedCarId(null);
    setBookingPrefill(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goReserve = (carId?: number) => {
    setPreselectedCarId(carId ?? null);
    setBookingPrefill(null);
    setActiveTabState("reserver");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const upsertReservation = (r: ReservationFromApi) =>
    setReservations((list) => {
      const i = list.findIndex((x) => x.id === r.id);
      if (i === -1) return [r, ...list];
      const copy = [...list];
      copy[i] = { ...copy[i], ...r };
      return copy;
    });

  return (
    <ClientContext.Provider
      value={{
        activeTab,
        setActiveTab,
        preselectedCarId,
        goReserve,
        bookingPrefill,
        cars,
        reservations,
        loading,
        error,
        refresh,
        upsertReservation,
        statusNotice,
        dismissStatusNotice,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within ClientProvider");
  return ctx;
}
