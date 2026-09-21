"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAdmin } from "./AdminContext";
import { useAuth } from "./AuthContext";
import {
  LayoutDashboard,
  Users,
  Car,
  CalendarCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export type AdminTab = "dashboard" | "clients" | "cars" | "reservations";

const menuItems: { label: string; tab: AdminTab; icon: React.ElementType }[] = [
  { label: "Dashboard", tab: "dashboard", icon: LayoutDashboard },
  { label: "Nos clients", tab: "clients", icon: Users },
  { label: "Véhicules", tab: "cars", icon: Car },
  { label: "Réservations", tab: "reservations", icon: CalendarCheck },
];

export function AdminSidebar() {
  const { activeTab, setActiveTab } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "./login.html";
    }
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 rounded-full bg-brand p-3 text-white shadow-lg md:hidden"
        aria-label="Ouvrir le menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-white shadow-2xl shadow-slate-200/50 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo area */}
          <div className="border-b border-slate-100 p-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="./images/logo.svg"
                alt="MYLOC.DZ"
                width={220}
                height={60}
                className="h-14 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveTab(item.tab);
                    setIsOpen(false);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all ${
                    isActive
                      ? "bg-brand text-white shadow-md shadow-brand/25"
                      : "text-slate-600 hover:bg-brand/10 hover:text-brand"
                  }`}
                >
                  <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                  <span className="font-semibold">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="border-t border-slate-100 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 font-semibold text-red-500 transition-all hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
