"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AdminProvider } from "./AdminContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminContent } from "./AdminContent";
import { useAuth } from "./AuthContext";
import { LoadingBlock } from "./client/shared";
import { pageUrl } from "@/lib/routes";
import { setLang, useLang } from "@/lib/i18n";

export function AdminLayout() {
  const { token, user, isLoading } = useAuth();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // L'administration et le contrat sont en français
  const { lang } = useLang();
  useEffect(() => {
    if (lang !== "fr") setLang("fr");
  }, [lang]);

  // Accès réservé aux administrateurs
  useEffect(() => {
    if (!mounted || isLoading) return;
    if (!token) window.location.replace(pageUrl("login"));
    else if (user && user.role !== "admin") window.location.replace(pageUrl("client"));
  }, [mounted, isLoading, token, user]);

  if (!mounted || isLoading || !token || user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist">
        <LoadingBlock label="Vérification de votre session…" />
      </div>
    );
  }

  return (
    <AdminProvider>
      <div className="min-h-screen bg-mist">
        <AdminSidebar />
        <main className="transition-all duration-300 md:pl-72">
          <div className="p-4 pt-20 sm:p-6 sm:pt-22 md:pt-8 lg:p-10">
            <AdminContent />
          </div>
        </main>
      </div>
    </AdminProvider>
  );
}
