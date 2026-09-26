"use client";

import { ClientProvider } from "./ClientContext";
import { ClientSidebar } from "./ClientSidebar";
import { ClientContent } from "./ClientContent";

export function ClientLayout() {
  return (
    <ClientProvider>
      <div className="min-h-screen bg-sand">
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
