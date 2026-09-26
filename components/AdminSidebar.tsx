"use client";

import { useAdmin } from "./AdminContext";
import {
  LayoutDashboard,
  Users,
  Car,
  CalendarCheck,
} from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";

export type AdminTab = "dashboard" | "clients" | "cars" | "reservations";

const menuItems: { label: string; tab: AdminTab; icon: React.ElementType }[] = [
  { label: "Dashboard", tab: "dashboard", icon: LayoutDashboard },
  { label: "Nos clients", tab: "clients", icon: Users },
  { label: "Véhicules", tab: "cars", icon: Car },
  { label: "Réservations", tab: "reservations", icon: CalendarCheck },
];

export function AdminSidebar() {
  const { activeTab, setActiveTab } = useAdmin();
  return (
    <DashboardSidebar<AdminTab>
      title="Administration"
      items={menuItems}
      activeTab={activeTab}
      onSelect={setActiveTab}
    />
  );
}
