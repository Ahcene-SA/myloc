"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useClient } from "./ClientContext";
import { fetchCars, mapApiCarToCar, createReservation, fetchMyReservations, CarFromApi } from "@/lib/api";
import {
  User,
  Calendar,
  PlusCircle,
  CreditCard,
  Settings,
  Car,
  Clock,
  Mail,
  Phone,
  MapPin,
  Shield,
  Edit3,
  Save,
} from "lucide-react";

export function ClientContent() {
  const { activeTab } = useClient();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
      >
        {activeTab === "accueil" && <AccueilView />}
        {activeTab === "profil" && <ProfilView />}
        {activeTab === "reservations" && <ReservationsView />}
        {activeTab === "reserver" && <ReserverView />}
        {activeTab === "paiements" && <PaiementsView />}
        {activeTab === "parametres" && <ParametresView />}
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

function AccueilView() {
  const { setActiveTab } = useClient();
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Bonjour, client MYLOC.DZ 👋
        </h1>
        <p className="mt-2 text-lg text-slate-500">
          Voici un aperçu de votre espace personnel.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Calendar} value="3" label="Réservations" color="brand" />
        <StatCard icon={Car} value="1" label="Véhicule actif" color="green" />
        <StatCard icon={Clock} value="12" label="Jours restants" color="orange" />
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
                    <div className="text-sm text-slate-500">Du 12 au 18 juillet 2026</div>
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
          <SectionHeader icon={User} title="Mon profil" />
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-3xl font-bold text-slate-500">
                C
              </div>
              <div className="mt-3 font-bold text-slate-900">Client MYLOC</div>
              <div className="text-sm text-slate-500">client@myloc.dz</div>
            </div>
            <button
              onClick={() => setActiveTab("profil")}
              className="w-full rounded-xl bg-brand px-4 py-3 font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Modifier le profil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilView() {
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader icon={User} title="Mon profil" />

      <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-200 text-4xl font-bold text-slate-500">
              C
            </div>
            <button className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-md">
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-slate-900">Client MYLOC</h3>
            <p className="mt-1 text-slate-500">Membre depuis juillet 2026</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                <Shield className="h-4 w-4" /> Compte vérifié
              </span>
            </div>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Prénom" defaultValue="Client" />
            <Field label="Nom" defaultValue="MYLOC" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Mail className="h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  defaultValue="client@myloc.dz"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Téléphone</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Phone className="h-5 w-5 text-slate-400" />
                <input
                  type="tel"
                  defaultValue="+213 555 00 00 00"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Adresse</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <MapPin className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                defaultValue="Alger, Algérie"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover sm:w-auto"
          >
            <Save className="h-5 w-5" />
            Enregistrer les modifications
          </button>
        </form>
      </div>
    </div>
  );
}

interface ReservationFromApi {
  id: number;
  car_name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  total_price?: string | number;
}

function ReservationsView() {
  const [reservations, setReservations] = useState<ReservationFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyReservations()
      .then((data) => setReservations(data as ReservationFromApi[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les réservations."))
      .finally(() => setLoading(false));
  }, []);

  const statusLabel = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmée";
      case "pending":
        return "En attente";
      case "cancelled":
        return "Annulée";
      default:
        return status || "Inconnue";
    }
  };

  const statusClass = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-blue-100 text-blue-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div>
      <SectionHeader icon={Calendar} title="Mes réservations" />

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
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-24 rounded-xl bg-slate-200" />
                  <div>
                    <div className="text-lg font-bold text-slate-900">{res.car_name || "Véhicule"}</div>
                    <div className="text-sm text-slate-500">
                      Du {res.start_date || "?"} au {res.end_date || "?"}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${statusClass(res.status)}`}>
                  {statusLabel(res.status)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover">
                  Détails
                </button>
                <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Télécharger la facture
                </button>
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

function ReserverView() {
  const [cars, setCars] = useState<CarFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState<"" | number>("");
  const [selectedCar, setSelectedCar] = useState<CarFromApi | null>(null);
  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    full_name: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCars()
      .then((data) => setCars(data.filter((c) => c.status === "available")))
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les véhicules."))
      .finally(() => setLoading(false));
  }, []);

  const filteredCars = cars.filter((car) => {
    const mapped = mapApiCarToCar(car);
    const matchesName = car.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesPrice = priceFilter === "" || mapped.price <= Number(priceFilter);
    return matchesName && matchesPrice;
  });

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCar) return;
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await createReservation({
        car_id: selectedCar.id,
        start_date: form.start_date,
        end_date: form.end_date,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
      });
      setSuccess("Réservation créée avec succès !");
      setSelectedCar(null);
      setForm({ start_date: "", end_date: "", full_name: "", email: "", phone: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la réservation.");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <SectionHeader icon={PlusCircle} title="Réserver un véhicule" />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-600">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nom du véhicule</label>
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Ex : Audi"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Prix max (€/jour)</label>
          <input
            type="number"
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Ex : 100"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </div>
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
                <button
                  onClick={() => {
                    setSelectedCar(car);
                    setError("");
                    setSuccess("");
                  }}
                  className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
                >
                  Réserver
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredCars.length === 0 && (
        <p className="mt-8 text-center text-slate-500">Aucun véhicule ne correspond à votre recherche.</p>
      )}

      {selectedCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">
              Réserver {selectedCar.name}
            </h3>
            <form className="mt-5 space-y-4" onSubmit={handleReserve}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Début</label>
                  <input
                    type="date"
                    min={today}
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fin</label>
                  <input
                    type="date"
                    min={form.start_date || today}
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nom complet</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Téléphone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCar(null)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {submitting ? "Réservation..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PaiementsView() {
  return (
    <div>
      <SectionHeader icon={CreditCard} title="Mes paiements" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((_, i) => (
          <div
            key={i}
            className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/50"
          >
            <div className="text-sm font-semibold text-slate-500">Facture #{2026 + i}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{i === 0 ? "350 €" : i === 1 ? "210 €" : "540 €"}</div>
            <div className="mt-1 text-sm text-slate-500">{i === 0 ? "Payée" : i === 1 ? "En attente" : "Remboursée"}</div>
            <button className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Télécharger
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParametresView() {
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader icon={Settings} title="Paramètres" />
      <div className="space-y-4">
        <SettingRow title="Notifications par email" description="Recevoir les offres et confirmations." />
        <SettingRow title="Notifications SMS" description="Recevoir les rappels de réservation." />
        <SettingRow title="Mode sombre" description="Activer l’apparence sombre." />
        <SettingRow title="Langue" description="Français" />
      </div>

      <div className="mt-8 rounded-3xl border border-red-100 bg-white p-6 shadow-sm shadow-slate-200/50">
        <h3 className="text-lg font-bold text-red-600">Zone dangereuse</h3>
        <p className="mt-2 text-sm text-slate-500">
          Supprimer votre compte effacera toutes vos données définitivement.
        </p>
        <button className="mt-4 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
          Supprimer mon compte
        </button>
      </div>
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
  color: "brand" | "green" | "orange" | "yellow";
}) {
  const colors = {
    brand: "bg-brand/10 text-brand",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    yellow: "bg-yellow-100 text-yellow-600",
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

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-brand focus:bg-white"
      />
    </div>
  );
}

function SettingRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/50">
      <div>
        <div className="font-bold text-slate-900">{title}</div>
        <div className="text-sm text-slate-500">{description}</div>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" className="peer sr-only" />
        <div className="h-7 w-12 rounded-full bg-slate-200 transition-colors peer-checked:bg-brand" />
        <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}
