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
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import {
  fetchCars,
  mapApiCarToCar,
  fetchClients,
  fetchAllReservations,
  updateReservationStatus,
  CarFromApi,
  deleteCar,
  createCar,
  uploadCarImage,
  ReservationFromApi,
} from "@/lib/api";

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
        {activeTab === "reservations" && <ReservationsView />}
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

interface ClientFromApi {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
}

function ClientsView() {
  const [clients, setClients] = useState<ClientFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchClients()
      .then((data) => setClients(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les clients."))
      .finally(() => setLoading(false));
  }, []);

  const filteredClients = clients.filter((client) =>
    client.full_name.toLowerCase().includes(filter.toLowerCase()) ||
    client.email.toLowerCase().includes(filter.toLowerCase()) ||
    client.phone.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <SectionHeader icon={Users} title="Nos clients" />

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
            placeholder="Rechercher un client..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-brand"
          />
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover">
          <Plus className="h-4 w-4" />
          Ajouter un client
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-slate-200/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">ID</th>
                  <th className="px-6 py-4 font-semibold">Nom</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Téléphone</th>
                  <th className="px-6 py-4 font-semibold">Inscription</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">#{client.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{client.full_name}</td>
                    <td className="px-6 py-4 text-slate-600">{client.email}</td>
                    <td className="px-6 py-4 text-slate-600">{client.phone}</td>
                    <td className="px-6 py-4 text-slate-600">{client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR') : '-'}</td>
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
      )}

      {!loading && filteredClients.length === 0 && (
        <p className="mt-8 text-center text-slate-500">Aucun client inscrit pour le moment.</p>
      )}
    </div>
  );
}

function CarsView() {
  const [cars, setCars] = useState<CarFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    price_per_day: "",
    transmission: "manuel",
    seats: "",
    year: new Date().getFullYear().toString(),
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      price_per_day: "",
      transmission: "manuel",
      seats: "",
      year: new Date().getFullYear().toString(),
    });
    setPhotoFile(null);
    setPreviewUrl(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      let imageUrl = "";
      if (photoFile) {
        imageUrl = await uploadCarImage(photoFile);
      }

      await createCar({
        name: form.name,
        price_per_day: parseFloat(form.price_per_day),
        transmission: form.transmission,
        seats: parseInt(form.seats, 10),
        year: parseInt(form.year, 10),
        image_url: imageUrl || undefined,
      });

      resetForm();
      reloadCars();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'ajout du véhicule.");
    } finally {
      setSubmitting(false);
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
      <SectionHeader icon={Car} title="Véhicules" />

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
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" />
          Ajouter un véhicule
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Nouveau véhicule</h3>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Photo du véhicule</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-brand/10 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-brand hover:file:bg-brand/20"
              />
              {previewUrl && (
                <div className="mt-3 h-40 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-slate-200">
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    className="mx-auto h-full w-auto object-contain p-2"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nom</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Renault Clio"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Prix par jour (DA)</label>
              <input
                type="number"
                required
                min={1}
                step="0.01"
                value={form.price_per_day}
                onChange={(e) => setForm((f) => ({ ...f, price_per_day: e.target.value }))}
                placeholder="Ex: 4500"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Type de véhicule</label>
              <select
                required
                value={form.transmission}
                onChange={(e) => setForm((f) => ({ ...f, transmission: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
              >
                <option value="manuel">Manuel</option>
                <option value="automatique">Automatique</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Places</label>
              <input
                type="text"
                required
                value={form.seats}
                onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))}
                placeholder="Ex: 5"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Année</label>
              <input
                type="number"
                required
                min={1900}
                max={2100}
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                placeholder="Ex: 2022"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand sm:max-w-xs"
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60 sm:flex-none"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

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
                    src={mapped.image.startsWith("http") ? mapped.image : `./${mapped.image}`}
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

function ReservationsView() {
  const [reservations, setReservations] = useState<ReservationFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [updating, setUpdating] = useState<Record<number, boolean>>({});

  function loadReservations() {
    setLoading(true);
    setError("");
    fetchAllReservations()
      .then((data) => {
        setReservations(data);
        const initialNotes: Record<number, string> = {};
        data.forEach((r) => {
          if (r.id) initialNotes[r.id] = r.admin_note || "";
        });
        setNotes(initialNotes);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les réservations."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let cancelled = false;
    fetchAllReservations()
      .then((data) => {
        if (cancelled) return;
        setReservations(data);
        const initialNotes: Record<number, string> = {};
        data.forEach((r) => {
          if (r.id) initialNotes[r.id] = r.admin_note || "";
        });
        setNotes(initialNotes);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Impossible de charger les réservations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatus = async (id: number, status: "confirmed" | "rejected" | "cancelled") => {
    setUpdating((prev) => ({ ...prev, [id]: true }));
    setError("");
    try {
      await updateReservationStatus(id, status, notes[id]);
      loadReservations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour.");
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const statusLabel = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmée";
      case "rejected":
        return "Refusée";
      case "cancelled":
        return "Annulée";
      case "pending":
        return "En attente";
      default:
        return status || "Inconnue";
    }
  };

  const statusClass = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "cancelled":
        return "bg-slate-100 text-slate-600";
      case "pending":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div>
      <SectionHeader icon={Calendar} title="Gestion des réservations" />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((res) => (
            <div
              key={res.id}
              className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">
                      {res.car_name || "Véhicule"}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(res.status)}`}>
                      {statusLabel(res.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Du {res.start_date || "?"} au {res.end_date || "?"} ·{" "}
                    {Number(res.total_price || 0).toFixed(2)} DA
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <div>
                      <span className="font-semibold">Client : {" "}</span>
                      {res.user_full_name || res.full_name || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Email : {" "}</span>
                      {res.email || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Téléphone : {" "}</span>
                      {res.phone || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Réservation #</span>
                      {res.id}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <MessageSquare className="h-4 w-4" /> Note admin
                    </label>
                    <textarea
                      value={notes[res.id] || ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [res.id]: e.target.value }))}
                      placeholder="Ajouter une note (raison du refus, détails, etc.)"
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatus(res.id, "confirmed")}
                    disabled={updating[res.id] || res.status === "confirmed"}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" /> Confirmer
                  </button>
                  <button
                    onClick={() => handleStatus(res.id, "rejected")}
                    disabled={updating[res.id] || res.status === "rejected"}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> Refuser
                  </button>
                  <button
                    onClick={() => handleStatus(res.id, "cancelled")}
                    disabled={updating[res.id] || res.status === "cancelled"}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && reservations.length === 0 && (
        <p className="mt-8 text-center text-slate-500">Aucune réservation pour le moment.</p>
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
