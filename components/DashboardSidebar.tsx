"use client";

import { useState, type ElementType } from "react";
import { Menu, X, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Logo } from "./Brand";
import { cn } from "@/lib/utils";
import { pageUrl } from "@/lib/routes";
import { LangSwitch, useLang } from "@/lib/i18n";

export interface SidebarItem<T extends string> {
  label: string;
  tab: T;
  icon: ElementType;
  /** Petit compteur (ex. réservations à traiter) */
  badge?: number;
}

interface DashboardSidebarProps<T extends string> {
  /** Petit titre sous le logo : "Espace client", "Administration"… */
  title: string;
  items: SidebarItem<T>[];
  activeTab: T;
  onSelect: (tab: T) => void;
  /** Affiche le bouton FR / عربي (espace client) */
  showLangSwitch?: boolean;
  /** Ligne sous le titre, ex. « Salim · Propriétaire » */
  subtitle?: string;
  /** Page après déconnexion (espace agence ou connexion client) */
  logoutTo?: "login" | "agence";
}

/** Barre latérale commune aux espaces client et admin. */
export function DashboardSidebar<T extends string>({
  title,
  items,
  activeTab,
  onSelect,
  showLangSwitch = false,
  subtitle,
  logoutTo = "login",
}: DashboardSidebarProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLang();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = pageUrl(logoutTo);
  };

  const footerLink =
    "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

  return (
    <>
      {/* Barre du haut (mobile) */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <a href="./" aria-label={t("Retour au site")}>
          <Logo compact />
        </a>
        <div className="flex items-center gap-2">
          {showLangSwitch && <LangSwitch className="h-8! min-w-8! rounded-md! border! px-2.5! text-xs! font-medium!" />}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            aria-label={isOpen ? t("Fermer le menu") : t("Ouvrir le menu")}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" onClick={() => setIsOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 w-64 border-e border-slate-200 bg-white transition-transform duration-200 md:translate-x-0 md:rtl:translate-x-0",
          isOpen ? "translate-x-0 shadow-xl md:shadow-none" : "-translate-x-full rtl:translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="px-4 pb-4 pt-18 md:pt-5">
            <a href="./" aria-label={t("Retour au site")} className="hidden md:block">
              <Logo />
            </a>
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 md:mt-4">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label={title}>
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
                    "relative flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-start text-sm font-medium transition-colors",
                    isActive ? "bg-sky-soft/70 text-navy" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {isActive && <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-sky" aria-hidden="true" />}
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-sky-text" : "text-slate-400")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {!!item.badge && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-medium tabular-nums text-amber-800"
                      aria-label={t("{n} à traiter", { n: item.badge })}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="space-y-0.5 border-t border-slate-200 p-3">
            {showLangSwitch && (
              <div className="hidden px-1 pb-2 md:block">
                <LangSwitch className="h-8! min-w-8! rounded-md! border! px-2.5! text-xs! font-medium!" />
              </div>
            )}
            <a href="./" className={footerLink}>
              <ArrowLeft className="flip-rtl h-4 w-4 text-slate-400" />
              {t("Retour au site")}
            </a>
            <button type="button" onClick={handleLogout} className={footerLink}>
              <LogOut className="flip-rtl h-4 w-4 text-slate-400" />
              {t("Se déconnecter")}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
