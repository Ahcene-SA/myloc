"use client";

import { useClient } from "./ClientContext";
import {
  User,
  Calendar,
  PlusCircle,
  Home,
  CreditCard,
  Settings,
} from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";


export type ClientTab =
  | "accueil"
  | "profil"
  | "reservations"
  | "reserver"
  | "paiements"
  | "parametres";

const menuItems: { label: string; tab: ClientTab; icon: React.ElementType }[] = [
  { label: "Accueil", tab: "accueil", icon: Home },
  { label: "Mon profil", tab: "profil", icon: User },
  { label: "Mes réservations", tab: "reservations", icon: Calendar },
  { label: "Réserver", tab: "reserver", icon: PlusCircle },
  { label: "Paiements", tab: "paiements", icon: CreditCard },
  { label: "Paramètres", tab: "parametres", icon: Settings },
];

export function ClientSidebar() {
  const { activeTab, setActiveTab } = useClient();
  return (
    <DashboardSidebar<ClientTab>
      title="Espace client"
      items={menuItems}
      activeTab={activeTab}
      onSelect={setActiveTab}
    />
  );
}
