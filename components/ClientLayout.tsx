"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ClientProvider } from "./ClientContext";
import { ClientSidebar } from "./ClientSidebar";
import { ClientContent } from "./ClientContent";
import { useAuth } from "./AuthContext";
import { LoadingBlock } from "./client/shared";
import { pageUrl } from "@/lib/routes";
import { isStaff } from "@/lib/api";
import { useLang } from "@/lib/i18n";

export function ClientLayout() {
  const { token, user, isLoading } = useAuth();
  const { t } = useLang();
  // true seulement côté navigateur (évite un décalage avec la page pré-générée)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Accès réservé aux clients connectés
  useEffect(() => {
    if (!mounted || isLoading) return;
    if (!token) window.location.replace(pageUrl("login"));
    else if (isStaff(user?.role)) window.location.replace(pageUrl("admin"));
  }, [mounted, isLoading, token, user]);

  if (!mounted || isLoading || !token || isStaff(user?.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingBlock label={t("Vérification de votre session…")} />
      </div>
    );
  }

  return (
    <ClientProvider>
      <div className="min-h-screen bg-slate-50">
        <ClientSidebar />
        <main className="md:ps-64">
          <div className="px-4 pb-10 pt-20 sm:px-6 md:pt-8 lg:px-10">
            <ClientContent />
          </div>
        </main>
      </div>
    </ClientProvider>
  );
}
