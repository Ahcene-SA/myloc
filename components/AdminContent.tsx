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
import { ProfilView } from "./client/ProfilView";

export function AdminContent() {
  const { activeTab } = useAdmin();

  return (
    <div className="mx-auto max-w-7xl">
      {activeTab === "dashboard" && <DashboardView />}
      {activeTab === "reservations" && <ReservationsView />}
      {activeTab === "planning" && <PlanningView />}
      {activeTab === "cars" && <CarsView />}
      {activeTab === "clients" && <ClientsView />}
      {activeTab === "promos" && <PromosView />}
      {activeTab === "compte" && (
        <div className="max-w-4xl">
          <ProfilView />
        </div>
      )}

      {/* Fenêtres ouvertes par-dessus n'importe quel onglet */}
      <ReservationDrawer />
      <NewReservationModal />
    </div>
  );
}
