"use client";

import { useState, type ElementType } from "react";
import { Menu, X, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Logo, PalmShadow } from "./Brand";
import { cn } from "@/lib/utils";
import { pageUrl } from "@/lib/routes";

export interface SidebarItem<T extends string> {
  label: string;
  tab: T;
  icon: ElementType;
}

interface DashboardSidebarProps<T extends string> {
  /** Petit titre sous le logo : "Espace client", "Administration"… */
  title: string;
  items: SidebarItem<T>[];
  activeTab: T;
  onSelect: (tab: T) => void;
}

/** Barre latérale commune aux espaces client et admin (thème Méditerranée). */
export function DashboardSidebar<T extends string>({ title, items, activeTab, onSelect }: DashboardSidebarProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = pageUrl("login");
  };

  return (
    <>
      {/* Barre du haut (mobile) */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between bg-white/95 px-4 shadow-[0_1px_0_var(--line)] backdrop-blur md:hidden">
        <a href="./" aria-label="Retour au site">
          <Logo compact />
        </a>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white"
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-30 bg-navy/40 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 overflow-hidden bg-navy text-white transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <PalmShadow className="-left-24 -top-6 w-[420px] opacity-[0.07] invert" />
        <div className="relative flex h-full flex-col">
          <div className="flex flex-col gap-1.5 px-7 pb-7 pt-20 md:pt-8">
            <a href="./" aria-label="Retour au site" className="hidden md:block">
              <Logo light />
            </a>
            <span className="mt-3 text-[11px] font-bold uppercase tracking-[0.24em] text-sky">{title}</span>
          </div>

          <nav className="flex-1 space-y-1 px-4" aria-label={title}>
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => {
                    onSelect(item.tab);
                    setIsOpen(false);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-semibold transition-colors",
                    isActive ? "bg-sky text-navy" : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="space-y-1 border-t border-white/10 p-4">
            <a
              href="./"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au site
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-sky transition-colors hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
