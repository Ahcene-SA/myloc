"use client";

import { useClient } from "./ClientContext";
import { Home, PlusCircle, CalendarRange, Wallet, UserRound } from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { useLang } from "@/lib/i18n";

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
  const { t } = useLang();
  // Libellés traduits au rendu (la langue peut changer à tout moment)
  const items = menuItems.map((item) => ({ ...item, label: t(item.label) }));
  return (
    <DashboardSidebar<ClientTab>
      title={t("Espace client")}
      items={items}
      activeTab={activeTab}
      onSelect={setActiveTab}
      showLangSwitch
    />
  );
}
