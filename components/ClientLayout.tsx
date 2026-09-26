"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ClientProvider } from "./ClientContext";
import { ClientSidebar } from "./ClientSidebar";
import { ClientContent } from "./ClientContent";
import { useAuth } from "./AuthContext";
import { LoadingBlock } from "./client/shared";
import { pageUrl } from "@/lib/routes";

export function ClientLayout() {
  const { token, user, isLoading } = useAuth();
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
    else if (user?.role === "admin") window.location.replace(pageUrl("admin"));
  }, [mounted, isLoading, token, user]);

  if (!mounted || isLoading || !token || user?.role === "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist">
        <LoadingBlock label="Vérification de votre session…" />
      </div>
    );
  }

  return (
    <ClientProvider>
      <div className="min-h-screen bg-mist">
        <ClientSidebar />
        <main className="transition-all duration-300 md:pl-72">
          <div className="p-4 pt-20 sm:p-6 sm:pt-22 md:pt-8 lg:p-10">
            <ClientContent />
          </div>
        </main>
      </div>
    </ClientProvider>
  );
}
