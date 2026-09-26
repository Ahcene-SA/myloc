"use client";

import { AdminProvider } from "./AdminContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminContent } from "./AdminContent";

export function AdminLayout() {
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
