"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AdminTab } from "./AdminSidebar";
import {
  fetchAllCars,
  fetchAllReservations,
  fetchClients,
  type CarFromApi,
  type ClientFromApi,
  type ReservationFromApi,
} from "@/lib/api";

export type ReservationFilter = "pending" | "upcoming" | "ongoing" | "past" | "closed" | "all";

/** Pré-remplissage de la fenêtre « Nouvelle réservation » (depuis le planning, par exemple). */
export interface NewReservationPrefill {
  carId?: number;
  startDate?: string;
}

interface AdminContextValue {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;

  cars: CarFromApi[];
  reservations: ReservationFromApi[];
  clients: ClientFromApi[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  upsertReservation: (r: ReservationFromApi) => void;
  upsertCar: (c: CarFromApi) => void;
  removeCar: (id: number) => void;

  /** Réservation ouverte dans le panneau de détail */
  openedReservationId: number | null;
  openReservation: (id: number | null) => void;
  /** Aller à la liste des réservations avec un filtre / une recherche */
  reservationFilter: ReservationFilter;
  setReservationFilter: (f: ReservationFilter) => void;
  reservationSearch: string;
  setReservationSearch: (q: string) => void;
  showReservations: (filter: ReservationFilter, search?: string) => void;

  newReservation: NewReservationPrefill | null;
  startNewReservation: (prefill?: NewReservationPrefill) => void;
  closeNewReservation: () => void;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

async function loadAll() {
  const [cars, reservations, clients] = await Promise.all([fetchAllCars(), fetchAllReservations(), fetchClients()]);
  return { cars, reservations, clients };
}

function message(e: unknown) {
  return e instanceof Error ? e.message : "Impossible de joindre le serveur.";
}

function upsert<T extends { id: number }>(list: T[], item: T, prepend = true): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return prepend ? [item, ...list] : [...list, item];
  const copy = [...list];
  copy[i] = { ...copy[i], ...item };
  return copy;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabState] = useState<AdminTab>("dashboard");
  const [cars, setCars] = useState<CarFromApi[]>([]);
  const [reservations, setReservations] = useState<ReservationFromApi[]>([]);
  const [clients, setClients] = useState<ClientFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openedReservationId, setOpenedReservationId] = useState<number | null>(null);
  const [reservationFilter, setReservationFilter] = useState<ReservationFilter>("pending");
  const [reservationSearch, setReservationSearch] = useState("");
  const [newReservation, setNewReservation] = useState<NewReservationPrefill | null>(null);

  const apply = (d: Awaited<ReturnType<typeof loadAll>>) => {
    setCars(d.cars);
    setReservations(d.reservations);
    setClients(d.clients);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      apply(await loadAll());
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Premier chargement (setState uniquement dans les callbacks de la promesse)
  useEffect(() => {
    let cancelled = false;
    loadAll()
      .then((d) => !cancelled && apply(d))
      .catch((e) => !cancelled && setError(message(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollTop = () => typeof window !== "undefined" && window.scrollTo({ top: 0, behavior: "smooth" });

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    scrollTop();
  };

  const showReservations = (filter: ReservationFilter, search = "") => {
    setReservationFilter(filter);
    setReservationSearch(search);
    setActiveTabState("reservations");
    scrollTop();
  };

  return (
    <AdminContext.Provider
      value={{
        activeTab,
        setActiveTab,
        cars,
        reservations,
        clients,
        loading,
        error,
        refresh,
        upsertReservation: (r) => setReservations((l) => upsert(l, r)),
        upsertCar: (c) => setCars((l) => upsert(l, c)),
        removeCar: (id) => setCars((l) => l.filter((c) => c.id !== id)),
        openedReservationId,
        openReservation: setOpenedReservationId,
        reservationFilter,
        setReservationFilter,
        reservationSearch,
        setReservationSearch,
        showReservations,
        newReservation,
        startNewReservation: (prefill = {}) => setNewReservation(prefill),
        closeNewReservation: () => setNewReservation(null),
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
