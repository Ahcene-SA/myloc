"use client";

import { ClientProvider } from "./ClientContext";
import { ClientSidebar } from "./ClientSidebar";
import { ClientContent } from "./ClientContent";

export function ClientLayout() {
  return (
    <ClientProvider>
      <div className="min-h-screen bg-slate-50">
        <ClientSidebar />
        <main className="transition-all duration-300 md:pl-72">
          <div className="p-4 sm:p-6 lg:p-8">
            <ClientContent />
          </div>
        </main>
      </div>
    </ClientProvider>
  );
}
