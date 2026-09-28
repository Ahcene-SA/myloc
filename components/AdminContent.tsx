"use client";

import { useAdmin } from "./AdminContext";
import { DashboardView } from "./admin/DashboardView";
import { ReservationsView } from "./admin/ReservationsView";
import { PlanningView } from "./admin/PlanningView";
import { CarsView } from "./admin/CarsView";
import { ClientsView } from "./admin/ClientsView";
import { PromosView } from "./admin/PromosView";
import { ReservationDrawer } from "./admin/ReservationDrawer";
import { NewReservationModal } from "./admin/NewReservationModal";
import { TeamView } from "./admin/TeamView";
import { AuditView } from "./admin/AuditView";
import { AccountView } from "./admin/AccountView";
import { OWNER_TABS } from "./AdminSidebar";
import { useAuth } from "./AuthContext";
import { isOwner } from "@/lib/api";

export function AdminContent() {
  const { activeTab: tab } = useAdmin();
  const { user } = useAuth();
  // Un employé ne peut pas ouvrir un onglet du propriétaire (même en bricolant l'état)
  const activeTab = !isOwner(user?.role) && OWNER_TABS.includes(tab) ? "dashboard" : tab;

  return (
    <div className="mx-auto max-w-7xl">
      {activeTab === "dashboard" && <DashboardView />}
      {activeTab === "reservations" && <ReservationsView />}
      {activeTab === "planning" && <PlanningView />}
      {activeTab === "cars" && <CarsView />}
      {activeTab === "clients" && <ClientsView />}
      {activeTab === "promos" && <PromosView />}
      {activeTab === "equipe" && <TeamView />}
      {activeTab === "journal" && <AuditView />}
      {activeTab === "compte" && <AccountView />}

      {/* Fenêtres ouvertes par-dessus n'importe quel onglet */}
      <ReservationDrawer />
      <NewReservationModal />
    </div>
  );
}
