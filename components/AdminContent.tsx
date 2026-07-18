"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "./AdminContext";
import {
  Users,
  Car,
  Calendar,
  CreditCard,
  Shield,
  Edit3,
  Trash2,
  Plus,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { fetchCars, mapApiCarToCar, CarFromApi, deleteCar } from "@/lib/api";

export function AdminContent() {
  const { activeTab } = useAdmin();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
      >
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "clients" && <ClientsView />}
        {activeTab === "cars" && <CarsView />}
      </motion.div>
    </AnimatePresence>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
    </div>
  );
}

function DashboardView() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Bonjour, admin MYLOC.DZ 👋
        </h1>
        <p className="mt-2 text-lg text-slate-500">
          Voici un aperçu global de l&apos;activité.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} value="1 240" label="Clients" color="brand" />
        <StatCard icon={Car} value="86" label="Véhicules" color="green" />
        <StatCard icon={Calendar} value="324" label="Réservations" color="orange" />
        <StatCard icon={CreditCard} value="52 800 €" label="Revenus" color="yellow" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 lg:col-span-2">
          <SectionHeader icon={Calendar} title="Dernières réservations" />
          <div className="space-y-3">
            {[1, 2, 3].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl bg-slate-200" />
                  <div>
                    <div className="font-bold text-slate-900">Audi A4</div>
                    <div className="text-sm text-slate-500">Du 12 au 18 juillet 2026 · Client #{120 + i}</div>
                  </div>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50">
          <SectionHeader icon={Shield} title="Santé du parc" />
          <div className="space-y-4">
            <HealthRow label="Disponibles" value={72} total={86} color="green" />
            <HealthRow label="En location" value={12} total={86} color="orange" />
            <HealthRow label="En maintenance" value={2} total={86} color="red" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsView() {
  const clients = [
    { id: "C-001", name: "Ahmed Benali", email: "ahmed.b@myloc.dz", phone: "+213 550 12 34 56", status: "actif", reservations: 5 },
    { id: "C-002", name: "Sara Khelil", email: "sara.k@myloc.dz", phone: "+213 661 78 90 12", status: "actif", reservations: 2 },
    { id: "C-003", name: "Karim Taleb", email: "karim.t@myloc.dz", phone: "+213 779 45 67 89", status: "inactif", reservations: 0 },
    { id: "C-004", name: "Lina Hadj", email: "lina.h@myloc.dz", phone: "+213 540 33 22 11", status: "actif", reservations: 8 },
  ];

  return (
    <div>
      <SectionHeader icon={Users} title="Nos clients" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-brand"
          />
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover">
          <Plus className="h-4 w-4" />
          Ajouter un client
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Nom</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Téléphone</th>
                <th className="px-6 py-4 font-semibold">Réservations</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{client.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{client.name}</td>
                  <td className="px-6 py-4 text-slate-600">{client.email}</td>
                  <td className="px-6 py-4 text-slate-600">{client.phone}</td>
                  <td className="px-6 py-4 text-slate-600">{client.reservations}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        client.status === "actif"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {client.status === "actif" ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg p-2 text-slate-500 hover:bg-brand/10 hover:text-brand">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CarsView() {
  const [cars, setCars] = useState<CarFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const reloadCars = () => {
    setLoading(true);
    setError("");
    fetchCars()
      .then((data) => setCars(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCars()
      .then((data) => setCars(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce véhicule ?")) return;
    try {
      await deleteCar(id);
      reloadCars();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la suppression.");
    }
  };

  const filteredCars = cars.filter((car) =>
    car.name.toLowerCase().includes(filter.toLowerCase())
  );

  const statusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponible";
      case "unavailable":
        return "Indisponible";
      case "rented":
        return "Loué";
      case "maintenance":
        return "Maintenance";
      default:
        return status;
    }
  };

  return (
    <div>
      <SectionHeader icon={Car} title="Cars" />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un véhicule..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-brand"
          />
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover">
          <Plus className="h-4 w-4" />
          Ajouter un véhicule
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCars.map((car) => {
            const mapped = mapApiCarToCar(car);
            return (
              <div
                key={car.id}
                className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/50 transition-shadow hover:shadow-md"
              >
                <div className="relative h-40 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-slate-200">
                  <img
                    src={`./${mapped.image}`}
                    alt={car.name}
                    className="mx-auto h-full w-auto object-contain p-2"
                  />
                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      car.status === "available"
                        ? "bg-green-100 text-green-700"
                        : car.status === "rented"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {statusLabel(car.status)}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
                    {car.category}
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">{car.name}</h3>
                  <div className="mt-1 text-2xl font-extrabold text-brand">{mapped.price}€</div>
                  <div className="text-xs text-slate-500">/{"jour"}</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-center text-xs font-semibold text-slate-600">{car.transmission}</div>
                  <div className="text-center text-xs font-semibold text-slate-600">{car.seats} places</div>
                  <div className="text-center text-xs font-semibold text-slate-600">{car.year}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover">
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(car.id)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredCars.length === 0 && (
        <p className="mt-8 text-center text-slate-500">Aucun véhicule trouvé.</p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  color: "brand" | "green" | "orange" | "yellow" | "red";
}) {
  const colors = {
    brand: "bg-brand/10 text-brand",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    yellow: "bg-yellow-100 text-yellow-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/50">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function HealthRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "green" | "orange" | "red";
}) {
  const colors = {
    green: "bg-green-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };
  const pct = Math.round((value / total) * 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{value} ({pct}%)</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${colors[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
