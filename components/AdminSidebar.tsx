"use client";

import { useAdmin } from "./AdminContext";
import { useAuth } from "./AuthContext";
import {
  LayoutDashboard,
  Users,
  Car,
  CalendarCheck,
  CalendarRange,
  UserCog,
  BadgePercent,
  ShieldCheck,
  ScrollText,
} from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { isOwner } from "@/lib/api";

export type AdminTab =
  | "dashboard"
  | "reservations"
  | "planning"
  | "cars"
  | "clients"
  | "promos"
  | "equipe"
  | "journal"
  | "compte";

/** Onglets réservés au propriétaire. */
export const OWNER_TABS: AdminTab[] = ["promos", "equipe", "journal"];

export function AdminSidebar() {
  const { activeTab, setActiveTab, reservations } = useAdmin();
  const { user } = useAuth();
  const owner = isOwner(user?.role);
  const pending = reservations.filter((r) => r.status === "pending").length;

  const menuItems: { label: string; tab: AdminTab; icon: React.ElementType; badge?: number }[] = [
    { label: "Tableau de bord", tab: "dashboard", icon: LayoutDashboard },
    { label: "Réservations", tab: "reservations", icon: CalendarCheck, badge: pending },
    { label: "Planning", tab: "planning", icon: CalendarRange },
    { label: "Véhicules", tab: "cars", icon: Car },
    { label: "Clients", tab: "clients", icon: Users },
    { label: "Promos & remises", tab: "promos", icon: BadgePercent },
    { label: "Équipe", tab: "equipe", icon: ShieldCheck },
    { label: "Journal d'activité", tab: "journal", icon: ScrollText },
    { label: "Mon compte", tab: "compte", icon: UserCog },
  ];

  return (
    <DashboardSidebar<AdminTab>
      title="Espace agence"
      subtitle={user ? `${user.full_name.split(" ")[0]} · ${owner ? "Propriétaire" : "Employé"}` : undefined}
      items={menuItems.filter((m) => owner || !OWNER_TABS.includes(m.tab))}
      activeTab={activeTab}
      onSelect={setActiveTab}
      logoutTo="agence"
    />
  );
}
