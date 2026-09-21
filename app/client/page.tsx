"use client";

import { ClientLayout } from "@/components/ClientLayout";

export default function ClientPage() {
  // Static mode: no auth check, render client layout directly
  return <ClientLayout />;
}
