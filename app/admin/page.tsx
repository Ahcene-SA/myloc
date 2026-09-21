"use client";

import { AdminLayout } from "@/components/AdminLayout";

export default function AdminPage() {
  // Static mode: no auth check, render admin layout directly
  return <AdminLayout />;
}
