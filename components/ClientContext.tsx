"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { ClientTab } from "./ClientSidebar";

interface ClientContextValue {
  activeTab: ClientTab;
  setActiveTab: (tab: ClientTab) => void;
}

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<ClientTab>("accueil");
  return (
    <ClientContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within ClientProvider");
  return ctx;
}
