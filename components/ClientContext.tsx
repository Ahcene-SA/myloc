"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import type { ClientTab } from "./ClientSidebar";
import { fetchCars, fetchMyReservations, type CarFromApi, type ReservationFromApi } from "@/lib/api";

interface ClientContextValue {
  activeTab: ClientTab;
  setActiveTab: (tab: ClientTab) => void;
  /** Voiture présélectionnée quand on passe d'un écran à « Réserver ». */
  preselectedCarId: number | null;
  goReserve: (carId?: number) => void;

  cars: CarFromApi[];
  reservations: ReservationFromApi[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  /** Remplace une réservation dans la liste (après annulation, par exemple). */
  upsertReservation: (r: ReservationFromApi) => void;
}

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabState] = useState<ClientTab>("accueil");
  const [preselectedCarId, setPreselectedCarId] = useState<number | null>(null);
  const [cars, setCars] = useState<CarFromApi[]>([]);
  const [reservations, setReservations] = useState<ReservationFromApi[]>([]);
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
      setError(e instanceof Error ? e.message : "Impossible de joindre le serveur.");
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
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Impossible de joindre le serveur."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveTab = (tab: ClientTab) => {
    setActiveTabState(tab);
    if (tab !== "reserver") setPreselectedCarId(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goReserve = (carId?: number) => {
    setPreselectedCarId(carId ?? null);
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
      value={{ activeTab, setActiveTab, preselectedCarId, goReserve, cars, reservations, loading, error, refresh, upsertReservation }}
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
