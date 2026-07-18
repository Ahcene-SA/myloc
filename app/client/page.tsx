"use client";

import { useEffect } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { useAuth } from "@/components/AuthContext";

export default function ClientPage() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || isLoading) return;
    if (!user) {
      window.location.href = "./login.html";
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Chargement…</p>
      </div>
    );
  }

  return <ClientLayout />;
}
