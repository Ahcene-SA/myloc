"use client";

import { AdminProvider } from "./AdminContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminContent } from "./AdminContent";

export function AdminLayout() {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar />
        <main className="transition-all duration-300 md:pl-72">
          <div className="p-4 sm:p-6 lg:p-8">
            <AdminContent />
          </div>
        </main>
      </div>
    </AdminProvider>
  );
}
