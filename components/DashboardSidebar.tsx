"use client";

import { useState, type ElementType } from "react";
import { Menu, X, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Logo } from "./Navbar";
import { Zellige } from "./Zellige";
import { cn } from "@/lib/utils";

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
    window.location.href = "./login.html";
  };

  return (
    <>
      {/* Barre du haut (mobile) */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between bg-cream/95 px-4 shadow-[0_1px_0_#E6D6BC] backdrop-blur md:hidden">
        <a href="./" aria-label="Retour au site">
          <Logo className="text-2xl" />
        </a>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sand"
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 overflow-hidden bg-ink text-sand transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Zellige size={64} color="#F3E9DA" className="opacity-[0.06]" />
        <div className="relative flex h-full flex-col">
          <div className="flex flex-col gap-1.5 px-7 pb-7 pt-20 md:pt-8">
            <a href="./" aria-label="Retour au site" className="hidden md:block">
              <Logo light className="text-[30px]" />
            </a>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-terra-light">{title}</span>
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
                    isActive ? "bg-terra text-white" : "text-[#C9CFD6] hover:bg-white/5 hover:text-sand"
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
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#C9CFD6] transition-colors hover:bg-white/5 hover:text-sand"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au site
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-terra-light transition-colors hover:bg-white/5"
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
