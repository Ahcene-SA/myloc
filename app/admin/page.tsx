"use client";

import { useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/components/AuthContext";

export default function AdminPage() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || isLoading) return;
    if (!user) {
      window.location.href = "./login.html";
      return;
    }
    if (user.role !== "admin") {
      window.location.href = "./client.html";
    }
  }, [user, isLoading]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Chargement…</p>
      </div>
    );
  }

  return <AdminLayout />;
}
