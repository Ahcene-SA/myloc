"use client";

import { useClient } from "./ClientContext";
import { AccueilView } from "./client/AccueilView";
import { ReserverView } from "./client/ReserverView";
import { ReservationsView } from "./client/ReservationsView";
import { PaiementsView } from "./client/PaiementsView";
import { ProfilView } from "./client/ProfilView";

export function ClientContent() {
  const { activeTab, preselectedCarId } = useClient();

  return (
    <div className="mx-auto max-w-6xl">
      {activeTab === "accueil" && <AccueilView />}
      {/* key : repart d'un formulaire neuf à chaque nouvelle réservation */}
      {activeTab === "reserver" && <ReserverView key={`reserver-${preselectedCarId ?? "all"}`} />}
      {activeTab === "reservations" && <ReservationsView />}
      {activeTab === "paiements" && <PaiementsView />}
      {activeTab === "profil" && <ProfilView />}
    </div>
  );
}
