"use client";

import { useClient } from "./ClientContext";
import { Home, PlusCircle, CalendarRange, Wallet, UserRound } from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";

export type ClientTab = "accueil" | "reserver" | "reservations" | "paiements" | "profil";

const menuItems: { label: string; tab: ClientTab; icon: React.ElementType }[] = [
  { label: "Accueil", tab: "accueil", icon: Home },
  { label: "Réserver", tab: "reserver", icon: PlusCircle },
  { label: "Mes réservations", tab: "reservations", icon: CalendarRange },
  { label: "Paiements", tab: "paiements", icon: Wallet },
  { label: "Mon profil", tab: "profil", icon: UserRound },
];

export function ClientSidebar() {
  const { activeTab, setActiveTab } = useClient();
  return <DashboardSidebar<ClientTab> title="Espace client" items={menuItems} activeTab={activeTab} onSelect={setActiveTab} />;
}
