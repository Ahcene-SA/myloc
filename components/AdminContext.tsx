"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { AdminTab } from "./AdminSidebar";

interface AdminContextValue {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  return (
    <AdminContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
