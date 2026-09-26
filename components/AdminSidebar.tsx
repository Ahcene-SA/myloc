"use client";

import { useAdmin } from "./AdminContext";
import { LayoutDashboard, Users, Car, CalendarCheck, CalendarRange, UserCog, BadgePercent } from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";

export type AdminTab = "dashboard" | "reservations" | "planning" | "cars" | "clients" | "promos" | "compte";

export function AdminSidebar() {
  const { activeTab, setActiveTab, reservations } = useAdmin();
  const pending = reservations.filter((r) => r.status === "pending").length;

  const menuItems: { label: string; tab: AdminTab; icon: React.ElementType; badge?: number }[] = [
    { label: "Tableau de bord", tab: "dashboard", icon: LayoutDashboard },
    { label: "Réservations", tab: "reservations", icon: CalendarCheck, badge: pending },
    { label: "Planning", tab: "planning", icon: CalendarRange },
    { label: "Véhicules", tab: "cars", icon: Car },
    { label: "Clients", tab: "clients", icon: Users },
    { label: "Promos & remises", tab: "promos", icon: BadgePercent },
    { label: "Mon compte", tab: "compte", icon: UserCog },
  ];

  return (
    <DashboardSidebar<AdminTab> title="Administration" items={menuItems} activeTab={activeTab} onSelect={setActiveTab} />
  );
}
